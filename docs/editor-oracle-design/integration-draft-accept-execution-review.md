# Draft.accept M3 — bounded execution review

Reviewer `/root/review_completed_link_oracles`, 2026-11-19. **Run
`262887d5bbbf` supplies an accepted registered semantic rejection of the exact
M3 mutation on its completed prior integration snapshot.** Both full receiver
baselines pass, the original 52 replacement constructions and four additions
are retained, and the new pre-edit source-consumption checkpoint rejects M3.
This does not accept the later current tree or establish a complete gap sweep.

This review reads completed artifacts and source only. No oracle/product module
was executed, browser/job launched, runtime input edited or reference process
interrupted. The review skill, checklist v1 and glossary inform the assessment;
source/design authority remains `draft-accept-proposal-review.md` and
`integration-draft-accept-rebase.md`. Original DAP-001/DAP-002 findings and their
accepted source repairs remain there; this record adds bounded execution evidence.

## Run and source identity

Integration HEAD is `2d153071e83261e62be5a1ec926c3f1f3e2fe26a`, with
uncommitted oracle/integration changes. The result's run ID, exact artifacts and
source snapshots define this evidence; HEAD alone does not identify a dirty tree.

Run directory:
`build/formatting-oracles/main-integration-draft-accept/`.
The report selects only `ui/draft.ts:M3`, source `src/ui/draft.ts`, one receiver
oracle file, contexts 1, pool threads and seed `20261118`. It is explicitly a
partial run. The 75 authored mutants named in discovery are not 75 executed
mutants: the result contains exactly one operator mutant and no authored result.
`provisional` is false, `excluded` and `nondeterministic` are empty, and evidence
records four computed units, zero reused units and zero cuts/budget exits.

| Bound artifact | SHA-256 |
| --- | --- |
| `results.json` | `718e616fc16726b0d6dd4e8c4f75bc999c1a38c2a85cc4455995fc2c009ef73f` |
| `test-output.log` | `e961204f8ac86a5fdb1195f82b8329594d51d75437beeee72d3809cad162e55d` |
| preserved `run-15203-1.jsonl` | `405e01f586b7ed6ead56ec7a3ac16fa757af14590b335b1b3e6eb8d2a62bc530` |
| preserved `run-15203-2.jsonl` | `380057b8b2ee95eed5eb705ef34d94ece25728272028ad9f5ecebbf68d1496c8` |
| preserved `run-15203-3.jsonl` | `2a7dfbc0114559d8e316d37c984ea8d9fc83b7a8dccee6ad6b54c1512bc25754` |
| preserved `run-15203-4.jsonl` | `32c0940287f6ebd00f07f1a7e8fcaaedc47c91fd8b84b3025cd28d3060d772da` |
| preserved `watch-receipts.jsonl` | `b30e04f7fe75abe4e02915b4e2ef9dc1dc80ca3ee022351f664a294a920e6af9` |
| applied `editor-receivers.oracle.test.ts` | `b443b6abbc0f682f9fe43eba5679f7f968a0466407c18232d379fccc92ad9df8` |
| applied `receiver-model-oracle.ts` | `1d4f563fd32c7203da0634d7b717dcf8d98984689e6fbfd0610329d6a5caaf73` |
| applied `receiver-driver-oracle.ts` | `a50f521926a04106045b9fbfea2682d644dd1496b57c7d4a78465ba058ffb088` |
| unmodified `src/ui/draft.ts` | `cc3ee87d1e7233a77ae1a8ca5c395455efe5e1a65b9b209b1166e7d990d054ae` |

The three oracle hashes independently equal the accepted revision-2 patch's
outputs. Its immutable patch SHA-256 remains
`e66899ed091040470bdfd0888d4c0c6a182dfa177074ce2d76b00ee58fd3e3c9`.
No production repair was needed or credited to demonstrate this coverage extension.

Independent audit scratch:
`/private/tmp/blygger-integration-m3-execution-review.tii1oy36/`.
`audit.py` SHA-256 is
`a99e0378c62842d91501f58af2a60cdecd3252a9c3e3269e6a800258ca22f7c9`;
`receipt.json` SHA-256 is
`7af83fe46316640d51be3cbe3d5c917dc921fe78c61813b4e0e70c9f782c2b9c`.
`artifact-sha256.json` binds report/log/state/capture sidecars and scoped source
files; its SHA-256 is
`1849f28dc8c5d653624386f93b30f8cfa93e91f38cf3337ee49a8572657cc3df`.
The script only parses artifacts, hashes files and compares expectations; it
imports no product/oracle code and writes only its unique scratch receipts.

## Independent prediction and observed rejection

The adopted replacement and working-copy save promises predict that successful
restore of arranged `published a`, followed by ordinary Save before another
edit, submits the complete source `published a`. Rejected restore instead saves
the retained working source. This prediction follows from arranged inputs and
outcome; it does not depend on Draft revision arithmetic or actual saved output.

The report's exact mutant is:

```text
id:        ui/draft.ts:M3
function:  Draft.accept
operator:  delete-call
original:  this.edit(text);
replacement: ;
key: src/ui/draft.ts#Draft.accept:delete-call:this . edit ( text ) ;
```

The source contains that call once, at the reported position 266/line 9.
The final mutant state snapshot uses a runner-copy unit whose mutant is 3 and
selection contains 182 receiver tests. The top-level `mutant: null` does not
mean unmutated execution in that multi-unit state; its per-copy unit carries
the mutant. The failing capture records both hit 3 and infected 3.

`run-15203-4.jsonl` retains this registered verdict:

```text
property:   editor-browser-replacement-gates
law:        held replacement formatting gate
checkpoint: acceptedSaveSubmitted
route:      fixed seed
difference: acceptedSaveSubmitted.submitted
test:       fixed seed 20261118: saveThenBold-success-false
```

Its message is `OracleViolation`, not a missing-host, setup, cleanup, crash or
timeout error. The retained shrunk history is desktop, body `a`, successful
restore, no picker, the existing Bold readonly attempt, and continuation
`saveThenBold`. The failing test takes 3,880 ms against a 60,000 ms test timeout.
The report independently credits the same test/law and outcome `killed`;
`randomAlso` is false. No random-mutant rejection is inferred.

The source trace explains exactly what was judged: the driver activates the
real Save button with trusted Enter, intercepts its actual PATCH, and records
the whole `contentMd` source array at `acceptedSaveSubmitted` before releasing
the request. The input-only model expects historical source after success.
The registered check compares `submitted` before its later `followup`
comparison. A subsequent Bold edit can repair Draft's stale source but cannot
rewrite the previously recorded string. The transparent save observer returns
the original promise/result; diagnostic dirty values are not in the expected
comparison. The successful base execution also receives actual response,
original save settlement, pane commit and server read-back before followup.

Under M3, all **52 old fixed-seed immediate-Bold constructions pass**, then the
first added pre-edit Save construction fails at the new source boundary. This
is direct evidence of what the extension adds beyond the original histories.
The mutation run stops after that decisive kill; it does not execute every
remaining save neighbor against M3.

The retained capture stores observation hashes and the verdict/history/message,
not the complete observed trace or raw PATCH body. It therefore establishes the
registered whole-source mismatch without retaining the exact actual submitted
payload for independent inspection. The independently predicted `published a`
is an expected value, not a claim that this review recovered raw actual bytes.

## Baselines, calibration, constructions and reach

Independent parsing finds:

| Capture | Role | Recorded outcomes |
| --- | --- | --- |
| `run-15203-1.jsonl` | first full baseline | 232 pass |
| `run-15203-2.jsonl` | second full baseline | 232 pass |
| `run-15203-3.jsonl` | selected-tail unmutated verification | 182 pass, one skipped unrelated-suite placeholder |
| `run-15203-4.jsonl` | selected M3 execution | 52 pass, one registered failure, one skipped unrelated-suite placeholder |

The complete baselines have identical test keys and corresponding observed
hashes. This agrees with the runner's zero nondeterminism report. Each baseline
contains 142 campaign units and 90 calibration/determinism units. All 13 named
calibrations pass: one bracket, three Escape, and nine replacement calibrations.
The replacement nine preserve all five original calibrations and add the four
accepted source/store/current-result/saved-feedback corruptions. Each of the
56 replacement constructions also has a passing determinism registration.

The old construction set is independently reconstructed as two viewports ×
two restore outcomes × (six keys + five controls + two picker entrances) =
52. Both complete baselines contain each original name exactly once in each
fixed and random-named campaign, plus exactly the four added
`saveThenBold-{success,reject}-{false,true}` constructions. Immediate-Bold
histories remain absent-continuation histories in source. The accepted source
hashes also preserve Unicode `alpha😀` in those arranged constructions and
the prior generated alphabet/range; no comparison trims or projects source.

The 450 reach-log lines align exactly with the 142 + 142 full-baseline campaign
units, 114 selected-tail units and 52 passing M3 units. In each full baseline,
both named campaign sets report all four added constructions entering
`saveBeforeEdit`, `pendingRestore`, the appropriate desktop/mobile state, and
`acceptedSourceSave` or `retainedSourceSave`. Every replacement generated unit
reports 25 held restores and reaches both source-save outcomes and viewports.
These are execution counts, not source-count estimates. Reach requires native
Enter trust/key, actual HTTP completion and inspection delivery; it does not
require correct expected source or feedback before judging them.

The run uses the CLI replay seed `20261118`. The registrations named `random
seed` also report route `fixed seed`, as the framework specifies for a replay
environment seed. Both registrations executed; this is **not fresh unseeded
entropy evidence**. A later unseeded/current-source campaign remains a separate
acceptance item. The declared generated budget 25 and fixed seed were not reduced.

## Capture retention and source-snapshot boundary

