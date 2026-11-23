import MarkdownIt from "markdown-it";
import { graphemePrefix } from "./text.ts";
import { mathErrors as findMathErrors, mathPlugin } from "./math.ts";

// Safe mode: raw HTML in markdown is escaped, never passed through (§3).
const md = new MarkdownIt({ html: false, linkify: true, typographer: false }).use(mathPlugin);

// Image alt text from every text-bearing child (studio#6). markdown-it 14
// emits an escape (`\*`) or an entity as a `text_special` token, and the
// default image rule's renderInlineAsText keeps only `text`, so `![a \* b](…)`
// got `alt="a  b"` while the same words outside an image read `a * b`.
type InlineToken = { type: string; content: string; children: InlineToken[] | null };
function altText(children: InlineToken[]): string {
  return children
    .map((t) =>
      t.type === "text" || t.type === "text_special" || t.type === "code_inline"
        ? t.content
        : t.type === "image"
          ? altText(t.children ?? [])
          : t.type === "softbreak" || t.type === "hardbreak"
            ? "\n"
            : "",
    )
    .join("");
}
md.renderer.rules.image = (tokens, idx, options, _env, self) => {
  const token = tokens[idx];
  token.attrSet("alt", altText((token.children ?? []) as unknown as InlineToken[]));
  return self.renderToken(tokens, idx, options);
};

export function renderMarkdown(contentMd: string): string {
  return md.render(contentMd);
}

/** Formulas in `contentMd` that do not parse (#105): publish refuses them. */
export function mathErrors(contentMd: string) {
  return findMathErrors(md, contentMd);
}

/**
 * A formula as presentation text: its TeX in dollars, from the annotation the
 * renderer keeps (§5.2). For excerpts, titles and labels only, where stripped
 * MathML would be a run of symbols. Never for the §2 text content, which has no
 * exception for a formula: `selectionText` strips tags and nothing else.
 */
function mathAsTex(html: string): string {
  if (!html.includes("<math")) return html;
  return replaceElements(html, ["math"], true, (_, open, inner, whole) => {
    const at = inner.indexOf('<annotation encoding="application/x-tex">');
    const end = at < 0 ? -1 : inner.indexOf("</annotation>", at);
    if (end < 0) return whole;
    const tex = inner.slice(at + '<annotation encoding="application/x-tex">'.length, end);
    const mark = /display="block"/.test(open) ? "$$" : "$";
    return ` ${mark}${tex.trim()}${mark} `;
  });
}

/**
 * Each `<name …>…</name>` in `html`, left to right, handed to `replace`; found
 * with indexOf and never with a lazy regex, which on hostile HTML (an opener
 * repeated with no closer) scans to the end once per opener: 0.7 s at 160 KB,
 * on the import and excerpt paths (Fable's review of studio#149, R3). Matches
 * what `/<(a|b)[^>]*>[\s\S]*?<\/\1>/gi` matched, `\b` after the name if
 * `bounded`: an opener with no closer is left alone, and so is every later
 * opener of that name, which cannot have one either.
 *
 * Linear (session 70, R3b): each name's next opener is remembered and searched
 * for again only once the scan has passed it, so a far `<style` is not sought
 * once per `<script>…</script>`. Positions come from a copy with only ASCII
 * lowered, which keeps every index (R3a): `toLowerCase` turns `İ` into two
 * code units and would slice the original in the wrong place.
 */
function replaceElements(html: string, names: string[], bounded: boolean, replace: (name: string, open: string, inner: string, whole: string) => string): string {
  const lower = html.replace(/[A-Z]+/g, (s) => s.toLowerCase());
  const opener = (name: string, from: number) => {
    let i = lower.indexOf(`<${name}`, from);
    while (bounded && i >= 0 && /[a-z0-9_]/.test(lower[i + name.length + 1] ?? "")) i = lower.indexOf(`<${name}`, i + 1);
    return i;
  };
  const next = new Map<string, number>();
  for (const name of names) {
    const i = opener(name, 0);
    if (i >= 0) next.set(name, i);
  }
  let out = "";
  let from = 0;
  while (next.size) {
    let at = -1;
    let name = "";
    for (const [candidate, i] of next) if (at < 0 || i < at) { at = i; name = candidate; }
    const openEnd = lower.indexOf(">", at);
    if (openEnd < 0) break;
    const close = lower.indexOf(`</${name}>`, openEnd + 1);
    if (close < 0) { next.delete(name); continue; }
    const end = close + name.length + 3;
    out += html.slice(from, at) + replace(name, html.slice(at, openEnd + 1), html.slice(openEnd + 1, close), html.slice(at, end));
    from = end;
    for (const [candidate, i] of next) {
      if (i >= end) continue;
      const j = opener(candidate, end);
      if (j < 0) next.delete(candidate);
      else next.set(candidate, j);
    }
  }
  return out + html.slice(from);
}
const withoutScripts = (html: string) => replaceElements(html, ["script", "style"], false, () => " ");

