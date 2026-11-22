/**
 * This oracle owns source and selection across freely interleaved actions in
 * the real full editor. Each browser action consumes a modeled input range;
 * every intermediate source/caret is judged before another action can hide it.
 * Public input receipts precede each command and preserve the exact chosen
 * source; sufficient list indentation and literal-code fences are allowed
 * representation relations. Selected list ranges retain every selected
 * parent-child link while their roots move below the preceding sibling;
 * ordered restart changes only the first selected marker, keeping its padding.
 * Continuity links each full output to the next pre-command input. Actual
 * textarea Tab/Shift+Tab histories also record focused range delivery, trusted
 * native key/modifier identity and whether the accepted edit consumed the key.
 *
 * bold(); type(); italic(); link() // → each edit consumes the prior content
 * indent(); break(); type(); code() // → structure and typing share one document
 * formula(); select(); paste(url) // → explicit ranges and completed links compose
 * bold(); italic(); undo(); formula(); redo() // → abandoned formatting cannot return
 *
 * Why can an individually correct command fail in a sequence? Its selection is
 * the next command's input, and React must receive native edits before a later
 * toolbar action reads them. For every legal mixed history, each accepted edit
 * obeys its adopted command law over the current input document; typing replaces
 * its range, paste links selected text, and Undo/Redo of app-applied formatting
 * restores the source on its branch. Enter/Space toolbar activation must deliver the same command.
 *
 * Authority: decision by Kyle Mathews (GitHub KyleAMathews),2026-11-18: strengthen
 * arbitrary mixed actions over the adopted independent formatting models,
 * including paragraph/Unicode boundaries and undo followed by new edits.
 * The input reducer reuses the independent emphasis/link/formula/list models.
 * Constructive two-through-four-item list scenes carry a declared preorder
 * forest; input parser ancestry supplies the receiving premise, and the command
 * inserts the preceding item before every selected ancestor chain. The first
 * subsequent public input binds the complete permitted serialization.
 * Row annotations come from model text; an independent Markdown parser supplies
 * literal-code regions for break semantics. Constructive quote/list inputs
 * supply opener/body/closer/parent-ended roles to the existing parser and real
 * hard-break toolbar receiver; continuation prefixes are already source input.
 * Decision by Kyle Mathews (GitHub KyleAMathews), 2026-11-21: follow main;
 * break actions retain their command semantics via click/Enter/Space toolbar
 * activation. Separate native-newline actions interleave real Enter/Shift+Enter
 * with selection, formatting, syntax contexts and continuation.
 * They splice exactly LF, record trusted target/modifier/default-prevention
 * receipt, and remain distinct from the hard-break toolbar command.
 * Only pre-command public inputs instantiate previously permitted choices;
 * no step output predicts an answer. The driver runs actual native keys, React listeners, toolbar and paste.
 * Native history uses the separately witnessed host event boundary throughout.
 *
 * Limits: twelve actions, bounded source alphabet, full editor only. Default
 * triple-fence serialization is exact only for tick-free selections. A selected
 * collision admits any valid literal fence preserving body and context; later
 * actions consume its exact chosen source and selection. Native undo
 * stops at no-op transactions, browser-default typing/newlines and DOM paste,
 * whose engine history is outside the application promise; forced
 * fallback histories never promise undo. Undo selection itself is unconstrained;
 * the next public caret resolves the original current-range intent. This oracle does not claim an
 * arbitrary Markdown document or OS clipboard/preview coverage. Container
 * inputs have at most two quote levels and one list, and retain the bounded
 * mixed text alphabet plus quote/fence markers; they add no automatic
 * continuation-prefix or smart-Enter promise.
 */
