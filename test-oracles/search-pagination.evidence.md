# Search demand and cursor availability evidence

Evidence cut: 2026-11-18, worktree based on `1ffc7069604a58a60ef9ac5621fe35190dbca626`.
The source hashes below identify the uncommitted search repair. Package pin:
`@tanstack/oracles@97a4e7a`. This record concerns SEARCH-001; the full selected
Node source campaign and the ordinary receiving suite are separate receipts.

## Finding and preservation boundary

SEARCH-001: `useSearch` requested `offset + PAGE + 1` rows to infer continuation
availability. When a valid first20 page had a continuation that returned503,
the hook acquired that continuation before load more and published no hits.
The probe recorded `hits: []`, `hasMore: false`, `error: "search unavailable"`,
and physical cursors `[null, "20"]` before a load-more action.

The adopted `demanded search pages` law reuses `docs/search.md`'s shared paged
search and closed-filter contract, the existing palette failure/late-result
receiving test in `e2e/parity.spec.ts`, and the earlier demanded-window behavior
in `ab3a999:src/ui/search.tsx`. Search must publish its demanded accepted prefix,
derive continuation availability from the acquired representation, retain hits
when a continuation fails, and reject publication from an older or closed query.
No compatibility, search ranking, HTTP or protocol policy changed.

The repair exposes `{ rows, hasMore }` from the generation-specific native Query
pages through `readCursorWindowResult`. The existing `readCursorWindow` remains
an array wrapper. Search requests exactly `offset + PAGE`. A positive window
has more when its source has rows beyond it, including rows already cached in a
terminal page. A zero window performs no IO and reports `hasMore: undefined`:
no acquisition means its source's availability is unknown. Search only consumes
positive windows. These are internal result representation choices under the
existing search and zero-window laws.

The bug-class boundary is demand × page boundaries/failure/late completion ×
real React hook/Studio client/generated SDK/native Query × each settled hook
result and each physical request-start cut. The Node companion separately
checks helper results after priming, retaining/replacing a source and retrying.

## RED, GREEN and controls

All product runs used the supported gap CLI. None of the environment failures
or the empty selector run below receives RED, GREEN or kill credit.

| Run | Result | Meaning |
|---|---|---|
| `298ee52d545b` (`red4`) | Original production:22/32 pass,10 fail at `search state` under `demanded search pages` | Semantic RED before production edits. The sampled native mutant was blocked by RED and receives no kill credit. |
| `be13804197e7` (`green`) |30/32 pass; generated one-row-page retry mismatch | The hook's returned state was correct; the oracle overprescribed cache-resume requests after native Query failed. Corrected separately as described below. |
| `cdf949dc03c7` (`green2`) |34/34 pass on repeated baselines; stable; one authored mutant killed; zero gaps | Final browser GREEN and rebuilt original lookahead control. |
| `742f3cfb06ce` (`metadata2`) |29/29 pass on repeated baselines; stable; three authored mutants killed; zero gaps | New metadata helper law over repaired production. No missing-export or setup failure is called its RED. |

The final browser authored control replaces `offset + PAGE` with
`offset + PAGE + 1` in the real `useSearch` source. The source-text bridge rebuilds
the patched source into the Chromium bundle. The control is rejected through
registered property `browser-search-pagination`, law `demanded search pages`,
at `search state` (first rejecting constructed continuation-boundary witness).
This is an assertion failure under the intended law, not a runtime crash.

Metadata controls, all rejected at `window result` under `cursor window availability`:

- `authored:cursor-availability-forgets-cached-extra`: terminal cached page,
  narrower window still has remaining rows.
- `authored:cursor-availability-forgets-continuation`: first acquired page has
  a non-null continuation beyond the requested prefix.
- `authored:cursor-zero-availability-is-false`: zero acquisition cannot claim
  the source is exhausted.

Browser calibrations reject hiding valid first-page hits, a lookahead request
outside demand, and starting an old-query request after a filter switch. The
metadata calibration rejects hiding cached remaining rows. These corrupt the
actual recorded checkpoints through each property's normal check.

