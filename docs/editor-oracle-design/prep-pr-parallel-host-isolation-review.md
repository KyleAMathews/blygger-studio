# Parallel application host diagnosis and isolation review

Status: source review and completed passive diagnostic, 2026-11-19. No production repair, topology repair, new oracle law, or mutation result is claimed here. The proposed topology still needs independent review and measurement at its final source identity.

## Evidence kept separate

1. **Original 18:30 complete split/queue baseline.** Run `108f10191982`, base `764cb40d15b8062dad70032f262807f4472ec962` plus the four overlays recorded in `/private/tmp/blygger-prep-pr-20261119/ci-split-1830-audit.md`. Two complete passes each registered 4383 checks, with 2 then 3 failures; four navigation acquisition failures and one session acquisition failure overall. All five failed rows had no law verdict. The navigation diagnostics showed an empty mounted list, no paging attempts, and a fresh independent Node API page containing the target. They did not record the browser's own collection responses. Therefore this run does **not** establish the twice-409 cause retrospectively. It remains a rejected, provisional baseline-only measurement with no mutation audit.
2. **Session acquisition controls and current integration.** Independently reviewed controls `/private/tmp/blygger-session-acquisition-controls.dIWmzmEB` established the old initial/transition driver failure under target displacement and the matching shared Load more helper's success. The old initial action remains an exact-body click, and the old transition remains an `.item-head` click. Current integration then passed the full 138-registration session file twice, with zero skips; evidence is `/private/tmp/blygger-complete-session-20261119`, summary SHA256 `2de0295855429c83a163dae902fee00bafe648227c22b17cde2efc10f1833af0`. Those controls do not prove the original 18:30 session failure's cause, and this is not a complete formatting baseline.
3. **New passive navigation diagnostic r2.** A fresh copy of the measured 18:30 source and warm dependencies ran the four complete navigation/session/workflows/receivers files once through the maintained Vitest config. Only passive navigation observation was added. Seed 20261118, four threaded Vitest workers, owned Chromium process per file, one shared actual Miniflare application/DB, 4 CPUs/8 GiB, unchanged 60000ms test/hook budgets, and outer 900s/kill-after30s. No synthetic collection responses or deliberate request gates were added. The existing controlled rejected-save 500 remains part of the adopted `spa-reject` history.

The r2 command completed in 444.85s with 538 passed, 3 failed, zero skipped, exit1. One failure was navigation `random seed: pending-spa-reject-desktop`; the other two were determinism checks for quick-desktop/mobile using the **old** session driver copied from 18:30. They do not exercise the repaired current integration session driver. They are not assigned the navigation packet's cause without their own receiving evidence. Cleanup reported no error; the exact tmux job ended and its `--rm` container was absent afterward. There is no per-Browser PID/reaping inventory. No rerun was used to erase these outcomes.

The preceding r1 failed before tests while copying an inaccessible root-owned derived-runner output directory. r2 excluded that unused build output; direct Vitest does not load it. No file permissions were changed. r1 is preserved separately and is not a test result.

## Actual browser receiving path in r2

The complete `COMPOSE_READINESS_FAILURE` packet identifies this history:

```json
{"body":"Keys1234","commands":["italic","italic"],"schedule":"pending","departure":"spa-reject","mobile":false}
```

It is a desktop reproduction, excluding a mobile-only explanation. The packet's sequence numbers are preserved in the full log:

| Sequence | Browser observation |
| --- | --- |
| 4–10 | `listItems?limit=25` receives 200 with a revision502 cursor; a subsequent legacy updated/id demand receives 200. |
| 12–14 | Fresh first-page demand receives 200, 25 rows and cursor revision503. |
| 16–21 | Continuation using that cursor receives **409**, body `code: cursor-expired`, `error: Collection changed; restart from its first page`. |
| 20–23 | Production resets the pager and retries the first page; it receives 200, 25 rows and a new cursor at revision504. |
| 25–30 | Continuation with revision504 receives **409 cursor-expired again**. Console identifies failed `items,rows` QueryCollection demand with **limit26**, then TanStack DB error229. |
| DOM receiving snapshots | An empty `<ol class="list items">` has height0; then the empty-state text says “Nothing yet — compose your first fragment above.” There are zero rows and no collection-error alert at that point. |
| Unchanged helper | Its existing visible-list gate expires at 6999ms before any Load more attempt. |

