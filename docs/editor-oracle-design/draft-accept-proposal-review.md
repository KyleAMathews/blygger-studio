# Independent Draft.accept continuation proposal review

2026-11-19. Reviewer `/root/review_receiver_transport`; base `28b0c8d642a87e5810ad6eabd95c2d1714c53396`, oracle package pin `97a4e7a`. Read `oracles-review/SKILL.md`, checklist v1 and glossary in full again for this assignment. Source review only: no proposal applied, runtime inputs/campaign outputs changed, or test/probe/browser/oracle jobs run. The only reviewer-written file is this record. The active 402-input reference remains frozen.

## Initial proposal and independently rebuilt observation

Initial immutable patch: `/private/tmp/draft-accept-oracle-proposal-150es87g/proposal.patch`, SHA-256 `58a449e48b736e00f981ef9319792334d5799ee7544569a3b230a95ed6fcb10f` (subsequently archived as revision 1 by the author). Initial provenance names proposed registration/model/driver hashes `c239a1b7…`, `1b16c936…`, `6de713c2…`. Partial edits of the author's scratch `proposed/` directory were not mixed into the initial verdict; the immutable patch and its initial provenance define that review.

Authority read independently: the adopted replacement law receives historical source after successful restore, retains original working source after rejection, and releases editing. The adopted working-copy save law requires the submitted source snapshot to be the working copy and the actual save result to report whether that submitted input is still current. Existing actual restore confirmation says it replaces the current draft; the prior `authoring-revision-session.test.ts` separately protects successful restoration and failure retaining the current text/guard. These are the relevant promises; production's separate `setText` update and Draft revision counters are explanatory evidence rather than authority.

From those promises alone, arrange historical `published a` and working `- parent\n    - a`, successfully restore the former, and press ordinary Save before typing. The displayed, submitted and subsequently stored source must be `published a`. With a rejected restore, the corresponding source is `- parent\n    - a`. No later edit occurs during that save, so the component save-current-result receipt is true on successful persistence. This rule needs neither an expected revision increment nor an assumption that the displayed textarea proves the saved source.

Source trace: real seed/publish/PATCH setup establishes distinct historical/current text. The actual restore button, confirmation and POST run. The input-only model selects historical or retained source from outcome. Existing `settled` records the DOM replacement and released gates. The proposed `saveThenBold` path next activates the real Save draft control with native Enter, holds and records the actual PATCH, then receives its response, the actual Draft.save completion, a real pane-handler commit, server GET and actual UI feedback before the old bold continuation. Its check compares new whole-source observations before `followup`. M3 deletes only `Draft.accept`'s `edit(text)`: the DOM still receives historical text via the separate React setter, while `Draft.save` consumes stale `Draft.text`. Thus submitted/stored source should differ under M3 before bold can repair it. This is a source-supported distinguishing witness, not an executed kill or a production RED.

## Initial actionable findings

### DAP-001 — Component diagnostics were presented as public UI promises

**Claim challenged:** initial prose/model described `this.dirty` and nested save results as “public dirty/result/saved/error feedback,” enforcing `dirtyBefore:false` and `dirtyAfter:false` in the receiving law.

**Authority/boundary:** `Draft.dirty` and `Draft.save` are component API members observed through a temporary prototype wrapper; saved/error feedback is actual DOM UI. The direct Draft oracle's adopted no-newer-input save-result law can support a component result assertion. Its limits explicitly keep accept/reset separate, and the gap-review design had avoided adding a synthetic dirty-baseline promise. The request/store source consumer already exposes M3; calling private-in-this-receiver diagnostics UI feedback does not supply clean-accept authority.

**Smallest design consequence:** a browser restore that submits/stores correct source and reports saved could still be rejected solely because a diagnostic dirty getter differs from the proposal's added clean-baseline rule. The proposal had not separated that component obligation from the public receiving law. This is source-derived; no history was executed.

**Requested repair:** keep dirty reads diagnostic, or supply a separately adopted clean-accept contract; label the actual current-result receipt as component-public and saved/error observations as UI. Preserve actual save result checking under its already adopted no-newer-input law, without raw revision-counter assertions. Parent forwarded this finding for scratch-only revision.

### DAP-002 — Early failure could orphan the new response waiter

**Claim challenged:** the new save continuation preserves original failures and cleans up its additional asynchronous work.

