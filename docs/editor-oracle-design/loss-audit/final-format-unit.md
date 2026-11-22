# Frozen loss audit: formatting unit source

Instrument: Field Lab `loss-audit` (`reference/instruments/loss-audit.md`, read in full). This is one isolated source scan. It records supported observations and their disposition; it does not judge their usefulness or decide whether to restore anything.

## Scope and evidence boundary

- Original: `/private/tmp/blygger-final-editor-loss-audit/old/test-ui/format-shortcuts.test.ts`, from `28b0c8d642a87e5810ad6eabd95c2d1714c53396`; SHA-256 `4187c4b45f9296f33aed8683416353907ecda5cc4e3c5581891f7106c89143cf`.
- Frozen reduction: `/private/tmp/blygger-final-editor-loss-audit/new/test-ui/editor-*.oracle.test.ts` and `new/test-ui/editor-oracles/*.ts`.
- Manifest: `/private/tmp/blygger-final-editor-loss-audit/manifest.json`. The original and all 41 replacement test/helper files matched their manifest hashes during this scan.
- Only the named old source was read. No sibling old unit or browser source was read. New source comments that cite those siblings are not independent evidence about their contents.
- Line numbers below refer to these frozen files, not to a changing worktree. `old:L` means the original above; replacement paths are relative to the frozen `new/` directory.
- Evidence here is source inspection plus hash verification. No browser job, property run, mutation run, or production change was performed. The presence of a constructed history, driver and check is not a claim that they ran or passed.

**Readout:** this scan did not identify an original asserted source/output/selection/null/key/renderer observation that is absent or weakened in the frozen replacement source. The tables preserve the trace supporting that bounded result. This is not an execution-backed or universal zero-loss claim. The old source does not assert undo, actual focus movement, browser event receipt, or arbitrary-input totality; those cannot be credited as recovered old assertions.

## Replacement observation paths

These path identifiers make the per-observation tables readable. Each includes the history, model, production driver and comparison checkpoint.

| Path | Frozen replacement source and observation chain |
| --- | --- |
| E | `test-ui/editor-inline.oracle.test.ts:50–58`, property `editor-emphasis-single`; histories `emphasisCases` in `test-ui/editor-oracles/inline-model-oracle.ts:69–109`; `emphasisPlan` at 121–124 builds source/offsets; `emphasisEdit` at 126–147 and `emphasisModel` at 150 predict the result; driver at test line 55 invokes browser `formatEdit(text, from, to, kind)`; `check` at 56 compares full output, final `[start,end]` and usability through `document-oracle.ts:24–32`. |
| M | `test-ui/editor-inline.oracle.test.ts:60–68`, `editor-emphasis-multiline`; `multiCases` at `inline-model-oracle.ts:170–182`; `multiPlan` at 192–195, `multiEdit`/`multiModel` at 197–208; browser `formatEdit` at test line 65, same result/check path at 66. |
| L | `test-ui/editor-inline.oracle.test.ts:70–78`, `editor-link`; `linkCases` at `inline-model-oracle.ts:229–236`; `textPlan` at 214, `linkEdit`/`linkModel` at 243–252; browser `formatEdit(...,'link')` at test line 75 and full result/check at 76. |
| F | `test-ui/editor-inline.oracle.test.ts:80–88`, `editor-formula`; `formulaCases` at `inline-model-oracle.ts:254–263`; `textPlan` at 214, `formulaEdit`/`formulaModel` at 293–301; browser `formulaEdit(text,from,to)` at test line 85, full result/check at 86. |
| K | `test-ui/editor-keyboard.oracle.test.ts:46–60`, `editor-key-classification`; all `keyCases` at `test-ui/editor-oracles/keyboard-model-oracle.ts:12–27`; `chord` at 18–25 is the independent table, `mods` at 10 decodes masks; browser `formatKey(event,mac)` and `structureKey(event)` at test lines 51–56; result/error comparison at 58 via `document-oracle.ts:31–32`. |
| I | `test-ui/editor-list.oracle.test.ts:51–64`, `editor-list-source`; `cases`/original reconstructed histories at `test-ui/editor-oracles/list-model-oracle.ts:53–110`; `resolve` at 112–127, `model`/`moveRows` at 131–164; browser `indentEdit(text,from,to,out)` at test line 57; observes the full edit or `null` and complete output at 59; compares both and absence of error at 62. |
| R | `test-ui/editor-list.oracle.test.ts:69–88`, `editor-list-rendering`; `nestingCases` at `list-model-oracle.ts:198–210`; `nestingPlan` at 224–228 and `nestingModel`/`listStructure` at 218–235; browser `indentEdit(...,false)` at test line 76; parses actual output with MarkdownIt and observes full list token ancestry/content, tightness, parent preservation, no code tokens, no rendered `<pre>`, and caret at output end at 80–84; comparison at 86. |
| B | `test-ui/editor-line-break.oracle.test.ts:47–74`, `editor-line-break`; `old*` histories at `test-ui/editor-oracles/break-model-oracle.ts:40–51`, registration at 54–67 and 110–115; `resolve` at 69–77 and `model` at 84–95; browser `breakEdit(text,from,to)` at test line 48; edit/output/error comparisons at 66–68. |
| V | `test-ui/editor-line-break.oracle.test.ts:97–143`, `editor-line-break-verse`; constructed `two breaks` at 110–111 is `['one','two','three']`; model at 115–121 predicts exact source, HTML and both edit/caret records; browser break calls and insertion at returned selection at 123–134; exact verse/error comparison at 136–137. |
| C | `test-ui/editor-code-block.oracle.test.ts`: shared driver 52–84 invokes browser `codeBlockEdit(text,from,to)`, computes full output, renders preview, records default serialization, block boundaries and selection geometry. `test-ui/editor-oracles/block-model-oracle.ts:20–39,55–67` supplies histories, `resolve` at 41–44 and `model` at 76–94 predict results. `editor-code-block.default-source` at test 131–141 checks exact triple-backtick/LF output at 139 for all original selections; `editor-code-block.selection` at 118–128 compares selected body and its exact position inside the block at 126; context comparison at 113 additionally checks boundaries. |

