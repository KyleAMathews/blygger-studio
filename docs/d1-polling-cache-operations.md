# Deploying trigger revisions and feed caching

Apply migration `0024_change_state.sql` before deploying the new Worker. It
initializes a fixed revision row and 27 triggers over the existing content
tables. Relevant source writes and counter changes commit or roll back together.
Missing state and unsafe counter overflow reject writes rather than silently
lose notifications. No application mutation caller needs an invalidation hook.

The feed uses the existing `MEDIA` R2 binding. Objects under `__cache/feed/` are
internal XML artifacts, separate from attachment paths. Keys include software/
renderer version, request origin and mount. No new secret, bucket or Durable
Object is required. Renderer changes without a software version change must
bump the cache format in `src/feed-cache.ts`.

Warm requests serve saved XML and ETag/304/HEAD responses immediately, then
check one D1 revision row. Unchanged checks do not rebuild or rewrite the file.
Changed checks use a stable render interval and conditional publication against
generation-bearing XML bytes. Cold creation blocks for an initial valid artifact.
Interrupted work can retry on later requests; no idle-time refresh or maximum
stale age is guaranteed. XML can remain stale after withdrawal during this window.

Studio keeps its 15-second visibility-aware timer and ordinary Query Collections.
Each query function makes a fresh change check, then returns its cached response
or fetches changed data. Several mounted queries can each read the revision row. Timed update-state and
unclassified/security views retain their existing polls. Authentication and
admission still execute on private requests. Counters add one state-row write
per changed source row, even when multiple domains advance. Measure read and
write totals separately; these changes do not establish a free-plan capacity.

## Database restores

Pause traffic before restoring/replacing D1. Apply any missing migrations if
the backup predates `0024_change_state.sql`. Then run:

```sh
npx wrangler d1 execute DB --remote --file scripts/reset-change-epoch.sql
```

Pass your normal deployment configuration if it differs from `wrangler.jsonc`.
The script establishes a fresh epoch, resets counters, and can restore the
missing singleton. Resume traffic only after this step. Do not run it during
ordinary upgrades: clients' cursors should survive code deployments. The
implementation work does not run this remote command or deploy production.

Clients reload on epoch change. The feed background check treats a different
epoch as a changed generation, and an old builder cannot replace a newer
installed generation using its old ETag. The first SWR response may still contain
saved pre-restore XML; this is not an immediate-removal or fail-closed public-feed
policy. Apply a separate stale-age/withdrawal policy if that contract is needed.

## Schema changes

Keep the migration's null-safe changed-column guards and table/column-to-domain
map current when adding response fields. Keep each collection's query-to-domain choice current
when adding revision-aware query functions. Unknown views keep polling. The receiving oracle
checks current column guards, direct effects, joined response dependencies,
failed/canceled Query responses, generation races and matching work observations.
