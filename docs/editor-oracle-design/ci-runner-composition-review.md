# Independent runner composition review

2026-11-19. **Bounded source/design acceptance is granted for the exact
three-layer candidate identified below, for isolated integration testing.**
No new blocking composition defect was found. This accepts the shared
ordering, lazy-validation, canonical-prefix and failure-preservation design
on the reviewed source and controlled boundaries. It does not establish
real worker/browser behavior, practical CI duration, mutation closure or
permission to retire existing tests.

Reviewer: the clipboard loss-audit agent, independently of the composition
author. Read [composition-design.md](composition-design.md), all final patch
hunks, the actual surrounding cache/batch/slot/capture code and the existing
[lazy](ci-lazy-selection-review.md),
[authored](ci-authored-scheduler-review.md) and
[owner-order](ci-owner-order-review.md) review dispositions. The installed
oracle review skill, checklist v1 and glossary had been read in full for this
continuing review. No runtime, product/test source or campaign output was
modified. All new execution was small Node/Python scratch analysis; no
Vitest worker, browser, application or oracle campaign was launched.

## Exact identities and independent rebuild

Immutable author packet:
`/private/tmp/blygger-runner-composition-v2._cqsl8al/`.
All **94** manifest-listed artifact hashes were independently verified with
zero mismatches before review and again after the independent checks.

| Artifact | SHA-256 |
| --- | --- |
| `manifest.json` | `daf00f4edcde081a7ee7a7bcff0683068ee72c0cc9abd58b7dbfc84fbd323de2` |
| Package-relative `all-layers.patch` | `fd4de796806b60e7f262dc0ae82b380c56d9d5088b5c95f08c9b7bf6c051cff7` |
| Original installed `oracle-gaps/check.mjs` | `d2fce1610ab8bf4c61f6bd7bb1a567428cab062e48694cf44d63885256e2a247` |
| Final `candidate-owner-order/oracle-gaps/check.mjs` | `9ee93d2a593ada680803868f45f80e355dcff7f170b1c36c0521ba3724e38497` |
| Final `args.mjs` | `4bf520c313be96d6e55061d55712a597c81a77f10b48bcbca9090d13109b6f70` |
| Final `owner-order.mjs` | `45226beb934cfed8aad87cae75fec37568a9d3c8931d7650be77542b3e14c1c7` |
| Reviewed design document | `72ffcc0854eb32c8a8652107ceaa311acebcb9d3c5be5882efbaccc97a54ebd9` |

Independent scratch:
`/private/tmp/blygger-composition-independent.1Eh12M7d/`.
Copied the pristine installed `oracle-gaps` directory there, verified its
original runner hash, then ran `git apply --check` and applied the final
package-relative patch to that copy. Both commands returned zero with empty
stderr. All three rebuilt files equal the reviewed candidates byte for byte.
`rebuild-receipt.json` has SHA-256
`ee0d8f6e76a6d993a9d1225b678e483692daddb0d0ae87e8a1b6c0fadcf79064`.
This independently verifies the final patch without relying on the author's
reduced-context intermediate merge. No patch was applied to an installed
dependency or active checkout.

## Predictions from the composed contract

Before tracing the candidate, the shared-plan contract predicts that a
priority prefix `[b]` orders required owners `[c,a,b]` as `[b,a,c]` in both
schedulers. With no option, their supplied order remains `[c,a,b]`. A
survivor cannot lose an owner. Real and alias dispatch identities for one
requested real file remain separate jobs; external unlisted owners remain
in the remainder.

If b supplies a registered reproducible behavioral kill, its later operator
owners need neither suffix proof nor mutant execution. A setup failure in b
cannot authorize that omission. A's later kill can make b's earlier cut
confirmation unnecessary, as under the original canonical reduction.

In an authored two-slot run, if a finishes with a kill before an earlier b,
the phase must still await b. If b then kills, the report credits the earlier
planned deciding prefix, while seconds include the already executed a.
If one slot instead fails and another remains live, the first slot's served
patch must clear immediately, the other slot must finish/clean, and only
then may the phase reject. Primary and cleanup failures in one share retain
their separate raw identities and roles, including a falsy primary value.

An authored patch A and patch B under the same authored ID cannot reuse one
another's cached unit merely because their spec/file IDs agree. The actual
served source hash must distinguish their input variants. Returning to A
may reuse A's matching variant. Conversely, two different explicit plans
must have separate global cache keys even if they resolve to the same
dispatch sequence. These predictions follow from input/plan separation,
not from the candidate's current returned results.

## Source findings

No new blocking finding was found. The accepted layer obligations compose
at the intended seams:

- The resolver runs before baselines and units. Its same `orderedOwners`
  function feeds the operator's original reaching-owner set and the
  authored planner's original passing-owner set. Filtering by `fileSpecs`
  is unchanged. Neither seam constructs a smaller unresolved owner set.
  The ordinary tier continues to receive its original order.
