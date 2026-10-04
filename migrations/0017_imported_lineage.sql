-- Keep an imported item's `stub_of` and `forked_from` (studio#12, spec §10.6 and
-- §5.6), verbatim as the origin published them, `cited` included. The importer
-- kept `transclusions` and dropped these two, so a reading view could not show
-- what an item answers or descends from without re-fetching every document,
-- and a citation's human half (§5.9, #55) did not survive import — which is
-- what gate G10 tests. NULL for rows imported before this migration until the
-- origin's next version.
ALTER TABLE imported_items ADD COLUMN stub_of_json TEXT;
ALTER TABLE imported_items ADD COLUMN forked_from_json TEXT;
