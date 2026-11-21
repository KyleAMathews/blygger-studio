/**
 * Edge admission uses authoritative addresses, never forged forwarding headers.
 * This owns the mounted registration/login receiving boundary and native issuer
 * and cookie constraints in auth.ts and authorizationServer.
 *
 * ```ts
 * POST /blyg/studio/auth/oauth2/register // → five admissions per address/minute
 * POST /blyg/studio/login // → no cookie on password or admission denial
 * GET /blyg/studio/auth/.well-known/openid-configuration // → request-host issuer
 * GET /blyg/studio/auth/oauth2/authorize // → host-only secure native cookie
 * ```
 * Nine concurrent requests with nine forwarded addresses still share one budget.
 * For every bounded history, authoritative principal, endpoint and minute decide
 * admission; IPv6 /64 neighbors and missing-edge fallback share their principal.
 * Local policy sets five per minute. RFC9700 §4.13 defines proxy trust, and OWASP
 * Authentication/Session Management guidance defines throttling/cookie concerns.
 *
 * Plans contain requests and controlled address topology, with no expected answers.
 * The independent counter model predicts statuses. The driver records completed
 * batches, cookies, retry values and D1 counters. The check compares every batch;
 * concurrent response order remains free. A second property checks host authority.
 * Limits: controlled CF-Connecting-IP and Date cannot prove live proxy enforcement.
 */
