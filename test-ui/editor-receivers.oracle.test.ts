/**
 * This oracle owns formatting guards during a real held restore in Studio's
 * full editor, including ordinary save consumption before a subsequent edit.
 * It checks pending, completed and follow-up source/range observations and
 * owns authoring.tsx#Editor.
 *
 * restore.pending(); press('ControlOrMeta+b') // → readonly source/range remain
 * restore.reject(); bold(body) // → original working copy is editable again
 * restore.succeed(); saveDraft(); bold(body) // → save consumes restored source before bold
 *
 * A later restore can overwrite an illegal intermediate edit, so final source
 * alone cannot establish readonly behavior. For every held restore, the actual
 * textarea is readonly, structural/formula controls disabled and pickers absent;
 * each supported formatting key or native control activation preserves source
 * and range. Success receives the independently arranged historical source;
 * rejection reports failure and retains working source. Either outcome releases
 * the guard, and a subsequent ordinary bold command receives its adopted edit.
 * An ordinary save before that edit submits the accepted historical source (or
 * retained working source after rejection), stores it and reports saved. With
 * no later input, the component-public save result reports current. A separately
 * updated textarea does not prove which source that save consumes.
 * The operation's own busy receipt establishes settlement independently of the
 * editing guards whose release is judged. Whole-document replacement itself has
 * no promised caret geometry.
 *
 * Authority: decision by Kyle Mathews (GitHub KyleAMathews),2026-11-18: strengthen
 * existing T4 picker/focus/readonly browser behavior; real replacement gates in
 * authoring.tsx and pending restore observations in
 * test-ui/authoring-revision-session.test.ts at28b0c8d.
 * Primitive histories vary ordinary Unicode prose, both viewports, each key and
 * each structural/formula control, bracket/mention/no picker and restore result.
 * The model projects inputs without formatter outputs or production classifiers.
 * The actual React editor, picker, confirm sheet, native keyboard and pointer
 * receive the actions. The save continuation observes whole PATCH source and
 * server read-back, actual saved/error feedback and Draft.save's component-public
 * current-result receipt. Dirty getter reads remain diagnostics. Settings,
 * contacts and rejected responses are controlled inputs. Visible history/pane/
 * restore controls use controlled focus and native Enter. Hidden pane controls
 * use their actual DOM handler; data-pane commits are host inputs.
 *
 * Limits:24 ordinary generated code points; one restore, optional ordinary save
 * and one subsequent bold edit. Other editor surfaces, publication rules and
 * arbitrary restoration caret are separate.
 */
import { differs, oracleProperty, pass } from '@tanstack/oracles';
import { traceValue } from './editor-oracles/document-oracle.ts';
import { fields } from './editor-oracles/receiver-fields-oracle.ts';
import { replacementReceiverArbitrary, replacementReceiverCases, replacementReceiverModel, replacementReceiverPlan, replacementReceiverStates } from './editor-oracles/receiver-model-oracle.ts';
import { replacementReceiverDriver } from './editor-oracles/receiver-driver-oracle.ts';

