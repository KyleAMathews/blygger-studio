# Independent review: receiving expansion

2026-11-18, reviewer `/root/loss_format_unit_final`. This record is append-only: initial concerns and later dispositions remain distinguishable. Scope is the proposed `editor-receivers.oracle.test.ts` and `receiver-*-oracle.ts` expansion from `remaining-receivers-t5-audit.md`; no implementation edits or browser jobs are performed by this reviewer.

Read in full: pinned `@tanstack/oracles@97a4e7a` `skills/oracles-review/SKILL.md`, `docs/oracle-checklist.md` (v1), and `docs/glossary.md`. The source authority was checked at `src/ui/format-shortcuts.ts:217–238`, `src/ui/picker.tsx:118–141`, `src/ui/contacts.tsx:244–260`, `src/ui/authoring.tsx:1848–1865,1904–1913,2066–2095,2440–2532`, and `src/ui/data.ts:570–575` in the active worktree. This entry is design/source evidence, not execution evidence.

## Initial design review

The proposed laws can be authored within the adopted receiving scope. The bracket law uses identity at the formatter's actual entry rather than predicting picker-completion text; the Escape law is a two-layer transition over source/range constants; and the replacement law uses the arranged historical source and pending/released lifecycle. Those judgments are independent of production's formatting algorithms. No new syntax-aware Markdown promise follows from this expansion.

### RCV-D1 — settlement must not wait for the promised answer

- **Claim challenged:** the audit's instruction to wait for picker disappearance/focus-view state after Escape, or to await readonly/re-enabled controls as the pending/completion receipt, could turn a violation into a setup timeout.
- **Authority:** ORC-005, ORC-006 and ORC-015 (checklist v1). Checkpoints owe observations even when those observations are wrong; timeouts are not law kills.
- **Small witness:** remove only `readOnly={replacing}`, or retain `replacing=true` after rejection. A wait for `readOnly===true` or enabled controls never reaches the promised law comparison. Likewise, a first-Escape picker that stays open must be recorded as wrong at a settled key checkpoint rather than awaited until it closes.
- **Evidence status:** design consequence from the audit prose; new implementation not yet present at this review entry.
- **Repair/experiment:** settle using a causally independent event/React boundary, then snapshot all law outcomes. Keep allowed setup waits (visible search hit before a key; intercepted request before the pending checkpoint) distinct from law-output waits. The author's pre-source handoff chooses the actual restore-history button's `action.busy` true→false as operation settlement, rather than `replacing` outputs; that addresses the restore completion hazard at design level. Escape and pending-state checkpoint code still need source review.

### RCV-D2 — controlled host and receiving premise are separate claims

- **Claim challenged:** a viewport profile or controlled missing Fullscreen API must not be cited as native-fullscreen or physical-mobile evidence; an unconsumed event must not be counted as a successful formatter-identity experiment.
- **Authority:** ORC-013 and ORC-014 (checklist v1); the audit's explicit fullscreen boundary and source `useFocusView` fullscreen route.
- **Small witness:** the browser exits native fullscreen without delivering DOM Escape, or the delegated formatter wrapper runs before picker consumption. Neither supplies the conditional premise of the proposed DOM-key/consumed-entry law.
- **Evidence status:** design boundary, not a demonstrated implementation defect. The author's pre-source handoff explicitly chooses absent `requestFullscreen` and limits the Escape law to DOM-delivered events, and chooses actual consumed flags plus entry identity for bracket Shift+Enter.
- **Repair/experiment:** keep host controls in the driver's setup and prose/`law.limits`, expose the real delegated-entry consumed receipt, and classify absent receipt as premise/setup failure. A capture-order challenge tests receipt and must not be reported as an identity-law kill. Native-fullscreen behavior remains a separately retained source of evidence.

### Source-review obligations still open

- Historical restore source must be arranged independently before the request; neither `restore` response text nor the final received editor value can supply its own expected result. Pending source/range identity needs its own checkpoint before release, because replacement success can overwrite a wrong intermediate edit.
- Every supported structural/formula button must be attempted by native pointer activation while disabled and have its actual disabled attribute recorded. A normal Playwright click waiting for enablement or forced dispatch into a disabled element does not test this route.
- A native-key attempt, disabled control, rejected restore and successful restore need required constructed receipts for each claimed viewport profile. Expected-state names computed solely from the plan do not establish actual picker consumption or pending lifecycle receipt.
- Request interception tasks, outstanding response promises, temporary items and host controls need `finally` cleanup that preserves the first law failure.
- A released-formatting edit must be judged from an independent formatting relation, not a captured answer. Final replacement caret geometry stays unconstrained; pending identity still checks both endpoints.
- Calibrations must corrupt each distinct result, not merely an unrecorded diagnostic. Mutant outcomes must distinguish law rejection, setup failure, timeout, unreached route and survival. No run or closure verdict is available at this entry.

## Checklist disposition at design stage

