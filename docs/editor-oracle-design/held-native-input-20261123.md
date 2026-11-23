# Shown read-only native input: repair and oracle expansion

This record accompanies the held-region repair over parent commit `2a3e6dee42b46f34ff3312adb869161d061750b7`. The source hashes below identify the reviewed and executed production/model/driver/fixture bytes. It records a bounded Chromium campaign, not complete editor mutation acceptance or a browser Undo repair.

The subsequent main integration preserves the guard from `5af5716` while merging `ed245f45bcb94b6367cdc8c1a104ecb300bd5508`. Its only manual conflict was adjacent imports: both `MarksLayer` and `touchesRange` remain. The complete `useHeldOut` function text and the other five listed source files are byte-identical to the reviewed repair; native-event forwarding remains intact. Integrated `authoring.tsx` SHA-256 is `9a123f8c4482e77febd55898e495239add802b1fee698eac56b047df50dbe134`. Build, all three TypeScript configurations, scoped lint and migration inventory passed after this merge. Browser revalidation and cold CI were still pending at the integration commit. The executed source table below remains the original reviewed snapshot.

The adopted rule comes from `docs/extensions.md`, Editor regions: the draft stays whole, shown regions are read-only with feedback, exact-edge typing accepts, and replacement surrounding a hidden cut places the region after the replacement. Kyle Mathews (GitHub KyleAMathews) expanded the oracle's domain on 2026-11-22 to caret typing, deletion/cut and normalized extension ranges. Empty/reversed/outside raw ranges protect no text; overlapping/touching ranges protect their union and merge feedback labels. Enter/Shift+Enter retain main's ordinary LF behavior.

For `x\n\n[held]: # x\n\nz\n`, the protected interval is `[1,14)`. Replacing `[13,18)` with `x` must refuse, even though the replacement repeats the last protected byte. Inserting `x` at caret 13 must also refuse; insertion at 14 accepts. Delete at the protected start and Backspace at its end remove protected characters and refuse; those positions accept insertion. Enter at the protected start must accept despite the adjacent matching newlines.

The initial selected-range guard passed its terminal domain but missed collapsed insertions and consumed raw ranges. The expanded browser oracle exposed those defects, merged-label errors, and false refusal of exact-start LF. The repaired guard shares normalized range overlap with the post-change guard. It judges offered insertions before matching bytes erase intent and associates allowed known insertions with their actual InputEvent, exact before/after source, input type and data. It checks final beforeinput cancellation, consumes receipts once, and keeps refs stable across React renders. Missing/mismatched receipts, deletion/cut and tools retain the post-change guard. Browser history remains native.

## Model design and loss audit

Changing the existing model triggered design grammar. The reduced model predicts one plain native replacement from independent source segments and the offered range. The previous general mixed model also carried Undo/history state, which this one-operation law does not use. An alternative keeps that model and adds a second deletion model, at the cost of duplicated native semantics. No scheduling state was added to the model.

The preservation relation keeps initial hidden source, offered range, continuity/delivery/intent, trusted unprevented keys, immediate source, accepted caret, focus, read-only feedback, completed clicked Save, exact stored full source and errors. The action receipt now represents the requested key/range directly; accepted typed-key receipt checking is stronger. Refused caret geometry remains free. All 33 old constructed names and inputs, five calibrations, runs 25 and fixed seed 20261118 remain; 71 constructions extend the total to 104. The new grammar admits all 104, and every offered range is ordered and in bounds. Its nearby invalid empty held word remains rejected.

The author's 2,033-history legacy comparison and independent reviewer's 3,033-history comparison found zero differences in range/full source/notice/refusal or accepted source/caret predictions. The independent sample used seed 20261123. These sampled comparisons do not prove exhaustive equivalence. The model reads neither production scanner output nor normalization. A test-only adapter calls the real scanner and supplies equivalent raw layouts; unconfigured pages use the real scanner unchanged. Its initial hidden-source comparison remains an independent check on scanner extent.

## Execution

