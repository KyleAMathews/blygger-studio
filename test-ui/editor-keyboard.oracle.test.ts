/**
 * This oracle owns keyboard classification and textarea edit delivery through
 * formatKey, structureKey, onFormatKey and applyEdit, at their return values and
 * observable textarea effects in Chromium. Native undo and React receipt are
 * checked by editor-session.oracle.test.ts in the actual app.
 *
 * formatKey({ key: 'B', ctrlKey: true, ...unmodified }, false) // → bold
 * structureKey({ key: 'Tab', shiftKey: true, ...unmodified }) // → outdent
 * onFormatKey(alreadyHandledEvent) // → no edit and no prevention
 * applyEdit(textarea, edit) // → focused textarea, replacement and final selection
 *
 * For every key and modifier combination, only Cmd+B/I/K on Mac or Ctrl+B/I/K
 * elsewhere formats; structural keys are Tab and Shift+Tab without command
 * modifiers. Enter and Shift+Enter remain untouched for native newline insertion. Unknown key strings return null. For every handler call,
 * read-only, composing and already-prevented events are untouched; accepted edits
 * prevent default and use the same formatting behavior as toolbar edits. For
 * every valid edit, exact replacement uses native editing or fallback, with focus preserved
 * without scrolling; failure uses setRangeText plus bubbling input, and the final
 * selection is followed by selectionchange. No valid call throws.
 *
 * Authority: format-shortcuts.ts entry-point comments and the keyboard examples
 * in test-ui/format-shortcuts.test.ts at commit
 * 28b0c8d642a87e5810ad6eabd95c2d1714c53396. Decision by Kyle Mathews (GitHub
 * KyleAMathews), 2026-11-18: these keyboard/application laws and unknown keys
 * returning null. Decision by Kyle Mathews (GitHub KyleAMathews), 2026-11-21:
 * follow main: Enter and Shift+Enter are native ordinary newlines; only the
 * toolbar invokes the Markdown hard-break command. The model is a chord table and an edit transaction, not calls
 * to production formatting helpers. Constructed cases cover every modifier mask,
 * supported chord, suppression flag, platform class, native success/failure and
 * insertion/deletion. Chromium supplies native command outcomes; forced refusal
 * reaches bubbling-input fallback. Intra-grapheme UTF-16 ranges remain exact
 * through fallback. App histories check real receiving state and native undo.
 *
 * Limits: arbitrary key strings and 32 UTF-16 units per text field; handler templates vary body text and independent caret/selection endpoints
 * across every dispatch route. The host normalizes CR/CRLF and clamps ranges. Actual IME composition is outside this boundary; composing flags are controlled
 * DOM events. The app oracle supplies native undo and focus-navigation histories.
 */
import { oracleProperty } from '@tanstack/oracles';
import { browserCall } from './editor-oracles/browser-driver-oracle.ts';
import { textareaDriver } from './editor-oracles/textarea-driver-oracle.ts';
import { differs, pass } from '@tanstack/oracles';
import { check, corruptResult as corrupt } from './editor-oracles/document-oracle.ts';
import { chord, editArbitrary, editCases, editStates, handlerArbitrary, handlerCases, handlerEdit, handlerPlan, handlerStates, keyArbitrary, keyCases, mods } from './editor-oracles/keyboard-model-oracle.ts';
import { transaction, nativeChoices } from './editor-oracles/textarea-model-oracle.ts';

const authority = 'src/ui/format-shortcuts.ts entry-point comments; test-ui/format-shortcuts.test.ts at commit 28b0c8d642a87e5810ad6eabd95c2d1714c53396; decision by Kyle Mathews (GitHub KyleAMathews), 2026-11-18: keyboard/application laws and unknown keys returning null; decision by Kyle Mathews (GitHub KyleAMathews), 2026-11-21: follow main; Enter and Shift+Enter remain native ordinary newlines, and the toolbar retains the Markdown hard-break command.';

oracleProperty({
  id: 'editor-key-classification', owns: ['src/ui/format-shortcuts.ts#formatKey', 'src/ui/format-shortcuts.ts#structureKey'],
  law: { statement: 'For every key string, platform and modifier combination, return exactly the documented formatting/structural command or null, without throwing.', authority, limits: 'Arbitrary UTF-16 key strings up to 32 units; all 16 modifier masks on both platform classes.' },
  histories: { arbitrary: keyArbitrary, runs: 100, fixedSeeds: [20261118], states: ['documented', 'unknown'], constructed: keyCases.map((h, i) => ({ name: `chord${i}`, enters: [chord(h).format || chord(h).structure ? 'documented' : 'unknown'], build: () => h })) },
  resolve: h => h, model: chord, reached: h => [chord(h).format || chord(h).structure ? 'documented' : 'unknown'],
  driver: async (h, observe) => {
    const event = { key: h.key, ...mods(h.mask) };
    const format = await browserCall('formatKey', [event, h.mac]);
    const structure = await browserCall('structureKey', [event]);
    if (format.error || structure.error) observe('error', format.error ?? structure.error);
    else observe('result', { format: typeof format.value === 'string' || format.value === null ? format.value : { unexpectedType: typeof format.value }, structure: structure.value });
  },
  check: (_h, trace, expected) => check(trace, expected, 'key classification'),
  calibrations: [{ name: 'all chords ignored', law: 'key classification', history: { constructed: 'chord4' }, corrupt: trace => trace.map(o => o.checkpoint === 'result' ? { ...o, value: { ...(o.value as object), format: null } } : o) }, { name: 'Shift+Enter restored as hard-break dispatch', law: 'key classification', history: { constructed: 'chord272' }, corrupt: trace => trace.map(o => o.checkpoint === 'result' ? { ...o, value: { ...(o.value as object), structure: 'break' } } : o) }],
});


