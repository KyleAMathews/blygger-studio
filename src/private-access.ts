// Who may see private items (sealed-content-build-plan §1 0d; Venkat, session 83).
// A private item is the owner's notebook. The owner's own session sees it; a
// token sees it only when it was granted owner:private, whatever else it holds.
// Tokens minted before the scope existed do not have it. Everything that names
// or lists a private item goes through `seesPrivate` or `privateItemHidden`.
import type { OwnerAccess } from "./permissions.ts";

export const PRIVATE_SCOPE = "owner:private";

export function seesPrivate(access: OwnerAccess | null): boolean {
  return access === null || access.scope.includes(PRIVATE_SCOPE);
}

/**
 * Private taint (Venkat, session 84; studio#178 R08): a working copy whose TK output drew
 * on the notebook is read like a private item. The mark is the provenance key
 * `"private":true` (types.ts ScopeProvenance), which JSON string values cannot spell.
 */
const TAINT_MARK = '"private":true';

/** SQL true for an item this access must not see: private, or private-tainted. `alias` is the items table's. */
export function notebookSql(alias = "i"): string {
  return `(${alias}.status = 'private' OR instr(COALESCE(${alias}.tk_provenance_json, ''), '${TAINT_MARK}') > 0)`;
}

/** SQL that hides private and tainted items from a list for an access that cannot see them. */
export function privateFilterSql(access: OwnerAccess | null, alias = "i"): string | null {
  return seesPrivate(access) ? null : `NOT ${notebookSql(alias)}`;
}

/** True when the item exists, is private or tainted, and this access may not know that. */
export async function privateItemHidden(db: D1Database, access: OwnerAccess | null, id: string): Promise<boolean> {
  if (seesPrivate(access)) return false;
  const row = await db.prepare("SELECT status, tk_provenance_json FROM items WHERE id = ?").bind(id).first<{ status: string; tk_provenance_json: string | null }>();
  return row?.status === "private" || Boolean(row?.tk_provenance_json?.includes(TAINT_MARK));
}
