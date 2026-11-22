# Complete formatting baseline: partial timeout

The historical 617-file snapshot’s complete 16-file, two-pass Chromium baseline **did not finish within its 25-minute measurement limit**. It recorded 5,251 of 5,605 expected first-pass registration keys; the second pass never started. Independent review accepted the source binding, partial-result accounting, resource limits and post-timeout containment. Complete baseline acceptance and routine CI runtime remain unproved.

The [machine-readable receipt](ci-full16-timeout-049b5a7.json) binds the exact public source, package, expectation inventory, raw artifacts, prior failures and independent review by SHA256. The earlier [312-registration smoke](ci-file-pass-smoke-049b5a7.md) remains a separate accepted, narrower run on source before the owned-fixture cleanup patch.

## What executed

The final wrapper requested all 16 files and 39 properties twice, with seed 20261118 and unchanged history budgets. There was no file, property, history, replay or test-name filter. This was a baseline-only route through the gap-checking runner; no mutation audit ran.

Thirteen completed first-pass file receipts contain 4,362 passing registrations with exact expected keysets and no failed/skipped tests, setup errors, unhandled errors or file timeouts. Interrupted mixed-history and valid-input captures contain another 885 and 4 passing rows, respectively. These captures end on valid complete JSON lines but lack file-closure records; their rows cannot prove file completion or absence of later errors.

| Oracle file | Expected first pass | Recorded passing keys | Unrecorded | File receipt |
| --- | ---: | ---: | ---: | --- |
| `editor-bracket-receiver.oracle.test.ts` | 18 | 18 | 0 | Complete |
| `editor-code-block.oracle.test.ts` | 322 | 322 | 0 | Complete |
| `editor-draft.oracle.test.ts` | 40 | 40 | 0 | Complete |
| `editor-escape-layers.oracle.test.ts` | 32 | 32 | 0 | Complete |
| `editor-inline.oracle.test.ts` | 330 | 330 | 0 | Complete |
| `editor-interactions.oracle.test.ts` | 195 | 195 | 0 | Complete |
| `editor-keyboard.oracle.test.ts` | 1762 | 1762 | 0 | Complete |
| `editor-line-break.oracle.test.ts` | 171 | 171 | 0 | Complete |
| `editor-links.oracle.test.ts` | 363 | 363 | 0 | Complete |
| `editor-list.oracle.test.ts` | 749 | 749 | 0 | Complete |
| `editor-mixed.oracle.test.ts` | 1063 | 885 | 178 | Incomplete |
| `editor-navigation.oracle.test.ts` | 60 | 60 | 0 | Complete |
| `editor-receivers.oracle.test.ts` | 182 | 182 | 0 | Complete |
| `editor-session.oracle.test.ts` | 138 | 138 | 0 | Complete |
| `editor-valid-input.oracle.test.ts` | 19 | 4 | 15 | Incomplete |
| `editor-workflows.oracle.test.ts` | 161 | 0 | 161 | Incomplete |
| **Total** | **5,605** | **5,251** | **354** | **13 of 16 complete** |

All 5,605 second-pass keys remain unobserved. The runner wrote no final `results.json`, normalized pass-capture checksums or final application-topology receipt. Cross-pass observation equality therefore remains unproved. The 5,605-key expectation was independently derived from the measured historical source: all 4,383 historical keys survive, with 1,222 additions. The earlier historical reference was corrected before completion without changing source, seed or budgets.

## Source, resources and cleanup

This measurement and its 5,605-key expectation apply only to the frozen 617-file source. The later selected-ancestry extension changes four oracle/model files; the exact measured preimages and excluded later postimages are below. This record establishes no runtime result, current registration inventory or current-branch correctness for those postimages or subsequent production changes.

