# Final current-source formatting campaign — independent loss/execution review

Reviewer `/root/loss_format_unit_final`, 2026-11-19. Scope: source preservation
of the original 91 formatting-unit assertions and H1–H6 browser observations,
then inspection of the completed full default Chromium campaign and the
outstanding list NUL authored challenge. No browser, test or mutant was run by
this reviewer. Only review documentation is edited.

## Source receipt before execution verdict

The active campaign is
`build/formatting-oracles/final-current-chromium-integrated`. Its
`pre-inputs.json` SHA-256 is
`7775e8e70909566c1178ea914e08d215d830e69ef4498c7c868f2eefab5f45ab`.
The receipt contains 402 files, including all 14 oracle entry files and all 75
authored mutant files. It records Node v24.19.0, oracle pin `97a4e7a`, base
commit `28b0c8d642a87e5810ad6eabd95c2d1714c53396` and the final applied mixed
entry `1a9285cf55b7acd4eee384e856ca3724250d62112331c300d06fb56f2fc9f6aa`.
All seven applied mixed identities were separately verified against their
accepted review manifest; see [mixed receiving loss audit](mixed-input-receiving.md).

The launcher log invokes the default `test:formatting` command with only the
output-directory argument. The reviewed runner selects all entry files by
default and automatic operators for `format-shortcuts.ts`, `links.ts` and
`draft.ts`, alongside the authored directory. No `--only`, `--sample`, replay
or selected-oracle restriction appears in that logged invocation. Execution
results must still establish completion; this is a launch/source receipt.

| Production input | Prelaunch SHA-256 |
| --- | --- |
| `src/ui/format-shortcuts.ts` | `87b9635e519f922490df0a31c68935641a76e6c068d4e4e50dbb7e81f070eeac` |
| `src/ui/links.ts` | `04671ef2fb05ac2363a1b0bd23236914bcbbe49d19b10b506cf6cbbcea14292c` |
| `src/ui/draft.ts` | `cc3ee87d1e7233a77ae1a8ca5c395455efe5e1a65b9b209b1166e7d990d054ae` |

## Original unit mapping retained in this source

The assertion-by-assertion frozen mapping remains
[final-format-unit.md](final-format-unit.md). This review compared all eleven
relevant current entry/model/check files directly with the frozen
`/private/tmp/blygger-final-editor-loss-audit/new/` snapshot instead of treating
the older prose verdict as an automatic current-source verdict.

The keyboard entry and model, code-block entry and model, break model, and
shared document/check helper are byte-identical to that snapshot. The inline
entry adds prose; its model adds six context constructions/reach predicates
without changing an old construction or expected-result rule. The line-break
entry only updates the name of its browser-undo companion. The list entry
expands its declared parent/padding bounds. The list model retains every old
source and nesting construction, adds ordinary-99 and PAD witnesses, and
retains the exact omitted-override behavior of `moveRows`; its nesting model
only adds optional parent spelling/body/gap inputs with old defaults intact.
The independent default-route controls are recorded in the mixed loss audit.

Thus the following original observation routes remain present, with their
full comparisons and original concrete inputs:

| Original assertion family | Count | Registered current route |
| --- | ---: | --- |
| Single/multiline emphasis, placeholder link and format-key classification | 29 | `editor-emphasis-single`, `editor-emphasis-multiline`, `editor-link`, `editor-key-classification` |
| List source/edit/caret/declines and five original renderer inputs | 34 | `editor-list-source`, `editor-list-rendering` |
| Break/verse, code-block source/selection, formula and structural-key classification | 28 | `editor-line-break`, `editor-line-break-verse`, `editor-code-block.default-source`, `editor-code-block.selection`, `editor-formula`, `editor-key-classification` |

This is preservation of 91 original assertions, not a claim that the original
unit tests asserted browser undo, actual focus movement or arbitrary-input
totality. Those are distinct replacement obligations and evidence routes.

## H1–H6 mapping retained in this source

The original inventory is
[browser-loss-review.md](../browser-review/browser-loss-review.md), including
its historical raw findings. Current session/navigation entry, model and
driver hashes exactly match the fingerprints in
[final-integration-review.md](../final-integration-review.md). This review
also read the current session construction/action/model/check chain and the
navigation hard-departure/same-item quick-edit path.

