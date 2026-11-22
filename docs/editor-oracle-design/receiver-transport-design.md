# Receiver mutation transport — design before implementation

2026-11-18. Base `28b0c8d642a87e5810ad6eabd95c2d1714c53396`; pinned oracle package `97a4e7a`. This record precedes changes to the receiver transport. The parent requested strengthening existing workflow/navigation oracles so the actual application receives instrumented `authoring.tsx`, without changing production, laws, histories, or checkpoints.

The design-grammar triggers are a changed driver and the existing multi-law browser model. This is enforcement work under adopted laws, not a new editing behavior. The preservation relation is the same public observations at the existing workflow/navigation checkpoints for unchanged source, while making deliberate receiver changes visible to those same laws. Current capture/replay instrumentation, helper delegates, host premises and cleanup remain in place. When receiver instrumentation is absent, the existing fixed application script path is retained.

## Evidence that determines the transport

Pinned `oracle-gaps/check.mjs` lines529–567 installs a pre-load hook. It strips a query before looking up the exact current context's authored patch or instrumented source. It excludes only queries composed entirely of Vite asset/worker keys. Thus `authoring.tsx?oracle-application` is served from the same instrumented plain-path text as `authoring.tsx`. Its transform hook records the served file; it does not instrument the text there. The custom query must reach this load hook before any capture. A raw asset import would bypass it and is rejected as the adjacent invalid design.

Vite's built-in esbuild transform must not lower the TSX before the application bundle is formed: otherwise its JSX-runtime import resolution can diverge from the actual SPA build. A dedicated transform hook with `order: 'pre'` will receive the already loaded patched TSX before normal transform hooks. The existing post-transform capture for formatting/link/draft factories stays unchanged. Only the custom query is intercepted, and its Node-visible result exports a string without running authoring or React imports in Node.

## Parts, rules, and witnesses

| Part | Job and distinguishing witness |
| --- | --- |
| Shared application bundler | Reuses exactly the present SPA entry/options/delegates for the initial fixed script and the received per-run authoring source. With no override its JS body follows the old path. |
| Authoring-source override | An esbuild `onLoad` replaces only `src/ui/authoring.tsx` with the exact Vite-loaded text and resolves imports from that file's real directory. A deliberate `pourOver` or navigation-receiver mutation must then reach the actual SPA. |
| Custom query transform | Converts patched TSX into a complete browser application string. Its returned Node module has no authoring imports; importing it cannot execute production receivers in Node. |
| Conditional query import | Loads the application string only when workflow/navigation/all-source selection enables receiver instrumentation. A variable dynamic import avoids inventing production query-module declarations. Vitest still resolves and records that module dependency. |
| Application route | Fulfills `studio/app.js` with the per-run string when available, otherwise the original on-disk script. Same origin/cookie/API host and real React entry point remain. |
| Existing instrumentation setup/replay | Installs the same global mutation switch and records receiver sites into the same call packet as format/link/draft sites. Existing capture and departing-document packets remain the only replay path. |
| Selected source set | Adds authoring to workflows/navigation/default gap source selection; registration ownership remains limited to named receiver functions and is coordinated separately. `interactions` continues selecting format-shortcuts until its author registers it. |

Removing the authoring override returns the known receiver-mutation blind spot. Removing the custom-query load loses context-specific authored source. Removing the fixed-script fallback changes unrelated selections without a law requiring it. A second capture implementation would duplicate switch/reference semantics, so the design deliberately reuses the existing one.

## Alternatives and limits

The chosen form bundles the actual SPA from a query module's exact received authoring source. A runtime export of individual authoring functions would need React/dependency replacement and would stop exercising actual receiving components. Rebuilding from the filesystem after each mutant cannot see the gap runner's in-memory authored patches. A permanently instrumented fixed app could handle automatic switch mutants but would miss authored raw-source mutations. These alternatives fail the required transport boundary or add duplicate production representations.

This strengthens what the driver can expose; it does not simplify or change the expected-result model. No generated domain, budget, expected observation or allowed-set freedom is removed. No formal state checker is needed for a source transport. Static build/type diagnostics can establish module transport shape; only an actual registered receiver-mutant rejection at the intended checkpoint can establish the mutation receiving boundary. Setup failures, runtime crashes, missing events and timeouts must remain separate from law kills. Existing workflow/navigation raw findings remain append-only in `/private/tmp/blygger-links-review-ledger.md`.

Implementation is confined to the assigned five transport/runner files. Oracle registrations and production are not edited by this worker. Browser jobs are serialized by the parent; the worker will report readiness for diagnostics before starting any browser run.

## Implementation and pre-browser diagnostics

The five assigned files implement this design. `formattingApplicationSource` owns the existing SPA bundling options/delegates and accepts optional exact authoring source. `formattingBrowserSource` retains the existing helper post-transform and adds a separate pre-ordered custom-query transform. `browserApplicationSource` conditionally imports the query, and `applicationDriver` fulfills the same SPA route with its returned body or the original script path. The CLI enables this source path for workflow/navigation/all-source selections and accepts the upcoming interactions selection with format-shortcuts ownership selection. Registrations and production were untouched.

