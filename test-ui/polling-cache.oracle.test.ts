/**
 * Every settled Studio poll makes a conditional resource GET. An unchanged
 * response reuses its validated ETag/body pair; failed bodies preserve the
 * previous pair and the next poll retries. Restored source identities cannot
 * reuse a prior representation just because their visible counters match.
 *
 * ```ts
 * read('/api/items/summary') // → 200 body becomes reusable with its ETag
 * read('/api/items/summary') // → conditional GET; 304 reuses that exact body
 * queryClient.fetchQuery({ queryKey, queryFn }) // → failed read keeps old data
 * ```
 *
 * The original write/poll/fail/restore/evict grammar, 1–20 actions plus a final
 * poll, 50 histories, fixed/random campaigns and constructed distinctions are
 * preserved. The production receiver is now conditionalReadFetch plus native
 * QueryClient. Eviction discards the SDK representation as well as Query data.
 * No /changes transport or client revision sum remains in this contract.
 *
 * Design grammar card: changing the receiving seam changes model state from
 * epoch/revision labels to opaque validator/body pairs. Source identity and
 * accepted data remain separate because failed loads and restore distinguish
 * them. A serial action interpreter is the smallest independent formulation;
 * the joined-domain property separately checks the dependency relation using
 * set membership. Authority: approved ETag direction, Kyle Mathews, 2026-11-18;
 * docs/api.md Conditional resource reads, sdk/README.md Conditional reads.
 * Limits: controlled legal peer and settled serial calls, no D1 atomicity,
 * deployed scheduling, concurrent publication or Query Collection claim.
 */
import fc from 'fast-check';
import { QueryClient } from '@tanstack/query-core';
import { differs, oracleProperty, pass, type Observation } from '@tanstack/oracles';
import { conditionalReadFetch } from '../sdk/conditional-reads.ts';
import { StudioQueryReference } from '../test/polling-cache-oracle-model.ts';
import { withOracleCleanup } from '../test/oracle-cleanup.ts';

