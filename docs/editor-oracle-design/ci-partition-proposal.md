# Preserving formatting oracle coverage while reducing CI time

This is a source review and an execution proposal, not a benchmark or approval of a new runner. No campaign, browser, container job, or test was launched for it. The active one-context campaign and its inputs were left unchanged. The installed package is `@tanstack/oracles@97a4e7a`; the reference input manifest is `build/formatting-oracles/final-current-chromium-integrated/pre-inputs.json` (402 files, SHA-256 `7775e8e70909566c1178ea914e08d215d830e69ef4498c7c868f2eefab5f45ab`). Base HEAD is `28b0c8d642a87e5810ad6eabd95c2d1714c53396` with the uncommitted oracle work included in that manifest.

The smallest change that retains automatic discovery is one complete CLI run with supported `--contexts N`, after establishing a host-wide clipboard exclusion boundary. Exact mutation partitions on separate VM jobs are a useful second option for this frozen corpus, but the pin has no public mutation planning command: a manifest made from this reference cannot silently cover later source changes. Selecting oracle families is not an equivalent partition of the integrated campaign.

## Measured work and realistic cost bounds

The immutable first and repeat capture sets are indexed in `loss-audit/final-current-integrated-baselines.json`. Each contains 4,367 passing registrations in 14 files, including 77 calibrations and 1,482 determinism registrations. Their registration key sets agree and the recorded observation/hash comparison has no delta. These are baseline receipts, not a completed mutation report.

Durations below sum `ms` only for actual pass/fail test rows, excluding skip rows and background/file receipts. Skipped rows can contain elapsed timestamps rather than execution costs. The selected-suffix batch is one capture, `preserved-live-captures/run-94017-29.jsonl`, containing 84 temporary owner-file copies; it must not be mistaken for 84 capture files.

| Family | Registrations in each baseline | First baseline minutes |
| --- | ---: | ---: |
| code-block | 315 | 0.251 |
| draft | 40 | 0.011 |
| inline | 330 | 0.172 |
| interactions | 195 | 2.468 |
| keyboard | 1,762 | 0.350 |
| line-break | 171 | 0.088 |
| links | 363 | 0.139 |
| list | 411 | 0.098 |
| mixed | 186 | 2.694 |
| navigation | 60 | 2.088 |
| receivers | 216 | 4.479 |
| session | 138 | 1.431 |
| valid-input | 19 | 0.044 |
| workflows | 161 | 2.167 |
| **Total** | **4,367** | **16.481** |

The repeat baseline executed 15.943 minutes. The 84 selected suffixes actually executed 70.759 minutes, with a largest copy of 4.445 minutes; the earlier 72.58-minute estimate used first-baseline timings. Mixed contributes 19.868 minutes of actual suffix work, interactions 14.406, receivers 11.419, workflows 8.346 and session 8.060. These checks establish that a shortened owner-file execution preserves baseline observations and calls; removing them is not ordinary parallelization.

The completed operator stream contains 427 operators taking 191.482 reported minutes in aggregate, with a largest reported mutant cost of 5.256 minutes. Source partitioning is extremely uneven:

| Operator source | Mutants | Reported operator minutes | First-baseline reaching-owner union minutes |
| --- | ---: | ---: | ---: |
| `src/ui/format-shortcuts.ts` | 367 | 185.145 | 14.163 (11 files) |
| `src/ui/links.ts` | 51 | 1.069 | 5.001 (3 files) |
| `src/ui/draft.ts` | 9 | 5.268 | 6.577 (3 files) |

The unchanged authored directory adds 75 mutants: 41 formatter, 20 authoring, ten links and four draft. Its final runtime is still unknown in this review. The complete intended universe is therefore 502 mutations, not the progress display's 427 operators.

For scale, hold these local service times fixed, assume perfect packing, allow the repeat baseline and suffix validation to share their phase as the CLI does, and ignore authored work, contention, browser setup, lease waits and installation. The resulting optimistic phase floors are approximately:

| CLI contexts | First baseline floor | Repeat + suffix floor | Operator floor | Total before authored work |
| --- | ---: | ---: | ---: | ---: |
| 2 | 8.24 min | 43.35 min | 95.74 min | 147.33 min |
| 4 | 4.48 min | 21.68 min | 47.87 min | 74.03 min |
| 6 | 4.48 min | 14.45 min | 31.91 min | 50.84 min |
| 8 | 4.48 min | 10.84 min | 23.94 min | 39.25 min |
| 12 | 4.48 min | 7.23 min | 15.96 min | 27.66 min |

