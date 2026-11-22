# Completed-link receiving review

Independent source/loss review by `/root/audit_completed_link_coverage`, 2026-11-18. Base `28b0c8d642a87e5810ad6eabd95c2d1714c53396`; installed oracle pin `97a4e7a`. Read the installed `oracles-review` and `oracles-design` skills, checklist v1 and glossary. Reviewed the new workflow registration/model/driver and shared application driver against the two retained cases at `e2e/compose-pwa.spec.ts:145–185`, their sheet helper, both configured Playwright profiles and the actual receiving handlers in `src/ui/authoring.tsx`.

No implementation or retained-test edits, browser jobs, production probes, or mutation jobs were run by this reviewer. Small pure input/model reconstruction checks were run. Other agents were editing during review; hashes below identify the reviewed snapshot and repairs already observed.

The rereview addendum at the end accepts the source repairs for WF-001/002/003/005, records improved WF-004 observations and corrects an overstatement in the first review about hidden dialogs. WF-006/007 and current campaign evidence remain pending.

## Verdict

**Keep both old browser cases.** The new constructed desktop histories reconstruct their explicit source/feedback/paste-default observations. Required mobile overlaps, sheet-removal observation, host text normalization, reliable completion checkpoints and receiver mutation scope still need attention before a lossless receiving replacement or gap-closure claim.

The new driver uses the real application, real clipboard API, real native paste shortcut and real sheet controls. Those are meaningful receiving paths. A helper-only mutation report cannot establish the rest of the receiver's decisions, and a successful clipboard write alone is not evidence that a later async receiver finished before the snapshot.

## Findings

### WF-001 [P2]: Native paste predicts raw code units a textarea cannot expose

- **Claim/authority:** The workflow law promises actual source/caret after every action, using all generated raw URL/paste strings. HTML textarea value normalization is part of that receiving boundary. ORC-001/002/004/005/014 (checklist v1).
- **Small legal witness:** Initial source `see this page`, one `nativePaste` action at end, `raw:{raw:'\r'}`. The current arbitrary admits it. The model predicts `value:'see this page\r'`, selection `[14,14]`.
- **Evidence executed/read:** Pure admission/model check executed. No browser probe run. A textarea's API value normalizes CR/CRLF to LF, so its public `.value` cannot equal that literal-CR prediction. OS clipboard transport can additionally normalize line endings or replace malformed surrogate code units; `rawArbitrary` includes these.
- **Repair:** State the transported input premise explicitly. Record independently delivered clipboard text before calling production, and account for text-control line-ending normalization in the model, or use another justified independent input projection. Preserve the raw grammar; do not filter difficult characters to make the run pass. Add CR, CRLF, lone-surrogate and ordinary neighboring inputs as constructed handoff controls.

### WF-002 [P2]: Clipboard/input completion is inferred from one animation frame

- **Claim/authority:** Each `stepN` is receipt after the corresponding OS clipboard/native paste action; ORC-005 checkpoint sufficiency and ORC-010 fidelity (checklist v1).
- **Witness/design consequence:** A successful clipboard read resolves after the one requested animation frame. Or the native OS paste's input event arrives after `keyboard.press` resolves. Correct production then yields a snapshot of the old source and can be blamed for a host-scheduling delay.
- **Evidence read from source:** For clipboard activation the real handler is async (`void tools.linkFromClipboard()`), but `trigger.click()`/keypress do not await that handler's returned promise. Driver line 55 awaits one rAF; that is unrelated to clipboard promise completion. Native paste awaits only `ControlOrMeta+v`, then immediately snapshots. Synthetic dispatch is synchronous and has a different completion premise.
- **Repair/experiment:** Install explicit event/provider completion observation before activation and await the received clipboard/input/toast action checkpoint without waiting for the expected answer text. Use a deferred slow provider as a controlled premise, then retain a real clipboard receiving witness. Missing host events remain setup failures, distinct from violated source/caret laws. An animation frame can sequence rendering after completion, but cannot stand in for completion itself.

### WF-003 [P2]: Production page errors disappear when a later UI wait fails

