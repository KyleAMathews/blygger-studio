/**
 * This oracle owns formatting as received by Studio's composer, full editor and
 * quick edit. Generated action histories run the real React listeners, toolbar,
 * native input/undo and Worker preview, with a checkpoint after each user action.
 *
 * Cmd/Ctrl+B, I, B, I // → styles toggle using each returned selection
 * undo(); switchKind() // → the undone source survives React's next render
 * bold(); type(); italic() // → each edit consumes the prior content/selection
 * undo(); type(); bold() // → formatting consumes the replacement text
 * Tab; typeSibling(); Shift+Tab; undo() // → nested items render and undo restores them
 * toolbar.break(); typeLine() // → one paragraph containing a real rendered break
 * Shift+Enter; typeLine() // → ordinary newline, one paragraph without a br
 * toolbar.code(); typeCode() // → typed source lands inside the new block
 *
 * For every generated emphasis history, commands preserve the selected content
 * and return its selection, while native undo/redo restores the prior/next source.
 * Empty emphasis pairs are included: removing their external markers is a native
 * deletion whose undo restores the pair, rather than undoing earlier typing.
 * Interleaved replacements keep the same semantic selection bookmark as styles
 * change. After undo followed by a typed replacement, the next format command
 * must operate on the replacement text.
 * Selections inside ordinary words retain native undo too; a word-boundary
 * classifier would preserve source through fallback while losing that history.
 * For every link placeholder, typing uses its returned target caret. Every editor
 * surface receives these edits through its own React listener. For every nested
 * list, Tab and Shift+Tab preserve focus and content, the preview contains both
 * children, and native undo restores the prior indentation. Off-list Tab retains
 * source and performs native focus navigation. For every verse history, the
 * preview shows one paragraph and a break through the hard-break toolbar. Enter
 * and Shift+Enter insert exactly one native newline over the selected range,
 * leave the caret after it and preserve focus. Their trusted target-key receipt
 * is unprevented; continuation remains one ordinary paragraph with no rendered
 * br in full-editor prose. A selected hard-break toolbar edit instead renders
 * one br; undo removes it and restores the selected source, and redo restores
 * the hard break. Composer and quick-edit receive the same native source/range
 * promises. Browser-default typing/newline Undo and grouping are outside this
 * application promise. App-applied formatting retains exact Undo/Redo checks.
 * Simulated navigator.platform IPAD is recorded, without claiming an on-screen
 * keyboard or physical iPad. Toolbar structure/formula edits have
 * the same source/selection promises and restore textarea focus; an impossible
 * first-item indent shows the existing explanation and preserves source.
 *
 * The additional structural receiving lane retains the old password-form
 * arrival as a setup premise, loads the complete structural document through
 * the API and types continuations with keyboard.type. Its raw key/input receipt
 * allows LF's Enter alias and Unicode's input fallback. These premises do not
 * adopt an authentication policy or physical-key claim. A premise rejection is
 * classified separately from the editing law and retains any editor discrepancy.
 *
 * Authority: the six browser scenarios in e2e/format-shortcuts.spec.ts and
 * e2e/markdown-structure.spec.ts at 28b0c8d642a87e5810ad6eabd95c2d1714c53396,
 * and decision by Kyle Mathews (GitHub KyleAMathews), 2026-11-18: retain their
 * behavior in browser oracles. Decision by Kyle Mathews (GitHub KyleAMathews),
 * 2026-11-21: follow main; native Shift+Enter is an ordinary newline and the
 * hard-break toolbar retains breakEdit. Decision by Kyle Mathews (GitHub
 * KyleAMathews), 2026-11-22: browser-native Undo defects are outside the
 * application promise. Commands use independent semantic annotations,
 * never production to predict source. Both Chromium viewport profiles, all
 * three surfaces and forced native failure are constructed, alongside generated
 * prose, empty emphasis pairs and one-to-eight-command histories. The app's formatter dependency calls
 * the exact module instrumented by oracle-gaps, installed before the SPA loads.
 *
 * Limits: receiving evidence covers Chromium and Firefox desktop/small viewports;
 * WebKit has a separate native-history finding. Eight words of 24 units per field,
 * plain prose with generated emphasis wrappers, ordinary hyphen list parents,
 * and up to eight emphasis commands. Native undo has no promise after the forced
 * fallback. Native newline receiving claims only unmodified Enter and Shift+Enter,
 * not focus-view command-modified Enter or physical keyboard/IME delivery. Clipboard delivery uses a real DOM ClipboardEvent, without OS clipboard.
 * The Worker preview executes server code in workerd; browser interaction and
 * production formatting execute in Chromium, with models/judgment in Node.
 */
