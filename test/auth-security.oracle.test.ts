/**
 * Delegated authority ends on revocation or authenticated refresh replay, even
 * when a token still has a valid signature. The receiving boundary is the real
 * REST/MCP response, authenticated introspection, or the completed grant write.
 *
 * POST /oauth2/token(consumedRefresh) // → invalid_grant; successor access is denied
 * GET /api/settings(hostileClaims) // → 401
 * POST http://localhost/studio/login(password) // → owner cookie
 * POST http://remote.example/studio/login(password) // → 400, no owner cookie
 *
 * Why does a signed successor stop working after its ancestor is replayed? The
 * grant tombstone removes authority independently of JWT lifetime. Failed client
 * authentication and requests for extra authority do not establish replay.
 *
 * For every tested refresh sequence, only authenticated ancestor reuse revokes
 * the grant (RFC9700 §4.14.2 and docs/auth-security-oracles.md). For every hostile
 * credential, receiving validation checks issuer, owner, resource, time, grant,
 * credential version, key and access-token type (RFC9068 §4). Introspection reports
 * current authority (RFC7662 §2.2). The selected local transport policy admits
 * cleartext only for exact loopback hosts (RFC6750 §5.2). Application credential
 * rows and errors exclude the named fixture secrets (OWASP Logging Cheat Sheet).
 *
 * Histories contain transport addresses, credential mutations and grant actions;
 * the model predicts their public observations without a provider implementation.
 * Opaque credentials stay in the driver. Secret-presence observations retain the
 * original equality/exclusion relations without printing the secrets themselves.
 *
 * Limits: the original finite schedules, local D1 and controlled dependency
 * faults; no deployed TLS/log/backup claim, exhaustive JWT grammar or independent
 * same-client refresh-family isolation after native replay cleanup.
 */
import { differs, oracleProperty, pass, type Observation } from '@tanstack/oracles';
import { vi } from 'vitest';
import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { decodeJwt, generateKeyPair, SignJWT } from 'jose';
import { flow } from './oauth-flow-driver.ts';
import { authorizationServer } from '../src/oauth.ts';
import { makeApp } from '../src/index.ts';
import { withOracleStorage } from './oracle-storage.ts';
import { withOracleCleanup } from './oracle-cleanup.ts';

type Claim = 'issuer' | 'subject' | 'audience' | 'expiry' | 'not-before' | 'grant' | 'version' | 'confirmation';
const claims: Claim[] = ['issuer', 'subject', 'audience', 'expiry', 'not-before', 'grant', 'version', 'confirmation'];
type Plan = { name: string } & (
  | { kind: 'transport'; host: string; path: string; fullDenial: boolean }
  | { kind: 'refresh'; authentication: 'public' | 'basic'; attempts: ('scope' | 'resource' | 'client' | 'bad-secret' | 'replay')[] }
  | { kind: 'introspection'; tokenKind: 'access_token' | 'refresh_token' }
  | { kind: 'stored-secrets' }
  | { kind: 'dependency-fault'; endpoint: 'registration' | 'owner-login' | 'manual-mint' }
  | { kind: 'claims'; resource: 'api' | 'mcp'; axes: Claim[]; extraTokens: boolean; neighbor: boolean }
  | { kind: 'revoked-listing'; recording: 'pending' | 'stale' }
);
// The action/argument data are the original fixed matrix. Names label histories;
// no model or driver branches on them, and no history carries an expected answer.
const histories: Plan[] = [
  ...['/blyg/studio/login', '/blyg/studio/auth/oauth2/token', '/blyg/api/settings', '/blyg/studio/mcp'].map(path => ({ name: `rejects non-loopback cleartext auth transport at ${path}`, kind: 'transport' as const, host: 'insecure.example.test', path, fullDenial: true })),
  ...['localhost', '127.0.0.1', '[::1]'].map(host => ({ name: `allows HTTP development login only on exact loopback host ${host}`, kind: 'transport' as const, host, path: '/blyg/studio/login', fullDenial: false })),
  ...['localhost.attacker.test', '127.0.0.2', 'localhost.'].map(host => ({ name: `does not treat remote or ambiguous host ${host} as a development exception`, kind: 'transport' as const, host, path: '/blyg/studio/login', fullDenial: false })),
  { name: 'denies scope, resource and client escalation without revoking the legitimate grant', kind: 'refresh', authentication: 'public', attempts: ['scope', 'resource', 'client'] },
  { name: 'rejects access credentials in the compromised grant after refresh ancestor replay', kind: 'refresh', authentication: 'public', attempts: ['replay'] },
  ...(['access_token', 'refresh_token'] as const).map(tokenKind => ({ name: `reports a revoked ${tokenKind} inactive through authenticated native introspection`, kind: 'introspection' as const, tokenKind })),
  { name: 'does not store recoverable owner password, authorization code or refresh token in application rows', kind: 'stored-secrets' },
  ...(['registration', 'owner-login', 'manual-mint'] as const).map(endpoint => ({ name: `does not leak sentinel credentials through dependency failures or HTTP errors (${endpoint})`, kind: 'dependency-fault' as const, endpoint })),
  { name: 'rejects a substituted signing key and the OIDC token at protected resources', kind: 'claims', resource: 'api', axes: [], extraTokens: true, neighbor: false },
  { name: 'rejects the hostile trusted-key claim matrix at MCP before reads or writes', kind: 'claims', resource: 'mcp', axes: claims, extraTokens: true, neighbor: true },
  ...claims.map(axis => ({ name: `rejects trusted-key tokens with invalid ${axis} claims`, kind: 'claims' as const, resource: 'api' as const, axes: [axis], extraTokens: false, neighbor: true })),
  { name: 'revokes the JWT grant on authenticated Basic refresh replay only', kind: 'refresh', authentication: 'basic', attempts: ['bad-secret', 'replay'] },
  { name: 'a revoke between token validation and grant persistence cannot resurrect its listing', kind: 'revoked-listing', recording: 'pending' },
  { name: 'the owner listing excludes stale persisted rows for revoked grants', kind: 'revoked-listing', recording: 'stale' },
];

