# Mixed input-boundary refactor — independent loss audit

2026-11-19. Reviewer `/root/loss_format_unit_final`. This record starts with the
pre-refactor inventory; it does not judge an unfinished candidate. Semantic
law/design review belongs to `/root/review_formatting_coverage`. This reviewer
will inspect source and append dispositions, without editing runtime/oracle
implementation files or running browser campaigns.

## Frozen comparison source

The stable pre-refactor capture is
`/private/tmp/blygger-mixed-input-loss-before-20261119/`, with its own
`manifest.json`, recorded at `2026-11-19T07:55:33.448030+00:00`. Each file was
read, copied and reread to verify an unchanged hash during capture.

| Source | SHA-256 |
| --- | --- |
| `test-ui/editor-mixed.oracle.test.ts` | `7e2b4ee20b45c3307c70b102b8ea840df33f1598e8b843aaa6571b2bf313e153` |
| `test-ui/editor-oracles/mixed-model-oracle.ts` | `27804036eb5a13cc50c7ac6f43caeab4de026810c33adddcdfe91b518d574f30` |
| `test-ui/editor-oracles/mixed-driver-oracle.ts` | `7a231faf98d3a0b1f8adddf0c14fdf7bf031f2c1b6ee6e6b82936c80c13675b7` |
| `test-ui/editor-oracles/mixed-code-model-oracle.ts` | `964bd9d07f467cf7dd256eace50a136197f4cbd004df0c98d896b1ed552de1c5` |
| `test-ui/editor-oracles/mixed-code-driver-oracle.ts` | `8ad4ecba856c6505657c9c03a5b0125ca91dc98e4689299679d317948e89007e` |

The formatter production file at capture was
`e899594086b3828684ef950a348803125108f79d59e69c915fdd8ad10cba8382`.
This is an oracle-refactor comparison, not a production-change RED/GREEN claim.
The motivating source-freedom question concerns precomputing later ranges from
one canonical indentation rather than the actual permitted pre-command source.
Neither that question nor this loss inventory chooses a new command law.

## Existing grammar and constructed witnesses

The main property `editor-browser-mixed` admits all 13 intent types:
`bold`, `italic`, `link`, `formula`, `code`, `break`, `indent`, `outdent`,
`type`, `paste`, `select`, `undo`, `redo`. It admits seven range intents:
`current`, `range`, `caret`, `line`, `all`, `end`, `start`; offsets `a/b` are
natural numbers through 160 and select Unicode-code-point boundaries expressed
as UTF-16 offsets. Histories contain 1–12 actions; ordinary text contains
1–24 code points from the declared punctuation/whitespace/Unicode alphabet.
The five initial scenes are prose, list, code, formula and multiline.
Viewport and native-command availability are independent booleans. Toolbar
activation admits click, Enter and Space.

All 27 old main constructions must remain available:

- `inline-${mobile}-${native}`, `structure-${mobile}-${native}` and
  `branch-${mobile}-${native}` for all four boolean pairs (12).
- `prose`, `list`, `code`, `formula`, `multiline`, and `selection` (6).
- `openingOffset0` through `openingOffset4` (5).
- `inlineFenceInfo-${mobile}-${native}` for all four boolean pairs (4).

The prefix-code property `editor-browser-mixed-code` admits the same arbitrary
mixed prefix, fence-collision width 3–12, its declared 0–24-code-point literal
payload, and click/Enter/Space final activation. All 11 constructions must
remain available: the six activation/profile pairs, `listPrefix`, and the four
`collision-native-${native}-width-${width}` combinations for native/fallback
and widths 3/12. Both registrations use runs25 and fixed seed20261118, plus the
same registered random campaign. The shared fixed-history wrapper and direct
replay routes must remain; no new skip/filter/budget reduction is justified by
changing how a legal range is resolved.

The existing model intentionally rewrites undo/redo whose native history is
unknown or unavailable to selection, while retaining a real redo on a known
empty branch after a new edit. A selected-code intent containing backticks
currently resolves to an empty insertion at that start; the separate prefix
receiver exercises actual selected collisions. These are existing, visible
boundaries to compare, not permission to erase additional actions or narrow
newly reachable legal histories.

