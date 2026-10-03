-- Whether an upload was placed in the text by the studio (studio#24, session 32).
--
-- Since 0.11 every Studio upload is inserted at the caret as `![](media/…)`. An
-- inline image belongs where its line is: deleting the line takes it off the
-- page, the feed and the item's `media` list. Appending every attached row after
-- the content (the 0.1 behaviour) showed such images twice, and kept them after
-- their line was gone. Uploads that never touch the text — another tool's
-- POST /api/media — stay 0 and keep the appended behaviour.
--
-- Backfill: a row already referenced by its item's working copy was placed by
-- the studio, so it is inline. Everything else keeps today's behaviour until
-- its owner removes it.
ALTER TABLE media ADD COLUMN inline INTEGER NOT NULL DEFAULT 0;
UPDATE media SET inline = 1
  WHERE item_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM items i WHERE i.id = media.item_id AND instr(i.content_md, media.r2_key) > 0);
