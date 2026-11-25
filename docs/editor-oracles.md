# Editor formatting oracles

The formatting suite uses `@tanstack/oracles`, pinned to `97a4e7a`. Production formatting executes in a browser. Independent models and comparisons run in Node. Playwright delivers real keys, toolbar actions and paste through React; it also runs direct formatting helpers in browser textareas.

## Run the suite

Install the browser runtime for the installed Playwright version, then run both complete unmutated passes:

```sh
npx playwright install chromium
npm run test:oracles:formatting
```

That command expands to `npm run test:formatting -- --baseline-only --contexts 2`. To include the mutation audit, which introduces defects to check that the laws reject them, run:

```sh
npm run test:formatting
```

The mutation audit is substantially slower than the baseline. Passing the baseline does not establish complete mutation acceptance or close reported gaps. Oracle changes, sensitivity claims and retirement of old tests require the applicable mutation and loss audits.

For focused campaigns:

```sh
npm run test:formatting -- --oracle keyboard
npm run test:formatting -- --oracle mixed
npm run test:formatting -- --oracle held-newline
npx playwright install firefox
npm run test:formatting -- --oracle mixed --browser firefox
```

| Selector | What it judges |
| --- | --- |
| `inline` | Emphasis, link placeholders and formulas: complete source and selection |
| `keyboard` | Shortcut classification and formatter dispatch in a browser textarea |
| `list` | Whole-line edits, caret/range geometry and independently rendered nesting |
| `line-break` | Hard-break parity, fenced-code boundaries, CommonMark info strings and verse |
| `code-block` | Literal selected content, fence collisions, boundaries and selection |
| `valid-input` | Usable structural edits over arbitrary valid UTF-16 input; only list edits may decline |
| `links` | Completed-link recognition, escaping, trackers, result feedback and rendered anchors |
| `session` | Both session files: formatting, native editing, app-formatting Undo/Redo, React and Save across all three editors |
| `newline-history` | Native newline source and immediate Save, including exact saved-item/create relationships |
| `held-newline` | Native typing/newlines, deletion/cut, normalized read-only regions and accepted edges, followed by full-draft Save |
| `mixed` | Generated command, typing, selection, paste and Undo/Redo combinations in the full editor |
| `interactions` | Toolbar keyboard activation, focus, consumed keys and native Tab traversal |
| `receivers` | Bracket-picker input, layered Escape and formatting gates during restore |
| `workflows` | Clipboard links, URL sheets, cancellation and paste through the application |
| `navigation` | Working-copy retention, save settlement, departure and public failures |
| `draft` | Draft working-copy revisions and save schedules |

`session` selects `editor-session.oracle.test.ts` and `editor-newline-history.oracle.test.ts`; `newline-history` selects the latter alone. The suite contains 18 entry files and 41 properties. Run application-receiving oracles through this wrapper so they receive their disposable application host.

## Read and replay failures

Reports default to `build/formatting-oracles/`; `--out <directory>` changes the location. `summary.md` reports baseline and mutation results, `results.json` contains structured results, and `test-output.log` contains failures and replay instructions. Keep execution evidence outside version control.

Each invocation records a signed 32-bit seed in `browser-topology.json` and logs `FORMATTING_ORACLE_SEED`. The wrapper draws it with `crypto.randomBytes` unless `--seed` or a CI plan supplies it. Both baselines and every mutation reuse that invocation seed. To repeat an invocation:

```sh
npm run test:formatting -- --oracle held-newline --seed <recorded-value>
```

For a reduced failure, also retain the printed property, unit and shrink path. Clear `ORACLE_PROPERTY`, `ORACLE_UNIT`, `ORACLE_PATH` and `ORACLE_SEED` before returning to a complete campaign. An environment-only seed does not override this wrapper's CLI seed. `--only` selects mutations rather than histories; authored selectors use `authored:<id>`. Confirm every requested selector appears in the report.