All inline result checks observe the same information the old marked-string helpers expose: full resulting source and final caret or selected interval. The old helpers at `old:5–14,72–82` do not require a particular replacement span when different spans produce the same source and final selection. The new inline `result` helper preserves that observational boundary and adds validity checks. List and break checks additionally compare the concrete edit.

The common production transport is `test-ui/editor-oracles/browser-driver-oracle.ts:48–55,152–157`: it passes supplied arguments unchanged into the selected production function in the browser and reports thrown errors as data. A functioning configured browser is a run premise (`23–39`); this audit has not established it by execution.

## Original emphasis, link and formula observations

For these tables, “retained” means the exact old source and selected range/caret are constructed, the model yields the old output and final selection, and the named driver/check observes those values. It describes source coverage, not a run result.

| Original support | Original observation | Exact replacement history and disposition |
| --- | --- | --- |
| old:19 | Selected word gets bold markers, word remains selected; outside `a ` / ` b` preserved. | E `sourceBold` (`inline-model-oracle.ts:94`), retained. |
| old:20 | Selected word gets italic markers with same selection/context. | E `sourceItalic` (95), retained. |
| old:21 | Bold markers outside selection are removed. | E `sourceOutsideBold` (96), retained. |
| old:22 | Italic markers outside selection are removed. | E `sourceOutsideItalic` (97), retained. |
| old:23 | Bold markers included in selection are removed; word remains selected. | E `sourceSelectedBold` (98), retained. |
| old:24 | Italic markers included in selection are removed. | E `sourceSelectedItalic` (99), retained. |
| old:25 | Italic inside external bold produces three stars on each side with only word selected. | E `sourceAddItalicInsideBold` (100), retained. |
| old:26 | Bold inside external italic produces three stars on each side. | E `sourceAddBoldInsideItalic` (101), retained. |
| old:27 | Removing bold from external triple stars preserves italic. | E `sourceRemoveBoldKeepOutsideItalic` (102), retained. |
| old:28 | Removing italic from external triple stars preserves bold. | E `sourceRemoveItalicKeepOutsideBold` (103), retained. |
| old:29 | Empty bold insertion after `a` creates paired markers and puts caret between them. | E `sourceEmptyBold` (104), retained. |
| old:30 | Empty italic insertion puts caret between its markers. | E `sourceEmptyItalic` (105), retained. |
| old:31 | Empty external bold pair is removed; caret returns after `a`. | E `sourceEmptyOutsideBold` (106), retained. |
| old:32 | Empty external italic pair is removed. | E `sourceEmptyOutsideItalic` (107), retained. |
| old:33 | Selected trailing space moves outside bold; only `word` remains selected. | E `sourceTrailingWhitespace` (108), retained. |
| old:39 | Bold wraps nonblank lines separately, preserves intervening blank line, selects entire transformed region. | M `sourceBlank` (175; `blank` input at 160), retained. |
| old:40 | Bold removes each line's markers across a blank line; selection covers original plain lines. | M `sourceRemoveAcrossBlank` (177–180), retained. |
| old:41 | Mixed italic selection adds one star on both lines, including the already italic line. | M `sourceMixed` (182; `mixed` at 162), retained. |
| old:47 | Selected label `word` becomes `[word]()` with caret inside destination. | L `sourceLabel` (232), retained. |
| old:48 | Whole-document selected URL becomes `[](https://x.example/a)` with caret in label. | L `sourceWholeDocumentTarget` (234), retained. |
| old:49 | Empty selection within `a  b` becomes `a [|]() b` (caret in label), preserving surrounding spaces. | L `sourceCaret` (236; `t('')` at 216), retained. The actual output is `a []() b`, caret at offset 3. |
| old:193 | Empty-document formula is `$$` with caret between dollars. | F `sourceEmptyDocument` (257), retained. |
| old:194 | Selected `pi r^2` in `area … here` gets single dollars; inner source stays selected. | F `sourceArea` (259), retained. |
| old:195 | Selected whole-document multiline `\\int f\ndx` gets double dollars; both lines stay selected. | F `sourceMultiline` (261), retained. |
| old:196 | Formula trims selected ` x ` to `x`, retains surrounding `a ` / ` b`, selects inner `x`. | F `sourceTrimmed` (263), retained. |

