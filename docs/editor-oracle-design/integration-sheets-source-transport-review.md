# Exact sheets source transport — independent review

Reviewer `/root/review_block_break_oracles`, 2026-11-19. This reviews the
frozen scratch candidate, its design and controls for TSR-1 from
[the singleton toast review](./toast-singleton-design-review.md). The
production/harness files and active receiver run were not edited. No
browser, esbuild, Vite server, Miniflare, registered oracle or campaign was
launched by this reviewer. Independent execution was limited to exact
candidate function bodies in an isolated scratch process.

## Disposition

**The exact candidate is source-accepted for coordinated application and
registered receiving validation.** No blocking source defect was found.
It supplies the missing context-specific sheets bytes through the existing
application bundle, rather than treating an ownership declaration or disk
watch as mutation delivery. Supplied fingerprints, ordinary dependency
verification and query evaluation make stale/mismatched delivery a named
setup failure.

TSR-1's original finding remains preserved. This source acceptance does
not close the original-defect mutation gate. After applying the transport
and separately reviewed singleton repair, require the sheets-ID-deletion
mutant to reach the application and receive a registered reproducible
`completed-link workflow receipt` rejection at the toast comparison. No
setup failure, timeout, fingerprint rejection or transport error is a kill.

## Frozen identities

Scratch root: `/private/tmp/blygger-sheets-transport.XnfBXIEb/`.
Integration base: `2d153071e83261e62be5a1ec926c3f1f3e2fe26a` plus the named
existing oracle/integration delta. Package pin: `@tanstack/oracles@97a4e7a`.

| Artifact | SHA-256 |
| --- | --- |
| `sheets-source-transport.patch` | `2b3e7017389defa45547e60a520678d4e17d87083e2af49fc563854857218c7f` |
| `manifest.json` | `32fa3061a2fbc66fad19086a6545b7eb76fa4684be7acf8a01312208a2435b6c` |
| Candidate application bundler | `8de139484533e2adb15b011282fbf6c620c4eee9f4c76fb5141505087811971b` |
| Candidate source plugin | `17eae12af402f69e9aced2d10ac6b87db853070df0a97104fa1f970d17ff01bc` |
| Candidate browser driver | `7ffc887f76acc4510275fd1ca72b54d7d98c82a09c180a7aa65b3458ab9ab85d` |
| Author `controls.mjs` | `4ca1970c2211fa47aaab49803116e9b4cd8c3970bb4a1113bc7ed4739270c4fe` |
| Author `controls-receipt.json` | `64de597ea5af9078c193ba41064d834de3887524a0b8ce1e6e055605d70fe74c` |

I independently checked these hashes, every manifest-listed artifact, and
all original/candidate file hashes. The eight active files listed by the
author's manifest still matched their pre-control hashes during this review.
The [design](./integration-sheets-source-transport-design.md) and saved
scratch design have the same hash recorded by that manifest.

## Reconstructed obligation and source path

The adopted completed-link law requires one current feedback message at
each feedback-producing workflow checkpoint. A wrong singleton-ID deletion
must change the actual sheets code run by that browser application; running
the fixed disk module cannot challenge that obligation.

The candidate's path is distinguishable at every seam:

1. `browserApplicationSource` imports the existing authoring application
   query. The application transform asks Vite's public `this.load` for
   `sheets.tsx?oracle-source`.
2. The pinned runner's earlier pre-load hook strips this custom query and
   serves this context's authored patch before its schemata source. The
   candidate's narrow later fallback reads disk only when that earlier hook
   supplies nothing. This custom query is not the asset `?raw` query that
   the pinned runner intentionally leaves uninstrumented.
3. Before normal TSX lowering, the sheets transform retains the received
   bytes in `ModuleInfo.meta` and returns a module containing only literal
   source data. Raw React imports and module side effects do not run in
   Node. The application transform checks the exact path and string type.
