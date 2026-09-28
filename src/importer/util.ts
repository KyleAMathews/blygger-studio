// Small helpers shared by the poll cycle and cron wiring.

/** Run `fn` over `items` with at most `limit` in flight at once (§3.2: "bounded concurrency ~4"). */
export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

/** Exponential backoff, §3.2: min(2^fails * base, cap). */
export function backoffMs(fails: number, baseMs: number, capMs: number): number {
  return Math.min(2 ** fails * baseMs, capMs);
}

/**
 * Permalink on the origin for an imported blyg-native item. The remote id *is*
 * the protocol item id (§2.1), so the origin's own page route reconstructs
 * exactly. L0 items have no such route — their link is whatever the feed gave,
 * already embedded in the rendered content — so callers handle those
 * separately. Shared rather than rebuilt per call site: the public hopper page
 * and the studio both need it, and two copies of a URL shape drift.
 */
export function blygItemUrl(origin: string, kind: string, remoteId: string, page?: string | null): string {
  // §2.3.2 (decision #29): the origin's own `page` wins when we have it. The
  // f/·t/ shape is this client's convention, which 0.2 §4 calls presentation —
  // fine as a fallback, never as an assumption about someone else's blyg.
  if (page) return `${origin}${page.replace(/^\//, "")}`;
  return `${origin}${kind === "thread" ? "t" : "f"}/${remoteId}/`;
}

/**
 * Title and link for the "respond" gesture, from an imported item's stored
 * HTML. L0 content leads with the anchor l0.ts rendered from "[title](link)";
 * blyg-native content leads with the author's own markdown heading, if any.
 */
export function sourceTitleAndUrl(
  row: { l0: number; kind: string; remote_id: string; content_html: string; page?: string | null },
  origin: string,
): { title: string | null; url: string } {
  if (row.l0) {
    const m = /<a\s[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/i.exec(row.content_html);
    if (m) return { title: decodeEntities(stripTags(m[2])).trim() || null, url: m[1] };
    return { title: null, url: origin };
  }
  return { title: null, url: blygItemUrl(origin, row.kind, row.remote_id, row.page) };
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, "");
}

function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

/**
 * A URL as a reader should see it: the address itself, short enough to sit in a
 * byline.
 *
 * The reading feed showed only an `open ↗` affordance, which is fine until two
 * entries look alike — several origins stubbing the same item, or a restub
 * chain, where every body carries the same quoted passage and the only thing
 * that tells them apart is *where each one lives*. That was invisible, so the
 * feed read as repetition.
 *
 * Elides the 26-character item id rather than truncating the whole string: the
 * host and the shape of the path are the identifying parts, and an id is the
 * one segment a human never reads. `https://` goes because every one of these
 * is https and a column of identical prefixes hides the part that differs.
 */
export function displayUrl(url: string): string {
  // Elide first, on the raw string, so this works for a relative href as well
  // as an absolute one. Own items link to `/f/{id}/` — no scheme, no host —
  // and an earlier version parsed with `new URL()` first and returned the
  // input untouched when that threw, so every one of our own entries printed a
  // full 26-character id. The tests asserted on the `href`, which was correct,
  // and never looked at the label; it took looking at the page.
  const elide = (p: string): string =>
    p
      .split("/")
      .map((seg) => (/^[0-9a-z]{26}$/.test(seg) ? `${seg.slice(0, 8)}…` : seg))
      .join("/");

  let shown: string;
  try {
    const u = new URL(url);
    // The scheme goes: it is https on every row, and a column of identical
    // prefixes hides the part that differs.
    shown = `${u.host}${elide(u.pathname)}${u.search}`;
  } catch {
    shown = elide(url);
  }
  // Anything still absurd is a pathological path, not an id; cut it rather than
  // let one entry blow out the column.
  return shown.length > 72 ? `${shown.slice(0, 71)}…` : shown;
}