The source contains no formula-renderer assertion. New formula laws about existing display wrappers and arbitrary UTF-16 inputs are additional replacement claims, not observations recovered from this old source.

## Original key classification observations

`keyCases` is the Cartesian product of the key list, all 16 modifier masks, and both explicit `mac` values (`keyboard-model-oracle.ts:12–27`). Every old event is therefore a constructed input, not merely a possible random draw. In the following table, mask bits are Meta=1, Ctrl=2, Alt=4, Shift=8; path K compares the exact command or `null`.

| Original support | Exact old input and observation | Replacement disposition |
| --- | --- | --- |
| old:56 | `b`, mask 1, Mac → `bold`. | K, retained. |
| old:57 | `k`, mask 2, Mac → `null`. | K, retained. |
| old:60 | `i`, mask 2, other platform → `italic`. | K, retained. |
| old:61 | `i`, mask 1, other platform → `null`. | K, retained. |
| old:64 | `b`, mask 0, other platform → `null`. | K, retained. |
| old:65 | `x`, mask 2, other platform → `null`. | K, retained. |
| old:66 | `b`, mask 10, other platform → `null`. | K, retained. |
| old:67 | `B`, mask 2, other platform → `bold`. | K, retained. |
| old:178 | `Tab`, mask 0 → `indent`. | K structural result, retained for both platform classes. |
| old:179 | `Tab`, mask 8 → `outdent`. | K, retained. |
| old:180 | `Enter`, mask 8 → `break`. | K, retained. |
| old:181 | `Enter`, mask 0 → `null`. | K, retained. |
| old:183 | `Enter`, mask 9 → `null`. | K, retained. |
| old:184 | `Enter`, mask 10 → `null`. | K, retained. |
| old:185 | `Tab`, mask 2 → `null`. | K, retained. |
| old:186 | `Tab`, mask 4 → `null`. | K, retained. |

The old format-key helper explicitly supplies `mac=true/false`; it does not test the platform-detecting default. The old structure helper passes only its event, as the replacement does. Neither old helper dispatches a real keyboard event.

## Original list source, caret and decline observations

