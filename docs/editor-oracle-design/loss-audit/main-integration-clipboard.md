# Clipboard retirement preview rebased onto main

2026-11-19. This is a source-only integration update to
[the clipboard loss audit](final-clipboard.md), using the Field Lab
`loss-audit` instrument. No browser, oracle campaign or heavy test ran.
Both clipboard tests remain present. No runtime/test source or retirement
was changed by this update.

Integration checkout:
`/Users/kyle.mathews/programs/blygger-studio/.worktrees/oracles-main-integration`.
At inspection, `HEAD` and `origin/main` both resolved to
`2d153071e83261e62be5a1ec926c3f1f3e2fe26a`. The earlier loss audit's base was
`28b0c8d642a87e5810ad6eabd95c2d1714c53396`. The original checkout and its
frozen reference run were not modified or polled.

## Upstream inventory for the four retirement targets

Compared the exact Git blobs at those two commits, separately from this
checkout's already staged deletions. This inventories upstream deltas;
it does not reopen the other agents' full semantic loss audits.

| File | Upstream delta | Added tests or observations |
| --- | --- | --- |
| `e2e/format-shortcuts.spec.ts` | Exactly one action selector: the existing thread-switch click now uses role `button` instead of `radio`. Its input source, click, following value assertion and all other bytes are unchanged. | None |
| `e2e/markdown-structure.spec.ts` | Byte-identical. | None |
| `test-ui/format-shortcuts.test.ts` | Byte-identical. | None |
| `test-ui/links.test.ts` | Byte-identical. | None |

For the changed formatter file, replacing its single new `button` line
with the old `radio` line reconstructed the entire old blob byte for byte.
Its SHA-256 changed from
`fc12dd43513125d2d634bb3782d1ebf13f2a3fad1bfd4d495f5dff7d39c1df08` to
`002362f86b4a855feb93c8ed02014db9945a453b618c5fe4df001ba41cd3a89a`.
The inventory's complete per-file hashes and exact one-line upstream diff
are preserved in the immutable packet below. The selector change concerns
the receiving path through the current UI; it supplies no new execution
evidence for retiring that test.

## Clipboard source and retained upstream behavior

Latest main's `e2e/compose-pwa.spec.ts` SHA-256 is
`a377efa8cc1ae5cce926d6c9de989feb10e5ed39a7f00e3fae2d37aae4af74b0`.
Its two clipboard/paste test bodies are byte-identical to the previously
audited bodies at lines 145–186:

- `link from clipboard strips trackers and links the selection, or asks for a URL`
- `pasting a lone URL over a selection links it, in the composer and the editor`

Consequently no new clipboard source observation needs to be recovered
from the upstream delta. The earlier action/observation mappings and C1–C3
restoration analysis still describe those exact source bodies.

Upstream did change four lines in tests that the preview retains:

1. Filter counts locate `.toggle-group-count` instead of `.n`.
2. The initial fragment control is a `button` with `aria-pressed="true"`,
   replacing the checked-radio assertion.
3. The switched thread control has that same button/pressed assertion.
4. The same-task caret test switches kind by clicking the thread button
   instead of locating a radio.

The rebased candidate retains all ten surviving test bodies byte for byte
against latest main, including these updated observations and action. It
removes only the two named audited tests, the now-unused `setClipboard`
helper, and updates the same coverage-header comment as the old preview.
No `setClipboard` references remain in the candidate. Clipboard permissions,
the clipboard-reading helper, other helpers and all other test bodies stay
as latest main supplies them.

## Immutable preview and read-only validator

Packet: `/private/tmp/blygger-main-integration-clipboard.8gx1JM7B/`.
Files are mode `0444` and its directory is `0555`. The source candidate lives
only in this scratch packet; it was never copied over the real test file.