- **Claim/authority:** `applicationDriver` preserves production failure evidence and checks `errors:[]`; ORC-005/010 (checklist v1).
- **Witness/design consequence:** A production clipboard handler throws an unhandled error, so the expected fallback sheet never appears. The driver collects `pageerror`, then its dialog wait times out. `applicationDriver` throws the locator timeout before calling `observe('errors', errors)`, losing the earlier production error collection.
- **Evidence read from source:** `errors` is created inside `try`; it is emitted only after `await run(...)`. The catch retains only the thrown automation error; cleanup correctly preserves that error, but not the collected earlier page errors. No fault injection run is claimed.
- **Repair:** Preserve page errors and the action/host-event failure independently in catch/finally (observations or structured aggregate diagnostics), without converting a missing host premise into a law kill. Add a controlled failure challenge that demonstrates both diagnostics survive cleanup.

### WF-004 [P2]: The retained sheet-removal and strict-toast observations weaken

- **Claim/authority:** Lossless migration of the original clipboard test and `answerSheet`; ORC-004/005/013 (checklist v1).
- **Smallest witnesses:** (a) A submitted sheet remains mounted but hidden. Old `answerSheet` requires `toHaveCount(0)`; the new `dialog.waitFor({state:'hidden'})` passes. (b) Two `.toast` elements contain the correct first toast. Old `page.locator('.toast').toHaveText(string)` is strict; the new `document.querySelector('.toast')` silently chooses one.
- **Evidence read from source:** The sheet helper explicitly checks visible then count zero. The driver records a body-derived reason when it expects a sheet, but never records remaining dialog count. Its `sheet:null` value on other branches is assigned from the driver's control flow rather than observed from UI, so an unexpected sheet alongside otherwise correct source/feedback can be missed.
- **Repair:** Observe dialog presence/count through the real DOM, retain the original zero-count checkpoint after submission, and observe toast cardinality plus text rather than choosing the first element. Include a wrong hidden-sheet/duplicate-toast challenge. Distinguish “a sheet appeared during this action” from “a sheet remains at this checkpoint”; the current `sheet` field combines those ideas.

### WF-005 [P2]: Exact original multi-action receiving histories are guaranteed only on desktop

- **Claim/authority:** Both original browser scenarios are preserved. `playwright.config.ts` executes them on Desktop Chrome and iPhone-13-profile Chromium; ORC-004/013/015 (checklist v1).
- **Witness:** The original URL paste, nonintercepted attempts, composer-to-full-editor transition, and subsequent editor paste under `mobile:true`. The exact original clipboard followed by non-URL clipboard/sheet fallback under `mobile:true` is another.
- **Evidence read/executed:** `originalClipboard` and `originalPaste` inherit `mobile:false`. Their `mobile:true` variants are admitted by the arbitrary, but not constructed. The generic mobile constructions are one-action histories and do not force these old multi-action overlaps. The model reconstructs all desktop values/default states exactly (inventory below).
- **Repair:** Construct both exact original histories for both original profiles, through the same grammar/model/driver/check. Declare the relevant mobile transition and fallback overlap so accidentally replacing the multi-action history with a generic action cannot satisfy reach.

### WF-006 [P2]: The mutation boundary covers helpers, not the new receiver decisions

- **Claim/authority:** The new oracle protects clipboard/sheet/paste receiving behavior and has no gaps; ORC-005/006/012 and `oracles-design` ownership/evidence rules.
- **Witness/design consequence:** Remove `event.preventDefault()` in `authoring.tsx#pourOver`, change the captured range in `linkFromClipboard`, or drop its fallback prompt. These are precisely the claimed receiver decisions, but they are outside the owned/source-selected module.
- **Evidence read from source:** Registration owns only `src/ui/links.ts#insertLink` and `#linkToast`; `--oracle workflows` selects only `src/ui/links.ts`. The source-capture plugin delegates helper modules, while actual authoring code is bundled once into the disposable app. Trace calibrations corrupt observations and establish checker sensitivity; they do not demonstrate delivery of an authored receiver mutant to the running app.
- **Repair:** Add targeted receiver ownership/production challenges with evidence that each mutated receiver actually reaches the app, or explicitly preserve this mutation boundary as unresolved. Do not cite helper mutation totals as closure of these app decisions. A targeted production extraction would need its own refactor evidence; this review does not authorize skipping that work.

