-- Session 46. 0028 is reserved for the upload guard (blygger-studio#7).
--
-- The pace-layered home page is the default for a fresh install. A node that
-- has already published keeps newest-first until its owner picks, so no home
-- page reorders on upgrade.
INSERT OR IGNORE INTO settings (key, value)
SELECT 'feed_order', 'reverse-chronological'
WHERE EXISTS (SELECT 1 FROM items WHERE status IN ('public', 'withdrawn'));
-- The setup wizard greets a fresh install; a node that has published gets a
-- one-time notice that it exists instead.
INSERT OR IGNORE INTO settings (key, value)
SELECT 'setup', 'notice'
WHERE EXISTS (SELECT 1 FROM items WHERE status IN ('public', 'withdrawn'));