| Requirement (checklist v1) | Current disposition |
| --- | --- |
| ORC-001 | Proposed existing-behavior authority and bounded DOM/readonly limits are identified. Executable law prose and independent historical input remain for source review. |
| ORC-002 | Identity-at-entry, two-layer Escape state, and arranged-history restoration can be independent models. Executable models pending. |
| ORC-003 | Proposed responsibilities are separated; opening prose and executable checkpoints pending. |
| ORC-004 | Audit supplies profile/picker/typing/key/control/outcome axes and distinguishing neighbors. Actual arbitrary admission, constructions, range and nearby-invalid exclusions pending. |
| ORC-005 | Actual app entry points are identified. Independent settlement is RCV-D1; actual observations pending. |
| ORC-006 | Plausible wrong designs identified. Calibration and registered mutant evidence pending. |
| ORC-007 | Fixed/random/replay registration pending implementation and parent-run evidence. |
| ORC-008 | Picker-open and focus-active bits are justified by a second Escape continuation; restoring pending/released state differs under a next formatting action. Executable state review pending. |
| ORC-009 | Production terms and the model-only two-bit abstraction are identifiable; executable naming pending. |
| ORC-010 | Deferred route/host/item cleanup pending source review. |
| ORC-011 | No additional shared semantic classifier fault has been identified beyond the identity/constant-state formulations; re-evaluate if executable model copies production transitions. |
| ORC-012 | This versioned record preserves all initial concerns and unresolved evidence. Full audit verdict remains pending. |
| ORC-013 | Shift+Enter versus plain Enter, picker-present versus none, and pending versus next editable action distinguish proposed boundaries; actual receipt required. |
| ORC-014 | Controlled search/settings/absent-fullscreen premises must be explicit. Native fullscreen/physical mobile remain unresolved here, not closed. |
| ORC-015 | Actual consumed-entry and pending/settled receipts are required; implementation and run counts pending. |
| ORC-016 | Only registered generated laws and named inputs to common model/driver/check are permitted; source pending. |

## First source draft review — raw findings before correction

Reviewed snapshot: `/private/tmp/blygger-receiver-review-source-v1/manifest.json`. SHA-256: test `c2cabe9428c7722d2ed286ba2e24fce3a15b6496d66f969274c26714b38ae40d`; model `39c06d4cf71b16d23754b619f7856abda716e03e29f20df1729cc91077741df9`; driver `163cd1bb3970e786f23e6a91207975e159b5d837db2ac0f06359952c153dec37`. No browser jobs ran. Checklist and glossary were reread in full at this handoff.

### RCV-S1 — receiver grammar controls not recorded

- **Claim:** generated receiver histories cover their stated bounded legal domains, with reconstruction, ablation, range and exclusion accounted for.
- **Authority:** ORC-004 (checklist v1).
- **Witness/design consequence:** `receiver-model-oracle.ts:5–58` defines the axes and legal combinations, but the first source draft and prior audit do not identify the nearby invalid histories or explain the distinguishing contribution of every axis. In particular, mention/panel is rejected structurally while bracket/panel is legal; `Tab` is not a bracket consumed-key witness; bare `Enter` is not a supported readonly formatting command; timeout is not a restore outcome; the real restore needs an independently arranged published version.
- **Evidence:** source inspection, not a failed campaign. The author reports a static admission preflight for all 64 constructions and rejection of the nearby-invalid records; those reports are not browser reach evidence and have not yet been independently inspected here.
- **Repair:** preserve a versioned grammar-control record beside the implementation, covering each axis's witness, bounds and excluded neighbor, and the historical-version setup premise. Do not introduce filters or narrow the generated domain to meet the documentation.

### RCV-S2 — desktop pane click is an actionability setup failure

- **Claim:** the pane changes at `receiver-driver-oracle.ts:157–160,180–181` establish pending/settled React receipt for every desktop and small-viewport history.
- **Authority:** ORC-005, ORC-006 and ORC-010 (checklist v1); independent settlement requirement RCV-D1. Parent-reported source finding preserved here before author correction.
- **Small witness:** any desktop replacement construction, such as `ControlOrMeta+b-success-false`. Desktop CSS hides the phone pane controls, so Playwright `locator.click()` waits for visibility instead of dispatching the actual pane handler. That prevents the pending checkpoint from recording the readonly/control observations.
- **Evidence:** source finding and existing navigation-harness precedent, not a browser result from this reviewer. It predicts an actionability/setup timeout, not a product-law rejection or mutant kill.
- **Repair:** use the native pointer path when visible; where the real controls are hidden, invoke the real DOM button handler through `evaluate(el=>el.click())`, record that controlled action, and await its `data-pane` commit as independent pane receipt. The expected edit/readonly outcomes must still be sampled, never used as wait predicates. Declare the controlled desktop pane action boundary plainly.

### RCV-S3 — picker absence needs the trigger premise at pending restore

- **Claim under scrutiny:** a mutant that retains BracketPicker or HandlePicker during replacement is distinguishable by the pending `pickers===0` assertion.
- **Authority:** ORC-005, ORC-013 and ORC-015 (checklist v1). Parent-requested challenge, preserved before implementation changes.
- **Small witness:** `bracket-success-false` or `mention-success-false`, with the corresponding `!replacing` mount guard removed. The opening snapshot at driver line 149 proves the picker existed before opening history/confirm; it does not by itself establish that its trigger remains active after those focus transitions, so a passing zero-picker observation must not be credited as killing that guard mutant if the picker had independently closed.
- **Evidence:** source uncertainty, not a confirmed survivor. The actual picker state depends on source/caret and dismissed state; no browser challenge result has been inspected. The current source keeps the unfinished source and does not deliberately dismiss the picker, but receipt still needs examination.
- **Next experiment:** preserve source/caret and actual picker-open input through the operation entrance, or add a receiving premise observation tied to that entrance; coordinate the mounted-picker mutants and classify their failure boundary. A setup timeout or absent trigger is not a mounting-law kill. This uncertainty remains until an independent source argument plus distinguishing registered mutant evidence is recorded.

## Source rereview of receiving corrections

The revised driver now has `paneReceipt` at `receiver-driver-oracle.ts:120–131`: visible controls use the native pointer; hidden controls invoke the actual DOM button handler, then await the actual `data-pane` commit. `pendingPaneInput` and `settledPaneInput` preserve which delivery occurred. The executable replacement limits explicitly name this controlled desktop input. This resolves RCV-S2's source blocker; no browser pass is claimed.

