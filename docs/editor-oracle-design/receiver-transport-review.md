# Independent receiver transport review

2026-11-18, base `28b0c8d642a87e5810ad6eabd95c2d1714c53396` plus the uncommitted source fingerprints below. Read pinned `@tanstack/oracles@97a4e7a` review skill, checklist v1 and glossary in full. This is a source and pure-build review of the transport change, not an execution review of every consuming oracle. No browser jobs, production edits or oracle implementation edits were run by this reviewer. The parent owns registered browser campaigns.

## Rebuilt observation and production route

The original `e2e/compose-pwa.spec.ts:145` requires clipboard URL `https://www.example.com/essay?id=7&utm_source=newsletter&fbclid=IwAR0x`, selected `the essay` in `Read the essay today.`, to produce `Read [the essay](https://www.example.com/essay?id=7) today.` and exactly `linked selection · 2 trackers removed`. The following non-URL read opens the sheet; its typed URL inserts an autolink at the captured caret. This contract predicts those observations without the production receiver.

The workflow construction reconstructs these inputs. Its independent link projection supplies source/caret/feedback expectations, while the actual app reads the clipboard and handles the button. `applicationDriver` loads the per-context bundle from `authoring.tsx?oracle-application`, installs the active helper/switch factories before SPA evaluation, routes the app script, and invokes the same React entry point. The driver captures actual host input separately, source/range/feedback after each action and all page errors; the registered check compares every promised field and checkpoint. The receiver query does not enter the model. Navigation uses the same host and retains an explicit outgoing-document packet when a hard navigation destroys the old page.

Pinned `oracle-gaps/check.mjs:529–567` strips the custom query before loading the exact current authoring patch or switch schemata. It excludes raw/URL/worker queries but not this custom key. The custom pre-ordered transform receives TSX before Vite's ordinary TSX lowering, then esbuild replaces only authoring with that exact input. Format/link/Draft app imports remain delegates to the corresponding exact current browser factories. Receiver switch calls use the already-installed `globalThis.__oracleGaps`; their packets enter the same Node capture. Source does not create a competing mutation switch or an expected-output seam.

## RT-001 — Nondelegated bundle dependencies are absent from the query's recorded inputs [P2]

**Claim challenged:** exact gap-context receiver source plus the current cache inputs is enough to reproduce the actual app bundle when other app files change.

**Source and authority:** `formattingApplicationSource` (`scripts/formatting-oracle-application.ts:10–34`) asks esbuild to read the rest of the SPA from the filesystem and returns only JS text. `browser-source-oracle.ts:11–17` returns a data-only module containing that text, with no Vite dependency edges or bundle-input metadata. Pinned `check.mjs#importsOf` records Vitest imported/evaluated module paths plus the worker capture's filesystem reads. The esbuild process's filesystem reads are neither. `capture-setup.mjs:1158–1165` deliberately strips query keys from evaluated module paths, correctly tracking the authoring file but not the app dependency graph. ORC-010/012 require faithful capture and source-bound evidence; exact receiver-source claims cannot omit other inputs that affect the emitted app.

**Smallest executed diagnostic:** `/private/tmp/blygger-receiver-transport-review-probe.mts` reads authoring once, appends one absolute scratch import, and keeps that entire authoring input constant. It writes the imported scratch module with marker `receiver-fixture-A`, builds with `formattingApplicationSource`, rewrites only the dependency to `receiver-fixture-B`, and builds again. The output was:

```json
{"sameAuthoringInput":true,"firstOnlyA":true,"secondOnlyB":true,"outputsDiffer":true}
```

The scratch dependency is removed in `finally`. No repository production file changed. This proves an emitted receiver bundle can change when the recorded authoring input does not. The corresponding actual repository dependency is, for example, `src/ui/caret.ts`, which is bundled directly rather than being one of the query/delegated factories.

