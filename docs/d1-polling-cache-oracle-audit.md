# Polling/cache oracle and loss audit

Contract: [working design v3](d1-polling-cache-design.md). This record owns the
loss comparison and receiving boundary; it does not claim deployed-provider
proof, maximum stale age, global single-flight or actual quota capacity.

The original loss ledgers and v2 audit below describe their named historical
commits. The v3 review at the end supersedes Studio publication-cursor claims.
Feed and trigger evidence retains its original scope.

## Frozen reduction and source isolation

The first oracle draft was frozen before production implementation:

| File | SHA-256 |
| --- | --- |
| `test/polling-cache.oracle.test.ts` | `820ab3d5642b2d1bbf0499a11249f3c502bfe11b8fbe8b3642aef62a80c2e050` |
| `test/polling-cache-oracle-model.ts` | `531d0bcdf1b13309355a6ba70b1a2dbf7f2917aa2c08b9ea38fc0bbc7a941584` |
| `test-ui/polling-cache.oracle.test.ts` | `671ce66b1ba9f0b66aeb2d8290fc9fe27b20f1ee5a21e738da3bdb8fa4322539` |

Fresh scanners separately read the TLA+ final models/receipts and the SQLite
prototype/receipts. Each saw the frozen reduction, without the sibling source.
The drop rules below describe the observed reduction, not author intent. The
user separately authorized fixing recovered gaps and implementing the design.

## TLA+ loss ledger

| ID | Supported source observation | Where the reduction lost it | Receiving repair |
| --- | --- | --- | --- |
| T1 | `LegalArtifact`/`StoredRevisionSound`: bytes tied to stored generation | History membership collapsed commit/revision/payload | Reference generation map; inspect saved metadata and parsed payload |
| T2 | Sticky `NoRegression`, including repeated values at revisions 1/3 | Final A/ETag sample hid same-valued regression | Same-valued competing builders; exact saved-generation comparison |
| T3 | Atomic source/revision monotonic movement | Changed-domain names replaced upward counter movement | Check increasing expected counters; retain rollback and no-op comparisons |
| T4 | Load may install newer than pre-load target | One race only returned target-equal data | Newer receiving load still requires subsequent target check/refresh |
| T5 | `InstalledIsSource` upper bound | Reference reused observed installed value | Independent source upper-bound control and generated expected installation |
| T6 | Failure can occur at any build stage; artifact unchanged | Only put failure and eventual repair observed | Content-read and put failure; inspect saved bytes/token immediately |
| T7 | Distinct work observations | Batch collapsed to one string, put proxy stood in for rendering | Record batch statements individually; exact allowed unchanged revision query; trigger-write witness |

Retained: mixed-render rejection, old-overwrite/ABA schedule, conditional 304
revalidation, unchanged Studio check/load distinction, target-equal
acknowledgment, independent failed views, later retries. No lost guarantee for
global duplicate suppression, bounded staleness or liveness: the source does
not assert them. Preflight omission is not a loss because generation-CAS-only
also passes. Epoch/auth/visibility/cold/SQL coverage are extensions beyond TLA.

## SQLite loss ledger: all 24 receipts

