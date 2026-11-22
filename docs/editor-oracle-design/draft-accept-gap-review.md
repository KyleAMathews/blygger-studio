# Draft.accept: restored source is displayed but never consumed before repair

Independent review by `/root/review_formatting_coverage`, 2026-11-19. Base
commit `28b0c8d642a87e5810ad6eabd95c2d1714c53396`, package pin `97a4e7a`, plus
the frozen uncommitted runtime snapshot in the current integrated campaign.
The oracle review skill, checklist v1 and glossary were read before this
judgment. No browser, probe, test or oracle job was started; no runtime input
or campaign output was edited. This is a confirmed open enforcement gap,
with a source-reconstructed distinguishing continuation still to be executed.

## Raw finding, retained before disposition

The active `final-current-chromium-integrated/results.jsonl` reports:

```json
{
  "id": "ui/draft.ts:M3",
  "number": 421,
  "source": "src/ui/draft.ts",
  "line": 9,
  "operator": "delete-call",
  "original": "this.edit(text);",
  "replacement": ";",
  "function": "Draft.accept",
  "key": "src/ui/draft.ts#Draft.accept:delete-call:this . edit ( text ) ;",
  "outcome": "survived",
  "changedTests": [],
  "class": "not-distinguished"
}
```

Its reported owners are `editor-navigation.oracle.test.ts` and
`editor-receivers.oracle.test.ts`. The active campaign had reached its authored
phase when assigned; this individual result is not a completed full-campaign
verdict. It is not an equivalent, invalid or acceptable mutant. No kill or
closure is credited.

| ID | Claim and proposed fix | Truth on frozen source | Action/disposition | Lasting value |
| --- | --- | --- | --- | --- |
| DACC-001 | Removing `accept`'s edit survives because no current receiving history consumes the accepted working source before another input edit; add immediate ordinary Save draft after restore. | Survivor is reported by the active run; the causal path is supported by source. New distinguishing execution remains pending. | `confirmed-open`; prepare a separate scratch oracle proposal, apply/run only after the reference campaign finishes. | General receiving continuation from replacement to a source consumer, with generated input variation and full submitted/stored-source observations. |
| DACC-002 | The direct working-copy model excludes accept/reset; adding raw accept revision-counter assertions would not repair the receiving hole independently. | Direct oracle lists only edit/save/dirty ownership and explicitly keeps `Draft.accept` separate. | `confirmed-open`; strengthen the adopted restore/save receiving law instead of adding counter expectations. | Keep component and actual application boundaries distinguishable. |

## Authority and independently predicted observation

The existing replacement law is: “For every held restore, readonly textarea
input, disabled formatting controls and absent pickers preserve working
source/range; success receives historical source, failure reports and retains
working source, and either outcome releases editing for the next adopted
command.” Its authority is the decision by Kyle Mathews (GitHub
KyleAMathews), 2026-11-18, adopting the T4 picker/focus/readonly expansion and
preservation of existing behavior; `test-ui/authoring-revision-session.test.ts`
at the base commit supplies earlier actual replacement/working-copy guards.
The working-copy save law, under the same named decision/date, requires source
to remain the latest input and saves to submit that working-copy snapshot.
The real editor labels its action “save draft”; its restore confirmation says
“This replaces your current draft”. Together these adopted promises require
an ordinary save immediately after a successful restore to submit the restored
historical source, without an unrelated typing action first repairing state.

Prediction without reading production: arrange historical source
`published a` and a different current source `- parent\n    - a`; accept
restoration of the former; then save without editing. The whole submitted
source and the stored source after successful save must both be `published a`.
Neither promise prescribes how many internal revisions accepting text creates.
No raw counter law, new UI policy, publication/versioning rule, caret rule or
new host recovery promise is proposed.

## Trace through current code

1. `Draft.accept(text)` normally calls `edit(text)`, then marks the resulting
   current revision persisted (`src/ui/draft.ts:8–10`). Deleting that call
   leaves the old `Draft.text`; the persisted/current revisions still agree.
2. The full editor's restore handler separately calls
   `draft.current.accept(restored.contentMd)` and
   `setText(restored.contentMd)` (`authoring.tsx:2090–2092`). The latter updates
   the rendered controlled textarea even under M3. Thus the existing
   `settled.value` comparison cannot distinguish the stale working-copy source.
3. `replacementReceiverModel` predicts settled source independently from the
   arranged `published` input. Its driver records that textarea and the released
   guards, then always selects the body and presses bold
   (`receiver-driver-oracle.ts:259–265`). The real input handler calls
   `Draft.edit` from the changed DOM value (`authoring.tsx:2025–2031`), repairing
   the stale `Draft.text` before anything consumes it. Current `followup`
   source/range therefore also agree with the model under M3.
