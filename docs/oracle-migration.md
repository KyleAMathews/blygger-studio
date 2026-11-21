# Oracle framework migration

All 38 original product oracle suites use `@tanstack/oracles`, pinned to
TanStack/oracles commit `97a4e7a8e4b870c269bff297a16bf8435d258640` through
`https://pkg.pr.new/TanStack/oracles/@tanstack/oracles@97a4e7a`.
The [inventory](oracle-migration.json) records the original files, current
implementations and property IDs. Setup adds cancellation work boundaries and
an API sunset oracle: 37 Worker files, two Studio files and one browser file.
The expired host-root `/api` alias and audience on mounted deployments are
removed; root deployments retain `/api`.

The original inventory has eight generated Worker suites, 28 enumerated Worker
suites, one generated Studio suite and one enumerated browser suite. Enumerated
suites exercise semantic input/action plans through independent domain models,
receiving drivers and reusable checks. They do not wrap fixed assertion callbacks.
Enumeration remains finite evidence. The generated Worker campaigns retain eight
runs per lane; Studio retains 50. Fixed and random lanes share grammars and budgets.

## Run and replay

```sh
npm ci --legacy-peer-deps
npm run check:oracle-migration
npm run typecheck
npm run lint:oracles
npm run test:oracles:worker
npm run test:oracles:studio
npm run test:oracles:contracts
npx playwright install chromium
npm run test:oracles:browser
```

`npm run test:oracles` runs the three runtimes sequentially. Ordinary `npm test`
and `npm run test:ui` exclude oracle files; CI runs both the ordinary suites and
separate gap gates. Ordinary Playwright tests retain the shared editor schedules
through `e2e/save.spec.ts`.

Copy every coordinate from the same generated failure:

```sh
WORKER_ORACLE_PROPERTY=mention-order WORKER_ORACLE_SEED=20261001 \
WORKER_ORACLE_PATH='<reported path>' WORKER_ORACLE_UNIT='<reported unit>' \
npm run test:oracles:gaps -- --runtime worker --files test/mention-order.oracle.test.ts \
  --source src/mention-groups.ts --only mention-groups.ts:M12
```

Studio uses `STUDIO_ORACLE_*`; browser uses `BROWSER_ORACLE_*`. Seed-only runs
reseed exploration. Path replay requires its property and unit. Registries reject
unknown property IDs, and Worker/Studio reject the retired `ORACLE_TARGET`,
`ORACLE_SEED` and `ORACLE_PATH` variables. Enumerated histories have named tests.
The gap wrapper defaults to two contexts; browser uses one. Vitest Worker/Node
configs also cap workers at two.

## Preserve the original observations

The [preservation inventory](oracle-preservation.json) stores the original
normalized comparison and case expressions, original table rows, and their
current property/model/check destinations. It retains the original base hashes
without requiring Git history in CI. The migration audit checks all 38 current
implementations, live property registries and destination/checkpoint references.

The inventory accounts for 890 original comparisons, 193 case declarations and
301 table rows across 29 enumerated suites. Of the 890 comparisons, 850 remain
Worker receiving predicates, 38 remain browser predicates, and two nested MCP
checker assertions moved unchanged into the ordinary `test/mcp-model.test.ts`.
The generated feed suite contributes 123 additional original comparisons outside
that fingerprint total. An independent read audit traced the mapped predicates,
including exact values, order, cardinality, full snapshots and receiving cuts.
Mapping completeness and counts are not a semantic equivalence proof.

Each enumerated driver records public observations. Models derive the owed
result from semantic plan inputs; opaque credentials, epochs and IDs use stable
handles or equality relations where only those relations are promised. Expected
values do not come from recorded production outputs. Production errors are
observed around the actual promised call. Fixture and cleanup errors retain their
original cause and secondary diagnostics. A completion marker after cleanup gates
missing-tail checks; an earlier real mismatch remains a semantic violation even
when later cleanup also fails.

The violation names the checkpoint actually recorded by the driver. A diagnostic
alias can describe a difference, but cannot replace that checkpoint: the framework
uses the recorded name to distinguish an earlier mismatch from an inferred missing
tail when the driver throws. Checks compare received values before checking a
completed trace's cardinality. Pure controls execute the installed framework's
judge with real cleanup aggregates, including wrong values, extra observations,
correct interrupted prefixes and completed omissions.

## Runtime integration

`test/oracle-storage.ts` snapshots disposable D1/R2 state, suppresses triggers
while restoring it and supplies fresh DB identity for provider initialization.
It preserves operation and cleanup failures separately.

