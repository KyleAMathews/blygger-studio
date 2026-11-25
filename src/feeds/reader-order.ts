/*
 * The pace-layered order in the reader (ROADMAP row 69): the home page's
 * algorithm (pace-layered.ts, RFC-3) run over everything the owner reads,
 * their own items and every subscription's, as one stream. A new item from any
 * blyg is a tick that sinks the rest; a new version climbs one place, none
 * when it was maintenance; pins slow the sinking. Pin weight travels only
 * within a blyg (own-origin quotes), and only the publisher's own pins count:
 * decision #73 (3) keeps inbound pins to extensions.
 *
 * Inputs are what a subscriber holds: an imported item's changelog as last
 * fetched (migration 0051) and the versions this reader judged maintenance
 * when they arrived. An item imported before 0051 has no stored changelog
 * until its next version; it counts as its first and latest versions.
 *
 * The order is stored as positions (`reading_order`) and rebuilt when the
 * ranking inputs change (reader-order-cache.ts). Pages still use the broader
 * Reading generation to expire on presentation changes too.
 */
import { clampedTime } from "../burst.ts";
import { loadFeedHistory } from "./history.ts";
import { paceLayeredOrder } from "./pace-layered.ts";
import type { FeedHistoryItem, FeedVersion } from "./types.ts";

/** The reader orders whose positions it stores; `newest` needs none. */
export const READER_ORDERS = ["newest", "pace-layered"] as const;
export type ReaderOrder = (typeof READER_ORDERS)[number];

/**
 * How many entries, by latest activity, the replay ranks. The rest follow in
 * newest-first order beneath them: an entry that has sunk past this many is
 * below anything the reader scrolls to, and the bound keeps the replay's cost
 * (every tick sinks every entry) flat as subscriptions grow.
 */
export const READER_ORDER_WINDOW = 500;

type Identity = { source: "own" | "imported"; sub: string; id: string };
const keyOf = (i: Identity) => JSON.stringify([i.source, i.sub, i.id]);
const iso = (ms: number) => new Date(ms).toISOString();

interface ImportedRow {
  subscription_id: string; remote_id: string; kind: string; state: string; version: number;
  created: string | null; updated: string | null; observed_at: string; l0: number;
  changelog_json: string | null; maintenance_json: string | null; transclusions_json: string | null; origin: string;
}