type Action = 'write' | 'poll' | 'fail' | 'restore' | 'evict';
type Poll = { reads: number; loads: number; validator: string | null; cache: unknown; error: string | null };
const summary = (all: number) => ({ all, drafts: 0, changes: 0, public: all, withdrawn: 0 });
const tag = (epoch: string, revision: number) => `"${epoch}:${revision}"`;
const histories = {
  arbitrary: fc.array(fc.constantFrom<Action>('write', 'poll', 'fail', 'restore', 'evict'), { minLength: 1, maxLength: 20 }),
  runs: 50, fixedSeeds: [20261001],
  states: ['unchanged', 'failed retry', 'restored epoch', 'evicted'],
  constructed: [
    { name: 'unchanged', enters: ['unchanged'], build: (): Action[] => ['poll', 'poll'] },
    { name: 'failed retry', enters: ['failed retry'], build: (): Action[] => ['poll', 'write', 'fail', 'poll', 'fail', 'poll'] },
    { name: 'restored epoch', enters: ['restored epoch'], build: (): Action[] => ['poll', 'restore', 'poll'] },
    { name: 'evicted', enters: ['evicted'], build: (): Action[] => ['poll', 'evict', 'poll'] },
  ],
};
function model(actions: Action[]): Poll[] {
  const reference = new StudioQueryReference();
  let revision = 0, epoch = 'e', fail = false;
  const results: Poll[] = [];
  for (const action of [...actions, 'poll'] as const) {
    if (action === 'write') revision++;
    if (action === 'restore') { epoch += 'r'; revision = 0; }
    if (action === 'fail') fail = !fail;
    if (action === 'evict') reference.fetched.delete('items');
    if (action === 'poll') {
      const etag = tag(epoch, revision), validator = reference.fetched.get('items')?.etag ?? null;
      const dirty = reference.needsFetch('items', { etag });
      if (dirty && !fail) reference.receive('items', { etag, value: revision });
      const accepted = reference.fetched.get('items');
      results.push({ reads: 1, loads: Number(dirty), validator,
        cache: accepted ? summary(accepted.value) : undefined, error: dirty && fail ? 'controlled' : null });
    }
  }
  return results;
}
function reached(actions: Action[]) {
  const states = new Set<string>();
  let cached = false, dirty = true, fail = false, failed = false, restored = false, evicted = false;
  for (const action of [...actions, 'poll'] as const) {
    if (action === 'write') dirty = true;
    if (action === 'restore') { dirty = true; restored = true; }
    if (action === 'evict') { cached = false; dirty = true; evicted = true; }
    if (action === 'fail') fail = !fail;
    if (action === 'poll') {
      if (cached && !dirty) states.add('unchanged');
      if (dirty && !fail) {
        if (failed) states.add('failed retry');
        if (restored) states.add('restored epoch');
        if (evicted) states.add('evicted');
        cached = true; dirty = false; failed = false; restored = false; evicted = false;
      } else if (dirty) failed = true;
    }
  }
  return states;
}
async function driver(actions: Action[], observe: (checkpoint: string, value: unknown) => void) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  let revision = 0, epoch = 'e', fail = false, reads = 0, loads = 0, validator: string | null = null;
  const peer: typeof fetch = async input => {
    const request = new Request(input); reads++; validator = request.headers.get('if-none-match');
    const etag = tag(epoch, revision);
    if (validator === etag) return new Response(null, { status: 304, headers: { ETag: etag } });
    loads++; if (fail) return Response.json({ invalid: true }, { headers: { ETag: etag } });
    return Response.json(summary(revision), { headers: { ETag: etag } });
  };
  let read = conditionalReadFetch('https://poll.test/api', peer);
  await withOracleCleanup(async () => {
    for (const action of [...actions, 'poll'] as const) {
      if (action === 'write') revision++;
      if (action === 'restore') { epoch += 'r'; revision = 0; }
      if (action === 'fail') fail = !fail;
      if (action === 'evict') { client.removeQueries({ queryKey: ['items'], exact: true }); read = conditionalReadFetch('https://poll.test/api', peer); }
      if (action === 'poll') {
        const beforeLoads = loads, beforeReads = reads; let error: string | null = null;
        try { await client.fetchQuery({ queryKey: ['items'], queryFn: async ({ signal }) => (await read('https://poll.test/api/items/summary', { signal })).json(), staleTime: 0 }); }
        catch (caught) { error = fail ? 'controlled' : caught instanceof Error ? caught.message : String(caught); }
        observe('poll', { reads: reads - beforeReads, loads: loads - beforeLoads, validator, cache: client.getQueryData(['items']), error } satisfies Poll);
      }
    }
  }, [async () => { client.clear(); }]);
}
const polls = (trace: readonly Observation[]) => trace.filter(entry => entry.checkpoint === 'poll');
oracleProperty({
  id: 'studio-polling-work', owns: ['sdk/conditional-reads.ts#conditionalReadFetch'],
  law: { statement: 'Every settled poll makes one resource GET using the last accepted validator; the peer sends a body exactly when that representation is absent or changed.', authority: 'Approved ETag direction, Kyle Mathews, 2026-11-18; docs/api.md Conditional resource reads and sdk/README.md Conditional reads.', limits: 'Original bounded serial grammar against a controlled legal peer. Body loads count 200 response work, not 304 body reconstruction.' },
  histories, model, driver, reached,
  check: (_actions, trace, expected) => {
    const rows = polls(trace);
    for (const [index, entry] of rows.entries()) {
      const { reads, loads, validator } = entry.value as Poll, wanted = expected[index];
      const bad = differs(entry.checkpoint, 'poll work', { reads, loads, validator }, wanted && { reads: wanted.reads, loads: wanted.loads, validator: wanted.validator }); if (bad) return bad;
    }
    // A missing later poll is not a violation at an earlier correct poll if
    // the driver threw; only recorded result mismatches outrank that error.
    return differs('poll count', 'poll work', rows.length, expected.length) ?? pass;
  },
  calibrations: [{ name: 'redundant body on unchanged poll', law: 'poll work', history: { constructed: 'unchanged' }, corrupt: trace => trace.map((entry, index) => index === 1 ? { ...entry, value: { ...(entry.value as Poll), loads: 1 } } : entry) }],
});
oracleProperty({
  id: 'studio-polling-values', owns: ['sdk/conditional-reads.ts#conditionalReadFetch'],
  law: { statement: 'Every settled poll retains the last successful representation on failure, retries changed sources, and keeps 304 reconstruction paired with its accepted validator.', authority: 'Approved ETag direction, Kyle Mathews, 2026-11-18; docs/api.md Conditional resource reads and sdk/README.md Conditional reads.', limits: 'Original serial source, failure, restore and eviction histories. Native Query owns accepted query state; SDK owns validated reusable representations.' },
  histories, model, driver, reached,
  check: (_actions, trace, expected) => {
    const rows = polls(trace);
    for (const [index, entry] of rows.entries()) {
      const { cache, error } = entry.value as Poll, wanted = expected[index];
      const bad = differs(entry.checkpoint, 'accepted response', { cache, error }, wanted && { cache: wanted.cache, error: wanted.error }); if (bad) return bad;
    }
    return differs('poll count', 'accepted response', rows.length, expected.length) ?? pass;
  },
  calibrations: [{ name: 'failed load replaces accepted body', law: 'accepted response', history: { constructed: 'failed retry' }, corrupt: trace => trace.map((entry, index) => index === 1 ? { ...entry, value: { ...(entry.value as Poll), cache: summary(1) } } : entry) }],
});

