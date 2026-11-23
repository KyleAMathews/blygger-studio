/** Independent URL/link inputs and models. No production imports or test registration. */
import fc from 'fast-check';
import { unit, type Sample } from './document-oracle.ts';
import { namedCharacterReferences } from './html-entities-oracle.ts';

// The retained tracker policy is an explicit vocabulary, not production's regex.
// WHATWG URL parsing/serialization is the trusted host base; filtering and the
// counted projection below are independent of production's delete-by-key loop.
export const trackerNames = ['fbclid', 'gclid', 'dclid', 'msclkid', 'mc_cid', 'mc_eid', 'igshid', 'si', 'ref_src', 'ref', '_hsenc', '_hsmi', 'mkt_tok'];
const trackers = new Set(trackerNames);
export function tracker(key: string) {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', alphabet = 'abcdefghijklmnopqrstuvwxyz';
  const lower = [...key].map(c => upper.includes(c) ? alphabet[upper.indexOf(c)]! : c).join('');
  const word = (c: string) => 'abcdefghijklmnopqrstuvwxyz0123456789_'.includes(c);
  return trackers.has(lower) || lower.startsWith('utm_') && lower.length > 4 && [...lower.slice(4)].every(word);
}

export const urlArbitrary = fc.record({
  protocol: fc.constantFrom('http', 'https', 'HTTP', 'HTTPS'),
  path: fc.array(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/-._~()', '%20', '%2F', '%28', '%29', 'α', '😀'), { maxLength: 64 }),
  parameters: fc.array(fc.record({
    key: fc.constantFrom(...trackerNames, 'utm_source', 'utm_medium', 'UTM_Campaign', 'utm_0', 'utm__', 'utm_', 'utm_😀', 'utm_K', 'ref_id', 'id', 'page', 'q', 'source'),
    value: fc.string({ unit: fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 +&=#', 'α', '😀'), maxLength: 16 }),
  }), { maxLength: 18 }),
  fragment: fc.string({ unit: fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789-_?&#=', 'α'), maxLength: 16 }),
  padding: fc.constantFrom('', ' ', '  ', '\t\n'),
});
export type Url = Sample<typeof urlArbitrary>;
export const url = (extra: Partial<Url> = {}): Url => ({ protocol: 'https', path: ['a'], parameters: [], fragment: '', padding: '', ...extra });
export function urlText(h: Url) {
  const query = new URLSearchParams(h.parameters.map(({ key, value }) => [key, value])).toString();
  return h.padding + h.protocol + '://example.com/' + h.path.join('') + (query ? '?' + query : '') + (h.fragment ? '#' + h.fragment : '') + h.padding;
}

// The raw arm admits lexical/parse failures and every UTF-16 string in bounds.
// The structured arm spends generated histories around useful valid URL states.
export const rawArbitrary = fc.oneof(fc.record({ raw: fc.string({ unit, maxLength: 512 }) }), urlArbitrary);
export type Raw = Sample<typeof rawArbitrary>;
export const rawText = (h: Raw) => 'raw' in h ? h.raw : urlText(h);
export const rawCases: Record<string, Raw> = {
  https: { raw: ' https://example.com/x ' }, http: { raw: 'http://example.com' },
  uppercase: { raw: ' HTTPS://example.com/a ' }, prose: { raw: 'see https://example.com' },
  ftp: { raw: 'ftp://example.com' }, javascript: { raw: 'javascript:alert(1)' },
  invalid: { raw: 'not a url' }, internalSpace: { raw: 'https://exa mple.com' },
  missingHost: { raw: 'https://' }, invalidHost: { raw: 'https://[' }, empty: { raw: '' },
  allTrackers: url({ path: [...'essays/maintenance'], parameters: [
    { key: 'id', value: '7' }, { key: 'utm_source', value: 'newsletter' }, { key: 'utm_medium', value: 'email' },
    ...trackerNames.map(key => ({ key, value: key === 'fbclid' ? 'IwAR0x' : 'a' })), { key: 'page', value: '2' },
  ] }),
  trackerFragment: { raw: 'https://example.com/a?utm_source=x#part' },
  fragmentQuestionAtEnd: { raw: 'https://example.com/a?ref=x#part?' },
  fragmentQuestionBeforeHash: { raw: 'https://example.com/a?ref=x#part?#next' },
  fragmentQuestionRetained: { raw: 'https://example.com/a?ref=x#part?next' },
  trackerOnly: { raw: 'https://example.com/a?UTM_Campaign=x' },
  untouched: { raw: '  https://example.com/a%20b?q=one+two&ref_id=3\n' },
  oldAllTrackers: { raw: 'https://www.example.com/essays/maintenance?id=7&utm_source=newsletter&utm_medium=email&fbclid=IwAR0x&gclid=a&dclid=b&msclkid=c&mc_cid=d&mc_eid=e&igshid=f&si=g&ref_src=h&ref=i&_hsenc=j&_hsmi=k&mkt_tok=l&page=2' },
  repeatedTracker: url({ parameters: [{ key: 'id', value: '7' }, { key: 'ref', value: 'a' }, { key: 'ref', value: 'b' }, { key: 'page', value: '2' }] }),
  utmWithoutWord: url({ parameters: [{ key: 'utm_', value: 'keep' }, { key: 'utm_😀', value: 'keep' }] }),
  utmDigit: url({ parameters: [{ key: 'utm_0', value: 'drop' }] }),
  unicodeLookalike: url({ parameters: [{ key: 'utm_K', value: 'keep' }] }),
  parentheses: url({ path: [...'a(b)'], fragment: 'part' }),
  unicode: url({ path: ['α', '/', '😀'], parameters: [{ key: 'q', value: 'α & 😀' }], fragment: 'α' }),
};

// Lexical recognition deliberately does not promise URL parse validity.
// isUrl('https://[') recognizes a lone URL-shaped token; cleanUrl must reject it.
export function recognized(raw: string) {
  const text = raw.trim(), separator = text.indexOf('://');
  if (separator < 0) return false;
  const scheme = text.slice(0, separator).toLowerCase(), rest = text.slice(separator + 3);
  return (scheme === 'http' || scheme === 'https') && rest.length > 0 && [...rest].every(c => c.trim().length > 0);
}
export function cleaned(raw: string): { url: string; removed: number } | null {
  if (!recognized(raw)) return null;
  const text = raw.trim();
  let parsed: URL;
  try { parsed = new URL(text); } catch { return null; }
  const entries = [...parsed.searchParams], kept = entries.filter(([key]) => !tracker(key));
  const removed = entries.length - kept.length;
  if (!removed) return { url: text, removed: 0 };
  parsed.search = new URLSearchParams(kept).toString();
  return { url: parsed.href, removed };
}
export const rawStates = (h: Raw) => {
  const text = rawText(h), lexical = recognized(text), clean = cleaned(text);
  return [lexical ? 'recognized' : 'notRecognized', clean ? clean.removed ? 'trackersRemoved' : 'untouchedUrl' : 'invalidUrl',
    ...(lexical && !clean ? ['lexicalButInvalid'] : []), ...(text !== text.trim() ? ['surroundingWhitespace'] : []),
    ...(clean && clean.removed > 1 ? ['multipleTrackers'] : []), ...(text.includes('#') ? ['fragment'] : [])];
};

// Canonical Markdown serialization follows its literal syntax alphabet. The
// rendering property below uses semantic label/URL inputs rather than treating
// agreement with this serializer as proof of a correctly rendered anchor.
export function markdown(target: string, label = '') {
  let destination = '', text = '';
  for (const c of target) destination += '()<>'.includes(c) || !c.trim() ? '%' + c.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0') : c;
  for (const c of label) text += '[]\\'.includes(c) ? '\\' + c : c;
  return label ? '[' + text + '](' + destination + ')' : '<' + destination + '>';
}
export const markdownArbitrary = fc.record({ target: fc.string({ unit, maxLength: 96 }), label: fc.string({ unit, maxLength: 64 }), omitted: fc.boolean() }, { requiredKeys: ['target', 'label'] });
export type Markdown = Sample<typeof markdownArbitrary>;
export const markdownCases: Record<string, Markdown> = {
  selected: { target: 'https://example.com/a', label: 'the essay' },
  autolink: { target: 'https://example.com/a', label: '' },
  omittedLabel: { target: 'https://example.com/a', label: '', omitted: true },
  selectedAngles: { target: 'https://example.com/<a>', label: 'a' },
  autolinkAngles: { target: 'https://example.com/<a>', label: '' },
  oldEscaping: { target: 'https://en.wikipedia.org/wiki/Foo_(bar)', label: 'a [b]' },
  backslash: { target: 'https://example.com/a)', label: 'a\\]b[' },
  whitespace: { target: 'a\t\n\r\u00a0\u2028\ufeffb', label: 'x' },
  controls: { target: '\0\ud800😀', label: '\0\udfff[]\\' },
};
export const markdownStates = (h: Markdown) => {
  const label = h.omitted ? '' : h.label;
  return [label ? 'selectedLabel' : 'autolink', ...(h.omitted ? ['omittedLabel'] : []),
    ...(label.includes('[') || label.includes(']') ? ['labelBrackets'] : []), ...(label.includes('\\') ? ['labelBackslash'] : []),
    ...([...h.target].some(c => '()<>'.includes(c) || !c.trim()) ? ['encodedDestination'] : []),
    ...(h.target.includes('<') || h.target.includes('>') ? ['targetAngles'] : []),
    ...(h.target.includes('(') || h.target.includes(')') ? ['targetParentheses'] : []),
    ...([...h.target].some(c => !c.trim()) ? ['targetWhitespace'] : [])];
};

export const insertionArbitrary = fc.record({ before: fc.string({ unit, maxLength: 32 }), picked: fc.string({ unit, maxLength: 64 }), after: fc.string({ unit, maxLength: 32 }), url: rawArbitrary });
export type Insertion = Sample<typeof insertionArbitrary>;
export const insertionCases: Record<string, Insertion> = {
  oldSelection: { before: 'Read ', picked: 'the essay', after: ' today.', url: { raw: 'https://example.com/e?utm_source=x&fbclid=y' } },
  oldAutolink: { before: 'See ', picked: '', after: '', url: { raw: 'https://example.com/' } },
  oldInvalid: { before: '', picked: 'x', after: '', url: { raw: 'nope' } },
  escapedLabel: { before: 'see ', picked: 'a]b\\[c', after: '.', url: rawCases.parentheses! },
  unicode: { before: 'α😀', picked: '\ud800😀', after: '\0', url: rawCases.unicode! },
};
for (const [name, input] of Object.entries(rawCases)) insertionCases['url-' + name] = { before: 'Read ', picked: 'this', after: '.', url: input };
export const insertionPlan = (h: Insertion) => ({ h, text: h.before + h.picked + h.after, from: h.before.length, to: h.before.length + h.picked.length, raw: rawText(h.url) });
export function insertionModel(p: ReturnType<typeof insertionPlan>) {
  const clean = cleaned(p.raw);
  if (!clean) return null;
  const inserted = markdown(clean.url, p.h.picked);
  return { text: p.h.before + inserted + p.h.after, caret: p.h.before.length + inserted.length, removed: clean.removed, linked: p.h.picked.length > 0 };
}
export const insertionStates = (h: Insertion) => [...rawStates(h.url), h.picked ? 'selection' : 'caret', ...(!h.before ? ['documentStart'] : []), ...(!h.after ? ['documentEnd'] : [])];

export const toastArbitrary = fc.oneof(fc.record({ removed: fc.integer({ min: 0, max: 32 }), linked: fc.boolean() }),
  fc.record({ insertion: fc.record({ before: fc.string({ unit, maxLength: 32 }), picked: fc.string({ unit, maxLength: 64 }), after: fc.string({ unit, maxLength: 32 }), url: urlArbitrary }) }));
export type Feedback = Sample<typeof toastArbitrary>;
export const toastCases: Record<string, Feedback> = {
  none: { removed: 0, linked: false }, selected: { removed: 0, linked: true }, one: { removed: 1, linked: false }, many: { removed: 2, linked: true },
  originalSelectedResult: { insertion: { before: 'Read ', picked: 'the essay', after: ' today.', url: url({ path: ['e'], parameters: [{ key: 'utm_source', value: 'x' }, { key: 'fbclid', value: 'y' }] }) } },
  originalAutolinkResult: { insertion: { before: 'See ', picked: '', after: '', url: url({ path: [] }) } },
};
const feedbackFlags = (h: Feedback) => 'insertion' in h ? insertionModel(insertionPlan(h.insertion))! : h;
export const toastModel = (h: Feedback) => {
  const flags = feedbackFlags(h);
  return (flags.linked ? 'linked selection' : 'inserted link') + (flags.removed > 0 ? ` · ${flags.removed} tracker${flags.removed === 1 ? '' : 's'} removed` : '');
};
export const toastStates = (h: Feedback) => {
  const flags = feedbackFlags(h);
  return [flags.linked ? 'linkedSelection' : 'insertedAutolink', flags.removed === 0 ? 'noTracker' : flags.removed === 1 ? 'oneTracker' : 'manyTrackers', 'insertion' in h ? 'insertedResult' : 'directFlags'];
};

// Render only plain labels here: Markdown emphasis, inline HTML and code retain
// their own syntax. Brackets/backslashes, Unicode and URL punctuation are legal.
export const renderArbitrary = fc.record({ label: fc.string({ unit: fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 []\\(),;&', 'α', '😀'), minLength: 1, maxLength: 32 }), url: urlArbitrary });
export type Render = Sample<typeof renderArbitrary>;
export const renderCases: Record<string, Render> = {
  plain: { label: 'the essay', url: url() }, brackets: { label: 'a [b]', url: url({ path: [...'a(b)'] }) },
  backslash: { label: 'a\\]b[', url: url({ protocol: 'HTTPS', fragment: 'part' }) },
  query: { label: 'α😀', url: url({ path: ['α', '/', '😀'], parameters: [{ key: 'q', value: 'one & two' }, { key: 'fbclid', value: 'gone' }], fragment: 'α' }) },
  fragmentQuestion: { label: 'part', url: url({ parameters: [{ key: 'ref', value: 'gone' }], fragment: 'part?' }) },
  entity: { label: '&amp;', url: url() }, otherEntity: { label: '&copy;', url: url() },
  unknownEntity: { label: '&unknown;', url: url() }, unterminatedEntity: { label: '&copy', url: url() },
  unknownCopyPrefix: { label: '&copyx;', url: url() }, unknownAmpPrefix: { label: '&ampx;', url: url() },
  unknownNotPrefix: { label: '&notit;', url: url() }, knownNotPrefix: { label: '&notin;', url: url() },
  paddedDuplicateTrackers: { label: 'page', url: url({ padding: '\t\n', parameters: [{ key: 'ref', value: 'one' }, { key: 'ref', value: 'two' }] }) },
};
// CommonMark 0.31.2 §6.2 requires a semicolon and a 2–32-character named
// reference. Only exact names from an independent CPython HTML5 vocabulary
// reach the browser's HTML decoder: syntax alone lets native HTML partially
// decode unknown names such as &copyx;. Unknown/unterminated references stay
// literal; numeric references
// are outside this label alphabet. No Markdown parser or production decoder is
// imported by this model.
export function renderPlan(h: Render) {
  const parts: { text: string; entity?: boolean }[] = [];
  let offset = 0;
  for (const match of h.label.matchAll(/&[A-Za-z][A-Za-z0-9]{1,31};/g)) {
    parts.push({ text: h.label.slice(offset, match.index) }, { text: match[0], entity: namedCharacterReferences.has(match[0].slice(1)) });
    offset = match.index! + match[0].length;
  }
  parts.push({ text: h.label.slice(offset) });
  return { h, parts };
}
// Encoding a parenthesis is the established Markdown destination spelling. URL
// canonicalization preserves every other reserved escape, query and fragment.
export const semanticHref = (target: string) => {
  try { return new URL(target).href.replace(/%28/gi, '(').replace(/%29/gi, ')'); }
  catch { return { invalidHref: target }; }
};
export const renderStates = (h: Render) => [...rawStates(h.url), ...markdownStates({ target: cleaned(rawText(h.url))!.url, label: h.label }).filter(state => state !== 'autolink'),
  ...(renderPlan(h).parts.some(part => part.entity) ? ['characterReference'] : []),
  ...(renderPlan(h).parts.some(part => part.entity === false) ? ['unknownCharacterReference'] : [])];
