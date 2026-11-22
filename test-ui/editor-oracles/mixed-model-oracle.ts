/** Input-derived command relations; full chosen source survives every continuation. */
import fc from 'fast-check';
import MarkdownIt from 'markdown-it';
import { apply, traceValue, type Edit, type Sample } from './document-oracle.ts';
import { emphasisEdit, multiEdit, row, linkEdit, formulaEdit, type Row } from './inline-model-oracle.ts';
import { moveRows, rowText, nestingPlan, nestingCases, selectedNestingArbitrary, type Nest, type Row as ListRow } from './list-model-oracle.ts';
import type { Observation } from '@tanstack/oracles';
import { insertionModel, insertionPlan } from './link-model-oracle.ts';
import { model as blockModel } from './block-model-oracle.ts';
import { containerInputArbitrary, containerCases, containerInput, containerStates, type FenceContainer } from './break-model-oracle.ts';

const text = fc.string({ unit: fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:/ *$[]()\\.,;+-', 'α', '😀', '\n', '\t'), minLength: 1, maxLength: 24 });
const actionFields = {
  at: fc.constantFrom('current' as const, 'range' as const, 'caret' as const, 'line' as const, 'all' as const, 'end' as const, 'start' as const),
  a: fc.nat(160), b: fc.nat(160), text, activation: fc.constantFrom('click' as const, 'Enter' as const, 'Space' as const),
};
const toolbarAction = fc.record({ kind: fc.constantFrom('bold', 'italic', 'link', 'formula', 'code', 'break', 'indent', 'outdent', 'type', 'paste', 'select', 'undo', 'redo'), ...actionFields });
const shortcutAction = fc.record({ kind: fc.constantFrom('indent' as const, 'outdent' as const), ...actionFields, via: fc.constant('shortcut' as const) });
const newlineAction = fc.record({ kind: fc.constant('newline'), ...actionFields, key: fc.constantFrom('Enter', 'Shift+Enter') });
const ordinaryMixedArbitrary = fc.record({
  mobile: fc.boolean(), native: fc.boolean(), scene: fc.constantFrom('prose', 'list', 'code', 'formula', 'multiline'), body: text,
  actions: fc.array(fc.oneof(toolbarAction, shortcutAction, newlineAction), { minLength: 1, maxLength: 12 }),
});
type OrdinaryMixed = Sample<typeof ordinaryMixedArbitrary>;
export type Intent = OrdinaryMixed['actions'][number];
// Constructive selected-list inputs expose the same bounded source alphabet
// directly, rather than relying on random typing to discover their ancestry.
export type Mixed = OrdinaryMixed | { mobile: boolean; native: boolean; scene: 'list'; selectedTree: Nest; actions: Intent[] }
  | { mobile: boolean; native: boolean; scene: 'code'; fencedContainer: FenceContainer; actions: Intent[] };
const selectedMixedRecipeArbitrary = fc.record({ mobile: fc.boolean(), native: fc.boolean(), tree: selectedNestingArbitrary, shortcut: fc.boolean(), activation: fc.constantFrom('click' as const, 'Enter' as const, 'Space' as const) });
type SelectedMixedRecipe = Sample<typeof selectedMixedRecipeArbitrary>;
// This branch constructs source inputs and action ranges, never expectations.
// The existing independent prefix parser continues to judge each break.
const containerTextUnit = fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:/ *$[]()\\.,;+-', 'α', '😀', '\n', '\t', '>', '`', '~');
const containerMixedRecipeArbitrary = fc.record({ mobile: fc.boolean(), native: fc.boolean(), context: containerInputArbitrary(
  fc.string({ unit: containerTextUnit, maxLength: 16 }), fc.string({ unit: containerTextUnit, maxLength: 64 }),
) });
type ContainerMixedRecipe = Sample<typeof containerMixedRecipeArbitrary>;
export const mixedArbitrary: fc.Arbitrary<Mixed> = fc.oneof(ordinaryMixedArbitrary, selectedMixedRecipeArbitrary.map<Mixed>(selectedMixed, value => {
  if (!value || typeof value !== 'object' || !('selectedTree' in value)) throw new Error('Expected a constructive selected-list history');
  const history = value as Extract<Mixed, { selectedTree: Nest }>;
  const first = history.actions[0]!, recipe = { mobile: history.mobile, native: history.native, tree: history.selectedTree, shortcut: !!shortcutKey(first), activation: first.activation };
  if (!selectedMixedRecipeArbitrary.canShrinkWithoutContext(recipe) || JSON.stringify(history) !== JSON.stringify(selectedMixed(recipe))) throw new Error('Expected selected-list commands and complete source continuity');
  return recipe;
}), containerMixedRecipeArbitrary.map<Mixed>(containerMixed, value => {
  if (!value || typeof value !== 'object' || !('fencedContainer' in value)) throw new Error('Expected a constructive fenced-container history');
  const history = value as Extract<Mixed, { fencedContainer: FenceContainer }>;
  const recipe = { mobile: history.mobile, native: history.native, context: history.fencedContainer };
  if (!containerMixedRecipeArbitrary.canShrinkWithoutContext(recipe) || JSON.stringify(history) !== JSON.stringify(containerMixed(recipe))) throw new Error('Expected container commands and complete source continuity');
  return recipe;
}));
export const shortcutKey = (intent: Intent) => intent.kind === 'newline' ? intent.key : 'via' in intent && intent.via === 'shortcut' ? intent.kind === 'outdent' ? 'Shift+Tab' : 'Tab' : undefined;
export type State = { value: string; selection: number[] };
type HistoryState = State & { undo: State[]; redo: State[]; redoKnown: boolean };
export type MixedAction = Intent & { range: number[] };
export function initial(h: Mixed) {
  if ('fencedContainer' in h) return containerInput(h.fencedContainer).text;
  if ('selectedTree' in h) return nestingPlan(h.selectedTree).text;
  return h.scene === 'list' ? '1. parent\n2. ' + h.body : h.scene === 'code' ? '```\n' + h.body + '\n```'
    : h.scene === 'formula' ? '$$' + h.body + '$$' : h.scene === 'multiline' ? 'first\n\n' + h.body + '\nlast' : h.body;
}
const copy = (s: State): State => ({ value: s.value, selection: [...s.selection] });
const startState = (h: Mixed): State => { const value = initial(h); return { value, selection: [0, value.length] }; };
export function pickRange(s: State, intent: Intent) {
  const boundaries = [0]; for (const c of s.value) boundaries.push(boundaries.at(-1)! + c.length);
  const a = boundaries[intent.a % boundaries.length]!, b = boundaries[intent.b % boundaries.length]!;
  if (intent.at === 'current') return [...s.selection];
  if (intent.at === 'all') return [0, s.value.length];
  if (intent.at === 'end') return [s.value.length, s.value.length];
  if (intent.at === 'start') return [0, 0];
  if (intent.at === 'caret') return [a, a];
  if (intent.at === 'line') return [a === 0 ? 0 : s.value.lastIndexOf('\n', a - 1) + 1, s.value.indexOf('\n', a) < 0 ? s.value.length : s.value.indexOf('\n', a)];
  return [Math.min(a, b), Math.max(a, b)];
}
const run = (s: string, marker: string, reverse = false) => { let n = 0; for (const c of reverse ? [...s].reverse() : s) { if (c !== marker) break; n++; } return n; };
// Tokenize the model's selected row into content, surrounding whitespace and
// delimiter annotations. Marker-only rows have no semantic styled content.
function annotatedRow(s: string): Row {
  const chars = [...s]; let a = 0, b = chars.length;
  while (a < b && !chars[a]!.trim()) a++;
  while (b > a && !chars[b - 1]!.trim()) b--;
  const body = chars.slice(a, b).join('');
  const left = run(body, '*'), right = left === body.length ? 0 : run(body, '*', true);
  return row({ lead: chars.slice(0, a).join(''), tail: chars.slice(b).join(''), left, right, body: body.slice(left, body.length - right) });
}
function listRow(line: string): ListRow {
  let i = 0; while (' \t'.includes(line[i] ?? '\0')) i++;
  const indent = line.slice(0, i), first = i;
  if ('-*+'.includes(line[i] ?? '\0')) i++;
  else {
    while ('0123456789'.includes(line[i] ?? '\0')) i++;
    if (i - first < 1 || i - first > 9 || !'.)'.includes(line[i] ?? '\0')) i = first;
    else i++;
  }
  const marker = line.slice(first, i), gapStart = i;
  while (' \t'.includes(line[i] ?? '\0')) i++;
  const gap = line.slice(gapStart, i), body = line.slice(i);
  return { indent, marker, gap, body, kind: !line.trim() ? 'blank' : marker && (gap || !body) ? 'item' : 'prose' };
}
// markdown-it is an independent Markdown parser here, never the production
// break scanner. Its block maps identify literal code including closing lines.
const parser = new MarkdownIt('commonmark');
function literalAt(value: string, at: number) {
  const starts = [0]; for (let i = 0; i < value.length; i++) if (value[i] === '\n') starts.push(i + 1);
  return parser.parse(value.slice(0, at), {}).some(token => token.type === 'fence' && token.map && at >= starts[token.map[0]]! && at < (starts[token.map[1]] ?? value.length + 1));
}
function change(s: State, action: MixedAction): Edit | null {
  const [from, to] = action.range as [number, number], picked = s.value.slice(from, to);
  const partition = { text: s.value, from, to, h: { prefix: s.value.slice(0, from), picked, suffix: s.value.slice(to) } };
  switch (action.kind) {
    case 'bold': case 'italic': {
      if (picked.includes('\n')) return multiEdit({ text: s.value, from, to, h: { kind: action.kind, before: '', after: '', rows: picked.split('\n').map(annotatedRow) } });
      return emphasisEdit({ text: s.value, from, to, h: { kind: action.kind, row: annotatedRow(picked), before: '', after: '', outsideLeft: run(s.value.slice(0, from), '*', true), outsideRight: run(s.value.slice(to), '*') } });
    }
    case 'link': return linkEdit(partition);
    case 'formula': return formulaEdit(partition);
    case 'newline': return { from, to, insert: '\n', start: from + 1, end: from + 1 };
    case 'type': return { from, to, insert: action.text, start: from + action.text.length, end: from + action.text.length };
    case 'paste': {
      // The receiving operation is URL-over-selection. At a caret the synthetic
      // event has no default insertion, matching the separate workflow law.
      const linked = from === to ? null : insertionModel(insertionPlan({ before: partition.h.prefix, picked, after: partition.h.suffix, url: { raw: 'https://example.com/p?utm_source=x#part?' } }));
      return linked ? { from: 0, to: s.value.length, insert: linked.text, start: linked.caret, end: linked.caret } : null;
    }
    case 'break': {
      const line = partition.h.prefix.split('\n').at(-1)!;
      const slashes = run(line, '\\', true);
      const insert = !line.trim() || literalAt(s.value, from) || slashes % 2 ? '\n' : '\\\n';
      return { from, to, insert, start: from + insert.length, end: from + insert.length };
    }
    case 'code': {
      // Exact default source is promised for tick-free selections; collision
      // spellings use the literal-body relation below and keep their selection.
      const body = picked.endsWith('\n') ? picked.slice(0, -1) : picked;
      const missing = (context: string, n: number) => '\n'.repeat(context ? Math.max(0, 2 - n) : 0);
      const left = missing(partition.h.prefix, run(partition.h.prefix, '\n', true));
      const right = missing(partition.h.suffix, run(partition.h.suffix, '\n'));
      const insert = left + '```\n' + body + '\n```' + right;
      return { from, to, insert, start: from + left.length + 4, end: from + left.length + 4 + body.length };
    }
    case 'indent': case 'outdent': return moveRows(listGeometry(s, action)).edit;
    default: return null;
  }
}
type ListGeometry = Parameters<typeof moveRows>[0];
function listGeometry(s: State, action: MixedAction): ListGeometry {
  const [from, to] = action.range as [number, number];
  const lines = s.value.split('\n'), offsets: number[] = []; let offset = 0;
  for (const line of lines) { offsets.push(offset); offset += line.length + 1; }
  const first = Math.max(0, offsets.filter(start => start <= from).length - 1), last = from === to ? first : Math.max(first, offsets.filter(start => start < to).length - 1);
  let above = first - 1; while (above >= 0 && !lines[above]!.trim()) above--;
  const parent = above < 0 ? null : listRow(lines[above]!.trimEnd());
  return { text: s.value, from, to, rows: lines.slice(first, last + 1).map(listRow), offsets: offsets.slice(first, last + 1), parent, out: action.kind === 'outdent' };
}

// CommonMark whitespace cells, independent of production's indentation choice.
// A tab ends at the next multiple of four; existing raw indentation is retained.
export function columns(raw: string, start = 0) {
  let end = start;
  for (const character of raw) end = character === '\t' ? 4 * (Math.floor(end / 4) + 1) : end + 1;
  return end;
}
// A selected tree additionally records each selected item's original ancestors.
// Public input supplies this premise; the promised move inserts the preceding
// item before those selected links, rather than reclassifying the output.
type PeerGroup = { parentLine: number; ancestors: number[]; lines: number[]; selected?: { line: number; ancestors: number[] }[] };
export type StateRule =
  | { kind: 'exact'; value: string; selection: number[] | null; sampleSelection?: number[] }
  | { kind: 'indent'; geometry: ListGeometry; contentColumn: number; level: string; peers?: PeerGroup; tree?: PeerGroup }
  | { kind: 'code'; beforeBlock: string; body: string; afterBlock: string };
export type MixedInput = State & { action?: MixedAction; delivered?: State };
type Candidate = { rule: StateRule; undo: State[]; redo: State[]; redoKnown: boolean };
export type MixedStep = { prior: StateRule[]; inputAllowed: boolean; actions: MixedAction[]; allowed: StateRule[]; before?: State; undoCount: number; redoCount: number; redoKnown: boolean; changed: boolean };
export type MixedExpected = { steps: MixedStep[]; final: StateRule[] };

export const publicState = (value: unknown): State | undefined => {
  if (!value || typeof value !== 'object') return;
  const candidate = value as State;
  const range = candidate.selection;
  if (typeof candidate.value !== 'string' || !Array.isArray(range) || range.length !== 2 ||
      !range.every(Number.isInteger) || range[0]! < 0 || range[0]! > range[1]! || range[1]! > candidate.value.length) return;
  return copy(candidate);
};
const exact = (s: State): StateRule => ({ kind: 'exact', value: s.value, selection: [...s.selection] });
const same = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);

// A peer range keeps every marker/gap/body and every outside byte. Leading
// whitespace is free only where ordinary four spaces lose the intended tree.
// This reconstructs the full state; no output body or selection is adopted.
function peerRangeState(rule: Extract<StateRule, { kind: 'indent' }>, indents: string[]): State | undefined {
  const p = rule.geometry, base = moveRows(p, '    ').edit; if (!base) return;
  const ordinary = base.insert.split('\n');
  const insert = p.rows.map((row, index) => row.kind === 'blank' ? rowText(row) : indents[index]! + ordinary[index]!.trimStart()).join('\n');
  return { value: p.text.slice(0, base.from) + insert + p.text.slice(base.to), selection: [base.from, base.from + insert.length] };
}

/** Infer only an allowed free parameter, then reconstruct the COMPLETE state. */
export function materialize(rule: StateRule, receiving: unknown, selection = true): State | undefined {
  const state = publicState(receiving); if (!state) return;
  let predicted: State;
  if (rule.kind === 'exact') predicted = { value: rule.value, selection: rule.selection ?? [...state.selection] };
  else if (rule.kind === 'code') {
    // An allowed serializer may choose marker kind/width and closing whitespace.
    // Infer only that envelope, never the body, context or requested selection.
    const blockEnd = state.value.length - rule.afterBlock.length;
    const block = state.value.slice(rule.beforeBlock.length, blockEnd);
    const opening = /^ {0,3}(`{3,}|~{3,})[ \t]*\n/.exec(block);
    if (!opening) return;
    const bodyStart = opening[0].length, bodyEnd = bodyStart + rule.body.length;
    const closingText = block.slice(bodyEnd), closing = /^\n {0,3}(`{3,}|~{3,})[ \t]*$/.exec(closingText);
    if (!closing || opening[1]![0] !== closing[1]![0] || closing[1]!.length < opening[1]!.length) return;
    const enclosed = opening[0] + rule.body + closingText, tokens = parser.parse(enclosed, {});
    if (tokens.length !== 1 || tokens[0]!.type !== 'fence' || tokens[0]!.content !== rule.body + '\n') return;
    predicted = { value: rule.beforeBlock + enclosed + rule.afterBlock,
      selection: [rule.beforeBlock.length + bodyStart, rule.beforeBlock.length + bodyEnd] };
  } else {
    const p = rule.geometry, first = p.rows.findIndex(row => row.kind !== 'blank');
    if (first < 0) return;
    if (rule.peers || rule.tree) {
      const outputRows = state.value.slice(p.offsets[0]!).split('\n');
      const indents = p.rows.map((_row, index) => /^[ \t]*/.exec(outputRows[index] ?? '')![0]);
      // Existing flat-peer lower bounds stay intact. A selected ordered restart
      // can shorten its marker, so descendant raw columns are free; the complete
      // item ancestry and every marker/gap/body still have to survive.
      if (!rule.tree && p.rows.some((row, index) => row.kind !== 'blank' && columns(indents[index]!) < columns(row.indent) + 4)) return;
      const wanted = peerRangeState(rule, indents); if (!wanted) return;
      const group = rule.tree ?? rule.peers!, ancestry = itemAncestors(wanted.value);
      if (movedItems(group).some(item => !same(ancestry.get(item.line), item.ancestors))) return;
      if (state.value !== wanted.value || selection && !same(state.selection, wanted.selection)) return;
      return wanted;
    }
    const row = p.rows[first]!, at = p.offsets[first]!;
    const outputLine = state.value.slice(at).split('\n')[0]!, leading = /^[ \t]*/.exec(outputLine)![0];
    if (!leading.endsWith(row.indent)) return;
    const q = leading.slice(0, leading.length - row.indent.length), end = columns(q);
    // <=20 is a proven finite parameter bound, never a canonical width choice.
    if (!q || !/^[ \t]+$/.test(q) || end < 4 || end > 20) return;
    const marker = columns(q + rule.level);
    if (marker < rule.contentColumn || marker > rule.contentColumn + 3) return;
    const edit = moveRows(p, q).edit; if (!edit) return;
    predicted = { value: apply(p.text, edit), selection: [edit.start, edit.end] };
  }
  if (state.value !== predicted.value || selection && !same(state.selection, predicted.selection)) return;
  return predicted;
}
export const matchesState = (rules: StateRule[], state: unknown, selection = true) => rules.some(rule => !!materialize(rule, state, selection));

// Initial token ancestry supplies the semantic sibling premise independently
// of raw marker columns. A shallower-container continuation (for example the
// third row of '1. a\n    1. b\n2. c') has different item ancestors and stays
// under the exact restart/continuation source law.
function itemAncestors(text: string) {
  const stack: number[] = [], ancestors = new Map<number, number[]>();
  for (const token of parser.parse(text, {})) {
    if (token.type === 'list_item_open') {
      const line = token.map?.[0] ?? -1;
      if (!ancestors.has(line)) ancestors.set(line, [...stack]);
      stack.push(line);
    } else if (token.type === 'list_item_close') stack.pop();
  }
  return ancestors;
}
function siblingGroup(p: ListGeometry): PeerGroup | undefined {
  const row = p.rows.findIndex(row => row.kind !== 'blank'); if (row < 0) return;
  const lineAt = (index: number) => p.text.slice(0, p.offsets[index]!).split('\n').length - 1;
  const first = lineAt(row), lines = p.text.split('\n'); let above = first - 1;
  while (above >= 0 && !lines[above]!.trim()) above--;
  const ancestry = itemAncestors(p.text), parent = ancestry.get(above);
  if (!parent || !same(parent, ancestry.get(first))) return;
  const selected = p.rows.flatMap((row, index) => row.kind === 'item' ? [{ line: lineAt(index), ancestors: ancestry.get(lineAt(index)) }] : []);
  const known = new Set(selected.map(item => item.line));
  const complete = selected.every(item => item.ancestors && same(item.ancestors.slice(0, parent.length), parent)
    && item.ancestors.slice(parent.length).every(line => known.has(line)));
  const hasSelectedChild = complete && selected.some(item => item.ancestors!.length > parent.length);
  return { parentLine: above, ancestors: parent,
    lines: selected.filter(item => same(item.ancestors, parent)).map(item => item.line),
    ...(hasSelectedChild ? { selected: selected as { line: number; ancestors: number[] }[] } : {}),
  };
}
// This is the command's semantic relation: add one containing item before
// every selected item's existing selected ancestors. Flat peers are its
// zero-edge case; the same complete-state reconstruction checks both.
function movedItems(group: PeerGroup) {
  return group.selected ? group.selected.map(item => ({ line: item.line,
    ancestors: [...group.ancestors, group.parentLine, ...item.ancestors.slice(group.ancestors.length)] }))
    : group.lines.map(line => ({ line, ancestors: [...group.ancestors, group.parentLine] }));
}
function siblingItems(p: ListGeometry) { return !!siblingGroup(p); }

function indentRule(s: State, action: MixedAction): StateRule | undefined {
  if (action.kind !== 'indent') return;
  const p = listGeometry(s, action), parent = p.parent, first = p.rows.find(row => row.kind !== 'blank'), group = siblingGroup(p);
  // Declines, continuation depths and outdent retain their exact adopted model.
  if (!moveRows(p).edit || !parent || parent.kind !== 'item' || !first || columns(parent.indent) !== columns(first.indent) && !group) return;
  const markerEnd = columns(parent.indent + parent.marker), gap = columns(parent.gap, markerEnd) - markerEnd;
  // CommonMark's effective item padding; an empty/over-four gap uses one cell.
  const contentColumn = markerEnd + (gap >= 1 && gap <= 4 ? gap : 1);
  if (group?.selected) {
    const ordinary = itemAncestors(moveRows(p, '    ').output);
    if (movedItems(group).every(item => same(ordinary.get(item.line), item.ancestors))) return;
    return { kind: 'indent', geometry: p, contentColumn, level: first.indent, tree: group };
  }
  const peers = group && group.lines.length > 1 && group.lines.length === p.rows.filter(row => row.kind !== 'blank').length ? group : undefined;
  if (peers) {
    const ordinary = itemAncestors(moveRows(p, '    ').output), expected = [...peers.ancestors, peers.parentLine];
    if (peers.lines.every(line => same(ordinary.get(line), expected))) return;
    return { kind: 'indent', geometry: p, contentColumn, level: first.indent, peers };
  }
  if (columns('    ' + first.indent) >= contentColumn) return;
  return { kind: 'indent', geometry: p, contentColumn, level: first.indent };
}
function actionAt(s: State, intent: Intent, native: boolean, undo: number, redoKnown: boolean): MixedAction {
  const range = pickRange(s, intent);
  if (intent.kind === 'undo' && (!native || !undo) || intent.kind === 'redo' && (!native || !redoKnown)) return { ...intent, kind: 'select', range };
  return { ...intent, range };
}
function advance(s: HistoryState, action: MixedAction): Candidate {
  const current = { value: s.value, selection: [...action.range] }, undo = s.undo.map(copy), redo = s.redo.map(copy);
  let redoKnown = s.redoKnown;
  if (action.kind === 'undo' || action.kind === 'redo') {
    const from = action.kind === 'undo' ? undo : redo, to = action.kind === 'undo' ? redo : undo;
    const prior = from.pop(); if (prior) to.push(copy(current));
    return { rule: { kind: 'exact', value: prior?.value ?? current.value, selection: null, sampleSelection: prior?.selection ?? current.selection }, undo, redo, redoKnown };
  }
  if (action.kind === 'select') return { rule: exact(current), undo, redo, redoKnown };
  // The selected-source law leaves fence spelling free. The independent block
  // model supplies exact surrounding padding/body; a later admitted input binds
  // the chosen spelling before any continuation or exact undo/redo prediction.
  const [from, to] = action.range as [number, number], picked = current.value.slice(from, to);
  const block = action.kind === 'code' && picked.includes('`') ? blockModel({ text: current.value, from, to,
    before: current.value.slice(0, from), picked, after: current.value.slice(to) }) : undefined;
  const free: StateRule | undefined = block ? { kind: 'code', beforeBlock: block.context.beforeBlock,
    body: block.selection.text, afterBlock: block.context.afterBlock } : indentRule(current, action);
  if (free) return { rule: free, undo: [...undo, copy(current)], redo: [], redoKnown: true };
  const edit = change(current, action);
  if (!edit) return { rule: exact(current), undo, redo, redoKnown };
  const value = apply(current.value, edit);
  // Default typing/newlines and DOM paste belong to the browser's history
  // engine. Judge their immediate source, then resume known Undo only after
  // another app-applied formatting edit (Kyle Mathews, 2026-11-22).
  if (action.kind === 'paste' || action.kind === 'type' || action.kind === 'newline') { undo.length = 0; redo.length = 0; redoKnown = false; }
  else if (value !== current.value) { undo.push(copy(current)); redo.length = 0; redoKnown = true; }
  else { undo.length = 0; redo.length = 0; redoKnown = false; }
  return { rule: { kind: 'exact', value, selection: [edit.start, edit.end] }, undo, redo, redoKnown };
}
const unique = <T>(items: T[]) => [...new Map(items.map(item => [JSON.stringify(item), item])).values()];
export function mixedPlan(h: Mixed) { return { h, text: initial(h), actions: h.actions }; }
export type MixedPlan = ReturnType<typeof mixedPlan>;