All four original live capture paths were hard-linked into
`preserved-live-captures/`. I verified their current inode numbers against the
watcher's recorded hard-link receipts, final sizes against link-time sizes,
complete JSONL parsing, and one closing capture record per file. Each has
state-at-link and state-after-link sidecars. The first capture was linked while
partly written and grew to its complete 232-test close; its preservation did
not freeze an incomplete copy. The watcher recorded `EMFILE` for native watch,
then used its documented 25 ms polling fallback and retained all four captures.
Its stop receipt follows completed results. No runtime capture was edited here.

This is the **prior merged snapshot**, before the later toast repair and sheets
transport. In every closing capture, the sole recorded filesystem-read hash
that differs from disk at review time is `src/ui/sheets.tsx`: recorded SHA-1
`6795d85af0dbfaa4ab8f65c07b229a4c044d5b55`, later disk SHA-1
`d238e4d8560bdd701e266b9fff3bc608d7f7f5ec`. The recorded source exactly equals
that path at integration HEAD `2d153071…`; a scratch copy is preserved as
`recorded-sheets.tsx`, SHA-256
`2ee8677b968a69923a974ad36cb8aa15b5d721e98e5ea0b72388562e157ccdbb`.
The captures contain 110/110/109/109 filesystem-read entries respectively;
all other recorded fs-read values still match when inspected.

The later current `formatting-oracle-application.ts`, `browser-driver-oracle.ts`
and `browser-source-oracle.ts` also differ from the earlier rebase authority's
saved transport snapshot. Their inspected hashes are retained in the audit
manifest, not attributed to run `262887d5bbbf`. The parent confirmed this
sequencing: the M3 run's freeze ended before applying the separately reviewed
toast/transport changes. The original rebase record's claim of no adaptation to
the three-file M3 oracle patch remains true, since those outputs match exactly.
It does not mean all later runtime dependencies are identical.

Runtime bundle/input verification is part of the reviewed transport, and these
captures retain loaded dependencies/read-at fingerprints, but this review does
not recover a standalone full browser bundle or raw observation trace. It makes
no environment-cache, CSS-source correspondence or later transport acceptance
claim from this earlier successful run.

## Checklist v1 execution disposition

| Requirement | Bounded outcome / limit |
| --- | --- |
| ORC-001 | Adopted replacement/source-save authority retained; one restore/save/edit schedule and viewport/body limits remain explicit. No publication or accept-counter promise added. |
| ORC-002 | Expected whole source is independently derived from arranged inputs/outcome; accepted input-only model is unchanged. |
| ORC-003 | The exact accepted registration/model/driver outputs are applied. Prior source review supplies the literate-parts audit; this record adds execution checkpoints. |
| ORC-004 | All 52 original and four added constructions pass both complete baselines; optional continuation preserves old source grammar. Identical old random draws are not claimed. |
| ORC-005 | Registered real receiving/source-consumption rejection is retained at the intended checkpoint; baseline HTTP/settlement/read-back prerequisites have measured reach. Raw actual payload is not persisted. |
| ORC-006 | All old/new calibrations pass; the exact intended delete-call mutation is rejected by a registered law on a reproducible route. It is not setup/timeout/crash credit. |
| ORC-007 | Fixed/random-named units and direct replay registration pass at existing budget under replay seed 20261118; fresh unseeded/current-source execution is not established here. |
| ORC-008 | Prior accepted model minimality remains: pre-edit consumption distinguishes stale Draft state from correct displayed text without new revision-machine state. |
| ORC-009 | Submitted source, stored source, UI feedback, component result and diagnostic dirty values remain separate. |
| ORC-010 | Normal successful/semantic-failure runs close and retain captures; no cleanup failure replaces the law violation. Fault/host-failure cleanup schedules were not executed by this run. |
| ORC-011 | Request whole-source and independent server GET comparisons both pass on baseline; the M3 witness specifically credits the earlier submission comparison. |
| ORC-012 | Exact report/capture/source identities, original source authority, execution counts and later-tree limit are versioned here. No full current-source closure claimed. |
| ORC-013 | Historical/working distinction rejects M3 before another edit can repair it; original immediate-edit neighbors still pass under M3, while successful/rejected Unicode × viewport save neighbors pass baseline. |
| ORC-014 | Real native/HTTP/component/pane/read-back delivery is established for the bounded baseline histories; controlled rejection remains declared. Other hosts and later transport need separate evidence. |
| ORC-015 | Required old/new constructed names and actual save reach are verified from execution logs; sampled generated counts are reported without broader exhaustiveness claims. |
| ORC-016 | Applied three-file patch remains registered-law-only; no ordinary unit test was added or credited as a kill. |

No new generated property, law or model revision is proposed by this artifact
review, so source-design obligations are carried by the named accepted reviews
rather than waived. **Accept this run as the exact M3 enforcement witness and
correct-production receiver baseline evidence for its recorded snapshot.**
The latest complete merged-source run, final harness composition, any required
unseeded execution, broader mutant coverage and old-test deletion acceptance
remain separate gates. No broader rerun is requested or initiated by this review.
