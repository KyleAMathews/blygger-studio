// Background and Foreground in the reader (blygger-spec docs/background-plan.md).
// Studio-private and reader-only (migration 0046): no item document, feed,
// manifest, public page or export reads any of this, and a placement never
// marks anything read.
//
// An entry is in Background when the owner placed the item there, or, with no
// choice on the item, when its blyg is placed there or any enabled reason
// applies. A choice of Foreground on the item beats everything else.
// Precedence: the item → the blyg → the rules (plan §1).
//
// Reasons are stored as facts (`bg_reasons`) when a version arrives; Settings
// decide at query time which count, so a rule turned off moves its items back
// at once and nothing is recomputed.

import { extractDirectives } from "./directives.ts";
import { clampedTime, saysNoMoreThanLink, withinBurst, withinLinkBurst } from "./burst.ts";
import { isNearSame } from "./change-size.ts";
import { plainTextFromHtml } from "./markdown.ts";

/**
 * The rules an owner can turn off, in the order Settings lists them, which is
 * also the order a chip picks its reason in. Withdrawn is not here: it is
 * always on. `minor` is computed for own items only (4a). Phase 2 (session 77)
 * adds the measured rules: `quotes-refreshed`, `near-same` and `superseded`.
 *
 * `quotes-material` is a refresh that brought in a quote whose text changed
 * beyond near-same (plan §2.1). It counts only while `quotes-refreshed` does
 * too; turning it off is the plan's "material quote change" toggle, keeping
 * such refreshes in the main lenses.
 */
export const BACKGROUND_RULES = ["burst", "wordless", "maintenance", "quotes-refreshed", "quotes-material", "near-same", "minor", "superseded"] as const;
export type BackgroundRule = (typeof BACKGROUND_RULES)[number];
export type BackgroundReason = BackgroundRule | "withdrawn";
export type Placement = "background" | "foreground";

/** `bg_rules` is a JSON object of rule → on/off over all-on defaults, so a rule added later starts on. */
export function parseBackgroundRules(raw: string | undefined | null): Record<BackgroundRule, boolean> {
  let stored: Record<string, unknown> = {};
  try {
    const parsed: unknown = JSON.parse(raw ?? "{}");
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) stored = parsed as Record<string, unknown>;
  } catch {
    // Malformed reads as the defaults.
  }
  return Object.fromEntries(BACKGROUND_RULES.map((rule) => [rule, stored[rule] !== false])) as Record<BackgroundRule, boolean>;
}

export const enabledRules = (rules: Record<BackgroundRule, boolean>): BackgroundRule[] =>
  BACKGROUND_RULES.filter((rule) => rules[rule] && (rule !== "quotes-material" || rules["quotes-refreshed"]));

/**
 * `superseded`'s window (plan §2): an item its blyg followed with a newer item
 * within this long. Reader-local like the burst window (#83), and a constant
 * like it for now; the plan's setting waits on a numeric settings field.
 */
export const SUPERSEDED_WINDOW_MS = 15 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Whether an item last active at `olderMs` is superseded by a newer item first seen at `newerMs`. */
export function supersedes(newerMs: number, olderMs: number): boolean {
  return Number.isFinite(newerMs) && Number.isFinite(olderMs) && olderMs < newerMs && newerMs - olderMs <= SUPERSEDED_WINDOW_MS;
}

const reasonsSql = (column: string) =>
  `EXISTS (SELECT 1 FROM json_each(COALESCE(${column}, '[]')) WHERE value IN (SELECT value FROM json_each(?)))`;

/**
 * Whether a reading identity is in Background, as SQL over `i` (own items) or
 * `ii` (imported items). Each takes one bind: the enabled rules as a JSON array.
 */
export function ownBackgroundSql(): string {
  return `COALESCE((SELECT rp.placement FROM reading_placement rp WHERE rp.source = 'own' AND rp.sub = '' AND rp.id = i.id),
    CASE WHEN i.kind = 'withdrawn' OR ${reasonsSql("i.bg_reasons")} THEN 'background' ELSE 'foreground' END) = 'background'`;
}
export function importedBackgroundSql(): string {
  return `COALESCE((SELECT rp.placement FROM reading_placement rp WHERE rp.source = 'imported' AND rp.sub = ii.subscription_id AND rp.id = ii.remote_id),
    CASE WHEN ii.state = 'tombstone' OR (SELECT s.background FROM subscriptions s WHERE s.id = ii.subscription_id) = 1 OR ${reasonsSql("ii.bg_reasons")}
      THEN 'background' ELSE 'foreground' END) = 'background'`;
}

