# Final formatting-oracle integration and loss review

2026-11-18, `/root/review_formatting_coverage`. Independent source-only review of
HEAD `28b0c8d642a87e5810ad6eabd95c2d1714c53396` plus the fingerprinted working
tree below. Read the pinned `@tanstack/oracles@97a4e7a` oracles-review skill,
checklist v1 and glossary. No browser, install, test, mutant, source edit,
staging or commit operation was run. Only this document was written.

Scope: package/lock changes; formatting runner and disposable application
bootstrap; Vitest discovery/browser capture; Check/Release wiring; the four
deleted formatting test files and their current receiving/source replacement
routes; retained adjacent tests; local feedback/install hygiene. This is not a
second complete semantic audit of every oracle or a whole-repository zero-gap
claim. Raw challenged claims are preserved before their dispositions.

## Raw integration findings and challenges

### FI-001: a green CI job does not establish absence of mutation gaps

- **Challenged claim:** a successful `test:formatting` command means no new
  mutation gap exists.
- **Authority:** the user asked to ensure no gaps; ORC-006/012 require honest
  mutation classification and closure evidence. The pinned CLI documents
  exit 0 for any completed gap report, irrespective of gaps.
- **Small witness:** child exits 0, report is nonprovisional, baseline failures
  and nondeterminism are zero, but a result is `survived`. The wrapper's
  `scripts/formatting-oracles.ts:64–68` still leaves exit status 0.
- **Evidence:** read from source. This is an integration limit, not an executed
  fault injection or a newly discovered surviving production mutant.
- **Consequence/next step:** CI runs and uploads the gap report but does not
  enforce a zero-gap or no-new-gap policy. Report review is still required.
  The existing M22/M30/M52 framework findings are not closed by a successful
  CI status. This reviewer made no new gap-policy decision or runner change.

### FI-002: local-only feedback and active scratch directories are not ignored

- **Challenged claim:** local-only material is protected from broad staging.
- **Authority:** user approved an uncommitted local `oracles-feedback.md`;
  repository instructions prohibit committing dependency-recovery workarounds.
- **Small witness:** `git add .` would include untracked, nonignored
  `oracles-feedback.md` and any current root `.oracle-gaps-*` scratch files.
- **Evidence:** source/status read only. The index is empty; the feedback is
  untracked and `git check-ignore` finds no matching rule. Active scratch
  directories were also visible as untracked; their names change as jobs end.
- **Consequence/next step:** no staging violation exists now. Before a future
  commit, use explicit reviewed paths or a local Git exclude and verify the
  index. No ignore/source mutation was made during the freeze.

### FI-003: session-only SPA navigation would lose the old hard-load boundary

- **Challenged claim:** the session oracle alone reconstructs the original
  full-editor-to-quick-edit history in deleted `e2e/format-shortcuts.spec.ts`.
- **Authority/witness:** the original test applies I/I to a loaded marker,
  performs hard `page.goto('/studio')`, opens the same item in quick edit and
  checks B produces `**marker**`. Current session-driver uses the real SPA
  compose link, whose save-on-leave boundary differs from a hard document load.
- **Evidence:** read from old test and current session source. An initial
  message flagged this as a potential remaining loss before checking all
  replacement properties. Historical review prose is not current source.
- **Next check:** inspect current navigation model, driver and registered
  comparison for the original hard-load sequence and the later quick edit.
  Its disposition below supersedes the initial candidate gap.

### FI-004: ancestry-only preview data would lose the old tight-list observation

- **Challenged claim:** a list/item/inline projection alone preserves the old
  rendered assertion `/<li>a<[uo]l><li>b/` on whitespace-stripped HTML.
- **Authority/witness:** original formatter unit renderer loop requires the
  nested list immediately after literal parent text and also forbids `<pre>`.
  A loose parent paragraph with intervening blocks could preserve a coarse
  ancestry projection while failing that old assertion.
- **Evidence:** old assertion and current list registration/model read from
  source; no new Markdown/browser probe. Historical loss report names this
  concern; current executable `tight` observation is checked below.
- **Next check:** verify actual tightness, exact ordered structure and `<pre>`
  absence reach the same registered checker on every original rendering input.

## Integration observations

`package.json` adds `test:formatting` invoking
`node --import tsx scripts/formatting-oracles.ts`. Default selection starts a
disposable real Worker/application and bundled Chromium server, then runs the
pinned CLI with the actual browser transport environment,
`vitest.oracle.config.ts`, fixed seed 20261118 and the authored-mutant directory.
The default operator-source set is formatting/links/Draft. Explicit navigation,
workflow and receiver selections additionally request authoring.tsx operator
exploration. This is a source-scope boundary, not a claim that default CI
operator-mutates all authoring code. Authored receiver challenges are still
loaded; the pinned runner applies authored patches to their owned source,
including sources outside that operator list.

