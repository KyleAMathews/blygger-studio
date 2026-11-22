# Independent browser receiving-oracle review

Reviewed read-only in `/Users/kyle.mathews/programs/blygger-studio/.worktrees/oracles-explore`, base `28b0c8d642a87e5810ad6eabd95c2d1714c53396`, pinned `@tanstack/oracles` preview `97a4e7a`. No tests, mutants, or repository edits were run by this reviewer. All findings below are **read from source**, with proposed distinguishing experiments explicitly identified. Read the pinned `oracles-review` skill, checklist v1, and glossary in full after this handoff.

Scope: `editor-session.oracle.test.ts`, `session-model-oracle.ts`, `session-driver-oracle.ts`, `formatting-oracle-application.ts`, and `browser-driver-oracle.ts`, compared against both retained browser formatting test files. This is an independent receiving-witness review, not a fresh verdict on all seven formatting oracles or the production refactor.

## Verdict

Do not delete the two old browser test files yet. The receiving oracle exercises the actual React app and browser formatter and preserves most observations, but it does not yet preserve all 28 old product assertions at their original boundaries. Three migration defects and two harness defects follow.

## BR-001 — React rerender no longer checks the undone state [P1]

- **Claim:** `editor-session.oracle.test.ts:7` explicitly promises `undo(); switchKind()` preserves the undone source; lines 23–26 adopt the original browser scenarios as authority.
- **Actual grammar:** `session-model-oracle.ts:45–46` always does undo, then redo, then composer kind switch. The source immediately after undo is observed, but its receipt by React state is not tested before redo overwrites that state.
- **Smallest witness:** Seed `one two three`, select `two`, B/I/B/I, undo, kind switch. The old test expects `one *two* three` after the kind switch. No new history performs this continuation: every native inline history inserts redo before switch; fallback histories omit undo entirely.
- **Wrong design that can pass:** Undo updates the native textarea but its input notification is not received by the controlled React state; redo subsequently synchronizes both DOM and React. The current undo snapshot passes and redo repairs the state before the only rerender checkpoint. The old observation fails.
- **Repair:** Generate the continuation after native undo, requiring a kind-switch checkpoint before any redo. Retain redo coverage as a separate continuation or switch back and then redo if that is legal. Declare/construct reach for `undoThenRerender` independently of `redoThenRerender`, and challenge the former with a dropped-undo-input mutation. This strengthens enforcement of the already adopted law, requiring no new approval.
- **Requirements:** ORC-004 reconstruction, ORC-005 observation/checkpoint, ORC-015 meaningful reach. Confirmed oracle-source defect; the wrong-design kill remains a proposed experiment.

## BR-002 — Full and quick editor source initialization and whole-document selections were replaced [P1]

- **Claim/authority:** The three observations in the old `e2e/format-shortcuts.spec.ts` second test: open a created item in the full editor, select all its loaded marker, I → `*marker*`, I → `marker`; navigate back and quick-edit the same item, select all, B → `**marker**`. Both desktop and mobile execute that history.
- **Actual grammar:** `session-model-oracle.ts:20–22` constructs the named editor/quick cases with appropriate command sequences, but lines 42–43 unconditionally replace the textarea with `before + ' ' + body + ' ' + after` and select only its interior. `before` and `after` are never empty (`:6–9`). `session-driver-oracle.ts:22–35` opens a newly created item, then `:39–42` overwrites it before any source observation. Each surface gets a separate context/item; no history moves from full editor to quick edit of the same item.
- **Smallest witnesses:** (a) Full editor loaded `x`, select `[0,1]`, I; (b) quick editor loaded `x`, select `[0,1]`, B. Neither actual-app history is reconstructible by this grammar. A wrong full/quick initial textarea value is overwritten by setup; an integration defect conditional on selection touching a document edge has no actual-app witness. Component-level browser oracles are valuable, but do not supply this receiving path.
- **Repair:** Add generated initialization/selection modes: loaded item vs explicit fill, and whole-document vs interior selection. Model loaded content from the plan and observe it before modification. Construct both profiles for both whole-document modes. Include a surface-transition action that reopens the same created item in quick edit after full-editor toggling, retaining the original source continuity. Keep this inside the registered oracle and same model/check, not as an ordinary Playwright complement.
- **Requirements:** ORC-004 reconstruction/range, ORC-005 production path, ORC-014 receiving witness. Confirmed migration gap by source; no production failure asserted.

