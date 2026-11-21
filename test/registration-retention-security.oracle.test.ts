/** Anonymous registrations are reclaimable after their grace period, while an
 * approved grant or pending live consent preserves its client. This oracle owns
 * the native registration receiver's storage admission and retention decision.
 *
 * ```ts
 * POST /studio/auth/oauth2/register // → admitted after an abandoned old client
 * POST /studio/auth/oauth2/register // → 429 while approved or pending client fills the pool
 * POST /api/authorizations // → manual clients do not consume anonymous slots
 * ```
 * Age alone is insufficient: reclaiming a pending client destroys live consent.
 * The existing operator policy in docs/auth-security-oracles.md retains approved
 * and pending work, expires abandoned work, and excludes owner manual clients.
 * For every enumerated client state under a one-slot limit, registration may
 * reclaim only the abandoned old client; retained authority remains usable.
 *
 * Histories name consent state, age and capacity. A pure occupancy rule predicts
 * registration admission and the subsequent access/token response. The driver
 * creates native provider state and preserves its ISO timestamp representation;
 * only response status, row presence and timestamp update count are observations.
 * Checks run at each completed response and require the whole history. These
 * two-day-old fixed witnesses establish recovery, not sustained bot resistance.
 */
import { differs, oracleProperty, pass, type Observation } from '@tanstack/oracles';
import { env } from 'cloudflare:test';
import { beforeEach } from 'vitest';
import { flow } from './oauth-flow-driver.ts';
import { withOracleStorage } from './oracle-storage.ts';
type History = { state: 'abandoned' | 'approved' | 'pending' | 'manual'; ageDays: number; capacity: number };
const histories: History[] = [
  { state: 'abandoned', ageDays: 2, capacity: 1 }, { state: 'approved', ageDays: 2, capacity: 1 },
  { state: 'pending', ageDays: 2, capacity: 1 }, { state: 'manual', ageDays: 0, capacity: 1 },
];
const titles = {
  abandoned: 'an abandoned old registration cannot permanently fill the anonymous pool',
  approved: 'old approved clients remain usable and still occupy the pool',
  pending: 'a pending live consent protects an old client from reclamation',
  manual: 'owner-created manual clients do not occupy the anonymous registration pool',
};
beforeEach(async () => { await env.DB.prepare('DELETE FROM oauthClient').run(); await env.DB.prepare('DELETE FROM security_registrations').run(); });
// Storage occupancy depends on authority/work, not the provider's implementation
// of cleanup SQL. A manual client contributes no anonymous occupancy.
function model(history: History): Observation[] {
  const retained = history.state === 'approved' || history.state === 'pending';
  const occupancy = retained ? 1 : 0;
  const trace: Observation[] = [];
  if (history.state === 'approved') trace.push({ checkpoint: 'retention initial token exchange', value: 200 });
  if (history.ageDays) trace.push({ checkpoint: 'retention timestamp fixture', value: 1 });
  if (history.state === 'manual') trace.push({ checkpoint: 'retention manual issuance', value: 200 });
  trace.push({ checkpoint: 'retention registration admission', value: occupancy < history.capacity ? 201 : 429 });
  if (history.state === 'abandoned') trace.push({ checkpoint: 'retention abandoned client row', value: false });
  if (retained) trace.push({ checkpoint: 'retention live authority', value: 200 });
  return trace;
}
async function driver(history: History, observe: (checkpoint: string, value: unknown) => void) {
  await withOracleStorage(async () => {
    const f = await flow();
    let token: string | undefined;
    if (history.state === 'approved') {
      const approval = await f.decide('browser-a', true);
      const response = await f.token(new URL(approval.headers.get('location')!).searchParams.get('code')!);
      observe('retention initial token exchange', response.status);
      token = (await response.json() as { access_token: string }).access_token;
    } else if (history.state === 'abandoned' || history.state === 'manual') await f.decide('browser-a', false);
    if (history.ageDays) {
      const result = await env.DB.prepare("UPDATE oauthClient SET createdAt=strftime('%Y-%m-%dT%H:%M:%fZ',createdAt,?) WHERE clientId=? AND typeof(createdAt)='text'").bind(`-${history.ageDays} days`, f.client.client_id).run();
      observe('retention timestamp fixture', result.meta.changes);
    }
    if (history.state === 'manual') {
      await env.DB.prepare('DELETE FROM oauthClient WHERE clientId=?').bind(f.client.client_id).run();
      const response = await f.request('/blyg/api/authorizations', { method: 'POST', headers: { cookie: f.owner, 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Owner manual client', scope: ['owner:read'], resource: 'api' }) });
      observe('retention manual issuance', response.status);
    }
    const response = await f.request(f.issuer + '/oauth2/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...(history.state === 'abandoned' ? { client_name: 'fresh neighbor' } : {}), redirect_uris: [f.redirect], token_endpoint_auth_method: 'none' }) }, { ...env, OAUTH_CLIENT_LIMIT: String(history.capacity) });
    observe('retention registration admission', response.status);
    if (history.state === 'abandoned') observe('retention abandoned client row', (await env.DB.prepare('SELECT clientId FROM oauthClient WHERE clientId=?').bind(f.client.client_id).first()) !== null);
    if (history.state === 'approved') observe('retention live authority', (await f.request('/blyg/api/settings', { headers: { Authorization: 'Bearer ' + token } })).status);
    if (history.state === 'pending') {
      const approval = await f.decide('browser-a', true);
      observe('retention live authority', (await f.token(new URL(approval.headers.get('location')!).searchParams.get('code')!)).status);
    }
  });
  observe('retention cleanup complete', true);
}
oracleProperty({
  id: 'registration-retention-security', owns: ['src/security-budgets.ts', 'src/oauth-routes.ts'],
  law: { statement: 'For every enumerated aged-client history, anonymous registration reclaims abandoned storage while preserving approved authority and live consent; manual clients do not occupy the anonymous pool.', authority: 'docs/auth-security-oracles.md registration retention; existing operator retention policy; https://cheatsheetseries.owasp.org/cheatsheets/Denial_of_Service_Cheat_Sheet.html', limits: 'One-slot pool, two-day-old ISO timestamps and native abandoned/approved/pending/manual states; no sustained bot-resistance or general garbage-collection claim.' },
  histories, label: history => titles[history.state], model, driver,
  check: (_history, trace, expected) => {
    for (let index = 0; index < trace.length; index++) { if (trace[index].checkpoint === 'retention cleanup complete') continue; const result = differs(trace[index].checkpoint, 'registration retention', trace[index], expected[index]); if (result) return result; }
    return differs('retention cleanup complete', 'registration retention', trace.filter(entry => entry.checkpoint === 'retention cleanup complete').map(entry => entry.value), [true]) ?? differs('retention history completion', 'registration retention', trace.length, expected.length + 1) ?? pass;
  },
  calibrations: [{ name: 'abandoned client still fills the pool', law: 'registration retention', history: { enumerated: 0 }, corrupt: trace => trace.map(entry => entry.checkpoint === 'retention registration admission' ? { ...entry, value: 429 } : entry) }],
});
