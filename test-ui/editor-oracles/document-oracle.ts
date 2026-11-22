/** Shared source geometry and observations; no formatting decisions live here. */
import { differs, pass, type Observation } from '@tanstack/oracles';
import fc from 'fast-check';

export type Sample<A> = A extends fc.Arbitrary<infer Value> ? Value : never;
export type Edit = { from: number; to: number; insert: string; start: number; end: number };
export type SourceRange = { text: string; from: number; to: number };
export type Observe = (checkpoint: string, value: unknown) => void;
export const unit = fc.integer({ min: 0, max: 0xffff }).map(
  n => String.fromCharCode(n),
  s => { if (typeof s !== 'string' || s.length !== 1) throw new Error('Expected one UTF-16 unit'); return s.charCodeAt(0); },
);

export const apply = (text: string, edit: Edit) => text.slice(0, edit.from) + edit.insert + text.slice(edit.to);
export function usableEdit(p: SourceRange, edit: Edit): boolean {
  if (!edit || typeof edit !== 'object' || typeof edit.insert !== 'string') return false;
  const output = apply(p.text, edit);
  return typeof edit.insert === 'string' && [edit.from, edit.to, edit.start, edit.end].every(Number.isInteger) &&
    0 <= edit.from && edit.from <= edit.to && edit.to <= p.text.length &&
    0 <= edit.start && edit.start <= edit.end && edit.end <= output.length;
}
// Replacement spans can differ while preserving the source and final selection.
// Commands with an explicit whole-line replacement promise also observe the edit.
export const result = (p: SourceRange, edit: Edit) => usableEdit(p, edit)
  ? { output: apply(p.text, edit), selection: [edit.start, edit.end], usable: true }
  : { malformedEdit: edit, usable: false };
export const traceValue = (trace: readonly Observation[], name: string) => trace.find(o => o.checkpoint === name)?.value;
export function driver(p: SourceRange, make: () => Edit, observe: Observe) {
  try { observe('result', result(p, make())); } catch (error) { observe('error', error); }
}
export function check(trace: readonly Observation[], expected: unknown, law: string) {
  return differs('result', law, traceValue(trace, 'result'), expected) ?? differs('error', law, traceValue(trace, 'error'), undefined) ?? pass;
}
export const corruptResult = (trace: readonly Observation[]) => trace.map(o => o.checkpoint === 'result' ? { ...o, value: null } : o);
export const histories = <T>(arbitrary: fc.Arbitrary<T>, examples: Record<string, T>, reached: (h: T) => string[]) => ({
  arbitrary, runs: 100, fixedSeeds: [20261118],
  states: [...new Set(Object.values(examples).flatMap(reached))],
  constructed: Object.entries(examples).map(([name, h]) => ({ name, enters: reached(h), build: () => h })),
});