import { differs, oracleProperty, pass, type Observation } from '@tanstack/oracles';
import { sessionArbitrary, sessionCases, sessionModel, sessionPlan, sessionStates, usesStructuralReceiving, type Step } from './editor-oracles/session-model-oracle.ts';
import { sessionDriver } from './editor-oracles/session-driver-oracle.ts';
import { traceValue } from './editor-oracles/document-oracle.ts';
import { structuralTypingProblem, type StructuralTypingReceipt } from './editor-oracles/structural-typing-delivery-oracle.ts';

type Receipt = { steps: Step[]; errors: { name: string; message: string }[] };
// The relation is still the complete ordered receipt, including every field.
// Compare one public fact at a time so replay/shrinking retains its user action
// and identifies source, selection, focus, preview or React-state divergence.
function checkEditingSession(trace: readonly Observation[], expected: Receipt) {
  const law = 'browser editing history';
  for (const [index, step] of expected.steps.entries()) {
    const received = traceValue(trace, step.checkpoint) as Step | null | undefined;
    if (!received) return differs(step.checkpoint, law, received, step) ?? pass;
    const fields = differs(step.checkpoint, law, Object.keys(received).sort(), Object.keys(step).sort());
    if (fields) return fields;
    for (const field of Object.keys(step) as (keyof Step)[]) {
      const failure = differs(step.checkpoint, law,
        { action: step.checkpoint, index, field, value: received[field] },
        { action: step.checkpoint, index, field, value: step[field] },
        `${step.checkpoint}: ${field} was ${JSON.stringify(received[field])}; expected ${JSON.stringify(step[field])}`);
      if (failure) return failure;
    }
  }
  return differs('errors', law, traceValue(trace, 'errors'), expected.errors,
    `browser errors were ${JSON.stringify(traceValue(trace, 'errors'))}; expected ${JSON.stringify(expected.errors)}`) ??
    differs('errors', law, trace.map(item => item.checkpoint), [...expected.steps.map(step => step.checkpoint), 'errors']) ?? pass;
}
// The installed framework has pass/violation only. This distinct classification
// is setup evidence, not another adopted product law or formatter-kill credit.
// Always compute the original public comparison first and retain its verdict.
function checkSession(plan: ReturnType<typeof sessionPlan>, trace: readonly Observation[], expected: Receipt) {
  if (!usesStructuralReceiving(plan.h)) return checkEditingSession(trace, expected);
  const deliveries = plan.actions.flatMap(action => action.kind === 'type' && action.delivery === 'structuralKeys'
    ? [{ checkpoint: action.checkpoint + 'Delivery', text: action.text }] : []);
  const receiptNames = ['receivingSetup', ...deliveries.map(item => item.checkpoint)];
  const receipts = new Set(receiptNames);
  const editor = checkEditingSession(trace.filter(item => !receipts.has(item.checkpoint)), expected);
  const problems: { checkpoint: string; reason: string }[] = [];
  const setup = traceValue(trace, 'receivingSetup') as { method?: unknown; cookiesBeforeLogin?: unknown; cookieInjected?: unknown; composerVisible?: unknown } | undefined;
  if (!setup || setup.method !== 'browserPasswordForm' || setup.cookiesBeforeLogin !== 0 || setup.cookieInjected !== false || setup.composerVisible !== true) {
    problems.push({ checkpoint: 'receivingSetup', reason: 'missing fresh password-form arrival at visible composer' });
  }
  const loaded = traceValue(trace, 'loadedStructural') as Step | undefined;
  if (!loaded || loaded.value !== plan.initialSource) problems.push({ checkpoint: 'loadedStructural', reason: 'complete API source was not acquired before editing' });
  // One combined order retains the boundary each receipt witnesses. Separate
  // public/receipt rosters would admit a delivery moved before source loading.
  const checkpoints = ['receivingSetup', ...plan.actions.flatMap(action => 'checkpoint' in action
    ? action.kind === 'type' && action.delivery === 'structuralKeys' ? [action.checkpoint + 'Delivery', action.checkpoint] : [action.checkpoint]
    : []), 'errors'];
  const received = trace.map(item => item.checkpoint);
  if (JSON.stringify(received) !== JSON.stringify(checkpoints)) problems.push({ checkpoint: 'receivingSetup', reason: 'combined receiving/action checkpoint order differs: ' + JSON.stringify({ received, expected: checkpoints }) });
  for (const delivery of deliveries) {
    const reason = structuralTypingProblem(traceValue(trace, delivery.checkpoint), delivery.text);
    if (reason) problems.push({ checkpoint: delivery.checkpoint, reason });
  }
  if (!problems.length) return editor;
  return differs(problems[0]!.checkpoint, 'browser receiving premise',
    { classification: 'receiving-premise', problems, editor },
    { classification: 'receiving-premise', problems: [], editor: pass },
    'receiving premise failure (not formatter-kill evidence): ' + JSON.stringify({ problems, editor })) ?? pass;
}
const corruptStep = (checkpoint: string, field: keyof Step, value: unknown) => (trace: readonly Observation[]) => trace.map(item => item.checkpoint === checkpoint
  ? { ...item, value: { ...(item.value as Step), [field]: value } }
  : item);

