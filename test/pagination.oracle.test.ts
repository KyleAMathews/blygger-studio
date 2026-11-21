/**
 * A static collection walk must return every row once in its promised order.
 * Correct page lengths alone cannot detect duplicates, stale values or missed ties.
 *
 * Contract: docs/api.md defines collection envelopes; established signals ordering
 * is descending timestamp, then ascending subscription and remote ID. This local
 * ordering law does not come from a general REST pagination standard.
 * Model: independently sort the fixture array and slice it for each requested page.
 * No production SQL, comparator, page helper or resource projector predicts results.
 * History grammar: zero to twenty-five rows, three timestamps and widths one to ten.
 * Remote IDs are unique; repeated timestamps and subscriptions force tie-breaks.
 * Driver: insert fixture rows into real D1, then use the generated SDK through SELF.
 * Refinement: exact item values, order, limit and opaque continuation exhaustion;
 * concatenated pages must equal the complete reference, including exhaustion.
 * Limits: the table stays static during each walk. No concurrent snapshot, arbitrary
 * Unicode collation or query-cost guarantee. Campaigns sample bounded inputs;
 * fixed empty/tied witnesses and wrong-result controls protect key distinctions.
 */
import { SELF, env } from "cloudflare:test";
import fc from "fast-check";
import { differs, oracleProperty, pass, type Observation } from "@tanstack/oracles";
import { BlyggerApi, createBlyggerClient, unwrap } from "../sdk/dist/browser.js";
import { BASE, login } from "./helpers.ts";

// ASCII fixture keys deliberately retain the existing ordering domain.
type Row = { subscriptionId: string; remoteId: string; thumb: number; at: string };
type History = { times: number[]; width: number };
type Page = { items: Row[]; limit: number; more: boolean };
const compare = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
const rowsFor = (times: number[]): Row[] => times.map((time, i) => ({ subscriptionId: `s${i % 3}`, remoteId: `r${String(i).padStart(3, "0")}`, thumb: i % 2 ? 1 : -1, at: `2026-10-01T00:00:0${time}Z` }));
// Sort the complete fixture and slice by position; never use production SQL,
// cursor decoding, comparators or resource projection to predict a page.
function model({ times, width }: History) {
  const rows = rowsFor(times).sort((a, b) => compare(b.at, a.at) || compare(a.subscriptionId, b.subscriptionId) || compare(a.remoteId, b.remoteId));
  const pages: Page[] = [];
  for (let offset = 0; offset < Math.max(rows.length, 1); offset += width) pages.push({ items: rows.slice(offset, offset + width), limit: width, more: offset + width < rows.length });
  return { pages, complete: rows };
}
async function driver({ times, width }: History, observe: (checkpoint: string, value: unknown) => void) {
  await env.DB.prepare("DELETE FROM signals").run();
  const rows = rowsFor(times);
  if (rows.length) await env.DB.batch(rows.map(r => env.DB.prepare("INSERT INTO signals (subscription_id, remote_id, thumb, at) VALUES (?, ?, ?, ?)").bind(r.subscriptionId, r.remoteId, r.thumb, r.at)));
  const client = createBlyggerClient({ baseUrl: BASE + '/blyg/api', headers: { cookie: await login() }, fetch: (input, init) => SELF.fetch(input instanceof Request ? input : new Request(input, init)) });
  const observed: Row[] = [];
  let cursor: string | undefined, pages = 0;
  try {
    do {
      const page = await unwrap(BlyggerApi.listSignals({ client, query: { cursor, limit: width } }));
      observe('page', { items: page.items, limit: page.page.limit, more: page.page.nextCursor !== null } satisfies Page);
      observed.push(...page.items);
      cursor = page.page.nextCursor ?? undefined;
      if (++pages > rows.length + 1) { observe('error', 'cursor did not progress'); return; }
    } while (cursor);
    observe('complete', observed);
  } catch (error) { observe('error', error instanceof Error ? error.message : String(error)); }
}
// Keep the complete-array predicate, but attribute a wrong received value to
// its recorded boundary. A correct prefix with a missing tail is still only
// an incomplete walk; it must not displace the error that interrupted it.
function receivingDifference(checkpoint: string, law: string, entries: readonly Observation[], expected: readonly unknown[]) {
  const mismatch = differs(checkpoint, law, entries.map(entry => entry.value), expected);
  if (!mismatch) return;
  const received = entries.find((entry, index) => index >= expected.length || differs(entry.checkpoint, law, entry.value, expected[index]));
  return received ? { ...mismatch, checkpoint: received.checkpoint } : mismatch;
}

oracleProperty({
  id: 'pagination',
  owns: ['src/read-api.ts#listSignalsOperation', 'src/cursor-page.ts#cursorPage'],
  law: {
    statement: 'For every static signals fixture and requested width, each page has the exact independently ordered values, requested limit and continuation; concatenating pages yields every row exactly once through exhaustion.',
    authority: 'docs/api.md collection envelopes; existing signals ordering and pagination oracle',
    limits: 'Static ASCII fixtures, zero to twenty-five rows, three timestamps, widths one through ten; no concurrent snapshot or cost guarantee.',
  },
  histories: {
    arbitrary: fc.record({ times: fc.array(fc.integer({ min: 0, max: 2 }), { maxLength: 25 }), width: fc.integer({ min: 1, max: 10 }) }),
    runs: 8, fixedSeeds: [20261001], states: ['empty', 'ties across pages'],
    constructed: [
      { name: 'walks ties over more than two pages and reaches exhaustion', enters: ['ties across pages'], build: (): History => ({ times: Array(11).fill(1), width: 3 }) },
      { name: 'handles an empty collection', enters: ['empty'], build: (): History => ({ times: [], width: 1 }) },
    ],
  },
  model, driver,
  reached: ({ times, width }) => [ ...(times.length === 0 ? ['empty'] : []), ...(times.length > width * 2 && new Set(times).size === 1 ? ['ties across pages'] : []) ],
  check: (_history, trace, expected) => {
    const differences = [
      receivingDifference('pagination page values and order', 'complete walk', trace.filter(entry => entry.checkpoint === 'page'), expected.pages),
      receivingDifference('pagination request completion', 'complete walk', trace.filter(entry => entry.checkpoint === 'error'), []),
      receivingDifference('pagination complete walk', 'complete walk', trace.filter(entry => entry.checkpoint === 'complete'), [expected.complete]),
    ];
    // A received error or wrong value precedes a missing-tail inference. If
    // every received value is correct, the interruption remains the cause.
    return differences.find(difference => difference?.kind === 'violation' && trace.some(entry => entry.checkpoint === difference.checkpoint)) ?? differences.find(Boolean) ?? pass;
  },
  calibrations: [
    ...(['duplicate', 'omission', 'reordered', 'stale'] as const).map(kind => ({
      name: kind + ' rows', law: 'complete walk', history: { constructed: 'walks ties over more than two pages and reaches exhaustion' },
      corrupt: (trace: readonly Observation[]) => trace.map((entry, index) => {
        if (index !== 0) return entry;
        const page = entry.value as Page, items = [...page.items];
        if (kind === 'duplicate') items[1] = items[0];
        if (kind === 'omission') items.shift();
        if (kind === 'reordered') items.reverse();
        if (kind === 'stale') items[0] = { ...items[0], thumb: -items[0].thumb };
        return { ...entry, value: { ...page, items } };
      }),
    })),
  ],
});
