# Publish source receipt: authority and receiving audit

Read-only audit, 2026-11-19, integration HEAD
`2d153071e83261e62be5a1ec926c3f1f3e2fe26a` plus the working oracle delta.
The pinned `oracles-review` skill, checklist v1 and glossary were read in full;
the law-discovery and tension-scan cards guided the authority distinction below.
This agent changed no production/oracle source, package, active campaign or
browser process. No probe, test, build or browser job ran. This is a bounded source
finding and proposed receiving scope, not a reproduced bug or closure claim.

## Finding and authority status

**The accepted formatting oracles do not currently promise preservation across
the complete `publishTangle` dispatch-to-source-receipt path.** They establish
related working-copy preservation, but their quantified domains deliberately
separate saves, departure and historical restore. Treating a publish result as
just another save acknowledgment would ignore an actual whole-source replacement
and contradict those limits.

| Source | Promise already supported | Limit relevant here |
| --- | --- | --- |
| `editor-draft.oracle.test.ts:6–29,39` | For edit/save histories, acknowledgment discharges submitted edits only; source remains the latest input; a superseded save returns false. Its `pendingEdit` construction predicts later source `y` after an earlier save completes. | Explicitly excludes `Draft.accept`, server accept/reset, paced scheduling and real network/UI delivery. Grammar has no publish or server-source input. |
| `editor-navigation.oracle.test.ts:14–24,80` | Stay/rejected departure preserve latest input; in-app compose waits for its save; explicit Leave accepts last-committed content. | Departure histories, not successful publish/rewrite delivery. It explicitly does not promise arbitrary concurrent save schedules or retention after accepted discard. |
| `editor-receivers.oracle.test.ts:15–28,118` | A held historical restore prevents input while pending; success receives arranged historical source, rejection retains working source; an immediate ordinary save consumes the accepted/retained source. | Quantifies one real restore. Its immediate save has no later input. It does not establish every asynchronous source replacement or choose publish reconciliation. |
| `test-ui/state.test.ts:165–176` | Existing generation history retains text typed during generation; a later save persists that text. | Generation-specific ordinary test, not an adopted publish law or registered publish receiving history. The test explicitly applies a revision guard around generation's response. |
| `test-ui/authoring-revision-session.test.ts:128–226` | Clean/dirty quick-editor baselines, pending queue continuity and historical restore/navigation behavior. | The Editor harness truncates before `withdraw`/`publish`; ItemRow's note confirmation is inert. Neither drives `publishTangle`. |
| `e2e/tangle.spec.ts:23–106` | Existing upstream examples receive rewritten source after successful confirmed publishing, with no intervening edit; the first example checks that a later autosave does not restore old spans. | No later-input schedule, decline/error/source-read rejection, or quick-editor receiving case. Existing wire assertions are separate protocol evidence, not a new model to copy into formatting oracles. |

No independently adopted generic **publish reset/late source delivery** law was
found in these oracle declarations or their cited sources. The user-approved
preservation intent and the generation example are strong reasons to investigate
this path; they do not select an exact publish-time freeze, reconciliation or
recoverable-conflict policy. This is not a request to reapprove any existing
save/restore law, nor permission to weaken one.

## Actual entry points and gates

`src/ui/authoring.tsx:806–831` defines `publishTangle`:

1. Await `write(command)` with the existing ordinary publish command.
2. On typed `BlyggerApiError` code `tangle-confirmation-required`, show the
   existing count/parts confirmation. Other failures propagate unchanged.
3. Decline returns `undefined`. Confirm awaits `write({...command,tangle:true})`.
4. Read the existing item using `BlyggerApi.getItem`, then return its
   `contentMd` as `done.source` together with the publish result.

The comment explicitly explains why taking up rewritten source matters: keeping
the original spans can save them back and recreate the work on a later publish.
That intent is in tension with accepting a stale replacement over later input;
neither concern can be deleted to claim the problem solved.

