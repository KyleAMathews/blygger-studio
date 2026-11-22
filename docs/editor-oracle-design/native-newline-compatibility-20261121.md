# Native newline compatibility investigation — 2026-11-21

The initial investigation below ran on unchanged production. The original
generated mixed history, seed `20313694`, path `0`, supplies its RED. A native
listener repair has since been integrated, with a permanent browser oracle and
targeted RED/GREEN/original-defect evidence recorded in the integration addendum.
Broader receiving acceptance remains open; no further old tests are retired.

## What the probes establish

Bundled Chromium `156.0.8078.4` on macOS arm64 loses the final LF on redo when
Enter replaces a selection ending at that LF. This occurs in a sterile textarea
without React. Both Enter and Shift+Enter reproduce it. Replacing the selection
with native `insertText('\n')` reproduces it too.

Preserving the final selected LF and natively deleting the preceding selected
text avoids reinsertion of that LF. The candidate applies only when the
selection contains more than one UTF-16 code unit, ends at the document end,
and its final character is LF. It leaves exactly `source.slice(0, from) + '\n'`
and places the immediate caret at `from + 1`.

Six initial probes, 56 boundary probes, and 40 terminal-candidate probes retain
their raw events and all repeated undo/redo observations. The terminal candidate
preserves the changed-source cases through three cycles, and direct typing
after undo consumes the actual restored selection and abandons redo. The
single-selected-LF replacement still exhibits the browser's no-op-history
defect; the candidate does not handle it. The adopted mixed law already stops
native history guarantees at no-op transactions. This is a separate known
defect, not evidence of a complete native editing repair.

Undo/redo selection differs between representations. Existing laws leave it
unconstrained; subsequent actions must consume the actual selection. An initial
Python diagnostic comparison used code-point slicing for a UTF-16 selection.
`direct-utf16-comparisons.json` corrects that calculation and passes all 40
direct continuations without changing any raw observation.

## Real application experiment

A temporary native `beforeinput` adapter makes the original generated mixed
unit pass twice with its original model, observations and check. The final
adapter also places the final caret in a temporary native `input` capture
listener before React receives the deletion. It retains an actual command input
receipt separately from the source after React handles it. This matters because
a controlled receiver may reject an edit and restore the source synchronously.
Such restoration must not cause the original Enter default to run a second time.

The final selected replay passes twice in 2.4/2.0 seconds and rejects the existing
restored Shift+Enter hard-break challenge. It intentionally skips 1,261 other
registrations. This is a physical-adapter experiment, not a kill of removing a
new production compatibility handler. Ten command controls per attempt cover
supported, refused, throwing, missing, and emulated restoring receivers, with
both Enter keys. All three attempts retain exactly one input per control and
the appropriate accepted/restored source. The restoring receiver is an
emulation, not a real held-region witness.

Independent review confirmed that the current law requires an unprevented
trusted **keydown**, not an uncanceled `beforeinput`. It also found:

- React's synthetic `onBeforeInput` does not register native `beforeinput` in
  the installed React build. Integration needs a native listener.
- `useHeldOut.change` passes the received caret synchronously to `touches` and
  `rebase`. Moving the caret only after React receives the deletion can move a
  hidden region to the wrong anchor.
- Source equality after the command cannot distinguish native refusal from
  receiver rejection. The physical input receipt must retain that distinction.

## Next implementation and acceptance

Use a stable callback ref to attach and remove the native input/composition
listeners for composer, full editor and quick edit, preserving their existing
refs. Keep the helper independent of React so the existing instrumented browser
module can delegate it without introducing a second React runtime. Own and
mutate the new helper through registered oracle routes.

Before adopting production, strengthen the existing laws with generated and
constructed terminal-selection histories, command-refusal controls, direct
continuations, and real hidden/shown-region receiving histories. Check the
full saved draft as well as the visible source. Verify callback cleanup,
composition/picker precedence, all three surfaces, Firefox/WebKit neighbors,
and the original generated replay. The unchanged-production RED, production
GREEN, original-defect restoration mutant, and neighboring command laws remain
required. No law delta is proposed.

## Evidence

All temporary shared-source changes are restored byte-for-byte. Owned process
groups `19902`, `21224`, `22485`, `24418`, and `28585` are absent. Each folder
contains exact source snapshots, raw logs, a hash manifest and a receipt:

- `/private/tmp/blygger-native-newline-candidates-v529han1/`
- `/private/tmp/blygger-native-newline-boundaries-029yvlwr/`
- `/private/tmp/blygger-native-terminal-newline-703k9_y0/`
- `/private/tmp/blygger-native-newline-app-adapter-jkm4o7cz/`
- `/private/tmp/blygger-native-newline-input-receipt-fixed-j3dznl7a/`

The failed predecessor
`/private/tmp/blygger-native-newline-input-receipt-5kljg51j/` is retained as a
setup failure: its temporary diagnostic had a missing closing delimiter and
loaded zero tests. Its source was restored. The corrected successor passed a
syntax check before running. No law failure or kill is credited to the failed
setup.


## Integration addendum

The permanent `editor-browser-newline-history` property routes the existing
mixed source/history model through composer, full editor and quick edit.
It varies selected source and context, command availability, one to three
undo/redo cycles, branch abandonment, both Enter forms, viewport, and the
point where Save occurs. Immediate newline/undo/redo finishes prevent later
input from concealing a React receiving defect. The mixed model, its input and
post-action checkpoints, and its undo-selection freedoms are unchanged.

