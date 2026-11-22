/**
 * This oracle owns native newline source/history and immediate Save in Studio's
 * composer, full editor and quick edit. It owns the formatter's native input
 * binding and React binding hook, checked after every action and Save completion.
 *
 * Enter // → replaces the selection with LF and collapses the caret after it
 * Shift+Enter // → the same ordinary newline, with an unprevented trusted key
 * undo(); redo() // → restores the prior and next source branches
 * Save // → completes without an error and persists the exact current React text
 * Save // → composer creates one successful item with the saved item's identity
 *
 * Why retain the selected terminal LF? Native redo can otherwise lose it after
 * replacement. Histories select a nonempty body ending at that LF, then vary
 * Enter/Shift+Enter, continued editing, undo/redo and immediate Save on each
 * surface. Reopened quick edit repeats that receipt on its replacement node.
 * Native text commit and ASCII keys exercise the same selection geometry.
 * A controlled native delete may deliver trusted input before returning false
 * or throwing; source and Save still preserve the single offered replacement.
 * These controls promise source/Save, without native undo after the forced signal.
 * The pure mixed model predicts source from actions and public input
 * ranges; undo selection is a host freedom, consumed by subsequent actions.
 *
 * For every native newline history, LF replaces the offered range, immediate
 * caret/focus and trusted unprevented key receipt are preserved, and native
 * undo/redo preserves the source branch. Refused, missing and throwing native
 * commands preserve ordinary insertion without a native undo promise.
 * For every immediate Save, the clicked action completes without errors and
 * persists the resulting React text to the exact requested item. Composer makes
 * exactly one successful create with that identity; existing-item surfaces make
 * none. Fresh server IDs may differ: statuses and identity relationships are
 * judged, while complete literal receipts remain in raw receiving evidence.
 * The ordered create roster includes requests admitted through Save completion,
 * even when their responses arrive later. Save's original busy/error receipt
 * remains distinct from the subsequent stored-item read.
 *
 * Decision by Kyle Mathews (GitHub KyleAMathews), 2026-11-18: retain browser
 * formatting and mixed native history across all three surfaces. Decision by
 * Kyle Mathews (GitHub KyleAMathews), 2026-11-21: follow main's native Enter and
 * Shift+Enter; compare Save identity relationships and create statuses, keeping
 * literal IDs and complete receipts raw. Calibrations challenge source, focus,
 * stale/rejected Save, identities, failed/duplicate creates and delayed responses.
 *
 * Limits: bounded mixed-model alphabet, ten actions, optional context and one
 * through three undo/redo cycles. Native source history requires the real native
 * command. No physical IME/iPad or arbitrary hidden-region claim. This file is
 * selected with the legacy session oracle by --oracle session; newline-history
 * selects it alone. Models and drivers are test-free companion modules.
 */
import { differs, oracleProperty, pass } from '@tanstack/oracles';
import { traceValue } from './editor-oracles/document-oracle.ts';
import { checkMixedPrefix, mixedCheckpoints } from './editor-oracles/mixed-check-oracle.ts';
import { newlineHistoryArbitrary, newlineHistoryCases, newlineHistoryModel, newlineHistoryPlan, newlineHistoryStates } from './editor-oracles/newline-history-model-oracle.ts';
import { newlineHistoryDriver, type NewlineSaveRaw } from './editor-oracles/newline-history-driver-oracle.ts';

// Exercise the literal-to-relational observation too: changing a raw item ID
// must change its relationship, rather than just flipping a judged boolean.
const saveCalibration = (corrupt: (raw: NewlineSaveRaw) => NewlineSaveRaw) =>
  (p: Parameters<typeof newlineHistoryDriver>[0], observe: Parameters<typeof newlineHistoryDriver>[1]) => newlineHistoryDriver(p, observe, false, corrupt);

