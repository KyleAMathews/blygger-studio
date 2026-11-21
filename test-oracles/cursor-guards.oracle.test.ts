/**
 * cursorPage keeps outgoing continuations bounded, rejects malformed internal
 * source definitions before a page query, and refuses unsupported returned sort
 * keys before publishing a page. This oracle owns src/cursor-page.ts#cursorPage
 * and observes its settled result and native SQLite page-query preparations.
 *
 * ```ts
 * cursorPage(db, { limit: 1 }, source) // → continuation of at most 8192 characters, or rejection
 * cursorPage(db, {}, { ...source, order: [] }) // → rejection before any page query
 * cursorPage(db, {}, invalidColumnSource) // → rejection before any page query
 * cursorPage(db, {}, unsupportedKeySource) // → rejection before returning a page
 * ```
 * SQLite can reject an empty ORDER BY itself, but that is too late for the
 * source-definition promise. Conversely, SQLite accepts a quoted `bad-name`
 * column, so SQL success does not establish the internal identifier contract.
 * Decision by Kyle Mathews (GitHub KyleAMathews), 2026-11-19: generated cursors
 * fit within 8192 characters or reject; empty orders and invalid internal column
 * names reject before attempting a page query (metadata reads are allowed);
 * unsupported or nonfinite returned sort keys reject before returning a page.
 * Error text and HTTP status remain unconstrained.
 *
 * The output model accepts either rejection or any bounded continuation; it
 * does not prescribe encoding. The source model uses membership in the fixture's
 * declared canonical columns, independent of production's identifier parser.
 * The returned-key model uses the JSON scalar domain with finite numbers. Native
 * SQLite supplies rows and BLOBs; a projection supplies the other JavaScript
 * key classes. Selected width and key position vary, and projections may drain
 * their input array while returning the same rows in the same order.
 * Every history also reads a valid neighboring page. Only the
 * production invocation is captured; setup, observation and cleanup stay native.
 *
 * Limits: bounded one-to-four-row native SQLite fixtures; six internal column spellings,
 * UTF-8 strings up to 9000 repeated units, and scalar/object/array/undefined/BLOB
 * key classes. Projection mutation is a controlled provider premise, not a claim
 * about corrupt deployed D1 data. Symbols, functions and custom prototypes are
 * outside these histories. Cursor bytes and exact errors are deliberately free.
 */
import fc from 'fast-check';
import { differs, oracleProperty, pass } from '@tanstack/oracles';
import { cursorPage, type CursorSource } from '../src/cursor-page.ts';
import { withOracleCleanup } from '../test/oracle-cleanup.ts';
import { cursorSqlite } from './cursor-sqlite.ts';

type Row = { id: number; value: unknown };
const source: CursorSource<Row> = {
  name: 'guard-fixture', domains: ['items'], sql: 'SELECT * FROM cursor_guard_fixture',
  order: [{ column: 'value', direction: 'asc' }, { column: 'id', direction: 'asc' }],
};
const authority = 'Decision by Kyle Mathews (GitHub KyleAMathews), 2026-11-19: generated cursors fit within 8192 characters or reject; malformed source definitions reject before a page query (metadata reads allowed); unsupported/nonfinite returned keys reject before page publication. Error text and HTTP status are unconstrained.';
type Result = { returned: false } | { returned: true; ids: number[]; limit: number; more: boolean; bounded: boolean };
// Inspect the result after the narrow capture so an observation failure cannot
// masquerade as the rejection that these laws require.
async function invoke(db: D1Database, descriptor = source, limit = 1): Promise<Result> {
  let result: Awaited<ReturnType<typeof cursorPage<Row>>>;
  try { result = await cursorPage<Row>(db, { limit }, descriptor); }
  catch { return { returned: false }; }
  const cursor = result.page.nextCursor;
  return { returned: true, ids: result.items.map(row => row.id), limit: result.page.limit,
    more: cursor !== null, bounded: cursor === null || typeof cursor === 'string' && cursor.length <= 8192 };
}
const validPage: Result = { returned: true, ids: [1], limit: 1, more: true, bounded: true };
const rejected: Result = { returned: false };

