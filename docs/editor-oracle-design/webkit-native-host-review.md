# WebKit native-host repair: acceptance addendum

2026-11-18. Read-only implementation review by the WebKit research subagent,
using the pinned `oracles-review` skill and checklist v1. This reviewer authored
the preceding host research, but did not author this implementation. Only this
addendum was written during the review; no campaign inputs were changed and no
duplicate browser run was started.

**Static verdict: accepted.** The repair implements the researched native-host
boundary without weakening the existing law, independent model, histories, or
checks. Full receiving/mutation acceptance remains conditional on the running
138-check WebKit campaign and its authored challenges; this review claims no
new passing campaign or mutation kill.

## Observation reconstructed independently

Starting from `one two three`, selecting `two`, B/I/B/I yields, successively,
`one **two** three`, `one ***two*** three`, `one *two* three`, and
`one two three`. The adopted one-command history promise requires Undo to
restore `one *two* three`; Redo restores `one two three`. The existing semantic
model predicts those sources, the driver sends the real keys to React's editor,
and the check compares the exact recorded fields at every named action. The
new native boundary runs only **after** that action's `observe` call. It cannot
replace a wrong immediate observation with a later correct one.

## Implementation findings

No actionable implementation finding was identified.

- `native-host-oracle.ts` creates a separate BrowserContext only on
  `darwin` + WebKit. It installs no app scripts, authentication, routes, or
  expected answers. Its blank page is never focused or navigated to the app.
- The driver commits after initial setup, after every `.fill`, and after every
  observed action, including Undo/Redo, typing, paste, and toolbar commands.
  Selection-only actions have no native edit to commit; the preceding edit
  already committed at its own checkpoint.
- Blank-page creation/closure failures propagate as transport failures.
  Driver cleanup attempts both context closures with `Promise.allSettled`;
  cleanup errors preserve any original error in `AggregateError.errors` and
  `cause`. Closing the sterile context also closes a page whose own close failed.
- The exact model fingerprint matches the pre-repair receipt. All 42 constructed
  histories, 25 runs per campaign, fixed seed 20261118, complete field comparison,
  and calibration challenges remain. The helper reads no production output and
  imports no formatting semantics. Production's fingerprint is unchanged.

## Checklist disposition

| Requirement | Outcome for this bounded transport review |
| --- | --- |
| ORC-001 | Adopted authority and expected editing behavior retained. Current WebKit limit remains conservative while execution is pending. |
| ORC-002 | Independent model unchanged; host helper supplies no expected answers. |
| ORC-003 | Law, grammar, model, browser driver and check remain distinguishable; helper prose links the host research. |
| ORC-004 | No domain, filter, selection, bound or constructed-history reduction. |
| ORC-005 | Real production path retained; exact action receipt precedes native commit. |
| ORC-006 | Existing calibrations retained; production-mutant acceptance awaits the active campaign. Setup/runtime failures must not count as kills. |
| ORC-007 | Same fixed/random campaign configuration and direct replay path retained. |
| ORC-008 | No model state introduced, merged, or removed; its trigger does not apply to this repair. |
| ORC-009 | No model/production concept mapping changed; its trigger does not apply. Native host boundary is explicitly transport control. |
| ORC-010 | Original failure retained; both contexts receive cleanup attempts. |
| ORC-011 | No new shared semantic fault or second model is proposed; its trigger does not apply. Independent native-host probes already distinguish the transport hypothesis. |
| ORC-012 | This addendum fingerprints the reviewed working files; execution evidence remains separate and pending. No bug-class closure claimed here. |
| ORC-013 | No new reusable product threshold/range law. Host guard and neighboring host variants have the independent witnesses in the research report. |
| ORC-014 | Controlled premise is a native event boundary between modeled user actions; real receiving probes verify it without app source/caret/focus changes. Ordinary Safari remains unverified because remote automation is disabled. |
| ORC-015 | All declared states/constructed witnesses retained; campaign reach counts remain an execution obligation. |
| ORC-016 | No ordinary tests or fixed expected assertions added to an oracle file. |

After successful registered validation, update the session oracle's conservative
WebKit finding text and execution receipts to describe the verified macOS host
boundary. Do not extend the evidence to ordinary Safari or Linux without their
own receiving run. This documentation update should follow the active campaign
so its input fingerprints remain stable.

Reviewed base: `28b0c8d642a87e5810ad6eabd95c2d1714c53396`. SHA-256:

```text
f4e8ebb44bd9d5cc2aead20554a8c0eec9b01c0de4291e0f2761da2a4bc5fec3 native-host-oracle.ts
7cea8a6c535048f0e20b073c87906eea9e4e61b65c359d68353e4a2d74709db3 session-driver-oracle.ts
d6bb8085476ca484670d2abd501bb7322374eb6186bf5561523412aec556d296 session-model-oracle.ts
a3a564314a33aafc4d48c81a036eaa4281b1bacf983f876f7a3a7b8a8adbf538 editor-session.oracle.test.ts
3da803515b024126d880c6d25db23f77145df1a41fccdbe4db650aa11427cb54 src/ui/format-shortcuts.ts
```

Probe scope, pinned upstream sources and the Safari-disabled receipt:
[WebKit undo research](webkit-undo-research.md).


## Receiving disposition after the full campaign

**Not accepted for completion.** The static review above was conditional; the
registered WebKit baseline finished 131 passed / 7 failed, so no authored
mutation challenge ran. Follow-up stress reproduced grouping despite one
sterile-window pulse (3/60 fresh contexts). The implementation accurately
followed the initial research, but that researched mechanism did not provide a
reliable native completion boundary. The initial static acceptance must not be
reported as receiving acceptance or bug-class closure.