- Effective owner order is applied before operator wave positions and
  authored indexed units/minimum-killing position. Thus the prefix contract
  is relative to the recorded plan, not completion timing or baseline path
  sorting. Per-mutant `oracleFiles` is still target metadata, not an actual
  dispatch log.
- Both full baseline calls, registration identities, history budgets, fixed
  and random campaigns, nondeterminism derivation, replay and per-file test
  order remain. Lazy suffix selection still uses first-pass reach and the
  complete existing `hash`/`observed`/`calls` gate. The proof request has
  `mutant: null`, full limit and `stopOnKill: false`; only a passed proof
  permits suffix use. Mismatch/timeout falls back, internal rejection fails.
- Operator pruning uses the unchanged nondeterminism-aware `kills`
  predicate. Cut/skipped/missing records and nonbehavioral/nonreproducible
  failures cannot prune. Canonical missing-unit refusal, skipped retry,
  later-kill cut handling and confirmation-budget reduction remain intact.
- Authored jobs retain whole-file requests and slot-specific patch service.
  Install/initial invalidation are protected. Cleanup clears the slot before
  invalidation; primary-only, cleanup-only and simultaneous failures retain
  revision 2's raw/aggregate semantics. The unchanged all-settled helper
  waits for every slot before propagating the first rejected share in
  context order. It does not promise to aggregate failures from every share.
- Authored minimum-killing-position reduction waits for earlier dispatched
  owners, rejects missing required prefix units and retains every returned
  execution second. It intentionally omits redundant later law/random
  credits. This is the declared reporting change, not evidence that omitted
  owners pass. Baseline blockers and the unchanged classifier remain.
- The complete resolved plan enters global cache and run identity/report
  metadata; the helper joins implementation-hashed `ownFiles`. The existing
  spec identity and served/imported-input ledger remain unchanged. A
  proof-promise map is local to one check with its fixed plan. Suffix proof,
  operator and authored cache namespaces remain distinct.

The earlier ASR-1, OO-001 and OO-002 dispositions apply to their exact repaired
layers retained here. The corrected LSR-1 comment now describes waves. This
acceptance does not retroactively accept the original unrepaired candidates.

## Independent combined execution

The author packet's seven composition controls already combine the shared
planner, both schedulers and actual `unitsBatch`; their provider/input ledger
is synthetic. The independent program extends the seam under test rather
than merely replaying each layer separately.

`composition-cross-boundary.mjs` extracts the final candidate's actual
`servedHash`, `servedBy`, `invalidateChanged`, `idOf`, `lookup`, `startIn`,
`settleIn`, `remember`, `batchIn`, `unitsBatch`, `confirmAlone`, suffix gate,
operator waves, authored block and all-settled helper. It imports the exact
candidate's real planner and classifier and evaluates its actual global-key
and two owner-planning expressions. Files/symlinks are real scratch inputs.
The batch provider, context objects/replacement and store backing remain
controlled; the actual candidate code performs ledger hashing, invalidation,
lookup, variant storage, batching and scheduling.

The independent expectation code does not import the candidate to decide
which order or failure role is owed. Candidate helpers are the execution
under review. The existing classifier is an explicit trusted base for this
scheduler claim; classifier semantic correctness is not reproved here.

Executed with `/usr/local/bin/node --test`: **8 passed, 0 failed, skipped or
cancelled**, in about 0.21 seconds of Node test time. The checks establish
these bounded combined observations:

1. The shared explicit plan sends b first through lazy operator selection
   and authored scheduling. Under one authored ID, patch A and patch B
   produce separate actual-input variants; returning to A reuses only A.
   Later owners are absent after a valid kill, and patch cleanup restores
   the unserved slot.
2. Prefix `[b]` and `[b,a]` resolve identically but produce different actual
   global keys and execute all six survivor proof/mutant units separately.
   A deliberate in-memory control removing only plan-key binding collapses
   those keys, distinguishing the requirement.
3. A requested real owner and its alias both execute, along with an
   unlisted external owner and another internal owner, in both survivor
   schedulers. The no-option neighbor preserves the original supplied
   dispatch sequence in both.
4. An operator validation timeout takes the actual `unitsBatch` replacement
   branch; its controlled replacement updates the registry/contexts array.
   The next authored phase receives that replacement, and an `undefined`
   provider failure plus cleanup Error becomes the intact ordered aggregate.
5. Two authored slots with a later-position kill wait for the slower earlier
   owner. A subsequent earlier kill receives canonical credit; actual
   seconds include both executed units, and both patches clear.
6. A provider-plus-cleanup failure in one slot waits for another live patched
   slot. The first clears before the other finishes; final rejection retains
   primary, cause and cleanup identities and both slots are clear.
7. An ordered short cut can remain unconfirmed when the next owner supplies
   a registered kill. The actual cut/replacement/reduction code executes;
   no redundant confirmation is counted as kill evidence.
8. Two different authored patches of the same source run concurrently under
   separate slots and actual input ledgers. Cleaning the first does not
   change the second slot's served hash; both jobs retain their own patch,
   unit identity, result and cleanup.

