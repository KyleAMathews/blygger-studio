# Independent rejected-departure observation review

2026-11-18. NAV-R4, base `28b0c8d642a87e5810ad6eabd95c2d1714c53396` plus the uncommitted fingerprints below. Pinned oracle review skill/checklist/glossary were read in full earlier in this review. Scope: raw evidence, source/design review and the driver-only repair; no reviewer source/model/production edits or browser jobs.

## NAV-R4 raw finding — a departed editor cannot commit a pane

Firefox's additional navigation run passed all 60 baseline checks twice (180.2 s and 181.7 s; 0 nondeterministic checks), then stalled while exercising `navigation-rejected-save-leaves`. Its stream ends `done stopped (SIGTERM)`; no completed mutation report or kill is credited from this interrupted run. The copied raw capture is `build/formatting-oracles/navigation-firefox-final/preserved-before-checkpoint-repair/run-3394-5.jsonl`.

Independent JSONL inspection found 16 rows and no closing row. Three rows failed with exactly `Error: Missing host event: settled save pane commit: draft`, on these registered fixed-seed histories:

- `original-spa-reject-desktop` (38,524 ms).
- `pending-spa-reject-desktop` (50,197 ms).
- `original-spa-reject-mobile` (47,090 ms).

Every failed row has `verdicts: []`. These are host observation failures, not registered semantic law rejections, production defects, or valid kills. The raw rows contain observed-value hashes rather than route/DOM values; they prove the missing pane checkpoint, while the specific departure race below is reconstructed from driver source, mutant behavior and the parent's direct run diagnosis. Do not describe the raw JSONL as if it retained an exact departed-route snapshot.

The old driver checks the editor route once before entering a preview/draft render-control loop. It then invokes a pane control through a locator, waits only for the corresponding `.editor-grid[data-pane]` commit, and rereads the attribute through another locator. The rejected-save-leaves mutant can actually depart after that initial route check and before a later commit/read. Once the editor has gone, the expected pane cannot commit. The driver therefore loses an existing-law violation before its `failed.inEditor === true` comparison can judge it. The same check-then-locator race exists in its later failed source read.

Disposition before repair: **confirmed observation/enforcement gap**. Existing route-retention law is sufficient. No editing policy, independent expected model, input grammar, construction, budget or production change is justified by this finding. Prior Chromium run `df61bd637dee` (60 checks twice, four selected registered law kills) remains valid bounded evidence for its frozen driver/browser; it must not be relabeled as exercising this subsequent driver repair or proving Firefox mutation closure.

## Repair acceptance criteria communicated before edits

Keep the actual tagged departure-save settlement and the existing real-pane render opportunity. Each pane action must observe whether the editor is still present at the action boundary, rather than waiting through a missing locator after route departure. A missing control while the editor remains is still a named host setup failure.

The pane wait must complete for either an actual requested pane commit or an actual editor departure. Capture the observed result at that boundary rather than doing a second auto-waiting locator read that can race departure again. If neither event occurs, preserve the named missing-host-event failure; do not use a timeout as a departure signal or a law kill.

The failed route/source snapshot must likewise tolerate an absent editor without a route-check-then-locator wait. Record actual absence and let the existing model require `inEditor: true`. No test-supplied route, text, error, save result or expected state may enter the application. The model, law and generated histories remain byte-identical. The parent owns current-source baseline/repeat and mutant execution after source rereview.

## Pre-repair fingerprints

```text
589945f96f6fc32e1fbe36fdcf5cac0ae1aa6e5073e742cdd0e32661a870c921 test-ui/editor-oracles/navigation-driver-oracle.ts
568b1ecd150459fc7aa384f50edfeb19489f2ee402130f9ef05bcfdc85d0d2c4 test-ui/editor-oracles/navigation-model-oracle.ts
1f84b4f36ef00f56f3b782736442fa04e0900905c03d6aeba9c190b99111ba43 test-ui/editor-navigation.oracle.test.ts
863d35404d85e06f3c093f46cc1a6c73b369ea49c22fd00ac4fc954af47d8bc6 src/ui/authoring.tsx
f7cff614c036faf12a8f86cb1ae838b0c7280f3ee0c3850a285cc6e1b191247d navigation-firefox-final/preserved-before-checkpoint-repair/run-3394-5.jsonl
```

## NAV-R4 repaired-driver source rereview

Disposition: **accepted in source at driver hash `82bf6662cb2ecd74805c7a70683af80cd091e816ecc068cf118910a28ccb45e4`; current-source runtime evidence pending with the parent**. No additional source blocker found for the demonstrated rejected-departure observation race.

The final patch makes `editorSnapshot` read actual pathname and textarea source in one browser evaluation. A matching route without the editor input is reported as missing editor; it is not supplied text or treated as successful retention. Blocked, failed and final-departure observations reuse that atomic snapshot, avoiding the old route-check-then-`inputValue` gap.

