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
import { clampedTime, withinBurst } from "./burst.ts";

/**
 * The rules an owner can turn off, in the order Settings lists them. Withdrawn
 * is not here: it is always on. Phase 1 computes `minor` for own items only.
 * Session 72 reordered the plan for tangling: `burst` (phase 3) with the two
 * cheap rules of its classifier, `wordless` and `maintenance`, ahead of the
 * rest of phase 2. Each rule joins Settings when it acts.
 */
export const BACKGROUND_RULES = ["burst", "wordless", "maintenance", "minor"] as const;
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
  BACKGROUND_RULES.filter((rule) => rules[rule]);

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
/** `[id, version, origin]` per quote, so a same-hash version whose quotes moved is not maintenance. */
const quoteKey = (quotes: Quote[]) => JSON.stringify(quotes.map((q) => [q.id, q.version ?? null, q.origin ?? null]));

/**
 * A version's own reasons, measured against the version held before it: same
 * text and same quotes is maintenance (§13.2, #77); no words of its own is
 * wordless. `burst` is not here: a thread sets it on the items it names
 * (`markBurst`), and any later version of an item clears it, since every
 * version recomputes its reasons from scratch.
 */
export function versionReasons(next: { hash: string | null; quotes: string | null; contentMd: string }, held: { hash: string | null; quotes: string | null } | null): BackgroundRule[] {
  const reasons: BackgroundRule[] = [];
  if (held && next.hash && next.hash === held.hash && quoteKey(quotesOf(next.quotes)) === quoteKey(quotesOf(held.quotes))) reasons.push("maintenance");
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

/** Add `burst` to a reasons array, naming the thread in its detail. */
function withBurst(reasons: string | null, detail: string | null, thread: string): { reasons: string; detail: string } {
  const list = parseJson<unknown[]>(reasons, []).filter((r) => r !== "burst");
  const d = parseJson<Record<string, unknown> | null>(detail, null) ?? {};
  return { reasons: JSON.stringify([...list, "burst"]), detail: JSON.stringify({ ...d, thread }) };
}

/**
 * An own version's reasons, recomputed at every publish (plan §2): the private
 * change classifier's `typo`, `minor` or `refresh` sets `minor` (4a), and
 * `maintenance` and `wordless` by the measured test. A thread's version also
 * folds the own items it is the first to name, published within the burst
 * window before it, so the owner's own tangles fold in their reader.
 * Studio-private bookkeeping: a failure here never fails the publish.
 */
export async function settleOwnBackground(db: D1Database, itemId: string, version: number): Promise<void> {
  const [cls, rows] = await Promise.all([
    db.prepare("SELECT category FROM change_class WHERE item_id = ? AND version = ?").bind(itemId, version).first<{ category: string | null }>(),
    db.prepare("SELECT version, content_md, content_hash, transclusions, published_at FROM versions WHERE item_id = ? AND version IN (?, ?)")
      .bind(itemId, version, version - 1).all<{ version: number; content_md: string; content_hash: string | null; transclusions: string | null; published_at: string }>(),
  ]);
  const now = rows.results.find((r) => r.version === version);
  const before = rows.results.find((r) => r.version === version - 1) ?? null;
  if (!now) return;
  const minor = cls?.category === "typo" || cls?.category === "minor" || cls?.category === "refresh";
  const reasons: BackgroundRule[] = [
    ...versionReasons({ hash: now.content_hash, quotes: now.transclusions, contentMd: now.content_md }, before && { hash: before.content_hash, quotes: before.transclusions }),
    ...(minor ? ["minor" as const] : []),
  ];
  await db.prepare("UPDATE items SET bg_reasons = ?, bg_detail = ? WHERE id = ?")
    .bind(reasons.length ? JSON.stringify(reasons) : null, minor ? JSON.stringify({ category: cls!.category }) : null, itemId).run();

  const named = newlyNamed(now.transclusions, before?.transclusions ?? null);
  if (!named.length) return;
  const threadAt = Date.parse(now.published_at);
  const members = await db.prepare(`SELECT i.id, i.bg_reasons, i.bg_detail, (SELECT published_at FROM versions v WHERE v.item_id = i.id ORDER BY v.version LIMIT 1) AS first_at
    FROM items i WHERE i.id IN (SELECT value FROM json_each(?)) AND i.id != ? AND i.status = 'public'`)
    .bind(JSON.stringify(named), itemId).all<{ id: string; bg_reasons: string | null; bg_detail: string | null; first_at: string | null }>();
  const updates = members.results.filter((m) => m.first_at && withinBurst(Date.parse(m.first_at), threadAt)).map((m) => {
    const next = withBurst(m.bg_reasons, m.bg_detail, itemId);
    return db.prepare("UPDATE items SET bg_reasons = ?, bg_detail = ? WHERE id = ?").bind(next.reasons, next.detail, m.id);
  });
  if (updates.length) await db.batch(updates);
}

/** What the importer held of an item before a new version replaced it. */
export interface HeldVersion { hash: string | null; quotes: string | null }

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
  doc: { kind: string; content_md: string; content_hash: string | null; transclusions?: unknown; created?: string | null; updated?: string | null },
  held: HeldVersion | null,
  observedAt: string,
): Promise<void> {
  const origin = (await db.prepare("SELECT origin FROM subscriptions WHERE id = ?").bind(subscriptionId).first<{ origin: string }>())?.origin;
  if (!origin) return;
  const sub = { id: subscriptionId, origin };
  const quotes = doc.transclusions ? JSON.stringify(doc.transclusions) : null;
  let reasons: string[] = versionReasons({ hash: doc.content_hash, quotes, contentMd: doc.content_md }, held);
  let detail: Record<string, unknown> | null = null;
  if (!held) {
    // First sight: is a thread already held here that folds it?
    const threads = await db.prepare(`SELECT remote_id, updated, observed_at, transclusions_json FROM imported_items
      WHERE subscription_id = ? AND kind = 'thread' AND state = 'current' AND remote_id != ? AND instr(transclusions_json, ?) > 0`)
      .bind(sub.id, remoteId, remoteId).all<{ remote_id: string; updated: string | null; observed_at: string; transclusions_json: string | null }>();
    const mine = clampedTime(doc.created, observedAt);
    const folding = threads.results.find((t) => newlyNamed(t.transclusions_json, null, sub.origin).includes(remoteId) && withinBurst(mine, clampedTime(t.updated, t.observed_at)));
    if (folding) {
      reasons = [...reasons, "burst"];
      detail = { thread: folding.remote_id };
    }
  }
  await db.prepare("UPDATE imported_items SET bg_reasons = ?, bg_detail = ? WHERE subscription_id = ? AND remote_id = ?")
    .bind(reasons.length ? JSON.stringify(reasons) : null, detail ? JSON.stringify(detail) : null, sub.id, remoteId).run();

  if (doc.kind !== "thread") return;
  const named = newlyNamed(quotes, held?.quotes ?? null, sub.origin).filter((id) => id !== remoteId);
  if (!named.length) return;
  const threadAt = clampedTime(doc.updated, observedAt);
  const members = await db.prepare(`SELECT remote_id, created, observed_at, bg_reasons, bg_detail FROM imported_items
    WHERE subscription_id = ? AND state = 'current' AND remote_id IN (SELECT value FROM json_each(?))`)
    .bind(sub.id, JSON.stringify(named)).all<{ remote_id: string; created: string | null; observed_at: string; bg_reasons: string | null; bg_detail: string | null }>();
  const updates = members.results.filter((m) => withinBurst(clampedTime(m.created, m.observed_at), threadAt)).map((m) => {
    const next = withBurst(m.bg_reasons, m.bg_detail, remoteId);
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
