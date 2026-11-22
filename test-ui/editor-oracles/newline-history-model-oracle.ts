/** Input recipes for native newline histories; the mixed document model judges them. */
import fc from 'fast-check';
import { mixedPlan, mixedModel, type Intent, type MixedInput } from './mixed-model-oracle.ts';
import type { Observation } from '@tanstack/oracles';
import type { Sample } from './document-oracle.ts';

const unit = fc.constantFrom('a', 'z', 'α', '😀', ' ', '\t', '\n');
const newlineHistoryShape = {
  surface: fc.constantFrom('composer', 'editor', 'quick'), mobile: fc.boolean(),
  command: fc.constantFrom('available', 'refused', 'throws', 'missing'),
  prefix: fc.string({ unit, maxLength: 4 }), picked: fc.string({ unit, minLength: 1, maxLength: 8 }),
  suffix: fc.string({ unit, maxLength: 4 }), continuation: fc.string({ unit, minLength: 1, maxLength: 8 }),
  key: fc.constantFrom('Enter', 'Shift+Enter'), cycles: fc.integer({ min: 1, max: 3 }), branch: fc.boolean(),
  finish: fc.constantFrom('newline', 'direct', 'undo', 'redo', 'history'),
};
// Keep the original record branch intact: old histories remain legal verbatim.
// Extra branches vary receiving lifetime, collaborator completion, and input type.
export const newlineHistoryArbitrary = fc.oneof(
  fc.record(newlineHistoryShape),
  fc.record({ ...newlineHistoryShape, surface: fc.constant('quick'), remount: fc.constant(true) }),
  fc.record({ ...newlineHistoryShape, command: fc.constantFrom('afterFalse', 'afterThrow'), finish: fc.constantFrom('newline', 'direct') }),
  fc.record({ ...newlineHistoryShape, begin: fc.constant('type') }),
  fc.record({ ...newlineHistoryShape, begin: fc.constant('type'), textDelivery: fc.constant('keys'),
    continuation: fc.string({ unit: fc.constantFrom('a', 'z', ' '), minLength: 1, maxLength: 8 }), finish: fc.constant('newline') }),
);
export type NewlineHistory = Sample<typeof newlineHistoryArbitrary>;

// A selected nonempty body followed by LF is always a changed-source
// replacement. No-op history remains the mixed oracle's existing boundary.
export function newlineHistoryPlan(h: NewlineHistory) {
  const action = (kind: 'undo' | 'redo' | 'type', text = 'next'): Intent =>
    ({ kind, text, at: 'current', a: 0, b: 0, activation: 'click' });
  const newline: Intent =
    { kind: 'newline', key: h.key, at: 'range', a: [...h.prefix].length,
      b: [...h.prefix + h.picked + '\n'].length, text: 'unused', activation: 'click' };
  const tails: Record<NewlineHistory['finish'], Intent[]> = {
    newline: [], direct: [action('type', h.continuation)], undo: [action('undo')], redo: [action('undo'), action('redo')],
    history: [...Array.from({ length: h.cycles }, () => [action('undo'), action('redo')]).flat(),
      ...(h.branch ? [action('undo')] : []), action('type', h.continuation), action('redo')],
  };
  const first: Intent = 'begin' in h ? { ...newline, kind: 'type', text: h.continuation } : newline;
  const actions: Intent[] = [first, ...tails[h.finish]];
  return { h, mixed: mixedPlan({ mobile: h.mobile, native: h.command === 'available',
    scene: 'prose', body: h.prefix + h.picked + '\n' + h.suffix, actions }) };
}
export const newlineHistoryModel = (p: ReturnType<typeof newlineHistoryPlan>, trace?: readonly Observation[]) => mixedModel(p.mixed, trace);
export function newlineHistoryStates(p: ReturnType<typeof newlineHistoryPlan>, trace?: readonly Observation[]) {
  const first = trace?.find(item => item.checkpoint === 'input0')?.value as MixedInput | undefined;
  // These facts qualify the controlled driver's actual receiving premise.
  // They do not add a product event-count/call-count law. A missing fact keeps
  // a required construction unreached rather than earning a product-law kill.
  const delivery = trace?.find(item => item.checkpoint === 'step0')?.value as { delivery?: {
    inputs?: { trusted?: boolean; target?: boolean; inputType?: string }[];
    beforeinput?: { trusted?: boolean; target?: boolean; inputType?: string; isComposing?: boolean; cancelable?: boolean }[];
    commands?: { name?: string; signal?: string; events?: { trusted?: boolean; target?: boolean }[] }[];
    remount?: { sameNode?: boolean };
  } } | undefined;
  const receipt = delivery?.delivery;
  // Insert-text APIs may commit through composition. ASCII keys separately
  // force the ordinary noncomposing beforeinput gate; neither chooses source.
  const offeredText = receipt?.beforeinput?.some(event => event.trusted && event.target && event.inputType === 'insertText'
    && (!('textDelivery' in p.h) || (!event.isComposing && event.cancelable)));
  const textPremise = trace === undefined || offeredText || (!('textDelivery' in p.h)
    && receipt?.inputs?.some(event => event.trusted && event.target && (event.inputType === 'insertText' || event.inputType === 'insertCompositionText')));
  const afterSignal = p.h.command === 'afterFalse' || p.h.command === 'afterThrow';
  const commandPremise = trace === undefined || receipt?.commands?.some(command => command.name === 'delete'
    && command.signal === (p.h.command === 'afterFalse' ? 'false' : 'throw')
    && command.events?.some(event => event.trusted && event.target));
  const firstKind = 'begin' in p.h ? 'type' : 'newline';
  const delivered = trace === undefined || first?.action?.kind === firstKind;
  const actions = trace === undefined ? p.mixed.actions : trace.filter(item => item.checkpoint.startsWith('input')).map(item => (item.value as MixedInput).action).filter(action => action !== undefined);
  const undo = actions.filter(action => action.kind === 'undo').length, redo = actions.filter(action => action.kind === 'redo').length;
  return [p.h.surface, p.h.mobile ? 'mobile' : 'desktop', ...(!afterSignal || commandPremise ? [p.h.command] : []), 'save-after:' + p.h.finish,
    ...('remount' in p.h && (trace === undefined || receipt?.remount?.sameNode === false) ? ['reopened-quick-edit'] : []),
    ...('textDelivery' in p.h && textPremise ? ['native-text-keys'] : []),
    ...(delivered && (firstKind !== 'type' || textPremise) ? [firstKind === 'newline' ? p.h.key : 'native-text', p.h.suffix ? 'interior-selection' : 'terminal-LF-selection'] : []),
    ...(p.mixed.h.native && undo && redo ? ['native-undo-redo'] : []),
    ...(p.mixed.h.native && p.h.finish === 'history' ? [p.h.branch ? 'type-after-undo' : 'type-after-redo', 'cycles:' + p.h.cycles] : [])];
}