The pinned framework capture harness expects writable Node filesystem namespaces
and resource enumeration. `scripts/oracles-cloudflare.ts` adapts capture writes
through a local Miniflare service binding restricted to the active temporary
report directory. A SHA-256 guard rejects a changed upstream harness. Framework
instrumentation and verdicts remain active. Workerd is conservatively I/O-bound;
Node resource-idleness and work-ratio conclusions are unavailable there.

Browser histories run actual Chromium against a disposable compiled Worker on
desktop and iPhone 13 profiles. The browser gap runner invokes the upstream CLI
with an authored source mutant. A Vite bridge rebuilds the separate SPA bundle
from the active mutant source, so the rejected-save control reaches the browser.
Route callbacks retain their history's observation context. A Node-only mutation
switch is insufficient for this bundle boundary.

## Lint and CI

Framework and plugin both use pkg.pr.new commit `97a4e7a`:

- `https://pkg.pr.new/TanStack/oracles/@tanstack/oracles@97a4e7a`
- `https://pkg.pr.new/TanStack/oracles/@tanstack/eslint-plugin-oracles@97a4e7a`

ESLint 9 uses the recommended and production presets with TypeScript parser 8,
without formatting rules or rule disables. Maintained SDK files are included;
only generated SDK files and build output are excluded. `better-auth/api` is a
non-test package because its endpoint factory does not register tests. A deliberate
imported `fc.assert(...)` lint probe is rejected by `oracle/oracle-property-only`.
The installed `no-unit-test` rule cannot determine whether a helper hides fixed
assertion callbacks inside a complete property; independent review checks that.
Passing lint alone does not establish model independence or framework conformance.

Typechecks explicitly invoke the repository's TypeScript 5.9.3. npm can otherwise
link `.bin/tsc` to the framework's private compiler alias. AGENTS.md has template 4;
CLAUDE.md retains its existing link to AGENTS.md. Ten repository skill pointers
under `.agents/skills/` and `.claude/skills/` load the pinned installed skills.
No global agent configuration changed.

Check and the release fallback run lint, the preservation audit, Studio gap checks
and focused Worker contract gates. Check also runs every Worker oracle baseline
with one sampled storage mutation and the Worker capture/replay control. Browser
CI runs the rebuilt-source gap gate. Historical mutation controls retain their
original source changes. Of 74 controls, 73 retain their original history pattern.
The HEAD control now selects the existing HEAD history, with counted work recorded
after that request; its former cron history never sent HEAD. The original HEAD
mutation now has a receiving observation that can reject it. Compound controls that patch
multiple files are reported as explicit manual RED experiments through the gap
runner, separately from authored or automatic framework kills.

The project gap wrapper fails on a provisional report, failed baseline,
nondeterministic oracle or open gap. Historical Studio mutation verification also
requires a nonempty executed baseline with no outside-test failure before
crediting an exact-law kill or native replay. A supported upstream report can
contain an unstable neighboring unit alongside a stable kill; the verifier
rejects that report. All 64 gap-routed historical controls declare ownership of
their actual receiving source and authored mutation anchor; ten other controls
retain their ordinary, browser or race runners. Upstream exit zero alone says the CLI
completed. The CI source samples are explicit regression gates, not an exhaustive
mutation audit of the repository.

## Contract enforcement

- Cancellation rejects before revision reading, after that await and after
  content loading, with the approved read/load work boundaries. The independent
  phase table checks both rejection and work counts.
- Storage cursor walks compare complete sorted live keys, `list_complete` and
  cursor metadata. Dropping `list_complete` (`oauth-storage.ts:M51`) is rejected.
- Mention-group walks receive a cursor for an independently declared matching
  collection descriptor. The model imports no cursor codec, identity hash or
  production SQL. Dropping the collection name (`mention-groups.ts:M12`) is rejected.
- The two-release mounted API compatibility window announced in 0.49.12 expired.
  The sunset oracle failed before removal and passes afterward: retired mounted
  aliases return 404 and retired audiences are rejected, while current grants and
  root `/api` still work. Refresh cannot retarget a former grant.
- Direct `authLocations` observations reject the missing-location result from
  `oauth.ts:M1`. A login-fixture exception is not used as mutation evidence.

## Validation record

Evidence applies to the migration based on
`0e9bd933e30a13c12b1c9fe5c855477d61e8fd91`, after replacement of the fixed-assertion
adapter. Earlier adapter-era results do not establish the repaired tree's GREEN.

The checklist v1 review applies as follows. These are bounded enforcement results,
not a claim that sampled mutations establish every possible behavior.

