/**
 * A static cursor walk returns the independent total ordering exactly once,
 * including SQLite's null/number/text ordering and ties across mixed directions.
 * docs/api.md promises keyset filtering/order before limits and complete walks.
 * The cursor's existing Key type admits null, number and string values.
 *
 * The pure model sorts the complete fixture, then slices pages. The driver runs
 * actual cursorPage SQL against real D1, independently of source SQL predicates.
 * Generated values extend mandatory NULL/type/tie rows. Direction, width and
 * materialization overlap to reach both UNION ranges and the >5-range OR path.
 * Limits: static one-table ASCII/finite-integer fixtures, at least six rows,
 * widths1..4. The existing pagination owner retains empty and public API walks.
 */
import { env } from 'cloudflare:test';
import { keysetHistories, keysetModel, keysetLaw as law, rowsFor, type Row } from '../test-oracles/cursor-keyset-model.ts';
import { differs, oracleProperty, pass } from '@tanstack/oracles';
import { cursorPage } from '../src/cursor-page.ts';
import { withOracleCleanup } from './oracle-cleanup.ts';
oracleProperty({
    id: 'cursor-keyset-order', owns: ['src/cursor-page.ts#cursorPage'],
    law: { statement: 'Every static cursor walk preserves the full SQLite total ordering and exact page boundaries across nullable numeric/textual keys, mixed directions, ties and materialized/nonmaterialized query forms.',
        authority: 'docs/api.md collection keyset ordering and complete cursor walks; existing cursor-page Key domain and SQLite storage-class ordering.',
        limits: 'Real D1 one-table receiving fixture, ASCII strings/finite integers/null, mandatory six rows plus up to eight generated rows, widths1..4. Empty/public API walks and invalid cursors have separate owners.' },
    histories: keysetHistories,
    model: keysetModel,
    driver: async (plan, observe) => {
        await withOracleCleanup(async () => {
            await env.DB.prepare('CREATE TABLE IF NOT EXISTS cursor_keyset_fixture(id INTEGER PRIMARY KEY,rank,tie)').run();
            const rows = rowsFor(plan);
            await env.DB.batch(rows.map(row => env.DB.prepare('INSERT INTO cursor_keyset_fixture VALUES(?,?,?)').bind(row.id, row.rank, row.tie)));
            let fallback = false, materialized = false, nonmaterialized = false, boundaryTie = false;
            let previousLast: Row | undefined;
            const db = new Proxy(env.DB, { get(target, key) { if (key === 'prepare')
                    return (sql: string) => { if (sql.startsWith('SELECT * FROM (') && sql.includes('cursor_source WHERE'))
                        fallback = true; if (sql.includes('AS MATERIALIZED'))
                        materialized = true;
                    else if (sql.includes('cursor_source'))
                        nonmaterialized = true; return target.prepare(sql); }; const value = Reflect.get(target, key); return typeof value === 'function' ? value.bind(target) : value; } });
            let cursor: string | undefined, pages = 0;
            do {
                let page;
                try {
                    page = await cursorPage<Row>(db, { limit: plan.width, cursor }, { name: 'mixed-key-receiving', domains: ['mentions'], sql: 'SELECT id,rank,tie FROM cursor_keyset_fixture', materialize: plan.materialize,
                        order: [{ column: 'rank', direction: plan.rankDesc ? 'desc' : 'asc' }, { column: 'tie', direction: plan.tieDesc ? 'desc' : 'asc' }, { column: 'id', direction: plan.idDesc ? 'desc' : 'asc' }] });
                }
                catch (error) {
                    observe('page', { productionError: error instanceof Error ? { name: error.name, message: error.message } : String(error) });
                    return;
                }
                if (!page || !Array.isArray(page.items) || !page.page || typeof page.page !== 'object') {
                    observe('page', { invalidPage: page });
                    return;
                }
                if (previousLast && page.items[0] && previousLast.rank === page.items[0].rank)
                    boundaryTie = true;
                previousLast = page.items.at(-1);
                observe('page', { items: page.items, limit: page.page.limit, more: page.page.nextCursor !== null });
                cursor = page.page.nextCursor ?? undefined;
                if (++pages > rows.length + 1) {
                    observe('page', { productionError: 'cursor did not progress' });
                    return;
                }
            } while (cursor);
            observe('reach', plan.rankDesc ? 'null-desc' : 'null-asc');
            observe('reach', 'number-text');
            if (boundaryTie)
                observe('reach', 'cross-page-ties');
            if (materialized)
                observe('reach', 'materialized');
            if (nonmaterialized)
                observe('reach', 'nonmaterialized');
            if (fallback)
                observe('reach', 'six-range-fallback');
        }, [() => env.DB.prepare('DELETE FROM cursor_keyset_fixture').run()]);
    },
    check: (_plan, trace, expected) => {
        const pages = trace.filter(entry => entry.checkpoint === 'page');
        for (const [index, entry] of pages.entries()) {
            const mismatch = differs(entry.checkpoint, law, entry.value, expected[index]);
            if (mismatch)
                return mismatch;
        }
        return differs('completed pages', law, pages.length, expected.length) ?? pass;
    },
    calibrations: [{ name: 'null-tail-restarts-at-nonnull', law, history: { fixed: 'descending-null-and-six-ranges' }, corrupt: trace => trace.map((entry, n) => entry.checkpoint === 'page' && n === 0 ? { ...entry, value: { ...(entry.value as object), items: [] } } : entry) }],
});