// Repetition count and UTF-8/escaping width vary outgoing size independently.
// 6144 bytes alone already fill 8192 base64url characters, before the envelope.
const outputHistories = fc.record({ count: fc.integer({ min: 0, max: 9000 }), unit: fc.constantFrom('x', 'é', '😀', '"', '\n', '\0') });
type OutputHistory = typeof outputHistories extends fc.Arbitrary<infer H> ? H : never;
const outputLaw = 'bounded outgoing cursors';
oracleProperty({
  id: 'cursor-output-bound', owns: ['src/cursor-page.ts#cursorPage'],
  law: { statement: 'For every generated continuation, return at most 8192 characters or reject the page, while valid neighboring pages remain usable.', authority,
    limits: 'Two rows, repeated string units with 0–9000 repetitions, native SQLite. Any bounded output representation is allowed; exact encoding and rejection errors are free.' },
  histories: { arbitrary: outputHistories, runs: 25, fixedSeeds: [20261118], states: ['empty-key', 'near-envelope-bound', 'oversized-ascii', 'oversized-unicode', 'escaped-key'], constructed: [
    { name: 'empty-key', enters: ['empty-key'], build: (h): OutputHistory => ({ ...h, count: 0 }) },
    { name: 'near-envelope-bound', enters: ['near-envelope-bound'], build: (h): OutputHistory => ({ ...h, count: 6000, unit: 'x' }) },
    { name: 'oversized-ascii', enters: ['oversized-ascii'], build: (h): OutputHistory => ({ ...h, count: 6144, unit: 'x' }) },
    { name: 'oversized-unicode', enters: ['oversized-unicode'], build: (h): OutputHistory => ({ ...h, count: 6144, unit: '😀' }) },
    { name: 'escaped-key', enters: ['escaped-key'], build: (h): OutputHistory => ({ ...h, count: 6144, unit: '\0' }) },
  ] },
  // Bounded continuation and rejection are both allowed. The small positive
  // neighbor retains the established usable-page promise from the codec oracle.
  model: () => ({ neighbor: validPage, candidate: [rejected, validPage] }),
  driver: async (plan, observe) => {
    const peer = cursorSqlite('cursor_guard_fixture', ['id', 'value'], [[1, 'small'], [2, 'small']]);
    await withOracleCleanup(async () => {
      observe('neighbor', await invoke(peer.db));
      peer.execute('UPDATE cursor_guard_fixture SET value=?', plan.unit.repeat(plan.count));
      observe('candidate', await invoke(peer.db));
      if (!plan.count) observe('reach', 'empty-key');
      if (plan.count === 6000 && plan.unit === 'x') observe('reach', 'near-envelope-bound');
      if (plan.count >= 6144 && plan.unit === 'x') observe('reach', 'oversized-ascii');
      if (plan.count >= 6144 && plan.unit === '😀') observe('reach', 'oversized-unicode');
      if (plan.count >= 6144 && plan.unit === '\0') observe('reach', 'escaped-key');
    }, [async () => { peer.close(); }]);
  },
  check: (_plan, trace, expected) => {
    const neighbor = differs('neighbor', outputLaw, trace.filter(entry => entry.checkpoint === 'neighbor').map(entry => entry.value), [expected.neighbor]);
    if (neighbor) return neighbor;
    const candidate = trace.filter(entry => entry.checkpoint === 'candidate').map(entry => entry.value);
    return expected.candidate.some(value => JSON.stringify(candidate) === JSON.stringify([value])) ? pass : differs('candidate', outputLaw, candidate, expected.candidate) ?? pass;
  },
  calibrations: [{ name: 'publish oversized continuation', law: outputLaw, history: { constructed: 'oversized-ascii' }, corrupt: trace => trace.map(entry => entry.checkpoint === 'candidate' ? { ...entry, value: { ...validPage, bounded: false } } : entry) }],
});

