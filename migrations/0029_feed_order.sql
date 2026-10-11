-- The pace-layered home page (session 46) is the default for a fresh install.
-- A node that has already published keeps newest-first until its owner picks,
-- so no home page reorders on upgrade. 0028 is reserved for the upload guard
-- (blygger-studio#7).
INSERT OR IGNORE INTO settings (key, value)
SELECT 'feed_order', 'reverse-chronological'
WHERE EXISTS (SELECT 1 FROM items WHERE status IN ('public', 'withdrawn'));
