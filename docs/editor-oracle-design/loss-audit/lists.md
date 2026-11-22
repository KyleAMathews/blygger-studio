# Raw loss-audit report — source-lists only

## Scope and frozen provenance

Instrument read in full: `/Users/kyle.mathews/.codex/isaac-folder-skills-staging/field-lab/reference/instruments/loss-audit.md` (Hidden-signal recovery assay). One isolated pass over assigned source `/private/tmp/blygger-loss-audit.uj1TVJ/source-lists.txt`, original `test-ui/format-shortcuts.test.ts` lines 86–136 in the supplied excerpt (header says 86–138). No sibling source excerpts, sibling reports, live worktree, or Field Log were inspected. Candidate is the frozen `test-ui/editor-list.oracle.test.ts` (L) and `test-ui/editor-keyboard.oracle.test.ts` (K). Frozen production `src/ui/format-shortcuts.ts` was read only for context. No production changes, repository edits, or oracle execution.

SHA-256:
- source-lists.txt: `5c25945327f6c2c1966d69771d9ecb99136ba58fee5916990098d074fa6dd165`
- L: `acb988c81a4961f4b3ffa352510346a57c3a14cdf29f77961525a72961be8432`
- K: `0c5fae2017a20a08a17ac9d51e346536458793d4a0d6f82997f189e68dd6e3b8`
- production: `a20a4d194007cb96e2a1fdbfddab6052a23a445e85fd937c2949fec297ac531c`

Old source contains 34 assertions: 8 indent examples; 5 outdent examples; 3 selection examples; 8 declines; 5 renderer inputs each with nesting and no-`<pre>` assertions. Assertion IDs below cover all 34. `|` is the old caret notation, `«…»` the old selection notation, `∅` the old decline result. Escaped `\n` and `\t` denote source characters, not visual wrapping.

This is a static support/omission audit, not a claim that the candidate currently passes, is ready for deletion, or that any item should be restored. The baseline is expressly provisional/red on approved pending behavior, including sufficiently wide numbered parents. Failures due to those approved changes would not establish loss of an old list assertion. No setup was attempted and no registered oracle was invoked outside `oracle-gaps`.

## Candidate routes: separate prose, grammar, observation, comparison

S = `editor-list-source`, L139–148.
- Adopted-law prose: L10–18 and L140 require whole touched lines, blank preservation, next-start exclusion, numbered restart/continuation, impossible-move declines, intended caret/whole-line selection, and totality. Four spaces ordinarily, up to four removed spaces or one tab, and caret clamp are explicit in prose.
- Legal input grammar, not merely TypeScript representability: L51–64 produces 1–4 rows, eight explicit indent variants, markers `- * + 1. 2. 9. 10. 99. 123456789. 1) 10)`, gaps empty/space/tab, letter bodies up to 12 or `b c`. Prose pool is exactly `prose`, `-not list`, `1234567890. x`, `**bold** start`; blanks can be empty, one space or tab. L56–60 fixes preceding prefixes to none, `prose\n\n`, `- a\n`, `9. a\n`, `1. a\n    1. b\n`, or `    content\n`. L89 ALWAYS appends `\n- z`. The from position is within the FIRST supplied row; range endpoints are within the last supplied row or at following-line start. Constructed histories L67–82 are guaranteed cases, whereas legal arbitrary histories are possible inputs, not evidence of actual sampled execution.
- Observation: L143–145 calls production `indentEdit(text,from,to,out)` and records the complete returned edit plus complete spliced output (or original text on null), and records thrown error separately. This is actual edit/source/selection observation, not rendered Markdown.
- Comparison: L101–125 independently models move/decline and edit geometry; L147 compares observed `{edit, output}` with modeled `{edit, output}` and requires no error. Thus all FormatEdit fields, output text, null declines, and selection are compared when the input is in grammar.

R = `editor-list-rendering`, L158–175.
- Adopted-law prose L17–18 and L159 requires a real nested list, unchanged content, caret at end, and no throwing for supported bullet/numbered parents; prose L29–35 expressly limits rendering to flat parent/child pairs.
- Actual grammar L152,154–155,161: EXACTLY two lines, flat hyphen or 1–9 digit numbered parent ending ` a`, ALWAYS a numbered child (both delimiters), lowercase letter child body, caret at end. No bullet child; no existing nested list; no third line. Constructed number1 and number10 reproduce two old numeric renderer sources; constructed bullet uses `2) b`, not old `2. b`. Arbitrary child may be `2.` under hyphen, but it is not a constructed fixed witness.
- Observation L166–171 calls `indentEdit`, parses output with MarkdownIt, then records the LAST inline token at list depth 2 as `nestedBody`, whether output starts with original parent prefix, absence of `code_block`/`fence` tokens, selected string, and whether caret equals end. It does not retain the HTML, full token tree, exact inserted source, parent-to-child adjacency, first-child identity, or number of nested items.
- Comparison L162,174 compares exactly `{ nestedBody: body, parentPreserved:true, noCode:true, selected:'', caretAtEnd:true }`, plus no error.