Each diagnostic pane action checks actual pathname/editor presence and invokes the actual pane button handler inside one browser task. Actual departure ends that render round trip. An editor that still exists but lacks the expected pane control instead raises a named missing-host-control error. The subsequent single wait returns either the requested actual `.editor-grid[data-pane]` value or actual route/editor absence. If neither is received, the existing host-event bound still raises a missing-event failure. The returned object is read through `handle.jsonValue` and the handle is disposed in `finally`; the driver does not perform another locator read after commit. A falsy handle receipt is explicitly a named host failure, not inferred departure. Only a real `kind: departed` receipt ends the loop.

The failed observation still reads the actual public alert and server source and records actual route/text through `editorSnapshot`. The expected model continues requiring `inEditor: true`; a departed/absent editor therefore reaches that same behavioral judgment. Retry setup also atomically checks the real editor and invokes its real compose link handler; a departed editor no longer creates an auto-wait for a link it cannot own. A retained editor without the link remains a named host failure. No UI error, source, route, promise result or expected state is injected. Original departure-save promise preservation and side-observer tagging remain unchanged.

The source still distinguishes these boundaries: actual save settlement, real receiving pane commit or departure, public failure snapshot, actual retry attempt and final departure. Host errors and missing events remain errors. The patch does not declare them law kills. It changes neither the independent law/model nor constructions, random grammar, seed, budget, calibrations, expected observation shapes or production. It creates no expected-answer helper shared with the application. This is an observation repair under the adopted failure/retention law, not a new modeled editor state.

Independent rereview inspected the final source after the implementer's TypeScript-literal adjustment and after the requested host-receipt tightening. `git diff --check` passed. The implementer reports UI TypeScript validation; this reviewer did not duplicate that compile or start any browser run. Model/property/production fingerprints remain byte-identical to the pre-repair values above. Registered current-source baseline/repeat and the rejected-save-leaves challenge still need execution receipts before NAV-R4 can be marked closed at runtime.

### Checklist disposition for this observation repair

| Requirement | Source-review outcome |
| --- | --- |
| ORC-001 | Existing route/source/failure law retained; no new policy inferred from the Firefox timeout. |
| ORC-002 | Actual route/DOM/host receipts flow only to observations; model remains independent. |
| ORC-003 | Atomic snapshot, real action, receiving wait and law judgment boundaries are explicit. |
| ORC-004 | Grammar, constructions, neighboring generated domain and budget unchanged. |
| ORC-005 | Source path reaches the actual editor/controls; current-source registered runtime receipt pending. |
| ORC-006 | Old missing-event rows remain nonkills; new intended behavioral challenge receipt pending. |
| ORC-007 | Prior Chromium evidence preserved for its old driver; new-driver repeat/browser execution pending. |
| ORC-008 | No expected model state or transition changed; formal-model expansion not triggered. |
| ORC-009 | Received event/route/source distinct from expected route-retention state. |
| ORC-010 | Missing controls/receipts remain named host failures; returned browser handles disposed. |
| ORC-011 | Source diagnosis explains the lost race; no production/model common semantic helper added. |
| ORC-012 | Interrupted raw capture, its empty verdicts, exact hashes and pending runtime status preserved. |
| ORC-013 | Raw failing histories remain bounded concrete constructions; exact departed DOM not invented from hashes. |
| ORC-014 | Real pane handlers/render commits remain explicit; departure is now an alternate actual observation. |
| ORC-015 | No states or histories dropped to avoid the race; old driver receipt is not credited to new source. |
| ORC-016 | No ordinary tests inserted; source-only review does not stand in for a registered oracle run. |

### Repaired-source fingerprints

```text
82bf6662cb2ecd74805c7a70683af80cd091e816ecc068cf118910a28ccb45e4 test-ui/editor-oracles/navigation-driver-oracle.ts
568b1ecd150459fc7aa384f50edfeb19489f2ee402130f9ef05bcfdc85d0d2c4 test-ui/editor-oracles/navigation-model-oracle.ts
1f84b4f36ef00f56f3b782736442fa04e0900905c03d6aeba9c190b99111ba43 test-ui/editor-navigation.oracle.test.ts
863d35404d85e06f3c093f46cc1a6c73b369ea49c22fd00ac4fc954af47d8bc6 src/ui/authoring.tsx
```

## NAV-R4 Chromium execution acceptance

The completed parent-launched Chromium campaign in
`build/formatting-oracles/navigation-chromium-race-receiving/`, run
`a79d23d13b9a`, supplies registered receiving evidence for the reviewed
`82bf6662…` driver. This execution audit examined the retained manifests,
results, summary, stream and reach log without starting another job or changing
runtime sources. The navigation implementer performed this evidence audit;
the repaired-source acceptance above remains the independent transport review.

