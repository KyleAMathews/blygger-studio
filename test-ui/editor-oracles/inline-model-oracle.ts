/** Independent semantic histories/models; this module registers no tests. */
import fc from 'fast-check';
import { result, unit, type Edit as FormatEdit, type Sample } from './document-oracle.ts';

export const anyText = fc.string({ unit, maxLength: 32 });

// Delimiter annotations need literal content with non-star, non-whitespace edges.
// The arbitrary interior still admits controls and unpaired UTF-16 surrogates;
// LF is excluded only from this single-line part (multiline has an explicit axis).
export const noLfUnit = unit.filter(c => c !== '\n');

export const literal = fc.string({ unit: noLfUnit, maxLength: 28 }).map(s => 'x' + s + 'y', s => {
  if (typeof s !== 'string') throw new Error('Expected text');
  if (!s.startsWith('x') || !s.endsWith('y')) throw new Error('Expected literal edges');
  return s.slice(1, -1);
});

export const edge = unit.filter(c => c !== '*');

export const contextBefore = fc.oneof(fc.constant(''), fc.tuple(anyText, edge).map(([s, end]) => s + end, value => {
  if (typeof value !== 'string' || !value) throw new Error('Expected context');
  return [value.slice(0, -1), value.slice(-1)];
}));

export const contextAfter = fc.oneof(fc.constant(''), fc.tuple(edge, anyText).map(([start, s]) => start + s, value => {
  if (typeof value !== 'string' || !value) throw new Error('Expected context');
  return [value.slice(0, 1), value.slice(1)];
}));

export const plainBody = fc.string({ unit: noLfUnit.filter(c => c !== '*' && !!c.trim()), minLength: 1, maxLength: 32 });

export const whitespace = fc.constantFrom('', ' ', '\t', '  ', '\u00a0', '\r', '\ufeff');

export type Row = { left: number; right: number; body: string; lead: string; tail: string };

export const rowArbitrary: fc.Arbitrary<Row> = fc.record({
  left: fc.integer({ min: 0, max: 6 }), right: fc.integer({ min: 0, max: 6 }),
  body: fc.oneof(plainBody, literal, fc.constantFrom('', 'word', 'one', 'two', 'a b', 'α😀', 'a*b', '\u0000', '\ud800')),
  lead: whitespace, tail: whitespace,
});


export const row = (extra: Partial<Row> = {}): Row => ({ left: 0, right: 0, body: 'word', lead: '', tail: '', ...extra });

export const core = (r: Row) => '*'.repeat(r.left) + r.body + '*'.repeat(r.right);

export const source = (r: Row) => r.lead + core(r) + r.tail;

export const active = (r: Row, kind: 'bold' | 'italic') => r.body.length > 0 &&
  (kind === 'bold' ? Math.min(r.left, r.right) >= 2 : Math.min(r.left, r.right) % 2 === 1);

export const width = { bold: 2, italic: 1 };


export const emphasisArbitrary = fc.record({
  kind: fc.constantFrom('bold' as const, 'italic' as const), row: rowArbitrary,
  outsideLeft: fc.integer({ min: 0, max: 6 }), outsideRight: fc.integer({ min: 0, max: 6 }),
  before: contextBefore, after: contextAfter,
});

export type Emphasis = Sample<typeof emphasisArbitrary>;

export const emphasisBase: Emphasis = { kind: 'bold', row: row(), outsideLeft: 0, outsideRight: 0, before: 'pre ', after: ' post' };

// Reconstruct the original example inputs exactly, including which delimiters
// are outside the selection. Keep these beside the broader grammar histories.
export const sourceEmphasisBase: Emphasis = { ...emphasisBase, before: 'a ', after: ' b' };

