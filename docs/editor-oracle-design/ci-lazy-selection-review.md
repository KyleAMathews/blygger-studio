# Independent lazy-selection review

2026-11-19. Reviewer: the clipboard loss-audit agent, independently of the
proposal author. Scope: lazy selected-suffix validation and operator owner
waves in [the proposal](ci-lazy-selection-proposal.md). This is a source and
bounded synthetic review. No installed runner, production/test source,
campaign artifact or browser process was changed. The clipboard deletion
gate remains pending its original full-run evidence.

**Verdict:** no blocking correctness defect found in these two standalone
layers. The design preserves the existing decision rule and requires the
existing reproduction gate before using a shortened file. This verdict
supports further integration work; it does not accept a patched runner for
CI, establish practical runtime, or accept its composition with the authored
scheduler or owner-priority proposal.

## Reviewed identity

Read the installed `oracles-review` skill, checklist v1 and glossary in full
for this review. The relevant authority is the pinned runner's stated
execution contract, supported by `outcomeOf`, `targetsOf`, capture setup and
the unchanged canonical reduction. Product law authority remains with the
registered oracles; agreement with an unmutated baseline is authority only
for reusing an execution optimization, not for judging product semantics.

Reviewed immutable packet: `/private/tmp/blygger-lazy-selection.ze0gEW/`.
Independently computed every packet hash below and verified that the
installed runner still equals its original copy.

| Artifact | SHA-256 |
| --- | --- |
| `check.original.mjs`, installed runner | `d2fce1610ab8bf4c61f6bd7bb1a567428cab062e48694cf44d63885256e2a247` |
| `check.lazy-only.mjs` | `782563b2a6297df9f3ca87cd4b13496d51bea3802f065bf12fe08a90a0311dc6` |
| `lazy-only.patch` | `8a745c81985d088d03d00ec9c0d1658b7e16be97b7c21716a01c56a99bb057a0` |
| `check.lazy-waves.mjs` | `79feae0b3c21dbbbe5ac834bc6ac531886e3282f2661b4ab2f4aa3d2f7884f61` |
| `lazy-waves.patch` | `40e2563179ead1b2da97102e5e9a41c492ab2d0960465d3bd901d2ea15895dc4` |
| `waves-after-lazy.patch` | `56c31f024a1230263028cc1237a76d21ed4b919d9e8d284e65fd31fef8a6517f` |
| Author's `synthetic.test.mjs` | `e0db23ae9ce94f23791fc239cd3d19e2248afaa1ce5303eaae2b2a6a1dff5ea2` |
| Author's `synthetic.tap` | `544b4ccd599344dbc680e1d0b552c1ab2e8e3bc8327bdbeda7fd68766ff242c2` |
| Packet `manifest.json` | `230d6544ca8e801156e1ba3bb26e2265e5e1a36d95b86ca24c630df2c7f0f4ce` |

## Rebuilt promised observations

From the execution contract, predict this before consulting the candidate:
with baseline tests `[first, middle, last]` and first reach at `middle`, the
runner may use `[middle, last]` only after a complete unmutated execution of
that suffix reproduces both tests' assertions, observations and call counts.
A matching source observation with a different call count is insufficient;
the mutant must receive the whole file. A validation timeout cannot prove
reproduction and must also produce whole-file fallback after replacement of
the affected slot. A provider/capture rejection must retain its error rather
than minting a successful proof.

For ordered owners `[A, B]`, a setup failure in A is inconclusive and B must
still run. A deterministic registered behavioral law rejection in A decides
the mutant, so B's suffix proof and mutant execution are unnecessary. A cut
in A is inconclusive; if B subsequently kills, confirming A would add no
decision evidence. Otherwise the original canonical confirmation order and
remaining mutant budget apply. These predictions concern the existing
runner policy, not a newly proposed product law.

The actual source follows those predictions:

- Both full baseline calls remain, with the same file lists, test order,
  seeds and per-property budgets. Removing `checkShare` removes eager
  optimization proofs only. `baselineOf(first.rows, second.rows)` still
  supplies the nondeterministic-test set and work evidence.
