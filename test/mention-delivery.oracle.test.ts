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
import { expect } from 'vitest';
import type { FetchLike } from '../src/importer/http.ts';
import { createSubscription } from '../src/importer/store.ts';
import { createDraft } from '../src/model.ts';
import { drainOutbound } from '../src/mentions/send.ts';
import { enqueueOutbound } from '../src/mentions/store.ts';
import { atCheckpoint, campaign } from './oracle-campaign.ts';
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

campaign('mention-delivery', inputs, async input => {
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
      const origin = selectedOrigin(subscriptions, target);
      const endpoint = origin === undefined ? fallbackEndpoint : manifests.get(`${origin}blyg.json`)!;
      const expectedTrace: RequestRecord[] = [
        { method: origin === undefined ? 'HEAD' : 'GET', url: origin === undefined ? target : `${origin}blyg.json`, form: null },
        { method: 'POST', url: endpoint, form: [['source', `${ours}${input.kind === 'thread' ? 't' : 'f'}/${source.id}/`], ['target', target]] },
      ];
      let result: unknown;
      try { result = await drainOutbound(env.DB, network, { origin: ours }); }
      catch (error) { result = { error: error instanceof Error ? error.message : String(error) }; }
      atCheckpoint('mention delivery result', () => expect(result).toEqual({ attempted: 1, sent: 1 }));
      atCheckpoint('mention discovery trace', () => expect(calls).toEqual(expectedTrace));
      const stored = await env.DB.prepare('SELECT status, attempts, endpoint, next_attempt_at, last_error FROM mentions_out WHERE item_id = ? AND target = ?')
        .bind(source.id, target).first();
      atCheckpoint('mention delivered queue', () => expect(stored).toEqual({ status: 'sent', attempts: 1, endpoint, next_attempt_at: null, last_error: null }));
      calls.length = 0;
      const idle = await drainOutbound(env.DB, network, { origin: ours });
      atCheckpoint('mention no redelivery', () => { expect(idle).toEqual({ attempted: 0, sent: 0 }); expect(calls).toEqual([]); });
    }
  }, [
    async () => { await env.DB.prepare('DELETE FROM mentions_out WHERE item_id = ?').bind(source.id).run(); },
    async () => { await env.DB.prepare('DELETE FROM items WHERE id = ?').bind(source.id).run(); },
    ...candidates.map((_, index) => async () => {
      const id = ownedSubscriptions[index];
      if (id !== undefined) await env.DB.prepare('DELETE FROM subscriptions WHERE id = ?').bind(id).run();
    }),
  ]);
});
