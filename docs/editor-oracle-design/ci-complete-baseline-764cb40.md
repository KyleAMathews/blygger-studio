# Complete browser baseline at 764cb40

The reviewed baseline-only candidate completed all 14 maintained browser oracle
files twice on the integration source based on upstream `764cb40`. Each pass
executed 4,383 registrations: zero failures and zero skips. The independent
runtime review recomputed both capture fingerprints and confirmed identical
registration keys and recorded public observation hashes. All 1,082 source
files, 78 installed oracle package files and both 78-file derivation inventories
were unchanged.

Each pass contains 1,408 fixed-seed registrations, 1,408 random-named
registrations, 81 checker calibrations and 1,486 determinism registrations.
The CLI seed is `20261118`; the random-named route does not demonstrate fresh
uncontrolled randomness. The 28 browser acquisition receipts cover two distinct
owners for every oracle file, with Chromium `156.0.8078.80`.

The report explicitly states `purpose: baseline-only`, `mutationAudit.status:
not-run` and `results: null`. It establishes no mutant rejection or gap closure.
The default installed runner and full mutation audit remain unchanged.

## Exact receipts

The run output is at
`/private/tmp/blygger-ci-764cb40-e0vnxfbb/repository/build/formatting-oracles/ci764-complete`.
Independent review is at
`/private/tmp/blygger-ci764-runtime-review.l_d9wdee/final-artifact-review.json`.

| Artifact | SHA-256 |
| --- | --- |
| Results | `9dc905078f882cc12ec94e3a41f8d8d87539aa56c2d9f32e497df70a9c8e6f8c` |
| First normalized capture | `a2d5a50465cd5ae831fb6364601e2765686c63a225d8e78f4804b18a1c53119f` |
| Repeat normalized capture | `74d4a5739595c778a6bdb645dcd13b8dc0ed924d4c172019bdc263e70c56a1a2` |
| Derivation | `267f2460f890e45da4d6735452423fd0cbb0bb5bbd989838c859f41f30a7f14f` |
| Independent review | `9f58006a1609874f7fbd1a3216328e61d2c8845ba3083f4560017e34e708cfec` |

## Limits and next gates

This Linux arm64 run used an assembled dependency snapshot and Node 24.8.0.
Repeated laptop sleep/dark-wake intervals prevent an uninterrupted CI timing
claim. A separate fresh Linux install and Node 22.18.0 measurement failed as recorded below.
The candidate has not been accepted as a measured CI duration.

The container lacked an init process. Internal `ps` recorded 40 orphaned
Chromium zombies under PID 1. Docker's external process inventory omitted them;
its apparent absence of zombies was not valid evidence. Eventual container
removal establishes containment, not clean reaping. The separate measurement
uses an init process and retains the cleanup gate.

Three registrations have different call/hit instrumentation across passes
despite equal public observation hashes. The package's nondeterminism judgment
does not compare every instrumentation field. Complete normalized capture
accounting is established; the transient raw capture archive is partial because
its watcher started after some early fast captures had already been removed.

The four-test source loss audit still maps all 140 original observations.
The actual cancellation mutant receipt is now independently accepted; both
clipboard tests remain in place pending final migration/gap review. The frozen original reference audit
continues independently; these baseline results do not replace its report.


## Fresh-install measurement: failed

The separate Node 22.18.0 Linux measurement completed fresh installation, build
and typecheck, then hit its external 1,500-second ceiling. The baseline command
ran for 1,500.391869 seconds and exited 124. Its first pass accounted for all
4,383 registrations across 14 files, with two navigation acquisition failures;
the repeat pass did not finish. No results or summary report was produced.
This is neither a complete two-pass baseline nor an accepted CI duration.

Both failures timed out while clicking a created item's `.item-head`, before a
law verdict. Source inspection found that the driver assumes the target is in
the initial 25 Compose items despite a shared application database and a real
“load more items” control. The failed targets' actual list positions were not
captured, so pagination is a supported harness defect, not the proven cause of
those particular failures. A bounded paging control and failure diagnostics are
being prepared before another complete measurement.

Final identity review confirmed all 1,082 source files, 78 installed package
files and 78 derived runner files were unchanged. The 28 browser launch receipts
belong to this invocation. The init-enabled measurement container was removed;
this does not establish individual browser cleanup.

The preserved partial archive is
`/private/tmp/blygger-remote-ci-20261119-1719/reviewer-final-partial.tar.gz`, SHA-256
`2db634b2b13a8f5ab3bb086e35501dba671acc0e7eb3b1f1c5fec11f2911f19f`.
The candidate remains unadopted.
