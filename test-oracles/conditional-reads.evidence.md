# Conditional resource reads: oracle evidence

Historical snapshot: 2026-11-18, branch `oracles-reading-state`, before the
prep-PR review. Its base commit and SHA-256 digests identify that earlier source.
The review subsequently found missing derived-writer, public-SDK and owner-read
histories; the zero-gap counts below apply only to this earlier campaign.
Current review evidence is recorded separately in `review.evidence.md`.
The immediate `/changes` removal described in this historical cut was
superseded on 2026-11-19: Kyle Mathews approved retaining the endpoint and SDK
operation unchanged for two releases, with deprecation metadata, then removal.
No commit or deployment was made.

The package is pinned to `@tanstack/oracles@97a4e7a` from pkg.pr.new.
Client 0.63.0, private API 6.0.0, SDK 0.18.0.

## Contract

Kyle Mathews (GitHub KyleAMathews) approved these promises on 2026-11-18,
including the private API direction and building the oracle before implementation:

- A matching resource ETag returns bodyless 304; changed data returns 200 and its current ETag.
- Validated bodies and validators are accepted together, per request context; failed validation replaces neither.
- Post-write reads revalidate the resource without a `/changes` preflight. Earlier work cannot overwrite a newer accepted representation or mix cursor generations.
- Cancelling a shared reader leaves peers running, and cancelled work cannot publish accepted cached data.
- Batching preserves each child's conditional data, validator and errors.
- Eligible reads with a pre-aborted signal reject its original reason before transport. Invalid numeric cursor windows reject RangeError before transport.
- Reusable SDK representations are bounded by 500 and server validator stamps by 1,000; reinstalling refreshes eviction order. Server shortcut 304s may keep existing order.
- Settled readers release pending references and adapter-owned abort listeners.

The implementation includes the Worker adapter, generated OpenAPI and SDK,
the opt-in SDK cache, conditional batch children, and Studio's refresh path.
`/changes` is removed, including the generated SDK operation (Kyle Mathews, 2026-11-18).

## Defects and regression evidence

These findings cover the original paging path and the new ETag implementation as
it was being built. They are not all claims about the repository before this work.

| Failure class | Distinguishing history and repair | RED evidence |
| --- | --- | --- |
| Cancelled last cursor reader publishes a late continuation | Hold the continuation, cancel the final reader, then release it. Native acquisition is cancelled when its final consumer cancels. Active peers still complete. | `/private/tmp/blygger-etag-red.BhwqfI/cursor-cancel-red.log`: 4/124 tests failed; smallest history `{first:false,peer:false,value:0}`. |
| Empty demand performs a read and can fail on irrelevant data | A zero-row window sees an invalid first page. Answer `[]` before acquisition. | `/private/tmp/blygger-etag-red.BhwqfI/windows-red.log`: 1/240 tests failed. |
| Later 304 or untagged body loses acceptance order | An older 200 finishes after a newer confirmation or untagged body. Both kinds of accepted responses now retain their sequence. A three-overlap history also checks that an old confirmation never moves it backward. | `/private/tmp/blygger-etag-red.BhwqfI/ordering-red.log` and `/tmp/blygger-etags-continue.AylHbi/report/summary.md`: 11/248 tests failed. |
| Cache eviction forgets newer accepted data while an old reader remains pending | Accept value 2, read 500 unrelated contexts, then release the older value 1 response. Retain the accepted representation while overlapping readers remain pending, independently of the reusable cache's eviction. | `/tmp/blygger-etags-eviction-red.vVgqi7/report/summary.md`: 9/273 tests failed, including the calibration blocked by the failing baseline; eight ordinary histories failed. Probe `/tmp/blygger-etags-eviction.k8dFuK/result.json` observed newer=2, late=1. |
| Reordered query-key fields split shared reader accounting | Two object keys differ only in property order; TanStack shares the native query, so cancelling one reader must preserve its peer. Reader accounting now uses native Query identity, including the QueryClient's configured hash. | `/tmp/blygger-etags-key-red.r8WB4U/report/summary.md`: 1/279 baseline tests failed on `reordered-peer-key`. Probe `/tmp/blygger-etags-key-order.Ufu9cO/probe.mts`: RED peer rejected/transport aborted; GREEN peer `[1,2]`/transport active. |