`vitest.oracle.config.ts:7` includes all 14
`test-ui/editor-*.oracle.test.ts` files by default. Every current entry is also
accepted by the wrapper's explicit `--oracle` list; there is no discovered
entry omitted from it. Every helper under `test-ui/editor-oracles/` has
`oracle` in its filename. Inspection found registrations through
`oracleProperty`; no ordinary test assertion was introduced in those files.
`vitest.ui.config.ts:7` excludes exactly the formatting entry pattern while
retaining `test-ui/polling-cache.oracle.test.ts` and adjacent ordinary UI tests.
The separate config avoids the UI runner's older ORACLE_SEED target guard.

The browser-source plugin captures instrumented formatting/links/Draft source;
driver calls run those exports in browser `page.evaluate`. Receiving paths use
the real app, with helper delegates. The authoring query path rebuilds the
current supplied receiver and records/verifies source inputs; application
driver routes that source into the actual app. The disposable host applies
real migrations and authenticates a local test owner. Its outbound service
returns 503. Nothing here requires private deploy config or production access.

Check has an unconditional formatting job at lines 83–99: npm ci, install
Chromium, run the full default command and upload evidence with `if: always()`.
It is not omitted by e2e/mutation path scoping. Release waits for this commit's
successful whole Check run on main; absent that run it executes formatting
oracles at lines 69–71 after installing Chromium. Thus both regular Check and
hotfix Release fallback include the generated browser suite.

Independently rebuilt integration outcome: if the CLI completes with exit 0
and a report row has `failed:1`, wrapper line 68 sets `process.exitCode=1`.
The nonzero shell result fails the GitHub run step. `provisional` and reported
nondeterminism are also rejected. Child nonzero status is retained; missing or
malformed report throws; application/browser setup and cleanup exceptions
throw after cleanup. This trace establishes the source-level failing-baseline
gate. It is not an executed mock-process or CI receipt, and it does not change
FI-001's separate survivor limitation.

## Deleted-test scope and receiving reconstruction

Only four test paths are deleted: `test-ui/format-shortcuts.test.ts`,
`test-ui/links.test.ts`, `e2e/format-shortcuts.spec.ts`, and
`e2e/markdown-structure.spec.ts`. They contain formatting/link source and
browser observations; no unrelated test file is removed or edited. The
following current routes were read against those old files:

| Old obligation | Current registered route and retained observation |
| --- | --- |
| Single/multiline emphasis and placeholder links | Inline model retains original `source*` constructions, exact source partitions, selected/external marker combinations and output/range checks. |
| Format/structure keys | Keyboard model constructs each named key × 16 modifier masks × both platform flags; explicit ASCII chord model and exact return comparison cover original keys and modifiers. |
| Indent/outdent/declines and selected-line bounds | List model retains all 24 original source constructions, EOF/context variants, exact edit/output/range and null-decline comparisons. |
| Five rendered list inputs | All five `original*` nesting cases are deterministic. Rendering records `tight`, ordered complete list structure, parent preservation, no-code/no-`<pre>`, selection and EOF caret, all compared together. |
| Nine Shift+Enter inputs and repeated verse rendering | Break model retains exact `old*` input records; original three-line verse is a constructed history through real browser breakEdit plus exact rendered HTML and carets. |
| Six code-block examples and four formula examples | Block examples reconstruct empty/source/boundary/trailing-LF partitions; default source serialization remains checked on noncolliding old inputs. Inline formula `source*` cases preserve old partitions and inner selection. |
| Completed URL/link helper tests | Link model retains exact old all-tracker/whitespace/invalid/escaping and insertion inputs; recognition, cleaning, source, insertion and feedback properties compare complete returned values, including insertion-result-to-toast call shape. |
| Composer B/I/B/I, undo, rerender, K and typed target | Session model/driver capture every action; `undoneState` is before redo, and link/typed-target checkpoints remain separate. |
| Full editor I/I then same-item quick B | Session supplies normal in-app save-on-leave; navigation supplies original hard goto with explicit unload choice and later same-id quickLoaded/quickBold. See FI-003 disposition. |
| List keyboard/focus/typing/undo, prose Tab, verse preview and toolbar | Session constructs both viewport profiles, original fruit/apples/pears, `Plain prose.`, Tyger verse and toolbar/code sequences; exact source, focus, sibling array, paragraph/break counts and visible first-item explanation are checked at their original action boundaries. |