// The reduced model separates current authority from credential possession. Its
// events describe promised observations, not provider storage or verifier branches.
// Each retained distinction has a witness: wrong client vs authenticated replay,
// active vs tombstoned introspection, exact vs lookalike loopback, and one changed
// claim beside a valid signed neighbor.
function model(plan: Plan): Observation[] {
  const result: Observation[] = [];
  const add = (checkpoint: string, value: unknown) => result.push({ checkpoint, value });
  if (plan.kind === 'transport') {
    const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(plan.host);
    add('transport response', { status: loopback ? 302 : 400, cookie: loopback });
    if (plan.fullDenial) add('transport refusal', { body: ['/blyg/api/settings', '/blyg/studio/mcp'].includes(plan.path) ? { code: 'invalid-input', message: 'HTTPS required' } : { error: 'HTTPS required' }, cache: 'no-store' });
    return result;
  }
  if (plan.kind === 'refresh' && plan.authentication === 'basic') {
    add('confidential registration', { status: 201, secret: true });
    add('confidential consent', 200); add('confidential approval', 302);
  }
  add('security issuance', 200);
  switch (plan.kind) {
    case 'refresh': {
      const rotateFirst = plan.attempts.includes('replay');
      if (rotateFirst) { add('refresh rotation', 200); add('successor before replay', 200); }
      let revoked = false;
      for (const attempt of plan.attempts) {
        const authenticated = attempt !== 'bad-secret';
        if (attempt === 'replay' && authenticated) revoked = true;
        add('refresh attempt', { attempt, status: authenticated ? 400 : 401 });
        if (attempt === 'replay' && plan.authentication === 'basic') add('refresh replay error', 'invalid_grant');
        add('grant after attempt', revoked ? 401 : 200);
      }
      if (revoked && plan.authentication === 'public') add('successor refresh after replay', 400);
      if (!rotateFirst) add('valid refresh after rejected bindings', 200);
      break;
    }
    case 'introspection':
      add('introspection client registration', 201);
      if (plan.tokenKind === 'refresh_token') { add('issuing-client consent', 200); add('issuing-client exchange', 200); }
      add('introspection before revoke', { status: 200, active: true });
      add('introspection grant revoke', 200);
      add('introspection after revoke', { status: 200, body: { active: false } });
      break;
    case 'stored-secrets': add('application credential storage', { plaintextCredential: false, keyPresent: true, plaintextPrivateKey: false }); break;
    case 'dependency-fault': add('dependency failure response', { reached: true, status: 500, responseSecret: false, logSecret: false }); break;
    case 'claims':
      if (plan.resource === 'mcp') add('MCP claim issuance', 200);
      if (plan.neighbor) add('valid signed neighbor', 200);
      for (const axis of plan.axes) add('hostile signed claim', { axis, read: 401, write: 401 });
      if (plan.extraTokens) for (const type of ['substitute', 'id-token']) add('non-authority token', { type, read: 401, ...(plan.resource === 'api' ? { write: 401 } : {}) });
      break;
    case 'revoked-listing':
      add('grant record before revoke', true); add('listed grant revoke', 200);
      if (plan.recording === 'pending') add('late grant persistence', null);
      add('revoked grant listing', false); add('revoked grant access', 401);
      break;
  }
  return result;
}

