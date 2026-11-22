# Mixed editor oracle — independent source review

2026-11-18. Read-only review by the independent coverage reviewer, using pinned `@tanstack/oracles@97a4e7a`'s review skill, checklist v1 and glossary. Reviewed `editor-mixed.oracle.test.ts`, `mixed-model-oracle.ts`, `mixed-driver-oracle.ts`, extracted `moveRows`, the command models they reuse, the existing session and break laws, and the actual editor/formatter receiving paths. No production/oracle implementation edits or browser/test jobs by this reviewer. Findings were sent to the parent while its first mixed campaign was active.

## Verdict

The decomposition is suitable: input intents resolve to concrete input actions; independent command models fold one document; the real React editor executes those actions; every intermediate source/range reaches the check. It adds useful composition coverage without replacing the stronger dedicated renderer, transaction or original-session properties. It is **not ready for a no-gap mixed-history claim**: the decisive redo action is erased after branch deletion, and the new break parser changes the fence premise without establishing authority for that change.

Authority is Kyle Mathews (GitHub KyleAMathews), 2026-11-18: approved arbitrary mixed actions, independent formatting models, paragraph/Unicode boundaries and undo followed by new edits. `docs/editor-research-next-steps.md` T3 explicitly says to preserve each command's legal context and not assume a new undo-grouping policy. The existing break oracle limits its declarative fence envelope, excludes other code containers/invalid opening info strings, and constructs `openingEnd`, not every offset within an opening delimiter. Those neighboring promises matter when generalizing the new parser's domain.

## MIX-R1 — Abandoned-branch redo is rewritten into selection [P1]

- **Challenged claim:** opening example `undo(); type(); redo()` cannot restore abandoned content; the executable law says native redo respects the remaining branch.
- **Source:** `mixed-model-oracle.ts:122–124` clears modeled redo on a new changed-source edit. `mixedPlan` then rewrites any redo with an empty modeled redo stack to `select` (`:136`). In each native `branch-*` construction (`:154`), step4 is consequently a selection action. `mixed-driver-oracle.ts:26–27,40` sends no redo key there. The branch calibration (`editor-mixed.oracle.test.ts:61`) changes the value observed after that selection, so it calibrates comparison but does not restore the missing product action.
- **Smallest witness:** bold; italic; undo; replace all source with `α😀 prose`; redo. The contract predicts the replacement remains. The current driver instead performs bold; italic; undo; replacement; selection. A wrong native redo branch cannot be observed because the driver never requests it at this checkpoint.
- **Evidence status:** read from source, no mutant executed by this reviewer. The existing session oracle still has a real branch-history receiver; this is a gap in the new property's own advertised enforcement, not a claim that all suite protection disappeared.
- **Repair:** preserve the actual redo key as a legal no-op after a known new edit on an undone native branch, model unchanged source, and require semantic `editAfterUndo` plus `redoAttemptedAfterBranchDeletion` reach. Unknown initial history/no-op/pour-over boundaries can remain separate host-premise questions; they do not justify erasing the deliberately known branch-deletion witness. Run a wrong branch-retention design through the intended checkpoint.

## MIX-R2 — Whole-document fence maps silently strengthen the adopted break premise [P1]

