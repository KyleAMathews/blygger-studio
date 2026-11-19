/**
 * OAuth requests retain callback, client, resource and owner-authentication
 * bindings at the real mounted authorization, token and protected endpoints.
 *
 * authorize(unregisteredCallback) // → local refusal, never a code at that callback
 * token(code, age=600s) // → credentials; age=601s → invalid_grant
 * token(code) twice concurrently // → one success and one invalid_grant
 * authorize(prompt='login') // → password login, then the pending consent resumes
 *
 * A provider bridge can be new while the owner's password authentication is old.
 * OIDC max_age and auth_time concern the latter. Callback queries and opaque
 * state survive both consent and password continuations; response 307 is unsafe
 * because it could forward the submitted credentials.
 *
 * For every declared request history, authorization and exchange preserve their
 * registered bindings (RFC6749 §§4.1/5, RFC7591 §§2/3.2.1). Receiving challenges
 * obey RFC6750 §3, and OIDC prompt, max_age, authentication-time and offline-access
 * requests retain the selected profile's owner intent (OIDC Core AuthRequest and
 * OfflineAccess). The model derives projected public results from request fields,
 * action ordering and elapsed time, without importing provider classifications.
 *
 * Histories are semantic request regimes and concrete inputs from the original
 * finite matrix. The driver records raw status/body/header/URL fields at each
 * completed response. The checker accepts both existing valid error delivery
 * forms where the contract permits them; it does not freeze a provider choice.
 *
 * Limits: bounded code/exchange schedules and local Worker/provider fixtures,
 * not complete OAuth/OIDC conformance, arbitrary concurrency schedules or the
 * deferred host-root protected-resource metadata publication profile.
 */
import { differs, oracleProperty, pass, type Observation } from '@tanstack/oracles';
import { vi } from 'vitest';
import { env } from 'cloudflare:test';
import { flow } from './oauth-flow-driver.ts';
import { withOracleStorage } from './oracle-storage.ts';
import { withOracleCleanup } from './oracle-cleanup.ts';

const BASE = 'https://oauth-oracle.example.test', REDIRECT = 'https://client.example.test/callback';
type Plan = { name: string; kind: string; value?: string; field?: string; age?: number; mode?: string };
const histories: Plan[] = [];
const one = (name: string, kind: string, input: Omit<Plan, 'name' | 'kind'> = {}) => histories.push({ name, kind, ...input });
const rows = (values: readonly (string | number)[], name: string, kind: string, field: 'value' | 'field' | 'age') => values.forEach(value => one(name.replace('%s', String(value)), kind, { [field]: value }));
rows(['https://evil.example/callback', REDIRECT + '/', 'https://CLIENT.example.test/callback', REDIRECT + '?changed=1'], 'does not redirect an authorization to unregistered exact URI %s', 'redirect-binding', 'value');
one('retains query parameters and exact state in a registered callback, without 307', 'callback-query', { value: REDIRECT + '?keep=a%2Bb&empty=' });
rows(['/relative', REDIRECT + '#fragment', 'http://remote.example/callback'], 'rejects invalid remote registered redirect %s', 'registration-redirect', 'value');
one('requires owner authentication before producing consent for a registered client', 'owner-authentication');
rows(['response_type', 'client_id', 'code_challenge'], 'treats missing and empty authorization %s alike', 'authorization-cardinality', 'field');
rows(['response_type', 'client_id', 'code_challenge'], 'rejects duplicate authorization %s', 'authorization-duplicate', 'field');
one('ignores unknown authorization and token parameters', 'unknown-extension');
rows(['token', 'id_token', 'nonsense'], 'rejects unsupported authorization response_type %s', 'response-type', 'value');
rows(['plain', 'unsupported', ''], 'does not silently downgrade S256 to method %s', 'pkce-method', 'value');
rows(['grant_type', 'code', 'client_id', 'code_verifier'], 'rejects empty token %s without minting credentials', 'token-cardinality', 'field');
rows(['grant_type', 'code', 'client_id', 'code_verifier'], 'rejects duplicate token %s', 'token-duplicate', 'field');
one('rejects an unknown code with invalid_grant', 'unknown-code');
rows([599, 600, 601], 'checks the native short-code lifetime at age %s seconds', 'code-age', 'age');
one('permits at most one concurrent exchange of the same code', 'code-concurrency');
rows(['/relative', BASE + '/blyg/api#fragment', 'https://foreign.example/api'], 'does not grant malformed or foreign resource %s', 'resource-binding', 'value');
one('preserves refresh scope on omission and rejects a new audience or client', 'refresh-bindings');
rows([3599, 3600], 'checks OAuth-issued access at age %s seconds', 'access-age', 'age');
rows([2591999, 2592000], 'checks the fixed thirty-day OAuth grant at age %s seconds', 'grant-age', 'age');
one('keeps exact state on consent denial without forwarding owner credentials', 'consent-denial');
rows(['<script>alert(1)</script>', 'e\u0301é + %'], 'echoes exact escaped state %s', 'state-echo', 'value');
one('does not expose the PKCE challenge in the issued code', 'code-secrecy');
one('returns typed token fields with both sensitive-response cache headers', 'token-response');
one('rejects a mutated production access-token signature before returning protected data', 'signature');
one('uses syntactically valid, nonduplicated Bearer challenge attributes for missing, invalid and insufficient credentials', 'challenge');
one('keeps authorization-page resources on the owner origin', 'page-origin');
one('publishes explicit protected resource metadata fields', 'resource-metadata');
one('does not display a login page for unauthenticated prompt=none', 'prompt', { value: 'none', mode: 'anonymous' });
one('accepts unknown DCR metadata and returns authoritative registered defaults', 'registration-defaults', { mode: 'public' });
one('uses the confidential client authentication default when DCR omits that field', 'registration-defaults', { mode: 'confidential' });
rows(['display', 'ui_locales', 'claims_locales', 'acr_values'], 'accepts OIDC advisory %s without demanding unsupported profiles', 'advisory', 'field');
rows(['none', 'login', 'none login'], 'honors OIDC prompt %s rather than displaying ordinary consent', 'prompt', 'value');
one('does not refresh owner authentication age merely by recreating a provider bridge', 'bridge-age');
one('includes the owner authentication time when an OIDC request makes it essential', 'authentication-time');
one('explains offline access visibly before asking the owner to grant it', 'offline-consent');
rows(['login', 'max_age'], 'completes password reauthentication and resumes the pending OIDC %s request', 'reauthentication', 'value');
one('requires reauthentication for max_age=0 despite an existing owner session', 'max-age');

