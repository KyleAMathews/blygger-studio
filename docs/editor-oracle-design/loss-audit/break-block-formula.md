# Frozen loss audit: breaks, code blocks, structural keys, formulas

Date: 2026-11-18. Source seat: `/root/loss_audit_break_block_formula`.

This is the raw, single-source pass required by the selected **Hidden-signal recovery assay**. It inventories supported source material and traces what the proposed reduction retains or drops. It does not rank recovered items, decide whether to restore them, or recommend production fixes.

## Inputs and isolation

All inspected task inputs were read from the frozen directory `/private/tmp/blygger-loss-audit.uj1TVJ`. The only old test source inspected was `source-break-block-formula.txt`: original `test-ui/format-shortcuts.test.ts` lines 139–198. Sibling old-source excerpts and sibling audit reports were not read. Production context was the frozen `src/ui/format-shortcuts.ts`. Proposed reductions were the frozen line-break and code-block oracles, the formula portion of the inline oracle with its shared plumbing, and the structural-key portion of the keyboard oracle. The keyboard file was also read far enough to distinguish an indirect handler reach from a direct break-oracle omission; no sibling old tests were consulted.

Card read in full: `/Users/kyle.mathews/.codex/isaac-folder-skills-staging/field-lab/reference/instruments/loss-audit.md`.

No repository edits, production fixes, oracle runs, or mutation experiments were performed. The baseline's intentionally RED status is not used as survival evidence. Static witness constructions below describe what the frozen comparisons can distinguish; they are not reported as executed mutation results.

Source pointers below use `S:N` for frozen excerpt line N and `old:N` for the original unit-file line. For this excerpt, `old = S + 137`. Other abbreviations are paths within the frozen directory:

- `LB`: `test-ui/editor-line-break.oracle.test.ts`
- `CB`: `test-ui/editor-code-block.oracle.test.ts`
- `IN`: `test-ui/editor-inline.oracle.test.ts`
- `KY`: `test-ui/editor-keyboard.oracle.test.ts`
- `SRC`: `src/ui/format-shortcuts.ts`

SHA-256 provenance:

| Frozen file | SHA-256 |
| --- | --- |
| source-break-block-formula.txt | 86e4bbb01412dfa3c6ec103f24972e3cb2567c24fbac72901ceb5f2719ec8e60 |
| editor-line-break.oracle.test.ts | 1b26854113cb32579d375a2d51a8cfd4bc200ec818e094797917479a4e3290e6 |
| editor-code-block.oracle.test.ts | f00b1a5ca567a1729345c94a6751e51e578d362961d18756570076350337c865 |
| editor-inline.oracle.test.ts | 2582286d9653c7d31499150fd7b0ad5774a616a8961dc9b7ed2a61ab72b22aa0 |
| editor-keyboard.oracle.test.ts | 0c5fae2017a20a08a17ac9d51e346536458793d4a0d6f82997f189e68dd6e3b8 |
| src/ui/format-shortcuts.ts | a20a4d194007cb96e2a1fdbfddab6052a23a445e85fd937c2949fec297ac531c |

## Comparison map

These named maps give exact law, legal grammar, observation, and comparison pointers used by every assertion row below.

**LB-edit**

- Law: `LB:143–146`; nonempty prose gets a hard break, blank/fenced lines an ordinary newline, outside text is preserved, caret follows insertion.
- Grammar: `LB:48–56`, base/examples `LB:58–83`, resolver `LB:85–93`. Each ordinary prefix is exactly `preamble\n` plus a line from `['', ' ', '  ', 'a', 'α😀']` plus 0–12 backslashes. A fenced prefix instead has one constructed opener, the literal `body\n`, optional opposite-marker decoy and candidate closer, and that small final-line vocabulary. Selection and suffix are arbitrary UTF-16 up to 16 units each. `openingEnd` and `closingEnd` provide delimiter-position cases. There is no arbitrary preceding-document field.
- Observation: `LB:129–137` calls the real `breakEdit`, observes the complete edit object and complete applied source, and catches errors.
- Comparison: `LB:98–109` models the edit/source; `LB:149–151` compares the entire edit, entire output, and absence of an error.

**LB-verse**