This is an observed actual application collection failure under concurrently changing data in the shared four-file run. The packet does not attribute each generation mutation to a particular writer/file. A fresh Node API GET is not used as proof of successful browser delivery. The cursor revisions demonstrate that the retry acquired a new generation; this is not evidence that `pager.reset()` reused the previous first page. Installed `createCursorPager.reset()` removes its query cache.

Production source matches this mechanism: `src/ui/data.ts:197` requests API pages of25 through `readCursorWindow`; `src/ui/cursor-query.ts:29`–37 catches one cursor-expired error, resets and retries once. A second error propagates. TanStack DB's installed `live-query-window-binding.ts:170` and `:289` request pageSize+1 for lookahead. The captured failing live-query demand itself names limit26, so a successful first25 is insufficient for that demand. No claim is made that all original 18:30 failures followed this path.

## Existing fixture and grammar boundary

The earliest explicit shared-host statement in the reviewed driver source is `test-ui/editor-oracles/application-driver-oracle.ts:1`: “Shared disposable React receiving host; no expected product values.” Lines10–13 read one global application origin/script and make per-history browser contexts against that origin. Random `CF-Connecting-IP` values isolate quotas; they do not create distinct D1 state.

`scripts/formatting-oracles.ts:139` constructs one `formattingApplication()` before spawning the runner. Lines150–151 give every worker the same origin, script and cookie. Line173 closes the singleton after the child completes. Browser process isolation therefore leaves the backend shared.

The host factory already owns isolation boundaries: `scripts/formatting-oracle-application.ts:93` creates a new temporary directory; lines113–125 create a new Miniflare instance, D1 database, migrated schema and owner session for each invocation. Separate factory invocations can supply distinct actual backends without changing production requests or replacing responses.

The navigation grammar (`navigation-model-oracle.ts:6`–10) contains body, emphasis commands, original/pending save schedule, departure and viewport. It has no unrelated parallel file traffic. The adopted law (`editor-navigation.oracle.test.ts:80`) explicitly excludes arbitrary concurrent save schedules. Isolating unrelated oracle owners repairs the fixture's independence premise. It does not establish that the observed collection behavior is acceptable, nor repair that behavior for actual users.

## NAV-COLLECTION-001 proposal

**Status: observed product issue, open; outside the currently modeled unrelated-traffic schedule.** Under repeated collection changes during initial Compose lookahead, both a page continuation and its single fresh retry can receive real cursor-expired409 responses. The observed screen then presents an empty collection as “Nothing yet” despite existing content, without a collection-error alert. The packet establishes this failure under real concurrent test writes. It does not establish its incidence under ordinary user workloads or a universal recovery contract.

Keep this finding open in the research/follow-up inventory. A future collection-focused oracle should explicitly model collection generation changes, bounded or ongoing write traffic, first-page/continuation handoffs, recovery after traffic settles, preservation of already received rows, and visible loading/error/empty distinctions. Its law and production repair need their own source review and authority. No changes to `data.ts`, `cursor-query.ts`, contract semantics, or TanStack DB are part of the formatting fixture repair.

## Topology options before implementation

| Choice | Isolation and cost | Review requirement |
| --- | --- | --- |
| Actual app/DB per explicit logical runner slot, maximum4 | Prevents simultaneous unrelated files in different slots from changing one another's collection. Existing sequential fixture accumulation within a slot remains. Bounded4 hosts, low startup count. | Supply a stable explicit owner identity, preserve it across worker replacement, record owner→app mapping and source bundle identity, and close every created host on setup failure, signal and normal finish. |
| Actual app/DB per evaluated file/unit, maximum4 active leases | Also prevents state accumulating between files/units; stronger independence and more startup/migration work. Mutation copies and worker replacement need explicit ownership and complete release. | Tie lease to actual evaluation identity, serialize each owner, prevent overlapping release/reuse, and retain bounded startup/cleanup behavior. |