- **Challenged claim:** the new mixed break action merely composes the adopted existing break law.
- **Source:** `literalAt` (`mixed-model-oracle.ts:62–67`) treats every offset in a complete MarkdownIt fence token's mapped opening line as literal code. `change` then owes an ordinary newline there (`:86–90`). The existing independently annotated break model admits a completed opening delimiter at `openingEnd`; it does not derive fence state from suffix bytes after the caret. The new parser also recognizes container/Markdown structures beyond the old envelope's stated scope.
- **Smallest witness:** initial code scene with body `a` gives the source `` ```\na\n``` ``. Request Shift+Enter at `[1,1]`, after the first opening backtick. The mixed model uses the later two backticks to classify the whole row as a fence and predicts a plain newline. The existing prefix-oriented behavior sees only one preceding backtick, so the ordinary prose/backslash rule supplies a hard break. This is a semantic disagreement, not evidence by itself that production violates an adopted law.
- **Evidence status:** source-derived witness, then independently read in the parent's `build/formatting-oracles/mixed-first/summary.md`: run `ff84bd75ab70` reports two failed checks out of 62, shrinking to `scene:code`, body `a`, break at range `[1,1]`. Its two selected authored mutants are **blocked**, not killed. This reviewer did not run the campaign. Preserve this failed receipt.
- **Repair:** decide which existing adopted premise owns the partial opening-delimiter boundary, and make the model's authority/domain explicit before changing production. A parser-based independent formulation is useful, but parser independence does not confer authority for a new editor policy. To retain the existing prefix policy independently, classify only the information preceding the insertion boundary, with a separate explicit closing-delimiter-line rule; verify opening positions below/at the minimum width, closing positions and adjacent literal text. If the desired policy is whole-document Markdown context, present that as a law change with its concrete behavior consequence. Do not silently narrow the range grammar or accept the baseline output as authority. Container/invalid-info cases need the same treatment when admitted.

## MIX-R3 — Legal collision selections cannot reach the mixed code receiver [P2]

- **Challenged claim:** freely interleaved code commands preserve their selected input under the adopted per-command laws.
- **Source:** `mixedPlan:133–135` replaces every tick-containing code selection with an empty insertion at its start. This is stated in `limits`, so it is visible, but it removes a valid selected-input action rather than giving the command's permitted result. For example a second code command selecting the first code command's complete output can never be delivered as selected. The dedicated code oracle judges collision-safe literal content; it does not by itself establish that this mixed React receiver receives the same legal selected range.
- **Evidence status:** read from source; no collision history altered or run by this reviewer. Existing direct-command code collision protection remains intact. This is an unresolved composition boundary, not a demonstrated production defect.
- **Repair/next experiment:** retain a generated selected-tick input and judge the adopted semantic guarantee with an allowed fence-width relation or a semantic observation, rather than demanding exact default serialization for that action. Reuse the dedicated independent code model/parser where suitable. Keep default exact-source checks on tick-free selections. Until the mixed receiving witness and its wrong-design challenge exist, do not cite this property as closing arbitrary selected-code composition. Merely stating a limit does not close this receiving gap.

## Semantic reach and native-history qualifications

`mixedStates:158–161` currently declares action names, initial scene, viewport/native mode, toolbar activation for code/formula and a broad `editAfterUndo`. It does not require a literal-code break, partial opener, closing-delimiter break, successful/declined list move or a real redo attempt after a cleared branch. An initial `scene:code` is not sufficient: earlier actions can remove its fence before break. A `type` anywhere after any undo also need not be the first branch-clearing edit. Derive semantic reach from the independent input fold and construct the specific distinctions the mixed law relies on; MIX-R1/R2's witnesses should then become required states, not random-only opportunities. This is ORC-015, with ORC-013 for the break threshold.

The host helper is independently justified by earlier receiving work. The new driver invokes its real boundary after each action (`mixed-driver:43`) and preserves cleanup errors as an aggregate with the original cause (`:46–49`). Source does not feed expected application text into that host witness. Native source histories are intentionally bounded at no-op transactions and DOM pour-over paste; the old shortcut undo laws and the separate real branch property must remain. The mixed property must not claim undo for DOM paste, forced fallback or histories erased by those stated boundaries. Conversely, an explicit no-op redo following a known new edit is the branch-deletion observation itself and is not discharged by that qualification.

Undo caret is deliberately unconstrained. Each following action's concrete range is an input chosen from the independent model, and the driver explicitly sets it before the next action (`mixed-driver:22`). This is coherent: the property checks prior source and each promised command range, but does not claim native undo restores any particular caret. It should not be described as proving the actual native undo caret supplies the next selection.

## Accepted model and driver details

Rebuilt one ordinary mixed observation without production: initial `one two`, selected all; bold produces `**one two**` with the words selected; typing `α😀 prose` replaces those words, preserving external stars; italic over the whole document adds/removes its one-marker layer according to the adopted emphasis annotations. The reducer derives the concrete next range from its own prior document, never a browser output. The driver records each source/range before another command runs, so a later restoring toggle cannot erase the wrong intermediate observation.