- Law: `LB:168–171`; repeated nonempty prose lines render breaks inside one paragraph and retain insertion carets.
- Grammar: `LB:161–163,173–179`: 2–8 nonempty alphabetic/Greek lines of 1–12 units; constructed `['one','two','three']` is the original renderer witness.
- Observation: `LB:190–201` repeatedly calls real `breakEdit`, applies each edit, inserts the next line at its returned selection, then observes complete source, `MarkdownIt.render` HTML and every returned edit/caret.
- Comparison: `LB:182–188,203–204` compares complete source, exact HTML and edit/caret sequence, plus no error.

**CB-laws**

- Laws: literal code `CB:160–169`; surrounding source/minimal blank-line boundary `CB:172–181`; selection content `CB:184–193`; usable returned edit/no throw `CB:196–221`.
- Grammar: `CB:45–60` partitions source into `before/picked/after`; surrounding prose is bounded alphanumeric/Greek/emoji text with 0–4 boundary LFs, selected source is arbitrary UTF-16 up to 96 units. `CB:63–79,92–103` explicitly reconstructs all six old code-block inputs: `empty`, `oldText`, `oldTextLf`, `oldBothSides`, `oldSelectedCode`, `oldTrailingLf`.
- Model: `CB:109–124` compares rendered literal contents, raw outside source and minimum boundary padding, and a selection summary `{text: bodyWithoutOneFinalLF, afterNewline: true, beforeNewline: true}`. It deliberately does not construct or compare a fence.
- Observation: `CB:129–153` observes valid edit geometry, real preview-renderer HTML, outside/boundary context located with Markdown fence tokens, and selected substring plus two adjacent-newline booleans. It does **not** observe the full edit or complete output as a compared value.
- Comparison: literal HTML at `CB:168`; context at `CB:180`; selection summary at `CB:192`; independent usable-edit/no-error check at `CB:213–220`.

**KY-structure**

- Law: `KY:63–64`, with structural behavior explained at `KY:11–13`.
- Grammar: masks `KY:49`, key vocabulary `KY:50`, arbitrary keys/masks `KY:51`, all 16 masks for every listed key on both platforms `KY:61,65`. Thus every original structural key/modifier combination is a constructed direct witness.
- Model: `KY:53–59` returns indent only for unmodified Tab, outdent only for Shift+Tab, break only for Shift+Enter, and null otherwise.
- Observation: `KY:67–72` invokes real `structureKey` and observes its return inside `result`.
- Comparison: `KY:46–47,74` compares the full result and no error. This covers classification; browser focus behavior is not itself inferred from the old unit assertions.

**IN-formula**

- Law: `IN:270–277`; trim and wrap, single-dollar versus double-dollar by multiline source, preserve existing display formulas, select inner source, no throw.
- Grammar: `IN:48–52` defines arbitrary UTF-16 text up to 32 units; `IN:220–223` partitions arbitrary prefix/selection/suffix; formula cases/arbitrary at `IN:254–256`. All four exact old inputs are legal in the arbitrary grammar. `formula0`, `formula4`, `formula5`, `formula1` respectively force their selected payloads in a surrounding `a … b` context; only the old whitespace-trimming input has that exact constructed old context.
- Observation: shared `IN:85–92` observes `{edit, output}` from real `formulaEdit` (called at `IN:275`), with errors as data.
- Comparison: formula model `IN:262–268` produces the complete edit and applied output; `IN:276` uses the complete-result/no-error comparison at `IN:91–92`.

## Per-assertion inventory

There are **28 old assertions** in this source unit: 9 break-edit rows, 1 renderer assertion, 6 code-block rows, 8 structural-key assertions, and 4 formula rows. For edit examples, the old equality compares the complete marked result: both source bytes and the marked caret/selection. The source excerpt refers to its old `apply` helper; this audit does not inspect sibling excerpts for the helper definition or invent additional helper behavior.

