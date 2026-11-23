# Reader work: PR review evidence

2026-11-22, local changes based on `86b907e47a0f689c5d1531c3e5e1c2482c0950f0`
(0.70.0). This continues the [main integration evidence](reader-derived-work-main-integration.md).
Its earlier source manifest and results remain historical. This record covers
the subsequent cache publication repair and stronger receiving checks.

Before publication, merge `557185d` incorporated main's `ed245f4`: card-date
dragging and the mount oracle's contract-version expectation. Those two files
do not overlap this change. Every reviewed file in the manifest remained
byte-identical after the merge, and build plus Worker/UI/oracle TypeScript
passed on the combined tree (`prep-pr-merged-head-checks.AhoPCg`). The execution
receipts below retain their original source cuts.

## Laws and enforcement

The adopted #170 promise remains correct Reading results with derived work
following changed dependencies and requested output. The existing cursor
contract still decides expiration; #171's held-item and marks decisions remain.
No product law changes here. Concurrent publication is another history of the
same cached-versus-fresh comparison, rather than a new ordering policy.

| Boundary | Missing distinction | Current judgment and checkpoints |
| --- | --- | --- |
| `reader-cache-publication` | An old build publishes after a newer reader prepares | Cached pages equal fresh ordered identities at every recorded page; delayed old responses also compare identities and continuation presence; after all requests settle, the current receipt and complete positions match fresh history |
| `polling-cache-state-readers` | Only rejecting reader paths ran, so an always-rejecting feed reader passed | Native feed reads return the controlled source epoch/revision pair at return, including zero and the maximum safe revision |
| `reader-history-note-shape` | Fallback notes were unreached; repeated notes hid copying between versions | Every returned note preserves its semantic source note, with explicit null for absence |

The cache comparison declares the uncached loader/ranker as its trusted base;
it does not independently prove pin weights. The existing array model remains
the second formulation for unpinned replay. The note model is a pure projection
of semantic inputs, independent of the loader. The polling model predicts the
exact pair supplied to native D1, independent of the reader.

## Publication histories and repair

An old request captures inputs g0 and pauses before publication. A real
arrival or own pin advances inputs and Reading to g1. A newer request prepares
g1; the old request then replaces its positions before selection. Reading is
still g1, so the usual before/after source guard can accept a stale page.
A warm third reader can cross the same boundary after another request builds.

The primary cache oracle now varies four controlled schedules: old publication
last with a cold observer, old publication last with a warm observer, old
publication first, and serial requests. It varies 4–8 items, widths 1 through
count minus one, arrival/backfill versus pin, and first versus current-generation
continuation pages. Native D1 barriers control publication and selection;
timers do not establish the schedule. All started requests settle before
storage cleanup. The fixed seed and random campaigns retain 25 runs each.

The original arrival failure is retained as a fixed history. Constructed reach
also forces pins crossing a wider page, an unchanged-first-row pin neighbour,
a warm pin continuation and a cold backfill continuation. Old-first and serial
histories preserve legal neighbours. Immediate cache/page cuts remain separate
from the older caller's response and final post-retry cache cut. Serial old
responses use their valid pre-mutation reference. Opaque epochs/cursors stay
driver-local; the trace records equality or continuation presence.

Production now gates the delete, every chunk insert, and receipt upsert on
the captured epoch and inputs inside the same atomic D1 batch. A stale builder
publishes nothing. This preserves the existing inputs counter and migration
0058 layout; it adds no other counter or migration.

## History and observation repairs

The initial publication recorder included random native epochs. Replacing
those tokens with the receipt-current equality fact retains the promised
observation and restores deterministic traces. A follow-up review then found
that the observer was compared but the delayed old caller was checked only
for success. Separate corruptions of its keys and continuation demonstrated
that false green before the driver/check repair. Final receipt and position
corruptions now also reject. These later checks strengthen the repair; they
are not retrospectively claimed as part of its first RED run.

The note grammar initially used one repeated note per history. First-note and
last-note copying controls both survived. It now supplies a semantic note list
for consecutive source versions, including distinct strings and mixed null/text
notes. Absent changelog remains distinct from present changelog with absent
notes. Versions range 1–8, lists 1–8, strings up to 40 units. The resolver makes
the current version at least the log length. Every former repeated-note and
fallback history is reconstructible. Required distinct/mixed histories and
the copying controls distinguish the added dimension. The final synchronous
note campaigns use 100 runs in each lane, matching the authoring skill's budget;
the earlier 25-run note receipts remain identified below.

