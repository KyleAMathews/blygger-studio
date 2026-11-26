-- Each published version keeps the working copy it was published from (studio#184;
-- Venkat, session 87): its text with any [TK] scopes, and their provenance cache.
-- Publication strips each scope to its bare output, so "discard changes" could only
-- give back the stripped text, losing the scopes and leaving a copy that could never
-- be clean again. Studio-private: no public route, feed or item document reads these.
-- `source_md` is stored only where it differs from the published `content_md` (most
-- versions have no scopes and no comments to self, and cost nothing); NULL means "the
-- same as published". `source_provenance_json` is always written from here on ('[]'
-- when there is none), so a NULL there marks a version from before this migration,
-- or a withdrawal endcap.
ALTER TABLE versions ADD COLUMN source_md TEXT;
ALTER TABLE versions ADD COLUMN source_provenance_json TEXT;

-- The polling oracle holds every column to its change_versions_update guard
-- (docs/d1-polling-cache-design.md R1), so the trigger is recreated with the two new
-- columns in its WHEN; the body is 0058's unchanged.
DROP TRIGGER IF EXISTS change_versions_update;
CREATE TRIGGER change_versions_update
AFTER UPDATE ON versions
WHEN OLD."kind" IS NOT NEW."kind" OR OLD."content_hash" IS NOT NEW."content_hash" OR OLD."content_html" IS NOT NEW."content_html" OR OLD."content_md" IS NOT NEW."content_md" OR OLD."generated_json" IS NOT NEW."generated_json" OR OLD."item_id" IS NOT NEW."item_id" OR OLD."note" IS NOT NEW."note" OR OLD."note_generated" IS NOT NEW."note_generated" OR OLD."pinned" IS NOT NEW."pinned" OR OLD."pinned_at" IS NOT NEW."pinned_at" OR OLD."published_at" IS NOT NEW."published_at" OR OLD."stub_cite" IS NOT NEW."stub_cite" OR OLD."stub_of" IS NOT NEW."stub_of" OR OLD."transclusions" IS NOT NEW."transclusions" OR OLD."links_json" IS NOT NEW."links_json" OR OLD."version" IS NOT NEW."version" OR OLD."source_md" IS NOT NEW."source_md" OR OLD."source_provenance_json" IS NOT NEW."source_provenance_json"
BEGIN
  SELECT RAISE(ABORT, 'missing change state') WHERE NOT EXISTS(SELECT 1 FROM change_state WHERE id=1);
  UPDATE change_state SET
    items=items+(1),
    reading=reading+(CASE WHEN (OLD."pinned" IS NOT NEW."pinned" OR OLD."kind" IS NOT NEW."kind" OR OLD."content_hash" IS NOT NEW."content_hash" OR OLD."content_html" IS NOT NEW."content_html" OR OLD."content_md" IS NOT NEW."content_md" OR OLD."item_id" IS NOT NEW."item_id" OR OLD."note" IS NOT NEW."note" OR OLD."note_generated" IS NOT NEW."note_generated" OR OLD."published_at" IS NOT NEW."published_at" OR OLD."stub_cite" IS NOT NEW."stub_cite" OR OLD."stub_of" IS NOT NEW."stub_of" OR OLD."transclusions" IS NOT NEW."transclusions" OR OLD."links_json" IS NOT NEW."links_json" OR OLD."version" IS NOT NEW."version") THEN 1 ELSE 0 END),
    feed=feed+(CASE WHEN (OLD."kind" IS NOT NEW."kind" OR OLD."content_hash" IS NOT NEW."content_hash" OR OLD."content_html" IS NOT NEW."content_html" OR OLD."content_md" IS NOT NEW."content_md" OR OLD."item_id" IS NOT NEW."item_id" OR OLD."note" IS NOT NEW."note" OR OLD."note_generated" IS NOT NEW."note_generated" OR OLD."published_at" IS NOT NEW."published_at" OR OLD."stub_cite" IS NOT NEW."stub_cite" OR OLD."stub_of" IS NOT NEW."stub_of" OR OLD."transclusions" IS NOT NEW."transclusions" OR OLD."links_json" IS NOT NEW."links_json" OR OLD."version" IS NOT NEW."version") THEN 1 ELSE 0 END)
  WHERE id=1;
END;
