# Receiver oracle implementation and grammar controls

2026-11-18. Implements the adopted BRACKET-001, FOCUS-001 and REPLACE-001
receiving laws from `remaining-receivers-t5-audit.md`. Preservation relation is
**named laws** at formatter entry, each DOM Escape, pending replacement,
post-settlement source/editability and a following ordinary formatting command.
Source models, offsets and controlled provider inputs determine answers;
production output is never used to choose its own expectation.

The user approved all this existing-behavior oracle expansion. Existing
registrations/models/production were not edited for this implementation. The
new registration is `editor-receivers.oracle.test.ts`; the model and driver
are `receiver-model-oracle.ts` and `receiver-driver-oracle.ts`. Parent owns
runner selection, browser jobs and production. New authored `receiver-*.json`
files challenge both formatter and authoring receiver behavior.

## Parts and design grammar

The existing editor boundary now has more than five laws, so the design grammar
trigger applies. This extension keeps the approved split rather than merging
semantic command models into a browser state machine:

| Part | Job / distinguishing continuation |
| --- | --- |
| Formatter-entry source/range | Already-consumed input identity; adding one break after this entry violates bracket precedence even if contact/item insertion itself was valid. |
| Consumed native-entry flags | Distinguish a received consumed event from an unconsumed or undelivered key; absence is setup, never a formatter-law kill. |
| Focus-active and picker-open bits | The same Escape clears picker first or exits view when no picker remains. The second Escape is the continuation distinguishing the two starting layer states. |
| Arranged historical source | Success must receive that source rather than the working copy or a source captured from the response. |
| Pending working source/range | A wrong edit can disappear after successful restore, so pending identity is independently owed. |
| Editing gate receipt | Actual readonly, all five disabled controls and picker absence distinguish unavailable editing from coincidental source identity. |
| Action-busy settlement | Independent operation completion input; a stuck replacing flag can still be recorded as wrong, rather than awaited into a setup timeout. |
| Next bold action | Distinguishes released versus stuck replacement guards after success or rejection. Its expected source comes from the existing literal bold relation. |
| Native attempt receipt | Actual trusted textarea key or awaited native pointer command with actual hit-tested button; distinguishes a requested action from a target the host never received. |

No mutable semantic reducer is introduced. The two Escape bits are an
input/history projection; replacement checkpoints are direct input projections.
The code shares field-comparison plumbing but does not dispatch all three laws
through one model or driver. Each remains a separate `oracleProperty`.

Adjacent forms considered before implementation: (1) a single mixed browser
machine with picker/focus/restore states; (2) independent identity/layer/lifecycle
properties; (3) only direct synthetic gate calls. Form2 preserves the approved
law split and gives failures specific receiving checkpoints without inventing
cross-feature policies. Form1 would add state/ordering rules beyond this scope;
form3 cannot establish real picker/React/native receiving. No law or old
construction was removed to achieve this split.

## Grammar and ORC-004 controls

All leaves are primitive `fc.record`/`constantFrom` leaves; the Escape legal
union uses `fc.oneof`. There is no post-generation filter or `fc.pre`.

| Axis | Bounded domain / witness | Nearby excluded neighbor |
| --- | --- | --- |
| Ordinary body | 1–24 units selected from ASCII letters/digits/`. , ;`, Greek alpha and one astral emoji. UTF-16 lengths still determine DOM offsets. Emoji changes selection endpoints without introducing markup parsing. | Empty body or a newline is outside this specific receiving domain; broader valid-input oracles remain unchanged. |
| Viewport | Desktop and the existing small profile. Each receiving case is constructed on both; pointer visibility and picker panel layout differ. | Nonboolean `mobile` is rejected by the arbitrary. A profile is not a physical keyboard or Safari device. |
| Bracket key | Enter and Shift+Enter. The latter collides with hard-break formatting and distinguishes missing consumed-key handling; plain Enter is its nearby no-format neighbor. | Tab is rejected: the actual bracket picker does not consume Tab. Mention-picker Tab remains in the earlier interaction property. |
| Escape picker | None, bracket or mention. None exits on the first Escape; either picker consumes the first and leaves on the second. | Unknown picker names are rejected. |
| Escape typing | Bracket editor/panel; mention/none editor only. Panel delivers Escape through the actual picker search box; editor uses the textarea. | Mention/panel is rejected structurally; it is not generated then filtered. |
| Replacement outcome | Real successful response or controlled HTTP500 rejection. Success expects historical source; rejection expects working source and the specific visible error. Both then receive a real edit. | `timeout` is rejected. A missing response is host failure, not a third semantic outcome. |
| Replacement attempt | Six named keys B/I/K/Tab/Shift+Tab/Shift+Enter, or five structural/formula controls indent/outdent/break/code/formula. Keys and controls have distinct native delivery. | Bare Enter is not a formatting-key attempt; Escape is not a structural/formula control; mismatched kind/name combinations are rejected. |
| Picker before restore | None, actual bracket or actual mention; unfinished trigger remains at EOF through history and confirmation. This distinguishes mount gating from a page that never had a picker. | A closed token is not arranged as an open-picker history. Invalid names are rejected. |