| Requirement | Review result |
| --- | --- |
| ORC-001 | Each property retains its contract authority and limits; cancellation uses the approved work-boundary decision and the API sunset uses the expired compatibility window. |
| ORC-002 | Domain models derive outcomes from semantic inputs or independent relations; the removed adapter's trace-derived expected answers are absent. |
| ORC-003 | Law prose, histories, model, receiving driver and check remain separate in each suite. |
| ORC-004 | Original generated bounds, seeds, cases and dimensions remain; framework round-trip validation and constructed reach run with the campaigns. Enumerated suites claim their finite histories only. |
| ORC-005 | Worker, Studio and Chromium drivers record the promised response, state, order and work observations. Controlled-provider limits remain explicit. |
| ORC-006 | Calibrations reject wrong observations. Historical authored controls require an exact structured law and recorded checkpoint; setup failures are rejected as evidence. |
| ORC-007 | Generated lanes preserve their budgets and fixed/random campaigns. Registries reject unknown properties; verifiers capture and replay native seed, path, unit, history and violation. |
| ORC-008 | Models retain distinctions needed by existing legal continuations; stable handles represent opaque identities without importing production state. |
| ORC-009 | Project glossary terms and explicit identity/equality mappings define shared and model-only concepts. |
| ORC-010 | Actual-judge controls preserve received violations and cleanup causes; correct incomplete traces preserve the original error. Resources are released by receiving fixtures. |
| ORC-011 | Independent sequence, state and byte-preservation relations challenge the named shared-fault hypotheses. No unresolved shared semantic fault was confirmed by the preservation review. |
| ORC-012 | This versioned record, the original inventory and preservation map accompany the reviewed source. Scratch raw review and probe outputs remain local. |
| ORC-013 | Constructed histories and original controls distinguish expiry, cursor, scope, cancellation and save boundaries from nearby wrong rules. |
| ORC-014 | Workerd/D1/R2 and Chromium provide local receiving witnesses. Controlled transports, clocks and providers do not establish deployed-host behavior; the laws retain those limits. |
| ORC-015 | Important generated properties declare law-dependent states and construct their premises; enumeration runs every bounded history. |
| ORC-016 | Product oracle files register through `oracleProperty`; fixed cases are semantic inputs to independent models, rather than assertion callbacks. Ordinary harness comparisons remain in ordinary test files. |

- Preservation audit and corruption controls pass: changing an original
  expression, removing a table row, omitting a destination or omitting a registry
  entry is rejected. All 38 original implementations remain accounted for.
- Studio: 69 checks in two files, stable repeat traces, 25 mutations rejected and
  zero gaps. The wrapper accepts explicit file selection and creates a new output
  directory. Fresh captured replay reproduces property `studio-polling-work`,
  seed `20261001`, path `0:7:3:2`, unit `random seed: failed retry`, law
  `poll work`, recorded checkpoint `poll`, and reduced history `["poll","write"]`.
- Focused Worker contract gate: 47 checks in three files, stable repeat traces,
  three selected mutations rejected and zero gaps.
- Browser: all 48 desktop/mobile checks pass with stable traces. The rebuilt
  `save-rejection` authored mutation is rejected by its registered save law;
  zero gaps and a nonprovisional report. Local validation uses Playwright's
  configured cached Chromium; CI installs that browser explicitly.
- Full Worker: 967 checks in all 37 files pass, stable repeat traces, one sampled
  storage mutation rejected and zero gaps. The three added HEAD work calibrations
  are included in this count. Fresh Worker/D1 replay reproduces pagination seed
  `20261001`, path `0:2:4:4:0:2`, unit `random seed: generated`, law `complete walk`,
  recorded checkpoint `page`, and reduced history `{"times":[0,0],"width":1}`.
- All 74 historical controls pass: nine lifecycle/pagination/mention, three auth,
  53 security, and nine polling controls. Native capture/replay is verified for
  authorization, expiry, mention delivery/order, pagination and Studio work.
  The two multi-file compound experiments remain explicitly labeled manual RED;
  they are not counted as automatic framework kills.
- The bounded pure failure-fidelity matrix covers 105 registrations: 1,696 empty
  or matching interrupted-prefix controls yield no false semantic credit, and
  832 recorded mismatch variants retain the actual cleanup error and original
  cause. Six shared trace controls pass. These use synthetic receiving-shaped
  traces and the installed judge; they are not production execution counts.
- Ordinary UI: 307 tests in 32 files pass. Ordinary Worker: 1,849 tests in 166
  files pass, with five existing skips. Build, repository TypeScript 5.9.3,
  oracle lint, migration preservation and OpenAPI drift checks pass locally.