- `selectionOf`, `selectionId` and `reproduces` are unchanged. `reproduces`
  requires no timeout, `outcomeOf([run]).outcome === 'survived'`, and matching
  `hash`, `observed` and `calls` for every selected key. Missing keys fail the
  comparison. Failure, setup and unhandled-error units cannot certify reuse.
- The new proof is a one-item `unitsBatch` request with `mutant: null`,
  `stopOnKill: false`, the original full `limitFor(file)` and exact suffix.
  `runBatch` creates a fresh adjacent copy and gives it its own unit state;
  capture setup resets its module registry and removable added globals.
  The pre-existing timeout path replaces `slot.context`. This is stronger
  source continuity than relying on the old rare lazy fallback's original
  file `unit` path.
- Shared proof promises are installed in one synchronous JavaScript turn.
  Same-suffix callers await one proof; different suffixes keep separate
  identities. A slot awaits its proof before dispatching mutant work, while
  another slot shares only the decision. Rejection propagates to all
  waiters; mismatch is memoized as whole-file fallback.
- Waves retain each supplied owner position, every mutant state and all
  survivor owners. The existing `kills` predicate excludes missing,
  `skipped` and `cut` records and uses real classification with baseline
  nondeterminism. Timeout, setup, crash, random-only, calibration and
  reach-only results do not prune later owners. This is not an owner filter
  applied to unresolved mutants.
- The final canonical reduction is byte-identical, including missing-unit
  refusal, skipped-copy retry, later-kill handling for earlier cuts,
  confirmation order and confirmed-seconds accounting. Delaying preparation
  does not turn a cut into a final verdict. Ordinary-tier invocation and
  authored scheduling remain structurally present; these layers introduce
  no authored patch serving.
- Unit identity, input-ledger lookup, `unitsBatch`, capture cleanup and patch
  service are unchanged. A selection's `selected` spec cannot alias
  `mutant:N`; the existing global cache identity also includes runner source.
  This is source evidence for retaining those boundaries, not a real-worker
  cache or external-host isolation result.

## Independent bounded checks

Read all 28 author checks and their passing receipt, including the 500
deterministic mixed-status comparisons with the original owner algorithm.
Those checks use extracted scheduling functions and the real classifier,
but stub `unitsBatch`, replacement and capture providers. Their replacement
fixture proves that the caller uses an updated slot; it does not execute
the real replacement implementation.

To exercise another seam, the reviewer created only
`/private/tmp/blygger-lazy-independent.GX1mC4Wm/combined.mjs`, SHA-256
`adce063eb0e3b2e6b6ea7fcaef7f350faad555663062fcff48e817dd15f6d20d`.
It extracts the candidate's actual `unitsBatch`, cache identity, suffix
functions and `runOwners` together and imports the real installed
`outcomeOf`. Its provider, cache storage and context replacement remain
controlled synthetic boundaries. It imports no application or browser code.

Executed `/usr/local/bin/node --test` on that scratch file: **7 passed,
0 failed, skipped or cancelled**. Receipt `combined.tap` SHA-256:
`14406bb1f2667a956fd4421d66614e16ba24e3e79cc7fb712686f425e209c7e0`.

The seven checks observed: validation before the first killing owner's
mutant use and no later proof; call-count mismatch followed by whole-file
mutants; the actual `unitsBatch` timeout branch calling replacement before
fallback; three distinct cache identities for one suffix proof and two
mutants; setup-only evidence followed by a later validation and registered
kill; identity-preserving provider rejection before any mutant starts; and
fail-closed refusal of an unexplained sparse mutant result. They demonstrate
the extracted functions together, not the real worker replacement, source
transform isolation, retention behavior or cleanup under process failure.

## Findings and remaining evidence

**LSR-1, minor source prose:** the comment immediately before `GROUP` still
says mutants run “all in one batch.” Layer B runs one owner position per
batch. Update that comment in the next candidate so it describes waves;
keep the immutable reviewed packet intact. Evidence: source inspection.
This is a documentation correction, not an observed classification defect.

**Integration remains a gate.** Neither the author's fixtures nor the seven
independent checks run real copies, module reset, context replacement,
source-hash invalidation, patch serving, capture retirement or external
application/clipboard premises. Source continuity is supported; those
receiving boundaries are unresolved for this changed schedule. Require a
real-run comparison and failure-path evidence before adoption. This is a
limit on this review's acceptance, not a claim that a synthetic test is an
adequate substitute for the receiving witness.

