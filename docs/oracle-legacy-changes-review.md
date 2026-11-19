# Legacy change-read compatibility evidence

This record accompanies the restoration after `da8fbed`, with companion merge
`bf12caa5e8744bae864592f78990f0950998228f` (main `2d15307`). It supplements the
[ETag evidence](../test-oracles/review.evidence.md). It does not replace the
pending cursor-boundary decision or establish PR readiness.

## Contract and implementation

Decision by Kyle Mathews (GitHub KyleAMathews), 2026-11-19: retain `/changes`
and generated `getChanges` unchanged in Studio 0.65 and 0.66, deprecated in
OpenAPI and the SDK; remove in Studio 0.67 / private contract 6.0.0. This
supersedes immediate removal. This release is Studio 0.65.0 / API 5.14.0 /
SDK 0.20.0, following main 0.64.0 / API 5.13.0 / SDK 0.19.0.

The original handler, twelve-domain schema and owner:read policy return. The
HTTP adapter excludes only operation ID `getChanges` from resource validators.
OpenAPI gives it neither conditional headers nor ETag/304 metadata. The SDK
generator consequently excludes it from automatic body reuse. The generated
method carries `@deprecated`. Explicit caller validators retain raw behavior.
Studio still polls resources directly, without a `/changes` preflight.

The companion merge supplies a separate CHANGELOG paragraph about the expired
host-root `/api` alias. It preserves main's newer UI, link notices, tangling
fixes, migrations and WebKit coverage. The feature's CHANGELOG entry adds the
ETag/recovery behavior and the finite change-counter migration window.

## Experiments and limits

Before restoration, Worker `0dc52e15a502` failed 86/211 checks at the legacy
response-status obligation. Public SDK `925ab5c0e8bf` failed 8/283 at
`legacy-availability`; 275 neighboring checks passed. Controlled adapter
`a6c5e360b7a0` failed 5/759 at `private-validator-boundaries` / `boundary`.
The production implementations were unchanged for these assertion REDs.

REST/MCP `eaead9148a33` then reported the intended inventory violations:
REST 1/131 and MCP 4/19 failed. This run also had a later capture-bridge403
because its manual output was outside the canonical OS temporary directory.
Its assertion evidence is retained; it supplies no passing-run or kill credit.
The first post-restoration Worker run `3376bab7f2eb` had the same capture
problem and supplies no product-failure, GREEN or mutation credit.

The corrected broad Worker diagnostic passed 374 checks twice: polling211,
permissions131, MCP19 and mounted API13, with stable traces. It stopped after
finding three untouched `readChanges` guard gaps, M11/M12/M13. It is an
incomplete diagnostic, not a completed mutation gate. The subsequent focused
receiving run `fdce62e89c97` passed 355 checks twice in its three selected owner
files and rejected `legacy-endpoint-disappears` at the HTTP receiving law.
That one-control run is explicitly partial; MCP was not selected as its owner.

The counter gaps led to a separate approved law: `readChanges` rejects missing,
nonnumeric, negative, fractional, nonfinite and unsafe counters, without a
promise about error text or timing. The new counter oracle calls the real
reader through a fresh database provider. Its mathematical model uses the
integer range 0 through 2^53-1, independently of production's safe-integer
predicate. All twelve domains receive all fifteen input cases. Unequal valid
neighbors catch omitted or misprojected domains.

Counter Worker validation passed 184 checks twice, then failed in the pool with
`Message received from Worker before initialisation`. This is retained as
runtime failure, not kill evidence. The provider-only driver moved unchanged
to Node; it needs no Worker binding. Node run `a14583730185` passes 184 checks
twice, with stable traces, and kills M11/M12/M13 under `valid source counters`.
M11/M12 fail on a missing items counter; M13 fails on a fractional items
counter. This is focused closure of those three guards, not a full mutation
audit of the unchanged changes module.

The counter grammar has 180 enumerated inputs. Required states have at least
these input counts: lower-bound12, upper-bound12, missing12, nonnumeric72,
negative12, fractional12, nonfinite36 and unsafe12. Both calibrations pass:
accepting a missing counter and rejecting a valid row are rejected. The
driver does not alter the real database, and this record claims no deployed
corruption experiment or new contract for `readFeedRevision` or epoch errors.

SDK generation/build, targeted ESLint and direct declaration comparison pass:
legacy deprecation is present, ChangeState retains all twelve fields, legacy
304/ETag/If-None-Match declarations are absent, and automatic SDK validators
exclude `/changes`. Full Studio and final integration results are recorded in
the parent evidence record when complete.

## Counter-oracle checklist v1

