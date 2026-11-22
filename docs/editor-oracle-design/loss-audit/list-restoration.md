# List witness restoration handoff

Changed file only: `/Users/kyle.mathews/programs/blygger-studio/.worktrees/oracles-explore/test-ui/editor-list.oracle.test.ts`.

The adopted list laws are reused. This restores the raw loss-audit's source and rendering omissions. Existing source histories, EOF variants, numeric-width rendering histories, seed 20261118 and budgets of 100 remain. Added 24 original source histories and five original rendering histories. All 82 source histories and 16 rendering histories are legal under their arbitraries.

## Exact source mapping

Every row maps one original `test-ui/format-shortcuts.test.ts` assertion to a guaranteed `editor-list-source` history. The source resolver reproduces the complete original text and selection, and the independent model reproduces the original expected before/after result, including null declines. The driver compares the complete edit and complete spliced source at `result`.

| Original line | Constructed history |
| --- | --- |
| 88 | `originalIndentBullet` |
| 89 | `originalIndentBeforeMarker` |
| 91 | `originalNumberRestart` |
| 92 | `originalNumberContinuation` |
| 93 | `originalNumberWidth` |
| 94 | `originalMixedBullets` |
| 95 | `originalParenthesis` |
| 96 | `originalEmptyMarker` |
| 100 | `originalOut4` |
| 101 | `originalOut2` |
| 102 | `originalOutTab` |
| 103 | `originalOut8` |
| 105 | `originalCaretInsideIndent` |
| 109 | `originalMultiple` |
| 110 | `originalMultipleOut` |
| 112 | `originalNextStart` |
| 116 | `originalPlain` |
| 117 | `originalEmpty` |
| 118 | `originalNonlist` |
| 119 | `originalMixedSelection` |
| 120 | `originalMarginOut` |
| 121 | `originalBoldProse` |
| 123 | `originalNoParent` |
| 124 | `originalProseParent` |

## Exact renderer mapping

All five old sources from original line 130 are guaranteed histories in `editor-list-rendering`. Each reuses the same independent list-tree model, MarkdownIt observation and result comparison. Complete relevant list/inline token order preserves immediate ancestry and first-child identity; added `noPre` observes the original literal HTML `<pre>` exclusion alongside existing no-code tokens. Returned selection and caret remain checked.

| Original source (caret at end) | Constructed history | Old assertions preserved |
| --- | --- | --- |
| `- a\n- b` | `originalBulletChild` | immediate a→nested-b and no `<pre>` |
| `1. a\n2. b` | `originalNumberedChild1` | immediate a→nested-b and no `<pre>` |
| `10. a\n11. b` | `originalNumberedChild10` | immediate a→nested-b and no `<pre>` |
| `- a\n2. b` | `originalMixedLists` | immediate a→nested-b and no `<pre>` |
| `- a\n    - b\n    - c` | `originalExistingSublist` | existing immediate a→nested-b and no `<pre>`; tree comparison additionally checks c under b |

## General grammar extensions and their contribution

- Added parent contexts `1. a`, `* a`, `- x`, and existing `- a / indented - b`, retaining earlier contexts. These restore numbered restart with following sibling, star/plus combination, exact outside identities and existing nesting.
- Item bodies now cover up to 24 lowercase letters/spaces, with nonempty bodies starting in a letter because marker whitespace belongs to `gap`. The reversible mapping keeps all old letter and `b c` values. Explicit prose adds `plain text` and `-not a list`.
- Suffix alternatives preserve exact `3. c`, `- b`, `- d`, `- second`, EOF and trailing-newline boundaries. The source model and original EOF partition repair are unchanged.
- Rendering independently varies bullet children (`- * +`) and numbered children under flat bullet or all 1–9 digit numbered parents. The existing-nesting grammar creates a third bullet level. Old numeric-child records remain legal without optional fields.
- Nearby excluded structural histories remain zero selected-row records (empty document is represented by one blank row), reversed/raw invalid ranges (the resolver supplies valid ordered selections), and ten-digit render parent markers. The source grammar includes a ten-digit would-be marker as prose to require decline.

## Distinguishing additions for parent's current gaps

- `firstBlankOutdent`: exact `\n    - b`, caret [0,0], outdent. The model selects only the empty first row and requires null/unchanged source, distinguishing M119's document-start lineSpan boundary mutation.
- `leadingBlankNumberRestart`: selected blank then `2. b` following an indented ordered parent. First-row condition is false, depth and ordered-parent conditions true; restart must still be 1. Targets continuation OR mutations.
- `numberInParentBody`: parent `1. a2. b`, selected `2. b`. First-row condition true, startsWith depth false, sliced ordered text true. Targets the inner continuation conjunction replacement.
- `existingBulletSource`: source-level complete edit/selection for the exact existing-sublist renderer input.

## Evidence and limits

`/private/tmp/blygger-list-reconstruct.mjs` passed a pure reconstruction check: all 24 old input/expected pairs and 5 rendering inputs match exactly; every constructed history is accepted by its arbitrary. It loads no production or oracle registration and runs no driver/check, so it is input/model evidence only.

Standalone TypeScript check reports no oracle-file errors; it reports three diagnostics in unchanged production `src/ui/format-shortcuts.ts:168` (reduce inference under the standalone command). The repository has no lint script; parent runs oracle-gaps, including its registration/lint and full production evidence. No registered oracle was run outside oracle-gaps. No GREEN, mutation kill or full reach claim is made here; parent's results decide those.

Remaining bounded domains are four selected source rows; fixed before/after context alphabets; 24-letter/space selected bodies plus explicit prose; indentation variants through eight spaces and tabs; renderer letter bodies through twelve; flat 1–9 digit numbered parents and a fixed existing hyphen sublist. These restore all original list assertions but do not claim arbitrary Markdown structures or real browser focus/undo. Production was not edited.
