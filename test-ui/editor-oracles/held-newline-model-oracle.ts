/** Segment recipes avoid reproducing the held-region scanner or edit rebasing. */
import fc from 'fast-check';
import type { Sample } from './document-oracle.ts';

const word = fc.string({ unit: fc.constantFrom('x', 'z', 'α', '😀'), minLength: 1, maxLength: 8 });
const heldNewlineShape = {
  left: word, held: word, mode: fc.constantFrom('hidden', 'rejected', 'edge'),
  key: fc.constantFrom('Enter', 'Shift+Enter'), mobile: fc.boolean(),
};
const boundary = fc.constantFrom('terminal', 'caret-tail', 'caret-start', 'caret-end', 'inside-range', 'outside-range', 'suffix-range', 'caret-before', 'caret-after');
const layout = fc.constantFrom('ordinary', 'empty', 'reversed', 'outside', 'overlap', 'touching');
const shownShape = { left: word, held: word, mode: fc.constant('shown'), boundary, layout,
  key: fc.constantFrom('Enter', 'Shift+Enter', 'Backspace', 'Delete', 'ControlOrMeta+x'), mobile: fc.boolean() };
// Keep the legacy branches: saved replay histories still have the same shape.
// A single typed key is deliberate: later keys after a refusal offer a new caret.
export const heldNewlineArbitrary = fc.oneof(fc.record(heldNewlineShape),
  fc.record({ ...heldNewlineShape, text: fc.constantFrom('x', 'z') }),
  fc.record(shownShape), fc.record({ ...shownShape, text: fc.constantFrom('x', 'z') }));
export type HeldNewline = Sample<typeof heldNewlineArbitrary>;
export function heldNewlinePlan(h: HeldNewline) {
  const held = '\n\n[held]: # ' + h.held;
  const start = h.left.length, end = start + held.length;
  const full = h.left + held + (h.mode === 'hidden' ? '\n\n' : '\n\nz\n');
  const shown = h.mode === 'hidden' ? h.left + '\n\n' : full;
  const tail = end - [...h.held].at(-1)!.length;
  const ranges: Record<Sample<typeof boundary>, [number, number]> = {
    terminal: [tail, full.length], 'caret-tail': [tail, tail], 'caret-start': [start, start],
    'caret-end': [end, end], 'inside-range': [tail, end], 'outside-range': [end + 1, end + 3], 'suffix-range': [end, full.length],
    'caret-before': [start - [...h.left].at(-1)!.length, start - [...h.left].at(-1)!.length],
    'caret-after': [end + 2, end + 2],
  };
  const range: [number, number] = h.mode === 'shown' ? ranges[h.boundary]
    : [h.mode === 'hidden' ? 0 : h.mode === 'edge' ? end : tail, shown.length];
  return { h, full, shown, held, protected: [start, end] as const, range,
    layout: h.mode === 'shown' ? h.layout : 'ordinary' as const,
    requested: 'text' in h ? h.text : h.key };
}
export type HeldNewlinePlan = ReturnType<typeof heldNewlinePlan>;
export function heldNewlineModel(p: HeldNewlinePlan) {
  // One plain replacement predicts a native key. Safe segment code points
  // make one Backspace/Delete independent of platform word/IME conventions.
  let [from, to] = p.range;
  let inserted = '';
  if ('text' in p.h) inserted = p.h.text;
  else switch (p.h.key) {
    case 'Enter': case 'Shift+Enter': inserted = '\n'; break;
    case 'Backspace': if (from === to) from -= [...p.shown.slice(0, from)].at(-1)?.length ?? 0; break;
    case 'Delete': if (from === to) to += [...p.shown.slice(to)][0]?.length ?? 0; break;
    case 'ControlOrMeta+x': break;
  }
  // The approved offered-range rule judges intent, not a diff inferred from
  // matching resulting bytes. Layout fixtures all denote this same interval.
  const [start, end] = p.protected;
  const removes = from < to && from < end && to > start;
  const inserts = inserted.length > 0 && from > start && from < end;
  const refused = p.h.mode !== 'hidden' && (removes || inserts);
  const value = refused ? p.shown : p.shown.slice(0, from) + inserted + p.shown.slice(to);
  const label = p.layout === 'overlap' || p.layout === 'touching' ? 'held paragraph, annotation' : 'held paragraph';
  return { refused, value, selection: [from + inserted.length, from + inserted.length],
    full: p.h.mode === 'hidden' ? value + p.held : value,
    notice: p.h.mode === 'hidden' ? 'hidden' : 'shown',
    messages: refused ? [`The ${label} is read-only here.`] : [] };
}
export function heldNewlineStates(p: HeldNewlinePlan) {
  return [p.h.mode, 'text' in p.h ? 'typed' : p.h.key, p.h.mobile ? 'mobile' : 'desktop',
    ...(p.h.mode === 'shown' ? [p.h.boundary, 'layout-' + p.layout] : []),
    ...('text' in p.h && p.h.held.endsWith(p.h.text) ? ['typed-matching-held-tail'] : [])];
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
// Matching replacement bytes must not disguise a selected protected character
// as an exact-edge deletion. The same text remains legal when hidden or at the
// shown edge, so those neighbors distinguish protection from a typing ban.
for (const mode of ['hidden', 'rejected', 'edge'] as const)
  for (const text of ['x', 'z'] as const) for (const mobile of [false, true])
    heldNewlineCases[`${mode}-matching-tail-${text}-${mobile}`] = { left: 'x', held: text, mode, key: 'Enter', mobile, text };
// Each offered boundary and raw layout has a witness; cross products are
// reserved for decisions that interact (edge × deletion, label × overlap).
for (const boundary of ['terminal', 'caret-tail', 'caret-start', 'caret-end', 'inside-range', 'outside-range', 'suffix-range', 'caret-before', 'caret-after'] as const)
  for (const key of ['Enter', 'Shift+Enter', 'Backspace', 'Delete', 'ControlOrMeta+x'] as const)
    heldNewlineCases[`shown-${boundary}-${key}`] = { left: 'α😀', held: 'z😀', mode: 'shown', boundary, layout: 'ordinary', key, mobile: key === 'Shift+Enter' };
for (const layout of ['ordinary', 'empty', 'reversed', 'outside', 'overlap', 'touching'] as const)
  for (const boundary of ['caret-tail', 'outside-range', 'inside-range', 'suffix-range'] as const)
    heldNewlineCases[`shown-${layout}-${boundary}-typed`] = { left: 'x', held: 'x', mode: 'shown', boundary, layout, key: 'Enter', text: 'x', mobile: false };
for (const layout of ['overlap', 'touching'] as const)
  heldNewlineCases[`shown-${layout}-delete`] = { left: 'x', held: 'x', mode: 'shown', boundary: 'inside-range', layout, key: 'Delete', mobile: false };
// An empty word erases the protected-tail boundary this segment grammar owns.
if (heldNewlineArbitrary.canShrinkWithoutContext({ ...heldNewlineCases['hidden-Enter-false'], held: '' }))
  throw new Error('Held newline grammar admitted an empty held word');