| Requirement | Outcome |
| --- | --- |
| ORC-001 | The decision, valid ChangeState contract and provider-only limits are explicit in the law block and property. |
| ORC-002 | The model reads only input rows and the independent domain inventory; it imports no production classifier. |
| ORC-003 | Prose, property law, model and driver state the same rejection/valid-value obligation. |
| ORC-004 | Every domain receives fifteen cases. Removing the domain axis hides omitted-column defects; removing missing/fractional inputs loses the specific M11–13 witnesses. Epoch errors and exotic object prototypes are explicit limits, not hidden filters. |
| ORC-005 | The driver invokes real readChanges and compares rejection versus exact valid return at the promise boundary. |
| ORC-006 | Two bound calibrations pass and all three identified guards are rejected by registered laws. |
| ORC-007 | Random-campaign obligation does not apply to this bounded enumeration; every one of its180 inputs runs. |
| ORC-008 | Stateful-model minimality does not apply: the model is a stateless predicate and projection. |
| ORC-009 | Source identity, domain counter and provider row use project terms. Lower/upper-bound states name numeric premises, not new production state. |
| ORC-010 | Only the production await is caught; observation failures cannot become an expected rejection. Each provider is fresh and owns no external resource. |
| ORC-011 | The mathematical integer/range predicate differs from production's Number.isSafeInteger call; boundary and fractional inputs distinguish plausible predicate mistakes. No further shared-fault hypothesis is claimed resolved. |
| ORC-012 | This versioned record preserves approval, scoped outcomes, runtime failures, limits and source identities. |
| ORC-013 | Zero/MAX_SAFE_INTEGER succeed; missing, negative, fractional, nonfinite and MAX_SAFE_INTEGER+1 inputs reject, independently in every domain. |
| ORC-014 | The controlled provider premise is explicit. No inference to native or deployed corrupt-state storage is made. |
| ORC-015 | All eight declared states occur in the exhaustive180-input grammar; both baselines and reach checks pass. |
| ORC-016 | The file registers only oracleProperty campaigns and passes configured ESLint. |

The three readChanges survivors triggered the design-grammar review. This
parts audit was recorded after the first counter-history draft; that ordering
deviation is retained rather than described as a completed pre-draft step.
The preservation relation is the named rejection law at promise settlement,
plus the existing complete valid source identity. Error wording and timing
remain free. The parts are the supplied row (legal input), the domain axis
(omission witness), and return/rejection with valid values (owed observation).
The model has no mutable state or transition rules. Missing and fractional
counter examples reconstruct the three specific survivors. Zero and the upper
bound distinguish blanket refusal from valid-state preservation.

Two independent representations keep these same promises: a mathematical
integer/range predicate with projection, or a local schema validator written
without importing the production contract. The former avoids another runtime
validator and states the numeric rule directly; the latter adds schema
declarations and validation indirection. No prior model was replaced, no law
was weakened, and no existing history was filtered. The sole new distinction
is valid versus invalid provider counters, explicitly approved before the
draft. No formal state model is claimed for this stateless boundary. The
broader ETag grammar and earlier decisions remain in the parent record.

## Restoration source identities

| File | SHA256 |
| --- | --- |
| `src/changes.ts` | `32532b0caac65f9b634ad73f02a9c71007734493cc07a1069a5bb97776d0f48f` |
| `src/read-api.ts` | `0394ad56c52dd39f721723ac002ec4f3bf29167e871254e3244917be922e8af4` |
| `src/conditional-operation.ts` | `f8a5b8f41d8747d89e45cb67bf9043ecd8a2054651421b89573fbe7c49b141ea` |
| `src/contract/route.ts` | `86034c615ceb00aefe97b07a9d84f7c0ce9c98fba7a431aaf8a7d2aeb6e7bcda` |
| `src/contract/routes.ts` | `7d0ec46235ce413859b8d4a6927ecf9c3056703e47678da6d64c85a0762c3ef7` |
| `sdk/generated/sdk.gen.ts` | `f744c7a489a5265fd27903c9db164c828105ddae2ef0296be423ae368e4d0fcb` |
| `sdk/generated/read-validators.gen.ts` | `41d13e983c803e96e0b6e1d61fa18ae5414c461e7722c5109f8691de1e8f6a62` |
| `test-oracles/change-state-counters.oracle.test.ts` | `7937121fcd655ea7a271eca60c2e68b4ed434ba965c7c85ce40a71ab16841194` |
| `test-oracles/sdk-review.oracle.test.ts` | `74069b8a20b799565c2a42e851bd48a323b0820b9fdd0f32c7c50a9c392986e2` |
| `test/polling-cache.oracle.test.ts` | `6d5f155786ca2f7762bda698255a994af8f565d7fadeb7e3d888385b5c2be9ef` |