**Evidence status:** input-dependency blind spot confirmed by source and the pure build. A stale cached verdict across an actual same-daemon dependency edit has **not** been executed; that consequence remains a source-derived hypothesis and must not be reported as a failed browser/cache experiment. Cold wrapper processes on unchanged dependencies remain bounded valid evidence; this finding does not turn their registered semantic assertion kills into setup failures.

**Next repair/experiment:** preserve exact instrumented authoring text, expose the esbuild bundle's dependency names and content hashes plus its own hash, and make the relevant query dependencies and worker filesystem reads visible to Vite/gap invalidation. Verify a dependency-only change both invalidates/rebuilds the bundle and changes the captured input fingerprint. Comparing patched authoring schemata to its raw disk file would be wrong: that deliberate difference is the mutation transport. Verify nondelegated inputs separately. Preserve the fixed-script path for selections that do not request the receiver, and run the original baseline plus targeted receiver mutants after any transport edit.

Disposition: `confirmed-open` for missing dependency capture. The author was informed before repair. Parent assigned the original harness implementer to address it; rereview will be appended.

## Other source dispositions and pending evidence

No additional concrete source blocker was found in query source selection, script routing or switch replay. These are source acceptance statements only. Actual authored receiver challenges must distinguish at the registered source/caret/prevention/guard checkpoints. They must not be called kills if import tracking, page startup, route delivery, missing native events or automation fail instead.

The query's variable dynamic import is evaluated by Vitest, and the pinned closing capture records evaluated module IDs after stripping query strings. This is a legitimate way to make the authoring source discoverable without running React imports in Node. A registered original receiver-defect kill is still needed to establish end-to-end source substitution, active switch replay and attribution in the current runner. The existing ordinary formatting factories remain the active helper sources; the SPA delegates do not capture old helper implementations.

Application setup creates its browser context before the query import and closes it even if the query/import/build fails. Cleanup errors retain the original failure as cause and separate children. The host observes page errors in `finally`. Browser or host setup errors remain runtime/setup outcomes when they prevent a law checkpoint; no blanket startup-error kill claim is supported.

The `receiver` selection enables authoring for workflows/navigation/default. Interactions intentionally selects formatter source until an authoring receiver is owned there. A selector's absence is not a closure claim. `useTextTools` and `Editor` ownership also bring sibling code into gap accounting; targeted challenge success must not be reported as all-authoring zero-gap coverage.

## Checklist disposition for this transport change

| Requirement | Outcome |
| --- | --- |
| ORC-001 | Existing workflow/navigation authorities remain intact; transport adds no behavior policy or model answer. Limits above distinguish cold frozen-dependency evidence from broader reproducibility. |
| ORC-002 | Accepted in source: query/build data goes only to driver setup; no emitted app result predicts expected observations. |
| ORC-003 | Accepted in source: dedicated loader/bundler/driver roles and design record explain the mechanism; source/model contracts stay separate. |
| ORC-004 | No generated grammar changed by this transport. Consuming properties retain their own reconstruction/ablation/range/exclusion obligations; review does not waive them. |
| ORC-005 | Exact intended receiver path is coherent in source; registered current receiver challenge receipts remain pending. |
| ORC-006 | Existing calibrations remain; actual original receiver-mutant assertion kills, with setup/crash distinctions, are pending parent execution. |
| ORC-007 | Fixed/random campaigns and budgets are not changed by transport; latest complete receiving/repeat/replay receipt remains pending. |
| ORC-008 | Not triggered by this transport diff: it adds source data transport and no state in an expected-result model. Consuming stateful models have separate reviews. |
| ORC-009 | Accepted in source: fixed script, per-run app source, delegated factories and call packet are named distinctly from expected document state. |
| ORC-010 | Setup/cleanup cause preservation accepted in source. RT-001 remains an input-capture fidelity gap; no fault/cleanup injection run by this reviewer. |
| ORC-011 | No new production/model shared semantic fault introduced by transport. Exact source substitution has a distinct pure-build formulation, but this does not replace actual receiving mutation evidence. |
| ORC-012 | This record preserves source fingerprints, raw finding, executed pure diagnostic and explicit unexecuted consequence. A final repaired-source and browser-receipt binding remains pending. |
| ORC-013 | Original workflow example predicts a concrete boundary observation; proposed receiver challenges distinguish cancellation/range/receipt/guard behavior. They remain proposed until parent runs them. |
| ORC-014 | Native/control host premises remain named by consuming properties; transport changes neither clipboard delivery nor native-history policy. End-to-end instrumented receiver handoff still needs current receipt. |
| ORC-015 | Transport strengthens driver path and does not remove any declared states/constructions. Existing path-specific constructed reach must be confirmed in the current run; mutation hits are additional path evidence, not substitutes for reach. |
| ORC-016 | No ordinary test/assertion was inserted into oracle registrations or this transport. Scratch build diagnostic is review evidence, not a replacement oracle. |

