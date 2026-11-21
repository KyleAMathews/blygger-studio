# ETag review evidence — checklist v1

The cursor guard decisions recorded as pending in historical receipts below
were approved on 2026-11-19. The [guard enforcement record](../docs/oracle-cursor-guards-review.md)
preserves three new laws, five initial mutant kills, and two actual projection
defects found during review. Both defects have oracle RED before production
repair and105 stable GREEN checks with original-defect controls. Final combined
run `06b6129f3166` at pushed `c5ace41` now passes1,840 checks twice, rejects755
mutations and reports zero gaps/timeouts/crashes/nondeterminism. Its1,624 unowned
warnings remain explicit. All905 inventoried candidate files have unchanged
pre/post hashes. The cursor record preserves full reach, identities and semantic
key comparisons. The seven affected ordinary cursor files pass35 tests at this
cut. Exact shipping Worker/D1 receiving passes121 stable checks and rejects14
controls in runs `9c50fb4aa428` and `bc20de7d2e46`; both report zero gaps.
New-head CI remains a separate gate.

## CI native SQLite provider correction — 2026-11-19

Run `44579177037` at `b8bdd53` exposed a provider difference: Node 22.18.0's
`node:sqlite` truncates returned text at its first NUL byte. A direct
`SELECT ? AS value` with `é😀\0\ufeff` returns only `é😀` on Node 22.18.0;
Node 24.19.0 preserves the complete input. This happens before cursor encoding.
The unchanged cursor oracle therefore fails five of 190 baseline checks on
Node 22.18.0. Its 43 blocked CI mutations are provisional, not surviving
product changes or credited rejections.

Local Node 22 reproduction `0b942de47062` retains that five-check failure.
The same cursor oracle on Node 24.19.0 passes all 190 checks twice in focused
run `9ee4694d90a9`, rejects selected control `cursor-page.ts:M91`, and reports
zero gaps or nondeterminism. This is a one-control supplement, not another
complete campaign. The Check and release-fallback workflows now use Node
24.19.0 for the Studio oracle step and restore Node 22.18.0 immediately after
it. Product code, oracle laws, grammars and comparisons are unchanged.
Both workflow files parse successfully and preserve that runtime sequence,
including the release fallback conditions. New-head CI remains pending.

## CI batch quota clock correction — 2026-11-19

Hosted run `44583887959` at `4cae30f` passed the complete Studio campaign
`3d0341eff28b` twice: 1,840 stable checks, 755 rejected controls, zero gaps.
Its first main-job attempt then encountered the already recorded Worker-pool
initialization error. The unchanged local Worker rerun passed all 121 checks
and 14 controls. Hosted attempt two reached the batch receiving oracle and
failed `getItem-delegated-49` at `changed`. That baseline crossed 18:47 UTC.
The job log retained the law/checkpoint but omitted actual/expected values.

The batch fixture used the real clock while expecting all accumulated quota
charges from one minute. Controlled diagnostic runs `76fbad6c7c4b` and
`d5f586975c02` advance the clock one minute per 20 `Date.now` calls on unchanged
production. Both fail 21/33 baseline checks and block the selected control.
The detailed delegated49 observation keeps all 100 admission writes, seven
physical D1 calls, successful child statuses and validators, while final
counters are `[11,20]` instead of `[50,50]`. This reproduces the timing defect
in the fixture. These provisional diagnostics receive no product RED or
control-rejection credit. The hosted failure's exact counter values remain
unavailable.

The driver now holds `Date.now` within one quota window and restores its spy
through `withOracleCleanup`, even if another release callback fails. This
reuses the adopted bounded transparent conditional batch work law. The model,
history matrix, checkpoints, assertions, calibration, production code and
selected controls are unchanged. Quota rollover policy stays with its own
oracle. No design-grammar trigger fires: no model, law or history changes.
The existing ORC-001–016 accounting remains applicable, with controlled time
and guaranteed cleanup addressing ORC-005/010/014/015 at this receiving path.

Exact Node 22.18.0 `npm run test:oracles:conditional:worker` passes: derived
run `9c50fb4aa428` has 17 stable checks and four rejected controls; receiving
run `1245a1e4f5e7` has 104 stable checks and ten rejected controls. Both have
zero gaps or nondeterminism. All 30 batch cells complete initial, unchanged
and changed checkpoints. Each baseline enters getItem/listMentionGroups/
getMentionSummary six times and listMentions twelve times, owner/delegated
fifteen times each, adjacent/maximum ten times each, and unchanged/changed
thirty times each. The over-budget calibration still rejects its trace.
The original controls still fail the intended law through their registered
routes. Changed-file ESLint, all three TypeScript programs and whitespace
checks pass. This commit contains only the receiving driver and this record.
New-head hosted CI remains a separate gate.

Evidence cut: 2026-11-19; historical receipts retain their original source cuts. Recovery/search repair worktree starts at `1ffc706` over the published feature `cb1f721` and companion `0bb48f1`. PR #152 targets companion PR #151. The historical post-R4 receipt below used reviewed origin/main `0e9bd933e30a13c12b1c9fe5c855477d61e8fd91`. Earlier reviewed base: `28b0c8d642a87e5810ad6eabd95c2d1714c53396`. Package pin: `@tanstack/oracles@97a4e7a`. This versioned record evaluates the conditional adapter, public SDK, owner-read and derived-representation laws; historical receipts remain explicitly identified.

**Historical post-R4 Node/browser cut:** post-R4 run `3b382a68ed73` passes all six files/1,158 baseline checks with stable repeat traces and rejects all 502 owned/authored mutants. Of 2,126 total entries (2,115 enumerated + 11 authored), zero are gaps/timeouts/crashes and 1,624 are explicit unowned warnings. All 502 prior owned semantic keys remain present and killed; all 471 first native property/unit reach histograms are unchanged. Selected browser receiving 30/30, ordinary polling integration 15/15 and historical polling controls 9/9 pass, including both native replays. R4's 167 repeated/200 expanded actual-judge controls pass. The exact checked-in Worker script passes 17 stable checks/four receiving controls; all six ordinary Worker files pass 66/66. Mandatory review evaluation is complete. Optional documentation decisions and commit/push/PR/CI gates remain. This is not a final readiness claim. The allowed-policy positive-control reporting issue supplies no kill credit or gap waiver.


## Compatibility law revision — 2026-11-19

Kyle Mathews (GitHub KyleAMathews) approved retaining `/changes` and `getChanges`
unchanged for two releases, marked deprecated, then removing them in the third.
This supersedes the immediate-removal law and its historical 404 receipts below.
The selected release follows current main 0.64.0: Studio 0.65.0, private contract
5.14.0 and SDK 0.20.0. The deprecated operations remain in 0.65.0 and 0.66.0;
removal belongs to Studio 0.67.0 and private contract 6.0.0.

Worker, SDK and controlled adapter owners established assertion RED on unchanged
removed-endpoint production before restoration. The restored source follows
companion merge `bf12caa`, including main's releases and its separate host-root
API-alias CHANGELOG entry. SDK generation/build and deprecation metadata checks
pass. Worker receiving passes 374 stable checks in the broader diagnostic;
focused receiving `fdce62e89c97` passes 355 stable checks and rejects the retained
endpoint's removal control. The broader diagnostic was stopped after finding
three unchanged counter-guard gaps; it is not a completed mutation gate.

Kyle separately approved rejection of invalid provider counters. New oracle
`change-state-counters` passes 184 stable Node checks and rejects all three
identified guards in focused run `a14583730185`. Its mathematical model,
180-input grammar, eight reach states, controls, runtime limitations and source
hashes are in the [compatibility record](../docs/oracle-legacy-changes-review.md).
The restored full Studio run `3a640be84302` passes 1,735 stable checks twice
and rejects 746 mutations. Its 2,376 entries also contain five cursor guard
survivors, one batching timeout and 1,624 unowned warnings, with no crash or
nondeterminism. Both new legacy controls are rejected by their intended laws.
Focused follow-up `195297eb329e` passes 976 stable checks and rejects that same
batching mutation under `work bound` plus three permanent counter controls.
The timeout remains in its original report; the replay changes no oracle or
production code. It is a partial four-control supplement, not another full
campaign. The five internal cursor guard decisions remain separate and pending,
and no receipt here establishes new-head CI. The committed restoration is `b6624e3`;
companion browser-builder merge `212747e` changes only the harness and its
record. Full ordinary Worker 1,866/five existing skips and UI 308 pass on the
unchanged production cut. Release 0.65/SDK 0.20/API 5.14 build and packaged
Node/browser/Chromium/persistence verification pass. Combined-tree save oracle
`8aa66d44b1a7` passes 48 stable checks twice and rejects its original failed-save
control with zero gaps. The compatibility record keeps the precise source cuts,
setup limitation and finite browser-control scope.

## Recovery/search and Worker CI repair cut

The full published-head run `44462861040` passed the Studio/Worker/contract oracle gates, all four mutation jobs, SDK generation, OAuth, release verification and UI307/307. It exposed three ordinary Worker failures: two obsolete successful-GET cache-header expectations and one physical D1-call regression. The browser intake from the preceding run contains29 failed/flaky identities. These failures remained open despite the earlier passing bounded receipts.

The approved active-consumer recovery contract now distinguishes each rejected SDK attempt from the still-active Studio read. A typed `ReadSupersededError` marks only SDK supersession. Studio reacquires those attempts while preserving effective cancellation and every genuine HTTP/schema/network/other abort error. The versioned [recovery review](../docs/oracle-read-recovery-review.md) records original RED `4a5c729a5b3d`, focused GREEN `47d293c5d7d9` (97 checks/four authored kills),20 actual-judge cleanup controls and the distinct attempt/consumer/publication checkpoints. Four server controls in the broader focused recovery subset were not closed by that subset: the integrated gate must judge them with their complete owners.

Search now requests exactly the current demand and reads continuation availability from acquired page metadata. Browser RED `298ee52d545b` exposes the original eager-lookahead defect. GREEN `cdf949dc03c7` passes34 checks and rejects its original-defect control. Node `742f3cfb06ce` passes29 checks and rejects three metadata controls. [Search evidence](search-pagination.evidence.md) records the complete grammar, allowed retry traces, requirement verdicts, source hashes and limits.

Independent receiving run:36/36 desktop/mobile cases pass, workers1/retries0,48.3s, covering all29 original failed/flaky identities. Navigation asserts actual200,200,304, matching validators, exactly two bodies and preserved visible order. Per-retry seed identity and global Reading counters were corrected without weakening those observations. The complete intake and final identity mapping live in the scratch `ci/e2e-failure-class-ledger.{md,json}`. Independent final review has no unresolved search/recovery issue. Cleanup-fidelity and stale-model prose findings are closed.

SDK generation/build, root/UI/oracle TypeScript, configured full ESLint, preservation and ordinary UI307/307 pass at this repair cut. TypeScript caught a Node config ambient collision, fixed by importing `URL` from `node:url`. The first browser save rerun omitted the temporary Chromium cache path and failed setup (run `5df8d1131ff6`); it supplies no product RED or kill credit. The corrected pinned run passes both48-check baselines and rejects the required-save control with zero gaps or nondeterminism. Its canonical output is `blygger-browser-gaps-hPMEBv`; the failed setup output is `blygger-browser-gaps-OSOa6O`. Both share input-derived ID `5df8d1131ff6`, so the distinct output identities matter. The first seven-source integration run `dac26eec690f` passes1,251 stable baseline checks across eight files and rejects530 owned/authored mutations. It reports five surviving gaps (three cursor metadata optional guards and two new generation-handoff paths), zero crashes/timeouts/nondeterminism and 1,624 separate unowned warnings across2,145 entries. The283-file source manifest is unchanged. This is an intermediate receipt, not zero-gap evidence. Final gap closure, Worker receiving results, commit/push and pushed-head CI remain pending.

The later full ordinary Worker suite passes166 files/1,851 tests, with five existing skips, in413.04s. The following full UI suite passes32 files/307 tests in23.76s. Both share a stable production cut before the cursor helper cleanup. The [generation handoff review](../docs/oracle-generation-handoff-review.md) records the repaired physical D1-call regression,98 stable receiving checks and nine rejected authored controls. These results supplement the intermediate integration receipt; they do not replace the final eight-source gap gate or pushed-head CI. The contributor guide now recommends conditional resource GETs instead of legacy change-counter preflights, matching the API contract.

## Latest eight-source integration cut

Run `65b4444c2c39`, seed 20261118, used the default eight-source Studio command with contexts 2. Both baselines passed all 1,533 checks across 12 oracle files. The gap checker rejected 743 owned/authored mutations and reported five surviving gaps, with 1,624 separate unowned warnings. The 2,372 entries comprise 2,353 enumerated operators and 19 authored controls. There were zero crashes, timeouts or nondeterministic results. All 291 recorded input hashes remained unchanged through the run and match this source cut. Exit 1 correctly records the five open gaps; this is not zero-gap or pushed-head CI evidence.

The five gaps are cursor helper M12 (outgoing 8192-character bound), M78 (internal source-column guard), M119 (empty source order), M165 (unsupported returned key) and M170 (unsupported/nonfinite returned-key disjunction). The pending law proposal promises rejection at these internal boundaries without fixing error text, HTTP status or timing. No dependent law or test has been adopted without approval. The [cursor helper record](../docs/oracle-cursor-helper-review.md) contains each semantic key, the tried histories, same-seed preservation and the rejection-only empty-order question.

All four unsafe derived-validator authored controls are killed in this integrated run under `correct derived validators`. This closes the four foreign controls left open by the focused cursor selection. The earlier GCI metadata and generation-handoff gaps are also closed. Independent scoped review found no additional defect in the completed cursor, independent-model, native-adapter or handoff repairs. Its WH09–16 loss audit records seven fixed items and one refuted hypothesis; LC01 is the same item as WH14 and is counted once.

