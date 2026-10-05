# Auth deployment boundaries

The provider is pinned to Better Auth and OAuth Provider 1.7.7. Public OAuth HTTP routes use the native database rate limiter explicitly, so enforcement does not depend on a Worker `NODE_ENV` binding. Migration 0020 creates the native `rateLimit` table. Counters share D1 across Worker instances; module-local memory would only share an isolate.

The provider's default budgets are registration 5, token 20, authorize 30, revoke 30, introspection 100 and userinfo 60 requests per 60 seconds. Owner password login enters a separate native HTTP budget of 5 per 60 seconds before password checking. The internal budget route is not exposed by the public router. Server-side `auth.api` calls bypass HTTP rate limiting; they require their own caller authorization and must not replace the public HTTP budget.

Native session lifetime is 30 days, matching the fixed offline grant deadline. Local lifecycle tests require a refreshed access token to work one second before that deadline and reject the same grant at the deadline. A seven-day native session would make a nominal 30-day offline refresh issue an inactive access token.

The limiter uses `cf-connecting-ip`, not a client-supplied forwarding chain. IPv6 addresses share the native /64 budget. Requests without that header share a fallback budget. Deploy through ingress that overwrites this header; a direct origin exposed to arbitrary callers cannot establish that trust merely by naming a header. Independent test browsers supply distinct addresses while retaining one address for each logical flow.

The request URL supplies the mounted issuer origin. Forged Forwarded and X-Forwarded-Host/Proto headers do not replace it in the local tested path. This does not establish which Host values the deployed ingress admits. Native session cookies are host-only, Secure, HttpOnly, SameSite=Lax and scoped to the mounted auth path in the HTTPS test. Owner cookies are a distinct credential and have separate tests.

`test/auth-lifecycle.oracle.test.ts` distinguishes JWT revocation from refresh-only revocation, authenticated API calls from public HTTP budgets, native hostile-origin/session checks, missing secrets, secret cutover, actual token deadlines, the deployed auth schema and failed D1 batch rollback. `test/auth-deployment.oracle.test.ts` covers concurrent registration thresholds, separate endpoint/IP budgets, reset, IPv6 grouping, forwarding spoofing, missing-IP fallback, owner-login throttling and native cookie flags. The audit's compiled full Worker probe also omits NODE_ENV, destroys and recreates its Worker against persisted D1, and checks that the budget survives. These are local workerd observations, not remote load or production trust measurements. `npm run test:upgrade` also runs the original 0.8.3 upgrade script against an offline synthetic local release: build, local migrations, type checking and SDK/Worker smoke run before all 19 auth/admission tables, limiter columns and initial grant state are checked. It declines deployment. This is a local upgrade rehearsal, not remote durability evidence. Release and persistence verifiers use `nodejs_compat` with compatibility date 2026-07-01. A compatibility flag does not guarantee support for every Node API.

## Production rollout measurements

The deployment operator owns these checks before claiming production hardening. They are operational follow-ups, not universal protocol requirements. Preserve the audit IDs when recording results.

- **Ingress and origin:** verify real Cloudflare address overwrite, direct-origin reachability, accepted Host values, HTTPS redirects and mounted issuer/cookie behavior. Decide whether the installation needs a fixed allowed host. Attempt a real browser iframe embedding of owner login and consent, including hostile ancestor origins; current tests inspect the blocking headers and protocol responses. (HL06, HL08, HL09, HL19, ILH04, ILH05.)
- **D1 capacity and recovery:** record the deployed plan, auth query and row counts, peak write/queue load, overloaded errors and caller recovery. Test migration upgrade and failed-batch rollback on a disposable database. Record backup/Time Travel retention and restore practice. Multi-call flows are not made atomic by sequential requests or replica consistency. (HL03, HL12–14, ILH06–07.)
- **Worker runtime:** run the full bundled auth paths on the deployment's compatibility settings; measure startup, CPU, memory, connections, bundle size and request headroom under representative auth load. Profile failures and pressure rather than extrapolating from an isolated provider bundle. (HL15–17, ILH08, ILH10–11.)
- **Security logging:** choose the event inventory, fields, correlation and retention for login, consent, issuance, rejection and revocation. Test sentinel passwords, bearer/session tokens, authorization codes and keys through dependency errors and every sink. Test CR/LF encoding, sink failures, access control and resource depletion without blocking users solely because logging fails. No full-stack token leak or safe redaction guarantee was established by this audit. (HL21–24, ILH12–15.)

