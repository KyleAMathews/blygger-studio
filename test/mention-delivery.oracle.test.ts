/**
 * Contract: src/mentions/discover.ts §2.3.4 specifies manifest-first discovery
 * for subscribed blygs and W3C discovery otherwise. Subscription origins are
 * literal URL prefixes; the established sender selects the longest match.
 * Adding an unrelated subscription must not stop delivery to an existing one.
 *
 * Model: recompute the longest matching blyg from an array using startsWith.
 * No production discovery classifier, SQL, or comparator supplies expectations.
 * Grammar: generated host names, source kinds, insertion orders and origin
 * lengths 49–96. Every input receives three subscription snapshots: parent
 * alone, parent plus a more specific blyg and RSS decoy, and a wildcard-looking
 * nonmatch. All contain an unrelated 58-byte origin (the production witness).
 * Lengths 49/50/51 reconstruct D1's boundary neighbors; the 58-byte witness is
 * invariant. Removing nested overlap loses longest-match coverage; removing
 * RSS loses kind discrimination; removing the wildcard nonmatch loses literal
 * matching and W3C fallback coverage. Names/order distinguish accidental fixed
 * endpoints and insertion-order selection. Invalid/noncanonical origins and
 * simultaneous subscription changes during delivery are outside this grammar.
 *
 * Driver: real migrated SQLite through workerd D1, fixture published items,
 * production enqueueOutbound and drainOutbound. Only FetchLike is controlled:
 * every manifest advertises a distinct endpoint and every POST returns 202.
 * Refinement: compare the delivery result, complete discovery/POST trace, stored
 * queue state and absence of redelivery after the awaited drain. SQL exceptions
 * are observed as failed delivery at the result checkpoint, not setup failures.
 * Campaigns/replay: oracle-campaign.ts runs eight inputs in fixed/random lanes.
 * Calibration: verify-oracle-mutations.ts restores LIKE, chooses the shortest
 * origin and includes RSS origins; failures must reach their named checkpoints.
 * Limits: discovery routing and successful delivery only, not retry policy,
 * incoming verification, production DNS, HTTP adapter behavior or cron timing.
 * The LIKE error was also received from production D1 by a read-only query.
 */
import { env } from 'cloudflare:test';
import fc from 'fast-check';
import { differs, oracleProperty, pass, type Observation } from '@tanstack/oracles';
import type { FetchLike } from '../src/importer/http.ts';
import { createSubscription } from '../src/importer/store.ts';
import { createDraft } from '../src/model.ts';
import { drainOutbound } from '../src/mentions/send.ts';
import { enqueueOutbound } from '../src/mentions/store.ts';
import { withOracleCleanup } from './oracle-cleanup.ts';

type Subscription = { kind: 'blyg' | 'rss'; origin: string };
type RequestRecord = { method: string; url: string; form: [string, string][] | null };
const ours = 'https://author.example/';
const longUnrelated = 'https://pioneering-spirit-blyg.patrickatwater.workers.dev/';
const fallbackEndpoint = 'https://delivery.example/w3c';
const inputs = fc.record({
  host: fc.string({ unit: fc.constantFrom('a', 'b', 'c'), minLength: 1, maxLength: 12 }),
  originLength: fc.oneof(fc.constantFrom(49, 50, 51, 58), fc.integer({ min: 49, max: 96 })),
  kind: fc.constantFrom('fragment' as const, 'thread' as const),
  reverse: fc.boolean(),
});

// The model judges URL membership in memory; the production driver must obtain
// the same answer from SQLite without treating URL characters as SQL patterns.
function selectedOrigin(subscriptions: Subscription[], target: string): string | undefined {
  let best: string | undefined;
  for (const subscription of subscriptions) {
    if (subscription.kind === 'blyg' && target.startsWith(subscription.origin) &&
        (best === undefined || subscription.origin.length > best.length)) best = subscription.origin;
  }
  return best;
}

