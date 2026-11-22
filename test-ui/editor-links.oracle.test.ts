/**
 * These oracles own completed URL/link helpers in src/ui/links.ts. Their return
 * values are observed in a real browser; a second path feeds generated selected
 * links through the real Worker preview and observes the browser's anchor DOM.
 *
 * isUrl(' HTTPS://example.com/a ') // → true for a lone http(s) token
 * cleanUrl('https://example.com/?id=7&ref=x') // → id retained, one tracker removed
 * linkMarkdown('https://x.example/a)', 'a]b') // → literal brackets and safe destination
 * insertLink('Read this.', 5, 9, url) // → only the selection replaced, caret after link
 * linkToast({ removed: 1, linked: true }) // → linked selection · 1 tracker removed
 *
 * A URL-shaped token can still fail URL parsing. Conversely, a valid URL with
 * no trackers retains its exact trimmed spelling; normalization is not a license
 * to rewrite it. Tracker removal counts occurrences, including duplicate keys,
 * and preserves page parameters, order and fragment under URL serialization.
 * For every label/destination string, canonical Markdown escapes label brackets
 * and backslashes and encodes destination delimiters/whitespace. For every
 * insertion, surrounding text is preserved and both result flags describe the
 * actual operation. For every valid nonnegative tracker count, the toast names
 * insertion/selection and uses the correct count/plural. For every plain selected
 * label and generated valid URL, preview renders exactly one anchor with that
 * label's Markdown character references decoded and the cleaned destination.
 *
 * Authority: decision by Kyle Mathews (GitHub KyleAMathews), 2026-11-18: adopt
 * the completed-link oracle backlog and preserve the existing helper behavior
 * recorded in test-ui/links.test.ts at 28b0c8d642a87e5810ad6eabd95c2d1714c53396.
 * WHATWG URL is the shared trusted parsing/serialization base. The independent
 * model projects query entries instead of deleting production-classified keys.
 * The rendered-anchor model starts from semantic label/URL inputs, not the
 * canonical Markdown serializer's answer. CommonMark 0.31.2 §6.2 owns named
 * character-reference semantics; exact CPython HTML5 name membership gates the
 * browser's independent entity table before production is called. Histories include original helper
 * inputs, tracker duplicates, near-miss names, malformed tokens and UTF-16 text.
 *
 * Limits: raw strings through 512 units, source labels through 64, at most 18
 * parameters and toast counts 0–32. Preview labels contain up to 32 generated
 * symbols (64 UTF-16 units), including named references, brackets, backslashes
 * and Unicode; inline markup/HTML and malformed surrogates are outside
 * this rendering law. Parenthesis escapes are normalized when judging targets.
 * This file does not establish clipboard delivery, app receipt, OS permissions
 * or keyboard-placeholder completion. Those remain separate receiving paths.
 */
import { differs, oracleProperty, pass } from '@tanstack/oracles';
import * as model from './editor-oracles/link-model-oracle.ts';
import { browserLinkCall, browserPreview, browserRun } from './editor-oracles/browser-driver-oracle.ts';
import { histories, traceValue, type Observe } from './editor-oracles/document-oracle.ts';

const authority = 'Decision by Kyle Mathews (GitHub KyleAMathews), 2026-11-18: adopt completed-link oracle work and preserve existing helper behavior from test-ui/links.test.ts at 28b0c8d642a87e5810ad6eabd95c2d1714c53396. WHATWG URL owns host parsing/serialization.';
const corruptReturn = (change: (value: any) => unknown) => (trace: readonly import('@tanstack/oracles').Observation[]) => trace.map(item => item.checkpoint === 'return'
  ? { ...item, value: { value: change((item.value as { value: unknown }).value) } } : item);
const compare = (trace: readonly import('@tanstack/oracles').Observation[], expected: unknown, law: string) => differs('return', law, traceValue(trace, 'return'), { value: expected },
  `${law}: observed ${JSON.stringify(traceValue(trace, 'return'))}; expected ${JSON.stringify({ value: expected })}`) ?? pass;

