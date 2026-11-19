/**
 * Every settled Studio poll checks its source revision and either reuses its
 * exact-key response or loads the changed source. This oracle owns
 * src/ui/revision-query.ts#readIfChanged and checks the real QueryClient after
 * each awaited fetchQuery, including failures, eviction and restored epochs.
 *
 * ```ts
 * client.fetchQuery({ queryKey, queryFn }) // → cached response when unchanged
 * client.fetchQuery({ queryKey, queryFn }) // → fresh response after a write
 * client.fetchQuery({ queryKey, queryFn }) // → old cache retained on load failure
 * ```
 *
 * Reusing revision zero after restoring a database must not reuse an old epoch's
 * response. A failed content load must likewise leave the prior response intact
 * so the next poll retries. Generation and data are one accepted Query response.
 *
 * For every legal history, a poll reads revisions afresh and loads content once
 * exactly when its exact-key generation is absent or changed (design R2).
 * For every legal history, the accepted cache contains the last successfully
 * fetched data and its pre-fetch generation; failures cannot advance either
 * (design R3). Their authority is docs/d1-polling-cache-design.md, R2–R3.
 *
 * StudioQueryReference in test/polling-cache-oracle-model.ts is the independent
 * model retained from the earlier campaign. The model replays source actions;
 * it never reads production observations. The driver records load/read counts,
 * fetch outcomes and the accepted cache. Constructed histories force cache hits,
 * failed-load retries, epoch counter reuse and eviction in both campaigns.
 *
 * The bounded grammar retains 1–20 actions, a final poll and 50 generated
 * histories per fixed/random campaign. Removing any of write, restore, fail,
 * evict or poll loses its corresponding cache distinction. An unknown action
 * is outside this grammar. Query Collection publication, optimistic edits,
 * overlapping subsets and cancellation are receiving examples in
 * polling-cache-integration.test.ts. This oracle does not establish atomic
 * paginated SQL snapshots or a wall-clock polling schedule.
 */
import fc from 'fast-check';
import { QueryClient, type QueryFunction } from '@tanstack/query-core';
import { configureOracles, differs, oracleProperty, pass, type Observation } from '@tanstack/oracles';
import { readIfChanged } from '../src/ui/revision-query.ts';
import { StudioQueryReference, type OracleToken } from '../test/polling-cache-oracle-model.ts';
import { withOracleCleanup } from '../test/oracle-cleanup.ts';
import { studioOracleProperties } from '../test/oracle-property-registry.ts';

// A separate prefix keeps Worker/legacy replay variables out of this campaign.
configureOracles({
  envPrefix: 'STUDIO_ORACLE',
  registry: studioOracleProperties,
  retiredVariables: ['ORACLE_TARGET', 'ORACLE_SEED', 'ORACLE_PATH'],
});
type Action = 'write' | 'poll' | 'fail' | 'restore' | 'evict';
type Poll = { reads: number; loads: number; cache: unknown; error: string | null };
const token = (revision: number, epoch: string): OracleToken => ({ epoch, domains: {
  items: revision, reading: revision, subscriptions: revision, hoppers: revision,
  signals: revision, settings: revision, feed: revision, mentions: revision,
  responses: revision, interactions: revision, browse: revision, shelf: revision,
} });
const histories = {
  arbitrary: fc.array(fc.constantFrom<Action>('write', 'poll', 'fail', 'restore', 'evict'), { minLength: 1, maxLength: 20 }),
  runs: 50,
  fixedSeeds: [20261001],
  states: ['unchanged', 'failed retry', 'restored epoch', 'evicted'],
  constructed: [
    { name: 'unchanged', enters: ['unchanged'], build: (): Action[] => ['poll', 'poll'] },
    { name: 'failed retry', enters: ['failed retry'], build: (): Action[] => ['poll', 'write', 'fail', 'poll', 'fail', 'poll'] },
    { name: 'restored epoch', enters: ['restored epoch'], build: (): Action[] => ['poll', 'restore', 'poll'] },
    { name: 'evicted', enters: ['evicted'], build: (): Action[] => ['poll', 'evict', 'poll'] },
  ],
};
// Reuse the original model, including its separation of source and fetched state.
// Work counts and cached values are predicted separately; neither predicts the
// other, so unnecessary loads cannot hide behind a correct final value.
function model(actions: Action[]): Poll[] {
  const reference = new StudioQueryReference();
  let revision = 0, epoch = 'e', fail = false;
  const polls: Poll[] = [];
  for (const action of [...actions, 'poll'] as const) {
    if (action === 'write') revision++;
    if (action === 'restore') { epoch += 'r'; revision = 0; }
    if (action === 'fail') fail = !fail;
    if (action === 'evict') reference.fetched.delete('items');
    if (action === 'poll') {
      const target = { epoch, revision }, dirty = reference.needsFetch('items', target);
      if (dirty && !fail) reference.receive('items', target, revision, revision);
      const expected = reference.fetched.get('items');
      polls.push({ reads: 1, loads: dirty ? 1 : 0,
        cache: expected ? { data: expected.value, generation: { epoch: expected.epoch, revision: expected.revision } } : undefined,
        error: dirty && fail ? 'controlled' : null });
    }
  }
  return polls;
}
// Reach is a predicate over the history, never a side effect in the model.
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
  let revision = 0, epoch = 'e', fail = false, loads = 0, reads = 0;
  const queryFn: QueryFunction = context => readIfChanged(context, 'items', async () => { reads++; return token(revision, epoch); }, async () => {
    loads++; if (fail) throw new Error('controlled'); return revision;
  });
  await withOracleCleanup(async () => {
    for (const action of [...actions, 'poll'] as const) {
      if (action === 'write') revision++;
      if (action === 'restore') { epoch += 'r'; revision = 0; }
      if (action === 'fail') fail = !fail;
      if (action === 'evict') client.removeQueries({ queryKey: ['items'], exact: true });
      if (action === 'poll') {
        const beforeLoads = loads, beforeReads = reads;
        let error: string | null = null;
        try { await client.fetchQuery({ queryKey: ['items'], queryFn, staleTime: 0 }); }
        catch (caught) { error = caught instanceof Error ? caught.message : String(caught); }
        observe('poll', { reads: reads - beforeReads, loads: loads - beforeLoads, cache: client.getQueryData(['items']), error } satisfies Poll);
      }
    }
  }, [async () => { client.clear(); }]);
}
const polls = (trace: readonly Observation[]) => trace.filter(entry => entry.checkpoint === 'poll');

