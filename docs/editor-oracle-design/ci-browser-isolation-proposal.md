# Opt-in process isolation for Linux browser oracles

Status: **unapplied source proposal**, 2026-11-19. The current worktree and benchmark snapshot remain frozen. No browser, Docker, test, benchmark or other campaign was launched or stopped for this proposal. This changes the proposed host topology only; no product law, model, grammar, history, seed, run budget, observed checkpoint or assertion changes.

The six-hour campaign cannot be a useful routine CI gate. Increasing parallelism currently introduces a second problem: contexts connected to one Chromium browser process share that process's headless clipboard. Private contexts do not isolate the premise required by native-paste histories. Process isolation is an enabling change for safe parallel experiments; it is not yet an elapsed-time improvement or CI budget result.

## Existing evidence and remaining inference

The disposable Linux probe at `/private/tmp/blygger-oracle-ci-gagmlkz4/repository/clipboard-isolation-probe.mjs` observed cross-context interference in **8/8 shared-browser rounds**: A's clipboard read and actual native paste received B's value. Separate BrowserServers produced zero mismatching rounds. Its output is `/private/tmp/blygger-oracle-ci-gagmlkz4/clipboard-isolation-output.json`.

The later concurrent stress probe at `/private/tmp/blygger-oracle-ci-gagmlkz4/repository/clipboard-isolation-stress.mjs` ran **four separate Chromium processes × twenty rounds × desktop/mobile profiles**, preserving **160/160 trusted `insertFromPaste` receipts**, zero read mismatches and zero native-paste mismatches. This reviewer independently counted the supplied JSON, not a new run. Host: Linux arm64, Node `v24.8.0`, Chromium `156.0.8078.80`; output `/private/tmp/blygger-oracle-ci-gagmlkz4/clipboard-isolation-stress-output.json`.

Both probes use separate `launchServer` processes plus connections. The candidate below uses direct `launch` ownership. They support process isolation, but do not establish this candidate's lifecycle, runner integration, failure cleanup, Linux x64 behavior, whole application receiving results or performance. Those require independent source review and execution in the disposable Linux snapshot before adoption.

## Concrete scratch candidate

Frozen artifacts are under `/private/tmp/blygger-ci-browser-isolation.zg1Aoj/`:

- `proposal.patch`: unapplied three-file unified diff, SHA-256 `321ee12f4a10c1d69436808778b03125bf8026515a273ea7faf5c33ad547f1ed`.
- `provenance.json`: source/probe hashes and preservation binding, SHA-256 `138c0f640838b15b8d13e56d5e95fac1393991d53d73d69df4cd4a813b8fc244`.
- `before/` and `after/`: complete source snapshots for review; `prepare.py` records the exact-match construction.
- `static-syntax.json`: TypeScript `5.9.3` transpile diagnostics are empty for all three after-files. This is syntax-only compilation; candidate code was not executed and project type checking was not run.

The default remains `shared`. An explicit `--browser-isolation process` option or `FORMATTING_ORACLE_BROWSER_ISOLATION=process` opts in; a CLI choice overrides the environment. The candidate rejects process mode outside Linux Chromium before creating the disposable application. Missing/invalid option values fail configuration rather than falling back. This initial support restriction deliberately avoids claiming OS clipboard isolation on macOS or another engine.

| File | Proposed change |
|---|---|
| `scripts/formatting-oracles.ts` | Parse/remove the wrapper option, validate the mode, skip parent `launchServer` in process mode, pass the mode and an empty shared endpoint to child workers, retain existing application/server/child cleanup and report gates. |
| `test-ui/editor-oracles/browser-engine-oracle.ts` | Add the validated mode and one shared launch-options function containing the existing `headless:true` and optional executable override. Existing engine/profile behavior is unchanged. |
| `test-ui/editor-oracles/browser-driver-oracle.ts` | Lazily `launch` a private browser in process mode or `connect` to the existing server in shared mode; retain one module-local connection promise and common setup, close acquired resources on setup failure, close the successful owner in `afterAll`. |

Launch parity is explicit: parent `launchServer` and private `launch` use the same engine and helper options. `FORMATTING_ORACLE_BROWSER_EXECUTABLE`, `PLAYWRIGHT_BROWSERS_PATH` and existing environment reach each child through the wrapper's existing environment spread. An executable override is never dropped, and no extra browser flags, profile/viewport changes, clipboard substitutions, sleeps or source normalization are introduced. The wrapper overwrites any inherited endpoint with `''` in process mode, preventing accidental connection to a stale shared host.

The wrapper's existing `--contexts` default and explicit override mechanism are untouched. A later Linux experiment can pass `--contexts 2`, then 4, with process isolation and unchanged source/scope. The pinned CLI parser assigns later option occurrences, so the wrapper's existing appended user arguments can override its earlier context default. No concurrency increase is applied to the current run.

## Ownership and unit lifetime

The private resource is a Playwright **Browser**, not a BrowserServer stored globally. Per the installed Playwright types, closing a launched Browser closes its process/pages; closing a connected Browser clears that connection's created contexts and disconnects, leaving parent BrowserServer ownership with the wrapper. The candidate retains these distinct lifetimes through the same public `browser.close()` operation.

`browserDocument` starts once per evaluated driver module, not once per history or test. Its callers continue to share that one browser within the unit. Session/application drivers may create their existing additional contexts, but those contexts stay inside that unit's private process and keep their own existing cleanup. Histories and registered tests must remain sequential within a unit; adding `test.concurrent` would reopen an internal clipboard race and requires separate design.