oracleProperty({
  id: 'editor-url-recognition', owns: ['src/ui/links.ts#isUrl'],
  law: { statement: 'For every input string, URL recognition accepts exactly a lone case-insensitive http(s) token, allowing surrounding whitespace and requiring a nonempty whitespace-free tail.', authority, limits: 'Generated raw strings through 512 UTF-16 units and structured URLs; recognition alone does not establish parse validity.' },
  histories: histories(model.rawArbitrary, model.rawCases, model.rawStates),
  resolve: model.rawText, model: model.recognized, reached: raw => model.rawStates({ raw }),
  driver: async (raw, observe) => { observe('return', await browserLinkCall('isUrl', [raw])); },
  check: (_p, trace, expected) => compare(trace, expected, 'lone URL recognition'),
  calibrations: [{ name: 'recognizer refuses a valid URL', law: 'lone URL recognition', history: { constructed: 'https' }, corrupt: corruptReturn(() => false) }],
});

oracleProperty({
  id: 'editor-url-cleaning', owns: ['src/ui/links.ts#cleanUrl'],
  law: { statement: 'For every input, cleaning rejects invalid http(s) URLs; otherwise it removes exactly the declared tracker occurrences, preserves all page parameters and fragments, and preserves exact trimmed spelling when none are removed.', authority, limits: 'Raw strings through 512 UTF-16 units; structured URLs have at most 18 parameters. WHATWG URL parsing/serialization is a trusted base, independently classified/projected query entries are not.' },
  histories: histories(model.rawArbitrary, model.rawCases, model.rawStates),
  resolve: model.rawText, model: model.cleaned, reached: raw => model.rawStates({ raw }),
  driver: async (raw, observe) => { observe('return', await browserLinkCall('cleanUrl', [raw])); },
  check: (_p, trace, expected) => compare(trace, expected, 'tracker projection'),
  calibrations: [{ name: 'cleaner loses a page selector', law: 'tracker projection', history: { constructed: 'allTrackers' }, corrupt: corruptReturn(value => ({ ...value, url: value.url.replace('id=7&', '') })) }],
});

oracleProperty({
  id: 'editor-link-markdown', owns: ['src/ui/links.ts#linkMarkdown'],
  law: { statement: 'For every target/label string, completed-link Markdown canonically escapes brackets/backslashes in a selected label and encodes destination delimiters/whitespace; an empty label makes an autolink.', authority, limits: 'Target through 96 and label through 64 UTF-16 units. This source law does not promise that arbitrary target strings are valid URLs or that arbitrary label markup renders literally.' },
  histories: histories(model.markdownArbitrary, model.markdownCases, model.markdownStates),
  model: h => model.markdown(h.target, h.omitted ? '' : h.label), reached: model.markdownStates,
  driver: async (h, observe) => { observe('return', await browserLinkCall('linkMarkdown', h.omitted ? [h.target] : [h.target, h.label])); },
  check: (_p, trace, expected) => compare(trace, expected, 'canonical link source'),
  calibrations: [{ name: 'unescaped closing label bracket', law: 'canonical link source', history: { constructed: 'oldEscaping' }, corrupt: corruptReturn(value => value.replace('\\]', ']')) }],
});

oracleProperty({
  id: 'editor-link-insertion', owns: ['src/ui/links.ts#insertLink'],
  law: { statement: 'For every valid UTF-16 selection and input URL, insertion either declines an invalid URL or replaces only that selection with the canonical cleaned link, puts the caret after it, and accurately reports selected-label/tracker results.', authority, limits: 'Surrounding partitions through 32 units, selected text through 64, raw URL through 512. This helper does not deliver a DOM input event or manage native undo.' },
  histories: histories(model.insertionArbitrary, model.insertionCases, model.insertionStates),
  resolve: model.insertionPlan, model: model.insertionModel, reached: p => model.insertionStates(p.h),
  driver: async (p, observe) => { observe('return', await browserLinkCall('insertLink', [p.text, p.from, p.to, p.raw])); },
  check: (_p, trace, expected) => compare(trace, expected, 'completed link replacement'),
  calibrations: [{ name: 'insertion destroys surrounding prose', law: 'completed link replacement', history: { constructed: 'oldSelection' }, corrupt: corruptReturn(value => ({ ...value, text: value.text.slice('Read '.length) })) }],
});

