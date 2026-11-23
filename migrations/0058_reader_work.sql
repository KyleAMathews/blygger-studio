-- Reuse migration 0056's single ranking-input counter. Refresh its triggers
-- to preserve dependencies after subscription reinsertion and missing cache
-- state, and avoid invalidation from unpublished version changes. Existing
-- inputs and migration 0057's marks domain survive.
-- Hopper dependencies and own-pin cursor invalidation are repaired below.

-- The old triggers could already have missed a source reinsertion or allowed a
-- cursor across an own pin. Repair carried proofs as well as future writes.
UPDATE reading_order_state SET generation = '';
UPDATE change_state SET reading=reading+1 WHERE id=1;

DROP TRIGGER IF EXISTS reader_order_items_insert;
CREATE TRIGGER reader_order_items_insert
AFTER INSERT ON items
WHEN NEW.status IN ('public','withdrawn')
BEGIN
  INSERT INTO reading_order_state(id,generation,inputs) VALUES(1,'',1)
  ON CONFLICT(id) DO UPDATE SET inputs=inputs+1;
END;

DROP TRIGGER IF EXISTS reader_order_items_delete;
CREATE TRIGGER reader_order_items_delete
AFTER DELETE ON items
WHEN OLD.status IN ('public','withdrawn')
BEGIN
  INSERT INTO reading_order_state(id,generation,inputs) VALUES(1,'',1)
  ON CONFLICT(id) DO UPDATE SET inputs=inputs+1;
END;

DROP TRIGGER IF EXISTS reader_order_items_update;
CREATE TRIGGER reader_order_items_update
AFTER UPDATE ON items
WHEN (OLD.status IN ('public','withdrawn') OR NEW.status IN ('public','withdrawn')) AND (OLD."id" IS NOT NEW."id" OR OLD."kind" IS NOT NEW."kind" OR OLD."status" IS NOT NEW."status" OR OLD."version" IS NOT NEW."version")
BEGIN
  INSERT INTO reading_order_state(id,generation,inputs) VALUES(1,'',1)
  ON CONFLICT(id) DO UPDATE SET inputs=inputs+1;
END;

DROP TRIGGER IF EXISTS reader_order_versions_insert;
CREATE TRIGGER reader_order_versions_insert
AFTER INSERT ON versions
WHEN EXISTS(SELECT 1 FROM items WHERE status IN ('public','withdrawn') AND (id=NEW.item_id))
BEGIN
  INSERT INTO reading_order_state(id,generation,inputs) VALUES(1,'',1)
  ON CONFLICT(id) DO UPDATE SET inputs=inputs+1;
END;

DROP TRIGGER IF EXISTS reader_order_versions_delete;
CREATE TRIGGER reader_order_versions_delete
AFTER DELETE ON versions
WHEN EXISTS(SELECT 1 FROM items WHERE status IN ('public','withdrawn') AND (id=OLD.item_id))
BEGIN
  INSERT INTO reading_order_state(id,generation,inputs) VALUES(1,'',1)
  ON CONFLICT(id) DO UPDATE SET inputs=inputs+1;
END;

DROP TRIGGER IF EXISTS reader_order_versions_update;
CREATE TRIGGER reader_order_versions_update
AFTER UPDATE ON versions
WHEN EXISTS(SELECT 1 FROM items WHERE status IN ('public','withdrawn') AND (id=OLD.item_id OR id=NEW.item_id)) AND (OLD."item_id" IS NOT NEW."item_id" OR OLD."version" IS NOT NEW."version" OR OLD."kind" IS NOT NEW."kind" OR OLD."content_md" IS NOT NEW."content_md" OR OLD."content_hash" IS NOT NEW."content_hash" OR OLD."published_at" IS NOT NEW."published_at" OR OLD."note" IS NOT NEW."note" OR OLD."pinned" IS NOT NEW."pinned" OR OLD."transclusions" IS NOT NEW."transclusions")
BEGIN
  INSERT INTO reading_order_state(id,generation,inputs) VALUES(1,'',1)
  ON CONFLICT(id) DO UPDATE SET inputs=inputs+1;
