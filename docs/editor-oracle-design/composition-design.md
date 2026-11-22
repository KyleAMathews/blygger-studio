# Composed runner candidate for isolated integration

This document identifies a scratch composition against
`@tanstack/oracles@97a4e7a8e4b870c269bff297a16bf8435d258640`.
The individually reviewed source layers are lazy selected-suffix validation,
operator owner waves, authored scheduler revision 2, and explicit owner-order
revision 2. Their composition is ready for exact-source review. It has not
been installed into the active checkout or accepted for CI. No real worker,
browser, application or oracle campaign ran as part of the checks below.

The original full reference and its 402 hashed runtime files remain unchanged.
Its eventual completed result, product-oracle loss audits and the pending
`Draft.accept` enforcement gap retain their separate acceptance gates.

## Layers and decision boundaries

| Layer | Retained behavior | Changed work |
| --- | --- | --- |
| [Lazy selection and operator waves](ci-lazy-selection-proposal.md), [independent review](ci-lazy-selection-review.md) | Both complete baselines; exact selected-suffix reproduction gate; real nondeterminism-aware kill classifier; canonical cut confirmation/reduction | Validate a suffix only when requested. Prepare a later operator owner only after the preceding wave settles and only while no earlier valid kill decides that mutant. |
| [Authored scheduler revision 2](ci-authored-scheduler-proposal.md), [independent review](ci-authored-scheduler-review.md) | Every unresolved owner; canonical witness prefix independent of completion timing; actual executed seconds; all-settled contexts; raw failure identities | Omit strictly later queued owners after a confirmed registered behavioral kill. Protect patch installation/invalidation and cleanup, preserving primary and cleanup errors together. |
| [Owner-order revision 2](ci-owner-order-proposal.md), [independent review](ci-owner-order-review.md) | Existing order when option absent; every discovered dispatch identity, including shared/alias owners; baseline/test identity/order, seeds and budgets | Optional recorded in-package priority prefix, complete canonical remainder, shared by operator/authored planners and bound to run/cache identity. |

No layer can treat a crash, timeout, setup failure, random-only failure,
calibration, reach agreement, unregistered assertion or baseline-nondeterministic
failure as permission to omit an unresolved owner's evidence. A suffix needs
the existing unmutated `hash`, `observed` and `calls` reproduction proof before
any mutant can use it; mismatch or timeout means whole-file fallback, and an
internal provider rejection remains a rejection.

The authored report deliberately credits the canonical deciding prefix,
including required earlier owners. It no longer promises exhaustive later
owner/law/random credits after a valid decision. Already running later work
settles and contributes its actual seconds; omitted work has no invented
passing verdict. A complete survivor still executes every required owner.
That report-contract change must be retained in review and comparison.

## Exact immutable artifacts

Packet directory: `/private/tmp/blygger-runner-composition-v2._cqsl8al/`.
The packet is frozen; copy its fixture files into a new scratch directory
before rerunning checks that create sibling fixture directories.

| Artifact | SHA-256 |
| --- | --- |
| `manifest.json` (94 artifact hashes) | `daf00f4edcde081a7ee7a7bcff0683068ee72c0cc9abd58b7dbfc84fbd323de2` |
| Original pinned `check.mjs` | `d2fce1610ab8bf4c61f6bd7bb1a567428cab062e48694cf44d63885256e2a247` |
| `candidate/oracle-gaps/check.mjs` (lazy/waves + authored v2) | `55e52af8734b7fcd3cc4a1711a603cfa7ba74572bb792098f8642f916db53a47` |
| `accepted-layers.patch` (those two layer groups) | `d27f5dd8ad10b08d557181b93d4ff07b68e72efbadefa26eb15eb8dd77f4921b` |
| `candidate-owner-order/oracle-gaps/check.mjs` (all layers) | `9ee93d2a593ada680803868f45f80e355dcff7f170b1c36c0521ba3724e38497` |
| `candidate-owner-order/oracle-gaps/args.mjs` | `4bf520c313be96d6e55061d55712a597c81a77f10b48bcbca9090d13109b6f70` |
| `candidate-owner-order/oracle-gaps/owner-order.mjs` | `45226beb934cfed8aad87cae75fec37568a9d3c8931d7650be77542b3e14c1c7` |
| `all-layers.patch` (package-relative paths) | `fd4de796806b60e7f262dc0ae82b380c56d9d5088b5c95f08c9b7bf6c051cff7` |
| `all-layers.upstream.patch` (`packages/oracles/` paths) | `82194b3681b356aea4befa051dfe75685e294d744e0b621a552e9f0e723a3ad2` |
| `owner-order-after-accepted.patch` | `25478f44bf14afccf105388c007fc8cfd8c7a6bb276102238eb00e67413eae7f` |

The manifest hashes original layer patches and proof sources as well:
lazy/waves `40e2563179ead1b2da97102e5e9a41c492ab2d0960465d3bd901d2ea15895dc4`,
authored revision 2
`a8c165b86858c61abf9a216f1ddb42d70ef838ef8d9e3bb97430b797683ad0bc`,
and owner-order revision 2
`07ee8712ba93ee3f3a88e9f190845018ccc8e5abcac691c63ceac5d0f3d88a31`.
Earlier scratch compositions and their receipts were preserved.

The owner-order patch initially failed a full-context application after the
authored patch because its target-list hunk included the superseded authored
scheduling comment. `git apply -C1` applied that exact patch with two context
lines, retaining every executable change. `build-receipts.json` records the
failure, successful applications and reason. The final generated patches
apply with their full context to pristine copied files. A separately rebuilt
owner-first composition produces byte-identical final `args.mjs`,
`check.mjs` and `owner-order.mjs`, so that context resolution is not an
unrecorded semantic merge.

