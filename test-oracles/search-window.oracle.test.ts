/**
 * Cursor windows expose their continuation availability without acquiring a
 * row beyond the requested window. This oracle owns readCursorWindowResult's
 * returned rows and hasMore value, including reused and replaced sequences.
 *
 * ```ts
 * readCursorWindowResult({ window: { limit: 20 }, ...source }) // → first20 rows and whether more exist
 * readCursorWindowResult({ window: { offset: 1, limit: 1 }, ...source }) // → one row and availability after it
 * readCursorWindowResult({ window: { limit: 0 }, ...source }) // → empty rows, unknown availability, no IO
 * ```
 *
 * Why can a terminal cached page still have more rows after a window? A narrow
 * window can end before rows that an earlier demand already acquired. A source
 * can also have an unacquired continuation. For every positive window, return
 * its current source slice and whether rows remain after it; a zero window
 * acquires nothing and leaves availability unknown. Authority: docs/search.md's
 * shared paged search and e2e/parity.spec.ts's continuation failure behavior;
 * zero-window no-IO is the approved cursor boundary contract. Unknown availability
 * records the information a zero acquisition cannot establish.
 *
 * The model slices finite input arrays and compares the requested end with the
 * source length. Histories prime a source, replace or retain its generation,
 * then demand a second window with an optional failure and retry. They vary
 * empty, terminal and remaining windows, cached rows, short native pages and
 * zero windows. Query may remove a successful reusable entry before the read
 * returns; that changes retention, not the accepted representation's metadata.
 * The driver uses native Query and the real cursor helper with a controlled
 * page provider; it records every result, zero-window IO and released read
 * subscriptions. The browser companion checks the real hook and SDK.
 * Limits: finite legal pages, one source replacement, one controlled page failure;
 * HTTP validators, cancellation and malformed windows have separate oracles.
 */
import fc from 'fast-check';
import { QueryCache, QueryClient } from '@tanstack/query-core';
import { differs, oracleProperty, pass } from '@tanstack/oracles';
import { readCursorWindowResult, type ApiPage } from '../src/ui/cursor-query.ts';
import { withOracleCleanup } from '../test/oracle-cleanup.ts';

