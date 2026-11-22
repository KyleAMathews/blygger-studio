# Independent review of the executed-baseline guard

**Accepted for coordinated integration application and composition with frozen Linux isolation v3. No source blocker found.** This review covers the wrapper's report validation and failure handling, not product-law closure, native process isolation, performance, or CI adoption. Reviewed 2026-11-19 using the installed `oracles-review` skill, checklist v1, glossary, and `@tanstack/oracles@97a4e7a`.

The reviewed integration base is HEAD `2d153071e83261e62be5a1ec926c3f1f3e2fe26a` plus its recorded uncommitted oracle delta. The immutable proposal is `/private/tmp/blygger-empty-baseline-guard.9w3xb80l`. No production, oracle, runtime, package, test, CI or immutable proposal input was edited. No browser, container, build, test runner, CLI check, gap check, benchmark or daemon ran for this review. All 402 original frozen campaign input hashes still match.

## Exact accepted inputs

| Input | SHA-256 |
| --- | --- |
| `integration.patch` | `93175bb321713ae3e6bcc9416d7b01143ceb5517d2baf173f42147a9c5919987` |
| `v3-overlay.patch` | `099448283683541f43d0e73c3a3a5e96e1147de37b6f8efff07c050e4687214c` |
| `manifest.json` | `8adae8aeea7158d92fb827c7e4b814256b37b476d2b5e7cd69568e2111bf1210` |
| `proposal.md` | `65fb047a51f8cdd3e23b3632cf6a543f472f7bdfd1cf02cb92a8ab4c968c390d` |
| Integration wrapper before | `978cdd0fe4c3581cd85fd2804c8b0212146ba5b5b54f1d8a37a422fa97ff6563` |
| Integration wrapper after | `69c99fa329c2c516cfa06ad239c55b1fe855fadcb7eb31c7f67f883fdf7b3e32` |
| Isolation v3 wrapper before | `877b548fb9fb95942b43c5940320af0358a3031d89bb7c1e656a4fcaae2ea7a1` |
| Isolation v3 plus guard wrapper | `04272ac43c31a9ad2fc227014e8f85c95a5ba3fcbde9410b6555a7742a189728` |

The two patches have **alternative bases**. Apply the integration patch to its recorded wrapper, or apply isolation v3 and then the v3 overlay. Do not stack both guard patches. V3's separate source acceptance and outstanding native lifecycle gates remain in `ci-browser-isolation-review.md`.

## Rebuilt observation and supported conclusion

The wrapper promises that a successful oracle invocation actually executed an oracle baseline. Independently of product formatting, a completed report with no baseline cannot establish that promise. The saved integration report `cae918bc8af5` has `provisional:false`, `baseline:[]`, `nondeterministic:[]`, and `results:[]`. The original wrapper accepts that shape after child exit zero because the failure scan over an empty array is false. The candidate rejects it before the original status scan. This is a report/setup failure, never a law rejection or mutant kill.

The guard requires a nonempty baseline, validates every row's file/ordinary flag and nonnegative safe-integer counters, requires at least one nonordinary row, and requires positive `passed + failed` for every nonordinary row. An ordinary success or another oracle cannot mask an empty or all-skipped oracle. A failed oracle test counts as execution and then fails through the unchanged original all-baseline failure scan. A positive execution with replay skips remains valid.

The effective selector is `selected ?? process.env.FORMATTING_ORACLE_FILE`: explicit `--oracle` keeps precedence. The exact selected file must be a nonordinary baseline row. A legitimate partial owner run remains valid; the guard invents no filesystem-wide required-file set. Mutation suffix copies marked skipped are mutation units, not empty baseline rows.

I read the pinned `check.mjs` baseline construction: rows summarize each selected file's first unmutated pass, and `ordinary:false` comes from static oracle declarations. These counters establish execution in declared oracle files. They do not independently prove that every test took a registered law route. Existing capture and loss audits retain that responsibility.

## Independent lightweight evidence

Reviewer scratch is `/private/tmp/blygger-empty-guard-review.qDwbSe`. `review.mjs` hashes to `f09e9ea21e7e6bd23c1f711d179d77c61e3d59dd31a276d52c48e50e0de54f52`; `review-output.json` hashes to `b8cc29c4d73dcbbd4680f2b0271a1beaacc4ce1dd1a094a4441753be27cb23ff`.

All **24 independent observations passed**, evaluating the exact extracted guard and exact original status expression in a VM. No wrapper, browser, product module or CLI check ran. They cover identical integration/v3 guards, unchanged status expression, five frozen actual reports, malformed/missing/ordinary-only/zero/all-skipped baselines, masking by another row, selected mismatch, missing counters/ordinary flags, retained ordinary failures, positive replay skips, partial-owner scope, and a valid baseline with no mutant results.

