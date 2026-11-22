# Lazy selected-suffix validation proposal

This is a scratch source proposal against `@tanstack/oracles` commit
`97a4e7a8e4b870c269bff297a16bf8435d258640`. It has not been installed or used
for a product/browser campaign. The frozen formatting reference must finish
with its original runner and 402 runtime inputs unchanged. Synthetic checks
below establish bounded scheduling properties, not mutation closure or a CI
runtime improvement.

## Work being deferred

The reference's two complete baseline passes contain 4,367 registrations in
14 owner files. The installed runner also eagerly validates 84 distinct
selected suffixes: fresh unmutated copies of an owner file, beginning at its
first reaching test. Those copies executed 70.759 minutes of serial test work
in the preserved capture, in addition to the two baselines. The measurements
and receipt definitions are in [the partition proposal](ci-partition-proposal.md).

A suffix validation proves that an execution optimization can reproduce the
full-file baseline. It does not introduce an additional law. If no mutant
ever uses a particular suffix, no execution relies on its reproduction proof.
Deferring that unused proof therefore does not remove a baseline registration,
law, history grammar, calibration or per-campaign budget. Every suffix that
is actually used must still pass the complete existing gate first.

## Two separately reviewable layers

**Layer A, lazy validation:** remove eager suffix planning and its second-pass
`checkShare` work. Keep both full `runAcross(files, 1)` and
`runAcross(files, 2)` calls. On the first request for a nontrivial suffix, run
one unmutated fresh-copy validation and memoize its reproduction decision.
The phase metadata records zero eager selections and
`selectionMode: 'on-demand'`; zero eager selections must not be reported as
zero total validations.

The candidate keeps `selectionOf`, `selectionId` and `reproduces`
byte-identical to the installed runner. A suffix is usable only if its run
does not time out, the actual `outcomeOf([run])` is `survived`, and every
selected row matches the first full baseline's `hash`, `observed` and `calls`.
A missing or mismatching row rejects the optimization. Background reach, no
reaching test, or reaching the first test already require the whole file and
need no suffix validation. Second-pass nondeterminism classification remains
independent of this gate.

The on-demand call is a **one-item `unitsBatch`**, with `mutant: null`,
`spec: 'selected'`, the original `limitFor(file)`, and `stopOnKill: false`.
That is the fresh-copy primitive used by the old eager checks, including its
capture setup and imported-module reset. It avoids broadening reliance on
the old rare lazy fallback's `unit` call on the original file.
`unitsBatch` retains responsibility for context replacement on timeout.
An internal rejection propagates; it is not converted into a successful run
or silently treated as a reproduction mismatch.

**Layer B, operator owner waves:** defer request preparation, including
`selectionFor`, until its owner position is needed. Layer A alone does not
achieve this: the original `runOwners` prepares every owner request before
calling `unitsBatch`. Consequently it can validate an expensive later suffix
even though an earlier owner subsequently kills that mutant and its later
mutant execution is skipped.

The second layer prepares and runs one owner position across the active
mutant group, then checks its settled records before preparing the next
position. Only the unchanged `kills` predicate can prune a later position:
the unit must be present, unskipped, uncut and classified as a behavioral kill
by the real classifier with baseline nondeterminism supplied. Random-only,
calibration, reach-only, nondeterministic, crash and timeout evidence cannot
authorize pruning. A survivor still prepares, validates where necessary,
and executes every required owner in the supplied order.

The final canonical reduction and cut-confirmation code are byte-identical.
In particular, a cut is not eagerly confirmed between waves: a later owner
may supply a valid kill that makes that earlier confirmation unnecessary,
just as in the installed runner. Without such a later kill, the original
confirmation order and remaining-budget accounting still apply. The authored
phase is unchanged by both layers.

## Promise and slot trace

The shared `selectionChecks` map is keyed by the exact existing file/suffix
identity, not the requesting mutant or context.

1. The first caller sees no entry, starts the async validation, and stores its
   in-flight promise in the same synchronous turn before another caller can
   start a duplicate request.
