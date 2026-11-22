# Singleton toast repair — independent design/source review

Reviewer `/root/review_block_break_oracles`, 2026-11-19. Read-only inspection
of the integrated application, existing workflow oracle, Base UI public
documentation and installed implementation. No production, test, model,
budget or runtime source was changed, and no browser/build/campaign ran.
This document is the only integration-checkout write by this reviewer.

## Verdict

Passing `id: 'studio-feedback'` to the existing `toastManager.add` is a
minimal, source-supported repair for the adopted current-message/singleton
receipt. It keeps the existing Base UI provider, renderer, dismissal and
timer machinery. I found no caller requiring separate concurrent toasts.
The repair is not yet GREEN or accepted mutation evidence.

**TSR-1: the proposed `sheets.tsx#toast` authored challenge needs a transport
repair before its rejection can be credited.** Current browser bundling
reads `sheets.tsx` directly from disk, so ownership alone cannot deliver a
context-specific mutant of that module to the application. The production
repair itself can address the registered RED; a closure claim additionally
needs the actual original-defect mutant received and rejected.

Repeated identical assistive-technology announcements and physical
visibility remain unproved. They are not inferred from singleton DOM count
or the manager's update contract.

## Evidence and identities

The reviewed pre-repair `src/ui/sheets.tsx` has SHA-256
`2ee8677b968a69923a974ad36cb8aa15b5d721e98e5ea0b72388562e157ccdbb`.
Its `toast` function at lines 119–127 has no explicit ID. It passes the
message, `options.duration ?? 2400`, `options.tone`, and low priority to the
private global manager. `ToastHost` supplies `limit={1}`; `ToastList` maps
every retained manager object to a `.toast` root.

The baseline capture
`/private/tmp/blygger-main-linux-j74l_hd2/repository/build/formatting-oracles/main-integration-workflows/run-185-1.jsonl`
has SHA-256
`5f05d2a9eccd36795a0f7e88e1b062aa52b327587f84cf3773415776ff1c4e1e`.
Its first record is a registered fixed-seed failure of
`editor-browser-workflows`, law `completed-link workflow receipt`, at
`step1`, with difference `step1.toastCount must match the workflow receipt`.
The model expects exactly one current toast on feedback-producing actions.
This is a law-comparison RED, not a setup error or timeout. The capture's
observation field is a digest; this reviewer does not invent an exact
received count or a painted duplicate count from that digest.

Existing authority is the already adopted completed-link workflow and
preserved strict toast receipt. The old implementation at base
`28b0c8d642a87e5810ad6eabd95c2d1714c53396` stored one `currentToast`, replaced
it on every call and rendered one keyed `.toast`. The source corroborates
the existing promise; it does not independently create a new law.

Installed Base UI is `@base-ui/react` 1.9.0. Its public
`toast/useToastManager.d.ts:92–98` and bundled component documentation
`docs/react/components/toast.md` under `ToastManagerAddOptions` explicitly
state that adding an existing ID updates the toast in place and refreshes
its auto-dismiss timer. This is a documented API, not reliance on an
undocumented store mutation.

## Independent prediction and actual path

From the adopted receipt alone: after two rapid feedback-producing link
actions, the second checkpoint must contain exactly the second action's
feedback and one raw `.toast` node. A tracker-cleaning link followed by an
ordinary link distinguishes replacing current feedback from retaining the
older message; repeating the same feedback distinguishes singleton count
from append-only delivery even when both texts are equal.

The input-only `workflowStep` predicts the link result and current feedback
without using Base UI output, adding `toastCount: 1`. The real browser driver
executes clipboard/sheet/paste actions, then records every `.toast` without
filtering `data-limited`, ending, hidden or inaccessible nodes. The
registered check compares every expected field at each `stepN`. It already
records rectangles, computed styles and lifecycle attributes as diagnostics;
those extra fields are not a visibility assertion.

The production path is `linkInto` → exported `toast` → private
`toastManager.add` → Base UI Provider/store → `ToastList`/Description. The
proposed constant ID belongs at that existing `add` call. No model, law,
history, seed, budget or checkpoint must change to accept the repair.

## Caller and lifecycle assessment

I searched application and extension TypeScript/TSX for calls and manager
access, including the following groups:

| Existing callers | Assessment of one stable feedback ID |
| --- | --- |
| Authoring links, scan/copy feedback, discard, read-only/hidden-region explanations, hopper/front-page actions, indent and quote feedback | Existing short messages use the shared imperative API; none supplies a separate identity or relies on a returned ID. Latest completion replacing current feedback matches the old singleton. |
| Reading copy/share, hopper/placement/blogroll/subscription actions, read marks and resync | Background and foreground completions already shared one old singleton. Stable ID restores that replacement behavior rather than introducing a toast history. |
| Contacts, Shelf, Discover and OPML import | Same shared feedback channel. Success tone and neutral feedback need to overwrite each other, not retain stale color. |
| Bundled `extensions/inspect/ui/index.tsx` | Both JSON-copy success/failure use the exported API with defaults; no concurrent-toast assumption found. |
| Public extension surface `src/ui/extension-api.ts` | Reexports the same `toast`; no new signature, return value, per-extension manager or identity contract is introduced. Unknown external extensions were not inspected. |