**Source/consequence:** revision 1 creates `page.waitForResponse(...)`, then awaits native input, request start and a pane receipt before awaiting that response. If one of those earlier steps throws, the response promise is neither awaited nor immediately observed/drained. Closing the application context can reject it later as an unhandled promise, obscuring the original named host failure. Route tasks themselves are pushed into `drain`; this new response waiter was not. The consequence is source-derived, not an executed cleanup fault.

**Requested repair:** immediately attach a rejection observer and register a drained completion when creating the waiter, while retaining the original promise for the later actual response await. Parent forwarded this finding for scratch-only revision. No runtime input was edited to address it.

Initial verdict: **changes requested in scratch**, with the core M3 continuation accepted in design. These findings are not product defects or M3 closure evidence.

## Initial preservation and model review

The original 52 constructions are the unchanged `2 viewports × 2 outcomes × (6 keys + 5 controls + 2 picker entrances)` loops. The same objects omit `continuation`; no old construction gains the new branch implicitly. Four additional constructions cover successful/rejected saves on both viewports. The optional generated `saveThenBold` field retains every old object shape and every prior body alphabet/1–24 code-point bound, key/control kind and value, picker/profile/outcome axis. It adds no validity filter. Invalid continuation spellings are outside the generated grammar. Removing the new continuation loses pre-edit consumption; removing the old branch loses immediate edit-release coverage, so both are needed.

Runs 25 and seed 20261118 remain. The optional axis changes generated sampling, so identical seed constants do not imply byte-identical old random samples; the preservation claim is the old legal histories/constructions and their existing expected observations. All old check branches and calibration definitions remain, with new comparisons inserted only for the additional continuation. Bracket/Escape registration bodies remain unchanged; their shared authority prose is expanded rather than weakened. Their model/driver behavior is unchanged.

The new source model is an input projection, not Draft's revision machine. Whole submitted/stored source is compared without trimming or projecting away Unicode. Historical/current source are always different by their arranged prefixes, including the nearby generated Unicode body. Success and reject continuations remain in-domain. The check's new pending and final source snapshots are captured before bold; judging the recorded trace later cannot let bold rewrite them. Prior `before`, `confirmation`, `pending`, `attempted`, `settled`, `followup`, request and page-error checks remain.

The proposal assumes this actual Save control invokes one working-copy save and one PATCH in this controlled successful schedule. Its exact request/status observations concern this current REST receiving path, rather than a new claim about all possible future save batching/optimization strategies. No autosave timer is introduced between acceptance and explicit Save: the row is loaded from prepared server input, readonly attempts do not edit it, restore clears the edit timer, and the intervening actions are focus/pane controls. Runtime execution must still demonstrate that the tagged receipt and actual PATCH belong to the intended explicit save.

## Revision 2 source rereview

Immutable revision 2 patch SHA-256: **`e66899ed091040470bdfd0888d4c0c6a182dfa177074ce2d76b00ee58fd3e3c9`**. The author preserved revision 1 as `proposal-v1.patch` and `provenance-v1.json`; the versioned gap review maps this review's DAP-001/DAP-002 to DACC-004/DACC-005. Both initial findings are resolved **in proposed source**, with no execution acceptance implied.

**DAP-001 resolution:** the new expected submitted/final observations contain no dirty getter values. The dirty-specific calibration is removed. Driver values are explicitly named `dirtyBeforeDiagnostic` and `saveDiagnostics`; the checked nested `save` value is separately projected to `{status, result}`, preventing diagnostic fields from accidentally entering an exact object comparison. Prose separates actual saved/error DOM UI from the component-public Draft.save current-result receipt. The latter is justified by the already adopted save-result law because no newer input occurs between submission and completion. No accept/reset revision arithmetic or clean-baseline component contract is introduced.

**DAP-002 resolution:** immediately after `page.waitForResponse` is created, the driver does `drain.push(response); void response.catch(() => undefined);`, before native activation or any other premise await. The original promise is still awaited later; its response value/rejection has not been replaced by the catch result. Context cleanup can now collect that pending wait's failure alongside the earlier original failure, rather than leaving an orphan rejection. This repairs the named source-ordering hole. No fault/cleanup execution was performed here.

### Production path, observer identity and timing

The actual button still calls Editor's `action.run(save)`, whose real `Draft.save` supplies source through the real paced writer/API. The proposal replaces only `Draft.prototype.save` with a one-shot observer inside the disposable page. It stores the exact original function, restores that function before invoking it, calls it once with the original receiver/arguments, and returns the exact original returned object. A synchronous exception is reported and rethrown unchanged. Side `.then` observers report original completion but are neither returned in place of the result nor awaited by the real caller. Rejections are not recovered for the application. This is source acceptance of transparent identity and causal ordering, not an executed promise-identity/timing measurement or a wall-clock timing claim.