type Expected = { checkpoint: string; alternatives: unknown[] };
const exact = (checkpoint: string, value: unknown): Expected => ({ checkpoint, alternatives: [value] });
const approval = () => exact('authorization approval', { status: 302, error: null, code: true });
// An authorization error may be sent to the registered callback or returned
// directly. Only inputs choose the owed error; the model never reads the response.
const authorizationError = (error?: string): Expected => ({ checkpoint: 'authorization error', alternatives: [
  { mode: 'callback', target: REDIRECT, state: 'oracle-state', code: false, error: error ?? 'string' },
  { mode: 'direct', status: 400, error: error ?? 'string' },
] });
const localRefusal = (includeCode: boolean): Expected => ({ checkpoint: 'local authorization refusal', alternatives: [
  { mode: 'redirect', origin: BASE, ...(includeCode ? { code: false } : {}) }, { mode: 'direct', status: 400 },
] });
// The model consists of protocol request rules. Code/access/grant time are
// separate because their boundaries differ; auth_time belongs to authentication,
// not issuance. No rule imports native request classifiers or generated outputs.
function model(plan: Plan): Expected[] {
  switch (plan.kind) {
    case 'redirect-binding': return [localRefusal(true)];
    case 'callback-query': return [exact('registered callback', { status: 302, keep: 'a+b', empty: true, state: 'oracle-state', code: true })];
    case 'registration-redirect': return [exact('registration redirect refusal', { status: 400, error: 'invalid_redirect_uri' })];
    case 'owner-authentication': return [exact('owner login redirect', { status: 302, origin: BASE, path: '/blyg/studio/login' })];
    case 'authorization-cardinality': return [0, 1].map(() => plan.field === 'client_id' ? localRefusal(false) : authorizationError('invalid_request'));
    case 'authorization-duplicate': return [plan.field === 'client_id' ? { checkpoint: 'duplicate client refusal', alternatives: [localRefusal(true).alternatives[0], authorizationError('invalid_request').alternatives[1]] } : authorizationError('invalid_request')];
    case 'unknown-extension': return [exact('extension token exchange', 200)];
    case 'response-type': return [authorizationError('unsupported_response_type')];
    case 'pkce-method': return [authorizationError('invalid_request')];
    case 'token-cardinality': return [approval(), exact('empty token request', { status: 400, error: true, accessTokenType: 'undefined' })];
    case 'token-duplicate': return [approval(), exact('duplicate token request', { status: 400, error: 'invalid_request' })];
    case 'unknown-code': return [exact('unknown authorization code', { status: 400, error: 'invalid_grant' })];
    case 'code-age': return [approval(), exact('code lifetime', { status: plan.age! <= 600 ? 200 : 400, ...(plan.age! > 600 ? { error: 'invalid_grant' } : {}) })];
    case 'code-concurrency': return [approval(), exact('concurrent code exchange', { statuses: [200, 400], error: 'invalid_grant' })];
    case 'resource-binding': return [authorizationError()];
    case 'refresh-bindings': return [approval(), exact('refresh original authority', { status: 200, sameScopes: true }), exact('refresh changed audience', 400), exact('refresh changed client', 400)];
    case 'access-age': return [approval(), exact('access lifetime', plan.age! < 3600 ? 200 : 401)];
    case 'grant-age': return [approval(), exact('grant lifetime', { status: plan.age! < 2592000 ? 200 : 400, ...(plan.age! >= 2592000 ? { error: 'invalid_grant' } : {}) })];
    case 'consent-denial': return [exact('consent denial', { forwardsBody: false, state: 'oracle-state', error: 'access_denied', password: false, code: false })];
    case 'state-echo': return [exact('opaque state', plan.value)];
    case 'code-secrecy': return [approval(), exact('code challenge disclosure', false)];
    case 'token-response': return [approval(), exact('token response', { status: 200, json: true, accessType: 'string', refreshType: 'string', expiryType: 'number', tokenType: 'bearer', noStore: true, pragma: 'no-cache' })];
    case 'signature': return [approval(), exact('corrupt signature receiving', { status: 401, protectedField: false })];
    case 'challenge': return [approval(), ...(['missing', 'invalid', 'insufficient'] as const).map(kind => exact('Bearer challenge', { kind, status: kind === 'insufficient' ? 403 : 401, bearer: true, uniqueAttributes: true, asciiValues: true, resourceOrigins: true, ...(kind === 'insufficient' ? { insufficient: true } : kind === 'missing' ? { errorAbsent: true } : {}) }))];
    case 'page-origin': return [exact('consent resource origins', true)];
    case 'resource-metadata': return ['api', 'mcp'].map(resource => exact('protected resource metadata', { status: 200, json: true, resource: BASE + (resource === 'api' ? '/blyg/api' : '/blyg/studio/mcp'), authorizationServers: [BASE + '/blyg/studio/auth'], readScope: true, bearerMethods: ['header'] }));
    case 'prompt':
      if (plan.mode === 'anonymous') return [exact('OIDC prompt', { status: 302, origin: new URL(REDIRECT).origin, error: 'login_required', state: 'oracle-state' })];
      return plan.value === 'none' ? [exact('OIDC prompt', { status: 302, origin: new URL(REDIRECT).origin, error: 'consent_required' })] : plan.value === 'login' ? [exact('OIDC prompt', { status: 302, path: '/blyg/studio/login' })] : [authorizationError('invalid_request')];
    case 'registration-defaults': return [exact('registered defaults', { status: 201, ...(plan.mode === 'public' ? { json: true, clientId: true, distinctClient: true, redirectUris: [REDIRECT] } : {}), authentication: plan.mode === 'public' ? 'none' : 'client_secret_basic', grants: ['authorization_code'], responses: ['code'] })];
    case 'advisory': return [exact('OIDC advisory', 200)];
    case 'bridge-age': case 'max-age': return [exact('password authentication required', { status: 302, path: '/blyg/studio/login' })];
    case 'authentication-time': return [approval(), exact('OIDC authentication time', { type: 'number', noLaterThanIssuance: true })];
    case 'offline-consent': return [exact('visible offline explanation', true)];
    case 'reauthentication': return [exact('password continuation redirect', { status: 302, path: '/blyg/studio/login' }), exact('password continuation page', { status: 200, passwordField: true, returnTo: true }), exact('password continuation posted', 302), exact('password continuation resumed', { status: 200, consent: true, handle: true }), exact('password continuation approval', { status: 302, state: 'oracle-state', error: null, code: true }), exact('password continuation exchange', 200)];
    default: throw new Error('Unknown protocol history kind: ' + plan.kind);
  }
}

