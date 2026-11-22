# Authored-mutant scheduling proposal

2026-11-19. **Revision 2; proposal only; not applied.** The installed runner, package pin,
oracle inputs and active campaign were not modified. This investigation used
read-only source inspection and isolated synthetic fixtures; no browser
campaign ran. It does not establish a practical CI duration yet.

The [independent review](./ci-authored-scheduler-review.md) found ASR-1 in
revision 1: initial invalidation could leave a served patch installed and a
cleanup invalidation could erase the original batch failure. Revision 1
remains rejected; its original artifacts and the review's raw witnesses are
retained. Revision 2 changes that exception boundary and awaits independent
rereview. The original proposal is also preserved as
`/private/tmp/blygger-authored-scheduler-v2.fOEzUo/proposal.v1.md`, SHA-256
`123e98a735d2b077a61354f66d074c01767186288cc5012a60cedc2f67a3156a`.

## Finding and authority

Pinned `@tanstack/oracles@97a4e7a` `oracle-gaps/check.mjs:2576–2629` flattens
every authored mutant's passing owner files into a shared queue. Although
the phase comment promises to stop at its first kill, the queue has no
predicate that skips remaining files after a kill. Every owner runs.

The package's design skill says: “Several oracles may own the same function.
A mutant counts as killed when any of its owners kills it.” `outcomeOf` in
`oracle-gaps/classify.mjs` implements that rule. Its registered reproducible
behavioral kill outranks timeout, agreement-only, random-only, unregistered,
crash, framework and setup outcomes. ORC-006 (checklist v1) and the review
skill prohibit crediting timeout/setup/runtime errors as law kills.

The operator scheduler already has a reusable `kills` predicate that rejects
`skipped` and `cut` units and calls `outcomeOf([unit], baseline.nondeterministic)`.
Its report uses owner evidence through the first killing owner in canonical
order. The proposal reuses that predicate and reporting precedent for
authored mutants.

## Minimal proposed change

Retain the existing declared owner order, all mutant admission/result code,
both complete baseline runs, baseline nondeterminism filtering, seeds,
budgets, whole owner files and their test order. Change only the authored
queue evaluation block:

1. Give each owner item its position and store returned units at that
   position, rather than appending in completion order.
2. Maintain the minimum position with a verified `kills(unit)` result.
3. Skip only queued positions strictly after that minimum. Earlier owners
   still run or finish; already dispatched later owners finish normally.
4. Judge the complete canonical prefix through the minimum killing position,
   or every owner when no verified kill exists. Refuse a missing required
   unit. Protect patch installation and initial invalidation, and always
   clear the slot's patch before attempting cleanup invalidation.
5. Preserve actual execution seconds, including redundant in-flight units.
   Timing never decides whether a mutant is killed.

Revision 2 records a thrown primary value with a separate boolean, so a
thrown `undefined`, `null` or other falsy value remains a failure. A sole
primary or cleanup failure is rethrown unchanged. If both occur, it throws
`AggregateError([primary, cleanup], message, { cause: primary })`. The first
invalidation is inside that protected region, and clearing the served slot
precedes the cleanup call. No error is converted into a law verdict.

The operative state change is:

```js
job.units = Array(job.targets.length)
job.killAt = Infinity

// Before dispatching { job, file, position }:
if (position > job.killAt) continue

// After the unchanged whole-file unitsBatch request:
job.units[position] = got
if (got && kills(got)) job.killAt = Math.min(job.killAt, position)

// After all slots finish:
const units = job.units.slice(0, job.killAt + 1)
if (units.includes(undefined))
  throw new Error(job.id + ': missing authored owner unit before decision')
const judged = judgeAuthored(units, baseline)
judged.seconds = job.units.reduce((sum, u) => sum + (u?.seconds ?? 0), 0)
Object.assign(job.result, blockedOr(judged, blockersOf(job.owners)))
```

The complete candidate, hash-guarded generation script and unified patch are
in `/private/tmp/blygger-authored-scheduler-v2.fOEzUo/`:

| Artifact | SHA-256 |
| --- | --- |
| Installed/original `check.mjs` | `d2fce1610ab8bf4c61f6bd7bb1a567428cab062e48694cf44d63885256e2a247` |
| Revision 2 `check.candidate.mjs` | `1d60625dc3c46b7752ef36d6dd2467bf817c3d7c25c7c5b32a1403ad31f8d5bd` |
| Revision 2 `authored-scheduler.patch` | `a8c165b86858c61abf9a216f1ddb42d70ef838ef8d9e3bb97430b797683ad0bc` |

Rejected revision 1 remains at
`/private/tmp/blygger-authored-scheduler.g9Fw2Z/`: runner SHA-256
`988de4382e2a659d0d77c30421b80e24ec87827f8cc4ba35617d3d51ee784e42`,
patch SHA-256
`3bd2a47b1ab4b7fc402d4fa4944bf55f6aaba6a1edd11b0d52ae6ec470019a9e`.

