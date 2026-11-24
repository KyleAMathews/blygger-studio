// Who may see the owner's notebook (sealed-content-build-plan §1 0d and 0f; Venkat,
// sessions 83–85). The owner's own session sees everything; a token sees private
// things only when it was granted owner:private, whatever else it holds. Tokens
// minted before the scope existed do not have it.
//
// For an access that cannot see private things (a *restricted* one):
// - a **hidden item** is a private item, or a draft whose working copy is
//   private-tainted. It answers as an id that does not exist (law 1) and is in
//   no list or count (law 2).
// - a **hidden working copy** is the tainted working copy of a public or withdrawn
//   item. The item stays visible as its latest public version (Q2, session 85).
//
// The taint is `items.private_taint` (migration 0062), written only by the server.
// Everything that names, lists or reads an own item for an owner API caller goes
// through `visibleItemsSql`, `hiddenItemSql` or the helpers below.
import { ItemRowSchema } from "./contract/schemas.ts";
import type { OwnerAccess } from "./permissions.ts";

export const PRIVATE_SCOPE = "owner:private";

/** The one refusal a public publish of tainted text gets (law 5), whatever became of the source. */
export const PRIVATE_TAINT_REASON = "this item holds text drawn from a private item; publish privately, or discard the changes";

export function seesPrivate(access: OwnerAccess | null): boolean {
  return access === null || access.scope.includes(PRIVATE_SCOPE);
}

/** SQL true for a hidden item: private, or a draft whose working copy is tainted. `alias` is the items table's. */
export function hiddenItemSql(alias = "i"): string {
  return `(${alias}.status = 'private' OR (${alias}.status = 'draft' AND ${alias}.private_taint = 1))`;
}

/** SQL true for a public or withdrawn item whose working copy is tainted: shown as its latest public version. */
export function hiddenWorkingCopySql(alias = "i"): string {
  return `(${alias}.private_taint = 1 AND ${alias}.status IN ('public', 'withdrawn'))`;
}

// Working-copy columns a hidden working copy answers from its latest public version instead.
const MASKED: Record<string, (alias: string) => string> = {
  content_md: (a) => `COALESCE((SELECT v.content_md FROM versions v WHERE v.item_id = ${a}.id AND v.version = ${a}.version), '')`,
  tk_provenance_json: () => "NULL",
  private_taint: () => "0",
};

/**
 * The items table as this access may read it, for `FROM ${visibleItemsSql(access)} i`.
 * For a restricted access: hidden items are absent, and a hidden working copy reads as
 * the item's latest public version. Revisions and `dirty` still move (the Q3 limit).
 */
export function visibleItemsSql(access: OwnerAccess | null): string {
  if (seesPrivate(access)) return "items";
  const columns = Object.keys(ItemRowSchema.shape).map((name) => name in MASKED
    ? `CASE WHEN ${hiddenWorkingCopySql("x")} THEN ${MASKED[name]("x")} ELSE x.${name} END AS ${name}`
    : `x.${name}`);
  return `(SELECT ${columns.join(", ")} FROM items x WHERE NOT ${hiddenItemSql("x")})`;
}

/** The row form of hiddenItemSql, for code that already holds the item. */
export function isHiddenItem(item: { status: string; private_taint: number }): boolean {
  return item.status === "private" || (item.status === "draft" && item.private_taint === 1);
}

/** SQL that drops hidden items from a list for a restricted access; null for one that sees private. */
export function privateFilterSql(access: OwnerAccess | null, alias = "i"): string | null {
  return seesPrivate(access) ? null : `NOT ${hiddenItemSql(alias)}`;
}

/** SQL that drops working-copy search documents a restricted access may not read; null for one that sees private. */
export function hiddenWorkingCopyFilterSql(access: OwnerAccess | null, alias = "i"): string | null {
  return seesPrivate(access) ? null : `NOT ${hiddenItemSql(alias)} AND NOT ${hiddenWorkingCopySql(alias)}`;
}

/** Of these own item ids, the hidden ones. Empty for an access that sees private. */
export async function hiddenOwnIds(db: D1Database, access: OwnerAccess | null, ids: readonly string[]): Promise<Set<string>> {
  if (seesPrivate(access) || !ids.length) return new Set();
  const { results } = await db.prepare(`SELECT id FROM items i WHERE id IN (SELECT value FROM json_each(?)) AND ${hiddenItemSql("i")}`).bind(JSON.stringify([...new Set(ids)])).all<{ id: string }>();
  return new Set(results.map((row) => row.id));
}

/** True when the item exists and is hidden from this access. */
export async function privateItemHidden(db: D1Database, access: OwnerAccess | null, id: string): Promise<boolean> {
  return (await hiddenOwnIds(db, access, [id])).has(id);
}
