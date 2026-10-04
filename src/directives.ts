import { ID_ALPHABET } from "./identity.ts";
import { codeRanges, inRanges, lineOffsets } from "./code-ranges.ts";
const DIRECTIVE_LINE = new RegExp(`^\\s*!\\[\\[([${ID_ALPHABET}]{26})\\]\\]\\s*$`);

const RESERVED_LINE = new RegExp(`^\\s*!\\[\\[([${ID_ALPHABET}]{26})@v\\d+\\]\\]\\s*$`);
const QUOTE_LINE = /^\s*>/;

export function attachedQuote(lines: string[], i: number): { quoteMd: string | null; next: number } {
  let j = i + 1;
  const run: string[] = [];
  while (j < lines.length && QUOTE_LINE.test(lines[j])) {
    // Strip the marker and at most one following space — the usual markdown
    // convention, and the one that leaves "> > nested" nested.
    run.push(lines[j].replace(/^\s*>\s?/, ""));
    j++;
  }
  return { quoteMd: run.length ? run.join("\n") : null, next: j };
}

export function extractDirectives(contentMd: string): { count: number; withoutDirectives: string } {
  const lines = contentMd.split("\n");
  const kept: string[] = [];
  let count = 0;
  // Same inert regions as the publish walker: code (§10.1, #54).
  const inert = codeRanges(contentMd);
  const starts = lineOffsets(lines);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (inRanges(inert, starts[i])) {
      kept.push(line);
      continue;
    }
    if (RESERVED_LINE.test(line)) {
      count++;
      continue;
    }
    if (DIRECTIVE_LINE.test(line)) {
      count++;
      // The attached blockquote belongs to the directive, not to the prose:
      // leaving it behind would show the author their own quote twice in a
      // draft preview — once inside the baked snapshot and once as a stray
      // quotation under it.
      i = attachedQuote(lines, i).next - 1;
      continue;
    }
    kept.push(line);
  }
  return { count, withoutDirectives: kept.join("\n") };
}