| History | Original observations | Current route and boundary |
| --- | ---: | --- |
| H1 composer emphasis/link/state | 8 | `editor-browser-session`: B/I/B/I full sources, undo, `undoneState` through composer kind switch before redo, placeholder link and typed target; both profiles. |
| H2 full editor and same-item quick edit | 3 | Session loaded whole-source I/I and same-item quick B; navigation's `original-leave-{desktop,mobile}` additionally retains original hard `page.goto('/studio')`, explicit Leave and the same created item's `quickLoaded`/`quickBold` observations. |
| H3 list typing/undo | 5 | Session `list`: exact fruit/apples/pears, real Tab, focus, complete ordered/multiplicity-preserving nested children, typed continuation, Shift+Tab and undo; desktop retained, mobile added. |
| H4 off-list Tab | 2 | Session `tab`: exact `Plain prose.`, real Tab, unchanged full source and actual focus departure; desktop retained, mobile added. |
| H5 verse | 3 | Session `verse`: exact Tyger source with hard break and actual item/source-correlated Worker preview committed to DOM, one paragraph and one break; desktop retained, mobile added. |
| H6 toolbar | 7 | Session `toolbar`: exact indent/focus/outdent/break/code source journey, visible first-item explanation and complete unchanged source; both profiles. |

Each intermediate named snapshot reaches the registered history comparison;
the models do not replace these 28 observations with a terminal summary.
Original profile distinctions remain included. The actual listener, native
keyboard and toolbar paths remain in the real app driver. This source review
does not turn Chromium profiles into WebKit evidence or claim OS clipboard
coverage. Clipboard tests remain retained pending the parent's acceptance.

## Outstanding execution distinction

The final owned-list receipt in
[list-parent-padding-review.md](../list-parent-padding-review.md) left
`src/ui/format-shortcuts.ts#authored:review-list-valid-nul-context` open as
`not-observed` because its totality owner was absent from that selected-file
campaign. That classification is not a kill and does not close the gap.

The authored challenge inserts a throw for any source containing NUL at the
start of `indentEdit`. The registered owner `editor-structure-valid-input`
already constructs `context` with a NUL prefix and records separate public
break/indent/outdent return/error envelopes. Its `valid structural edit` check
permits literal null only for list returns, rejects captured errors, and
requires every supplied edit's usable geometry. The full default campaign
must provide the actual registered owner/law/checkpoint rejection. Baseline
pass or another property's failure alone is not that verdict.

At this entry's creation, the full campaign is still active. No completed
baseline, calibration, determinism, mutation or global gap verdict is asserted
here. Completion review will append raw-evidence dispositions and the
postrun identity comparison without replacing this pre-verdict record.

## Repeated full-baseline execution inspection

Both full baselines are now complete. Independent inspection of preserved raw
captures `run-94017-1.jsonl` through `run-94017-14.jsonl` and the corresponding
repeat captures `15` through `28` finds 4,367 passing registrations in each
phase, no failing or skipped registration, and one closed receipt per file in
each phase. Both phases contain the same 4,367 unique keys and identical
observed hashes at every matching key. Each phase passes 77 calibrations and
1,482 determinism registrations.

The original-unit mapping was checked by explicit property/history names,
including all sixteen original concrete key chords. All 92 required
property/history pairs pass in both fixed and random campaigns in each phase:
184 matched registrations per phase, zero missing or wrong. These 92 pairs
cover the original 91 asserted observations; counts differ because the
code-block source and selection checks use separate properties, while each
old renderer's two assertions share a route.

The H1–H6 check independently finds every composer/editorToQuick/list/tab/
verse/toolbar desktop/mobile case in the session capture and both
`original-leave` profile cases in navigation. All pass fixed and random
campaigns in both phases: 28 mapped registrations per phase, zero missing or
wrong. This verifies the retained source mapping through the actual current
receiving registrations, rather than crediting a helper-only pass.

The versioned artifact-inspection receipt
[final-current-integrated-baselines.json](final-current-integrated-baselines.json)
contains the complete required route lists, per-file counts, all 28 raw
capture SHA-256 values and the repeat comparison. Its SHA-256 is
`8feb8f02d0903f76e620c687d8018d751e918ba0ff64232ac4258612f2fa20cd`.
No new browser/test run produced this receipt; it is a read-only reduction of
the parent's preserved captures. The mutation phase is active. Final report,
list NUL owner verdict and pre/post identity comparison remain outstanding.

### Phase correction before mutation evidence

The preceding sentence calling the phase after capture28 a mutation phase was
premature. Independent inspection of capture29's snapshot and the pinned
framework's `check.mjs` shows it is an **unmutated selected-tail validation
batch**. Its snapshot lists 84 generated owner-file copies, each with
`mutant:null` and an explicit selection. The framework's `selectionOf` retains
the suffix beginning at the first reaching test; `checkShare` runs that suffix
without a mutant, and `reproduces` compares its row hash, observed hash and
call count with the complete first baseline before allowing that optimization.

Consequently the generated copies' explicit nonselected-property skip rows
are separate from both complete main baselines and from mutant outcomes. They
must not be counted as full-baseline skips or mutation kills. The verified
4,367-by-two complete baseline result is unchanged. This correction records
the mistaken phase inference before a final verdict; actual mutation evidence
still requires the completed report and its registered law outcomes.
