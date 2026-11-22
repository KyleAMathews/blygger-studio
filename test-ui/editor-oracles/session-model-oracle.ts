/** Independent action histories for Studio's real editing surfaces. */
import fc from 'fast-check';
import { apply, type Edit, type Sample } from './document-oracle.ts';
import { emphasisEdit, linkEdit, row } from './inline-model-oracle.ts';

const word = fc.string({ unit: fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 'α', '😀', ',', ';', '=', '.'), minLength: 1, maxLength: 24 });
const prose = fc.array(word, { minLength: 1, maxLength: 8 }).map(words => words.join(' '), text => {
  if (typeof text !== 'string') throw new Error('Expected prose');
  return text.split(' ');
});
// Native newline preview histories start every word with a letter/emoji so
// either side of a split stays prose, including after numeric/punctuation tails.
// This new branch leaves the entire old session grammar unchanged.
const newlineWord = fc.tuple(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', 'α', '😀'),
  fc.string({ unit: fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 'α', '😀', ',', ';', '.'), maxLength: 22 }),
).map(([first, rest]) => first + rest, text => {
  if (typeof text !== 'string' || !text) throw new Error('Expected ordinary newline word');
  const first = [...text][0]!; return [first, text.slice(first.length)];
});
const newlineProse = fc.array(newlineWord, { minLength: 1, maxLength: 8 }).map(words => words.join(' '), text => {
  if (typeof text !== 'string') throw new Error('Expected ordinary newline prose');
  return text.split(' ');
});
const sessionShape = {
  surface: fc.constantFrom('composer', 'editor', 'quick', 'editorToQuick'), mobile: fc.boolean(), native: fc.boolean(),
  journey: fc.constantFrom('inline', 'intraWord', 'emptyEmphasis', 'list', 'verse', 'toolbar', 'tab', 'paste', 'mixedInline', 'branchHistory'),
  before: prose, body: prose, after: prose, sibling: prose, code: prose, linkBody: prose,
  commands: fc.array(fc.constantFrom('bold' as const, 'italic' as const), { minLength: 1, maxLength: 8 }),
};
const newlineSessionShape = {
  ...sessionShape, surface: fc.constantFrom('composer', 'editor', 'quick'), journey: fc.constant('newline'),
  before: newlineProse, body: newlineProse, after: newlineProse, sibling: newlineProse,
  newlineKey: fc.constantFrom('Enter', 'Shift+Enter'), newlinePosition: fc.constantFrom('caret', 'selection', 'end'), newlinePlatform: fc.constantFrom('host', 'IPAD'),
};
const legacySessionArbitrary = fc.record(sessionShape);
const receiving = fc.constant('browserLoginLoadedKeys' as const);
export const sessionArbitrary = fc.oneof(legacySessionArbitrary, fc.record({
  ...sessionShape, journey: fc.constantFrom('inline', 'intraWord'), targetInput: fc.constant('perCharacter' as const),
}), fc.record(newlineSessionShape), fc.record({ ...newlineSessionShape, newlineDirect: fc.constant(true) }), fc.record({
  ...sessionShape, surface: fc.constant('editor'), journey: fc.constant('verse'), native: fc.constant(true),
  before: newlineProse, body: newlineProse, after: newlineProse, sibling: newlineProse,
  hardBreakHistory: fc.constant(true), hardBreakActivation: fc.constantFrom('click', 'Enter', 'Space'),
}), fc.oneof(fc.record({
  ...sessionShape, surface: fc.constant('editor'), native: fc.constant(true), journey: fc.constantFrom('list', 'tab', 'toolbar'), receiving,
}), fc.record({
  ...newlineSessionShape, surface: fc.constant('editor'), native: fc.constant(true), newlineDirect: fc.constant(true), newlinePlatform: fc.constant('host'), receiving,
})));
export type Session = Sample<typeof sessionArbitrary>;
export const baseSession: Session = { surface: 'composer', mobile: false, native: true, journey: 'inline', before: 'one', body: 'two', after: 'three', sibling: 'pears', code: 'let a = 1;', linkBody: 'this', commands: ['bold', 'italic', 'bold', 'italic'] };
export const sessionCases: Record<string, Session> = {};
for (const surface of ['composer', 'editor', 'quick', 'editorToQuick'] as const) for (const mobile of [false, true]) {
  sessionCases[`${surface}-${mobile ? 'mobile' : 'desktop'}`] = { ...baseSession, surface, mobile, before: 'one', after: 'three', commands: surface === 'editor' || surface === 'editorToQuick' ? ['italic', 'italic'] : surface === 'quick' ? ['bold'] : baseSession.commands };
  sessionCases[`${surface}-fallback-${mobile ? 'mobile' : 'desktop'}`] = { ...baseSession, surface, mobile, native: false };
}
for (const journey of ['list', 'verse', 'toolbar', 'tab', 'paste'] as const) for (const mobile of [false, true]) {
  sessionCases[`${journey}-${mobile ? 'mobile' : 'desktop'}`] = { ...baseSession, surface: 'editor', journey, mobile, before: journey === 'verse' ? 'Tyger Tyger, burning bright,' : journey === 'tab' ? 'Plain' : 'fruit', body: journey === 'verse' ? 'In the forests of the night;' : journey === 'tab' ? 'prose.' : 'apples' };
}
for (const mobile of [false, true]) for (const command of ['bold', 'italic'] as const) sessionCases[`empty-${command}-${mobile ? 'mobile' : 'desktop'}`] = { ...baseSession, surface: 'editor', journey: 'emptyEmphasis', mobile, commands: [command] };
for (const mobile of [false, true]) for (const command of ['bold', 'italic'] as const) sessionCases[`intra-word-${command}-${mobile ? 'mobile' : 'desktop'}`] = { ...baseSession, surface: 'editor', journey: 'intraWord', mobile, commands: [command] };
for (const journey of ['mixedInline', 'branchHistory'] as const) for (const mobile of [false, true]) for (const native of [false, true]) {
  sessionCases[`${journey}-${native ? 'native' : 'fallback'}-${mobile ? 'mobile' : 'desktop'}`] = { ...baseSession, surface: 'editor', journey, mobile, native };
}
// Preserve the original per-character link-target receiving path alongside input-only histories.
sessionCases['composer-character-target-desktop'] = { ...sessionCases['composer-desktop']!, journey: 'inline', targetInput: 'perCharacter' };
// Native newline is a separate intent from the hard-break toolbar. These four
// profiles per real surface retain both keys, ranges, viewports and native/refusal
// hosts without multiplying every independent axis in the constructed roster.
for (const surface of ['composer', 'editor', 'quick'] as const) for (const profile of [0, 1, 2, 3]) {
  sessionCases[`newline-${surface}-${profile}`] = { ...baseSession, surface, journey: 'newline',
    mobile: profile % 2 === 1, native: profile % 2 === 0,
    newlineKey: profile < 2 ? 'Enter' : 'Shift+Enter', newlinePosition: profile === 1 || profile === 2 ? 'selection' : 'caret', newlinePlatform: profile % 2 === 0 ? 'IPAD' : 'host' };
}
// Exact new-main punctuation/continuation source, retained with roundtrip
// histories and the direct key→typing counterparts constructed below.
sessionCases['newline-main-shift-enter'] = { ...baseSession, surface: 'editor', journey: 'newline',
  before: 'Tyger Tyger, burning bright.', sibling: 'In the forests of the night;',
  newlineKey: 'Shift+Enter', newlinePosition: 'end', newlinePlatform: 'host' };
