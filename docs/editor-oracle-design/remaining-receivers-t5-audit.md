# Remaining receiving boundaries and existing Markdown audit

2026-11-18, `/root/audit_focus_and_remaining_scope`, base
`28b0c8d642a87e5810ad6eabd95c2d1714c53396` plus uncommitted work. Uses the
pinned `97a4e7a` oracles-design, glossary, design grammar and evaluate-review
instructions. This is the requested source/probe audit before implementation.
No browser campaigns, production changes, shared-harness changes or new oracle
registrations were made for this audit.

The adopted expansion of T4 covers real picker precedence, readonly state,
focus and selection. The existing tests below supply concrete observations;
the user approved preserving existing behavior and all oracle work. These
receiving additions strengthen those adopted promises. They do not specify new
Markdown features. T5 requires a distinction: literal source transformations
already have laws; interpreting an enclosing Markdown node is a different
promise that has not been chosen.

## BRACKET-001: actual bracket picker to formatter delivery

**Status:** source-confirmed missing receiving construction; within adopted T4.

`BracketPicker.navigate` in `src/ui/picker.tsx:118` prevents native Enter and
then performs a synchronous `setTextAt` insertion. Its actual textarea listener
is installed at `picker.tsx:139`. It handles **Enter, not Tab**. A bracket-picker
Tab history must not be mislabeled picker-consumed merely because the mention
picker consumes Tab. `Shift+Enter` is the distinguishing formatter collision:
it is Enter to the picker and a hard-break command to the formatter when not
already consumed. Plain Enter is a useful neighbor but would not expose a
missing `defaultPrevented` formatter guard by itself.

Proposed added constructions, on both viewport profiles:

```text
settings.pickerTyping = editor
source = "- parent\n- [[needle"
caret = source.length
controlled search hits = one ordinary own fragment, label "Found prose"
native key = Shift+Enter                     # distinguishing consumed key
native key = Enter                           # nearby consumed no-format key
```

Use a valid ordinary link hit, not a protocol source/transclusion fixture:

```json
{
  "id": "oracle-bracket-hit",
  "excerpt": "Found prose",
  "label": "Found prose",
  "version": 1,
  "updated": "2026-11-18T00:00:00Z",
  "badge": "",
  "source": "mine",
  "kind": "fragment",
  "subscriptionId": null,
  "sourceTitle": null
}
```

The `/api/search` response also needs `page:{limit:20,nextCursor:null}`. Search
is not in `READ_BATCH_PATHS`; `useSearch` first reads changes and validates the
search response using `zSearchResponse`. Control only the search result and
settings; preserve actual changes delivery and actual picker/listener actions.
Use per-page valid settings responses or a disposable settings write, not a
persisting change on a shared node. Search delay is not a reason for a sleep:
await the actual visible result and entry receipt.

**Reused law:** for every key already consumed by an actual picker when
`onFormatKey` receives it, the formatter preserves its entry source/range.
Textarea focus after the picker selection is retained under the existing
picker-input case. The transparent delegated-entry wrapper from INT-004 can
record entry source/range and both prevention flags before forwarding.
Expected output is identity of that input, never a captured expected picker
completion. No consumed entry is a setup/premise failure, not a formatter-law
kill. This property does not claim the picked id/label was the correct hit;
picker completion has its own semantics and tests.

**Distinguishing challenge:** remove only the formatter's `defaultPrevented`
guard. Actual `Shift+Enter` should then mutate the post-picker source by a
hard break. Plain Enter and no-hit Escape preserve useful neighbors. A
receiver capture-order challenge must be classified at the receiving premise;
it must not be credited as an identity-law kill when the formatter never
received an already-consumed event.

**Old observations:** retained `e2e/picker.spec.ts:28–70` checks real native
arrows/Enter insertion, panel close, and Escape retaining exact unfinished
source. It does not use Shift+Enter or observe formatter entry. The two removed
formatting Playwright files do not supply a bracket-picker observation. Keep
the broader picker suite: filtering, ordering, typing mode and layout are not
replaced by this gate property.

## FOCUS-001: Escape consumes one open layer

**Status:** explicit existing behavior and missing generated oracle; within
adopted T4. This is a separate law/property from formatter gate identity.

