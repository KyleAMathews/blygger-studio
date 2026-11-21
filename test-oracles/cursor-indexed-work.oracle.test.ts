/**
 * A deep cursor continuation returns its next25 rows by index search, without
 * scanning the preceding identities. This oracle owns cursorPage and its
 * keyset helpers, received on actual native SQLite.
 *
 * ```ts
 * cursorPage(db, { cursor: deepMentionCursor, limit: 25 }, mentionSource)
 * // → next25 identities through index search without scan or materialization
 * ```
 *
 * The previous OR returns the same rows but scans thousands of identities.
 * The Worker companion independently measures D1 rows_read; native EXPLAIN
 * here observes index search versus scan without claiming a D1 work metric.
 * Fixture arithmetic predicts rows, and the old equal-row OR verifies that
 * this fixture can distinguish the plan regression. The driver records rows
 * and plan characteristics together at the completed-page checkpoint. Every
 * continuation must preserve the documented page order and the existing seek
 * behavior from test/cursor-range.test.ts73–116, using the partial index from0036.
 * Limits:5000 monotone rows, three selected deep boundaries, existing mention
 * order and index. The SQL spelling and wider cursor orders remain free.
 */
import { createHash } from 'node:crypto';
import { differs, oracleProperty, pass } from '@tanstack/oracles';
import { cursorPage, type CursorSource } from '../src/cursor-page.ts';
import { withOracleCleanup } from '../test/oracle-cleanup.ts';
import { cursorSqlite } from './cursor-sqlite.ts';
import { indexedWorkHistories, indexedWorkCount, indexedWorkLimit, indexedWorkId, indexedWorkTime, indexedWorkModel, indexedWorkLaw as law } from './cursor-indexed-work-model.ts';

type Row = { id: string; verified_at: string | null; last_seen: string | null; status: string };
const source: CursorSource<Row> = {
  name: 'indexed-mentions-work', filters: ['inbound'], domains: ['mentions'],
  sql: "SELECT * FROM mentions_in WHERE status IN ('verified','gone')",
  order: [{ column: 'verified_at', direction: 'desc' }, { column: 'last_seen', direction: 'desc' }, { column: 'id', direction: 'asc' }],
};
function continuation(boundary: number) {
  const identity = createHash('sha256').update(JSON.stringify([source.name, source.filters, source.order, source.domains])).digest('hex');
  return Buffer.from(JSON.stringify({ version: 1, source: identity, generation: { epoch: 'codec-epoch', revisions: [0] }, after: [indexedWorkTime(boundary), indexedWorkTime(boundary), indexedWorkId(boundary)] })).toString('base64url');
}
oracleProperty({
  id: 'cursor-indexed-work-node', owns: ['src/cursor-page.ts#cursorPage'],
  law: { statement: 'A deep five-range mention continuation returns its exact next25 identities by an existing index search without scan/materialization; the equal-result previous OR demonstrates a scan-sensitive fixture.',
    authority: 'Existing test/cursor-range.test.ts73–116 index search/no scan/no materialization contract; migrations/0036_cursor_generations.sql partial index; docs/api.md keyset before limits.',
    limits: 'Native SQLite plan receiving,5000 monotone text rows, boundaries100/101/199, page25 and existing descending/descending/ascending order. D1 rows_read has a separate Worker receiving driver.' },
  histories: { enumerated: indexedWorkHistories, states: ['original-boundary', 'adjacent-boundary', 'different-depth', 'scan-sensitive-fixture'] },
  label: boundary => String(boundary), model: indexedWorkModel,
  driver: async (boundary, observe) => {
    const peer = cursorSqlite('mentions_in', ['id', 'verified_at', 'last_seen', 'status'], Array.from({ length: indexedWorkCount }, (_, index) => [indexedWorkId(index), indexedWorkTime(index), indexedWorkTime(index), 'verified']));
    await withOracleCleanup(async () => {
      peer.execute("CREATE INDEX mentions_in_private_order ON mentions_in(verified_at DESC,last_seen DESC,id ASC) WHERE status IN ('verified','gone')");
      const cursor = continuation(boundary);
      let page;
      try { page = await cursorPage<Row>(peer.db, { limit: indexedWorkLimit, cursor }, source); }
      catch (error) { observe('page', { productionError: error instanceof Error ? { name: error.name, message: error.message } : String(error) }); return; }
      if (!page || !Array.isArray(page.items) || !page.page) { observe('page', { invalidPage: page }); return; }
      const plans = peer.reads.flatMap(read => peer.explain(read.sql, ...read.binds));
      const at = indexedWorkTime(boundary);
      const previousSql = `SELECT * FROM (${source.sql}) cursor_source WHERE
        (verified_at < ? OR verified_at IS NULL) OR
        (verified_at IS ? AND (last_seen < ? OR last_seen IS NULL)) OR
        (verified_at IS ? AND last_seen IS ? AND id > ?)
        ORDER BY verified_at DESC,last_seen DESC,id ASC LIMIT ?`;
      const previousBinds = [...Array<string>(5).fill(at), indexedWorkId(boundary), indexedWorkLimit + 1];
      const previous = (await peer.db.prepare(previousSql).bind(...previousBinds).all<Row>()).results;
      const oldPlan = peer.explain(previousSql, ...previousBinds);
      const oldScan = oldPlan.some(detail => detail.includes('SCAN mentions_in'));
      observe('page', { ids: page.items.map(row => row?.id), more: page.page.nextCursor !== null,
        plan: { search: plans.some(detail => detail.includes('SEARCH mentions_in USING INDEX mentions_in_private_order')), scan: plans.some(detail => detail.includes('SCAN mentions_in')), materialize: plans.some(detail => detail.includes('MATERIALIZE')) },
        oldIds: previous.slice(0, indexedWorkLimit).map(row => row.id), oldScan });
      observe('reach', boundary === 100 ? 'original-boundary' : boundary === 101 ? 'adjacent-boundary' : 'different-depth');
      if (oldScan) observe('reach', 'scan-sensitive-fixture');
    }, [async () => { peer.close(); }]);
  },
  check: (_boundary, trace, expected) => {
    const observed = trace.find(entry => entry.checkpoint === 'page');
    if (observed) {
      const mismatch = differs('page', law, observed.value, { ids: expected.ids, more: expected.more, plan: { search: true, scan: false, materialize: false }, oldIds: expected.ids, oldScan: true });
      if (mismatch) return mismatch;
    }
    return differs('completed page', law, trace.filter(entry => entry.checkpoint === 'page').length, 1) ?? pass;
  },
  calibrations: [{ name: 'equal-rows-ordered-scan', law, history: { enumerated: '100' }, corrupt: trace => trace.map(entry => entry.checkpoint === 'page' ? { ...entry, value: { ...(entry.value as object), plan: { search: false, scan: true, materialize: false } } } : entry) }],
});
