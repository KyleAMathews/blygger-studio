# Static CI owner ordering proposal

Revision 2 is a scratch implementation awaiting independent rereview. Fifteen synthetic checks, eight real Vitest discovery fixtures and six direct receiving-neighbor controls pass. No product tests or browsers were executed. The active reference run (session 68835), installed runtime, campaign outputs, and Docker benchmark checkout remain unchanged.

The proposal adds `--owner-order` to `@tanstack/oracles@97a4e7a`. It supplies a static priority prefix for oracle **files** when evaluating a mutant. It does not select a subset of owners. A mutant uses the resulting global rank restricted to its own owners. The CLI discovers the complete owner inventory before resolving the plan.

For a future composed candidate, syntax is:

```sh
oracle-gaps --package . --source src/ui/format-shortcuts.ts \
  --owner-order test-ui/editor-line-break.oracle.test.ts,test-ui/editor-list.oracle.test.ts
```

This is a syntax example, not a duration-based recommendation. The installed CLI does not support the option until deliberately patched. A CI caller may choose a prefix from an earlier recorded duration report and check that list into its invocation. This implementation does not read live durations, reorder during a run, or break ties by completion timing.

## Review findings and revision history

The original revision remains immutable at `/private/tmp/blygger-owner-order.4FbC6XYn/owner-order.patch`, SHA-256 `e82aee22b5e2635454660837e285fd07cee0a1c15132b2012f684653cbabbefa`. Independent review withheld acceptance in `ci-owner-order-review.md`:

- **OO-001:** unconditional discovered-owner confinement refused previously accepted external owner files even when the flag was absent.
- **OO-002:** requests were normalized by realpath while discovered identities were compared lexically. Alias-only inventories could refuse the same requested file, and discovery could retain several execution identities for one real file.

Revision 2 separates user-request validation from discovered dispatch identity. The absent option returns the original subset unchanged, without introducing a new realpath, file-readability, or confinement precondition. Explicit requests match discovered aliases by realpath while preserving every original dispatch identity. The findings and original evidence remain recorded in the independent review; this repair is not self-acceptance.

The receiving premise of OO-002 is now established on installed Vitest **4.1.12**. Its real `globTestSpecifications()` preserves the lexical alias path when a config includes a symlinked file, under both `resolve.preserveSymlinks: false` and `true`. A config including both the real file and alias returns both module IDs. The mismatch was therefore reachable at the real discovery boundary, beyond an injected helper inventory.

## Request validation and discovered identity policy

Requested paths are package-relative, with absolute spellings accepted only when their real paths are inside the package. Existing symlinks resolve before confinement checks. Missing paths, directories, paths outside the package, symlinks escaping the package, and existing files without discovered oracle declarations refuse. A file from another Vitest config is unknown to the selected config and also refuses.

Duplicate **requested** paths refuse explicitly, including `./` spellings, absolute spellings, and in-package links to the same real file. Empty lists and empty comma-separated entries refuse. As with `--source`, commas delimit paths and cannot occur inside a listed filename.

Discovered owners have a separate policy:

- Without the flag, preserve every original dispatch identity and per-subset order. External owners and alias paths remain accepted. Metadata records `mode: "existing"`, `requested: null`, and a sorted `resolved` inventory; that inventory does not override dispatch order.
- With the flag, match requested and discovered files through their real paths. A request for a file with several discovered aliases places **all** its original dispatch identities first, ordered by their dispatch names. Do not coalesce them or silently discard jobs.
- Append every unlisted discovered dispatch identity, including external owners and aliases pointing outside the package, ordered by canonical real-path name and then dispatch-path name. Only the user-requested prefix must stay inside the package.
- An exact duplicate discovered dispatch key is refused in explicit mode. Distinct keys sharing one real file are supported as distinct execution identities. Vitest's specification map already provides unique exact keys.

External paths in metadata use their path relative to the package, such as `../shared.oracle.ts`. Explicit-mode `inventory` records `{ file, canonical }` for every dispatch identity, making alias expansion and realpath matching inspectable. `resolved` lists the complete dispatch ranking rather than repeating one canonical file name for several jobs.

The option reorders owner files only. Both complete baseline passes, baseline/report file identities, within-file test and selection order, seeds, numeric budget settings, ordinary-test ordering, input validation, classification functions, and blocker handling are unchanged by this layer. The resolved inventory includes owners later blocked by their baseline; existing planner filtering still determines which owners can execute for each mutant.

The installed authored planner still executes all owner jobs, and concurrent completion can differ from target rank. A composed canonical-prefix scheduler must consume this same rank for deterministic early stopping. The per-mutant `oracleFiles` array retains original target order; it is not an execution trace. The global explicit `ownerOrder.resolved` field supplies the requested dispatch rank. This patch alone makes no speedup claim.

## Shared integration seam

The new `oracle-gaps/owner-order.mjs` exports:

```js
normalizeOwnerOrder(pkg, paths) // normalized relative requests, or Refusal
resolveOwnerOrder(pkg, requested, owners) // { identity, orderedOwners }
```

