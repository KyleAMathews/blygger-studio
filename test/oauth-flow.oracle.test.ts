/** Consent is browser-bound, codes retain exact exchange bindings, and refresh
 * ancestor reuse revokes the grant. These promises are received through the real
 * mounted consent, token, REST and MCP endpoints.
 *
 * decide(otherBrowser, true) // → rejected, legitimate browser can still approve
 * exchange(code, matchingBindings) // → one-hour access, once
 * refresh(usedAncestor) // → denied, descendants lose access
 *
 * RFC6749 §§4.1.2–4.1.3, RFC7636 §4.6 and RFC8707 §2 establish the bindings;
 * docs/auth-oracles.md supplies 600-second consent and zero-grace replay policy.
 * For every finite action history, the model tracks time, consent/code use and
 * refresh ancestry. Slot names are opaque history handles. The driver records
 * each completed response, never an expected operand. Checks preserve order and
 * completeness. Fixture/cleanup exceptions remain original runner diagnostics.
 * The original schedules remain finite; no generated concurrency or neighboring
 * same-client refresh-family isolation is established.
 */
import { vi } from 'vitest';
import { differs, oracleProperty, pass, type Observation } from '@tanstack/oracles';
import { withOracleStorage } from './oracle-storage.ts';
import { flow } from './oauth-flow-driver.ts';
type Binding = 'code_verifier' | 'redirect_uri' | 'resource' | 'client_id';
type Action = { op: 'decide'; browser: 'owner' | 'foreign'; allow: boolean; foreignOrigin?: boolean } | { op: 'advance'; seconds: number } | { op: 'exchange'; mismatch?: Binding | 'unknown-client'; save?: string } | { op: 'refresh'; from: string; save?: string; scope?: string } | { op: 'scope'; token: string } | { op: 'receive'; token: string; resource: 'api' | 'mcp'; afterCodeReplay?: boolean };
type Plan = { name: string; actions: Action[] };
const base = 'https://oauth-oracle.example.test', issuer = base + '/blyg/studio/auth', callback = 'https://client.example.test/callback';
const approve: Action = { op: 'decide', browser: 'owner', allow: true };
const histories: Plan[] = [
  { name: 'binds consent to the browser and consumes approval once', actions: [{ op: 'decide', browser: 'foreign', allow: true }, approve, approve] },
  { name: 'denies without minting a code, and rejects cross-site consent', actions: [{ ...approve, foreignOrigin: true }, { op: 'decide', browser: 'owner', allow: false }] },
  ...(['code_verifier', 'redirect_uri', 'resource', 'client_id'] as const).map(mismatch => ({ name: `rejects mismatched ${mismatch} at code exchange`, actions: [approve, { op: 'exchange', mismatch }] as Action[] })),
  { name: 'rejects an unknown client before exchanging a code', actions: [approve, { op: 'exchange', mismatch: 'unknown-client' }] },
  { name: 'exchanges a code once, rotates refresh credentials, and keeps the selected audience', actions: [approve, { op: 'exchange', save: 'original' }, { op: 'refresh', from: 'original', save: 'next' }, { op: 'refresh', from: 'next', save: 'latest' }, { op: 'receive', token: 'next', resource: 'api' }, { op: 'refresh', from: 'original' }, { op: 'scope', token: 'next' }, { op: 'refresh', from: 'latest', scope: 'owner:publish' }, { op: 'receive', token: 'next', resource: 'api' }, { op: 'receive', token: 'next', resource: 'mcp' }, { op: 'exchange' }, { op: 'receive', token: 'next', resource: 'api', afterCodeReplay: true }] },
  { name: 'rejects a consent handle at its exact expiry boundary', actions: [{ op: 'advance', seconds: 600 }, approve] },
];
// Independent one-use state, not native provider rows or token verification.
// Refresh ancestry is needed because its later reuse invalidates live descendants.
function model(plan: Plan): Observation[] {
  const trace: Observation[] = [], usedRefresh = new Set<string>();
  let now = 0, consentUsed = false, code = false, codeUsed = false, revoked = false;
  for (const action of plan.actions) switch (action.op) {
    case 'advance': now += action.seconds; break;
    case 'decide':
      if (action.foreignOrigin) trace.push({ checkpoint: 'OAuth consent browser binding', value: { status: 403 } });
      else if (action.browser === 'foreign' || consentUsed || now >= 600) trace.push({ checkpoint: now >= 600 ? 'OAuth consent expiry' : consentUsed ? 'OAuth consent single use' : 'OAuth consent browser binding', value: { status: 400 } });
      else { consentUsed = true; code = action.allow; trace.push({ checkpoint: action.allow ? 'OAuth approval redirect' : 'OAuth denial is not authorization', value: action.allow ? { status: 302, callback, state: 'oracle-state', issuer } : { error: 'access_denied', code: false } }); }
      break;
    case 'exchange': {
      const permitted = code && !codeUsed && !action.mismatch;
      if (permitted) { codeUsed = true; trace.push({ checkpoint: 'OAuth code acceptance', value: { status: 200, lifetime: 3600 } }); }
      else { if (codeUsed && !action.mismatch) revoked = true; trace.push({ checkpoint: action.mismatch === 'unknown-client' ? 'OAuth unknown client authentication' : action.mismatch ? 'OAuth code binding' : 'OAuth code single use', value: action.mismatch === 'unknown-client' ? { status: 401, error: 'invalid_client', access: false, refresh: false } : action.mismatch ? { status: 400, access: false } : { status: 400 } }); }
      break;
    }
    case 'refresh': {
      const replay = usedRefresh.has(action.from), denied = replay || revoked || action.scope === 'owner:publish';
      if (replay) revoked = true;
      if (!denied) usedRefresh.add(action.from);
      trace.push({ checkpoint: denied ? 'OAuth refresh denial' : 'OAuth refresh rotation', value: denied ? { status: 400 } : { status: 200, rotated: true, scope: ['owner:draft', 'owner:read'] } }); break;
    }
    case 'scope': trace.push({ checkpoint: 'OAuth refresh cannot escalate scope', value: ['owner:draft', 'owner:read'] }); break;
    case 'receive': trace.push({ checkpoint: action.afterCodeReplay ? 'OAuth code replay revokes the grant' : 'OAuth grant receiving decision', value: { status: revoked || action.resource !== 'api' ? 401 : 200 } }); break;
  }
  return trace;
}
// Capture only promised action calls. The flow fixture and cleanup stay outside
// these captures, so a failed prerequisite cannot manufacture a semantic kill.
async function driver(plan: Plan, observe: (checkpoint: string, value: unknown) => void) {
  await withOracleStorage(async () => {
    const fixture = await flow(), tokens = new Map<string, { access_token: string; refresh_token: string; scope?: string }>();
    let boundary: string | undefined;
    const call = async <T>(operation: () => Promise<T>): Promise<T> => { try { return await operation(); } catch (error) { if (boundary) observe(boundary, { error }); throw error; } };
    const f = { ...fixture, request: (...args: Parameters<typeof fixture.request>) => call(() => fixture.request(...args)), decide: (...args: Parameters<typeof fixture.decide>) => call(() => fixture.decide(...args)), token: (...args: Parameters<typeof fixture.token>) => call(() => fixture.token(...args)) };
    let code = '', elapsed = 0, consentUsed = false;
    const started = Date.now(), clock = vi.spyOn(Date, 'now').mockImplementation(() => started + elapsed * 1000);
    async function receive(checkpoint: string, operation: () => Promise<unknown>) { const previous = boundary; boundary = checkpoint; try { observe(checkpoint, await operation()); } finally { boundary = previous; } }
    try { for (const action of plan.actions) switch (action.op) {
      case 'advance': elapsed += action.seconds; break;
      case 'decide': {
        const checkpoint = action.foreignOrigin || action.browser === 'foreign' ? 'OAuth consent browser binding' : elapsed >= 600 ? 'OAuth consent expiry' : consentUsed ? 'OAuth consent single use' : action.allow ? 'OAuth approval redirect' : 'OAuth denial is not authorization';
        await receive(checkpoint, async () => {
          const response = await f.decide(action.browser === 'owner' ? 'browser-a' : 'browser-b', action.allow, action.foreignOrigin ? 'https://attacker.example.test' : f.base);
          if (response.status !== 302) return { status: response.status };
          consentUsed = true; const location = new URL(response.headers.get('location')!); code = location.searchParams.get('code') ?? '';
          return action.allow ? { status: response.status, callback: location.origin + location.pathname, state: location.searchParams.get('state'), issuer: location.searchParams.get('iss') } : { error: location.searchParams.get('error'), code: location.searchParams.has('code') };
        }); break;
      }
      case 'exchange': {
        const replacement = action.mismatch === 'client_id' ? (await flow()).client.client_id : action.mismatch === 'resource' ? f.base + '/blyg/studio/mcp' : action.mismatch === 'redirect_uri' ? 'https://wrong.example.test/callback' : action.mismatch === 'unknown-client' ? 'unknown-client' : 'wrong-input';
        await receive(action.mismatch === 'unknown-client' ? 'OAuth unknown client authentication' : action.mismatch ? 'OAuth code binding' : action.save ? 'OAuth code acceptance' : 'OAuth code single use', async () => {
          const response = await f.token(code, action.mismatch ? { [action.mismatch === 'unknown-client' ? 'client_id' : action.mismatch]: replacement } : {});
          const body = await response.json() as { access_token: string; refresh_token: string; expires_in: number; error: string };
          if (action.save) { tokens.set(action.save, body); return { status: response.status, lifetime: body.expires_in }; }
          return action.mismatch === 'unknown-client' ? { status: response.status, error: body.error, access: body.access_token !== undefined, refresh: body.refresh_token !== undefined } : action.mismatch ? { status: response.status, access: body.access_token !== undefined } : { status: response.status };
        }); break;
      }
      case 'refresh': {
        const previous = tokens.get(action.from)!;
        await receive(action.save ? 'OAuth refresh rotation' : 'OAuth refresh denial', async () => {
          const response = await f.request(f.issuer + '/oauth2/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'refresh_token', client_id: f.client.client_id, refresh_token: previous.refresh_token, resource: f.base + '/blyg/api', scope: action.scope ?? 'owner:read owner:draft' }) });
          if (!action.save) return { status: response.status };
          const body = await response.json() as { access_token: string; refresh_token: string; scope: string }; tokens.set(action.save, body);
          return { status: response.status, rotated: body.refresh_token !== previous.refresh_token, scope: body.scope.split(' ').sort() };
        }); break;
      }
      case 'scope': observe('OAuth refresh cannot escalate scope', tokens.get(action.token)!.scope?.split(' ').sort()); break;
      case 'receive': await receive(action.afterCodeReplay ? 'OAuth code replay revokes the grant' : 'OAuth grant receiving decision', async () => ({ status: (await f.request(action.resource === 'api' ? '/blyg/api/settings' : '/blyg/studio/mcp', { method: action.resource === 'api' ? 'GET' : 'POST', headers: { Authorization: 'Bearer ' + tokens.get(action.token)!.access_token } })).status })); break;
    } } finally { clock.mockRestore(); }
  });
  observe('history complete', true);
}
oracleProperty({
  id: 'oauth-flow', owns: ['src/oauth-routes.ts', 'src/oauth.ts#authorizationServer'],
  law: { statement: 'For every enumerated consent and credential history, only its browser may consume live consent, exchanges preserve exact one-use bindings, and refresh-ancestor replay removes grant authority.', authority: 'RFC6749 §§4.1.2–4.1.3; RFC7636 §4.6; RFC8707 §2; docs/auth-oracles.md consent and zero-grace replay policy', limits: 'Original finite action histories; one grant per replay, not arbitrary distributed schedules or same-client refresh-family isolation.' },
  histories, label: plan => plan.name, model, driver,
  check: (_plan, trace, expected) => { const observations = trace.filter(entry => entry.checkpoint !== 'history complete'); for (let index = 0; index < observations.length; index++) { const failure = differs(observations[index].checkpoint, 'OAuth consent and credential bindings', observations[index], expected[index]); if (failure) return failure; } return trace.some(entry => entry.checkpoint === 'history complete') ? differs('OAuth flow completion', 'OAuth consent and credential bindings', observations.length, expected.length) ?? pass : pass; },
  calibrations: [{ name: 'foreign browser receives approval', law: 'OAuth consent and credential bindings', history: { enumerated: 0 }, corrupt: trace => trace.map((entry, index) => index === 0 ? { ...entry, value: { status: 302 } } : entry) }],
});