function parseArray(raw: string | null): unknown[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

/** The quotes of an imported item from its own blyg: no `origin`, or this blyg's. */
function sameBlygQuotes(json: string | null, origin: string): string[] {
  const own = origin.replace(/\/?$/, "/");
  return [...new Set(parseArray(json).flatMap((q) => {
    if (!q || typeof q !== "object" || typeof (q as { id?: unknown }).id !== "string") return [];
    const o = (q as { origin?: unknown }).origin;
    return o === undefined || (typeof o === "string" && o.replace(/\/?$/, "/") === own) ? [(q as { id: string }).id] : [];
  }))];
}

/**
 * An imported item's versions as the order reads them. Times are clamped to
 * when this reader saw the item, so a future-dated changelog cannot hold an
 * item on top. The current quotes stand for every pinned version's: a pinned
 * file's own quotes are not fetched, and a quote rarely changes across pins.
 */
export function importedVersions(row: ImportedRow): FeedVersion[] {
  const observed = Date.parse(row.observed_at);
  const at = (asserted: string | null) => iso(clampedTime(asserted, row.observed_at) || observed);
  const maintenance = new Set(parseArray(row.maintenance_json).filter((v): v is number => typeof v === "number"));
  const quotes = row.l0 ? [] : sameBlygQuotes(row.transclusions_json, row.origin);
  const logged = parseArray(row.changelog_json).flatMap((e) => {
    const entry = e as { version?: unknown; at?: unknown; note?: unknown; pinned?: unknown };
    return typeof entry?.version === "number" && entry.version <= row.version ? [entry as { version: number; at?: unknown; note?: unknown; pinned?: unknown }] : [];
  });
  const versions: FeedVersion[] = logged.length
    ? logged.map((e) => ({
      version: e.version,
      at: at(typeof e.at === "string" ? e.at : row.updated),
      note: typeof e.note === "string" ? e.note : null,
      pinned: e.pinned === true,
      quotes: e.pinned === true || e.version === row.version ? quotes : [],
    }))
    : [
      { version: 1, at: at(row.created ?? row.updated), note: null, pinned: false, quotes: row.version === 1 ? quotes : [] },
      ...(row.version > 1 ? [{ version: row.version, at: at(row.updated), note: null, pinned: false, quotes }] : []),
    ];
  return versions
    .map((v) => (maintenance.has(v.version) ? { ...v, maintenance: true } : v))
    .sort((a, b) => a.version - b.version);
}

/** Everything the reader shows, as one history keyed by reading identity, with each key's latest activity. */
export async function loadReaderHistory(db: D1Database): Promise<{ items: FeedHistoryItem[]; identities: Map<string, Identity> }> {
  const [own, imported, kept] = await Promise.all([
    loadFeedHistory(db),
    db.prepare(`SELECT ii.subscription_id, ii.remote_id, ii.kind, ii.state, ii.version, ii.created, ii.updated, ii.observed_at, ii.l0,
        ii.changelog_json, ii.maintenance_json, ii.transclusions_json, s.origin
      FROM imported_items ii JOIN subscriptions s ON s.id = ii.subscription_id`).all<ImportedRow>(),
    // Private items are the owner's reader too (Venkat, 2026-11-22), ranked by their private
    // versions; without a position one sorted above everything (0.72.1). Studio-only: the
    // public feed's history, loadFeedHistory, never reads private_versions.
    db.prepare(`SELECT i.id, i.kind, p.version, p.published_at, p.note FROM items i
      JOIN private_versions p ON p.item_id = i.id WHERE i.status = 'private' ORDER BY i.id, p.version`)
      .all<{ id: string; kind: string; version: number; published_at: string; note: string | null }>(),
  ]);
  const identities = new Map<string, Identity>();
  const items: FeedHistoryItem[] = [];
  for (const item of own.items) {
    const identity: Identity = { source: "own", sub: "", id: item.id };
    const key = keyOf(identity);
    identities.set(key, identity);
    // One time format across both kinds, since the replay compares them as strings.
    items.push({ ...item, id: key, versions: item.versions.map((v) => ({ ...v, at: iso(Date.parse(v.at)), quotes: v.quotes.map((q) => keyOf({ source: "own", sub: "", id: q })) })) });
  }
  const privateItems = new Map<string, FeedHistoryItem>();
  for (const row of kept.results) {
    const item = privateItems.get(row.id) ?? { id: row.id, kind: row.kind === "thread" ? "thread" as const : "fragment" as const, withdrawn: false, versions: [] };
    item.versions.push({ version: row.version, at: iso(Date.parse(row.published_at)), note: row.note, pinned: false, quotes: [] });
    privateItems.set(row.id, item);
  }
  for (const item of privateItems.values()) {
    const identity: Identity = { source: "own", sub: "", id: item.id };
    const key = keyOf(identity);
    identities.set(key, identity);
    items.push({ ...item, id: key });
  }
  for (const row of imported.results) {
    const identity: Identity = { source: "imported", sub: row.subscription_id, id: row.remote_id };
    const key = keyOf(identity);
    identities.set(key, identity);
    const versions = importedVersions(row).map((v) => ({ ...v, quotes: v.quotes.map((q) => keyOf({ source: "imported", sub: row.subscription_id, id: q })) }));
    items.push({ id: key, kind: row.kind === "thread" ? "thread" : "fragment", withdrawn: row.state !== "current", versions });
  }
  return { items, identities };
}

const lastAt = (item: FeedHistoryItem) => item.versions.at(-1)?.at ?? "";

/**
 * Every reading identity's position, top first: the replay over the newest
 * READER_ORDER_WINDOW entries, then the rest newest first, withdrawn last.
 */
export function readerPositions(items: FeedHistoryItem[]): string[] {
  const live = items.filter((i) => !i.withdrawn && i.versions.length).sort((a, b) => lastAt(b).localeCompare(lastAt(a)));
  const window = new Set(live.slice(0, READER_ORDER_WINDOW).map((i) => i.id));
  // The replay reads pins and quotes from every item, withdrawn ones too
  // (pinned versions are served forever), but ranks only the window.
  const replay = items
    .filter((i) => window.has(i.id) || i.withdrawn)
    .sort((a, b) => (a.versions[0]?.at ?? "").localeCompare(b.versions[0]?.at ?? ""));
  const ranked = paceLayeredOrder({ items: replay });
  const rest = live.slice(READER_ORDER_WINDOW).map((i) => i.id);
  const withdrawn = items.filter((i) => i.withdrawn).sort((a, b) => lastAt(b).localeCompare(lastAt(a))).map((i) => i.id);
  return [...ranked, ...rest, ...withdrawn];
}
