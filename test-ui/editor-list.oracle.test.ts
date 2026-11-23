/**
 * This oracle owns whole-line list indentation through indentEdit and lineSpan,
 * checked on the returned edit, resulting source, selection and rendered nesting.
 *
 * indentEdit('- a\n- b', 7, 7, false) // → - a\n    - b, caret follows b
 * indentEdit('9. a\n10. b', 10, 10, false) // → first nested number restarts at 1
 * indentEdit('\n    - x', 0, 8, true) // → selected blank line plus - x
 * indentEdit('100. a\n2. b', 11, 11, false) // → a real nested numbered list
 *
 * For every list selection, Tab/Shift+Tab move every touched whole list line,
 * preserve blank lines, and exclude a next line whose start is the selection end.
 * Tab needs a preceding list or indented continuation; a new numbered sublist
 * starts at 1 while an existing numbered sublist keeps the number. Outdent
 * removes up to four spaces or one tab; a caret in removed indentation clamps
 * to the line start. A nonempty selection covers the transformed whole lines.
 * Prose, mixed selections, empty selections with no item, and no-op outdents
 * decline. Valid input never throws. For every supported 1–9 digit numbered
 * parent, indenting a semantic sibling produces a rendered sublist, never code.
 * Every selected item moves one level while keeping its selected ancestors,
 * marker, padding and body; roots become children of that parent,
 * and the whole moved range is selected.
 * Where ordinary four spaces cannot preserve this ancestry, the leading
 * whitespace spelling is free. An item from one enclosing
 * container shallower instead joins the preceding
 * nested list as a peer; the ordinary four-space continuation stays intact.
 *
 * Authority: indentEdit/lineSpan comments and the list/renderer examples in
 * test-ui/format-shortcuts.test.ts at commit
 * 28b0c8d642a87e5810ad6eabd95c2d1714c53396. Decision by Kyle Mathews (GitHub
 * KyleAMathews), 2026-11-18: preserve these list laws and use enough indentation
 * for every supported numbered parent. Four spaces remain the ordinary level.
 *
 * Input line records distinguish marker source, indentation, blank and prose
 * lines before any production call. The model transforms those records and
 * computes selection geometry from their layout, without production's scans or
 * regular expressions. A separate MarkdownIt observation enforces actual nesting
 * across the 99/100 boundary and all supported number widths. The rendered token
 * order keeps the parent and its first child adjacent; it does not prescribe
 * an exact source indent. Padding recipes construct legal paragraph-parent input
 * and reach its column boundaries without reusing production scanners. A bullet
 * item moves under an existing sublist. Outer bullet containers vary independent
 * space/tab prefixes of semantic siblings, including unequal marker columns.
 * The initial parser observation verifies each containing-item relationship
 * before Tab; the model predicts the resulting ancestry directly. Lazy outer
 * paragraphs, repeated inline markers and padded empty items distinguish a
 * sibling from a one-container-shallower continuation. Range histories vary two
 * through four peers or selected ancestors and their independent spellings; the model
 * predicts their complete order and bodies. Constructed cases rebuild every original
 * caret, range, decline and renderer witness, with its exact surrounding source.
 * Source histories vary one or two unselected trailing blank lines, with zero
 * through four raw spaces/tabs, at EOF or before a bullet/numbered sibling.
 * Source histories also couple a selected numbered restart to its selected
 * descendant. This semantic lane requires nonempty one-line paragraph bodies,
 * matching the rendered forest grammar. Every descendant must be selected,
 * and every direct paragraph must end on its item line; outside lazy body text
 * and other blocks retain the ordinary exact lane. Empty-marker ranges keep their
 * exact ordinary source obligation. The ordinary full edit stays exact when it preserves that tree;
 * otherwise only final leading whitespace is free, while row cores, blank and
 * outside bytes, replacement bounds and the whole moved selection stay exact.
 *
 * Ordinary source bounds: four selected rows, eight leading spaces or tabs, 24 body
 * letters/spaces and explicit prose. Source contexts include EOF, following list
 * items and bullet/numbered parents. Rendering covers all nine numeric widths
 * with zero/leading-zero marker spellings, all three bullet parents/children, and
 * independent child delimiters. All space/tab spellings advance one through
 * four visual columns of text-parent padding. Empty parents may also omit
 * padding entirely and contribute no paragraph text to the expected tree.
 * The existing three-line bullet sublist retains its original one-space gaps.
 * A two-column outer bullet admits parent column four and child columns three
 * through five, with empty outer text or a blank after its text paragraph.
 * Lazy paragraphs and padded empty outer items use parent column four; repeated
 * inline bullet markers use column six. Each also varies a selected item
 * one containing item shallower, preserving its peer continuation. Rendering
 * ranges contain two through four selected items: flat semantic peers and every
 * preorder forest with a selected parent-child edge. Constructive ancestry is
 * independent of raw space/tab spellings through 34 columns; all selected links
 * survive the move, including after a 1–9 digit selected root restarts to 1.
 * Unselected descendants and arbitrary code-containing list bodies are not
 * established by this bounded rendering grammar.
 * Zero padding before a nonempty body is not a list marker; padding beyond four
 * columns can introduce a code subtree, outside this tight paragraph-parent scene.
 * Arbitrary UTF-16 totality is separate. Keyboard and real-browser oracles
 * check focus, native editing and undo.
 */
