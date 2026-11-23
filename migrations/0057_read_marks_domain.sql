-- Read marks move their own change domain, `marks`, not `reading` (session
-- 79; law change approved by Venkat). With "seen means read" a reader marks
-- entries while scanning, and every mark used to move `reading`, which expires
-- every Reading cursor: the next page after a scan restarted from the top.
-- The Reading response still carries readVersion, and conditional reads
-- validate against every counter, so a mark still reaches every client; only
-- cursors, which name the `reading` generation, stop expiring on it.
--
-- Guards are SELECT RAISE ... WHERE, never CASE ... END (0024).
ALTER TABLE change_state ADD COLUMN marks INTEGER NOT NULL DEFAULT 0 CHECK(typeof(marks)='integer' AND marks BETWEEN 0 AND 9007199254740991);

DROP TRIGGER IF EXISTS change_read_state_insert;
CREATE TRIGGER change_read_state_insert
AFTER INSERT ON read_state
BEGIN
  SELECT RAISE(ABORT, 'missing change state') WHERE NOT EXISTS(SELECT 1 FROM change_state WHERE id=1);
  UPDATE change_state SET
    marks=marks+(1)
  WHERE id=1;
END;

DROP TRIGGER IF EXISTS change_read_state_update;
CREATE TRIGGER change_read_state_update
AFTER UPDATE ON read_state
WHEN OLD."read_version" IS NOT NEW."read_version" OR OLD."remote_id" IS NOT NEW."remote_id" OR OLD."subscription_id" IS NOT NEW."subscription_id" OR OLD."updated" IS NOT NEW."updated" OR OLD."unread_at" IS NOT NEW."unread_at"
BEGIN
  SELECT RAISE(ABORT, 'missing change state') WHERE NOT EXISTS(SELECT 1 FROM change_state WHERE id=1);
  UPDATE change_state SET
    marks=marks+(1)
  WHERE id=1;
END;

DROP TRIGGER IF EXISTS change_read_state_delete;
CREATE TRIGGER change_read_state_delete
AFTER DELETE ON read_state
BEGIN
  SELECT RAISE(ABORT, 'missing change state') WHERE NOT EXISTS(SELECT 1 FROM change_state WHERE id=1);
  UPDATE change_state SET
    marks=marks+(1)
  WHERE id=1;
END;
