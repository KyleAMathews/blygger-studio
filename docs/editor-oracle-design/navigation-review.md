# Navigation oracle design review

Independent review before implementation, 2026-11-18. Uses the pinned `oracles-review` skill, checklist v1, glossary and design-grammar instrument. Read `src/ui/draft.ts`, the editor's navigation/save handlers and the original browser scenario previously recovered with `git show HEAD:e2e/format-shortcuts.spec.ts`. No implementation edits or browser jobs by this reviewer.

## Verdict and authority

**The proposed decomposition is suitable, subject to the three model/driver conditions below.** It reconstructs the original raw-navigation observations and adds the explicitly approved distinction between SPA departure, Stay and Leave. Approval is authority for those intended decisions, not evidence that the eventual implementation enforces them.

Authority is Kyle Mathews (GitHub KyleAMathews), 2026-11-18: the parent reports the user's approval of the next plan to register Stay/Leave navigation, broader mixed actions, actual links/controls and a final campaign/loss audit. Preserve that approval with the final law record. The existing adopted formatting laws remain authority for I/I and quick-editor B. Current source and Playwright defaults are supporting evidence, not independent authority for inventing another guarantee.

| Route/premise | Promised observation |
| --- | --- |
| Original raw history: initial marker saved; I/I; neither intermediate nor latest edit commits before departure | I gives `*marker*`; I restores `marker`; hard navigation reopens that same item's stored `marker`; quick B gives `**marker**`. No latest-save acknowledgement is inserted. |
| Earlier italic source committed; current plain source pending; actual ← compose link | Product save-on-leave commits the latest source before successful quick-editor transition. A failed save must not masquerade as successful departure. |
| Same pending-save premise; explicit Stay | Warning/decision is recorded, departure is canceled, editor URL and latest visible source remain. A later actual save can make departure safe. |
| Same pending-save premise; explicit Leave | Warning/decision is recorded; departure can discard uncommitted current text and reopen the stored earlier source. No no-loss-after-discard guarantee is adopted. |

This is **reconstruction** of the original observations under a specified legal schedule, plus the user's approved navigation-law refinement. It is not a proof that every uncontrolled timing of the old test had identical observations. Explicit Leave makes visible the choice formerly supplied silently by Playwright's unhandled-beforeunload default; it does not require preserving unsaved text after that choice.

## D1 — Source strings alone cannot determine dirty state

The independent model must retain whether the latest edit event has been acknowledged, not merely compare `currentSource` with `savedSource`.

Smallest distinguishing witness: start saved `x`, I → `*x*`, I → `x`, with neither edit saved. Current and saved strings are equal, but the edited draft remains dirty and must still exercise the warning/save boundary. This differs from an untouched, clean `x` even though their two source strings match. `Draft.edit` increments edit identity and `dirty` compares acknowledged/current revisions (`draft.ts:3–6,19–28`); deriving expected state by string inequality would miss the distinction the original history needs.

Use an independently defined input-event/snapshot identity or an unacknowledged-edit state justified by legal continuations. Do not copy production counters as a trusted classifier or read `Draft.dirty` to decide its expected result. If the grammar admits multiple outstanding saves, the model must associate each acknowledgement with its submitted snapshot and account for their permitted order. A late older acknowledgement cannot silently acknowledge a later edit. This is ORC-002/008/013 and is a design requirement, not a confirmed implementation finding.

## D2 — Acknowledgement must not be confused with server commit

The host helper must explain exactly where it holds a save. Delaying only the response after forwarding the request can leave the client unacknowledged while the server already stores the latest source. Then an oracle predicting the earlier stored source on Leave would falsely reject correct behavior.

For the proposed `lastAcknowledgedSavedSource` model to stand for persisted source, hold unreleased requests **before forwarding/commit**, or independently represent committed and acknowledged snapshots. Establish the earlier italic commit with the matching real request/result; establish that the latest plain save has not reached commit. Reopening quick edit must load from the actual server, not an oracle-supplied replacement body. Preserve the original I/I raw history with no intermediate commit and no latest-save wait by controlling delivery, not by adding an arbitrary delay or test-only flush.

Where the schedule fixes the stored source, compare that exact modeled snapshot. A blanket allowed set `{current, previous}` would hide delivery errors. Where commit ordering is genuinely free, represent the permitted order explicitly. A raw Leave cannot be followed by cleanup that silently forwards an otherwise held save before its observation. This is ORC-004/005/014.

## D3 — Guard failures must reach the registered comparison

A wrong `Draft.dirty` or missing unload guard can cause navigation to complete without any dialog. Do not turn that wrong behavior into a `waitForEvent('dialog')` setup timeout. Record navigation/dialog outcomes as data and let the law reject an absent warning, incorrect decision handling, or completed Stay. Similarly, the navigation abort caused by a successful dismissal is an expected action outcome, not a harness runtime failure.

Observe URL, visible source, warning type/choice and persistence delivery at their actual checkpoints. Release resources and held requests without erasing an earlier violation. This is ORC-005/006/010; a timeout or setup failure is not a mutant kill.

## Independence, ownership and receiving boundary

Delegating the actual SPA's `Draft` import to the exact instrumented Vite module is consistent with the formatter approach. Preserve the real constructor/class behavior, per-editor instance state and persist callback; do not add an alternate Draft implementation, fake successful save, or Node execution of production in the model. Own the functions whose effects the registered observations actually judge (`dirty`, `edit`, `save` and formatter receiving), and let the gap run report remaining owned behavior honestly.

The input-history model and separate host helper are a reasonable reduced form: source predicts edit results, acknowledged snapshot predicts stored reload, unacknowledged edit identity predicts the warning/save premise, choice predicts navigation continuation, and route identifies the receiving boundary. Removing each distinction has a witness above. A single typed event history with derived state is an adjacent implementation form; it keeps the same laws while moving reconstruction into the reducer. Neither form is claimed minimal.

The exact old I/I → hard navigation → same-id quick B history must be a constructed route of the new registered oracle, retaining its three source observations and actual browser entry points. The prior committed italic/current pending cases must also be constructed for SPA/Stay/Leave, including both viewport profiles and supported engines. They must not replace the original route or be ordinary example tests beside the oracle.

## Evidence required after implementation

Review the executable law/model/grammar/driver against this design; then show fixed/random/replay execution, declared reach and assertion-producing challenges. Useful wrong designs include: treating edited-back text as clean; claiming a later edit saved when only an earlier snapshot was acknowledged; allowing SPA departure before its latest save; ignoring Stay; suppressing the warning. Keep native-edit grouping and navigation persistence as separate host premises. The new registered reconstruction is not closed by the present design approval or prior link-only green run.

