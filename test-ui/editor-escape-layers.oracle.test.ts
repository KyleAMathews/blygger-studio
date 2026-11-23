/**
 * This oracle owns focus-view Escape layering through Studio's actual picker
 * and React editor. It checks each DOM-delivered Escape and owns
 * authoring.tsx#useFocusView.
 *
 * focusView.picker.press('Escape') // → picker closes; view and source remain
 * focusView.press('Escape') // → view closes when no picker owns the key
 *
 * One Escape must remove only the current layer. For every DOM-delivered
 * Escape in the bounded focus-view histories, one open picker consumes the
 * first key; otherwise the key leaves the view. Source and the collapsed
 * caret survive both keys. Escape's model has two layer bits and never reads
 * production classifications. Each native key is sampled after its delivered
 * event and next frame, without awaiting the promised disappearance.
 *
 * Authority: decision by Kyle Mathews (GitHub KyleAMathews),2026-11-18: strengthen
 * existing T4 picker/focus/readonly browser behavior; picker and focus-view
 * observations in e2e/picker.spec.ts and e2e/focus-view.spec.ts at28b0c8d.
 * Histories vary ordinary Unicode prose, both viewports, bracket/mention/no
 * picker and bracket editor/panel typing. Search/settings/contacts are
 * controlled inputs. Native keyboard reaches the actual React editor.
 *
 * Limits:24 ordinary generated code points; DOM Escape with requestFullscreen
 * absent. Actual fullscreenchange, OS Escape and physical mobile keyboards
 * are separate receiving evidence.
 */
import { differs, oracleProperty, pass } from '@tanstack/oracles';
import { traceValue } from './editor-oracles/document-oracle.ts';
import { fields } from './editor-oracles/receiver-fields-oracle.ts';
import { escapeReceiverArbitrary, escapeReceiverCases, escapeReceiverModel, escapeReceiverPlan, escapeReceiverStates } from './editor-oracles/receiver-model-oracle.ts';
import { escapeReceiverDriver } from './editor-oracles/receiver-driver-oracle.ts';

const authority = 'Decision by Kyle Mathews (GitHub KyleAMathews),2026-11-18: adopted T4 picker/focus/readonly expansion, working-copy persistence and preservation of existing behavior; e2e/picker.spec.ts, e2e/focus-view.spec.ts and test-ui/authoring-revision-session.test.ts at28b0c8d642a87e5810ad6eabd95c2d1714c53396; src/ui/authoring.tsx replacement gates.';
const escapeLaw = 'one Escape per open layer';
oracleProperty({
  id: 'editor-browser-escape-layers', owns: ['src/ui/authoring.tsx#useFocusView'],
  law: { statement: 'For every bounded focus-view history with a collapsed caret, a DOM-delivered Escape dismisses an open picker before leaving focus view; without a picker Escape leaves the view, preserving source/caret at each key.', authority, limits: 'Actual bracket/mention/no picker, bracket editor/panel typing, two viewports and24 ordinary code points; requestFullscreen is deliberately absent. Does not establish fullscreenchange or OS-owned Escape behavior.' },
  histories: { arbitrary: escapeReceiverArbitrary, runs: 25, fixedSeeds: [20261118], states: [...new Set(Object.values(escapeReceiverCases).flatMap(h => escapeReceiverStates(escapeReceiverPlan(h))))], constructed: Object.entries(escapeReceiverCases).map(([name, h]) => ({ name, enters: escapeReceiverStates(escapeReceiverPlan(h)), build: () => h })) },
  resolve: escapeReceiverPlan, model: escapeReceiverModel,
  reached: (p, trace) => [0, 1].every(i => (traceValue(trace, 'key' + i) as { trusted?: boolean } | undefined)?.trusted) ? escapeReceiverStates(p) : [], driver: escapeReceiverDriver,
  check: (p, trace, expected) => {
    const keys = [0, 1].map(i => traceValue(trace, 'key' + i) as { trusted?: boolean } | null | undefined);
    const opened = fields(trace, 'opened', { value: p.text, selection: [p.text.length, p.text.length], focusActive: true, pickers: p.h.picker === 'none' ? 0 : 1, fullscreenAvailable: false, browserFullscreen: false }, escapeLaw);
    if (opened) return opened;
    for (const [index, step] of expected.entries()) {
      if (!keys[index]?.trusted) return pass; // preserve the driver's missing-key premise error
      const failure = fields(trace, 'escape' + index, step, escapeLaw); if (failure) return failure;
    }
    return differs('errors', escapeLaw, traceValue(trace, 'errors'), []) ?? pass;
  },
  calibrations: [
    { name: 'first picker Escape exits focus view', law: escapeLaw, difference: 'escape0.focusActive', history: { constructed: 'bracket-editor-false' }, corrupt: trace => trace.map(o => o.checkpoint === 'escape0' ? { ...o, value: { ...(o.value as object), focusActive: false } } : o) },
    { name: 'Escape leaves picker open', law: escapeLaw, difference: 'escape0.pickers', history: { constructed: 'mention-editor-false' }, corrupt: trace => trace.map(o => o.checkpoint === 'escape0' ? { ...o, value: { ...(o.value as object), pickers: 1 } } : o) },
    { name: 'second Escape keeps focus view', law: escapeLaw, difference: 'escape1.focusActive', history: { constructed: 'bracket-panel-true' }, corrupt: trace => trace.map(o => o.checkpoint === 'escape1' ? { ...o, value: { ...(o.value as object), focusActive: true } } : o) },
  ],
});