sessionCases['newline-ipad-shift-enter-full-stop'] = { ...sessionCases['newline-main-shift-enter']!,
  mobile: true, newlinePlatform: 'IPAD' };
for (const name of ['newline-main-shift-enter', 'newline-ipad-shift-enter-full-stop']) {
  const history = sessionCases[name]!;
  if (!('newlineKey' in history)) throw new Error('Expected native newline history');
  sessionCases[name + '-direct'] = { ...history, newlineDirect: true };
}

for (const activation of ['Enter', 'Space'] as const) sessionCases[`hard-break-selection-history-${activation}`] = {
  ...baseSession, surface: 'editor', journey: 'verse', native: true, mobile: activation === 'Space',
  hardBreakHistory: true, hardBreakActivation: activation,
};
// The retained structural receiving lane changes setup/delivery, not editing semantics.
for (const journey of ['list', 'tab', 'toolbar'] as const) {
  sessionCases[`receiving-${journey}-desktop`] = { ...baseSession, surface: 'editor', journey, native: true, mobile: false,
    before: journey === 'tab' ? 'Plain' : 'fruit', body: journey === 'tab' ? 'prose.' : 'apples', receiving: 'browserLoginLoadedKeys' };
}
sessionCases['receiving-newline-full-stop-desktop'] = { ...baseSession, surface: 'editor', journey: 'newline', native: true, mobile: false,
  before: 'Tyger Tyger, burning bright.', sibling: 'In the forests of the night;', newlineKey: 'Shift+Enter', newlinePosition: 'end', newlinePlatform: 'host', newlineDirect: true, receiving: 'browserLoginLoadedKeys' };
