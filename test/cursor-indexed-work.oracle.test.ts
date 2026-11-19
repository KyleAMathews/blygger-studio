/**
 * A five-range deep mention continuation must seek the existing partial index
 * and preserve both its rows and the established D1 rows_read bound. An OR walk
 * can return identical rows while reading thousands of preceding identities.
 * Authority: test/cursor-range.test.ts73–116 preserves SEARCH/noSCAN/noMATERIALIZE,
 * rows_read<250 for page25, with the old equal-result OR reading>4000 rows.
 *
 * The pure model uses fixture-index arithmetic. This real D1 driver records
 * actual statement metrics and native EXPLAIN observations, without requiring
 * one SQL spelling. Boundaries100/101/199 retain the original deep case, its
 * adjacent legal boundary and another depth. The wider six-range walk remains
 * legal under the separate mixed-key owner; no work promise is added there.
 */
import { env } from 'cloudflare:test';
import { differs, oracleProperty, pass } from '@tanstack/oracles';
import { cursorPage, type CursorSource } from '../src/cursor-page.ts';
import { readChanges } from '../src/changes.ts';
import { withOracleCleanup } from './oracle-cleanup.ts';
import { indexedWorkHistories, indexedWorkLimit, indexedWorkId, indexedWorkTime, indexedWorkModel, indexedWorkLaw as law } from '../test-oracles/cursor-indexed-work-model.ts';

