# applyEdit survivor review

Independent read-only follow-up, 2026-11-18, same worktree/HEAD as preceding reports. No repository inputs were edited and no competing oracle suite was run. Examined live `build/formatting-oracles/2026-11-18T16-55-18.364Z/results.jsonl` and used a focused temporary Chromium probe. This is a review of three reported survivors, not a completed gap verdict.

## M335 — confirmed missing endpoint-topology family

Claim/authority: every valid UTF16 replacement preserves exact selected/unselected source regardless of native editing's visual grapheme behavior. Both endpoints must be safe before native range editing is used.

Live result: `src/ui/format-shortcuts.ts#applyEdit`, binary-swap `&&` to `||` in `boundaries.has(edit.from) && boundaries.has(edit.to)`, outcome survived, class not-judged. Existing partialClusterDelete history changes effects but not source, so the allowed native/fallback set accepts its exact result.

Independent RUN: temporary source copies of actual current `applyEdit` baseline and exact M335 mutation in Chromium. Four source strings (combining sequence, surrogate emoji, ZWJ emoji, skin-tone emoji), every ordered pair of endpoints, empty/x inserts: 138 histories per variant. Baseline has zero source mismatches; M335 has53.

Smallest clear witness: source `a\u0301b`, from0,to1,insert'' owes `\u0301b`. Baseline uses exact fallback and returns it. M335 attempts native delete and returns `b`, losing the unselected combining mark. Insert'x' similarly owes `x\u0301b`, but mutant returns `xb`.

Nearby controls explain why the current oracle missed it:

- Source `a\u0301b`,[1,1),insert'': both endpoints interior; both AND/OR guards refuse native and preserve source.
- Same source,[0,2),insert'': both endpoints boundaries; both use native and return `b`.
- Same source,[1,2),insert'': interior→boundary; mutant uses native but Chromium happens to delete just the combining mark, so both return `ab`. This is exactly the shape of current partialClusterDelete.
- Same source,[1,2),insert'x': mutant inserts after the visual cluster and returns `a\u0301xb`, whereas exact replacement owes `axb`.
- Same source,[1,3),insert'': mutant leaves `a\u0301`, whereas exact replacement owes `a`.

General repair: add generated cluster-template histories with independent endpoint topology (boundary→interior, interior→boundary, both interior, both boundary) and empty/nonempty insertion. Vary ordinary prefix/suffix and insertion content independently. Construct both one-unsafe-endpoint directions, and include both deletion and replacement. Keep the model based on exact UTF16 slices; do not copy Segmenter into expected source. Promote semantic endpoint topology to declared reach so the needed family cannot later vanish while generic native/insert/delete states remain green.

Evidence: `/private/tmp/blygger-keyboard-review.ET8NPJ/one-endpoint-mutant-probe.cjs` and `.output`. This is a real behavioral distinction, not an unexplained mutation failure. The parent should add histories only after the active campaign completes, rerun the registered mutant and record the law/checkpoint kill.

## M343 — native delete undo receiving history missing

Claim/authority: ordinary user formatting edits remain on native undo; exact source plus fallback event correctness alone does not establish this receiving promise.

Live result: replacing `document.execCommand('delete')` with undefined survives with changed tests on nativeDelete/fallbackDelete. The direct transaction law intentionally allows native refusal or direct fallback, so it correctly accepts source-preserving fallback. The real app receiving histories only use nonempty prose bodies; their formatting removals reinsert nonempty bodies and therefore call insertText, not delete.

Smallest proposed real app witness: start textarea source `****`, caret[2,2], press Ctrl/Cmd+B. The adopted emphasis law removes the surrounding bold markers with edit{from0,to4,insert'',start0,end0}; source becomes empty. Native undo must restore `****`; redo must return to empty. An equivalent surrounding-prose family uses before+' **** '+after and a caret between the two opening/two closing markers. This is ordinary user interaction with empty emphasis and needs no new production-only test hook.

Evidence status: SOURCE RECONSTRUCTION/proposed app experiment, not an independently observed app mutant kill. Current emphasis implementation's outside-delimiter branch returns the exact empty insertion/nonempty replacement needed for native delete. Suggested grammar dimension: empty and nonempty emphasis body, generated before/after, bold/italic marker width, actual keyboard toggle, native undo/redo, and a React re-render after undo to prove receiving state persists. This should route through the same registered session model/driver/check; do not add a standalone fixed Playwright complement.

The direct transaction allowed set should not be narrowed merely to force a native command, because native refusal is legal. Judge native undo at the actual receiving history where the real host supplies successful native deletion.

## M333 — explicit granularity field remains a reported gap

Live result: field-drop `granularity:'grapheme'` survives, class not-distinguished, changedTests empty. Keep this warning/key and evidence in the report. There is no registered kill here and no closure is claimed.

Standards-based next investigation: Intl.Segmenter defaults to grapheme granularity, so the explicit field may be code no adopted law needs. If the parent removes the redundant options object as a justified refactor, preserve the before/after oracle evidence required by design step7 and rerun gaps on the simplified source. That would close the removed code by deletion; it must not be mislabeled a kill or justified by calling the survivor equivalent. If the field is retained, require a distinguishing law/history or report the unresolved framework-generation issue to maintainers. Do not add a fake altered Segmenter default merely to kill the mutant: that would change the host premise away from real browser behavior.

## Remaining limits

The original endpoint repair is supported on one Chromium runtime with the finite sources above. Other engines and all Unicode versions are not established by this probe. This report does not replace the active full campaign, and setup/runtime errors/timeouts must remain distinct from law kills. No source changes were made by this reviewer.
