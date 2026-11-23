/**
 * This oracle owns native receiving at hidden or shown editor regions in Editor
 * (src/ui/authoring.tsx). It checks source immediately after one native key and
 * the complete draft after clicked Save, including read-only feedback.
 *
 * selectAcrossHiddenCut(); press('Enter'); save() // → LF before the intact held paragraph
 * showHeld(); selectThroughHeld(); type('x') // → unchanged draft and read-only feedback
 * showHeld(); type('x') // → accepted at either exact edge, refused strictly inside
 * showHeld(); press('Delete') // → refused when it removes a protected character
 *
 * Replacing the last protected x with another x can leave an apparent change
 * only after the region. A resulting-byte diff loses the offered selection.
 * The offered range and native operation determine which characters the author
 * tried to edit; the protected interval determines whether they may change.
 *
 * For every supported single native insertion or deletion/cut, shown source
 * refuses removal of protected characters and insertion strictly inside, while
 * insertion at either exact edge accepts. Empty, reversed and outside raw
 * ranges protect no source; overlapping/touching ranges protect their union and
 * merge feedback labels. Hidden terminal replacements preserve the held paragraph
 * after the replacement. Accepted edits keep exact source, caret and focus;
 * refused edits keep source and focus. Every Save stores the full resulting draft.
 *
 * Authority: docs/extensions.md, Editor regions, and editor-regions.ts's public
 * normalization contract. Decision by Kyle Mathews (GitHub KyleAMathews),
 * 2026-11-22: cover the full read-only native input boundary; 2026-11-21:
 * Enter and Shift+Enter use ordinary native LF.
 *
 * Segment recipes construct a known protected interval without scanning text.
 * A pure replacement model predicts native keys directly; a general mixed-action
 * model would add undo state this single-operation law does not need. Every old
 * terminal recipe remains, beside caret/range, Unicode, viewport and raw-layout
 * witnesses. The browser compiles the real regions-example scanner, with a
 * test-only adapter for equivalent raw layouts; this establishes normalized
 * receiving, not arbitrary extension parsing. The driver records delivered range,
 * trusted unprevented key, native input receipts and immediate DOM source before
 * clicking Save. Its busy lifecycle and the exact item's GET establish completion.
 *
 * Limits: one held paragraph; one native key; safe nonempty segment words of up
 * to eight code points; immediate Save. No refused-edit caret geometry, physical
 * IME, clipboard-content, arbitrary scanner or native Undo/Redo promise.
 */
import { differs, oracleProperty, pass } from '@tanstack/oracles';
import { traceValue } from './editor-oracles/document-oracle.ts';
import { heldNewlineArbitrary, heldNewlineCases, heldNewlineModel, heldNewlinePlan, heldNewlineStates } from './editor-oracles/held-newline-model-oracle.ts';
import { heldNewlineDriver } from './editor-oracles/held-newline-driver-oracle.ts';