type History = { host: string; originLength: number; kind: 'fragment' | 'thread'; reverse: boolean };
function fixture(input: History) {
  const parent = `https://${input.host}.example/m/`;
  const stem = `${parent}A%25_/`;
  const specific = `${stem}${'x'.repeat(input.originLength - stem.length - 1)}/`;
  let target = `${specific}f/remote/`;
  const candidates: Subscription[] = [
    { kind: 'blyg', origin: parent },
    { kind: 'blyg', origin: specific },
    { kind: 'rss', origin: `${specific}f/` },
    { kind: 'blyg', origin: `${parent}%/` },
    { kind: 'blyg', origin: longUnrelated },
  ];
  return { specific, target, candidates };
}
function model(input: History): Observation[] {
  const { specific, candidates } = fixture(input);
  const endpoints = new Map(candidates.map((sub, index) => [sub.origin, `https://delivery.example/endpoint/${index}`]));
  const expected: Observation[] = [];
  for (const [snapshot, indices] of [[0, 4], [0, 1, 2, 4], [3, 4]].entries()) {
    const target = `${specific}f/remote-${snapshot}/`, origin = selectedOrigin(indices.map(i => candidates[i]), target);
    const endpoint = origin === undefined ? fallbackEndpoint : endpoints.get(origin)!;
    expected.push(
      { checkpoint: 'mention delivery result', value: { attempted: 1, sent: 1 } },
      { checkpoint: 'mention discovery trace', value: [
        { method: origin === undefined ? 'HEAD' : 'GET', url: origin === undefined ? target : `${origin}blyg.json`, form: null },
        { method: 'POST', url: endpoint, form: [['source', '$source'], ['target', target]] },
      ] },
      { checkpoint: 'mention delivered queue', value: { status: 'sent', attempts: 1, endpoint, next_attempt_at: null, last_error: null } },
      { checkpoint: 'mention no redelivery', value: { result: { attempted: 0, sent: 0 }, calls: [] } },
    );
  }
  return expected;
}
async function driver(input: History, observe: (checkpoint: string, value: unknown) => void) {
  const { specific, candidates, target: initialTarget } = fixture(input);
  let target = initialTarget;
  // Responses depend on the receiving URL, never on the model's chosen origin.
  // RSS and wildcard decoys also have endpoints so a wrong lookup can deliver
  // successfully and still fail the trace comparison.
  const manifests = new Map(candidates.map((sub, index) => [
    `${sub.origin}blyg.json`, `https://delivery.example/endpoint/${index}`,
  ]));
  const endpoints = new Set([...manifests.values(), fallbackEndpoint]);
  const calls: RequestRecord[] = [];
  const network: FetchLike = async (url, init) => {
    const method = init?.method ?? 'GET';
    const form = init?.body === undefined ? null : [...new URLSearchParams(init.body)].sort(([a], [b]) => a.localeCompare(b));
    calls.push({ method, url, form });
    const endpoint = manifests.get(url);
    const ok = method === 'POST' ? endpoints.has(url) : method === 'HEAD' ? url === target : endpoint !== undefined;
    return { ok, status: ok ? method === 'POST' ? 202 : 200 : 404, url,
      headers: new Headers(method === 'HEAD' && url === target ? { Link: `<${fallbackEndpoint}>; rel="webmention"` } : {}),
      text: async () => endpoint ? JSON.stringify({ webmention: endpoint }) : '',
    };
  };
  const source = await createDraft(env.DB, 'source', input.kind);
  const ownedSubscriptions: string[] = [];
  await withOracleCleanup(async () => {
    await env.DB.prepare("UPDATE items SET status = 'public', version = 1 WHERE id = ?").bind(source.id).run();
    // Each snapshot queues a new target, so it exercises fresh discovery rather
    // than a previously saved endpoint. A second ordinary drain must be idle.
    for (const [snapshot, indices] of [[0, 4], [0, 1, 2, 4], [3, 4]].entries()) {
      target = `${specific}f/remote-${snapshot}/`;
      for (const id of ownedSubscriptions) await env.DB.prepare('DELETE FROM subscriptions WHERE id = ?').bind(id).run();
      ownedSubscriptions.length = 0;
      const subscriptions = indices.map(index => candidates[index]);
      for (const subscription of input.reverse ? [...subscriptions].reverse() : subscriptions) {
        const row = await createSubscription(env.DB, { ...subscription, feedUrl: `${subscription.origin}feed.xml`, title: 'Fixture' });
        ownedSubscriptions.push(row.id);
      }
      await enqueueOutbound(env.DB, source.id, 1, target, 1);
      calls.length = 0;
      let result: unknown;
      try { result = await drainOutbound(env.DB, network, { origin: ours }); }
      catch (error) { result = { error: error instanceof Error ? error.message : String(error) }; }
      observe('mention delivery result', result);
      // Resource IDs are fixture inputs. Replace only the exact expected source
      // URL with its stable alias; a wrong path, kind or ID remains observable.
      const sourceUrl = `${ours}${input.kind === 'thread' ? 't' : 'f'}/${source.id}/`;
      observe('mention discovery trace', calls.map(call => ({ ...call, form: call.form?.map(([name, value]) => [name, name === 'source' && value === sourceUrl ? '$source' : value]) ?? null })));
      const stored = await env.DB.prepare('SELECT status, attempts, endpoint, next_attempt_at, last_error FROM mentions_out WHERE item_id = ? AND target = ?')
        .bind(source.id, target).first();
      observe('mention delivered queue', stored);
      calls.length = 0;
      const idle = await drainOutbound(env.DB, network, { origin: ours });
      observe('mention no redelivery', { result: idle, calls: [...calls] });
    }
  }, [
    async () => { await env.DB.prepare('DELETE FROM mentions_out WHERE item_id = ?').bind(source.id).run(); },
    async () => { await env.DB.prepare('DELETE FROM items WHERE id = ?').bind(source.id).run(); },
    ...candidates.map((_, index) => async () => {
      const id = ownedSubscriptions[index];
      if (id !== undefined) await env.DB.prepare('DELETE FROM subscriptions WHERE id = ?').bind(id).run();
    }),
  ]);
}