const base: NewlineHistory = { surface: 'editor', mobile: false, command: 'available', prefix: '',
  picked: '\n', suffix: '', continuation: 'z', key: 'Enter', cycles: 3, branch: false, finish: 'history' };
export const newlineHistoryCases: Record<string, NewlineHistory> = {};
for (const surface of ['composer', 'editor', 'quick'] as const) for (const key of ['Enter', 'Shift+Enter'] as const) {
  newlineHistoryCases[`${surface}-${key}-terminal`] = { ...base, surface, key, mobile: key === 'Shift+Enter' };
  newlineHistoryCases[`${surface}-${key}-prose-branch`] = { ...base, surface, key, prefix: 'a ', picked: 'α😀', branch: true, cycles: 1 };
  newlineHistoryCases[`${surface}-${key}-immediate`] = { ...base, surface, key, finish: 'newline' };
  newlineHistoryCases[`${surface}-${key}-direct`] = { ...base, surface, key, finish: 'direct' };
}
for (const command of ['refused', 'throws', 'missing'] as const) newlineHistoryCases[command] = { ...base, command, cycles: 1 };
// Each React surface has its own callback-ref wiring. Force every native
// command refusal path on both keys there; random marginal reach is weaker.
for (const surface of ['composer', 'editor', 'quick'] as const)
  for (const key of ['Enter', 'Shift+Enter'] as const)
    for (const command of ['refused', 'throws', 'missing'] as const)
      newlineHistoryCases[`${surface}-${key}-${command}`] = { ...base, surface, key, command, mobile: key === 'Shift+Enter', finish: 'newline' };
newlineHistoryCases.interior = { ...base, suffix: 'z', cycles: 2 };
newlineHistoryCases.whitespace = { ...base, prefix: 'a', picked: ' \t\n', branch: true, cycles: 2 };
newlineHistoryCases['save-after-undo'] = { ...base, finish: 'undo' };
newlineHistoryCases['save-after-redo'] = { ...base, finish: 'redo' };
// Guaranteed receiving distinctions, independent of generated marginal reach.
for (const key of ['Enter', 'Shift+Enter'] as const) for (const picked of ['\n', 'α😀'])
  newlineHistoryCases[`reopen-quick-${key}-${picked === '\n' ? 'terminal' : 'unicode'}`] = { ...base, surface: 'quick', key, picked, remount: true };
for (const surface of ['composer', 'editor', 'quick'] as const)
  for (const key of ['Enter', 'Shift+Enter'] as const)
    for (const command of ['afterFalse', 'afterThrow'] as const)
      newlineHistoryCases[`${surface}-${key}-${command}`] = { ...base, surface, key, command, picked: 'α😀', finish: 'newline' };
for (const surface of ['composer', 'editor', 'quick'] as const) for (const picked of ['\n', 'α😀'])
  newlineHistoryCases[`type-terminal-${surface}-${picked === '\n' ? 'empty-lines' : 'unicode'}`] = { ...base, surface, picked, begin: 'type', finish: 'newline' };
for (const surface of ['composer', 'editor', 'quick'] as const)
  newlineHistoryCases[`key-text-${surface}-unicode`] = { ...base, surface, picked: 'α😀', begin: 'type', textDelivery: 'keys', finish: 'newline' };
// Retain left context through completed native input and the next ordinary edit.
// These recipes use the existing forced-signal/direct branch; no undo is owed.
for (const surface of ['composer', 'editor', 'quick'] as const)
  for (const key of ['Enter', 'Shift+Enter'] as const)
    for (const command of ['afterFalse', 'afterThrow'] as const)
      newlineHistoryCases[`${surface}-${key}-prefix-direct-${command}`] = { ...base, surface, key, command,
        prefix: 'a ', picked: 'α😀', continuation: 'z', finish: 'direct', mobile: key === 'Shift+Enter' };
// Nearby invalid input: an empty selected body would admit the native no-op
// history that this recipe intentionally does not promise to undo.
export const newlineHistoryExclusion = { ...base, picked: '' };
if (newlineHistoryArbitrary.canShrinkWithoutContext(newlineHistoryExclusion)) throw new Error('Native newline grammar admitted an empty selected body');
