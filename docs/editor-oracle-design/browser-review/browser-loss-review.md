# Browser formatting oracle migration — independent loss review

Workspace: /Users/kyle.mathews/programs/blygger-studio/.worktrees/oracles-explore
Base: 28b0c8d642a87e5810ad6eabd95c2d1714c53396 plus the current uncommitted helper refactor.
Read the pinned oracles-review skill, checklist v1 and glossary in full. This is a read-only source review. No competing tests or probes ran and no repository files changed. The earlier observation about the monolithic list generator is stale; the current companion grammar accepts internal spaces.

## Findings

### B1 — P1: A browser textarea is not the React receiving path

The current `test-ui/editor-oracles/browser-driver-oracle.ts:14-21` creates an empty page; `textarea-driver-oracle.ts:9-15` mounts a bare textarea. Lines34-38 adapt a DOM event into a hand-written object and invoke `sut.onFormatKey` directly. No Studio route or React component is loaded.

Small witnesses lost on deleting the old browser files:

- Composer: format, undo, then click the thread radio; the textarea must retain the undone text (`e2e/format-shortcuts.spec.ts:30-35`). A broken React onChange can leave the DOM value temporarily correct but restore stale component state on this action.
- Remove `onKeyDown={onFormatKey}` from quick edit (`src/ui/authoring.tsx:1442`): isolated helper tests still pass, while the old quick-edit assertion at e2e line66 fails.
- Break a toolbar callback at `src/ui/authoring.tsx:2487-2500`: no current bare-textarea history clicks it, though the old toolbar scenario fails.

Evidence: read from source. These are concrete mutation experiments to run after the receiver exists, not claimed mutant results.

Repair: add registered generated `oracleProperty` histories that load the actual compiled Studio, exercise its three editor surfaces, and observe both the textarea and receiving React/preview state. Retain the old files until every mapping below is executed by those histories. The driver's comment claiming 'The app receiving oracle exercises the actual React listener' currently describes a future path, not an existing test.

### B2 — P1: Synthetic key dispatch cannot replace default focus navigation or undo

`textarea-driver-oracle.ts:32-44` constructs and dispatches `KeyboardEvent`. A synthetic Tab does not cause browser focus navigation. The driver begins with the textarea focused and records final focus but never issues a native keyboard Tab. There is also no undo/redo action.

Small witnesses:

- On plain prose, press real Tab: source unchanged AND focus leaves the editor (`markdown-structure.spec.ts:40-46`). A no-edit result alone preserves only half this behavior.
- Format B/I/B/I, then undo: restore the prior italic result (`format-shortcuts.spec.ts:22-31`). Correct forward edits do not establish undo.
- Indent, type a second nested item, outdent, undo: restore that second item's indentation (`markdown-structure.spec.ts:29-37`). This exercises undo after intervening typing, not just one command.

Evidence: source. Repair: actual `page.keyboard.press`/typing against the app for these histories, with intermediate source/selection/focus observations. Retain synthetic dispatch only for impossible-to-type unknown keys, composition and already-prevented controls. Do not infer native browser defaults from a synthetic event.

### B3 — P1: Native command delivery is not yet checked by a real consumer

The current driver spies on explicit `element.dispatchEvent`; native UA input events do not call that instance method. It records native command return and resulting value, but no React consumer exists to establish receipt. `editor-keyboard.oracle.test.ts` still delegates actual input delivery and undo to ordinary Playwright complements, which the new task removes.

Small witness: keep the formatting function and native `execCommand` unchanged, but make a Studio textarea's onChange ignore the new value. The current isolated DOM result and command/effect trace remain correct. The composer kind-switch assertion and the editor preview assertions fail.

Repair: actual app histories must include a state-dependent rerender (composer kind switch), typed continuation after returned caret, and live preview/next-render observations. Capture genuine input/beforeinput/selectionchange events with event listeners when claiming event delivery; do not manually invoke the app's onChange or supply an expected event as driver setup. Forced native-failure controls should still go through the real React listener to demonstrate that the bubbling fallback event reaches it.

### B4 — P1: One production renderer still runs in Node

`test-ui/editor-code-block.oracle.test.ts:42` imports repository production `renderMarkdown`; line61 calls it in the Node Vitest worker. This contradicts a literal claim that all tested production paths execute in the browser. Other list/verse properties call third-party MarkdownIt as a test observer, which is a different boundary and does not establish the actual Studio preview.

