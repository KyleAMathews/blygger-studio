/** Independent semantic histories/models; this module registers no tests. */
import fc from 'fast-check';
import { unit } from './document-oracle.ts';


export type History = { before: string; picked: string; after: string };

export type Plan = History & { text: string; from: number; to: number };

export const prose = fc.string({ unit: fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 'α', '😀'), minLength: 1, maxLength: 24 });

export const beforeProse = fc.oneof(fc.constant(''), fc.tuple(prose, fc.integer({ min: 0, max: 4 })).map(([s, n]) => s + '\n'.repeat(n), s => { if (typeof s !== 'string') throw new Error('Expected prose'); return [s.replace(/\n+$/, ''), /\n*$/.exec(s)![0].length]; }));

export const afterProse = fc.oneof(fc.constant(''), fc.tuple(prose, fc.integer({ min: 0, max: 4 })).map(([s, n]) => '\n'.repeat(n) + s, s => { if (typeof s !== 'string') throw new Error('Expected prose'); return [s.replace(/^\n+/, ''), /^\n*/.exec(s)![0].length]; }));

export const arbitrary = fc.record({ before: beforeProse, picked: fc.string({ unit, maxLength: 96 }), after: afterProse });


// These states describe input boundaries, not inferred production branches.
export const examples: Record<string, History> = {
  plain: { before: 'p', picked: 'x', after: 'q' },
  empty: { before: '', picked: '', after: '' },
  fence: { before: 'p', picked: 'a\n```\nb', after: 'q' },
  longerFence: { before: 'p', picked: 'a\n   ``````\nb', after: 'q' },
  trailingLf: { before: 'p', picked: 'x\n', after: 'q' },
  trailingBlank: { before: 'p', picked: 'x\n\n', after: 'q' },
  unicode: { before: 'α😀', picked: 'α😀\ud800\0\r\nx', after: 'α😀' },
  isolatedHigh: { before: 'p', picked: '\ud800', after: 'q' },
  isolatedLow: { before: 'p', picked: '\udfff', after: 'q' },
  validPair: { before: 'p', picked: '😀', after: 'q' },
  leftStart: { before: '', picked: 'x', after: 'q' },
  leftNewline: { before: 'p\n', picked: 'x', after: 'q' },
  leftBlank: { before: 'p\n\n', picked: 'x', after: 'q' },
  leftExtraBlank: { before: 'p\n\n\n', picked: 'x', after: 'q' },
  rightEnd: { before: 'p', picked: 'x', after: '' },
  rightNewline: { before: 'p', picked: 'x', after: '\nq' },
  rightBlank: { before: 'p', picked: 'x', after: '\n\nq' },
  rightExtraBlank: { before: 'p', picked: 'x', after: '\n\n\nq' },
};

export const resolve = (history: History): Plan => ({
  ...history, text: history.before + history.picked + history.after,
  from: history.before.length, to: history.before.length + history.picked.length,
});

export const classify = (h: History) => [
  h.picked ? 'selected' : 'empty',
  ...(/`{3}/.test(h.picked) ? ['fence'] : []),
  ...(h.picked.endsWith('\n') ? [h.picked.endsWith('\n\n') ? 'trailingBlank' : 'trailingLf'] : []),
  ...(h.picked.includes('\0') || /[\ud800-\udfff]/.test(h.picked) ? ['unicodeControl'] : []),
  !h.before ? 'leftStart' : h.before.endsWith('\n\n\n') ? 'leftExtraBlank' : h.before.endsWith('\n\n') ? 'leftBlank' : h.before.endsWith('\n') ? 'leftNewline' : 'leftProse',
  !h.after ? 'rightEnd' : h.after.startsWith('\n\n\n') ? 'rightExtraBlank' : h.after.startsWith('\n\n') ? 'rightBlank' : h.after.startsWith('\n') ? 'rightNewline' : 'rightProse',
];

// Reconstruct the six old source examples, alongside generalized boundaries.
Object.assign(examples, {
  oldText: { before: 'text', picked: '', after: '' },
  oldTextLf: { before: 'text\n', picked: '', after: '' },
  oldBothSides: { before: 'text\n\n', picked: '', after: '\n\nmore' },
  oldSelectedCode: { before: '', picked: 'let a = 1;\nlet b = 2;', after: '' },
  oldTrailingLf: { before: 'before\n', picked: 'code\n', after: 'after' },
});

export const histories = {
  arbitrary, runs: 100, fixedSeeds: [20261118], states: [...new Set(Object.values(examples).flatMap(classify))],
  constructed: Object.entries(examples).map(([name, history]) => ({ name, enters: classify(history), build: () => ({ ...history }) })),
};

export const reached = (plan: Plan) => classify(plan);


// A literal block's answer comes from its input, not from a second formatter.
export const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function model(plan: Plan) {
  const body = plan.picked.endsWith('\n') ? plan.picked.slice(0, -1) : plan.picked;
  const code = (body + '\n').replace(/\r\n?/g, '\n').replace(/\0/g, '\ufffd');
  const paragraph = (text: string) => text.trim() ? `<p>${escape(text.trim())}</p>\n` : '';
  // Count the missing newlines at each boundary; do not construct a wrapper.
  const padding = (text: string, adjacentNewlines: number) => '\n'.repeat(text ? Math.max(0, 2 - adjacentNewlines) : 0);
  return {
    html: paragraph(plan.before) + `<pre><code>${escape(code)}</code></pre>\n` + paragraph(plan.after),
    context: {
      before: plan.before, after: plan.after,
      beforeBlock: plan.before + padding(plan.before, /\n*$/.exec(plan.before)![0].length),
      afterBlock: padding(plan.after, /^\n*/.exec(plan.after)![0].length) + plan.after,
    },
    selection: { text: body, afterNewline: true, beforeNewline: true, bodyStart: 0, bodyEnd: body.length },
    // Preserve the old exact default serialization when no delimiter can collide.
    defaultSource: plan.picked.includes('`') ? undefined :
      plan.before + padding(plan.before, /\n*$/.exec(plan.before)![0].length) +
      '```\n' + body + '\n```' + padding(plan.after, /^\n*/.exec(plan.after)![0].length) + plan.after,
  };
}
