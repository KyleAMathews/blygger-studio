/**
 * This oracle owns the code-block button's preservation of selected source,
 * surrounding prose, and the selection returned by codeBlockEdit. It checks
 * src/ui/format-shortcuts.ts#codeBlockEdit when an edit returns and when its
 * result is carried as renderer HTML in the fragment-preview JSON response.
 * The app oracle separately observes the actual thread-preview DOM.
 *
 * codeBlockEdit('a\n```\nb', 0, 7) // → one code block containing all seven characters
 * codeBlockEdit('x\n', 0, 2)      // → selects x inside the block
 * codeBlockEdit('', 0, 0)         // → a caret inside an empty code block
 *
 * A fence in the selected source is content, so a fixed three-backtick wrapper
 * cannot represent every selection. The selected source is the literal body;
 * prose on each side is context. The returned selection covers that body,
 * independently of how the formatter chooses a fence.
 *
 * For every selection in surrounding prose, the resulting block contains the
 * selection literally, including fence-like lines. The toolbar promises “Put
 * the selected lines in a code block” (authoring.tsx, code button).
 * For every valid selection, surrounding source stays unchanged, existing
 * newlines are reused, and only the newlines needed for a blank-line boundary
 * are added (the codeBlockEdit comment and code-block examples; decision by
 * Kyle Mathews, GitHub KyleAMathews, 2026-11-18).
 * For every valid selection, its returned selection covers the original source
 * without one final LF, or is a caret inside the empty block (the examples in
 * test-ui/format-shortcuts.test.ts at commit 28b0c8d642a87e5810ad6eabd95c2d1714c53396, “the code block button”).
 * For every string and valid selection offsets, the command returns a usable
 * edit without throwing (its typed editor interface).
 *
 * The model uses the selected source, ordinary HTML escaping, and CommonMark's
 * CR/LF and NUL preprocessing. It does not construct a fence. Generated UTF-16
 * source includes controls and unpaired surrogates. Constructed histories reach
 * fence collisions, empty selections, newline endings, and every context edge.
 * Each law also rejects a planted wrong observation on a passing history.
 *
 * Evidence is bounded to 96 selected UTF-16 units and generated prose and newline boundaries on each
 * side. Existing Markdown containers, browser undo, and DOM event delivery are
 * outside this oracle; the formatter runs in Chromium and the fragment preview runs in its real Worker.
 */
import { differs, oracleProperty, pass, type Observation } from '@tanstack/oracles';
import fc from 'fast-check';
import MarkdownIt from 'markdown-it';
import { browserCall, browserPreview } from './editor-oracles/browser-driver-oracle.ts';
import { Plan, histories, model, reached, resolve } from './editor-oracles/block-model-oracle.ts';
import { unit, traceValue as value, usableEdit, type Edit, type Observe } from './editor-oracles/document-oracle.ts';


// The driver runs production once, retaining both the edit and what it renders.
// Markdown token positions locate block boundaries without predicting a fence.
const parser = new MarkdownIt();

async function driver(plan: Plan, observe: (checkpoint: string, value: unknown) => void) {
  const response = await browserCall('codeBlockEdit', [plan.text, plan.from, plan.to]);
  if (response.error) { observe('error', response.error); return; }
  const edit = response.value!;
  if (!usableEdit(plan, edit)) { observe('returned', false); return; }
  const output = plan.text.slice(0, edit.from) + edit.insert + plan.text.slice(edit.to);
  observe('returned', typeof edit.insert === 'string' &&
    [edit.from, edit.to, edit.start, edit.end].every(Number.isInteger) &&
    0 <= edit.from && edit.from <= edit.to && edit.to <= plan.text.length &&
    0 <= edit.start && edit.start <= edit.end && edit.end <= output.length);
  observe('html', await browserPreview(output));
  observe('defaultSource', plan.picked.includes('`') ? undefined : output);
  const fence = parser.parse(output, {}).find(token => token.type === 'fence');
  const lines = output.replace(/\r\n?/g, '\n').split('\n');
  observe('context', {
    before: output.slice(0, plan.before.length),
    after: output.slice(output.length - plan.after.length),
    beforeBlock: fence?.map && lines.slice(0, fence.map[0]).join('\n') + (fence.map[0] ? '\n' : ''),
    afterBlock: fence?.map && (fence.map[1] < lines.length ? '\n' : '') + lines.slice(fence.map[1]).join('\n'),
  });
  // Markdown maps normalized lines; recover their raw UTF-16 offsets so CRLF,
  // lone CR, and surrogates cannot move the selection outside the actual body.
  const offsets = [0];
  for (const match of output.matchAll(/\r\n?|\n/g)) offsets.push(match.index + match[0].length);
  const bodyAt = fence?.map ? offsets[fence.map[0] + 1] : undefined;
  observe('selection', {
    text: output.slice(edit.start, edit.end),
    afterNewline: output[edit.start - 1] === '\n',
    beforeNewline: output[edit.end] === '\n',
    bodyStart: bodyAt === undefined ? null : edit.start - bodyAt,
    bodyEnd: bodyAt === undefined ? null : edit.end - bodyAt,
  });
}