/** Inputs select an already permitted branch; step outputs are never read here. */
export function mixedFromInputs(p: MixedPlan, inputs: readonly (MixedInput | undefined)[]): MixedExpected {
  let candidates: Candidate[] = [{ rule: exact(startState(p.h)), undo: [], redo: [], redoKnown: true }];
  const steps: MixedStep[] = [];
  for (const [index, intent] of p.actions.entries()) {
    const before = publicState(inputs[index]), prior = candidates.map(c => c.rule);
    const accepted = before ? candidates.flatMap(c => {
      const state = materialize(c.rule, before);
      return state ? [{ ...state, undo: c.undo, redo: c.redo, redoKnown: c.redoKnown }] : [];
    }) : [];
    const branches = accepted.map(s => {
      const action = actionAt(s, intent, p.h.native, s.undo.length, s.redoKnown);
      return { action, next: advance(s, action) };
    });
    const actions = unique(branches.map(branch => branch.action));
    const supplied = inputs[index]?.action;
    candidates = unique(branches.filter(branch => !supplied || same(branch.action, supplied)).map(branch => branch.next));
    const first = accepted[0], allowed = candidates.map(c => c.rule);
    steps.push({ prior, inputAllowed: accepted.length > 0, actions, allowed, before,
      undoCount: first?.undo.length ?? 0, redoCount: first?.redo.length ?? 0, redoKnown: first?.redoKnown ?? false,
      changed: !!before && allowed.some(rule => rule.kind !== 'exact' || rule.value !== before.value) });
  }
  return { steps, final: candidates.map(c => c.rule) };
}
export function mixedInputAction(p: MixedPlan, index: number, input: State, previous: readonly MixedInput[]): MixedAction {
  const step = mixedFromInputs(p, [...previous, input]).steps[index]!;
  // A bad preceding source still gets a concrete driver input; the check rejects
  // its original step or this membership. No unchecked state is adopted.
  return step.actions[0] ?? actionAt(input, p.actions[index]!, p.h.native, 0, false);
}
function sampleRule(rule: StateRule): State {
  if (rule.kind === 'exact') return { value: rule.value, selection: [...(rule.selection ?? rule.sampleSelection ?? [0, 0])] };
  if (rule.kind === 'code') {
    // Preview needs one member, not production's canonical fence-width choice.
    // Tildes and parser validation keep it independent of the tick serializer.
    for (let width = 3; width <= rule.body.length + 4; width++) {
      const opening = '~'.repeat(width) + '\n', closing = '\n' + '~'.repeat(width);
      const start = rule.beforeBlock.length + opening.length;
      const state = { value: rule.beforeBlock + opening + rule.body + closing + rule.afterBlock,
        selection: [start, start + rule.body.length] };
      if (materialize(rule, state)) return state;
    }
    throw new Error('No independent tilde witness for literal selected code');
  }
  if (rule.tree) {
    // A paragraph list marker can start in four columns at its containing
    // item's content floor. Search only those source choices, preserving each
    // original marker gap and the declared tree, then validate the whole state.
    // This serializer supplies previews; it is never the expected output.
    const geometry = rule.geometry, group = rule.tree, items = movedItems(group);
    const base = moveRows(geometry, '    ').edit!;
    const cores = base.insert.split('\n').map(line => listRow(line.trimStart()));
    const indents: string[] = [], floors = new Map([[group.parentLine, rule.contentColumn]]);
    const firstLine = geometry.text.slice(0, geometry.offsets[0]!).split('\n').length - 1;
    const search = (index: number): State | undefined => {
      if (index === geometry.rows.length) {
        const state = peerRangeState(rule, indents);
        return state && materialize(rule, state) ? state : undefined;
      }
      const row = geometry.rows[index]!;
      if (row.kind === 'blank') { indents[index] = row.indent; return search(index + 1); }
      const line = firstLine + index, ancestors = items.find(item => item.line === line)!.ancestors;
      const floor = floors.get(ancestors.at(-1)!)!, core = cores[index]!;
      const ordinary = columns('    ' + row.indent);
      const choices = [...new Set([ordinary, floor, floor + 1, floor + 2, floor + 3])].filter(column => column >= floor && column <= floor + 3);
      for (const column of choices) {
        const markerEnd = column + core.marker.length, padding = columns(core.gap, markerEnd) - markerEnd;
        if (core.body && (padding < 1 || padding > 4)) continue;
        indents[index] = ' '.repeat(column); floors.set(line, markerEnd + (core.body ? padding : 1));
        const state = search(index + 1); if (state) return state;
      }
      return;
    };
    const state = search(0); if (state) return state;
    throw new Error('No independent selected-ancestry whitespace witness');
  }
  if (rule.peers) {
    const target = Math.max(rule.contentColumn, ...rule.geometry.rows.filter(row => row.kind !== 'blank').map(row => columns(row.indent) + 4));
    const state = peerRangeState(rule, rule.geometry.rows.map(row => row.kind === 'blank' ? row.indent : ' '.repeat(target)));
    if (state && materialize(rule, state)) return state;
    throw new Error('No independent peer-range whitespace witness');
  }
  for (let n = 4; n <= 20; n++) {
    const edit = moveRows(rule.geometry, ' '.repeat(n)).edit; if (!edit) continue;
    const state = { value: apply(rule.geometry.text, edit), selection: [edit.start, edit.end] };
    if (materialize(rule, state)) return state;
  }
  throw new Error('No independent ordinary-space witness for sufficient indentation');
}
/** Construction preview only; actual reach uses actual recorded input checkpoints. */
export function mixedPreview(p: MixedPlan) {
  const inputs: MixedInput[] = []; let state = startState(p.h);
  const outputs: State[] = [];
  for (let index = 0; index < p.actions.length; index++) {
    const action = mixedInputAction(p, index, state, inputs); inputs.push({ ...copy(state), action });
    const rule = mixedFromInputs(p, inputs).steps[index]!.allowed[0]!;
    state = sampleRule(rule); outputs.push(copy(state));
  }
  return { inputs, outputs, expected: mixedFromInputs(p, inputs) };
}
export function mixedModel(p: MixedPlan, trace?: readonly Observation[]): MixedExpected {
  return trace === undefined ? mixedPreview(p).expected : mixedFromInputs(p, p.actions.map((_action, index) => traceValue(trace, 'input' + index) as MixedInput | undefined));
}
type IntentFields = Partial<Pick<Intent, 'at' | 'a' | 'b' | 'text' | 'activation'>> & { via?: 'shortcut' };
const act = (kind: Exclude<Intent['kind'], 'newline'>, extra: IntentFields = {}): Intent => ({ kind, at: 'current', a: 0, b: 0, text: 'α😀 prose', activation: 'click', ...extra });
function containerMixed(recipe: ContainerMixedRecipe): Mixed {
  const input = containerInput(recipe.context);
  // Range intents count code-point boundaries; textarea delivery uses UTF-16.
  const a = [...input.text.slice(0, input.from)].length, b = [...input.text.slice(0, input.to)].length;
  return { mobile: recipe.mobile, native: recipe.native, scene: 'code', fencedContainer: recipe.context, actions: [
    act('break', { at: 'range', a, b }), act('type', { at: 'end', text: '\nprose' }),
    act('break', { at: 'end' }), act('undo'), act('redo'),
  ] };
}

