// Context hydration for TK generation (ROADMAP row 146, first part; Fable
// ruling of session 79, decision #117). Before a scope is generated, the
// links its author already placed — in the instruction or anywhere in the
// draft — are read, so the model writes from what they say rather than from
// what their URLs suggest. A link carries no new intention: the author put it
// there. Its words are still input, so everything fed is disclosed (§5.7
// rule 1): an item as a reference, a web page as a `{url, cited}` entry.
//
// Two kinds of link:
//  - `[[id]]` links resolve like a directive (§5.7 rule 8): the local
//    snapshot, never a live fetch. A remote one notifies as a `source`.
//  - http(s) URLs are fetched live under the importer's outbound hygiene
//    (§14). A URL that names an item this blyg already holds (ours, or one
//    imported from that host) is that item instead, by the rule above.
//
// Nothing is fed that was not read: a link that could not be read is
// reported, never guessed at, and the caller asks the author before
// generating without it.

import { selectionText } from "./markdown.ts";
import { ID, LINK_INLINE } from "./grammar.ts";
import { platformFetchFor, type FetchLike } from "./importer/http.ts";
import { resolveTarget, type ResolvedTarget } from "./transclusion.ts";
import type { Env, GenerationSource, StubCite } from "./types.ts";

/** At most this many web pages and this many linked items are read per generation. */
export const HYDRATE_MAX_PAGES = 8;
export const HYDRATE_MAX_ITEMS = 8;
/** A page's text is cut to this many characters before it reaches the model. */
export const HYDRATE_PAGE_CHARS = 30_000;
/** Less readable text than this is a page that needs a browser, not one we read. */
const MIN_PAGE_CHARS = 200;

export interface HydratedItem {
  id: string;
  target: ResolvedTarget;
}
export interface HydratedPage {
  url: string;
  title: string;
  text: string;
  cited: StubCite;
}
export interface HydrationFailure {
  /** The link as the author wrote it: a URL, or `[[id]]`. */
  link: string;
  reason: string;
}
export interface Hydration {
  items: HydratedItem[];
  pages: HydratedPage[];
  failed: HydrationFailure[];
  /** Every distinct link found, read or not. */
  total: number;
}