/** What an entry says about its place: the reasons that count, the owner's choice, and the blyg's. */
export interface EntryBackground {
  reasons: BackgroundReason[];
  placement: Placement | null;
  blyg: boolean;
  detail?: Record<string, unknown>;
}

export function entryBackground(input: { withdrawn: boolean; reasons: string | null; detail: string | null; placement: string | null; blyg: boolean }, enabled: readonly BackgroundRule[]): EntryBackground {
  const stored = parseJson<unknown[]>(input.reasons, []);
  const reasons: BackgroundReason[] = [
    ...(input.withdrawn ? ["withdrawn" as const] : []),
    ...enabled.filter((rule) => stored.includes(rule)),
  ];
  const detail = parseJson<Record<string, unknown> | null>(input.detail, null);
  return {
    reasons,
    placement: input.placement === "background" || input.placement === "foreground" ? input.placement : null,
    blyg: input.blyg,
    ...(detail && typeof detail === "object" && !Array.isArray(detail) ? { detail } : {}),
  };
}

function parseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/**
 * §13.2 and §15.4's one test: a version whose `content_md` is nothing once every
 * directive line, its attached selection, labels and whitespace are stripped
 * carries other people's writing and none of the author's.
 */
export function isWordless(contentMd: string): boolean {
  return extractDirectives(contentMd).withoutDirectives.trim() === "";
}

type Quote = { id: string; version?: number; origin?: string };
function quotesOf(json: string | null): Quote[] {
  const parsed = parseJson<unknown>(json, []);
  return Array.isArray(parsed) ? parsed.filter((q): q is Quote => !!q && typeof q === "object" && typeof (q as Quote).id === "string") : [];
}
/**
 * Everything a version names, quoted or linked (§10.3a), as one list: what a
 * thread already named either way is not newly named by a later version. A
 * `[[+ text]]` placeholder is named by link and folds under its thread, but
 * only within the same publish (`withinLinkBurst`), or for our own items only
 * when the thread minted it (spec §13.7: the reading order is the reader's).
 */
const namedJson = (quotes: string | null, links: string | null | undefined) => (links ? JSON.stringify([...quotesOf(quotes), ...quotesOf(links)]) : quotes);
/** `[id, version, origin]` per quote, so a same-hash version whose quotes moved is not maintenance. */
const quoteKey = (quotes: Quote[]) => JSON.stringify(quotes.map((q) => [q.id, q.version ?? null, q.origin ?? null]));

/**
 * The text of each quote baked at the top level of `content_html`, by quoted
 * item id: what a reader saw of each quote in that version.
 */
export function bakedQuoteTexts(html: string): Map<string, string> {
  const texts = new Map<string, string>();
  const tag = /<(\/?)blockquote\b([^>]*)>/gi;
  let depth = 0;
  let open: { id: string | null; start: number } | null = null;
  for (const m of html.matchAll(tag)) {
    if (!m[1]) {
      if (depth === 0) {
        const quote = /\bclass="[^"]*\bblyg-transclusion\b/.test(m[2]!) ? /\bdata-blyg-id="([^"]+)"/.exec(m[2]!) : null;
        open = { id: quote ? quote[1]! : null, start: m.index! + m[0].length };
      }
      depth++;
    } else if (depth > 0 && --depth === 0 && open) {
      if (open.id && !texts.has(open.id)) texts.set(open.id, plainTextFromHtml(html.slice(open.start, m.index)));
      open = null;
    }
  }
  return texts;
}

/** What a version is measured with; the text members are absent where the caller holds none. */
export interface Measured { hash: string | null; quotes: string | null; contentMd?: string | null; contentHtml?: string | null }

