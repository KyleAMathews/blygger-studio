# Authoring assessment

Self-review on 2026-11-18 in `oracles-explore`, based at
`28b0c8d642a87e5810ad6eabd95c2d1714c53396`. This is a focused design assessment,
not a new independent audit of the entire suite. Sources are the pinned
`@tanstack/oracles@97a4e7a` authoring skill (`oracles-design/SKILL.md`), its full
glossary/checklist, the design grammar card, and the current source. The installed
package has no separate skill named `oracle-authoring`.

## Verdict

Keep the approved F2 architecture: independent command models, small shared
source geometry, browser drivers and registered laws. It has demonstrated useful
independence: the complete Chromium campaign in the browser execution record
rejects all 30 authored wrong designs. The architecture is not a complete editor
model. Its original session grammar consisted of eight families of bounded journeys.
Generated text and repeated emphasis commands do not establish arbitrary command
composition, completed-link correctness or cross-browser native history.

The weakest part is the session layer. Expanding its original case-based model
would accumulate a second table of scenario answers. Expanding one aggregate
comparison would make failures less useful. Both deserve repair before more
features are added. The boundary models can remain intact.

## Design grammar

The triggers are more than five promises at the editor boundary, several model
branches within the receiving law, and changing an existing model. This applies
the already-approved F2 extraction, rather than changing editing laws.

**Preservation relation:** same source, both selection endpoints, focus, native
undo/redo, React-state receipt, toast and rendered-structure observations at each
existing user-action checkpoint. Keep the seed `20261118`, 25 session runs per
campaign, all 34 constructed histories and all existing component campaigns. The
contract does not promise native undo after forced direct assignment, and does
not promise identical undo grouping across engines.

| Part | Job and distinguishing witness |
|---|---|
| Document and selection | The next command consumes them. Changing either endpoint changes what B/I formats. |
| Emphasis body and external star count | Preserve the selected content and remove only the requested style. Empty-pair deletion and B/I/B/I distinguish these fields. |
| Undo and redo stacks | Undo, redo and a new edit after undo have different continuations. A new edit must discard the abandoned redo branch. |
| Semantic action intent | Distinguish the edit from its transport: Tab can indent or perform native focus navigation. This is an input annotation, never an expected answer. |
| Journey names | Choose histories in the grammar. They have no job deciding model answers. |
| Per-action observations | Catch an incorrect intermediate selection even when a later selection or rerender hides it. |
| Browser transport | Execute the exact instrumented production module and actual React listeners, while preserving framework capture records. |

The source/selection rules come from the adopted command laws and retained tests.
Native undo, React receipt, preview and responsive toolbar promises come from
the retained browser scenarios and Kyle Mathews' browser-oracle decision. The
new `intent` field adds vocabulary, not an editing rule. It maps an input chord
or toolbar tool to its existing command.

### Reduced form applied

1. The history resolver now assigns semantic command intent. The model no longer
   chooses answers by a journey name, checkpoint label or keyboard spelling.
2. The selected body is model state derived from input selection. An empty
   emphasis history no longer needs a special model branch. Undo snapshots retain
   that body because a later emphasis command can distinguish it.
3. The first-list-item decline follows the selected input line's lack of a
   predecessor, not a checkpoint named `decline`.
4. The driver records each existing action checkpoint immediately after its DOM
   observation. The check identifies the action and differing field, and still
   compares every previously observed field and checkpoint order. This implements
   the already-declared per-action observation promise; no expected outcome was
   removed.
5. Five targeted calibrations challenge lost content, wrong selection, lost
   focus, React resurrecting an undone edit, and a missing preview child. The
   original lost-receipt calibration remains.

