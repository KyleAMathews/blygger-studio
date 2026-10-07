-- Where another blyg's surface lives (spec §16.6e, decision #51; v0.4-plan.md §7.5 M1).
-- JSON of the non-default locations its manifest declared: manifest, feed, items,
-- item, pin. NULL means the default paths, which is every blyg before 0.4.
ALTER TABLE subscriptions ADD COLUMN surface TEXT;

-- The polling cache's change trigger (0024) lists every column it watches, and
-- an oracle test holds it to the table's full column set. Recreated with
-- `surface` added; otherwise identical to 0024's.
DROP TRIGGER IF EXISTS change_subscriptions_update;
CREATE TRIGGER change_subscriptions_update
AFTER UPDATE ON subscriptions
WHEN OLD."created" IS NOT NEW."created" OR OLD."etag" IS NOT NEW."etag" OR OLD."fail_count" IS NOT NEW."fail_count" OR OLD."feed_url" IS NOT NEW."feed_url" OR OLD."flags" IS NOT NEW."flags" OR OLD."id" IS NOT NEW."id" OR OLD."in_blogroll" IS NOT NEW."in_blogroll" OR OLD."kind" IS NOT NEW."kind" OR OLD."last_index_sync_at" IS NOT NEW."last_index_sync_at" OR OLD."last_modified" IS NOT NEW."last_modified" OR OLD."last_poll_at" IS NOT NEW."last_poll_at" OR OLD."newest_guid" IS NOT NEW."newest_guid" OR OLD."origin" IS NOT NEW."origin" OR OLD."status" IS NOT NEW."status" OR OLD."title" IS NOT NEW."title" OR OLD."title_auto" IS NOT NEW."title_auto" OR OLD."surface" IS NOT NEW."surface"
BEGIN
  SELECT RAISE(ABORT, 'missing change state') WHERE NOT EXISTS(SELECT 1 FROM change_state WHERE id=1);
  UPDATE change_state SET
    reading=reading+(CASE WHEN (OLD."id" IS NOT NEW."id" OR OLD."origin" IS NOT NEW."origin" OR OLD."title" IS NOT NEW."title") THEN 1 ELSE 0 END),
    subscriptions=subscriptions+(1),
    hoppers=hoppers+(CASE WHEN (OLD."id" IS NOT NEW."id" OR OLD."origin" IS NOT NEW."origin" OR OLD."title" IS NOT NEW."title") THEN 1 ELSE 0 END),
    feed=feed+(CASE WHEN (OLD."id" IS NOT NEW."id" OR OLD."origin" IS NOT NEW."origin" OR OLD."title" IS NOT NEW."title") THEN 1 ELSE 0 END)
  WHERE id=1;
END;