oracleProperty({
  id: 'editor-browser-session',
  owns: ['src/ui/format-shortcuts.ts#onFormatKey', 'src/ui/format-shortcuts.ts#applyEdit', 'src/ui/format-shortcuts.ts#formulaEdit', 'src/ui/format-shortcuts.ts#codeBlockEdit'],
  law: { statement: 'For every generated browser action history, each editor receives the intended formatting, source, selection and focus; Undo/Redo of app-applied formatting and React rerender preserve it, and the actual preview renders the intended structure.', authority: 'e2e/format-shortcuts.spec.ts and e2e/markdown-structure.spec.ts at 28b0c8d642a87e5810ad6eabd95c2d1714c53396; decision by Kyle Mathews (GitHub KyleAMathews), 2026-11-18: browser oracles replace fixed formatting tests; strengthen mixed-action coverage including undo followed by a new edit and replay adopted laws in additional browser engines with host differences explicit; decision by Kyle Mathews (GitHub KyleAMathews), 2026-11-21: follow main, native Enter/Shift+Enter insert ordinary newlines while the toolbar retains hard-break semantics; 2026-11-22: browser-native Undo defects are outside this application promise.', limits: 'Chromium and Firefox desktop/small-viewport receiving paths; WebKit has a separate native-history finding. Plain prose and hyphen parents, eight emphasis commands with interleaved replacements, eight words per field. Undo/Redo covers app-applied formatting only when the real command is available; browser-default typing/newline history and grouping are outside this promise; DOM paste event without OS clipboard. No arbitrary mixing of structural commands or syntax-aware contexts. Newline rendering is bounded ordinary prose; native Enter/Shift+Enter only, simulated navigator.platform IPAD, no physical on-screen keyboard or command-modified Enter insertion claim.' },
  histories: { arbitrary: sessionArbitrary, runs: 25, fixedSeeds: [20261118], states: [...new Set(Object.values(sessionCases).flatMap(sessionStates))], constructed: Object.entries(sessionCases).map(([name, h]) => ({ name, enters: sessionStates(h), build: () => h })) },
  resolve: sessionPlan, model: p => ({ steps: sessionModel(p), errors: [] }), reached: p => sessionStates(p.h),
  driver: sessionDriver,
  check: (p, trace, expected) => checkSession(p, trace, expected),
  calibrations: [
    { name: 'React lost formatted source', law: 'browser editing history', history: { constructed: 'composer-desktop' }, corrupt: trace => trace.map(item => item.checkpoint === 'format0' ? { ...item, value: null } : item) },
    { name: 'format dropped the selected content', law: 'browser editing history', history: { constructed: 'composer-desktop' }, corrupt: corruptStep('format0', 'value', '') },
    { name: 'format returned the wrong selection', law: 'browser editing history', history: { constructed: 'composer-desktop' }, corrupt: corruptStep('format0', 'selection', [0, 0]) },
    { name: 'format lost textarea focus', law: 'browser editing history', history: { constructed: 'composer-desktop' }, corrupt: corruptStep('format0', 'focused', false) },
    { name: 'React resurrected the undone edit', law: 'browser editing history', history: { constructed: 'composer-desktop' }, corrupt: corruptStep('undoneState', 'value', '') },
    { name: 'preview lost a nested sibling', law: 'browser editing history', history: { constructed: 'list-desktop' }, corrupt: corruptStep('sibling', 'nested', []) },
    { name: 'key typing lost a link target character', law: 'browser editing history', history: { constructed: 'composer-character-target-desktop' }, corrupt: corruptStep('target', 'value', 'see [this](https://x.example)') },
    { name: 'key typing returned the wrong target caret', law: 'browser editing history', history: { constructed: 'composer-character-target-desktop' }, corrupt: corruptStep('target', 'selection', [0, 0]) },
    { name: 'key typing lost textarea focus', law: 'browser editing history', history: { constructed: 'composer-character-target-desktop' }, corrupt: corruptStep('target', 'focused', false) },
    { name: 'native Shift+Enter inserted hard-break marker', law: 'browser editing history', history: { constructed: 'newline-main-shift-enter' }, corrupt: corruptStep('newline', 'value', 'Tyger Tyger, burning bright.\\\n') },
    { name: 'native newline failed to collapse selection after insertion', law: 'browser editing history', history: { constructed: 'newline-editor-2' }, corrupt: corruptStep('newline', 'selection', [0, 0]) },
    { name: 'native newline was intercepted by formatter', law: 'browser editing history', history: { constructed: 'newline-editor-2' }, corrupt: trace => trace.map(item => item.checkpoint === 'newline' ? { ...item, value: { ...(item.value as Step), keyInput: { ...(item.value as Step).keyInput!, defaultPrevented: true } } } : item) },
    { name: 'native newline rendered a hard break', law: 'browser editing history', history: { constructed: 'newline-main-shift-enter' }, corrupt: corruptStep('newlineContinuation', 'breaks', 1) },
    { name: 'direct native newline lost continuation', law: 'browser editing history', history: { constructed: 'newline-main-shift-enter-direct' }, corrupt: corruptStep('newlineContinuation', 'value', '') },
    { name: 'hard-break undo retained rendered break', law: 'browser editing history', history: { constructed: 'hard-break-selection-history-Enter' }, corrupt: corruptStep('breakUndo', 'breaks', 1) },
    { name: 'hard-break redo lost rendered break', law: 'browser editing history', history: { constructed: 'hard-break-selection-history-Space' }, corrupt: corruptStep('breakRedo', 'breaks', 0) },
    { name: 'simulated iPad platform was not delivered', law: 'browser editing history', history: { constructed: 'newline-ipad-shift-enter-full-stop' }, corrupt: corruptStep('newline', 'platform', 'not IPAD') },
    { name: 'structural receiving lost password-form arrival', law: 'browser receiving premise', history: { constructed: 'receiving-list-desktop' }, corrupt: trace => trace.filter(item => item.checkpoint !== 'receivingSetup') },
    { name: 'structural receiving loaded body instead of whole source', law: 'browser receiving premise', history: { constructed: 'receiving-list-desktop' }, corrupt: corruptStep('loadedStructural', 'value', 'apples') },
    { name: 'loaded direct native newline lost continuation', law: 'browser editing history', history: { constructed: 'receiving-newline-full-stop-desktop' }, corrupt: corruptStep('newlineContinuation', 'value', '') },
    { name: 'structural typing lost LF Enter receipt', law: 'browser receiving premise', history: { constructed: 'receiving-list-desktop' }, corrupt: trace => trace.map(item => item.checkpoint === 'siblingDelivery'
      ? { ...item, value: { ...(item.value as StructuralTypingReceipt), events: (item.value as StructuralTypingReceipt).events.filter(event => event.key !== 'Enter') } } : item) },
    { name: 'structural receiving delivery preceded acquisition', law: 'browser receiving premise', history: { constructed: 'receiving-list-desktop' }, corrupt: trace => {
      const receipt = trace.find(item => item.checkpoint === 'siblingDelivery')!;
      const moved = trace.filter(item => item.checkpoint !== 'siblingDelivery');
      moved.splice(moved.findIndex(item => item.checkpoint === 'receivingSetup') + 1, 0, receipt);
      return moved;
    } },

  ],
});
