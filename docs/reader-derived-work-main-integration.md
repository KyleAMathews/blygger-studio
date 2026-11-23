# Reader derived-work main integration

The [PR preparation follow-up](reader-derived-work-pr-review.md) records the
subsequent concurrency repair, oracle evidence repairs, and current source cut.
The source cut below remains the earlier main-integration evidence.

2026-11-22. This record covers the local source cut based on `dec2984` after
integrating main's #171 work. It supersedes the migration/source layout in the
[initial evidence](reader-derived-work-oracles.md); those earlier RED/GREEN
receipts and unresolved broader audit results remain recorded there.

## Authority and preserved behavior

The approved #170 work-preservation law remains: preserve the correct result
while derived work follows changed inputs and requested output. #171's
[follow-up by Venkat (GitHub vgururao)](https://github.com/blygger/blygger-studio/issues/171#issuecomment-7085511862)
adds the adopted read-state direction: newer applied marks/clears advance
`marks` alone and preserve Reading cursors. The merged polling-cache property
and its rejecting calibration are retained. Held-item selection excludes
imports whose subscription no longer exists, before page cutting, including
Raw. These are existing client decisions brought forward from main.

The final layout has one ranking counter:

| Migration | Role |
| --- | --- |
| `0056_reader_order_inputs.sql` | Existing `reading_order_state.inputs` counter |
| `0057_read_marks_domain.sql` | Existing `marks` domain, independent of Reading cursor generations |
| `0058_reader_work.sql` | Refresh ranking dependencies using `inputs`, scope hopper invalidation, expire cursors on own pins, and invalidate proofs carried across the old triggers |

No second ranking counter is added. Position materialization is still prepared
after cursor validation and on every attempt. The one-time upgrade reset is
needed because repairing triggers affects only future writes; it cannot repair
a matching receipt produced under the old dependencies.

## Histories and models

The contract × history × path × observation boundaries from the initial record
remain. The following histories strengthen their receiving boundaries:

- The generated component grammar adds scanning and clearing between pages.
  The same independent array predicts the next identities and read state.
  The saved cursor remains valid for marks, while genuine membership/ranking
  changes still invalidate it. Constructed reach requires an actual valid
  saved continuation at the marking checkpoint.
- Both full owner HTTP scales contain orphan imports: 3 beside 25 held entries,
  and 431 beside 5,760. Normal and Raw reads must select the newest held item;
  the larger witness marks/clears between its six 50-row pages. The shared
  newest/pace control continues to expose derived overhead separately from
  admission and validators.
- The cache-validity grammar adds migration at arbitrary points in its source
  histories. It reconstructs the predecessor's missing subscription-insert
  dependency: remove a subscription, rebuild while absent, reinsert without
  moving `inputs`, then execute the real parsed 0058 statements. Cached pages
  must agree with fresh ranking immediately after migration.
- The pin-cursor grammar varies 4–8 entries and fresh versus carried cursors.
  For the carried case it installs the actual predecessor version trigger,
  obtains a page, pins the oldest item, applies the real migration, and checks
  the saved continuation. Both fresh and carried rank-changing pins owe 409.

The migration helper reads the actual `TEST_MIGRATIONS` statements; it does not
copy the production repair into a test. Native calibration drivers omit each
upgrade reset separately. The normal predecessor pin trigger comes from the
real migrations through 0057. The missing subscription-insert trigger is the
specific predecessor premise, not a fabricated final-schema promise.

Grammar reconstruction now includes #171's orphan and scanning failures plus
both carried-proof upgrade failures. Ablating orphans loses pre-projection
selection errors; ablating scanning loses marks/cursor coupling; ablating the
upgrade point loses stale proofs that fresh post-migration writes cannot
produce. Numeric ranges and run budgets are preserved. The component action
grammar remains bounded by 16 steps, cache-validity by 20. The two owner scales
remain finite witnesses. Unknown actions/nonpositive widths remain outside
the grammar; malformed cursor requests remain explicit valid actions.

Design grammar was reused because the model changed. The preservation relation
is the named laws at each read, with the same array model and cache-versus-fresh
trusted base. New actions describe different input histories; they add no
production counter logic to the model. Upgrade timing is necessary: a fresh
post-migration source change cannot distinguish a repaired trigger from a
carried receipt that already claims to be current. No history filter, seed,
budget or work comparison was weakened.

## Review findings and evidence

Fresh review found two carried-proof enforcement gaps and stale documentation:

1. A pre-upgrade cache built while a subscription was absent could retain a
   matching receipt after reinsertion. The original histories only wrote after
   the migration, so they could not generate it. The repair invalidates the
   carried position receipt once.
2. A pre-upgrade own pin could change order without advancing Reading. Merely
   rebuilding positions would still accept its old cursor. The repair advances
   Reading once during upgrade, as well as for future rank-changing pins.
3. Documentation still named the old `revision` column, migration 0057 and base.
   This record and the feed/changelog references use the reconciled layout.

The first two reuse cache validity and generation-bound continuation laws;
they require no new product promise. Generated histories vary surrounding
source edits, repetition and item count. Fresh source edits and fresh pin
cursors remain passing neighbours. Local scratch review records preserve the
review and its dispositions separately from this versioned evidence.

On main's migrations without 0058, run `ec4e1f97ce91`
(`reader-main-integration-red.RGpbBZ`) rejected the uncollected-import hopper
write and the subscription remove/add history. The expanded component and owner
histories already passed main's orphan/marks behavior. This baseline is RED for
the remaining dependency repairs, not a passing integration result.

Run `4245bc8bbbad` (`reader-main-controls.DZ06bY`) then passed 282 baseline tests
and killed all 14 selected authored controls without nondeterministic tests.
It predates the carried-proof strengthening and is not evidence that the
subsequently identified upgrade gaps were covered. New controls remove held
selection from normal or Raw reads, or add `marks` to cursor generations.

The upgrade repair has separate before/after evidence:

| Run | Result |
| --- | --- |
| `4f854633edde` / `reader-upgrade-red.0lc7Q2` | RED before the carried-proof repair: `['upgrade']` violates cached identity equality; eight of thirty tests fail. Its selected automatic mutant was blocked by the baseline, so supplies no kill |
| `d36752eb2a41` / `reader-upgrade-pin-replay-red.vZaP8n` | RED through supported seed/path/unit replay: `{count:4,upgrade:true}` violates the continuation law at the immediate read |
| `92dd7cd2769e` / `reader-main-cache-sweep.KNNXuR` | Final cache implementation: 53 baseline tests pass; all 20 automatic mutants killed; zero gaps or nondeterministic tests |
| `30d510905685` / `reader-main-final.nCewaX` | Final combined integration: 290 distinct baseline tests pass; all 14 authored controls killed; four hopper and two upgrade native SQL calibration drivers reject; zero gaps or nondeterministic tests in this selection |
| `943040a833b6` / `reader-worker-helper-final.aIZW5u` | After moving the identical Worker-only migration helper into `test/`, all 32 cache/upgrade tests and the selected stale-rank control pass/reject respectively, with no gaps or nondeterministic tests |

`reader-upgrade-pin-red.lZdO5R` was a replay setup failure because it lacked
the required path. It supplies no RED result or kill. The succeeding pin replay
above is recorded separately. Native upgrade calibrations omit the generation
reset or the Reading increment independently; both use the same clean history,
model and immediate checkpoint as their baseline.

All three review items are fixed, with no law change or deferred in-scope
finding. The reviewer identified the cross-version boundary that the fresh
histories missed, confirmed it with native SQL, and correctly distinguished
the cache and cursor obligations. The strengthened registered histories now
provide the decisive product evidence.

Each fixed and random campaign enters the constructed upgrade-cache,
upgrade-cursor and mark-continuation states once. The owner enumeration enters
orphan-imports twice and mark-continuation/deep-walk once. Other constructed
reach states and budgets from the initial record remain. The combined total
of 290 excludes the repeated cache sweep and helper-location check.

Final routine checks also pass: `npm run build`, TypeScript for Worker/UI/oracles,
ESLint on all changed TypeScript, oracle migration accounting and 118 ordinary
Worker tests across eight files (reader order, cursor pages/dates/hopper reads,
imported reading, importer hoppers, read-state clear and remote migration shape).
The first typecheck after merge used stale SDK build output; rebuilding resolved
those errors. The Worker migration helper then moved from the browser-oriented
`test-oracles/` include to `test/`, resolving its environment-type mismatch;
the final focused receiving check above verifies that relocation.

## Checklist v1 continuation

The initial checklist outcomes continue to apply within their stated scope.
For the strengthened boundaries:

| Requirement | Outcome |
| --- | --- |
| ORC-001/003 | Existing authority is carried forward; law prose and property authority name #171's held-item/marks decisions |
| ORC-002/011 | Independent array remains; cached-versus-fresh relation still declares the loader/ranker trusted base; owner HTTP supplies the receiving request boundary |
| ORC-004/008/009 | Added action/upgrade distinctions have reconstruction and distinguishing continuations above; no production revision/counter state enters the model |
| ORC-005/014 | Real local SQL, parsed migrations, actual predecessor triggers and authenticated Worker reads supply the stated premises; remote latency remains unresolved |
| ORC-006 | Authored held-selection and mark-expiration controls reject at page checkpoints; upgrade calibration omits each native reset independently |
| ORC-007/015 | Same fixed/random budgets plus constructed upgrade/scanning reach; finite owner scales enumerate orphan and deep-walk premises |
| ORC-010/016 | Existing disposable-storage cleanup remains; migration helpers register no tests and fixed upgrades use the same model/driver/check |
| ORC-012/013 | This source-cut record preserves earlier evidence and limits, adds fresh/carried neighbours, and records upgrade RED separately from GREEN |

None of these requirements becomes inapplicable because main moved. Fixed/random
campaign requirements remain inapplicable only to fully enumerated owner and
handoff witnesses, as in the initial record.

## Limits

All SQL/work evidence remains local primary D1. The Smart Placement latency
improvement is Venkat's reported live measurement, not a result of these runs.
No network RTT, billing, browser loading-wave, replica or admission-efficiency
claim is established. Genuine new imports still allow a full order rebuild and
can expire Reading-dependent cursors; the 500-entry window bounds replay only.
The earlier pure-loader field-drop gap (`reader-order.ts:M70`) and polling
timeout (`changes.ts:M21`) remain unresolved broader audit results. Selected
clean runs do not close them.

## Final source cut

Based on `dec2984`. Manifest SHA-256:
`f63fb869287b0cf257f6a15505cd6056ce6f23d8883ac68558de706a622fb5ed`.
The digest covers the UTF-8 manifest below, including its trailing newlines.
It identifies the final local files independently of a future commit.

```text
1297b4836a773e2288ac66fd444ac92cb1ea7ab4c362f34d6d3a3eb23a2ce1a2  migrations/0058_reader_work.sql
0529a8caf2c4345fc728888260542144249cbc213d71963f9324e75e2f5ac95f  src/cursor-page.ts
a93cb7b2f81bafb99a3f77e18e5597724e511c6d5bab8a750f1f1f0f8bd15706  src/feeds/reader-order-cache.ts
91ec05c5e30dea041ca82fb1e0464aef4d4a50431054b16bffbdde615f8d2232  src/feeds/reader-order.ts
a026a44944aca84b4e4fe6e47e6ae5ab90becc1da73f1608d9d86ce7d786090d  src/reading-data.ts
d735823c7579ea431b36dbd832f7cb3cfb40c5d381d77d7dea3d3c07bf21b274  test-oracles/d1-work.ts
3e639fc6d8588b013ba319e138569f86dbe10e819d6610de77960f6932c4f227  test/cursor-validator-handoff.oracle.test.ts
2547a08de05bfc927cf8fe0574978962ab56854348cf3f283957e333aeffd22b  test/fixtures/reader-work-mutants/hopper.json
c3ae90f6b25d4d2c3bf0b162db46f0bdf25976a8e80236ddf63e383d967aee1d  test/fixtures/reader-work-mutants/reader.json
2a22b710f1d175e0e55409a0094150f8282e8f5eec1eeb1b0ab7f656dbaf3d5b  test/hopper-dependencies.oracle.test.ts
f3da0b1298250534fb2db12f2667916c7b111f41c89f27a5d4830fe490db1b46  test/oracle-property-registry.ts
6671ee678a03d6db80361931599040abfc7b721a1adf797006ae7321fb962aa7  test/polling-cache-trigger-cases.ts
9dac654e44537403d8b97f55786459bdaf3e25103c5aa1e34b8f8bad871c8397  test/polling-cache.oracle.test.ts
17884b428d26ad315793943bee802981b69af214eb579a9f9a67309eb5111d09  test/reader-cache-validity.oracle.test.ts
78c2706d1fb3361b9cae7940886421a18b95f38041db992be738ab5d05c5959b  test/reader-order.test.ts
0ef1f8a6d0cc3bfd50bc7b10c23a28ce6ce31d9ce1fee7bc4d38990f60207584  test/reader-upgrade-oracle.ts
83c1110db49805d3499cfff26a081445c999d751b1720fc392a35c6f73e385bf  test/reader-work.oracle.test.ts
e515825a08cb5e6b93f01f0cc187dc29b1da7ece61d463d0a18c0152772b9c42  test/reading-owner-work.oracle.test.ts
```