Historical environment attempts `red`/`red2` failed sandbox socket/browser
startup; `red3` used an insecure synthetic origin without `crypto.subtle`.
They have no product verdict. The working browser driver serves loopback HTML,
JavaScript and API responses entirely with Playwright routes, so no static
server/socket is needed. Metadata run `e45e8e257760` selected zero mutants with
a nonmatching `--only` prefix and ran zero baselines; it has no coverage credit.

## Retry freedom and design grammar

The model-change trigger for the design grammar card fired. Preservation is
the named adopted law at the same hook checkpoints; backend page size and
counts, action schedules, exact hits/error/loading/availability and late-result
exclusion remain fixed.

A separate probe with size1/count21 established that first20 publish without
cursor20; load more preserves them on503; retry then publishes21. On retry,
native Query can restart the failed sequence. The first model wrongly required
`[0,20]` when `[0,1,...,20]` is also a legal retry transcript. The law permits
in-demand replay; it does not specify a cache-resume strategy. The correction
removes that extra strategy constraint. It is a weakening relative to the
accidental transcript expectation, and does not weaken an adopted product law.

The final driver still records every physical start. At every action cut the
check requires every new start to belong to that action's active query and to
a page position within its current demand. Release/close permit no new starts.
Exact public hook states are compared separately. Thus the allowed restart
example passes, while an initial cursor20 request for size20/demand20 and an
old-query start after switching both fail. Dedicated calibrations establish
those distinctions. No history was removed and no production changed in this
correction.

Model parts each have a job: `query` distinguishes old/new/closed publication;
`visible` is the user-accepted prefix; `acquired` represents source rows already
available from whole backend pages; `error` retains failed-continuation state;
`loading` distinguishes the held old read. `visible` and `acquired` cannot merge:
size7/count21 first acquires21 but shows20, and the next demand can expose21
without a continuation. The model stores no Query cache, cursor object or SDK
representation. Adjacent forms were a table of action cases, an explicit set
of allowed raw retry transcripts, and source counts plus per-cut demand bounds.
The last avoids inventing a Query retry policy and keeps every adopted result.

## Grammar controls and reach

Browser grammar: backend page size1–20, old count0–65, new count0–45, zero to
three loads, walk/failure/late flow and old held success/failure. The resolver
makes late-flow count at least21 so its load-more action is legal. Original
size20/count21/failing-continuation is a fixed input to the same model/driver;
empty, exactly20,21, short pages, cached extra, failure/retry and held old replies
are constructed histories. A size0 provider is excluded by the positive page
size arbitrary; an unsupported flow is excluded by the literal union.

Removing page size loses native-page/window boundary overlap; counts lose
empty/exact/remaining distinctions; loads lose successive demands; flow loses
failure retention or filter cancellation; newCount distinguishes replacing
results; lateFailure distinguishes success and failure after cancellation.
The controlled peer supplies ordered source slices and a legal continuation;
the production hook and SDK decide acquisition and publication.

Metadata grammar: before/after integer arrays of length0–30, values−1000–1000,
same/replaced generation, page size1–8, initial/offset/limit0–35, target failure
boolean. Before/after distinguish freshness, same distinguishes reuse, initial
distinguishes cached surplus, offset/limit distinguish exact slicing and zero
IO, page size distinguishes native boundaries, and failure distinguishes failed
acceptance from retry. Known cached-terminal/narrow-window and source-replacement
witnesses reconstruct. Size0 and a fourth phase are excluded by the grammar.
Malformed numeric windows and pre-aborted callers belong to the existing
boundary oracle; invalid numbers are not quietly filtered from that oracle.

Every declared state was entered by its construction in both fixed and random
lanes. First fixed generated-lane reach counts in the final supported runs:

| Browser state | Count | Metadata state | Count |
|---|---:|---|---:|
| empty |1| zero-initial |5|
| terminal-boundary |2| zero-target |3|
| continuation-boundary |4| empty |3|
| short-backend-pages |17| terminal-window |4|
| cached-extra-rows |11| remaining-window |2|
| continuation-failure |4| cached-extra |0*|
| late-success |4| changed-generation |7|
| late-failure |4| failure-before-acceptance |13|

