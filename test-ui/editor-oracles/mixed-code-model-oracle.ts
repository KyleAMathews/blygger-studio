/** A free-width literal-code receiver after an arbitrary mixed prefix. */
import fc from 'fast-check';
import { materialize, mixedArbitrary, mixedCases, mixedModel, mixedPlan, mixedPreview, mixedStates, publicState, type Mixed } from './mixed-model-oracle.ts';
import { traceValue, type Sample } from './document-oracle.ts';
import type { Observation } from '@tanstack/oracles';
export const mixedCodeArbitrary = fc.record({ prefix: mixedArbitrary, width: fc.integer({ min: 3, max: 12 }),
  payload: fc.string({ unit: fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz01234 `[]()\\*$', 'α', '😀', '\n'), maxLength: 24 }), activation: fc.constantFrom('click', 'Enter', 'Space'),
});
export type MixedCode = Sample<typeof mixedCodeArbitrary>;
const prefix = (scene: Mixed['scene'], mobile: boolean): Mixed => ({ mobile, native: true, scene, body: 'α😀 literal', actions: [{ kind: 'bold', at: 'all', a: 0, b: 0, text: 'body', activation: 'click' }, { kind: 'break', at: 'end', a: 0, b: 0, text: 'body', activation: 'click' }] });
export const mixedCodeCases: Record<string, MixedCode> = {};
for (const mobile of [false, true]) for (const activation of ['click', 'Enter', 'Space'] as const) mixedCodeCases[`${activation}-${mobile}`] = { prefix: prefix('code', mobile), width: 6, payload: 'a\n```\nb', activation };
mixedCodeCases.listPrefix = { prefix: mixedCases['structure-false-true']!, width: 3, payload: 'x', activation: 'click' };
for (const native of [false, true]) for (const width of [3, 12]) {
  mixedCodeCases[`collision-native-${native}-width-${width}`] = { prefix: { ...prefix('code', false), native }, width, payload: 'a\n```\nb', activation: 'click' };
}
export function mixedCodePlan(h: MixedCode) { return { ...h, prefix: mixedPlan(h.prefix), suffix: '\n' + '`'.repeat(h.width) + h.payload + '.' }; }
// Terminate directly at a free indentation so the literal receiver must accept
// the exact chosen source, including nonminimal or tab-containing prefixes.
for (const mobile of [false, true]) for (const native of [false, true]) for (const padding of ['space', 'tab']) {
  const source = mixedCases[`padding-${padding}-${mobile}-${native}`]!;
  mixedCodeCases[`padding-${padding}-${mobile}-${native}`] = { prefix: { ...source, actions: source.actions.slice(0, 2) }, width: 6, payload: 'a\n```\nb', activation: 'click' };
}
export function mixedCodeModel(p: ReturnType<typeof mixedCodePlan>, trace?: readonly Observation[]) {
  const prefix = mixedModel(p.prefix, trace);
  const preInput = trace === undefined ? mixedPreview(p.prefix).outputs.at(-1) : publicState(traceValue(trace, 'collisionPreInput'));
  const chosen = prefix.final.flatMap(rule => { const state = materialize(rule, preInput); return state ? [state] : []; })[0];
  const input = chosen ? chosen.value + p.suffix : undefined;
  return { prefix, preInputAllowed: !!chosen, input,
    selection: input === undefined ? undefined : { text: input, bodyStart: 0, bodyEnd: input.length, afterNewline: true, beforeNewline: true, focused: true },
    rendered: input === undefined ? undefined : { blocks: [input + '\n'], children: 1 } };
}
export const mixedCodeStates = (p: ReturnType<typeof mixedCodePlan>, trace?: readonly Observation[]) => [p.prefix.h.mobile ? 'mobile' : 'desktop', p.activation, 'selectedFenceCollision',
  p.prefix.h.native ? 'nativeCollision' : 'fallbackCollision', ...(p.width === 3 ? ['minimumCollisionWidth'] : p.width === 12 ? ['maximumCollisionWidth'] : []),
  ...(p.prefix.h.scene === 'list' ? ['listContextPrefix'] : []), ...(mixedStates(p.prefix, trace).includes('undo') ? ['undoPrefix'] : []),
  ...(mixedModel(p.prefix, trace).final.some(rule => rule.kind === 'indent') ? ['freeIndentCollision'] : [])];