## BR-003 — Toast presence is weaker than the original visibility assertion [P2]

- **Claim/authority:** The old toolbar browser test requires the exact first-item explanation to be visible. The new opening law says the explanation is shown (`editor-session.oracle.test.ts:20–21`).
- **Actual observation:** `session-driver-oracle.ts:66` sets `toast` by scanning DOM text in `[role="status"],.toast`. It does not check rendered visibility, so a hidden node satisfies it.
- **Smallest witness:** Toolbar history reaches first-item declined indent with correct text in a `.toast` styled `display:none`. The new source/toast result passes; the old `toBeVisible()` fails.
- **Repair:** Record the explanation text and actual visibility using Playwright's visibility observation, or a browser visibility predicate that matches its semantics. Keep a wrong-hidden-toast calibration/mutant through the registered route. The source-unchanged comparison already strengthens the old prefix check and should remain.
- **Requirements:** ORC-005 information content, ORC-006 plausible wrong answer. Confirmed observation weakness by source.

## BR-004 — Preview response is not correlated to the action's source [P2]

- **Claim:** `session-driver-oracle.ts:60–62` says it waits for React to commit “this response” before taking the independent DOM observation.
- **Actual synchronization:** `:46` takes the next POST response whose URL contains `/preview`, without comparing its request body/contentMd/itemId to the action being checked. The real editor debounces preview 150ms and aborts older requests in a React effect (`src/ui/authoring.tsx:2031–2054`). An already arriving prior response can win the listener. The subsequent textContent wait can immediately match the prior DOM and record it.
- **Smallest legal schedule:** In the list journey, a preview for the just-indented two-line source is already in flight. The sibling typing action attaches its listener, the old preview response arrives, and its DOM content is already visible. The oracle records one child while its model expects two, creating a false violation of a correct app. The verse journey has the analogous prior-source schedule.
- **Repair:** Correlate the response to the actual post-action textarea source and known item id by inspecting its request body, not an expected model answer. Establish DOM commit for that response before recording structural fields. A test-only response/commit marker is an alternative if exact serialized DOM comparison is unsuitable. Classify absent requests/timeouts separately; they are not mutant kills under ORC-006.
- **Requirements:** ORC-005 exact checkpoint; ORC-010 failure fidelity. Source-supported race; execution under an injected response-order schedule is a proposed experiment, not an observed flaky run.

## BR-005 — Disposable app build failures leak their temporary directory [P2]

- **Claim/authority:** ORC-010 requires resources created by a driver/harness to be released when it throws.
- **Actual path:** `scripts/formatting-oracle-application.ts:10` creates a temporary directory. Build rejection at `:21`, writing at `:24`, or Miniflare construction at `:25–30` occurs before the cleanup try/catch starts at `:31`. Any of those failures leaves the directory behind. Successful close also runs `host.dispose()` before `rm`, so disposal rejection skips removal.
- **Smallest witness:** A syntactically broken app module makes esbuild reject after the directory has been created.
- **Repair:** Put the entire post-mkdtemp operation under resource cleanup, keep host optional until constructed, and use finally/allSettled/AggregateError handling so host-disposal failure cannot skip temporary-directory removal or replace the primary failure.
- **Requirements:** ORC-010. Confirmed cleanup path by source, no failure injected.

## Migration inventory (28 product observations)

| Original history | Observations | Receiving route and verdict |
| --- | ---: | --- |
| H1 Composer emphasis/link/state | 8 | Four toggle values, undo value, link placeholder and typed target are observed. **The state-switch observation moved after redo (BR-001).** Both viewport profiles are constructed. |
| H2 Full editor → quick edit | 3 | Appropriate I/I and B commands run on each surface, but **all three old observations lost loaded whole-document input and same-item continuity (BR-002)**. Both profiles exist. |
| H3 List typing/undo | 5 | Source after Tab, focus after Tab, exact ordered/multiplicity-preserving nested child texts, source after Shift+Tab, and undo source all reach comparisons. Both profiles now run, strengthening old desktop coverage. Preview checkpoint synchronization remains BR-004. |
| H4 Off-list Tab | 2 | Source unchanged and focus left textarea are both compared. Both profiles are constructed, strengthening old desktop coverage. |
| H5 Verse | 3 | Exact hard-break source, actual Worker-preview paragraph count and `<br>` count are compared. Both profiles now run. Preview checkpoint synchronization remains BR-004. |
| H6 Toolbar | 7 | Indent source/focus, outdent source, break source, final code-typed source, explanation text presence, unchanged source. **Explanation visibility is weakened (BR-003)**. Full unchanged source strengthens the old final prefix assertion. Both profiles are constructed. |

