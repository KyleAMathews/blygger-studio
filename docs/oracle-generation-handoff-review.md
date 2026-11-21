# Conditional cursor generation handoff

This record accompanies the CI repair based on
`1ffc7069604a58a60ef9ac5621fe35190dbca626`. It covers the source and oracle files
committed with this record. The completed handoff/keyset receiving receipts
and source-cut hashes appear below. Final combined helper-source coverage belongs to the branch review
record linked at the end. Existing ETag, admission, cursor, freshness and capacity
laws remain in force.

## Confirmed defect and receiving contract

The preserved maximum-size batch test requires at most five owner or seven
delegated physical D1 binding calls. Each native D1 batch counts once; envelope
and child admissions still consume their complete logical quotas. Conditional
reads must also preserve each child's data, position, status and validator.

The CI failure reached fifty successful children in all eight operation/access
cells. Item detail and mention summary used five/seven calls. Mention lists and
mention groups used seven/nine: the conditional adapter and cursor helper each
bracketed the same projection with a complete generation read.

The new receiving matrix covers all four operations, both mentions directions,
owner/delegated access, and child counts1/49/50. Every history performs an initial
read, unchanged conditional read and changed conditional read. The reference
uses fixture identities and the external work bound, without predicting SQL
rounds. The driver invokes real operation definitions, D1 SQL and read packing.
Each checkpoint compares its scoped projection and order: item id/contentMd,
inbound mention ids, outbound id/created, mention-group target/counts, or complete
mention-summary counts. It also compares status, validators, physical calls,
quota rows and logical admission INSERT count. Other DTO fields retain their
existing resource/derived-validator owners.

The repair passes a per-operation full snapshot to the two cursor-backed
handlers. The first cursor attempt can reuse it. A retry obtains a fresh snapshot.
A successful stable projection can return its full completed snapshot; the
conditional adapter compares the complete before/after states before installing
a stamp. A missing completed snapshot retains the ordinary post-handler read.
The handlers return directly after their cursor projection. No content read is
placed outside the bracket. Authentication, input validation, admission and
feature checks remain before the shortcut.

## Generation schedules and permitted alternatives

A separate real D1 operation/cursor driver writes after row selection and before
the post-projection snapshot. It enumerates a stable neighbor, one/two related
writes, an unrelated-domain write, epoch rotation and projection failure. It
checks HTTP results, projected values, work and validity of any completed proof.
It does not require an implementation to publish an optional receipt on a
raced path.

A successful retry may retain the original full before snapshot and install no
stamp until another stable load. It may also supply its own equal full bracket
and immediately install a stamp. The model admits both complete traces. It does
not combine independently permitted fields into an impossible execution.

Review controls exposed two harness defects before closeout. Native setup and
runtime errors now propagate through `withOracleCleanup`, so a missing checkpoint
cannot relabel them as a product violation. Every release runs independently.
Wrong observed checkpoints remain primary if cleanup later fails. A second
control exposed an accidental requirement for one retry-stamping strategy. The
allowed-trace model now accepts both valid strategies and optional omitted
proofs. Prefix-by-prefix candidate filtering preserves the first incompatible
recorded checkpoint even after a legal alternate prefix; a later cleanup error
retains its separate cause. The reviewer executed18 positive source-bridge
traces and18 native judge/classification controls against these alternatives.
Those controlled-provider probes are checker evidence, separate from real
Worker/D1 receiving runs and hostile mutant kills.

The Node companion consumes the same actual conditional/cursor seam with a
controlled D1 provider. It checks one admitted child and subtracts one/two
envelope admissions from the five/seven bound. It varies input values and both
access kinds in equal fixed/random25-run campaigns. This catches a detached
handoff in the default Studio source gate, whose earlier synthetic handlers did
not consume cursor receipts. The Worker matrix supplies actual SQL/packing and
count-boundary evidence.

## Design grammar and guide audit

Preservation relation: named accepted laws, with no contract change. The parts
are resource projection, request authority, admitted child count, conditional
phase and generation schedule. Projection/access/count form the finite product
required by the work contract. Related writes and epoch rotation overlap cursor
retry; unrelated full-state changes overlap validator installation. Failure
excludes completed proof. Input values determine expected rows independently of
production helpers.

- ORC-001/002: authority and boundary are stated above; the receiving oracle
  showed RED on unchanged production before the handoff edit.
- ORC-003/009: contract, independent model, finite/generated histories, actual
  production driver and checkpoint comparisons are visible in each owner. The
  internal receipt maps to a complete D1 change-state snapshot.
- ORC-004: the matrix reconstructs the original50-child failure and49/1 neighbors.
  Removing projection loses the unaffected item/summary controls; removing
  access loses delegated charges; removing phase loses revalidation/freshness;
  removing scheduling loses retry, unrelated full-state and failure distinctions.
  Legal child counts remain1..50. Invalid input has an existing operation owner.
