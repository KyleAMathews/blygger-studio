# Independent interaction-oracle source review

2026-11-18, `/root/audit_completed_link_coverage`. Base
`28b0c8d642a87e5810ad6eabd95c2d1714c53396`; installed oracles pin `97a4e7a`.
Read pinned `oracles-review`, checklist v1 and glossary, the three interaction
oracle/model/driver files, `interactions-design.md`, `remaining-scope-review.md`,
the real formatter/authoring/HandlePicker paths and current source transport.
No browser jobs, campaigns, production probes or implementation edits were run
by this reviewer. Only this report was written. Findings are source-supported
oracle gaps or contract questions, not confirmed production defects or mutant
kills. Concurrent implementation changes need separate reviewed fingerprints.

## Verdict

The split into five small receiving properties is understandable and preserves
independent command expectations. Toolbar coverage is a useful strengthening.
The contact route and synchronous picker implementation support the intended
picker premise in the current source. Four findings prevent accepting the
broader native-navigation/scroll/picker/readonly claims without qualification.
No old-test removal or zero-gap closure is approved by this source review.

## Observation reconstructed without production

Take body `alpha😀`, tool `break`, selection `all`, activation `Enter`, desktop.
The plan supplies source `before alpha😀 after` and selection `[7,14]` because
the emoji occupies two UTF-16 units. The already-adopted hard-break law replaces
that ordinary selected body with backslash plus LF. The expected observation is
source `before \\\n after`, collapsed range `[9,9]`, and textarea focus. This
prediction comes from the adopted command law and input offsets, not the
production result.

The grammar admits the history and the constructed toolbar case supplies this
tool/activation/profile. `openEditor` loads the real full editor, fills its
controlled textarea, and the driver sets the input range. Focusing the actual
`md-break` button and pressing native Enter delivers the real React click
handler, which calls the delegated production command and transaction.
`snapshot` records textarea `.value`, both selection endpoints and
`activeElement` immediately afterwards. The check compares all three fields at
`delivered`, followed by production-page errors. No copied production
classifier or expected toolbar output is imported by the independent model.

## Findings

### INT-001 [P2]: Leaving the textarea does not establish native traversal

**Claim/authority:** The traversal law promises native forward/reverse form
navigation, not merely absence of textarea focus. See registration lines81–84,
driver lines67–73; adopted T4 and ORC-005/006/013 (checklist v1).

**Small legal witness / wrong design:** Either constructed off-list Tab
history, with a formatter changed to handle a declined Tab by
`event.preventDefault(); el.blur(); return`. The source and retained selection
remain correct and `focused:false` satisfies the entire current model. Native
form navigation was prevented. A handler that focuses the wrong control can
also satisfy the same observation. Neither the key's final `defaultPrevented`
nor its actual focused destination/direction is recorded here.

**Evidence status:** Source-supported enforcement gap; the proposed production
challenge has not been executed. The existing corrupt-trace calibration only
rejects a focus trap and cannot distinguish blur from native traversal.

**Repair/experiment:** Retain the real native key, record its event reference
and final prevention flag, and record the destination sufficiently to
distinguish ordinary native forward/reverse movement from body blur or an
app-forced target. Keep implementation freedom concerning the exact adjacent
control; a justified host baseline/allowed set is preferable to hardcoding
today's incidental toolbar layout. Require the prevented-blur challenge to
reach and fail the registered law. Do not call this closed solely because
`reverse` appears in plan-derived reach.

### INT-002 [P2]: Scroll receipt can pass without observing any focus call

**Claim/authority:** The scroll law promises zero actual page displacement at
the focus boundary, registration lines91–99 and driver lines84–96.
ORC-005/006/013/014 (checklist v1).

**Small legal witness / wrong design:** The native or fallback construction
already places an unfocused textarea below a scrolled viewport. A transaction
that performs ordinary focus via `HTMLElement.prototype.focus.call(el)` bypasses
the driver's instance `el.focus` wrapper. It can scroll the page while still
delivering the intended source/range/focus. `scrolls` remains `[]`, and
`[].every(...)` is true. The final snapshot contains no independently sampled
page position that rejects this bypass. The initial `actualOffset` proves only
the starting position.

**Evidence status:** Source-supported observation gap and explicit proposed
production challenge, not an executed survivor. Existing nonzero-delta
calibration does not test an absent receipt.

**Repair/experiment:** Require at least one acknowledged focus observation
(without imposing an unnecessary exact call count), and calibrate missing
receipt as well as nonzero displacement. If focus can legitimately use another
entry point, instrument the relevant host prototype boundary or otherwise
observe that call. Preserve the adopted freedom for later native caret-reveal
scrolling; a final whole-transaction scroll freeze would assert a different
law. Kill both ordinary-focus and observation-bypass challenges through this
registered property.

