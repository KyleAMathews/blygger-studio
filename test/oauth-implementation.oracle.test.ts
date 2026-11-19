/** PKCE syntax is independent of its hash binding, and rebuilding an owner
 * session preserves authentication age. The mounted public OAuth routes receive
 * these promises at authorization, token, continuation and metadata responses.
 *
 * token(hashBoundMalformedVerifier) // → invalid_request
 * authorize(max_age=3600, authenticationAge=7200) // → password login
 * continue(passwordCheckedInSameSecond) // → usable consent
 *
 * RFC7636 §§4.1–4.2 defines syntax; OIDC Core AuthRequest defines prompt/max_age;
 * RFC9700 §4.14.2 motivates the selected rotation/replay contract. For every
 * finite input history the model derives syntax, authentication and endpoint
 * policy from semantic request facts. Hashing in the driver supplies an input,
 * never an expected answer. A rotation race allows zero or one winner, while
 * settled reuse must deny descendants and protected access. The driver records
 * response/cookie/session observations and releases controlled clocks in finally.
 * These are the original fixed schedules, not every distributed race or optional
 * OIDC profile. Mounted metadata does not establish host-root RFC8414/9728.
 */
import { vi } from 'vitest';
import { env } from 'cloudflare:test';
import { differs, oracleProperty, pass } from '@tanstack/oracles';
import { flow } from './oauth-flow-driver.ts';
import { withOracleStorage } from './oracle-storage.ts';
type Action = { op: 'pkce'; stage: 'challenge' | 'verifier' | 'exchange'; value: string } | { op: 'consent'; offline: boolean } | { op: 'rotation'; requests: number } | { op: 'register'; scope: string } | { op: 'discovery'; resource: 'issuer' | 'mcp' } | { op: 'authentication'; age: number; maximumAge: number } | { op: 'continuation'; mode: 'login' | 'max_age'; offset: number } | { op: 'signed-query'; method: 'get' | 'post'; signature: string } | { op: 'origin'; foreign: boolean; crossSite: boolean } | { op: 'administration'; path: string };
type Plan = { name: string; action: Action };
const malformed = ['short', 'a'.repeat(129), 'a'.repeat(42) + '!'];
const histories: Plan[] = [
  ...malformed.map(value => ({ name: `rejects malformed PKCE authorization challenge grammar ${value}`, action: { op: 'pkce', stage: 'challenge', value } as Action })),
  ...malformed.map(value => ({ name: `rejects malformed verifier even when its S256 hash matches the bound challenge ${value}`, action: { op: 'pkce', stage: 'verifier', value } as Action })),
  ...[true, false].map(offline => ({ name: `shows the grant lifetime and discloses offline consent only when requested (${offline})`, action: { op: 'consent', offline } as Action })),
  { name: 'allows a valid PKCE grammar neighbor', action: { op: 'pkce', stage: 'exchange', value: 'oracle-verifier-that-is-at-least-forty-three-characters' } },
  { name: 'permits at most one concurrent rotation and revokes the active descendant on detected old-token reuse', action: { op: 'rotation', requests: 2 } },
  { name: 'uses registration metadata error for an unknown requested scope', action: { op: 'register', scope: 'unknown-source-oracle-scope' } },
  { name: 'keeps discovery mounted without claiming the unselected RFC8414 host-root convention', action: { op: 'discovery', resource: 'issuer' } },
  { name: 'publishes usable challenge-linked MCP resource metadata while leaving host-root discovery unselected', action: { op: 'discovery', resource: 'mcp' } },
  { name: 'keeps the age of a legacy-only owner cookie when creating its native session', action: { op: 'authentication', age: 7200, maximumAge: 3600 } },
  ...(['login', 'max_age'] as const).map(mode => ({ name: `resumes a password-checked native continuation within the same second (${mode})`, action: { op: 'continuation', mode, offset: 731 } as Action })),
  ...(['get', 'post'] as const).map(method => ({ name: `rejects an invalid signed reauthentication query before creating a session (${method})`, action: { op: 'signed-query', method, signature: 'invalid' } as Action })),
  ...['foreign-origin', 'cross-site-fetch'].map(attack => ({ name: `rejects cross-origin password continuation before minting cookies (${attack})`, action: { op: 'origin', foreign: attack === 'foreign-origin', crossSite: attack === 'cross-site-fetch' } as Action })),
  ...['/internal/owner', '/internal/access', '/internal/manual', '/sign-in/email', '/oauth2/create-client', '/oauth2/update-client', '/oauth2/delete-client'].map(path => ({ name: `does not publish native administrative endpoint ${path}`, action: { op: 'administration', path } as Action })),
];
const base = 'https://oauth-oracle.example.test', issuer = base + '/blyg/studio/auth';
// Authentication age, request provenance and syntax are independent inputs.
// No rule reads provider output, token state or the production route allowlist.
function model(plan: Plan): unknown {
  const action = plan.action;
  switch (action.op) {
    case 'pkce': {
      const valid = /^[A-Za-z0-9._~-]{43,128}$/.test(action.value);
      return action.stage === 'challenge' ? { status: 302, callbackOrigin: 'https://client.example.test', error: valid ? null : 'invalid_request', code: false } : action.stage === 'exchange' && valid ? { approval: 302, status: 200 } : { status: 400, error: 'invalid_request' };
    }
    case 'consent': return { status: 200, noStore: true, pragma: 'no-cache', oneHour: true, thirtyDays: action.offline ? true : undefined, offline: action.offline };
    case 'rotation': return { approval: 302, maxWinners: 1, allowedStatuses: [200, 400], replayStatus: 400, replayError: 'invalid_grant', descendantStatus: 400, accessStatus: 401 };
    case 'register': return { status: 400, error: 'invalid_client_metadata' };
    case 'discovery': return action.resource === 'issuer' ? { status: 200, issuer, hostRoot: 404 } : { status: 401, mountedChallenge: true, metadataStatus: 200, resource: base + '/blyg/studio/mcp', authorizationServers: [issuer], hostRoot: 404 };
    case 'authentication': return { status: action.age > action.maximumAge ? 302 : 200, path: '/blyg/studio/login' };
    case 'continuation': return { authorization: 302, posted: 302, path: '/blyg/studio/auth/consent', consent: 200, handle: true };
    case 'signed-query': return { status: 400, cookies: 0, sessionDelta: 0 };
    case 'origin': return { authorization: 302, status: action.foreign || action.crossSite ? 403 : 302, cookies: 0, sessionDelta: 0 };
    case 'administration': return { status: 404 };
  }
}
const challenge = async (verifier: string) => { const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)); return btoa(String.fromCharCode(...new Uint8Array(digest))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
async function driver(plan: Plan, observe: (checkpoint: string, value: unknown) => void) {
  await withOracleStorage(async () => {
    const action = plan.action;
    // A clock belongs to the history input; cleanup is outside the contractual
    // request capture so its original error/cause is never turned into a kill.
    if (action.op === 'authentication' || action.op === 'continuation') { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(Math.floor(Date.now() / 1000) * 1000 + (action.op === 'continuation' ? action.offset : 0)); }
    try {
      const fixture = await flow(action.op === 'pkce' && action.stage === 'verifier' ? { authorize: { code_challenge: await challenge(action.value) } } : action.op === 'consent' ? { scope: 'openid owner:read owner:draft' + (action.offline ? ' offline_access' : '') } : ['authentication', 'continuation', 'signed-query', 'origin'].includes(action.op) ? { scope: 'openid owner:read owner:draft' } : {});
      // Capture an exception only while an actual public request is pending.
      // Parsing, fixture queries and cleanup retain their original runner errors.
      const call = async <T>(operation: () => Promise<T>): Promise<T> => { try { return await operation(); } catch (error) { observe('OAuth implementation response', { error }); throw error; } };
      const f = { ...fixture,
        request: (...args: Parameters<typeof fixture.request>) => call(() => fixture.request(...args)),
        decide: (...args: Parameters<typeof fixture.decide>) => call(() => fixture.decide(...args)),
        token: (...args: Parameters<typeof fixture.token>) => call(() => fixture.token(...args)),
      };
        let value: unknown;
        switch (action.op) {
          case 'pkce': {
            if (action.stage === 'challenge') { const url = new URL(f.authorize); url.searchParams.set('code_challenge', action.value); const response = await f.request(url.href, { headers: { cookie: f.owner } }), location = new URL(response.headers.get('location')!); value = { status: response.status, callbackOrigin: location.origin, error: location.searchParams.get('error'), code: location.searchParams.has('code') }; }
            else { const accepted = await f.decide('browser-a', true), code = new URL(accepted.headers.get('location')!).searchParams.get('code')!; const response = await f.token(code, { code_verifier: action.value }); value = action.stage === 'exchange' ? { approval: accepted.status, status: response.status } : { status: response.status, error: (await response.json() as { error?: string }).error }; }
            break;
          }
          case 'consent': { const response = await f.request(f.authorize, { headers: { cookie: f.owner } }), html = await response.text(); value = { status: response.status, noStore: response.headers.get('cache-control')?.includes('no-store') ?? false, pragma: response.headers.get('pragma'), oneHour: /Access tokens last one hour/.test(html), thirtyDays: action.offline ? /30 days/.test(html) : undefined, offline: /requests offline access/.test(html) }; break; }
          case 'rotation': {
            const accepted = await f.decide('browser-a', true), code = new URL(accepted.headers.get('location')!).searchParams.get('code')!, issued = await (await f.token(code)).json() as { refresh_token: string; access_token: string };
            const refresh = (token: string) => f.request(f.issuer + '/oauth2/token', { method: 'POST', body: new URLSearchParams({ grant_type: 'refresh_token', client_id: f.client.client_id, refresh_token: token, resource: f.base + '/blyg/api' }) });
            const responses = await Promise.all(Array.from({ length: action.requests }, () => refresh(issued.refresh_token))), winners = responses.filter(response => response.status === 200), winner = winners.length ? await winners[0].json() as { refresh_token: string } : undefined;
            const replay = await refresh(issued.refresh_token), replayBody = await replay.json() as { error?: string };
            value = { approval: accepted.status, statuses: responses.map(response => response.status), replayStatus: replay.status, replayError: replayBody.error, descendantStatus: winner ? (await refresh(winner.refresh_token)).status : undefined, accessStatus: (await f.request('/blyg/api/settings', { headers: { Authorization: 'Bearer ' + issued.access_token } })).status }; break;
          }
          case 'register': { const response = await f.request(f.issuer + '/oauth2/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ redirect_uris: [f.redirect], token_endpoint_auth_method: 'none', scope: action.scope }) }); value = { status: response.status, error: (await response.json() as { error?: string }).error }; break; }
          case 'discovery': {
            if (action.resource === 'issuer') { const mounted = await f.request(f.issuer + '/.well-known/openid-configuration'); value = { status: mounted.status, issuer: (await mounted.json() as { issuer?: string }).issuer, hostRoot: (await f.request('/.well-known/oauth-authorization-server/blyg/studio/auth')).status }; }
            else { const response = await f.request('/blyg/studio/mcp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }), url = response.headers.get('www-authenticate')!.match(/resource_metadata="([^"]+)"/)![1], metadata = await f.request(url), body = await metadata.json() as { resource: string; authorization_servers: string[] }; value = { status: response.status, mountedChallenge: new URL(url).pathname.startsWith('/blyg/studio/auth/'), metadataStatus: metadata.status, resource: body.resource, authorizationServers: body.authorization_servers, hostRoot: (await f.request('/.well-known/oauth-protected-resource/blyg/studio/mcp')).status }; }
            break;
          }
          case 'authentication': { vi.setSystemTime(Date.now() + action.age * 1000); const url = new URL(f.authorize); url.searchParams.set('max_age', String(action.maximumAge)); const response = await f.request(url.href, { headers: { cookie: f.owner } }); value = { status: response.status, path: new URL(response.headers.get('location')!, f.base).pathname }; break; }
          case 'continuation': {
            const url = new URL(f.authorize); url.searchParams.set(action.mode === 'login' ? 'prompt' : 'max_age', action.mode === 'login' ? 'login' : '0'); const authorization = await f.request(url.href, { headers: { cookie: f.owner + '; ' + f.binding } }), loginURL = new URL(authorization.headers.get('location')!);
            const posted = await f.request('/blyg/studio/login', { method: 'POST', headers: { cookie: f.owner, Origin: f.base }, body: new URLSearchParams({ password: env.OWNER_PASSWORD, oauth_query: loginURL.search.slice(1) }) }), continuation = new URL(posted.headers.get('location')!, f.base), cookies = new Map([[f.owner.split('=')[0], f.owner]]);
            for (const cookie of posted.headers.getSetCookie()) { const item = cookie.split(';')[0]; cookies.set(item.split('=')[0], item); }
            const consent = await f.request(continuation.href, { headers: { cookie: [...cookies.values()].join('; ') } }); value = { authorization: authorization.status, posted: posted.status, path: continuation.pathname, consent: consent.status, handle: (await consent.text()).includes('name="handle"') }; break;
          }
          case 'signed-query': {
            const before = await env.DB.prepare('SELECT COUNT(*) AS count FROM session').first<{ count: number }>(), query = 'client_id=' + encodeURIComponent(f.client.client_id) + '&sig=' + action.signature + '&exp=9999999999';
            const response = action.method === 'get' ? await f.request('/blyg/studio/login?' + query, { headers: { cookie: f.owner } }) : await f.request('/blyg/studio/login', { method: 'POST', headers: { cookie: f.owner, Origin: f.base }, body: new URLSearchParams({ password: env.OWNER_PASSWORD, oauth_query: query }) });
            const after = await env.DB.prepare('SELECT COUNT(*) AS count FROM session').first<{ count: number }>(); value = { status: response.status, cookies: response.headers.getSetCookie().length, sessionDelta: after!.count - before!.count }; break;
          }
          case 'origin': {
            const url = new URL(f.authorize); url.searchParams.set('prompt', 'login'); const authorization = await f.request(url.href, { headers: { cookie: f.owner } }), query = new URL(authorization.headers.get('location')!).search.slice(1), before = await env.DB.prepare('SELECT COUNT(*) AS count FROM session').first<{ count: number }>();
            const response = await f.request('/blyg/studio/login', { method: 'POST', headers: { cookie: f.owner, Origin: action.foreign ? 'https://attacker.example' : f.base, ...(action.crossSite ? { 'Sec-Fetch-Site': 'cross-site' } : {}) }, body: new URLSearchParams({ password: env.OWNER_PASSWORD, oauth_query: query }) }), after = await env.DB.prepare('SELECT COUNT(*) AS count FROM session').first<{ count: number }>(); value = { authorization: authorization.status, status: response.status, cookies: response.headers.getSetCookie().length, sessionDelta: after!.count - before!.count }; break;
          }
          case 'administration': value = { status: (await f.request(f.issuer + action.path, { method: 'POST', headers: { cookie: f.owner, 'Content-Type': 'application/json' }, body: '{}' })).status }; break;
        }
        observe('OAuth implementation response', value);
    } finally { if (action.op === 'authentication' || action.op === 'continuation') vi.useRealTimers(); }
  });
  observe('history complete', true);
}
oracleProperty({
  id: 'oauth-implementation', owns: ['src/oauth.ts', 'src/oauth-routes.ts'],
  law: { statement: 'For every enumerated syntax, authentication, metadata and rotation history, malformed PKCE remains invalid despite hash binding, authentication age survives session reconstruction, browser continuations require same-origin signed authority, and replay removes grant access.', authority: 'RFC7636 §§4.1–4.2; OIDC Core AuthRequest; RFC9700 §4.14.2; docs/auth-oracles.md; original endpoint publication policy', limits: 'Original finite malformed inputs, continuation modes, mounted profiles and one concurrent rotation schedule; no host-root discovery or exhaustive distributed/OIDC conformance claim.' },
  histories, label: plan => plan.name, model, driver,
  check: (plan, trace, expected) => {
    const observations = trace.filter(entry => entry.checkpoint !== 'history complete');
    for (const entry of observations) {
      if (plan.action.op === 'rotation' && entry.value && typeof entry.value === 'object' && 'statuses' in entry.value) {
        const actual = entry.value as { approval: number; statuses: number[]; replayStatus: number; replayError: string; descendantStatus?: number; accessStatus: number }, policy = expected as { approval: number; maxWinners: number; allowedStatuses: number[]; replayStatus: number; replayError: string; descendantStatus: number; accessStatus: number };
        const failure = differs(entry.checkpoint, 'OAuth implementation boundaries', { approval: actual.approval, cardinality: actual.statuses.length, boundedWinners: actual.statuses.filter(status => status === 200).length <= policy.maxWinners, allowedStatuses: actual.statuses.every(status => policy.allowedStatuses.includes(status)), replayStatus: actual.replayStatus, replayError: actual.replayError, descendantStatus: actual.descendantStatus === undefined || actual.descendantStatus === policy.descendantStatus, accessStatus: actual.accessStatus }, { approval: policy.approval, cardinality: plan.action.requests, boundedWinners: true, allowedStatuses: true, replayStatus: policy.replayStatus, replayError: policy.replayError, descendantStatus: true, accessStatus: policy.accessStatus }); if (failure) return failure;
      } else { const failure = differs(entry.checkpoint, 'OAuth implementation boundaries', entry.value, expected); if (failure) return failure; }
    }
    return trace.some(entry => entry.checkpoint === 'history complete') ? differs('OAuth implementation completion', 'OAuth implementation boundaries', observations.length, 1) ?? pass : pass;
  },
  calibrations: [{ name: 'malformed challenge yields a code', law: 'OAuth implementation boundaries', history: { enumerated: 0 }, corrupt: trace => trace.map(entry => ({ ...entry, value: { ...(entry.value as object), code: true } })) }],
});