type Observe = (checkpoint: string, value: unknown) => void;
async function issued(observe: Observe) {
  const f = await flow({ scope: 'openid owner:read owner:draft offline_access' });
  const approval = await f.decide('browser-a', true);
  const code = new URL(approval.headers.get('location')!).searchParams.get('code')!;
  const response = await f.token(code); observe('security issuance', response.status);
  return { ...f, code, tokens: await response.json() as { access_token: string; refresh_token: string; id_token: string } };
}
const refresh = (f: Awaited<ReturnType<typeof issued>>, token: string) => f.request(f.issuer + '/oauth2/token', { method: 'POST', body: new URLSearchParams({ grant_type: 'refresh_token', client_id: f.client.client_id, refresh_token: token, resource: f.base + '/blyg/api' }) });
const read = (f: Awaited<ReturnType<typeof flow>>, token: string) => f.request('/blyg/api/settings', { headers: { Authorization: 'Bearer ' + token } });
const mcp = (f: Awaited<ReturnType<typeof issued>>, token: string, name = 'getSettings') => f.request('/blyg/studio/mcp', {
  method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', 'MCP-Protocol-Version': '2026-07-28', 'MCP-Method': 'tools/call', 'MCP-Name': name },
  body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: name === 'createItem' ? { body: { contentMd: 'must not write' } } : {}, _meta: { 'io.modelcontextprotocol/protocolVersion': '2026-07-28', 'io.modelcontextprotocol/clientCapabilities': {} } } }),
});