This review addresses ORC-001–006 and ORC-008–016 through the authority, independence, grammar, checkpoints, state distinctions, cleanup, receiving premises and evidence boundaries above. ORC-007 remains an execution obligation of the registered implementation. No requirement is waived, and no production change is proposed.

## Initial implementation review — raw findings

2026-11-18. Read `editor-navigation.oracle.test.ts`, `navigation-model-oracle.ts`, `navigation-driver-oracle.ts`, `application-driver-oracle.ts`, Draft delegation in the application builder/browser transport, and `src/ui/draft.ts`. Initial Chromium run was active; no browser jobs or implementation edits by this reviewer. Evidence below is **read from source**, not an executed mutant result.

### Accepted implementation elements

D1 is represented independently: the model's `savedEvent` index distinguishes edited-back text from an untouched saved value (`navigation-model-oracle.ts:31–40`). All generated histories have at least one unacknowledged edit, so this receiving grammar intentionally exercises dirty departures; it does not establish later clean-state behavior.

D2 is implemented at the correct boundary: PATCH routing waits before `route.continue()` (`navigation-driver-oracle.ts:18–22`). Actual endpoint responses are selected without matching an expected source body; the stored-source observation judges wrong payloads rather than filtering them out. The original schedule forces native I/I and holds all writes, preserving the original three raw-navigation source observations. Both schedules, three departure choices and two viewports are constructed. The pending schedule acknowledges only the first edit, then holds later writes. The independent star-count model predicts command sources/selections without reading Draft/router results.

The actual app imports `globalThis.__oracleDrafts.Draft` directly; this preserves the instrumented class rather than constructing an alternate implementation (`formatting-oracle-application.ts:35–36`; `browser-driver-oracle.ts:109–114`). Models import no production semantic module. No ordinary example test was introduced.

One lifecycle property is coherent here: the same modeled working copy and committed snapshot determine warning, departure and next-editor observations. A separate Draft component property for exact dirty/save/return-value state is a useful independent second formulation, not a required split of this receiving law. User approval covers the explicit Stay/Leave/SPA policies; no no-loss-after-discard rule was introduced.

### NAV-I1 — Hard reload loses outgoing Draft capture [P1]

- **Challenged claim:** exact instrumented Draft ownership/reach through real hard Leave.
- **Source:** format-loop captures occur at `navigation-driver-oracle.ts:43`. Later autosave, unload guard and Draft calls can occur after that capture. Hard navigation at `:78` loads a new document, whose init script replaces `__formattingOracle.calls` (`browser-driver-oracle.ts:109–114`). The next capture after quick edit is `navigation-driver-oracle.ts:99`, against the new document. No surviving channel forwards the outgoing document's final packet.
- **Smallest witness:** pending Leave: formatting packet captured; pending autosave/dirty guard executes; dialog accepted; original document destroyed; new quick-editor packet captured. The public departure observation may still be correct, but the outgoing guard/save instrumentation is absent from Node's reach/infection/work accounting.
- **Repair:** preserve the actual outgoing packet across document destruction with a browser-to-Node bridge ordered after the relevant guard work (for example a carefully validated pagehide delivery), or another non-lossy channel. Do not read a new document's packet as evidence of old-document reach. Preserve packet/transport errors distinctly.
- **Status:** source-confirmed capture loss. Its exact effect on gap-run classification is not claimed as executed evidence. ORC-005/012/014/015.

### NAV-I2 — Goto and cleanup have unbounded host waits [P2]

- **Source:** hard `goto` uses `timeout:0` (`navigation-driver-oracle.ts:78`). The initial warning/navigation race is bounded by `hostEvent`, but after a warning a Leave history awaits `leaving` directly at `:81`. A warning followed by noncompleting navigation can therefore bypass that bound. `application-driver-oracle.ts:33–34` also awaits context close and then all drained promises without a terminal host bound; if close rejects without ending the operation, draining can remain pending.
- **Witness:** dialog receipt/acceptance succeeds but the subsequent document load never completes. Alternatively, Stay leaves a protocol goto pending and context close fails before canceling it.
- **Repair:** give these host operations bounded setup/cleanup termination and preserve their classifications; do not invent a product save deadline or count a timeout as a kill. Keep the intentional Stay behavior that avoids awaiting a canceled WebKit goto before closing its context. Track async dialog-handler failures as host diagnostics rather than unhandled event-listener rejections (`:56–60`).
- **Status:** source-confirmed missing bounds, no hang induced. ORC-010.

### NAV-I3 — The pre-release SPA checkpoint can report an earlier URL state [P2]

- **Claim:** SPA navigation waits for save delivery, rather than merely appearing in the editor at one early sample.
- **Source:** `navigation-driver-oracle.ts:70` computes `inEditor`, then awaits textarea input and a server GET before recording `blocked` at `:71`; release follows at `:72`. No navigation-event ordering relative to release is retained.
- **Smallest wrong design/schedule:** a save path resolves early; `inEditor` is sampled true and the textarea is read; SPA navigation commits while the stored-source GET is outstanding; the driver records the earlier true value, releases the held autosave, then quick edit loads its now-current source. The existing blocked and final-source comparisons can both pass even though departure occurred before release.
- **Repair:** retain actual navigation/URL transition ordering relative to the controlled release, and compare that ordering through the law. At least avoid assembling a checkpoint from a stale pre-await URL boolean. The relevant wrong design is premature save resolution; challenge it with the pending SPA route. Do not resolve this by an arbitrary wait or by checking the model's expected source to settle the checkpoint.
- **Status:** source-supported observation race; the proposed premature-resolution mutant experiment has not run. ORC-005/006.

### NAV-I4 — Routing errors are suppressed by destination URL alone [P2]

- **Source:** `navigation-driver-oracle.ts:22–25` swallows any `route.continue()` error whenever the page is closed or its URL is compose. That predicate applies beyond the deliberate hard Leave and does not identify a canceled outgoing request. It can suppress an unrelated routing/transport failure after SPA navigation or during later quick editing.
- **Repair:** retain routing errors as host diagnostics and suppress only the specifically recognized cancellation of the outgoing document in the appropriate Leave history. Drain/record route-handler failures so an async handler rejection cannot escape the driver's failure accounting. A successful destination URL is not evidence that a routing error was expected.
- **Status:** source-confirmed overly broad catch; no fault injected. ORC-010.

### Missing PATCH and exact Draft outcomes remain a component obligation

