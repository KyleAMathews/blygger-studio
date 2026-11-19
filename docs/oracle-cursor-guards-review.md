# Cursor guard enforcement — checklist v1

Source cut: `212747e6e772fb305d49e034ac2b5107c48bad9f` plus the accompanying
cursor guard oracle, helper repair and registry/control additions, 2026-11-19.
Package pin: `@tanstack/oracles@97a4e7a`. This record supersedes the five pending
internal guard questions in [the earlier helper review](oracle-cursor-helper-review.md).

## Authority and design

Kyle Mathews (GitHub KyleAMathews) approved three promises on 2026-11-19:

- Generated cursors fit within8192 characters or reject.
- Empty sort orders and invalid internal column names reject before attempting
  a page query. Change-state metadata reads are allowed.
- Unsupported or nonfinite returned sort keys reject before returning a page.

Error wording and HTTP status remain unconstrained. This replaces the earlier
unanswered rejection-only proposal. Pre-draft audit:
`/tmp/blygger-etags-prep-review/ci/cursor-guard-law-refinement.md`.

The native empty-order probe calls cursorPage and an isolated copy with only
its empty-order guard removed. Both reject. Original production prepares zero
queries; the copy reads metadata and attempts one page query before SQLite
rejects ORDER BY. Neither completes a page read. The approved checkpoint can
distinguish these results. The first probe failed module setup before execution;
a private type=module marker fixed setup. Sources/results remain in
`ci/cursor-empty-order-probe/` under that scratch directory. A quoted bad-name
column supplies the converse witness: native SQL accepts it but the internal
declaration must reject it.

Design-grammar triggers: existing cursor law count and five prior helper gaps.
The audit selected pure input predicates and settlement/preparation observations,
with no mutable model state. Three separate properties avoid one dispatching
grammar; both forms preserve the adopted observations. No prior model/history
is narrowed or removed. The call is the sole action. String units vary output
size, columns decide declaration legality, key kinds decide scalar legality,
and selected width/position expose nonfinal rows. Each part has a witness:
without preparation counts empty-order SQL rejection passes; without positive
neighbors blanket rejection passes; without bounds oversized tokens pass;
without width/position invalid early keys pass. No stateful equivalence or formal
model-check result is claimed.

## Grammar and independent judgment

Output histories vary0–9000 repeated ASCII, multibyte/astral Unicode, quotes,
newline and NUL. Empty, near-envelope, oversized ASCII/Unicode and escaped cases
are constructed. The allowed set permits rejection or any usable continuation
at most8192 characters; bytes/encoding remain free. Existing codec histories
still require successful8191/8192-character continuations.

Source histories vary0–3 columns, both directions/materialization modes. SQLite
really declares id/value/_value/bad-name/9value/value space. The model uses finite
canonical-column membership rather than copying the production regex. Empty
order, every invalid spelling and a valid underscore column are constructed.
Preparation is logged before SQLite can reject; metadata work remains allowed.

Key histories vary null, strings, doubles, booleans, undefined, objects, arrays,
native BLOBs, selected width1–3, invalid position, all versus one replaced key,
and lookahead presence. Each invalid class, NaN/both infinities, valid scalar
neighbors and first/middle/last invalid positions are constructed. Finite-number
legality uses arithmetic bounds, not production's rejection disjunction. Native
SQLite supplies BLOBs; projection mutation supplies other JavaScript classes.
An id-leading SQL order prevents a BLOB from moving the targeted row to the tail.
The reported two-row nonfinite history is retained as a fixed regression.

ORC-004 reconstruction includes the five original guard witnesses plus the
nonfinal-key family. Ablation: count/unit expose size/encoding width; order terms
expose declaration validity; direction/materialization preserve query neighbors;
key kinds expose scalar legality; width/position distinguish returned rows;
lookahead distinguishes validation from later encoding. Nearby excluded inputs
are negative repetition counts, a fourth order term and function/symbol/proxy
keys. These are explicit bounded scope, not exclusions used to clear failures.

## Experiment and repair

Focused run `154206d95205` at
`/private/tmp/blygger-cursor-guards-focused.wEan3E/results` passes65 stable checks
and kills the original M12/M78/M119/M165/M170 under the three intended laws.
Production was unchanged. Later deterministic witnesses strengthen that oracle.

