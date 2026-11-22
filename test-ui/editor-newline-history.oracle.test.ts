/**
 * This oracle owns native input receiving and immediate Save in Studio's
 * composer, full editor and quick edit. React must receive exactly the source
 * that Enter, Shift+Enter or typing puts into the focused textarea.
 *
 * Enter // → selected source becomes LF, with the caret immediately after it
 * Shift+Enter // → the same ordinary LF, through a trusted unprevented key
 * type(); type(); Save // → continued source reaches the exact saved item
 * reopenQuickEdit(); type(); Save // → the replacement node receives the edit
 *
 * A correct visible textarea can still Save stale React state. These histories
 * select a nonempty body ending in LF, vary context and actual key/text delivery,
 * then Save immediately or after continued typing on each real editing surface.
 * The pure mixed model predicts every source and range from the input actions.
 *
 * For every native input history, the offered range is replaced with the
 * requested text or LF, the immediate caret and focus remain correct, and
 * Enter/Shift+Enter retain their trusted unprevented key receipt.
 * For every immediate Save, the clicked action completes without errors and
 * persists the resulting React text to the exact requested item. Composer makes
 * exactly one successful create with that identity; existing-item surfaces make
 * none. Fresh server IDs may differ: status and identity relationships are
 * judged while complete literal receipts remain in raw receiving evidence.
 * Save admission, completion and the later stored-item read remain distinct.
 *
 * Decision by Kyle Mathews (GitHub KyleAMathews), 2026-11-18: protect writing
 * behavior across all three editors; 2026-11-21: follow main's native newlines
 * and compare Save identity relationships while retaining raw IDs; 2026-11-22:
 * leave browser-engine Undo defects to the browser rather than adding repairs.
 * Calibrations challenge text, caret/focus, stale/rejected Save, identities,
 * failed/duplicate creates and delayed responses. The region oracle separately
 * checks protected text with an independent complete-draft construction.
 *
 * Limits: bounded mixed-model alphabet, one selected native replacement and
 * optional continued typing. Browser-native Undo/Redo, grouping and command
 * recovery are outside this promise. App-applied formatting history remains
 * covered by the mixed/session oracles. No physical IME/iPad claim. The legacy
 * --oracle session selection includes this file; newline-history selects it alone.
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

// Native source and React receiving remain exact. Browser Undo is not an
// application command here, so these histories stop at receiving and Save.
oracleProperty({
  id: 'editor-browser-newline-history',
  owns: ['src/ui/format-shortcuts.ts#onFormatKey', 'src/ui/authoring.tsx#Compose', 'src/ui/authoring.tsx#ItemRow', 'src/ui/authoring.tsx#Editor'],
  law: { statement: 'For every native input history, Enter/Shift+Enter or typing replaces the selected range with LF or the requested text, preserves immediate caret/focus and the unprevented trusted newline-key receipt, and each editing surface completes Save without errors and persists the resulting React text to the exact item; composer creates exactly one successful item with that identity and existing-item surfaces create none.',
    authority: 'Decision by Kyle Mathews (GitHub KyleAMathews), 2026-11-18: protect browser writing across composer, full editor and quick edit; 2026-11-21: ordinary native Enter/Shift+Enter and relational Save identities with complete raw evidence; 2026-11-22: do not repair Chromium Undo defects, leave browser-native history outside the application promise.',
    limits: 'Bounded mixed-model alphabet; selected nonempty body followed by LF with optional context, one native replacement and optional continued typing. Browser-native Undo/Redo, grouping and command recovery are outside this promise. App-applied formatting history remains separately covered. No physical IME/iPad or arbitrary hidden-region claim.' },
  histories: { arbitrary: newlineHistoryArbitrary, runs: 25, fixedSeeds: [20261118],
    states: [...new Set(Object.values(newlineHistoryCases).flatMap(h => newlineHistoryStates(newlineHistoryPlan(h))))],
    constructed: Object.entries(newlineHistoryCases).map(([name, h]) => ({ name, enters: newlineHistoryStates(newlineHistoryPlan(h)), build: () => h })) },
  resolve: newlineHistoryPlan, model: newlineHistoryModel, reached: newlineHistoryStates, driver: newlineHistoryDriver,
  check: (p, trace, expected) => {
    const law = 'browser native input receiving';
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
    { name: 'native ASCII key replacement lost typed source', law: 'browser native input receiving', difference: 'step0.state',
      history: { constructed: 'key-text-editor-unicode' }, corrupt: trace => trace.map(item => item.checkpoint === 'step0' ? { ...item, value: { ...(item.value as object), value: '\n' } } : item) },
    { name: 'reopened quick editor lost native source', law: 'browser native input receiving', difference: 'step0.state',
      history: { constructed: 'reopen-quick-Enter-terminal' }, corrupt: trace => trace.map(item => item.checkpoint === 'step0' ? { ...item, value: { ...(item.value as object), value: '' } } : item) },
    { name: 'ordinary native replacement lost typed source', law: 'browser native input receiving', difference: 'step0.state',
      history: { constructed: 'type-terminal-editor-unicode' }, corrupt: trace => trace.map(item => item.checkpoint === 'step0' ? { ...item, value: { ...(item.value as object), value: '\n' } } : item) },
    { name: 'Save read returned another item', law: 'browser native input receiving', difference: 'saved.item identity',
      history: { constructed: 'editor-Enter-immediate' }, driver: saveCalibration(raw => ({ ...raw, stored: { ...raw.stored, body: { ...raw.stored.body, id: raw.itemId + '-other' } } })) },
    { name: 'Create was associated with another saved item', law: 'browser native input receiving', difference: 'saved.create identity',
      history: { constructed: 'composer-Enter-immediate' }, driver: saveCalibration(raw => ({ ...raw, creates: raw.creates.map(create => ({ ...create, body: { ...create.body, id: raw.itemId + '-other' } })) })) },
    { name: 'Save duplicated the create', law: 'browser native input receiving', difference: 'saved.create identity',
      history: { constructed: 'composer-Enter-immediate' }, driver: saveCalibration(raw => ({ ...raw, creates: [...raw.creates, ...raw.creates] })) },
    { name: 'Save accepted a failed create', law: 'browser native input receiving', difference: 'saved.create identity',
      history: { constructed: 'composer-Enter-immediate' }, driver: saveCalibration(raw => ({ ...raw, creates: raw.creates.map(create => ({ ...create, status: 500 })) })) },
    { name: 'Save read omitted item identity', law: 'browser native input receiving', difference: 'saved.item identity',
      history: { constructed: 'editor-Enter-immediate' }, driver: saveCalibration(raw => ({ ...raw, stored: { ...raw.stored, body: { ...raw.stored.body, id: undefined } } })) },
    { name: 'Create omitted item identity', law: 'browser native input receiving', difference: 'saved.create identity',
      history: { constructed: 'composer-Enter-immediate' }, driver: saveCalibration(raw => ({ ...raw, creates: raw.creates.map(create => ({ ...create, body: { ...create.body, id: undefined } })) })) },
    { name: 'Create response arrived after Save completed', law: 'browser native input receiving', difference: 'saved.create identity',
      history: { constructed: 'composer-Enter-immediate' }, driver: (p, observe) => newlineHistoryDriver(p, observe, false, undefined, true) },
    { name: 'React saved stale native source', law: 'browser native input receiving', difference: 'saved.React source',
      history: { constructed: 'composer-Enter-immediate' }, corrupt: trace => trace.map(item => item.checkpoint === 'saved' ? { ...item, value: { ...(item.value as object), source: 'stale' } } : item) },
    { name: 'Save rejected after source was already persisted', law: 'browser native input receiving', difference: 'saved.action errors',
      history: { constructed: 'composer-Enter-immediate' }, corrupt: trace => trace.map(item => item.checkpoint === 'saved' ? { ...item, value: { ...(item.value as { boundary: object }), boundary: { ...(item.value as { boundary: object }).boundary, errors: ['Save rejected'] } } } : item) },
    { name: 'Save rejected after externally persisted native source', law: 'browser native input receiving', difference: 'saved.action errors',
      history: { constructed: 'editor-Enter-immediate' }, driver: (p, observe) => newlineHistoryDriver(p, observe, true) },
    { name: 'native newline blurred before another action', law: 'browser native input receiving', difference: 'step0.focus',
      history: { constructed: 'editor-Enter-immediate' }, corrupt: trace => trace.map(item => item.checkpoint === 'step0' ? { ...item, value: { ...(item.value as object), focused: false } } : item) },
  ],
});