// Only fixture preparation and production calls occur here. There is no matcher,
// expected operand, or broad error conversion: setup/cleanup errors retain their
// identity. The check below alone decides whether the receiving observations obey.
async function driver(plan: Plan, observe: Observe) {
  await withOracleStorage(async () => {
    if (plan.kind === 'transport') {
      const ctx = createExecutionContext();
      const response = await makeApp('/blyg').fetch(new Request('http://' + plan.host + plan.path, { method: 'POST', headers: { 'CF-Connecting-IP': '2001:db8:' + crypto.randomUUID().replaceAll('-', '').match(/.{4}/g)!.slice(0, 6).join(':') }, body: new URLSearchParams({ password: env.OWNER_PASSWORD, grant_type: 'authorization_code' }) }), env, ctx);
      await waitOnExecutionContext(ctx);
      observe('transport response', { status: response.status, cookie: response.headers.get('set-cookie') !== null });
      if (plan.fullDenial) observe('transport refusal', { body: await response.json(), cache: response.headers.get('cache-control') });
      return;
    }
    if (plan.kind === 'refresh' && plan.authentication === 'basic') {
      const f = await flow();
      const registered = await f.request(f.issuer + '/oauth2/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_name: 'Basic replay oracle', redirect_uris: [f.redirect], token_endpoint_auth_method: 'client_secret_basic', grant_types: ['authorization_code', 'refresh_token'], response_types: ['code'] }) });
      const client = await registered.json() as { client_id: string; client_secret: string };
      observe('confidential registration', { status: registered.status, secret: Boolean(client.client_secret) });
      const authorize = new URL(f.authorize); authorize.searchParams.set('client_id', client.client_id);
      const consent = await f.request(authorize.href, { headers: { cookie: f.owner } }); observe('confidential consent', consent.status);
      const handle = (await consent.text()).match(/name="handle" value="([^"]+)"/)![1];
      const binding = consent.headers.getSetCookie().map(cookie => cookie.split(';')[0]).join('; ');
      const approval = await f.request(f.issuer + '/consent', { method: 'POST', headers: { cookie: f.owner + '; ' + binding, Origin: f.base }, body: new URLSearchParams([['handle', handle], ['decision', 'allow'], ['scope', 'owner:read']]) }); observe('confidential approval', approval.status);
      const code = new URL(approval.headers.get('location')!).searchParams.get('code')!;
      const exchange = (values: Record<string, string>, secret = client.client_secret) => f.request(f.issuer + '/oauth2/token', { method: 'POST', headers: { Authorization: 'Basic ' + btoa(encodeURIComponent(client.client_id) + ':' + encodeURIComponent(secret)), 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(values) });
      const first = await exchange({ grant_type: 'authorization_code', code, redirect_uri: f.redirect, code_verifier: f.verifier, resource: f.base + '/blyg/api' }); observe('security issuance', first.status);
      const initial = await first.json() as { refresh_token: string };
      const fields = { grant_type: 'refresh_token', refresh_token: initial.refresh_token, resource: f.base + '/blyg/api' };
      const rotated = await exchange(fields); observe('refresh rotation', rotated.status);
      const next = await rotated.json() as { access_token: string; refresh_token: string }; observe('successor before replay', (await read(f, next.access_token)).status);
      for (const attempt of plan.attempts) {
        const response = await exchange(fields, attempt === 'bad-secret' ? 'wrong-secret' : client.client_secret);
        observe('refresh attempt', { attempt, status: response.status });
        if (attempt === 'replay') observe('refresh replay error', (await response.json() as { error: unknown }).error);
        observe('grant after attempt', (await read(f, next.access_token)).status);
      }
      return;
    }
    const f = await issued(observe);
    switch (plan.kind) {
      case 'refresh': {
        const other = plan.attempts.includes('client') ? await flow() : undefined;
        if (plan.attempts.includes('replay')) {
          const rotated = await refresh(f, f.tokens.refresh_token); observe('refresh rotation', rotated.status);
          const next = await rotated.json() as { access_token: string; refresh_token: string };
          observe('successor before replay', (await read(f, next.access_token)).status);
          observe('refresh attempt', { attempt: 'replay', status: (await refresh(f, f.tokens.refresh_token)).status });
          observe('grant after attempt', (await read(f, next.access_token)).status);
          observe('successor refresh after replay', (await refresh(f, next.refresh_token)).status);
        } else {
          for (const attempt of plan.attempts) {
            const patch: Record<string, string> = attempt === 'scope' ? { scope: 'owner:publish' } : attempt === 'resource' ? { resource: f.base + '/blyg/studio/mcp' } : { client_id: other!.client.client_id };
            const response = await f.request(f.issuer + '/oauth2/token', { method: 'POST', body: new URLSearchParams({ grant_type: 'refresh_token', client_id: f.client.client_id, refresh_token: f.tokens.refresh_token, resource: f.base + '/blyg/api', ...patch }) });
            observe('refresh attempt', { attempt, status: response.status }); observe('grant after attempt', (await read(f, f.tokens.access_token)).status);
          }
          observe('valid refresh after rejected bindings', (await refresh(f, f.tokens.refresh_token)).status);
        }
        break;
      }
      case 'introspection': {
        const registration = await f.request(f.issuer + '/oauth2/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ redirect_uris: [f.redirect], token_endpoint_auth_method: 'client_secret_basic' }) }); observe('introspection client registration', registration.status);
        const client = await registration.json() as { client_id: string; client_secret: string };
        if (plan.tokenKind === 'refresh_token') {
          const authorize = new URL(f.authorize); authorize.searchParams.set('client_id', client.client_id);
          const consent = await f.request(authorize.href, { headers: { cookie: f.owner } }); observe('issuing-client consent', consent.status);
          const handle = (await consent.text()).match(/name="handle" value="([^"]+)"/)![1], binding = consent.headers.getSetCookie().map(cookie => cookie.split(';')[0]).join('; ');
          const approval = await f.request(f.issuer + '/consent', { method: 'POST', headers: { cookie: f.owner + '; ' + binding, Origin: f.base }, body: new URLSearchParams([['handle', handle], ['decision', 'allow'], ['scope', 'owner:read'], ['scope', 'owner:draft']]) });
          const code = new URL(approval.headers.get('location')!).searchParams.get('code')!;
          const exchange = await f.request(f.issuer + '/oauth2/token', { method: 'POST', headers: { Authorization: 'Basic ' + btoa(client.client_id + ':' + client.client_secret) }, body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: f.redirect, code_verifier: f.verifier, resource: f.base + '/blyg/api' }) }); observe('issuing-client exchange', exchange.status);
          f.tokens = await exchange.json() as typeof f.tokens; f.client.client_id = client.client_id;
        }
        const introspect = () => f.request(f.issuer + '/oauth2/introspect', { method: 'POST', headers: { Authorization: 'Basic ' + btoa(client.client_id + ':' + client.client_secret) }, body: new URLSearchParams({ token: f.tokens[plan.tokenKind], token_type_hint: plan.tokenKind }) });
        const before = await introspect(); observe('introspection before revoke', { status: before.status, active: (await before.json() as { active: unknown }).active });
        const listing = await (await f.request('/blyg/api/authorizations', { headers: { cookie: f.owner } })).json() as { items: { id: string; clientId: string }[] };
        const grant = listing.items.find(value => value.clientId === f.client.client_id)!;
        observe('introspection grant revoke', (await f.request('/blyg/api/authorizations/' + grant.id, { method: 'DELETE', headers: { cookie: f.owner } })).status);
        const after = await introspect(); observe('introspection after revoke', { status: after.status, body: await after.json() });
        break;
      }
      case 'stored-secrets': {
        const tables = ['user', 'account', 'verification', 'oauthClient', 'oauthRefreshToken', 'oauthAccessToken', 'oauthConsent', 'oauth_records', 'oauth_authorizations'];
        const serialized = JSON.stringify(await Promise.all(tables.map(table => env.DB.prepare('SELECT * FROM "' + table + '"').all())));
        const secrets = [env.OWNER_PASSWORD, f.code, f.tokens.refresh_token, f.tokens.access_token];
        const key = await env.DB.prepare('SELECT privateKey FROM jwks LIMIT 1').first<{ privateKey: string }>();
        observe('application credential storage', { plaintextCredential: secrets.some(value => serialized.includes(value)), keyPresent: key !== null, plaintextPrivateKey: key?.privateKey.includes('"d"') });
        break;
      }
      case 'dependency-fault': {
        const endpoint = plan.endpoint, marker = 'security-oracle-secret-' + crypto.randomUUID(), captured: unknown[][] = [];
        let reached = false;
        const spies = (['error', 'warn', 'info', 'log', 'debug'] as const).map(method => vi.spyOn(console, method).mockImplementation((...args: unknown[]) => { captured.push(args); }));
        await withOracleCleanup(async () => {
          const database = new Proxy(env.DB, { get(target, key) {
            if (key === 'prepare') return (sql: string) => {
              if (!sql.includes('security_registrations') && !sql.startsWith('DELETE FROM oauthClient WHERE userId IS NULL') && sql.includes(endpoint === 'owner-login' ? 'rateLimit' : 'oauthClient')) { reached = true; const error = new Error('database failed with credential=' + marker); error.name = marker; throw error; }
              return target.prepare(sql);
            };
            const value = Reflect.get(target, key); return typeof value === 'function' ? value.bind(target) : value;
          } });
          const ctx = createExecutionContext(), path = endpoint === 'registration' ? f.issuer + '/oauth2/register' : endpoint === 'owner-login' ? f.base + '/blyg/studio/login' : f.base + '/blyg/api/authorizations';
          const body = endpoint === 'registration' ? JSON.stringify({ client_name: marker, redirect_uris: [f.redirect], token_endpoint_auth_method: 'none' }) : endpoint === 'owner-login' ? new URLSearchParams({ password: marker }) : JSON.stringify({ name: marker, resource: 'api', scope: ['owner:read'] });
          const response = await makeApp('/blyg').fetch(new Request(path, { method: 'POST', headers: { ...(endpoint === 'owner-login' ? {} : { 'content-type': 'application/json' }), ...(endpoint === 'manual-mint' ? { cookie: f.owner } : {}), 'CF-Connecting-IP': '198.51.100.230' }, body }), { ...env, DB: database }, ctx); await waitOnExecutionContext(ctx);
          const responseText = await response.text();
          const logs = JSON.stringify(captured, (_key, value) => value instanceof Error ? { name: value.name, message: value.message, stack: value.stack } : value);
          observe('dependency failure response', { reached, status: response.status, responseSecret: responseText.includes(marker), logSecret: logs.includes(marker) });
        }, spies.map(spy => async () => { spy.mockRestore(); }));
        break;
      }
      case 'claims': {
        let payload = decodeJwt(f.tokens.access_token);
        const server = await authorizationServer(f.issuer, env);
        if (plan.resource === 'mcp') {
          const minted = await f.request('/blyg/api/authorizations', { method: 'POST', headers: { cookie: f.owner, 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'MCP claim fixture', resource: 'mcp', scope: ['owner:read', 'owner:draft'] }) }); observe('MCP claim issuance', minted.status);
          payload = decodeJwt((await minted.json() as { accessToken: string }).accessToken);
        }
        const receive = (token: string, write = false) => plan.resource === 'mcp' ? mcp(f, token, write ? 'createItem' : 'getSettings') : write ? f.request('/blyg/api/items', { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify({ contentMd: 'must not write' }) }) : read(f, token);
        if (plan.neighbor) { const neighbor = await server.api.signJWT({ body: { payload } }); observe('valid signed neighbor', (await receive(neighbor.token)).status); }
        const patches: Record<Claim, Record<string, unknown>> = {
          issuer: { iss: 'https://foreign.example.test/auth' }, subject: { sub: 'attacker' }, audience: { aud: plan.resource === 'mcp' ? f.base + '/blyg/api' : f.base + '/foreign' }, expiry: { exp: Math.floor(Date.now() / 1000) - 1 }, 'not-before': { nbf: Math.floor(Date.now() / 1000) + 3600 }, grant: { grantId: undefined }, version: { credentialVersion: 'foreign-version' }, confirmation: { cnf: { jkt: 'unsupported-sender' } },
        };
        for (const axis of plan.axes) { const signed = await server.api.signJWT({ body: { payload: { ...payload, ...patches[axis] } } }); observe('hostile signed claim', { axis, read: (await receive(signed.token)).status, write: (await receive(signed.token, true)).status }); }
        if (plan.extraTokens) {
          const { privateKey } = await generateKeyPair('RS256');
          const substitute = await new SignJWT(payload).setProtectedHeader({ alg: 'RS256', kid: 'untrusted-key', typ: 'at+jwt' }).sign(privateKey);
          for (const [type, token] of [['substitute', substitute], ['id-token', f.tokens.id_token]]) observe('non-authority token', { type, read: (await receive(token)).status, ...(plan.resource === 'api' ? { write: (await receive(token, true)).status } : {}) });
        }
        break;
      }
      case 'revoked-listing': {
        const list = async () => (await (await f.request('/blyg/api/authorizations', { headers: { cookie: f.owner } })).json() as { items: { id: string; clientId: string }[] }).items;
        if (plan.recording === 'pending') {
          const grant = (await list()).find(value => value.clientId === f.client.client_id); observe('grant record before revoke', grant !== undefined); if (!grant) return;
          let reached!: () => void, release!: () => void;
          const paused = new Promise<void>(resolve => { reached = resolve; }), resume = new Promise<void>(resolve => { release = resolve; });
          const database = new Proxy(env.DB, { get(target, key) {
            if (key === 'prepare') return (sql: string) => {
              const wrap = (statement: D1PreparedStatement): D1PreparedStatement => new Proxy(statement, { get(statement, key) {
                if (key === 'bind') return (...values: unknown[]) => wrap(statement.bind(...values));
                if (key === 'run' && /INSERT INTO oauth_authorizations/.test(sql)) return async () => { reached(); await resume; return statement.run(); };
                const value = Reflect.get(statement, key); return typeof value === 'function' ? value.bind(statement) : value;
              } }); return wrap(target.prepare(sql));
            };
            const value = Reflect.get(target, key); return typeof value === 'function' ? value.bind(target) : value;
          } });
          const { rememberAuthorization } = await import('../src/oauth.ts');
          const pending = rememberAuthorization(f.issuer, { ...env, DB: database }, f.tokens.access_token);
          await withOracleCleanup(async () => { await paused; observe('listed grant revoke', (await f.request('/blyg/api/authorizations/' + grant.id, { method: 'DELETE', headers: { cookie: f.owner } })).status); }, [async () => { release(); await pending; }]);
          observe('late grant persistence', await env.DB.prepare('SELECT grant_id FROM oauth_authorizations WHERE grant_id=?').bind(grant.id).first());
          observe('revoked grant listing', (await list()).some(value => value.id === grant.id));
        } else {
          const row = await env.DB.prepare('SELECT * FROM oauth_authorizations WHERE client_id=?').bind(f.client.client_id).first<Record<string, unknown>>();
          observe('grant record before revoke', row !== null); if (!row) return;
          observe('listed grant revoke', (await f.request('/blyg/api/authorizations/' + row.grant_id, { method: 'DELETE', headers: { cookie: f.owner } })).status);
          await env.DB.prepare('INSERT INTO oauth_authorizations(grant_id,client_id,name,manual,resource,scopes,created,expires,version) VALUES (?,?,?,?,?,?,?,?,?)').bind(...['grant_id', 'client_id', 'name', 'manual', 'resource', 'scopes', 'created', 'expires', 'version'].map(key => row[key])).run();
          observe('revoked grant listing', (await list()).some(value => value.id === row.grant_id));
        }
        observe('revoked grant access', (await read(f, f.tokens.access_token)).status);
        break;
      }
    }
  });
  observe('security history complete', true);
}

