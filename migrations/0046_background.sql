-- Background and Foreground in the reader (blygger-spec docs/background-plan.md,
-- phase 1). Studio-private: nothing here reaches an item document, a feed, the
-- manifest, a public page or the static export.
--
-- bg_reasons is a JSON array of reason codes stored as facts (null for none);
-- Settings decide at query time which of them count, so turning a rule off
-- moves its items back with nothing recomputed. bg_detail holds what a reason's
-- chip says (a JSON object). reading_placement is the owner's explicit choice
-- on one item, which beats every rule; subscriptions.background is the choice
-- on a whole blyg. sub is '' for own items.
--
-- Guards are SELECT RAISE ... WHERE and no CASE closed by END and a semicolon
-- (0024, session 37).
ALTER TABLE items ADD COLUMN bg_reasons TEXT;
ALTER TABLE items ADD COLUMN bg_detail TEXT;
ALTER TABLE imported_items ADD COLUMN bg_reasons TEXT;
ALTER TABLE imported_items ADD COLUMN bg_detail TEXT;
ALTER TABLE subscriptions ADD COLUMN background INTEGER NOT NULL DEFAULT 0 CHECK(background IN (0, 1));

CREATE TABLE reading_placement (
  source TEXT NOT NULL CHECK(source IN ('own', 'imported')),
  sub TEXT NOT NULL,
  id TEXT NOT NULL,
  placement TEXT NOT NULL CHECK(placement IN ('background', 'foreground')),
  at TEXT NOT NULL,
  PRIMARY KEY (source, sub, id)
);

-- The three update triggers are recreated with the new columns in their
-- guards, as 0035 did for revision: the polling oracle holds every column of a
-- table to its change_<table>_update trigger. Each body is the latest one
-- (0035, 0027, 0038) with the Background columns added to reading.
DROP TRIGGER IF EXISTS change_items_update;
CREATE TRIGGER change_items_update
AFTER UPDATE ON items
WHEN OLD."content_md" IS NOT NEW."content_md" OR OLD."created" IS NOT NEW."created" OR OLD."dirty" IS NOT NEW."dirty" OR OLD."fork_cite" IS NOT NEW."fork_cite" OR OLD."forked_from" IS NOT NEW."forked_from" OR OLD."highlight_override" IS NOT NEW."highlight_override" OR OLD."id" IS NOT NEW."id" OR OLD."kind" IS NOT NEW."kind" OR OLD."responses_override" IS NOT NEW."responses_override" OR OLD."show_responses" IS NOT NEW."show_responses" OR OLD."status" IS NOT NEW."status" OR OLD."stub_of" IS NOT NEW."stub_of" OR OLD."tk_provenance_json" IS NOT NEW."tk_provenance_json" OR OLD."updated" IS NOT NEW."updated" OR OLD."version" IS NOT NEW."version" OR OLD."revision" IS NOT NEW."revision" OR OLD."bg_reasons" IS NOT NEW."bg_reasons" OR OLD."bg_detail" IS NOT NEW."bg_detail"
BEGIN
  SELECT RAISE(ABORT, 'missing change state') WHERE NOT EXISTS(SELECT 1 FROM change_state WHERE id=1);
  UPDATE change_state SET
    items=items+(1),
    reading=reading+(CASE WHEN (OLD.status IN ('public','withdrawn') OR NEW.status IN ('public','withdrawn')) AND (OLD."created" IS NOT NEW."created" OR OLD."fork_cite" IS NOT NEW."fork_cite" OR OLD."forked_from" IS NOT NEW."forked_from" OR OLD."id" IS NOT NEW."id" OR OLD."kind" IS NOT NEW."kind" OR OLD."status" IS NOT NEW."status" OR OLD."updated" IS NOT NEW."updated" OR OLD."version" IS NOT NEW."version" OR OLD."bg_reasons" IS NOT NEW."bg_reasons" OR OLD."bg_detail" IS NOT NEW."bg_detail") THEN 1 ELSE 0 END),
    feed=feed+(CASE WHEN ((OLD.status IN ('public','withdrawn') OR NEW.status IN ('public','withdrawn')) AND (OLD."created" IS NOT NEW."created" OR OLD."fork_cite" IS NOT NEW."fork_cite" OR OLD."forked_from" IS NOT NEW."forked_from" OR OLD."id" IS NOT NEW."id" OR OLD."kind" IS NOT NEW."kind" OR OLD."status" IS NOT NEW."status" OR OLD."updated" IS NOT NEW."updated" OR OLD."version" IS NOT NEW."version")) OR OLD."id" IS NOT NEW."id" OR OLD."kind" IS NOT NEW."kind" THEN 1 ELSE 0 END)
  WHERE id=1;
END;