## Reviewed fingerprints

```text
b44f9500d4c483d236ed8a170c5869e9d17008b1cb99150f96350501a27df4a4 scripts/formatting-oracle-application.ts
a3ea6d37230c22e842be3f808eabfe307cbbb2789060ee13a5700cc714a30200 scripts/formatting-oracles.ts
1b6b3927ddbed9473bb8a4dd7422a187a2ece3e3b38e2d844de0add0a50165fb test-ui/editor-oracles/browser-source-oracle.ts
46a8138471e47022522cbe29fb49e087a47f3a5ee88b58b12c9128c993e8d71d test-ui/editor-oracles/browser-driver-oracle.ts
7b30f54e51005b02057c213fa0dcdea016b5549672452960eaa317b0c561d9b7 test-ui/editor-oracles/application-driver-oracle.ts
```

## Active-run source-stability diagnostic

While the independent RT-001 repair was being implemented, the parent's earlier `workflows-receiver` run completed as `5295a639c800`:158 checks passed in its baseline, three selected mutants were credited with registered law failures, and seven were labeled `crashed` by the pinned runner. All seven details are `Error: Browser oracle application source plugin was not installed` from the Node driver, before a browser receiving checkpoint. These are **harness setup failures, not seven production editor crashes and not kills**.

The run began with the old source-only query transform. During its later mutant work, the harness implementation gained metadata exports and the worker began requiring them. A warm configured plugin can retain the old transform closure while changed worker imports acquire the new requirement. This explains the observed missing-metadata boundary from source and timing; the specific old/new closure state was not instrumented, so it remains a source-derived setup diagnosis. Preserve the report and rerun a cold process after transport source freezes. Do not fix production or remove the metadata requirement to clear this result. A final source manifest must bind the completed new run rather than relabeling the old baseline as a new-transport pass.


## RT-001 repaired-source rereview

Disposition: **accepted for the demonstrated input-capture and query-invalidation boundary**. The original finding and its original `confirmed-open` disposition above are preserved as the raw review record; this section supersedes that disposition for the source fingerprints below. This acceptance does not supply an actual registered browser-mutant receipt or an executed same-daemon cached-verdict replay.

The repaired bundler records file bytes in its esbuild `onLoad` before consuming them, verifies that every nondelegated `metafile.inputs` source/data file is covered, computes the emitted JS hash, and captures root package/build manifests before and after the build. Its descriptor separates the intentionally supplied receiver hash and helper delegate paths from disk inputs. Worker verification hashes the emitted JS and reads every recorded file through normal `readFileSync`, rejecting stale or corrupt descriptors before browser routing. The custom query registers disk inputs with `addWatchFile`.

