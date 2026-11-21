/**
 * A delegated credential grants only its approved scopes at its approved resource.
 * Revocation and expiry must change the next receiving decision, even when the JWT
 * signature remains valid. One successful request cannot distinguish these laws.
 *
 * Contract: decision #52 and docs/auth-oracles.md define four non-implicative owner
 * scopes and a thirty-day manual grant. RFC6750 §3 distinguishes invalid credentials
 * from insufficient scope; RFC8707 §2 binds a grant to a resource:
 * https://www.rfc-editor.org/rfc/rfc6750.html#section-3
 * https://www.rfc-editor.org/rfc/rfc8707.html#section-2
 * Model: AuthorizationModel stores scope, resource, expiry and revocation only.
 * Its generation changes on signing-secret rotation or revoke-all. Decision #31
 * and the user ruling preserve delegated credentials on owner-password reset.
 * History grammar: three slots, all nonempty scope masks, API/MCP audiences,
 * issuance, operations, revocation, password/secret rotation and deadline neighbors.
 * Every history first issues a live credential. Generated histories are bounded;
 * fixed witnesses force rare deadline and independent-grant distinctions.
 * Driver: real mounted Worker routes, owner login and native manual issuance.
 * Refinement: compare each completed API decision and denied-response challenge.
 * A permitted missing-item publish returns404, which witnesses authorization past
 * the guard; it does not prove a successful publish. Audience denial reaches MCP,
 * but successful MCP behavior belongs to mcp.oracle.test.ts.
 * Limits: eight histories per fixed/random campaign are sampling, not exhaustion.
 * Replay uses the same grammar and named checkpoint through oracle-campaign.ts.
 */
import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { vi } from 'vitest';
import { differs, oracleProperty, pass, type Observation } from '@tanstack/oracles';
import fc from 'fast-check';
import { makeApp } from '../src/index.ts';
import type { Env } from '../src/types.ts';
import { AuthorizationModel, type Scope, type Resource } from './auth-oracle-model.ts';

const scopeNames: Scope[] = ['owner:read', 'owner:draft', 'owner:publish', 'owner:manage'];
const scopes = (mask: number) => scopeNames.filter((_, index) => mask & 1 << index);
type Instruction = { op: 'mint' | 'read' | 'draft' | 'publish' | 'manage' | 'wrong-resource' | 'revoke' | 'revoke-all' | 'rotate' | 'password-reset' | 'advance'; slot: number; mask: number; resource: Resource; seconds: number };
// The grammar keeps slot reuse and root reset in one history: a new mint replaces
// only that slot. Signing-secret rotation and revoke-all invalidate earlier
// generations. Password reset changes the owner session, not credential state.
// Deadline neighbors distinguish > from >=. The short bounded domain deliberately
// omits arbitrary malformed scope names, which protocol suites cover separately.
const instruction = fc.record({ op: fc.constantFrom<Instruction['op']>('mint', 'read', 'draft', 'publish', 'manage', 'wrong-resource', 'revoke', 'revoke-all', 'rotate', 'password-reset', 'advance'), slot: fc.integer({ min: 0, max: 2 }), mask: fc.integer({ min: 1, max: 15 }), resource: fc.constantFrom<Resource>('api', 'mcp'), seconds: fc.constantFrom(0, 1, 2591999, 2592000, 2592001) });
const histories = fc.array(instruction, { minLength: 1, maxLength: 14 });

