# Browser process isolation: bounded Linux controls

2026-11-19. Runtime control review of the independently source-accepted v3
transport proposal, SHA-256
`9f78a35d502fca467045cfb9eae6bdfb16d101638dcb8a513a1fb0310748d3e8`.

The accepted v3 transport was applied only to the disposable original-source
Linux snapshot at `/private/tmp/blygger-oracle-ci-gagmlkz4/repository`, alongside
the independently accepted composed runner optimization. The original and
latest-main integration runtimes were not changed by these controls. The
disposable diagnostic files are scope/configuration or explicit fault inputs;
they are not maintained editor tests.

## Disposition

Accept the bounded native isolation, normal registered ownership/freshness,
driver lifecycle and cancellation observations below. The later fault control
also establishes sampled live-browser succession and invocation-end cleanup,
with a transient unreaped zombie described below. Immediate PID reaping and
accumulation under repeated timeouts remain unestablished. No actual skipped copy has been observed.
These observations do not accept a complete merged-source campaign or establish
CI duration.

The full raw packet, scripts, exact application receipt, retained harness
failures and analysis are at
`/private/tmp/blygger-isolation-validation-plan.xU1dF0/`. Immutable v3 source
artifacts remain at `/private/tmp/blygger-ci-browser-isolation-v3.swe57x/`.

## Measured environment

- Playwright1.64.1 Noble image digest
  `sha256:2f05f8a734509a7b3f26a912639488ee08f58a7b292d14d62271bcff9038768f`.
- Linux arm64, Node24.8.0, Chromium156.0.8078.80.
- Kernel-observed executable:
  `/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux-arm64/chrome-headless-shell`.
  This is measured independently of Playwright's reported default path.
- Every run uses its own disposable `--rm --init` container and1GiB shared
  memory, with the same snapshot mounted at `/workspace`.
- Every registered check remains cold, with no persisted evidence reuse.
  Property seeds, history domains, run counts, models, calibrations,
  observations, laws and runner unit limits remain unchanged.

## Accepted bounded observations

| Control | Result | Limit |
|---|---|---|
| Direct `BrowserType.launch` clipboard read and native Ctrl+V | Four private browser processes:64/64 correct reads and pastes, all64 trusted `insertFromPaste`. Shared-browser four-context negative control:48/64 wrong reads and48/64 wrong pastes, all64 trusted events. Desktop/mobile viewport profiles. | Native Chromium host observation; no physical mobile-OS claim. |
| Exact driver-prefix lifecycle |7/7 controls pass: missing origin/topology acquire nothing, invalid executable refuses, successful owner reuses one handle and closes once, actual invalid navigation closes the acquired browser, close rejection after real process closure surfaces, setup+close errors aggregate without duplicate `afterAll` rejection. All acquired processes and zombies gone. | VM supplies Vitest injection and product string imports; actual topology/browser launch/context/page/close run in Linux. Close rejection is explicitly injected after real closure. |
| Full unchanged inline+keyboard registrations in explicit diagnostic scope |2092 baseline checks per pass (330+1762), twice;0 failures/nondeterminism. M29 kills `multiline emphasis / plain`; exact original-marker-only authored challenge kills `multiline emphasis / starsOnlyItalic`.125.793s wall. | Config imports the unchanged source-transform/base config, sets package root explicitly and filters include to these two unchanged files. No full-campaign claim. |
| Real registered unit ownership |8 computed units,8 unique owner UUIDs,8 distinct actual browser root PID+kernel-start identities, maximum2 roots concurrently. Exact ledger:4 full baseline units,1 actual proper-suffix validation,1 operator unit,2 concurrent authored units. Completed topology digest matches exact report bytes. | Overlapping UUIDs are not individually assigned to simultaneous root PIDs. Aggregate count and parent/time identity are measured. |
| SIGTERM after acquisition |8.071s, wrapper exits143,0 live descendants or zombies before harness cleanup, no forced kill. Signal waits until an immutable owner receipt and actual browser process exist. | Cancellation observation only; not SIGKILL/crash/close-hang assurance. |
| Explicit context-replacement fault |Exact repeat completes63.936s:330 baseline checks twice,0 nondeterminism, injected authored timeout38.0s,1 context replacement54ms, fresh4th Browser and exact legitimate marker-only law kill. No sampled live-browser overlap; invocation ends with0 live descendants/zombies and no forced cleanup. | Retired root is transiently Z until CLI exit. Sampled succession/end cleanup only; no immediate-reaping or repeated-timeout accumulation claim. Injected timeout receives no kill credit. |