sessionCases['receiving-toolbar-mobile'] = { ...baseSession, surface: 'editor', journey: 'toolbar', native: true, mobile: true, before: 'fruit', body: 'apples', receiving: 'browserLoginLoadedKeys' };
sessionCases['receiving-list-unicode-lf'] = { ...sessionCases['receiving-list-desktop']!, sibling: 'α😀' };
sessionCases['receiving-toolbar-unicode-code'] = { ...sessionCases['receiving-toolbar-mobile']!, code: 'let α = 😀;' };
export const usesStructuralReceiving = (h: Session) => 'receiving' in h && h.receiving === 'browserLoginLoadedKeys';
export const sessionStates = (h: Session) => [h.journey, h.mobile ? 'mobile' : 'desktop', h.native ? 'native' : 'fallback',
  ...(usesStructuralReceiving(h) ? ['browserLoginLoadedKeys', 'loadedStructuralSource', ...(h.journey === 'tab' ? [] : ['structuralKeyTyping'])] : []),
  ...('hardBreakHistory' in h ? ['toolbarBreakUndo', 'toolbarBreakSelection'] : []),
  ...('targetInput' in h ? ['keyTypedLinkTarget'] : []),
  ...(h.journey === 'mixedInline' && h.commands.length > 1 ? ['interleavedTyping'] : []),
  ...('newlineDirect' in h ? ['directNativeNewlineContinuation'] : []),
  ...(h.journey === 'newline' && 'newlineKey' in h ? [h.newlineKey === 'Enter' ? 'nativeEnter' : 'nativeShiftEnter', h.newlinePosition === 'selection' ? 'newlineSelection' : 'newlineCaret', h.newlinePosition === 'end' ? 'newlineAtEnd' : 'newlineInterior', ...(h.newlinePlatform === 'IPAD' ? ['simulatedIPAD'] : [])] : []),
  ...(h.journey === 'inline' || h.journey === 'newline' ? h.surface === 'editorToQuick' ? ['editor', 'quick', 'sameItemTransition', 'loadedWholeSource'] : [h.surface, ...(h.surface !== 'composer' ? ['loadedWholeSource'] : []), ...(h.journey === 'inline' && h.surface === 'composer' && h.native ? ['undoRerender'] : [])] : ['editor'])];
