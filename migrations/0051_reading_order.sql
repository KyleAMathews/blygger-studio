-- The reader's pace-layered order (ROADMAP row 69). 0050 is reserved for
-- Kyle Mathews' FTS5 search (#146).
--
-- What an imported item's changelog said when it was last fetched, and which
-- of its versions this reader judged maintenance when they arrived (same text,
-- a quote refresh or a near-same edit): the pace-layered order's inputs for
-- someone else's blyg, as src/feeds/history.ts derives them for our own.
ALTER TABLE imported_items ADD COLUMN changelog_json TEXT;
ALTER TABLE imported_items ADD COLUMN maintenance_json TEXT;

-- The polling cache's change trigger lists every column it watches, and an
-- oracle test holds it to the table's full column set. Recreated with the two
-- columns above added; otherwise identical to 0049's. Guards are SELECT RAISE
-- ... WHERE, with no CASE closed by END and a semicolon (0024, session 37).
DROP TRIGGER IF EXISTS change_imported_items_update;
CREATE TRIGGER change_imported_items_update
AFTER UPDATE ON imported_items
WHEN OLD."author_json" IS NOT NEW."author_json" OR OLD."content_hash" IS NOT NEW."content_hash" OR OLD."content_html" IS NOT NEW."content_html" OR OLD."content_md" IS NOT NEW."content_md" OR OLD."created" IS NOT NEW."created" OR OLD."forked_from_json" IS NOT NEW."forked_from_json" OR OLD."generated_json" IS NOT NEW."generated_json" OR OLD."kind" IS NOT NEW."kind" OR OLD."l0" IS NOT NEW."l0" OR OLD."media_json" IS NOT NEW."media_json" OR OLD."observed_at" IS NOT NEW."observed_at" OR OLD."page" IS NOT NEW."page" OR OLD."pinned_version_retained" IS NOT NEW."pinned_version_retained" OR OLD."remote_id" IS NOT NEW."remote_id" OR OLD."state" IS NOT NEW."state" OR OLD."stub_of_json" IS NOT NEW."stub_of_json" OR OLD."subscription_id" IS NOT NEW."subscription_id" OR OLD."syndication_json" IS NOT NEW."syndication_json" OR OLD."transclusions_json" IS NOT NEW."transclusions_json" OR OLD."links_json" IS NOT NEW."links_json" OR OLD."updated" IS NOT NEW."updated" OR OLD."version" IS NOT NEW."version" OR OLD."bg_reasons" IS NOT NEW."bg_reasons" OR OLD."bg_detail" IS NOT NEW."bg_detail" OR OLD."changelog_json" IS NOT NEW."changelog_json" OR OLD."maintenance_json" IS NOT NEW."maintenance_json"
BEGIN
  SELECT RAISE(ABORT, 'missing change state') WHERE NOT EXISTS(SELECT 1 FROM change_state WHERE id=1);
  UPDATE change_state SET
    reading=reading+(1),
    hoppers=hoppers+(1),
    feed=feed+(CASE WHEN (OLD."kind" IS NOT NEW."kind" OR OLD."page" IS NOT NEW."page" OR OLD."remote_id" IS NOT NEW."remote_id" OR OLD."subscription_id" IS NOT NEW."subscription_id") THEN 1 ELSE 0 END)
  WHERE id=1;
END;

-- Each reading identity's position in the pace-layered order, top first.
-- Derived: rebuilt whenever the reading collection's change generation moves
-- (src/feeds/reader-order.ts). Backups carry it like any table; a restore rebuilds it on the next read anyway.
CREATE TABLE reading_order (
  source TEXT NOT NULL,
  sub TEXT NOT NULL,
  id TEXT NOT NULL,
  position INTEGER NOT NULL,
  PRIMARY KEY (source, sub, id)
);
CREATE TABLE reading_order_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  generation TEXT NOT NULL
);