`*` The cached-extra construction enters it once per lane, independently of the
generated lane. Counts overlap: one history can enter several states. Campaigns
stop at the first violation, so RED's10/32 failed registered checks are not an
unbiased prevalence estimate over generated inputs. No such estimate is claimed.

## Checklist v1 verdicts and limits

| Requirement | Outcome |
|---|---|
| ORC-001 | Adopted search and zero-demand authority, internal metadata information limit, and scope are stated above and in the law blocks. |
| ORC-002 | Browser expectation uses source counts/accepted prefixes; helper expectation uses array slicing and source length. Neither reads production outputs to predict results. |
| ORC-003 | Law blocks, grammar, models, real drivers and per-checkpoint checks remain distinct. Retry freedom correction updated prose and executable check together. |
| ORC-004 | Reconstruction, ablation, range and nearby exclusions are recorded above; no previously legal histories were removed. |
| ORC-005 | Browser mounts real `useSearch`/client/SDK; Node calls real result helper/native Query. Results are owed and compared at settled states, with an explicit held-loading cut. |
| ORC-006 | Four calibrations and four total authored semantic controls reject through the intended law/checkpoint. |
| ORC-007 | Each property uses25 runs, fixed seed20261118 and a random lane through the same grammar/driver/check; the CLI prints direct replay. |
| ORC-008 | Retained state and its distinguishing continuations are explained above; model-only request strategy state was removed because it prescribed no product guarantee. |
| ORC-009 | Visible means accepted hook hits; acquired combines whole controlled backend pages. Other terms name production concepts. |
| ORC-010 | Browser context and held peer are released with `withOracleCleanup`; Node cancels/clears Query with the same helper. Actual mismatches use `search state`/`window result`; missing-event counts use separate unrecorded count checkpoints. |
| ORC-011 | No shared-fault hypothesis requiring another formulation remains unresolved. The helper's direct finite-array formulation and browser source-count formulation also use different receiving boundaries. |
| ORC-012 | This versioned record supplies the applicable verdicts, source identity, witnesses, controls and limits. It makes no full source-audit or final PR-readiness claim. |
| ORC-013 | size20/count20 vs21, size7/count21, cached terminal6/narrow offset1 limit1, and zero vs positive distinguish the availability and demand boundaries. |
| ORC-014 | Controlled HTTP supplies legal pages/ETags and failures; Node provider supplies finite legal pages. D1 and markup/navigation are outside these component claims; unchanged ordinary receiving test is run separately. |
| ORC-015 | All eight states for each property have required constructions and entered both lanes; generated counts above do not substitute for constructed reach. |
| ORC-016 | Both files register only `oracleProperty`; the fixed regression uses the same law, model, driver and check. |

Browser evidence covers one Chromium profile with controlled HTTP, real React
hook/Studio client/SDK/native Query. It does not establish D1's pagination,
search ranking, markup/navigation or delivery of aborted HTTP bytes to the SDK.
The dedicated gate selects one rebuilt authored regression control, not all
browser source operators. Node metadata's three controls are focused evidence;
the complete cursor source campaign also has the existing cursor owners.

Changed oracle/production/infrastructure files pass ESLint. Oracle TypeScript
and UI TypeScript pass; the UI root now includes the React browser harness.
The unchanged parity receiving case is delegated to the ordinary receiving
rerun in both desktop/mobile profiles; its outcome is recorded separately.

## Reproduction and source identity

Browser gate (wired into `test:oracles`, Check and Release fallback):

```sh
PLAYWRIGHT_BROWSERS_PATH=/tmp/blygger-etags-playwright npm run test:oracles:browser:search -- --out /tmp/blygger-search-oracle.Q4WP2J/green2
```

The runner writes the authored mutant from its checked-in definition and invokes
the package gap CLI with the dedicated browser config, seed20261118, contexts1,
test timeout90000 and mutant limit120000. Original RED used the same dedicated
config and seed with `--source src/ui/search.tsx --sample 1 --contexts 1` before
production changed. Metadata run used the ordinary Node oracle config,
`BLYG_ORACLE_FILES=test-oracles/search-window.oracle.test.ts`, the three authored
controls described above, exact `--only` IDs, seed20261118 and contexts1.