import { differs, oracleProperty, pass } from '@tanstack/oracles';
import MarkdownIt from 'markdown-it';
import { browserCall } from './editor-oracles/browser-driver-oracle.ts';
import { traceValue as at } from './editor-oracles/document-oracle.ts';
import { arbitrary, cases, nestingArbitrary, nestingCases, nestingModel, nestingPlan, nestStates, resolve, selectedTree } from './editor-oracles/list-model-oracle.ts';
import { checkSourceResult, ordinarySpacingCorruption, sourceCases, sourceModel, sourceOrdinaryCorruption, sourceStates } from './editor-oracles/list-source-model-oracle.ts';


const authority = 'src/ui/format-shortcuts.ts indentEdit/lineSpan comments; test-ui/format-shortcuts.test.ts at commit 28b0c8d642a87e5810ad6eabd95c2d1714c53396; decision by Kyle Mathews (GitHub KyleAMathews), 2026-11-18: whole-line list laws and enough indentation for all supported 1–9 digit parents.';

const sourceConstructions = { ...cases, ...sourceCases };

oracleProperty({
  id: 'editor-list-source', owns: ['src/ui/format-shortcuts.ts#indentEdit'],
  law: { statement: 'For every list selection, indent/outdent whole touched list lines with numbered restart/continuation, preserve blanks and outside source, preserve every selected ancestor link when moving a complete selected forest of nonempty paragraphs under its preceding sibling, decline impossible moves, and preserve the intended caret or whole-line selection without throwing.', authority, limits: 'Four rows, indentation variants through eight spaces and tabs, 24 body letters/spaces and explicit prose, EOF or following-list contexts. Ordinary numeric parents are 1, 9 and 99; wide numeric parents are checked by the nesting property. Complete parsed selected forests of nonempty paragraph bodies may vary final leading whitespace only when the ordinary source answer would lose selected ancestry; all other source fields stay exact.' },
  histories: { arbitrary, runs: 100, fixedSeeds: [20261118], states: [...new Set(Object.values(sourceConstructions).flatMap(h => sourceStates(resolve(h))))], constructed: Object.entries(sourceConstructions).map(([name, history]) => ({ name, enters: sourceStates(resolve(history)), build: () => history })) },
  resolve, model: sourceModel, reached: sourceStates,
  driver: async (p, observe) => {
    const response = await browserCall('indentEdit', [p.text, p.from, p.to, p.history.out]);
    if (response.error) { observe('error', response.error); return; }
    const edit = response.value!; observe('result', { edit, output: edit ? p.text.slice(0, edit.from) + edit.insert + p.text.slice(edit.to) : p.text });

  },
  check: (p, trace, expected) => checkSourceResult(p, at(trace, 'result'), expected) ?? differs('error', 'list source and selection', at(trace, 'error'), undefined) ?? pass,
  calibrations: [
    { name: 'lost list edit', law: 'list source and selection', history: { constructed: 'bullet' }, corrupt: trace => trace.map(o => o.checkpoint === 'result' ? { ...o, value: null } : o) },
    { name: 'ordinary restart turns the selected child into code', law: 'list source and selection', history: { constructed: 'sourceSelectedRestart10Upper' }, corrupt: (trace, p) => trace.map(o => o.checkpoint === 'result' ? { ...o, value: sourceOrdinaryCorruption(p) } : o) },
    { name: 'ordinary four-space source remains exact', law: 'list source and selection', history: { constructed: 'bullet' }, corrupt: (trace, p) => trace.map(o => o.checkpoint === 'result' ? { ...o, value: ordinarySpacingCorruption(p) } : o) },
    { name: 'outside blank does not hide selected ancestry', law: 'list source and selection', history: { constructed: 'sourceTrailingBlank-restart-empty' }, corrupt: (trace, p) => trace.map(o => o.checkpoint === 'result' ? { ...o, value: sourceOrdinaryCorruption(p) } : o) },
    { name: 'outside trailing blank bytes remain outside the edit', law: 'list source and selection', history: { constructed: 'sourceTrailingBlank-ordinary-tabs' }, corrupt: (trace, p) => trace.map(o => {
      if (o.checkpoint !== 'result') return o;
      const value = o.value as { edit: { from: number; to: number; insert: string; start: number; end: number }; output: string };
      const edit = { ...value.edit, to: p.text.length };
      return { ...o, value: { ...value, edit, output: p.text.slice(0, edit.from) + edit.insert + p.text.slice(edit.to) } };
    }) },
  ],
});


