/** Segment recipes avoid reproducing the held-region scanner or edit rebasing. */
import fc from 'fast-check';
import { mixedModel, mixedPlan } from './mixed-model-oracle.ts';
import type { Observation } from '@tanstack/oracles';
import type { Sample } from './document-oracle.ts';

const word = fc.string({ unit: fc.constantFrom('x', 'z', 'α', '😀'), minLength: 1, maxLength: 8 });
const heldNewlineShape = {
  left: word, held: word, mode: fc.constantFrom('hidden', 'rejected', 'edge'),
  key: fc.constantFrom('Enter', 'Shift+Enter'), mobile: fc.boolean(),
};
// A typed recipe offers one key: after a refused key the browser may choose
// a different caret, so later keys would be separate offered replacements.
export const heldNewlineArbitrary = fc.oneof(fc.record(heldNewlineShape),
  fc.record({ ...heldNewlineShape, text: fc.constantFrom('x', 'z') }));
export type HeldNewline = Sample<typeof heldNewlineArbitrary>;
export function heldNewlinePlan(h: HeldNewline) {
  const held = '\n\n[held]: # ' + h.held;
  const end = h.left.length + held.length;
  const full = h.left + held + (h.mode === 'hidden' ? '\n\n' : '\n\nz\n');
  const shown = h.mode === 'hidden' ? h.left + '\n\n' : full;
  // Refusal includes one complete final code point of the held paragraph;
  // the neighbor starts exactly at its edge. Neither splits a grapheme.
  const from = h.mode === 'hidden' ? 0 : h.mode === 'edge' ? end : end - [...h.held].at(-1)!.length;
  const mixed = mixedPlan({ mobile: h.mobile, native: true, scene: 'prose', body: shown, actions: [
    { kind: 'text' in h ? 'type' : 'newline', key: h.key, at: 'range', a: [...shown.slice(0, from)].length,
      b: [...shown].length, text: 'text' in h ? h.text : 'unused', activation: 'click' },
  ] });
  return { h, full, shown, from, mixed };
}
export type HeldNewlinePlan = ReturnType<typeof heldNewlinePlan>;
export function heldNewlineModel(p: HeldNewlinePlan, trace?: readonly Observation[]) {
  // docs/extensions.md: replacements surrounding a cut put its region after
  // the replacement; overlap refuses; a region's exact edge accepts.
  const held = '\n\n[held]: # ' + p.h.held;
  const replacement = 'text' in p.h ? p.h.text : '\n';
  return {
    history: mixedModel(p.mixed, trace),
    full: p.h.mode === 'hidden' ? replacement + held : p.h.mode === 'edge' ? p.h.left + held + replacement : p.full,
    notice: p.h.mode === 'hidden' ? 'hidden' : 'shown',
    refused: p.h.mode === 'rejected',
  };
}
export function heldNewlineStates(p: HeldNewlinePlan) {
  return [p.h.mode, 'text' in p.h ? 'typed' : p.h.key, p.h.mobile ? 'mobile' : 'desktop'];
}
export const heldNewlineCases: Record<string, HeldNewline> = {};
for (const mode of ['hidden', 'rejected', 'edge'] as const)
  for (const key of ['Enter', 'Shift+Enter'] as const) for (const mobile of [false, true])
    heldNewlineCases[`${mode}-${key}-${mobile}`] = { left: 'x', held: 'z', mode, key, mobile };
for (const mode of ['hidden', 'rejected', 'edge'] as const)
  for (const key of ['Enter', 'Shift+Enter'] as const)
    heldNewlineCases[`${mode}-${key}-unicode`] = { left: 'α😀', held: 'z😀', mode, key, mobile: key === 'Shift+Enter' };
for (const mode of ['hidden', 'rejected', 'edge'] as const)
  heldNewlineCases[`${mode}-typed`] = { left: 'α😀', held: 'z😀', mode, key: 'Enter', mobile: false, text: 'x' };
// An empty held word loses the selected character that distinguishes overlap
// from the allowed edge; it is not in this bounded segment grammar.
if (heldNewlineArbitrary.canShrinkWithoutContext({ ...heldNewlineCases['hidden-Enter-false'], held: '' }))
  throw new Error('Held newline grammar admitted an empty held word');