The model comparison used all 34 existing constructed histories and 10,000
histories sampled with seed `20261118`. It found zero changes to browser actions
and zero expected-observation differences in either direction. This is a bounded
comparison, not a claim of equivalence for every possible history. Fingerprints
and counts are in [session-model-comparison.json](https://github.com/blygger/blygger-studio/blob/fb0b79dc0450e5f3d31a5a8f59c0b697b5cc5f6e/docs/editor-oracle-design/session-model-comparison.json).

After that preservation check, two additional journey families strengthen the
grammar without narrowing the original eight. `mixedInline` interleaves generated
B/I commands with selected-content replacement and explicit input bookmarks.
`branchHistory` formats, undoes, replaces the selected content, attempts redo,
then formats the replacement. Eight constructed histories exercise these on
desktop/small viewports and native/refused-command paths. They do not yet mix
arbitrary structural commands, paste and selection ranges.

### Adjacent forms

| Form | Keeps | Changes and cost |
|---|---|---|
| Keep journey templates | All current receiving observations | Smallest immediate harness, but each new interaction needs another recipe. This remains useful for reconstructing the old tests. |
| Compose bounded semantic actions | Command models and browser receiving paths | Add a grammar of legal selections, edits and continuations, checked after every action. It needs explicit bookmark/selection and host-history rules; this is the next extension. |
| Full Markdown editor state model | Potentially arbitrary commands and contexts | Requires independent syntax, selection, native-history and container semantics. Too much new trusted machinery for the current writing-tool scope. |

These are real alternatives, not three names for the same abstraction. The next
step can retain journey reconstruction while adding bounded action composition.
It does not require a generic editor framework.

## Where the design still needs work

- **Completed links:** the current paste journey uses plain labels and one URL.
  It does not protect brackets/backslashes, URL punctuation, tracker policy,
  clipboard fallback or rendered anchors. A dedicated independent link model is
  appropriate; existing link tests must survive a loss audit before removal.
- **Mixed actions:** the extended grammar interleaves B/I with replacements and
  checks discarded redo history. It does not freely combine paste, arbitrary
  selection changes, structural edits and native history. Future actions should
  consume semantic state, not add model branches named after scenarios.
- **Law precision:** the component properties are separated by contract. The
  receiving property still collects several editor promises in one broad law.
  Its diagnostics are now per action/field, but independent new promises should
  get their own properties rather than enlarging that sentence indefinitely.
- **Host assumptions:** Chromium's mobile viewport is not Safari evidence.
  The engine adapter permits the same properties to run in Firefox and WebKit.
  Firefox's small-viewport profile does not claim to emulate a mobile OS.
  Browser-specific selection or undo behavior needs evidence before an allowed
  outcome is added; a failing engine must not simply get a weaker check.
- **Transport maintenance:** browser execution bridges a pinned Node-only
  runner's instrumentation. This seam is deliberate and mutation-challenged,
  but it is tied to the pinned package. Extending ownership to `links.ts` needs
  multi-module capture; importing uninstrumented production would bypass it.
- **Cost:** the session file takes about 80 seconds per Chromium baseline,
  against the skill's aim of seconds. Fresh app contexts and Worker preview
  dominate. Keep all witnesses and budgets while investigating fixture reuse;
  parallel engine jobs must keep their artifacts and failures distinguishable.

The three open framework findings and malformed-surrogate Workerd preview issue
remain open. This assessment does not reclassify them or claim zero gaps.

## Checklist scope

| Requirement | Outcome for this change |
|---|---|
| ORC-001 | Reuses adopted receiving promises; no new editing policy. |
| ORC-002 | Model imports only test-side semantics; semantic intent is input. It does not read browser output. |
| ORC-003 | Model, grammar, transport and check remain separate; comments explain the intent/transport split. |
| ORC-004 | Original eight journey families and all bounds retained. Comparison reconstructs every original constructed history; two new families add bounded typing and redo-branch coverage. Arbitrary mixed structural histories remain outside the grammar. |
| ORC-005 | Action observations are now recorded before the next action, through the actual React app and instrumented formatter. |
| ORC-006 | Original calibration retained and six targeted wrong receipts added, including stale redo; mutation execution is recorded separately. |
| ORC-007 | Same fixed seed and random campaign; no run-budget reduction. |
| ORC-008 | Body and history stacks have distinguishing continuations above. No semantic state was merged. |
| ORC-009 | Intent is a model input distinguishing editing command from keyboard/toolbar transport. |
| ORC-010 | The named action checkpoint now survives into the violation. Existing context cleanup remains. |
| ORC-011 | Existing independent preview/native-history observations retained. No new product fault formulation is claimed by this refactor. |
| ORC-012 | This versioned self-review is tied to the base commit and source comparison fingerprints; it is not a claim of a new independent full audit. |
| ORC-013 | No new threshold/range law. All existing constructed boundaries remain. |
| ORC-014 | Same real app receiving paths. Cross-engine premises are under investigation and are not established by Chromium. |
| ORC-015 | All 34 original constructed histories retained, with eight additional ones for interleaved typing and abandoned redo. |
| ORC-016 | Registrations remain oracle-only. The offline comparison is design evidence, not a replacement fixed test suite. |

## Execution

Before changing observation transport, the intent/body refactor passed all 113
session checks (including the five added calibrations) and rejected the three
selected authored challenges: `browser-native-undo-required`,
`native-delete-undo`, and `document-start-formatting`. This is a partial mutation
run; it does not replace the complete 381-mutant report in the browser execution
record. Report: `build/formatting-oracles/session-model-review/`.

No new old-test deletion or production repair is part of this pass.

The final targeted runs pass all **138 session checks** in both Chromium and
Firefox, with zero nondeterministic histories. Each rejects all three selected
authored challenges through `browser editing history`. All 42 constructed
histories and both 25-run fixed/random campaigns are retained. The seven
calibrations pass, including stale redo after a new edit. Typechecking and
`git diff --check` pass. There is no configured repository lint command.

| Engine | Check result | Mutation result | Report |
|---|---|---|---|
| Chromium | 138 pass, repeated clean | 3/3 selected challenges rejected | `build/formatting-oracles/session-mixed-chromium/` |
| Firefox | 138 pass, repeated clean | 3/3 selected challenges rejected | `build/formatting-oracles/session-mixed-firefox/` |

The [versioned receipt](https://github.com/blygger/blygger-studio/blob/fb0b79dc0450e5f3d31a5a8f59c0b697b5cc5f6e/docs/editor-oracle-design/session-review-execution.json) includes the source
fingerprints, exact mutation keys/verdicts and reach counts for each engine.
After execution, only the receiving property's authority/limits prose was
updated to reflect the approved cross-engine extension and its Firefox result.
The earlier complete 381-mutant campaign has not been rerun for this assessment;
these partial runs make no replacement full-gap claim.

### Cross-browser host findings

The first Firefox run failed six of 113 baseline tests. A direct host probe
showed a `DataTransfer` containing the requested URL, but an empty
`ClipboardEvent.clipboardData` after its constructor. The driver now supplies the
same controlled clipboard-data object through a property in every engine. This
repairs an input premise; it does not weaken the link-source comparison or
claim OS clipboard coverage. The original failing registered replay is retained
in `build/formatting-oracles/firefox-paste-replay/`.

The broad WebKit run was stopped after recording repeated baseline violations;
it is incomplete and supplies no mutation kills. A targeted registered replay
at `build/formatting-oracles/webkit-undo-replay/` reproduces the undo mismatch:
after B/I/B/I over `two`, undo returns an empty document instead of
`one *two* three`.

The independent plain-textarea probe reproduces that discrepancy with no Studio
code: after `fill('a a a')` and one native replacement, both keyboard undo and
`document.execCommand('undo')` return `''` with two `historyUndo` events. Chromium
and Firefox return `'a a a'` with one event. The production formatter follows
the same behavior as the plain native replacement. Raw observations are in
[browser-host-probes.json](https://github.com/blygger/blygger-studio/blob/fb0b79dc0450e5f3d31a5a8f59c0b697b5cc5f6e/docs/editor-oracle-design/browser-host-probes.json) and
[browser-host-undo-probes.json](https://github.com/blygger/blygger-studio/blob/fb0b79dc0450e5f3d31a5a8f59c0b697b5cc5f6e/docs/editor-oracle-design/browser-host-undo-probes.json). These are
exploratory probes, not oracle campaigns.

This initial probe demonstrates a host-history distinction, not a Studio defect.
Subsequent [research](webkit-undo-research.md) found a host-driver repair: a
separate native reference editor acknowledges an AppKit event boundary before
the next action. The semantic model and exact-prior-edit check remain intact.
This supersedes the suggestion that the model must allow grouped edits to pass.
The [independent review](webkit-native-host-review.md) records the boundary and
its negative controls. The latest completed pre-navigation-repair baseline was
136/138: Undo/Redo checks passed, while two full→quick determinism failures
exposed a hard-navigation/autosave race. Their mutation challenges were blocked,
not killed. The normal in-app driver now uses the actual save-guarded compose
link; its registered replay is tracked separately.

The original hard-navigation receiving witness remains an explicit loss-audit
obligation in [webkit-navigation-premise-review.md](webkit-navigation-premise-review.md).
Neither the host repair nor an eventual green in-app replay establishes that
separate promise, ordinary Safari behavior, or full cross-browser coverage.