Repair: obtain the production-rendering observation from the real app's preview DOM/API receiving path, or explicitly move only the relevant browser-safe production path into browser transport. Do not bundle the Worker-only Temml renderer into the shipped browser bundle; repository instructions prohibit that. Independent test-side models/MarkdownIt may remain outside the browser, but must not be described as the actual production preview. State the actual execution boundary precisely: formatter in Chromium, app preview through its real Worker, independent judgment in the oracle harness.

### B5 — P2: Desktop/mobile coverage disappears with the current connection helper

`browser-driver-oracle.ts:19` opens one default-profile page. The old Playwright config runs Desktop Chrome and iPhone13 Chromium profiles. The two formatting keyboard scenarios run on both profiles; the first three structural-key scenarios are desktop-only; the toolbar scenario runs on both.

Small witness: hide or misplace toolbar controls at the mobile breakpoint, or make the mobile draft pane inaccessible. Current isolated textarea checks still pass. The old mobile toolbar scenario cannot click its controls.

Repair: profile is a generated/constructed environment dimension of the receiving oracle. Preserve both profiles for composer/full-editor/quick-edit keyboard scenarios and the toolbar scenario; preserve the original desktop-only structural-key legality rather than quietly broadening or shrinking it. On mobile select the draft pane through UI if possible; do not replace React state by setting DOM attributes when claiming the pane control itself works. These are Chromium profiles, not a Safari/WebKit guarantee.

### B6 — P1: The runner does not start an app, and the actual app must receive the active mutant

`scripts/formatting-oracles.ts:6-18` launches Chromium and oracle-gaps, but no compiled Studio fixture/server. The source bridge evaluates the current patched formatter as an isolated module. Loading an ordinary previously built Studio alongside it would test unmutated app code unless the app's imported formatting dependency receives the active patch.

Small distinguishing experiment: run an authored mutant that changes bold width. Direct browserCall should fail; a receiver pressing Cmd/Ctrl+B in the app must independently observe the same changed behavior. If the receiver still gets normal bold, the app is not using the active mutant, regardless of browser execution.

Repair: build/serve a disposable actual app once with a test-only formatting-module seam, or rebuild/serve the browser bundle for each active mutant. The seam may forward to the exact active instrumented formatting module in the browser, but must preserve the real React listener and toolbar callbacks; it must not replace those callbacks with the test's direct calls. Calibrate this transport before using receiver kills as evidence. Reuse existing fixture credentials/migrations locally, stable per-context synthetic edge IPs, and a service-worker-blocked context. Never point generated authoring histories at a live deployment.

### B7 — P2: Refactor plan and law prose still promise ordinary browser complements

`docs/editor-oracle-refactor-plan.md` steps3/4/6, design evidence E4, and the keyboard oracle's opening/limits repeatedly say real-browser receiving tests or scoped Playwright tests remain necessary. Some describe F2 as unimplemented even though shared models/drivers are now extracted. They need a versioned update for the new browser-only oracle target.

Repair: retain the frozen v1 design/evidence as historical evidence; add the current architecture, receiver scope, new preservation matrix, and actual run/mutation receipts. Replace future/fallback references in current oracle law limits with the registered receiving oracle route once it exists. Do not silently edit the frozen claim into saying the receiver already ran.

## Complete migration map: six original scenarios,28 product observations

The two source files have31 syntactic `expect` sites including reusable setup assertions. The table below accounts for28 product observations; login/composer visibility and full-editor visibility remain checked setup/receiver-ready conditions. With helper invocations expanded, the original desktop run makes38 assertions, and mobile makes22 (the three structural-key scenarios skip there). Counts exclude retries. The important preservation target is each observation and its route, not the count alone.

| History | Surface/profile | Original actions | Required generated observations |
| --- | --- | --- | --- |
| H1 emphasis/link/state | Composer; desktop + mobile | Seed 'one two three', select 'two', B/I/B/I, undo, switch thread; seed 'see this', select 'this', K, type URL | Four successive emphasis source results; undo source; same source after kind switch; link placeholder source; completed link source (8). |
| H2 same keys | Full editor then quick edit; desktop + mobile | Create generated marker item, open editor, select all, I/I; go home, open same item, quick edit, B | Italic source, restored source, bold quick-edit source (3). |
| H3 list/typing/undo | Full editor; desktop | Seed two bullets, caret end, Tab, type newline + indented sibling, Shift+Tab, undo | Indented source; retained editor focus; preview nested children in exact order/multiplicity; outdented source; restored indentation after undo (5). |
| H4 off-list navigation | Full editor; desktop | Seed plain prose, caret end, real Tab | Unchanged complete source; focus leaves textarea (2). |
| H5 verse | Full editor; desktop | Seed first line, caret end, Shift+Enter, type second line | Exact hard-break source; one preview paragraph; one preview br (3). |
| H6 toolbar | Full editor; desktop + mobile | Seed bullets, caret end, click indent/outdent/break; type continuation; click code; type code; move caret to first item; click indent | Indented source; editor refocused; outdented source; hard-break source; complete context+code source; visible decline toast; unchanged first-item/source prefix (7). |