export type Step = { checkpoint: string; value: string; selection?: number[]; focused?: boolean; nested?: string[]; paragraphs?: number; breaks?: number; toast?: boolean; state?: string; platform?: string; keyInput?: { key: string; shiftKey: boolean; ctrlKey: boolean; altKey: boolean; metaKey: boolean; trusted: boolean; target: boolean; defaultPrevented: boolean } };
// intent names the editing action; key/tool names only how the browser delivers
// it. Journey and checkpoint names never select an expected answer.
type Intent = 'bold' | 'italic' | 'link' | 'indent' | 'outdent' | 'newline' | 'undo' | 'redo' | 'focusNext';
export type Action =
  | { kind: 'loaded'; checkpoint: string; fields: (keyof Step)[] }
  | { kind: 'quick'; checkpoint: string; fields: (keyof Step)[] }
  | { kind: 'fill'; text: string; from: number; to: number; stars: number }
  | { kind: 'key'; key: string; intent: Intent; checkpoint: string; fields: (keyof Step)[] }
  | { kind: 'type'; text: string; checkpoint: string; fields: (keyof Step)[]; delivery?: 'perCharacter' | 'structuralKeys' }
  | { kind: 'toolbar'; tool: 'indent' | 'outdent' | 'break' | 'code' | 'formula'; activation?: 'click' | 'Enter' | 'Space'; checkpoint: string; fields: (keyof Step)[] }
  | { kind: 'state'; checkpoint: string; fields: (keyof Step)[] }
  | { kind: 'select'; from: number; to: number }
  | { kind: 'paste'; text: string; checkpoint: string; fields: (keyof Step)[] };