const corrupt = (checkpoint: string, wrong: unknown) => (trace: readonly Observation[]) =>
  trace.map(item => item.checkpoint === checkpoint ? { ...item, value: wrong } : item);

// A missing or malformed edit is a public failure of the returns law. Record it
// before reading its geometry, so the check owns that failure and keeps its shape.
function recordReturn(plan: Plan, response: { value?: unknown; error?: { name: string; message: string } }, observe: Observe) {
  if (response.error) { observe('error', response.error); return; }
  const edit = response.value as Edit | null | undefined;
  const usable = !!edit && typeof edit === 'object' &&
    [edit.from, edit.to, edit.start, edit.end].every(Number.isInteger) && usableEdit(plan, edit);
  observe('returned', usable ? true : edit === undefined ? { missingEdit: true } : { malformedEdit: edit });
}

const limits = 'Up to 96 selected UTF-16 units, generated surrounding prose/newline boundaries; no existing Markdown containers, browser undo, or DOM events.';


oracleProperty({
  id: 'editor-code-block.literal',
  owns: ['src/ui/format-shortcuts.ts#codeBlockEdit'],
  law: {
    statement: 'For every selection in surrounding prose, the resulting block contains the selected text literally, including fence-like lines.',
    authority: 'src/ui/authoring.tsx, code button: “Put the selected lines in a code block, or start an empty one”.', limits,
  },
  histories, resolve, model, reached, driver,
  check: (_plan, trace, expected) => differs('html', 'literal contents', value(trace, 'html'), expected.html) ?? pass,
  calibrations: [{ name: 'lost code', law: 'literal contents', history: { constructed: 'plain' }, corrupt: corrupt('html', '') }],
});


oracleProperty({
  id: 'editor-code-block.context',
  owns: ['src/ui/format-shortcuts.ts#codeBlockEdit'],
  law: {
    statement: 'For every valid selection, surrounding source stays unchanged, existing newlines are reused, and only the newlines needed for a blank-line boundary are added.',
    authority: 'src/ui/format-shortcuts.ts, codeBlockEdit boundary comment; test-ui/format-shortcuts.test.ts at commit 28b0c8d642a87e5810ad6eabd95c2d1714c53396, code-block examples; decision by Kyle Mathews (GitHub KyleAMathews), 2026-11-18: enforce the existing spacing.', limits,
  },
  histories, resolve, model, reached, driver,
  check: (_plan, trace, expected) => differs('context', 'surrounding text', value(trace, 'context'), expected.context) ?? pass,
  calibrations: [{ name: 'lost prose', law: 'surrounding text', history: { constructed: 'plain' }, corrupt: corrupt('context', {}) }],
});


oracleProperty({
  id: 'editor-code-block.selection',
  owns: ['src/ui/format-shortcuts.ts#codeBlockEdit'],
  law: {
    statement: 'For every valid selection, the returned selection covers the original source without one final LF, or is a caret inside the empty block.',
    authority: 'test-ui/format-shortcuts.test.ts at commit 28b0c8d642a87e5810ad6eabd95c2d1714c53396, “the code block button”, including the empty selection and selected code ending with LF.', limits,
  },
  histories, resolve, model, reached, driver,
  check: (_plan, trace, expected) => differs('selection', 'selection', value(trace, 'selection'), expected.selection) ?? pass,
  calibrations: [{ name: 'lost selection', law: 'selection', history: { constructed: 'plain' }, corrupt: corrupt('selection', {}) }],
});