Original production SHA-256 before RED:

```text
482aa31747af92c93a0226290e770790969f066b8346ed5fd3d6d9a4c47e669a src/ui/search.tsx
3ce39c8dd0197a17614d22192387bdc2aebc6417de53a7e2ca03bf5c20d50729 src/ui/cursor-query.ts
```

Final checked source SHA-256:

```text
b96a862371863425ad73f006a24cd765cdbe868257e9bfbb3709e85ca37daacd src/ui/search.tsx
21d9a3f23dbde9c6c95d88890fd525bd08152e98ad9a52df04d3c8dee189fb3d src/ui/cursor-query.ts
91d3476b028f8adc106b9632819c841c779f4e22cbfe2f699bf12271b1d7458a test-browser/search.oracle.test.ts
32d9ec027fa6ccfb20bd9942273e757d4f755c59f99005ada4554309b3c3f389 test-browser/search-model.ts
4f8aa29e1ac42e5485d1fbcb8caa4251567eef51a9e1c077e0953e19d0d83e9b test-browser/search-harness.tsx
4df7aba9e1e097d5f5dac81b104a37c8eb2dfd7476212b5500d89f0a3dd27885 test-browser/search-types.ts
7a0607aeabc0ce28290166862c3043f57dc202330727777754ab6de38ea98a09 test-oracles/search-window.oracle.test.ts
3df42dd5eb03de7b2650d787c59104f4667333003ed5115ab60f773ab856bf43 test-browser/browser-build.ts
7657362be8409461e572115257d643f8f097e355735f13f9645a2e218cac8b32 test-browser/production-sources.ts
b84bfd2be3160e67a0d5665e665c4b721c6e2ffd06058c71c74d72a47930d142 scripts/run-search-oracle-gaps.ts
7614e0d9ecf668c3562cfd61b256165d29b8d72ace5a463cb8c092528457823b vitest.browser-search-oracles.config.ts
4a7212dcf072ce8c3fd0a2fe8317f2c48e07d8a2891aaea386931cfa9b55624f tsconfig.ui.json
```

Raw local receipts: `/tmp/blygger-search-oracle.Q4WP2J/{red4,green2,metadata2}`;
probe scripts, original source snapshots, logs and hash manifest share that
directory. The verdicts and identifying facts needed for review are preserved
here rather than relying on those temporary files.

## Subsequent native cache-lifetime gap search

The preceding search RED/GREEN and metadata receipt identify the original
search repair cut. They are historical. The final Studio campaign subsequently
found three cursor-source survivors on its optional cache lookups:
`ui/cursor-query.ts:M85`, `M91`, `M92` in run `dac26eec690f`. That campaign passed
1,251 checks and killed530 mutants but retained five gaps overall. Its three
cursor gaps were investigated under the unchanged availability and settled-read
cleanup laws; neither the old receipt nor its source hashes is presented as the
current implementation after this follow-up.

The three-gap design-grammar trigger fired before new histories were added.
The preservation relation remains named adopted laws at `window result` and
`listeners`. Parts and their jobs: the window identifies the owed slice and
availability; first-source generation prevents mixing pages; native Query owns
the accepted page sequence; read membership owns cancellation; returned rows,
metadata and errors are public results; exact query hash identifies replacement
Query objects; a per-read native representation snapshot keeps accepted facts
available until the result returns. That last part retains native output rather
than implementing another page-merging algorithm.

The candidate witness uses the documented native `QueryCache.onSuccess`
callback to remove the exact successful entry. Query's retryer is already
resolved before it calls `setData` and then `onSuccess`; the native cursor pager
can consequently return its local accepted pages after cache removal. Native
pager1.5.1 may construct a replacement Query on later acquisition, so retaining
only the Query object built before `pager.read` would be insufficient. The
source APIs consulted were `CursorPager.read`, `QueryCache.onSuccess`/
`subscribe`/`remove`, `QueryClient.getQueryData`/`removeQueries`, and the native
pager's `InfiniteQueryObserver` acquisition. Cache lifetime is not a prerequisite
of a successful cursor read.

