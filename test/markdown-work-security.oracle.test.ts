/** This oracle owns renderMarkdown's bounded token-copy growth for soft-broken
 * email lines, checked after each synchronous render in src/markdown.ts.
 *
 * ```ts
 * renderMarkdown('a@b.co\n'.repeat(256)) // → one mailto link per line
 * renderMarkdown('a@b.co\n'.repeat(512)) // → at most 3× earlier copy work + 10,000
 * ```
 * Why can doubling the input cause quadratic work? Rebuilding the growing token
 * list for each email copies old tokens repeatedly. The security advisory
 * GHSA-253c-mchw-3w2r identifies that fault. For every size pair in this bounded
 * grammar, every input email remains a link and copy growth stays within the
 * declared linear-work relation. The model reads line counts and the growth
 * allowance; the check relates the two measured work counts. The driver keeps
 * native slice results and restores instrumentation in finally. This measures
 * the named copy mechanism, not all CPU, regex or memory costs.
 */
import { differs, oracleProperty, pass } from '@tanstack/oracles';
import { completed, completionCheckpoint, receivingTrace } from './network-oracle-observations.ts';
import { renderMarkdown } from '../src/markdown.ts';
const histories = [{ name: 'bounds token-copy growth for adversarial soft-broken emails', lines: [256, 512] }];
// Email count is a function of input lines, independent of the markdown parser.
const model = (plan: typeof histories[number]) => ({ links: plan.lines, ratio: 3, overhead: 10_000 });
function work(lines: number) {
  const original = Array.prototype.slice;
  let copied = 0;
  Array.prototype.slice = function(...args: Parameters<typeof original>) {
    if (this.length && typeof this[0] === 'object' && this[0] && typeof this[0].type === 'string') copied += this.length;
    return original.apply(this, args);
  };
  try {
    let html: string;
    try { html = renderMarkdown('a@b.co\n'.repeat(lines)); }
    catch (error) { return { kind: 'threw', error, copied }; }
    return { kind: 'returned', links: typeof html === 'string' ? (html.match(/href="mailto:a@b.co"/g) ?? []).length : null, copied };
  }
  finally { Array.prototype.slice = original; }
}
oracleProperty({
  id: 'markdown-work-security', owns: ['src/markdown.ts#renderMarkdown'],
  law: { statement: 'For every bounded soft-broken-email size pair, rendering retains one link per line and doubling input permits at most three times token-copy work plus 10,000.', authority: 'Existing markdown work law; https://github.com/markdown-it/markdown-it/security/advisories/GHSA-253c-mchw-3w2r', limits: '256/512 lines and token-array slice work only; no complete CPU or memory bound.' },
  histories, label: plan => plan.name, model,
  driver: (plan, observe) => completed(observe, () => { for (const lines of plan.lines) observe('rendered emails', work(lines)); }),
  check: (_plan, trace, expected) => {
    const { observations, complete } = receivingTrace(trace);
    const values = observations.map(entry => entry.value as { kind: string; links: number; copied: number });
    // A received render keeps its own checkpoint even if a later render or
    // cleanup throws. Only successful completion can make a missing tail fail.
    for (const [index, entry] of observations.entries()) {
      const value = values[index];
      const mismatch = differs(entry.checkpoint, 'linear linkification', value.kind, 'returned', 'rendered email outcomes')
        ?? (index >= expected.links.length ? differs(entry.checkpoint, 'linear linkification', index + 1, expected.links.length, 'rendered email count') : undefined)
        ?? differs(entry.checkpoint, 'linear linkification', value.links, expected.links[index], 'rendered email links')
        ?? (index === 1 ? differs(entry.checkpoint, 'linear linkification', value.copied <= expected.ratio * values[0].copied + expected.overhead, true, 'token-copy growth') : undefined);
      if (mismatch) return mismatch;
    }
    return (complete ? differs(completionCheckpoint, 'linear linkification', values.length, expected.links.length, 'rendered email count') : undefined) ?? pass;
  },
  calibrations: [{ name: 'quadratic token copying', law: 'linear linkification', history: { enumerated: 0 }, corrupt: trace => trace.map((entry, index) => entry.checkpoint === 'rendered emails' && index === 1 ? { ...entry, value: { ...(entry.value as object), copied: Number.MAX_SAFE_INTEGER } } : entry) }],
});