// Each construction must complete the parent, nested/RSS, and wildcard-only
// receiving snapshots. Input dimensions name the premise; observed checkpoint
// counts prove those requests/drains ran without treating a correct result as reach.
const deliveryStates = ['parent subscription', 'nested blyg and RSS decoy', 'literal wildcard fallback', 'settled queue re-read', 'unrelated long origin', 'origin length 49', 'origin length 50', 'origin length 51', 'origin length 58', 'fragment source', 'thread source', 'forward insertion', 'reverse insertion'];
const sharedDeliveryStates = ['parent subscription', 'nested blyg and RSS decoy', 'literal wildcard fallback', 'settled queue re-read', 'unrelated long origin'];
function deliveryReach(input: History, trace: readonly Observation[]) {
  const reached: string[] = [];
  const discoveries = trace.filter(entry => entry.checkpoint === 'mention discovery trace').length;
  const rereads = trace.filter(entry => entry.checkpoint === 'mention no redelivery').length;
  if (discoveries >= 1) reached.push('parent subscription', 'unrelated long origin', input.kind + ' source', input.reverse ? 'reverse insertion' : 'forward insertion');
  if (discoveries >= 2) reached.push('nested blyg and RSS decoy');
  if (discoveries >= 3) reached.push('literal wildcard fallback');
  if (rereads >= 3) reached.push('settled queue re-read');
  if (discoveries >= 3 && [49, 50, 51, 58].includes(input.originLength)) reached.push('origin length ' + input.originLength);
  return reached;
}
oracleProperty({
  id: 'mention-delivery', owns: ['src/mentions/send.ts#drainOutbound'],
  law: {
    statement: 'For every subscribed-origin snapshot, successful outbound delivery chooses the longest literal blyg prefix or W3C fallback, persists the successful queue result, and does not redeliver it.',
    authority: 'src/mentions/discover.ts §2.3.4, established longest-prefix sender contract and existing delivery oracle',
    limits: 'Controlled successful HTTP responses and serial snapshots, bounded canonical fixture origins; no retry, DNS, incoming-verification or cron guarantee.',
  },
  histories: { arbitrary: inputs, runs: 8, fixedSeeds: [20261001], states: deliveryStates, constructed: [...[49, 50, 51, 58].map(originLength => ({ name: `origin length ${originLength}`, enters: [...sharedDeliveryStates, 'origin length ' + originLength, 'fragment source', 'forward insertion'], build: (): History => ({ host: 'a', originLength, kind: 'fragment', reverse: false }) })), { name: 'thread source with reversed subscription insertion', enters: [...sharedDeliveryStates, 'thread source', 'reverse insertion'], build: (): History => ({ host: 'a', originLength: 58, kind: 'thread', reverse: true }) }] },
  model, driver, reached: deliveryReach,
  check: (_input, trace, expected) => {
    // Compare received facts before inferring anything about an absent tail.
    // Repeated checkpoint names must not turn an interruption into a law failure.
    for (let i = 0; i < trace.length; i++) {
      const mismatch = differs(trace[i].checkpoint, 'delivery routing', trace[i], expected[i]);
      if (mismatch) return mismatch;
    }
    return differs('mention completion', 'delivery routing', trace.length, expected.length) ?? pass;
  },
  calibrations: [{ name: 'delivery chooses RSS endpoint', law: 'delivery routing', history: { constructed: 'origin length 49' }, corrupt: trace => trace.map((entry, i) => i === 5 ? { ...entry, value: [] } : entry) }],
});
