# Interaction oracle design grammar

2026-11-18, before implementation. Preservation relation: **named adopted laws**, with additional receiving witnesses; no production behavior or old history is changed. Authority is Kyle Mathews (GitHub KyleAMathews),2026-11-18, approved T4 keyboard/focus/selection strengthening, plus format-shortcuts entry-point promises and the retained original formatting scenarios. Triggers: multiple command branches, state shared between toolbar focus and selection, and controlled-provider handoff to a real picker.

## Parts, rules and distinguishing witnesses

| Part | Job and witness |
| --- | --- |
| Toolbar tool | Indent/outdent/break/code/formula each has an existing per-command model. Same selected body with formula versus code gives different source. |
| Activation | Click, Enter and Space invoke the actual button. Enter and Space must receive the selected textarea range even while the button owns focus. |
| Input selection | Whole/partial/caret ranges are input facts. Later insertion and final range distinguish them. |
| Profile | Desktop and small viewport use the same adopted source/range/focus law through each actual layout. |
| Picker key | Native Tab or Shift+Enter is consumed by the real mention picker before React's formatter. The formatter's actual input source/range is sampled by a later target listener, after the picker and before React's ancestor listener. |
| Picker provider | A controlled valid contact response makes the existing picker selectable. Contact lookup, contact completion spelling and API persistence are not judged by this property; the checked contract is the already-prevented formatter gate. |
| Read-only | Real React textarea listener sees a controlled readonly textarea and must preserve source/range without preventing the key. This establishes the formatter guard; replacement lifecycle/control-disable is separate. |
| Focus direction | Native off-list Tab and Shift+Tab preserve source and leave the textarea. No particular neighboring control or roving-toolbar policy is imposed. |
| Scroll premise | A real below-fold textarea and an already scrolled page distinguish preventScroll from ordinary focus. Observe the page coordinates immediately before/after the actual focus call. Native editing may scroll the caret afterwards, so no claim freezes all subsequent native scrolling. |

Toolbar expectations reuse the independent code/formula/list/break input projections, not formatter outputs. The picker model reads only the source/range supplied to the formatter after the picker, never the formatter's result. This is a component-boundary input fact, not a golden output from the receiver being judged. Actual `defaultPrevented` must be true at this boundary; otherwise the premise was not delivered and the history does not establish this law.

The readonly and traversal models are identities over input text/range. The scroll model requires an actual below-fold focus premise, zero page-scroll displacement during focus, and independently computed edited source/range. A fake focus-method invocation alone supplies no scroll evidence.

## Reconstruction, ablation, range and exclusion

The original toolbar history is retained in the existing session property; new histories independently reconstruct its successful tools through Enter/Space. Every supported Markdown toolbar tool, each activation, both viewports and each selection shape are constructed, including structural whitespace boundaries. Every picker key and both viewports are constructed. Readonly includes B/I/K/Tab/Shift+Tab/Shift+Enter. Traversal includes both directions. Scroll includes native and forced-fallback delivery.

Domains are bounded ordinary letters, numbers, α/emoji and punctuation; code selections contain no fence marker, keeping the existing exact default serialization promise. An unsupported toolbar name, an illegal key or negative selection index is a nearby invalid grammar control. Body alphabets and bounds are explicit; this does not claim arbitrary Markdown or physical mobile keyboards.

No old grammar/filter/budget changes. This is a strengthening of receiving coverage, not a pure refactor. No two-way model equivalence claim is made. Adjacent forms are (1) adding all these branches to sessionModel, which couples new host fixtures to its retained original histories; (2) a single broad action reducer, which adds needless state for one-action receiving laws; (3) separate small properties sharing a disposable application driver, retained here. There is no formal-model claim. Browser execution, calibrated corruptions and authored mutant challenges are pending with the parent.

## Preflight receipt

The pure grammar membership preflight admits all54 constructions: toolbar32,
picker4,readonly12,traversal4,scroll2. Each grammar rejects a nearby invalid
control (unknown tool/key, nonboolean direction, or negative scroll). This is
membership/legality evidence, not a production run or measured reach claim.
`tsc -p tsconfig.ui.json --pretty false` passes; scoped diff whitespace check
passes. No browser campaign or mutation challenge was run by this author.

