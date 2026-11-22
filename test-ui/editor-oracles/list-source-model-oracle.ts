/** Whole-source compatibility plus the selected-list ancestry allowed set. */
import { differs } from '@tanstack/oracles';
import MarkdownIt from 'markdown-it';
import {
  blank, blankSuffixStates, h, item, prose, model as ordinaryModel, rowText, states as ordinaryStates,
  type History, type Plan,
} from './list-model-oracle.ts';

type Item = { line: number; ancestors: number[] };
type ParsedItem = Item & { paragraphs: number[][]; otherBlock: boolean };
type Ordinary = ReturnType<typeof ordinaryModel>;
export type SourceExpected = { ordinary: Ordinary; forest?: Item[] };

// MarkdownIt's list-item line maps are a declared trusted parsing premise, as
// in the rendered oracle. The expected move below is an ancestor insertion,
// independent of production's scanner, container test and indentation choice.
const parser = new MarkdownIt();
const same = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);
function parsedItems(source: string): ParsedItem[] {
  const stack: ParsedItem[] = [], items: ParsedItem[] = [];
  for (const token of parser.parse(source, {})) {
    if (token.type === 'list_item_open') {
      const line = token.map?.[0] ?? -1;
      const item = { line, ancestors: stack.map(item => item.line), paragraphs: [] as number[][], otherBlock: false };
      items.push(item); stack.push(item);
    } else if (token.type === 'list_item_close') stack.pop();
    else if (token.type === 'paragraph_open' && stack.length) stack.at(-1)!.paragraphs.push(token.map ?? []);
    else if (stack.length && !['inline', 'paragraph_close', 'ordered_list_open', 'ordered_list_close', 'bullet_list_open', 'bullet_list_close'].includes(token.type)) stack.at(-1)!.otherBlock = true;
  }
  return items;
}
const itemTree = (source: string): Item[] => parsedItems(source).map(({ line, ancestors }) => ({ line, ancestors }));

// Existing lexical source histories remain legal even when a row is code or
// text to Markdown. Those histories keep their exact ordinary source judgment.
// This extra relation applies to a complete, parsed, selected ancestor forest
// of nonempty paragraph bodies, matching the separate rendered grammar. Empty
// markers keep their ordinary source obligation: indentation alone cannot make
// an empty item interrupt the preceding nonempty paragraph.
function selectedScene(p: Plan, ordinary: Ordinary) {
  if (p.history.out || p.from === p.to || !ordinary.edit) return;
  const rows = p.history.rows.slice(0, p.last + 1), first = rows.findIndex(row => row.kind !== 'blank');
  if (first < 0 || rows.some(row => row.kind !== 'blank' && (row.kind !== 'item' || !row.body))) return;
  const firstLine = p.text.slice(0, ordinary.edit.from).split('\n').length - 1;
  const sourceLines = p.text.split('\n'); let above = firstLine - 1;
  while (above >= 0 && !sourceLines[above]!.trim()) above--;
  const input = parsedItems(p.text), preceding = input.filter(item => item.line === above);
  if (preceding.length !== 1) return;
  const base = preceding[0]!.ancestors;
  const records = rows.flatMap((row, index) => row.kind === 'blank' ? []
    : [input.filter(item => item.line === firstLine + index)]);
  if (records.some(items => items.length !== 1)) return;
  const selected = records.flat();
  if (!same(selected[0]?.ancestors, base)) return;
  const lines = new Set(selected.map(item => item.line));
  if (selected.some(item => !same(item.ancestors.slice(0, base.length), base) ||
    item.ancestors.slice(base.length).some(line => !lines.has(line)))) return;
  if (!selected.some(item => item.ancestors.length > base.length)) return;
  const boundaries = [
    ...(input.some(item => !lines.has(item.line) && item.ancestors.some(line => lines.has(line))) ? ['sourceUnselectedDescendantExact'] : []),
    ...(selected.some(item => item.otherBlock || !same(item.paragraphs, [[item.line, item.line + 1]])) ? ['sourceSelectedBodyOutsideParagraphSceneExact'] : []),
  ];
  return { boundaries, forest: selected.map(item => ({ line: item.line,
    ancestors: [...base, above, ...item.ancestors.slice(base.length)] })) };
}