All histories below are in `list-model-oracle.ts:77–102` and flow through path I. Its model preserves blank rows (`145–146`), restarts/continues numbers (`153–156`), clamps a caret in removed indentation (`161–162`), excludes next-start rows (`resolve:120–125`), and returns `{edit:null,output:original}` for declines (`139–142,159`).

| Original support | Original observation | Exact replacement history and disposition |
| --- | --- | --- |
| old:89 | Indent EOF `- b` under `- a`, caret after `b`. | `originalIndentBullet` (78), retained. |
| old:90 | Same line, caret before marker moves with indentation. | `originalIndentBeforeMarker` (79), retained. |
| old:92 | `2. b` under `1. a` becomes `1. b`; following `3. c` unchanged. | `originalNumberRestart` (80), retained. |
| old:93 | After existing `1. b` sublist, `2. c` keeps `2.` when indented. | `originalNumberContinuation` (81), retained. |
| old:94 | `10. b` under `9. a` restarts at `1.` and caret accounts for shorter marker. | `originalNumberWidth` (82), retained. |
| old:95 | Indented `+ b c` under `* a` gains four spaces; caret stays between `b` and space. | `originalMixedBullets` (83), retained. |
| old:96 | `10) b` under bullet restarts as `1) b`. | `originalParenthesis` (84), retained. |
| old:97 | Empty `-` marker is indentable, with caret after marker. | `originalEmptyMarker` (85), retained. |
| old:101 | Outdent removes four spaces. | `originalOut4` (86), retained. |
| old:102 | Outdent removes two spaces. | `originalOut2` (87), retained. |
| old:103 | Outdent removes one tab. | `originalOutTab` (88), retained. |
| old:104 | Eight spaces outdent to four. | `originalOut8` (89), retained. |
| old:106 | Caret inside removed indentation clamps to that line's start. | `originalCaretInsideIndent` (90), retained. |
| old:110 | Multiline indent preserves intervening blank and following `- d`; transformed whole lines stay selected. | `originalMultiple` (91), retained. |
| old:111 | Multiline outdent retains selection over both transformed lines. | `originalMultipleOut` (92), retained. |
| old:113 | Selection ending at next line start excludes next `- b`; selected region ends before its LF. | `originalNextStart` (93), retained. |
| old:117 | Plain `plain| text` declines. | `originalPlain` (94), retained as exact `null`, not just unchanged output. |
| old:118 | Empty document declines. | `originalEmpty` (95), retained as exact `null`. |
| old:119 | `-not a list` declines. | `originalNonlist` (96), retained as exact `null`. |
| old:120 | Selection containing list line and prose declines. | `originalMixedSelection` (97), retained as exact `null`. |
| old:121 | Outdent at margin declines. | `originalMarginOut` (98), retained as exact `null`. |
| old:122 | `**bold** start` declines. | `originalBoldProse` (99), retained as exact `null`. |
| old:124 | First list item at document start declines; following item unchanged. | `originalNoParent` (100), retained as exact `null`. |
| old:125 | First item after prose plus blank line declines. | `originalProseParent` (101), retained as exact `null`. |

The old helper encodes decline as `∅` only when `!edit` (`old:78`); production's typed decline is `null`. The replacement requires literal `null`, so it does not replace rejection with an allowed no-op edit. The old description “so Tab moves focus as usual” (`old:116`) motivates the null assertion but does not observe actual focus movement.

## Original list renderer observations

At `old:131–134`, each concrete input must render a nested list under `a` with first child `b` (whitespace-insensitive HTML pattern) and no `<pre>`. Path R preserves the input and compares an explicit token ancestry containing that relation, requires tight paragraph structure, and separately renders the tokens to check no `<pre>`. It is not reduced to a source-only indentation assertion.

| Original concrete input at old:131 | Replacement history (`list-model-oracle.ts`) | Disposition |
| --- | --- | --- |
| `- a\n- b` with EOF caret | `originalBulletChild` (205). | Both old renderer observations retained through R. |
| `1. a\n2. b` with EOF caret | `originalNumberedChild1` (206). | Retained through R. |
| `10. a\n11. b` with EOF caret | `originalNumberedChild10` (207). | Retained through R. |
| `- a\n2. b` with EOF caret | `originalMixedLists` (208). | Retained through R. |
| `- a\n    - b\n    - c` with EOF caret | `originalExistingSublist` (209), plus exact source transform in I `existingBulletSource` (102). | Retained through R; the replacement also checks `c` under `b`. |

