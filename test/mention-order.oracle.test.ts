/**
 * Contract: private mention groups preserve newest verification, last-seen and
 * receipt-ID order; each target's receipts retain verified_at DESC, last_seen
 * DESC, id ASC. Counts include hidden/gone receipts; visible counts include only
 * verified, unhidden receipts before item response policy (docs/api.md).
 * Model: repeatedly choose the highest independent numeric rank, then group.
 * Grammar: crossed r00/r99 IDs and recency, five mandatory targets, six receipts
 * in one target, 0–12 extra unique IDs, ties, NULL verification, hidden/gone rows,
 * reversed insertion and empty input. Duplicate receipt IDs are invalid.
 * Driver: real D1 rows and generated SDK calls through SELF to the production
 * /mention-groups and target-filtered /mentions cursor APIs, with page size two.
 * Checkpoints: every group's complete receipt sequence, complete group sequence,
 * total/visible counts, summary counts, page exhaustion and unchanged stored rows.
 * Boundaries: static ASCII fixtures, no concurrent writes or database-cost claim.
 * Item response modes, site defaults, missing target joins and UI demand windows
 * are covered separately by UI/browser tests; this campaign does not model them.
 * Shared campaign: eight inputs per fixed/random lane and direct seed/path replay.
 * Calibration: production group ordering and hidden-count SQL are mutated by
 * verify-oracle-mutations.ts; ordering replay must reach the same checkpoint.
 * ORC-001–005/009: authority, independent ranks, grammar, driver and complete
 * observations are above. ORC-006/007: production controls and direct replay.
 * ORC-008: stateless recomputation, no reference lifecycle state. ORC-010:
 * fixture cleanup preserves a primary failure and reports cleanup failures.
 * ORC-011: no named shared semantic fault needs a second formulation.
 * ORC-012–014: crossed IDs, equal ranks and NULLs distinguish weaker ordering;
 * real HTTP/D1 cursor walks run beyond two pages in both groups and receipts.
 */
import { SELF, env } from 'cloudflare:test';
import fc from 'fast-check';
import { differs, oracleProperty, pass } from '@tanstack/oracles';
import { BlyggerApi, createBlyggerClient, unwrap, type Mention, type MentionGroup, type ListMentionsResponses } from '../sdk/dist/browser.js';
import { cursorPage } from '../src/cursor-page.ts';
import { BASE, login } from './helpers.ts';
import { withOracleCleanup } from './oracle-cleanup.ts';

type Fact = { key: number; target: number; verified: number | null; seen: number; hidden: boolean; status: 'verified' | 'gone' };
const receipt = fc.record({
  key: fc.integer({ min: 1, max: 89 }), target: fc.integer({ min: 0, max: 4 }),
  verified: fc.option(fc.integer({ min: 0, max: 9 }), { nil: null }),
  seen: fc.integer({ min: 0, max: 9 }), hidden: fc.boolean(),
  status: fc.constantFrom('verified' as const, 'gone' as const),
});
const input = fc.record({ rows: fc.uniqueArray(receipt, { selector: row => row.key, maxLength: 12 }), reverse: fc.boolean() });
const id = (key: number) => `r${String(key).padStart(2, '0')}`;
const date = (rank: number) => new Date(Date.UTC(2026, 9, 1 + rank)).toISOString();
const mandatory: Fact[] = [
  { key: 0, target: 0, verified: 0, seen: 0, hidden: false, status: 'verified' },
  { key: 90, target: 0, verified: null, seen: 1, hidden: true, status: 'gone' },
  { key: 91, target: 0, verified: 0, seen: 2, hidden: true, status: 'verified' },
  { key: 92, target: 0, verified: 0, seen: 2, hidden: false, status: 'gone' },
  { key: 93, target: 0, verified: 1, seen: 0, hidden: false, status: 'verified' },
  { key: 94, target: 0, verified: 1, seen: 0, hidden: false, status: 'verified' },
  { key: 95, target: 2, verified: 2, seen: 0, hidden: false, status: 'verified' },
  { key: 96, target: 3, verified: null, seen: 0, hidden: false, status: 'verified' },
  { key: 97, target: 4, verified: 1, seen: 1, hidden: true, status: 'verified' },
  { key: 99, target: 1, verified: 10, seen: 10, hidden: false, status: 'verified' },
];

