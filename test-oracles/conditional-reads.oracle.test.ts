/**
 * Conditional resource reads preserve validated representations across polling,
 * writes and cancellation. HTTP peers and database counters are controlled;
 * separate receiving tests establish real D1, mounted auth and browser behavior.
 * This oracle owns the SDK's conditionalReadFetch,
 * Studio's readCursorWindow and createReadBatchFetch, and the server's
 * conditionalOperation adapter, at their returned data and HTTP boundaries.
 *
 * ```ts
 * getItemSummary({ client }) // → current validated body, with its ETag retained
 * getItemSummary({ client }) // → same body when the resource replies 304
 * createItem({ client, body }) // → subsequent reads revalidate the resource
 * readCursorWindow({ ...options, signal }) // → one generation, or cancellation
 * batchRead({ client, body }) // → independent status/body/ETag for each child
 * ```
 *
 * A newer 304 is an accepted read even though it carries no body. Otherwise an
 * older 200 can overwrite the representation just confirmed by that newer read.
 * The accepted pair belongs to one request context. A write separates pending
 * reads; the pager obtains a new generation from its revalidated first page.
 *
 * Decision by Kyle Mathews (GitHub KyleAMathews), 2026-11-18:
 * For every supported resource, a matching ETag returns a bodyless 304 and a
 * changed representation returns 200 with its current ETag.
 * For every resource and request context, accept validated data and its ETag
 * together; failed validation replaces neither.
 * For every refresh following a write, revalidate the resource without /changes;
 * earlier responses cannot overwrite accepted data or mix page generations.
 * For every shared request, cancelling one reader leaves its peers running,
 * and cancelled work cannot update accepted cache entries.
 * For every eligible batch, each child preserves direct GET data, ETag and error
 * behavior, and conditional reads remain batchable.
 *
 * The models use input values, per-context accepted values, and controlled
 * completion order, without reading production state. Histories vary wire
 * damage, credentials, writes, cancellations, errors, cursors and page windows.
 * Deferred fetch/body gates place races at explicit boundaries. The checks
 * compare returned values, sent validators, HTTP results and cached pages.
 *
 * Decision by Kyle Mathews (GitHub KyleAMathews), 2026-11-18:
 * Eligible pre-aborted reads reject with their original reason before transport.
 * Invalid numeric windows reject with RangeError before transport; offsets,
 * limits and their sum must be nonnegative safe integers.
 *
 * Decision by Kyle Mathews (GitHub KyleAMathews), 2026-11-18:
 * Reusable SDK contexts are bounded by 500 and server validator stamps by 1000.
 * Reinstalling refreshes eviction order; shortcut 304s may keep server order.
 * Settled readers release pending references and abort listeners.
 *
 * Limits: HTTP peers and database counters are controlled; real Worker tests
 * supply mounted authentication and D1 integration. Cache capacity and eviction
 * order are covered separately from freshness. No claim about readFlight throw style.
 */
import fc from 'fast-check';
import { oracleProperty, differs, pass, violation } from '@tanstack/oracles';
import { BlyggerApi, createBlyggerClient, unwrap } from '../sdk/index.ts';

const action = fc.record({ value: fc.integer({ min: 0, max: 10000 }), context: fc.boolean(), invalid: fc.boolean(), write: fc.boolean() });
const arbitrary = fc.record({ steps: fc.array(action, { minLength: 2, maxLength: 12 }) });
const summary = (all: number) => ({ all, drafts: 0, changes: 0, public: all, withdrawn: 0 });
const tag = (n: number) => `W/"value-${n}"`;
// Reach records driver premises separately from returned-value comparisons.
// Flush after the result so existing fixed-case calibrations keep their target.
function driverReach(observe: (checkpoint: string, value: unknown) => void) {
  const reached = new Set<string>();
  return {
    add: (...states: string[]) => states.forEach(state => reached.add(state)),
    flush: () => reached.forEach(state => observe('reach', state)),
  };
}
const repeated = (plan: typeof arbitrary extends fc.Arbitrary<infer History> ? History : never) => ({ steps: [
  { ...plan.steps[0], invalid: false, write: false },
  { ...plan.steps[0], invalid: false, write: false },
  { ...plan.steps[0], value: plan.steps[0].value + 1 > 10000 ? 0 : plan.steps[0].value + 1, invalid: true, write: true },
  { ...plan.steps[0], invalid: false, write: false },
] });

oracleProperty({
  id: 'sdk-conditional-pairs',
  owns: ['sdk/index.ts#createBlyggerClient', 'sdk/conditional-reads.ts#conditionalReadFetch'],
  law: {
    statement: 'For every request context, conditional reads return the current valid body and retain only validated ETag/body pairs across failures and writes.',
    authority: 'Kyle Mathews (KyleAMathews), approved ETag contract, 2026-11-18: paired cache entries and freshness after writes.',
    limits: 'Controlled HTTP peer; server, batching, cursor consistency and cancellation are checked separately.',
  },
  histories: { arbitrary, runs: 30, fixedSeeds: [20261118], states: ['revalidated', 'invalid'],
    constructed: [{ name: 'valid-invalid-revalidate', enters: ['revalidated', 'invalid'], build: repeated }] },
  // A context remembers only its last valid input value. Invalid wire data
  // cannot change that value or its tag, so the read checkpoint compares both.
  model: plan => {
    const accepted = new Map<boolean, number>();
    return plan.steps.map(step => {
      const validator = accepted.has(step.context) ? tag(accepted.get(step.context)!) : null;
      if (!step.invalid) accepted.set(step.context, step.value);
      return { validator, result: step.invalid ? 'rejected' : summary(step.value) };
    });
  },
  driver: async (plan, observe) => {
    try {
    let current = plan.steps[0], validator: string | null = null;
    const client = createBlyggerClient({ baseUrl: 'https://oracle.test/api', conditionalReads: true,
      fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
        const request = new Request(input, init);
        if (request.method !== 'GET') return Response.json({});
        validator = request.headers.get('if-none-match');
        if (validator) observe('reach', 'revalidated');
        if (current.invalid) return Response.json({ all: 'invalid' }, { headers: { ETag: tag(current.value) } });
        return validator === tag(current.value)
          ? new Response(null, { status: 304, headers: { ETag: tag(current.value) } })
          : Response.json(summary(current.value), { headers: { ETag: tag(current.value) } });
      },
    } as Parameters<typeof createBlyggerClient>[0]);
    for (const step of plan.steps) {
      current = step;
      if (step.write) await client.post({ url: '/oracle-write', body: {} });
      let result: unknown;
      try { result = await unwrap(BlyggerApi.getItemSummary({ client, headers: { Authorization: `Bearer ${step.context}` } })); }
      catch { result = 'rejected'; }
      if (step.invalid) observe('reach', 'invalid');
      observe('read', { validator, result });
    }
    } catch (error) { observe('unexpected-error', error instanceof Error ? { name: error.name, message: error.message } : String(error)); }
  },
  check: (_plan, trace, expected) => {
    const rows = trace.filter(entry => entry.checkpoint === 'read');
    // A recorded mismatch outranks later cleanup. Missing future reads use an
    // unrecorded count checkpoint, so a correct prefix preserves driver errors.
    for (const [index, entry] of rows.entries()) {
      const bad = differs(entry.checkpoint, 'paired cache entries', [entry.value], index < expected.length ? [expected[index]] : []); if (bad) return bad;
    }
    return differs('read count', 'paired cache entries', rows.length, expected.length) ?? pass;
  },
  calibrations: [{ name: 'lose-validator', law: 'paired cache entries', history: { constructed: 'valid-invalid-revalidate' },
    corrupt: trace => trace.map(o => o.checkpoint === 'read' ? { ...o, value: { ...(o.value as object), validator: 'wrong' } } : o) }],
});

import { QueryCache, QueryClient } from '@tanstack/query-core';
import { readCursorWindow } from '../src/ui/cursor-query.ts';
import { createReadBatchFetch } from '../src/ui/read-batch.ts';

oracleProperty({
  id: 'conditional-page-refresh', owns: ['src/ui/cursor-query.ts#readCursorWindow'],
  law: { statement: 'For every refresh after a write, acquire a current cursor sequence without mixing old pages.', authority: 'Kyle Mathews (KyleAMathews), approved ETag law: freshness after writes, 2026-11-18.', limits: 'Controlled generation-bound cursors, the same guarantee supplied by cursor-page.ts.' },
  histories: { arbitrary: fc.record({ before: fc.integer(), after: fc.integer() }), runs: 20, fixedSeeds: [20261118], states: ['changed-first-page', 'current-continuation'], constructed: [
    { name: 'changed-generation', enters: ['changed-first-page', 'current-continuation'], build: h => ({ ...h, before: 1, after: 2 }) },
  ], fixed: [{ name: 'changed', history: { before: 1, after: 2 } }] },
  // Each input value names a complete two-row generation. The rows checkpoint
  // must return that generation twice, independently of how pages are cached.
  model: plan => [[plan.before, plan.before], [plan.after, plan.after]],
  driver: async (plan, observe) => {
    try {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const reach = driverReach(observe);
    let value = plan.before, previousFirst: number | undefined;
    const read = async (cursor: string | undefined) => {
      if (cursor === undefined) {
        if (previousFirst !== undefined && previousFirst !== value) reach.add('changed-first-page');
        previousFirst = value;
      } else if (cursor === String(value)) reach.add('current-continuation');
      return { items: [value], page: { limit: 1, nextCursor: cursor ? null : String(value) } };
    };
    try {
      for (const next of [plan.before, plan.after]) {
        value = next;
        observe('rows', await readCursorWindow({ queryClient, queryKey: ['oracle', 'pages'], signal: new AbortController().signal, window: {}, read, revalidate: true } as Parameters<typeof readCursorWindow<number>>[0]));
      }
      reach.flush();
    } finally { queryClient.clear(); }
    } catch (error) { observe('unexpected-error', error instanceof Error ? { name: error.name, message: error.message } : String(error)); }
  },
  check: (_plan, trace, expected) => {
    const rows = trace.filter(entry => entry.checkpoint !== 'reach');
    for (const [index, entry] of rows.entries()) {
      const bad = differs(entry.checkpoint, 'fresh sequence', [entry.value], index < expected.length ? [expected[index]] : []); if (bad) return bad;
    }
    return differs('row count', 'fresh sequence', rows.length, expected.length) ?? pass;
  },
  calibrations: [{ name: 'old-page', law: 'fresh sequence', history: { fixed: 'changed' }, corrupt: trace => trace.map((o, i) => i === 1 ? { ...o, value: [99, 99] } : o) }],
});

oracleProperty({
  id: 'conditional-batch', owns: ['src/ui/read-batch.ts#createReadBatchFetch'],
  law: { statement: 'For every eligible child GET, batching preserves its own validator and response while keeping conditional requests batchable.', authority: 'Kyle Mathews (KyleAMathews), approved ETag law: transparent batching, 2026-11-18.', limits: 'Controlled REST peer; server operation authorization is checked by Worker tests.' },
  histories: { arbitrary: fc.record({ first: fc.nat(), second: fc.nat() }), runs: 20, fixedSeeds: [20261118], states: ['distinct-child-validators', 'bodyless-child-responses'], constructed: [
    { name: 'distinct-conditional-children', enters: ['distinct-child-validators', 'bodyless-child-responses'], build: h => ({ ...h, first: 1, second: 2 }) },
  ], fixed: [{ name: 'different validators', history: { first: 1, second: 2 } }] },
  // The peer supplies two bodyless 304s. At batch settlement, their validators
  // and positions must match the two input positions, with one physical POST.
  model: plan => ({ methods: ['POST'], validators: [tag(plan.first), tag(plan.second)], statuses: [304, 304], bodies: ['', ''] }),
  driver: async (plan, observe) => {
    try {
    const methods: string[] = [], validators: unknown[] = [];
    const transport = createReadBatchFetch('https://oracle.test/api', async (input, init) => {
      const request = new Request(input, init); methods.push(request.method);
      if (request.method === 'GET') { validators.push(request.headers.get('if-none-match')); return new Response(null, { status: 304 }); }
      const body = await request.json() as { requests: { ifNoneMatch?: string }[] };
      validators.push(...body.requests.map(child => child.ifNoneMatch));
      return Response.json(body.requests.map(child => ({ status: 304, body: null, headers: { ETag: child.ifNoneMatch } })));
    });
    const responses = await immediateOutcome(Promise.all([plan.first, plan.second].map((n, i) => transport(`https://oracle.test/api/items/${i}`, { headers: { 'If-None-Match': tag(n) } }))));
    const bodies = await Promise.all(responses.map(r => r.text()));
    observe('batch', { methods, validators, statuses: responses.map(r => r.status), bodies });
    if (methods.length === 1 && methods[0] === 'POST' && validators.length === 2 && validators[0] !== validators[1]) observe('reach', 'distinct-child-validators');
    if (responses.length === 2 && responses.every(r => r.status === 304) && bodies.every(body => body === '')) observe('reach', 'bodyless-child-responses');
    } catch (error) { observe('unexpected-error', error instanceof Error ? { name: error.name, message: error.message } : String(error)); }
  },
  check: (_plan, trace, expected) => differs('batch', 'transparent batching', trace[0]?.value, expected) ?? pass,
  calibrations: [{ name: 'lost-child-validator', law: 'transparent batching', history: { fixed: 'different validators' }, corrupt: trace => [{ ...trace[0], value: {} }] }],
});

import { executeRest } from '../src/operation-rest.ts';
import { readOperation } from '../src/operation-policy.ts';
import { success } from '../src/operation-types.ts';
import { CHANGE_DOMAINS } from '../src/change-state.ts';
import type { OperationDefinition } from '../src/operations.ts';
import type { Context } from 'hono';
import type { Env } from '../src/types.ts';

oracleProperty({
  id: 'private-resource-validators', owns: ['src/conditional-operation.ts#conditionalOperation'],
  law: { statement: 'For every private resource, a matching validator returns bodyless 304 after ordinary admission and validation; a changed representation returns 200 and its current ETag.', authority: 'Kyle Mathews (KyleAMathews), approved correct validators law, 2026-11-18.', limits: 'Real REST adapter and runner with a controlled database/handler; receiving Worker tests cover mounted authentication.' },
  histories: { arbitrary: fc.record({ first: fc.nat(), second: fc.nat() }), runs: 20, fixedSeeds: [20261118], states: ['matching-resource-validator', 'changed-resource-validator'], constructed: [
    { name: 'resource-changes', enters: ['matching-resource-validator', 'changed-resource-validator'], build: h => ({ ...h, first: 1, second: 2 }) },
  ], fixed: [{ name: 'changed', history: { first: 1, second: 2 } }] },
  // Equal inputs leave the resource unchanged; different inputs advance its
  // dependency. The http checkpoint distinguishes skipped work from a new body.
  model: plan => ({ loads: plan.first === plan.second ? 1 : 2, statuses: [200, 304, plan.first === plan.second ? 304 : 200], tags: true, unchangedBody: '', changed: plan.first === plan.second ? '' : JSON.stringify(summary(plan.second)) }),
  driver: async (plan, observe) => {
    try {
    let value = plan.first, revision = 0, loads = 0;
    const db = { prepare: (sql: string) => ({ bind() { return this; }, first: async () => sql.startsWith('SELECT epoch') ? { epoch: 'oracle', ...Object.fromEntries(CHANGE_DOMAINS.map(domain => [domain, revision])) } : { admitted: true } }) };
    const definition = { route: { method: 'get', operationId: 'getItemSummary', path: '/oracle', responses: {}, policy: readOperation() }, handler: async () => { loads++; return success(summary(value)); } } as OperationDefinition;
    const call = async (etag?: string) => {
      const request = new Request('https://oracle.test/api/oracle', { headers: etag ? { 'If-None-Match': etag } : {} });
      const headers = new Headers();
      return executeRest(definition, { env: { DB: db }, req: { raw: request, url: request.url, param: () => ({}), query: () => ({}), header: (name: string) => request.headers.get(name) ?? undefined }, get: (name: string) => name === 'apiAccess' ? null : [], header: (name: string, val: string) => headers.set(name, val), json: (body: unknown, status: number) => Response.json(body, { status, headers }), body: (body: BodyInit | null, status: number) => new Response(body, { status, headers }) } as unknown as Context<{ Bindings: Env }>);
    };
    const first = await call(), tag = first.headers.get('etag');
    const unchanged = await call(tag ?? undefined);
    if (value !== plan.second) revision++;
    value = plan.second;
    const changed = await call(tag ?? undefined);
    observe('http', { loads, statuses: [first.status, unchanged.status, changed.status], tags: Boolean(tag && changed.headers.get('etag')), unchangedBody: await unchanged.text(), changed: await changed.text() });
    if (tag && unchanged.status === 304) observe('reach', 'matching-resource-validator');
    if (tag && changed.status === 200 && changed.headers.get('etag') !== tag) observe('reach', 'changed-resource-validator');
    } catch (error) { observe('unexpected-error', error instanceof Error ? { name: error.name, message: error.message } : String(error)); }
  },
  check: (_plan, trace, expected) => differs('http', 'correct validators', trace[0]?.value, expected) ?? pass,
  calibrations: [{ name: 'body-on-304', law: 'correct validators', history: { fixed: 'changed' }, corrupt: trace => [{ ...trace[0], value: { ...(trace[0].value as object), unchangedBody: '{}' } }] }],
});

