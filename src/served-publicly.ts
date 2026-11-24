import type { ItemRow } from "./types.ts";

/**
 * The one test for whether an own item is on the public surface: an allow-list, so a
 * status added later (`private` was the first) stays off the wire until it is named here.
 * Every public route, and the transclusion resolver's publish path, asks this rather than
 * refusing drafts; `servedPubliclySql` is the same test for queries.
 */
export const PUBLIC_STATUSES = ["public", "withdrawn"] as const;
export function servedPublicly(item: Pick<ItemRow, "status">): boolean {
  return (PUBLIC_STATUSES as readonly string[]).includes(item.status);
}
export const servedPubliclySql = (alias?: string) => `${alias ? `${alias}.` : ""}status IN ('public','withdrawn')`;