These are scenarios based on one local macOS run, not Linux CI forecasts or guarantees. More contexts do not by themselves establish a short CI run. A Docker Linux aarch64 engine with 18 cores and 8 GB has been observed read-only, but no cold Linux execution has established timings, clipboard behavior, or a safe context count there.

## Option A: complete discovery, concurrent contexts, clipboard exclusion

The supported command is the current wrapper with a trailing `--contexts N`, without `--oracle`, `--only`, `--sample`, or test replay filters. The wrapper appends user arguments after its defaults and the CLI parser uses the final occurrence. Thus all existing laws, files, source scope, seed `20261118`, budgets, fixed/random campaigns, constructions and calibrations stay present. Each CLI context owns its patch state and one Vitest worker; each receiving history creates its own BrowserContext, item and IP. This avoids multiplying the complete baseline and suffix work across CLI processes and avoids maintaining an external mutation manifest.

Native clipboard delivery is the unresolved shared resource. `workflow-driver-oracle.ts` uses native `navigator.clipboard` and `ControlOrMeta+v`. BrowserContext isolation, separate BrowserServers, separate browser processes, and separate containers on one desktop session do not prove separate OS clipboards. Keep independent jobs on separate VM/OS sessions unless stronger isolation is demonstrated.

A reviewed alternative on one OS is a single host-wide lease used by **every** clipboard writer/reader in every participating process. A loopback HTTP lease service or an atomic file lease can provide cross-worker exclusion; an in-module promise/mutex cannot. Hold the lease from before arranged clipboard writes through the actual production read or native paste completion and its receiving observation, including fallback/cancellation cleanup. Holding it for an entire clipboard-owning history is simpler to audit than releasing it between actions. Release in `finally`; owner identity, liveness and crash recovery must prevent both deadlock and two simultaneous holders. A timed-out holder cannot merely be presumed dead while its browser operation continues. Run unrelated clipboard users on a different OS session.

Lease acquisition belongs in harness scheduling where possible. Queue waiting must not silently consume the existing per-test deadline, extend a production/host operation deadline, or convert a real hang into a pass. If the available API requires acquisition inside a timed test, establish a safe context count with the existing limits and report contention separately; do not raise limits merely to conceal queueing. Preserve native delivery assertions, permissions, denied/cancelled cases, empty clipboard cases, and all replay routes. Synthetic clipboard events cannot substitute for the native witnesses.

Before adoption, use a distinct isolated host/output directory, profile a cold full run with `ORACLE_GAPS_PROFILE=1`, and compare it against the completed reference with the acceptance gates below. Start with a measured context count suited to the runner's CPU and memory; core count alone is insufficient. The current reference must finish unchanged.

## Option B: exact mutation partitions on isolated VM runners

The pin supports `--only <comma-separated ids>` but has no `--shard`, `--list-mutants`, baseline-only run, or public baseline import/reuse command. `report.mjs` assigns operator keys before filtering by ID. Keeping the **same complete source list and discovery of all 14 files** retains mutation numbering, keys, static owners, and each mutant's candidate reaching-owner order. Each job should use the default wrapper mode, an explicit identical `--contexts 1` initially, and its assigned `--only` list. It must not also select a family. Each job gets its own VM/OS clipboard, disposable app, BrowserServer, harness and output directory.

Conceptual command for one such job, not executed here:

```sh
ORACLE_GAPS_PROFILE=1 npm run test:formatting -- --browser chromium --contexts 1 --only '<the exact assigned IDs>' --out 'build/formatting-oracles/shard-01'
```

An exact partition is a cover of mutation identities, not a sample. Use the frozen full report as the identity planning input only after it finishes. Record each ID, stable key, source, operator/authored kind, and original/replacement or authored payload hash. Obtain owner-file evidence separately where needed: operator `oracleFiles` records reaching owners, not the entire static owner set, and authored result rows do not export a complete owner plan. Retained run profiles/captures can show executed owners, but cannot certify a missing static owner. A supported planning export is preferable to reverse-engineering that relation. Assign every identity to exactly one job. Greedy cost balancing over observed mutant cost is a starting point, with an additional cost for each newly introduced owner baseline and unique selected suffix. Do not balance simply by ID count, file size, or source file. Keep all authored mutants in the universe; isolate expensive authored items only when their final timing is known.

