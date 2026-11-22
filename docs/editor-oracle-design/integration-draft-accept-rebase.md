# M3 accepted-source consumer: integration rebase receipt

Reviewed 2026-11-19 by `/root/review_receiver_transport`. Integration HEAD is `2d153071e83261e62be5a1ec926c3f1f3e2fe26a`, plus the original uncommitted oracle delta and the parent's gallery-build/thread-toggle adaptations. This receipt binds a focused input snapshot rather than claiming that the dirty integration tree has a new commit identity.

**The accepted revision 2 patch applies without changes.** No upstream continuation blocker was found in this focused source review. Application, registered correct-production acceptance and M3 rejection remain pending. No runtime oracle patch was applied, production source edited, browser/test/build/benchmark job launched, or active control/reference process interrupted.

The installed `oracles-review/SKILL.md`, checklist v1 and glossary were reread in full. The full original source review remains `draft-accept-proposal-review.md`; this record checks applicability and the upstream receiving changes without replacing its original findings or turning source acceptance into execution evidence.

## Exact applicability and provenance

Accepted patch: `/private/tmp/draft-accept-oracle-proposal-150es87g/proposal.patch`, revision 2, SHA-256 `e66899ed091040470bdfd0888d4c0c6a182dfa177074ce2d76b00ee58fd3e3c9`. Its original oracle base was `28b0c8d642a87e5810ad6eabd95c2d1714c53396`, package pin `97a4e7a`.

New scratch receipt root: `/private/tmp/blygger-m3-integration-rebase.WtbZBjPh/`.

- `proposal.patch` is an exact copy of the accepted patch, with the same SHA-256.
- `integration-original/` contains the three current integration oracle inputs.
- `integration-proposed/` contains those inputs after applying the patch **in scratch only**.
- `review-inputs/` preserves 19 scoped integration/installed-source inputs, including Base UI's actual button/toggle implementation and oracle-review instructions.
- `pre-integration-inputs/` preserves the three relevant original oracle-worktree production sources for correspondence checks.
- `apply-check.txt` records successful `git apply --check --verbose`; subsequent scratch-only application also succeeds.
- `source-check.mjs` and `source-check-receipt.json` record syntax/AST correspondence checks, with no oracle or product module imports.
- `provenance.json` records exact source, output and evidence hashes. SHA-256: `f1083075302681c3b1787e91f996737888c6176a1964ab7890f46ce5a5b48189`.

All three integration originals equal the accepted proposal's original hashes. All three scratch-applied files equal its accepted proposed hashes:

| File | Integration original SHA-256 | Scratch-applied / accepted proposed SHA-256 |
| --- | --- | --- |
| `test-ui/editor-receivers.oracle.test.ts` | `9be323f56ae89ee4a4a4c95d0b3ac1451e66ba9eb4be5406e458f26db120bf45` | `b443b6abbc0f682f9fe43eba5679f7f968a0466407c18232d379fccc92ad9df8` |
| `test-ui/editor-oracles/receiver-model-oracle.ts` | `d956c4edfc0ea6af60f015903ea4fcf8654cb6b8e77acf8e36030c2c5a06c7e0` | `1d4f563fd32c7203da0634d7b717dcf8d98984689e6fbfd0610329d6a5caaf73` |
| `test-ui/editor-oracles/receiver-driver-oracle.ts` | `3d4ea719c43571dec3ad362d6062695cad50c34942253c4ae8ec9b94896efa00` | `a50f521926a04106045b9fbfea2682d644dd1496b57c7d4a78465ba058ffb088` |

There is no rewritten rebase patch or semantic adaptation hidden behind the original approval. The same 52 prior constructions, four added save continuations, optional generated continuation, seed `20261118`, budget 25, old checks/calibrations and four new calibrations are retained by exact accepted-output identity. These counts are source facts rather than measured execution reach.

TypeScript parsing reports no syntax diagnostics for the three scratch-applied files. This is not a typecheck or lint run. Every captured integration input and the three oracle inputs was rehashed after the audit and still matched its initial snapshot.

