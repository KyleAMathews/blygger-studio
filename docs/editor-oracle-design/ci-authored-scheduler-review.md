# Authored scheduler — independent source review

Reviewer `/root/loss_format_unit_final`, 2026-11-19. The oracle review skill,
checklist v1 and glossary were reread. This review uses source inspection and
isolated pure execution of the extracted scheduling block. No product test,
browser job, installed-runtime edit or campaign-output write was performed.
The frozen full formatting reference and its pending NUL/execution/deletion
gates are unchanged by this review.

## Reviewed identities

| Artifact | SHA-256 |
| --- | --- |
| Proposal | `123e98a735d2b077a61354f66d074c01767186288cc5012a60cedc2f67a3156a` |
| Original runner | `d2fce1610ab8bf4c61f6bd7bb1a567428cab062e48694cf44d63885256e2a247` |
| Candidate runner | `988de4382e2a659d0d77c30421b80e24ec87827f8cc4ba35617d3d51ee784e42` |
| Candidate patch | `3bd2a47b1ab4b7fc402d4fa4944bf55f6aaba6a1edd11b0d52ae6ec470019a9e` |
| Author proof source | `a0e17f5da3536fca755aa8b768a5f9f257ce239ba35da67c1738046214a9543d` |
| Author proof result | `dbe3b20a4f25c55ba8364b827ad9a9598b58966c4d1dee1cb036001b8b4c4550` |

The candidate and patch above are the scratch files under
`/private/tmp/blygger-authored-scheduler.g9Fw2Z/`, not an applied runtime.

## Raw finding before repair

**ASR-1 (P2): invalidation exceptions can retain a served patch or erase the
original scheduler failure.** The claimed cleanup/failure boundary is the
per-slot authored patch around a whole-file `unitsBatch` call. ORC-010 requires
the original failure to remain distinguishable and created resources to be
released. The candidate assigns `serve[slot.index]`, then calls the first
`invalidateChanged` outside its `try`. Its `finally` clears the slot but calls
the second invalidation without preserving an already thrown error.

The pinned `invalidateChanged` directly invokes the provider's
`context.invalidateFile` and does not guarantee a nonthrowing result. Two
small controlled histories of the exact candidate block distinguish the
problem:

1. One owner/one context; the initial invalidation throws. The scheduling call
   rejects while `serve[0]` still holds the authored patch.
2. One owner/one context; `unitsBatch` rejects with error A and cleanup
   invalidation throws error B. The scheduling call rejects with B, without A
   as the error, cause or aggregate member. The slot is cleared, but the
   original failure is lost.

These are independently executed pure witnesses, not browser failures or
mutation kills. They are in
`/private/tmp/blygger-authored-independent-ulgherr4/cleanup-witness.mjs` and
`cleanup-witness.json`. The script compiles the actual candidate authored
block, imports the pinned pure classifier, and uses the actual all-settled
phase semantics with controlled providers. A normal `unitsBatch` rejection
does preserve A and clear the patch. A separate two-context witness confirms
the phase waits for the other in-flight unit and clears both slots before
returning the first rejection.

Repair: include patch installation/initial invalidation in the protected
region, always clear the slot, and retain the original failure separately
when cleanup invalidation also fails (for example, an `AggregateError` with
the original as cause). Extend the actual-block proof with both invalidation
faults and the two-context rejection/finish ordering. This finding concerns
exception handling, not the classification-preserving early-stop rule.

The 73,728-schedule proof does not cover these faults: its invalidation stub
only appends a context ID; the explicit rejection control uses one context
and a successful cleanup stub. Therefore its successful cleanup assertion
cannot establish the two missing exceptional paths.

## Interim disposition

Classification/prefix preservation is still under review. Final source
acceptance is withheld pending ASR-1's disposition. No recommendation to
apply the current candidate to the frozen reference process is made.


## Completed bounded assessment of the original candidate

The source rule is sound on completed unit records, separately from ASR-1.
The design skill's existing authority is that any owner law kill decides a
mutant (`oracles-design/SKILL.md:449–450`). The proposal deliberately changes
additional credit collection after that decision. It does not claim those
credits are exhaustive. This is a report-contract proposal for maintainer
acceptance, not a discovered violation of the any-owner classification rule.

