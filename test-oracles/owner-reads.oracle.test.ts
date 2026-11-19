/**
 * Pending owner reads stay shared across Studio projections after a write.
 * This oracle owns the ownerRead registry and the client's write boundary in
 * src/ui/data.ts, observed through exported collections and the generated SDK.
 *
 * ```ts
 * itemsView.preload() // → starts the requested item's shared detail read
 * itemHistoryView.preload() // → shares a pending detail read for the same item
 * BlyggerApi.updateItem({ client, ...write }) // → separates subsequent reads
 * hopperView.preload() // → shares with the corresponding hopperStats view
 * ```
 *
 * A reader from an earlier write period may settle while a newer detail read
 * remains pending. That settlement must not remove the newer read from sharing.
 * The registry's lifetime is shorter than a collection's or query's lifetime:
 * different native subset queries can need the same owner response concurrently.
 *
 * For every owner context, active readers share pending transport, and settling
 * or cancelling an older reader cannot detach a newer pending read from peers.
 * docs/api.md, Collection read batches: "Concurrent freshness checks share
 * pending work only" and "writes clear that pending check before their
 * subsequent refreshes." Decision by Kyle Mathews (GitHub KyleAMathews),
 * 2026-11-18: earlier work cannot overwrite newer accepted representations;
 * cancelling one shared reader leaves its peers running.
 *
 * The model uses only the write's placement, context identity and input value.
 * Histories vary the item's or hopper's projections, which write boundary
 * separates the reads, completion order, the peer key, and old-reader
 * cancellation. The driver starts real live queries on exported source
 * collections, performs a generated SDK write, and controls only HTTP replies.
 * Checks compare transport starts before releasing the newer response, native
 * query recovery, current rows after all active projections settle, and
 * native registry retention after the final reader settles.
 *
 * Limits: the HTTP peer and write completion are controlled. This establishes
 * browser collection/SDK lifecycle behavior, not actual D1 mutation behavior.
 * The superseded raw SDK attempt still rejects; the Studio adapter reacquires
 * it for a live reader. Explicitly cancelled native queries still reject.
 * A live old reader's justified reacquisition is separate from sharing among
 * the newer period's peers. Authority: Kyle Mathews (GitHub KyleAMathews),
 * 2026-11-18, approved active-consumer recovery and revised Query checkpoints.
 * Unrelated collection domains and caller-provided Fetch implementations are
 * outside this owner-read registry boundary. Revising the native Query model
 * triggered design grammar: raw SDK attempt rejection and continuing consumer
 * recovery are distinct checkpoints. The approved delta and preservation
 * comparison are recorded in docs/oracle-read-recovery-review.md.
 */
import fc from 'fast-check';
import { differs, oracleProperty, pass } from '@tanstack/oracles';
import { createLiveQueryCollection, and, eq } from '@tanstack/react-db';
import { BlyggerApi, unwrap } from '../sdk/dist/browser.js';
import { withOracleCleanup } from '../test/oracle-cleanup.ts';

const histories = fc.record({
  resource: fc.constantFrom('items', 'hoppers'),
  boundary: fc.constantFrom('start', 'finish'),
  oldFirst: fc.boolean(), sameKey: fc.boolean(), cancelOld: fc.boolean(),
  value: fc.nat(1000), key: fc.nat(1000),
});
type Plan = typeof histories extends fc.Arbitrary<infer T> ? T : never;
const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
};
const fairTurn = () => new Promise<void>(resolve => setImmediate(resolve));
// Only ready promise work races this event boundary. Deliberately withheld
// responses are released explicitly; no elapsed-time deadline decides a result.
const ready = <T,>(work: Promise<T>) => Promise.race([work, fairTurn().then(() => { throw new Error('Ready owner-read work did not progress'); })]);

let runtime: Promise<typeof import('../src/ui/data.ts')> | undefined;
let serial = 0;