| ID and source pointer | Original assertion/source witness | Law → legal grammar | Driver observation → comparison | Retained or narrowed material |
| --- | --- | --- | --- | --- |
| B01 `S:5`, `old:142` | At the end of `Tyger Tyger, burning bright,`, append backslash + LF and move the caret after it. | LB-edit; nonempty prose rule applies, but this punctuation/multiword prefix and document-start context cannot be resolved by its grammar. | Full edit and output → exact edit/output/no-error comparison. | Local insertion/caret rule retained on the small generated prose vocabulary; original complete before-source witness is absent. R1. |
| B02 `S:6`, `old:143` | Split `one` from suffix ` two`; preserve both around backslash + LF and place caret before suffix. | LB-edit; suffix is legal, local prose branch represented, but prefix `one` and the complete old document are outside the prefix grammar. | Full edit and output → exact edit/output/no-error comparison. | Suffix preservation and caret rule retained on generated contexts; original complete prefix witness absent. R1. |
| B03 `S:7`, `old:144` | Replace selected `one` in `a one two` with backslash + LF, preserving `a ` and ` two`. | LB-edit; selection/suffix legal, named `replacedSelection` also exists, but nonempty prose prefix ending in the space of `a ` is outside the small line vocabulary. | Full edit and output → exact edit/output/no-error comparison. | Selection replacement rule retained; original preceding-space/source context absent. R1. |
| B04 `S:9`, `old:146` | Empty document becomes one ordinary LF with caret after it. | LB-edit's blank rule; `blank` is constructed but resolves to `preamble\n` before the caret, never the empty document. | Full edit and output → exact edit/output/no-error comparison. | Blank-line rule retained; direct empty-document semantic witness absent. See R1 and its indirect-handler qualification. |
| B05 `S:10`, `old:147` | After `a\n\n`, insert another ordinary LF; retain the earlier paragraph and all blank-line bytes. | LB-edit's blank rule; ordinary resolver has fixed `preamble\n`, with no preceding blank-line sequence field. | Full edit and output → exact edit/output/no-error comparison. | Blank-line insertion retained; existing multi-LF prefix preservation witness absent. R1. |
| B06 `S:11`, `old:148` | After `a` and one existing unpaired backslash, add only LF and place caret after it. | LB-edit; named `odd` has `line: 'a', slashes: 1`, preceded by the fixed preamble. | Full edit and output → exact edit/output/no-error comparison. | Odd-backslash insertion/caret obligation retained; exact document-start fixture compressed into fixed-preamble context. R1. |
| B07 `S:13`, `old:150` | Within a backtick code block, break after `line` using ordinary LF; preserve later LF and closing fence. | LB-edit; backtick fenced state and arbitrary suffix support the same inside-code/suffix shape, but literal body prefix includes fixed `body\n` and small final-line vocabulary. | Full edit and output → exact edit/output/no-error comparison. | Inside-backtick rule and closing-fence suffix preservation represented; exact old body/document fixture absent. R1. |
| B08 `S:14`, `old:151` | After a closed backtick code block, `after` is prose and receives backslash + LF. | LB-edit; `matchingClose` constructs the closed state, but the fixed body/final-line vocabulary excludes exact old source. | Full edit and output → exact edit/output/no-error comparison. | Return-to-prose rule retained; exact old preceding code/prose text absent. R1. |
| B09 `S:15`, `old:152` | Four-tilde fence remains open across a triple-backtick decoy; `still code` gets ordinary LF. | LB-edit; opening widths include 4 and `decoy` constructs opposite-marker decoy behavior. Exact old prefix lacks the resolver's mandatory literal `body\n`, and `still code` is outside its final-line vocabulary. | Full edit and output → exact edit/output/no-error comparison. | Marker mismatch/open-fence obligation retained; exact historical source fixture absent. R1. |
| B10 `S:18–21`, assertion `S:21`, `old:158` | Two successive breaks on `one`, `two`, `three` render exactly `<p>one<br>\ntwo<br>\nthree</p>\n`. | LB-verse; exact original three lines are the constructed `two breaks` history. | Repeated production calls, complete source/HTML/carets → exact complete `verse` object. | Original renderer witness retained; source and carets also compared. |
| C01 `S:28`, `old:165` | Empty document becomes an empty triple-backtick block with caret immediately inside it. | CB-laws; exact `empty` constructed. | HTML/context/selection summary/usable geometry → corresponding four checks. | Empty block, position between adjacent LFs, and context retained; exact triple-backtick wrapper serialization not compared. R2. With this exact output the two-LF selection summary has only the intended empty interior candidate. |
| C02 `S:29`, `old:166` | After `text`, insert exactly two LFs then empty triple-backtick block; caret immediately inside new block. | CB-laws; exact `oldText` constructed. | HTML/context/selection summary/usable geometry → four checks. | Minimal preceding padding retained; wrapper bytes lost (R2); caret membership/absolute position weaker (R3). |
| C03 `S:30`, `old:167` | After `text\n`, reuse that LF and add one LF before empty triple-backtick block; caret inside new block. | CB-laws; exact `oldTextLf` constructed. | HTML/context/selection summary/usable geometry → four checks. | Existing-LF reuse/minimal padding retained; wrapper bytes lost (R2); caret membership weaker (R3). |
| C04 `S:31`, `old:168` | At caret between `text\n\n` and `\n\nmore`, reuse both blank boundaries, insert empty triple-backtick block, caret inside it. | CB-laws; exact `oldBothSides` constructed. | HTML/context/selection summary/usable geometry → four checks. | Both-side boundary reuse and original prose retained; wrapper bytes lost (R2); caret membership weaker (R3). |
| C05 `S:32`, `old:169` | Wrap and retain selected `let a = 1;\nlet b = 2;` exactly in a triple-backtick block; keep the source selected inside. | CB-laws; exact `oldSelectedCode` constructed. | HTML/context/selected exact substring with adjacent LFs/usable geometry → four checks. | Literal body, both selected lines, document boundaries and selected substring retained; exact wrapper serialization absent (R2). On this exact unique-body output the selected substring determines its location; the selection comparison itself does not record location. |
| C06 `S:33`, `old:170` | In `before\n[code\n]after`, remove exactly one selected trailing LF, wrap `code`, add/reuse minimal blank boundaries, select only `code`. | CB-laws; exact `oldTrailingLf` constructed. | HTML/context/selected body without one final LF/usable geometry → four checks. | Final-LF normalization, selected body and boundary/source preservation retained; exact wrapper serialization absent (R2). |
| K01 `S:41`, `old:178` | Unmodified Tab returns `indent`. | KY-structure; key Tab/mask 0 constructed on both platforms. | Direct real return → exact result/no error. | Retained. |
| K02 `S:42`, `old:179` | Shift+Tab returns `outdent`. | KY-structure; Tab/mask 8 constructed on both platforms. | Direct real return → exact result/no error. | Retained. |
| K03 `S:43`, `old:180` | Shift+Enter returns `break`. | KY-structure; Enter/mask 8 constructed on both platforms. | Direct real return → exact result/no error. | Retained. |
| K04 `S:44`, `old:181` | Unmodified Enter returns null. | KY-structure; Enter/mask 0 constructed on both platforms. | Direct real return → exact result/no error. | Retained. |
| K05 `S:46`, `old:183` | Cmd+Shift+Enter returns null. | KY-structure; Enter/mask 9 constructed on both platforms. | Direct real return → exact result/no error. | Retained. |
| K06 `S:47`, `old:184` | Ctrl+Shift+Enter returns null. | KY-structure; Enter/mask 10 constructed on both platforms. | Direct real return → exact result/no error. | Retained. |
| K07 `S:48`, `old:185` | Ctrl+Tab returns null. | KY-structure; Tab/mask 2 constructed on both platforms. | Direct real return → exact result/no error. | Retained. |
| K08 `S:49`, `old:186` | Alt+Tab returns null. | KY-structure; Tab/mask 4 constructed on both platforms. | Direct real return → exact result/no error. | Retained. |
| F01 `S:56`, `old:193` | Empty document becomes two single dollars with the caret between them. | IN-formula; exact full input legal in arbitrary source partitions; `formula0` constructs empty selection in `a … b`. | Complete real edit/source → complete modeled edit/source/no error. | Behavior and exact input remain within semantic grammar, though the original empty-document semantic witness is no longer a named constructed formula case. The separate valid-input oracle constructs an empty document but compares usability, not this exact formula result. |
| F02 `S:57`, `old:194` | In `area pi r^2 here`, wrap selected `pi r^2` in single dollars, select inner source, preserve outside text. | IN-formula; exact full input is legal arbitrary data; `formula4` constructs same payload with other context. | Complete real edit/source → complete modeled edit/source/no error. | Retained across legal arbitrary contexts; exact old complete context not forced as a constructed case. |
| F03 `S:58`, `old:195` | Selected `\int f\ndx` becomes double-dollar display source with the same inner selection. | IN-formula; exact full input legal; `formula5` constructs same payload with surrounding context. | Complete real edit/source → complete modeled edit/source/no error. | Retained; exact document-edge instance legal but not separately constructed. |
| F04 `S:59`, `old:196` | Trim selected ` x ` inside `a … b`, single-dollar wrap `x`, select only `x`, preserve `a ` and ` b`. | IN-formula; `formula1` with helper `t` exactly reconstructs the old complete source partition. | Complete real edit/source → complete modeled edit/source/no error. | Retained as exact constructed source witness. |