`npm run typecheck` passed. A no-browser bundler probe compared the default application body with the body from an override containing the exact unchanged authoring file: byte-for-byte identical, 1,880,002 bytes. A marker appended only to the supplied authoring source appeared only in the override bundle. This reconstructs the default build and demonstrates that the override, rather than a later filesystem read, supplies that receiver source. It does not establish a mutant law rejection.

A no-browser Vite transform probe served authoring text plus a marker through a pre-load hook matching the pinned runner's source lookup and transformed the custom query. The result exported `__oracleBrowserApplicationSource`, contained the source-only marker, and had no executable React imports. Installed Vite8.3.5 uses normal-order `vite:oxc` for TSX, not the earlier esbuild transform. The custom transform's `order: 'pre'` precedes that compiler despite its post-plugin position. The first probe emitted a sandbox HMR-socket permission error while still completing the transform; its clean rerun set Vite8's separate `server.ws: false` and completed without that setup diagnostic. No browser was launched by these probes.

The parent was notified that the transport is ready for serialized registered baseline and targeted receiver-mutant diagnostics. Those receipts remain pending: importing/routing/capturing the exact gap-context source must still be confirmed through the actual runner, including dynamic dependency tracking and departing-document replay. Existing switch and packet replay code was not changed. A setup error or runtime crash in that diagnostic must not be called a kill.

## RT-001 repair design before dependency-capture edits

Independent review confirmed that unchanged authoring text can produce a different bundle after only an esbuild-loaded transitive dependency changes. Its pure scratch-import probe establishes the omitted-input problem; it does not establish an executed stale daemon verdict. The initial data-only query module has no Vite import edge or worker fs read for dependencies such as `caret.ts`. This is a harness input-fidelity repair under the same public laws.

Keep the string-returning bundler API for existing callers and add an internal bundle descriptor: JS source and SHA-256, the exact overridden authoring-source SHA-256 separately, and absolute paths plus SHA-256 for nondelegated esbuild source/data inputs. File bytes must be captured when supplied to esbuild, not hashed only after compilation, which could label old output with later disk contents. The descriptor will use `metafile.inputs` to require accounting for each emitted dependency. Known helper delegates are identified separately: their implementations remain the existing Vite-captured browser factories. Patched authoring text is also separate and must never be verified against its intentionally different raw disk file. Explicit build configuration/manifests are captured around the build and must remain unchanged across it.

The custom query transform will register every disk input with Vite `addWatchFile`, so dependency-only changes invalidate/rebuild the data module. It will export metadata next to the existing source string. Before routing the script, the Vitest worker will read each recorded disk input through ordinary Node fs and verify its hash, and verify the exported bundle hash. These normal worker reads enter the pinned capture's `fs:` input records without writing package globals. A stale descriptor must throw a setup error before any law checkpoint; it cannot silently continue with an old script. These checks complement Vite invalidation rather than treating a detected stale bundle as a completed rebuild.

Required pure controls: hold overridden authoring text constant, change only a scratch transitive module A→B, and show source/bundle and dependency fingerprints change; confirm original receiver SHA stays constant. Exercise Vite's query watch dependency and require its cached transform to rebuild after the dependency update. Accept the matching metadata but reject the old descriptor after that same disk edit. Preserve unchanged default-vs-explicit-source bundle equality and confirm no authoring/delegated disk hash is falsely required. No browser jobs, product changes, oracle model changes, or package cache/global manipulation are part of this repair.

Default-scope clarification requested by the parent: default execution keeps automatic source selection at `format-shortcuts.ts`, `links.ts`, and `draft.ts`, while still enabling the actual receiver bundle and retaining the complete authored-mutant directory. Explicit workflow/navigation selections additionally name authoring for deeper operator characterization. This does not filter mutant results or claim full-UI gap closure. Pinned `check.mjs` loads the authored directory independently at1534 and iterates its entries at2535 without a `--source` filter; ownership and optional explicit `--only` govern its receiving routes. Existing seed/run budgets are unchanged.

Further invalidation inspection before the final driver edit: Vitest's project config forces `server.watch: null`; its `invalidateFile` accepts actual filesystem paths. The pinned gap runner records worker reads under `fs:<path>` and passes those keys to invalidation. Therefore file hashes alone can reject stale setup but do not guarantee that a cached query rebuilds in a warm context. The worker will also import each non-node_modules disk input as `?raw` data. Those modules contain strings, not executable React code, and their evaluated IDs supply the actual paths to the pinned runner. Existing `addWatchFile` dependency edges then propagate its normal path invalidation to the application query. Metadata still verifies all inputs, including node_modules; the pinned capture deliberately ignores node_modules fs reads, so the lockfile/pinned-install assumption is explicit rather than a universal package-resolution/hermetic-build claim. No runner globals or private caches are changed. Pure controls will disable filesystem watching and invoke the same public Vite module-graph invalidation used by Vitest.

## RT-001 implementation receipts and source freeze