| Caller and real activation | Before publish dispatch | During retry/source delivery | Source receipt |
| --- | --- | --- | --- |
| Compose, `#publish-btn` → `action.run(publish)`, `1098–1114,1200–1207` | `save()` snapshots current text/kind and declines continuation if they changed before its completion. | Busy disables Save/Publish/Full Editor. Composer textarea and kind controls have no busy readonly/disabled gate; modal sheets temporarily trap focus. | `done.source` feeds the published banner. It does not overwrite composer text. Reset to empty is separately guarded by `current.current.text === text`. That string guard is existing behavior, not a generic edit-event/kind-reset law. |
| ItemRow quick edit, its Publish button → `mutate(publishRow)`, `1351–1363,1420–1426,1479–1518` | `acceptFresh()` accepts only a clean matching baseline; dirty input is saved and must still be current. Note confirmation precedes helper dispatch. | `action.busy` disables Save/Publish. Quick textarea has no readonly/disabled gate and `quickEdit` still calls `Draft.edit`, React `setText` and clears saved feedback. Quick editing has no per-edit autosave timer. | Every defined `done.source` is unconditionally passed to `Draft.accept` and `setText`. |
| Full Editor, `#publish-btn` → `operation` → publish callback, `2099–2104,2188–2205,2876–2886` | `operation` awaits a current save. Note confirmation precedes helper dispatch. | Busy disables action buttons. Textarea readonly, structural/tool disabled state and picker absence depend on `replacing`, not busy (`2483,2502,2531,2557,2567–2575`). Publish never sets `replacing` or `replacementPending`. Input schedules a background save after 400ms. | Every defined `done.source` is unconditionally passed to `Draft.accept` and `setText`. No comparison to the editing event at dispatch/read is made. |

`useAction.run` counts pending actions and releases busy in `finally`
(`authoring.tsx:103–130`); it is not an editing lock. By contrast, historical
`restore` explicitly sets/release `replacing`, and `generate` already checks
its captured Draft revision before applying response source (`2110–2177`).
Those are explanatory source facts, not authority to force publish into one
of their different policies.

`Draft.accept` calls `edit(source)` and establishes a clean accepted baseline
(`src/ui/draft.ts:8–11`). Its use after a later accepted input can therefore
both replace that input and remove the dirty indication consumed by navigation.
Changing `Draft.accept` globally to ignore replacements would also change
explicit restore; it is not a justified general repair for this caller question.

The existing write queue does not close this UI window. `createDraftAction`
serializes the POST and awaits collection refreshes before returning
(`src/ui/data.ts:551–617`), but the helper's final `getItem` is outside that
command handler. `createPacedDraftAction` retains command/save ordering; it
does not freeze textarea input or reconcile a later source response. GETs may
be transported through `createReadBatchFetch`, so counting arbitrary network
GETs is insufficient to identify the helper's source receipt.

## Smallest source-supported counterexample hypothesis

Keep one quick-editor instance open in the default All view, with input `X`.
Activate its real Publish control, accept the existing count confirmation,
and hold the successful confirmed-publish response after the server has
committed but before the browser receives it. Type a distinct ordinary suffix
to create `Y` through the actual quick textarea. Record its trusted input,
complete source and selection before releasing delivery. If the subsequent
helper read supplies rewritten source `R`, distinct from `Y`, the present
caller unconditionally accepts `R`. Source reading therefore predicts local
`Y` is replaced. Quick edit's lack of autosave makes this the smallest initial
receiving experiment; it avoids racing a separate 400ms background PATCH.

For the full editor, the same source argument applies, but the driver must
record/control later autosave delivery rather than ignore it. Depending on
when that save reaches storage, the read may return newer source and conceal
the overwrite, or storage may later retain input no longer displayed locally.
The hypothesis concerns the legal delayed-receipt schedule; it is not a claim
that every normal publish loses text.

This schedule has not run. No production RED, registered law violation,
measured reach, survivor or kill is claimed. The existing oracles miss the
path because none activates Publish; shared `Editor` ownership and the
restore setup's API publish do not supply that missing observation.

## Client-only oracle work available next

There are two separable extensions to propose; neither needs a new endpoint,
wire format, tangling parser or publication algorithm.

**Existing no-later-input source consumption:** the upstream no-edit receiving
behavior can become another operation/driver of the same replacement-receiver
oracle, sharing its accepted-source → ordinary Save → real submitted/stored
source check. Treat the server rewrite as an independently declared provider
input and verify its actual delivery. Do not derive expected source from the
DOM, `Draft.text`, a later server GET output, or production's tangling parser.
Retain restore's existing law/histories; a publish operation needs its scope
and authority stated explicitly rather than changing “held restore” in prose
without a corresponding law/model/history change.

**Later-input delivery:** propose a narrow client preservation law before
implementing the new action dimension. A useful intent is: for each edit the
editor actually accepts after publish dispatch, later delivery must not silently
erase that edit or acknowledge it as though it belonged to the submitted
snapshot. This intent still needs a precise public outcome for a complete-source
comparison. The competing choices are below; selecting one is not an oracle
enforcement detail.