export const emphasisCases: Record<string, Emphasis> = {
  bold: emphasisBase,
  documentStart: { ...emphasisBase, before: '', after: '' },
  italic: { ...emphasisBase, kind: 'italic' },
  selectedBold: { ...emphasisBase, row: row({ left: 2, right: 2 }) },
  selectedItalic: { ...emphasisBase, kind: 'italic', row: row({ left: 1, right: 1 }) },
  outsideBold: { ...emphasisBase, outsideLeft: 2, outsideRight: 2 },
  outsideItalic: { ...emphasisBase, kind: 'italic', outsideLeft: 1, outsideRight: 1 },
  addBoldToItalic: { ...emphasisBase, row: row({ left: 1, right: 1 }) },
  addItalicToBold: { ...emphasisBase, kind: 'italic', row: row({ left: 2, right: 2 }) },
  removeBoldKeepItalic: { ...emphasisBase, row: row({ left: 3, right: 3 }) },
  removeItalicKeepBold: { ...emphasisBase, kind: 'italic', row: row({ left: 3, right: 3 }) },
  emptyBold: { ...emphasisBase, row: row({ body: '' }) },
  emptyItalic: { ...emphasisBase, kind: 'italic', row: row({ body: '' }) },
  emptyOutsideBold: { ...emphasisBase, row: row({ body: '' }), outsideLeft: 2, outsideRight: 2 },
  emptyOutsideItalic: { ...emphasisBase, kind: 'italic', row: row({ body: '' }), outsideLeft: 1, outsideRight: 1 },
  whitespace: { ...emphasisBase, row: row({ lead: '\t', tail: '  ' }) },
  whitespaceOnly: { ...emphasisBase, row: row({ body: '', lead: ' ', tail: '\t' }) },
  literalStars: { ...emphasisBase, row: row({ body: '', left: 2, right: 2 }) },
  singleLiteralMarkerItalic: { ...emphasisBase, kind: 'italic', before: '', after: '', row: row({ body: '', left: 1 }) },
  singleLiteralMarkerBold: { ...emphasisBase, before: '', after: '', row: row({ body: '', left: 1 }) },
  unpairedSurrogateWithItalic: { ...emphasisBase, kind: 'italic', row: row({ body: '\ud800', left: 1, right: 1 }) },
  asymmetric: { ...emphasisBase, row: row({ left: 3, right: 1 }) },
  longRun: { ...emphasisBase, row: row({ left: 6, right: 6 }) },
  // test-ui/format-shortcuts.test.ts:19–33, in source order.
  sourceBold: sourceEmphasisBase,
  sourceItalic: { ...sourceEmphasisBase, kind: 'italic' },
  sourceOutsideBold: { ...sourceEmphasisBase, outsideLeft: 2, outsideRight: 2 },
  sourceOutsideItalic: { ...sourceEmphasisBase, kind: 'italic', outsideLeft: 1, outsideRight: 1 },
  sourceSelectedBold: { ...sourceEmphasisBase, row: row({ left: 2, right: 2 }) },
  sourceSelectedItalic: { ...sourceEmphasisBase, kind: 'italic', row: row({ left: 1, right: 1 }) },
  sourceAddItalicInsideBold: { ...sourceEmphasisBase, kind: 'italic', outsideLeft: 2, outsideRight: 2 },
  sourceAddBoldInsideItalic: { ...sourceEmphasisBase, outsideLeft: 1, outsideRight: 1 },
  sourceRemoveBoldKeepOutsideItalic: { ...sourceEmphasisBase, outsideLeft: 3, outsideRight: 3 },
  sourceRemoveItalicKeepOutsideBold: { ...sourceEmphasisBase, kind: 'italic', outsideLeft: 3, outsideRight: 3 },
  sourceEmptyBold: { ...sourceEmphasisBase, before: 'a', row: row({ body: '' }) },
  sourceEmptyItalic: { ...sourceEmphasisBase, before: 'a', kind: 'italic', row: row({ body: '' }) },
  sourceEmptyOutsideBold: { ...sourceEmphasisBase, before: 'a', row: row({ body: '' }), outsideLeft: 2, outsideRight: 2 },
  sourceEmptyOutsideItalic: { ...sourceEmphasisBase, before: 'a', kind: 'italic', row: row({ body: '' }), outsideLeft: 1, outsideRight: 1 },
  sourceTrailingWhitespace: { ...sourceEmphasisBase, before: '', after: 'b', row: row({ tail: ' ' }) },
  // Existing-markup witnesses use the same raw-source law. These surrounding
  // characters do not make this a syntax-aware or rendered-emphasis model.
  escapedOuterMarker: { ...emphasisBase, kind: 'italic', before: '\\', after: '', outsideLeft: 1, outsideRight: 1 },
  underscoreWrapper: { ...emphasisBase, kind: 'italic', before: '_', after: '_' },
  selectedCodeSpanBody: { ...emphasisBase, before: '`', after: '`' },
  selectedLinkLabel: { ...emphasisBase, before: '[', after: '](https://example.com)' },
  selectedLinkDestination: { ...emphasisBase, before: '[label](https://', after: '.example)' },
  intrawordPunctuation: { ...emphasisBase, before: 'alpha', after: 'omega', row: row({ body: '-word-' }) },
};