### WF-007 [P2, process evidence]: Record the receiving model's design grammar

- **Claim/authority:** This is a new reviewed workflow oracle/model; `oracles-design` §1, ORC-004/008/012 (checklist v1).
- **Evidence read:** The new model has multiple action/host/sheet branches for one law and introduces state across actions; the design-grammar trigger applies. Existing `link-design-grammar.md` concerns stateless helpers and explicitly says app receiving is separate. No workflow-specific design card/result was found in the reviewed snapshot.
- **Repair:** Record this model's parts, authority, controls, state witnesses, exclusions, async completion and ownership boundary, using the existing user authorization. This is not a request to re-ask an adopted law. Its native-vs-synthetic paste distinction is valuable and should remain explicit.

## In-flight issues already corrected during review

The first `workflows-first` report (`6fd03a011817`) is **registration/setup failure, not RED**: `originalClipboard` could not be admitted because starting prose omitted `.` while `base.after` was ` today.`. The alphabet now contains `.`, and a fresh pure membership check admitted all **28** constructions. The unused local `selection` variable was also removed. Those source repairs are accepted; the old failed artifact must remain separately classified.

The initial synthetic `files` driver supplied a PNG-typed file. Actual `textareaProps` first declines link pour-over, then image upload prevents default and can alter source. The model had wrongly equated declining link handling with leaving the whole event allowed. The current driver instead supplies a **nonimage** `text/plain` file (`x.txt`), for which upload declines and the expected event/source behavior is coherent. Describe this as a nonimage-file premise in limits; OS-image limits alone do not explain a claim about all synthetic file pastes. Preserve a separate image-handling backlog if making broader claims; do not present the premise change as evidence that image upload was checked.

## Independent reconstructed observation

From the adopted original clipboard contract, selecting `the essay` inside `Read the essay today.` and receiving the original `www.example.com/essay` target with `id=7`, `utm_source` and `fbclid` predicts replacement of exactly those words, retention of `id=7`, removal count two, and feedback `linked selection · 2 trackers removed`. The independent projection produces:

```text
Read [the essay](https://www.example.com/essay?id=7) today.
```

The plan starts with range `[5,14]`; the model predicts caret `[52,52]`. The driver uses the actual clipboard control, actual React receiver and actual textarea snapshot at `step0`; the check compares source, both selection endpoints, toast text and sheet reason. Expected values derive only from the plan and the independently reviewed link model. It imports no production classifier or handler. Reusing that model between direct/helper and receiver properties is reuse, not a second independent semantic implementation.

## Exact raw loss map

The old suite has **12 semantic observations** including the sheet helper's visible/removed checks, before considering both profiles. There are 10 explicit assertions in the two case bodies; the sheet helper adds two. The new two desktop constructions have exactly the original initial source, raw URL payloads, selected substrings, fallback typed target, ordered operations and source/default expectations. Current profile and DOM-removal gaps are explicit below.

Let `L = 'Read [the essay](https://www.example.com/essay?id=7) today.'` and `P = 'see [this page](https://example.com/p)'`.

