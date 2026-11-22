# Independent authority/design review: parent-marker padding

2026-11-18. Read-only source/design review requested by parent. No production, oracle, model, build, or repository edits; no browser or test jobs. This raw report precedes any proposed implementation. Read pinned `oracles-review`, `oracles-design`, checklist v1 and glossary. Reviewed current uncommitted source and documents, not an immutable release. Product failure execution is delegated to the separate browser/renderer reviewer; this report does not claim a runtime RED.

## LPD-1 — P2 confirmed enforcement gap: rendering histories silently fix parent padding to one space

**Claim:** `editor-list.oracle.test.ts:71` promises, “For every supported numbered or bullet parent, indenting its next item creates a real nested list containing the unchanged item content and returns a caret after it, without throwing.” Its limits enumerate flat parent/child pairs, one-to-nine-digit ordered markers, hyphen parents, all bullet children, both delimiters and twelve body letters. They do not narrow parent-marker padding to exactly one space. The opening prose cites the user's 2026-11-18 decision to use enough indentation for every supported numbered parent (`:17-24`), and the refactor preservation contract retains “wide-parent nesting” (`docs/editor-oracle-design/model.md`, P2), actual ancestry, unchanged content and no-code (P1/P5/P6).

**Source evidence:** `test-ui/editor-oracles/list-model-oracle.ts:185-189` has no parent-gap dimension. `nestingPlan` at `:225` emits `(parent marker) + ' a\n'` in every flat case. Thus `100.  a\n2. b`, for example, is not representable, although the parent marker is supported and its two-space gap is ordinary Markdown. The source geometry model also computes its indent from `parent.marker.length + 1` at `:144`, repeating the same marker-plus-one-space assumption as current production. Its concrete `parents` table only has one-space parent gaps, so its current examples cannot challenge this assumption either.

**Judgment:** True as an enforcement gap by direct source inspection. Widening valid parent-gap histories is **strengthening an adopted law**, not a new formatting law. The rendered ancestry model already knows the expected relation and requires no new expected-value branch. A second production-fix approval is unnecessary for that strengthening. Do not make the old one-space assumption authoritative merely because both exact-source model and production currently share it.

## LPD-2 — P2 causal hypothesis: marker width alone does not locate the parent's content column

**Standard/design basis:** CommonMark §5.2, List items (`https://spec.commonmark.org/0.31.2/#list-items`), uses a list marker of width W followed by N spaces, where 1 ≤ N ≤ 4, and uses W+N as the parent content indentation. Tabs are expanded to four-column stops. This source review cross-checked the installed independent renderer's implementation at `node_modules/markdown-it/lib/rules_block/list.mjs:185-218`: tabs advance by `4 - column % 4`, padding above four columns becomes one column with the remaining indentation forming code, and total list indentation includes the actual marker padding. This is source corroboration, not a copied expected-answer model.

**Concrete proposed distinguishing witness:** Parent `100.  a` has marker width4 and padding2, so its paragraph content starts at column6. A flat child indented only5 columns is not nested far enough. The current production expression `max(4, marker.length + 1)` and source model both choose5. A neighboring `100. a` parent starts content at5 and remains a passing case. The causal class is any same-depth supported parent whose actual content column exceeds the indent chosen using only marker width plus one; examples include `1.   a` (2+3), `99.  a` (3+2), `100.  a` (4+2), and a bullet parent `-    a` (1+4).

**Evidence status:** Standard and source read; runtime behavior must be confirmed by the separate probe, then RED in the strengthened registered oracle. Do not relabel this hypothesis as a run result.

## Smallest independent strengthening

Keep the current independent `nestingModel` tree unchanged. It should continue predicting the parent→child ancestry, exact parent/child text, tightness, no new code, and final caret. It does not need to choose any number of inserted spaces. This is a useful implementation freedom: any source satisfying the adopted rendered nesting and preservation laws may pass this property.