For the current native Promise returned by Draft.save, the side observer is attached before the awaiting Editor continuation. The separately exposed settlement receipt can therefore precede React's display update; the existing explicit pane-handler/DOM-commit premise supplies a later receiving render. The new checkpoint does not assume that receipt delivery alone implies that the UI already committed. It awaits neither correct submitted/stored text, saved visibility, empty errors, dirty values nor enabled operation state. Those actual values are sampled for the check. The raw diagnostic dirty getter reads assume the current pure getter; they do not justify a new dirty assertion or a universal hostile-getter observation claim.

The request handler records actual PATCH method/body before releasing the route. It forwards that same request using `route.fetch`, retains actual status, and fulfills from the real response. After response completion and original save settlement, the driver gets the item through the real server endpoint and compares the whole stored source independently of both displayed source and request source. It records both pending submission and final save checkpoints before the old bold continuation. Expected source always comes from arranged historical/working inputs, not response text or actual Draft state. A hypothetical correct request with wrong storage and a stale request with otherwise correct display are distinct wrong answers and have separate corrupt-trace calibrations.

No editing action is inserted before this source consumer. Native Enter targets Save, and pane actions only supply actual render inputs. The existing restore path already clears any edit timer; server-seeded picker/current text does not create a local input edit. This source argument explains why the one-shot save observer should receive the intended explicit save in this bounded schedule. Runtime evidence still needs to confirm actual input, original settlement and HTTP/read-back delivery rather than inferring them from the plan.

Cleanup always releases the new request gate, unregisters the save route and restores the original prototype function. Route tasks and the response waiter enter the existing application drain. Local cleanup errors retain the original exception in `AggregateError.cause`/`errors`; application context cleanup remains the enclosing host's responsibility. A missing native key, request, response or original settlement is a host failure unless a registered check independently observes a law violation. Such failures must not be credited as an M3 kill.

### Preservation rereview

Revision 2 keeps the source-preservation relation described above. All 52 old construction definitions and their absent-continuation histories remain, plus four new success/reject × viewport constructions. The original alphabet/body bounds, keys, controls, picker/outcome/profile alternatives, immediate-bold source sequence, old model fields, check ordering and all five old replacement calibrations remain. The bracket/Escape registration bodies and their drivers/models remain unchanged. Fixed seed **20261118** and generated budget **25** remain. New expectations are checked only on `saveBeforeEdit` histories. Four new calibrations independently target submitted source, stored source, save-current result and saved UI feedback.

The new declared save states are gated by actual native Enter trust/key receipt, actual response completion and read-back delivery. This predicate does not demand that expected source, feedback or result be correct before the law can judge them. Every new declared state has a constructed continuation. Correct states and their counts remain execution gates; source declaration is not measured reach.

Independent source reads confirmed the revision 2 hashes below and the three unchanged runtime hashes. Author-provided parser/preservation/applicability checks are marked static in their provenance. This reviewer did not import/execute oracle modules, run those checks or apply the patch. No current reference-campaign result is attributed to the scratch proposal.

## Revised verdict and execution gates

**Accepted in source, ready for application after the frozen reference ends.** No remaining source blocker identified for the proposed M3 receiving continuation. DACC-001/M3 is still an open runtime gap; scratch acceptance is not coverage closure, a production RED, calibration success, reach evidence or a mutant kill.

After the active reference finishes, the parent still needs to:

1. Apply exactly the accepted three-file patch, bind a new input/source manifest and verify that unrelated frozen inputs remain unchanged. Do not modify the current campaign's inputs or outputs retroactively.
2. Run appropriate type/lint/setup checks and the registered receiver property on unchanged correct production. Require all 52 prior and four new constructions, prior checks/calibrations, four new calibrations, fixed/random campaigns at the existing budget, and declared save-state delivery to pass.
3. Replay exact M3 key `src/ui/draft.ts#Draft.accept:delete-call:this . edit ( text ) ;`. Require a registered semantic rejection at the new pre-edit source-consumption boundary, preferably `acceptedSaveSubmitted.submitted`, rather than a missing native/HTTP/promise/pane event, setup error, crash or timeout. Retain the actual observed payload and route if available.
4. Verify nearby successful/rejected continuations, ordinary/Unicode bodies and both viewports; preserve immediate-bold behavior and all old histories. An exact M3 rejection alone is not a full receiver or authoring gap sweep.
5. Repeat/replay as required and preserve source binding, report scope, raw failures and any capture-retention limit. Distinguish any early-failure/cleanup diagnostic from a registered law outcome. Broader browser/complete-gap closure requires its own current-source reports.

