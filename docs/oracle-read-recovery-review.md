# Studio read recovery: contract and evidence

This record accompanies the recovery change based on
`1ffc7069604a58a60ef9ac5621fe35190dbca626`. It applies to the SDK error marker,
`src/ui/read-recovery.ts`, the configured client in `src/ui/data.ts`, and the
owner/recovery oracles committed with this record. The complete seven-source
campaign is recorded separately in the branch's final review evidence; the
focused receipts below do not establish that complete gate.

## Approved contract delta

Decision by Kyle Mathews (GitHub KyleAMathews), 2026-11-18: active Studio
consumers recover current data after finitely many SDK supersessions, without
requiring another consumer. Raw SDK attempts still reject. Explicit cancellation
keeps its original reason and starts no further work. Ordinary HTTP, schema,
network and unrelated AbortErrors remain failures.

The old owner model required an older native Query to reject after its raw SDK
attempt was superseded. The revised model distinguishes those checkpoints:

| Observation | Preserved or revised promise |
| --- | --- |
| Raw SDK attempt | Still rejects; `ReadSupersededError` remains a DOMException named `AbortError`, message `Read superseded`. |
| Original live Studio consumer | Reacquires and resolves with current data, or exposes the actual terminal failure. This replaces unconditional rejection. |
| Superseded body | Never publishes, including during initial load and warm refetch. Retaining already accepted warm rows is allowed. |
| Cancelled consumer | Rejects with the original reason, including `0`, `false` and `null`; no later acquisition. |
| Same-period owner peers | Share pending work; old settlement cannot detach their registry entry. |
| Work accounting | A live old consumer may reacquire. The model counts that demand separately from newer peers, replacing the old fixed transport count. |
| Final settlement | Releases owner registry entries; cleanup and diagnostics remain observable. |

Progress assumes a live consumer, finitely many supersessions, and a responsive
peer. Infinite writes do not imply that a current response eventually exists.

## Design grammar and history controls

The trigger was a change to the existing owner model. The preservation relation
is **named laws**, with the explicit consumer contract revision above; it is not
a claim that the old and new native Query observations are identical. SDK
freshness, raw rejection, failure fidelity, independent cancellation, pending
sharing, and final cleanup remain named obligations.

The reduced model predicts the result from fixture input values, related writes,
consumer liveness, terminal peer outcome, and the controlled completion order.
It does not import the SDK's validator, cache, classification, or generation
algorithm. A transition model was considered; a function of the bounded history
states the owed observation with less duplicated lifecycle state.

| Part | Job and distinguishing witness |
| --- | --- |
| Direct or collection consumer | Exercises generated SDK return values and native Query/collection health; an initial view previously became stranded. |
| Initial or warm demand | Distinguishes no published rows from retention of an accepted snapshot after a real refetch failure. |
| Zero, one or two write crossings | Distinguishes no retry, one reacquisition and repeated reacquisition; suppressing recovery fails after one crossing. |
| Related or unrelated write | Determines whether the fixture value changes. Both can supersede an SDK attempt. |
| Terminal peer outcome | Separates success, HTTP503, invalid schema, network error, look-alike AbortError and direct cancellation. Text alone cannot identify a recoverable SDK rejection. |
| Cancellation reason and effective signal | Distinguishes object/falsy reasons, Request signal, init override and explicit null detachment. |
| Response/body/newer representation cut | Separates a write before acceptance, a write during streamed body validation, and late 200/304 replies superseded by a newer untagged200. |
| Owner key, projection and completion order | Distinguishes justified old-consumer reacquisition from duplicate work among current peers and checks final registry retention. |

These histories reconstruct the original unrelated browse-write witness and its
related-write, warm-refetch, repeated-write and real-failure neighbors. Generated
counts start at0, fixture values include0 through1000, and histories vary item and
hopper owner projections. Collection cancellation uses native Query cancellation
in the owner oracle. The recovery grammar's `terminal: cancel` is a direct-caller
action; for a collection it denotes the same plan as success because there is no
direct caller signal to abort. This alias claims no collection cancellation
coverage. The separate cancellation driver checks the exact handoff between the
raw rejection and the recovery catch.

Removing liveness would retry cancelled work; removing failure identity would
retry a provider's identically worded AbortError; removing publication observations
would allow transient stale rows to disappear before the final check. These
distinctions have witnesses and remain. SDK cache/generation state is not copied
into the model because it contributes no independent contract prediction.

Nearby invalid premises include an HTTP304 without a previously paired usable
representation, or expecting a detached signal to cancel the request. The
representation driver primes the304 pair explicitly, and the signal driver
requires a successful second attempt for null detachment. Existing raw SDK
oracles retain invalid-304 handling. No new history filters, skips or lower
campaign budgets were introduced.