/**
 * Same text, quotes moved: a refresh when the same items are quoted in the same
 * order and only their versions changed (§13.2, #38). `quotes-material` when a
 * refreshed quote's baked text changed beyond near-same (plan §2.1).
 */
function refreshReason(next: Measured, held: Measured): "quotes-refreshed" | "quotes-material" | null {
  const before = quotesOf(held.quotes);
  const after = quotesOf(next.quotes);
  if (before.length !== after.length || before.some((q, i) => q.id !== after[i]!.id || (q.origin ?? null) !== (after[i]!.origin ?? null))) return null;
  const moved = after.filter((q, i) => (q.version ?? null) !== (before[i]!.version ?? null)).map((q) => q.id);
  if (!moved.length) return null;
  if (held.contentHtml && next.contentHtml) {
    const was = bakedQuoteTexts(held.contentHtml);
    const now = bakedQuoteTexts(next.contentHtml);
    if (moved.some((id) => was.has(id) && now.has(id) && !isNearSame(was.get(id)!, now.get(id)!))) return "quotes-material";
  }
  return "quotes-refreshed";
}

/**
 * A version's own reasons, measured against the version held before it (plan
 * §2): same text and same quotes is maintenance (§13.2, #77); same text with
 * only the quotes' versions moved is a quote refresh (§2.1); a small edit of
 * the author's own text is near-same (#83, `isNearSame`); no words of its own
 * is wordless. `burst` and `superseded` are not here: other items set them
 * (`withReason`), and any later version of an item clears
 * them, since every version recomputes its reasons from scratch.
 */
export function versionReasons(next: Measured & { contentMd: string }, held: Measured | null): BackgroundRule[] {
  const reasons: BackgroundRule[] = [];
  if (held && next.hash && next.hash === held.hash) {
    if (quoteKey(quotesOf(next.quotes)) === quoteKey(quotesOf(held.quotes))) reasons.push("maintenance");
    else {
      const refresh = refreshReason(next, held);
      if (refresh) reasons.push(refresh);
    }
  } else if (held && typeof held.contentMd === "string" && isNearSame(held.contentMd, next.contentMd)) reasons.push("near-same");
  if (isWordless(next.contentMd)) reasons.push("wordless");
  return reasons;
}

/**
 * The items a thread version is the first to name from its own blyg: quotes
 * with no origin (or this one), not named by the version held before it.
 */
export function newlyNamed(next: string | null, held: string | null, ownOrigin?: string): string[] {
  const before = new Set(quotesOf(held).map((q) => q.id));
  const same = (o: string | undefined) => !o || (ownOrigin !== undefined && o.replace(/\/?$/, "/") === ownOrigin.replace(/\/?$/, "/"));
  return [...new Set(quotesOf(next).filter((q) => same(q.origin) && !before.has(q.id)).map((q) => q.id))];
}

/** Add a reason another item sets (`burst` names its thread, `superseded` the newer item) to a reasons array. */
function withReason(reasons: string | null, detail: string | null, reason: "burst" | "superseded", note: Record<string, string>): { reasons: string; detail: string } {
  const list = parseJson<unknown[]>(reasons, []).filter((r) => r !== reason);
  const d = parseJson<Record<string, unknown> | null>(detail, null) ?? {};
  return { reasons: JSON.stringify([...list, reason]), detail: JSON.stringify({ ...d, ...note }) };
}

/**
 * An own version's reasons, recomputed at every publish (plan §2): the private
 * change classifier's `typo`, `minor` or `refresh` sets `minor` (4a), and the
 * measured rules of `versionReasons`. A first version supersedes the own items
 * last published within the window before it. A thread's version also folds
 * the own items it is the first to name, published within the burst window
 * before it, so the owner's own tangles fold in their reader.
 * Studio-private bookkeeping: a failure here never fails the publish.
 */