K = `editor-key-handler`, K161–235 (and independent key classification K50–75).
- Prose requires prevention exactly for accepted edits and untouched declined events. Structural classification explicitly maps Tab to indent and Shift+Tab to outdent only without command modifiers.
- Grammar uses four content templates, including `- a\n- word` and `- a\n    - word`, then substitutes a body of up to 12 letters/α/😀. Selection endpoints lie only WITHIN the body, after the marker/indent. `word` template has empty prefix and can generate an empty document. No rendering.
- Observation calls actual `onFormatKey` with fake textarea/document, records preventDefault count plus value, selection, and all focus/select/command/fallback/event effects. Comparison against independent transaction model requires no prevention/effects and unchanged text/selection on declined inputs, or intended transaction on accepted ones. This supports dispatch/application, not actual focus navigation or real native undo. The old unit assertions below did not observe actual focus navigation either.

## Complete per-assertion mapping

Each entry gives original support, law/grammar route, actual observation/comparison via route definitions, and the concrete remainder. A changed literal or added sentinel is distinguished from loss of a behavioral law.

### Eight indent assertions

I1 — old L88: `- a\n- b|` -> `- a\n    - b|`.
- Law: S whole-line indent and caret preservation. S constructed `bullet` (L67) matches parent, item, caret and four spaces, but always adds unselected `\n- z`. S observes/compares exact source/edit/selection for that sentinel-bearing case.
- K can legally generate the exact EOF old input with body `b`, a=b=1, Tab/mask0, unsuppressed (not a fixed constructed case); its observation/comparison verifies exact resulting value and caret/effects. R does NOT render this bullet child.
- Remainder: literal EOF direct `indentEdit` witness is substituted; bullet-child rendering is separately recovered under R1 below.

I2 — old L89: `- a\n|- b` -> `- a\n    |- b`.
- Law: S line-wide indent with caret before marker remaining before marker after inserted indent. Constructed `caretStart` L67 is exact modulo appended `\n- z`; exact edit/caret/output compared.
- K cannot place caret before the list marker because its endpoints start in body. R has caret-at-end only.
- Remainder: direct before-marker caret at EOF is absent as an exact witness; same boundary is guaranteed with trailing sentinel.

I3 — old L91: `1. a\n2. b|\n3. c` -> `1. a\n    1. b|\n3. c`.
- Law: S new-numbered-sublist restart, outside preservation, caret following character. Constructed `number` L67 substitutes parent `9. a`, uses child `2. b` but default a=3 is BEFORE `b`, and adds `- z`; arbitrary a=4 can put caret after b. S observes/compares restart, source and geometry for those inputs.
- R constructed `number1` L154 reproduces `1. a\n2. b|` at EOF and compares actual nested b/no-code/caret; it has no trailing `3. c`, and does not compare exact source insertion. S grammar has no flat `1. a` parent prefix and no equivalent exact old outside line.
- Remainder: the joint concrete parent1 + selected child2 + following sibling3 + caret-after-b witness is not preserved; restart law remains tested in substituted cases.

I4 — old L92: `1. a\n    1. b\n2. c|` -> `1. a\n    1. b\n    2. c|`.
- Law: S preserve number when joining existing numbered sublist. Constructed `continues` L68 has exact preceding prefix, but child `2. b` with caret BEFORE b (default a=3), and trailing `- z`. Arbitrary child body c, a=4 reproduces old selected-row state with sentinel. S compares full edit/output/caret for both.
- R has no existing nested state. K has only bullet templates.
- Remainder: constructed witness substitutes c/end-caret with b/before-caret; EOF and exact original source are absent. Existing-number continuation law remains explicitly modeled and driven.