`args.mjs` validates and normalizes the comma-separated option. `check.mjs` resolves it once immediately after static analysis and before any baseline or mutant unit:

```js
const { orderedOwners, identity: ownerOrder } = resolveOwnerOrder(
  pkg,
  options.ownerOrder,
  declarations.keys(),
)
```

The operator planner's `runOwners` callback becomes:

```js
(st) => orderedOwners(st.targets.oracleTargets)
```

The authored planner uses:

```js
targets: orderedOwners([...owners].filter((file) => fileSpecs.has(file)))
```

Use these same seams in the separate lazy-validation/operator-wave and authored canonical-prefix proposals. In explicit mode, the helper refuses duplicate or undiscovered subset entries. It cannot detect a valid owner omitted by its caller: arbitrary subsets are intentional inputs. Composition therefore still requires owner-set accounting at the planners. The helper returns original absolute dispatch identities and does not mutate caller arrays.

## Identity, report, and evidence cache

The normalized requested prefix remains in `options.ownerOrder`. A separate serializable `ownerOrder` object records mode, request, full resolved inventory/rank and, in explicit mode, canonical-to-dispatch inventory mapping. The actual `identityOf` function hashes this complete object and includes it in `run.ownerOrder`; `results.json` also exposes it at top level. Equivalent absolute and relative request spellings normalize to the same identity.

The unit cache's `globalKey` also hashes that entire object. Changing only the request, changing a request while retaining the same rank, changing an unlisted owner, or changing canonical-to-dispatch matching separates cached units conservatively. This sacrifices possible cross-plan baseline/unit reuse rather than assuming schedule-independent budgets or histories.

`owner-order.mjs` joins `ownFiles`, so implementation changes invalidate CLI/run and unit identities. Every previous key input remains: CLI files, manifest, configs, lockfile, Node version, seed, settings and existing limits. Stored units' imported/served input-hash validation is byte-for-byte unchanged. This layer does not broaden cache reuse or treat a warm result as proof for a different plan.

## Revision 2 artifacts and executed checks

Scratch root: `/private/tmp/blygger-owner-order-v2.zqMZVezC`.

- Immutable patch: `owner-order.patch`.
- SHA-256: `07ee8712ba93ee3f3a88e9f190845018ccc8e5abcac691c63ceac5d0f3d88a31`.
- Exact pristine files: `pristine/`; candidate files: `candidate/`.
- Source/candidate, check-runner and receiving-receipt hashes: `manifest.json`.
- Synthetic checks: `synthetic.mjs`.
- Real discovery/direct-neighbor runner: `receiving.mjs`; evidence: `receiving-receipts.json`.

Base installed `check.mjs` SHA-256: `d2fce1610ab8bf4c61f6bd7bb1a567428cab062e48694cf44d63885256e2a247`. Base installed `args.mjs` SHA-256: `0ff3bfded506eb0720bb963d3d33e34806a5b658481e9c12677f96be7a115e4f`. Both hashes were rechecked after the discovery fixtures.

Executed validation:

1. `node --check` passes for all three changed/new modules; `git apply --check` passes against the exact pristine copy.
2. **Fifteen synthetic checks** cover CLI parsing; unchanged seed/budgets; invalid, escaping and duplicate requests; complete owner retention; deterministic subset ranking; absent-option compatibility; explicit subset validation; actual run identity and global cache key binding, including alias mappings; unchanged lookup input validation and key inputs; both planner seams; unchanged baseline/selection source; equivalent request spellings.
3. **Eight actual Vitest discovery fixtures** use the CLI's actual extracted `discoveredConfig` helper and real `createVitest` → `standalone` → `globTestSpecifications` boundary, followed by both pristine and candidate `analyze` and the candidate resolver. Two nearest-parent configs select external-only and mixed internal/external owners. Six configs cover inward alias only, real-plus-alias, and outward alias, each with symlink preservation disabled and enabled. All retain original no-flag dispatch identities. Explicit mixed inventories retain external remainder owners; alias requests match the discovered real/alias identities; outside requests refuse. Each context closes in `finally`.
4. **Six direct receiving-neighbor controls** retain external-only, mixed, outward-alias, inward-alias-only and combined real/alias/external inventories, plus an absent-option control that adds no file-readability precondition. Alias groups retain every identity and deterministic rank under reversed discovery order.

Discovery fixture files contain a top-level throwing sentinel so importing one would fail. No test-execution API or browser API is called. These are configuration/discovery/static-analysis boundary witnesses, not baseline, browser, or mutation-campaign execution evidence. Identity/cache controls evaluate the candidate's actual extracted `identityOf` function and `globalKey` expression with controlled dependencies. Baseline/selection and lookup comparisons establish source preservation only.

Before adoption, obtain independent rereview of OO-001/OO-002, compose the layer with reviewed scheduler proposals in a new scratch copy, verify owner-set accounting and cleanup, and rerun each layer's controls on that source. Then follow frozen-reference calibration and classification/report comparison gates before measuring speed. The installed package and reference remain frozen until the parent explicitly advances the experiment.
