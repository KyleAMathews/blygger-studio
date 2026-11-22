# Editor formatting oracles

The formatting suite uses generated laws through `@tanstack/oracles`, pinned to `97a4e7a`. Production formatting executes in a browser; independent models and comparisons run in Node. Actual editor histories deliver native keys, toolbar actions and paste through React and check each intermediate result. Playwright supplies browser transport.

This draft PR packages the formatting snapshot and its bounded source, browser and sensitivity evidence. Compose collection-loading and Retry work continues separately and is excluded from this snapshot. The full mutation portfolio and cold Linux CI validation remain incomplete; the completed receipts below do not establish either.

Install the browser runtime for the installed Playwright version, then run:

```sh
npx playwright install chromium
npm run test:oracles:formatting
```

Installed dependency bytes must remain fixed during a run. The wrapper requires a cold runner and refuses `--daemon` and daemon-control routes. After manually editing installed packages, start a fresh invocation or reinstall the pinned dependencies first. The underlying pin excludes reads inside `node_modules` from reusable evidence; the complete CI input manifest records that tree separately. See the [transport trust boundary](editor-oracle-design/receiver-transport-review.md) for the declared scope.

For a focused campaign:

```sh
npm run test:formatting -- --oracle mixed
npm run test:formatting -- --oracle list
npm run test:formatting -- --oracle newline-history
npx playwright install firefox
npm run test:formatting -- --oracle mixed --browser firefox
```

| Selector | What it judges |
|---|---|
| `inline` | Emphasis, link placeholders and formulas: complete source and selection |
| `keyboard` | Shortcut classification and formatter dispatch in a browser textarea |
| `list` | Whole-line edits, caret/range geometry and independently rendered nesting |
| `line-break` | Hard-break parity, fenced-code boundaries, CommonMark info strings and verse |
| `code-block` | Literal selected content, fence collisions, boundaries and selection |
| `valid-input` | Usable structural edits over arbitrary valid UTF-16 input; only list edits may decline |
| `links` | Completed-link recognition, escaping, trackers, result feedback and rendered anchors |
| `session` | Both session files: formatting, native editing, undo/redo, React and Save receipt across all three editors |
| `newline-history` | Native newline source/history and immediate Save, including exact saved-item/create relationships |
| `held-newline` | Native newline at hidden cuts, shown protected text and permitted region edges, followed by immediate full-draft Save |
| `mixed` | Generated command, typing, selection, paste and undo/redo combinations in the full editor |
| `interactions` | Toolbar keyboard activation, focus, actual consumed keys and native Tab traversal |
| `receivers` | Bracket-picker input, layered Escape and formatting gates during restore |
| `workflows` | Clipboard links, URL sheets, cancellation and paste through the application |
| `navigation` | Working-copy retention, save settlement, departure and public failures |
| `draft` | Draft working-copy revisions and save schedules |

Each important property retains its declared fixed-seed campaign and its random-named campaign with the same histories, model, driver, check and budget. Unless an explicit `--seed` or a CI plan selects the seed, the wrapper draws one signed 32-bit invocation seed from four `crypto.randomBytes` bytes before starting the gap checker, records it in `browser-topology.json` and logs `FORMATTING_ORACLE_SEED`. That seed stays fixed for both baselines and every mutation in the invocation. Pass `--seed <recorded value>` to repeat a campaign; retain the printed shrink path and property/unit selection to replay a reduced failure. The gap checker overwrites its seed environment variable from this CLI value, so an environment-only `ORACLE_SEED` is insufficient through this wrapper. Constructed histories require the relevant boundaries to be reached; calibrations verify that checks reject deliberately wrong observations. The mutation phase then changes owned production code and asks the registered laws to reject it.

Reports are written under `build/formatting-oracles/`; `--out <directory>` selects a location. Read `summary.md` for baseline and mutation results, `results.json` for structured evidence, and `test-output.log` for detailed failures and replay information. A passing baseline does not mean every mutation was rejected: inspect the gap counts and their dispositions.