Final real Worker/D1 receiving run `af87180efc61` passes 104 stable checks twice and rejects all 10 authored controls with zero gaps, crashes or nondeterminism. The [generation handoff record](../docs/oracle-generation-handoff-review.md) retains all 15 receiving source hashes. After the final cursor helper cleanup, the 67 affected ordinary Worker tests pass. The earlier full Worker 1,851-pass/five-skip and UI 307-pass receipts remain valid for their stated pre-cleanup cut. Final full-repository ESLint, migration preservation and all three TypeScript programs pass on the final production cut.

Selected final integration identities follow. These files, together with the oracle and configuration inputs, are part of the unchanged 291-input manifest.

| File | SHA256 |
| --- | --- |
| `sdk/conditional-reads.ts` | `26982ebe8ce897c382f30c9be375899b2919682acfce1002f4d529c6bcf78662` |
| `sdk/index.ts` | `60e0a732adeab7c72bfbc584bffde571849478e56ba70479f6f8af6187502d89` |
| `src/ui/cursor-query.ts` | `95d78be84ae0a0e59fa409f5e85e6c8a5f7ed705a1bc3137a7a756be1eb66d45` |
| `src/ui/data.ts` | `672cc95b66d393c47b3a9154051c7a8f12b1b69b036c132e386092b7a24401cb` |
| `src/ui/read-recovery.ts` | `604faf35ff2936dd60cb261b01a8a72ecff81e0cdcddff5c9764671574f82be6` |
| `src/conditional-operation.ts` | `6c7f2223acd44e749808991383ccd4b59adf98a525025019b77d66ed89dded86` |
| `src/cursor-page.ts` | `2f2091be1abd8f62562dddc1f14b86c451791e21cdeec57bbcc6c45c92dafc28` |
| `test-oracles/cursor-codec.oracle.test.ts` | `d14e794c8f6499c4633747a2343bad03f1aee311e90a18c97064f695eb64758e` |

The remaining gates are approval and closure of the five guard gaps, final reruns after any dependent change, commit/push of those changes and pushed-head CI. Historical receipts below do not replace these gates.

## Evidence eras and scope

| Era / run | Actual evidence | Permitted conclusion |
|---|---|---|
| Historical pre-review `6a7f0c17b9fd` | 499 tests; 425 law-rejected mutants; source digests in `conditional-reads.evidence.md` | Earlier bounded component evidence only. Missing public SDK, derived-writer and owner-read dimensions were subsequently found. |
| Review RED `3093163bcc3a`, `first-red` | Owner sharing 7/15 fail; public SDK 66/133 fail; original branches unchanged | The extended receiving laws see S1 and C3/C4. Failed baselines block their mutants; blocked entries are not kills. |
| Derived RED `4e29597efe39`, `derived-red` | Derived adapter 11/21 fail; Worker/D1 `derived-worker-red-clean.log` 10/14 fail at expected 200 versus stale 304; four unchanged neighbors pass | C1/C2 have valid before-repair RED at the intended status checkpoint. The old ordinary receiving test is historical RED, not claimed as a registered oracle kill. |
| Derived repair `c8168b0a0207` | 956 baseline tests; 77/77 generated/authored mutants killed; ordinary receiving 14/14 GREEN | Four unsafe counter shortcuts removed; tracked stable-read work/admission neighbors retained at this source. |
| Owner repair `c27becfc4998` | Owner 33 tests; 51 law-rejected owned/authored mutants; zero gaps/crashes; 1,622 unrelated unowned warnings | S1 registry lifecycle and expanded cleanup/error-attribution promises are judged; unrelated `data.ts` functions are not judged. |
| SDK intermediate `6a2c598f5b49` | SDK 184 tests, 989 total baseline; 24/24 SDK mutants killed | C3/C4 repaired at this intermediate snapshot. This predates S4 and cannot identify latest source. |
| Allowed shortcut policy `8b9bc38f58be` | Conditional 753 + derived 21 baseline; actual refresh-on-shortcut implementation accepted by every law and work ratio 1 | The corrected model admits this legal alternative. Tool labels it one survived/not-judged gap; no kill or universal policy proof claimed. |
| Registered Worker receiving `2e3e2f0016ae` | 17/17 tests; four original stale-shortcut controls killed at the receiving law; zero crashes/nondeterminism | Real local HTTP/D1 writer paths are sensitive to all four original bugs. Four-control partial run only; used the then-temporary sister bridge configuration. |
| S4 RED `97f9a1bf1f7b` | Public SDK 32/270 fail at `passthrough settlement`, first `aborted-write-fields` | Initial C3 interceptor was too broad. The new law reuses existing passthrough/result-mode authority. |
| S4 focused GREEN `b70ff947e809` | SDK 270 + conditional 753 pass; all three original SDK defect controls killed | Eligible original-reason repair retains writes/unregistered/header/HEAD raw-result neighbors. Partial authored-only run. |
| Resource-limited intermediate `36395126ed6d` | 2,124 total entries: 459 killed, 43 timeout gaps in `data.ts`, 1,622 unowned; all four baseline files pass 1,077 tests; zero nondeterminism. SDK index+transport 143/143 killed | SDK scope GREEN at its listed source digests; aggregate owner results were resource failures, later all43 resolved by the integrated two-context run without oracle weakening. |
| Integrated pre-R4 `bf10625e6b4a` | Six files/1,158 baseline checks;502 law kills;zero gaps/timeouts/crashes/nondeterminism;1,622 unowned warnings;17 input-path digests below | Complete tested scope at the identified pre-R4 cut. R4 later challenges failure classification; no final-head readiness claim. |
| Portable Worker `1012219111a9` |17 checks and four original shortcut controls pass through shared runtime/config;zero gaps | Real derived receiving proof now runs through the portable shipping setup; partial four-control run only. |
| R4 checker repair | Same167 actual-judge controls and expanded200 controls across40 registrations pass; checks-only AST preservation and lint/Worker/UI/Node typechecks pass | Bounded checker-classification repair, not a production receiving run or registered mutation kill. Three affected oracle-file hashes are recorded below. |
| Current post-R4/latest-main `3b382a68ed73` | Six files/1,158 stable checks;502 owned kills;zero gaps/timeouts/crashes; 1,624 unowned warnings;all 502 keys/all 471 native reach histograms preserved | Identified current Node scope passes. Selected browser 30/30, polling integration 15/15 and historical controls 9/9 also pass, including native replay. |
| Current shipping Worker / ordinary receiving | Exact checked-in package script: 17 stable checks/four authored kills, zero gaps; ordinary six files 66/66 pass | Current execution distinguished by output/argv/config/receipt/result hashes below. Node gate retains all 69 operators. |
| Final PR gates | **PENDING** | Documentation walkthrough complete; commit/push/PR/CI await the next prep-pr confirmation. No final readiness or deployment claim. |

All named raw artifacts are retained under `/tmp/blygger-etags-prep-review/` unless the historical record gives another location. Decisive outcomes are restated here so the record does not depend on an editable PR description. Commands and final source/output identities are collected below; intermediate labels must remain when totals are replaced by final results.

Authority is the installed `@tanstack/oracles@97a4e7a` **oracle-checklist v1**, read in full. The repository's older guide contains fourteen requirements; the package also requires ORC-015 and ORC-016 and no longer accepts equivalent-mutant exclusions. This record uses the package's sixteen requirements.

The pre-review record's run `6a7f0c17b9fd` (499 tests, 425 law-rejected mutants) identifies its older source digests. It remains historical evidence and cannot identify the subsequently repaired source. Both the pre-R4 and current post-R4/latest-main integrated runs and their17input-path digests are recorded below. Each receipt retains its own identity.

## Requirement assessment

| Requirement | Trigger and concrete assessment |
|---|---|
| **ORC-001** | **Applies. Implemented and verified in current post-R4/latest-main Node and Worker receiving cuts.** Every property declares its law, Kyle Mathews/KyleAMathews and approval date 2026-11-18, and controlled-boundary limits. The opening names pairing, conditional HTTP, post-write freshness, cancellation, batching, numeric boundaries, bounds and cleanup. The private API contract is explicitly the implementation's contract. The approved freedom that shortcut 304s may retain their order also permits refreshing it; R1 below corrects the former model's narrower interpretation. |
| **ORC-002** | **Applies. Static review passes.** Expected values come from input values, array slicing, input fault names, request-start order, finite installation lists and declared HTTP statuses. No model calls production's cache, cursor hash, eligibility classifier, transition code or database query. Production imports (`conditionalReadFetch`, `readCursorWindow`, `createReadBatchFetch`, `conditionalOperation`, `executeRest`) are driver paths. `completionOrder` chooses the controlled schedule from ranks; it does not derive truth from returned data. `summary`, `tag` and `childResult` define controlled wire fixtures, not production classifiers. |
| **ORC-003** | **Applies. Static obligations repaired.** The opening now states controlled-provider limits before mechanics. Each of the 26 model sites has nearby prose explaining the independent input rule and its checkpoint. `law`, `histories`, `model`, `driver` and `check` remain separately visible. The allowed server-stamp policy correction changes both its model prose and executable judgment. |
| **ORC-004** | **Applies. Accounted for by the grammar table below.** All original arbitraries, fixed histories, bounds, seeds and budgets are retained. The 84 new constructions stay within those original domains; the framework's registration validates membership. No history filter or narrowed validity predicate was introduced. The table states reasoned ablations; it does not claim an executed ablation campaign. |
| **ORC-005** | **Applies. Named Node/Studio and real Worker receiving paths ran at the current identified source.** The four owned implementations are called directly or through the public generated SDK and real REST adapter. Checks use `read`, `rows`, `batch`, `http`, `race`, `failure`, `contexts`, `cancellation`, `cursor-cancel`, `isolation`, `raw`, `boundary`, `windows`, `expiry-isolation`, `ordered`, `evicted`, `window-boundary`, `pre-aborted`, `retained`, `stamps`, `listeners`, `validation`, `settlement`, `stable-installation` and `completions`. Cancellation settlement and listener inventory are captured before the withheld peer is released, so eventual success cannot stand in for the earlier obligation. Reach records actual transport/acquisition/validation/settlement premises; the two existing reach declarations remain as originally approved. |
| **ORC-006** | **Applies. Current post-R4/latest-main cut has502 assertion kills, preserved calibrations and passing R4 classification controls.** All 26 properties retain a calibration. R1 adds full-shape hostile controls for capacity 1001 and reinstalling without refreshing, alongside a positive checker control for the legal refresh-on-shortcut policy. Existing wrong answers include old pages, a body on 304, cancelled peers, late cache publication, an invalid retained tag, stale overwrite, retained abort listeners and stalled ready work. Three checked-in authored reintroductions cover older 200/304 eviction and property-order-sensitive reader identity. The old 425 outcomes are reported as law assertion failures, not setup/timeouts. New outcomes must retain the framework's assertion/timeout/setup/runtime/unreached/survival categories; no surviving mutant may be called equivalent. |
| **ORC-007** | **Applies. Fixed/random campaigns pass in current post-R4/latest-main run.** Every generated property supplies fixed seed 20261118 and a run budget. `oracleProperty` runs the same generator, model, driver, check and budget for fixed and random campaigns and supplies direct seed/path replay. No raw `fc.assert`, `fc.check` or `.prop` bypass exists. The enumerated property runs all twelve cases. The final nine-control gate also reproduces native feed and Studio seed/path/unit failures at their exact laws/checkpoints, recorded below. |
| **ORC-008** | **Applies to stateful models. Accounted for.** A per-context accepted value distinguishes a later validator after invalid data; body value alone cannot replace context. Accepted request-start index distinguishes a later continuation that finishes an older read; tag availability distinguishes whether a 304 can restore data. Installation order distinguishes which key must load after pressure; membership alone is insufficient. `seen` distinguishes an evicted key's exact conditional 304 from a never-seen key's 200. In R1, alternative orders with different possible future evictions remain distinct. Only states with identical complete order and compared suffix merge. Earlier answers outside the three-answer checkpoint are dropped because no future compared suffix can include them. No model is claimed minimal. |
| **ORC-009** | **Applies. Mapping explicit.** A context is a reusable SDK request's URL/Fetch context, not an OAuth identity alone. A generation is the cursor sequence selected by validated first-page bytes. A reader is one logical caller; a transport is shared physical work. Model acceptance order uses request-start indices; production uses active tickets. Model installation lists represent eviction order; they are not production Maps. A server stamp holds validator metadata, not the private response body. Reach states are driver premises, not additional model results. Project terms are used for Reading, item, cursor and revision; package terms are used for histories, driver, model, check, calibration and reach. |
| **ORC-010** | **Applies. R4 checks-only repair and current registered campaign pass.** Framework shrinking preserves the original violated law/checkpoint. Drivers record unexpected failures as observations so checks can reject missing/wrong public results. QueryClients are cleared, held cancellation/expiry transports released in `finally`, tracked AbortSignal hooks restored, Date.now restored, and replacement global fetch restored. The batch listener observer measures actual adapter callback identities before settlement. `immediateOutcome` yields a fair event-loop task for controlled immediate work; it is not a wall-clock timeout or a demand for a signal-ignoring withheld provider to settle. The new completion acquisition gate is guarded by this same mechanism. The before-repair actual-judge matrix supplies167 bounded classification controls: eight synthetic-checkpoint checkers lost a wrong received observation to later cleanup, and three polling checkers could blame a correct partial prefix. Those were real enforcement gaps despite the pre-R4 GREEN. The repaired checks preserve actual mismatches and correct partial prefixes under all repeated and expanded controls; see the before/after R4 chain below. |
| **ORC-011** | **Conditional trigger.** The named shared-fault hypothesis C1/C2 was that unchanged change counters imply unchanged derived resource bytes. The original controlled server path cannot establish completeness of real writers. The separate derived-validator oracle and Worker/D1 receiving tests now compare actual bytes while `settleChangeClass`, backfill or index removal leaves counters unchanged. This is a different formulation from counter-based shortcut prediction, with unchanged positive neighbors. For ordering, the input-index model differs from ticket-based production. No additional shared-fault hypothesis or meaningfully different formulation was named for each remaining stateless arithmetic property, so the conditional obligation does not independently trigger there. |
| **ORC-012** | **Applies. This record supplies all outcomes plus historical/current source, configuration and execution identities.** Every other requirement is assessed here, including conditional non-applicability. The closure matrix below names contract × history × path × observation, neighboring witnesses and rejected wrong designs. Separate 17 input-path manifests identify pre-R4 and current post-R4/latest-main cuts. R4 before/after identities, current registered results, exact shipping Worker and ordinary receiving checks, browser receiving and replay results are recorded below. |
| **ORC-013** | **Applies. Boundary witnesses are explicit.** Numeric histories contain NaN/infinities/negative/fraction/unsafe bounds, safe MAX_SAFE_INTEGER, sum overflow, omitted bounds and zero demand. Pre-abortion wins over zero/invalid demand. Cache histories exercise 499/500/501 and 999/1000/1001, plus touches before insertion; first-revisited-key load/validator distinguishes a threshold displaced by one. Server 304 status alone cannot reveal stamp eviction, so the check separately observes handler load. Queued/inflight, first/continuation and final/live-peer schedules distinguish incorrect cancellation consequences. R1 retains strict reinstall refresh while accepting either shortcut choice. |
| **ORC-014** | **Applies when claims cross providers. Scoped handoff documented below.** The component oracle controls HTTP bytes, page cursors, transport gates, operation counters and immediate scheduling. Worker receiving tests supply actual mounted auth, D1 writers, permissions and REST/batch routes. Browser checks supply actual Studio consumers. These witnesses do not prove all remote servers, deployed isolates, all database writers, WebKit or physical devices. Such cross-boundary claims remain outside these component limits rather than being inferred from a mock. |
| **ORC-015** | **Applies. Required reach repaired and all current integrated counts captured below.** All 25 generated properties now have states and constructed histories; the one enumerated property remains unchanged. There are 119 declared states and 90 constructions, including the six original constructions. The per-property state map is in `reach.md` for incorporation. Fixed examples remain regressions and were not relabeled as reach. The prior baseline correctly rejected an unattained `later-smaller-source` state: actual reuse keeps the old closure. Its replacement observes that old larger closure actually serving a later continuation. The canonical integrated counts below have identical histograms in the current post-R4/latest-main run; the declarations are preserved. |
| **ORC-016** | **Applies. Configured ESLint and its positive control pass at the integrated cut.** The file contains only registered law campaigns, their histories, fixtures and controls. Fixed regressions have no separate expected answers and run through the same model/driver/check. No ordinary `test`, `it`, `describe`, standalone concrete type test or unregistered property runner exists. Type annotations on fixed histories constrain their input shape, not product behavior. |

