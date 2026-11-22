# Session Compose acquisition review

The session oracle now finds the same item through Compose's existing Load more control before performing its original card-opening action. This repairs a test-driver first-page assumption. It does not change editor production code, any law, model, generated or constructed history, action after acquisition, comparison, checkpoint, seed, registration, run count, or timeout.

## Source identity

The raw/current source pair was independently reviewed. Before application, both integration files matched the scratch base byte-for-byte. After application, both match the reviewed shared source.

| File | Raw SHA256 | Current SHA256 |
| --- | --- | --- |
| test-ui/editor-oracles/session-driver-oracle.ts | 4bb5d9f83095cb41641ff59bf53c6903b5a032433c69c81943a40a7c1eab46cb | d5170ce4c4fb0408854b6043c003445a70b3c84543f7c1074ffb08bb3838bcba |
| test-ui/editor-oracles/navigation-acquisition-oracle.ts | d2e1acce8cff78a9a7b4bbf26c808a1dc2040c5cc6c46163013df0a87fe30693 | df172c0593b4dad0080b39d06905472f85c1c3bd00c98ae1d16c03b9ebb280fd |

Reviewed patch: /private/tmp/blygger-session-acquisition-controls.dIWmzmEB/shared-acquisition.patch (SHA256 8c78b95f1b7e54c7ec4f4f052afdb884fde2370096cde6ff069245376ab0a0fc). Frozen control packet: manifest.v3.json SHA256 bdc22cb6211a554185aac63c8b1a28283198a7b51bac478f5274a14463d21530. Earlier manifests and failed controls remain preserved. The package pin remains 97a4e7a.

Initial quick editing still clicks the exact body text. Editor→quick still clicks .item-head. The shared helper keeps its original 7,000 ms total acquisition budget and 32 real Load more action bound. Its existing visible-list prerequisite is retained. It never reloads, navigates directly to the target, supplies expected text, retries a history or changes a verdict. Every helper task remains owned through context/native-host closure and the original error remains in cleanup failure causes.

## Registered displacement controls

Each scratch copy used the actual maintained fixed-seed 20261118 quick-fallback-desktop or editorToQuick-fallback-desktop registration against its own disposable application and matched Chromium 1248. The selected registration executes one constructed history; the property's separate 25-run generated campaigns remain unchanged and were not executed by those selections. Each selected run reports 137 skipped registrations; these are selected controls, never complete baselines or law/mutant kills.

Before the original or repaired driver acquired its card, the fixture required 26 distinct unrelated items with actual API timestamps strictly newer than the unchanged target (lexical and parsed time), a fresh API first page of 25 distinct newer rows excluding the target with a next cursor, and exactly 25 mounted browser IDs identical to that API page. Point-read IDs must match requested IDs. An elapsed delay supplies no evidence. Fixture clock-probe pacing is at most 35 ms after a failed timestamp probe, inside the original separate 2,000 ms / 32-probe bound; fixture verification has a separate 7,000 ms bound. Those setup limits never extend the driver's 7,000 ms.

| Control | Qualified final premise | Actual registered result | Receipt directory |
| --- | --- | --- | --- |
| Original initial quick | yes; all 8 evaluated candidates | body-text click timeout 7,000 ms; final target 1e9tmhx8nvgkrfy9nsjmqxcbnb | /private/tmp/blygger-session-paced-old-initial-receipt-20261119 |
| Original editor→quick | yes; all 7 evaluated candidates | .item-head timeout 7,000 ms; final target 55k5ew1e4ykr6xfasgvhxq5xfv | /private/tmp/blygger-session-paced-old-transition-receipt-20261119 |
| Shared initial quick | yes |1 passed / 137 skipped, exit 0 | /private/tmp/blygger-session-paced-shared-initial-receipt-20261119 |
| Shared editor→quick | yes |1 passed / 137 skipped, exit 0 | /private/tmp/blygger-session-paced-shared-transition-receipt-20261119 |

Every paced control has no setup or outer cleanup error. Per-candidate driver-failed receipts preserve original TimeoutError stacks independently of shrinking. The shared controls execute the unchanged receiving law/check through the later commands. Separate fixture-off original and shared controls also passed both seams. External recorded-inputs.json sweeps independently verified 1,099 copied source/generated inputs plus explicit overlays and pre-run hashes for each paced copy, with zero drift. The runtime launcher's narrower sourceUnchanged field itself covers only its named critical files.

Independent review verified the v3 manifest and every listed file, all 15 original premises and original final failures, both shared receiving passes, all four 1,099-input sweeps, and the source-preservation boundary. Full session campaigns on integration are recorded below after execution.