Endpoint matching correctly avoids selecting only expected bodies, but `page.waitForResponse` for the first acknowledged save (`navigation-driver-oracle.ts:40–47`) and `hostEvent(intercepted.promise)` for the pending save (`:52`) can fail as setup/timeout if a wrong Draft save never issues a request. This driver does not currently produce a registered law assertion for that design. Similarly, all its departure states are dirty; after Stay it checks stored text but does not subsequently observe that a fully acknowledged working copy is clean. A `Draft.save` mutant that never advances acknowledged state therefore needs another distinguishing observation.

The parent has stated it will add a separate registered browser Draft property, using an independent set of unacknowledged input tokens and submitted snapshots with resolve/reject/out-of-order acknowledgement actions. That is an appropriate way to judge exact `text`, writes, `dirty` and returned boolean without inventing a UI liveness deadline. Until its actual assertion-producing kills exist, these owned Draft behaviors are open; the UI timeout must remain classified as setup/nonkill. This is a limitation and pending repair receipt, not a request for new law approval or permission to narrow the model.

### Remaining evidence boundary

The initial receiving implementation reconstructs the intended original raw input/value history and explicit choice policies in source. It is not yet a complete ownership/gap closure receipt. Retain execution evidence for actual warning decisions, both engine/viewport delivery, exact Draft-state challenges and the four findings above before citing full navigation closure. Existing calibrations only prove their corrupted traces are rejected; they do not execute the named wrong production designs.

## Re-review — navigation repairs and independent Draft formulation

2026-11-18. Independent **read-from-source** re-review of the repaired navigation driver, shared application host, browser transport, navigation law/model, new Draft law/model and existing `test-ui/state.test.ts`. Read the pinned review skill, checklist v1 and glossary again. No implementation edits or competing test/browser jobs by this reviewer. Source was frozen for the parent's execution campaign.

### NAV-I1–I4 disposition

| Finding | Source disposition | Remaining execution obligation |
| --- | --- | --- |
| NAV-I1 outgoing capture | Repaired in source. `navigation-driver-oracle.ts:57–69,107–108` sends the outgoing packet through an exposed Node binding and requires its receipt independently of the dialog. Transport failures are retained. Installed TanStack history installs its product guard in capture phase (`node_modules/@tanstack/history/src/index.ts:480–514,580`), before this later normal-phase listener. The packet includes the synchronous dirty-guard calls. | Actual departing-document delivery in each supported browser remains a receiving premise. A missing receipt is a setup diagnostic, never a kill or a green comparison. |
| NAV-I2 host termination | Repaired in source. Hard goto uses the page's bounded default timeout; Stay preserves the intentional canceled-load treatment. Dialog tasks are tracked. Context close and draining are bounded, with the original error preserved as `AggregateError.cause` (`application-driver-oracle.ts:23,29–37`). | Execution must retain host failure classifications. A host timeout is not a new product save deadline. |
| NAV-I3 stale SPA sample | Repaired in source. `navigation-driver-oracle.ts:79–94,111` records main-frame departure events before controlled release, resamples the URL after awaited reads, and includes `departedBeforeRelease` in the law comparison. A dedicated corruption checks the added observation (`editor-navigation.oracle.test.ts:68`). | Run the pending-SPA premature-save design through this receiving boundary. Static tracing and a corrupt-trace calibration do not themselves establish the production mutant kill. |
| NAV-I4 swallowed route errors | Repaired in source. Route tasks retain their original rejection in `drain`; no destination-URL suppression remains (`navigation-driver-oracle.ts:16–28`). Held discarded writes are explicitly aborted in teardown (`:20–22,128`). Dialog-handler failures follow the same tracked cleanup path. | Confirm baseline cleanup across actual Leave/Stay and classify any cancellation diagnostic explicitly. |

These dispositions close the identified source defects; they do not substitute for the navigation campaign receipt. The parent reports the first repaired Chromium navigation baseline passed 45 checks, with the repeated baseline and mutants still running when this note was written.

### Rebuilt Draft observation and independence

From the adopted snapshot promise alone: start `x`; edit `y`; save A; edit `z`; save B; acknowledge B; acknowledge A. After B, text is `z`, dirty is false and B reports true; after A, text remains `z`, dirty remains false and A reports false. A's late completion cannot reinstate already discharged work or claim its older input is current.

`draft-model-oracle.ts:21–37` derives this using sets of unacknowledged edit-event tokens and a submitted token snapshot per save. It neither imports Draft nor reproduces the production `Math.max(persistedRevision, revision)` rule. The latest event identity separately decides each save result; a token set alone would not distinguish an initial save completed after a same-text edit. This is a useful independent second formulation, including equal-text edits, pending edits, retries and both acknowledgment orders. The actual instrumented browser Draft receives controlled persistence callbacks (`editor-draft.oracle.test.ts:43–73`), and the same comparison checks text, dirty, exact submitted writes and settlement order after every action (`:74–78`).

The revised driver records a synchronous throw or non-promise save return as data (`:57–63`). This matters: the earlier `draft-reach-repaired` attempt reportedly classified two `save`-return-undefined challenges as crashes; those were **not kills**. I read `build/formatting-oracles/draft-return-observed/summary.md` and its results: run `6dab3bd5f2ec` reports the repaired 40-check baseline, 11 owned law kills, zero crashed production, zero gaps and 41 unowned warnings. The parent additionally reports the repeated 40-check baseline passed. The 41 warnings are Draft.accept plus 40 authored formatting/link mutants outside this single-property campaign; they are not 41 judged behaviors. Existing `test-ui/state.test.ts` remains and retains its paced queue ordering/coalescing and rejected-error-message checks. This component is not evidence for deleting those tests.

The rejection observation deliberately records the fact of rejection, rather than its exact reason. The law states that rejection discharges no edits; it does not promise error object identity. Existing `state.test.ts:31–35` still checks `offline` through the paced-write integration. No error-identity closure or replacement claim follows from the new property. Similarly, a never-settling wrong save promise can remain a runtime timeout; the quoted gap receipt demonstrates the 11 listed kills, not an exhaustive liveness theorem.

### DRAFT-R1 — Important save schedules are constructed but not declared as semantic reach [P2]