export function emphasisStates(h: Emphasis) {
  const r = h.row;
  return [h.kind, active(r, h.kind) ? 'selectedStyle' : 'selectedStyleAbsent',
  ...(h.outsideLeft && h.outsideRight ? ['externalMarkers'] : []),
  ...(!source(r).trim() ? [source(r) ? 'whitespaceOnly' : 'caret'] : []),
  ...(!r.body && core(r) ? ['literalMarkers'] : []),
  ...(!h.before ? ['documentStart'] : []), ...(!h.after ? ['documentEnd'] : []),
  ...(r.lead || r.tail ? ['whitespaceEdges'] : []),
  // Input geometry only: these predicates do not certify a parsed Markdown node.
  ...(h.before.endsWith('\\') && h.outsideLeft > 0 && h.outsideRight > 0 ? ['escapedExternalMarkerContext'] : []),
  ...(h.before.endsWith('_') && h.after.startsWith('_') ? ['underscoreWrapperContext'] : []),
  ...(h.before.endsWith('`') && h.after.startsWith('`') ? ['codeSpanBodyContext'] : []),
  ...(h.before.endsWith('[') && h.after.startsWith('](') ? ['linkLabelContext'] : []),
  ...(h.before.includes('](') && h.after.includes(')') ? ['linkDestinationContext'] : []),
  ...(/\p{L}$/u.test(h.before) && /^\p{L}/u.test(h.after) && /^\p{P}/u.test(r.body) && /\p{P}$/u.test(r.body) ? ['intrawordPunctuationContext'] : [])];
}

export function emphasisPlan(h: Emphasis) {
  const picked = source(h.row), prefix = h.before + '*'.repeat(h.outsideLeft);
  return { h, text: prefix + picked + '*'.repeat(h.outsideRight) + h.after, from: prefix.length, to: prefix.length + picked.length };
}

export function emphasisEdit(p: ReturnType<typeof emphasisPlan>) {
  const { h } = p, r = h.row, w = width[h.kind];
  const hasContent = core(r).length > 0;
  if (!hasContent && source(r).length) {
    // GitHub convention: retain all selected whitespace before an empty pair.
    const insert = source(r) + '*'.repeat(w * 2), caret = p.from + source(r).length + w;
    return { from: p.from, to: p.to, insert, start: caret, end: caret };
  }
  const from = p.from + (hasContent ? r.lead.length : 0), to = p.to - (hasContent ? r.tail.length : 0);
  const inner = hasContent ? core(r) : source(r);
  let edit: FormatEdit;
  if (active(r, h.kind)) {
    const insert = '*'.repeat(r.left - w) + r.body + '*'.repeat(r.right - w);
    edit = { from, to, insert, start: from, end: from + insert.length };
  } else if (h.kind === 'bold' ? Math.min(h.outsideLeft, h.outsideRight) >= 2 : Math.min(h.outsideLeft, h.outsideRight) % 2 === 1) {
    // Whitespace inside the selection separates external markers from content.
    const adjacent = !hasContent || (!r.lead && !r.tail);
    if (adjacent) edit = { from: from - w, to: to + w, insert: inner, start: from - w, end: from - w + inner.length };
    else edit = { from, to, insert: '*'.repeat(w) + inner + '*'.repeat(w), start: from + w, end: from + w + inner.length };
  } else edit = { from, to, insert: '*'.repeat(w) + inner + '*'.repeat(w), start: from + w, end: from + w + inner.length };
  return edit;
}


export const emphasisModel = (p: Parameters<typeof emphasisEdit>[0]) => result(p, emphasisEdit(p));

export const multiArbitrary = fc.record({ kind: fc.constantFrom('bold' as const, 'italic' as const), rows: fc.array(rowArbitrary, { minLength: 2, maxLength: 6 }), before: contextBefore, after: contextAfter });

export type Multi = Sample<typeof multiArbitrary>;

export type MultiExample = Omit<Multi, 'before' | 'after'>;

export const multiInputs: Record<string, MultiExample> = {
  plain: { kind: 'bold', rows: [row(), row()] },
  blank: { kind: 'bold', rows: [row({ body: 'one' }), row({ body: '' }), row({ body: 'two' })] },
  allOn: { kind: 'bold', rows: [row({ left: 2, right: 2 }), row({ left: 3, right: 3 })] },
  mixed: { kind: 'italic', rows: [row({ body: 'one' }), row({ body: 'two', left: 1, right: 1 })] },
  starsOnlyItalic: { kind: 'italic', rows: [row({ body: '', left: 1 }), row({ body: '', left: 1 })] },
  starsOnlyBold: { kind: 'bold', rows: [row({ body: '', left: 2 }), row({ body: '', left: 2 })] },
  allBlank: { kind: 'italic', rows: [row({ body: '', lead: ' ' }), row({ body: '', tail: '\t' })] },
  whitespace: { kind: 'italic', rows: [row({ lead: '\t', tail: ' ' }), row({ lead: '\u00a0', tail: '\r' })] },
  literalMarkersAfterStyledUnicode: { kind: 'italic', rows: [row({ body: '\ud800', left: 1, right: 1 }), row({ body: '', left: 1 })] },
};

