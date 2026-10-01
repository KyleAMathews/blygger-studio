-- Match owner API signal ordering so each polled page can use an index.
CREATE INDEX signals_poll_order ON signals (at DESC, subscription_id ASC, remote_id ASC);