`propose.mjs` refuses a different installed hash and writes only scratch
copies. `node --check check.candidate.mjs` passed. Byte equality before and
after the authored block establishes that the two baseline calls and their
surrounding code, selected-tail checks, operator phase, authored admission,
result insertion, final report and all mutant IDs are untouched. This is
source-preservation evidence; the synthetic fixture does not execute the
two real baseline runs.

## Classification versus report credits

**Do not promise identical witness lists to the current all-owner runner.**
`judgeAuthored` currently aggregates every rejecting owner's `by`, `laws`
and `randomAlso`. Once a verified kill exists, obtaining all later credits
requires running all later owners. Skipping them and retaining exhaustive
credits are incompatible.

The proposal preserves the logical classification. A verified behavioral
kill decides `killed`; without one, all owners run and the complete existing
judgment remains. Passing changed observations still produce `not-judged`
and unchanged observations `not-observed`. There is no authored `new-law`
outcome in the installed classifier: a changed but unjudged observation is
the relevant law-gap case and cannot stop owner scheduling. Baseline
blockers still preserve a real kill and otherwise produce `blocked`.

The intentional reporting change is deterministic prefix credits. The
first killing owner means first in the recorded owner order, regardless of
which worker completes first. Earlier timeout/setup/crash records stay in
that prefix; they never become kills. Later in-flight units do not add
credits. Consequently `randomAlso:false` means no random-only failure in
the evaluated canonical prefix, not proof that every omitted owner would
pass. Timing remains diagnostic and can vary with concurrency, as it does
today. If exhaustive additional law/owner credits are needed for an audit,
retain the unmodified all-owner mode as a separate diagnostic run.

A naive “first completion wins” flag is unsuitable: two simultaneously
running killing owners can give different credit sets on different
machines. Taking the minimum killing position and waiting for earlier
owners removes that dependence.

## Synthetic proof and calibrations

`proof.mjs` imports the **actual pinned** pure `judgeAuthored`, `outcomeOf`
and `blockedOr`. It compiles the actual authored queue block extracted from
the original and candidate files, replacing only its worker/provider
boundaries with controlled synthetic unit records and completion order.
No browser, sleeps, campaign selection or reduced oracle budget is used.

Executed 73,728 schedules: all three-owner combinations of 16 record kinds,
six completion priority permutations, and one/two/three contexts. The record
kinds are passing, changed observation, two distinct registered behavioral
kills, reach-only, random-only, unknown route, plain assertion, calibration
failure, setup failure, production crash, whole-unit timeout, per-test
timeout, baseline-nondeterministic failure, skipped and cut records.
The entire enumeration was rerun against revision 2 and passed.

Results from `proof-results.json`:

- Every candidate `outcome` and survivor `class` matched the full all-owner
  `judgeAuthored` classification. Every no-kill result, including
  `changedTests` and error details, matched exactly apart from execution
  seconds and the retained fixture ID.
- All 49,392 schedules without a verified kill ran all three owners. This
  includes changed-observation, timeout, crash, setup and nonlaw outcomes.
- Canonical non-timing reports matched across every tested context count
  and completion priority for a given owner order and input.
- Actual seconds accounted for every executed unit, including redundant
  in-flight work. Across the enumeration, 11,904 queued owner tasks were
  avoided; these artificial counts predict no real CI speedup percentage.
- Explicit fixtures preserve baseline-blocked versus killed priority,
  reject missing required results, clear patch service on `unitsBatch`
  rejection, retain all four IDs in a multi-mutant run, and check each
  dispatched slot serves its own mutant's patch.
- Two deliberately wrong scheduler controls were rejected. First-completion
  winner selection changes credits across schedules. Stopping on setup
  returns `setup-error` and misses the later registered law kill.

Revision 2 also passes 27 controlled cases in `failure-proof.mjs`, executing
both the exact revised authored block and the original runner's exact
`eachSlot` all-settled implementation:

- Initial invalidation failure clears the patch, prevents batch dispatch,
  attempts cleanup, and preserves the original thrown value.
- Batch failure plus cleanup failure and initial failure plus cleanup
  failure preserve both raw errors in order with the primary as cause.
  Batch-only and cleanup-only errors retain exact identity.
- Raw and aggregate failure paths retain thrown `undefined`, `null`,
  `false`, zero, empty string, function and object values.
- Two- and three-context cases hold the remaining units in flight after
  the first context fails. The phase does not reject until those units
  finish and every served slot is clear. Primary and cleanup errors remain
  distinct after this wait.
- A three-context case with two rejected shares preserves the per-share
  aggregate at the `eachSlot` boundary. The original helper's phase error
  selection remains unchanged: after every share settles, it throws the
  first rejected share in context order. Revision 2 does not claim to
  aggregate every concurrent context's diagnostic into that final error.

