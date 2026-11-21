/**
 * Mounted issuers remain usable by an independent OAuth/MCP client when host-root
 * discovery is absent. This owns the provider-integration fixture's discovery,
 * authorization, credential verification, refresh and disabled-client boundary.
 *
 * ```ts
 * auth(provider, mountedResource) // → REDIRECT, then AUTHORIZED after consent
 * verifyIdToken(token) // → owner identity at the mounted issuer and client
 * listTools(readCredential) // → read tools without drafting or publication
 * introspect(token) // → inactive after client disable
 * ```
 * A correct discovery document cannot prove that a client can use its URLs. Each
 * mount therefore completes the same native consent/exchange and real MCP walk.
 * For every retained mount, issuer-relative endpoints and client-bound credentials
 * preserve owner identity, resource and read-only authority through refresh, while
 * disabled clients lose access and host-root discovery falls back to the issuer.
 * OIDC Discovery §4, RFC9728 §5.1 and the existing integration contract supply these
 * laws. RFC9728 §3 host-root publication remains unresolved by this fixture.
 *
 * Plans carry only the mount. The pure model derives mounted paths and the native
 * lifecycle's public facts. The driver records those facts at response/verification
 * checkpoints; random credentials are represented by presence and identity
 * relations. The check compares the complete ordered trace to the same model for
 * root, one-level and nested mounts. No per-mount expected answers occur in plans.
 * Limits: createBetterAuthDriver substitutes the owner bridge/introspection seams;
 * mcp.oracle.test.ts owns production forwarding. One official client is not all
 * clients, and no deployed proxy or full OIDC profile claim is made.
 */
