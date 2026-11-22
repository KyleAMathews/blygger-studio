# Current integration clipboard loss and retirement gates

2026-11-19. Field Lab `loss-audit`, scoped to the two original clipboard/paste
tests in `e2e/compose-pwa.spec.ts:145–186`. Both tests remain. The reviewed
removal patch remains unapplied. Current source mapping, complete current
double-baseline receipts, and an actual cancellation receiving kill are
supported below. **Clipboard retirement is still withheld:** these receipts
do not complete the frozen reference mutation report, current full mutation
audit, remaining framework dispositions, or the root agent's final
review/application decision within the user's existing authorization.

This reviewer read product/test sources and completed artifacts, parsed JSONL,
compared bytes and hashes, and ran the read-only removal-preview checks. No
browser, oracle campaign, heavy job, VM/container lifecycle action, or action
on the original reference job was performed. Only this audit document was
written. Earlier [frozen](final-clipboard.md) and
[main-rebase](main-integration-clipboard.md) records retain their historical
source/run scope; this document does not rewrite their verdicts.

## Scope and source identity

Checkout: `/Users/kyle.mathews/programs/blygger-studio/.worktrees/oracles-main-integration`.
HEAD: `764cb40d15b8062dad70032f262807f4472ec962`, with uncommitted integration
changes. HEAD alone does not identify this source snapshot. The following
current files were independently byte-compared with **both** completed run
repositories identified below; every comparison matched.

| Current file | SHA-256 |
| --- | --- |
| `e2e/compose-pwa.spec.ts` | `a377efa8cc1ae5cce926d6c9de989feb10e5ed39a7f00e3fae2d37aae4af74b0` |
| `test-ui/editor-workflows.oracle.test.ts` | `d84d13f33c5fd75b86f0873eb1ddee9277f0ca3cbb6009753fe0f3b14d9c49ff` |
| `test-ui/editor-oracles/workflow-model-oracle.ts` | `ad252e25919b9915deb98392fe5291f57f8e97853a441f07b94f826ebf8212e8` |
| `test-ui/editor-oracles/workflow-driver-oracle.ts` | `a9454f5f9ce5cc9a97128b9bfe1720cd7f422fb9b59b7fee6ec172ea611b8cbd` |
| `test-ui/editor-oracles/application-driver-oracle.ts` | `7b30f54e51005b02057c213fa0dcdea016b5549672452960eaa317b0c561d9b7` |
| `test-ui/editor-oracles/link-model-oracle.ts` | `9af8f1836b794e82d60b3b6bf9e5ff4323e22acf840ac1bbfc522a7a81faa284` |
| `src/ui/authoring.tsx` | `4f9f069d43264ebab1ad7329be1b918c8cd7ea89a3f956435970ee976a032025` |
| `src/ui/sheets.tsx` | `3db1bb055755a995aea1cc25885917d05c0d74abd4ccd7f3a5503602cdd04070` |
| `src/ui/links.ts` | `04671ef2fb05ac2363a1b0bd23236914bcbbe49d19b10b506cf6cbbcea14292c` |
| `test-ui/editor-oracle-mutants/workflow-cancel-inserts.json` | `f32429d786ef59dccdb2af65677649a45a45a5e0c912517afeb971311f698201` |

The registration's receipt diagnostics and workflow driver's all-toast receipt
changed since the earlier rebase audit. The current driver retains every
`.toast` element's text/count rather than comparing a sampled visibility
projection. Current hashes and current-run evidence above/below apply to those
changes; old driver hashes do not.

## Separate source rescans and recovered-signal disposition

The proposed reduction is the existing workflow law/model/driver/check plus
the frozen removal preview. Each original test body was rescanned separately
against that reduction. The original helper implementations are outside this
two-body authority; their visible calls and arguments are retained as support.
No sibling old test was used to supply an absent clipboard observation.

### Original clipboard test

