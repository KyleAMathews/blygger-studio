# Shared Worker lifecycle and workflow startup review

Reviewed 2026-11-19 by the independent block/break reviewer, using
`@tanstack/oracles@97a4e7a` review skill, checklist v1 and glossary. This is a
bounded source review of fixture lifetime and one setup failure, not a new full
ORC-012 audit or a claim that the formatting oracles have no gaps.

## Supported result

Histories retain their Worker rows until the entire runner exits. This is
confirmed by source. It does **not** establish an ORC-010 failure or history
contamination: the parent owns and disposes the shared host, and the relevant
reads may safely coexist. No source-confirmed mechanism yet links retained rows
to the observed missing composer. A blanket cleanup/reset change or timeout
increase is not justified by this evidence.

The completed partial workflow run `bc80a076e443` is provisional. Its baseline
has 160 passing registrations and one setup failure; two selected authored
mutants are blocked. The preserved capture has 163 JSON rows: 160 pass, one
fail, and two metadata rows. The failure is registration index 45,
`fixed seed 20261118: fragment-cleanup-paste-part?#next`:

```text
TimeoutError: locator.waitFor: Timeout 7000ms exceeded.
waiting for locator('#composer-text') to be visible
verdicts: []
histories: 161
ms: 60408
```

The capture records 310 total history executions, including retries and
shrinking. That is not a database item count. There was no law verdict and no
second clean baseline or mutant result. Setup failures and timeouts are not
kills (ORC-006).

Artifacts: `build/formatting-oracles/main-integration-workflows-green/` in the
preserved Linux repository `/private/tmp/blygger-main-linux-j74l_hd2/repository`,
especially `summary.md`, `results.json`, and
`preserved-live-captures/run-182-1.jsonl`. No live database count or HTTP timing
measurement was available in this source-only phase.

## Ownership and the 14 selected oracle groups

The runner creates one `formattingApplication()` before the gap child and
passes its origin/cookie/app path to every context. `formattingApplication`
creates one Miniflare D1/R2 host, migrates and signs in once; its `close()`
disposes Miniflare and removes its directory at runner end. Fresh browser
contexts isolate browser storage, not this database.

| Oracle group | Worker fixture effects and released resources |
| --- | --- |
| inline | Component browser calls; no item fixture |
| keyboard | Textarea/component browser calls; replaces then restores DOM APIs |
| list | Component browser calls; no item fixture |
| line-break | Component browser calls and preview POST; no item creation |
| code-block | Component browser calls and preview POST; no item creation |
| valid-input | Component browser calls; no item fixture |
| links | Component calls and preview POST; no item creation |
| draft | Browser Draft with controlled callback promises, resolved/drained; no API persistence |
| session | Explicit seed for editor/quick; real composer may create on autosave/transition; contexts/native host closed, item retained |
| mixed | Explicit seed and real editing/autosave; context/native host closed, item retained |
| workflows | Seed for editor; composer can create through full-editor/save/autosave; context closed, pending registered operations drained, items retained |
| interactions | Toolbar/picker/readonly/traversal seed one fragment; scroll uses component DOM only; context APIs/hooks restored/closed, items retained |
| receivers | Bracket/Escape seed one fragment; replacement also publishes a real historical version, patches and restores/saves it; held requests released and registered operations drained, item/version retained |
| navigation | Seed one fragment; real PATCH saves and navigation; held writes explicitly released/aborted and promises drained, item retained |

`mixedCodeDriver` delegates to `mixedDriver` and adds preview-response
observation; it has the same seed lifetime. `applicationDriver` closes its
context before draining registered pending operations and preserves cleanup
errors separately. `sessionDriver` has its own context/native-host teardown.
No driver deletes its seeded item. Real composer creation must be included in
any future fixture inventory; tracking only explicit `request.post` IDs misses
it. Public DELETE cannot provide generic cleanup: `deleteItemOperation` refuses
published items; withdrawal retains them and their versions.

## Startup dependency trace

Predicted independently of formatter behavior: before any workflow input can
be consumed, an authenticated `/studio` must mount its composer textarea.
The failing driver path is `goto('/studio')`, then textarea visibility, then
`fill(p.text)` and the action stream. Its selected URL, range and clipboard
cannot explain a failure before that fill.

1. `src/spa.ts` verifies the owner session and returns a fixed shell with
   `#studio-root`, app CSS and deferred `/studio/app.js`. It does not enumerate
   items to build the shell.
2. `applicationDriver` installs formatter delegates and fulfills app.js from
   the selected checked source, then `app.tsx` mounts React/RouterProvider.
3. Root route loaders await settings and update state. Compose's route loader
   awaits `preloadView(listViews.items)`.