oracleProperty({
  id: 'editor-link-feedback', owns: ['src/ui/links.ts#linkToast'],
  law: { statement: 'For every valid tracker count and insertion kind, link feedback names a linked selection or inserted autolink and reports exactly the removed count with singular only for one.', authority, limits: 'Valid nonnegative integer counts 0–32; no promise about arbitrary numeric values or whether a toast is visibly delivered by React.' },
  histories: histories(model.toastArbitrary, model.toastCases, model.toastStates),
  model: model.toastModel, reached: model.toastStates,
  driver: async (h, observe) => {
    if (!('insertion' in h)) { observe('return', await browserLinkCall('linkToast', [h])); return; }
    const p = model.insertionPlan(h.insertion);
    const inserted = await browserLinkCall('insertLink', [p.text, p.from, p.to, p.raw]);
    observe('insertion', inserted);
    // Retain the public composition call shape, including source/caret fields.
    // An invalid production result stays observable data rather than throwing
    // from the driver and masquerading as a rejected mutation.
    if (!inserted.value || typeof inserted.value !== 'object') { observe('return', inserted); return; }
    observe('return', await browserLinkCall('linkToast', [inserted.value]));
  },
  check: (_p, trace, expected) => compare(trace, expected, 'link feedback'),
  calibrations: [{ name: 'feedback loses the removal count', law: 'link feedback', history: { constructed: 'many' }, corrupt: corruptReturn(value => value.split(' · ')[0]) }],
});

// A semantic anchor is a separate formulation: a source-escaping model and the
// formatter could share a mistake, while the real Markdown parser exposes it.
async function renderDriver(p: ReturnType<typeof model.renderPlan>, observe: Observe) {
  const h = p.h;
  // This is a trusted input projection, recorded before the SUT runs. The
  // CommonMark tokenizer and CPython full-name vocabulary are independent of
  // production MarkdownIt/entities; only known complete tokens reach the host's
  // HTML entity table (HTML otherwise decodes some unknown prefixes). The model
  // may read recorded inputs (glossary), never insertion or preview outputs.
  const labelInput = await browserRun((_sut, parts) => parts.map(part => {
    if (!part.entity) return part.text;
    const decoder = document.createElement('textarea'); decoder.innerHTML = part.text;
    return decoder.value;
  }).join(''), p.parts);
  observe('labelInput', labelInput);
  const inserted = await browserLinkCall('insertLink', [h.label, 0, h.label.length, model.urlText(h.url)]);
  if (!inserted.value || typeof inserted.value.text !== 'string') { observe('anchor', inserted); return; }
  const html = await browserPreview(inserted.value.text);
  const observation = await browserRun((_sut, html) => {
    const root = document.createElement('div'); root.innerHTML = html;
    const anchors = [...root.querySelectorAll('a')].map(anchor => ({ label: anchor.textContent, href: anchor.href }));
    root.querySelectorAll('a').forEach(anchor => anchor.remove());
    return { anchors, outside: root.textContent?.trim() };
  }, html);
  observe('anchor', { ...observation, anchors: observation.anchors.map(anchor => ({ ...anchor, href: model.semanticHref(anchor.href) })) });
}
oracleProperty({
  id: 'editor-completed-link-rendering', owns: ['src/ui/links.ts#insertLink'],
  law: { statement: 'For every generated selected label and valid URL, a completed inserted link renders as exactly one anchor with that label under CommonMark named-character-reference semantics and the cleaned destination, without orphaned source outside it.', authority: authority + ' CommonMark 0.31.2 §6.2: https://spec.commonmark.org/0.31.2/#entity-and-numeric-character-references.', limits: 'Labels through 32 generated symbols (up to 64 UTF-16 units), with brackets, backslashes, named character references and printable Unicode. Native HTML entity table is a trusted input reference independent of the production parser. Parenthesis percent escapes are treated as the established destination spelling. No arbitrary inline markup, numeric references, malformed-surrogate preview, clipboard or keyboard-placeholder claim.' },
  histories: { ...histories(model.renderArbitrary, model.renderCases, model.renderStates), runs: 25 },
  resolve: model.renderPlan,
  model: (p, trace) => ({ anchors: [{ label: traceValue(trace, 'labelInput'), href: model.semanticHref(model.cleaned(model.urlText(p.h.url))!.url) }], outside: '' }),
  reached: p => model.renderStates(p.h), driver: renderDriver,
  check: (_p, trace, expected) => differs('anchor', 'rendered completed link', traceValue(trace, 'anchor'), expected) ?? pass,
  calibrations: [{ name: 'preview lost the anchor', law: 'rendered completed link', history: { constructed: 'brackets' }, corrupt: trace => trace.map(item => item.checkpoint === 'anchor' ? { ...item, value: { anchors: [], outside: '' } } : item) }],
});