END;

DROP TRIGGER IF EXISTS reader_order_imported_insert;
CREATE TRIGGER reader_order_imported_insert
AFTER INSERT ON imported_items
WHEN 1
BEGIN
  INSERT INTO reading_order_state(id,generation,inputs) VALUES(1,'',1)
  ON CONFLICT(id) DO UPDATE SET inputs=inputs+1;
END;

DROP TRIGGER IF EXISTS reader_order_imported_delete;
CREATE TRIGGER reader_order_imported_delete
AFTER DELETE ON imported_items
WHEN 1
BEGIN
  INSERT INTO reading_order_state(id,generation,inputs) VALUES(1,'',1)
  ON CONFLICT(id) DO UPDATE SET inputs=inputs+1;
END;

DROP TRIGGER IF EXISTS reader_order_imported_update;
CREATE TRIGGER reader_order_imported_update
AFTER UPDATE ON imported_items
WHEN OLD."subscription_id" IS NOT NEW."subscription_id" OR OLD."remote_id" IS NOT NEW."remote_id" OR OLD."kind" IS NOT NEW."kind" OR OLD."state" IS NOT NEW."state" OR OLD."version" IS NOT NEW."version" OR OLD."created" IS NOT NEW."created" OR OLD."updated" IS NOT NEW."updated" OR OLD."observed_at" IS NOT NEW."observed_at" OR OLD."l0" IS NOT NEW."l0" OR OLD."changelog_json" IS NOT NEW."changelog_json" OR OLD."maintenance_json" IS NOT NEW."maintenance_json" OR OLD."transclusions_json" IS NOT NEW."transclusions_json"
BEGIN
  INSERT INTO reading_order_state(id,generation,inputs) VALUES(1,'',1)
  ON CONFLICT(id) DO UPDATE SET inputs=inputs+1;
END;

DROP TRIGGER IF EXISTS reader_order_subscriptions_insert;
CREATE TRIGGER reader_order_subscriptions_insert
AFTER INSERT ON subscriptions
WHEN EXISTS(SELECT 1 FROM imported_items WHERE subscription_id=NEW.id)
BEGIN
  INSERT INTO reading_order_state(id,generation,inputs) VALUES(1,'',1)
  ON CONFLICT(id) DO UPDATE SET inputs=inputs+1;
END;

DROP TRIGGER IF EXISTS reader_order_subscriptions_delete;
CREATE TRIGGER reader_order_subscriptions_delete
AFTER DELETE ON subscriptions
WHEN EXISTS(SELECT 1 FROM imported_items WHERE subscription_id=OLD.id)
BEGIN
  INSERT INTO reading_order_state(id,generation,inputs) VALUES(1,'',1)
  ON CONFLICT(id) DO UPDATE SET inputs=inputs+1;
END;

DROP TRIGGER IF EXISTS reader_order_subscriptions_update;
CREATE TRIGGER reader_order_subscriptions_update
AFTER UPDATE ON subscriptions
WHEN (OLD."id" IS NOT NEW."id" OR OLD."origin" IS NOT NEW."origin") AND EXISTS(SELECT 1 FROM imported_items WHERE subscription_id=OLD.id OR subscription_id=NEW.id)
BEGIN
  INSERT INTO reading_order_state(id,generation,inputs) VALUES(1,'',1)
  ON CONFLICT(id) DO UPDATE SET inputs=inputs+1;
END;

-- Hoppers only depend on a held import through an actual membership. The
-- membership can outlive its imported row, so insertion/deletion also matters
-- when it changes a dangling membership's item between null and a resource.
-- Reading and Feed keep their existing invalidation semantics. Retain null-safe
-- full-column guards and D1-compatible trigger bodies (no END followed by a
-- semicolon inside a CASE expression).