The `native` reach state is also plan-derived: `native:true` means the driver
did not force refusal, not that native insertion succeeded. Retain an actual
command outcome if citing this as accepted-native-versus-fallback evidence.
The focus promise itself happens before this branch; this note does not claim
the focus law requires two different expected source answers.

### INT-003 [P2]: Readonly model imposes focus outcomes absent from its law

**Claim/authority:** Readonly law promises preserved source/range and an
unprevented key. Its model at registration line73 additionally requires
`focused:true` for every non-Tab key. ORC-001/002 and preservation of contract
freedoms (checklist v1).

**Small legal witness / design consequence:** The constructed
`ControlOrMeta+k` readonly history leaves the event unprevented as promised.
In a browser host where that shortcut focuses native search/address UI,
correct formatter behavior may legitimately blur the textarea. A component
guard cannot both delegate the browser default and promise that every browser
default retains textarea focus. A headless host currently retaining focus
would be observed behavior, not authority for the extra requirement.

**Evidence status:** Contract/model mismatch read from source. No browser claim
about current campaign output or specific installed engine was made.

**Repair/experiment:** Judge the adopted input identity and actual prevention
at the readonly component boundary. Where a separate native-focus law applies,
derive its allowed result from a stated host contract or real-provider
witness, as traversal does. Keep focus diagnostic if its outcome is not
promised. Do not fix production to prevent an otherwise allowed browser
shortcut merely to satisfy the current Boolean model. The existing controlled
readonly premise is otherwise explicit and useful; it does not establish the
real replacement lifecycle or disabled-button coupling, which remain separate.

### INT-004 [P2]: Picker input sampling relies on listener topology remaining correct

**Claim/authority:** The model may read only formatter input, never formatter
output. Driver lines36–45 claims a later native target listener is that input
boundary. ORC-002/005/014 (checklist v1).

**Current-source assessment:** `HandlePicker` installs `navigate` on the
textarea in a React effect. It prevents Tab/Enter, computes a completion and
calls synchronous `setTextAt`/`flushSync`. The current formatter is React's
ancestor bubble listener. When that effect's target listener is already
installed before the oracle observer, the observer does read post-picker,
pre-formatter source/range. This is a legitimate component input, not a copied
expected completion. The controlled contact object matches `ContactSchema`;
`listContacts` is not opted into `READ_BATCH_PATHS`, so `/api/contacts` is an
applicable provider route rather than an accidentally unhandled batch request.

**Small distinguishing design consequence:** Move the app formatter delivery
to React capture. It now runs before the native target picker. The later
oracle observer is no longer pre-formatter input, but its model still treats
the captured source/range as input and can bless an effect that has already
occurred. A subsequent picker completion can overwrite an earlier wrong edit.
This receiving-order mutant is precisely the uncertainty that a real-picker
property should challenge. Separately, waiting for a visible picker proves
the DOM commit, not by itself the order in which passive native listener
registration and oracle registration completed. Sampling `prevented:false`
under a missed installation premise must not silently become proof of an
already-taken-key formatter violation.

**Evidence status:** Current ordering accepted from source, but topology
challenge and installation schedule remain proposed experiments; no actual
survivor or production race is claimed.

**Repair/experiment:** Record source/range and native prevention at the actual
delegated `onFormatKey` entry, before invoking it. This preserves input/output
independence even if the receiver moves, and proves which event state the
formatter actually received. Retain the real picker/native key. Classify an
undelivered consumed-key premise distinctly from an input-preserving law
failure, unless the adopted law explicitly includes picker delivery itself.
Run the capture-order receiver challenge and removal of the defaultPrevented
gate, verifying that both distinguish the intended receiving boundary rather
than just corrupting a final trace.

## Authoring receiver challenges after instrumentation

These are proposed challenges, not kills. Current interactions ownership names
formatter functions; selecting `--oracle interactions` still selects only
`format-shortcuts.ts`, even though the emerging receiver transport also supports
authoring source for other selected properties. Explicitly connect the new
receiver challenges to the real mutated app source and registered interaction
property before citing them.

| Wrong design | Distinguishing history / observation |
| --- | --- |
| Map formula toolbar button to code command | Actual formula Enter/Space; independent source and selected formula body |
| Treat outdent as indent | Existing nested-list outdent controls; source/range after native activation |
| Read textarea selection only after resetting it | Keyboard toolbar activation with partial selection; exact independent source/range |
| Move formatter from bubble to capture | Actual picker Tab or Shift+Enter; actual formatter-entry prevention plus postgate source/range |
| Remove formatter from textarea props | Ordinary editable formatting/structure receiving history, as well as picker guard controls |
| Prevent and blur declined Tab | Native forward/reverse traversal with final prevention and destination receipt (INT-001) |
| Omit readonly guard | Each readonly B/I/K/Tab/Shift+Tab/Shift+Enter history; identity plus actual prevention |
| Drop preventScroll or bypass observed focus method | Below-fold real geometry with nonempty focus receipt and per-call displacement (INT-002) |
| Omit React receipt while mutating only the textarea | Toolbar action followed by a real React rerender or same-item surface transition; local source alone is insufficient |