const md = new MarkdownIt();

// The initial token maps and open-item ancestry verify input legality; no
// production result supplies this premise or the expected transformed tree.
function siblingPremise(source: string, parentLine: number, peerCount: number) {
  const stack: { line: number; ancestors: number[]; body: string }[] = [], items: typeof stack = [];
  for (const token of md.parse(source, {})) {
    if (token.type === 'list_item_open') {
      const item = { line: token.map?.[0] ?? -1, ancestors: stack.map(item => item.line), body: '' };
      stack.push(item); items.push(item);
    } else if (token.type === 'list_item_close') stack.pop();
    else if (token.type === 'inline' && stack.length) stack.at(-1)!.body += token.content;
  }
  const parent = items.find(item => item.line === parentLine), child = items.find(item => item.line === parentLine + 1);
  const siblings = !!parent && !!child && JSON.stringify(parent.ancestors) === JSON.stringify(child.ancestors);
  const oneShallower = !!parent && !!child && parent.ancestors.length === child.ancestors.length + 1 && JSON.stringify(parent.ancestors.slice(0, -1)) === JSON.stringify(child.ancestors);
  return { siblings, oneShallower, parentBody: parent?.body, childBody: child?.body, ...(peerCount > 1 ? {
    peers: Array.from({ length: peerCount - 1 }, (_, index) => { const peer = items.find(item => item.line === parentLine + 2 + index); return {
      siblings: !!parent && !!peer && JSON.stringify(parent.ancestors) === JSON.stringify(peer.ancestors), body: peer?.body,
    }; }),
  } : {}) };
}

// Actual parser items are observations. Expected identities and links come
// from selectedTree's declared input forest, never this parser traversal.
function itemTree(tokens: ReturnType<typeof md.parse>) {
  const stack: { line: number; ancestors: number[]; body: string }[] = [], items: typeof stack = [];
  for (const token of tokens) {
    if (token.type === 'list_item_open') {
      const item = { line: token.map?.[0] ?? -1, ancestors: stack.map(item => item.line), body: '' };
      stack.push(item); items.push(item);
    } else if (token.type === 'list_item_close') stack.pop();
    else if (token.type === 'inline' && stack.length) stack.at(-1)!.body += token.content;
  }
  return items;
}