// Numeric fixture ranks precede wire timestamps. Choose each next maximum;
// do not import or repeat a production SQL/timestamp comparator.
function reference(facts: Fact[]) {
  const pending = [...facts], groups = new Map<string, string[]>();
  while (pending.length) {
    const highest = Math.max(...pending.map(row => row.verified ?? -1));
    const sameVerification = pending.filter(row => (row.verified ?? -1) === highest);
    const latest = Math.max(...sameVerification.map(row => row.seen));
    const key = Math.min(...sameVerification.filter(row => row.seen === latest).map(row => row.key));
    const [next] = pending.splice(pending.findIndex(row => row.key === key), 1), target = String(next.target);
    groups.set(target, [...(groups.get(target) ?? []), id(next.key)]);
  }
  return [...groups];
}

type History = { rows: Fact[]; reverse: boolean };
async function driver({ rows, reverse }: History, observe: (checkpoint: string, value: unknown) => void) {
  const facts = [...mandatory, ...rows];
  const client = createBlyggerClient({ baseUrl: BASE + '/blyg/api', headers: { cookie: await login() },
    fetch: (input, init) => SELF.fetch(input instanceof Request ? input : new Request(input, init)) });
  const clear = () => env.DB.batch([env.DB.prepare('DELETE FROM mentions_in'), env.DB.prepare('DELETE FROM mentions_out')]);
  await withOracleCleanup(async () => {
    for (const snapshot of [[], reverse ? [...facts].reverse() : facts]) {
      await clear();
      if (snapshot.length) await env.DB.batch(snapshot.map(row => env.DB.prepare(`INSERT INTO mentions_in
        (id,source,target,target_item_id,status,first_seen,last_seen,verified_at,hidden)
        VALUES (?,?,'target',?,?,'first',?,?,?)`).bind(id(row.key), `https://source.test/${id(row.key)}`,
        String(row.target), row.status, date(row.seen), row.verified === null ? null : date(row.verified), Number(row.hidden))));
      const stored = () => env.DB.prepare('SELECT * FROM mentions_in ORDER BY id').all();
      const before = (await stored()).results, groups: MentionGroup[] = [];
      let cursor: string | undefined, groupPages = 0;
      do {
        const page = await unwrap(BlyggerApi.listMentionGroups({ client, query: { cursor, limit: 2 } }));
        groups.push(...page.items); groupPages++;
        observe('groups page', { snapshot: snapshot.length === 0 ? 0 : 1, limit: page.page.limit, targets: groups.map(row => row.targetItemId), more: page.page.nextCursor !== null });
        cursor = page.page.nextCursor ?? undefined;
      } while (cursor);
      const actual: [string, string[]][] = [];
      for (const group of groups) {
        const receipts: Mention[] = []; let pages = 0;
        cursor = undefined;
        do {
          const page: ListMentionsResponses[200] = await unwrap(BlyggerApi.listMentions({ client, query: { targetItemId: group.targetItemId, cursor, limit: 2 } }));
          receipts.push(...page.items as Mention[]); pages++;
          observe('receipts page', { snapshot: snapshot.length === 0 ? 0 : 1, target: group.targetItemId, direction: page.direction, limit: page.page.limit, ids: receipts.map(row => row.id), targets: page.items.map(row => 'targetItemId' in row ? row.targetItemId : undefined), more: page.page.nextCursor !== null });
          cursor = page.page.nextCursor ?? undefined;
        } while (cursor);
        actual.push([group.targetItemId, receipts.map(row => row.id)]);
        if (group.targetItemId === '0') observe('target pages', pages);
      }
      observe('receipt order', { snapshot: snapshot.length === 0 ? 0 : 1, actual });
      observe('group values', { snapshot: snapshot.length === 0 ? 0 : 1, values: groups.map(({ targetItemId, total, visible }) => ({ target: targetItemId, total, visible })) });
      const summary = await unwrap(BlyggerApi.getMentionSummary({ client }));
      observe('summary', { snapshot: snapshot.length === 0 ? 0 : 1, summary });
      if (snapshot.length) {
        // A cursor issued for the documented collection declaration must be
        // accepted by its HTTP receiver. The row order comes from fixture ranks;
        // no production SQL, cursor bytes or identity hash enters the model.
        const winners = reference(snapshot).map(([, ids]) => snapshot.find(row => id(row.key) === ids[0])!);
        const issued = await cursorPage(env.DB, { limit: 2 }, {
          name: 'mention-groups', domains: ['mentions'], filters: [null, null, null, null],
          order: [{ column: 'verifiedAt', direction: 'desc' }, { column: 'lastSeen', direction: 'desc' }, { column: 'firstId', direction: 'asc' }],
          sql: winners.map(() => 'SELECT ? AS verifiedAt, ? AS lastSeen, ? AS firstId').join(' UNION ALL '),
          binds: winners.flatMap(row => [row.verified === null ? '' : date(row.verified), date(row.seen), id(row.key)]),
        });
        try {
          const received = await unwrap(BlyggerApi.listMentionGroups({ client, query: { limit: 2, cursor: issued.page.nextCursor! } }));
          observe('collection cursor receiving', received.items.map(row => row.targetItemId));
        } catch { observe('collection cursor receiving', 'rejected'); }
      }
      const after = (await stored()).results;
      observe('stored rows', { before, after });
      if (snapshot.length) observe('group pages', groupPages);
    }
  }, [clear]);
}
function model({ rows }: History) {
  return [[], [...mandatory, ...rows]].map(snapshot => ({
    groups: reference(snapshot),
    values: reference(snapshot).map(([target]) => {
      const facts = snapshot.filter(row => row.target === Number(target));
      return { target, total: facts.length, visible: facts.filter(row => row.status === 'verified' && !row.hidden).length };
    }),
    summary: { inbound: snapshot.length, outbound: 0, groups: reference(snapshot).length },
  }));
}