DROP TRIGGER change_imported_items_update;
CREATE TRIGGER change_imported_items_update
AFTER UPDATE ON imported_items
WHEN OLD."author_json" IS NOT NEW."author_json" OR OLD."content_hash" IS NOT NEW."content_hash" OR OLD."content_html" IS NOT NEW."content_html" OR OLD."content_md" IS NOT NEW."content_md" OR OLD."created" IS NOT NEW."created" OR OLD."forked_from_json" IS NOT NEW."forked_from_json" OR OLD."generated_json" IS NOT NEW."generated_json" OR OLD."kind" IS NOT NEW."kind" OR OLD."l0" IS NOT NEW."l0" OR OLD."media_json" IS NOT NEW."media_json" OR OLD."observed_at" IS NOT NEW."observed_at" OR OLD."page" IS NOT NEW."page" OR OLD."pinned_version_retained" IS NOT NEW."pinned_version_retained" OR OLD."remote_id" IS NOT NEW."remote_id" OR OLD."state" IS NOT NEW."state" OR OLD."stub_of_json" IS NOT NEW."stub_of_json" OR OLD."subscription_id" IS NOT NEW."subscription_id" OR OLD."syndication_json" IS NOT NEW."syndication_json" OR OLD."transclusions_json" IS NOT NEW."transclusions_json" OR OLD."links_json" IS NOT NEW."links_json" OR OLD."updated" IS NOT NEW."updated" OR OLD."version" IS NOT NEW."version" OR OLD."bg_reasons" IS NOT NEW."bg_reasons" OR OLD."bg_detail" IS NOT NEW."bg_detail" OR OLD."changelog_json" IS NOT NEW."changelog_json" OR OLD."maintenance_json" IS NOT NEW."maintenance_json"
BEGIN
  SELECT RAISE(ABORT, 'missing change state') WHERE NOT EXISTS(SELECT 1 FROM change_state WHERE id=1);
  UPDATE change_state SET
    reading=reading+(1),
    hoppers=hoppers+(CASE WHEN (OLD."author_json" IS NOT NEW."author_json" OR OLD."content_hash" IS NOT NEW."content_hash" OR OLD."content_html" IS NOT NEW."content_html" OR OLD."content_md" IS NOT NEW."content_md" OR OLD."created" IS NOT NEW."created" OR OLD."forked_from_json" IS NOT NEW."forked_from_json" OR OLD."generated_json" IS NOT NEW."generated_json" OR OLD."kind" IS NOT NEW."kind" OR OLD."l0" IS NOT NEW."l0" OR OLD."media_json" IS NOT NEW."media_json" OR OLD."observed_at" IS NOT NEW."observed_at" OR OLD."page" IS NOT NEW."page" OR OLD."pinned_version_retained" IS NOT NEW."pinned_version_retained" OR OLD."remote_id" IS NOT NEW."remote_id" OR OLD."state" IS NOT NEW."state" OR OLD."stub_of_json" IS NOT NEW."stub_of_json" OR OLD."subscription_id" IS NOT NEW."subscription_id" OR OLD."syndication_json" IS NOT NEW."syndication_json" OR OLD."transclusions_json" IS NOT NEW."transclusions_json" OR OLD."updated" IS NOT NEW."updated" OR OLD."version" IS NOT NEW."version") AND EXISTS(SELECT 1 FROM hopper_items WHERE (subscription_id=OLD.subscription_id AND remote_id=OLD.remote_id) OR (subscription_id=NEW.subscription_id AND remote_id=NEW.remote_id)) THEN 1 ELSE 0 END),
    feed=feed+(CASE WHEN (OLD."kind" IS NOT NEW."kind" OR OLD."page" IS NOT NEW."page" OR OLD."remote_id" IS NOT NEW."remote_id" OR OLD."subscription_id" IS NOT NEW."subscription_id") THEN 1 ELSE 0 END)
  WHERE id=1;
END;

DROP TRIGGER change_imported_items_insert;
CREATE TRIGGER change_imported_items_insert
AFTER INSERT ON imported_items
BEGIN
  SELECT RAISE(ABORT, 'missing change state') WHERE NOT EXISTS(SELECT 1 FROM change_state WHERE id=1);
  UPDATE change_state SET reading=reading+1,
    hoppers=hoppers+(CASE WHEN EXISTS(SELECT 1 FROM hopper_items WHERE (subscription_id=NEW.subscription_id AND remote_id=NEW.remote_id)) THEN 1 ELSE 0 END), feed=feed+1 WHERE id=1;