The new failure proof rejects revision 1 with exit status 1 at the retained
served-patch check (`v1-negative.log`), reproducing the independent ASR-1
finding. No passing proof is credited for that version. Both proof scripts
accept an alternative candidate path and output path, allowing composed
scratch candidates to be tested without overwriting these receipts:

```sh
node /private/tmp/blygger-authored-scheduler-v2.fOEzUo/proof.mjs /absolute/composed-check.mjs /absolute/proof-results.json
node /private/tmp/blygger-authored-scheduler-v2.fOEzUo/failure-proof.mjs /absolute/composed-check.mjs /absolute/failure-results.json
```

Small distinguishing witness: owners `[timeout, behavioral kill, other
behavioral kill]`. Both versions classify `killed`. The original reports
both killing owners; the candidate reports the first canonical killing
owner, and can avoid starting the third. `[changed observation, pass,
pass]` instead executes every owner and remains `not-judged`.

This is a bounded scheduler proof and self-review, not new framework-oracle
acceptance, proof of every runner failure path, or a real-host/CI timing
measurement. Synthetic skipped/cut units deliberately carry verdict rows
to ensure those flags never trigger early stopping; their eventual
classification remains whatever the unchanged classifier decides.

## Optional cheaper-owner priority

Separate from the minimal patch, prefer an explicit stable owner priority
plan over a timing-dependent winner. For this repository the useful policy
is to try a directly judging component owner before browser interactions,
workflow/navigation and full receiver owners. This reorders only evaluation
of authored owner files. Baseline file order, individual test order, seeds,
the canonical order within each file's report and all owner obligations
stay unchanged. Unresolved mutants still run every owner.

The separate [shared owner-order proposal](./ci-owner-order-proposal.md)
supplies an explicit valued `--owner-order` option, validates package oracle
paths, binds its resolved static plan in options/run identity, and provides
`orderedOwners(files)` for both operator and authored scheduling. The
authored integration seam is
`targets: orderedOwners([...owners].filter(file => fileSpecs.has(file)))`.
With no option, incoming order stays unchanged; with an explicit prefix,
all unlisted owners are appended canonically. The priority list cannot
remove an owner. This integration is a separate scratch layer, not part of
the minimal authored queue patch or its enumeration.

Bind package/source/oracle hashes and the plan digest in runtime inputs and
the completed report. Unknown/missing/stale plan inputs should fail before
mutation scheduling. Report credits are canonical for that exact plan;
changing it can intentionally change which owner receives credit. There
is no claim of identical winner credits across plans. Baseline timings may
suggest a static plan for review; live timing-derived owner order is not
proposed.

**Ordering alone cannot prevent work already dispatched.** In the fixture
with owners `[pass, pass, kill]`, moving the killing owner first reduces
started tasks from three to one/two/three with one/two/three contexts. At
three contexts all owners start before the result returns. A cheap-owner
priority therefore has its strongest effect with a separate dispatch
barrier: first run the selected cheap owner (or cheap tier) per mutant;
enqueue its remaining owners only if it supplies no verified law kill.
Keep parallelism across different mutants. A cheap-tier timeout or failure
must release the remaining owners, never decide the mutant. This can delay
a later decisive owner by the cheap tier's existing timeout budget, so it
needs its own scheduling test and measured comparison. That larger barrier
is design-only here; it is not in the candidate patch or the proved claim.

The operator phase has a separate eager `selectionFor`/owner-request
construction issue. This authored-only patch changes neither that phase
nor selected-suffix validation; an independently reviewed owner-wave
proposal may compose with it. No baseline or generated history may be
omitted to manufacture a speedup.

## Adoption and calibration gate

Prefer an upstream runner patch with scheduler/classifier oracle coverage.
It avoids maintaining a private package fork and lets the maintainer decide
the report-credit contract. No issue, message or patch was sent upstream.

If a temporary repository override is authorized before upstream adoption,
use the existing exact package pin and an explicit local patch procedure
that verifies the entire runner SHA-256, applies only the reviewed authored
hunk, checks the resulting hash/syntax, and records both original/patched
hashes in the runtime manifest. Refuse a changed package instead of applying
a fuzzy patch. Avoid an untracked manual `node_modules` edit or a silent
postinstall mutation. Remove the local override when an upstream pinned
version supplies the same reviewed behavior.

Before adoption, add upstream generated scheduler checks for multiple jobs,
canonical prefixes, all failure kinds, lower-position late kills,
mixed owner/blocker sets, missing results, cleanup and actual timing
accounting. Require negative controls for first-completion wins and
stop-on-any-failure. Then compare a bounded real-host authored inventory
using the original and candidate with identical inputs, seeds, complete
baselines and budgets; compare every mutant ID and classification, inspect
registered law receipts, and explicitly approve the intentional credit-set
change. Benchmark operator, baseline, authored and receiver costs
separately. Only a completed integrated run with the reviewed runtime can
establish whether CI is practical. The current active campaign remains
evidence for its original runtime only.