The row parser is test-side character/token construction rather than production imports. `moveRows` continues to consume declarative row/parent geometry. Parent reports 82 constructed list histories plus 2,000 seeded histories gave 2,082 identical complete model observations before/after extraction. This is reported bounded refactor evidence, not an executed result by this reviewer, and should be persisted with the source hashes and mutation comparison before a final refactor-equivalence claim. The pending TypeScript widening of `Row.lead/tail` to string accepts already intended model input; it does not justify changing runtime semantics or narrowing whitespace histories.

The real editor's native keys, React toolbar, simulated URL paste listener and actual instrumented command modules are exercised. Paste is accurately a DOM `ClipboardEvent`, not OS clipboard delivery. Source and selection are compared after every action. Extra `focused` observations are intentionally not compared by this property's source/range law; the existing session focus law remains the relevant evidence. The check also rejects missing/extra/reordered checkpoints and page errors. Setup failures, missing browser events and native boundary exhaustion remain runtime/setup outcomes, never law kills.

## Checklist disposition

| Requirement | Outcome |
| --- | --- |
| ORC-001 | Adopted broad composition authority exists; MIX-R2 needs authority for the stronger parser premise. |
| ORC-002 | Model imports no production semantic code; existing independent command models are reused. MarkdownIt is independent but not automatically authoritative. |
| ORC-003 | Law, intents/plan, reducer, driver and check are distinguishable and explained. |
| ORC-004 | Bounds/axes are visible; MIX-R1 erases its decisive legal action and MIX-R3 transforms legal collision selections. Parser-domain extension requires an explicit account. |
| ORC-005 | Actual React entry points and per-step observations accepted; MIX-R1 lacks the promised redo production action. |
| ORC-006 | Three corrupt-trace calibrations exist. The first campaign is failed baseline with blocked mutants; no closure kill demonstrated yet. |
| ORC-007 | Registered fixed/random campaigns use the same 25-run property and direct replay. First failed receipt has replay; completed clean campaign still required. |
| ORC-008 | Current document/range and separate undo/redo branches have distinguishing continuations. Clearing knowledge at host-history boundaries is explicit, but cannot replace the known branch-deletion observation. |
| ORC-009 | Intent versus concrete action, semantic rows and native history are mapped. Undo range is an explicit later input rather than a claimed native observation. |
| ORC-010 | Application/native cleanup retains causes; actual host failure executions remain diagnostics. No competing fault injected by reviewer. |
| ORC-011 | Parser is a meaningfully different fence formulation; MIX-R2 challenges its applicability, not its independence. Existing direct semantic properties remain. |
| ORC-012 | Raw findings and exact failed execution receipt recorded here. Final source manifest and evidence remain pending. |
| ORC-013 | Break opener-position threshold requires the neighboring witnesses named in MIX-R2; current parser scene state is too coarse. |
| ORC-014 | Real app receives keys/toolbar/paste; OS clipboard and native grouping premises remain explicitly bounded. Prior native-host witness is reused. |
| ORC-015 | Action/scene reach needs semantic predicates for the important mixed states above. |
| ORC-016 | No ordinary unit tests or fixed expected-answer tests appear; fixed inputs flow through the property. |

All checklist requirements apply to this new generated stateful receiving property. No requirement is waived. This report authorizes no production change and treats no in-scope gap as closed by a limit.

## Re-review — prefix parsing, real redo and selected-code receiver

2026-11-18. Re-read the pinned review skill, full checklist v1 and glossary. Reviewed the current five mixed law/model/driver files from source, rebuilt the witnesses below, and read existing run reports. No browser/test jobs or production/oracle edits by this reviewer. The reviewed source hashes are recorded at the end of this addendum; later edits need their own receipt.

### Existing finding dispositions

