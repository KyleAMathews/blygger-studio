/**
 * This oracle owns breakEdit and indentEdit's typed valid-input contract at
 * return: arbitrary source and ordered in-range UTF-16 offsets never throw.
 * A list edit may decline; any returned edit must be usable by the textarea.
 *
 * breakEdit('\0x', 1, 2) // → a usable edit
 * indentEdit('\0\n    - x', 9, 9, true) // → a usable edit or a decline
 *
 * For every valid source/selection pair, line breaks return a usable edit and
 * list indentation/outdent return either a usable edit or null, without error.
 * Authority: the entry points' typed contracts and decision by Kyle Mathews
 * (GitHub KyleAMathews), 2026-11-18: valid-input/no-throw formatting laws.
 *
 * Source partitions generate ordered offsets by construction, including offsets
 * between surrogate halves; negative, reversed and past-end offsets are the
 * nearby invalid geometry. The model needs only the return/decline allowance.
 * The driver records each real return; the check requires the break edit and
 * permits null only for list calls, then checks all returned range bounds,
 * rather than predicting whether arbitrary source is valid list syntax.
 * Semantic formatting is checked in the dedicated list and line-break oracles.
 *
 * Bounds are 32 UTF-16 units per source partition. This contract does not claim
 * correct Markdown rendering for arbitrary source or emulate browser behavior.
 */
import { differs, oracleProperty, pass, type Observation } from '@tanstack/oracles';
import fc from 'fast-check';
import { browserCall } from './editor-oracles/browser-driver-oracle.ts';
import { usableEdit } from './editor-oracles/document-oracle.ts';
const unit = fc.integer({ min: 0, max: 65535 }).map(n => String.fromCharCode(n), s => { if (typeof s !== 'string' || s.length !== 1) throw new Error('Expected UTF-16 unit'); return s.charCodeAt(0); });
const text = fc.string({ unit, maxLength: 32 });
const arbitrary = fc.record({ prefix: text, picked: text, suffix: text });
type History = { prefix: string; picked: string; suffix: string };
const cases: Record<string, History> = { empty: { prefix: '', picked: '', suffix: '' }, context: { prefix: '\0\n    - ', picked: 'x', suffix: '' }, surrogate: { prefix: '\ud83d', picked: '\ude00', suffix: '\r' }, selected: { prefix: 'a', picked: 'b\nc', suffix: 'd' } };
const states = (h: History) => [h.picked ? 'selected' : 'caret', ...(!h.prefix ? ['documentStart'] : []), ...(!h.suffix ? ['documentEnd'] : []), ...(h.prefix.includes('\0') ? ['controlContext'] : [])];
const at = (trace: readonly Observation[], name: string) => trace.find(o => o.checkpoint === name)?.value;
oracleProperty({
  id: 'editor-structure-valid-input', owns: ['src/ui/format-shortcuts.ts#breakEdit', 'src/ui/format-shortcuts.ts#indentEdit'],
  law: { statement: 'For every string and valid ordered UTF-16 selection offsets, structural formatting returns a usable edit or an allowed list decline without throwing.', authority: 'src/ui/format-shortcuts.ts public function types; decision by Kyle Mathews (GitHub KyleAMathews), 2026-11-18: valid-input/no-throw formatting laws.', limits: '32 UTF-16 units per partition, in-range integer offsets. List null is valid; arbitrary-source rendering is not judged here.' },
  histories: { arbitrary, runs: 100, fixedSeeds: [20261118], states: [...new Set(Object.values(cases).flatMap(states))], constructed: Object.entries(cases).map(([name, h]) => ({ name, enters: states(h), build: () => h })) },
  resolve: h => ({ h, text: h.prefix + h.picked + h.suffix, from: h.prefix.length, to: h.prefix.length + h.picked.length }),
  model: () => ({ usable: true, errors: [] }), reached: p => states(p.h),
  driver: async (p, observe) => {
    // Preserve the public returns: a mandatory break result must not disappear
    // into the same decline allowance as either list operation.
    observe('result', [await browserCall('breakEdit', [p.text, p.from, p.to]), await browserCall('indentEdit', [p.text, p.from, p.to, false]), await browserCall('indentEdit', [p.text, p.from, p.to, true])]);
  },
  check: (p, trace, expected) => {
    const responses = at(trace, 'result') as { value?: Parameters<typeof usableEdit>[1] | null; error?: unknown }[] | undefined;
    const actual = responses && {
      usable: responses.length === 3 && responses.every((response, index) => response.value === null
        ? index > 0
        : response.value !== undefined && usableEdit(p, response.value)),
      errors: responses.filter(response => response.error).map(response => response.error),
    };
    return differs('result', 'valid structural edit', actual, expected) ?? pass;
  },
  calibrations: [
    { name: 'invalid range', law: 'valid structural edit', history: { constructed: 'empty' }, corrupt: replaceBreakReturn({ from: -1, to: 0, insert: '', start: 0, end: 0 }) },
    { name: 'missing mandatory break return', law: 'valid structural edit', history: { constructed: 'context' }, corrupt: replaceBreakReturn(null) },
  ],
});

// Keep list returns intact so this calibration targets only the mandatory break.
function replaceBreakReturn(value: unknown) {
  return (trace: readonly Observation[]) => trace.map(observation => observation.checkpoint === 'result'
    ? { ...observation, value: [{ value }, ...(observation.value as unknown[]).slice(1)] } : observation);
}
