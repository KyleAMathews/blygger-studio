/**
 * This oracle owns native replacement receiving at a hidden or shown editor region.
 * It checks the actual full editor immediately after one key and clicked Save, owning Editor's held-region receiver.
 *
 * selectAcrossHiddenCut(); press('Enter'); save() // → LF before the intact held paragraph
 * showHeld(); selectThroughHeld(); press('Shift+Enter'); save() // → full draft unchanged, read-only feedback
 * showHeld(); selectFromHeldEnd(); press('Enter'); save() // → intact held paragraph followed by LF
 *
 * Native input can change the DOM and then have React restore it.
 * It can also leave the right visible text while handing React a wrong caret,
 * moving a hidden paragraph to the other side of the replacement. The immediate
 * visible source and the complete saved source distinguish those failures.
 * For every terminal replacement surrounding a hidden cut, the region
 * follows the replacement. Ordinary typing and newlines share this placement.
 * For every shown overlap, the edit is refused with read-only feedback and preserves the full draft; its exact edge accepts.
 * Every accepted newline retains the ordinary mixed oracle's LF, caret, focus
 * and trusted unprevented key promises. Save completes without an action error
 * and stores the complete source, including the held paragraph.
 *
 * Authority: docs/extensions.md, Editor regions, specifies whole-draft
 * preservation, replacement around a cut, shown refusal and accepted edges.
 * Decision by Kyle Mathews (GitHub KyleAMathews), 2026-11-18: protect full existing
 * editor behavior; 2026-11-21: Enter and Shift+Enter use ordinary native LF.
 * Segment recipes vary safe nonempty Unicode words, three region placements,
 * both keys and viewports, plus one ordinary ASCII key. The model constructs
 * the complete draft directly
 * from input segments, reusing the mixed model for accepted visible edits. A
 * unified region-rebasing model would duplicate the scanner this checks.
 * The real compiled regions-example supplies regions, and real React receives
 * native keyboard/input. The driver never fills the hidden textarea. Input
 * receipts retain the temporary source and caret before React's delegated input
 * listener, without imposing exact event counts. The trusted clicked Save's
 * busy lifetime, public action errors and exact item's GET establish completion.
 *
 * Limits: one held paragraph, one terminal selection, one key and immediate
 * Save; eight safe code points per segment. No native undo after refused edits,
 * refused-edit caret geometry, arbitrary region scanner or physical IME claim.
 */
import { differs, oracleProperty, pass } from '@tanstack/oracles';
import { traceValue } from './editor-oracles/document-oracle.ts';
import { checkMixedPrefix } from './editor-oracles/mixed-check-oracle.ts';
import { heldNewlineArbitrary, heldNewlineCases, heldNewlineModel, heldNewlinePlan, heldNewlineStates } from './editor-oracles/held-newline-model-oracle.ts';
import { heldNewlineDriver } from './editor-oracles/held-newline-driver-oracle.ts';

const law = 'native newline held-region receiving';
oracleProperty({
  id: 'editor-browser-held-newline',
  owns: ['src/ui/authoring.tsx#Editor'],
  law: { statement: 'For every terminal native replacement at a held editor paragraph, replacement surrounding a hidden cut keeps the paragraph after the replacement, shown overlap refuses with feedback and preserves the complete draft, its exact edge accepts ordinary text or LF with caret/focus/key behavior, and immediate Save stores the complete resulting source without an action error.',
    authority: 'docs/extensions.md, Editor regions: whole draft, read-only when shown, typed-text placement and exact-edge acceptance; Decision by Kyle Mathews (GitHub KyleAMathews), 2026-11-18: protect full existing editor behavior; 2026-11-21: follow main ordinary native Enter/Shift+Enter.',
    limits: 'One real regions-example paragraph, nonempty safe Unicode segment words up to eight code points, desktop/mobile viewport, Enter/Shift+Enter or one ordinary ASCII typing key and immediate full-editor Save. No refused-edit caret or undo promise, arbitrary region parsing or physical IME claim.' },
  histories: { arbitrary: heldNewlineArbitrary, runs: 25, fixedSeeds: [20261118],
    states: [...new Set(Object.values(heldNewlineCases).flatMap(h => heldNewlineStates(heldNewlinePlan(h))))],
    constructed: Object.entries(heldNewlineCases).map(([name, h]) => ({ name, enters: heldNewlineStates(heldNewlinePlan(h)), build: () => h })) },
  resolve: heldNewlinePlan, model: heldNewlineModel, driver: heldNewlineDriver,
  reached: (p, trace) => (traceValue(trace, 'key0') as { event?: { trusted?: boolean } })?.event?.trusted ? heldNewlineStates(p) : [],
  check: (p, trace, expected) => {
    const opened = differs('opened', law, traceValue(trace, 'opened'), { value: p.h.left + (p.h.mode === 'hidden' ? '\n\n' : '\n\nz\n'), notice: 'hidden' });
    if (opened) return opened;
    if (!expected.refused) {
      const accepted = checkMixedPrefix(p.mixed, trace, expected.history, law); if (accepted) return accepted;
    } else {
      const input = traceValue(trace, 'input0') as { value?: string; selection?: number[]; action?: unknown; delivered?: unknown };
      const before = differs('input0', law, { value: input.value, selection: input.selection },
        { value: p.full, selection: [0, p.full.length] }, 'input0.continuity');
      if (before) return before;
      const delivered = differs('input0', law, input.delivered,
        { value: p.full, selection: [p.from, p.full.length] }, 'input0.delivered');
      if (delivered) return delivered;
      const action = differs('input0', law, expected.history.steps[0]!.actions.some(action => JSON.stringify(action) === JSON.stringify(input.action)), true, 'input0.action');
      if (action) return action;
      const key = differs('key0', law, traceValue(trace, 'key0'), {
        requested: 'text' in p.h ? p.h.text : p.h.key, before: { focused: true, selection: [p.from, p.full.length] },
        event: { key: 'text' in p.h ? p.h.text[0] : 'Enter', shiftKey: !('text' in p.h) && p.h.key === 'Shift+Enter', altKey: false, ctrlKey: false,
          metaKey: false, trusted: true, target: true, defaultPrevented: false },
      }, 'key0.receiving');
      if (key) return key;
      const refused = differs('step0', law, (traceValue(trace, 'step0') as { value?: string })?.value, p.full, 'step0.readonly source');
      if (refused) return refused;
    }
    const region = traceValue(trace, 'region') as { notice?: string; messages?: string[] };
    const saved = traceValue(trace, 'saved') as { source?: string; status?: number; boundary?: { trusted?: boolean; states?: boolean[]; errors?: string[] } };
    return differs('step0', law, (traceValue(trace, 'step0') as { focused?: boolean })?.focused, true, 'step0.focus')
      ?? differs('region', law, region.notice, expected.notice, 'region.notice')
      ?? differs('region', law, region.messages, expected.refused ? ['The held paragraph is read-only here.'] : [], 'region.feedback')
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
