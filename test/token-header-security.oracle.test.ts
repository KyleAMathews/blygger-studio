/** This oracle owns hostile JOSE header rejection at the real REST receiver in
 * verifyBearer, with a native valid-token neighbor and attacker-key fetch trace.
 *
 * ```ts
 * GET('/blyg/api/settings', nativeAccessToken) // → 200
 * GET('/blyg/api/settings', unsignedOrSubstitutedToken) // → 401
 * POST('/blyg/api/items', hostileHeaderToken) // → 401, no attacker-key fetch
 * ```
 * A signed-looking header cannot choose the verifier's algorithm or keys.
 * For every header transformation in this finite grammar, the mutated credential
 * is refused for reads and writes while the original native credential works.
 * RFC8725 §§3.1/3.10 supplies that rule. The model knows only transformation
 * kinds and receiving operations; it never decodes a production credential.
 * The driver creates disposable native/attacker keys, sends the resulting bytes
 * to the real API and records only statuses, key availability and fetch URLs.
 * Limits: original eight hostile forms, not all JOSE extensions or entropy.
 */
import { oracleProperty } from '@tanstack/oracles';
import { vi } from 'vitest';
import { decodeJwt, SignJWT, generateKeyPair } from 'jose';
import { completed, exactTrace } from './network-oracle-observations.ts';
import { flow } from './oauth-flow-driver.ts';
import { withOracleStorage } from './oracle-storage.ts';
const encode = (value: unknown) => btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
type Mutation = 'unsigned' | 'hmac-confusion' | 'jku-substitution' | 'x5u-substitution' | 'malformed-kid-critical' | 'not-jwt' | 'extra-component' | 'missing-signature';
const histories = [{ name: 'rejects hostile JWT headers and algorithms without consulting attacker keys', mutations: ['unsigned', 'hmac-confusion', 'jku-substitution', 'x5u-substitution', 'malformed-kid-critical', 'not-jwt', 'extra-component', 'missing-signature'] as Mutation[], operations: ['read', 'write'] as const, attacker: 'https://attacker-key.example/keys' }];
// No transformation preserves native verification authority. Operation choice
// cannot turn a bad credential into authority, and headers never authorize I/O.
const model = (plan: typeof histories[number]) => ({ consent: 302, issuance: 200, nativeRead: 200, denied: plan.mutations.map(() => plan.operations.map(() => 401)), attackerFetches: [] });
oracleProperty({
  id: 'token-header-security', owns: ['src/oauth.ts#verifyBearer'],
  law: { statement: 'For every bounded hostile-header transformation, native access works but unsigned, key-confused, substituted or malformed tokens return 401 for reads and writes without fetching header-named keys.', authority: 'https://www.rfc-editor.org/rfc/rfc8725.html#section-3.1 and #section-3.10; existing hostile-token receiving law', limits: 'Eight original header/token mutations and REST read/write paths; no all-algorithm or cryptographic-entropy claim.' },
  histories, label: plan => plan.name, model,
  driver: (plan, observe) => completed(observe, () => withOracleStorage(async () => {
    const f = await flow();
    const approved = await f.decide('browser-a', true); observe('header fixture consent', approved.status);
    const issued = await f.token(new URL(approved.headers.get('location')!).searchParams.get('code')!); observe('header fixture issuance', issued.status);
    const { access_token } = await issued.json() as { access_token: string };
    const read = (token: string) => f.request('/blyg/api/settings', { headers: { Authorization: 'Bearer ' + token } });
    observe('native header neighbor', (await read(access_token)).status);
    const keys = await (await f.request(f.issuer + '/jwks')).json() as { keys: { kid: string }[] }; observe('native verifier key count', keys.keys.length);
    const payload = decodeJwt(access_token), { privateKey } = await generateKeyPair('RS256');
    const candidates: Record<Mutation, string> = {
      unsigned: `${encode({ alg: 'none', typ: 'at+jwt' })}.${encode(payload)}.`,
      'hmac-confusion': await new SignJWT(payload).setProtectedHeader({ alg: 'HS256', kid: keys.keys[0].kid, typ: 'at+jwt' }).sign(new TextEncoder().encode(JSON.stringify(keys))),
      'jku-substitution': await new SignJWT(payload).setProtectedHeader({ alg: 'RS256', kid: keys.keys[0].kid, typ: 'at+jwt', jku: plan.attacker }).sign(privateKey),
      'x5u-substitution': await new SignJWT(payload).setProtectedHeader({ alg: 'RS256', kid: keys.keys[0].kid, typ: 'at+jwt', x5u: plan.attacker }).sign(privateKey),
      'malformed-kid-critical': `${encode({ alg: 'RS256', kid: { url: plan.attacker }, crit: ['unknown'], unknown: true })}.${access_token.split('.').slice(1).join('.')}`,
      'not-jwt': 'not-a-jwt', 'extra-component': access_token + '.extra', 'missing-signature': access_token.split('.').slice(0, 2).join('.'),
    };
    const spy = vi.spyOn(globalThis, 'fetch');
    try {
      for (const mutation of plan.mutations) {
        const token = candidates[mutation], statuses: number[] = [];
        for (const operation of plan.operations) statuses.push((await (operation === 'read' ? read(token) : f.request('/blyg/api/items', { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify({ content_md: 'forbidden header write' }) }))).status);
        observe('hostile header receiving decisions', statuses);
      }
      observe('header-named key fetches', spy.mock.calls.map(([input]) => String(input instanceof Request ? input.url : input)).filter(url => url.startsWith(plan.attacker)));
    } finally { spy.mockRestore(); }
  })),
  check: (_plan, rawTrace, expected) => {
    const wanted = [
      { checkpoint: 'header fixture consent', value: expected.consent },
      { checkpoint: 'header fixture issuance', value: expected.issuance },
      { checkpoint: 'native header neighbor', value: expected.nativeRead },
      { checkpoint: 'native verifier key count', value: 'available' },
      ...expected.denied.map(value => ({ checkpoint: 'hostile header receiving decisions', value })),
      { checkpoint: 'header-named key fetches', value: expected.attackerFetches },
    ];
    const actual = rawTrace.map(entry => entry.checkpoint === 'native verifier key count' ? { ...entry, value: typeof entry.value === 'number' && entry.value > 0 ? 'available' : entry.value } : entry);
    return exactTrace(actual, wanted, 'selected JWT keys');
  },
  calibrations: [{ name: 'hostile read accepted', law: 'selected JWT keys', history: { enumerated: 0 }, corrupt: trace => { let changed = false; return trace.map(entry => { if (changed || entry.checkpoint !== 'hostile header receiving decisions') return entry; changed = true; return { ...entry, value: [200, 401] }; }); } }],
});