I5 — old L93: `9. a\n10. b|` -> `9. a\n    1. b|`.
- Law: S numeric-width shrink and correct caret translation. Constructed `numberWidth` L68 exactly matches selected row, preceding parent, caret, restart and expected four spaces except suffix `\n- z`; exact edit/output/selection compared.
- R constructed number9 renders exact EOF source `9. a\n10. b|`, compares nesting and caret at EOF, but does not compare exact inserted source.
- Remainder: direct EOF exact-source equality is substituted; joint behavior is exercised across two different observations/domains.

I6 — old L94: `* a\n    + b| c` -> `* a\n        + b| c`.
- Law: S ordinary level under mixed bullet markers and preservation of interior caret/body suffix. Constructed `mixedBullets` L69 has exact child `    + b c` and a=7 interior caret, but fixed parent is `- a`, not `* a`, and adds `- z`. Full edit/output/selection compared.
- S legal parent prefixes never contain `* a`; R supports only hyphen/numbered parents and numbered children; K parent is hyphen.
- Remainder: starred-parent plus plus-child concrete combination and parent preservation under `*` is absent from the candidate's exercised source grammar, even though star is an allowed selected-row marker. This is a parent/child grammar narrowing, not just a prose omission.

I7 — old L95: `- a\n10) b|` -> `- a\n    1) b|`.
- Law: S restart while preserving `)` delimiter and caret translation. Constructed `parenthesis` L69 exact modulo sentinel, including a=5 at child end; full edit/output/selection compared. R legal grammar can render exact EOF source with bullet=true, child10, delimiter`)`, body b; constructed bullet uses child2, not10.
- Remainder: direct EOF source equality is substituted, while source restart/delimiter/caret law is guaranteed with sentinel.

I8 — old L96: `- a\n-|` -> `- a\n    -|`.
- Law: S marker-only list item is eligible, no required gap/body, caret follows marker. Constructed `emptyMarker` L70 exact modulo sentinel; full edit/output/selection compared. R numbered child always has gap and nonempty body; K list templates always preserve marker plus gap even with empty body.
- Remainder: marker-only item at EOF (no newline after marker) is absent from direct source grammar; same marker-only item before sentinel is guaranteed.

### Five outdent assertions

O1 — old L100: `- a\n    - b|` -> `- a\n- b|`.
- Law S up-to-four-space removal and caret preservation. Constructed `out4` L71 exact modulo sentinel; exact edit/output/selection compared. K can generate exact EOF source with body b, a=b=1, Shift+Tab/mask8 unsuppressed; compares full transaction (not constructed exact).
- Remainder: direct EOF witness substituted; no behavioral removal or caret law absent.

O2 — old L101: `- a\n  - b|` -> `- a\n- b|`.
- Law S remove partial (<4) spaces. Constructed `out2` L71 exact modulo sentinel and full edit/output/selection compared. K has no two-space template.
- Remainder: two-space EOF boundary exact witness absent; same removal guaranteed before sentinel.

O3 — old L102: `- a\n\t- b|` -> `- a\n- b|`.
- Law S remove one tab. Constructed `outTab` L72 exact modulo sentinel and full edit/output/selection compared. K has no tab template.
- Remainder: tab-indented EOF exact witness absent; same removal guaranteed before sentinel.

O4 — old L103: `- a\n        - b|` -> `- a\n    - b|`.
- Law S remove exactly one ordinary four-space level rather than all eight. Constructed `out8` L72 exact modulo sentinel and full edit/output/selection compared. K no eight-space template.
- Remainder: eight-space EOF exact witness absent; one-level-only removal remains guaranteed.

O5 — old L105: `- a\n  |  - b` -> `- a\n|- b`.
- Law S clamp a caret inside removed indentation to current line start rather than preceding line. Constructed `caretInsideIndent` L73 exact modulo sentinel; comparison includes start=end=line start plus exact output. K cannot place caret in indent; R does not outdent.
- Remainder: exact EOF source absent, but the specific clamp and current-line boundary are guaranteed before sentinel.

### Three selected-range assertions

M1 — old L109: `- a\n«- b\n\n- c»\n- d` -> `- a\n«    - b\n\n    - c»\n- d`.
- Law S all selected items, unchanged empty intervening line, transformed whole-line selection and outside preservation. Constructed `multiple` L74 recreates same preceding parent, selected b/blank/c and exact selection extent; outside successor is `- z` instead of `- d`. S compares full edit/output/selection.
- Legal arbitrary grammar can include an unselected last row `- d` by using range to its start (and still has extra `- z`), but the literal old whole document is impossible because suffix is always `- z`.
- Remainder: trailing sibling identity d is substituted. All asserted multirow/blank/selection behaviors remain directly compared on a constructed history.