export function sessionPlan(h: Session) {
  const actions: Action[] = [];
  const surface = h.journey === 'inline' || h.journey === 'newline' ? h.surface === 'editorToQuick' ? 'editor' : h.surface : 'editor';
  let initialSource = surface === 'composer' ? '' : h.body;
  const fields: (keyof Step)[] = ['value', 'selection', 'focused'];
  const fill = (text: string, from = text.length, to = from, stars = 0) => actions.push({ kind: 'fill', text, from, to, stars });
  const begin = (text: string, from = text.length, to = from, stars = 0) => {
    if (!usesStructuralReceiving(h)) { fill(text, from, to, stars); return; }
    initialSource = text;
    actions.push({ kind: 'loaded', checkpoint: 'loadedStructural', fields: ['value'] }, { kind: 'select', from, to });
  };
  const structuralDelivery = usesStructuralReceiving(h) ? { delivery: 'structuralKeys' as const } : {};
  const keys: Record<Intent, string> = { bold: 'ControlOrMeta+b', italic: 'ControlOrMeta+i', link: 'ControlOrMeta+k', indent: 'Tab', outdent: 'Shift+Tab', newline: 'Shift+Enter', undo: 'ControlOrMeta+z', redo: 'ControlOrMeta+Shift+z', focusNext: 'Tab' };
  const key = (intent: Intent, checkpoint: string, observed = fields) => actions.push({ kind: 'key', key: keys[intent], intent, checkpoint, fields: observed });
  if (h.journey === 'newline' && 'newlineKey' in h) {
    const prefix = h.before + ' ', source = h.newlinePosition === 'end' ? h.before : prefix + h.body + ' ' + h.after;
    const from = h.newlinePosition === 'end' ? source.length : prefix.length, to = h.newlinePosition === 'selection' ? from + h.body.length : from;
    begin(source, from, to);
    const preview: (keyof Step)[] = h.surface === 'editor' ? ['paragraphs', 'breaks'] : [];
    actions.push({ kind: 'key', key: h.newlineKey, intent: 'newline', checkpoint: 'newline', fields: [...fields, 'keyInput', ...(h.newlinePlatform === 'IPAD' ? ['platform' as const] : []), ...preview] });
    actions.push({ kind: 'type', text: h.sibling, checkpoint: 'newlineContinuation', fields: [...fields, ...preview], ...structuralDelivery });
  } else if (h.journey === 'mixedInline' || h.journey === 'branchHistory') {
    const prefix = h.before + ' ';
    fill(prefix + h.body + ' ' + h.after, prefix.length, prefix.length + h.body.length);
    // The bookmark is an input selection of the semantic content, excluding
    // its external wrappers. It is never found by scanning production output.
    let wrappers = 0;
    const wrapperHistory = [0];
    for (const [i, command] of h.commands.entries()) {
      key(command, 'mixedFormat' + i);
      wrappers += command === 'bold' ? wrappers >= 2 ? -2 : 2 : wrappers % 2 ? -1 : 1;
      wrapperHistory.push(wrappers);
      if (h.journey === 'mixedInline' && i + 1 < h.commands.length) {
        const text = [h.sibling, h.linkBody, h.before][i % 3]!;
        actions.push({ kind: 'type', text, checkpoint: 'replace' + i, fields });
        actions.push({ kind: 'select', from: prefix.length + wrappers, to: prefix.length + wrappers + text.length });
      }
    }
    if (h.journey === 'branchHistory') {
      if (h.native) { key('undo', 'branchUndo', ['value']); wrappers = wrapperHistory.at(-2)!; }
      actions.push({ kind: 'select', from: prefix.length + wrappers, to: prefix.length + wrappers + h.body.length });
      actions.push({ kind: 'type', text: h.sibling, checkpoint: 'branchReplace', fields });
      actions.push({ kind: 'select', from: prefix.length + wrappers, to: prefix.length + wrappers + h.sibling.length });
      key(h.commands[0]!, 'branchFormat');
    }
  } else if (h.journey === 'inline' || h.journey === 'intraWord') {
    if (h.journey === 'intraWord') {
      const prefix = h.before + ' x', suffix = 'y ' + h.after;
      fill(prefix + h.body + suffix, prefix.length, prefix.length + h.body.length);
    } else if (h.surface === 'composer') {
      const prefix = h.before ? h.before + ' ' : '', suffix = h.after ? ' ' + h.after : '';
      fill(prefix + h.body + suffix, prefix.length, prefix.length + h.body.length);
    } else actions.push({ kind: 'loaded', checkpoint: 'loaded', fields });
    const commands = h.journey === 'inline' && h.surface === 'editorToQuick' ? ['italic', 'italic'] as const : h.commands;
    commands.forEach((command, i) => key(command, 'format' + i));
    if (h.native) {
      key('undo', 'undo', ['value']);
      if (h.journey === 'inline' && h.surface === 'composer') actions.push({ kind: 'state', checkpoint: 'undoneState', fields: ['value'] });
      key('redo', 'redo', ['value']);
    } else if (h.journey === 'inline' && h.surface === 'composer') actions.push({ kind: 'state', checkpoint: 'state', fields: ['value'] });
    if (h.journey === 'inline' && h.surface === 'editorToQuick') {
      actions.push({ kind: 'quick', checkpoint: 'quickLoaded', fields });
      key('bold', 'quickBold');
    }
    const linkSource = 'see ' + h.linkBody;
    fill(linkSource, 4, linkSource.length);
    key('link', 'link');
    // Target typing stays terminal: this adds key delivery, not a typing undo-grouping promise.
    actions.push({ kind: 'type', text: 'https://x.example/', checkpoint: 'target', fields, ...('targetInput' in h ? { delivery: 'perCharacter' as const } : {}) });
  } else if (h.journey === 'emptyEmphasis') {
    const command = h.commands[0]!, width = command === 'bold' ? 2 : 1;
    const prefix = h.before + ' ', source = prefix + '*'.repeat(2 * width) + ' ' + h.after;
    fill(source, prefix.length + width, prefix.length + width, width);
    key(command, 'removeEmpty');
    if (h.native) { key('undo', 'undo', ['value']); key('redo', 'redo', ['value']); }
  } else if (h.journey === 'list') {
    begin('- ' + h.before + '\n- ' + h.body);
    key('indent', 'indent');
    actions.push({ kind: 'type', text: '\n    - ' + h.sibling, checkpoint: 'sibling', fields: ['value', 'nested'], ...structuralDelivery });
    key('outdent', 'outdent');
    if (h.native) key('undo', 'undo', ['value']);
  } else if (h.journey === 'verse' && 'hardBreakHistory' in h) {
    const prefix = h.before + ' ', observed: (keyof Step)[] = [...fields, 'paragraphs', 'breaks'];
    fill(prefix + h.body + ' ' + h.after, prefix.length, prefix.length + h.body.length);
    actions.push({ kind: 'toolbar', tool: 'break', activation: h.hardBreakActivation, checkpoint: 'selectedBreak', fields: observed });
    key('undo', 'breakUndo', ['value', 'paragraphs', 'breaks']); key('redo', 'breakRedo', ['value', 'paragraphs', 'breaks']);
    actions.push({ kind: 'type', text: h.sibling, checkpoint: 'breakContinuation', fields: observed });
  } else if (h.journey === 'verse') {
    fill(h.before); actions.push({ kind: 'toolbar', tool: 'break', checkpoint: 'break', fields });
    actions.push({ kind: 'type', text: h.body, checkpoint: 'verse', fields: ['value', 'paragraphs', 'breaks'] });
  } else if (h.journey === 'tab') {
    begin(h.before + ' ' + h.body); key('focusNext', 'navigate', ['value', 'focused']);
  } else if (h.journey === 'toolbar') {
    begin('- ' + h.before + '\n- ' + h.body);
    for (const tool of ['indent', 'outdent', 'break'] as const) actions.push({ kind: 'toolbar', tool, checkpoint: tool, fields });
    actions.push({ kind: 'type', text: 'and ' + h.sibling, checkpoint: 'continuation', fields, ...structuralDelivery });
    actions.push({ kind: 'toolbar', tool: 'code', checkpoint: 'code', fields });
    actions.push({ kind: 'type', text: h.code, checkpoint: 'codeTyped', fields, ...structuralDelivery });
    actions.push({ kind: 'select', from: 3, to: 3 }, { kind: 'toolbar', tool: 'indent', checkpoint: 'decline', fields: ['value', 'toast'] });
    fill(h.body, 0, h.body.length);
    actions.push({ kind: 'toolbar', tool: 'formula', checkpoint: 'formula', fields });
  } else {
    const source = h.before + ' ' + h.body + ' ' + h.after;
    fill(source, h.before.length + 1, h.before.length + 1 + h.body.length);
    actions.push({ kind: 'paste', text: 'https://x.example/', checkpoint: 'paste', fields: ['value'] });
  }
  return { h, initialSource, actions, surface };
}

