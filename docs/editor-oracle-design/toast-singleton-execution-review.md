# Singleton toast — bounded execution review

Reviewer `/root/review_block_break_oracles`, 2026-11-19. Independently read
the completed replay report, preserved live captures, state/configuration,
input manifest and applied transport/source. No runtime edit, build,
browser, oracle replay or test job was performed by this reviewer. This
document is the only write for this review.

## Disposition and scope

**Accepted for the selected singleton regression:** run `1f59e4a95d2f`
passes its two selected product-history registrations and six calibrations
twice, with zero baseline nondeterminism, then rejects the original
stacked-toast defect through the registered completed-link law at the
intended browser checkpoint. The completed mutant result is `killed`, not
timeout, setup failure, crash or calibration-only failure.

This supplies the previously pending semantic receiving evidence for the
stable-ID repair and sheets transport on this selected replay. It is
**not** whole-workflow, whole-sheets-function or integrated unsampled gap
closure. It does not establish physical visibility, repeated identical
assistive-technology announcements or all toast lifecycle behavior.

## Reviewed artifacts and source binding

Replay directory:
`/private/tmp/blygger-main-linux-j74l_hd2/repository/build/formatting-oracles/toast-singleton-green-replay-v3/`.
Input manifest:
`/private/tmp/blygger-main-linux-j74l_hd2/toast-replay-green-v3-inputs.json`.

| Artifact | SHA-256 |
| --- | --- |
| Input manifest | `c6a3b87aae97deecf523014ddd9278e4ef12ab03d770fd1338c2215f8735e789` |
| `results.json` | `18c6e77978f0977e68856c37fdde23a6cbf15c873b5cbfca1d57a3a2f4acf4bf` |
| `summary.md` | `8efe969e4085bafef886b9ee197706267a39343fa86f1160e64f84718207742c` |
| `stream.log` | `6ac7a92c2767abbfd8c84efcdcb63221a1d3562710213621723b891ae40bce08` |
| Preserved baseline `run-181-1.jsonl` | `550de229cb7f3c814c03788b09ba50b6d73b0e1e64a2ba07bbdd19ae0a3a6c84` |
| Preserved baseline `run-181-2.jsonl` | `90a95e79ebc95749e424d543e07f8d28acfee625141387dd3153fa6df1e9d227` |
| Preserved mutant `run-181-3.jsonl` | `5d105a3871bbc2d787b04f5ac4411578a8d8c30dd0a8be7a6e027f3cdcdd87d2` |

All five source/config/mutant hashes in the input manifest match the
examined postrun files:

| Input | SHA-256 |
| --- | --- |
| `src/ui/sheets.tsx` | `3db1bb055755a995aea1cc25885917d05c0d74abd4ccd7f3a5503602cdd04070` |
| Workflow property/check | `d84d13f33c5fd75b86f0873eb1ddee9277f0ca3cbb6009753fe0f3b14d9c49ff` |
| Workflow receiving driver | `a9454f5f9ce5cc9a97128b9bfe1720cd7f422fb9b59b7fee6ec172ea611b8cbd` |
| `original-stacked-toast-feedback.json` | `d8c333e9ee34d0540b1e82339f6592fe66538f28326fb06897feb14ca8a446fa` |
| Replay configuration | `8ad5d9c9ae40263a9f03b8d462a59a1a14220cd2fef3394ddde6fffef137e8dc` |

The model retains its previously reviewed SHA-256
`ad252e25919b9915deb98392fe5291f57f8e97853a441f07b94f826ebf8212e8`.
The current integration copies of the reviewed production/property/driver
and transport files also match these applied replay inputs at this review
checkpoint. This is manifest/postrun equality, not a claim to have observed
every instant of the process's filesystem.

## Baselines and calibration receipts

The replay configuration explicitly selects fixed-seed
`originalClipboard`, fixed-seed `originalPaste`, and the six existing
calibrations. It leaves 153 registrations unselected. Each preserved
baseline has eight nonbackground pass rows, no law violations, and a
complete closing row. The stream reports the full selected baseline passes
at 13.9 s and 13.1 s, with nondeterministic count zero. The report is
nonprovisional and has no excluded or nondeterministic entries.

I compared every selected test's `hash` and `observed` fields across the two
captures; both fields match for all eight. This confirms determinism for
these selected registrations after the unasserted animation diagnostics
were removed. It does not establish determinism of the 153 unselected
registrations or arbitrary future host schedules.

Both passes include the calibration registrations for stable ASCII
clipboard delivery, stable ASCII typed delivery, hidden duplicate clipboard
controls, clipboard source loss, native-paste interception and captured
sheet range loss. They pass on the framework's `calibration` route; they
are checker evidence, not six additional product laws or mutant kills.
The capture also contains a background row, which is not a ninth test.