`useFocusView` in `authoring.tsx:1857` explicitly leaves already-prevented Escape
to the picker. `e2e/focus-view.spec.ts:149–161` observes picker closed and focus
view retained after the first Escape, then focus view exited after the second.
`picker.spec.ts:63–69` supplies exact source preservation when dismissing a
bracket picker. `HandlePicker` similarly prevents Escape at
`contacts.tsx:246`.

**Reused law:** for every generated focus-view history with an unfinished
picker input and collapsed caret, the first DOM-delivered Escape dismisses only
that picker and preserves source/caret; a second DOM-delivered Escape with no
picker leaves focus view and preserves source/caret. An Escape
outside focus view preserves the inactive view. The exact text/caret retention
at an ordinary focus-view exit is already observed by
`focus-view.spec.ts:90–106`.

Proposed primitive grammar:

```text
mobile: boolean
picker: none | bracket | mention
body: ordinary printable prose, 1–24 code points including α/😀
typing: editor | panel  # bracket only; panel uses native search-box delivery
actions: enter focus → open selected picker at final caret → Escape → Escape
```

Construct every picker/profile and bracket typing mode. Include `none` as the
neighbor: its first Escape exits. Record after every key: `.editor.is-focus`,
picker presence, source, both selection endpoints and active element as a
diagnostic. For the first picker Escape the expected source/range is the plan's
unfinished input; no lookup/completion result is needed. Wait for the actual
picker disappearance and focus-view state rather than an arbitrary timer.
Panel-mode return to textarea is after `requestAnimationFrame`; await the
promised return rather than sampling the key before it settles.

**Independent model:** a two-bit view (`focusActive`, `pickerOpen`) plus input
text/range constants; Escape clears picker first, otherwise clears active view.
An action list suffices; no model of the production focus hook is needed. The
picker bit distinguishes the same Escape's two outcomes, and the second key
is its continuation witness. Separate scope from scroll-centering, controls
fade, visual viewport and fullscreen visit races.

**Challenges:** ignore `defaultPrevented` in focus-view Escape handling; omit
picker Escape prevention; toggle focus view twice; discard source/range on
exit. Existing formatter-gate checks alone cannot establish these layers.

**Fullscreen boundary:** `focus-view.spec.ts:205–230` separately observes actual
fullscreen enter/exit and a host exit while a picker is open. The source's
`fullscreenchange` guard at `authoring.tsx:1911` retains focus view while a
picker/sheet is open. A controlled missing Fullscreen API can establish the DOM
Escape route but cannot replace actual native-fullscreen evidence. If one
property includes native fullscreen, declare provider availability as a host
premise and keep its event observations distinct. Do not claim physical Safari
Escape or mobile hardware from a viewport setting. The retained fullscreen
tests should remain until all their separate observations have oracle routes.

## REPLACE-001: readonly during the real replacement lifecycle

**Status:** source-confirmed receiving gap; within adopted T4 and existing
replacement/navigation behavior. Controlled `el.readOnly=true` alone proves
neither the React lifecycle nor disabled-toolbar coupling.

`restore` clears the save timer and calls `setReplacing(true)` before awaiting
the write (`authoring.tsx:2085–2095`). Its `finally` releases the state even on
failure. During that state, the real textarea receives `readOnly={replacing}`
(`authoring.tsx:2514`), formatting buttons receive `disabled={replacing}`
(`2488`), the shared tool row receives the same flag (`2440`), and actual
pickers are absent (`2524–2532`). `discardDraft` uses the same pending state but
success removes the editor, so it has a different completion checkpoint.

**Reused law:** while an accepted replacement request is pending, native
formatting keys and disabled formatting controls cannot change the working
source/range; the textarea is readonly, formatting controls disabled and
pickers unavailable. When restore succeeds, the editor receives the restored
source and becomes editable; when it fails, the held source remains and editing
becomes available again. Final replacement caret geometry is not specified:
do not invent selection retention across replacing the entire document.

Proposed constructions:

```text
profile = desktop | mobile
initial saved version = "published α😀"
working source = "- parent\n    - child α😀" # select child body
action = actual history restore + actual confirmation
hold POST /api/items/:id/restore before forwarding
attempt = Ctrl/Cmd+B | I | K | Tab | Shift+Tab | Shift+Enter
attempt = native pointer activation of each disabled md-* formatting button
result = allow real successful response | controlled 500 rejection
```

Construct every key, every supported structural/formula control and both
outcomes/profiles. Native pointer coordinates can attempt a disabled control;
Playwright's normal `locator.click` intentionally waits for enablement and
would turn this premise into a setup timeout. Observe the actual disabled
attributes as well as identity source/range. Do not forcibly dispatch a click
into a disabled control and call it native delivery. Readonly browser shortcuts
may own focus, so focus is diagnostic here too.

Hold and release the actual request using deferred promises and drain every
intercepted task. `createDraftAction` performs a GET after successful restore
and checks the returned revision (`data.ts:570–575`); wait for that real final
response and the editor's receipt. Inspect `readOnly`, disabled controls and
picker absence at the pending checkpoint, not merely API interception. On
release, observe result source and enabled editing, then make an adopted
formatting edit to prove that the guard was released. Success source comes
from the independently arranged historical version, not the restore response.
For rejection, record the controlled error banner, retained pre-request source,
and successful next formatting receipt. Clear/acknowledge any setup autosave
before entering the held restore so an unrelated earlier save is not mistaken
for a forbidden pending write.

A second held-discard constructor can reject the actual DELETE to observe
recovery through that entrance to the same readonly state. Successful discard
has the existing navigation/deletion contract, not a surviving-textarea law.
Do not expand this formatting task into kind-switching, uploads or publication
semantics merely because other controls occur in the same row.

**Challenges:** remove `readOnly={replacing}`; remove a specific formatting
button's disabled gate; leave replacing true after a rejected restore; re-enable
it before the request settles; keep one picker mounted during replacement.
The pending checkpoint catches these before a later successful replacement
can overwrite and hide a wrong intermediate edit.

**Old observations:** `test-ui/authoring-revision-session.test.ts:196–225` checks
the synchronous navigation gate while restore is pending, no queued old-text
autosave, success receipt and failure release. It does not render readonly or
the toolbar. `e2e/studio.spec.ts:64–92` observes successful restoration of an
empty publication, restored source empty, dirty false, version unchanged, then
fork behavior. `e2e/parity.spec.ts:56–68` observes restored source and public
version. None can be deleted on the strength of readonly formatting alone;
retain all non-formatting restoration/publication assertions.

## T5-RAW-001: deterministic existing-markup source witnesses

**Status:** current single-line grammar admits the researched inline cases,
but constructed reach does not guarantee them. Strengthening existing raw
source laws can proceed without adopting syntax-aware behavior.

The six source-calculation probes in
`/private/tmp/editor-remaining-t5-source-probes.json` all pass the existing
`emphasisArbitrary.canShrinkWithoutContext` check and match its independent
model. These Node probes are research, not browser oracle execution. Exact
source/selection predictions from the adopted star-run model are:

| Existing source; selected interval | Command | Expected raw result; selected interval |
| --- | --- | --- |
| `\*word*`; `[2,6]` | Italic | `\word`; `[1,5]` |
| `_word_`; `[1,5]` | Italic | `_*word*_`; `[2,6]` |
| `` `word` ``; `[1,5]` | Bold | `` `**word**` ``; `[3,7]` |
| `[word](https://example.com)`; `[1,5]` | Bold | `[**word**](https://example.com)`; `[3,7]` |
| `[label](https://word.example)`; `[16,20]` | Bold | `[label](https://**word**.example)`; `[18,22]` |
| `alpha-word-omega`; `[5,11]` | Bold | `alpha**-word-**omega`; `[7,13]` |

These are not proposed feature outputs. They reconstruct the **already adopted
raw-source** model on legal input. Add named constructions using the same
primitive annotated fields, varying B/I and selected versus external stars
where legal; keep all original constructions, seed and budget. For example,
`before:"\\", outsideLeft:1, row:{body:"word"}, outsideRight:1` expresses the
first case without a production parser. For a shorter migration, adding these
to the existing direct browser-source property preserves independent model
expectations and requires no new shared app driver.

