/** Costly REST/MCP work and anonymous registration consume finite operator
 * budgets before business work begins. This oracle owns security-budgets and
 * complete at completed responses, stored-row counts and provider-call counts.
 *
 * ```ts
 * POST /api/items // → 201, 201, 429 under a two-write window
 * POST /studio/auth/oauth2/register // → 429 when anonymous storage is full
 * POST /studio/mcp tools/list // → 429 after its request budget
 * complete(...) // → budget rejection before an extra provider call
 * ```
 * Counting buttons is insufficient: concurrent calls and different AI purposes
 * share capacity. The operator policy in docs/auth-security-oracles.md bounds
 * actual work, preserves denied-scope capacity, and releases failed reservations.
 * For every finite history, admitted work stays within its principal/window or
 * storage limit, and a new window restores admission without deleting old work.
 *
 * Histories contain limits, principals, schedules and transport input. A pure
 * counter model derives admissions and resulting work counts. Drivers execute
 * real owner/native/MCP receivers and controlled provider transport; the check
 * compares every recorded checkpoint. Fixture/cleanup exceptions escape intact;
 * only complete's promised return/rejection is recorded as an outcome.
 * These fixed low-limit windows and concurrent batches do not establish deployed
 * spend, memory use or throughput, nor arbitrary schedules.
 */
import { differs, oracleProperty, pass, type Observation } from '@tanstack/oracles';
import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { beforeEach, vi } from 'vitest';
import { Hono } from 'hono';
import { flow } from './oauth-flow-driver.ts';
import { complete } from '../src/ai/provider.ts';
import { putSettings } from '../src/model.ts';
import { createOwnerApi } from '../src/owner-api.ts';
import { withOracleStorage } from './oracle-storage.ts';
type Write = { principal: 'owner' | 'read-only'; minute: number };
type History =
  | { kind: 'write'; limit: number; concurrent: boolean; actions: Write[] }
  | { kind: 'registration'; capacity: number; concurrent: boolean; valid: boolean[] }
  | { kind: 'ai'; limit: number; concurrent: boolean; purposes: ('tk' | 'changelog' | 'feed')[]; transportText: string }
  | { kind: 'mcp-tool' | 'mcp-discovery'; limit: number; attempts: number };
