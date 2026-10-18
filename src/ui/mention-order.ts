import type { Mention } from '../../sdk/dist/browser.js';

type Receipt = Pick<Mention, 'id' | 'target_item_id' | 'verified_at' | 'last_seen'>;

/** Response groups follow the newest receipt; rows within a group do too. */
export function mentionGroups<T extends Receipt>(incoming: readonly T[]): Map<string, T[]> {
  // Live queries enumerate by key unless ordered. Preserve the API's recency
  // here before grouping, without changing the collection's own array.
  const ordered = [...incoming].sort((a, b) =>
    (b.verified_at ?? '').localeCompare(a.verified_at ?? '') ||
    b.last_seen.localeCompare(a.last_seen) || a.id.localeCompare(b.id));
  const groups = new Map<string, T[]>();
  for (const mention of ordered) {
    const rows = groups.get(mention.target_item_id) || [];
    rows.push(mention);
    groups.set(mention.target_item_id, rows);
  }
  return groups;
}