Installed Vitest disables file watching (`cli-api`'s `server.watch: null`), so a live watcher test alone would have been the wrong acceptance boundary. The final worker also imports non-`node_modules` inputs with `?raw`, yielding data-only evaluated module IDs. The pinned closing capture strips each query and records its real absolute path; `check.mjs#invalidateChanged` can therefore call Vitest's ordinary `invalidateFile` on a real source path. Vitest uses each environment's `getModulesByFile` and `invalidateModule`, whose graph includes the custom query's `addWatchFile` edges. This supplements the distinct `fs:<path>` hash records; no package-global or cache manipulation was added.

Author's executed pure control: `/private/tmp/blygger-rt001-control.mts`, receipt `/private/tmp/blygger-rt001-control-receipt.json`. Independent reviewer rerun/extension: `/private/tmp/blygger-rt001-reviewer-control.mts`, receipt `/private/tmp/blygger-rt001-reviewer-control-receipt.json`. The extension loads the query itself through `server.ssrLoadModule`, inspects the SSR environment graph, and reloads through that SSR API after the same public environment invalidation calls used by Vitest. It keeps `watch: null`. Its important results were:

```json
{"sameReceiverHash":true,"dependencyFingerprintChanged":true,"bundleFingerprintChanged":true,"firstOnlyA":true,"secondOnlyB":true,"oldDescriptorRejected":true,"corruptBundleRejected":true,"defaultSourcePreserved":true,"receiverExcludedFromDisk":true,"delegatesExcludedFromDisk":true,"inputCount":763,"watchingDisabled":true,"queryLoads":2,"invalidatedModules":1,"rawImportIsString":true,"rawImportDidNotExecute":true}
```

The 763 inputs include the one scratch module; the normal source has 762. The scratch dependency alone changes A→B while supplied authoring text/hash stays fixed. Old metadata fails with `Stale browser oracle application input: /private/tmp/blygger-rt001-reviewer-fixture.ts`; altered emitted JS fails its bundle hash. The graph lists the scratch real path with `authoring.tsx?oracle-application` as importer, and the reloaded query produces only B and new dependency/bundle hashes. Default-source and explicit-unchanged-authoring bundles remain byte-identical. Both scripts clean up their scratch dependency in `finally` and launch no browser.

The reviewer's first diagnostic adapter tried to evaluate SSR-lowered output as plain CommonJS and failed on Vite's `__vite_ssr_exportName__` helper before a query result. Replacing that adapter with the actual SSR module API produced the completed receipt above; no repository code was changed to address a scratch diagnostic error. Vite still emits its generic static-analysis warning for the variable dynamic raw import. The executed raw module returns source text and leaves its marker unexecuted; the warning is a tooling rough spot, not a demonstrated receiver failure. No ignore directive or warning suppression was introduced.

Limits remain explicit. The pinned capture excludes worker fs reads under `node_modules`, and the new raw-module imports also exclude them; dependency identity relies on the pinned installation and captured root `package-lock.json`/`package.json`, while descriptors still verify each consumed dependency file whenever a run executes. Captured root manifests and source inputs do not establish universal package-resolution or environment hermeticity. A change entirely inside `node_modules` with an unchanged lockfile is outside the demonstrated warm-cache invalidation boundary. No actual pinned daemon cache replay was run by this reviewer. Current frozen-source registered receiving baseline/mutant/replay evidence remains the parent's work. RT-001 repair adds no expected-answer source and no production behavior.

ORC-010 and ORC-012's former RT-001 input-fidelity limitation is repaired to this bounded extent. ORC-005/006/007/014 still require the parent's cold, stable-source end-to-end receipts; pure source/graph acceptance must not be substituted for them.

### Repaired-source fingerprints

```text
99b5a301aebc22699eed02c0c11781b0268bd2227fc59394dc5fcbe77f46e03c scripts/formatting-oracle-application.ts
b396bab5be6aa6d922aa4c9f8a0172253a92c08895770021f1f46b777965545a scripts/formatting-oracles.ts
f429151f9bfa87b1de9ff19614c6ed063acc0d90cd33cf34be2c62c5d458a3e8 test-ui/editor-oracles/browser-source-oracle.ts
b0ca432cf84f1dcfb60ac5e0e9052d2f3eb524e0594be9a5e158a3e7d620562f test-ui/editor-oracles/browser-driver-oracle.ts
7b30f54e51005b02057c213fa0dcdea016b5549672452960eaa317b0c561d9b7 test-ui/editor-oracles/application-driver-oracle.ts
```
