-- A global default for showing responses, overridable per item (session 28).
--
-- `items.show_responses` was two-valued: 0 or 1, off by default. A global
-- default needs a third state on the item — *inherit* — or the setting can
-- never take effect on anything already created.
--
-- So: a nullable override column. NULL means follow the global default; 0 and
-- 1 mean this item decides for itself regardless of it.
ALTER TABLE items ADD COLUMN responses_override INTEGER;  -- NULL = inherit the global default

-- Backfill so that upgrading changes nothing anyone can see.
--
-- An author who opted an item in did so explicitly, and must keep showing
-- whatever the new global default turns out to be — so those become a hard
-- override rather than inheriting.
UPDATE items SET responses_override = 1 WHERE show_responses = 1;

-- Items at 0 stay NULL. 0 was the column default rather than a recorded
-- choice, and we cannot tell "never touched it" from "deliberately turned it
-- off" — but the new global default is also off, so inheriting gives those
-- items exactly the behaviour they have today. The ambiguity only matters if
-- the operator later flips the global on, and at that point inheriting is the
-- reading they asked for.
--
-- `show_responses` is left in place and no longer read. Dropping a column in
-- SQLite means a table rebuild, and this one is small, harmless, and useful as
-- a record of what each item's state was before the migration.
