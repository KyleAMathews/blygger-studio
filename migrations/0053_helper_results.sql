-- Results of model helpers (blygger-spec docs/helpers-plan.md §4: "results are
-- keyed by helper, input identities and their versions"). Studio-private: shown
-- to the owner and returned to the owner's agents; never in an item document,
-- the feed or the manifest. One row per helper and subject, replaced when the
-- subject's versions move on, so the table holds at most one result for each.
--
-- subject: what the helper was asked about, e.g. "~own:{item id}" or
--   "{subscription id}:{remote id}" for catch-up-summary.
-- key: the exact inputs read (for catch-up-summary, every card's origin, id
--   and version, in order); a different key is a different question.
-- status: "pending" while a generation holds the claim, "ready", or "failed"
--   (retried after a while; src/helpers/catch-up-summary.ts).
-- output: the result as JSON, once ready.
--
-- Numbered 0053: 0050 is held by #146 (search index), 0052 by the agentic feeds.
CREATE TABLE helper_results (
  helper TEXT NOT NULL,
  subject TEXT NOT NULL,
  key TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'ready', 'failed')),
  output TEXT,
  model TEXT,
  at TEXT NOT NULL,
  PRIMARY KEY (helper, subject)
);