The revised replacement route records `confirmation` before accepting the actual sheet (`169–172`), and the check compares its unfinished source, EOF caret and picker count (`editor-receivers.oracle.test.ts:112–114`). BracketPicker's open predicate is trigger plus dismissed key, and HandlePicker's is active trigger plus contact matches. Neither has blur dismissal; neither history activation nor confirm focus changes the source or deliberately dismisses the trigger. The actual pre-acceptance DOM receipt therefore establishes the entrance needed by the two keep-mounted mutations. Pending picker absence is sampled before the attempt selects body text. RCV-S3's source-premise uncertainty is resolved by this additional receipt and source argument; registered `pending.pickers` challenge results remain pending before any kill/closure claim.

The driver also records actual readonly-key native events or disabled-control hit-tested native pointer delivery (`179–208`). A missing native target produces a premise error, and required reach is gated by this receipt (`test:110`). The five controls' actual disabled attributes are compared separately from their no-edit outcome. Browser suppression of pointer events on disabled controls is not silently interpreted as absence of the native pointer attempt.

### Independently rebuilt observations

1. **Consumed bracket Shift+Enter:** authority says the formatter preserves the input it receives after the real picker consumes the key. The driver records the first delegated entry's source/range and both prevention flags plus `isTrusted` before forwarding. The model projects those input values; `delivered` compares the full source/range and focus. It neither predicts nor captures an expected completion spelling. Unconsumed/capture-order delivery is a premise failure, not a kill.
2. **Bracket panel Escape:** for source `Writing alpha😀 [[needle` at its EOF caret, the first Escape must produce no picker while leaving focus view active and retaining identical source/range; the second must retain source/range and leave focus view. The pure two-layer model yields these observations. The driver disables only `requestFullscreen`, verifies that host control in `opened`, observes trusted native Escape, waits a frame unrelated to expected state, then snapshots each step. It never waits for the picker/view answer being judged. With `none`, the first Escape exits and the second preserves inactive state, distinguishing the picker bit's continuation.
3. **Held restore rejection:** arranged published input and independently arranged working input differ. While the actual POST is held, pending source/range, readonly, all five disabled controls and absent pickers are compared. The driver then selects the working body's input-derived offsets and records a native attempted action before the response is released. A 500 rejection's source is predicted as the original working input, not response data. Actual action busy release and a pane-handler commit establish settlement independently of `replacing`; the check can therefore reject stuck readonly/control gates. A following bold edit is the adopted insertion relation over the body, not a recorded formatter answer. Success instead predicts the independently arranged published input. Final replacement caret is not constrained.

### Remaining evidence boundary

No implementation or checker source issue was identified in those revised paths. RCV-S1's versioned grammar-control record is still awaited at this entry. Source-defined fixed/random campaigns, the 64 constructed records and the ten authored receiver mutants are present; this reviewer has not executed them. Calibrations name the exact compared difference (`delivered.value`, `escape0.focusActive`, `escape0.pickers`, `escape1.focusActive`, `pending.readonly`, `attempted.value`, `settled.value`, `settled.errorShown`, `followup.value`), so source inspection supports their intended discrimination, while calibration results and every production-mutant outcome remain run evidence to obtain. Native fullscreen, OS-owned Escape, physical mobile keyboards, other editor surfaces and restore publication/versioning remain outside these laws and are not closed by the controlled-host construction.

## Final source verdict for coordinated execution

RCV-S1 is resolved by `receiver-implementation-design.md`, read in full. It records reconstruction, each primitive axis's semantic contribution, bounded/marginal cases, invalid neighbors, historical setup, control boundaries and the design alternatives. Its reported static admission results are explicitly not browser reach. The model's small construction-loop rewrite preserves all eight Escape inputs and admits the same grammar; no budget or constructed-history loss was introduced.

Reviewed final source fingerprints:

| File | SHA-256 |
| --- | --- |
| `test-ui/editor-receivers.oracle.test.ts` | `fa438cf746addd4b2c39f018cdea888978cbcb6f0302c143a88e687e25cdf1dd` |
| `test-ui/editor-oracles/receiver-model-oracle.ts` | `d956c4edfc0ea6af60f015903ea4fcf8654cb6b8e77acf8e36030c2c5a06c7e0` |
| `test-ui/editor-oracles/receiver-driver-oracle.ts` | `a6989f0070ec31f93c2a20e59954b984c145da50a0bdb11aa97803e4f0ec2b63` |
| `docs/editor-oracle-design/receiver-implementation-design.md` | `b84781edb3b120b3e47124edd0874e3960512c1d1378a7d8cd3d6fff7a5697b4` |

**Source-ready for parent integration and coordinated browser/calibration/mutant execution.** No source-review blocker remains in the reviewed expansion. This is not a GREEN, calibration pass, mutant kill, product-defect closure, or completed gap-audit verdict. Runner selection is the parent's remaining integration boundary.