M2 — old L110: `- a\n«    - b\n    - c»` -> `- a\n«- b\n- c»`.
- Law S outdent every selected item and preserve full transformed selection. Constructed `multipleOut` L75 exactly reproduces selected b/c and endpoints with added outside `- z`; full edit/output/selection compared.
- Remainder: a nonempty multirow selection ending at document EOF is never exercised by S, K has only one list row, and R has only caret. Full selected-range-at-EOF witness is absent even though corresponding before-sentinel geometry is guaranteed.

M3 — old L112: `- x\n«- a\n»- b` -> `- x\n«    - a»\n- b`.
- Law S selection end at following-line start excludes that line and selects only transformed whole line (not its newline). Constructed `nextStart` L76 recreates selected `- a` and exact next-start geometry, but preceding item is `- a` instead of `- x`, successor is `- z` instead of `- b`. S computes from/to via nextStart; S observation compares edit.to excluding newline, unchanged successor, and final selected range ending before newline.
- Remainder: concrete outside source identities x/b are substituted. Exclusion and selected-newline behavior remain explicitly driven and compared.

### Eight decline assertions

D1 — old L116: `plain| text` -> `∅`.
- Law S prose declines. Constructed `plain` L77 uses `- a\npro|se\n- z`, not old literal, but observes returned edit null and unchanged source; arbitrary positions include interior prose caret. S prose pool lacks `plain text` and its spaces. K `word` template can supply plain letter body with interior caret and Tab and compare no effects, but no spaces in body alphabet.
- Remainder: exact space-containing plain-prose witness is absent; prose decline law is driven with substitute prose.

D2 — old L117: `|` -> `∅`.
- Law S no item declines. Constructed `empty` L77 supplies blank row with preceding list and trailing sentinel; arbitrary parent none still produces `\n- z`, never a truly empty document. S compares null/no change for those blank lines.
- K legal `word` template/body empty/Tab unsuppressed has truly empty initial document and compares unchanged empty value, [0,0], prevention0 and no effects. This exact EOF/empty document is possible but not a constructed `indentEdit('',0,0,false)` null-return assertion. K constructed `blankTab` is the word `word`, despite its name.
- Remainder: guaranteed direct null return on empty document is replaced by blank-line null and a possible handler-level exact empty case.

D3 — old L118: `-not a list|` -> `∅`.
- Law S malformed marker without whitespace declines. Constructed `nonlist` L77 uses `-not list` instead; arbitrary prose pool lacks old literal. S observes edit null and unchanged source; end caret possible arbitrarily but default constructed a3 is interior.
- Remainder: old concrete malformed string and end position substituted; missing-gap decline remains driven.

D4 — old L119: `«- a\nprose»` -> `∅`.
- Law S mixed item/prose range declines as a whole. Constructed `mixed` L78 has preceding `- a`, selected item `- b` then prose and sentinel; mode range a0/b5 reaches exact full selected item/prose extent. S compares null and complete unchanged output, hence no partial move. Arbitrary parent none/item body a gives old selected region plus sentinel.
- Remainder: document-start-to-EOF mixed selection exact witness is absent; mixed selection decline/no partial move remains guaranteed under nonempty prefix/suffix.

D5 — old L120: `- already at the margin|` -> `∅` for outdent.
- Law S no-op margin outdent declines. Constructed `marginOut` L78 substitutes `- b` preceded by `- a` and followed by sentinel. S model insert==original yields null and driver/result comparison enforces unchanged source. Body alphabet cannot produce old long space-containing body.
- Remainder: old margin case at document start AND EOF with long body is absent; no-op decline remains guaranteed in substitute context. K's list outdent template is always indented and cannot supply this exact top-level item.

D6 — old L121: `**bold** start|` -> `∅`.
- Law S bold prose is not a `*` list marker. Constructed `boldProse` L79 retains exact line text but places caret at index3 and adds parent/sentinel. Arbitrary positions allow line end, but still always outside source. S observes edit null and unchanged output.
- Remainder: bold-prose line at document EOF and document start with end caret is absent as exact source; starred-prose decline remains explicitly driven.

D7 — old L123: `- first|\n- second` -> `∅`.
- Law S no preceding list/continuation means first item cannot indent. Constructed `noParent` L79 uses first item `- b`, no preceding prefix, with sentinel as second item; thus the key first-item-before-another-item shape is guaranteed, and null/source unchanged are compared. Arbitrary bodies can be first/second with an additional sentinel.
- Remainder: exact bodies and exact document ending are substituted; the asserted first-item guard is preserved by a constructed no-parent history. This is not merely a single-item no-parent case because the sentinel supplies a following item.

