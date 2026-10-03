-- Reverse traversal also preserves rowid DESC for equal updated timestamps.
CREATE INDEX items_public_order ON items (updated) WHERE status IN ('public','withdrawn');
CREATE INDEX versions_public_pins ON versions (item_id, version) WHERE pinned = 1;
CREATE INDEX media_item_created ON media (item_id, created);
CREATE INDEX subscriptions_origin ON subscriptions (origin);