| Requirement (checklist v1) | Final source-stage disposition |
| --- | --- |
| ORC-001 | Satisfied in source: decision/name/date and existing-behavior sources; explicit DOM/controlled desktop/readonly limits. |
| ORC-002 | Satisfied in source: independent entry-input identity, layer/input projections and arranged historical source; no production classifier imported by the model. |
| ORC-003 | Satisfied in source and adjacent implementation record: law/history/model/driver/check and each checkpoint are distinguishable. |
| ORC-004 | Satisfied at design/source stage by the implementation record and unchanged primitive grammar; reported admission counts await independent execution evidence if used in a run verdict. |
| ORC-005 | Source supports actual delegated formatter, DOM Escape and actual held restore/control paths with intermediate checkpoints; coordinated execution must establish successful real receipt. |
| ORC-006 | Exact-difference calibrations and ten targeted receiver mutations are defined. Passing calibration and classified registered mutant results remain pending. |
| ORC-007 | Same properties register fixed seed 20261118 and random campaigns with runs 25. Actual campaigns/replay receipt pending. |
| ORC-008 | Satisfied: the second Escape distinguishes picker/focus layers; next bold edit distinguishes released replacement gates. No needless mutable model reducer introduced. |
| ORC-009 | Satisfied: production picker/focus/replacing/action-busy terms remain distinct; the model-only layer projection is explained. |
| ORC-010 | Source releases the held route in `finally`, restores the bracket wrapper and delegates isolated context/route-drain cleanup to the existing application host that preserves failure/cleanup distinctions. Cleanup behavior under execution remains pending. |
| ORC-011 | No additional fault shared by production and these input-projection models was identified that calls for a second semantic formulation. DOM/native receipt rather than a duplicate formatter model supplies the relevant distinct formulation. Reassess if later evidence identifies a shared semantic fault. |
| ORC-012 | This append-only versioned review ties the source verdict to explicit fingerprints, preserves raw findings and distinguishes source from remaining run obligations. No bug-class closure claimed. |
| ORC-013 | Source constructs Shift+Enter and Enter, picker/no-picker plus second Escape, each pending action, and success/rejection followed by a real edit. Intended distinguishing comparisons are present; registered kills pending. |
| ORC-014 | Satisfied at source scope: controlled settings/search/contacts, absent Fullscreen API and desktop pane-handler input are explicit. Actual native fullscreen and physical-mobile cross-boundary claims stay unresolved here. |
| ORC-015 | All three properties have required constructions; real consumed/trusted entry, trusted Escape and actual native-attempt/request receipts gate reach. Actual declared-state campaign counts remain pending. |
| ORC-016 | Satisfied in source: named constructions feed common model/driver/check; no ordinary unit tests or pinned per-input expected outputs were added. |

## RCV-RUN-001 — first receiving run stopped on bracket readiness setup

Raw runtime finding was preserved by parent/author before repair in their raw ledgers; this independent review appends it without replacing the preceding source verdict. This handoff reread the pinned checklist and glossary in full.

- **Challenged claim:** `openedPicker` establishes that a visible actual bracket hit is available before delivering the native key.
- **Witness:** fixed `Enter-false`, with the same defect repeated across all four bracket constructions, the fixed generated campaign and four random constructions recorded before stop.
- **Observed evidence:** `build/formatting-oracles/receivers-reviewed/preserved-setup/failures.json` contains nine failures. Each says the broad `getByRole('complementary', {name:'link picker'}).getByRole('option').first()` resolved to hidden native `<option value="newest">newest first</option>` and timed out. Corresponding raw records are preserved in `preserved-setup/run-2953-1.jsonl`. Parent stopped the incomplete process PID 2952.
- **Classification:** receiving readiness/setup failure (including locator timeout), not a product-law RED, calibration result, mutant kill or completed clean campaign. The formatter's consumed-entry checkpoint was not reached by those histories.
- **Cause:** the picker also contains native select options. A broad descendant role query does not uniquely name the items result list.
- **Repair requested:** scope readiness through the actual named items listbox, then its item option. This changes the host input locator, not the model, law, history grammar, budget or expected result. Preserve actual visible-hit readiness as a prerequisite; do not remove that setup step or replace it with an expected formatter-output wait.
- **Requirements:** ORC-005 (actual path/observation), ORC-006 (timeout/setup classification), ORC-014 (provider premise) and ORC-015 (actual consumed-entry reach), checklist v1. Coordinated execution must be repeated after source rereview; the stopped run supplies no clean/kill credit.

### RCV-RUN-001 independent repair disposition

Accepted from source: `openedPicker` now scopes bracket readiness to the actual `listbox` named `items`, then its first role `option`; the renderer defines those hit rows under exactly that named listbox (`picker.tsx:239–260`). Native sort options cannot satisfy this query. Mention readiness now scopes the Alice button through the actual `contacts` listbox (`contacts.tsx:272–281`). Both still wait for their real input-provider result before delivering a key; neither waits for a formatter/focus/readonly answer.

The complete read-batch policy lists only getItem and mention reads, so settings/search/contacts exact-path GET providers are not bypassed by batching. The existing provider payloads, laws, model, history grammar, all constructions, seed and budget are unchanged. The implementation design's appended RCV-RUN-001 section preserves the failed setup and this narrow repair. Author reports UI TypeScript and scoped diff checks passing; this reviewer did not rerun them or launch browser jobs.

New source-ready fingerprints: test `fa438cf746addd4b2c39f018cdea888978cbcb6f0302c143a88e687e25cdf1dd` (unchanged), model `d956c4edfc0ea6af60f015903ea4fcf8654cb6b8e77acf8e36030c2c5a06c7e0` (unchanged), driver `d20399f1253a093dc003a35c23851b5d37ab66d3b28f004003461fd6cd001369`, design record `8c128f75ad2900e7b1b3b9f4a335c08b5bdeaf93e4e2b2a70c5d886918de4d83`.

Ready for a fresh coordinated campaign. RCV-RUN-001 is repaired at source level; actual clean receiving, calibration discrimination, declared reach and all ten registered mutation outcomes remain pending. The nine stopped setup failures retain their classification and supply no product RED or kill credit.