- **Challenged claim:** required reach for the new snapshot/overlap law, ORC-015 (checklist v1).
- **Source:** `draftStates` (`draft-model-oracle.ts:53–59`) reports initial, action kinds and same-text editing. The declared states and each constructed history's `enters` are derived from that list (`editor-draft.oracle.test.ts:40`). Histories `pendingEdit`, `newerFirst` and `olderFirst` do execute the important schedules today (`draft-model-oracle.ts:46,49–50`), but their reach has no predicate for an acknowledgment after a newer edit, two overlapping saves, or a newer-before-older acknowledgment.
- **Smallest design consequence:** remove the newer-first constructed history while leaving older-first and repeated saves. Every declared state can still be constructed and reached. The reusable law about late older acknowledgments has lost its guaranteed schedule without a reach failure. Random chance is not the required replacement.
- **Evidence status:** read from source; no schedule removed and no campaign run by this reviewer. The current 11/11 owned kill receipt remains valid for its current inputs.
- **Repair:** derive semantic reach predicates from the legal plan for stale completion, overlapping saves, and both completion orders; name constructed histories that enter each. Include rejection/retry semantic reach where it is cited as reusable protection. This strengthens enforcement of the already adopted law and needs no new law approval. Do this after the active source freeze ends, then rerun the affected property/receipt.

### Checklist disposition for this re-review

| Requirement | Outcome |
| --- | --- |
| ORC-001 | Authority and limits are traceable to the approved persistence/navigation decision. No preservation-after-explicit-discard promise was introduced. |
| ORC-002 | Source-accepted independent event/token model; navigation model remains independent of Draft/router state. |
| ORC-003 | Law, grammar, model, driver, observations and per-action checks are distinguishable in the new Draft property. |
| ORC-004 | Bounded UTF-16 text, edit/save/inspection actions and completion-slot resolver are explicit. No pending completion resolves a nonexistent save; it becomes inspection. The constructed histories include the important current witnesses. |
| ORC-005 | Actual browser Draft and app editor entry points are called; exact component results reach each step check. NAV-I1/I3 source repairs accepted, receiving execution still required. |
| ORC-006 | Draft calibrations and 11 reproducible owned kills are recorded; earlier crashes are correctly distinguished. Navigation repaired-mutant receipt remains pending. |
| ORC-007 | Same registered fixed/random property and budget are configured. Draft campaign receipt read; navigation completion/replay receipt remains pending. |
| ORC-008 | Text, outstanding edit tokens, per-save token snapshots and latest event identity each have a distinguishing continuation above. |
| ORC-009 | Model edit tokens/input-event identity are explicitly mapped to working-copy edits and acknowledgments, with production revision machinery kept separate. |
| ORC-010 | NAV-I2/I4 cleanup repairs accepted in source; save throw/invalid return now reaches comparison. Timeouts remain nonkills. |
| ORC-011 | New independent Draft token-set formulation supplies the requested second formulation; it does not replace the navigation receiver. |
| ORC-012 | This record preserves source dispositions and identifies exact read execution receipt. Full navigation closure remains pending that receipt, and DRAFT-R1 remains open. |
| ORC-013 | Existing constructed same-text, stale-edit and two acknowledgment-order witnesses distinguish the important boundaries; explicit reach enforcement needs DRAFT-R1. |
| ORC-014 | Controlled persistence is appropriately limited. Real application navigation separately receives the working-copy premise; browser delivery remains an execution obligation. |
| ORC-015 | Open DRAFT-R1: semantic save-state declarations must require the crucial schedules. Current action-kind reach is weaker. |
| ORC-016 | Source-accepted: constructed cases and calibrations feed the same property/model/driver/check; no ordinary unit test added to oracle files. |

All requirements apply to the introduced/changed properties in this re-review; none is waived or marked not applicable. No production fix is proposed by this report.

### Draft semantic reach follow-up

Read the strengthened `draftStates` after the parent reported `draft-semantic-reach` complete. It now derives actual plan predicates for edits during pending saves, overlapping and same-snapshot saves, stale/current acknowledgments, newer-first acknowledgment and older-after-newer completion, retries and initial clean saves. These address most of DRAFT-R1 without changing expected production semantics. The directory's summary reports 40 baseline checks and 11 owned kills with zero gaps; the parent reports the repeated baseline also passed. The framework reused run ID `6dab3bd5f2ec` despite the imported reach changes, so this receipt must be identified by **directory plus input-source hashes**, not run ID alone.

One residual reach distinction remained in the source read: no predicate requires an **older acknowledgment while a newer save is still pending**. Removing `olderFirst` would still leave all declared states entered by `newerFirst`, `pendingEdit`, `repeatedSave` and the other cases. If the claim requires both acknowledgment orders, add an `olderAcknowledgementFirst` predicate from pending submission identities and retain its constructed witness. This is a reach enforcement repair under the adopted law, not a change to the sound token-set expected-state model. Parent was notified; closure awaits the revised source and final manifest.

Subsequent source read during the mixed re-review confirms `draftStates` now adds `olderAcknowledgementFirst` when an acknowledged submitted event has a newer still-pending event (`draft-model-oracle.ts:74` in that read). The `olderFirst` construction is the required distinguishing schedule. DRAFT-R1 is now repaired in source, including the residual ordering predicate. Final source-hash/execution manifest remains the evidence boundary; no new Draft campaign was run by this reviewer.


## Continued review: receiver schedules and rejection extension design

2026-11-18. Reread pinned review/design/evaluate-review skills, checklist v1 and
glossary before this continuation. No browser jobs or production/shared-transport
changes. The parent explicitly authorized strengthening navigation histories,
model, observations and authored receiver challenges under the adopted
persistence/guard guarantees. The source base is still `28b0c8d…` with the
working changes fingerprinted after implementation.

### NAV-R1 — An early-SPA-departure design needs an isolated receiver challenge [P2]

**Claim:** the complete receiver evidence demonstrates that successful in-app
navigation waits for the current save. **Source:** current `blocked` and
`departedBeforeRelease` observations, and `src/ui/authoring.tsx:2007–2021`.
The current three-challenge Firefox/WebKit navigation reports kill
`draft-premature-save` first through `pending-leave-desktop`; that receipt is
valid, but it does not specifically establish rejection of a guard that permits
SPA departure while leaving Draft and hard-warning behavior correct.

Smallest wrong design: replace only the editor blocker's
`return !(await save())` with `void save(); return false`. The actual compose
link can now navigate while the held save is undelivered. All raw Stay/Leave
logic and Draft snapshot semantics remain intact. The existing pending-SPA
comparison should reject this at `blocked` or `departure`.

**Evidence:** source-supported missing isolated production challenge; no mutant
run by this reviewer. **Action:** add an authored `authoring.tsx` receiver mutant
and let the parent's receiving transport execute it. No production fix indicated.

### NAV-R2 — Save-rejection navigation is missing from the receiver grammar [P2]

