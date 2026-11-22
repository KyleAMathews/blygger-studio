# One-original Hidden-signal recovery assay

Frozen candidate: `049b5a7bf9661a22ff4cee31b156b7dd2cbee194`. Original and authority copy: `4187c4b45f9296f33aed8683416353907ecda5cc4e3c5581891f7106c89143cf`.

Bounded result: **no supported omission found in this original’s 91 asserted product observations**. This is a source-only preservation trace. Runtime/full16 readiness remains pending. It does not accept blanket behavior, authorize removing/restoring tests, judge usefulness, or adopt laws.

The original was read before comparison. Only its assigned directory and candidate production/oracle/config sources were inspected. No sibling original, scanner conclusion, earlier audit, browser, build, test, campaign, installation, remote job or integration edit was used. The structured trace contains exact unmarked source, input offsets, expected complete source and output offsets for each source assertion.

## Source and authority controls

- Both assigned originals are byte-identical; the authority copy is used only as the original’s provenance, not as a second independent source.
- Read in full: supplied Field Lab skill and loss-audit card; candidate AGENTS.md; oracles-review skill; package glossary and checklist v1; added project glossary. The addendum binds project glossary SHA-256 `ba7d8a950180a26bf3e84e069fa9bd2c9450772e337d5a481c538556c10e5179`.
- The source-only assignment controls the operation: AGENTS.md’s probe/runtime/session/deployment routes were not run, and external environment/session references were not imported into this isolated packet review.
- ORC-004 reconstruction, ORC-005 production path/observations, ORC-013 boundary distinctions and ORC-016 registered routes guide the trace; this is not an audit verdict for every checklist requirement.

## Common production and registration path

The five relevant oracle files are registered in `candidate/test-ui/editor-oracles/property-registry-oracle.ts:4` and their property IDs in the same file at line 23. `candidate/vitest.oracle.config.ts:5` selects that inventory, installs the browser-source plugin and configures `configure-oracles.ts:5`; `candidate/package.json:65` routes formatting to `scripts/formatting-oracles.ts:114`. These are source registrations, not evidence of execution.

`browser-source-oracle.ts:43–51,58–104` constructs a factory from the supplied formatting module. `browser-driver-oracle.ts:107–114,118–174,247–251` installs it in the browser and calls `sut[method](...args)`. The helper result is returned as data. Thus this original’s helper boundary has a real intended browser path; these assertions never promised native toolbar dispatch or undo. List/verse Markdown observations remain default MarkdownIt in Node, matching the original renderer boundary.

Setup dependency is wider than the original local Vitest helper boundary: all migrated calls require browser-source transformation plus browser/application/cookie setup (`browser-driver-oracle.ts:21,37–51,65–94`). Code-block default-source and selection observations occur after awaited authenticated fragment preview (`editor-code-block.oracle.test.ts:62`; `browser-driver-oracle.ts:264–269`). None of those setup/interaction conditions was exercised. Failure there would not establish either a law rejection or passing behavior.

Argument fidelity: formatEdit four; indentEdit four with explicit out=false/true; formatKey two with explicit platform boolean; structureKey one event object; breakEdit/codeBlockEdit/formulaEdit three. The candidate preserves those exact argument counts and values. There is no optional-argument omission in this original that has been replaced by a materially different explicit argument.

## Routes

**single** — `editor-emphasis-single`; construction/resolver `inline-model-oracle.ts:136`, model line 141; production `format-shortcuts.ts:106`; driver `editor-inline.oracle.test.ts:58`; registered check line 59 (`single-line emphasis`). Records result.output (complete source), result.selection (both offsets), result.usable; error.

**multi** — `editor-emphasis-multiline`; construction/resolver `inline-model-oracle.ts:207`, model line 212; production `format-shortcuts.ts:106`; driver `editor-inline.oracle.test.ts:68`; registered check line 69 (`multiline emphasis`). Records result.output (complete source), result.selection (both offsets), result.usable; error.

**link** — `editor-link`; construction/resolver `inline-model-oracle.ts:229`, model line 258; production `format-shortcuts.ts:106`; driver `editor-inline.oracle.test.ts:78`; registered check line 79 (`link insertion`). Records result.output (complete source), result.selection (both offsets), result.usable; error.

**formula** — `editor-formula`; construction/resolver `inline-model-oracle.ts:229`, model line 308; production `format-shortcuts.ts:243`; driver `editor-inline.oracle.test.ts:88`; registered check line 89 (`formula wrapping`). Records result.output (complete source), result.selection (both offsets), result.usable; error.