4. `navigationDriver` creates and loads a new item, departs and opens a quick
   editor. That new row's initial `Draft` text already equals its accepted
   item prop. It samples `quickLoaded`, then immediately presses bold; it
   neither delivers a different clean polled baseline nor saves an accepted
   baseline before another edit. The other `accept` caller, quick-row
   `acceptFresh`, similarly writes the textarea through a separate `setText`.
5. The direct draft grammar has only edit/save/resolve/reject/inspect. It does
   not enter accept, by explicit source/limits. Earlier revision-session tests
   also either inspect server text from the restore itself or edit refreshed
   quick text before saving. They do not supply this missing continuation.

## Smallest proposed receiving witness and its neighbor

The existing receiver grammar can arrange:

```text
mobile = false; body = "a"; outcome = success; picker = none
attempt = readonly ControlOrMeta+b
historical source = "published a"
working source    = "- parent\n    - a"
```

The existing sequence enters a real held restore, records the readonly attempt,
releases the actual POST and records `settled`. Add the public continuation
`Save draft` **before** the existing bold action. On source reconstruction,
normal production submits/stores `published a`; M3 submits/stores
`- parent\n    - a`, while still displaying `published a`. `Draft.save` reads
`this.text`; `createDraftAction` maps the submitted command text to the PATCH
`contentMd`, so the actual request and subsequent GET expose the divergence.
The difference belongs at the first complete `acceptedSave` observation,
before bold or a reload can repair/mask it. This witness has not been run.

A different input, such as body `α😀`, gives the same causal condition while
varying UTF-16 geometry. The nearby rejection continuation must save the
original working source because the restore never accepted replacement. Both
viewports, every existing readonly attempt and each picker remain in the
grammar; success/rejection is not filtered away.

## Minimal repair design, with preservation relation

The design-grammar trigger fires because an existing model changes. Preservation
is **same observations at every old checkpoint for every old history**, plus
additional receiving observations on newly generated continuations. Keep all
original constructed histories, arbitrary dimensions/actions/ranges/profiles,
seed `20261118`, budget 25, checks and calibrations. Keep the old immediate-bold
continuation; add a generated `saveThenBold` continuation rather than replacing
all histories with it. Construct success and rejection examples on both
viewports. The new distinction's job is to consume accepted source before an
input edit can synchronize it; the old branch protects immediate edit release.

The input-only model derives submitted/stored source directly from successful
historical input or retained working input. It needs no mirror of Draft's
revision implementation. The driver activates the actual Save draft control,
records the whole raw PATCH input, waits for its actual response, records its
response status and whole server GET source, and samples source/guards/public
saved/error feedback before the old bold continuation. It must not wait for
expected source, saved text, dirty flags or empty errors. Native action/response
receipts establish delivery, not correct output. Cleanup drains the extra work.

The check keeps old comparisons in their existing order and checks the new
complete save receipt before `followup`. Calibrate a stale submitted source and
a stale stored source independently, at `acceptedSave`. Do not demand private
revision increments. A public dirty observation is appropriate only through
an already adopted real guard boundary; a new synthetic-host dirty policy is
not needed to expose M3 and is not proposed.

Adjacent form: extending the direct Draft grammar with accepted-baseline events
could supply a component formulation, but needs a separately sourced accepted
baseline contract and still would not establish this actual React receiving
continuation. Adding only an internal text observation would miss the public
save path. The proposed receiving extension is the smallest public consumer
change that retains the old oracle's immediate-bold history and predictions.

## Evidence and next gate

This review establishes the reported survival and a concrete source-supported
missing history/observation. It does not establish a production defect in
unchanged code, RED, calibration success, reach counts for the extension, a
mutant kill or final coverage. After the active reference finishes, review and
apply the proposed oracle extension, run correct production, then replay the
exact M3 key and require a registered source-preservation failure at
`acceptedSave`. Retain the successful/rejected and Unicode neighbors and old
receiving checks. No production change is needed unless that strengthened
oracle first exposes one.

## Scoped checklist outcome