`link from clipboard strips trackers and links the selection, or asks for a URL`
arranges `Read the essay today.`, writes
`https://www.example.com/essay?id=7&utm_source=newsletter&fbclid=IwAR0x`,
selects `the essay`, and clicks the unfiltered clipboard-control selector.
It requires exactly
`Read [the essay](https://www.example.com/essay?id=7) today.` and
`linked selection · 2 trackers removed`. In the same composer it writes
`just some words`, collapses at document end, clicks again, answers the named
`link from clipboard` sheet with `https://example.org/p?gclid=1`, and requires
`Read [the essay](https://www.example.com/essay?id=7) today.<https://example.org/p>`.

Current `workflow-model-oracle.ts:24–25` preserves these literal arranged
inputs and both operations; `:48` supplies the mobile copy. The plan computes
the original selection and later end range from modeled accumulated source;
the driver fills once and executes both actions in one real application
context. `workflow-driver-oracle.ts:30–51` writes/reads the native clipboard
and waits for actual read completion, `:52–64` uses the real named sheet,
field and insert button and waits for dismissal, and `:103–114` records host
input, complete source, selection, sheet/dialog state, all toast texts/counts
and the unfiltered control count. The registration compares the independent
host premises first and every modeled receipt field second, followed by exact
checkpoint order and no browser errors (`editor-workflows.oracle.test.ts:50–64`).

### Original synthetic paste and transition test

`pasting a lone URL over a selection links it, in the composer and the editor`
retains all five ordered actions in `workflow-model-oracle.ts:26–30`, plus the
mobile copy at `:48`:

| Original arranged action | Original observation retained at the receiving checkpoint |
| --- | --- |
| In `see this page`, select `this page`; dispatch bubbling/cancelable `ClipboardEvent('paste')` with `DataTransfer` text `https://example.com/p?utm_medium=x`. | `step0.defaultAllowed=false`; exact `see [this page](https://example.com/p)`. |
| Collapse to `[0,0]`; dispatch URL `https://example.com/q`. | `step1.defaultAllowed=true`; accumulated source remains unchanged. |
| Select `see`; dispatch `not a url`. | `step2.defaultAllowed=true`; accumulated source remains unchanged. |
| Click `#composer-full`; receive `#md-input`. | `step3.value` exactly `see [this page](https://example.com/p)`. Only post-navigation selection is exempted; the original did not assert it. |
| In that full editor select `see`; dispatch `https://example.net/`. | `step4.defaultAllowed=false`; exact `[see](https://example.net/) [this page](https://example.com/p)`. |

The driver dispatches the actual synthetic event at `:72–78`, records its
`dispatchEvent` return, and takes the real full-editor transition at `:98–101`.
Allowed synthetic events do not insert native text; this preserves the old
event's behavior and cumulative source. Native paste is a separate additional
branch, not a substitute for the original synthetic path. No exact old payload,
source/default return, composer/editor action or action order was found absent.

### Previously recovered losses

| Item and dropping rule in the original reduction | Current disposition and remaining boundary |
| --- | --- |
| C1: trusting a successful provider read as expected-model input weakened the arranged ASCII clipboard URL → exact source/toast relation. | Restored by the independent stable-input premise before model comparisons. The original URL is nonempty printable ASCII without edge whitespace, so `host0.clipboard` must equal the arranged literal. A self-consistent receipt for a substituted URL still fails that premise. |
| C2: host-conditioning clipboard prose and the typed field weakened the required fallback branch and exact appended target. | Restored for the exact original histories: `host1.clipboard='just some words'` and `host1.typed='https://example.org/p?gclid=1'` are independently owed before `step1`. The accumulated source, named sheet/reason, and final appended source remain checked. |
| C3: filtering to visible controls before a strict click hid an additional hidden selector match. | Restored by counting every `[data-action="link-clipboard"]` match before visible activation and requiring `clipboardControls=1`. A hidden duplicate no longer disappears from the observed obligation. |