The [research receiving addendum](webkit-undo-research.md#receiving-addendum-single-pulse-rejection-and-separate-navigation-defect)
records the failed receiving evidence, corrected headed/headless source
interpretation, separate upstream navigation-error defect, and a concrete
official canary carrying WebKit r2395. The exact law/model remains appropriate;
no expected answer, history, field comparison, error law, or mutation
obligation should be weakened to accommodate these host defects.

## Review of the witnessed-boundary implementation

2026-11-18. Read-only implementation review using the reread installed
`oracles-review` skill, complete checklist v1 and glossary. This reviewer
proposed the preceding research mechanism, but did not implement this helper.
The review changes only this report; a temporary guard probe ran outside the
registered suite. **Static verdict: accepted, conditional on receiving and
mutation evidence.** No product-law relaxation or production change was found.

Reconstructed observation: loaded `one two three`, select `two`, B/I/B/I,
Undo must yield `one *two* three`; Redo must yield `one two three`. The semantic
model, exact per-action comparison and owed checkpoint are unchanged. The
transport helper runs after the immediate `observe` call. Its only new
acceptance value, `0A0`, belongs to an isolated reference editor; it cannot
supply an application answer or change the product model.

The implemented `commit(primaryPage)` first sends the synchronous native undo
query. Each of at most five fresh references independently validates native
insertion A and exact `0A0`, provokes the blank-window event, validates insertion
B and exact `0B0`, then observes native Undo. Only `0A0` completes the boundary;
`0x0` retries. False insertion/undo flags, contradictory source or exhaustion
throw an explicit transport error. Every driver site passes the current main
page. Existing action observations still occur before the commit. All 42
constructed histories, runs 25, seed 20261118 and calibrations remain.

A temporary guard probe challenged actual helper code through real WebKit
pages, injecting only the sterile context's collaborator responses:

| Contradiction | Observed helper result |
| --- | --- |
| First native insertion returns false | Immediate setup error, 1/1 created page closed. |
| Native Undo reports impossible `contradiction` source | Immediate unexpected-receipt error, 2/2 pages closed. |
| Every reference Undo reports grouped `0x0` | Exactly 5 attempts, then explicit transport error retaining all 5 receipts; 10/10 pages closed. |
| Initial insertion fails and page close also rejects | `AggregateError` retains initial setup error as `cause` and first `errors` member, plus cleanup failure; 1/1 page closed. |

Every scenario left zero pages in its closed sterile context. No product
verdict, oracle registration or mutation kill is claimed for these controlled
transport failures. Script/complete observations:
`/private/tmp/blygger-webkit-native-guard-probe.mts` and `.json`. The successful
150-history/450-boundary real-host research and no-pulse negative control remain
in the research addendum; the implemented helper's complete registered run is
still owed by the parent task.

| Checklist v1 | Current bounded review outcome |
| --- | --- |
| ORC-001 | Existing adopted formatting authority retained; WebKit finding remains conservative pending actual receiving. |
| ORC-002 | Model unchanged; reference has no SUT/model imports and supplies no product answers. |
| ORC-003 | Helper prose identifies native premise and links research; law/model/grammar/check remain distinguishable. No executable product-law change. |
| ORC-004 | No history axis, bound, filter, constructed case or domain reduction. |
| ORC-005 | Real React/Worker path and immediate product checkpoints retained. |
| ORC-006 | Existing product calibrations/challenges retained; complete receiving/mutation run pending. Guard-probe outcomes are transport failures, not kills. |
| ORC-007 | Same fixed/random registration and replay route retained. |
| ORC-008 | Trigger does not apply: no semantic model state introduced, removed or merged. Bounded local retry state belongs to transport. |
| ORC-009 | Trigger does not apply: no production/model concept mapping changed. Native reference receipt is explicitly host-only. |
| ORC-010 | Both page closures are attempted; initial failure and cleanup failures remain distinguishable. Guard probe confirms cleanup/error paths. |
| ORC-011 | Trigger does not apply: no newly proposed shared semantic fault between model and production. Independent reference formulation instead tests the host premise. |
| ORC-012 | This report ties the static verdict to hashes below and keeps receiving/mutation obligations open. No bug-class closure claimed. |
| ORC-013 | No new reusable product boundary law. Host boundary's nearby no-pulse witness rejects false completion; contradictory host receipts have controlled witnesses. |
| ORC-014 | Exact native event boundary is the controlled premise. Real macOS r2370 research receives it without source/caret/focus changes; r2395 registered receiving remains pending. Ordinary Safari/Linux remain unverified. |
| ORC-015 | All original declared states and constructed witnesses retained. Complete run still owes their reach counts. |
| ORC-016 | No ordinary product tests or expected product answers added to oracle files; reference checks enforce transport readiness only. |

The explicit `FORMATTING_ORACLE_BROWSER_EXECUTABLE` launch option uses the
supported `executablePath` API without changing production or package versions.
A run using JS 1.64.1 with official native r2395 must identify that mixed-version
host in its evidence and validate its native protocol compatibility; a clean
launch alone does not establish the session laws. Record archive URL/hash,
executable path, JS version, browser revision, full command and complete
receiving/mutation outcomes. The browser-error law remains exact.

Reviewed base remains `28b0c8d642a87e5810ad6eabd95c2d1714c53396`.
Current SHA-256 fingerprints:

```text
3b83c768f649b4f830aca81b3bae002c92c244a95d1174a8f72959e8a374dbbf native-host-oracle.ts
1df491e849a86095817fbc902979cb00d831f33edb34bac650ccea897aa9e824 session-driver-oracle.ts
d6bb8085476ca484670d2abd501bb7322374eb6186bf5561523412aec556d296 session-model-oracle.ts
05e19052c5d1bbaa63cf30439d55e971fd468e93d4c793e0ba1be7a746d01d90 editor-session.oracle.test.ts
21448b889781e318422dd22b853c09a08a247ea18fc28f8dcc1f86f6eca3eeb8 scripts/formatting-oracles.ts
3da803515b024126d880c6d25db23f77145df1a41fccdbe4db650aa11427cb54 src/ui/format-shortcuts.ts
```

## Retry-budget assessment while receiving validation runs

Read-only assessment, requested by the parent before changing active campaign
inputs. The native source provides **no proven five-attempt completion bound**.
The observed maximum of four in 450 boundaries is sample evidence, not a bound.
The exact attempt histogram from the completed r2370 research is:

| Attempts until acknowledged `0A0` | Boundaries |
| --- | ---: |
| 1 | 365 |
| 2 | 68 |
| 3 | 16 |
| 4 | 1 |

There were 103 rejected `0x0` receipts among 553 attempts: reject fraction
`q = 103 / 553 = 0.18626`. An illustrative independent-attempt model gives
per-boundary exhaustion `q^k`, and exhaustion somewhere in `N` boundaries
`1 - (1 - q^k)^N`:

| Cap k | Per-boundary exhaustion | At least one in 1,000 boundaries | At least one in 5,000 boundaries |
| --- | ---: | ---: | ---: |
| 5 | 0.00022416 | 20.08% | 67.40% |
| 8 | 0.000001448 | 0.1447% | 0.7216% |
| 10 | 0.00000005025 | 0.005025% | 0.02512% |
| 12 | 0.000000001743 | 0.0001743% | 0.0008716% |

These are planning estimates, **not guarantees**: native scheduling may be
correlated, the attempt distribution is based on r2370, and r2395 or parallel
campaign load can differ. Later-attempt samples are sparse (only 17 boundaries
needed a third attempt), so they cannot establish an asymptotic tail. A
persistent host stall defeats every finite retry cap. Even a simple Wilson 95%
interval for the marginal rejection fraction is approximately 15.60–22.08%;
that uncertainty does not justify inferring a five-attempt guarantee.

**Recommendation: twelve bounded attempts is an appropriate host liveness
budget after the active campaign finishes.** The expected normal-case work
stays the same: a success returns immediately. Retry only the explicitly
recognized grouped `0x0` receipt; retain immediate failure for contradictory
source, false command results and cleanup failures. Retain a hard finite cap
and the existing enclosing campaign timeouts. Every accepted continuation must
still have the exact `0A0` completion receipt. This changes no product law,
expected answer, legal history, selection/source comparison, generated run
budget or mutation obligation. It allows an already demonstrated transient
host condition more chances to produce the *same required* evidence.

Record the cap in diagnostics and retain all receipts on exhaustion. If the
implementation changes to twelve, the controlled guard probe should also
cover more than five grouped attempts followed by acknowledgment, exactly
twelve failures followed by exhaustion, and the contradictory/error paths.
A successful registered campaign at cap five remains evidence for paths that
acknowledged within five; it does not exercise the newly available six-through-
twelve path. Do not mutate the in-progress campaign's inputs to make this
change. Any observed exhaustion or significant retry-tail change should remain
an explicit receiving observation, not disappear into an unstated raised cap.

## Scope of native-boundary control within a session plan

Read-only assessment after the parent stopped the partial r2395 campaign
(75 registrations passed, zero failed; incomplete evidence). It is sound for
this driver to create/use `nativeHostBoundary` only when the **resolved action
plan** contains a delivered Undo or Redo:

```ts
const needsNativeHistory = plan.actions.some(action =>
  action.kind === 'key' &&
  (action.intent === 'undo' || action.intent === 'redo'));
```

This decision reads semantic **inputs** to the history; it never reads browser
output or compares an actual answer with the model. It removes no history,
action, public observation, checkpoint, declared state, calibration or generated
run. Every forward edit still passes through the same real production path and
is judged by the same source/selection/focus/preview/state/error fields.

Reason: AppKit undo grouping determines what a subsequent Undo/Redo restores.
The currently observed forward-edit facts do not inspect a native undo stack or
undo availability. Thus no lawful continuation *inside a plan without Undo or
Redo* distinguishes the grouped and separately committed native histories.
The source/selection changes are still observed immediately after every real
action. If removing incidental reference-page time exposes an autosave,
navigation or rendering race, retain that as a real receiving failure; do not
add unrelated delay to regain the old timing.

Apply the condition to the **whole plan**. When even one Undo/Redo exists,
retain native boundaries from initial setup and after every fill/action,
including edits far before that history command. Starting boundary work only
at the Undo key would recreate the known setup-plus-format grouping defect.
Do not gate by journey names, `h.native`, platform response, mutation result or
checkpoint label. Future resolved plans with an Undo/Redo automatically enter
the full boundary path. If a future action kind can invoke Undo/Redo or a
future field observes undo-stack availability, extend this transport predicate
with that new semantic input before citing the resulting coverage.

Current bounded reconstruction from all 42 constructed inputs finds **20 with
Undo/Redo and 22 without**. The former include native inline on every surface,
list undo, empty-marker deletion, intra-word formatting and redo-branch discard.
The latter include forced fallback, verse, toolbar, off-list Tab, paste and
mixedInline. These 22 plans still execute and receive every existing product
check; they simply avoid a host premise their observations do not consume.
This is a transport optimization, not an ORC-004 exclusion or weakened model.

Static acceptance is conditional on reviewing the resulting implementation
and rerunning the full registered WebKit baseline/repeat/challenges unchanged.
The stopped 75-pass campaign must remain labeled partial, not green completion.
No active source or campaign inputs were edited for this assessment.

## Final review: twelve attempts and whole-plan enablement

2026-11-18. Read-only review of the final frozen inputs while the parent runs
`session-webkit-witness-r2395-final`. **Static acceptance retained; complete
registered receiving/mutation acceptance remains pending.** No material finding.

The helper now takes `required = true` and creates its sterile context only
when required **and** darwin/WebKit. `commit` returns before querying the
primary document when no context exists. The session driver derives the flag
from the complete resolved plan's key intents before setup, so all boundaries
still run from setup through the final action for every plan containing Undo
or Redo. The three commit sites, every action/checkpoint, exact source/selection/
focus/preview/error check and semantic model remain. The only other change is
`maxAttempts = 12`, interpolated into exhaustion diagnostics.

The final temporary guard probe invoked this actual helper using official
WebKit **r2395 / 27.2**, executable
`/private/tmp/blygger-webkit-r2395/pw_run.sh`, through installed Playwright JS
**1.64.1**. Controlled responses were injected only into the sterile reference
documents; the main document retained source `two` throughout. These are
transport checks, not registered oracle campaigns or mutation kills:

| Injected collaborator condition | Observed final helper behavior |
| --- | --- |
| Six grouped `0x0` receipts, followed by `0A0` | Completes on attempt seven; all 14 created pages closed. |
| Twelve grouped `0x0` receipts | Throws after exactly twelve attempts; diagnostic contains all twelve complete receipts; all 24 pages closed. |
| `required=false` with browser/context and primary-query traps | Completes with zero native-context creations and zero primary queries. |
| First insertion returns false | Immediate setup error; 1/1 page closed. |
| Undo source is `contradiction` | Immediate receipt error; 2/2 pages closed. |
| Initial insertion fails and page close rejects | `AggregateError` retains the setup error as cause and first errors member, alongside injected cleanup failure; 1/1 page closed. |

Every created sterile context ended with zero pages. Exact script and complete
JSON receipts:
`/private/tmp/blygger-webkit-native-guard-final-probe.mts` and `.json`.
The source hashes below identify the helper/driver these probes actually used.

Checklist dispositions in the preceding witnessed-boundary review remain,
with these updates: ORC-004 retains all legal histories while removing only an
unused host premise from plans without history commands; ORC-005 keeps every
product observation at its existing checkpoint; ORC-010 now has explicit
seven-attempt success, twelve-attempt exhaustion, disabled-host and unchanged
contradictory/cleanup guard witnesses. ORC-014's real receiving obligation is
still the parent's final frozen campaign. No source was edited by this reviewer.

```text
4a74e121541a5067d5544319043d16c64fb0d5c0c612e85ae43541512a8170ee native-host-oracle.ts
4567f7fc6cb24a7af3c74be8245ec49ab2d1fcb9e05c431f46312c0b2c6ed4ac session-driver-oracle.ts
d6bb8085476ca484670d2abd501bb7322374eb6186bf5561523412aec556d296 session-model-oracle.ts
05e19052c5d1bbaa63cf30439d55e971fd468e93d4c793e0ba1be7a746d01d90 editor-session.oracle.test.ts
21448b889781e318422dd22b853c09a08a247ea18fc28f8dcc1f86f6eca3eeb8 scripts/formatting-oracles.ts
3da803515b024126d880c6d25db23f77145df1a41fccdbe4db650aa11427cb54 src/ui/format-shortcuts.ts
```

The parent reports prior Chromium and Firefox cap-five campaigns each passed
138 checks, their determinism repeats and 3/3 authored challenges; this reviewer
did not independently rerun or inspect those receipts in this final guard
review. They are not evidence for the new twelve-attempt path. The interrupted
75-pass/zero-failure WebKit run remains explicitly partial. Complete native
receiving, repeated-history determinism and correctly classified authored
mutation kills are required before claiming this WebKit finding resolved.

## Receiving investigation: full-editor to quick-edit save premise

The final r2395 campaign subsequently found a separate determinism failure in
`editorToQuick-desktop` and `editorToQuick-mobile`: every preceding textarea
checkpoint was correct, including native Undo/Redo, but `quickLoaded` sometimes
held `*two*` rather than expected `two`. The failure is recorded in
`build/formatting-oracles/session-webkit-witness-r2395-final/run-*.jsonl`
(determinism registrations for those two constructed histories). This receiving
failure remains open until the repaired driver receives a complete run.

**Cause confirmed by controlled probe: the driver bypasses the application's
guarded navigation, rather than native Redo losing React state.**
`session-driver-oracle.ts` implements the quick transition with
`page.goto('/studio')`, a new document load. The full editor's `edit` marks its
Draft revision dirty and schedules an autosave after 400 ms
(`src/ui/authoring.tsx:2023`). `save` cancels that timer and awaits the Draft
persist operation (`:2001`); the normal TanStack Router navigation blocker
awaits that save before allowing internal navigation (`:2007–2022`). The visible
`← compose` control is a Router Link (`:2348`). Quick edit accepts fetched
`item.contentMd` as its source (`:1269`, `:1307–1310`, `:1517`). A hard load is
not an acknowledgment that the dirty working copy has reached that source.

The independent temporary probe ran real production React/Worker code with
JS Playwright 1.64.1 / official WebKit r2395 / 27.2, desktop and iPhone viewport.
It used these explicit network/event premises, not elapsed-time sleeps:

1. API-create a fragment with source `two`; select all; send I, I, Undo, Redo
   through real keys and the current witnessed native boundary.
2. After Undo, wait for the actual `PATCH contentMd="*two*"` response with status
   200. Independently read the item to confirm stored `*two*`.
3. Redo produces a real `historyRedo` input with source `two`, a real React
   preview POST with `contentMd="two"`, and a real save PATCH with
   `contentMd="two"`. Hold only that final PATCH before it reaches the server.
   This proves both the native input and React/Draft state received the correct
   source; the server still holds the preceding `*two*`.
4. Compare hard document navigation with the actual `← compose` link, releasing
   the held save explicitly for the latter. Open the same item's real quick
   editor and read both it and the API.

| Navigation | Viewport | Source before navigation | Stored source before navigation | Quick source / stored source afterward |
| --- | --- | --- | --- | --- |
| Driver's `page.goto('/studio')` | Desktop | `two` | `*two*` | `*two*` / `*two*` |
| Driver's `page.goto('/studio')` | iPhone | `two` | `*two*` | `*two*` / `*two*` |
| Actual guarded `← compose` Link | Desktop | `two` | `*two*` | `two` / `two` |
| Actual guarded `← compose` Link | iPhone | `two` | `*two*` | `two` / `two` |

No page error was observed. A follow-up on both viewports additionally recorded
the actual DOM click on the compose link and completed a browser event turn
before inspecting its URL: navigation remained at `/edit/` while the final save
was held. Releasing the save allowed navigation; quick edit and API then both
held `two`. This avoids treating an unstarted asynchronous click as evidence
that the save blocker works.

Complete scripts and raw event/network receipts:

- `/private/tmp/blygger-webkit-transition-save-probe.mts` and `.json`
- `/private/tmp/blygger-webkit-transition-save-click-receipt-probe.mts` and `.json`

The original e2e authority at base `28b0c8d…` navigated with `page.goto` after
I/I returned its initial marker. That sequence could happen to read the right
initial source without any save acknowledgment. The richer oracle's native
Undo/Redo and host boundary work let the intermediate `*two*` reach autosave;
the final `two` can still be pending when the document is replaced. This
explains why a correct previous textarea observation does not establish the
facts needed at the new document's `quickLoaded` checkpoint (ORC-005).

**Recommended repair, with expected `two` unchanged:** deliver the transition
through the real `← compose` Router Link and await its real destination. Keep
the same generated history, native commands, exact immediate source/selection/
focus observations and `quickLoaded` model/check. This strengthens the real
production entry-point path; it does not add a save delay, accept a stale
answer, reduce a grammar, or filter a failure. No production change is indicated
by the controlled evidence: normal guarded navigation already preserves the
latest source.

For general enforcement, extend this same registered oracle's transition
premise so a constructed/generated history can hold the final save pending,
observe that the delivered navigation waits, release it, then check exact quick
source. A nearby wrong driver using hard navigation or wrong production
navigation guard must be rejected at that boundary. A bare wait for an arbitrary
save indicator or a fixed delay would hide the missing entry-point premise.
An explicit save acknowledgment before a deliberate hard reload would test a
different persisted-reload premise; it would not test the application's normal
internal-navigation guard. Do not claim arbitrary hard-reload/browser-close
persistence from this investigation.

Only this report and temporary external probes were written by this reviewer.
No production or active registered campaign source was changed.

## Final read-only review of the in-app navigation repair

2026-11-18. The quick-action driver now clicks the actual exact-name
`← compose` link and waits until the destination path is `/studio` or
`/studio/`. It then opens the same item id, enters its actual quick editor,
focuses/selects its source, captures the existing `quickLoaded` observation and
continues with the existing quick bold action. It adds neither an arbitrary
delay nor a test-only save call. The product itself supplies save-on-leave
through the Router Link and its blocker.

**Verdict: accepted for this bounded in-app navigation repair, pending the
parent's complete registered WebKit r2395 baseline, determinism repeat and
three selected authored challenges.** This verdict does not accept a complete
migration or close the separate raw-navigation persistence obligation.

Reconstruction: from API-loaded `two`, I/I/Undo/Redo owes `*two*`, `two`,
`*two*`, `two` at the same immediate checkpoints. Following the product's compose
link then opening that same item's quick editor owes `two` and its full-source
selection, followed by `**two**` when bold is delivered. The model still predicts
these exact values independently. The previously run controlled pending-save
probe supplies a real receiving witness for the link's save premise on both
viewports. The forthcoming registered run must supply the actual final driver
receipt and challenge classifications; this source review supplies no new
passing campaign or mutation kill.

The source/model/registration fingerprints confirm no semantic action, case,
checkpoint, field comparison, error rule, count, generator bound or campaign
budget was weakened. The implementation still records each immediate user
observation before native-host work; it retains the twelve-attempt receipt
helper, whole-plan history predicate and cleanup behavior already reviewed.
The full editor/quick editor production file matches the base commit's SHA-256.

The **delivery path** did change from a hard document load to the actual in-app
Link. That is a meaningful receiving-history dimension even though the semantic
`quick` action name is unchanged. The original native I/I → hard navigation →
same-item quick edit → B witness, and the nearby prior-save/latest-unsaved
schedule, remain separate open work as stated in
[the navigation-premise review](webkit-navigation-premise-review.md). A future
registered raw-navigation driver must record its actual completion and any
before-unload dialog/decision; an explicit discard must not be silently assumed.
Do not count the link route, a stated limit, or an older passing test as closure
of that reachable raw-path persistence counterexample. No full migration,
zero-loss, ordinary Safari, general hard-reload/browser-close persistence or
complete WebKit support claim follows from this repair.

Checklist delta, relative to the preceding final helper review:

| Requirement | Current outcome |
| --- | --- |
| ORC-001 | Exact adopted in-app formatting/source promise retained. Raw-navigation and broader receiving claims remain open. |
| ORC-004 | Semantic plan/case grammar unchanged; actual navigation delivery changes. The raw history must remain separately represented before migration closure. |
| ORC-005 | Link entry point now exercises production's real save-on-leave guard; destination URL is a real completion receipt. The same item and owed quick source are still checked. |
| ORC-006 | Existing calibrations and authored challenges unchanged. Their final registered assertion-kill evidence remains pending; no transport/setup failure counts as a kill. |
| ORC-007 | Fixed seed, random campaign, run budget and replay route unchanged. |
| ORC-010 | Existing per-action checkpoints and both-context cleanup retained; no new catch/filter obscures a failed save or navigation. |
| ORC-012 | This is a bounded driver repair, not full migration/bug-class closure. Known raw-path work stays explicit; final receiving receipts remain required. |
| ORC-014 | The in-app Link supplies the controlled save premise through real production, supported by the held-PATCH probe; raw navigation supplies a different unresolved premise. |
| ORC-015 | Constructed cases and declared states unchanged; final run owes their complete reach results. |
| ORC-016 | No standalone tests or concrete expected product assertions added to oracle files. |

ORC-002/003 remain accepted as before: independent model/check unchanged and
responsibilities documented beside the changed driver. ORC-008/009 triggers do
not apply because model state and domain vocabulary are unchanged. ORC-011's
shared-semantic-fault trigger does not newly apply. ORC-013 adds no reusable
product boundary law; the existing exact native and source laws retain their
previous witnesses. These dispositions do not remove the pending registered
receiving/mutation obligations or the explicit raw-navigation work.

Reviewed base `28b0c8d642a87e5810ad6eabd95c2d1714c53396`; SHA-256:

```text
4a74e121541a5067d5544319043d16c64fb0d5c0c612e85ae43541512a8170ee native-host-oracle.ts
518e08e3c15822b02c4ea56a87b521beeafb56c3bccce559a0abd8909772e68c session-driver-oracle.ts
d6bb8085476ca484670d2abd501bb7322374eb6186bf5561523412aec556d296 session-model-oracle.ts
05e19052c5d1bbaa63cf30439d55e971fd468e93d4c793e0ba1be7a746d01d90 editor-session.oracle.test.ts
21448b889781e318422dd22b853c09a08a247ea18fc28f8dcc1f86f6eca3eeb8 scripts/formatting-oracles.ts
3da803515b024126d880c6d25db23f77145df1a41fccdbe4db650aa11427cb54 src/ui/format-shortcuts.ts
d325e5b77249ae1367aae1818978964a0cc81d3f1e4eaed94c9e24826ab423dd src/ui/authoring.tsx
cc3ee87d1e7233a77ae1a8ca5c395455efe5e1a65b9b209b1166e7d990d054ae src/ui/draft.ts
```

Only this review report was edited. No browser job or full replay was started,
and no active campaign source was changed by this reviewer.


## Source correction: unobserved unload decisions in the raw-navigation probe

2026-11-18. Read-only follow-up requested by the parent during its registered
repeat. No browser or registered job was started, and no active campaign input
was changed. This addendum qualifies the earlier raw-navigation interpretation;
it does not replace the recorded observations or the raw-history migration
obligation.

**The existing raw `page.goto` probe does not establish a missing product unload
guard. Playwright 1.64.1 automatically accepts a `beforeunload` dialog when no
page/context dialog listener handles it.** That acceptance means “Leave Page”.
It permits departure with unsaved text; it does not mean that the product
failed to request a warning or promised to save after the author chose to leave.

The temporary `/private/tmp/blygger-webkit-transition-save-probe.mts` installs
page-error, request, response and input recording, but no `dialog` handler or
`beforeunload` event receipt. Its hard-navigation result still proves that the
navigation completed and subsequently fetched the earlier stored source under
the controlled pending-save schedule. It cannot distinguish (a) a requested
warning that Playwright automatically accepted from (b) no requested warning.
Consequently, any wording treating that result as a confirmed absent-unload-
guard product defect is unsupported. Ordinary Safari behavior remains untested.

### Installed and pinned upstream source chain

- Studio's `src/ui/authoring.tsx:2007–2021` already sets
  `enableBeforeUnload` when the draft is dirty or a replacement is pending,
  unless deliberate leaving is active. The installed TanStack history
  `src/index.ts:489–511` evaluates that callback during `beforeunload`, calls
  `preventDefault()` and sets `returnValue`. This is a browser-warning guard,
  separate from the asynchronous in-app `shouldBlockFn` save path.
- Installed Playwright core is **1.64.1**. Its compiled
  `lib/coreBundle.js:13954–13959` and `:63808–63821` agree with pinned upstream
  [`Dialog._close`](https://github.com/microsoft/playwright/blob/v1.64.1/packages/playwright-core/src/server/dialog.ts#L95)
  and the
  [client dialog dispatch](https://github.com/microsoft/playwright/blob/v1.64.1/packages/playwright-core/src/client/browserContext.ts#L142):
  unhandled `beforeunload` uses `accept`; other dialog types use `dismiss`.
  [`DialogManager.dialogDidOpen`](https://github.com/microsoft/playwright/blob/v1.64.1/packages/playwright-core/src/server/dialog.ts#L113)
  invokes that default when no handler accepts responsibility. Thus generic
  documentation saying dialogs are automatically dismissed cannot determine
  the specific unload choice in this installed version.
- Installed WebKit `navigateFrame` uses **`Playwright.navigate`**, not
  `Page.navigate`:
  [pinned `wkPage.ts:530–535`](https://github.com/microsoft/playwright/blob/v1.64.1/packages/playwright-core/src/server/webkit/wkPage.ts#L530).
  Its command has URL, page/frame ids and referrer, with no unload-bypass flag.
  In the pinned
  [native bootstrap patch](https://github.com/microsoft/playwright/blob/v1.64.1/browser_patches/webkit/patches/bootstrap.diff#L12018),
  `InspectorPlaywrightAgent::navigate` calls
  `WebPageInspectorController::navigate`, which calls `loadRequestForInspector`;
  for the main frame that delegates to ordinary `WebPageProxy::loadRequest`.
  No explicit main-frame `beforeunload` bypass was found along that traced
  command path. This is source evidence from the installed release's pinned
  native source, not a new receiving claim about the r2395 binary.
- The upstream
  [WebKit frame loader](https://github.com/WebKit/WebKit/blob/56453fdfe0b0ca6258c23e6453b34f70b885d13f/Source/WebCore/loader/FrameLoader.cpp#L4061)
  requires prior page interaction before requesting the confirmation. It
  dispatches the event, then considers `defaultPrevented`/`returnValue` and
  user interaction. Real keyboard commands were delivered in the existing
  probe, but that probe did not record whether its warning actually appeared.
- Playwright's WebKit
  [dialog callback](https://github.com/microsoft/playwright/blob/v1.64.1/packages/playwright-core/src/server/webkit/wkPage.ts#L617)
  explicitly reports navigation aborted when `beforeunload` is **dismissed**
  and sends `Dialog.handleJavaScriptDialog` with the chosen boolean. Upstream
  [beforeunload tests](https://github.com/microsoft/playwright/blob/v1.64.1/tests/library/beforeunload.spec.ts#L38)
  include navigation with no listener, explicit accept/dismiss, and a
  document-reload dismissal. These are upstream tests read as source; they
  were not run here.

The separate WebKit WebDriver automation rule in
[`WebPageProxy::runBeforeUnloadConfirmPanel`](https://github.com/WebKit/WebKit/blob/56453fdfe0b0ca6258c23e6453b34f70b885d13f/Source/WebKit/UIProcess/WebPageProxy.cpp#L11207)
can also allow departure when a WebDriver automation session exists. Do not
conflate that conditional native WebDriver path with Playwright's inspector
transport: the installed Playwright JavaScript default already explains why
an unobserved dialog can allow `goto`, and the actual r2395 event/choice still
needs a receiving receipt.

### Revised next experiment and remaining obligation

After the parent's active repeat, rerun the same controlled schedule on both
viewports, with explicit `dialog` recording installed **before** hard navigation.
For each viewport use separate fresh contexts for `dismiss` (“Stay”) and
`accept` (“Leave”). Record exact dialog type, choice, URL/navigation result,
visible source, stored source and the correlated pending save. A bounded
prepared script is `/private/tmp/blygger-webkit-unload-choice-probe.mts`; it has
not been executed by this reviewer.

If dismiss receives a real `beforeunload` and cancels navigation while retaining
latest visible text, and accept receives the same warning and permits departure,
the receiving evidence supports a functioning warning guard plus explicit
discard. If navigation completes without a dialog, retain that receiving result
and investigate activation/guard/native-path premises before diagnosing a
product defect. A dialog/setup error or timeout is not a product-law kill.

The original raw-navigation history and pending-save schedule still need to be
represented in the registered oracle before claiming lossless migration. Its
model must record the actual unload decision rather than silently treat a
Playwright default as user intent, or demand source preservation after an
explicit discard without adopted authority. This clarification closes no raw-
path coverage gap and changes no approved editing law. It prevents a harness-
chosen discard from being mislabeled as evidence of an absent Studio warning.


## Final receiving review: native history, in-app navigation, and explicit unload choice

2026-11-18. Independent read-only inspection of the parent's completed registered
report and explicit-choice probe JSON. This reviewer started no browser job and
changed only this addendum. **The bounded macOS Playwright WebKit native-history
and in-app navigation repair is accepted with the registered evidence below.**
This acceptance does not close raw-navigation oracle coverage or establish
ordinary Safari/general WebKit support.

### Registered receiving and authored challenges

The reviewed successful report is specifically
`build/formatting-oracles/session-webkit-ui-transition-r2395/results.json`,
with sibling `summary.md`, `stream.log` and `test-output.log`. Its run id is
`ad7c4be40270`. The directory matters: an earlier failed campaign in
`session-webkit-witness-r2395-final` has the same run id and must not be substituted
for this successful report. The successful report SHA-256 is recorded below.

- The report is **nonprovisional**, with baseline **138 passed, 0 failed,
  0 skipped**, an empty `nondeterministic` list and no exclusions. The stream
  records two unmutated runs, **386.4 s and 388.3 s**, and zero nondeterminism.
- All **three selected** authored challenges are classified as law kills on
  reproducible fixed-seed routes, under `browser editing history`:
  `browser-native-undo-required` on `composer-desktop`,
  `document-start-formatting` on `editor-desktop`, and
  `native-delete-undo` on `empty-bold-desktop`. The report contains no blocked
  or setup/runtime/timeout substitute for those kills.
- This is a deliberately selected three-mutant run from a 40-authored-mutant
  inventory; **3/3 selected** is the supported count. It is not evidence that
  all forty challenges or every production mutant was run here.
- Current helper, driver, independent model, registration and production
  fingerprints match those in the preceding in-app navigation review. The
  accepted receiving boundary is still the real React editor/composer and
  same-item in-app transition, observed after each action with the unchanged
  exact source/selection/focus/preview/error checks. No expected answer was
  relaxed to obtain these results.

The host remains installed Playwright JavaScript **1.64.1** with the explicit
native-executable override to official macOS WebKit **r2395 / 27.2**, not a
matched-package upgrade. This real campaign supplies the bounded native
protocol/receiving validation that static launch compatibility alone could not.
It does not establish compatibility with another browser revision or host.

### Exploratory receiving: explicit “Stay” and “Leave” choices

After the registered campaign, the parent ran
`/private/tmp/blygger-webkit-unload-choice-probe.mts`, adding only the
`navigator.userActivation` receipt to this reviewer's prepared script. I
independently inspected all four records in
`/private/tmp/blygger-webkit-unload-choice-probe.json`, including their input
and correlated PATCH events. These are **exploratory probe observations**,
not a registered oracle RED, campaign, mutation kill or raw-coverage closure.

Each fresh context performed I/I/Undo/Redo with exact sources `*two*`, `two`,
`*two*`, `two`. Before navigation, the Undo source had a successful stored PATCH
and API read `*two*`; the latest Redo source was visible as `two` and its PATCH
was explicitly held pending. Every record reports active **and** sticky user
activation true. Every navigation emitted an actual `beforeunload` dialog;
the installed listener recorded the requested choice and successful handling.

| Viewport | Explicit choice | Receiving observation |
| --- | --- | --- |
| Desktop | Dismiss / Stay | Editor URL retained; visible source `two`; after release final save returns 200 and API source is `two`. |
| iPhone | Dismiss / Stay | Editor URL retained; visible source `two`; after release final save returns 200 and API source is `two`. |
| Desktop | Accept / Leave | Navigation completes to `/studio`; same-item quick edit and API both read previously stored `*two*`. |
| iPhone | Accept / Leave | Navigation completes to `/studio`; same-item quick edit and API both read previously stored `*two*`. |

In both Stay records, `page.goto` waited for its default `load` completion and
reached the probe's **20 s timeout after the handled dismissal**. That is the
probe's canceled-departure receipt, alongside the retained URL and latest visible
source. It is not an oracle assertion failure, mutation kill, or evidence that
the product failed to preserve the editing state. A future registered driver
should observe cancellation/retained source directly rather than use a twenty-
second wait as its completion condition.

No page-error event appears in any of these four records. The Leave records
supply the specific distinguishing fact the older raw probe omitted: departure
was explicitly allowed after the real warning. Thus this receiving experiment
supports the prior source correction: **no missing Studio unload guard is
demonstrated; both tested viewports receive and honor that guard.** The older
unhandled-dialog raw navigation was consistent with Playwright's automatic
acceptance, not evidence of an unsolvable native undo problem or a proven
missing warning.

The raw-navigation history/decision dimension remains an open registered
coverage and migration obligation. When adopted into the oracle, its history
must make Stay/Leave explicit and keep the pending-save premise, real warning,
navigation/cancellation observation and source checks distinguishable. This
probe does not authorize dropping that dimension, claiming lossless replacement
of the original hard-navigation witness, or demanding latest-source persistence
after explicit discard without an adopted promise.

### Fingerprints of reviewed receipts and inputs

Base remains `28b0c8d642a87e5810ad6eabd95c2d1714c53396`. SHA-256:

```text
5e2735b4f5c189bc26b32b15f04e534a03b533103fff5177f2b7a5ea3bcb7055 build/formatting-oracles/session-webkit-ui-transition-r2395/results.json
8fd3405571bc757dc50b33ca44a9d18b21a09f7ab046ee47a4bf332bd00151ee /private/tmp/blygger-webkit-unload-choice-probe.mts
6056e256473f0b35a8d04d542bef86d15c57e1b7b1bd7a6075f4b828b67fd82e /private/tmp/blygger-webkit-unload-choice-probe.json
4a74e121541a5067d5544319043d16c64fb0d5c0c612e85ae43541512a8170ee native-host-oracle.ts
518e08e3c15822b02c4ea56a87b521beeafb56c3bccce559a0abd8909772e68c session-driver-oracle.ts
d6bb8085476ca484670d2abd501bb7322374eb6186bf5561523412aec556d296 session-model-oracle.ts
05e19052c5d1bbaa63cf30439d55e971fd468e93d4c793e0ba1be7a746d01d90 editor-session.oracle.test.ts
3da803515b024126d880c6d25db23f77145df1a41fccdbe4db650aa11427cb54 src/ui/format-shortcuts.ts
d325e5b77249ae1367aae1818978964a0cc81d3f1e4eaed94c9e24826ab423dd src/ui/authoring.tsx
cc3ee87d1e7233a77ae1a8ca5c395455efe5e1a65b9b209b1166e7d990d054ae src/ui/draft.ts
```

The preceding checklist dispositions are retained with their pending receiving
items now satisfied **for this bounded native-history and in-app route**:
ORC-005/014 have the actual registered receiving run, ORC-006 has the three
selected assertion-law kills, ORC-007 has the complete repeat and direct
fixed-seed kill routes, and ORC-015 has the complete passing registrations and
reach output. ORC-001/004/012 still require the stated raw-route and broader-host
limits; the separate raw dimension remains open. The exploratory unload probe
supplies evidence about that premise, not its registered law or mutation
coverage. Other applicability dispositions and unchanged semantic independence
from the preceding review remain in force.
