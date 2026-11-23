import MarkdownIt from 'markdown-it';

// Parser item identities include the ordinal on a line: inline repeated markers
// can introduce several containing items at the same raw source position.
interface ListItem {
  id: string;
  ancestors: string[];
  contentEnd: number;
  body: string;
  paragraph: boolean;
  level: number;
}
function listTopology(text: string) {
  const first = new Map<number, ListItem>(), all: ListItem[] = [], stack: ListItem[] = [];
  const ordinals = new Map<number, number>();
  let lastContentEnd = 0;
  const contentEnds = text.split(/\r\n?|\n/).map((line, index) => {
    if (!/^[ \t]*$/.test(line)) lastContentEnd = index + 1;
    return lastContentEnd;
  });
  for (const token of new MarkdownIt({ html: false }).parse(text, {})) {
    if (token.type === 'list_item_open') {
      const line = token.map![0], ordinal = ordinals.get(line) ?? 0;
      // Token extents include trailing blank lines. They are not an unselected
      // item body and must not prevent moving the selected complete forest.
      const contentEnd = contentEnds[token.map![1] - 1]!;
      const item = { id: `${line}:${ordinal}`, ancestors: stack.map(item => item.id),
        contentEnd, body: '', paragraph: false, level: token.level };
      ordinals.set(line, ordinal + 1);
      if (!first.has(line)) first.set(line, item);
      all.push(item); stack.push(item);
    } else if (token.type === 'list_item_close') stack.pop();
    else if (token.type === 'paragraph_open' && stack.length) {
      const item = stack.at(-1)!;
      if (token.level === item.level + 1 && first.get(token.map![0]) === item) item.paragraph = true;
    } else if (token.type === 'inline' && stack.length) stack.at(-1)!.body += token.content;
  }
  return { first, all };
}

// Callers supply ordered UTF-16 offsets; parser maps count normalized newlines.
function listLines(text: string, positions: number[]) {
  const breaks = text.matchAll(/\r\n?|\n/g);
  let next = breaks.next(), lineNumber = 0;
  return positions.map(position => {
    while (!next.done && next.value.index! + next.value[0].length <= position) {
      lineNumber++; next = breaks.next();
    }
    return lineNumber;
  });
}
const sameAncestors = (left: string[], right: string[]) => left.length === right.length && left.every((id, index) => id === right[index]);
const column = (source: string, at = 0) => {
  for (const character of source) at += character === '\t' ? 4 - at % 4 : 1;
  return at;
};

// Cmd/Ctrl+B, I and K in the editors: markdown's bold, italic and link, written
// into the text as if typed, so the browser's own undo takes them back.
// Also the keys for markdown's structure, which a textarea makes awkward: Tab and
// Shift+Tab move a list item in and out. The line break (breakEdit) has no key, only
// the toolbar button: Shift+Enter wrote it from 0.58.3 to 0.66.0, and an iPad's
// on-screen keyboard, with Shift on after a full stop, sent Shift+Enter for Return,
// so stray backslashes appeared (Venkat, session 76).
export type FormatKind = 'bold' | 'italic' | 'link';
export interface FormatEdit {
  /** Replace [from, to) with insert, then select [start, end). */
  from: number;
  to: number;
  insert: string;
  start: number;
  end: number;
}

const stars = (s: string) => /^\**/.exec(s)![0].length;
const endStars = (s: string) => /\**$/.exec(s)![0].length;
// Asterisks in a run mean: 1 italic, 2 bold, 3 both. So bold is 2 or more, italic is odd.
const isOn = (run: number, kind: 'bold' | 'italic') => (kind === 'bold' ? run >= 2 : run % 2 === 1);
const width = (kind: 'bold' | 'italic') => (kind === 'bold' ? 2 : 1);

function wrapLine(line: string, kind: 'bold' | 'italic', on: boolean): string {
  const w = width(kind);
  const core = line.trim();
  const lead = line.slice(0, line.length - line.trimStart().length);
  const tail = line.slice(line.trimEnd().length);
  const mark = '*'.repeat(w);
  return lead + (on ? mark + core + mark : core.slice(w, core.length - w)) + tail;
}