The readonly replacement-disabled toolbar mutation needs a held real
replacement-request history, which this controlled-flag property expressly
does not supply. Preserve that backlog rather than claiming it from these
checks. Contact completion spelling is also not judged merely because the real
picker supplies an already-prevented key.

## Grammar and loss assessment

The primitive input records admit ordinary bounded text, raw UTF-16 offsets
resolved at code-point boundaries, five toolbar tools, three activations,
whole/partial/caret ranges, two profiles, two picker keys, six readonly keys,
both traversal directions, and requested-native/forced-refusal scroll modes.
The design record explains each axis's contribution, bounds, invalid nearby
controls and alternatives. It reports a prior pure membership check of all54
constructions; this reviewer did not rerun it. Runtime reach and fixed/random
campaign results remain separate obligations.

These are one-action models; they introduce no new mutable semantic reducer
state. The picker source/range are boundary inputs to an identity law, not a
second semantic implementation of contacts. Reusing already-independent
command projections is appropriate. Future actual-contact-completion semantics
need their own authority and expectation; they must not be obtained from this
input sample.

The original removed formatting Playwright tests lacked real picker, readonly
replacement, scrolling, reverse traversal and toolbar Enter/Space assertions.
This work strengthens receiving paths rather than establishing a new loss
from those removed files. It does not authorize deleting unrelated contacts,
focus-view, image or PWA tests. Current remaining-scope document's statement
that native traversal and actual pre-formatter input are already established
should be read as design intent pending INT-001/004 and execution.

## Checklist outcome (checklist v1)

| ID | Source-review disposition |
| --- | --- |
| ORC-001 | Adopted T4 authority/name/login/date and explicit limits present. Readonly focus adds an unsupported promise (INT-003). |
| ORC-002 | Independent toolbar projections and identity laws accepted. Picker input remains conditional on INT-004's exact entry checkpoint. |
| ORC-003 | Law/model/history/driver/check distinguishable and prose useful. Qualify boundary/timing and native-mode descriptions with repairs. |
| ORC-004 | Primitive grammars, bounds, reconstruction/ablation/exclusion documented. No narrowing of existing properties observed. Pure membership receipt belongs to author; runtime evidence pending. |
| ORC-005 | Real buttons/React/native keys and real geometry used. Native traversal and focus receipt insufficient (INT-001/002); picker input checkpoint conditional (INT-004). |
| ORC-006 | Each property has a plausible corrupt-trace calibration. Production challenges and absent-focus/blur/capture-order calibrations pending; no kills claimed here. |
| ORC-007 | Fixed seed20261118 and random campaigns use same runs25, driver and check. Execution/direct replay receipts pending. |
| ORC-008 | Not triggered: no mutable stateful-model state introduced/combined/split. Primitive input distinctions have witnesses in design; no new transition reducer. |
| ORC-009 | Boundary input versus delivered output is explicitly named. Requested-native versus actually accepted native needs the noted qualification. |
| ORC-010 | Shared application driver preserves page errors/cleanup distinctions. Scroll synchronous errors are returned and command hook restored. No fault injection by this reviewer. |
| ORC-011 | Real geometry and real picker receiving paths are useful second boundary formulations; no new shared semantic fault needing another independent command model identified. Execution pending. |
| ORC-012 | This fingerprinted source review preserves findings and limits. No completed coverage or bug-class closure claim supported yet. |
| ORC-013 | Constructed control/key/profile/direction modes exist; native traversal and scroll need distinguishing wrong-design evidence. |
| ORC-014 | Contacts and readonly are controlled premises, real native key/focus supply receiver actions. Exact picker entry and actual focus receipt remain INT-002/004. Ordinary physical-device/replacement claims remain limited. |
| ORC-015 | Plan-derived states and all per-axis constructions registered. Actual campaign counts pending; plan flags do not prove native acceptance or listener ordering. |
| ORC-016 | oracleProperty registrations only; no ordinary unit examples in reviewed oracle files. |

## Reviewed SHA-256 snapshot