`workflowHostPremises` at model lines 75–85 derives these obligations from
arranged inputs alone. Stable means `/^[\x20-\x7e]+$/` and
`text.trim() === text`. Empty, edge-whitespace, control, Unicode and malformed
UTF-16 input remains host-conditioned; this is not a general normalization
correctness theorem. Exact original ASCII outcomes are restored without
claiming that broader domain. Cookie injection instead of the old visible
`login(page)` call remains a harness distinction, not claimed login coverage.

All three restoration calibrations still require distinguishing differences:
clipboard delivery at `host0`, typed delivery at `host1`, and
`step0.clipboardControls`. The latter count is corrupted to 2. This prevents
an unrelated recomputed-model mismatch from satisfying those calibration
checks. Installed `oracle-property.ts:1892–1912` requires the designated law
and difference substring. Passing calibration registrations establish checker
rejection under those rules; they are not production-mutant kills.

## Complete current double-baseline receipts

Run `adbe1df71f7a`, artifact root:
`/private/tmp/blygger-ci-764cb40-e0vnxfbb/repository/build/formatting-oracles/ci764-complete`.
`results.json` SHA-256:
`9dc905078f882cc12ec94e3a41f8d8d87539aa56c2d9f32e497df70a9c8e6f8c`.
It explicitly says `purpose=baseline-only`, `status=baseline-completed`,
`mutationAudit.status=not-run`, and `results=null`. All 14 oracle files ran;
each of the two passes contains 4,383 passing registrations, zero fail/skip,
and 161 passing workflow registrations. Excluded/nondeterministic are empty.
The 76 admitted authored definitions were not executed by this run.

The independent runtime review is
`/private/tmp/blygger-ci764-runtime-review.l_d9wdee/final-artifact-review.json`,
SHA-256 `9f58006a1609874f7fbd1a3216328e61d2c8845ba3083f4560017e34e708cfec`.
It verifies all 1,082 source and 78 installed-package entries plus 78-entry
derivation-before/after manifests. Its baseline-only runner derivation is
`267f2460f890e45da4d6735452423fd0cbb0bb5bbd989838c859f41f30a7f14f`;
this is not the pristine mutation runner used for the selected cancellation.

This audit independently parsed the complete normalized arrays and the actual
preserved workflow raw captures, rather than using reach counts alone:

| Raw workflow capture under that root | Recorded tests | SHA-256 |
| --- | --- | --- |
| `preserved-live-captures/run-121-11.jsonl` | First pass: 161 pass | `6957dea5e75bbc176a9005771c532196ce11b663ee05c1c524db6790f6d50d85` |
| `preserved-live-captures/run-121-25.jsonl` | Repeat: 161 pass | `19634b7babb98d6f5fd6bd60cb8eed12e883d7e0e123b21e0aced1af0da9c3c8` |

Each file has 163 JSONL records: 161 test rows and two metadata rows. All
161 raw test rows match their corresponding normalized `hash`, `observed`,
state and route. Paired state-at/after-link files have `mutant=null`,
`select=null`, seed `20261118`, and no per-unit overrides. Every one of the
four original construction names appears once in each fixed-named campaign,
random-named campaign and constructed-history determinism registration, in
both passes. The four fixed construction receipts are:

| Constructed history | `observed` hash, identical in both passes | State / route |
| --- | --- | --- |
| `originalClipboard` | `e2535b76bd47ed812d8955791cbf7b826b7eddaa` | pass / fixed seed |
| `originalClipboardMobile` | `e2535b76bd47ed812d8955791cbf7b826b7eddaa` | pass / fixed seed |
| `originalPaste` | `ef6bf51747e0cfdd2a02f65f6d1197a3353a1575` | pass / fixed seed |
| `originalPasteMobile` | `ef6bf51747e0cfdd2a02f65f6d1197a3353a1575` | pass / fixed seed |

All six named calibrations have direct passing rows in both raw captures:
`stable ASCII clipboard delivery changed`, `stable ASCII typed delivery changed`,
`hidden duplicate clipboard control`, `clipboard source lost`,
`native paste incorrectly intercepted`, and `sheet forgets selected range`.
The first three therefore supply current execution support for the restored
C1–C3 enforcement, distinct from source applicability alone.

