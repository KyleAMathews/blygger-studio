/**
 * This oracle owns the hard-break command's insertion, text preservation, and final caret
 * through src/ui/format-shortcuts.ts#breakEdit and its fenced-code detection.
 * It checks the returned edit and the complete source after applying it.
 *
 * breakEdit('ab', 1, 1)         // → a hard break between a and b
 * breakEdit('a\\\\b', 3, 3)     // → a literal backslash followed by a hard break
 * breakEdit('```\na', 5, 5)    // → an ordinary newline inside code
 * breakEdit('', 0, 0)          // → an ordinary newline on an empty line
 *
 * Backslashes come in escaped pairs. A prose hard break needs one additional
 * unpaired backslash; an existing unpaired one already supplies it. A fenced
 * line and a blank line need only a newline. Closing a fence returns the caret
 * to prose only when its marker matches, it is long enough, and only spaces
 * or tabs follow it.
 *
 * For every edit, a nonempty prose line gets a hard break, while a blank line
 * or a line inside a fenced block gets an ordinary newline; text outside the
 * selection stays unchanged and the caret lands after the insertion. The
 * Shift+Enter examples in test-ui/format-shortcuts.test.ts establish those
 * cases. Decision by Kyle Mathews (GitHub KyleAMathews), 2026-11-18: even
 * backslash runs must also produce a hard break; protect the full behavior.
 * Decision by Kyle Mathews (GitHub KyleAMathews), 2026-11-21: follow main;
 * these breakEdit laws now belong to the hard-break toolbar, while native
 * Enter/Shift+Enter insert ordinary newlines. Historical shortcut evidence below
 * predates that approved remapping; no hard-break command behavior is removed.
 *
 * The model counts literal backslash pairs from generated inputs. Its fence
 * envelope is declarative: an optional opener and an optional candidate
 * closer, with a different marker inserted as a decoy. It does not scan source
 * or call production's fence classifier. Constructed histories reach both
 * markers, closing-length boundaries, blank lines, selections, and backslash
 * parity. A parent envelope also constructs quote/list prefixes and the point
 * where a closed fence or ended parent returns to prose; it never inserts a
 * continuation prefix. The receiving mixed model uses an independent prefix
 * parser for those same inputs. Nine original source histories also fix the complete preceding source,
 * including document start and existing blank lines, with the same declarative
 * line/fence annotations. A planted wrong insertion must fail on a clean prose history.
 *
 * Bounds are eight opening markers, nine closing markers, twelve backslashes,
 * and sixteen UTF-16 units in selected/suffix text. The envelope has at most
 * one real opening fence. Container histories add one list, zero to two quote
 * levels, relative indentation zero to three, eight-character words and a
 * sixty-four-unit suffix. Indented code and arbitrary container documents are
 * not established. Invalid root opening info uses the property below.
 * Browser key dispatch and undo use the browser receiving oracles.
 */
import { differs, oracleProperty, pass } from '@tanstack/oracles';
import MarkdownIt from 'markdown-it';
import { browserCall } from './editor-oracles/browser-driver-oracle.ts';
import { Plan, histories, model, reached, resolve, verseArbitrary } from './editor-oracles/break-model-oracle.ts';
import { traceValue as value, usableEdit } from './editor-oracles/document-oracle.ts';
import { infoArbitrary, infoCases, infoPlan, infoModel, infoStates } from './editor-oracles/break-model-oracle.ts';


async function driver(plan: Plan, observe: (checkpoint: string, value: unknown) => void) {
  const response = await browserCall('breakEdit', [plan.text, plan.from, plan.to]);
  if (response.error) { observe('error', response.error); return; }
  const edit = response.value!;
  observe('edit', edit);
  if (!usableEdit(plan, edit)) return;
  observe('output', plan.text.slice(0, edit.from) + edit.insert + plan.text.slice(edit.to));
}


