/** Search publishes a demanded page without fetching a later page merely to
 * discover whether more exists. Failed continuation reads preserve accepted
 * hits, and an older query cannot publish after filters change or search closes.
 * This owns useSearch and its cursor acquisition at actual React hook results.
 *
 * ```ts
 * useSearch({ q: 'old' }) // → first20 hits and hasMore from the accepted page
 * loadMore() // → accepted hits remain when the continuation fails
 * useSearch({ q: 'new' }) // → late old results cannot replace the new query
 * ```
 *
 * Why can a valid first page disappear before load more is clicked? Asking for
 * one extra row contacts a continuation whose failure says nothing about the
 * already accepted page. A page's nextCursor already answers whether more exists.
 * For every demanded search window, show its accepted prefix and continuation
 * availability, preserve it on failure, and reject publication from older or
 * closed queries. Authority: docs/search.md's shared paged query and undefined-
 * filters contract, plus e2e/parity.spec.ts's palette failure/late-result law.
 *
 * The pure model stores source counts, acquired rows and the accepted prefix;
 * these combine the server pages and visible window without using Query state.
 * Generated backend sizes1–20, counts0–65 and demand counts vary exact boundaries,
 * short pages, terminal pages and cached extra rows. Failures happen at the first
 * page outside the initial window; held old revalidation replies vary success
 * and failure. The driver mounts the real hook/client/SDK in Chromium, routes a
 * legal conditional peer, and records hook results and physical request starts.
 * Native Query may replay acquired pages after a failed sequence; each request
 * must still belong to the active query and fit its current demanded window.
 * Limits: controlled HTTP and React hook receiving boundary, one Chromium profile;
 * no D1, markup/navigation or guarantee that aborted HTTP bytes reach the SDK.
 */
import fc from 'fast-check';
import { afterAll, beforeAll } from 'vitest';
import { configureOracles, differs, oracleProperty, pass } from '@tanstack/oracles';
import { chromium, type Browser } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { buildBrowserOracleBundle } from './browser-build.ts';
import { withOracleCleanup } from '../test/oracle-cleanup.ts';
import { initialAcquisition, searchLaw, searchModel, searchPlan, type SearchHistory, type SearchSnapshot } from './search-model.ts';
import type { SearchHookSnapshot } from './search-types.ts';

configureOracles({ envPrefix: 'BROWSER_ORACLE', registry: ['browser-search-pagination'] });
let browser: Browser, script: Buffer;
const baseURL = 'http://127.0.0.1';
beforeAll(async () => {
  await buildBrowserOracleBundle('test-browser/search-harness.tsx', 'build/search-oracle.js');
  script = readFileSync('build/search-oracle.js');
  browser = await chromium.launch({ executablePath: process.env.BROWSER_ORACLE_EXECUTABLE });
}, 60000);
afterAll(async () => {
  await browser?.close();
});