```text
52234bedffc1614e559107fa6a01ce367754b316e076db3e5c2d1da31b9da385 test-ui/editor-interactions.oracle.test.ts
3bee4b6c6d5334d6439182497e2da04d64c8ebdef064e6d4d537afa3a82aaee7 test-ui/editor-oracles/interaction-model-oracle.ts
46435853ce2e8a6d44b9c1e864b9a62fc49685e51879e61536607589fefd2532 test-ui/editor-oracles/interaction-driver-oracle.ts
c8134040f93bbe89b0f0053d25bd4e9296333eaf873aaf72a17b4e817c8d4c66 docs/editor-oracle-design/interactions-design.md
0b3367b44e3973d4fcba36c023e8e828b9e8ff54810defea753ba5ebd8c818ec docs/editor-oracle-design/remaining-scope-review.md
2c3740f27f9d76a920db631ff3035360ef606ad528b814b2876fdd51334ff0fb src/ui/contacts.tsx
d325e5b77249ae1367aae1818978964a0cc81d3f1e4eaed94c9e24826ab423dd src/ui/authoring.tsx
3da803515b024126d880c6d25db23f77145df1a41fccdbe4db650aa11427cb54 src/ui/format-shortcuts.ts
```

## Rereview: repaired interaction transport and checks

Independent source rereview by the same reviewer, 2026-11-18. Pinned review
skill, checklist v1 and glossary remain the review authority. The original raw
findings above are retained without editing or replacing their witnesses.
Read the repaired three source files and the six authored interaction
challenges. No browser job, implementation edit or campaign was run here.

### Raw findings retained before repair dispositions

1. **INT-001:** `focused:false` alone cannot distinguish native traversal from
   `preventDefault(); el.blur()`, nor the correct direction/recipient.
2. **INT-002:** empty `scrolls` satisfies `every`, and an ordinary prototype
   focus call bypasses the original instance observation.
3. **INT-003:** requiring non-Tab readonly focus retention adds an outcome
   absent from the law that deliberately leaves browser defaults unprevented.
4. **INT-004:** a later native target observer is formatter input only under
   the assumed listener topology; a capture receiver can run first.

These are the unchanged grounds for review. Proposed source repairs and their
acceptance below do not rewrite those original findings into retrospective
successes or claim unexecuted mutation kills.

### Source dispositions

**INT-001 repaired in source.** The driver supplies a native traversal control
with only the delegated formatter bypassed, then returns focus/range to the
same textarea and sends the same key through production. The control records
the actual native key event, final prevention, focused recipient identity and
its document direction. A same-page WeakMap gives identities without pinning
the oracle to a specific incidental toolbar button. The production delivery
must preserve input source/range, remain unprevented, and match that native
recipient/direction. The earlier prevented-blur design now disagrees on
prevention and recipient; the arbitrary-target design disagrees on prevention
and/or identity/direction.

The native control is a host input, not production's expected source edit.
This is an appropriate differential boundary: all app surroundings and the
native key remain, while the formatter alone is bypassed. The control cannot
be called a real native premise if it is prevented, retains textarea focus or
has no actual focused recipient. The driver throws a named missing-host-
premise failure in that case; the check deliberately does not manufacture a
formatter-law kill from missing premise data. This acceptance is bounded to
the current input/control boundary; production receiver mutations that break
that premise remain setup/unreached outcomes, not kills.

**INT-002 repaired in source.** The focus observer now wraps
`HTMLElement.prototype.focus`, so both the ordinary instance call and the
proposed prototype-call bypass cross the same observed host boundary. It
records real page coordinates before/after native focus on this textarea.
The check requires an array with at least one receipt and every receipt must
be a two-coordinate zero displacement. It permits more than one conforming
focus call. Both prototype and command hooks are restored in `finally`.
Native command names/results are recorded diagnostically. The executable
limits now correctly distinguish requested native editing from forced refusal,
without claiming that `native:true` proves acceptance. The law still permits
native editing to reveal the caret after the focus boundary.

**INT-003 repaired in source.** The readonly model predicts only source,
selection and `prevented:false`. The driver still records focus as a useful
diagnostic; the check projects only promised fields. This restores a contract
freedom that the earlier model accidentally removed. It is not model hacking
to match production: the reason is the independently stated law's delegation
of unprevented shortcuts to the browser. Source/range and key prevention
remain protected for all six constructed keys and both profiles.

**INT-004 repaired in source.** The transparent wrapper now samples source,
selection, React prevention and native prevention at actual delegated
`onFormatKey` entry, then forwards the exact original call. It no longer
depends on the oracle listener running after a picker target effect. The
real picker still receives the controlled valid contact response and actual
native Tab/Shift+Enter. A capture-order change is visible as the actual
unconsumed formatter entry; it cannot be used as an input sample taken after
the formatter's answer. Wrapper restoration is in `finally`.

The driver requires both prevention facts before emitting the promised final
checkpoint. A missing entry/unconsumed input is a named setup-premise failure,
not a formatter-law violation; the check's conditional identity law mirrors
that separation. This proves source-level input independence. It does **not**
by itself prove a law kill of a capture-order mutation in the authoring
receiver. Preserve that receiving-order obligation if claiming that actual
picker-first integration, rather than only the consumed-key gate, is fully
protected. No picker completion spelling or persistence law was added here.

### Grammar, reach and calibration audit