D8 — old L124: `prose\n\n- first|` -> `∅`.
- Law S prose before the list does not supply a parent. Constructed `proseParent` L79 retains exact `prose\n\n` prefix, replaces first body by b, caret default at b end, and appends sentinel. Arbitrary body first gives old body plus sentinel. S observes/compares null and unchanged text.
- Remainder: EOF first-item witness replaced by same guard before a successor. No-parent-after-prose law is explicitly driven.

### Ten rendering assertions: five nesting + five no-code

Old shared source support L130–133: call `md.render(indent(source).replace('|',''))`; compare whitespace-stripped HTML to `/<li>a<[uo]l><li>b/`; independently require HTML not contain `<pre>`. The old regex observes immediate `a` list-item text followed by an immediate nested list whose first item starts `b`. It does not assert an entire HTML tree or exact contents of later items, and in the existing-nesting witness it does not directly assert c's exact depth.

R1a — old L130 input `- a\n- b|`, L132 nesting regex.
- Adopted prose covers nested output under bullet parent. S constructed bullet proves the expected written source before sentinel; K legal exact EOF input proves delivery. NEITHER parses Markdown. R grammar cannot generate a bullet child at all (child is always numbered).
- Absent: actual MarkdownIt rendering of this bullet-child witness and its immediate a→nested-b relationship. Loss location is R legal grammar L152/161; rendering/source responsibilities split at L34–35. R comparison also omits adjacency even for its legal cases.

R1b — same input, L133 no `<pre>`.
- S compares written four-space source but does not parse it. R noCode comparison is token-based and applies only to numbered children. No actual no-code rendering observation for bullet child.
- Absent through same grammar restriction, not because no-code prose is absent.

R2a — old input `1. a\n2. b|`, L132 nesting regex.
- R constructed `number1` exactly reproduces input at EOF. Its driver parses and compares nestedBody=b, preserved parent prefix, noCode, no selection and caretEnd; this preserves evidence of some depth-2 b list content under an unchanged leading parent source.
- Narrower comparison: immediate a→nested-list→FIRST-b relationship is not compared. R's accumulator keeps only LAST depth-2 inline token, not parent/first-child relation. S `number` uses parent9 plus sentinel and does not close this exact EOF source/comparison gap.

R2b — same input, L133 no `<pre>`.
- R constructed number1 parses exactly this output and requires no code_block/fence tokens. Under standard MarkdownIt with this fixed alphabet that preserves the old no-`<pre>` check (and also excludes fences). No recovered no-code item for this legal exact witness.

R3a — old input `10. a\n11. b|`, L132 nesting regex.
- R constructed `number10` exactly reproduces source/caret. Observes and compares same token summary as R2a; numeric parent width explicitly driven.
- Narrower comparison: same immediate a/first-b relationship omitted. S parents cannot be flat `10. a`, so no full-source model equality closes the exact-source rendering comparison.

R3b — same input, L133 no `<pre>`.
- R constructed number10 parses exact witness and compares no code tokens. Preserved no-code assertion on this exact input.

R4a — old input `- a\n2. b|`, L132 nesting regex.
- R grammar CAN generate bullet=true, child2, delimiter `.`, body b, and compares actual nesting summary on such generated histories. Constructed `bullet` L155 chooses `2) b` instead, so exact old witness is not guaranteed by a constructed case; S constructed number uses numbered parent9, while arbitrary S can supply parent hyphen/child2 with sentinel.
- Narrower comparison remains immediate a/first-b relationship; exact old dot-delimited mixed witness becomes only a legal random possibility. This distinction does not claim seed/run omission without execution.

R4b — same input, L133 no `<pre>`.
- Actual token noCode observation/comparison exists if the exact old random history is executed; fixed constructed mixed witness substitutes `)` for `.`. General no-code property is present for this grammar; exact witness is no longer fixed.

R5a — old input `- a\n    - b\n    - c|`, L132 nesting regex.
- S has no parent prefix `- a\n    - b\n`; from is always in first supplied row, so it cannot target c after that existing bullet sublist. S continued parent is numbered instead. R has only two flat lines and numbered child. K has just one list item after its parent.
- Absent: rendered preservation of existing a→nested-b structure while moving c further in, including the old renderer regex. The old regex's b is the pre-existing item, not c; the support must not be inflated into an explicit assertion of c's final exact depth.

