/** Independent static cursor ordering model shared by native SQLite and D1.
 * No production SQL, range builder, cursor encoder or comparator enters here.
 * SQLite storage classes order NULL before numbers before text ascending.
 */
import fc from 'fast-check';
export type Key = null | number | string;
export type Row = {
    id: number;
    rank: Key;
    tie: Key;
};
const key = fc.oneof(fc.constant(null), fc.integer({ min: -2, max: 2 }), fc.constantFrom('', '0', 'a', 'b'));
export const arbitrary = fc.record({ extras: fc.array(fc.record({ rank: key, tie: key }), { maxLength: 8 }), rankDesc: fc.boolean(), tieDesc: fc.boolean(), idDesc: fc.boolean(), width: fc.integer({ min: 1, max: 4 }), materialize: fc.boolean() });
export type History = typeof arbitrary extends fc.Arbitrary<infer H> ? H : never;
const mandatory = [{ rank: null, tie: null }, { rank: null, tie: 0 }, { rank: 0, tie: null }, { rank: 0, tie: 'a' }, { rank: 'a', tie: null }, { rank: 'a', tie: 0 }];
export const rowsFor = (plan: History): Row[] => [...mandatory, ...plan.extras].map((row, n) => ({ ...row, id: n + 1 }));
// SQLite's storage-class order: NULL, numeric, then text. ASCII comparison avoids
// locale-dependent sorting; id makes every complete ordering unique.
function compare(a: Key, b: Key): number {
    if (a === b)
        return 0;
    if (a === null)
        return -1;
    if (b === null)
        return 1;
    if (typeof a !== typeof b)
        return typeof a === 'number' ? -1 : 1;
    return a < b ? -1 : 1;
}
export const keysetLaw = 'complete mixed-key cursor ordering';
export const directions = [false, true].flatMap(rankDesc => [false, true].flatMap(tieDesc => [false, true].map(idDesc => ({ rankDesc, tieDesc, idDesc }))));
export const keysetHistories = { arbitrary, runs: 25, fixedSeeds: [20261118], states: ['null-asc', 'null-desc', 'number-text', 'cross-page-ties', 'materialized', 'nonmaterialized', 'six-range-fallback'],
        constructed: [...directions.flatMap(order => [false, true].map(materialize => ({ name: `${order.rankDesc}-${order.tieDesc}-${order.idDesc}-${materialize}`,
                enters: [order.rankDesc ? 'null-desc' : 'null-asc', 'number-text', 'cross-page-ties', materialize ? 'materialized' : 'nonmaterialized', ...(!materialize && order.rankDesc && order.tieDesc && order.idDesc ? ['six-range-fallback'] : [])],
                build: (plan: History) => ({ ...plan, ...order, materialize, width: 1 }) })))],
        fixed: [{ name: 'descending-null-and-six-ranges', history: { extras: [], rankDesc: true, tieDesc: true, idDesc: true, width: 1, materialize: false } }] };
export function keysetModel(plan: History) {
        const rows = rowsFor(plan).sort((a, b) => compare(a.rank, b.rank) * (plan.rankDesc ? -1 : 1) || compare(a.tie, b.tie) * (plan.tieDesc ? -1 : 1) || (a.id - b.id) * (plan.idDesc ? -1 : 1));
        return Array.from({ length: Math.ceil(rows.length / plan.width) }, (_, n) => ({ items: rows.slice(n * plan.width, (n + 1) * plan.width), limit: plan.width, more: (n + 1) * plan.width < rows.length }));
    }