The initial adopted design above explicitly requires that a failed SPA save
must not masquerade as successful departure. The current navigation property
only supplies successful saves and excludes rejected saves in its `limits`.
The browser Draft property checks rejection of controlled persistence callbacks,
but it does not execute the editor's asynchronous blocker catch, error banner or
later real navigation retry.

Smallest witness: edit formatted source; begin a real compose-link departure;
reject the requested save before commit. The editor must retain its latest
source and route, preserve the earlier stored source, and report the failure.
After a successful real retry, quick edit must receive the latest source.
Nearby wrong design: the blocker catch reports the failure but returns false,
permitting departure. No change to Draft itself is required for this defect.

**Evidence:** confirmed history/production-path coverage omission read from
source, not a demonstrated product bug. **Action:** strengthen the adopted law's
receiver grammar and checkpoints; keep this open until registered baseline,
reach and intended receiver-mutant assertion receipts exist. Parent has
explicitly authorized that strengthening, with unchanged production.

### DRAFT-R1 residual source disposition and receipt limits

Current `draftStates` now contains `olderAcknowledgementFirst`, derived from an
acknowledged submitted identity while a newer save remains pending. `olderFirst`
is its existing constructed witness. This repairs the previously recorded
residual reach omission **in source**. The reviewed `draft-semantic-reach`
execution output predates that added state: its `olderFirst reach` packets do
not contain `olderAcknowledgementFirst`. That earlier 40-check/11-owned-kill
receipt remains valid for its actual inputs, not execution proof of the newest
state. A final source-hashed receipt remains due. No state/model weakening or
production defect is inferred.

### Existing receiver receipts independently read

| Report directory under `build/formatting-oracles/` | Repeated baseline | Selected receiver kills | Verdict |
| --- | --- | --- | --- |
| `navigation-reviewed-chromium` | 45 checks, 100.0/100.8 s, zero nondeterminism | 2/2: document-start formatting, dirty false | Nonprovisional, no reported gaps in selected set. |
| `navigation-reviewed-firefox` | 45 checks, 122.8/123.1 s, zero nondeterminism | 3/3: the same two plus premature Draft save | Nonprovisional, no reported gaps in selected set. |
| `navigation-reviewed-webkit-r2395` | 45 checks, 110.5/109.3 s, zero nondeterminism | 3/3: the same three | Nonprovisional; explicit r2395 host limit retained. |
| `draft-semantic-reach` | 40 checks, 0.7/0.7 s, zero nondeterminism | 11 owned kills; 41 unowned warnings | Nonprovisional; older-first state addition not present in reach packets. |

These navigation registrations now execute the original raw I/I→hard
departure→same-item quick B history under the no-intermediate-commit schedule,
and the prior-commit/latest-pending Stay/Leave routes, on both viewport profiles.
Thus the earlier **missing raw registered history** is represented by these
actual receiving campaigns. This closes that specific reconstruction omission;
it does not promise identical outcomes under every uncontrolled old-test timing,
physical browser close, or saving after explicit discard. NAV-R1/R2 remain
separate enforcement obligations.

### Design grammar before the rejection extension

The trigger is a changed model plus a new asynchronous failure/retry overlap.
Preservation relation: keep named adopted laws and all old observations under
all old plans. This is enforcement strengthening, not a production refactor or
new discard policy. The old two schedules × three departure intents × two
viewport constructions, body/command domain, fixed seed 20261118 and 25-run
budget remain intact. Add `spa-reject`, with constructions for both old
schedules and viewport profiles, using the same arbitrary/model/driver/check.

| Part | Job and distinguishing witness |
| --- | --- |
| Existing input-event source/acknowledgment model | Distinguishes same-text dirty I/I from an untouched clean source; predicts earlier committed source independently of Draft. |
| New `spa-reject` departure intent | Delivers real compose navigation, rejected save, retained editor and real successful retry. A successful-only intent cannot reach the catch. |
| Held request and rejection phase | Fail PATCH before forwarding; a server commit cannot be hidden behind a delayed response. Reject all saves while the failed departure settles, including a queued autosave/guard request. |
| Failure checkpoint | Records actual error-banner presence, editor URL/latest source and API stored source. Wrong catch-then-leave differs here even if retry later repairs state. |
| Retry/release phase | Allows the real subsequent compose click to request/complete saving, then checks same-id quick edit and bold through unchanged source rules. A permanently poisoned write queue differs here. |
| Existing departure ordering receipt | Retains main-frame URL events relative to first release. An early navigation cannot disappear during later reads. |

Rules are the adopted successful-save/explicit-choice rule plus the existing
failed-save guard guarantee: rejection commits no latest text, keeps the editor
and latest input, reports failure, and permits a later successful save/navigation
retry. No conflict with Leave exists: `spa-reject` makes no discard decision.
The generated failure observation is not a generic expected exception.
`errors` continues to mean uncaught browser errors, expected to be empty.

A positive error-banner or actual departed-route event supplies the failed
attempt's completion observation. A missing host event remains a named bounded
setup failure, never a law kill. This avoids mistaking a still-running promise
for a completed rejection; it does not establish every possible silent-error
liveness failure. The targeted wrong catch-then-leave design supplies a real
observable rival for this extension.

Range/exclusion: body/command/schedule/viewport bounds are unchanged. The new
intent adds rejection only at an outstanding save in actual SPA departure;
there is no completion of a nonexistent save, no response-body source filter,
no arbitrary save delay and no test-only persist call. The nearby successful
SPA intent stays as its passing neighbor. Source-read reconstruction finds no
removed old branch; execution comparison is still owed.

Adjacent forms considered: (1) a save-result axis plus explicit event schedule
would represent more arbitrary retries at the cost of another Cartesian axis;
(2) a separate rejection property could reuse the driver but duplicate its
success/retry model and authority; (3) the selected departure intent reuses all
existing source/quick-edit checks and adds only the failed-attempt checkpoint.
No global minimality or formal-model claim is made. Authority is the approved
persistence/guard decision already recorded above; this parent-authorized
strengthening adds no policy and needs no repeated approval.


### Implemented strengthening handoff — execution pending

The parent authorized `#Editor` ownership for the real guard and will transport
its authored challenges without hiding sibling/other-contract gaps. This
reviewer changed only the three navigation oracle/model/driver files and two
new `navigation-*` authored mutant records. No production, runner or shared
browser transport was edited and no browser process was started.

The implementation keeps all 12 prior constructed histories and adds four
`spa-reject` constructions (original/pending schedules × desktop/mobile).
The arbitrary can generate each new intent, preserving body/command bounds,
25 runs and seed 20261118. The model predicts the retained failed-attempt
source and earlier stored source, then reuses the existing successful quick
load/bold predictions after retry. No Draft or router output supplies an
expected answer.

