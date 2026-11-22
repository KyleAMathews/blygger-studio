# Browser receiving closure receipt

Independent read-only source review, 2026-11-18, of `/Users/kyle.mathews/programs/blygger-studio/.worktrees/oracles-explore`. Uses pinned `@tanstack/oracles` preview `97a4e7a`, `oracles-review`, checklist v1 and glossary, read fully during this continuing review. No tests, mutants, or repository edits were run by this reviewer. This receipt supersedes the migration verdict in `/private/tmp/blygger-browser-receiving-final.md`.

## Verdict

**Static no-loss approval for all 28 original browser product observations. BR-008 is closed. No remaining receiving-migration blocker was found.** The new `emptyEmphasis` grammar/model/driver is consistent with the already adopted source/caret and native-undo laws. This is a source-backed migration approval, not a claim that the latest broad mutation campaign has zero gaps or that unexecuted follow-up edits have passed.

## BR-008 exact reconstruction

`session-model-oracle.ts:6` now admits period as an ordinary prose unit. Lines 24–25 construct the tab cases with `before:'Plain', body:'prose.'`; lines 80–81 fill exactly `Plain prose.` and press real Tab. The driver records unchanged source and actual focus departure. Both viewport profiles have constructed witnesses. The old desktop input and both original assertions are therefore retained exactly.

## All 28 product observations

| Original history | Count | Current receiving route |
| --- | ---: | --- |
| H1 Composer emphasis/link/state | 8 | B/I/B/I each source; undo source; undone source through kind switch before redo; link placeholder; typed target. `baseSession` reconstructs `one two three` and `see this`. Both profiles. |
| H2 Full editor → quick edit | 3 | Actual loaded item, whole-document I/I; same item reopened in quick edit and B. Original random marker family is admitted by generated nonempty alphanumeric body. Both profiles and explicit loaded checkpoints. |
| H3 List typing/undo | 5 | Tab source, focus, exact ordered/multiplicity-preserving preview child texts, Shift+Tab source, undo source. Exact `fruit/apples/pears` witness. Desktop retained, mobile added. |
| H4 Off-list Tab | 2 | Exact `Plain prose.` source remains; actual textarea loses focus. Desktop retained, mobile added. |
| H5 Verse | 3 | Exact original Tyger source with hard break; actual Worker preview one paragraph and one `<br>`. Desktop retained, mobile added. |
| H6 Toolbar | 7 | Indent source/focus, outdent source, break source, code-typed source, visible exact first-item explanation, unchanged source. Exact original text/caret journey; complete unchanged source strengthens old final prefix assertion. Both profiles. |

All original intermediate observations remain in the action snapshot sequence consumed by the registered whole-history comparison. Extra redo, loaded-source, formula, and other receiving observations do not replace any of those 28. Login/editor-visible checks remain setup gates and are not counted as formatting laws.

## New empty-emphasis receiving journey

The model does not infer marker semantics from production output:

1. `session-model-oracle.ts:65–68` chooses the first generated emphasis command, derives its semantic width, builds an external empty pair, and seeds the model-only `stars` annotation to that width.
2. `fill` passes literal source/caret through the actual textarea (`session-driver-oracle.ts:42–45`). Its `stars` field is only model annotation; the driver never sends it to production.
3. The existing independent `emphasisEdit` model receives empty body and external marker counts (`session-model-oracle.ts:124–128`). It predicts deleting exactly the surrounding pair, leaving an empty caret at their opening position. It does not require a second special deletion model.
4. The real key goes through the SPA's `onFormatKey` into browser formatter `applyEdit`. The selected deletion covers only ASCII star markers at grapheme boundaries; surrounding generated Unicode is separated by spaces. Thus these histories supply the precise premise for the real native deletion path, not the grapheme fallback path.
5. `removeEmpty` compares full source, selection and focus. Native histories then compare undo restoring the original pair and redo removing it again (`:69–70`). The undo model stores the pre-edit source before the deletion (`:107–109,121–123`). Forced native-failure histories omit the native-undo promise, consistent with the stated law limit.

Rebuilt example from the independent law: bold starts `one **** three`, caret 6; B deletes `[4,8)` and yields `one  three`, caret 4. Undo must restore `one **** three`; redo must return `one  three`. Italic analogously starts `one ** three`, caret 5, deletes `[4,6)`, and has the same unstyled result/caret. These predictions follow the external-marker rule and source-history law without consulting formatter output.

A plausible wrong design is to make deletion with `setRangeText` and skip a native undo entry: immediate source can still be correct, but undo would reach earlier input rather than restore the pair. The newly recorded undo source distinguishes that design. This is a proposed/source-supported challenge here; current focused execution belongs to the parent and was not duplicated.

