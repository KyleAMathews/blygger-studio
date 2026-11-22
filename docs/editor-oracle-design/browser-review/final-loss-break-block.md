# Final loss audit: breaks, blocks, structural keys and formulas

Date: 2026-11-18. Worktree: `/Users/kyle.mathews/programs/blygger-studio/.worktrees/oracles-explore`.

**Readout:** all **28 historical assertions** in `test-ui/format-shortcuts.test.ts:139–198` have retained exact source/event contexts and equivalent or stronger compared observations in the extracted model/oracle arrangement. This is a read-only source audit, not a claim that the current browser/Worker run passes. The announced pending USVString repair to the block HTML model is recorded below; it does not remove an old assertion or authorize removal of surrogate histories.

The selected loss-audit card was applied as in the earlier pass: rescan this single old source unit, trace each item through the candidate, record omissions without ranking or deciding restoration. No sibling audit report was read for this pass. No tests, browser runs, oracle-gaps runs or repository changes were performed. The only artifact written is this report.

## Scope and provenance

Old source inspected: `test-ui/format-shortcuts.test.ts`, especially the old `apply` helper at lines 71–83 and the assigned source unit at lines 139–198. The helper strips source markers, calls the edit function, applies its replacement, and reconstructs a marked caret or selection from returned `start/end`. Thus the old assertions observe resulting source plus final caret/selection. They do not separately require a particular replacement span when the same output and selection result.

Candidate inspected:

- `test-ui/editor-line-break.oracle.test.ts` (`LB`)
- `test-ui/editor-code-block.oracle.test.ts` (`CB`)
- `test-ui/editor-inline.oracle.test.ts` (`IN`), formula portion and shared observation
- `test-ui/editor-keyboard.oracle.test.ts` (`KY`), classification portion
- `test-ui/editor-oracles/break-model-oracle.ts` (`BM`)
- `test-ui/editor-oracles/block-model-oracle.ts` (`CM`)
- `test-ui/editor-oracles/inline-model-oracle.ts` (`IM`), formula portion and text partitions
- `test-ui/editor-oracles/keyboard-model-oracle.ts` (`KM`), classification portion
- `test-ui/editor-oracles/document-oracle.ts` (`DM`)
- `test-ui/editor-oracles/browser-driver-oracle.ts` (`BD`)
- `test-ui/editor-oracles/browser-source-oracle.ts` (`BS`)
- Configuration references to `formattingBrowserSource` and the formatting-run script's browser/application environment wiring.

Pointers below are one-based lines in these files as read for this pass. Paths are relative to the worktree identified above.

## Laws, grammar, driver observations and comparisons

### Break source edits

**Law:** `LB:57–65` retains ordinary-newline versus hard-break semantics, outside-source preservation and caret placement. **Grammar:** `BM:5–13` retains the existing bounded generated fence envelope; `BM:43–51` explicitly reconstructs all nine old complete source contexts. `BM:54–60` includes their fully resolved, coherent records in the arbitrary using `fc.oneof(generatedArbitrary, fc.constantFrom(...))`. `BM:113–115` returns those same records from constructed histories, retaining admission/shrinking support instead of constructing out-of-grammar literal cases.

**Resolve/model:** `BM:69–76` uses the literal complete prefix when present and calculates exact original text and selection offsets. `BM:84–94` independently calculates the edit and complete output from semantic annotations. **Driver:** `LB:45–50` calls `breakEdit` through Chromium and observes the complete returned edit and applied source. **Comparison:** `LB:63–65` compares complete edit, source and absence of error.

### Repeated verse and renderer

**Law/grammar:** `LB:78–89` retains the verse law and exact constructed `['one', 'two', 'three']` witness. **Model:** `LB:93–98` predicts complete source, exact `<p>one<br>\ntwo<br>\nthree</p>\n` HTML, and every returned edit/caret. **Driver:** `LB:101–112` calls real `breakEdit` in Chromium twice, uses the returned selection for the next line, records all edit/caret fields, and renders the final source with `MarkdownIt`. **Comparison:** `LB:114–115` compares the complete verse object and no error. The old renderer checkpoint remains present; this verse renderer checkpoint remains MarkdownIt in the test host, while the calls under test run in Chromium.

### Code-block source, renderer, selection and caret membership

**Laws:** literal contents `CB:90–99`; source context/minimum boundary padding `CB:103–112`; inner selection/empty caret `CB:116–125`; established default source `CB:129–138`; valid returned edit `CB:142–167`.