Fingerprint correction: the immediately preceding full driver/design strings were transcribed incorrectly. The just-completed SHA-256 command verifies driver **`d20399f12539e1101db9e106af9b7d1b959622f78b31a1d064c56323c13203f8`** and design record **`8c128f75ad266636f3e3f28a81429351711b54247ebc6cedd50366c108101608`**. Those are the reviewed repair identities; the unchanged test/model hashes above are correct. This correction preserves the original entry's history and supersedes its two erroneous hash strings.

## RCV-RUN-002 — picker overlay intercepts restore entrance

Raw finding was preserved by the parent before repair in `/private/tmp/blygger-links-review-ledger.md`, with runtime JSONL under `build/formatting-oracles/receivers-listbox-reviewed/preserved-pointer-setup/run-24216-1.jsonl`. This independent append retains it separately from RCV-RUN-001 and the preceding source-ready verdicts. Pinned checklist and glossary were reread in full at this handoff.

- **Challenged claim:** the driver can enter an accepted restore while retaining an actually open bracket/mention picker by clicking the history restore button.
- **Observed witness:** picker-overlay cases intercept the native pointer click on the history restore entrance before the restore request begins. The parent stopped runner 24215 / session 73308, exit 143. The preserved failure records have no law verdicts.
- **Classification:** restore-entrance pointer/actionability setup failure, not an accepted-restore law violation, product RED, or mutation kill. Earlier passing rows do not turn this stopped attempt into a complete clean campaign.
- **Authority/transport judgment:** the adopted law starts from an actual accepted restore and promises pending/released editing behavior. It does not promise pointer activation through an overlaid picker. Focusing the actual visible enabled restore control and activating it by native Enter preserves that production action and its real confirmation sheet while retaining the unfinished picker trigger. This is a different valid entrance to the same accepted-restore boundary, rather than a new product law or an exclusion of the picker histories.
- **Repair constraints:** do not force a pointer through the overlay, remove/dismiss the picker, fabricate confirmation, remove constructions, or change the model/law/history/budget. Preserve confirmation-stage source/caret/picker receipt and the actual POST. A missing focus/native-key/action receipt remains a setup failure; no product-law kill credit comes from this entrance repair itself.
- **Requirements:** ORC-001, ORC-004, ORC-005, ORC-006, ORC-014 and ORC-015 (checklist v1). Source repair review precedes a fresh parent-coordinated campaign; no browser jobs are launched by this reviewer.

### RCV-RUN-002 independent repair disposition

Accepted from source. The revised entrance waits for the actual restore control's visibility, reads and requires enabled state, focuses that control and verifies `document.activeElement`, records a trusted native Enter delivered at that button, then awaits its actual confirmation sheet. No pointer event is forced through the overlay and no synthetic click supplies the restore action. The unchanged confirmation checkpoint still compares the working source, EOF caret and actual open picker before acceptance; the actual POST still establishes the held lifecycle premise.

This transport change preserves the accepted-restore boundary and every picker construction. It does not assert pointer-through-overlay behavior, remove a legal history, alter expected results, use production output as authority, or wait for a promised readonly/editing outcome. Missing focus/key/confirmation/request remains setup failure. `receiver-implementation-design.md` records the controlled-focus input and the stopped-run classification. Test and model hashes remain unchanged.

Reviewed repair fingerprints: driver `9a7bafefc10901ca6180d8da641c404ec5b024d52d6453c11e8dfba626985e5f`; design `f54f5d51d6bd0a4d2bb4e98bc1c7fc577e143d92d3350fedd07fdd743d23eb6f`; test `fa438cf746addd4b2c39f018cdea888978cbcb6f0302c143a88e687e25cdf1dd`; model `d956c4edfc0ea6af60f015903ea4fcf8654cb6b8e77acf8e36030c2c5a06c7e0`.

Source-ready for a fresh parent-coordinated campaign. Runtime verification of this entrance, complete fixed/random clean campaigns, calibrations, reach and all registered receiver mutants remain pending. The interrupted 85-row evidence (81 passing rows, four setup failures) is retained as an incomplete attempt and supplies no completed-run or mutation-kill credit. This reviewer performed source/evidence inspection and documentation updates only.

## RCV-ADJ-001 — pane receipt can encounter the same overlay before pending comparison

Raw source-derived hypothesis, preserved before the adjacent repair. This is not a newly observed runtime result or a demonstrated surviving mutation.

- **Challenged claim:** `paneReceipt` can establish its independent React render input on every visible-mobile history while a wrong keep-mounted picker remains, before the check records `pending.pickers`.
- **Source support:** at the reviewed RCV-RUN-002 source, `paneReceipt` uses ordinary pointer `.click()` for visible controls and a declared actual DOM handler for hidden controls. `picker.css:4–14` places open pickers fixed above page controls (`z-index:40`), including a mobile bottom dock. RCV-RUN-002 already demonstrated the same picker-overlay interception mechanism at the restore control; exact pane geometry has not been run here.
- **Small distinguishing experiment:** retain the bracket or mention picker mount guard during replacement in a small-viewport construction. If its overlay intercepts the pane pointer action, the driver times out before recording the public `pending.pickers` violation. The pinned judge's missing-checkpoint guard means this is a setup gap rather than a false law kill.
- **Authority:** ORC-005, ORC-006, ORC-013, ORC-014 and ORC-015 (checklist v1). The pane action supplies a render input; no adopted law promises pointer-through-overlay behavior.
- **Repair direction:** for a visible enabled pane control, controlled focus with verified native Enter can activate the actual handler without depending on a pointer path. Retain the explicitly controlled actual DOM handler for hidden desktop controls. Record activation/receipt and actual `data-pane` commit. Do not dismiss/remove the picker, wait for picker absence, change a law/model/grammar/budget, or drop mobile constructions.
- **Evidence status:** source-supported risk and proposed distinguishing challenge, not a runtime mutation classification. The fresh receiver run has not started; runtime validation and both mounted-picker mutant comparisons still remain required.

