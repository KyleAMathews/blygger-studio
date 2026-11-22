# Loss audit: inline formatting and key classification

## Frozen evidence and scope

Instrument read in full: `/Users/kyle.mathews/.codex/isaac-folder-skills-staging/field-lab/reference/instruments/loss-audit.md`.

Independently rescanned only `/private/tmp/blygger-loss-audit.uj1TVJ/source-inline-keys.txt`, whose header identifies original `test-ui/format-shortcuts.test.ts` lines 1–85. The snapshot adds a header line, so its numbered lines are original line + 1. Sibling source excerpts and other agents' reports were not read.

Frozen candidate files: `test-ui/editor-inline.oracle.test.ts` and `test-ui/editor-keyboard.oracle.test.ts` under that same snapshot directory. Candidate line numbers below refer to those files. Manifest hashes are respectively `2582286d9653c7d31499150fd7b0ad5774a616a8961dc9b7ed2a61ab72b22aa0` and `0c5fae2017a20a08a17ac9d51e346536458793d4a0d6f82997f189e68dd6e3b8`.

This is a static source-to-model-to-driver-to-check audit. No registered oracles or plain Vitest were run; no baseline result was treated as survival evidence. No live repository source was inspected or changed. No production fixes and no Field Log were made.

## Readout

All 29 assertions in this source have a corresponding candidate semantic law, a legal candidate input representing the source, a driver that invokes the original entry point, and an observable checked result containing at least the old assertion's information. No source behavior was found outside the candidate's legal generator domain, or absent from its model/check.

There is a narrower **deterministic witness** issue: some old always-executed behavioral combinations survive only in the candidate arbitrary, rather than in a constructed history. These are listed separately below. Legal generatability does not establish that a fixed-seed 100-run sample actually executes an old witness. This audit makes no assertion about which arbitrary samples are realized and makes no judgment about whether any witness should be restored.

## Observation and checking chain

The old `run` helper (original lines 5–15; snapshot 6–16) parses a marked selection/caret, calls `formatEdit`, splices the returned replacement, and serializes the final caret/selection into the output string. It therefore checks source preservation plus final selection, not just inserted markup. The candidate inline driver preserves these observations: `result` at lines 87–89 records both the entire returned edit object, including `start/end`, and the spliced output; `check` at lines 91–92 compares that result and absence of an error. The candidate is more specific about edit transaction geometry than the old serialized-output equality.

Single-line mapping chain: inline lines 11–21 and 166–171 state/own the law; lines 48–100 define legal UTF-16 text, rows, markers and surrounding contexts; lines 139–163 resolve/model it; line 170 calls `formatEdit`; line 171 invokes the result/error check. Every row listed below is within the six-star bounds and uses admitted bodies/whitespace. The surrounding `a ` / ` b` / empty strings are legal contexts under lines 63–69.

Multiline mapping chain: inline lines 175–189 admit 2–6 rows and contexts; lines 197–208 resolve/model the complete transformed selection; lines 211–216 state the law, invoke `formatEdit`, and compare its observed edit/output/error. Blank rows are retained by line 205, including when the remove decision at line 203 is true.

Link mapping chain: inline lines 220–232 admit arbitrary source partitions and explicit lowercase URL-shaped selections; lines 237–243 compute label-versus-target insertion and empty-field caret; lines 246–251 state the law, invoke `formatEdit(..., 'link')`, and check the full edit/output/error. Empty prefix/suffix are legal.

Key mapping chain: keyboard lines 49–61 generate modifier masks, arbitrary and named keys, and both platform flags; lines 53–59 compute a chord-table result; lines 63–74 state the law, call `formatKey` and `structureKey`, record the return values, and compare result/error. All eight old key cases appear exactly in the constructed Cartesian product, not merely in the random arbitrary. `mask`: meta=1, ctrl=2, alt=4, shift=8.

## Complete assertion mapping