**Grammar:** `CM:10–16` retains bounded prose/newline contexts and every UTF-16 unit in selected source. The exact old empty context is `CM:22`; the remaining five old contexts are `CM:54–58`. The `Object.assign` that adds them precedes history construction at `CM:61–64`. All six are also representable by the existing arbitrary: their surrounding strings are prose plus the allowed boundary LFs, and selected strings fit the 96-unit UTF-16 field. **Resolve:** `CM:38–41` builds exact source and original ordered selection offsets.

**Model:** `CM:73–90` predicts rendered code, preserved outside source, minimal padding, selected body without one final LF, body-relative selection endpoints, and the exact triple-backtick/LF default output when selected source has no backticks. All six old selected strings satisfy that default-source condition.

**Driver:** `CB:51–81` calls real `codeBlockEdit` in Chromium. It applies the returned edit, fetches actual preview HTML through the browser/Worker path, records complete default source, records surrounding source/padding, and records selected text plus both absolute-to-body relative endpoints. `CB:70–80` locates the actual fence body's raw UTF-16 offset using Markdown token line maps plus raw CR/LF offsets. Therefore a caret in an earlier blank boundary cannot alias a caret inside the inserted block.

**Comparisons:** actual preview HTML at `CB:98`; outside source/padding at `CB:111`; selected text, adjacent LF checks and body-relative endpoints at `CB:124`; complete default output at `CB:137`; valid edit/no-error at `CB:165–166`.

### Structural keys

**Law/grammar:** `KY:44–48` and `KM:10–27` retain every modifier mask for each supported/unknown key on both platform classes. Each old event is a named constructed chord instance, with all four modifier booleans explicit. **Model:** `KM:18–24` retains exactly unmodified Tab → indent, Shift+Tab → outdent, Shift+Enter → break, null otherwise. **Driver:** `KY:49–54` invokes real `structureKey` in Chromium with the old exact event shape. **Comparison:** `KY:56` invokes the full-result/no-error comparison at `DM:28–29`.

### Formula source and selections

**Law:** `IN:80–86`. **Grammar:** `IM:253–266` now explicitly adds all four exact old source partitions as `sourceEmptyDocument`, `sourceArea`, `sourceMultiline` and `sourceTrimmed`. They remain legal in the arbitrary source-partition grammar (`IM:209–215,266`), so these are not unsupported constructed values. **Resolve/model:** `IM:213` derives exact source/offsets; `IM:274–282` predicts dollars, trimming, output and final selection.

**Driver:** `IN:85` calls real `formulaEdit` in Chromium and observes `DM:23`'s result. **Comparison:** `IN:86`, via `DM:28–29`, compares exact complete output, final `[start,end]` and edit usability, plus no error. The extracted result deliberately no longer compares the complete internal edit object. This does **not** erase an old observation: old `apply` also compares resulting marked source/selection, not the internal replacement span. The asserted formula source and final selection survive exactly.

## All 28 historical assertions

`old:N` means line N in `test-ui/format-shortcuts.test.ts`. Each row traces an individual assertion. “Retained” describes source evidence, not execution status.