The executable source stamp for these runs is
`52582901b4980473926b6acdb3fb7ddaf0ced02ad03ba11539ae1db7fbe9b502` over
711 source/test/config/schema/manifest files; editable documentation and derived
build output are excluded. The subsequent verifier cleanup removes eight duplicate source copies from
`scripts/verify-oracle-mutations.ts`; every other executable file is unchanged.
Executing the actual copy blocks before and after yields byte-identical inventories
of 869 files and links. The existing pin-persistence baseline/authored control,
lint and whitespace checks pass after that cleanup. The updated executable
manifest stamp is
`7186d36839d22e2e1825c02c4999eea454e08b4aff83ec8c1ad36766e6c37504`
(SHA-256 of the compact JSON path/hash array).

A combined-tree check with the companion reading-state changes exercises its
replacement SDK, cursor and batching boundaries instead of retaining the deleted
revision-polling helper. That Node campaign passes 1,158 stable checks and rejects
all 502 owned/authored mutations with zero gaps; 1,624 unowned warnings are separate
and are not claimed as kills. Its exact supplementary Worker CI command passes
17 stable checks and rejects four authored D1-derived invalidation controls.
All 30 selected desktop/mobile browser tests, nine adapted polling controls with
native replay, and 66 affected ordinary Worker tests pass. The migration and the
reading-state feature remain separate changes.

Controlled clocks/providers and local workerd/D1/R2 do not establish deployed
Cloudflare scheduling, production DNS/proxy policy, Firefox or WebKit behavior.
The CI jobs are configured; pushed-head CI and PR readiness remain to be verified
after the review workflow permits committing and creating the PR. Nothing was
deployed.

### Main integration: 2026-11-19

Merged main `2d153071e83261e62be5a1ec926c3f1f3e2fe26a` into the
reviewed migration at `0bb48f1ad89d4a64ab2f3a1fe4c6f0655fcc669d`. The
migrated API model now expects main's private contract version `5.13.0`,
matching the upstream test update. The workflow retains the oracle gates,
main's WebKit installation, and its 40-minute e2e limit.

On this combined tree, the full Worker gap gate passes all 967 checks in
37 files with stable repeat traces, one sampled storage mutation rejected,
and zero gaps. A focused contract gate passes 47 stable checks in the API
mount, mention order and OAuth storage suites; it rejects
`oauth.ts:M1`, `mention-groups.ts:M12` and `oauth-storage.ts:M51`, with zero
gaps. Both reports are nonprovisional. These local runs used one context
and a temporary one-worker configuration to share machine capacity; test
histories, seeds, limits and assertions were unchanged.

Build, typecheck, oracle lint, migration preservation, release metadata and
whitespace checks pass. The production delta against this main remains
limited to `src/index.ts` and `src/oauth.ts`, with both files identical to
the reviewed migration. These local results precede the new pushed-head
CI run.

The first pushed merge run passed eight CI jobs. Ordinary e2e completed
with 592 passes, three retry flakes and 26 skips, but the browser oracle
baseline stalled until the combined job's time limit. The separate oracle
SPA builder had not received main's new component-gallery build flag and
stub substitution. A build-flags probe raised `ReferenceError: process is
not defined` with its old configuration; the production configuration
initialized normally. This was a harness startup failure, not a save-law
RED or a mutation kill.

The browser builder now applies the same disabled gallery flag and stub as
the default production build. Against otherwise unchanged `bf12caa`, all
48 desktop/mobile browser checks pass in stable repeated baselines
(85.7 and 74.9 seconds locally), and the rebuilt `save-rejection` mutation
is rejected by `acknowledged ordered saves`: zero gaps, nonprovisional.
The model, laws, histories, driver, assertions and run budgets are unchanged.
Oracle lint and migration preservation pass after the builder repair.

The builder repair also passes CI: 595 ordinary e2e tests (26 skips) and
all 48 browser oracle checks, stable repeats, one authored mutation rejected
and zero gaps. In the same run, Worker security controls progressed without
an assertion failure until their 25-minute job limit. Only that matrix job
now has a 40-minute limit; the selected controls and their checks are
unchanged, and the other mutation jobs retain 25 minutes.

Main then advanced to `764cb40d15b8062dad70032f262807f4472ec962`
(client 0.64.1, Hono 4.13.18 and fast-xml-parser 5.12.1). Its changelog
entry and this branch's separate Unreleased API sunset entry are both
preserved. After installing the merged lockfile, build, typecheck, oracle
lint, migration preservation and release metadata pass. The focused
mounted-API gate passes all 13 checks with stable repeats, rejects
`oauth.ts:M1`, and reports zero gaps, nonprovisional. Contract 5.13.0,
SDK 0.19.0, TypeScript 5.9.3 and the framework/plugin pin remain intact.
