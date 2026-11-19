-- Disclosed links (blygger-spec 0.4 §10.3a, decision #79; ROADMAP row 77): the
-- plain internal links a version's content_md resolved, in document order, as
-- the item document's `links` array. Stored with the version, as transclusions
-- are, so a pinned version document carries its own.
ALTER TABLE versions ADD COLUMN links_json TEXT;
-- And kept on import, so a reader can fold the items a thread names by link as
-- it folds the items it quotes (spec §13.7; the `[[+ text]]` placeholders).
ALTER TABLE imported_items ADD COLUMN links_json TEXT;

-- The polling oracle holds every column of a table to its change_<table>_update
-- guard. Each body is the latest one (0034 for versions, 0046 for
-- imported_items) with links_json beside transclusions wherever that appears:
-- a version's links are published content, as its quotes are.
DROP TRIGGER IF EXISTS change_versions_update;
CREATE TRIGGER change_versions_update
AFTER UPDATE ON versions
WHEN OLD."kind" IS NOT NEW."kind" OR OLD."content_hash" IS NOT NEW."content_hash" OR OLD."content_html" IS NOT NEW."content_html" OR OLD."content_md" IS NOT NEW."content_md" OR OLD."generated_json" IS NOT NEW."generated_json" OR OLD."item_id" IS NOT NEW."item_id" OR OLD."note" IS NOT NEW."note" OR OLD."note_generated" IS NOT NEW."note_generated" OR OLD."pinned" IS NOT NEW."pinned" OR OLD."pinned_at" IS NOT NEW."pinned_at" OR OLD."published_at" IS NOT NEW."published_at" OR OLD."stub_cite" IS NOT NEW."stub_cite" OR OLD."stub_of" IS NOT NEW."stub_of" OR OLD."transclusions" IS NOT NEW."transclusions" OR OLD."links_json" IS NOT NEW."links_json" OR OLD."version" IS NOT NEW."version"
BEGIN
  SELECT RAISE(ABORT, 'missing change state') WHERE NOT EXISTS(SELECT 1 FROM change_state WHERE id=1);
  UPDATE change_state SET
    items=items+(1),
    reading=reading+(CASE WHEN (OLD."kind" IS NOT NEW."kind" OR OLD."content_hash" IS NOT NEW."content_hash" OR OLD."content_html" IS NOT NEW."content_html" OR OLD."content_md" IS NOT NEW."content_md" OR OLD."item_id" IS NOT NEW."item_id" OR OLD."note" IS NOT NEW."note" OR OLD."note_generated" IS NOT NEW."note_generated" OR OLD."published_at" IS NOT NEW."published_at" OR OLD."stub_cite" IS NOT NEW."stub_cite" OR OLD."stub_of" IS NOT NEW."stub_of" OR OLD."transclusions" IS NOT NEW."transclusions" OR OLD."links_json" IS NOT NEW."links_json" OR OLD."version" IS NOT NEW."version") THEN 1 ELSE 0 END),
    feed=feed+(CASE WHEN (OLD."kind" IS NOT NEW."kind" OR OLD."content_hash" IS NOT NEW."content_hash" OR OLD."content_html" IS NOT NEW."content_html" OR OLD."content_md" IS NOT NEW."content_md" OR OLD."item_id" IS NOT NEW."item_id" OR OLD."note" IS NOT NEW."note" OR OLD."note_generated" IS NOT NEW."note_generated" OR OLD."published_at" IS NOT NEW."published_at" OR OLD."stub_cite" IS NOT NEW."stub_cite" OR OLD."stub_of" IS NOT NEW."stub_of" OR OLD."transclusions" IS NOT NEW."transclusions" OR OLD."links_json" IS NOT NEW."links_json" OR OLD."version" IS NOT NEW."version") THEN 1 ELSE 0 END)
  WHERE id=1;
END;

DROP TRIGGER IF EXISTS change_imported_items_update;
CREATE TRIGGER change_imported_items_update
AFTER UPDATE ON imported_items
WHEN OLD."author_json" IS NOT NEW."author_json" OR OLD."content_hash" IS NOT NEW."content_hash" OR OLD."content_html" IS NOT NEW."content_html" OR OLD."content_md" IS NOT NEW."content_md" OR OLD."created" IS NOT NEW."created" OR OLD."forked_from_json" IS NOT NEW."forked_from_json" OR OLD."generated_json" IS NOT NEW."generated_json" OR OLD."kind" IS NOT NEW."kind" OR OLD."l0" IS NOT NEW."l0" OR OLD."media_json" IS NOT NEW."media_json" OR OLD."observed_at" IS NOT NEW."observed_at" OR OLD."page" IS NOT NEW."page" OR OLD."pinned_version_retained" IS NOT NEW."pinned_version_retained" OR OLD."remote_id" IS NOT NEW."remote_id" OR OLD."state" IS NOT NEW."state" OR OLD."stub_of_json" IS NOT NEW."stub_of_json" OR OLD."subscription_id" IS NOT NEW."subscription_id" OR OLD."transclusions_json" IS NOT NEW."transclusions_json" OR OLD."links_json" IS NOT NEW."links_json" OR OLD."updated" IS NOT NEW."updated" OR OLD."version" IS NOT NEW."version" OR OLD."bg_reasons" IS NOT NEW."bg_reasons" OR OLD."bg_detail" IS NOT NEW."bg_detail"
BEGIN
  SELECT RAISE(ABORT, 'missing change state') WHERE NOT EXISTS(SELECT 1 FROM change_state WHERE id=1);
  UPDATE change_state SET
    reading=reading+(1),
    hoppers=hoppers+(1),
    feed=feed+(CASE WHEN (OLD."kind" IS NOT NEW."kind" OR OLD."page" IS NOT NEW."page" OR OLD."remote_id" IS NOT NEW."remote_id" OR OLD."subscription_id" IS NOT NEW."subscription_id") THEN 1 ELSE 0 END)
  WHERE id=1;
END;
