/** Independent semantic histories/models; this module registers no tests. */
import fc from 'fast-check';
import { unit } from './document-oracle.ts';

export const generatedArbitrary = fc.record({
  fenced: fc.boolean(), marker: fc.constantFrom('`', '~'), opening: fc.integer({ min: 3, max: 8 }),
  indent: fc.integer({ min: 0, max: 3 }), language: fc.constantFrom('', 'js'), decoy: fc.boolean(),
  closing: fc.boolean(), closeMarker: fc.constantFrom('`', '~'), closeWidth: fc.integer({ min: 2, max: 9 }),
  closeTail: fc.constantFrom('', ' ', '\t', ' \t', '\u00a0', '\ufeff', '\u2003', 'text'),
  location: fc.constantFrom('body', 'openingEnd', 'closingEnd'),
  line: fc.constantFrom('', ' ', '  ', 'a', 'α😀'), slashes: fc.integer({ min: 0, max: 12 }),
  selected: fc.string({ unit, maxLength: 16 }), suffix: fc.string({ unit, maxLength: 16 }),
});

export type GeneratedHistory = typeof generatedArbitrary extends fc.Arbitrary<infer T> ? T : never;

/** A container is input syntax: quoted and list content prefixes, not a scanner state. */
export type FenceContainer = {
  quotes: number; list: 'none' | 'bullet' | 'ordered'; bullet: '-' | '*' | '+'; number: number;
  punctuation: '.' | ')'; padding: number; placement: 'inline' | 'continuation'; indent: number;
  marker: '`' | '~'; width: number; info: string; closeMarker: 'same' | 'other'; closeWidth: number; closeTail: string;
  role: 'opener' | 'body' | 'closer' | 'afterCloser' | 'afterCloserOutside' | 'afterContainer'; separate: boolean;
  body: string; line: string; slashes: number; selected: string; suffix: string;
};
const containerWords = fc.string({ unit: fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz', 'α', '😀'), minLength: 1, maxLength: 8 });
const containerFields = {
  indent: fc.integer({ min: 0, max: 3 }), closeMarker: fc.constantFrom('same' as const, 'other' as const), closeWidth: fc.integer({ min: 2, max: 9 }),
  closeTail: fc.constantFrom('', ' ', '\t', 'text'), separate: fc.boolean(), body: containerWords, line: containerWords,
  slashes: fc.integer({ min: 0, max: 12 }),
};
// Each scaffold supplies a real parent. Invalid opener controls have only the
// opener/body roles, so a later stand-alone delimiter cannot become a new opener.
export function containerInputArbitrary(selected: fc.Arbitrary<string>, suffix: fc.Arbitrary<string>): fc.Arbitrary<FenceContainer> {
const containerScaffolds = [
  { ...containerFields, selected, suffix, quotes: fc.integer({ min: 1, max: 2 }), list: fc.constant('none' as const), bullet: fc.constant('-' as const), number: fc.constant(1), punctuation: fc.constant('.' as const), padding: fc.constant(1), placement: fc.constant('inline' as const) },
  { ...containerFields, selected, suffix, quotes: fc.integer({ min: 0, max: 2 }), list: fc.constant('bullet' as const), bullet: fc.constantFrom('-' as const, '*' as const, '+' as const), number: fc.constant(1), punctuation: fc.constant('.' as const), padding: fc.integer({ min: 1, max: 4 }), placement: fc.constantFrom('inline' as const, 'continuation' as const) },
  { ...containerFields, selected, suffix, quotes: fc.integer({ min: 0, max: 2 }), list: fc.constant('ordered' as const), bullet: fc.constant('-' as const), number: fc.integer({ min: 1, max: 999999999 }), punctuation: fc.constantFrom('.' as const, ')' as const), padding: fc.integer({ min: 1, max: 4 }), placement: fc.constantFrom('inline' as const, 'continuation' as const) },
];
const bodyRoles = fc.constantFrom('opener' as const, 'body' as const);
return fc.oneof(...containerScaffolds.flatMap(scaffold => [
  fc.record<FenceContainer>({ ...scaffold, marker: fc.constantFrom('`' as const, '~' as const), width: fc.integer({ min: 3, max: 8 }), info: fc.constantFrom('', 'js'), role: fc.constantFrom('opener' as const, 'body' as const, 'closer' as const, 'afterCloser' as const, 'afterCloserOutside' as const, 'afterContainer' as const) }),
  fc.record<FenceContainer>({ ...scaffold, marker: fc.constantFrom('`' as const, '~' as const), width: fc.constant(2), info: fc.constant(''), role: bodyRoles }),
  fc.record<FenceContainer>({ ...scaffold, marker: fc.constant('`' as const), width: fc.integer({ min: 3, max: 8 }), info: fc.constant('x`'), role: bodyRoles }),
]));
}
export const containerArbitrary = containerInputArbitrary(fc.string({ unit, maxLength: 16 }), fc.string({ unit, maxLength: 64 }));

// CommonMark strips parent prefixes before testing a fence's relative indent.
// These constructors build that premise; the model never searches their text.
export function containerInput(h: FenceContainer) {
  const quote = '> '.repeat(h.quotes), marker = h.list === 'ordered' ? h.number + h.punctuation : h.bullet;
  const content = quote + (h.list === 'none' ? '' : ' '.repeat(marker.length + h.padding));
  const inset = ' '.repeat(h.indent), child = content + inset;
  const first = h.list === 'none' ? child : h.placement === 'inline' ? quote + marker + ' '.repeat(h.padding) : child;
  const lead = h.list !== 'none' && h.placement === 'continuation' ? quote + marker + ' '.repeat(h.padding) + 'item\n' + quote.trimEnd() + '\n' : '';
  const opener = lead + first + h.marker.repeat(h.width) + h.info;
  const closingMarker = h.closeMarker === 'same' ? h.marker : h.marker === '`' ? '~' : '`';
  const closer = child + closingMarker.repeat(h.closeWidth) + h.closeTail;
  const body = child + h.body, line = h.line + '\\'.repeat(h.slashes);
  const prefix = h.role === 'opener' ? opener : h.role === 'body' ? opener + '\n' + child + line
    : h.role === 'closer' ? opener + '\n' + body + '\n' + closer
      : h.role === 'afterCloser' || h.role === 'afterCloserOutside' ? opener + '\n' + body + '\n' + closer + '\n' + (h.separate ? quote.trimEnd() + '\n' : '') + (h.role === 'afterCloserOutside' ? '' : content) + line
        : opener + '\n' + body + '\n' + line;
  return { prefix, text: prefix + h.selected + h.suffix, from: prefix.length, to: prefix.length + h.selected.length };
}

// The role is the position in a constructed parent, not a verdict from source.
// A parent ending closes its unclosed fenced child; a delimiter line stays literal
// for this command even when it completes the close. The input prefix owns both.
export function containerFacts(h: FenceContainer) {
  const opened = h.width >= 3 && !(h.marker === '`' && h.info.includes('`'));
  const closed = h.closeMarker === 'same' && h.closeWidth >= h.width && [...h.closeTail].every(c => c === ' ' || c === '\t');
  const literal = opened && h.role !== 'afterContainer' && h.role !== 'afterCloserOutside' && (h.role !== 'afterCloser' || !closed);
  const slashes = h.role === 'opener' || h.role === 'closer' ? 0 : h.slashes;
  return { opened, closed, literal, slashes };
}
export function containerStates(h: FenceContainer) {
  const facts = containerFacts(h);
  return ['fenceContainer', h.quotes ? 'quotedFenceContext' : 'unquotedListFenceContext',
    ...(h.quotes === 2 ? ['nestedQuotedFenceContext'] : []), ...(h.list !== 'none' ? ['listFenceContext', h.list === 'ordered' ? 'orderedFenceContext' : 'bulletFenceContext'] : []),
    ...(h.quotes && h.list !== 'none' ? ['quotedListFenceContext'] : []), ...(h.list === 'ordered' && h.number >= 100 ? ['wideListFenceContext'] : []),
    'containerRole:' + h.role, facts.opened ? 'validContainerOpener' : 'invalidContainerOpener',
    ...(h.width === 2 ? ['shortContainerOpener'] : []), ...(h.info.includes('`') ? ['invalidContainerInfo'] : []),
    facts.literal ? 'literalContainerBreak' : 'proseContainerBreak', h.marker === '`' ? 'containerBackticks' : 'containerTildes',
    ...((h.role === 'afterCloser' || h.role === 'afterCloserOutside') ? [facts.closed ? 'afterClosedContainerFence' : 'afterUnclosedContainerCandidate'] : []),
    ...(h.role === 'afterContainer' || h.role === 'afterCloserOutside' ? ['fenceParentEnded'] : []), ...(facts.literal && h.role === 'body' && h.slashes > 0 && h.slashes % 2 === 0 ? ['containerCodeEvenSlashes'] : []),
    ...(h.selected ? ['containerSelection'] : []), ...(h.indent === 3 && (h.list === 'none' || h.placement === 'continuation') ? ['containerRelativeIndentThree'] : [])];
}
const containerBase: FenceContainer = {
  quotes: 1, list: 'none', bullet: '-', number: 1, punctuation: '.', padding: 1, placement: 'inline', indent: 0,
  marker: '`', width: 3, info: '', closeMarker: 'same', closeWidth: 3, closeTail: '', role: 'body', separate: false,
  body: 'a', line: 'a', slashes: 0, selected: '', suffix: '> b\n> ```',
};
export const containerCases: Record<string, FenceContainer> = {
  'quote-body': { ...containerBase },
  'quote-opener-end': { ...containerBase, role: 'opener', suffix: '' },
  'quote-closing-end': { ...containerBase, role: 'closer', suffix: '\n\noutside' },
  'quote-after-closed': { ...containerBase, role: 'afterCloser', separate: true, line: 'prose', suffix: '' },
  'quote-insufficient-width': { ...containerBase, width: 2, suffix: '> b' },
  'quote-invalid-info': { ...containerBase, info: 'x`', suffix: '> b' },
  'bullet-body-inline-opener': { ...containerBase, quotes: 0, list: 'bullet', suffix: '  b\n  ```' },
  'bullet-body-continuation-opener': { ...containerBase, quotes: 0, list: 'bullet', placement: 'continuation', suffix: '  b\n  ```' },
  'bullet-after-inline-close': { ...containerBase, quotes: 0, list: 'bullet', role: 'afterCloserOutside', line: 'prose', suffix: '' },
  'bullet-ended-without-close': { ...containerBase, quotes: 0, list: 'bullet', placement: 'continuation', role: 'afterContainer', line: 'prose', suffix: '' },
  'ordered-wide-continuation': { ...containerBase, quotes: 0, list: 'ordered', number: 100, placement: 'continuation', suffix: '     b\n     ```' },
  'quote-list-body': { ...containerBase, list: 'bullet', suffix: '>   b\n>   ```' },
  'nested-quote-tilde': { ...containerBase, quotes: 2, marker: '~', suffix: '> > b\n> > ~~~' },
  'quote-body-selection': { ...containerBase, selected: 'replace' },
  'quote-body-even-backslashes': { ...containerBase, slashes: 2 },
  'quote-relative-indent-three': { ...containerBase, indent: 3 },
  'list-relative-indent-three': { ...containerBase, quotes: 0, list: 'ordered', number: 999999999, punctuation: ')', padding: 4, placement: 'continuation', indent: 3 },
  'container-short-closer': { ...containerBase, width: 4, closeWidth: 3, role: 'afterCloser' },
  'container-other-closer': { ...containerBase, closeMarker: 'other', role: 'afterCloser' },
  'container-text-closer': { ...containerBase, closeTail: 'text', role: 'afterCloser' },
};

export type History = Omit<GeneratedHistory, 'line'> & { line: string; literalPrefix?: string; container?: FenceContainer };

export const base: History = {
  fenced: false, marker: '`', opening: 3, indent: 0, language: '', decoy: false,
  closing: false, closeMarker: '`', closeWidth: 3, closeTail: '',
  location: 'body', line: 'a', slashes: 0, selected: '', suffix: 'b',
};

export const examples: Record<string, Partial<History>> = {
  plain: {}, closingEnd: { fenced: true, closing: true, location: 'closingEnd' }, openingEnd: { fenced: true, location: 'openingEnd' }, unicodeCloser: { fenced: true, closing: true, closeTail: '\u00a0' }, even: { slashes: 2 }, odd: { slashes: 1 }, manyPairs: { slashes: 12 },
  blank: { line: '' }, whitespace: { line: '  ' },
  backtickCode: { fenced: true }, tildeCode: { fenced: true, marker: '~' },
  matchingClose: { fenced: true, closing: true },
  longerClose: { fenced: true, closing: true, closeWidth: 4 },
  shorterClose: { fenced: true, opening: 4, closing: true, closeWidth: 3 },
  wrongMarker: { fenced: true, closing: true, closeMarker: '~' },
  closingText: { fenced: true, closing: true, closeTail: 'text' },
  closingSpaces: { fenced: true, closing: true, closeTail: ' ' },
  closingTab: { fenced: true, closing: true, closeTail: '\t' },
  indentAndInfo: { fenced: true, indent: 3, language: 'js' },
  decoy: { fenced: true, marker: '~', decoy: true },
  replacedSelection: { selected: 'x\n😀' },
  afterCloseEven: { fenced: true, closing: true, slashes: 2 },
  // Historical Shift+Enter rows (now the hard-break toolbar command), test-ui/format-shortcuts.test.ts:142–152.
  // Literal prefixes preserve their whole source contexts; the model still uses
  // the declared prose/fence state rather than scanning those source strings.
  oldVerseLine: { literalPrefix: 'Tyger Tyger, burning bright,', line: 'Tyger Tyger, burning bright,', suffix: '' },
  oldMidLine: { literalPrefix: 'one', line: 'one', suffix: ' two' },
  oldSelection: { literalPrefix: 'a ', line: 'a ', selected: 'one', suffix: ' two' },
  oldEmptyDocument: { literalPrefix: '', line: '', suffix: '' },
  oldBlankParagraph: { literalPrefix: 'a\n\n', line: '', suffix: '' },
  oldUnpairedSlash: { literalPrefix: 'a\\', line: 'a', slashes: 1, suffix: '' },
  oldInsideBackticks: { literalPrefix: '```\nline', fenced: true, line: 'line', suffix: '\n```' },
  oldAfterFence: { literalPrefix: '```\ncode\n```\nafter', fenced: true, closing: true, line: 'after', suffix: '' },
  oldOppositeMarker: { literalPrefix: '~~~~\n```\nstill code', fenced: true, marker: '~', opening: 4, decoy: true, line: 'still code', suffix: '' },
  rootContainerNeighbor: { literalPrefix: '```\na', fenced: true, line: 'a', suffix: 'b\n```' },
  ...Object.fromEntries(Object.entries(containerCases).map(([name, container]) => ['container-' + name, { container }])),
};

export const exampleHistories = Object.entries(examples).map(([name, overrides]) => ({ name, history: { ...base, ...overrides } }));

// Literal prefixes and their annotations form fixed, coherent histories. Reuse
// these records in constructed cases so constantFrom can admit and shrink them.
const containerHistoryArbitrary = containerArbitrary.map<History>(container => ({ ...base, container }), value => {
  if (!value || typeof value !== 'object') throw new Error('Expected a declarative container history');
  const history = value as History;
  if (!history.container || history.literalPrefix !== undefined || Object.entries(base).some(([key, value]) => history[key as keyof History] !== value)) throw new Error('Expected a declarative container history');
  return history.container;
});
export const arbitrary = fc.oneof(generatedArbitrary, containerHistoryArbitrary, fc.constantFrom(...exampleHistories
  .filter(({ history }) => history.literalPrefix !== undefined)
  .map(({ history }) => history)));

export const histories = {
  arbitrary, runs: 100, fixedSeeds: [20261118], states: Object.keys(examples),
  constructed: exampleHistories.map(({ name, history }) => ({
    name, enters: [name], build: () => history,
  })),
};

export function resolve(history: History) {
  if (history.container) return { history, ...containerInput(history.container) };
  const opener = ' '.repeat(history.indent) + history.marker.repeat(history.opening) + history.language + '\nbody\n';
  const decoy = history.decoy ? (history.marker === '`' ? '~' : '`').repeat(3) + '\n' : '';
  const closer = history.closing ? ' '.repeat(history.indent) + history.closeMarker.repeat(history.closeWidth) + history.closeTail + '\n' : '';
  const prefix = history.literalPrefix ?? (history.fenced && history.location === 'openingEnd' ? opener.slice(0, opener.indexOf('\n'))
    : history.fenced && history.closing && history.location === 'closingEnd' ? opener + decoy + closer.slice(0, -1)
      : (history.fenced ? opener + decoy + closer : 'preamble\n') + history.line + '\\'.repeat(history.slashes));
  return { history, prefix, text: prefix + history.selected + history.suffix, from: prefix.length, to: prefix.length + history.selected.length };
}

export type Plan = ReturnType<typeof resolve>;


// The rule is about whether one unpaired backslash is still owed, not a scan
// through the source that could repeat production's inFence implementation.
export function model(plan: Plan) {
  const h = plan.history;
  if (h.container) {
    const facts = containerFacts(h.container), insert = facts.literal || facts.slashes % 2 ? '\n' : '\\\n';
    const caret = plan.from + insert.length;
    return { edit: { from: plan.from, to: plan.to, insert, start: caret, end: caret }, output: plan.prefix + insert + h.container.suffix };
  }
  const closed = h.closing && h.closeMarker === h.marker && h.closeWidth >= h.opening && [...h.closeTail].every(c => c === ' ' || c === '\t');
  const onDelimiter = h.fenced && (h.location === 'openingEnd' || h.closing && h.location === 'closingEnd');
  const prose = !onDelimiter && !(h.fenced && !closed) && (h.line.trim().length > 0 || h.slashes > 0);
  const insert = '\\'.repeat(Number(prose && h.slashes % 2 === 0)) + '\n';
  const caret = plan.from + insert.length;
  return {
    edit: { from: plan.from, to: plan.to, insert, start: caret, end: caret },
    output: plan.prefix + insert + h.suffix,
  };
}

export const reached = (plan: Plan) => {
  const h = plan.history;
  if (h.container) return containerStates(h.container);
  const closed = h.closing && h.closeMarker === h.marker && h.closeWidth >= h.opening && [...h.closeTail].every(c => c === ' ' || c === '\t');
  return [h.fenced ? 'fenced' : 'unfenced', h.slashes % 2 ? 'oddSlashes' : 'evenSlashes',
  ...(h.slashes > 0 ? ['positiveSlashes'] : []), ...(!h.line.trim() ? ['blank'] : ['nonblank']),
  ...(h.selected ? ['replacedSelection'] : []),
  ...(h.fenced ? [h.marker === '`' ? 'backticks' : 'tildes'] : []),
  ...(h.fenced && h.closing ? [closed ? 'closed' : 'unclosedCandidate'] : []),
  ...(h.fenced && h.location === 'openingEnd' ? ['openingEnd'] : []),
  ...(h.fenced && h.closing && h.location === 'closingEnd' ? ['closingEnd'] : []),
  ...(h.fenced && h.closing && /[^ \t]/.test(h.closeTail) ? ['nonAsciiOrTextTail'] : [])];
};

// Required reach names are semantic predicates; literal cases remain named inputs.
histories.states = [...new Set(Object.values(examples).flatMap(overrides => reached(resolve({ ...base, ...overrides }))))];

histories.constructed = exampleHistories.map(({ name, history }) => {
  return { name, enters: reached(resolve(history)), build: () => history };
});


// Repeated hard-break commands must keep verse in one paragraph. This reconstructs the
// renderer observation in the old unit suite, across generated line sequences.
export const verseArbitrary = fc.array(fc.string({
  unit: fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz', 'α', 'β'), minLength: 1, maxLength: 12,
}), { minLength: 2, maxLength: 8 });

// CommonMark4.5 forbids ticks only in a backtick fence's info. The declarative
// count varies independently from marker/width and never scans production text.
export const infoArbitrary = fc.record({ marker: fc.constantFrom('`', '~'), width: fc.integer({ min: 3, max: 12 }),
  indent: fc.integer({ min: 0, max: 3 }), ticks: fc.integer({ min: 0, max: 12 }), location: fc.constantFrom('opener', 'body'),
  language: fc.constantFrom('', 'x', 'js', 'text '), selected: fc.string({ unit, maxLength: 16 }), suffix: fc.string({ unit, maxLength: 16 }),
});
type Info = typeof infoArbitrary extends fc.Arbitrary<infer T> ? T : never;
export const infoCases: Record<string, Info> = {};
for (const marker of ['`', '~'] as const) for (const ticks of [0, 1, 3, 12]) for (const location of ['opener', 'body'] as const) {
  infoCases[marker + ticks + location] = { marker, width: ticks === 12 ? 12 : 3, indent: ticks === 1 ? 3 : 0, ticks, location, language: 'x', selected: ticks === 3 ? 'replace' : '', suffix: 'tail' };
}
for (const location of ['opener', 'body'] as const) infoCases['extendedRun-' + location] = { marker: '`', width: 3, indent: 0, ticks: 3, location, language: '', selected: '', suffix: '' };
export function infoPlan(h: Info) {
  const prefix = ' '.repeat(h.indent) + h.marker.repeat(h.width) + h.language + '`'.repeat(h.ticks) + (h.location === 'body' ? '\nbody' : '');
  return { h, prefix, text: prefix + h.selected + h.suffix, from: prefix.length, to: prefix.length + h.selected.length };
}
export function infoModel(p: ReturnType<typeof infoPlan>) {
  // With no intervening info text, adjacent ticks extend the opening marker.
  const invalidInfo = p.h.marker === '`' && p.h.language.length > 0 && p.h.ticks > 0;
  const insert = invalidInfo ? '\\\n' : '\n', caret = p.from + insert.length;
  return { edit: { from: p.from, to: p.to, insert, start: caret, end: caret }, output: p.prefix + insert + p.h.suffix };
}
export const infoStates = (p: ReturnType<typeof infoPlan>) => [p.h.marker === '`' ? p.h.ticks && p.h.language.length ? 'invalidBacktickInfo' : 'validBacktickInfo' : p.h.ticks ? 'validTildeTickInfo' : 'validTildeInfo',
  ...(!p.h.language && p.h.ticks && p.h.marker === '`' ? ['extendedOpeningRun'] : []),
  p.h.location, ...(p.h.width === 3 ? ['minimumInfoFence'] : p.h.width === 12 ? ['maximumInfoFence'] : []),
  ...((p.h.marker === '~' || p.h.language.length > 0) && p.h.ticks === 1 ? ['oneInfoTick'] : (p.h.marker === '~' || p.h.language.length > 0) && p.h.ticks === 12 ? ['manyInfoTicks'] : []), p.h.selected ? 'replaceInfoSelection' : 'infoCaret'];
