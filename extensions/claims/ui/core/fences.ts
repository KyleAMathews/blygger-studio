// Fenced code blocks in Markdown, found the CommonMark way: a fence is three or
// more backticks or tildes, indented at most three spaces, and it closes on a
// fence of the same character at least as long. An unclosed fence runs to the
// end of the document. Pure; shared by the CLI and the Studio extension.

export interface Fence {
  /** First word of the info string, lowercased; "" for an unlabeled fence. */
  info: string;
  /** The block's content, without the fence lines. */
  body: string;
  /** 1-based line numbers of the opening and closing fence lines. */
  startLine: number;
  endLine: number;
  closed: boolean;
}

const OPEN = /^( {0,3})(`{3,}|~{3,})(.*)$/;

export function findFences(markdown: string): Fence[] {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  const fences: Fence[] = [];
  let i = 0;
  while (i < lines.length) {
    const open = OPEN.exec(lines[i]);
    // A backtick fence's info string may not contain a backtick.
    if (!open || (open[2][0] === '`' && open[3].includes('`'))) {
      i++;
      continue;
    }
    const marker = open[2];
    const info = open[3].trim().split(/\s+/)[0]?.toLowerCase() ?? '';
    const close = new RegExp(`^ {0,3}${marker[0] === '`' ? '`' : '~'}{${marker.length},}\\s*$`);
    const body: string[] = [];
    let j = i + 1;
    while (j < lines.length && !close.test(lines[j])) body.push(lines[j++]);
    const closed = j < lines.length;
    fences.push({ info, body: body.join('\n'), startLine: i + 1, endLine: closed ? j + 1 : lines.length, closed });
    i = j + 1;
  }
  return fences;
}