The real restore has one further setup premise that is intentionally not a
generated semantic axis: create an item with `published + body`, publish it as
v1, then save a different working copy before loading the editor. Every legal
replacement history receives that arranged version; an unsuccessful setup
write/read throws a setup error. The restore request must actually name v1 and
settle with its arranged status. No expected source is read from its response.
This property does not judge publication/versioning semantics.

Reconstruction is explicit: bracket constructions cover both native keys on
both profiles (4); Escape constructions cover no picker, mention, bracket editor
and bracket panel on both profiles (8); replacement constructions cover each
of eleven attempts × two outcomes × two profiles (44), plus bracket/mention
entrances × two outcomes × two profiles (8), total52. All64 are generated-grammar
members. Each axis above has a differing observation, a receiving path or a
legality job; none supplies an expected answer through a construction name.

Static preflight admitted all64 using `canShrinkWithoutContext` and rejected:
bracket keyTab, mention/panel, replacement bare Enter, and replacement outcome
timeout. The original known histories remain fixed while implementing these
repairs. All three properties use runs25, fixed seed20261118 plus the framework's
random campaign; no budget increase is used to manufacture required reach.

## Source and receiving checkpoints

Bracket input is sampled once at the **first actual delegated formatter entry**,
before forwarding unchanged. Later handler calls cannot overwrite that input.
Only actual consumed and trusted native entry supplies the conditional law's
premise. The model accepts partial traces; its check returns pass on a missing
premise so the driver's setup error retains its classification. A capture-order
challenge is not an identity-law kill unless the consumed-input premise exists.

Escape waits for the actual native key and the next animation frame, then
records the view/picker/source/caret even when wrong. It never waits for picker
disappearance or a particular focus-active answer. `requestFullscreen` is
explicitly absent in this host. The source/limits say this proves DOM-delivered
Escape, not fullscreenchange, OS Escape or physical mobile behavior. Actual
native-fullscreen tests remain separate and are not removed.

Replacement records source/caret and picker presence both before opening history
and **inside the actual confirmation entrance before accepting it**. Bracket and
mention pickers have no blur-dismiss behavior: open predicates use source,
caret/trigger and dismissed state; history/confirmation/pane actions do not call
dismiss, and source plus the EOF caret are unchanged. Neither component reads
textarea readonly to close itself. Therefore keeping a mounted picker across
`replacing` should keep its DOM `.picker`, including hidden/inert nodes counted
behind a sheet. Registered mounted-picker challenges remain the runtime test
of this argument; no kill is claimed from source alone.

The held actual restore request establishes pending work. A real pane-handler
cycle establishes a React receiving render before both pending and settled
snapshots. Visible controls use controlled focus plus native Enter; desktop CSS
hides them, so desktop invokes the actual DOM button handler with `el.click()`. That is an
explicit controlled input, and each actual `data-pane` commit is recorded. It
does not force a readonly/source answer. After release, the independent restore
history action's busy→enabled receipt establishes operation completion. A stuck
`replacing` flag remains visible to the check.

Native key attempts record trusted keydown at the actual textarea. Disabled
control attempts use native pointer coordinates, after actual `elementFromPoint`
identifies that button. Disabled controls may suppress their click/pointer DOM
events; any emitted pointer receipt is diagnostic, and no synthetic click is
forced into a disabled formatting control. Missing native target receipt is a
setup premise failure, distinct from a wrong pending readonly/source observation.
Readonly focus remains diagnostic because unprevented browser shortcuts own
their focus result.

## Review repair ledger and evidence boundaries

The raw review was copied to
`/private/tmp/blygger-receiver-review-ledger.md` before repairs. The independent
versioned record is `receiver-expansion-review.md`.