function emphasis(text: string, from: number, to: number, kind: 'bold' | 'italic'): FormatEdit {
  const picked = text.slice(from, to);
  // Across lines each line is wrapped on its own: emphasis cannot span a paragraph.
  if (picked.includes('\n')) {
    const lines = picked.split('\n');
    const filled = lines.filter((l) => l.trim());
    const allOn = filled.length > 0 && filled.every((l) => {
      const core = l.trim();
      const run = Math.min(stars(core), endStars(core));
      return core.length > run * 2 && isOn(run, kind);
    });
    const insert = lines.map((l) => (l.trim() ? wrapLine(l, kind, !allOn) : l)).join('\n');
    return { from, to, insert, start: from, end: from + insert.length };
  }
  // Spaces stay outside the markers, or markdown does not read them as emphasis.
  const lead = picked.length - picked.trimStart().length;
  const tail = picked.length - picked.trimEnd().length;
  const a = from + lead;
  const b = Math.max(a, to - tail);
  const w = width(kind);
  const inner = text.slice(a, b);
  // Markers selected along with the words.
  const innerRun = Math.min(stars(inner), endStars(inner));
  if (inner && inner.length > innerRun * 2 && isOn(innerRun, kind)) {
    const bare = inner.slice(w, inner.length - w);
    return { from: a, to: b, insert: bare, start: a, end: a + bare.length };
  }
  // Markers just outside the selection, or around the caret.
  const run = Math.min(endStars(text.slice(0, a)), stars(text.slice(b)));
  if (isOn(run, kind)) {
    return { from: a - w, to: b + w, insert: inner, start: a - w, end: a - w + inner.length };
  }
  const mark = '*'.repeat(w);
  return { from: a, to: b, insert: mark + inner + mark, start: a + w, end: a + w + inner.length };
}

function link(text: string, from: number, to: number): FormatEdit {
  const picked = text.slice(from, to);
  if (/^https?:\/\/\S+$/.test(picked)) {
    // A URL selected: it is the target, and the caret goes to the words.
    return { from, to, insert: `[](${picked})`, start: from + 1, end: from + 1 };
  }
  const insert = `[${picked}]()`;
  // Words selected: the caret waits for the URL. Nothing selected: for the words.
  const at = picked ? from + insert.length - 1 : from + 1;
  return { from, to, insert, start: at, end: at };
}

export function formatEdit(text: string, from: number, to: number, kind: FormatKind): FormatEdit {
  return kind === 'link' ? link(text, from, to) : emphasis(text, from, to, kind);
}

const LIST_LINE = /^[ \t]*(?:[-*+]|\d{1,9}[.)])(?:[ \t]|$)/;
/**
 * Four spaces are the usual list level. A parent's content column can require
 * more, depending on its marker width and following spaces or tabs.
 */
const INDENT = '    ';
/** [from, to) widened to whole lines. A selection ending at a line's start does not take that line. */
function lineSpan(text: string, from: number, to: number) {
  const start = from === 0 ? 0 : text.lastIndexOf('\n', from - 1) + 1;
  const last = to > from && text[to - 1] === '\n' ? to - 1 : to;
  const end = text.indexOf('\n', last);
  return { start, end: end < 0 ? text.length : end };
}
/**
 * Move the list items under the selection one level in or out. Null when a line
 * there is not a list item (or nothing would move), so Tab keeps its usual meaning.
 */