import { differs, oracleProperty, pass } from '@tanstack/oracles';
import { mixedArbitrary, mixedCases, mixedModel, mixedPlan, mixedStates, publicState } from './editor-oracles/mixed-model-oracle.ts';
import { mixedDriver } from './editor-oracles/mixed-driver-oracle.ts';
import { traceValue } from './editor-oracles/document-oracle.ts';
import { checkMixedPrefix, mixedCheckpoints } from './editor-oracles/mixed-check-oracle.ts';
const law = 'mixed browser editing history';
oracleProperty({
  id: 'editor-browser-mixed', owns: ['src/ui/format-shortcuts.ts#onFormatKey', 'src/ui/format-shortcuts.ts#applyEdit', 'src/ui/format-shortcuts.ts#codeBlockEdit', 'src/ui/format-shortcuts.ts#formulaEdit', 'src/ui/links.ts#insertLink'],
  law: { statement: 'For every legal mixed action history, source and selection obey the adopted per-command models after every action, including preservation of every selected list parent-child link when indenting a range, typing/paste use the prior input document, and Undo/Redo of app-applied formatting respects the remaining branch.', authority: 'Decision by Kyle Mathews (GitHub KyleAMathews),2026-11-18: arbitrary mixed-action browser histories, Unicode/paragraph boundaries and undo followed by a new edit, retaining adopted command guarantees; decision by Kyle Mathews (GitHub KyleAMathews),2026-11-21: follow main, native Enter/Shift+Enter insert ordinary newlines while toolbar break retains its Markdown command semantics; 2026-11-22: browser-native Undo defects are outside this application promise.', limits: 'Twelve actions, bounded source alphabet, full editor; constructive selected-list scenes contain two through four one-line items, 1–9 digit preceding parents and space/tab marker/indentation recipes. Their complete selected ancestry is checked; unselected descendants and arbitrary code-containing list bodies are not established; tick-free default code serialization; selected collisions permit any valid literal fence preserving exact body/context and body selection. Native undo only for app-applied changed-source formatting transactions up to no-op/default-typing/default-newline/DOM-paste boundaries; no native undo after forced fallback. Constructive fenced-container scenes add at most two quote levels and one bullet or 1–9 digit list, with the existing bounded text alphabet plus quote/fence markers, 16 selected code points and 64 suffix code points. No automatic continuation prefix. No arbitrary Markdown, OS clipboard or preview claim; undo caret is unconstrained.' },
  histories: { arbitrary: mixedArbitrary, runs: 25, fixedSeeds: [20261118], states: [...new Set(Object.values(mixedCases).flatMap(h => mixedStates(mixedPlan(h))))], constructed: Object.entries(mixedCases).map(([name, h]) => ({ name, enters: mixedStates(mixedPlan(h)), build: () => h })) },
  resolve: mixedPlan, model: mixedModel, reached: mixedStates, driver: mixedDriver,
  check: (p, trace, expected) => checkMixedPrefix(p, trace, expected, law)
    ?? differs('errors', law, traceValue(trace, 'errors'), [])
    ?? differs('errors', law, trace.map(o => o.checkpoint), [...mixedCheckpoints(p), 'errors']) ?? pass,
  calibrations: [
    { name: 'mixed native Shift+Enter inserted hard-break source', law, difference: 'step1.state', history: { constructed: 'native-newline-Shift+Enter-prose-true' }, corrupt: trace => trace.map(o => o.checkpoint === 'step1' ? { ...o, value: { ...(o.value as object), value: 'wrong hard-break source' } } : o) },
    { name: 'mixed native Shift+Enter was intercepted', law, difference: 'key1.receiving', history: { constructed: 'native-newline-Shift+Enter-prose-true' }, corrupt: trace => trace.map(o => o.checkpoint === 'key1' ? { ...o, value: { ...(o.value as { event: object }), event: { ...(o.value as { event: object }).event, defaultPrevented: true } } } : o) },
    { name: 'container code receives a literal hard-break backslash', law, history: { constructed: 'fence-container-bullet-body-continuation-opener-false-true' }, corrupt: trace => trace.map(o => {
      if (o.checkpoint !== 'step0') return o;
      const state = o.value as { value: string; selection: number[] };
      return { ...o, value: { ...state, value: state.value.slice(0, 17) + '\\' + state.value.slice(17) } };
    }) },
    { name: 'selected collision action collapses requested range', law, difference: 'input0.action', history: { constructed: 'code-continuation-false-true' }, corrupt: trace => trace.map(o => {
      if (o.checkpoint !== 'input0') return o;
      const input = o.value as { action: { range: number[] } };
      return { ...o, value: { ...(o.value as object), action: { ...input.action, range: [0, 0] } } };
    }) },
    { name: 'selected code truncation persists into next input', law, difference: 'step0.state', history: { constructed: 'code-continuation-false-true' }, corrupt: trace => {
      const prior = traceValue(trace, 'step0') as { value: string; selection: number[] };
      const [start, end] = prior.selection as [number, number];
      const value = prior.value.slice(0, start) + prior.value.slice(start + 1);
      return trace.map(o => o.checkpoint === 'step0' || o.checkpoint === 'input1'
        ? { ...o, value: { ...(o.value as object), value, selection: [start, end - 1] } } : o);
    } },
    { name: 'next action uses fixed fence width offsets', law, difference: 'input1.action', history: { constructed: 'code-continuation-false-true' }, corrupt: trace => trace.map(o => {
      if (o.checkpoint !== 'input1') return o;
      const input = o.value as { action: { range: number[] } };
      return { ...o, value: { ...(o.value as object), action: { ...input.action, range: input.action.range.map(at => at - 1) } } };
    }) },
    { name: 'redo substitutes another valid fence spelling', law, difference: 'step2.state', history: { constructed: 'code-history-false-true' }, corrupt: trace => trace.map(o => {
      if (o.checkpoint !== 'step2') return o;
      const state = o.value as { value: string; selection: number[] };
      const lines = state.value.split('\n'), marker = lines[0]![0] === '`' ? '~' : '`';
      lines[0] = marker.repeat(20); lines[lines.length - 1] = marker.repeat(20);
      return { ...o, value: { ...(o.value as object), value: lines.join('\n') } };
    }) },
    { name: 'selected code context is changed', law, difference: 'step0.state', history: { constructed: 'code-context-false-true' }, corrupt: trace => trace.map(o => o.checkpoint === 'step0'
      ? { ...o, value: { ...(o.value as { value: string }), value: 'x' + (o.value as { value: string }).value.slice(1) } } : o) },
    { name: 'selected code has mismatched closing delimiter', law, difference: 'step0.state', history: { constructed: 'code-continuation-false-true' }, corrupt: trace => trace.map(o => {
      if (o.checkpoint !== 'step0') return o;
      const state = o.value as { value: string; selection: number[] }, at = state.selection[1]! + 1;
      const marker = state.value[at] === '`' ? '~' : '`';
      return { ...o, value: { ...(o.value as object), value: state.value.slice(0, at) + marker + state.value.slice(at + 1) } };
    }) },
    { name: 'selected code browser error is retained', law, difference: 'the observed value differs from the owed value', history: { constructed: 'code-continuation-false-true' }, corrupt: trace => trace.map(o => o.checkpoint === 'errors'
      ? { ...o, value: [new Error('selected-code receiving failure')] } : o) },
    { name: 'selected child flattened before its next input', law, difference: 'step2.state', history: { constructed: 'selected-ancestry-tabs-false-true' }, corrupt: trace => {
      const prior = traceValue(trace, 'step2') as { value: string; selection: number[] }, lines = prior.value.split('\n');
      const indent = /^[ \t]*/.exec(lines[2]!)![0]; lines[3] = indent + lines[3]!.trimStart();
      const value = lines.join('\n'), selection = [prior.selection[0]!, value.length];
      return trace.map(o => o.checkpoint === 'step2' || o.checkpoint === 'input3' ? { ...o, value: { ...(o.value as object), value, selection } } : o);
    } },
    { name: 'native Tab receipt lost', law, history: { constructed: 'siblings-empty-tab-spaces-false-true-shortcut' }, corrupt: trace => trace.map(o => o.checkpoint === 'key1' ? { ...o, value: undefined } : o) },
    { name: 'native Tab begins away from textarea', law, history: { constructed: 'siblings-empty-tab-spaces-false-true-shortcut' }, corrupt: trace => trace.map(o => o.checkpoint === 'key1' ? { ...o, value: { ...(o.value as { before: object }), before: { ...(o.value as { before: object }).before, focused: false } } } : o) },
    { name: 'accepted Tab escapes to native focus traversal', law, history: { constructed: 'siblings-empty-tab-spaces-false-true-shortcut' }, corrupt: trace => trace.map(o => o.checkpoint === 'key1' ? { ...o, value: { ...(o.value as { event: object }), event: { ...(o.value as { event: object }).event, defaultPrevented: false } } } : o) },
    { name: 'prior source lost', law, history: { constructed: 'inline-false-true' }, corrupt: trace => trace.map(o => o.checkpoint === 'step1' ? { ...o, value: { ...(o.value as object), value: '' } } : o) },
    { name: 'selection drift before next action', law, history: { constructed: 'selection' }, corrupt: trace => trace.map(o => o.checkpoint === 'step1' ? { ...o, value: { ...(o.value as object), selection: [0, 0] } } : o) },
    { name: 'pre-command source skips previous output', law, history: { constructed: 'selection' }, corrupt: trace => trace.map(o => o.checkpoint === 'input1' ? { ...o, value: { ...(o.value as object), value: 'drift' } } : o) },
    { name: 'resolved action loses original intent', law, history: { constructed: 'selection' }, corrupt: trace => trace.map(o => o.checkpoint === 'input1' ? { ...o, value: { ...(o.value as { action: object }), action: { ...(o.value as { action: object }).action, range: [0, 0] } } } : o) },
    { name: 'delivered selection differs from resolved range', law, history: { constructed: 'selection' }, corrupt: trace => trace.map(o => o.checkpoint === 'input1' ? { ...o, value: { ...(o.value as object), delivered: { ...(o.value as { delivered: object }).delivered, selection: [0, 0] } } } : o) },
    { name: 'insufficient indentation persists into next input', law, history: { constructed: 'padding-space-false-true' }, corrupt: trace => trace.map(o => {
      if (o.checkpoint !== 'step1' && o.checkpoint !== 'input2') return o;
      const input = o.value as { value: string; selection: number[] }, value = input.value.split('\n').map((line, index) => index === 1 ? '    ' + line.trimStart() : line).join('\n');
      return { ...o, value: { ...(o.value as object), value, selection: [value.length, value.length] } };
    }) },
    { name: 'redo loses chosen indentation source', law, history: { constructed: 'padding-space-false-true' }, corrupt: trace => trace.map(o => {
      if (o.checkpoint !== 'step3') return o;
      const state = o.value as { value: string; selection: number[] }, lines = state.value.split('\n');
      const prior = /^[ \t]*/.exec(lines[1]!)![0], prefix = prior === '      ' ? '       ' : '      ';
      lines[1] = prefix + lines[1]!.trimStart();
      const value = lines.join('\n'), start = lines[0]!.length + 1, delta = prefix.length - prior.length;
      const selection = state.selection.map(at => at <= start ? at : Math.max(start, at + delta));
      return { ...o, value: { ...(o.value as object), value, selection } };
    }) },
    { name: 'redo returns abandoned branch', law, history: { constructed: 'formatting-branch' }, corrupt: trace => trace.map(o => o.checkpoint === 'step4' ? { ...o, value: { ...(o.value as object), value: 'abandoned' } } : o) },
  ],
});

