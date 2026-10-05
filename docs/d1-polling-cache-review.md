# Simplified polling/cache design: bounded stress round

2026-10-05, upstream `f32519b`. No application handlers, production migrations,
deployed databases or R2 buckets were changed. Source specimen:
[frozen design v1](../models/d1-polling-cache/design-specimen-v1.md), SHA-256
`9310a5abff61a4b2c4e88b9add87a2a417c3ec8c21ea640c23dbb9e9a216ea2c`.
The earlier general cache coordinator's immediate freshness/recovery contract
does not carry over to request-driven XML stale-while-revalidate.
The [working design v2](d1-polling-cache-design.md) incorporates the repair
conditions below; this review retains the original tested specimen and scope.

## Design grammar result

The minimal grammar has six parts: committed source revisions, dependency
relations, applied client state, a reusable artifact/replacement token, attempts,
and distinct work observations. Triggers centralize notifications but cannot
infer which joined responses depend on each changed field. Two explicit maps
remain: row effects to domains, and watched queries to domains.

Full-refetch-on-change needs a fixed revision vector, not an append-only change
journal. Row deltas would require deletion records and separate cursor/history
retention rules; they are outside this candidate.

The candidate separates source revision from successfully applied Studio data,
and source revision from the saved XML representation. Their overlap with
attempt lifetime is what prevents skipped client changes and old publication.

Two unranked adjacent forms exercise generation identity: revision-bearing XML
bytes; or a revision-bearing manifest selecting immutable XML. Both keep SWR
and generation-aware replacement. The former changes XML bytes with a harmless
comment; the latter adds artifact selection and lifecycle work. Neither has a
production provider witness. The blind assay received only the first form.

The frozen [Model/Evidence/Process state](../models/d1-polling-cache/grammar-source.json)
contains reconstruction, ablations, overlap, exclusions, trace and losses.
Version 2 replaces an interim Studio model receipt after unchanged polling was
made explicit; v1 and intermediate logs remain. No preservation law changed.
Independent range is untested; no held-out case was supplied. A timestamp-only
new-item sync is excluded because updates and deletes need not advance it.

## Fracture scan

The earlier plain-XML ETag plus custom revision metadata branch does not satisfy
its non-regression claim. This is an admissible internal counterexample:

1. Saved revision 0 renders site title A and has ETag A.
2. Site title changes to B at revision 1. An old builder renders B, captures
   expected ETag A and preflights the stored revision as 0.
3. Site title changes back to A at revision 2. A newer builder publishes A,
   leaving the same body ETag A but newer source metadata.
4. The old builder's conditional PUT still matches ETag A and replaces revision
   2/title A with revision 1/title B.

All writes were tracked, both renders were stable, CAS was used, and no hash
collision or reset was required. `lastBuildDate` follows own item updates, so
site title A-to-B-to-A need not alter the rest of the XML. This defeats the plain
body-token link, not triggers or SWR. A generation-bound body/manifest token
excludes the trace within the formal boundary. Actual provider mapping is open.

Controls rejected: comparing R2 pricing to an unrelated platform is an external
standard absent a cost ceiling; bypassing a required trigger violates the
complete-tracking premise and is not an immanent fracture. No maximum stale age
or global single-flight promise was selected, so their absence is an open
boundary rather than a contradiction. The A-to-B-to-A scene emphasizes token
reuse; its production frequency is unmeasured.

## Fresh hostile assay

A fresh auditor received one candidate, its success standard and allowed source
trace, without parent analysis, models or sibling forms. These are possible
failures and repair conditions, not observed production incidents or rankings.

| Finding | Evidence / status | Repair condition |
| --- | --- | --- |
| Pure change gating suppresses timed release checks | `read-api.ts:132-135`, `update-check.ts:38-46,94-101`; source-backed conditional regression | Keep update-state's timed poll or preserve its deadline effect separately |
| Cross-table dependencies can be missed | Hopper details read imported HTML; Reading/XML read subscription attribution; already-open coverage obligation | Test dependency effects through direct SQL and fresh DTO/XML comparison |
| Restore/schema lifecycle can reuse tokens | Reused restored epochs and newly added relevant columns; already-open conditional lifecycle gap | Bump epoch before resumed service and update trigger guards with schema changes |
| Lower reads need not mean lower total work | Counter writes per changed row and live admission remain; unmeasured goal-level risk | Measure both actual rows read and rows written under matched traffic |
| Losing builders can duplicate full renders | All can render before one wins CAS; explicitly unbounded cross-isolate work | After conflict read the winner and stop if its generation satisfies target; local sharing is only local |
| Real R2 token handoff remains unproved | Model unique tokens are not a provider witness | Test generation serialization, distinct ETags and stale PUT rejection through the real entry point |

The minimal side-effect failure scene is an idle visible Studio crossing the
24-hour release-check deadline without any D1 change. The counters stay equal;
a pure gate skips the GET that normally initiates the remote check.

The auditor did not impose immediate feed freshness, a withdrawal exception,
maximum stale age, idle refresh, global single-flight or unconditional liveness.
SWR explicitly permits stale saved bytes, including after withdrawal. The assay
cannot decide those policy choices or establish actual quota capacity.

## Executed controls

Full models, configurations, raw logs, controls and reproduction instructions:
[model README](../models/d1-polling-cache/README.md).

| Check | Final result |
| --- | --- |
| Feed generation-aware CAS | Safety checks pass, 57,772 distinct states |
| Feed generation CAS without separate preflight revision guard | Pass, 57,900 states; token binding supplies the protection |
| Studio applied-cursor rule including unchanged checks | Pass, 6,501 states |
| Seven weakened rules | Intended failures: old overwrite, mixed payload, body-token ABA, missing trigger, skipped conditional revalidation, latest-after-load acknowledgment, failed-load acknowledgment |
| Concrete SQLite trigger prototype | 27 triggers over real migrations; 24 named receipts, including failure/repair and work observations |
| Trigger calibration | Missing-delete trigger rejected by independent expected-domain assertion |
| Missing fixed counter row | Silent untracked write reproduced; one-table fail-closed guard repairs that witness |
| 100 source imports | 100 extra counter-row updates; 200 SQLite total changes, not D1 billing |

Initial encoding/setup errors and discarded atomic-metadata-guard modeling are
recorded. Final runs use separate revision preflight and token-only conditional
publication, matching the offered R2 operation. Provider semantics are supported
by linked docs in the design specimen; real receiving-path checks are absent.

## Remaining boundaries

No production implementation or complete trigger matrix is established. Models
assume a legal existing artifact, authoritative source reads and complete trigger
coverage; use two concurrent builders/views and bounded mutations/attempts; and
abstract XML to two fields. Saturated work counters establish no numeric savings.
Cold creation, actual optimistic collection installation/cancellation, restore
epochs, renderer upgrades, exact billing and Cloudflare provider handoffs remain
outside the check. No unconditional progress or stale-time bound is claimed.

The small design remains a migration plus change endpoint, Studio refresh
dispatch and feed revalidation helper. Mutation callers retain no notification
hook. That limits scattering but leaves SQL dependency definitions, lifecycle
rules and reader behavior as explicit maintenance work.
