/*
 * The `catch-up` helper (blygger-spec docs/helpers-plan.md §7; after Burrow
 * 0.23.0's Catch up, Aneesh Sathe, from Venkat's request for a "conversation
 * graph microscope"). Mechanical: no model, no network.
 *
 * A thread with quotes, and quotes of quotes, is a conversation stored inside
 * out: the newest words on the outside, each layer a baked snapshot of what it
 * answered (§10.2, `data-blyg-*` at every depth). Catch up lays it out the other
 * way round, oldest first, each card holding only that post's own words, so a
 * reader can follow it in order.
 *
 * Order: by each post's own time when every card has one (held items: the
 * version's changelog time, else the item's times; own items: the version's
 * publication); otherwise deeper first, since a quote is always of something
 * that already existed, then by time, then by place in the thread.
 */
import { sanitizeHtml } from "../importer/sanitize.ts";
import { clampedTime } from "../burst.ts";
import { OWN_SUBSCRIPTION } from "../own-subscription.ts";

export interface CatchUpCard {
  /** The quoted item's id; the entry itself for the outermost card. */
  id: string;
  /** Its blyg's origin, inherited down the tree when a layer names none (§10.2). */
  origin: string;
  /** The subscription it is held under, `~own` for our own items, or null when it is not held here. */
  sub: string | null;
  version: number | null;
  /** Whose it is: the subscription's name, "you", or the origin's host. */
  source: string;
  /** When that version was published, as far as this reader knows (ISO), or null. */
  at: string | null;
  /** 0 for the entry, 1 for what it quotes, 2 for what that quotes, … */
  depth: number;
  /** True when the layer is an excerpt (`blyg-partial`). */
  partial: boolean;
  /** The quoter's label for the quote (`data-blyg-label`), when the bake carries one. */
  label: string | null;
  /** The post's own words: the layer with every quote inside it taken out, sanitized. */
  html: string;
}

interface Layer { id: string | null; origin: string; version: number | null; partial: boolean; label: string | null; depth: number; start: number; end: number; children: Layer[]; transclusion: boolean }

const attr = (tag: string, name: string) => {
  const m = new RegExp(`\\b${name}="([^"]*)"`).exec(tag);
  return m ? m[1]!.replace(/&quot;/g, '"').replace(/&amp;/g, "&") : null;
};
const withSlash = (o: string) => o.replace(/\/?$/, "/");

/** The quote layers of baked HTML as a tree, each with the range of its inner HTML. */
export function quoteLayers(html: string, origin: string): Layer {
  const root: Layer = { id: null, origin: withSlash(origin), version: null, partial: false, label: null, depth: 0, start: 0, end: html.length, children: [], transclusion: true };
  const stack: Layer[] = [root];
  for (const m of html.matchAll(/<(\/?)blockquote\b([^>]*)>/gi)) {
    const parent = stack[stack.length - 1]!;
    if (!m[1]) {
      const tag = m[2] ?? "";
      const transclusion = /\bclass="[^"]*\bblyg-transclusion\b/.test(tag);
      const inherited = stack.slice().reverse().find((l) => l.transclusion)!;
      const layer: Layer = {
        id: transclusion ? attr(tag, "data-blyg-id") : null,
        origin: transclusion ? withSlash(attr(tag, "data-blyg-origin") || inherited.origin) : inherited.origin,
        version: transclusion ? Number(attr(tag, "data-blyg-version")) || null : null,
        partial: /\bblyg-partial\b/.test(tag),
        label: transclusion ? attr(tag, "data-blyg-label") : null,
        depth: transclusion ? inherited.depth + 1 : inherited.depth,
        start: m.index! + m[0].length,
        end: html.length,
        children: [],
        transclusion,
      };
      parent.children.push(layer);
      stack.push(layer);
    } else if (stack.length > 1) {
      stack.pop()!.end = m.index!;
    }
  }
  return root;
}

/** A layer's own HTML: its inner HTML with every quote layer inside it cut out (plain blockquotes stay). */
function ownHtml(html: string, layer: Layer): string {
  const cuts: { start: number; end: number }[] = [];
  const collect = (l: Layer) => {
    for (const c of l.children) {
      if (c.transclusion) cuts.push({ start: c.start, end: c.end });
      else collect(c);
    }
  };
  collect(layer);
  let out = "";
  let at = layer.start;
  for (const cut of cuts) {
    // Take the opening tag of the cut layer out with it.
    const open = html.lastIndexOf("<blockquote", cut.start);
    out += html.slice(at, open);
    at = html.indexOf(">", cut.end) + 1;
  }
  out += html.slice(at, layer.end);
  // A plain wrapper left empty by the cuts says nothing.
  return out.replace(/<blockquote\b[^>]*>\s*<\/blockquote>/gi, "").trim();
}

function flatten(layer: Layer, out: Layer[] = []): Layer[] {
  for (const c of layer.children) {
    if (c.transclusion && c.id) out.push(c);
    flatten(c, out);
  }
  return out;
}

interface Held { sub: string; title: string; origin: string }
type Entry = { sub: string; remoteId: string };

/**
 * Catch up on one reading entry: its quote layers, oldest first, each with
 * only its own words. Null when the entry is not held here.
 */
