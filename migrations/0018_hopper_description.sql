-- 0.24.0: an optional one-line description for a hopper, shown on its public
-- /h/{slug}/ page and in the "Collections" list on the homepage and archive.
-- Presentation only (decision #12: curation display); never on the wire.
ALTER TABLE hoppers ADD COLUMN description TEXT;