1. Add an optional `parentGap` input dimension to `Nest`/the flat arbitrary. Default undefined to one space, so every current history, old witness and shrinkable optional-field omission remains legal. First ensure literal one-, two-, three- and four-space gaps are possible. Construct the prefix from the chosen gap, never from observed production output.
2. Generate parent gap spelling independently from numeric marker width, child list kind, delimiter and body. Prefer a small **input recipe** for raw ASCII space/tab strings whose visual advance after the generated marker is 1–4 columns. The recipe expands tabs according to column stops; it is input construction, not a second indent formatter. An all-space recipe for each width is always available. Do not call production's list classifier or indentation helper.
3. Reuse the current browser `indentEdit` driver and full rendered ancestry observation. The unchanged tree model now compares the new histories against the same existing law. No branch saying “N spaces means add N more spaces” is needed in this rendering model.
4. Add semantic reach for padding values/spellings and for cases where padding changes whether the old marker-plus-one rule is sufficient. Keep every existing numeric-width boundary, original list case, fixed seed, budget and calibration. More random runs cannot replace the required constructed cases.
5. Run unchanged production through `oracle-gaps` first. The decisive RED must be a law violation at rendered nesting, not a setup/import/browser transport error. Then use the oracle to guide a production repair; author the old marker-plus-one rule as a mutant after GREEN.

### Valid gap representation

A compact typed representation could be `{ raw: string, columns: 1|2|3|4 }`, with `columns` calculated by the generator from marker-end column and the raw spelling rather than guessed or supplied independently. The plan carries the raw source and the declarative tree. The model needs only the tree. The `columns` annotation is solely for legal-input construction and reach; it must not be inferred from production output.

For the current flat pair, parent marker begins at column0. Ordered marker width is the generated decimal digit count plus its delimiter; a hyphen marker has width1. If leading-parent indentation is later included, tab expansion must start at `leadingColumns + markerWidth`, not marker width alone. This review does not silently claim that additional leading-indent dimension is already implemented.

The full finite raw-gap domain within 1–4 visual columns can be generated constructively: begin at marker-end column, append either a space (advance1) or a tab (advance to next multiple of4) while total advance stays at most4, and admit each nonempty prefix. There are only a few recipes. This includes tabs and mixed spellings without using a production regex, discarding generated histories, or fixing the gap independently of the marker's tab-stop phase.

### Controls and required witnesses (ORC-004/013/015)

Retain all current histories. Add at least these semantic regimes, with constructed examples whose names are not their entire reach definition:

- One/two/three/four-column parent padding, with literal spaces.
- Padding that stays within an ordinary four-space move versus padding that requires a wider move.
- Same marker, nearby passing and failing pad widths: `100. a` versus `100.  a`.
- Numeric width2 + padding3 (`1.   a`), width3 + padding2 (`99.  a`), width4 + padding2 (`100.  a`), maximum numeric width10 + padding4 (nine digits plus delimiter).
- Bullet marker + padding4, since `-    a` also exceeds ordinary four-space indentation.
- Tab-containing gap at all four marker-end column phases; ordered marker widths2,3,4,5 provide those phases. Include mixed space/tab spelling that expands to the same legal padding as an all-space sibling. The model should predict the same ancestry while preserving the different raw prefix.
- Both ordered delimiters and both numbered/bullet children remain independent dimensions. Child numbering restart remains observed via the returned source or existing source property; the rendering tree must not be used to justify changing that policy.

Nearby exclusion controls must distinguish **invalid histories for this paragraph-parent grammar** from invalid Markdown overall:

- No gap before the nonempty parent body (`100.a`) is not the scoped supported parent; constructive recipes cannot emit zero padding.
- More than four visual columns of gap can make the parent's first block code. That is valid Markdown but does not have the assumed tight paragraph parent. Do not feed it to the unchanged “no code anywhere” expected tree and then claim production is wrong. Keep it as an explicit grammar control and retain arbitrary-input totality coverage. Extending the rendering contract to parents that already contain code would need a separately represented parent subtree and law/limit review.
- A ten-digit ordered marker is not within the 1–9 digit supported marker domain; retain the existing nonlist/totality controls rather than generating it as a supported parent.