The initial logical-slot option is superseded by a concrete source witness for persistent cross-file state. `replacementReceiverDriver` in `receiver-driver-oracle.ts:168`–170 creates and publishes fixtures and never deletes them. `mixed-model-oracle.ts:11` admits `[` characters, and its action grammar admits typing followed by a break; `mixed-driver-oracle.ts:61` sends real Shift+Enter. The real `BracketPicker` (`src/ui/picker.tsx:91` and `:123`–135) queries public search and consumes Enter whenever a hit is selected; `search.tsx:30` explicitly allows picker searches from zero characters. Thus a prior file's published fixtures can change the receiving behavior of an allowed later mixed `[[`/Shift+Enter history on the same reused backend. This is a source-supported fixture risk, not a claimed observed runtime false failure.

Prefer a fresh actual app/DB for every evaluated baseline file and pass, bounded to four simultaneous reservations. It prevents both concurrent writes from other files and persistent published fixtures crossing the file/pass boundary. The concrete candidate still needs independent lifecycle, ownership and transport review before a bounded smoke. The pristine full mutation-audit route currently retains its singleton backend; its cross-file fixture risk remains open, and baseline isolation cannot establish mutation closure for that route.

PID is not a slot identifier: all32 measured 18:30 launch receipts used workerPid75 while four warm contexts ran. `VITEST_POOL_ID` alone is also insufficient: the package runner creates independent Vitest contexts each with maxWorkers1, so local worker numbering can repeat. A source-derived explicit provided owner or an equivalently reviewed collision-free mapping is required. The runner's `indexOf`/slot index is stable through `replace`, and `eachSlot` joins all contexts before the next phase; dynamic baseline claiming changes which file a slot receives, not the slot's identity.

Before adopting a candidate: verify no law/model/history/constructed/calibration/budget changes; preserve real public actions and application-source mutation transport; prove all simultaneous owners receive distinct DBs; reject missing/duplicate/misassigned owners; retain error classification for host setup/cleanup; measure both full baseline passes at the final source/package/topology identity; then obtain the required fresh mutation evidence. Single controls and green session runs cannot substitute for that complete validation.

## Source and receipt identities

| Input | 18:30/r2 source | Current integration session repair |
| --- | --- | --- |
| `session-driver-oracle.ts` | `4bb5d9f83095cb41641ff59bf53c6903b5a032433c69c81943a40a7c1eab46cb` | `d5170ce4c4fb0408854b6043c003445a70b3c84543f7c1074ffb08bb3838bcba` |
| `navigation-acquisition-oracle.ts` | `d2e1acce8cff78a9a7b4bbf26c808a1dc2040c5cc6c46163013df0a87fe30693` | `df172c0593b4dad0080b39d06905472f85c1c3bd00c98ae1d16c03b9ebb280fd` |
| `navigation-driver-oracle.ts` | Original `b93e3dfabb7d28a8724181609af0ff248e17c4f05b9fb305a7afa8d58ddc717a`; r2 passive overlay `9eea19af965f04448b55f9136049c59ac22b4025d0ef26d15e1e61b2f572c20c` | Original unchanged |
| `editor-navigation.oracle.test.ts` | `1f84b4f36ef00f56f3b782736442fa04e0900905c03d6aeba9c190b99111ba43` | Same |
| `src/ui/cursor-query.ts` | r2 `6cd1d2353a528e43ebafff3255938406599c0ad84ea3ac7b831344eb1753b09c` | Same |
| `src/ui/data.ts` | r2 `3d21ea5b641344212f383b9cb900243addf7e59a44727bacbcff27416e3fe25d` | Same |

r2 verified before/after equality for the14 named source/package/config inputs in `invocation.json`/`summary.json`; this is not a newly complete filesystem inventory. Application bundle SHA256 `25a29eddb0bbf7683a6de6841942e92379459024dd9ab25558312b4b6e8ad7e2`. Package pin remains `https://pkg.pr.new/TanStack/oracles/@tanstack/oracles@97a4e7a`; package.json/lock hashes are recorded in both receipt files. The direct four-file diagnostic does not use the derived baseline runner. Its reused topology helper includes a generic `withinInvocation` description of the gap runner's warm `isolate:false` lifecycle; that text is not evidence that the direct Vitest diagnostic used that lifecycle. The actual command and direct diagnostic invocation take precedence.

