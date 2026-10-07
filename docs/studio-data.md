# Studio data sources

Studio creates its backend source collections once in `src/ui/data.ts`.
Every browser tab has one instance of each source. All sources use TanStack
Query Collection with `syncMode: 'on-demand'`. Components and route loaders
reuse those instances.

Every source sets a Zod schema generated from `openapi.json` by the SDK's Hey
API Zod plugin. The API contract in `src/contract/` remains the only handwritten
specification. `npm run sdk:generate` produces OpenAPI, TypeScript, the HTTP
client, and `sdk/generated/zod.gen.ts` in one pipeline.

The SDK exports validators through `@blygger/sdk/schemas`. Studio imports that
generated output; it does not import server schema modules. `src/ui/data-schemas.ts`
picks or extends generated schemas for normalized rows and client-only fields.
TanStack DB infers collection row types from them. The generator preserves
explicit `additionalProperties` rules so permissive metadata stays intact and
strict references still reject unknown fields.

The schema option validates local mutations. Sync adapters do not validate
incoming rows through that option, so each query function parses its loaded
data before caching it. A malformed response fails the read and retains the
last good rows. It does not cache the new revision, so retry can fetch again.

| Source | Stored rows |
| --- | --- |
| `items` | Mutable authored items and pinned-version summaries |
| `itemHistory` | Item history, attachments, published snapshot, and authored kind |
| `subscriptions` | Subscriptions |
| `hoppers` | Mutable hopper fields |
| `hopperStats` | Total items and source counts per hopper |
| `hopperEntries` | Imported-item content ordered within each hopper |
| `hopperMemberships` | Ordered hopper memberships, including entries without an imported body |
| `reading` | Reading positions for a feed and lens |
| `signals` | Current signals |
| `settings` | Owner settings |
| `updates` | Release-check state |
| `authorizations` | Client authorizations |
| `inbound`, `outbound` | Incoming and outgoing mentions |
| `mentionSources` | Resolved source metadata per mention |

An editor detail is a live join of `items` and `itemHistory`. Item history
does not keep another copy of mutable item fields such as `content_md`.
Editor writes go through `items`, so list and editor consumers observe the
same optimistic edit and rollback.

Hopper details and previews join `hoppers`, `hopperStats`, `hopperEntries`,
and `hopperMemberships`.
Preview queries request ranks zero through two. Full details request all
memberships. The membership key includes the hopper and imported-item identity.
Overlapping preview and full demands share the same source rows.

A reading position includes its feed, lens, item identity, and rank. Rank is
relative to the feed and lens. The source key includes the feed/lens identity
and item key so one timeline cannot overwrite another timeline's position.
Pages are derived rank ranges over this single source.

`scoped()` caches only derived live-query collections. It never creates a
backend source. Evicting an inactive view releases its demand; TanStack DB
tracks which remaining demands own each row. Polling refreshes subscribed
sources once per source family. An unopened detail source has no demand and
does not start a fallback read during polling.

Route loaders use `preloadView()` to preload derived queries. Calling
`preload()` on an on-demand source does not fetch data. After a failed load,
`preloadView()` restarts the failed derived graph when the retry control resets
the Query cache.

The shared `QueryClient` caches HTTP response envelopes under their query
keys. It does not merge rows between different source collections. Each
backend subset has its own cache entry. Local sorts of the same complete list
share an entry. Revision checks reuse an unchanged
response; a changed revision fetches that subset again. List APIs without
predicate support still load their complete list, while item IDs, reading
pages, and hopper preview ranges use the available subset endpoints.

The adapter and core concepts are described in the
[TanStack Query Collection documentation](https://tanstack.com/db/latest/docs/collections/query-collection).
