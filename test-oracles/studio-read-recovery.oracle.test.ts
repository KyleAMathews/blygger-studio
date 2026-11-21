/**
 * Active Studio reads survive superseded SDK attempts. This oracle owns the
 * Studio client's recovery boundary, observed through the exported client and
 * a live summary collection; raw SDK cancellation remains a separate contract.
 *
 * ```ts
 * summaryView.preload() // → current rows after an overlapping browse write
 * BlyggerApi.getItemSummary({ client }) // → current data after finite supersessions
 * controller.abort(reason) // → original reason, with no recovery request
 * peerThrows(new DOMException('Read superseded', 'AbortError')) // → original failure
 * ```
 *
 * An unrelated write can supersede a successful resource GET. The consumer is
 * still live, so rejecting that attempt must not strand its view in an error
 * state. For every active Studio resource read, finite SDK supersessions are
 * reacquired until a current response or a real failure settles the original
 * consumer, without requiring another consumer. Superseded bodies never publish.
 * Explicit cancellation keeps its reason and starts no further work. Ordinary
 * HTTP, schema, network and unrelated abort failures remain failures. Authority:
 * decision by Kyle Mathews (GitHub KyleAMathews), 2026-11-18, approving the shared
 * Studio recovery adapter and revised native Query recovery checkpoints.
 *
 * The independent model uses the starting count, affected writes, consumer
 * liveness and terminal peer outcome. Histories vary initial/refetch demands,
 * direct/collection consumers, zero to two crossed write boundaries, related
 * and unrelated writes, and ordinary failures including a look-alike AbortError.
 * Controlled gates place each write before the pending GET completes. The
 * driver records the original public consumer, all physical demands, live rows
 * and collection health after settlement. Existing SDK oracles independently
 * require each raw superseded attempt to reject. Limits: controlled HTTP peer,
 * one summary representation; other real projections have receiving witnesses.
 */
import fc from 'fast-check';
import { createLiveQueryCollection } from '@tanstack/react-db';
import { differs, oracleProperty, pass } from '@tanstack/oracles';
import { BlyggerApi, ReadSupersededError, unwrap } from '../sdk/dist/browser.js';
import { conditionalReadFetch } from '../sdk/conditional-reads.ts';
import { recoverStudioReads } from '../src/ui/read-recovery.ts';
import { withOracleCleanup } from '../test/oracle-cleanup.ts';

const histories = fc.record({
  surface: fc.constantFrom('direct', 'collection'), warm: fc.boolean(),
  crossings: fc.integer({ min: 0, max: 2 }), related: fc.boolean(), value: fc.nat(1000),
  terminal: fc.constantFrom('success', 'network', 'http', 'schema', 'lookalike', 'cancel'),
  cancelReason: fc.constantFrom('object', 'zero', 'false', 'null'),
});