/** Plain text of rendered markdown, for feed titles and excerpts. */
export function plainText(contentMd: string): string {
  const html = mathAsTex(md.render(contentMd));
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/** First ~n chars of plain text, ellipsized. */
export function excerpt(contentMd: string, n = 60): string {
  const text = plainText(contentMd);
  return text.length <= n ? text : graphemePrefix(text, n).trimEnd() + "…";
}

/**
 * Spec §2 "Text content" (decision #118): a boundary at the start tag and the
 * end tag of each listed block element, and at every `br` and `hr`. A block is
 * a box, so text on either side of its edge is on different lines.
 */
const BLOCK_BOUNDARY = /<\/?(?:p|h[1-6]|li|ul|ol|dl|dt|dd|blockquote|pre|div|table|thead|tbody|tfoot|tr|td|th|figure|figcaption|section|article|aside|header|footer|details|summary)\b[^>]*>|<(?:br|hr)\b[^>]*>/gi;

/** Decode the entities our renderer and feed pipeline actually emit. */
export function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&hellip;/g, "…")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&ldquo;|&rdquo;/g, '"')
    .replace(/&lsquo;|&rsquo;/g, "'")
    .replace(/&amp;/g, "&"); // last, so "&amp;lt;" survives as the text "&lt;"
}

/**
 * Plain text from already-rendered HTML — used for thread content (which
 * stores baked content_html rather than independently re-renderable
 * markdown), for feed/page excerpts, and for studio list previews.
 *
 * The single implementation on purpose: a private copy in preview.ts is the
 * duplicated-detector drift that bit resolve.ts vs feed.ts in session 16.
 * Block ends become spaces so "…evil.</p><p>Next…" does not weld into
 * "evil.Next" — a real defect in the previous tag-strip-only version.
 */