export function indentEdit(text: string, from: number, to: number, out: boolean): FormatEdit | null {
  const { start, end } = lineSpan(text, from, to);
  const lines = text.slice(start, end).split('\n');
  if (!lines.some((line) => line.trim()) || !lines.every((line) => !line.trim() || LIST_LINE.test(line))) return null;
  const rows = lines.map(line => {
    if (!line.trim()) return { line, indent: line, marker: '', gap: '', body: '' };
    const match = /^([ \t]*)([-*+]|\d{1,9}[.)])([ \t]*)/.exec(line)!;
    const body = line.slice(match[0].length);
    return { line, indent: match[1]!, marker: match[2]!, gap: match[3]!, body };
  });
  const first = rows.findIndex(row => row.marker);
  const before = text.slice(0, start).trimEnd();
  const aboveStart = before.lastIndexOf('\n') + 1;
  const above = before.slice(aboveStart);
  const opening = /^([ \t]*)([-*+]|\d{1,9}[.)])([ \t]+|$)/.exec(above);
  let at = start;
  const selected = rows.flatMap((row, index) => {
    const item = row.marker ? [{ at, index, indent: row.indent }] : [];
    at += row.line.length + 1;
    return item;
  });
  const level = rows[first]!.indent;
  let content = 0;
  if (!out && opening) {
    const markerEnd = column(opening[1] + opening[2]);
    const gap = column(opening[3]!, markerEnd) - markerEnd;
    // CommonMark uses one column when larger padding introduces a code child.
    content = markerEnd + (gap && gap <= 4 ? gap : 1);
  }
  // Ordinary caret movement needs no parse. Share one input snapshot only when
  // a selected forest or unequal-column wide parent needs semantic containers.
  const topology = !out && opening && (from !== to && selected.length > 1
    || column(level, INDENT.length) < content && column(opening[1]!) !== column(level)) ? listTopology(text) : undefined;
  const [parentLine, ...selectedLines] = topology ? listLines(text, [aboveStart, ...selected.map(row => row.at)]) : [];
  const parent = topology?.first.get(parentLine!), items = selectedLines.map(line => topology!.first.get(line));
  const siblings = !!parent && items.every(item => !!item && sameAncestors(item.ancestors, parent.ancestors));
  let spaces = INDENT.length;
  let aligned: number | undefined;
  if (!out && opening) {
    // Preserve the current exact candidate, including flat-peer alignment.
    if (from !== to && selected.length > 1 && selected.some(row => column(row.indent, spaces) < content) && siblings) {
      aligned = selected.reduce((size, row) => Math.max(size, column(row.indent) + INDENT.length), content);
    } else if (column(level, spaces) < content
      && (column(opening[1]!) === column(level) || !!parent && !!items[0] && sameAncestors(items[0].ancestors, parent.ancestors))) {
      while (column(level, spaces) < content) spaces++;
    }
  }
  const indents = rows.map(row => out ? row.indent.replace(/^(?: {1,4}|\t)/, '')
    : aligned === undefined ? ' '.repeat(spaces) + row.indent : ' '.repeat(aligned));
  // A newly nested first ordered marker restarts; a continuation keeps its source.
  if (!out && !LIST_LINE.test(above) && !/^[ \t]+\S/.test(above)) return null;
  const continues = first === 0 && above.startsWith(indents[first]!) && /^\d{1,9}[.)]/.test(above.slice(indents[first]!.length));
  const marker = (index: number) => !out && !continues && index === first ? rows[index]!.marker.replace(/^\d{1,9}([.)])/, '1$1') : rows[index]!.marker;
  // One writer serves ordinary, outward and corrected per-row indentation.
  const write = () => rows.map((row, index) => row.marker ? indents[index] + marker(index) + row.gap + row.body : row.line).join('\n');
  let insert = write();
  if (!out && from !== to && selected.length > 1 && parent && items.every((item): item is ListItem => !!item)) {
    const known = new Set(items.map(item => item.id)), base = parent.ancestors;
    // A complete forest has no omitted selected ancestor, descendant or trailing
    // body. Empty/nonparagraph rows retain their existing source path.
    const forest = sameAncestors(items[0]!.ancestors, base) && items.every((item, index) => {
      const row = rows[selected[index]!.index]!, end = column(row.indent + row.marker), gap = column(row.gap, end) - end;
      return sameAncestors(item.ancestors.slice(0, base.length), base)
        && item.ancestors.slice(base.length).every(id => known.has(id))
        && item.contentEnd <= selectedLines.at(-1)! + 1
        && (item.paragraph && gap >= 1 && gap <= 4);
    }) && topology!.all.every(item => !item.ancestors.some(id => known.has(id)) || known.has(item.id));
    if (forest) {
      const ordinary = listTopology(text.slice(0, start) + insert + text.slice(end));
      const ancestry = items.map(item => [...base, parent.id, ...item.ancestors.slice(base.length)]);
      const lawful = items.every((item, index) => {
        const moved = ordinary.first.get(selectedLines[index]!);
        return !!moved && sameAncestors(moved.ancestors, ancestry[index]!) && moved.body === item.body;
      });
      if (!lawful) {
        const floors = new Map([[parent.id, content]]);
        for (const [index, item] of items.entries()) {
          const rowIndex = selected[index]!.index, row = rows[rowIndex]!;
          const containing = item.ancestors.at(-1)!, floor = floors.get(known.has(containing) ? containing : parent.id)!;
          // All sibling markers lie in this four-column band. Each item's body
          // starts beyond its top, so the next sibling cannot become its child.
          let indent = floor + 3;
          for (; indent >= floor; indent--) {
            const end = indent + marker(rowIndex).length, gap = column(row.gap, end) - end;
            if (gap >= 1 && gap <= 4 && end + gap > floor + 3) break;
          }
          indents[rowIndex] = ' '.repeat(indent);
          floors.set(item.id, column(row.gap, indent + marker(rowIndex).length));
        }
        insert = write();
      }
    }
  }
  if (insert === lines.join('\n')) return null;
  if (from !== to) return { from: start, to: end, insert, start, end: start + insert.length };
  // A caret stays on its character; one inside the removed indent goes to the line's start.
  const caret = Math.max(start, from + insert.split('\n')[0]!.length - lines[0]!.length);
  return { from: start, to: end, insert, start: caret, end: caret };
}

