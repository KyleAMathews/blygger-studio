# Upstream integration: browser transport and receiving paths

Reviewed 2026-11-19 against upstream `28b0c8d642a87e5810ad6eabd95c2d1714c53396..2d15307` and the copied oracle work in this integration checkout. This is a source audit, not browser acceptance. No browser, test, benchmark, Docker or build job was launched, no runtime source was edited, and the original running reference was untouched. The only audit output is this document.

## Verdict

The upstream changes preserve the delegated formatting modules and instrumentation entry points. Two definite setup adaptations were identified and the parent has applied them in this integration checkout: the normal SPA's gallery build configuration and the composer's new toggle-button locator. Their revised source is consistent with upstream. Registered receiving evidence remains necessary.

The toast migration also breaks an observation assumption and exposes a possible visible-duplicate regression. Changing all-dialog counting to count actual sheets is justified; excluding `data-limited` or ending toasts merely because of those attributes is **not** justified. The new publish helper introduces a whole-document replacement path outside the present held-restore oracle; it has a source-identified stale-result risk which this audit has not reproduced.

## Inventory and evidence

| Area | Upstream change | Effect on current oracles |
|---|---|---|
| Formatting factories | `src/ui/format-shortcuts.ts`, `src/ui/links.ts`, `src/ui/draft.ts`, `src/ui/caret.ts` are byte-identical between the two upstream commits. | No new factory export, argument, delegation or independent model adaptation is indicated. |
| Composer kind | `authoring.tsx:1127` now renders `ToggleGroup`/`Toggle`; `buttons.tsx:102` forwards props to Base UI Toggle. | The former `radio` locator is invalid. A named button remains the actual receiver. |
| Pane controls | `authoring.tsx:2464` now uses the same ToggleGroup, retaining `aria-label="pane"`, `data-pane`, onClick and native button elements. Installed Base UI `toggle-group/ToggleGroup.js:80` supplies `role="group"`. | Current group/button locators, `data-pane` commit receipts, hidden DOM-handler inputs and native Enter inputs remain source-compatible. Roving focus may change the actual Tab recipient; the traversal oracle measures that recipient dynamically. |
| Picker source filter | `picker.tsx:188` replaces radio inputs with toggles; `afterControl()` is retained in each onClick. | Current picker receiver histories locate the panel, search/listbox/hit and consumed key, not those radios. No stale source-radio locator was found in maintained editor oracles. Source-filter interaction itself remains outside these bounded histories. |
| Formatting toolbar | `ToolRow`, formatting `data-action` attributes, native Button use and replacement `disabled` wiring remain. New DesignButton is used for save/publish. | Existing formatting pointer/keyboard delivery and disabled-control receipts need fresh baselines but no source adaptation was found. The new wrapper forwards id/onClick/disabled and keeps button text in a nonhidden `.button-label`. |
| Confirm/prompt sheets | Dialog was renamed locally to BaseDialog; title, `.sheet`, `.sheet-confirm`, `.sheet-prompt`, `[data-sheet=ok/cancel]`, form submit and initial-focus paths remain. | Named fallback/restore sheet locators and their exact controls remain source-compatible. |
| Action menu | MenuSheet now uses `SystemMenu`/`MenuItem`, rendering the existing ul/li/native button pattern with disabled/onClick and label text. | No changed editor-oracle menu dependency was found. Menu accessibility details are not newly claimed as covered. |
| Toast | Old single `role=status` node replaced by BaseToast manager, viewport and a Root for every retained toast. | All-dialog and raw-toast-count assumptions need separate treatment below. |
| Publishing | New `publishTangle` and three callers in Compose, ItemRow and Editor. | Code is preserved by integration and bundled normally, but current histories do not drive these publish flows. Held-restore coverage must not be presented as coverage of this replacement. |

All **75** authored JSON challenges have exactly one `find` match in their current source, including all **20** targeting `authoring.tsx`. This static admission check does not establish registration, execution, infection, expected kills or native receiving behavior.

## Adaptations already applied by the parent

### U1: match the normal SPA build configuration