The polling receiver retains its original three histories and blob-epoch
calibration, adding eight native reads: two epochs crossed with revisions
0, 1, 7 and `Number.MAX_SAFE_INTEGER`. Epoch and revision corruptions reject
independently. This is finite enumeration, not arbitrary-string coverage.
Production `changes.ts` and the note loader were not changed by these repairs.

Grammar controls: publication timing distinguishes late publication from legal
serial work; count/width expose order changes beyond the first row; continuation
pages expose page-boundary changes; per-version notes expose copying that a
scalar cannot. Unknown schedules, nonpositive widths/versions and empty supplied
note lists are outside these generated grammars. No prior history, seed, run
budget, or work comparison was removed. Design grammar was revisited because
the note model changed: a list preserves all prior scalar repetitions and adds
the distinguishable heterogeneous observations without another model branch.

## Experiments

All oracle receipts below come from `scripts/run-oracle-gaps.ts`. Directory
names identify artifacts under the local run's actual `$TMPDIR`.

| Run | Result |
| --- | --- |
| `1de9c25a5780` / `reader-publication-red-retry.94YNcg` | Before production repair: 53 baseline passes, 5 failures. `{count:4,limit:1,change:"arrival",schedule:"cold-stale-last"}` rejects at the page comparison; selected mutation blocked by RED, no kill |
| `ff73e76624ac` / `prep-cache-sweep-final.eGy5y8` | After publication/token repair, before old-response strengthening: 100 baseline tests, all 21 automatic cache mutations killed, zero gaps/nondeterminism |
| `c0a14516abc7` / `reader-old-caller-checker-red.ruZCwU` | Checker integrity RED: 74 passes and two failing calibrations because corrupted old keys/continuation were accepted; mutation blocked, no kill |
| `d138df12faa2` / `reader-old-caller-checker-green.iqeW6J` | Repaired old-response/final-cache check: 78 baseline tests pass; same selected cache mutation killed; zero gaps/nondeterminism |
| `d282d62856ea` | Old polling receiver: exact historical M21 survives as not-distinguished, five passing baseline tests |
| `44a11758f256` | Strengthened polling receiver: 16 baseline tests pass; exact M21 killed by `change reader result` assertion; zero gaps/nondeterminism |
| `23af8fbe87c6` / `prep-note-shape.jKHkyi` | Initial note owner: 20 baseline tests; exact historical fallback-note field-drop killed; predates heterogeneous-note strengthening |
| `f8467b778932` / `prep-note-shared-gap.QDf6tD` | Initial scalar-note grammar: 20 baseline tests pass; both first/last-note controls survive as not-observed, zero kills |
| `b2ed07d2eafe` / `prep-pr-final-controls-retry.KyeHF9` | Final combined selection: 374 distinct baseline tests pass; all 18 authored controls killed; zero gaps, unowned warnings or nondeterministic tests |
| `7f410a875901` / `prep-pr-cache-final-sweep.90VPLU` | Final strengthened cache checks: 104 baseline tests pass; all 21 automatic cache mutations killed; zero gaps, unowned warnings or nondeterministic tests |
| `067a00e8f16b` / `prep-pr-final-note-budget.pWFKYx` | Final note campaigns at 100 runs per lane: 27 baseline tests pass; all three note controls killed; zero gaps, unowned warnings or nondeterministic tests |

The final combined baseline comprises 78 cache/publication/pin tests, 27 note
tests, 215 polling tests, 21 component work tests, 19 hopper tests, nine handoff
tests and five owner-request tests. Repeated baselines are not added to that
total. The original unconditional publication, missing fallback field, and
first/last-note copying all reject through registered laws in this final run.
The subsequent note-only run verifies its increased campaign budget; it adds
no distinct test to the combined count.

Final routine checks pass: build, Worker/UI/oracle TypeScript, ESLint on changed
TypeScript, oracle migration accounting and `git diff --check`. The eight
ordinary Worker suites pass all 118 tests (`prep-pr-ordinary-final.WLNglt`):
reader ordering, cursor pages/dates/hopper reads, importer hoppers, imported
reading, read-state clear and remote migration shape. One separate temporary
meter probe also passed in that invocation; it is not counted among the 118
product tests or retained as a regression.