## Rebuilt obligation and continuation

From the already adopted restore/source-save promises, arrange historical `published α😀` and working `- parent\n    - α😀`; restore successfully; activate ordinary Save before any edit. Both the complete submitted source and the subsequently stored source must be `published α😀`. Rejected restoration instead retains and saves the original working source. No later input occurs during the bounded save, so the component-public current-result receipt is true on successful persistence. This prediction uses arranged inputs and outcome, without Draft revision arithmetic or output-derived expected text.

The existing accepted continuation still records held readonly behavior, receives real restore completion, samples settled source/gates, and then consumes that source through native Save, actual held PATCH, original Draft.save completion and independent server GET before bold can repair stale working state. `acceptedSaveSubmitted` and `acceptedSave` reach the registered check before `followup`. Dirty getters remain diagnostics; they are not promoted to UI promises. The new response waiter remains immediately observed and drained before native delivery. DAP-001/DAP-002's source repairs are unchanged.

Executed AST source comparison against the pre-integration oracle worktree found byte-identical:

- `Editor`'s `save`, `edit` and `restore` initializer bodies;
- its initial Draft construction/persist callback block;
- the entire `src/ui/draft.ts` file;
- `createDraftAction`'s `save` and `restore` switch branches.

The exact M3 anchor `this.edit(text);` still appears once in Draft.accept. Its semantic key remains `src/ui/draft.ts#Draft.accept:delete-call:this . edit ( text ) ;`. This is source/anchor correspondence, not admission into a new executed report or a mutant kill.

## Base UI Save control and pane groups

The upstream full-editor Save control is now `DesignButton`, but retains `id="save-draft-btn"`, `disabled={action.busy}`, text `save draft`, and `onClick={() => void action.run(save)}`. `src/ui/buttons.tsx` forwards the id and handler through SystemButton to Base UI Button and computes `disabled={disabled || loading}`. This caller supplies no custom render, nonnative mode, loading mode or disabled-focus override.

Installed Base UI **1.9.0** renders a native `<button>` by default. `Button.js` passes `nativeButton=true` and `focusableWhenDisabled=false` into `useButton`; `useFocusableWhenDisabled` gives this ordinary native control its real `disabled` property. `useButton` supplies `type="button"` and leaves native Enter activation to the browser. Thus the driver still targets the actual Save button, receives its real trusted key event, invokes the existing action/save path, and observes actual disabled state. No selector, forced click, synthetic save invocation or expected-result change is needed in the patch. Fresh registered native-key delivery is still required before execution acceptance.

Pane controls now use ToggleGroup/Toggle. They retain `.pane-toggle`, each `data-pane` value, their parent `onClick={() => setPane(value)}`, and `.editor-grid[data-pane]` commits. The wrappers forward these props. Installed Base UI renders native toggle buttons and a `role="group"` container. The driver selects each actual `[data-pane]` button directly, so it does not depend on the prior wrapper class, radiogroup semantics or roving Tab order. Programmatic focus plus trusted Enter remains the phone input; the hidden desktop control's actual DOM `.click()` remains the explicitly controlled input. The driver still waits for the receiving `data-pane` commit rather than correctness of source, saved text, dirty state, errors or busy state. Roving-focus behavior is not newly certified by this source audit.

Save's pending `action.busy` still disables Save rather than the pane toggles. Its completion still clears busy through the existing counted `useAction.run` finally path. Starting that explicit action clears an earlier restore error; the accepted save check continues to observe actual error/saved DOM output rather than await it. `.editor .save-state` remains the same saved-feedback node, separate from the upstream toast-role changes.

The gallery build adaptation retains the Draft delegate as `globalThis.__oracleDrafts.Draft`; it does not introduce a second bundled Draft class. The accepted one-shot prototype observer therefore still wraps the same class used by the actual editor. It restores the original method before invocation and returns the original result. The new gallery flag/stub and thread-toggle locator changes are already in the hashed integration inputs and do not alter this accepted three-file patch. No bundle was rebuilt in this audit; environment/cache and generated CSS binding gates from `integration-upstream-receiving-review.md` remain.