The history/model file is byte-identical to the first review. No generator,
filter, bound, fixed seed, construction or budget was reduced. All54 previously
admitted constructions remain: toolbar32, picker4, readonly12, traversal4,
scroll2. Each property still has fixed seed20261118 plus framework-random
campaigns at25 runs. Each named state has a construction; tool/activation/
profile/range/key/direction/mode distinctions keep the previously documented
jobs. The actual picker and traversal host premises are additionally required
by their successful drivers, even though reach labels remain plan-derived.
The native/fallback scroll state names are now explicitly requested host modes,
not a claim that native accepted the command.

There are now **eight** calibrations, all routed through their property model,
driver and check, with no standalone example expectations:

| Property | Wrong observation checked | Source audit |
| --- | --- | --- |
| Toolbar | Correct source but focus remains on button | Retained, complete delivered comparison rejects it |
| Picker | Source changes after a consumed entry | Retained, valid consumed input makes identity check reject it |
| Readonly | Source edited | Retained, promised-field projection still rejects it |
| Traversal | Focus trapped in textarea | Retained |
| Traversal | Prevented key merely blurs | Added; prevention and actual recipient distinguish it |
| Traversal | Different recipient/direction | Added; native-control identity/direction distinguish it |
| Scroll | Nonzero page displacement at focus | Retained |
| Scroll | Empty focus receipt list | Added; explicit nonempty requirement rejects it |

Calibration source presence and logical rejection are accepted here. Execution
success is a separate receipt. The six authored production challenges are
ordinary-focus scrolling, prototype-focus scrolling, prevented-blur traversal,
wrong-recipient traversal, removal of readonly guard and removal of the
already-prevented-key guard. Their definitions match the source uncertainties
above, and they target formatter code that current browser transport delegates.
Do not count setup errors or missing native premises as kills; the final
report must name the registered law/checkpoint and reproducible route for
each assertion kill.

### Execution and documentation status at this source snapshot

The parent reports the current browser campaign passed195 baseline checks
twice; its live stream says `progress unmutated: 195 tests` with zero
nondeterminism. Mutation phase is still running at this review snapshot.
No completed report was available for this rereview, so **no final kill or
zero-gap count is claimed here**. Exact campaign outcomes will be appended
when supplied or read from final artifacts.

The initial `interactions-design.md` deliberately records its preimplementation
design, but still describes the old later target observer and does not record
the native traversal control or prototype focus receipt. Append a dated
transport-repair design note so readers can identify which statements are
historical and which describe current evidence. Its original law authority,
grammar controls, state-minimality discussion and alternatives remain useful.
The remaining-scope record likewise needs final execution/provenance
reconciliation before a completed receiving-coverage claim.

### Updated checklist disposition (checklist v1)

| ID | Repaired-source outcome and remaining evidence |
| --- | --- |
| ORC-001 | Adopted source/range/guard/focus authority retained; unsupported readonly focus promise removed for a contract reason; host/physical-device limits explicit. |
| ORC-002 | Command models remain independent. Picker records actual function inputs before forwarding; traversal control supplies host identity/direction only. |
| ORC-003 | Executable prose updated with current boundary and diagnostic fields. Historical design record needs the dated transport addendum above. |
| ORC-004 | Original54 constructions and primitive grammars unchanged; controls/bounds retained; no quiet filtering or exclusion introduced. Missing host premises throw separately rather than creating green product comparisons. |
| ORC-005 | Actual UI buttons, readonly React key listener, real picker, actual delegated entry, native traversal control and real focus geometry now have the required source observations. Final mutations/receiving-order transport still need execution evidence. |
| ORC-006 | Eight calibrations and six targeted production challenges reviewed. Final per-challenge assertion/setup/runtime/unreached/survivor outcomes pending. |
| ORC-007 | Same fixed/random budgets/seeds retained; parent baseline/repeat reported195 each; final replay routes pending. |
| ORC-008 | Not triggered: no new mutable stateful semantic model or state merge/split. Driver-local control/WeakMap bookkeeping is host transport with a clear distinguishing purpose. |
| ORC-009 | Actual picker-entry input, host traversal recipient and product delivery mapped explicitly. Requested native mode is distinguished from diagnostic command result. |
| ORC-010 | Hooks restored in finally; shared application host retains page errors and cleanup diagnostics. No cleanup-failure injection by this reviewer; preserve original action error if restoration itself fails. |
| ORC-011 | Actual native focus control and prototype geometry supply meaningfully different receiving formulations of the earlier synthetic gates/focus-option check. No additional shared semantic command fault identified. |
| ORC-012 | Raw findings kept above, repaired source fingerprinted, execution claims separated. Final campaign and receiver-order scope remain obligations; no closure claim yet. |
| ORC-013 | Existing legal histories now distinguish native navigation from blur/wrong target, focus displacement from zero/no receipt, readonly edits and postpicker edits. Production rejection evidence pending. |
| ORC-014 | Actual native input/focus supplies host observations; controlled contact and readonly premise boundaries remain explicit. Missing consumed-key/native-recipient premise is setup, not an assertion kill. |
| ORC-015 | Required constructions/state names and budgets retained. Parent baseline/repeat reports successful runtime reach. Source plan flags alone are not cited as actual native-command acceptance. |
| ORC-016 | All source checks/calibrations remain in oracleProperty registrations; no ordinary unit tests introduced. |

