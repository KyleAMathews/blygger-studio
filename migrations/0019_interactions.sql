-- 0.25.0: a private, append-only log of the owner's interactions with other
-- people's items: the history a future feed-ranking agent reads. Thumbs keep
-- their current-state table (signals); every change also lands here.
-- Never on the wire and never on a public page (decisions #11/#12: AI,
-- identity and editorial convenience are never in the protocol).
--
-- Targets are keyed by origin + id, the scope an id lives in (§13.1 rule 7),
-- so the record survives an unsubscribe.
CREATE TABLE interactions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  at          TEXT NOT NULL,
  kind        TEXT NOT NULL,   -- thumb_up | thumb_down | thumb_clear | hopper_add | hopper_remove | stub | fork | quote
  origin      TEXT NOT NULL,
  remote_id   TEXT NOT NULL,
  version     INTEGER,         -- the target's version, where the act names one (stub, fork, quote)
  own_item_id TEXT,            -- our item that made the reference (stub, fork, quote)
  own_version INTEGER,
  hopper_id   TEXT,
  hopper_name TEXT,            -- as it was then; hoppers can be renamed or deleted
  backfilled  INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX interactions_at ON interactions (at DESC, id DESC);
CREATE INDEX interactions_target ON interactions (origin, remote_id);

-- Backfill what the database already knows, marked backfilled = 1.
-- Current thumbs (their history before this migration is gone).
INSERT INTO interactions (at, kind, origin, remote_id, backfilled)
  SELECT s.at, CASE WHEN s.thumb = 1 THEN 'thumb_up' ELSE 'thumb_down' END, sub.origin, s.remote_id, 1
  FROM signals s JOIN subscriptions sub ON sub.id = s.subscription_id;
-- Hopper memberships.
INSERT INTO interactions (at, kind, origin, remote_id, hopper_id, hopper_name, backfilled)
  SELECT hi.added_at, 'hopper_add', sub.origin, hi.remote_id, h.id, h.name, 1
  FROM hopper_items hi JOIN hoppers h ON h.id = hi.hopper_id JOIN subscriptions sub ON sub.id = hi.subscription_id;
-- Remote quotes, at the first version of ours that baked each one.
INSERT INTO interactions (at, kind, origin, remote_id, version, own_item_id, own_version, backfilled)
  SELECT v.published_at, 'quote', json_extract(t.value, '$.origin'), json_extract(t.value, '$.id'),
         json_extract(t.value, '$.version'), v.item_id, v.version, 1
  FROM versions v, json_each(v.transclusions) t
  WHERE v.transclusions IS NOT NULL AND json_valid(v.transclusions) AND json_extract(t.value, '$.origin') IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM versions e, json_each(e.transclusions) u
      WHERE e.item_id = v.item_id AND e.version < v.version AND e.transclusions IS NOT NULL AND json_valid(e.transclusions)
        AND json_extract(u.value, '$.origin') = json_extract(t.value, '$.origin')
        AND json_extract(u.value, '$.id') = json_extract(t.value, '$.id'));
-- Stubs of remote items, at the first version that named each target.
INSERT INTO interactions (at, kind, origin, remote_id, version, own_item_id, own_version, backfilled)
  SELECT v.published_at, 'stub', json_extract(v.stub_of, '$.origin'), json_extract(v.stub_of, '$.id'),
         json_extract(v.stub_of, '$.version'), v.item_id, v.version, 1
  FROM versions v
  WHERE v.stub_of IS NOT NULL AND json_valid(v.stub_of) AND json_extract(v.stub_of, '$.id') IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM versions e WHERE e.item_id = v.item_id AND e.version < v.version AND e.stub_of IS NOT NULL AND json_valid(e.stub_of)
        AND json_extract(e.stub_of, '$.origin') = json_extract(v.stub_of, '$.origin') AND json_extract(e.stub_of, '$.id') = json_extract(v.stub_of, '$.id'));
-- Published forks, at their first version.
INSERT INTO interactions (at, kind, origin, remote_id, version, own_item_id, own_version, backfilled)
  SELECT v.published_at, 'fork', json_extract(i.forked_from, '$.origin'), json_extract(i.forked_from, '$.id'),
         json_extract(i.forked_from, '$.version'), i.id, 1, 1
  FROM items i JOIN versions v ON v.item_id = i.id AND v.version = 1
  WHERE i.forked_from IS NOT NULL AND json_valid(i.forked_from);
-- Self-references (a stub or fork of our own item) are not interactions with
-- someone else's work; drop them, whichever spelling of our origin they use.
DELETE FROM interactions WHERE kind IN ('stub', 'fork')
  AND rtrim(origin, '/') = rtrim((SELECT value FROM settings WHERE key = 'site_url'), '/');