Notation for the inline candidate: `row(body, left, right, lead, tail)` is the row annotation at lines 73–81. Unspecified counts are zero and whitespace is empty. `outer=L/R` gives markers outside the selected row, `kind` gives the requested style. For source single-line witnesses use the original unselected context (`a ` and ` b`, or the context visible in the quoted input). `C` means the same behavioral arrangement has a constructed candidate example, allowing a different ordinary surrounding context. `A` means it is legal in the arbitrary with the same expectation but no constructed example exercises that specific arrangement. C does not claim literal old input equality.

| ID | Original assertion line (snapshot line) and asserted behavior | Legal candidate history/model outcome | Constructed status / candidate pointer |
|---|---|---|---|
| S01 | 19 (20): `a «word» b` bold → `a **«word»** b` | kind bold; row(word); outer=0/0; adds two stars per side, selects word | C `bold`, inline 104; model 162 |
| S02 | 20 (21): same selection italic → `a *«word»* b` | kind italic; row(word); outer=0/0; adds one star per side, selects word | C `italic`, 106; model 162 |
| S03 | 21 (22): external bold `a **«word»** b` → plain selected word | kind bold; row(word); outer=2/2; removes outside markers | C `outsideBold`, 109; model 157–160 |
| S04 | 22 (23): external italic `a *«word»* b` → plain selected word | kind italic; row(word); outer=1/1; removes outside markers | C `outsideItalic`, 110; model 157–160 |
| S05 | 23 (24): selected bold markers `a «**word**» b` → plain selected word | kind bold; row(word,2,2); outer=0/0; removes selected markers | C `selectedBold`, 107; model 154–156 |
| S06 | 24 (25): selected italic markers `a «*word*» b` → plain selected word | kind italic; row(word,1,1); outer=0/0 | C `selectedItalic`, 108; model 154–156 |
| S07 | 25 (26): italic requested inside external bold → `a ***«word»*** b` | kind italic; row(word); outer=2/2; outer bold is not active italic, adds one star and retains external bold | A; arbitrary 96–100; model 157–162. `addItalicToBold` at 112 instead selects the bold markers |
| S08 | 26 (27): bold requested inside external italic → `a ***«word»*** b` | kind bold; row(word); outer=1/1; outer italic is not active bold, adds two stars and retains external italic | A; arbitrary 96–100; model 157–162. `addBoldToItalic` at 111 instead selects the italic markers |
| S09 | 27 (28): bold requested inside external triple stars → `a *«word»* b` | kind bold; row(word); outer=3/3; removes two outside stars per side, preserving italic and word-only selection | A; arbitrary 96–100; model 157–160. `removeBoldKeepItalic` at 113 instead selects all three stars |
| S10 | 28 (29): italic requested inside external triple stars → `a **«word»** b` | kind italic; row(word); outer=3/3; removes one outside star per side, preserving bold and word-only selection | A; arbitrary 96–100; model 157–160. `removeItalicKeepBold` at 114 instead selects all three stars |
| S11 | 29 (30): empty caret `a| b` bold → `a**|** b` | kind bold; row(empty); outer=0/0; inserts empty bold pair and leaves caret between markers | C `emptyBold`, 115; model 151–162 |
| S12 | 30 (31): empty caret italic → `a*|* b` | kind italic; row(empty); outer=0/0 | C `emptyItalic`, 116; model 151–162 |
| S13 | 31 (32): caret inside empty external bold pair → original caret source | kind bold; row(empty); outer=2/2; removes markers and leaves caret at their beginning | C `emptyOutsideBold`, 117; model 157–160 |
| S14 | 32 (33): caret inside empty external italic pair → original caret source | kind italic; row(empty); outer=1/1 | C `emptyOutsideItalic`, 118; model 157–160 |
| S15 | 33 (34): `«word »b` bold → `**«word»** b`; trailing selected space moves outside markup and selection, at document start | kind bold; row(word,0,0,'',' '); before=''; after='b'; trims only tail from the replaced range | A for trailing-only whitespace/document-start combination; arbitrary 72–99; model 151–162. Constructed `whitespace` at 119 has whitespace on both ends, and `documentStart` at 105 has none |
| S16 | 39 (40): `«one\n\ntwo»` bold → `«**one**\n\n**two**»`; leaves blank line unchanged, selects transformed block | kind bold; rows one / empty / two; contexts empty; remove=false | C `blank` at 180 for the blank-line transformation; document-edge context is arbitrary-only for this particular history; model 201–208 |
| S17 | 40 (41): `«**one**\n\n**two**»` bold → `«one\n\ntwo»`; remove styles across blank line and select full result | kind bold; rows (one,2,2) / empty / (two,2,2); contexts empty; filled rows all active so remove=true and blank survives | A for all-styled plus blank; arbitrary 175; model 202–208. `allOn` at 181 has no blank, `blank` at 180 adds style |
| S18 | 41 (42): `«one\n*two*»` italic → `«*one*\n**two**»`; one inactive line makes all nonblank lines receive another star | kind italic; rows one / (two,1,1); contexts empty; remove=false | C `mixed` at 182 for the mixed-style transformation; exact document-edge context arbitrary-only; model 201–208 |
| S19 | 47 (48): selected words produce `a [word](|) b` | picked='word', prefix='a ', suffix=' b'; label route, caret after `](` | C `link1`, inline 232; model 237–243 |
| S20 | 48 (49): whole-document selected URL → `[|](https://x.example/a)` | picked exact URL, prefix=suffix=''; target route, caret in label | C `link3` has the same URL/caret route with ordinary surrounding context; exact document-edge URL case is arbitrary-only; 220–243 |
| S21 | 49 (50): empty selection `a | b` → `a [|]() b` | picked=''; prefix='a '; suffix=' b'; empty-label route, caret inside brackets | C `link0`, inline 232; model 241–243 |
| S22 | 56 (57): Mac Meta+b → bold | key='b', mask=1, mac=true; model format='bold' | Exact C `chord3`; keyboard 50,53–65 |
| S23 | 57 (58): Mac Ctrl+k → null, preserving platform text motions | key='k', mask=2, mac=true; required mask differs so format=null | Exact C `chord133`; keyboard 50,53–65 |
| S24 | 60 (61): other platform Ctrl+i → italic | key='i', mask=2, mac=false | Exact C `chord68`; keyboard 50,53–65 |
| S25 | 61 (62): other platform Meta+i → null | key='i', mask=1, mac=false | Exact C `chord66`; keyboard 50,53–65 |
| S26 | 64 (65): unmodified b → null | key='b', mask=0, mac=false | Exact C `chord0`; keyboard 50,53–65 |
| S27 | 65 (66): Ctrl+x → null | key='x', mask=2, mac=false; unmapped key | Exact C `chord196`; keyboard 50,53–65 |
| S28 | 66 (67): Ctrl+Shift+b → null | key='b', mask=10, mac=false; extra Shift rejects chord | Exact C `chord20`; keyboard 50,53–65 |
| S29 | 67 (68): Ctrl+uppercase B → bold | key='B', mask=2, mac=false; table compares lowercased key | Exact C `chord36`; keyboard 50,53–65 |