Successful captures retain observation hashes, not complete successful
`hostN`/`stepN` traces. Literal successful values above are source-reconstructed
expected checkpoints plus direct passing registered receipts, not recovered
raw successful text dumps. Some other transient captures were missed; global
raw archival completeness is not established. Complete normalized arrays are
retained. Their public observation/work hashes agree; three instrumentation
call/hit counts differ, including workflow random-named `full-mobile`.

**Fresh randomness is not established.** The CLI sets replay seed `20261118`;
the registrations named `random seed` also report route `fixed seed`. Both
named sets executed, but cannot be described as independent fresh unseeded
campaigns. This limit applies to these receipts even though the source keeps
`runs:25`, fixed seed, arbitrary grammar and construction inventory unchanged.

Authority clarification: the installed `oracles-design/SKILL.md:362–364` says,
“Give at least one fixed seed in `fixedSeeds`. The random campaign always runs
beside it.” It does not literally require an unseeded run. The stronger
acceptance wording in this audit was inferred from the earlier
`integration-draft-accept-execution-review.md:166–171`, itself a review record;
no user instruction or explicit migration-plan requirement was established
for that stronger gate. A fresh unseeded sweep is a review recommendation for
additional generated coverage, **not a new retirement or permission gate**.
The seeded-run evidence limit remains factual regardless of that recommendation.

## Actual cancellation challenge

Run `2d634afa6797`, artifact root:
`/private/tmp/blygger-current-cancel-h9n5mq_4/repository/build/formatting-oracles/current-cancel-replay`.
`results.json` SHA-256:
`83a463f1a9108cd1076f2103335cf82e80580a446a145aa67060c9524ccca91e`.
This explicitly partial run uses the pristine runner and selects only
`authored:workflow-cancel-inserts`. Its explicit replay config runs fixed
`cancel-desktop` and `cancel-mobile` plus six calibrations: eight passing
registrations per baseline, 153 intentionally skipped, no separate random
or determinism campaigns. Its source manifest matches the full baseline's
1,082 entries; both use the same 78 installed-package inputs before derivation.

Independent accepted review:
`/private/tmp/blygger-cancel-runtime-review.iAXl5f/review.json`, SHA-256
`c4b02f8d770f89350b2112ad207e16630b7e77fa28deb86aceb07b30a852a433`.
This audit independently inspected repeat raw
`preserved-live-captures/run-290-2.jsonl` (eight passing test rows, SHA-256
`80781211e544b7fb8759e0a96e2c176207b6d5b6629d9bf790b0b3c39824d27c`)
and compared all eight observed hashes with both complete-baseline arrays:
all match. The first partial-baseline raw capture is absent; its aggregate
passing count is reported, not independently recovered as raw rows.

Mutant raw `preserved-live-captures/run-290-3.jsonl`, SHA-256
`8c61b1ef08803b83b3444bfc831361a14f6c668175420aad74461e0cd9d5b591`,
contains an actual registered `OracleViolation`:

```text
property: editor-browser-workflows
law: completed-link workflow receipt
checkpoint: step0
route: fixed seed
registration suffix: fixed seed 20261118: cancel-desktop
difference: step0.value was "<https://cancel.example/>"; expected "";
            toast details [{"text":"inserted link"}]
```

The report credits this same law/route and `outcome=killed`. This is a
behavioral receiving rejection, not baseline cancellation reach, timeout,
setup failure, crash, or a checker-corrupted trace. The preserved shrunk
history is an empty desktop composer and a single real cancel operation.
Early stop after this kill supplies no separate mobile mutant kill; no
additional mobile kill is invented as a retirement requirement.