END;

DROP TRIGGER change_imported_items_delete;
CREATE TRIGGER change_imported_items_delete
AFTER DELETE ON imported_items
BEGIN
  SELECT RAISE(ABORT, 'missing change state') WHERE NOT EXISTS(SELECT 1 FROM change_state WHERE id=1);
  UPDATE change_state SET reading=reading+1,
    hoppers=hoppers+(CASE WHEN EXISTS(SELECT 1 FROM hopper_items WHERE (subscription_id=OLD.subscription_id AND remote_id=OLD.remote_id)) THEN 1 ELSE 0 END), feed=feed+1 WHERE id=1;
END;

-- Pins change pace-layered positions. Reading continuations must expire along
-- with that order change, even though a pin does not change the displayed body.
DROP TRIGGER change_versions_update;
CREATE TRIGGER change_versions_update
AFTER UPDATE ON versions
WHEN OLD."kind" IS NOT NEW."kind" OR OLD."content_hash" IS NOT NEW."content_hash" OR OLD."content_html" IS NOT NEW."content_html" OR OLD."content_md" IS NOT NEW."content_md" OR OLD."generated_json" IS NOT NEW."generated_json" OR OLD."item_id" IS NOT NEW."item_id" OR OLD."note" IS NOT NEW."note" OR OLD."note_generated" IS NOT NEW."note_generated" OR OLD."pinned" IS NOT NEW."pinned" OR OLD."pinned_at" IS NOT NEW."pinned_at" OR OLD."published_at" IS NOT NEW."published_at" OR OLD."stub_cite" IS NOT NEW."stub_cite" OR OLD."stub_of" IS NOT NEW."stub_of" OR OLD."transclusions" IS NOT NEW."transclusions" OR OLD."links_json" IS NOT NEW."links_json" OR OLD."version" IS NOT NEW."version"
BEGIN
  SELECT RAISE(ABORT, 'missing change state') WHERE NOT EXISTS(SELECT 1 FROM change_state WHERE id=1);
  UPDATE change_state SET
    items=items+(1),
    reading=reading+(CASE WHEN (OLD."pinned" IS NOT NEW."pinned" OR OLD."kind" IS NOT NEW."kind" OR OLD."content_hash" IS NOT NEW."content_hash" OR OLD."content_html" IS NOT NEW."content_html" OR OLD."content_md" IS NOT NEW."content_md" OR OLD."item_id" IS NOT NEW."item_id" OR OLD."note" IS NOT NEW."note" OR OLD."note_generated" IS NOT NEW."note_generated" OR OLD."published_at" IS NOT NEW."published_at" OR OLD."stub_cite" IS NOT NEW."stub_cite" OR OLD."stub_of" IS NOT NEW."stub_of" OR OLD."transclusions" IS NOT NEW."transclusions" OR OLD."links_json" IS NOT NEW."links_json" OR OLD."version" IS NOT NEW."version") THEN 1 ELSE 0 END),
    feed=feed+(CASE WHEN (OLD."kind" IS NOT NEW."kind" OR OLD."content_hash" IS NOT NEW."content_hash" OR OLD."content_html" IS NOT NEW."content_html" OR OLD."content_md" IS NOT NEW."content_md" OR OLD."item_id" IS NOT NEW."item_id" OR OLD."note" IS NOT NEW."note" OR OLD."note_generated" IS NOT NEW."note_generated" OR OLD."published_at" IS NOT NEW."published_at" OR OLD."stub_cite" IS NOT NEW."stub_cite" OR OLD."stub_of" IS NOT NEW."stub_of" OR OLD."transclusions" IS NOT NEW."transclusions" OR OLD."links_json" IS NOT NEW."links_json" OR OLD."version" IS NOT NEW."version") THEN 1 ELSE 0 END)
  WHERE id=1;
END;