oracleProperty({
  id: 'studio-polling-work',
  owns: ['src/ui/revision-query.ts#readIfChanged'],
  law: {
    statement: 'For every settled poll, read revisions afresh and load content once exactly when its exact-key generation is absent or changed.',
    authority: 'docs/d1-polling-cache-design.md R2 and existing studio-polling campaign',
    limits: 'Bounded serial source histories; no wall-clock schedule or collection publication timing.',
  },
  histories, model, driver, reached,
  check: (_actions, trace, expected) => {
    const observed = polls(trace);
    // Judge received work before completeness: a later driver/cleanup error
    // cannot replace a wrong poll, but a missing tail is not a received result.
    for (const [index, entry] of observed.entries()) {
      const { reads, loads } = entry.value as Poll, wanted = expected[index];
      const mismatch = differs(entry.checkpoint, 'poll work', [{ reads, loads }], wanted ? [{ reads: wanted.reads, loads: wanted.loads }] : []);
      if (mismatch) return mismatch;
    }
    return differs('Studio query work and retry', 'poll work', observed.length, expected.length) ?? pass;
  },
  calibrations: [{
    name: 'redundant content load on cache hit', law: 'poll work', history: { constructed: 'unchanged' },
    corrupt: trace => trace.map((entry, index) => index === 1 ? { ...entry, value: { ...(entry.value as Poll), loads: 1 } } : entry),
  }],
});

oracleProperty({
  id: 'studio-polling-values',
  owns: ['src/ui/revision-query.ts#readIfChanged'],
  law: {
    statement: 'For every settled poll, the accepted cache keeps the last successful response and its pre-fetch generation; failed loads preserve both and remain retryable.',
    authority: 'docs/d1-polling-cache-design.md R3 and existing studio-polling campaign',
    limits: 'Source data equals its revision in these serial histories; in-flight cancellation and concurrent loads have separate receiving tests.',
  },
  histories, model, driver, reached,
  check: (_actions, trace, expected) => {
    const observed = polls(trace);
    for (const [index, entry] of observed.entries()) {
      const { cache, error } = entry.value as Poll, wanted = expected[index];
      const mismatch = differs(entry.checkpoint, 'accepted response', [{ cache, error }], wanted ? [{ cache: wanted.cache, error: wanted.error }] : []);
      if (mismatch) return mismatch;
    }
    return differs('Studio cached generation and values', 'accepted response', observed.length, expected.length) ?? pass;
  },
  calibrations: [{
    name: 'failed load advances cached token', law: 'accepted response', history: { constructed: 'failed retry' },
    corrupt: trace => trace.map((entry, index) => index === 1 ? { ...entry, value: { ...(entry.value as Poll), cache: { data: 0, generation: { epoch: 'e', revision: 1 } } } } : entry),
  }],
});

/** A joined response moves when either watched domain moves. Count how often
 * each domain is requested, then use numeric weights; the reference does not
 * call domainRevision or reproduce its reduction. Empty domain sets sum to zero.
 * This receives the domainRevision contract through a real readIfChanged call.
 */
