/** This oracle owns byte admission before REST item writes and OAuth client
 * registration, at the completed Worker response and persisted-row checkpoints.
 *
 * ```ts
 * POST('/blyg/api/items', bodyOf128Bytes) // → 201 with a 128-byte operator limit
 * POST('/blyg/api/items', bodyOf129Bytes) // → 413 and no inserted item
 * POST('/blyg/studio/auth/oauth2/register', oversizedBody) // → 413, no client
 * ```
 * Content-Length is absent, so admission must count the actual body. For every
 * request in these finite histories, bytes above the surface's limit are denied
 * before storage; admitted REST writes remain usable. The pure model counts
 * UTF-8 bytes from the plan and predicts status and storage delta. The driver
 * records actual response status and row-count differences. Fixture failures
 * remain setup errors. This is local byte admission, not an ingress/load claim.
 * Authority: operator limits in docs/auth-deployment-hardening.md and OWASP DoS
 * guidance; OAuth does not prescribe the chosen numeric limit.
 */
import { oracleProperty } from '@tanstack/oracles';
import { env } from 'cloudflare:test';
import { withOracleStorage } from './oracle-storage.ts';
import { flow } from './oauth-flow-driver.ts';
import { completed, exactTrace } from './network-oracle-observations.ts';
type Plan = { name: string; surface: 'rest' | 'oauth'; limit: number; bodies: string[] };
const restBody = (bytes: number) => JSON.stringify({ contentMd: 'x'.repeat(bytes - JSON.stringify({ contentMd: '' }).length) });
const histories: Plan[] = [
  { name: 'REST refuses streamed oversized bodies before writing', surface: 'rest', limit: 128, bodies: [restBody(129), restBody(128)] },
  { name: 'OAuth refuses oversized registration bodies before client storage', surface: 'oauth', limit: 1024 * 1024, bodies: [JSON.stringify({ client_name: 'x'.repeat(1024 * 1024), redirect_uris: ['https://client.example.test/callback'], token_endpoint_auth_method: 'none' })] },
];
// A byte threshold and successful-create rule predict every request, rather
// than storing expected responses in the fixed histories.
const model = (plan: Plan) => plan.bodies.map(body => {
  const admitted = new TextEncoder().encode(body).length <= plan.limit;
  return { checkpoint: 'body admission', value: { status: admitted ? 201 : 413, inserted: admitted ? 1 : 0 } };
});
oracleProperty({
  id: 'request-body-security', owns: ['src/owner-api.ts#createOwnerApi', 'src/oauth-routes.ts'],
  law: { statement: 'For every request in the bounded REST and OAuth body histories, bodies above the configured byte limit return 413 without inserting a row, while the exact REST boundary admits its write.', authority: 'docs/auth-deployment-hardening.md Work and outbound limits; existing request-body receiving law', limits: 'REST exact 128/129-byte neighbors and one over-1MiB OAuth request; local Worker/D1, no deployed ingress claim.' },
  histories, label: plan => plan.name, model,
  driver: (plan, observe) => completed(observe, () => withOracleStorage(async () => {
    const f = await flow();
    const table = plan.surface === 'rest' ? 'items' : 'oauthClient';
    for (const body of plan.bodies) {
      const before = (await env.DB.prepare('SELECT COUNT(*) AS n FROM ' + table).first<{ n: number }>())!.n;
      const response = await f.request(plan.surface === 'rest' ? '/blyg/api/items' : f.issuer + '/oauth2/register', {
        method: 'POST', headers: { ...(plan.surface === 'rest' ? { cookie: f.owner } : {}), 'Content-Type': 'application/json' }, body,
      }, plan.surface === 'rest' ? { ...env, API_BODY_LIMIT: String(plan.limit) } : env);
      const after = (await env.DB.prepare('SELECT COUNT(*) AS n FROM ' + table).first<{ n: number }>())!.n;
      observe('body admission', { status: response.status, inserted: after - before });
    }
  })),
  check: (_plan, trace, expected) => exactTrace(trace, expected, 'body byte admission'),
  calibrations: [{ name: 'oversized write admitted', law: 'body byte admission', history: { enumerated: 0 }, corrupt: trace => trace.map((entry, index) => index ? entry : { ...entry, value: { status: 201, inserted: 1 } }) }],
});
