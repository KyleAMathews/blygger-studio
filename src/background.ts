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

/**
 * The rules an owner can turn off, in the order Settings lists them. Withdrawn
 * is not here: it is always on. Phase 1 computes `minor` for own items only;
 * the measured rules arrive with phase 2, each joining Settings when it acts.
 */
export const BACKGROUND_RULES = ["minor"] as const;
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
 * An own version's reasons, recomputed at every publish (plan §2, 4a): the
 * private change classifier's `typo`, `minor` or `refresh` sets `minor`.
 * Studio-private bookkeeping: a failure here never fails the publish.
 */
export async function settleOwnBackground(db: D1Database, itemId: string, version: number): Promise<void> {
  const row = await db.prepare("SELECT category FROM change_class WHERE item_id = ? AND version = ?").bind(itemId, version).first<{ category: string | null }>();
  const minor = row?.category === "typo" || row?.category === "minor" || row?.category === "refresh";
  await db.prepare("UPDATE items SET bg_reasons = ?, bg_detail = ? WHERE id = ?")
    .bind(minor ? JSON.stringify(["minor"]) : null, minor ? JSON.stringify({ category: row!.category }) : null, itemId).run();
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
