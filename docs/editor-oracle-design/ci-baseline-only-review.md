# Independent review of explicit baseline-only CI

**Accepted in source for a bounded, cold Linux validation run. No remaining source blocker found in the final proposal.** This does not approve CI adoption, the proposed 25-minute budget, native process isolation, product gap closure, or removal of the full mutation-audit gates. Reviewed 2026-11-19 under the installed `oracles-review` skill, checklist v1 and glossary, against `@tanstack/oracles@97a4e7a`.

The frozen proposal lives at `/private/tmp/blygger-baseline-only-cli.nwx7oh_x`. Its repository prerequisite is the accepted isolation-v3 topology/wrapper plus accepted executed-baseline guard. `repo-before` records the authoritative exact base; the package patch is against the pristine pin and is independent of mutation scheduler/owner-order proposals. No active runtime, installed package, oracle, production, CI or immutable proposal artifact was edited by this review. No candidate runner, browser, product, Vitest session, container, build or benchmark was launched. All 402 original frozen campaign input hashes still match.

## Accepted exact artifacts

| Artifact | SHA-256 |
| --- | --- |
| Core `baseline-only-cli.patch` | `352a1f00bac811b1d2559239a24aa6b6051d9cf5d32f5c51f20b517c14b8b0c0` |
| `core-manifest.json` | `a5aa79e7c16e011545ba49c69f9616256c588cd57110b63fbb70cd05514c7fd2` |
| Original `repository-proposal.patch` | `c308b533a283b421de477b6969a926f079c8e8209e760dfbbdbcce94521243ba` |
| Original `repository-manifest.json` | `a7d7daa2dafd2e1c8d99b0db2b1c0aa1d67e9c0809f685bf35ab08045cb2aae0` |
| Final `repository-scope-overlay.patch` | `2680df719de99863c4001fa09f360f34924c2ce63edf44ee0051f1b95094cfb2` |
| `scope-overlay-manifest.json` | `5a2c2d6dd761d2830060cd87cbd71725027e84beb358eb9f2d36f80b3218297d` |
| Full replacement `repository-final-proposal.patch` | `381376bd6ac6128381ef6f1971a4062f6a0154150b13c6fe45aa135b6ddae2b9` |
| Final wrapper | `e5db54fdee7c7701216841c82d664677c3ff955fde01c0216569a098f8ff47e8` |
| Final derivation builder | `03302f3a82410b2e5084a2d20035d61bc685d2350304b89b1059cce229a6056f` |

Apply either the original repository patch followed by its final scope overlay, or the full replacement patch. Do not apply both alternatives. `repo-final-after` records final bytes. Original packets remain immutable.

## Rebuilt observation and preservation boundary

The adopted formatting laws, histories and budgets predict the same observations whether or not a later mutation audit is scheduled. A baseline-only invocation must therefore retain both complete instrumented oracle passes, including fixed/random campaigns, constructed reach, calibration and determinism registrations. It must fail for an actual oracle or setup failure in either pass, and its result cannot establish mutation sensitivity.

The pinned runner originally drops first-pass failed files before the repeat and publishes first-pass baseline counts. Comparing only captured observations also cannot establish success: a repeat-only setup/unhandled/timeout failure can leave the same observations, and `baselineOf` iterates first-pass keys rather than independently accounting for added repeat registrations. The final proposal addresses these distinctions explicitly.

The core adds an explicit parsed `baselineOnly` option. It retains static analysis, ownership/declaration validation, instrumented sources, `runAcross`, the first/repeat full oracle runs and `baselineOf`. In this mode, first-failed oracle files repeat; suffix planning is empty; then the mode returns before mutation execution. The entire remaining full mutation phase is byte-identical. The full default command remains `test:formatting`; `test:formatting:audit` is an explicit alias. Full audits remain required for adoption/change of oracles, loss/deletion gates, sensitivity evaluation and gap closure.

