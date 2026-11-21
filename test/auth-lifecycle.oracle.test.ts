/**
 * Native token lifetime, root authority and owner-session trust are independent.
 * The real mounted receiving paths enforce each boundary at its completed HTTP
 * response, while native storage and credential verification locate exact edges.
 *
 * ```ts
 * POST /oauth2/revoke(accessJwt) // → unsupported_token_type; JWT still usable
 * POST /oauth2/revoke(refresh) // → refresh denied; JWT usable until attempted reuse
 * GET /api/settings // → denied at access expiry or after root-secret cutover
 * POST /oauth2/token // → offline grant usable at T-1, denied at fixed deadline T
 * POST /studio/login // → no cookie with missing root configuration
 * ```
 * Revoking a refresh credential is not revoking its signed access token. Attempted
 * refresh reuse invokes Blygger's stronger grant-family policy. RFC7009 §2.1 allows
 * token-type revocation limits; RFC7519 §4.1.4 gives exclusive access expiry.
 * OIDC authentication age remains independent of recreated wrapper sessions.
 *
 * For every retained lifecycle history, approved lifetime and root/consent/PKCE
 * constraints decide the next receiving response without extending authority.
 * Separate properties model independent boundaries using semantic inputs rather
 * than named test callbacks. Models never inspect production outputs. Drivers
 * record response facts, with opaque credentials represented only by presence.
 * Expected verifier/batch rejection is recorded at its promised operation; fixture
 * setup, JSON parsing and cleanup errors remain original runner diagnostics.
 *
 * All original finite cases and table rows remain. Storage expiry is a scheduling
 * locator, not an independent configured-duration proof; issuance checks one hour
 * and the offline walk checks the fixed thirty-day grant. No full OIDC profile or
 * every concurrent refresh schedule is claimed.
 */
import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { vi } from 'vitest';
import { differs, oracleProperty, pass, type Observation } from '@tanstack/oracles';
import { makeApp } from '../src/index.ts';
import { authorizationServer } from '../src/oauth.ts';
import { flow } from './oauth-flow-driver.ts';
import { withOracleStorage } from './oracle-storage.ts';
import type { Env } from '../src/types.ts';
type Observe = (checkpoint: string, value: unknown) => void;
const fact = (checkpoint: string, value: unknown): Observation => ({ checkpoint, value });
// Judge only observations that actually arrived. A fixture or cleanup exception
// leaves a matching prefix to the framework's driver-error classifier. A normal
// return publishes completion, which makes omitted contractual results a failure.
const compare = <TPlan>(_plan: TPlan, trace: readonly Observation[], expected: Observation[]) => {
  for (let index = 0; index < trace.length; index++) {
    const entry = trace[index];
    const result = entry.checkpoint === 'lifecycle complete'
      ? differs('native lifecycle completion', 'native lifecycle authority', { index, value: entry.value }, { index: expected.length, value: true })
      : differs(entry.checkpoint, 'native lifecycle authority', entry, expected[index]);
    if (result) return result;
  }
  return pass;
};
async function withLifecycleStorage(observe: Observe, operation: () => Promise<void>) {
  await withOracleStorage(operation);
  observe('lifecycle complete', true);
}
const authority = 'Existing auth-lifecycle receiving laws; docs/auth-oracles.md; RFC7009 §2.1; RFC7519 §4.1.4; OIDC AuthRequest';
const limits = 'Original bounded public Worker/native fixture histories and controlled Date; no full OIDC profile or all concurrent refresh schedules.';
async function issue(observe: Observe) {
  const f = await flow(), approval = await f.decide('browser-a', true);
  const code = new URL(approval.headers.get('location')!).searchParams.get('code')!;
  const response = await f.token(code); observe('OAuth issuance', response.status);
  const tokens = await response.json() as { access_token: string; refresh_token: string; expires_in: number };
  return { ...f, code, tokens };
}
type Issued = Awaited<ReturnType<typeof issue>>;
const refresh = (f: Issued) => f.request(f.issuer + '/oauth2/token', { method: 'POST', body: new URLSearchParams({ grant_type: 'refresh_token', client_id: f.client.client_id, refresh_token: f.tokens.refresh_token, resource: f.base + '/blyg/api' }) });
const access = (f: Issued) => f.request('/blyg/api/settings', { headers: { Authorization: 'Bearer ' + f.tokens.access_token } });
async function withEnv(url: string, currentEnv: Env, init: RequestInit = {}) {
  const ctx = createExecutionContext(), headers = new Headers(init.headers); headers.set('cf-connecting-ip', '198.51.100.230');
  const response = await makeApp('/blyg').fetch(new Request(url, { ...init, headers }), currentEnv, ctx);
  await waitOnExecutionContext(ctx); return response;
}
const corruptStatus = (checkpoint: string) => (trace: readonly Observation[]) => trace.map(entry => entry.checkpoint === checkpoint ? { ...entry, value: 299 } : entry);