| ID / old checkpoint | Exact original premise and public observation | Current registered route | Status |
|---|---|---|---|
| W1 / 152 | Composer `Read the essay today.`, select `the essay`, clipboard `https://www.example.com/essay?id=7&utm_source=newsletter&fbclid=IwAR0x`, click clipboard button → source `L` | `originalClipboard / step0.value` | Exact desktop reconstruction; mobile WF-005; completion WF-002 |
| W2 / 153 | Same action → toast `linked selection · 2 trackers removed` | `step0.toast` | Text preserved; strict cardinality WF-004 |
| W3 / 158 + `answerSheet` | Clipboard `just some words`, collapse at end, click → visible dialog named `link from clipboard`, accepts `https://example.org/p?gclid=1` | `originalClipboard / step1`, actual named dialog wait/textbox/button; model `sheet.reason='notUrl'` | Actual UI path present; mobile WF-005 |
| W4 / `answerSheet` completion | After submit, matching dialog count exactly 0 | New wait accepts hidden; no count recorded | **Loss WF-004** |
| W5 / 159 | Same history → source `L + '<https://example.org/p>'` | `step1.value` | Exact desktop reconstruction; added caret `[82,82]` and tracker toast protection |
| W6 / 173 | Composer `see this page`, select `this page`, synthetic plain-text paste `https://example.com/p?utm_medium=x` → dispatch returns false | `originalPaste / step0.defaultAllowed=false` | Exact desktop reconstruction |
| W7 / 174 | Same action → source `P` | `step0.value` | Exact desktop reconstruction; added caret `[38,38]` |
| W8 / 177 | Collapse at 0, paste `https://example.com/q` → dispatch true | `step1.defaultAllowed=true` | Exact desktop reconstruction; synthetic event intentionally makes no native insertion |
| W9 / 179 | Select `see`, paste `not a url` → dispatch true | `step2.defaultAllowed=true` | Exact desktop reconstruction |
| W10 / 182 | Click `#composer-full` after the three paste attempts → loaded `#md-input` source exactly `P` | `step3.value`; `transition:true` skips only postnavigation selection comparison | Correct same-history desktop source checkpoint; mobile WF-005 |
| W11 / 184 | In full editor select `see`, paste `https://example.net/` → dispatch false | `step4.defaultAllowed=false` | Exact desktop reconstruction |
| W12 / 185 | Same action → `[see](https://example.net/) [this page](https://example.com/p)` | `step4.value` | Exact desktop reconstruction; added caret `[27,27]` |

The original `answerSheet` uses its named dialog locator then textbox and `[data-sheet=ok]`; the new driver uses the actual named dialog and named URL/insert-link controls. It is a real receiving path, not a mocked prompt answer. Denial alone is deliberately injected by replacing `navigator.clipboard.readText` with a rejected promise; successful reads/native pastes use the actual browser clipboard with permission granted. This establishes a granted-browser clipboard path and a controlled denied-provider fallback, not a physical OS permission dialog or all operating systems. Synthetic `ClipboardEvent` actions preserve the old event/default-prevention premise and are correctly distinguished from the native-paste action that owes actual text insertion.

## Grammar, model and state controls

Current grammar admits 1–5 operations, desktop/small viewport, composer/editor, starting prose partitions of at most 28 generated symbols each, explicit raw/typed payloads, click/Enter/Space activation and selection modes current/range/caret/all/end. Numeric range choices are bounded through 80 and resolved to code-point edges of modeled source; source offsets are UTF-16. The current input comment's “plain labels” is bounded by its alphabet, not arbitrary Markdown. Arbitrary raw payloads still include all UTF-16 units. State and bounds should be recorded precisely in the design evidence.

Removing surface loses loaded-editor receipt; removing profile loses responsive toolbar/transition paths; removing payload/raw distinction loses denied/non-URL fallback; removing range loses selection/caret contrast; removing native-vs-synthetic paste loses event-default versus actual source insertion; removing an ordered action stream loses same-history editor handoff and selection continuation. Text is needed by later insertion/selection; selection is needed by `current`; surface is needed to make `full` a transition only once. These are meaningful state distinctions. `workflowModel` derives rather than caches source; no model-produced expected answer is copied from production.

Declared states predicate on the plan, which is allowed. Some labels are broader than their interesting overlap: `mobile`, `full`, `selection` and `paste` each being reached does not require mobile paste→full→paste. WF-005 should construct/name that overlap. The `files` state currently means a controlled nonimage file; it cannot stand for every file pipeline. The existing three calibrations challenge lost clipboard source, incorrect synthetic default cancellation and a wrong fallback caret. Their execution results remain the author's responsibility; no calibration or mutant success is claimed by this source review.

## Checklist outcome