- ORC-005/006: trace corruptions and authored production controls are recorded
  separately from actual RED, real GREEN and safe implementation alternatives.
- ORC-007: the Node property uses fixed/random campaigns with identical25-run
  budgets and the existing seed/path replay interface. Worker schedules are
  fully enumerated, so a random campaign is not applicable there.
- ORC-008: models are pure functions of bounded fixture histories; no stateful
  reference-model state was introduced or merged.
- ORC-010: native driver errors, observed mismatch precedence and independent
  cleanup were challenged with the installed judge. Child failure status and
  malformed200 bodies are normalized without projection throws.
- ORC-011: the work model does not copy production's query plan. Actual binding
  instrumentation is also exercised by the preserved ordinary packing tests.
  No additional shared semantic fault requiring another formulation was named.
- ORC-012: this versioned record accompanies the exact source cut. See final
  receipts below for the applicable gap selections and their limits.
- ORC-013: counts49/50 retain the batch boundary; a one-call-over calibration
  rejects a misplaced work bound. Byte/status/quota checks reject lower work
  obtained by dropping content or admission. Invalid51 is owned by batch policy.
- ORC-014: controlled projection gates perform real D1 writes in the Worker
  receiving owner. Actual batch handlers/packing supply the separate stable
  work premise; the Node controlled provider alone makes no deployed claim.
- ORC-015: the generated Node property declares owner/delegated and
  unchanged/changed states, with constructed histories entering every state.
  Worker histories enumerate every matrix/schedule cell and report their reach.
  The normal campaign prints the corresponding required reach counts.
- ORC-016: each new oracle file contains only registered law/model histories.
  The Node fixed regression uses the same model, driver and check as generated
  campaigns. Existing ordinary examples remain in their ordinary test files.

## Evidence

- Raw CI: run44462861040, job135353674995. The capability cache fixtures also
  expected the old `no-store`; they now assert the approved private/no-cache
  policy and an ETag, preserving their authorization and inventory checks.
- Initial Cloudflare startup and duplicate fixture source/target failures were
  setup failures. They receive no product RED credit.
- RED `ffb9261da7d5`:12/27 checks failed at the initial physical-call bound on
  unchanged production, both cursor operations and access kinds at1/49/50.
- Initial GREEN `1b52b84db498`:27 stable checks, selected operator killed. This
  was a sampled diagnostic before outbound and schedule expansion.
- Node `05aa7e8584a8`:14 stable checks with both25-run campaigns; the detached
  handoff operator M35 is killed at the intended bounded-work checkpoint.

- Expanded exact Worker shipping `b5119e211f64`:98 stable checks twice
  (batch33, handoff9, keyset56), all9 authored controls rejected by registered
  law checkpoints, zero gaps and no nondeterminism. The command is
  `npm run test:oracles:conditional:handoff -- --contexts 1`. Check and Release
  call it after the preserved four derived-validator controls.
- Preserved ordinary receiving suite:28/28 tests pass in
  `test/read-batch-db.test.ts` and `test/operation-policy.test.ts`, maxWorkers1.
  The original maximum50-child owner5/delegated7 assertion and exact quota
  assertions remain unchanged.
- Focused real D1 keyset `62fb278db12a`:56 stable checks and all three original
  NULL/direction/range-composition operators rejected. The shared model
  extraction is also covered by the expanded98-check shipping receipt.
- Root `tsc --noEmit` and focused ESLint pass after shared model extraction.
- Full Worker source diagnostic was not complete:70 stable baselines,96/200
  operators judged (40 killed,31 crashed,18 survived,7 unreached), followed by
  the package/runtime assertion before Worker initialization. No full helper
  coverage or production correctness claim comes from that interrupted run.

The full helper tree remains owned. The native SQLite codec/keyset companion and
final default eight-source gate close that boundary separately; see the final
[branch review evidence](../test-oracles/review.evidence.md). Until that gate
is recorded green, complete cursor-helper readiness is unproven.

Limits: local Worker/D1 and controlled Node provider; no deployed replica or
Cloudflare billing claim. The generation proof protects complete rendered bytes
only where the dependency inventory is complete; derived-data validator owners
retain that separate obligation. No broader bug-class closure is inferred from
a finite matrix or a selected control score.


## Cursor keyset gap plan (before added histories)

The full cursor-source diagnostic exposed null/direction and range-composition
gaps in the existing owned call tree. Preserve the static cursor walk law and
its existing ASCII fixtures. Add an independent real D1 owner for keys accepted
by the existing cursor representation: null, finite number and string. SQLite
orders null before numbers before text ascending, and reverses that order when
descending. A unique integer id completes each total order.