type ReceiptModel = ReturnType<typeof model>[number];
type ObservationValues = {
  'groups page': { snapshot: number; limit: number; targets: string[]; more: boolean };
  'receipts page': { snapshot: number; target: string; direction: string; limit: number; ids: string[]; targets: (string | undefined)[]; more: boolean };
  'receipt order': { snapshot: number; actual: [string, string[]][] };
  'group values': { snapshot: number; values: ReceiptModel['values'] };
  summary: { snapshot: number; summary: ReceiptModel['summary'] };
  'stored rows': { before: unknown[]; after: unknown[] };
  'target pages': number;
  'group pages': number;
  'collection cursor receiving': string[] | 'rejected';
};
type Observation = { [K in keyof ObservationValues]: { checkpoint: K; value: ObservationValues[K] } }[keyof ObservationValues];

// Mandatory facts force receipt and group continuations and the distinctions
// behind ordering/visibility. Count the actual receiving calls, then inspect the
// fixture ranks; an incorrect response remains a law failure, not failed reach.
const mentionStates = ['empty snapshot', 'group continuation', 'target continuation', 'null verification', 'hidden receipt', 'gone receipt', 'verification tie', 'seen tie', 'recency crosses ID order', 'collection cursor receiving', 'forward insertion', 'reversed insertion'];
const sharedMentionStates = mentionStates.filter(state => state !== 'forward insertion' && state !== 'reversed insertion');
function mentionReach({ rows, reverse }: History, trace: readonly { checkpoint: string; value: unknown }[]) {
  const reached: string[] = [], facts = [...mandatory, ...rows];
  if (trace.some(entry => entry.checkpoint === 'receipt order' && (entry.value as { snapshot: number }).snapshot === 0)) reached.push('empty snapshot');
  const populated = trace.some(entry => entry.checkpoint === 'receipt order' && (entry.value as { snapshot: number }).snapshot === 1);
  if (!populated) return reached;
  reached.push(reverse ? 'reversed insertion' : 'forward insertion');
  if (trace.filter(entry => entry.checkpoint === 'groups page' && (entry.value as { snapshot: number }).snapshot === 1).length > 2) reached.push('group continuation');
  if (trace.filter(entry => entry.checkpoint === 'receipts page' && (entry.value as { snapshot: number; target: string }).snapshot === 1 && (entry.value as { target: string }).target === '0').length > 2) reached.push('target continuation');
  if (facts.some(row => row.verified === null)) reached.push('null verification');
  if (facts.some(row => row.hidden)) reached.push('hidden receipt');
  if (facts.some(row => row.status === 'gone')) reached.push('gone receipt');
  if (facts.some((row, index) => facts.slice(index + 1).some(other => other.verified === row.verified && other.seen !== row.seen))) reached.push('verification tie');
  if (facts.some((row, index) => facts.slice(index + 1).some(other => other.verified === row.verified && other.seen === row.seen && other.key !== row.key))) reached.push('seen tie');
  if (facts.some(row => facts.some(other => row.key < other.key && (row.verified ?? -1) < (other.verified ?? -1)))) reached.push('recency crosses ID order');
  if (trace.some(entry => entry.checkpoint === 'collection cursor receiving')) reached.push('collection cursor receiving');
  return reached;
}
oracleProperty({
  id: 'mention-order', owns: ['src/mention-groups.ts#mentionGroups', 'src/mention-groups.ts#mentionSummary', 'src/read-api.ts#listMentionsOperation'],
  law: { statement: 'For every static receipt fixture, complete group and receipt cursor walks preserve numeric verification/seen/ID order, exact total and visible counts, summary counts, exhaustion, the documented cursor collection identity and all stored rows.', authority: 'docs/api.md mention groups and existing mention display oracle', limits: 'ASCII static fixtures, page size two and the existing mandatory receipt states; no concurrent-write, cost, UI-policy or delivery guarantee.' },
  histories: { arbitrary: input, runs: 8, fixedSeeds: [20261001], states: mentionStates, constructed: [
    { name: 'mandatory ties hidden gone and null receipts', enters: [...sharedMentionStates, 'forward insertion'], build: (): History => ({ rows: [], reverse: false }) },
    { name: 'reversed insertion', enters: [...sharedMentionStates, 'reversed insertion'], build: (): History => ({ rows: [], reverse: true }) },
  ] },
  model, driver, reached: mentionReach,
  check: (_input, trace, expected) => {
    // The recorder accepts unknown payloads; narrow the driver's checkpoint union here.
    for (const entry of trace as Observation[]) {
      const snapshot = expected[typeof entry.value === 'object' && 'snapshot' in entry.value ? entry.value.snapshot : 1];
      let mismatch;
      if (entry.checkpoint === 'groups page') {
        const value = entry.value;
        mismatch = differs('mention display order', 'ordered receipt views', { limit: value.limit, targets: value.targets, more: value.more }, { limit: 2, targets: snapshot.groups.slice(0, value.targets.length).map(([target]) => target), more: value.targets.length < snapshot.groups.length });
      }
      if (entry.checkpoint === 'receipts page') {
        const value = entry.value;
        const ids = snapshot.groups.find(([target]) => target === value.target)?.[1] ?? [];
        mismatch = differs('mention display order', 'ordered receipt views', { direction: value.direction, limit: value.limit, ids: value.ids, targets: value.targets, more: value.more }, { direction: 'inbound', limit: 2, ids: ids.slice(0, value.ids.length), targets: value.targets.map(() => value.target), more: value.ids.length < ids.length });
      }
      if (entry.checkpoint === 'receipt order') mismatch = differs('mention display order', 'ordered receipt views', entry.value.actual, snapshot.groups);
      if (entry.checkpoint === 'group values') mismatch = differs('mention group values', 'ordered receipt views', entry.value.values, snapshot.values);
      if (entry.checkpoint === 'collection cursor receiving') mismatch = differs('mention cursor collection binding', 'ordered receipt views', entry.value, expected[1].groups.slice(2, 4).map(([target]) => target));
      if (entry.checkpoint === 'summary') mismatch = differs('mention group values', 'ordered receipt views', entry.value.summary, snapshot.summary);
      if (entry.checkpoint === 'stored rows') mismatch = differs('mention input preservation', 'ordered receipt views', entry.value.after, entry.value.before);
      if (entry.checkpoint === 'target pages' || entry.checkpoint === 'group pages') mismatch = differs('mention multi-page receiving', 'ordered receipt views', entry.value > 2, true);
      // A received mismatch must retain its actual boundary if later cleanup
      // fails. The missing-snapshot check below keeps its separate checkpoint.
      if (mismatch) return { ...mismatch, checkpoint: entry.checkpoint };
    }
    return differs('mention completed snapshots', 'ordered receipt views', trace.filter(entry => entry.checkpoint === 'receipt order').length, 2) ?? pass;
  },
  calibrations: [{ name: 'wrong collection rejects continuation', law: 'ordered receipt views', history: { constructed: 'mandatory ties hidden gone and null receipts' }, corrupt: trace => trace.map(entry => entry.checkpoint === 'collection cursor receiving' ? { ...entry, value: 'rejected' } : entry) }, { name: 'oldest verification first', law: 'ordered receipt views', history: { constructed: 'mandatory ties hidden gone and null receipts' }, corrupt: trace => trace.map(entry => entry.checkpoint === 'groups page' && (entry.value as ObservationValues['groups page']).snapshot === 1 ? { ...entry, value: { ...(entry.value as ObservationValues['groups page']), targets: ['0', '1'] } } : entry) }],
});
