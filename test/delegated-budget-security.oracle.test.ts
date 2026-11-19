/** Delegated grants cannot spend the owner's reserved capacity or each other's
 * quota. This oracle owns security-budgets and complete at real REST/MCP and
 * provider-call checkpoints.
 *
 * ```ts
 * GET /api/settings // → 429 when this grant or the delegated aggregate is spent
 * GET /api/settings // → 200 for the owner beside delegated exhaustion
 * POST /studio/mcp tools/call(generateItem) // → budget error before the owner reserve
 * ```
 * A per-grant quota alone allows fan-out; a shared quota alone lets one client
 * starve another. The operator policy in docs/auth-security-oracles.md requires
 * both, plus an AI total ceiling and an owner reserve. For every finite quota
 * history, only admitted work consumes capacity and delegated work cannot consume
 * owner reservation; REST and MCP retain the same principal distinction.
 *
 * Histories carry limits and principal actions. The independent counter model
 * predicts admission without calling production quota code. Drivers record HTTP
 * responses, MCP envelopes, provider return/error outcomes and actual call counts.
 * Checks compare every response before checking completeness. Provider transport
 * is controlled; native manual credentials exercise the actual REST/MCP boundary.
 * These fixed-window witnesses do not establish deployed spend or throughput.
 */
import { differs, oracleProperty, pass, type Observation } from '@tanstack/oracles';
import { env } from 'cloudflare:test';
import { beforeEach, vi } from 'vitest';
import { flow } from './oauth-flow-driver.ts';
import { testItemRevision } from './helpers.ts';
import { withOracleStorage } from './oracle-storage.ts';
import { complete } from '../src/ai/provider.ts';
import { withWorkPrincipal } from '../src/security-budgets.ts';
import { putSettings } from '../src/model.ts';
type Principal = 'owner' | 0 | 1;
type ReadHistory = { kind: 'read'; perGrant: number; aggregate: number; actions: Principal[] };
type AiHistory = { kind: 'provider' | 'mcp'; total: number; reserve: number; grant: number; actions: ('owner' | 'delegated')[] };
type History = ReadHistory | AiHistory;
const histories: History[] = [
  { kind: 'read', perGrant: 2, aggregate: 2, actions: [0, 0, 0, 'owner', 1] },
  { kind: 'read', perGrant: 2, aggregate: 4, actions: [0, 0, 0, 1, 1, 1, 'owner'] },
  { kind: 'provider', total: 4, reserve: 2, grant: 4, actions: ['delegated', 'delegated', 'delegated', 'owner', 'owner', 'owner'] },
  { kind: 'mcp', total: 3, reserve: 2, grant: 3, actions: ['delegated', 'delegated', 'owner', 'owner', 'owner'] },
];
const label = (history: History) => history.kind === 'read' ? history.aggregate === history.perGrant ? 'delegated aggregate exhaustion leaves the owner capacity available' : 'each grant has its own quota within the delegated aggregate ceiling' : history.kind === 'provider' ? 'delegated AI cannot spend the owner reserve or exceed the total cost ceiling' : 'AI work through an MCP tool spends the grant share, not the owner reserve';
beforeEach(async () => { await env.DB.prepare('DELETE FROM security_budgets').run(); });
// Account, per-grant and delegated aggregate are distinct model counters. Removing
// any one changes a continuation in the two read histories. AI uses total and
// delegated counts; the latter distinguishes remaining owner reservation.
function model(history: History): Observation[] {
  if (history.kind === 'read') {
    const used = new Map<Principal, number>(), trace: Observation[] = [{ checkpoint: 'delegated manual issuance', value: 200 }, { checkpoint: 'delegated manual issuance', value: 200 }];
    let aggregate = 0;
    for (const principal of history.actions) {
      const accepted = (used.get(principal) ?? 0) < history.perGrant && (principal === 'owner' || aggregate < history.aggregate);
      trace.push({ checkpoint: 'delegated read admission', value: accepted ? 200 : 429 });
      if (accepted) { used.set(principal, (used.get(principal) ?? 0) + 1); if (principal !== 'owner') aggregate++; }
    }
    return trace;
  }
  const trace: Observation[] = history.kind === 'mcp' ? [{ checkpoint: 'delegated generation draft', value: 201 }, { checkpoint: 'delegated MCP issuance', value: 200 }] : [];
  let total = 0, delegated = 0;
  for (const principal of history.actions) {
    const accepted = total < history.total && (principal === 'owner' || delegated < history.grant && total < history.total - history.reserve);
    if (accepted) { total++; if (principal === 'delegated') delegated++; }
    if (history.kind === 'provider') trace.push({ checkpoint: 'delegated provider outcome', value: { accepted, budgetError: !accepted, calls: total } });
    else if (principal === 'delegated') trace.push({ checkpoint: 'delegated MCP HTTP', value: 200 }, { checkpoint: 'delegated MCP generation', value: { denied: !accepted, strictDenied: !accepted, budgetError: !accepted, calls: total } });
    else trace.push({ checkpoint: 'reserved owner generation', value: { status: accepted ? 200 : 429, calls: total } });
  }
  return trace;
}
async function driver(history: History, observe: (checkpoint: string, value: unknown) => void) {
  await withOracleStorage(async () => {
    if (history.kind === 'read') {
      const f = await flow(), tokens: string[] = [];
      for (const name of ['delegated A', 'delegated B']) {
        const response = await f.request('/blyg/api/authorizations', { method: 'POST', headers: { cookie: f.owner, 'Content-Type': 'application/json' }, body: JSON.stringify({ name, scope: ['owner:read'], resource: 'api' }) });
        observe('delegated manual issuance', response.status); tokens.push((await response.json() as { accessToken: string }).accessToken);
      }
      const bindings = { ...env, API_READ_LIMIT: String(history.perGrant), API_DELEGATED_READ_LIMIT: String(history.aggregate) };
      for (const principal of history.actions) observe('delegated read admission', (await f.request('/blyg/api/settings', { headers: principal === 'owner' ? { cookie: f.owner } : { Authorization: 'Bearer ' + tokens[principal] } }, bindings)).status);
      return;
    }
    await putSettings(env.DB, { ai_model_tk: 'claude-opus-5' });
    const bindings = { ...env, AI_PROVIDER_KEY: 'disposable-provider-fixture', AI_DAILY_CALL_LIMIT: String(history.total), AI_OWNER_RESERVED_CALLS: String(history.reserve), AI_GRANT_DAILY_CALL_LIMIT: String(history.grant) };
    let calls = 0;
    if (history.kind === 'provider') {
      const delegated = withWorkPrincipal(bindings, { scope: ['owner:draft'], clientId: 'ai-client', grantId: 'ai-grant', userId: 'owner' });
      const transport = async () => { calls++; return { ok: true, status: 200, text: async () => JSON.stringify({ model: 'claude-opus-5', content: [{ type: 'text', text: 'Fixture' }] }) }; };
      for (const principal of history.actions) {
        // Only complete's contractual result/error is recorded. Fixture and
        // cleanup exceptions retain their original runner diagnostics.
        let outcome: { value: unknown } | { error: unknown };
        try { outcome = { value: await complete(principal === 'owner' ? bindings : delegated, 'system', 'user', transport, 'tk') }; }
        catch (error) { outcome = { error }; }
        observe('delegated provider outcome', { outcome, calls });
      }
      return;
    }
    const f = await flow();
    const created = await f.request('/blyg/api/items', { method: 'POST', headers: { cookie: f.owner, 'Content-Type': 'application/json' }, body: JSON.stringify({ contentMd: '[TK]write more[/TK]' }) }, bindings);
    observe('delegated generation draft', created.status);
    const { id } = await created.json() as { id: string };
    const minted = await f.request('/blyg/api/authorizations', { method: 'POST', headers: { cookie: f.owner, 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'MCP AI', scope: ['owner:draft'], resource: 'mcp' }) }, bindings);
    observe('delegated MCP issuance', minted.status);
    const { accessToken } = await minted.json() as { accessToken: string };
    const original = globalThis.fetch;
    const spy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      if (!String(input instanceof Request ? input.url : input).startsWith('https://api.anthropic.com/')) return original(input, init);
      calls++; return Response.json({ model: 'claude-opus-5', content: [{ type: 'text', text: 'Fixture' }] });
    });
    try {
      for (const principal of history.actions) {
        if (principal === 'owner') {
          const response = await f.request('/blyg/api/items/' + id + '/generate', { method: 'POST', headers: { cookie: f.owner, 'Content-Type': 'application/json' }, body: JSON.stringify({ scope: 0, expectedRevision: await testItemRevision(id) }) }, bindings);
          observe('reserved owner generation', { status: response.status, calls });
        } else {
          const response = await f.request('/blyg/studio/mcp', { method: 'POST', headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', 'mcp-protocol-version': '2026-07-28', 'mcp-method': 'tools/call', 'mcp-name': 'generateItem' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'generateItem', arguments: { path: { id }, body: { scope: 0, expectedRevision: await testItemRevision(id) } }, _meta: { 'io.modelcontextprotocol/protocolVersion': '2026-07-28', 'io.modelcontextprotocol/clientCapabilities': {} } } }) }, bindings);
          observe('delegated MCP HTTP', response.status);
          const result = (await response.json() as { result: { isError?: boolean; content: { text: string }[] } }).result;
          observe('delegated MCP generation', { result, calls });
        }
      }
    } finally { spy.mockRestore(); }
  });
  observe('delegated cleanup complete', true);
}
function check(_history: History, trace: readonly Observation[], expected: Observation[]) {
  for (let index = 0; index < trace.length; index++) {
    const entry = trace[index]; if (entry.checkpoint === 'delegated cleanup complete') continue; let actual: Observation = entry;
    if (entry.checkpoint === 'delegated provider outcome') {
      const value = entry.value as { outcome: { value?: unknown; error?: unknown }; calls: number };
      actual = { checkpoint: entry.checkpoint, value: { accepted: 'value' in value.outcome, budgetError: 'error' in value.outcome && /budget/i.test(value.outcome.error instanceof Error ? value.outcome.error.message : String(value.outcome.error)), calls: value.calls } };
    } else if (entry.checkpoint === 'delegated MCP generation') {
      const value = entry.value as { http: number; result: { isError?: boolean; content: { text: string }[] }; calls: number };
      actual = { checkpoint: entry.checkpoint, value: { denied: Boolean(value.result.isError), strictDenied: value.result.isError === true, budgetError: Boolean(value.result.isError) && value.result.content[0]?.text.includes('budget'), calls: value.calls } };
    }
    const result = differs(entry.checkpoint, 'delegated capacity', actual, expected[index]); if (result) return result;
  }
  return differs('delegated cleanup complete', 'delegated capacity', trace.filter(entry => entry.checkpoint === 'delegated cleanup complete').map(entry => entry.value), [true]) ?? differs('delegated budget completion', 'delegated capacity', trace.length, expected.length + 1) ?? pass;
}
oracleProperty({
  id: 'delegated-budget-security', owns: ['src/security-budgets.ts', 'src/ai/provider.ts#complete', 'src/operation-runner.ts#executeOperation'],
  law: { statement: 'For every enumerated principal history, separate grant and delegated aggregate quotas bound admitted work while preserving owner capacity, and AI reservation never bypasses its total ceiling.', authority: 'docs/auth-security-oracles.md delegated budgets and original operator ruling; https://cheatsheetseries.owasp.org/cheatsheets/Denial_of_Service_Cheat_Sheet.html', limits: 'Two real manual grants, explicit low fixed-window quotas, controlled provider transport and the real MCP generation hop; no deployed spend or throughput claim.' },
  histories, label, model, driver, check,
  calibrations: [{ name: 'delegated grant spends reserved owner capacity', law: 'delegated capacity', history: { enumerated: 0 }, corrupt: trace => trace.map((entry, index) => index === 5 ? { ...entry, value: 429 } : entry) }],
});