Invalid wire JSON/schema data is checked before it can enter the SDK cache. The
`conditional-failures` and `sdk-conditional-pairs` properties preserve the previous
valid pair across damaged responses and later revalidation.

The eviction fix passes the same histories, while allowing eviction itself: the
next request may send the current ETag or no ETag, but cannot send the old one.
Two authored mutants reintroduce the old 200 and 304 eviction paths separately.
Both are rejected on the enumerated pressure=500 histories by `freshness after writes`.
A third authored mutant restores property-order-sensitive reader identity; the
`reordered-peer-key` history rejects it under `independent cancellation`.

Two additional defects were confirmed after the boundary and cleanup laws were approved:

| Failure class | Distinguishing history and repair | RED evidence |
| --- | --- | --- |
| Pre-aborted eligible SDK reads still invoke transport | Start an eligible call with an already-aborted signal. Check the signal before cache lookup or transport. Original abort reason is preserved. | `/tmp/blygger-etags-close-gaps/boundary-red/summary.md`: 4/377 tests failed; smallest `{batch:false,value:0}`. Probe: `boundaries.mts` in the same parent directory. |
| Batch readers settle before their adapter listeners are removed | Observe listeners in a direct settlement callback. Remove the outer listener before resolve/reject; release the physical listeners with dispatch. | `/tmp/blygger-etags-close-gaps/batch-settle-direct-red/summary.md`: 7/477 tests failed. `batch-listener-red.json` records one retained listener; the repaired probe observes zero. |

The SDK now uses active reader tickets in request-start order, eliminating a
global sequence counter and its overflow boundary. Acceptance marks only older
readers as superseded. Completed contexts are released independently of the
500-entry reusable cache. Each acceptance visits the active readers for its
context, so work grows with the number of overlapping readers in that context.

Cursor reader accounting uses weakly held native Query objects. This preserves
TanStack's query-key identity without retaining a separate per-client hash map.
Native Query owns continuation cancellation and restart after cursor expiry.

The browser batch adapter uses a microtask queue that retains only pending
children, replacing DataLoader's last-batch references. It preserves chunking
before Fetch-context grouping, each child's input order and errors, independent
cancellation, and the current global default transport. The dataloader package
remains installed for other users in the repository.

The last four gaps were closed through completion permutations (including
oldest-first), first-page transport counts, an explicit work bound for older
confirmations, and failure preservation when dependency reads become unavailable
after a handler has failed. The server's original success guard remains; no
production rewrite was needed to close that last gap.

## Verification

- `npm run sdk:generate`: passes; OpenAPI, generated validators, SDK declarations/bundles and SPA build are current.
- `npm run typecheck`: passes for the repository's separate Worker/UI configurations.
- `node_modules/.bin/vitest run --config vitest.ui.config.ts`: 30 files, 287 tests pass. The obsolete 17-test revision-query suite was removed with `src/ui/revision-query.ts`; the conditional-read oracle and receiving tests cover its replacement.
- Selected Worker integration: 10 files, 377 tests pass (`sdk`, `sdk-operations`, `read-batch`, `mount`, `read-state-clear`, `background`, `shelf`, `polling-cache`, `rest-permissions`, `mcp`).
- `/changes` returns 404 in receiving tests and is absent from the registry, generated SDK and served OpenAPI. Internal trigger-revision reads remain for cursors and server validator shortcuts. Historical changelog entries remain historical.
- Installed Chrome browser checks: 22 pass, split evenly between desktop and mobile Chromium emulation. Search, polling/freshness, Mentions refresh, and OPML import all pass against disposable databases on isolated ports. Log: `/tmp/blygger-etags-close-gaps/final-browser.log`; fixture: `/tmp/blygger-etags-browser-rlp_tcb4`.
- `git diff --check`: passes. The repository has no lint script.

Final build/typecheck/UI/Worker logs are in `/tmp/blygger-etags-close-gaps/`,
with `final-` prefixes. Worker integration requires local Miniflare loopback
access outside the sandbox. Tests use disposable databases; no production
migration or deployment was run.

## Oracle run