## Grammar reconstruction, ablation, range and exclusion

The table records constructor-level exclusions. An invalid *window or wire response* is often a deliberately legal **call history**; those cases must remain generated so production rejection is checked. Exclusion therefore names an impossible scenario input or a history outside the declared finite scope, rather than removing product-invalid inputs from a rejection law.

Default `fc.integer()` ranges over signed 32-bit integers; default `fc.nat()` ranges from zero through 2^31−1. Bounded calls below keep their explicit original ranges. `fc.double()` deliberately includes nonfinite and fractional values. Boolean axes range over both values. Every property keeps its original fixed seed and random campaign.

| Property / grammar | Reconstruction and semantic ablation | Range and nearby exclusion |
|---|---|---|
| `sdk-conditional-pairs` | `valid-invalid-revalidate` reconstructs warm → revalidate → invalid response after write → retained-pair read. Removing value changes hides freshness; removing context hides credential isolation; removing invalid removes validation fidelity; removing write removes the boundary. | 2–12 actions, value 0–10000, two contexts, invalid/write booleans. A one-action history, value 10001 or a nonboolean context is excluded. The four-action construction wraps 10000 to 0. |
| `conditional-page-refresh` | before=1/after=2 reconstructs old/current pages. Equality is the unchanged neighbor. Removing either value prevents distinguishing a stale prefix from the current generation. | Two signed 32-bit integers. Fractional values are outside this grammar, not the more general cursor contract. |
| `conditional-batch` | first=1/second=2 reconstructs separate child validators; equality is the neighbor. Removing independent positions permits copying one child's validator onto its peer. | Two natural numbers, two actual child requests. Negative validators or a third history field interpreted as a third child are excluded. |
| `private-resource-validators` | first=1/second=2 reconstructs 200 → unchanged 304 → changed 200. Equal inputs retain 304. Removing equality/inequality loses exact-validator distinction. | Two natural numbers. A nonnumeric resource value is excluded here; wire damage has a separate grammar. |
| `conditional-read-races` | Existing constructions reconstruct cancellation at fetch, write during body consumption, tagged/untagged peers and newer confirmation. Stage selects an actual withheld await; action selects ownership/freshness transition; notModified tests warm 304; peerMode distinguishes tag availability. Some axes are deliberately inactive in unrelated branches. | Value 0–10000; stage fetch/body; action cancel/write/peer; peer mode etag/untagged/not-modified; warm flag. A headers-only stage or fourth transition is excluded. |
| `conditional-failures` | Every fault is served under warm and cold fixed regressions; constructed conditional faults plus a cold fault establish premises. Removing warm hides retained pairs; removing each damage/error kind hides that rejection/recovery rule. | Value 0–10000; eight fault kinds: valid, untagged, invalid-json, invalid-schema, unavailable, mismatch, orphan, orphan-twice; warm boolean. A third orphan retry stage is excluded. |
| `batch-contexts-and-failures` | All nineteen contexts retain fixed regressions; count 50 and 100 reconstruct exact envelope edges. Constructions force partition, fallback, outer status failure, wrong child count and thrown failure. Removing count hides chunking; context hides Fetch isolation; failure hides independent error propagation. | Count 1–105, nineteen named context cases, four outcomes. Counts 0/106 and an unknown context tag are excluded. Individual unsupported real requests remain valid scenarios and must pass through. |
| `batch-reader-cancellation` | Four beforeDispatch × all constructions reconstruct queued/inflight and one/final cancellation. Removing timing hides missing early rejection; removing all hides premature physical abort. | Two logical readers, four schedules, natural value. A third-reader cancellation count is outside this grammar. |
| `cursor-reader-cancellation` | First/continuation × final/live-peer constructions reconstruct the old late-publication bug; equivalent object-field order reconstructs shared identity. Removing first changes accepted prefix; peer/allPeers changes lifetime authority; reordered changes native-query identity. | Five booleans/number fields: first, peer, allPeers, reordered, natural value. A third page stage is excluded. allPeers without peer is legal and simply has no extra reader. |
| `cursor-acquisition-isolation` | Prefix/sibling/other-client histories reconstruct independent acquisitions; completed-reader abort checks relinquished authority; first-page neighbor has no accepted prefix. Removing relation hides collateral cancellation; completedReader hides stale membership. | Three relations, first/completed booleans, value 0–1000. An identical active key on the same client is excluded because it would be shared membership, covered separately. |
| `conditional-sdk-passthrough` | Fixed cases reconstruct foreign origin, outside mount, unknown route, authorizations, HEAD, OPTIONS, write, Range and explicit validator. Removing kind hides bypass classification; slash checks base-URL normalization. | Nine kinds × trailing-slash boolean. An additional invented method tag is excluded. A caller's explicit 304 is legal raw output, not an orphan-cache recovery case. |
| `private-validator-boundaries` | Eight constructed cases enter stable, changed, during-load, context, failure, denied, invalid and write boundaries. Each case changes a different prerequisite for skipping content work; dropping one leaves that prerequisite unexamined. | Eight named cases, value 0–10000. A dependency counter rollback or a second simultaneous admission transition is outside this grammar. |
| `cursor-windows-and-failures` | Fixed empty-demand and every fault × revalidate witness remain. Constructions force real continuation, one successful restart, repeated expiry, first/later validation damage and ordinary failure. Removing demand hides unnecessary IO; length/offset/limit hide slicing; fault hides generation/error policy; revalidate distinguishes source refresh. | Length/offset 0–6, limit omitted or 0–6, value 0–1000, eleven faults, revalidate boolean. Negative offsets are excluded here and included in numeric-boundary calls. A third successful generation is excluded. |
| `cursor-expiry-isolation` | First/continuation peer and prefix/sibling neighbors reconstruct restart beside independent active work. Removing peer stage hides where cancellation travels; prefix distinguishes exact removal from broad-prefix removal. | Two peer stages × two key relations, value 0–1000. Same-key shared peer is excluded; it belongs to the failed acquisition and has another law. |
| `late-confirmation-order` | Tagged/headerless older confirmation follows the newest accepted third read, then an intervening body completes. Removing the third read hides rollback in acceptance order; removing header variation hides confirmation without ETag header. | Exactly three overlapping reads, value 0–10000, validator-header boolean. A fourth read's completion is outside this grammar and inside completion permutations. |
| `conditional-eviction-order` | All twelve pressure × confirmation × untagged combinations run. Removing pressure hides lifetime independent of reusable eviction; removing confirmation hides the 304 stale restore; removing tag availability hides supersession without a reusable tag. | Enumerated pressure 499/500/501 × two response kinds × tagged/untagged. Pressure 498/502 is outside this finite enumeration. |
| `cursor-window-boundaries` | Fixed NaN, infinities, negative, fraction, unsafe integer, sum overflow, omitted, signed zero, MAX_SAFE_INTEGER and pre-aborted zero histories remain; constructions force every decision. Removing aborted loses priority; either bound or sum loses its independent legality check. | Offset/limit are omitted or doubles, with abort/revalidate booleans and value 0–1000. A string, BigInt, symbol or object bound is outside this typed numeric law. Invalid numbers remain legal rejection histories. |
| `eligible-pre-aborted-reads` | SDK and batch constructions force already-aborted calls before any transport. Removing the path axis permits one adapter to regress. | Two adapter kinds, object reason carrying value 0–1000. Falsy primitive reasons are outside this original grammar and now covered at the public SDK boundary by the separate SDK-review oracle. |
| `sdk-bounded-retention` | Pressure 499/500/501 × touch fixed cases remain; constructions force settled reads and reinstall at capacity. Removing touch hides refreshed installation order; pressure hides off-by-one retention and completed-pending leaks. | Pressure 499–501, touch boolean, value 0–1000. Active overlapping readers are excluded here and covered by eviction-order. |
| `server-bounded-stamps` | Pressure 999/1000/1001 × none/shortcut/reinstall reconstructs capacity, optional shortcut refresh and mandatory reinstall refresh. Removing the separate load observation hides stamp eviction behind the still-correct exact 304. | Pressure 999–1001, three touch kinds, value 0–1000. A fourth policy tag is excluded. R1 changes allowed judgments, not histories: each actual shortcut may keep or refresh its order, while every load installs within capacity. |
| `cursor-reader-listener-cleanup` | All first/continuation × peer/alone × cancel/complete fixeds remain. Removing page stage hides listener ownership around first-source acquisition; peer hides cleanup before shared transport settles; cancel distinguishes rejection from normal release. | Eight combinations, value 0–1000. A pre-aborted reader is excluded here and covered by boundary grammar. |
| `cursor-reused-source-windows` | Initial size 3, later size 1, length 6 reconstructs the smaller-later-caller case. Four demanded prefixes reconstruct partial, full, smaller and reused-full windows. Removing page-size difference hides source replacement; removing repeated full demand hides lost continuation reuse. | Length 4–8, initial size 2–3, later size 1–3, value 0–1000. Zero-size pages or length 3 is excluded. Later read closures need not run: retained-source reach observes the original closure serving later work. |
| `cursor-validation-before-generation` | NaN with retained validator and Infinity with supplied validator constructions enter all four states; fixed cross product remains. Removing nonfinite kind hides equivalent JSON serialization; callerValidator distinguishes explicit and retained validation. | NaN/Infinity choices × validator supplied/retained. An invalid second page is excluded here and covered by windows-and-failures. |
| `batch-reader-settlement` | Four success/failure × default/injected constructions with two readers/two waves force immediate outcomes, listener cleanup and scheduler progress. Removing waves hides retained previous-batch references; count hides child fanout; defaultTransport hides transport lifetime. | 1–3 readers, 1–3 waves, outcome/transport booleans, value 0–1000. An intentionally withheld network result is excluded because this is the immediate-progress law. |
| `server-interrupted-stamp-installation` | A paused old load resumes after 999/1000/1001 current installations. Removing pause hides unstable metadata; current pressure distinguishes eviction caused solely by obsolete installation. | Pressure 999–1001, value 0–1000, one monotonic dependency advance. Rollback or two old loads are outside this grammar. |
| `conditional-completion-orders` | Oldest-first and younger untagged body before older confirmation fixed histories remain and are constructed. Independent ranks generate every ordering of up to four starts; kinds vary tagged/untagged/confirm. Removing ranks freezes order; removing kinds hides acceptance without tag or body; count exposes nonadjacent overlap. | Count 2–4, four ranks each 0–10 (ties resolve by start index), four response-kind positions, value 0–10000. Count 1/5, negative rank or an unsupported kind is excluded. Unused tuple positions beyond count do not affect the chosen schedule. |

## Bug-class closure cells and receiving premises

These cells identify what the controlled evidence can claim. They do not declare the final new source green.