The independent classification argument does not require copying the
classifier: if no eligible unit supplies a verified behavioral kill, nothing
can lower `killAt`, so every owner remains scheduled and the same full set
reaches the unchanged classifier. If an eligible unit does supply such a
kill, the unchanged any-owner rule already decides `killed`, regardless of
later nonkill records. A unit marked skipped/cut cannot authorize stopping.
Baseline-nondeterministic test failures cannot authorize stopping. These
facts follow from the unchanged `kills` predicate and the inspected
`outcomeOf`, rather than from a label on a synthetic fixture.

The global FIFO queue gives each job its owners in their declared order.
Before a killing position can be dispatched, each earlier position has been
dispatched or completed. Lowering `killAt` never skips an earlier position.
All slot shares settle before judgment, so a slower earlier owner can lower
the killing position and complete the final prefix. Every required prefix
unit is checked for absence. Given the same owner order and returned unit
records, the final prefix is independent of completion order. Passing changed
observations, random-only, agreement-only, unregistered, calibration,
assertion, setup, crash and timeout records cannot alone skip later owners.
`blockedOr` retains a real kill and otherwise retains baseline blocking.

Later owner `by`, `laws` and `randomAlso` credits can intentionally disappear,
including credits from already in-flight later units. That is compatible with
the stated prefix contract. Actual seconds still sum every returned executed
unit. `randomAlso: false` therefore describes that prefix only. The proof
must not be represented as preservation of the former exhaustive credit
lists, or as proof that omitted owners would pass.

### Independent replay and source preservation

A separate copy of the author's proof was executed with `/usr/local/bin/node`
in `/private/tmp/blygger-authored-independent-replay-as_okzti/`. Only the
scratch directory literal changed, so its output could not overwrite the
author's artifacts. The extracted candidate block and imported classifier
were unchanged. Exit status was 0. All 73,728 schedules passed, all 49,392
no-verified-kill schedules ran every owner, and the report equals the author's
saved result after removing the proof-file SHA (which necessarily changed
with the scratch path). The 11,904 avoided task count was reproduced. This
is an independent replay of the author's bounded proof, not an independently
authored scheduler oracle.

The proof compiles the actual authored blocks and tests 16 record kinds,
three owners, six completion priorities and one/two/three contexts. The
first-completion-wins and stop-on-setup controls produce the distinguishing
wrong results. One additional four-job fixture preserves all IDs and checks
slot-specific served patches. The enumerated domain is one three-owner job;
it does not enumerate arbitrary job counts or all provider failures. The
actual failure and two-context cleanup witnesses above supply additional
independent challenges. No synthetic result is a browser law kill.

I independently rehashed the artifacts in the identity table and checked
byte equality before the edited scheduling comment and after the authored
block. Authored admission, result insertion, IDs, does-not-apply/unowned
records, owner discovery, whole-file requests, selected-tail checks, both
baseline calls, seeds/budgets, operator scheduling and report writing are
outside the changed span. The per-owner request still has `select: null`
and the same `stopOnKill`, limit and ignore parameters. This establishes
source preservation; it does not claim a candidate-runtime baseline or a
real-host classification comparison has run.

### Checklist accounting (v1)

This is a review of a proposed framework scheduler hunk and its bounded
scratch evidence. It is not acceptance of a new registered generated oracle.

