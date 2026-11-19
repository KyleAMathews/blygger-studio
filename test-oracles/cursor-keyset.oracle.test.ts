/**
 * Native SQLite receives the mixed-key cursor walk law used by the real D1
 * companion. Both use the same independent whole-array model and grammar;
 * only the database provider and fixture lifecycle differ.
 *
 * ```ts
 * cursorPage(db, { limit: 1 }, source) // → next ordered nullable-key row
 * cursorPage(db, { limit: 1, cursor }, source) // → following row, exactly once
 * ```
 *
 * SQLite orders NULL before numbers before text ascending. The model applies
 * that external order to the complete fixture and slices by page width. Real
 * production SQL supplies every observed page. All eight direction choices,
 * both materialization choices, type crossings, ties and the six-range fallback
 * are required states. Limits: static ASCII/finite-integer/null fixtures,
 * widths1..4; malformed cursors and Unicode codec input have separate owners.
 */
import { differs, oracleProperty, pass } from '@tanstack/oracles';
import { cursorPage } from '../src/cursor-page.ts';
import { withOracleCleanup } from '../test/oracle-cleanup.ts';
import { keysetHistories, keysetModel, keysetLaw as law, rowsFor, type Row } from './cursor-keyset-model.ts';
import { cursorSqlite } from './cursor-sqlite.ts';

oracleProperty({
  id: 'cursor-keyset-order-node', owns: ['src/cursor-page.ts#cursorPage'],
  law: { statement: 'Every static cursor walk preserves the full SQLite total ordering and exact page boundaries across nullable numeric/textual keys, mixed directions, ties and materialized/nonmaterialized query forms.',
    authority: 'docs/api.md Read and poll keyset ordering; test/cursor-page.test.ts and test/cursor-range.test.ts complete nullable mixed-order walks; SQLite storage-class ordering.',
    limits: 'Native SQLite receiving driver, same model/grammar as real D1 companion, static ASCII/finite-integer/null rows and widths1..4; deployed D1 is not inferred from this Node driver.' },
  histories: keysetHistories,
  model: keysetModel,
  driver: async (plan, observe) => {
    const rows = rowsFor(plan), peer = cursorSqlite('cursor_keyset_fixture', ['id', 'rank', 'tie'], rows.map(row => [row.id, row.rank, row.tie]));
    await withOracleCleanup(async () => {
      let cursor: string | undefined, pages = 0, previous: Row | undefined, boundaryTie = false;
      do {
        let page;
        try { page = await cursorPage<Row>(peer.db, { limit: plan.width, cursor }, { name: 'mixed-key-receiving', domains: ['mentions'], sql: 'SELECT id,rank,tie FROM cursor_keyset_fixture', materialize: plan.materialize,
          order: [{ column: 'rank', direction: plan.rankDesc ? 'desc' : 'asc' }, { column: 'tie', direction: plan.tieDesc ? 'desc' : 'asc' }, { column: 'id', direction: plan.idDesc ? 'desc' : 'asc' }] }); }
        catch (error) { observe('page', { productionError: error instanceof Error ? { name: error.name, message: error.message } : String(error) }); return; }
        if (!page || !Array.isArray(page.items) || !page.page || typeof page.page !== 'object') { observe('page', { invalidPage: page }); return; }
        if (previous && page.items[0] && previous.rank === page.items[0].rank) boundaryTie = true;
        previous = page.items.at(-1);
        observe('page', { items: page.items, limit: page.page.limit, more: page.page.nextCursor !== null });
        cursor = page.page.nextCursor ?? undefined;
        if (++pages > rows.length + 1) { observe('page', { productionError: 'cursor did not progress' }); return; }
      } while (cursor);
      observe('reach', plan.rankDesc ? 'null-desc' : 'null-asc'); observe('reach', 'number-text');
      if (boundaryTie) observe('reach', 'cross-page-ties');
      if (peer.queries.some(sql => sql.includes('AS MATERIALIZED'))) observe('reach', 'materialized');
      if (peer.queries.some(sql => sql.includes('cursor_source') && !sql.includes('AS MATERIALIZED'))) observe('reach', 'nonmaterialized');
      if (peer.queries.some(sql => sql.startsWith('SELECT * FROM (') && sql.includes('cursor_source WHERE'))) observe('reach', 'six-range-fallback');
    }, [async () => { peer.close(); }]);
  },
  check: (_plan, trace, expected) => {
    const pages = trace.filter(entry => entry.checkpoint === 'page');
    for (const [index, entry] of pages.entries()) { const mismatch = differs('page', law, entry.value, expected[index]); if (mismatch) return mismatch; }
    return differs('completed pages', law, pages.length, expected.length) ?? pass;
  },
  calibrations: [{ name: 'null-tail-restarts-at-nonnull', law, history: { fixed: 'descending-null-and-six-ranges' }, corrupt: trace => trace.map((entry, n) => entry.checkpoint === 'page' && n === 0 ? { ...entry, value: { ...(entry.value as object), items: [] } } : entry) }],
});