function checkSecurity(_plan: Plan, trace: readonly Observation[], expected: readonly Observation[]) {
  const entries = trace.filter(entry => entry.checkpoint !== 'security history complete');
  for (let index = 0; index < entries.length; index++) {
    const mismatch = differs(entries[index].checkpoint, 'grant security', entries[index], expected[index]);
    if (mismatch) return mismatch;
  }
  const completion = trace.filter(entry => entry.checkpoint === 'security history complete');
  if (completion.length) return differs('security history completion marker', 'grant security', completion.map(entry => entry.value), [true]) ?? differs('security receiving checkpoints', 'grant security', entries.length, expected.length) ?? pass;
  return pass; // A valid prefix is not a semantic failure when the driver throws.
}

oracleProperty({
  id: "auth-security", owns: ['src/auth.ts', 'src/oauth.ts', 'src/oauth-routes.ts', 'src/index.ts#makeApp'],
  law: { statement: "For every declared cleartext receiving history, only exact loopback hosts admit credentials; remote or ambiguous hosts receive a no-store refusal and no owner cookie.", authority: "RFC6750 §5.2; docs/auth-security-oracles.md transport policy", limits: "Original ten transport histories; no deployed TLS or ingress claim." },
  histories: histories.filter(plan => plan.kind === 'transport'), label: plan => plan.name, model, driver,
  check: checkSecurity,
  calibrations: [{ name: "remote cleartext issues owner cookie", law: "grant security", history: { enumerated: 0 }, corrupt: trace => trace.map(entry => entry.checkpoint === "transport response" ? { ...entry, value: { status: 302, cookie: true } } : entry) }],
});