R5b — same input, L133 no `<pre>`.
- No candidate route actually parses an already-nested bullet list after indenting c. S can transform already-indented single rows, but it does not render them and lacks this exact predecessor.
- Absent: no-code rendering check in existing nested-list context. R bounds explicitly defer multiple rows/existing nesting to source geometry (L159); source geometry has no Markdown parse, so this old rendering assertion vanishes at that category split.

## Bounded recovered/dropped traces (no usefulness ranking; no restoration decision)

Recovered A — bullet-child renderer checks: R1a/R1b, old L130 input1 with L132/L133. Prose still says rendered sublist under bullet/number parents; exact write behavior survives in S/K. Actual rendering input grammar always makes child numeric, so the old real-renderer bullet-child nesting and no-code observations disappear. Drop rule: category split plus grammar compression (R152/161), not explicit rejection.

Recovered B — already-nested bullet renderer context: R5a/R5b, old L130 input5. No candidate rendering of the three-line state; even S has no matching preceding bullet-sublist prefix and cannot select its second supplied row as a caret case. Drop rule: flat-pair rendering bound and delegation of existing nesting to nonrendering source geometry (R159; S56–60,89–97). Keep support at its actual strength: existing a/b rendering survives and no `<pre>` appears; old check did not directly measure c's depth.

Recovered C — immediate rendered parent/first-child relation: all R*a, especially exact fixed R2a/R3a. Old regex records `<li>a<[uo]l><li>b`; candidate stores only last inline text at depth2 plus parent-prefix boolean. A hypothetical output preserving prefix `1. a\n` but appending a sibling `2. junk\n    1. b` would have a depth-2 b and no code while b is nested under junk; R's summary could accept it whereas old a→nested-b regex would fail. This is an analytic counterexample to observation sufficiency, not an executed production result or suggested implementation. Drop rule: comparison compression at R169–171; actual HTML relationship erased before comparison. S catches arbitrary added source for its own legal sentinel-bearing histories, but its domain does not contain this exact parent1-at-EOF rendering witness.

Recovered D — starred parent with plus child: I6. `* a\n    + b| c` is replaced by `- a\n    + b| c\n- z`. S permits selected star markers but preceding parent alphabet has no star; R/K do not supply it. Drop rule: parent alphabet compression (S56–60), with line-marker diversity retained only on selected rows. The interior-caret and child+ behavior themselves survive.

Recovered E — direct source/selection boundaries at document EOF: S always adds `\n- z`, replacing the EOF state in I1/I2/I4/I5/I6/I7/I8, O1–O5, M2, and multiple decline witnesses. K can generate exact simple bullet EOF indent/outdent and true empty document, and R fixed cases exercise numeric EOF carets; those observations do not restore direct indentEdit null/equality across all old marker/indent variants or multirow selected-range-at-EOF. Strongest concrete omitted range witness is M2 (old L110); explicit before-marker EOF I2 and marker-only EOF I8 also lack alternate exact paths. Drop rule: fixed trailing sentinel and single-row handler/flat rendering bounds. No inference that the generic lineSpan law was removed: it is present, but ending-line source and selected-range EOF geometry are not the same executed state.

Recovered F — fixed exact renderer mixed witness replaced by random eligibility: R4a/R4b old `- a\n2. b|`. The candidate's guaranteed bullet rendering case uses `2) b`; old dot mixed witness is legal random history but no longer constructed. Drop rule: representative delimiter substitution (R155) and probabilistic rather than fixed witness retention. No claim that an actual seeded run misses the exact case.

Recovered G — other concrete witness substitutions, without inferred behavioral-law loss: I3 trailing sibling3/parent1 combination; I4 constructed c/end-caret replaced b/before-caret; M1 trailing d becomes z; M3 outside x/b becomes a/z; D1 `plain text` becomes `prose`; D3 `-not a list` becomes `-not list`; D5 long margin body/start-of-document becomes short item in middle; D6 caret-at-end/document boundary becomes interior/between list items; D7 first/second becomes b/z; D8 first becomes b followed by z. These are supported old concrete probes absent or narrower in the frozen candidate, each traced above. Drop rule: bounded row/body/prefix/sentinel alphabet and representative-case compression, not evidence that the corresponding prose law or source comparison disappeared. Exact identities can matter only under a separate evaluation, which this assay does not perform.

All source assertions have a preserved route or a bounded dropped/narrowed trace. No ranking, recommendation to restore, production diagnosis, or further experiment is included.