There is unavoidable repeated work: with `--only`, `check.mjs` runs both baselines for the selected mutants' **static owner-file union**, rather than consuming another job's baseline. It also validates the needed selected suffixes. The table above measures reaching-owner unions, so it is a lower estimate of that baseline overhead when static owners include unreached files. A broadly mixed shard can still need nearly all 14 files and most of the suffix work. Eight perfectly balanced operator-only shards would have about 23.94 operator minutes each, but that is not a 24-minute end-to-end job. At one context, duplicated baseline/suffix work can dominate. Compare predicted sum/max costs for candidate bins before paying for a large matrix; report both wall time and total runner minutes. Combining VM partitioning with contexts N is a later, separately measured choice and reintroduces the clipboard lease requirement inside each job.

**Freshness is a hard gate.** This reference can safely furnish selectors only for exactly its hashed runtime inputs. IDs alone are not a future-proof universe: a new branch or statement can add, remove or renumber operators. Unknown `--only` values silently match nothing. Matching old IDs or obtaining 502 total rows does not prove a changed corpus is complete. For future source/oracle/package changes, reject the stale plan and obtain a fresh complete universe. The smallest robust upstream addition would be a supported static plan/export API with exact identity and payload hashes, plus a fail-closed selector check. Until that exists, refreshing from an unfiltered completed report is supported but expensive. Do not call internal analyzer functions or invent a dry-run mode and present it as a supported interface.

## Why family jobs and baseline caching are not the first choice

The wrapper's `--oracle` changes much more than scheduling. It changes the discovered test file, source list, receiver mode, and context defaults. For example, the default operator scope is formatter + links + draft, while receiver/workflow/navigation family modes can include `authoring.tsx`. Repeated IDs then need not denote the same mutation universe, ownership differs, and default receiver-dependent paths differ. Summing family kill counts can both duplicate mutations and miss the integrated observation boundary. Even forcing `--source` to the default list does not restore the missing owners or receiver mode. A family matrix needs a separately designed owner×mutation composition proof; it is not the small change proposed here.

The supported daemon stores units using imported module hashes, package/lock/config hashes, Node, seed and execution settings. The pin explicitly excludes `fs` reads, environment values other than the seed, and new files changing module resolution from its cache guarantee (`check.mjs` opening contract). This repository supplies browser endpoint, engine, application origin/cookie and external app state through environment/host resources. Reusing a cached baseline across disposable hosts is therefore unvalidated. Copying evidence files between VM paths is also not a public baseline import API. Keep cold reports as evidence and do not use a daemon cache to avoid these baselines without an upstream, reviewed external-input identity contract and cold-versus-reused comparison.

## Fail-closed aggregation and adoption gates

The wrapper already rejects provisional reports, baseline failures and reported nondeterminism. The CLI otherwise exits zero after a completed report with gaps. A CI aggregator must examine evidence, not just process status.