- RCV-D1: key frame, independent action-busy settlement and actual pane commits
  replace waits for promised outcomes. Source repaired; runtime remains open.
- RCV-D2: explicit absent-fullscreen and actual consumed/trusted entry premises
  retained. Native-fullscreen evidence remains separate.
- RCV-S1: this record supplies reconstruction/ablation/range/exclusion without
  narrowing a grammar. Admission preflight is static evidence only.
- RCV-S2: hidden desktop controls now use their real DOM handlers, with declared
  controlled input and actual commit receipts. No actionability timeout is
  counted as a product failure.
- RCV-S3: confirmation-entry receipt plus the source argument above support the
  trigger premise; decisive mounted-picker mutant results remain open.

TypeScript and diff checks, independent source rereview, registered clean
campaigns, calibrations and all ten authored mutant outcomes are separate
receipts. At this writing no browser result, product bug or mutation kill is
claimed. Do not label this a completed gap audit until the parent records those
results and every new finding has a disposition.

## RCV-RUN-001 setup-selector repair — before rerun

The first `receivers-reviewed` attempt stopped after nine bracket readiness
timeouts. Parent preserved the failure rows in
`build/formatting-oracles/receivers-reviewed/preserved-setup/failures.json`
and raw JSONL, and appended the raw finding to
`/private/tmp/blygger-links-review-ledger.md` before this repair. The broad
`link picker` → role`option` → first locator selected the hidden native sort
option `newest`, rather than an actual search result. These are setup failures;
they supply no production RED or mutant-kill evidence.

The repair scopes readiness to the named `items` listbox before selecting its
first role`option`. Mention readiness is likewise scoped to the named `contacts`
listbox before its Alice button. The actual provider premises remain unchanged:
one valid search hit with the generated response's required page fields, one
valid contact with the generated contact fields, and the real search/contact
receiving components. `/search` and `/contacts` are ordinary GET routes outside
`READ_BATCH_PATHS`, so their existing exact-path provider interception reaches
the intended SDK requests. The panel searchbox is already scoped to the actual
link picker. No law, model, history, arbitrary, construction, budget or expected
answer changes. Static checks and independent source rereview precede the
parent's fresh browser campaign; the stopped attempt is never reused as GREEN.

## RCV-RUN-002 actual restore keyboard entrance — before rerun

The `receivers-listbox-reviewed` attempt reached the actual bracket and mention
restore entrances after the earlier bracket, Escape and ordinary restore cases
passed so far. Four picker restore histories then timed out before the restore
request: their actual listbox overlays intercepted native pointer clicks over
the history button. Parent stopped runner24215 (exit143), preserved raw JSONL
under `build/formatting-oracles/receivers-listbox-reviewed/preserved-pointer-setup`
and appended the raw finding to the scratch ledger before this repair. Those
rows have `verdicts:[]`; they are setup failures, not a product RED or kills.

The accepted-restore law does not require pointer clicks to pass through an
overlay. Its entrance now waits for the actual restore button to be visible,
requires enabled state, focuses that actual button as an explicit controlled
host input, then sends native Enter. A diagnostic receipt records the actual
focus/enabled premise and trusted keydown at that button. Missing receipt is a
setup error. The browser's actual button activation still opens the real
confirmation sheet and delivers the real POST after confirmation; no forced
pointer click or synthetic button click is used. The existing confirmation
receipt continues to require the unchanged working source, EOF caret and open
picker before acceptance. All picker constructions remain, and no semantic
model, law, history, random grammar, seed or budget changes. Independent source
rereview precedes the fresh registered browser campaign.

## RCV-ADJ-001 pane render-input overlay hypothesis — before rerun

Before starting the next campaign, parent identified the same pointer-overlay
mechanism on the visible mobile pane buttons: a keep-mounted picker mutant may
intercept their pointer click before `pending.pickers` can be sampled. The
independent reviewer preserved this source hypothesis as RCV-ADJ-001 before
repair. It is not an observed receiver mutant result and receives no kill or
product RED credit.

The pane cycle exists to establish an independent receiving render, not to
assert pointer-through-overlay behavior. Its visible actual buttons now require
enabled state, receive explicit controlled focus verified by activeElement,
then receive trusted native Enter at the actual button. Hidden desktop buttons
retain their explicitly controlled actual DOM handler input. Each receipt
retains the sampled input and actual requested `data-pane` commit. The same
preview→draft cycle runs before both pending and settled snapshots and never
waits for a promised readonly/control/picker/source answer. No picker/mobile
history, model, semantic law, construction, seed, budget or authored mutant is
changed. Missing native focus/key/commit is setup failure; the retained picker
must remain observable to the original pending law.