The D1 meter handlers were subsequently expanded into multiline formatting.
Their TypeScript token sequence and parsed syntax tree are identical before
and after (syntax fingerprint
`011905af34c3a615871cd79644e1275628508bff52538de0542f950a00801866`).
ESLint, oracle TypeScript and the whitespace check pass after this edit. No
model, history, driver behavior, check or accounting operation changed, so the
existing execution receipts above still apply.

The historical `changes.ts:M21` timeout remains a timeout. The new exact replay
replaces the `readFeedRevision` query with undefined and now rejects by assertion,
not by timeout. M70 was owned but unreached in the earlier loader sample; an
empty `oracleFiles` result did not make it unowned. The authored fallback-note
control reproduces its exact field deletion. These receipts close those specific
enforcement gaps; they do not claim full mutation coverage of either module.

Setup attempts are excluded from RED/GREEN and kill totals: the first concurrency
grammar used non-invertible `fc.chain`; one pin replay lacked a path; one polling
selector ran no enumerated tests and an external config was refused. The first
final-control invocation omitted the `authored:` prefix and selected zero
mutants/tests. Interrupted epoch-bearing traces supply no final result.

## Checklist v1 continuation and limits

| Requirements | Evidence |
| --- | --- |
| ORC-001/003/009 | Existing authority, law prose, semantic note abstraction and separate page/cache observations remain explicit |
| ORC-002/011 | Cache/fresh trusted base is declared; independent array replay remains; note and polling predictions use source inputs |
| ORC-004/013 | Reconstruction, ablation, bounds, exclusions and the neighbouring histories are stated above; original publication and note-copying controls distinguish the missing cases |
| ORC-005/014 | Real local D1 and production entry points supply the stated premises; controlled scheduling establishes only these native primary-D1 interleavings |
| ORC-006 | Original publication, exact field deletion, first/last-note copying, old-response and final-cache corruptions reject at their named comparisons |
| ORC-007/015 | Generated properties retain fixed/random lanes, direct replay and required constructed schedule/note reach; D1 campaigns retain 25 runs and the synchronous note campaigns use 100; polling positive reads enumerate all eight pairs |
| ORC-010/016 | Requests drain before storage cleanup; fixed witnesses share registered model/driver/check; no ordinary tests were added to oracle files |
| ORC-012 | This versioned source-cut record preserves historical and final receipts separately |

ORC-008's stateful-model trigger does not apply to these pure note/polling
projections and relational cache judgment; driver scheduling state is not
predicted domain state. ORC-007's campaign trigger does not apply to the finite
polling receiver enumeration. Earlier checklist results remain at their stated
boundaries.

The work meter is limited to exercised D1 result paths. Empty
`raw({columnNames:true})` headers are not a general adapter guarantee; current
production has no `.raw()` caller. The native probe
`prep-pr-meter-header-comparison.c0CUjk` confirms the limit:
`SELECT 1 AS named WHERE 0` returns `[['named']]` natively and `[[]]` through
the meter. Its equality assertion deliberately fails; it is an empirical
adapter comparison, not a product RED or an oracle kill. Earlier logging-only
probe passes did not forward Worker console output and supplied no header
comparison evidence. The probe source/logs remain in local evaluation scratch;
the temporary test is removed. A future production `.raw()` path needs its
own receiving witness before this meter can claim its result shape.

This record does not claim remote latency,
replica behavior, browser loading efficiency, admission efficiency, or a full
ranker/loader/polling audit. Genuine imports may rebuild positions and expire
Reading-dependent cursors under the existing contract.

## Final source cut

Based on `86b907e47a0f689c5d1531c3e5e1c2482c0950f0`. The manifest below covers the changed
product, migration, test and supporting documentation files, excluding this
record itself. SHA-256 of its UTF-8 bytes, including final newlines:
`c11aef8bc2530ae321ba58295e1efb240eafb071668ebda3b056759802776991`. It identifies this local cut before a future commit.