The real-helper probe recorded the distinction before any production change:

```json
[
  {"remove":false,"result":{"rows":[1],"hasMore":true},"cached":true},
  {"remove":true,"result":{"rows":[1],"hasMore":false},"cached":false}
]
```

Both providers return the same accepted page `[1]` with a continuation. The
second result violates the adopted availability law. Thus the optional access
was reachable; removing it as dead or replacing it with a dereference would
have hidden a product defect.

The metadata grammar adds a cache-retention boolean without removing any old
history. Its callback removes a successful entry only once the acquired native
prefix satisfies that demand or the source exhausts, so both first and later
pages can complete. Required constructions include retained continuation,
removed first-page continuation, removed later-page continuation, removed
terminal-page surplus and the existing retained terminal-cache narrower window.
Their array-slice model and `window result` checkpoint are unchanged. The new
axis tests lifetime independently from availability; removing it loses the
distinguishing witness above. Removing a page before demand is satisfied may
reset upstream acquisition; no result from that different upstream contract is
claimed here. Existing histories were not filtered or narrowed.

Supported run `260c16377a81` is genuine new RED on unchanged cursor production
(SHA256 `21d9a3f23dbde9c6c95d88890fd525bd08152e98ad9a52df04d3c8dee189fb3d`):
8 of41 checks fail at `window result` under `cursor window availability`.
The three selected motivating mutants are blocked by that baseline and receive
no kill credit. This class is a metadata information-loss defect after native
success, distinct from the earlier eager-search-continuation defect.

The repair initializes a read-local snapshot from native cached pages and
subscribes to successful native updates for the exact query hash. It captures
accepted data before a reusable entry can disappear and follows replacement
Query objects for that hash. A positive successful pager read has a nonempty
native sequence: it either reused the initial cached data or published that
sequence through the subscribed success event. The now-unneeded optional
cache/last-page fallbacks are removed on that contractual premise. The existing
`finally` releases the subscription and read membership. No extra transport,
second page cache or page traversal algorithm was added.

Metadata observations now include released QueryCache subscriptions after each
result/error. The existing `cursor-reader-listener-cleanup` property also checks
read-owned subscriptions after the final peer settles while preserving its
original abort-listener inventory before releasing that peer. A retained
provider listener supplies a positive baseline: the check requires zero added
listeners and preserves the provider's listener. Its new calibration rejects
one retained read subscription. The law prose now includes pending references
alongside abort listeners, as the already-adopted cleanup authority states.
No law domain, checkpoint, prior observation, budget or history was weakened.

Supported GREEN/control run `fe2271ff9036` passes795 checks on repeated stable
baselines (754 conditional-read,41 metadata). All five checked-in authored
controls in `test-oracles/mutants/search-window.json` are killed by assertion
failure at their intended registered law/checkpoint, with zero gaps:

| Control | Rejecting law |
|---|---|
| cached extra rows hidden | cursor window availability |
| unacquired continuation hidden | cursor window availability |
| zero acquisition claims exhaustion | cursor window availability |
| original successful-cache-removal fallback | cursor window availability |
| settled native subscription retained | reader listener cleanup; cursor window availability |

The full cursor-source follow-up is recorded separately after completion. No
whole-source closure is inferred solely from these five controls. The new
representation snapshot leaves the original browser demand law and its authored
lookahead control intact; its later receiving receipt is also separate.

First fixed generated-lane reach after the extension: removed first page2,
removed later page5, retained19, cached extra1, changed generation6, empty1,
failure before acceptance14, remaining3, terminal6, zero initial3, zero target1.
All11 metadata states also enter their required constructions in both lanes.
Cleanup's fixed generated lane enters settled first-page3, continuation9,
cancelled with peer3, cancelled final1 and completed8. These overlapping counts
are reach measurements, not an unbiased defect prevalence estimate.