import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { vi } from 'vitest';
import { differs, oracleProperty, pass, type Observation } from '@tanstack/oracles';
import { makeApp } from '../src/index.ts';
import { withOracleStorage } from './oracle-storage.ts';
const base = 'https://deployment-oracle.example.test';
// Cookie credentials and absolute expiry timestamps are not observations owed by
// these laws. Preserve names and raw scope/flag attributes, without their secret
// values; the checker, rather than this projection, decides required attributes.
type CookieFacts = { names: string[]; attributes: string[] };
function cookieFacts(header: string | null | undefined): CookieFacts | null | undefined {
  if (header == null) return header;
  const [credential, ...attributes] = header.split(';');
  return { names: Array.from(credential.matchAll(/(?:^|,\s*)([^=;,\s]+)=/g), match => match[1]),
    attributes: attributes.map(value => value.trim()).map(value => /^(expires|max-age)=/i.test(value) ? value.slice(0, value.indexOf('=')) : value) };
}
type Address = { ip: string; principal: string };
type BudgetAction = { source: Address; count: number; concurrent?: boolean; spoofStart?: number; missingEdge?: boolean; password?: 'wrong' | 'owner' };
type Action = ({ op: 'register' } & BudgetAction) | ({ op: 'login' } & BudgetAction) | { op: 'token'; source: Address } | { op: 'private-budget-route'; source: Address } | { op: 'advance'; milliseconds: number } | { op: 'counter' };
type Plan = { name: string; actions: Action[] };
const v4 = (last: number): Address => ({ ip: `198.51.100.${last}`, principal: `v4-${last}` });
// principal is the controlled address topology, not a production IP classifier.
const a = { ip: '2001:db8:1234:1::1', principal: 'subnet-1' }, expanded = { ip: '2001:0db8:1234:0001:0000:0000:0000:0002', principal: 'subnet-1' }, b = { ip: '2001:db8:1234:2::1', principal: 'subnet-2' };
const plans: Plan[] = [
  { name: 'shares an atomic registration budget and rejects spoofed forwarded identities', actions: [{ op: 'register', source: v4(101), count: 9, concurrent: true, spoofStart: 10 }, { op: 'register', source: v4(101), count: 1, spoofStart: 99 }, { op: 'counter' }, { op: 'register', source: v4(102), count: 1 }, { op: 'token', source: v4(101) }] },
  { name: 'normalizes IPv6 subnets and starts a fresh budget after the window', actions: [{ op: 'register', source: a, count: 5 }, { op: 'register', source: expanded, count: 1 }, { op: 'register', source: b, count: 1 }, { op: 'advance', milliseconds: 60001 }, { op: 'register', source: a, count: 1 }] },
  { name: 'limits owner password guesses without blocking another address or minting cookies', actions: [{ op: 'login', source: v4(110), count: 5, password: 'wrong' }, { op: 'login', source: v4(110), count: 1, password: 'owner' }, { op: 'login', source: v4(111), count: 1, password: 'owner' }, { op: 'private-budget-route', source: v4(110) }] },
  { name: 'uses a shared fallback budget when no authoritative IP header reaches the Worker', actions: [{ op: 'register', source: v4(120), count: 7, missingEdge: true, spoofStart: 20 }] },
];
type Batch = { op: string; statuses?: number[]; counter?: number; cookie?: 'none' | 'owner'; retry?: boolean };
// The only retained state is admitted count by principal, endpoint and minute.
// Each dimension has a distinguishing original history (subnet/token/window).
function model(plan: Plan): Batch[] {
  const counts = new Map<string, number>(); let time = 0;
  return plan.actions.flatMap<Batch>(action => {
    if (action.op === 'advance') { time += action.milliseconds; return []; }
    if (action.op === 'counter') return [{ op: action.op, counter: Math.max(0, ...counts.values()) }];
    if (action.op === 'token' || action.op === 'private-budget-route') return [{ op: action.op, statuses: [action.op === 'token' ? 400 : 404] }];
    const key = `${action.op}:${action.missingEdge ? 'fallback' : action.source.principal}:${Math.floor(time / 60000)}`;
    const statuses = Array.from({ length: action.count }, () => {
      const used = counts.get(key) ?? 0; if (used >= 5) return 429;
      counts.set(key, used + 1); return action.op === 'register' ? 201 : action.password === 'owner' ? 302 : 403;
    });
    return [{ op: action.op, statuses: action.concurrent ? statuses.sort() : statuses,
      ...(action.op === 'login' ? { cookie: statuses.every(status => status === 302) ? 'owner' as const : 'none' as const } : {}),
      ...(action.op === 'register' && action.count === 1 && statuses[0] === 429 ? { retry: true } : {}) }];
  });
}
function receiver(ip: string) {
  const app = makeApp('/blyg');
  const fetch = async (path: string, init: RequestInit = {}, spoof = '203.0.113.1') => {
    const ctx = createExecutionContext();
    const response = await app.fetch(new Request(base + path, { ...init, headers: { 'cf-connecting-ip': ip, 'x-forwarded-for': spoof, ...Object.fromEntries(new Headers(init.headers)) } }), env, ctx);
    await waitOnExecutionContext(ctx); return response;
  };
  return { fetch, register: (spoof?: string, missingEdge?: boolean) => fetch('/blyg/studio/auth/oauth2/register', { method: 'POST', headers: { ...(missingEdge ? { 'cf-connecting-ip': '' } : {}), 'Content-Type': 'application/json' }, body: JSON.stringify({ ...(missingEdge ? {} : { client_name: 'deployment oracle', grant_types: ['authorization_code'], response_types: ['code'] }), redirect_uris: ['https://client.example.test/callback'], token_endpoint_auth_method: 'none' }) }, spoof) };
}
async function driver(plan: Plan, observe: (checkpoint: string, value: unknown) => void) {
  await withOracleStorage(async () => {
    const now = Date.now(); let time = 0; const clock = vi.spyOn(Date, 'now').mockImplementation(() => now + time);
    try {
      for (const action of plan.actions) {
        if (action.op === 'advance') { time += action.milliseconds; continue; }
        if (action.op === 'counter') { const row = await env.DB.prepare('SELECT MAX(count) AS count FROM rateLimit').first<{ count: number }>(); observe('edge admission', { op: action.op, counter: row?.count }); continue; }
        const d = receiver(action.source.ip);
        if (action.op === 'token' || action.op === 'private-budget-route') {
          const response = await d.fetch(action.op === 'token' ? '/blyg/studio/auth/oauth2/token' : '/blyg/studio/auth/internal/owner-login-budget', { method: 'POST', ...(action.op === 'token' ? { body: new URLSearchParams({ grant_type: 'authorization_code' }) } : {}) });
          observe('edge admission', { op: action.op, statuses: [response.status] }); continue;
        }
        const request = (index: number) => action.op === 'register' ? d.register(action.spoofStart === undefined ? undefined : `203.0.113.${action.spoofStart + index}`, action.missingEdge) : d.fetch('/blyg/studio/login', { method: 'POST', body: new URLSearchParams({ password: action.password === 'owner' ? env.OWNER_PASSWORD : 'wrong' }) });
        const responses: Response[] = [];
        if (action.concurrent) responses.push(...await Promise.all(Array.from({ length: action.count }, (_, index) => request(index))));
        else for (let index = 0; index < action.count; index++) responses.push(await request(index));
        observe('edge admission', { op: action.op, statuses: action.concurrent ? responses.map(response => response.status).sort() : responses.map(response => response.status), cookies: responses.map(response => cookieFacts(response.headers.get('set-cookie'))), retries: responses.map(response => Number(response.headers.get('x-retry-after'))) });
      }
    } finally { clock.mockRestore(); }
  });
  observe('edge admission complete', true);
}
const check = (_plan: Plan, trace: readonly Observation[], expected: Batch[]) => {
  for (let index = 0; index < trace.length; index++) {
    const entry = trace[index];
    if (entry.checkpoint === 'edge admission complete') {
      const result = differs('edge admission completion', 'authoritative edge budget', { index, value: entry.value }, { index: expected.length, value: true });
      if (result) return result;
      continue;
    }
    if (!expected[index]) return differs('edge admission completion', 'authoritative edge budget', index, expected.length)!;
    const wanted = expected[index], actual = entry.value as Batch & { cookies?: (CookieFacts | null)[]; retries?: number[] };
    // All three predicates judge the received batch. Keeping its checkpoint
    // lets the framework retain that violation if later cleanup also fails.
    const result = differs(entry.checkpoint, 'authoritative edge budget', { op: actual.op, statuses: actual.statuses, counter: actual.counter }, { op: wanted.op, statuses: wanted.statuses, counter: wanted.counter }); if (result) return result;
    if (wanted.cookie) { const result = differs(entry.checkpoint, 'authoritative edge budget', actual.cookies?.map(cookie => wanted.cookie === 'none' ? cookie === null : cookie?.names.includes('blyg_session') === true), wanted.statuses!.map(() => true)); if (result) return result; }
    if (wanted.retry) { const result = differs(entry.checkpoint, 'authoritative edge budget', actual.retries?.map(value => value > 0), [true]); if (result) return result; }
  }
  return pass;
};
oracleProperty({
  id: 'auth-deployment', owns: ['src/auth.ts', 'src/oauth.ts#authorizationServer'],
  law: { statement: 'For every bounded edge request history, admission shares the five-per-minute authoritative-address budget across concurrent provider instances, IPv6 neighbors and missing-edge fallback; endpoint, subnet and time neighbors remain usable, and rejected logins issue no cookie.', authority: 'Existing auth-deployment receiving laws; local five-per-minute policy; RFC9700 §4.13; OWASP Authentication Cheat Sheet login throttling', limits: 'Original four admission histories; controlled edge and Date, not real proxy enforcement.' },
  histories: plans, label: plan => plan.name, model, driver, check,
  calibrations: [{ name: 'forwarded addresses buy fresh budgets', law: 'authoritative edge budget', history: { enumerated: 0 }, corrupt: trace => trace.map((entry, index) => index === 0 ? { ...entry, value: { ...(entry.value as object), statuses: Array(9).fill(201) } } : entry) }],
});
const cookiePlans = [{ name: 'keeps native cookies host-only and ignores forged forwarded origins', origin: base, mount: '/blyg', forwardedHost: 'attacker.example', forwardedProto: 'http' }];
// Host authority is derived solely from installation inputs. Attribute order and
// opaque cookie bytes are freedoms; the semantic constraints are not.
oracleProperty({
  id: 'auth-deployment-cookie', owns: ['src/auth.ts', 'src/oauth.ts#authorizationServer'],
  law: { statement: 'For every bounded mounted authorization, forwarding headers leave the request-host issuer unchanged and its native cookie present, HttpOnly, Secure, SameSite=Lax, scoped to the mounted auth path and host-only.', authority: 'Existing auth-deployment cookie receiving law; RFC9700 §4.13; OWASP Session Management Cheat Sheet cookies', limits: 'Original controlled mounted HTTPS receiving witness, not a browser cookie-store or deployed proxy claim.' },
  histories: cookiePlans, label: plan => plan.name,
  model: plan => ({ issuer: plan.origin + plan.mount + '/studio/auth', status: 200, attributes: ['HttpOnly', 'Secure', 'SameSite=Lax', `Path=${plan.mount}/studio/auth`] }),
  driver: async (plan, observe) => withOracleStorage(async () => {
    const d = receiver('198.51.100.121');
    const metadata = await d.fetch('/blyg/studio/auth/.well-known/openid-configuration', { headers: { 'x-forwarded-host': plan.forwardedHost, 'x-forwarded-proto': plan.forwardedProto } });
    observe('deployment issuer', (await metadata.json() as { issuer?: string }).issuer);
    const registered = await (await d.register()).json() as { client_id: string };
    const login = await d.fetch('/blyg/studio/login', { method: 'POST', body: new URLSearchParams({ password: env.OWNER_PASSWORD }) });
    const cookie = login.headers.get('set-cookie')!.split(';')[0];
    const response = await d.fetch('/blyg/studio/auth/oauth2/authorize?' + new URLSearchParams({ client_id: registered.client_id, response_type: 'code', redirect_uri: 'https://client.example.test/callback', scope: 'owner:read', resource: plan.origin + plan.mount + '/api', code_challenge: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', code_challenge_method: 'S256' }), { headers: { cookie } });
    observe('native session cookie', { status: response.status, cookie: cookieFacts(response.headers.getSetCookie().find(value => value.includes('better-auth.session_token='))) });
  }).then(() => { observe('deployment cookie complete', true); }),
  check: (_plan, trace, expected) => {
    const actual = trace[1]?.value as { status: number; cookie?: CookieFacts | null } | undefined;
    return (trace[0] ? differs('deployment issuer', 'host-only native authority', trace[0].value, expected.issuer) : undefined)
      ?? (trace[1] ? differs('native session cookie', 'host-only native authority', { status: actual?.status, exists: actual?.cookie !== undefined, attributes: expected.attributes.map(value => actual?.cookie?.attributes.includes(value) === true), domain: actual?.cookie?.attributes.some(value => value.toLowerCase().startsWith('domain=')) }, { status: expected.status, exists: true, attributes: expected.attributes.map(() => true), domain: false }) : undefined)
      ?? (trace[2] ? differs(trace[2].checkpoint, 'host-only native authority', trace.slice(2), [{ checkpoint: 'deployment cookie complete', value: true }]) : undefined) ?? pass;
  },
  calibrations: [{ name: 'native cookie accepts a parent domain', law: 'host-only native authority', history: { enumerated: 0 }, corrupt: trace => trace.map(entry => entry.checkpoint === 'native session cookie' ? { ...entry, value: { ...(entry.value as { status: number; cookie: CookieFacts }), cookie: { ...(entry.value as { cookie: CookieFacts }).cookie, attributes: [...(entry.value as { cookie: CookieFacts }).cookie.attributes, 'Domain=example.test'] } } } : entry) }],
});