Every important property retains fixed-seed and random-named campaigns with the same histories, model, driver, check and budget. Constructed histories require declared boundaries to be reached; calibrations must reject wrong observations. The pinned gap checker replaces ambient randomness, so the recorded invocation seed does not establish literal unseeded ORC-007 execution. That framework limitation remains open.

## Design and editing boundaries

Each oracle states its authority, laws and limits beside its registration. Independent command models predict source and selection from semantic histories. Browser drivers observe the real command or React editor; separate renderer observations judge code, links and list nesting. Models never import production formatting logic. Shared helpers handle document/range construction and transport rather than semantic judgment.

Mixed histories compare every intermediate action, including the receiving input and delivered selection. Where indentation spelling is free, the model accepts the allowed space/tab results and retains the actual chosen source for later Undo. A later action cannot conceal an earlier wrong edit.

Enter and Shift+Enter insert ordinary native newlines. The hard-break toolbar separately invokes `breakEdit` to create a rendered Markdown line break. Native keys retain exact source, selected replacement, caret/focus, unprevented key delivery, continued typing and Save checks across composer, full editor and quick edit.

Browser-owned typing/newline Undo, grouping and command recovery are outside the application promise. No custom history adapter is installed. App-applied formatting retains Undo/Redo, including Undo followed by a new formatting command. Mixed histories reset their modeled Undo boundary after browser-default typing/newlines and DOM paste; session histories omit default-newline replay and Redo after typed replacement.

The read-only oracle enables the real `regions-example` extension through the API and restores settings afterwards. Its browser host compiles `inspect`, `reading-time` and `regions-example`, initially disabled. It judges selected replacement, caret typing, deletion/cut, normalized extension ranges, exact-edge acceptance and the complete saved draft. Its bounded single-operation histories do not prove arbitrary layouts, multiple-operation stale receipts or physical IME behavior.

Small viewports do not establish physical mobile behavior. Explicit WebKit executable overrides do not establish matched Safari/iOS behavior. Controlled native-host outcomes and OS clipboard/permission delivery are distinct premises. Broader syntax-aware editing and proposed features remain separate decisions; see [research and remaining work](editor-research-next-steps.md).

## CI and runner integrity

Routine CI partitions the formatting tests and requires the `formatting-oracles` aggregate. The plan collects the Vitest task roster for each long file and assigns every task to exactly one shard. Each shard executes the same assigned tasks in both passes. Short files run in full. The shared seed, test names, history inputs, budgets, calibrations and determinism checks carry through to both passes. The aggregate rejects missing, cancelled, failed, stale or extra parts and verifies the task rosters, captures, browser acquisition and cleanup.

Each service uses a two-CPU kernel cpuset and two runner contexts, separate Chromium processes and a fresh application per partition pass. The matrix pairs CPU lanes of similar expected duration. Each lane runs one or two services in sequence. The next service starts after the previous cgroup releases its processes. A runner with four available CPUs runs the lanes on disjoint CPU sets. With two or three CPUs, it runs all services in sequence. Each partition completes its first pass before its repeat.

The `per-job-stable-host-v1` policy records each job's full host identity before and after work and requires stability within that job. Kernel and VM image versions may differ across jobs. Platform, architecture, image OS, Node version/executable bytes and named environment settings must match across jobs, as must repository, dependency and browser manifests. The policy does not establish identical system-library bytes across different VM images.

Installed dependency bytes must remain fixed during a campaign. The wrapper requires a cold runner and refuses daemon routes. Restart after changing installed packages. The package's reusable-evidence logic excludes `node_modules` reads; the CI manifest separately records the dependency tree. Application bundle receipts identify consumed source and build settings, rather than a complete package-resolver/system-library manifest. Raw receiving observations remain separate from the judged trace.

Check retains its 360-minute job ceiling; Release retains its 75-minute ceiling. Release preflight supplies a shared absolute deadline for fallback formatting work, and publication checks it before build and publication. A complete baseline does not establish a full mutation-audit runtime bound. The first complete tagged execution of the restructured release workflow remains unverified until a release tag.