function selectedMixed(recipe: SelectedMixedRecipe): Mixed {
  const { tree, mobile, native, shortcut, activation } = recipe, plan = nestingPlan(tree);
  const via = shortcut ? { via: 'shortcut' as const } : {};
  return { mobile, native, scene: 'list', selectedTree: tree, actions: [
    act('indent', { ...via, at: 'range', a: plan.from, b: plan.to, activation }),
    act('undo'), act('redo'), act('type', { at: 'end', text: 'x' }), act('outdent', { ...via, at: 'end', activation }),
  ] };
}
const base: Mixed = { mobile: false, native: true, scene: 'prose', body: 'one two', actions: [act('bold')] };
export const mixedCases: Record<string, Mixed> = {};
for (const mobile of [false, true]) for (const native of [false, true]) {
  mixedCases[`inline-${mobile}-${native}`] = { ...base, mobile, native, actions: [act('bold'), act('type'), act('italic', { at: 'all' }), act('link'), act('type', { text: 'https://example.com' }), act('undo'), act('redo')] };
  mixedCases[`structure-${mobile}-${native}`] = { ...base, mobile, native, scene: 'list', body: 'child', actions: [act('indent', { at: 'end' }), act('bold', { at: 'line', a: 13 }), act('outdent', { at: 'end' }), act('break', { at: 'end' }), act('type'), act('code'), act('formula', { at: 'all' }), act('undo'), act('redo')] };
  mixedCases[`branch-${mobile}-${native}`] = { ...base, mobile, native, actions: [act('bold'), act('italic'), act('undo'), act('type', { at: 'all' }), act('redo'), act('paste', { at: 'all' }), act('formula', { at: 'all' }), act('code', { at: 'all', activation: 'Enter' })] };
}
// Branch abandonment remains an actual Undo/Redo test using app commands.
// Default typing no longer stands in for application-owned history behavior.
mixedCases['formatting-branch'] = { ...base, actions: [act('bold'), act('italic'), act('undo'), act('formula', { at: 'all' }), act('redo')] };
for (const scene of ['prose', 'list', 'code', 'formula', 'multiline'] as const) mixedCases[scene] = { ...base, scene, actions: [act('break', { at: 'end' }), act('type'), act('italic', { at: 'all' }), act('formula', { at: 'all', activation: 'Space' })] };
mixedCases.selection = { ...base, actions: [act('select', { at: 'range', a: 1, b: 4 }), act('bold'), act('type'), act('formula', { at: 'caret', a: 2 })] };
for (const a of [0, 1, 2, 3, 4]) mixedCases['openingOffset' + a] = { ...base, scene: 'code', body: 'a', actions: [act('break', { at: 'caret', a }), act('bold')] };
// Editing away the line boundaries turns two fences into one inline code span.
// This is a real keyboard continuation of the adopted CommonMark info rule.
for (const mobile of [false, true]) for (const native of [false, true]) mixedCases[`inlineFenceInfo-${mobile}-${native}`] = {
  ...base, mobile, native, scene: 'code', body: 'a', actions: [act('type', { at: 'range', a: 3, b: 6, text: 'x' }), act('break', { at: 'end' })],
};
// Existing type intents construct padded-parent source; no scene/action narrows.
for (const mobile of [false, true]) for (const native of [false, true]) {
  for (const [name, source] of [['space', '100.  a\n2. b'], ['tab', '\t100.\t a\n\t2. b']] as const) mixedCases[`padding-${name}-${mobile}-${native}`] = {
    ...base, mobile, native, actions: [act('type', { at: 'all', text: source }), act('indent', { at: 'end' }), act('undo'), act('redo'), act('type', { at: 'end', text: 'x' }), act('outdent', { at: 'end' })],
  };
}
mixedCases.ordinary99 = { ...base, actions: [act('type', { at: 'all', text: '99. a\n2. b' }), act('indent', { at: 'end' }), act('outdent', { at: 'end' })] };
// Existing type intents can construct legal sibling-container geometries; the
// independent input relation retains the actual chosen source through undo,
// redo, typing and outdent. All sources remain within the24-character bound.
for (const mobile of [false, true]) for (const native of [false, true]) {
  for (const [name, source] of [
    ['empty-tab-spaces', '-\n\t100. a\n    - b'], ['blank-tab-spaces', '- x\n\n\t100. a\n    - b'],
    ['empty-spaces-tab', '-\n    100. a\n\t- b'], ['blank-spaces-tab', '- x\n\n    100. a\n\t- b'],
    ['same-spaces', '-\n    100. a\n    - b'], ['same-tab', '-\n\t100. a\n\t- b'],
    ['narrow', '-\n\t99. a\n    - b'], ['column-below', '-\n\t100. a\n   - b'], ['column-above', '-\n\t100. a\n     - b'],
    ['shallower-container', '1. a\n    1. b\n2. c'],
  ]) mixedCases[`siblings-${name}-${mobile}-${native}`] = {
    ...base, mobile, native, actions: [act('type', { at: 'all', text: source }), act('indent', { at: 'end' }), act('undo'), act('redo'), act('type', { at: 'end', text: 'x' }), act('outdent', { at: 'end' })],
  };
}
// Longer container documents use multiple existing type intents, each within
// the24-character leaf bound. No source alphabet, action count or run shrinks.
for (const mobile of [false, true]) for (const native of [false, true]) {
  for (const [name, prefix, parentIndent, siblingIndent, shallowerIndent] of [
    ['lazy', '- a\nlazy\n\n', '    ', '\t', ''],
    ['inline', '- - a\n\n', '      ', '\t  ', '  '],
    ['emptyPadding', '-    \n', '    ', '\t', ''],
  ]) for (const oneShallower of [false, true]) {
    const source = prefix + parentIndent + '100. b\n' + (oneShallower ? shallowerIndent : siblingIndent) + '- c';
    const typing = [act('type', { at: 'all', text: source.slice(0, 24) }), ...(source.length > 24 ? [act('type', { at: 'end', text: source.slice(24) })] : [])];
    mixedCases[`container-${name}-${oneShallower ? 'shallower' : 'same'}-${mobile}-${native}`] = {
      ...base, mobile, native, actions: [...typing, act('indent', { at: 'end' }), act('undo'), act('redo'), act('type', { at: 'end', text: 'x' }), act('outdent', { at: 'end' })],
    };
  }
}
// Selected peers keep every marker, padding and body. Extraordinary leading
// whitespace is free where ordinary four spaces lose their common ancestry.
for (const mobile of [false, true]) for (const native of [false, true]) {
  const variants: [string, string, number, string, string[]][] = [];
  for (const [outer, prefix] of [['empty', '-\n'], ['blank', '- x\n\n']]) for (const [name, first, peers] of [
    ['spaces-tab', '    ', ['\t']], ['tab-spaces', '\t', ['    ']],
    ['spaces-mixed', '    ', ['   \t']], ['first-fits', '     ', ['\t']],
    ['three-rows', '    ', ['\t', '    ']], ['four-rows', '\t', ['    ', ' \t', '   \t']],
  ] as const) variants.push([outer + '-' + name, prefix!, 100, first, [...peers]]);
  variants.push(['narrow', '-\n', 99, '    ', ['   \t']], ['maximum', '-\n', 999999999, '    ', ['\t']], ['no-uniform-prefix', '-\n', 999999, '   \t', ['   ']], ['no-prepend-pair', '-\n', 9999999, '\t ', ['\t']]);
  for (const [name, outer, parent, first, peers] of variants) {
    const prefix = outer + '    ' + parent + '. a\n';
    const source = prefix + [first + '- b', ...peers.map((indent, index) => indent + '- ' + String.fromCharCode(99 + index))].join('\n');
    const typing = Array.from({ length: Math.ceil(source.length / 24) }, (_, index) => act('type', { at: index === 0 ? 'all' : 'end', text: source.slice(index * 24, (index + 1) * 24) }));
    mixedCases[`peer-range-${name}-${mobile}-${native}`] = { ...base, mobile, native,
      actions: [...typing, act('indent', { at: 'range', a: prefix.length, b: source.length }), act('undo'), act('redo'), act('type', { at: 'end', text: 'x' }), act('outdent', { at: 'end' })],
    };
  }
}