export const multiCases: Record<string, Multi> = Object.fromEntries(Object.entries(multiInputs).map(([name, h]) => [name, { ...h, before: 'pre ', after: ' post' }]));

multiCases.documentEdges = { ...multiCases.plain!, before: '', after: '' };

// Original whole-document selections at format-shortcuts.test.ts:39–41.
multiCases.sourceBlank = { ...multiCases.blank!, before: '', after: '' };

multiCases.sourceRemoveAcrossBlank = {
  kind: 'bold', before: '', after: '',
  rows: [row({ body: 'one', left: 2, right: 2 }), row({ body: '' }), row({ body: 'two', left: 2, right: 2 })],
};

multiCases.sourceMixed = { ...multiCases.mixed!, before: '', after: '' };

export function multiStates(h: Multi) {
  const filled = h.rows.filter(r => core(r).length);
  return [h.kind, filled.length && filled.every(r => active(r, h.kind)) ? 'allStyled' : 'addStyle',
  ...(h.rows.some(r => !core(r)) ? ['blankLines'] : []),
  ...(h.rows.some(r => !r.body && core(r)) ? ['literalMarkers'] : []),
  ...(!h.before ? ['documentStart'] : []), ...(!h.after ? ['documentEnd'] : [])];
}

export function multiPlan(h: Multi) {
  const picked = h.rows.map(source).join('\n');
  return { h, text: h.before + picked + h.after, from: h.before.length, to: h.before.length + picked.length };
}

export function multiEdit(p: ReturnType<typeof multiPlan>) {
  const filled = p.h.rows.filter(r => core(r).length);
  const remove = filled.length > 0 && filled.every(r => active(r, p.h.kind));
  const w = width[p.h.kind];
  const insert = p.h.rows.map(r => !core(r) ? source(r) : r.lead + (remove
    ? '*'.repeat(r.left - w) + r.body + '*'.repeat(r.right - w)
    : '*'.repeat(w) + core(r) + '*'.repeat(w)) + r.tail).join('\n');
  return { from: p.from, to: p.to, insert, start: p.from, end: p.from + insert.length };
}


export const multiModel = (p: Parameters<typeof multiEdit>[0]) => result(p, multiEdit(p));

export const textArbitrary = fc.record({ prefix: anyText, picked: anyText, suffix: anyText });

export type Text = Sample<typeof textArbitrary>;

export const textPlan = (h: Text) => ({ h, text: h.prefix + h.picked + h.suffix, from: h.prefix.length, to: h.prefix.length + h.picked.length });

export const t = (picked: string): Text => ({ prefix: 'a ', picked, suffix: ' b' });

// URL-shaped targets are an intentional route, with independently varied target
// source; random UTF-16 alone almost never chooses an http(s) prefix.
export const urlUnit = unit.filter(c => c.trim().length > 0);

export const urlSelection = fc.tuple(fc.constantFrom('http://', 'https://'), fc.string({ unit: urlUnit, minLength: 1, maxLength: 24 })).map(
  ([scheme, rest]) => scheme + rest,
  s => { if (typeof s !== 'string') throw new Error('Expected URL'); return s.startsWith('https://') ? ['https://', s.slice(8)] : ['http://', s.slice(7)]; },
);

export const linkArbitrary = fc.oneof(textArbitrary, fc.record({ prefix: anyText, picked: urlSelection, suffix: anyText }));

export const linkCases = Object.fromEntries(['', 'word', 'http://x', 'https://x.example/a', 'HTTPS://x', 'https://', 'https://x#y', 'https://x?q=α', 'https://a b', 'https://a\n', ' https://a', 'x\ud800\u0000', '[x](y)'].map((s, i) => [`link${i}`, t(s)]));

// Original label, whole-document target, and caret at lines 47–49.
linkCases.sourceLabel = t('word');

linkCases.sourceWholeDocumentTarget = { prefix: '', picked: 'https://x.example/a', suffix: '' };

linkCases.sourceCaret = t('');

