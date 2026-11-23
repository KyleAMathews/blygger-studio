/**
 * This oracle owns bold/italic toggling, link insertion, and formula wrapping
 * through formatEdit and formulaEdit, at the resulting source, selection and edit validity.
 *
 * formatEdit('word', 0, 4, 'bold') // → **word**, with word selected
 * formatEdit('***word***', 3, 7, 'bold') // → *word*, with word selected
 * formatEdit('https://x', 0, 9, 'link') // → [](https://x), caret in the label
 * formulaEdit('x\ny', 0, 3) // → $$x\ny$$, with the source selected
 * formulaEdit('$$x$$', 0, 5) // → $$x$$, with x selected
 *
 * Single-line emphasis removes matching selected markers first, then matching
 * markers outside the selection, otherwise adds the requested style. Bold
 * occupies two stars, italic one; removing bold preserves italic and vice versa.
 * Whitespace stays outside the markers; whitespace-only selections stay before
 * an empty pair, following GitHub markdown-toolbar-element blockStyle. Multiline selections toggle together:
 * remove a style only when every nonblank line has it, otherwise add it to each.
 * Marker-only lines are literal content, never removable pairs of delimiters.
 *
 * For every emphasis selection these rules preserve its content, other styles,
 * outside source, and intended selection. For every link selection, lowercase
 * http(s) without whitespace supplies the target; other text supplies the label;
 * the caret waits in the empty field. For every formula selection, trimming and
 * single/double-dollar wrapping preserve its source and select the inner text;
 * an existing display formula is unchanged. Calls on valid offsets do not throw.
 * Authority: the formatting examples in test-ui/format-shortcuts.test.ts at
 * commit 28b0c8d642a87e5810ad6eabd95c2d1714c53396; format-shortcuts.ts comments
 * on whitespace, multiline emphasis, links and formulas. Decision by Kyle
 * Mathews (GitHub KyleAMathews), 2026-11-18: these rules, stock standard GitHub whitespace-only behavior, literal marker-only
 * lines, and unchanged existing display formulas.
 *
 * The emphasis model uses annotated delimiter counts and line content, rather
 * than production's source scans. Links and formulas use arbitrary UTF-16.
 * Constructed histories cover style combinations, asymmetry, empty/blank input,
 * multiline mixing, whitespace, dollar boundaries, and Unicode. Constructions
 * also reconstruct escaped stars, underscores, code spans, link labels and
 * destinations, and intraword punctuation under the same raw-source rules.
 * These input contexts promise no syntax-aware rendering. The driver
 * records errors as data. Corrupted results calibrate each check.
 *
 * Bounds: six stars per side, six lines, and 32 UTF-16 units per arbitrary field.
 * These are source-edit contracts; interpreting arbitrary Markdown, TeX validity,
 * actual DOM dispatch, and browser undo belong to other checks.
 */
import { differs, oracleProperty, pass } from '@tanstack/oracles';
import { browserCall } from './editor-oracles/browser-driver-oracle.ts';
import { check, corruptResult as corrupt, histories, result, traceValue, usableEdit } from './editor-oracles/document-oracle.ts';
import { emphasisArbitrary, emphasisCases, emphasisModel, emphasisPlan, emphasisStates, formulaArbitrary, formulaCases, formulaModel, formulaStates, linkArbitrary, linkCases, linkModel, linkStates, multiArbitrary, multiCases, multiModel, multiPlan, multiStates, textArbitrary, textPlan } from './editor-oracles/inline-model-oracle.ts';

const authority = 'test-ui/format-shortcuts.test.ts at commit 28b0c8d642a87e5810ad6eabd95c2d1714c53396; src/ui/format-shortcuts.ts comments; decision by Kyle Mathews (GitHub KyleAMathews), 2026-11-18: formatting laws, literal marker-only lines, unchanged display formulas.';

const limits = 'At most six delimiter stars per side, six lines, and 32 UTF-16 units per field. Source edits, not arbitrary Markdown or TeX interpretation or browser undo.';

oracleProperty({
  id: 'editor-emphasis-single', owns: ['src/ui/format-shortcuts.ts#formatEdit'],
  law: { statement: 'For every single-line selection, emphasis toggles the requested style, preserves other styles and whitespace, and returns the intended content selection without throwing.', authority, limits },
  histories: histories(emphasisArbitrary, emphasisCases, emphasisStates), resolve: emphasisPlan, model: emphasisModel,
  reached: p => emphasisStates(p.h),
  driver: async (p, observe) => { const r = await browserCall('formatEdit', [p.text, p.from, p.to, p.h.kind]); if (r.error) observe('error', r.error); else observe('result', result(p, r.value!)); },
  check: (_p, trace, expected) => check(trace, expected, 'single-line emphasis'),
  calibrations: [{ name: 'missing selection and content', law: 'single-line emphasis', history: { constructed: 'bold' }, corrupt }],
});