// Supersession has two response cuts and two newer-representation cuts. This
// driver observes each rejected raw SDK attempt below recovery, independently
// of the consumer promise which remains live until current data is accepted.
const representationHistories = fc.record({ cause: fc.constantFrom('response-write', 'body-write', 'newer-200', 'newer-304'), value: fc.nat(1000) });
type RepresentationPlan = typeof representationHistories extends fc.Arbitrary<infer T> ? T : never;
oracleProperty({
  id: 'studio-read-recovery-representations', owns: ['src/ui/read-recovery.ts#recoverStudioReads', 'sdk/conditional-reads.ts#conditionalReadFetch'],
  law: {
    statement: 'For every active Studio read superseded before response acceptance, during body validation, or by a newer untagged representation, its raw SDK attempt rejects as an identifiable AbortError while its original consumer reacquires the current representation.',
    authority: 'Decision by Kyle Mathews (GitHub KyleAMathews), 2026-11-18: approve active-consumer recovery from writes and newer representations while preserving raw SDK rejection, freshness and ordinary error fidelity.',
    limits: 'Real raw SDK and Studio adapter, controlled HTTP responses and streamed body. One superseded attempt, including late 200 and cached-validator 304; repeated writes and live collections are covered by the companion property.',
  },
  histories: { arbitrary: representationHistories, runs: 25, fixedSeeds: [20261118], states: ['response-write', 'body-write', 'newer-200', 'newer-304'], constructed: (['response-write', 'body-write', 'newer-200', 'newer-304'] as const).map(cause => ({ name: `${cause}-recovery`, enters: [cause], build: (h: RepresentationPlan): RepresentationPlan => ({ ...h, cause }) })) },
  model: (plan: RepresentationPlan) => ({ value: plan.value + 1, attempts: 2, requests: plan.cause === 'newer-304' ? 4 : plan.cause === 'newer-200' ? 3 : 2, rejections: [{ typed: true, name: 'AbortError', message: 'Read superseded' }] }),
  driver: async (plan, observe) => {
    const entered = deferred(), bodyEntered = deferred(), release = deferred();
    const oldIndex = Number(plan.cause === 'newer-304');
    let requests = 0, attempts = 0, current = plan.value;
    const rejections: { typed: boolean; name: string; message: string }[] = [];
    const url = 'https://representation.test/api/items/summary';
    const raw = conditionalReadFetch('https://representation.test/api/', async input => {
      const request = input as Request;
      if (request.method === 'POST') { current++; return Response.json({ id: 1 }); }
      const index = requests++, snapshot = current;
      if (index === oldIndex) {
        entered.resolve();
        if (plan.cause === 'body-write') {
          let sent = false;
          return new Response(new ReadableStream({
            start(controller) { controller.enqueue(new TextEncoder().encode('{"all":')); },
            async pull(controller) {
              if (sent) return; sent = true; bodyEntered.resolve(); await release.promise;
              controller.enqueue(new TextEncoder().encode(JSON.stringify(summary(snapshot)).slice('{"all":'.length))); controller.close();
            },
          }), { headers: { ETag: '"old"' } });
        }
        await release.promise;
        if (plan.cause === 'newer-304') return new Response(null, { status: 304, headers: { ETag: '"old"' } });
      }
      const untagged = plan.cause.startsWith('newer') && index > oldIndex;
      return Response.json(summary(snapshot), { headers: untagged ? {} : { ETag: index < oldIndex ? '"old"' : '"current"' } });
    });
    if (oldIndex) await raw(url);
    const recovering = recoverStudioReads(async (input, init) => {
      attempts++;
      try { return await raw(input, init); }
      catch (error) {
        rejections.push({ typed: error instanceof ReadSupersededError, name: error instanceof Error ? error.name : '', message: error instanceof Error ? error.message : String(error) });
        throw error;
      }
    });
    let result: unknown;
    const pending = recovering(url).then(response => response.json());
    try {
      await ready(plan.cause === 'body-write' ? bodyEntered.promise : entered.promise);
      if (plan.cause.startsWith('newer')) { current++; await raw(url); }
      else await raw(new Request('https://representation.test/api/browse', { method: 'POST' }));
      release.resolve();
      const response = await ready(pending) as { all: number };
      observe('reach', plan.cause);
      result = { value: response.all, attempts, requests, rejections };
    } catch (error) { result = { unexpected: error instanceof Error ? { name: error.name, message: error.message } : String(error), attempts, requests, rejections }; }
    finally { release.resolve(); await pending.catch(() => {}); }
    observe('representation', result);
  },
  check: (_plan, trace, expected) => differs('representation', 'raw rejection and current consumer', trace.find(entry => entry.checkpoint === 'representation')?.value, expected) ?? pass,
  calibrations: [{ name: 'consumer-receives-old-body', law: 'raw rejection and current consumer', history: { constructed: 'body-write-recovery' }, corrupt: trace => trace.map(entry => entry.checkpoint === 'representation' ? { ...entry, value: { ...(entry.value as { value: number }), value: (entry.value as { value: number }).value - 1 } } : entry) }],
});
type Plan = typeof histories extends fc.Arbitrary<infer T> ? T : never;
const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>(done => { resolve = done; });
  return { promise, resolve };
};
const fairTurn = () => new Promise<void>(resolve => setImmediate(resolve));
const ready = <T,>(promise: Promise<T>) => Promise.race([promise, fairTurn().then(() => { throw new Error('Ready recovery work did not progress'); })]);
const summary = (value: number) => ({ all: value, drafts: value, changes: 0, public: 0, withdrawn: 0 });
let runtime: Promise<typeof import('../src/ui/data.ts')> | undefined;

