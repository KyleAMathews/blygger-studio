# Final loss-audit: historical list assertions

Assigned source: original test-ui/format-shortcuts.test.ts:86-136, list assertions only. Compared current files under /Users/kyle.mathews/programs/blygger-studio/.worktrees/oracles-explore. Instrument: Hidden-signal recovery assay (loss-audit), read fully earlier in this isolated source pass. No sibling source units, test campaigns, browser calls, mutation runs, or production experiments were run. No repository edit.

## Result

All 24 original source assertions retain exact constructed contexts and exact modeled output/selection/decline behavior. All five original renderer inputs are constructed exactly. All five no-<pre> assertions retain direct renderer observations. Complete list/item/inline ancestry, content order and multiplicity are compared within the selected projection, together with original-prefix preservation and returned renderer caret endpoints.

One bounded comparison loss remains: the original immediate HTML adjacency check is narrowed to a projection that discards paragraph, heading, thematic-break and other non-list/non-inline block tokens. The literal old <li>a<[uo]l><li>b observation is not fully retained by the renderer check. Exact-source comparisons compensate for some contexts, but not every context: in particular the original numeric parent 10 renderer input is outside the source parent's alphabet.

This is an observation-support finding, not a claim that current production emits the distinguishing output below. No usefulness ranking or restoration decision.

## Provenance and notation

SHA-256 at final read:

- test-ui/format-shortcuts.test.ts: 4187c4b45f9296f33aed8683416353907ecda5cc4e3c5581891f7106c89143cf
- test-ui/editor-list.oracle.test.ts: 61f1a87e59d686ee69b9ed7f0ab87dcd21ec4eb5904069f4e4b09bbd178be70b
- test-ui/editor-oracles/list-model-oracle.ts: 2d3a38c596b3f9348b0b6f191350b612f8c0d08d034a06c12a77ccc48e31dd32
- test-ui/editor-oracles/browser-driver-oracle.ts: 0133ab64a4353008b23d72b587d20a29031ee4c22af37e0ae5770cc62cd0b019
- test-ui/editor-oracles/browser-source-oracle.ts: f3612b8c5bf46c833760f2c4f26823de906a6c3684d8807ac7458c5b38a9b1e4

Abbreviations: O = editor-list.oracle.test.ts; H = editor-oracles/list-model-oracle.ts; B = editor-oracles/browser-driver-oracle.ts; P = editor-oracles/browser-source-oracle.ts, all within test-ui/. In witnesses, | is the old caret notation; \u00ab and \u00bb encode the original selection-opening and selection-closing characters. Escaped \n and \t denote source characters. NULL denotes the old helper's decline result.

## Shared retained source route

Adopted law: O10-18/O53 retains whole-line movement, blank/outside preservation, next-line-start exclusion, numbered restart/continuation, intended caret/range and declines.

Legal grammar: H34-49 has exact parent and suffix alphabets; H78-101 explicitly constructs all 24 original source inputs. Their bodies, markers, empty document, starred parent, outside sibling identities and EOF are present. H112-126 concatenates parent, row records and suffix without normalizing source; original caret/range coordinates are reconstructed. O54 registers every one as constructed history, not merely a possible random sample.

Independent model H131-155 predicts the entire edit and output. Ranges select transformed whole rows; carets account for width changes and clamp within removed indent; blanks remain blank; impossible moves return {edit:null,output:originalText}.

Actual path O57 -> browserCall('indentEdit', [text,from,to,out]) -> B125-129 -> real SUT method in Chromium through B39-46/B101-103. B42-44 forwards exact source strings and numeric endpoints, with no textarea normalization or fake formatter. P captures/transpiles Vite's production module including oracle-gaps instrumentation. Replay carries instrumentation observations, not formatting results.

Observation/comparison O58-62 records production error separately and compares the complete returned edit and complete independently spliced output. All from/to/insert/start/end fields, null declines and untouched outside source reach the check. Extraction and browser transport do not drop them. Old decline unit assertions did not observe actual focus navigation either: the preserved observation is null return.

## All 24 source assertions: exact retained mappings

Each item uses the complete shared source route above. No source-level loss found.

S01. Old88 -> H78 originalIndentBullet:
'- a\n- b|' -> '- a\n    - b|'.
Exact EOF, ordinary indent, caret follows b.

S02. Old89 -> H79 originalIndentBeforeMarker:
'- a\n|- b' -> '- a\n    |- b'.
Exact EOF and before-marker caret, not only a body caret.