New `src/ui/build-flags.ts:6` evaluates `process.env.BLYG_COMPONENT_GALLERY`. New `scripts/build-spa.ts:17–45` defines it and resolves `./component-library.tsx` to `component-library.stub.tsx` for normal builds. The copied oracle bundler initially defined only NODE_ENV. That could leave an unresolved browser `process` access and include maintainer gallery source/CSS.

The parent revised `scripts/formatting-oracle-application.ts` to:

- compute the same environment choice;
- define BLYG_COMPONENT_GALLERY to the same literal;
- install the same conditional stub resolver before the generic file onLoad hook.

I reread that revised implementation. The stub is still consumed through the existing generic hook and therefore retained in the application input hashes, watch edges and raw-data imports. The supplied receiver and three factory delegates are still the only explicit exceptions to disk-source capture. No production observation or instrumentation call was changed by this adaptation.

The effective environment remains a host input. Source parity under a single cold invocation does not establish safe cache/daemon reuse after changing BLYG_COMPONENT_GALLERY or other environment-only choices. The new compiled bundle hash reflects the selected branch, but a caller must not infer that the runner's run/cache identity encodes that environment.

### U2: activate the actual kind toggle

The parent changed `test-ui/editor-oracles/session-driver-oracle.ts`'s state action from a radio named `thread` to a button named `thread`. Upstream independently made this same locator change in `e2e/format-shortcuts.spec.ts`. The edit changes delivery to match the new DOM; it retains the same undo-then-React-rerender checkpoint and expected source. A fresh registered run, including that checkpoint, is required for execution acceptance.

## Required toast distinction, without narrowing the laws

### U3: sheets and nonmodal toasts now share the dialog role

The workflow driver at lines 104–107 counts every accessible `dialog` and every DOM `[role=dialog]`; `workflowStep` expects `dialogs:0`. Installed Base UI `toast/root/ToastRoot.js:423–434` assigns a low-priority toast `role="dialog"`, `aria-modal=false`. Consequently, a correctly displayed feedback toast now appears in the old all-dialog count even after its fallback sheet has closed. Upstream cosmetics tests were changed from status to dialog-with-description for the same reason.

A receiver adaptation should separately retain receipts for actual sheets (for example `.sheet[role=dialog]`) and for feedback toasts. Preserve the promise that the fallback sheet has closed and focus/source/caret have received the action. Do not treat the intentional nonmodal toast role as an uncleared blocking sheet. Keep raw role counts as diagnostic data if useful; `mountedDialogs` is currently collected but not judged by the workflow model.

### U4: limited toast nodes are not proven visually hidden

The old implementation stored one `currentToast` and rendered one `.toast`. The adopted workflow model expects exact current feedback and `toastCount:1` on feedback-producing actions. Earlier fixed tests used strict `.toast` text assertions. The oracle must keep the unique visible/current message obligation; a CSS migration does not authorize accepting duplicate visible messages.

Source facts for the new implementation:

- `sheets.tsx:343–364` maps **every** manager toast and sets `limit={1}`.
- Installed Base UI `toast/store.js:118–145` prepends new items and marks older active items `limited`; it does not delete them because the limit is one.
- `ToastRoot.js:423–443` adds `inert` and CSS index/offset variables. Its limited flag becomes `data-limited`; no inline display, visibility or opacity rule hides it.
- `toast/content/ToastContent.js:49–60` emits `data-behind` and forwards props. It does not hide old content.
- Current `studio.css:460–467` styles the viewport and toast/content/message, but supplies no `[data-limited]`, `[data-behind]` or toast ending-state hide/stacking rule. No other applicable toast CSS was found in source.

Therefore it is unsafe to change the receiver to `.toast:not([data-limited])` or exclude ending nodes solely by lifecycle attributes. `inert` affects interaction/accessibility, not painted visibility. Several messages may remain physically visible, and the existing raw count failure could be exposing a real upstream regression rather than harmless retention. This audit has not obtained a browser receipt and does not label that hypothesis a reproduced defect.

The next bounded receiving check should keep every node's raw text/count, lifecycle attributes, computed display/visibility/opacity, rectangles and accessibility participation, then demonstrate what is actually painted after two distinct rapid feedback actions. Preserve exact current message and unique visible message checks. Do not wait for duplicate disappearance to make the checkpoint pass. Any change from raw DOM uniqueness to visible uniqueness must retain the old observation as diagnostic evidence and explicitly document why the public obligation is preserved.