// A colliding selection is an allowed family of fence spellings, not a default
// string to pin. This receiver separately observes actual rendered code; the
// general mixed relation above retains arbitrary continuations after that edit.
import { mixedCodeArbitrary, mixedCodeCases, mixedCodeModel, mixedCodePlan, mixedCodeStates } from './editor-oracles/mixed-code-model-oracle.ts';
import { mixedCodeDriver } from './editor-oracles/mixed-code-driver-oracle.ts';
oracleProperty({
  id: 'editor-browser-mixed-code', owns: ['src/ui/format-shortcuts.ts#codeBlockEdit', 'src/ui/format-shortcuts.ts#applyEdit', 'src/ui/format-shortcuts.ts#onFormatKey'],
  law: { statement: 'After every legal mixed prefix, putting a selected fence-containing document in a code block preserves that source literally, selects its body and renders exactly one literal code block through the actual editor.', authority: 'Adopted selected-source code-block law, src/ui/authoring.tsx code button: “Put the selected lines in a code block”; Decision by Kyle Mathews (GitHub KyleAMathews),2026-11-18: arbitrary mixed-action browser strengthening.', limits: 'Twelve-action prefix and appended literal collision; ends at selected-code rendering. Fence width/marker remain free within a valid enclosing fence; subsequent edits after that free-width serialization are outside this property. Full editor desktop/small viewport, existing mixed-prefix native/fallback limits.' },
  histories: { arbitrary: mixedCodeArbitrary, runs: 25, fixedSeeds: [20261118], states: [...new Set(Object.values(mixedCodeCases).flatMap(h => mixedCodeStates(mixedCodePlan(h))))], constructed: Object.entries(mixedCodeCases).map(([name, h]) => ({ name, enters: mixedCodeStates(mixedCodePlan(h)), build: () => h })) },
  resolve: mixedCodePlan, model: mixedCodeModel, reached: mixedCodeStates, driver: mixedCodeDriver,
  check: (p, trace, expected) => {
    const prefix = checkMixedPrefix(p.prefix, trace, expected.prefix, 'mixed literal-code receipt'); if (prefix) return prefix;
    const final = publicState(traceValue(trace, 'step' + (p.prefix.actions.length - 1)));
    const preInput = differs('collisionPreInput', 'mixed literal-code receipt', publicState(traceValue(trace, 'collisionPreInput')), final, 'collisionPreInput.continuity'); if (preInput) return preInput;
    const admitted = differs('collisionPreInput', 'mixed literal-code receipt', expected.preInputAllowed, true, 'collisionPreInput.allowed'); if (admitted) return admitted;
    for (const [checkpoint, value] of [['collisionInput', expected.input], ['collisionSelection', expected.selection], ['collisionRendered', expected.rendered], ['errors', []]] as const) {
      const failure = differs(checkpoint, 'mixed literal-code receipt', traceValue(trace, checkpoint), value); if (failure) return failure;
    }
    const envelope = traceValue(trace, 'collisionEnvelope') as { before: string; after: string } | undefined;
    const opening = envelope && /^ {0,3}(`{3,}|~{3,})[ \t]*\n$/.exec(envelope.before);
    const closing = envelope && /^\n {0,3}(`{3,}|~{3,})[ \t]*$/.exec(envelope.after);
    const enclosed = !!opening && !!closing && opening[1]![0] === closing[1]![0] && closing[1]!.length >= opening[1]!.length;
    return differs('collisionEnvelope', 'mixed literal-code receipt', enclosed, true) ?? differs('errors', 'mixed literal-code receipt', trace.map(o => o.checkpoint), [...mixedCheckpoints(p.prefix), 'collisionPreInput', 'collisionInput', 'collisionSelection', 'collisionEnvelope', 'collisionRendered', 'errors']) ?? pass;
  },
  calibrations: [
    { name: 'mixed collision truncates selected source', law: 'mixed literal-code receipt', history: { constructed: 'click-false' }, corrupt: trace => trace.map(o => o.checkpoint === 'collisionRendered' ? { ...o, value: { blocks: ['lost'], children: 1 } } : o) },
    { name: 'collision prefix changes before suffix insertion', law: 'mixed literal-code receipt', history: { constructed: 'padding-space-false-true' }, corrupt: trace => trace.map(o => o.checkpoint === 'collisionPreInput' ? { ...o, value: { ...(o.value as object), value: 'drift' } } : o) },
    { name: 'mixed collision caret outside body', law: 'mixed literal-code receipt', history: { constructed: 'Enter-false' }, corrupt: trace => trace.map(o => o.checkpoint === 'collisionSelection' ? { ...o, value: {} } : o) },
  ],
});
