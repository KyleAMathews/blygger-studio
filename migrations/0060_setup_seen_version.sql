-- What's new after an upgrade (session 82, studio 0.72.0). setup_seen_version
-- is the newest release whose setup walk-through the owner has finished or
-- dismissed; the studio offers the settings and highlights of later releases
-- once. A node already past setup has seen everything up to 0.71.0, so
-- upgrading to 0.72.0 offers 0.72.0's additions. A fresh install has no row and
-- gets the whole walk-through, which sets the version when it finishes.
INSERT OR IGNORE INTO settings (key, value)
SELECT 'setup_seen_version', '0.71.0'
WHERE EXISTS (SELECT 1 FROM settings WHERE key = 'setup' AND value IN ('done', 'notice'));