| Artifact | SHA-256 |
| --- | --- |
| Frozen `compose-pwa.main.ts` | `a377efa8cc1ae5cce926d6c9de989feb10e5ed39a7f00e3fae2d37aae4af74b0` |
| `compose-pwa.candidate.ts` | `a01eca5e1b1858e70cf08b8ea264a72b6ebb2bc281c4dcfc235ae68fe1f339c1` |
| `compose-pwa.patch` | `6419642cc93fb63f9c48cad442ac8ea7288f9428d681855dd0d4c2920cdda5f7` |
| `provenance.json` | `a026d485094af37e3ebb6a6c1f80fb9e766d75477b070e2b64c77ecf2dff03ef` |
| `validate.py` | `f6de8468c5af9f1fe8447aa97429de5c3246d6b1611da0534f7da372da078251` |
| `validation-preview.json` | `3b5cb4ec38f309596ce8a0918a2ddd98a23910de71cae188971ce631fc4de0f8` |
| `upstream-retirement-diff.patch` | `5c110d2c120e3358292db6e9bd1c543a53608dab6d27876cb39c6ac57a7e8d1e` |
| `upstream-compose-diff.patch` | `a4a991623ab10e94910e733bad1e3ad5d9441b80768e9642ed3e5b447950b43b` |
| `checksums.json` | `b5af26fb663330be4442ea735dfed279a84f901db543d89b1722a0525d627540` |

The patch bytes happen to equal the earlier preview: all its hunk contexts
are unchanged upstream. Its old base/candidate hashes and provenance are
nevertheless superseded for this checkout; use this new packet's hashes.

Before application, this command passed:

```sh
python3 /private/tmp/blygger-main-integration-clipboard.8gx1JM7B/validate.py --preview
```

The validator performs no writes. It verifies the frozen base, reviewed
patch/provenance, exact in-memory and frozen candidate, exact two removed
names, 12→10 test inventory, ten unchanged retained bodies, no helper
references, and the real file's equality to the expected source for its
mode. `git apply --check` also passed without applying anything. Running
the validator in applied mode currently refuses with
`current test file is not the exact reviewed applied candidate`, confirming
that the actual source still contains the tests.

Only after final acceptance and the parent's application of the exact
reviewed patch, run the same validator without `--preview` to verify the
actual retired file. Neither a successful preview nor patch applicability
authorizes that application.

## Execution gate remains open

The integrated workflow registration, model, workflow driver and application
driver hashes still equal those audited for the original reference:

| Integration file | SHA-256 |
| --- | --- |
| `test-ui/editor-workflows.oracle.test.ts` | `28670d806e5c214fc533677ec7024994f36a8419be9c300bdbfe8917b4fe123b` |
| `test-ui/editor-oracles/workflow-model-oracle.ts` | `ad252e25919b9915deb98392fe5291f57f8e97853a441f07b94f826ebf8212e8` |
| `test-ui/editor-oracles/workflow-driver-oracle.ts` | `2cb9e0c5d8893e876374a683b4caeca895ccc00b758c289dfe3fc7d11160a181` |
| `test-ui/editor-oracles/application-driver-oracle.ts` | `7b30f54e51005b02057c213fa0dcdea016b5549672452960eaa317b0c561d9b7` |
| Current `src/ui/authoring.tsx` | `4f9f069d43264ebab1ad7329be1b918c8cd7ea89a3f956435970ee976a032025` |
| `workflow-cancel-inserts.json` | `f32429d786ef59dccdb2af65677649a45a45a5e0c912517afeb971311f698201` |

The exact cancellation challenge still applies once to current authoring.
Its required selector is `authored:workflow-cancel-inserts`. This is source
applicability only. Current authoring differs from the original reference's
`863d354…` production hash, so earlier baseline or mutation evidence cannot
be presented as execution evidence for this merged receiving implementation.

Before either clipboard test is deleted, retain the completed appropriate
current-runtime campaign, its unchanged pre/post input manifest, direct
records for all four original desktop/mobile constructions and the three
difference-bound restoration calibrations, and the actual cancellation
challenge's registered behavioral rejection with matching mutation metadata.
Setup failures, timeouts, reach alone and partial baseline passes remain
insufficient. The original full reference's report/loss gates remain open
on their own terms; this rebase neither completes nor substitutes for them.