Only `sheets.tsx` creates or accesses this manager. The application mounts
one `SheetHost` beside its RouterProvider in `app.tsx`; route navigation
does not intentionally create separate feedback managers. No production
caller in this checkout passes a custom duration. Existing callers pass
either default options or `tone: 'ok'`.

Source inspection of `toast/store.js:118–211` supports these consequences:

- **Active replacement:** an existing active ID calls
  `updateToastInternal(id, updates, true, true)` and returns without
  appending another store object. The latest description replaces the old
  one. The renderer remains keyed by that ID.
- **Tone:** the wrapper always supplies its own `type` property, including
  `undefined`. The store spreads updates over the previous toast, so neutral
  feedback clears a previous `ok` type; it does not inherit stale success
  styling. Success feedback similarly replaces the neutral type.
- **Timer:** the wrapper always supplies `timeout`, so each replacement
  clears/reschedules the timer at the latest duration. Focus, hover and
  window-focus pausing remain Base UI behavior. Positive custom durations
  still pass through. Base UI treats nonpositive durations as disabling
  automatic dismissal; that behavior already exists in the merged
  migration and is not introduced by a stable ID.
- **Ending/removed toast:** re-adding an ending ID removes that ending store
  object and inserts one starting object with the same ID; a fully removed
  ID is added normally. `ToastRoot` explicitly reinitializes the retained
  root when a starting lifecycle begins. An old timeout is cleared when
  that toast closes; a new timer is scheduled for the new lifecycle.
- **Dismissal:** the same Close control still closes the current object.
  There is no exposed generated ID for callers to cache or collide with.
  The literal ID is private to this manager; it need not be a global DOM ID.

These are source predictions. Actual timeout, ending-state revival,
focused dismissal and tone transitions were not run by this reviewer and
are not proved by the completed-link oracle's current immediate receipt.

## Repeated accessible updates and remaining limits

The migration's low-priority root is a nonmodal `dialog`, described by its
Description. Its viewport is a polite live region with `aria-relevant`
including text and additions. A changed description remains linked to the
same root and updates its text. This supports accessible current-content
semantics without changing priority or the dismiss button's name.

An identical repeated message can retain the same text in the same DOM
node. Base UI increments `updateKey` on same-ID updates, but this renderer
does not use it to remount an announcer or replay an animation. Therefore a
new screen-reader announcement or visual pulse on every identical repeat
cannot be promised. The old keyed renderer remounted its node, but source
alone does not establish how a particular screen reader announced either
implementation. This is an explicit receiving-evidence limit, not a reason
to append duplicate messages or narrow the raw-count check. An adopted
announcement-per-action obligation would need its own precise checkpoint
and receiving test before any further implementation change.

## TSR-1 — authored mutation delivery is currently incomplete

**Claim challenged:** add `owns: 'src/ui/sheets.tsx#toast'` and delete the ID
in an authored mutant to prove the singleton repair.

**Source evidence:** `browser-source-oracle.ts` captures the gap loader's
context-specific bytes only for `authoring.tsx?oracle-application`, then
calls `formattingApplicationBundle(code)`. That bundler supplies the
authoring receiver plus delegated formatting/links/Draft factories. Its
generic file loader uses `readFile(args.path)` for `sheets.tsx`. Watch edges
and raw imports invalidate/rebuild the application query, but rebuilding
still reads the unmutated disk sheets module. The verifier explicitly
compares ordinary inputs with disk hashes; it does not substitute the
authored in-memory sheets patch.

**Smallest distinguishing experiment (not run):** after the singleton fix,
select the authored mutant that deletes the stable ID. Confirm its `find`
matches once in the owned function, and record the sheets source/hash
received by the bundler. The current path is predicted to use the fixed
disk bytes, so the target defect would not reach the app. A GREEN baseline
or declared ownership cannot substitute for that delivery receipt.

**Repair/gate:** extend the existing context-specific supplied-source
mechanism to sheets (or provide another independently reviewed equivalent
delivery path), distinguish supplied sheets from disk inputs in metadata,
and demonstrate that actual mutant bytes reach the receiving application.
Reuse the existing raw-count/current-text law and histories. Then require
the deleting-ID mutant to fail at the intended `stepN.toastCount`
comparison on a registered reproducible route. Setup, transport, timeout
or source-hash errors are not kills.

The new ownership is bounded to the completed-link receipt exercised by
this property. It is not evidence of complete tone, duration, dismissal,
extension or assistive-technology coverage for the whole toast API. Do not
infer whole-function gap closure from a single authored mutation.

## Acceptance boundary

Source review accepts the proposed one-property production repair for the
existing singleton receipt. It does not approve changing expected counts,
filtering retained nodes, reducing campaigns or treating limited nodes as
invisible. The registered workflow RED predates the proposed repair.
Still required: the unchanged oracle GREEN, reviewed/verified sheets
mutation delivery, original-defect registered rejection, and the existing
integrated unsampled gap/deletion gates. Physical visibility, actual
assistive-technology announcements and the additional lifecycle predictions
above remain separate receiving claims.

This focused design/source review applies ORC-001/002/003/005/006/009/010/
011/013/014 to the named authority, independent prediction, receiving path,
failure distinction and limits. ORC-004/007/008/015/016 have no newly edited
grammar, campaign, stateful model, declared reach or oracle file to assess;
those existing controls must remain unchanged. This versioned record binds
the reviewed pre-repair source and RED capture under ORC-012, and makes no
full-oracle audit or toast bug-class closure claim.