Scoped review CG-R01 then identifies missing selected width/position. Production
validates only selected.at(-1), and the initial oracle requests limit1. A probe
at `/tmp/blygger-cursor-returned-keys-probe.BsUNCy/result.log` confirms first-row
Infinity publishes at limit2, while final-row Infinity rejects: one of the two
probed placements violates the law. This is no estimate of arbitrary input
frequency. The probe preceded the scratch review ledger; that process chronology
is disclosed rather than retroactively claimed compliant. The whole-review
design update preceded oracle expansion and every production edit.

Expanded oracle RED `0c530323626b` at
`/private/tmp/blygger-cursor-keys-red.TgfOf6/results` fails11 of97 checks on
unchanged production at candidate / supported returned sort keys. Its reduced
fixed-seed witness is Infinity, width2, position0, terminal page. Mutation is
blocked by the failing baseline; it receives no kill credit. No setup failure
is presented as RED.

The repair validates sort keys for every selected row, retaining the final keys
for the cursor. Projection receives a shallow array copy, so draining/reordering
its argument cannot erase/reorder the selected sequence. Row references stay
shared, so key mutations remain visible. With that ownership preserved, positive
limit and rows.length greater than limit imply a selected final row, allowing
removal of the old final-row-presence condition.
GREEN `63b75d3ed181` at
`/private/tmp/blygger-cursor-keys-green.7oEIjs/results` passes97 stable checks and
kills the authored original-defect control cursor-validates-only-final-row.
The subsequent full campaign covers the small redundant-condition cleanup too.
Five bound calibrations reject oversized publication, late empty-order rejection,
accepted invalid columns and published unsupported/nonfinite keys.

CG-R02, the review follow-up, identifies destructive projection array mutation
as another bypass of the same law. The root probe confirms Infinity survives
when project returns rows.splice(0), leaving selected empty. The expanded drain
dimension preserves the same returned rows/order in both modes; its model is
unchanged. RED `59a58edc68b9` at
`/private/tmp/blygger-cursor-drain-red.5NRoLU/results` fails18 of105 checks before
the array-copy repair. The reduced witness is a terminal one-row page with false
and drain=true. This is a distinct neighboring failure from first-row Infinity
in a multirow page. The shallow-copy repair and permanent authored control
cursor-projection-erases-selection follow that RED.

GREEN `cc5a03311a8d` at
`/private/tmp/blygger-cursor-drain-green.AqrVnF/results` passes105 checks twice
with stable traces and kills both authored original-defect controls under
supported returned sort keys. The final read-only follow-up finds no additional
issue under the adopted laws. The full integrated gate is still required.

Both findings are technically confirmed; durable value is generated width,
position and drain plus original-defect controls. Final disposition awaits the
full gap gate. The reviewer supplied two actionable items and correct smallest
witnesses. Recommendation: reuse this reviewer; it separated source hypotheses
from executed evidence and found missing law dimensions. The scratch append-only
ledger preserves both raw items and process chronology.

## Checklist dispositions

| Requirement | Disposition |
| --- | --- |
| ORC-001 | Dated authority, exact checkpoints, freedoms and scope accompany all laws. |
| ORC-002 | Output allowed set, finite canonical membership and scalar arithmetic import no production semantics. |
| ORC-003 | Opening prose and separate grammars/models/drivers/checks explain all properties. |
| ORC-004 | Reconstruction/ablation/range/exclusion above; previous histories remain. |
| ORC-005 | Real cursorPage and native SQL exercise settlement and pre-page preparation. |
| ORC-006 | Five bound calibrations and registered original-defect mutation distinguish wrong answers. |
| ORC-007 | Fixed seed20261118 and random campaigns share25-run budgets and framework replay. |
| ORC-008 | Not triggered: no stateful reference model is introduced, merged or removed. |
| ORC-009 | Source/order/key retain helper names; preparation is separate from allowed metadata work. |
| ORC-010 | Only production invocation is caught; setup/observation/cleanup failures remain distinct and SQLite closes. |
| ORC-011 | Native SQL, finite membership and arithmetic challenge copied SQL/guard assumptions; width/position address the named shared fault. |
| ORC-012 | This versioned record names source cuts, receipts, chronology and incomplete scopes. |
| ORC-013 | Bounds, empty/nonempty order, valid/invalid names, scalar/nonfinite/BLOB and first/middle/final neighbors distinguish the laws. |
| ORC-014 | SQLite supplies actual SQL/BLOB premises; projection classes remain controlled, with no corrupt-live-D1 claim. |
| ORC-015 | Every declared state has a constructed history; full-campaign reach accompanies its receipt. |
| ORC-016 | Only oracleProperty registers checks; every fixed/constructed input uses the shared model/driver/check. |

## Final integrated campaign