Checklist v1 updates: ORC-001/002/003 retain the same adopted availability law,
independent slice model and checkpoint; the cleanup prose incorporates the
existing pending-reference guarantee. ORC-004/008/009/013 add the explicit cache
lifetime axis, parts and retained/removed distinguishing neighbors above.
ORC-005/006 provide a real native callback probe, semantic RED, stable GREEN,
the original defect control and a subscription calibration. ORC-007/015/016 keep
the same fixed/random25-run property route and add required constructions.
ORC-010 observes results and listener deltas before the test's own cleanup.
ORC-011's shared-fault hypothesis that successful reads require retained cache
data is now challenged by the native callback formulation. ORC-012 is this
append-only receipt. ORC-014 uses native Query, so cache eviction is supplied by
the real owner; HTTP pages and D1 remain controlled/outside this component
claim as before. No checklist trigger has been waived.

The current follow-up source identity for `fe2271ff9036` is:

```text
95d78be84ae0a0e59fa409f5e85e6c8a5f7ed705a1bc3137a7a756be1eb66d45 src/ui/cursor-query.ts
994bd0f1e0bf3ff602003a03ba914273350febb1b062914c922de3dd1ba156bb test-oracles/search-window.oracle.test.ts
92d797cb9b26ab0f428296d5dc21c95051a8925fddd4f77cd0197a18b92546d6 test-oracles/conditional-reads.oracle.test.ts
8287a1b264ee7cfd8eca510eca4c2a5d8b02a0fc37b3b10eb2296c4c0a3acedb test-oracles/mutants/search-window.json
```

Local raw receipts: `cache-removal-probe.{mts,json}`,
`cache-lifetime-design.md`, `cache-lifetime-red/`, `cache-lifetime-green/`
under `/tmp/blygger-search-oracle.Q4WP2J/`. Reproduction uses
`BLYG_ORACLE_FILES=test-oracles/search-window.oracle.test.ts,test-oracles/conditional-reads.oracle.test.ts`,
the supported CLI with `--source src/ui/cursor-query.ts --config vitest.oracles.config.ts
--env-prefix STUDIO_ORACLE --seed 20261118 --mutants test-oracles/mutants --contexts 1`,
and the five exact authored IDs from the checked-in file for the control receipt.

The first full follow-up `5533d7a80063` retained one cursor gap: new native
`ui/cursor-query.ts:M65` accepts every QueryCache event instead of filtering for
the matching successful native update. That raw invocation also accidentally
selected seven external Worker/SDK controls from the global mutant directory
while loading only the two cursor owner files. Their missing receiving owners
make them noncontextual verdicts in that invocation; they receive no cursor
coverage credit. The corrected full cursor run uses a task-local exact copy of
the checked-in cursor control file, retaining every native cursor operator.

Corrected source run `4189b7071322` passes798 checks, kills121 of122 selected
mutants and retains only `M65`. Its first added unrelated-update history was too
early: publishing a sibling's valid pages synchronously from `onSuccess` is
followed by the native observer's final target notification, so the malformed
reader can restore the target snapshot before returning. That observation
prevented claiming the gap closed.

The strengthened history adds an unrelated native success after the target's
final observer notification and before its waiter resumes. A one-shot native
`observerResultsUpdated` listener is installed by the success callback after
the read's listener, publishes a valid empty terminal sibling representation,
then removes itself. The test also registers fallback cleanup for that provider
listener. This exercises the public native event boundary without timers or
reading production outputs into the model. A new grammar boolean varies that
overlap, and a construction requires the event with a target continuation. No
old histories, slice expectations, result checkpoints or budgets change.

Supported focused run `3f4e77999299` passes44 metadata checks on stable repeated
baselines and kills `M65` at `window result` under `cursor window availability`.
It is an assertion failure on the returned availability, not an event callback
crash. The new12th state `unrelated-query-success` enters its construction in
both lanes. The final complete Studio campaign rejudges the other current
cursor operators and controls; the earlier121 kills and this focused kill are
reported as separate receipts rather than a fabricated combined run.

The production hash remains `95d78be84ae0a0e59fa409f5e85e6c8a5f7ed705a1bc3137a7a756be1eb66d45`.
The stronger metadata file for `3f4e77999299` has SHA256
`e348ba3f6d003491ed526a3d72fbe815c11b884759f435244eda6f33dc7823c3`.

