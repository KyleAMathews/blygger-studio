import { ItemRowSchema, MediaRowSchema, VersionRowSchema } from "./contract/schemas.ts";
import type { ItemRow, MediaRow, VersionRow } from "./types.ts";

// Column names come only from our row contracts, never from request input.
const jsonRow = (schema: { shape: Record<string, unknown> }, alias: string) =>
  `json_object(${Object.keys(schema.shape).map((key) => `'${key}', ${alias}.${key}`).join(", ")})`;
const detailSql = `SELECT ${jsonRow(ItemRowSchema, "i")} AS item_json,
  (SELECT json_group_array(json(doc)) FROM
    (SELECT ${jsonRow(MediaRowSchema, "m")} AS doc FROM media m WHERE m.item_id = i.id ORDER BY m.created ASC)) AS media_json,
  (SELECT json_group_array(json(doc)) FROM
    (SELECT ${jsonRow(VersionRowSchema, "v")} AS doc FROM versions v WHERE v.item_id = i.id ORDER BY v.version ASC)) AS versions_json
  FROM items i WHERE i.id = ?`;

/** One D1 query for an item detail, including ordered media and version history. */
export async function itemDetail(db: D1Database, id: string) {
  const row = await db.prepare(detailSql).bind(id).first<{ item_json: string; media_json: string; versions_json: string }>();
  if (!row) return null;
  const item = JSON.parse(row.item_json) as ItemRow;
  const media = JSON.parse(row.media_json) as MediaRow[];
  const versions = JSON.parse(row.versions_json) as VersionRow[];
  const published = versions.find((v) => v.version === item.version) ?? null;
  const kind = item.kind === "thread" || (item.kind === "withdrawn" && versions.find((v) => v.version === item.version - 1)?.transclusions) ? "thread" : "fragment";
  return { item, kind, media, versions, published };
}
