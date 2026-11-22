# Upstream runner review for formatting CI

Read-only source assessment, 2026-11-19. The active reference remains pinned to `97a4e7a8e4b870c269bff297a16bf8435d258640`, with its 402 runtime inputs frozen. This review neither installs a package nor changes that reference. The latest main observed with `git ls-remote https://github.com/TanStack/oracles refs/heads/main` was **`6d05f05f8d1e74fd21c49e49775a313d4f371221`**. Its source was inspected in the unique scratch checkout `/private/tmp/blygger-oracles-upstream.ALAx4i/repo`; the conclusions below use exact upstream commit links rather than depending on that temporary checkout.

## What changed

Only two commits follow the installed pin:

| Commit | Change | Consequence here |
| --- | --- | --- |
| [`30928ee86005a7829af219b145fea9bfc35d13a9`](https://github.com/TanStack/oracles/commit/30928ee86005a7829af219b145fea9bfc35d13a9) | Constructed histories receive independent streams and multiple fixed/drawn bases. Generated units draw independently from the constructed list. | Changes the exercised histories and increases constructed-unit work by default. It is a coverage/replay migration, not a runner speed improvement. |
| [`6d05f05f8d1e74fd21c49e49775a313d4f371221`](https://github.com/TanStack/oracles/commit/6d05f05f8d1e74fd21c49e49775a313d4f371221) | Removes a stopped/aborted run's session directory, with supervision cleanup and live-process protection. | Improves cleanup. It does not reduce baseline, selected-suffix, operator or authored execution. |

The runner's `check.mjs` diff is limited to session-directory cleanup (12 added, 16 removed lines). Arguments, capture setup, classification, evidence storage and report selection are byte-identical to the installed package. The latest setup, design, review and evaluate-review skills are also byte-identical to the installed copies. The checklist's construction explanation changed to describe the new independent streams and bases.

**Updating the pin directly does not solve this campaign's long runtime.** No speedup has been measured, and the new default construction policy can make browser execution longer.

## Available controls and missing controls

The exact [CLI argument implementation](https://github.com/TanStack/oracles/blob/6d05f05f8d1e74fd21c49e49775a313d4f371221/packages/oracles/oracle-gaps/args.mjs) still supports flags `--daemon`, `--stop-daemon`, `--ordinary`, `--help`; positive counts `--contexts`, `--sample`, `--test-timeout`, `--hang-limit`, `--first-limit`, `--mutant-limit`; and values `--package`, `--source`, `--env-prefix`, `--seed`, `--mutants`, `--out`, `--only`, `--diff-base`, `--pool`, `--config`.

| Area | Latest source behavior | Evidence consequence |
| --- | --- | --- |
| Baseline-only | No supported option. `--sample 0` is still refused because sample counts must be positive. | No supported mutation-free gap-check mode was added. |
| Authored early stop | Every owning file is still queued for each authored mutant. `stopOnKill` stops within its current file; later owner-items are not skipped after a prior owner kills. | This campaign's lengthy authored replay is still present. |
| Authored streaming | Classification and gap streaming still happen after all authored owner-items finish. | A partial `results.jsonl` containing only 427 operators is not evidence that authored replay has stalled or finished. |
| Scheduling | Each context has one worker, `KeepOrder`, no transformed-module disk cache, and operator groups of four. Baseline paths are sorted; selected-suffix checks are distributed round-robin among context slots. | No new cost-aware scheduling or owner-priority control. |
| Contexts | `--contexts N` already existed. | Concurrency still needs actual clipboard/host isolation and complete evidence comparison; the new pin supplies neither. |
| Mutation sharding/listing | No `--shard` or `--list-mutants` flag. `--only` still narrows baseline coverage to selected mutants' owner union. | No new supported complete-baseline mutation partitioner or report merger. |
| Caching | Daemon evidence storage is unchanged and keyed by recorded inputs. A cold run's memory store serves no reuse. | Disposable browser/application inputs are not newly modeled; a safe warm-cache speedup here remains unestablished. |

The changed upstream `scripts/pr-shards.mjs` and `scripts/e2e-shards.mjs` partition **TanStack/oracles' own test registrations**, checked against `vitest list`. They do not add consumer mutation sharding to `oracle-gaps`. Upstream CI's framework self-oracle increased from eight to nine shards; those scripts cannot be presented as a drop-in partitioner for this repository's 502 mutations.

See the exact [runner implementation](https://github.com/TanStack/oracles/blob/6d05f05f8d1e74fd21c49e49775a313d4f371221/packages/oracles/oracle-gaps/check.mjs#L2525) and [evidence store](https://github.com/TanStack/oracles/blob/6d05f05f8d1e74fd21c49e49775a313d4f371221/packages/oracles/oracle-gaps/evidence.mjs).

## History and replay changes need their own audit

The new [construction change record](https://github.com/TanStack/oracles/blob/6d05f05f8d1e74fd21c49e49775a313d4f371221/.changeset/constructed-stream-independent.md) and [framework source](https://github.com/TanStack/oracles/blob/6d05f05f8d1e74fd21c49e49775a313d4f371221/packages/oracles/src/oracle-property.ts#L2435) specify:

- `histories.bases`: integer at least one, default **five**, for every constructed unit in each campaign.
- `histories.drawnBases`: integer at least zero, default zero; each construction may override its drawn count. Additional bases come from the logged run seed.
- A constructed history at index `k` uses its own stream at campaign seed plus `k`. Appending a construction preserves other streams; inserting one in the middle changes following construction streams.
- Generated units now use the property's arbitrary alone. Previously, half their draw distribution was made from constructions. Old generated-unit seed/path replays for properties with constructions no longer name the same history.
- Named fixed cases, calibration registrations and determinism registrations remain, but equal registration counts do not establish equal histories or observations.

The current project construction definitions use `build: () => ...` returning a named case, including the expensive mixed, workflows, receiving and navigation histories. Those builders do not consume a generated base. Under the new default they repeat the same named history five times per constructed unit; this does not create five distinct base-dependent histories. Using the supported `bases: 1` for such constant builders would avoid that new repetition, but it does **not** restore the old generated-unit mixture or its replay stream. It would need an explicit history loss audit against the frozen pin. Neither `bases` nor generated-run budgets were changed here, and no new coverage decision is implied by this assessment.

## Practical optimization candidates

These are proposals for runner work, not implemented fixes or measured speedups. Preserve the complete gap-check entrypoint, all 14 baseline files, both unmutated passes, required constructions, calibrations, determinism checks and the complete operator/authored inventory.

1. **Stop authored replay after a valid decisive kill.** Bring authored scheduling in line with the operator phase's existing early-stop principle: once a deterministic reproducible law rejects a mutant, retain that evidence and avoid dispatching its remaining owner files. A crash, calibration failure, timeout, nondeterministic rejection or unregistered route must not masquerade as that kill. Survivors must still receive every required owner. Keep all mutant IDs in the final inventory and distinguish unexecuted redundant owner-items from executed evidence. This targets observed repeated full-file work; it requires an upstream change because latest main still queues every owner.
2. **Choose inexpensive reaching owners first, without renaming files.** Preserve canonical file/test identities, seeds, complete baseline order and output order; make only mutation owner-dispatch order configurable or cost-aware. A cheap valid kill can avoid a long receiving history. Compare every changed disposition and credit only executed law rejections. Current config sequencing cannot achieve this because the runner and classifier impose their own ordering.
3. **Use additional isolated context capacity only after host premises are established.** More contexts are supported already, but native clipboard workflows need a demonstrated isolation/exclusion boundary. More CPU alone is insufficient. A future experiment must retain identical complete baselines and mutation inventory, with no weakened budgets or omitted clipboard histories.
4. **Add live authored progress separately.** Streaming completed authored classifications, owner-item counts and phase timing would make cost visible. It reduces uncertainty rather than execution time. It must emit each result once and never claim a mutant is final before its required evidence is complete.

Early stopping can change the set of extra owner-law credits even when the decisive classification is preserved. A comparative report must record that honestly. It cannot synthesize the omitted owner results or claim every former law witness was rerun. A runner self-oracle should cover overlapping owners, stable law rejection, random-only rejection, calibration-only failure, baseline failure, nondeterminism, timeout/crash, all-owner survivor, stale authored patches, concurrent dispatch and cancellation. Neither mutation partitioning nor a direct-Vitest exception is adopted as a workaround in this review.

## Evidence-preserving adoption plan

1. Let the current `97a4e7a` reference finish unchanged, retain its final baselines/captures/results and loss audits, and disposition the open `Draft.accept` enforcement gap separately. This review does not close it or apply its pending proposal.
2. If upgrading, follow the unchanged setup skill: pin **both** package URLs to `6d05f05`, refresh/recheck AGENTS and skill pointers, and rerun through the gap check. Proposed URLs are `https://pkg.pr.new/TanStack/oracles/@tanstack/oracles@6d05f05` and `https://pkg.pr.new/TanStack/oracles/@tanstack/eslint-plugin-oracles@6d05f05`. Package publication/installability was not tested here. Do not change the repository's TypeScript.
3. Separate framework history migration from scheduling optimization. Inventory old replay witnesses and constructions first. Preserve old generated witnesses as fixed histories where necessary, state the old/new construction budgets, compare reach and calibrations, and review every loss. Exact cross-pin observation-hash equality is not expected for generated units whose streams changed; explain those differences rather than normalizing them away.
4. For scheduling-only work, hold framework pin and all runtime/law/history inputs fixed in the comparison. Require exact complete mutant inventory; passing complete baselines and no added nondeterminism; retained law/calibration coverage; unchanged survivor dispositions unless stronger executed evidence explains the change; and a valid recorded law witness for every kill. Report owner-items intentionally not executed after a decisive kill.
5. Obtain a complete cold Linux CI measurement, with installation, browser setup, artifacts and cleanup inside the job budget. Record phase timings and compare the complete reference and optimized results before adopting the optimized runner or declaring the CI problem solved. A short selective challenge or green baseline is useful diagnostic evidence, but not acceptance of a complete campaign.

The latest setup skill still requires running oracles through the gap check and rerunning it after a pin upgrade. Design steps 7–9 require the evidence appropriate to the change, action on gap directives and a versioned evidence record. They do not provide a new baseline-only exception or certify an unmeasured runtime optimization.

## Verification and limits

This assessment performed Git/network reads and source/artifact inspection only. It installed nothing, launched no browser or oracle campaign, modified no runtime/test/package input or campaign output, and did not interact with main session 68835 or any VM lifecycle. All 402 frozen runtime hashes matched before and after the review document was written. Source inspection establishes what the new pin implements; runtime, package availability and safe adoption remain unmeasured.