The remaining source lines are imports, grouping, marker parsing, and the `apply`/`indent`/`outdent` harness (original 71–85, snapshot 72–86). They introduce no additional assertions in this bounded source. The general apply helper's null-to-`∅` convention is harness behavior whose actual asserted uses belong to other source units; it is not an extra test of production in this excerpt.

## Recovered narrower items and drop trace

These are losses of guaranteed examples, not complete semantic omissions. No evidence in this frozen comparison establishes majority pressure, low salience, deliberate rejection, or an intentional decision to discard these cases. The trace below identifies the observable compression rule without inventing an editing history.

### R1 — external-marker style interactions and their word-only selections

Support: original lines 25–28 (snapshot lines 26–29), S07–S10, each asserts the selected span excludes all external star delimiters before and after the operation.

Vanished at: inline constructed-history selection, lines 111–114. The named style-combination examples encode existing delimiters in `row.left/right`, inside the selected span. The old examples encode them in `outsideLeft/right`, outside the selected span. Adding a style to selected `**word**` also selects those existing stars in the resulting edit; adding inside external `**«word»**` selects only `word`. Thus the constructed examples do not preserve the original geometry, despite their related names. Generic outside bold/italic examples at 109–110 exercise plain toggling, not coexistence of the styles.

Rule that dropped the deterministic witness: compress each style combination into one representative annotated selection; classify by style combination rather than by both style and delimiter location. Candidate state labels at 132–137 include generic `externalMarkers` and requested style, but no required joint state for external other-style or external triple-marker removal. The arbitrary at 96–100 retains all four exact arrangements and model/check coverage at 157–171.

