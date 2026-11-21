// Where the claim block sits in an editor's text, so the bar can open it again
// and put the changed block back in the same place. Pure.

import { findFences } from './core/fences.ts';
import { parseContent } from './core/parse.ts';
import type { ClaimBlock, ResolutionBlock } from './core/types.ts';

export interface FoundClaim {
  claim: ClaimBlock;
  /** Offsets of the whole fence, from its opening line to the end of its closing line. */
  start: number;
  end: number;
}

export function findClaim(text: string): FoundClaim | null {
  const first = parseContent(text).claims[0];
  if (!first) return null;
  const fence = findFences(text).find((f) => f.startLine === first.line);
  if (!fence) return null;
  const starts = [0];
  for (let i = 0; i < text.length; i++) if (text[i] === '\n') starts.push(i + 1);
  const at = (line: number) => (line - 1 < starts.length ? starts[line - 1] : text.length);
  const lineEnd = (line: number) => (line < starts.length ? starts[line] - 1 : text.length);
  return { claim: first.value, start: at(fence.startLine), end: lineEnd(fence.endLine) };
}

/** The fenced block alone, without the prose line `toMarkdown` puts first. */
export function fenced(claim: ClaimBlock): string {
  return `\`\`\`claim\n${JSON.stringify(claim, null, 2)}\n\`\`\``;
}

/**
 * Where to put a new block, and with what around it: at the end of the
 * paragraph holding the selection or caret (selected words stay as the post's
 * prose), on lines of its own.
 */
export function placeNew(text: string, selection: { start: number; end: number }, claim: ClaimBlock, withStatement: boolean): { start: number; end: number; insert: string } {
  const body = (withStatement ? `${claim.claim}\n\n` : '') + fenced(claim);
  const gap = text.indexOf('\n\n', Math.max(selection.end, selection.start));
  if (gap !== -1) {
    const lead = gap === 0 ? '' : '\n\n';
    return { start: gap, end: gap, insert: lead + body };
  }
  // The last paragraph: the block ends the post, replacing any trailing whitespace.
  const start = text.replace(/\s+$/, '').length;
  return { start, end: text.length, insert: (start === 0 ? '' : '\n\n') + body + '\n' };
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

function decode(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === '#') {
      const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

/**
 * The claim and resolution in a published entry, read from its HTML (the
 * reading view has no Markdown). Code blocks are rebuilt as fences and go
 * through the same parser, so the same blocks count as on any other reader.
 */
export function fromHtml(html: string): { claim: ClaimBlock; resolution: ResolutionBlock | null } | null {
  const fences: string[] = [];
  for (const m of html.matchAll(/<pre[^>]*>\s*<code(?:\s+class="language-([\w-]+)")?[^>]*>([\s\S]*?)<\/code>\s*<\/pre>/gi)) {
    fences.push(`\`\`\`${m[1] ?? ''}\n${decode(m[2]).replace(/\n$/, '')}\n\`\`\``);
  }
  if (!fences.length) return null;
  const parsed = parseContent(fences.join('\n\n'));
  const claim = parsed.claims[0]?.value;
  return claim ? { claim, resolution: parsed.resolutions[0]?.value ?? null } : null;
}