This is an integration cross-check of those routes and key historic loss
concerns, not a fresh assertion-by-assertion campaign. Detailed original
assertion inventories remain in the existing `browser-review/final-loss-*`
and `loss-audit/` records; their earlier findings are not treated as current
source dispositions automatically.

Retained `e2e/picker.spec.ts`, `e2e/focus-view.spec.ts`,
`e2e/editor-regions.spec.ts`, `e2e/editor-panes.spec.ts` and
`test-ui/authoring-revision-session.test.ts` are byte-unchanged from HEAD.
Broader paste/sheet tests in compose-pwa, save-oracle and parity suites remain.
Their picker search, focus/fullscreen/layout, restore/publication/revision and
other non-formatting behavior is not claimed replaced by formatter oracles.

## Current-source dispositions

- **FI-001 remains an explicit integration limit.** CI tests baselines and
  publishes mutation evidence; a green job alone is not a no-new-gap gate.
  No runtime-survivor finding was invented by this source review.
- **FI-002 has no present staged violation.** Index was empty on both reads.
  Local feedback/scratch remains unignored and must stay out of any later
  broad stage/commit; this is a staging follow-up, not a source fix.
- **FI-003 is satisfied by the current navigation oracle.**
  `original-leave-{desktop,mobile}` forces I/I. Holding starts before either
  command, so no formatter write is silently acknowledged. Driver retains
  hard `page.goto('/studio')`, captures the original document's instrumentation
  and explicitly accepts Leave, matching the old Playwright implicit
  auto-accept premise. On completed departure it selects that created item's
  card, opens quick edit, observes `quickLoaded`, selects its whole source,
  presses B and observes `quickBold` (`navigation-driver-oracle.ts:239–245`).
  Model independently predicts original body and `**body**` with selection
  `[2,2+body.length]` and focus; registration compares both checkpoints. The
  body grammar admits the old `Keys` plus hexadecimal marker. The pending
  schedule separately distinguishes prior committed source from latest
  uncommitted input, and Stay/Leave are explicit inputs. This disposition is
  source acceptance, not a new browser pass or no-loss-after-discard law.
- **FI-004 is satisfied in current source.** List rendering requires
  `tight:true`; all non-list tokens must be hidden paragraph wrappers or
  literal-text inline children. Exact complete ordered structure and
  `noPre:true` also reach `result` comparison. This rejects the intervening
  loose-paragraph/thematic-break design while retaining the five original
  deterministic rendering inputs.

No additional current-source migration blocker was identified in this bounded
integration review. Final combined browser receipts, known framework findings
and overall closure remain the parent's evidence obligations.

## Install and staging hygiene

The repository package manager is npm. Package and lock pin the same requested
97a4e7a URL as a dev dependency. Parsed lock comparison adds only
`node_modules/@tanstack/oracles` and its declared
`node_modules/typescript-for-tanstack-oracles` alias; no existing package entry
is removed or changed apart from the root dependency map. The pre-existing
js-yaml override is unchanged. No pnpm/yarn lock or new .npmrc appears, and
there is no dependency downgrade/403 workaround in this diff. node_modules,
build and ordinary browser output directories remain ignored. The intentional
package/lock additions are not generated-install noise.

No file was staged, committed or pushed. The index was empty at final audit.
The user-approved feedback log is therefore still local and uncommitted, with
the explicit future-staging caveat in FI-002.

## Checklist v1 outcomes