const arbitrary = fc.record({ size: fc.integer({ min: 1, max: 20 }), count: fc.integer({ min: 0, max: 65 }), newCount: fc.integer({ min: 0, max: 45 }), loads: fc.integer({ min: 0, max: 3 }), flow: fc.constantFrom('walk' as const, 'failure' as const, 'late' as const), lateFailure: fc.boolean() });
const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>(done => { resolve = done; });
  return { promise, resolve };
};
oracleProperty({
  id: 'browser-search-pagination', owns: ['src/ui/search.tsx#useSearch'],
  law: { statement: 'For every demanded search window, publish its accepted hits and continuation availability without requesting rows beyond that demand just to detect more; failed continuations retain accepted hits and old or closed queries cannot publish.', authority: 'docs/search.md shared paged search and useSearch undefined-filters contract; e2e/parity.spec.ts palette keeps results on failure and rejects late results for an old query; existing ab3a999 useSearch demand boundary.', limits: 'Generated legal controlled HTTP pages with sizes1–20 and counts0–65, at most three load-more demands, failure/retry and held old response schedules, actual Chromium/React hook/client. D1 and UI markup/navigation remain separate receiving tests.' },
  histories: {
    arbitrary, runs: 25, fixedSeeds: [20261118],
    states: ['empty', 'terminal-boundary', 'continuation-boundary', 'short-backend-pages', 'cached-extra-rows', 'continuation-failure', 'late-success', 'late-failure'],
    constructed: [
      { name: 'empty', enters: ['empty'], build: (h: SearchHistory) => ({ ...h, count: 0, flow: 'walk' as const }) },
      { name: 'terminal-boundary', enters: ['terminal-boundary'], build: (h: SearchHistory) => ({ ...h, size: 20, count: 20, flow: 'walk' as const }) },
      { name: 'continuation-boundary', enters: ['continuation-boundary'], build: (h: SearchHistory) => ({ ...h, size: 20, count: 21, loads: 1, flow: 'walk' as const }) },
      { name: 'short-backend-pages', enters: ['short-backend-pages'], build: (h: SearchHistory) => ({ ...h, size: 7, count: 45, loads: 2, flow: 'walk' as const }) },
      { name: 'cached-extra-rows', enters: ['cached-extra-rows'], build: (h: SearchHistory) => ({ ...h, size: 7, count: 21, loads: 1, flow: 'walk' as const }) },
      { name: 'continuation-failure', enters: ['continuation-failure'], build: (h: SearchHistory) => ({ ...h, size: 20, count: 45, flow: 'failure' as const }) },
      ...[false, true].map(lateFailure => ({ name: lateFailure ? 'late-failure' : 'late-success', enters: [lateFailure ? 'late-failure' : 'late-success'], build: (h: SearchHistory) => ({ ...h, count: 45, flow: 'late' as const, lateFailure }) })),
    ],
    fixed: [{ name: 'initial20-before-unavailable-continuation', history: { size: 20, count: 21, newCount: 1, loads: 1, flow: 'failure' as const, lateFailure: false } }],
  },
  resolve: searchPlan,
  model: searchModel,
  driver: async (plan, observe) => {
    const context = await browser.newContext({ baseURL, serviceWorkers: 'block' });
    const held = deferred(), release = deferred();
    const requests: SearchSnapshot['requests'] = [];
    let holdNext = false, failing = plan.flow === 'failure';
    const page = await context.newPage();
    const pageErrors: string[] = [];
    page.on('pageerror', error => { pageErrors.push(error.message); });
    await withOracleCleanup(async () => {
      await context.route('**/*', route => route.request().url().endsWith('/search-oracle.js')
        ? route.fulfill({ contentType: 'text/javascript', body: script })
        : route.fulfill({ contentType: 'text/html', body: '<div id="studio-root" data-api-base="/api"></div><div id="search-oracle-root"></div><script src="/search-oracle.js"></script>' }));
      await page.route('**/api/search?**', async route => {
        const params = new URL(route.request().url()).searchParams;
        const query = params.get('q')!, offset = Number(params.get('cursor') ?? 0);
        requests.push({ query, offset });
        if (query === 'old' && holdNext) {
          holdNext = false; held.resolve(); await release.promise;
          if (plan.lateFailure) { await route.fulfill({ status: 503, json: { code: 'internal', message: 'search unavailable' } }).catch(() => {}); return; }
        }
        if (query === 'old' && offset > 0 && failing && offset >= initialAcquisition(plan)) {
          observe('reach', 'continuation-failure');
          await route.fulfill({ status: 503, json: { code: 'internal', message: 'search unavailable' } }); return;
        }
        const count = query === 'old' ? plan.count : plan.newCount;
        const end = Math.min(count, offset + plan.size), etag = `"${query}-${offset}-${count}"`;
        if (query === 'old') {
          if (count === 0) observe('reach', 'empty');
          if (offset === 0 && count === 20 && plan.size === 20) observe('reach', 'terminal-boundary');
          if (offset === 0 && count > 20 && plan.size === 20) observe('reach', 'continuation-boundary');
          if (offset > 0 && plan.size < 20) observe('reach', 'short-backend-pages');
        }
        if (route.request().headers()['if-none-match'] === etag) { await route.fulfill({ status: 304, headers: { ETag: etag } }).catch(() => {}); return; }
        const items = Array.from({ length: end - offset }, (_, index) => ({ id: `${query}-${offset + index}`, excerpt: `${query} result${offset + index}`, label: 'result', version: 1, updated: '2026-11-18', badge: 'fragment', source: 'mine', kind: 'fragment', subscriptionId: null, sourceTitle: null }));
        await route.fulfill({ json: { items, page: { limit: plan.size, nextCursor: end < count ? String(end) : null } }, headers: { ETag: etag } }).catch(() => {});
      });
      await page.goto('/');
      await page.waitForFunction(() => !!window.searchOracle);
      const snapshot = async (action: SearchSnapshot['action']) => {
        const current = await page.evaluate(() => window.searchOracle.snapshot);
        const { completed: _completed, ...value } = current;
        observe('search state', { action, ...value, requests: requests.map(request => ({ ...request })) });
        if (action === 'start' && current.hits.length === 20 && initialAcquisition(plan) > 20) observe('reach', 'cached-extra-rows');
        if (pageErrors.length) observe('browser error', [...pageErrors]);
      };
      const settle = async (query: string, before: number) => {
        await page.waitForFunction(({ query, before }) => window.searchOracle.snapshot.query === query && window.searchOracle.snapshot.completed > before && !window.searchOracle.snapshot.loading, { query, before });
      };
      for (const action of plan.actions) {
        const before: SearchHookSnapshot = await page.evaluate(() => window.searchOracle.snapshot);
        if (action === 'start' || action === 'switch') {
          const query = action === 'start' ? 'old' : 'new';
          await page.evaluate(query => window.searchOracle.change(query), query);
          await settle(query, 0);
        } else if (action === 'load' || action === 'retry') {
          if (action === 'retry') failing = false;
          await page.evaluate(() => window.searchOracle.more());
          await settle('old', before.completed);
        } else if (action === 'hold') {
          holdNext = true;
          await page.evaluate(() => window.searchOracle.more());
          await held.promise;
          await page.waitForFunction(() => window.searchOracle.snapshot.loading);
        } else if (action === 'release') {
          release.resolve();
          await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
          observe('reach', plan.lateFailure ? 'late-failure' : 'late-success');
        } else {
          await page.evaluate(() => window.searchOracle.change(null));
          await page.waitForFunction(() => window.searchOracle.snapshot.query === null && !window.searchOracle.snapshot.loading);
        }
        await snapshot(action);
      }
    }, [async () => { release.resolve(); await context.close(); }]);
  },
  check: (plan, trace, expected) => {
    const errors = trace.find(entry => entry.checkpoint === 'browser error');
    if (errors) return differs(errors.checkpoint, searchLaw, errors.value, []) ?? pass;
    const states = trace.filter(entry => entry.checkpoint === 'search state');
    let priorRequests = 0;
    for (const [index, entry] of states.entries()) {
      const actual = entry.value as SearchSnapshot, owed = expected[index];
      if (!owed) return differs(entry.checkpoint, searchLaw, [actual], [])!;
      const { requests, ...state } = actual;
      const bad = differs(entry.checkpoint, searchLaw, state, owed); if (bad) return bad;
      // The law fixes the demand, not Query's retry strategy. Retain the raw
      // transcript, then permit any replay of pages inside that demand. Every
      // newly started request is checked at its action cut, so an old-query
      // start after switching or a lookahead request cannot hide in a prior set.
      const active = actual.action === 'switch' ? 'new' : 'old';
      const starts = requests.slice(priorRequests);
      const count = active === 'new' ? plan.newCount : plan.count;
      const demand = actual.action === 'start' || actual.action === 'switch' ? 20 : (expected[index - 1]?.hits.length ?? 0) + 20;
      const finalOffset = Math.max(0, Math.ceil(Math.min(demand, count) / plan.size) - 1) * plan.size;
      const allowed = actual.action === 'release' || actual.action === 'close' ? [] : Array.from({ length: finalOffset / plan.size + 1 }, (_, page) => ({ query: active, offset: page * plan.size }));
      const outside = starts.filter(request => !allowed.some(candidate => candidate.query === request.query && candidate.offset === request.offset));
      const overread = differs(entry.checkpoint, searchLaw, outside, []); if (overread) return overread;
      priorRequests = requests.length;
    }
    return differs('search state count', searchLaw, states.length, expected.length) ?? pass;
  },
  calibrations: [
    { name: 'hide-valid-first-page', law: searchLaw, history: { fixed: 'initial20-before-unavailable-continuation' }, corrupt: trace => trace.map(entry => entry.checkpoint === 'search state' && (entry.value as SearchSnapshot).action === 'start' ? { ...entry, value: { ...(entry.value as SearchSnapshot), hits: [] } } : entry) },
    { name: 'lookahead-outside-demand', law: searchLaw, history: { fixed: 'initial20-before-unavailable-continuation' }, corrupt: trace => trace.map(entry => entry.checkpoint === 'search state' && (entry.value as SearchSnapshot).action === 'start' ? { ...entry, value: { ...(entry.value as SearchSnapshot), requests: [...(entry.value as SearchSnapshot).requests, { query: 'old', offset: 20 }] } } : entry) },
    { name: 'old-query-starts-after-switch', law: searchLaw, history: { constructed: 'late-success' }, corrupt: trace => trace.map(entry => entry.checkpoint === 'search state' && (entry.value as SearchSnapshot).action === 'switch' ? { ...entry, value: { ...(entry.value as SearchSnapshot), requests: [...(entry.value as SearchSnapshot).requests, { query: 'old', offset: 0 }] } } : entry) },
  ],
});