// Controlled immediate work must settle after its promise jobs and a fair
// event-loop task. This observes missing callbacks; it is not a wall-clock
// deadline and is never used while a transport is deliberately withheld.
async function immediateOutcome<T>(work: Promise<T>): Promise<T> {
  return Promise.race([work, new Promise<never>((_resolve, reject) => setImmediate(() => reject(new Error('Controlled immediate work remained pending'))))]);
}

function trackBatchListeners() {
  const original = AbortSignal.prototype.addEventListener;
  let reader = -1;
  const owners = new WeakMap<AbortSignal, number>();
  const registrations: { signal: AbortSignal; listener: EventListenerOrEventListenerObject; reader: number }[] = [];
  AbortSignal.prototype.addEventListener = new Proxy(original, { apply(target, receiver, args) {
    if (args[0] === 'abort' && /read-batch\.ts/.test(new Error().stack?.split('\n')[2] ?? '')) {
      if (reader !== -1) owners.set(receiver, reader);
      registrations.push({ signal: receiver, listener: args[1], reader: owners.get(receiver) ?? -1 });
    }
    return Reflect.apply(target, receiver, args);
  } });
  return {
    read<T>(index: number, load: () => T): T { reader = index; try { return load(); } finally { reader = -1; } },
    remaining(index: number) { return registrations.reduce((sum, entry) => sum + Number(entry.reader === index && (getEventListeners(entry.signal, 'abort') as EventListenerOrEventListenerObject[]).includes(entry.listener)), 0); },
    restore() { AbortSignal.prototype.addEventListener = original; },
  };
}

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(accept => { resolve = accept; });
  return { promise, resolve };
};
const raceHistory = fc.record({ value: fc.integer({ min: 0, max: 10000 }), stage: fc.constantFrom('fetch', 'body'), notModified: fc.boolean(), peerMode: fc.constantFrom('etag', 'untagged', 'not-modified'), action: fc.constantFrom('cancel', 'write', 'peer') });
oracleProperty({
  id: 'conditional-read-races', work: { ratio: 1 }, owns: ['sdk/conditional-reads.ts#conditionalReadFetch'],
  law: { statement: 'For every overlapping read, cancellation leaves peers running and cancelled or pre-write work cannot replace a newer accepted representation.', authority: 'Kyle Mathews (KyleAMathews), approved independent cancellation and freshness after writes laws, 2026-11-18.', limits: 'Controlled fetch and body gates; cancellation delivery is observed after the controlled peer settles.' },
  histories: { arbitrary: raceHistory, runs: 25, fixedSeeds: [20261118], states: ['fetch', 'body', 'cancel', 'write', 'peer'], constructed: [
    { name: 'cancel-fetch', enters: ['cancel', 'fetch'], build: h => ({ ...h, stage: 'fetch' as const, action: 'cancel' as const }) },
    { name: 'write-body', enters: ['write', 'body'], build: h => ({ ...h, stage: 'body' as const, action: 'write' as const }) },
    { name: 'overlapping-peer', enters: ['peer'], build: h => ({ ...h, action: 'peer' as const }) },
    { name: 'untagged-peer', enters: ['peer'], build: h => ({ ...h, action: 'peer' as const, stage: 'fetch' as const, notModified: false, peerMode: 'untagged' as const }) },
    { name: 'newer-304', enters: ['peer'], build: h => ({ ...h, action: 'peer' as const, stage: 'fetch' as const, notModified: false, peerMode: 'not-modified' as const }) },
  ] },
  // The controlled peer is newer in request order. A cancelled or pre-write
  // read rejects; a stale same-period read can return only the newer tagged pair.
  // The race checkpoint compares both readers and the next sent validator.
  model: plan => ({ first: plan.action === 'peer' && plan.peerMode !== 'untagged' ? summary(plan.value + 1) : 'rejected', peer: summary(plan.value + 1), validator: plan.peerMode === 'untagged' ? null : tag(plan.value + 1), writeStatus: plan.action === 'write' ? 200 : null }),
  driver: async (plan, observe) => {
    try {
    const entered = deferred<void>(), release = deferred<void>();
    let reads = 0, lastValidator: string | null = null;
    let warm = plan.notModified && plan.stage === 'fetch' || plan.peerMode === 'not-modified';
    const warmValue = plan.peerMode === 'not-modified' ? plan.value + 1 : plan.value;
    const client = createBlyggerClient({ baseUrl: 'https://oracle.test/api/', conditionalReads: true, fetch: async input => {
      const request = input instanceof Request ? input : new Request(input);
      if (request.method !== 'GET') return Response.json({ ok: true });
      lastValidator = request.headers.get('if-none-match');
      if (warm) return Response.json(summary(warmValue), { headers: { ETag: tag(warmValue) } });
      if (++reads !== 1) return plan.peerMode === 'not-modified' ? new Response(null, { status: 304, headers: { ETag: tag(warmValue) } }) : Response.json(summary(plan.value + 1), { headers: plan.peerMode === 'untagged' ? {} : { ETag: tag(plan.value + 1) } });
      if (plan.stage === 'fetch') {
        entered.resolve(); await release.promise;
        return plan.notModified ? new Response(null, { status: 304, headers: { ETag: tag(warmValue) } }) : Response.json(summary(plan.value), { headers: { ETag: tag(plan.value) } });
      }
      const response = Response.json(summary(plan.value), { headers: { ETag: tag(plan.value) } });
      const clone = response.clone.bind(response);
      response.clone = () => {
        const copy = clone();
        const text = copy.text.bind(copy);
        copy.text = async () => { entered.resolve(); await release.promise; return text(); };
        return copy;
      };
      return response;
    } });
    if (warm) { await unwrap(BlyggerApi.getItemSummary({ client })); warm = false; }
    const controller = new AbortController();
    const first = unwrap(BlyggerApi.getItemSummary({ client, signal: controller.signal })).catch(() => 'rejected');
    await entered.promise;
    let writeStatus: number | null = null;
    if (plan.action === 'cancel') controller.abort();
    if (plan.action === 'write') writeStatus = (await client.post({ url: '/write' })).response?.status ?? null;
    const peer = await unwrap(BlyggerApi.getItemSummary({ client }));
    release.resolve();
    const result = await first;
    await unwrap(BlyggerApi.getItemSummary({ client }));
    observe('reach', plan.stage); observe('reach', plan.action);
    observe('race', { first: result, peer, validator: lastValidator, writeStatus });
    } catch (error) { observe('unexpected-error', error instanceof Error ? { name: error.name, message: error.message } : String(error)); }
  },
  check: (_plan, trace, expected) => differs('race', 'independent cancellation and freshness', trace.find(o => o.checkpoint === 'race')?.value, expected) ?? pass,
  calibrations: [{ name: 'stale-read-wins', law: 'independent cancellation and freshness', history: { constructed: 'overlapping-peer' }, corrupt: trace => trace.map(o => o.checkpoint === 'race' ? { ...o, value: {} } : o) }],
});

const faults = ['valid', 'untagged', 'invalid-json', 'invalid-schema', 'unavailable', 'mismatch', 'orphan', 'orphan-twice'] as const;
oracleProperty({
  id: 'conditional-failures', work: { ratio: 1 }, owns: ['sdk/conditional-reads.ts#conditionalReadFetch'],
  law: { statement: 'For every failed validation, preserve the accepted body/ETag pair; an untagged valid response removes the old validator and an orphan 304 cannot produce data.', authority: 'Kyle Mathews (KyleAMathews), approved paired cache entries law, 2026-11-18.', limits: 'Malformed HTTP peer responses are rejected; a single unconditional recovery is permitted for an orphan 304.' },
  histories: { arbitrary: fc.record({ value: fc.nat(10000), fault: fc.constantFrom(...faults), warm: fc.boolean() }), runs: 30, fixedSeeds: [20261118],
    states: [...faults.map(fault => `wire-${fault}`), 'conditional-fault', 'unconditional-fault'], constructed: [
      ...faults.map(fault => ({ name: `inject-${fault}`, enters: [`wire-${fault}`, 'conditional-fault'], build: (h: { value: number; fault: typeof faults[number]; warm: boolean }) => ({ ...h, fault, warm: true }) })),
      { name: 'cold-fault', enters: ['unconditional-fault'], build: h => ({ ...h, fault: 'invalid-schema' as const, warm: false }) },
    ],
    fixed: faults.flatMap(fault => [false, true].map(warm => ({ name: `${fault}-${warm}`, history: { value: 4, fault, warm } }))) },
  // The fault input says which wire promise is broken. Rejection preserves a
  // warmed pair; valid untagged data clears its validator. The failure checkpoint
  // compares that pair through the following physical request, not cache state.
  model: plan => {
    const valid = ['valid', 'untagged', 'orphan'].includes(plan.fault) || plan.fault === 'orphan-twice' && plan.warm;
    return { result: valid ? summary(plan.fault.startsWith('orphan') && plan.warm ? plan.value : plan.value + 1) : { error: plan.fault === 'unavailable' ? 503 : 'invalid' },
      validator: plan.fault === 'untagged' ? null : valid && !(plan.fault.startsWith('orphan') && plan.warm) ? tag(plan.value + 1) : plan.warm ? tag(plan.value) : null };
  },
  driver: async (plan, observe) => {
    try {
    const reach = driverReach(observe);
    let phase: 'warm' | 'fault' | 'inspect' = 'warm', calls = 0, validator: string | null = null;
    const client = createBlyggerClient({ baseUrl: 'https://oracle.test/api', conditionalReads: true, fetch: async input => {
      const request = new Request(input); validator = request.headers.get('if-none-match');
      if (phase === 'warm') return Response.json(summary(plan.value), { headers: { ETag: tag(plan.value) } });
      if (phase === 'inspect') return Response.json(summary(plan.value + 2), { headers: { ETag: tag(plan.value + 2) } });
      reach.add(`wire-${plan.fault}`, validator === null ? 'unconditional-fault' : 'conditional-fault');
      calls++;
      if (plan.fault === 'unavailable') return Response.json({ message: 'Unavailable' }, { status: 503 });
      if (plan.fault === 'invalid-json') return new Response('{', { headers: { ETag: tag(plan.value + 1) } });
      if (plan.fault === 'invalid-schema') return Response.json({ all: -1 }, { headers: { ETag: tag(plan.value + 1) } });
      if (plan.fault === 'mismatch') return new Response(null, { status: 304, headers: { ETag: 'wrong' } });
      if (plan.fault.startsWith('orphan') && (calls === 1 || plan.fault === 'orphan-twice')) return new Response(null, { status: 304 });
      return Response.json(summary(plan.value + 1), { headers: plan.fault === 'untagged' ? {} : { ETag: tag(plan.value + 1) } });
    } });
    if (plan.warm) await unwrap(BlyggerApi.getItemSummary({ client }));
    phase = 'fault';
    let result: unknown;
    try { result = await unwrap(BlyggerApi.getItemSummary({ client })); } catch (error) { result = { error: error && typeof error === 'object' && 'statusCode' in error ? error.statusCode : 'invalid' }; }
    phase = 'inspect'; await unwrap(BlyggerApi.getItemSummary({ client }));
    observe('failure', { result, validator });
    reach.flush();
    } catch (error) { observe('unexpected-error', error instanceof Error ? { name: error.name, message: error.message } : String(error)); }
  },
  check: (_plan, trace, expected) => differs('failure', 'paired cache entries', trace[0]?.value, expected) ?? pass,
  calibrations: [{ name: 'cache-invalid-tag', law: 'paired cache entries', history: { fixed: 'invalid-schema-true' }, corrupt: trace => [{ ...trace[0], value: { ...(trace[0].value as object), validator: 'wrong' } }] }],
});

