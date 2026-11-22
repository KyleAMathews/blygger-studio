# Original-test source loss audit archive

This directory archives **14 result artifacts** from a source-only loss assay at
`049b5a7bf9661a22ff4cee31b156b7dd2cbee194`. It is a result archive, not a portable
copy of the frozen source tree or a runnable oracle environment. The two packaging
files, `README.md` and `package-manifest.json`, were added afterwards for
LOSS-PACK-001; they do not change the original 14 artifacts.

Start with [the assay readout](final-source-loss-assay.md). It records source traces
for 140 formatting observations: 91 formatting-unit, 21 links-helper, 11 formatting
browser and 17 structural browser observations. The raw structural result also
retains two separate setup observations. All raw scanner JSON is preserved within
[the collation](collated-traces.json), as well as in the per-source artifacts.
Source preservation does not establish runtime passing, whole-suite conformance,
usefulness, permission to retire tests, or PR readiness.

## Archived and omitted inputs

[The package manifest](package-manifest.json) lists the exact SHA-256 hashes of all
14 original archived files. [The frozen source manifest](manifest.json) identifies
the original Git blobs, 304 candidate source/config inputs, package pin and support
input hashes. It is preserved verbatim, including its temporary absolute paths.

The following **bytes are omitted** from this directory:

- The frozen `candidate/` tree containing 304 source/config inputs. Its manifest is
  an identity inventory; the base HEAD alone cannot reconstruct its uncommitted
  changes. An eventual checkout is the same candidate only when its bytes match
  the recorded hashes.
- Eight `latest`/`authority` original-test snapshots. Git recovery is described
  below; staged deletion does not remove their historical Git blobs.
- The 22 original `support/` snapshots and the added project glossary snapshot.
  These include Field Lab instructions/instrument and installed oracle skills,
  glossary, checklist, guides and runtime source. Their hashes and the pinned
  package identity are retained, but their bytes are not archived here. The
  external Field Lab inputs have no portable Git recovery authority in this
  packet. Reobtaining a similarly named skill is not proof of identical bytes.
- The original assay's staging/status/during-scan files, source-loss import
  proposal, parent ledger and external runtime/component receipts. Some result
  artifacts refer to them; those references do not mean they are included.
- Dependencies, browser binaries and runtime captures. The pinned oracle package
  identity does not attest a complete installed dependency tree or runtime.

The recorded oracle package is `@tanstack/oracles@97a4e7a`, resolved from
`https://pkg.pr.new/TanStack/oracles/@tanstack/oracles@97a4e7a`; the original manifest
retains the lock integrity and installed package metadata hash. Reconstructing
support or candidate inputs requires independently obtaining the bytes and
checking their recorded hashes. This archive alone cannot reproduce execution.

## Recover the original tests

Run from a repository checkout whose Git object database includes the revisions
in `manifest.json`. This writes all eight copies into a new temporary directory
outside the checkout and verifies each SHA-256 before writing it:

```sh
python3 - <<'PYCODE'
from pathlib import Path
import hashlib
import json
import subprocess
import tempfile

packet = Path("docs/editor-oracle-design/loss-audit/final-source-049b5a7")
manifest = json.loads((packet / "manifest.json").read_text())
out = Path(tempfile.mkdtemp(prefix="blygger-original-test-recovery-"))
for original in manifest["originals"]:
    for label in ("latest", "authority"):
        identity = original[label]
        spec = identity["revision"] + ":" + original["originalPath"]
        data = subprocess.check_output(["git", "show", spec])
        if hashlib.sha256(data).hexdigest() != identity["sha256"]:
            raise SystemExit("SHA-256 mismatch: " + spec)
        target = out / original["key"] / (label + "-" + Path(original["originalPath"]).name)
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
print(out)
PYCODE
```

A second recovery route is `git cat-file blob <gitBlob>` using the blob ID in the
same record; verify its SHA-256 as above. Recovery requires those Git objects to
be available. The authority revision is
`28b0c8d642a87e5810ad6eabd95c2d1714c53396`; latest is the frozen HEAD above. Three
originals are byte-identical between the two. The formatting e2e original differs
only in the thread-kind control's radio-to-button selector, as the assay records.
These copies are evidence, not new executable tests to add to the checkout.

## Resolve recorded paths

The original frozen root was
`/private/tmp/blygger-prep-pr-20261119/final-original-loss-refresh`.

| Recorded pointer | Recovery or rebasing rule |
| --- | --- |
| `<frozen-root>/scanners/<source>/<report-or-trace>` | Use this directory's same `scanners/<source>/...` suffix when it is one of the 14 archived files. |
| `<frozen-root>/scanners/<source>/<latest-or-authority>.ts` | Use the separately recovered original copy above, checking its recorded identity. |
| `<frozen-root>/candidate/<repository-path>:<line>` or `candidate/<repository-path>:<line>` | Read `<repository-path>:<line>` only in a checkout matching that candidate input's SHA-256 from `manifest.json`. Line numbers describe the frozen bytes. |
| `<frozen-root>/support/...` | Omitted support snapshot; obtain and verify its exact recorded bytes separately. Package support may be recovered from the pinned package; external Field Lab support has no complete recovery recipe here. |
| Other `/private/tmp/...` paths | External historical evidence reference. It is not packaged unless named in `package-manifest.json`. |

## Preserve the audit boundaries

The missing browser password-form/composer-arrival setup observations remain
explicit. Loaded-document setup, `keyboard.type` to `keyboard.insertText`, API
fixture delivery/acquisition, added redo, explicit unload choice and mobile pane
setup also differ. A separate navigation property recovers the actual hard-goto
journey; a SPA link alone is not credited. Small Chromium viewports do not establish
Safari, WebKit or physical-device coverage.

The source assay does not replace the outstanding current-owner receiving,
mutation accounting, CI/aggregate command, selected-subtree authority or broader
backend interference work. Later runtime results belong to their separately
bound receipts. Historical survivors, NUL/completion obligations, stale warm
GREEN and unfavorable setup/runtime evidence keep their original meanings.