Actual preview can be recorded diagnostically, but no current law promises
that arbitrary source-wrapping makes visible emphasis. CommonMark renders the
code-span result as literal `**word**`, and the intraword-punctuation result as
literal stars; these observations do not contradict the adopted source-edit
law. Syntax-aware formatting of code, escaped delimiters, underscore wrappers
or URL destinations would revise that law and needs a concrete old/new delta.
Do not make a rendered-emphasis property that silently rejects these allowed
raw outputs. The old formatting unit file has no assertions for these six
markup contexts; this is stronger deterministic range, not a recovered old loss.

## T5-STRUCT-001: nested containers are a separate semantic boundary

**Status:** source-calculation differences found; no adopted nested-container
law and no confirmed production defect against current bounded laws.

The same scratch report preserves these source probes:

- Tab at the end of `- child` inside a fenced literal block indents that
  list-looking source. It remains code with four added literal spaces.
- Tab on a quoted list (`> - parent\n> - child`) declines because the selected
  source lines are not bare list lines.
- Shift+Enter at the end of `> ```\n> line`, `- ```\n  line`, or four-space
  indented code appends a literal backslash before LF. The existing scanner
  recognizes flat fences, not nested quote/list/indented-code containers.

The first exploratory list probe initially placed its caret on the closing
fence line (`21`) and correctly declined. It is retained under
`closingFenceLineIndentDecline`; the actual body witness is separately kept
as `listLookingCodeBody` at `20`. No offset mistake is used as evidence for
list behavior.

The direct list grammar has named bare/indented parents and nested-list
examples, but cannot reconstruct the quote/fence prefix exactly. The direct
break grammar's law explicitly excludes quoted/list containers and permits
only one annotated flat opener/closer. Totality properties supply usable-edit
and no-throw coverage over arbitrary strings, not nested rendering semantics.
The mixed-action grammar and independent parser checks must not be represented
as adopting these missing meanings automatically.

Concrete potential law deltas to present after the current adopted work:

1. Shift+Enter should insert an ordinary LF inside every supported rendered
   code container, including quote/list fences and indented code, versus the
   existing flat-fence-only context contract.
2. Tab on list-looking source inside code should preserve native focus or edit
   literal indentation, and Tab on a quoted list should either support the
   quoted list's nesting or deliberately decline. Source editing and rendered
   list-node editing predict different answers; "stock standard" alone does
   not choose between them across the researched editors.

Preserve the exact source and selection probes when proposing those deltas.
Do not narrow arbitrary valid-input grammars to avoid the cases, and do not
change production or semantic expectations to assert the new behavior without
that review. No old unit/removed formatting Playwright assertion promises
container-aware handling. New smart Enter/Backspace, heading/quote tools,
alternate-marker removal and keyboard-link completion remain separate feature
laws. Inline-code insertion remains parked at the user's request.

## Additional receiving question kept separate

`BracketPicker.navigate` accepts Enter regardless of modifiers, while focus
view has Ctrl/Meta+Shift+Enter and Ctrl/Meta+Alt+Enter chords. Source therefore
admits a picker insertion and a global focus action from one modified Enter;
the global chord handling does not gate all chords on `defaultPrevented`.
This is an investigation candidate, not a confirmed defect: the adopted laws
here specify picker-first **Escape** and formatter identity after consumption,
not universal ownership of every modified key. Probe the actual native path
before proposing any modifier-precedence law.

## Loss and handoff

The immediate implementation recommendation is BRACKET-001, FOCUS-001,
REPLACE-001 and deterministic T5-RAW-001 constructions, followed by independent
source review and coordinated browser/calibration/mutant campaigns. A plan-derived
state name cannot prove a consumed key, pending readonly render, native
fullscreen provider or settled error recovery; each needs the described receipt.

No existing test file was removed or narrowed. The earlier formatting migration
loss audits remain valid only for their recorded fingerprints; these stronger
paths do not replace unrelated picker, focus, restore, upload or protocol tests.
T5-STRUCT-001 and the modifier question remain visible law-discovery work rather
than silently expanded guarantees. No zero-gap claim or product-bug closure is
made by this audit.
