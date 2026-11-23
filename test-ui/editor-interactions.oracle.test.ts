/**
 * These oracles own native delivery at Studio's toolbar and formatter gates.
 * They check source/range/focus after real button activation, untouched source
 * after readonly or picker-consumed keys, native off-list focus movement, and
 * page scrolling during applyEdit's actual focus call.
 *
 * toolbar.indent(); press('Enter') // → same selected-line edit and textarea focus
 * toolbar.formula(); press('Space') // → same dollar wrapper and selected body
 * picker.choose(); onFormatKey(preventedKey) // → picker input is left untouched
 * readonlyTextarea.press('ControlOrMeta+b') // → no formatter edit or prevention
 * proseTextarea.press('Shift+Tab') // → source preserved, native focus moves back
 * applyEdit(belowFoldTextarea, edit) // → focusing preserves page scroll
 *
 * A button briefly owns focus while the textarea still owns the selection. For
 * every supported toolbar activation, its existing command law determines source
 * and range, and the textarea regains focus. For every readonly or already-taken
 * key, the formatter leaves its input untouched. A real mention picker supplies
 * the taken-key premise at the actual delegated formatter entry. Off-list Tab in
 * either direction retains the destination and direction of the same native key
 * with only the formatter bypassed. For every valid edit,
 * focusing the textarea leaves the page's scroll position unchanged at that call.
 *
 * Authority: decision by Kyle Mathews (GitHub KyleAMathews),2026-11-18: strengthen
 * adopted T4 keyboard/focus/selection behavior; format-shortcuts.ts's documented
 * formatter gates, off-list Tab and focus({preventScroll:true}) transaction;
 * original toolbar receiving scenarios at28b0c8d. The command models are the
 * independent list, formula and code projections. Picker source/range is sampled
 * at the delegated formatter's entry, never as its expected output. The traversal
 * control supplies only native host focus behavior, never an expected edit.
 *
 * Bounds are one action,24 generated units of ordinary prose and both viewport
 * profiles. The picker contact response and readonly flag are controlled inputs;
 * contact lookup/completion, replacement lifecycle, IME, OS keyboards and roving
 * toolbar navigation are separate contracts. Readonly focus is diagnostic because
 * an unprevented browser shortcut owns its native focus result. Scroll evidence is at focus itself,
 * because native editing may legitimately reveal a caret afterwards. Code input
 * contains no fence marker, preserving the exact default-serialization domain.
 */
import { differs, oracleProperty, pass } from '@tanstack/oracles';
import { traceValue } from './editor-oracles/document-oracle.ts';
import { toolbarInteractionArbitrary, toolbarInteractionCases, toolbarInteractionModel, toolbarInteractionPlan, toolbarInteractionStates,
  pickerInteractionArbitrary, pickerInteractionCases, pickerInteractionPlan, pickerInteractionStates,
  readonlyInteractionArbitrary, readonlyInteractionCases, readonlyInteractionPlan, readonlyInteractionStates,
  traversalInteractionArbitrary, traversalInteractionCases, traversalInteractionPlan, traversalInteractionStates,
  scrollInteractionArbitrary, scrollInteractionCases, scrollInteractionPlan, scrollInteractionStates } from './editor-oracles/interaction-model-oracle.ts';
import { toolbarInteractionDriver, pickerInteractionDriver, readonlyInteractionDriver, traversalInteractionDriver, scrollInteractionDriver } from './editor-oracles/interaction-driver-oracle.ts';

const authority = 'Decision by Kyle Mathews (GitHub KyleAMathews),2026-11-18: adopted T4 keyboard/focus/selection strengthening; src/ui/format-shortcuts.ts entry-point promises and original toolbar scenarios at28b0c8d642a87e5810ad6eabd95c2d1714c53396.';
const toolbarLaw = 'toolbar keyboard receipt';
oracleProperty({
  id: 'editor-browser-toolbar-interactions', owns: ['src/ui/format-shortcuts.ts#applyEdit', 'src/ui/format-shortcuts.ts#indentEdit', 'src/ui/format-shortcuts.ts#breakEdit', 'src/ui/format-shortcuts.ts#codeBlockEdit', 'src/ui/format-shortcuts.ts#formulaEdit'],
  law: { statement: 'For every supported toolbar command activated with click, Enter or Space, deliver its adopted source/range edit and return focus to the textarea.', authority, limits: 'Full editor, two viewports, one supported Markdown tool,24 ordinary input units, all/partial/caret ranges. Exact code serialization only for tick-free selections; no native undo claim.' },
  histories: { arbitrary: toolbarInteractionArbitrary, runs: 25, fixedSeeds: [20261118], states: [...new Set(Object.values(toolbarInteractionCases).flatMap(h => toolbarInteractionStates(toolbarInteractionPlan(h))))], constructed: Object.entries(toolbarInteractionCases).map(([name, h]) => ({ name, enters: toolbarInteractionStates(toolbarInteractionPlan(h)), build: () => h })) },
  resolve: toolbarInteractionPlan, model: toolbarInteractionModel, reached: toolbarInteractionStates, driver: toolbarInteractionDriver,
  check: (_p, trace, expected) => differs('delivered', toolbarLaw, traceValue(trace, 'delivered'), expected) ?? differs('errors', toolbarLaw, traceValue(trace, 'errors'), []) ?? pass,
  calibrations: [{ name: 'keyboard toolbar leaves focus on button', law: toolbarLaw, history: { constructed: 'formula-Space-false' }, corrupt: trace => trace.map(o => o.checkpoint === 'delivered' ? { ...o, value: { ...(o.value as object), focused: false } } : o) }],
});

