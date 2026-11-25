-- Private items in the pace-layered reader (0.72.1; Venkat, session 85: they stayed
-- on top and new items arrived below them). The ranking (src/feeds/reader-order.ts)
-- read only public history, so a private item had no position, and an entry with
-- no position sorts first. It now ranks private items by their private versions,
-- so those are inputs too: an own item's triggers watch status 'private', and
-- private_versions gets the triggers versions has. As in 0056, WHEN clauses only,
-- never CASE ... END (D1's remote executor splits at the first END;).
DROP TRIGGER IF EXISTS reader_order_items_insert;
CREATE TRIGGER reader_order_items_insert AFTER INSERT ON items
WHEN NEW.status IN ('public','withdrawn','private')
BEGIN
  UPDATE reading_order_state SET inputs = inputs + 1 WHERE id = 1;
END;

DROP TRIGGER IF EXISTS reader_order_items_delete;
CREATE TRIGGER reader_order_items_delete AFTER DELETE ON items
WHEN OLD.status IN ('public','withdrawn','private')
BEGIN
  UPDATE reading_order_state SET inputs = inputs + 1 WHERE id = 1;
END;

DROP TRIGGER IF EXISTS reader_order_items_update;
CREATE TRIGGER reader_order_items_update AFTER UPDATE OF id, status, kind, version ON items
WHEN (OLD.status IN ('public','withdrawn','private') OR NEW.status IN ('public','withdrawn','private'))
  AND (OLD.id IS NOT NEW.id OR OLD.status IS NOT NEW.status OR OLD.kind IS NOT NEW.kind OR OLD.version IS NOT NEW.version)
BEGIN
  UPDATE reading_order_state SET inputs = inputs + 1 WHERE id = 1;
END;

CREATE TRIGGER reader_order_private_versions_insert AFTER INSERT ON private_versions
BEGIN
  UPDATE reading_order_state SET inputs = inputs + 1 WHERE id = 1;
END;

CREATE TRIGGER reader_order_private_versions_delete AFTER DELETE ON private_versions
BEGIN
  UPDATE reading_order_state SET inputs = inputs + 1 WHERE id = 1;
END;

CREATE TRIGGER reader_order_private_versions_update AFTER UPDATE OF item_id, version, published_at, note ON private_versions
WHEN OLD.item_id IS NOT NEW.item_id OR OLD.version IS NOT NEW.version OR OLD.published_at IS NOT NEW.published_at OR OLD.note IS NOT NEW.note
BEGIN
  UPDATE reading_order_state SET inputs = inputs + 1 WHERE id = 1;
END;

-- Nodes running 0.72.0 hold an order built without their private items: rebuild it.
UPDATE reading_order_state SET inputs = inputs + 1 WHERE id = 1;
