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

/** SQL that hides private items from a list for an access that cannot see them. `alias` is the items table's. */
export function privateFilterSql(access: OwnerAccess | null, alias = "i"): string | null {
  return seesPrivate(access) ? null : `${alias}.status <> 'private'`;
}

/** True when the item exists, is private, and this access may not know that. */
export async function privateItemHidden(db: D1Database, access: OwnerAccess | null, id: string): Promise<boolean> {
  if (seesPrivate(access)) return false;
  const row = await db.prepare("SELECT status FROM items WHERE id = ?").bind(id).first<{ status: string }>();
  return row?.status === "private";
}