DROP TRIGGER IF EXISTS change_imported_items_update;
CREATE TRIGGER change_imported_items_update
AFTER UPDATE ON imported_items
WHEN OLD."author_json" IS NOT NEW."author_json" OR OLD."content_hash" IS NOT NEW."content_hash" OR OLD."content_html" IS NOT NEW."content_html" OR OLD."content_md" IS NOT NEW."content_md" OR OLD."created" IS NOT NEW."created" OR OLD."forked_from_json" IS NOT NEW."forked_from_json" OR OLD."generated_json" IS NOT NEW."generated_json" OR OLD."kind" IS NOT NEW."kind" OR OLD."l0" IS NOT NEW."l0" OR OLD."media_json" IS NOT NEW."media_json" OR OLD."observed_at" IS NOT NEW."observed_at" OR OLD."page" IS NOT NEW."page" OR OLD."pinned_version_retained" IS NOT NEW."pinned_version_retained" OR OLD."remote_id" IS NOT NEW."remote_id" OR OLD."state" IS NOT NEW."state" OR OLD."stub_of_json" IS NOT NEW."stub_of_json" OR OLD."subscription_id" IS NOT NEW."subscription_id" OR OLD."transclusions_json" IS NOT NEW."transclusions_json" OR OLD."updated" IS NOT NEW."updated" OR OLD."version" IS NOT NEW."version" OR OLD."bg_reasons" IS NOT NEW."bg_reasons" OR OLD."bg_detail" IS NOT NEW."bg_detail"
BEGIN
  SELECT RAISE(ABORT, 'missing change state') WHERE NOT EXISTS(SELECT 1 FROM change_state WHERE id=1);
  UPDATE change_state SET
    reading=reading+(1),
    hoppers=hoppers+(1),
    feed=feed+(CASE WHEN (OLD."kind" IS NOT NEW."kind" OR OLD."page" IS NOT NEW."page" OR OLD."remote_id" IS NOT NEW."remote_id" OR OLD."subscription_id" IS NOT NEW."subscription_id") THEN 1 ELSE 0 END)
  WHERE id=1;
END;

DROP TRIGGER IF EXISTS change_subscriptions_update;
CREATE TRIGGER change_subscriptions_update
AFTER UPDATE ON subscriptions
WHEN OLD."created" IS NOT NEW."created" OR OLD."etag" IS NOT NEW."etag" OR OLD."fail_count" IS NOT NEW."fail_count" OR OLD."feed_url" IS NOT NEW."feed_url" OR OLD."flags" IS NOT NEW."flags" OR OLD."id" IS NOT NEW."id" OR OLD."in_blogroll" IS NOT NEW."in_blogroll" OR OLD."kind" IS NOT NEW."kind" OR OLD."last_index_sync_at" IS NOT NEW."last_index_sync_at" OR OLD."last_modified" IS NOT NEW."last_modified" OR OLD."last_poll_at" IS NOT NEW."last_poll_at" OR OLD."newest_guid" IS NOT NEW."newest_guid" OR OLD."origin" IS NOT NEW."origin" OR OLD."status" IS NOT NEW."status" OR OLD."title" IS NOT NEW."title" OR OLD."title_auto" IS NOT NEW."title_auto" OR OLD."surface" IS NOT NEW."surface" OR OLD."hopper_feed" IS NOT NEW."hopper_feed" OR OLD."background" IS NOT NEW."background"
BEGIN
  SELECT RAISE(ABORT, 'missing change state') WHERE NOT EXISTS(SELECT 1 FROM change_state WHERE id=1);
  UPDATE change_state SET
    reading=reading+(CASE WHEN (OLD."id" IS NOT NEW."id" OR OLD."origin" IS NOT NEW."origin" OR OLD."title" IS NOT NEW."title" OR OLD."background" IS NOT NEW."background") THEN 1 ELSE 0 END),
    subscriptions=subscriptions+(1),
    hoppers=hoppers+(CASE WHEN (OLD."id" IS NOT NEW."id" OR OLD."origin" IS NOT NEW."origin" OR OLD."title" IS NOT NEW."title") THEN 1 ELSE 0 END),
    feed=feed+(CASE WHEN (OLD."id" IS NOT NEW."id" OR OLD."origin" IS NOT NEW."origin" OR OLD."title" IS NOT NEW."title") THEN 1 ELSE 0 END)
  WHERE id=1;
END;

CREATE TRIGGER change_reading_placement_insert
AFTER INSERT ON reading_placement
BEGIN
  SELECT RAISE(ABORT, 'missing change state') WHERE NOT EXISTS(SELECT 1 FROM change_state WHERE id=1);
  UPDATE change_state SET reading=reading+1 WHERE id=1;
END;

CREATE TRIGGER change_reading_placement_update
AFTER UPDATE ON reading_placement
WHEN OLD.placement IS NOT NEW.placement OR OLD.source IS NOT NEW.source OR OLD.sub IS NOT NEW.sub OR OLD.id IS NOT NEW.id
BEGIN
  SELECT RAISE(ABORT, 'missing change state') WHERE NOT EXISTS(SELECT 1 FROM change_state WHERE id=1);
  UPDATE change_state SET reading=reading+1 WHERE id=1;
END;

CREATE TRIGGER change_reading_placement_delete
AFTER DELETE ON reading_placement
BEGIN
  SELECT RAISE(ABORT, 'missing change state') WHERE NOT EXISTS(SELECT 1 FROM change_state WHERE id=1);
  UPDATE change_state SET reading=reading+1 WHERE id=1;
END;

-- A discarded draft cannot be in the reader, but a deleted own item or an
-- unsubscribed blyg must not leave a placement behind to resurface.
CREATE TRIGGER reading_placement_items_delete
AFTER DELETE ON items
BEGIN
  DELETE FROM reading_placement WHERE source='own' AND id=OLD.id;
END;

CREATE TRIGGER reading_placement_subscriptions_delete
AFTER DELETE ON subscriptions
BEGIN
  DELETE FROM reading_placement WHERE source='imported' AND sub=OLD.id;
END;