**MIX-R1: repaired in source for the original witness.** `redoKnown` now distinguishes a known-empty redo branch from a branch whose native history was left unknown by a no-op/DOM paste (`mixed-model-oracle.ts:20,25,122–124`). A changed-source native edit makes redo known and empty; `mixedPlan:136` retains a redo intent in that state. Thus B/I/undo/type/redo now sends the real redo key through `mixed-driver:29` and compares unchanged replacement source. This is the previously missing product action. Its source repair does not establish every native grouping policy. The new `branchClearedRedoAttempted` predicate is weaker than its name; see MIX-R4.

**MIX-R2: partial-opening witness repaired; broader domain still unresolved.** `literalAt` now parses `value.slice(0, at)` (`mixed-model-oracle.ts:67`). For initial `` ```\na\n``` ``, offsets 1 and 2 parse no completed opener and owe a hard break; offset3 parses an opener and owes an ordinary newline. `openingOffset0` through `openingOffset4` are constructed. This no longer lets suffix backticks retroactively establish the original partial opener. Prefix parsing is independent of the production scanner and is the correct information boundary for that repaired witness. A different generated history still enters opening-info semantics explicitly excluded by the old law; see MIX-R2b.

**MIX-R3: selected-collision receiving omission repaired in source by the new property.** `mixed-code-driver-oracle.ts` executes the actual mixed prefix, types a separately modeled suffix containing a fence run, selects the entire real input and activates the real code button. It does not pass through the old selected-ticks-to-caret rewrite for this final action. Its model predicts literal source, body-relative selection and exactly one code block, with no chosen fence width. The check accepts backtick or tilde wrappers of any sufficient matching width and checks the actual correlated item/source preview DOM. This is the independent allowed-result formulation requested by MIX-R3. It protects selected-code receipt at this checkpoint; it does not yet prove arbitrary further edits after a free-width serialized block. Native/fallback collision reach remains MIX-R5.

The first repaired receipt I read, `build/formatting-oracles/mixed-prefix-and-redo/summary.md`, reports 77 baseline checks, two selected reproducible law kills and zero gaps. It reuses run ID `ff84bd75ab70` from the failed earlier inputs; identify it by directory and source hashes. `mixed-selected-collision/summary.md` is **not green**: the file did not load because constructed `listPrefix` was rejected by `canShrinkWithoutContext`; its selected mutant is blocked, not killed. `mixed-selected-collision-admitted` was active when read, so this review asserts no completed receipt for the new semantic receiver.

### MIX-R2b — Prefix parser still admits an unadopted invalid-info boundary [P1]

- **Challenged claim:** every generated mixed break composes only the adopted existing fence behavior.
- **Smallest legal generated history:** scene `code`, body `a`; type `x` over range `[3,6]` (replace the opener/body/closer separating newlines and `a`); then Shift+Enter at end. The resulting input before break is `` ```x``` ``. All offsets, action text and two actions are inside the current grammar.
- **Independent rival predictions:** MarkdownIt rejects a backtick fence opener whose info string itself contains backticks, treating this as inline source, so the current prefix parser owes a hard break. The existing scanner accepts its leading triple run and owes an ordinary newline. The older break law explicitly excluded invalid opening info strings. Therefore this disagreement is not already decided by the old envelope's authority.
- **Evidence status:** read-from-source witness; no production probe or browser replay by this reviewer. It is a concrete contract/domain question and production bug hypothesis, not an assertion that either policy is already the adopted answer.
- **Repair/next experiment:** preserve this witness, trace the approved editor rule for malformed/partial Markdown and either derive an independently annotated prefix rule with that authority or present a policy change. Do not automatically change production to satisfy MarkdownIt and do not silently filter out a history newly admitted by broad mixed typing. Any later RED result must distinguish model-policy disagreement from a violated adopted product law.

### MIX-R4 — New reach predicates can report states that the current input does not have [P2]