| Receipt | Frozen result / dropped rule | Receiving repair or retained distinction |
| --- | --- | --- |
| 1 draft INSERT | Setup replaced event | Items family INSERT checkpoint |
| 2 publish state | Started public | Items family status/version transition |
| 3 unchanged-timestamp draft edit | Retained, tighter domains | Items only; excludes unnecessary Reading invalidation |
| 4 no-op UPDATE | Retained | Empty changed-domain set |
| 5 subscription INSERT | Retained | Exact four-domain set |
| 6 diagnostic poll write | Retained direct SQL | Subscriptions only; not a real HTTP-304 importer claim |
| 7 NULL to ETag | Non-null diagnostic representative | Explicit nullable forward transition |
| 8 ETag to NULL | Same compression | Explicit reverse transition |
| 9 provenance title rename | Retained | Subscriptions/Reading/hoppers/feed |
| 10 old-dated import | Retained | Arrival unrelated to remote time |
| 11 direct HTML repair | Retained direct SQL | Reading/hoppers, not feed |
| 12 imported kind/page update | INSERT/body/delete omitted metadata branch | Explicit metadata UPDATE plus family coverage |
| 13 version INSERT | Setup replaced domain observation | Versions INSERT/UPDATE/DELETE family |
| 14 feed setting INSERT | Setup replaced domain observation | Settings family with feed-relevant key |
| 15 non-feed update setting | Exclusion omitted | Settings-only update_checked_at INSERT |
| 16 OLD/NEW key move | Fixed keys replaced identities | Rename feed key out and back in |
| 17 withdrawal | Body edits replaced lifecycle | Direct status/kind/version withdrawal |
| 18 imported DELETE | Retained | Exact three-domain set |
| 19 rollback source and revisions | Source observation omitted | Check reverted title as well as counters |
| 20 security non-effect | Different authentication law substituted | Direct budget write leaves all content tokens unchanged |
| 21 missing singleton gap | Settings substituted for subscription | Nine families × INSERT/UPDATE/DELETE fail-closed tests |
| 22 one-table repair limit | Per-effect limit lost | Same all-family missing-state coverage, not one repair hook |
| 23 missing items-delete calibration | Synthetic arrays replaced receiving path | Drop actual delete trigger, execute DELETE, require named domain failure |
| 24 100-row amplification | Statement counts replaced row writes | 100-row receiving total_changes/counter witness; not deployed billing |

Additional SQL-source scope: nine tables × three events now have receiving
fixtures. Current columns must appear in null-safe update guards. Explicit
OLD/NEW key and nullable checks distinguish plausible wrong boundaries. Feed
field classification still requires response dependency evidence; copying
conservative prototype domains is not independent product judgment. Historical
fixture encoding failure is classified as setup failure, not a semantic kill.

## Oracle guide boundary

The reference imports no production classifier, cursor reducer, renderer or
trigger. Driver helpers may use production routes and native bindings. The
source/installed/applied/artifact distinctions are justified by the recovered
histories; expected installed values are derived from source history, not copied
from the observed result. XML parser supplies observation only.

The TLA+ models are abstract controls; local Cloudflare workerd and native
D1/R2 bindings receive concrete transaction/conditional-write premises. Those
local witnesses do not establish deployed Cloudflare lifetime, billing or
distribution. No production connection or deployment is authorized or needed
for this implementation stage. Implementation must pass the receiving suite;
final execution and numbered ORC outcomes are recorded at closeout.

## Numbered guide review (v2, historical)

Reviewed implementation head: `9a9a6ab8e23fc48685986685d2070539110a4942`.
This record identifies the immutable source used for the final review. Later
commits that only add this evidence or PR prose do not change that source.

The evidence applies to the selected narrow contract. “Pass” below is bounded by
that contract and the stated receiving environments; it is not proof of all
cache behavior or a claim that the original design was lossless.

