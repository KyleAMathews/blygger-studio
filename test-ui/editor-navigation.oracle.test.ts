/**
 * This oracle owns formatted working-copy persistence through Studio's real
 * editor departure paths. Native formatting, dirty-draft warnings, the compose
 * Router Link and the same item's quick editor receive generated histories,
 * including a rejected departure save followed by a real successful retry.
 *
 * italic(); italic(); leave() // → quick edit loads original text when no edit committed
 * italic(); save(); italic(); stay() // → warning cancels departure and keeps latest text
 * italic(); save(); italic(); leave() // → accepted discard may load the previous save
 * italic(); save(); italic(); compose() // → navigation waits, then quick edit loads latest text
 * italic(); compose(); reject(); compose() // → error retains source; successful retry receives it
 *
 * Why can I/I restore the saved text and still require an unload warning? The
 * working copy has unacknowledged editing events even when its string matches
 * an older save. Acknowledged edits and current edits are separate input events.
 * For every dirty hard departure, Stay retains the editor and latest source;
 * Leave accepts departure and receives the last committed source. For every
 * in-app departure with a held save, navigation waits until delivery, then the
 * quick editor receives the latest source and its bold command preserves it.
 * For every rejected departure save, the editor reports failure and retains
 * latest input and its route until a real successful retry can leave.
 *
 * Decision by Kyle Mathews (GitHub KyleAMathews), 2026-11-18: register the
 * demonstrated Stay/Leave behavior and preserve original hard-navigation
 * observations before completing migration; a failed departure save keeps
 * the working copy and reports the failure until successful retry.
 * The original I/I → hard goto →
 * same-item quick B observation is from e2e/format-shortcuts.spec.ts at28b0c8d.
 *
 * The pure model folds command inputs and save acknowledgments; it never reads
 * Draft or the router. The driver holds PATCH requests before forwarding, so a
 * withheld write is not accidentally treated as an unacknowledged commit. It
 * records actual warning choices, URL/source and stored content; a missing
 * warning can complete navigation and fails at the same public comparison.
 * A transparent observer binds rejection to the real compose save, preserving
 * its exact promise and reason. After settlement the actual preview/draft
 * handlers supply a receiving Editor render before failure is compared,
 * including a settled rejection that renders no alert.
 *
 * Limits: bounded plain labels, two-to-six emphasis commands, fragment full and
 * quick editors, desktop/small viewport. Controlled pending-save delivery does
 * not establish physical browser-close behavior or preservation after accepted
 * discard. WebKit receiving requires the documented explicitr2395 host. Models
 * and judgments run in Node; the actual formatter/Draft and React run in browser.
 */
import { differs, oracleProperty, pass, type Observation } from '@tanstack/oracles';
import { navigationArbitrary, navigationCases, navigationModel, navigationPlan, navigationStates } from './editor-oracles/navigation-model-oracle.ts';
import { navigationDriver } from './editor-oracles/navigation-driver-oracle.ts';
import { traceValue } from './editor-oracles/document-oracle.ts';

