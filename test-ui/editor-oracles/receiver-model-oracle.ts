/** Input-only histories for picker, Escape layering and held replacement. */
import fc from 'fast-check';
import type { Sample } from './document-oracle.ts';

const body = fc.string({ unit: fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,;', 'α', '😀'), minLength: 1, maxLength: 24 });
export const bracketReceiverArbitrary = fc.record({ mobile: fc.boolean(), key: fc.constantFrom('Enter', 'Shift+Enter'), body });
export type BracketReceiver = Sample<typeof bracketReceiverArbitrary>;
export const bracketReceiverCases: Record<string, BracketReceiver> = {};
for (const mobile of [false, true]) for (const key of ['Enter', 'Shift+Enter'] as const) bracketReceiverCases[`${key}-${mobile}`] = { mobile, key, body: 'alpha😀' };
export const bracketReceiverPlan = (h: BracketReceiver) => ({ h, text: '- parent\n- [[needle' + h.body });
export const bracketReceiverStates = (p: ReturnType<typeof bracketReceiverPlan>) => [p.h.mobile ? 'mobile' : 'desktop', p.h.key, 'actualBracketEntry'];

export const escapeReceiverArbitrary = fc.oneof(
  fc.record({ mobile: fc.boolean(), picker: fc.constant('bracket' as const), typing: fc.constantFrom('editor' as const, 'panel' as const), body }),
  fc.record({ mobile: fc.boolean(), picker: fc.constantFrom('none' as const, 'mention' as const), typing: fc.constant('editor' as const), body }),
);
export type EscapeReceiver = Sample<typeof escapeReceiverArbitrary>;
export const escapeReceiverCases: Record<string, EscapeReceiver> = {};
for (const mobile of [false, true]) {
  for (const typing of ['editor', 'panel'] as const) escapeReceiverCases[`bracket-${typing}-${mobile}`] = { mobile, picker: 'bracket', typing, body: 'alpha😀' };
  for (const picker of ['none', 'mention'] as const) escapeReceiverCases[`${picker}-editor-${mobile}`] = { mobile, picker, typing: 'editor', body: 'alpha😀' };
}
export const escapeReceiverPlan = (h: EscapeReceiver) => ({ h, initial: 'Writing ' + h.body + ' ', text: 'Writing ' + h.body + (h.picker === 'bracket' ? ' [[needle' : h.picker === 'mention' ? ' @al' : ' ') });
// Escape consumes one open layer. Fullscreen is explicitly absent in this host;
// these are the already-adopted DOM key and source/caret observations.
export function escapeReceiverModel(p: ReturnType<typeof escapeReceiverPlan>) {
  const first = { value: p.text, selection: [p.text.length, p.text.length], focusActive: p.h.picker !== 'none', pickers: 0 };
  return [first, { ...first, focusActive: false }];
}
export const escapeReceiverStates = (p: ReturnType<typeof escapeReceiverPlan>) => [p.h.mobile ? 'mobile' : 'desktop', p.h.picker, ...(p.h.picker === 'bracket' ? [p.h.typing] : []), 'domEscapeHost'];

export const replacementKeys = ['ControlOrMeta+b', 'ControlOrMeta+i', 'ControlOrMeta+k', 'Tab', 'Shift+Tab', 'Shift+Enter'] as const;
export const replacementControls = ['indent', 'outdent', 'break', 'code', 'formula'] as const;
const attempt = fc.oneof(
  fc.record({ kind: fc.constant('key' as const), name: fc.constantFrom(...replacementKeys) }),
  fc.record({ kind: fc.constant('control' as const), name: fc.constantFrom(...replacementControls) }),
);
const replacementInputs = { mobile: fc.boolean(), body, outcome: fc.constantFrom('success' as const, 'reject' as const), picker: fc.constantFrom('none' as const, 'bracket' as const, 'mention' as const), attempt };
// Keep every original immediate-bold history and add a public source consumer
// before bold. A restore must install the source that Save draft submits, even
// when the controlled textarea was separately updated by the same response.
export const replacementReceiverArbitrary = fc.record(
  { ...replacementInputs, continuation: fc.constant('saveThenBold' as const) },
  { requiredKeys: ['mobile', 'body', 'outcome', 'picker', 'attempt'] },
);
export type ReplacementReceiver = Sample<typeof replacementReceiverArbitrary>;
export const replacementReceiverCases: Record<string, ReplacementReceiver> = {};
for (const mobile of [false, true]) for (const outcome of ['success', 'reject'] as const) {
  for (const name of replacementKeys) replacementReceiverCases[`${name}-${outcome}-${mobile}`] = { mobile, outcome, picker: 'none', body: 'alpha😀', attempt: { kind: 'key', name } };
  for (const name of replacementControls) replacementReceiverCases[`${name}-${outcome}-${mobile}`] = { mobile, outcome, picker: 'none', body: 'alpha😀', attempt: { kind: 'control', name } };
  for (const picker of ['bracket', 'mention'] as const) replacementReceiverCases[`${picker}-${outcome}-${mobile}`] = { mobile, outcome, picker, body: 'alpha😀', attempt: { kind: 'key', name: 'ControlOrMeta+b' } };
}
for (const mobile of [false, true]) for (const outcome of ['success', 'reject'] as const) {
  replacementReceiverCases[`saveThenBold-${outcome}-${mobile}`] = {
    mobile, outcome, picker: 'none', body: 'alpha😀', attempt: { kind: 'key', name: 'ControlOrMeta+b' }, continuation: 'saveThenBold',
  };
}
export function replacementReceiverPlan(h: ReplacementReceiver) {
  const published = 'published ' + h.body;
  const working = '- parent\n    - ' + h.body + (h.picker === 'bracket' ? '\n- [[needle' : h.picker === 'mention' ? '\n- @al' : '');
  return { h, published, working, from: 15, to: 15 + h.body.length, saveBeforeEdit: 'continuation' in h && h.continuation === 'saveThenBold' };
}
export function replacementReceiverModel(p: ReturnType<typeof replacementReceiverPlan>) {
  const value = p.h.outcome === 'success' ? p.published : p.working;
  const start = p.h.outcome === 'success' ? 'published '.length : p.from;
  return {
    pending: { value: p.working, selection: [p.working.length, p.working.length], readonly: true, disabled: replacementControls.map(name => ({ name, count: 1, disabled: true })), pickers: 0, operationBusy: true },
    attempted: { value: p.working, selection: [p.from, p.to] },
    settled: { value, readonly: false, disabled: replacementControls.map(name => ({ name, count: 1, disabled: false })), operationBusy: false, errorShown: p.h.outcome === 'reject' },
    // Restored/retained source is determined by arranged inputs. The new Save
    // continuation observes actual source consumption before an edit can heal it.
    acceptedSaveSubmitted: { value, readonly: false, operationBusy: true, submitted: [{ method: 'PATCH', source: value }] },
    // Save's component-public boolean reports the same submitted input remains
    // current; no later edit occurs. Dirty getter reads are diagnostics only.
    acceptedSave: { value, readonly: false, operationBusy: false, savedShown: true, errorShown: false,
      submitted: [{ method: 'PATCH', source: value }], statuses: [200], stored: value, inspectionStatus: 200, responseCompleted: true,
      save: { status: 'fulfilled', result: true } },
    followup: { value: value.slice(0, start) + '**' + p.h.body + '**' + value.slice(start + p.h.body.length), selection: [start + 2, start + 2 + p.h.body.length] },
  };
}
export const replacementReceiverStates = (p: ReturnType<typeof replacementReceiverPlan>) => [p.h.mobile ? 'mobile' : 'desktop', p.h.outcome, p.h.attempt.kind, p.h.attempt.name, 'pendingRestore', p.h.picker === 'none' ? 'noPickerBeforeRestore' : p.h.picker + 'BeforeRestore', ...(p.saveBeforeEdit ? ['saveBeforeEdit', p.h.outcome === 'success' ? 'acceptedSourceSave' : 'retainedSourceSave'] : [])];