### Repaired-source fingerprints

```text
9fdd3e7ba30cd1013cbae3ff1893136406196194390863ad52b455f252e5e012 test-ui/editor-interactions.oracle.test.ts
3bee4b6c6d5334d6439182497e2da04d64c8ebdef064e6d4d537afa3a82aaee7 test-ui/editor-oracles/interaction-model-oracle.ts
d7561511ce4585c707f9f73c0188f1b6b04b1cf5fa6205bc0fe2acc9061431b6 test-ui/editor-oracles/interaction-driver-oracle.ts
c8134040f93bbe89b0f0053d25bd4e9296333eaf873aaf72a17b4e817c8d4c66 docs/editor-oracle-design/interactions-design.md
0b3367b44e3973d4fcba36c023e8e828b9e8ff54810defea753ba5ebd8c818ec docs/editor-oracle-design/remaining-scope-review.md
```

## Final targeted execution receipt

Independent artifact review, 2026-11-18. Read the completed parent-run
`build/formatting-oracles/interactions-reviewed/results.json`, `summary.md`,
`stream.log`, and retained `test-output.log`, then reread each selected mutant
definition and its owning registered property. No job was launched here.
The parent confirms no intended production edits since this review handoff;
a CommonMark fence repair occurred shortly before/around the interaction
launch, and exact prelaunch source attestation is unavailable. This is an
explicit evidence limit, not a reason to invent a matching prelaunch hash.

**Run `fcf5d695e2eb`: accepted as a completed selected-challenge result.** Its
baseline is nonprovisional with195 passed, zero failed/skipped. The stream
reports the two unmutated executions at143.7s and144.4s with zero
nondeterminism. Options name fixed seed20261118, current oracle config and
two contexts; the registered properties supply their matching unseeded
campaigns. No ordinary test file, exclusion or nondeterministic registration
is credited. The retained output reports constructed/generated reach for
all five properties and both fixed/random campaigns. The model/history
fingerprint remains unchanged from the initial review.

### Each selected outcome is a registered assertion kill

All six results have `outcome:'killed'`, a nonempty registered `laws` array
and the fixed-seed route below. None is recorded as timeout, setup failure,
runtime crash, unreached path or survivor. The run reports zero production
crashes. The metadata's `randomAlso:false` means the credited reproducible
route is the named fixed route; it does not mean random campaigns were
removed. These are assertion kills as classified by the pinned framework,
not merely failed shell processes.

| Authored ID (`src/ui/format-shortcuts.ts#authored:` prefix) | Registered route | First rejecting law | Distinction verified against checker source |
| --- | --- | --- | --- |
| `interaction-focus-scroll` | `editor-browser-focus-scroll > fixed seed 20261118: native` | `focus preserves page scroll` | Ordinary native focus crosses prototype receipt and moves page instead of zero displacement |
| `interaction-prototype-focus-scroll` | `editor-browser-focus-scroll > fixed seed 20261118: native` | `focus preserves page scroll` | Prototype-level ordinary focus no longer bypasses the actual receipt and zero-displacement check |
| `interaction-prevent-blur-traversal` | `editor-browser-focus-traversal > fixed seed 20261118: false-false` | `off-list native focus navigation` | Prevented blur disagrees with unprevented native control and its actual focused recipient |
| `interaction-wrong-recipient-traversal` | `editor-browser-focus-traversal > fixed seed 20261118: false-false` | `off-list native focus navigation` | Forced app target/prevention disagrees with real native recipient/direction |
| `interaction-readonly-gate` | `editor-browser-readonly-gate > fixed seed 20261118: ControlOrMeta+b-false` | `readonly formatter gate` | Removing readonly guard attempts formatting/prevention instead of input identity and native delegation |
| `interaction-picker-consumed-gate` | `editor-browser-picker-gate > fixed seed 20261118: Tab-false` | `actual picker formatter gate` | Removing prevention guard lets formatter edit the actual already-consumed entry source/range |

The retained report gives law and route classification, not the raw observed
scroll deltas or complete comparison payload. Temporary capture JSONL paths
in `state.json` no longer exist after cleanup. This reviewer therefore does
not invent exact delta/caret values or claim a separately replayed failure.
The production challenge definitions plus their registered assertion metadata
and inspected check establish the supported distinctions above. A future
debugging need for exact payloads would require a direct framework replay.