const contexts = ['same', 'credentials', 'headers', 'mode', 'redirect', 'cache', 'referrer', 'referrerPolicy', 'range', 'if-match', 'integrity', 'keepalive', 'foreign', 'outside-mount', 'unknown', 'bad-unicode', 'reserved', 'duplicate-query', 'write'] as const;
const batchGrammar = fc.record({ count: fc.integer({ min: 1, max: 105 }), context: fc.constantFrom(...contexts), failure: fc.constantFrom('none', 'outer', 'length', 'throw') });
const plannedRequest = (context: typeof contexts[number], i: number) => {
  const url = context === 'foreign' ? `https://foreign.test/api/items/${i}` : context === 'reserved' ? 'https://oracle.test/api/items/summary' : context === 'unknown' ? `https://oracle.test/api/settings?q=${i}` : context === 'outside-mount' ? `https://oracle.test/else/items/${i}` : context === 'bad-unicode' ? `https://oracle.test/api/items/%E0%A4%A?i=${i}` : `https://oracle.test/api/items/${i}${context === 'duplicate-query' ? '?id=a&id=b' : '?q=x'}`;
  return { url, method: context === 'write' ? 'PATCH' : 'GET', headers: { 'If-None-Match': tag(i), ...(context === 'headers' ? { 'X-Context': String(i % 2) } : {}), ...(context === 'range' ? { Range: 'bytes=0-1' } : {}), ...(context === 'if-match' ? { 'If-Match': 'explicit' } : {}) }, credentials: context === 'credentials' && i % 2 ? 'omit' as const : 'same-origin' as const,
    mode: context === 'mode' && i % 2 ? 'same-origin' as const : 'cors' as const,
    redirect: context === 'redirect' && i % 2 ? 'manual' as const : 'follow' as const,
    cache: context === 'cache' && i % 2 ? 'no-store' as const : 'default' as const,
    referrer: context === 'referrer' && i % 2 ? 'https://oracle.test/from' : 'about:client',
    referrerPolicy: context === 'referrerPolicy' && i % 2 ? 'no-referrer' as const : '' as const,
    integrity: context === 'integrity' ? 'sha256-fixture' : '', keepalive: context === 'keepalive' };

};
const childResult = (i: number) => ({ status: [304, 200, 404, 204, 205][i % 5], body: [0, 3, 4].includes(i % 5) ? '' : JSON.stringify({ id: String(i) }), headers: { etag: tag(i), type: 'application/json', cache: 'no-store' } });
oracleProperty({
  id: 'batch-contexts-and-failures', work: { ratio: 1 }, owns: ['src/ui/read-batch.ts#createReadBatchFetch'],
  law: { statement: 'For every eligible read and Fetch context, batching preserves each child validator/status/body, separates request contexts, bounds envelopes at fifty, and preserves failures.', authority: 'Kyle Mathews (KyleAMathews), approved transparent batching law, 2026-11-18; existing read-batch contract limits envelopes to 50.', limits: 'Controlled HTTP peer; direct fallback requests preserve their original HTTP method and URL.' },
  histories: { arbitrary: batchGrammar, runs: 15, fixedSeeds: [20261118], states: ['full-envelope', 'separate-context-envelopes', 'direct-fallback', 'outer-error', 'malformed-envelope', 'transport-error', 'exact-envelope-multiple'], constructed: [
    { name: 'at-envelope-bound', enters: ['full-envelope'], build: h => ({ ...h, count: 50, context: 'same' as const, failure: 'none' as const }) },
    { name: 'partition-by-context', enters: ['separate-context-envelopes'], build: h => ({ ...h, count: 2, context: 'credentials' as const, failure: 'none' as const }) },
    { name: 'unsupported-range', enters: ['direct-fallback'], build: h => ({ ...h, count: 2, context: 'range' as const, failure: 'none' as const }) },
    { name: 'outer-rejection', enters: ['outer-error'], build: h => ({ ...h, count: 2, context: 'same' as const, failure: 'outer' as const }) },
    { name: 'wrong-child-count', enters: ['malformed-envelope'], build: h => ({ ...h, count: 2, context: 'same' as const, failure: 'length' as const }) },
    { name: 'network-rejection', enters: ['transport-error'], build: h => ({ ...h, count: 2, context: 'same' as const, failure: 'throw' as const }) },
    { name: 'two-full-envelopes', enters: ['exact-envelope-multiple'], build: h => ({ ...h, count: 100, context: 'same' as const, failure: 'none' as const }) },
  ], fixed: [...contexts.map(context => ({ name: context, history: { count: 55, context, failure: 'none' as const } })), ...[50, 100].map(count => ({ name: `exact-bound-${count}`, history: { count, context: 'same' as const, failure: 'none' as const } }))] },
  // The specified envelope rule chunks input positions at fifty, then separates
  // Fetch contexts. Each position keeps its own wire status/body, while an outer
  // failure affects exactly its envelope. The contexts checkpoint records both.
  model: plan => {
    const eligible = ['same', 'headers', 'credentials', 'mode', 'redirect', 'cache', 'referrer', 'referrerPolicy'].includes(plan.context);
    const groups = eligible ? Array.from({ length: Math.ceil(plan.count / 50) }, (_, chunk) => {
      const ids = Array.from({ length: Math.min(50, plan.count - chunk * 50) }, (_, i) => chunk * 50 + i);
      return plan.context === 'same' ? [ids] : [ids.filter(i => i % 2 === 0), ids.filter(i => i % 2 === 1)].filter(group => group.length);
    }).flat() : [];
    const batches = groups.map(group => group.length).sort((a, b) => a - b);
    const forwarded = groups.map(group => {
      const request = plannedRequest(plan.context, group[0]);
      return { operation: 'getItem', credentials: request.credentials, mode: request.mode, redirect: request.redirect, cache: request.cache,
        referrer: request.referrer, referrerPolicy: request.referrerPolicy, contextHeader: request.headers['X-Context'] ?? null,
        requests: group.map(i => ({ path: { id: String(i) }, query: { q: 'x' }, ifNoneMatch: tag(i) })) };
    }).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
    return { batches, forwarded, direct: eligible ? [] : Array.from({ length: plan.count }, (_, i) => ({ url: plannedRequest(plan.context, i).url, method: plan.context === 'write' ? 'PATCH' : 'GET' })),
      results: Array.from({ length: plan.count }, (_, i) => eligible && plan.failure !== 'none' ? plan.failure === 'throw' ? 'Error: lost network' : plan.failure === 'outer' ? 'BlyggerApiError: outer' : 'Error: Read batch response length mismatch' : eligible ? childResult(i) : { status: 200, body: JSON.stringify({ direct: true }), headers: { etag: null, type: 'application/json', cache: null } }), outerValidators: eligible ? batches.map(() => null) : [] };
  },
  driver: async (plan, observe) => {
    try {
    const forwarded: unknown[] = [];
    const batches: number[] = [], direct: { url: string; method: string }[] = [], outerValidators: (string | null)[] = [];
    const fetcher = createReadBatchFetch('https://oracle.test/api/', async input => {
      const request = input instanceof Request ? input : new Request(input);
      if (!request.url.endsWith('/read-batch')) { direct.push({ url: request.url, method: request.method }); return Response.json({ direct: true }); }
      const body = await request.json() as { operation: string; requests: { path: { id: string }; query?: { q?: string }; ifNoneMatch?: string }[] };
      forwarded.push({ operation: body.operation, credentials: request.credentials, mode: request.mode, redirect: request.redirect, cache: request.cache, referrer: request.referrer, referrerPolicy: request.referrerPolicy, contextHeader: request.headers.get('x-context'), requests: body.requests });
      batches.push(body.requests.length); outerValidators.push(request.headers.get('if-none-match'));
      if (plan.failure === 'outer') return Response.json({ message: 'outer' }, { status: 502 });
      if (plan.failure === 'throw') throw 'lost network';
      if (body.operation !== 'getItem' || body.requests.some(child => child.query?.q !== 'x' || child.ifNoneMatch !== tag(Number(child.path.id)))) return Response.json([]);
      const results = body.requests.map(child => { const i = Number(child.path.id), result = childResult(i); return { status: result.status, body: [204, 205, 304].includes(result.status) ? null : { id: String(i) }, headers: { ETag: tag(i) } }; });
      return Response.json(plan.failure === 'length' ? results.slice(1) : results);
    });
    const results = await immediateOutcome(Promise.all(Array.from({ length: plan.count }, async (_, i) => {
      const request = plannedRequest(plan.context, i);
      try { const response = await fetcher(request.url, request); return { status: response.status, body: await response.text(), headers: { etag: response.headers.get('etag'), type: response.headers.get('content-type'), cache: response.headers.get('cache-control') } }; }
      catch (error) { return String(error); }
    })));
    observe('contexts', { batches: batches.sort((a, b) => a - b), forwarded: forwarded.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))), direct, results, outerValidators });
    if (batches.includes(50)) observe('reach', 'full-envelope');
    const partitions = forwarded as { credentials: string; contextHeader: string | null; mode: string; redirect: string; cache: string; referrer: string; referrerPolicy: string }[];
    if (new Set(partitions.map(({ credentials, contextHeader, mode, redirect, cache, referrer, referrerPolicy }) => JSON.stringify({ credentials, contextHeader, mode, redirect, cache, referrer, referrerPolicy }))).size > 1) observe('reach', 'separate-context-envelopes');
    if (direct.length > 0 && batches.length === 0) observe('reach', 'direct-fallback');
    if (results.some(result => result === 'BlyggerApiError: outer')) observe('reach', 'outer-error');
    if (results.some(result => result === 'Error: Read batch response length mismatch')) observe('reach', 'malformed-envelope');
    if (results.some(result => result === 'Error: lost network')) observe('reach', 'transport-error');
    if (batches.length > 1 && batches.every(count => count === 50)) observe('reach', 'exact-envelope-multiple');
    } catch (error) { observe('unexpected-error', error instanceof Error ? { name: error.name, message: error.message } : String(error)); }
  },
  check: (_plan, trace, expected) => differs('contexts', 'transparent batching', trace[0]?.value, expected) ?? pass,
  calibrations: [{ name: 'mixed-context', law: 'transparent batching', history: { fixed: 'credentials' }, corrupt: trace => [{ ...trace[0], value: {} }] }],
});

oracleProperty({
  id: 'batch-reader-cancellation', work: { ratio: 1 }, owns: ['src/ui/read-batch.ts#createReadBatchFetch'],
  law: { statement: 'For every batch reader, cancellation rejects only that reader and aborts physical work when the final consumer cancels.', authority: 'Kyle Mathews (KyleAMathews), approved independent cancellation law, 2026-11-18.', limits: 'Controlled transport observes abort without rejecting until released, so late completion is exercised.' },
  histories: { arbitrary: fc.record({ beforeDispatch: fc.boolean(), all: fc.boolean(), value: fc.nat() }), runs: 15, fixedSeeds: [20261118], states: ['queued-active-peer', 'queued-final-reader', 'inflight-active-peer', 'inflight-final-reader'], constructed: [
    ...[false, true].flatMap(beforeDispatch => [false, true].map(all => ({ name: `${beforeDispatch ? 'queued' : 'inflight'}-${all ? 'final' : 'peer'}`, enters: [`${beforeDispatch ? 'queued' : 'inflight'}-${all ? 'final-reader' : 'active-peer'}`], build: (h: { beforeDispatch: boolean; all: boolean; value: number }) => ({ ...h, beforeDispatch, all }) }))),
  ], fixed: [{ name: 'one-reader', history: { beforeDispatch: false, all: false, value: 1 } }] },
  // Both readers exist before cancellation. Before release, only aborted readers
  // may settle; the physical request aborts only after its final reader leaves.
  // The cancellation checkpoint preserves this earlier settlement observation.
  model: plan => ({ cancelledListeners: 0, results: ['rejected', plan.all ? 'rejected' : { value: plan.value }], settledBeforeRelease: [true, plan.all], aborted: !plan.beforeDispatch && plan.all, calls: plan.beforeDispatch && plan.all ? 0 : 1 }),
  driver: async (plan, observe) => {
    const tracked = trackBatchListeners();
    const release = deferred<void>();
    try {
    const entered = deferred<void>();
    let calls = 0, signal: AbortSignal | undefined;
    const fetcher = createReadBatchFetch('https://oracle.test/api', async input => {
      const request = input instanceof Request ? input : new Request(input); calls++; signal = request.signal;
      const body = await request.json() as { requests: unknown[] };
      entered.resolve(); await release.promise;
      return Response.json(body.requests.map(() => ({ status: 200, body: { value: plan.value }, headers: {} })));
    });
    const controllers = [new AbortController(), new AbortController()];
    const settled = [false, false];
    const results = controllers.map((controller, i) => tracked.read(i, () => fetcher(`https://oracle.test/api/items/${i}`, { signal: controller.signal })).then(r => r.json(), () => 'rejected').finally(() => { settled[i] = true; }));
    if (!plan.beforeDispatch) await immediateOutcome(entered.promise);
    const dispatchedAtCancel = calls > 0;
    controllers[0].abort(); if (plan.all) controllers[1].abort();
    // Cancellation belongs to the reader, so it must arrive while the peer
    // is still withheld, rather than only after the batch response arrives.
    await new Promise<void>(resolve => setImmediate(resolve));
    const settledBeforeRelease = [...settled];
    const cancelledListeners = tracked.remaining(0);
    release.resolve();
    const answers = await immediateOutcome(Promise.all(results));
    controllers.forEach(controller => controller.abort());
    observe('cancellation', { cancelledListeners, results: answers, settledBeforeRelease, aborted: signal?.aborted ?? false, calls });
    if (settledBeforeRelease[0]) observe('reach', `${dispatchedAtCancel ? 'inflight' : 'queued'}-${settledBeforeRelease[1] ? 'final-reader' : 'active-peer'}`);
    } catch (error) { observe('unexpected-error', error instanceof Error ? { name: error.name, message: error.message } : String(error)); }
    finally { release.resolve(); tracked.restore(); }
  },
  check: (_plan, trace, expected) => differs('cancellation', 'independent cancellation', trace[0]?.value, expected) ?? pass,
  calibrations: [{ name: 'cancel-peer', law: 'independent cancellation', history: { fixed: 'one-reader' }, corrupt: trace => [{ ...trace[0], value: {} }] }],
});

oracleProperty({
  id: 'cursor-reader-cancellation', work: { ratio: 1 }, owns: ['src/ui/cursor-query.ts#readCursorWindow'],
  law: { statement: 'For every cursor acquisition, a cancelled reader cannot publish newly acquired pages; an active peer still completes independently.', authority: 'Kyle Mathews (KyleAMathews), approved independent cancellation law, 2026-11-18.', limits: 'Controlled page transport deliberately completes after abort. Existing accepted prefixes may remain cached.' },
  // Reader membership and page identity share the same public query-key
  // identity. Reordering an object's fields cannot turn a peer into a separate
  // acquisition. Cancelling both peers also witnesses final-reader cleanup.
  histories: { arbitrary: fc.record({ first: fc.boolean(), peer: fc.boolean(), allPeers: fc.boolean(), reordered: fc.boolean(), value: fc.nat() }), runs: 15, fixedSeeds: [20261118], states: ['first-page-active-peer', 'continuation-active-peer', 'first-page-final-reader', 'continuation-final-reader', 'reordered-shared-acquisition'], constructed: [
    ...[false, true].flatMap(first => [false, true].map(allPeers => ({ name: `${first ? 'first' : 'continuation'}-${allPeers ? 'final' : 'peer'}`, enters: [`${first ? 'first-page' : 'continuation'}-${allPeers ? 'final-reader' : 'active-peer'}`], build: (h: { first: boolean; peer: boolean; allPeers: boolean; reordered: boolean; value: number }) => ({ ...h, first, peer: true, allPeers, reordered: false }) }))),
    { name: 'equivalent-object-key', enters: ['reordered-shared-acquisition'], build: h => ({ ...h, first: false, peer: true, allPeers: false, reordered: true }) },
  ], fixed: [
    { name: 'last-reader-on-continuation', history: { first: false, peer: false, allPeers: false, reordered: false, value: 1 } },
    { name: 'reordered-peer-key', history: { first: false, peer: true, allPeers: false, reordered: true, value: 1 } },
    ...[false, true].map(first => ({ name: `cancel-both-${first ? 'first' : 'continuation'}`, history: { first, peer: true, allPeers: true, reordered: false, value: 1 } })),
  ] },
  // A held first page has no accepted prefix; a held continuation has one.
  // Final cancellation cannot add pages, while an active peer may finish both.
  // The cursor-cancel checkpoint compares results, abort and published page count.
  model: plan => ({ cancelled: 'rejected', peer: plan.peer ? plan.allPeers ? 'rejected' : [plan.value, plan.value + 1] : null, transportAborted: !plan.peer || plan.allPeers, firstReads: plan.first ? 1 : plan.peer ? 2 : 1, pages: plan.peer && !plan.allPeers ? 2 : plan.first ? 0 : 1 }),
  driver: async (plan, observe) => {
    try {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
    const entered = deferred<void>(), release = deferred<void>();
    const peerAcquisition = deferred<void>();
    let startingPeer = false;
    queryClient.defaultQueryOptions = new Proxy(queryClient.defaultQueryOptions, {
      apply(target, receiver, args) {
        // Query's public options boundary is reached after the adapter registers
        // the pager consumer. It also waits for the asynchronous digest, without
        // assuming that a timer tick means the peer has reached the pager.
        if (startingPeer && typeof args[0].queryFn === 'function' && args[0].queryKey?.at(-1) !== 'first-source') peerAcquisition.resolve();
        return Reflect.apply(target, receiver, args);
      },
    });
    let transport: AbortSignal | undefined, acquiredPage: 'first-page' | 'continuation' | undefined;
    let firstReads = 0;
    const options = { queryClient, queryKey: ['cancel', 'pages', { view: 'all', order: 'asc' }], revalidate: true, window: { limit: 2 }, read: async (cursor: string | undefined, signal: AbortSignal) => {
      if (cursor === undefined) firstReads++;
      if (plan.first === (cursor === undefined)) { transport = signal; acquiredPage = cursor === undefined ? 'first-page' : 'continuation'; entered.resolve(); await release.promise; }
      return { items: [cursor ? plan.value + 1 : plan.value], page: { limit: 1, nextCursor: cursor ? null : 'next' } };
    } };
    const controller = new AbortController();
    const peerController = new AbortController();
    const cancelled = readCursorWindow({ ...options, signal: controller.signal }).then(() => 'fulfilled', () => 'rejected');
    let peer: Promise<unknown> | undefined;
    try {
      // An early rejection is an observation too. Do not leave the driver
      // awaiting a transport gate that this execution will never reach.
      await Promise.race([entered.promise, cancelled.then(result => {
        throw new Error(`Reader ${result} before acquiring the controlled page`);
      })]);
      if (plan.peer) {
        startingPeer = true;
        peer = readCursorWindow({ ...options, queryKey: plan.reordered ? ['cancel', 'pages', { order: 'asc', view: 'all' }] : options.queryKey, signal: peerController.signal }).catch(() => 'rejected');
        if (!plan.first) await peerAcquisition.promise;
      }
      controller.abort();
      const result = await cancelled;
      if (plan.allPeers) { peerController.abort(); await peer; }
      const transportAborted = transport?.aborted;
      release.resolve();
      const answer = peer ? await peer : null;
      // Await the actual native query too: a rejected reader can leave it alive.
      await Promise.allSettled(queryClient.getQueryCache().getAll().map(query => query.promise).filter(Boolean));
      const pages = queryClient.getQueryCache().getAll().reduce((count, query) => count + ((query.state.data as { pages?: unknown[] } | undefined)?.pages?.length ?? 0), 0);
      observe('cursor-cancel', { cancelled: result, peer: answer, transportAborted, firstReads, pages });
      if (acquiredPage && result === 'rejected') {
        if (transportAborted) observe('reach', `${acquiredPage}-final-reader`);
        else if (Array.isArray(answer)) observe('reach', `${acquiredPage}-active-peer`);
      }
      if (plan.reordered && Array.isArray(answer) && !transportAborted && firstReads === (acquiredPage === 'first-page' ? 1 : 2)) observe('reach', 'reordered-shared-acquisition');
    } finally { release.resolve(); queryClient.clear(); }
    } catch (error) { observe('unexpected-error', error instanceof Error ? { name: error.name, message: error.message } : String(error)); }
  },
  check: (_plan, trace, expected) => differs('cursor-cancel', 'independent cancellation', trace[0]?.value, expected) ?? pass,
  calibrations: [{ name: 'late-cache-publication', law: 'independent cancellation', history: { fixed: 'last-reader-on-continuation' }, corrupt: trace => [{ ...trace[0], value: { ...(trace[0].value as object), pages: 2 } }] }],
});