| Requirement (checklist v1) | Review outcome / remaining evidence |
| --- | --- |
| ORC-001 | Existing replacement plus working-copy save authority identifies the expected public source; no raw counter promise. |
| ORC-002 | Proposed expectation is an input projection; no production semantic imports or recorded output expectations. |
| ORC-003 | Current parts are distinguishable; proposed prose must explain the accepted-source consumer before edit repair. |
| ORC-004 | Confirmed missing continuation; preserve old grammar and add the consumer axis with reconstruction/ablation/range/exclusion controls. |
| ORC-005 | Confirmed public-path observation hole between visible restore and consuming save. New actual request/storage receipt is pending. |
| ORC-006 | M3 survives now; stale-submit/stale-store calibrations and exact-key rejection remain pending. |
| ORC-007 | Preserve fixed/random budget and direct replay; no new campaign executed. |
| ORC-008 | `saveThenBold` distinguishes displayed source from the source a later save consumes; no new private mutable state needed. |
| ORC-009 | Use existing restore/working source/submitted source terminology; continuation choice is history-only. |
| ORC-010 | Current original checkpoints remain; extra request cleanup and registered failure fidelity need execution. |
| ORC-011 | Actual submitted/stored source is a second public formulation beyond the textarea; no structurally copied Draft model. |
| ORC-012 | This versioned record binds raw finding, witness, authority, open gate and current source hashes. No closure claimed. |
| ORC-013 | Different accepted/current source is the distinguishing premise; rejected restore and Unicode neighbors remain necessary. |
| ORC-014 | Actual browser/React/HTTP receiving path proposed; controlled restore result and existing viewport premises stay explicit. |
| ORC-015 | Add trace-gated accepted-source-save constructions, not only plan-state labels; reach results are pending. |
| ORC-016 | No ordinary tests or fixed expected-answer test proposed; calibrations and constructions use the same law. |

No requirement is declared inapplicable to the proposed generated receiving
repair. This is a focused enforcement-gap review, not a complete re-audit of
all existing receiving oracles.

## Frozen source binding

Current hashes below were read and compared with the active campaign's
402-entry `pre-inputs.json`. The authority test is outside that runtime map;
its hash is recorded separately without claiming campaign execution.

| Source | Current SHA-256 | In frozen manifest |
| --- | --- | --- |
| `src/ui/draft.ts` | `cc3ee87d1e7233a77ae1a8ca5c395455efe5e1a65b9b209b1166e7d990d054ae` | yes, matching |
| `src/ui/authoring.tsx` | `863d35404d85e06f3c093f46cc1a6c73b369ea49c22fd00ac4fc954af47d8bc6` | yes, matching |
| `src/ui/data.ts` | `07f72235c9a1a3c42ad70d11a0c05031815f1cd437b978bf46c7d7bf2575cdf8` | yes, matching |
| `test-ui/editor-draft.oracle.test.ts` | `f3bd7714e568cbae0215649bfa365302f9ab34166398e620441a3effded9c9e1` | yes, matching |
| `test-ui/editor-oracles/draft-model-oracle.ts` | `2804ee38ed383d09e65b0f5d746a3d42283f2c4644bcf5b691e84f3d2c3e3e7d` | yes, matching |
| `test-ui/editor-navigation.oracle.test.ts` | `1f84b4f36ef00f56f3b782736442fa04e0900905c03d6aeba9c190b99111ba43` | yes, matching |
| `test-ui/editor-oracles/navigation-driver-oracle.ts` | `82bf6662cb2ecd74805c7a70683af80cd091e816ecc068cf118910a28ccb45e4` | yes, matching |
| `test-ui/editor-receivers.oracle.test.ts` | `9be323f56ae89ee4a4a4c95d0b3ac1451e66ba9eb4be5406e458f26db120bf45` | yes, matching |
| `test-ui/editor-oracles/receiver-model-oracle.ts` | `d956c4edfc0ea6af60f015903ea4fcf8654cb6b8e77acf8e36030c2c5a06c7e0` | yes, matching |
| `test-ui/editor-oracles/receiver-driver-oracle.ts` | `3d4ea719c43571dec3ad362d6062695cad50c34942253c4ae8ec9b94896efa00` | yes, matching |
| `test-ui/authoring-revision-session.test.ts` | `372e80bab9a910f16be82b523d782b8c11f2f565222630a360006e62e748fb10` | no; authority source only |


## Scratch proposal prepared, not applied

After the read-only finding, the parent authorized a scratch-only proposal
while the active reference remains frozen. The proposal lives at
`/private/tmp/draft-accept-oracle-proposal-150es87g/`, with `proposal.patch`,
`original/`, `proposed/`, append-only `ledger.md`, `design-preservation.md`,
`static-preservation.json` and `provenance.json`. The patch SHA-256 is
`58a449e48b736e00f981ef9319792334d5799ee7544569a3b230a95ed6fcb10f`.

It preserves all 52 old replacement constructions, all original body/key/
control/picker/outcome/profile dimensions, seed/budget, checks, calibrations
and the immediate-bold continuation. The bracket and Escape registrations
are unchanged. Four added constructions cover success/rejection in both
viewports; an optional generated `saveThenBold` continuation retains every old
history without adding that field to it.