oracleProperty({
  id: 'editor-emphasis-multiline', work: { ratio: 1.04 }, owns: ['src/ui/format-shortcuts.ts#formatEdit'],
  law: { statement: 'For every multiline selection, emphasis toggles all nonblank lines together, preserves blank lines and literal marker-only content, and selects the transformed lines without throwing.', authority, limits },
  histories: histories(multiArbitrary, multiCases, multiStates), resolve: multiPlan, model: multiModel,
  reached: p => multiStates(p.h),
  driver: async (p, observe) => { const r = await browserCall('formatEdit', [p.text, p.from, p.to, p.h.kind]); if (r.error) observe('error', r.error); else observe('result', result(p, r.value!)); },
  check: (_p, trace, expected) => check(trace, expected, 'multiline emphasis'),
  calibrations: [{ name: 'lost multiline content', law: 'multiline emphasis', history: { constructed: 'plain' }, corrupt }],
});

oracleProperty({
  id: 'editor-link', owns: ['src/ui/format-shortcuts.ts#formatEdit'],
  law: { statement: 'For every selection, link insertion preserves its source in the label or the lowercase whitespace-free http(s) target and places the caret in the empty field, without throwing.', authority, limits },
  histories: histories(linkArbitrary, linkCases, linkStates), resolve: textPlan, model: linkModel,
  reached: p => linkStates(p.h),
  driver: async (p, observe) => { const r = await browserCall('formatEdit', [p.text, p.from, p.to, 'link']); if (r.error) observe('error', r.error); else observe('result', result(p, r.value!)); },
  check: (_p, trace, expected) => check(trace, expected, 'link insertion'),
  calibrations: [{ name: 'lost link', law: 'link insertion', history: { constructed: 'link1' }, corrupt }],
});

oracleProperty({
  id: 'editor-formula', work: { ratio: 1.08 }, owns: ['src/ui/format-shortcuts.ts#formulaEdit'],
  law: { statement: 'For every selection, the formula button trims and wraps single-line source in single dollars and multiline source in double dollars, leaves existing display formulas unchanged, and selects the inner source without throwing.', authority, limits },
  histories: histories(formulaArbitrary, formulaCases, formulaStates), resolve: textPlan, model: formulaModel,
  reached: p => formulaStates(p.h),
  driver: async (p, observe) => { const r = await browserCall('formulaEdit', [p.text, p.from, p.to]); if (r.error) observe('error', r.error); else observe('result', result(p, r.value!)); },
  check: (_p, trace, expected) => check(trace, expected, 'formula wrapping'),
  calibrations: [{ name: 'lost formula', law: 'formula wrapping', history: { constructed: 'formula4' }, corrupt }],
});


// Totality is wider than the annotated semantic grammar: all source partitions
// and UTF-16 boundaries are legal, including reversed surrogate halves. Negative
// or reversed offsets are the nearby invalid geometry excluded by construction.
oracleProperty({
  id: 'editor-inline-valid-input', owns: ['src/ui/format-shortcuts.ts#formatEdit', 'src/ui/format-shortcuts.ts#formulaEdit'],
  law: { statement: 'For every string and valid ordered selection offsets, inline formatting and formulas return a usable edit without throwing.', authority, limits: '32 UTF-16 units per partition; integer offsets within source. Does not judge Markdown rendering for arbitrary source.' },
  histories: histories(textArbitrary, { empty: { prefix: '', picked: '', suffix: '' }, splitSurrogate: { prefix: '\ud83d', picked: '\ude00', suffix: '\0' }, controlContext: { prefix: '\0', picked: 'x', suffix: '\r' } }, h => [h.picked ? 'selected' : 'caret', ...(!h.prefix ? ['documentStart'] : []), ...(!h.suffix ? ['documentEnd'] : [])]),
  resolve: textPlan, model: () => true,
  reached: p => [p.h.picked ? 'selected' : 'caret', ...(!p.h.prefix ? ['documentStart'] : []), ...(!p.h.suffix ? ['documentEnd'] : [])],
  driver: async (p, observe) => {
    const responses = [];
    for (const kind of ['bold', 'italic', 'link'] as const) responses.push(await browserCall('formatEdit', [p.text, p.from, p.to, kind]));
    responses.push(await browserCall('formulaEdit', [p.text, p.from, p.to]));
    if (responses.some(r => r.error)) { observe('error', responses.filter(r => r.error).map(r => r.error)); return; }
    const edits = responses.map(r => r.value!);

    observe('usable', edits.every(e => usableEdit(p, e)));
  },
  check: (_p, trace, expected) => differs('usable', 'valid inline edit', traceValue(trace, 'usable'), expected) ?? differs('error', 'valid inline edit', traceValue(trace, 'error'), undefined) ?? pass,
  calibrations: [{ name: 'unusable range', law: 'valid inline edit', history: { constructed: 'empty' }, corrupt: trace => trace.map(o => o.checkpoint === 'usable' ? { ...o, value: false } : o) }],
});