| Requirement | Outcome in this integration/loss scope |
| --- | --- |
| ORC-001 | Existing adopted formatting/navigation authorities traced; no new product policy adopted. No zero-gap inference from CI. |
| ORC-002 | Replacement model routes inspected independently of real drivers; integration wrapper has no expected-product model. This is not a new full model-independence audit. |
| ORC-003 | Entry files separate law/histories/model/driver/check and explain browser/model boundary; filename convention retained. |
| ORC-004 | Exact historic case families/receiving routes cross-checked; original hard goto survives in navigation, not session alone. No grammar edit made. |
| ORC-005 | Default discovery, actual browser delegation and current app capture traced. Baseline failure propagation traced through CLI report, wrapper status and CI step. No new run claimed. |
| ORC-006 | Mutation-gap exit semantics and source-only versus executed evidence kept distinct. Parent's campaign receipts decide kill outcomes. |
| ORC-007 | Pinned runner invoked with same fixed/random registrations, seed and replay-capable CLI; source check only. |
| ORC-008 | Not triggered by review: no model-state change. Existing receiving action state remains in the unchanged current models. |
| ORC-009 | Helper formatting, native input, app receiving and hard/SPA departure boundaries distinguished. |
| ORC-010 | Wrapper retains child status; app/browser cleanup uses settled results and aggregates setup/cleanup errors. No new runtime-cleanup proof. |
| ORC-011 | No new shared semantic fault requiring another formulation found; actual preview/tight-list and explicit navigation are retained different observation paths. |
| ORC-012 | Raw challenges, current dispositions, evidence status and file hashes retained here; whole-suite closure is not asserted. |
| ORC-013 | Old selected/external/boundary/renderer cases remain constructed. No new reusable threshold claim introduced by integration. |
| ORC-014 | Real-browser and controlled-host claims remain distinct; pending writes and explicit dialog choice are inputs, not modeled acknowledgments of withheld writes. |
| ORC-015 | All 14 entry files discovered; named original contexts use registered constructed histories. Runtime reach belongs to campaign receipts. |
| ORC-016 | Oracle entry/helper filenames contain oracle; ordinary example tests remain outside the new oracle files. |

## Reviewed source fingerprints

SHA-256, recorded after source review; HEAD plus these uncommitted bytes identify
this review rather than an older prose report:

| File | Hash |
| --- | --- |
| `package.json` | `add403705ee82217333174ea07c2d6c234481adf9f4ca768213ad432841a7594` |
| `package-lock.json` | `f04322f95913663762361b3c8d1a8c5d0dae30bdd4fdcdb2a8a69e9936c59d1b` |
| `scripts/formatting-oracles.ts` | `978cdd0fe4c3581cd85fd2804c8b0212146ba5b5b54f1d8a37a422fa97ff6563` |
| `scripts/formatting-oracle-application.ts` | `99b5a301aebc22699eed02c0c11781b0268bd2227fc59394dc5fcbe77f46e03c` |
| `vitest.oracle.config.ts` | `62264d25f35bc03e4b19ace9d26843d74c525296d71541f99909d96357ab353a` |
| `vitest.ui.config.ts` | `1bcec534c5ae646a34eb7cdb67888a097b5f4491617e7cff1c3563d6526b29e5` |
| `.github/workflows/check.yml` | `ce5177d5d1c5f3d99736f32f5c719e23a9f0d30190617a25f4c64abf330e9ecc` |
| `.github/workflows/release.yml` | `3165a8048b5c42feb385284fa7b23d3df53762a65bbb12e2b165a55567b37816` |
| `test-ui/editor-oracles/browser-source-oracle.ts` | `f429151f9bfa87b1de9ff19614c6ed063acc0d90cd33cf34be2c62c5d458a3e8` |
| `test-ui/editor-oracles/browser-driver-oracle.ts` | `b0ca432cf84f1dcfb60ac5e0e9052d2f3eb524e0594be9a5e158a3e7d620562f` |
| `test-ui/editor-oracles/navigation-model-oracle.ts` | `568b1ecd150459fc7aa384f50edfeb19489f2ee402130f9ef05bcfdc85d0d2c4` |
| `test-ui/editor-oracles/navigation-driver-oracle.ts` | `82bf6662cb2ecd74805c7a70683af80cd091e816ecc068cf118910a28ccb45e4` |
| `test-ui/editor-navigation.oracle.test.ts` | `1f84b4f36ef00f56f3b782736442fa04e0900905c03d6aeba9c190b99111ba43` |
| `test-ui/editor-oracles/session-model-oracle.ts` | `d6bb8085476ca484670d2abd501bb7322374eb6186bf5561523412aec556d296` |
| `test-ui/editor-oracles/session-driver-oracle.ts` | `518e08e3c15822b02c4ea56a87b521beeafb56c3bccce559a0abd8909772e68c` |
| `test-ui/editor-session.oracle.test.ts` | `05e19052c5d1bbaa63cf30439d55e971fd468e93d4c793e0ba1be7a746d01d90` |
| `test-ui/editor-list.oracle.test.ts` | `5813bb32423a806cf1db2566bf40aeae43e5e237aecaf3f4fdf22edc95018fe9` |
| `test-ui/editor-oracles/list-model-oracle.ts` | `0c1684ebb0f07080b7733c3faa3c6e96f8d181e5bf827519b81325af5eb0ee01` |
| `test-ui/editor-oracles/link-model-oracle.ts` | `9af8f1836b794e82d60b3b6bf9e5ff4323e22acf840ac1bbfc522a7a81faa284` |