// A cancelled final reader owns one acquisition, even when another key has
// the same prefix. An already completed reader has no authority over later work.
const isolatedReaders = fc.record({ relation: fc.constantFrom('prefix', 'sibling', 'other-client'), first: fc.boolean(), completedReader: fc.boolean(), value: fc.nat(1000) });
oracleProperty({
  id: 'cursor-acquisition-isolation', owns: ['src/ui/cursor-query.ts#readCursorWindow'],
  law: { statement: 'For every independent cursor acquisition, cancelling its final active reader cancels only its own transport and late publication; cancelling a completed reader leaves current work running.', authority: 'Kyle Mathews (KyleAMathews), approved independent cancellation and request isolation laws, 2026-11-18.', limits: 'Two controlled acquisitions with distinct keys or QueryClients. Existing accepted prefixes may remain cached.' },
  histories: { arbitrary: isolatedReaders, runs: 20, fixedSeeds: [20261118], states: ['prefix-acquisitions', 'sibling-acquisitions', 'separate-clients', 'first-page-acquisitions', 'continuation-acquisitions', 'completed-reader-aborted'], constructed: [
    ...(['prefix', 'sibling', 'other-client'] as const).map(relation => ({ name: `isolate-${relation}`, enters: [relation === 'other-client' ? 'separate-clients' : `${relation}-acquisitions`, 'continuation-acquisitions', 'completed-reader-aborted'], build: (h: typeof isolatedReaders extends fc.Arbitrary<infer History> ? History : never) => ({ ...h, relation, first: false, completedReader: true }) })),
    { name: 'isolate-first-pages', enters: ['first-page-acquisitions'], build: h => ({ ...h, first: true, completedReader: false }) },
  ], fixed: (['prefix', 'sibling', 'other-client'] as const).flatMap(relation => [false, true].flatMap(first => [false, true].map(completedReader => ({ name: `${relation}-${first ? 'first' : 'continuation'}-${completedReader ? 'completed-reader' : 'live-only'}`, history: { relation, first, completedReader, value: 1 } })))) },
  // Only the first acquisition loses its active reader. Its accepted prefix may
  // remain, but the second acquisition must finish regardless of key relation.
  // The isolation checkpoint also captures aborting an already completed reader.
  model: plan => ({ afterCompletedAbort: [false, false], afterActiveAbort: [true, false], results: ['rejected', [plan.value + 10, plan.value + 11]], pages: [plan.first ? 0 : 1, 2] }),
  driver: async (plan, observe) => {
    const clients = [new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } }), new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } })];
    const release = deferred<void>();
    try {
      const selected = [clients[0], plan.relation === 'other-client' ? clients[1] : clients[0]];
      const keys = [['isolation', 'pages'], plan.relation === 'prefix' ? ['isolation', 'pages', 'child'] : plan.relation === 'sibling' ? ['isolation', 'sibling'] : ['isolation', 'pages']];
      const entered = [deferred<void>(), deferred<void>()];
      const transports: AbortSignal[] = [], acquiredPages: boolean[] = [];
      let armed = false;
      const read = (index: number) => async (cursor: string | undefined, signal: AbortSignal) => {
        if (armed && plan.first === (cursor === undefined)) { transports[index] = signal; acquiredPages[index] = cursor === undefined; entered[index].resolve(); await release.promise; }
        return { items: [plan.value + index * 10 + (cursor ? 1 : 0)], page: { limit: 1, nextCursor: cursor ? null : 'next' } };
      };
      const completed = new AbortController();
      if (plan.completedReader) {
        await readCursorWindow({ queryClient: selected[0], queryKey: keys[0], window: { limit: 1 }, signal: completed.signal, read: read(0) });
        // A new first-page acquisition has no accepted prefix. The prior reader
        // remains settled, so aborting its signal must still have no effect.
        if (plan.first) selected[0].removeQueries({ queryKey: keys[0], exact: true });
      }
      armed = true;
      const controllers = [new AbortController(), new AbortController()];
      const results = controllers.map((controller, index) => readCursorWindow({ queryClient: selected[index], queryKey: keys[index], window: { limit: 2 }, signal: controller.signal, read: read(index) }).catch(() => 'rejected'));
      await Promise.all(entered.map((gate, index) => Promise.race([gate.promise, results[index].then(result => { throw new Error(`Reader settled before controlled transport: ${JSON.stringify(result)}`); })])));
      completed.abort();
      const afterCompletedAbort = transports.map(signal => signal.aborted);
      controllers[0].abort(); await results[0];
      const afterActiveAbort = transports.map(signal => signal.aborted);
      release.resolve();
      const answers = await Promise.all(results);
      await Promise.allSettled(clients.flatMap(client => client.getQueryCache().getAll().map(query => query.promise).filter(Boolean)));
      const pages = selected.map((client, index) => client.getQueryData<{ pages: unknown[] }>(keys[index])?.pages.length ?? 0);
      observe('isolation', { afterCompletedAbort, afterActiveAbort, results: answers, pages });
      if (transports.length === 2 && answers[0] === 'rejected' && Array.isArray(answers[1])) {
        observe('reach', selected[0] !== selected[1] ? 'separate-clients' : keys[1][1] === keys[0][1] ? 'prefix-acquisitions' : 'sibling-acquisitions');
        if (acquiredPages.every(Boolean)) observe('reach', 'first-page-acquisitions');
        if (acquiredPages.every(first => !first)) observe('reach', 'continuation-acquisitions');
      }
      if (plan.completedReader && completed.signal.aborted && afterCompletedAbort.every(aborted => !aborted)) observe('reach', 'completed-reader-aborted');
    } catch (error) { observe('unexpected-error', String(error)); }
    finally { release.resolve(); clients.forEach(client => client.clear()); }
  },
  check: (_plan, trace, expected) => differs('isolation', 'independent cancellation', trace[0]?.value, expected) ?? pass,
  calibrations: [{ name: 'cancel-related-key', law: 'independent cancellation', history: { fixed: 'prefix-continuation-completed-reader' }, corrupt: trace => [{ ...trace[0], value: { ...(trace[0].value as object), afterActiveAbort: [true, true] } }] }],
});

import { conditionalReadFetch } from '../sdk/conditional-reads.ts';
const passthroughCases = ['external', 'outside-mount', 'unknown', 'authorizations', 'head', 'options', 'write', 'range', 'explicit'] as const;
oracleProperty({
  id: 'conditional-sdk-passthrough', owns: ['sdk/conditional-reads.ts#conditionalReadFetch'],
  law: { statement: 'For every unsupported resource, non-GET, range request, or explicit caller validator, the opt-in cache preserves ordinary HTTP request and response semantics.', authority: 'Kyle Mathews (KyleAMathews), approved request-context isolation and transparent reads, 2026-11-18; conditionalReads is an opt-in SDK adapter.', limits: 'Native Fetch options and response bytes are observed at the transport boundary.' },
  histories: { arbitrary: fc.record({ kind: fc.constantFrom(...passthroughCases), slash: fc.boolean() }), runs: 20, fixedSeeds: [20261118], states: ['caller-validator', 'range-request', 'unsupported-target', 'non-get-request'], constructed: [
    { name: 'explicit-validator-response', enters: ['caller-validator'], build: h => ({ ...h, kind: 'explicit' as const }) },
    { name: 'range-response', enters: ['range-request'], build: h => ({ ...h, kind: 'range' as const }) },
    { name: 'external-target', enters: ['unsupported-target'], build: h => ({ ...h, kind: 'external' as const }) },
    { name: 'write-response', enters: ['non-get-request'], build: h => ({ ...h, kind: 'write' as const }) },
  ], fixed: passthroughCases.map(kind => ({ name: kind, history: { kind, slash: false } })) },
  // A bypassed request has the peer's raw status and bytes on every call. The
  // raw checkpoint also compares the original method and caller validator.
  model: plan => ({ result: Array.from({ length: 2 }, () => ({ status: plan.kind === 'explicit' ? 304 : 200, text: plan.kind === 'explicit' || plan.kind === 'head' ? '' : '{"wire":true}' })),
    methods: Array.from({ length: 2 }, () => plan.kind === 'head' ? 'HEAD' : plan.kind === 'options' ? 'OPTIONS' : plan.kind === 'write' ? 'POST' : 'GET'), validators: Array.from({ length: 2 }, () => plan.kind === 'explicit' ? 'caller-validator' : null) }),
  driver: async (plan, observe) => {
    try {
      const reach = driverReach(observe);
      const methods: string[] = [], validators: (string | null)[] = [];
      const transport = conditionalReadFetch(`https://oracle.test/api${plan.slash ? '/' : ''}`, async input => {
        const request = new Request(input); methods.push(request.method); validators.push(request.headers.get('if-none-match'));
        if (request.headers.get('if-none-match') === 'caller-validator') reach.add('caller-validator');
        if (request.headers.has('range')) reach.add('range-request');
        if (new URL(request.url).origin !== 'https://oracle.test' || new URL(request.url).pathname !== '/api/items/summary') reach.add('unsupported-target');
        if (request.method !== 'GET') reach.add('non-get-request');
        return plan.kind === 'explicit' ? new Response(null, { status: 304 }) : new Response(plan.kind === 'head' ? null : '{"wire":true}', { headers: { ETag: 'raw' } });
      });
      const url = plan.kind === 'external' ? 'https://outside.test/api/items/summary' : plan.kind === 'outside-mount' ? 'https://oracle.test/else/items/summary' : plan.kind === 'unknown' ? 'https://oracle.test/api/unknown' : plan.kind === 'authorizations' ? 'https://oracle.test/api/authorizations' : 'https://oracle.test/api/items/summary';
      const result = [];
      for (let i = 0; i < 2; i++) {
        const response = await transport(url, { method: plan.kind === 'head' ? 'HEAD' : plan.kind === 'options' ? 'OPTIONS' : plan.kind === 'write' ? 'POST' : 'GET', headers: plan.kind === 'range' ? { Range: 'bytes=0-1' } : plan.kind === 'explicit' ? { 'If-None-Match': 'caller-validator' } : {} });
        result.push({ status: response.status, text: await response.text() });
      }
      observe('raw', { result, methods, validators });
      reach.flush();
    } catch (error) { observe('unexpected-error', String(error)); }
  },
  check: (_plan, trace, expected) => differs('raw', 'request contexts', trace[0]?.value, expected) ?? pass,
  calibrations: [{ name: 'silently-interpreted-304', law: 'request contexts', history: { fixed: 'explicit' }, corrupt: trace => [{ ...trace[0], value: {} }] }],
});

import { conditionalOperation } from '../src/conditional-operation.ts';
import { failure, type OperationContext } from '../src/operation-types.ts';
const serverCases = ['stable', 'changed', 'during-load', 'context', 'failure', 'denied', 'invalid', 'write'] as const;
oracleProperty({
  id: 'private-validator-boundaries', work: { ratio: 1 }, owns: ['src/conditional-operation.ts#conditionalOperation'],
  law: { statement: 'For every private conditional read, only a stable dependency snapshot may skip content work; failures, writes, changed contexts and failed admission retain their ordinary results.', authority: 'Kyle Mathews (KyleAMathews), approved correct validators, paired entries and server-side revision optimization, 2026-11-18.', limits: 'Controlled database counters exercise the real operation runner; mounted authentication is a Worker receiving test.' },
  histories: { arbitrary: fc.record({ kind: fc.constantFrom(...serverCases), value: fc.nat(10000) }), runs: 25, fixedSeeds: [20261118], states: ['stable-shortcut', 'changed-dependencies', 'interrupted-snapshot', 'new-access-context', 'failed-handler', 'denied-admission', 'invalid-input', 'write-operation'], constructed: [
    ...serverCases.map(kind => ({ name: `server-${kind}`, enters: [{ stable: 'stable-shortcut', changed: 'changed-dependencies', 'during-load': 'interrupted-snapshot', context: 'new-access-context', failure: 'failed-handler', denied: 'denied-admission', invalid: 'invalid-input', write: 'write-operation' }[kind]], build: (h: { kind: typeof serverCases[number]; value: number }) => ({ ...h, kind }) })),
  ], fixed: serverCases.map(kind => ({ name: kind, history: { kind, value: 3 } })) },
  // The case input selects a stable snapshot, changed premise or failed
  // admission. The boundary checkpoint must preserve ordinary failures and
  // writes; only admitted unchanged bytes may produce a bodyless conditional.
  model: plan => ({ statuses: [plan.kind === 'failure' ? 404 : 200, plan.kind === 'denied' ? 403 : plan.kind === 'invalid' ? 400 : ['changed', 'during-load', 'failure', 'write'].includes(plan.kind) ? 200 : 304],
    loads: ['stable', 'denied', 'invalid'].includes(plan.kind) ? 1 : 2, secondEtag: !['denied', 'invalid', 'write'].includes(plan.kind), bodyless: ['stable', 'context'].includes(plan.kind), cache: ['denied', 'invalid', 'write'].includes(plan.kind) ? null : 'private, no-cache' }),
  driver: async (plan, observe) => {
    try {
      const reach = driverReach(observe);
      let revision = 0, loads = 0, value = plan.value, dependencyFailed = false;
      const db = { prepare: (sql: string) => ({ bind() { return this; }, first: async () => {
        if (dependencyFailed && sql.startsWith('SELECT epoch')) throw new Error('Dependency unavailable after failed handler');
        return sql.startsWith('SELECT epoch') ? { epoch: 'boundaries', ...Object.fromEntries(CHANGE_DOMAINS.map(domain => [domain, revision])) } : { admitted: true };
      } }) };
      const context: OperationContext = { env: { DB: db } as unknown as Env, url: 'https://oracle.test/api/summary', access: null, extensions: [], defer: () => {} };
      const definition: OperationDefinition = { route: { method: 'get', path: '/summary', operationId: 'getItemSummary', responses: {}, policy: readOperation() }, handler: async () => {
        loads++;
        if (plan.kind === 'failure' && loads === 1) { dependencyFailed = true; reach.add('failed-handler'); return failure('not-found', { error: 'missing' }); }
        const body = summary(value);
        if (plan.kind === 'during-load' && loads === 1) { revision++; value++; reach.add('interrupted-snapshot'); }
        return success(body);
      } };
      const input = { path: {}, query: {} };
      const first = await conditionalOperation(definition, input, context);
      dependencyFailed = false;
      if (plan.kind === 'changed') { revision++; value++; reach.add('changed-dependencies'); }
      if (plan.kind === 'context') { context.access = { clientId: 'other', userId: 'owner', scope: ['owner:read'] }; reach.add('new-access-context'); }
      if (plan.kind === 'denied') context.access = { clientId: 'denied', userId: 'owner', scope: [] };
      if (plan.kind === 'write') { definition.route.method = 'post'; reach.add('write-operation'); }
      const second = await conditionalOperation(definition, { ...input, ...(plan.kind === 'invalid' ? { inputFailure: failure('invalid-input', { error: 'invalid' }) } : {}) }, context, first.headers.ETag);
      observe('boundary', { statuses: [first.status, second.status], loads, secondEtag: Boolean(second.headers.ETag), bodyless: second.body === null, cache: second.headers['Cache-Control'] ?? null });
      if (loads === 1 && second.status === 304) reach.add('stable-shortcut');
      if (second.status === 403) reach.add('denied-admission');
      if (second.status === 400) reach.add('invalid-input');
      reach.flush();
    } catch (error) { observe('unexpected-error', String(error)); }
  },
  check: (_plan, trace, expected) => differs('boundary', 'correct validators', trace[0]?.value, expected) ?? pass,
  calibrations: [{ name: 'permission-bypassed', law: 'correct validators', history: { fixed: 'denied' }, corrupt: trace => [{ ...trace[0], value: {} }] }],
});