No production fix is proposed by this coverage extension. If it exposes a new defect on unchanged production, retain a registered RED before repairing that defect.

## Checklist v1 disposition

| Requirement | Source result / remaining evidence |
| --- | --- |
| ORC-001 | Existing replacement/source-save authority plus separately labeled component current-result law; exact dirty-baseline assertions removed. Source/host/schedule limits stated. |
| ORC-002 | Model projects only arranged historical/current input and outcome; no Draft counters, classifiers or output-derived expected text. |
| ORC-003 | Law/history/model/driver/check remain distinct; prose now correctly separates UI observations, component receipt and diagnostic getters. |
| ORC-004 | Old grammar/constructions retained, optional consumer axis justified, original bounds preserved and invalid continuation spelling excluded; runtime reconstruction/reach pending. |
| ORC-005 | Real restore→native Save→PATCH→server GET path is coherent; expected whole source reaches both new comparisons before edit repair. Actual receiving execution pending. |
| ORC-006 | Four new wrong-answer calibrations are source-defined; calibration runs and exact M3 registered rejection remain pending. No setup/crash kill credited. |
| ORC-007 | Same property uses existing fixed/random framework campaigns, seed and budget; new-source campaign/direct replay evidence pending. |
| ORC-008 | Added history distinction is justified by visible historical text versus stale source consumed by a later save. No new mutable expected-state machine or private revision promise. |
| ORC-009 | `saveBeforeEdit` is history-only; submitted/stored/DOM source, component result and dirty diagnostics are named separately. |
| ORC-010 | New response waiter is immediately observed/drained; local cleanup preserves earlier failures. Fault/cleanup runtime exercise remains pending. |
| ORC-011 | Whole request source and real stored source independently check different public boundaries beyond textarea display; expected projection is independent of both. |
| ORC-012 | Initial raw findings, two immutable revisions, source hashes, source-only verdict and runtime gates are retained in this versioned record. |
| ORC-013 | Distinct historical/current source and immediate consumption form the distinguishing witness; rejected restore, Unicode and original immediate-edit neighbors remain in-domain. Execution pending. |
| ORC-014 | Controlled reject delivery, native Save activation, real successful server path and explicit render-control premise are named. Real-browser HTTP/settlement/read-back handoff remains pending. |
| ORC-015 | New save states have constructions and actual receipt-gated reach; no expected source/value is used to satisfy reach. Counts remain pending. |
| ORC-016 | No ordinary example tests or separate expected-answer assertions inserted; new constructions/calibrations use the same property/model/check. |

Every checklist trigger above applies to this proposed important generated receiving repair. No requirement is marked inapplicable to avoid an unresolved execution gate. This is a focused source review, not a fresh full audit of every existing receiver behavior or the active integrated campaign.

## Artifact binding

```text
e66899ed091040470bdfd0888d4c0c6a182dfa177074ce2d76b00ee58fd3e3c9 revision-2 proposal.patch
b443b6abbc0f682f9fe43eba5679f7f968a0466407c18232d379fccc92ad9df8 proposed/test-ui/editor-receivers.oracle.test.ts
1d4f563fd32c7203da0634d7b717dcf8d98984689e6fbfd0610329d6a5caaf73 proposed/test-ui/editor-oracles/receiver-model-oracle.ts
a50f521926a04106045b9fbfea2682d644dd1496b57c7d4a78465ba058ffb088 proposed/test-ui/editor-oracles/receiver-driver-oracle.ts
9be323f56ae89ee4a4a4c95d0b3ac1451e66ba9eb4be5406e458f26db120bf45 unchanged runtime test-ui/editor-receivers.oracle.test.ts
d956c4edfc0ea6af60f015903ea4fcf8654cb6b8e77acf8e36030c2c5a06c7e0 unchanged runtime test-ui/editor-oracles/receiver-model-oracle.ts
3d4ea719c43571dec3ad362d6062695cad50c34942253c4ae8ec9b94896efa00 unchanged runtime test-ui/editor-oracles/receiver-driver-oracle.ts
```
