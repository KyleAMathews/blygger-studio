# Exact cold workflow startup diagnostic

2026-11-19, independent reviewer. This follows the source-only
`shared-worker-lifecycle-review.md` and uses the pinned oracles review/design
skills, checklist v1 and glossary. The parent accepted the diagnostic source
for this disposable probe only. It has not been adopted into integration.

## Result and limits

The exact previously failing registration passed cold twice. This does not
establish why the full workflow run failed, that a startup defect is fixed,
or that retained Worker rows caused it. The full workflow baseline remains
provisional run `bc80a076e443`.

New partial diagnostic run `6884d7e8cb51` completed in 58.98 seconds:

| Evidence | Result |
| --- | --- |
| Exact fixed registration | `fragment-cleanup-paste-part?#next`, seed 20261118; passed in 2747 ms and 1706 ms |
| All six existing calibrations | Passed in both unmutated runs |
| Unmutated registrations | Seven pass, 154 unselected; 11.9 s / 13.3 s; zero nondeterminism |
| Selected authored mutant | `src/ui/sheets.tsx#authored:original-stacked-toast-feedback`; zero kills, one `framework-error` gap |
| Original input stability | All 1073 copied input files unchanged after execution |

The selected fixed paste history also passed under the stacked-toast mutant.
The retained clipboard calibrations then found that their selected clean
`originalClipboard` history already failed the `completed-link workflow
receipt` law. They failed as framework calibration checks, with no recorded
law verdict at that registered route; the gap CLI correctly gave no kill
credit. This deliberately narrow replay did not include `originalClipboard`
as an ordinary registered-law history. The gap remains open in this partial
report. The earlier run `1f59e4a95d2f`, which included that distinguishing
registered history and killed the mutant, remains separate evidence.

No browser setup failure happened here, so no failure diagnostic fired. This
run does not verify the package's classification of an actual diagnostic-wrapped
browser failure. Three separate lightweight mocked infrastructure controls
verified object identity of the original `cause` and first error, distinct
diagnostic acquisition failure, and distinct context-cleanup failure with the
diagnostic wrapper retained. They also checked that diagnostics add no compared
trace checkpoint. These are harness controls, not product-law or real-browser
failure-classification evidence.

## Frozen proposal and isolated execution

Proposal revision 2 is retained at
`/private/tmp/blygger-startup-diagnostic-v2-5xlg5e_0/`:

```text
88032493a81a0c56fc40e4395a356372bd258d40df08ff7906098af630b775f1 application-driver-oracle.proposed.ts
5fdbf571e0df61c16b146d9422a26abbbc14fd190bf42a277178b230f3f83bae diagnostic.patch
```

It adds bounded request path/status/completion/failure/timing receipts, script
fulfillment/native load events and capped unhandled-rejection diagnostics.
Only on failure it captures bounded root/alert text, readiness and textarea
geometry before context teardown, with a separate 1500 ms diagnostic-acquisition
bound. The original exception remains the AggregateError's cause and first
error; diagnostic-acquisition and cleanup errors remain distinct. It records
no cookies, headers or request bodies.

Execution used new copy
`/private/tmp/blygger-startup-cold-cy83d5i6/repository`, leaving the original
Linux snapshot and integration runtime unchanged. Driver deadlines stayed
7000 ms; registration timeout and first-limit stayed 60000 ms; property laws,
models, checks, grammar and budgets were unchanged. A scratch config selected
the exact fixed registration plus the six calibrations. The gap run selected
one authored mutant and one context. This selection is an explicit partial
diagnostic, not a maintained campaign narrowing.

The container image was `mcr.microsoft.com/playwright:v1.64.1-noble`, identity
`sha256:2f05f8a734509a7b3f26a912639488ee08f58a7b292d14d62271bcff9038768f`.
It ran with no external network, an external 320-second cap, a new writable
workspace, read-only shared Linux dependencies/Node binary, and private tmpfs
Vite caches. Dependencies were hashed before running: 15565 files, 29 symlinks
and the Node binary. Preserved captures are hardlinks made before runner
cleanup, outside its output directory.

## Artifact receipts

All paths below are relative to `/private/tmp/blygger-startup-cold-cy83d5i6/`:

```text
38d7df0d1c614087daaeae290c86f22cd9c31734b3e5497f4e4719c2b07cac1e inputs.json
7ea2ed13921fb00df131f3d94a63be978262811b92239051fa848d7c40df32bc dependencies.json
995d84dba532103b25a13874a51caa2d127d8234ca3ce866951d993a3a1f74e4 command.json
178041092ab9773a616318c175def7911a269b4882de2d4c200e403ad092a54f outcome.json
8515d18bbfdcdff64db79c3de1a0cfef6be195645ec2a373cfdf71cfa013564e input-stability.json
1ddc8dc585b955a47f65323cde30168505e6c550cc6d7409726a2d6990faceec diagnostic-controls/results.json
68bac67244249525f87ddc41883e438686608b364c872416fd38dc6e4c13ddba repository/build/formatting-oracles/startup-cold-exact-diagnostic/results.json
6631c3ef1d285e231ca0cdde6dd1af6f2331e0b6196349b3d2c5c1967dd75ff2 repository/build/formatting-oracles/startup-cold-exact-diagnostic/summary.md
```

`preserved-live-captures/run-173-{1,2,3}.jsonl` retain the two unmutated
captures and selected-mutant capture. The launcher and exact command are also
retained. No cleanup architecture or production change follows from this cold
pass; a controlled warm replay with the same setup diagnostics is the next
experiment if the parent chooses to test accumulation.