| Requirement (checklist v1) | Outcome |
|---|---|
| ORC-001 | Name/login/date and original test authority present; clarify host normalization and nonimage-file scope. Existing user approval covers strengthening these receiving observations. |
| ORC-002 | Model imports only independent test-side models, not production. No captured production answers. Delivered-input premise remains WF-001. |
| ORC-003 | Prose distinguishes law/model/history/driver/check. `sheet` event-vs-current-state meaning needs explicit mapping (WF-004); update limits/design evidence with repairs. |
| ORC-004 | Exact desktop body observations reconstructed; initial alphabet repaired. Mobile guaranteed reconstruction and sheet removal are WF-004/005; record full controls in WF-007. |
| ORC-005 | Actual SPA clipboard/paste/sheet/transition paths present. Async checkpoint, hidden dialog, manufactured sheet absence and receiver mutation-path evidence remain findings. |
| ORC-006 | Three plausible calibrations present. Initial authored challenges blocked by registration, not killed. Receiver-targeted production challenge evidence missing (WF-006). |
| ORC-007 | Registered fixed seed 20261118 plus framework random, same runs25. No raw campaign workaround. Completed valid campaign evidence pending. |
| ORC-008 | Applicable: source, current selection and surface have distinguishing continuations; preserve them. No unnecessary stored semantic state found after unused local removal. Record in WF-007. |
| ORC-009 | Source/range/action names map clearly. Separate link decline from final app paste handling and sheet occurrence from remaining-sheet state. |
| ORC-010 | Context cleanup aggregates failure and cleanup diagnostics correctly; original production page errors can be lost before emission (WF-003). Clipboard completion assumptions WF-002. |
| ORC-011 | Separate semantic-anchor property remains a different formulation for completed links. Native paste adds a distinct host boundary; no extra second semantic model is demanded solely for reuse. |
| ORC-012 | This versioned review is tied to hashes below. No receiving closure claim until findings and actual evidence are disposed. |
| ORC-013 | Caret/selection, valid/non-URL, denied/normal and intercepted/default controls present. Add host-normalization and full original mobile overlaps; retain corrected nonimage distinction. |
| ORC-014 | Granted clipboard/native path and controlled denial honestly distinguished. OS text delivery/normalization unresolved; no physical permission-UI or image-clipboard receiving claim. |
| ORC-015 | All current 28 constructions admitted in independent pure check. Framework campaign reach still pending; mobile overlaps not required yet. |
| ORC-016 | Registered property and shared model/history/driver/check only; no ordinary unit assertions in reviewed oracle files. |

All 16 requirements are applicable to this stateful receiving change; no additional N/A is asserted. This is an independent review, not a self-review. Findings are oracle/harness/migration issues; this report establishes no new production defect and calls for no production repair before valid oracle evidence.

## Fingerprints

SHA-256 of reviewed source after observed period/nonimage/unused-local repairs:

```text
ec5130a0d9609fcf2ad6260f105980d000fb608820d67b9488436b8879697f4f test-ui/editor-workflows.oracle.test.ts
e56f8ea6f76f7c0d8543bb140f61a635395ab6cf98d400f54230e0682fd0b031 test-ui/editor-oracles/workflow-model-oracle.ts
386d952325dad2f4babc01b48f0d5f9e9cd5d2d43a86d3d8c11746b7c27659e0 test-ui/editor-oracles/workflow-driver-oracle.ts
e5e020951e889035323f04e9e137ce2729a147a5bb4343ffa36ecc17e911769e test-ui/editor-oracles/application-driver-oracle.ts
d325e5b77249ae1367aae1818978964a0cc81d3f1e4eaed94c9e24826ab423dd src/ui/authoring.tsx
fd453bc97469c2f0278bb4cc35cfb17aa2eebdb21560c7af5038cc426962e285 e2e/compose-pwa.spec.ts (retained)
3509460f727f794ad7002cd9f6379333f1f0c71b1f764651db0192c360385052 playwright.config.ts
```

## Rereview: host inputs, completion and original profile coverage

Read revised registration/model/workflow driver/application driver. No browser jobs or implementation edits. The active `workflows-host-inputs` log had not completed a baseline when inspected, so this is source acceptance, not a new passing-campaign claim. The earlier 92-check runs and helper kills describe their own historical source; they do not automatically validate this revised host-input model.