oracleProperty({
  id: 'editor-line-break',
  owns: ['src/ui/format-shortcuts.ts#breakEdit'],
  law: {
    statement: 'For every edit, a nonempty prose line gets a hard break; a blank line or a line inside a fenced block gets an ordinary newline; text outside the selection stays unchanged and the caret lands after the insertion.',
    authority: 'test-ui/format-shortcuts.test.ts at commit 28b0c8d642a87e5810ad6eabd95c2d1714c53396, “Shift+Enter”; decision by Kyle Mathews (GitHub KyleAMathews), 2026-11-18: even backslash runs must produce hard breaks, protect the full existing behavior, and preserve closing fences with ordinary newlines; decision by Kyle Mathews (GitHub KyleAMathews), 2026-11-21: follow main, preserve these breakEdit command laws through the hard-break toolbar while native Shift+Enter inserts an ordinary newline.',
    limits: 'One optional opening fence, one optional candidate closer and an opposite-marker decoy; opening width 3–8, closing width 2–9, indentation 0–3, at most 12 backslashes and 16 UTF-16 units per selected/suffix string. Also one bullet or 1–9 digit ordered list, zero to two quote levels, relative indentation 0–3, opener/body/closer/after-close/parent-ended roles, eight-character words and 64 UTF-16 suffix units; short and invalid-info container openers are neighboring controls. No indented code, arbitrary container documents, browser dispatch, undo, or automatic continuation prefixes.',
  },
  histories, resolve, model, reached, driver,
  check: (_plan, trace, expected) => differs('edit', 'line break', value(trace, 'edit'), expected.edit) ??
    differs('output', 'line break', value(trace, 'output'), expected.output) ??
    differs('error', 'line break', value(trace, 'error'), undefined) ?? pass,
  calibrations: [{
    name: 'missing hard-break marker', law: 'line break', history: { constructed: 'plain' },
    corrupt: trace => trace.map(item => item.checkpoint === 'edit'
      ? { ...item, value: { ...(item.value as object), insert: '\n' } } : item),
  }, {
    name: 'container code receives a literal hard-break marker', law: 'line break', history: { constructed: 'container-bullet-body-continuation-opener' },
    corrupt: trace => trace.map(item => item.checkpoint === 'edit' ? { ...item, value: { ...(item.value as object), insert: '\\\n' } } : item),
  }, {
    name: 'closed container prose loses its hard-break marker', law: 'line break', history: { constructed: 'container-quote-after-closed' },
    corrupt: trace => trace.map(item => item.checkpoint === 'edit' ? { ...item, value: { ...(item.value as object), insert: '\n' } } : item),
  }, {
    name: 'container insertion leaves the caret behind', law: 'line break', history: { constructed: 'container-bullet-body-continuation-opener' },
    corrupt: trace => trace.map(item => item.checkpoint === 'edit' ? { ...item, value: { ...(item.value as { start: number; end: number }), start: 0, end: 0 } } : item),
  }, {
    name: 'container continuation prefix is changed', law: 'line break', history: { constructed: 'container-bullet-body-continuation-opener' },
    corrupt: trace => trace.map(item => item.checkpoint === 'output' ? { ...item, value: String(item.value) + 'changed' } : item),
  }],
});

const md = new MarkdownIt();

// A code span such as ```x``` is not a fenced opener: backtick fence info
// cannot itself contain ticks. Tilde fence info has no such restriction.
oracleProperty({
  id: 'editor-line-break-opening-info', owns: ['src/ui/format-shortcuts.ts#breakEdit'],
  law: { statement: 'For every generated opening-info context, backticks in a backtick fence info string leave prose and require a hard break; valid backtick and tilde openers keep an ordinary newline, preserving source outside the range and the final caret.',
    authority: 'CommonMark0.31.2 section4.5 fenced code blocks; Decision by Kyle Mathews (GitHub KyleAMathews),2026-11-18: follow CommonMark for inline backtick spans versus fenced blocks, add the oracle and fix.',
    limits: 'One prefix opener, base width3–12 with up to12 contiguous extension ticks, indentation0–3, info tick count0–12, opener end or subsequent ordinary body; selection/suffix up to16UTF-16 units. The primary property separately constructs bounded quote/list containers; this opening-info property retains its root-prefix envelope.' },
  histories: { arbitrary: infoArbitrary, runs: 100, fixedSeeds: [20261118], states: [...new Set(Object.values(infoCases).flatMap(h => infoStates(infoPlan(h))))], constructed: Object.entries(infoCases).map(([name, h]) => ({ name, enters: infoStates(infoPlan(h)), build: () => h })) },
  resolve: infoPlan, model: infoModel, reached: infoStates, driver: async (p, observe) => {
    const response = await browserCall('breakEdit', [p.text, p.from, p.to]);
    if (response.error) { observe('error', response.error); return; }
    const edit = response.value!;
    observe('edit', edit);
    if (usableEdit(p, edit)) observe('output', p.text.slice(0, edit.from) + edit.insert + p.text.slice(edit.to));
  },
  check: (_p, trace, expected) => differs('edit', 'CommonMark fence info', value(trace, 'edit'), expected.edit) ?? differs('output', 'CommonMark fence info', value(trace, 'output'), expected.output) ?? differs('error', 'CommonMark fence info', value(trace, 'error'), undefined) ?? pass,
  calibrations: [{ name: 'invalid opener consumes prose', law: 'CommonMark fence info', history: { constructed: '`1opener' }, corrupt: trace => trace.map(o => o.checkpoint === 'edit' ? { ...o, value: { ...(o.value as object), insert: '\n' } } : o) }],
});