| Independent artifact | SHA-256 |
| --- | --- |
| `composition-cross-boundary.mjs` | `f61b311a6d6e310e63989b14d2de606c6dc31a48f7e71d963353bd3af02d98f4` |
| `independent-final.tap` | `48f39570facceb1444cf0ab46559450b631f50a00e0a91b8b102373923901c2c` |
| Preserved `fixture-v0.mjs` | `7594653f5c92037f035ae6b7a17f24b33605afeb64c03541e2e1942a56220cdb` |
| Preserved first failing `independent.tap` | `981011a144d99ec4df0eed04986492cc225301e246615eb62ee21015d74031b8` |

The first independent fixture run failed before scheduling because the
scratch package lacked `package.json`, which the real global-key expression
reads. Its source/receipt are retained. Adding that missing fixture file
made the first seven checks pass; the eighth was then added for concurrent
distinct patches. Candidate source and expected scheduler semantics were
unchanged. This fixture error is not a candidate or product defect.

## Acceptance limits and receiving gates

The independent provider does not execute Vite transforms, actual Vitest
copies/module reset, real context warm/close, BrowserServer replacement,
application state or the OS clipboard. Those controlled premises remain
unresolved receiving boundaries. This review supports isolated candidate
integration, where actual worker/capture/cache/patch replacement and cleanup
can be observed. It supplies no registered product law kill.

Retain the full comparison requirements in composition-design.md: both
complete baselines and nondeterminism receipts; the exact complete mutation
identities/payloads; all laws, histories, constructions, calibrations,
fixed/random budgets and seeds; actual dispatched/omitted owner accounting;
every used suffix's reproduction receipt/fallback; canonical deciding
law/checkpoint and real failure-fidelity deltas; actual resource cleanup;
and complete end-to-end wall time/total work on isolated cold Linux. Keep
the original survivors, pending `Draft.accept` gap and loss/deletion gates
visible. No cancelled, setup-failed, timed-out or partial run closes them.

## Checklist v1 accounting

This assesses the composition only, with the individual layer review
records retaining their detailed requirement evidence.

| Requirement | Current outcome and trigger-specific scope |
| --- | --- |
| ORC-001 | Existing any-owner law-kill authority retained; explicit plan/prefix-report proposal stated. No new product law or timing authority claimed. |
| ORC-002 | Independent ordering/cache/failure predictions precede candidate execution. Classifier is unchanged trusted base; no classifier-correctness claim. |
| ORC-003 | Source/design distinguish ordering, selection, scheduling, classification, provider and evidence. LSR-1 prose corrected; no new registered oracle-file literacy claim. |
| ORC-004 | No product grammar/budget/exclusion changes. Alias/external/default/explicit owner domains remain, and survivor owner-set checks cross both planners. |
| ORC-005 | Actual combined runner functions execute at controlled boundaries. Real worker/product path receiving evidence remains required. |
| ORC-006 | Nonkill pruning semantics retained; wrong plan-key binding is distinguished. Scratch assertions are not registered product-mutant kills. |
| ORC-007 | No new important generated property triggers fresh campaigns here. Existing required fixed/random properties, budgets and replay remain unchanged. |
| ORC-008 | No product model state change. Plan, indexed units and minimum kill position retain distinct continuations, exercised by delayed earlier kill and same-rank/different-plan cases. |
| ORC-009 | Plan inventory, dispatch identity, target metadata, canonical prefix and actual work remain distinct. Package meanings of owner/unit/kill/reach are retained. |
| ORC-010 | Combined primary/cleanup/falsy-value and all-settled boundaries pass independent checks. Real process/provider cleanup remains a receiving gate. |
| ORC-011 | Independent expected sequence and cache/failure relations challenge the composition without copying its transitions. No new product/model shared semantic-fault hypothesis; that product trigger does not apply. |
| ORC-012 | Exact patch, rebuilt files, manifest, independent source/receipts, fixture correction and limits are versioned here. No bug-class closure, CI speed or test-retirement acceptance. |
| ORC-013 | Plan-key, alias/default, earlier/later kill, cut/later-kill and concurrent-patch witnesses distinguish scheduling boundaries. No reusable product boundary law is introduced. |
| ORC-014 | Synthetic provider/context/store premises are explicit; real receiving behavior is not inferred. |
| ORC-015 | No important product property/history/driver is added or edited; trigger does not apply. Synthetic case counts are not declared-state reach. |
| ORC-016 | No product oracle file changed. Unique scratch checks remain separate from registered oracle evidence. |

All 402 frozen reference runtime inputs matched before and after this
documentation update. All 94 author-packet artifact hashes and its manifest
remained unchanged. The installed runner retained original SHA-256
`d2fce1610ab8bf4c61f6bd7bb1a567428cab062e48694cf44d63885256e2a247`.
Only this review and the unique independent scratch analysis were written
by this agent for the composition task.