export async function settleOwnBackground(db: D1Database, itemId: string, version: number): Promise<void> {
  const [cls, rows] = await Promise.all([
    db.prepare("SELECT category FROM change_class WHERE item_id = ? AND version = ?").bind(itemId, version).first<{ category: string | null }>(),
    db.prepare("SELECT version, content_md, content_html, content_hash, transclusions, links_json, published_at FROM versions WHERE item_id = ? AND version IN (?, ?)")
      .bind(itemId, version, version - 1).all<{ version: number; content_md: string; content_html: string; content_hash: string | null; transclusions: string | null; links_json: string | null; published_at: string }>(),
  ]);
  const now = rows.results.find((r) => r.version === version);
  const before = rows.results.find((r) => r.version === version - 1) ?? null;
  if (!now) return;
  const minor = cls?.category === "typo" || cls?.category === "minor" || cls?.category === "refresh";
  const reasons: BackgroundRule[] = [
    ...versionReasons(
      { hash: now.content_hash, quotes: now.transclusions, contentMd: now.content_md, contentHtml: now.content_html },
      before && { hash: before.content_hash, quotes: before.transclusions, contentMd: before.content_md, contentHtml: before.content_html },
    ),
    ...(minor ? ["minor" as const] : []),
  ];
  await db.prepare("UPDATE items SET bg_reasons = ?, bg_detail = ? WHERE id = ?")
    .bind(reasons.length ? JSON.stringify(reasons) : null, minor ? JSON.stringify({ category: cls!.category }) : null, itemId).run();

  if (version === 1) {
    const newer = Date.parse(now.published_at);
    const since = new Date(newer - SUPERSEDED_WINDOW_MS).toISOString();
    const older = await db.prepare(`SELECT i.id, i.bg_reasons, i.bg_detail, v.last_at FROM items i
      JOIN (SELECT item_id, MAX(published_at) AS last_at FROM versions GROUP BY item_id HAVING MAX(published_at) >= ?) v ON v.item_id = i.id
      WHERE i.status = 'public' AND i.kind != 'withdrawn' AND i.id != ?`)
      .bind(since, itemId).all<{ id: string; bg_reasons: string | null; bg_detail: string | null; last_at: string | null }>();
    const updates = older.results.filter((o) => o.last_at && supersedes(newer, Date.parse(o.last_at))).map((o) => {
      const next = withReason(o.bg_reasons, o.bg_detail, "superseded", { by: itemId });
      return db.prepare("UPDATE items SET bg_reasons = ?, bg_detail = ? WHERE id = ?").bind(next.reasons, next.detail, o.id);
    });
    if (updates.length) await db.batch(updates);
  }

  // Quoted parts fold by the burst window. Linked ones fold only when this
  // thread minted them (`tangled_from`): a `[[+ text]]` placeholder, not a
  // chapter a contents thread links (session 74).
  const quoted = newlyNamed(now.transclusions, before?.transclusions ?? null);
  const linked = newlyNamed(now.links_json, before ? namedJson(before.transclusions, before.links_json) : null).filter((id) => !quoted.includes(id));
  const minted = linked.length
    ? (await db.prepare("SELECT id FROM items WHERE tangled_from = ? AND id IN (SELECT value FROM json_each(?))").bind(itemId, JSON.stringify(linked)).all<{ id: string }>()).results.map((r) => r.id)
    : [];
  const named = [...quoted, ...minted];
  if (!named.length) return;
  const threadAt = Date.parse(now.published_at);
  const members = await db.prepare(`SELECT i.id, i.bg_reasons, i.bg_detail, (SELECT published_at FROM versions v WHERE v.item_id = i.id ORDER BY v.version LIMIT 1) AS first_at
    FROM items i WHERE i.id IN (SELECT value FROM json_each(?)) AND i.id != ? AND i.status = 'public'`)
    .bind(JSON.stringify(named), itemId).all<{ id: string; bg_reasons: string | null; bg_detail: string | null; first_at: string | null }>();
  const updates = members.results.filter((m) => m.first_at && withinBurst(Date.parse(m.first_at), threadAt)).map((m) => {
    const next = withReason(m.bg_reasons, m.bg_detail, "burst", { thread: itemId });
    return db.prepare("UPDATE items SET bg_reasons = ?, bg_detail = ? WHERE id = ?").bind(next.reasons, next.detail, m.id);
  });
  if (updates.length) await db.batch(updates);
}

/** The reasons that make a version maintenance for the pace-layered order (RFC-3 R2): it climbs zero. */
const MAINTENANCE_REASONS: ReadonlySet<string> = new Set(["maintenance", "quotes-refreshed", "quotes-material", "near-same"]);

