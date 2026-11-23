/**
 * This oracle owns the working copy consumed by editor save and unload guards:
 * Draft.edit, dirty and save, executed in the browser with controlled persistence.
 * It checks source, dirty status, submitted snapshots and each save's result.
 *
 * edit('x'); save(); acknowledge() // → submitted x is clean if no newer edit exists
 * save(); edit('y'); acknowledge() // → y remains dirty; earlier save returns false
 * edit('x'); save(); reject() // → x remains dirty and persistence rejects
 * saveOld(); edit(); saveNew(); acknowledgeNew(); acknowledgeOld() // → late old ack cannot make the clean copy dirty
 *
 * Equal source is not equal editing history: editing x back to x still leaves
 * an unacknowledged edit. For every edit/save history, an acknowledgement
 * discharges only edits present in its submitted snapshot; rejection discharges
 * none. A save reports current exactly when its submitted editing event remains
 * the latest one at completion. Source always remains the most recent input.
 *
 * Authority: decision by Kyle Mathews (GitHub KyleAMathews),2026-11-18: protect
 * formatted working-copy persistence and register explicit departure behavior;
 * existing earlier-ack/newer-text and failed-save laws in test-ui/state.test.ts
 * at28b0c8d. This component driver supplies a second formulation for the actual
 * browser navigation receiver, including callback failures and overlapping saves.
 *
 * The model is a set of unacknowledged input-edit tokens, not Draft's revision
 * counters. Save snapshots capture token sets and input-event identity. The
 * browser controls callback promise completion and records every public result
 * after each legal action. The grammar resolves completion slots from pending
 * submissions; a completion intent with no submission becomes an inspection.
 * Limits: at most16 actions and32UTF-16 units per input. Server accept/reset,
 * paced-write queue ordering and API persistence are separate contracts; this
 * oracle does not replace their existing tests or promise native UI timing.
 */
import { differs, oracleProperty, pass } from '@tanstack/oracles';
import { browserRun } from './editor-oracles/browser-driver-oracle.ts';
import { draftArbitrary, draftCases, draftModel, draftPlan, draftStates } from './editor-oracles/draft-model-oracle.ts';
import { traceValue } from './editor-oracles/document-oracle.ts';
const law = 'working-copy save snapshots';
oracleProperty({
  id: 'editor-browser-draft', owns: ['src/ui/draft.ts#Draft.dirty', 'src/ui/draft.ts#Draft.edit', 'src/ui/draft.ts#Draft.save'],
  law: { statement: 'For every edit/save history, acknowledgements discharge only submitted edits, rejection keeps unsaved edits, source remains latest input, and save reports whether its submitted input event is still current.', authority: 'Decision by Kyle Mathews (GitHub KyleAMathews),2026-11-18: protect formatted working-copy persistence; test-ui/state.test.ts earlier-save/newer-text and rejection observations at28b0c8d642a87e5810ad6eabd95c2d1714c53396.', limits: 'At most16 edit/save/resolve/reject/inspect events,32UTF-16 units per source. Draft.accept, paced-write scheduling, real network and UI guard delivery are separate.' },
  histories: { arbitrary: draftArbitrary, runs: 25, fixedSeeds: [20261118], states: [...new Set(Object.values(draftCases).flatMap(h => draftStates(draftPlan(h))))], constructed: Object.entries(draftCases).map(([name, h]) => ({ name, enters: draftStates(draftPlan(h)), build: () => h })) },
  resolve: draftPlan, model: draftModel, reached: draftStates,
  driver: async (p, observe) => {
    const snapshots = await browserRun(async (_format, p, _links, { Draft }) => {
      const gates = new Map<number, { resolve: () => void; reject: () => void }>();
      const promises = new Map<number, Promise<void>>(); let activeSlot = -1;
      const writes: { slot: number; text: string }[] = [], settled: { slot: number; result: unknown }[] = [];
      const draft = new Draft(p.initial, text => {
        const slot = activeSlot; writes.push({ slot, text });
        return new Promise<void>((resolve, reject) => gates.set(slot, { resolve, reject: () => reject(new Error('offline')) }));
      });
      const snapshot = () => ({ text: draft.text, dirty: draft.dirty, writes: writes.map(w => ({ ...w })), settled: settled.map(s => ({ ...s })) });
      const result = [snapshot()];
      for (const action of p.actions) {
        if (action.kind === 'edit') draft.edit(action.text);
        else if (action.kind === 'save') {
          activeSlot = action.slot;
          try {
            const returned = draft.save();
            if (!returned || typeof returned.then !== 'function') settled.push({ slot: action.slot, result: { invalidReturn: typeof returned } });
            else promises.set(action.slot, returned.then(value => { settled.push({ slot: action.slot, result: value }); }, () => { settled.push({ slot: action.slot, result: 'rejected' }); }));
          } catch (error) {
            settled.push({ slot: action.slot, result: { thrown: { name: (error as Error).name, message: (error as Error).message } } });
          }
        } else if (action.kind === 'resolve' || action.kind === 'reject') {
          const gate = gates.get(action.slot);
          if (gate) { gate[action.kind](); await promises.get(action.slot); gates.delete(action.slot); }
        }
        result.push(snapshot());
      }
      for (const gate of gates.values()) gate.resolve();
      await Promise.all(promises.values());
      return result;
    }, p);
    for (const [index, snapshot] of snapshots.entries()) observe('step' + index, snapshot);
  },
  check: (_p, trace, expected) => {
    for (const [index, value] of expected.entries()) { const failure = differs('step' + index, law, traceValue(trace, 'step' + index), value); if (failure) return failure; }
    return pass;
  },
  calibrations: [
    { name: 'same text incorrectly clean', law, history: { constructed: 'sameTextDirty' }, corrupt: trace => trace.map(o => o.checkpoint === 'step1' ? { ...o, value: { ...(o.value as object), dirty: false } } : o) },
    { name: 'old save acknowledges newer text', law, history: { constructed: 'pendingEdit' }, corrupt: trace => trace.map(o => o.checkpoint === 'step3' ? { ...o, value: { ...(o.value as object), dirty: false } } : o) },
  ],
});