// Retained toolbar histories stay byte-for-byte intact; the same semantic
// histories also enter actual textarea Tab/Shift+Tab receiving paths.

// Selected ancestry uses the same mixed reducer, complete-state relation and
// actual editor driver as every other command. Short native type chunks keep
// both reported documents inside the existing 24-unit / twelve-action grammar.
for (const mobile of [false, true]) for (const native of [false, true]) {
  for (const [name, source] of [
    ['tabs', '-\n    100. a\n    - b\n\t  - c'],
    ['restart', '-\n    100. a\n    100.\tb\n\t\t\t- c'],
  ]) {
    const chunks = source!.match(/[\s\S]{1,24}/g)!;
    const typing = chunks.map((chunk, index) => act('type', { at: index ? 'end' : 'all', text: chunk }));
    mixedCases[`selected-ancestry-${name}-${mobile}-${native}`] = { ...base, mobile, native,
      actions: [...typing, act('indent', { at: 'range', a: 13, b: source!.length,
        activation: mobile ? 'Space' : native ? 'Enter' : 'click' }), act('undo'), act('redo'), act('type', { at: 'end', text: 'x' }), act('outdent', { at: 'end' })],
    };
  }
}

for (const [name, h] of Object.entries(mixedCases)) {
  if (!h.actions.some(action => action.kind === 'indent' || action.kind === 'outdent')) continue;
  mixedCases[name + '-shortcut'] = { ...h, actions: h.actions.map(action => action.kind === 'indent' || action.kind === 'outdent'
    ? { ...action, kind: action.kind, via: 'shortcut' as const } : action) };
}
// Three- and four-item trees have direct receiving constructions as well as
// the arbitrary's full selected-ancestry lane. Each viewport/native profile
// receives toolbar and trusted-key variants without reducing old histories.
for (const [profile, [mobile, native]] of [[false, false], [false, true], [true, false], [true, true]].entries()) {
  const tree = nestingCases['selectedAncestryShape' + [4, 10, 16, 17][profile]]!;
  for (const shortcut of [false, true]) mixedCases[`selected-tree-${profile}-${shortcut}`] = selectedMixed({
    mobile: mobile!, native: native!, tree, shortcut, activation: ['click', 'Enter', 'Space', 'click'][profile] as 'click' | 'Enter' | 'Space',
  });
}
for (const shortcut of [false, true]) mixedCases['selected-root-fits-restart-' + shortcut] = selectedMixed({
  mobile: false, native: true, tree: nestingCases.selectedRestartWidth9!, shortcut, activation: 'click',
});



