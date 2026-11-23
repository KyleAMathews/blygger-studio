/** Independent semantic histories/models; this module registers no tests. */
import fc from 'fast-check';
import { type Edit as FormatEdit } from './document-oracle.ts';

export type Row = { indent: string; marker: string; gap: string; body: string; kind: 'item' | 'blank' | 'prose' };

export const item = (marker = '-', indent = '', body = 'b', gap = ' '): Row => ({ kind: 'item', marker, indent, body, gap });

export const blank = (indent = ''): Row => ({ kind: 'blank', marker: '', indent, body: '', gap: '' });

export const prose = (body = 'prose', indent = ''): Row => ({ kind: 'prose', marker: '', indent, body, gap: '' });

export const rowText = (r: Row) => r.indent + r.marker + r.gap + r.body;

export const list = (r: Row) => r.kind === 'item' && (!!r.gap || !r.body);

export const numbered = (r: Row) => r.kind === 'item' && r.marker.length > 1;

// Marker whitespace belongs to gap, so a nonempty body starts with a letter.
export const bodyArbitrary = fc.oneof(fc.constant(''), fc.tuple(
  fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'),
  fc.string({ unit: fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz '), maxLength: 23 }),
).map(([first, rest]) => first + rest, body => {
  if (typeof body !== 'string' || !body.length || !'abcdefghijklmnopqrstuvwxyz'.includes(body[0]!)) throw new Error('Expected a body starting with a letter');
  return [body[0]!, body.slice(1)] as [string, string];
}));

export const rowArbitrary: fc.Arbitrary<Row> = fc.oneof(
  fc.record({ kind: fc.constant('item' as const), indent: fc.constantFrom('', ' ', '  ', '    ', '        ', '\t', ' \t', '\t '), marker: fc.constantFrom('-', '*', '+', '1.', '2.', '9.', '10.', '99.', '123456789.', '1)', '10)'), gap: fc.constantFrom('', ' ', '\t'), body: bodyArbitrary }),
  fc.record({ kind: fc.constant('blank' as const), marker: fc.constant(''), gap: fc.constant(''), body: fc.constant(''), indent: fc.constantFrom('', ' ', '\t') }),
  fc.record({ kind: fc.constant('prose' as const), marker: fc.constant(''), gap: fc.constant(''), indent: fc.constant(''), body: fc.constantFrom('prose', '-not list', '1234567890. x', '**bold** start', 'plain text', '-not a list') }),
);

export const parents = {
  none: { source: '', row: null }, prose: { source: 'prose\n\n', row: prose() },
  bullet: { source: '- a\n', row: item('-', '', 'a') }, numbered: { source: '9. a\n', row: item('9.', '', 'a') },
  one: { source: '1. a\n', row: item('1.', '', 'a') }, ninetyNine: { source: '99. a\n', row: item('99.', '', 'a') }, star: { source: '* a\n', row: item('*', '', 'a') },
  numberInBody: { source: '1. a2. b\n', row: item('1.', '', 'a2. b') },
  x: { source: '- x\n', row: item('-', '', 'x') },
  continued: { source: '1. a\n    1. b\n', row: item('1.', '    ', 'b') },
  nestedBullet: { source: '- a\n    - b\n', row: item('-', '    ', 'b') },
  indented: { source: '    content\n', row: prose('content', '    ') },
};

export type Parent = keyof typeof parents;

export type History = { after: string; parent: Parent; rows: Row[]; out: boolean; mode: 'caret' | 'range' | 'nextStart'; a: number; b: number };

// The old suffix domain remains a separate unchanged branch. Complete outside
// blank lines vary independently; they are not selected paragraph body.
export const legacyAfterArbitrary = fc.constantFrom('', '\n', '\n- z', '\n- c', '\n- d', '\n3. c', '\n- b', '\n- second', '\n    - b');
const blankSuffixRecipeArbitrary: fc.Arbitrary<[string[], string]> = fc.tuple(
  fc.array(fc.string({ unit: fc.constantFrom(' ', '\t'), maxLength: 4 }), { minLength: 1, maxLength: 2 }),
  fc.constantFrom('', '- z', '3. c'),
);
export function blankSuffixRecipe(value: unknown): [string[], string] {
  if (typeof value !== 'string' || !value.startsWith('\n')) throw new Error('Expected a blank-line suffix');
  const lines = value.slice(1).split('\n'), ending = lines.pop()!;
  const recipe: [string[], string] = [lines, ending];
  if (!blankSuffixRecipeArbitrary.canShrinkWithoutContext(recipe)) throw new Error('Expected one or two bounded blank lines and a supported ending');
  return recipe;
}
export const blankSuffixArbitrary = blankSuffixRecipeArbitrary.map(
  ([lines, ending]) => '\n' + lines.map(line => line + '\n').join('') + ending,
  blankSuffixRecipe,
);
export function blankSuffixStates(after: string): string[] {
  let lines: string[], ending: string;
  try { [lines, ending] = blankSuffixRecipe(after); } catch { return []; }
  return ['sourceTrailingBlankContext', 'sourceTrailingBlankRows' + lines.length,
    ending ? 'sourceTrailingBlankBeforeList' : 'sourceTrailingBlankAtEof',
    ...(lines.some(line => !line) ? ['sourceTrailingBlankEmpty'] : []),
    ...(lines.some(line => /^ +$/.test(line)) ? ['sourceTrailingBlankSpaces'] : []),
    ...(lines.some(line => /^\t+$/.test(line)) ? ['sourceTrailingBlankTabs'] : []),
    ...(lines.some(line => line.includes(' ') && line.includes('\t')) ? ['sourceTrailingBlankMixed'] : [])];
}

export const arbitrary: fc.Arbitrary<History> = fc.record({ after: fc.oneof(legacyAfterArbitrary, blankSuffixArbitrary), parent: fc.constantFrom(...Object.keys(parents) as Parent[]), rows: fc.array(rowArbitrary, { minLength: 1, maxLength: 4 }), out: fc.boolean(), mode: fc.constantFrom('caret', 'range', 'nextStart'), a: fc.nat(40), b: fc.nat(40) });

export const h = (extra: Partial<History> = {}): History => ({ after: '\n- z', parent: 'bullet', rows: [item()], out: false, mode: 'caret', a: 3, b: 3, ...extra });

export const cases: Record<string, History> = {
  bullet: h(), caretStart: h({ a: 0 }), number: h({ parent: 'numbered', rows: [item('2.')] }),
  continues: h({ parent: 'continued', rows: [item('2.')] }), numberWidth: h({ parent: 'numbered', rows: [item('10.')], a: 5 }),
  mixedBullets: h({ rows: [item('+', '    ', 'b c')], a: 7 }), parenthesis: h({ rows: [item('10)')], a: 5 }),
  emptyMarker: h({ rows: [item('-', '', '', '')], a: 1 }),
  out4: h({ rows: [item('-', '    ')], out: true, a: 7 }), out2: h({ rows: [item('-', '  ')], out: true, a: 5 }),
  outTab: h({ rows: [item('-', '\t')], out: true, a: 4 }), out8: h({ rows: [item('-', '        ')], out: true, a: 11 }),
  caretInsideIndent: h({ rows: [item('-', '    ')], out: true, a: 2 }),
  multiple: h({ rows: [item(), blank(), item('-', '', 'c')], mode: 'range', a: 0, b: 3 }),
  multipleOut: h({ rows: [item('-', '    '), item('-', '    ', 'c')], out: true, mode: 'range', a: 0, b: 7 }),
  nextStart: h({ rows: [item('-', '', 'a')], mode: 'nextStart', a: 0 }),
  plain: h({ rows: [prose()] }), empty: h({ rows: [blank()] }), nonlist: h({ rows: [prose('-not list')] }),
  mixed: h({ rows: [item(), prose()], mode: 'range', a: 0, b: 5 }), marginOut: h({ out: true }),
  boldProse: h({ rows: [prose('**bold** start')] }), noParent: h({ parent: 'none' }), proseParent: h({ parent: 'prose' }),
  initialBlank: h({ parent: 'none', rows: [blank(), item('-', '    ', 'x')], out: true, mode: 'range', a: 0, b: 7 }),
  whitespaceBlank: h({ rows: [blank(' '), item('2.')], mode: 'range', a: 0, b: 4 }),
  indentedParent: h({ parent: 'indented' }),
};

// Every existing constructed input remains; add EOF variants independently.
Object.assign(cases, Object.fromEntries(Object.entries(cases).map(([name, h]) => [name + 'AtEof', { ...h, after: '' }])));

// These structured inputs reconstruct all 24 original source assertions. Expected
// edits still come from the same row/selection model as the generated histories.
Object.assign(cases, {
  originalIndentBullet: h({ after: '' }), // old line 88
  originalIndentBeforeMarker: h({ after: '', a: 0 }), // 89
  originalNumberRestart: h({ parent: 'one', rows: [item('2.')], after: '\n3. c', a: 4 }), // 91
  originalNumberContinuation: h({ parent: 'continued', rows: [item('2.', '', 'c')], after: '', a: 4 }), // 92
  originalNumberWidth: h({ rows: [item('10.')], parent: 'numbered', after: '', a: 5 }), // 93
  originalMixedBullets: h({ parent: 'star', rows: [item('+', '    ', 'b c')], after: '', a: 7 }), // 94
  originalParenthesis: h({ rows: [item('10)')], after: '', a: 5 }), // 95
  originalEmptyMarker: h({ rows: [item('-', '', '', '')], after: '', a: 1 }), // 96
  originalOut4: h({ rows: [item('-', '    ')], out: true, after: '', a: 7 }), // 100
  originalOut2: h({ rows: [item('-', '  ')], out: true, after: '', a: 5 }), // 101
  originalOutTab: h({ rows: [item('-', '\t')], out: true, after: '', a: 4 }), // 102
  originalOut8: h({ rows: [item('-', '        ')], out: true, after: '', a: 11 }), // 103
  originalCaretInsideIndent: h({ rows: [item('-', '    ')], out: true, after: '', a: 2 }), // 105
  originalMultiple: h({ rows: [item(), blank(), item('-', '', 'c')], mode: 'range', a: 0, b: 3, after: '\n- d' }), // 109
  originalMultipleOut: h({ rows: [item('-', '    '), item('-', '    ', 'c')], out: true, mode: 'range', a: 0, b: 7, after: '' }), // 110
  originalNextStart: h({ parent: 'x', rows: [item('-', '', 'a')], mode: 'nextStart', a: 0, after: '\n- b' }), // 112
  originalPlain: h({ parent: 'none', rows: [prose('plain text')], after: '', a: 5 }), // 116
  originalEmpty: h({ parent: 'none', rows: [blank()], after: '', a: 0 }), // 117
  originalNonlist: h({ parent: 'none', rows: [prose('-not a list')], after: '', a: 11 }), // 118
  originalMixedSelection: h({ parent: 'none', rows: [item('-', '', 'a'), prose()], mode: 'range', a: 0, b: 5, after: '' }), // 119
  originalMarginOut: h({ parent: 'none', rows: [item('-', '', 'already at the margin')], out: true, after: '', a: 23 }), // 120
  originalBoldProse: h({ parent: 'none', rows: [prose('**bold** start')], after: '', a: 14 }), // 121
  originalNoParent: h({ parent: 'none', rows: [item('-', '', 'first')], after: '\n- second', a: 7 }), // 123
  originalProseParent: h({ parent: 'prose', rows: [item('-', '', 'first')], after: '', a: 7 }), // 124
  existingBulletSource: h({ parent: 'nestedBullet', rows: [item('-', '    ', 'c')], after: '', a: 7 }),
  // The first blank line is the whole caret selection; its indented successor
  // must stay untouched, including when the selection starts at document zero.
  firstBlankOutdent: h({ parent: 'none', rows: [blank()], out: true, after: '\n    - b', a: 0 }),
  // A preceding same-depth numbered item cannot make a continuation when the
  // selection starts with a blank. A number in parent text is no depth match.
  leadingBlankNumberRestart: h({ parent: 'continued', rows: [blank(), item('2.')], mode: 'range', a: 0, b: 4 }),
  numberInParentBody: h({ parent: 'numberInBody', rows: [item('2.')], a: 4 }),
  ordinaryParent99Caret: h({ parent: 'ninetyNine', rows: [item('2.')], after: '', a: 4 }),
  ordinaryParent99Range: h({ parent: 'ninetyNine', rows: [item('2.')], after: '', mode: 'range', a: 0, b: 4 }),
});

export function resolve(history: History) {
  const prefix = parents[history.parent].source;
  const strings = history.rows.map(rowText), offsets: number[] = [];
  let offset = prefix.length;
  for (const line of strings) { offsets.push(offset); offset += line.length + 1; }
  const text = prefix + strings.join('\n') + history.after;
  let from = offsets[0]! + history.a % (strings[0]!.length + 1), to: number;
  if (history.mode === 'caret') to = from;
  else if (history.mode === 'nextStart') to = Math.min(offset, text.length);
  else {
    to = offsets.at(-1)! + history.b % (strings.at(-1)!.length + 1);
    if (to < from) [from, to] = [to, from];
  }
  const last = from === to ? 0 : Math.max(0, offsets.filter(start => start < to).length - 1);
  return { history, text, from, to, offsets, last };
}

export type Plan = ReturnType<typeof resolve>;

// Raw source spelling is not a list level: tabs occupy cells through the next
// four-column stop. This geometry is independent of production's row scanner.
const indentColumns = (raw: string) => [...raw].reduce((column, token) => token === '\t' ? 4 * (Math.floor(column / 4) + 1) : column + 1, 0);

export function model(p: Plan) {
  return moveRows({ text: p.text, from: p.from, to: p.to, offsets: p.offsets,
    rows: p.history.rows.slice(0, p.last + 1), parent: parents[p.history.parent].row, out: p.history.out });
}

/** Whole-line list geometry; explicit rows also admit mixed-action documents. */
export function moveRows(p: { text: string; from: number; to: number; offsets: number[]; rows: Row[]; parent: Row | null; out: boolean }, indentOverride?: string) {
  const rows = p.rows, filled = rows.filter(r => r.kind !== 'blank');
  const declined = { edit: null, output: p.text };
  if (!filled.length || filled.some(r => !list(r))) return declined;
  const parent = p.parent;
  if (!p.out && (!parent || !list(parent) && !parent.indent)) return declined;
  const firstFilled = rows.find(r => r.kind !== 'blank')!;
  const indent = indentOverride ?? (parent && numbered(parent) && indentColumns(parent.indent) === indentColumns(firstFilled.indent) ? ' '.repeat(Math.max(4, parent.marker.length + 1)) : '    ');
  const moved = rows.map(r => {
    if (r.kind === 'blank') return rowText(r);
    if (!p.out) return indent + rowText(r);
    let remove = 0;
    if (r.indent[0] === '\t') remove = 1;
    else while (remove < 4 && r.indent[remove] === ' ') remove++;
    return rowText(r).slice(remove);
  });
  if (!p.out) {
    const first = rows.findIndex(r => r.kind !== 'blank'), r = rows[first]!;
    const continues = first === 0 && parent && numbered(parent) && parent.indent === indent + r.indent;
    if (numbered(r) && !continues) moved[first] = indent + r.indent + '1' + r.marker.at(-1)! + r.gap + r.body;
  }
  const original = rows.map(rowText).join('\n'), insert = moved.join('\n');
  if (insert === original) return declined;
  const start = p.offsets[0]!, end = p.offsets[rows.length - 1]! + rowText(rows.at(-1)!).length;
  const caret = Math.max(start, p.from + moved[0]!.length - rowText(rows[0]!).length);
  const edit: FormatEdit = { from: start, to: end, insert, start: p.from === p.to ? caret : start, end: p.from === p.to ? caret : start + insert.length };
  return { edit, output: p.text.slice(0, start) + insert + p.text.slice(end) };
}

export function states(p: Plan) {
  const rows = p.history.rows.slice(0, p.last + 1);
  const parent = parents[p.history.parent].row;
  return [p.history.out ? 'outdent' : 'indent', p.from === p.to ? 'caret' : 'range',
  ...(rows.some(r => r.kind === 'blank') ? ['blankRows'] : []), ...(rows.some(numbered) ? ['numbered'] : []),
  ...(rows.some(r => !list(r) && r.kind !== 'blank') ? ['nonlist'] : []),
  ...(!p.history.out && parent && numbered(parent) && parent.marker.length === 3 && parent.gap === ' ' && rows.every(r => r.kind === 'blank' || list(r)) && rows[0]?.kind === 'item' && rows[0].indent === parent.indent ? ['ordinarySourceIndentBoundary'] : []),
  ...(p.history.parent === 'none' ? ['noParent'] : []), ...(p.history.parent === 'continued' ? ['continued'] : []),
  ...(p.history.parent === 'star' ? ['starParent'] : []), ...(p.history.parent === 'nestedBullet' ? ['nestedParent'] : []),
  ...(p.text.length === 0 ? ['emptyDocument'] : []),
  ...(p.history.mode === 'nextStart' ? ['nextLineExcluded'] : []),
  ...(p.from === 0 ? ['documentStart'] : []), ...(p.to === p.text.length ? ['documentEnd'] : []), ...(rows.some(r => r.indent.includes('\t')) ? ['tabIndent'] : []),
  ...(p.history.out && p.from === p.to && p.from - p.offsets[0]! < rows[0]!.indent.length ? ['caretInIndent'] : [])];
}

// A selected tail names its containing selected item by preorder index; null
// means another root beside the first selected item. This is model-only input
// structure, kept separate from its independently varied raw indentation.
export type SelectedTailRow = { parent: number | null; indent: string; marker: string; gap: string; body: string };

export type Nest = { parent: number | string; child: number | string; delimiter: string; bullet: boolean; body: string; parentBody?: string; parentBullet?: string; childBullet?: string; childDelimiter?: string; parentGap?: string; existing?: boolean; outer?: 'empty' | 'blank' | 'lazy' | 'inline' | 'emptyPadding'; parentIndent?: string; childIndent?: string; oneShallower?: boolean; peers?: { indent: string; body: string }[]; childGap?: string; selectedTail?: SelectedTailRow[] };

export const renderedBody = fc.string({ unit: fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'), minLength: 1, maxLength: 12 });

const parentMarker = (h: Nest) => h.bullet ? h.parentBullet ?? '-' : String(h.parent) + h.delimiter;

// These are source recipes for containing items, not a parser or production
// classification. Bodies list their nested item ancestry from outer to inner.
const containers = {
  empty: { source: '-\n', bodies: [''], tight: true },
  blank: { source: '- x\n\n', bodies: ['x'], tight: false },
  lazy: { source: '- a\nlazy\n\n', bodies: ['a\nlazy'], tight: false },
  inline: { source: '- - a\n\n', bodies: ['', 'a'], tight: false },
  emptyPadding: { source: '-    \n', bodies: [''], tight: true },
};

// CommonMark's text-parent premise is one through four visual columns of
// marker padding. This constructs raw input spellings only: the rendered model
// below still predicts ancestry, never a production indentation calculation.
// An empty supported marker also admits zero raw padding and has no inline text.
export function parentGapColumns(markerWidth: number, gap: string) {
  let column = markerWidth;
  for (const token of gap) {
    if (token === ' ') column++;
    else if (token === '\t') column += 4 - column % 4;
    else return Number.NaN;
  }
  return column - markerWidth;
}

export function parentGapRecipes(markerWidth: number): string[] {
  const recipes: string[] = [];
  const extend = (raw: string, advance: number) => {
    for (const token of [' ', '\t']) {
      const next = advance + (token === ' ' ? 1 : 4 - (markerWidth + advance) % 4);
      if (next > 4) continue;
      const gap = raw + token;
      recipes.push(gap);
      extend(gap, next);
    }
  };
  extend('', 0);
  return recipes;
}

const parentGaps = (h: Nest) => h.parentBody === '' ? ['', ...parentGapRecipes(parentMarker(h).length)] : parentGapRecipes(parentMarker(h).length);

// Raw digit spelling matters even when numeric value agrees: 1 and 0001 have
// different marker widths and tab-stop phases. Canonical numeric inputs retain
// all original histories; raw digit strings add zero and leading-zero forms.
const markerNumber = fc.oneof(
  fc.integer({ min: 0, max: 999999999 }),
  fc.string({ unit: fc.constantFrom(...'0123456789'), minLength: 1, maxLength: 9 }),
);

// Keep omission of optional fields legal, preserving every old history.
// Independent child delimiters also reconstruct the saved probes' dot children
// under parenthesis parents; the list ancestry model is unaffected.
const originalFlatNestingArbitrary = fc.record({
  parent: markerNumber, child: markerNumber,
  delimiter: fc.constantFrom('.', ')'), bullet: fc.boolean(), body: renderedBody,
  parentBody: fc.constantFrom('a', 'b', ''), parentBullet: fc.constantFrom('-', '*', '+'), childBullet: fc.constantFrom('-', '*', '+'), childDelimiter: fc.constantFrom('.', ')'),
}, { requiredKeys: ['parent', 'child', 'delimiter', 'bullet', 'body'] });
type FlatNest = typeof originalFlatNestingArbitrary extends fc.Arbitrary<infer H> ? H : never;

// A recipe index makes dependent whitespace constructive and shrinkable. Its
// inverse accepts every legal raw recipe, not only hand-written probe gaps.
const paddedFlatNestingArbitrary = fc.tuple(originalFlatNestingArbitrary, fc.nat()).map(
  ([h, index]) => {
    const recipes = parentGaps(h);
    return { ...h, parentGap: recipes[index % recipes.length]! };
  },
  candidate => {
    if (!candidate || typeof candidate !== 'object' || typeof (candidate as Nest).parentGap !== 'string') throw new Error('Expected explicit parent padding');
    const { parentGap, ...h } = candidate as Nest;
    if (!originalFlatNestingArbitrary.canShrinkWithoutContext(h)) throw new Error('Expected a supported flat parent and child');
    const index = parentGaps(h).indexOf(parentGap!);
    if (index < 0) throw new Error('Expected supported parent padding; zero is legal only for an empty parent');
    return [h as FlatNest, index] as [FlatNest, number];
  },
);
export const flatNestingArbitrary: fc.Arbitrary<Nest> = fc.oneof(originalFlatNestingArbitrary, paddedFlatNestingArbitrary);

export const existingNestingArbitrary = fc.record({
  parent: fc.constant(1), child: fc.constant(2), delimiter: fc.constant('.'), bullet: fc.constant(true),
  body: renderedBody, childBullet: fc.constantFrom('-', '*', '+'), existing: fc.constant(true),
});

// A two-column outer bullet admits a following sibling-list scene at column4.
// Its independent raw prefixes reach columns3/4/5: these are semantic siblings
// even when the marker columns or the whitespace spellings differ. A blank
// after outer text makes every supported ordered start legal (CommonMark5.2).
const siblingContextArbitrary = fc.record({
  outer: fc.constantFrom('empty' as const, 'blank' as const),
  parentIndent: fc.constantFrom('    ', '\t', ' \t', '  \t', '   \t'),
  childIndent: fc.constantFrom('   ', '    ', '\t', ' \t', '  \t', '   \t', '     ', '\t '),
});
type SiblingContext = typeof siblingContextArbitrary extends fc.Arbitrary<infer H> ? H : never;
const contextualNestingArbitrary = fc.tuple(flatNestingArbitrary, siblingContextArbitrary).map<Nest>(
  ([h, context]) => ({ ...h, ...context }),
  candidate => {
    if (!candidate || typeof candidate !== 'object') throw new Error('Expected a sibling-container input');
    const { outer, parentIndent, childIndent, ...h } = candidate as Nest;
    const context = { outer, parentIndent, childIndent };
    if (!flatNestingArbitrary.canShrinkWithoutContext(h) || !siblingContextArbitrary.canShrinkWithoutContext(context)) throw new Error('Expected a supported sibling-container recipe');
    return [h, context as SiblingContext] as [Nest, SiblingContext];
  },
);
const containerIntentArbitrary = fc.record({
  outer: fc.constantFrom('lazy' as const, 'inline' as const, 'emptyPadding' as const),
  oneShallower: fc.boolean(), parentSpelling: fc.integer({ min: 0, max: 2 }), childSpelling: fc.integer({ min: 0, max: 2 }),
});
type ContainerIntent = typeof containerIntentArbitrary extends fc.Arbitrary<infer H> ? H : never;
const containerIndents = (outer: ContainerIntent['outer']) => outer === 'inline' ? ['      ', '\t  ', ' \t  '] : ['    ', '\t', ' \t'];
const boundaryNestingArbitrary = fc.tuple(flatNestingArbitrary, containerIntentArbitrary).map<Nest>(
  ([h, intent]) => ({ ...h, bullet: false, childBullet: '-', parentGap: ' ', outer: intent.outer, oneShallower: intent.oneShallower,
    parentIndent: containerIndents(intent.outer)[intent.parentSpelling]!,
    childIndent: intent.oneShallower ? intent.outer === 'inline' ? '  ' : '' : containerIndents(intent.outer)[intent.childSpelling]!,
  }),
  candidate => {
    if (!candidate || typeof candidate !== 'object') throw new Error('Expected a containing-item boundary');
    const { outer, oneShallower, parentIndent, childIndent, ...h } = candidate as Nest;
    if (outer !== 'lazy' && outer !== 'inline' && outer !== 'emptyPadding' || typeof oneShallower !== 'boolean' || h.bullet || h.childBullet !== '-' || h.parentGap !== ' ' || !flatNestingArbitrary.canShrinkWithoutContext(h)) throw new Error('Expected a numbered-parent boundary recipe');
    const indents = containerIndents(outer), parentSpelling = indents.indexOf(parentIndent!), childSpelling = oneShallower ? 0 : indents.indexOf(childIndent!);
    if (parentSpelling < 0 || childSpelling < 0 || oneShallower && childIndent !== (outer === 'inline' ? '  ' : '')) throw new Error('Expected a legal same-container or shallower-container prefix');
    return [h, { outer, oneShallower, parentSpelling, childSpelling }] as [Nest, ContainerIntent];
  },
);
// A selected range contains two to four semantic peers. A one-column band
// keeps every original marker below the preceding peer's content column;
// independent raw spellings still change phase when a prefix is inserted.
const peerIntentArbitrary = fc.record({
  outer: fc.constantFrom('empty' as const, 'blank' as const),
  parentIndent: fc.constantFrom('    ', '\t', ' \t'), band: fc.constantFrom('lower' as const, 'upper' as const),
  first: fc.nat(), peers: fc.array(fc.record({ prefix: fc.nat(), body: renderedBody }), { minLength: 1, maxLength: 3 }),
});
const peerPrefixes = (band: 'lower' | 'upper') => band === 'lower'
  ? ['   ', '    ', '\t', ' \t', '  \t', '   \t'] : ['    ', '\t', ' \t', '  \t', '   \t', '     ', '\t ', ' \t '];
const rangeNestingArbitrary = fc.tuple(flatNestingArbitrary, peerIntentArbitrary).map<Nest>(
  ([h, intent]) => { const recipes = peerPrefixes(intent.band); return {
    ...h, bullet: false, childBullet: '-', parentGap: ' ', outer: intent.outer, parentIndent: intent.parentIndent,
    childIndent: recipes[intent.first % recipes.length]!,
    peers: intent.peers.map(peer => ({ indent: recipes[peer.prefix % recipes.length]!, body: peer.body })),
  }; },
  candidate => {
    if (!candidate || typeof candidate !== 'object') throw new Error('Expected a selected peer range');
    const { outer, parentIndent, childIndent, peers, ...h } = candidate as Nest;
    if ((outer !== 'empty' && outer !== 'blank') || h.bullet || h.childBullet !== '-' || h.parentGap !== ' ' || !flatNestingArbitrary.canShrinkWithoutContext(h) || !Array.isArray(peers)) throw new Error('Expected supported peer-range rows');
    const band = [childIndent, ...peers.map(peer => peer.indent)].every(indent => peerPrefixes('lower').includes(indent!)) ? 'lower' : 'upper';
    const recipes = peerPrefixes(band), first = recipes.indexOf(childIndent!);
    const intent = { outer, parentIndent, band, first, peers: peers.map(peer => ({ prefix: recipes.indexOf(peer.indent), body: peer.body })) };
    if (first < 0 || intent.peers.some(peer => peer.prefix < 0) || !peerIntentArbitrary.canShrinkWithoutContext(intent)) throw new Error('Expected one-column sibling-prefix band');
    return [h, intent] as [Nest, typeof intent];
  },
);

// Every preorder forest of two through four selected items with at least one
// selected parent-child edge. The flat peer grammar remains its own unchanged
// lane. These are relationships, not expected production observations.
export const selectedShapes = [
  [null, 0],
  [null, null, 1], [null, 0, null], [null, 0, 0], [null, 0, 1],
  [null, null, null, 2], [null, null, 1, null], [null, null, 1, 1], [null, null, 1, 2],
  [null, 0, null, null], [null, 0, null, 2], [null, 0, 0, null], [null, 0, 0, 0],
  [null, 0, 0, 2], [null, 0, 1, null], [null, 0, 1, 0], [null, 0, 1, 1], [null, 0, 1, 2],
] as readonly (readonly (number | null)[])[];
const shapesOfSize = (size: number) => selectedShapes.filter(shape => shape.length === size);

// An integer varies every space/tab choice through the target column. The
// inverse records those choices; no post-generation filter selects legal text.
export function indentSpelling(target: number, choices: number) {
  let raw = '', column = 0;
  while (column < target) {
    const tab = 4 * (Math.floor(column / 4) + 1);
    const useTab = choices % 2 === 1 && tab <= target;
    raw += useTab ? '\t' : ' ';
    column = useTab ? tab : column + 1;
    choices = Math.floor(choices / 2);
  }
  return raw;
}
function spellingChoices(raw: string) {
  let choices = 0;
  for (const [index, token] of [...raw].entries()) {
    if (token !== ' ' && token !== '\t') throw new Error('Expected only indentation cells');
    if (token === '\t') choices += 2 ** index;
  }
  return choices;
}
const markerArbitrary = fc.oneof(
  fc.constantFrom('-', '*', '+'),
  fc.tuple(markerNumber, fc.constantFrom('.', ')')).map<string>(([number, delimiter]) => String(number) + delimiter,
    marker => { if (typeof marker !== 'string') throw new Error('Expected a marker string'); const match = /^(\d{1,9})([.)])$/.exec(marker); if (!match) throw new Error('Expected an ordered marker'); return [match[1]!, match[2]!] as [number | string, '.' | ')']; }),
);
// At most 34 cells: root 5, wide root content +15, then two +7 descendants.
// A choice bit per raw token therefore fits an exact 34-bit safe integer.
export const MAX_SELECTED_INDENT_COLUMNS = 34;
const rowRecipeFields = { column: fc.nat(), spelling: fc.nat({ max: 2 ** MAX_SELECTED_INDENT_COLUMNS - 1 }), gap: fc.nat(), body: renderedBody };
const rowRecipeArbitrary = fc.record(rowRecipeFields);
export const selectedRecipeArbitrary = fc.record({
  outer: fc.constantFrom('empty' as const, 'blank' as const), parent: markerNumber, delimiter: fc.constantFrom('.', ')'),
  parentBody: fc.constantFrom('a', 'b', ''), parentIndent: fc.constantFrom('    ', '\t', ' \t', '  \t', '   \t'), parentGap: fc.nat(),
  band: fc.constantFrom('lower' as const, 'upper' as const), shape: fc.nat(), firstMarker: markerArbitrary, first: rowRecipeArbitrary,
  tail: fc.array(fc.record({ ...rowRecipeFields, marker: fc.constantFrom('-', '*', '+', '1.', '1)') }), { minLength: 1, maxLength: 3 }),
});

export type SelectedRecipe = typeof selectedRecipeArbitrary extends fc.Arbitrary<infer H> ? H : never;
const contentColumn = (row: Pick<SelectedTailRow, 'indent' | 'marker' | 'gap'>) => indentColumns(row.indent + row.marker + row.gap);
export function selectedFromRecipe(recipe: SelectedRecipe): Nest {
  const shape = shapesOfSize(recipe.tail.length + 1)[recipe.shape % shapesOfSize(recipe.tail.length + 1).length]!;
  const floor = recipe.band === 'lower' ? 3 : 4;
  const rows: SelectedTailRow[] = [];
  for (let index = 0; index < shape.length; index++) {
    const intent = index === 0 ? recipe.first : recipe.tail[index - 1]!;
    const parent = shape[index]!, marker = index === 0 ? recipe.firstMarker : recipe.tail[index - 1]!.marker;
    const column = parent === null ? floor + intent.column % 2 : contentColumn(rows[parent]!) + intent.column % 2;
    const indent = indentSpelling(column, intent.spelling), gaps = parentGapRecipes(column + marker.length);
    rows.push({ parent, indent, marker, gap: gaps[intent.gap % gaps.length]!, body: intent.body });
  }
  const first = rows[0]!, number = /^(\d+)([.)])$/.exec(first.marker);
  const parent = { parent: recipe.parent, child: number?.[1] ?? 2, delimiter: recipe.delimiter, bullet: false,
    body: first.body, parentBody: recipe.parentBody, parentIndent: recipe.parentIndent, outer: recipe.outer,
    childIndent: first.indent, childGap: first.gap, ...(number ? { childDelimiter: number[2] } : { childBullet: first.marker }) };
  const gaps = parentGaps(parent);
  return { ...parent, parentGap: gaps[recipe.parentGap % gaps.length]!, selectedTail: rows.slice(1) };
}
function selectedRecipe(value: unknown): SelectedRecipe {
  if (!value || typeof value !== 'object') throw new Error('Expected a selected ancestry history');
  const candidate = value as Nest;
  if (!candidate || typeof candidate !== 'object' || !candidate.selectedTail?.length || candidate.peers || candidate.existing || candidate.oneShallower || candidate.bullet
    || candidate.outer !== 'empty' && candidate.outer !== 'blank' || candidate.parentIndent === undefined || candidate.childIndent === undefined) throw new Error('Expected a complete selected ancestry recipe');
  const rows = selectedRows(candidate), roots = rows.filter(row => row.parent === null), rootColumns = roots.map(row => indentColumns(row.indent));
  const band = rootColumns.every(column => column === 3 || column === 4) ? 'lower' : 'upper', floor = band === 'lower' ? 3 : 4;
  const shapes = shapesOfSize(rows.length), shape = shapes.findIndex(shape => JSON.stringify(shape) === JSON.stringify(rows.map(row => row.parent)));
  const intents = rows.map((row, index) => {
    const column = indentColumns(row.indent) - (row.parent === null ? floor : contentColumn(rows[row.parent]!));
    const gaps = parentGapRecipes(indentColumns(row.indent) + row.marker.length), gap = gaps.indexOf(row.gap);
    if (column < 0 || column > 1 || gap < 0 || index > 0 && !['-', '*', '+', '1.', '1)'].includes(row.marker)) throw new Error('Expected a constructive selected item column, marker and padding');
    return { column, spelling: spellingChoices(row.indent), gap, body: row.body, marker: row.marker };
  });
  const first = intents[0]!, { marker: firstMarker, ...firstIntent } = first;
  const recipe = { outer: candidate.outer, parent: candidate.parent, delimiter: candidate.delimiter, parentBody: candidate.parentBody ?? 'a',
    parentIndent: candidate.parentIndent, parentGap: parentGaps(candidate).indexOf(candidate.parentGap ?? ' '), band, shape,
    firstMarker, first: firstIntent, tail: intents.slice(1) } as SelectedRecipe;
  if (shape < 0 || recipe.parentGap < 0 || !selectedRecipeArbitrary.canShrinkWithoutContext(recipe) || JSON.stringify(selectedRows(selectedFromRecipe(recipe))) !== JSON.stringify(selectedRows(candidate))) throw new Error('Expected a supported selected ancestry history');
  return recipe;
}
export const selectedNestingArbitrary: fc.Arbitrary<Nest> = selectedRecipeArbitrary.map(selectedFromRecipe, selectedRecipe);
export function selectedRows(h: Nest): SelectedTailRow[] {
  return [{ parent: null, indent: h.childIndent ?? '', marker: h.childBullet ?? String(h.child) + (h.childDelimiter ?? h.delimiter), gap: h.childGap ?? ' ', body: h.body }, ...(h.selectedTail ?? [])];
}
// Expected item identities come from the declared preorder forest. A move adds
// the preceding item's identity to every selected ancestry, leaving all links
// between selected parents and children intact. No parser computes this answer.
export function selectedTree(p: ReturnType<typeof nestingPlan>, moved: boolean) {
  const outer = p.h.outer ? containers[p.h.outer] : undefined;
  const enclosing = outer ? outer.bodies.map((_body, index) => index) : [];
  const records = (outer?.bodies ?? []).map((body, index) => ({ line: index, ancestors: enclosing.slice(0, index), body }));
  records.push({ line: p.parentLine, ancestors: [...enclosing], body: p.h.parentBody ?? 'a' });
  const rows = selectedRows(p.h), firstLine = p.parentLine + 1;
  for (const [index, row] of rows.entries()) {
    const chain: number[] = [];
    for (let parent = row.parent; parent !== null; parent = rows[parent]!.parent) chain.unshift(firstLine + parent);
    records.push({ line: firstLine + index, ancestors: [...enclosing, ...(moved ? [p.parentLine] : []), ...chain], body: row.body });
  }
  return records;
}
export const nestingArbitrary: fc.Arbitrary<Nest> = fc.oneof(flatNestingArbitrary, existingNestingArbitrary, contextualNestingArbitrary, boundaryNestingArbitrary, rangeNestingArbitrary, selectedNestingArbitrary);


export const nestingCases: Record<string, Nest> = Object.fromEntries([1, 9, 10, 99, 100, 999, 1000, 10000, 100000, 1000000, 10000000, 99999999, 100000000, 999999999].map(n => [`number${n}`, { parent: n, child: n + (n === 999999999 ? 0 : 1), delimiter: '.', bullet: false, body: 'b' }]));

nestingCases.bullet = { parent: 1, child: 2, delimiter: ')', bullet: true, body: 'b' };

// Each old rendering input (line 130) remains a guaranteed history. The same
// structural model and renderer driver also check the generated neighbors.
Object.assign(nestingCases, {
  originalBulletChild: { parent: 1, child: 2, delimiter: '.', bullet: true, childBullet: '-', body: 'b' },
  originalNumberedChild1: { parent: 1, child: 2, delimiter: '.', bullet: false, body: 'b' },
  originalNumberedChild10: { parent: 10, child: 11, delimiter: '.', bullet: false, body: 'b' },
  originalMixedLists: { parent: 1, child: 2, delimiter: '.', bullet: true, body: 'b' },
  originalExistingSublist: { parent: 1, child: 2, delimiter: '.', bullet: true, childBullet: '-', existing: true, body: 'c' },
});

// PAD-001 varies actual marker padding while keeping the same ancestry law.
// These constructions guarantee its thresholds; the arbitrary also admits all
// sixty saved probe inputs and every legal mixed space/tab recipe in the bound.
const paddedParent = (extra: Partial<Nest>): Nest => ({ parent: 100, child: 2, delimiter: '.', bullet: false, body: 'b', ...extra });
Object.assign(nestingCases, {
  parentPaddingOne: paddedParent({ parentGap: ' ' }),
  emptyParent99GapZero: paddedParent({ parent: 99, parentBody: '', parentGap: '' }),
  emptyParent100GapZero: paddedParent({ parent: 100, parentBody: '', parentGap: '' }),
  emptyParent99GapOne: paddedParent({ parent: 99, parentBody: '', parentGap: ' ' }),
  emptyParent100GapOne: paddedParent({ parent: 100, parentBody: '', parentGap: ' ' }),
  starParent: paddedParent({ bullet: true, parentBullet: '*', parentGap: '    ' }),
  plusParent: paddedParent({ bullet: true, parentBullet: '+', parentGap: '\t' }),
  zeroParent: paddedParent({ parent: 0 }),
  leadingZeroParent: paddedParent({ parent: '01', parentGap: '  ' }),
  leadingZeroParentMaxWidth: paddedParent({ parent: '000000001', parentGap: '\t' }),
  rawMaximumParent: paddedParent({ parent: '999999999' }),
  zeroChild: paddedParent({ child: 0 }),
  leadingZeroChild: paddedParent({ child: '02' }),
  leadingZeroChildMaxWidth: paddedParent({ child: '000000002' }),
  parentPaddingTwo: paddedParent({ parentGap: '  ' }),
  parentPaddingThree: paddedParent({ parentGap: '   ' }),
  parentPaddingFour: paddedParent({ parentGap: '    ' }),
  narrowPaddingFits: paddedParent({ parent: 1, parentGap: '  ' }),
  narrowPaddingExceeds: paddedParent({ parent: 1, parentGap: '   ' }),
  widestPadding: paddedParent({ parent: 999999999, parentGap: '    ' }),
  bulletPaddingFour: paddedParent({ bullet: true, parentGap: '    ', childBullet: '-' }),
  independentChildDelimiter: paddedParent({ delimiter: ')', childDelimiter: '.', parentGap: '  ' }),
  spaceThenTab: paddedParent({ parent: 1, parentGap: ' \t' }),
  tabThenSpace: paddedParent({ parent: 10, parentGap: '\t ' }),
  mixedPadding: paddedParent({ parent: 1, parentGap: ' \t ' }),
});
for (const parent of [1, 10, 100, 1000]) {
  const phase = (String(parent).length + 1) % 4;
  nestingCases[`parentTabPhase${phase}`] = paddedParent({ parent, parentGap: '\t' });
}

// Independent outer context, marker width and raw whitespace spellings make
// the reported sibling geometry a family rather than a pinned-only exception.
for (const outer of ['empty', 'blank'] as const) {
  for (const [name, parentIndent, childIndent] of [
    ['tabToSpaces', '\t', '    '], ['spacesToTab', '    ', '\t'],
    ['sameSpaces', '    ', '    '], ['sameTab', '\t', '\t'],
    ['mixedToTab', ' \t', '\t'], ['childColumnBelow', '\t', '   '], ['childColumnAbove', '\t', '     '],
  ]) for (const parent of [1, 99, 100, 999999999]) nestingCases[`siblings-${outer}-${name}-${parent}`] = paddedParent({
    outer, parentIndent, childIndent, parent, childBullet: '-', parentGap: ' ',
  });
}

// A visual-level shortcut must not turn an item from the enclosing list into
// a child of the preceding nested item. Lazy paragraphs, inline list markers
// and padding after an empty marker keep those enclosing containers distinct.
for (const outer of ['lazy', 'inline', 'emptyPadding'] as const) for (const oneShallower of [false, true]) {
  const indents = containerIndents(outer);
  for (const [name, parentSpelling, childSpelling] of [['same', 0, 0], ['tabToSpaces', 1, 0], ['spacesToTab', 0, 1]] as const) {
    nestingCases[`container-${outer}-${oneShallower ? 'shallower' : 'same'}-${name}`] = paddedParent({
      parentBody: 'b', body: 'c', childBullet: '-', parentGap: ' ', outer, oneShallower,
      parentIndent: indents[parentSpelling]!, childIndent: oneShallower ? outer === 'inline' ? '  ' : '' : indents[childSpelling]!,
    });
  }
}


// Every selected peer must remain visible under the same parent; the first
// row's tab-stop phase cannot choose an indent that strands a later row.
for (const outer of ['empty', 'blank'] as const) for (const parent of [99, 100, 999999999]) {
  for (const [name, childIndent, peerIndents] of [
    ['spaces-tab', '    ', ['\t']], ['tab-spaces', '\t', ['    ']],
    ['spaces-mixed', '    ', ['   \t']], ['first-fits', '     ', ['\t']],
    ['three-rows', '    ', ['\t', '    ']], ['four-rows', '\t', ['    ', ' \t', '   \t']],
  ] as const) nestingCases[`range-${outer}-${parent}-${name}`] = paddedParent({
    outer, parent, parentIndent: '    ', childIndent, childBullet: '-', parentGap: ' ',
    peers: peerIndents.map((indent, index) => ({ indent, body: String.fromCharCode(99 + index) })),
  });
}

nestingCases['range-empty-no-uniform-prefix'] = paddedParent({ outer: 'empty', parent: 999999, parentIndent: '    ', childIndent: '   \t', childBullet: '-', parentGap: ' ', peers: [{ indent: '   ', body: 'c' }] });
nestingCases['range-empty-no-prepend-pair'] = paddedParent({ outer: 'empty', parent: 9999999, parentIndent: '    ', childIndent: '\t ', childBullet: '-', parentGap: ' ', peers: [{ indent: '\t', body: 'c' }] });


// The two reported sources stay inputs to the same generated ancestry model.
Object.assign(nestingCases, {
  selectedSubtreeTabs: paddedParent({ outer: 'empty', parentIndent: '    ', childIndent: '    ', childBullet: '-', childGap: ' ',
    selectedTail: [{ parent: 0, indent: '\t  ', marker: '-', gap: ' ', body: 'c' }] }),
  selectedSubtreeNumberRestart: paddedParent({ outer: 'empty', parentIndent: '    ', childIndent: '    ', child: 100, childGap: '\t',
    selectedTail: [{ parent: 0, indent: '\t\t\t', marker: '-', gap: ' ', body: 'c' }] }),
});
for (const name of ['selectedSubtreeTabs', 'selectedSubtreeNumberRestart']) nestingCases[name] = selectedFromRecipe(selectedRecipe(nestingCases[name]!));
for (const [index, shape] of selectedShapes.entries()) {
  const size = shape.length, localShape = shapesOfSize(size).indexOf(shape), width = 1 + index % 9;
  const recipe: SelectedRecipe = {
    outer: index % 2 ? 'blank' : 'empty', parent: '9'.repeat(width), delimiter: index % 2 ? ')' : '.',
    parentBody: index % 3 ? 'a' : '', parentIndent: (['    ', '\t', ' \t'] as const)[index % 3]!, parentGap: index,
    band: index % 2 ? 'upper' : 'lower', shape: localShape, firstMarker: ['-', '*', '+', '100.', '000000002)'][index % 5]!,
    first: { column: index, spelling: index * 7, gap: index, body: 'b' },
    tail: shape.slice(1).map((_parent, offset) => ({ column: index + offset, spelling: index * 11 + offset, gap: index + offset,
      body: String.fromCharCode(99 + offset), marker: (['-', '1.', '*', '1)'] as const)[(index + offset) % 4]! })),
  };
  nestingCases['selectedAncestryShape' + index] = selectedFromRecipe(recipe);
}

// A wide selected ordered root can shrink on restart even though four spaces
// already clear the preceding99 parent's content floor. Every first-marker
// width and tab phase has its own construction under the same tree law.
for (let width = 1; width <= 9; width++) {
  const firstMarker = '2'.repeat(width) + '.', gaps = parentGapRecipes(4 + firstMarker.length);
  nestingCases['selectedRestartWidth' + width] = selectedFromRecipe({
    outer: 'empty', parent: 99, delimiter: '.', parentBody: 'a', parentIndent: '    ', parentGap: 0,
    band: 'lower', shape: 0, firstMarker, first: { column: 1, spelling: width % 2, gap: gaps.indexOf(width % 2 ? '\t' : ' '), body: 'b' },
    tail: [{ column: width % 2, spelling: width * 7, gap: 0, body: 'c', marker: '-' }],
  });
}

export const nestStates = (h: Nest): string[] => {
  if (h.selectedTail) {
    const rows = selectedRows(h), depths = rows.map(row => { let depth = 0; for (let parent = row.parent; parent !== null; parent = rows[parent]!.parent) depth++; return depth; });
    return ['selectedAncestry', 'selectedAncestryRows' + rows.length, ...new Set(depths.map(depth => 'selectedDepth' + depth)),
      ...(!h.childBullet ? ['selectedOrderedRestart', 'selectedFirstDigitWidth' + String(h.child).length, 'selectedFirstMarkerPhase' + ((indentColumns(h.childIndent ?? '') + String(h.child).length + 1) % 4), ...(String(h.child).length > 1 ? ['selectedRestartShrinksMarker'] : [])] : ['selectedBulletRoot']),
      ...(indentColumns('    ' + (h.childIndent ?? '')) >= indentColumns(h.parentIndent ?? '') + parentMarker(h).length + (h.parentBody === '' ? 1 : parentGapColumns(indentColumns(h.parentIndent ?? '') + parentMarker(h).length, h.parentGap ?? ' ')) ? ['selectedOrdinaryRootFits'] : []),
      ...(rows.some(row => row.indent.includes('\t')) ? ['selectedTabIndent'] : []),
      ...(rows.some(row => row.gap.includes('\t')) ? ['selectedTabPadding'] : []),
      ...(rows.filter(row => row.parent === null).length > 1 ? ['selectedForest'] : ['selectedSubtree']),
      ...nestStates({ ...h, selectedTail: undefined })];
  }
  const old = [h.bullet ? 'bulletParent' : String(h.parent).length < 3 ? 'narrowParent' : 'wideParent', h.childBullet ? 'bulletChild' : 'numberedChild', h.existing ? 'existingNesting' : 'flatPair', ...(h.parent === 99 ? ['widthBoundaryBelow'] : []), ...(h.parent === 100 ? ['widthBoundaryAbove'] : [])];
  if (h.existing) return old;
  const markerWidth = parentMarker(h).length, gap = h.parentGap ?? ' ', padding = parentGapColumns(markerWidth, gap);
  // Empty list items have no content before the nested block; trailing raw
  // whitespace does not widen their one-column content padding (CommonMark5.2).
  const contentPadding = h.parentBody === '' ? 1 : padding;
  const parentDigits = String(h.parent), childDigits = String(h.child);
  const lexical = [
    ...(h.bullet ? [{ '-': 'hyphenParentMarker', '*': 'starParentMarker', '+': 'plusParentMarker' }[h.parentBullet ?? '-']!] : []),
    ...(!h.bullet ? [`parentDigitWidth${parentDigits.length}`] : []),
    ...(!h.childBullet ? [`childDigitWidth${childDigits.length}`] : []),
    ...(!h.bullet && Number(h.parent) === 0 ? ['zeroParentMarker'] : []),
    ...(!h.bullet && parentDigits.length > 1 && parentDigits.startsWith('0') ? ['leadingZeroParentMarker'] : []),
    ...(!h.bullet && parentDigits.length === 9 ? ['maximumWidthParentMarker'] : []),
    ...(!h.childBullet && Number(h.child) === 0 ? ['zeroChildMarker'] : []),
    ...(!h.childBullet && childDigits.length > 1 && childDigits.startsWith('0') ? ['leadingZeroChildMarker'] : []),
    ...(!h.childBullet && childDigits.length === 9 ? ['maximumWidthChildMarker'] : []),
  ];
  return [...old, ...lexical, ...(h.peers ? ['selectedPeerRange', 'selectedPeerCount' + (h.peers.length + 1),
    ...(new Set([h.childIndent, ...h.peers.map(peer => peer.indent)]).size > 1 ? ['independentSelectedPrefixes'] : []),
    ...((h.childIndent === '     ' || h.childIndent === '\t ') && String(h.parent).length === 3 ? ['firstSelectedOrdinaryFits'] : [])] : []), h.parentBody === '' ? 'emptyParent' : 'textParent', `parentPadding${padding}`, gap === '' ? 'noParentPadding' : gap.includes('\t') ? 'tabParentPadding' : 'spaceParentPadding',
    ...(h.outer ? [h.outer + 'OuterContainer', ...(h.oneShallower ? ['oneShallowerContainer'] : ['siblingContainer',
      h.parentIndent === h.childIndent ? 'sameRawSiblingPrefix' : 'differentRawSiblingPrefix',
      (h.childIndent === '   ' ? 'siblingColumnBelow' : h.childIndent === '     ' || h.childIndent === '\t ' ? 'siblingColumnAbove' : 'sameVisualSiblingColumn'),
      ...(h.parentIndent?.includes('\t') && h.childIndent === '    ' ? ['tabParentSpaceSibling'] : []),
      ...(h.parentIndent === '    ' && h.childIndent?.includes('\t') ? ['spaceParentTabSibling'] : [])])] : []),
    ...(h.parentBody === '' && markerWidth + 1 > 4 ? ['emptyParentBeyondOrdinaryIndent'] : []),
    ...(gap.includes('\t') ? [`parentMarkerPhase${markerWidth % 4}`] : []),
    ...(gap.includes(' ') && gap.includes('\t') ? ['mixedParentPadding'] : []),
    // This reach distinction challenges the previous wrong width-only design;
    // it does not prescribe an exact source serialization to the rendering model.
    markerWidth + contentPadding > Math.max(4, markerWidth + 1) ? 'paddingExceedsWidthOnlyIndent' : 'paddingFitsWidthOnlyIndent',
    markerWidth + contentPadding > 4 ? 'parentBeyondOrdinaryIndent' : 'parentWithinOrdinaryIndent',
    ...(!h.childBullet && h.childDelimiter && h.childDelimiter !== h.delimiter ? ['independentChildDelimiter'] : [])];
};

// A single-item list tree states ancestry directly. Flattening this model tree
// keeps the first-child relationship that a last-inline-at-depth summary loses.
export type RenderedList = { ordered: boolean; body: string; child?: RenderedList | RenderedList[]; peers?: string[] };

export function listStructure(list: RenderedList): string[] {
  const kind = list.ordered ? 'ordered_list' : 'bullet_list';
  // A containing item can hold an ordered list followed by a bullet list;
  // this sequence preserves both bodies and order for continuation neighbors.
  const children = list.child ? Array.isArray(list.child) ? list.child : [list.child] : [];
  return [kind + '_open', 'list_item_open', ...(list.body ? ['inline:' + list.body] : []),
  ...children.flatMap(listStructure), 'list_item_close', ...(list.peers ?? []).flatMap(body => ['list_item_open', 'inline:' + body, 'list_item_close']), kind + '_close'];
}

export function nestingPlan(h: Nest) {
  const outer = h.outer ? containers[h.outer].source : '';
  const prefix = h.existing ? '- a\n    - b\n' : outer + (h.parentIndent ?? '') + parentMarker(h) + (h.parentGap ?? ' ') + (h.parentBody ?? 'a') + '\n';
  const child = (h.existing ? '    ' : h.childIndent ?? '') + (h.childBullet ?? h.child + (h.childDelimiter ?? h.delimiter)) + (h.childGap ?? ' ') + h.body;
  const text = prefix + [child, ...(h.selectedTail ?? []).map(row => row.indent + row.marker + row.gap + row.body), ...(h.peers ?? []).map(peer => peer.indent + '- ' + peer.body)].join('\n');
  return { h, prefix, text, parentLine: outer.split('\n').length - 1, from: h.peers || h.selectedTail ? prefix.length : text.length, to: text.length };
}

export function nestingModel(p: ReturnType<typeof nestingPlan>) {
  if (p.h.selectedTail) {
    const rows = selectedRows(p.h);
    const lines = rows.map((row, index) => (index === 0 && row.marker.length > 1 ? '1' + row.marker.at(-1)! : row.marker) + row.gap + row.body);
    return { tight: p.h.outer ? containers[p.h.outer].tight : true, structure: selectedTree(p, true), parentPreserved: true, noCode: true, noPre: true, selected: { lines, coversRows: true }, caretAtEnd: false };
  }
  const child = { ordered: !p.h.childBullet, body: p.h.body, ...(p.h.peers ? { peers: p.h.peers.map(peer => peer.body) } : {}) };
  const root: RenderedList = p.h.existing
    ? { ordered: false, body: 'a', child: { ordered: false, body: 'b', child } }
    : { ordered: !p.h.bullet, body: p.h.parentBody ?? 'a', child };
  let lists: RenderedList[] = p.h.oneShallower ? [{ ordered: root.ordered, body: root.body }, child] : [root];
  if (p.h.outer) for (const body of [...containers[p.h.outer].bodies].reverse()) lists = [{ ordered: false, body, child: lists }];
  return { tight: p.h.outer ? containers[p.h.outer].tight : true, structure: lists.flatMap(listStructure), parentPreserved: true, noCode: true, noPre: true, selected: p.h.peers ? { lines: p.text.slice(p.prefix.length).split('\n').map(line => line.trimStart()), coversRows: true } : '', caretAtEnd: !p.h.peers };
}