## New publishTangle path stays separate

Upstream `publishTangle` adds confirm/retry/source-read behavior used by Compose, ItemRow and Editor. Its Editor/ItemRow callers can independently `Draft.accept(done.source)` and set React text. This is a separate production replacement path; it has not been added to the held-restore law or claimed as covered by this extension.

The receiver's historical setup publishes ordinary arranged source through `context.request.post`. That setup does not activate the UI publish helper. Its generated ordinary alphabet cannot form the tangling marker, and the new continuation activates only `#save-draft-btn`, never `#publish-btn`. Neither shared Draft identity nor bundled/helper ownership supplies missing publish behavior receipts.

The conditional late-edit-versus-publish-rewrite risk identified in `integration-upstream-receiving-review.md` remains an unresolved source hypothesis. This receipt neither reproduces nor dismisses it, adopts a publishing/reconciliation policy, changes protocol semantics, or repairs production. Cancel/retry/error/source-read and later-input schedules require their own adopted receiving scope and registered execution.

## Source disposition and execution gates

The upstream changes require no edit to the accepted M3 patch. It is source-applicable to the bound integration snapshot. Keep runtime application coordinated with the parent after active controls and the frozen-reference policy permit a new input snapshot.

Application must still be followed by registered correct-production runs of all old and added histories, old/new calibrations, fixed and random campaigns at the existing budget, and trace-gated declared save states. Replay the exact M3 key and require a registered semantic source-consumption rejection, preferably `acceptedSaveSubmitted.submitted`; a missing native key, HTTP/promise/pane receipt, setup error, crash or timeout is not a kill. Check successful/rejected, Unicode and both-viewport neighbors and preserve immediate-bold behavior. Bind new source/bundle/artifact manifests rather than attributing these proposed observations to any currently running control or original reference.

No production RED, GREEN, measured reach, calibration result, mutant rejection or bug-class closure is claimed here.

## Checklist v1 scope accounting

| Requirement | Focused rebase outcome |
| --- | --- |
| ORC-001 | Existing restore/source-save authority retained; no new publish or private-counter law. |
| ORC-002 | Exact accepted input-only model retained; no output-derived expectation introduced. |
| ORC-003 | Accepted prose/parts/checkpoints remain byte-identical; no rebase edits. |
| ORC-004 | Accepted grammar and all old/new history definitions retained; execution reconstruction remains pending. |
| ORC-005 | Native Save, real source/persistence boundaries and pane commits remain source-compatible; registered delivery pending. |
| ORC-006 | Exact accepted calibrations and unique M3 anchor retained; no calibration or mutant execution performed. |
| ORC-007 | Same fixed seed/budget/campaign declarations retained; no campaign executed by this audit. |
| ORC-008 | No new model-state change in this rebase; accepted pre-edit consumer distinction retained. |
| ORC-009 | UI feedback, component result and dirty diagnostics remain separated; publish replacement explicitly separate. |
| ORC-010 | Accepted waiter/drain/prototype cleanup source retained; no new resource created by a runtime patch, no fault execution. |
| ORC-011 | Accepted whole request versus server-readback formulation retained; source audit adds no alternative semantic model. |
| ORC-012 | Original raw findings/source acceptance preserved; exact integration inputs and scratch outputs bound here. |
| ORC-013 | Historical/current source distinction and rejected/Unicode neighbors retained; receiving measurements pending. |
| ORC-014 | Base UI and integration boundary premises inspected in actual installed source; fresh receiving witness still required. |
| ORC-015 | Same declared states and constructions retained; static counts are not measured reach. |
| ORC-016 | No ordinary tests or fixed expected-answer oracle additions; accepted registered law structure retained. |

This is a focused source-continuation audit of an already reviewed proposal, not a new full oracle certification. No generated-property requirement is waived; evidence not produced in this audit remains an execution gate or is carried by the named original source review.
