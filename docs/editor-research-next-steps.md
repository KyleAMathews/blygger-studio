# Editor research and remaining work

The [editor behavior catalog](editor-behavior-audit.md) compares common editors and supplies candidate behavior. It does not override adopted Studio laws. The [suite guide](editor-oracles.md) describes the current browser oracles and execution commands. Historical probes, execution reports, review transcripts and loss audits remain outside the source tree.

Kyle Mathews (GitHub KyleAMathews), 2026-11-18, approved expanding oracle coverage and expressed interest in the feature candidates except inline code. Existing-law strengthening can proceed. New policies still need concrete laws where editors disagree. Compose collection-loading/error/Retry work remains separate from this formatting PR.

## Coverage still to complete

| Area | Current boundary | Remaining work |
| --- | --- | --- |
| Complete mutation acceptance | Browser laws cover direct commands and actual React interactions. Two baseline passes establish repeatability, not complete mutation rejection. | Finish the full current-source mutation portfolio. Keep partial selections, unmatched selectors, setup failures and interrupted runs distinct. |
| Legacy-test retirement | The links helper suite and formatting-shortcuts browser suite have replacement mappings. | Retain `test-ui/format-shortcuts.test.ts`, `e2e/markdown-structure.spec.ts` and unrelated clipboard/authoring tests until exact-source mutation and loss audits justify each removal. Never delete `e2e/compose-pwa.spec.ts` wholesale. |
| Completed links and workflows (T1) | Helpers judge source, escaping, trackers, feedback and rendered anchors. Application drivers cover clipboard/sheet/paste behavior. | Complete current-source clipboard/cancellation sensitivity before further retirement. Keyboard-placeholder completion needs its own commitment rule and real editor histories. Keep tracker and paste-default policies separate. |
| Cross-engine delivery (T2) | Chromium and Firefox paths exist. WebKit experiments use an explicit executable override. | Run expanded receiving histories on matched supported WebKit. Do not infer physical Safari/iOS or IME behavior from small viewports or composition commits. Revised navigation and complete cross-engine mutation acceptance remain separate. |
| Mixed actions (T3) | Bounded full-editor histories mix typing, selections, formatting, paste and app-formatting Undo/Redo. | Preserve input/output continuity, delivered ranges, permitted indentation and exact Undo branches. Broader Markdown alphabets, code-parent subtrees and matched WebKit remain outside the established boundary. |
| Keyboard, focus and mobile (T4) | Drivers exercise click/Enter/Space toolbar activation, picker-consumed keys, Tab traversal, scroll, protected regions and restoration. | Physical keyboards/IME, roving-toolbar design, fullscreen/OS Escape, modified-Enter precedence and actual OS permission interfaces need separate decisions or receiving histories. |
| Existing Markdown (T5) | Raw-source histories include escaped stars, underscore wrappers, code-span bodies, link labels/destinations and intraword punctuation. Rendered flat-list nesting covers parent marker width and padding. | Adopt explicit syntax-aware editing rules before asserting parsed-node behavior. Broader nested quotes/lists/indented code, arbitrary leading indentation and code subtrees need their own semantics and histories. |
| Native-host recovery (U2) | Normal native insertion and refusal fallback are covered. Exploration also forced absent, throwing and incorrect-success providers. | No broader recovery law is adopted. Explore delayed effects, partial mutation, wrong input receipts and application settlement before deciding rollback or overwrite behavior. |
| Draft lifecycle | Save schedules and revisions distinguish equal source strings; navigation observes retention and save failures. | The standalone draft oracle does not own every `Draft` method. Keep source acceptance/continuation and publish-source authority boundaries explicit. |
| Read-only input | The full editor judges selected/caret insertion, deletion/cut, bounded raw layouts, exact edges and full-draft Save. | Multiple-operation stale receipts, arbitrary scanner/clamping-layout unions, clipboard payloads and physical IME are not established. |

Native Enter/Shift+Enter retain main's ordinary newline behavior; the toolbar owns rendered hard breaks. Browser-owned typing/newline Undo, grouping and command recovery remain outside scope. Immediate source, caret/focus, continued typing, protected-region preservation and Save remain judged. App-formatting Undo/Redo remains covered; no custom history adapter is planned for Chromium defects.

## Known gaps and framework questions