### RCV-ADJ-001 independent source disposition

Accepted from source. `paneReceipt` now requires the actual pane control to be enabled. Visible controls receive controlled focus verified by `activeElement` and a trusted native Enter recorded at that exact button; hidden controls retain the declared actual DOM handler. Both routes await and record the actual requested `data-pane` commit. The pending snapshot still follows the same preview→draft cycle, so a retained picker can be recorded as wrong instead of blocking a pointer action before that checkpoint. No picker is dismissed, no expected readonly/source/picker value is awaited, and no history/model/law/budget/mutant was removed or narrowed.

The registration's factual opening prose now matches this controlled-focus/native-Enter transport. The implementation record preserves this hypothesis separately from observed runtime failures. Reviewed fingerprints: test `0390009bb54656470ec136a7b7e7149b300734f329e23731f7505cefde3d151d`; model `d956c4edfc0ea6af60f015903ea4fcf8654cb6b8e77acf8e36030c2c5a06c7e0` (unchanged); driver `a652e6ca7115accdb0423a5973216991f29d21e228a5de3cf64cc0a184455f7a`; design `5ec643627800dc092052e7d36fb89faf3ba49d112690e08103a4bd2ce33ad5a7`.

Source-ready for a fresh parent-coordinated run. This closes the proposed source transport correction, not a runtime gap: the visible-pane native route and mounted-picker law rejections still require execution evidence. Prior interrupted setup attempts are not relabeled GREEN, product RED or mutation kills.

## RCV-RUN-003 — picker overlay intercepts the history summary

Raw finding preserved before source repair. The parent stopped PID 58222 / session 31078 with exit 143 (SIGTERM). This reviewer has reread the pinned review skill, checklist and glossary after handoff and inspected the actual JSONL rather than relying on provisional run status.

- **Challenged claim:** every bracket/mention restore construction can open the actual history disclosure while retaining the open unfinished picker, before entering the already repaired restore-control activation.
- **Observed witness:** fixed `bracket-success-true`, `mention-success-true`, `bracket-reject-true`, `mention-reject-true`, fixed `generated`, and random `bracket-success-true`, `mention-success-true`, `bracket-reject-true` fail at `details#history > summary` pointer `.click()`. The actual items/contact listbox or option intercepts the pointer. Each failure has `verdicts: []`; state records `mutant: null`.
- **Preserved evidence:** `build/formatting-oracles/receivers-keyboard-reviewed/preserved-history-summary-setup/run-58233-1.jsonl`, alongside full `failures.json`, copied input manifest/state and `preservation-receipt.json`. Final stopped snapshot: 154 rows, 146 pass, eight fail; JSONL SHA-256 `11316ba1199810ffc1be9047438446b916710beef1e7b622484f5c23282afd96`. The prelaunch manifest identifies 399 input files and the source identities already recorded at RCV-ADJ-001.
- **Classification:** history-disclosure actionability/setup timeout before accepted restore and before any comparison verdict; no product RED, calibration result, registered mutation kill, completed clean campaign or receiver-gap closure. Passing earlier rows do not change that classification.
- **Cause and next action:** RCV-RUN-002 repaired the restore button but left the preceding history-summary pointer entrance exposed to the same actual overlay. Use the actual visible enabled summary with verified controlled focus and trusted native Enter, retain actual open disclosure/confirmation/POST receipts, and audit the remaining pointer inputs that occur while a picker is open. No dismissal, forced pointer, expected-output wait, model change, narrowed grammar, construction removal or budget reduction is justified by this setup failure.
- **Requirements:** ORC-005, ORC-006, ORC-010, ORC-014 and ORC-015 (checklist v1). Source repair requires independent rereview, then new coordinated execution. This reviewer preserved evidence and updated this record only; the author owns runtime-source repair.

RCV-RUN-003 final-snapshot correction: the after-stop copy received one last buffered `random seed: mention-reject-true` row. The preserved final log and receipt therefore contain **155 rows: 146 pass, nine fail**, SHA-256 **`6307c73c266a39b20d37b98dfa2bf283efa984f85553b6b0e498355f37bdcaae`**. The ninth row has the same history-summary pointer timeout and empty verdicts; the prior 154-row figure was the parent's last pre-stop snapshot. This correction supersedes the preceding final-count/hash wording without changing the setup-failure classification.

### RCV-RUN-003 and RCV-ADJ-002 independent source disposition

Accepted from source. The new shared `nativeEnter` waits for the actual target to be visible, requires enabled state, verifies controlled focus on that exact element, records its trusted native Enter, and fails setup if any receipt is missing. The history summary receives this real input and the driver then awaits actual `details.open`; it never assigns the disclosure state or fabricates its contents. The actual visible restore control and visible pane controls retain the same verified input through the helper. The initial mobile draft-pane action now uses and records that input too, removing the source-supported RCV-ADJ-002 risk that a working-copy picker already covers its pointer target on navigation. RCV-ADJ-002 is a source hypothesis, not an observed browser failure or kill.

The remaining pointer actions were independently checked against their concrete context. The Escape construction activates focus view before adding its bracket/mention trigger, using initial prose whose grammar contains neither trigger. The actual confirm action lives in the portaled Sheet at z61 above picker z40, so its ordinary native pointer path is retained. Hidden desktop pane controls still use the declared actual DOM handler, and both pending/settled cycles await actual requested `data-pane` commits. The five disabled formatting-control attempts still use native pointer coordinates and actual hit testing, preserving their accepted receiving contract.