export async function catchUp(db: D1Database, entry: Entry, ownOrigin: string): Promise<{ cards: CatchUpCard[]; ordered: "time" | "depth" } | null> {
  const own = entry.sub === OWN_SUBSCRIPTION;
  const row = own
    ? await db.prepare(`SELECT v.content_html, v.published_at AS at, i.version FROM items i JOIN versions v ON v.item_id = i.id AND v.version = i.version
        WHERE i.id = ? AND i.status = 'public'`).bind(entry.remoteId).first<{ content_html: string; at: string; version: number }>()
    : await db.prepare(`SELECT ii.content_html, ii.updated, ii.observed_at, ii.version, s.origin FROM imported_items ii JOIN subscriptions s ON s.id = ii.subscription_id
        WHERE ii.subscription_id = ? AND ii.remote_id = ? AND ii.state = 'current'`).bind(entry.sub, entry.remoteId).first<{ content_html: string; updated: string | null; observed_at: string; version: number; origin: string }>();
  if (!row) return null;
  const origin = withSlash(own ? ownOrigin : (row as { origin: string }).origin);
  const html = row.content_html ?? "";
  const tree = quoteLayers(html, origin);
  const layers = flatten(tree);

  const subs = (await db.prepare("SELECT id, title, origin FROM subscriptions WHERE kind = 'blyg'").all<{ id: string; title: string; origin: string }>()).results;
  const byOrigin = new Map<string, Held>(subs.map((s) => [withSlash(s.origin), { sub: s.id, title: s.title, origin: s.origin }]));
  const mine = withSlash(ownOrigin);
  const sourceOf = (o: string) => (o === mine ? "you" : byOrigin.get(o)?.title ?? (URL.canParse(o) ? new URL(o).host : o));

  // Times for every quoted layer we hold: own versions, and imported changelogs (migration 0051).
  const ownIds = layers.filter((l) => l.origin === mine).map((l) => l.id!);
  const heldPairs = layers.filter((l) => l.origin !== mine && byOrigin.has(l.origin)).map((l) => [byOrigin.get(l.origin)!.sub, l.id!]);
  const [ownVersions, importedRows] = await Promise.all([
    ownIds.length ? db.prepare(`SELECT item_id, version, published_at FROM versions WHERE item_id IN (SELECT value FROM json_each(?))`).bind(JSON.stringify(ownIds)).all<{ item_id: string; version: number; published_at: string }>() : { results: [] },
    heldPairs.length ? db.prepare(`SELECT subscription_id, remote_id, version, created, updated, observed_at, changelog_json FROM imported_items
      WHERE (subscription_id, remote_id) IN (SELECT json_extract(value, '$[0]'), json_extract(value, '$[1]') FROM json_each(?))`).bind(JSON.stringify(heldPairs)).all<{ subscription_id: string; remote_id: string; version: number; created: string | null; updated: string | null; observed_at: string; changelog_json: string | null }>() : { results: [] },
  ]);
  const iso = (ms: number) => (Number.isFinite(ms) ? new Date(ms).toISOString() : null);
  const timeOf = (layer: Layer): { sub: string | null; at: string | null } => {
    if (layer.origin === mine) {
      const v = ownVersions.results.find((r) => r.item_id === layer.id && (layer.version === null || r.version === layer.version));
      return { sub: OWN_SUBSCRIPTION, at: v ? iso(Date.parse(v.published_at)) : null };
    }
    const held = byOrigin.get(layer.origin);
    const r = held ? importedRows.results.find((x) => x.subscription_id === held.sub && x.remote_id === layer.id) : undefined;
    if (!held || !r) return { sub: null, at: null };
    let logged: string | undefined;
    try {
      const log = JSON.parse(r.changelog_json ?? "[]") as { version?: number; at?: string }[];
      logged = log.find((e) => e.version === layer.version)?.at;
    } catch {
      // A malformed changelog reads as none.
    }
    const asserted = logged ?? (layer.version === 1 || layer.version === null ? r.created : layer.version === r.version ? r.updated : null);
    return { sub: held.sub, at: asserted ? iso(clampedTime(asserted, r.observed_at)) : null };
  };

  const seen = new Set<string>();
  const cards: (CatchUpCard & { place: number })[] = [];
  const rootAt = own ? (row as { at: string }).at : clampedTime((row as { updated: string | null }).updated, (row as { observed_at: string }).observed_at);
  cards.push({
    id: entry.remoteId, origin, sub: entry.sub, version: row.version, source: sourceOf(origin),
    at: typeof rootAt === "string" ? iso(Date.parse(rootAt)) : iso(rootAt), depth: 0, partial: false, label: null,
    html: await sanitizeHtml(ownHtml(html, tree)), place: 0,
  });
  for (const [place, layer] of layers.entries()) {
    const key = `${layer.origin}|${layer.id}|${layer.version}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const { sub, at } = timeOf(layer);
    cards.push({
      id: layer.id!, origin: layer.origin, sub, version: layer.version, source: sourceOf(layer.origin), at,
      depth: layer.depth, partial: layer.partial, label: layer.label, html: await sanitizeHtml(ownHtml(html, layer)), place: place + 1,
    });
  }
  const timed = cards.every((c) => c.at);
  cards.sort((a, b) =>
    timed
      ? a.at!.localeCompare(b.at!) || b.depth - a.depth || a.place - b.place
      : b.depth - a.depth || (a.at && b.at ? a.at.localeCompare(b.at) : 0) || a.place - b.place);
  return { cards: cards.map(({ place: _place, ...card }) => card), ordered: timed ? "time" : "depth" };
}
