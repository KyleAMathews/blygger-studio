/** Native input recipes judge app receiving; the browser owns its Undo engine. */
import fc from 'fast-check';
import { mixedPlan, mixedModel, type Intent, type MixedInput } from './mixed-model-oracle.ts';
import type { Observation } from '@tanstack/oracles';
import type { Sample } from './document-oracle.ts';

const unit = fc.constantFrom('a', 'z', 'α', '😀', ' ', '\t', '\n');
const shape = {
  surface: fc.constantFrom('composer', 'editor', 'quick'), mobile: fc.boolean(),
  prefix: fc.string({ unit, maxLength: 4 }), picked: fc.string({ unit, minLength: 1, maxLength: 8 }),
  suffix: fc.string({ unit, maxLength: 4 }), continuation: fc.string({ unit, minLength: 1, maxLength: 8 }),
  key: fc.constantFrom('Enter', 'Shift+Enter'), finish: fc.constantFrom('newline', 'direct'),
};
// Every native source/range/viewport remains available. The retired axes drove
// the deleted compatibility command or demanded repairs to browser history.
export const newlineHistoryArbitrary = fc.oneof(
  fc.record(shape),
  fc.record({ ...shape, surface: fc.constant('quick'), remount: fc.constant(true) }),
  fc.record({ ...shape, begin: fc.constant('type') }),
  fc.record({ ...shape, begin: fc.constant('type'), textDelivery: fc.constant('keys'),
    continuation: fc.string({ unit: fc.constantFrom('a', 'z', ' '), minLength: 1, maxLength: 8 }) }),
);
export type NewlineHistory = Sample<typeof newlineHistoryArbitrary>;
export function newlineHistoryPlan(h: NewlineHistory) {
  const first: Intent = { kind: 'begin' in h ? 'type' : 'newline', key: h.key, at: 'range',
    a: [...h.prefix].length, b: [...h.prefix + h.picked + '\n'].length,
    text: 'begin' in h ? h.continuation : 'unused', activation: 'click' };
  const actions: Intent[] = [first, ...(h.finish === 'direct'
    ? [{ kind: 'type' as const, text: h.continuation, at: 'current' as const, a: 0, b: 0, activation: 'click' as const }] : [])];
  return { h, mixed: mixedPlan({ mobile: h.mobile, native: true, scene: 'prose',
    body: h.prefix + h.picked + '\n' + h.suffix, actions }) };
}
export const newlineHistoryModel = (p: ReturnType<typeof newlineHistoryPlan>, trace?: readonly Observation[]) => mixedModel(p.mixed, trace);
export function newlineHistoryStates(p: ReturnType<typeof newlineHistoryPlan>, trace?: readonly Observation[]) {
  const first = trace?.find(item => item.checkpoint === 'input0')?.value as MixedInput | undefined;
  const delivery = trace?.find(item => item.checkpoint === 'step0')?.value as { delivery?: {
    inputs?: { trusted?: boolean; target?: boolean; inputType?: string }[];
    beforeinput?: { trusted?: boolean; target?: boolean; inputType?: string; isComposing?: boolean; cancelable?: boolean }[];
    remount?: { sameNode?: boolean };
  } } | undefined;
  const receipt = delivery?.delivery;
  const offered = receipt?.beforeinput?.some(event => event.trusted && event.target && event.inputType === 'insertText'
    && (!('textDelivery' in p.h) || (!event.isComposing && event.cancelable)));
  const typed = trace === undefined || offered || (!('textDelivery' in p.h)
    && receipt?.inputs?.some(event => event.trusted && event.target && (event.inputType === 'insertText' || event.inputType === 'insertCompositionText')));
  const kind = 'begin' in p.h ? 'type' : 'newline';
  return [p.h.surface, p.h.mobile ? 'mobile' : 'desktop', 'save-after:' + p.h.finish,
    ...('remount' in p.h && (trace === undefined || receipt?.remount?.sameNode === false) ? ['reopened-quick-edit'] : []),
    ...('textDelivery' in p.h && typed ? ['native-text-keys'] : []),
    ...((trace === undefined || first?.action?.kind === kind) && (kind !== 'type' || typed)
      ? [kind === 'newline' ? p.h.key : 'native-text', p.h.suffix ? 'interior-selection' : 'terminal-LF-selection'] : [])];
}
const base: NewlineHistory = { surface: 'editor', mobile: false, prefix: '', picked: '\n', suffix: '',
  continuation: 'z', key: 'Enter', finish: 'newline' };
export const newlineHistoryCases: Record<string, NewlineHistory> = {};
for (const surface of ['composer', 'editor', 'quick'] as const) for (const key of ['Enter', 'Shift+Enter'] as const) {
  const h = { ...base, surface, key, mobile: key === 'Shift+Enter' };
  newlineHistoryCases[`${surface}-${key}-terminal`] = h;
  newlineHistoryCases[`${surface}-${key}-immediate`] = h;
  newlineHistoryCases[`${surface}-${key}-prose`] = { ...h, prefix: 'a ', picked: 'α😀' };
  newlineHistoryCases[`${surface}-${key}-direct`] = { ...h, finish: 'direct' };
}
newlineHistoryCases.interior = { ...base, suffix: 'z' };
newlineHistoryCases.whitespace = { ...base, prefix: 'a', picked: ' \t\n' };
for (const key of ['Enter', 'Shift+Enter'] as const) for (const picked of ['\n', 'α😀'])
  newlineHistoryCases[`reopen-quick-${key}-${picked === '\n' ? 'terminal' : 'unicode'}`] = { ...base, surface: 'quick', key, picked, remount: true };
for (const surface of ['composer', 'editor', 'quick'] as const) {
  for (const picked of ['\n', 'α😀'])
    newlineHistoryCases[`type-terminal-${surface}-${picked === '\n' ? 'empty-lines' : 'unicode'}`] = { ...base, surface, picked, begin: 'type' };
  newlineHistoryCases[`key-text-${surface}-unicode`] = { ...base, surface, picked: 'α😀', begin: 'type', textDelivery: 'keys' };
  newlineHistoryCases[`key-word-${surface}`] = { ...base, surface, picked: 'z', continuation: 'aa', begin: 'type', textDelivery: 'keys', finish: 'direct' };
  newlineHistoryCases[`type-context-${surface}`] = { ...base, surface, prefix: 'a ', picked: 'α😀', begin: 'type', finish: 'direct' };
}
export const newlineHistoryExclusion = { ...base, picked: '' };
if (newlineHistoryArbitrary.canShrinkWithoutContext(newlineHistoryExclusion)) throw new Error('Native input grammar admitted an empty selected body');
