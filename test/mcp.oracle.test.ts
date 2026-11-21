/**
 * MCP exposes only the capabilities a grant permits, and it preserves REST values.
 * Discovery alone cannot prove that a forbidden tool call is denied. It owns
 * src/mcp.ts at completed HTTP replies, SDK calls and public publication reads.
 *
 * ```ts
 * tools/list({scope: ['owner:read']}) // → exactly the read tools and capabilities
 * tools/call('publishItem', {scope: ['owner:draft']}) // → insufficient_scope
 * tools/call('getSettings', {resource: '/api'}) // → 401 at MCP
 * tools/call('getItem', {id}) // → the same item values as REST
 * ```
 *
 * Contract: decision #52 selects four independent owner scopes and API/MCP audience
 * separation. MCP authorization requires token audience validation and forbids token
 * passthrough; transport specifies receiving Origin and protocol handling:
 * https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization
 * https://modelcontextprotocol.io/specification/2025-11-25/basic/transports
 * RFC8707 §2 explains resource binding; RFC6750 §3 defines scope challenges:
 * https://www.rfc-editor.org/rfc/rfc8707.html#section-2
 * https://www.rfc-editor.org/rfc/rfc6750.html#section-3
 * Model: mcp-receiving-reference.ts predicts receiving responses from semantic
 * boundary, mount and wire-version inputs; its literal scope union imports no
 * production route inventory or scope classifier. Relational checks compare REST
 * and MCP projections while preserving publication and provenance facts.
 * History grammar: all 31 nonempty scope subsets, create/read/publish, hostile Origin,
 * audience/deadline neighbors and native request/header/version classifications.
 * Driver: official MCP client against makeApp and real provider-issued credentials.
 * Refinement: exact sorted tool inventory, operation challenges, response values and
 * public projections after awaited operations. Cleanup must preserve a primary fault.
 * Limits: bounded capability enumeration does not exhaust arbitrary tool arguments,
 * all clients, browser transport or metadata publication. Host-root discovery remains
 * deferred; mounted interop is a receiving witness, not full standards certification.
 */
import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { Client, StreamableHTTPClientTransport, type OAuthClientProvider, type OAuthTokens, type OAuthClientInformation, type OAuthDiscoveryState } from '@modelcontextprotocol/client';
import { vi } from 'vitest';
import { makeApp } from '../src/index.ts';
import { AsyncLocalStorage } from 'node:async_hooks';
import { equals, iterableEquality } from '@vitest/expect';
import { differs, oracleProperty, pass } from '@tanstack/oracles';
import { withOracleStorage } from './oracle-storage.ts';
import { mcpReference, type McpPlan, checkMcpObservation } from './mcp-receiving-reference.ts';
import { toolOutcome } from './mcp-tool-outcome.ts';
const active = new AsyncLocalStorage<(checkpoint: string, value: unknown) => void>();
function record(checkpoint: string, value: unknown) { const observe = active.getStore(); if (!observe) throw new Error('MCP observation outside its driver'); observe(checkpoint, value); }
function sameProjection(left: unknown, right: unknown) { return equals(left, right, [iterableEquality]); }
import { flow } from './oauth-flow-driver.ts';
import { withOracleCleanup } from './oracle-cleanup.ts';

