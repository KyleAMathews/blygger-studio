-- Tangling (blygger-spec docs/tangling-plan.md §2.7): the thread whose
-- `![[+ …]]` span minted this item. Studio-private, never on the wire. A thread
-- publish uses it to finish a tangle that stopped between minting and publish.
ALTER TABLE items ADD COLUMN tangled_from TEXT;

-- The polling oracle holds every column of a table to its change_<table>_update
-- guard, so the trigger is recreated with the new column in its WHEN. The body
-- is 0046's; tangled_from is set only when an item is inserted, so it counts
-- toward items and nothing else.
DROP TRIGGER IF EXISTS change_items_update;
CREATE TRIGGER change_items_update
AFTER UPDATE ON items
WHEN OLD."content_md" IS NOT NEW."content_md" OR OLD."created" IS NOT NEW."created" OR OLD."dirty" IS NOT NEW."dirty" OR OLD."fork_cite" IS NOT NEW."fork_cite" OR OLD."forked_from" IS NOT NEW."forked_from" OR OLD."highlight_override" IS NOT NEW."highlight_override" OR OLD."id" IS NOT NEW."id" OR OLD."kind" IS NOT NEW."kind" OR OLD."responses_override" IS NOT NEW."responses_override" OR OLD."show_responses" IS NOT NEW."show_responses" OR OLD."status" IS NOT NEW."status" OR OLD."stub_of" IS NOT NEW."stub_of" OR OLD."tk_provenance_json" IS NOT NEW."tk_provenance_json" OR OLD."updated" IS NOT NEW."updated" OR OLD."version" IS NOT NEW."version" OR OLD."revision" IS NOT NEW."revision" OR OLD."bg_reasons" IS NOT NEW."bg_reasons" OR OLD."bg_detail" IS NOT NEW."bg_detail" OR OLD."tangled_from" IS NOT NEW."tangled_from"
BEGIN
  SELECT RAISE(ABORT, 'missing change state') WHERE NOT EXISTS(SELECT 1 FROM change_state WHERE id=1);
  UPDATE change_state SET
    items=items+(1),
    reading=reading+(CASE WHEN (OLD.status IN ('public','withdrawn') OR NEW.status IN ('public','withdrawn')) AND (OLD."created" IS NOT NEW."created" OR OLD."fork_cite" IS NOT NEW."fork_cite" OR OLD."forked_from" IS NOT NEW."forked_from" OR OLD."id" IS NOT NEW."id" OR OLD."kind" IS NOT NEW."kind" OR OLD."status" IS NOT NEW."status" OR OLD."updated" IS NOT NEW."updated" OR OLD."version" IS NOT NEW."version" OR OLD."bg_reasons" IS NOT NEW."bg_reasons" OR OLD."bg_detail" IS NOT NEW."bg_detail") THEN 1 ELSE 0 END),
    feed=feed+(CASE WHEN ((OLD.status IN ('public','withdrawn') OR NEW.status IN ('public','withdrawn')) AND (OLD."created" IS NOT NEW."created" OR OLD."fork_cite" IS NOT NEW."fork_cite" OR OLD."forked_from" IS NOT NEW."forked_from" OR OLD."id" IS NOT NEW."id" OR OLD."kind" IS NOT NEW."kind" OR OLD."status" IS NOT NEW."status" OR OLD."updated" IS NOT NEW."updated" OR OLD."version" IS NOT NEW."version")) OR OLD."id" IS NOT NEW."id" OR OLD."kind" IS NOT NEW."kind" THEN 1 ELSE 0 END)
  WHERE id=1;
END;