```text
13a08f4955d530304dcc5a3a455753fac71232d6798202bd0b3f5d8429f9601a  CHANGELOG.md
df61c8af6e123198596c3d137ca6a4a64b8a068a82ac29c61ad14d0377f73587  docs/pace-layered-feed.md
84ea4c9b88e9c59d49d1315a2d802500e6d896f52322cc01019945d44d7bd7a2  docs/reader-derived-work-main-integration.md
695f071d8203e642d07b2c9efd49c94d45228c30352175e99948f0fe7be436da  docs/reader-derived-work-oracles.md
9cf460a72891545849ec297eaddaa4b6b079ab5c5d1fb50fdbb7629c0fef7101  docs/search.md
5d00afcda0b778ab60089cf75defb0fb7371beed96aec8b4af42f127204ab93b  docs/upgrading-to-0.11.md
1297b4836a773e2288ac66fd444ac92cb1ea7ab4c362f34d6d3a3eb23a2ce1a2  migrations/0058_reader_work.sql
205eb1fdf07ab424b8cda7df5afed4eeed470b41818e33805348459e444d6f28  scripts/deploy-all.ts
0529a8caf2c4345fc728888260542144249cbc213d71963f9324e75e2f5ac95f  src/cursor-page.ts
498d94f9b1e062ca419cdfbc31f73730064ff3b8682f58ded64583ed9433d58e  src/feeds/reader-order-cache.ts
91ec05c5e30dea041ca82fb1e0464aef4d4a50431054b16bffbdde615f8d2232  src/feeds/reader-order.ts
a026a44944aca84b4e4fe6e47e6ae5ab90becc1da73f1608d9d86ce7d786090d  src/reading-data.ts
ac12e880469df7c0d9cdbd1b47fe94bff97ba43e7648d90afba10d4653639e3d  test-oracles/d1-work.ts
3e639fc6d8588b013ba319e138569f86dbe10e819d6610de77960f6932c4f227  test/cursor-validator-handoff.oracle.test.ts
2547a08de05bfc927cf8fe0574978962ab56854348cf3f283957e333aeffd22b  test/fixtures/reader-work-mutants/hopper.json
179186822c3a0c4cd42a4b6cd2577cdfe17e25ff248d33930954bf09e8df1d50  test/fixtures/reader-work-mutants/reader.json
2a22b710f1d175e0e55409a0094150f8282e8f5eec1eeb1b0ab7f656dbaf3d5b  test/hopper-dependencies.oracle.test.ts
95d3b8ab47c8b5da4a8647c5759323c99b710c6b4d203588945cf2a977e1c7ae  test/oracle-property-registry.ts
6671ee678a03d6db80361931599040abfc7b721a1adf797006ae7321fb962aa7  test/polling-cache-trigger-cases.ts
a9c3f41ccf7509d4baec40ddcfdd25d98a976eac9bb8b88b8e9c54ff076b869b  test/polling-cache.oracle.test.ts
8c10335742bd1f23a731007927b00ca6e5ef510127532bd62781c474479134f6  test/reader-cache-validity.oracle.test.ts
26b80ef19e49e5fd3cb56f7952fce2f7c916751b4fb462213383070f1e3431b2  test/reader-history-shape.oracle.test.ts
78c2706d1fb3361b9cae7940886421a18b95f38041db992be738ab5d05c5959b  test/reader-order.test.ts
0ef1f8a6d0cc3bfd50bc7b10c23a28ce6ce31d9ce1fee7bc4d38990f60207584  test/reader-upgrade-oracle.ts
83c1110db49805d3499cfff26a081445c999d751b1720fc392a35c6f73e385bf  test/reader-work.oracle.test.ts
e515825a08cb5e6b93f01f0cc187dc29b1da7ece61d463d0a18c0152772b9c42  test/reading-owner-work.oracle.test.ts
```


## Studio CI preparation coverage