type Row = { id: string; verified_at: string | null; last_seen: string | null };
const source: CursorSource<Row> = {
  name: 'indexed-mentions-work', filters: ['inbound'], domains: ['mentions'],
  sql: "SELECT * FROM mentions_in WHERE status IN ('verified','gone')",
  order: [{ column: 'verified_at', direction: 'desc' }, { column: 'last_seen', direction: 'desc' }, { column: 'id', direction: 'asc' }],
};
async function continuation(boundary: number) {
  // Existing v1 input fixture, independently of production's private codec.
  const descriptor = new TextEncoder().encode(JSON.stringify([source.name, source.filters, source.order, source.domains]));
  const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', descriptor))].map(byte => byte.toString(16).padStart(2, '0')).join('');
  const changes = await readChanges(env.DB);
  const value = { version: 1, source: hash, generation: { epoch: changes.epoch, revisions: [changes.domains.mentions] }, after: [indexedWorkTime(boundary), indexedWorkTime(boundary), indexedWorkId(boundary)] };
  return btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function measured(db: D1Database) {
  const reads: { sql: string; binds: unknown[]; rowsRead: number }[] = [];
  function statement(target: D1PreparedStatement, sql: string, binds: unknown[] = []): D1PreparedStatement {
    return new Proxy(target, { get(target, key) {
      if (key === 'bind') return (...values: unknown[]) => statement(target.bind(...values), sql, values);
      if (key === 'all') return async () => {
        const result = await target.all();
        reads.push({ sql, binds, rowsRead: result.meta.rows_read });
        return result;
      };
      const value = Reflect.get(target, key); return typeof value === 'function' ? value.bind(target) : value;
    } });
  }
  return { reads, db: new Proxy(db, { get(target, key) {
    if (key === 'prepare') return (sql: string) => statement(target.prepare(sql), sql);
    const value = Reflect.get(target, key); return typeof value === 'function' ? value.bind(target) : value;
  } }) };
}
oracleProperty({
  id: 'cursor-indexed-work-receiving', owns: ['src/cursor-page.ts#cursorPage'],
  law: { statement: 'A deep five-range mention continuation returns its exact next25 identities by index search without scan/materialization and reads fewer than250 D1 rows; the previous equivalent OR demonstrates a greater-than4000-row work premise.',
    authority: 'Existing test/cursor-range.test.ts73–116 indexed continuation and deep mention work contract; docs/api.md keyset ordering before limits.',
    limits: 'Real local D1, existing mentions partial index,5000 monotone rows, boundaries100/101/199, page25 and established non-null descending/descending/ascending order. Wider orders have a separate value law.' },
  histories: { enumerated: indexedWorkHistories, states: ['original-boundary', 'adjacent-boundary', 'different-depth', 'work-sensitive-fixture'] },
  label: boundary => String(boundary),
  model: indexedWorkModel,
  driver: async (boundary, observe) => {
    await withOracleCleanup(async () => {
      await env.DB.prepare(`WITH RECURSIVE sequence(i) AS (VALUES(0) UNION ALL SELECT i+1 FROM sequence WHERE i<4999)
        INSERT INTO mentions_in(id,source,target,target_item_id,status,first_seen,last_seen,verified_at)
        SELECT printf('indexed-oracle-%05d',i),printf('https://indexed-oracle/%d',i),'target','item','verified','0',printf('%08d',i),printf('%08d',i) FROM sequence`).run();
      const cursor = await continuation(boundary), meter = measured(env.DB);
      let page;
      try { page = await cursorPage<Row>(meter.db, { limit: indexedWorkLimit, cursor }, source); }
      catch (error) { observe('page', { productionError: error instanceof Error ? { name: error.name, message: error.message } : String(error) }); return; }
      if (!page || !Array.isArray(page.items) || !page.page) { observe('page', { invalidPage: page }); return; }
      const plans = (await Promise.all(meter.reads.map(async read => (await env.DB.prepare(`EXPLAIN QUERY PLAN ${read.sql}`).bind(...read.binds).all<{ detail: string }>()).results.map(row => row.detail)))).flat();
      const at = indexedWorkTime(boundary);
      const previous = await env.DB.prepare(`SELECT * FROM (${source.sql}) cursor_source WHERE
        (verified_at < ? OR verified_at IS NULL) OR
        (verified_at IS ? AND (last_seen < ? OR last_seen IS NULL)) OR
        (verified_at IS ? AND last_seen IS ? AND id > ?)
        ORDER BY verified_at DESC,last_seen DESC,id ASC LIMIT ?`).bind(...Array(5).fill(at), indexedWorkId(boundary), indexedWorkLimit + 1).all<Row>();
      const rowsRead = meter.reads.reduce((sum, read) => sum + read.rowsRead, 0);
      observe('page', { ids: page.items.map(row => row?.id), more: page.page.nextCursor !== null,
        plan: { search: plans.some(detail => detail.includes('SEARCH mentions_in USING INDEX mentions_in_private_order')), scan: plans.some(detail => detail.includes('SCAN mentions_in')), materialize: plans.some(detail => detail.includes('MATERIALIZE')) },
        rowsRead, oldIds: previous.results.slice(0, indexedWorkLimit).map(row => row.id), oldRowsRead: previous.meta.rows_read });
      observe('reach', boundary === 100 ? 'original-boundary' : boundary === 101 ? 'adjacent-boundary' : 'different-depth');
      if (previous.meta.rows_read > 4000) observe('reach', 'work-sensitive-fixture');
    }, [() => env.DB.prepare("DELETE FROM mentions_in WHERE id LIKE 'indexed-oracle-%'").run()]);
  },
  check: (_boundary, trace, expected) => {
    const observed = trace.find(entry => entry.checkpoint === 'page');
    if (observed) {
      const actual = observed.value as { ids?: string[]; more?: boolean; plan?: unknown; rowsRead?: number; oldIds?: string[]; oldRowsRead?: number };
      const mismatch = differs('page', law, { ...actual, rowsRead: undefined, oldRowsRead: undefined }, { ids: expected.ids, more: expected.more, plan: { search: true, scan: false, materialize: false }, rowsRead: undefined, oldIds: expected.ids, oldRowsRead: undefined });
      if (mismatch) return mismatch;
      const work = differs('page', law, { bounded: typeof actual.rowsRead === 'number' && actual.rowsRead > 0 && actual.rowsRead < expected.maximumRowsRead, sensitive: typeof actual.oldRowsRead === 'number' && actual.oldRowsRead > expected.minimumOldRowsRead }, { bounded: true, sensitive: true });
      if (work) return work;
    }
    return differs('completed page', law, trace.filter(entry => entry.checkpoint === 'page').length, 1) ?? pass;
  },
  calibrations: [{ name: 'equal-rows-old-work', law, history: { enumerated: '100' }, corrupt: trace => trace.map(entry => entry.checkpoint === 'page' ? { ...entry, value: { ...(entry.value as object), rowsRead: 4900 } } : entry) }],
});