oracleProperty({
  id: 'editor-line-break-verse',
  owns: ['src/ui/format-shortcuts.ts#breakEdit'],
  law: {
    statement: 'For every sequence of nonempty prose lines entered with the hard-break command, each break renders inside one paragraph and the caret remains after each insertion.',
    authority: 'test-ui/format-shortcuts.test.ts at commit 28b0c8d642a87e5810ad6eabd95c2d1714c53396, “renders as a line break inside one paragraph”; decision by Kyle Mathews (GitHub KyleAMathews), 2026-11-18: protect the full existing hard-break behavior; decision by Kyle Mathews (GitHub KyleAMathews), 2026-11-21: follow main, retain the hard-break command through the toolbar while Shift+Enter is a native ordinary newline.',
    limits: 'Two to eight lines of letters without Markdown syntax; browser undo is checked by the browser session oracle.',
  },
  histories: {
    arbitrary: verseArbitrary, runs: 100, fixedSeeds: [20261118],
    states: ['oneBreak', 'repeatedBreaks'],
    constructed: [
      { name: 'one break', enters: ['oneBreak'], build: () => ['one', 'two'] },
      // Original renderer witness, format-shortcuts.test.ts:158: one<br>two<br>three.
      { name: 'two breaks', enters: ['repeatedBreaks'], build: () => ['one', 'two', 'three'] },
    ],
  },
  resolve: lines => lines,
  model: lines => ({
    output: lines.join('\\\n'), html: `<p>${lines.join('<br>\n')}</p>\n`,
    carets: lines.slice(0, -1).map((_line, index) => {
      const from = lines.slice(0, index + 1).join('').length + 2 * index;
      return { start: from + 2, end: from + 2, from, to: from, insert: '\\\n' };
    }),
  }),
  reached: lines => [lines.length === 2 ? 'oneBreak' : 'repeatedBreaks'],
  driver: async (lines, observe) => {
    let output = lines[0]!;
    const carets: { start: number; end: number; from: number; to: number; insert: string }[] = [];
    for (const line of lines.slice(1)) {
      const response = await browserCall('breakEdit', [output, output.length, output.length]);
      if (response.error) { observe('error', response.error); return; }
      const edit = response.value!;
      output = output.slice(0, edit.from) + edit.insert + output.slice(edit.to);
      carets.push({ start: edit.start, end: edit.end, from: edit.from, to: edit.to, insert: edit.insert });
      output = output.slice(0, edit.start) + line + output.slice(edit.end);
    }
    observe('verse', { output, html: md.render(output), carets });
  },
  check: (_plan, trace, expected) => differs('verse', 'verse hard breaks', value(trace, 'verse'), expected) ??
    differs('error', 'verse hard breaks', value(trace, 'error'), undefined) ?? pass,
  calibrations: [{
    name: 'paragraph break replaces line break', law: 'verse hard breaks', history: { constructed: 'two breaks' },
    corrupt: trace => trace.map(item => item.checkpoint === 'verse'
      ? { ...item, value: { ...(item.value as object), html: '<p>one</p>\n<p>two</p>\n<p>three</p>\n' } } : item),
  }],
});
