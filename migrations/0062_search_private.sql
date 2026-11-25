-- Private items are in the owner's search (sealed-content-build-plan §1 0d).
-- The working copy of a private item is indexed like a draft's. Which callers
-- may see those rows is the search route's business (private-access.ts): a
-- token without owner:private never gets one. The triggers of 0050 read this
-- view by name, so recreating it changes what they index from here on.
DROP VIEW search_source;
CREATE VIEW search_source(scope, item_id, subscription_id, content_md) AS
  SELECT 'working', i.id, '', i.content_md FROM items i
  WHERE i.status IN ('public', 'draft', 'private') AND i.kind IN ('fragment', 'thread')
  UNION ALL
  SELECT 'published', i.id, '', v.content_md FROM items i
  JOIN versions v ON v.item_id = i.id AND v.version = i.version
  WHERE i.status = 'public' AND i.kind IN ('fragment', 'thread')
  UNION ALL
  SELECT 'imported', ii.remote_id, ii.subscription_id, ii.content_md FROM imported_items ii
  WHERE ii.l0 = 0 AND (ii.state = 'current' OR ii.pinned_version_retained IS NOT NULL);

INSERT OR IGNORE INTO search_documents(scope, item_id, subscription_id, content_md)
SELECT 'working', i.id, '', i.content_md FROM items i
WHERE i.status = 'private' AND i.kind IN ('fragment', 'thread');