Run `06b6129f3166`, source cut `c5ace416b3bd6e3e6e3cf6d50ee862fd0f5b017c`,
uses the complete default eight-source Studio selection,14 oracle files,
26 authored controls, seed20261118, contexts2 and maxWorkers1. The temporary
config changes only worker concurrency. There is no --only, --sample or
source/file restriction beyond the shipping runner's default source list.
Output: `/private/tmp/blygger-etag-final-integrated-full.8Z1Ble/results`.

All1,840 checks pass twice with stable traces. Of2,379 mutation entries,
755 are registered law kills and1,624 are explicitly unowned warnings. There
are zero gaps, timeouts, crashes or nondeterministic tests. This closes all
five original guard gaps and kills both permanent cursor regression controls,
the three permanent counter controls and the previously timed-out batching
mutation under work bound. Every one of734 shared previously killed semantic
keys remains killed. Twelve old helper keys disappear with the revised
projection/row-validation/page construction; every current new owned key is
killed. Raw semantic-key comparison: `../preservation.json` in that output.

The905 tracked/nonignored candidate files inventoried before the run have
identical hashes afterward. The manifests are `../inputs-before.json` and
`../inputs-after.json`; these establish preservation for this run, not an
earlier campaign. Subsequent edits to this evidence do not alter product or
oracle inputs. Native ordinary receiving at the same cut passes all35 tests
in seven cursor files after the array-copy repair and dependency refresh.

Reach below sums the first histogram for each distinct property/unit label,
so repeated instrumentation does not inflate a unit. Every declared state
is reached; raw per-property aggregation is `../reach.json`.

| Property | Entered states and counts |
| --- | --- |
| outgoing bound | empty-key6, near-envelope-bound8, oversized-ascii10, oversized-unicode10, escaped-key4 |
| source guards | empty-order16, invalid-column34, valid-column10 |
| returned keys | finite-key4, null-key6, string-key8, unsupported-key30, nonfinite-key18, blob-key18, terminal-unsupported-key22, first-invalid-key16, middle-invalid-key8, last-invalid-key10, drained-invalid-keys32, drained-valid-keys8 |

| File | SHA256 |
| --- | --- |
| src/cursor-page.ts | `3e930ecfe439fa78f3a4db49543c682f45455f09e5bc8d22388f4f674d0b7826` |
| test-oracles/cursor-guards.oracle.test.ts | `512d8a8a15ff85ef8539ed95537faf90715b425315a32433162bc36d2bbb8a3f` |
| test-oracles/mutants/cursor-returned-keys.json | `007af30cad5114b5527bca82e0e499ac6f07aeb77f2b0111f4363926571ecd5f` |
| test/oracle-property-registry.ts | `ad2f8cc78fa96feec5c18ba1e6525032b4316d772f8d3d0f4b728d8dc784307b` |

Loss audit: raw review2 items =2 fixed-now (CG-R01,CG-R02), with no omitted,
deferred or open finding in this bounded cursor law. The full gate and both
original-defect controls support that disposition. Controlled projection
classes, bounded native fixtures and unowned warnings remain the stated limits.
Pushed-head CI and whole-PR readiness are separate from this local closure.

The exact shipping Worker/D1 command also passes at this cut. Derived receiving
`9c50fb4aa428` passes17 stable checks and kills four controls. Generation/keyset/
indexed receiving `bc20de7d2e46` passes104 stable checks and kills ten controls.
Both have zero gaps and are explicitly selected-control receiving, not automatic
full-source coverage. Raw log: canonical OS temporary child
`blygger-etag-final-worker.hcgSEW/run.log`. An earlier attempt placed output in
`/private/tmp`, which the local capture adapter refuses; it failed setup with
no product evidence. Using the adapter's canonical OS temporary directory
fixes setup without changing the oracle or bridge rules.

The temporary Node config used for the complete run is exactly:

```ts
import { mergeConfig } from 'vitest/config';
import base from './vitest.oracles.config.ts';
export default mergeConfig(base, { test: { maxWorkers: 1 } });
```

It is removed after completion; the shipping config, histories, seeds, checks
and budgets remain unchanged. To replay a historical command naming
`.cursor-guards.config.ts`, recreate that three-line wrapper at the root.

The combined Check job's allowance increases45→75 minutes for the eight-source
campaign plus its existing sequential receiving/release/ordinary gates. The
current hosted campaign is still in the Studio step after18 minutes; the earlier
ordinary local Worker suite alone took16m26s and the companion's full Worker
oracle step took10m17s. Those stages and setup/release checks do not fit45m.
Test timeouts, histories, mutation selection and work limits do not change.