oracleProperty({
  id: 'editor-code-block.default-source',
  owns: ['src/ui/format-shortcuts.ts#codeBlockEdit'],
  law: {
    statement: 'For selections without backticks, preserve the established triple-backtick and LF source form, with the same body and minimal boundary padding.',
    authority: 'All six code-block source expectations in test-ui/format-shortcuts.test.ts at commit 28b0c8d642a87e5810ad6eabd95c2d1714c53396; loss-audit restoration requested by Kyle Mathews, 2026-11-18.', limits,
  },
  histories, resolve, model, reached, driver,
  check: (_plan, trace, expected) => differs('defaultSource', 'default source compatibility', value(trace, 'defaultSource'), expected.defaultSource) ?? pass,
  calibrations: [{ name: 'changed default wrapper', law: 'default source compatibility', history: { constructed: 'plain' }, corrupt: corrupt('defaultSource', '') }],
});


oracleProperty({
  id: 'editor-code-block.returns',
  owns: ['src/ui/format-shortcuts.ts#codeBlockEdit'],
  law: {
    statement: 'For every string and valid selection offsets, the command returns a usable edit without throwing.',
    authority: 'src/ui/format-shortcuts.ts, codeBlockEdit(text: string, from: number, to: number): FormatEdit, used directly by the editor toolbar.', limits,
  },
  histories: {
    arbitrary: fc.record({ before: fc.string({ unit, maxLength: 32 }), picked: fc.string({ unit, maxLength: 96 }), after: fc.string({ unit, maxLength: 32 }) }),
    runs: 100, fixedSeeds: [20261118], states: ['caret', 'selected', 'documentStart', 'controlContext'],
    constructed: [
      { name: 'plain', enters: ['selected'], build: () => ({ before: 'p', picked: 'x', after: 'q' }) },
      { name: 'empty', enters: ['caret', 'documentStart'], build: () => ({ before: '', picked: '', after: '' }) },
      { name: 'control context', enters: ['selected', 'controlContext'], build: () => ({ before: '\0', picked: '\ud800', after: '\udfff' }) },
    ],
  }, resolve, model: () => true,
  reached: p => [p.picked ? 'selected' : 'caret', ...(!p.before ? ['documentStart'] : []), ...(p.before.includes('\0') || p.after.includes('\0') ? ['controlContext'] : [])],
  driver: async (p, observe) => {
    const response = await browserCall('codeBlockEdit', [p.text, p.from, p.to]);
    recordReturn(p, response, observe);
  },
  check: (_plan, trace) => differs('returned', 'valid input returns', value(trace, 'returned'), true) ??
    differs('error', 'valid input returns', value(trace, 'error'), undefined) ?? pass,
  calibrations: [
    { name: 'invalid edit', law: 'valid input returns', history: { constructed: 'plain' }, corrupt: corrupt('returned', false) },
    { name: 'missing edit', law: 'valid input returns', history: { constructed: 'plain' }, driver: (p, observe) => recordReturn(p, {}, observe) },
    { name: 'null edit', law: 'valid input returns', history: { constructed: 'plain' }, driver: (p, observe) => recordReturn(p, { value: null }, observe) },
    { name: 'non-object edit', law: 'valid input returns', history: { constructed: 'plain' }, driver: (p, observe) => recordReturn(p, { value: 'x' }, observe) },
    { name: 'missing edit fields', law: 'valid input returns', history: { constructed: 'plain' }, driver: (p, observe) => recordReturn(p, { value: {} }, observe) },
    { name: 'malformed edit offset', law: 'valid input returns', history: { constructed: 'plain' }, driver: (p, observe) => recordReturn(p, { value: { from: 0n, to: 0, insert: '', start: 0, end: 0 } }, observe) },
    { name: 'out-of-range selection', law: 'valid input returns', history: { constructed: 'plain' }, driver: (p, observe) => recordReturn(p, { value: { from: 0, to: 0, insert: '', start: 0, end: p.text.length + 1 } }, observe) },
    { name: 'formatter error', law: 'valid input returns', history: { constructed: 'plain' }, driver: (p, observe) => recordReturn(p, { error: { name: 'TypeError', message: 'formatter failed' } }, observe) },
  ],
});