The report is complete and nonprovisional. All 60 registered checks pass with
no skipped checks, and the unmutated repeat takes 150.2 s and 154.3 s with
0 nondeterministic checks. The original fixed-seed and random-campaign paths,
constructions, reach, calibration and determinism registrations remain enabled.
The gap report selects four authored challenges, all rejected by the
registered `formatted editor departure` law on fixed-seed routes:

| Authored challenge | First rejecting history |
| --- | --- |
| `navigation-dirty-false` | `original-stay-desktop` |
| `navigation-premature-spa` | `original-spa-desktop` |
| `navigation-rejected-save-leaves` | `original-spa-reject-desktop` |
| `original-undefined-action-error` | `pending-spa-reject-desktop` |

The report classifies all four as `killed`; none is a production crash, host
failure, timeout, unreached path or survivor. In particular, the actual
rejected-save-leaves design that previously lost the receiving pane checkpoint
now reaches a registered law rejection. The retained result names the law and
history, but does not retain the exact failed checkpoint object, source text or
route payload for each mutant. Those values are not reconstructed from
observation hashes. This acceptance therefore claims the registered semantic
rejection and preserved clean receiving behavior, not an exact raw
`failed.inEditor` payload that is no longer retained.

The first clean baseline's reach log contains 16 constructed-history units and
one 25-history generated unit in each campaign. Summing those public reach
receipts gives the following counts; fixed and random campaigns have the same
counts because this gap run supplies replay seed 20261118:

| Declared state | Fixed campaign | Random campaign |
| --- | ---: | ---: |
| desktop | 22 | 22 |
| mobile | 19 | 19 |
| original | 20 | 20 |
| pending | 21 | 21 |
| stay | 12 | 12 |
| leave | 12 | 12 |
| spa | 7 | 7 |
| spa-reject | 10 | 10 |
| rejectedDeparture | 10 | 10 |
| retryAfterSaveFailure | 10 | 10 |
| sameTextButDirty | 20 | 20 |
| uncommittedLatestSave | 21 | 21 |

### Source identity and concurrent unrelated edits

The input and output manifests each inventory 399 paths, recorded at
2026-11-19T06:46:56.439752Z and 2026-11-19T06:52:57.439919Z. They name base
commit `28b0c8d642a87e5810ad6eabd95c2d1714c53396`, Node v24.19.0 and oracle pin
`97a4e7a`. Exact comparison finds 397 byte-identical entries and two changed
entries:

```text
test-ui/editor-oracles/receiver-driver-oracle.ts
  before 9a7bafefc10901ca6180d8da641c404ec5b024d52d6453c11e8dfba626985e5f
  after  a652e6ca7115accdb0423a5973216991f29d21e228a5de3cf64cc0a184455f7a
test-ui/editor-receivers.oracle.test.ts
  before fa438cf746addd4b2c39f018cdea888978cbcb6f0302c143a88e687e25cdf1dd
  after  0390009bb54656470ec136a7b7e7149b300734f329e23731f7505cefde3d151d
```

These were unrelated receiving-oracle edits during the campaign, so the entire
worktree is not described as unchanged. Source inspection of the selected
navigation registration and its imported model/driver/shared host, plus the
selected-file Vitest configuration, finds neither changed receiver file in
that execution's imports. All production paths, shared browser transport,
application builder, runner/configuration, navigation property/model/driver
and the four selected authored challenges have identical input/output hashes.
They also match the inspected files at this execution audit. In particular:

```text
82bf6662cb2ecd74805c7a70683af80cd091e816ecc068cf118910a28ccb45e4 navigation-driver-oracle.ts
568b1ecd150459fc7aa384f50edfeb19489f2ee402130f9ef05bcfdc85d0d2c4 navigation-model-oracle.ts
1f84b4f36ef00f56f3b782736442fa04e0900905c03d6aeba9c190b99111ba43 editor-navigation.oracle.test.ts
863d35404d85e06f3c093f46cc1a6c73b369ea49c22fd00ac4fc954af47d8bc6 src/ui/authoring.tsx
cc3ee87d1e7233a77ae1a8ca5c395455efe5e1a65b9b209b1166e7d990d054ae src/ui/draft.ts
c4a34e5d1faa4c94df876f45577e3f173fc83267a4851c078f523406d5ccc967 src/ui/format-shortcuts.ts
```

Retained evidence SHA-256, relative to this run's output directory:

```text
d51cef7bc8644218ddc066bafa9a860ec57e00fd2ee08f91e0a084cd72c92eaf input-manifest.json
28a1a180db0fae30650963309bce272a518248267c41e6db4b15b22247e06051 output-manifest.json
919e2b97991b07b468dfccdd2d1092220dea5661dac760b07f7ccc9479b3b832 results.json
87b50ffe05845e6bd2a722e02b33449889bca1050ab9cce743b4f98fc11b8ee2 summary.md
aed124e9fa829c48698ad8521ad1cbf609100ef19fa9e7c05055e82ad3f02db8 stream.log
cc9faa6a7f176a33f9b5acd47da580bfe9b386304193ae321ecf7ffecbe77002 test-output.log
```

### Bounded verdict

NAV-R4 is accepted for the selected Chromium receiving campaign at the exact
reviewed source fingerprints. Its old missing-pane observation failure is not
credited as a kill; the new actual wrong-departure challenge is. Existing
still-editor settlement/render-control and real retry neighbors also pass.
The report's 0 gaps applies only to the four selected authored challenges;
it does not establish full operator closure for all owned Editor/useAction
code. No broader production change, law change, input-domain reduction or
budget reduction was needed for this driver repair.

This supplies the previously pending Chromium runtime portions of
ORC-005/006/007/012/013/014/015/016 while preserving the source dispositions
above. It does not retire other-contract gaps or turn source acceptance into
a general cross-browser claim. Firefox's separately running receiving campaign
remains unassessed here; its old interrupted record remains incomplete, with
empty-verdict host failures and no kill credit.

## NAV-R4 Firefox execution acceptance and browser identity

The parent subsequently completed the separate Firefox receiving campaign in
`build/formatting-oracles/navigation-firefox-race-receiving/`. Its retained
stream ends `done completed`; the result is nonprovisional, with all 60 checks
passing, no skipped checks, repeated clean durations 189.7 s and 198.4 s, and
0 nondeterministic checks. The four selected authored challenges are all
registered `formatted editor departure` kills on the same fixed-seed histories
listed for Chromium, including `navigation-rejected-save-leaves` on
`original-spa-reject-desktop` and the original undefined-error defect on
`pending-spa-reject-desktop`. The mutation phase totals 54.7 s. No selected
result is a host failure, timeout, crash, unreached path or survivor.

Firefox's input/output inventories each contain 399 paths, recorded at
2026-11-19T06:46:56.786240Z and 2026-11-19T06:54:44.678168Z. Exact comparison
finds the same two unrelated receiver-file changes listed above and no other
changes. The navigation driver remains the independently reviewed
`82bf6662cb2ecd74805c7a70683af80cd091e816ecc068cf118910a28ccb45e4` in both
inventories. Navigation property/model, all production entries, shared host and
transport, runner/configuration and the four selected mutants match both
inventories and the source accepted above. The first-baseline reach counts
match the Chromium table; the retained reach logs are byte-identical because
the plans and replay seed are the same. That equality is not used to invent
any unretained browser DOM or failed checkpoint payload.

Both reports use framework run ID `a79d23d13b9a`, despite separate parent
Chromium/Firefox launches and distinct report paths. That ID alone is therefore
insufficient evidence of browser identity. The input manifest labels
`chromium-navigation-race-repair` and `firefox-navigation-race-repair`, the
parent's separate browser invocations, output paths and hashes distinguish the
receiving evidence. Each completed report records `reused:0`, `computed:6`;
these are fresh computations rather than a claim that one browser's report
was accepted from the other's cached evidence. No inference about an exact
browser binary version follows from a shared framework run ID.

Firefox evidence SHA-256, relative to its own output directory:

```text
226076b35f560840cf8abc8671a81d4854bc2fa71df2a1c3e346c2421984e5d5 input-manifest.json
2e7ae8f1203a54767909e71d6be934a8c32a5c97606cb12de08ff7b1fe257bf4 output-manifest.json
1cbc31da50f85fcb52bfe3ffdbc5e8c05a26ce5dd57daf9acf6d0faa36498dc8 results.json
87b50ffe05845e6bd2a722e02b33449889bca1050ab9cce743b4f98fc11b8ee2 summary.md
57b4064abc0fbb99c782c8e6b4f7f3a3e55ee70a86f797acfd4d7a1dac4396a9 stream.log
cc9faa6a7f176a33f9b5acd47da580bfe9b386304193ae321ecf7ffecbe77002 test-output.log
```

NAV-R4's demonstrated receiving observation gap is now accepted for the exact
reviewed driver in both Chromium and Firefox: the clean settlement/render/retry
neighbors pass and the actual wrong-departure challenge reaches a registered
semantic rejection. The original interrupted Firefox campaign retains its
historical setup-failure/nonkill status. These four-challenge partial reports
are not full operator closure for Editor/useAction, and they do not supply
WebKit evidence for this particular revised driver. Source stayed frozen;
this evidence audit changed this document only and launched no browser jobs.