| Later-changed path | Measured preimage SHA256 | Excluded later oracle postimage SHA256 |
| --- | --- | --- |
| `test-ui/editor-list.oracle.test.ts` | `349ba9ddf59945f3f32793d5b3f5efd0076606ba55775d054078b36daf7255d9` | `b885662e67d6ca7f928edfdfda6d307e6a08d892f4c698b1df46f3b5ae444de5` |
| `test-ui/editor-oracles/list-model-oracle.ts` | `59acc0dd484822262b114c578002eee579e5724368fb49c20d1c7a6f23968edc` | `f9a152339a43859dabb6e8d8886c8c8b53fe26172a34b2575404a02c1ed56799` |
| `test-ui/editor-mixed.oracle.test.ts` | `873b23b0b0959d0e59b397d92620961454ad17db405f7b256348d8b59f7668ba` | `fdee752da2400945bb32b97a33abe364b0718a623f65bc7c5fcc9700be97e145` |
| `test-ui/editor-oracles/mixed-model-oracle.ts` | `37c90c0e765a8ee59da283f5517557a726ca08091c933729761ad4f94526a215` | `89910dc25e203b519ab64f674cf1c52a0cf75c89a0351f4c1d25fcc4ecb08203` |

All 617 shipped public runtime files and all 78 pristine package files match their before/after snapshots and the reviewed source. The five-path derived runner matches the accepted derivation; actual downloaded index/check bytes were independently recomputed. The historical 1,207-entry integrated source manifest remains preserved. Two later loss-audit metadata documents do not alter the 617 runtime files.

The run used Node 22.18.0, Chromium 156.0.8078.80, two contexts/application leases, an actual two-CPU Docker quota and affinity to CPUs 0–1, 8 GiB, init and auto-remove. Three process samples each show two private Chromium browser roots without sampled zombies. Fifteen distinct file/application/browser acquisitions were recorded; 32 were required for both complete passes.

Install and build took 5.360 and 4.657 seconds. Measurement reached the fixed 1,500-second ceiling after 1,500.474 seconds, with phase exit 124 and job exit 1. Successful queries filtered to the three exact full container IDs prove their absence. Recorded Docker clients and the owned launcher session were also absent. Container containment is established. Graceful disposal of all 32 file/pass application fixtures is unproved: completed file receipts are written before release, and the final application pool snapshot is missing.

Recorded rows use 3,470 fixed-seed routes and 1,781 calibration routes. Random-named registrations remain fixed-seed routes under the declared seed; determinism registrations use calibration. This is no evidence of fresh uncontrolled randomness. A capture's `hash` is an assertion-stream SHA1; separate snapshots bind source.

## Artifact availability

Only this Markdown summary and its JSON receipt are versioned by this packet. The JSON embeds path/SHA256 pairs for all 617 frozen public runtime inputs, all 78 pristine package inputs, the actual supervisor/entrypoint/cache helpers, and the four excluded later oracle/model postimages. Production, oracle, model and helper source bindings can therefore be checked directly without obtaining an absent manifest. The index contains hashes, not the historical source bytes.

The raw runtime archive, full source/package snapshot files, captures, missing-key inventory, audit source/reports and adverse audit/authorization/transfer history remain local retained artifacts outside the repository. Their hash references do not make them available in the repository. This summary is not a portable reproducibility packet: it cannot reconstruct those absent artifacts or replay the historical measurement by itself.

## Preserved adverse history

The original export/run was rejected by automatic approval review before execution because specific user authorization was missing. A later retained launch receipt records explicit human approval for the exact public payload and bounded run. After that approval, an unsupported `rsync --protect-args` attempt created only a staging directory and transferred no payload; the supported transfer then used the same reviewed bytes. These events remain distinct from the actual timeout.

The owner's first privacy scan matched the public `cookie` dependency name in `youch`'s exact lockfile entry. Its original source and output remain preserved; the corrected classification is bound to the unchanged lockfile. The independent audit's first attempt incorrectly expected two patched package paths; it failed before a verdict. Its retained source, stderr and exit accompany the corrected accounting for all five approved derivation paths. An earlier source-accounting attempt also incorrectly assumed historical registration expressions equaled the combined candidate; its failure remains preserved beside the corrected four-expression reconstruction. These accounting corrections changed no runtime artifact, source or budget.

Independent scans found no credential fields or JWT/Bearer-shaped values in 52 receipt JSON files and 68 receipt/capture/log files. Shape scans cannot identify arbitrary UUID secrets. Reviewed serializers omit broker tokens and session cookies, and no browser-profile contents enter the evidence packet. Raw operational paths and infrastructure identifiers remain outside this public summary.

This timeout is an execution limit, not a product oracle RED or a semantic mutant kill. Complete baseline coverage, cross-pass determinism, full fixture release, mutation closure, old-test deletion readiness, routine CI adoption and cross-browser guarantees remain open. No law, history budget or scope was weakened to produce this partial result.
