// Pure text edits shared by every composer. No React, no DOM.
/**
 * Put `block` on its own paragraph at [start, end) of `text`, adding only the
 * blank lines the surrounding text does not already supply.
 */
export function insertBlock(text: string, start: number, end: number, block: string) {
  const before = text.slice(0, start);
  const after = text.slice(end);
  const lead = !before || before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n';
  const trail = !after || after.startsWith('\n\n') ? '' : after.startsWith('\n') ? '\n' : '\n\n';
  return { text: before + lead + block + trail + after, caret: (before + lead + block).length };
}

/** A line holding only `/image`, ending at the caret: the slash command. */
export function imageCommandAt(text: string, caret: number) {
  const lineStart = text.lastIndexOf('\n', caret - 1) + 1;
  return text.slice(lineStart, caret).trim() === '/image' &&
    (caret === text.length || text[caret] === '\n')
    ? { start: lineStart, end: caret }
    : null;
}
