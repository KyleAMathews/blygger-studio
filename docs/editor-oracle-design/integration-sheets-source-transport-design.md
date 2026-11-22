# Exact sheets source transport

2026-11-19. Scratch design for the integration checkout at `2d153071e83261e62be5a1ec926c3f1f3e2fe26a` plus the oracle delta and gallery/thread adaptations. Production and runtime harness inputs remain frozen during the parent's active code-block run. The design extends source delivery under the existing workflow feedback laws; it changes no model, history, law, observation, budget or default production build.

The installed package exposes `oracles-design`, not a separate `oracles-authoring` skill. That skill, checklist v1, glossary and existing receiver-transport design/review were read. The preservation relation is identical existing observations for identical supplied source, with additional exact delivery of a `sheets.tsx` mutant to those observations. No expected-result state or grammar changes, new law or new design-grammar trigger is introduced by this transport layer; the original receiver transport's parts/preservation analysis applies.

## Why source capture is needed

The registered workflow already has a baseline `step1.toastCount` RED on repeated Base UI messages. The source-supported singleton repair is a separate production proposal. Its regression challenge cannot be credited until a deliberate sheets change reaches the actual SPA. Current authoring-query capture supplies only authoring text to esbuild; sheets is otherwise read from disk. Watching that disk path or adding owns metadata alone cannot deliver an in-memory authored patch.

## API evidence before implementation

Scratch root `/private/tmp/blygger-sheets-transport.XnfBXIEb/` contains two minimal Vite API controls. `vite-load-api.mjs` demonstrated that `this.load(query)` returns ModuleInfo with empty meta when no plugin supplies a load result: this API does not perform the normal transform-request filesystem fallback itself. `vite-load-api-with-fallback.mjs` adds a narrow query-only load hook and receives the transform's raw TSX in ModuleInfo.meta. Its data-only returned module never executes the top-level throwing raw source. Both actual SSR API calls close the Vite server and launch no browser.

Therefore the design includes a narrow disk fallback for this data query, after the pinned gap runner's pre-load hook. The fallback is necessary for unchanged/unselected sheets source, while the earlier runner hook supplies exact authored/instrumented context bytes when present. The fallback must not replace or precede that hook.

## Smallest extension and preservation

1. Add an optional second `sheetsSource` argument to the existing application bundler. If present, one esbuild onLoad returns exactly those TSX bytes for `src/ui/sheets.tsx`, resolving imports from its real directory. Record that source's SHA-256 separately in optional `metadata.sheets`; exclude it from disk inputs and enforce complete metafile accounting as before. Absent sheets source follows the original disk path and metadata shape. Keep the existing authoring receiver descriptor and three helper delegates unchanged.
2. Extend the current source plugin with `sheets.tsx?oracle-source`. A query-only fallback load reads normal disk source when the gap runner did not supply context code. The pre-ordered transform records raw code in ModuleInfo.meta and returns only a literal source-string export, before normal TSX lowering. The authoring application transform calls actual `this.load`, checks for that string, and passes it into the same bundler. Neither React nor sheets imports execute in Node.
3. Add watch edges for the supplied real sheets path as well as existing disk inputs. This keeps the authoring query invalidatable even though sheets is now intentionally absent from its disk-input list.
4. Before routing the application, the worker imports each supplied custom query as data, hashes its exported source and matches the descriptor. This both detects source/bundle-context mismatch and places the real sheets module ID in Vitest's evaluated inputs. The pinned capture strips the query, hashes the exact context-served source and passes its ordinary path through existing invalidation. Do not substitute a `?raw` disk import for the supplied source. Existing raw imports and fs verification remain for ordinary disk dependencies.

The module-load API is public; no runner global, private Vite cache or package runtime is changed. Missing metadata, mismatched supplied-source hash and stale/corrupt ordinary inputs remain named setup failures before law evaluation. They are not kills. All browser call capture/replay, receiving actions, cleanup, observations and law comparisons stay unchanged.

## Alternatives

A normal `?raw` import bypasses the pinned schemata loader and would recapture disk rather than the current mutant. Rebuilding the SPA from disk has the same defect. Executing sheets under Node to obtain its exports would cross React/DOM/provider boundaries and lose exact source delivery. A generic arbitrary-source overlay or a second SPA entry is larger than this required one-module repair. The selected optional input extends the existing query/bundler seam with one source and leaves the initial fixed host compatible.