// Selected fences stay selected in the same arbitrary action stream. These
// continuations exercise every later action family, both receiving modes and
// viewports, without adding another property or changing an arbitrary bound.
for (const mobile of [false, true]) for (const native of [false, true]) {
  mixedCases[`code-continuation-${mobile}-${native}`] = { ...base, mobile, native, scene: 'code', body: 'α😀 a', actions: [
    act('code', { at: 'all', activation: 'Enter' }), act('select'), act('type', { at: 'end', text: 'x' }),
    act('code', { at: 'all', activation: 'Space' }), act('bold'), act('italic', { at: 'all' }),
    act('break', { at: 'end' }), act('formula', { at: 'all' }), act('link'), act('paste', { at: 'all' }),
    act('indent', { at: 'end' }), act('outdent', { at: 'end' }),
  ] };
  mixedCases[`code-history-${mobile}-${native}`] = { ...base, mobile, native, scene: 'code', body: 'a', actions: [
    act('code', { at: 'all' }), act('undo'), act('redo'), act('type', { at: 'end', text: 'x' }),
    act('undo'), act('redo'), act('undo'), act('type', { at: 'end', text: 'y' }), act('redo'),
  ] };
  mixedCases[`code-deep-${mobile}-${native}`] = { ...base, mobile, native, scene: 'code', body: 'a', actions: [
    ...Array.from({ length: 9 }, () => act('code', { at: 'all' })), act('type'),
  ] };
  mixedCases[`code-context-${mobile}-${native}`] = { ...base, mobile, native, scene: 'code', body: 'a', actions: [
    act('code', { at: 'range', a: 1, b: 6 }), act('type'), act('undo'), act('redo'),
  ] };
}
// Only these four targeted counterparts add native Tab after a chosen code
// envelope. The original 321 histories remain byte-identical, without blanket
// shortcut cloning. First the selected literal body declines both keys; after
// replacing that body with list source, the same keys accept and compose with
// native history. Every later input retains the chosen outer fence source.
for (const mobile of [false, true]) for (const native of [false, true]) {
  mixedCases[`code-native-tab-${mobile}-${native}`] = { ...base, mobile, native, scene: 'code', body: '1. a\n2. b', actions: [
    act('code', { at: 'all' }), act('indent', { via: 'shortcut' }), act('outdent', { via: 'shortcut' }),
    act('type', { text: '1. a\n2. b' }), act('indent', { via: 'shortcut' }), act('outdent', { via: 'shortcut' }),
    act('undo'), act('redo'), act('type', { at: 'end', text: 'x' }),
  ] };
}
// Every role reaches the real hard-break toolbar on desktop/native.
// The suffix already supplies any desired next-line container prefix.
for (const [name, context] of Object.entries(containerCases)) {
  mixedCases[`fence-container-${name}-false-true`] = containerMixed({ mobile: false, native: true, context });
}
// Hold source/range/actions fixed while varying viewport and history mode.
// Selection replacement also exercises exact prefix/suffix preservation.
for (const [mobile, native] of [[false, false], [true, true], [true, false]] as const) {
  mixedCases[`fence-container-quote-body-selection-${mobile}-${native}`] = containerMixed({ mobile, native, context: containerCases['quote-body-selection']! });
}