const law = 'native newline held-region receiving';
oracleProperty({
  id: 'editor-browser-held-newline',
  owns: ['src/ui/authoring.tsx#Editor'],
  law: { statement: 'For every supported single native insertion or deletion/cut at a generated caret or range, shown read-only source refuses removal of protected characters and insertion strictly inside, exact-edge insertion accepts, raw ranges obey normalization and merged feedback, hidden terminal replacements preserve the held paragraph after the replacement, and immediate receiving plus clicked Save preserve the complete resulting source with native caret/focus/key behavior for accepted edits.',
    authority: 'docs/extensions.md, Editor regions; editor-regions.ts normalization contract. Decision by Kyle Mathews (GitHub KyleAMathews), 2026-11-22: cover the full read-only native input boundary; 2026-11-21: ordinary native Enter/Shift+Enter.',
    limits: 'One real regions-example paragraph with bounded raw-layout variants, safe Unicode words up to eight code points, desktop/mobile viewport, one ASCII typing key, Enter/Shift+Enter, Backspace/Delete or cut, then full-editor Save. No refused-edit caret geometry, physical IME, clipboard content, arbitrary scanner or native Undo/Redo promise.' },
  histories: { arbitrary: heldNewlineArbitrary, runs: 25, fixedSeeds: [20261118],
    states: [...new Set(Object.values(heldNewlineCases).flatMap(h => heldNewlineStates(heldNewlinePlan(h))))],
    constructed: Object.entries(heldNewlineCases).map(([name, h]) => ({ name, enters: heldNewlineStates(heldNewlinePlan(h)), build: () => h })) },
  resolve: heldNewlinePlan, model: heldNewlineModel, driver: heldNewlineDriver,
  reached: (p, trace) => (traceValue(trace, 'key0') as { event?: { trusted?: boolean } })?.event?.trusted ? heldNewlineStates(p) : [],
  check: (p, trace, expected) => {
    const opened = differs('opened', law, traceValue(trace, 'opened'), { value: p.h.left + (p.h.mode === 'hidden' ? '\n\n' : '\n\nz\n'), notice: 'hidden' });
    if (opened) return opened;
    const input = traceValue(trace, 'input0') as { value?: string; selection?: number[]; action?: unknown; delivered?: unknown };
    const before = differs('input0', law, { value: input.value, selection: input.selection },
      { value: p.shown, selection: [0, p.shown.length] }, 'input0.continuity');
    if (before) return before;
    const delivered = differs('input0', law, input.delivered,
      { value: p.shown, selection: p.range }, 'input0.delivered');
    if (delivered) return delivered;
    const action = differs('input0', law, input.action, { requested: p.requested, range: p.range }, 'input0.action');
    if (action) return action;
    const key = traceValue(trace, 'key0') as { requested?: string; before?: unknown; event?: { ctrlKey?: boolean; metaKey?: boolean } };
    const cut = !('text' in p.h) && p.h.key === 'ControlOrMeta+x';
    const modifier = cut ? [{ ctrlKey: true, metaKey: false }, { ctrlKey: false, metaKey: true }] : [{ ctrlKey: false, metaKey: false }];
    const keyAllowed = modifier.some(mod => JSON.stringify(key) === JSON.stringify({
      requested: p.requested, before: { focused: true, selection: p.range },
      event: { key: cut ? 'x' : p.requested === 'Shift+Enter' ? 'Enter' : p.requested,
        shiftKey: !('text' in p.h) && p.h.key === 'Shift+Enter', altKey: false, ctrlKey: mod.ctrlKey,
        metaKey: mod.metaKey, trusted: true, target: true, defaultPrevented: false },
    }));
    const receiving = differs('key0', law, keyAllowed, true, 'key0.receiving');
    if (receiving) return receiving;
    const step = traceValue(trace, 'step0') as { value?: string; selection?: number[] };
    const state = expected.refused
      ? differs('step0', law, step.value, expected.value, 'step0.readonly source')
      : differs('step0', law, { value: step.value, selection: step.selection },
        { value: expected.value, selection: expected.selection }, 'step0.state');
    if (state) return state;
    const region = traceValue(trace, 'region') as { notice?: string; messages?: string[] };
    const saved = traceValue(trace, 'saved') as { source?: string; status?: number; boundary?: { trusted?: boolean; states?: boolean[]; errors?: string[] } };
    return differs('step0', law, (traceValue(trace, 'step0') as { focused?: boolean })?.focused, true, 'step0.focus')
      ?? differs('region', law, region.notice, expected.notice, 'region.notice')
      ?? differs('region', law, region.messages, expected.messages, 'region.feedback')
      ?? differs('saved', law, { source: saved.source, status: saved.status }, { source: expected.full, status: 200 }, 'saved.full source')
      ?? differs('saved', law, !!saved.boundary?.trusted && saved.boundary.states?.includes(true) && saved.boundary.states.at(-1) === false, true, 'saved.action completion')
      ?? differs('saved', law, saved.boundary?.errors, [], 'saved.action errors')
      ?? differs('errors', law, traceValue(trace, 'errors'), []) ?? pass;
  },
  calibrations: [
    { name: 'shown protected source corrupts before key then heals', law, difference: 'input0.continuity', history: { constructed: 'rejected-Enter-false' },
      corrupt: trace => trace.map(item => item.checkpoint === 'input0' ? { ...item, value: { ...(item.value as object), value: '!' + (item.value as { value: string }).value.slice(1) } } : item) },
    { name: 'shown protected source corrupts during range delivery', law, difference: 'input0.delivered', history: { constructed: 'rejected-Enter-false' },
      corrupt: trace => trace.map(item => item.checkpoint === 'input0' ? { ...item, value: { ...(item.value as object), delivered: {
        ...(item.value as { delivered: object }).delivered, value: '!' + (item.value as { delivered: { value: string } }).delivered.value.slice(1),
      } } } : item) },
    { name: 'hidden paragraph moved before replacement', law, difference: 'saved.full source', history: { constructed: 'hidden-Enter-false' },
      corrupt: trace => trace.map(item => item.checkpoint === 'saved' ? { ...item, value: { ...(item.value as object), source: 'misplaced held paragraph' } } : item) },
    { name: 'shown paragraph accepts protected deletion', law, difference: 'step0.readonly source', history: { constructed: 'rejected-Enter-false' },
      corrupt: trace => trace.map(item => item.checkpoint === 'step0' ? { ...item, value: { ...(item.value as object), value: 'lost held text' } } : item) },
    { name: 'exact edge rejects allowed replacement', law, difference: 'step0.state', history: { constructed: 'edge-Shift+Enter-true' },
      corrupt: trace => trace.map(item => item.checkpoint === 'step0' ? { ...item, value: { ...(item.value as object), value: 'unchanged old suffix' } } : item) },
  ],
});