2. A caller on another context requesting that same suffix awaits the stored
   promise. It does not run another validation. Distinct suffixes receive
   distinct entries and use their own requesting slots.
3. The owning slot awaits validation before it submits its mutant wave. A
   single slot does not execute a validation and a mutant simultaneously.
   Other contexts may continue independent work while awaiting the shared
   gate; sharing a decision does not share their patch state.
4. A mismatch or validation timeout resolves to `false`, which is retained
   for subsequent callers; they all fall back to whole-file execution.
   A timeout's owning context is replaced by `unitsBatch` before that slot
   continues. An internal failure rejects the shared promise and propagates
   to its waiters.

These statements concern the existing single JavaScript orchestration loop
and its context slots. They do not establish isolation of an OS clipboard,
application state or any other external browser premise. The separate
clipboard/host gates in the partition proposal still apply.

## Immutable scratch packet and bounded checks

All files below are under
`/private/tmp/blygger-lazy-selection.ze0gEW/`. Patches target upstream's
`packages/oracles/oracle-gaps/check.mjs`; none targets an installed file.

| Artifact | SHA-256 |
| --- | --- |
| `check.original.mjs` | `d2fce1610ab8bf4c61f6bd7bb1a567428cab062e48694cf44d63885256e2a247` |
| `check.lazy-only.mjs` | `782563b2a6297df9f3ca87cd4b13496d51bea3802f065bf12fe08a90a0311dc6` |
| `lazy-only.patch` | `8a745c81985d088d03d00ec9c0d1658b7e16be97b7c21716a01c56a99bb057a0` |
| `check.lazy-waves.mjs` | `79feae0b3c21dbbbe5ac834bc6ac531886e3282f2661b4ab2f4aa3d2f7884f61` |
| `lazy-waves.patch` | `40e2563179ead1b2da97102e5e9a41c492ab2d0960465d3bd901d2ea15895dc4` |
| `waves-after-lazy.patch` | `56c31f024a1230263028cc1237a76d21ed4b919d9e8d284e65fd31fef8a6517f` |
| `synthetic.test.mjs` | `e0db23ae9ce94f23791fc239cd3d19e2248afaa1ce5303eaae2b2a6a1dff5ea2` |
| `synthetic.tap` | `544b4ccd599344dbc680e1d0b552c1ab2e8e3bc8327bdbeda7fd68766ff242c2` |
| `manifest.json` | `230d6544ca8e801156e1ba3bb26e2265e5e1a36d95b86ca24c630df2c7f0f4ce` |

Executed on Node `v24.19.0`:

```sh
node --test /private/tmp/blygger-lazy-selection.ze0gEW/synthetic.test.mjs
```

All **28 registered checks passed**, with zero failures, skips or
cancellations. They extract the candidate functions and import the installed
real `outcomeOf` classifier, using synthetic unit/slot records. They cover
shared in-flight deduplication, distinct suffixes, each reproduction field,
missing rows, timeout/context replacement, internal rejection propagation,
earlier kills, all-owner survivors, cut/later-kill confirmation behavior,
nonkill classifications and mixed mutant groups. The differential check
compares **500 deterministic mixed-status groups** against the installed
owner algorithm for canonical outcomes, actual owner executions and
confirmation accounting. Static checks preserve both complete baseline calls,
the exact reproduction gate, final reduction and authored phase. Both
candidates also passed `node --check`.

These are source-extracted scheduling checks, not actual Vitest worker,
capture-reset, browser, app, clipboard or full gap-run evidence. In particular,
a synthetic timeout does not prove that a real browser process was replaced
and released correctly. Independent review and real integration remain owed.