These inputs become named constructed histories through the same independent model/check as generated variants, not standalone tests under an oracle filename. Preserve the exact legacy values as fixed witnesses where feasible, then vary words, prefixes, endpoints, marker styles, code content and line counts through semantic dimensions. Keep both selection endpoints at every checkpoint even where an old test observed only source; later actions use the selection the browser actually retained.

## Compact receiving design

Keep the existing fast single-command browser oracles. Add one focused actual-app receiving oracle file with two or three properties sharing a small action history/model:

1. **Surface command delivery/state**: composer, full editor and quick edit; generated initial source/range and a bounded command/typing sequence. Construct H1/H2/H5. Compare each post-action source, absolute selection, focus, input receipt and state-dependent rerender/preview.
2. **Structural keyboard/toolbar composition**: legal desktop key routes and both-profile toolbar routes, annotated parent/child/fence scenes. Construct H3/H4/H6 and corresponding toolbar/key alternatives. Model decline separately so Tab's native navigation and toolbar's explanatory toast remain distinct allowed outcomes.
3. **Undo/redo receiving**, if keeping it separate helps cost and authority: use accepted native edits with explicit operation boundaries, compare the prior/next modeled source and selection. Construct the two original undo sequences. Do not assume universal toggle round trips or that arbitrary browser typing always creates one undo group.

A history contains surface, Chromium profile, annotated starting source/range, and actions such as select, formatting key, structural key, toolbar command, literal typing, undo, redo, composer-kind rerender and open quick edit. The model keeps source, selection, surface/kind and only the undo transaction states needed by the supported native-command histories. It reuses the independent command models where the laws coincide; app-only observations (React state, focus, preview structure and toast) remain independent receiving checks. URL-over-selection paste from plan step4 is a separate actual ClipboardEvent/app path, not the keyboard placeholder-link model; include it as the already requested extension without pretending it was present in these six old tests.

Driver mechanics:

- Navigate real Studio routes and use actual controls/listeners. Seed local fixture items through the existing disposable API, not direct production function invocation. Capture page errors/unhandled rejections as plain observations through the whole history.
- Use native keyboard actions where default editing, undo or focus is contractual. Use synthetic composition/prevented/clipboard controls only for the premises they actually establish. A synthetic paste cannot establish default browser insertion on a fall-through branch.
- Use a fresh page/document or a proven reset per independent history; do not retain the previous history's undo stack, navigator.platform override or patched execCommand. Authenticate a disposable context once if needed for cost, preserving one stable edge identity per context and real rate-limit behavior.
- Observe before/after every action. Feed the browser's retained caret/selection into the next user action. Do not reset selection to the expected answer between commands; that would hide the bug class the old sequences detect.
- Preview updates debounce150ms and fetch through `getPreview` (`authoring.tsx:2032-2052`). Control browser time and use request/response/render-turn signals to settle. Do not put `expect`, production-result equality waits or arbitrary sleeps in the driver. A mutation that prevents an expected event must become a recorded missing observation checked by the law, not a setup timeout mislabeled as a kill.
- Keep setup/transport failures distinct from product errors. Calibrate source, selection, focus, preview and state-rerender observations by corrupting one at a time. Add authored mutations for omitted app wiring if they are in the claimed scope; source-only zero gaps on format-shortcuts.ts do not by themselves prove every authoring.tsx callback is judged.

## Deletion gate and remaining uncertainty

Do not delete either ordinary browser file until H1–H6 and both relevant profiles pass through registered generated oracle routes, the same runner starts/stops the local app and browser, the receiving driver demonstrably gets an active formatter mutant, and all old assertions have a receipt. Then remove the two files by name because their generated receiver replacements own the assertions.

No new tests ran for this review. I did not validate the custom oracle-gaps instrumentation bridge, cross-browser behavior, or app API concurrency. Existing two framework warnings remain open evidence; a browser move does not turn them into kills. No claim of zero gaps follows from this source review.