The current Vitest config leaves default test-file isolation enabled. For warm/batched oracle units, pinned `oracle-gaps/capture-setup.mjs` explicitly calls `vi.resetModules()` when `run.units` is present and the copy is not skipped; it does this before evaluating the unit's imports. Thus the current loader is expected to recreate module-local connection/owner state for the next unit, and the prior unit's `afterAll` should already have closed its owner. The candidate adds no process-global browser cache or daemon lifetime. This expectation still needs a real multi-unit receipt and process inventory in Docker; source reading is not cleanup proof.

## Failure and cleanup review points

| Boundary | Candidate behavior | Evidence still required |
|---|---|---|
| Bad mode/platform/engine/origin/cookie/shared endpoint | Validate before browser acquisition; preserve explicit setup error. | Actual invalid-configuration classification; no spawned browser. |
| `launch` or `connect` rejects | No Browser handle has been acquired by this module; propagate original rejection. Playwright owns cleanup of a failed launch attempt. | Real failed-launch process/profile inventory; no claim that absence of a handle proves no leaked process. |
| Context/page/cookie/route/navigation setup rejects after acquisition | Close the acquired browser; rethrow original error. If closing also rejects, throw `AggregateError([original, cleanup], …, {cause:original})`. | Inject each stage in the disposable candidate and verify original setup classification and no surviving process. |
| Successful unit | `afterAll` awaits established setup and closes its owner once; closing the Browser covers every remaining context. | Graceful unit completion and next-unit distinct process receipts. Explicit driver contexts retain their existing graceful close paths. |
| Rejected setup reaches `afterAll` | Setup already attempted cleanup and propagated its error; avoid reporting the same rejected promise again as a second cleanup error. | Original error still visible to CLI; neither false pass nor registered law kill. |
| Browser close rejects | Surface cleanup failure; owner is cleared before close so cleanup does not double-close accidentally. | Report cleanup failure and inspect the process; the candidate does not claim successful release or implement a retry. |
| Timeout, force-cancel, worker crash or SIGKILL | `afterAll` may not run. The wrapper has no private BrowserServer handle to close. | Verify Playwright child/pipe teardown and runner context replacement; inspect/clean candidate-owned containers/processes. This is unresolved, not a guaranteed cleanup path. |

Setup errors remain outside production comparisons, and must never be counted as kills. A normal `afterAll` close failure remains a separate harness diagnostic. No production exception is caught or translated by this patch. The patch improves acquisition cleanup in both modes; healthy shared-mode topology/options and all production observations remain unchanged.

## Preservation binding

Base commit `28b0c8d642a87e5810ad6eabd95c2d1714c53396`, oracle pin `97a4e7a`. The candidate was made from the following exact current inputs; they remained unchanged after preparation:

| File | Before SHA-256 | After SHA-256 |
|---|---|---|
| Wrapper | `978cdd0fe4c3581cd85fd2804c8b0212146ba5b5b54f1d8a37a422fa97ff6563` | `6af8f88584c9b25c2074c05b4465d726933943eeaabee8d60fe984fe9eecb0d9` |
| Browser driver | `b0ca432cf84f1dcfb60ac5e0e9052d2f3eb524e0594be9a5e158a3e7d620562f` | `72051ff3fc92066a37d32eb1be337628bafe3c6e90453709ccb5f500e24d5059` |
| Engine helper | `c4b7c8cdb7b4c2d1e37fe2a944f6c2d4e0732babef43088f6154deacdff9b020` | `771d591d619af9933e2aac6bf2af8c357974ef3b7e22e079fd72da984f88ad72` |

The browser driver's entire suffix beginning `// The pinned runner` has identical before/after SHA-256 `4d2b8eed3dcf3c955dfe08ac97d268d71c033d6bd8ff8ccf47c65dcea146b2f8`. That includes instrumented-source installation, active mutant/work/probe transport, application-source verification, captured-call replay and public helper calls. No oracle file, law/model/history, package, runtime bundle, test selection, seed or budget is in the patch. Engine profiles are byte-for-byte retained.

The two probe source/output pairs are hashed in provenance. Initial source/output: `0d6ba223b5aa0f191f9c4abef4e13fb717417cd6deef19476c1efe057df2c0de` / `c760839be27ae61d85128992537ce3c75077ab6e5c4801f97a73ec7c97e0b3af`. Concurrent stress source/output: `a36b9ea784f2100212e7ab2bad3f1d4248ef4a6e1e3cc878954c894e13b7fb01` / `189ff749b3e05edcd41de4f386a1db5173e9150d28f163f19ae9c7a447fb3371`.

## Review and execution gate

Independent source review should first check ownership, executable/option parity, per-unit module reuse and failure fidelity. Only after acceptance should the parent apply the immutable patch to the disposable Linux snapshot, keeping the running main worktree unchanged. Repeat concurrent native clipboard **and actual keyboard paste** using this candidate's direct-launch path, preserving trusted receipts and desktop/mobile profiles; navigator reads alone cannot establish the receiving premise.

Then run representative registered browser oracles with repeated baselines, calibrations and selected authored challenges at concurrency 1/2/4, with input manifests, same seeds/budgets/observations and process cleanup receipts. Include workflow clipboard/native paste, fallback/cancel, application mutation transport, session undo and multi-unit replacement. Record failures as setup/runtime/assertion/timeout rather than trading off law coverage. Compare classes and all selected kills before measuring larger campaigns.

Finally benchmark the same full CI scope, record elapsed time/CPU/peak memory/process count and set an explicit CI budget from measured results. More processes may improve throughput or increase contention and startup cost. This proposal supplies neither a passing integration run nor a speed target, and does not authorize a smaller law domain, lower budget, skipped tests or removal of the old loss-audit gates to meet that budget. No new ordinary maintained tests are proposed.