| Contract × history | Production path × observation | Original/nearby witness and wrong design |
|---|---|---|
| Paired validated data across failure/write | Public generated SDK → conditional transport; returned DTO plus next request's sent validator | `valid-invalid-revalidate`, every warm/cold wire fault; `lose-validator`/`cache-invalid-tag` reject accepting damaged data or tag alone. |
| Freshness across overlap and eviction | `conditionalReadFetch`; settlement values and following validator | Older 200/304 after newer tagged/untagged data, 499/500/501 pressure, oldest-first and nonadjacent completion schedules. Authored older-body and older-confirmation mutants restore stale bytes and are rejected at `evicted` by the existing law. |
| Cancellation belongs to active acquisition | `readCursorWindow` with real QueryClient; before-release reader settlement, signal abort and accepted pages | Last continuation reader vs active peer; first page vs continuation; reordered key fields; completed caller vs new independent acquisition. `late-cache-publication`, `cancel-related-key`, `retains-cancelled-listener` and authored key-order mutation reject the wrong consequence. |
| One current cursor generation with bounded demand | `readCursorWindow`; rows, error identity, first-page counts and invalid cache flag | Zero demand vs positive; expiry once vs repeated; invalid first vs continuation; smaller later caller and validation with equal JSON bytes. `mixed-prefix`, `window-prefix-lost`, `reuses-before-validation` reject wrong rows or acceptance. |
| Transparent batch children, contexts and progress | `createReadBatchFetch`; physical method/envelopes, child ordered statuses/bodies, early settlement and adapter listener inventory | 50 vs 100 children, differing contexts, direct unsupported contexts, before/after dispatch cancellation, multiple waves and immediate failures. `mixed-context`, `cancel-peer`, `ready-work-stalled` distinguish lost context, collateral abort and missed scheduling. |
| Exact private validator after admission | Real REST adapter/operation runner → `conditionalOperation`; status/body/tag, load count, ordinary errors | Unchanged vs changed, during-load dependency advance, denied/invalid/write vs eligible read. `body-on-304`, `permission-bypassed`, `obsolete-stamp-evicts-current` distinguish validator shortcuts from admission/content work. |
| Numeric/abort boundary | Cursor adapter and raw eligible SDK/batch transport; original reason, RangeError and zero transport count | Safe/unsafe integer neighbors, sum overflow, zero demand, already-aborted zero demand, SDK vs batch. `transport-before-validation` and `starts-transport` reject IO preceding admission. Public SDK falsy-reason completeness is supplied separately by `sdk-public-abort-reason`. |
| Bounded retention and cleanup | SDK/server adapters; later validator or handler load plus status | 499/500/501 and 999/1000/1001, install touch vs shortcut touch, settled vs overlapping readers. R1's positive shortcut-refresh policy preserves permitted alternatives; hostile capacity1001 and missing-reinstall-refresh traces must fail at `stamps`. |

Controlled-premise handoffs:

- **Exact DTO/status/tag supplied by peer:** `test/sdk.test.ts` exercises generated SDK calls against the real Worker, including mounted access and HTTP errors; `test/sdk-operations.test.ts` exercises named contract operations. The opt-in component oracle still controls broken/mismatched HTTP peers and cannot infer remote-provider behavior.
- **Generation-bound pages and actual invalidation:** `test/polling-cache.oracle.test.ts`, `test/read-state-clear.test.ts`, `test/background.test.ts`, `test/shelf.test.ts` and browser polling/search/mutation histories supply D1 and Studio consumers. They establish named receiving writes, not completeness of every future write path.
- **Real context/admission/batch policy:** `test/read-batch.test.ts`, `test/rest-permissions.oracle.test.ts`, `test/mount.test.ts`, `test/mcp.oracle.test.ts` supply the real registry, mount and policy runner. Controlled component contexts do not establish OAuth correctness by themselves.
- **Derived bytes without revision change:** the review exposed a genuine missing handoff. `test/derived-validators.oracle.test.ts` now uses actual `settleChangeClass`, `backfillImportedMentions` and `syncImportedMentions`, confirms `change_state` is unchanged, checks detail/history/list/count changes and unchanged neighbors, then compares old/current/repeated validators. Its independent relation is `test-oracles/derived-validators.model.ts`; execution status belongs to the parent's final artifacts.
- **Owner-read sharing and public SDK semantics:** new `owner-reads.oracle.test.ts` and `sdk-review.oracle.test.ts` own their paths. Their execution cannot be credited to the original low-level adapter oracle. The parent records their separate scope and evidence.

## R1 — preserve the approved shortcut-order freedom

The prior server-stamp model always kept a shortcut hit's position. The authority says a shortcut 304 **may** keep its existing order; it also permits refreshing that hit. This was an overly narrow model, not a new product law or a reason to change production.

The revised independent model keeps complete bounded possible installation lists. Every load must install/reinstall at the tail and evict beyond 1000. Each shortcut hit branches to keep or refresh. It deduplicates only identical installation lists and compared answer suffixes, and accepts one complete allowed trace. This prevents accepting separate fields from incompatible choices. Histories, workload bounds, fixed regressions and strict install/boundary comparisons remain.

The relation to the former model is **a weakening confined to an already approved freedom**: every previous keep-order trace remains; newly accepted traces result only from shortcut-order refresh. It is not a grammar narrowing or a contract revision. At a full cache with key 0 oldest, shortcut(0), install(1000), the keep policy must reload 0 and the refresh policy retains 0; both retain at most 1000 stamps. Reinstall(0) is unconditional and must refresh under either policy, so failing that rule is still rejected.

Controls:

- The check requires the deterministic refresh-every-shortcut trace to be accepted for every history before judging actual production. This control uses its own simple deterministic policy; the model enumerates all allowed policies.
- Existing production supplies keep-order behavior. An actual allowed alternate ran through oracle-gaps using temporary authored mutation `matched = previous.etag;` → `matched = previous.etag; stable = before;`; it reinstalls the same stable metadata without invoking the content handler. Run `8b9bc38f58be` passes the conditional oracle's 753 tests and the derived oracle's 21 baseline tests. The alternate changes `stamps` load traces at `shortcut-at-server-capacity` and fixed `1000-shortcut`, and every law still accepts it. The unchanged `work.ratio: 1` does not reject the alternate. This proves acceptance of this concrete allowed implementation; it does not prove all conceivable shortcut policies.
- `retains-1001-stamps` injects a complete too-large-capacity trace at `1000-none` and must fail.
- `reinstall-keeps-old-position` injects a complete wrong-install-order trace at `1000-reinstall` and must fail.
- The original malformed/missing-entry calibration remains.

Common old mutation keys needing preservation include `src/conditional-operation.ts#conditionalOperation:delete-call:cache . delete ( key ) ;` (old M53, rejected at `1000-reinstall`), the eviction `delete-call` (old M60), and the `>`→`>=` threshold key (old M59). The old report contains no pure shortcut-refresh variant that should be relabeled allowed. Old M51 (`if(stable)`→true) also installs `revision: undefined` on shortcuts; that is not the legal alternate and must remain rejected. The completed integrated comparison below preserves424exact common historical kills plus the identified replacement anchor. The actual allowed-alternate outcome above remains accepted, with zero kill credit; both receipts predate R4.

Positive-control reporting limit: oracle-gaps records `src/conditional-operation.ts#authored:refresh-shortcut-control` as `survived` / `not-judged` with one reported gap because observed load traces change. This temporary input was explicitly an **allowed-form positive control**, not a proposed wrong design or an equivalent-mutant exemption. Its key, source mutation, changed histories and approval are retained in `/tmp/blygger-etags-prep-review/shortcut-refresh-control-2/`. Maintainer feedback is needed if the framework requires every changed allowed trace to be rejected: narrowing the law to satisfy that demand would violate the approved contract. The control is outside repository mutant inputs and contributes no claimed mutation kill.

The first invocation with `--only refresh-shortcut-control` selected zero tests: authored selectors need `authored:`. It provides no evidence. The corrected invocation used `--only authored:refresh-shortcut-control`.

The same baseline reports all required reach: first fixed/random campaign units aggregate across all 25 generated properties to 116 required states per campaign type with no aggregate zero. The enumerated property's three states bring the declared total to 119. Counts are retained in `/tmp/blygger-etags-prep-review/shortcut-refresh-reach-counts.json`; unlike the generated-only line, this aggregate includes dedicated constructed units. These counts identify the intermediate positive-control baseline, not the parent's final source snapshot.

## Conditional review’s intermediate finalization plan

This historical plan preceded the completed integrated/current receipts below; it is retained to make the original evidence obligations visible. Current remaining work is listed separately.

1. Incorporate this record into versioned evidence tied to the reviewed source; preserve the old snapshot as historical rather than overwriting its identity.
2. Add final baseline/calibration results, all declared-state counts, common-key mutation comparison and distinct failure classifications. A legal alternate control must be described as accepted alternate behavior, never an unresolved “equivalent mutant.”
3. Add actual SDK/OpenAPI/build/typecheck/UI/Worker/browser results for the final source. Do not reuse the old 499/425 or older browser logs as if they ran after review repairs.
4. Record exact base plus final commit/digests for owned source, oracle, config and authored mutants. Remaining provider limits stay explicit: bounded 2–4 overlap, controlled HTTP peers/counters, local D1 receiving witnesses, tested browsers only.

## Additional receiving scopes and bug families

| Finding / contract × history | Real production path × observation | Repair, neighbors and hostile design |
|---|---|---|
| S1: old completion outlives the write period that installed it | Exported Studio items/itemHistory and hopper/hopperStats live collections → generated SDK write → later reader; physical transport count before the held new response is released, settled rows and registry retention | Clear ownerFlights at write entry and completion. Vary resource, boundary, old-first/new-first, same/distinct key and cancellation. Existing map identity guard protects the newer entry. Exact old invalidation loops are an authored kill; different-context and active-peer schedules pass. Error-attribution expansion checks successful/304 responses preserve prior failure attribution and real failure names the current request without private query strings. |
| C1/C2: a real derived writer changes resource bytes while counters stay equal | Shared `derivedRepresentation(before,after)` model, Node REST adapter and local Worker HTTP/D1 detail/history/list/summary drivers; old/current/repeat tag, status and full conditional-vs-fresh bytes, full unchanged counters and `/items/summary` neighbor | Exclude getItem/listItemVersions/listReading/getReadingSummary from counter-only shortcut. Add/update/clear/equal classification plus backfill/remove/equal mention histories. Four original shortcut authored controls fail at detail-add/history-add/list-backfill/summary-backfill. |
| C3: falsy native abort reason through the public SDK | Real generated getItemSummary → fields/data/throw/unwrap; exact reason identity and zero calls | Supported maintained interceptor preserves eligible aborted reasons. false/0/-0/empty/null/NaN/string/object, active success, network/setup errors and all result modes vary. Original falsy normalization is rejected under `original abort reason`; no generated source edits. |
| C4: native default transport changes after client construction | Real createBlyggerClient/generated getItemSummary; selected default/injected transport and summary each acquisition | Request-time global closure for default; injected dependency stays pinned. Ordinary/conditional, before/after global replacement and explicit credentials preserve neighbors. Original construction-fetch control rejected under `native fetch lifetime`. |
| S4: initial abort repair overrides a passthrough peer's outcome | Real generated writes, unmatched GET, explicit If-None-Match, Range and HEAD; fields/data/throw/unwrap with controlled network object or actual HTTP409, active/aborted and conditional/ordinary | One optional internal onEligible(Request) callback at the existing schema/header gate records original generated Request identity in a WeakSet. Interceptor requires eligibility and abortion; no second eligibility classifier or strong registry. Original broad guard rejected under `passthrough result mode`. No passthrough falsy-normalization policy or promise that a real peer ignores abortion is inferred. |

The receiving Worker matrix reports detail=4, history=4, list=3, summary=3; each classification add/update/clear/unchanged and mention backfill/remove/unchanged transition is entered twice. Its 14 histories are a complete finite enumeration, plus framework reach, determinism and calibration (17 registrations), not generated range. Each history releases D1 fixtures and restores the backfill cursor. Source/status/body normalization removes random item IDs from determinism comparison while retaining the full-byte conditional relation.

The Node derived grammar uses four operation IDs and two signed 32-bit values; per-operation changed and equal constructions plus a stale-304 calibration establish all six declared states. Removing operation loses an unsafe shortcut sibling; removing equality loses its unchanged neighbor. Unknown operation IDs or fractional field values are outside this abstract grammar; the real receiving matrix separately supplies classification/mention values.

Owner grammar controls: resource items/hoppers, write start/finish, old/new completion order, same/distinct context, optional old cancellation, value/key 0..1000. Each axis distinguishes registry identity or a promised public result; the same-key old-first witness and distinct-key/new-first neighbor use the same input-derived model. Unknown resource/boundary tags and a third concurrent write period are outside this finite grammar. Error-attribution grammar varies success/304/HTTP failure/network rejection and method/path; the model derives expected operation/status from inputs. It does not infer collection behavior from a helper extraction.

SDK grammar controls: eight reason kinds, four result modes, active/aborted/network/setup, text up to 24 binary code points and value 0..10000; fetch selection has 2–4 acquisitions, default/injected and before/after replacement axes; construction has missing/empty/relative/absolute URL shapes; unwrap covers success/HTTP400..599/network; opt-in covers automatic and explicit validators. S4 adds five passthrough paths × four modes, HTTP409/network, active/aborted and ordinary/conditional. Every path×mode and each HTTP mode is constructed. Removing each axis hides its corresponding normalization, result-mode, eligibility, lifecycle or dependency boundary. Unknown tags and zero acquisitions are excluded by constructors. Undefined abort reasons invoke native DOMException semantics; symbols/functions/cross-realm host reasons and reconfiguration/per-call transport overrides are not claimed. These are bounds, not permission to dismiss a reachable in-scope survivor.

### Checklist outcomes for additional scopes

The detailed conditional assessment above covers all ORC-001–016. The following applies those same triggers to public SDK, owner and derived/receiving additions; no scope inherits another scope's GREEN merely because they share a baseline.