/** What the importer held of an item before a new version replaced it. */
export interface HeldVersion extends Measured { links?: string | null; version?: number | null }

/**
 * An imported version's reasons (plan §2, at import): its own measured reasons,
 * and, for a thread, `burst` on the items of its blyg it is the first to name,
 * first published within the window before it. Times are clamped to when this
 * reader first saw them. An item that arrives after the thread naming it (an
 * out-of-order feed) is checked against the held threads that name it.
 */
export async function settleImportedBackground(
  db: D1Database,
  subscriptionId: string,
  remoteId: string,
  doc: { kind: string; version?: number; content_md: string; content_html?: string; content_hash: string | null; transclusions?: unknown; links?: unknown; created?: string | null; updated?: string | null; changelog?: unknown[] },
  held: HeldVersion | null,
  observedAt: string,
): Promise<void> {
  const origin = (await db.prepare("SELECT origin FROM subscriptions WHERE id = ?").bind(subscriptionId).first<{ origin: string }>())?.origin;
  if (!origin) return;
  const sub = { id: subscriptionId, origin };
  const quotes = doc.transclusions ? JSON.stringify(doc.transclusions) : null;
  const links = Array.isArray(doc.links) && doc.links.length ? JSON.stringify(doc.links) : null;
  let reasons: string[] = versionReasons({ hash: doc.content_hash, quotes, contentMd: doc.content_md, contentHtml: doc.content_html ?? null }, held);
  let detail: Record<string, unknown> | null = null;
  if (!held && doc.kind !== "withdrawn") {
    // First sight of a new item: it supersedes the items its blyg was last
    // active on within the window before it, and is itself superseded by a
    // newer one already held (an archive imports in no particular order).
    const mine = clampedTime(doc.created, observedAt);
    // A coarse prefilter on the asserted strings, a day wider than the window
    // so an offset written as +05:30 rather than Z still falls inside;
    // `supersedes` on the clamped times is the test.
    const since = new Date(mine - SUPERSEDED_WINDOW_MS - DAY_MS).toISOString();
    const until = new Date(mine + SUPERSEDED_WINDOW_MS + DAY_MS).toISOString();
    const near = await db.prepare(`SELECT remote_id, created, updated, observed_at, bg_reasons, bg_detail FROM imported_items
      WHERE subscription_id = ? AND state = 'current' AND l0 = 0 AND remote_id != ?
        AND COALESCE(updated, observed_at) >= ? AND (COALESCE(created, observed_at) <= ? OR observed_at <= ?)`)
      .bind(sub.id, remoteId, since, until, until).all<{ remote_id: string; created: string | null; updated: string | null; observed_at: string; bg_reasons: string | null; bg_detail: string | null }>();
    const newer = near.results.filter((n) => supersedes(clampedTime(n.created, n.observed_at), mine)).sort((a, b) => clampedTime(a.created, a.observed_at) - clampedTime(b.created, b.observed_at))[0];
    if (newer) {
      reasons = [...reasons, "superseded"];
      detail = { by: newer.remote_id };
    }
    const updates = near.results.filter((o) => supersedes(mine, clampedTime(o.updated, o.observed_at))).map((o) => {
      const next = withReason(o.bg_reasons, o.bg_detail, "superseded", { by: remoteId });
      return db.prepare("UPDATE imported_items SET bg_reasons = ?, bg_detail = ? WHERE subscription_id = ? AND remote_id = ?").bind(next.reasons, next.detail, sub.id, o.remote_id);
    });
    if (updates.length) await db.batch(updates);
  }
  if (!held) {
    // First sight: is a thread already held here that folds it?
    const threads = await db.prepare(`SELECT remote_id, updated, observed_at, transclusions_json, links_json, content_md FROM imported_items
      WHERE subscription_id = ? AND kind = 'thread' AND state = 'current' AND remote_id != ? AND instr(COALESCE(transclusions_json, '') || COALESCE(links_json, ''), ?) > 0`)
      .bind(sub.id, remoteId, remoteId).all<{ remote_id: string; updated: string | null; observed_at: string; transclusions_json: string | null; links_json: string | null; content_md: string | null }>();
    const mine = clampedTime(doc.created, observedAt);
    const folding = threads.results.find((t) => {
      const at = clampedTime(t.updated, t.observed_at);
      if (newlyNamed(t.transclusions_json, null, sub.origin).includes(remoteId)) return withinBurst(mine, at);
      return newlyNamed(t.links_json, null, sub.origin).includes(remoteId) && withinLinkBurst(mine, at) && saysNoMoreThanLink(doc.content_md, t.content_md ?? "", remoteId);
    });
    if (folding) {
      reasons = [...reasons, "burst"];
      detail = { ...detail, thread: folding.remote_id };
    }
  }
  // The pace-layered reader's inputs (migration 0051): the changelog as
  // fetched, and this version marked maintenance when it arrived as one,
  // the same judgement src/feeds/history.ts makes for our own versions.
  const maintenance = typeof doc.version === "number" && reasons.some((r) => MAINTENANCE_REASONS.has(r)) ? doc.version : null;
  await db.prepare(`UPDATE imported_items SET bg_reasons = ?, bg_detail = ?, changelog_json = COALESCE(?, changelog_json),
      maintenance_json = CASE WHEN ? IS NULL THEN maintenance_json ELSE json_insert(COALESCE(maintenance_json, '[]'), '$[#]', ?) END
    WHERE subscription_id = ? AND remote_id = ?`)
    .bind(reasons.length ? JSON.stringify(reasons) : null, detail ? JSON.stringify(detail) : null, doc.changelog ? JSON.stringify(doc.changelog) : null, maintenance, maintenance, sub.id, remoteId).run();

  if (doc.kind !== "thread") return;
  // Quoted items fold by the burst window, linked ones only within the same
  // publish (LINK_BURST_WINDOW_MS) and only when they say no more than the
  // link's own text (#112): a placeholder, not a chapter.
  const quoted = newlyNamed(quotes, held?.quotes ?? null, sub.origin).filter((id) => id !== remoteId);
  const linked = newlyNamed(links, held ? namedJson(held.quotes, held.links) : null, sub.origin).filter((id) => id !== remoteId && !quoted.includes(id));
  const named = [...quoted, ...linked];
  if (!named.length) return;
  const threadAt = clampedTime(doc.updated, observedAt);
  const members = await db.prepare(`SELECT remote_id, created, observed_at, bg_reasons, bg_detail, content_md FROM imported_items
    WHERE subscription_id = ? AND state = 'current' AND remote_id IN (SELECT value FROM json_each(?))`)
    .bind(sub.id, JSON.stringify(named)).all<{ remote_id: string; created: string | null; observed_at: string; bg_reasons: string | null; bg_detail: string | null; content_md: string | null }>();
  const updates = members.results.filter((m) => {
    const at = clampedTime(m.created, m.observed_at);
    if (quoted.includes(m.remote_id)) return withinBurst(at, threadAt);
    return withinLinkBurst(at, threadAt) && saysNoMoreThanLink(m.content_md ?? "", doc.content_md, m.remote_id);
  }).map((m) => {
    const next = withReason(m.bg_reasons, m.bg_detail, "burst", { thread: remoteId });
    return db.prepare("UPDATE imported_items SET bg_reasons = ?, bg_detail = ? WHERE subscription_id = ? AND remote_id = ?").bind(next.reasons, next.detail, sub.id, m.remote_id);
  });
  if (updates.length) await db.batch(updates);
}

/** The owner's explicit choice on one entry; null clears it and the rules decide again. */
export async function setPlacement(db: D1Database, source: "own" | "imported", sub: string, id: string, placement: Placement | null, now: string): Promise<void> {
  if (placement === null) {
    await db.prepare("DELETE FROM reading_placement WHERE source = ? AND sub = ? AND id = ?").bind(source, sub, id).run();
    return;
  }
  await db.prepare(`INSERT INTO reading_placement(source, sub, id, placement, at) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(source, sub, id) DO UPDATE SET placement = excluded.placement, at = excluded.at`).bind(source, sub, id, placement, now).run();
}
