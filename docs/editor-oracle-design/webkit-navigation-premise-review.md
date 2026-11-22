# Review: editor-to-quick navigation premise

Independent read-only source review, 2026-11-18, using the pinned `oracles-review` skill and checklist v1. No implementation changes, probes or campaigns run by this reviewer. Original browser test read with `git show HEAD:e2e/format-shortcuts.spec.ts`; current session driver and `authoring.tsx` inspected directly.

## Verdict

**Delivering the `quick` action through the actual ← compose link preserves the adopted in-app same-item transition law. It does not preserve the original hard-navigation receiving witness by itself.** Keep the expected source/model unchanged for the link route. Retain the raw navigation path separately before claiming complete migration of the original browser behavior.

The current driver uses `page.goto('/studio')` at `session-driver-oracle.ts:66–73`. The product's actual ← compose control is a TanStack `Link` (`authoring.tsx:2347–2349`). Its route transition invokes the editor's `shouldBlockFn`, which awaits `save()` and blocks when saving fails (`:2007–2021`). The save consumes the current draft; edits schedule autosave after 400ms, and unmount clears that timer (`:2000–2030`). A hard document navigation does not exercise that TanStack save boundary. A native undo-host receipt establishes an editing boundary, not a persistence acknowledgement.

Thus a link-driven receiving history legitimately supplies the missing save-on-leave production path; it must still compare the same latest modeled source at `quickLoaded`, then apply the same quick-editor bold command. It must neither wait for an arbitrary duration nor call a test-only save/flush in place of the link's own behavior. A save failure must remain distinguishable from successful navigation.

## The original observation must remain represented

The original full/quick browser test creates a marker, applies I and I in the full editor, checks the marker is restored, then performs **hard** `page.goto('/studio')`. It opens that item in quick edit and expects `**marker**` after B. There is no explicit save, persistence acknowledgement, or sleep between the restored-source assertion and navigation.

Replacing that delivery with an SPA link changes an observable history dimension. The original three value assertions may all appear elsewhere, but that alone does not prove preservation of their original navigation boundary. My earlier static no-loss receipt did not establish save ordering under this newly exposed schedule and cannot close this issue.

To retain the raw path, a registered oracle history must still perform native I/I → hard navigation → same-item quick edit → B, using the existing expected marker/source and model. It must not insert a save or an acknowledgement of the **latest** edit before leaving. Keep the original operation represented even if the ordinary product link receives its own separate route/action variant.

The decisive nearby schedule is: the earlier italic source has been persisted, the final unitalicized source is visible in the textarea/React draft, and its save has not committed when hard navigation completes. Establish these premises with correlated write requests/acknowledgements and controlled delivery, rather than incidental host timing. Record navigation completion and any before-unload dialog/decision so a blocked departure or explicit discard is not mislabeled as a successful source-preserving transition. The original test supplies no explicit discard approval.

The research agent's controlled network probe can establish this schedule's reach. Until its result is incorporated, the raw-navigation persistence premise is unresolved. If the raw path reproducibly loads `*marker*` instead of the expected marker, retain that as a reachable receiving/persistence counterexample; do not relabel it as native undo failure, permit stale source in the model, or dismiss it as pre-existing. An older passing browser test does not establish the unsampled ordering.

## Required evidence and claim boundary

- Keep the link-driven route and raw-navigation route distinguishable in the registered history/driver, with their actual production entry points and unchanged source observations.
- Require link navigation to exercise the real save-on-leave path. Preserve failures at the corresponding checkpoint instead of manufacturing a saved premise in setup.
- Preserve the original raw-navigation witness and the prior-save/latest-unsaved distinguishing schedule. Any unresolved result remains an explicit limit, not a closed gap or zero-loss claim.
- Update migration claims that currently cite all 28 original observations as fully retained if only the link route is kept. A limit alone does not close a known reachable counterexample.

This follows ORC-004 (history reconstruction), ORC-005 (production path and information available at the checkpoint), ORC-012 (closure evidence), and ORC-014 (controlled premise and receiving witness). No model weakening or production fix is proposed in this review. The link repair is justified; raw-navigation preservation remains a separate obligation.

## Qualification: unhandled unload warnings can be accepted by the harness

Follow-up source audit, 2026-11-18. This qualifies the counterexample interpretation above; it does not close the original raw-history reconstruction obligation. No browser was started and no active oracle source was changed.

**The reported hard-navigation result does not establish a missing Studio unload guard.** Studio already configures `enableBeforeUnload` for a dirty draft (`authoring.tsx:2007–2008`). Installed Playwright is 1.64.1, whose `Dialog._close` and BrowserContext client dispatch automatically **accept** an unhandled `beforeunload` dialog (`node_modules/playwright-core/lib/coreBundle.js:13954–13959`, `:63808–63821`). That means “Leave Page”; other unhandled dialog types are dismissed. I independently read those installed sources. The research agent's [source correction](webkit-native-host-review.md#source-correction-unobserved-unload-decisions-in-the-raw-navigation-probe) supplies pinned upstream links, native-path distinctions and probe limits.

The prior controlled hard-goto probe had no dialog handler. Its stale server reload can therefore be consistent with a functioning warning that the harness accepted. It does not show whether the warning appeared or was absent. The earlier phrase “receiving/persistence counterexample” must not be read as a confirmed violation of a product promise to preserve unsaved text after an accepted discard. That promise has not been established. Likewise, absence of an explicit human choice in the old test does not mean the automation made no choice: the installed default can supply acceptance.

The current `quick` action now clicks the actual ← compose link and retains the same model and checkpoints. The parent reports WebKit r2395 baseline and repeat both 138/138 with no nondeterminism; selected mutants remain ongoing. This supports the repaired in-app route, and establishes nothing about raw Stay/Leave delivery.

For raw reconstruction, retain the original I/I → hard navigation → same-id quick edit observation, its pending-save schedule, and the dialog decision as an explicit receiving dimension. Separate fresh histories must record a real warning plus **dismiss/Stay**, and a real warning plus **accept/Leave**, including URL/navigation completion and visible/stored source. Dismissed navigation should not be confused with a completed quick-editor transition; accepted discard should not be silently modeled as a source-preserving save. A completed navigation with no observed warning remains a distinct receiving result to investigate. Define any additional raw-path expected result from adopted authority with this premise visible; do not silently revise the current link model or invent a no-loss-after-discard law.

Raw registered reconstruction and explicit dismiss-versus-accept delivery remain open. This qualification withdraws an unsupported missing-guard inference, not the coverage obligation, and makes no production-fix recommendation.