oracleProperty({
  id: 'editor-apply-edit', owns: ['src/ui/format-shortcuts.ts#applyEdit'],
  law: { statement: 'For every valid edit, apply its replacement through a native undo command or bubbling-input fallback, focus without scrolling, restore its selection, and emit selectionchange without throwing.', authority, limits: '32 UTF-16 units per field, valid ordered replacement/final ranges. Real Chromium command outcomes or forced refusal; native undo and React receipt are checked by the app oracle. Exact replacement is also required at intra-grapheme offsets.' },
  histories: { arbitrary: editArbitrary, runs: 100, fixedSeeds: [20261118], states: [...new Set(Object.values(editCases).flatMap(editStates))], constructed: Object.entries(editCases).map(([name, h]) => ({ name, enters: editStates(h), build: () => h })) },
  resolve: h => {
    const prefix = h.prefix.replace(/\r\n?/g, '\n'), selected = h.selected.replace(/\r\n?/g, '\n'), suffix = h.suffix.replace(/\r\n?/g, '\n');
    const initial = prefix + selected + suffix, length = prefix.length + h.insert.length + suffix.length;
    const positions = [h.a % (length + 1), h.b % (length + 1)].sort((a, b) => a - b);
    return { h, initial, edit: { from: prefix.length, to: prefix.length + selected.length, insert: h.insert, start: positions[0]!, end: positions[1]! } };
  },
  model: p => nativeChoices(p.initial, p.edit, p.h.native).map(native => ({ ...transaction(p.initial, p.edit, native), nativeResult: native, prevented: 0, errors: [], focused: true })), reached: p => editStates(p.h),
  driver: async (p, observe) => { observe('result', await textareaDriver({ initial: p.initial, selection: [0, 0], native: p.h.native, edit: p.edit })); },
  check: (_p, trace, expected) => allowedTransaction(trace, expected, 'edit delivery'),
  calibrations: [{ name: 'edit not delivered', law: 'edit delivery', history: { constructed: 'nativeInsert' }, corrupt }, { name: 'missing application observation', law: 'edit delivery', history: { constructed: 'nativeInsert' }, corrupt: () => [] }],
});


oracleProperty({
  id: 'editor-key-handler', work: { ratio: 1 }, owns: ['src/ui/format-shortcuts.ts#onFormatKey'],
  law: { statement: 'For every key event, leave read-only, composing, already-handled or unrecognized events untouched; prevent default exactly when an edit is accepted and deliver the matching command with its intended selection without throwing.', authority, limits: 'Four content templates with varying bodies and independent selection endpoints reach every dispatch route; keyboard classification independently covers arbitrary key strings. Chromium DOM delivery; actual app receipt is checked by the session oracle, while real IME composition remains outside this domain.' },
  histories: { arbitrary: handlerArbitrary, runs: 100, fixedSeeds: [20261118], states: [...new Set(Object.values(handlerCases).flatMap(h => handlerStates(handlerPlan(h))))], constructed: Object.entries(handlerCases).map(([name, h]) => ({ name, enters: handlerStates(handlerPlan(h)), build: () => h })) },
  resolve: handlerPlan,
  model: p => {
    const edit = handlerEdit(p);
    return edit ? nativeChoices(p.initial, edit, p.h.native).map(native => ({ prevented: 1, ...transaction(p.initial, edit, native), nativeResult: native, errors: [], focused: true })) : [{ prevented: 0, value: p.initial, selection: [p.from, p.to], effects: [], nativeResult: null, errors: [], focused: true }];
  },
  reached: handlerStates,
  driver: async (p, observe) => { observe('result', await textareaDriver({ initial: p.initial, selection: [p.from, p.to], native: p.h.native, handler: p.h, modifiers: mods(p.h.mask) })); },
  check: (_p, trace, expected) => allowedTransaction(trace, expected, 'key handler'),
  calibrations: [{ name: 'handler ignored command', law: 'key handler', history: { constructed: 'bold' }, corrupt }],
});

// Native execCommand may decline an operation. Either supplied result is legal;
// its effects must agree with that result. A forced failure permits fallback only.
function allowedTransaction(trace: Parameters<typeof check>[0], allowed: unknown[], law: string) {
  const observed = trace.find(o => o.checkpoint === 'result')?.value as { nativeResult?: boolean | null } | undefined;
  const expected = allowed.find(o => (o as typeof observed)?.nativeResult === observed?.nativeResult);
  if (!observed || !expected) return differs('result', law, observed, allowed) ?? pass;
  return differs('result', law, observed, expected) ?? pass;
}