On parent commit `da06e0d9654c50c9aae8f2e89831b91778c7e270`,
[CI run 45074478891](https://github.com/blygger/blygger-studio/actions/runs/45074478891)
passed every Studio baseline but found automatic mutant
`cursor-page.ts:M140`: replacing `source.prepare?.()` with `undefined`
was not distinguished by the Studio owners. The Worker handoff driver already
exercised preparation, but that receiving boundary was absent from this campaign.

The native `cursor-projection-generation` driver now starts its derived table
behind a separate source. Preparation copies source rows; relevant projection
writes update only the source. Stable pages therefore require preparation,
and a first-page retry requires fresh derivation. The model, law, grammar,
checkpoints, seeds and run budget are unchanged. This strengthens the adopted
stable projected cursor generation law. No production change was needed,
so this is baseline GREEN plus mutant rejection, rather than a product RED/fix.
The independent oracle review found no blocker in this driver delta.

For example, initial value0 followed by one relevant projection write owes
id1/value1 after retry. Omitting preparation returns stale data; preparing only
once leaves value0. Stable, unrelated-write, continuation-expiry, repeated-expiry
and snapshot histories remain in the same generated domain and constructed reach.
No design-grammar trigger comes from this change: no model rule or law changes,
and the CI failure contains one gap.

The focused run `3eaf2e16ee1b` passes all190 codec tests and rejects M140 under
`stable projected cursor generation`, on fixed seed20261118's stable history.
The complete cursor selection plus counter owner, run `2480d30ee4eb`, passes
556 tests in five files, rejects all203 automatic cursor mutations and five
owned authored controls, and reports zero gaps and zero nondeterministic tests.
The other19 authored controls are unowned warnings for modules outside this
selection. The initial four-file selection also killed all203 automatic cursor
mutations, but exposed three counter-validation controls without their counter
owner; that incomplete selection is not recorded as a passing gate.

Changed-file ESLint, oracle TypeScript and `git diff --check` pass.
The only changed test source has SHA-256 `d684002fa3ea21752806adb0f2d7ed8b0d8e15ba9bdb9e1b72d0cf622cdd4618`:
`test-oracles/cursor-codec.oracle.test.ts`. The product manifest above remains
unchanged. These receipts add native SQLite preparation coverage; they do not
extend the earlier deployment, replication or performance claims.


## Historical version-state fixture compatibility

CI run45075884440 on parent `9ab5236ac1e6a40328ca5695668fff77465fe672`
passed every oracle campaign and the other nine jobs. Its ordinary Worker suite
reported1982 passed, five skipped and two failures in
`test/version-state-upgrade.test.ts`. The pre0034 setup dropped `versions.kind`
while retaining0058's `reader_order_versions_update`, which references that
column. SQLite rejected the schema edit before0034 ran. The following test
then inherited the missing change trigger and failed its counter assertion.

Both failures reproduce locally before the repair. Reconstructing the historical
schema now also drops the later reader update trigger; all assertions and
production code are unchanged. The same two tests and eleven neighbouring
reader-order tests pass afterward. Worker TypeScript, changed-file ESLint and
whitespace validation pass. `npm run test:upgrade` also passes its synthetic
local release/installation/schema/typecheck/SDK smoke sequence.

The historical-fixture test source has SHA-256 `c99fd839db3aa6446103c1420b65c0abed4c985e08e8fe4045cb4cbb6ed69871`.
This is fixture compatibility evidence, not a product behavior change or
an additional oracle law. The prior Studio preparation receipt remains valid.


## Withdrawal fixture timing

CI run 45081400006 on parent `e76f9f5311f74148de895440633bdaf686304921`
passed all oracle campaigns, every other job, and both historical version-state
tests. The ordinary Worker suite reported 1983 passes, five skips and one
failure in `test/background-lens.test.ts`. That older withdrawal fixture
published two own items and assumed the first remained in Foreground. When
those publications cross a second boundary, the existing superseded rule
correctly moves the first item to Background.

Putting the first version five minutes earlier reproduces the exact membership
failure deterministically. An additional temporary assertion confirms its
stored reason is `superseded` before the membership assertion fails. That
assertion and the original source remain in local CI scratch.

The fixture now disables supersession for its withdrawal comparison, following
`test/burst-fold.test.ts` and `test/background-measured.test.ts`, and restores
default rules afterward. The distinct publish times remain in the fixture so
fast setup cannot conceal the neighboring rule. Every existing withdrawal,
tombstone, kind and count assertion is unchanged. The same fixture plus the
measured-background, placement, burst-fold and historical version-state suites
pass all 32 tests. Worker TypeScript, changed-file ESLint and whitespace checks
pass. No production, model, law, oracle driver or assertion changed.

Final fixture source SHA-256: `3bca5eace2270789e050d6bb3f58a7be1e7facd62213692d47eb047e5471116f`.
This repairs fixture isolation, not the product's supersession behavior.