The driver delivers contract-shaped HTTP 500 `{code: "internal", message:
"Controlled save rejection"}` for the blocked PATCH before server commit.
Raw failed request method/body/status records are preserved in `failedRequests`;
the comparison additionally requires at least one delivered PATCH rejection.
It deliberately does not filter requests by a model-predicted source or promise
a particular number of coalesced writes. The `failed` checkpoint records
retained editor URL/source, server source and actual failure-banner presence.
A real subsequent compose-link click permits successful persistence/navigation;
`departedBeforeRetry` retains any intervening escape across asynchronous reads.

Two independent receiver rivals are registered as authored source mutations:
`navigation-premature-spa` removes only the guard's save wait, keeping native
warning and Draft behavior intact; `navigation-rejected-save-leaves` keeps
failure reporting but changes the editor guard catch to permit departure.
Both match exactly one source span. Neither mutant has been executed by this
reviewer; no kill/RED or repaired production is claimed.

Static verification only: all three changed TypeScript files parse, both
mutated authoring sources parse, and the projection onto every old model field
is identical across **7,440** prior-domain plans: every two-to-six-command
Bold/Italic sequence × five labels (ASCII, Greek, astral and maximum-length
examples) × both schedules × three original departure intents × both
viewports. All twelve old construction values are unchanged. This is a bounded
model comparison, not browser execution or proof about every body string. The
script avoided loading the oracle runner by leaving its unused helper exports
inert; it did not substitute a product semantic dependency.

Source/receipt SHA-256 at this handoff:

```text
568b1ecd150459fc7aa384f50edfeb19489f2ee402130f9ef05bcfdc85d0d2c4 navigation-model-oracle.ts
a70cb4b047ef35762a8e4c725c73cb8f3ff5314671aceea1365e0d2d681a5ea6 navigation-driver-oracle.ts
48327a26a649ba489957555a75a63b0ee1d0489269f75d094cf2f5df00e744b6 editor-navigation.oracle.test.ts
75da2bca855cfca5126a976bd0204ceb2959fba52c2934406c799eaec70585bb navigation-premature-spa.json
aae5b11994f7a3e3c900bd9fb1acb2e6dcf4db4fcb9d439c5fafad2584984f1e navigation-rejected-save-leaves.json
2804ee38ed383d09e65b0f5d746a3d42283f2c4644bcf5b691e84f3d2c3e3e7d draft-model-oracle.ts
c9a3700e8353baae536fdef7985f18ceb6729c2e9ba947f70e702c3bea3af865 navigation-reviewed-chromium/results.json
68111d98c1a48fb4291887c93a50400ad55d0e89da243848a74a2a48980e30f1 navigation-reviewed-firefox/results.json
812036952c518e1b98e34776c3f5486f967de1c3b84def3d757cce096902044c navigation-reviewed-webkit-r2395/results.json
3896c15cc123d0b4c3e324cd1def70684ea425c0ea3d851c665d2d125fafd961 draft-semantic-reach/results.json
```

Checklist v1 update for the extension: ORC-001/003 retain the adopted failure
guard authority in matching law/prose; ORC-002 retains the independent event
model; ORC-004 preserves the old grammar and adds failure/retry receiving
histories; ORC-005 adds real failure/retention/retry observations; ORC-006 adds
three trace calibrations and two unrun production challenges; ORC-007 keeps
fixed/random/replay configuration unchanged, execution pending; ORC-008/009 map
the new failed-attempt/retry intent and retain its distinguishing history;
ORC-010 retains tracked cleanup and distinguishes missing-host-event timeouts
from law failures; ORC-011 retains the independent Draft token-set formulation,
which still does not replace the UI failure receiver; ORC-012 records this
bounded static handoff without claiming completed enforcement; ORC-013 adds the
successful-save/failed-save distinguishing neighbors; ORC-014 still needs actual
receiving evidence from the strengthened driver; ORC-015 names failure and retry
states with constructed histories, with actual counts pending; ORC-016 keeps
all cases/calibrations inside the same registered property. All requirements
apply; none is waived. NAV-R1/R2 stay `confirmed-open` for execution until the
parent receives actual law assertions and final green campaigns.

### NAV-R3 — observe settled rejection even when its banner is missing

The first extended receiving run reached a pending autosave followed by a
compose save but timed out waiting for a visible failure. A focused real-app
probe records the latest autosave rejecting with `BlyggerApiError` and the
queued compose save rejecting with `undefined`; its guard retains the route
and source, but no alert appears. This is product-probe evidence, not yet a
registered RED. The previous completion predicate could not observe that
completed failure, so its timeout is an enforcement gap, never a law kill.

The existing adopted failure-reporting law, model, constructions, arbitrary,
budgets and seeds stay fixed. Install a transparent observer on the actual
browser `Draft.prototype.save` after Editor loads and before its first format
command. It calls the original once, returns its exact returned object, and
rethrows any synchronous reason unchanged; side observers record fulfillment
or rejection without replacing the original promise. The compose link's real
DOM click listener tags the first save it starts, so an overlapping earlier
autosave cannot stand in for the departure attempt. `undefined` rejection
remains a distinct raw receipt.

After that save settles, the driver uses Editor's actual pane handlers for a
preview/draft round trip and awaits both committed `data-pane` attributes.
This explicit render-control premise gives the actual receiving Editor a
render opportunity with the settled action state even when that state renders
no banner. The failed checkpoint is after settlement and that pane round
trip, not a claim about pre-render output. If a wrong departure already left,
the route itself supplies the public failure observation. Neither missing
settlement nor missing pane commit is counted as RED. The retry still uses a
real compose click and the actual successful provider.

This repair changes the completion observation only; the independent model
still requires an alert but no particular message. The probe's exact reason
is diagnostic evidence, not a new user-facing error-text contract. The parent
approved the real-handler render premise before implementation. Design grammar
triggers do not add a new model change: this is the same previously recorded
failed-attempt/retry design with a missing observation repaired. No production
or shared transport change is included. Focused registered execution is owed
after the shared transport owner declares its source freeze.

### NAV-R3 registered RED on unchanged production

The corrected focused gap run used the normal registered
`editor-browser-navigation` property with an ignored config selecting only
`fixed seed 20261118: pending-spa-reject-desktop$`. It kept the source property's
full grammar, 25-run budget, seed and constructions unchanged; the focused
selection is not full-campaign or deterministic-replay evidence. Its actual
unchanged baseline failed by `OracleViolation` at `failed` under
`formatted editor departure`, after save settlement and the receiving pane
round trip, rather than by setup failure:

```text
history: {body:"a", commands:["bold","bold"], schedule:"pending", departure:"spa-reject", mobile:false}
received: {inEditor:true, value:"a", stored:"**a**", errorShown:false}
expected: {inEditor:true, value:"a", stored:"**a**", errorShown:true}
```

Output directory:
`build/formatting-oracles/navigation-save-settlement-red-registered/`.
The baseline reports 0 pass, 1 fail, 59 unselected; its one selected authored
mutant is correctly blocked by the failing baseline, not killed. The named
controlled PATCH receipt comparison passed before the public `failed`
comparison. The report retains the public counterexample, not every diagnostic
save/pane receipt; the earlier focused probe independently records the
`undefined` rejection cause. This is a registered product RED, and no product
repair or GREEN is claimed here. The parent received this result before
editing production.

Exact invocation (also retained in output `invocation.txt`):

```sh
PLAYWRIGHT_BROWSERS_PATH=/private/tmp/blygger-playwright.3EVERv node --import tsx scripts/formatting-oracles.ts --oracle navigation --browser chromium --out build/formatting-oracles/navigation-save-settlement-red-registered --config build/formatting-oracles/navigation-save-settlement-red-registered/focused.config.ts --only authored:navigation-premature-spa --contexts 1
```

The first sandboxed attempt could not listen on localhost (`EPERM`) before
registration. A subsequent invocation in sibling output
`navigation-save-settlement-red/` accidentally selected the raw authored ID
without `authored:` and ran zero tests. Neither attempt is RED or verification;
the corrected command above supplied the actual evidence. The application
needed the approved local-server sandbox escalation. Source SHA-256 before
the corrected run:

```text
d325e5b77249ae1367aae1818978964a0cc81d3f1e4eaed94c9e24826ab423dd src/ui/authoring.tsx
a225500e58dc17a301700d07c14e3178317855ad5737214c45199015b42361c3 src/ui/paced-write.ts
cc3ee87d1e7233a77ae1a8ca5c395455efe5e1a65b9b209b1166e7d990d054ae src/ui/draft.ts
589945f96f6fc32e1fbe36fdcf5cac0ae1aa6e5073e742cdd0e32661a870c921 navigation-driver-oracle.ts
e5b233c52e918b4ab2a3a2cbfb2cd8178ec7906eed25bc47b0116df7605b7603 editor-navigation.oracle.test.ts
51351d4ccff4dbc334faa6140e85c5f8fb357debbe4f87051c158de1a28e8769 focused.config.ts
```

NAV-R3's observation repair has demonstrated RED; NAV-R2's production failure
and full fixed/random/replay, receiving neighbor, calibrations and mutant
closure remain open for the parent's repair campaign. ORC-001–016 retain the
prior applicability accounting: authority/model/history remain fixed;
ORC-005/010 now reach a settled silent rejection at its actual comparison;
ORC-006/007/012 require final post-repair evidence before closure. No requirement
is waived and no gap is closed by the focused selection.

### Concrete overlap cause and receipt boundary

The causal family is an outstanding same-key autosave followed by a second
save from in-app departure: the first HTTP failure rolls back the conflicting
pending second transaction. In the original schedule the departure's one save
rejects with its concrete API error and the existing alert appears. In the
pending schedule the focused probe records save #1 acknowledged, save #2's
latest autosave held before forwarding, then save #3 entered by the real
compose guard. Releasing the controlled provider rejects save #2 with the
contract-shaped API error, then save #3 rejects with `undefined`. Both schedules
keep the route/source; the pending one loses the public error report.

The installed dependency explains that sequence. At
`@tanstack/db/src/transactions.ts:127`,
`rollbackConflictingTransactions` calls the pending conflicting candidate's
`rollback({isSecondaryRollback:true})` without forwarding an error. At
line 671 `rollback` rejects its settlement with `this.error?.error`.
`createPacedDraftAction` shares one save-group command-row key, returns the
transaction's `when('settled')` rejection unchanged, and `Draft.save` similarly
lets its persistence rejection propagate. Editor's guard catches that exact
`undefined` and sends it through `action.run`, whose `setError(undefined)`
leaves `Failure` without a truthy error to render. This source explanation is
corroborated by the real receiving probe; it is not treated as independent
registered coverage of every dependency rollback path.

The repaired oracle's exact boundary is: the real compose link listener tags
its next actual Draft.save invocation; that invocation's original returned
promise settles; its side observer resolves the named receipt
`compose Draft.save settlement`; the driver enters the receiving browser in a
later task, invokes actual Editor preview then draft pane handlers and awaits
the committed `.editor-grid[data-pane]` values; then it records `failed` URL,
textarea source, fresh server source and public alert presence. The actual
promise is neither replaced nor recovered. Fulfillment and rejection preserve
the original caller's value/reason, including undefined; raw receipts store
only serializable outcome/type information. Missing receipt or pane commit
remains a named setup failure. The public `failed` comparison does not require
an exact error message and will accept a truthful actionable fallback.

The focused baseline's reviewed git HEAD was
`28b0c8d642a87e5810ad6eabd95c2d1714c53396` plus the oracle worktree's uncommitted
changes. The production save/guard files listed above had no edits for this
RED. Full relevant source fingerprints, supplementing the previous block:

```text
568b1ecd150459fc7aa384f50edfeb19489f2ee402130f9ef05bcfdc85d0d2c4 test-ui/editor-oracles/navigation-model-oracle.ts
d133ae56f4bd62fee20e74f2051772cd09c1ed206bb745c8ec4865cce65f7abc src/ui/components.tsx
3f459a59cbd73f5601b013e7bc3e15c16ba124c08603bbe139bc1554c915e723 node_modules/@tanstack/db/src/transactions.ts
99b5a301aebc22699eed02c0c11781b0268bd2227fc59394dc5fcbe77f46e03c scripts/formatting-oracle-application.ts
b396bab5be6aa6d922aa4c9f8a0172253a92c08895770021f1f46b777965545a scripts/formatting-oracles.ts
b0ca432cf84f1dcfb60ac5e0e9052d2f3eb524e0594be9a5e158a3e7d620562f test-ui/editor-oracles/browser-driver-oracle.ts
7b30f54e51005b02057c213fa0dcdea016b5549672452960eaa317b0c561d9b7 test-ui/editor-oracles/application-driver-oracle.ts
f429151f9bfa87b1de9ff19614c6ed063acc0d90cd33cf34be2c62c5d458a3e8 test-ui/editor-oracles/browser-source-oracle.ts
f04322f95913663762361b3c8d1a8c5d0dae30bdd4fdcdb2a8a69e9936c59d1b package-lock.json
cd1b208c9f48c1236436e4cc60e408e426dba3400d929f50a27b55b1fcd23ab0 /private/tmp/blygger-navigation-rejection-diagnostic.mts
33c577572847334394d22c4aa46295ef570d50b92da59e32dd9bbb6c79b8b536 /private/tmp/blygger-navigation-rejection-diagnostic.json
5dd1798b894dbcec505108a2e904c55e0ca01a3a96b3a7884b882f96fda2949a navigation-save-settlement-red-registered/results.json
b66a4f812befe15527f6f050e25c5fb3a54cd908adc0527f7facd380d1b048b2 navigation-save-settlement-red-registered/stream.log
```