const histories = fc.record({
  before: fc.array(fc.integer({ min: -1000, max: 1000 }), { maxLength: 30 }),
  after: fc.array(fc.integer({ min: -1000, max: 1000 }), { maxLength: 30 }),
  same: fc.boolean(), size: fc.integer({ min: 1, max: 8 }),
  initial: fc.integer({ min: 0, max: 35 }), offset: fc.integer({ min: 0, max: 35 }),
  limit: fc.integer({ min: 0, max: 35 }), fail: fc.boolean(), evict: fc.boolean(), unrelated: fc.boolean(),
});
type Plan = typeof histories extends fc.Arbitrary<infer T> ? T : never;
type Outcome = { rows: number[]; hasMore: boolean | undefined } | { error: string };
interface Snapshot { phase: string; outcome: Outcome; zeroIO: boolean | null; subscriptionsReleased: boolean }
const law = 'cursor window availability';
const cached = (h: Plan): Plan => ({ ...h, before: [1, 2, 3, 4, 5, 6], same: true, size: 3, initial: 6, offset: 1, limit: 1, fail: false, evict: false, unrelated: false });
// Availability is a property of the source after the requested slice. It is
// independent of how many native pages the driver happened to acquire earlier.
const result = (values: number[], offset: number, limit: number): Outcome => ({ rows: values.slice(offset, offset + limit), hasMore: limit === 0 ? undefined : offset + Math.min(limit, Math.max(0, values.length - offset)) < values.length });
oracleProperty({
  id: 'cursor-window-result-metadata', owns: ['src/ui/cursor-query.ts#readCursorWindowResult'],
  law: {
    statement: 'For every positive cursor window, return the current source slice and whether rows remain after it without requiring a lookahead row; a zero window performs no IO and returns empty rows with unknown continuation availability.',
    authority: 'docs/search.md shared paged search; e2e/parity.spec.ts palette continuation failure behavior; approved cursor zero-window no-IO boundary and search metadata design.',
    limits: 'Finite legal controlled pages with native Query, source replacement and one controlled failure; browser hook, SDK, cancellation and malformed-window contracts have separate oracles.',
  },
  histories: { arbitrary: histories, runs: 25, fixedSeeds: [20261118],
    states: ['zero-initial', 'zero-target', 'empty', 'terminal-window', 'remaining-window', 'cached-extra', 'changed-generation', 'failure-before-acceptance', 'cache-retained', 'cache-removed-first-page', 'cache-removed-later-page', 'unrelated-query-success'],
    constructed: [
      { name: 'zero-initial', enters: ['zero-initial'], build: (h: Plan) => ({ ...h, initial: 0 }) },
      { name: 'zero-target', enters: ['zero-target'], build: (h: Plan) => ({ ...h, limit: 0 }) },
      { name: 'empty', enters: ['empty'], build: (h: Plan) => ({ ...h, after: [], same: false, offset: 0, limit: 1, fail: false }) },
      { name: 'terminal-window', enters: ['terminal-window'], build: (h: Plan) => ({ ...h, after: [1, 2], same: false, offset: 1, limit: 1, fail: false }) },
      { name: 'remaining-window', enters: ['remaining-window', 'cached-extra'], build: cached },
      { name: 'changed-generation', enters: ['changed-generation'], build: (h: Plan) => ({ ...h, before: [1, 2, 3], after: [4, 5, 6], same: false, initial: 2, offset: 0, limit: 2, fail: false }) },
      { name: 'failure-before-acceptance', enters: ['failure-before-acceptance'], build: (h: Plan) => ({ ...h, fail: true, limit: 2 }) },
      { name: 'retained-positive-continuation', enters: ['cache-retained'], build: (h: Plan) => ({ ...h, before: [1, 2], same: true, size: 1, initial: 1, offset: 0, limit: 1, fail: false, evict: false }) },
      { name: 'removed-first-page-continuation', enters: ['cache-removed-first-page'], build: (h: Plan) => ({ ...h, before: [1, 2], same: true, size: 1, initial: 1, offset: 0, limit: 1, fail: false, evict: true }) },
      { name: 'removed-later-page-continuation', enters: ['cache-removed-later-page'], build: (h: Plan) => ({ ...h, before: [1, 2, 3, 4, 5], same: true, size: 2, initial: 3, offset: 0, limit: 3, fail: false, evict: true }) },
      { name: 'removed-terminal-page-surplus', enters: ['cache-removed-later-page'], build: (h: Plan) => ({ ...h, before: [1, 2, 3, 4], same: true, size: 2, initial: 3, offset: 0, limit: 3, fail: false, evict: true }) },
      { name: 'unrelated-success-after-native-page', enters: ['unrelated-query-success'], build: (h: Plan) => ({ ...h, before: [1, 2], same: true, size: 1, initial: 1, offset: 0, limit: 1, fail: false, evict: false, unrelated: true }) },
    ],
    fixed: [{ name: 'terminal-cache-narrower-window', history: cached({ before: [], after: [], same: false, size: 1, initial: 0, offset: 0, limit: 0, fail: false, evict: false, unrelated: false }) }],
  },
  model: (plan: Plan): Snapshot[] => {
    const after = plan.same ? plan.before : plan.after;
    return [
      { phase: 'prime', outcome: result(plan.before, 0, plan.initial), zeroIO: plan.initial === 0 ? true : null, subscriptionsReleased: true },
      { phase: 'target', outcome: plan.fail && plan.limit > 0 ? { error: 'controlled page failure' } : result(after, plan.offset, plan.limit), zeroIO: plan.limit === 0 ? true : null, subscriptionsReleased: true },
      { phase: 'retry', outcome: result(after, plan.offset, plan.limit), zeroIO: plan.limit === 0 ? true : null, subscriptionsReleased: true },
    ];
  },
  driver: async (plan, observe) => {
    let values = plan.before, generation = 'before', failing = false, calls = 0, end = plan.initial, removedPages = 0;
    const providerSubscriptions = new Set<() => void>();
    // Cache callbacks are a supported native lifecycle boundary. Remove only
    // once the acquired representation satisfies this demand, so even a later
    // native page can finish before its reusable entry disappears.
    const queryClient: QueryClient = new QueryClient({ queryCache: new QueryCache({ onSuccess(data, query) {
      const native = data as { pages: { rows: number[]; nextCursor: string | null }[] };
      if (native.pages.reduce((count, page) => count + page.rows.length, 0) >= end || native.pages.at(-1)?.nextCursor === null) {
        if (plan.evict) {
          removedPages = native.pages.length;
          queryClient.removeQueries({ queryKey: query.queryKey, exact: true });
        }
        // Register after the reader: publish the sibling after this native
        // observer's final result notification, before its waiter resumes.
        // Synchronous onSuccess publication alone is too early: a later native
        // observer notification can restore this query's data in a bad reader.
        if (plan.unrelated) {
          const unsubscribe = queryClient.getQueryCache().subscribe(event => {
            if (event.type === 'observerResultsUpdated' && event.query.queryHash === query.queryHash) {
              unsubscribe(); providerSubscriptions.delete(unsubscribe);
              queryClient.setQueryData(['metadata', 'unrelated'], { pages: [{ rows: [], nextCursor: null }], pageParams: [undefined] });
              observe('reach', 'unrelated-query-success');
            }
          });
          providerSubscriptions.add(unsubscribe);
        }
      }
    } }), defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
    const read = async (cursor: string | undefined): Promise<ApiPage<number>> => {
      calls++;
      if (failing) throw new Error('controlled page failure');
      const start = cursor === undefined ? 0 : Number(cursor.split(':')[1]);
      const end = Math.min(values.length, start + plan.size);
      return { items: values.slice(start, end), page: { limit: plan.size, nextCursor: end < values.length ? `${generation}:${end}` : null } };
    };
    await withOracleCleanup(async () => {
      const acquire = async (phase: string, offset: number, limit: number) => {
        const before = calls;
        end = offset + limit; removedPages = 0;
        let outcome: Outcome;
        try { outcome = await readCursorWindowResult({ queryClient, queryKey: ['metadata'], signal: new AbortController().signal, revalidate: true, window: { offset, limit }, read }); }
        catch (error) { outcome = { error: error instanceof Error ? error.message : String(error) }; }
        observe('window result', { phase, outcome, zeroIO: limit === 0 ? calls === before : null, subscriptionsReleased: !queryClient.getQueryCache().hasListeners() });
        if ('rows' in outcome && limit > 0) {
          if (!plan.evict) observe('reach', 'cache-retained');
          if (removedPages) observe('reach', removedPages === 1 ? 'cache-removed-first-page' : 'cache-removed-later-page');
        }
      };
      await acquire('prime', 0, plan.initial);
      if (plan.initial === 0) observe('reach', 'zero-initial');
      values = plan.same ? plan.before : plan.after;
      generation = plan.same ? 'before' : 'after';
      failing = plan.fail;
      await acquire('target', plan.offset, plan.limit);
      if (plan.limit === 0) observe('reach', 'zero-target');
      if (!plan.fail && plan.limit > 0) {
        if (!values.length) observe('reach', 'empty');
        if (plan.offset + plan.limit >= values.length && values.length) observe('reach', 'terminal-window');
        if (plan.offset + plan.limit < values.length) observe('reach', 'remaining-window');
        if (plan.same && plan.initial >= values.length && plan.offset + plan.limit < values.length) observe('reach', 'cached-extra');
        if (!plan.same && plan.before.toString() !== plan.after.toString()) observe('reach', 'changed-generation');
      }
      if (plan.fail && plan.limit > 0) observe('reach', 'failure-before-acceptance');
      failing = false;
      await acquire('retry', plan.offset, plan.limit);
    }, [async () => { for (const unsubscribe of providerSubscriptions) unsubscribe(); await queryClient.cancelQueries(); queryClient.clear(); }]);
  },
  check: (_plan, trace, expected) => {
    const results = trace.filter(entry => entry.checkpoint === 'window result');
    for (const [index, entry] of results.entries()) {
      const bad = differs(entry.checkpoint, law, [entry.value], index < expected.length ? [expected[index]] : []); if (bad) return bad;
    }
    return differs('window result count', law, results.length, expected.length) ?? pass;
  },
  calibrations: [{ name: 'terminal-page-hides-cached-rows', law, history: { fixed: 'terminal-cache-narrower-window' }, corrupt: trace => trace.map(entry => entry.checkpoint === 'window result' && (entry.value as Snapshot).phase === 'target' ? { ...entry, value: { ...(entry.value as Snapshot), outcome: { ...((entry.value as Snapshot).outcome), hasMore: false } } } : entry) }],
});