- Freeze editing before a publish operation can replace source, then release
  it on decline, failure or completed receipt. The independent model must
  require that chosen gate and unchanged input during the hold, rather than
  infer the rule from an observed readonly flag.
- Keep editing available and retain later input, with an explicit handling
  policy for the server rewrite. Merely retaining the original span text can
  reintroduce spans on the next save/publish; that consequence cannot be hidden.
- Reconcile a disjoint later edit into the server rewrite, or expose both
  versions as a recoverable conflict. Exact mapping, overlapping edits and
  visible recovery become new client behavior to specify. Generic full-source
  merge logic is not implied by existing save acknowledgments.

A bounded first extension can generate ordinary suffix edits outside a declared
rewritten region, both viewports, editor/quick surfaces, no edit/one later
edit/revert-to-same-string, and delivery before/after the later edit. These axes
distinguish source-string equality from edit-event identity and preserve the
ordinary no-edit neighbor. For full-editor inputs, establish that no extension
region hides/refuses the chosen suffix; the public textarea may otherwise be
the `useHeldOut` projection rather than the entire stored source. These are
proposed grammar and host premises, not measured states.
Do not silently add a new dirty-baseline, exact caret or automatic retry promise.

Required receiving checkpoints are actual dispatch/confirmation/retry input,
held delivery and editable/readonly gates, native edit receipt, immediate
pre-release whole source, delivered source premise, and an independently
established settled/render opportunity before observing final whole source,
saved/error feedback and the next ordinary Save's submitted/stored source.
Waiting until expected text appears would conceal failure. A failed/missing
host event, wrong item or absent response is setup evidence, not a law kill.
Route/provider work must release held responses and drain observed promises
in `finally`, retaining primary failure separately from cleanup diagnostics.

Keep canceled confirmation, initial nonconfirmation failure, confirmed retry
failure and post-publish read failure as distinct proposed receiving paths.
Post-publish read failure can happen after the server committed: a requirement
to roll back, retry, republish, or claim that nothing published is a separate
semantic/API decision, not warranted by the existing action-error banner law.

## Scope boundary and provenance

The immediate source audit can be continued with controlled client inputs and
existing real handlers. Defining minted IDs, span/link rewriting, cross-client
publication order, revision API changes, exactly-once retry or rollback would
touch the protocol/API design gate; this document makes no such proposal.
The current contract's existing confirmation code/flag is read as given.

Reviewed source hashes:

| Input | SHA-256 |
| --- | --- |
| `src/ui/authoring.tsx` | `4f9f069d43264ebab1ad7329be1b918c8cd7ea89a3f956435970ee976a032025` |
| `src/ui/draft.ts` | `cc3ee87d1e7233a77ae1a8ca5c395455efe5e1a65b9b209b1166e7d990d054ae` |
| `src/ui/data.ts` | `3d21ea5b641344212f383b9cb900243addf7e59a44727bacbcff27416e3fe25d` |
| `src/ui/paced-write.ts` | `15947d7139ee852d21ed40c912eefb718ec8d972671bb55ce95ab6da93f6fcc6` |
| Adopted Draft oracle | `f3bd7714e568cbae0215649bfa365302f9ab34166398e620441a3effded9c9e1` |
| Current replacement oracle | `b443b6abbc0f682f9fe43eba5679f7f968a0466407c18232d379fccc92ad9df8` |
| Current replacement driver | `a50f521926a04106045b9fbfea2682d644dd1496b57c7d4a78465ba058ffb088` |
| Upstream tangle examples | `4832723b02f364aaef2fc6685c9ea8ceb58f42a643665031a8bba48742e0af61` |

The sixteen scoped inputs were reread/hashed after writing. Concurrent parent
work changed `sheets.tsx`'s toast ID and the completed-link oracle's diagnostic
message; the confirm function and absence of a publish action remain unchanged
on inspection. The eight inputs bound in the table, the navigation oracle,
receiver model, write queue, read-batch transport, state/session tests and
contract route retained their inspected hashes. This is not a whole-worktree
freeze claim.

This is a focused authority/production-path assessment under ORC-001/005/014,
with ORC-008's later continuation distinguishing save from replacement. It
does not claim a new/repaired/full oracle audit under ORC-012. No oracle/model,
grammar, campaign, calibration or declared state was changed, so no execution
or bug-class acceptance follows from the document. The earlier
[upstream integration review](integration-upstream-receiving-review.md) and
[accepted-source rebase](integration-draft-accept-rebase.md) retain their own
separate evidence and limits.