Private local receipt root: `/private/tmp/blygger-nav-readiness-20261119-r2/final`; full original log `test-output.log`; structured command, measurement and image receipts at root; Vitest summary/invocation/topology under `repository/diagnostic-results/`; complete passive overlay and both changed source files retained. The exact `COMPOSE_READINESS_FAILURE` packet is also decoded at `/private/tmp/blygger-nav-readiness-20261119-r2/readiness-failure-0.json`.

- r2 final-receipts.tar.gz SHA256: `f5352684a56fd6679bd75658162ce932ea2a2466c8754ee98102b95dce0b3f0d`.
- r2 summary.json SHA256: `08fa794c5a9af13ac6ec66cfc33f1900fd607e20c97f67ddd0ef7188ff960183`.
- r1 setup-only archive: `/private/tmp/blygger-nav-readiness-20261119-r2/r1-setup-receipts.tar.gz`.
- No VM lifecycle action or additional remote run was performed after collecting this completed diagnostic.

## Independent review of the concrete file/pass candidate

Reviewed immutable scratch revision `/private/tmp/blygger-file-app-isolation-v2-YXnKEs`, patch SHA256 `59b1886f4749762e11b76c9bf66871b101d633572274df3cc7eec9b8cd74b5a9`, pool source SHA256 `9f125a6f4c3d35317624306930859b0657432204299935cb51dcc7fb970a2524`. This is an independent review of another agent's proposal. The installed oracles-review skill, checklist v1 and glossary were read in full for this review. No production edit, browser test, CI run or VM run was made for this candidate.

**Conditional source verdict:** no remaining defect found in the v2 pool's reviewed ownership/disposal transitions. It may proceed to an explicitly bounded real receiving smoke after an additive rebase preserves the current integration repairs below. This is not adoption of CI or acceptance of a full mutation audit. The unchanged full-audit singleton route still has the published-fixture risk; whether to refuse that route pending isolation is a separate unresolved scope decision.

The first immutable proposal `/private/tmp/blygger-file-app-isolation-esJmrz`, patch `7e89e9668e8247e322a3d1c452d7e812ec6be8846dedbf6b7b3a49267dacd3f6`, had a confirmed lifecycle defect. Holding disposal of a host in a one-slot pool, a duplicate release could return200, mark the slot fulfilled and admit another host before the first disposal finished. Exact pool source was transpiled with only the application-factory import delegated; the fake factory preserved the actual factory's synchronous idempotence guard followed by asynchronous disposal. The receipt `independent-duplicate-release-control.json` demonstrates two allocations with maximumSlots1 and an eventual successful cleanup. v2 sets `cleanup='closing'` synchronously, rejects a release unless cleanup is pending, and retains ownership until actual disposal resolves.

The independent v2 suite passed **20/20 deterministic source/lifecycle controls** through real ephemeral loopback HTTP with event-controlled fake hosts. Receipt: `/private/tmp/blygger-file-app-isolation-v2-YXnKEs/independent-pool-suite.json`; script: `/private/tmp/blygger-file-app-isolation-esJmrz/independent-pool-suite.mjs`. Controls cover valid complete two-pass ownership; invalid counts, keysets, passes and slots; unknown/duplicate files; misassigned release; unauthorized requests; four reserved factories before resolution; canceled acquisition resolving late; factory, script-read and disposal failures; no token/cookie in topology snapshots; held duplicate-release rejection; and crossed file/context/invocation descriptors. Verbatim extracted `applicationUnit` also preserves completed failed registrations before a release failure and keeps a thrown primary error distinct from cleanup failure. These are harness controls, not oracle laws, product verdicts or mutant kills.

One initial suite used a3s control-only completion bound, which expired before an active HTTP shutdown finished; its receipt is preserved as `independent-pool-suite-short-control-budget.json`. With a10s control-only bound the unchanged candidate passed; no production/oracle budget changed. The earlier19-control receipt before the final descriptor control is also retained. A control-script syntax error occurred before execution while changing that bound and was corrected; it is not a candidate result.

The pool synchronously reserves each logical slot before awaiting its factory. The admitted key is `(pass, original file)`; both file membership and the current owner/lease are checked. Pass2 cannot start until all expected pass1 owners have fulfilled cleanup, and no pass1 acquisition can follow pass2. A file/pass gets a new actual factory invocation, so state cannot cross that boundary. The parent retains all owner records, including applications returned after cancellation or before a later script-read failure, joins accepted requests, then disposes retained applications. Completed baseline units are written before release. Cleanup errors remain separate from product-law comparisons. The source promises disposal/rm promise results, not an OS process-reaping inventory.

