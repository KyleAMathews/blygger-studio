# Initial reader derived-work evidence

This is the historical record from before the #171 changes landed. The
[main integration record](reader-derived-work-main-integration.md) supersedes
its migration layout and source cut; the receipts below remain evidence for
the initial implementation.

2026-11-22. This record accompanies the uncommitted source cut based on
`27b5924` (0.69.0). The source digest and file manifest below identify the
reviewed implementation independently of later edits. This is evidence for
the selected reader/cache/dependency boundaries, not a full ranker audit.

## Promises and boundaries

Kyle Mathews (GitHub `KyleAMathews`), 2026-11-22, approved the general
work-preservation plan for [#170](https://github.com/blygger/blygger-studio/issues/170):
derived work must follow changed dependencies and requested output, while
preserving the correct result and existing cursor contract. Polls, read marks
and autosaves are histories that test that promise, rather than separate laws.
[The feed rules](pace-layered-feed.md) and [cursor contract](api.md) supply the
ordering and expiration obligations. The positive invalidation obligation is
[polling-cache design P2/R1](d1-polling-cache-design.md).

| Property | Contract × history × production path × observation |
| --- | --- |
| `reader-derived-work` | Correct page and bounded derived work × interleaved arrivals, revisions, metadata, read marks, placements, paging and rejected requests × real `readingData`, importer and owner writes on local D1 × ordered identities/body/read marks, cursor status, complete stored positions and native work after each read |
| `reader-cache-validity` | Cached identities equal fresh identities × own publications/versions/pins/quotes, imported facts and subscription identity/origin changes × real cached reader and uncached loader/ranker × complete visible identity sequence and writes after each source edit |
| `reader-pin-cursor` | A rank-changing pin expires an earlier continuation × a page ending above the oldest item, then pinning it × real reader and version write × continuation returns 409 |
| `hopper-import-dependencies` | Invalidation follows returned dependencies × membership, body, private metadata, no-op, delete/reinsert and unrelated collected neighbour × real SQL triggers, `readChanges` and membership HTTP receiver × projected membership rows and whether `hoppers` advances after each action |
| `reading-owner-derived-work` | Warm derived overhead stays bounded and cold work stays linear × #171's poll/autosave/read-mark histories at 25 and 5,760 items, including six 50-row pages × authenticated `makeApp().fetch()` × correct identities and native request work, paired with newest order |

The existing cursor handoff property now prepares a derived table from a
separate source on every attempt. Its controlled write between selection and
validation distinguishes a correct retry from preparing once and reusing stale
data. Existing polling properties keep positive member invalidation and the
other change-domain obligations.

The component work budget concerns rows returned to the Worker, writes and
physical D1 calls. It records `rows_read` but does not impose a constant bound
on page-selection scans. Cold/changed inputs may load and rewrite linear source
data; a current cache owes page-bounded materialization and zero derived writes;
a rejected continuation owes at most one revision lookup and zero writes.
Native `first`, `raw`, `run`, `all`, `batch` and `exec` paths are metered.
`exec` lacks D1 row metadata, so the local driver measures writes with SQLite
`total_changes()`. This adapter is evidence for the exercised paths, not a
general replacement for every D1 result shape.

## Models and histories

The core model is an array of unpinned fragments. Arrival prepends; a substantial
revision swaps with the entry immediately above it. The latest 500 entries
participate in replay and the older tail follows by activity. This differs from
the production depth/layer algorithm. Source times and identities predict the
result; production counters and cache generations never enter that prediction.

Each retained distinction has a continuation that needs it:

| Part | Distinguishing continuation |
| --- | --- |
| Version times and source order | Revise an older entry, then read: it climbs once rather than becoming newest |
| HTML and read mark | Repair HTML or mark read, then read: returned data changes without a position rewrite |
| Placement | Hide then restore an entry: visible page changes while stored positions remain reusable |
| Dirty versus current ranking | Arrival/revision versus metadata-only edit, then read: only changed ranking inputs permit rebuilding |
| Saved cursor offset and validity | Continue after a page versus after an epoch/input change: next page versus documented error |
| Built versus missing cache | Delete cache state, then read: a rebuild is owed even without new source content |
| Membership versus held source | Delete/reinsert a member's source: membership remains, returned item becomes null then resolves |
| Both coordinates of imported identity | Collect a neighbour with the same subscription or the same remote id: an unrelated body write must not invalidate it |

The cache-validity property uses the uncached loader and ranker as an explicit
trusted base. It judges invalidation independently of the triggers, including
pins and origin-sensitive quotes; it does not independently prove the pin-weight
formula. The array property provides a different formulation for simple replay.
Complete stored positions are checked outside the work meter, preventing a
truncated tail from passing just because page one looks right.

Grammar controls (ORC-004):

- Reconstruction: the cache lifecycle reconstructs the #170 metadata rebuild
  and rejected-cursor failures. The owner receiver reconstructs #171's scale,
  interleaved background writes and deep walk. Published fixtures retain a
  version while public; deleting the last version unpublishes in the same batch.
- Ablation: source size exposes full reloads; page width exposes materialization
  cost; action order/repetition exposes stale receipts; a separate newest cursor
  prevents cross-source cursor rejection from masquerading as validation work.
  Membership/held-source and both identity coordinates expose false positive and
  missed invalidations. Removing any of these loses the witness described above.
- Range: core sizes 3–504, page widths 1–5, up to 16 actions; constructed sizes
  500/501/504 test exact chunks and the tail. Cache-validity sequences have up to
  20 actions over ten live entries. Pin histories vary 4–8 entries. Hopper
  histories vary initial membership, three neighbour arrangements and up to
  12 actions. Each generated property uses seed `1702026` and 25 runs in both
  fixed and random campaigns. The owner receiver enumerates two finite scales;
  it makes no random-coverage claim.
- Exclusion: an unknown action or nonpositive page width is outside the generated
  action/page grammar; a public fixture without any published version is not a
  legal publication history. Malformed cursors are deliberately legal *request*
  actions and must produce the documented error without preparation. None of
  these controls filters away an observed counterexample.

## Design grammar and production cleanup

The design-grammar triggers fired because the model has multiple action
branches and the first cache sweep left five gaps in one function. The
preservation relation is the approved named laws at every read/write checkpoint,
under the stated source grammar. Storage layout, SQL batching and cache receipt
representation remain implementation choices. Cursor expiration is preserved;
this work does not add append-stable continuation semantics.

Two model forms were considered: an independent array replay and a cached-versus-
fresh relation. The array makes simple ordering errors visible; the relation
can exercise richer source dependencies but trusts the loader/ranker. Keeping
both avoids copying the production algorithm into the main reference model.
Alternative production forms are a dependency revision with lazy materialization
(used here), a fingerprint of all ranking inputs (requires source reads on the
warm path), or eagerly maintained positions (moves replay/storage work to writes).

The reduced implementation moves materialization out of the pure ranker, uses
one ranking receipt, and makes cursor preparation part of each validated attempt.
It replaces the broad cache key rather than adding another competing fast path.
Two local simplifications followed the gap analysis:

- SQL already enforces a nonempty epoch and a safe integer revision. Redundant
  JavaScript shape/range guards had no additional legal native-D1 state to judge
  and were removed. Missing state is retained as a failing boundary before
  loading or writing. This does not remove support for a legal database state.
- Chunk construction is now an explicit array of 500-row slices. The observed
  outputs at 500, 501 and 504 include the complete tail. Removing the old loop
  changes no intended slice or insertion order for finite source arrays.

No law, history filter or work comparison was weakened to make those changes
pass. The final cache sweep killed all 20 generated controls. This is bounded
execution evidence plus the SQL/slicing argument, not exhaustive equivalence
between all possible models or providers.

## RED, GREEN and controls

All oracle runs used `scripts/run-oracle-gaps.ts` with the Worker adapter.
The run ids below identify completed reports; raw local artifacts use the
directory names shown under `$TMPDIR`.

| Run | Result |
| --- | --- |
| `reader-work-red.l3Voy9` | RED before the production repair: malformed cursor materialized two lookup rows against a one-row bound; metadata rebuild work also rejected |
| `hopper-dependencies-red.SfDyfk` | RED before the trigger repair: an uncollected imported body update advanced `hoppers` |
| `reader-pin-red.hjGqGf` | RED before the pin trigger repair: continuation returned 200 where the model required 409 |
| `e6a1b99d350f` / `reader-cache-final.BzvSW5` | 42 baseline tests; full automatic sweep of `reader-order-cache.ts`: 20/20 killed, zero gaps or nondeterministic tests |
| `901469f59371` / `reader-work-final.P5FgxX` | 51 baseline tests; ten selected authored reader/cursor controls: 10/10 killed, zero gaps or nondeterministic tests |
| `8b8be860d4b0` / `hopper-polling-final.f8bSzY` | 222 baseline tests; selected hopper counter receiver: 1/1 killed; four native SQL trigger calibration drivers rejected; zero gaps or nondeterministic tests in this selection |
| `109110492f97` / `reading-owner-probe.9mij4P` | Five baseline tests; three selected cache controls through owner HTTP: 3/3 killed, zero gaps or nondeterministic tests |

The combined distinct baseline total is 278, without counting repeated runs.
The authored controls restore broad invalidation, always rebuild, retain stale
rankings, reset the revision, perform hidden writes through `first`/`raw`/`exec`,
prepare before cursor validation, skip preparation, prepare only once on retry,
or lose the hopper counter at its receiver. Native trigger calibrations also
test unconditional invalidation, no invalidation, subscription-only identity
and remote-id-only identity. These fail the intended registered laws; setup
errors and timeouts are not included as kills.

Constructed reach is required in both fixed and random campaigns. In the final
cache run, each campaign's four constructed core histories entered cold/warm
four times, unrelated/rejected twice, changed/continuation/missing-cache once
and large twice. Each cache-validity source class had one constructed witness;
the pin boundary had one, plus all 25 generated histories. The hopper lifecycle
enters member, uncollected, private-metadata, changed-body and dangling states;
the two occupied-neighbour histories enter the identity distinction. Owner
receiving histories each enter cold/warm/poll/autosave/read states, and the
5,760-item history also enters large and deep-walk states. The handoff matrix
retains stable, related-once/twice, unrelated, epoch and projection-failure
schedules with independently stored preparation input.

Final routine verification: TypeScript checks for Worker, UI and oracles;
ESLint on changed TypeScript; oracle migration accounting; and 96 ordinary
tests across reader ordering, cursor pages/dates/hopper reads, imported reading,
importer hoppers and D1 remote migration shape. These are local checks.

## Review, unresolved gaps and limits

Fresh `oracles-review` review challenged hidden D1 writes, unrelated collected
identities, pin cursor validity, preparation on retry and the full HTTP receiving
boundary. The resulting histories/observations and controls are included above.
The final focused review found the cold returned-row/call/write bounds sufficient
for the two finite owner-request witnesses and reported no actionable remaining
issue in that change.

Earlier broader samples are not overwritten by the selected clean runs:

- `2bbbf90efc8b` / `reader-work-green.fkiWpC` left
  `feeds/reader-order.ts:M70` unreached: deleting `note: null` from the fallback
  current version when no changelog exists and `version > 1`. The key is
  `importedVersions:field-drop` on that fallback version object. A direct
  history-shape oracle checking that exported value is still missing. The
  existing ordinary ranker tests are not an oracle kill. This gap remains open;
  the cache sweep does not close it.
- `8e31e88bf63f` / `hopper-polling-green.gjabPl` timed out on
  `changes.ts:M21`, removing the `readFeedRevision` query. The owner was the
  existing polling oracle. It is an unresolved timeout, not a kill or proof of
  synchronous nontermination; this record makes no full `changes.ts` closure
  claim.
- `reader-pin-red.XsosSa` failed in Worker initialization before the comparison;
  the succeeding RED run is listed separately. The first owner run,
  `reading-owner-probe.kOsxrG`, observed opaque cursors and failed determinism.
  Cursors now remain driver-local and observations expose continuation presence;
  that failed run supplies no kills.

Limits: local primary D1 supplies all SQL and metering evidence. No deployed
cross-region RTT, billing or elapsed-time claim is established. The paired
newest/pace owner receiver includes authentication, admission, validators and
completed deferred work; an equal unnecessary cost in both orders can still
pass. Admission efficiency, Smart Placement, read replicas and browser loader
waves remain unassessed here. Rich replay/pin-weight formulas and malformed
stored documents are not independently modeled by these new properties.
Genuine imports can still load/rewrite the full position set and expire Reading
cursors. The 500-entry replay window does not bound that source/storage work.
Hopper membership cursors still depend on Reading and subscriptions.

[#171](https://github.com/blygger/blygger-studio/issues/171) reports an overlapping
`inputs` counter and loader changes on then-unpublished `perf/reading-load` with
migration 0056. That branch returned 404 during this work. This change reserves
0056 and used `0057_reader_work.sql`. Before combining the branches, reconcile
the counters and triggers into one implementation; two counters for the same
ranking dependencies should not ship together. No browser loader changes from
that branch are present here.

## Checklist v1 outcome

| Requirement | Outcome |
| --- | --- |
| ORC-001 | Authority, laws, domains and limits stated above and beside each property |
| ORC-002 | Array model independent; metamorphic trusted loader/ranker declared; counter model does not read triggers |
| ORC-003 | Law prose, histories, model, driver and checkpoint checks remain separate in each oracle |
| ORC-004 | Reconstruction, ablation, ranges and exclusion controls recorded above |
| ORC-005 | Real D1, reading/importer paths and membership/owner HTTP receivers observed after each promised action |
| ORC-006 | Corrupted traces, authored source controls and four native trigger controls reject at intended checkpoints; earlier timeout/setup failures remain separate |
| ORC-007 | All generated properties run fixed and random budgets with direct replay; not applicable to the fully enumerated owner/handoff matrices |
| ORC-008 | Retained model distinctions have continuations above; no production counter state copied into the model |
| ORC-009 | Model dirty/built/cursor state maps to input change, prior materialization and continuation position/validity; membership and held source remain distinct |
| ORC-010 | Existing storage/cleanup harness restores disposable bindings/schema; cursor values stay driver-local; original failures retain their checkpoints |
| ORC-011 | Cached-versus-fresh relation adds richer invalidation coverage beside the independent array; full HTTP receiver adds actual request work, with shared-cost limits |
| ORC-012 | This versioned source-cut record contains receipts, selection boundaries and the two unresolved broader results; no full subsystem audit claimed |
| ORC-013 | Metadata versus ranking writes, valid versus expired cursors, pin crossing a page, exact 500/501 chunks and both imported identity coordinates distinguish nearby wrong rules |
| ORC-014 | Actual local D1 supplies component and full authenticated HTTP premises; remote/cloud/browser handoff remains unresolved in the stated limits |
| ORC-015 | Every declared state has constructed reach or an enumerated witness; counts/schedules recorded above |
| ORC-016 | New and strengthened oracle files register only properties, calibrations and histories; no ordinary unit assertions added |

## Initial source cut

Manifest SHA-256:
`c7d816b2e97c9296e8f462bf7f46554c9d6a7db600316a9cb6953592511bb7ab`.
It hashes the UTF-8 manifest below, with one trailing newline per line. The
per-file hashes cover the initial implementation's final source bytes, before
the main integration; subsequent prose-only spacing
fixes in the owner oracle do not change executable behavior from its receipt.

```text
198261b46a926ca5757d7c1ee0f092b789a16c3ce469a89c532ff14afe8922d9  migrations/0057_reader_work.sql
0529a8caf2c4345fc728888260542144249cbc213d71963f9324e75e2f5ac95f  src/cursor-page.ts
8a42d0105a367135a689a882348da8687f9fb66c21894bb761dcb9bd423ebfca  src/feeds/reader-order-cache.ts
91ec05c5e30dea041ca82fb1e0464aef4d4a50431054b16bffbdde615f8d2232  src/feeds/reader-order.ts
a9ccdafe2f2c3bc15d5b6e495b06a0466de6456810b288250dbe8e0e37a2d1c9  src/reading-data.ts
d735823c7579ea431b36dbd832f7cb3cfb40c5d381d77d7dea3d3c07bf21b274  test-oracles/d1-work.ts
3e639fc6d8588b013ba319e138569f86dbe10e819d6610de77960f6932c4f227  test/cursor-validator-handoff.oracle.test.ts
2547a08de05bfc927cf8fe0574978962ab56854348cf3f283957e333aeffd22b  test/fixtures/reader-work-mutants/hopper.json
d4d52db3f191bdc0dec20db9416d0c15d73a316d9c6e24e96f20ade9f25de1de  test/fixtures/reader-work-mutants/reader.json
2a22b710f1d175e0e55409a0094150f8282e8f5eec1eeb1b0ab7f656dbaf3d5b  test/hopper-dependencies.oracle.test.ts
f3da0b1298250534fb2db12f2667916c7b111f41c89f27a5d4830fe490db1b46  test/oracle-property-registry.ts
97bd0a02879b3cced3107b78ebf87fd26021f31660de843562a8a3eb7f1f5ef5  test/polling-cache-trigger-cases.ts
8aa31b8cda24be89778602c65b6b79970dc9c940b50eeaea8626360dc3ad6a6f  test/polling-cache.oracle.test.ts
15632004379ebffb60ba0474f42ced00a227ff8720d9b175bff881c8ca6dff55  test/reader-cache-validity.oracle.test.ts
762e55b4afbb1b8e79504f0a4d0b33ce2e80309bc5c89bda488ac484e329e325  test/reader-work.oracle.test.ts
f1024e0f8fe8c511f7aa9b27c28ec51297775b19a5f985da2eb1c1433a89fc9d  test/reading-owner-work.oracle.test.ts
```
