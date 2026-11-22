# List oracle review and flat-peer repair evidence

The complete list oracle passes twice after the reviewed flat-peer repair. It also rejects five plausible wrong repairs at the intended rendered-result comparison. Actual editor validation passes twice for all 256 selected sibling/container/flat-range histories across toolbar, Tab/Shift+Tab, desktop/mobile and native/fallback, plus 18 bound calibrations.

This record covers the bounded flat-peer contract. The complete mixed campaign, complete owned-code gap sweep, other review findings and the selected-subtree decision remain open. The zero gaps reported by these two explicitly selected mutation runs is not a full gap-closure claim.

## Source and authority

The checkout base is `764cb40d15b8062dad70032f262807f4472ec962`. Modified reviewed source is bound by content, rather than attributed to that unchanged base commit:

| File | SHA256 |
| --- | --- |
| Production before repair, `src/ui/format-shortcuts.ts` | `87b9635e519f922490df0a31c68935641a76e6c068d4e4e50dbb7e81f070eeac` |
| Reviewed flat-peer repair, same file | `01fbdcd4a2d7d0582cf91ccbb0374c6aefae5fdf5b14c529e8d21ea92fcd8b84` |
| `test-ui/editor-list.oracle.test.ts` | `349ba9ddf59945f3f32793d5b3f5efd0076606ba55775d054078b36daf7255d9` |
| `test-ui/editor-oracles/list-model-oracle.ts` | `59acc0dd484822262b114c578002eee579e5724368fb49c20d1c7a6f23968edc` |
| Integrated mixed model, 325 constructions | `37c90c0e765a8ee59da283f5517557a726ca08091c933729761ad4f94526a215` |
| Integrated mixed entry | `873b23b0b0959d0e59b397d92620961454ad17db405f7b256348d8b59f7668ba` |
| Native-event mixed driver | `b091670fd3e0d6050d42a8b3f2af2ffc5eac60e984b08de743617027bdecc6e4` |

The adopted laws come from `indentEdit`/`lineSpan` comments, the previous formatting tests at `28b0c8d642a87e5810ad6eabd95c2d1714c53396`, and Kyle Mathews' (`KyleAMathews`) 2026-11-18 decision to preserve whole-line list movement and use enough indentation for supported 1–9 digit numbered parents. Each selected flat semantic peer must remain a separate item under its preceding sibling; marker, gap, body, outside source and whole-range selection survive. Four spaces remain the ordinary level. Extraordinary sufficient leading whitespace has no promised spelling. A one-container-shallower continuation must keep its existing peer behavior.

Production classification uses MarkdownIt container identity. The independent rendered model predicts ancestry from constructive input roles, then observes the actual parsed result. MarkdownIt is a declared trusted parser, not a conformance claim about every Markdown document. The source model preserves exact ordinary source/caret promises; the mixed allowed relation checks complete chosen source and subsequent input/undo/redo continuity.

## Review findings

| ID | Distinguishing legal source/history | Finding and response |
| --- | --- | --- |
| PROD-001 / CM-1 | `-\n\t100. a\n    - b` | Raw-prefix equality misses semantic siblings. Tab's four spaces leave the child below the parent's content floor. Added independent raw-prefix/container axes. |
| SIB-001 | `-\n\t100. a\n   - b` | Equal visual columns are also too narrow. Preserved the opposite shallow-container control `1. a\n    1. b\n2. c`. |
| SIB-RANGE-001 | `-\n    100. a\n    - b\n\t- c`, selecting both peers | Protecting only the first selected row loses later peers. Added two–four independent selected prefixes/bodies, whole-range observations and initial-peer premises. |
| SIB-RANGE-002 | `-\n    999999. a\n   \t- b\n   - c`, selecting both peers | No tested uniform prepend width 4–32 produces the promised tree. A uniform parameter was a model restriction, not an adopted law. |
| SIB-RANGE-003 | `-\n    9999999. a\n\t - b\n\t- c`, selecting both peers | No tested independent prepend-width pair 4–24 produces the promised tree. Permit final leading whitespace while preserving marker/gap/body/outside bytes and ancestry. |
| RX-TAB-001 | Native Tab target listener followed by a microtask before React's ancestor listener | Copying `defaultPrevented` in that microtask can record false consumption. Retain the actual event, then project its fields after awaited `keyboard.press`. Before/after extracted-listener controls and actual browser receipts distinguish this oracle defect. |
| RX-TAB-002 | Shortcut-only indent histories with ignored click/Enter/Space fields | Reach incorrectly counted toolbar activation that the driver never performed. Gate activation reach with `!shortcutKey(action)`. Toolbar neighbors retain activation; all 305 then-existing histories/previews and original 164 state arrays survive unchanged. |