## Comment/source-witness inventory

The old source carries several explanations in addition to assertions. These are inventoried separately so their rationale is not silently treated as a separate assertion or lost through table compression.

| Pointer | Supported source item | Reduction trace |
| --- | --- | --- |
| `S:8`, `old:145` | “Nothing to break after, or already broken: an ordinary newline.” | Empty/blank and odd-backslash rules appear in LB law/model (`LB:100–104`) and constructed `blank`/`odd` histories (`LB:64–65`). Their local behavior survives; the complete empty-document and prior-multiple-LF witnesses are narrowed as R1 records. |
| `S:12`, `old:149` | “Inside a code block a backslash would be a backslash.” | Explicit in `LB:11–15,144`; both fence markers, opposite-marker decoy and closer boundaries are grammar states. The content is not rejected; exact old document shapes are compressed as R1. |
| `S:40`, `old:177` | Structural keys are Tab, Shift+Tab and Shift+Enter, with no command modifier. | Retained in KY chord table (`KY:58`) and all masks; direct observation compares exact return. |
| `S:45`, `old:182` | Cmd/Ctrl+Shift+Enter is reserved to focus view; Ctrl+Tab belongs to browser. | The `null` returns that leave those keys available are retained (`KY:58,61,67–74`). The rationale's specific focus-view/browser destination is not mentioned in the new law text, and neither old unit nor new classifier actually observes those destinations. This is explanatory-text compression, not a lost tested destination behavior. |
| `SRC:134–145` | Use visible backslash hard-break form, with an unpaired existing backslash needing no added marker. | LB full edit/output model asserts the source backslash form and parity; retained. |
| `SRC:148,151–160` | Fence selected source, reuse needed boundary newlines, empty caret inside block, preserve literal selected source. | CB literal/context laws retain the content and spacing obligations. The source's exact returned inside offset becomes substring/newline summary, R3; the old exact fence wrapper becomes renderer equivalence, R2. |
| `SRC:163–175` | Formula is selected inner source between dollars, multiline/display treatment, caret in empty pair. | IN-formula models/compares complete edit and output. The proposed unchanged-existing-display expectation is an approved pending change, not old-test survival evidence or a recovered omission. |