Constructed cases cover bold and italic on both profiles (`session-model-oracle.ts:27`); random histories vary surrounding prose and native/fallback availability. The new journey uses the same model/driver/check route as the campaign and contains no ordinary example-based test. No new correctness defect found.

## Other prior receiving findings

Prior BR-001–007 closures remain intact: undone-state rerender before redo; loaded whole-source and same-id transitions; positive-size and visible explanation; source+item-correlated preview plus normalized DOM commit; complete setup cleanup with preserved error; receiving prose remains the approved nonempty domain; mobile pane setup precedes final textarea focus/selection. No new production defect is asserted.

The request also mentions formula boundary, malformed-edit capture and mixed-grapheme changes. Those belong to companion oracle reviews; this receipt does not supply a new whole-companion correctness verdict merely because their source was visible. The independent dollar axis does not alter any of these 28 receiving observations.

## Evidence boundaries

The parent reports a completed pre-follow-up browser run with 2,884 checks, 368/379 kills, 27/27 authored kills and 11 open gaps (including three driver crashes). Because these follow-up edits occurred afterward, those figures must not be presented as executed proof of this exact source. The parent has a focused runner active; its results must classify assertion kills separately from crashes, setup failures and timeouts. This receipt claims static observation retention, not global bug-class closure.

## Checklist disposition

| ID | Scoped outcome |
| --- | --- |
| ORC-001 | Adopted migration/source/caret/native-undo authority remains identified; receiving limits are explicit. |
| ORC-002 | Empty pair judgment uses independent semantic width/body annotations and prior source state; no production outputs feed expectations. |
| ORC-003 | Law, grammar, model, real receiving driver and check remain distinguishable; empty-pair/native-deletion prose was updated. |
| ORC-004 | BR-008 exact-input reconstruction repaired; all six original history families and all 28 observations have routes. Empty-pair axes have an explicit contribution. |
| ORC-005 | Real SPA key/toolbar listeners and native browser editing are called; complete source/caret/focus and requested actual preview structure are retained. |
| ORC-006 | Plausible non-undoable deletion challenge named above. Execution outcome is not invented; require focused result evidence. |
| ORC-007 | Registered property retains fixed seed, random campaign and common budget/replay. No local runner duplication. |
| ORC-008 | Initial `stars` annotation is needed to distinguish removing an existing pair from adding a new pair; prior source is needed for undo. |
| ORC-009 | `stars` is a model-only semantic count; action/checkpoint/surface terminology remains consistent. |
| ORC-010 | Prior receiving synchronization/cleanup repairs remain; no new failure-fidelity defect found in empty-emphasis path. |
| ORC-011 | Existing independent actual-preview second formulation remains; no new shared semantic fault requiring another formulation identified here. |
| ORC-012 | This is a scoped source receipt with hashes below. Preserve accepted disposition in the versioned final evidence; temp receipt alone is not final versioned audit evidence. |
| ORC-013 | Empty external pair supplies the nonempty-range/empty-insert native-deletion side; ordinary nonempty emphasis supplies the insertion side. Both histories are legal and have distinguishing source/undo observations. |
| ORC-014 | Real browser/native command supplies the receiving premise; forced failure is explicitly separate and makes no native-undo claim. |
| ORC-015 | Empty-emphasis, device and native states are declared; four native empty-pair cases are constructed in addition to existing receiving cases. |
| ORC-016 | No ordinary example/unit tests in the reviewed oracle files; all named regressions use the same registered model/driver/check. |

No additional checklist requirement is inapplicable to the existing generated receiving property; execution-dependent obligations remain execution-dependent, not waived.

## Reviewed SHA-256 fingerprints

```text
674c8481f0c38381844aea4d661b8fcf592c0bd63e4413282b19118cd98b6191  test-ui/editor-session.oracle.test.ts
d2215b1b72677e189a4736e2fa7305178ded516158e62c7a2b88abc937afc482  test-ui/editor-oracles/session-model-oracle.ts
2d4343571ef7e8b7d16aff7384a8894388828d8b3e8ccd593f5e31fec2047571  test-ui/editor-oracles/session-driver-oracle.ts
fd9a53e14700387509b611c7e6be63b993cf0e7131a5f5619fa67d56e2fca8cb  test-ui/editor-oracles/inline-model-oracle.ts
e588020354af8cd9656b9ef6ade0b61416d500392b8b0d0d10bda285e6ad4741  scripts/formatting-oracle-application.ts
```
