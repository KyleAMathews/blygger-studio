# Main integration at 764cb40

The integration worktree now includes upstream main through
`764cb40d15b8062dad70032f262807f4472ec962` (0.64.1). A live
`git ls-remote origin refs/heads/main` confirmed that revision after the merge.
The merge preserved the staged formatting changes, unstaged singleton toast
repair, new oracle files, local feedback log and both remaining clipboard tests.
There are no unresolved conflicts. No project commit or push was made.

The tracked pre-merge backup remains in stash
`a35129821820af7c12dbe3a5b4be89327389cd32`; a patch is also retained at
`/private/tmp/blygger-integration-before-764cb40.patch`.

Since the previously integrated `2d153071`, upstream changed AGENTS, CHANGELOG,
the package manifest and lock, and `src/client.ts`. Hono moved from 4.13.14 to
4.13.18, fast-xml-parser from 5.11.2 to 5.12.1, fast-xml-builder from 1.3.1 to
1.3.2, and is-unsafe from 2.0.2 to 2.0.3. The editor implementation and retired
test blobs did not change in this final delta. Earlier integration had already
brought in the Base UI controls, toast migration and tangling changes.

`npm ci --legacy-peer-deps --no-audit --no-fund` passed in the integration
worktree, including its postinstall build. Typecheck passed, and the remaining
UI suite passed all 247 tests in 30 files. Diff whitespace checks passed. No
dependency override or installation workaround was needed. The install log is
`/private/tmp/blygger-main-764cb40-install.log`.

Historical oracle reports retain their original source receipts. They are not
relabeled as current-head results. A separate candidate snapshot at
`/private/tmp/blygger-ci-764cb40-e0vnxfbb/repository` is measuring the reviewed
baseline-only CI proposal with four private browser processes. This executes
the complete 14-file scope twice, and reports mutation analysis as not run.
Its build and typecheck passed; execution and timing acceptance are pending.
The candidate uses an assembled Linux dependency tree, recorded in its parent
`candidate-composition.json`, rather than a fresh Linux install timing sample.

The original reference mutation audit remains running in the frozen
`oracles-explore` worktree. Its runtime inputs and installed runner have not
been changed by this integration or CI experiment.