These controls explain why the new domain is the full legal 1–4-column paragraph-parent gap regime, not a filter added to make production pass.

## Source and mixed-model impact

**Rendering property:** This is the smallest repair and the most independent one: extend input construction/reach, leave expected ancestry alone. Keep the original existing-sublist branch untouched in the first strengthening; its gap1 fixture remains legal and covered. Extend that branch separately if a gap at either ancestor is later varied.

**Exact-source property:** Its existing one-space parent fixtures should remain byte-for-byte unchanged by a targeted production repair. No wholesale expectation rewrite is justified. `moveRows` has the relevant raw parent `gap` field but ignores it; if source histories begin varying parent gaps, this model must derive selection geometry from annotated visual columns and the chosen move policy, not copy production's newly revised scanner. For ordinary four-space cases the old exact outputs remain the same.

**Mixed model:** `mixed-model-oracle.ts` already parses and retains a parent's complete gap in `listRow`, then calls `moveRows`. Generated `type`/selection actions can create extra spaces even though the initial list scene uses one. Consequently a production repair for padded parents can expose model disagreements in mixed histories. Preserve them as design evidence, do not narrow actions or normalize away spaces. Use the same annotated content-column geometry when an exact move width is contractual; otherwise compare the permitted outcome projection rather than forcing an incidental replacement span. Every step must keep complete text/selection observations and undo/redo semantics.

**Exact move-width policy:** The accepted “enough indentation” rendered law allows several valid source indents. `max(4, W+N)` is a natural minimal extension of the ordinary four-space policy, but the rendering oracle need not prescribe it. If changing exact-source or mixed expected outputs requires selecting that canonical source width, state the policy explicitly from existing ordinary-level and enough-indent decisions. Do not silently turn “creates a real nested list” into “must insert exactly this many spaces” in the rendering law.

## Design grammar accounting

Trigger: an existing model/grammar is being changed, and the current source-model formula shares the suspected omission. Preservation relation is **named adopted laws** at returned edit/source/selection and rendered ancestry checkpoints; all old inputs remain legal. Model parts are marker kind/width, raw parent gap with independently derived visual advance, input body, child kind, and expected ancestry. Each part has the witnesses above. No production scanner is part of the expected answer.

The reduced form adds one input dimension and reach predicates; it adds no state or branch to rendered expectations. An alternative is a fully general annotated list-document model with arbitrary parent subtrees and code children, but that is larger than needed for this defect class. It must not replace the bounded tree with a second source-formatting implementation merely to make exact models agree.

## Verdict and evidence limits

**Source-ready strengthening proposal; not yet a runtime or gap-closure verdict.** LPD-1 is confirmed by source. LPD-2 is a standard-grounded causal prediction awaiting the separate real-path probe and registered RED. The proposed padding dimension is within the adopted law, so strengthen without re-asking it. Any extension to pre-existing code parents, a canonical move-width guarantee beyond current decisions, or new list continuation behavior is a distinct law question.

No test count, mutant kill, GREEN, browser receiving result, or zero-gap claim is made by this report.

## Reviewed source fingerprints

- `src/ui/format-shortcuts.ts`: `c4a34e5d1faa4c94df876f45577e3f173fc83267a4851c078f523406d5ccc967`
- `test-ui/editor-list.oracle.test.ts`: `5813bb32423a806cf1db2566bf40aeae43e5e237aecaf3f4fdf22edc95018fe9`
- `test-ui/editor-oracles/list-model-oracle.ts`: `0c1684ebb0f07080b7733c3faa3c6e96f8d181e5bf827519b81325af5eb0ee01`
- `test-ui/editor-oracles/mixed-model-oracle.ts`: `27804036eb5a13cc50c7ac6f43caeab4de026810c33adddcdfe91b518d574f30`
- `docs/editor-oracle-design/model.md`: `2e3ee40c76f05d7cda4977949bba39bf9f7ec0d38cbe5bbf85baba9c4f516928`
- `docs/editor-oracle-refactor-plan.md`: `1e99864f67da317748639b233ed8e775cfc3108af6945e24192ea4c683ec832e`