| Requirement | Outcome and trigger-specific reason |
| --- | --- |
| ORC-001 | Classification authority traced to the package design skill; practical CI duration and real-host behavior remain unresolved. Prefix credits are an explicit proposed reporting change. |
| ORC-002 | Scheduler expected classification has the independent existential argument above. The pure classifier is an explicit unchanged trusted base; this proof does not establish classifier correctness. |
| ORC-003 | The proposal distinguishes authority, scheduling mechanics, synthetic evidence, credit change and limits. Full registered-oracle literacy remains an upstream adoption task. |
| ORC-004 | The synthetic domain and all 16 record kinds are stated. Candidate owner/input admission is unchanged; no generated product-history grammar is narrowed. Arbitrary job/host schedules are beyond this bounded proof. |
| ORC-005 | The exact scheduling hunk executes against controlled boundaries. No product entry point or browser result is claimed. |
| ORC-006 | First-completion-wins and stop-on-setup wrong designs are rejected. Timeout/setup/crash are not credited as law kills. ASR-1 has separate provider-fault witnesses. |
| ORC-007 | Not triggered by the bounded enumeration as such; no new important `oracleProperty` exists here. Required fixed/random product campaigns and budgets remain untouched. |
| ORC-008 | `position`, indexed units and minimum `killAt` are needed to distinguish lower-position late kills from first completion; the negative control demonstrates that distinction. |
| ORC-009 | Owner, unit, mutant, kill and baseline use package terms; canonical prefix and actual seconds are explicitly defined. |
| ORC-010 | Fails ASR-1 for initial/cleanup invalidation exceptions. Ordinary batch rejection and two-context wait/cleanup pass the independent pure witnesses. |
| ORC-011 | Independent any-owner reasoning and an all-owner classifier comparison challenge the new scheduler. The classifier itself is unchanged trusted machinery, outside this hunk's claim. |
| ORC-012 | This versioned review is tied to exact artifact hashes and records every requirement's disposition. No full bug-class closure or CI practicality claim is accepted. |
| ORC-013 | Adjacent no-kill/kill and earlier/later completion cases distinguish the scheduling boundary; negative controls reject incorrect stopping/winner rules. This is bounded scheduler evidence. |
| ORC-014 | Controlled unit outcomes and completion ordering are named premises. Real-host classification and CI timing remain receiving-evidence gates. |
| ORC-015 | Not triggered by a newly authored important generated property: this is a standalone bounded proof. Upstream generated scheduler coverage with declared reach remains required before framework-oracle acceptance. |
| ORC-016 | No ordinary test was added to a product oracle file. The scratch enumeration is labeled as bounded proof, not registered law evidence or a mutation kill. |

## Disposition before any repair

The early-stop classification and canonical-prefix design are supported by
source reasoning and the reproduced bounded proof. **The exact original
candidate is not accepted because ASR-1 remains open.** Repair and independently
recheck those exceptional paths before applying it. Preserve the original
finding and identities when recording any repair disposition.

After source acceptance, actual runner calibration, a bounded original versus
candidate real-host classification comparison with complete baselines and
identical inputs, and an integrated measured CI run remain separate gates.
The optional owner-priority plan and tier barrier were not implemented or
proved by this patch. This review makes no runtime change and leaves the
frozen reference campaign and its final NUL/execution/deletion audit pending.


## Revision 2 — ASR-1 repair disposition

Independent rereview, 2026-11-19. The raw finding and revision-1 rejection
above remain unchanged. Revision 2 is the immutable scratch proposal under
`/private/tmp/blygger-authored-scheduler-v2.fOEzUo/`; no installed runtime was
changed for this review.

| Artifact | SHA-256 |
| --- | --- |
| Updated proposal | `afb314db4769aae3f42330c1a4199994b6959a1b27e274a0777fcdab96a70795` |
| Original runner | `d2fce1610ab8bf4c61f6bd7bb1a567428cab062e48694cf44d63885256e2a247` |
| Revision-2 candidate | `1d60625dc3c46b7752ef36d6dd2467bf817c3d7c25c7c5b32a1403ad31f8d5bd` |
| Revision-2 patch | `a8c165b86858c61abf9a216f1ddb42d70ef838ef8d9e3bb97430b797683ad0bc` |
| Classification proof | `a1fa85b7bd2a00034d8f4258e4313e30a30635f1e21848cf9bf27f22447733fa` |
| Classification result | `d02e653bfb505d11a820f0b44c7ab962ec59d0898233ec7ce64f4221d37d3b21` |
| Author failure proof | `0e05cf59634efb74c9bc23e109407d9f36d04f5a9720429b219fb2a7062d1e2a` |
| Author failure result | `d8e247903ae37e3fd4148da8c127914908bcc2f9277294ade341f58d8c388086` |
| Independent fault matrix | `a0249bb50a86f23ca8f55b5d361d223ae593d87d8f758fd50a61b0e671f6a57c` |
| Independent matrix result | `c301b969b0b56a343e7c8067f059b33374fbfcb4a2f66e1b26bc4614f1d3cd0e` |