- **WF-001 source repair accepted.** Each action now emits `hostN`. Successful native clipboard reads are wrapped transparently and their returned text is recorded before production consumes it; only denial is injected. The typed URL field is sampled before submit. Native paste records actual event text, after write/read and before the promised resulting textarea observation. These are input facts, not production insertion/preview answers. The model reads those facts and independently normalizes CRLF/CR for a native text insertion. Raw UTF-16 generation remains intact. The empty clipboard is explicitly a native no-op. CR, CRLF, high/low surrogate, empty and ordinary native transport constructions now exist. A pure check with recorded CR predicts an LF in source and the correct caret. The model's input-projection correction is appropriate; do not describe host outcomes as byte-exact equality to arbitrary written strings.
- **WF-002 source repair accepted.** Clipboard action waits for the actual read outcome before its rendering turn. Native paste installs capture listeners before the keyboard shortcut and waits until the paste dispatch completes and either prevention or input is observed. This is a relevant provider/action-completion checkpoint rather than one arbitrary animation frame. The empty-clipboard branch relies on the stated native no-op premise. Execution and failure-injection evidence still belong in the final receipt.
- **WF-003 source repair accepted.** The shared application driver now emits its collected page errors in `finally`, including when the action callback fails. A host/automation failure accompanied by production page errors is aggregated rather than discarding those errors. Cleanup still records distinct diagnostics and preserves the host error as cause. No production-fault/cleanup injection was run by this reviewer; acceptance is based on source structure.
- **WF-004 observations improved; correction to the earlier review.** Snapshot now records every `[role="dialog"]` node and toast cardinality. Expected source/feedback actions require one toast, and dialogs are checked at every action. This detects the prior first-toast-only weakness and unexpected remaining dialogs. However, the first review overstated what old `answerSheet` proved: its `getByRole('dialog')` locator uses the default hidden exclusion. Therefore its `toHaveCount(0)` requires no accessible matching dialog, and a hidden mounted dialog could satisfy the old test. It did **not** promise physical DOM detachment. The new all-DOM count is stronger than the original contract; prefer accessible-dialog absence for exact preservation, with DOM count diagnostic, unless a separate adopted law requires unmounting. This correction supersedes the “hidden mounted dialog necessarily fails the old test” claim in WF-004 and W4 above. The current implementation unmounting a sheet is evidence, not authority to remove an implementation freedom.
- **WF-005 source repair accepted.** `originalClipboardMobile` and `originalPasteMobile` retain the exact old source/payload/action sequences under the original small-viewport profile. Required `mobileClipboardFallback` and `mobilePasteTransition` states are constructed. Independent reconstruction reproduced the same original source checkpoints in both mobile histories.
- **WF-006 remains open.** The owning/source-selected code is still helper-only. The author explicitly retains receiver instrumentation/transport as unresolved; no broader closure claim is accepted.
- **WF-007 remains open pending its receiving-specific design record.** Existing authorization already covers the oracle strengthening; no new permission request is required.

Independent pure membership preflight now admits all **36** constructions, including both exact original mobile clones and all six native transport inputs. The current law/limits also explicitly say **nonimage** files and exclude image upload/paste. That resolves the earlier file-premise overclaim without claiming the image pipeline was tested.

No additional concrete host-input defect was established in this rereview. The host-data changes preserve the input/model separation: the model does not read resulting textarea source/caret or production feedback to predict itself. Final receiving acceptance still needs the active campaign's completed receipt, accepted dialog-observation scope, receiver-targeted challenges/transport and design evidence. Both retained original browser cases remain in place.

Rereview SHA-256 snapshot:

```text
b58815d54f5601b48018161c519d80434a0c664a86f0cf605db8e0913a47f59e test-ui/editor-workflows.oracle.test.ts
a75d690e3ae4bade74f67b4428a1f0d69e011f979bb23200f52c30fcf2a45ba8 test-ui/editor-oracles/workflow-model-oracle.ts
f00726a801285cb388544d1de3799b6beff4ca81398157c7a3f7c56de63d2743 test-ui/editor-oracles/workflow-driver-oracle.ts
c6ab566dfd90fef19958150f6d0ce55c6024ab407ddd80456607b602de3ccfff test-ui/editor-oracles/application-driver-oracle.ts
```

## Further rereview: native dispatch, accessible dialogs and completed campaign

Independent source/loss review continued with the pinned review skill,
checklist v1 and glossary reread in full after handoff. Only this review document
was edited. No browser or mutation jobs were launched by this reviewer. The
campaign results below were read from the parent's completed artifacts.

**Updated disposition:** source repairs WF-001 through WF-005 are accepted,
including accessible-dialog absence. Keep the two original browser cases until
the new receiving gap below and WF-006/007 are disposed with passing evidence.
This does not authorize removal of the rest of `compose-pwa.spec.ts`.