The final helper captures source/data bytes in esbuild `onLoad`, checks `metafile.inputs` for complete accounting, and exports their SHA-256 values alongside separate supplied-receiver and output-JS hashes. Root package, lockfile and UI tsconfig are additional stability inputs. The query registers all disk paths using `addWatchFile`; the worker verifies the actual JS and every input using ordinary `readFileSync` before routing it, and imports project inputs as raw data so the pinned runner also receives actual-path evaluated module IDs. No package global/cache is manipulated. Node_modules input values are verified but their invalidation still assumes the declared pinned installation/lockfile; this does not establish universal build-environment hermeticity or every package export-resolution-file change.

`npm run typecheck` passed after metadata implementation. The default source and unchanged-authoring override remain byte-identical. A direct bundle has 762 disk inputs, including `src/ui/caret.ts`, and excludes the supplied authoring path and the three helper delegates from disk verification. The supplied authoring SHA-256 is `d325e5b77249ae1367aae1818978964a0cc81d3f1e4eaed94c9e24826ab423dd`; direct bundle SHA-256 is `35e9f8486f7ea9e6d48d00acdc697eaf08b50d2aa61e61045ac6b073cdad4f1b`.

Pure control `/private/tmp/blygger-rt001-control.mts` adds one removable scratch dependency to a constant supplied authoring string. Its receipt `/private/tmp/blygger-rt001-control-receipt.json` reports all controls true:

| Control | Result |
| --- | --- |
| Change only scratch dependency A→B | Dependency and bundle fingerprints both change; receiver fingerprint remains fixed. |
| Verify old descriptor after dependency edit | Throws `Stale browser oracle application input: /private/tmp/blygger-rt001-fixture.ts` before any law checkpoint. The actual verification function body was transpiled from the assigned driver and run with real Node fs/crypto, rather than a second checker implementation. |
| Change JS while keeping its metadata | Throws bundle-fingerprint mismatch. |
| Default build versus unchanged-source override | Identical JS. |
| Supplied authoring and helper delegates | Absent from disk inputs; no false raw-disk comparison for instrumented source. |
| Disable watching, register dependency through `addWatchFile` | Module graph contains the scratch file with the authoring query as importer. |
| Use public graph invalidation matching Vitest, then request query again | Query loader runs twice; output and dependency fingerprints change from A to B. |
| Variable dynamic `?raw` SSR import | Returns dependency source as a string, and the source's global marker is not executed. |

The scratch-augmented receiver SHA-256 is `e98ae604e9543edf9a0eb46462ef1c1995f7101aee99ef22d8c4fd35c0ca7846`. Bundle A is `1cc4251e007bdf2cadfaac4aafc32ae7ead42e2dae110032f2ea3e12368d39f3`; bundle B is `0e0ddfb45594ea55867166c8ea4a3c493006f773d48bc9d73817f939c76865a4`. Scratch dependency A/B fingerprints are `5ce0dd439cda75a6a0a27987e478d84e2eae67759e6982d7fed26328fdb7412a` and `f93c0f9e08060b276845d507919aa16b9ead2d138a49046f2fd4c690a833ee5a`. That augmented descriptor has 763 disk inputs. These are pure transport controls, not a production oracle RED, mutant kill, or actual pinned-daemon cache-verdict replay.

Independent reviewer repeated and extended the control using the actual query's `server.ssrLoadModule` path and SSR module graph, `watch: null`, public invalidation and a second query load. All controls passed with two query loads and A→B output; receipt `/private/tmp/blygger-rt001-reviewer-control-receipt.json`. The reviewer records its bounded acceptance in `receiver-transport-review.md`.

The initial real-watcher experiments did not receive their expected events and are not invalidation evidence; installed Vitest's no-watch execution is the relevant boundary. Both successful pure SSR controls emitted Vite's generic dynamic-import-analysis warning for variable raw-data imports. Their runtime behavior was correct, and no warning-suppression directive was introduced. No browser job ran in this worker.

The parent was explicitly notified of a shared-harness source freeze at these Git blobs; subsequent edits by this worker are documentation only:

| File | Blob |
| --- | --- |
| `scripts/formatting-oracle-application.ts` | `385210c45bade8b7d9f48a9aee233dda232d73bd` |
| `scripts/formatting-oracles.ts` | `95a30ad486a893ffce537e9de93b043c8d1cf90c` |
| `test-ui/editor-oracles/browser-source-oracle.ts` | `da172cab3b007559171b0357e64fb9d21d7e7913` |
| `test-ui/editor-oracles/browser-driver-oracle.ts` | `ba281c254f6b21a3c63caeaac86129ced08fe22c` |
| `test-ui/editor-oracles/application-driver-oracle.ts` | `0d0daca4a650b1e8b327ed7d7fc508f9d73b73ce` |

Cold frozen-source registered baselines, receiver mutant checks and actual pinned-daemon dependency-edit verdict evidence remain the parent's execution work. Earlier in-flight workflow setup errors caused by concurrent source edits are setup failures, not product failures or law kills.
