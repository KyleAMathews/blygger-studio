// A fork descends from the pinned document, not from its composition
// (decision #57, spec §16.6f; gate G11).
//
// A thread's `content_md` holds its quotes as `![[id]]` directives, which
// re-resolve at publish in the *forker's* context — a later version, a
// publish failure, quote-mentions sent on the forker's behalf. The pinned
// `content_html` already freezes every baked quote, nested ones included, so
// the fork is built from that:
//
//   - the thread's own prose is copied byte-exact from the pinned `content_md`;
//   - each top-level directive becomes an ordinary markdown blockquote of the
//     matching baked `blyg-transclusion` element, recursively, closed by an
//     attribution line linking the quoted item's page;
//   - no `blyg-transclusion` class survives — the forker baked and verified
//     nothing — and nothing is inherited into `transclusions[]`;
//   - generated text (`blyg-tk-gen`) comes back as `[TK]impyrt=…[/TK]`, so a
//     fork cannot launder a disclosure away (§5.7 rule 7). Fragments too: the
//     old fork dropped `generated[]` for both kinds.
//
// When the own-prose path cannot be made exact — the directives in the
// markdown do not line up with the baked quotes, or a generated span cannot be
// found in the markdown — the whole fork is rebuilt from the pinned HTML
// instead. Byte-exactness is given up before a disclosure is.

import { codeRanges, inRanges, lineOffsets } from "./code-ranges.ts";
import { attachedQuote } from "./directives.ts";
import { ID_ALPHABET } from "./identity.ts";
import type { ScopeProvenance } from "./types.ts";

const DIRECTIVE_LINE = new RegExp(`^\\s*!\\[\\[([${ID_ALPHABET}]{26})\\]\\]\\s*$`);

// ── A small, tolerant HTML tree for the dialect this client renders ─────────

type Node = { tag: string; attrs: Record<string, string>; children: Node[] } | string;
const VOID = new Set(["img", "br", "hr", "input", "meta", "link", "source", "wbr"]);