## Existing intermediate and terminal observations

| Boundary | Frozen driver observation and check |
| --- | --- |
| Every ordinary mixed action | Full textarea source, both selection endpoints and focus are recorded as `stepN`. The check compares the complete source and both endpoints before the next action can obscure them. Focus is recorded diagnostically, not promised by the main step check. |
| Undo and redo | Full source and actual caret endpoints are recorded. The expected result constrains source, while native undo/redo caret remains unconstrained. The next explicit selected range is input, rather than a claim that native undo restored a particular caret. |
| Actual action delivery | Native format/structure keys, native typing, DOM ClipboardEvent paste, and actual React toolbar buttons receive their existing actions. Native/fallback setup and native-host commits remain distinct. A source-only replacement of those receiving paths would lose a boundary. |
| Trace completeness | Error observation must be empty; missing/extra/reordered `stepN`/`errors` checkpoints are rejected. |
| Prefix-code intermediate steps | Every prefix `stepN` receives the same full source/range comparison as the main property before collision checks. |
| Appended collision source | `collisionInput` is exactly the independently modeled prefix source plus the arranged suffix, not merely a freely accepted later input. |
| Selected collision body | `collisionSelection` compares the complete literal input, body-relative endpoints 0…input length, surrounding newlines and focus. |
| Enclosing fence | `collisionEnvelope` records before/after source and checks a complete valid matching backtick/tilde pair with sufficient width. Marker and sufficient width remain an allowed family. |
| Production preview | The actual item/source-correlated preview response and committed preview DOM produce `collisionRendered`: exactly one child and exactly one code block whose complete literal content is input plus LF. |
| Prefix-code trace completeness | All prefix steps, collision input/selection/envelope/rendered and errors must occur once in order. |

A new pre-command input receipt may select a concrete allowed representation,
but it cannot retroactively validate a wrong prior output. The source review
must therefore inspect first-input arrangement, adjacency/continuity, the
independent per-command expected result, and exact chosen-source history for
undo/redo. In particular, corrupting `stepN` and the matching next `inputN+1`
must still reject the original step at its original checkpoint. The same bridge
is needed between the last prefix step and suffix/collision input. These are
comparison obligations from the retained observations; they are not an
acceptance verdict for the unfinished candidate.

## Original migration mappings remain dedicated

The original unit source's 91 assertions remain mapped by
[the final unit audit](final-format-unit.md) and its isolated companion audits:
29 inline/key assertions, 34 list assertions, and 28 break/block/formula/
structural-key assertions. Their dedicated routes are `editor-inline`,
`editor-keyboard`, `editor-list`, `editor-line-break`, and `editor-code-block`,
with their own models and browser transport. These exact old constructions,
source/range/null/renderer checks and omitted-argument shapes must not be
retired in favor of a mixed-state summary.

The two removed formatting browser files' H1–H6 mapping accounts for 28 product
observations, with the original profile distinctions. The registered
`editor-browser-session` route retains composer/full-editor/quick-edit delivery,
React state after undo, real list/typing/undo, off-list Tab focus, verse preview
and toolbar source/focus/decline behavior in `sessionCases` and its model/driver.
The source-wide import scan finds the mixed helpers imported only by the mixed
registration and its prefix helpers, not by those dedicated unit or session
routes. Thus the proposed five-file mixed refactor must preserve its own
composition checks while leaving those original migration routes in place.
Concurrent list-model work has a separate author/review; this record does not
silently certify that work by citing an older frozen mapping.

## Pending candidate disposition

Awaiting a draft from the author and the independent semantic-design review.
No candidate loss/no-loss verdict, runtime admission, browser pass, calibration
pass, mutation kill or global zero-loss claim is made at this stage.