The authored composition's manifest explicitly retains ASR-1 and marks
functional composition pending. Its apply/syntax result does not resolve the
[authored review](ci-authored-scheduler-review.md). The separate owner-order
patch changes additional inputs and report credits and is outside this
verdict. Re-review the final combined artifact and exact hash, including its
exception cleanup, resolved owner lists and cache identity.

No practical CI duration is established. The removable cost is only proofs
that no mutant ultimately requests. If every suffix is used, those savings
are zero; one-item proofs, more batches and lost overlap may add wall time.
Phase metadata `selections: 0, selectionMode: 'on-demand'` means no eager
proofs, not zero total proofs. Before a speed claim, retain requested,
validated, rejected and unused suffix identities/counts, every actually
executed owner and deciding law/checkpoint, and per-phase wall time/work.
An omitted owner after a valid kill has no fabricated passing receipt.

The comparison gate must preserve the complete mutation universe and
payloads, both complete baselines, all law registrations, constructions,
calibrations, histories, fixed/random budgets, seed and nondeterminism
rules. Review every classification/failure-fidelity difference; no timeout,
setup failure or reach-only change is a kill. An unresolved mutant must
exhaust its required owners. A cold isolated Linux run remains necessary
for CI timing and cleanup. The frozen reference and the pending
`Draft.accept` enforcement gap retain their separate gates.

## Checklist v1 scope accounting

This table assesses the runner proposal only; it is not a renewed audit of
all fourteen product oracles.

| Requirement | Outcome in this review |
| --- | --- |
| ORC-001 | Existing product laws/authority/limits unchanged. Execution-equivalence authority is stated above; no product result is authorized by baseline agreement. |
| ORC-002 | No semantic model/classifier rewrite. The actual classifier is used, and reproduction compares execution evidence only. |
| ORC-003 | No new oracle/law implementation; distinguishable runner responsibilities retained. LSR-1 records inaccurate scheduling prose. |
| ORC-004 | No history grammar, filter, validity rule or bound changes. Owner omission is conditional on an existing valid kill, never an unresolved-mutant exclusion. |
| ORC-005 | Product drivers/checkpoints unchanged. Changed execution/capture boundaries require the receiving integration evidence above. |
| ORC-006 | Real classifier retained; nonkill categories challenged in bounded checks. No synthetic result is credited as a product-mutant kill. |
| ORC-007 | Campaign definitions, budgets, seeds and replay code unchanged; both full baselines retained. Complete changed-runtime execution remains pending. |
| ORC-008 | No stateful product model changes; trigger does not apply. Shared proof-promise state is runner memoization, reviewed explicitly above. |
| ORC-009 | No new model vocabulary; suffix, unit, owner, kill, survivor and calibration retain package meanings. |
| ORC-010 | Canonical failure/cut reduction retained; internal proof errors propagate. Real worker/resource-failure fidelity and composed cleanup remain integration gates. |
| ORC-011 | No new shared semantic fault hypothesis in product/model; trigger does not apply. Independent extracted-function composition challenges runner control flow only. |
| ORC-012 | Versioned review records exact source identities, supported checks and limits. No bug-class closure, final campaign or CI-speed claim. |
| ORC-013 | No new reusable product boundary law; trigger does not apply. Execution-policy boundary witnesses are rebuilt and checked above. |
| ORC-014 | Synthetic provider/cache/replacement premises are explicit. No real-worker/browser claim is inferred; receiving evidence remains pending. |
| ORC-015 | No property/history/driver or declared-reach edits; trigger does not apply. Existing constructed histories remain in both full baselines and each required execution. |
| ORC-016 | No oracle file changed or ordinary test inserted into one. Scratch Node checks are harness-analysis artifacts and supply no registered law kill. |

All 402 frozen runtime inputs matched immediately before and after writing
this review. The installed runner retained original SHA-256
`d2fce1610ab8bf4c61f6bd7bb1a567428cab062e48694cf44d63885256e2a247`.
Only this review and the unique scratch analysis were written by this agent.