The definition matches the current authoring source once: replace
`if (typed === null) return;` with insertion of `https://cancel.example/`
before return. Reconstructing that exact patched authoring gives SHA-256
`3803d084ff75a29ff720a5ba075d7a62927c8b20811b884bc3e82225a875f1ef`.
The delivery path accepted by the independent review is per-context authored
Serve patch → Vite `authoring?oracle-application` → bundled received source
→ actual `studio/app.js` fulfillment → real sheet cancel → textarea receipt.
There is no separately archived delivered-bundle byte file; the reconstructed
patch hash is not one. Paired mutant state-at/after-link metadata agrees:
outer mutant/select null, one temporary workflow unit with mutant `-1`,
select null, `stopOnKill=true`, and empty ignore list. Outer null alone would
not identify this mutated per-copy execution.

## Removal preview remains exact and unapplied

Packet: `/private/tmp/blygger-main-integration-clipboard.8gx1JM7B/`.
The read-only validator with `--preview` passed on the current real file,
as did `git apply --check compose-pwa.patch`; neither applied changes.
Current base SHA remains `a377efa8…`; exact candidate SHA is
`a01eca5e1b1858e70cf08b8ea264a72b6ebb2bc281c4dcfc235ae68fe1f339c1`.
Patch SHA is `6419642cc93fb63f9c48cad442ac8ea7288f9428d681855dd0d4c2920cdda5f7`;
provenance SHA is `a026d485094af37e3ebb6a6c1f80fb9e766d75477b070e2b64c77ecf2dff03ef`.
Validator SHA remains
`f6de8468c5af9f1fe8447aa97429de5c3246d6b1611da0534f7da372da078251`.

The preview removes exactly the two audited tests, their unused `setClipboard`
helper and the same coverage-header text. It changes 12 declarations to 10,
including the nested scan tests, while preserving **exactly ten retained test
bodies byte for byte**, with no remaining `setClipboard` reference. The
retained upstream `.toggle-group-count`, button/`aria-pressed` assertions and
thread-button action remain intact. The root agent's final review/application
decision remains pending, followed by the same validator without `--preview`
against the actual applied file. The user already authorized test replacement;
this audit does not request another user permission step.

## Retirement gate disposition

| Gate | Precise disposition |
| --- | --- |
| Current two-body loss mapping and C1–C3 restoration | Supported in current source; no additional absent old-body observation found in this rescan. Broader host normalization remains an explicit domain limit. |
| Current complete double baseline, four original desktop/mobile constructions and restoration calibrations | Supported by the 14-file, 4,383 × 2 baseline and direct workflow raw records, with matching scoped current bytes and reviewed unchanged input manifests. This is baseline acceptance only. |
| Actual cancellation authored challenge | Supported by the registered desktop `step0` law rejection and matching per-unit metadata above. The previously missing exact-ID challenge is now exercised. |
| Original frozen full reference mutation report | Still open under the parent's coordination. This review neither polled nor altered the original job and does not claim its report completed. The current baseline and selected kill do not substitute for that report or its loss/classification obligations. |
| Current complete mutation audit and reference-to-current disposition | Not established: the complete current report explicitly ran no mutations; the cancellation report executed one selected mutant only. Carry the exact frozen report identities/payloads and every unresolved/current-source disposition into the parent's final audit. Prior bounded witnesses, including the separate prior-snapshot `Draft.accept` M3 review, retain their scope and do not become a later full sweep. |
| Known framework findings | Historical M22 browser-I/O work-accounting exclusion and M30/M52 unreachable-equality/comparison findings remain explicitly recorded in `oracles-feedback.md` and the gap reports. These runs do not kill, suppress or resolve them. Retain their exact report classification and framework disposition; do not call the overall result gap-free. |
| Final root review/application decision and applied-file verification | Pending within the user's existing replacement authorization. Preview applicability preserves a reviewable candidate; it does not complete the root agent's audit decision or applied-file check. Both original tests remain. No additional user permission is requested. |

Runner composition acceptance, CI adoption, cold-install/performance comparison
and process cleanup are separate claims. The baseline review records host
sleep/dark wakes, existing-install assembly, sampled process evidence and
in-container zombies; bounded container disappearance is not graceful reaping.
Nothing in this clipboard audit supplies an uninterrupted timing result,
all-runner failure-fidelity proof, or global semantic/gap closure.