LSR-1 is repaired only in these new candidates: the comment before `GROUP`
now describes owner-position waves, awaited preparation, valid-kill omission
and inconclusive cuts. The previously reviewed immutable lazy packet was
left intact. ASR-1 is addressed by authored revision 2's protected install,
unconditional patch clearing and raw/aggregate failure preservation; the
original revision-1 composition remains unaccepted historical evidence.

## Source-extracted checks

All final checks below passed on Node `v24.19.0` using controlled unit,
provider and filesystem premises. `check-execution.json`,
`normalized-check-summary.json`, `cross-layer-receipt.json` and
`static-composition-receipts.json` index the raw outputs and commands.

| Checks | Two-layer candidate | All-layer candidate |
| --- | ---: | ---: |
| Selection/operator tests, including 500 deterministic differential groups | 28 | 28 |
| Independent actual `unitsBatch`/cache/gate/operator controls | 7 | 7 |
| Authored schedules across 16 status kinds, three owners, 1–3 contexts and six completion priorities | 73,728 | 73,728 |
| Authored invalidation/provider/falsy-error/all-settled failure cases | 27 | 27 |
| Owner CLI/path/planner/run/cache identity controls | — | 15 |
| New actual shared-plan/both-scheduler/`unitsBatch` composition controls | — | 7 |

The seven new cross-layer checks execute the actual owner-planning expressions,
real shared helper, `idOf`, global-key expression, `unitsBatch`, suffix gate,
operator waves, authored scheduler and all-settled phase helper from the
composed source. They verify:

- The same explicit priority reaches both planners; selected-proof, operator
  and two distinct authored units use separate cache identities and the
  expected per-slot served patch.
- With the option absent, both planners keep original owner order and all
  survivor owners. A setup-only early result cannot suppress a later kill.
- A real extracted `unitsBatch` timeout branch replaces the slot before
  whole-file operator fallback. An authored timeout keeps its patch associated
  with the slot through replacement until cleanup, while a later owner can kill.
- Provider rejection through actual `unitsBatch` preserves the primary error
  and clears the authored patch. A simultaneous cleanup failure retains both
  errors in an `AggregateError`, with the original as cause.

The first version of this new synthetic fixture exposed its own default-argument
mistake: `prefix: undefined` selected the fixture's default prefix rather than
representing an absent option. The failing fixture/receipt is preserved as
`cross-layer.fixture-v0.mjs` and `cross-layer-fixture-v0.*`. The corrected local
fixture uses a null sentinel to pass actual `undefined` to the shared helper.
Candidate source was unchanged; that initial failure is not a production bug.

Twenty-one additional static/rebuild checks pass. They retain both full
baseline calls and establish byte identity of the existing selection gate,
per-unit/cache-input validation, capture/batching path and phase-settling
helper. They compare the composed operator block to the reviewed lazy-wave
block, authored block to revision 2, and owner identity/cache code to revision
2. They also rebuild the two final package patches and upstream patch from
pristine copies and verify inverse composition order.

Fixture adaptations are recorded in `fixture-adaptations.json`: source-path
bindings point to the composed candidates, and the intentional authored-phase
expectation compares against revision 2 rather than the old authored block.
The original proof programs accepting a candidate path were run unchanged.
Their raw authored JSON spreads the author's original layer manifest: inherited
`candidateSha256` and `unchangedBeforeAuthoredScheduler` fields describe that
input layer, not this composition. Use `testedCandidateSha256` for the tested
composition and `normalized-check-summary.json` for composed results; the raw
records remain available without rewritten provenance.

## Remaining gates before Linux/CI acceptance

The synthetic cache/provider/replacement premises do not prove real Vitest
module resets, transformed source/served-patch isolation, BrowserServer
replacement, application state isolation, OS clipboard delivery, process
cleanup or real timing. No benchmark or minutes-scale speed claim follows
from the checks. Lazy validation saves only suffix proofs never requested;
waves, single-item proofs and reduced overlap can add overhead. Authored
prefix scheduling and explicit priority can change credited laws even when
classification agrees.

1. Independently review the exact all-layer source/hash, merge resolution,
   composed exception paths, owner list and run/cache identities. Preserve
   reviewed layers separately so a composition defect can be isolated.
2. Run the candidate on a separate, cold, isolated Linux checkout/host. Check
   the original package pin and patch hashes before applying the package patch
   there; record resulting source hashes, engine/binary, Node, flags, contexts,
   input manifest and static priority. No live-timing owner decisions are allowed.
3. Keep the complete oracle discovery, both complete baselines, all registrations,
   constructions, calibrations, fixed/random budgets and the complete mutation
   universe. Compare the completed original reference with the candidate,
   retaining baseline and nondeterminism receipts and every mutation identity,
   payload, classification and deciding law/checkpoint. Different host random
   draws must retain their declared campaigns and reproducible recorded routes.
4. Record requested/validated/rejected/unused suffixes, actual owner dispatches,
   canonical prefixes and actual execution seconds. Verify fresh-copy import
   resets, cache input/patch identity, rejected suffix fallback, real replacement
   and resource cleanup. Retain native application/clipboard receiving evidence
   and the isolation gates in [the partition proposal](ci-partition-proposal.md).
5. Require a complete clean report and review every failure-fidelity/classification
   delta. Missing evidence, a cancelled run, a timeout or a setup failure does not
   establish closure. Report end-to-end wall time and total work before setting
   a CI budget; keep original survivors and loss-audit obligations visible.

All 402 frozen runtime hashes matched after scratch composition and before
writing this document. Only this document was added to the worktree for this
composition task; all candidate edits and checks stayed in the unique scratch
packet. The packet manifest must remain unchanged through independent review.