A retained picker can interfere with a later disabled-pointer attempt in an arbitrary picker/control combination, but this does not erase the already recorded pending comparison: the pinned framework `oracle-property.ts:1727–1735` judges the partial trace and preserves a violation at a recorded checkpoint over a later driver error. The replacement checker compares `pending` before its native-attempt premise. The mounted-picker mutations therefore still require actual registered `pending.pickers` rejection evidence; a later error, if present, must remain a separate diagnostic cause. No runtime outcome is inferred from this source argument.

The factual registration prose and implementation record match the input transports. Semantic laws, checks, model, primitive history grammar, all 64 constructions, fixed seed 20261118, generated budget25 and all ten authored receiver mutants are unchanged. Missing disclosure/focus/key/commit/actual POST remains setup failure. No new expected-output wait, picker dismissal, forced pointer, output golden or grammar exclusion was introduced. Author reports UI TypeScript and scoped diff checks passing; this reviewer did not rerun those checks or start browser jobs.

Reviewed fingerprints: test **`9be323f56ae89ee4a4a4c95d0b3ac1451e66ba9eb4be5406e458f26db120bf45`**; model **`d956c4edfc0ea6af60f015903ea4fcf8654cb6b8e77acf8e36030c2c5a06c7e0`**; driver **`3d4ea719c43571dec3ad362d6062695cad50c34942253c4ae8ec9b94896efa00`**; design **`b571f91fcbf4c4983a51d8386a24ba29c2a2a16b2f1879b6e6edee07776fbade`**.

**Source-ready for fresh parent-coordinated execution.** RCV-RUN-003 has a source-level repair; its stopped nine setup failures remain preserved. A targeted replay can diagnose these entrances, but cannot establish complete fixed/random campaigns, all calibrations, declared reach or mutation outcomes. No GREEN, product RED, kill, bug-class closure or completed gap-audit verdict is supplied by this source disposition.

## Completed receiver execution acceptance — Firefox, run `3f2bcef7d392`

Independent passive review accepts the completed **selected receiver campaign** at `build/formatting-oracles/receivers-firefox-reviewed/`. Parent session 90083 exited0; the retained stream says `done completed`, and `results.json` is nonprovisional. Both complete unmutated runs passed **216 checks**, with no skipped checks and zero nondeterministic checks (455.6s and435.7s). Each baseline contains18 bracket checks,32 Escape checks and166 replacement checks, including all **nine calibrations** and73 determinism checks. All ten selected authored receiver challenges were rejected through registered `oracleProperty` laws. No selected outcome was a setup failure, timeout, production crash, unreached path or survivor. Mutation time was956.632s. Evidence counters are `computed:12`, `reused:0`, with no cut, idle, spin, rerun, unchanged or budget outcomes.

The three fixed-seed and three random generated campaigns retain budget25 and seed20261118. In each baseline and each seed route, all64 constructed histories actually reach their required states:4 bracket,8 Escape and52 replacement. The retained reach record confirms every declared state with a positive count. In particular, each seed route has four actual consumed bracket entries; eight DOM Escape hosts (bracket4, mention2, none2, with both bracket typing modes); and52 pending restores (desktop26/mobile26, success26/reject26, key32/control20, bracket-before4/mention-before4/no-picker44). Every non-bold key and every structural/formula control has four constructed entries; bold has12 because it also supplies picker entrances. Generated reach remains separate in the independent evidence. These are actual input/trace-gated reach counts, not static admission or state names derived only from plans.

### Classified mutation receipts

Every row below is an assertion failure through the named registered law, at an actually recorded checkpoint. The raw message records the listed difference. All routes are fixed seed20261118. Full route, shrunk history, law, checkpoint, message and capture hash are retained in `independent-receiver-evidence.json`.

| Authored receiver challenge | First distinguishing difference | Construction | Raw capture |
| --- | --- | --- | --- |
| `receiver-bracket-consumed-gate` | `delivered.value` | `Shift+Enter-false` | `run-91539-3.jsonl` |
| `receiver-escape-ignore-prevention` | `escape0.focusActive` | `bracket-editor-false` | `run-91539-4.jsonl` |
| `receiver-escape-never-exits` | `escape1.focusActive` | `bracket-editor-false` | `run-91539-5.jsonl` |
| `receiver-replacement-bracket-mounted` | `pending.pickers` | `bracket-success-false` | `run-91539-6.jsonl` |
| `receiver-replacement-controls` | `pending.disabled` | `ControlOrMeta+b-success-false` | `run-91539-7.jsonl` |
| `receiver-replacement-key-gate` | `attempted.value` | `ControlOrMeta+b-success-false` | `run-91539-8.jsonl` |
| `receiver-replacement-mention-mounted` | `pending.pickers` | `mention-success-false` | `run-91539-9.jsonl` |
| `receiver-replacement-premature-release` | `pending.readonly` | `ControlOrMeta+b-success-false` | `run-91539-10.jsonl` |
| `receiver-replacement-readonly` | `pending.readonly` | `ControlOrMeta+b-success-false` | `run-91539-11.jsonl` |
| `receiver-replacement-stuck` | `settled.readonly` | `ControlOrMeta+b-success-false` | `run-91539-12.jsonl` |

The two keep-mounted mutations specifically fail **`pending.pickers`**, before a later edit or restoration can hide the wrong intermediate state. The stuck-state mutation specifically fails **`settled.readonly`**, after the independently observed action-busy release and pane commit. The readonly/key/control challenges distinguish public guard attributes from a forbidden actual edit. No locator error or missing native receipt is being credited as a kill.