Two production forms were considered: one adapter on the configured SDK fetch,
or wrappers at every Query/direct-read entry. The shared configured-fetch adapter
was selected: every eligible client read receives the same recovery policy.
Per-entry wrappers would require maintaining the same rule across collections
and direct helpers. The cost of the selected form is one typed error class and
one small adapter; it preserves the SDK's original request object on dispatch.
Cloning before dispatch loses generated-interceptor identity and falsy abort
reasons, which an authored control rejects.

The adapter covers collection reads, including initial history/version sources,
summaries and update state, plus `loadArticleEntry`, `loadPeek`, `loadForkOptions`,
contacts, AI models, freshness, imported-history/version helpers, search and
`readAllReading`. Authorization-list GETs are a negative neighbor: they are not
conditional-read eligible, so their ordinary failures must propagate.

## Production and observation boundaries

`ReadSupersededError` marks all four existing raw rejection sites. The adapter
retries only that class and checks the effective signal after a supersession.
Ordinary passthrough requests retain their original dispatch semantics.

The recovery driver calls the exported Studio client and live `itemSummary`
collection. It records the original consumer result, exact physical demand,
new row emissions, retained snapshots and collection health. New emissions are
checked as they occur; a stale publication cannot be hidden by later current
rows. Direct consumers allow no console diagnostic exemptions. Expected
collection failures allow only the exact QueryCollection prefix with the same
error object, and its exact initial-subset error message. A corrupted unrelated
diagnostic containing `0` is rejected.

The representation driver separately observes the raw SDK rejection beneath
consumer recovery. The cancellation driver controls cancellation after that
actual rejection and before the adapter catches it. The owner driver uses real
live queries with distinct native predicates so Query deduplication cannot hide
a broken shared owner registry.

Node receiving uses exact relative and absolute `sdk/dist/browser.js` aliases to
`sdk/index.ts` in `vitest.oracles.config.ts`. This makes the receiving client and
adapter use the maintained SDK source and the same marker class under mutation.
The schemas/types aliases are unchanged. Browser builds still consume the actual
built SDK. A generated-client external probe also checked raw rejection,
eight successive recoveries, look-alike identity and falsy0 cancellation.

The configured `client` initializer now calls `createStudioClient`. Its static
ownership tree includes the configured transport and adapter installation.
Automatic mutant keys associated with the old initializer can change when that
code moves. The focused run does not claim an exact old/new key bijection; it
keeps the original-defect authored key and judges the current owned source.

## Receipts

The original public probe overlapped a successful item GET with `logBrowse`.
Before repair, GET/POST ended with `AbortError: Read superseded`, empty view rows,
native Query error state and initial-subset diagnostics. The rebuilt repaired
client performed GET/POST/GET, resolved with healthy current rows and emitted no
diagnostics. These are controlled transport receiving observations, not D1
mutation evidence.

| Run | Result and interpretation |
| --- | --- |
| `4a5c729a5b3d` | Meaningful RED before the SDK marker, adapter and client changes:11/21 baseline tests failed at checkpoint `recovery`, law `active Studio read recovery`. Reduced history: direct initial read, one unrelated write, successful terminal peer. Mutation report was provisional. |
| `2fa9476187a3` | Earlier focused GREEN:78 baseline tests,8/8 selected operator/authored controls killed,0 gaps. This predates the final representation property and diagnostic tightening. |
| `3fe9a9d28778` | Broader SDK/helper focus:1,120 baseline tests pass;159 mutants,155 killed and4 open server-control gaps in this selected-file run. All145 selected SDK/helper operators and10 applicable authored controls killed. Four `src/conditional-operation.ts` counter-shortcut controls had no Worker receiving oracle in this run; their closure requires that receiving gate. This is not a zero-gap integrated receipt. |
| `47d293c5d7d9` | Final owner/recovery controls after indentation and cleanup repair:97 baseline tests pass (33owner,64recovery), stable repeat,4/4 selected authored controls killed,0 gaps. This explicitly partial `--only` run is not a full operator campaign. |

The four final controls are `older-owner-read-detaches-newer-pending-read`,
`studio-original-unrecovered-sdk-supersession`, `studio-retries-lookalike-abort`,
and `studio-clones-original-request-before-sdk`. Their outcomes are law failures
on registered reproducible routes, not setup failures or timeouts. The original
unrecovered production behavior is therefore rejected by the final stronger
oracle as well as the original RED.

All changed SDK/client/helper/oracle/configuration files passed ESLint, and
`tsc -p tsconfig.oracles.json --noEmit` passed after the final cleanup change.
The SDK was rebuilt with `node --import tsx scripts/build-sdk.ts`.