const selectedItems = (source: string, forest: Item[]) => {
  const lines = new Set(forest.map(item => item.line));
  // Keep every matching record: a duplicate or missing item is a violation.
  return itemTree(source).filter(item => lines.has(item.line));
};

export function sourceModel(p: Plan): SourceExpected {
  const ordinary = ordinaryModel(p), scene = selectedScene(p, ordinary);
  const forest = scene && !scene.boundaries.length ? scene.forest : undefined;
  // Ordinary spelling stays exact whenever it satisfies the selected ancestry.
  // Only the adopted exceptional whitespace freedom becomes an allowed set.
  return { ordinary, ...(forest && !same(selectedItems(ordinary.output, forest), forest) ? { forest } : {}) };
}

export function sourceStates(p: Plan) {
  const ordinary = ordinaryModel(p), scene = selectedScene(p, ordinary);
  if (scene?.boundaries.length) return [...ordinaryStates(p), ...blankSuffixStates(p.history.after), ...scene.boundaries];
  const forest = scene?.forest;
  if (!forest) return [...ordinaryStates(p), ...blankSuffixStates(p.history.after), ...(p.from !== p.to && p.history.rows.slice(0, p.last + 1).some(row => row.kind === 'item' && !row.body) ? ['sourceEmptySelectedMarkerRange'] : [])];
  const rows = p.history.rows.slice(0, p.last + 1), first = rows.find(row => row.kind !== 'blank')!;
  const ordinaryFirst = ordinary.edit!.insert.split('\n').find(line => line.trim())!.trimStart();
  const loses = !same(selectedItems(ordinary.output, forest), forest);
  return [...ordinaryStates(p), ...blankSuffixStates(p.history.after), 'selectedSourceAncestry', loses ? 'sourceOrdinaryLosesSelectedAncestry' : 'sourceOrdinaryRetainsSelectedAncestry',
    ...(first.marker.length > ordinaryFirst.split(/[ \t]/)[0]!.length ? ['sourceRestartShrinksSelectedMarker'] : []),
    ...(rows.some(row => row.gap.includes('\t')) ? ['sourceSelectedGapTab'] : []),
    ...(rows.slice(1).some(row => row.indent.includes('\t')) ? ['sourceSelectedChildTab'] : [])];
}

// This check binds only free leading whitespace. It rebuilds marker/gap/body,
// every blank and outside byte, replacement geometry and both range endpoints
// from the input and unchanged number policy before comparing the whole result.
export function checkSourceResult(p: Plan, value: unknown, expected: SourceExpected) {
  const law = 'list source and selection';
  if (!expected.forest) return differs('result', law, value, expected.ordinary);
  const observed = value as { edit?: { insert?: unknown } | null; output?: unknown } | null;
  if (!observed?.edit || typeof observed.edit.insert !== 'string') return differs('result', law, value, expected.ordinary);
  const base = expected.ordinary.edit!, received = observed.edit.insert.split('\n');
  const rows = p.history.rows.slice(0, p.last + 1), ordinaryRows = base.insert.split('\n');
  const insert = rows.map((row, index) => row.kind === 'blank' ? rowText(row)
    : /^[ \t]*/.exec(received[index] ?? '')![0] + ordinaryRows[index]!.trimStart()).join('\n');
  const wanted = { edit: { from: base.from, to: base.to, insert, start: base.from, end: base.from + insert.length },
    output: p.text.slice(0, base.from) + insert + p.text.slice(base.to) };
  return differs('result', law, value, wanted) ?? differs('result', law,
    selectedItems(wanted.output, expected.forest), expected.forest);
}