| Requirement | Outcome and concrete evidence |
| --- | --- |
| ORC-001 | Pass. Design v2 P1–P10/R1–R9 is the authority. Both oracle headers and this record exclude deployed quota, global single-flight, maximum stale age and unconditional convergence. |
| ORC-002 | Pass. `polling-cache-oracle-model.ts` imports no production code. Trigger event expectations are hand fixtures, source facts precede requests, and generated Studio expected installation comes from source history. Driver imports do not predict the answer. |
| ORC-003 | Pass. Headers name contract, model, grammar, driver and checks. SQL events go through native D1; feed histories go through makeApp and native R2; Studio histories go through Polling and the actual query adapter. Parsed values, saved generation bytes, HTTP validators and work are distinct observations. |
| ORC-004 | Pass within the declared generated scope. Feed generation is serial settled histories of 1–8 values in 0–2; it reconstructs single changes, repetitions and A/B/A. Removing repetitions loses same-visible-value coverage; removing the second request loses settled observation. It excludes empty histories and 3. Studio generation is 1–20 write/poll/fail/restore actions plus a mandatory final poll. Each named cursor sequence can be written in that alphabet. Removing fail loses retry, restore loses counter-reuse identity, write loses invalidation, poll loses acknowledgment. Unknown actions are excluded. Delayed/concurrent/provider histories are fixed receiving witnesses, not claimed as generated grammar coverage. |
| ORC-005 | Pass. Named checkpoints observe actual XML/HTTP/saved-object facts, native trigger effects and actual QueryClient/Collection results. Browser idle requests distinguish cheap checks from collection GETs and show later-client content. |
| ORC-006 | Pass. Native missing-delete-trigger control rejects the expected domain; six source guard mutants reject at named generation/snapshot/work/cursor checkpoints. A seventh wrong unchanged-token design is rejected by the generated settled-values checker. Mutation runner rejects timeouts/setup failures as semantic evidence. |
| ORC-007 | Pass. Shared campaign runs equal-budget fixed seed 20261001 and unseeded lanes (8 feed, 50 Studio histories). Explicit seed/path bypasses those lanes. Mutation runner captures a generated failure's seed/path and reruns that same checker directly; no fc.commands replayPath applies. |
| ORC-008 | Pass. Installed vs applied is distinguished by a newer load/older sampled target and deferred publication. Source vs saved is distinguished by SWR; generation vs visible value by A/B/A; epoch vs revision by restore reuse; wall clock vs revision by the daily deadline. Removing those states changes a legal next observation. |
| ORC-009 | Pass. TLA source/revision maps to committed source facts/domain counters; artifact maps to saved R2 XML and metadata; replacement token maps to generation-bearing XML's HTTP ETag. Studio installed is collection publication; applied is the per-view sampled token. Model clock is scheduled work, not a source revision. |
| ORC-010 | Pass for the receiving harness. Campaign preserves the original checkpoint through shrinking; mutation runner separates semantic kills from setup/timeout and restores sources. Gate cleanup releases held work. Actual Collection fixtures use withOracleCleanup so cleanup failures retain the primary mismatch and separate secondary errors. |
| ORC-011 | Pass. Named shared-fault hypotheses: omitted feed dependencies, body-only equality and fetch-success-as-installation. Independent source/parsed DTO checks, TLA generation histories, SQLite direct-event receipts and real adapter pending-edit/initial-flight witnesses distinguish those faults. Native billing remains unresolved; this record owns that limit. |
| ORC-012 | Pass. This table records all other requirements; frozen-source loss ledgers retain omissions and repairs. No blanket bug-class elimination is claimed. Fixed concurrent histories cover old overwrite, ABA, mixed read, failed publication and cold creation; adjacent restore/304/retry cases extend those boundaries. General multi-page snapshot consistency and deployed lifetime/billing remain outside the selected contract. |
| ORC-013 | Pass at tested boundaries. No-op vs changed/null transitions and OLD/NEW setting keys distinguish trigger rules; maximum counter vs overflow rejects unsafe increments; exactly 24 hours minus 1ms vs 24 hours distinguishes scheduling. A canceled/no-op fetch, pre-target initial flight and pending local edit distinguish success from installed acknowledgment; source changes during render and same-valued newer publication distinguish stable generation from body equality. |
| ORC-014 | Pass with explicit handoff limits. Delayed provider gates wrap completed native D1 reads/R2 conditional puts, so native transactions/CAS supply the receiving premise. Studio controlled loads hand off to real QueryClient/Collection cancellation, initial-flight and pending-edit cases. Browser HTTP buffering supplies the mounted-view timing premise. Deployment distribution, waitUntil termination, global coordination and actual billing are unresolved and are not claimed by these fixtures. |

## Execution and acceptance boundary

The first receiving red run failed for missing feed ETag before implementation.
The repaired Worker suite passed 117 files: 1328 passed and 5 skipped. The
polling/cache receiving file has 73 tests in normal fixed/random mode (direct
replay selects one campaign and removes one normal lane). UI suite passes all
38 tests across five files. Type checks and SDK/SPA builds pass. Mutation controls
must reach their named semantic checkpoint; fixture failures are not counted.

Studio acknowledges only a token sampled before a fresh load. The query adapter
may resolve before publishing when a local mutation persists; the central
acknowledgment seam checks pending transactions before and after refetch and
leaves that view dirty. This uses TanStack DB's `_state.transactions` in one place,
with a real pending-edit receiving test. Library upgrades must retain that test.
A failed startup route has no mounted watcher; its existing Retry control now
restarts the failed derived Reading view after resetting failed queries.

The implementation uses full collection refetch on changed domains. It does not
claim an atomic multi-request pagination snapshot, delta cursor or row-level
merge. Those are separate work with their own oracle owner if later selected.

