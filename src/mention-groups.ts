import { cursorPage, type CursorQuery } from './cursor-page.ts';

export interface MentionGroup {
  targetItemId: string;
  total: number;
  visible: number;
  verifiedAt: string;
  lastSeen: string;
  firstId: string;
}
export type MentionGroupQuery = CursorQuery & {
  targetItemId?: string;
  verifiedAt?: string;
  lastSeen?: string;
  firstId?: string;
};

/** Select group winners and counts together; timestamps from losing receipts
 * must not move a group ahead of its newest verified receipt.
 */
export async function mentionGroups(db: D1Database, query: MentionGroupQuery) {
  const groupFilters: string[] = [], binds: string[] = [];
  if (query.targetItemId !== undefined) binds.push(query.targetItemId);
  for (const key of ['verifiedAt', 'lastSeen', 'firstId'] as const) {
    if (query[key] === undefined) continue;
    groupFilters.push(`${key} = ?`);
    binds.push(query[key]);
  }
  return cursorPage<MentionGroup>(db, query, {
    name: 'mention-groups', domains: ['mentions'], materialize: true,
    filters: [query.targetItemId ?? null, query.verifiedAt ?? null, query.lastSeen ?? null, query.firstId ?? null],
    sql: `WITH ranked_mentions AS (
      SELECT target_item_id AS targetItemId,
        COUNT(*) OVER (PARTITION BY target_item_id) AS total,
        SUM(CASE WHEN status='verified' AND hidden=0 THEN 1 ELSE 0 END) OVER (PARTITION BY target_item_id) AS visible,
        COALESCE(verified_at,'') AS verifiedAt, last_seen AS lastSeen, id AS firstId,
        ROW_NUMBER() OVER (PARTITION BY target_item_id ORDER BY COALESCE(verified_at,'') DESC,last_seen DESC,id ASC) AS winner
      FROM mentions_in WHERE status IN ('verified','gone')${query.targetItemId !== undefined ? ' AND target_item_id = ?' : ''}
    ) SELECT targetItemId,total,visible,verifiedAt,lastSeen,firstId FROM ranked_mentions WHERE winner=1${groupFilters.length ? ` AND ${groupFilters.join(' AND ')}` : ''}`,
    binds,
    order: [{ column: 'verifiedAt', direction: 'desc' }, { column: 'lastSeen', direction: 'desc' }, { column: 'firstId', direction: 'asc' }],
  });
}

export async function mentionSummary(db: D1Database) {
  return (await db.prepare(`SELECT COUNT(*) AS inbound, COUNT(DISTINCT target_item_id) AS groups,
    (SELECT COUNT(*) FROM mentions_out) AS outbound
    FROM mentions_in WHERE status IN ('verified','gone')`).first<{ inbound: number; outbound: number; groups: number }>())!;
}