/** Whether the prefix ends on a fenced code line, including its closing delimiter. */
function inFence(text: string, at: number) {
  const prefix = text.slice(0, at);
  const line = prefix.split(/\r\n?|\n/).length - 1;
  // Fence maps include their closer and exclude the following line. Complete
  // the prefix so an open fence includes an empty EOF line, even after CR.
  return new MarkdownIt({ html: false }).parse(prefix + '\n\n', {})
    .some(token => token.type === 'fence' && token.map !== null && token.map[1] > line);
}
/**
 * A line break that is not a paragraph break: markdown's backslash at the end of
 * the line. The backslash form, not two trailing spaces, because it can be seen.
 */
export function breakEdit(text: string, from: number, to: number): FormatEdit {
  const before = text.slice(0, from);
  const line = before.slice(before.lastIndexOf('\n') + 1);
  // An unpaired backslash already makes the break; escaped pairs do not.
  const slashes = /\\*$/.exec(line)![0].length;
  const plain = !line.trim() || slashes % 2 === 1 || inFence(text, from);
  const insert = plain ? '\n' : '\\\n';
  return { from, to, insert, start: from + insert.length, end: from + insert.length };
}

/** A fenced code block around the selected lines, or an empty one with the caret inside. */
export function codeBlockEdit(text: string, from: number, to: number): FormatEdit {
  const picked = text.slice(from, to);
  // A block starts on its own line with a blank line before it, and ends the same way.
  const lead = from === 0 || text.slice(0, from).endsWith('\n\n') ? '' : text[from - 1] === '\n' ? '\n' : '\n\n';
  const rest = text.slice(to);
  const tail = !rest || rest.startsWith('\n\n') ? '' : rest.startsWith('\n') ? '\n' : '\n\n';
  const body = picked.replace(/\n$/, '');
  // A fence in the selected source must remain literal code too.
  const fence = '`'.repeat((body.match(/`+/g) ?? []).reduce((size, run) => Math.max(size, run.length + 1), 3));
  const insert = `${lead}${fence}\n${body}\n${fence}${tail}`;
  const inside = from + lead.length + fence.length + 1;
  return { from, to, insert, start: inside, end: inside + body.length };
}

/**
 * A formula (#105): the selection between dollars, or an empty pair with the
 * caret inside. A selection that runs over a line break, or one already in
 * dollars, is displayed (`$$…$$`); a word or two is inline.
 */
export function formulaEdit(text: string, from: number, to: number): FormatEdit {
  const picked = text.slice(from, to);
  const inner = picked.trim();
  const displayed = inner.length >= 4 && inner.startsWith('$$') && inner.endsWith('$$');
  const mark = displayed ? '' : picked.includes('\n') ? '$$' : '$';
  const insert = `${mark}${inner}${mark}`;
  const edge = displayed ? 2 : mark.length;
  const start = from + edge;
  return { from, to, insert, start, end: from + insert.length - edge };
}

const KEYS: Record<string, FormatKind> = { b: 'bold', B: 'bold', i: 'italic', I: 'italic', k: 'link', K: 'link' };

/**
 * Which format a key press asks for. Cmd on a Mac, where Ctrl+B and Ctrl+K are
 * the system's own text-field motions (back a character, delete to line end).
 */
export function formatKey(event: Pick<KeyboardEvent, 'key' | 'metaKey' | 'ctrlKey' | 'altKey' | 'shiftKey'>, mac: boolean): FormatKind | null {
  if (event.altKey || event.shiftKey) return null;
  if (mac ? !event.metaKey || event.ctrlKey : !event.ctrlKey || event.metaKey) return null;
  const key = event.key;
  return Object.hasOwn(KEYS, key) ? KEYS[key]! : null;
}

const isMac = () => /mac|iphone|ipad/i.test(navigator.platform);

/** Which structural edit a key press asks for, if any. Enter, with or without Shift, is never one. */
export function structureKey(event: Pick<KeyboardEvent, 'key' | 'metaKey' | 'ctrlKey' | 'altKey' | 'shiftKey'>): 'indent' | 'outdent' | null {
  if (event.metaKey || event.ctrlKey || event.altKey) return null;
  if (event.key === 'Tab') return event.shiftKey ? 'outdent' : 'indent';
  return null;
}

/** The textarea's onKeyDown. Fires its input event, so the editor's onChange sees the edit. */
export function onFormatKey(event: React.KeyboardEvent<HTMLTextAreaElement>) {
  const el = event.currentTarget;
  // A picker that took the key (Tab or Enter choosing a row) keeps it.
  if (el.readOnly || event.defaultPrevented || event.nativeEvent.isComposing) return;
  const [from, to] = [el.selectionStart, el.selectionEnd];
  const kind = formatKey(event, isMac());
  const structure = kind ? null : structureKey(event);
  const edit = kind
    ? formatEdit(el.value, from, to, kind)
    : structure
      ? indentEdit(el.value, from, to, structure === 'outdent')
      : null;
  // Tab off a list line moves focus on, as it does in any form.
  if (!edit) return;
  event.preventDefault();
  applyEdit(el, edit);
}

/** Write an edit into the textarea as if typed, and leave the selection where the edit says. */
export function applyEdit(el: HTMLTextAreaElement, edit: FormatEdit) {
  el.focus({ preventScroll: true });
  el.setSelectionRange(edit.from, edit.to);
  // Native editing snaps offsets inside a grapheme (surrogate pairs, combining
  // marks, ZWJ emoji). setRangeText preserves the caller's exact UTF-16 range.
  const boundaries = new Set(Array.from(new Intl.Segmenter().segment(el.value), part => part.index));
  boundaries.add(el.value.length);
  const exactNativeRange = boundaries.has(edit.from) && boundaries.has(edit.to);
  // insertText keeps edits on the undo stack. A collapsed empty replacement
  // is a no-op; native delete would erase the preceding character.
  const done = exactNativeRange && (edit.insert || edit.from === edit.to ? document.execCommand('insertText', false, edit.insert) : document.execCommand('delete'));
  if (!done) {
    el.setRangeText(edit.insert, edit.from, edit.to);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }
  el.setSelectionRange(edit.start, edit.end);
  el.dispatchEvent(new Event('selectionchange'));
}