Final acceptance receipts (2026-10-05):

- Worker receiving oracle: 73 passed after readability edits.
- UI suite: 38 passed after deferred-publication and cleanup repairs.
- Browser receiving oracle: all 3 cases passed on desktop and mobile (6 total).
- Seven semantic mutation controls: all rejected. Generated settled-values fault
  replayed directly with seed `20261001`, shrink path `0:0`, at the same law.
- Normal Worker suite: 117 files passed, 1328 tests passed, 5 skipped.
- Type checks and SDK/SPA build passed. Both direct replay interfaces ran.

The CI workflow now runs `npm run test:polling-cache:mutations` and preserves
its failure logs. Source guard controls and replay are permanent, not one-time
review claims. Prep review found no new runtime defect. Three small readability
edits were accepted: explicit collection dispatch, readable cursor control flow,
and one HTTP ETag field. Broader design and coordination policies did not change.

## Upstream integration receipt

Upstream advanced to `3192d37` while this branch was under review. Reviewed merged
implementation: `812cc759f702c3e18d0a6dc4f52521d4b0fcf5f3`. The cache migration
is now `0024_change_state.sql`, after upstream's subscription-name migration.
Its added `title_auto` column participates in the null-safe guard and has an
independent subscriptions-only event witness. Actual title changes still affect
Reading, hoppers and feed. No new feed dependency or cache policy resulted.
SDK regeneration retained both upstream API additions and `getChanges`.

After this merge, type checks, template check and SDK/SPA build pass. All 38 UI
tests and all six desktop/mobile browser checks pass. The seven mutation controls
and direct failure replay pass again. The 0.8.3 upgrade acceptance script passes,
including local migrations and Worker/SDK smoke checks. Prep integration review
found no new correctness or design issue. The expanded Worker suite passed 121 files, with 1343 tests passed and 5 skipped.
Its cache oracle now has 74 tests, including the new field witness.

## CI output-format repair

GitHub run `37385879673` passed the mutation baseline but its ANSI color codes
split the text that the runner used as an execution witness. This was a harness
setup/reporting failure, not a semantic kill or a cache counterexample. The
runner now strips terminal control codes before checking counts, checkpoints
and replay receipts. With `FORCE_COLOR=1`, all seven controls again fail at their
named laws and the generated failure replays at seed `20261001`, path `0:0`.
This repair changes output parsing only. The proposed TanStack integration
redesign remains a separate design question.

## Query Collection correction (v3)

Authority: the user requires ordinary Query Collection configs whose `queryFn`
fetches changed data or returns its existing cached response. The poller is
restored to upstream and the publication wrapper is deleted. There is no
application cursor, `_state` access, query-update counter, collection registry,
or second revision-query cache. Each invocation checks D1 afresh and uses the
exact Query key's `{ data, generation }` response. `select` materializes rows.

This changes the Studio contract, rather than merely renaming the former
`applied` variable. Fetched cache state can lead adapter publication. The old
TLA+ Studio model and loss rows T4/T5 remain historical; `StudioQuery.tla` now
protects the pre-fetch cache label and accepted response. The distinction
between fetched state and published state is explicit, not a new app-level
acknowledgment algorithm. Original feed and SQL trigger premises are unchanged.