| ID | Old pointer and exact historical witness | Candidate source/history pointer | Observed and compared checkpoints | Readout |
| --- | --- | --- | --- | --- |
| B01 | `old:142`: end of `Tyger Tyger, burning bright,` gets backslash + LF; caret follows | `BM:43` `oldVerseLine`; full literal prefix, no selected text/suffix | Chromium edit + complete output; `LB:63–65` | Exact context, source and caret retained |
| B02 | `old:143`: `one` before caret and ` two` after it; insert hard break | `BM:44` `oldMidLine` | Same complete edit/output checks | Exact middle-of-line context and suffix retained |
| B03 | `old:144`: replace selected `one` in `a one two`; preserve `a ` and ` two` | `BM:45` `oldSelection` | Same complete edit/output checks, original selected offsets 2–5 | Exact source, replacement and collapsed caret retained |
| B04 | `old:146`: empty document → one LF, caret after it | `BM:46` `oldEmptyDocument`; empty literal prefix is honored by `??` | Same complete edit/output checks, original offsets 0–0 | Exact empty-document witness retained |
| B05 | `old:147`: existing `a\n\n` → `a\n\n\n`, caret at end | `BM:47` `oldBlankParagraph` | Same complete edit/output checks | Exact earlier paragraph and blank-LF preservation retained |
| B06 | `old:148`: after `a` + existing unpaired backslash, insert only LF | `BM:48` `oldUnpairedSlash`; one declared slash | Same complete edit/output checks | Exact source/backslash and caret retained |
| B07 | `old:150`: inside backtick block after `line`, ordinary LF; preserve later LF/closer | `BM:49` `oldInsideBackticks` | Same complete edit/output checks; suffix exactly `\n` + triple backticks | Exact fenced document and suffix retained |
| B08 | `old:151`: after closed backtick block, `after` receives hard break | `BM:50` `oldAfterFence` | Same complete edit/output checks | Exact old closed-block/prose context retained |
| B09 | `old:152`: four-tilde opener with triple-backtick decoy keeps `still code` fenced | `BM:51` `oldOppositeMarker` | Same complete edit/output checks | Exact old opposite-marker document retained |
| B10 | `old:158`: successive `one`, `two`, `three` breaks yield exactly `<p>one<br>\ntwo<br>\nthree</p>\n` | `LB:89` `two breaks` | Chromium break edits, complete source, MarkdownIt HTML and caret/edit sequence; `LB:114–115` | Exact renderer witness retained, with extra source/caret observations |
| C01 | `old:165`: empty document → empty triple-backtick/LF block with caret immediately inside | `CM:22` `empty` | Default source, actual preview HTML, context, selected text, body-relative endpoints, usable edit | Exact wrapper, source and body-start caret retained |
| C02 | `old:166`: `text` + caret → exactly two LFs + empty triple-backtick block; inside caret | `CM:54` `oldText` | Same block checkpoints; selection `bodyStart=bodyEnd=0` | Exact prefix padding, wrapper and caret membership retained |
| C03 | `old:167`: `text\n` + caret reuses LF and adds one boundary LF before empty block | `CM:55` `oldTextLf` | Same block checkpoints | Exact existing-LF reuse, wrapper and inside caret retained |
| C04 | `old:168`: between `text\n\n` and `\n\nmore`, preserve both boundaries around new empty block | `CM:56` `oldBothSides` | Same block checkpoints | Exact both-side source, wrapper and inside caret retained |
| C05 | `old:169`: select complete `let a = 1;\nlet b = 2;`, wrap in triple backticks, keep body selected | `CM:57` `oldSelectedCode` | Complete default source; selected text/body-relative 0…body.length; renderer/context | Exact document source and original inner selection retained |
| C06 | `old:170`: in `before\n` + selected `code\n` + `after`, remove one selected final LF, minimally pad, select `code` | `CM:58` `oldTrailingLf` | Same block checkpoints; body exactly `code` | Exact output, LF handling and selected span retained |
| K01 | `old:178`: unmodified Tab → `indent` | `KM:12,27`, key Tab/mask 0, both platforms | Chromium `structureKey` return inside complete result; `KY:56` | Exact event and return retained |
| K02 | `old:179`: Shift+Tab → `outdent` | `KM:12,27`, Tab/mask 8 | Same classification checkpoints | Exact event and return retained |
| K03 | `old:180`: Shift+Enter → `break` | `KM:12,27`, Enter/mask 8 | Same classification checkpoints | Exact event and return retained |
| K04 | `old:181`: unmodified Enter → null | `KM:12,27`, Enter/mask 0 | Same classification checkpoints | Exact event and return retained |
| K05 | `old:183`: Cmd+Shift+Enter → null | `KM:12,27`, Enter/mask 9 | Same classification checkpoints | Exact event and return retained |
| K06 | `old:184`: Ctrl+Shift+Enter → null | `KM:12,27`, Enter/mask 10 | Same classification checkpoints | Exact event and return retained |
| K07 | `old:185`: Ctrl+Tab → null | `KM:12,27`, Tab/mask 2 | Same classification checkpoints | Exact event and return retained |
| K08 | `old:186`: Alt+Tab → null | `KM:12,27`, Tab/mask 4 | Same classification checkpoints | Exact event and return retained |
| F01 | `old:193`: empty document → single-dollar pair with caret between | `IM:256` `sourceEmptyDocument` | Chromium formula output, selection `[1,1]`, usability/no error | Exact document-edge context and caret retained |
| F02 | `old:194`: `area ` + selected `pi r^2` + ` here` → single-dollar wrap, same inner selection | `IM:258` `sourceArea` | Exact complete output, selected integer endpoints, usability/no error | Exact old surrounding prose, source and selection retained |
| F03 | `old:195`: whole-document `\int f\ndx` → double-dollar wrap and selected inner multiline source | `IM:260` `sourceMultiline` | Same formula checkpoints | Exact old document boundaries, display source and selection retained |
| F04 | `old:196`: `a ` + selected ` x ` + ` b` → trim to `x`, single-dollar wrap and select `x` | `IM:262` `sourceTrimmed`, with `t` at `IM:215` | Same formula checkpoints | Exact trimming/source/selection witness retained |

## Previously recovered items, traced through the final candidate