## Draft implementation receipt — 2026-11-19T07:32:39.684042+00:00

The independent matched-host probe is now confirmed in [list-parent-padding-review.md](list-parent-padding-review.md) and its saved JSON:40/60 inputs fail nesting. This supersedes the runtime-pending status of LPD-2 above while preserving that original raw design assessment. Registered oracle RED remains the next step.

A not-yet-applied draft is at `/private/tmp/blygger-list-padding-draft.XpPxsf/list-parent-padding.patch`. It changes only the nesting grammar/reach and renderer prose. The expected ancestry tree, driver/check, original/existing inputs, seeds,100-run budget, exact-source model and mixed actions are preserved. Optional child delimiters are required to reconstruct the probe's dot-numbered children under parenthesis parents. Optional field omissions retain original source spelling.

Test-free input-grammar inspection performed no production calls and registered no oracle tests. It verifies all16 existing constructed nesting histories unchanged,16 added histories admitted,60/60 probe texts exactly reconstructible, membership of200 sampled inputs, complete finite raw whitespace domains for marker widths1–10, zero/over-four/non-ASCII gap controls rejected by membership, and constructed reach for all new padding/tab-phase regimes. Existing arbitrary domain preservation follows structurally from retaining the original field domains/required keys while adding only optional fields and a new padded branch. A separate strict typecheck of the draft model passes. These are grammar/source receipts, not product GREEN, RED, mutant kills or zero-gap evidence.

Finite-domain inspection uses a different tab formulation (`next multiple of4`) from the constructive recipe (`4 - column modulo4`), enumerating every space/tab string of length1–4. Such strings exhaust a positive visual advance of at most4 because each token advances at least one column. The semantic renderer model remains unchanged and imposes no exact indentation count.

The original-width-only mutant plan is saved for use only after registered GREEN. It records the current source hash/expression and intended behavioral rollback without assuming a future repair's find text. Production/source-model/mixed-model repairs remain separate and oracle-first.

- Draft `list-parent-padding.patch` SHA-256: `fe59e584f16078e6768b74cf2abb61d5b0331b979e9b7348d65b565c446a5722`.
- Draft `base-manifest.json` SHA-256: `3058b26ad5e4f7426bbc6b4da2708fe33406eb927002043f6cb65d31506ba30c`.
- Draft `grammar-inspection.json` SHA-256: `5bce265d3e6b94570a11235fa09682151851a989be79a07e6b9a455c9aa728fa`.
- Draft `original-width-mutant-plan.json` SHA-256: `0e81361a0ac638d68daa13e18042c800c46afafe9989eece0d0fcf70d223a971`.

## Raw draft review before repair

**LPD-DRAFT-1 — inverse candidate validation.** Independent reviewer `/root/review_formatting_coverage` found that the draft map inverse computes marker width before validating the non-gap fields. A malformed membership candidate such as `{parentGap:' '}` can reach a NaN tab advance and recursive recipe construction instead of rejecting. The proposed repair is to validate the stripped base candidate with the original flat arbitrary before marker/recipe lookup, then add malformed membership controls to the test-free draft inspection. This is a draft grammar defect, not a production counterexample or an oracle law rejection. The original source finding is preserved here before the repair.

**LPD-DRAFT-2 — browser prose.** The same review notes that the touched opening block still calls keyboard/undo checks “Playwright drivers”, whereas this session now uses keyboard and real-browser oracles. Clarify the wording without changing any law, observation or runtime route.