const canonicalColumns = ['id', 'value', '_value'];
const sourceHistories = fc.record({ columns: fc.array(fc.constantFrom('id', 'value', '_value', 'bad-name', '9value', 'value space'), { maxLength: 3 }), descending: fc.boolean(), materialize: fc.boolean() });
type SourceHistory = typeof sourceHistories extends fc.Arbitrary<infer H> ? H : never;
const sourceLaw = 'source guards before page queries';
oracleProperty({
  id: 'cursor-source-guards', owns: ['src/cursor-page.ts#cursorPage'],
  law: { statement: 'For every empty sort order or invalid internal source column name, reject before preparing any page query; change-state metadata reads are allowed and valid neighboring declarations still succeed.', authority,
    limits: 'Native SQLite columns id/value/_value and bad-name/9value/value space, 0–3 order terms, both directions and materialization modes; all non-id columns share the same values.' },
  histories: { arbitrary: sourceHistories, runs: 25, fixedSeeds: [20261118], states: ['empty-order', 'invalid-column', 'valid-column'], constructed: [
    { name: 'empty-order', enters: ['empty-order'], build: (h): SourceHistory => ({ ...h, columns: [] }) },
    { name: 'invalid-column', enters: ['invalid-column'], build: (h): SourceHistory => ({ ...h, columns: ['bad-name'] }) },
    { name: 'invalid-leading-digit', enters: ['invalid-column'], build: (h): SourceHistory => ({ ...h, columns: ['9value'] }) },
    { name: 'invalid-space', enters: ['invalid-column'], build: (h): SourceHistory => ({ ...h, columns: ['value space'] }) },
    { name: 'valid-column', enters: ['valid-column'], build: (h): SourceHistory => ({ ...h, columns: ['_value', 'id'] }) },
  ] },
  // Membership in the finite fixture declaration replaces the production
  // identifier regex. Removing any invalid spelling leaves a distinct input gap.
  model: plan => ({ neighbor: validPage, invalid: !plan.columns.length || plan.columns.some(name => !canonicalColumns.includes(name)),
    candidate: { ...validPage, ids: [plan.descending ? 2 : 1] } }),
  driver: async (plan, observe) => {
    const columns = ['id', 'value', '_value', 'bad-name', '9value', 'value space'];
    const peer = cursorSqlite('cursor_guard_fixture', columns, [[1, 1, 1, 1, 1, 1], [2, 2, 2, 2, 2, 2]]);
    await withOracleCleanup(async () => {
      observe('neighbor', await invoke(peer.db));
      const start = peer.queries.length;
      const result = await invoke(peer.db, { ...source, materialize: plan.materialize,
        order: plan.columns.map(column => ({ column, direction: plan.descending ? 'desc' : 'asc' })) });
      // The adapter logs preparation before calling native SQLite, including
      // invalid SQL. Metadata reads have their own table and are permitted.
      const pageQueries = peer.queries.slice(start).filter(sql => !sql.includes('FROM change_state WHERE')).length;
      observe('candidate', { result, pageQueries });
      if (!plan.columns.length) observe('reach', 'empty-order');
      if (plan.columns.some(name => !canonicalColumns.includes(name))) observe('reach', 'invalid-column');
      if (plan.columns.length && plan.columns.every(name => canonicalColumns.includes(name))) observe('reach', 'valid-column');
    }, [async () => { peer.close(); }]);
  },
  check: (_plan, trace, expected) => {
    const neighbor = differs('neighbor', sourceLaw, trace.filter(entry => entry.checkpoint === 'neighbor').map(entry => entry.value), [expected.neighbor]);
    if (neighbor) return neighbor;
    const candidates = trace.filter(entry => entry.checkpoint === 'candidate');
    for (const entry of candidates) {
      const value = entry.value as { result: Result; pageQueries: number };
      const mismatch = differs('candidate', sourceLaw, expected.invalid ? value : value.result, expected.invalid ? { result: rejected, pageQueries: 0 } : expected.candidate);
      if (mismatch) return mismatch;
    }
    return differs('completion', sourceLaw, candidates.length, 1) ?? pass;
  },
  calibrations: [
    { name: 'reject empty order after page preparation', law: sourceLaw, history: { constructed: 'empty-order' }, corrupt: trace => trace.map(entry => entry.checkpoint === 'candidate' ? { ...entry, value: { result: rejected, pageQueries: 1 } } : entry) },
    { name: 'accept quoted invalid column', law: sourceLaw, history: { constructed: 'invalid-column' }, corrupt: trace => trace.map(entry => entry.checkpoint === 'candidate' ? { ...entry, value: { result: validPage, pageQueries: 1 } } : entry) },
  ],
});