const pickerLaw = 'actual picker formatter gate';
type PickerInput = { value: string; selection: number[]; prevented: boolean; nativePrevented: boolean };
const pickerInput = (trace: Parameters<typeof traceValue>[0]) => traceValue(trace, 'gateInput') as PickerInput | null | undefined;
const consumedPickerInput = (input: PickerInput | null | undefined) => input?.prevented === true && input.nativePrevented === true;
oracleProperty({
  id: 'editor-browser-picker-gate', owns: ['src/ui/format-shortcuts.ts#onFormatKey'],
  law: { statement: 'For every key consumed by the actual picker before React receives it, onFormatKey leaves the supplied source/range untouched and textarea focus remains with the picker selection.', authority, limits: 'Actual mention picker with controlled valid contact response, native Tab and Shift+Enter, two viewports; contact persistence and completion semantics are not judged. The model reads formatter-boundary inputs after the picker.' },
  histories: { arbitrary: pickerInteractionArbitrary, runs: 25, fixedSeeds: [20261118], states: [...new Set(Object.values(pickerInteractionCases).flatMap(h => pickerInteractionStates(pickerInteractionPlan(h))))], constructed: Object.entries(pickerInteractionCases).map(([name, h]) => ({ name, enters: pickerInteractionStates(pickerInteractionPlan(h)), build: () => h })) },
  resolve: pickerInteractionPlan,
  model: (_p, trace) => { const input = pickerInput(trace); return { value: input?.value, selection: input?.selection, focused: true }; },
  reached: pickerInteractionStates, driver: pickerInteractionDriver,
  // An absent consumed-key premise is a driver/setup failure. Do not turn the
  // recorded premise into a formatter-law violation that hides the setup error.
  check: (_p, trace, expected) => !consumedPickerInput(pickerInput(trace)) ? pass : differs('delivered', pickerLaw, traceValue(trace, 'delivered'), expected) ?? differs('errors', pickerLaw, traceValue(trace, 'errors'), []) ?? pass,
  calibrations: [{ name: 'formatter indents after picker took Tab', law: pickerLaw, history: { constructed: 'Tab-false' }, corrupt: trace => trace.map(o => o.checkpoint === 'delivered' ? { ...o, value: { ...(o.value as object), value: 'wrong indentation' } } : o) }],
});

const readonlyLaw = 'readonly formatter gate';
oracleProperty({
  id: 'editor-browser-readonly-gate', owns: ['src/ui/format-shortcuts.ts#onFormatKey'],
  law: { statement: 'For every supported formatting or structural key on a readonly textarea, preserve input source/range and leave the key unprevented so native form navigation remains available.', authority, limits: 'Actual full-editor React listener with controlled readonly flag;24 ordinary input units and two viewports. Replacement lifecycle and disabled-toolbar coupling remain separate.' },
  histories: { arbitrary: readonlyInteractionArbitrary, runs: 25, fixedSeeds: [20261118], states: [...new Set(Object.values(readonlyInteractionCases).flatMap(h => readonlyInteractionStates(readonlyInteractionPlan(h))))], constructed: Object.entries(readonlyInteractionCases).map(([name, h]) => ({ name, enters: readonlyInteractionStates(readonlyInteractionPlan(h)), build: () => h })) },
  resolve: readonlyInteractionPlan, model: p => ({ value: p.text, selection: [p.from, p.to], prevented: false }), reached: readonlyInteractionStates, driver: readonlyInteractionDriver,
  check: (_p, trace, expected) => {
    const delivered = traceValue(trace, 'delivered') as (typeof expected & { focused: boolean }) | undefined;
    const promised = delivered && { value: delivered.value, selection: delivered.selection, prevented: delivered.prevented };
    return differs('delivered', readonlyLaw, promised, expected) ?? differs('errors', readonlyLaw, traceValue(trace, 'errors'), []) ?? pass;
  },
  calibrations: [{ name: 'readonly formatting changes source', law: readonlyLaw, history: { constructed: 'ControlOrMeta+b-false' }, corrupt: trace => trace.map(o => o.checkpoint === 'delivered' ? { ...o, value: { ...(o.value as object), value: '' } } : o) }],
});