| Requirement | SDK/public passthrough | Owner and derived receiving |
|---|---|---|
| ORC-001 | Existing approved eligible-abort law and documented result/default/opt-in contract; each property gives authority/limits. | Existing sharing/freshness and correct-validator laws, not rules inferred from current SQL. Local controlled limits explicit. |
| ORC-002 | Input reason/mode/peer/selection determines expected observation; imports run drivers only. | Owner inputs predict counts/current values; pure shared derived value comparison predicts changed status; fresh-byte relation supplies full HTTP refinement. |
| ORC-003 | Prose states public calls, reason/lifetime and passthrough cases before mechanics. | Law blocks, independent model notes, paths and checkpoints are separate. Receiving file renamed and converted to oracle-only registration. |
| ORC-004 | Reconstruction/inverse validation passes in GREEN; semantic ablations/ranges/constructor exclusions recorded above; no claimed executed ablation sweep. | Owner constructions stay in original grammar; derived generated grammar and finite receiving enumeration reconstruct original/nearby cases; no filter narrowing. |
| ORC-005 | Actual generated SDK and unwrap settlement, transport choice, HTTP body/status and construction boundaries. | Exported real collections, controlled transport and generated writes; actual Worker HTTP/D1 real writers supply the formerly missing derived premise. |
| ORC-006 | Bound corruptions plus all three original SDK controls reject under their named law; latest SDK143/143 assertion kills. | Owner old-cleanup and successful-response attribution corruptions; derived stale304 corruption and four real receiving controls. Setup403/timeouts are never kills. |
| ORC-007 | Generated properties retain runs25, fixed20261118 and random lane through oracleProperty. | Owner runs25 and derived runs24 with fixed20261118/random; receiving finite enumeration is outside this generated-property trigger and runs every case. |
| ORC-008 | Models are mostly stateless input functions; retained current default transport has a distinguishing next acquisition. S4 adds production weak identity, no new model lifecycle. | Owner distinguishes old/new sharing period and same/different context; no unnecessary model cache. Derived model is stateless, so model-state trigger does not apply. |
| ORC-009 | Request eligibility, native fetch and result mode use project/API terms; synthetic transport IDs are explained. | Owner registry/write period and derived projection map directly to product boundaries; model-only before/after values are identified. |
| ORC-010 | Original reason identity observed, all work awaited, globals restored; controlled global guard prevents accidental external fallback. | Collection/query clients and controlled gates released; receiving fixture cleanup per history; capture/checkpoint diagnostics remain separate. Actual-judge R4 controls exposed SDK synthetic-checkpoint and polling prefix issues. The checks-only repair passes the repeated167 and expanded200 controls independently of normal successful cleanup; current registered rerun `3b382a68ed73` passes with all 502owned keys retained. |
| ORC-011 | No additional shared semantic model fault was named after actual public path/value/time dimensions; duplicate model not claimed as independent evidence. | C1/C2 shared-counter premise gets genuinely different actual-D1 byte relation. Owner public collection driver supersedes helper-only inference. |
| ORC-012 | This durable record includes current scoped outcomes, latest identities and explicit aggregate pending work. | Same; shared setup, integrated identities and timeout reruns are complete at this cut. Post-R4 integrated, browser, exact shipping Worker and ordinary receiving results pass; documentation corrections are complete and final PR gates remain. |
| ORC-013 | Falsy/truthy, aborted/active/setup/network, raw/throw, default/injected and eligible/passthrough neighbors distinguish wrong rules. | Same/distinct period/key and old-first/new-first distinguish sharing; four derived changed paths plus equal and unrelated neighbors distinguish unsafe shortcuts. |
| ORC-014 | Claims stop at controlled native/custom Fetch and generated SDK boundary. | Owner controlled HTTP premise is not a D1 claim. Derived local real D1 writer witnesses establish only the named receiving paths, not deployed isolates or all future writers. |
| ORC-015 | Every declared state has a construction; all integrated fixed/random counts are below, with no zero aggregate. | Owner six sharing/four attribution states and derived six generated states have constructions; receiving enumerated reach all eleven states as counted above. Integrated generated-state count capture is complete; Worker enumerated counts are also recorded below. |
| ORC-016 | All six SDK property registrations use oracleProperty; fixed regressions share model/driver/check. | Owner/derived/receiving register solely through oracleProperty. Historical ordinary Worker RED is explicitly not claimed as an oracle mutation route. |

## Executed scoped command and runtime diagnostics

Historical resource-limited six-source command (completed with the 43 timeout outcomes stated above):

```sh
node node_modules/@tanstack/oracles/oracle-gaps/index.mjs --package . --source sdk/index.ts,sdk/conditional-reads.ts,src/ui/data.ts,src/ui/read-batch.ts,src/ui/cursor-query.ts,src/conditional-operation.ts --config vitest.etag.config.ts --contexts 64 --seed 20261118 --mutants test-oracles/mutants --pool forks --out /tmp/blygger-etags-prep-review/six-source-scope-final
```

Receiving run2e3e2f0016ae used `--source src/conditional-operation.ts --config vitest.etag-worker.config.ts --env-prefix WORKER_ORACLE --seed 20261118 --contexts 1`, the four `authored:unsafe-...-counter-shortcut` controls copied without alteration to a dedicated temporary mutant directory, and canonical OS temporary output `blygger-derived-receiving-nshzgxmt`. Its config capped Vitest at two workers. Earlier /tmp output was rejected by the bridge's destination guard; default sandbox blocked loopback/log access. Those failures are setup failures, not RED or kills. Local approved escalation enabled workerd only; remote bindings stayed disabled. The bridge validates the capture harness SHA and forwards capture writes to a host service without changing assertions, mutation instrumentation or verdicts. Node resource/idleness/work-ratio classification is unavailable for this I/O-bound Worker runtime.

Two early SDK threads campaigns ended with CLI exit3/write EPIPE after valid baselines; their incomplete totals are not counted. Forks completed the scoped campaigns. An incomplete scope-check attempt escaped its injected fetch; after stopping it, a controlled default-global guard made unexpected fallback a recorded driver error rather than external I/O. No oracle expected result or history was weakened for either harness issue. Zero-selection `--only` attempts are explicitly not evidence.

## Completed integrated pre-R4 proof

The actual shipping wrapper completed:

```sh
node scripts/run-oracle-gaps.ts --runtime studio --source sdk/index.ts,sdk/conditional-reads.ts,src/ui/data.ts,src/ui/read-batch.ts,src/ui/cursor-query.ts,src/conditional-operation.ts --contexts 2 --seed 20261118 --out /tmp/blygger-etags-prep-review/six-source-integrated-contexts2
```

Run `bf10625e6b4a`: conditional753, derived21, owner33, SDK270, migrated cancellation30 and migrated polling51 = **1,158 baseline checks in six files**, stable on both baseline runs. Of2,124 mutation entries, **502 are reproducible registered-law assertion kills, zero gaps/timeouts/crashes**, and1,622 are warnings in functions outside declared ownership. A zero-gap report judges only its owned scope. Mutant phase151.5s. Runtime limits remain test15,000ms, hang10,000ms, first2,000ms and mutant30,000ms; there was no budget/limit increase or test weakening.

The CLI creates actual warm test runners for `--contexts`, so64 contexts exceeded the prep-pr CPU constraint; it was not a history axis. The integrated run uses two. Full semantic-key comparison finds exactly43 common prior data.ts timeout keys, **all43 now killed**, zero missing/unresolved. No production or owner-driver repair was needed. The earlier36395126ed6d report remains a resource-limited intermediate receipt, never43 kills. Exact derived comparisons: `integrated-prior-timeout-comparison.json` and `owner-timeout-common-keys.json` in the scratch evidence directory.

Portable Worker run `1012219111a9` uses `vitest.worker-oracles.config.ts` and shared configure/capture bridge, passes17/17 checks, and kills all four original stale-shortcut controls with zero gaps/crashes/nondeterminism. Exact output: `combined-derived-command.log` and canonical OS temporary output `blygger-worker-gaps-FewbAh`. This supersedes the portability limit of2e3e2f0016ae while preserving its historical results. It is a four-control partial run, not universal Worker mutation coverage.

### Mutation preservation derived from the integrated results

Compared directly with historical `/tmp/blygger-etags-close-gaps/final-built/results.json`:425 prior killed decisions yield **424 exact common semantic keys, all424 still killed, zero regressions**. The sole changed whole-return anchor is conditionalReadFetch's returned async function after onEligible was added; the replacement `sdk/conditional-reads.ts:M12` return-undefined mutation is killed by sdk-conditional-pairs/valid-invalid-revalidate under paired cache entries. Disappeared anchors are not counted as kills. All425 decisions therefore retain rejection evidence (424 exact keys plus that identified new anchor). The exact comparison is `integrated-old425-key-comparison.json`; extraction joins full semantic keys rather than mutation numbers. Other new return mutations are also killed but are not substituted for the identified M12 anchor.

The allowed refresh-shortcut positive control contributes **zero** to502kills. Its earlier `survived/not-judged` report remains the framework reporting limit described above; the approved alternative is neither relabeled wrong nor excluded as an equivalent mutant.

## Completed setup and neighboring checks

- Actual `npm run typecheck` passes the root Worker, UI and native Node oracle programs (`combined-typecheck.log`). The separate native check also passes (`combined-node-typecheck.log`). Real Worker module aliases retain DOM/native Fetch without any shim or type suppression.
- Actual configured `npm run lint:oracles` (`eslint . --max-warnings=0`) and its positive control pass. The38 older polling reports were reconciled; they are no longer open at this cut. Post-R4 lint on the three changed oracle files and Worker/UI/Node typechecks also pass (`orc010-{lint,worker,ui,oracles}.log`).
- Actual shared wrapper above passes. Its `--files` include override and mkdir-before-realpath behavior were repaired and verified. Registry inventory matches35 new Node IDs, four migrated Studio IDs and one Worker receiving ID; both97a4e7a pins and all10 metadata/pointer copies are verified. No source-existence-only CI claim is used.
- Preservation audit passes890 original comparisons (888product+2harness),193 case declarations and301 table rows across29 fixed suites, plus123 feed comparisons. All38 suite implementations and current registries exist. This structural preservation audit is not a semantic-equivalence proof. `combined-migration-audit.log` and `polling-etag-preservation.json` retain the exact mapping. Removal of /changes explicitly supersedes its old401/no-store checks with authenticated404; no compatibility endpoint is restored.
- `npm run sdk:generate`, including OpenAPI generation, generated SDK and full build, passes **after S4** (`combined-sdk-generate.log`). Generated files are produced by the generator, not hand-edited.
- Fifteen ordinary ETag polling integration cases pass (`polling-integration-first.log`). They retain native blob checks, changed/unchanged body work, failed retry, overlapping subsets, mutation refresh, optimistic edit, cancellation and opaque validator/body pairing. Earlier fixture-phase repair retains50/50 source-collection and287/287 UI GREEN. The later complete ordinary UI suite passes302/302 across31files (`combined-ui-final.log`) after R4; ordinary UI checks supply no registered-oracle mutation credit.
- The first30browser results were **all setup failures** because the pinned Chromium executable was missing; no product RED or mutant kill is credited. With pinned Chromium1248 and R5fixture repair, the final selected browser suite passes 30/30 after latest-main integration. Exact command/results are below.

## Historical pre-R4 integrated source identity

Base commit `28b0c8d642a87e5810ad6eabd95c2d1714c53396`, run `bf10625e6b4a`. The source-identity manifest states that these17paths did not change during the run and identifies the exact source **before the new ORC-010/R4 checker repairs**. No final post-R4 source claim is implied. Original manifest: `six-source-integrated-contexts2/source-identity.json`.

| Input path | SHA-256 |
|---|---|
| sdk/index.ts | 2d857e7df83cc87471311971f67c04e5e56e1f565c3c63b94d824746add5b00f |
| sdk/conditional-reads.ts | 96edb26d9dcf5d7a970e85535c0e0461977d0860faaecb1a230d15d99c8db0b8 |
| src/ui/data.ts | 9fc6543b202418e9c20bad1d829bf501cd1d8a5f65e4357154b8764eb32180ac |
| src/ui/read-batch.ts | 6d58e5bee2202be49d39ff66926953835f6a3a4ba9bbfd8f0b011a51dc977e66 |
| src/ui/cursor-query.ts | 3ce39c8dd0197a17614d22192387bdc2aebc6417de53a7e2ca03bf5c20d50729 |
| src/conditional-operation.ts | bb09589298dad93bac1c5bc152859630cc98d373df7e5b2f79caf8541014f9ba |
| test-oracles/conditional-reads.oracle.test.ts | ff21451b80a7580f4220b6e6569dc3ebd109d248cdb9ad9b485d19bed0eeca74 |
| test-oracles/derived-validators.oracle.test.ts | b37a56b0625a623cb6c3dd58b25d11499ed1ccd00a23b88787f58aca3bfe29c5 |
| test-oracles/owner-reads.oracle.test.ts | 03711a90ac337dd0dbced27cfd16ca849d615029b03f47db03e3b81522dfb5b5 |
| test-oracles/sdk-review.oracle.test.ts | 04806dfabad4172c9197a3c67f84ee1d59222b0c14fa23e2e4fc81b0478bdd7d |
| test-ui/polling-cache.oracle.test.ts | 1f3d38eb070b018187c1b8decea70fe9d4cb89bfa1051b8bd48bb3aaee8d39c0 |
| test-ui/cancellation-work.oracle.test.ts | 28948065a5960abfada234e66151769ef690445bce1e9f9aa981e62b73a32fad |
| test-oracles/configure-oracles.ts | c2b3f045d5aeec136bcf7f523c83cea64c022e2d1048d26ba8ac65efbe73f1f9 |
| test-oracles/controlled-transport.ts | 66eb820a98333c1251b335a0d2526c8b1e9901b2243d577a6c6eb3e798f6b1be |
| vitest.oracles.config.ts | 803231201155fc6f4452c1bd197f908db7e5654ded665ebd1098dd6fa6321c7c |
| scripts/run-oracle-gaps.ts | 0c7bc6429ba36e8f77e495a183e00ceebc73fe102453830461e214fba6ec9666 |
| test/oracle-property-registry.ts | 40f7302ebbe10e0d23e91fb8c7a4477060719da492a1065e94578622c975fe60 |

## R4 — actual-checkpoint and partial-prefix fidelity repair

