# Final inline/formula follow-up review

This addendum supplements `/private/tmp/blygger-final-loss-inline.md` and `/private/tmp/blygger-gap-review-inline-formula-20261118.md` after the final source edits. The focused run was active; this review did not change repository inputs or execute a competing suite. Findings are source-review evidence, not a statement that the focused run passed.

Worktree: `/Users/kyle.mathews/programs/blygger-studio/.worktrees/oracles-explore`.

## Original witness preservation

**All original 29 inline/key assertions remain preserved exactly.** The source-history definitions, plans, model outcomes and Chromium argument routes for the 21 inline cases are unchanged from the prior full mapping. Their checked valid source outputs and absolute selection endpoints remain identical under the new guarded projection. No old witness was moved back into random-only sampling.

| Original test lines | Current exact constructed witnesses | Evidence |
|---|---|---|
| 19–33 | `sourceBold`, `sourceItalic`, `sourceOutsideBold`, `sourceOutsideItalic`, `sourceSelectedBold`, `sourceSelectedItalic`, `sourceAddItalicInsideBold`, `sourceAddBoldInsideItalic`, `sourceRemoveBoldKeepOutsideItalic`, `sourceRemoveItalicKeepOutsideBold`, `sourceEmptyBold`, `sourceEmptyItalic`, `sourceEmptyOutsideBold`, `sourceEmptyOutsideItalic`, `sourceTrailingWhitespace` | `inline-model-oracle.ts:93–107`; plans 120–122; expected edits 125–149; `editor-inline.oracle.test.ts:50–57` |
| 39–41 | `sourceBlank`, `sourceRemoveAcrossBlank`, `sourceMixed` | `inline-model-oracle.ts:174–181`; plan/model 191–207; browser/check `editor-inline.oracle.test.ts:60–67` |
| 47–49 | `sourceLabel`, `sourceWholeDocumentTarget`, `sourceCaret` | `inline-model-oracle.ts:231–235`; plan 213 and model 242–251; browser/check `editor-inline.oracle.test.ts:70–77` |
| 56, 57, 60, 61, 64, 65, 66, 67 | `chord3`, `chord133`, `chord68`, `chord66`, `chord0`, `chord196`, `chord20`, `chord36` | `keyboard-model-oracle.ts:10–27`; browser/check `editor-keyboard.oracle.test.ts:46–59` |

The original eight chord inputs retain the same indices: Unicode key decoys were appended to `keys`, not inserted before the original entries. The chord model now matches explicit ASCII lower/uppercase B/I/K rather than Unicode `toLowerCase()`. This fixes an extra-model case-folding assumption while preserving every original key expectation.

The four additional original formula source witnesses at lines 193–196 also remain unchanged at `inline-model-oracle.ts:255–262`.

## Formula grammar review

The final change retains unrestricted source partitions and the prior complete-display route, then adds independent left/body/right source construction at `inline-model-oracle.ts:266–279`:

- left and right dollar counts vary independently over 0–3;
- body remains arbitrary UTF-16 up to 32 code units, admitting empty, newline, control and surrogate content;
- no sample is accepted/rejected according to production output or model success;
- generated selected text is the literal concatenation of those source pieces;
- the existing semantic model at lines 292 onward remains unchanged, and production is still called with raw text plus valid offsets.

The five constructed representatives at lines 280–283 directly exercise asymmetric and overlapping source boundaries: `$$ab`, `ab$$`, `$$`, `$$a\nb`, and `a\nb$$`. Existing complete-display, empty, whitespace, Unicode and original-context cases remain. State labels now include asymmetry and short overlap, while `histories` still constructs every named example rather than pruning on labels.

The inverse at lines 271–276 is a valid bounded **preimage**, not a unique decomposition. For any generated value, its originating left/right counts are among the sixteen possibilities, leave a body of at most 32 units, and reproduce the source. For a shorter value the inverse may return `[0, picked, 0]`, absorbing visible boundary dollars into the body. That still reconstructs the exact same selected source and remains legal because the body permits dollars. This noncanonical inverse can change shrink representation; it does not exclude a source shape or select by desired outcome. The model consumes raw selected text, so no expected behavior depends on recovering the original annotation tuple.

Adding a third one-of route changes sampling weights, as intended, while preserving the prior domains and deterministic witnesses. Derived selected source can reach 38 units through the dollar-run route (32 body plus six dollars); the constituent arbitrary field bound remains 32. No loss or output-biased generator filter was found. The unchanged model's short raw-source display predicate remains a source-review trust boundary, as before; this generator change does not add production calls or returned-value dependence to that model.

## Guarded observation and totality review

`document-oracle.ts:15–20` now rejects absent/nonobject edits and nonstring `insert` before applying the edit, then checks integer ordered replacement/final ranges. `result` at lines 24–26 keeps the original `{ output, selection, usable:true }` observation for valid edits and records `{ malformedEdit, usable:false }` for malformed returns.

This preserves every original observation because each original expected edit is valid. It also keeps malformed returns as checkable data: an undefined result, dropped edit field, invalid final range, or invalid insertion value cannot disappear into a driver dereference before the check receives an observation. The malformed shape differs from every valid original expectation.

The inline totality property at `editor-inline.oracle.test.ts:100–109` now calls the same guarded `usableEdit` and independently expects `true`. Thus it checks valid returns rather than reproducing the semantic model's computed usability expectation. No new concrete shared fault or original-witness loss was found in this projection change. As in the prior report, a shared helper remains a reviewable trust boundary, not proof against every conceivable correlated defect.

## M22 remains a documented framework limitation

Production `emphasis` still contains `filled.length > 0 && filled.every(...)` at line 37. The multiline property still declares `work: { ratio: 1.04 }` at `editor-inline.oracle.test.ts:61`; no source-output assertion or work bound was weakened to remove a warning.

The frozen pre-browser 22→23 operation witness exceeded 1.04 and was killed by that work bound. On all-blank multiline selections the mutation changes no source or selection, but adds an empty `every` invocation. The browser transport performs I/O; the installed framework excludes clocked/I/O baseline rows from its work map. The framework therefore cannot currently enforce this otherwise retained deterministic work bound across that transport. Preserve this evidence as the browser-I/O work-classification limitation; do not report the focused formatting changes as closing M22.

## Reviewed revision evidence

| File | SHA-256 |
|---|---|
| `test-ui/editor-oracles/document-oracle.ts` | `c1c3f482b750530ceaa83e8afee6c0021b18c241dc722dce5fc723265db81466` |
| `test-ui/editor-oracles/inline-model-oracle.ts` | `fd9a53e14700387509b611c7e6be63b993cf0e7131a5f5619fa67d56e2fca8cb` |
| `test-ui/editor-oracles/keyboard-model-oracle.ts` | `cba9fd1800a7e8a72a955a5544b1d1d5715f6f24fcc6bab687ce6c94210f16ca` |
| `test-ui/editor-inline.oracle.test.ts` | `abb3e75189b6ad9c4b454f0a1810eb1ac1b9d03e7c17b007b635272a539fd974` |
| `test-ui/editor-keyboard.oracle.test.ts` | `7f5208dd78eebfc466eb04d4755aa8fc820f3569f5aeb4abf74c56aaa467cefd` |
| original `test-ui/format-shortcuts.test.ts` | `4187c4b45f9296f33aed8683416353907ecda5cc4e3c5581891f7106c89143cf` |
| `src/ui/format-shortcuts.ts` | `3da803515b024126d880c6d25db23f77145df1a41fccdbe4db650aa11427cb54` |