const writes = (count: number): Write[] => Array.from({ length: count }, () => ({ principal: 'owner', minute: 0 }));
const histories: History[] = [
  { kind: 'write', limit: 2, concurrent: false, actions: writes(3) },
  { kind: 'write', limit: 2, concurrent: true, actions: writes(6) },
  { kind: 'registration', capacity: 2, concurrent: false, valid: [true, true] },
  { kind: 'ai', limit: 2, concurrent: false, purposes: ['tk', 'changelog', 'feed'], transportText: 'Fixture output' },
  { kind: 'write', limit: 2, concurrent: false, actions: [{ principal: 'read-only', minute: 0 }, { principal: 'read-only', minute: 0 }, { principal: 'read-only', minute: 0 }, ...writes(2)] },
  { kind: 'registration', capacity: 2, concurrent: true, valid: [true, true, true, true] },
  { kind: 'mcp-tool', limit: 2, attempts: 3 },
  { kind: 'ai', limit: 2, concurrent: true, purposes: ['tk', 'tk', 'tk', 'tk', 'tk', 'tk'], transportText: 'Fixture' },
  { kind: 'write', limit: 2, concurrent: false, actions: [...writes(3), { principal: 'owner', minute: 1 }] },
  { kind: 'registration', capacity: 2, concurrent: false, valid: [false, true] },
  { kind: 'mcp-discovery', limit: 2, attempts: 3 },
];
const titles = [
  'enforces a write budget before creating an extra item',
  'atomic admission cannot overspend a write budget under concurrency',
  'bounds anonymous registration storage before creating another client',
  'the daily AI budget counts provider calls across generation purposes',
  'scope denials do not burn the account write budget',
  'concurrent registration claims cannot exceed the client storage cap',
  'MCP tools consume their grant read budget independently of owner reads',
  'concurrent AI purposes cannot overspend the daily provider budget',
  'a new minute restores admission without erasing earlier writes',
  'failed registrations release their storage claims for a valid neighbor',
  'MCP discovery cannot bypass its request work budget',
];
// Labels serve replay/UI only. The model dispatches on semantic work kind and
// derives observations from capacities/actions, never from titles or case IDs.
const labels = new Map(histories.map((history, index) => [JSON.stringify(history), titles[index]]));
beforeEach(async () => {
  await env.DB.prepare('DELETE FROM items').run(); await env.DB.prepare('DELETE FROM oauthClient').run();
  for (const table of ['security_budgets', 'security_registrations']) if (await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").bind(table).first()) await env.DB.prepare('DELETE FROM ' + table).run();
});
// A counter belongs to an admitted capability and its window, not to an attempted
// denied scope. Registration starts with flow's one anonymous client. Provider
// outcomes count actual transport calls across purposes.
function model(history: History): Observation[] {
  switch (history.kind) {
    case 'write': {
      const used = new Map<number, number>(); let rows = 0;
      const statuses = history.actions.map(action => {
        if (action.principal === 'read-only') return 403;
        const count = used.get(action.minute) ?? 0;
        if (count >= history.limit) return 429;
        used.set(action.minute, count + 1); rows++; return 201;
      });
      return history.concurrent ? [{ checkpoint: 'atomic write batch', value: statuses.sort() }] : [...statuses.map(status => ({ checkpoint: 'write admission', value: status })), ...(history.actions.some(action => action.principal === 'read-only') ? [] : [{ checkpoint: 'admitted item rows', value: rows }])];
    }
    case 'registration': {
      let clients = 1;
      const statuses = history.valid.map(valid => {
        if (!valid) return 400;
        if (clients >= history.capacity) return 429;
        clients++; return 201;
      });
      if (history.concurrent) return [{ checkpoint: 'atomic registration batch', value: { accepted: statuses.filter(status => status === 201).length, clients, reservations: 0 } }];
      const trace: Observation[] = [];
      statuses.forEach((status, index) => { trace.push({ checkpoint: 'registration admission', value: status }); if (!history.valid[index]) trace.push({ checkpoint: 'released registration claims', value: 0 }); });
      if (history.valid.every(Boolean)) trace.push({ checkpoint: 'admitted client rows', value: clients });
      return trace;
    }
    case 'ai': {
      const accepted = Math.min(history.limit, history.purposes.length);
      if (history.concurrent) return [{ checkpoint: 'atomic provider batch', value: { accepted, calls: accepted } }];
      return [...history.purposes.map((_purpose, index) => ({ checkpoint: 'provider admission', value: index < history.limit ? { accepted: true, text: history.transportText, budgetError: false } : { accepted: false, budgetError: true } })), { checkpoint: 'admitted provider calls', value: accepted }];
    }
    case 'mcp-tool': return [{ checkpoint: 'MCP budget issuance', value: 200 }, { checkpoint: 'independent owner read', value: 200 }, ...Array.from({ length: history.attempts }, (_, index) => [{ checkpoint: 'MCP tool HTTP', value: 200 }, { checkpoint: 'MCP tool admission', value: { denied: index >= history.limit, budgetError: index >= history.limit } }]).flat()];
    case 'mcp-discovery': return [{ checkpoint: 'MCP budget issuance', value: 200 }, ...Array.from({ length: history.attempts }, (_, index) => ({ checkpoint: 'MCP discovery admission', value: index < history.limit ? 200 : 429 }))];
  }
}
const mcpHeaders = (token: string, method: string, name?: string) => ({ Authorization: 'Bearer ' + token, 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', 'mcp-protocol-version': '2026-07-28', 'mcp-method': method, ...(name ? { 'mcp-name': name } : {}) });
const meta = { 'io.modelcontextprotocol/protocolVersion': '2026-07-28', 'io.modelcontextprotocol/clientCapabilities': {} };
async function driver(history: History, observe: (checkpoint: string, value: unknown) => void) {
  await withOracleStorage(async () => {
    switch (history.kind) {
      case 'write': {
        const bindings = { ...env, API_WRITE_LIMIT: String(history.limit) };
        const readOnly = new Hono().route('/api', createOwnerApi({ scope: ['owner:read'], clientId: 'denied', userId: 'owner' }));
        let f: Awaited<ReturnType<typeof flow>> | undefined;
        // Original scope-denial history creates its native fixture only after
        // denials; the other histories establish it before their measured work.
        if (history.actions[0]?.principal === 'owner') f = await flow();
        const start = Math.floor(Date.now() / 60000) * 60000 + 1000;
        const windowed = history.actions.some(action => action.minute !== 0);
        const clock = windowed ? vi.spyOn(Date, 'now').mockReturnValue(start) : undefined;
        const write = async (action: Write, index: number) => {
          clock?.mockReturnValue(start + action.minute * 60000);
          if (action.principal === 'owner') {
            f ??= await flow();
            return f.request('/blyg/api/items', { method: 'POST', headers: { cookie: f.owner, 'Content-Type': 'application/json' }, body: JSON.stringify({ contentMd: history.concurrent ? 'concurrent ' + index : windowed ? 'window neighbor' : history.actions[0]?.principal === 'read-only' ? 'admitted' : 'budget ' + index }) }, bindings);
          }
          const ctx = createExecutionContext();
          const response = await readOnly.fetch(new Request('https://admission.example/api/items', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contentMd: 'denied' }) }), bindings, ctx);
          await waitOnExecutionContext(ctx); return response;
        };
        try {
          if (history.concurrent) observe('atomic write batch', (await Promise.all(history.actions.map(write))).map(response => response.status));
          else {
            for (let index = 0; index < history.actions.length; index++) observe('write admission', (await write(history.actions[index], index)).status);
            if (!history.actions.some(action => action.principal === 'read-only')) observe('admitted item rows', (await env.DB.prepare('SELECT id FROM items').all()).results.length);
          }
        } finally { clock?.mockRestore(); }
        return;
      }
      case 'registration': {
        const f = await flow(), bindings = { ...env, OAUTH_CLIENT_LIMIT: String(history.capacity) };
        const register = (valid: boolean, index: number) => f.request(f.issuer + '/oauth2/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(valid ? { client_name: history.concurrent ? 'parallel ' + index : history.valid[0] ? 'storage ' + index : 'neighbor', redirect_uris: [f.redirect], token_endpoint_auth_method: 'none' } : { redirect_uris: ['not a URL'] }) }, bindings);
        if (history.concurrent) {
          const responses = await Promise.all(history.valid.map(register));
          observe('atomic registration batch', { accepted: responses.filter(response => response.status === 201).length, clients: (await env.DB.prepare('SELECT clientId FROM oauthClient').all()).results.length, reservations: (await env.DB.prepare('SELECT id FROM security_registrations').all()).results.length });
        } else {
          for (let index = 0; index < history.valid.length; index++) {
            observe('registration admission', (await register(history.valid[index], index)).status);
            if (!history.valid[index]) observe('released registration claims', (await env.DB.prepare('SELECT id FROM security_registrations').all()).results.length);
          }
          if (history.valid.every(Boolean)) observe('admitted client rows', (await env.DB.prepare('SELECT clientId FROM oauthClient').all()).results.length);
        }
        return;
      }
      case 'ai': {
        await putSettings(env.DB, { ai_model_tk: 'claude-opus-5', ...(history.concurrent ? {} : { ai_model_changelog: 'claude-opus-5', ai_model_feed: 'claude-opus-5' }) });
        const bindings = { ...env, AI_PROVIDER_KEY: 'disposable-fixture-key', AI_DAILY_CALL_LIMIT: String(history.limit) }; let calls = 0;
        const transport = async () => { calls++; return { ok: true, status: 200, text: async () => JSON.stringify({ model: 'claude-opus-5', content: [{ type: 'text', text: history.transportText }] }) }; };
        if (history.concurrent) {
          const results = await Promise.allSettled(history.purposes.map(purpose => complete(bindings, 'system', 'user', transport, purpose)));
          observe('atomic provider batch', { accepted: results.filter(result => result.status === 'fulfilled').length, calls });
        } else {
          for (const purpose of history.purposes) {
            let outcome: { value: unknown } | { error: unknown };
            try { outcome = { value: await complete(bindings, 'system', 'user', transport, purpose) }; } catch (error) { outcome = { error }; }
            observe('provider admission', outcome);
          }
          observe('admitted provider calls', calls);
        }
        return;
      }
      case 'mcp-tool':
      case 'mcp-discovery': {
        const f = await flow(), bindings = { ...env, ...(history.kind === 'mcp-tool' ? { API_READ_LIMIT: String(history.limit) } : { MCP_REQUEST_LIMIT: String(history.limit) }) };
        const minted = await f.request('/blyg/api/authorizations', { method: 'POST', headers: { cookie: f.owner, 'Content-Type': 'application/json' }, body: JSON.stringify({ name: history.kind === 'mcp-tool' ? 'budget MCP' : 'discovery budget', scope: ['owner:read'], resource: 'mcp' }) }, history.kind === 'mcp-tool' ? bindings : undefined);
        observe('MCP budget issuance', minted.status);
        const { accessToken } = await minted.json() as { accessToken: string };
        if (history.kind === 'mcp-tool') observe('independent owner read', (await f.request('/blyg/api/settings', { headers: { cookie: f.owner } }, bindings)).status);
        for (let index = 0; index < history.attempts; index++) {
          const method = history.kind === 'mcp-tool' ? 'tools/call' : 'tools/list';
          const response = await f.request('/blyg/studio/mcp', { method: 'POST', headers: mcpHeaders(accessToken, method, history.kind === 'mcp-tool' ? 'getSettings' : undefined), body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params: history.kind === 'mcp-tool' ? { name: 'getSettings', arguments: {}, _meta: meta } : { _meta: meta } }) }, bindings);
          if (history.kind === 'mcp-discovery') observe('MCP discovery admission', response.status);
          else { observe('MCP tool HTTP', response.status); observe('MCP tool admission', { result: (await response.json() as { result: unknown }).result }); }
        }
        return;
      }
    }
  });
  observe('admission cleanup complete', true);
}
function check(_history: History, trace: readonly Observation[], expected: Observation[]) {
  for (let index = 0; index < trace.length; index++) {
    const entry = trace[index]; if (entry.checkpoint === 'admission cleanup complete') continue; let actual: Observation = entry;
    if (entry.checkpoint === 'atomic write batch') actual = { checkpoint: entry.checkpoint, value: [...entry.value as number[]].sort() };
    else if (entry.checkpoint === 'provider admission') {
      const outcome = entry.value as { value?: { text?: string }; error?: unknown };
      actual = { checkpoint: entry.checkpoint, value: 'value' in outcome ? { accepted: true, text: outcome.value?.text, budgetError: false } : { accepted: false, budgetError: /budget/i.test(outcome.error instanceof Error ? outcome.error.message : String(outcome.error)) } };
    } else if (entry.checkpoint === 'MCP tool admission') {
      const value = entry.value as { http: number; result: { isError?: boolean; content: { text: string }[] } };
      actual = { checkpoint: entry.checkpoint, value: { denied: Boolean(value.result.isError), budgetError: Boolean(value.result.isError) && value.result.content[0]?.text.includes('budget exceeded') } };
    }
    const result = differs(entry.checkpoint, 'bounded admission', actual, expected[index]); if (result) return result;
  }
  return differs('admission cleanup complete', 'bounded admission', trace.filter(entry => entry.checkpoint === 'admission cleanup complete').map(entry => entry.value), [true]) ?? differs('admission history completion', 'bounded admission', trace.length, expected.length + 1) ?? pass;
}
oracleProperty({
  id: 'work-admission-security', owns: ['src/security-budgets.ts', 'src/ai/provider.ts#complete', 'src/mcp.ts#serveMcp'],
  law: { statement: 'For every enumerated REST, MCP, registration and provider history, configured admission bounds actual work before execution, refuses exhausted work, preserves denied-scope capacity, releases failed reservations and resets only the next window counter.', authority: 'docs/auth-security-oracles.md resource admission and original operator ruling; https://cheatsheetseries.owasp.org/cheatsheets/Denial_of_Service_Cheat_Sheet.html', limits: 'Original finite two-action limits and concurrency batches, native/owner receivers and controlled provider transport; no deployed spend, throughput or arbitrary scheduling claim.' },
  histories, label: history => labels.get(JSON.stringify(history))!, model, driver, check,
  calibrations: [{ name: 'third write exceeds its window', law: 'bounded admission', history: { enumerated: 0 }, corrupt: trace => trace.map((entry, index) => index === 2 ? { ...entry, value: 201 } : entry) }],
});
