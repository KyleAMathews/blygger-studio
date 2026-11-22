# Independent semantic review: mixed receiving inputs

2026-11-19, `/root/review_formatting_coverage`, HEAD
`28b0c8d642a87e5810ad6eabd95c2d1714c53396` plus the applied hashes below.
Read the pinned `oracles-review` skill, checklist v1 and glossary in full.
This is a source/design acceptance. Browser receiving evidence is pending and
is not inferred from the pure controls.

## Finding and design consequence

The former mixed model chose exact width-plus-one source for every numbered
parent, so a reachable history typing `100.  a\n2. b` then indenting would
reject a correct result under the adopted enough-indent law. Precomputed
later ranges also assumed that one chosen serialization. Replacing that
formula with production's new minimum would add an unsupported canonical
policy; removing the indent intent or checking only a terminal rendering
would lose the adopted intermediate and continuation promises.

The accepted design records the public pre-command source/selection and
resolved action, separately records the actual range delivered to the DOM,
and retains every complete post-command state. The check establishes initial
and adjacent source/selection continuity, prior allowed-state membership,
original intent/range resolution, actual range delivery, and the complete
result at each original step. The model reads receiving inputs only.

Where ordinary four-space indentation suffices, its exact source remains
unchanged. Otherwise a symbolic raw space/tab prefix `q` represents the
adopted sufficient indentation freedom. The checker infers `q` only to
validate membership, independently rebuilds the entire source/selection,
and compares it completely. A later receiving input binds that already
permitted choice so undo/redo retain its exact raw source. Native undo and
redo caret remain unconstrained; the next received caret supplies the next
`current` input. A separate collision input receipt bridges a free mixed
prefix before the deliberate EOF reset and suffix insertion.

## Raw review findings and disposition

1. **All-space-only extraordinary prefixes lacked authority.** The first
   design enumerated only spaces. Enough indentation does not prescribe that
   spelling. Before repository application the author preserved this finding
   and replaced enumeration with symbolic space/tab `q`, retaining ordinary
   exact four spaces. The raw design and correction are also recorded in
   `mixed-input-relation/design.md`.
2. **Redo calibration initially changed source to insufficient indentation.**
   That would reject a different semantic error without showing that redo
   restores the particular chosen valid source. Before application the author
   preserved the finding in `mixed-input-calibration-review.md` and changed
   the corruption to a distinct, otherwise valid six/seven-space prefix with
   adjusted caret coordinates. Three pure variants, including a tab prefix,
   reject that alternative at the original redo checkpoint.

Neither finding was disposed by narrowing histories or by accepting a gap.
No additional source blocker was found in the final seven-file draft.

## Independent observations

The `mixedFromInputs` fold reads only `inputN`, never `stepN`. An independent
pure control replaced every step output and confirmed the model's expected
result remained identical. The checker still rejects a bad indentation
output followed by a completely matching corrupted next input at `step1`,
before a later input mismatch can replace that violation. Four partial-trace
controls reject without a model/check exception.

Independent pure controls accept all 36 mixed constructions. For a flat
`100.  a` parent they accept valid tab and mixed prefixes (`\t\t`,
` \t\t`, `  \t \t`) and six spaces, while rejecting five spaces and ten
spaces. The complete-source matcher also checks renumbering, untouched source
and caret geometry, rather than observing only the inferred prefix. The
optional `moveRows` override is the only shared-list-model change; omitting
it preserves the previous exact model.

Source inspection confirms the driver samples its prestate before setting
the new range, then samples actual delivered value/range before the command.
It explicitly establishes the initial whole-document selection after fill.
All 13 command paths remain. Both drivers retain cleanup and the original
full observations. `collisionPreInput` precedes focus/EOF selection changes;
the expected suffix append derives from an admitted prefix input and is
checked against the separately observed `collisionInput`.

The author's pure preservation controls additionally cover all 27 former
mixed constructions and 1,500 seeded histories (9,567 steps), 1,584 shared
list-source/default cases, 1,549 nesting/default cases, and 19 terminal
collision bridges. The independent loss review owns the detailed preservation
inventory in `loss-audit/mixed-input-receiving.md`. Those controls establish
model/source preservation, not browser GREEN or mutant kills.