Both actual pass receipts contain unit counts, file failures, normalized capture records and SHA-256 fingerprints. Either pass's file failure or failed test makes the report provisional, so a repeat-only failure cannot hide behind identical hash/observed values. The report uses `purpose: baseline-only`, `status: baseline-completed`, `mutationAudit.status: not-run`, and `results: null`. Its JSON, summary and final stream line make no zero-gap or completed-mutation-audit claim. The generic CLI retains ordinary daemon/cache semantics; the project wrapper enforces a cold check.

The wrapper binds the actual parsed package to `realpath(cwd)`, the maintained config/source/seed/limits, its mode dispatch and exact report options. It refuses mutant/diff selectors, explicit or inherited file selection, replay/calibration/witness/manifest environment controls and budget multipliers. It derives the expected oracle filename set from disk, requires it exactly in both passes, requires positive execution and no skipped registrations per oracle, and checks matching unique key sets, count/state/route accounting, capture fingerprints and required pinned instrumentation fields. It independently compares first/repeat hash and observed values with reported nondeterminism, normalizing the core's absolute keys. Both-pass provisional status and the first-pass summary must agree with the receipts.

Existing child status propagation, no report read after a nonzero child, exact successful-child report bytes, acquired-resource cleanup and topology finalization remain intact. The external topology additionally binds the selected derived runner path and derivation receipt fingerprint. These are cooperative provenance checks, not protection against arbitrary hostile filesystem writers.

## Challenges resolved before final acceptance

The initial wrapper could accept a report that changed a repeat observation, recomputed its capture fingerprint and still claimed no nondeterminism. It could also accept reduced capture rows containing only key/state/route, losing instrumentation. These were source-derived report-consistency challenges, not observed candidate runner failures. The frozen final wrapper rejects both; independent controls exercise each required missing field and suppressed/invented nondeterminism.

The author then identified two invocation seams: a duplicate `--package` could redirect the CLI while the local app and expected filenames stayed local, and a baseline-looking token consumed as another option's value could choose the derived runner without a parsed baseline mode. The final overlay rejects cross-root packages and dispatch/parsed-mode disagreement before topology or hosts. Canonical comparison accepts a legitimate symlink spelling of the same cwd. It also explicitly refuses a symlink or nondirectory at the installed package root, in addition to symlinks inside package contents.

The derivation builder binds the npm pin, package-lock integrity, patch fingerprint, all 78 pristine package files and changed before/after hashes. It copies the complete package in staging, verifies copied bytes, applies the exact patch, checks all derived files and the unchanged install, writes a derivation receipt, then renames staging. Reuse checks the receipt and full derived content. A mismatch fails; staging cleanup preserves the error path. Relative source paths and ancestor dependency resolution are retained by the whole-package layout. This review inspected the actual builder and authored scratch execution evidence; it did not run the builder itself.

## Independent evidence

Reviewer scratch is `/private/tmp/blygger-baseline-review.d79X0s`. All **60 independent lightweight controls passed**:

- **21 core controls:** actual parser, receipt/render helpers, repeat-only setup/unhandled/timeout/failed-test outcomes with unchanged observations, full mutation-phase preservation, and both actual historical capture projections.
- **29 report-helper controls:** the exact frozen wrapper helper, positive execution, counts/keys/mode/status, every required capture field, suppressed/invented/accurately reported nondeterminism, both-pass failures, original full-report compatibility and historical projection acceptance.
- **10 final-scope controls:** byte-identical report helpers after the overlay, canonical project binding, symlink cwd spelling, both mode-dispatch disagreements, full-mode preservation, empty inherited selection, seed preservation and installed-root refusal source placement.

There were 39 core/capture, 21 repository/artifact and 13 final-overlay hash bindings. These counts include repeated bindings across phases. Separately, all 78 known package contents matched in each pristine installed package and the prepared derived fixture: 234 content matches. All 402 original frozen runtime inputs matched at completion.