import { BlyggerApiError as CursorApiError } from '../sdk/dist/browser.js';
const pageFaults = ['none', 'expired-once', 'expired-always', 'other-code', 'no-body', 'string-body', 'no-code', 'other-status', 'plain', 'invalid-first', 'invalid-later'] as const;
const pageGrammar = fc.record({ value: fc.nat(1000), length: fc.integer({ min: 0, max: 6 }), offset: fc.nat(6), limit: fc.option(fc.nat(6), { nil: undefined }), revalidate: fc.boolean(), fault: fc.constantFrom(...pageFaults) });
// Preserve the named freshness/validation laws at the returned rows, accepted
// pages and rejected error. The parts are demand (empty/window witnesses),
// generation (expired-once), damage (invalid-first/later), transport failure
// (each other fault) and retry allowance (expired-always). First-page attempts
// expose a swallowed failure even when the final result still rejects. Error
// identity exposes a replacement error. These observations strengthen the
// existing check without changing the model's allowed results or retry rule.
// Numeric boundaries and listener retention have separate approved properties.
oracleProperty({
  id: 'cursor-windows-and-failures', work: { ratio: 1 }, owns: ['src/ui/cursor-query.ts#readCursorWindow'],
  law: { statement: 'For every bounded cursor demand, publish only validated rows from one generation, restart an expired acquisition once, preserve other errors, and answer an empty demand without requiring a read.', authority: 'Kyle Mathews (KyleAMathews), approved freshness and paired validated data laws, 2026-11-18; existing cursor-query contract restarts once and preserves errors.', limits: 'Controlled generation-bound cursors. Local windows use nonnegative integer offsets and limits.' },
  histories: { arbitrary: pageGrammar, runs: 30, fixedSeeds: [20261118], states: ['empty-without-read', 'continuation-page', 'restarted-generation', 'exhausted-restart', 'invalid-first-page', 'invalid-continuation-page', 'ordinary-error'], constructed: [
    { name: 'zero-demand', enters: ['empty-without-read'], build: h => ({ ...h, offset: 0, limit: 0 }) },
    { name: 'valid-continuation', enters: ['continuation-page'], build: h => ({ ...h, length: 4, offset: 0, limit: 4, fault: 'none' as const }) },
    { name: 'expire-and-recover', enters: ['restarted-generation'], build: h => ({ ...h, length: 4, offset: 0, limit: 4, fault: 'expired-once' as const }) },
    { name: 'expire-twice', enters: ['exhausted-restart'], build: h => ({ ...h, length: 4, offset: 0, limit: 4, fault: 'expired-always' as const }) },
    { name: 'damage-first-page', enters: ['invalid-first-page'], build: h => ({ ...h, length: 4, offset: 0, limit: 4, fault: 'invalid-first' as const }) },
    { name: 'damage-continuation', enters: ['invalid-continuation-page'], build: h => ({ ...h, length: 4, offset: 0, limit: 4, fault: 'invalid-later' as const }) },
    { name: 'ordinary-transport-error', enters: ['ordinary-error'], build: h => ({ ...h, length: 4, offset: 0, limit: 4, fault: 'plain' as const }) },
  ], fixed: [{ name: 'empty-demand', history: { value: 0, length: 1, offset: 0, limit: 0, revalidate: true, fault: 'invalid-first' as const } }, ...pageFaults.flatMap(fault => [false, true].map(revalidate => ({ name: `${fault}-${revalidate}`, history: { value: 2, length: 4, offset: 0, limit: 4, revalidate, fault } })))] },
  // Array slicing predicts the local window from input length and demand. One
  // expiry selects the second generation; other failures retain their identity.
  // The windows checkpoint also rejects invalid cached rows and excess restarts.
  model: plan => {
    const demandsRows = plan.limit !== 0;
    const later = plan.length > 1 && (plan.limit === undefined || plan.offset + plan.limit > 1);
    const fails = demandsRows && (plan.fault === 'plain' || plan.fault === 'invalid-first' && plan.length > 0 || later && !['none', 'expired-once'].includes(plan.fault));
    const start = plan.value + (later && plan.fault === 'expired-once' ? 100 : 0);
    const expires = later && ['expired-once', 'expired-always'].includes(plan.fault);
    return { result: fails ? 'rejected' : Array.from({ length: plan.length }, (_, i) => start + i).slice(plan.offset, plan.limit === undefined ? undefined : plan.offset + plan.limit),
      error: fails ? ['invalid-first', 'invalid-later'].includes(plan.fault) ? 'validation' : 'transport' : null,
      firstPages: demandsRows ? expires ? 2 : 1 : 0, badCached: false };
  },
  driver: async (plan, observe) => {
    try {
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
      const reach = driverReach(observe);
      let generation = 0, firstPages = 0, expiryAttempts = 0;
      const ordinary = plan.fault === 'plain' ? new Error('ordinary') : new CursorApiError(plan.fault === 'other-status' ? 500 : 409, plan.fault === 'no-body' ? null : plan.fault === 'string-body' ? 'body' : plan.fault === 'no-code' ? {} : { code: plan.fault === 'other-code' ? 'other' : 'cursor-expired' });
      const invalid = new Error('invalid wire rows');
      let result: unknown, error: string | null = null;
      try {
        result = await readCursorWindow({ queryClient, queryKey: ['windows', 'pages'], revalidate: plan.revalidate, signal: new AbortController().signal, window: { offset: plan.offset, limit: plan.limit },
          read: async cursor => {
            if (cursor === undefined) firstPages++;
            if (plan.fault === 'plain') { reach.add('ordinary-error'); throw ordinary; }
            const index = cursor === undefined ? 0 : Number(cursor.split(':')[1]);
            if (cursor) reach.add('continuation-page');
            if (cursor && plan.fault === 'expired-once' && generation === 0) { generation++; throw ordinary; }
            if (cursor && plan.fault === 'expired-always') expiryAttempts++;
            if (cursor && !['none', 'expired-once', 'invalid-first', 'invalid-later'].includes(plan.fault)) throw ordinary;
            const invalid = plan.fault === 'invalid-first' && !cursor || plan.fault === 'invalid-later' && Boolean(cursor);
            if (invalid && index < plan.length) reach.add(cursor === undefined ? 'invalid-first-page' : 'invalid-continuation-page');
            return { items: index >= plan.length ? [] : [invalid ? NaN : plan.value + generation * 100 + index], page: { limit: 1, nextCursor: index + 1 < plan.length ? `${generation}:${index + 1}` : null } };
          }, validate: page => { if (page.items.some(value => !Number.isFinite(value))) throw invalid; },
        });
      } catch (caught) { result = 'rejected'; error = caught === ordinary ? 'transport' : caught === invalid ? 'validation' : `unexpected: ${String(caught)}`; }
      const badCached = queryClient.getQueryCache().getAll().some(query => (query.state.data as { pages?: { rows: number[] }[] } | undefined)?.pages?.some(page => page.rows.some(value => !Number.isFinite(value))) ?? false);
      queryClient.clear();
      observe('windows', { result, error, firstPages, badCached });
      if (plan.limit === 0 && firstPages === 0 && Array.isArray(result)) reach.add('empty-without-read');
      if (generation > 0 && firstPages === 2 && Array.isArray(result)) reach.add('restarted-generation');
      if (expiryAttempts === 2) reach.add('exhausted-restart');
      reach.flush();
    } catch (error) { observe('unexpected-error', String(error)); }
  },
  check: (_plan, trace, expected) => differs('windows', 'fresh validated sequence', trace[0]?.value, expected) ?? pass,
  calibrations: [{ name: 'mixed-prefix', law: 'fresh validated sequence', history: { fixed: 'expired-once-true' }, corrupt: trace => [{ ...trace[0], value: { ...(trace[0].value as object), result: [2, 103, 104, 105] } }] }],
});

// Expiry recovery belongs to the failed sequence. Removing it must not
// cancel a different sequence whose public key happens to share its prefix.
oracleProperty({
  id: 'cursor-expiry-isolation', owns: ['src/ui/cursor-query.ts#readCursorWindow'],
  law: { statement: 'For every expired cursor sequence, restarting from a fresh first page preserves active readers of independent sequences.', authority: 'Kyle Mathews (KyleAMathews), approved freshness and independent cancellation laws, 2026-11-18.', limits: 'One expired unversioned acquisition and one concurrent related key, with a controlled transport.' },
  histories: { arbitrary: fc.record({ first: fc.boolean(), prefix: fc.boolean(), value: fc.nat(1000) }), runs: 15, fixedSeeds: [20261118], states: ['restart-with-first-page-peer', 'restart-with-continuation-peer', 'prefix-peer', 'sibling-peer'], constructed: [
    ...[false, true].map(first => ({ name: `restart-with-${first ? 'first' : 'continuation'}`, enters: [`restart-with-${first ? 'first-page' : 'continuation'}-peer`, first ? 'sibling-peer' : 'prefix-peer'], build: (h: { first: boolean; prefix: boolean; value: number }) => ({ ...h, first, prefix: !first }) })),
  ], fixed: [false, true].flatMap(first => [false, true].map(prefix => ({ name: `${prefix ? 'prefix' : 'sibling'}-${first ? 'first' : 'continuation'}`, history: { first, prefix, value: 1 } }))) },
  // Only the expired source changes to generation +100. The unrelated peer
  // keeps +10 rows and its live signal at the expiry-isolation checkpoint.
  model: plan => ({ restarted: [plan.value + 100, plan.value + 101], peer: [plan.value + 10, plan.value + 11], aborted: false }),
  driver: async (plan, observe) => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
    const entered = deferred<void>(), release = deferred<void>();
    try {
      let transport: AbortSignal | undefined, generation = 0, peerPage: 'first-page' | 'continuation' | undefined;
      const peer = readCursorWindow({ queryClient, queryKey: plan.prefix ? ['expiry', 'pages', 'child'] : ['expiry', 'other'], window: { limit: 2 }, signal: new AbortController().signal, read: async (cursor, signal) => {
        if (plan.first === (cursor === undefined)) { transport = signal; peerPage = cursor === undefined ? 'first-page' : 'continuation'; entered.resolve(); await release.promise; }
        return { items: [plan.value + 10 + (cursor ? 1 : 0)], page: { limit: 1, nextCursor: cursor ? null : 'next' } };
      } }).catch(() => 'rejected');
      await Promise.race([entered.promise, peer.then(result => { throw new Error(`Peer settled before controlled transport: ${JSON.stringify(result)}`); })]);
      const restarted = await readCursorWindow({ queryClient, queryKey: ['expiry', 'pages'], window: { limit: 2 }, signal: new AbortController().signal, read: async cursor => {
        if (cursor && generation === 0) { generation++; throw new CursorApiError(409, { code: 'cursor-expired' }); }
        return { items: [plan.value + generation * 100 + (cursor ? 1 : 0)], page: { limit: 1, nextCursor: cursor ? null : 'next' } };
      } }).catch(() => 'rejected');
      const aborted = transport?.aborted;
      release.resolve();
      observe('expiry-isolation', { restarted, peer: await peer, aborted });
      if (generation === 1 && peerPage && transport) {
        observe('reach', `restart-with-${peerPage}-peer`);
        const peerKey = queryClient.getQueryCache().getAll().some(query => query.queryKey[2] === 'child');
        observe('reach', peerKey ? 'prefix-peer' : 'sibling-peer');
      }
    } catch (error) { observe('unexpected-error', String(error)); }
    finally { release.resolve(); queryClient.clear(); }
  },
  check: (_plan, trace, expected) => differs('expiry-isolation', 'freshness and independent cancellation', trace[0]?.value, expected) ?? pass,
  calibrations: [{ name: 'restart-cancels-peer', law: 'freshness and independent cancellation', history: { fixed: 'prefix-continuation' }, corrupt: trace => [{ ...trace[0], value: { ...(trace[0].value as object), aborted: true } }] }],
});

// Three overlapping reads distinguish an older confirmation from a newer one:
// confirming the current bytes must never move their acceptance order backward.
oracleProperty({
  id: 'late-confirmation-order', work: { ratio: 1.02 }, owns: ['sdk/conditional-reads.ts#conditionalReadFetch'],
  law: { statement: 'For every overlapping read, an older confirmation cannot lower the freshness of a newer accepted representation or let an intervening response replace it.', authority: 'Decision by Kyle Mathews (GitHub KyleAMathews), 2026-11-18: earlier responses cannot overwrite newer accepted data.', limits: 'Three controlled in-flight reads, one client and one request context.' },
  histories: { arbitrary: fc.record({ value: fc.nat(10000), validatorHeader: fc.boolean() }), runs: 25, fixedSeeds: [20261118], states: ['tagged-older-confirmation', 'headerless-older-confirmation', 'intervening-body-after-confirmation'], constructed: [
    ...[false, true].map(validatorHeader => ({ name: `older-confirmation-${validatorHeader ? 'tagged' : 'headerless'}`, enters: [validatorHeader ? 'tagged-older-confirmation' : 'headerless-older-confirmation', 'intervening-body-after-confirmation'], build: (h: { value: number; validatorHeader: boolean }) => ({ ...h, validatorHeader }) })),
  ], fixed: [{ name: 'older-confirmation-before-middle-body', history: { value: 1, validatorHeader: true } }] },
  // The third read accepts value +1 first. Neither an older confirmation nor
  // the intervening old body can change it; ordered compares all three returns
  // and the validator observed by the following request.
  model: plan => ({ values: Array.from({ length: 3 }, () => summary(plan.value + 1)), validator: tag(plan.value + 1) }),
  driver: async (plan, observe) => {
    try {
      const firstEntered = deferred<void>(), secondEntered = deferred<void>();
      const firstGate = deferred<Response>(), secondGate = deferred<Response>();
      const reach = driverReach(observe);
      let calls = 0, validator: string | null = null;
      const client = createBlyggerClient({ baseUrl: 'https://oracle.test/api', conditionalReads: true, fetch: async input => {
        const request = input instanceof Request ? input : new Request(input);
        validator = request.headers.get('if-none-match');
        switch (++calls) {
          case 1: return Response.json(summary(plan.value), { headers: { ETag: tag(plan.value) } });
          case 2: firstEntered.resolve(); return firstGate.promise;
          case 3: secondEntered.resolve(); return secondGate.promise;
          default: return Response.json(summary(plan.value + 1), { headers: { ETag: tag(plan.value + 1) } });
        }
      } });
      const read = () => unwrap(BlyggerApi.getItemSummary({ client })).catch(() => 'rejected');
      await read();
      const first = read(); await firstEntered.promise;
      const second = read(); await secondEntered.promise;
      const third = await read();
      const confirmation = new Response(null, { status: 304, headers: plan.validatorHeader ? { ETag: tag(plan.value) } : {} });
      firstGate.resolve(confirmation);
      const confirmed = await first;
      reach.add(confirmation.headers.has('etag') ? 'tagged-older-confirmation' : 'headerless-older-confirmation');
      secondGate.resolve(Response.json(summary(plan.value), { headers: { ETag: tag(plan.value) } }));
      const middle = await second;
      reach.add('intervening-body-after-confirmation');
      await read();
      observe('ordered', { values: [confirmed, middle, third], validator });
      reach.flush();
    } catch (error) { observe('unexpected-error', String(error)); }
  },
  check: (_plan, trace, expected) => differs('ordered', 'freshness after writes', trace[0]?.value, expected) ?? pass,
  calibrations: [{ name: 'middle-body-replaces-newer-data', law: 'freshness after writes', history: { fixed: 'older-confirmation-before-middle-body' }, corrupt: trace => [{ ...trace[0], value: {} }] }],
});

