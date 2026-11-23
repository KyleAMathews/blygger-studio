-- The pace-layered order is rebuilt only when one of its inputs changed
-- (session 79). 0051 keyed the rebuild on the items, reading and subscriptions
-- change counters, which also move on every poll (`last_poll_at`, `etag`), every
-- draft autosave and every read mark, so on a live node nearly every reading
-- load rebuilt the whole order. `inputs` counts changes to exactly what
-- src/feeds/reader-order.ts reads: published own items and their versions,
-- imported items' history columns, and a subscription's identity.
--
-- A version's kind is not watched: it is fixed at insert, and only 0034's
-- backfill ever set it afterwards.
--
-- Triggers use WHEN clauses, never CASE ... END (0024, session 37: D1's
-- remote executor splits at the first END;).
ALTER TABLE reading_order_state ADD COLUMN inputs INTEGER NOT NULL DEFAULT 0;
INSERT INTO reading_order_state (id, generation, inputs) VALUES (1, '', 0) ON CONFLICT (id) DO NOTHING;

CREATE TRIGGER reader_order_items_insert AFTER INSERT ON items
WHEN NEW.status IN ('public','withdrawn')
BEGIN
  UPDATE reading_order_state SET inputs = inputs + 1 WHERE id = 1;
END;

CREATE TRIGGER reader_order_items_delete AFTER DELETE ON items
WHEN OLD.status IN ('public','withdrawn')
BEGIN
  UPDATE reading_order_state SET inputs = inputs + 1 WHERE id = 1;
END;

CREATE TRIGGER reader_order_items_update AFTER UPDATE OF id, status, kind, version ON items
WHEN (OLD.status IN ('public','withdrawn') OR NEW.status IN ('public','withdrawn'))
  AND (OLD.id IS NOT NEW.id OR OLD.status IS NOT NEW.status OR OLD.kind IS NOT NEW.kind OR OLD.version IS NOT NEW.version)
BEGIN
  UPDATE reading_order_state SET inputs = inputs + 1 WHERE id = 1;
END;

CREATE TRIGGER reader_order_versions_insert AFTER INSERT ON versions
BEGIN
  UPDATE reading_order_state SET inputs = inputs + 1 WHERE id = 1;
END;

CREATE TRIGGER reader_order_versions_delete AFTER DELETE ON versions
BEGIN
  UPDATE reading_order_state SET inputs = inputs + 1 WHERE id = 1;
END;

CREATE TRIGGER reader_order_versions_update AFTER UPDATE OF item_id, version, published_at, note, pinned, transclusions, content_hash, content_md ON versions
WHEN OLD.item_id IS NOT NEW.item_id OR OLD.version IS NOT NEW.version OR OLD.published_at IS NOT NEW.published_at
  OR OLD.note IS NOT NEW.note OR OLD.pinned IS NOT NEW.pinned OR OLD.transclusions IS NOT NEW.transclusions
  OR OLD.content_hash IS NOT NEW.content_hash OR OLD.content_md IS NOT NEW.content_md
BEGIN
  UPDATE reading_order_state SET inputs = inputs + 1 WHERE id = 1;
END;

CREATE TRIGGER reader_order_imported_insert AFTER INSERT ON imported_items
BEGIN
  UPDATE reading_order_state SET inputs = inputs + 1 WHERE id = 1;
END;

CREATE TRIGGER reader_order_imported_delete AFTER DELETE ON imported_items
BEGIN
  UPDATE reading_order_state SET inputs = inputs + 1 WHERE id = 1;
END;

CREATE TRIGGER reader_order_imported_update AFTER UPDATE OF subscription_id, remote_id, kind, state, version, created, updated, observed_at, l0, changelog_json, maintenance_json, transclusions_json ON imported_items
WHEN OLD.subscription_id IS NOT NEW.subscription_id OR OLD.remote_id IS NOT NEW.remote_id OR OLD.kind IS NOT NEW.kind
  OR OLD.state IS NOT NEW.state OR OLD.version IS NOT NEW.version OR OLD.created IS NOT NEW.created
  OR OLD.updated IS NOT NEW.updated OR OLD.observed_at IS NOT NEW.observed_at OR OLD.l0 IS NOT NEW.l0
  OR OLD.changelog_json IS NOT NEW.changelog_json OR OLD.maintenance_json IS NOT NEW.maintenance_json
  OR OLD.transclusions_json IS NOT NEW.transclusions_json
BEGIN
  UPDATE reading_order_state SET inputs = inputs + 1 WHERE id = 1;
END;

CREATE TRIGGER reader_order_subscriptions_delete AFTER DELETE ON subscriptions
BEGIN
  UPDATE reading_order_state SET inputs = inputs + 1 WHERE id = 1;
END;

CREATE TRIGGER reader_order_subscriptions_update AFTER UPDATE OF id, origin ON subscriptions
WHEN OLD.id IS NOT NEW.id OR OLD.origin IS NOT NEW.origin
BEGIN
  UPDATE reading_order_state SET inputs = inputs + 1 WHERE id = 1;
END;