// The existing arbitrary already varies marker width, raw indentation and gap.
// These constructions require their restart/content-floor overlap, including
// exact ordinary neighbors; no new history filter or private expected answer.
const selected = (marker: string, indent: string, childIndent: string, gap = ' ', after = '') => h({
  after, parent: 'bullet', mode: 'range', a: 0, b: childIndent.length + 3,
  rows: [item(marker, indent, 'b', gap), item('-', childIndent, 'c')],
});
export const sourceCases: Record<string, History> = {
  sourceSelectedRestart10Upper: selected('10.', ' ', '        '),
  sourceSelectedRestart99Upper: selected('99.', ' ', '        '),
  sourceSelectedRestartParenthesis: selected('10)', ' ', '        '),
  sourceSelectedRestartTabPadding: selected('10.', ' ', '        ', '\t'),
  sourceSelectedRestartBeforeSibling: selected('10.', ' ', '        ', ' ', '\n- z'),
  sourceSelectedRestartWithBlank: h({ after: '', parent: 'bullet', mode: 'range', a: 0, b: 11,
    rows: [item('10.', ' ', 'b'), blank(' '), item('-', '        ', 'c')] }),
  sourceSelectedSingleDigitNeighbor: selected('1.', ' ', '    '),
  sourceSelectedRestartLowerNeighbor: selected('10.', '  ', '        '),
  sourceSelectedRestartTabNeighbor: selected('10.', ' ', '\t '),
  sourceSelectedEmptyRootOrdinary: h({ after: '', parent: 'bullet', mode: 'range', a: 0, b: 5,
    rows: [item('-', '', '', ''), item('-', '  ', 'c')] }),
  sourceSelectedOmittedDescendantOrdinary: h({ after: '', parent: 'bullet', mode: 'range', a: 0, b: 0,
    rows: [item('10.', ' ', 'b'), item('-', '        ', 'c'), item('-', '        ', 'd')] }),
  sourceSelectedLazyTailOrdinary: h({ after: '', parent: 'bullet', mode: 'range', a: 0, b: 0,
    rows: [item('10.', ' ', 'b'), item('-', '        ', 'c'), prose('prose')] }),
};

// A complete selected paragraph forest stays complete when parser item maps
// include unselected trailing blanks. Each suffix varies independently of the
// restart/ancestry overlap and its exact-ordinary neighbor.
const trailingSuffixes = {
  empty: '\n\n', two: '\n\n\n', spaces: '\n \n', tabs: '\n\t\n', mixed: '\n \t\n', sibling: '\n\n- z',
};
for (const [baseName, base] of [
  ['restart', sourceCases.sourceSelectedRestart10Upper!],
  ['ordinary', sourceCases.sourceSelectedSingleDigitNeighbor!],
] as const) for (const [suffixName, after] of Object.entries(trailingSuffixes)) {
  sourceCases[`sourceTrailingBlank-${baseName}-${suffixName}`] = { ...base, after };
}
sourceCases.sourceTrailingBlankOrderedSibling = { ...sourceCases.sourceSelectedRestart10Upper!, after: '\n\n3. c' };

// A deliberately wrong complete result for the bound regression calibration.
// It is the old independent proposal, not a captured production expectation.
export const sourceOrdinaryCorruption = (p: Plan) => ordinaryModel(p);

// Two spaces can still render this ordinary bullet as a sublist. The original
// four-space source promise must reject that coherent but noncanonical result.
export function ordinarySpacingCorruption(p: Plan) {
  const ordinary = ordinaryModel(p), base = ordinary.edit!;
  const insert = base.insert.slice(2);
  return { edit: { ...base, insert, end: base.end - 2, start: Math.max(base.from, base.start - 2) },
    output: p.text.slice(0, base.from) + insert + p.text.slice(base.to) };
}