The finite prefix bound is justified by whitespace geometry, not by the
current formatter: parent marker width is at most ten columns, effective
padding at most four, and a valid nested marker can extend three more
columns. Existing tab phase shifts a prefixed column by at most three, so
`q` ending columns through twenty contain all legal choices in this relation.
If ordinary four spaces are insufficient, a smaller prefix cannot reach the
target: a tab-free level advances by fewer than four, while a tab-containing
level advances by zero or four. The independent parser/phase control record
is [`mixed-input-relation/root-indent-controls.json`](https://github.com/blygger/blygger-studio/blob/fb0b79dc0450e5f3d31a5a8f59c0b697b5cc5f6e/docs/editor-oracle-design/mixed-input-relation/root-indent-controls.json).

## Applied source binding

The applied manifest is [`mixed-input-relation/apply-manifest.json`](https://github.com/blygger/blygger-studio/blob/fb0b79dc0450e5f3d31a5a8f59c0b697b5cc5f6e/docs/editor-oracle-design/mixed-input-relation/apply-manifest.json).
Independent inspection after application confirms all seven source hashes
match the accepted draft. Production stayed unchanged at
`87b9635e519f922490df0a31c68935641a76e6c068d4e4e50dbb7e81f070eeac`.

| Source | Accepted/applied SHA-256 |
| --- | --- |
| `test-ui/editor-mixed.oracle.test.ts` | `1a9285cf55b7acd4eee384e856ca3724250d62112331c300d06fb56f2fc9f6aa` |
| `test-ui/editor-oracles/mixed-model-oracle.ts` | `caa57fc381a4dd9f98a483c473a952edb4d221659bfe24f41e58baa2da7565b9` |
| `test-ui/editor-oracles/mixed-check-oracle.ts` | `f31c95d3877b4217ab8f57e84c541df97c7620469f6942f7bdc81537251b449e` |
| `test-ui/editor-oracles/mixed-driver-oracle.ts` | `d181446f522bef051bf024df22574a566cf314014b16059da0d57c5ad8f1e653` |
| `test-ui/editor-oracles/mixed-code-model-oracle.ts` | `83365b73baaa98d91278b5c5e44da892730b5c529951a4496ef5ed9325620e9e` |
| `test-ui/editor-oracles/mixed-code-driver-oracle.ts` | `aa8097b36821cea48c0073b316a8a9987c5033aa203633b43e950be214265107` |
| `test-ui/editor-oracles/list-model-oracle.ts` | `db594d3bd383b16e2a0f1463bdd9abb03d279972c4ab234ff499d552a840dc57` |

## Scoped checklist outcome

| Requirement (checklist v1) | Source/design outcome |
| --- | --- |
| ORC-001 | Existing per-command/mixed authority retained; unsupported exact wide serialization replaced with its allowed family. |
| ORC-002 | Model reads admitted receiving inputs; no step output predicts an answer. Shared row geometry is independent model code. |
| ORC-003 | Contract, grammar, model, driver, check and checkpoints remain distinguishable; new receiving bridge is explained. |
| ORC-004 | Original grammar is unchanged, all former constructions retained, new choices remain reconstructible, and no action/filter narrowing was added. |
| ORC-005 | Real browser command entry paths and full checkpoints remain in source; execution receipt is outstanding. |
| ORC-006 | Five prior calibrations retained and six new ones added. Pure challenges reject; registered calibration/mutant evidence remains outstanding. |
| ORC-007 | Both properties retain 25 runs, seed 20261118 and framework random campaigns/replay. No campaign executed by this reviewer. |
| ORC-008 | Exact chosen source plus undo/redo history is retained because undo/redo distinguishes otherwise converged visible states. Symbolic `q` binds at the next input. |
| ORC-009 | `q` is an explicitly model-only raw insertion parameter; public source/selection and undo/redo keep project meanings. |
| ORC-010 | Partial traces preserve the original violated checkpoint in pure controls; existing browser/native cleanup remains. Runtime cleanup evidence is outstanding. |
| ORC-011 | CommonMark column/normalized-parser controls independently challenge indentation geometry; existing rendered nesting oracle provides a separate overlapping semantic formulation. |
| ORC-012 | Raw findings, accepted hashes, independent pure controls and remaining execution limits are versioned here and in linked records. No full runtime closure claimed. |
| ORC-013 | Ordinary99 and padded100, insufficient/sufficient/code-band prefixes and raw tab variants distinguish the relation. Registered boundary evidence remains outstanding. |
| ORC-014 | Native host and browser premises remain named receiving boundaries. Current source/pure acceptance is not a new real-host receipt. |
| ORC-015 | Actual reach derives from receiving inputs/resolved actions; construction previews do not count as runtime reach. Preserve all old required states and verify new counts in campaigns. |
| ORC-016 | No ordinary example test was introduced. New examples feed the same laws/model/driver/check; challenges use framework calibrations. |

The source refactor is accepted for receiving campaigns. Native browser
execution, registered calibration/mutant outcomes, final default ownership
coverage and the separate existing-code-parent subtree proposal remain open
work. This acceptance does not assert complete formatting coverage.


## Bounded Chromium receiving execution receipt (2026-11-19)

Independent reviewer: `/root/review_formatting_coverage`. Reviewed base commit
`28b0c8d642a87e5810ad6eabd95c2d1714c53396`, package pin `97a4e7a`, and the
accepted seven-file source binding above. This receipt adds execution evidence
without changing the source/design verdict or runtime inputs.

Completed selected run `b0d1b76f47df` is recorded in
`build/formatting-oracles/mixed-input-receiving-chromium`. I independently read
`results.json`, both preserved baseline JSONL captures, all three preserved
mutant captures, state snapshots/history and the pre/post manifests. Both
baseline captures contain 186 distinct passing test keys: 114 fixed/random
campaign units, 11 named calibrations and 61 determinism checks. The completed
result has zero baseline failures/skips and no nondeterministic entries. All
402 pre/post file-map entries are identical; production is still `87b9635e…`
and each of the seven accepted source SHA-256 values matches the manifest and
current file.

The raw registered violations support three actual selected kills:

| Authored mutant | Raw capture | Registered law / final preserved checkpoint |
| --- | --- | --- |
| `browser-native-undo-required` | `run-88925-3.jsonl` | `mixed browser editing history` / `step1` |
| `original-invalid-fence-info` | `run-88925-4.jsonl` | `mixed browser editing history` / `step1` |
| `original-parent-padding-indent` | `run-88925-5.jsonl` | `mixed browser editing history` / `step1` |

Each is an assertion failure through the registered `editor-browser-mixed`
property, rather than a timeout, setup failure or ordinary assertion. The
native-undo record also preserves intermediate shrink verdicts at `step7` and
`step3`; its final reported witness retains the same law and ends at `step1`.
Temporary unit filenames bind captures 3/4/5 to mutation units 1/2/3. A
concurrent snapshot race means capture 3's link-time state already references
capture 4; that snapshot is not presented as an exact capture-3 binding.

The requested selector `authored:original-fence` matched no mutant. It was a
filename shorthand, while the actual ID is
`authored:original-three-backtick-wrapper`. The completed result contains
only three result entries. No fourth kill is inferred. The runner-reserved
`stream.log` suffered duplicate/NUL bytes from operator redirection; I did not
use that file as evidence.

### Separate corrected wrapper replay

Completed diagnostic run `13912f41a0eb` in
`build/formatting-oracles/mixed-code-wrapper-chromium-replay` selects the exact
`authored:original-three-backtick-wrapper` ID. Its result records one passing
baseline case with 185 skipped cases, and one kill. The preserved raw mutant
capture `run-97962-3.jsonl` reports registered `editor-browser-mixed-code`, law
`mixed literal-code receipt`, checkpoint `collisionRendered`, for the
`random seed: padding-space-false-true` case. Its witness is the native mixed
prefix typing `100.  a\n2. b`, indenting, then wrapping collision payload
`a\n```\nb`. The result is an assertion failure at the promised rendered
literal-code boundary. All 402 pre/post file-map entries are identical and
match the accepted runtime inputs.

Only the mutant raw capture remains in this replay's preserved directory;
state history references baseline captures 1 and 2 but does not preserve
their raw rows. The completed result supports the selected one-case baseline;
this receipt does not claim preserved raw baseline captures for that replay.
The complete 186-case baseline above remains separate. Neither replay is a
full default mutation campaign, and neither closes final ownership coverage.
Firefox receiving evidence and the final default ownership verdict remain
outstanding at this receipt.


### Separate corrected Firefox wrapper replay (2026-11-19)

The Firefox diagnostic in
`build/formatting-oracles/mixed-code-wrapper-firefox-replay` has the same
content-derived result ID `13912f41a0eb`; its separate `launcher.log` explicitly
runs `--browser firefox`. The receiving engine helper selects Firefox from
`FORMATTING_ORACLE_ENGINE`, preserving the same laws/histories. The completed
result reports one passing baseline case with 185 skipped cases, zero
nondeterminism, and the exact authored wrapper mutant killed. I independently
read preserved `run-99796-1.jsonl` (selected baseline passes) and
`run-99796-3.jsonl` (registered `mixed literal-code receipt` violation at
`collisionRendered`, same padded-parent/collision witness as Chromium).
Baseline capture 2 is not preserved; the completed launcher/result support
the repeat without supplying its raw rows.

All 402 pre/post file-map entries are identical to each other and to the
complete Chromium receiving input map. Manifest SHA-256 values are
`49e015eb5a052d97a8ceaadebf0e65646d03539fe615e67435cdfa60bb268440`
(pre) and
`6a3bf8e1d6dcc928f842e835583ad4a6cdab65e551501e390c1b1f084cf6289a`
(post). This is one selected Firefox assertion failure at the intended
boundary. It does not establish the complete Firefox baseline or full default
ownership campaign; those remain separate evidence.


## Bounded Firefox receiving execution receipt (2026-11-19)

Independent review is complete for
`build/formatting-oracles/mixed-input-receiving-firefox`, whose completed
content-derived result ID is also `b0d1b76f47df`. Its separate launcher binds
`--browser firefox`; source inspection confirms the runner launches that
engine and passes its engine name and websocket endpoint to the same driver.
I independently read the completed result, all five preserved raw captures,
and pre/post manifests. Baseline captures `run-92000-1.jsonl` and
`run-92000-2.jsonl` each contain 186 distinct passing test keys with no
failures. Their key set matches the complete Chromium baseline, including all
11 named calibrations and 61 determinism checks. All five captures have
closed-file records. The result has no baseline skips and no nondeterministic
entries.

Raw mutation captures 3, 4 and 5 respectively preserve registered
`mixed browser editing history` failures for `browser-native-undo-required`,
`original-invalid-fence-info` and `original-parent-padding-indent`. All three
final violations are at `step1`; the native-undo record also preserves the
same law's intermediate shrinking verdicts at `step7` and `step3`. These
are assertion failures at the intended oracle comparison. The result has
exactly three mutant entries. As on Chromium, unmatched
`authored:original-fence` contributes no result and no fourth kill.

All 402 pre/post file-map entries are identical to each other and to the
accepted complete Chromium receiving map. Manifest SHA-256 values are
`688745ec5efdf06aa2e0f1e7d54456b631816ab6903a5ab3bd691ea1688ce338`
(pre) and
`1db7729edc363e48230c7cb4430a8afa66323c7aad5c47a972608fce9efe6412`
(post). Production and the accepted seven model/driver/check source hashes
remain unchanged.

This completes bounded receiving acceptance on Chromium and Firefox for the
complete 186-case unmutated baseline and the three actually selected
mixed-history mutants, plus the separately scoped exact-wrapper replay on
each engine. It supplies receiving/calibration/registered comparison evidence
for ORC-005, ORC-006, ORC-010, ORC-013, ORC-014 and ORC-015 within those stated
bounds. It does not replace the final default ownership campaign, the other
oracle reviews, or the decision still needed for the separate
existing-code-parent subtree proposal. In particular,
`review-list-valid-nul-context` remains open until the default campaign's
valid-input owner supplies a registered verdict. No complete-formatting or
zero-gap claim is made here.