oracleProperty({
  id: "auth-security-refresh-preservation", owns: ['src/auth.ts', 'src/oauth.ts', 'src/oauth-routes.ts'],
  law: { statement: "For every declared public refresh history, requests for a different scope, client or audience fail without revoking the legitimate grant, which can still refresh.", authority: "RFC9700 §4.14.2; docs/auth-security-oracles.md refresh bindings", limits: "Original scope/resource/client sequence; no full client metadata matrix." },
  histories: histories.filter(plan => plan.kind === 'refresh' && !plan.attempts.includes('replay')), label: plan => plan.name, model, driver,
  check: checkSecurity,
  calibrations: [{ name: "rejected binding revokes valid grant", law: "grant security", history: { enumerated: 0 }, corrupt: trace => trace.map(entry => entry.checkpoint === "grant after attempt" ? { ...entry, value: 401 } : entry) }],
});

oracleProperty({
  id: "auth-security-refresh-replay", owns: ['src/auth.ts', 'src/oauth.ts', 'src/oauth-routes.ts'],
  law: { statement: "For every declared public or Basic refresh history, authenticated ancestor replay revokes the grant and its successor authority; failed client authentication alone leaves that authority intact.", authority: "RFC9700 §4.14.2; docs/auth-security-oracles.md replay policy", limits: "Original public and Basic schedules; no independent same-client refresh-family isolation after native replay cleanup." },
  histories: histories.filter(plan => plan.kind === 'refresh' && plan.attempts.includes('replay')), label: plan => plan.name, model, driver,
  check: checkSecurity,
  calibrations: [{ name: "replayed ancestor retains authority", law: "grant security", history: { enumerated: 0 }, corrupt: trace => trace.map(entry => entry.checkpoint === "refresh attempt" ? { ...entry, value: { attempt: 'replay', status: 200 } } : entry) }],
});