The `summary.md` says zero gaps for these **six selected authored mutants**.
It is not a full automatic gap campaign, an exhaustive proof over authoring
receiver paths, or evidence of a killed capture-order receiver mutation.
The broader remaining-scope limits from the source review stay explicit.

### Review disposition after execution

INT-001 and INT-002 have repaired observations, added calibrations and actual
wrong-design assertion kills at their promised checkpoints. INT-003 restores
the adopted readonly contract's freedom, and the substantive readonly guard
is distinguished by an actual source/prevention challenge. INT-004's actual
entry observation preserves independent judgment, and removal of the
already-prevented-key gate is rejected with a real picker-supplied input.
These four bounded findings are accepted as addressed by source plus the
recorded selected-run evidence.

The design documentation obligation is now addressed by a dated addendum
to `interactions-design.md`, preserving the earlier raw design text and
describing actual entry sampling, same-page native control, prototype focus
receipt, readonly freedom and selected-run limits. No oracle, production,
browser or history source was edited during this evidence pass.

Checklist updates: ORC-006 now has six genuine registered assertion outcomes;
ORC-007 has completed fixed/random baseline and repeat evidence with named
replay routes; ORC-013 has executed distinguishing challenges for the reviewed
native/guard boundaries; ORC-015 has completed required constructed/generated
reach in the successful campaigns. ORC-003's transport documentation addendum
is present. Other source dispositions in the preceding full matrix remain.
ORC-008 remains inapplicable because no mutable semantic reducer state was
introduced. ORC-012 still requires the planned full campaign to bind a frozen
current production snapshot; it must not silently convert postrun hashes into
prelaunch evidence. No unrelated old-test deletion is approved here.

### Current postrun fingerprints and retained evidence

Oracle/model/driver hashes equal the accepted repaired-source review. The
production hash below is explicitly **postrun**; its difference from the
earlier `3da803...` source snapshot is not treated as proof of the run's
prelaunch source. The planned frozen-source full run will supply that stronger
binding. Source transport hashes are recorded to make the present checkout
reviewable; this receipt does not retrospectively attest their prelaunch
contents either.

```text
9fdd3e7ba30cd1013cbae3ff1893136406196194390863ad52b455f252e5e012 test-ui/editor-interactions.oracle.test.ts
3bee4b6c6d5334d6439182497e2da04d64c8ebdef064e6d4d537afa3a82aaee7 test-ui/editor-oracles/interaction-model-oracle.ts
d7561511ce4585c707f9f73c0188f1b6b04b1cf5fa6205bc0fe2acc9061431b6 test-ui/editor-oracles/interaction-driver-oracle.ts
7b30f54e51005b02057c213fa0dcdea016b5549672452960eaa317b0c561d9b7 test-ui/editor-oracles/application-driver-oracle.ts
b0ca432cf84f1dcfb60ac5e0e9052d2f3eb524e0594be9a5e158a3e7d620562f test-ui/editor-oracles/browser-driver-oracle.ts
f429151f9bfa87b1de9ff19614c6ed063acc0d90cd33cf34be2c62c5d458a3e8 test-ui/editor-oracles/browser-source-oracle.ts
b396bab5be6aa6d922aa4c9f8a0172253a92c08895770021f1f46b777965545a scripts/formatting-oracles.ts
99b5a301aebc22699eed02c0c11781b0268bd2227fc59394dc5fcbe77f46e03c scripts/formatting-oracle-application.ts
d325e5b77249ae1367aae1818978964a0cc81d3f1e4eaed94c9e24826ab423dd src/ui/authoring.tsx
c4a34e5d1faa4c94df876f45577e3f173fc83267a4851c078f523406d5ccc967 src/ui/format-shortcuts.ts
c1271e0b9b80437b4977eca67a88f38243f712691116181ea52390f27b2ced31 build/formatting-oracles/interactions-reviewed/results.json
0bbaf9a6061ecda1214a0c3ea533e4abe5dcb3359de2ffe7756230179ce5b439 build/formatting-oracles/interactions-reviewed/summary.md
93d4a7175f41ade013cc72133f78d3e823e2947e7c5f7c39418b9ac8b9f8d026 build/formatting-oracles/interactions-reviewed/stream.log
d215a64ce7ad4cc16910c474c67add35ea5f9642c91be7f4e055c389027f2cb7 build/formatting-oracles/interactions-reviewed/test-output.log
aca082bfccb8aac23fe33016d8487ecb22dcbd5b0335bb959dc262a64ce0e971 docs/editor-oracle-design/interactions-design.md (dated repair addendum included)
```

## Firefox targeted interaction execution

Independent artifact review, 2026-11-18. Read the parent's completed
`build/formatting-oracles/interactions-firefox-final` report, stream, state
and retained test output. No source or browser operation was performed here;
only this review was appended. Firefox attribution comes from the parent's
launch/engine report and the runner's inspected engine dispatch; the gap
report itself does not embed an independent engine/version receipt. The
directory name alone is not treated as evidence of engine identity.

