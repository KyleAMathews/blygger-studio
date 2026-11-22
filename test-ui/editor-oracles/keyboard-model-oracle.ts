/** Independent semantic histories/models; this module registers no tests. */
import fc from 'fast-check';
import { unit, type Edit, type Sample } from './document-oracle.ts';
import { emphasisEdit, linkEdit, row } from './inline-model-oracle.ts';
import { h as listHistory, item, resolve as listPlan, model as listModel } from './list-model-oracle.ts';

export const text = fc.string({ unit, maxLength: 32 });

export const mods = (mask: number) => ({ metaKey: !!(mask & 1), ctrlKey: !!(mask & 2), altKey: !!(mask & 4), shiftKey: !!(mask & 8) });

export const keys = ['b', 'B', 'i', 'I', 'k', 'K', 'x', 'Tab', 'Enter', 'constructor', 'toString', '__proto__', 'Unidentified', '', 'K', 'κ', 'Ｋ'];

export const keyArbitrary = fc.record({ key: fc.oneof(text, fc.constantFrom(...keys)), mask: fc.integer({ min: 0, max: 15 }), mac: fc.boolean() });

export type Key = { key: string; mask: number; mac: boolean };

export function chord(h: Key) {
  const formattingModifier = h.mac ? 1 : 2;
  const mapped = ([['b', 'B', 'bold'], ['i', 'I', 'italic'], ['k', 'K', 'link']] as const).find(([lower, upper]) => h.key === lower || h.key === upper)?.[2] ?? null;
  return {
    format: h.mask === formattingModifier ? mapped : null,
    structure: h.mask === 0 && h.key === 'Tab' ? 'indent' : h.mask === 8 && h.key === 'Tab' ? 'outdent' : null,
  };
}

export const keyCases = keys.flatMap(key => Array.from({ length: 16 }, (_, mask) => [false, true].map(mac => ({ key, mask, mac })))).flat();

export const editArbitrary = fc.oneof(
  fc.record({ prefix: text, selected: fc.oneof(text, fc.constant('')), suffix: text, insert: fc.oneof(text, fc.constant('')), a: fc.nat(100), b: fc.nat(100), native: fc.boolean() }),
  // The two endpoints vary separately. Selecting a base before its combining
  // mark differs from selecting the mark after its base; insert/delete differ too.
  fc.record({ prefix: fc.constantFrom('', 'a', '\ud83d', '👩'), selected: fc.constantFrom('a', '\u0301', '\ude00', '\u200d'), suffix: fc.constantFrom('\u0301b', '\ude00x', '\u200d💻x', 'x'), insert: fc.oneof(text, fc.constant('')), a: fc.nat(100), b: fc.nat(100), native: fc.boolean() }),
);

export const editBase = { prefix: 'a', selected: 'bc', suffix: 'd', insert: 'X', a: 1, b: 2, native: true };

export const editCases = { nativeInsert: editBase, nativeDelete: { ...editBase, insert: '' }, fallbackInsert: { ...editBase, native: false }, fallbackDelete: { ...editBase, insert: '', native: false }, cr: { ...editBase, insert: '\r' }, crlf: { ...editBase, insert: 'a\r\nb', native: false }, empty: { ...editBase, prefix: '', selected: '', suffix: '', insert: '' }, collapsedDelete: { ...editBase, prefix: 'a', selected: '', suffix: 'b', insert: '', a: 1, b: 1 }, collapsedFallback: { ...editBase, prefix: 'a', selected: '', suffix: 'b', insert: '', a: 1, b: 1, native: false } };

Object.assign(editCases, {
  combiningInterior: { ...editBase, prefix: ' ', selected: '', suffix: 'ꫫ', insert: 'X', a: 0, b: 0 },
  combiningBoundary: { ...editBase, prefix: ' ꫫ', selected: '', suffix: 'z', insert: 'X', a: 0, b: 0 },
  surrogateInterior: { ...editBase, prefix: '\ud83d', selected: '', suffix: '\ude00', insert: 'X', a: 0, b: 0 },
  zwjInterior: { ...editBase, prefix: '👩', selected: '\u200d', suffix: '💻', insert: 'X', a: 0, b: 0 },
  partialClusterDelete: { ...editBase, prefix: 'e', selected: '\u0301', suffix: 'x', insert: '', a: 0, b: 0 },
  baseBeforeCombiningDelete: { ...editBase, prefix: '', selected: 'a', suffix: '\u0301b', insert: '', a: 0, b: 0 },
  baseBeforeCombiningInsert: { ...editBase, prefix: '', selected: 'a', suffix: '\u0301b', insert: 'x', a: 0, b: 0 },
  markAfterBaseInsert: { ...editBase, prefix: 'a', selected: '\u0301', suffix: 'b', insert: 'x', a: 0, b: 0 },
});
export const editStates = (h: typeof editBase) => [h.native ? 'native' : 'fallback', h.insert ? 'insert' : 'delete', ...(h.insert.includes('\r') ? ['carriageReturn'] : []), ...(h.insert.includes('\r\n') ? ['crlf'] : []), ...(h.selected === 'a' && h.suffix.startsWith('\u0301') ? ['baseBeforeCombining'] : []), ...(h.prefix.endsWith('a') && h.selected.startsWith('\u0301') ? ['markAfterBase'] : [])];


