/** Input-only models for native focus, toolbar delivery and formatter gates. */
import fc from 'fast-check';
import { apply, type Sample } from './document-oracle.ts';
import { formulaEdit } from './inline-model-oracle.ts';
import { item, moveRows } from './list-model-oracle.ts';
import { model as codeModel, resolve as codePlan } from './block-model-oracle.ts';

const body = fc.string({ unit: fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,;', 'α', '😀'), minLength: 1, maxLength: 24 });
export const toolbarInteractionArbitrary = fc.record({ tool: fc.constantFrom('indent', 'outdent', 'break', 'code', 'formula'),
  activation: fc.constantFrom('click', 'Enter', 'Space'), mobile: fc.boolean(), body,
  selection: fc.constantFrom('all', 'partial', 'caret'), a: fc.nat(50), b: fc.nat(50) });
export type ToolbarInteraction = Sample<typeof toolbarInteractionArbitrary>;
const toolbarBase: ToolbarInteraction = { tool: 'indent', activation: 'Enter', mobile: false, body: 'α😀 prose', selection: 'all', a: 1, b: 4 };
export const toolbarInteractionCases: Record<string, ToolbarInteraction> = {};
for (const tool of ['indent', 'outdent', 'break', 'code', 'formula'] as const) for (const activation of ['click', 'Enter', 'Space'] as const) for (const mobile of [false, true]) {
  toolbarInteractionCases[`${tool}-${activation}-${mobile}`] = { ...toolbarBase, tool, activation, mobile, body: 'alpha😀' };
}
for (const selection of ['partial', 'caret'] as const) toolbarInteractionCases[selection] = { ...toolbarBase, selection, body: 'alpha😀' };
export function toolbarInteractionPlan(h: ToolbarInteraction) {
  const list = h.tool === 'indent' || h.tool === 'outdent';
  const prefix = list ? '- parent\n' + (h.tool === 'outdent' ? '    ' : '') + '- ' : 'before ';
  const suffix = list ? '' : ' after';
  const edges = [0]; for (const c of h.body) edges.push(edges.at(-1)! + c.length);
  const a = edges[h.a % edges.length]!, b = edges[h.b % edges.length]!;
  const range = h.selection === 'all' ? [0, h.body.length] : h.selection === 'caret' ? [a, a] : [Math.min(a, b), Math.max(a, b)];
  return { h, text: prefix + h.body + suffix, from: prefix.length + range[0]!, to: prefix.length + range[1]!, prefix };
}
// The source/range laws are the same independent projections used by direct
// command properties; activation changes the receiver, never the expected edit.
export function toolbarInteractionModel(p: ReturnType<typeof toolbarInteractionPlan>) {
  const { text, from, to, h } = p;
  let edit;
  switch (h.tool) {
    case 'indent': case 'outdent': edit = moveRows({ text, from, to, offsets: [9], rows: [item('-', h.tool === 'outdent' ? '    ' : '', h.body)], parent: item('-', '', 'parent'), out: h.tool === 'outdent' }).edit; break;
    case 'formula': edit = formulaEdit({ text, from, to, h: { prefix: text.slice(0, from), picked: text.slice(from, to), suffix: text.slice(to) } }); break;
    case 'break': edit = { from, to, insert: '\\\n', start: from + 2, end: from + 2 }; break;
    case 'code': {
      const expected = codeModel(codePlan({ before: text.slice(0, from), picked: text.slice(from, to), after: text.slice(to) }));
      const start = expected.context.beforeBlock.length + 4;
      return { value: expected.defaultSource, selection: [start, start + to - from], focused: true };
    }
  }
  return { value: edit ? apply(text, edit) : text, selection: edit ? [edit.start, edit.end] : [from, to], focused: true };
}
export const toolbarInteractionStates = (p: ReturnType<typeof toolbarInteractionPlan>) => [p.h.tool, p.h.activation, p.h.mobile ? 'mobile' : 'desktop', p.from === p.to ? 'caret' : 'selection', `${p.h.tool}:${p.h.activation}`];

export const pickerInteractionArbitrary = fc.record({ mobile: fc.boolean(), key: fc.constantFrom('Tab', 'Shift+Enter'), body });
export type PickerInteraction = Sample<typeof pickerInteractionArbitrary>;
export const pickerInteractionCases: Record<string, PickerInteraction> = {};
for (const mobile of [false, true]) for (const key of ['Tab', 'Shift+Enter'] as const) pickerInteractionCases[`${key}-${mobile}`] = { mobile, key, body: 'alpha😀' };
export const pickerInteractionPlan = (h: PickerInteraction) => ({ h, text: '- ' + h.body + '\n- @al', handle: 'alice' });
export const pickerInteractionStates = (p: ReturnType<typeof pickerInteractionPlan>) => [p.h.key, p.h.mobile ? 'mobile' : 'desktop', 'actualPickerGate'];

export const readonlyInteractionArbitrary = fc.record({ mobile: fc.boolean(), key: fc.constantFrom('ControlOrMeta+b', 'ControlOrMeta+i', 'ControlOrMeta+k', 'Tab', 'Shift+Tab', 'Shift+Enter'), body });
export type ReadonlyInteraction = Sample<typeof readonlyInteractionArbitrary>;
export const readonlyInteractionCases: Record<string, ReadonlyInteraction> = {};
for (const mobile of [false, true]) for (const key of ['ControlOrMeta+b', 'ControlOrMeta+i', 'ControlOrMeta+k', 'Tab', 'Shift+Tab', 'Shift+Enter'] as const) readonlyInteractionCases[`${key}-${mobile}`] = { mobile, key, body: 'alpha😀' };
export const readonlyInteractionPlan = (h: ReadonlyInteraction) => ({ h, text: '- parent\n    - ' + h.body, from: 15, to: 15 + h.body.length });
export const readonlyInteractionStates = (p: ReturnType<typeof readonlyInteractionPlan>) => [p.h.key, p.h.mobile ? 'mobile' : 'desktop', 'readOnly'];

export const traversalInteractionArbitrary = fc.record({ mobile: fc.boolean(), reverse: fc.boolean(), body });
export type TraversalInteraction = Sample<typeof traversalInteractionArbitrary>;
export const traversalInteractionCases: Record<string, TraversalInteraction> = {};
for (const mobile of [false, true]) for (const reverse of [false, true]) traversalInteractionCases[`${reverse}-${mobile}`] = { mobile, reverse, body: 'alpha😀' };
export const traversalInteractionPlan = (h: TraversalInteraction) => ({ h, text: 'Ordinary ' + h.body, from: 2, to: 2 });
export const traversalInteractionStates = (p: ReturnType<typeof traversalInteractionPlan>) => [p.h.reverse ? 'reverse' : 'forward', p.h.mobile ? 'mobile' : 'desktop'];

export const scrollInteractionArbitrary = fc.record({ body, insert: body, native: fc.boolean(), offset: fc.integer({ min: 100, max: 800 }) });
export type ScrollInteraction = Sample<typeof scrollInteractionArbitrary>;
export const scrollInteractionCases: Record<string, ScrollInteraction> = { native: { body: 'alpha😀', insert: 'beta', native: true, offset: 400 }, fallback: { body: 'alpha😀', insert: 'beta', native: false, offset: 400 } };
export const scrollInteractionPlan = (h: ScrollInteraction) => ({ h, initial: 'before ' + h.body + ' after', edit: { from: 7, to: 7 + h.body.length, insert: h.insert, start: 7, end: 7 + h.insert.length } });
export const scrollInteractionStates = (p: ReturnType<typeof scrollInteractionPlan>) => [p.h.native ? 'native' : 'fallback', 'belowFold'];