// Terminal selected newlines exercise the same adopted source/history promise
// on every surface. The mixed model consumes recorded public input ranges,
// preserving its undo-selection freedom rather than predicting a host caret.
oracleProperty({
  id: 'editor-browser-newline-history',
  owns: ['src/ui/format-shortcuts.ts#onFormatKey', 'src/ui/format-shortcuts.ts#applyEdit', 'src/ui/format-shortcuts.ts#bindFormatInput', 'src/ui/authoring.tsx#useFormatInput'],
  law: { statement: 'For every native newline history, Enter and Shift+Enter replace the selected range with LF, preserve immediate caret/focus and their unprevented trusted key receipt, native undo/redo preserves the source branch, and each editing surface completes Save without errors and persists the resulting React text to the exact saved item; composer creates exactly one successful item with that identity and existing-item surfaces create none.',
    authority: 'Decision by Kyle Mathews (GitHub KyleAMathews), 2026-11-18: retain browser formatting behavior across composer, full editor and quick edit, including arbitrary histories and undo followed by a new edit; decision by Kyle Mathews (GitHub KyleAMathews), 2026-11-21: follow main, Enter/Shift+Enter insert ordinary native newlines; compare Save identity relationships and each create status, retaining all literal IDs and complete receipts in raw evidence.',
    limits: 'Bounded mixed-model alphabet and ten actions; selected nonempty body followed by LF, optional context, one through three undo/redo cycles. Native source history only with the real native command available; refused, missing and throwing command paths preserve ordinary insertion without a native undo claim. Undo/redo selection is unconstrained and subsequent actions consume its actual public range. No IME or physical iPad claim, and no arbitrary hidden-region claim.' },
  histories: { arbitrary: newlineHistoryArbitrary, runs: 25, fixedSeeds: [20261118],
    states: [...new Set(Object.values(newlineHistoryCases).flatMap(h => newlineHistoryStates(newlineHistoryPlan(h))))],
    constructed: Object.entries(newlineHistoryCases).map(([name, h]) => ({ name, enters: newlineHistoryStates(newlineHistoryPlan(h)), build: () => h })) },
  resolve: newlineHistoryPlan, model: newlineHistoryModel, reached: newlineHistoryStates, driver: newlineHistoryDriver,
  check: (p, trace, expected) => {
    const law = 'browser native newline history';
    const history = checkMixedPrefix(p.mixed, trace, expected, law); if (history) return history;
    const focus = differs('step0', law, (traceValue(trace, 'step0') as { focused?: boolean })?.focused, true, 'step0.focus'); if (focus) return focus;
    const final = traceValue(trace, 'step' + (p.mixed.actions.length - 1)) as { value: string };
    const receipt = traceValue(trace, 'saved') as { source?: string; ok?: boolean; identity?: { requestedPresent: boolean; returnedPresent: boolean; matchesRequested: boolean }; creates?: { status: number; hasIdentity: boolean; matchesSavedItem: boolean }[]; boundary?: { trusted?: boolean; states?: boolean[]; errors?: string[] } } | undefined;
    const saved = differs('saved', law, { source: receipt?.source, ok: receipt?.ok }, { source: final.value, ok: true }, 'saved.React source');
    const boundary = differs('saved', law, !!receipt?.boundary?.trusted && receipt.boundary.states?.includes(true) && receipt.boundary.states.at(-1) === false, true, 'saved.action completion');
    const identity = differs('saved', law, receipt?.identity, { requestedPresent: true, returnedPresent: true, matchesRequested: true }, 'saved.item identity');
    const creates = differs('saved', law, p.h.surface === 'composer' ? receipt?.creates?.length === 1 && receipt.creates.every(create => create.status >= 200 && create.status < 300 && create.hasIdentity && create.matchesSavedItem) : receipt?.creates?.length === 0, true, 'saved.create identity');
    return saved ?? differs('errors', law, traceValue(trace, 'errors'), [])
      ?? boundary ?? differs('saved', law, receipt?.boundary?.errors, [], 'saved.action errors') ?? identity ?? creates
      ?? differs('errors', law, trace.map(item => item.checkpoint), [...mixedCheckpoints(p.mixed), 'saved', 'errors']) ?? pass;
  },
  calibrations: [
    { name: 'native ASCII key replacement lost typed source', law: 'browser native newline history', difference: 'step0.state',
      history: { constructed: 'key-text-editor-unicode' }, corrupt: trace => trace.map(item => item.checkpoint === 'step0' ? { ...item, value: { ...(item.value as object), value: '\n' } } : item) },
    { name: 'reopened quick editor lost native redo source', law: 'browser native newline history', difference: 'step2.state',
      history: { constructed: 'reopen-quick-Enter-terminal' }, corrupt: trace => trace.map(item => item.checkpoint === 'step2' ? { ...item, value: { ...(item.value as object), value: '' } } : item) },
    { name: 'completed native delete received a second default newline', law: 'browser native newline history', difference: 'step0.state',
      history: { constructed: 'composer-Enter-afterFalse' }, corrupt: trace => trace.map(item => item.checkpoint === 'step0' ? { ...item, value: { ...(item.value as object), value: '\n\n' } } : item) },
    { name: 'ordinary native replacement lost typed source', law: 'browser native newline history', difference: 'step0.state',
      history: { constructed: 'type-terminal-editor-unicode' }, corrupt: trace => trace.map(item => item.checkpoint === 'step0' ? { ...item, value: { ...(item.value as object), value: '\n' } } : item) },
    { name: 'Save read returned another item', law: 'browser native newline history', difference: 'saved.item identity',
      history: { constructed: 'editor-Enter-immediate' }, driver: saveCalibration(raw => ({ ...raw, stored: { ...raw.stored, body: { ...raw.stored.body, id: raw.itemId + '-other' } } })) },
    { name: 'Create was associated with another saved item', law: 'browser native newline history', difference: 'saved.create identity',
      history: { constructed: 'composer-Enter-immediate' }, driver: saveCalibration(raw => ({ ...raw, creates: raw.creates.map(create => ({ ...create, body: { ...create.body, id: raw.itemId + '-other' } })) })) },
    { name: 'Save duplicated the create', law: 'browser native newline history', difference: 'saved.create identity',
      history: { constructed: 'composer-Enter-immediate' }, driver: saveCalibration(raw => ({ ...raw, creates: [...raw.creates, ...raw.creates] })) },
    { name: 'Save accepted a failed create', law: 'browser native newline history', difference: 'saved.create identity',
      history: { constructed: 'composer-Enter-immediate' }, driver: saveCalibration(raw => ({ ...raw, creates: raw.creates.map(create => ({ ...create, status: 500 })) })) },
    { name: 'Save read omitted item identity', law: 'browser native newline history', difference: 'saved.item identity',
      history: { constructed: 'editor-Enter-immediate' }, driver: saveCalibration(raw => ({ ...raw, stored: { ...raw.stored, body: { ...raw.stored.body, id: undefined } } })) },
    { name: 'Create omitted item identity', law: 'browser native newline history', difference: 'saved.create identity',
      history: { constructed: 'composer-Enter-immediate' }, driver: saveCalibration(raw => ({ ...raw, creates: raw.creates.map(create => ({ ...create, body: { ...create.body, id: undefined } })) })) },
    { name: 'Create response arrived after Save completed', law: 'browser native newline history', difference: 'saved.create identity',
      history: { constructed: 'composer-Enter-immediate' }, driver: (p, observe) => newlineHistoryDriver(p, observe, false, undefined, true) },
    { name: 'redo lost terminal newline', law: 'browser native newline history', difference: 'step2.state',
      history: { constructed: 'editor-Enter-terminal' }, corrupt: trace => trace.map(item => item.checkpoint === 'step2' ? { ...item, value: { ...(item.value as object), value: '' } } : item) },
    { name: 'React saved stale native source', law: 'browser native newline history', difference: 'saved.React source',
      history: { constructed: 'composer-Enter-immediate' }, corrupt: trace => trace.map(item => item.checkpoint === 'saved' ? { ...item, value: { ...(item.value as object), source: 'stale' } } : item) },
    { name: 'Save rejected after source was already persisted', law: 'browser native newline history', difference: 'saved.action errors',
      history: { constructed: 'composer-Enter-immediate' }, corrupt: trace => trace.map(item => item.checkpoint === 'saved' ? { ...item, value: { ...(item.value as { boundary: object }), boundary: { ...(item.value as { boundary: object }).boundary, errors: ['Save rejected'] } } } : item) },
    { name: 'Save rejected after externally persisted native source', law: 'browser native newline history', difference: 'saved.action errors',
      history: { constructed: 'editor-Enter-immediate' }, driver: (p, observe) => newlineHistoryDriver(p, observe, true) },
    { name: 'native newline blurred before another action', law: 'browser native newline history', difference: 'step0.focus',
      history: { constructed: 'editor-Enter-immediate' }, corrupt: trace => trace.map(item => item.checkpoint === 'step0' ? { ...item, value: { ...(item.value as object), focused: false } } : item) },
  ],
});
