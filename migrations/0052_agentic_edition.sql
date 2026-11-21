-- The Agentic feed's edition (blygger-spec docs/agentic-feed-plan.md §3, §4):
-- the one document an assistant writes and the Agentic feed tab renders, a
-- digest of sections referring to entries the reader already holds.
-- Studio-private: no item document, feed, manifest, public page or static
-- export reads it.
--
-- One row per agentic feed (Venkat, session 77: people may keep several
-- assistants or "newspaper subscriptions", each its own tab), keyed by a short
-- slug; `default` is seeded and is the only feed until the UI grows more tabs.
-- `title` is the feed's name (null: the default feed's name is the
-- agenticTitle setting); `position` orders the tabs.
--
-- A feed's row is replaced whole by PUT /api/agentic/{feed} with expectedRevision; every
-- successful PUT bumps revision. `mode` is how the assistant wrote it:
-- `sections` (a laid-out edition) or `scores` (per-entry scores the Studio
-- lays out). `edition_json` is the validated body as written; references are
-- resolved when read, so one that stops resolving drops out quietly.
--
-- Every edition is also a conformant blyg thread (Venkat, session 77), so it
-- can be published: the Studio composes it into a draft thread from existing
-- constructs only (src/agentic-thread.ts). `draft_id` is that draft and
-- `draft_md` what the Studio last wrote into it. The draft stays the
-- assistant's only while it still holds `draft_md` and is unpublished; once
-- the owner edits or publishes it, the next edition starts a new draft.
--
-- No change domain: GET /api/agentic/{feed} answers with an exact representation
-- validator, which is all a polling client needs for a small row.
CREATE TABLE agentic_feeds (
  id TEXT PRIMARY KEY CHECK (length(id) BETWEEN 1 AND 40),
  title TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  revision INTEGER NOT NULL DEFAULT 0 CHECK (typeof(revision) = 'integer' AND revision >= 0),
  mode TEXT CHECK (mode IN ('sections', 'scores')),
  edition_json TEXT,
  updated_at TEXT,
  draft_id TEXT,
  draft_md TEXT
);
INSERT INTO agentic_feeds (id, revision, position) VALUES ('default', 0, 0);