Reach below totals the constructed histories and25 generated histories in the
first fixed and first random baseline campaigns of `47d293c5d7d9`; repeated
baseline and mutant executions are not added.

| Property | Declared state | Fixed / random |
| --- | --- | --- |
| Recovery | unrelated-write; related-write; repeated-supersession | 10/15;11/11;7/8 |
| Recovery | initial-collection; collection-refetch; no-supersession | 3/6;14/13;12/7 |
| Recovery | lookalike-abort; caller-cancel; falsy-cancellation | 6/8;3/5;3/5 |
| Recovery | real-failure; network-failure; schema-failure | 15/11;4/3;8/6 |
| Representation | response-write; body-write; newer-200; newer-304 | 7/6;6/3;12/11;4/9 |
| Cancellation | request-signal; override-signal; detached-signal | 6/10;13/9;9/9 |
| Owner | old-collection-read; new-period-overlap; settled-owner-registry | 28/28 each |
| Owner | old-settles-before-peer; cancelled-old-reader; distinct-owner-context | 16/16;15/13;13/10 |

Raw reports and replay commands remain in task-local
`/tmp/blygger-etags-prep-review/studio-recovery-{red,focused-green,sdk-green,final-controls}`.
The final source and this versioned record carry the durable contract and
receipt interpretation; scratch report paths are supplemental.

## Cleanup challenge and checklist review

Independent review identified that awaited collection cleanup could throw before
the result was observed or globals restored. The owner and recovery drivers now
record their semantic checkpoints before using the existing `withOracleCleanup`.
Every collection/source release and console/global/Map restoration has its own
release callback. Later callbacks still run if an earlier one throws. Console
messages emitted during cleanup become a distinct cleanup AggregateError.

The actual installed framework judge and actual five check closures passed20
classification controls: wrong recorded results retain their law/checkpoint and
the cleanup cause; correct complete/partial traces preserve the original cleanup
error; completed missing events still fail. A throwing-helper control additionally
preserves the primary error and cleanup error while running subsequent source,
console and global release callbacks. These are synthetic classification and
helper controls, not production mutation kills. They are recorded in
`studio-recovery-orc010.{mjs,json,log}` under the same scratch directory.

| Checklist v1 | Result |
| --- | --- |
| ORC-001 | Explicit dated authority and the approved raw-attempt/active-consumer distinction above. |
| ORC-002 | Input/history-derived expectations; no SDK semantic helper in the model. |
| ORC-003 | Prose, histories, model, driver and check stay separate; changed owner expectations have the explicit law delta. |
| ORC-004 | Reconstruction, axes, bounds and invalid-premise controls are recorded above; no quiet exclusions or budget reductions. |
| ORC-005 | Actual client, live collection, SDK raw-attempt and cancellation handoff checkpoints are observed. |
| ORC-006 | Stale consumer/body, wrong cancellation attempt and unrelated-diagnostic calibrations reject; four final authored controls fail the intended laws. |
| ORC-007 | Each generated property retains fixed seed20261118,25 runs and the same random campaign; reports retain direct replay. |
| ORC-008 | Liveness, input value, peer outcome, owner context and schedule each change an owed continuation. Model cache/generation state is unnecessary. |
| ORC-009 | Raw attempt, original consumer and owner peer are explicitly distinct; write crossing names a controlled event rather than copied SDK state. |
| ORC-010 | Semantic observations precede independent releases; actual-judge and cleanup controls preserve law/checkpoint and distinct causes. |
| ORC-011 | A raw-attempt observer independently checks that recovery cannot turn a superseded SDK attempt into success. A publication subscription independently checks transient rows; external generated-client probes challenge class identity and cancellation. |
| ORC-012 | This versioned record accompanies the reviewed source; partial campaigns and remaining receiving obligations are explicit. |
| ORC-013 | No-write/one-write, real/look-alike error, live/cancelled/detached, old/current200 and paired304 witnesses distinguish the reusable boundaries. |
| ORC-014 | Node controls HTTP scheduling. Generated-client and rebuilt-client probes receive that premise through real SDK/client wiring; deployed Worker/D1 mutation behavior is not inferred. |
| ORC-015 | Each declared state has a constructed witness; measured campaign counts are listed above. |
| ORC-016 | New and revised product tests register through `oracleProperty`; calibration inputs use the same model/driver/check. |

All listed requirements apply. This review claims bounded enforcement of the
approved recovery boundary. It does not claim deployed-host behavior, arbitrary
provider response schedules, progress under infinite supersessions, all browser
engines, or full seven-source mutation closure from the focused runs.
