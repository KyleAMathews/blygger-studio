# Intra-word receiving review addendum

Read-only source review, 2026-11-18, in `/Users/kyle.mathews/programs/blygger-studio/.worktrees/oracles-explore`. Follows the pinned `oracles-review` skill, checklist v1 and glossary read in full during this continuing review. No repository edits or tests were run; the parent's full campaign is active. Supplements `/private/tmp/blygger-browser-final-receiving-closure.md`.

## Verdict

**No new finding. The intraWord journey correctly strengthens the adopted native-undo law and preserves the prior static no-loss approval for all 28 original browser observations.** Source correctness does not establish a kill; await the active campaign's registered assertion outcome for the segmentation mutant.

## Surface/journey gate check

- `session-model-oracle.ts:46–49` initializes `intraWord` by filling the generated source and selecting only its middle body. It does not take the loaded-whole-source initialization branch.
- The returned receiving surface (`:100`) is always `editor` for non-`inline` journeys, including `intraWord`. Correspondingly, `sessionStates` (`:29`) declares `editor`, regardless of the unused generated surface field. Thus an intraWord history with `h.surface:'composer'` still runs the full editor; that label does not accidentally generate an unsupported composer-radio action.
- The fixed I/I override (`:54`), composer rerender action (`:58,60`), and same-item quick transition (`:61–64`) all require `h.journey === 'inline'`. They cannot hijack the new intraWord history. Its generated one-to-eight emphasis commands, native undo/redo and later link history run against the same selected full-editor textarea.
- The existing driver needs no new special branch: the `fill` action supplies exact source/selection, real keyboard input reaches the SPA listener, and snapshots retain source/selection/focus for formatting plus source for undo/redo.

## One independently rebuilt observation

For the constructed bold history (`before:'one', body:'two', after:'three'`), source is `one xtwoy three`, selection `[5,8]`. The established independent emphasis law adds two markers around selected `two`, predicting source `one x**two**y three` and selection `[7,10]`. Undo must restore `one xtwoy three`; redo must restore the formatted source. Italic predicts `one x*two*y three` and selection `[6,9]`, with the same source restoration relation.

The source and expected output are derived from the command width and annotated body, not production output or a segmentation classifier. The source model already handles the context outside the edit; the adjacent literal x/y remain untouched. Undo state is captured before `edit` changes source, so it denotes the exact original middle-word source.

## Why this distinguishes the reported wrong design

Both boundaries of `two` inside `xtwoy` are valid grapheme boundaries and are not whole-word boundaries. A word-segmentation classifier can therefore fall back and produce correct immediate source while omitting the native undo entry. With the constructed one-command history, the next action is undo of the first formatting edit, so a later command cannot repair or hide the absent history. The model expects the full pre-format source; undoing earlier textarea fill instead yields a different source. Bold and italic single-command cases are explicitly constructed on both profiles (`session-model-oracle.ts:28`). Random multi-command and Unicode/prose histories add range without replacing these distinguishing witnesses.

Generated bodies can contain spaces/punctuation/emoji, so not every random intraWord history necessarily distinguishes whole-word from grapheme segmentation. That does not weaken the required witness: the constructed `two` body supplies the relevant premise in every campaign. No history or prior budget was removed to add this route.

## Checklist delta

- ORC-001/003: The opening law explicitly includes native undo for selections inside words; this is enforcement of the existing source/selection/native-undo authority.
- ORC-002: Same independent emphasis and source-history model; no production classifier copied or called for judgment.
- ORC-004/008/009: New adjacent x/y context axis has a concrete semantic contribution; no extra model state or conflicting domain terminology. Existing history families remain intact.
- ORC-005/014: Real full-editor listener and native browser operation provide the receiving premise; source/selection/focus and undo source reach the registered comparison.
- ORC-006/007: The surviving wrong word-classifier design now has a distinguishing registered history. Its actual kill remains the active campaign's evidence; no run or outcome invented here. Fixed/random/replay settings are unchanged.
- ORC-010: No cleanup or failure-capture behavior changed by this grammar addition.
- ORC-011: The new history independently challenges a classifier premise through native undo, rather than copying that classifier into the model. No additional shared-semantic fault identified.
- ORC-012: Preserve this accepted receipt with final versioned evidence and the actual campaign outcome; this temporary file alone is not a versioned audit.
- ORC-013/015: Four constructed single-command witnesses guarantee the internal-word premise on both profiles; prior whole-word paths remain nearby controls.
- ORC-016: New cases remain inputs to the same registered property/model/driver/check; no ordinary example tests introduced.

No new checklist inapplicability is asserted. The prior 28-observation table and earlier receiving closures remain unchanged.

## Reviewed SHA-256 fingerprints

```text
af9331a0797f69279da62f9c0ba5a0683b791bbe83add430f037358f58c0cd81  test-ui/editor-session.oracle.test.ts
bde749608c029cabd05d0b92881ce27f60e2a5d0e44e57fd6d8ddaf6dd00f787  test-ui/editor-oracles/session-model-oracle.ts
2d4343571ef7e8b7d16aff7384a8894388828d8b3e8ccd593f5e31fec2047571  test-ui/editor-oracles/session-driver-oracle.ts
```