The design grammar trigger is the existing boundary's more than five laws.
The preservation relation is **named adopted laws**, using the already adopted
mixed model rather than a competing history model. Each new recipe field
supplies a receiving path, source partition, or continuation needed to enforce
that same promise. No law, history budget, seed or no-op limit was weakened.

On unchanged production, the registered `editor-Enter-terminal` history fails
at `step2.state`: redo returns empty source instead of LF. The strengthened
Save observer still reproduces that failure (run `d77ee84a5bc0`). Its completion
receipt comes from the actual trusted Save click and button busy lifetime,
records the public action-error banners, then reads the complete saved item.
The complete composer create roster is retained and judged rather than choosing
the last observed item. An actual rejected-Save receiving control is still open.

Production now binds native `beforeinput` and composition listeners with a
stable React callback ref on all three surfaces. For a changed selected suffix
ending in LF, it natively deletes the selected text before that LF. A temporary
input capture listener puts the final caret in place before React receives it.
Command input receipt distinguishes controlled rejection/restoration from a
command refused before input. Cleanup removes all installed listeners.

The unchanged terminal history passes the repaired production twice
(1.7/0.9 seconds), and `authored:original-terminal-newline-redo` restores the
original failure and is killed. Run `fa1fce2def99` is deliberately partial:
one executed check, 308 skipped registrations, one selected mutant. It is
neither full session acceptance nor a complete mutation audit. Lint on the
changed production/oracle files and the full repository typecheck pass.

Independent review caught a session source-selection omission: exact authoring
source transport was enabled, but session operator exploration still selected
only the formatting module. Session now selects both that module and
`authoring.tsx`. An authored hook-detachment challenge remains to verify that
receiving path in execution. Real hidden/shown-region witnesses, callback
lifecycle/IME controls, and broad browser acceptance remain open.

Evidence is retained under `/private/tmp/blygger-newline-repair-w9b4hqm8/`:
`red-editor-success-receipt/` and `green-editor-production/` contain raw gap
results, logs, process ownership and cleanup receipts. The latter also records
reviewed source hashes. The predecessor `red-editor/` (unregistered property)
and `chromium-newline-family/` (unsupported property-only selection without a
replay path) executed no tests and receive no RED/GREEN/kill credit.

Complete first-pass session runs on Chromium and Firefox each execute all 309
registered checks: 300 pass and nine fail in the new Save-receipt determinism
checks. These are failed file baselines, so the full-file original-defect
challenge is blocked. No complete-file GREEN or mutation kill is claimed.
The old session property, source/history checks, immediate saves and
calibrations pass in those first passes.

A focused diagnostic selects the existing composer terminal determinism check
through the gap wrapper and logs both complete Save receipts without changing
their oracle observations. The only differing path is `creates[0].id`;
`source`, GET status, create status, trusted click, all busy states and errors
are identical. The IDs are generated by the real Worker `crypto.getRandomValues`
call; the public create contract accepts no caller ID. The raw receipts and
comparison are retained in `literal-id-determinism-package-config/`.
This establishes an observation-design issue, not an editing failure. The raw
ID field has not been removed or relabeled. A prospective relational identity
observation with complete raw evidence, or a controlled fixture entropy
provider preserving literal observations, is pending explicit review.

The original mixed generated failure also passes repaired production twice
(1.9/1.3 seconds); the existing restored hard-break-handler challenge is killed
in that selected replay (`87dcf6b3887d`, one check, 1,261 nonselected).
The exact authoring-source path is independently sensitive: detaching the
callback ref's native binding is killed by the registered terminal history
(`46e50d2b4287`, two baseline passes at 2.4/1.3 seconds, one check,
308 nonselected). Neither selected result replaces the open full audits.

The static migration inventory passes with 890 original comparisons, 193 case
declarations and 301 table rows across 29 fixed suites, plus 123 additional feed
comparisons and 38 suite implementations. This verifies mapped inventory and
references; it supplies no semantic loss proof or retirement permission.

WebKit's explicit r2395 host finishes with the same 300 passed / nine failed
receipt-determinism checks across all 309 registrations. This preserves the
host's recorded limits; it is not ordinary Safari or physical iPad evidence.
The first-pass editing checks pass in all three engines, while complete file
acceptance remains blocked by the new literal identity observation.

The original mixed property now also owns `bindFormatInput`. Its original
generated failing history passes production twice (1.7/1.5 seconds), and the
actual restored terminal-LF redo defect is killed by that history in run
`79db5dfbd774`. This is a selected replay, not full mixed-family acceptance.

A real rejected-Save calibration now exercises the receiving path. It externally
persists the actual LF source through PATCH200 (revision1→2), then the real
clicked Save submits revision1 and receives409. Final GET still returns LF;
the actual trusted Save busy lifetime records the conflict banner. The named
calibration rejects at `saved.action errors`, with three complete clean/fault
pairs retained in `stale-save-calibration/`. The outer runner flags this
calibration nondeterministic because its fault-only raw receipts include IDs
and timestamps. No receipt field was removed or normalized. Its selected redo
mutant is not observed by the narrowly selected calibration; no kill or formal
closure is claimed for that run. Independent receiving review confirms these
bounds. This control closes the mechanical witness gap while deterministic
receipt design remains open.

Latest changed-file lint and full typecheck pass. All 16 recorded owned browser
process groups are absent, and temporary package-local diagnostic configs were
removed after exact-content checks. No new commit, PR or further test retirement
has occurred. The next receiving work is the reviewed real hidden-anchor,
shown-refusal and accepted-edge extension plan, after the shared Save-receipt
observation design is settled.