S03. Old91 -> H80 originalNumberRestart:
'1. a\n2. b|\n3. c' -> '1. a\n    1. b|\n3. c'.
Exact parent1/child2/following3 and caret-after-b. Restart and untouched following sibling compared.

S04. Old92 -> H81 originalNumberContinuation:
'1. a\n    1. b\n2. c|' -> '1. a\n    1. b\n    2. c|'.
Exact existing numbered sublist, number remains2, bodyc and EOF caret.

S05. Old93 -> H82 originalNumberWidth:
'9. a\n10. b|' -> '9. a\n    1. b|'.
Exact two-digit shrink/restart and EOF offset.

S06. Old94 -> H83 originalMixedBullets:
'* a\n    + b| c' -> '* a\n        + b| c'.
Exact star parent, plus child, existing indent, interior caret and body suffix.

S07. Old95 -> H84 originalParenthesis:
'- a\n10) b|' -> '- a\n    1) b|'.
Exact parenthesis delimiter and EOF caret.

S08. Old96 -> H85 originalEmptyMarker:
'- a\n-|' -> '- a\n    -|'.
Exact marker-only EOF item, no gap/body/sentinel.

S09. Old100 -> H86 originalOut4:
'- a\n    - b|' -> '- a\n- b|'. Exact four-space removal at EOF.

S10. Old101 -> H87 originalOut2:
'- a\n  - b|' -> '- a\n- b|'. Exact partial two-space removal at EOF.

S11. Old102 -> H88 originalOutTab:
'- a\n\t- b|' -> '- a\n- b|'. Exact tab removal at EOF.

S12. Old103 -> H89 originalOut8:
'- a\n        - b|' -> '- a\n    - b|'. Exact one level removed, four of eight spaces remain.

S13. Old105 -> H90 originalCaretInsideIndent:
'- a\n  |  - b' -> '- a\n|- b'. Exact removed-indent caret clamps to current line start.

S14. Old109 -> H91 originalMultiple:
'- a\n\u00ab- b\n\n- c\u00bb\n- d' -> '- a\n\u00ab    - b\n\n    - c\u00bb\n- d'.
Exact b/blank/c selection, parenta and followingd. Both items move, empty row remains empty, transformed whole rows stay selected.

S15. Old110 -> H92 originalMultipleOut:
'- a\n\u00ab    - b\n    - c\u00bb' -> '- a\n\u00ab- b\n- c\u00bb'.
Exact selected multirow range at document EOF, without suffix substitution.

S16. Old112 -> H93 originalNextStart:
'- x\n\u00ab- a\n\u00bb- b' -> '- x\n\u00ab    - a\u00bb\n- b'.
Exact outside x/b. Input selection includes newline and ends at b's line start. Replacement excludes b; final selection excludes the following newline; edit endpoints compared.

S17. Old116 -> H94 originalPlain:
'plain| text' -> NULL. Exact space-containing prose/interior caret, null and unchanged source.

S18. Old117 -> H95 originalEmpty:
'|' -> NULL. Truly empty document [0,0], not a blank row between list items.

S19. Old118 -> H96 originalNonlist:
'-not a list|' -> NULL. Exact malformed marker/prose and end caret.

S20. Old119 -> H97 originalMixedSelection:
'\u00ab- a\nprose\u00bb' -> NULL. Exact whole-document mixed selection; null forbids partial edits.

S21. Old120 -> H98 originalMarginOut:
'- already at the margin|' -> NULL for outdent. Exact long body/document boundaries, null rather than no-op edit.

S22. Old121 -> H99 originalBoldProse:
'**bold** start|' -> NULL. Exact bold prose/document boundaries/end caret.

S23. Old123 -> H100 originalNoParent:
'- first|\n- second' -> NULL. Exact first/second siblings, no preceding parent despite following item.

S24. Old124 -> H101 originalProseParent:
'prose\n\n- first|' -> NULL. Exact prose/blank prefix and first item at EOF.

## Shared renderer route

Five explicit original histories H197-201 are registered at O72. H216-219 reconstructs exact source/caret. O76 calls real browser indentEdit with both endpoints at source length. O80 splices the returned edit and independently parses MarkdownIt tokens; neither model nor formatter supplies the parse.