oracleProperty({
  id: "auth-security-introspection", owns: ['src/auth.ts', 'src/oauth.ts', 'src/oauth-routes.ts'],
  law: { statement: "For every declared access or refresh credential, authenticated introspection reports it active before grant revocation and inactive after revocation.", authority: "RFC7662 §2.2; docs/auth-security-oracles.md", limits: "Original access/refresh witnesses and native authenticated introspection." },
  histories: histories.filter(plan => plan.kind === 'introspection'), label: plan => plan.name, model, driver,
  check: checkSecurity,
  calibrations: [{ name: "revoked credential remains active", law: "grant security", history: { enumerated: 0 }, corrupt: trace => trace.map(entry => entry.checkpoint === "introspection after revoke" ? { ...entry, value: { status: 200, body: { active: true } } } : entry) }],
});

oracleProperty({
  id: "auth-security-stored-secrets", owns: ['src/auth.ts', 'src/oauth.ts', 'src/oauth-routes.ts'],
  law: { statement: "For every declared issued credential set, application rows exclude the recoverable owner password, code and tokens, and the stored signing key is present without plaintext private-key material.", authority: "docs/auth-security-oracles.md storage policy; OWASP Logging Cheat Sheet data-to-exclude", limits: "Original named tables and fixture secrets; no deployed backups or all possible encodings." },
  histories: histories.filter(plan => plan.kind === 'stored-secrets'), label: plan => plan.name, model, driver,
  check: checkSecurity,
  calibrations: [{ name: "application rows retain plaintext credential", law: "grant security", history: { enumerated: 0 }, corrupt: trace => trace.map(entry => entry.checkpoint === "application credential storage" ? { ...entry, value: { plaintextCredential: true, keyPresent: true, plaintextPrivateKey: false } } : entry) }],
});