The companion migration's actual-judge challenge applies to all40 registrations across the four new Node files, two migrated UI files and Worker receiving file. The probe transpiles the installed full oracle-property module and invokes actual check/model closures and actual judge/differs; production and registration imports are stubbed. Real withOracleCleanup supplies the later AggregateError. These are synthetic trace classification controls, not production-driver runs, receiving tests or registered mutation kills.

Before evidence `orc010-before.json`:167 bounded controls (56correct prefixes,56wrong prefixes,15full passing controls,15normally completed missing-event controls and representative single-event controls). Both risks were confirmed under ORC-010:

1. Eight checkers returned synthetic verdict checkpoints absent from recorded events: sdk-conditional-pairs(read→reads), conditional-page-refresh(rows→sequence), sdk-passthrough-result-modes(settled→passthrough settlement), sdk-public-abort-reason(settled→SDK settlement), sdk-unwrap-result-kind(unwrapped→unwrapped result), sdk-default-fetch-lifetime(acquired→resource acquisition), sdk-conditional-construction(constructed→client construction), and sdk-conditional-opt-in(reads→resource reads). An already received wrong observation followed by cleanup could lose its law/checkpoint to cleanup.
2. studio-polling-work, studio-polling-values and studio-domain-revision compared final cardinality at a name already emitted by earlier correct events. A correct incomplete prefix followed by cleanup could then be misclassified as a product violation.

All15original normally completed missing-event controls rejected before repair; the other29registrations passed these bounded challenges. The repair changes only checks/comments in three oracle files: compare each received event at its actual checkpoint, then compare any missing tail/cardinality at a distinct unrecorded completeness checkpoint. It uses singleton vectors where an extra undefined observation must remain distinct from an absent expected observation.

After evidence `orc010-after.json` reruns the same167 controls: **zero lost actual mismatches, zero fabricated partial-prefix product violations**. Matching complete/prefix traces retain the exact original cleanup AggregateError; wrong received results retain the violated law and actual checkpoint with cleanup as cause. All15original completed missing-event controls still reject. Expanded `orc010-extended-after.json` runs200 controls across all40 registrations: **every completed missing-event control rejects**, and eight extra-undefined-event controls reject at their actual observed event despite later cleanup. Per-property outcomes follow; counts are classification controls only.

| Property | Matching cleanup/prefix controls | Wrong observed results | Completed missing event |
| --- | ---: | ---: | --- |
| batch-contexts-and-failures | 2 preserved | 1 retained | rejected |
| batch-reader-cancellation | 2 preserved | 1 retained | rejected |
| batch-reader-settlement | 2 preserved | 1 retained | rejected |
| conditional-batch | 2 preserved | 1 retained | rejected |
| conditional-completion-orders | 2 preserved | 1 retained | rejected |
| conditional-eviction-order | 2 preserved | 1 retained | rejected |
| conditional-failures | 2 preserved | 1 retained | rejected |
| conditional-page-refresh | 3 preserved | 3 retained | rejected |
| conditional-read-races | 2 preserved | 1 retained | rejected |
| conditional-sdk-passthrough | 2 preserved | 1 retained | rejected |
| cursor-acquisition-isolation | 2 preserved | 1 retained | rejected |
| cursor-expiry-isolation | 2 preserved | 1 retained | rejected |
| cursor-reader-cancellation | 2 preserved | 1 retained | rejected |
| cursor-reader-listener-cleanup | 2 preserved | 1 retained | rejected |
| cursor-reused-source-windows | 2 preserved | 1 retained | rejected |
| cursor-validation-before-generation | 2 preserved | 1 retained | rejected |
| cursor-window-boundaries | 2 preserved | 1 retained | rejected |
| cursor-windows-and-failures | 2 preserved | 1 retained | rejected |
| derived-resource-validators | 4 preserved | 3 retained | rejected |
| derived-resource-validators-receiving | 6 preserved | 5 retained | rejected |
| eligible-pre-aborted-reads | 2 preserved | 1 retained | rejected |
| late-confirmation-order | 2 preserved | 1 retained | rejected |
| owner-client-error-attribution | 2 preserved | 1 retained | rejected |
| owner-read-period-sharing | 2 preserved | 1 retained | rejected |
| private-resource-validators | 2 preserved | 1 retained | rejected |
| private-validator-boundaries | 2 preserved | 1 retained | rejected |
| sdk-bounded-retention | 2 preserved | 1 retained | rejected |
| sdk-conditional-construction | 2 preserved | 2 retained | rejected |
| sdk-conditional-opt-in | 2 preserved | 2 retained | rejected |
| sdk-conditional-pairs | 3 preserved | 3 retained | rejected |
| sdk-default-fetch-lifetime | 3 preserved | 3 retained | rejected |
| sdk-passthrough-result-modes | 2 preserved | 2 retained | rejected |
| sdk-public-abort-reason | 2 preserved | 2 retained | rejected |
| sdk-unwrap-result-kind | 2 preserved | 2 retained | rejected |
| server-bounded-stamps | 2 preserved | 1 retained | rejected |
| server-interrupted-stamp-installation | 2 preserved | 1 retained | rejected |
| studio-cancellation-work | 2 preserved | 1 retained | rejected |
| studio-domain-revision | 5 preserved | 4 retained | rejected |
| studio-polling-values | 4 preserved | 3 retained | rejected |
| studio-polling-work | 4 preserved | 3 retained | rejected |

`orc010-preservation.json` compares the whole TypeScript AST after removing check properties and comments: all three files are unchanged outside those checks. Laws, authorities, limits, models, grammars, budgets, seeds, fixed histories, calibrations, and reach declarations therefore remain intact. ESLint on the three files, Worker TypeScript, UI TypeScript and native oracle TypeScript all exit zero (`orc010-{lint,worker,ui,oracles}.log`). No heavy campaign was run by this audit.

Exact repair patch SHA-256: `f9f15e39a5c525c15e3425811421244183676e39df1e401e751d6302edd3d02d`. These after hashes identify the checker repair. The separate current integrated proof below establishes the completed registered run; neither receipt replaces the historical pre-R4 identity.

| Changed oracle input | Before SHA-256 | After SHA-256 |
|---|---|---|
| test-oracles/conditional-reads.oracle.test.ts | ff21451b80a7580f4220b6e6569dc3ebd109d248cdb9ad9b485d19bed0eeca74 | 054eb338de43272599a29936f6b737a509da3a4dc88eb3582dac2088cf455953 |
| test-oracles/sdk-review.oracle.test.ts | 04806dfabad4172c9197a3c67f84ee1d59222b0c14fa23e2e4fc81b0478bdd7d | c06d207cf3f9e203fba335669e7b14f4c45d03019d24377b90a101fe6cf578a3 |
| test-ui/polling-cache.oracle.test.ts | 1f3d38eb070b018187c1b8decea70fe9d4cb89bfa1051b8bd48bb3aaee8d39c0 | a88b194dbb3056f3505a857bad341d9ea11d3aa4d3f3dd1f13c3a9ce468bfd55 |

Exact retained artifacts: `orc010-findings.md`, `orc010-actual-judge.mjs`, `orc010-before-source/identity.json`, `orc010-after-report.md`, `orc010-property-outcomes.{json,md}`, `orc010-repair-identity.json`, and `orc010-preservation.{mjs,json}`. Bounded classification repair is complete. Current registered run `3b382a68ed73` passes all 1,158 checks/502 owned mutants and preserves every owned key and native reach histogram; current identities are below. The exact checked-in Worker receiving and six ordinary-file rechecks now pass, as recorded below.

## Current post-R4/latest-main integrated proof

Exact shipping command:

```sh
node scripts/run-oracle-gaps.ts --runtime studio --source sdk/index.ts,sdk/conditional-reads.ts,src/ui/data.ts,src/ui/read-batch.ts,src/ui/cursor-query.ts,src/conditional-operation.ts --contexts 2 --seed 20261118 --out /tmp/blygger-etags-prep-review/six-source-post-r4-latest-main
```

Run `3b382a68ed73`: conditional 753, derived 21, owner 33, SDK 270, cancellation 30 and polling 51 = 1,158 checks in six files, stable on both baselines. All 502 owned/authored entries are reproducible registered-law kills; zero gaps/timeouts/crashes; 1,624 unowned warnings. Total 2,126 mutations = 2,115 enumerated + 11 authored. Mutant phase 143.531s; two contexts and test 15,000/hang 10,000/first 2,000/mutant 30,000ms limits are unchanged. Exact results SHA-256: `5e7cb5724345fece998ed077f2ab5ad04a8a825054552023690dca38fa6681a7`.

Full semantic-key comparison with bf10625e6b4a retains every 502 owned key, all killed, with zero removed/added owned keys. Two additional latest-main sites are unowned warnings. The native reach comparison retains all 471 first property/unit keys with identical histograms; its supplemental rows remain separate from canonical 470 registered-unit extraction below. Files: `post-r4-latest-main-mutant-comparison.json`, `post-r4-latest-main-reach-comparison.json`, `six-source-post-r4-latest-main/{summary.md,results.json,test-output.log}`. No R4 control supplies registered mutation credit, and no allowed-policy positive control supplies a kill or waiver.

Selected real-browser receiving passes 30/30 after latest-main integration, in 1.6 minutes:

```sh
PLAYWRIGHT_BROWSERS_PATH=/tmp/blygger-etags-playwright npx playwright test e2e/opml-import.spec.ts e2e/polling-cache.spec.ts e2e/search.spec.ts e2e/studio-mutations.spec.ts --workers=1
```

Log: `combined-browser-post-r4-latest-main.log`. Ordinary polling integration passes 15/15 after latest-main integration with `npx vitest run --config vitest.ui.config.ts --maxWorkers=1 test-ui/polling-cache-integration.test.ts` (`polling-integration-post-r4-latest-main.log`). Historical polling gate `node --import tsx scripts/verify-polling-cache-mutations.ts` passes 9/9 at intended registered laws, including the corrected real HEAD observation and three transferred ETag controls. Native replays preserve feed property polling-cache/seed20261001/path0:0/unit random seed:generated/law feed settled values/checkpoint feed settled values/history[0], and Studio property studio-polling-work/seed20261001/path2:0/unit random seed:generated/law poll work/checkpoint poll/history[poll,restore,poll]. Reports, exact authored outcomes and replay receipts: `polling-nine-control-evidence/manifest.json`; log `polling-nine-controls-post-r4-latest-main.log`.

### Current source identity and base alignment

Actual HEAD is `0e9bd933e30a13c12b1c9fe5c855477d61e8fd91`. The mixed fast-forward alignment from 28b0c8d changed zero of 864 tracked/untracked file bytes, modes or symlink targets and left the index empty. Receipt: `/var/folders/zy/zxh2j5n97vq2tt8d8q7_1t5r0000gp/T/blygger-etags-base-6r9_w0n6/receipt.json`. The current run already included latest-main file content; alignment introduced no source edits.

Current 17 input identities are captured in `six-source-post-r4-latest-main/source-identity.json`. Six production identities match the execution manifest; the three changed oracle identities match the exact R4 repair. The other thirteen paths retain their pre-R4 identities. This current manifest supersedes the historical manifest for current Node claims. Additional shipping/receiving identities and successful current rechecks follow below.

| Current input path | SHA-256 |
|---|---|
| sdk/index.ts | 2d857e7df83cc87471311971f67c04e5e56e1f565c3c63b94d824746add5b00f |
| sdk/conditional-reads.ts | 96edb26d9dcf5d7a970e85535c0e0461977d0860faaecb1a230d15d99c8db0b8 |
| src/ui/data.ts | 1ea9a59e94fc43ff81c715678627e75578b22385bf3408f1d78e38cd0bfb7234 |
| src/ui/read-batch.ts | 6d58e5bee2202be49d39ff66926953835f6a3a4ba9bbfd8f0b011a51dc977e66 |
| src/ui/cursor-query.ts | 3ce39c8dd0197a17614d22192387bdc2aebc6417de53a7e2ca03bf5c20d50729 |
| src/conditional-operation.ts | bb09589298dad93bac1c5bc152859630cc98d373df7e5b2f79caf8541014f9ba |
| test-oracles/conditional-reads.oracle.test.ts | 054eb338de43272599a29936f6b737a509da3a4dc88eb3582dac2088cf455953 |
| test-oracles/derived-validators.oracle.test.ts | b37a56b0625a623cb6c3dd58b25d11499ed1ccd00a23b88787f58aca3bfe29c5 |
| test-oracles/owner-reads.oracle.test.ts | 03711a90ac337dd0dbced27cfd16ca849d615029b03f47db03e3b81522dfb5b5 |
| test-oracles/sdk-review.oracle.test.ts | c06d207cf3f9e203fba335669e7b14f4c45d03019d24377b90a101fe6cf578a3 |
| test-ui/polling-cache.oracle.test.ts | a88b194dbb3056f3505a857bad341d9ea11d3aa4d3f3dd1f13c3a9ce468bfd55 |
| test-ui/cancellation-work.oracle.test.ts | 28948065a5960abfada234e66151769ef690445bce1e9f9aa981e62b73a32fad |
| test-oracles/configure-oracles.ts | c2b3f045d5aeec136bcf7f523c83cea64c022e2d1048d26ba8ac65efbe73f1f9 |
| test-oracles/controlled-transport.ts | 66eb820a98333c1251b335a0d2526c8b1e9901b2243d577a6c6eb3e798f6b1be |
| vitest.oracles.config.ts | 803231201155fc6f4452c1bd197f908db7e5654ded665ebd1098dd6fa6321c7c |
| scripts/run-oracle-gaps.ts | 0c7bc6429ba36e8f77e495a183e00ceebc73fe102453830461e214fba6ec9666 |
| test/oracle-property-registry.ts | 40f7302ebbe10e0d23e91fb8c7a4477060719da492a1065e94578622c975fe60 |

### R5 — bodyless-response browser waiter fixture

The bounded 60-second diagnostic failed at Playwright response.finished() **after** runFor returned; the clock reached its target 25,444 ticks. The earlier interpretation that runFor never returned is corrected. Timer inventory includes 1,400 TanStack DB idle callbacks, 14 native 15-second polling callbacks and one 5-second cleanup timeout. This is diagnostic fixture evidence, not a product RED.