// The state is the document plus selection that the next user action consumes.
// Emphasis tracks semantic delimiter counts, not a scan of production output.
// Structural expectations describe the list tree and literal prose being edited.
export function sessionModel(p: ReturnType<typeof sessionPlan>): Step[] {
  const { h } = p;
  let value = p.initialSource, selection = p.surface === 'composer' ? [0, 0] : [0, p.initialSource.length], stars = 0, body = h.body, renderedBreaks = 0;
  const undo: { value: string; selection: number[]; stars: number; body: string; renderedBreaks: number }[] = [], redo: typeof undo = [];
  const snapshots: Step[] = [];
  const edit = (change: Edit) => {
    undo.push({ value, selection: [...selection], stars, body, renderedBreaks }); redo.length = 0;
    value = apply(value, change); selection = [change.start, change.end];
  };
  for (const action of p.actions) {
    if (action.kind === 'fill') { value = action.text; selection = [action.from, action.to]; body = value.slice(action.from, action.to); stars = action.stars; renderedBreaks = 0; undo.length = 0; redo.length = 0; continue; }
    if (action.kind === 'select') { selection = [action.from, action.to]; body = value.slice(action.from, action.to); continue; }
    let focused = true, toast = false;
    if (action.kind === 'type') {
      const from = selection[0]!, to = selection[1]!;
      edit({ from, to, insert: action.text, start: from + action.text.length, end: from + action.text.length });
    } else if (action.kind === 'paste') {
      const from = selection[0]!, to = selection[1]!, insert = `[${value.slice(from, to)}](${action.text})`;
      edit({ from, to, insert, start: from + insert.length, end: from + insert.length });
    } else if (action.kind === 'key' && (action.intent === 'undo' || action.intent === 'redo')) {
      const origin = action.intent === 'undo' ? undo : redo, target = action.intent === 'undo' ? redo : undo;
      const prior = origin.pop();
      if (prior) { target.push({ value, selection: [...selection], stars, body, renderedBreaks }); ({ value, selection, stars, body, renderedBreaks } = prior); }
    } else if (action.kind === 'key' && (action.intent === 'bold' || action.intent === 'italic')) {
      const kind = action.intent, from = selection[0]!, to = selection[1]!;
      edit(emphasisEdit({ text: value, from, to, h: { kind, row: row({ body }), outsideLeft: stars, outsideRight: stars, before: '', after: '' } }));
      const width = kind === 'bold' ? 2 : 1;
      stars += kind === 'bold' ? stars >= 2 ? -width : width : stars % 2 ? -width : width;
    } else if (action.kind === 'key' && action.intent === 'link') {
      const from = selection[0]!, to = selection[1]!;
      edit(linkEdit({ text: value, from, to, h: { prefix: value.slice(0, from), picked: value.slice(from, to), suffix: value.slice(to) } }));
    } else if (action.kind === 'quick') {
      selection = [0, value.length]; body = value; stars = 0;
    } else if (action.kind !== 'state' && action.kind !== 'loaded') {
      const command = action.kind === 'toolbar' ? action.tool : action.intent;
      if (command === 'focusNext') focused = false;
      else if (command === 'indent' || command === 'outdent') {
        // This grammar edits a hyphen child, or the first item (no parent).
        // The semantic boundary is its line, never the checkpoint's name.
        const from = value.lastIndexOf('\n', selection[0]! - 1) + 1;
        if (!from && command === 'indent') toast = action.kind === 'toolbar';
        else {
          const to = value.indexOf('\n', from), end = to === -1 ? value.length : to;
          const original = value.slice(from, end), out = command === 'outdent';
          const insert = out ? original.slice(4) : '    ' + original;
          const caret = selection[0]! + (out ? -4 : 4);
          edit({ from, to: end, insert, start: caret, end: caret });
        }
      } else if (command === 'break' || command === 'newline') {
        const from = selection[0]!, insert = command === 'newline' ? '\n' : '\\\n';
        edit({ from, to: selection[1]!, insert, start: from + insert.length, end: from + insert.length });
        if (command === 'break') renderedBreaks += 1;
      } else if (command === 'code') {
        const from = selection[0]!, insert = '\n\n```\n\n```';
        edit({ from, to: selection[1]!, insert, start: from + 6, end: from + 6 });
      } else if (command === 'formula') {
        edit({ from: 0, to: value.length, insert: '$' + value + '$', start: 1, end: value.length + 1 });
      }
    }
    const full: Step = { checkpoint: action.checkpoint, value, selection: [...selection], focused, toast, nested: [h.body, h.sibling], paragraphs: 1, breaks: renderedBreaks, platform: 'IPAD',
      ...(action.kind === 'key' && action.intent === 'newline' ? { keyInput: { key: 'Enter', shiftKey: action.key === 'Shift+Enter', ctrlKey: false, altKey: false, metaKey: false, trusted: true, target: true, defaultPrevented: false } } : {}) };
    snapshots.push(Object.fromEntries([['checkpoint', action.checkpoint], ...action.fields.map(field => [field, full[field]])]) as Step);
  }
  return snapshots;
}