// The original finite watched-domain grammar remains, but no client counter
// sum is an API obligation. A legal peer identifies the joined representation
// by its selected dependency values; the model predicts changes by membership.
const domainHistories = {
  arbitrary: fc.record({ domains: fc.array(fc.constantFrom('items' as const, 'reading' as const), { maxLength: 4 }), items: fc.integer({ min: 0, max: 10 }), reading: fc.integer({ min: 0, max: 10 }) }),
  runs: 50, fixedSeeds: [20261001], states: ['empty domains', 'joined domains', 'repeated domain'],
  constructed: [
    { name: 'empty domains', enters: ['empty domains'], build: () => ({ domains: [], items: 2, reading: 3 }) },
    { name: 'joined domains', enters: ['joined domains'], build: () => ({ domains: ['items' as const, 'reading' as const], items: 2, reading: 3 }) },
    { name: 'repeated domain', enters: ['repeated domain'], build: () => ({ domains: ['reading' as const, 'reading' as const], items: 2, reading: 3 }) },
  ],
};
oracleProperty({
  id: 'studio-domain-revision', owns: ['sdk/conditional-reads.ts#conditionalReadFetch'],
  law: { statement: 'A conditional joined representation fetches a new body when either selected dependency changes and reuses its body when only an unrelated dependency changes; repeated dependency names add no distinct requirement.', authority: 'Approved replacement of /changes preflights by conditional resource GETs, Kyle Mathews, 2026-11-18; docs/d1-polling-cache-design.md dependency relation and docs/api.md Conditional resource reads.', limits: 'Original items/reading arrays length 0–4 and counters 0–10; controlled peer, no independent server trigger claim.' },
  histories: domainHistories,
  model: plan => [true, plan.domains.includes('items'), plan.domains.includes('reading'), false],
  reached: plan => [...(plan.domains.length === 0 ? ['empty domains'] : []), ...(plan.domains.includes('items') && plan.domains.includes('reading') ? ['joined domains'] : []), ...(new Set(plan.domains).size < plan.domains.length ? ['repeated domain'] : [])],
  driver: async (plan, observe) => {
    const source = { items: plan.items, reading: plan.reading, subscriptions: 0 }; let loads = 0;
    const read = conditionalReadFetch('https://joined.test/api', async input => {
      const representation = Object.fromEntries([...new Set(plan.domains)].sort().map(domain => [domain, source[domain]]));
      const etag = `"${JSON.stringify(representation).replaceAll('"', '')}"`;
      if (new Request(input).headers.get('if-none-match') === etag) return new Response(null, { status: 304, headers: { ETag: etag } });
      loads++; return Response.json(summary(Object.values(representation).reduce((sum, value) => sum + value, 0)), { headers: { ETag: etag } });
    });
    for (const changed of [null, 'items', 'reading', 'subscriptions'] as const) {
      if (changed) source[changed]++;
      const before = loads; await (await read('https://joined.test/api/items/summary')).json(); observe('dependency body', loads > before);
    }
  },
  check: (_plan, trace, expected) => {
    const rows = trace.filter(entry => entry.checkpoint === 'dependency body');
    for (const [index, entry] of rows.entries()) { const bad = differs(entry.checkpoint, 'joined dependency', entry.value, expected[index]); if (bad) return bad; }
    return differs('dependency body count', 'joined dependency', rows.length, expected.length) ?? pass;
  },
  calibrations: [{ name: 'joined response ignores reading change', law: 'joined dependency', history: { constructed: 'joined domains' }, corrupt: trace => trace.map((entry, index) => index === 2 ? { ...entry, value: false } : entry) }],
});