The frozen checker also contains five calibrations to preserve or explicitly
strengthen through the same property: `prior source lost`, `selection drift
before next action`, `redo returns abandoned branch`, `mixed collision
truncates selected source`, and `mixed collision caret outside body`. The new
self-consistent wrong-output/next-input challenge must complement their
original source/range/branch/literal distinctions, rather than move every
failure to a missing-input or terminal-rendering checkpoint.

Frozen production ownership is also part of the comparison. The main
registration owns `onFormatKey`, `applyEdit`, `codeBlockEdit`, `formulaEdit` in
`src/ui/format-shortcuts.ts` and `insertLink` in `src/ui/links.ts`; the prefix-code
registration owns `codeBlockEdit`, `applyEdit`, and `onFormatKey`. Removing an
owner without an explicit, independently reviewed replacement would lose
mutation selection even if a source comparison still looked broad.

## Draft design preservation read — implementation pending

The author's draft at `/private/tmp/blygger-mixed-input-relation/design.md`
was read after draft handoff. Its SHA-256 is `87dfdd638f9ca77cd12095162188326ad55f7bf39534b48aa097ca9d56fd05bf`.
It expressly retains every old construction/action/range/mode/scene/budget,
every old `stepN` and terminal prefix-code observation, the five old
calibrations and exact native source-history branches. It adds initial/adjacent
input continuity, independent action/range resolution, per-step allowed-state
checks and the matching-wrong-output/next-input calibration. This is a complete
preservation plan at design level, not a source or runtime acceptance. The
allowed-indent relation's semantic authority and bounds are reviewed by the
independent semantic reviewer.

Two implementation checks were sent to the author before edits:

1. `collisionPreInput` must be sampled before the old intentional EOF caret
   reset, as well as before suffix typing, so its full selection actually
   bridges the last prefix observation. The ordinary `inputN` design already
   places sampling before the next deliberate range assignment.
2. The proposed optional prefix override in shared `moveRows` expands the
   touched surface beyond the five mixed files. Its default behavior and
   omitted override argument must preserve all existing dedicated source and
   nesting constructions, including the original 34 list assertions. The
   author's model controls must compare those paths in addition to mixed
   constructions/samples. An allowed mixed spacing family is not permission
   to weaken the dedicated old exact-source witnesses.

Supplemental shared before sources were captured without overwriting the
original five-file receipt, in the same temporary directory, under
`shared-list-before-manifest.json` at2026-11-19T08:07:00.291190+00:00:

```text
82f3cc0a931c20989b0a878ad70d666b798f141b50dc7ff12d8a3fae782f1dbf test-ui/editor-list.oracle.test.ts
feef211a45ece64da5009c4b5d83e3c4af6bbc1c3bb828443ae32887027846ac test-ui/editor-oracles/list-model-oracle.ts
```

The earlier observation that dedicated routes do not import mixed helpers is
still true, but it does not isolate them from an edit to their own shared list
model. That changed dependency must be checked explicitly. No runtime/oracle
implementation edit or browser job was performed by this reviewer.

### Semantic design direction update before code review

The independent semantic reviewer subsequently accepted the direction for a
scratch implementation: symbolic raw space/tab prefix `q` where ordinary four
spaces are insufficient, ordinary four-space behavior exact, and complete
source/selection regenerated through a default-preserving optional prefix
override. The model binds only recorded input receipts; the checker still
judges every output, and undo/redo source history remains exact with caret
freedom. This supersedes the initial design's all-space-only proposal; this
loss review does not independently decide the relation's authority or bounds.
No executable candidate has yet been accepted or applied by this reviewer.

## Complete scratch source verdict — bounded loss acceptance

The complete candidate at `/private/tmp/blygger-mixed-input-relation/draft/`
was read after the final handoff. All seven files independently matched
`review-manifest.json` byte hashes:

| Source | SHA-256 |
| --- | --- |
| `test-ui/editor-mixed.oracle.test.ts` | `ec17e1bfead036c08ef3d5da35c6cb1b23b834e15cf718e5182e3870681b92d8` |
| `test-ui/editor-oracles/mixed-model-oracle.ts` | `caa57fc381a4dd9f98a483c473a952edb4d221659bfe24f41e58baa2da7565b9` |
| `test-ui/editor-oracles/mixed-check-oracle.ts` | `f31c95d3877b4217ab8f57e84c541df97c7620469f6942f7bdc81537251b449e` |
| `test-ui/editor-oracles/mixed-driver-oracle.ts` | `d181446f522bef051bf024df22574a566cf314014b16059da0d57c5ad8f1e653` |
| `test-ui/editor-oracles/mixed-code-model-oracle.ts` | `83365b73baaa98d91278b5c5e44da892730b5c529951a4496ef5ed9325620e9e` |
| `test-ui/editor-oracles/mixed-code-driver-oracle.ts` | `aa8097b36821cea48c0073b316a8a9987c5033aa203633b43e950be214265107` |
| `test-ui/editor-oracles/list-model-oracle.ts` | `db594d3bd383b16e2a0f1463bdd9abb03d279972c4ab234ff499d552a840dc57` |

**Source loss verdict:** no loss found in this seven-file refactor relative to
the frozen inventory above. This accepts the source for repository application
and receiving campaigns. It is bounded to preservation review; the independent
semantic reviewer owns the sufficient-indent relation's authority and bounds.
It is not browser GREEN, a calibration pass, registered mutation kills, a
complete gap audit, or authorization to delete retained tests.

### Preserved distinctions and added receiving checks

Exact source-slice comparisons confirm the main arbitrary and all 27 old main
constructions are unchanged, and the prefix arbitrary and all 11 old prefix
constructions are unchanged. The candidate adds nine main and eight prefix
constructions; both properties retain runs25, fixed seed20261118, their random
campaign, their registration IDs and all production owners. No action, range,
scene, activation, viewport or native/fallback axis was removed or filtered.

The entire 13-action browser dispatch switch is unchanged. Native key presses,
toolbar click/Enter/Space delivery, typing, DOM paste, full `stepN` observations,
native-host commits and failure-preserving cleanup remain. The native-host
preparation predicate now reads raw intents and the native flag because
effective actions resolve later; fallback histories still suppress native
history, while native histories with undo/redo intents can prepare the host.
The initial all-selection is explicitly arranged. Every untouched source and
caret is sampled before the next deliberate range assignment, and actual
range delivery is recorded separately.

`mixedFromInputs` reads only receiving inputs; no `stepN` output enters the
model. Inputs can bind or prune a previously permitted exact/symbolic state,
but cannot create one. Each check compares initial/adjacent complete source
and caret continuity, prior-state membership, independently resolved original
intent, actual delivered range, then that action's complete output source and
caret. All ordinary results remain exact. The sufficient-indent family
rebuilds and compares the complete document and selection after inferring its
declared raw prefix; it does not project away payload, suffix, renumbering or
caret. Undo/redo retain exact chosen source stacks, the existing known-empty
redo branch and existing no-op/DOM-paste history boundaries. Their caret
freedom is preserved, and the following current-range intent uses its actual
public caret.

For the independently traced witness `padding-space-false-true`, replacing
the indent result and the next input with the same insufficient four-space
source still fails `step1.state`: `checkMixedPrefix` checks each original
output before advancing to the next input. Later input processing cannot
mutate the earlier allowed rule. This preserves the original failure
checkpoint rather than laundering the wrong answer through continuity.

The prefix driver captures `collisionPreInput` before focus/EOF caret reset.
The prefix check first judges every intermediate full output, then compares
that receipt with the final prefix source and caret and with its allowed
states. The appended collision source is independently chosen-prefix source
plus suffix. All old complete literal body/body-relative endpoints, newline,
focus, valid enclosing fence, item/source-correlated response, committed
preview DOM, error and exact checkpoint-order checks remain. All five old
calibrations remain; six added calibrations target continuity, action/range
delivery, self-consistent insufficient indentation, chosen-source redo and
the terminal prefix bridge.