export function plainTextFromHtml(html: string): string {
  return decodeEntities(
    withoutScripts(mathAsTex(html))
      .replace(BLOCK_BOUNDARY, " ")
      .replace(/<[^>]+>/g, ""),
  )
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * The **selection normalizer** for partial transclusion (spec §10.1–§10.3, decision
 * #49, plan §7.3 P2). Written once and exported, because the publish-time check
 * and any read-side re-check MUST agree exactly: two normalizers that differ by
 * one space are a construct that verifies on one node and fails on another.
 *
 * Same tag-stripping as `plainTextFromHtml`, one difference: a block boundary
 * becomes a **line break** rather than a space, so the shape of the target's
 * blocks survives into the string being searched. That is what lets a quote
 * spanning two paragraphs match — it is a line break on both sides — while a
 * quote that welds the end of one paragraph to the start of the next does not.
 *
 * Whitespace *within* a block collapses to single spaces, including the raw
 * newlines a markdown renderer leaves inside a `<p>` when the author soft-wrapped
 * their source. That is the subtle half: splitting the HTML on literal newlines
 * would make the match depend on where the *author* happened to press return,
 * which is not a property of the text at all. Hence the sentinel — boundaries
 * are marked before any whitespace collapsing, so only they survive as breaks.
 *
 * Empty segments are dropped, so `<p>a</p><p></p><p>b</p>` normalizes the same
 * as `<p>a</p><p>b</p>`.
 */
const BLOCK_SEP = "\u0000";

/** The line rule, shared by both entry points so they cannot drift apart. */
function normalizeBlocks(segments: string[]): string {
  return segments
    .map((seg) => seg.replace(/\s+/g, " ").trim())
    .filter((seg) => seg !== "")
    .join("\n");
}

export function selectionText(html: string): string {
  return normalizeBlocks(
    decodeEntities(
      withoutScripts(html)
        .replace(BLOCK_BOUNDARY, BLOCK_SEP)
        .replace(/<[^>]+>/g, ""),
    ).split(BLOCK_SEP),
  );
}

/** Where a line of `selectionText` sits in a list: one entry per enclosing list, outermost first. */
export interface ListLevel {
  /** Distinguishes two lists in one document. */
  list: number;
  tag: "ul" | "ol";
  /** The item's number as the source shows it (an `ol`'s `start` counted in; 1-based for `ul`). */
  ordinal: number;
}
export interface SelectionLine {
  text: string;
  /** The lists enclosing the line where its first character is; empty outside any list. */
  lists: ListLevel[];
}

/**
 * The lines of `selectionText`, each with the list structure it starts in
 * (decision #114): the same boundaries, the same stripping and the same
 * whitespace rule, so `lines.map(l => l.text).join("\n") === selectionText(html)`
 * (tested). A tight nested list's parent item and its first nested item are
 * two lines, as §2 reads every list item (decision #118).
 */
export function selectionLines(html: string): SelectionLine[] {
  const boundary = new RegExp(`^(?:${BLOCK_BOUNDARY.source})$`, "i");
  type Open = { list: number; tag: "ul" | "ol"; next: number } | { item: number };
  const stack: Open[] = [];
  let lists = 0;
  const chain = (): ListLevel[] => {
    const out: ListLevel[] = [];
    for (let i = 0; i < stack.length; i++) {
      const open = stack[i]!;
      if ("list" in open) {
        const item = stack[i + 1];
        if (item && "item" in item) out.push({ list: open.list, tag: open.tag, ordinal: item.item });
      }
    }
    return out;
  };
  const lines: SelectionLine[] = [];
  let raw = "";
  let at: ListLevel[] | null = null;
  const close = () => {
    const text = decodeEntities(raw).replace(/\s+/g, " ").trim();
    if (text) lines.push({ text, lists: at ?? [] });
    raw = "";
    at = null;
  };
  // Tags exactly as selectionText strips them (<[^>]+>); a lone "<" is text.
  for (const [token] of withoutScripts(html).matchAll(/<[^>]+>|<|[^<]+/g)) {
    if (token.length > 1 && token.startsWith("<")) {
      const tag = /^<\s*(\/?)\s*([a-z0-9]+)/i.exec(token);
      const name = tag?.[2]?.toLowerCase();
      if (tag && !tag[1] && (name === "ul" || name === "ol")) {
        const start = name === "ol" ? Number(/\bstart\s*=\s*["']?(-?\d+)/i.exec(token)?.[1] ?? 1) : 1;
        stack.push({ list: lists++, tag: name, next: Number.isSafeInteger(start) ? start : 1 });
      } else if (tag && !tag[1] && name === "li") {
        const list = [...stack].reverse().find((o): o is Extract<Open, { list: number }> => "list" in o);
        if (list) stack.push({ item: list.next++ });
      } else if (tag && tag[1] && name === "li") {
        const i = stack.map((o) => "item" in o).lastIndexOf(true);
        if (i >= 0) stack.length = i;
      } else if (tag && tag[1] && (name === "ul" || name === "ol")) {
        const i = stack.map((o) => "list" in o).lastIndexOf(true);
        if (i >= 0) stack.length = i;
      }
      // A line's place was fixed at its first character, so closing it after
      // the tag has changed the stack is safe.
      if (boundary.test(token)) close();
      continue;
    }
    if (at === null && /\S/.test(decodeEntities(token))) at = chain();
    raw += token;
  }
  close();
  return lines;
}

/**
 * The same rule applied to text that is already text — a browser selection,
 * where `Selection.toString()` has already put a newline at each block
 * boundary. Studio-side only: it is how the stub editor's passage chooser
 * turns what the author highlighted into the string `selectionText` will later
 * have to match.
 *
 * Separate entry point rather than a second implementation, because the two
 * *must* agree: this produces the quote, that checks it at publish, and a
 * disagreement between them would be an affordance that reliably produces
 * unpublishable drafts.
 */
/**
 * Whether a selection found in `html`'s text content takes in any part of a
 * formula (#105). The §2 text of a formula is what stripping its tags leaves,
 * which no reader would choose as a quote, so the studio refuses one rather
 * than bake it: the selection is in the text, and is not once every formula is
 * cut out.
 */
export function selectionTouchesMath(html: string, selection: string): boolean {
  if (!html.includes("<math")) return false;
  const holed = selectionText(replaceElements(html, ["math"], true, () => "\uFFFC"));
  return selectionText(html).includes(selection) && !holed.includes(selection);
}

export function normalizeSelection(text: string): string {
  return normalizeBlocks(text.split("\n"));
}

/**
 * A normalized selection as an attached markdown blockquote: `>` on every
 * line, a bare `>` between blocks, so it renders back to the same blocks.
 * Shared by the stub API and the stub editor's passage chooser.
 */
export function quoteLines(selection: string): string {
  return selection
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n>\n");
}

/** First ~n chars of already-rendered HTML's plain text, ellipsized. */
export function excerptFromHtml(html: string, n = 60): string {
  const text = plainTextFromHtml(html);
  return text.length <= n ? text : graphemePrefix(text, n).trimEnd() + "…";
}