const traversalLaw = 'off-list native focus navigation';
type NativeTraversalInput = { prevented: boolean | null; focused: boolean; recipient: number | null; direction: string };
const traversalInput = (trace: Parameters<typeof traceValue>[0]) => traceValue(trace, 'nativeTraversalInput') as NativeTraversalInput | undefined;
const nativeTraversalInput = (input: NativeTraversalInput | undefined) => input?.prevented === false && !input.focused && input.recipient !== null;
oracleProperty({
  id: 'editor-browser-focus-traversal', owns: ['src/ui/format-shortcuts.ts#onFormatKey'],
  law: { statement: 'For every ordinary prose selection, Tab and Shift+Tab preserve source/range and leave the textarea through native forward or reverse focus navigation.', authority, limits: 'Actual full editor and two viewports,24 ordinary input units. No exact neighboring element, toolbar role, roving tabindex or physical-mobile-keyboard claim.' },
  histories: { arbitrary: traversalInteractionArbitrary, runs: 25, fixedSeeds: [20261118], states: [...new Set(Object.values(traversalInteractionCases).flatMap(h => traversalInteractionStates(traversalInteractionPlan(h))))], constructed: Object.entries(traversalInteractionCases).map(([name, h]) => ({ name, enters: traversalInteractionStates(traversalInteractionPlan(h)), build: () => h })) },
  resolve: traversalInteractionPlan, model: (p, trace) => {
    const control = traversalInput(trace);
    return { value: p.text, selection: [p.from, p.to], focused: false, prevented: false, recipient: control?.recipient, direction: control?.direction };
  }, reached: traversalInteractionStates, driver: traversalInteractionDriver,
  check: (_p, trace, expected) => !nativeTraversalInput(traversalInput(trace)) ? pass : differs('delivered', traversalLaw, traceValue(trace, 'delivered'), expected) ?? differs('errors', traversalLaw, traceValue(trace, 'errors'), []) ?? pass,
  calibrations: [
    { name: 'off-list Tab traps focus', law: traversalLaw, history: { constructed: 'false-false' }, corrupt: trace => trace.map(o => o.checkpoint === 'delivered' ? { ...o, value: { ...(o.value as object), focused: true } } : o) },
    { name: 'prevented Tab merely blurs', law: traversalLaw, history: { constructed: 'false-false' }, corrupt: trace => trace.map(o => o.checkpoint === 'delivered' ? { ...o, value: { ...(o.value as object), focused: false, prevented: true, recipient: null, direction: 'outside' } } : o) },
    { name: 'Tab focuses a different recipient', law: traversalLaw, history: { constructed: 'true-false' }, corrupt: trace => trace.map(o => o.checkpoint === 'delivered' ? { ...o, value: { ...(o.value as object), recipient: -1, direction: 'outside' } } : o) },
  ],
});

const scrollLaw = 'focus preserves page scroll';
oracleProperty({
  id: 'editor-browser-focus-scroll', owns: ['src/ui/format-shortcuts.ts#applyEdit'],
  law: { statement: 'For every valid edit whose textarea is below an already scrolled viewport, focus it without moving the page at the focus call and deliver the intended source/range.', authority, limits: 'Real browser geometry,100–800px initial page scroll,24 ordinary units, requested native command or forced refusal; native command results are diagnostic. Observes focus itself, permitting later native caret-reveal scrolling.' },
  histories: { arbitrary: scrollInteractionArbitrary, runs: 25, fixedSeeds: [20261118], states: [...new Set(Object.values(scrollInteractionCases).flatMap(h => scrollInteractionStates(scrollInteractionPlan(h))))], constructed: Object.entries(scrollInteractionCases).map(([name, h]) => ({ name, enters: scrollInteractionStates(scrollInteractionPlan(h)), build: () => h })) },
  resolve: scrollInteractionPlan, model: p => ({ value: p.initial.slice(0, p.edit.from) + p.edit.insert + p.initial.slice(p.edit.to), selection: [p.edit.start, p.edit.end], focused: true, outsideViewport: true, actualOffset: p.h.offset, errors: [] }), reached: scrollInteractionStates, driver: scrollInteractionDriver,
  check: (_p, trace, expected) => {
    const received = traceValue(trace, 'delivered') as (typeof expected & { scrolls: number[][] }) | undefined;
    if (!received) return differs('delivered', scrollLaw, received, expected) ?? pass;
    for (const key of Object.keys(expected) as (keyof typeof expected)[]) { const fail = differs('delivered', scrollLaw, { field: key, value: received[key] }, { field: key, value: expected[key] }); if (fail) return fail; }
    return differs('delivered', scrollLaw, Array.isArray(received.scrolls) && received.scrolls.length > 0 && received.scrolls.every(delta => delta.length === 2 && delta.every(n => n === 0)), true) ?? pass;
  },
  calibrations: [
    { name: 'ordinary focus scrolls to textarea', law: scrollLaw, history: { constructed: 'native' }, corrupt: trace => trace.map(o => o.checkpoint === 'delivered' ? { ...o, value: { ...(o.value as object), scrolls: [[0, 2000]] } } : o) },
    { name: 'focus receipt is missing', law: scrollLaw, history: { constructed: 'native' }, corrupt: trace => trace.map(o => o.checkpoint === 'delivered' ? { ...o, value: { ...(o.value as object), scrolls: [] } } : o) },
  ],
});