No production edit preceded the extended unchanged-production REDs. The evaluator subsequently added the five authored mutants and evidence files, and made no production repair itself.

## RED, GREEN and hostile designs

All runs use `@tanstack/oracles@97a4e7a`, Node 24.19.0, the package-matched Chromium 1248 and fixed seed 20261118. The list and mixed property budgets remain 100 and 25. No history was removed to obtain these results.

| Run | Production / scope | Result |
| --- | --- | --- |
| `267b667d5980` | Unchanged source, complete extended list file | 645 PASS / 104 RED / 0 skipped |
| `c0d8574d6fb1` | Unchanged source, three exact range witnesses | 0 PASS / 3 RED / 746 outside selection; initial-peer premises pass, intended `rendered list nesting` / `result` rejects |
| `55ce2064eb99` | Unchanged source, exact toolbar range receiving witnesses | 1 PASS / 4 RED / 565 outside selection; intended `mixed browser editing history` / `step2.state` rejects |
| `c89bd78c8ff7` | Unchanged source, eight exact native Tab histories | 4 PASS / 4 RED / 988 outside selection; actual trusted focused Tab/Shift+Tab receipts retained |
| `1a8c8509a2d2` | Reviewed repair, complete list file | 749 PASS / 0 RED / 0 skipped in both complete baseline passes; 0 nondeterministic; all four bound calibrations pass twice |
| `a9059e9524d2` | Reviewed repair, actual editor receiving | 274 PASS / 0 RED / 789 outside selection in both baseline passes; 0 nondeterministic; 256 selected constructions plus 18 bound calibrations |

The receiving constructions contain 128 toolbar and 128 Tab/Shift+Tab histories. Each of the four actual viewport/native-fallback profiles contributes 64 constructions. All 256 native key receipts preserve the trusted textarea target, focused resolved selection, exact modifiers and final default prevention. Both receiving baseline runs pass every selected registration; this is stronger than a test label or a construction preview.

The core run selects exactly these five authored mutants. Every kill is a registered `editor-list-rendering` assertion at law `rendered list nesting`, checkpoint `result`:

| Hostile design | Registered distinguishing construction |
| --- | --- |
| `review-list-original-raw-prefix` | `siblings-empty-tabToSpaces-100` |
| `review-list-equal-visual-only` | `siblings-empty-childColumnBelow-99` |
| `review-list-uniform-prepend` | `range-empty-100-spaces-mixed` |
| `review-list-first-row-only` | `range-empty-100-spaces-tab` |
| `review-list-independent-prepend-only` | `range-empty-100-spaces-tab` |

The receiving run additionally kills the raw-prefix criterion through actual toolbar construction `siblings-empty-tab-spaces-false-false`, law `mixed browser editing history`, `step1.state`. Its roughly 60 seconds include shrinking; the retained failure is an intended assertion, not a timeout. None of the six reported kills is a setup failure, unrelated runtime error, unreached path or survivor.

## Evidence and reproduction

[list-review-execution.json](list-review-execution.json) retains source/config/result/raw-capture bindings, both completed baseline records, calibration outcomes, exact native pre-repair witnesses, the oracle-harness controls and intended mutation failures. [list-review-receiving-receipts.jsonl](list-review-receiving-receipts.jsonl) contains 256 compact actual receiving receipts: exact history fingerprints, profile, command input/output and native key receipts. Full trace and expected-relation fingerprints bind the larger scratch captures. Include these records with the final reviewed source commit.

The core gate can be replayed against these source hashes with the normal registered runner:

```sh
npm run test:formatting -- --oracle list --only authored:review-list-original-raw-prefix,authored:review-list-equal-visual-only,authored:review-list-uniform-prepend,authored:review-list-first-row-only,authored:review-list-independent-prepend-only
```

The receiving diagnostic uses the unchanged registered mixed property, selecting `^editor-browser-mixed(?: | > )(?:fixed seed 20261118: (?:siblings-|container-|peer-range-).*|calibration: .*)$` through a temporary Vitest config, plus `--only authored:review-list-original-raw-prefix`. Its immutable source adapter and complete command hashes are retained in the execution record. This explicit diagnostic selection is not the full mixed campaign.