type Observe = (checkpoint: string, value: unknown) => void;
const authorize = (f: Awaited<ReturnType<typeof flow>>, mutate: (url: URL) => void, cookie = f.owner) => { const url = new URL(f.authorize); mutate(url); return f.request(url.href, { headers: cookie ? { cookie } : {} }); };
async function approved(observe: Observe, options: Parameters<typeof flow>[0] = {}) {
  const f = await flow(options), accepted = await f.decide('browser-a', true), callback = new URL(accepted.headers.get('location')!);
  const code = callback.searchParams.get('code'); observe('authorization approval', { status: accepted.status, error: callback.searchParams.get('error'), code: Boolean(code) });
  return { ...f, code: code! };
}
async function recordAuthorizationError(response: Response, f: Awaited<ReturnType<typeof flow>>, observe: Observe, exactError = true, checkpoint = 'authorization error') {
  const location = response.headers.get('location');
  if (location) {
    const url = new URL(location, f.base), params = url.search ? url.searchParams : new URLSearchParams(url.hash.slice(1));
    observe(checkpoint, { mode: 'callback', target: url.origin + url.pathname, state: params.get('state'), code: params.has('code'), error: exactError ? params.get('error') : typeof params.get('error') });
  } else { const body = await response.json() as { error: unknown }; observe(checkpoint, { mode: 'direct', status: response.status, error: exactError ? body.error : typeof body.error }); }
}
function recordLocalRefusal(response: Response, f: Awaited<ReturnType<typeof flow>>, observe: Observe, includeCode: boolean, checkpoint = 'local authorization refusal') {
  const location = response.headers.get('location');
  if (location) { const url = new URL(location, f.base); observe(checkpoint, { mode: 'redirect', origin: url.origin, ...(includeCode ? { code: url.searchParams.has('code') } : {}) }); }
  else observe(checkpoint, { mode: 'direct', status: response.status });
}
// Event control is inside the production driver; the model sees the elapsed age
// in the plan, never the wall clock or a decoded production claim as authority.
async function driver(plan: Plan, observe: Observe) {
  await withOracleStorage(async () => {
    const timed = ['code-age', 'access-age', 'grant-age', 'bridge-age'].includes(plan.kind);
    const now = Math.floor(Date.now() / 1000) * 1000;
    await withOracleCleanup(async () => {
      if (timed) { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(now); }
      switch (plan.kind) {
        case 'redirect-binding': { const f = await flow(); recordLocalRefusal(await authorize(f, url => url.searchParams.set('redirect_uri', plan.value!)), f, observe, true); break; }
        case 'callback-query': { const f = await flow({ redirect: plan.value }), response = await f.decide('browser-a', true), url = new URL(response.headers.get('location')!); observe('registered callback', { status: response.status, keep: url.searchParams.get('keep'), empty: url.searchParams.has('empty'), state: url.searchParams.get('state'), code: Boolean(url.searchParams.get('code')) }); break; }
        case 'registration-redirect': { const f = await flow(), response = await f.request(f.issuer + '/oauth2/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ redirect_uris: [plan.value], token_endpoint_auth_method: 'none', grant_types: ['authorization_code'], response_types: ['code'] }) }); observe('registration redirect refusal', { status: response.status, error: (await response.json() as { error: unknown }).error }); break; }
        case 'owner-authentication': { const f = await flow(), response = await authorize(f, () => {}, ''), location = new URL(response.headers.get('location')!, f.base); observe('owner login redirect', { status: response.status, origin: location.origin, path: location.pathname }); break; }
        case 'authorization-cardinality': { const f = await flow(); for (const value of [undefined, '']) { const response = await authorize(f, url => value === undefined ? url.searchParams.delete(plan.field!) : url.searchParams.set(plan.field!, value)); if (plan.field === 'client_id') recordLocalRefusal(response, f, observe, false); else await recordAuthorizationError(response, f, observe); } break; }
        case 'authorization-duplicate': { const f = await flow(), response = await authorize(f, url => url.searchParams.append(plan.field!, url.searchParams.get(plan.field!)!)); if (plan.field === 'client_id' && response.headers.get('location')) recordLocalRefusal(response, f, observe, true, 'duplicate client refusal'); else await recordAuthorizationError(response, f, observe, true, plan.field === 'client_id' ? 'duplicate client refusal' : 'authorization error'); break; }
        case 'unknown-extension': { const f = await flow({ authorize: { unknown_oracle_extension: 'ignored' } }), response = await f.decide('browser-a', true), code = new URL(response.headers.get('location')!).searchParams.get('code')!; observe('extension token exchange', (await f.token(code, { unknown_oracle_extension: 'ignored' })).status); break; }
        case 'response-type': case 'pkce-method': case 'resource-binding': { const f = await flow(), response = await authorize(f, url => { const field = plan.kind === 'response-type' ? 'response_type' : plan.kind === 'resource-binding' ? 'resource' : 'code_challenge_method'; if (plan.kind === 'pkce-method' && !plan.value) url.searchParams.delete(field); else url.searchParams.set(field, plan.value!); }); await recordAuthorizationError(response, f, observe, plan.kind !== 'resource-binding'); break; }
        case 'token-cardinality': { const f = await approved(observe), response = await f.token(f.code, { [plan.field!]: '' }), body = await response.json() as { error?: unknown; access_token?: unknown }; observe('empty token request', { status: response.status, error: Boolean(body.error), accessTokenType: typeof body.access_token }); break; }
        case 'token-duplicate': { const f = await approved(observe), body = new URLSearchParams({ grant_type: 'authorization_code', code: f.code, client_id: f.client.client_id, redirect_uri: f.redirect, resource: f.base + '/blyg/api', code_verifier: f.verifier }); body.append(plan.field!, body.get(plan.field!)!); const response = await f.request(f.issuer + '/oauth2/token', { method: 'POST', body }); observe('duplicate token request', { status: response.status, error: (await response.json() as { error: unknown }).error }); break; }
        case 'unknown-code': { const f = await flow(), response = await f.token('unknown-oracle-code'); observe('unknown authorization code', { status: response.status, error: (await response.json() as { error: unknown }).error }); break; }
        case 'code-age': { const f = await approved(observe); vi.setSystemTime(now + plan.age! * 1000); const response = await f.token(f.code); observe('code lifetime', { status: response.status, ...(plan.age! > 600 ? { error: (await response.json() as { error: unknown }).error } : {}) }); break; }
        case 'code-concurrency': { const f = await approved(observe), responses = await Promise.all([f.token(f.code), f.token(f.code)]), refusal = responses.find(response => response.status === 400); observe('concurrent code exchange', { statuses: responses.map(response => response.status).sort(), error: refusal ? (await refusal.json() as { error: unknown }).error : undefined }); break; }
        case 'refresh-bindings': { const f = await approved(observe), initial = await (await f.token(f.code)).json() as { refresh_token: string; scope: string }; const refresh = (fields: Record<string, string> = {}) => f.request(f.issuer + '/oauth2/token', { method: 'POST', body: new URLSearchParams({ grant_type: 'refresh_token', client_id: f.client.client_id, refresh_token: initial.refresh_token, resource: f.base + '/blyg/api', ...fields }) }); const response = await refresh(), scopes = (await response.json() as { scope: string }).scope.split(' ').sort(); observe('refresh original authority', { status: response.status, sameScopes: JSON.stringify(scopes) === JSON.stringify(initial.scope.split(' ').sort()) }); observe('refresh changed audience', (await refresh({ resource: f.base + '/blyg/studio/mcp' })).status); const other = await flow(); observe('refresh changed client', (await refresh({ client_id: other.client.client_id })).status); break; }
        case 'access-age': { const f = await approved(observe), tokens = await (await f.token(f.code)).json() as { access_token: string }; vi.setSystemTime(now + plan.age! * 1000); observe('access lifetime', (await f.request('/blyg/api/settings', { headers: { Authorization: 'Bearer ' + tokens.access_token } })).status); break; }
        case 'grant-age': { const f = await approved(observe), tokens = await (await f.token(f.code)).json() as { refresh_token: string }; vi.setSystemTime(now + plan.age! * 1000); const response = await f.request(f.issuer + '/oauth2/token', { method: 'POST', body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: tokens.refresh_token, client_id: f.client.client_id, resource: f.base + '/blyg/api' }) }); observe('grant lifetime', { status: response.status, ...(plan.age! >= 2592000 ? { error: (await response.json() as { error: unknown }).error } : {}) }); break; }
        case 'consent-denial': { const f = await flow(), response = await f.decide('browser-a', false), callback = new URL(response.headers.get('location')!); observe('consent denial', { forwardsBody: response.status === 307, state: callback.searchParams.get('state'), error: callback.searchParams.get('error'), password: callback.searchParams.has('password'), code: callback.searchParams.has('code') }); break; }
        case 'state-echo': { const f = await flow({ authorize: { state: plan.value! } }), response = await f.decide('browser-a', true); observe('opaque state', new URL(response.headers.get('location')!).searchParams.get('state')); break; }
        case 'code-secrecy': { const f = await approved(observe); observe('code challenge disclosure', f.code.includes(new URL(f.authorize).searchParams.get('code_challenge')!)); break; }
        case 'token-response': { const f = await approved(observe), response = await f.token(f.code), body = await response.json() as Record<string, unknown>; observe('token response', { status: response.status, json: response.headers.get('content-type')?.includes('application/json') ?? false, accessType: typeof body.access_token, refreshType: typeof body.refresh_token, expiryType: typeof body.expires_in, tokenType: String(body.token_type).toLowerCase(), noStore: response.headers.get('cache-control')?.includes('no-store') ?? false, pragma: response.headers.get('pragma') }); break; }
        case 'signature': { const f = await approved(observe), response = await f.token(f.code), tokens = await response.json() as { access_token: string }, parts = tokens.access_token.split('.'); parts[2] = (parts[2][0] === 'A' ? 'B' : 'A') + parts[2].slice(1); const bad = await f.request('/blyg/api/settings', { headers: { Authorization: 'Bearer ' + parts.join('.') } }); observe('corrupt signature receiving', { status: bad.status, protectedField: 'site_title' in Object(await bad.json()) }); break; }
        case 'challenge': { const f = await approved(observe), tokens = await (await f.token(f.code)).json() as { access_token: string }; const requests: [string, string, RequestInit][] = [['missing', '/blyg/api/settings', {}], ['invalid', '/blyg/api/settings', { headers: { Authorization: 'Bearer bad-oracle-token' } }], ['insufficient', '/blyg/api/items/missing/publish', { method: 'POST', headers: { Authorization: 'Bearer ' + tokens.access_token, 'Content-Type': 'application/json' }, body: '{}' }]]; for (const [kind, path, init] of requests) { const response = await f.request(path, init), header = response.headers.get('www-authenticate') ?? '', attributes = [...header.matchAll(/([a-z_]+)="([^"\\]*)"/g)], names = attributes.map(match => match[1]); observe('Bearer challenge', { kind, status: response.status, bearer: header.startsWith('Bearer '), uniqueAttributes: new Set(names).size === names.length, asciiValues: attributes.every(([, , value]) => /^[\x20-\x7E]*$/.test(value)), resourceOrigins: attributes.filter(([, name]) => name === 'resource_metadata').every(([, , value]) => new URL(value).origin === f.base), ...(kind === 'insufficient' ? { insufficient: header.includes('error="insufficient_scope"') } : kind === 'missing' ? { errorAbsent: !header.includes('error=') } : {}) }); } break; }
        case 'page-origin': { const f = await flow(), response = await f.request(f.authorize, { headers: { cookie: f.owner } }), html = await response.text(); observe('consent resource origins', [...html.matchAll(/(?:href|src)="([^"]+)"/g)].every(([, value]) => new URL(value, f.base).origin === f.base)); break; }
        case 'resource-metadata': { const f = await flow(); for (const name of ['api', 'mcp']) { const response = await f.request(f.issuer + '/resources/' + name), body = await response.json() as { resource: unknown; authorization_servers: unknown; scopes_supported?: unknown[]; bearer_methods_supported: unknown }; observe('protected resource metadata', { status: response.status, json: response.headers.get('content-type')?.includes('application/json') ?? false, resource: body.resource, authorizationServers: body.authorization_servers, readScope: body.scopes_supported?.includes('owner:read') ?? false, bearerMethods: body.bearer_methods_supported }); } break; }
        case 'prompt': { const f = await flow({ scope: 'openid owner:read owner:draft' }), response = await authorize(f, url => url.searchParams.set('prompt', plan.value!), plan.mode === 'anonymous' ? '' : f.owner); if (plan.value === 'none') { const callback = new URL(response.headers.get('location')!, f.base); observe('OIDC prompt', { status: response.status, origin: callback.origin, error: callback.searchParams.get('error'), ...(plan.mode === 'anonymous' ? { state: callback.searchParams.get('state') } : {}) }); } else if (plan.value === 'login') observe('OIDC prompt', { status: response.status, path: new URL(response.headers.get('location')!, f.base).pathname }); else await recordAuthorizationError(response, f, observe); break; }
        case 'registration-defaults': { const f = await flow(), response = await f.request(f.issuer + '/oauth2/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ redirect_uris: [f.redirect], ...(plan.mode === 'public' ? { token_endpoint_auth_method: 'none', unknown_oracle_metadata: 'ignored' } : {}) }) }), client = await response.json() as Record<string, unknown>; observe('registered defaults', { status: response.status, ...(plan.mode === 'public' ? { json: response.headers.get('content-type')?.includes('application/json') ?? false, clientId: Boolean(client.client_id), distinctClient: client.client_id !== f.client.client_id, redirectUris: client.redirect_uris } : {}), authentication: client.token_endpoint_auth_method, grants: client.grant_types, responses: client.response_types }); break; }
        case 'advisory': { const f = await flow({ scope: 'openid owner:read owner:draft' }), value = plan.field === 'display' ? 'page' : plan.field === 'acr_values' ? 'urn:oracle:unsupported-acr' : 'en'; observe('OIDC advisory', (await authorize(f, url => url.searchParams.set(plan.field!, value))).status); break; }
        case 'bridge-age': case 'max-age': { const f = await flow({ scope: 'openid owner:read owner:draft' }); if (plan.kind === 'bridge-age') vi.setSystemTime(now + 2000); const response = await authorize(f, url => url.searchParams.set('max_age', plan.kind === 'bridge-age' ? '1' : '0'), f.owner + (plan.kind === 'bridge-age' ? '; ' + f.binding : '')); observe('password authentication required', { status: response.status, path: new URL(response.headers.get('location')!, f.base).pathname }); break; }
        case 'authentication-time': { const f = await approved(observe, { scope: 'openid owner:read owner:draft', authorize: { claims: JSON.stringify({ id_token: { auth_time: { essential: true } } }) } }), tokens = await (await f.token(f.code)).json() as { id_token: string }, payload = JSON.parse(atob(tokens.id_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))); observe('OIDC authentication time', { type: typeof payload.auth_time, noLaterThanIssuance: payload.auth_time <= payload.iat }); break; }
        case 'offline-consent': { const f = await flow({ scope: 'openid offline_access owner:read owner:draft' }), response = await f.request(f.authorize, { headers: { cookie: f.owner } }), visible = (await response.text()).replace(/<input[^>]*>/g, '').replace(/<[^>]*>/g, ' '); observe('visible offline explanation', /offline|when you are away|when you are not using/i.test(visible)); break; }
        case 'reauthentication': {
          const f = await flow({ scope: 'openid owner:read owner:draft' }), cookie = f.owner + '; ' + f.binding;
          const response = await authorize(f, url => plan.value === 'login' ? url.searchParams.set('prompt', 'login') : url.searchParams.set('max_age', '0'), cookie), loginURL = new URL(response.headers.get('location')!, f.base); observe('password continuation redirect', { status: response.status, path: loginURL.pathname });
          const page = await f.request(loginURL.href, { headers: { cookie } }), html = await page.text(), returnTo = html.match(/name="return_to" value="([^"]+)"/)?.[1].replaceAll('&amp;', '&'); observe('password continuation page', { status: page.status, passwordField: html.includes('type="password"'), returnTo: Boolean(returnTo) });
          const fields = new URLSearchParams({ password: env.OWNER_PASSWORD, return_to: returnTo! });
          for (const [input] of html.matchAll(/<input[^>]*>/g)) { if (!input.includes('type="hidden"')) continue; const name = input.match(/name="([^"]+)"/)?.[1], value = input.match(/value="([^"]*)"/)?.[1]; if (name && value !== undefined) fields.set(name, value.replaceAll('&amp;', '&').replaceAll('&quot;', '"').replaceAll('&#39;', "'")); }
          const posted = await f.request('/blyg/studio/login', { method: 'POST', headers: { cookie, Origin: f.base }, body: fields }); observe('password continuation posted', posted.status);
          const cookies = new Map(cookie.split('; ').map(value => [value.split('=')[0], value]));
          for (const value of posted.headers.getSetCookie()) { const entry = value.split(';')[0]; cookies.set(entry.split('=')[0], entry); }
          const resumed = await f.request(new URL(posted.headers.get('location')!, f.base).href, { headers: { cookie: [...cookies.values()].join('; ') } }), consent = await resumed.text(), handle = consent.match(/name="handle" value="([^"]+)"/)?.[1]; observe('password continuation resumed', { status: resumed.status, consent: consent.includes('Allow'), handle: Boolean(handle) });
          for (const value of resumed.headers.getSetCookie()) { const entry = value.split(';')[0]; cookies.set(entry.split('=')[0], entry); }
          const decision = await f.request(f.issuer + '/consent', { method: 'POST', headers: { cookie: [...cookies.values()].join('; '), Origin: f.base }, body: new URLSearchParams([['handle', handle!], ['decision', 'allow'], ['scope', 'owner:read'], ['scope', 'owner:draft']]) }), callback = new URL(decision.headers.get('location')!); observe('password continuation approval', { status: decision.status, state: callback.searchParams.get('state'), error: callback.searchParams.get('error'), code: Boolean(callback.searchParams.get('code')) }); observe('password continuation exchange', (await f.token(callback.searchParams.get('code')!)).status);
          break;
        }
        default: throw new Error('Unknown protocol history kind: ' + plan.kind);
      }
    }, [async () => { if (timed) vi.useRealTimers(); }]);
  });
  observe('protocol history complete', true);
}

function checkProtocol(_plan: Plan, trace: readonly Observation[], expected: readonly Expected[]) {
  const entries = trace.filter(entry => entry.checkpoint !== 'protocol history complete');
  for (let index = 0; index < entries.length; index++) {
    const wanted = expected[index], actual = entries[index];
    if (wanted?.alternatives.some(value => differs(wanted.checkpoint, 'protocol bindings', actual, { checkpoint: wanted.checkpoint, value }) === undefined)) continue;
    return differs(wanted?.checkpoint ?? actual.checkpoint, 'protocol bindings', actual, { checkpoint: wanted?.checkpoint, value: wanted?.alternatives })!;
  }
  const completion = trace.filter(entry => entry.checkpoint === 'protocol history complete');
  if (completion.length) return differs('protocol history completion marker', 'protocol bindings', completion.map(entry => entry.value), [true]) ?? differs('protocol history completion', 'protocol bindings', entries.length, expected.length) ?? pass;
  return pass; // Setup/cleanup failures remain driver failures for valid prefixes.
}

oracleProperty({
  id: "oauth-validation", owns: ['src/oauth.ts', 'src/oauth-routes.ts'],
  law: { statement: "For every declared request history, authorization never sends a code to an unregistered exact callback URI.", authority: "RFC6749 §4.1.2.1", limits: "Original finite redirect-binding histories and receiving checkpoints; not complete OAuth/OIDC conformance or arbitrary schedules." },
  histories: histories.filter(plan => ['redirect-binding'].includes(plan.kind)), label: plan => plan.name, model, driver,
  check: checkProtocol,
  calibrations: [{ name: "unregistered callback receives code", law: "protocol bindings", history: { enumerated: 0 }, corrupt: trace => trace.map(entry => entry.checkpoint === "local authorization refusal" ? { ...entry, value: { mode: 'redirect', origin: 'https://evil.example', code: true } } : entry) }],
});

oracleProperty({
  id: "oauth-validation-callback", owns: ['src/oauth.ts', 'src/oauth-routes.ts'],
  law: { statement: "For every declared request history, completed consent callbacks preserve the exact opaque state and registered query parameters without forwarding owner credentials or using a 307 redirect.", authority: "RFC6749 §4.1; docs/oauth-protocol-hardening.md", limits: "Original finite callback-query, consent-denial, state-echo histories and receiving checkpoints; not complete OAuth/OIDC conformance or arbitrary schedules." },
  histories: histories.filter(plan => ['callback-query', 'consent-denial', 'state-echo'].includes(plan.kind)), label: plan => plan.name, model, driver,
  check: checkProtocol,
  calibrations: [{ name: "registered callback loses state", law: "protocol bindings", history: { enumerated: 0 }, corrupt: trace => trace.map(entry => entry.checkpoint === "registered callback" ? { ...entry, value: { status: 302, keep: 'a+b', empty: true, state: 'changed', code: true } } : entry) }],
});

oracleProperty({
  id: "oauth-validation-registration-redirect", owns: ['src/oauth.ts', 'src/oauth-routes.ts'],
  law: { statement: "For every declared request history, registration rejects relative, fragment-bearing or remote cleartext redirect URIs.", authority: "RFC7591 §2; docs/oauth-protocol-hardening.md", limits: "Original finite registration-redirect histories and receiving checkpoints; not complete OAuth/OIDC conformance or arbitrary schedules." },
  histories: histories.filter(plan => ['registration-redirect'].includes(plan.kind)), label: plan => plan.name, model, driver,
  check: checkProtocol,
  calibrations: [{ name: "invalid callback registration succeeds", law: "protocol bindings", history: { enumerated: 0 }, corrupt: trace => trace.map(entry => entry.checkpoint === "registration redirect refusal" ? { ...entry, value: { status: 201, error: 'invalid_redirect_uri' } } : entry) }],
});

oracleProperty({
  id: "oauth-validation-owner-authentication", owns: ['src/oauth.ts', 'src/oauth-routes.ts'],
  law: { statement: "For every declared request history, an unauthenticated authorization request goes to the mounted owner login before consent can be produced.", authority: "docs/client-access.md owner authentication", limits: "Original finite owner-authentication histories and receiving checkpoints; not complete OAuth/OIDC conformance or arbitrary schedules." },
  histories: histories.filter(plan => ['owner-authentication'].includes(plan.kind)), label: plan => plan.name, model, driver,
  check: checkProtocol,
  calibrations: [{ name: "anonymous authorization displays consent", law: "protocol bindings", history: { enumerated: 0 }, corrupt: trace => trace.map(entry => entry.checkpoint === "owner login redirect" ? { ...entry, value: { status: 200, origin: BASE, path: '/blyg/studio/login' } } : entry) }],
});

oracleProperty({
  id: "oauth-validation-authorization-fields", owns: ['src/oauth.ts', 'src/oauth-routes.ts'],
  law: { statement: "For every declared request history, missing, empty or duplicate required authorization fields are refused without issuing a code or trusting an ambiguous client callback.", authority: "RFC6749 §4.1.2.1; docs/oauth-protocol-hardening.md", limits: "Original finite authorization-cardinality, authorization-duplicate histories and receiving checkpoints; not complete OAuth/OIDC conformance or arbitrary schedules." },
  histories: histories.filter(plan => ['authorization-cardinality', 'authorization-duplicate'].includes(plan.kind)), label: plan => plan.name, model, driver,
  check: checkProtocol,
  calibrations: [{ name: "malformed authorization issues code", law: "protocol bindings", history: { enumerated: 0 }, corrupt: trace => trace.map(entry => entry.checkpoint === "authorization error" ? { ...entry, value: { mode: 'callback', target: REDIRECT, state: 'oracle-state', code: true, error: 'invalid_request' } } : entry) }],
});

oracleProperty({
  id: "oauth-validation-extension-parameters", owns: ['src/oauth.ts', 'src/oauth-routes.ts'],
  law: { statement: "For every declared request history, unknown authorization and token parameters leave an otherwise valid code exchange successful.", authority: "RFC6749 §§4.1.1/4.1.3", limits: "Original finite unknown-extension histories and receiving checkpoints; not complete OAuth/OIDC conformance or arbitrary schedules." },
  histories: histories.filter(plan => ['unknown-extension'].includes(plan.kind)), label: plan => plan.name, model, driver,
  check: checkProtocol,
  calibrations: [{ name: "unknown extension blocks exchange", law: "protocol bindings", history: { enumerated: 0 }, corrupt: trace => trace.map(entry => entry.checkpoint === "extension token exchange" ? { ...entry, value: 400 } : entry) }],
});

oracleProperty({
  id: "oauth-validation-response-type", owns: ['src/oauth.ts', 'src/oauth-routes.ts'],
  law: { statement: "For every declared request history, unsupported authorization response types return unsupported_response_type without issuing credentials.", authority: "RFC6749 §4.1.2.1", limits: "Original finite response-type histories and receiving checkpoints; not complete OAuth/OIDC conformance or arbitrary schedules." },
  histories: histories.filter(plan => ['response-type'].includes(plan.kind)), label: plan => plan.name, model, driver,
  check: checkProtocol,
  calibrations: [{ name: "unsupported response type issues code", law: "protocol bindings", history: { enumerated: 0 }, corrupt: trace => trace.map(entry => entry.checkpoint === "authorization error" ? { ...entry, value: { mode: 'callback', target: REDIRECT, state: 'oracle-state', code: true, error: 'unsupported_response_type' } } : entry) }],
});

oracleProperty({
  id: "oauth-validation-pkce", owns: ['src/oauth.ts', 'src/oauth-routes.ts'],
  law: { statement: "For every declared request history, an authorization request cannot downgrade or omit the required S256 challenge method.", authority: "docs/oauth-protocol-hardening.md S256 profile", limits: "Original finite pkce-method histories and receiving checkpoints; not complete OAuth/OIDC conformance or arbitrary schedules." },
  histories: histories.filter(plan => ['pkce-method'].includes(plan.kind)), label: plan => plan.name, model, driver,
  check: checkProtocol,
  calibrations: [{ name: "PKCE downgrade issues code", law: "protocol bindings", history: { enumerated: 0 }, corrupt: trace => trace.map(entry => entry.checkpoint === "authorization error" ? { ...entry, value: { mode: 'callback', target: REDIRECT, state: 'oracle-state', code: true, error: 'invalid_request' } } : entry) }],
});

oracleProperty({
  id: "oauth-validation-token-fields", owns: ['src/oauth.ts', 'src/oauth-routes.ts'],
  law: { statement: "For every declared request history, empty or duplicate required token fields fail without minting access credentials.", authority: "RFC6749 §5.2; docs/oauth-protocol-hardening.md", limits: "Original finite token-cardinality, token-duplicate histories and receiving checkpoints; not complete OAuth/OIDC conformance or arbitrary schedules." },
  histories: histories.filter(plan => ['token-cardinality', 'token-duplicate'].includes(plan.kind)), label: plan => plan.name, model, driver,
  check: checkProtocol,
  calibrations: [{ name: "empty token request mints credentials", law: "protocol bindings", history: { enumerated: 0 }, corrupt: trace => trace.map(entry => entry.checkpoint === "empty token request" ? { ...entry, value: { status: 200, error: false, accessTokenType: 'string' } } : entry) }],
});

oracleProperty({
  id: "oauth-validation-unknown-code", owns: ['src/oauth.ts', 'src/oauth-routes.ts'],
  law: { statement: "For every declared request history, an unknown authorization code returns invalid_grant.", authority: "RFC6749 §5.2", limits: "Original finite unknown-code histories and receiving checkpoints; not complete OAuth/OIDC conformance or arbitrary schedules." },
  histories: histories.filter(plan => ['unknown-code'].includes(plan.kind)), label: plan => plan.name, model, driver,
  check: checkProtocol,
  calibrations: [{ name: "unknown code is accepted", law: "protocol bindings", history: { enumerated: 0 }, corrupt: trace => trace.map(entry => entry.checkpoint === "unknown authorization code" ? { ...entry, value: { status: 200, error: 'invalid_grant' } } : entry) }],
});

oracleProperty({
  id: "oauth-validation-code-expiry", owns: ['src/oauth.ts', 'src/oauth-routes.ts'],
  law: { statement: "For every declared request history, an issued authorization code exchanges through age 600 seconds and returns invalid_grant at age 601 seconds.", authority: "docs/oauth-protocol-hardening.md native short-code lifetime", limits: "Original finite code-age histories and receiving checkpoints; not complete OAuth/OIDC conformance or arbitrary schedules." },
  histories: histories.filter(plan => ['code-age'].includes(plan.kind)), label: plan => plan.name, model, driver,
  check: checkProtocol,
  calibrations: [{ name: "live code rejected at boundary", law: "protocol bindings", history: { enumerated: 0 }, corrupt: trace => trace.map(entry => entry.checkpoint === "code lifetime" ? { ...entry, value: { status: 400, error: 'invalid_grant' } } : entry) }],
});

oracleProperty({
  id: "oauth-validation-code-once", owns: ['src/oauth.ts', 'src/oauth-routes.ts'],
  law: { statement: "For every declared request history, two concurrent exchanges of one authorization code yield exactly one credential issuance and one invalid_grant refusal.", authority: "RFC6749 §4.1.2", limits: "Original finite code-concurrency histories and receiving checkpoints; not complete OAuth/OIDC conformance or arbitrary schedules." },
  histories: histories.filter(plan => ['code-concurrency'].includes(plan.kind)), label: plan => plan.name, model, driver,
  check: checkProtocol,
  calibrations: [{ name: "authorization code exchanges twice", law: "protocol bindings", history: { enumerated: 0 }, corrupt: trace => trace.map(entry => entry.checkpoint === "concurrent code exchange" ? { ...entry, value: { statuses: [200, 200], error: 'invalid_grant' } } : entry) }],
});

oracleProperty({
  id: "oauth-validation-resource", owns: ['src/oauth.ts', 'src/oauth-routes.ts'],
  law: { statement: "For every declared request history, malformed, fragment-bearing or foreign resource requests fail without granting authority.", authority: "docs/oauth-protocol-hardening.md resource binding", limits: "Original finite resource-binding histories and receiving checkpoints; not complete OAuth/OIDC conformance or arbitrary schedules." },
  histories: histories.filter(plan => ['resource-binding'].includes(plan.kind)), label: plan => plan.name, model, driver,
  check: checkProtocol,
  calibrations: [{ name: "foreign resource receives code", law: "protocol bindings", history: { enumerated: 0 }, corrupt: trace => trace.map(entry => entry.checkpoint === "authorization error" ? { ...entry, value: { mode: 'callback', target: REDIRECT, state: 'oracle-state', code: true, error: 'string' } } : entry) }],
});

oracleProperty({
  id: "oauth-validation-refresh", owns: ['src/oauth.ts', 'src/oauth-routes.ts'],
  law: { statement: "For every declared request history, refresh with omitted scope preserves the original scopes while a changed audience or client is refused.", authority: "RFC6749 §6; docs/oauth-protocol-hardening.md", limits: "Original finite refresh-bindings histories and receiving checkpoints; not complete OAuth/OIDC conformance or arbitrary schedules." },
  histories: histories.filter(plan => ['refresh-bindings'].includes(plan.kind)), label: plan => plan.name, model, driver,
  check: checkProtocol,
  calibrations: [{ name: "refresh changes audience", law: "protocol bindings", history: { enumerated: 0 }, corrupt: trace => trace.map(entry => entry.checkpoint === "refresh changed audience" ? { ...entry, value: 200 } : entry) }],
});

oracleProperty({
  id: "oauth-validation-access-expiry", owns: ['src/oauth.ts', 'src/oauth-routes.ts'],
  law: { statement: "For every declared request history, OAuth-issued access is accepted at age 3599 seconds and denied at age 3600 seconds.", authority: "docs/oauth-protocol-hardening.md access-token lifetime", limits: "Original finite access-age histories and receiving checkpoints; not complete OAuth/OIDC conformance or arbitrary schedules." },
  histories: histories.filter(plan => ['access-age'].includes(plan.kind)), label: plan => plan.name, model, driver,
  check: checkProtocol,
  calibrations: [{ name: "live access token rejected", law: "protocol bindings", history: { enumerated: 0 }, corrupt: trace => trace.map(entry => entry.checkpoint === "access lifetime" ? { ...entry, value: 401 } : entry) }],
});

oracleProperty({
  id: "oauth-validation-grant-expiry", owns: ['src/oauth.ts', 'src/oauth-routes.ts'],
  law: { statement: "For every declared request history, OAuth refresh authority expires at the fixed thirty-day grant deadline.", authority: "docs/oauth-protocol-hardening.md fixed grant deadline", limits: "Original finite grant-age histories and receiving checkpoints; not complete OAuth/OIDC conformance or arbitrary schedules." },
  histories: histories.filter(plan => ['grant-age'].includes(plan.kind)), label: plan => plan.name, model, driver,
  check: checkProtocol,
  calibrations: [{ name: "live grant rejected", law: "protocol bindings", history: { enumerated: 0 }, corrupt: trace => trace.map(entry => entry.checkpoint === "grant lifetime" ? { ...entry, value: { status: 400, error: 'invalid_grant' } } : entry) }],
});

oracleProperty({
  id: "oauth-validation-code-secrecy", owns: ['src/oauth.ts', 'src/oauth-routes.ts'],
  law: { statement: "For every declared request history, an issued authorization code does not disclose its PKCE challenge.", authority: "docs/oauth-protocol-hardening.md code secrecy", limits: "Original finite code-secrecy histories and receiving checkpoints; not complete OAuth/OIDC conformance or arbitrary schedules." },
  histories: histories.filter(plan => ['code-secrecy'].includes(plan.kind)), label: plan => plan.name, model, driver,
  check: checkProtocol,
  calibrations: [{ name: "code discloses challenge", law: "protocol bindings", history: { enumerated: 0 }, corrupt: trace => trace.map(entry => entry.checkpoint === "code challenge disclosure" ? { ...entry, value: true } : entry) }],
});

oracleProperty({
  id: "oauth-validation-token-response", owns: ['src/oauth.ts', 'src/oauth-routes.ts'],
  law: { statement: "For every declared request history, a successful token response has typed credential and expiry fields, Bearer token type, and both no-store and no-cache response directives.", authority: "RFC6749 §5.1", limits: "Original finite token-response histories and receiving checkpoints; not complete OAuth/OIDC conformance or arbitrary schedules." },
  histories: histories.filter(plan => ['token-response'].includes(plan.kind)), label: plan => plan.name, model, driver,
  check: checkProtocol,
  calibrations: [{ name: "token response is cacheable", law: "protocol bindings", history: { enumerated: 0 }, corrupt: trace => trace.map(entry => entry.checkpoint === "token response" ? { ...entry, value: { status: 200, json: true, accessType: 'string', refreshType: 'string', expiryType: 'number', tokenType: 'bearer', noStore: false, pragma: 'no-cache' } } : entry) }],
});

oracleProperty({
  id: "oauth-validation-signature", owns: ['src/oauth.ts', 'src/oauth-routes.ts'],
  law: { statement: "For every declared request history, a mutated access-token signature is denied before protected data is returned.", authority: "RFC9068 §4", limits: "Original finite signature histories and receiving checkpoints; not complete OAuth/OIDC conformance or arbitrary schedules." },
  histories: histories.filter(plan => ['signature'].includes(plan.kind)), label: plan => plan.name, model, driver,
  check: checkProtocol,
  calibrations: [{ name: "bad signature exposes protected data", law: "protocol bindings", history: { enumerated: 0 }, corrupt: trace => trace.map(entry => entry.checkpoint === "corrupt signature receiving" ? { ...entry, value: { status: 200, protectedField: true } } : entry) }],
});

oracleProperty({
  id: "oauth-validation-challenge", owns: ['src/oauth.ts', 'src/oauth-routes.ts'],
  law: { statement: "For every declared request history, missing, invalid and insufficient credentials receive valid nonduplicated ASCII Bearer challenge attributes, with local resource metadata and the owed error classification.", authority: "RFC6750 §3", limits: "Original finite challenge histories and receiving checkpoints; not complete OAuth/OIDC conformance or arbitrary schedules." },
  histories: histories.filter(plan => ['challenge'].includes(plan.kind)), label: plan => plan.name, model, driver,
  check: checkProtocol,
  calibrations: [{ name: "missing credential challenge is malformed", law: "protocol bindings", history: { enumerated: 0 }, corrupt: trace => trace.map(entry => entry.checkpoint === "Bearer challenge" ? { ...entry, value: { kind: 'missing', status: 401, bearer: false, uniqueAttributes: true, asciiValues: true, resourceOrigins: true, errorAbsent: true } } : entry) }],
});

oracleProperty({
  id: "oauth-validation-page-origin", owns: ['src/oauth.ts', 'src/oauth-routes.ts'],
  law: { statement: "For every declared request history, authorization page resources stay on the owner origin.", authority: "docs/oauth-protocol-hardening.md consent-page isolation", limits: "Original finite page-origin histories and receiving checkpoints; not complete OAuth/OIDC conformance or arbitrary schedules." },
  histories: histories.filter(plan => ['page-origin'].includes(plan.kind)), label: plan => plan.name, model, driver,
  check: checkProtocol,
  calibrations: [{ name: "consent loads foreign resource", law: "protocol bindings", history: { enumerated: 0 }, corrupt: trace => trace.map(entry => entry.checkpoint === "consent resource origins" ? { ...entry, value: false } : entry) }],
});

oracleProperty({
  id: "oauth-validation-resource-metadata", owns: ['src/oauth.ts', 'src/oauth-routes.ts'],
  law: { statement: "For every declared request history, each REST or MCP resource metadata response names its mounted resource, authorization server, supported read scope and header bearer method.", authority: "docs/oauth-protocol-hardening.md protected resource metadata profile", limits: "Original finite resource-metadata histories and receiving checkpoints; not complete OAuth/OIDC conformance or arbitrary schedules." },
  histories: histories.filter(plan => ['resource-metadata'].includes(plan.kind)), label: plan => plan.name, model, driver,
  check: checkProtocol,
  calibrations: [{ name: "metadata omits read scope", law: "protocol bindings", history: { enumerated: 0 }, corrupt: trace => trace.map(entry => entry.checkpoint === "protected resource metadata" ? { ...entry, value: { status: 200, json: true, resource: BASE + '/blyg/api', authorizationServers: [BASE + '/blyg/studio/auth'], readScope: false, bearerMethods: ['header'] } } : entry) }],
});

oracleProperty({
  id: "oauth-validation-prompt", owns: ['src/oauth.ts', 'src/oauth-routes.ts'],
  law: { statement: "For every declared request history, OIDC prompt none returns an authentication or consent error without a login page; prompt login requests password authentication and conflicting prompts fail.", authority: "OIDC Core AuthRequest prompt", limits: "Original finite prompt histories and receiving checkpoints; not complete OAuth/OIDC conformance or arbitrary schedules." },
  histories: histories.filter(plan => ['prompt'].includes(plan.kind)), label: plan => plan.name, model, driver,
  check: checkProtocol,
  calibrations: [{ name: "silent anonymous request displays page", law: "protocol bindings", history: { enumerated: 0 }, corrupt: trace => trace.map(entry => entry.checkpoint === "OIDC prompt" ? { ...entry, value: { status: 200, origin: new URL(REDIRECT).origin, error: 'login_required', state: 'oracle-state' } } : entry) }],
});

oracleProperty({
  id: "oauth-validation-registration-defaults", owns: ['src/oauth.ts', 'src/oauth-routes.ts'],
  law: { statement: "For every declared request history, dynamic registration ignores unknown metadata, returns authoritative client metadata, and defaults omitted client authentication to client_secret_basic.", authority: "RFC7591 §§2/3.2.1", limits: "Original finite registration-defaults histories and receiving checkpoints; not complete OAuth/OIDC conformance or arbitrary schedules." },
  histories: histories.filter(plan => ['registration-defaults'].includes(plan.kind)), label: plan => plan.name, model, driver,
  check: checkProtocol,
  calibrations: [{ name: "public registration changes authentication", law: "protocol bindings", history: { enumerated: 0 }, corrupt: trace => trace.map(entry => entry.checkpoint === "registered defaults" ? { ...entry, value: { status: 201, json: true, clientId: true, distinctClient: true, redirectUris: [REDIRECT], authentication: 'client_secret_basic', grants: ['authorization_code'], responses: ['code'] } } : entry) }],
});

oracleProperty({
  id: "oauth-validation-advisory", owns: ['src/oauth.ts', 'src/oauth-routes.ts'],
  law: { statement: "For every declared request history, OIDC advisory display, locale and ACR values do not demand unsupported profiles or block ordinary consent.", authority: "OIDC Core AuthRequest advisory parameters", limits: "Original finite advisory histories and receiving checkpoints; not complete OAuth/OIDC conformance or arbitrary schedules." },
  histories: histories.filter(plan => ['advisory'].includes(plan.kind)), label: plan => plan.name, model, driver,
  check: checkProtocol,
  calibrations: [{ name: "advisory request is refused", law: "protocol bindings", history: { enumerated: 0 }, corrupt: trace => trace.map(entry => entry.checkpoint === "OIDC advisory" ? { ...entry, value: 400 } : entry) }],
});

oracleProperty({
  id: "oauth-validation-authentication-age", owns: ['src/oauth.ts', 'src/oauth-routes.ts'],
  law: { statement: "For every declared request history, recreating a provider bridge does not refresh password authentication age, and max_age zero requires password authentication despite an owner session.", authority: "OIDC Core AuthRequest max_age; docs/oauth-protocol-hardening.md", limits: "Original finite bridge-age, max-age histories and receiving checkpoints; not complete OAuth/OIDC conformance or arbitrary schedules." },
  histories: histories.filter(plan => ['bridge-age', 'max-age'].includes(plan.kind)), label: plan => plan.name, model, driver,
  check: checkProtocol,
  calibrations: [{ name: "stale password age displays ordinary consent", law: "protocol bindings", history: { enumerated: 0 }, corrupt: trace => trace.map(entry => entry.checkpoint === "password authentication required" ? { ...entry, value: { status: 200, path: '/blyg/studio/login' } } : entry) }],
});

oracleProperty({
  id: "oauth-validation-authentication-time", owns: ['src/oauth.ts', 'src/oauth-routes.ts'],
  law: { statement: "For every declared request history, an essential auth_time request includes numeric owner authentication time no later than token issuance.", authority: "OIDC Core AuthRequest claims/auth_time", limits: "Original finite authentication-time histories and receiving checkpoints; not complete OAuth/OIDC conformance or arbitrary schedules." },
  histories: histories.filter(plan => ['authentication-time'].includes(plan.kind)), label: plan => plan.name, model, driver,
  check: checkProtocol,
  calibrations: [{ name: "authentication time follows issuance", law: "protocol bindings", history: { enumerated: 0 }, corrupt: trace => trace.map(entry => entry.checkpoint === "OIDC authentication time" ? { ...entry, value: { type: 'number', noLaterThanIssuance: false } } : entry) }],
});

oracleProperty({
  id: "oauth-validation-offline-consent", owns: ['src/oauth.ts', 'src/oauth-routes.ts'],
  law: { statement: "For every declared request history, offline access has a visible explanation before the owner grants it.", authority: "OIDC Core OfflineAccess", limits: "Original finite offline-consent histories and receiving checkpoints; not complete OAuth/OIDC conformance or arbitrary schedules." },
  histories: histories.filter(plan => ['offline-consent'].includes(plan.kind)), label: plan => plan.name, model, driver,
  check: checkProtocol,
  calibrations: [{ name: "offline consent has no explanation", law: "protocol bindings", history: { enumerated: 0 }, corrupt: trace => trace.map(entry => entry.checkpoint === "visible offline explanation" ? { ...entry, value: false } : entry) }],
});

oracleProperty({
  id: "oauth-validation-reauthentication", owns: ['src/oauth.ts', 'src/oauth-routes.ts'],
  law: { statement: "For every declared request history, password reauthentication resumes the pending prompt login or max_age consent request and completes a bound code exchange.", authority: "OIDC Core AuthRequest; docs/oauth-protocol-hardening.md password continuation", limits: "Original finite reauthentication histories and receiving checkpoints; not complete OAuth/OIDC conformance or arbitrary schedules." },
  histories: histories.filter(plan => ['reauthentication'].includes(plan.kind)), label: plan => plan.name, model, driver,
  check: checkProtocol,
  calibrations: [{ name: "password continuation loses consent", law: "protocol bindings", history: { enumerated: 0 }, corrupt: trace => trace.map(entry => entry.checkpoint === "password continuation resumed" ? { ...entry, value: { status: 200, consent: false, handle: true } } : entry) }],
});