H210-227 builds a complete expected one-item-per-list ancestry tree and flattens list/item/inline tokens. O81 records the corresponding complete sequence, not last-item-at-depth. This preserves list kind, ancestry, first child identity, content order and multiplicity within that projection. O84 compares the entire sequence. Existing nesting requires a->b->c, stronger topologically than the old explicit a->b regex.

O82 also observes parentPreserved, noCode (code_block/fence), literal HTML noPre, selected text and caretAtEnd. H227 requires true/true/true, empty selection and EOF caret; O84 compares all fields. Therefore no-<pre> has a direct rendered observation for every original input.

## All ten renderer assertions

R01a. Old130 input '- a\n- b|', old132 nesting regex -> H197 originalBulletChild -> O76-84. Exact input/caret and list ancestry/multiplicity retained. Literal HTML immediacy narrowed by loss below. S01 additionally requires exact expected written source for this same input.

R01b. Same input, old133 no-<pre> -> H197 -> O82 noPre:true/O84. Directly retained, plus no-code tokens.

R02a. Input '1. a\n2. b|', old132 -> H198 originalNumberedChild1 -> O76-84. Exact input/caret and ancestry/multiplicity retained. HTML immediacy narrowed. S03 has following sibling3 and is not this EOF context; source grammar can generate this EOF input but it is not that fixed history.

R02b. Same input, old133 -> H198 -> O82/O84 noPre:true. Directly retained.

R03a. Input '10. a\n11. b|', old132 -> H199 originalNumberedChild10 -> O76-84. Exact input/caret and ancestry/multiplicity retained. HTML immediacy narrowed. Source parent table H34-43 has no flat 10.a parent providing exact-source comparison for this context.

R03b. Same input, old133 -> H199 -> O82/O84 noPre:true. Directly retained.

R04a. Input '- a\n2. b|', old132 -> H200 originalMixedLists -> O76-84. Exact dot-delimited mixed witness constructed, not merely random. Ancestry/multiplicity retained; HTML immediacy narrowed. Source grammar can generate it, but separate fixed restart histories use other contexts.

R04b. Same input, old133 -> H200 -> O82/O84 noPre:true. Directly retained.

R05a. Input '- a\n    - b\n    - c|', old132 -> H201 originalExistingSublist -> O76-84. Exact existing-sublist context, complete a->b->c ancestry/multiplicity retained. HTML immediacy narrowed. H102 existingBulletSource additionally compares exact edit/source/caret for this input.

R05b. Same input, old133 -> H201 -> O82/O84 noPre:true. Directly retained.

## Recovered loss and drop trace

Original support: old132 compares whitespace-stripped HTML to /<li>a<[uo]l><li>b/. It requires literal a immediately followed by a nested list and its first b item. Visible paragraph wrappers, thematic breaks or headings cannot intervene there.

Candidate reduction: O81 filters to ordered/bullet list, list-item and inline tokens; H210-227 predicts those only. Paragraph and thematic-break tokens disappear before comparison. noCode/noPre/prefix/caret do not recover them.

Analytical distinguishing output, NOT EXECUTED: on original input 10.a/11.b, a returned edit could preserve prefix '10. a\n' but yield:

```markdown
10. a

    ---

    1. b
```

This is a loose ordered parent item with paragraph a, a thematic break and nested ordered b. Its selected list/item/inline projection retains ordered-list/item/inline:a/ordered-list/item/inline:b and matching closes. It requires no code/pre, preserves prefix and permits EOF caret. The old compact HTML regex fails on intervening paragraph/thematic-break markup. Exact parent10 is outside the separate source grammar, so its full-source equality cannot compensate here.

Evidence status: static observation-sufficiency argument using Markdown block structure; no MarkdownIt probe or registered oracle run under this read-only/no-competing-runs request. No claim about actual production returning the edit. The directly established loss is that old immediate HTML structure is absent from the recorded candidate data.

Reduction rule: comparison compression/category mismatch at O81. Complete list topology replaces complete immediate HTML structure; non-list block tokens are discarded. Last-depth-item ancestry loss was repaired earlier; this is the narrower residual distinction.

## Limits

This pass establishes routes and residual observation loss. It does not rerun registration, grammar round-trips, campaigns, calibrations, browser setup or mutations. Browser transport/current production are read from source, not exercised. No RED/GREEN or kill conclusion.

No other historical source witness, exact context, selection boundary, decline result, renderer input, code-absence check, or list/item/inline ancestry/multiplicity was found missing. No recommendation to restore or delete the old file is made by this assay.
