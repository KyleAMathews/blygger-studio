/** Browser authority and token protocol errors stay distinct at mounted OAuth
 * endpoints. OIDC discovery publishes usable public keys and signed owner claims.
 *
 * OPTIONS authorize // → no cross-origin authorization access
 * token(wrongVerifier) // → invalid_grant; token(missingVerifier) // → invalid_request
 * verify(idToken, wrongAudience) // → rejection
 *
 * RFC6749 §§5.1–5.2 defines token errors and no-store responses; RFC7636 §4.6
 * distinguishes missing proof from incorrect proof. RFC9700 §§2.1/4.14/4.16 and
 * OIDC Core IDTokenValidation supply browser, rotation and signed-claim laws.
 * For every enumerated request history, the model derives policy from endpoint,
 * request form, proof presence and grant ancestry. The driver records responses
 * and jose's independent verification result at the completed request cut.
 * Variable key counts are permitted, but every published key must remain public.
 * Original finite histories remain; this is not full OIDC/CORS conformance or
 * actual browser framing, whose receiving witness is e2e/client-access.spec.ts.
 */
import { differs, oracleProperty, pass, type Observation } from '@tanstack/oracles';
import { createLocalJWKSet, jwtVerify } from 'jose';
import { flow } from './oauth-flow-driver.ts';
import { withOracleStorage } from './oracle-storage.ts';
type Action = { op: 'cors' } | { op: 'framing' } | { op: 'token'; media?: string; verifier?: 'wrong' | 'missing'; grant?: 'password' } | { op: 'refresh'; rotations: number } | { op: 'oidc'; nonce: string };
type Plan = { name: string; actions: Action[] };
const base = 'https://oauth-oracle.example.test', issuer = base + '/blyg/studio/auth';
const histories: Plan[] = [
  { name: 'does not enable CORS on authorization, while allowing browser token access', actions: [{ op: 'cors' }] },
  { name: 'keeps owner interaction out of frames', actions: [{ op: 'framing' }] },
  ...['application/json', 'text/plain'].map(media => ({ name: `rejects unsupported token body ${media} as a protocol error`, actions: [{ op: 'token', media }] as Action[] })),
  { name: 'uses invalid_grant for a well-formed wrong PKCE verifier', actions: [{ op: 'token', verifier: 'wrong' }] },
  { name: 'keeps missing-verifier and unsupported-grant errors distinct', actions: [{ op: 'token', verifier: 'missing' }, { op: 'token', grant: 'password' }] },
  { name: 'revokes the live refresh descendant when an older ancestor is reused', actions: [{ op: 'refresh', rotations: 2 }] },
  { name: 'validates production OIDC metadata, public keys, signed claims and nonce', actions: [{ op: 'oidc', nonce: 'source-oracle-nonce' }] },
];
// These request-policy projections come from RFC6749/7636 and OIDC, not provider
// metadata. The model never reads the response or a driver-supplied expectation.
function model(plan: Plan): Observation[] {
  const trace: Observation[] = [];
  for (const action of plan.actions) switch (action.op) {
    case 'cors': trace.push({ checkpoint: 'OAuth endpoint CORS', value: { authorize: false, authorizeOptions: false, token: '*' } }); break;
    case 'framing': trace.push({ checkpoint: 'OAuth owner framing', value: { frameAncestors: true, xFrameOptions: 'DENY' } }); break;
    case 'token': trace.push({ checkpoint: 'OAuth token protocol error', value: { status: 400, error: action.grant === 'password' ? 'unsupported_grant_type' : action.verifier === 'wrong' ? 'invalid_grant' : 'invalid_request' } }); break;
    case 'refresh': trace.push({ checkpoint: 'OAuth refresh descendant revocation', value: { ancestor: 400, descendant: 400 } }); break;
    case 'oidc': trace.push({ checkpoint: 'OAuth OIDC metadata', value: { status: 200, json: true, issuer, code: true, subject: true, openid: true, s256: true, rs256: true, endpointsMounted: [true, true, true, true] } }, { checkpoint: 'OAuth OIDC public keys', value: { nonempty: true, publicRSA: true } }, { checkpoint: 'OAuth OIDC signed claims', value: { status: 200, noStore: true, tokenType: 'bearer', verified: true, alg: 'RS256', sub: 'owner', nonce: action.nonce, exp: 'number', iat: 'number', wrongAudienceRejected: true } }); break;
  }
  return trace;
}
async function driver(plan: Plan, observe: (checkpoint: string, value: unknown) => void) {
  await withOracleStorage(async () => {
    const oidc = plan.actions.find(action => action.op === 'oidc');
    const fixture = await flow(oidc?.op === 'oidc' ? { scope: 'openid offline_access owner:read owner:draft', authorize: { nonce: oidc.nonce } } : {});
    let boundary: string | undefined;
    const call = async <T>(operation: () => Promise<T>): Promise<T> => { try { return await operation(); } catch (error) { if (boundary) observe(boundary, { error }); throw error; } };
    const f = { ...fixture, request: (...args: Parameters<typeof fixture.request>) => call(() => fixture.request(...args)), decide: (...args: Parameters<typeof fixture.decide>) => call(() => fixture.decide(...args)), token: (...args: Parameters<typeof fixture.token>) => call(() => fixture.token(...args)) };
    for (const action of plan.actions) {
      // Fixture creation is outside the contract-call capture. Once a named
      // receiving call starts, a returned/thrown outcome belongs to that cut.
      const receive = async (checkpoint: string, operation: () => Promise<unknown>) => { const previous = boundary; boundary = checkpoint; try { observe(checkpoint, await operation()); } finally { boundary = previous; } };
      switch (action.op) {
        case 'cors': await receive('OAuth endpoint CORS', async () => {
          const response = await f.request(f.authorize, { headers: { Origin: 'https://external-client.example', cookie: f.owner } });
          const options = await f.request(f.issuer + '/oauth2/authorize', { method: 'OPTIONS', headers: { Origin: 'https://external-client.example' } });
          const token = await f.request(f.issuer + '/oauth2/token', { method: 'OPTIONS' });
          return { authorize: response.headers.has('access-control-allow-origin'), authorizeOptions: options.headers.has('access-control-allow-origin'), token: token.headers.get('access-control-allow-origin') };
        }); break;
        case 'framing': await receive('OAuth owner framing', async () => { const response = await f.request('/blyg/studio/login'); return { contentSecurityPolicy: response.headers.get('content-security-policy'), xFrameOptions: response.headers.get('x-frame-options') }; }); break;
        case 'token': {
          let code = '';
          if (action.verifier) { const accepted = await f.decide('browser-a', true); code = new URL(accepted.headers.get('location')!).searchParams.get('code')!; }
          await receive('OAuth token protocol error', async () => {
            const response = action.media ? await f.request(f.issuer + '/oauth2/token', { method: 'POST', headers: { 'Content-Type': action.media }, body: '{}' }) : action.grant ? await f.request(f.issuer + '/oauth2/token', { method: 'POST', body: new URLSearchParams({ grant_type: action.grant, client_id: f.client.client_id, username: 'owner', password: 'not-an-owner-login' }) }) : await f.token(code, { code_verifier: action.verifier === 'wrong' ? 'a'.repeat(43) : '' });
            return { status: response.status, error: (await response.json() as { error?: string }).error };
          }); break;
        }
        case 'refresh': {
          const accepted = await f.decide('browser-a', true), initial = await (await f.token(new URL(accepted.headers.get('location')!).searchParams.get('code')!)).json() as { refresh_token: string };
          const refresh = (token: string) => f.request(f.issuer + '/oauth2/token', { method: 'POST', body: new URLSearchParams({ grant_type: 'refresh_token', client_id: f.client.client_id, refresh_token: token, resource: f.base + '/blyg/api' }) });
          let descendant = initial.refresh_token;
          for (let index = 0; index < action.rotations; index++) descendant = (await (await refresh(descendant)).json() as { refresh_token: string }).refresh_token;
          await receive('OAuth refresh descendant revocation', async () => ({ ancestor: (await refresh(initial.refresh_token)).status, descendant: (await refresh(descendant)).status })); break;
        }
        case 'oidc': {
          let keys: { keys: any[] } | undefined;
          await receive('OAuth OIDC metadata', async () => {
            const response = await f.request(f.issuer + '/.well-known/openid-configuration'), metadata = await response.json() as Record<string, any>;
            keys = await (await f.request(metadata.jwks_uri)).json() as { keys: any[] };
            return { status: response.status, contentType: response.headers.get('content-type'), metadata };
          });
          // Key cardinality is a contract freedom; the independent check below
          // applies the public-key law to every returned key, not a fixed count.
          observe('OAuth OIDC public keys', keys?.keys.map(key => ({ kty: key.kty, kidPresent: Boolean(key.kid), fields: Object.keys(key).sort() })));
          const accepted = await f.decide('browser-a', true), code = new URL(accepted.headers.get('location')!).searchParams.get('code')!;
          await receive('OAuth OIDC signed claims', async () => {
            const response = await f.token(code), tokens = await response.json() as { id_token: string; token_type: string };
            const verified = await jwtVerify(tokens.id_token, createLocalJWKSet(keys!), { issuer: f.issuer, audience: f.client.client_id });
            let wrongAudienceRejected = false;
            try { await jwtVerify(tokens.id_token, createLocalJWKSet(keys!), { issuer: f.issuer, audience: 'wrong-client' }); } catch { wrongAudienceRejected = true; }
            return { status: response.status, cacheControl: response.headers.get('cache-control'), tokenType: tokens.token_type.toLowerCase(), verified: true, alg: verified.protectedHeader.alg, sub: verified.payload.sub, nonce: verified.payload.nonce, exp: typeof verified.payload.exp, iat: typeof verified.payload.iat, wrongAudienceRejected };
          }); break;
        }
      }
    }
  });
  observe('history complete', true);
}
oracleProperty({
  id: 'oauth-spec', owns: ['src/oauth.ts', 'src/oauth-routes.ts'],
  law: { statement: 'For every enumerated protocol history, OAuth endpoints preserve browser isolation, precise request/grant errors and refresh replay denial, and OIDC discovery publishes public signing keys with independently verifiable bound claims.', authority: 'RFC6749 §§5.1–5.2; RFC7636 §4.6; RFC9700 §§2.1/4.14/4.16; OIDC Core IDTokenValidation; docs/auth-oracles.md', limits: 'Original finite HTTP and signed-claim histories; actual browser framing and full CORS/OIDC algorithm conformance remain separate.' },
  histories, label: plan => plan.name, model, driver,
  check: (_plan, trace, expected) => {
    const observations = trace.filter(entry => entry.checkpoint !== 'history complete');
    for (let index = 0; index < observations.length; index++) {
      const entry = observations[index];
      let value = entry.value;
      // Public-key cardinality and extension metadata are freedoms. Apply the
      // independent policy to every returned key/list without fixing their size.
      if (entry.checkpoint === 'OAuth owner framing' && value && typeof value === 'object' && 'contentSecurityPolicy' in value) {
        const actual = value as { contentSecurityPolicy: string | null; xFrameOptions: string | null };
        value = { frameAncestors: actual.contentSecurityPolicy?.includes("frame-ancestors 'none'") ?? false, xFrameOptions: actual.xFrameOptions };
      } else if (entry.checkpoint === 'OAuth OIDC metadata' && value && typeof value === 'object' && 'metadata' in value) {
        const actual = value as { status: number; contentType: string | null; metadata: Record<string, any> }, metadata = actual.metadata;
        value = { status: actual.status, json: actual.contentType?.includes('application/json') ?? false, issuer: metadata.issuer, code: metadata.response_types_supported?.includes('code') ?? false, subject: metadata.subject_types_supported?.includes('public') ?? false, openid: metadata.scopes_supported?.includes('openid') ?? false, s256: metadata.code_challenge_methods_supported?.includes('S256') ?? false, rs256: metadata.id_token_signing_alg_values_supported?.includes('RS256') ?? false, endpointsMounted: ['authorization_endpoint', 'token_endpoint', 'registration_endpoint', 'jwks_uri'].map(field => typeof metadata[field] === 'string' && metadata[field].startsWith(issuer + '/')) };
      } else if (entry.checkpoint === 'OAuth OIDC public keys' && Array.isArray(value)) {
        value = { nonempty: value.length > 0, publicRSA: value.every((key: { kty: string; kidPresent: boolean; fields: string[] }) => key.kty === 'RSA' && key.kidPresent && ['d', 'p', 'q', 'dp', 'dq', 'qi', 'k'].every(field => !key.fields.includes(field))) };
      } else if (entry.checkpoint === 'OAuth OIDC signed claims' && value && typeof value === 'object' && 'cacheControl' in value) {
        const { cacheControl, ...actual } = value as { cacheControl: string | null; [key: string]: unknown };
        value = { ...actual, noStore: cacheControl?.includes('no-store') ?? false };
      }
      const failure = differs(entry.checkpoint, 'OAuth protocol and OIDC', { ...entry, value }, expected[index]); if (failure) return failure;
    }
    return trace.some(entry => entry.checkpoint === 'history complete') ? differs('OAuth protocol completion', 'OAuth protocol and OIDC', observations.length, expected.length) ?? pass : pass;
  },
  calibrations: [{ name: 'authorization leaks cross-origin access', law: 'OAuth protocol and OIDC', history: { enumerated: 0 }, corrupt: trace => trace.map((entry, index) => index === 0 ? { ...entry, value: { ...(entry.value as object), authorize: true } } : entry) }],
});
