// The claims extension (extensions/claims): the parts that decide what a reader
// sees and what gets written, without a browser.
//   1. Blocks are found in the editor's text with exact offsets, placed after the
//      paragraph holding the caret, and read back from an entry's HTML.
//   2. The form's answers become a claim block and a claim opens back into them.
//   3. A resolution is appended, never edits the claim, and is refused twice.
//   4. Scoring: Brier for probabilities, rankings and ranges kept apart.
//   5. The byline badge renders from the entry's HTML alone, and the ⋯ sheet
//      offers resolve only on your own open claims.
import { expect, test } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { EntryBylineSlot, entryActionRows } from '../src/ui/extensions.tsx';
import type { EntryContext } from '../src/ui/extension-api.ts';
import { extension as claims } from '../extensions/claims/ui/index.tsx';
import { fenced, findClaim, fromHtml, placeNew } from '../extensions/claims/ui/blocks.ts';
import { fromClaim, mistakes, sureOf, toClaim, type Draft } from '../extensions/claims/ui/core/compose.ts';
import { appendResolution, describeOutcome, toResolution } from '../extensions/claims/ui/core/resolve.ts';
import { scoreClaim, summarize } from '../extensions/claims/ui/core/score.ts';
import type { ClaimBlock } from '../extensions/claims/ui/core/types.ts';

const claim: ClaimBlock = { claim: 'It rains tomorrow', resolves_by: '2099-12-01', probability: 0.6 };
const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const html = (c: ClaimBlock, extra = '') => `<p>Prose.</p>\n<pre><code class="language-claim">${escape(JSON.stringify(c, null, 2))}\n</code></pre>\n${extra}`;

test('finds the claim block with its exact span, and places a new one after the paragraph', () => {
  const text = `Some prose.\n\n${fenced(claim)}\n\nMore prose.`;
  const found = findClaim(text)!;
  expect(found.claim).toEqual(claim);
  expect(text.slice(found.start, found.end)).toBe(fenced(claim));
  expect(findClaim('no claim here')).toBeNull();

  const before = 'I think it rains tomorrow. Then sun.\n\nNext paragraph.';
  const at = placeNew(before, { start: 8, end: 25 }, claim, false);
  expect(before.slice(0, at.start) + at.insert + before.slice(at.end)).toBe(`I think it rains tomorrow. Then sun.\n\n${fenced(claim)}\n\nNext paragraph.`);
  const last = placeNew('It rains. Roll Tide.  \n', { start: 0, end: 8 }, claim, false);
  expect('It rains. Roll Tide.  \n'.slice(0, last.start) + last.insert).toBe(`It rains. Roll Tide.\n\n${fenced(claim)}\n`);
});

test('reads the claim and resolution back out of rendered HTML, entities and all', () => {
  const c = { ...claim, claim: 'A & <b>B</b>' };
  const got = fromHtml(html(c, '<pre><code class="language-resolution">{&quot;outcome&quot;: false}\n</code></pre>'))!;
  expect(got.claim.claim).toBe('A & <b>B</b>');
  expect(got.resolution?.outcome).toBe(false);
  expect(fromHtml('<pre><code class="language-js">let x = 1</code></pre>')).toBeNull();
});

test('answers become a claim block, and a claim opens back into the same answers', () => {
  const drafts: Draft[] = [
    { shape: 'binary', statement: 'Alabama wins', resolvesBy: '2099-11-29', probability: 0.65, check: { oracle: 'judgment', by: 'author' } },
    { shape: 'choice', pick: 'order', size: 2, statement: 'Top two', resolvesBy: '2099-05-31', options: [{ label: 'A' }, { label: 'B' }, { label: 'C' }] },
    { shape: 'quantity', statement: 'Cases', resolvesBy: '2099-03-31', low: 0, high: 60, unit: 'cases', confidence: 0.8 },
  ];
  for (const d of drafts) expect(toClaim(fromClaim(toClaim(d)))).toEqual(toClaim(d));
  expect(sureOf(toClaim(drafts[0]))).toBe('65%');
  expect(sureOf(toClaim(drafts[1]))).toBe('1 A · 2 B · 3 C');
});