The two login/editor-visible setup assertions are receiving setup gates rather than product-law comparisons; that is appropriate, and should not be counted as extra formatting laws.

## One rebuilt observation

From the original toolbar contract alone: starting `- fruit\n- apples`, caret at end, indent, outdent, break, type `and pears`, code, type `let a = 1;` must yield `- fruit\n- apples\\\nand pears\n\n```\nlet a = 1;\n````. `sessionPlan` builds that command sequence from `baseSession`; `sessionModel` independently modifies the final list line, inserts the literal hard-break, then a code slot and typed body. `sessionDriver` clicks the actual SPA buttons with the active browser formatter module installed before app load, types into its resulting caret, records the complete textarea source at `codeTyped`, and the whole-result check compares every retained step. This observation is preserved, including its intermediate source checkpoints.

## Checklist outcomes and uncertainty

| Requirement | Outcome for this receiving review |
| --- | --- |
| ORC-001 authority/limits | Authority traces to the two retained source files and approved migration decision. Bounded prose/device/native-fallback limits stated. No authority defect identified in this scope. |
| ORC-002 independent judgment | Model uses independent document edits and semantic annotations, not formatter outputs. Browser driver calls production; Worker preview is an observation. No copying defect established in this scoped review. |
| ORC-003 literate responsibilities | Model, grammar, real path and check are distinguishable. Opening `undo(); switchKind()` prose contradicts implemented order: BR-001. `fill`/`select` are initialization rather than checked user commands; prose should make that distinction clear. |
| ORC-004 grammar controls | Whole-document loaded-input and same-item surface transition are missing: BR-002. Undo-rerender continuation missing: BR-001. Existing range limits do not close these adopted migration obligations. |
| ORC-005 path/observation | Actual browser React app and Worker preview path are present. Observation/checkpoint defects BR-001, BR-003, BR-004 remain. |
| ORC-006 calibration | One entire-result-null corruption exists. It proves a gross comparison rejection, not each receiving observation. No new kill was run by this reviewer; require distinguishing runs for repaired gaps. |
| ORC-007 fixed/random replay | Registered property declares 25 runs and fixed seed 20261118; framework supplies random/replay. Execution evidence is parent's responsibility. |
| ORC-008 state minimality | Source, caret, style annotations and undo/redo state support later legal continuations. No unnecessary state finding; missing rerender continuation is BR-001. |
| ORC-009 vocabulary | Surface/journey/step/checkpoint meanings are visible; no terminology defect identified. |
| ORC-010 fidelity/cleanup | BR-004 synchronization can create misleading violation; BR-005 leaks resources on setup/disposal failure. Context close is in finally. |
| ORC-011 second formulation | Actual preview supplies a structurally different check on list/verse behavior. No additional shared semantic fault requiring another formulation identified by this scoped review. |
| ORC-012 review evidence | This report records scoped outcomes. It is temporary, so parent must preserve decisive findings/decisions in versioned evidence tied to final reviewed source. No whole-suite audited/zero-gap verdict made. |
| ORC-013 boundary witnesses | Broad formatting boundaries remain owned by companion oracles; this receiver's adopted missing document-edge witness is BR-002. No independent whole-suite boundary verdict. |
| ORC-014 controlled premise handoff | The actual SPA/DOM/native command receiving path is a major improvement over minimal-host component drivers. Whole-document loaded-input handoff still missing: BR-002. Clipboard remains explicitly DOM event, not OS clipboard. |
| ORC-015 declared reach | Viewport/surface/native/journey dimensions are constructed, but current states omit the meaningful undo-rerender, loaded-whole-source, and same-item-transition states; repair BR-001/002 with predicates over actual plan paths. |
| ORC-016 law-only files | Reviewed new files contain no ordinary example tests. Named cases feed the same property/model/driver/check. |

No new production defect is claimed here. No timed-out or setup-failed run is counted as a kill. No old test deletion should be justified until the receiving gaps have assertion-producing challenges and passing baseline campaigns.