// Trailing outside blank lines can extend parser item maps without adding
// unselected body. These six source suffixes enter the existing mixed grammar
// and selected-ancestry relation; no viewport/history Cartesian copies.
for (const [name, suffix] of [
  ['lf', '\n'], ['blank', '\n\n'], ['blanks', '\n\n\n'],
  ['space-blank', '\n \n'], ['tab-blank', '\n\t\n'], ['blank-sibling', '\n\n- z'],
]) {
  const source = '- a\n 10. b\n        - c' + suffix;
  const typing = Array.from({ length: Math.ceil(source.length / 24) }, (_, index) =>
    act('type', { at: index === 0 ? 'all' : 'end', text: source.slice(index * 24, (index + 1) * 24) }));
  mixedCases['selected-source-trailing-' + name] = { ...base, body: 'a', actions: [
    ...typing, act('indent', { at: 'range', a: 4, b: 22, text: 'a' }), act('undo'), act('redo'),
  ] };
}

// Native newline is an exact LF replacement in every syntax context, distinct
// from the hard-break toolbar. These histories preserve native Undo boundaries.
const newline = (key: 'Enter' | 'Shift+Enter', extra: IntentFields = {}): Intent =>
  ({ kind: 'newline', key, at: 'current', a: 0, b: 0, text: 'unused', activation: 'click', ...extra });