## Actual registered defect rejection

The selected object is exactly
`authored:original-stacked-toast-feedback`, source `src/ui/sheets.tsx`,
owned function `toast`. Its `find` occurs once in the repaired source:

```ts
    id: 'studio-feedback',
```

The replacement removes that property and leaves a comment, restoring
fresh Base UI identities for consecutive messages. Independently applying
that unique textual replacement in memory gives expected patched-source
SHA-256
`086124348de4a17edbb9544ec6408f9a66820ec14bb70bd4d96da9b2262e8049`.
This is a computed expected source identity, not a retained observed
bundle/source-descriptor value.

The preserved third capture has the actual rejection:

> `editor-browser-workflows` — `fixed seed 20261118: originalClipboard`
>
> Law: `completed-link workflow receipt`; checkpoint: `step1`
>
> `step1.toastCount was 2; expected 1; toast details [{"text":"That is not a URL."},{"text":"inserted link"}]`

The shrunk history contains two clipboard actions. The first falls back
from empty clipboard input to a valid typed HTTP target and produces
inserted-link feedback. The second falls back to empty invalid typed input
and produces the invalid-URL explanation. At that second checkpoint,
current feedback should replace the older message; the mutant instead
leaves two raw nodes. Source, first text and exact raw count are observed
by the actual browser driver without filtering limited or ending nodes.

The row is a failing registered `fixed seed` route with a verdict naming
the property, law and `step1`; it has a complete closing row. The report
credits that same test and law, with `randomAlso: false`, and records
26.095 s for the selected mutant. State at dispatch identifies the authored
copy with `mutant: -1`, `stopOnKill: true`, `select: null`, and no ignored
tests. The runner's stop after this real kill explains why this mutant copy
does not rerun the remaining selected checks.

The prior v2 replay remains a timeout with eight nondeterministic baseline
registrations; no kill is retroactively credited to it. V3 increases
execution first-limit to 600000 ms and test-timeout to 180000 ms while
retaining maintained grammar, fixed seed 20261118 and property budgets.
The actual completed law failure here supplies the missing evidence.

## Sheets receiving provenance and archival limit

All three applied transport files match the independently source-accepted
candidate from the [transport review](./integration-sheets-source-transport-review.md):
application bundler `8de13948…`, source plugin `17eae12a…`, browser driver
`7ffc887f…`. The `--oracle workflows` wrapper enables receiver mode. The
driver imports the authoring application query, the transform loads
`sheets.tsx?oracle-source` through the pinned pre-load hook, and the same
bundle receives that context's exact sheets text. Its separate sheets
descriptor hashes those bytes. Before browser routing, the worker imports
the data query, checks its source hash against that descriptor, and checks
the emitted bundle bytes against the bundle hash. Missing/mixed/stale
source would fail before the semantic toast checkpoint.

Each preserved closing capture includes `/workspace/src/ui/sheets.tsx`
among evaluated module inputs. The authored mutant therefore receives the
new source path through the reviewed data-query mechanism, rather than
depending solely on an ownership declaration or unchanged disk bundle.
The fixed baseline's single feedback versus the deliberately restored
defect's two-node semantic result is actual receiving evidence. The report
records three computed units and zero reused units; this is not a cached
verdict replay claim.

**Archival limit:** the closing capture strips query suffixes, and its
observation values are digests. It does not retain the full data-query
export, numerical `metadata.sheets.sha256`, emitted bundle SHA-256 or
browser-routed JavaScript bytes for this replay. Their equality is checked
by the examined runtime path; I cannot independently quote an archived
actual bundle hash or compare it offline. The input/code binding,
normalized evaluated path and semantic receiving rejection support this
bounded acceptance. They must not be described as a separately retained
byte-for-byte bundle provenance receipt.

## Remaining gates

This verifies the adopted singleton receipt's RED → repaired selected
GREEN → registered original-defect rejection chain and the selected
calibrations under ORC-005/006/007/010/012/014. It also confirms that the
diagnostic projection preserved the failing raw-count comparison while
removing the observed selected-baseline nondeterminism. No law, expected
answer or input domain was relaxed to obtain this result.

Only one authored mutant was selected from the loaded inventory of 76.
No automatic sheets operators or complete workflow/random campaign were
judged by this replay. Full integrated baselines, all maintained campaigns,
unsampled gap classification and the existing deletion gates remain due.
The visibility, timeout-lifecycle, tone-transition, extension and
assistive-technology limits in the original toast review remain unchanged.