Evidence limits are retained rather than converted into passes. The initial native recorder-race attempt has zero production RED credit. The later correct native RED watcher preserved seven raw registration rows; the final mobile/native003 raw row was removed by CLI cleanup before its next copy. Its FAIL is uniquely bound by the completed 4 FAIL / 4 PASS aggregate minus the seven direct rows, and its exact unshrunk source-law violation plus both trusted key receipts remain directly retained. The GREEN/mutant watcher instead retains capture inodes by hard link; all final rows and closing metadata survive there. All 21 required disk inputs remained unchanged across each GREEN/mutation run. Temporary configs were removed after completion; their exact contents and hashes remain in scratch evidence.

## Checklist outcome for this bounded review

| Checklist v1 | Outcome / evidence |
| --- | --- |
| ORC-001 | Adopted whole-line/sufficient-indent authority and whitespace freedom traced above; subtree interpretation remains open. |
| ORC-002 | Constructive rows and expected ancestry are independent of production helpers; actual output parsing is observation. Shared MarkdownIt is a declared trusted parser. |
| ORC-003 | Laws, limits, histories, models, drivers and checks remain separate in the entry/companion files; prose records flat-peer scope and native receiving. |
| ORC-004 | Old 84 source and 49 rendering inputs/predictions survive. Extended rendering has 161 constructions; 5,161 constructed/sample grammar controls had no membership, body or initial-ancestry failure. Raw prefixes, peer count/body, container role and tab phase each have a distinguishing contribution. No filter or narrowed prior grammar was introduced. |
| ORC-005 | Browser `indentEdit` and actual React toolbar/Tab paths record complete source/range at their promised result/step checkpoints. Exact native profile and delivery receipts are included. |
| ORC-006 | Four list and eighteen mixed bound calibrations pass twice. Five core and one actual-toolbar hostile-design kills are classified as intended assertion failures. |
| ORC-007 | The complete list registration includes its fixed/random/replay routes with unchanged budget. Mixed receiving is explicitly a selected diagnostic; complete mixed acceptance remains outstanding. |
| ORC-008 | No prior state was removed. Later type/outdent/undo/redo distinguishes chosen sufficient whitespace; the allowed relation binds the whole chosen source through subsequent public inputs. |
| ORC-009 | Model rows map marker/gap/body/indent to source; declarative item ancestry maps to rendered items. Shortcut `via` maps to actual Tab dispatch; toolbar activation reach is separately gated. |
| ORC-010 | Original law/checkpoint and cleanup distinctions are retained. The preliminary recorder error and one missing raw RED row are explicitly capped; complete GREEN captures retain closing metadata. All local jobs completed and released their browser/application resources. |
| ORC-011 | Exact source/selection and declaratively expected rendered ancestry are different formulations. The parser is trusted; this review does not establish arbitrary-parser or arbitrary-Markdown correctness. |
| ORC-012 | This repository record binds decisive findings, results, source hashes, calibration/kill classifications and remaining work. It must accompany the final reviewed source commit. |
| ORC-013 | Raw-equality, equal-column, uniform-prefix, first-row-only and prepend-only rivals are rejected; narrow99 and shallower-container neighbors remain protected. |
| ORC-014 | Actual browser/native key and native editing premises are witnessed alongside forced fallback. No physical-keyboard, OS clipboard or other browser-engine claim is made by this diagnostic. |
| ORC-015 | Complete list declared constructions pass. Selected receiving reach is measured from all 256 exact actual histories; native reach requires trusted trace receipts. This does not claim every state of the complete mixed325 campaign. |
| ORC-016 | Production evidence uses registered `oracleProperty` routes. Named regressions are inputs to the same model/driver/check. Scratch grammar/control probes are not presented as registered kills. |

Every checklist trigger applies to at least one changed/claimed part of this bounded review; none is marked not applicable. This self-review does not replace the independent source/authority reviews or the root's final acceptance.

## Still open

SIB-RANGE-004 is a product interpretation awaiting Kyle's decision. Source `-\n    100. a\n    - b\n\t  - c`, selected range `[13,27]`, initially has b ancestry `[0]` and c `[0,2]`. The current flat repair produces b `[0,1]`, c `[0,1]`; preserving c's subtree would instead require `[0,1,2]`. No subtree law, generator narrowing or production change was adopted silently.

Complete mixed325 acceptance awaits the shared-host picker-premise diagnosis and any resulting approved work. Full owned-code gap closure and other open findings remain with the root review. These results support the bounded flat-peer repair; they do not establish full code-formatting replacement readiness.