A full campaign runs two complete baselines, validates selected test suffixes without mutations, then tests production mutations. Skips in those generated validation copies select a suffix; they do not describe skipped coverage in the complete baselines. The full default campaign is substantial: its frozen one-context local Chromium run exceeded six hours at 14:37 UTC on 2026-11-19 and was still replaying authored mutations. Its 427 operator results are complete; authored classifications and the final full report are incomplete. That historical run is stopped. The configured 360-minute Linux CI budget has not been validated by a complete cold CI run. Local macOS timing does not establish Linux runtime, and a passing partial baseline does not complete the audit. See the [runtime review](editor-oracle-design/full-campaign-runtime-review.md) for measured phase boundaries and pending work.

`--oracle session` includes both `editor-session.oracle.test.ts` and `editor-newline-history.oracle.test.ts`. `--oracle newline-history` selects the latter alone. Its `editor-browser-newline-history` property moved from the session file without changing its registration, model, driver, histories, checks, calibrations, seeds or budgets. Historical replays for that property use the new file path with the same property/unit/seed/shrink path. Native-only binding mutations can now run that file without traversing unrelated session registrations; shared owners still run both files. The complete baseline discovers all 18 files. This file split changes scheduling, with no measured runtime saving claimed.

`--only` selects mutations, not generated histories. Authored mutation selectors require the exact `authored:<id>` spelling; inspect the report to confirm every requested mutation actually ran. Use the wrapper above for browser execution rather than starting an application-receiving Vitest file without its disposable host. Clear `ORACLE_PROPERTY`, `ORACLE_UNIT`, `ORACLE_PATH` and `ORACLE_SEED` when returning from a diagnostic replay to a complete campaign.

The suite establishes its declared bounds and host premises. Small viewports do not establish physical mobile behavior; the recorded WebKit experiment is distinct from a matched Safari/iOS run. Native-command recovery and proposed editor features remain separate law decisions. Current evidence and research dispositions are recorded in [editor-research-next-steps.md](editor-research-next-steps.md), with original-test mappings in [editor-oracle-design/loss-audit/](editor-oracle-design/loss-audit/).

## Native newline and hard-break command (2026-11-21)

Kyle Mathews (GitHub KyleAMathews) approved following main: unmodified Enter and Shift+Enter insert ordinary native newlines; the Markdown hard-break toolbar keeps `breakEdit`. `editor-keyboard.oracle.test.ts` requires both Enter keys to remain unrecognized and untouched by the formatter across every modifier/platform classification case; command-modified Enter retains its separate owner. `editor-session.oracle.test.ts` sends real Enter/Shift+Enter to composer/full/quick edit, records trusted key/modifier/target/default-prevention receipt, exact selected-source replacement, caret/focus and native undo/redo. Full-editor ordinary prose also checks one paragraph without a rendered hard break. Simulated `navigator.platform = IPAD` is recorded separately from the small viewport; neither establishes physical iPad or on-screen-keyboard delivery.

The existing direct `breakEdit` oracles keep every source/range/caret/preview law. Verse and mixed hard-break actions now invoke the real toolbar, including the mixed histories' click/Enter/Space activations. Separate mixed native-newline actions freely interleave Enter/Shift+Enter with formatting, selection, fenced source, continuation and native undo; selected hard-break toolbar histories separately check undo/redo and rendered break restoration. Historical execution receipts that say typing→Shift+Enter predate this law delta and do not prove the current receiving mapping. `test-ui/format-shortcuts.test.ts` and `e2e/markdown-structure.spec.ts` remain pending their current-law retirement evidence; this snapshot does not retire them. See [law delta and remaining witnesses](editor-oracle-design/native-newline-law-delta.md).

`held-newline` uses the real `regions-example` extension in the full editor. The disposable host has an explicit browser-only compilation profile (`inspect`, `reading-time`, `regions-example`), disabled initially; each history enables the region extension through the actual API and restores settings. Fixture files replace generated extension-module resolution only for these hosts. Ordinary generated files and release builds are unchanged. Both initial bundles retain exact consumed-source hashes in `application-inputs.json` (singleton) or `application-topology.json` (file/pass pool). These identify bundled bytes and explicit build settings; they are not a complete package-resolver or system-library manifest. Each held-region history also retains its full raw receiving observations under `receiving-traces/`, separately from the judged trace. See [the bounded receiving design and evidence](editor-oracle-design/held-newline-receiving-20261121.md).