### Repair and independently executed evidence

Installation and initial invalidation now occur inside the protected scope.
The catch records a separate boolean as well as the raw thrown value, so
`undefined`, zero and other falsy values remain failures. The finally clears
the served patch before cleanup invalidation. A cleanup-only failure is
rethrown unchanged. A primary-only failure is rethrown unchanged after
cleanup. Both failures become `AggregateError([primary, cleanup], ...,
{ cause: primary })`, retaining their identities and roles. This also covers
synchronous exceptions during request preparation and batch dispatch, not
only asynchronous batch rejection. No result is accepted after these fatal
provider failures.

I reread both revision-2 proof sources and independently verified the hashes
above. I rechecked equality before the authored scheduling comment and after
the authored block; admission, baselines, selection validation and the
operator phase remain byte-identical to the pinned original. Candidate
`node --check` passed.

All independent outputs are under
`/private/tmp/blygger-authored-independent-v2-qfq43ef_/`. The following pure
executions used the exact candidate block and the pinned pure classifier:

- Reran all 73,728 classification schedules. The saved result exactly equals
  the author's revision-2 result, including 49,392 no-kill exhaustive-owner
  schedules, stable canonical credits and 11,904 avoided tasks.
- Reran the author's 27 failure cases. The saved result exactly equals the
  author's failure result. These use the exact original `eachSlot`
  all-settled helper, including initial/batch/cleanup faults, two/three
  contexts and simultaneous failed shares.
- Authored and ran a separate 130-case fault matrix. Its 125 single-context
  cases cover initial invalidation, synchronous batch throw, asynchronous
  batch rejection, cleanup-only failure and success. Primary values vary
  over Error, undefined, null, false, zero, empty string, object and
  function; cleanup values independently include Error, undefined, false
  and function. Every relevant assertion checks raw identity, ordered
  aggregate members/cause, batch suppression after initial failure, both
  invalidation attempts and a cleared served slot.
- The remaining five independent cases fail each possible slot in two and
  three contexts, delay other completions, and verify the phase stays
  pending, clears the failed slot immediately, then clears every slot before
  returning the intact primary/cleanup aggregate. The exact original
  all-settled helper is extracted and executed here too.
- The same independent matrix rejects revision 1 with exit status 1 at its
  first retained served-patch assertion. The failure is preserved in
  `v1-negative-control.log`; no passing repair evidence is credited to
  revision 1.

`independent-fault-matrix.mjs`, `independent-fault-matrix.json`, both replay
results, `identities.json` and `rereview-summary.json` are retained in that
scratch directory. No browser execution or campaign-output write occurred.

### Current acceptance and limits

**ASR-1 is resolved for the exact revision-2 candidate above. Source/design
acceptance is granted for this authored scheduling hunk and its bounded
classification claim.** The ORC-010 disposition for revision 2 now passes the
challenged per-slot failure/cleanup boundary. The other checklist assessments
above continue to apply, with the new failure witnesses extending ORC-006,
ORC-012 and ORC-013 evidence. This acceptance does not erase the revision-1
finding or accept revision 1.

The original phase helper still waits for all contexts, then throws the
first rejected share in context order. Revision 2 preserves the aggregate
within each failed share; it does not aggregate every context's failure into
the one final thrown value. This existing phase selection is explicit and
unchanged. The accepted ASR-1 repair makes no broader concurrent-error
collection claim.

Later-owner credits remain intentionally limited to the canonical prefix,
while actual returned execution seconds include in-flight later units.
Reordering owners or composing this hunk with another scheduler change needs
its own exact-source review and calibration; this acceptance does not cover
that composition. Upstream registered scheduler-oracle acceptance, actual
runner calibration, original/candidate real-host classification comparison,
complete candidate-runtime baselines and measured integrated CI duration
remain separate gates. The frozen full reference campaign and its NUL,
execution and deletion audit remain pending and untouched.
