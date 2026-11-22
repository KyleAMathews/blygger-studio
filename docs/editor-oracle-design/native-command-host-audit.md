# Native-command host authority and probes

Recorded 2026-11-18, against base `28b0c8d642a87e5810ad6eabd95c2d1714c53396` plus the uncommitted source identified below. This is an authority audit and disposable browser exploration, not a maintained test, oracle result, RED, or production repair. No law, model, production, driver, runtime, or build configuration was changed.

## Raw findings

The [raw successful observations](native-command-host-probes.json) contain **30 cases**: three edit shapes × five host modes × two engines. The actual hosts were the matched Playwright 1.64.1 browsers at `PLAYWRIGHT_BROWSERS_PATH=/private/tmp/blygger-playwright.3EVERv`: Chromium **156.0.8078.4** and Firefox **157.0**. Both supplied a callable native `document.execCommand`. WebKit was not run in this audit.

The probe read unchanged `src/ui/format-shortcuts.ts`, transpiled it with TypeScript to ES2022/CommonJS, and evaluated the resulting exports in each disposable browser page. The invoked function was exactly that module's exported `applyEdit`; no oracle mutation or application wrapper was loaded. The normal-host recording wrapper delegated with `Reflect.apply` to the original browser function and retained its identity in every command receipt. Injected modes are labeled individually and never presented as actual browser capabilities. The direct textarea fallback wrapper also delegated to the original element method. This supplies actual-source/browser observations, but not React application receipt, native undo, or built-bundle evidence.

For the nontrivial native-safe edit, initial source was `ab`, replacement `[1,1) → X`, and final range `[2,2]`. Both engines gave the same source/range/command results:

| Host mode | Native observation | `applyEdit` result | Source / range | Input receipt |
|---|---|---|---|---|
| Actual native | Original browser command returned `true`; source became `aXb` | Returned `undefined`, no fallback | `aXb`, `[2,2]`, focused | Trusted `input`, `inputType=insertText` |
| Injected refusal without mutation | Stub returned `false`; original native function was not invoked | Returned `undefined`, one fallback | `aXb`, `[2,2]`, focused | Synthetic bubbling `input` |
| Injected unavailable API | Own `document.execCommand` shadowed with `undefined` | Threw `TypeError`, no fallback | `ab`, `[1,1]`, focused | No `input` |
| Injected throw before mutation | Stub threw `NotSupportedError`; original native function was not invoked | Propagated `NotSupportedError`, no fallback | `ab`, `[1,1]`, focused | No `input` |
| Injected success without mutation | Stub returned `true`; original native function was not invoked | Returned `undefined`, no fallback | `ab`, `[2,2]`, focused | No `input` |

The unavailable and throwing cases focus/select the replacement range before failing; they do not execute the final selection or explicit synthetic `selectionchange`. The injected success case executes that final selection and synthetic event despite not making the nontrivial replacement. These are consequences under injected host behavior, not observations that either available browser misbehaved.

The bypass neighbor used initial `a\u0301b` and insertion at UTF-16 offset 1, inside the first grapheme. In **all ten cases** (five modes per engine), the command was never invoked; `applyEdit` returned, called fallback once, emitted synthetic bubbling input, and produced the exact UTF-16 splice `aX\u0301b` with range `[2,2]`. The unavailable/throwing host does not imply failure on a path that never calls it.

The legitimate no-op control used `ab`, `[1,1) → ''`, range `[1,1]`. Both actual browser commands returned `true` with unchanged source, no input, and no fallback. This is a legitimate successful empty edit. A blanket rule that treats every `true` plus unchanged source as dishonest would misclassify it. Injected refusal produced one synthetic-input fallback; unavailable and throwing stubs propagated their errors; injected true was indistinguishable at this source checkpoint from legitimate native success. A postcondition should compare the requested result, rather than require every success to change source.

No case produced an uncaught page error or unhandled rejection. `beforeinput` was observed in none of these programmatic command cases. Both engines emitted the explicit synthetic textarea `selectionchange` on returned calls, followed by native queued selection events. Firefox additionally emitted document-targeted native selection events and represented the collapsed selection direction as `forward`; Chromium used `none`. The raw JSON preserves immediate and two-animation-frame settled state, all event data, command and fallback before/after receipts, return/throw objects, browser versions, function identity, and script/source hashes. Event order outside the immediate call is observation, not a proposed new law.