## Recovered/dropped traces

The numbering identifies items only. It is not a ranking. Reduction rules below are mechanically inferred from the frozen grammar and comparisons, except where comments explicitly state the choice; they are not claims about an author's unstated motives.

### R1 — Complete Shift+Enter source contexts became a fixed-prefix/small-line grammar

**Original support:** all nine edit rows `S:5–15` (`old:142–152`). Particularly distinct supported contexts are the empty document (`S:9`), an existing paragraph followed by two LFs (`S:10`), multiword/punctuation prose (`S:5`), the space immediately before a removed selection (`S:7`), and the exact code/decoy histories (`S:13–15`). Each old expected marked string retains all its preceding source as well as the insertion/caret.

**Where it vanished:** `LB:48–55` chooses only five current-line values; `LB:85–92` constructs every ordinary source with literal `preamble\n` and every fenced source with the fixed `body\n` portion. No direct break history reaches `from === 0`; no ordinary source prefix retains an earlier blank-line run; no current-line choice reaches the old punctuation/multiword or preceding-space prose. Selected/suffix fields are arbitrary, but preceding source is not. None of the nine complete original source documents is a direct LB-edit history, although their local branches (plain, selection, blank, odd slash, inside fence, closed fence, opposite-marker decoy) are represented.

**Retained observation:** once a generated context exists, the direct oracle compares the complete edit and complete output, so the loss is in legal-history construction, not a weakened comparison of those generated histories.