- **Source:** `mixedStates:161–164` uses initial `scene:code` plus absolute range coordinates to name partial/opening-delimiter states, and historical action-name subsequences to name a cleared-branch redo.
- **Smallest false reach witnesses:** start in a code scene, replace all text with `abc`, then break at offset1: `partialFenceOpening` is reported even though no fence remains. For the branch predicate, B/I/undo/type/undo/redo reports `branchClearedRedoAttempted`, although its final redo has a real replacement on its modeled redo stack; it never attempts redo while the branch is empty after the new edit.
- **Evidence status:** read from source, no histories changed. The current first-action opening constructions and immediate undo/type/redo construction do reach their intended states today. The defect is that the declaration does not require those semantics to remain true after a future construction edit.
- **Repair:** compute these states while folding the independent current input/history. Require an actual partial delimiter at the break input; require a redo action in a known-empty branch immediately attributable to an edit after undo. Also declare the important literal-body/closing-fence break and accepted/declined list states named by the current compositional promise. This is ORC-015, not a new product law.

### MIX-R5 — Selected-code fallback receiver is generated but never required [P2]

- **Source:** every `mixedCodeCases` prefix is native true (`mixed-code-model-oracle.ts:9–12`). `mixedCodeStates:18–19` declares viewport, activation, selected collision, list prefix and undo-prefix labels, but neither native nor forced fallback. `mixedCodeArbitrary` does vary that Boolean through its arbitrary prefix.
- **Smallest consequence:** a formatter design that mishandles selected collisions only after `document.execCommand` is forced false has no guaranteed receiving witness in this new property. The old exact-source mixed property only delivers an empty caret when a selected range contains ticks; its required fallback construction therefore does not supply this missing combination. Random selection of false is not required reach.
- **Evidence status:** read from source, no mutant run. No claim is made that the present implementation has this defect.
- **Repair:** declare native and forced-fallback selected-collision states and construct both through the same semantic model/check. Construct a wide collision at the grammar's upper width as well if citing the reusable width range at this receiving boundary. A missing native transaction must remain a setup/runtime outcome until a registered law comparison rejects a wrong design.

### Rebuilt selected-code observation and checkpoint audit

Take any independently modeled mixed prefix output `P`; append `\n` plus six backticks plus `a\n\x60\x60\x60\nb.`. The suffix ends in a period, so the selected input has no trailing LF to remove. The contract owes a code body exactly equal to that complete input, selected from body offset0 through its length, and rendered as one code node with one renderer-added LF. A fixed triple-backtick wrapper would close at the embedded triple line and lose that literal observation.

`mixedCodeModel:14–16` derives these facts from `mixedModel` and input suffix only. The driver records the actual prefix steps, `collisionInput`, exact selected body/body-relative endpoints/focus, actual enclosing source and the actual preview DOM (`mixed-code-driver:18–26`). The preview response is correlated with the actual item ID and actual submitted resulting source, and DOM normalization is checked before rendering is observed. No expected source is used to select a production payload. The law check compares all prefix steps plus all five resulting observations and rejects duplicate/missing/reordered checkpoints. The independent envelope relation deliberately leaves marker and width free while requiring a valid complete enclosing pair. This source design is sufficient for the original selected-collision receiver concern.

A wrong action that produces no preview request can still cause `waitForResponse` to time out before the overall driver returns. That outcome is not a kill, even when earlier recorded selection/envelope data would have distinguished the defect. The current review names it as a challenge/failure-classification obligation, not a fabricated observed gap: execute a dropped-code-action or missing-preview design and preserve the actual result category. Do not count a host wait timeout as law enforcement.

### Requirement outcomes after these repairs