Parts: nullable mixed-type rank, nullable mixed-type tie, unique id, three order
directions, page width and SQL materialization mode. Null/direction controls
range omission; prefix equality ties overlap the second/third sort fields;
three descending non-null fields create six disjoint ranges and exercise the
nonmaterialized OR fallback. No source predicate or production range helper
predicts expected rows: sort the complete fixture and slice it.

Construct mandatory null, numeric, textual and tied rows, then add generated
rows with new values. The grammar reconstructs the missing DESC/null case and
its ASC neighbor. Removing null loses tail omission; removing tie overlap loses
prefix equality; removing materialization loses its alternate SQL path;
removing a third descending field loses the six-range fallback. Invalid column
or cursor shapes belong to the separate codec owner. Real D1 receives every
query. Production invocation failures become page observations; setup and
cleanup errors remain native. No new product law is proposed.


## Shipping hostile controls

Every outcome below is a registered behavioral-law rejection. Setup failures,
package crashes and safe implementation alternatives receive no kill credit.

| Wrong implementation | Distinguishing checkpoint |
| --- | --- |
| Detach generation handoff | Initial listMentions owner1 exceeds physical budget. |
| Ignore completed snapshot | Initial listMentions owner1 spends a redundant round. |
| Reuse first snapshot on retry | Related-once cannot return the current first page. |
| Trust initial snapshot as complete | Related-once returns stale values/proof. |
| Complete an unstable projection | Related-twice exposes an invalid completed proof. |
| Stamp across full-state change | Unrelated write wrongly shortcuts current bytes. |
| Retain descending NULL tail | Mixed-key complete walk/order diverges. |
| Invert NULL direction | Ascending/descending NULL walk diverges. |
| Union prefix equality | OR broadens a tied prefix range and changes the walk. |
| Scan a five-range deep page | Correct next identities exceed the existing indexed-work bound. |

## Indexed work and helper cleanup

The full helper run exposed a threshold mutation that replaced the optimized
five-range index seek with an ordered OR scan. Both queries returned the same
identities, so row/order checks alone did not reject it. The existing
`test/cursor-range.test.ts` contract supplies independent authority: a deep
page of25 from5000 mentions must use the existing partial index without scan
or materialization and read fewer than250 D1 rows. The previous equal-result
OR query reads more than4000 rows. The new model predicts identities by fixture
arithmetic at boundaries100/101/199; the Worker driver records native query
plans and D1 metrics. It checks work without requiring a particular SQL spelling.
The native SQLite companion consumes the same model and checks the real query
plan; the Worker receiver establishes the actual D1 work premise. The wider
six-range fallback retains its separate value/order law.

The final helper expresses a complete attempt once, invokes it at most twice
for a first page and once for a continuation, and publishes a completed snapshot
only after stable projection and cursor construction. The first unstable attempt
returns no page. Invalid byte/JSON decoding is caught separately from structural
validation. This removes an unnecessary boolean retry state without changing
the accepted malformed/projection traces or the allowed retry strategies.
Independent review replays34 paired original/current malformed/projection
traces,14 valid allowed-alternative controls and four installed-judge controls
on the final helper. These controls all pass; they are checker/refactor evidence,
separate from receiving mutation kills.

## Historical handoff source cut

The following SHA256 values identify the handoff/keyset implementation and driver
cut checked by the earlier98-check Worker receiving campaign. They precede the
indexed-work owner and cursor helper cleanup. The final receiving cut appears
below; neither cut substitutes for the combined gate at the reviewed commit.

```text
32532b0caac65f9b634ad73f02a9c71007734493cc07a1069a5bb97776d0f48f  src/changes.ts
6c7f2223acd44e749808991383ccd4b59adf98a525025019b77d66ed89dded86  src/conditional-operation.ts
4e7cbdc04061a8a278cb16670fabf7769df854c2491ae1e3a09d8fe8dc6ff9eb  src/cursor-page.ts
41de28ed4956bf98f907488e2ad8cd9ed17dc6f61eb4e8844978e34f17f0967c  src/mention-groups.ts
d1823debc7cb39d76fd7695def2e6f6083d90df914aa952b8208279bbf431af5  src/operation-types.ts
ca305ae6dd5f064c3bd7d0dbcf28c4d0ef177719dc9e51fdab441606089aaf33  src/read-api.ts
5874614eaaf9820fc52406f3d253ffc37d027ed60dd6ac8f4098344c52d890dc  test/batch-validator-work.oracle.test.ts
1792cb4f7c2650668b8fbadf701aae1d898d4d17e0f40094048b087e0fa5fd25  test/cursor-validator-handoff.oracle.test.ts
29ac3030af8f413434144cb059a8d3a68080d38eb8fba174bb7ecd8cf64daea6  test/cursor-keyset.oracle.test.ts
608b0c7900e5b2cdd8f522166e14049a255653e50b8e7f217503e4e58c12c11e  test-oracles/cursor-keyset-model.ts
c015c5813eb9ecd85f773090d1bcce979d7edd56861d8fea310da0a75c7c5e9d  test-oracles/conditional-cursor-work.oracle.test.ts
3a044a1441243f21e995e6c8c12944f6a11e84741d19c274b92d9d5baa51f934  test/fixtures/conditional-handoff-mutants/handoff.json
54bb1d752e9d5cd283792e189c20f39dd05a80106420d4e1f502095f50631875  test/fixtures/conditional-handoff-mutants/keyset.json
```