```sh
node_modules/.bin/oracle-gaps --package . \
  --source sdk/conditional-reads.ts,src/ui/cursor-query.ts,src/ui/read-batch.ts,src/conditional-operation.ts \
  --seed 20261118 --contexts 64 --config vitest.etag.config.ts \
  --mutants test-oracles/mutants --out /tmp/blygger-etags-close-gaps/final-built
```

Final run `6a7f0c17b9fd`, repeated after the SDK rebuild: **499 baseline tests
pass; 425 mutants rejected by a law; zero gaps, crashes, timeouts or unowned
mutants**. This includes all three authored reintroductions. Source inputs are
four files; the owner is one oracle file. Ordinary tests do not contribute
mutation kills to this campaign.

- Report: `/tmp/blygger-etags-close-gaps/final-built/summary.md`
- Detailed outcomes: `/tmp/blygger-etags-close-gaps/final-built/results.json`
- Log: `/tmp/blygger-etags-close-gaps/final-built.log`

Every fixed-seed and enumerated history is reproducible. Random histories run
alongside them. Correction: `--contexts` controls concurrent warm Vitest runners,
not history coverage. The original claim that 64 contexts extended the histories
was incorrect. Current verification uses two contexts with unchanged history
budgets, as recorded in `review.evidence.md`. The command above records the
historical execution only. Earlier raw reports remain in `/tmp`.

Limits: HTTP peers and D1 revision counters are controlled in the oracle; Worker
receiving tests supply actual D1, mounted auth and permissions. Browser tests
exercise installed Chrome and mobile Chromium emulation, not WebKit or physical
devices. The campaign makes no claim about arbitrary signal-ignoring transports
settling promptly or all possible workloads.

## Source identity

Base commit: `28b0c8d642a87e5810ad6eabd95c2d1714c53396`. Digests identify the tested, uncommitted sources.

| File | SHA-256 |
| --- | --- |
| `sdk/conditional-reads.ts` | `59016bf0eee93ed93c4abefa8cff7fbf7e0600c36999c51efe2a43b12b02908c` |
| `src/ui/cursor-query.ts` | `3ce39c8dd0197a17614d22192387bdc2aebc6417de53a7e2ca03bf5c20d50729` |
| `src/ui/read-batch.ts` | `6d58e5bee2202be49d39ff66926953835f6a3a4ba9bbfd8f0b011a51dc977e66` |
| `src/conditional-operation.ts` | `8d1673dfe55afcb86c1e6562ea652c0716a7f7dd30204472e5b754b3cf1b8d0a` |
| `src/ui/data.ts` | `a9c80b42d49d1280217735a779c8dde26c7cb090f383b6bab757a83640e5f4c1` |
| `src/ui/search.tsx` | `482aa31747af92c93a0226290e770790969f066b8346ed5fd3d6d9a4c47e669a` |
| `src/read-api.ts` | `1e43e75fa0ee663d3f52c6c235ee64e17dfde883fac9cab8d2aead1e36c86bfb` |
| `src/contract/routes.ts` | `3677a24b55825372b50978d5122f46de57c97f89faa18c2caffdb22ea2674373` |
| `src/contract/route.ts` | `2ac9953e56ff092081483e83c8cff99be9b28bd526e0fd0e833fe02be3df74d4` |
| `src/operation-policy.ts` | `f793aedb8c6ba5a4be55c028b22fec7a0e186899128aff6250f46d7dd224f0a4` |
| `openapi.json` | `1da0904f0770705371a55f88aeb64136a858c86b477f7f6aa067ee6ddde7b92b` |
| `sdk/generated/sdk.gen.ts` | `4e82be36428fca867010ac91d6a0a0d121155476febe006de0af6021f431d93a` |
| `sdk/generated/read-validators.gen.ts` | `41d13e983c803e96e0b6e1d61fa18ae5414c461e7722c5109f8691de1e8f6a62` |
| `test-oracles/conditional-reads.oracle.test.ts` | `73822c5e606e8798a3aaad0cc9ffe8fb2223990a6b5143f11ca8c8f99445d8f9` |
| `test-oracles/mutants/conditional-eviction.json` | `87f3f8ac0cb7ad6320acd1321a72dbe6a97d86024dbb865a690b43ec831c261a` |
| `vitest.etag.config.ts` | `8db1ccc3f0657dc90d261b207842bb7233d78bd2ffcc0ac9c77d9c5d66cef6df` |
