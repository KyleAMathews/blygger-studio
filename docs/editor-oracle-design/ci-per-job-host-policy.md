# Per-job host identity in formatting CI

The maintainer approved keeping parallel jobs, recording each job's host and requiring stability within each job. The former cross-job equality check refused before oracle execution when GitHub supplied different Ubuntu VM images: the plan used kernel `7.0.0-1016-aws`, image `20261116.88.1`; other jobs used kernel `7.0.0-1020-azure`, image `20261116.202.1`. Node executable bytes and the named environment matched.

`per-job-stable-host-v1` permits only kernel and image-version variation between jobs. Platform, architecture, image OS, Node version and executable digest, and every named environment setting remain common. Complete source, dependency and browser manifests retain their exact plan comparison. This policy does not establish identical system libraries across distinct images.

Plan-v3 retains the planning job's initial and final host. The partition scope carries its own startup host through worker environment reads. Finalization compares the current identity with that startup host and writes partition-v3 with the final identity. Aggregate validation rejects missing, malformed, unknown or unstable host proof, rechecks all common fields, and includes every plan/partition/aggregate before/after identity in complete-v3. Old receipts cannot satisfy the new schemas. The supervisor's host-completion-v2 schema remains unchanged because its cgroup, cleanup, seed, plan-digest and timing contract is unchanged.

The control run passed 97 executable controls against the changed source. It accepted stable cross-job AWS/Azure identities and rejected within-job drift of every host field. It also rejected missing/malformed identities, extra fields, altered Node/environment/common fields, legacy plans, missing policy and incomplete inventory. A disposable Git repository exercised actual worker scope reads and the aggregate's initial complete input guard. Changes to its source, config, installed dependency and installed browser bytes all failed that guard. The unchanged fixture reached the separate missing-partition guard under a distinct stable image version.

These are bounded infrastructure controls, not browser-oracle executions or mutation kills. They do not establish a complete cold Linux aggregate. All oracle laws, models, histories, seeds, budgets, observations, registration checks, resource checks, cleanup checks and full-mutation defaults remain unchanged.

Control source and JSON results: `/private/tmp/blygger-ci-job-host-5HR9MJ/controls.mjs` and `results.json`. Scoped ESLint, the repository TypeScript check, Python syntax and diff whitespace checks pass. An independent read-only review found no concrete blocker in schema propagation, startup/worker/finish binding, aggregate proof validation or the two permitted cross-job differences.

Reviewed source and control fingerprints:

```text
063372038273e99bdeae574574d59f4bd3b331281909f54ca64c78c2fa4fc063  scripts/formatting-baseline-plan.ts
d807432e986ccd52823011b57b0e907591c03d49779dcb7639304fde7faad458  scripts/formatting-baseline-host.py
6fc4232dbc8f9fba5adfb2b86d451333f952a89ec8efe600c559fa0b1ea439a6  controls.mjs
85574e0ab810a3555d5d0a8b79b77bda1b704a87d7f336f3a871bcb6235590e5  results.json
```