The new driver holds the actual save PATCH, records its complete submitted
source at `acceptedSaveSubmitted`, then releases it, observes the original
actual `Draft.save` promise, receives an actual pane commit and records whole
stored source plus public dirty/result/saved/error feedback at `acceptedSave`.
The one-shot promise observer restores the original method before invoking it
and returns the exact original result to the real caller. No raw counter is
read or predicted. No expected source/dirty/feedback/busy value is awaited.
Four proposed calibrations corrupt submitted source, stored source, clean
acknowledgement and saved feedback separately. Their execution is pending.

Static inspection found no parser diagnostics, preserved all original
calibration source, original immediate-bold source, seed/budget and both
untouched registrations. `git apply --check` passes. These are source checks,
not type/lint, oracle, calibration, reach, browser GREEN or mutation evidence.
The proposal remains unapplied; all three original runtime files still match
their frozen hashes. No browser or oracle job was started.

| Proposed source | Scratch SHA-256 |
| --- | --- |
| `test-ui/editor-receivers.oracle.test.ts` | `c239a1b7903e618adfe6aacb75bf77fdca2a5960e60934e1a905dcd77a701cb9` |
| `test-ui/editor-oracles/receiver-model-oracle.ts` | `1b16c9360d464d9af17b898985075797178d0b4d75b4b3d2b5f9711f9da5d538` |
| `test-ui/editor-oracles/receiver-driver-oracle.ts` | `6de713c22ccce785b7e0a40dd80f8007b95f955e46d7ad76409df32f2d874ec7` |

DACC-001 and DACC-002 remain `confirmed-open`: proposal preparation is not
coverage closure. The next gate is independent review/application after the
active reference finishes, followed by correct-production and exact-mutant
receiving execution at the named source-consumption checkpoints.


## Independent scratch review and revision 2

The independent receiver reviewer raised two source findings after proposal 1;
both are retained here before their source disposition:

| ID | Raw finding | Revision 2 source repair | Evidence status |
| --- | --- | --- | --- |
| DACC-004 | Wrapper-derived `this.dirty` and `Draft.save` result were described as public UI feedback, although they are component API observations; exact `dirtyBefore=false` receiving enforcement adds unsupported accepted-baseline semantics. The reviewer clarified that the save-current boolean may remain under the adopted save law when no newer input occurs. | Removed all expected dirty values and the dirty-specific calibration. Raw values are named `dirtyBeforeDiagnostic` / `saveDiagnostics`. The checked save object now contains only component-public settlement status/result; prose separates this save-current receipt from actual saved/error UI. Its calibration now corrupts the current-result boolean, with no dirty expectation. | Parser/source checks pass; no component accept/counter law is added. Registered calibration/receiving execution remains pending. |
| DACC-005 | The new `page.waitForResponse` promise could reject without a handler if earlier native input or premise delivery failed before its await. | Immediately after creation, `drain.push(response); void response.catch(() => undefined);` registers cleanup and a rejection handler before any native input/premise await. The original response promise remains the later awaited target. | Source ordering verified. Early-failure/cleanup execution remains pending. |

This revision supersedes proposal 1's classification of dirty reads and its
clean-acknowledgement calibration. `proposal-v1.patch` and
`provenance-v1.json` preserve the prior artifact and hash; nothing is erased
from the raw ledger. DACC-001 through DACC-005 are not runtime closure claims.

Current scratch patch:
`/private/tmp/draft-accept-oracle-proposal-150es87g/proposal.patch`.
SHA-256: `e66899ed091040470bdfd0888d4c0c6a182dfa177074ce2d76b00ee58fd3e3c9`.

| Revision 2 proposed source | SHA-256 |
| --- | --- |
| `test-ui/editor-receivers.oracle.test.ts` | `b443b6abbc0f682f9fe43eba5679f7f968a0466407c18232d379fccc92ad9df8` |
| `test-ui/editor-oracles/receiver-model-oracle.ts` | `1d4f563fd32c7203da0634d7b717dcf8d98984689e6fbfd0610329d6a5caaf73` |
| `test-ui/editor-oracles/receiver-driver-oracle.ts` | `a50f521926a04106045b9fbfea2682d644dd1496b57c7d4a78465ba058ffb088` |

The static source inventory again preserves all 52 original constructions,
original checks/calibrations, immediate-bold source, seed/budget and both
unchanged bracket/Escape registrations. All proposed sources parse without
diagnostics, and `git apply --check` passes. No type/lint, calibration,
browser or oracle execution was performed. The proposal remains unapplied;
all three original runtime files still match the active frozen source hashes.
