-- Background 4b (blygger-spec docs/background-plan.md §3.3): imported new
-- versions waiting for the change classifier. Studio-private and reader-only.
-- A row is written at import, when the version that is about to be replaced is
-- still held, because the classifier compares the two texts; the quarter-hour
-- cron drains a few at a time under the AI budget (src/background-model.ts). One row
-- per item: a newer version replaces a waiting one.
CREATE TABLE imported_change_queue (
  subscription_id TEXT NOT NULL,
  remote_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  prior_version INTEGER NOT NULL,
  prior_md TEXT NOT NULL,
  next_md TEXT NOT NULL,
  -- The new version's changelog note, if any. Sent to the model only while the
  -- owner has written a routing instruction (#96, option (a), session 78).
  note TEXT,
  queued_at TEXT NOT NULL,
  PRIMARY KEY (subscription_id, remote_id)
);