## Restored integrated Studio campaign

Run `3a640be84302` uses all eight default Studio sources, thirteen oracle files,
seed 20261118, contexts 1 and maxWorkers 1. It passes all 1,735 baseline checks
twice with stable traces. The 2,376 entries (2,355 automatic plus 21 authored)
classify as 746 registered law kills, five cursor guard survivors, one batching
timeout and 1,624 unowned warnings. No production crash or nondeterministic
oracle result occurs. Both compatibility controls are killed: moving the SDK
method off `/changes` fails `retained raw changes SDK`; applying revalidation
to the legacy endpoint fails `correct validators`. This completed run exits1
and is not a zero-gap gate.

The timeout is `ui/read-batch.ts:M69`, changing the envelope loop's `<` to
`<=`. Focused follow-up `195297eb329e` passes 976 stable checks twice and kills
that same semantic key under `work bound`, including envelope 50/100 histories,
in 10.05 s. The earlier 24.69 s timeout remains in its original report; the replay
provides its previously missing registered-law result without changing the
oracle, production or timeout settings.

The follow-up also kills three checked-in counter controls under `valid source
counters`: disabled validation and conjoined outer guards fail on a missing
items counter; conjoined type/integer guards fail on a fractional items
counter. These reproduce the three automatic guard mistakes and now accompany
the default authored-control inventory. All four selected controls are killed
with zero gaps; this is explicitly a four-control partial follow-up, not a new
full campaign. The five cursor guard laws remain undecided and unclosed.

The ten source identities above still match at campaign completion. A further
28-file identity snapshot is retained in scratch. No pre/post full-input hash
manifest was captured for this campaign, so it does not inherit the earlier
291-input preservation claim. No imported source, oracle, package, configuration
or mutant input was edited while the full campaign ran. Counter controls were
added only after it completed.

A read-only scoped follow-up review finds no additional semantic defect by
source inspection. It preserves LC-F01: the design-grammar audit followed the
first draft, as disclosed above. That disclosure addresses the review request;
it does not retroactively establish process conformance or supply runtime proof.


## Merged receiving and release checks

The restoration is committed in merge `b6624e3` (parents `da8fbed`, `bf12caa`).
At that source cut, the complete ordinary Worker suite passes 167 files and
1,866 tests with five existing skips, and the UI suite passes 32 files and
308 tests. The legacy SDK integration's fourteen tests pass, including raw
200/no-store/no-ETag behavior for an explicit validator, unchanged body receipt
through the generated method and OpenAPI deprecation without a 304 response.

Merge `212747e` adds companion `4be0407`'s browser-builder fix. Its only executable
change is in the test builder: use the same disabled component-gallery define
and stub as production. The conflict resolution preserves this branch's generic
builder used by both save and search. Production, oracle laws, models, histories
and budgets are unchanged by that merge. Fresh root/UI/oracle TypeScript,
repository ESLint, migration preservation and template checks pass.

The 0.65.0 release archive (manifest commit `b6624e3`, SDK 0.20.0 / API 5.14.0)
builds and passes checksum, extracted Worker, installed Node/browser SDK,
both TypeScript resolution modes, Chromium read/write/upload and restarted
D1/R2 persistence verification. The first build attempt failed on the
sandbox-protected default npm cache; using a private temporary cache fixes that
setup problem. No dependency version or committed override changes for it.
The browser-builder-only merge does not change the shipped artifact sources.

Current combined-tree save run `8aa66d44b1a7` passes all 48 browser checks twice
in 55.8 and 61.7 seconds, with stable traces, and rejects the rebuilt original
`save-rejection` control under `acknowledged ordered saves`. It is
nonprovisional with zero gaps. Its shipping script explicitly selects that
one receiving control; this is no claim of automatic mutation coverage inside
Chromium. Search receiving and any subsequent checks are added below when
complete. The cursor decisions at this historical receipt were still pending;
the later [guard record](oracle-cursor-guards-review.md) records approval and
enforcement. Pushed-head CI remains a separate gate.


Combined-tree search run `cdf949dc03c7` at
`blygger-compat-browser-search.ftylWp/results` passes 34 checks twice in 27.9
and 26.0 seconds, with stable traces, and rejects rebuilt `search-lookahead`
under `demanded search pages`: zero gaps, nonprovisional. Its selected-file run
ID is the same as a historical receipt, so the fresh output directory and source
cut `212747e` distinguish this execution. The fresh save output is
`blygger-compat-browser-save.qwC2Tb/results`. Both live under the canonical OS
temporary directory, with raw reports and logs retained.

Current shared browser-builder SHA256: `e3a54a794cd8162cedfcd40992e76f0c2d6e3121057b7177295972c5f3129912`.
