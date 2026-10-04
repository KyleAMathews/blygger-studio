# OAuth and MCP PR review

Reviewed implementation commit: `6558b78a8e7fe16c7173840be47de36d42c12f92`.
Base: upstream main `0f6108f`. This record adds documentation after that source
snapshot. It does not change runtime code or test assertions.

The prep review integrated the current upstream UI and API, renamed the new
migration to `0020_oauth.sql`, and prepared Studio 0.27.0 and SDK 0.2.0. It retained
upstream's tag-triggered release policy. Client access lives in More.

## Confirmed findings

- Uploaded SVG documents could run script with the owner's origin. A harmless
  browser marker reached RED. Media now carries a CSP sandbox. Image rendering
  and inert document behavior pass on desktop and mobile. The sandbox-removal
  mutation reaches the same receiving assertion.
- Authenticated HTTP Basic refresh replay did not revoke the application's JWT
  grant. The receiving oracle reached RED with read 200 instead of 401. Resolving
  the native-authenticated client identity fixes it. The wrong-secret neighbor
  preserves the legitimate grant. A classification-removal mutation reaches RED.
- Upstream added model, interaction and thumb reads. The independent MCP scope
  inventory now names all three. The full scope-subset campaign passes.
- Upgrade and mutation fixtures now include the model build artifact and reflect
  renamed/deleted candidate files. The upgrade no longer applies both migration names.

The lossless audit retains the original findings and appends the two confirmed
security repairs. See [security evaluation](auth-security-evaluation.md).

## Verification

| Check | Result |
| --- | --- |
| Full Worker suite, two workers | 98 files, 1,052 passed, 5 existing skips |
| Full desktop/mobile Chromium suite | 214 passed |
| UI suite | 4 files, 23 passed |
| Focused security/flow/validation rerun | 3 files, 104 passed |
| Lifecycle/pagination mutations | 4 named checkpoints |
| Auth mutations and direct seed/path replay | 3 controls and 2 reproduced histories |
| Security mutations | 13 named checkpoints, including browser and two-isolate controls |
| Mounted native OIDC fixture | Root, `/blyg`, `/nested/blyg` |
| Real 0.8.3 upgrade entry point | Build, types, D1 migrations, SDK smoke, declined deploy |
| Extracted release artifacts | Checksums, Worker, Node/browser SDK consumers, both type-resolution modes, D1/R2 restart persistence |
| Worker/UI types, generation and template checks | Pass |

The release manifest identifies the reviewed implementation commit. Local logs
are under the task's `/private/tmp/blygger-auth-audit` evidence directory. CI
uploads mutation and browser failure artifacts. The assertions and receiving
oracles remain versioned; scratch logs are local evidence, not durable downloads.

## Limits

Host-root discovery publication remains deferred. Mounted discovery and the
challenge-linked metadata do not establish full RFC9728/RFC8414 publication
conformance. Better Auth's native refresh cleanup can invalidate another refresh
token for the same client and owner; application grant tombstones remain separate.
The sibling oracle proves access-token isolation after individual owner revocation,
not refresh isolation after replay. Production TLS, trusted ingress headers,
operator/database access, external logs and every distributed schedule remain
outside these local checks. No deployment or upstream merge occurred.

The [oracle map](auth-oracles.md), [security map](auth-security-oracles.md),
[glossary](glossary.md) and [merged oracle guide](oracle-tests.md) define the laws,
sources, driver limits and terms. This review does not claim complete guide or
protocol conformance.
