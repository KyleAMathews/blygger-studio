/** Clipboard, sheet and paste histories. Only input text predicts edits. */
import fc from 'fast-check';
import { type Sample } from './document-oracle.ts';
import type { Observation } from '@tanstack/oracles';
import { traceValue } from './document-oracle.ts';
import { insertionModel, insertionPlan, rawArbitrary, rawText, recognized, toastModel, url, cleaned } from './link-model-oracle.ts';

const words = fc.string({ unit: fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789. []\\(),;', 'α', '😀'), maxLength: 28 });
const operation = fc.record({
  kind: fc.constantFrom('clipboard', 'denied', 'cancel', 'invalidTyped', 'paste', 'nativePaste', 'files', 'full', 'inspect'),
  at: fc.constantFrom('current', 'range', 'caret', 'all', 'end'), a: fc.nat(80), b: fc.nat(80),
  raw: rawArbitrary, typed: rawArbitrary, activation: fc.constantFrom('click', 'Enter', 'Space'),
});
export const workflowArbitrary = fc.record({ mobile: fc.boolean(), surface: fc.constantFrom('composer', 'editor'),
  before: words, picked: words, after: words, operations: fc.array(operation, { minLength: 1, maxLength: 5 }),
});
export type Workflow = Sample<typeof workflowArbitrary>;
export type Operation = Workflow['operations'][number];
const op = (extra: Partial<Operation> = {}): Operation => ({ kind: 'clipboard', at: 'current', a: 0, b: 0,
  raw: url({ parameters: [{ key: 'utm_source', value: 'x' }, { key: 'fbclid', value: 'y' }] }),
  typed: url(), activation: 'click', ...extra });
const base: Workflow = { mobile: false, surface: 'composer', before: 'Read ', picked: 'the essay', after: ' today.', operations: [op()] };
export const workflowCases: Record<string, Workflow> = {
  originalClipboard: { ...base, operations: [op({ raw: { raw: 'https://www.example.com/essay?id=7&utm_source=newsletter&fbclid=IwAR0x' } }),
    op({ raw: { raw: 'just some words' }, at: 'end', typed: { raw: 'https://example.org/p?gclid=1' } })] },
  originalPaste: { ...base, before: 'see ', picked: 'this page', after: '', operations: [
    op({ kind: 'paste', raw: { raw: 'https://example.com/p?utm_medium=x' } }),
    op({ kind: 'paste', at: 'caret', a: 0, raw: { raw: 'https://example.com/q' } }),
    op({ kind: 'paste', at: 'range', a: 0, b: 3, raw: { raw: 'not a url' } }),
    op({ kind: 'full' }), op({ kind: 'paste', at: 'range', a: 0, b: 3, raw: { raw: 'https://example.net/' } }),
  ] },
};
for (const mobile of [false, true]) for (const kind of ['clipboard', 'denied', 'cancel', 'invalidTyped', 'paste', 'nativePaste', 'files', 'full', 'inspect'] as const) {
  workflowCases[`${kind}-${mobile ? 'mobile' : 'desktop'}`] = { ...base, mobile, operations: [op({ kind })] };
}
Object.assign(workflowCases, {
  keyboardEnter: { ...base, operations: [op({ activation: 'Enter' })] },
  keyboardSpace: { ...base, operations: [op({ activation: 'Space' })] },
  escapedClipboard: { ...base, surface: 'editor', picked: 'a]b\\[c α😀', operations: [op({ raw: url({ path: [...'a(b)'], fragment: 'part?' }) })] },
  nativeDefaultCaret: { ...base, operations: [op({ kind: 'nativePaste', at: 'end' })] },
  nativeDefaultProse: { ...base, operations: [op({ kind: 'nativePaste', raw: { raw: 'plain words' } })] },
  lexicalInvalid: { ...base, operations: [op({ raw: { raw: 'https://[' } })] },
  editorFull: { ...base, surface: 'editor', operations: [op({ kind: 'full' })] },
  clipboardToFull: { ...base, operations: [op(), op({ kind: 'full' })] },
  fallbackToFull: { ...base, operations: [op({ kind: 'denied' }), op({ kind: 'full' })] },
  sheetAutolink: { ...base, operations: [op({ kind: 'denied', at: 'end', activation: 'Enter' })] },
});
for (const name of ['originalClipboard', 'originalPaste']) workflowCases[name + 'Mobile'] = { ...workflowCases[name]!, mobile: true };
for (const [name, raw] of Object.entries({ cr: '\r', crlf: '\r\n', high: '\ud800', low: '\udfff', empty: '', ordinary: 'plain' })) {
  workflowCases['nativeTransport-' + name] = { ...base, operations: [op({ kind: 'nativePaste', at: 'end', raw: { raw } })] };
}
// A fragment question is distinguishable only when cleanup actually removes a
// tracker. Vary both its boundary and its receiving path, retaining the nearby
// nonterminal question that the original defect already preserves.
for (const kind of ['clipboard', 'denied', 'paste', 'nativePaste'] as const) {
  for (const fragment of ['part?', 'part?#next', 'part?next']) {
    const target = url({ parameters: [{ key: 'ref', value: 'x' }], fragment });
    workflowCases[`fragment-cleanup-${kind}-${fragment}`] = { ...base, operations: [op({ kind, raw: target, typed: target })] };
  }
}

// Native paste replaces the selected range even when the clipboard is empty.
// Keep selection/caret/full-range neighbors and continued editing on both hosts.
for (const surface of ['composer', 'editor'] as const) for (const at of ['current', 'end', 'all'] as const) {
  workflowCases[`empty-nativePaste-${surface}-${at}`] = { ...base, surface, operations: [
    op({ kind: 'nativePaste', at, raw: { raw: '' } }), op({ at: 'current' }),
  ] };
}

// Reduced form of CI seed 688508621: a cleaned autolink, an inspection that
// changes only selection, then empty native paste over part of the link.
workflowCases.emptyNativePasteAfterLink = { ...base, before: '', picked: '', after: '', operations: [
  op(), op({ kind: 'inspect', at: 'range', a: 1, b: 4 }),
  op({ kind: 'nativePaste', at: 'range', a: 1, b: 4, raw: { raw: '' } }),
] };

// Select UTF-16 offsets only at code point boundaries. No host-produced caret
// enters the resolver. `current` consumes the previous modeled selection.
export function workflowRange(text: string, current: number[], action: Operation) {
  const edges = [0]; for (const c of text) edges.push(edges.at(-1)! + c.length);
  const a = edges[action.a % edges.length]!, b = edges[action.b % edges.length]!;
  return action.at === 'current' ? current : action.at === 'all' ? [0, text.length] : action.at === 'end' ? [text.length, text.length]
    : action.at === 'caret' ? [a, a] : [Math.min(a, b), Math.max(a, b)];
}
export type WorkflowHostInput = { clipboard?: string; denied?: boolean; typed?: string };
// Printable ASCII, including empty text, without edge whitespace is stable across the native clipboard
// and URL-input sanitization boundaries. Its arranged value is independently
// owed, so a different provider/input value cannot redefine the expected link.
// Other text retains the observed host premise (CR and UTF-16 may normalize).
export function workflowHostPremises(action: Operation): WorkflowHostInput {
  const stable = (text: string) => /^[\x20-\x7e]*$/.test(text) && text.trim() === text;
  const clipboardAction = ['clipboard', 'denied', 'cancel', 'invalidTyped'].includes(action.kind);
  const raw = action.kind === 'cancel' || action.kind === 'invalidTyped' ? 'not a URL' : rawText(action.raw);
  const result: WorkflowHostInput = {};
  if ((clipboardAction && action.kind !== 'denied' || action.kind === 'nativePaste') && stable(raw)) result.clipboard = raw;
  if (clipboardAction && (action.kind !== 'clipboard' || !recognized(raw)) && action.kind !== 'cancel') {
    const typed = action.kind === 'invalidTyped' ? 'not a url' : rawText(action.typed);
    if (stable(typed)) result.typed = typed;
  }
  return result;
}
export function workflowStep(text: string, selection: number[], action: Operation, input: WorkflowHostInput = {}) {
  const kind = action.kind, raw = input.clipboard ?? rawText(action.raw);
  const isClipboard = ['clipboard', 'denied', 'cancel', 'invalidTyped'].includes(kind);
  const forcedSheet = kind !== 'clipboard' && isClipboard;
  const sheet = isClipboard && (input.denied || forcedSheet || !recognized(raw));
  const canceled = kind === 'cancel';
  const target = sheet ? input.typed ?? (kind === 'invalidTyped' ? 'not a url' : rawText(action.typed)) : raw;
  const [from, to] = selection.map(n => Math.min(text.length, n)) as [number, number];
  const intercepted = !isClipboard && (kind === 'paste' || kind === 'nativePaste') && from !== to && recognized(raw);
  const result = (isClipboard && !canceled || intercepted) ? insertionModel(insertionPlan({ before: text.slice(0, from), picked: text.slice(from, to), after: text.slice(to), url: { raw: target } })) : null;
  let value = text, range = selection, toast: string | undefined;
  if (result) { value = result.text; range = [result.caret, result.caret]; toast = toastModel(result); }
  else if (isClipboard && !canceled || intercepted) toast = 'That is not a URL.';
  else if (kind === 'nativePaste') { const normalized = raw.replace(/\r\n?/g, '\n'); value = text.slice(0, from) + normalized + text.slice(to); range = [from + normalized.length, from + normalized.length]; }
  return { value, selection: range, ...(toast ? { toast } : {}),
    ...(kind === 'paste' || kind === 'files' || kind === 'nativePaste' ? { defaultAllowed: !intercepted } : {}),
    sheet: sheet ? { reason: input.denied || kind === 'denied' ? 'denied' : 'notUrl' } : null,
    dialogs: 0, ...(isClipboard ? { clipboardControls: 1 } : {}), ...(toast ? { toastCount: 1 } : {}) };
}
export function workflowPlan(h: Workflow) {
  let text = h.before + h.picked + h.after, selection = [h.before.length, h.before.length + h.picked.length];
  let surface = h.surface;
  const actions = h.operations.map(operation => {
    const range = workflowRange(text, selection, operation);
    const transition = operation.kind === 'full' && surface === 'composer';
    const action = { ...operation, range, transition };
    if (transition) surface = 'editor';
    const next = workflowStep(text, range, operation); text = next.value; selection = next.selection;
    return action;
  });
  return { h, text: h.before + h.picked + h.after, actions };
}
export function workflowModel(p: ReturnType<typeof workflowPlan>, trace: readonly Observation[] = []) {
  let text = p.text;
  return p.actions.map((action, index) => {
    const next = workflowStep(text, action.range, action, traceValue(trace, 'host' + index) as WorkflowHostInput | undefined); text = next.value;
    return next;
  });
}
export function workflowStates(p: ReturnType<typeof workflowPlan>) {
  const states = new Set([p.h.mobile ? 'mobile' : 'desktop', p.h.surface]);
  let text = p.text;
  for (const action of p.actions) {
    states.add(action.kind); states.add(action.activation);
    const premises = workflowHostPremises(action);
    if (premises.clipboard !== undefined) states.add('stableClipboardDelivery');
    if (premises.typed !== undefined) states.add('stableTypedDelivery');
    const next = workflowStep(text, action.range, action);
    if (next.sheet) states.add('sheet-' + next.sheet.reason);
    if (action.range[0] === action.range[1]) states.add('caret'); else states.add('selection');
    if (next.toast === 'That is not a URL.') states.add('rejectedTarget');
    if (next.defaultAllowed) states.add('nativeDefaultAllowed');
    if (action.kind === 'nativePaste' && rawText(action.raw) === '') states.add(action.range[0] === action.range[1] ? 'emptyNativePaste-caret' : 'emptyNativePaste-selection');
    if (next.defaultAllowed === false) states.add('pasteIntercepted');
    const target = action.kind === 'denied' ? rawText(action.typed) : rawText(action.raw);
    const clean = cleaned(target);
    if (clean?.removed && target.includes('#') && /\?(?:#|$)/.test(target.slice(target.indexOf('#')))) states.add('trackerFragmentBoundary-' + action.kind);
    text = next.value;
  }
  if (p.h.mobile && p.actions.some(a => a.transition) && p.actions.some(a => a.kind === 'paste')) states.add('mobilePasteTransition');
  if (p.h.mobile && p.actions.length > 1 && p.actions.some(a => a.kind === 'clipboard' && !recognized(rawText(a.raw)))) states.add('mobileClipboardFallback');
  return [...states];
}