import { all } from './mcp-oracle-model.ts';
async function createDriver(mount = '/blyg') {
  const base = 'https://mcp-oracle.example.test', app = makeApp(mount), currentEnv = { ...env, MOUNT: mount };
  const edgeIP = '2001:db8:' + crypto.randomUUID().replaceAll('-', '').match(/.{4}/g)!.slice(0, 6).join(':');
  const log: { path: string; status: number }[] = [];
  const fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init), ctx = createExecutionContext();
    request.headers.set('CF-Connecting-IP', edgeIP);
    const response = await app.fetch(request, currentEnv, ctx); await waitOnExecutionContext(ctx);
    log.push({ path: new URL(request.url).pathname, status: response.status }); return response;
  };
  const login = await fetch(base + mount + '/studio/login', { method: 'POST', body: new URLSearchParams({ password: env.OWNER_PASSWORD }) });
  record("owner login", login.status);
  const cookie = login.headers.get('set-cookie')!.split(';')[0];
  const owner = (path: string, method = 'GET', body?: unknown) => fetch(base + path, { method, headers: { cookie, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const manual = async (scope: string[]) => {
    const response = await owner(mount + '/api/authorizations', 'POST', { name: 'MCP oracle', scope, resource: 'mcp' });
    record("manual MCP issuance", response.status); return await response.json() as { accessToken: string; authorization: { id: string } };
  };
  const connect = async (token: string) => {
    const client = new Client({ name: 'oracle', version: '1' });
    await client.connect(new StreamableHTTPClientTransport(new URL(base + mount + '/studio/mcp'), { fetch, authProvider: { token: async () => token } }));
    return client;
  };
  return { base, mount, fetch, owner, manual, connect, log, cookie };
}
async function rawMcp(d: Awaited<ReturnType<typeof createDriver>>, token: string | undefined, method = 'tools/call', params: Record<string, unknown> = { name: 'getSettings', arguments: {} }, headers: Record<string, string> = {}, version = '2026-07-28', omitHeaders: string[] = []) {
  const request = new Request(d.base + d.mount + '/studio/mcp', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', ...(token === undefined ? {} : { Authorization: 'Bearer ' + token }), 'mcp-protocol-version': version, 'mcp-method': method, ...(typeof params.name === 'string' ? { 'mcp-name': params.name } : {}), ...headers },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params: { ...params, _meta: { 'io.modelcontextprotocol/protocolVersion': version, 'io.modelcontextprotocol/clientCapabilities': {} } } }),
  });
  for (const header of omitHeaders) request.headers.delete(header);
  return d.fetch(request);
}
function content(result: unknown) {
  const value = result as { content: { type: string; text?: string }[]; isError?: boolean };
  record("MCP tool error flag", value.isError);
  return JSON.parse(value.content[0].text!) as Record<string, any>;
}
async function runConfidentialOauth(plan: McpPlan) {
  const mount = plan.mount!;

    const d = await createDriver(mount), issuer = d.base + mount + '/studio/auth';
    const redirect = 'https://oauth-callbacks.cloudflareaccess.com/cdn-cgi/access/outbound-oauth-callback';
    const scope = 'openid offline_access owner:read owner:draft owner:publish owner:manage';
    const registered = await d.fetch(issuer + '/oauth2/register', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_name: 'Cloudflare MCP Portal', redirect_uris: [redirect], token_endpoint_auth_method: 'client_secret_basic', grant_types: ['authorization_code', 'refresh_token'], response_types: ['code'], scope }),
    });
    record("confidential registration", registered.status);
    const information = await registered.json() as { client_id: string; client_secret: string; token_endpoint_auth_method: string };
    record("confidential token authentication", information.token_endpoint_auth_method);
    record("confidential client secret presence", Boolean(information.client_secret));
    const verifier = 'cloudflare-fixture-verifier-at-least-forty-three-characters';
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
    const challenge = btoa(String.fromCharCode(...new Uint8Array(digest))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    // A generic OAuth proxy may omit resource indicators. The authorization
    // server must apply its MCP default before the owner approves the grant.
    const authorize = issuer + '/oauth2/authorize?' + new URLSearchParams({ client_id: information.client_id, response_type: 'code', redirect_uri: redirect, state: 'portal-state', scope, code_challenge_method: 'S256', code_challenge: challenge });
    const login = await d.fetch(authorize);
    record("OAuth login redirect", login.status);
    const continuation = new URL(new URL(login.headers.get('location')!).searchParams.get('return_to')!, d.base);
    record("default MCP resource", continuation.searchParams.get('resource'));
    const consent = await d.fetch(authorize, { headers: { cookie: d.cookie } });
    record("OAuth consent", consent.status);
    const html = await consent.text(), handle = html.match(/name="handle" value="([^"]+)"/)![1];
    record("consent resource disclosure", html.includes('Resource: <code>' + d.base + mount + '/studio/mcp</code>'));
    const binding = consent.headers.getSetCookie().map(cookie => cookie.split(';')[0]).join('; ');
    const approval = await d.fetch(issuer + '/consent', {
      method: 'POST', headers: { cookie: d.cookie + '; ' + binding, Origin: d.base },
      body: new URLSearchParams([['handle', handle], ['decision', 'allow'], ...[...html.matchAll(/name="scope" value="([^"]+)"/g)].map(match => ['scope', match[1]])]),
    });
    record("OAuth consent decision", approval.status);
    const callback = new URL(approval.headers.get('location')!);
    record("OAuth callback destination", callback.origin + callback.pathname);
    record("OAuth callback state", callback.searchParams.get('state'));
    const exchange = (fields: Record<string, string>) => d.fetch(issuer + '/oauth2/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: 'Basic ' + btoa(encodeURIComponent(information.client_id) + ':' + encodeURIComponent(information.client_secret)) },
      body: new URLSearchParams(fields),
    });
    const fields = { grant_type: 'authorization_code', code: callback.searchParams.get('code')!, redirect_uri: redirect, code_verifier: verifier };
    const issued = await exchange(fields);
    record("OAuth code exchange", issued.status);
    const tokens = await issued.json() as { access_token: string; refresh_token: string };
    record("refresh credential presence", Boolean(tokens.refresh_token));
    const called = await rawMcp(d, tokens.access_token);
    record("MCP token receiving", called.status);
    record("MCP settings presence", (content((await called.json() as any).result).siteTitle) !== undefined);
    record("API audience refusal", (await d.fetch(d.base + d.mount + '/api/settings', { headers: { Authorization: 'Bearer ' + tokens.access_token } })).status);
    const widened = await exchange({ grant_type: 'refresh_token', refresh_token: tokens.refresh_token, resource: d.base + d.mount + '/api' });
    record("refresh audience widening", widened.status);
    record("refresh audience error", await widened.json());
    const renewed = await exchange({ grant_type: 'refresh_token', refresh_token: tokens.refresh_token });
    record("MCP refresh exchange", renewed.status);
    const next = await renewed.json() as { access_token: string; refresh_token: string };
    record("refresh credential rotation", next.refresh_token === tokens.refresh_token);
    record("MCP successor receiving", (await rawMcp(d, next.access_token)).status);
    record("API successor audience refusal", (await d.fetch(d.base + d.mount + '/api/settings', { headers: { Authorization: 'Bearer ' + next.access_token } })).status);

};
  async function runProtocolHandshake(plan: McpPlan) {
  const version = plan.version!;

    const d = await createDriver(), credential = await d.manual(['owner:read']);
    const send = (method: string, params: Record<string, unknown>, id?: number) => d.fetch(d.base + d.mount + '/studio/mcp', {
      method: 'POST', headers: { Authorization: 'Bearer ' + credential.accessToken, 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', 'MCP-Protocol-Version': version },
      body: JSON.stringify({ jsonrpc: '2.0', ...(id === undefined ? {} : { id }), method, params }),
    });
    const result = async (response: Response) => {
      record("protocol response", response.status);
      const text = await response.text();
      const messages = text.split('\n').filter(line => line.startsWith('data: ')).map(line => JSON.parse(line.slice(6)));
      record("protocol message cardinality", (messages).length);
      record("protocol error absence", messages[0].error);
      return messages[0].result;
    };
    const initialized = await result(await send('initialize', { protocolVersion: version, capabilities: {}, clientInfo: { name: 'portal-handshake-fixture', version: '1' } }, 1));
    record("negotiated protocol version", initialized.protocolVersion);
    record("protocol tools capability", (initialized.capabilities.tools) !== undefined);
    record("initialized notification", (await send('notifications/initialized', {})).status);
    const inventory = await result(await send('tools/list', {}, 2));
    record("read-scope protocol inventory", inventory.tools.map((tool: { name: string }) => tool.name).sort());
    const settings = content(await result(await send('tools/call', { name: 'getSettings', arguments: {} }, 3)));
    record("protocol settings presence", (settings.siteTitle) !== undefined);

};
  async function runOauthDiscovery(plan: McpPlan) {
  const mount = plan.mount!;

    const d = await createDriver(mount), redirect = 'https://client.example.test/callback';
    let tokens: OAuthTokens | undefined, information: OAuthClientInformation | undefined, verifier = '', redirectURL: URL | undefined, discovery: OAuthDiscoveryState | undefined;
    const provider: OAuthClientProvider = {
      redirectUrl: redirect, clientMetadata: { redirect_uris: [redirect], client_name: 'oracle', token_endpoint_auth_method: 'none', grant_types: ['authorization_code', 'refresh_token'], response_types: ['code'], scope: all.join(' ') },
      state: () => 'oracle-state', clientInformation: () => information, saveClientInformation: value => { information = value; },
      tokens: () => tokens, saveTokens: value => { tokens = value; }, codeVerifier: () => verifier, saveCodeVerifier: value => { verifier = value; },
      redirectToAuthorization: url => { redirectURL = url; }, discoveryState: () => discovery, saveDiscoveryState: value => { discovery = value; },
    };
    const transport = new StreamableHTTPClientTransport(new URL(d.base + mount + '/studio/mcp'), { fetch: d.fetch, authProvider: provider });
    const client = new Client({ name: 'oracle', version: '1' });
    await withOracleCleanup(async () => {
      try { await client.connect(transport); } catch { /* The OAuth client reports its authorization redirect below. */ }
      record("OAuth authorization redirect presence", (redirectURL) !== undefined);
      const consent = await d.fetch(redirectURL!, { headers: { cookie: d.cookie } });
      const html = await consent.text(), handle = html.match(/name="handle" value="([^"]+)"/)![1];
      const binding = consent.headers.getSetCookie().map(cookie => cookie.split(';')[0]).join('; ');
      const response = await d.fetch(d.base + mount + '/studio/auth/consent', { method: 'POST', headers: { cookie: d.cookie + '; ' + binding, Origin: d.base }, body: new URLSearchParams([['handle', handle], ['decision', 'allow'], ...[...html.matchAll(/name="scope" value="([^"]+)"/g)].map(match => ['scope', match[1]])]) });
      record("OAuth discovery consent decision", response.status);
      const callback = new URL(response.headers.get('location')!);
      record("OAuth discovery callback state", callback.searchParams.get('state'));
      await transport.finishAuth(callback.searchParams); await transport.close();
      await client.connect(new StreamableHTTPClientTransport(new URL(d.base + mount + '/studio/mcp'), { fetch: d.fetch, authProvider: provider }));
      const settings = content(await client.callTool({ name: 'getSettings', arguments: {} }));
      record("MCP OAuth real tool call", (settings.siteTitle) !== undefined);

        record("MCP discovery authorization-server fallback", d.log);
        record("MCP discovery OIDC fallback", d.log);
        record("MCP mounted discovery", d.log);
      ;
    }, [() => client.close(), () => transport.close()]);

};
  async function runScopeInventory(plan: McpPlan) {

    const d = await createDriver();
    for (let mask = 1; mask < 32; mask++) {
      const scope = all.filter((_, index) => mask & 1 << index), credential = await d.manual(scope), client = await d.connect(credential.accessToken);
      await withOracleCleanup(async () => { const observed = (await client.listTools()).tools.map(tool => tool.name).sort(); record("MCP scope capabilities", { scope, tools: observed }); }, [() => client.close()]);
    }

};
  async function runMentionProjections(plan: McpPlan) {

    const d = await createDriver(), credential = await d.manual(['owner:read']), client = await d.connect(credential.accessToken);
    await env.DB.prepare("INSERT INTO mentions_in(id,source,target,target_item_id,status,first_seen,last_seen,verified_at,hidden) VALUES ('mcp-group-summary','https://mcp-group/source','target','mcp-group-target','verified','first','seen','verified',0)").run();
    await withOracleCleanup(async () => {
      for (const [name, path, args] of [
        ['listMentionGroups', '/api/mention-groups?targetItemId=mcp-group-target&limit=1', { query: { targetItemId: 'mcp-group-target', limit: 1 } }],
        ['getMentionSummary', '/api/mentions/summary', {}],
      ] as const) {
        const rest = await (await d.owner(d.mount + path)).json();
        const mcp = content(await client.callTool({ name, arguments: args }));
        record("MCP REST mention projection", sameProjection(mcp, rest));
      }
      const denied = await d.manual(['owner:manage']);
      for (const name of ['listMentionGroups', 'getMentionSummary'])
        record("MCP mention scope denial", (await rawMcp(d, denied.accessToken, 'tools/call', { name, arguments: {} })).status);
    }, [() => client.close(), () => env.DB.prepare("DELETE FROM mentions_in WHERE id='mcp-group-summary'").run()]);

};
  async function runItemPublication(plan: McpPlan) {

    const d = await createDriver(), credential = await d.manual(all), client = await d.connect(credential.accessToken);
    await withOracleCleanup(async () => {
      const provenance = plan.publication!.provenance;
      const created = content(await client.callTool({ name: 'createItem', arguments: { body: { contentMd: plan.publication!.contentMd, provenance } } }));
      const rest = await (await d.owner(d.mount + '/api/items/' + created.id)).json();
      const mcp = content(await client.callTool({ name: 'getItem', arguments: { path: { id: created.id } } }));
      record("MCP REST item equivalence", sameProjection(mcp, rest));
      record("MCP generation provenance retained", mcp.provenance);
      content(await client.callTool({ name: 'publishItem', arguments: { path: { id: created.id }, body: { expectedRevision: created.revision } } }));
      const publicItem = await (await d.fetch(d.base + '/blyg/items/' + created.id + '.json')).json() as { generated: unknown; content_md: string };
       record("MCP public generated provenance", publicItem.generated); record("MCP public generated words", publicItem.content_md); record("MCP public TK syntax", publicItem.content_md); ;
      record("MCP grant revocation", (await d.owner(d.mount + '/api/authorizations/' + credential.authorization.id, 'DELETE')).status);
      await record("MCP revoked tool outcome", await toolOutcome(() => client.callTool({ name: 'getSettings', arguments: {} })));
    }, [() => client.close()]);

};
  async function runScopeChallenges(plan: McpPlan) {

    const d = await createDriver(), credential = await d.manual(['owner:draft']);
    const denied = await rawMcp(d, credential.accessToken, 'tools/call', { name: 'publishItem', arguments: { path: { id: 'not-created' } } });
    record("MCP publish scope denial", denied.status);
    record("MCP insufficient scope challenge", denied.headers.get('www-authenticate'));
    record("MCP required publish scope", denied.headers.get('www-authenticate'));
    record("MCP challenge metadata", denied.headers.get('www-authenticate'));
    const responseEdit = await rawMcp(d, credential.accessToken, 'tools/call', { name: 'updateItem', arguments: { path: { id: 'not-created' }, body: { responses: [] } } });
    record("MCP response edit denial", responseEdit.status);
    record("MCP required public edit scopes", responseEdit.headers.get('www-authenticate'));
    const highlightEdit = await rawMcp(d, credential.accessToken, 'tools/call', { name: 'updateItem', arguments: { path: { id: 'not-created' }, body: { highlight: 'hide' } } });
    record("MCP highlight denial", highlightEdit.status);
    const read = await d.manual(['owner:read']);
    const allowed = await rawMcp(d, read.accessToken, 'tools/call', { name: 'getSettings', arguments: {} });
    record("MCP read neighbor", allowed.status);
    record("MCP read neighbor error flag", (await allowed.json() as any).result.isError);

};
  async function runRequestAuthority(plan: McpPlan) {

    const d = await createDriver(), credential = await d.manual(['owner:read']);
    record("MCP no-origin neighbor", (await rawMcp(d, credential.accessToken)).status);
    record("MCP same-origin neighbor", (await rawMcp(d, credential.accessToken, 'tools/call', undefined, { Origin: d.base })).status);
    record("MCP foreign-origin denial", (await rawMcp(d, credential.accessToken, 'tools/call', undefined, { Origin: 'https://foreign.example.test' })).status);
    for (const token of [undefined, 'not-a-token', credential.accessToken.slice(0, -8) + 'tampered']) {
      const denied = await rawMcp(d, token);
      record("MCP invalid bearer denial", denied.status);
      record("MCP invalid bearer challenge", denied.headers.get('www-authenticate'));
    }
    const draft = await d.manual(['owner:draft']);
    const overlap = await Promise.all([rawMcp(d, credential.accessToken), rawMcp(d, draft.accessToken)]);
    record("MCP independent concurrent authority", overlap.map(response => response.status));

};
  async function runProtocolClassification(plan: McpPlan) {

    const d = await createDriver(), credential = await d.manual(['owner:read']);
    record("MCP modern protocol neighbor", (await rawMcp(d, credential.accessToken)).status);
    for (const headers of [{ 'mcp-method': 'tools/list' }, { 'mcp-name': 'otherTool' }, { 'mcp-name': '%ZZ' }, { 'mcp-protocol-version': '2025-11-25' }] as Record<string, string>[]) {
      const denied = await rawMcp(d, credential.accessToken, 'tools/call', undefined, headers);
      record("MCP contradictory header denial", denied.status);
      record("MCP contradictory header error", (await denied.json() as any).error.code);
    }
    for (const header of ['mcp-method', 'mcp-name', 'mcp-protocol-version']) {
      const missing = await rawMcp(d, credential.accessToken, 'tools/call', undefined, {}, '2026-07-28', [header]);
      record("MCP missing header denial", missing.status);
      record("MCP missing header error", (await missing.json() as any).error.code);
    }
    const unsupported = await rawMcp(d, credential.accessToken, 'tools/call', undefined, {}, '2099-01-01');
    record("MCP unsupported version denial", unsupported.status);
    record("MCP supported-version disclosure", JSON.stringify(await unsupported.json()));
    const unknown = await rawMcp(d, credential.accessToken, 'not/a/method', {});
    record("MCP unknown method denial", unknown.status);
    record("MCP unknown method error", (await unknown.json() as any).error.code);
    const metadata = await (await d.fetch(d.base + d.mount + '/studio/auth/resources/mcp')).json() as any;
    record("MCP resource identity", metadata.resource);
    record("MCP authorization servers", metadata.authorization_servers);
    record("MCP access scopes", metadata.scopes_supported);
    const oidc = await (await d.fetch(d.base + d.mount + '/studio/auth/.well-known/openid-configuration')).json() as any;
    record("OIDC issuer", oidc.issuer);
    record("OIDC S256 methods", oidc.code_challenge_methods_supported);
    record("OIDC issuer parameter", oidc.authorization_response_iss_parameter_supported);
    const wrongMethod = await d.fetch(d.base + d.mount + '/studio/mcp', { headers: { Authorization: 'Bearer ' + credential.accessToken } });
    record("MCP wrong HTTP method", wrongMethod.status);


};
  async function runAccessExpiry(plan: McpPlan) {

    for (const resource of ['https://oauth-oracle.example.test/blyg/studio/mcp', 'https://oauth-oracle.example.test/blyg/api']) {
      const f = await flow({ authorize: { resource } });
      const approved = await f.decide('browser-a', true);
      record("MCP expiry consent", approved.status);
      const code = new URL(approved.headers.get('location')!).searchParams.get('code')!;
      const exchanged = await f.token(code, { resource }); record("MCP expiry exchange", exchanged.status);
      const token = await exchanged.json() as { access_token: string; expires_in: number };
      record("MCP access lifetime", token.expires_in);
      const call = () => f.request('/blyg/studio/mcp', { method: 'POST', headers: { Authorization: 'Bearer ' + token.access_token, 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', 'mcp-protocol-version': '2026-07-28', 'mcp-method': 'tools/call', 'mcp-name': 'getSettings' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'getSettings', arguments: {}, _meta: { 'io.modelcontextprotocol/protocolVersion': '2026-07-28', 'io.modelcontextprotocol/clientCapabilities': {} } } }) });
      if (resource.endsWith('/api')) { record("MCP expiry API audience denial", (await call()).status); continue; }
      record("MCP initial access", (await call()).status);
      // Public signed claims select the clock boundary; no verifier helper supplies the verdict.
      const claims = JSON.parse(atob(token.access_token.split('.')[1].replaceAll('-', '+').replaceAll('_', '/'))) as { exp: number };
      const clock = vi.spyOn(Date, 'now').mockReturnValue((claims.exp - 1) * 1000);
      try {
        record("MCP access before expiry", (await call()).status);
        clock.mockReturnValue(claims.exp * 1000);
        const expired = await call(); record("MCP exact expiry denial", expired.status);
        record("MCP expiry challenge", expired.headers.get('www-authenticate'));
      } finally { clock.mockRestore(); }
    }

};
  async function runMessageClassification(plan: McpPlan) {

    const d = await createDriver(), credential = await d.manual(['owner:read']);
    const meta = { 'io.modelcontextprotocol/protocolVersion': '2026-07-28', 'io.modelcontextprotocol/clientCapabilities': {} };
    const send = (body: unknown) => d.fetch(d.base + d.mount + '/studio/mcp', { method: 'POST', headers: { Authorization: 'Bearer ' + credential.accessToken, 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', 'mcp-protocol-version': '2026-07-28' }, body: JSON.stringify(body) });
    const notification = await send({ jsonrpc: '2.0', method: 'notifications/cancelled', params: { requestId: 'unrelated', _meta: meta } });
    record("MCP notification status", notification.status); record("MCP notification body", await notification.text());
    for (const body of [[{ jsonrpc: '2.0', id: 1, method: 'tools/list', params: { _meta: meta } }], { jsonrpc: '2.0', id: 1, result: {} }]) {
      record("MCP invalid message body", (await send(body)).status);
    }

};


const histories: McpPlan[] = [
  {
    "name": "uses pre-registered Cloudflare callback credentials at mount ",
    "boundary": "confidential-oauth",
    "mount": ""
  },
  {
    "name": "uses pre-registered Cloudflare callback credentials at mount /blyg",
    "boundary": "confidential-oauth",
    "mount": "/blyg"
  },
  {
    "name": "uses pre-registered Cloudflare callback credentials at mount /nested/blyg",
    "boundary": "confidential-oauth",
    "mount": "/nested/blyg"
  },
  {
    "name": "completes a 2025-03-26 Streamable HTTP handshake and tool call",
    "boundary": "protocol-handshake",
    "mount": "/blyg",
    "version": "2025-03-26"
  },
  {
    "name": "completes a 2025-06-18 Streamable HTTP handshake and tool call",
    "boundary": "protocol-handshake",
    "mount": "/blyg",
    "version": "2025-06-18"
  },
  {
    "name": "completes a 2025-11-25 Streamable HTTP handshake and tool call",
    "boundary": "protocol-handshake",
    "mount": "/blyg",
    "version": "2025-11-25"
  },
  {
    "name": "discovers mounted OAuth and completes a real tool call at mount ",
    "boundary": "oauth-discovery",
    "mount": ""
  },
  {
    "name": "discovers mounted OAuth and completes a real tool call at mount /blyg",
    "boundary": "oauth-discovery",
    "mount": "/blyg"
  },
  {
    "name": "discovers mounted OAuth and completes a real tool call at mount /nested/blyg",
    "boundary": "oauth-discovery",
    "mount": "/nested/blyg"
  },
  {
    "name": "lists exactly the granted tool capabilities for every scope subset",
    "boundary": "scope-inventory",
    "mount": "/blyg"
  },
  {
    "name": "returns the same bounded mention groups and exact summary as REST",
    "boundary": "mention-projections",
    "mount": "/blyg"
  },
  {
    "name": "has the same item values and publication/provenance as REST",
    "boundary": "item-publication",
    "mount": "/blyg",
    "publication": { "contentMd": "[TK]write a sentence[=]A generated sentence.[/TK]", "generatedText": "A generated sentence.", "provenance": [{ "sources": [], "model": "oracle-agent" }] }
  },
  {
    "name": "returns complete MCP operation scope challenges without widening tool inventory",
    "boundary": "scope-challenges",
    "mount": "/blyg"
  },
  {
    "name": "checks Origin and bearer credentials on each independent MCP request",
    "boundary": "request-authority",
    "mount": "/blyg"
  },
  {
    "name": "delegates contradictory modern headers and versions to the native SDK",
    "boundary": "protocol-classification",
    "mount": "/blyg"
  },
  {
    "name": "checks real OAuth token expiry at T-1/T and rejects the API audience at MCP",
    "boundary": "access-expiry",
    "mount": "/blyg"
  },
  {
    "name": "handles notifications and rejects batched or response bodies through native HTTP classification",
    "boundary": "message-classification",
    "mount": "/blyg"
  }
];
const drivers = {"confidential-oauth": runConfidentialOauth,"protocol-handshake": runProtocolHandshake,"oauth-discovery": runOauthDiscovery,"scope-inventory": runScopeInventory,"mention-projections": runMentionProjections,"item-publication": runItemPublication,"scope-challenges": runScopeChallenges,"request-authority": runRequestAuthority,"protocol-classification": runProtocolClassification,"access-expiry": runAccessExpiry,"message-classification": runMessageClassification};
oracleProperty({
 id: 'mcp', owns: ['src/mcp.ts'],
 law: { statement: 'For every bounded MCP receiving history, explicit granted scopes and resource bind access, permitted operations preserve REST and publication values, and native protocol classification preserves its documented response and discovery contract.', authority: 'Decision #52; docs/client-access.md; decision #111: getChanges removed in Studio 0.67.0 / private contract 6.0.0; MCP authorization and Streamable HTTP specifications linked above; RFC6750 §3 and RFC8707 §2', limits: 'All original finite scope/mount/protocol/expiry/publication histories; not arbitrary tool arguments or deployed host-root metadata publication.' },
 histories, label: plan => plan.name, model: mcpReference,
 driver: async (plan, observe) => { await withOracleStorage(() => active.run(observe, () => drivers[plan.boundary](plan))); observe('MCP receiving complete', true); },
 check: (_plan, trace, expected) => {
   const counts = new Map<string, number>();
   for (const entry of trace) {
     if (entry.checkpoint === 'MCP receiving complete') continue;
     const result = checkMcpObservation(entry, expected, counts.get(entry.checkpoint) ?? 0); if (result) return result;
     counts.set(entry.checkpoint, (counts.get(entry.checkpoint) ?? 0) + 1);
   }
   if (!trace.some(entry => entry.checkpoint === 'MCP receiving complete')) return pass;
   return differs('MCP receiving completeness', 'MCP receiving laws', Object.fromEntries(counts), expected.counts) ?? pass;
 },
 calibrations: [{ name: 'resource bound API token reaches MCP', law: 'MCP receiving laws', history: { enumerated: 0 }, corrupt: trace => trace.map(entry => entry.checkpoint === 'API audience refusal' ? { ...entry, value: 200 } : entry) }],
});