let browserSequence = 0;
async function driver(instructions: Instruction[], observe: (checkpoint: string, value: unknown) => void) {
  const ip = `2001:db8:${(++browserSequence).toString(16)}::1`;
  let now = 0;
  let currentEnv: Env = { ...env };
  const app = makeApp('/blyg');
  const base = 'https://oracle.example.test';
  const tokens = new Map<number, { token: string; id: string; resource: Resource }>();
  const clock = vi.spyOn(Date, 'now').mockImplementation(() => 1800000000000 + now * 1000);
  const request = async (path: string, options: RequestInit = {}) => {
    const ctx = createExecutionContext();
    const headers = new Headers(options.headers); headers.set('cf-connecting-ip', ip);
    const response = await app.fetch(new Request(base + path, { ...options, headers }), currentEnv, ctx);
    await waitOnExecutionContext(ctx);
    return response;
  };
  let ownerSession: { cookie: string; secret: string; password: string; at: number } | undefined;
  const owner = async (path: string, method: string, body?: unknown) => {
    // A history is one browser. Reuse its session until expiry or rotation.
    if (!ownerSession || ownerSession.secret !== currentEnv.COOKIE_SECRET || ownerSession.password !== currentEnv.OWNER_PASSWORD || now - ownerSession.at >= 2592000) {
      const login = await request('/blyg/studio/login', { method: 'POST', body: new URLSearchParams({ password: currentEnv.OWNER_PASSWORD }) });
      observe('authorization owner login', login.status);
      ownerSession = { cookie: login.headers.get('set-cookie')!.split(';')[0], secret: currentEnv.COOKIE_SECRET, password: currentEnv.OWNER_PASSWORD, at: now };
    }
    const cookie = ownerSession.cookie;
    return request(path, { method, headers: { cookie, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  };
  async function mint(slot: number, mask: number, resource: Resource) {
    const response = await owner('/blyg/api/authorizations', 'POST', { name: `oracle-${slot}`, scope: scopes(mask), resource });
    observe('authorization issuance', response.status);
    const value = await response.json() as { accessToken: string; expiresIn: number; authorization: { id: string; scope: string[]; resource: string } };
    observe('authorization lifetime and consent', { expiresIn: value.expiresIn, scope: value.authorization.scope, resource: value.authorization.resource });
    tokens.set(slot, { token: value.accessToken, id: value.authorization.id, resource });
  }
  // Every history starts with a usable credential: revocation and expiry have
  // a reached premise even if generated instructions start with those actions.
  try {
    await mint(0, 15, 'api');
    for (const action of instructions) {
      if (action.op === 'mint') { await mint(action.slot, action.mask, action.resource); continue; }
      if (action.op === 'advance') { now += action.seconds; continue; }
      if (action.op === 'rotate') { currentEnv = { ...currentEnv, COOKIE_SECRET: currentEnv.COOKIE_SECRET + '-rotated' }; }
      else if (action.op === 'password-reset') { currentEnv = { ...currentEnv, OWNER_PASSWORD: currentEnv.OWNER_PASSWORD + '-reset' }; }
      else if (action.op === 'revoke-all') { observe('authorization revocation', (await owner('/blyg/api/authorizations', 'DELETE')).status); }
      else if (action.op === 'revoke') { const token = tokens.get(action.slot); if (token) observe('authorization revocation', (await owner('/blyg/api/authorizations/' + token.id, 'DELETE')).status); }
      if (action.op === 'wrong-resource') {
        const audience = tokens.get(action.slot)?.resource;
        const target = audience === 'api' ? '/blyg/studio/mcp' : '/blyg/api/settings';
        const response = await request(target, { method: audience === 'api' ? 'POST' : 'GET', headers: { Authorization: 'Bearer ' + (tokens.get(action.slot)?.token ?? 'invalid-token') } });
        observe('authorization wrong audience', response.status);
        continue;
      }
      const operation = action.op === 'draft' ? { path: '/blyg/api/items', method: 'POST', body: { contentMd: 'oracle draft' }, scope: 'owner:draft' as Scope, success: 201 }
        : action.op === 'publish' ? { path: '/blyg/api/items/missing/publish', method: 'POST', body: { expectedRevision: 1 }, scope: 'owner:publish' as Scope, success: 404 }
        : action.op === 'manage' ? { path: '/blyg/api/settings', method: 'PATCH', body: {}, scope: 'owner:manage' as Scope, success: 200 }
        : { path: '/blyg/api/settings', method: 'GET', body: undefined, scope: 'owner:read' as Scope, success: 200 };
      const slot = action.op === 'revoke-all' || action.op === 'rotate' ? 0 : action.slot;
      const token = tokens.get(slot)?.token ?? 'invalid-fixture-token';
      const response = await request(operation.path, { method: operation.method, headers: { Authorization: 'Bearer ' + token, ...(operation.body === undefined ? {} : { 'Content-Type': 'application/json' }) }, ...(operation.body === undefined ? {} : { body: JSON.stringify(operation.body) }) });
      observe('authorization API decision', response.status);
      if (response.status === 401 || response.status === 403) observe('authorization challenge', response.headers.get('www-authenticate'));

    }
  } catch (error) { observe('authorization operation error', error instanceof Error ? error.message : String(error)); }
  finally { clock.mockRestore(); }
}
const action = (op: Instruction['op'], slot = 0, seconds = 0): Instruction => ({ op, slot, seconds, mask: 15, resource: 'api' });
const fixed = [
  { name: 'distinguishes the exact expiry boundary and another live credential after individual revocation', instructions: [action('mint', 1), action('advance', 0, 2591999), action('read'), action('revoke'), action('read', 1), action('advance', 0, 1), action('read', 1)] },
  { name: 'distinguishes root invalidation, scope denial, and audience denial', instructions: [{ op: 'mint', slot: 1, mask: 1, resource: 'api', seconds: 0 }, { op: 'draft', slot: 1, mask: 1, resource: 'api', seconds: 0 }, { op: 'mint', slot: 2, mask: 15, resource: 'mcp', seconds: 0 }, { op: 'wrong-resource', slot: 2, mask: 15, resource: 'mcp', seconds: 0 }, { op: 'rotate', slot: 0, mask: 15, resource: 'api', seconds: 0 }] as Instruction[] },
  { name: 'preserves delegated tokens after password reset with the signing key unchanged', instructions: [action('password-reset')] },
];
// Required reach describes the receiving premise, independently of whether the
// returned decision is correct. The reference tracks only the credential facts
// needed by those premises; a completed API checkpoint proves the request ran.
const authorizationStates = ['scope denial', 'wrong resource', 'last live second', 'exact expiry', 'individual revocation', 'live sibling after revocation', 'signing-secret rotation', 'revoke-all', 'password reset preserves authority', 'read operation', 'draft operation', 'publish operation', 'manage operation'];
function authorizationReach(instructions: Instruction[], trace: readonly Observation[]) {
  const model = new AuthorizationModel(), reached = new Set<string>();
  model.mint(0, scopes(15), 'api', 2592000);
  let decisions = 0, audiences = 0, revoked = false;
  const received = trace.filter(entry => entry.checkpoint === 'authorization API decision').length;
  const wrongResources = trace.filter(entry => entry.checkpoint === 'authorization wrong audience').length;
  for (const instruction of instructions) {
    if (instruction.op === 'mint') { model.mint(instruction.slot, scopes(instruction.mask), instruction.resource, 2592000); continue; }
    if (instruction.op === 'advance') { model.advance(instruction.seconds); continue; }
    if (instruction.op === 'rotate' || instruction.op === 'revoke-all') model.revokeAll();
    if (instruction.op === 'revoke') { model.revoke(instruction.slot); revoked = true; }
    if (instruction.op === 'wrong-resource') {
      if (++audiences <= wrongResources && model.credentials.has(instruction.slot)) reached.add('wrong resource');
      continue;
    }
    if (++decisions > received) continue;
    const slot = instruction.op === 'rotate' || instruction.op === 'revoke-all' ? 0 : instruction.slot;
    const credential = model.credentials.get(slot);
    const scope: Scope = instruction.op === 'draft' ? 'owner:draft' : instruction.op === 'publish' ? 'owner:publish' : instruction.op === 'manage' ? 'owner:manage' : 'owner:read';
    if (model.judge(slot, 'api', [scope]) === 403) reached.add('scope denial');
    if (credential && !credential.revoked && credential.generation === model.generation && credential.expires - model.now === 1) reached.add('last live second');
    if (credential && credential.expires === model.now) reached.add('exact expiry');
    if (credential?.revoked) reached.add('individual revocation');
    if (revoked && model.judge(slot, 'api', [scope]) === 200) reached.add('live sibling after revocation');
    if (instruction.op === 'rotate') reached.add('signing-secret rotation');
    if (instruction.op === 'revoke-all') reached.add('revoke-all');
    if (instruction.op === 'password-reset' && model.judge(slot, 'api', [scope]) === 200) reached.add('password reset preserves authority');
    if (['read', 'draft', 'publish', 'manage'].includes(instruction.op)) reached.add(instruction.op + ' operation');
  }
  return reached;
}
const authorizationConstructions = [
  { ...fixed[0], enters: ['last live second', 'exact expiry', 'individual revocation', 'live sibling after revocation', 'read operation'] },
  { ...fixed[1], enters: ['scope denial', 'wrong resource', 'signing-secret rotation', 'draft operation'] },
  { ...fixed[2], enters: ['password reset preserves authority'] },
  { name: 'revoke-all invalidates an issued credential', enters: ['revoke-all'], instructions: [action('revoke-all')] },
  { name: 'each operation receives only its explicit scope', enters: ['read operation', 'draft operation', 'publish operation', 'manage operation'], instructions: (['read', 'draft', 'publish', 'manage'] as const).flatMap((op, index) => [{ ...action('mint'), mask: 1 << index }, action(op)]) },
];
function reference(instructions: Instruction[]): Observation[] {
  const model = new AuthorizationModel(), trace: Observation[] = [];
  const mint = (slot: number, mask: number, resource: Resource) => {
    trace.push({ checkpoint: 'authorization issuance', value: 200 }, { checkpoint: 'authorization lifetime and consent', value: { expiresIn: 2592000, scope: scopes(mask), resource: 'https://oracle.example.test' + (resource === 'api' ? '/blyg/api' : '/blyg/studio/mcp') } });
    model.mint(slot, scopes(mask), resource, 2592000);
  };
  mint(0, 15, 'api');
  for (const instruction of instructions) {
    if (instruction.op === 'mint') { mint(instruction.slot, instruction.mask, instruction.resource); continue; }
    if (instruction.op === 'advance') { model.advance(instruction.seconds); continue; }
    if (instruction.op === 'rotate' || instruction.op === 'revoke-all') model.revokeAll();
    if (instruction.op === 'revoke') model.revoke(instruction.slot);
    if (instruction.op === 'wrong-resource') { trace.push({ checkpoint: 'authorization wrong audience', value: 401 }); continue; }
    const scope: Scope = instruction.op === 'draft' ? 'owner:draft' : instruction.op === 'publish' ? 'owner:publish' : instruction.op === 'manage' ? 'owner:manage' : 'owner:read';
    const status = model.judge(instruction.op === 'revoke-all' || instruction.op === 'rotate' ? 0 : instruction.slot, 'api', [scope]);
    trace.push({ checkpoint: 'authorization API decision', value: status === 200 ? instruction.op === 'draft' ? 201 : instruction.op === 'publish' ? 404 : 200 : status });
    if (status !== 200) trace.push({ checkpoint: 'authorization challenge', value: status });
  }
  return trace;
}
const check = (_instructions: Instruction[], observations: readonly Observation[], expected: Observation[]) => {
  const trace = observations.filter(entry => entry.checkpoint !== 'authorization owner login' && entry.checkpoint !== 'authorization revocation');
  for (const entry of observations) if (entry.checkpoint === 'authorization owner login' || entry.checkpoint === 'authorization revocation') {
    const mismatch = differs(entry.checkpoint, 'delegated authority', entry.value, entry.checkpoint === 'authorization owner login' ? 302 : 200);
    if (mismatch) return mismatch;
  }
  // Missing future decisions do not violate an already completed boundary.
  // Compare only received entries, then check the complete history length.
  for (let i = 0; i < trace.length; i++) {
    const wanted = expected[i], actual = trace[i];
    if (wanted?.checkpoint === 'authorization challenge') {
      const text = typeof actual?.value === 'string' ? actual.value : '';
      const mismatch = differs(actual.checkpoint, 'delegated authority', { checkpoint: actual?.checkpoint, metadata: text.includes('resource_metadata="https://oracle.example.test/blyg/studio/auth/resources/api"'), insufficient: wanted.value === 403 ? text.includes('insufficient_scope') : true }, { checkpoint: wanted.checkpoint, metadata: true, insufficient: true });
      if (mismatch) return mismatch;
    } else { const mismatch = differs(actual.checkpoint, 'delegated authority', actual, wanted); if (mismatch) return mismatch; }
  }
  return differs('authorization completion', 'delegated authority', trace.length, expected.length) ?? pass;
};
oracleProperty({
  id: 'authorization', owns: ['src/authorization-api.ts#authorizationApi', 'src/oauth.ts#verifyBearer', 'src/owner-api.ts#createOwnerApi'],
  law: { statement: 'For every bounded manual-grant history, issuance preserves approved lifetime, scopes and resource, and each receiving decision enforces explicit scope, resource, expiry and revocation; password reset alone preserves delegated authority.', authority: 'Decisions #31/#52; docs/auth-oracles.md; RFC6750 §3 and RFC8707 §2; existing AuthorizationModel', limits: 'Three credential slots, four defined scopes, API/MCP audiences and existing deadline neighbors; successful MCP operation coverage remains separate.' },
  histories: { arbitrary: histories, runs: 8, fixedSeeds: [20261001], states: authorizationStates, constructed: authorizationConstructions.map(item => ({ name: item.name, enters: item.enters, build: () => item.instructions })) },
  model: reference, driver, reached: authorizationReach, check,
  calibrations: [{ name: 'scope denial becomes success', law: 'delegated authority', history: { constructed: fixed[1].name }, corrupt: trace => trace.map(entry => entry.checkpoint === 'authorization API decision' && entry.value === 403 ? { ...entry, value: 201 } : entry) }],
});
