import { readChanges } from './changes.ts';
import type { ChangeDomain, ChangeState } from './change-state.ts';

export const CURSOR_MAX = 8192;
type Key = string | number | null;
type Generation = { epoch: string; revisions: number[] };
export type CursorQuery = { cursor?: string; limit?: string | number };
export type Page = { limit: number; nextCursor: string | null };
export interface CursorOrder { column: string; direction: 'asc' | 'desc' }
export interface CursorSource<Row, Result = Row> {
  name: string;
  filters?: unknown;
  domains: readonly ChangeDomain[];
  sql: string;
  binds?: readonly Key[];
  order: readonly CursorOrder[];
  project?: (rows: Row[]) => Result[] | Promise<Result[]>;
}
export class CursorPageError extends Error {
  constructor(readonly kind: 'invalid-input' | 'conflict', readonly code: 'invalid-input' | 'cursor-expired', message: string) { super(message); }
}
const invalid = () => new CursorPageError('invalid-input', 'invalid-input', 'Invalid cursor for this collection, filters, or order');
const expired = () => new CursorPageError('conflict', 'cursor-expired', 'Collection changed; restart from its first page');
const generation = (changes: ChangeState, domains: readonly ChangeDomain[]): Generation => ({ epoch: changes.epoch, revisions: domains.map(domain => changes.domains[domain]) });
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
function encode(value: unknown): string {
  let binary = '';
  for (const byte of new TextEncoder().encode(JSON.stringify(value))) binary += String.fromCharCode(byte);
  const result = btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  if (result.length > CURSOR_MAX) throw new Error('Collection key exceeds cursor bound');
  return result;
}
function decode(raw: string): { version: 1; source: string; generation: Generation; after: Key[] } {
  if (!raw || raw.length > CURSOR_MAX || !/^[A-Za-z0-9_-]+$/.test(raw)) throw invalid();
  try {
    const binary = atob(raw.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - raw.length % 4) % 4));
    const value = JSON.parse(new TextDecoder('utf-8', { fatal: true, ignoreBOM: false }).decode(Uint8Array.from(binary, char => char.charCodeAt(0))));
    if (value?.version !== 1 || typeof value.source !== 'string' || !value.generation || typeof value.generation.epoch !== 'string' ||
        !Array.isArray(value.generation.revisions) || !value.generation.revisions.every((v: unknown) => Number.isSafeInteger(v) && Number(v) >= 0) ||
        !Array.isArray(value.after) || !value.after.every((v: unknown) => v === null || typeof v === 'string' || typeof v === 'number' && Number.isFinite(v))) throw invalid();
    return value;
  } catch { throw invalid(); }
}
async function sourceKey(source: Pick<CursorSource<unknown>, 'name' | 'filters' | 'order' | 'domains'>): Promise<string> {
  // Source declarations supply canonical filter tuples. SQL names never come from cursors.
  const bytes = new TextEncoder().encode(JSON.stringify([source.name, source.filters ?? null, source.order, source.domains]));
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(byte => byte.toString(16).padStart(2, '0')).join('');
}
function column(name: string): string {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) throw new Error('Invalid cursor source column');
  return `"${name}"`;
}
/** SQLite's default NULL order is first for ASC, last for DESC. */
function afterWhere(order: readonly CursorOrder[], after: Key[]) {
  const clauses: string[] = [], binds: Key[] = [];
  for (let i = 0; i < order.length; i++) {
    const { column: name, direction } = order[i], value = after[i], key = column(name);
    if (value === null && direction === 'desc') continue;
    const prefix = order.slice(0, i).map((entry, index) => { binds.push(after[index]); return `${column(entry.column)} IS ?`; });
    const comparison = value === null ? `${key} IS NOT NULL` : direction === 'asc' ? `${key} > ?` : `(${key} < ? OR ${key} IS NULL)`;
    if (value !== null) binds.push(value);
    clauses.push(`(${[...prefix, comparison].join(' AND ')})`);
  }
  return { sql: clauses.length ? clauses.join(' OR ') : '0', binds };
}

/** Read and project one bounded, totally ordered sequence page at one generation. */
export async function cursorPage<Row extends object, Result = Row>(
  db: D1Database,
  query: CursorQuery,
  source: CursorSource<Row, Result>,
): Promise<{ items: Result[]; page: Page }> {
  const limit = query.limit === undefined ? 100 : Number(query.limit);
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) throw new CursorPageError('invalid-input', 'invalid-input', 'limit must be an integer from 1 to 100');
  if (!source.order.length) throw new Error('Cursor source requires a unique total order');
  const identity = await sourceKey(source), cursor = query.cursor === undefined ? null : decode(query.cursor);
  if (cursor && (cursor.source !== identity || cursor.after.length !== source.order.length)) throw invalid();
  for (let attempt = 0; attempt < 2; attempt++) {
    const before = generation(await readChanges(db), source.domains);
    if (cursor && !same(cursor.generation, before)) throw expired();
    const after = cursor ? afterWhere(source.order, cursor.after) : null;
    const order = source.order.map(entry => `${column(entry.column)} ${entry.direction.toUpperCase()}`).join(', ');
    const rows = (await db.prepare(`SELECT * FROM (${source.sql}) cursor_source${after ? ` WHERE ${after.sql}` : ''} ORDER BY ${order} LIMIT ?`)
      .bind(...(source.binds ?? []), ...(after?.binds ?? []), limit + 1).all<Row>()).results;
    const selected = rows.slice(0, limit);
    const items = source.project ? await source.project(selected) : selected as unknown as Result[];
    const current = generation(await readChanges(db), source.domains);
    if (!same(before, current)) { if (!cursor && attempt === 0) continue; throw expired(); }
    const last = selected.at(-1);
    const keys = last ? source.order.map(entry => {
      const value = (last as Record<string, unknown>)[entry.column];
      if (value !== null && typeof value !== 'string' && (typeof value !== 'number' || !Number.isFinite(value))) throw new Error('Invalid collection cursor key');
      return value;
    }) : [];
    return { items, page: { limit, nextCursor: rows.length > limit && last ? encode({ version: 1, source: identity, generation: before, after: keys }) : null } };
  }
  throw expired();
}