The [Save identity and file-split evidence](editor-oracle-design/native-save-identity-and-split-20261121.md) records the approved raw/relational receipt, all three native engine baselines, current split acceptance and remaining framework/Compose failures.

The subsequent [native receiving review](editor-oracle-design/native-boundary-strengthening-20261121.md) adds real quick-edit close/reopen, completed native delete followed by controlled false/throw signals, protected-region restoration, native text commits and ASCII keypresses. It retains the existing laws and source checks. Required provider receipts belong to the exact textarea and are acquired before the judged step; missing acquisition is a setup failure. Firefox's insert-text API uses a composition commit, so the driver records all action-scoped `beforeinput` and `input` events and separately exercises ordinary noncomposing keys. This does not establish physical IME behavior. The record distinguishes passing baselines, rejected mutations, diagnostic controls and remaining browser/framework gaps.

## Routine formatting baseline and CI partitions

`npm run test:oracles:formatting` expands to `npm run test:formatting -- --baseline-only --contexts 2`. It is the portable complete local baseline, and `npm run test:oracles` includes it. `npm run test:formatting` keeps the full mutation audit as its default. A successful baseline establishes no mutant rejection or gap closure; oracle changes, sensitivity evidence and replacing prior tests still require the complete mutation and semantic loss evidence for the exact source.

The Linux CI candidate is included in this draft PR for CI validation. It uses a generated complete-file plan, one job per current formatting oracle file, and a required `formatting-oracles` aggregate gate. Readiness remains unproven until a complete cold Linux run passes. Every job keeps the default ordered three-source instrumentation, receiver mode, one fresh seed recorded in the v2 plan and shared by every partition, declared histories and budgets, all calibrations and determinism registrations, and both complete passes. Each job produces a **partial baseline partition**; the aggregate alone can report a complete partitioned baseline. It validates the exact file/property cover, raw Vitest task rosters against captures, both-pass nondeterminism, source/dependency/browser manifests, pinned runner derivation, fixtures, browser acquisitions and final native-process cleanup. Missing, cancelled, failed, stale or extra parts fail the gate.

CI uses a kernel cpuset containing two CPUs for each service and two runner contexts, with separate Chromium processes and a fresh application per file/pass. The CI candidate allows at most four independent jobs at once, up to eight aggregate CPUs. That concurrency is additional host capacity; no completed cold CI throughput measurement establishes its runtime benefit. Complete-file partitioning still leaves the largest file serial; the mixed oracle has about 1,200 registrations, so a useful runtime ceiling is not established by this design.

Every partition retains its local first-pass barrier before its repeat. Different jobs may reach their repeat at different times. This preserves each registration and its two-pass comparison under the partition plan; it does not establish equality with the monolith's global all-first-before-repeat schedule. Partitioning assigns complete current files; it never splits a registration, history or generated run. The separate native-newline file move changes only that property’s file prefix, as described above. Plan, scope, topology, host, report and aggregate records bind the same invocation seed; the host receipt also binds the exact plan bytes; declared `fixedSeeds` remain unchanged. New invocations explore a fresh recorded seed while their repeats remain reproducible. This does not establish literal ORC-007 execution without a seed: the pinned gap checker deterministically replaces ambient randomness, and the wrapper deliberately supplies its recorded seed. That framework limitation remains open.

The CI source candidate retains Check's existing 360-minute job ceiling and Release's 75-minute ceiling. Release preflight sets a shared absolute deadline for fallback plan/partition/aggregate work; publication checks that deadline before its build and before starting publication. Source validation has not established setup cost, systemd/cpuset availability, strict manifest stability, actual GitHub check names, a complete cold baseline, or a runtime margin. The draft PR run must establish those Linux premises before the workflow is treated as ready. The existing candidate records preserve the source/helper controls and the distinct whole-registration alternative if the slowest complete file remains impractical.