Missing-password login now fails closed; empty wrapping-secret login fails without a cookie. Native JWT revocation reports unsupported_token_type, while refresh-only revocation leaves an existing valid JWT usable. This is separate from owner grant revocation. The selected configuration does not use opaque access tokens, private-key client assertions, client-secret rotation or versioned encryption-key fallback; their source requirements remain conditional alternatives in the audit. Signing-secret/grant revocation does not prove an unselected encryption-key fallback lifecycle. A generic rollout checklist does not replace protocol evidence in the evaluate ledger. The atomic-consume advisory was patched in 1.6.11; its existence does not prove a 1.7.7 vulnerability.

## Security oracle follow-up

The later security pass adds a remote-HTTP refusal before protected handling, exact loopback development exceptions, native safe logging and a safe root error handler. It also forces a refresh replay race across two real Worker isolates sharing D1. [Security release oracles](auth-security-oracles.md) records the exact local controls and the production evidence that remains necessary. HTTPS ingress must still prevent a client from sending credentials over HTTP in the first place.

## Work and outbound limits

Migration 0021 adds shared admission counters and temporary registration claims.
Apply it before deploying this Worker. The following Wrangler `vars` accept
positive integer strings. Invalid values, including zero, retain the default.

| Variable | Default | Bound |
|---|---|---|
| `API_READ_LIMIT` | `1200` | Account-wide authenticated REST/MCP reads per minute |
| `MCP_REQUEST_LIMIT` | `300` | Authenticated MCP envelopes per minute, including discovery |
| `API_WRITE_LIMIT` | `120` | Account-wide authenticated REST/MCP writes per minute |
| `API_BODY_LIMIT` | `8388608` | REST and authorization-management body bytes |
| `AI_DAILY_CALL_LIMIT` | `20` | Actual AI provider calls per UTC day, across purposes |
| `OAUTH_CLIENT_LIMIT` | `100` | Stored clients plus live anonymous-registration claims |

OAuth request bodies have a fixed 1 MiB cap. MCP keeps its existing 8 MiB cap.
MCP envelopes also consume their own account-wide request budget. Tool calls
consume the REST operation budget too. Write admission is atomic across isolates. Denied scopes do not consume API
budgets. Admitted failures consume their budget, including failed AI calls.
REST quota refusals return 429 with `Retry-After: 60`. AI refusals return 429.
An AI call cap does not bound money per call. Fixed windows permit bursts across
window boundaries and do not limit active concurrency or work within one call.
The anonymous cap counts all stored clients, including owner-created clients.
Owner creation stays authenticated and write-budgeted. Live clients do not
expire automatically. Operators must review unused clients and native auth-record
retention. Temporary claims expire after five minutes and are removed on the
next registration attempt.

Outbound subscriptions, forks, freshness reads and Webmentions accept public
HTTP(S) destinations by default. Every redirect undergoes the same address and
DNS checks. Embedded URL credentials are refused. Webmention bodies stop at
1 MiB, importer bodies at 4 MiB. Timeouts span DNS checks and redirect fetches.
Set `vars.ALLOW_PRIVATE_FETCH` to the string `"true"` only for an installation
that deliberately needs LAN/private destinations. This permits those targets
for every caller of the installation, not just the owner’s UI.

DNS checks use Cloudflare’s public DNS-over-HTTPS resolver. They reject mixed
public/private answers and fail closed if validation fails. They do not bind
Cloudflare fetch’s later connection to the validated answers. **DNS rebinding
remains a security gap.** A deployment must enforce destination policy at the
connection boundary before claiming complete SSRF containment. Public-address
classification also cannot prevent abuse of a permitted public service.

See [the bounded attack inventory](security-attack-inventory.md) for captured
failures, receiving probes and remaining coverage limits. Imported HTML now uses
an editorial allowlist at both private and public rendering boundaries. It drops
active/foreign markup and unsafe URL schemes while retaining ordinary links,
images and transclusions. Raw publisher content remains stored for history.