**list** — `editor-list-source`; construction/resolver `list-model-oracle.ts:114`, model line 137; production `format-shortcuts.ts:127`; driver `editor-list.oracle.test.ts:84`; registered check line 90 (`list source and selection`). Records result.edit (including literal null and both selection offsets), result.output (complete source); error.

**nest** — `editor-list-rendering`; construction/resolver `list-model-oracle.ts:486`, model line 494; production `format-shortcuts.ts:127`; driver `editor-list.oracle.test.ts:124`; registered check line 136 (`rendered list nesting`). Records result.tight, structure (ordered tokens including first-child ancestry/body), noCode, noPre; selected text and caretAtEnd; error.

**break** — `editor-line-break`; construction/resolver `break-model-oracle.ts:69`, model line 84; production `format-shortcuts.ts:213`; driver `editor-line-break.oracle.test.ts:47`; registered check line 66 (`line break`). Records edit (complete edit including caret), output (complete source); error.

**verse** — `editor-line-break-verse`; construction/resolver `break-model-oracle.ts:120`, model line 118; production `format-shortcuts.ts:213`; driver `editor-line-break.oracle.test.ts:123`; registered check line 136 (`verse hard breaks`). Records verse.output, verse.html (full default MarkdownIt HTML), verse.carets (every edit); error.

**code** — `['editor-code-block.default-source', 'editor-code-block.selection']`; construction/resolver `block-model-oracle.ts:41`, model line 76; production `format-shortcuts.ts:224`; driver `editor-code-block.oracle.test.ts:52`; registered check line 149 (`default source compatibility AND selection`). Records defaultSource (full source for all six original inputs); selection.text, afterNewline, beforeNewline, bodyStart/bodyEnd (exact body geometry).

**key** — `editor-key-classification`; construction/resolver `keyboard-model-oracle.ts:27`, model line 18; production `format-shortcuts.ts:260`; driver `editor-keyboard.oracle.test.ts:51`; registered check line 58 (`key classification`). Records result.format and result.structure including null; error.

For inline/formula routes, `document-oracle.ts:24–32` compares the full source and both selection offsets rather than only usable geometry. The list-source check also compares the edit (including exact null and selection), preserving declines and ordinary four-space spelling. Code needs two registered comparisons together: full `defaultSource` at code-block oracle line 149 and selection geometry at line 136. The six original code inputs all lack backticks, so none is excluded from the default-source comparison.

For the five renderer inputs, `list-model-oracle.ts:350–355,486–502` reconstructs exact source; `editor-list.oracle.test.ts:130–136` observes and checks the tight ordered token tree, first-child bodies/order, no code, and literal `noPre`. The tight inline/paragraph restrictions plus tree ancestry retain the original `<li>a<[uo]l><li>b` predicate. This changes representation from an HTML regex to a structured constraint; no loss of either original predicate is supported by this static reading.

For verse, the guaranteed `two breaks` history (`editor-line-break.oracle.test.ts:111`) is exactly one/two/three, with the same sequential insertions. Lines 115–136 compare full HTML `<p>one<br>\ntwo<br>\nthree</p>\n` as well as source and each caret.

## Per-original-observation trace

Each row uses the common transport and registration path above. `Preserved` means a matching constructed input and registered check are present in frozen source; it does not mean passing. Exact pointer paths and complete input/expected geometry are in the JSON.