These identifiers preserve the earlier single-source audit's categories. They do not rank the items or make a restoration decision.

**R1, preceding-source compression in direct break histories:** restored in `BM:43–51`. Each historical prefix is now literal complete source, with selected text and suffix separately retained. Membership repair at `BM:54–60,113–115` makes the nine constructed records part of the same shrinkable grammar. The generated envelope remains bounded, but none of the old nine exact source contexts depends on random generation or indirect handler reach anymore.

**R2, default code-wrapper serialization projected into rendered equivalence:** restored by the exact-default-source law/check (`CB:129–138`) and `CM:87–90`. All six old contexts are selected source without backticks, so each observes and compares the entire established output, including triple-backtick delimiters, LF spelling and boundary padding. A four-backtick substitution in those old cases now changes `defaultSource` even if rendering is equivalent.

**R3, empty caret membership projected into empty substring plus adjacent LFs:** restored by `CB:70–80` and model `CM:86`. The earlier static alias was `oldText`: expected caret at absolute offset 10 versus an outside-block caret at offset 5 between prefix LFs. Current driver derives the actual body start at 10, so the wrong caret reports `bodyStart=-5, bodyEnd=-5`; expected is `0,0`. It can no longer alias the inside caret while keeping the same compared summary.

**Formula exact contexts:** the earlier candidate admitted some old formula sources only through arbitrary partitions. The final `IM:255–262` explicitly constructs all four old complete partitions. Output/selection checks match the old helper's observation despite removal of redundant internal edit-span comparisons.

## Source comments and semantic limits

- Old `145` (nothing before caret/already broken) is retained by exact B04–B06 plus the break model's blank/parity rules.
- Old `149` (backslash would be literal inside code) is retained by exact B07/B09 and the modeled fence state.
- Old `177` and `182` retain the structural-return evidence that leaves command-modified Enter and browser Ctrl+Tab alone. The old assertions did not observe the focus view or browser receiving the event, and the new classification audit does not invent that coverage.
- Existing code-container, Markdown/TeX validity, undo, IME and focus-navigation limits remain as documented in the oracles. They were not separately established by these 28 old unit assertions.
- The verse HTML checkpoint remains the old MarkdownIt observation. Code-block HTML has an additional actual application preview checkpoint; it is not substituted for the old exact source comparisons.

## Chromium and real Worker boundary

`BS:5–12` captures the exact source module Vite receives, including the active oracle-gaps patch, and compiles it into the browser-source payload. `BD:39–46` installs and calls it via the connected Chromium page; `BD:101–103` publishes that source's exports as the browser SUT. `BD:125–129` calls the requested real export in that page. The calls under test for this source unit therefore execute in Chromium rather than using host-model implementations.

`BD:16–29` connects to the formatting browser, authenticates against the supplied application origin and opens a same-origin page. `BD:132–137` fetches `/api/preview` from that page with the actual edited `contentMd`, then returns response JSON `html`. `CB:60` compares that returned application HTML through the block literal law. The transport is not a replacement local renderer: the application handles preview generation.

This pass verifies these source paths statically. It did not start a browser/application, validate runtime instrumentation replay, run the launcher or claim transport coverage from a passing run.

## Pending USVString HTML-model repair

At the source version read for this pass, `CM:75–80` models CR/LF and NUL preprocessing and HTML escaping, but does not yet apply the announced standard replacement of unpaired UTF-16 surrogates at the HTTP HTML boundary. The actual code-block HTML checkpoint now crosses the application/HTTP path described above. The parent has identified this as a boundary-model repair and will apply it without changing production formatting semantics.

The generator still retains every UTF-16 unit (`DM:9–12`; `CM:16`), and its `unicode` constructed history at `CM:27` explicitly contains an unpaired surrogate, NUL and CRLF. This audit's no-loss readout does **not** authorize filtering those values or normalizing source/selection/default-source observations. The boundary conversion belongs only in the expected HTML representation where the transport requires it. Source output, selected text and raw UTF-16 geometry must continue to use the unchanged source histories.

None of the 28 historical inputs contains unpaired surrogates, so that pending model discrepancy does not erase or alter any of their expected source, selection or renderer evidence. It remains a separate runtime/model issue to verify with the parent-owned oracle-gaps run before treating the full candidate as green.

## Final readout

No supported material from these 28 historical assertions remains absent or narrower in the static final comparison paths. Exact break contexts, all six default block wrappers, empty-block caret membership, all formula contexts/selections, all eight structural returns and the original repeated-verse renderer output are retained. No deletion, restoration judgment, production edit or execution result is performed or implied by this audit.