**Run `e73ef476d793`: accepted as the reported Firefox selected-challenge
result.** The report is nonprovisional:195 baseline checks passed, zero
failed/skipped and zero nondeterminism. The stream independently confirms
two unmutated executions at220.4s and213.7s. The same five registered
properties run their fixed-seed and unseeded campaigns; retained output
includes both viewports and the constructed/generated reach. Oracle,
history/model and driver fingerprints match the preceding accepted source
snapshot, and the formatter hash matches its preceding postrun snapshot.

All six selected mutant outcomes are `killed` with nonempty registered `laws`
and fixed-seed routes, exactly matching the preceding Chromium receipt:

| Authored challenge | Registered assertion credited |
| --- | --- |
| Ordinary focus scrolling | `editor-browser-focus-scroll > fixed seed 20261118: native` / `focus preserves page scroll` |
| Prototype focus scrolling | Same focus-scroll route/law |
| Prevented-blur traversal | `editor-browser-focus-traversal > fixed seed 20261118: false-false` / `off-list native focus navigation` |
| Wrong-recipient traversal | Same focus-traversal route/law |
| Removed readonly guard | `editor-browser-readonly-gate > fixed seed 20261118: ControlOrMeta+b-false` / `readonly formatter gate` |
| Removed consumed-key guard | `editor-browser-picker-gate > fixed seed 20261118: Tab-false` / `actual picker formatter gate` |

No timeout, setup failure, runtime crash, unreached path or survivor is
credited as a kill. There are zero ordinary test files, excluded results,
reported production crashes or reported gaps **among these six selected
challenges**. Raw comparison payloads are not retained in the summary, so
the same framework-classification versus exact-payload qualification from
the preceding receipt applies. No exact scroll delta or newly replayed
counterexample is invented here.

The authoring UI-error patch was applied **after the fixed app bundle for
this run had launched**, according to the parent. `--oracle interactions`
uses the fixed receiving bundle rather than the separately instrumented
authoring receiver selection. Consequently this result does not establish
that newer authoring patch, new receiver laws, all editor properties or the
current whole-checkout state. The current authoring hash below is explicitly
a postrun snapshot and differs from the bundle used by this run. The full
combined current-source Chromium campaign is still pending.

Firefox's small-viewport profile is responsive-layout/browser-input evidence.
The inspected profile helper supplies viewport and touch settings and does
not emulate iOS or Android native keyboards. These results establish no
physical-mobile-OS, ordinary Safari, OS permission UI, arbitrary contact
completion, replacement lifecycle or authoring listener-capture-order law.
The original INT-001–004 source repairs now have the corresponding bounded
Firefox receiving/challenge result, without expanding their adopted limits.

Checklist delta: ORC-006/007/013/015 have this second engine's selected
registered assertion, campaign/repeat and reach evidence. ORC-014's host
claim remains Firefox browser plus the explicit controlled premises and
responsive profiles. ORC-012 still requires the pending final frozen-source
combined run before a whole-current-checkout claim. Other checklist
dispositions and the no-unrelated-test-deletion boundary remain unchanged.

Postrun source and retained Firefox-artifact SHA-256:

```text
9fdd3e7ba30cd1013cbae3ff1893136406196194390863ad52b455f252e5e012 test-ui/editor-interactions.oracle.test.ts
3bee4b6c6d5334d6439182497e2da04d64c8ebdef064e6d4d537afa3a82aaee7 test-ui/editor-oracles/interaction-model-oracle.ts
d7561511ce4585c707f9f73c0188f1b6b04b1cf5fa6205bc0fe2acc9061431b6 test-ui/editor-oracles/interaction-driver-oracle.ts
c4a34e5d1faa4c94df876f45577e3f173fc83267a4851c078f523406d5ccc967 src/ui/format-shortcuts.ts
863d35404d85e06f3c093f46cc1a6c73b369ea49c22fd00ac4fc954af47d8bc6 src/ui/authoring.tsx (newer postlaunch UI-error patch; not the fixed bundle under test)
fbe71f5f662557d918dcd26d01f91d2bf0d5e6ca51012678c1248a1448b52047 build/formatting-oracles/interactions-firefox-final/results.json
f0de4f46dda37da380ccb226b3680976ad792c39eefd9ca7deac4d5761d07e85 build/formatting-oracles/interactions-firefox-final/summary.md
06b5c74c537461902186e94ce161f711d135c9724627080ab4108cc981ec3ab9 build/formatting-oracles/interactions-firefox-final/stream.log
7f85fdbdd8dd8d7852b008d5023316075736658eef319c73256d45051eb11a30 build/formatting-oracles/interactions-firefox-final/test-output.log
```