- Inline M22: work accounting does not establish the intended bound across browser I/O.
- Inline M30/M52: the requested boundary equality has no identified legal witness under the existing nonempty/star-run guards. These remain reported framework questions, not mutation kills.
- `review-list-valid-nul-context`: the list-only campaign did not observe this mutation; its separate valid-input owner needs a final portfolio verdict.
- Native receiving: the focused receipt-loss challenge remains `not-judged`; bounded provider results do not close it.
- ORC-007: the wrapper records a fresh invocation seed, but the pinned runner does not establish literal unseeded execution.
- A separate Workerd malformed-surrogate preview finding remains open. Browser formatting results do not close it.

## Feature candidates

The research shows shared conventions, not a single universal Markdown editing specification. The choices already adopted for whitespace, multiline emphasis, off-list Tab, formulas and marker-only text stay in force. Kyle Mathews (GitHub KyleAMathews) approved following main on 2026-11-21: native Enter/Shift+Enter insert ordinary newlines; the hard-break toolbar retains the adopted breakEdit command law. **F2–F5 remain proposed behavior changes.** More complete oracle coverage does not implement or adopt those features.

[Concrete feature-law proposals](editor-feature-law-proposals.md) now spell out F2–F5 and bounded U2 recovery, including examples, compatibility costs and adoption choices. Every proposed law remains **unadopted**; review acceptance establishes a document ready for a product decision.

| Suggested order | Feature | Why consider it | Rules to settle before implementation |
|---|---|---|---|
| Parked (F1) | Separate inline-code command and accessible toolbar action | The reference editors support it, but Kyle considers it low value for this writing tool. | No implementation is scheduled. Preserve the existing code-block action's meaning. |
| F2 | Smart list Enter, empty-item exit and list Backspace | CodeMirror, EasyMDE and Markdown All in One continue lists; exit/deletion support makes continuation usable. | Bullet spelling, ordered numbering and intentional nonsequential numbers, middle-of-item splits, selected ranges, nested levels, empty-item exit/outdent and code-context suppression. Keep these as one coherent feature family. |
| F3 | Consistent safe completed-link workflows | Research reproduced broken Markdown after completing a keyboard placeholder containing `]` and a destination containing `)`, while paste-side helpers escaped them. | How keyboard completion is recognized and committed; label/destination escaping; uppercase schemes and whitespace. Keep tracker handling independently specified. The completed-link helper oracle supplies the existing insertion semantics; actual keyboard-placeholder completion still needs its own commitment rule and receiving histories. |
| F4 | Heading, ordinary blockquote and new-list toolbar commands | Common source-editor controls are especially useful on touch keyboards. | Whole-line selection boundaries, blank lines, repeat/toggle behavior and caret mapping. Ordinary Markdown blockquotes remain distinct from Blygger quote/transclusion operations. |
| F5 | Blockquote continuation and empty-quote exit | CodeMirror and Markdown All in One support it; it can reuse structural editing after the list rules are established. | Nested quote levels, lists inside quotes, empty lines and fenced/code contexts. |
| Optional | Word-at-caret emphasis | GitHub and Markdown All in One format a word when there is no selection; Studio currently inserts an empty pair. | This changes an adopted behavior. Choose Unicode/punctuation word boundaries, caret preservation and behavior beside markup before adopting it. |
| Optional | Alternate emphasis-marker removal | Some editors remove underscore wrappers as well as star wrappers; conventions differ. | Which wrappers are recognized, intraword underscores and preserving the other emphasis style. |
| Later | Strikethrough and task-list tools | Common in richer Markdown editors. | Strikethrough syntax/toggle; task-list renderer and checkbox behavior before insertion tools. The audit found no task-list renderer plugin. |
| Later | Code-block unwrap/toggle | Useful in some editors, less consistent across references than inline code. | Fence info/language, partial selections, indented code and nested containers. |
| Defer | Tables, automatic pairs, document formatting, multiple cursors | Larger interaction/policy surface with less shared textarea-editor convention. | Separate feature design; no editor replacement is implied. |

## Order of work

1. Finish current-source mutation and loss audits before retiring further legacy tests. Keep Compose loading/error/Retry work separate.
2. Resolve the remaining browser/host receiving boundaries. Present any changed recovery promise as a law decision before production changes.
3. Adopt smart-list continuation, exit and Backspace as one family, including numbering, selected ranges and nested exit behavior.
4. Decide completed-link commitment and heading/quote/list tools, followed by quote continuation. Implement adopted features oracle-first.
5. Expand syntax-aware editing only after its rules are explicit. Inline code remains parked.