**Reduction rule:** **compression** of concrete preceding documents into annotated fence envelope and small local-line categories. This is visible in `LB:24–34` and the resolver. It is not a majority-agreement inference.

**Cross-oracle qualification:** the full keyboard handler's legal generated history can indirectly reach an empty document with `content: 'word'`, `body: ''`, Shift+Enter mask 8, and zero selection offsets (`KY:161–183,197–200,220–235`), because body is allowed empty. That route models exact ordinary-LF output. It is outside this assignment's structural-key portion and is not a direct named break history. Therefore R1 must not be described as proof that the entire proposed suite can never exercise an empty-document break. It does establish that the direct break oracle dropped that old source witness and narrowed preceding-source shape. No sibling audit is required to see this distinction.

### R2 — Exact code-block wrapper source became render-equivalent fence representation

**Original support:** all six old code-block rows `S:28–33` (`old:165–170`) expect exact source with triple backticks, literal LFs, and the shown empty/nonempty body placement. This support is source serialization in the old expectations; deciding whether that representation deserves restoration is outside this audit.

**Where it vanished:** `CB:109–124` models HTML/context/selection without constructing a fence. `CB:129–150` does not observe complete edit/source for comparison. `CB:168,180,192` compare rendered literal content, source outside the block and boundary padding, and selection summary. The boundary token maps identify lines around the block, but do not compare the opening/closing delimiter bytes.

**Static discrimination witness:** for a source containing no conflicting backticks (all six old inputs), replacing the expected triple-backtick wrapper with a four-backtick wrapper, adjusting returned selection offsets to the same body, preserves literal rendered HTML, context before/after the block, selection summary, and usable geometry. It differs from every old exact expected marked string. This claim is about what values the frozen comparisons inspect; no mutation run was performed.

**Reduction rule:** **explicit rejection of fence representation as a comparison category**, documented at `CB:11–14` (“independently of how the formatter chooses a fence”), `CB:29–30` (“does not construct a fence”), and `CB:113`. The law moved from the old source witness to rendered literal contents plus context.

### R3 — Empty code-block caret's membership in the new block became empty text plus adjacent LFs

**Original support:** `S:29–31` (`old:166–168`) place the returned caret immediately after the new opening fence's LF, inside the newly inserted empty block. These examples also create or already contain blank boundaries outside that block.

**Where it vanished:** `CB:122` models only `{text: '', afterNewline: true, beforeNewline: true}` for empty selections; `CB:146–149` observes those same three values. `CB:192` compares that summary. No compared value says the caret is between the fences or records its absolute offset relative to the new block. Valid geometry at `CB:133–136,215–220` checks bounds, not block membership.

**Static discrimination witness:** the exact `oldText` output is `text\n\n` + triple-backtick + `\n\n` + triple-backtick. The expected caret is at UTF-16 offset 10, immediately after the opening-fence LF. A returned empty selection at offset **5** is between the two LFs before the block: selected text is still empty, the previous and next characters are both LF, and the offset is usable. Changing only `start/end` from 10 to 5 leaves compared HTML and context unchanged, and the selection summary is identical. The old marked-string assertion distinguishes these selections. The same ambiguity exists for `oldTextLf` and `oldBothSides`. This is a static witness, not an executed mutant.

**Reduction rule:** **category mismatch**: a positional caret/selection witness was projected into selected-content plus local-character predicates. Empty selected content has no identity, so those predicates no longer identify the new block. This is narrower than the new selection law's prose, which still says “a caret inside the empty block” (`CB:188`).

## Pass boundary

All 28 assertions and the source explanations above have a traced reduction. Structural-key return values, the original rendered-verse assertion, and the four formula behaviors have matching law/grammar/observation/comparison paths. The traces above retain narrower or dropped source material without deciding its value or restoration. The approved pending formula/fence changes and intentionally RED baseline were not classified as source-survival evidence. No Field Log was created.