1. **Identity:** require one reviewed package pin, source/test/model/driver/mutant/config/lock/wrapper input digest, actual browser engine and binary identity, Node/tool versions, seed, budgets and declared flags. Output paths and the declared partition/context options may differ; all other differences fail. Normalize only each known checkout root in paths. Individual shard run IDs differ because `--only` is part of identity; do not expect them to equal the full reference ID.
2. **Exact mutation cover:** each job's result identities must equal its assignment; selector-only count checks are insufficient. Across jobs, the identity union must equal the expected plan, pairwise intersections must be empty, and there must be no extra, missing or unmatched identities. Check ID **and** stable key/payload hash. For this frozen corpus the intended cardinality is 427 operators + 75 authored; regenerate the whole plan after an input change rather than updating the count by hand. Authored `does-not-apply`, unowned warnings, blocked and missing results are not coverage.
3. **Baseline cover:** require both complete baseline receipts for every selected owner file, zero failures/skips, and no observation/hash nondeterminism. Across jobs the owner-file and registration-key union must cover the 14-file/4,367-key reference; verify the 77 calibration and 1,482 determinism registrations, construction/reach declarations, fixed and random routes and their budgets, and the mapped original unit/browser observations. Duplicated baseline registrations across shards are expected; deduplicate them for coverage but compare all repeated observations. Mutant assignment intersections remain forbidden. An owner file with no selected mutation still needs baseline evidence; the pin cannot add that with a baseline-only flag.
4. **Owners and selection:** retain all declarations for discovery. Each mutation must have the same expected owner set and the appropriate validated reaching/suffix evidence. Do not accept a kill from another file in place of an accidentally omitted owner baseline. Preserve raw started/closed receipts so the aggregate can distinguish real executions, valid mutant early stops, missing captures and skips. Baseline/test filters and ambient replay variables must be absent.
5. **Judgment:** require complete, nonprovisional reports and a clean ending for every job. A kill must name a registered law and a reproducible route. Setup failures, crashes, timeouts, framework errors, random-only/unregistered/agreement-only kills, nonapplying mutants and survivors remain gaps. Do not merge away classification disagreements or count the union of arbitrary failures as kills. Preserve every raw report and classify/review any difference from the completed reference; compare rejecting laws/checkpoints, not merely killed totals.
6. **Receiving and failure fidelity:** preserve native clipboard and actual app receiving checkpoints, permissions, empty/denied/cancelled paths, cleanup diagnostics and resource release. Stress the proposed lease/isolation boundary with competing arranged clipboard contents and prove each history receives its own premise. A setup mismatch is a failed isolation experiment, not a product kill. Establish a cold Linux run before setting a Linux CI deadline.
7. **Integrity:** record pre/post runtime manifests, raw captures, plan, per-job assignment, structured reports and aggregate checks. Require unchanged runtime inputs through execution. A cancelled job, lost artifact, undeclared rerun or changed input prevents aggregate acceptance. Keep known survivors visible until killed or their dead code removed; partitioning does not close them.

Random campaigns must remain real campaigns with the same generator, driver, check and budget. Do not demand that independently unseeded exploratory draws happen to be equal between different jobs; use the framework's recorded reproducible baseline observations/routes and compare the declared campaigns and replay evidence. A shard cannot omit its random registration because its fixed route already killed the mutant.

## Work that needs runner support rather than more CI jobs

Authored scheduling currently creates one item for every owning file and continues scheduling later owners after another owner has killed that mutant. A scheduler that stops remaining owner items only after a valid registered reproducible kill could save substantial work without dropping any mutant, law, history grammar or per-campaign budget. A separate source proposal is being reviewed; this document neither implements nor validates it. A kill must still outrank other owner timeouts, failures must retain their law/checkpoint, already running work must settle safely, and survivors must exhaust all owners.

Cost-aware choice of a cheap reaching owner before an expensive owner is also runner work. The pin forces canonical file order and derives reaching-owner priority from that order. Renaming files or changing Vitest sequencing would change registration identities/seeds and does not preserve the frozen corpus. A future scheduler should retain canonical reporting and baseline order while separately choosing an execution priority from measured owner costs. Validate classification/law differences rather than assuming a faster first kill has equivalent evidence.

Shared baseline planning could remove the repeated baseline/suffix critical path from VM partitions, but needs a supported evidence artifact that carries complete inputs, ownership/reach, external browser/app premises and determinism receipts. The current package supplies no such API. Parallel scheduling of the existing units is the immediate supported lever; removing repeated work safely is an upstream execution-design improvement, not permission to reduce oracle coverage.

## Recommended sequence

Finish and preserve the current reference. Prepare and review the clipboard lease, then measure the candidate complete cold Linux run with supported contexts N on an isolated host and profiling. A second six-hour serial Linux reference is not a prerequisite of this proposal. Adopt the candidate only after the complete identity/baseline/mutation comparison and Linux receiving/isolation checks pass; retain platform differences as evidence to review. This is the smallest maintainable path because discovery remains automatic and all baseline work is shared within one CLI run. In parallel, evaluate the authored early-stop and cost-aware owner scheduler proposals against the same reference; the measured workload makes them more promising than merely increasing the timeout.

If the measured result still misses the agreed CI budget, use cost-balanced exact mutation VM partitions for frozen inputs, with the fail-closed plan and aggregator above. Make supported fresh universe export and external-input-safe shared baseline evidence upstream requirements before relying on that partition scheme for routine source-changing PRs. Do not advertise a minutes-scale bound until the complete cold Linux measurement, authored costs, isolation stress and aggregate coverage checks establish it.
