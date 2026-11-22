# Formatting review integration with main

The integration worktree fast-forwarded from `764cb40d15b8062dad70032f262807f4472ec962`
to `049b5a7` on 2026-11-19, following the requested merge of `origin/main`.
This includes the existing-oracle migration and conditional-read recovery PRs,
plus the separate WebKit CI job. It is an upstream integration, not a new
formatting implementation commit or a PR readiness verdict.

All 277 pre-merge untracked files retain their exact bytes. The 13 changed
tracked paths retain their previous working content except for the five
overlapping package, workflow and UI-config paths resolved additively. The
formatter's earlier staged version and later unstaged repair remain separate;
the existing `sheets.tsx` edit remains unstaged. Four staged test deletions remain.
The original Git stash is retained as `feed0611aafbc9921c65c9dc2d8c4f39f6ba2b70`.

Both branches already selected `@tanstack/oracles@97a4e7a`. The merged lockfile
and upstream oracle lint dependency are retained. `package.json` preserves all
upstream commands and adds `test:formatting`. The upstream UI config already
excludes every oracle file, which includes this suite. Workflow merge results
still contain the provisional full formatting command; the measured baseline
runner is a separate, unadopted proposal.

`npm ci --legacy-peer-deps --ignore-scripts` installed the merged lock without
an override. The subsequent complete build, repository typecheck and scoped
oracle/production lint passed. The migration inventory command failed because
its Studio runtime registry does not contain the 39 editor properties from
these 14 new oracle files. An explicit formatter registry and audited file group
are being evaluated; the 38 original migration suites must remain intact.

Earlier browser evidence remains bound to its recorded pre-merge source. It
does not establish behavior through the new application and SDK. The formatter
and model bytes survived the merge, but application receiving and CI acceptance
must be rebound and run against the combined tree. The old collection failure
also remains an observation on old source until its changed receiving path is
checked. No assertion kill or whole-suite GREEN is inferred from the build.

Private preservation manifest:
`/private/tmp/blygger-prep-pr-20261119/main-049b5a7-preservation/manifest.json`,
SHA-256 `7eb15f9b5c45d93461584bf18ee24999b4bc6c125cfbe02499405a1db5f62a89`.
It preserves both original binary patches, status, old/new commits and hashes;
the patches distinguish previous staging from working changes.