export function linkStates(h: Text) {
  const target = (h.picked.startsWith('http://') && h.picked.length > 7 || h.picked.startsWith('https://') && h.picked.length > 8) && ![...h.picked].some(c => !c.trim());
  return [target ? 'target' : h.picked ? 'label' : 'empty', ...(target && h.picked.includes('#') ? ['fragmentTarget'] : [])];
}

export function linkEdit(p: ReturnType<typeof textPlan>) {
  const picked = p.h.picked;
  const rest = picked.startsWith('https://') ? picked.slice(8) : picked.startsWith('http://') ? picked.slice(7) : '';
  const url = rest.length > 0 && [...rest].every(c => c.trim().length > 0);
  const insert = url ? `[](${picked})` : `[${picked}]()`;
  const at = p.from + (url || !picked ? 1 : picked.length + 3);
  return { from: p.from, to: p.to, insert, start: at, end: at };
}

export const linkModel = (p: Parameters<typeof linkEdit>[0]) => result(p, linkEdit(p));

export const formulaCases = Object.fromEntries(['', ' x ', '\t', '\n', 'pi r^2', '\\int f\ndx', '$x$', '$$x$$', '$$x\ny$$', '$$$$', ' $$x$$ ', '$x', 'x$', 'x\r\ny', '\ud800'].map((s, i) => [`formula${i}`, t(s)]));

// Exact original source partitions at format-shortcuts.test.ts:193–196.
formulaCases.sourceEmptyDocument = { prefix: '', picked: '', suffix: '' };

formulaCases.sourceArea = { prefix: 'area ', picked: 'pi r^2', suffix: ' here' };

formulaCases.sourceMultiline = { prefix: '', picked: '\\int f\ndx', suffix: '' };

formulaCases.sourceTrimmed = t(' x ');

export const displaySelection = anyText.map(s => '$$' + s + '$$', s => { if (typeof s !== 'string') throw new Error('Expected text'); return s.slice(2, -2); });

// Dollar boundaries vary independently: a prefix alone, a suffix alone, and
// short overlapping pairs are not existing display formulas. Arbitrary UTF-16
// remains a separate unrestricted route through the same model and check.
const dollarSelection = fc.tuple(fc.integer({ min: 0, max: 3 }), anyText, fc.integer({ min: 0, max: 3 })).map(
  ([left, body, right]) => '$'.repeat(left) + body + '$'.repeat(right),
  picked => {
    if (typeof picked !== 'string') throw new Error('Expected formula source');
    for (let left = 0; left <= 3; left++) for (let right = 0; right <= 3; right++) {
      if (picked.length >= left + right && picked.length - left - right <= 32 && picked.startsWith('$'.repeat(left)) && picked.endsWith('$'.repeat(right))) return [left, picked.slice(left, picked.length - right), right] as [number, string, number];
    }
    throw new Error('Expected bounded dollar boundaries');
  },
);
export const formulaArbitrary = fc.oneof(textArbitrary, fc.record({ prefix: anyText, picked: displaySelection, suffix: anyText }), fc.record({ prefix: anyText, picked: dollarSelection, suffix: anyText }));
Object.assign(formulaCases, {
  leadingDisplayOnly: t('$$ab'), trailingDisplayOnly: t('ab$$'), shortDoubleDollar: t('$$'),
  leadingMultilineOnly: t('$$a\nb'), trailingMultilineOnly: t('a\nb$$'),
});

export function formulaStates(h: Text) {
  const s = h.picked.trim(), display = s.length >= 4 && s.startsWith('$$') && s.endsWith('$$');
  return [display ? h.picked.includes('\n') ? 'existingMultilineDisplay' : 'existingDisplay' : h.picked.includes('\n') ? 'newDisplay' : 'inline',
  ...(s.startsWith('$$') !== s.endsWith('$$') ? ['asymmetricDollars'] : []), ...(s === '$$' ? ['overlappingDollars'] : []),
  ...(!s ? ['emptyBody'] : []), ...(s !== h.picked ? ['trimmed'] : [])];
}

export function formulaEdit(p: ReturnType<typeof textPlan>) {
  const inner = p.h.picked.trim();
  const displayed = inner.length >= 4 && inner.startsWith('$$') && inner.endsWith('$$');
  const w = p.h.picked.includes('\n') ? 2 : 1;
  const insert = displayed ? inner : '$'.repeat(w) + inner + '$'.repeat(w);
  const start = p.from + (displayed ? 2 : w), end = p.from + insert.length - (displayed ? 2 : w);
  return { from: p.from, to: p.to, insert, start, end };
}
export const formulaModel = (p: Parameters<typeof formulaEdit>[0]) => result(p, formulaEdit(p));