## RCV-RUN-003 disclosure entrance and adjacent pointer audit — before rerun

Parent stopped receiver run58222/session31078 (exit143) after history-summary
pointer setup failures. The final preserved snapshot has155 rows:146 pass,
9 fail, every failing row with `verdicts:[]`. Reviewer retained raw JSONL,
failures, state and input manifest under
`build/formatting-oracles/receivers-keyboard-reviewed/preserved-history-summary-setup`
before repair. Final JSONL SHA256:
`6307c73c266a39b20d37b98dfa2bf283efa984f85553b6b0e498355f37bdcaae`.
Earlier154-row/8-failure and153-row/7-failure snapshots remain incomplete
observations. These are setup failures, never production RED or mutant kills.

The actual `<summary>` owns the disclosure's native Enter behavior; Card's real
`onToggle` receives `details.open` and renders history. The repair uses the same
verified native Enter transport for visible summary, restore and pane controls:
wait visible, read/require enabled, controlled focus verified by activeElement,
then require trusted native Enter at that exact control. Summary activation
awaits the actual disclosure-open input before locating its real restore button.
No `details.open` assignment, forced click or fabricated history is used.

The remaining pointer entrances were audited in source before editing:

| Entrance | Concrete picker relation and disposition |
| --- | --- |
| Initial mobile draft-pane setup | **RCV-ADJ-002 source hypothesis:** a replacement page already loads working text with an unfinished picker trigger, so a picker may open before `open()`'s initial pointer click. Use the same verified native Enter transport and record it as initial pane input. This hypothesis is not an observed failure or kill. |
| Focus-view button | Escape histories load the independently arranged plain `initial` prose before the focus-view click; only a later fill adds the picker trigger. The body grammar has no bracket/@ characters. No open-picker pointer entrance exists at this action. |
| Restore confirmation OK | The actual Base UI Sheet is a Dialog.Portal with `.sheet` z61, above picker z40. Retain its actual native pointer click and confirmation source/caret/picker receipt. No source evidence of the same picker interception is identified. |
| Pending/settled pane receipt | Already uses verified native Enter for visible controls and the declared actual DOM handler when hidden (RCV-ADJ-001). No pointer entrance remains. |
| Disabled formatting-control attempt | Retain native pointer plus actual hit-test receipt: that is the accepted receiving path. A keep-mounted picker may intercept an arbitrary picker/control combination after `pending.pickers` has been recorded wrong. Independent reviewer checked pinned `oracle-property.ts:1727–1735`: check runs on partial trace and preserves a recorded-checkpoint violation over a later driver error. The replacement checker judges pending before the attempt premise, so the recorded pending rejection remains available; classify the actual mutant result and later cause honestly when run. Fixed mount histories use a native bold key. |
| Following bold edit | Uses controlled textarea focus and native keyboard, with no pointer dependency. |

The shared helper removes transport duplication without choosing semantic
answers. Confirmation/POST, all picker/mobile histories, semantic model/laws,
constructions, seed, budgets and ten authored mutants remain unchanged. Missing
focus/native key/disclosure/input commit is still a setup failure. Fresh direct
replay is a diagnostic subset and must not stand in for complete campaigns.

Supported direct diagnostic replay uses the package's default ORACLE prefix
(this config does not override it): `ORACLE_SEED=20261118`, `ORACLE_PATH=0`,
`ORACLE_PROPERTY=editor-browser-replacement-gates` and
`ORACLE_UNIT='random seed: bracket-success-true'`; a separate invocation sets
`ORACLE_UNIT='random seed: mention-success-true'`. Use the existing disposable
browser/application host environment and `vitest run --config
vitest.oracle.config.ts test-ui/editor-receivers.oracle.test.ts`. The package
requires all four variables, selects only that random unit and replays its one
constructed example at path0. Source inspected: `oracle-environment.ts`
readRunConfig and `oracle-property.ts` unit replay/runUnit, plus
`oracle-config.ts` withOracleFixedHistories. A pure framework control accepted
this environment and ran only its arranged example42 once at path0. This is
configuration evidence only, not a browser replay result or receiver-law test.
