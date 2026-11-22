# Browser receiving-oracle repair re-review

Read-only source review of the latest worktree at `/Users/kyle.mathews/programs/blygger-studio/.worktrees/oracles-explore`, 2026-11-18. No runs or repository edits; parent's campaign is active. Uses pinned `oracles-review` skill/checklist v1/glossary already read in full in this continuing review. Previous report: `/private/tmp/blygger-browser-receiving-review.md`.

## Verdict

The migration now reconstructs the original source and same-item histories, including the previously lost undone-state rerender. BR-001, BR-002, BR-004 and BR-005 are repaired in source. BR-003 is improved but does not yet match the original visibility observation exactly. Two newly visible legal-history/setup defects below prevent an unconditional no-loss approval from this source review. No ordinary unit test was introduced in the oracle files.

## Prior finding disposition

| Finding | Source disposition |
| --- | --- |
| BR-001 undone-state React receipt | **Repaired.** `session-model-oracle.ts:51–54` now inserts `undoneState` between undo and redo for native composer histories; source is compared there. Declared/constructed `undoRerender` at `:27`. Driver clicks actual kind radio at `session-driver-oracle.ts:56`. |
| BR-002 loaded whole source and same-item full→quick | **Repaired in source.** Non-composer inline histories perform `loaded`, not `fill` (`session-model-oracle.ts:44–49`); model initializes from planned `h.body` and whole-source selection (`:97`). Driver creates a fragment for this journey (`session-driver-oracle.ts:25`), reads actual loaded text and selects it (`:35–37`). Constructed `editorToQuick` histories execute I/I, then same-id navigation and quick bold (`session-model-oracle.ts:49,56–58`; driver `:57–64`). Both profiles are constructed. New mobile focus ordering issue is BR-007 below. |
| BR-003 visible explanation | **Partially repaired.** Source now checks client rects and visibility, rejecting `display:none`/`visibility:hidden`. It still accepts zero-size boxes and `visibility:collapse`, which the original Playwright visibility assertion rejects. See BR-003R. |
| BR-004 preview correlation | **Repaired.** Driver begins collecting responses before action (`:48–54`), snapshots actual post-action textarea source (`:70`), matches request body source+item (`:73–74`), and waits for normalized `innerHTML` equality (`:80`). Expected model source is not used to settle the checkpoint. |
| BR-005 temporary directory cleanup | **Repaired.** `formatting-oracle-application.ts:21–49` encloses every setup phase after mkdtemp. Cleanup separately attempts host disposal and directory removal (`:13–19`), preserving setup error as cause if cleanup also fails (`:49`). |

## BR-003R — Visibility still differs from the adopted observation [P2]

- **Claim/authority:** The original toolbar test's `toBeVisible()` explanation assertion, adopted by the browser migration.
- **Current source:** `session-driver-oracle.ts:84` accepts `getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden'`.
- **Smallest witness:** A `.toast` with the correct text and CSS `width:0;height:0;padding:0;border:0;overflow:hidden` has a client rect but no nonempty bounding box. The new boolean is true while Playwright `toBeVisible()` is false. `visibility:collapse` also passes the present string comparison.
- **Evidence:** Read from source; no style mutation executed.
- **Repair:** Observe `.isVisible()` on a locator for the exact existing explanation inside the registered driver, or reproduce the same rule with computed visibility exactly `visible` and a nonzero bounding box. A locator observation inside an oracle driver is not an ordinary example test. Keep the model's public visibility obligation.
- **Requirements:** ORC-005 public observation; ORC-006 distinguishing wrong answer.

## BR-006 — Newly admitted empty verse prefix gets the wrong model answer [P1]