The capture-to-mutant mapping is checked against the pinned scheduler: one context, two unmutated captures, then one target-file unit per authored job in report order. Each raw failed route independently matches its corresponding `result.by`. All12 capture files have their actual closing metadata. The package normally unlinks these logs; an evidence-only helper hard-linked each inode before unlink and retained state snapshots. Native file watching encountered the host's EMFILE limit, so passive25ms polling supplied subsequent links. No runtime/check/package source changed for retention. Parent authorized helper shutdown after all captures were checked; helper PID95307 / session67296 then exited0 after SIGTERM, retaining27 captures across the two watched outputs.

### Exact source and browser binding

The prelaunch inventory, parent's `postrun-manifest.json` and the independently captured `review-output-manifest.json` each cover399 paths. **All399 file hashes are identical at completion.** The proposed unrelated list-grammar edits had not yet landed when these receipts were taken. No claim is made that the later workspace remains unchanged. Base commit is `28b0c8d642a87e5810ad6eabd95c2d1714c53396`, Node v24.19.0 and oracle pin `97a4e7a`. The receiver test/model/driver identities are the RCV-RUN-003 source-ready identities recorded above. Baseline production entries are:

```text
c4a34e5d1faa4c94df876f45577e3f173fc83267a4851c078f523406d5ccc967 src/ui/format-shortcuts.ts
863d35404d85e06f3c093f46cc1a6c73b369ea49c22fd00ac4fc954af47d8bc6 src/ui/authoring.tsx
```

As an additional dependency check, none of the12 closed capture receipts lists `editor-list.oracle.test.ts` or `list-model-oracle.ts` in loaded inputs or `readAt`. Source inspection likewise finds neither in receiver registration/model/driver/shared-host imports. This supports bounded separation for subsequent list-only oracle work; a later production change requires new verification.

`invocation.json` explicitly records `npm run test:formatting -- --oracle receivers --browser firefox --contexts1` with the exact ten authored IDs, the browser cache path, no executable override, and replay-only environment variables unset. The actual command array preserves the proper separate arguments. This receipt and the parent's invocation establish Firefox selection; framework run ID alone does not. Exact browser binary version was not independently measured. The small Firefox viewport is responsive-layout evidence, not physical mobile hardware or OS keyboard behavior.

Retained report fingerprints, relative to the Firefox output directory:

```text
adf0877744926427fc67f7015acb86ebf290fa377c2f79a5cb2c09668db1727f input-manifest.json
4f37e4a2407995795d7cadd4689cc6bdc25703e36c3d75fa798780830ff73769 postrun-manifest.json
d11a736355c962585dbe1cee420bca913c2ef736265ad255c9cf83dd067485ed review-output-manifest.json
3fc4ab730d340eadac19f537c37832fc9c8a7670263c89de509dc8a4bfaa9ec2 invocation.json
da9bb5c50104d00608159038895a3de4d9b0747106ca9a2b33e6af7dea601a20 results.json
e2141e0eab701c0198e4ab67f167ff3cda1bc28d99947e6853f82057820df20a summary.md
e94ded67536a206bd2ee2ec9e3af422a54245aa94dee628e6cb6110f8c2f7f29 stream.log
eee9de4f01861c66c027753149cad243c67d02bae0d6aa8600ab5eb14e80d911 test-output.log
2e71d12c2ef69c758509d9bf173bd54e556ced9954d0397ebd93733e67d35d71 independent-receiver-evidence.json
```

### Chromium receipts and bounded disposition

The two completed direct mobile entrance diagnostics remain partial: `receiver-bracket-summary-replay` (run `feaeb5816e55`) and `receiver-mention-summary-replay` (run `730c689def66`) each passed one selected unmutated check twice and registered the corresponding mounted-picker law kill, with215 explicitly skipped checks. All399 pre/post file hashes match for each diagnostic. Their retained reports establish route/law rejection; they do not retain the detailed failure checkpoint payload and are not relabeled full campaigns. The later Firefox raw receipts above provide actual mounted-picker checkpoint evidence.

The broader Chromium run in `final-current-chromium/` was intentionally stopped with SIGTERM after its first complete14-file baseline (4204 checks passed) when PAD-001 identified a missing list-padding grammar axis. Its retained receiver baseline alone has216 passes (`preserved-live-captures/run-91470-11.jsonl`), and its399-entry stopped inventory matches prelaunch. That run is an incomplete broader campaign, with no completed repeat/all-mutant acceptance. It does not close PAD-001 or establish final editor acceptance.

This execution supplies the previously pending bounded runtime evidence for ORC-005/006/007/010/013/014/015 (checklist v1): real receiving paths and intermediate observations, all nine checker calibrations, fixed/random runs with direct routes, failure preservation, nearby registered wrong designs, explicit controlled-host premises and actual constructed reach. Other source-stage outcomes in this append-only review remain unchanged. RCV-RUN-001/002/003 stopped setup failures retain their original nonkill/non-RED classification. No production defect was repaired in this receiver campaign, so no production RED→GREEN claim is made.

**Accepted for the exact selected Firefox receiver laws, histories and ten authored challenges.** `--only` makes this a partial gap campaign relative to all owned operator mutants and all73 authored challenges. Native fullscreen/OS Escape, physical mobile input, picker completion spelling, unrelated restore publication rules and PAD-001 remain outside this result. There is no absolute zero-gap claim or completed all-editor claim.

Invocation notation clarification: the executable arguments in `invocation.json` are `--contexts 1` (two arguments); the compact `--contexts1` prose above is not a runnable flag spelling. The retained command array is the exact receipt.
