-- Private taint is the server's (sealed-content-build-plan §1 0f, law 4; Venkat,
-- 2026-11-24, Q1). Until now the mark lived only in a working copy's provenance
-- JSON, which a client could rewrite and which a hand edit of the TK markers
-- dropped with its scope. It is now a column only the server writes: set when TK
-- generation draws on a private snapshot or on input already marked, cleared only
-- when the working copy is discarded (restore) or the item is deleted.
ALTER TABLE items ADD COLUMN private_taint INTEGER NOT NULL DEFAULT 0;

-- Working copies marked before this migration keep their mark.
UPDATE items SET private_taint = 1
WHERE instr(COALESCE(tk_provenance_json, ''), '"private":true') > 0;

-- The polling oracle holds every column to its change_items_update guard, so the
-- trigger is recreated with private_taint in its WHEN; the body is 0047's plus one
-- term. A token without owner:private pages a hopper's members with the item's
-- visibility as a premise (sealed-content-build-plan §1 0f, law 7): a member whose
-- status or taint changes moves `hoppers`, so that cursor no longer has to depend
-- on every item edit (studio#178 V7). Still one change_state UPDATE per effect.
DROP TRIGGER IF EXISTS change_items_update;
CREATE TRIGGER change_items_update
AFTER UPDATE ON items
WHEN OLD."content_md" IS NOT NEW."content_md" OR OLD."created" IS NOT NEW."created" OR OLD."dirty" IS NOT NEW."dirty" OR OLD."fork_cite" IS NOT NEW."fork_cite" OR OLD."forked_from" IS NOT NEW."forked_from" OR OLD."highlight_override" IS NOT NEW."highlight_override" OR OLD."id" IS NOT NEW."id" OR OLD."kind" IS NOT NEW."kind" OR OLD."responses_override" IS NOT NEW."responses_override" OR OLD."show_responses" IS NOT NEW."show_responses" OR OLD."status" IS NOT NEW."status" OR OLD."stub_of" IS NOT NEW."stub_of" OR OLD."tk_provenance_json" IS NOT NEW."tk_provenance_json" OR OLD."updated" IS NOT NEW."updated" OR OLD."version" IS NOT NEW."version" OR OLD."revision" IS NOT NEW."revision" OR OLD."bg_reasons" IS NOT NEW."bg_reasons" OR OLD."bg_detail" IS NOT NEW."bg_detail" OR OLD."tangled_from" IS NOT NEW."tangled_from" OR OLD."private_taint" IS NOT NEW."private_taint"
BEGIN
  SELECT RAISE(ABORT, 'missing change state') WHERE NOT EXISTS(SELECT 1 FROM change_state WHERE id=1);
  UPDATE change_state SET
    items=items+(1),
    reading=reading+(CASE WHEN (OLD.status IN ('public','withdrawn') OR NEW.status IN ('public','withdrawn')) AND (OLD."created" IS NOT NEW."created" OR OLD."fork_cite" IS NOT NEW."fork_cite" OR OLD."forked_from" IS NOT NEW."forked_from" OR OLD."id" IS NOT NEW."id" OR OLD."kind" IS NOT NEW."kind" OR OLD."status" IS NOT NEW."status" OR OLD."updated" IS NOT NEW."updated" OR OLD."version" IS NOT NEW."version" OR OLD."bg_reasons" IS NOT NEW."bg_reasons" OR OLD."bg_detail" IS NOT NEW."bg_detail") THEN 1 ELSE 0 END),
    hoppers=hoppers+(CASE WHEN (OLD.status IS NOT NEW.status OR OLD."private_taint" IS NOT NEW."private_taint") AND EXISTS(SELECT 1 FROM hopper_items WHERE subscription_id = '~own' AND remote_id = NEW.id) THEN 1 ELSE 0 END),
    feed=feed+(CASE WHEN ((OLD.status IN ('public','withdrawn') OR NEW.status IN ('public','withdrawn')) AND (OLD."created" IS NOT NEW."created" OR OLD."fork_cite" IS NOT NEW."fork_cite" OR OLD."forked_from" IS NOT NEW."forked_from" OR OLD."id" IS NOT NEW."id" OR OLD."kind" IS NOT NEW."kind" OR OLD."status" IS NOT NEW."status" OR OLD."updated" IS NOT NEW."updated" OR OLD."version" IS NOT NEW."version")) OR OLD."id" IS NOT NEW."id" OR OLD."kind" IS NOT NEW."kind" THEN 1 ELSE 0 END)
  WHERE id=1;
END;