const law = 'formatted editor departure';
function check(trace: readonly Observation[], expected: ReturnType<typeof navigationModel>, p: ReturnType<typeof navigationPlan>) {
  const facts: [string, unknown][] = expected.formats.map((format, index) => ['format' + index, format]);
  if (p.acknowledgeAfter !== null) facts.push(['persisted', { value: expected.formats[p.acknowledgeAfter]!.value }]);
  facts.push(['pending', expected.pending]);
  if (p.h.departure === 'spa' || p.h.departure === 'spa-reject') facts.push(['blocked', expected.blocked]);
  if (p.h.departure === 'spa-reject') {
    facts.push(['failed', expected.failed]);
    // The controlled provider must have actually delivered rejection.
    const failure = differs('failedRequests', law, traceValue(trace, 'failedRequests'), { received: true, statuses: [500], methods: ['PATCH'] });
    if (failure) return failure;
  }
  facts.push(['departure', expected.departure]);
  if (p.h.departure === 'stay') facts.push(['saved', expected.saved]);
  else facts.push(['quickLoaded', expected.quickLoaded], ['quickBold', expected.quickBold]);
  facts.push(['errors', []]);
  for (const [checkpoint, value] of facts) {
    const received = traceValue(trace, checkpoint);
    const failure = differs(checkpoint, law, received, value, `${checkpoint}: received ${JSON.stringify(received)}; expected ${JSON.stringify(value)}`);
    if (failure) return failure;
  }
  return pass;
}
oracleProperty({
  id: 'editor-browser-navigation',
  owns: ['src/ui/draft.ts#Draft.dirty', 'src/ui/draft.ts#Draft.edit', 'src/ui/draft.ts#Draft.save', 'src/ui/format-shortcuts.ts#formatEdit', 'src/ui/authoring.tsx#Editor', 'src/ui/authoring.tsx#useAction'],
  law: { statement: 'For every formatted dirty editor departure, Stay retains latest source, explicit Leave receives the last committed source, in-app compose waits for saving before the same-item quick editor consumes latest source, and a rejected departure save reports failure and keeps the editor until successful retry.', authority: 'Decision by Kyle Mathews (GitHub KyleAMathews), 2026-11-18: register Stay/Leave navigation and finish the original hard-navigation loss audit; failed departure saves retain and report the working copy until successful retry; original full/quick keyboard scenario at28b0c8d642a87e5810ad6eabd95c2d1714c53396.', limits: 'Plain one-to32-character body and two-to-six emphasis commands; controlled write delivery, fragment editor/quick editor, desktop/small viewport. Rejected departure saves are controlled 500 responses followed by a real successful retry. No promise to retain unsaved changes after explicit discard, physical browser close or arbitrary concurrent save schedules. WebKit evidence uses explicitr2395 host.' },
  histories: { arbitrary: navigationArbitrary, runs: 25, fixedSeeds: [20261118], states: [...new Set(Object.values(navigationCases).flatMap(navigationStates))], constructed: Object.entries(navigationCases).map(([name, h]) => ({ name, enters: navigationStates(h), build: () => h })) },
  resolve: navigationPlan, model: navigationModel, reached: p => navigationStates(p.h), driver: navigationDriver,
  check: (p, trace, expected) => check(trace, expected, p),
  calibrations: [
    { name: 'dirty warning missing', law, history: { constructed: 'original-stay-desktop' }, corrupt: trace => trace.map(o => o.checkpoint === 'departure' ? { ...o, value: { ...(o.value as object), dialogs: [] } } : o) },
    { name: 'compose leaves before saving', law, history: { constructed: 'pending-spa-desktop' }, corrupt: trace => trace.map(o => o.checkpoint === 'blocked' ? { ...o, value: { ...(o.value as object), inEditor: false } } : o) },
    { name: 'compose departs during a checkpoint read', law, history: { constructed: 'pending-spa-desktop' }, corrupt: trace => trace.map(o => o.checkpoint === 'departure' ? { ...o, value: { ...(o.value as object), departedBeforeRelease: true } } : o) },
    { name: 'rejected save permits departure', law, history: { constructed: 'pending-spa-reject-desktop' }, corrupt: trace => trace.map(o => o.checkpoint === 'failed' ? { ...o, value: { ...(o.value as object), inEditor: false } } : o) },
    { name: 'rejected save hides failure', law, history: { constructed: 'pending-spa-reject-desktop' }, corrupt: trace => trace.map(o => o.checkpoint === 'failed' ? { ...o, value: { ...(o.value as object), errorShown: false } } : o) },
    { name: 'departure races failed-save observation', law, history: { constructed: 'pending-spa-reject-desktop' }, corrupt: trace => trace.map(o => o.checkpoint === 'departure' ? { ...o, value: { ...(o.value as object), departedBeforeRetry: true } } : o) },
    { name: 'leave pretends discarded source was saved', law, history: { constructed: 'pending-leave-desktop' }, corrupt: trace => trace.map(o => o.checkpoint === 'quickLoaded' ? { ...o, value: { value: 'Keys1234' } } : o) },
  ],
});