// Fixture values are input data, not answers captured from production. Each
// projection exposes its value through an existing response field.
function itemDetail(id: string, value: number) {
  return { id, revision: value + 1, contentMd: String(value), kind: 'fragment', status: 'draft', created: '2026-10-06', updated: '2026-10-06', version: 0,
    dirty: false, responses: 'default', highlight: 'default', provenance: [], stubOf: null, forkedFrom: null, forkCite: null, pins: [],
    media: [{ id: 'media', itemId: id, mime: 'image/png', alt: String(value), created: '2026-10-06', inline: false, url: 'https://oracle.test/media/value.png' }],
    publishedMedia: [], published: null };
}
function hopperDetail(id: string, value: number) {
  return { hopper: { id, name: String(value), public: false, slug: null, created: '2026-10-06', slugFrozen: false, description: null }, total: value, sourceCount: value };
}

oracleProperty({
  id: 'owner-read-period-sharing', owns: ['src/ui/data.ts#ownerRead', 'src/ui/data.ts#client'],
  law: {
    statement: 'For every owner context, active projections share pending reads after a write boundary; settlement or cancellation of older work cannot detach the newer read from peers or publish pre-write data. Final settlement releases the owner registry entry that retained that read.',
    authority: 'docs/api.md, Collection read batches: concurrent freshness checks share pending work only, and writes clear it before subsequent refreshes. Kyle Mathews (KyleAMathews), 2026-11-18: independent reader cancellation, freshness after writes, and release pending-read references after their final reader settles.',
    limits: 'Real exported Studio collections and generated SDK, controlled HTTP peer. Two owner projections and one later peer; item and hopper context families, write entry/completion, distinct native predicates and keys. Transparent native Map instrumentation observes fixture-key retention after settlement; no garbage-collection or D1 semantics are claimed.',
  },
  histories: {
    arbitrary: histories, runs: 25, fixedSeeds: [20261118],
    states: ['old-collection-read', 'new-period-overlap', 'old-settles-before-peer', 'cancelled-old-reader', 'distinct-owner-context', 'settled-owner-registry'],
    constructed: [
      { name: 'older-item-settles-first', enters: ['old-collection-read', 'new-period-overlap', 'old-settles-before-peer', 'settled-owner-registry'], build: (plan): Plan => ({ ...plan, resource: 'items', oldFirst: true, sameKey: true, cancelOld: false }) },
      { name: 'cancelled-older-hopper', enters: ['old-collection-read', 'new-period-overlap', 'old-settles-before-peer', 'cancelled-old-reader'], build: (plan): Plan => ({ ...plan, resource: 'hoppers', oldFirst: true, sameKey: true, cancelOld: true }) },
      { name: 'different-owner-context', enters: ['old-collection-read', 'new-period-overlap', 'distinct-owner-context'], build: (plan): Plan => ({ ...plan, oldFirst: false, sameKey: false, cancelOld: false }) },
    ],
  },
  // A write changes the fixture value only at completion. Within-period peers
  // owe one shared read per context. A still-live old reader reacquires current
  // data; if it settles first, that justified demand starts before the peer.
  model: (plan: Plan) => ({
    starts: 2 + Number(!plan.sameKey) + Number(plan.oldFirst && !plan.cancelOld),
    recoveryStarts: Number(!plan.cancelOld), oldRejected: plan.cancelOld,
    old: plan.cancelOld ? null : String(plan.value + Number(plan.boundary === 'finish')),
    oldTransportAborted: plan.cancelOld,
    fresh: String(plan.value + Number(plan.boundary === 'finish')),
    peer: String(plan.value + Number(plan.boundary === 'finish')),
    retainedPending: 0, diagnostics: [],
  }),
  driver: async (plan, observe) => {
    const descriptors = new Map(['location', 'window', 'document', 'fetch'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
    const originalConsoleError = console.error;
    const errors: string[] = [];
    console.error = (...args) => { errors.push(args.map(String).join(' ')); };
    const oldGate = deferred<void>(), freshGate = deferred<void>(), writeGate = deferred<void>();
    const entered = [deferred<void>(), deferred<void>()], writeEntered = deferred<void>();
    const id = `owner-${++serial}-${plan.key}`, peerId = plan.sameKey ? id : `${id}-peer`;
    // Explicit cleanup is observable state, unlike whether GC happens to run.
    // Observe native storage without replacing its semantics or extracting the
    // private ownerRead function. Retain maps/keys only, never their values.
    const registryKeys = new Set([id, peerId].map(key => JSON.stringify([plan.resource, key])));
    const registryEntries: { map: Map<unknown, unknown>; key: string }[] = [];
    const originalMapSet = Map.prototype.set;
    Map.prototype.set = function (this: Map<unknown, unknown>, key: unknown, value: unknown) {
      if (typeof key === 'string' && registryKeys.has(key) && value && typeof value === 'object' && 'read' in value && 'invalidate' in value &&
        !registryEntries.some(entry => entry.map === this && entry.key === key)) registryEntries.push({ map: this, key });
      return originalMapSet.call(this, key, value);
    };
    let value = plan.value;
    const requests: { id: string; value: number; physical: Request }[] = [];
    let envelopes = 0;
    let db: Awaited<NonNullable<typeof runtime>> | undefined;
    const views: { cleanup(): void | Promise<void> }[] = [];
    const readers: Promise<unknown>[] = [];
    let result: unknown;
    async function serve(request: Request): Promise<Response> {
      const url = new URL(request.url);
      if (url.pathname === '/api/read-batch') {
        envelopes++;
        const body = await request.json() as { operation: string; requests: { path?: Record<string, string> }[] };
        return Response.json(await Promise.all(body.requests.map(async child => {
          const childId = child.path?.id ?? '';
          const response = await read(childId, request);
          return { status: response.status, body: await response.json(), headers: Object.fromEntries(response.headers) };
        })));
      }
      if (request.method === 'PATCH') {
        writeEntered.resolve(); await writeGate.promise; value++;
        return Response.json(plan.resource === 'items' ? itemDetail(id, value) : hopperDetail(id, value).hopper);
      }
      if (request.method === 'GET' && url.pathname.startsWith(`/api/${plan.resource}/`)) return read(decodeURIComponent(url.pathname.split('/').at(-1)!), request);
      throw new Error(`Unexpected owner-read request: ${request.method} ${url.pathname}`);
    }
    async function read(key: string, physical: Request) {
      const index = requests.length, snapshot = value;
      requests.push({ id: key, value: snapshot, physical });
      entered[index]?.resolve();
      if (index === 0) await oldGate.promise;
      if (index === 1) await freshGate.promise;
      return Response.json(plan.resource === 'items' ? itemDetail(key, snapshot) : hopperDetail(key, snapshot), { headers: { ETag: `W/"${key}-${snapshot}"` } });
    }
    try {
      Object.defineProperties(globalThis, {
        location: { configurable: true, writable: true, value: { origin: 'http://studio.test' } },
        window: { configurable: true, writable: true, value: new EventTarget() },
        document: { configurable: true, writable: true, value: Object.assign(new EventTarget(), { visibilityState: 'hidden', getElementById: (key: string) => key === 'studio-root' ? { dataset: { apiBase: '/api' } } : null }) },
        fetch: { configurable: true, writable: true, value: serve },
      });
      runtime ??= import('../src/ui/data.ts');
      db = await runtime;
      db.queryClient.mount();
      const source = plan.resource === 'items' ? db.items : db.hoppers;
      const details = plan.resource === 'items' ? db.itemHistory : db.hopperStats;
      // Different legal subset predicates force distinct native Query entries.
      // They still request the same owner context, so Native Query's own
      // deduplication cannot hide an ownerRead registry failure.
      const first = createLiveQueryCollection(q => q.from({ row: source }).where(({ row }) => eq(row.id, id)).select(({ row }) => row));
      const second = createLiveQueryCollection(q => q.from({ row: details }).where(({ row }) => eq(row.id, id)).select(({ row }) => row));
      const third = plan.resource === 'items'
        ? createLiveQueryCollection(q => q.from({ row: db!.items }).where(({ row }) => and(eq(row.id, peerId), eq(row.status, 'draft'))).select(({ row }) => row))
        : createLiveQueryCollection(q => q.from({ row: db!.hoppers }).where(({ row }) => and(eq(row.id, peerId), eq(row.public, false))).select(({ row }) => row));
      views.push(first, second, third);
      const startWrite = () => plan.resource === 'items'
        ? unwrap(BlyggerApi.updateItem({ client: db!.client, path: { id }, body: { contentMd: String(value + 1), expectedRevision: value + 1 } }))
        : unwrap(BlyggerApi.updateHopper({ client: db!.client, path: { id }, body: { name: String(value + 1) } }));
      let write: Promise<unknown> | undefined;
      if (plan.boundary === 'finish') { write = startWrite(); readers.push(write); await ready(writeEntered.promise); }
      const firstReader = first.preload().catch(() => undefined); readers.push(firstReader);
      await ready(entered[0].promise);
      observe('reach', 'old-collection-read');
      const oldQuery = db.queryClient.getQueryCache().getAll().find(query => query.promise)!;
      const oldOutcome = oldQuery.promise!.then(() => false, () => true);
      if (plan.boundary === 'start') { write = startWrite(); readers.push(write); await ready(writeEntered.promise); }
      else { writeGate.resolve(); await write; }
      const secondReader = second.preload().catch(() => undefined); readers.push(secondReader);
      await ready(entered[1].promise);
      observe('reach', 'new-period-overlap');
      if (plan.cancelOld) {
        await db.queryClient.cancelQueries({ queryKey: oldQuery.queryKey, exact: true });
        observe('reach', 'cancelled-old-reader');
      }
      if (plan.oldFirst) {
        oldGate.resolve();
        // Cancellation settles the native query before a signal-ignoring peer
        // has completed its body. Observe the old physical reply's jobs too.
        await fairTurn();
        observe('reach', 'old-settles-before-peer');
      }
      const thirdReader = third.preload().catch(() => undefined); readers.push(thirdReader);
      await fairTurn();
      const starts = requests.length;
      if (!plan.sameKey) observe('reach', 'distinct-owner-context');
      freshGate.resolve();
      await ready(secondReader); await ready(thirdReader);
      if (!plan.oldFirst) oldGate.resolve();
      const oldRejected = await ready(oldOutcome);
      await fairTurn();
      observe('reach', 'settled-owner-registry');
      const freshRow = second.toArray.find(row => row.id === id) as { media?: { alt: string | null }[]; total?: number } | undefined;
      const peerRow = third.toArray.find(row => row.id === peerId) as { contentMd?: string; name?: string } | undefined;
      const oldRow = (oldQuery.state.data as { data?: { contentMd?: string; name?: string }[] } | undefined)?.data?.[0];
      result = { starts, recoveryStarts: requests.length - 2 - Number(!plan.sameKey), oldRejected,
        old: oldRow ? plan.resource === 'items' ? oldRow.contentMd : oldRow.name : null,
        oldTransportAborted: requests[0]?.physical.signal.aborted ?? false,
        fresh: plan.resource === 'items' ? freshRow?.media?.[0]?.alt : freshRow?.total === undefined ? undefined : String(freshRow.total),
        peer: plan.resource === 'items' ? peerRow?.contentMd : peerRow?.name,
        retainedPending: registryEntries.filter(entry => entry.map.has(entry.key)).length,
        diagnostics: errors.filter(error => !(plan.cancelOld && /CancelledError|Initial subset load failed|Cancelled/.test(error))) };
      // Both direct hopper GETs and item batches have been exercised. Retain the
      // actual envelope observation separately from the context-level count.
      observe('transport', { envelopes, resource: plan.resource });
      if (plan.boundary === 'start') { writeGate.resolve(); await write; }
    } catch (error) {
      result = { unexpected: error instanceof Error ? { name: error.name, message: error.message } : String(error) };
    } finally {
      // Keep the sharing checkpoint if cleanup fails, and attempt every release
      // and restoration even when an earlier collection cleanup throws.
      const diagnosticCount = errors.length;
      await withOracleCleanup(async () => { observe('sharing', result); }, [
        async () => { oldGate.resolve(); freshGate.resolve(); writeGate.resolve();
          await Promise.allSettled(db?.queryClient.getQueryCache().getAll().map(query => query.promise).filter(Boolean) ?? []); },
        ...views.map(view => async () => { await view.cleanup(); }),
        ...[db?.items, db?.itemHistory, db?.hoppers, db?.hopperStats].map(source => async () => { await source?.cleanup(); }),
        async () => { await Promise.allSettled(readers); },
        async () => { db?.queryClient.clear(); },
        async () => { db?.queryClient.unmount(); },
        async () => { if (errors.length > diagnosticCount) throw new AggregateError(errors.slice(diagnosticCount), 'Owner-read cleanup diagnostics'); },
        async () => { console.error = originalConsoleError; },
        async () => { Map.prototype.set = originalMapSet; },
        ...[...descriptors].map(([key, descriptor]) => async () => { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else Reflect.deleteProperty(globalThis, key); }),
      ]);
    }
  },
  check: (_plan, trace, expected) => differs('sharing', 'shared owner reads', trace.find(event => event.checkpoint === 'sharing')?.value, expected) ?? pass,
  calibrations: [{
    name: 'old-cleanup-detaches-newer-read', law: 'shared owner reads', history: { constructed: 'older-item-settles-first' },
    corrupt: trace => trace.map(event => event.checkpoint === 'sharing' ? { ...event, value: { ...(event.value as object), starts: 4 } } : event),
  }],
});

// The exported owner client is also the Studio's request-attribution boundary.
// A preceding failure makes accidental attribution of a success observable:
// the later error must keep naming the preceding failure. Public low-level SDK
// requests avoid conflating this transport promise with an endpoint's schema.
const attributionHistories = fc.record({
  outcome: fc.constantFrom('success' as const, 'not-modified' as const, 'http-failure' as const, 'network-failure' as const),
  method: fc.constantFrom('GET' as const, 'HEAD' as const, 'PATCH' as const),
  key: fc.nat(1000),
  successStatus: fc.constantFrom(200, 201, 204), failureStatus: fc.constantFrom(403, 409, 500),
});
type AttributionPlan = typeof attributionHistories extends fc.Arbitrary<infer T> ? T : never;
const attributionStatus = (plan: AttributionPlan) => plan.outcome === 'success' ? plan.successStatus
  : plan.outcome === 'not-modified' ? 304 : plan.outcome === 'http-failure' ? plan.failureStatus : null;
const attributionPath = (plan: AttributionPlan, stage: string) => `/api/oracle-attribution/${plan.key}/${stage}`;

oracleProperty({
  id: 'owner-client-error-attribution', owns: ['src/ui/data.ts#client'],
  law: {
    statement: 'For every owner-client transport outcome, only failed responses and rejected transports update the failed request named by the Studio error log; the method and path identify that failure without query contents.',
    authority: 'AGENTS.md, 0.58.2: the API transport notes failed requests so an error-log entry can name one. src/ui/error-log.ts module and noteRequest documentation: records failures without query strings. Existing behavior tests: test-ui/error-log.test.ts, API status attribution and dropped-fetch attribution.',
    limits: 'Real exported Studio client and error-log record/entries API, controlled HTTP peer. This checks transport attribution, not which UI banner records an error or error-log persistence and aging.',
  },
  histories: {
    arbitrary: attributionHistories, runs: 25, fixedSeeds: [20261118],
    states: ['confirmed-response', 'not-modified-response', 'failed-response', 'rejected-transport'],
    constructed: [
      { name: 'success-preserves-prior-failure', enters: ['confirmed-response'], build: (plan): AttributionPlan => ({ ...plan, outcome: 'success' }) },
      { name: '304-preserves-prior-failure', enters: ['not-modified-response'], build: (plan): AttributionPlan => ({ ...plan, outcome: 'not-modified' }) },
      { name: 'http-status-names-current-failure', enters: ['failed-response'], build: (plan): AttributionPlan => ({ ...plan, outcome: 'http-failure' }) },
      { name: 'rejected-fetch-names-current-failure', enters: ['rejected-transport'], build: (plan): AttributionPlan => ({ ...plan, outcome: 'network-failure' }) },
    ],
  },
  model: plan => ({
    operation: plan.outcome === 'http-failure' || plan.outcome === 'network-failure'
      ? `${plan.method} ${attributionPath(plan, 'current')}` : `GET ${attributionPath(plan, 'previous')}`,
    status: attributionStatus(plan), privateQueryRecorded: false,
  }),
  driver: async (plan, observe) => {
    const descriptors = new Map(['location', 'window', 'document', 'fetch'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
    let log: typeof import('../src/ui/error-log.ts')['errorLog'] | undefined;
    try {
      Object.defineProperties(globalThis, {
        location: { configurable: true, writable: true, value: { origin: 'http://studio.test', pathname: '/studio/oracle' } },
        window: { configurable: true, writable: true, value: new EventTarget() },
        document: { configurable: true, writable: true, value: Object.assign(new EventTarget(), { visibilityState: 'hidden', getElementById: (key: string) => key === 'studio-root' ? { dataset: { apiBase: '/api' } } : null }) },
        fetch: { configurable: true, writable: true, value: async (request: Request) => {
          if (new URL(request.url).pathname.endsWith('/previous')) return new Response('previous failure', { status: 503 });
          const state = plan.outcome === 'success' ? 'confirmed-response' : plan.outcome === 'not-modified' ? 'not-modified-response'
            : plan.outcome === 'http-failure' ? 'failed-response' : 'rejected-transport';
          observe('reach', state);
          if (plan.outcome === 'network-failure') throw new TypeError('Controlled owner transport failure');
          const status = attributionStatus(plan)!;
          return new Response(status === 204 || status === 304 || plan.method === 'HEAD' ? null : 'current response', { status });
        } },
      });
      runtime ??= import('../src/ui/data.ts');
      const db = await runtime;
      log = (await import('../src/ui/error-log.ts')).errorLog;
      log.clear();
      await db.client.get({ url: `${attributionPath(plan, 'previous').slice('/api'.length)}?q=private-prior`, parseAs: 'text' });
      const response = await db.client.request({ method: plan.method, url: `${attributionPath(plan, 'current').slice('/api'.length)}?q=private-current`, parseAs: 'text' });
      const error = plan.outcome === 'http-failure' ? Object.assign(new Error(`HTTP ${plan.failureStatus}`), { statusCode: plan.failureStatus })
        : new TypeError('Controlled banner after transport');
      log.record(error, 'read');
      const entry = log.entries()[0];
      observe('attribution', { operation: entry?.operation, status: response.response?.status ?? null, privateQueryRecorded: JSON.stringify(entry).includes('private-') });
    } catch (error) {
      observe('attribution', { unexpected: error instanceof Error ? { name: error.name, message: error.message } : String(error) });
    } finally {
      log?.clear();
      for (const [key, descriptor] of descriptors) {
        if (descriptor) Object.defineProperty(globalThis, key, descriptor);
        else Reflect.deleteProperty(globalThis, key);
      }
    }
  },
  check: (_plan, trace, expected) => differs('attribution', 'failed request attribution', trace.find(event => event.checkpoint === 'attribution')?.value, expected) ?? pass,
  calibrations: [{
    name: 'successful-response-replaces-failure', law: 'failed request attribution', history: { constructed: 'success-preserves-prior-failure' },
    corrupt: trace => trace.map(event => event.checkpoint === 'attribution' ? { ...event, value: { ...(event.value as object), operation: 'GET /api/a-successful-request' } } : event),
  }],
});
