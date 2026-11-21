/** Password reset invalidates owner sessions and preserves delegated authority.
 * The receiving boundaries are owner mint/list routes, REST/MCP reads, OAuth
 * refresh and noninteractive authorization after the environment cutover.
 *
 * ```ts
 * POST /api/authorizations // → 401 with an owner cookie from before reset
 * GET /api/settings // → 200 with an existing delegated read token after reset
 * POST /oauth2/token // → successor within the original grant deadline
 * GET /oauth2/authorize?prompt=none // → login_required with the stale browser
 * ```
 * Why does a password reset leave a client token usable? Decision #31 separates
 * owner-session invalidation from delegated revocation, and requires explicit
 * revoke-all. docs/client-access.md and docs/auth-oracles.md record that policy;
 * OIDC Core §3.1.2.1 requires login_required for the stale browser's silent request.
 * https://openid.net/specs/openid-connect-core-1_0.html#AuthRequest
 *
 * The independent model treats password epoch, grant revocation and fresh login
 * as separate facts. The finite histories retain all four original credential
 * forms and the native refresh's one-minute clock advance. Drivers call makeApp
 * and native provider routes, recording response decisions and grant invariance.
 * Opaque grant identity/deadline equality is a relation, not a captured expected
 * token or clock value. Configuration propagation across deployed isolates is
 * outside this local binding-cutover boundary.
 */
import { differs, oracleProperty, pass, type Observation } from '@tanstack/oracles';
import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { vi } from 'vitest';
import { makeApp } from '../src/index.ts';
import { flow } from './oauth-flow-driver.ts';
import { withOracleStorage } from './oracle-storage.ts';

