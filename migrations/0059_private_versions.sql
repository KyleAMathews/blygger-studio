-- Private versions (blygger-spec docs/sealed-content-build-plan.md §1 0b,
-- decision #94; Venkat, session 81). An item published privately has
-- items.status = 'private' and keeps its versions here, apart from
-- `versions`, which the public surface reads. No public query names this
-- table, so a route that forgets the private status still finds no version
-- to serve. The public counter, items.version, stays 0 until the item first
-- goes public, and that publish is v1: private versions are studio history.
-- content_html is the rendered text the owner's reader shows (it never
-- reaches a public route); `[[id]]` links that resolve are anchors, the rest
-- stay literal.
CREATE TABLE private_versions (
  item_id TEXT NOT NULL,
  version INTEGER NOT NULL CHECK (version >= 1),
  content_md TEXT NOT NULL,
  content_html TEXT NOT NULL DEFAULT '',
  published_at TEXT NOT NULL,
  note TEXT,
  PRIMARY KEY (item_id, version)
);