const domainHistories = {
  arbitrary: fc.record({
    domains: fc.array(fc.constantFrom('items' as const, 'reading' as const), { maxLength: 4 }),
    items: fc.integer({ min: 0, max: 10 }), reading: fc.integer({ min: 0, max: 10 }),
  }),
  runs: 50, fixedSeeds: [20261001], states: ['empty domains', 'joined domains', 'repeated domain'],
  constructed: [
    { name: 'empty domains', enters: ['empty domains'], build: () => ({ domains: [], items: 2, reading: 3 }) },
    { name: 'joined domains', enters: ['joined domains'], build: () => ({ domains: ['items' as const, 'reading' as const], items: 2, reading: 3 }) },
    { name: 'repeated domain', enters: ['repeated domain'], build: () => ({ domains: ['reading' as const, 'reading' as const], items: 2, reading: 3 }) },
  ],
};
oracleProperty({
  id: 'studio-domain-revision',
  owns: ['src/ui/revision-query.ts#domainRevision'],
  law: {
    statement: 'For every watched-domain list, the returned generation is the sum of those domain counters, alongside the loaded data and source epoch.',
    authority: 'src/ui/revision-query.ts domainRevision JSDoc; docs/d1-polling-cache-design.md R2–R3; joined-domain receiving example',
    limits: 'Nonnegative counters zero through ten, items/reading arrays of length zero through four; no D1 trigger-delivery claim.',
  },
  histories: domainHistories,
  model: plan => ({ data: 'payload', generation: { epoch: 'e', revision:
    plan.items * plan.domains.filter(domain => domain === 'items').length +
    plan.reading * plan.domains.filter(domain => domain === 'reading').length } }),
  reached: plan => [
    ...(plan.domains.length === 0 ? ['empty domains'] : []),
    ...(plan.domains.includes('items') && plan.domains.includes('reading') ? ['joined domains'] : []),
    ...(new Set(plan.domains).size < plan.domains.length ? ['repeated domain'] : []),
  ],
  driver: async (plan, observe) => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
    await withOracleCleanup(async () => {
      try {
        const result = await client.fetchQuery({ queryKey: ['joined'], queryFn: context => readIfChanged(context, plan.domains,
          async () => ({ ...token(0, 'e'), domains: { ...token(0, 'e').domains, items: plan.items, reading: plan.reading } }),
          async () => 'payload') });
        observe('response', result);
      } catch (error) { observe('response', { error: error instanceof Error ? error.message : String(error) }); }
    }, [async () => { client.clear(); }]);
  },
  check: (_plan, trace, expected) => {
    for (const [index, entry] of trace.entries()) {
      const mismatch = differs(entry.checkpoint, 'domain sum', [entry.value], index === 0 ? [expected] : []);
      if (mismatch) return mismatch;
    }
    return differs('joined response generation', 'domain sum', trace.length, 1) ?? pass;
  },
  calibrations: [{
    name: 'joined response ignores reading counter', law: 'domain sum', history: { constructed: 'joined domains' },
    corrupt: trace => trace.map(entry => ({ ...entry, value: { data: 'payload', generation: { epoch: 'e', revision: 2 } } })),
  }],
});

/* Migration evidence against unchanged production at 28b0c8d, framework 97a4e7a.
 * ORC-001–005: R2/R3 authority and limits above; retained independent reference;
 * named grammar/driver/check; real QueryClient and production readIfChanged.
 * ORC-006: each property binds a corrupted trace to its constructed history;
 * verify-polling-cache-mutations.ts also rejects the lost-revision source edit
 * under poll work through oracle-gaps, including a direct path/unit replay.
 * ORC-007: the same 50-history budget and grammar run fixed seed 20261001 and
 * random campaigns; STUDIO_ORACLE_{SEED,PATH,PROPERTY,UNIT} select direct replay.
 * ORC-008: no state removed from StudioQueryReference; epoch distinguishes
 * restore/reused counters and fetched state distinguishes failure/eviction.
 * ORC-009: source revision, epoch and accepted response retain project meanings.
 * ORC-010: withOracleCleanup preserves primary errors and clears each client.
 * ORC-011: the joined-domain model uses counter weights rather than reduction;
 * no second formulation is claimed for serial QueryClient state transitions.
 * ORC-012: this evidence covers the migration, without bug-class closure.
 * ORC-013: constructed histories distinguish unchanged/changed, failed/retried,
 * absent/present, and same-counter/different-epoch responses every campaign.
 * ORC-014: claims stop at controlled source callbacks and real QueryClient;
 * Query Collection receiving cases remain in polling-cache-integration.test.ts.
 * ORC-015: each required state has a constructed history and reported reach;
 * no claim is made about instrumentation of production state-entry decisions.
 * Setup validation: 69 framework checks pass and all 25 operator mutants
 * are killed, including the three approved boundaries in cancellation-work.oracle.test.ts.
 * The authored lost-revision mutant and its direct path/unit replay are killed.
 * ORC-016: only oracleProperty registers tests here; receiving examples moved
 * intact to the integration file. No design-grammar trigger fired before writing:
 * the retained state model is unchanged. The additional cancellation law
 * uses a phase table after three guard gaps triggered the design grammar.
 *
 * Run from the repository root:
 * npx oracle-gaps --package . --source src/ui/revision-query.ts \
 *   --config vitest.oracles.config.ts --env-prefix STUDIO_ORACLE \
 *   --seed 20261001 --contexts 2
 */