const authority = 'Decision by Kyle Mathews (GitHub KyleAMathews),2026-11-18: adopted T4 picker/focus/readonly expansion, working-copy persistence and preservation of existing behavior; e2e/picker.spec.ts, e2e/focus-view.spec.ts and test-ui/authoring-revision-session.test.ts at28b0c8d642a87e5810ad6eabd95c2d1714c53396; src/ui/authoring.tsx replacement gates.';
const replacementLaw = 'held replacement formatting gate';
oracleProperty({
  id: 'editor-browser-replacement-gates', owns: ['src/ui/authoring.tsx#Editor'],
  law: { statement: 'For every held restore, readonly textarea input, disabled formatting controls and absent pickers preserve working source/range; success receives historical source, failure reports and retains working source, either outcome releases editing for the next adopted command, and an ordinary save consumes that accepted or retained working source before a later edit.', authority, limits: 'One real historical restore, optional immediate ordinary save, controlled success/rejection delivery, six supported readonly keys and five structural/formula controls, optional actual bracket/mention picker, both viewports and24 ordinary code points. Desktop hidden-pane receipt uses the actual DOM handler; disabled controls use native pointer plus actual hit testing. Does not judge restore versioning or final replacement caret.' },
  histories: { arbitrary: replacementReceiverArbitrary, runs: 25, fixedSeeds: [20261118], states: [...new Set(Object.values(replacementReceiverCases).flatMap(h => replacementReceiverStates(replacementReceiverPlan(h))))], constructed: Object.entries(replacementReceiverCases).map(([name, h]) => ({ name, enters: replacementReceiverStates(replacementReceiverPlan(h)), build: () => h })) },
  resolve: replacementReceiverPlan, model: replacementReceiverModel,
  reached: (p, trace) => {
    const restoreDelivered = traceValue(trace, 'request') && (traceValue(trace, 'attemptInput') as { nativeDelivered?: boolean } | undefined)?.nativeDelivered && traceValue(trace, 'attempted');
    const saveInput = traceValue(trace, 'acceptedSaveInput') as { key?: { trusted?: boolean; key?: string } } | undefined;
    const saved = traceValue(trace, 'acceptedSave') as { responseCompleted?: boolean; inspected?: boolean } | undefined;
    // Required save reach needs native activation, actual HTTP completion and
    // read-back delivery; it never depends on the expected source being right.
    return restoreDelivered && (!p.saveBeforeEdit || (saveInput?.key?.trusted && saveInput.key.key === 'Enter' && saved?.responseCompleted && saved.inspected)) ? replacementReceiverStates(p) : [];
  }, driver: replacementReceiverDriver,
  check: (p, trace, expected) => {
    const before = fields(trace, 'before', { value: p.working, selection: [p.working.length, p.working.length], pickers: p.h.picker === 'none' ? 0 : 1 }, replacementLaw); if (before) return before;
    const confirmation = fields(trace, 'confirmation', { value: p.working, selection: [p.working.length, p.working.length], pickers: p.h.picker === 'none' ? 0 : 1 }, replacementLaw); if (confirmation) return confirmation;
    const pending = fields(trace, 'pending', expected.pending, replacementLaw); if (pending) return pending;
    if (!(traceValue(trace, 'attemptInput') as { nativeDelivered?: boolean } | undefined)?.nativeDelivered) return pass; // preserve native-target premise error
    for (const checkpoint of ['attempted', 'settled', 'followup'] as const) {
      if (checkpoint === 'followup' && p.saveBeforeEdit) {
        const submitted = fields(trace, 'acceptedSaveSubmitted', expected.acceptedSaveSubmitted, replacementLaw); if (submitted) return submitted;
        const saved = fields(trace, 'acceptedSave', expected.acceptedSave, replacementLaw); if (saved) return saved;
      }
      const failure = fields(trace, checkpoint, expected[checkpoint], replacementLaw); if (failure) return failure;
    }
    const requests = traceValue(trace, 'request') as { method: string; body?: { version?: number }; status: number }[] | undefined;
    const request = requests?.map(r => ({ method: r.method, version: r.body?.version, status: r.status }));
    return differs('request', replacementLaw, request, [{ method: 'POST', version: 1, status: p.h.outcome === 'success' ? 200 : 500 }], 'request.delivery') ?? differs('errors', replacementLaw, traceValue(trace, 'errors'), []) ?? pass;
  },
  calibrations: [
    { name: 'pending textarea remains editable', law: replacementLaw, difference: 'pending.readonly', history: { constructed: 'ControlOrMeta+b-success-false' }, corrupt: trace => trace.map(o => o.checkpoint === 'pending' ? { ...o, value: { ...(o.value as object), readonly: false } } : o) },
    { name: 'disabled control changes pending source', law: replacementLaw, difference: 'attempted.value', history: { constructed: 'code-success-false' }, corrupt: trace => trace.map(o => o.checkpoint === 'attempted' ? { ...o, value: { ...(o.value as object), value: 'illegal edit' } } : o) },
    { name: 'restore receives the wrong source', law: replacementLaw, difference: 'settled.value', history: { constructed: 'ControlOrMeta+b-success-false' }, corrupt: trace => trace.map(o => o.checkpoint === 'settled' ? { ...o, value: { ...(o.value as object), value: 'not historical source' } } : o) },
    { name: 'rejected restore hides its error', law: replacementLaw, difference: 'settled.errorShown', history: { constructed: 'ControlOrMeta+b-reject-false' }, corrupt: trace => trace.map(o => o.checkpoint === 'settled' ? { ...o, value: { ...(o.value as object), errorShown: false } } : o) },
    { name: 'accepted save submits stale working source', law: replacementLaw, difference: 'acceptedSaveSubmitted.submitted', history: { constructed: 'saveThenBold-success-false' }, corrupt: trace => trace.map(o => o.checkpoint === 'acceptedSaveSubmitted' ? { ...o, value: { ...(o.value as object), submitted: [{ method: 'PATCH', source: 'stale working source' }] } } : o) },
    { name: 'accepted save stores stale working source', law: replacementLaw, difference: 'acceptedSave.stored', history: { constructed: 'saveThenBold-success-false' }, corrupt: trace => trace.map(o => o.checkpoint === 'acceptedSave' ? { ...o, value: { ...(o.value as object), stored: 'stale working source' } } : o) },
    { name: 'accepted save reports superseded input without a later edit', law: replacementLaw, difference: 'acceptedSave.save', history: { constructed: 'saveThenBold-success-false' }, corrupt: trace => trace.map(o => o.checkpoint === 'acceptedSave' ? { ...o, value: { ...(o.value as object), save: { status: 'fulfilled', result: false } } } : o) },
    { name: 'accepted save hides saved feedback', law: replacementLaw, difference: 'acceptedSave.savedShown', history: { constructed: 'saveThenBold-success-false' }, corrupt: trace => trace.map(o => o.checkpoint === 'acceptedSave' ? { ...o, value: { ...(o.value as object), savedShown: false } } : o) },
    { name: 'rejection never releases editing', law: replacementLaw, difference: 'followup.value', history: { constructed: 'ControlOrMeta+b-reject-false' }, corrupt: trace => trace.map(o => o.checkpoint === 'followup' ? { ...o, value: { ...(o.value as object), value: 'still readonly' } } : o) },
  ],
});