## Existing authority, before disposition

1. [The keyboard oracle](../../test-ui/editor-keyboard.oracle.test.ts) says: “For every valid edit, apply its replacement through a native undo command or bubbling-input fallback, focus without scrolling, restore its selection, and emit selectionchange without throwing.” Its explicit host limits are “Real Chromium command outcomes or forced refusal”; exact intra-grapheme offsets are included. The authority is the source comments, historical keyboard examples, and Kyle Mathews' 2026-11-18 keyboard/application decision. Exact source and final range are already checked for native `true`, native `false`, and bypassed native paths.
2. [The approved design model](model.md), U2, is explicit: “Browser native-command success, exceptions/absence and real undo are host questions. Current fake-host coverage establishes true/false paths. Any promise for absent or throwing APIs needs a receiving probe and a sourced law; it cannot be added as a fallback refactor.”
3. [The refactor plan](../editor-oracle-refactor-plan.md), step 4: “Probe native-command exceptions/absence before deciding whether they imply a new promise.”
4. [The research reconciliation](../editor-research-next-steps.md) separately retains unavailable/throwing/success-without-change probes and recovery expectations as unfinished host work. It does not adopt their recovery policy.
5. [The editor behavior audit](../editor-behavior-audit.md) records that GitHub's [pinned insertion helper](https://github.com/github/markdown-toolbar-element/blob/2f5552a16fc561e6caecae4a1be654b8742f83f7/src/index.ts#L463) verifies native insertion before fallback. That implementation is evidence for a proposal, not authority that Studio must copy its recovery choices.
6. Historical `test-ui/format-shortcuts.test.ts` at the base commit imports pure formatting/key functions, not `applyEdit` or `onFormatKey`; it contains no absent/throwing native-host expectation to recover through the old-test loss audit.

No later concrete adoption of absent/throwing/dishonest native-host recovery was found in the audited design and research records. The broad “No valid call throws” prose must be read with its stated host limits and U2. It should not silently erase that unresolved host premise.

## Coverage disposition

| Domain | Current status | Why |
|---|---|---|
| Actual native `true` with the requested replacement | Adopted and checked | The independent transaction predicts exact source/range; native `true` does not excuse a wrong requested result. |
| Actual `true` with legitimate unchanged requested source | Adopted and covered | Empty edits can succeed without source mutation or input. The collapsed-empty regression already has browser coverage. |
| Native refusal `false` | Adopted and checked | Fallback through original `setRangeText`, bubbling input, exact source and final selection is already required. |
| Native bypass at unsafe grapheme offsets | Adopted and checked | `nativeResult:null` denotes bypass, not absent API. The probe demonstrates exact fallback independently of the injected host. |
| API absence | Probe now available; recovery promise not adopted | The current available hosts implement the API. Shadowing it with `undefined` is an injected environment, and U2 reserves its recovery contract. |
| Native exception before mutation | Probe now available; recovery promise not adopted | Propagation is observed under the injected throw. The next law decision must state whether and how to recover. |
| Injected `true` without a required source change | Probe now available; recovery promise not adopted | It exposes the current reliance on a truthful host result. No available native browser did this in the probe. The already-adopted exact-source law still judges actual browser results. |

The current textarea driver unconditionally executes `document.execCommand.bind(document)` before entering its production-call catch. Removing the API inside that existing setup would fail the harness before `applyEdit` runs. Such a setup failure is neither a product failure nor RED. The scroll driver has the same availability assumption. A future host dimension must capture the original property safely, enter the production call even when it is absent, and restore the descriptor reliably.

The independent textarea transaction always computes exact replacement; `nativeChoices` admits `[true,false,null]` with native enabled and `[false,null]` with forced refusal. Its null member represents deliberate bypass. Neither that model nor its driver currently represents absent/throwing/lying hosts as distinct histories. Forcing such results into the boolean axis would hide the host premise and conflate native effects with fallback obligations.