No browser jobs followed this RED. The parent owns the production repair,
its original-defect mutant and full post-repair navigation evidence; this
reviewer changed only navigation oracle/driver prose and append-only records.

### NAV-R3 applied repair and independent execution acceptance

The parent applied the reviewed two-catch normalization at the shared `useAction` UI boundary, preserving original scheduler/Draft failure receipts. Navigation explicitly owns that hook. Independent review of the applied source and uniquely applying original-defect mutant is recorded in [action-error-boundary-review.md](./action-error-boundary-review.md#applied-source-and-registered-execution-acceptance).

Completed post-repair run `df61bd637dee`, output `build/formatting-oracles/navigation-save-failure-green/`, passes all 60 navigation checks twice with 0 nondeterministic checks. All four selected authored challenges are rejected by registered `formatted editor departure` law verdicts on fixed-seed histories, including `original-undefined-action-error` on `pending-spa-reject-desktop`. No selected result is classified as setup failure or production crash. This closes the demonstrated NAV-R3/AB-001 failure for the applied source.

Scope and retention remain bounded: `--only` selected four authored challenges, so the report's 0 gaps does not establish full authoring/`useAction` operator closure. Pinned cleanup removed transient mutant JSONL captures; retained results establish law/route classification but do not retain each mutant's exact counterexample payload. The precise public `errorShown:false` values remain in the pre-fix registered RED above. Applied-source hashes, report hashes and the full acceptance/limitations are in the linked review. This reviewer performed documentation/source/report review only and launched no additional browser jobs.

### NAV-R4 — receive departure while awaiting a diagnostic pane commit

The Firefox final campaign's clean baseline passed 60 checks twice, then the
`navigation-rejected-save-leaves` challenge produced three retained missing
`settled save pane commit: draft` host events with no registered verdicts.
The parent stopped that incomplete campaign and preserved its raw records;
no mutant kill or final campaign completion is claimed. The raw failures prove
missing pane commits; source tracing identifies the departure race: after one
editor-route precheck, the driver could invoke a pane or await its commit after
the wrong guard had already allowed departure.

Repair the existing observation, keeping the adopted law, model, histories,
seed, budget, production and shared harness unchanged. Each pane action must
atomically receive either the actual editor route/control or departure; the
following wait must return the actual pane commit OR actual editor departure,
and the returned observation must be read without another locator wait. A
missing pane control while an editor still exists remains a named setup
failure. A missing editor or departed pathname is a public observation that
reaches the existing `inEditor:true` comparison, never a setup timeout.

Use the same atomic route/source snapshot for blocked, failed and final
departure observations; the old separate routecheck then `inputValue` could
lose the same race. After the failed snapshot, retry setup must likewise
receive actual departure rather than wait for a missing compose link. A
still-present editor keeps the exact save-settlement receipt followed by the
actual preview/draft handler round trip, and the actual successful retry.
These are observation repairs within the accepted checkpoint, not changed
laws or new expected answers. The independently assigned transport reviewer
will inspect action, commit, returned receipt, snapshot and retry boundaries
before a new browser campaign. No browser job is started for this edit.

### NAV-R4 implementation handoff — independent review and browser run pending

The driver now checks the actual editor route and DOM in the same browser task
as each actual pane click. Its pane wait returns either a committed pane or
actual editor departure, and the driver reads that returned handle's data and
disposes it rather than starting a second locator lookup. Missing editor DOM
is captured by the existing `inEditor:false` observation even if the route
has not yet changed; missing pane controls in a still-present editor remain
explicit host failures. The actual tagged Draft.save observer is unchanged.
Retained editors still receive both real pane-handler commits before the
failed checkpoint.

The adjacent `blocked`, `failed` and final `departure` snapshots now read route
and textarea value atomically. The retry's route check, real compose-link
listener registration and actual link click also execute in one browser task;
a departure already in progress is observed instead of waiting for a missing
retry control. The same existing `failed` and `departedBeforeRetry` checks
judge that result. Controlled responses, actual successful retry, observations,
model, accepted laws, history construction and budgets are preserved.

Static validation: the complete UI TypeScript check
`./node_modules/.bin/tsc -p tsconfig.ui.json --pretty false` passes. Source
fingerprints handed to the independent transport reviewer:

```text
af85e640e12115e6a2a777b3bb86720dd61cbd31bf4cc2cfd67e6cd8551c312d test-ui/editor-oracles/navigation-driver-oracle.ts
568b1ecd150459fc7aa384f50edfeb19489f2ee402130f9ef05bcfdc85d0d2c4 test-ui/editor-oracles/navigation-model-oracle.ts
1f84b4f36ef00f56f3b782736442fa04e0900905c03d6aeba9c190b99111ba43 test-ui/editor-navigation.oracle.test.ts
```

No browser campaign has run against this repair yet; NAV-R4 remains open for
independent review and a registered actual-departure challenge. The stopped
Firefox failures above retain their nonkill classification.

Independent `review_receiver_transport` source review accepted the NAV-R4
atomic action/wait/attribute/snapshot/retry repair at driver hash `af85e640…`,
and suggested preserving a hypothetical falsy wait receipt as a host failure
rather than interpreting it as departure. That defensive classification is
applied: only an actual `kind:"departed"` receipt ends the pane round trip;
a falsy receipt throws the named missing-host-receipt error. Final driver
SHA-256 is
`82bf6662cb2ecd74805c7a70683af80cd091e816ecc068cf118910a28ccb45e4`.
The full UI TypeScript check passes again. Independent final-source acceptance
and coordinated browser receiving evidence are recorded separately; no browser
run has been launched by this reviewer.

The independent reviewer accepted final driver `82bf6662…` in
[navigation-observation-race-review.md](./navigation-observation-race-review.md).
This is source acceptance only: the stopped Firefox run stays incomplete and
the fresh registered receiving challenge remains owed.