- Original terminal RED: `06126c48d3e2`, 100 passed / 9 failed / 0 skipped.
- Initial terminal candidate GREEN: `d01b50008a5f`, 109 registrations twice, zero nondeterminism, original-defect control rejected. This did not close the later review findings.
- Expanded RED: `a90467fe4e4d` in `red-expanded`, 24 failures / 289 registrations on the unchanged initial candidate, zero nondeterminism. Mutations were correctly blocked. Failures included caret collision, empty annotation refusal, merged feedback and exact-start LF.
- Reversed-range RED: the separately selected `shown-reversed-suffix-range-typed` replay failed 1/1 at `step0.state` before production repair. Its earlier missing-PATH invocation was a setup failure, not RED. Report IDs can repeat across different executions; directories distinguish them.
- The first expanded GREEN attempt was deliberately stopped to correct a TypeScript DOM-listener annotation. It is not acceptance evidence.
- Final GREEN: `78a3b9353c67`, 322 registrations in each of two complete contexts, zero failures/skips/nondeterminism; five selected authored mutations killed, zero selected gaps, provisional=false. Both passes were fresh (computed 7, reused 0 across baselines and mutations). Baseline times were 229.1s and 240.3s; mutation phase 69.6s. This selected campaign does not establish full-portfolio mutation acceptance.

The complete final command uses no property/unit/path selection and keeps the original invocation seed:

```sh
npm run test:formatting -- --oracle held-newline --seed -1936582192 \
  --only authored:shown-native-selection-guard-removed,authored:accept-shown-native-newline,authored:shown-native-insertion-receipt-ignored,authored:shown-native-raw-ranges,authored:shown-native-caret-collision
```

| Mutation | First constructed witness | Law / difference | Classification |
| --- | --- | --- | --- |
| `authored:accept-shown-native-newline` | `shown-terminal-Backspace` | native newline held-region receiving / `step0.readonly source` | assertion failure |
| `authored:shown-native-caret-collision` | `shown-caret-tail-Enter` | native newline held-region receiving / `step0.readonly source` | assertion failure |
| `authored:shown-native-insertion-receipt-ignored` | `shown-caret-start-Enter` | native newline held-region receiving / `step0.state` | assertion failure |
| `authored:shown-native-raw-ranges` | `shown-empty-outside-range-typed` | native newline held-region receiving / `step0.state` | assertion failure |
| `authored:shown-native-selection-guard-removed` | `rejected-matching-tail-x-false` | native newline held-region receiving / `step0.readonly source` | assertion failure |

Actual reach in the first fixed-seed constructed campaign (104 histories, excluding generated repetitions and later mutation runs):

| State | Histories |
| --- | --- |
| `Backspace` | 9 |
| `ControlOrMeta+x` | 9 |
| `Delete` | 11 |
| `Enter` | 18 |
| `Shift+Enter` | 18 |
| `caret-after` | 5 |
| `caret-before` | 5 |
| `caret-end` | 5 |
| `caret-start` | 5 |
| `caret-tail` | 11 |
| `desktop` | 80 |
| `edge` | 11 |
| `hidden` | 11 |
| `inside-range` | 13 |
| `layout-empty` | 4 |
| `layout-ordinary` | 49 |
| `layout-outside` | 4 |
| `layout-overlap` | 5 |
| `layout-reversed` | 4 |
| `layout-touching` | 5 |
| `mobile` | 24 |
| `outside-range` | 11 |
| `rejected` | 11 |
| `shown` | 71 |
| `suffix-range` | 11 |
| `terminal` | 5 |
| `typed` | 39 |
| `typed-matching-held-tail` | 36 |

The actual native delete/cut input receipts reach the retained late path; insertion refusals reach the early path. Every history also judges the immediate full-editor source and the exact saved draft after a trusted clicked Save's busy lifecycle. Native receipts retain temporary source/caret before React restores a refusal, without requiring a fixed event count.

## Review and checklist v1

Independent review reconstructed the caret-13/14 distinction from the contract, read the current source, compared the legacy models and audited the controlled fixture. It found no further confirmed source defect. R1 raw normalization, R2 collapsed insertion, R3 current GREEN/original control, R4 separate late-path receiving, R5 versioned evidence, R6 exact-start LF and R7 reversed-range witness are resolved by the final comparisons and controls above. R8 was a proposed microtask-lifetime risk; no such cleanup was adopted. Event-loop and canceled-offer challenges led to event identity, final cancellation checks, stable refs and exact source matching. No current failing history was found for that design.