oracleProperty({
  id: "auth-security-dependency-errors", owns: ['src/auth.ts', 'src/oauth.ts', 'src/oauth-routes.ts', 'src/index.ts#makeApp'],
  law: { statement: "For every declared dependency fault, the reached endpoint returns a server error and excludes the sentinel credential from both its response and captured application logs.", authority: "docs/auth-security-oracles.md errors policy; OWASP Logging Cheat Sheet data-to-exclude", limits: "Original registration, login and manual-mint injection points; no deployed logging pipeline claim." },
  histories: histories.filter(plan => plan.kind === 'dependency-fault'), label: plan => plan.name, model, driver,
  check: checkSecurity,
  calibrations: [{ name: "dependency failure exposes credential", law: "grant security", history: { enumerated: 0 }, corrupt: trace => trace.map(entry => entry.checkpoint === "dependency failure response" ? { ...entry, value: { reached: true, status: 500, responseSecret: true, logSecret: false } } : entry) }],
});

oracleProperty({
  id: "auth-security-credential-validity", owns: ['src/auth.ts', 'src/oauth.ts', 'src/oauth-routes.ts'],
  law: { statement: "For every declared REST or MCP credential, protected reads and writes reject hostile issuer, subject, audience, time, grant, version, confirmation, signing-key or token-type inputs while retaining the valid signed neighbor.", authority: "RFC9068 §4; docs/auth-security-oracles.md receiving policy", limits: "Original trusted-key matrix and key/type neighbors; no exhaustive JWT grammar." },
  histories: histories.filter(plan => plan.kind === 'claims'), label: plan => plan.name, model, driver,
  check: checkSecurity,
  calibrations: [{ name: "non-authority token reads protected data", law: "grant security", history: { enumerated: 0 }, corrupt: trace => trace.map(entry => entry.checkpoint === "non-authority token" ? { ...entry, value: { type: 'substitute', read: 200, write: 401 } } : entry) }],
});

oracleProperty({
  id: "auth-security-revoked-listing", owns: ['src/auth.ts', 'src/oauth.ts', 'src/oauth-routes.ts', 'src/authorization-api.ts#authorizationResources'],
  law: { statement: "For every declared pending or stale grant write, revocation prevents that grant from reappearing in the owner listing or authorizing access.", authority: "docs/auth-security-oracles.md grant tombstone and listing policy", limits: "Original controlled pending-write race and stale persisted row; no arbitrary database interleavings." },
  histories: histories.filter(plan => plan.kind === 'revoked-listing'), label: plan => plan.name, model, driver,
  check: checkSecurity,
  calibrations: [{ name: "revoked grant reappears in listing", law: "grant security", history: { enumerated: 0 }, corrupt: trace => trace.map(entry => entry.checkpoint === "revoked grant listing" ? { ...entry, value: true } : entry) }],
});