### Accepted source details

- `page.getByRole('dialog').count()` supplies the promised accessible-dialog
  absence. `mountedDialogs` is diagnostic and is not predicted by the model.
  This preserves the old named role-locator contract while allowing hidden
  mounted implementations. The original WF-004(a) detachment inference was
  mistaken; it is withdrawn. A visible unexpected dialog still fails through
  the independently observed `dialogs` field. Toast text and cardinality remain
  checked whenever feedback is owed.
- The native paste listener now retains the actual event object and samples
  its eventual `defaultPrevented` property. This avoids assuming that a
  microtask scheduled in capture runs after React's bubble handler. Completion
  requires a received paste event plus either prevention or native input.
  Actual event text, rather than resulting source, is the model input.
- Native ordinary prose, caret URL, selected URL, CR/CRLF, surrogate and empty
  clipboard histories remain represented. Empty clipboard uses actual
  write/read plus the real shortcut and checks unchanged source; the shortcut
  does not manufacture an expected source. Synthetic event allowance remains
  a separate observation from real native insertion. Image upload remains
  expressly outside this nonimage-file law.
- `setTextAt` commits React synchronously before setting the selection. The
  intercepted-paste checkpoint therefore does not depend on a pending product
  animation-frame caret repair. The workflow's source/caret snapshot is still
  taken after the actual action, before any subsequent modeled selection.

### WF-008 [P2]: Completed receiving campaign has a fragment-cleanup survivor

**Claim challenged:** completed-link receiving coverage distinguishes tracker
projection while retaining destination fragments. Authority is the adopted
completed-link law and ORC-004/006/012/013/015 (checklist v1).

The completed `workflows-native-event-receipt` report, run `11aad8d2b6bf`, has
116 baseline checks passing in each of two executions, with no reported
nondeterminism. Both `links-caret-before-insertion` and
`links-full-result-feedback` are killed through the registered workflow law at
`originalClipboard`. The original cleanup mutant
`src/ui/links.ts#authored:links-fragment-question` **survives** with outcome
`not-observed`. This is a genuine receiving coverage gap, not a timeout or a
production failure. The direct completed-link oracle's kill is useful separate
evidence; it does not erase this receiving survivor.

The existing `escapedClipboard` history has fragment `part?` but no trackers;
the cleanup mutation acts only when at least one tracker is removed. A legal
distinguishing history is selected label `the essay`, target
`https://example.com/a?ref=x#part?`: independently, `ref` is removed and the
entire `#part?` fragment remains. The wrong cleanup deletes the final question
mark. The same distinction is reachable through native/synthetic selected URL
paste and typed fallback, which use the same insertion helper through different
receiving decisions.

**Repair/next evidence:** construct tracker-removal × trailing-fragment-question
histories through each claimed receiving path and require the interesting
overlap as reach rather than relying on random fragment strings. Keep the
generator's existing fragment/range/activation dimensions and the same model,
driver and check. A reproducible assertion kill at the source checkpoint closes
this gap; simply removing this selected challenge does not. This is oracle
strengthening under an adopted law, not a proposal for a new production fix.

For contrast, `workflows-host-inputs` (same content-derived run label) had six
baseline native-paste timeouts and three blocked mutants. Those are setup/
completion failures and **zero kills**. The earlier `workflows-input-repaired`
run `952f9a581b37` has a different 92-check snapshot and cannot validate the
current 116-check source merely because it once killed all three challenges.

### Exact receiver challenges still owed by WF-006

The following are proposed production challenges, not executed results. Each
must be transported to the exact authoring code running in the browser before
its outcome can support receiver coverage.