// At the same freshness checkpoint, unrelated contexts are cache pressure, not
// permission to accept an older answer. The model needs just the newer accepted
// body and whether it has a validator. It allows cache eviction (no validator on
// the next read), while rejecting an old body or an old validator resurfacing.
// Both 200 completion and 304 confirmation cross that pressure boundary.
oracleProperty({
  id: 'conditional-eviction-order', owns: ['sdk/conditional-reads.ts#conditionalReadFetch'],
  law: { statement: 'For every overlapping read, unrelated cache activity cannot let an older response replace a newer accepted representation.', authority: 'Decision by Kyle Mathews (GitHub KyleAMathews), 2026-11-18: earlier responses cannot overwrite newer accepted data.', limits: 'Controlled HTTP peer; cache eviction and capacity are allowed to vary. Histories sample pressure around the present capacity, without prescribing that capacity.' },
  histories: { enumerated: [499, 500, 501].flatMap(pressure => [false, true].flatMap(confirmation => [false, true].map(untagged => ({ pressure, confirmation, untagged })))), states: ['late-body', 'late-confirmation', 'newer-untagged'] },
  // The newer value remains authoritative while an older reader is active,
  // regardless of reusable-cache eviction. Untagged newer data cannot restore
  // the old pair. The evicted checkpoint permits either a fresh tag or eviction.
  model: plan => ({ late: plan.untagged ? 'rejected' : summary(2), freshValidator: true }),
  driver: async (plan, observe) => {
    try {
      const entered = deferred<void>(), release = deferred<Response>();
      let calls = 0, validator: string | null = null;
      const client = createBlyggerClient({ baseUrl: 'https://oracle.test/api', conditionalReads: true, fetch: async input => {
        const request = input instanceof Request ? input : new Request(input);
        if (request.headers.has('x-fill')) return Response.json(summary(9), { headers: { ETag: '"filler"' } });
        validator = request.headers.get('if-none-match');
        if (++calls === 2) { entered.resolve(); return release.promise; }
        const value = calls === 1 ? 1 : 2;
        return Response.json(summary(value), { headers: calls > 1 && plan.untagged ? {} : { ETag: tag(value) } });
      } });
      const read = (headers?: Record<string, string>) => unwrap(BlyggerApi.getItemSummary({ client, headers }));
      await read();
      const older = read().catch(() => 'rejected'); await entered.promise;
      await read();
      for (let i = 0; i < plan.pressure; i++) await read({ 'x-fill': String(i) });
      release.resolve(plan.confirmation ? new Response(null, { status: 304, headers: { ETag: tag(1) } }) : Response.json(summary(1), { headers: { ETag: tag(1) } }));
      const late = await older;
      await read();
      observe('reach', plan.confirmation ? 'late-confirmation' : 'late-body');
      if (plan.untagged) observe('reach', 'newer-untagged');
      observe('evicted', { late, freshValidator: validator === null || !plan.untagged && validator === tag(2) });
    } catch (error) { observe('unexpected-error', String(error)); }
  },
  check: (_plan, trace, expected) => differs('evicted', 'freshness after writes', trace.find(o => o.checkpoint === 'evicted')?.value, expected) ?? pass,
  calibrations: [{ name: 'evicted-newer-value-forgotten', law: 'freshness after writes', history: { enumerated: 4 }, corrupt: trace => trace.map(o => o.checkpoint === 'evicted' ? { ...o, value: { late: summary(1), freshValidator: false } } : o) }],
});

// Window legality follows the numeric domain, including NaN, signed zero and
// infinities. Model it from integer arithmetic, separately from the adapter's
// validation predicates. Abortion wins even for zero or invalid demand.
const numericWindow = fc.record({ offset: fc.option(fc.double(), { nil: undefined }), limit: fc.option(fc.double(), { nil: undefined }), aborted: fc.boolean(), revalidate: fc.boolean(), value: fc.nat(1000) });
oracleProperty({
  id: 'cursor-window-boundaries', owns: ['src/ui/cursor-query.ts#readCursorWindow'],
  law: { statement: 'For every numeric window, reject pre-aborted readers with their original reason before transport, otherwise reject invalid offsets, limits or overflow with RangeError before transport; valid empty demand returns no rows without reading.', authority: 'Decision by Kyle Mathews (GitHub KyleAMathews), 2026-11-18: pre-aborted calls reject before transport; invalid numeric windows reject RangeError before transport.', limits: 'Numbers and omitted bounds. The controlled source has one row and no continuation.' },
  histories: { arbitrary: numericWindow, runs: 30, fixedSeeds: [20261118], states: ['pre-aborted-window', 'invalid-offset', 'invalid-limit', 'sum-overflow', 'empty-valid-window', 'valid-window-read'], constructed: [
    { name: 'abort-before-empty-demand', enters: ['pre-aborted-window'], build: h => ({ ...h, aborted: true, offset: 0, limit: 0 }) },
    { name: 'non-finite-offset', enters: ['invalid-offset'], build: h => ({ ...h, aborted: false, offset: NaN, limit: 1 }) },
    { name: 'fractional-limit', enters: ['invalid-limit'], build: h => ({ ...h, aborted: false, offset: 0, limit: .5 }) },
    { name: 'safe-sum-overflow', enters: ['sum-overflow'], build: h => ({ ...h, aborted: false, offset: Number.MAX_SAFE_INTEGER, limit: 1 }) },
    { name: 'empty-valid-demand', enters: ['empty-valid-window'], build: h => ({ ...h, aborted: false, offset: 0, limit: 0 }) },
    { name: 'one-valid-row', enters: ['valid-window-read'], build: h => ({ ...h, aborted: false, offset: 0, limit: 1 }) },
  ], fixed: [
    ...[NaN, Infinity, -Infinity, -1, .5, Number.MAX_SAFE_INTEGER + 1].flatMap(invalid => [true, false].map(offset => ({ name: `${offset ? 'offset' : 'limit'}-${String(invalid)}`, history: { offset: offset ? invalid : 0, limit: offset ? 1 : invalid, aborted: false, revalidate: true, value: 1 } }))),
    { name: 'sum-overflow', history: { offset: Number.MAX_SAFE_INTEGER, limit: 1, aborted: false, revalidate: true, value: 1 } },
    ...[undefined, 0, -0, 1, Number.MAX_SAFE_INTEGER].map(offset => ({ name: `valid-offset-${String(offset)}-${Object.is(offset, -0)}`, history: { offset, limit: undefined, aborted: false, revalidate: true, value: 1 } })),
    { name: 'pre-aborted-empty', history: { offset: 0, limit: 0, aborted: true, revalidate: false, value: 1 } },
  ] },
  // Integer arithmetic defines legal demand independently of adapter checks.
  // Abortion takes priority; otherwise invalid demand fails before acquisition.
  // The window-boundary checkpoint pairs the result with the physical read count.
  model: plan => {
    const offset = plan.offset ?? 0;
    const integer = (n: number) => n >= 0 && n <= 2 ** 53 - 1 && Math.floor(n) === n;
    const valid = integer(offset) && (plan.limit === undefined || integer(plan.limit) && integer(offset + plan.limit));
    const result = plan.aborted ? 'aborted' : !valid ? 'invalid' : [plan.value].slice(offset, plan.limit === undefined ? undefined : offset + plan.limit);
    return { result, calls: plan.aborted || !valid || plan.limit === 0 ? 0 : 1 };
  },
  driver: async (plan, observe) => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
    try {
      const controller = new AbortController(), reason = { value: plan.value };
      if (plan.aborted) controller.abort(reason);
      let calls = 0;
      const result = await readCursorWindow({ queryClient, queryKey: ['numeric-window'], signal: controller.signal, window: { offset: plan.offset, limit: plan.limit }, revalidate: plan.revalidate,
        read: async () => { calls++; return { items: [plan.value], page: { limit: 1, nextCursor: null } }; },
      }).catch(error => error === reason ? 'aborted' : error instanceof RangeError ? 'invalid' : `unexpected: ${String(error)}`);
      observe('window-boundary', { result, calls });
      if (controller.signal.aborted && result === 'aborted' && calls === 0) observe('reach', 'pre-aborted-window');
      if (result === 'invalid' && calls === 0) {
        if (!Number.isSafeInteger(plan.offset ?? 0) || (plan.offset ?? 0) < 0) observe('reach', 'invalid-offset');
        else if (plan.limit !== undefined && (!Number.isSafeInteger(plan.limit) || plan.limit < 0)) observe('reach', 'invalid-limit');
        else observe('reach', 'sum-overflow');
      }
      if (Array.isArray(result) && plan.limit === 0 && calls === 0) observe('reach', 'empty-valid-window');
      if (Array.isArray(result) && calls === 1) observe('reach', 'valid-window-read');
    } finally { queryClient.clear(); }
  },
  check: (_plan, trace, expected) => differs('window-boundary', 'numeric windows and pre-aborted reads', trace[0]?.value, expected) ?? pass,
  calibrations: [{ name: 'transport-before-validation', law: 'numeric windows and pre-aborted reads', history: { fixed: 'sum-overflow' }, corrupt: trace => [{ ...trace[0], value: { ...(trace[0].value as object), calls: 1 } }] }],
});

oracleProperty({
  id: 'eligible-pre-aborted-reads', owns: ['sdk/conditional-reads.ts#conditionalReadFetch', 'src/ui/read-batch.ts#createReadBatchFetch'],
  law: { statement: 'For every eligible pre-aborted SDK or batch read, reject with the original signal reason before invoking transport.', authority: 'Decision by Kyle Mathews (GitHub KyleAMathews), 2026-11-18: pre-aborted eligible reads reject with their original reason before transport.', limits: 'Eligible resource GETs. Unsupported request passthrough retains its fetch transport semantics.' },
  histories: { arbitrary: fc.record({ batch: fc.boolean(), value: fc.nat(1000) }), runs: 15, fixedSeeds: [20261118], states: ['sdk-aborted-before-transport', 'batch-aborted-before-transport'], constructed: [
    ...[false, true].map(batch => ({ name: `pre-aborted-${batch ? 'batch' : 'sdk'}`, enters: [`${batch ? 'batch' : 'sdk'}-aborted-before-transport`], build: (h: { batch: boolean; value: number }) => ({ ...h, batch }) })),
  ], fixed: [false, true].map(batch => ({ name: batch ? 'batch' : 'sdk', history: { batch, value: 1 } })) },
  // The signal is already aborted before entry, so the pre-aborted checkpoint
  // owes its exact reason and settlement without any physical transport call.
  model: () => ({ originalReason: true, settled: true, calls: 0 }),
  driver: async (plan, observe) => {
    let calls = 0;
    const fetcher = async () => { calls++; return Response.json(summary(plan.value)); };
    const transport = plan.batch ? createReadBatchFetch('https://oracle.test/api', fetcher) : conditionalReadFetch('https://oracle.test/api', fetcher);
    const controller = new AbortController(), reason = { value: plan.value };
    controller.abort(reason);
    let originalReason = false, settled = false;
    void Promise.resolve().then(() => transport(`https://oracle.test/api/items/${plan.batch ? 'known' : 'summary'}`, { signal: controller.signal })).then(() => { settled = true; }, error => { settled = true; originalReason = error === reason; });
    // Inspect the next fair event-loop task after promise jobs have drained.
    // A missing reject callback remains observable without hanging the driver.
    await new Promise<void>(resolve => setImmediate(resolve));
    observe('pre-aborted', { originalReason, settled, calls });
    if (controller.signal.aborted && settled && originalReason && calls === 0) observe('reach', `${plan.batch ? 'batch' : 'sdk'}-aborted-before-transport`);
  },
  check: (_plan, trace, expected) => differs('pre-aborted', 'pre-aborted reads', trace[0]?.value, expected) ?? pass,
  calibrations: [{ name: 'starts-transport', law: 'pre-aborted reads', history: { fixed: 'sdk' }, corrupt: trace => [{ ...trace[0], value: { ...(trace[0].value as object), calls: 1 } }] }],
});

// Installation order is an independent list, not the cache's Map. Completing
// every read before pressure makes a leaked pending reference distinguishable
// from a still-live reader's permitted retained acceptance.
const cachePressure = fc.record({ pressure: fc.integer({ min: 499, max: 501 }), touch: fc.boolean(), value: fc.nat(1000) });
oracleProperty({
  id: 'sdk-bounded-retention', work: { ratio: 1 }, owns: ['sdk/conditional-reads.ts#conditionalReadFetch'],
  law: { statement: 'For every settled read history, reusable SDK representations follow refreshed installation order within 500 contexts, without retaining completed readers outside that cache.', authority: 'Decision by Kyle Mathews (GitHub KyleAMathews), 2026-11-18: at most 500 reusable SDK representations, reinstalling refreshes eviction order, pending references released after final reader settlement.', limits: 'Sequential valid responses; active overlaps remain covered by conditional-eviction-order. The work bound preserves useful retained entries up to the bound.' },
  histories: { arbitrary: cachePressure, runs: 4, fixedSeeds: [20261118], states: ['settled-contexts-499', 'settled-contexts-500', 'settled-contexts-501', 'reinstalled-at-capacity'], constructed: [
    { name: 'refresh-at-sdk-capacity', enters: ['settled-contexts-499', 'settled-contexts-500', 'reinstalled-at-capacity'], build: h => ({ ...h, pressure: 500, touch: true }) },
    { name: 'cross-sdk-capacity', enters: ['settled-contexts-501'], build: h => ({ ...h, pressure: 501, touch: false }) },
  ], fixed: [499, 500, 501].flatMap(pressure => [false, true].map(touch => ({ name: `${pressure}-${touch}`, history: { pressure, touch, value: 1 } }))) },
  resolve: history => ({ ...history, requests: [0, ...Array.from({ length: history.pressure - 1 }, (_, i) => i + 1), ...(history.touch ? [0] : []), history.pressure, 0, 1, history.pressure] }),
  // A simple installation list retains the latest five hundred contexts.
  // Reinstallation moves a key to the tail; retained compares validators on
  // later physical requests, exposing both eviction and stale pending references.
  model: plan => {
    let installed: number[] = [];
    return plan.requests.map(key => {
      const validator = installed.includes(key) ? tag(plan.value + key) : null;
      installed = [...installed.filter(entry => entry !== key), key].slice(-500);
      return validator;
    }).slice(-3);
  },
  driver: async (plan, observe) => {
    const reach = driverReach(observe), settledKeys = new Set<number>();
    const validators: (string | null)[] = [];
    const fetcher = conditionalReadFetch('https://oracle.test/api', async input => {
      const request = input instanceof Request ? input : new Request(input);
      const value = plan.value + Number(new URL(request.url).searchParams.get('key'));
      const validator = request.headers.get('if-none-match');
      validators.push(validator);
      return validator === tag(value) ? new Response(null, { status: 304, headers: { ETag: tag(value) } }) : Response.json(summary(value), { headers: { ETag: tag(value) } });
    });
    for (const key of plan.requests) {
      const reinstallAtCapacity = settledKeys.size === 500 && settledKeys.has(key);
      await fetcher(`https://oracle.test/api/items/summary?key=${key}`);
      settledKeys.add(key);
      if ([499, 500, 501].includes(settledKeys.size)) reach.add(`settled-contexts-${settledKeys.size}`);
      if (reinstallAtCapacity && validators.at(-1) !== null) reach.add('reinstalled-at-capacity');
    }
    observe('retained', validators.slice(-3));
    reach.flush();
  },
  check: (_plan, trace, expected) => differs('retained', 'bounded retention and cleanup', trace[0]?.value, expected) ?? pass,
  calibrations: [{ name: 'retains-evicted-context', law: 'bounded retention and cleanup', history: { fixed: '500-false' }, corrupt: trace => [{ ...trace[0], value: ['retained', 'retained', 'retained'] }] }],
});

