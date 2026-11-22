/**
 * This oracle owns actual bracket-picker precedence at onFormatKey entry.
 * A consumed native Enter or Shift+Enter preserves its supplied source/range
 * and textarea focus after delivery. It owns format-shortcuts.ts#onFormatKey.
 *
 * bracketPicker.press('Shift+Enter') // → formatter preserves consumed-key input
 *
 * The actual picker may replace the unfinished trigger before onFormatKey
 * receives the event. The transparent entry observer reads only formatter
 * inputs; the model preserves those inputs rather than predicting completion.
 * For every native bracket Enter delivered as already consumed to onFormatKey,
 * its supplied source/range is unchanged. Missing consumed delivery is a
 * host-premise error, never an identity-law kill.
 *
 * Authority: decision by Kyle Mathews (GitHub KyleAMathews),2026-11-18: strengthen
 * existing T4 picker/focus/readonly browser behavior; picker observations in
 * e2e/picker.spec.ts at28b0c8d. Native keyboard reaches the actual React editor
 * and bracket picker; controlled search/settings inputs supply a valid hit.
 * Histories vary ordinary Unicode prose, both viewports and Enter/Shift+Enter.
 * Kyle Mathews (GitHub KyleAMathews),2026-11-21: following main leaves native
 * Enter/Shift+Enter outside structural formatting. Consumed-key identity still
 * forbids replaying a native newline after picker completion. The shared
 * defaultPrevented guard also has a formatter-recognized Tab witness in
 * editor-browser-picker-gate; run that owner when assessing guard removal.
 * Historical bracket guard-removal kills predate the native-newline remap.
 *
 * Limits:24 ordinary generated code points; bracket picker in editor typing
 * mode. Completion spelling and modified-key ownership before formatter entry
 * are separate receiving behavior.
 */
import { differs, oracleProperty, pass, type Observation } from '@tanstack/oracles';
import { traceValue } from './editor-oracles/document-oracle.ts';
import { fields } from './editor-oracles/receiver-fields-oracle.ts';
import { bracketReceiverArbitrary, bracketReceiverCases, bracketReceiverPlan, bracketReceiverStates } from './editor-oracles/receiver-model-oracle.ts';
import { bracketReceiverDriver } from './editor-oracles/receiver-driver-oracle.ts';

const authority = 'Decision by Kyle Mathews (GitHub KyleAMathews),2026-11-18: adopted T4 picker/focus/readonly expansion, working-copy persistence and preservation of existing behavior; e2e/picker.spec.ts, e2e/focus-view.spec.ts and test-ui/authoring-revision-session.test.ts at28b0c8d642a87e5810ad6eabd95c2d1714c53396; src/ui/authoring.tsx replacement gates.';
type BracketEntry = { value: string; selection: number[]; prevented: boolean; nativePrevented: boolean; trusted: boolean };
const bracketEntry = (trace: readonly Observation[]) => traceValue(trace, 'entry') as BracketEntry | null | undefined;
const consumed = (entry: BracketEntry | null | undefined) => entry?.prevented === true && entry.nativePrevented === true && entry.trusted === true;
const bracketLaw = 'actual bracket formatter receipt';
oracleProperty({
  id: 'editor-browser-bracket-receiver', owns: ['src/ui/format-shortcuts.ts#onFormatKey'],
  law: { statement: 'For every actual bracket-picker Enter received by onFormatKey as a consumed key, preserve the supplied source/range and textarea focus.', authority, limits: 'Native Enter/Shift+Enter; actual bracket picker in editor typing mode with a controlled valid search hit, two viewports and24 ordinary input code points. Does not judge completion spelling or modified-key ownership before formatter entry.' },
  histories: { arbitrary: bracketReceiverArbitrary, runs: 25, fixedSeeds: [20261118], states: [...new Set(Object.values(bracketReceiverCases).flatMap(h => bracketReceiverStates(bracketReceiverPlan(h))))], constructed: Object.entries(bracketReceiverCases).map(([name, h]) => ({ name, enters: bracketReceiverStates(bracketReceiverPlan(h)), build: () => h })) },
  resolve: bracketReceiverPlan, model: (_p, trace) => { const input = bracketEntry(trace); return { value: input?.value, selection: input?.selection, focused: true }; },
  reached: (p, trace) => consumed(bracketEntry(trace)) ? bracketReceiverStates(p) : [], driver: bracketReceiverDriver,
  check: (p, trace, expected) => !consumed(bracketEntry(trace)) ? pass : fields(trace, 'opened', { value: p.text, selection: [p.text.length, p.text.length], picker: 1 }, bracketLaw) ?? fields(trace, 'delivered', expected, bracketLaw) ?? differs('errors', bracketLaw, traceValue(trace, 'errors'), []) ?? pass,
  calibrations: [{ name: 'consumed bracket key inserts another break', law: bracketLaw, difference: 'delivered.value', history: { constructed: 'Shift+Enter-false' }, corrupt: trace => trace.map(o => o.checkpoint === 'delivered' ? { ...o, value: { ...(o.value as object), value: 'extra break' } } : o) },
    { name: 'consumed bracket key replays native newline', law: bracketLaw, difference: 'delivered.value', history: { constructed: 'Shift+Enter-false' }, corrupt: trace => trace.map(o => o.checkpoint === 'delivered' ? { ...o, value: { ...(o.value as { value: string }), value: (o.value as { value: string }).value + '\n' } } : o) }],
});