test('only what makes a claim meaningless stops it; the rest are suggestions', () => {
  const stops = (d: Draft) => mistakes(d, { today: '2026-11-21' }).filter((m) => m.level === 'stop').map((m) => m.message);
  expect(stops({ shape: 'binary', statement: '', resolvesBy: '' })).toHaveLength(2);
  expect(stops({ shape: 'binary', statement: 'x', resolvesBy: '2026-01-01' })).toEqual(['That date has already passed. Pick one in the future.']);
  expect(stops({ shape: 'choice', pick: 'one', statement: 'x', resolvesBy: '2099-01-01', options: [{ label: 'A', percent: 60 }, { label: 'B', percent: 30 }] })[0]).toMatch(/add up to 90%/);
  expect(stops({ shape: 'binary', statement: 'Something significant happens', resolvesBy: '2099-01-01', probability: 0.5 })).toEqual([]);
});

test('a resolution is appended after the claim, which is left as it was, and only once', () => {
  const md = `Prose.\n\n${fenced(claim)}\n`;
  const r = toResolution({ kind: 'binary', outcome: true }, 'https://example.com/result', '2099-12-02');
  const out = appendResolution(md, r);
  expect(out.startsWith(md.trimEnd())).toBe(true);
  expect(findClaim(out)?.claim).toEqual(claim);
  expect(() => appendResolution(out, r)).toThrow(/already resolved/);
  expect(describeOutcome(r)).toBe('Yes');
});

test('scores: Brier over probabilities; rankings and ranges kept apart', () => {
  const yes = scoreClaim(claim, { outcome: true });
  const no = scoreClaim({ ...claim, probability: 0.9 }, { outcome: false });
  const sum = summarize([yes, no]);
  expect(sum.forecasts).toBe(2);
  expect(sum.brier).toBeCloseTo(((0.6 - 1) ** 2 + 0.9 ** 2) / 2, 6);
  const range = scoreClaim({ claim: 'n', resolves_by: '2099-01-01', shape: 'quantity', range: [0, 10], confidence: 0.8 }, { outcome: 4 });
  expect(summarize([range])).toMatchObject({ forecasts: 0, ranges: 1, rangeHits: 1 });
});

const entryContext = (contentHtml: string, imported = false): EntryContext => ({
  entry: { key: 'own:x', source: imported ? 'imported' : 'own', kind: 'fragment', withdrawn: false, l0: false, contentHtml, displayAt: '2026-10-01T00:00:00Z' } as EntryContext['entry'],
  id: 'x',
  imported: imported ? { subscriptionId: 's', remoteId: 'x' } : undefined,
  client: {} as EntryContext['client'],
  openDraft: async () => {},
  navigate: async () => {},
  run: async () => {},
  showError: () => {},
  actions: {},
  openSheet: () => {},
});

test('the byline badge renders from the HTML alone, and nothing without a claim', () => {
  const badge = (contentHtml: string, imported = false) => renderToStaticMarkup(createElement(EntryBylineSlot, { extensions: [claims], context: () => entryContext(contentHtml, imported) }));
  expect(badge(html(claim))).toContain('60% · by ');
  expect(badge(html(claim))).toContain('data-status="open"');
  expect(badge(html({ ...claim, resolves_by: '2000-01-01' }))).toContain('due now');
  expect(badge('<p>no claim</p>')).toBe('');
});

test('the ⋯ sheet offers resolve only on your own open claims', () => {
  const rows = (contentHtml: string, imported = false) => entryActionRows([claims], () => entryContext(contentHtml, imported)).map((r) => r.label);
  expect(rows(html(claim))).toEqual(['claim', 'resolve claim']);
  expect(rows(html(claim), true)).toEqual(['claim']);
  expect(rows(html(claim, '<pre><code class="language-resolution">{&quot;outcome&quot;: true}</code></pre>'))).toEqual(['claim']);
  expect(rows('<p>no claim</p>')).toEqual([]);
});