type Plan = { name: string; credential: 'owner-cookie' | 'manual-api-mcp' | 'native-tokens' | 'native-browser'; advanceMs: number };
const histories: Plan[] = [
  { name: 'cannot use an old owner cookie to mint fresh grants after resetting the root password', credential: 'owner-cookie', advanceMs: 0 },
  { name: 'preserves API and MCP grants after password reset and lists them for explicit revoke-all', credential: 'manual-api-mcp', advanceMs: 0 },
  { name: 'preserves native OAuth access and refresh credentials across password reset', credential: 'native-tokens', advanceMs: 60_000 },
  { name: 'does not let stale native browser cookies authorize silently after password reset', credential: 'native-browser', advanceMs: 0 },
];
// Password changes make an old owner session stale; they never revoke a grant.
// Only explicit revoke-all changes the next delegated receiving decision.
const ownerStatus = (fresh: boolean) => fresh ? 200 : 401;
const grantStatus = (revoked: boolean) => revoked ? 401 : 200;
function model(plan: Plan): Observation[] {
  const trace: Observation[] = [];
  const add = (checkpoint: string, value: unknown) => trace.push({ checkpoint, value });
  switch (plan.credential) {
    case 'owner-cookie':
      add('owner login', 302); add('old owner mint', { status: ownerStatus(false), accessToken: false });
      add('owner login', 302); add('fresh owner read', ownerStatus(true)); break;
    case 'manual-api-mcp':
      add('owner login', 302);
      for (const _resource of ['api', 'mcp']) add('manual grant issuance', grantStatus(false));
      for (const _resource of ['api', 'mcp']) add('delegated access after password reset', grantStatus(false));
      add('old owner listing', ownerStatus(false)); add('owner login', 302);
      for (const _resource of ['api', 'mcp']) add('listed grant invariance', true);
      add('owner revoke-all', ownerStatus(true));
      for (const _resource of ['api', 'mcp']) add('delegated access after revoke-all', grantStatus(true)); break;
    case 'native-tokens':
      add('native approval', 302); add('native issuance', grantStatus(false));
      add('native access after password reset', grantStatus(false)); add('native refresh after password reset', grantStatus(false));
      add('successor access after password reset', grantStatus(false)); add('owner login', 302);
      add('listed grant invariance', true); add('owner revoke-all', ownerStatus(true));
      for (const _token of ['original', 'successor']) add('delegated access after revoke-all', grantStatus(true)); break;
    case 'native-browser':
      add('native approval', 302); add('silent authorization before password reset', true);
      add('silent authorization after password reset', { status: 302, code: null, error: 'login_required' }); break;
  }
  return trace;
}
function sameFields(actual: Record<string, unknown> | undefined, original: Record<string, unknown>) {
  return actual !== undefined && Object.keys(original).every(key => JSON.stringify(actual[key]) === JSON.stringify(original[key]));
}
async function driver(plan: Plan, observe: (checkpoint: string, value: unknown) => void) {
  await withOracleStorage(async () => {
    if (plan.credential === 'owner-cookie' || plan.credential === 'manual-api-mcp') {
      const app = makeApp('/blyg'), base = plan.credential === 'owner-cookie' ? 'https://owner-reset.example.test' : 'https://reset-client-grants.example.test';
      const request = async (path: string, bindings: typeof env, init: RequestInit = {}) => {
        const ctx = createExecutionContext(), headers = new Headers(init.headers);
        headers.set('CF-Connecting-IP', plan.credential === 'owner-cookie' ? '198.51.100.234' : '198.51.100.235');
        const response = await app.fetch(new Request(base + path, { ...init, headers }), bindings, ctx);
        await waitOnExecutionContext(ctx); return response;
      };
      const login = async (bindings: typeof env) => {
        const response = await request('/blyg/studio/login', bindings, { method: 'POST', body: new URLSearchParams({ password: bindings.OWNER_PASSWORD }) });
        observe('owner login', response.status); return response.headers.get('set-cookie')!.split(';')[0];
      };
      const cookie = await login(env), changed = { ...env, OWNER_PASSWORD: env.OWNER_PASSWORD + '-reset' };
      if (plan.credential === 'owner-cookie') {
        const mint = await request('/blyg/api/authorizations', changed, { method: 'POST', headers: { cookie, 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'old browser', scope: ['owner:read'], resource: 'api' }) });
        observe('old owner mint', { status: mint.status, accessToken: Object.hasOwn(await mint.json() as object, 'accessToken') });
        const fresh = await login(changed);
        observe('fresh owner read', (await request('/blyg/api/settings', changed, { headers: { cookie: fresh } })).status);
      } else {
        const grants: { resource: string; accessToken: string; authorization: { id: string; expiresAt: number; scope: string[] } }[] = [];
        for (const resource of ['api', 'mcp']) {
          const response = await request('/blyg/api/authorizations', env, { method: 'POST', headers: { cookie, 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'reset-' + resource, scope: ['owner:read'], resource }) });
          observe('manual grant issuance', response.status); grants.push({ resource, ...await response.json() as Omit<typeof grants[number], 'resource'> });
        }
        const read = (grant: typeof grants[number]) => request(grant.resource === 'api' ? '/blyg/api/settings' : '/blyg/studio/mcp', changed, grant.resource === 'api'
          ? { headers: { Authorization: 'Bearer ' + grant.accessToken } }
          : { method: 'POST', headers: { Authorization: 'Bearer ' + grant.accessToken, 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', 'mcp-protocol-version': '2026-07-28', 'mcp-method': 'tools/list' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: { _meta: { 'io.modelcontextprotocol/protocolVersion': '2026-07-28', 'io.modelcontextprotocol/clientCapabilities': {} } } }) });
        for (const grant of grants) observe('delegated access after password reset', (await read(grant)).status);
        observe('old owner listing', (await request('/blyg/api/authorizations', changed, { headers: { cookie } })).status);
        const fresh = await login(changed);
        const listing = await (await request('/blyg/api/authorizations', changed, { headers: { cookie: fresh } })).json() as { items: typeof grants[number]['authorization'][] };
        for (const grant of grants) observe('listed grant invariance', sameFields(listing.items.find(item => item.id === grant.authorization.id), grant.authorization));
        observe('owner revoke-all', (await request('/blyg/api/authorizations', changed, { method: 'DELETE', headers: { cookie: fresh } })).status);
        for (const grant of grants) observe('delegated access after revoke-all', (await read(grant)).status);
      }
      return;
    }
    const f = await flow(), approved = await f.decide('browser-a', true);
    observe('native approval', approved.status);
    const changed = { ...env, OWNER_PASSWORD: env.OWNER_PASSWORD + '-reset' };
    if (plan.credential === 'native-browser') {
      const url = new URL(f.authorize); url.searchParams.set('prompt', 'none');
      const cookie = f.owner + '; ' + f.binding;
      const before = await f.request(url.href, { headers: { cookie } });
      observe('silent authorization before password reset', Boolean(new URL(before.headers.get('location')!).searchParams.get('code')));
      const response = await f.request(url.href, { headers: { cookie } }, changed);
      const result = new URL(response.headers.get('location')!).searchParams;
      const code = result.get('code');
      observe('silent authorization after password reset', { status: response.status, code: code === null ? null : code ? 'present' : '', error: result.get('error') }); return;
    }
    const issued = await f.token(new URL(approved.headers.get('location')!).searchParams.get('code')!);
    observe('native issuance', issued.status);
    const original = await issued.json() as { access_token: string; refresh_token: string };
    const before = await (await f.request('/blyg/api/authorizations', { headers: { cookie: f.owner } })).json() as { items: { id: string; clientId: string; expiresAt: number }[] };
    const grant = before.items.find(value => value.clientId === f.client.client_id)!;
    const resetAt = Date.now() + plan.advanceMs, clock = vi.spyOn(Date, 'now').mockImplementation(() => resetAt);
    try {
      observe('native access after password reset', (await f.request('/blyg/api/settings', { headers: { Authorization: 'Bearer ' + original.access_token } }, changed)).status);
      const refreshed = await f.request(f.issuer + '/oauth2/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: original.refresh_token, client_id: f.client.client_id, resource: f.base + '/blyg/api' }) }, changed);
      observe('native refresh after password reset', refreshed.status);
      const successor = await refreshed.json() as { access_token: string };
      observe('successor access after password reset', (await f.request('/blyg/api/settings', { headers: { Authorization: 'Bearer ' + successor.access_token } }, changed)).status);
      const loggedIn = await f.request('/blyg/studio/login', { method: 'POST', body: new URLSearchParams({ password: changed.OWNER_PASSWORD }) }, changed);
      observe('owner login', loggedIn.status);
      const cookie = loggedIn.headers.get('set-cookie')!.split(';')[0];
      const after = await (await f.request('/blyg/api/authorizations', { headers: { cookie } }, changed)).json() as typeof before;
      observe('listed grant invariance', sameFields(after.items.find(value => value.id === grant.id), grant));
      observe('owner revoke-all', (await f.request('/blyg/api/authorizations', { method: 'DELETE', headers: { cookie } }, changed)).status);
      for (const token of [original.access_token, successor.access_token]) observe('delegated access after revoke-all', (await f.request('/blyg/api/settings', { headers: { Authorization: 'Bearer ' + token } }, changed)).status);
    } finally { clock.mockRestore(); }
  });
  observe('password cutover complete', true);
}
oracleProperty({
  id: 'owner-reset', owns: ['src/auth.ts', 'src/oauth.ts', 'src/authorization-api.ts', 'src/oauth-routes.ts#oauthRoutes'],
  law: { statement: 'For every password-only cutover, stale owner and native browser sessions lose delegation authority, delegated API/MCP access and refresh retain their existing grant and deadline, and explicit revoke-all denies that surviving authority.', authority: 'Decision #31; docs/client-access.md; docs/auth-oracles.md Password sessions and delegated authority; OIDC Core §3.1.2.1', limits: 'The four original local binding-cutover histories, including native refresh after one minute; no distributed secret-propagation guarantee.' },
  histories, label: plan => plan.name, model, driver,
  check: (_plan, trace, expected) => {
    const entries = trace.filter(entry => entry.checkpoint !== 'password cutover complete');
    for (let index = 0; index < entries.length; index++) { const result = differs(entries[index].checkpoint, 'password sessions and delegated authority', entries[index], expected[index]); if (result) return result; }
    return trace.some(entry => entry.checkpoint === 'password cutover complete') ? differs('password cutover completeness', 'password sessions and delegated authority', entries.length, expected.length) ?? pass : pass;
  },
  calibrations: [{ name: 'stale owner mints a grant', law: 'password sessions and delegated authority', history: { enumerated: 0 }, corrupt: trace => trace.map(entry => entry.checkpoint === 'old owner mint' ? { ...entry, value: { status: 200, accessToken: true } } : entry) }],
});