The authored scheduler candidate was applied in a separate scratch
composition only. Its input candidate hash was
`988de4382e2a659d0d77c30421b80e24ec87827f8cc4ba35617d3d51ee784e42`;
the composed runner is
`composition/oracle-gaps/check.mjs`, hash
`9ce000c7400c76685b69a3753b66a10bc5d8fa22222ac4a63c8d7face7826511`.
`git apply --check` and `node --check` passed. Functional composed checks
remain pending. The separate
[authored scheduler review](ci-authored-scheduler-review.md) identified ASR-1,
an invalidation-exception cleanup/failure-preservation defect; this composition
does not resolve it and must not be adopted as an accepted combination.

## Shared explicit owner priority

The lazy-wave candidate preserves its supplied owner order. It contains no
timing-driven reordering. The separate
[shared `--owner-order` proposal](ci-owner-order-proposal.md) can feed
`orderedOwners(st.targets.oracleTargets)` at the operator `filesOf` seam and
the authored scheduler's owner list. Keep the ordinary tier unchanged unless
its separate contract is explicitly reviewed.

That option must be valued, validated against declared package oracle paths,
and reject unknown, outside-package and duplicate paths. With no option, the
existing order must remain unchanged. A supplied list must append every
unlisted eligible owner canonically, so priority never excludes an owner.
The normalized static list and resolved identity must enter options/run
identity, recorded results and the conservative global unit-cache input hash.
Baseline paths/order, registration identities and ambient seed behavior must
remain unchanged. The helper's patch is a separate artifact,
`/private/tmp/blygger-owner-order.4FbC6XYn/owner-order.patch`, SHA-256
`e82aee22b5e2635454660837e285fd07cee0a1c15132b2012f684653cbabbefa`.
Its author reports 14 synthetic checks, including extraction of the actual
run/cache identity expressions. Independent acceptance and composed checks
remain separate gates. This patch is not included in the immutable candidates
above.

Preserved duration evidence may inform a priority list offline. The resulting
list must become an explicit recorded input before a run. Live elapsed times
must not decide owner ordering. Different priorities can change the first
killing law or credited prefix, which requires a reviewed report contract and
evidence comparison even if the final killed classification agrees.

## Cost bounds and adoption gates

The gross removable work is validation of suffixes no mutant requests after
valid earlier kills. It is **not** all 70.759 minutes. If all suffixes are
requested, validation savings can be zero. One-item validations and owner
waves can add setup/batching overhead, and eager validation overlapping idle
contexts can outperform lazy validation in wall time. These layers do not
reduce the authored replay cost. No benchmark or minutes-scale bound is
established by this proposal.

Before any integration or upstream adoption:

1. Close independent source reviews and exception/cleanup findings, including
   composed scheduling behavior and the shared owner-order/cache identity.
2. Finish and preserve the unchanged full reference. Retain its complete
   baseline, 427-operator and 75-authored inventory, raw captures, survivors
   and loss audits. Partial operator evidence cannot establish full closure.
3. Run a complete same-pin comparison with matching runtime hashes, laws,
   registrations, constructions, budgets, seed, mutation identities and
   payloads. Keep both baseline receipts and the nondeterminism comparison.
   Validate each actually used suffix through the unchanged gate, including
   fresh-copy capture/import reset and timeout replacement in real workers.
4. Export requested/validated/rejected/unused suffix counts and the actual
   executed owner/kill witnesses. A pruned owner has no execution verdict;
   do not fabricate passing rows or exhaustive law credits for it. A survivor
   must still exhaust its required owners. Review classification, law,
   checkpoint, confirmation and failure-fidelity deltas individually.
5. Measure a cold complete run on an isolated Linux host with explicit
   contexts, profiling and browser identity. Verify application/clipboard
   premises and cleanup, then report wall time and total work separately.
   Keep the partition proposal's isolation and fail-closed evidence gates.
6. Keep the pending `Draft.accept` enforcement gap and its proposed fix
   separate. A scheduling improvement does not close that oracle gap or
   authorize changing the frozen runtime before reference completion.

The 402-file frozen runtime manifest was checked before and after writing
this document; every hash matched both times. The nine immutable packet
hashes and three local document links above were also verified. Documentation
edits are outside that runtime manifest.