## Limits and preserved unsuccessful setup attempts

The original unpaced transition control ended with an invalid clock premise (32 API probes completed within one server timestamp second); it remains inconclusive. Earlier useful shrink receipts do not override that final loss of premise. The original unpaced initial control did end with a valid final premise and direct-click timeout. Those receipts remain separate from paced controls.

Earlier launcher attempts separately preserve missing copied generated/SDK inputs, localhost-listener EPERM, a missing browser executable, nested setup errors and an unsettled log FileHandle cleanup. These are setup/controller faults, never baseline passes or law failures. A later invocation from the wrong directory failed to resolve tsx before starting a test; using the prepared copy as cwd corrected resolution. No failure was silently retried as the same successful run.

The remote navigation empty-list failure is still unexplained: the four complete failure lines show the target in a fresh API first page while the browser list is empty and acquisition attempts are empty. A passive browser-network/response/DOM diagnostic overlay kept the helper and visible gate unchanged. Its selected pending-spa-reject-mobile determinism registration passed (1 / 59 skipped), so it emitted no failure dump and cannot establish the prior cause. The diagnostic overlay remains scratch-only. Shared pagination success does not repair or explain that navigation readiness issue.

No all-file campaign, random/mobile session campaign, production bug, semantic mutation kill or full mutation audit is established by the bounded controls. No staging or unrelated source changes were made when applying this exact patch.

## Complete integration session validation

Both complete maintained session-file passes passed all 138 registrations with zero failures, skips or pending tests. Each pass includes the fixed and generated campaigns, calibrations and determinism checks. The full registration-key sets match, and all 15 named production/oracle/package/config inputs match before and after each pass and between passes. This is the complete session file; complete all-file validation and mutation auditing remain separate.

The direct maintained Vitest configuration used seed 20261118, unchanged 60,000 ms test/hook limits, one Vitest worker and one live browser context at a time. Each pass used a fresh disposable app/browser. Browser version was 156.0.8078.4 from the matched Playwright Chromium 1248 installation. GOMAXPROCS and UV_THREADPOOL_SIZE were 2; Chromium renderer and raster limits were 1. These settings bound concurrency; macOS supplied no hard CPU-affinity limit. The runtime browserExecutable field records Playwright's reported default path, not an independently inspected live PID/executable.

| Pass | Actual registrations | Exit / cleanup | Vitest report SHA256 |
| --- | --- | --- | --- |
| First | 138 passed, 0 skipped | 0; no API/log cleanup errors | 4975e6bc224de8d95014e53f8c7a8fba6135fc9617bcf2ffa293a34187b02739 |
| Repeat | 138 passed, 0 skipped | 0; no API/log cleanup errors | cb45f08063536bdd073b2b03b2fa9f42a703669dd0da13d0cf17863616d9d43d |

Receipts: /private/tmp/blygger-complete-session-20261119/{first,repeat}/{invocation.json,vitest.json,summary.json,test-output.log}. Overall summary SHA256: 2de0295855429c83a163dae902fee00bafe648227c22b17cde2efc10f1833af0. Exact runner SHA256: ae3b990dbb8070a76e0f7efc4b1cd9e9c2b02d592574be27c5fba7cbaef438d6. Both application bundle hashes are 965c4d41db848251d08d98b5abc20332d6fd4acf900b5e77254df28f0715174a. The launcher did not install the oracle-gaps capture adapter, compare cross-pass observation hashes, or perform an independent post-run process inventory. Internal registered determinism checks did run. No mutation audit is claimed.

## Displacement receipt fingerprints

| Receipt fixture.jsonl | SHA256 |
| --- | --- |
| /private/tmp/blygger-session-paced-old-initial-receipt-20261119/fixture.jsonl | 618ed5e226d16185d42e20f8d6cf6b0a04ccf0675eaa6cc496f819b880a7093a |
| /private/tmp/blygger-session-paced-old-transition-receipt-20261119/fixture.jsonl | 6419c675e98ca495391b779f1cf278cd0ed77860b5b8906c1553db9fe849937a |
| /private/tmp/blygger-session-paced-shared-initial-receipt-20261119/fixture.jsonl | d9de5a8da50c2d19acfc00683b41a9ea4481102e0ec41f699952870fab4855ae |
| /private/tmp/blygger-session-paced-shared-transition-receipt-20261119/fixture.jsonl | a2dc8f3aa913bc089495cd1d3a47cebfea45201d4fd4d1fd5c1b760901007279 |