## Final Worker receiving cut

Final shipping run `af87180efc61` uses the frozen cursor helper SHA256
`2f2091be1abd8f62562dddc1f14b86c451791e21cdeec57bbcc6c45c92dafc28`.
The exact checked-in command
`npm run test:oracles:conditional:handoff -- --contexts 1` passes both104-check
baselines (batch33, handoff9, keyset56, indexed work6) and rejects all10 authored
controls through registered laws. It reports zero gaps, production crashes and
nondeterminism. This remains an explicitly selected receiving run; complete
native helper coverage belongs to the final eight-source gate.

The final controls follow the helper's complete-attempt structure: stale retry
reuses `snapshot.before` on the second invocation; premature completion installs
a snapshot before the unstable-projection guard. Every authored source match
was checked to be unique before execution. No law or allowed retry strategy
changed when those source anchors were refreshed.

Post-cleanup ordinary verification passes all67 tests across
`cursor-page`, `cursor-range`, `cursor-order`, `read-batch`, `read-batch-db` and
`operation-policy`, with one Worker in20.55s. Root `tsc --noEmit` and focused
ESLint pass at this same source. The earlier full1851-test Worker and307-test UI
runs precede the helper cleanup; this67-test receiving run supplies the later
ordinary helper evidence.

Canonical raw output: `blygger-handoff-controls-KkptKC` under the OS temporary
directory. Copied results, command metadata and logs live under
`/tmp/blygger-etags-prep-review/ci/worker-handoff-controls` and
`worker-handoff-controls-final-helper.log`. Ordinary, type and lint logs use
`worker-helper-final-{ordinary,tsc,lint}.log`. The versioned facts above preserve
the decisive outcomes independently of those temporary artifacts.

The following SHA256 cut includes the indexed-work model, real D1 receiver and
hostile control dependency. A later source change requires fresh receiving
evidence. The final combined source gate is recorded in
[branch review evidence](../test-oracles/review.evidence.md).

```text
32532b0caac65f9b634ad73f02a9c71007734493cc07a1069a5bb97776d0f48f  src/changes.ts
6c7f2223acd44e749808991383ccd4b59adf98a525025019b77d66ed89dded86  src/conditional-operation.ts
2f2091be1abd8f62562dddc1f14b86c451791e21cdeec57bbcc6c45c92dafc28  src/cursor-page.ts
41de28ed4956bf98f907488e2ad8cd9ed17dc6f61eb4e8844978e34f17f0967c  src/mention-groups.ts
d1823debc7cb39d76fd7695def2e6f6083d90df914aa952b8208279bbf431af5  src/operation-types.ts
ca305ae6dd5f064c3bd7d0dbcf28c4d0ef177719dc9e51fdab441606089aaf33  src/read-api.ts
5874614eaaf9820fc52406f3d253ffc37d027ed60dd6ac8f4098344c52d890dc  test/batch-validator-work.oracle.test.ts
1792cb4f7c2650668b8fbadf701aae1d898d4d17e0f40094048b087e0fa5fd25  test/cursor-validator-handoff.oracle.test.ts
29ac3030af8f413434144cb059a8d3a68080d38eb8fba174bb7ecd8cf64daea6  test/cursor-keyset.oracle.test.ts
a98c27d01ec22e33c36c3298f4174ed3e20735b41b3992e3de787118f6f630b2  test/cursor-indexed-work.oracle.test.ts
608b0c7900e5b2cdd8f522166e14049a255653e50b8e7f217503e4e58c12c11e  test-oracles/cursor-keyset-model.ts
3171c0f957802bbc0a4442b0b2cc4f19dee866f261477147c13605b4286767ab  test-oracles/cursor-indexed-work-model.ts
c015c5813eb9ecd85f773090d1bcce979d7edd56861d8fea310da0a75c7c5e9d  test-oracles/conditional-cursor-work.oracle.test.ts
acaf122ff9c8fa1a98b51fc5bde38ddad9d2ba61cdc04f6f0ef5be7088efc8f6  test/fixtures/conditional-handoff-mutants/handoff.json
d7cfa2d2d7e3a0a0eccbf127c99721f85ab448699d92aa9e61205649d592ba99  test/fixtures/conditional-handoff-mutants/keyset.json
```