oracleProperty({
  id: 'editor-list-rendering', owns: ['src/ui/format-shortcuts.ts#indentEdit'],
  law: { statement: 'For every supported selected list item or range, indenting it preserves every body, marker padding and link between selected ancestors and descendants, applies the adopted first-number restart and creates the intended rendered ancestry: below a preceding semantic sibling, or beside a preceding nested item when continuing from one container shallower; it returns a caret after one item or selects every transformed row of a range without throwing.', authority, limits: 'Parent/child pair with 1–9 digit ordered markers, all three bullet parents and children; zero and leading-zero digit spellings, independent parent/child ordered delimiters, twelve child-body letters, parent body a, b or empty, and all space/tab parent-gap spellings advancing one through four visual columns. Flat inputs and a two-column outer bullet with parent column four and independent space/tab child prefixes at columns three through five; empty outer item or a blank after outer text establishes legal sibling lists. Lazy paragraphs, padded empty outer markers and inline repeated bullet markers vary same-container siblings and one-container-shallower continuations; their parent columns are four or six. Empty parents also admit zero raw padding and contain no paragraph inline text. Zero padding before nonempty parent text is not this list premise; larger padding can introduce an existing code subtree, which this paragraph-parent grammar does not establish. An existing hyphen sublist retains its original gap and covers a third bullet level. Ranges contain two through four initially flat bullet peers with independent original prefixes in a one-column band; each peer body contains up to twelve letters. Their whole transformed rows remain selected, while sufficient leading whitespace is free. Selected ancestry ranges contain two through four one-line items in every preorder forest with at least one selected parent-child link; roots share a one-column sibling band, descendant markers start zero or one column beyond their containing item content floor, descendant ordered lists start at 1, and each marker gap advances one through four cells. Space/tab spellings, first ordered restart, 1–9 digit parent widths and parent padding vary independently. Unselected descendants and code-containing list bodies remain outside this bounded rendering grammar; ordinary source range laws remain separately checked.' },
  histories: { arbitrary: nestingArbitrary, runs: 100, fixedSeeds: [20261118], states: [...new Set(Object.values(nestingCases).flatMap(nestStates))], constructed: Object.entries(nestingCases).map(([name, h]) => ({ name, enters: nestStates(h), build: () => h })) },
  resolve: nestingPlan, model: nestingModel,
  reached: p => nestStates(p.h),
  driver: async (p, observe) => {
    if (p.h.outer) observe('initial', p.h.selectedTail ? itemTree(md.parse(p.text, {})) : siblingPremise(p.text, p.parentLine, 1 + (p.h.peers?.length ?? 0)));
    const response = await browserCall('indentEdit', [p.text, p.from, p.to, false]);
    if (response.error) { observe('error', response.error); return; }
    const e = response.value!;
    if (!e) { observe('result', null); return; }
    const output = p.text.slice(0, e.from) + e.insert + p.text.slice(e.to), tokens = md.parse(output, {});
    const structure = p.h.selectedTail ? itemTree(tokens) : tokens.filter(t => ['ordered_list_open', 'ordered_list_close', 'bullet_list_open', 'bullet_list_close', 'list_item_open', 'list_item_close', 'inline'].includes(t.type)).map(t => t.type === 'inline' ? 'inline:' + t.content : t.type);
    const listTokens = ['ordered_list_open', 'ordered_list_close', 'bullet_list_open', 'bullet_list_close', 'list_item_open', 'list_item_close'];
    const tight = tokens.every(t => listTokens.includes(t.type) || ['paragraph_open', 'paragraph_close'].includes(t.type) && t.hidden || t.type === 'inline' && (t.children ?? []).every(child => child.type === 'text'));
    observe('result', { tight, structure, parentPreserved: output.startsWith(p.prefix), noCode: !tokens.some(t => t.type === 'code_block' || t.type === 'fence'), noPre: !md.renderer.render(tokens, md.options, {}).includes('<pre>'), selected: p.h.peers || p.h.selectedTail ? { lines: output.slice(e.start, e.end).split('\n').map(line => line.trimStart()), coversRows: e.start === p.prefix.length && e.end === output.length } : output.slice(e.start, e.end), caretAtEnd: e.start === output.length && e.end === output.length });
  },
  check: (p, trace, expected) => (p.h.outer ? differs('initial', 'rendered list nesting', at(trace, 'initial'), p.h.selectedTail ? selectedTree(p, false) : { siblings: !p.h.oneShallower, oneShallower: !!p.h.oneShallower, parentBody: p.h.parentBody ?? 'a', childBody: p.h.body, ...(p.h.peers ? { peers: p.h.peers.map(peer => ({ siblings: true, body: peer.body })) } : {}) }) : undefined) ?? differs('result', 'rendered list nesting', at(trace, 'result'), expected) ?? differs('error', 'rendered list nesting', at(trace, 'error'), undefined) ?? pass,
  calibrations: [
    { name: 'selected child is flattened into its parent peer', law: 'rendered list nesting', history: { constructed: 'selectedSubtreeTabs' }, corrupt: trace => trace.map(o => o.checkpoint === 'result' ? { ...o, value: { ...(o.value as object), structure: (o.value as { structure: { line: number; ancestors: number[]; body: string }[] }).structure.map((item, index) => index === 3 ? { ...item, ancestors: item.ancestors.slice(0, -1) } : item) } } : o) },
    { name: 'only the first selected ancestry link survives', law: 'rendered list nesting', history: { constructed: 'selectedAncestryShape4' }, corrupt: trace => trace.map(o => o.checkpoint === 'result' ? { ...o, value: { ...(o.value as object), structure: (o.value as { structure: { line: number; ancestors: number[]; body: string }[] }).structure.map((item, index, items) => index === items.length - 1 ? { ...item, ancestors: item.ancestors.slice(0, -1) } : item) } } : o) },
    { name: 'restart erases selected marker padding', law: 'rendered list nesting', history: { constructed: 'selectedSubtreeNumberRestart' }, corrupt: trace => trace.map(o => o.checkpoint === 'result' ? { ...o, value: { ...(o.value as object), selected: { lines: ['1. b', '- c'], coversRows: true } } } : o) },
    { name: 'item remains prose', law: 'rendered list nesting', history: { constructed: 'number100' }, corrupt: trace => trace.map(o => o.checkpoint === 'result' ? { ...o, value: { ...(o.value as object), structure: [] } } : o) },
    { name: 'later selected peer lost', law: 'rendered list nesting', history: { constructed: 'range-empty-100-spaces-tab' }, corrupt: trace => trace.map(o => o.checkpoint === 'result' ? { ...o, value: { ...(o.value as { structure: string[] }), structure: (o.value as { structure: string[] }).structure.filter(token => token !== 'inline:c') } } : o) },
    { name: 'range skips the first touched indent', law: 'rendered list nesting', history: { constructed: 'range-empty-100-spaces-tab' }, corrupt: trace => trace.map(o => o.checkpoint === 'result' ? { ...o, value: { ...(o.value as object), selected: { lines: ['- b', '- c'], coversRows: false } } } : o) },
  ],
});