Initial source SHA-256 fingerprints, before parent execution:

```text
52234bedffc1614e559107fa6a01ce367754b316e076db3e5c2d1da31b9da385 test-ui/editor-interactions.oracle.test.ts
3bee4b6c6d5334d6439182497e2da04d64c8ebdef064e6d4d537afa3a82aaee7 test-ui/editor-oracles/interaction-model-oracle.ts
46435853ce2e8a6d44b9c1e864b9a62fc49685e51879e61536607589fefd2532 test-ui/editor-oracles/interaction-driver-oracle.ts
```

## Dated addendum: reviewed native boundary repair, 2026-11-18

The preceding sections preserve the initial design and fingerprints. This
addendum records the implemented form after independent findings INT-001–004
in `interactions-review.md`. It supersedes the earlier descriptions of the
later target listener, focus-leaves-textarea observation and instance focus
observer when describing the current transport. It changes no adopted command
law, existing generated domain or campaign budget.

The picker now records input at the actual delegated `onFormatKey` entry,
before forwarding its original arguments. Source, selection, React prevention
and native prevention are input facts at that function boundary. The real
mention picker and controlled valid contact response remain. Missing consumed
input is a named setup-premise failure; it is not counted as an identity-law
kill. This protects the already-consumed-key guard. A future claim covering a
changed authoring listener topology needs its own real receiving-order
challenge; this conditional guard property does not manufacture that result.

Native traversal now has a same-page host control: bypass only the delegated
formatter, send the same native Tab/Shift+Tab, and record its unprevented
focused recipient/direction. WeakMap identity preserves freedom to change
which incidental toolbar control is adjacent. Reset focus/range and send the
same key through production. The model still predicts unchanged source/range,
but also requires the actual unprevented native recipient/direction. Mere blur
or an arbitrary focused element is insufficient. An absent native control
premise is classified separately as setup, rather than an assertion kill.

Scroll observation now wraps `HTMLElement.prototype.focus`, so prototype and
ordinary instance focus cross the same actual native call boundary. At least
one textarea focus receipt is required, and each must show zero page-coordinate
displacement. The source/range result is independently computed. Command
names/results remain diagnostic; the input mode means requested native command
versus forced refusal. Later native caret-reveal scrolling remains permitted.
Both modified host methods are restored in `finally`.

Readonly source/range and final key prevention remain contractual. Focus is
recorded diagnostically because an unprevented native browser shortcut can own
focus. This removes an accidental extra focus constraint without changing the
adopted readonly identity/decline promise.

The primitive history/model source remains unchanged:54 constructions and
25 runs for each fixed/random campaign. There is no new mutable semantic
state. Driver-local entry wrappers, native-control flags, event references and
WeakMap identities exist only to locate/compare host boundaries; each has the
distinguishing witness above. Eight calibrations now include prevented-blur,
wrong-recipient and empty-focus-receipt observations. No ordinary tests were
introduced and no history was filtered away.

Completed targeted Chromium run `fcf5d695e2eb` in
`build/formatting-oracles/interactions-reviewed` reports195 passing baseline
checks twice, zero nondeterminism and six registered-law assertion kills:
ordinary/prototype focus scrolling, prevented-blur/wrong-recipient traversal,
and removal of readonly/already-consumed-key guards. This is the selected
six-challenge campaign, not exhaustive mutation closure. The raw result has
zero ordinary tests, no provisional baseline and no production crashes.
See `interactions-review.md` for exact routes, laws and artifact fingerprints.

The final oracle/model/driver hashes are recorded in that review. Production's
current hash is explicitly a **postrun** snapshot: there is no retained
prelaunch manifest proving that a nearby CommonMark fence repair preceded
this run. The parent will bind all frozen sources with the planned full
current campaign. This targeted result establishes its recorded framework
outcomes without making that stronger exact-prelaunch-source claim.