| ID | Original line | Original input or expression → observation | Constructed history (model source line) | Route | Status |
|---|---:|---|---|---|---|
| O001 | 19 | "a «word» b" → "a **«word»** b" | `sourceBold` (94) | single | Preserved |
| O002 | 20 | "a «word» b" → "a *«word»* b" | `sourceItalic` (95) | single | Preserved |
| O003 | 21 | "a **«word»** b" → "a «word» b" | `sourceOutsideBold` (96) | single | Preserved |
| O004 | 22 | "a *«word»* b" → "a «word» b" | `sourceOutsideItalic` (97) | single | Preserved |
| O005 | 23 | "a «**word**» b" → "a «word» b" | `sourceSelectedBold` (98) | single | Preserved |
| O006 | 24 | "a «*word*» b" → "a «word» b" | `sourceSelectedItalic` (99) | single | Preserved |
| O007 | 25 | "a **«word»** b" → "a ***«word»*** b" | `sourceAddItalicInsideBold` (100) | single | Preserved |
| O008 | 26 | "a *«word»* b" → "a ***«word»*** b" | `sourceAddBoldInsideItalic` (101) | single | Preserved |
| O009 | 27 | "a ***«word»*** b" → "a *«word»* b" | `sourceRemoveBoldKeepOutsideItalic` (102) | single | Preserved |
| O010 | 28 | "a ***«word»*** b" → "a **«word»** b" | `sourceRemoveItalicKeepOutsideBold` (103) | single | Preserved |
| O011 | 29 | "a&#124; b" → "a**&#124;** b" | `sourceEmptyBold` (104) | single | Preserved |
| O012 | 30 | "a&#124; b" → "a*&#124;* b" | `sourceEmptyItalic` (105) | single | Preserved |
| O013 | 31 | "a**&#124;** b" → "a&#124; b" | `sourceEmptyOutsideBold` (106) | single | Preserved |
| O014 | 32 | "a*&#124;* b" → "a&#124; b" | `sourceEmptyOutsideItalic` (107) | single | Preserved |
| O015 | 33 | "«word »b" → "**«word»** b" | `sourceTrailingWhitespace` (108) | single | Preserved |
| O016 | 39 | "«one\n\ntwo»" → "«**one**\n\n**two**»" | `sourceBlank` (190) | multi | Preserved |
| O017 | 40 | "«**one**\n\n**two**»" → "«one\n\ntwo»" | `sourceRemoveAcrossBlank` (192) | multi | Preserved |
| O018 | 41 | "«one\n*two*»" → "«*one*\n**two**»" | `sourceMixed` (197) | multi | Preserved |
| O019 | 47 | "a «word» b" → "a [word](&#124;) b" | `sourceLabel` (247) | link | Preserved |
| O020 | 48 | "«https://x.example/a»" → "[&#124;](https://x.example/a)" | `sourceWholeDocumentTarget` (249) | link | Preserved |
| O021 | 49 | "a &#124; b" → "a [&#124;]() b" | `sourceCaret` (251) | link | Preserved |
| O022 | 56 | expect(formatKey(key('b', { metaKey: true }), true)).toBe('bold'); | `chord3` (27) | key | Preserved |
| O023 | 57 | expect(formatKey(key('k', { ctrlKey: true }), true)).toBeNull(); | `chord133` (27) | key | Preserved |
| O024 | 60 | expect(formatKey(key('i', { ctrlKey: true }), false)).toBe('italic'); | `chord68` (27) | key | Preserved |
| O025 | 61 | expect(formatKey(key('i', { metaKey: true }), false)).toBeNull(); | `chord66` (27) | key | Preserved |
| O026 | 64 | expect(formatKey(key('b'), false)).toBeNull(); | `chord0` (27) | key | Preserved |
| O027 | 65 | expect(formatKey(key('x', { ctrlKey: true }), false)).toBeNull(); | `chord196` (27) | key | Preserved |
| O028 | 66 | expect(formatKey(key('b', { ctrlKey: true, shiftKey: true }), false)).toBeNull(); | `chord20` (27) | key | Preserved |
| O029 | 67 | expect(formatKey(key('B', { ctrlKey: true }), false)).toBe('bold'); | `chord36` (27) | key | Preserved |
| O030 | 89 | "- a\n- b&#124;" → "- a\n    - b&#124;" | `originalIndentBullet` (78) | list | Preserved |
| O031 | 90 | "- a\n&#124;- b" → "- a\n    &#124;- b" | `originalIndentBeforeMarker` (79) | list | Preserved |
| O032 | 92 | "1. a\n2. b&#124;\n3. c" → "1. a\n    1. b&#124;\n3. c" | `originalNumberRestart` (80) | list | Preserved |
| O033 | 93 | "1. a\n    1. b\n2. c&#124;" → "1. a\n    1. b\n    2. c&#124;" | `originalNumberContinuation` (81) | list | Preserved |
| O034 | 94 | "9. a\n10. b&#124;" → "9. a\n    1. b&#124;" | `originalNumberWidth` (82) | list | Preserved |
| O035 | 95 | "* a\n    + b&#124; c" → "* a\n        + b&#124; c" | `originalMixedBullets` (83) | list | Preserved |
| O036 | 96 | "- a\n10) b&#124;" → "- a\n    1) b&#124;" | `originalParenthesis` (84) | list | Preserved |
| O037 | 97 | "- a\n-&#124;" → "- a\n    -&#124;" | `originalEmptyMarker` (85) | list | Preserved |
| O038 | 101 | "- a\n    - b&#124;" → "- a\n- b&#124;" | `originalOut4` (86) | list | Preserved |
| O039 | 102 | "- a\n  - b&#124;" → "- a\n- b&#124;" | `originalOut2` (87) | list | Preserved |
| O040 | 103 | "- a\n\t- b&#124;" → "- a\n- b&#124;" | `originalOutTab` (88) | list | Preserved |
| O041 | 104 | "- a\n        - b&#124;" → "- a\n    - b&#124;" | `originalOut8` (89) | list | Preserved |
| O042 | 106 | "- a\n  &#124;  - b" → "- a\n&#124;- b" | `originalCaretInsideIndent` (90) | list | Preserved |
| O043 | 110 | "- a\n«- b\n\n- c»\n- d" → "- a\n«    - b\n\n    - c»\n- d" | `originalMultiple` (91) | list | Preserved |
| O044 | 111 | "- a\n«    - b\n    - c»" → "- a\n«- b\n- c»" | `originalMultipleOut` (92) | list | Preserved |
| O045 | 113 | "- x\n«- a\n»- b" → "- x\n«    - a»\n- b" | `originalNextStart` (93) | list | Preserved |
| O046 | 117 | "plain&#124; text" → "∅" | `originalPlain` (94) | list | Preserved |
| O047 | 118 | "&#124;" → "∅" | `originalEmpty` (95) | list | Preserved |
| O048 | 119 | "-not a list&#124;" → "∅" | `originalNonlist` (96) | list | Preserved |
| O049 | 120 | "«- a\nprose»" → "∅" | `originalMixedSelection` (97) | list | Preserved |
| O050 | 121 | "- already at the margin&#124;" → "∅" | `originalMarginOut` (98) | list | Preserved |
| O051 | 122 | "**bold** start&#124;" → "∅" | `originalBoldProse` (99) | list | Preserved |
| O052 | 124 | "- first&#124;\n- second" → "∅" | `originalNoParent` (100) | list | Preserved |
| O053 | 125 | "prose\n\n- first&#124;" → "∅" | `originalProseParent` (101) | list | Preserved |
| O054 | 133 | "- a\n- b&#124;" → whitespace-collapsed HTML matches /<li>a<[uo]l><li>b/ | `originalBulletChild` (351) | nest | Preserved |
| O055 | 133 | "- a\n    - b\n    - c&#124;" → whitespace-collapsed HTML matches /<li>a<[uo]l><li>b/ | `originalExistingSublist` (355) | nest | Preserved |
| O056 | 133 | "- a\n2. b&#124;" → whitespace-collapsed HTML matches /<li>a<[uo]l><li>b/ | `originalMixedLists` (354) | nest | Preserved |
| O057 | 133 | "1. a\n2. b&#124;" → whitespace-collapsed HTML matches /<li>a<[uo]l><li>b/ | `originalNumberedChild1` (352) | nest | Preserved |
| O058 | 133 | "10. a\n11. b&#124;" → whitespace-collapsed HTML matches /<li>a<[uo]l><li>b/ | `originalNumberedChild10` (353) | nest | Preserved |
| O059 | 134 | "- a\n- b&#124;" → HTML excludes literal <pre> | `originalBulletChild` (351) | nest | Preserved |
| O060 | 134 | "- a\n    - b\n    - c&#124;" → HTML excludes literal <pre> | `originalExistingSublist` (355) | nest | Preserved |
| O061 | 134 | "- a\n2. b&#124;" → HTML excludes literal <pre> | `originalMixedLists` (354) | nest | Preserved |
| O062 | 134 | "1. a\n2. b&#124;" → HTML excludes literal <pre> | `originalNumberedChild1` (352) | nest | Preserved |
| O063 | 134 | "10. a\n11. b&#124;" → HTML excludes literal <pre> | `originalNumberedChild10` (353) | nest | Preserved |
| O064 | 142 | "Tyger Tyger, burning bright,&#124;" → "Tyger Tyger, burning bright,\\\n&#124;" | `oldVerseLine` (43) | break | Preserved |
| O065 | 143 | "one&#124; two" → "one\\\n&#124; two" | `oldMidLine` (44) | break | Preserved |
| O066 | 144 | "a «one» two" → "a \\\n&#124; two" | `oldSelection` (45) | break | Preserved |
| O067 | 146 | "&#124;" → "\n&#124;" | `oldEmptyDocument` (46) | break | Preserved |
| O068 | 147 | "a\n\n&#124;" → "a\n\n\n&#124;" | `oldBlankParagraph` (47) | break | Preserved |
| O069 | 148 | "a\\&#124;" → "a\\\n&#124;" | `oldUnpairedSlash` (48) | break | Preserved |
| O070 | 150 | "```\nline&#124;\n```" → "```\nline\n&#124;\n```" | `oldInsideBackticks` (49) | break | Preserved |
| O071 | 151 | "```\ncode\n```\nafter&#124;" → "```\ncode\n```\nafter\\\n&#124;" | `oldAfterFence` (50) | break | Preserved |
| O072 | 152 | "~~~~\n```\nstill code&#124;" → "~~~~\n```\nstill code\n&#124;" | `oldOppositeMarker` (51) | break | Preserved |
| O073 | 158 | one / two / three → "<p>one<br>\ntwo<br>\nthree</p>\n" | `two breaks` (111) | verse | Preserved |
| O074 | 165 | "&#124;" → "```\n&#124;\n```" | `empty` (22) | code | Preserved |
| O075 | 166 | "text&#124;" → "text\n\n```\n&#124;\n```" | `oldText` (57) | code | Preserved |
| O076 | 167 | "text\n&#124;" → "text\n\n```\n&#124;\n```" | `oldTextLf` (58) | code | Preserved |
| O077 | 168 | "text\n\n&#124;\n\nmore" → "text\n\n```\n&#124;\n```\n\nmore" | `oldBothSides` (59) | code | Preserved |
| O078 | 169 | "«let a = 1;\nlet b = 2;»" → "```\n«let a = 1;\nlet b = 2;»\n```" | `oldSelectedCode` (60) | code | Preserved |
| O079 | 170 | "before\n«code\n»after" → "before\n\n```\n«code»\n```\n\nafter" | `oldTrailingLf` (61) | code | Preserved |
| O080 | 178 | expect(key('Tab')).toBe('indent'); | `chord224` (27) | key | Preserved |
| O081 | 179 | expect(key('Tab', { shiftKey: true })).toBe('outdent'); | `chord240` (27) | key | Preserved |
| O082 | 180 | expect(key('Enter', { shiftKey: true })).toBe('break'); | `chord272` (27) | key | Preserved |
| O083 | 181 | expect(key('Enter')).toBeNull(); | `chord256` (27) | key | Preserved |
| O084 | 183 | expect(key('Enter', { shiftKey: true, metaKey: true })).toBeNull(); | `chord274` (27) | key | Preserved |
| O085 | 184 | expect(key('Enter', { shiftKey: true, ctrlKey: true })).toBeNull(); | `chord276` (27) | key | Preserved |
| O086 | 185 | expect(key('Tab', { ctrlKey: true })).toBeNull(); | `chord228` (27) | key | Preserved |
| O087 | 186 | expect(key('Tab', { altKey: true })).toBeNull(); | `chord232` (27) | key | Preserved |
| O088 | 193 | "&#124;" → "$&#124;$" | `sourceEmptyDocument` (272) | formula | Preserved |
| O089 | 194 | "area «pi r^2» here" → "area $«pi r^2»$ here" | `sourceArea` (274) | formula | Preserved |
| O090 | 195 | "«\\int f\ndx»" → "$$«\\int f\ndx»$$" | `sourceMultiline` (276) | formula | Preserved |
| O091 | 196 | "a « x » b" → "a $«x»$ b" | `sourceTrimmed` (278) | formula | Preserved |

## Missing/weakened material and loss mechanism

No supported missing or weakened item was found in this one original. Therefore no compression, majority-agreement, category-mismatch, low-salience, or explicit-rejection mechanism is assigned. Assigning one without an absent item would invent a process history. Candidate comments mentioning past restoration do not make that past state a finding about this frozen state.

## Limits and possible distortion

This assay reconstructs obligations from assertions and then maps them into candidate categories. That mapping can flatten distinctions; the explicit 91-row ledger, exact inputs/carets, literal-null comparisons, default-source comparison, and separate renderer predicates are the control against that distortion. List HTML preservation uses the static token-tree argument above; it was not executed. No runtime reach, platform setup, application fixture, native editing, full16 baseline, mutation sensitivity or passing claim follows. The isolated source review also does not adjudicate whether the existing authority documents are sufficient for a new law; no new law is proposed.