4. `listViews.items` explicitly limits its ordered demand to 25 (`data.ts:1036`).
   The on-demand source passes the subset window and requests API pages of 25
   (`data.ts:168–197`). This is not a full-list startup preload.
5. Server `listItemsOperation` uses ordered cursor pagination. `cursorPage`
   fetches `limit + 1` rows and projects the selected 25, with pin lookup for
   just those IDs. `items_private_order(updated DESC, id DESC)` exists in
   migration 0036. This bounds result rows; no measured constant-time SQL claim
   follows from it.
6. `Compose` unconditionally renders `#composer-text`. Its own items query also
   uses page size 25. Item-summary loading starts in the component and does not
   gate that textarea. The summary SQL scans all `items`, so retained rows can
   increase summary work, but this alone is not a demonstrated startup blocker.

Retained rows can change the list, its summary, and cursor generations. A
concurrent write can make the generation guard retry or reject a read. These
are hypotheses for measurement, not proof of this failure. A route-loader
rejection can render the route alert without a `pageerror`; the existing
pageerror-only diagnostic cannot distinguish that from pending initialization,
login redirect, absent script evaluation, or an invisible mounted textarea.

## Smallest next experiment

Keep all laws, inputs, budgets and the 7-second deadline. Add setup diagnostics
only, captured before context teardown on error: navigation response/final
path, script fulfillment/evaluation stage, bounded same-origin API request
status/completion/failure/timing, document readiness, bounded root/alert text,
textarea count/visibility and page errors. Do not record cookie/header values,
request bodies or broad environment state. Diagnostic acquisition failures
must remain separate; preserve the original setup exception as `cause`.

First run the exact registered replay cold with the existing calibrations, in
a new disposable copy. A passing partial replay diagnoses a cold/warm contrast;
it does not clear the full baseline or establish selected-mutant closure.
If cold passes, compare identical replays after controlled retained fixture
counts, recording database inventory, list response counts/bytes, loader
timings and context counts. Use the same input and order in each comparison.
Do not infer growth from timing groups that contain different histories.

Only if that control finds an actual interference/resource-bound defect should
fixture architecture change. It must cover indirect composer creation,
published/version rows, failed setup and outstanding writes, preserve the law
failure, and avoid deleting a concurrent history's fixtures. Per-history host
disposal is a correctness reference; broad shared-DB resets and public
draft-only DELETE are not sufficient designs by themselves.

## Reviewed source identity

SHA-256 at the source-only review boundary (integration files are uncommitted):

```text
69c99fa329c2c516cfa06ad239c55b1fe855fadcb7eb31c7f67f883fdf7b3e32 scripts/formatting-oracles.ts
8de139484533e2adb15b011282fbf6c620c4eee9f4c76fb5141505087811971b scripts/formatting-oracle-application.ts
7b30f54e51005b02057c213fa0dcdea016b5549672452960eaa317b0c561d9b7 test-ui/editor-oracles/application-driver-oracle.ts
a9454f5f9ce5cc9a97128b9bfe1720cd7f422fb9b59b7fee6ec172ea611b8cbd test-ui/editor-oracles/workflow-driver-oracle.ts
4bb5d9f83095cb41641ff59bf53c6903b5a032433c69c81943a40a7c1eab46cb test-ui/editor-oracles/session-driver-oracle.ts
d181446f522bef051bf024df22574a566cf314014b16059da0d57c5ad8f1e653 test-ui/editor-oracles/mixed-driver-oracle.ts
d7561511ce4585c707f9f73c0188f1b6b04b1cf5fa6205bc0fe2acc9061431b6 test-ui/editor-oracles/interaction-driver-oracle.ts
a50f521926a04106045b9fbfea2682d644dd1496b57c7d4a78465ba058ffb088 test-ui/editor-oracles/receiver-driver-oracle.ts
82bf6662cb2ecd74805c7a70683af80cd091e816ecc068cf118910a28ccb45e4 test-ui/editor-oracles/navigation-driver-oracle.ts
d339bcb93fb324418224a2d5d0749da8f64f3a36c949e7dcf5d4de81c7559299 src/ui/app.tsx
3d21ea5b641344212f383b9cb900243addf7e59a44727bacbcff27416e3fe25d src/ui/data.ts
4f9f069d43264ebab1ad7329be1b918c8cd7ea89a3f956435970ee976a032025 src/ui/authoring.tsx
5d87b0a6b52384a5c9bd47b9247b6fd1a356dbb5faeb0bbb69cd7af42dc48fde src/read-api.ts
04c2b1dfb0892b438276adcb5222c95128047807b7d202a7cdff7dc84e936957 src/cursor-page.ts
```