| Requirement | Re-review outcome |
| --- | --- |
| ORC-001 | Original authority retained. MIX-R2b remains an unresolved new parser-domain premise. |
| ORC-002 | Accepted: pure command composition and semantic collision model import no production classifier/result. |
| ORC-003 | Existing mixed responsibilities remain clear; semantic receiver has law/model/driver/check and explicit terminal checkpoint limits. |
| ORC-004 | Original redo action restored and collision receiver adds real selected input. Invalid-info history and currently rejected `listPrefix` admission need resolution/receipt. |
| ORC-005 | MIX-R1/MIX-R3 repaired in source at their promised actions/observations; execution receipt for the new receiver pending. |
| ORC-006 | Repaired main-property receipt has two selected kills; semantic-receiver calibrations are present, completed runtime/mutant receipt pending. |
| ORC-007 | Same fixed/random registered budgets retained; direct replay supported. Failed admission receipt remains non-green. |
| ORC-008 | `redoKnown` has a distinguishing continuation: known-empty redo is legal and expected to preserve source, unknown history cannot assert that source. Terminal collision law avoids importing a free serialization choice into later expected source. |
| ORC-009 | Input intents, concrete ranges, modeled native history and body-relative selection are mapped. |
| ORC-010 | Shared cleanup/capture cause preservation accepted from source. Missing preview can still be a timeout/nonkill and must stay classified that way. |
| ORC-011 | Prefix parser and renderer/envelope relations are meaningful independent formulations; authority question MIX-R2b persists. |
| ORC-012 | Original raw findings retained, source dispositions and exact run directories recorded; no complete mixed closure claim. |
| ORC-013 | Required opening offsets now include below/at threshold. Code widths and invalid-info boundary require the specific receiving witnesses above. |
| ORC-014 | Actual React selected-code and real preview now receive the controlled input. Forced fallback collision receiving remains random-only (MIX-R5). |
| ORC-015 | Still open: MIX-R4 predicate fidelity and MIX-R5 required collision fallback. |
| ORC-016 | Accepted from source: both registrations use law-only property paths, including constructions/calibrations. |

All requirements apply to these new/changed stateful generated properties; none is waived.

Reviewed SHA-256 inputs:

```text
7e2b4ee20b45c3307c70b102b8ea840df33f1598e8b843aaa6571b2bf313e153  test-ui/editor-mixed.oracle.test.ts
4db8a8159ce985e62eb5d28b959a0025d8210279c61bba169fe07ac7b4fa50ba  test-ui/editor-oracles/mixed-model-oracle.ts
7a231faf98d3a0b1f8adddf0c14fdf7bf031f2c1b6ee6e6b82936c80c13675b7  test-ui/editor-oracles/mixed-driver-oracle.ts
ef2a28505a3ff97e35f0a1d8d5179191679bcde16d8376df72dbad73d6198c77  test-ui/editor-oracles/mixed-code-model-oracle.ts
8ad4ecba856c6505657c9c03a5b0125ca91dc98e4689299679d317948e89007e  test-ui/editor-oracles/mixed-code-driver-oracle.ts
```

## Completed mixed/CommonMark receiving review

2026-11-18. The subsequent user decision adopted CommonMark's invalid-backtick-info distinction; the oracle was corrected, demonstrated registered browser RED before production changed, and the minimal scanner fix passed its complete owned break mutation campaign. See [the execution addendum](commonmark-info-review.md#completed-execution-addendum) for independently read results, checkpoint attribution, current source hashes and retained scope boundaries.

Read `build/formatting-oracles/mixed-info-receiving`, run `4728aaef036c`: both129-check unmutated passes are green, with no skips/exclusions/nondeterminism. All three selected wrong designs are rejected by registered laws: native undo loss through the structure history; fixed triple wrappers through the selected-collision receiver; and original invalid fence-info scanning through the actual type→Shift+Enter history. The report is an explicit three-mutant partial campaign, not a complete mixed mutation sweep. No timeout or setup failure is counted as a kill.

The original MIX-R1/R3 receiving omissions are repaired and have relevant actual receiving challenges. MIX-R2/MIX-R2b's authority/prefix issues are resolved by the adopted CommonMark delta and its independent model/RED/GREEN evidence. MIX-R4's after-scene, closing-delimiter and populated-redo false-positive controls pass against the current input fold. MIX-R5 now requires both native and forced-fallback collision histories at the minimum/maximum generated widths. No reviewed blocker remains for these specific repairs.

This verdict preserves the broader limitations: no complete mixed mutant audit follows from three selected kills; selected colliding code ends at the literal rendering checkpoint; arbitrary later free-width composition, unknown native grouping, OS clipboard, arbitrary Markdown containers and additional engines/devices remain separate claims. The earlier raw findings and failed/blocked receipts above remain part of the review record. No production or oracle source was changed by this reviewer.
