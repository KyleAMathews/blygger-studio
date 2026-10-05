# One candidate for a blind failure assay

The user wants lower D1 work at the existing Studio polling cadence, with few
changes at application write points. They accept XML stale-while-revalidate.
No maximum stale age or withdrawal exception has been selected. This candidate
is not implemented. Test only this arrangement, not alternative architectures.

1. SQL triggers on relevant INSERT/UPDATE/DELETE maintain a single fixed row
   of domain revision counters in the same database transaction. NULL-aware
   changed-value guards avoid no-op increments. Relevant domains include Items,
   Reading, subscriptions, hoppers, signals, settings and XML. Security-budget
   writes and tracking writes do not recursively track themselves. Missing-row
   protection must reject an otherwise untracked relevant mutation.
2. Studio polls one revision endpoint every 15 seconds while visible. Existing
   collection refetches run only for changed watched dependencies. Each view
   captures its target before refresh and advances applied state only after
   successful data installation, and only through that target. Reads must be at
   least as current as that target. Failed/unmounted views remain independently
   dirty; epochs unknown to the client force initial reload. The candidate uses
   full refetch on change, not row deltas or item timestamp sync.
3. XML is saved in the existing R2 bucket under an isolated internal key that
   includes deployment/origin/mount and renderer identity. Saved XML bytes have
   a harmless generation comment that binds epoch/revision, so its conditional
   ETag distinguishes different source generations even if visible XML repeats.
   Collision-free token behavior is an assumption requiring a provider witness.
4. Warm XML GET/HEAD returns the saved representation or matching ETag 304 and
   schedules a small authoritative D1 revision check in the background. Every
   request, including 304, gets the check. If unchanged, no full render or R2
   rewrite. No added CDN cache layer is included. Cold object absence requires
   a blocking build; that path is not established by a preexisting-artifact model.
5. Render uses monotonic-consistent source reads and samples source revision
   before/after all reads. Changed intervals are discarded. Successful render
   is conditionally put against the generation-bound expected ETag captured
   before rendering; conflicts discard/retry. No atomic custom-metadata guard
   or D1/R2 transaction is assumed. A commit after validation can leave a legal
   but older artifact; SWR allows that until a subsequent successful check/build.
6. Failures retain last good XML and failed dirty state. Work can be retried on
   later requests. Finite waitUntil lifetime is assumed; unconditional eventual
   completion, exact-once, idle-time refresh and maximum stale age are not promised.
7. Local sharing can reduce duplicate renders but no global lease/coordinator
   is included. Cross-isolate duplicate work has no stated bound. Current auth/
   admission stays in front of private data; its D1 costs remain. Trigger counters
   add writes per changed row, not once per multi-row command.
8. Dependencies require explicit maintenance. Feed inputs include published
   items/versions, media, site metadata/timezone/canonical URL and local/remote
   attribution inputs. Unchanged import poll diagnostics affect subscriptions,
   not XML. Renderer changes and database restore epochs need lifecycle handling.

Declared success standard: warm unchanged polls avoid expensive collection/feed
queries; changes are not silently acknowledged without installed data; XML is a
legal complete render and old builders cannot regress the saved generation;
ordinary writers need no caller invalidation hook; current UI/security behavior
is retained. No actual quota savings or complete trigger migration is established.

Allowed source trace (read only these files as needed):
- src/ui/polling.ts and src/ui/data.ts: timers, refetch, query collection behavior.
- src/read-api.ts: current collection routes and side effects.
- src/update-check.ts and src/versions.ts: time-driven update checking.
- src/reading-data.ts: full identity/count scans and response dependencies.
- src/api.ts and src/model.ts: item mutations, settings, timestamps/publication.
- src/protocol.ts: buildFeedXml and origin derivation.
- src/public-feed.ts and src/pages.ts: quote attribution dependencies.
- src/importer/store.ts and src/importer/schedule.ts: direct/background effects.
- src/owner-api.ts and src/security-budgets.ts: live controls and residual work.
- migrations/*.sql: actual schema. wrangler.jsonc and src/types.ts: bindings.
- docs/oracle-tests.md: controlled versus real provider evidence standard.

Provider premises available for this assay: ordinary D1 primary/default reads,
transactional triggers/batches, R2 conditional ETag operations with strong object
consistency, finite Worker background lifetime. They do not establish a joint
transaction, unique XML token in production, or receiving entry-point witness.

Do not read parent grammar JSON, other cache-design/theory documents, formal
model results, old review outputs or sibling forms. Those are not evidence for
this blind assay.
