/** This oracle owns read-only fork discovery's public fetch, pinned-version
 * projection and dependency secrecy at GET /api/fork-options.
 *
 * ```ts
 * GET('/api/fork-options?origin=public&id=item') // → pinned choices, one fetch
 * GET('/api/fork-options?origin=loopback&id=item') // → no private transport/bytes
 * GET('/api/fork-options?origin=failing&id=item') // → no dependency secret
 * ```
 * Read scope permits a bounded public fetch; it does not confer LAN authority.
 * For every controlled remote-document plan, the returned choices contain only
 * pinned versions and private/error bytes stay out of API output. A pure model
 * projects the supplied publisher changelog and predicts transport admission.
 * The driver invokes the real REST handler after injected read authorization,
 * recording status/body and fetch destinations. No alternate verifier is used.
 * Limits: the three original local transport histories; token validation is
 * owned elsewhere and DNS preflight does not prove connection-time enforcement.
 */
import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { differs, oracleProperty, pass } from '@tanstack/oracles';
import { vi } from 'vitest';
import { Hono } from 'hono';
import { createOwnerApi } from '../src/owner-api.ts';
import { completed, receivingTrace } from './network-oracle-observations.ts';
import { withOracleStorage } from './oracle-storage.ts';
type Version = { version: number; pinned: boolean; at?: string; note?: string | null };
type Plan = { name: string; origin: string; visibility: 'public' | 'private'; changelog: Version[]; transportError?: string; bodyMarker?: string };
const histories: Plan[] = [
  { name: 'bounded public fork discovery remains usable without a subscription', origin: 'https://public-publisher.example/', visibility: 'public', changelog: [{ version: 1, at: '2026-10-01', note: null, pinned: true }, { version: 2, pinned: false }] },
  { name: 'read-only fork discovery never reaches private network transport', origin: 'http://127.0.0.1/', visibility: 'private', changelog: [], bodyMarker: 'private bytes' },
  { name: 'fork discovery does not echo dependency exception secrets', origin: 'https://public-publisher.example/', visibility: 'public', changelog: [], transportError: 'disposable-transport-secret-sentinel' },
];
// The publisher fixture is an input, so pinned projection is independent of the
// receiving implementation. It preserves order and every promised field.
const model = (plan: Plan) => ({ status: 200, versions: plan.changelog.filter(version => version.pinned).map(({ version, at, note }) => ({ version, at, note })), transportCalls: plan.visibility === 'private' ? 0 : 1, hidden: [plan.bodyMarker, plan.transportError].filter((value): value is string => !!value) });
oracleProperty({
  id: 'fork-fetch-security', owns: ['src/owner-api.ts#createOwnerApi', 'src/importer/http.ts'],
  law: { statement: 'For every controlled read-only fork-discovery history, public pinned choices remain usable while private destinations receive no transport and dependency errors disclose no secret bytes.', authority: 'Existing fork-discovery receiving law; docs/auth-security-oracles.md Content, resource and grant follow-up; OWASP SSRF prevention guidance', limits: 'Three controlled fetch histories with injected read authority; no native token or connection-time rebinding claim.' },
  histories, label: plan => plan.name, model,
  driver: (plan, observe) => completed(observe, () => withOracleStorage(async () => {
    const app = new Hono().route('/api', createOwnerApi({ scope: ['owner:read'], clientId: 'fork-reader', userId: 'owner' }));
    const destinations: string[] = [];
    const spy = vi.spyOn(globalThis, 'fetch').mockImplementation(async input => {
      const url = String(input instanceof Request ? input.url : input); destinations.push(url);
      if (url.startsWith('https://cloudflare-dns.com/')) return Response.json({ Status: 0, Answer: [{ type: 1, data: '93.184.216.34' }] });
      if (plan.transportError) throw new Error(plan.transportError);
      return plan.bodyMarker ? new Response(plan.bodyMarker) : Response.json({ changelog: plan.changelog });
    });
    try {
      const ctx = createExecutionContext();
      const response = await app.fetch(new Request('https://fork-review.example/api/fork-options?' + new URLSearchParams({ origin: plan.origin, id: '00000000000000000000000001' })), env, ctx);
      await waitOnExecutionContext(ctx);
      observe('fork discovery response', { status: response.status, body: await response.text(), destinations });
    } finally { spy.mockRestore(); }
  })),
  check: (plan, rawTrace, expected) => {
    const { observations: trace, complete } = receivingTrace(rawTrace);
    const count = differs(trace[1]?.checkpoint ?? 'fork response count', 'bounded public fork discovery', trace.length, complete ? 1 : Math.min(trace.length, 1)); if (count) return count;
    if (!trace.length) return pass;
    // Each subpredicate judges the same received response. Retain that checkpoint
    // so a later cleanup failure cannot replace an earlier semantic violation.
    const entry = trace[0], actual = entry.value as { status: number; body: string; destinations: string[] };
    const status = differs(entry.checkpoint, 'bounded public fork discovery', actual.status, expected.status); if (status) return status;
    if (!plan.transportError && plan.visibility === 'public') {
      let parsed: { versions?: unknown }; try { parsed = JSON.parse(actual.body); } catch { return differs(entry.checkpoint, 'bounded public fork discovery', actual.body, { versions: expected.versions })!; }
      const versions = differs(entry.checkpoint, 'bounded public fork discovery', parsed.versions, expected.versions); if (versions) return versions;
    }
    for (const hidden of expected.hidden) { const secret = differs(entry.checkpoint, 'bounded public fork discovery', actual.body.includes(hidden), false); if (secret) return secret; }
    return differs(entry.checkpoint, 'bounded public fork discovery', actual.destinations.filter(url => !url.startsWith('https://cloudflare-dns.com/')).length, expected.transportCalls)
      ?? (plan.visibility === 'private' ? differs(entry.checkpoint, 'bounded public fork discovery', actual.destinations, []) : undefined) ?? pass;
  },
  calibrations: [{ name: 'private transport runs', law: 'bounded public fork discovery', history: { enumerated: 1 }, corrupt: trace => trace.map(entry => entry.checkpoint !== 'fork discovery response' ? entry : ({ ...entry, value: { ...(entry.value as object), destinations: ['http://127.0.0.1/'] } })) }],
});
