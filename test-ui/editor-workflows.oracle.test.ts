/**
 * This oracle owns completed links received by the real composer and full
 * editor. It checks source and caret after OS clipboard reads, URL-over-selection
 * paste, fallback sheets, and keyboard activation of the clipboard control.
 *
 * clipboard.link(selectedWords) // → escaped link and tracker-removal feedback
 * clipboard.denied(); sheet.submit(url) // → link at the captured selection
 * clipboard.invalid(); sheet.cancel() // → original source and selection
 * paste(url, selectedWords) // → linked selection and prevented native paste
 * paste(proseOrCaret) // → ordinary browser paste; synthetic event stays allowed
 * paste('', selectedWords) // → native replacement removes selected words
 * compose.fullEditor() // → the composer source survives the real transition
 *
 * Why must a sheet keep the selection from before it opened? Its URL field
 * takes focus; the eventual insertion still belongs to the original text.
 * For every completed-link workflow, the same independent insertion model
 * predicts tracker projection, escaped source and final caret at each action.
 * For every fallback, invalid input leaves source intact with the existing
 * explanation, and cancellation makes no edit. For every paste, selected URL
 * text is intercepted unless files are present; other native text paste proceeds.
 * Native paste replaces its selected range even for empty clipboard text.
 *
 * Authority: the two clipboard/paste cases in e2e/compose-pwa.spec.ts at28b0c8d,
 * and decision by Kyle Mathews (GitHub KyleAMathews),2026-11-18: strengthen
 * existing clipboard, sheet, keyboard/focus and paste paths with browser oracles.
 * The input-only model reuses the independently reviewed link projection. A
 * bounded action stream varies ranges, targets, clipboard denial, typed fallback
 * and Enter/Space activation. The original two multi-action histories remain
 * constructed. The driver uses the actual OS clipboard and native paste in
 * Chromium; only denial is injected. Synthetic paste also records cancellation.
 * Stable printable ASCII inputs, including empty text, must arrive as arranged; observed host
 * normalization remains an input premise for other text. Clipboard actions also
 * retain the original all-matches control uniqueness observation, including hidden
 * duplicates, while activating the visible control. This is limited to that action.
 *
 * Limits: Chromium OS clipboard, five actions,64-path-symbol URLs and bounded
 * plain labels. Source/caret receipt does not replace the separate semantic
 * anchor-rendering law. Physical permission sheets, image upload/paste, OS permission UI and
 * paste undo are not established. Existing unrelated authoring tests remain.
 */