export const platforms = [
  { name: 'MacIntel', mac: true }, { name: 'iPhone', mac: true }, { name: 'IPAD', mac: true },
  { name: 'Win32', mac: false }, { name: 'Linux x86_64', mac: false }, { name: '', mac: false },
];

export const handlerArbitrary = fc.record({
  key: fc.oneof(text, fc.constantFrom(...keys)), mask: fc.integer({ min: 0, max: 15 }), platform: fc.constantFrom(...platforms),
  readOnly: fc.boolean(), composing: fc.boolean(), prevented: fc.boolean(), native: fc.boolean(),
  content: fc.constantFrom('word', '- a\n- word', '- a\n    - word', '```\nword'),
  body: fc.string({ unit: fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz', 'α', '😀'), maxLength: 12 }),
  a: fc.nat(30), b: fc.nat(30),
});

export type Handler = Sample<typeof handlerArbitrary>;

export const handlerBase: Handler = { key: 'b', mask: 2, platform: platforms[3]!, readOnly: false, composing: false, prevented: false, native: true, content: 'word', body: 'word', a: 0, b: 4 };

export const handlerCases: Record<string, Handler> = {
  bold: handlerBase, caret: { ...handlerBase, a: 0, b: 0 }, partial: { ...handlerBase, a: 1, b: 3 }, fencedBreak: { ...handlerBase, key: 'Enter', mask: 8, content: '```\nword' }, proseBreak: { ...handlerBase, key: 'Enter', mask: 8, a: 2, b: 2 }, italic: { ...handlerBase, key: 'i' }, link: { ...handlerBase, key: 'k' },
  mac: { ...handlerBase, mask: 1, platform: platforms[0]! }, iphone: { ...handlerBase, mask: 1, platform: platforms[1]! }, ipad: { ...handlerBase, mask: 1, platform: platforms[2]! },
  readOnly: { ...handlerBase, readOnly: true }, composing: { ...handlerBase, composing: true }, prevented: { ...handlerBase, prevented: true },
  unknown: { ...handlerBase, key: 'x' }, inherited: { ...handlerBase, key: 'constructor' },
  blankTab: { ...handlerBase, key: 'Tab', mask: 0 },
  indent: { ...handlerBase, key: 'Tab', mask: 0, content: '- a\n- word' },
  outdent: { ...handlerBase, key: 'Tab', mask: 8, content: '- a\n    - word' },
  break: { ...handlerBase, key: 'Enter', mask: 8 }, fallback: { ...handlerBase, native: false },
};

export function handlerPlan(h: Handler) {
  const prefix = h.content.slice(0, -4), initial = prefix + h.body;
  const positions = [h.a % (h.body.length + 1), h.b % (h.body.length + 1)].sort((a, b) => a - b);
  return { h, initial, from: prefix.length + positions[0]!, to: prefix.length + positions[1]! };
}

// Command judgment belongs in the model. The plan contains only the concrete
// event, initial textarea and selection the driver will supply.
export function handlerEdit(p: ReturnType<typeof handlerPlan>): Edit | null {
  const { h, from, to, initial } = p;
  const command = chord({ key: h.key, mask: h.mask, mac: h.platform.mac });
  if (h.readOnly || h.composing || h.prevented) return null;
  if (command.format) {
    const selected = initial.slice(from, to);
    if (command.format === 'link') return linkEdit({ text: initial, from, to, h: { prefix: initial.slice(0, from), picked: selected, suffix: initial.slice(to) } });
    return emphasisEdit({ text: initial, from, to, h: { kind: command.format as 'bold' | 'italic', row: row({ body: selected }), outsideLeft: 0, outsideRight: 0, before: '', after: '' } });
  }
  if (command.structure === 'indent' || command.structure === 'outdent') {
    if (!h.content.startsWith('- a')) return null;
    const history = listHistory({ parent: 'bullet', rows: [item('-', h.content.includes('    ') ? '    ' : '', h.body)], after: '', out: command.structure === 'outdent', mode: from === to ? 'caret' : 'range', a: from - 4, b: to - 4 });
    return listModel(listPlan(history)).edit;
  }
  return null;
}

export function handlerStates(p: ReturnType<typeof handlerPlan>) {
  const h = p.h, command = chord({ key: h.key, mask: h.mask, mac: h.platform.mac });
  return [h.platform.mac ? 'mac' : 'otherPlatform', p.from === p.to ? 'caret' : 'selection',
  ...(h.readOnly ? ['readOnly'] : []), ...(h.composing ? ['composing'] : []), ...(h.prevented ? ['prevented'] : []),
  ...(!h.readOnly && !h.composing && !h.prevented ? [command.format || command.structure || 'unknown'] : []),
  h.native ? 'native' : 'fallback', ...(h.content.startsWith('```') ? ['fenced'] : [])];
}
