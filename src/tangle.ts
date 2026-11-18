// Tangling (blygger-spec docs/tangling-plan.md; decisions #78, #100): a span
// written `![[+ text]]` in a thread's working copy becomes a new item at
// publish, and the span becomes an own-line directive quoting it. The grammar
// is studio-private (#70): pre-flight rewrites every span before publish(), so
// nothing here reaches the wire, and the protocol grammar in grammar.ts is
// untouched by it.
//
// A span opens with `![[+` at the start of a line, followed by a space or a
// newline, and closes with `]]` at the end of a line. It may run over several
// lines and paragraphs. `[[id]]` links and `![[id]]` directives inside it are
// stepped over, so a link does not close it. Like every bracket form it is
// inert in code (#54) and in TK scopes, and in comments to self, which publish
// nothing.
import { codeRanges, inRanges, type Range } from "./code-ranges.ts";
import { parseComments } from "./comments.ts";
import { DIRECTIVE_LINE, ID, labelText, stripGeneratedGrammar } from "./grammar.ts";
import { parseScopes } from "./tk.ts";

/** Spans one publish may mint: a fifth of the RECOMMENDED 50-entry feed window (plan §0). */
export const TANGLE_MAX = 10;

export interface TangleSpan {
  /** Start of the opener's line, and the end of the closer's line (before its newline). */
  start: number;
  end: number;
  /** The span's text, trimmed: what the new item's working copy holds. */
  text: string;
}

export interface TangleIssue {
  at: number;
  reason: string;
}

const OPENER = "![[+";
/** A `[[id]]` link or `![[id]]` directive, label allowed: stepped over when looking for the closer. */
const NESTED = new RegExp(`!?\\[\\[${ID}(?:[ \\t]*\\|(?:(?!\\]\\])[^\\n])*)?\\]\\]`, "y");
/** Own media in a span (plan §2.5): a markdown image or link to this blyg's `media/` path. */
const OWN_MEDIA = /\]\([^)\s]*\/?media\/[0-9a-z]{26}[/.]/;

const lineStart = (md: string, at: number) => md.lastIndexOf("\n", at - 1) + 1;
const lineEnd = (md: string, at: number) => {
  const nl = md.indexOf("\n", at);
  return nl === -1 ? md.length : nl;
};

/** Regions where no span can open or close: code, TK scopes, comments. */
function inertRanges(md: string, scopes: Range[]): Range[] {
  const ranges: Range[] = [...codeRanges(md), ...scopes];
  if (md.includes("/*")) for (const c of parseComments(md).ranges) ranges.push([c.start, c.end]);
  return ranges;
}

/**
 * Every span in a working copy, and every reason it cannot publish (plan §1.4).
 * Any issue means publish must refuse before anything is minted.
 */
export function parseTangles(md: string): { spans: TangleSpan[]; issues: TangleIssue[] } {
  const spans: TangleSpan[] = [];
  const issues: TangleIssue[] = [];
  if (!md.includes(OPENER)) return { spans, issues };
  const scopes: Range[] = md.includes("[TK]") ? parseScopes(md).scopes.map((s) => [s.start, s.end]) : [];
  const inert = inertRanges(md, scopes);
  let from = 0;
  for (;;) {
    const at = md.indexOf(OPENER, from);
    if (at === -1) break;
    from = at + OPENER.length;
    if (inRanges(inert, at)) continue;
    const start = lineStart(md, at);
    if (md.slice(start, at).trim()) {
      issues.push({ at, reason: "a new-item span must start its own line" });
      continue;
    }
    const after = md[at + OPENER.length];
    if (after !== undefined && after !== " " && after !== "\t" && after !== "\n") {
      issues.push({ at, reason: "write a space after ![[+" });
      continue;
    }
    // Look for the closer, stepping over links, directives and inert text.
    let i = at + OPENER.length;
    let close = -1;
    let nested = -1;
    while (i < md.length) {
      if (inRanges(inert, i)) {
        i++;
        continue;
      }
      if (md.startsWith(OPENER, i)) {
        nested = i;
        break;
      }
      NESTED.lastIndex = i;
      const link = NESTED.exec(md);
      if (link) {
        i += link[0].length;
        continue;
      }
      if (md.startsWith("]]", i)) {
        close = i;
        break;
      }
      i++;
    }
    if (nested !== -1) {
      issues.push({ at, reason: "a new-item span cannot contain another; tangle again inside the new item once it exists" });
      from = nested;
      continue;
    }
    if (close === -1) {
      issues.push({ at, reason: "this new-item span has no closing ]]" });
      break;
    }
    from = close + 2;
    const end = lineEnd(md, close);
    if (md.slice(close + 2, end).trim()) {
      issues.push({ at: close, reason: "a new-item span's closing ]] must end its line" });
      continue;
    }
    const text = md.slice(at + OPENER.length, close).trim();
    if (!text) {
      issues.push({ at, reason: "this new-item span is empty" });
      continue;
    }
    if (scopes.some(([s]) => s > at && s < close)) {
      issues.push({ at, reason: "a new-item span cannot contain a TK scope; generate first, or move the scope out of the span" });
      continue;
    }
    if (OWN_MEDIA.test(text)) {
      issues.push({ at, reason: "a new-item span cannot contain an attached image yet; attach it to the new item after it is published" });
      continue;
    }
    spans.push({ start, end, text });
  }
  if (spans.length > TANGLE_MAX) {
    issues.push({ at: spans[TANGLE_MAX].start, reason: `one publish can make at most ${TANGLE_MAX} new items; this has ${spans.length}` });
  }
  return { spans, issues };
}

/**
 * The label written into the thread for a minted item (plan §2.3): the span's
 * first eight or so words, with `…` when cut, so the thread's source stays
 * readable. Links become their labels; directive lines are left out.
 */
export function tangleLabel(text: string): string {
  const prose = stripGeneratedGrammar(text.split("\n").filter((l) => !DIRECTIVE_LINE.test(l)).join("\n"));
  const words = prose.split(/\s+/).filter(Boolean);
  const cut = words.length > 8;
  return labelText(words.slice(0, 8).join(" ") + (cut ? "…" : ""));
}

/**
 * The working copy with each span replaced by an own-line directive to its
 * new item, `ids[i]` for `spans[i]`. A blank line always follows the
 * directive, so a blockquote the author wrote after the span is never read as
 * a partial selection (#49).
 */
export function rewriteTangles(md: string, spans: TangleSpan[], ids: string[]): string {
  let out = "";
  let last = 0;
  spans.forEach((span, i) => {
    const l = tangleLabel(span.text);
    out += md.slice(last, span.start) + (l ? `![[${ids[i]} | ${l}]]` : `![[${ids[i]}]]`);
    let rest = span.end;
    while (md[rest] === "\n") rest++;
    out += rest < md.length ? "\n\n" : "\n";
    last = rest;
  });
  return out + md.slice(last);
}

/**
 * The working copy with every span's markers removed and its text kept, for
 * readers of `content_md` that want the author's words (plain text, change
 * notes, the change classifier: plan §2.6). Spans that would not publish are
 * left as written.
 */
export function withoutTangleMarkers(md: string): string {
  const { spans } = parseTangles(md);
  let out = "";
  let last = 0;
  for (const span of spans) {
    out += md.slice(last, span.start) + span.text;
    last = span.end;
  }
  return out + md.slice(last);
}
