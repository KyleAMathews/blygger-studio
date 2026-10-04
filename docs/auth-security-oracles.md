# Security release oracles

The remaining security gaps were not all RED before this pass. Three public failures now have exact RED/GREEN evidence: access JWTs survived refresh replay, dependency errors exposed a sentinel secret in logs, and remote HTTP login issued an owner cookie. The new probes preceded each repair. Passing controls have separate deliberate mutations that must fail at named assertions.

## Receiving boundaries

| Security area | Oracle and required observation | Evidence limit |
|---|---|---|
| Refresh replay and revocation | `test/auth-security.oracle.test.ts`: live successor access works before replay, then returns401 after ancestor replay. Authenticated native introspection returns active before owner revocation and inactive afterward. Invalid client, scope and resource requests leave the legitimate grant usable. | A public replay failure was repaired. Introspection was already secure and receives a mutation control. |
| Cross-isolate refresh race | `scripts/verify-auth-security-race.ts`: two compiled workerd isolates share D1. A service gate pauses the completed native rotation claim. The other isolate detects replay. Prior access becomes401 and paused issuance returns400 without credentials. | The gate controls one dangerous native interleaving. It does not prove every distributed schedule. Test-only scheduler code stays outside the production entrypoint. |
| Storage and error secrecy | `test/auth-security.oracle.test.ts`: no plaintext owner password, code, refresh token or access JWT in the inspected app/provider tables. Private signing keys remain encrypted. Error-aware serialization captures Error messages and stacks at registration, owner login and manual minting. Injected credential markers stay out of responses and console sinks. | Native session bearer tokens remain in D1 by the provider's design. Real database permissions, backups, platform request logs and external sinks still need operator evidence. |
| Hostile token claims | The security oracle uses the native server-only signing API on disposable fixture keys. A valid signed neighbor works. Wrong issuer, owner, audience, expiry, not-before, missing grant, credential version or unsupported sender constraint fails401 before REST or MCP reads and writes. Substituted keys and ID tokens also fail. | This is receiving behavior, not a proof of cryptographic entropy or every algorithm/header combination. No host credentials or private key material enter the test. |
| Browser attacks | `e2e/client-access.spec.ts`: desktop/mobile Chromium completes login and consent, suppresses an external callback Referer, and refuses both owner pages inside a real hostile ancestor. The ancestor shares the site but differs in origin, so cookie suppression cannot stand in for framing protection. | Native cross-origin protocol probes and frame mutations complement these browser cases. Other browsers and production ingress remain separate. |
| Transport and ingress | The security oracle rejects remote HTTP before protected handling and permits only exact localhost,127.0.0.1,[::1] development exceptions. Existing deployment oracles cover forwarding spoofing, IPv6 grouping, shared budgets and missing-IP fallback. | Rejecting HTTP cannot undo credentials already transmitted. Operators must enforce HTTPS at ingress and verify Cloudflare address-header provenance, admitted hosts and direct-origin reachability. These deployment facts have no local RED/GREEN claim. |

## Mutation controls

Run `npm run test:auth:security:mutations`. The runner copies only tracked files and repository source/test paths into a disposable directory. It never mutates this checkout. Each baseline must pass before its mutant runs. Setup errors, missing modules, timeout failures and surviving mutants fail the verifier.

The controls remove the subject check, store raw credentials, expose full dependency errors, store unencrypted signing keys, omit introspection revocation, trust a spoofed forwarding header, remove browser frame blocking, omit cross-isolate grant revocation, expose root errors, restore the native raw-error fallback and remove the HTTPS guard. Each must reach its named receiving assertion. The compiled race and real browser controls are part of this runner.

Run `npm run test:auth:security` for the security oracle and the controlled compiled race. Run `npx playwright test e2e/client-access.spec.ts` for browser lifecycle and framing. The full Worker suite includes the new security oracle.

## Deployment evidence still required

No test in this checkout can establish the production account's log access, D1/backup access, edge TLS configuration or admitted host routes. The operator must verify these facts against the actual deployment. Keep them as release conditions in [deployment hardening](auth-deployment-hardening.md). A passing emulator is not a substitute.

## Deferred discovery publication

The maintainer deferred host-root `.well-known` publication. Mounted OIDC discovery and challenge-linked protected-resource metadata remain the selected profile. The official MCP client completes the tested mounted flow. This does not establish full RFC9728 or RFC8414 host-root publication compliance. Preserve this limit in the PR body. No root route was added.

## Verified result

The full Worker suite passes: 96 files, 1,017 tests passed and five existing skips. All eleven security mutations reach their named failure assertions. Six browser tests pass on desktop and mobile. The controlled two-isolate replay probe and Worker/UI typechecks pass. The new security file has27 cases. Three public regressions were captured before repair; the other controls use deliberate mutations for RED evidence. Deployment-only facts remain unverified.

## Family scope limit

Application tombstones use `grantId`; Better Auth1.7.7 native refresh-family cleanup uses client/user identity. These boundaries differ. The replay oracle checks denial of the compromised grant, and the independent-grant oracle checks another access credential after owner revocation. Neither establishes that refresh replay leaves another same-client grant’s refresh credential usable. The [glossary](glossary.md) names both families explicitly.