import { differs, oracleProperty, pass } from '@tanstack/oracles';
import { workflowArbitrary, workflowCases, workflowHostPremises, workflowModel, workflowPlan, workflowStates } from './editor-oracles/workflow-model-oracle.ts';
import { workflowDriver } from './editor-oracles/workflow-driver-oracle.ts';
import { traceValue } from './editor-oracles/document-oracle.ts';
const law = 'completed-link workflow receipt';
oracleProperty({
  id: 'editor-browser-workflows',
  owns: ['src/ui/links.ts#insertLink', 'src/ui/links.ts#linkToast', 'src/ui/authoring.tsx#linkInto', 'src/ui/authoring.tsx#pourOver', 'src/ui/authoring.tsx#useTextTools', 'src/ui/sheets.tsx#toast'],
  law: { statement: 'For every completed-link workflow, the real editor receives escaped source, tracker feedback and caret at each action; sheets preserve captured ranges, canceled/invalid insertions preserve source, and paste interception respects selected URLs versus native defaults and nonimage files.', authority: 'e2e/compose-pwa.spec.ts clipboard/paste histories at28b0c8d642a87e5810ad6eabd95c2d1714c53396; Decision by Kyle Mathews (GitHub KyleAMathews),2026-11-18: all existing clipboard/sheet/paste and keyboard activation oracle work.', limits: 'Chromium OS clipboard and controlled denial; five actions; helper URL/label bounds. Nonimage file event only; does not establish image-upload/OS permission UI, paste undo or arbitrary rendered Markdown labels. Full transition owes source; selection after navigation is unconstrained.' },
  histories: { arbitrary: workflowArbitrary, runs: 25, fixedSeeds: [20261118], states: [...new Set(Object.values(workflowCases).flatMap(h => workflowStates(workflowPlan(h))))], constructed: Object.entries(workflowCases).map(([name, h]) => ({ name, enters: workflowStates(workflowPlan(h)), build: () => h })) },
  resolve: workflowPlan, model: workflowModel, reached: workflowStates, driver: workflowDriver,
  check: (p, trace, expected) => {
    for (const [index, step] of expected.entries()) {
      const host = traceValue(trace, 'host' + index) as Record<string, unknown> | undefined;
      for (const [field, value] of Object.entries(workflowHostPremises(p.actions[index]!))) {
        const failure = differs('host' + index, law, { field, value: host?.[field] }, { field, value }, `stable arranged ${field} input must arrive unchanged at host${index}`);
        if (failure) return failure;
      }
      const received = traceValue(trace, 'step' + index) as Record<string, unknown> | undefined;
      for (const key of Object.keys(step) as (keyof typeof step)[]) {
        if (key === 'selection' && p.actions[index]!.transition) continue;
        const failure = differs('step' + index, law, { action: p.actions[index]!.kind, field: key, value: received?.[key] }, { action: p.actions[index]!.kind, field: key, value: step[key] }, `step${index}.${key} was ${JSON.stringify(received?.[key])}; expected ${JSON.stringify(step[key])}; toast details ${JSON.stringify(received?.toastDetails)}`);
        if (failure) return failure;
      }
    }
    return differs('errors', law, traceValue(trace, 'errors'), []) ?? differs('errors', law, trace.map(o => o.checkpoint), [...expected.flatMap((_s, i) => ['host' + i, 'step' + i]), 'errors']) ?? pass;
  },
  calibrations: [
    { name: 'empty native clipboard delivery changed', law, difference: 'stable arranged clipboard input must arrive unchanged at host0', history: { constructed: 'empty-nativePaste-composer-current' }, corrupt: trace => trace.map(o => o.checkpoint === 'host0' ? { ...o, value: { ...(o.value as object), clipboard: 'X' } } : o) },
    { name: 'empty native paste incorrectly ignored', law, difference: 'step0.value', history: { constructed: 'empty-nativePaste-composer-current' }, corrupt: trace => trace.map(o => o.checkpoint === 'step0' ? { ...o, value: { ...(o.value as object), value: 'Read the essay today.' } } : o) },
    { name: 'stable ASCII clipboard delivery changed', law, difference: 'stable arranged clipboard input must arrive unchanged at host0', history: { constructed: 'originalClipboard' }, corrupt: trace => trace.map(o => o.checkpoint === 'host0' ? { ...o, value: { ...(o.value as object), clipboard: 'https://different.example/' } } : o) },
    { name: 'stable ASCII typed delivery changed', law, difference: 'stable arranged typed input must arrive unchanged at host1', history: { constructed: 'originalClipboard' }, corrupt: trace => trace.map(o => o.checkpoint === 'host1' ? { ...o, value: { ...(o.value as object), typed: 'https://different.example/' } } : o) },
    { name: 'hidden duplicate clipboard control', law, difference: 'step0.clipboardControls', history: { constructed: 'originalClipboard' }, corrupt: trace => trace.map(o => o.checkpoint === 'step0' ? { ...o, value: { ...(o.value as object), clipboardControls: 2 } } : o) },
    { name: 'clipboard source lost', law, history: { constructed: 'originalClipboard' }, corrupt: trace => trace.map(o => o.checkpoint === 'step0' ? { ...o, value: { ...(o.value as object), value: '' } } : o) },
    { name: 'native paste incorrectly intercepted', law, history: { constructed: 'originalPaste' }, corrupt: trace => trace.map(o => o.checkpoint === 'step1' ? { ...o, value: { ...(o.value as object), defaultAllowed: false } } : o) },
    { name: 'sheet forgets selected range', law, history: { constructed: 'sheetAutolink' }, corrupt: trace => trace.map(o => o.checkpoint === 'step0' ? { ...o, value: { ...(o.value as object), selection: [0, 0] } } : o) },
  ],
});