| Wrong receiver design | Legal distinguishing history | Observation that should reject it |
| --- | --- | --- |
| Delete `pourOver`'s `event.preventDefault()` | Original selected-URL synthetic paste, then a native selected-URL paste | Synthetic `defaultAllowed` must be false; native resulting source must contain one intended link rather than default pasted text |
| Remove the nonempty-selection guard | Paste a recognized URL at a collapsed caret | Synthetic event stays allowed; real native paste inserts ordinary clipboard text |
| Remove the files guard | Selected text plus recognized URL and the constructed nonimage `x.txt` | Synthetic event stays allowed and source is unchanged by link handling |
| Recompute the range after clipboard focus transfer | Selected label, denied or non-URL read, typed fallback URL | Link replaces the originally captured label, with exact source and caret |
| Ignore the typed fallback value | Non-URL clipboard followed by a different valid typed target | Source uses the actual input-field value recorded before submit |
| Insert despite cancellation | Existing `cancel` history with selected text | Source/selection remain unchanged and no accessible dialog remains |
| Treat permission rejection as a normal non-URL read | Controlled denied read | Visible fallback body's independently recorded reason is `denied` |
| Update only the textarea DOM; omit React's change callback | Completed paste/clipboard insertion followed by composer→full-editor transition | The new editor must receive the inserted source, rather than stale React state |
| Omit caret placement | Selected-label or caret insertion with a following action | Both exact selection endpoints and the following modeled edit distinguish the wrong placement |

The current registration owns only `links.ts#insertLink/#linkToast`, the runner
selects `links.ts`, and the application is bundled before the gap child runs.
The source-capture/delegation list contains only format-shortcuts, links and
Draft. Adding `authoring.tsx` to an ownership string or source argument alone
cannot show that a virtual Vite mutation reached that already built app.
Require the actual transformed receiver source to become an app-bundle input,
or another demonstrated production mutation transport, and retain its source
fingerprint and distinguishing browser observation. An extraction is a possible
implementation choice, but requires its own authorized refactor evidence; it
must not substitute an invented receiver for the real application.

### Remaining obligations and production hypotheses

WF-007 remains open: no workflow-specific design-grammar record was found in
the inspected design directory. Record reconstruction of the exact two old
histories in both profiles, native versus synthetic delivery, captured range,
host input normalization, source/selection/surface state witnesses, checkpoint
completion and receiver ownership. Existing design-grammar approval covers
this work; another user approval is unnecessary.

No confirmed production defect was established here. Useful **unprobed
hypotheses** for later investigation are a delayed clipboard read combined
with an intervening text edit (the saved range may no longer identify the
same words), and focus after a canceled sheet. Current workflow grammar has no
interleaving action during the pending read, and the snapshot does not record
`activeElement`. Source/caret agreement alone does not prove focus restoration.
Define the promised pending-edit/cancel-focus behavior from adopted authority
before assigning either a production-bug verdict. The general stock-editing
preference is research direction, not proof of a particular asynchronous rule.

The deletion gate remains precise: **only** the two clipboard/paste test blocks
at the original `compose-pwa.spec.ts:145–185` become candidates, after current
fixed/random/repeat checks pass, declared original mobile overlaps are reached,
WF-008 is killed, and receiver transport/design obligations are met. The rest
of that file has unrelated image, PWA, fullscreen and authoring contracts and
has not been approved for deletion by this review.

All checklist requirements remain applicable as in the earlier matrix.
ORC-001–005/008–010/013–016 have the accepted source repairs and explicit
limits above; ORC-006/007 now have the completed baseline and two registered
kills, plus WF-008; ORC-011 retains the independent semantic-anchor formulation;
ORC-012 still prevents a receiving closure claim while WF-006/007/008 remain.
This is an updated source/loss review, not a zero-gap acceptance.

Further-rereview SHA-256 snapshot (production and retained tests unchanged):

```text
b58815d54f5601b48018161c519d80434a0c664a86f0cf605db8e0913a47f59e test-ui/editor-workflows.oracle.test.ts
a75d690e3ae4bade74f67b4428a1f0d69e011f979bb23200f52c30fcf2a45ba8 test-ui/editor-oracles/workflow-model-oracle.ts
ddbd86aec59db829c9cf728350ee7906ea9b1cbfd4f049ee48281f1fc4a277af test-ui/editor-oracles/workflow-driver-oracle.ts
c6ab566dfd90fef19958150f6d0ce55c6024ab407ddd80456607b602de3ccfff test-ui/editor-oracles/application-driver-oracle.ts
d325e5b77249ae1367aae1818978964a0cc81d3f1e4eaed94c9e24826ab423dd src/ui/authoring.tsx
fd453bc97469c2f0278bb4cc35cfb17aa2eebdb21560c7af5038cc426962e285 e2e/compose-pwa.spec.ts
```