| Real report | Executed baseline | Original / candidate result |
| --- | --- | --- |
| `cae918bc8af5`, empty session | No rows | Success / reject setup |
| `044c396855dc`, session fence | 138 passed | Success / success |
| `01c99960f7cf`, code-block fence | 315 passed | Success / success |
| `e6e5302eba7c`, workflow RED | 0 passed, 1 failed, 160 skipped | Failure / failure |
| `910ed1b7e0ee`, nondeterministic workflow | 8 passed, 153 skipped | Failure / failure |
| Independent receiver replay | 1 passed, 215 skipped | Success / success |

The receiver replay is the existing `build/formatting-oracles/receiver-mention-summary-replay/results.json`, SHA-256 `6cca1b8c0df928eb8ab832ae2b8ee99677feb407d2c25ab79a59839f1f0892f7`. Both original first/repeat capture projections contain 14 files and 4,367 executions and pass the guard. All 28 raw capture hashes were independently reverified. These are capture-count projections, not an invented completed report. In total, 31 proposal/artifact/source bindings and all 402 frozen runtime hashes matched.

The author's **68** full-wrapper/actual-report controls were read, with their receipt inspected; they are not reviewer executions. They use mocked application/browser/child handles to check the exact original and candidate integration/v3 wrappers. The **62** original isolation-v3 controls also pass with the overlay. Their scratch successful-row fixture was corrected to the actual complete baseline schema; assertions were not weakened and original v3 artifacts remain unchanged. Strict isolated guard typechecking and wrapper transpilation receipts show zero diagnostics; full integration semantic checking remains a parent gate.

## Failure fidelity and v3 composition

The provisional/failed/nondeterministic expression is unchanged. Child exits 2, 3, 130 and 143 retain their status without reading a report; null/signal exit retains the existing fallback. Read and spawn failures still close acquired resources. Guard failures enter the existing failure/cleanup path, and cleanup aggregation retains the original cause and distinct errors.

In the v3 composition, report bytes are still captured only after child exit zero, before JSON parsing and guard validation. Guard failure reaches finalization with those same bytes. Finalization never rereads a competing report. Fresh-output ownership, cold parser guard, nonzero-child report exclusion, source fingerprints and external topology attribution remain intact. No law, history, model, construction, comparison, calibration, source scope, seed or budget changed.

## Checklist outcome and limits

| Requirement, checklist v1 | Outcome for this harness-only change |
| --- | --- |
| ORC-001, ORC-004, ORC-007, ORC-008, ORC-009, ORC-013, ORC-015, ORC-016 | Their change triggers do not apply: no expected product answer, generated grammar, campaign, model state/vocabulary, product boundary law, declared reach or oracle registration is introduced or changed. Existing oracle obligations remain unchanged. |
| ORC-002 / ORC-003 | No semantic machinery enters a model/check; existing oracle responsibilities remain separate. The wrapper helper is report validation and is identified as such. |
| ORC-005 | Actual report bytes and static baseline construction were inspected. The guard establishes positive execution in declared oracle files; registered route proof remains separate. No product receiving claim follows. |
| ORC-006 | Real empty-report and nearby zero/all-skipped/masking controls distinguish the faulty success gate. These are harness controls, not registered kills or product closure evidence. |
| ORC-010 | Exact status gate and source cleanup/finalization behavior are retained; independent pure checks plus authored full-wrapper mocks support failure fidelity. No new real resource-release conclusion follows. |
| ORC-011 | No alternative product formulation is triggered. Exact actual reports challenge the guard independently of the author's synthetic successful fixture. |
| ORC-012 | This versioned record binds the accepted exact inputs, source/control results and remaining limits to the recorded integration base. No whole-corpus audit or bug-class closure is claimed. |
| ORC-014 | Mocked handles support only control flow. They supply no native browser/provider premise and are not cited as real-host behavior. Real receiving/lifecycle gates remain open. |

The guard deliberately does not enforce matching every supplied mutant ID. The pinned parser can silently drop an unknown `--only` ID beside a valid one, and sampling can legitimately omit requested operator IDs. Mixed valid/unknown selection remains a separate documented selector issue; it is not silently treated as solved. The guard also does not detect an absent unspecified file, judge mutant outcomes, prove all registrations passed, or close surviving mutation gaps.

After coordinated application, real wrapper validation must show an unmatched selector exits nonzero, a correct selected report retains its actual result, and legitimate positive replay/suffix skips remain valid. Keep Linux isolation's native launch, trusted paste, per-unit inventory, timeout/cancel/worker failure, cleanup and performance gates. No runtime/browser work was performed or authorized by this review itself.