| Requirement | Outcome |
| --- | --- |
| ORC-001 | Adopted authority, domain and limits appear in the law block and registration. |
| ORC-002 | Independent segment/interval model; no production semantic imports. |
| ORC-003 | Prose, plan, model, grammar, driver and checkpoint comparisons change together. |
| ORC-004 | All old constructions retained; boundary/action/layout axes distinguish the new cases; bounds and invalid empty word are explicit. |
| ORC-005 | Actual compiled scanner, React, native key/input, immediate DOM source and complete stored Save source. |
| ORC-006 | Five retained calibrations and five separately classified assertion controls above. No setup failure/timeout counts as a kill. |
| ORC-007 | Fixed/random registrations and budget retained with direct replay. The suite's existing seeded-wrapper limitation for literal unseeded execution remains in the suite guide. |
| ORC-008 | Single-operation replacement removes unused mixed Undo/history state; bounded preservation comparisons retain the promised observations. |
| ORC-009 | Offered range, protected interval, native operation and raw layout map to named receiving concepts; old recipe names remain compatible. |
| ORC-010 | Raw observations retained outside the judged trace; settings/browser cleanup retains original failures and separate cleanup errors. |
| ORC-011 | No current named shared semantic fault triggers another formulation: independent intent model and actual scanner/receiver challenge the production inferred diff. |
| ORC-012 | This versioned record binds source hashes, findings, dispositions and runtime evidence. No whole-editor gap-free claim. |
| ORC-013 | Interior/exact-edge insertions, removal at edges and editable suffix neighbors distinguish plausible wrong rules. |
| ORC-014 | Controlled equivalent raw layouts reach the actual extension/native/React boundary; arbitrary parser and physical-device claims are excluded. |
| ORC-015 | All 104 constructions retain required states; actual reach counts above. |
| ORC-016 | Only oracleProperty registrations; all fixed constructions share the same model, driver and check. |

Final independent review accepted this bounded repair after inspecting the report, all six source hashes, each mutation witness, all 28 reach counts and actual Delete/Cut restoration plus Save. Its acceptance record SHA-256 is `d07565e656c505793b0d688e0dbe0879c2cfbc5a83e74e9c3108a9f06a91eae9`. The separate worker CI failure remains outside that acceptance.

The reviewer supplied two concrete source defects and two useful evidence gaps; later review also caught the weak reversed witness. Those findings were accurate and led to broader receiving coverage. The proposed fixes were useful, with real event delivery needed to settle receipt lifetime. This is strong review work within its stated source/loss scope. The author evaluated all items against final source and execution; the raw review and append-only ledger remain in task-local scratch.

The production build, lint, all three TypeScript configurations, migration inventory and diff whitespace checks pass. Migration inventory remains structural accounting, not a semantic equivalence proof. The separate worker CI instability is not repaired by this browser change: its eight Ubuntu trace differences did not reproduce on the exact CI merge snapshot on Darwin. The gate now prints unstable test names on failure so the next CI run can identify them; it retains the same determinism checks.

## Limits

One held paragraph, one native key, one immediate Save, bounded equivalent raw layouts, safe nonempty Unicode segment words up to eight code points and small/desktop viewports. No multi-operation stale-receipt proof, physical IME/device, clipboard payload, arbitrary scanner/clamping-layout union, browser-owned Undo/Redo, or complete mutation-portfolio claim. Compose/Retry and proposed editor features remain separate. The next cold Linux CI run must validate the published source and integration snapshot.

## Executed source SHA-256

| File | SHA-256 |
| --- | --- |
| `src/ui/authoring.tsx` | `2d9e455c17d46f6088c80f802674a4452c768f57dcb6f2a57c9193de27af0a1d` |
| `src/ui/editor-regions.ts` | `b5b92e624d91005164136454889a9d23ec9ef95cd0ef461a68f3b28fa400de8e` |
| `test-ui/editor-held-newline.oracle.test.ts` | `8efcd5a7a3d72953a89c5c3644be23c12cebefa08f212f5171d4b0a4aeb26f01` |
| `test-ui/editor-oracles/held-newline-model-oracle.ts` | `7dc91ccdab0678343b0521b21b8cb70a9676061d7883a2f79d11296330b8f327` |
| `test-ui/editor-oracles/held-newline-driver-oracle.ts` | `a13a4cd4091d725f1ba18cd10895835f58e5c6cda2b8dfbee161def318b5b293` |
| `test-ui/editor-oracles/fixtures/extensions.ui-oracle.ts` | `b5b9bc4500b78f53277359e0be4147af01ea8bdb9c4c3369eb92dae0137872a0` |