The normal registered check used exact emphasis M29 (`&&` to `||`) and
`authored:original-marker-only-multiline`, with2 contexts. All selected full
registrations retain their complete budgets. The real suffix and authored units
each acquire fresh Browser processes; the later in-flight authored owner
finishes even though the earlier owner already supplies the canonical kill.

The904-file snapshot audit found0 missing files and0 unexpected changes.
Only the3 existing transport files differ, with exact accepted v3 hashes; the
fourth transport helper is newly added. The accepted composed runner's separate
application receipt records its package-local modifications.

## Incomplete controls and retained harness failures

The workflow-only check reached its original240s external boundary during its
first baseline. The default-config Draft.save check selected3 transitive owners
(Draft/navigation/receivers) and reached its original240s boundary during its
first baseline. Both stopped143 with0 observed live descendants or zombies;
neither produced an accepted report. Passing captured rows do not establish a
completed baseline. The explicit-owns estimate was corrected from actual static
ownership rather than narrowing the ongoing jobs.

The first lifecycle error stimulus used a network target fulfilled by the
driver's own route, so setup correctly succeeded and the harness reported an
unmet failure expectation. The full7-case control reran in new directories with
invalid absolute navigation after acquisition and passed. The first registered
supervisor attempted a hardlink across two bind mounts (`EXDEV`), ended before a
report and is retained as a harness failure. Its corrected watcher archives
capture inodes in a sibling directory under the same `/workspace` bind mount.
Launcher/archive setup never precreates the wrapper's fresh output directory;
capture linking begins only after its configured topology receipt is visible.

An explicit authored-hang control retains the unchanged330-case inline file,
1 context and unit limits. Its first attempt reached its original180s external
boundary before the derived per-unit limit could expire: startup plus34.5s and
14.2s baselines left less time than the legitimate computed mutant deadline.
It stopped143 with0 live descendants;3 acquisitions cover two baseline owners
and the hang, with no replacement, successor, report or kill accepted. The
authorized exact repeat has a300s external boundary, a distinct fresh output
and unchanged oracle/runner deadlines. It completes in63.936s with330 baseline
checks twice,0 nondeterminism, the expected38.0s authored timeout, one54ms
context replacement and the legitimate `starsOnlyItalic` law kill in a fresh
fourth Browser. The deliberate timeout receives no law-kill credit.

Raw OS records need a precise boundary. Retired root PID340, kernel start164309,
was launched under NodeCLI110 (kernel start162283). After retirement, the saved
browserRows sample at61.665s contains no live browsers; successor root423,
start168130, is first observed live at62.140s under the same live NodeCLI110.
No later sampled live browserRows contain340. The final per-identity record
marks340 `Z`, with no executable/cmdline, still present through
16:14:39.817 while the successor runs; it is absent from the final invocation
inventory. There are0 final owned zombies or live descendants and no forced
cleanup. The watcher stores browser-set changes, not continuous `/proc` state
history: do not turn those samples into an exact Z-transition timestamp or
continuous timing proof.

The lifecycle reviewer independently confirmed this raw boundary. Immediate
PID reaping and accumulation under repeated timeouts remain unestablished;
do not call this unqualified clean retirement. Docker-init was already PID1,
and the browser was launched by a still-live NodeCLI parent, so another init
flag alone cannot establish reaping during that parent's lifetime. A lost
worker-thread child-process handle/reaper is a causal hypothesis, not a proven
root cause. No runtime repair or additional campaign follows from this review.

## Signal finalization and remaining gates

Actual SIGTERM controls leave `browser-topology.json` at
`state: configured, report: null`: signal shutdown exits before sidecar
finalization. OS inventory independently establishes observed cleanup. These
partial receipts are not completion/report evidence. V3 refuses every existing
output path, so an interrupted directory cannot be silently reused. Normal
completion does finalize and bind the exact report digest.

No skipped-copy execution occurred in the normal control. The accepted runner
avoids preparing later operator owners after an earlier legitimate kill;
source reasoning about `capture-setup` and `vi.resetModules` is not a runtime
skipped-copy freshness observation. Keep that limit explicit.

Before adopting a complete CI campaign, compose the accepted latest-main
transport, zero-execution guard and runner into a fresh source-bound packet;
retain the explicit transient-zombie boundary and resolve immediate-reaping or
repeated-timeout accumulation requirements before claiming clean retirement;
retain the native maintained
workflow baseline/receiving results; and obtain a complete measured full report
with unchanged scope, laws, seeds, budgets and loss-audit obligations. These
bounded controls establish neither a whole-campaign speedup nor an exception
that permits reducing that coverage.