| Guide requirement | Current Studio outcome / evidence |
| --- | --- |
| ORC-001 | Pass within v3: user-approved queryFn cache boundary and design v3. No publication deadline or atomic pagination claim. |
| ORC-002 | Pass: scalar source histories and `StudioQueryReference` predict work/data separately from Query cache and adapter. The revision-match rule is the explicit contract. The reference uses no production imports. |
| ORC-003 | Pass: oracle header names contract, reference, serial grammar, real Query/Collection driver and cache/public-value checks. |
| ORC-004 | Pass in declared serial grammar: 1–20 write/poll/fail/restore/evict actions plus final poll. Examples reconstruct each axis. Dropping write loses invalidation, fail loses retry, restore loses equal-counter epochs, evict loses empty-cache reload, and poll loses observation. Unknown actions/empty supplied histories are excluded. Controlled races and subset ownership are fixed receiving witnesses, not generated claims. |
| ORC-005 | Pass: actual Query Collection queryFns run the production cache-read helper. Cached envelopes, content-load counts, real collection rows and browser requests are observed. |
| ORC-006 | Pass: post-fetch-label, premature failed-label and stale cache-hit controls target the queryFn. Existing five feed controls remain. Model controls reject those three wrong cache designs. Encoding/setup failures are recorded separately. |
| ORC-007 | Pass: fixed seed 20261001 and random lanes share a 50-history budget. Direct UI replay runs the same property. The generated stale-hit mutant captures and replays its seed/shrink path, in addition to the feed replay. No command replayPath applies. |
| ORC-008 | Pass: label vs fetched payload differs during a racing source write; cached vs published differs during local persistence. Present/absent differs on eviction. Epoch differs on counter reuse. One unchanged cached response needs no separate application cursor. |
| ORC-009 | Pass: `label` maps to cached generation, `cached` to accepted response, and `published` to adapter materialization. Old `applied` terminology does not describe current code. |
| ORC-010 | Pass: withOracleCleanup preserves initial mismatch and every cleanup failure. Held reads release and canceled promises receive rejection handlers. Mutation parsing normalizes terminal formatting without weakening checkpoint detection. |
| ORC-011 | Pass: model/TLA and actual adapter distinguish shared-fault hypotheses of latest-token stamping, premature failure stamping, cached-hit counter omission and fetch/publication conflation. A receiving mutation test rejects reuse of a pre-write revision check. |
| ORC-012 | Pass: this versioned delta names all guide outcomes and retains the original loss ledger. No blanket closure claim extends to deployed lifetime, arbitrary pagination snapshots or bounded publication delay. |
| ORC-013 | Pass for retained laws: equal vs changed revision, changed epoch with equal counter, empty cache after eviction, failed/canceled response, source advancing during load, and one-vs-last subset owner all have distinguishing receiving witnesses. |
| ORC-014 | Pass within local receiving scope: real QueryClient and Query Collection supply cancellation, mutation refetch and on-demand ownership behavior. Desktop/mobile HTTP buffering supplies the old-response premise. Server trigger and primary-read premises retain native local D1 evidence. Deployment behavior remains outside these claims. |

The overlapping subset witness now includes a row owned by both queries. It
survives one owner's empty result and disappears after the last owner releases
it. The post-write witness holds an old revision check while mutation refetch
makes a fresh one. Ordinary adapter cancellation prevents the late old result
from replacing the accepted new response.

TLC checks 193602 distinct safe states, with delayed publication permitted.
Latest-label and failed-label controls violate `CacheLabelSound`; ignoring a
changed revision violates `NoStaleHit`. An earlier malformed hostile action is
an encoding/setup failure, not a semantic kill. Final logs and model mapping
live in `models/d1-polling-cache/README.md`.

V3 acceptance receipts (2026-10-05): 39 UI tests pass across five files, including
16 normal cache-oracle cases. All six desktop/mobile cache browser checks pass.
Eight semantic mutation controls pass with forced ANSI color enabled. Both
feed and Studio generated wrong answers replay directly: feed seed `20261001`,
path `0:0`; Studio seed `20261001`, path `0:1:0:0:2`. Type checks and SDK/SPA build
pass. The prior full Worker/upgrade receipts still cover the unchanged backend;
this revision changes frontend query fetching and its reference/model boundary.

Fresh correctness review found no runtime defect. Its only additional receiving
gap was the disjoint-subset fixture, now repaired with the shared-row witness.
Readability review retained ordinary configs and the small stateless helper.
The upstream poller is byte-for-byte restored, and the obsolete publication
wrapper is removed. The one-cheap-check-per-tick claim is intentionally retired:
each queryFn must check afresh to avoid reusing a pre-write observation.

All nine existing desktop SPA regressions also pass: creation/edit/publication,
failed-save rollback, polling without replacing editor text, paginated Reading,
route preload/cache reuse, requested-page reload, settings persistence, item
read retry and navigation-save flushing. These are receiving checks for the
unchanged optimistic/lifecycle behavior around the new query function.

Current v3 reviewed implementation head: `03d771db136cc84362cd29cfecc0d06cb5259dde`.
This source includes the plain Query configs, current model and receiving tests.