const stampPressure = fc.record({ pressure: fc.integer({ min: 999, max: 1001 }), touch: fc.constantFrom('none', 'shortcut', 'reinstall'), value: fc.nat(1000) });
type StampRequest = { key: number; conditional: boolean };
type StampAnswer = { load: boolean; status: number };
// A deterministic policy is a checker control, separate from the allowed-set
// model below. Refreshing shortcut hits is legal; the other switches supply
// hostile controls for excess capacity and failed installation refresh.
function stampPolicyTrace(requests: StampRequest[], capacity: number, refreshShortcut: boolean, refreshInstallation: boolean): StampAnswer[] {
  let order: number[] = [];
  const seen = new Set<number>(), answers: StampAnswer[] = [];
  for (const { key, conditional } of requests) {
    const present = order.includes(key), load = !conditional || !present;
    answers.push({ load, status: conditional && seen.has(key) ? 304 : 200 });
    if (load && (!present || refreshInstallation) || !load && refreshShortcut) order = [...order.filter(entry => entry !== key), key].slice(-capacity);
    seen.add(key);
  }
  return answers.slice(-3);
}
function checkStampChoices(checkpoint: string, actual: unknown, allowed: StampAnswer[][]) {
  if (allowed.some(answer => differs(checkpoint, 'bounded validator stamps', actual, answer) === undefined)) return pass;
  return violation(checkpoint, 'stamp outcomes do not match any allowed shortcut policy', 'bounded validator stamps', { actual, expected: allowed });
}
oracleProperty({
  id: 'server-bounded-stamps', work: { ratio: 1 }, owns: ['src/conditional-operation.ts#conditionalOperation'],
  law: { statement: 'For every server validator history, retain at most 1000 stamps in refreshed installation order; an evicted stamp requires loading before a conditional result, while shortcut 304s need not refresh order.', authority: 'Decision by Kyle Mathews (GitHub KyleAMathews), 2026-11-18: at most 1000 server validator stamps, reinstalling refreshes eviction order; shortcut 304s may keep current order.', limits: 'Stable dependencies and one database. Conditional requests keep the previously received exact ETag even after stamp eviction. The work bound preserves useful installed stamps.' },
  histories: { arbitrary: stampPressure, runs: 3, fixedSeeds: [20261118], states: ['loaded-contexts-999', 'loaded-contexts-1000', 'loaded-contexts-1001', 'shortcut-at-capacity', 'reinstalled-at-capacity'], constructed: [
    { name: 'shortcut-at-server-capacity', enters: ['loaded-contexts-999', 'loaded-contexts-1000', 'shortcut-at-capacity'], build: h => ({ ...h, pressure: 1000, touch: 'shortcut' as const }) },
    { name: 'refresh-at-server-capacity', enters: ['reinstalled-at-capacity'], build: h => ({ ...h, pressure: 1000, touch: 'reinstall' as const }) },
    { name: 'cross-server-capacity', enters: ['loaded-contexts-1001'], build: h => ({ ...h, pressure: 1001, touch: 'none' as const }) },
  ], fixed: [999, 1000, 1001].flatMap(pressure => ['none', 'shortcut', 'reinstall'].map(touch => ({ name: `${pressure}-${touch}`, history: { pressure, touch, value: 1 } }))) },
  resolve: history => ({ ...history, requests: [{ key: 0, conditional: true }, ...Array.from({ length: history.pressure - 1 }, (_, i) => ({ key: i + 1, conditional: true })), ...(history.touch === 'none' ? [] : [{ key: 0, conditional: history.touch !== 'reinstall' }]), { key: history.pressure, conditional: true }, ...[0, 1, history.pressure].map(key => ({ key, conditional: true }))] }),
  // Each bounded installation list predicts content work. A shortcut hit may
  // keep its position or move to the tail; installation always moves it. Keep
  // complete possible traces, so the check cannot combine incompatible choices.
  // Exact previously seen bytes still permit 304 after an evicted key reloads.
  model: plan => {
    let choices: { installed: number[]; answers: StampAnswer[] }[] = [{ installed: [], answers: [] }];
    const seen = new Set<number>();
    for (const { key, conditional } of plan.requests) {
      const status = conditional && seen.has(key) ? 304 : 200;
      const next = choices.flatMap(({ installed, answers }) => {
        const load = !conditional || !installed.includes(key);
        const refreshed = [...installed.filter(entry => entry !== key), key].slice(-1000);
        const suffix = [...answers, { load, status }].slice(-3);
        return (load ? [refreshed] : [installed, refreshed]).map(order => ({ installed: order, answers: suffix }));
      });
      choices = next.length === 1 ? next : [...new Map(next.map(choice => [JSON.stringify(choice), choice])).values()];
      seen.add(key);
    }
    return [...new Map(choices.map(choice => [JSON.stringify(choice.answers), choice.answers])).values()];
  },
  driver: async (plan, observe) => {
    const db = { prepare: (sql: string) => ({ bind() { return this; }, first: async () => sql.startsWith('SELECT epoch') ? { epoch: 'retention', ...Object.fromEntries(CHANGE_DOMAINS.map(domain => [domain, 0])) } : { admitted: true } }) };
    const reach = driverReach(observe), loadedKeys = new Set<number>();
    let loads = 0;
    const definition = { route: { method: 'get', operationId: 'getItemSummary', path: '/summary', responses: {}, policy: readOperation() }, handler: async () => { loads++; return success(summary(plan.value)); } } as OperationDefinition;
    const context: OperationContext = { env: { DB: db } as unknown as Env, url: '', access: null, extensions: [], defer: () => {} };
    const tags = new Map<number, string>();
    const answers = [];
    for (const { key, conditional } of plan.requests) {
      context.url = `https://oracle.test/api/summary?key=${key}`;
      const before = loads;
      const revisitAtCapacity = loadedKeys.size === 1000 && loadedKeys.has(key);
      const response = await conditionalOperation(definition, { path: {}, query: {} }, context, conditional ? tags.get(key) : undefined);
      if (loads > before) loadedKeys.add(key);
      if ([999, 1000, 1001].includes(loadedKeys.size)) reach.add(`loaded-contexts-${loadedKeys.size}`);
      if (revisitAtCapacity && loads === before && response.status === 304) reach.add('shortcut-at-capacity');
      if (revisitAtCapacity && !conditional && loads > before) reach.add('reinstalled-at-capacity');
      tags.set(key, response.headers.ETag);
      answers.push({ load: loads > before, status: response.status });
    }
    observe('stamps', answers.slice(-3));
    reach.flush();
  },
  check: (plan, trace, expected) => {
    // Positive checker control: the contract permits refreshing every shortcut.
    // Rejecting that complete policy would overconstrain the approved freedom.
    const control = checkStampChoices('shortcut-refresh-control', stampPolicyTrace(plan.requests, 1000, true, true), expected);
    return control.kind === 'violation' ? control : checkStampChoices('stamps', trace[0]?.value, expected);
  },
  calibrations: [
    { name: 'reuses-evicted-stamp', law: 'bounded validator stamps', history: { fixed: '1000-none' }, corrupt: trace => [{ ...trace[0], value: [{ load: false, status: 304 }] }] },
    { name: 'retains-1001-stamps', law: 'bounded validator stamps', history: { fixed: '1000-none' }, corrupt: (trace, plan) => [{ ...trace[0], value: stampPolicyTrace(plan.requests, 1001, false, true) }] },
    { name: 'reinstall-keeps-old-position', law: 'bounded validator stamps', history: { fixed: '1000-reinstall' }, corrupt: (trace, plan) => [{ ...trace[0], value: stampPolicyTrace(plan.requests, 1000, false, false) }] },
  ],
});