### R2 — single-sided trailing whitespace with selection at document start

Support: original line 33 (snapshot 34), S15, explicitly asserts `«word »b` → `**«word»** b`.

Vanished at: representative whitespace example inline 119 plus document-start example 105. The former has both leading and trailing selected whitespace in surrounding prose; the latter has no selected whitespace. Neither constructed input asserts the old one-sided trim or its combination with a document-start selection. The generic `whitespaceEdges` and `documentStart` labels at 136–137 can be satisfied by separate histories.

Rule that dropped the deterministic witness: factor whitespace and boundary coverage into separate examples and a single whitespace state, instead of preserving the old joint input. Empty leading whitespace and one trailing space remain legal at 72–99; model line 151 separately adjusts the two ends and the full checked result preserves the old expected output/selection.

### R3 — removing styles across an interior blank line

Support: original line 40 (snapshot 41), S17, explicitly asserts `«**one**\n\n**two**»` → `«one\n\ntwo»`.

Vanished at: multiline example compression inline 180–181. `blank` retains an interior blank only on the add-style path; `allOn` retains the remove-style path with no blank line. Candidate state reporting at 190–195 includes `allStyled` and `blankLines`, but does not require the conjunction.

Rule that dropped the deterministic witness: cover blank-line and removal categories independently. The old example covered their interaction. The arbitrary at 175 retains the exact old rows, and model 202–208 preserves its full expected source and selection when sampled.

### R4 — source-specific document-edge contexts moved into arbitrary coverage

Support: S16–S18 (original 39–41, snapshot 40–42) select their whole documents, including the multiline blank/mixed cases; S20 (original 48, snapshot 49) selects a whole-document URL.

Vanished at: inline 188 supplies common `'pre '` / `' post'` context to all named multiline examples and 189 provides document edges only for the plain, nonblank two-row bold example. Inline 223 and 232 supply `'a '` / `' b'` to every named link example, including the old exact URL string. No constructed link URL example has empty contexts.

Rule that dropped the deterministic witness: normalize ordinary context for reusable histories, then cover document boundaries with a representative plain emphasis example or random source partitions. Whole-document blank/mixed multiline inputs and whole-document URL insertion remain legal in arbitrary 175 and 220–231 respectively; their semantic models and checks do not exclude empty contexts. This is recorded as context-specific witness reduction, not as a separate missing formatting rule. R2 already records the one source single-line whitespace/boundary interaction rather than counting it again here.

## Limits of this result

No candidate execution, coverage run, mutation run, or sampled-history enumeration was performed. Consequently this audit establishes mapping and guaranteed constructed-history differences, not present pass/fail status, sampling frequency, or whether a specific mutation would survive the configured seed. Candidate baseline failures on approved behavior changes would not answer these mapping questions.

The instrument asks to recover supported dropped/narrower material without judging usefulness or deciding restoration. Those decisions are intentionally absent.