## Planned controls and receiving gate

Required scratch controls will compare absent sheets source with the pristine bundler, unchanged explicitly supplied source with disk source, and supplied-only marker changes while disk stays fixed. They will exercise the real candidate plugin through `server.ssrLoadModule` and `this.load`, with `watch:null`, a gap-style context loader and real public module-graph invalidation. Require changed sheets/context fingerprints and emitted bundle bytes, unchanged authoring source, query-only data execution, retained dependency verification, and named mismatch rejection. Check that evaluated data IDs and watch edges retain sheets as an input; do not infer a cached verdict replay from graph evidence alone.

After independent review and coordinated application, the parent must run the registered workflow on the appropriate repaired production baseline, then an exact sheets regression mutant that removes the singleton identity. Require a registered semantic toast-count/message rejection through the intended workflow law, with exact source/bundle manifests and capture. A setup error, missing event, crash or timeout is not receiving evidence or a mutant kill. Browser/calibration/replay acceptance remains separate from these pure/Vite controls.


## Completed scratch controls

`/private/tmp/blygger-sheets-transport.XnfBXIEb/controls.mjs` passed on 2026-11-19. `controls-receipt.json` records all application/source hashes, the pinned load-hook hash, emitted bundle fingerprints and actual Vite diagnostics. It runs the scratch candidate and pristine snapshot with the integration checkout only as read-only source/dependency input. No browser, host, Miniflare, registered oracle or campaign ran.

- Absent optional sheets source produced byte-identical bundle source and metadata to the pristine bundler. Supplying unchanged authoring and sheets source produced the same application bytes as the existing authoring-only route.
- A/B changes only to supplied sheets text changed its descriptor and the emitted bundle; the authoring source hash and sheets disk file stayed fixed. The supplied sheets descriptor is excluded from ordinary disk inputs. The actual extracted worker verifiers rejected wrong/missing supplied source, wrong path, a corrupted bundle and a supplied path mixed into disk descriptors.
- A scratch transitive dependency remained in ordinary disk tracking. Changing its disk bytes rejected the prior descriptor and changed a new bundle while the supplied sheets hash remained fixed.
- The actual candidate plugin ran under installed Vite through `server.ssrLoadModule`, with `watch: null`. The exact installed pinned gap load-hook body served context source. Its fallback returned unchanged disk source when no context source existed; its real `instrument()` output (107 sheets schemata sites) reached the bundle; authored sheets source took priority over schemata; removal of that authored override restored the schemata bundle.
- Public module-graph invalidation of the real sheets path invalidated two modules on each A/B/reset transition and rebuilt the authoring query. The actual extracted `browserApplicationSource` imported its data modules, passed fingerprints and returned the matching bundle. Raw React/TSX and the scratch dependency's top-level sentinels never executed in Node.
- A real public Vite ModuleRunner evaluated the worker fixture and sheets custom query. Applying the pinned closing capture's evaluated-ID projection included the exact real sheets path among 114 evaluated modules. This is input-tracking evidence; it does not establish cached verdict replay.
- All eight active runtime, production and workflow inputs named in the receipt retained their initial hashes. Only this design note is written in the integration checkout.

An early control incorrectly required a static module-graph importer edge from the worker's variable dynamic import to sheets. Vite emits no such static edge. That failed control is retained in `first-control-diagnostic.json`; it was replaced with the actual ModuleRunner evaluated-input check, without changing the candidate. The real-path watch edge from sheets to the authoring application query exists separately and was exercised by invalidation. Three expected Vite warnings report the same unanalyzable variable-import pattern: existing application import, added sheets import and existing ordinary raw imports. The source module actually evaluated in each case; no warning is treated as proof of a static dependency edge.

TypeScript 5.9.3 parsed and transpiled all three candidate files without diagnostics (`syntax-receipt.json`). This bounded syntax check is not a full semantic typecheck; the parent retains the ordinary integrated typecheck gate.

These controls bound the transport claim. They do not demonstrate an actual registered mutant's browser receipt, a semantic toast rejection, mutation survival/kill status, browser calibration or unsampled gap closure. The registered receiving gate above remains required after independent review and coordinated application.