type CredentialAction = { op: 'revoke'; token: 'access' | 'refresh' } | { op: 'access' } | { op: 'refresh' };
const revocationPlans: { name: string; actions: CredentialAction[] }[] = [{ name: 'reports unsupported JWT revocation and separates refresh revocation from access validity', actions: [{ op: 'revoke', token: 'access' }, { op: 'access' }, { op: 'revoke', token: 'refresh' }, { op: 'access' }, { op: 'refresh' }, { op: 'access' }] }];
// Refresh availability and grant-family validity are distinct state. The access
// between revoke and reuse distinguishes them; merging them loses that promise.
function revocationModel(plan: typeof revocationPlans[number]) {
  let refreshLive = true, familyLive = true;
  return [fact('OAuth issuance', 200), ...plan.actions.flatMap(action => {
    if (action.op === 'revoke') {
      if (action.token === 'access') return [fact('native revocation', { status: 400, error: 'unsupported_token_type' })];
      refreshLive = false; return [fact('native revocation', { status: 200 })];
    }
    if (action.op === 'access') return [fact('delegated resource', familyLive ? 200 : 401)];
    if (!refreshLive) { familyLive = false; return [fact('native refresh', 400)]; }
    return [fact('native refresh', 200)];
  })];
}
oracleProperty({
  id: 'auth-lifecycle', owns: ['src/auth.ts', 'src/oauth.ts#authorizationServer', 'src/oauth-routes.ts'],
  law: { statement: 'For every retained revocation history, native access-JWT revocation reports its unsupported type, refresh revocation leaves signed access usable, and attempted refresh reuse revokes grant-family access.', authority, limits },
  histories: revocationPlans, label: plan => plan.name, model: revocationModel,
  driver: async (plan, observe) => withLifecycleStorage(observe, async () => {
    const f = await issue(observe);
    for (const action of plan.actions) {
      if (action.op === 'access') { observe('delegated resource', (await access(f)).status); continue; }
      if (action.op === 'refresh') { observe('native refresh', (await refresh(f)).status); continue; }
      const response = await f.request(f.issuer + '/oauth2/revoke', { method: 'POST', body: new URLSearchParams({ client_id: f.client.client_id, token: action.token === 'access' ? f.tokens.access_token : f.tokens.refresh_token, token_type_hint: action.token + '_token' }) });
      observe('native revocation', { status: response.status, ...(action.token === 'access' ? { error: (await response.json() as { error?: string }).error } : {}) });
    }
  }), check: compare,
  calibrations: [{ name: 'refresh reuse leaves access live', law: 'native lifecycle authority', history: { enumerated: 0 }, corrupt: trace => trace.map(entry => entry.checkpoint === 'delegated resource' && entry.value === 401 ? { ...entry, value: 200 } : entry) }],
});
const admissionPlans = [{ name: 'keeps authenticated server API issuance separate from an exhausted public DCR budget', initialRegistrations: 1, additionalRegistrations: 5, ownerRequests: [true, false] }];
oracleProperty({
  id: 'auth-lifecycle-admission', owns: ['src/auth.ts', 'src/oauth.ts#authorizationServer', 'src/oauth-routes.ts'],
  law: { statement: 'For every retained exhausted public-registration history, authenticated owner manual issuance remains usable while unauthenticated issuance is denied.', authority, limits },
  histories: admissionPlans, label: plan => plan.name,
  model: plan => [...Array.from({ length: plan.additionalRegistrations }, (_, index) => fact('public registration', plan.initialRegistrations + index < 5 ? 201 : 429)), ...plan.ownerRequests.map(owner => fact('manual issuance', { status: owner ? 200 : 401, ...(owner ? { tokenProperty: true } : {}) }))],
  driver: async (plan, observe) => withLifecycleStorage(observe, async () => {
    const f = await flow();
    for (let index = 0; index < plan.additionalRegistrations; index++) observe('public registration', (await f.request(f.issuer + '/oauth2/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ redirect_uris: [f.redirect], token_endpoint_auth_method: 'none' }) })).status);
    for (const owner of plan.ownerRequests) {
      const response = await f.request('/blyg/api/authorizations', { method: 'POST', headers: { ...(owner ? { cookie: f.owner } : {}), 'Content-Type': 'application/json' }, body: JSON.stringify(owner ? { name: 'authenticated API bypass', scope: ['owner:read'], resource: 'api' } : {}) });
      observe('manual issuance', { status: response.status, ...(owner ? { tokenProperty: Object.prototype.hasOwnProperty.call(await response.json(), 'accessToken') } : {}) });
    }
  }), check: compare,
  calibrations: [{ name: 'public limiter blocks owner issuance', law: 'native lifecycle authority', history: { enumerated: 0 }, corrupt: trace => trace.map(entry => entry.checkpoint === 'manual issuance' ? { ...entry, value: { status: 429 } } : entry) }],
});
const consentPlans = [{ name: 'rejects hostile native consent origins and false wrapper owner credentials', origins: ['https://attacker.example.test', 'http://localhost:3000'], forgedScope: 'owner:manage' }];
oracleProperty({
  id: 'auth-lifecycle-consent', owns: ['src/auth.ts', 'src/oauth.ts#authorizationServer', 'src/oauth-routes.ts'],
  law: { statement: 'For every retained consent history, hostile origins, false native or wrapper owner credentials and modified signed scopes cannot authorize owner consent.', authority, limits },
  histories: consentPlans, label: plan => plan.name,
  model: plan => [fact('native authorization', 302), ...plan.origins.map(() => fact('hostile native consent', 403)), fact('false native credential', 401), fact('modified signed consent', 400), fact('false wrapper authorization', 302), fact('false wrapper consent', 401)],
  driver: async (plan, observe) => withLifecycleStorage(observe, async () => {
    const f = await flow(), server = await authorizationServer(f.issuer, env);
    const authorization = await server.handler(new Request(f.authorize, { headers: { cookie: f.binding } })); observe('native authorization', authorization.status);
    const query = new URL(authorization.headers.get('location')!, f.base).search.slice(1);
    for (const origin of plan.origins) observe('hostile native consent', (await server.handler(new Request(f.issuer + '/oauth2/consent', { method: 'POST', headers: { cookie: f.binding, Origin: origin, 'Content-Type': 'application/json', 'cf-connecting-ip': '198.51.100.231' }, body: JSON.stringify({ accept: true, oauth_query: query }) }))).status);
    observe('false native credential', (await server.handler(new Request(f.issuer + '/oauth2/consent', { method: 'POST', headers: { cookie: 'better-auth.session_token=bogus', Origin: f.base, 'Content-Type': 'application/json', 'cf-connecting-ip': '198.51.100.232' }, body: JSON.stringify({ accept: true, oauth_query: query }) }))).status);
    const tampered = new URLSearchParams(query); tampered.set('scope', plan.forgedScope);
    observe('modified signed consent', (await server.handler(new Request(f.issuer + '/oauth2/consent', { method: 'POST', headers: { cookie: f.binding, Origin: f.base, 'Content-Type': 'application/json', 'cf-connecting-ip': '198.51.100.234' }, body: JSON.stringify({ accept: true, oauth_query: tampered.toString() }) }))).status);
    observe('false wrapper authorization', (await f.request(f.authorize, { headers: { cookie: 'blyg_session=bogus' } })).status);
    observe('false wrapper consent', (await f.request(f.issuer + '/consent', { method: 'POST', headers: { cookie: 'blyg_session=bogus' }, body: new URLSearchParams({ handle: f.handle, decision: 'allow' }) })).status);
  }), check: compare,
  calibrations: [{ name: 'forged consent scope accepted', law: 'native lifecycle authority', history: { enumerated: 0 }, corrupt: corruptStatus('modified signed consent') }],
});
const cutovers = [{ name: 'rejects a pending code and old access token after cookie-secret cutover', secretSuffix: '-lifecycle-rotation' }];
oracleProperty({
  id: 'auth-lifecycle-cutover', owns: ['src/auth.ts', 'src/oauth.ts#authorizationServer', 'src/oauth-routes.ts'],
  law: { statement: 'For every retained root-secret cutover, pending authorization codes and earlier access credentials lose receiving authority.', authority, limits },
  histories: cutovers, label: plan => plan.name, model: () => [fact('OAuth issuance', 200), fact('cutover exchange', 400), fact('cutover access', 401)],
  driver: async (plan, observe) => withLifecycleStorage(observe, async () => {
    const f = await issue(observe), pending = await flow(), approval = await pending.decide('browser-a', true);
    const code = new URL(approval.headers.get('location')!).searchParams.get('code')!, rotated = { ...env, COOKIE_SECRET: env.COOKIE_SECRET + plan.secretSuffix };
    observe('cutover exchange', (await withEnv(pending.issuer + '/oauth2/token', rotated, { method: 'POST', body: new URLSearchParams({ grant_type: 'authorization_code', code, client_id: pending.client.client_id, redirect_uri: pending.redirect, resource: pending.base + '/blyg/api', code_verifier: pending.verifier }) })).status);
    observe('cutover access', (await withEnv(f.base + '/blyg/api/settings', rotated, { headers: { Authorization: 'Bearer ' + f.tokens.access_token } })).status);
  }), check: compare,
  calibrations: [{ name: 'old access survives secret cutover', law: 'native lifecycle authority', history: { enumerated: 0 }, corrupt: corruptStatus('cutover access') }],
});
const accessDeadlines = [{ name: 'expires issued OAuth access at the exact one-hour JWT deadline', offsetsMs: [-1, 0] }];
oracleProperty({
  id: 'auth-lifecycle-access-expiry', owns: ['src/auth.ts', 'src/oauth.ts#authorizationServer', 'src/oauth-routes.ts'],
  law: { statement: 'For every retained access-deadline history, issuance advertises one hour and receiving access is usable just before its JWT deadline and denied at the deadline.', authority, limits },
  histories: accessDeadlines, label: plan => plan.name,
  model: plan => [fact('OAuth issuance', 200), fact('access lifetime', 3600), ...plan.offsetsMs.map(offset => fact('access deadline', offset < 0 ? 200 : 401))],
  driver: async (plan, observe) => withLifecycleStorage(observe, async () => {
    const f = await issue(observe), claims = JSON.parse(atob(f.tokens.access_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) as { exp: number };
    observe('access lifetime', f.tokens.expires_in); vi.useFakeTimers({ toFake: ['Date'] });
    try { for (const offset of plan.offsetsMs) { vi.setSystemTime(claims.exp * 1000 + offset); observe('access deadline', (await access(f)).status); } }
    finally { vi.useRealTimers(); }
  }), check: compare,
  calibrations: [{ name: 'access deadline is inclusive', law: 'native lifecycle authority', history: { enumerated: 0 }, corrupt: trace => trace.map(entry => entry.checkpoint === 'access deadline' && entry.value === 401 ? { ...entry, value: 200 } : entry) }],
});
const refreshDeadlines = [{ name: 'rejects refresh at the exact native 30-day deadline', offsetMs: 0 }];
oracleProperty({
  id: 'auth-lifecycle-refresh-expiry', owns: ['src/auth.ts', 'src/oauth.ts#authorizationServer', 'src/oauth-routes.ts'],
  law: { statement: 'For every retained native refresh-deadline history, a stored refresh expiry is present, finite and future, and refresh is denied exactly at expiry.', authority, limits },
  histories: refreshDeadlines, label: plan => plan.name,
  model: () => [fact('OAuth issuance', 200), fact('native refresh deadline', { rowPresent: true, finite: true, future: true }), fact('expired native refresh', 400)],
  driver: async (plan, observe) => withLifecycleStorage(observe, async () => {
    const f = await issue(observe), row = await env.DB.prepare('SELECT expiresAt FROM oauthRefreshToken WHERE clientId=?').bind(f.client.client_id).first<{ expiresAt: string | number }>();
    const expiry = row ? new Date(row.expiresAt).getTime() : NaN;
    observe('native refresh deadline', { rowPresent: row !== null, finite: Number.isFinite(expiry), future: expiry > Date.now() });
    vi.useFakeTimers({ toFake: ['Date'] });
    try { vi.setSystemTime(expiry + plan.offsetMs); observe('expired native refresh', (await refresh(f)).status); } finally { vi.useRealTimers(); }
  }), check: compare,
  calibrations: [{ name: 'native expiry accepts refresh', law: 'native lifecycle authority', history: { enumerated: 0 }, corrupt: corruptStatus('expired native refresh') }],
});
const origins = [{ name: 'retains the mounted request host as issuer rather than taking forwarded host', origins: ['https://installation-a.example.test', 'https://installation-b.example.test'], mount: '/blyg' }];
oracleProperty({
  id: 'auth-lifecycle-issuer', owns: ['src/auth.ts', 'src/oauth.ts#authorizationServer', 'src/oauth-routes.ts'],
  law: { statement: 'For every retained request-host history, discovery identifies the mounted request host and ignores forged forwarded host/protocol headers.', authority, limits },
  histories: origins, label: plan => plan.name, model: plan => plan.origins.map(origin => fact('request host issuer', origin + plan.mount + '/studio/auth')),
  driver: async (plan, observe) => withLifecycleStorage(observe, async () => { for (const origin of plan.origins) { const response = await withEnv(origin + plan.mount + '/studio/auth/.well-known/openid-configuration', env, { headers: { 'x-forwarded-host': 'attacker.example', 'x-forwarded-proto': 'http' } }); observe('request host issuer', (await response.json() as { issuer?: string }).issuer); } }), check: compare,
  calibrations: [{ name: 'issuer trusts forwarded host', law: 'native lifecycle authority', history: { enumerated: 0 }, corrupt: trace => trace.map(entry => entry.checkpoint === 'request host issuer' ? { ...entry, value: 'http://attacker.example/blyg/studio/auth' } : entry) }],
});
const schemas = [{ name: 'has the native deployed schema and rolls back a failed D1 batch', tables: ['user', 'session', 'account', 'verification', 'jwks', 'oauthClient', 'oauthResource', 'oauthClientResource', 'oauthRefreshToken', 'oauthAccessToken', 'oauthConsent', 'oauthClientAssertion', 'rateLimit', 'oauth_records', 'oauth_state', 'oauth_authorizations', 'oauth_revocations'], duplicate: 'one' }];
oracleProperty({
  id: 'auth-lifecycle-schema', owns: ['src/auth.ts', 'src/oauth.ts#authorizationServer', 'src/oauth-routes.ts'],
  law: { statement: 'For every retained native schema history, each declared table has columns and a duplicate-key D1 batch rejects atomically without retaining its new table.', authority, limits },
  histories: schemas, label: plan => plan.name,
  model: plan => [...plan.tables.map(table => fact('native schema', { table, hasColumns: true })), fact('native batch rollback', { rejected: true, table: null })],
  driver: async (plan, observe) => withLifecycleStorage(observe, async () => {
    for (const table of plan.tables) { const columns = await env.DB.prepare(`PRAGMA table_info("${table}")`).all(); observe('native schema', { table, hasColumns: columns.results.length > 0 }); }
    let rejected = false;
    try { await env.DB.batch([env.DB.prepare('CREATE TABLE auth_failed_migration_probe (id TEXT PRIMARY KEY)'), env.DB.prepare('INSERT INTO auth_failed_migration_probe VALUES (?)').bind(plan.duplicate), env.DB.prepare('INSERT INTO auth_failed_migration_probe VALUES (?)').bind(plan.duplicate)]); } catch { rejected = true; }
    observe('native batch rollback', { rejected, table: await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='auth_failed_migration_probe'").first() });
  }), check: compare,
  calibrations: [{ name: 'failed migration leaves partial table', law: 'native lifecycle authority', history: { enumerated: 0 }, corrupt: trace => trace.map(entry => entry.checkpoint === 'native batch rollback' ? { ...entry, value: { rejected: true, table: { name: 'auth_failed_migration_probe' } } } : entry) }],
});
type ConfigurationPlan = { name: string; missing: 'secret' | 'password'; password?: string };
const configurations: ConfigurationPlan[] = [{ name: 'fails closed instead of issuing an owner cookie with a missing wrapping secret', missing: 'secret' }, ...['', undefined].map(password => ({ name: 'fails closed with missing owner password ' + password, missing: 'password' as const, password }))];
oracleProperty({
  id: 'auth-lifecycle-configuration', owns: ['src/auth.ts', 'src/oauth.ts#authorizationServer', 'src/oauth-routes.ts'],
  law: { statement: 'For every retained missing-root-configuration history, owner login fails closed without a cookie; missing wrapping secret reports server failure.', authority, limits },
  histories: configurations, label: plan => plan.name,
  model: plan => ({ minimum: 400, ...(plan.missing === 'secret' ? { exact: 500 } : {}), cookiePresent: false }),
  driver: async (plan, observe) => withLifecycleStorage(observe, async () => {
    const current = { ...env, ...(plan.missing === 'secret' ? { COOKIE_SECRET: '' } : { OWNER_PASSWORD: plan.password }) } as Env;
    const response = await withEnv('https://' + (plan.missing === 'secret' ? 'missing-secret' : 'missing-owner') + '.example.test/blyg/studio/login', current, { method: 'POST', body: new URLSearchParams({ password: plan.missing === 'secret' ? env.OWNER_PASSWORD : '' }) });
    observe('missing root configuration', { status: response.status, cookiePresent: response.headers.get('set-cookie') !== null });
  }),
  check: (_plan, trace, expected) => {
    if (!trace.length) return pass;
    const actual = trace[0].value as { status?: number; cookiePresent?: boolean };
    return differs('missing root configuration', 'native lifecycle authority', { statusAllowed: typeof actual.status === 'number' && actual.status >= expected.minimum && (expected.exact === undefined || actual.status === expected.exact), cookiePresent: actual.cookiePresent }, { statusAllowed: true, cookiePresent: expected.cookiePresent })
      ?? (trace[1] ? differs('native lifecycle completion', 'native lifecycle authority', trace.slice(1), [fact('lifecycle complete', true)]) : undefined) ?? pass;
  },
  calibrations: [{ name: 'missing configuration creates owner cookie', law: 'native lifecycle authority', history: { enumerated: 0 }, corrupt: trace => trace.map(entry => entry.checkpoint === 'missing root configuration' ? { ...entry, value: { status: 500, cookiePresent: true } } : entry) }],
});
const offline = [{ name: 'keeps an offline refresh usable one second before its fixed thirty-day grant deadline', beforeSeconds: 2591999, deadlineSeconds: 2592000 }];
oracleProperty({
  id: 'auth-lifecycle-offline', owns: ['src/auth.ts', 'src/oauth.ts#authorizationServer', 'src/oauth-routes.ts'],
  law: { statement: 'For every retained offline-grant history, refresh one second before the fixed thirty-day deadline succeeds and its access is usable, while the same renewed grant loses access and refresh at the deadline.', authority, limits },
  histories: offline, label: plan => plan.name,
  model: plan => [fact('OAuth issuance', 200), fact('OAuth issuance', 200), fact('offline refresh before deadline', plan.beforeSeconds < plan.deadlineSeconds ? 200 : 400), fact('renewed access before deadline', plan.beforeSeconds < plan.deadlineSeconds ? 200 : 401), fact('renewed access at deadline', 401), fact('renewed refresh at deadline', 400)],
  driver: async (plan, observe) => withLifecycleStorage(observe, async () => {
    const now = Math.floor(Date.now() / 1000) * 1000; vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(now);
    try {
      const f = await issue(observe), nativeFlow = await issue(observe); vi.setSystemTime(now + plan.beforeSeconds * 1000);
      const response = await refresh(f);
      if (response.status === 500) {
        const server = await authorizationServer(nativeFlow.issuer, env);
        const native = await server.handler(new Request(nativeFlow.issuer + '/oauth2/token', { method: 'POST', headers: { 'cf-connecting-ip': '198.51.100.233' }, body: new URLSearchParams({ grant_type: 'refresh_token', client_id: nativeFlow.client.client_id, refresh_token: nativeFlow.tokens.refresh_token, resource: nativeFlow.base + '/blyg/api' }) }));
        const value = await native.json() as { access_token?: string };
        let rejected: { name?: string; status?: string; body?: { error?: string; error_description?: string } } | undefined;
        try { if (value.access_token) await server.api.delegatedAccess({ body: { token: value.access_token } }); } catch (error) { rejected = error as typeof rejected; }
        console.warn('offline-refresh diagnostic', JSON.stringify({ publicStatus: response.status, nativeStatus: native.status, name: rejected?.name, status: rejected?.status, error: rejected?.body?.error, description: rejected?.body?.error_description }));
      }
      observe('offline refresh before deadline', response.status);
      const renewed = await response.json() as { access_token: string; refresh_token: string };
      observe('renewed access before deadline', (await f.request('/blyg/api/settings', { headers: { Authorization: 'Bearer ' + renewed.access_token } })).status);
      vi.setSystemTime(now + plan.deadlineSeconds * 1000);
      observe('renewed access at deadline', (await f.request('/blyg/api/settings', { headers: { Authorization: 'Bearer ' + renewed.access_token } })).status);
      observe('renewed refresh at deadline', (await f.request(f.issuer + '/oauth2/token', { method: 'POST', body: new URLSearchParams({ grant_type: 'refresh_token', client_id: f.client.client_id, refresh_token: renewed.refresh_token, resource: f.base + '/blyg/api' }) })).status);
    } finally { vi.useRealTimers(); }
  }), check: compare,
  calibrations: [{ name: 'renewal extends the absolute grant', law: 'native lifecycle authority', history: { enumerated: 0 }, corrupt: corruptStatus('renewed access at deadline') }],
});
const verifiers = [undefined, '', 'b'.repeat(43)].map(verifier => ({ verifier }));
oracleProperty({
  id: 'auth-lifecycle-verifier', owns: ['src/auth.ts', 'src/oauth.ts#authorizationServer', 'src/oauth-routes.ts'],
  law: { statement: 'For every retained missing, empty or wrong syntactically valid PKCE verifier, code exchange is denied with an error and without access-token material.', authority: authority + '; RFC7636 §4.6', limits },
  histories: verifiers, label: plan => 'rejects omitted, empty or grammatically valid wrong verifier ' + plan.verifier,
  model: () => [fact('PKCE exchange', { status: 400, tokenAbsent: true, errorPresent: true })],
  driver: async (plan, observe) => withLifecycleStorage(observe, async () => {
    const f = await flow(), approval = await f.decide('browser-a', true), code = new URL(approval.headers.get('location')!).searchParams.get('code')!;
    const form = new URLSearchParams({ grant_type: 'authorization_code', code, client_id: f.client.client_id, redirect_uri: f.redirect, resource: f.base + '/blyg/api' }); if (plan.verifier !== undefined) form.set('code_verifier', plan.verifier);
    const response = await f.request(f.issuer + '/oauth2/token', { method: 'POST', body: form }), value = await response.json() as { access_token?: string; error?: string };
    observe('PKCE exchange', { status: response.status, tokenAbsent: value.access_token === undefined, errorPresent: Boolean(value.error) });
  }), check: compare,
  calibrations: [{ name: 'wrong verifier receives access token', law: 'native lifecycle authority', history: { enumerated: 0 }, corrupt: trace => trace.map(entry => entry.checkpoint === 'PKCE exchange' ? { ...entry, value: { status: 200, tokenAbsent: false, errorPresent: false } } : entry) }],
});