The session oracle's impossible-indent feedback check uses `[role=status],.toast`, so it still finds the new node. Its existence-only check is not evidence that old duplicate feedback is hidden.

## New publish receiving path: explicitly outside current coverage

`publishTangle` at `authoring.tsx:806–831` first attempts the normal write, recognizes a typed `BlyggerApiError`, asks through the ordinary confirm sheet, retries with the existing server flag, then fetches the rewritten source. Compose uses that source for its published banner. ItemRow (`1351–1360`) and Editor (`2189` onward) unconditionally `Draft.accept(done.source)` and set React text when it is supplied.

The current formatting histories contain no publish action. Their only API publish is arrangement of an ordinary historical version before the held-restore history. Draft model limits explicitly exclude `Draft.accept`; the receiver oracle explicitly covers one historical restore and excludes publication rules. Thus no current result establishes cancel/retry/error/source-receipt behavior for the new helper. The helper's presence in the real bundled application or an Editor ownership declaration does not close that coverage gap.

Source-identified race to investigate: after the confirmation has closed, the publish retry and subsequent source GET can remain pending while the full editor's textarea is editable (`readOnly={replacing}` at `2557`; the publish callback does not set `replacing`). A new edit in that interval can then be replaced by the unconditional accept/setText of the older server rewrite. Quick edit has the same accept pattern. This is a conditional source argument, not a reproduced failure. Ordinary publish previously did not replace local source this way.

A focused receiving oracle can treat the rewrite as a declared server input and hold retry/GET delivery, then check the adopted source-preservation policy across a later edit. It must first make explicit whether this operation freezes editing or reconciles a later edit; no protocol/tangling semantics need to be invented. Cancellation, nonconfirmation errors and a failed post-publish source read need separate receipts if publish behavior becomes part of the promised scope. Do not silently broaden the held-restore law to all server replacements or change production as part of this read-only audit.

## Transport and input-binding review

- `browser-source-oracle.ts` still captures the authoring query after oracle-gaps load instrumentation and before normal TSX transformation. New private helpers/imports do not need a replacement-string rewrite. Actual React code remains browser-only; Node imports the source string/metadata.
- `formattingApplicationBundle` still delegates exactly the formatting, links and Draft modules. Other new app modules, buttons, primitives, sheets, picker and their imports flow through generic source capture. The supplied authoring receiver is separately hashed; no reason was found to substitute the uninstrumented disk authoring file.
- `verifyBrowserApplicationSource` still rejects stale captured disk inputs, and raw application inputs still feed runner invalidation. The source challenge match audit found no broken authored replacement anchors.
- `applicationDriver` still routes the returned application JS when receiver mode is active. The session driver's fixed app uses the wrapper's initial script intentionally: that oracle owns formatter factories, not authoring mutations. This audit does not claim authoring mutation coverage from the session driver.
- Application CSS is served by the Worker from `build/studio-spa-style.txt` (`src/spa.ts:3,173`), while the oracle JS is separately bundled. Generated artifacts exist in this checkout; this read-only audit did not establish their complete source correspondence. Source capture alone does not prove CSS artifact/source correspondence. Source/CSS edits during a campaign need an explicit artifact rebuild/rebinding, not just a hot JS query. No CSS-mutant transport is claimed.
- New migrations are consumed by `readD1Migrations('./migrations')`; no frozen hardcoded migration list blocks the disposable host. New contacts/settings/search provider fixtures still satisfy the same receiver shapes used here.
- Existing clipboard, native undo, browser-engine/profile and force-cancel process limitations remain. This merge audit neither resolves nor weakens them. Keep the original reference evidence bound to its original source; report new receiving receipts separately.

## Acceptance still required

Retain unchanged laws, histories, seeds, budgets, checkpoints and authored challenge expectations while validating the two setup adaptations. Obtain fresh session/interaction/picker/restore/navigation/workflow baselines and selected mutation receipts on the integrated source. Resolve the toast role projection independently of its physical multiplicity question. Record publish replacement as uncovered until its own policy and receiving history are adopted. This document supplies source evidence only, with no green-run, full-coverage or CI-performance claim.