import { differs, oracleProperty, pass, type Observation } from '@tanstack/oracles';
import { Client, StreamableHTTPClientTransport, auth, type OAuthClientProvider, type OAuthTokens, type OAuthClientInformation, type OAuthDiscoveryState } from '@modelcontextprotocol/client';
import { createBetterAuthDriver } from './better-auth-driver.ts';
import { withOracleCleanup } from './oracle-cleanup.ts';
import { withOracleStorage } from './oracle-storage.ts';
type Plan = { mount: string };
const plans: Plan[] = ['', '/blyg', '/nested/blyg'].map(mount => ({ mount }));
// Only installation input determines endpoints. Native lifecycle phases determine
// acceptance, refresh rotation and disabled-client denial; token bytes are free.
function model(plan: Plan): Observation[] {
  return [
    { checkpoint: 'mounted discovery', value: { status: 200, issuerMounted: true, publicSubject: true, rs256: true, s256: true, endpointsMounted: [true, true, true, true] } },
    { checkpoint: 'owner session admission', value: { missing: 401, hostileOrigin: 403, valid: 200, cookiePresent: true } },
    { checkpoint: 'official client authorization start', value: { result: 'REDIRECT', redirectPresent: true } },
    { checkpoint: 'native consent redirect', value: { status: 302, path: plan.mount + '/studio/consent' } },
    { checkpoint: 'native consent acceptance', value: { status: 200, state: 'oracle-state' } },
    { checkpoint: 'official client authorization complete', value: { result: 'AUTHORIZED', accessPresent: true, refreshPresent: true } },
    { checkpoint: 'verified owner claims', value: { issuerMounted: true, audienceClient: true, subject: 'owner' } },
    { checkpoint: 'wrong resource verification', value: { rejected: true } },
    { checkpoint: 'tampered identity verification', value: { rejected: true } },
    { checkpoint: 'verified delegated claims', value: { subject: 'owner', readScope: true, audienceResource: true } },
    { checkpoint: 'initial introspection', value: { active: true } },
    { checkpoint: 'read-only MCP authority', value: { read: true, draft: false, publish: false, error: false, titleDefined: true } },
    { checkpoint: 'native refresh', value: { status: 200, refreshPresent: true, refreshChanged: true } },
    { checkpoint: 'renewed introspection', value: { status: 200, active: true, subject: 'owner' } },
    { checkpoint: 'native refresh revoke', value: 200 },
    { checkpoint: 'disabled introspection', value: { status: 200, active: false } },
    { checkpoint: 'disabled resource request', value: 401 },
    { checkpoint: 'disabled refresh request', value: 400 },
    { checkpoint: 'issuer discovery fallback', value: [
      { path: '/.well-known/oauth-authorization-server' + plan.mount + '/studio/auth', status: 404 },
      { path: '/.well-known/openid-configuration' + plan.mount + '/studio/auth', status: 404 },
      { path: plan.mount + '/studio/auth/.well-known/openid-configuration', status: 200 },
    ] },
  ];
}
// Catch only the promised credential-verifier calls whose rejection is itself
// public behavior. Fixture creation, parsing and cleanup errors retain their cause.
async function rejection(operation: () => Promise<unknown>) {
  try { await operation(); return { rejected: false }; }
  catch { return { rejected: true }; }
}
async function driver(plan: Plan, observe: (checkpoint: string, value: unknown) => void) {
  await withOracleStorage(async () => {
    const d = await createBetterAuthDriver(plan.mount), issuer = d.base + plan.mount + '/studio/auth';
    const response = await d.fetch(issuer + '/.well-known/openid-configuration');
    const metadata = await response.json() as Record<string, any>;
    observe('mounted discovery', { status: response.status, issuerMounted: metadata.issuer === issuer, publicSubject: metadata.subject_types_supported?.includes('public'), rs256: metadata.id_token_signing_alg_values_supported?.includes('RS256'), s256: metadata.code_challenge_methods_supported?.includes('S256'), endpointsMounted: ['authorization_endpoint', 'token_endpoint', 'registration_endpoint', 'jwks_uri'].map(key => typeof metadata[key] === 'string' && metadata[key].startsWith(issuer + '/')) });
    const missing = await d.fetch(issuer + '/owner-session', { method: 'POST', headers: { Origin: d.base } });
    const hostile = await d.fetch(issuer + '/owner-session', { method: 'POST', headers: { cookie: d.ownerCookie, Origin: 'https://evil.example' } });
    const session = await d.fetch(issuer + '/owner-session', { method: 'POST', headers: { cookie: d.ownerCookie, Origin: d.base } });
    const cookie = session.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
    observe('owner session admission', { missing: missing.status, hostileOrigin: hostile.status, valid: session.status, cookiePresent: cookie !== '' });
    let tokens: OAuthTokens | undefined, client: OAuthClientInformation | undefined, verifier = '', redirect: URL | undefined, discovery: OAuthDiscoveryState | undefined;
    const provider: OAuthClientProvider = {
      redirectUrl: 'https://client.example/callback', clientMetadata: { redirect_uris: ['https://client.example/callback'], client_name: 'mounted oracle', token_endpoint_auth_method: 'none', grant_types: ['authorization_code', 'refresh_token'], response_types: ['code'], scope: 'openid offline_access owner:read' },
      state: () => 'oracle-state', clientInformation: () => client, saveClientInformation: value => { client = value; },
      tokens: () => tokens, saveTokens: value => { tokens = value; }, codeVerifier: () => verifier, saveCodeVerifier: value => { verifier = value; },
      redirectToAuthorization: value => { redirect = value; }, discoveryState: () => discovery, saveDiscoveryState: value => { discovery = value; },
    };
    const options = { serverUrl: d.resource, resourceMetadataUrl: new URL(issuer + '/resources/mcp'), fetchFn: d.fetch, scope: 'openid offline_access owner:read' };
    const start = await auth(provider, options);
    observe('official client authorization start', { result: start, redirectPresent: redirect !== undefined });
    const consent = await d.fetch(redirect!, { headers: { cookie } });
    const consentURL = new URL(consent.headers.get('location')!, d.base);
    observe('native consent redirect', { status: consent.status, path: consentURL.pathname });
    const accepted = await d.fetch(issuer + '/oauth2/consent', { method: 'POST', headers: { cookie, Origin: d.base, 'Content-Type': 'application/json' }, body: JSON.stringify({ accept: true, oauth_query: consentURL.search.slice(1) }) });
    const callback = new URL((await accepted.json() as { url: string }).url);
    observe('native consent acceptance', { status: accepted.status, state: callback.searchParams.get('state') });
    const complete = await auth(provider, { ...options, authorizationCode: callback.searchParams.get('code')!, iss: callback.searchParams.get('iss')! });
    observe('official client authorization complete', { result: complete, accessPresent: Boolean(tokens?.access_token), refreshPresent: Boolean(tokens?.refresh_token) });
    const idToken = (tokens as OAuthTokens & { id_token: string }).id_token;
    const claims = await d.verifyIdToken(idToken);
    observe('verified owner claims', { issuerMounted: claims.iss === issuer, audienceClient: claims.aud === client!.client_id, subject: claims.sub });
    const access = await d.verifyAccess(tokens!.access_token);
    observe('wrong resource verification', await rejection(() => d.verifyAccess(tokens!.access_token, 'https://wrong-resource.example')));
    const tampered = idToken.split('.'); tampered[2] = (tampered[2][0] === 'A' ? 'B' : 'A') + tampered[2].slice(1);
    observe('tampered identity verification', await rejection(() => d.verifyIdToken(tampered.join('.'))));
    observe('verified delegated claims', { subject: access.sub, readScope: typeof access.scope === 'string' && access.scope.includes('owner:read'), audienceResource: (Array.isArray(access.aud) ? access.aud : [access.aud]).includes(d.resource) });
    const initial = await (await d.introspect(tokens!.access_token, cookie)).json() as { active?: boolean };
    observe('initial introspection', { active: initial.active });
    const mcp = new Client({ name: 'mounted oracle', version: '1' });
    await withOracleCleanup(async () => {
      await mcp.connect(new StreamableHTTPClientTransport(new URL(d.resource), { fetch: d.fetch, authProvider: provider }));
      const names = (await mcp.listTools()).tools.map(tool => tool.name), result = await mcp.callTool({ name: 'getSettings', arguments: {} });
      observe('read-only MCP authority', { read: names.includes('getSettings'), draft: names.includes('createItem'), publish: names.includes('publishItem'), error: result.isError === true, titleDefined: JSON.parse((result.content as { text: string }[])[0].text).siteTitle !== undefined });
    }, [() => mcp.close()]);
    const post = (endpoint: string, fields: Record<string, string>) => d.fetch(issuer + endpoint, { method: 'POST', body: new URLSearchParams(fields) });
    const refresh = await post('/oauth2/token', { grant_type: 'refresh_token', client_id: client!.client_id, refresh_token: tokens!.refresh_token!, resource: d.resource });
    const renewed = await refresh.json() as { access_token: string; refresh_token: string };
    observe('native refresh', { status: refresh.status, refreshPresent: Boolean(renewed.refresh_token), refreshChanged: renewed.refresh_token !== tokens!.refresh_token });
    const live = await d.introspect(renewed.access_token, cookie), liveBody = await live.json() as { active?: boolean; sub?: string };
    observe('renewed introspection', { status: live.status, active: liveBody.active, subject: liveBody.sub });
    observe('native refresh revoke', (await post('/oauth2/revoke', { client_id: client!.client_id, token: renewed.refresh_token, token_type_hint: 'refresh_token' })).status);
    await d.disableClient(client!.client_id, cookie);
    const dead = await d.introspect(renewed.access_token, cookie), deadBody = await dead.json() as { active?: boolean };
    observe('disabled introspection', { status: dead.status, active: deadBody.active });
    observe('disabled resource request', (await d.fetch(d.resource, { method: 'POST', headers: { Authorization: 'Bearer ' + renewed.access_token } })).status);
    observe('disabled refresh request', (await post('/oauth2/token', { grant_type: 'refresh_token', client_id: client!.client_id, refresh_token: renewed.refresh_token, resource: d.resource })).status);
    const paths = ['/.well-known/oauth-authorization-server' + plan.mount + '/studio/auth', '/.well-known/openid-configuration' + plan.mount + '/studio/auth', plan.mount + '/studio/auth/.well-known/openid-configuration'];
    observe('issuer discovery fallback', paths.map(path => d.log.find(entry => entry.path === path)));
  });
  observe('mounted lifecycle complete', true);
}
oracleProperty({
  id: 'better-auth', owns: ['src/oauth.ts#authorizationServer'],
  law: { statement: 'For every retained mount, an official OAuth/MCP client can discover the issuer, complete owner consent, verify owner/client/resource-bound credentials, use only granted read tools, rotate refresh credentials and observe client-disable denial through issuer-relative discovery fallback.', authority: 'Existing better-auth integration laws; OIDC Discovery §4; RFC9728 §5.1; docs/auth-oracles.md', limits: 'Root, one-level and nested fixture mounts; fixture owner bridge/introspection seams; one official client, not production forwarding, all clients or host-root metadata publication.' },
  histories: plans, label: plan => 'discovers and issues verifiable owner credentials at ' + plan.mount, model, driver,
  check: (_plan, trace, expected) => {
    for (let index = 0; index < trace.length; index++) {
      const entry = trace[index];
      const result = entry.checkpoint === 'mounted lifecycle complete'
        ? differs('mounted client completion', 'mounted owner credentials', { index, value: entry.value }, { index: expected.length, value: true })
        : differs(entry.checkpoint, 'mounted owner credentials', entry, expected[index]);
      if (result) return result;
    }
    return pass;
  },
  calibrations: [{ name: 'read credential exposes publication', law: 'mounted owner credentials', history: { enumerated: 0 }, corrupt: trace => trace.map(entry => entry.checkpoint === 'read-only MCP authority' ? { ...entry, value: { ...(entry.value as object), publish: true } } : entry) }],
});