The fixture advances one native polling interval with fastForward(15000), awaits required GET headers, and awaits finished() only for responses other than 304. Bodyless 304 is judged by status, outgoing validator and visible reconstructed data; all original resource-path/status/validator/no-/changes/fresh-row assertions and 60-second outer deadline remain. A separate native HTTP 304 peer, without app code, resolves browser fetch/text('') while Playwright finished() remains pending before and after text consumption; the consumed-immediately neighbor resolves. Focused desktop/mobile 2/2 and final selected 30/30 pass. Exact evidence: `polling-clock-fixture-evidence.md`, `polling-clock-fixture.patch`, `clock-timer-inventory.{json,log}`, `probe-304-finished-comparison.log`. R5 is fixed-now as a browser fixture issue; it creates no product mutation kill or weakened semantic law.

### Companion migration integration provenance

SIB014 adds exactly 12 owns entries across 11 registrations/nine Worker oracle files, identifying already exercised control sites. Every byte outside those owns arrays is unchanged, including this branch's REST permission inventory; laws/models/histories/checks/mutants are unchanged. Lint on all nine files passes. Receipt and before/after hashes: `sib014-integration/receipt.json`; exact input patch SHA-256 `7f1dc1ee693382088ea47683b5814bdd07708a220ed725ea7cf2d2fe420efaee`. The companion's installed resolver audits all 74 historical controls with zero missing receiving ownership; this static declaration proof is not a receiving kill.

Three zero-byte migration placeholders were removed: e2e/save-oracle.spec.ts, test/api-mount-cutover.test.ts and test/oracle-replay.test.ts. Save receiving histories live in test-browser/save.oracle.test.ts/e2e/save.spec.ts; mount cutover lives in test/api-mount-cutover.oracle.test.ts; replay harness coverage lives in test/campaign-replay.test.ts. No imports point to the removed empty placeholders. The migration document now honestly states 73 of 74 original history patterns retained and the corrected HEAD history/receiving observation. These are companion migration integration edits, separate from ETag feature changes. In particular src/index.ts/src/oauth.ts legacy alias/audience removal belongs to the companion's explicitly approved migration, not the ETag feature delta.

### R6 — exact checked-in Worker receiving gate verified

The old package/CI command supplied all automatic operators to fourteen real-writer histories, while earlier passing receipts externally selected only four original unsafe-shortcut controls. Diagnostic run `0e9ecbb7194e` is nonprovisional: all 17baseline checks pass, but conditional-operation.ts:M58 survives as branch-never-taken. Its exact key is `src/conditional-operation.ts#conditionalOperation:if-false:if ( cache . size > 1000 ) cache . delete ( cache . keys ( ) . next ( ) . value ! ) ;`. This is a receiving-scope/configuration diagnostic, not product RED. The same full key is killed by the full Node gate at server-bounded-stamps/shortcut-at-server-capacity under bounded validator stamps; all 69automatic conditional-operation operators are killed in that gate. Exact comparison: `c5-capacity-scope-comparison.json`.

The checked-in supplementary Worker script now explicitly selects the four real-writer controls below. The primary six-source Node gate remains unsampled/unselected and retains all 69 operators. Check and release fallback both retain the full Studio gate followed by the supplementary Worker gate. Documentation states the split; no production, law, model, history, check or mutant changed for R6.

| Checked-in authored selector | Real Worker receiving witness | Law |
|---|---|---|
| authored:unsafe-getItem-counter-shortcut | detail-add | correct derived validators at receiving boundary |
| authored:unsafe-listItemVersions-counter-shortcut | history-add | correct derived validators at receiving boundary |
| authored:unsafe-listReading-counter-shortcut | list-backfill | correct derived validators at receiving boundary |
| authored:unsafe-getReadingSummary-counter-shortcut | summary-backfill | correct derived validators at receiving boundary |

The exact package script was executed with only runner count and canonical temporary output supplied externally:

```sh
npm run test:oracles:conditional:worker -- --contexts 2 --out /var/folders/zy/zxh2j5n97vq2tt8d8q7_1t5r0000gp/T/blygger-etag-worker-shipping-FTCLgA
```

No external `--only` supplied selection. The two baseline reach reports are identical and retain all eleven declared Worker states: detail=4, history=4, list=3, summary=3, and each classification add/clear/unchanged/update or mention backfill/remove/unchanged state=2. All 17 checks pass on stable repeat traces, all four authored controls are registered-law kills, and the report is nonprovisional with zero gaps/crashes/instability. The deterministic run ID `1012219111a9` also appeared in an older portable run; it is not a newly unique execution identifier. This current execution is identified by exact argv above, current checked-in configuration below, canonical output `blygger-etag-worker-shipping-FTCLgA`, archived output `conditional-worker-post-r4-latest-main-os-temp`, final receipt and exact result hashes.

Current results SHA-256: `dfd6556b5520eb517fc683c09662a62833303da6280ae20694bb497ffcbbf382`. Final receiving receipt `final-receiving-validation.json` SHA-256: `1b8081ca46c8e62575b678fcf1abecece9a6e72b36249d04993919de82935133`. Configuration manifest: `shipping-config-identity.json`.

Six ordinary receiving files also pass 66/66 in 14.67 seconds:

```sh
npx vitest run --maxWorkers=2 test/sdk.test.ts test/sdk-operations.test.ts test/read-batch.test.ts test/read-state-clear.test.ts test/background.test.ts test/shelf.test.ts
```

Log: `ordinary-six-post-r4-latest-main.log`. The final receipt records these test-file hashes and confirms that all six Node-owned production sources retain their `3b382a68ed73` identities. Attempt `45124b70f059` remains a historical capture-403 setup failure from an output directory outside canonical os.tmpdir(), never product RED or 73 gaps. R6 is fixed-now by the diagnosed configuration change plus exact-command receiving execution and unchanged full operator enforcement; no survivor is waived or counted as a kill.

### Current shipping and receiving configuration identity

These hashes supplement the 17 current Node inputs above and identify the exact shipping/receiving execution. Static validation resolves exactly four script selectors to the four checked-in authored IDs, confirms both Check/release Node+Worker gates, and reads all 69automatic conditional-operation kills from the completed full Node report.

| Shipping / receiving input | SHA-256 |
|---|---|
| package.json | d889fcd05db9e6f4174d6967623c3d3f4e2cbd3df897cd309da642450cea5636 |
| .github/workflows/check.yml | f9a2c57aee56a1411607086bdecd679b60231c8ac7987bc8e8a096ce7f3aca8d |
| .github/workflows/release.yml | 413c7c350833007d46d000ed6e712e6a2d172236971f353be9ddcd37729a0e76 |
| docs/testing.md | 5d098edcfd08d3ebf86f6cf6aeefa26aded857041f8b97dd0383d37afc0c9539 |
| scripts/run-oracle-gaps.ts | 0c7bc6429ba36e8f77e495a183e00ceebc73fe102453830461e214fba6ec9666 |
| scripts/oracles-cloudflare.ts | e52810a84b3dc459c8c7b4097e5fb6a0090d872ffa8290b22529be4cb5a549d8 |
| vitest.config.ts | acc1c42de2c1aa5d30d3888ac6cb61f2274f34417e8d4525878972ab38e4acb0 |
| vitest.worker-oracles.config.ts | b67f9b3739aaea78dfee7c7dcdbf04696661e67ae8bda292c88e7d29b0d97b35 |
| test/derived-validators.oracle.test.ts | 029e4b9c3fac013093900ce69a07ebd3219821d49ce268f85fea4d072fe056da |
| src/conditional-operation.ts | bb09589298dad93bac1c5bc152859630cc98d373df7e5b2f79caf8541014f9ba |
| src/read-api.ts | 77283d6a2f2aee27d995a41cf31f5a36ce30fff0e7e3a50211e1dfbbb87e2f88 |
| migrations/0047_tangled_from.sql | f1aa87f1213e40e91e3f14f53783e1d6d1775578d36b789d869206bff08bfd07 |
| e2e/polling-cache.spec.ts | 0e43b9a204d83feaca398c7fae624fdb45fdd11aaf8d0a6840e78f7e5ed2f6c8 |

## Remaining decisions and final PR gates

1. The optional-doc walkthrough is complete. S2/C8 documents the per-operation pending queue and microtask dispatch. S3/C9 documents `no-store` as the default and `private, no-cache` plus ETags for successful resource GETs; nearby wording now names pending resource reads rather than a preflight check. Both corrections were approved. Source comparison and `git diff --check` validate these documentation-only changes; no runtime behavior changed.
2. Preserve the allowed-shortcut positive-control reporting issue without kill credit or a gap waiver; existing approval permits both policies.
3. Finish approved changes, commit/push/PR/CI gates with the parent after review decisions. No deployment is claimed.

Mandatory review evaluation is complete at HEAD `0e9bd933e30a13c12b1c9fe5c855477d61e8fd91`, with the identified uncommitted working content. After both approved documentation corrections, loss accounting: raw 12 = 10 fixed-now + 2 duplicates; siblings 7 = 6 fixed-now + 1 refuted; combined 19 = 16 fixed-now + 2 duplicates + 1 refuted, with no confirmed-open items. C8 and C9 remain the preserved duplicates of S2 and S3. No authorized repair remains open in this evaluated scope.

Current PR readiness remains **unproven** until approved changes are committed/pushed and PR checks verify that pushed head. Review completion, bounded passing evidence and local source identity do not establish that later gate. Current Node/browser, R4 classification, polling controls/replays, exact Worker package and ordinary receiving checks pass.

## Canonical integrated reach counts, preserved in current run

These are derived directly from bf10625e6b4a/test-output.log: keep only the **first output for each property/campaign/unit**, then sum its constructed/fixed/generated unit counts. This removes duplicate baseline and all subsequent mutation output. Extraction retains470unique units,76fixed/random property-campaign aggregates for38generated properties, and one enumerated property. All200generated declared states per campaign type are nonzero; the three enumerated states yield203states across39Node/Studio properties. Worker receiving adds11enumerated states, yielding214states across40registrations. These canonical counts were extracted at the pre-R4 cut; final `3b382a68ed73` has identical counts for every native property/unit histogram. The 471 native first-report keys include supplemental reporting rows; canonical registered-unit extraction retains 470 units. Neither count proves every unbounded schedule.

