-- Whether a version's changelog note was written by the studio rather than the
-- author — decision #40, spec §16.6c. Emitted as `changelog[].generated: true`.
--
-- A note is prose readers read and the source of the feed <title>, so a reader
-- reconstructing an item's history should be able to tell the author's words
-- from a machine's summary. Self-asserted, like generated[]. Set only when the
-- published note is exactly the drafted text: once the author edits it, the
-- words are theirs. 0 for every version published before this migration, which
-- is correct — none of them had a drafted note.
ALTER TABLE versions ADD COLUMN note_generated INTEGER NOT NULL DEFAULT 0;
