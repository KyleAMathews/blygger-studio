-- `superseded` now looks back 3 minutes, not 15 (Venkat, session 87, studio#183):
-- at 15 it caught unrelated posts made a few minutes apart. Its facts are stored
-- when an item arrives (src/background.ts), so the ones the old window wrote are
-- recomputed here: a `superseded` reason stays only where the newer item named in
-- `bg_detail.by` first appeared after this item's last activity, within 3 minutes,
-- with the same clamped times `supersedes` uses (an asserted time, clamped to when
-- the reader first saw it). Everything else loses the reason, and `by` with it.
-- No CASE ... END (D1's remote executor splits at the first END;).

UPDATE imported_items
SET bg_reasons = (SELECT NULLIF(json_group_array(r.value), '[]') FROM json_each(imported_items.bg_reasons) r WHERE r.value != 'superseded'),
    bg_detail = NULLIF(json_remove(bg_detail, '$.by'), '{}')
WHERE EXISTS (SELECT 1 FROM json_each(COALESCE(bg_reasons, '[]')) WHERE value = 'superseded')
  AND NOT EXISTS (
    SELECT 1 FROM imported_items n
    WHERE n.subscription_id = imported_items.subscription_id
      AND n.remote_id = json_extract(imported_items.bg_detail, '$.by')
      AND (min(COALESCE(julianday(n.created), julianday(n.observed_at)), julianday(n.observed_at))
         - min(COALESCE(julianday(imported_items.updated), julianday(imported_items.observed_at)), julianday(imported_items.observed_at))) * 86400000
        BETWEEN 1 AND 180000
  );

UPDATE items
SET bg_reasons = (SELECT NULLIF(json_group_array(r.value), '[]') FROM json_each(items.bg_reasons) r WHERE r.value != 'superseded'),
    bg_detail = NULLIF(json_remove(bg_detail, '$.by'), '{}')
WHERE EXISTS (SELECT 1 FROM json_each(COALESCE(bg_reasons, '[]')) WHERE value = 'superseded')
  AND NOT EXISTS (
    SELECT 1 FROM versions newer
    WHERE newer.item_id = json_extract(items.bg_detail, '$.by') AND newer.version = 1
      AND (julianday(newer.published_at) - (SELECT julianday(MAX(v.published_at)) FROM versions v WHERE v.item_id = items.id)) * 86400000
        BETWEEN 1 AND 180000
  );