oracleProperty({
  id: 'studio-read-recovery', owns: ['src/ui/data.ts#client', 'src/ui/read-recovery.ts#recoverStudioReads'],
  law: {
    statement: 'For every active Studio resource read, finite SDK supersessions are reacquired until a current response or a real failure settles the original consumer without another consumer; superseded data never publishes, explicit cancellation preserves its reason and starts no further work, and ordinary failures remain failures.',
    authority: 'Decision by Kyle Mathews (GitHub KyleAMathews), 2026-11-18: approve shared Studio recovery adapter and native Query recovery checkpoint revision; existing SDK freshness, cancellation and failure laws remain unchanged.',
    limits: 'Real exported Studio client and live summary collection, controlled legal HTTP peer. Zero to two write crossings, initial/refetch demands, direct caller cancellation; collection cancellation remains native Query cancellation.',
  },
  histories: { arbitrary: histories, runs: 25, fixedSeeds: [20261118],
    states: ['unrelated-write', 'related-write', 'repeated-supersession', 'initial-collection', 'collection-refetch', 'lookalike-abort', 'caller-cancel', 'real-failure', 'no-supersession', 'network-failure', 'schema-failure', 'falsy-cancellation'],
    constructed: [
      { name: 'unrelated-write-initial-view', enters: ['unrelated-write', 'initial-collection'], build: (h): Plan => ({ ...h, surface: 'collection', warm: false, crossings: 1, related: false, terminal: 'success' }) },
      { name: 'repeated-related-refetch', enters: ['related-write', 'repeated-supersession', 'collection-refetch'], build: (h): Plan => ({ ...h, surface: 'collection', warm: true, crossings: 2, related: true, terminal: 'success' }) },
      { name: 'lookalike-is-failure', enters: ['lookalike-abort', 'no-supersession'], build: (h): Plan => ({ ...h, surface: 'direct', crossings: 0, terminal: 'lookalike' }) },
      { name: 'cancel-recovery', enters: ['caller-cancel'], build: (h): Plan => ({ ...h, surface: 'direct', crossings: 1, terminal: 'cancel' }) },
      { name: 'failed-refetch-keeps-rows', enters: ['real-failure'], build: (h): Plan => ({ ...h, surface: 'collection', warm: true, crossings: 1, terminal: 'http' }) },
      { name: 'network-failure-remains-visible', enters: ['network-failure'], build: (h): Plan => ({ ...h, surface: 'collection', warm: true, crossings: 1, terminal: 'network' }) },
      { name: 'schema-failure-remains-visible', enters: ['schema-failure'], build: (h): Plan => ({ ...h, surface: 'collection', warm: true, crossings: 0, terminal: 'schema' }) },
      { name: 'falsy-cancellation-keeps-identity', enters: ['falsy-cancellation'], build: (h): Plan => ({ ...h, surface: 'direct', crossings: 1, terminal: 'cancel', cancelReason: 'zero' }) },
    ],
  },
  model: (plan: Plan) => {
    const terminal = plan.terminal === 'cancel' && plan.surface === 'collection' ? 'success' : plan.terminal;
    return { outcome: terminal, value: terminal === 'success' ? plan.value + (plan.related ? plan.crossings : 0) : null,
      rows: plan.surface === 'collection' ? terminal === 'success' ? plan.value + (plan.related ? plan.crossings : 0) : plan.warm ? plan.value : null : null,
      starts: Number(plan.warm) + plan.crossings + 1, stalePublished: false, healthy: plan.surface === 'collection' ? terminal === 'success' : null, originalReason: terminal === 'network' || terminal === 'lookalike' || terminal === 'cancel' ? true : null, diagnostics: [] };
  },
  driver: async (plan, observe) => {
    const descriptors = new Map(['location', 'window', 'document', 'fetch'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
    const originalConsoleError = console.error;
    const diagnostics: unknown[][] = [];
    console.error = (...args) => { diagnostics.push(args); };
    const gates = Array.from({ length: plan.crossings + 1 }, deferred), entered = gates.map(deferred);
    const provided = plan.terminal === 'lookalike' ? new DOMException('Read superseded', 'AbortError') : new TypeError('Controlled recovery peer failure');
    const reason = plan.cancelReason === 'zero' ? 0 : plan.cancelReason === 'false' ? false : plan.cancelReason === 'null' ? null : new Error('Explicit recovery reader cancellation'), controller = new AbortController();
    const terminal = plan.terminal === 'cancel' && plan.surface === 'collection' ? 'success' : plan.terminal;
    let db: Awaited<NonNullable<typeof runtime>> | undefined;
    let view: ReturnType<typeof createLiveQueryCollection> | undefined;
    let subscription: { unsubscribe(): void } | undefined;
    let pending: Promise<void> | undefined;
    let value = plan.value, starts = 0, main = false, stalePublished = false, terminalDelivered = false;
    let result: unknown;
    let outcome: { kind: string; value?: number; error?: unknown } | undefined;
    try {
      Object.defineProperties(globalThis, {
        location: { configurable: true, writable: true, value: { origin: 'http://studio.test', pathname: '/studio/oracle' } },
        window: { configurable: true, writable: true, value: new EventTarget() },
        document: { configurable: true, writable: true, value: Object.assign(new EventTarget(), { visibilityState: 'hidden', getElementById: () => ({ dataset: { apiBase: '/api' } }) }) },
        fetch: { configurable: true, writable: true, value: async (request: Request) => {
          const url = new URL(request.url);
          if (request.method === 'POST') { if (url.pathname === '/api/items') value++; return Response.json({ id: 1 }); }
          if (url.pathname !== '/api/items/summary') throw new Error(`Unexpected recovery peer ${request.method} ${url.pathname}`);
          const index = starts++ - Number(plan.warm), snapshot = value;
          if (main) { entered[index]?.resolve(); await gates[index]?.promise; }
          if (main && index === plan.crossings) {
            terminalDelivered = true;
            if (terminal === 'network' || terminal === 'lookalike') throw provided;
            if (terminal === 'http') return Response.json({ message: 'Controlled HTTP failure' }, { status: 503 });
            if (terminal === 'schema') return Response.json({ all: 'invalid' });
          }
          return Response.json(summary(snapshot), { headers: { ETag: `"summary-${snapshot}"` } });
        } },
      });
      runtime ??= import('../src/ui/data.ts'); db = await runtime;
      view = createLiveQueryCollection(q => q.from({ row: db!.itemSummary }).select(({ row }) => row));
      if (plan.warm) {
        if (plan.surface === 'collection') await ready(view.preload());
        else await unwrap(BlyggerApi.getItemSummary({ client: db.client }));
      }
      main = true;
      // Subscribe to new publications, not snapshots: retained warm rows are
      // allowed, but publishing even the same stale value before the current
      // peer reply would violate the initial/refetch freshness checkpoint.
      if (plan.surface === 'collection') subscription = view.subscribeChanges(changes => {
        for (const change of changes) if (change.type !== 'delete') {
          const published = change.value as { all: number };
          if (!terminalDelivered || terminal !== 'success' || published.all !== value) stalePublished = true;
        }
      }, { includeInitialState: false });
      const run = plan.surface === 'direct'
        ? unwrap(BlyggerApi.getItemSummary({ client: db.client, signal: controller.signal }))
        : plan.warm ? db.itemSummary.utils.refetch({ throwOnError: true }) : view.preload();
      pending = run.then(data => { outcome = { kind: 'success', value: plan.surface === 'direct' ? (data as { all: number }).all : undefined }; }, error => { outcome = { kind: 'error', error }; });
      for (let index = 0; index <= plan.crossings; index++) {
        await ready(entered[index].promise);
        if (index < plan.crossings) {
          await db.client.post({ url: plan.related ? '/items' : '/browse', body: {} });
          observe('reach', plan.related ? 'related-write' : 'unrelated-write');
        } else if (terminal === 'cancel') controller.abort(reason);
        gates[index].resolve();
      }
      await ready(pending); await fairTurn();
      if (plan.crossings === 2) observe('reach', 'repeated-supersession');
      if (plan.surface === 'collection') observe('reach', plan.warm ? 'collection-refetch' : 'initial-collection');
      if (terminal === 'lookalike') observe('reach', 'lookalike-abort');
      if (terminal === 'cancel') observe('reach', 'caller-cancel');
      if (terminal === 'cancel' && plan.cancelReason !== 'object') observe('reach', 'falsy-cancellation');
      if (terminal === 'network') observe('reach', 'network-failure');
      if (terminal === 'schema') observe('reach', 'schema-failure');
      if (!['success', 'cancel', 'lookalike'].includes(terminal)) observe('reach', 'real-failure');
      if (!plan.crossings) observe('reach', 'no-supersession');
      const row = view.toArray[0] as { all: number } | undefined;
      const error = outcome?.error;
      const kind = outcome?.kind === 'success' ? 'success' : error === reason ? 'cancel' : error === provided ? terminal
        : error && typeof error === 'object' && 'statusCode' in error && error.statusCode === 503 ? 'http'
        : error instanceof Error && error.name === 'ZodError' ? 'schema' : error instanceof Error ? error.name + ': ' + error.message : String(error);
      const expectedCollectionFailure = plan.surface === 'collection' && outcome?.kind === 'error';
      const queryErrorPrefixes = db.queryClient.getQueryCache().getAll().map(query => `[QueryCollection] Error observing query ${String(query.queryKey)}:`);
      const unexpectedDiagnostics = diagnostics.filter(parts => !(expectedCollectionFailure && (
        parts.length === 2 && queryErrorPrefixes.includes(String(parts[0])) && parts[1] === error ||
        parts.length === 1 && error instanceof Error && parts[0] === `[Live Query Error] Initial subset load failed: ${error.message}`
      )));
      result = { outcome: kind, value: kind === 'success' ? plan.surface === 'direct' ? outcome?.value : row?.all ?? null : null,
        rows: plan.surface === 'collection' ? row?.all ?? null : null, starts, stalePublished,
        healthy: plan.surface === 'collection' ? !db.itemSummary.health.error && !db.itemSummary.health.failureReason : null,
        originalReason: ['network', 'lookalike', 'cancel'].includes(terminal) ? error === (terminal === 'cancel' ? reason : provided) : null,
        diagnostics: unexpectedDiagnostics.map(parts => parts.map(String).join(' ')) };
    } catch (error) { result = { unexpected: error instanceof Error ? { name: error.name, message: error.message } : String(error), starts, outcome: outcome?.kind }; }
    finally {
      // Record the owed result before cleanup. Each release remains independent
      // so a failing resource cannot erase that checkpoint or strand globals.
      const diagnosticCount = diagnostics.length;
      await withOracleCleanup(async () => { observe('recovery', result); }, [
        async () => { for (const gate of gates) gate.resolve(); await pending; },
        async () => { subscription?.unsubscribe(); },
        async () => { await view?.cleanup(); },
        async () => { await db?.itemSummary.cleanup(); },
        async () => { db?.queryClient.clear(); },
        async () => { if (diagnostics.length > diagnosticCount) throw new AggregateError(diagnostics.slice(diagnosticCount), 'Recovery cleanup diagnostics'); },
        async () => { console.error = originalConsoleError; },
        ...[...descriptors].map(([key, descriptor]) => async () => { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else Reflect.deleteProperty(globalThis, key); }),
      ]);
    }
  },
  check: (_plan, trace, expected) => differs('recovery', 'active Studio read recovery', trace.find(entry => entry.checkpoint === 'recovery')?.value, expected) ?? pass,
  calibrations: [
    { name: 'supersession-strands-active-view', law: 'active Studio read recovery', history: { constructed: 'unrelated-write-initial-view' }, corrupt: trace => trace.map(entry => entry.checkpoint === 'recovery' ? { ...entry, value: { ...(entry.value as object), outcome: 'AbortError: Read superseded', rows: null, healthy: false } } : entry) },
    { name: 'unrelated-diagnostic-containing-zero', law: 'active Studio read recovery', history: { constructed: 'falsy-cancellation-keeps-identity' }, corrupt: trace => trace.map(entry => entry.checkpoint === 'recovery' ? { ...entry, value: { ...(entry.value as object), diagnostics: ['Unrelated failure 0'] } } : entry) },
  ],
});

// The effective Request signal can change between the SDK's typed rejection
// and the adapter's catch. That cut must terminate before another raw attempt;
// an explicit null signal instead detaches cancellation from the input Request.
const cancellationHistories = fc.record({ signal: fc.constantFrom('request', 'override', 'detached'), reason: fc.constantFrom(0, false, null, 'cancelled'), value: fc.nat(1000) });
type CancellationPlan = typeof cancellationHistories extends fc.Arbitrary<infer T> ? T : never;
oracleProperty({
  id: 'studio-read-recovery-cancellation', owns: ['src/ui/read-recovery.ts#recoverStudioReads'],
  law: {
    statement: 'For every Studio recovery whose effective caller signal aborts after an SDK supersession, the original reason settles the caller before another SDK attempt; RequestInit signal overrides and detaches the input Request signal according to Fetch semantics.',
    authority: 'Decision by Kyle Mathews (GitHub KyleAMathews), 2026-11-18: recovery preserves original cancellation reason and starts no further work; Fetch Request(input, init) signal semantics.',
    limits: 'Real raw conditional SDK and recovery adapter, controlled local HTTP peer. Cancellation occurs at the rejection-to-recovery handoff; direct and collection transport receiving paths are checked separately.',
  },
  histories: { arbitrary: cancellationHistories, runs: 25, fixedSeeds: [20261118], states: ['request-signal', 'override-signal', 'detached-signal'], constructed: (['request', 'override', 'detached'] as const).map(signal => ({ name: `${signal}-at-handoff`, enters: [`${signal}-signal`], build: (h: CancellationPlan): CancellationPlan => ({ ...h, signal }) })) },
  // The effective signal, not the old Request's signal, decides liveness.
  model: (plan: CancellationPlan) => ({ attempts: plan.signal === 'detached' ? 2 : 1, outcome: plan.signal === 'detached' ? 'success' : 'cancel', originalReason: plan.signal === 'detached' ? null : true }),
  driver: async (plan, observe) => {
    const requestController = new AbortController(), override = new AbortController();
    const entered = deferred(), reply = deferred();
    let attempts = 0, outcome: unknown;
    const raw = conditionalReadFetch('https://recovery.test/api/', async request => {
      const r = request as Request;
      if (r.method === 'GET' && attempts === 1) { entered.resolve(); await reply.promise; }
      return Response.json(summary(plan.value), { headers: { ETag: '"handoff"' } });
    });
    const recovering = recoverStudioReads(async (input, init) => {
      attempts++;
      try { return await raw(input, init); }
      catch (error) {
        (plan.signal === 'override' ? override : requestController).abort(plan.reason);
        throw error;
      }
    });
    const input = new Request('https://recovery.test/api/items/summary', { signal: requestController.signal });
    const init = plan.signal === 'override' ? { signal: override.signal } : plan.signal === 'detached' ? { signal: null } : undefined;
    const pending = recovering(input, init).then(() => { outcome = { attempts, outcome: 'success', originalReason: null }; }, error => { outcome = { attempts, outcome: 'cancel', originalReason: error === plan.reason }; });
    try {
      await ready(entered.promise);
      await raw(new Request('https://recovery.test/api/browse', { method: 'POST' }));
      reply.resolve(); await ready(pending);
      observe('reach', `${plan.signal}-signal`);
      observe('handoff', outcome);
    } finally { reply.resolve(); await pending; }
  },
  check: (_plan, trace, expected) => differs('handoff', 'cancel before recovery', trace.find(entry => entry.checkpoint === 'handoff')?.value, expected) ?? pass,
  calibrations: [{ name: 'cancelled-reader-reacquires', law: 'cancel before recovery', history: { constructed: 'request-at-handoff' }, corrupt: trace => trace.map(entry => entry.checkpoint === 'handoff' ? { ...entry, value: { ...(entry.value as object), attempts: 2 } } : entry) }],
});