- **Claim/authority:** Preserve accepted blank-line and hard-break behavior. The existing adopted break rule inserts a plain newline on a blank current line; it inserts a backslash hard break after nonblank prose.
- **Current grammar:** `session-model-oracle.ts:14` now permits `before:''` for every journey, including verse. `sessionPlan` at `:70–72` fills that empty string, Shift+Enter, then types nonempty body.
- **Current model:** `:135–137` always inserts backslash+LF; `:145` always predicts one paragraph and one `<br>` for verse. Both answers are wrong for the now-legal empty-prefix history.
- **Smallest legal witness:** `{...baseSession, journey:'verse', before:'', body:'x'}`. Correct accepted behavior is source `\nx`, one paragraph, zero hard breaks. The model expects source `\\\nx` and one `<br>`.
- **Evidence:** Read from source and adopted blank-line law; no production run. Production `breakEdit` at `src/ui/format-shortcuts.ts:149–156` implements the adopted blank-line result, so this must not trigger a production fix.
- **Repair:** Keep the newly admitted history and model the blank-prefix outcome from the independent accepted rule, including structural preview expectations. Construct the blank-prefix case and nearby nonblank case so future changes preserve the distinction. Alternatively, if empty context was meant only for inline selection generation, redesign the journey grammar explicitly and account for its domains; do not quietly filter out this admitted boundary merely to pass a campaign.
- **Requirements:** ORC-001 executable law alignment, ORC-004 grammar range, ORC-013 distinguishing boundary, ORC-015 reach.

## BR-007 — Mobile pane setup steals focus after whole-source setup [P2]

- **Claim:** The newly constructed loaded whole-source mobile histories should begin with a focused editor and selection covering loaded content, then exercise real keyboard listeners.
- **Current source:** `session-driver-oracle.ts:37` focuses/selects the textarea, then `:38` clicks the mobile draft pane button. The button is an ordinary native button (`src/ui/authoring.tsx:2420–2431`) without a focus-preserving pointer handler. The initial `loaded` action does nothing before capturing `focused`; the model unconditionally expects true (`session-model-oracle.ts:107,145`).
- **Smallest legal witness:** Constructed `editor-mobile` or `editorToQuick-mobile`: final setup click focuses the pane button; `loaded.focused` is false and subsequent keyboard shortcuts can target that button rather than the textarea. This is a driver-created failure of correct product behavior, not an intended product action in the modeled history.
- **Evidence:** Source-supported DOM focus order; no browser run by reviewer. Browser platform focus differences are why setup should explicitly establish the modeled premise after all setup UI clicks.
- **Repair:** Select the draft pane before final `box.focus()/setSelectionRange`, or repeat those two setup operations after the pane click. The loaded source must still be observed before any fill.
- **Requirements:** ORC-005 controlled premise/path, ORC-014 receiving setup fidelity.

## Updated 28-observation migration assessment

- H1's eight observations now have their correct action ordering, including undone source surviving kind-switch before redo.
- H2's three observations now have loaded full-source selection on both receiving surfaces and same-item full→quick continuity. Fix mobile focus setup before treating the actual-app witness as established.
- H3's five observations, H4's two, and H5's three remain recorded as before; preview correlation now reaches the requested source. The newly admitted empty verse boundary needs its independent model repaired (BR-006).
- H6's seven observations are present; source preservation strengthens the original prefix check. Visibility fidelity remains BR-003R.

Fixed original histories in a law-backed generated action grammar are appropriate regression inputs; they do not make this an ordinary example test. The model does not use production outputs to predict command results, and each retained action snapshot reaches the registered whole-history comparison. Companion command laws supply the semantic rules; the receiving law adds actual React/DOM/preview transitions.

## Checklist update

ORC-001/003: Law authority remains clear, but new empty verse domain disagrees with model. ORC-002: No new model-independence defect. ORC-004/013/015: Restored source and transition histories are visible and constructed; add empty-prefix boundary. ORC-005/014: Four prior receiving defects repaired; precise visibility and mobile premise findings remain. ORC-006/007: Execution and distinguishing kills remain parent's evidence responsibility; no run claimed here. ORC-008/009: No new unnecessary-state or vocabulary finding. ORC-010: App-host cleanup repaired; context cleanup remains in finally. ORC-011: Existing actual-preview second formulation remains. ORC-012: Save final accepted review/evidence in versioned record; this temp report alone is not final audit evidence. ORC-016: No ordinary unit test in reviewed new files. All requirements are applicable to the receiving property or are evaluated through companion oracle evidence; no additional inapplicable requirement was introduced by this follow-up.