export function parseHtml(html: string): Node[] {
  const root: Node = { tag: "#root", attrs: {}, children: [] };
  const stack: Extract<Node, object>[] = [root];
  const re = /<!--[\s\S]*?-->|<\/([a-zA-Z][\w-]*)\s*>|<([a-zA-Z][\w-]*)((?:\s+[^\s=>\/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*(\/?)>|[^<]+|</g;
  for (const m of html.matchAll(re)) {
    const top = stack[stack.length - 1];
    if (m[0].startsWith("<!--")) continue;
    if (m[1]) {
      const name = m[1].toLowerCase();
      const at = stack.map((n) => n.tag).lastIndexOf(name);
      if (at > 0) stack.length = at;
      continue;
    }
    if (m[2]) {
      const name = m[2].toLowerCase();
      const attrs: Record<string, string> = {};
      for (const a of (m[3] ?? "").matchAll(/([^\s=>\/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) {
        attrs[a[1].toLowerCase()] = decode(a[2] ?? a[3] ?? a[4] ?? "");
      }
      const node = { tag: name, attrs, children: [] as Node[] };
      top.children.push(node);
      if (!VOID.has(name) && !m[4]) stack.push(node);
      continue;
    }
    top.children.push(m[0]);
  }
  return (root as Extract<Node, object>).children;
}

function decode(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp|#39);/gi, (_, e: string) => {
    const k = e.toLowerCase();
    if (k === "amp") return "&";
    if (k === "lt") return "<";
    if (k === "gt") return ">";
    if (k === "quot") return '"';
    if (k === "apos" || k === "#39") return "'";
    if (k === "nbsp") return " ";
    return String.fromCodePoint(k.startsWith("#x") ? parseInt(k.slice(2), 16) : parseInt(k.slice(1), 10));
  });
}

const hasClass = (n: Node, c: string) => typeof n !== "string" && (n.attrs.class ?? "").split(/\s+/).includes(c);
const isTransclusion = (n: Node) => hasClass(n, "blyg-transclusion");
const isGenerated = (n: Node) => hasClass(n, "blyg-tk-gen");

export function textOf(nodes: Node[]): string {
  return nodes.map((n) => (typeof n === "string" ? decode(n) : n.tag === "br" ? "\n" : textOf(n.children))).join("");
}

// ── HTML → markdown ────────────────────────────────────────────────────────

/** Escape characters that would otherwise turn quoted text into markup. */
const escapeText = (s: string) => s.replace(/([\\`*_[\]<])/g, "\\$1");

export interface FlattenContext {
  /** Identity origin of the layer being converted: a nested quote without `data-blyg-origin` was baked by this origin. */
  origin: string;
  /** The quoted item's page, or its item document when no page can be computed. */
  link: (origin: string, id: string) => Promise<string>;
}

function inline(nodes: Node[]): string {
  return nodes
    .map((n) => {
      if (typeof n === "string") return escapeText(decode(n)).replace(/\s*\n\s*/g, " ");
      const inner = () => inline(n.children);
      switch (n.tag) {
        case "em": case "i": return `*${inner()}*`;
        case "strong": case "b": return `**${inner()}**`;
        case "code": { const t = textOf(n.children); const fence = t.includes("`") ? "``" : "`"; return `${fence}${t}${fence}`; }
        case "a": return `[${inner()}](${n.attrs.href ?? ""})`;
        case "img": return `![${escapeText(n.attrs.alt ?? "")}](${n.attrs.src ?? ""})`;
        case "br": return "  \n";
        case "span": return isGenerated(n) ? `[TK]impyrt=${inner()}[/TK]` : inner();
        default: return inner();
      }
    })
    .join("");
}

async function blocks(nodes: Node[], ctx: FlattenContext): Promise<string[]> {
  const out: string[] = [];
  let run: Node[] = [];
  const flush = () => {
    const text = inline(run).trim();
    if (text) out.push(text);
    run = [];
  };
  for (const n of nodes) {
    if (typeof n === "string" || !BLOCK.has(n.tag)) {
      if (typeof n === "string" && !n.trim() && !run.length) continue;
      run.push(n);
      continue;
    }
    flush();
    out.push(...(await block(n, ctx)));
  }
  flush();
  return out;
}

const BLOCK = new Set(["p", "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li", "pre", "blockquote", "div", "hr", "table", "figure", "section"]);
const quote = (md: string) => md.split("\n").map((l) => (l ? `> ${l}` : ">")).join("\n");

async function block(n: Extract<Node, object>, ctx: FlattenContext): Promise<string[]> {
  if (isTransclusion(n)) return [await flattenQuote(n, ctx)];
  switch (n.tag) {
    case "p": return [inline(n.children).trim()].filter(Boolean);
    case "h1": case "h2": case "h3": case "h4": case "h5": case "h6":
      return [`${"#".repeat(Number(n.tag[1]))} ${inline(n.children).trim()}`];
    case "hr": return ["---"];
    case "pre": {
      const t = textOf(n.children).replace(/\n$/, "");
      const fence = t.includes("```") ? "~~~" : "```";
      return [`${fence}\n${t}\n${fence}`];
    }
    case "blockquote": return [quote((await blocks(n.children, ctx)).join("\n\n"))];
    case "ul": case "ol": {
      const items = n.children.filter((c): c is Extract<Node, object> => typeof c !== "string" && c.tag === "li");
      const lines: string[] = [];
      for (const [i, li] of items.entries()) {
        const marker = n.tag === "ol" ? `${i + 1}. ` : "- ";
        const body = (await blocks(li.children, ctx)).join("\n\n");
        lines.push(marker + body.split("\n").join("\n" + " ".repeat(marker.length)));
      }
      return [lines.join("\n")];
    }
    case "div":
      if (isGenerated(n)) return [`[TK]impyrt=${(await blocks(n.children, ctx)).join("\n\n")}[/TK]`];
      return blocks(n.children, ctx);
    default: return blocks(n.children, ctx);
  }
}

/** One baked quote as a plain blockquote with an attribution line; nested quotes nest. */
async function flattenQuote(n: Extract<Node, object>, ctx: FlattenContext): Promise<string> {
  const origin = n.attrs["data-blyg-origin"] || ctx.origin;
  const id = n.attrs["data-blyg-id"] ?? "";
  const version = n.attrs["data-blyg-version"];
  const body = (await blocks(n.children, { ...ctx, origin })).join("\n\n");
  let host = origin;
  try { host = new URL(origin).host; } catch { /* keep the raw origin */ }
  const label = `${host}${version ? ` · v${version}` : ""}`;
  const attribution = id ? `— quoted from [${label}](${await ctx.link(origin, id)})` : `— quoted from ${label}`;
  return quote(`${body}\n\n${attribution}`);
}

/** The whole pinned HTML as markdown — the fallback that never loses a disclosure. */
export async function htmlToMarkdown(html: string, ctx: FlattenContext): Promise<string> {
  return (await blocks(parseHtml(html), ctx)).join("\n\n") + "\n";
}

// ── The fork ───────────────────────────────────────────────────────────────

export interface ForkInput {
  contentMd: string;
  contentHtml: string;
  generated: ScopeProvenance[];
}

/** Top-level baked quotes in document order — nested ones belong to their parent. */
function topLevelQuotes(nodes: Node[]): Extract<Node, object>[] {
  const out: Extract<Node, object>[] = [];
  for (const n of nodes) {
    if (typeof n === "string") continue;
    if (isTransclusion(n)) out.push(n);
    else out.push(...topLevelQuotes(n.children));
  }
  return out;
}
function ownGenerated(nodes: Node[]): Extract<Node, object>[] {
  const out: Extract<Node, object>[] = [];
  for (const n of nodes) {
    if (typeof n === "string" || isTransclusion(n)) continue;
    if (isGenerated(n)) out.push(n);
    else out.push(...ownGenerated(n.children));
  }
  return out;
}

export async function flattenFork(input: ForkInput, ctx: FlattenContext): Promise<{ contentMd: string; exact: boolean }> {
  const tree = parseHtml(input.contentHtml);
  const quotes = topLevelQuotes(tree);

  // 1. Own prose, byte-exact, with each directive (and its attached quote) replaced.
  const lines = input.contentMd.split("\n");
  const code = codeRanges(input.contentMd);
  const starts = lineOffsets(lines);
  const out: string[] = [];
  let q = 0;
  for (let i = 0; i < lines.length; i++) {
    if (!inRanges(code, starts[i]) && DIRECTIVE_LINE.test(lines[i])) {
      if (q >= quotes.length) return { contentMd: await htmlToMarkdown(input.contentHtml, ctx), exact: false };
      const baked = quotes[q++];
      out.push(await flattenQuote(baked, ctx));
      // The `>` lines after a directive are an attached excerpt only if the
      // bake says it was partial (§16.4's second class). A client without
      // partial grammar baked a whole quote, and those lines are the author's
      // own prose, which §16.6f copies byte-exact (studio#29).
      if (hasClass(baked, "blyg-partial")) i = attachedQuote(lines, i).next - 1;
      // A blank line keeps the author's own blockquote from merging into the
      // flattened one, as it was a separate block in the pinned rendering.
      else if (/^\s{0,3}>/.test(lines[i + 1] ?? "")) out.push("");
      continue;
    }
    out.push(lines[i]);
  }
  if (q !== quotes.length) return { contentMd: await htmlToMarkdown(input.contentHtml, ctx), exact: false };
  let md = out.join("\n");

  // 2. Re-wrap the thread's own generated spans as impyrt, with their model.
  const spans = ownGenerated(tree);
  let cursor = 0;
  for (const [i, span] of spans.entries()) {
    const text = span.tag === "div" ? (await blocks(span.children, ctx)).join("\n\n") : inline(span.children);
    const at = md.indexOf(text, cursor);
    if (!text || at < 0) return { contentMd: await htmlToMarkdown(input.contentHtml, ctx), exact: false };
    const model = input.generated[i]?.model;
    const wrapped = `[TK]impyrt${model ? ` ${model}` : ""}=${text}[/TK]`;
    md = md.slice(0, at) + wrapped + md.slice(at + text.length);
    cursor = at + wrapped.length;
  }
  return { contentMd: md, exact: true };
}
