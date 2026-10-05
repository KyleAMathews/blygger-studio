-- Idempotency-Key claims and replay records for POST /api/items and
-- POST /api/items/{id}/publish (clipper, spec §9). This is the client's own
-- /api contract (decision #31), not the protocol. Times are integer
-- milliseconds since the epoch; `attempt` is a fresh UUID per claim.
CREATE TABLE idempotency_keys (
  principal TEXT NOT NULL,
  key TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  attempt TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('pending', 'done')),
  claimed_at INTEGER NOT NULL,
  created INTEGER NOT NULL,
  status INTEGER,
  body TEXT,
  location TEXT,
  PRIMARY KEY (principal, key)
);
CREATE INDEX idempotency_keys_created ON idempotency_keys(created);