The shared list helper changes only by adding an optional prefix argument and
using it through `indentOverride ?? (the unchanged old default expression)`.
Default omission retains the complete old edit, renumbering and caret code.
At review time, the repository's dedicated list entry and list model still
equaled their supplemental before capture. Dedicated unit/session routes do
not import mixed helpers. Thus this refactor preserves the original 91-unit
and H1–H6 dedicated migration routes and observations; it does not replace
their assertions with mixed summaries or certify separate list-production
work.

### Inspected control evidence and limits

The author ran the pure scratch controls; this reviewer read their executable
source and result files and did not rerun them. `controls.mts` has SHA-256
`4c895f2ce2fcd65a5bc13f8e02a8163aa507fd4f07074cf877c49bbeadebb920`.
Its old-model comparison covers all 27 old constructions plus 1,500 histories
at seed20261118: 9,567 steps, all old results permitted, zero preview-action
deltas and zero source/history-caret output deltas. The 52 variant scenarios
exercise ordinary, nonminimal and tab-containing allowed prefixes; their
wrong-output-plus-matching-next-input challenges explicitly require the
original `step1` checkpoint.

The inspected controls also compare all old dedicated list constructions
plus 1,500 seeded histories (1,584 total) and all nesting constructions plus
1,500 seeded histories (1,549 total) with the default argument omitted. They
report identical plans/models, five input/history corruptions rejected, nine
invalid prefixes rejected, six valid prefixes accepted and all 19 terminal
collision bridges preserved. The final controls admit all 36 main and 19
prefix constructions through the unchanged arbitrary and reject four whole
state corruptions: outside suffix, payload, renumbering and caret. These are
pure model/checker controls, not receiving evidence or registered kills.

The result-file SHA-256 values are
`af1d48a1020558b98d4d517745ceb8f76b25f33e34da7b0b59a055a45caf2f49`
(`model-controls.json`),
`c1d7bd24227cddb4bd34e61dcab8be3c9e66f08554c08ab6932b2e6732462f20`
(`additional-controls.json`) and
`08e3443acb12891d7a37d5b01d37001b8c573053213e82f106edfe5b9387041a`
(`final-controls.json`). Targeted strict TypeScript success was reported by
the author; it is not independently executed evidence from this reviewer.

The frozen-before production identity above remains the comparison receipt.
During this source review, the current production file hash was
`87b9635e519f922490df0a31c68935641a76e6c068d4e4e50dbb7e81f070eeac`.
Parent confirmed this is the accepted PAD arithmetic cleanup, not an active
mutant. This loss verdict does not certify that separate production change or
reuse earlier campaigns as current-source acceptance. Repository application
must preserve the accepted scratch identities; registered mixed campaigns,
calibrations, mutation evidence and the final default current-source campaign
remain subsequent work. Clipboard and other retained source tests remain
retained until that acceptance.

### Final calibration delta and application identity

The semantic review's raw calibration-specificity finding is retained before
its repair in `../mixed-input-calibration-review.md`. Only the new
`redo loses chosen indentation source` calibration changed: it now substitutes
a distinct otherwise-valid six/seven-space prefix and adjusts the caret by
the prefix-length delta. It therefore challenges exact chosen-source redo,
rather than insufficient nesting. The five original calibrations are
unchanged. The inspected three-mode pure control receipt reports acceptance
of the alternative at the original indent relation and rejection at `step3`.
This strengthens the added calibration without losing an old distinction.

The final accepted entry SHA-256 is
`1a9285cf55b7acd4eee384e856ca3724250d62112331c300d06fb56f2fc9f6aa`;
the other six accepted hashes above are unchanged. The seven repository
sources were independently hashed after application and all match the final
review manifest and [`../mixed-input-relation/apply-manifest.json`](https://github.com/blygger/blygger-studio/blob/fb0b79dc0450e5f3d31a5a8f59c0b697b5cc5f6e/docs/editor-oracle-design/mixed-input-relation/apply-manifest.json).
Production still hashes to
`87b9635e519f922490df0a31c68935641a76e6c068d4e4e50dbb7e81f070eeac`.
The bounded source loss acceptance applies to this final applied identity.
Receiving-campaign acceptance remains separate.