import { getEventListeners } from 'node:events';
import { withOracleCleanup } from '../test/oracle-cleanup.ts';
oracleProperty({
  id: 'cursor-reader-listener-cleanup', owns: ['src/ui/cursor-query.ts#readCursorWindow'],
  law: { statement: 'For every settled cursor reader, release its pending read references and abort listeners even while an active peer keeps their shared transport pending.', authority: 'Decision by Kyle Mathews (GitHub KyleAMathews), 2026-11-18: settled readers release pending references and abort listeners; independent cancellation leaves active peers running.', limits: 'Native AbortSignals inspected through node:events and read-owned QueryCache subscriptions counted relative to a retained provider listener; controlled transport can remain pending after cancellation.' },
  histories: { arbitrary: fc.record({ first: fc.boolean(), peer: fc.boolean(), cancel: fc.boolean(), value: fc.nat(1000) }), runs: 12, fixedSeeds: [20261118], states: ['settled-first-page-reader', 'settled-continuation-reader', 'cancelled-with-active-peer', 'completed-reader', 'cancelled-final-reader'], constructed: [
    { name: 'cancel-first-with-peer', enters: ['settled-first-page-reader', 'cancelled-with-active-peer'], build: h => ({ ...h, first: true, peer: true, cancel: true }) },
    { name: 'cancel-continuation-with-peer', enters: ['settled-continuation-reader', 'cancelled-with-active-peer'], build: h => ({ ...h, first: false, peer: true, cancel: true }) },
    { name: 'complete-reader', enters: ['completed-reader'], build: h => ({ ...h, first: false, peer: false, cancel: false }) },
    { name: 'cancel-last-reader', enters: ['cancelled-final-reader'], build: h => ({ ...h, first: false, peer: false, cancel: true }) },
  ], fixed: [false, true].flatMap(first => [false, true].flatMap(peer => [false, true].map(cancel => ({ name: `${first ? 'first' : 'continuation'}-${peer ? 'peer' : 'alone'}-${cancel ? 'cancel' : 'complete'}`, history: { first, peer, cancel, value: 1 } })))) },
  // A settled reader owns no abort callback, even while a peer remains active.
  // The listeners checkpoint captures the actual listener inventory before
  // releasing any withheld peer, then compares that peer's independent result.
  // After the peer also settles, no read-owned cache subscription may remain;
  // an existing provider subscription must remain installed.
  model: plan => ({ cancelled: plan.cancel ? 'rejected' : 'fulfilled', listeners: 0, peer: plan.peer ? [plan.value, plan.value + 1] : null, queryListeners: 0 }),
  driver: async (plan, observe) => {
    class CountedCache extends QueryCache { count() { return this.listeners.size; } }
    const cache = new CountedCache(), provider = cache.subscribe(() => {}), baseline = cache.count();
    const queryClient = new QueryClient({ queryCache: cache, defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
    const entered = deferred<void>(), release = deferred<void>(), joined = deferred<void>();
    let startingPeer = false, acquiredPage: 'first-page' | 'continuation' | undefined, released = false;
    queryClient.defaultQueryOptions = new Proxy(queryClient.defaultQueryOptions, { apply(target, receiver, args) {
      if (startingPeer && typeof args[0].queryFn === 'function' && args[0].queryKey?.at(-1) !== 'first-source') joined.resolve();
      return Reflect.apply(target, receiver, args);
    } });
    await withOracleCleanup(async () => { try {
      const options = { queryClient, queryKey: ['listener-cleanup'], revalidate: true, window: { limit: 2 }, read: async (cursor: string | undefined) => {
        if (plan.first === (cursor === undefined)) { acquiredPage = cursor === undefined ? 'first-page' : 'continuation'; entered.resolve(); await release.promise; }
        return { items: [plan.value + (cursor ? 1 : 0)], page: { limit: 1, nextCursor: cursor ? null : 'next' } };
      } };
      const controller = new AbortController();
      const cancelled = readCursorWindow({ ...options, signal: controller.signal }).then(() => 'fulfilled', () => 'rejected');
      await Promise.race([entered.promise, cancelled.then(result => { throw new Error(`Reader settled early: ${result}`); })]);
      let peer: Promise<unknown> | undefined;
      if (plan.peer) {
        startingPeer = true;
        peer = readCursorWindow({ ...options, signal: new AbortController().signal }).catch(() => 'rejected');
        if (!plan.first) await joined.promise;
      }
      if (plan.cancel) controller.abort(); else { released = true; release.resolve(); }
      const result = await cancelled;
      const listeners = getEventListeners(controller.signal, 'abort').length;
      const peerStillWithheld = Boolean(peer) && !released;
      release.resolve();
      const peerResult = peer ? await peer : null;
      observe('listeners', { cancelled: result, listeners, peer: peerResult, queryListeners: cache.count() - baseline });
      if (acquiredPage) observe('reach', `settled-${acquiredPage}-reader`);
      if (result === 'rejected' && peerStillWithheld) observe('reach', 'cancelled-with-active-peer');
      if (result === 'rejected' && !peer) observe('reach', 'cancelled-final-reader');
      if (result === 'fulfilled') observe('reach', 'completed-reader');
    } catch (error) { observe('unexpected-error', String(error)); } }, [
      async () => { release.resolve(); },
      async () => { queryClient.clear(); },
      async () => { provider(); },
    ]);
  },
  check: (_plan, trace, expected) => differs('listeners', 'reader listener cleanup', trace[0]?.value, expected) ?? pass,
  calibrations: [
    { name: 'retains-cancelled-listener', law: 'reader listener cleanup', history: { fixed: 'continuation-peer-cancel' }, corrupt: trace => [{ ...trace[0], value: { ...(trace[0].value as object), listeners: 1 } }] },
    { name: 'retains-settled-query-subscription', law: 'reader listener cleanup', history: { fixed: 'continuation-peer-cancel' }, corrupt: trace => [{ ...trace[0], value: { ...(trace[0].value as object), queryListeners: 1 } }] },
  ],
});

// The first page is revalidated on each acquisition. Stable pages can reuse
// previously acquired continuations even when callers ask different windows.
// Varying the read closure's page size exposes lost source reuse under the work
// bound without making a particular page size part of the returned-row law.
oracleProperty({
  id: 'cursor-reused-source-windows', work: { ratio: 1 }, owns: ['src/ui/cursor-query.ts#readCursorWindow'],
  law: { statement: 'For every sequence of windows on a stable source, return exactly the requested rows while retaining the source and acquired generation for reuse.', authority: 'Kyle Mathews (KyleAMathews), approved cursor generation and resource revalidation design, 2026-11-18: a query key names one sequence, and unchanged first pages reuse acquired windows.', limits: 'Stable generated rows, varied caller page sizes; the work bound protects reuse without exposing an HTTP page-size promise.' },
  histories: { arbitrary: fc.record({ value: fc.nat(1000), length: fc.integer({ min: 4, max: 8 }), initialSize: fc.integer({ min: 2, max: 3 }), laterSize: fc.integer({ min: 1, max: 3 }) }), runs: 12, fixedSeeds: [20261118], states: ['partial-first-window', 'retained-larger-source', 'cached-continuation-reuse'], constructed: [
    { name: 'narrow-later-page-size', enters: ['partial-first-window', 'retained-larger-source', 'cached-continuation-reuse'], build: h => ({ ...h, length: 6, initialSize: 3, laterSize: 1 }) },
  ], fixed: [{ name: 'smaller-later-caller', history: { value: 1, length: 6, initialSize: 3, laterSize: 1 } }] },
  // Every caller asks for a prefix of the same stable input array. The windows
  // checkpoint compares exact prefixes; the separate work bound protects source
  // and continuation reuse despite later callers supplying smaller page sizes.
  model: plan => [1, plan.length, 2, plan.length].map(limit => Array.from({ length: plan.length }, (_, i) => plan.value + i).slice(0, limit)),
  driver: async (plan, observe) => {
    const originalNow = Date.now;
    let now = 1_000_000;
    Date.now = () => now;
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
    try {
      const reach = driverReach(observe), answers = [];
      let first = true, continuations = 0;
      for (const limit of [1, plan.length, 2, plan.length]) {
        now += 1_000;
        const size = first ? plan.initialSize : plan.laterSize; first = false;
        const acquisition = answers.length, beforeContinuations = continuations;
        answers.push(await readCursorWindow({ queryClient, queryKey: ['reused-source'], signal: new AbortController().signal, revalidate: true, window: { limit }, read: async cursor => {
          if (cursor !== undefined) {
            continuations++;
            if (answers.length > 0 && size > plan.laterSize) reach.add('retained-larger-source');
          }
          const start = cursor === undefined ? 0 : Number(cursor);
          const end = Math.min(start + size, plan.length);
          return { items: Array.from({ length: end - start }, (_, i) => plan.value + start + i), page: { limit: size, nextCursor: end < plan.length ? String(end) : null } };
        } }));
        if (acquisition === 0 && answers[0].length === 1 && size > 1) reach.add('partial-first-window');
        if (acquisition === 3 && continuations === beforeContinuations && answers[3].length === plan.length) reach.add('cached-continuation-reuse');
      }
      observe('windows', answers);
      reach.flush();
    } catch (error) { observe('unexpected-error', String(error)); }
    finally { queryClient.clear(); Date.now = originalNow; }
  },
  check: (_plan, trace, expected) => differs('windows', 'fresh validated sequence', trace[0]?.value, expected) ?? pass,
  calibrations: [{ name: 'window-prefix-lost', law: 'fresh validated sequence', history: { fixed: 'smaller-later-caller' }, corrupt: trace => [{ ...trace[0], value: [] }] }],
});

oracleProperty({
  id: 'cursor-validation-before-generation', owns: ['src/ui/cursor-query.ts#readCursorWindow'],
  law: { statement: 'For every first-page revalidation, reject invalid data before it can select or reuse an accepted generation, even when its serialization matches accepted bytes.', authority: 'Kyle Mathews (KyleAMathews), approved paired validated data and cursor generation laws, 2026-11-18.', limits: 'ApiPage<number | null> includes non-finite numbers at the typed adapter boundary; validation rejects them before hashing. Initial null is valid.' },
  histories: { arbitrary: fc.record({ infinite: fc.boolean(), callerValidator: fc.boolean() }), runs: 10, fixedSeeds: [20261118], states: ['nan-at-validation', 'infinity-at-validation', 'retained-validator', 'caller-validator'], constructed: [
    { name: 'retained-validator-rejects-nan', enters: ['nan-at-validation', 'retained-validator'], build: h => ({ ...h, infinite: false, callerValidator: false }) },
    { name: 'caller-validator-rejects-infinity', enters: ['infinity-at-validation', 'caller-validator'], build: h => ({ ...h, infinite: true, callerValidator: true }) },
  ], fixed: [false, true].flatMap(infinite => [false, true].map(callerValidator => ({ name: `${infinite ? 'infinity' : 'nan'}-${callerValidator}`, history: { infinite, callerValidator } }))) },
  // Null is initially valid; NaN and infinity are invalid even though JSON
  // serializes each as null. The validation checkpoint compares rejection and
  // the still-accepted null, exposing reuse before wire validation.
  model: () => ({ first: [null], second: 'rejected', accepted: [null] }),
  driver: async (plan, observe) => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
    try {
      const reach = driverReach(observe);
      let invalid = false;
      const validate = (page: { items: (number | null)[] }) => {
        if (page.items.some(value => value !== null && !Number.isFinite(value))) {
          if (page.items.some(value => typeof value === 'number' && Number.isNaN(value))) reach.add('nan-at-validation');
          if (page.items.includes(Infinity)) reach.add('infinity-at-validation');
          reach.add(plan.callerValidator ? 'caller-validator' : 'retained-validator');
          throw new Error('Invalid first page');
        }
      };
      const options = { queryClient, queryKey: ['first-validation'], revalidate: true, window: { limit: 1 }, signal: new AbortController().signal,
        read: async () => ({ items: [invalid ? plan.infinite ? Infinity : NaN : null], page: { limit: 1, nextCursor: null } }), validate };
      const first = await readCursorWindow(options);
      invalid = true;
      const second = await readCursorWindow({ ...options, validate: plan.callerValidator ? validate : undefined }).catch(() => 'rejected');
      const accepted = queryClient.getQueryCache().getAll().flatMap(query => (query.state.data as { pages?: { rows: unknown[] }[] } | undefined)?.pages?.flatMap(page => page.rows) ?? []);
      observe('validation', { first, second, accepted });
      reach.flush();
    } finally { queryClient.clear(); }
  },
  check: (_plan, trace, expected) => differs('validation', 'validated cursor generation', trace[0]?.value, expected) ?? pass,
  calibrations: [{ name: 'reuses-before-validation', law: 'validated cursor generation', history: { fixed: 'nan-false' }, corrupt: trace => [{ ...trace[0], value: { ...(trace[0].value as object), second: [null] } }] }],
});

// Inspect only listeners registered directly by the adapter. Native Request
// signal followers belong to the Fetch implementation, which is not this
// oracle's cleanup boundary. Record callback identities, then use EventTarget's
// actual listener inventory at reader settlement.
oracleProperty({
  id: 'batch-reader-settlement', owns: ['src/ui/read-batch.ts#createReadBatchFetch'],
  law: { statement: 'For every ready batch with an immediate transport outcome, complete each reader independently and release the adapter abort listeners before settling that reader.', authority: 'Kyle Mathews (KyleAMathews), approved transparent batching and independent cancellation, plus 2026-11-18 cleanup law: release abort listeners after their final reader settles.', limits: 'Microtasks and the next fair event-loop task execute normally; transport immediately succeeds or fails. Native Request signal followers are outside adapter-owned listener retention.' },
  histories: { arbitrary: fc.record({ count: fc.integer({ min: 1, max: 3 }), fail: fc.boolean(), defaultTransport: fc.boolean(), waves: fc.integer({ min: 1, max: 3 }), value: fc.nat(1000) }), runs: 12, fixedSeeds: [20261118], states: ['success-injected', 'success-default', 'failure-injected', 'failure-default', 'multiple-waves', 'multiple-readers'], constructed: [
    ...[false, true].flatMap(fail => [false, true].map(defaultTransport => ({ name: `settle-${fail ? 'failure' : 'success'}-${defaultTransport ? 'default' : 'injected'}`, enters: [`${fail ? 'failure' : 'success'}-${defaultTransport ? 'default' : 'injected'}`, 'multiple-waves', 'multiple-readers'], build: (h: { count: number; fail: boolean; defaultTransport: boolean; waves: number; value: number }) => ({ ...h, count: 2, waves: 2, fail, defaultTransport }) }))),
  ], fixed: [false, true].flatMap(fail => [false, true].map(defaultTransport => ({ name: `${fail ? 'failure' : 'success'}-${defaultTransport ? 'default' : 'injected'}`, history: { count: 2, fail, defaultTransport, waves: 2, value: 1 } }))) },
  // Each ready wave requires one transport outcome; every child must settle
  // from that outcome with no adapter listener retained. Settlement records
  // direct callbacks, so later cleanup cannot hide an early retained listener.
  model: plan => ({ calls: plan.waves, results: Array.from({ length: plan.count * plan.waves }, () => ({ result: plan.fail ? 'rejected' : 200, listeners: 0 })) }),
  driver: async (plan, observe) => {
    const originalFetch = globalThis.fetch, tracked = trackBatchListeners();
    const controllers = Array.from({ length: plan.count * plan.waves }, () => new AbortController());
    try {
      const reach = driverReach(observe);
      let calls = 0, completedWaves = 0;
      const transport = async (input: RequestInfo | URL, init?: RequestInit) => {
        calls++;
        const body = await new Request(input, init).json() as { requests: unknown[] };
        if (body.requests.length > 1) reach.add('multiple-readers');
        if (plan.fail) throw new Error('controlled batch failure');
        return Response.json(body.requests.map((_, index) => ({ status: 200, body: { value: plan.value + index }, headers: {} })));
      };
      const fetcher = plan.defaultTransport ? createReadBatchFetch('https://oracle.test/api') : createReadBatchFetch('https://oracle.test/api', transport);
      if (plan.defaultTransport) globalThis.fetch = transport;
      const results: ({ result: number | string; listeners: number } | null)[] = Array.from({ length: plan.count * plan.waves }, () => null);
      for (let wave = 0; wave < plan.waves; wave++) {
        for (let index = wave * plan.count; index < (wave + 1) * plan.count; index++) {
          let pending: Promise<Response>;
          try { pending = Promise.resolve(tracked.read(index, () => fetcher(`https://oracle.test/api/items/${index}`, { signal: controllers[index].signal }))); }
          catch (error) { pending = Promise.reject(error); }
          void pending.then(response => {
            results[index] = { result: response.status, listeners: tracked.remaining(index) };
          }, () => { results[index] = { result: 'rejected', listeners: tracked.remaining(index) }; });
        }
        await new Promise<void>(resolve => setImmediate(resolve));
        if (results.slice(wave * plan.count, (wave + 1) * plan.count).every(result => result !== null)) completedWaves++;
      }
      observe('settlement', { calls, results });
      if (calls > 0 && results.every(result => result !== null)) reach.add(`${results.some(result => result?.result === 'rejected') ? 'failure' : 'success'}-${plan.defaultTransport && globalThis.fetch === transport ? 'default' : 'injected'}`);
      if (completedWaves > 1) reach.add('multiple-waves');
      reach.flush();
    } finally {
      controllers.forEach(controller => controller.abort());
      tracked.restore();
      globalThis.fetch = originalFetch;
    }
  },
  check: (_plan, trace, expected) => differs('settlement', 'batch progress and listener cleanup', trace[0]?.value, expected) ?? pass,
  calibrations: [{ name: 'ready-work-stalled', law: 'batch progress and listener cleanup', history: { fixed: 'success-default' }, corrupt: trace => [{ ...trace[0], value: { ...(trace[0].value as object), results: [null, null] } }] }],
});

// A dependency change need not roll back to expose an unstable stamp. While
// an older handler is paused, install a full cache of useful current stamps.
// Its late result must not evict one with metadata for an obsolete snapshot.
oracleProperty({
  id: 'server-interrupted-stamp-installation', work: { ratio: 1 }, owns: ['src/conditional-operation.ts#conditionalOperation'],
  law: { statement: 'For every interrupted resource load, install validator metadata only for a stable dependency snapshot; a late obsolete snapshot cannot evict a useful current stamp.', authority: 'Kyle Mathews (KyleAMathews), approved stable dependency shortcut and freshness design, plus 2026-11-18 bounded server-stamp law.', limits: 'Monotonic dependency change while one handler is paused; current stamps are installed before it resumes. Exact body validation remains unchanged.' },
  histories: { arbitrary: fc.record({ pressure: fc.integer({ min: 999, max: 1001 }), value: fc.nat(1000) }), runs: 3, fixedSeeds: [20261118], states: ['current-stamps-999', 'current-stamps-1000', 'current-stamps-1001', 'obsolete-load-resumed'], constructed: [
    ...[999, 1000, 1001].map(pressure => ({ name: `resume-after-${pressure}-current-stamps`, enters: [`current-stamps-${pressure}`, 'obsolete-load-resumed'], build: (h: { pressure: number; value: number }) => ({ ...h, pressure }) })),
  ], fixed: [{ name: 'interrupted-load-after-current-capacity', history: { pressure: 1000, value: 1 } }] },
  // Current keys install while the old snapshot is paused. Resuming obsolete
  // work cannot displace them; stable-installation compares the next shortcut
  // and content reload count at the exact one-thousand-key boundary.
  model: plan => ({ interrupted: 200, current: 304, reloads: plan.pressure > 1000 ? 1 : 0 }),
  driver: async (plan, observe) => {
    const entered = deferred<void>(), release = deferred<void>();
    try {
      const reach = driverReach(observe);
      let revision = 0, firstLoads = 0, installed = 0;
      const db = { prepare: (sql: string) => ({ bind() { return this; }, first: async () => sql.startsWith('SELECT epoch') ? { epoch: 'interrupted-stamp', ...Object.fromEntries(CHANGE_DOMAINS.map(domain => [domain, revision])) } : { admitted: true } }) };
      const definition = { route: { method: 'get', operationId: 'getItemSummary', path: '/summary', responses: {}, policy: readOperation() }, handler: async (context: OperationContext) => {
        const key = new URL(context.url).searchParams.get('key');
        if (key === 'interrupted') { entered.resolve(); await release.promise; }
        if (key === '0') firstLoads++;
        return success(summary(plan.value));
      } } as OperationDefinition;
      const context = (key: string): OperationContext => ({ env: { DB: db } as unknown as Env, url: `https://oracle.test/api/summary?key=${key}`, access: null, extensions: [], defer: () => {} });
      const interrupted = conditionalOperation(definition, { path: {}, query: {} }, context('interrupted'));
      await Promise.race([entered.promise, interrupted.then(() => { throw new Error('Handler settled before controlled gate'); })]);
      revision++;
      let validator: string | undefined;
      for (let key = 0; key < plan.pressure; key++) {
        const response = await conditionalOperation(definition, { path: {}, query: {} }, context(String(key)));
        if (response.status === 200 && response.headers.ETag) installed++;
        if ([999, 1000, 1001].includes(installed)) reach.add(`current-stamps-${installed}`);
        if (key === 0) validator = response.headers.ETag;
      }
      release.resolve();
      const interruptedStatus = (await interrupted).status;
      if (revision === 1 && installed > 0 && interruptedStatus === 200) reach.add('obsolete-load-resumed');
      const before = firstLoads;
      const current = await conditionalOperation(definition, { path: {}, query: {} }, context('0'), validator);
      observe('stable-installation', { interrupted: interruptedStatus, current: current.status, reloads: firstLoads - before });
      reach.flush();
    } finally { release.resolve(); }
  },
  check: (_plan, trace, expected) => differs('stable-installation', 'stable validator installation', trace[0]?.value, expected) ?? pass,
  calibrations: [{ name: 'obsolete-stamp-evicts-current', law: 'stable validator installation', history: { fixed: 'interrupted-load-after-current-capacity' }, corrupt: trace => [{ ...trace[0], value: { ...(trace[0].value as object), reloads: 1 } }] }],
});

// Completion order is independent of start order. The model records only the
// newest accepted start index and its representation, including untagged data.
const completionPlan = fc.record({
  value: fc.nat(10000), count: fc.integer({ min: 2, max: 4 }),
  ranks: fc.tuple(fc.nat(10), fc.nat(10), fc.nat(10), fc.nat(10)),
  kinds: fc.tuple(...Array.from({ length: 4 }, () => fc.constantFrom('tagged', 'untagged', 'confirm'))),
});
type CompletionHistory = typeof completionPlan extends fc.Arbitrary<infer History> ? History : never;
const completionOrder = (plan: CompletionHistory) =>
  Array.from({ length: plan.count }, (_, i) => i).sort((a, b) => plan.ranks[a] - plan.ranks[b] || a - b);
oracleProperty({
  id: 'conditional-completion-orders', work: { ratio: 1 }, owns: ['sdk/conditional-reads.ts#conditionalReadFetch'],
  law: { statement: 'For every completion permutation of overlapping reads, an older response cannot replace a newer accepted representation, while a later-started response remains eligible to advance it.', authority: 'Kyle Mathews (KyleAMathews), approved paired cache entries and freshness laws, 2026-11-18.', limits: 'Two to four controlled reads in one context, after warming a valid tagged body; responses are valid tagged or untagged 200s, or 304 confirmations.' },
  histories: { arbitrary: completionPlan, runs: 30, fixedSeeds: [20261118], states: ['overlapping-acquisitions', 'older-completes-first', 'younger-completes-first', 'tagged-completion', 'untagged-completion', 'confirmation-completion'], constructed: [
    { name: 'in-start-order', enters: ['overlapping-acquisitions', 'older-completes-first', 'tagged-completion'], build: h => ({ ...h, count: 4, ranks: [0, 1, 2, 3] as [number, number, number, number], kinds: ['tagged', 'tagged', 'tagged', 'tagged'] as ['tagged', 'tagged', 'tagged', 'tagged'] }) },
    { name: 'younger-body-before-older-confirmation', enters: ['younger-completes-first', 'untagged-completion', 'confirmation-completion'], build: h => ({ ...h, count: 3, ranks: [2, 0, 1, 3] as [number, number, number, number], kinds: ['confirm', 'untagged', 'tagged', 'confirm'] as ['confirm', 'untagged', 'tagged', 'confirm'] }) },
  ], fixed: [
    { name: 'oldest-completes-first', history: { value: 1, count: 4, ranks: [0, 1, 2, 3], kinds: ['tagged', 'tagged', 'tagged', 'tagged'] } satisfies CompletionHistory },
    { name: 'younger-untagged-before-confirmation', history: { value: 1, count: 3, ranks: [2, 0, 1, 3], kinds: ['confirm', 'untagged', 'tagged', 'confirm'] } satisfies CompletionHistory },
  ] },
  // The model retains the greatest accepted request-start index, input value
  // and whether it has a tag. Completion rank chooses the schedule, not truth.
  // The completions checkpoint compares each settlement in that chosen order.
  model: plan => {
    let accepted = -1, value = plan.value, tagged = true;
    return completionOrder(plan).map(index => {
      if (plan.kinds[index] === 'confirm') {
        if (!tagged) return 'rejected';
        accepted = Math.max(accepted, index);
        return summary(value);
      }
      if (index < accepted) return tagged ? summary(value) : 'rejected';
      accepted = index;
      value = plan.value + index + 1;
      tagged = plan.kinds[index] === 'tagged';
      return summary(value);
    });
  },
  driver: async (plan, observe) => {
    try {
      const reach = driverReach(observe);
      const gates = Array.from({ length: plan.count }, () => deferred<Response>()), entered = gates.map(() => deferred<void>());
      let calls = 0;
      const transport = conditionalReadFetch('https://oracle.test/api', async () => {
        const index = calls++ - 1;
        if (index < 0) return Response.json(summary(plan.value), { headers: { ETag: tag(plan.value) } });
        entered[index].resolve();
        return gates[index].promise;
      });
      const read = () => transport('https://oracle.test/api/items/summary').then(response => response.json()).catch(() => 'rejected');
      await read();
      const readers = gates.map(() => read());
      await immediateOutcome(Promise.all(entered.map((gate, index) => Promise.race([gate.promise, readers[index].then(result => {
        throw new Error(`Reader settled before overlapping acquisition: ${JSON.stringify(result)}`);
      })]))));
      reach.add('overlapping-acquisitions');
      const values: unknown[] = [];
      const completed: number[] = [];
      for (const index of completionOrder(plan)) {
        const value = plan.value + index + 1;
        const response = plan.kinds[index] === 'confirm' ? new Response(null, { status: 304, headers: { ETag: tag(plan.value) } }) :
          Response.json(summary(value), { headers: plan.kinds[index] === 'tagged' ? { ETag: tag(value) } : {} });
        gates[index].resolve(response);
        values.push(await immediateOutcome(readers[index]));
        if (completed.some(previous => previous < index)) reach.add('older-completes-first');
        if (completed.some(previous => previous > index)) reach.add('younger-completes-first');
        completed.push(index);
        reach.add(response.status === 304 ? 'confirmation-completion' : response.headers.has('etag') ? 'tagged-completion' : 'untagged-completion');
      }
      observe('completions', values);
      reach.flush();
    } catch (error) { observe('unexpected-error', String(error)); }
  },
  check: (_plan, trace, expected) => differs('completions', 'paired cache entries and freshness', trace[0]?.value, expected) ?? pass,
  calibrations: [{ name: 'freeze-at-first-answer', law: 'paired cache entries and freshness', history: { fixed: 'oldest-completes-first' }, corrupt: trace => [{ ...trace[0], value: [] }] }],
});