const keyHistories = fc.record({ key: fc.oneof(fc.constant(null), fc.constant(undefined), fc.boolean(), fc.double(), fc.string({ unit: 'binary', maxLength: 40 }), fc.array(fc.integer(), { maxLength: 3 }), fc.record({ value: fc.integer() })), blob: fc.boolean(), more: fc.boolean(), width: fc.integer({ min: 1, max: 3 }), position: fc.integer({ min: 0, max: 2 }), allKeys: fc.boolean(), drain: fc.boolean() });
type KeyHistory = typeof keyHistories extends fc.Arbitrary<infer H> ? H : never;
const keyLaw = 'supported returned sort keys';
oracleProperty({
  id: 'cursor-returned-key-guards', owns: ['src/cursor-page.ts#cursorPage'],
  law: { statement: 'For every unsupported or nonfinite returned sort key, reject before returning a page; finite numeric, string and null neighbors remain usable.', authority,
    limits: 'Native SQLite BLOBs and projection-supplied null/string/number/boolean/undefined/plain object/array keys in pages of 1–3 selected rows, with and without a following row. Invalid positions cover every selected row, with projections that keep or drain their input array while returning the same rows. No symbols, functions, proxies or custom prototypes; no live D1 corruption claim.' },
  histories: { arbitrary: keyHistories, runs: 25, fixedSeeds: [20261118], states: ['finite-key', 'null-key', 'string-key', 'unsupported-key', 'nonfinite-key', 'blob-key', 'terminal-unsupported-key', 'first-invalid-key', 'middle-invalid-key', 'last-invalid-key', 'drained-invalid-keys', 'drained-valid-keys'], fixed: [
    { name: 'reported-first-nonfinite-key', history: { key: Infinity, blob: false, more: true, width: 2, position: 0, allKeys: false, drain: false } },
    { name: 'reported-drained-nonfinite-key', history: { key: Infinity, blob: false, more: true, width: 2, position: 0, allKeys: false, drain: true } },
  ], constructed: [
    { name: 'finite-key', enters: ['finite-key'], build: (h): KeyHistory => ({ ...h, key: 0, blob: false }) },
    { name: 'null-key', enters: ['null-key'], build: (h): KeyHistory => ({ ...h, key: null, blob: false }) },
    { name: 'string-key', enters: ['string-key'], build: (h): KeyHistory => ({ ...h, key: 'é😀\0', blob: false }) },
    { name: 'unsupported-key', enters: ['unsupported-key'], build: (h): KeyHistory => ({ ...h, key: false, blob: false }) },
    { name: 'undefined-key', enters: ['unsupported-key'], build: (h): KeyHistory => ({ ...h, key: undefined, blob: false }) },
    { name: 'object-key', enters: ['unsupported-key'], build: (h): KeyHistory => ({ ...h, key: { value: 0 }, blob: false }) },
    { name: 'array-key', enters: ['unsupported-key'], build: (h): KeyHistory => ({ ...h, key: [], blob: false }) },
    { name: 'nonfinite-key', enters: ['nonfinite-key'], build: (h): KeyHistory => ({ ...h, key: Infinity, blob: false }) },
    { name: 'negative-infinity-key', enters: ['nonfinite-key'], build: (h): KeyHistory => ({ ...h, key: -Infinity, blob: false }) },
    { name: 'nan-key', enters: ['nonfinite-key'], build: (h): KeyHistory => ({ ...h, key: NaN, blob: false }) },
    { name: 'blob-key', enters: ['blob-key'], build: (h): KeyHistory => ({ ...h, blob: true }) },
    { name: 'terminal-unsupported-key', enters: ['terminal-unsupported-key', 'unsupported-key'], build: (h): KeyHistory => ({ ...h, key: false, blob: false, more: false }) },
    { name: 'first-invalid-key', enters: ['first-invalid-key'], build: (h): KeyHistory => ({ ...h, key: Infinity, blob: false, width: 2, position: 0, allKeys: false, drain: false }) },
    { name: 'middle-invalid-key', enters: ['middle-invalid-key'], build: (h): KeyHistory => ({ ...h, key: false, blob: false, width: 3, position: 1, allKeys: false, drain: false }) },
    { name: 'last-invalid-key', enters: ['last-invalid-key'], build: (h): KeyHistory => ({ ...h, key: false, blob: false, width: 3, position: 2, allKeys: false, drain: false }) },
    { name: 'drained-invalid-keys', enters: ['drained-invalid-keys'], build: (h): KeyHistory => ({ ...h, key: Infinity, blob: false, width: 2, position: 0, allKeys: false, drain: true }) },
    { name: 'drained-valid-keys', enters: ['drained-valid-keys'], build: (h): KeyHistory => ({ ...h, key: 0, blob: false, width: 2, drain: true }) },
  ] },
  // JSON scalar membership with finite arithmetic states the permitted key
  // domain, independently of the production rejection disjunction.
  model: plan => ({ neighbor: validPage, candidate: !plan.blob && (plan.key === null || typeof plan.key === 'string' || typeof plan.key === 'number' && plan.key > -Infinity && plan.key < Infinity)
    ? { ...validPage, ids: Array.from({ length: plan.width }, (_, index) => index + 1), limit: plan.width, more: plan.more } : rejected }),
  driver: async (plan, observe) => {
    const count = plan.width + Number(plan.more), target = plan.position % plan.width + 1;
    const peer = cursorSqlite('cursor_guard_fixture', ['id', 'value'], Array.from({ length: Math.max(2, count) }, (_, index) => [index + 1, 0]));
    await withOracleCleanup(async () => {
      observe('neighbor', await invoke(peer.db));
      peer.execute('DELETE FROM cursor_guard_fixture WHERE id>?', count);
      if (plan.blob) {
        if (plan.allKeys) peer.execute("UPDATE cursor_guard_fixture SET value=X'01ff'");
        else peer.execute("UPDATE cursor_guard_fixture SET value=X'01ff' WHERE id=?", target);
      }
      // id leads the actual SQL order so native BLOBs cannot move the targeted
      // row to the tail and hide a nonfinal-key defect. Every selected position
      // matters, even when only the final row contributes to the next cursor.
      observe('candidate', await invoke(peer.db, { ...source, order: [{ column: 'id', direction: 'asc' }, { column: 'value', direction: 'asc' }], project: rows => {
        if (!plan.blob) for (const row of rows) if (plan.allKeys || row.id === target) row.value = plan.key;
        // Draining preserves the returned rows and their order, but challenges
        // whether projection can erase the selection used for key validation.
        return plan.drain ? rows.splice(0) : rows;
      } }, plan.width));
      if (plan.blob) observe('reach', 'blob-key');
      else if (plan.key === null) observe('reach', 'null-key');
      else if (typeof plan.key === 'string') observe('reach', 'string-key');
      else if (typeof plan.key === 'number') observe('reach', Number.isFinite(plan.key) ? 'finite-key' : 'nonfinite-key');
      else { observe('reach', 'unsupported-key'); if (!plan.more) observe('reach', 'terminal-unsupported-key'); }
      const unsupported = plan.blob || !(plan.key === null || typeof plan.key === 'string' || typeof plan.key === 'number' && Number.isFinite(plan.key));
      if (plan.drain) observe('reach', unsupported ? 'drained-invalid-keys' : 'drained-valid-keys');
      if (unsupported && !plan.allKeys && plan.width > 1) {
        if (target === 1) observe('reach', 'first-invalid-key');
        if (target > 1 && target < plan.width) observe('reach', 'middle-invalid-key');
        if (target === plan.width) observe('reach', 'last-invalid-key');
      }
    }, [async () => { peer.close(); }]);
  },
  check: (_plan, trace, expected) => {
    for (const checkpoint of ['neighbor', 'candidate'] as const) {
      const mismatch = differs(checkpoint, keyLaw, trace.filter(entry => entry.checkpoint === checkpoint).map(entry => entry.value), [expected[checkpoint]]);
      if (mismatch) return mismatch;
    }
    return pass;
  },
  calibrations: [
    { name: 'publish unsupported key', law: keyLaw, history: { constructed: 'unsupported-key' }, corrupt: trace => trace.map(entry => entry.checkpoint === 'candidate' ? { ...entry, value: validPage } : entry) },
    { name: 'publish nonfinite key', law: keyLaw, history: { constructed: 'nonfinite-key' }, corrupt: trace => trace.map(entry => entry.checkpoint === 'candidate' ? { ...entry, value: validPage } : entry) },
  ],
});