## Original breaks and code-block observations

| Original support | Original observation | Exact replacement history and disposition |
| --- | --- | --- |
| old:142 | EOF prose verse line gains backslash + LF, caret after LF. | B `oldVerseLine` (`break-model-oracle.ts:43`), retained. |
| old:143 | Mid-line `one| two` gains hard break while suffix stays unchanged. | B `oldMidLine` (44), retained. |
| old:144 | Selected `one` is replaced by hard break; prefix/suffix and final caret exact. | B `oldSelection` (45), retained. |
| old:146 | Empty document gets ordinary LF. | B `oldEmptyDocument` (46), retained. |
| old:147 | Existing `a\n\n` gets one more LF. | B `oldBlankParagraph` (47), retained. |
| old:148 | Existing unpaired backslash gets only LF. | B `oldUnpairedSlash` (48), retained. |
| old:150 | Inside backtick fence, ordinary LF; closing fence suffix preserved. | B `oldInsideBackticks` (49), retained. |
| old:151 | After closed fence, prose gets hard break. | B `oldAfterFence` (50), retained. |
| old:152 | Backtick decoy inside four-tilde fence does not close it; ordinary LF. | B `oldOppositeMarker` (51), retained. |
| old:157–158 | Two successive edits produce exact MarkdownIt `<p>one<br>\ntwo<br>\nthree</p>\n`. | V constructed `two breaks`, retained. It invokes production twice and compares exact HTML; returned edit/caret records are additionally checked. |
| old:165 | Empty block default output is triple ticks + LF, caret inside, LF + triple ticks. | C `empty` (`block-model-oracle.ts:22`), retained through default-source plus selection checks. |
| old:166 | Empty block after `text` inserts exactly two separating LFs. | C `oldText` (57), retained. |
| old:167 | Existing one trailing LF is reused, adding only one separator LF. | C `oldTextLf` (58), retained. |
| old:168 | Existing two LFs on both sides are reused; `more` unchanged. | C `oldBothSides` (59), retained. |
| old:169 | Both selected code lines retain literal source and selection inside default fence. | C `oldSelectedCode` (60), retained. |
| old:170 | Selected trailing LF is excluded from selected body; `before`/`after` receive exact blank boundaries. | C `oldTrailingLf` (61), retained. |

The block driver's default-source checkpoint is omitted only for selected text containing a backtick (`editor-code-block.oracle.test.ts:63`). None of the six old selected bodies contains one, so all six exact default-wrapper expectations remain checked. Its block-relative `bodyStart/bodyEnd` checks (`77–83`) retain the empty-caret location rather than accepting an arbitrary empty interval elsewhere in the document. The old tests only specify resulting source and selection, not an internal edit span or a renderer result for these code-block cases.

## Original argument shape and input admission

The following is a source-level admission check. It identifies the generator/constructed route that admits each original input; it does not substitute for a runner's admission/replay report.