for (const key of ['Enter', 'Shift+Enter'] as const) for (const scene of ['prose', 'code'] as const) for (const native of [false, true]) {
  mixedCases[`native-newline-${key}-${scene}-${native}`] = { ...base, scene, native, mobile: key === 'Shift+Enter', body: 'alpha beta', actions: [
    ...(scene === 'prose' ? [act('bold', { at: 'range', a: 1, b: 4 })] : [act('select', { at: 'range', a: 4, b: 7 })]),
    newline(key, { at: 'range', a: scene === 'code' ? 4 : 2, b: scene === 'code' ? 7 : 4 }),
    act('undo'), act('redo'), act('type', { text: 'next' }), newline(key, { at: 'end' }), act('undo'), act('redo'),
  ] };
}
for (const activation of ['Enter', 'Space'] as const) mixedCases[`hard-break-selection-history-${activation}`] = {
  ...base, mobile: activation === 'Space', actions: [act('break', { at: 'range', a: 1, b: 4, activation }), act('undo'), act('redo'), act('type', { text: 'next' })],
};

export function mixedStates(p: MixedPlan, trace?: readonly Observation[]) {
  const states = new Set([p.h.mobile ? 'mobile' : 'desktop', p.h.native ? 'native' : 'fallback', 'scene:' + p.h.scene]);
  const steps = mixedModel(p, trace).steps;
  let undone = false, discardedBranch = false, freeIndent = false, freeCode = false, selectedCodeCount = 0;
  for (const [index, step] of steps.entries()) {
    const action = step.actions[0], input = step.before;
    if (!action || !input || !step.inputAllowed) continue;
    states.add(action.kind);
    const key = shortcutKey(action), receipt = trace && traceValue(trace, 'key' + index) as { event?: { trusted?: boolean; target?: boolean; key?: string; shiftKey?: boolean } } | undefined;
    if ((key === 'Tab' || key === 'Shift+Tab') && (trace === undefined || receipt?.event?.trusted && receipt.event.target && receipt.event.key === 'Tab' && receipt.event.shiftKey === (key === 'Shift+Tab'))) {
      states.add('nativeTabReceiving'); states.add(key === 'Tab' ? 'nativeIndentTab' : 'nativeOutdentShiftTab');
    }
    if ((key === 'Enter' || key === 'Shift+Enter') && (trace === undefined || receipt?.event?.trusted && receipt.event.target && receipt.event.key === 'Enter' && receipt.event.shiftKey === (key === 'Shift+Enter'))) {
      states.add('nativeNewlineReceiving'); states.add(key === 'Enter' ? 'nativeEnter' : 'nativeShiftEnter');
    }
    if (!key && ['formula', 'code', 'indent', 'outdent'].includes(action.kind)) states.add(action.activation);
    if (action.kind === 'indent') {
      if (input.value.startsWith('- a\nlazy\n\n')) states.add('lazyContainerIndent');
      if (input.value.startsWith('- - a\n\n')) states.add('inlineMarkerContainerIndent');
      if (input.value.startsWith('-    \n')) states.add('emptyPaddingContainerIndent');
      const geometry = listGeometry(input, action), parent = geometry.parent, first = geometry.rows.find(row => row.kind !== 'blank');
      const peers = siblingGroup(geometry);
      if (peers?.selected) {
        states.add('selectedAncestryRange'); states.add('selectedAncestryRows' + peers.selected.length);
        for (const item of peers.selected) states.add('selectedAncestryDepth' + (item.ancestors.length - peers.ancestors.length));
        if (geometry.rows[0]!.marker.length > 1) states.add('selectedAncestryRestart');
        const parent = geometry.parent!, first = geometry.rows.find(row => row.kind === 'item')!;
        const markerEnd = columns(parent.indent + parent.marker), gap = columns(parent.gap, markerEnd) - markerEnd;
        if (columns('    ' + first.indent) >= markerEnd + (gap >= 1 && gap <= 4 ? gap : 1)) states.add('selectedRootAlreadyFits');
      }
      if (peers && peers.lines.length > 1) {
        states.add('selectedPeerRange'); states.add('selectedPeerCount' + peers.lines.length);
        if (new Set(geometry.rows.filter(row => row.kind === 'item').map(row => row.indent)).size > 1) states.add('independentSelectedPrefixes');
      }
      if (parent && first && siblingItems(geometry)) {
        states.add('semanticSiblingIndent');
        const parentColumn = columns(parent.indent), childColumn = columns(first.indent);
        if (parent.indent !== first.indent && parentColumn === childColumn) states.add('differentRawSameColumnSibling');
        if (parentColumn > childColumn) states.add('siblingColumnBelow');
        if (parentColumn < childColumn) states.add('siblingColumnAbove');
      } else if (parent && first && columns(parent.indent) > columns(first.indent)) states.add('shallowerContainerContinuation');
    }
    const at = action.range[0]!, rowStart = at === 0 ? 0 : input.value.lastIndexOf('\n', at - 1) + 1;
    const rowEnd = input.value.indexOf('\n', at), line = input.value.slice(rowStart, rowEnd < 0 ? input.value.length : rowEnd);
    const opener = /^ {0,3}(`{3,}|~{3,})/.exec(line);
    const openingRow = opener && !literalAt(input.value, rowStart + 1) && (opener[1]![0] !== '`' || !line.slice(opener[0].length).includes('`'));
    if (action.kind === 'break') {
      if ('fencedContainer' in p.h) {
        const context = containerInput(p.h.fencedContainer);
        if (input.value === context.text && action.range[0] === context.from && action.range[1] === context.to) for (const state of containerStates(p.h.fencedContainer)) states.add(state);
      }
      if (openingRow && at > rowStart + opener[0].length - opener[1]!.length && at < rowStart + opener[0].length) states.add('partialFenceOpening');
      if (openingRow && at === rowStart + opener[0].length) states.add('openingDelimiterEnd');
      if (literalAt(input.value, at)) states.add('literalCodeBreak');
      if (opener?.[1]![0] === '`' && line.slice(opener[0].length).includes('`')) states.add('invalidBacktickInfoBreak');
    }
    if (action.kind === 'redo' && discardedBranch && step.redoKnown && !step.redoCount) states.add('branchClearedRedoAttempted');
    if (freeCode) states.add(action.kind + 'AfterSelectedCode');
    if (freeCode && key) {
      states.add(key === 'Tab' ? 'nativeTabAfterSelectedCode' : 'nativeOutdentAfterSelectedCode');
      if (step.changed) states.add(key === 'Tab' ? 'consumedNativeTabAfterSelectedCode' : 'consumedNativeOutdentAfterSelectedCode');
    }
    if (step.allowed.some(rule => rule.kind === 'code')) {
      states.add('selectedCodeCollision'); freeCode = true; selectedCodeCount++;
      if (selectedCodeCount >= 9) states.add('deepSelectedCode');
      if (action.range[0]! > 0 && action.range[1]! < input.value.length) states.add('selectedCodeSurroundingContext');
      if (input.value.slice(action.range[0], action.range[1]).endsWith('\n')) states.add('selectedCodeTrailingLf');
    }
    if (freeIndent && ['type', 'outdent', 'undo', 'redo'].includes(action.kind)) states.add(action.kind + 'AfterFreeIndent');
    if (step.allowed.some(rule => rule.kind === 'indent')) {
      states.add('freeIndent'); freeIndent = true;
      if (step.allowed.some(rule => rule.kind === 'indent' && rule.level.includes('\t'))) states.add('tabLevelFreeIndent');
    } else if (action.kind === 'indent' && step.changed) states.add('ordinaryFourIndent');
    if (action.kind === 'undo' && step.undoCount) undone = true;
    else if (!['undo', 'redo', 'select'].includes(action.kind) && step.changed) {
      if (undone) states.add('editAfterUndo');
      if (step.redoCount) discardedBranch = true;
      undone = false;
    }
  }
  return [...states];
}