The shared host adapter validates explicit provided context index, original worker filepath and invocation. It is consumed by `browserDocument`, `applicationDriver` and `sessionDriver`. It changes the fixture address/cookie/script only; the real browser events, application route, production receiver module transport, observations and checks remain. The pristine full-audit fallback still consumes its original singleton environment. It receives no new fixture-isolation evidence from this baseline-only change.

### Rebuilt observation and preservation boundary

From the adopted navigation contract alone, pending desktop `italic(); italic(); spa-reject` must retain latest `Keys1234`, keep the earlier committed `*Keys1234*` while the latest save is held, report the rejected departure save while keeping the working editor, then allow successful retry and load `Keys1234` into the same-item quick editor. `navigationModel` derives these states from command indices and save acknowledgment; the driver runs actual emphasis input/save/departure/quick-editor paths and records the corresponding pending, blocked/failed, departure and quickLoaded checkpoints; the unchanged check compares those observations. The candidate changes only which fresh real fixture supplies that path. A successful smoke still needs actual receiving observations and cannot be inferred from the fake-factory controls.

The patch is based on the old18:30 split/queue snapshot and must **not** overwrite current integration files wholesale. `browser-driver-oracle.ts` must retain the imported-source/link/draft metadata verification loop and HR001's separately retained BrowserContext, context-before-browser cleanup, combined cleanup errors and primary failure cause. `session-driver-oracle.ts` must retain HR002's shared Load more acquisition, exact-body initial click, `.item-head` transition click and drained acquisition cleanup. The current shared acquisition helper remains unchanged. `application-driver-oracle.ts`'s reviewed before source matches current integration. After rebasing, source hashes, derivation manifest and controls must be refreshed before a receiving smoke.

### Checklist outcome for this fixture-only candidate

- **ORC-001/002/003 (checklist v1):** no expected product result, law, model, authority or law prose changes. Existing authority/independence responsibilities remain; source review does not re-certify every inherited law. Pool lifecycle expectations are clearly labeled harness controls.
- **ORC-004/007/015/016:** no grammar, constructed history, seed, runs, calibration, declared state or oracle-file content changes. Original keysets/budgets must remain bijective after rebase and in both real baseline passes. Twenty scratch harness controls are not inserted as ordinary unit tests into oracle files.
- **ORC-005:** changed fixture routing preserves the named actual production entry points and all existing checkpoints by source inspection. Real-provider delivery at the new per-file topology is unresolved until the bounded receiving smoke and complete baseline.
- **ORC-006:** no production mutant ran and no defect-closure/kill claim is made. The frozen v1 duplicate-release witness rejects that wrong harness design; the matching v2 control rejects the duplicate request while retaining the reservation. This is lifecycle evidence only.
- **ORC-008/009:** no stateful product model or vocabulary changes. Harness ownership distinguishes slot, original file, pass, lease and setup/cleanup state; concurrent duplicate release is a concrete continuation requiring the new closing distinction. File/pass ownership is not confused with a PID, browser process or product draft.
- **ORC-010:** applicable and directly challenged by20 controls, including preservation of original registration/error and cleanup diagnostics. Actual Miniflare disposal and real browser cleanup still require receiving evidence; per-Browser reaping is not claimed.
- **ORC-011:** no named shared semantic fault requiring a second product-model formulation arose from this fixture-only change. Lifecycle controls use a distinct event-controlled factory to challenge the transport's resource ordering; they do not model Markdown semantics.
- **ORC-012:** this versioned record binds the exact scratch candidate and original failure/repair receipts; adoption must bind the rebased reviewed tree and fresh runtime evidence. No complete audit or bug-class closure is asserted.
- **ORC-013:** no new reusable product threshold/range law is claimed. The four-slot reservation boundary and nearby duplicate-release interleaving were tested as harness controls.
- **ORC-014:** fake factories establish controlled allocation/disposal ordering only. Real application acquisition, disposal and browser handoff remain unresolved until a receiving run. The collection issue NAV-COLLECTION-001 and full-audit singleton fixture risk remain open.