/** A URL's trailing sentence punctuation is the sentence's, not the URL's. */
const URL_RE = /https?:\/\/[^\s<>()\[\]"'`]+/gi;
const TRAILING = /[.,;:!?*_~]+$/;

/** The distinct http(s) URLs in `text`, in order of appearance. */
export function extractUrls(text: string): string[] {
  const seen = new Set<string>();
  for (const [raw] of text.matchAll(URL_RE)) {
    const url = raw.replace(TRAILING, "");
    try {
      seen.add(new URL(url).toString());
    } catch {
      // Not a URL after all; skip it.
    }
  }
  return [...seen];
}

/** The distinct ids of `[[id]]` links (not `![[id]]` directives) in `text`. */
export function extractLinkIds(text: string): string[] {
  const seen = new Set<string>();
  for (const [, id] of text.matchAll(new RegExp(LINK_INLINE.source, "g"))) if (id) seen.add(id);
  return [...seen];
}

const DROP_ELEMENTS = ["script", "style", "noscript", "svg", "nav", "header", "footer", "aside", "form", "template", "iframe"];

function dropElements(html: string): string {
  let out = html;
  for (const tag of DROP_ELEMENTS) out = out.replace(new RegExp(`<${tag}\\b[\\s\\S]*?</${tag}>`, "gi"), " ");
  return out.replace(/<!--[\s\S]*?-->/g, " ");
}

function meta(html: string, property: string): string | null {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]*>`, "i");
  const tag = re.exec(html)?.[0];
  return tag ? (/content=["']([^"']*)["']/i.exec(tag)?.[1] ?? null) : null;
}

/** The readable text of an HTML page: its `article` or `main` if it has one, the body otherwise. */
export function pageText(html: string): { title: string; siteName: string | null; text: string } {
  const decode = (s: string) => selectionText(s).replace(/\s+/g, " ").trim();
  const title = decode(meta(html, "og:title") ?? /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? "");
  const siteName = meta(html, "og:site_name");
  const body = dropElements(/<body\b[\s\S]*<\/body>/i.exec(html)?.[0] ?? html);
  const region = /<article\b[\s\S]*<\/article>/i.exec(body)?.[0] ?? /<main\b[\s\S]*<\/main>/i.exec(body)?.[0] ?? body;
  return { title, siteName: siteName ? decode(siteName) : null, text: selectionText(region) };
}

/** A URL that names an item this blyg holds: ours on our host, or one imported from that host. */
async function heldItem(db: D1Database, url: URL, ourOrigin: string): Promise<HydratedItem | null> {
  const ids = url.pathname.match(new RegExp(ID, "g")) ?? [];
  for (const id of ids) {
    const resolved = await resolveTarget(db, id);
    if (!resolved.ok) continue;
    const home = resolved.target.origin ?? ourOrigin;
    if (home && new URL(home).host === url.host) return { id, target: resolved.target };
  }
  return null;
}

async function fetchPage(fetchImpl: FetchLike, url: string, at: string): Promise<HydratedPage | HydrationFailure> {
  let res;
  try {
    res = await fetchImpl(url, { headers: { Accept: "text/html, text/plain;q=0.9" } });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { link: url, reason: /timed? ?out|abort/i.test(message) ? "timed out" : message };
  }
  if (!res.ok) return { link: url, reason: res.status === 429 || res.status === 403 ? `the site refused it (HTTP ${res.status})` : `HTTP ${res.status}` };
  const type = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  if (type && type !== "text/html" && type !== "application/xhtml+xml" && type !== "text/plain") {
    await res.body?.cancel();
    return { link: url, reason: `not a web page (${type})` };
  }
  let body;
  try {
    body = await res.text();
  } catch (e) {
    return { link: url, reason: e instanceof Error ? e.message : String(e) };
  }
  const { title, siteName, text } = type === "text/plain" ? { title: "", siteName: null, text: body.trim() } : pageText(body);
  if (text.length < MIN_PAGE_CHARS) return { link: url, reason: "no readable text (the page may need a browser to run it)" };
  const host = new URL(res.url).host;
  const cited: StubCite = { source: siteName || host, url, retrieved: at, ...(title ? { excerpt: title } : {}) };
  return { url, title, text: text.length > HYDRATE_PAGE_CHARS ? `${text.slice(0, HYDRATE_PAGE_CHARS)}\n[…cut at ${HYDRATE_PAGE_CHARS} characters]` : text, cited };
}

/**
 * Read every link in `texts` that a generation may draw on. `exclude` holds
 * the ids that are already sources (the scope's own `![[id]]` refs) or must
 * not be (the item being written).
 */
export async function hydrate(
  env: Env,
  texts: string[],
  opts: { exclude: Set<string>; ourOrigin: string; at: string; fetchImpl?: FetchLike },
): Promise<Hydration> {
  const fetchImpl = opts.fetchImpl ?? platformFetchFor(env);
  const all = texts.join("\n\n");
  const failed: HydrationFailure[] = [];
  const items: HydratedItem[] = [];
  const pages: HydratedPage[] = [];
  const seenIds = new Set(opts.exclude);

  const ids = extractLinkIds(all).filter((id) => !seenIds.has(id));
  for (const [n, id] of ids.entries()) {
    seenIds.add(id);
    if (n >= HYDRATE_MAX_ITEMS) {
      failed.push({ link: `[[${id}]]`, reason: `not read: over the limit of ${HYDRATE_MAX_ITEMS} linked items` });
      continue;
    }
    const resolved = await resolveTarget(env.DB, id);
    if (resolved.ok) items.push({ id, target: resolved.target });
    else failed.push({ link: `[[${id}]]`, reason: resolved.reason });
  }

  const urls = extractUrls(all);
  const toFetch: string[] = [];
  for (const url of urls) {
    const held = await heldItem(env.DB, new URL(url), opts.ourOrigin);
    if (held) {
      if (!seenIds.has(held.id)) {
        seenIds.add(held.id);
        items.push(held);
      }
      continue;
    }
    if (toFetch.length >= HYDRATE_MAX_PAGES) failed.push({ link: url, reason: `not read: over the limit of ${HYDRATE_MAX_PAGES} pages` });
    else toFetch.push(url);
  }
  for (const result of await Promise.all(toFetch.map((url) => fetchPage(fetchImpl, url, opts.at)))) {
    if ("text" in result) pages.push(result);
    else failed.push(result);
  }
  return { items, pages, failed, total: ids.length + urls.length };
}

/** A page's disclosure entry (§5.7 rule 1 as ruled by #117): §10.6's plain-web shape. */
export function pageSource(page: HydratedPage): GenerationSource {
  return { url: page.url, cited: page.cited };
}