```json
{
"batch-contexts-and-failures|fixed seed 20261118":{"direct-fallback":7,"exact-envelope-multiple":3,"full-envelope":7,"malformed-envelope":1,"outer-error":1,"separate-context-envelopes":4,"transport-error":4},
"batch-contexts-and-failures|random seed":{"direct-fallback":7,"exact-envelope-multiple":3,"full-envelope":7,"malformed-envelope":1,"outer-error":1,"separate-context-envelopes":4,"transport-error":4},
"batch-reader-cancellation|fixed seed 20261118":{"inflight-active-peer":2,"inflight-final-reader":9,"queued-active-peer":5,"queued-final-reader":3},
"batch-reader-cancellation|random seed":{"inflight-active-peer":2,"inflight-final-reader":9,"queued-active-peer":5,"queued-final-reader":3},
"batch-reader-settlement|fixed seed 20261118":{"failure-default":4,"failure-injected":4,"multiple-readers":12,"multiple-waves":10,"success-default":5,"success-injected":3},
"batch-reader-settlement|random seed":{"failure-default":4,"failure-injected":4,"multiple-readers":12,"multiple-waves":10,"success-default":5,"success-injected":3},
"conditional-batch|fixed seed 20261118":{"bodyless-child-responses":21,"distinct-child-validators":21},
"conditional-batch|random seed":{"bodyless-child-responses":21,"distinct-child-validators":21},
"conditional-completion-orders|fixed seed 20261118":{"confirmation-completion":14,"older-completes-first":29,"overlapping-acquisitions":32,"tagged-completion":29,"untagged-completion":12,"younger-completes-first":13},
"conditional-completion-orders|random seed":{"confirmation-completion":14,"older-completes-first":29,"overlapping-acquisitions":32,"tagged-completion":29,"untagged-completion":12,"younger-completes-first":13},
"conditional-eviction-order|enumerated":{"late-body":6,"late-confirmation":6,"newer-untagged":6},
"conditional-failures|fixed seed 20261118":{"conditional-fault":28,"unconditional-fault":11,"wire-invalid-json":3,"wire-invalid-schema":4,"wire-mismatch":3,"wire-orphan":3,"wire-orphan-twice":5,"wire-unavailable":5,"wire-untagged":10,"wire-valid":6},
"conditional-failures|random seed":{"conditional-fault":28,"unconditional-fault":11,"wire-invalid-json":3,"wire-invalid-schema":4,"wire-mismatch":3,"wire-orphan":3,"wire-orphan-twice":5,"wire-unavailable":5,"wire-untagged":10,"wire-valid":6},
"conditional-page-refresh|fixed seed 20261118":{"changed-first-page":21,"current-continuation":21},
"conditional-page-refresh|random seed":{"changed-first-page":21,"current-continuation":21},
"conditional-read-races|fixed seed 20261118":{"body":10,"cancel":9,"fetch":20,"peer":12,"write":9},
"conditional-read-races|random seed":{"body":10,"cancel":9,"fetch":20,"peer":12,"write":9},
"conditional-sdk-passthrough|fixed seed 20261118":{"caller-validator":5,"non-get-request":7,"range-request":3,"unsupported-target":9},
"conditional-sdk-passthrough|random seed":{"caller-validator":5,"non-get-request":7,"range-request":3,"unsupported-target":9},
"cursor-acquisition-isolation|fixed seed 20261118":{"completed-reader-aborted":13,"continuation-acquisitions":14,"first-page-acquisitions":10,"prefix-acquisitions":3,"separate-clients":12,"sibling-acquisitions":9},
"cursor-acquisition-isolation|random seed":{"completed-reader-aborted":13,"continuation-acquisitions":14,"first-page-acquisitions":10,"prefix-acquisitions":3,"separate-clients":12,"sibling-acquisitions":9},
"cursor-expiry-isolation|fixed seed 20261118":{"prefix-peer":10,"restart-with-continuation-peer":10,"restart-with-first-page-peer":7,"sibling-peer":7},
"cursor-expiry-isolation|random seed":{"prefix-peer":10,"restart-with-continuation-peer":10,"restart-with-first-page-peer":7,"sibling-peer":7},
"cursor-reader-cancellation|fixed seed 20261118":{"continuation-active-peer":7,"continuation-final-reader":4,"first-page-active-peer":4,"first-page-final-reader":5,"reordered-shared-acquisition":5},
"cursor-reader-cancellation|random seed":{"continuation-active-peer":7,"continuation-final-reader":4,"first-page-active-peer":4,"first-page-final-reader":5,"reordered-shared-acquisition":5},
"cursor-reader-listener-cleanup|fixed seed 20261118":{"cancelled-final-reader":2,"cancelled-with-active-peer":5,"completed-reader":9,"settled-continuation-reader":12,"settled-first-page-reader":4},
"cursor-reader-listener-cleanup|random seed":{"cancelled-final-reader":2,"cancelled-with-active-peer":5,"completed-reader":9,"settled-continuation-reader":12,"settled-first-page-reader":4},
"cursor-reused-source-windows|fixed seed 20261118":{"cached-continuation-reuse":13,"partial-first-window":13,"retained-larger-source":8},
"cursor-reused-source-windows|random seed":{"cached-continuation-reuse":13,"partial-first-window":13,"retained-larger-source":8},
"cursor-validation-before-generation|fixed seed 20261118":{"caller-validator":5,"infinity-at-validation":4,"nan-at-validation":8,"retained-validator":7},
"cursor-validation-before-generation|random seed":{"caller-validator":5,"infinity-at-validation":4,"nan-at-validation":8,"retained-validator":7},
"cursor-window-boundaries|fixed seed 20261118":{"empty-valid-window":6,"invalid-limit":2,"invalid-offset":10,"pre-aborted-window":13,"sum-overflow":3,"valid-window-read":2},
"cursor-window-boundaries|random seed":{"empty-valid-window":6,"invalid-limit":2,"invalid-offset":10,"pre-aborted-window":13,"sum-overflow":3,"valid-window-read":2},
"cursor-windows-and-failures|fixed seed 20261118":{"continuation-page":19,"empty-without-read":6,"exhausted-restart":2,"invalid-continuation-page":4,"invalid-first-page":2,"ordinary-error":4,"restarted-generation":6},
"cursor-windows-and-failures|random seed":{"continuation-page":19,"empty-without-read":6,"exhausted-restart":2,"invalid-continuation-page":4,"invalid-first-page":2,"ordinary-error":4,"restarted-generation":6},
"derived-resource-validators-receiving|enumerated":{"classification-add":2,"classification-clear":2,"classification-unchanged":2,"classification-update":2,"detail":4,"history":4,"list":3,"mention-index-backfill":2,"mention-index-remove":2,"mention-index-unchanged":2,"summary":3},
"derived-resource-validators|fixed seed 20261118":{"changed-derived-field":27,"getItem":8,"getReadingSummary":6,"listItemVersions":9,"listReading":6,"unchanged-derived-field":2},
"derived-resource-validators|random seed":{"changed-derived-field":27,"getItem":8,"getReadingSummary":6,"listItemVersions":9,"listReading":6,"unchanged-derived-field":2},
"eligible-pre-aborted-reads|fixed seed 20261118":{"batch-aborted-before-transport":7,"sdk-aborted-before-transport":10},
"eligible-pre-aborted-reads|random seed":{"batch-aborted-before-transport":7,"sdk-aborted-before-transport":10},
"late-confirmation-order|fixed seed 20261118":{"headerless-older-confirmation":18,"intervening-body-after-confirmation":27,"tagged-older-confirmation":9},
"late-confirmation-order|random seed":{"headerless-older-confirmation":18,"intervening-body-after-confirmation":27,"tagged-older-confirmation":9},
"owner-client-error-attribution|fixed seed 20261118":{"confirmed-response":7,"failed-response":12,"not-modified-response":6,"rejected-transport":4},
"owner-client-error-attribution|random seed":{"confirmed-response":7,"failed-response":12,"not-modified-response":6,"rejected-transport":4},
"owner-read-period-sharing|fixed seed 20261118":{"cancelled-old-reader":15,"distinct-owner-context":13,"new-period-overlap":28,"old-collection-read":28,"old-settles-before-peer":16,"settled-owner-registry":28},
"owner-read-period-sharing|random seed":{"cancelled-old-reader":15,"distinct-owner-context":13,"new-period-overlap":28,"old-collection-read":28,"old-settles-before-peer":16,"settled-owner-registry":28},
"private-resource-validators|fixed seed 20261118":{"changed-resource-validator":21,"matching-resource-validator":21},
"private-resource-validators|random seed":{"changed-resource-validator":21,"matching-resource-validator":21},
"private-validator-boundaries|fixed seed 20261118":{"changed-dependencies":6,"denied-admission":2,"failed-handler":4,"interrupted-snapshot":5,"invalid-input":8,"new-access-context":2,"stable-shortcut":5,"write-operation":1},
"private-validator-boundaries|random seed":{"changed-dependencies":6,"denied-admission":2,"failed-handler":4,"interrupted-snapshot":5,"invalid-input":8,"new-access-context":2,"stable-shortcut":5,"write-operation":1},
"sdk-bounded-retention|fixed seed 20261118":{"reinstalled-at-capacity":4,"settled-contexts-499":6,"settled-contexts-500":6,"settled-contexts-501":5},
"sdk-bounded-retention|random seed":{"reinstalled-at-capacity":4,"settled-contexts-499":6,"settled-contexts-500":6,"settled-contexts-501":5},
"sdk-conditional-construction|fixed seed 20261118":{"conditional-absolute-base":4,"conditional-empty-base":5,"conditional-missing-base":4,"conditional-relative-base":7,"ordinary-missing-base":3},
"sdk-conditional-construction|random seed":{"conditional-absolute-base":4,"conditional-empty-base":5,"conditional-missing-base":4,"conditional-relative-base":7,"ordinary-missing-base":3},
"sdk-conditional-opt-in|fixed seed 20261118":{"automatic-validator":17,"explicit-raw-validator":27,"ordinary-read":10},
"sdk-conditional-opt-in|random seed":{"automatic-validator":17,"explicit-raw-validator":27,"ordinary-read":10},
"sdk-conditional-pairs|fixed seed 20261118":{"invalid":30,"revalidated":28},
"sdk-conditional-pairs|random seed":{"invalid":30,"revalidated":28},
"sdk-default-fetch-lifetime|fixed seed 20261118":{"conditional-default":8,"conditional-injected":8,"ordinary-default":6,"ordinary-injected":8,"replaced-after":26,"replaced-before":13,"unchanged-global":29},
"sdk-default-fetch-lifetime|random seed":{"conditional-default":8,"conditional-injected":8,"ordinary-default":6,"ordinary-injected":8,"replaced-after":26,"replaced-before":13,"unchanged-global":29},
"sdk-passthrough-result-modes|fixed seed 20261118":{"aborted-passthrough":45,"active-passthrough":6,"conditional-passthrough":43,"ordinary-passthrough":8,"passthrough:head":6,"passthrough:range":13,"passthrough:unknown-get":8,"passthrough:validator":14,"passthrough:write":10,"peer:http":11,"peer:network":40,"result-mode:data":11,"result-mode:fields":12,"result-mode:throw":10,"result-mode:unwrap":18},
"sdk-passthrough-result-modes|random seed":{"aborted-passthrough":45,"active-passthrough":6,"conditional-passthrough":43,"ordinary-passthrough":8,"passthrough:head":6,"passthrough:range":13,"passthrough:unknown-get":8,"passthrough:validator":14,"passthrough:write":10,"peer:http":11,"peer:network":40,"result-mode:data":11,"result-mode:fields":12,"result-mode:throw":10,"result-mode:unwrap":18},
"sdk-public-abort-reason|fixed seed 20261118":{"active-success":5,"mode:data":10,"mode:fields":14,"mode:throw":13,"mode:unwrap":9,"network-error":5,"pre-aborted":46,"reason:empty":7,"reason:false":8,"reason:nan":4,"reason:negative-zero":5,"reason:null":4,"reason:object":5,"reason:string":7,"reason:zero":6,"setup-error":4},
"sdk-public-abort-reason|random seed":{"active-success":5,"mode:data":10,"mode:fields":14,"mode:throw":13,"mode:unwrap":9,"network-error":5,"pre-aborted":46,"reason:empty":7,"reason:false":8,"reason:nan":4,"reason:negative-zero":5,"reason:null":4,"reason:object":5,"reason:string":7,"reason:zero":6,"setup-error":4},
"sdk-unwrap-result-kind|fixed seed 20261118":{"http-result":13,"network-result":9,"successful-result":6},
"sdk-unwrap-result-kind|random seed":{"http-result":13,"network-result":9,"successful-result":6},
"server-bounded-stamps|fixed seed 20261118":{"loaded-contexts-1000":6,"loaded-contexts-1001":5,"loaded-contexts-999":6,"reinstalled-at-capacity":1,"shortcut-at-capacity":2},
"server-bounded-stamps|random seed":{"loaded-contexts-1000":6,"loaded-contexts-1001":5,"loaded-contexts-999":6,"reinstalled-at-capacity":1,"shortcut-at-capacity":2},
"server-interrupted-stamp-installation|fixed seed 20261118":{"current-stamps-1000":4,"current-stamps-1001":2,"current-stamps-999":6,"obsolete-load-resumed":6},
"server-interrupted-stamp-installation|random seed":{"current-stamps-1000":4,"current-stamps-1001":2,"current-stamps-999":6,"obsolete-load-resumed":6},
"studio-cancellation-work|fixed seed 20261001":{"conditional: after body":12,"conditional: after headers":4,"conditional: before request":6,"conditional: live":8,"cursor: after body":6,"cursor: after headers":7,"cursor: before request":6,"cursor: live":9},
"studio-cancellation-work|random seed":{"conditional: after body":8,"conditional: after headers":6,"conditional: before request":9,"conditional: live":7,"cursor: after body":10,"cursor: after headers":5,"cursor: before request":10,"cursor: live":3},
"studio-domain-revision|fixed seed 20261001":{"empty domains":13,"joined domains":21,"repeated domain":23},
"studio-domain-revision|random seed":{"empty domains":18,"joined domains":19,"repeated domain":20},
"studio-polling-values|fixed seed 20261001":{"evicted":19,"failed retry":7,"restored epoch":18,"unchanged":33},
"studio-polling-values|random seed":{"evicted":18,"failed retry":9,"restored epoch":19,"unchanged":33},
"studio-polling-work|fixed seed 20261001":{"evicted":19,"failed retry":7,"restored epoch":18,"unchanged":33},
"studio-polling-work|random seed":{"evicted":18,"failed retry":9,"restored epoch":19,"unchanged":33}
}
```


## Approved PR preparation and migration separation

On 2026-11-18 Kyle Mathews approved proceeding with changeset and PR preparation.
The feature branch now starts from migration PR #151 at
`55009d591cb8b5929cef0ed54a99d84d149a74fd`. Before moving the branch base, all 860
tracked/nonignored candidate files were archived and hashed. The base move changed
zero file bytes, modes or symlink targets. The migration's final verifier cleanup
and documentation were then retained exactly, without reverting them in this PR.
The historical preservation inventory retains only the explicit ETag replacement
policy delta, without unrelated Unicode serialization changes.

All 17 Node campaign inputs still match run `3b382a68ed73`, including every
owned production source, oracle and runner. The package typecheck command retains
the migration's explicit local TypeScript path. After separation, `npm run
typecheck`, `npm run lint:oracles`, `npm run check:oracle-migration` and `git diff
--check` pass. No product or oracle semantics changed during separation.

This repository has no `.changeset/config.json`, so no Changesets file is created.
The existing client 0.63.0, SDK 0.18.0 and private contract 6.0.0 version changes
remain the release markers. Feedback and the gap-plan scratch file stay local.
Pushed-head CI remains the next gate.


## First pushed-head CI and contract-version fixture repair

GitHub run `44460398533`, feature head `9c0a802`, passes the full six-source
Studio campaign `eb521f2fe8a4`: 1,158 stable checks, 502 owned/authored kills,
zero gaps, 1,624 explicit unowned warnings. Its seed is 20261001. The exact
supplementary Worker gate also passes 17 stable checks and four authored kills.
The next contract gate exposed the migration's stale independent literal
`contractVersion: 5.11.0` at the API capabilities checkpoint. The approved ETag
contract and actual capability/OpenAPI version are 6.0.0. This is a fixture
expectation mismatch, not a new production defect or a credited semantic kill.

The fixture changes only that expected literal to 6.0.0. It retains the exact
version assertion, all mounted/root route and audience observations, histories,
checks and controls. A repository-wide test search found no other stale
5.11.0/0.17.0/0.62.0 expectations. Exact `npm run test:oracles:contracts` then
passes run `1820dc4a3181`: 47 stable checks, all three sampled mutation controls
rejected, zero gaps or nondeterminism. Local output is canonical OS temp child
`blygger-worker-gaps-MmSNqq`. The changed oracle's lint and whitespace checks pass.

The main Check job's overall timeout increases from 25 to 45 minutes. The
measured Studio step takes 15m49s in GitHub, and the existing full Worker oracle
step takes 10m17s on the same runner class in migration run `44460339373`, before
the remaining release and ordinary suites. The previous total allowance cannot
accommodate those existing gates sequentially. Test timeouts, history budgets,
mutation selections and required checks remain unchanged. Release already
allows 75 minutes. All 17 six-source inputs remain identical to the verified
local campaign; these CI repairs change only an independent version literal,
workflow job allowance and this evidence. Final pushed-head CI remains pending.