Each preserved historical pass contains 14 files and 4,367 registrations. Of these, 2,808 records use the framework's `fixed seed` route. The 1,559 records carrying its `calibration` route comprise **77 actual calibration registrations and 1,482 determinism registrations**. Route labels alone must not be reported as 1,559 calibration tests. Every normalized capture field is retained by the new helper. These are historical capture projections, not a completed candidate baseline-only report or a hardcoded future count.

| Independent evidence file | SHA-256 |
| --- | --- |
| `review.mjs` | `083baff757b80f805e64dcdc2a10f77d2e45ccb472020df221f324d80dcc8344` |
| `core-review-output.json` | `ae4832eb02b810677943880659df7b53600d49d6440ed4ba865038e62d909286` |
| `wrapper-review.mjs` | `f20952b56a8467d60f9ff38a02ab3ef0cdd198eb9eec13a812d0604e5c7c1578` |
| `wrapper-review-output.json` | `63614d93b8e30ad0435f050779d8da4840f644b6493faf9a64a6ba1321a2eb1d` |
| `scope-review.mjs` | `963b3f3d292aa93c73712471a3188aea1a720394c72305ff1be771a0d942735a` |
| `scope-review-output.json` | `bb78940bb2dc0a179d27e182c3a2c2a0016f8799803e6aea7528e57fb0cf2a66` |
| `package-hash-review.json` | `889af13b066bee00c34e1b26ad748389a1aa17469b063013cde9f6323a352bfc` |

The author's sources/receipts were also inspected: original 95 core/wrapper controls, final 111 wrapper controls and 14 actual derivation controls. These overlap and are not additive independent executions. One earlier lightweight control process exited 139 without diagnostics; the documented rerun with explicit garbage collection completed. No candidate runner/browser session was involved. Builder strict typechecking and patch forward/check/reverse/exact-byte receipts are authored evidence, not reviewer executions.

## Checklist outcome and remaining gates

| Requirement, checklist v1 | Outcome for this harness change |
| --- | --- |
| ORC-001 / ORC-003 | Existing product law/authority/prose is untouched. The new evidence purpose and its limits are explicit; baseline evidence is not a gap audit. |
| ORC-002 | No production semantic machinery enters a model or comparison. Report consistency is checked independently from actual capture receipts. |
| ORC-004 / ORC-007 / ORC-008 / ORC-009 / ORC-013 / ORC-015 / ORC-016 | No product grammar, campaign budget, model state/vocabulary, reusable product boundary law, declared reach or registration change triggers these requirements. Existing campaigns/constructions/calibrations/determinism routes remain unchanged. Refusing narrowed inputs applies to the complete CI invocation, not the product history grammar. |
| ORC-005 | The original browser and instrumentation paths are preserved in source and historical captures. The new candidate's actual receiving, complete execution and capture handoff remain runtime gates. |
| ORC-006 | Repeat-only failure and malformed/contradictory report controls challenge the harness. They are setup/report evidence, not registered product-law kills or sensitivity closure. |
| ORC-010 | Source and lightweight controls preserve failure status, read/spawn/cleanup/finalization boundaries and report byte attribution. Real cleanup/cancellation remains separately owed. |
| ORC-011 | Actual pass failures and captured observation comparisons supply distinct report checks. No new alternative product formulation is introduced or required by this mode. |
| ORC-012 | This versioned review binds exact inputs, resolved challenges, checks and limits. It makes no whole-oracle or product bug-class closure claim. |
| ORC-014 | VM/synthetic controls support only control flow. Actual native provider/process premises remain unresolved until receiving controls run. |

The next gate is one bounded complete cold Linux baseline-only run using the exact final source. Verify discovered/actual sets in both passes, current registration counts, unchanged seed/budgets/routes/instrumentation, no suffix/mutant units, actual private Browser acquisitions and process inventory, failure propagation and cleanup. The 25-minute ceiling and four-context capacity require this measured evidence, including startup/install/CI overhead. Historical macOS timing projections cannot establish them. Full mutation audit and loss/deletion acceptance remain separate, mandatory evidence; this mode cannot close any surviving gap.