## Proposed next decision

A potential law can now name safe pre-mutation recovery precisely: **for every valid edit, if native editing is unavailable, throws before changing source, or claims success without producing the requested source, deliver the exact requested replacement and final selection through a bubbling-input fallback. Preserve a legitimate successful no-op and its native history.** This is a proposal, not an adopted oracle expectation or permission to change production.

The decision also needs a separate rule for exceptions or wrong results after partial mutation/input. This bounded probe deliberately injected only a throw before mutation. Blindly replaying the original range after partial mutation can double-apply a replacement; allowing an incorrect trusted input to reach React can expose a transient wrong value. The current probe does not choose rollback, overwrite, refusal, error reporting, or undo semantics for those situations. Probe those histories and the real receiving application before promising a general recovery guarantee.

If adopted, extend the existing host grammar and receiving driver rather than add fixed Playwright tests. Keep the legitimate empty no-op and inside-grapheme bypass neighbors, assert source/range/input at the real receiving boundary, and run the extended oracle on unchanged production before any repair. Preserve the distinction between exact replacement and native undo: a fallback does not acquire a native-undo guarantee merely because it recovers source.

## Reproduction and binding

The successful raw JSON embeds the complete disposable script. The original scratch file is `/private/tmp/blygger-native-host-probe.Ul3gV0/probe.cjs`. Replay from this worktree with:

```sh
PLAYWRIGHT_BROWSERS_PATH=/private/tmp/blygger-playwright.3EVERv node /private/tmp/blygger-native-host-probe.Ul3gV0/probe.cjs
```

The browser launch needs the same ordinary sandbox escalation as the other browser campaigns on this macOS host: sandboxed Chromium failed before page creation with Mach-port permission denial, and Firefox exited before connecting. Those are launch failures, not product observations. Raw receipts remain in [default-cache failure](native-command-host-probes-default-cache-unavailable.json) and [sandbox launch failure](native-command-host-probes-sandbox-launch-failure.json). The first attempt found no matching browsers in the default cache; no fallback to mismatched cached revisions was used.

The successful probe read the source once before browser launch at `2026-11-19T06:58:27.299Z`; the postrun source hash was unchanged. Snapshot hashes:

| Item | SHA-256 |
|---|---|
| `src/ui/format-shortcuts.ts` | `c4a34e5d1faa4c94df876f45577e3f173fc83267a4851c078f523406d5ccc967` |
| Transpiled module | `0cecf5b8a970277400bff61ccf26a59171c98a2decb2c8b33efb0a77010295d5` |
| Invoked `applyEdit.toString()` | `43e5745cfe1e955585ef126250d0c4e2dece9ea05451c9defb2a1a6b2b7a8ad8` |
| Successful scratch script | `cf81415c64f4a66d180c815336113efaaa80015f259a32763242aa2abdac06ee` |
| Successful raw JSON | `28ff1327c14274d81ca2190431223c92e657c683fdd00051cb3a8c17a27752d2` |
| Keyboard oracle | `7f5208dd78eebfc466eb04d4755aa8fc820f3569f5aeb4abf74c56aaa467cefd` |
| Textarea driver | `d0f8d0d1d55ebe0c656821e28a8f7aba648184069cef05b2a95ee0f4dac5fd4f` |
| Textarea model | `cfccc04be4c8faedd7f24aaccf09c66f6343430928424b032b114a5182fb8fcc` |
| Design model | `2e3ee40c76f05d7cda4977949bba39bf9f7ec0d38cbe5bbf85baba9c4f516928` |
| Refactor plan | `1e99864f67da317748639b233ed8e775cfc3108af6945e24192ea4c683ec832e` |
| Research next steps | `1e324caf8575ae953e2048c4ca7eb404a83914ca75f0f6c7b32a78472b5bd6c3` |

There is no gap-check or calibration result for this disposable exploration, no recovery feature implemented, no assertion that absent/throwing hosts are now covered by the maintained oracles, and no inference about ordinary Safari, physical iOS, OS permission UI, post-mutation exceptions, or native undo. Those require their own law and receiving evidence.