The current-helper browser receiving rerun at
`/tmp/blygger-search-oracle.Q4WP2J/cache-lifetime-browser` passes34 checks on both
baselines (20.6s/19.6s), with zero nondeterminism and the original rebuilt
lookahead control killed. The CLI again names the run `cdf949dc03c7` because its
selected `search.tsx` source and oracle inputs are unchanged. This is a fresh
execution (`computed:3`, `reused:0`) against cursor-helper SHA256
`95d78be84ae0a0e59fa409f5e85e6c8a5f7ed705a1bc3137a7a756be1eb66d45`,
distinguished by that hash and receipt directory from the historical run above.

Direct real-helper after-probes return `hasMore:true` for the same continuing
page with both retained and removed native cache entries. Additional native
success, continuation failure and continuation cancellation probes each record
zero added QueryCache subscriptions and a retained provider listener after the
public promise settles, before test cleanup. Failure and cancellation retain
the provided error object. Raw JSON receipts are
`cache-removal-after-probe.json` and `cache-subscription-after-probe.json` in
the same temporary directory.

Final focused ESLint and both UI/oracle TypeScript roots pass. The combined
`npm run typecheck` root phase, at this concurrent worktree cut, reports only
`test/cursor-validator-handoff.oracle.test.ts:93,96` (`after` on `never`) in
another owner's newly added Worker oracle. That result is reported to its owner
and receives no pass credit; the later whole-branch typecheck receipt is
separate. `git diff --check` passes. Source/test work for this search cell is
frozen for the final whole-Studio gate.

## WH-14 fixture cleanup follow-up

Review identified an ORC-010 fixture-resource gap in the new provider listener:
the driver's sequential `finally` called `QueryClient.clear()` before provider
release, so a thrown clear prevented that release. The reviewer executed the
actual current property driver/model/check, actual cursor helper and native
Query, injecting only that cleanup failure. The clean neighbor left zero
listeners; the failing-clear case left one provider listener. Product failure
fidelity was already intact: an incorrectly recorded listener observation still
failed at `listeners` with the cleanup error retained. This is a harness
independent-release repair, not another product defect or product RED claim.

The targeted driver now uses the existing `withOracleCleanup` helper with three
independent callbacks: release withheld work, clear Query and release the
provider subscription. Semantic observations remain before cleanup. The
property's law, model, grammar, budget, reach and check are unchanged; no cursor
production or metadata code changed. The helper preserves every cleanup error
in an `AggregateError`, while attempting later releases after an earlier one
fails. No new model or design-grammar trigger applies.

The reviewer's actual-driver rerun records zero remaining listeners and zero
active subscriptions for both clean and failing-clear cases. The aggregate
retains the original clear error. A synthetic wrong-listener trace still fails
at `listeners`, with the aggregate kept as its cause. Raw before/after receipts:
`/tmp/blygger-etags-prep-review/ci/provider-subscription-cleanup-probe.{mjs,json}`
and `provider-subscription-cleanup-repaired.{mjs,json}`. These probes receive no
mutation-campaign or Worker credit.

Supported scoped gate `defc8bd6c53c` passes754 checks on repeated stable
baselines and kills `authored:cursor-retains-native-page-subscription` through
`cursor-reader-listener-cleanup > fixed seed 20261118: cancel-first-with-peer`,
law `reader listener cleanup`, with zero gaps. This rechecks the existing
success/cancel/peer histories through the repaired fixture; it is not a new
full-source campaign. ESLint, oracle TypeScript and `git diff --check` pass.
Conditional oracle SHA256 after this driver-only repair:
`39f6a6f0b02cd5ef800445531f514a9db45b5e6650f536b69e954c58948b2b1d`.
The product cursor hash remains `95d78be84ae0a0e59fa409f5e85e6c8a5f7ed705a1bc3137a7a756be1eb66d45`.

WH-14 is `fixed-now`: one raw finding, one confirmed fixture repair, zero
unaccounted items. Lasting value is independent resource cleanup with preserved
semantic failure classification; the narrow actual-driver probe established
both before and after rather than inferring cleanup from a green product run.