4. The existing esbuild bundle gets those exact bytes through one optional
   sheets input, resolved relative to the real sheets directory. It hashes
   them into `metadata.sheets`, excludes them from disk descriptors, and
   retains complete accounting for all other metafile dependencies.
5. Before routing the application into the browser, the worker evaluates
   the sheets data query and compares its path/source hash with the bundle's
   sheets descriptor. A stale bundle paired with a fresh query, or the
   reverse, fails before product judgment.

The expected-result model never imports these source bytes or the driver.
No law, expected count, history, declared state, budget, observation field
or checkpoint is changed by the patch. The sheets descriptor is transport
metadata, not new expected-result state.

## Preservation, identity and invalidation

The optional bundler argument preserves the old path when absent: no
override hook, no sheets descriptor, the same disk input capture and the
same string-returning API. Author controls compare both output bytes and
metadata to a pristine snapshot in that mode. Supplying unchanged sheets
and authoring source preserves the application's bytes; the intentional
metadata change classifies sheets as supplied rather than disk-read.

The candidate watches the real sheets path both from its data query and
from the application query. This matters because supplied sheets is no
longer an ordinary disk input. The author's real-Vite graph receipt shows
the plain sheets file with both queries as importers and two invalidated
modules after each context-source transition.

I inspected the actual pinned runner load hook, transform bookkeeping,
`invalidateChanged`, `settleIn`, and closing capture. Its closing capture
projects evaluated module IDs to their query-free real paths; the added
worker import therefore makes sheets a context-served module input instead
of falsely claiming it was read from disk. The runner hashes that input
through `servedHash`, which prefers this context's authored source and
schemata over disk. It resets worker modules with `vi.resetModules()` for
each copy. Its `context.invalidateFile` uses Vite's ordinary file/module
graph invalidation. These existing mechanisms support warm-context source
changes without adding a second cache or runner override.

The variable dynamic import does not create a static importer edge from
the worker module to the sheets query. That fact is retained in the
author's diagnostic; it is not treated as a nonexistent edge. The separate
real-file watch edge invalidates the bundled application, while actual
worker evaluation supplies the evaluated-input identity. The author's
ModuleRunner control observed the exact query among 114 evaluated modules
and its plain sheets path in the pinned closing projection.

This is not a completed verdict-cache replay experiment. After application,
the parent must bind the applied source/runtime manifest and inspect actual
registered mutant input/receipt evidence. The source/fingerprint path must
not be represented as a browser mutation kill by itself.

## Evidence inspected and independently executed

I read the author's controls and receipts. Their 14 recorded controls cover
pristine/default compatibility; unchanged explicit source; different
in-memory A/B sheets bytes with fixed disk and authoring source; separated
metadata; corrupt/missing/mixed descriptors; transitive ordinary dependency
staleness; actual Vite disk fallback; actual pinned schemata and authored
precedence/reset; `watch:null` invalidation; worker data imports; and Node
nonexecution. The control uses the exact installed runner load-hook body
and actual `instrument()` output for 107 sheets sites. Its A/B/reset
transitions run through a warm Vite server. No browser law rejection is
claimed by those controls.

An initial author control incorrectly demanded a static importer edge from
the variable dynamic import. That failed diagnostic is preserved, and the
replacement control checks the actual evaluated-module path. The three
recorded Vite warnings concern unanalyzable variable imports; the receipts
show those modules actually evaluated. Neither the warnings nor static
graph membership are credited as product evidence. The syntax receipt
reports parse/transpile success only; a full semantic typecheck is still
the parent's gate.

Independent scratch execution is retained at
`/private/tmp/blygger-sheets-review.GrpzPB/review-controls.mjs` and
`review-controls.json`. It extracts/transpiles the exact candidate verifier
and source-plugin function bodies, with no esbuild/Vite/browser invocation.
All 15 control groups passed:

- Frozen artifact and active-file identities match.
- Both stale-bundle/fresh-query and fresh-bundle/stale-query pairings are
  rejected. Missing, wrong-path and nonstring source are rejected; an empty
  source string is not silently excluded by a truthiness check.
- Supplied-path collisions in ordinary disk descriptors, corrupted bundle
  bytes and stale ordinary dependencies are rejected. Legacy metadata
  without optional sheets input still passes its normal verifier.
- The exact sheets transform produces only source data. Executing that
  returned module preserves raw TSX containing a top-level throw and a
  nonexistent import without executing either.
- The application transform passes the exact authoring/sheets pair to the
  existing bundler seam, registers its watch paths, and refuses malformed
  supplied metadata before invoking that bundler.
- The fallback responds only to the sheets custom query, leaving ordinary
  sheets, `?raw`, and authoring source queries unchanged.

These controls are independently authored lightweight seam checks. They
are not an independent replay of the author's real-Vite/bundle suite, a
registered generated oracle, or proof of every provider failure path.

## Checklist accounting and remaining gates

| Requirement (checklist v1) | Assessment for this transport change |
| --- | --- |
| ORC-001 | Existing workflow authority/current-feedback promise retained; no new product law is introduced. Browser mutation rejection and physical/AT claims remain distinct. |
| ORC-002 | Existing input-only expected model is untouched. Source data is supplied only to the driver/bundler; no expected result derives from it. |
| ORC-003 | Design and this review distinguish source delivery, metadata, driver verification, controls and product judgment. No model/prose contract change is hidden in the patch. |
| ORC-004 | No legal product-history grammar is changed. Transport controls distinguish supplied, absent, changed and malformed-source cases; no product input filter is added. |
| ORC-005 | Context bytes now reach the same real SPA bundler; raw toast checkpoint remains unchanged. Actual registered browser receiving evidence remains required. |
| ORC-006 | Wrong/stale source and bundle pairings fail named transport checks. These are setup controls, not kills; actual deleting-ID law rejection remains pending. |
| ORC-007 | Fixed/random campaigns, constructed histories and budgets are unchanged. The scratch checks do not replace them. |
| ORC-008 | No stateful expected model changes. Separate supplied/disk descriptors are necessary to distinguish mutant bytes from filesystem bytes. |
| ORC-009 | Source descriptor/query are explicit transport concepts; they are not model histories or oracle verdicts. Existing owner, mutant, law and checkpoint vocabulary is retained. |
| ORC-010 | Data capture adds no long-lived resource or cleanup path. Source/hash failures precede browser routing and are not relabeled as violations. Author Vite controls close their runner/server in `finally`. |
| ORC-011 | Descriptor verification independently compares separately loaded raw bytes against the bundled-source hash. Receiving law judgment remains a separate formulation, still pending actual mutation execution. |
| ORC-012 | This record binds exact candidate/artifact identities and records every requirement's disposition. It accepts source design, not full-oracle audit or bug-class closure. |
| ORC-013 | Supplied A/B with fixed disk and both stale/fresh pairings distinguish exact delivery from a disk reread or stale capture. Actual browser mutant witness remains required. |
| ORC-014 | Vite/provider premises and their bounded controls are named. Actual browser receiving and cached-verdict replay are not inferred from those premises. |
| ORC-015 | No new important property, product driver action or declared reach state is added. Existing reach remains unchanged; the actual production-mutant receiving gate is still due. |
| ORC-016 | No ordinary unit test is added to an oracle file. Scratch controls are labeled seam evidence rather than registered law evidence. |

After coordinated application, complete semantic typechecking, an unchanged
workflow GREEN on the separate toast repair, and exact registered sheets
mutation rejection with bound source fingerprints. Preserve the prior RED,
raw count/text observations and the existing full integrated gap/deletion
gates. Physical toast visibility, lifecycle timing and repeated identical
assistive-technology announcements remain the limits in the prior toast
review; this transport patch makes no new claim about them.