| Original boundary | Replacement support and disposition |
| --- | --- |
| Marked strings become exact source plus ordered UTF-16 selection (`old:5–14,72–82`). | E/M/L/F/C plans build the same partitions; I reconstructs line offsets/modes; B retains literal prefix/selected/suffix. All exact old contexts are named constructed histories above, rather than relying on random generation of their spellings. |
| Single-line emphasis sources, including outside versus selected stars, empty selection after `a`, and trimmed trailing space. | `inline-model-oracle.ts:55–59` permits both kinds, 0–6 outside star counts, row records, arbitrary contexts ending/starting in non-star edges. `rowArbitrary:36–40` admits `word` or empty body, 0–6 selected star counts and whitespace from 32. Source histories 94–108 use those values. None needs the arbitrary generator to invent a missing context category. |
| Whole-document multiline sources with one blank line or mixed selected stars. | `multiArbitrary:152` admits 2–6 annotated rows and empty contexts; source histories 175–182 use three or two rows with bodies `one`/`two` explicitly admitted by `rowArbitrary`. |
| Label, exact whole-document URL and empty link selection; four formula partitions. | `textArbitrary:210`, `anyText:5` and UTF-16 `unit` in `document-oracle.ts:9–12` admit all old prefix/body/suffix strings within 32 units. Link/formula named histories construct their exact offsets. The whole-document URL is not replaced by only the generic `a … b` URL case. |
| List rows, caret offsets, selections ending at next start, suffixes and declines. | `list-model-oracle.ts:28–49` admits the exact parent names, marker/indent/gap variants, prose spellings and suffixes used by originals; original bodies fit `bodyArbitrary`'s letter-starting/space alphabet and 24-unit bound, while `**bold** start` uses explicit prose. Modes/offsets are independently admitted; `resolve:118–123` yields each old caret/range. Original records 78–101 retain their EOF or following-line context instead of receiving a common extra list suffix. |
| Five renderer inputs, including bullet child and existing sublist. | `flatNestingArbitrary:185–189` admits the parent/child numbers and optional independently chosen bullet child; `existingNestingArbitrary:191–194` admits the three-line case. Exact histories 205–209 use the old source spellings. |
| Nine break examples, including long verse prefix and unusual fence contexts. | Generic `generatedArbitrary` alone restricts `line` to a few spellings (`break-model-oracle.ts:11`). The actual `arbitrary` explicitly adds the coherent original literal-prefix histories through `constantFrom` (`58–60`), and all are constructed (`54–67,113–115`). Thus `Tyger…`, whole preceding blank paragraphs, and the tilde/backtick decoy input are admitted even though absent from the generic line enum. |
| Repeated renderer break observation. | `verseArbitrary:120–122` admits the lowercase `one`/`two`/`three` words and three-line sequence; V guarantees that exact sequence as a constructed history. |
| Six block inputs, empty selections at multiple context boundaries, and selected final LF. | `block-model-oracle.ts:10–16` admits the original ordinary prose/newline contexts and arbitrary selected source up to 96 units. `empty` plus `oldText/oldTextLf/oldBothSides/oldSelectedCode/oldTrailingLf` construct all six. |
| Explicit format-key Mac argument and structural event modifier booleans. | K reconstructs the same explicit booleans through masks; the key array includes `b`, `B`, `i`, `k`, `x`, `Tab`, `Enter`; all masks and both explicit platform classes are constructed. |
| Default trailing argument(s) omitted for break/code/formula (`old:140,163,191`, through `apply` calling `make(text,from,to)` at 77). | B's driver at test line 48, C's at 53, and F's at 85 each pass exactly three arguments. Browser transport spreads exactly that argument array (`browser-driver-oracle.ts:152–156`). Thus the old omitted-argument call shape remains exercised; it is not replaced by explicitly supplied optional settings. |
| Explicit fourth argument for list, explicit fourth kind for inline (`old:10,84–85`). | I passes exact boolean `out`; E/M/L pass exact formatting kind. Retained. |

## Recovered/dropped trace and limits

No absent or weakened **asserted** observation was identified in this source-level comparison, so there is no supported dropped item to attribute to compression, majority agreement, category mismatch, low salience, or explicit rejection. The reconstructed `source*`, `original*`, `old*`, default-source and verse histories are the concrete preservation traces; their presence was checked rather than inferred from broad property names or authority comments.

Three distinctions prevent crediting unsupported retention or inventing a loss:

1. **Undo:** the complete old source contains no `applyEdit` invocation, browser action, undo call, undo-state assertion or undo checkpoint. New keyboard/session comments and laws refer to undo, but there is no old undo observation in this one source to recover or drop. Other old sources remain outside this scan.
2. **Focus/dispatch:** `old:116` and `old:55` discuss focus/system text motions; actual assertions check `indentEdit` decline and `formatKey` classification. Those exact null observations are mapped above. Real focus movement, keyboard dispatch, and browser-native motions are not established by this source.
3. **Execution and scope:** broad generated laws, configured browser availability, source transport fidelity in a real run, property-run admission, calibration failures, and mutation detection are not proven by this audit. Hash verification froze the comparison; it did not execute the replacement. This report only establishes the listed source-to-source observation paths and their input construction.
