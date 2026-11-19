/**
 * The public SDK preserves an eligible call's original pre-aborted reason and
 * does no transport work. Its conditional-read option also preserves native
 * Fetch selection: an injected fetch stays selected, while the default follows
 * the current global fetch at each acquisition.
 *
 * ```ts
 * unwrap(BlyggerApi.getItemSummary({ client, signal })) // → rejects false when signal.reason is false
 * BlyggerApi.getItemSummary({ client, signal }) // → rejects the original pre-aborted reason, including raw result modes
 * BlyggerApi.getItemSummary({ client }) // → uses current global fetch when none was injected
 * ```
 *
 * A cancellation reason can be false without becoming an empty error object.
 * Installing a fetch observer after creating a client still observes later
 * requests. Decision by Kyle Mathews (GitHub KyleAMathews), 2026-11-18:
 * eligible pre-aborted reads reject with the original reason before transport.
 * For every opted-in client, Fetch defaults retain the ordinary SDK lifetime.
 * A passthrough request retains generated fields/data/throw and optional unwrap
 * error modes, including a custom fetch that returns HTTP despite cancellation.
 * Decision by Kyle Mathews (GitHub KyleAMathews), 2026-11-19: getChanges stays
 * available with its original raw contract for Studio0.65 and0.66; removal is
 * Studio0.67/API6. Deprecation does not enroll it in resource validation.
 * BlyggerApi.getChanges({ client }) returns each current no-store change state;
 * controlled raw304/error responses retain their status and generated fields.
 *
 * These are public generated-method receiving drivers, rather than direct
 * conditionalReadFetch calls. The models use only caller choices. Controlled
 * transports return valid summaries; no real network or Worker claim is made.
 */
import fc from 'fast-check';
import { differs, oracleProperty, pass } from '@tanstack/oracles';
import { BlyggerApi, BlyggerApiError, createBlyggerClient, unwrap } from '../sdk/index.ts';

const summary = (all: number) => ({ all, drafts: 0, changes: 0, public: all, withdrawn: 0 });
const reasonKinds = ['false', 'zero', 'negative-zero', 'empty', 'null', 'nan', 'string', 'object'] as const;
const modes = ['unwrap', 'throw', 'fields', 'data'] as const;
const abortHistories = fc.record({
  reasonKind: fc.constantFrom(...reasonKinds),
  text: fc.string({ unit: 'binary', maxLength: 24 }),
  mode: fc.constantFrom(...modes),
  condition: fc.constantFrom('aborted', 'active', 'network', 'setup'),
  value: fc.integer({ min: 0, max: 10000 }),
});

// The legacy operation remains a raw generated GET while resource polling can
// opt into validation. Inspect namespace availability as data: a removed export
// is a contract failure at this boundary, never a module-import/setup failure.
const legacyDomains = ['items', 'reading', 'subscriptions', 'hoppers', 'signals', 'settings', 'feed', 'mentions', 'responses', 'interactions', 'browse', 'shelf'] as const;
const legacyHistories = fc.record({
  conditionalReads: fc.boolean(), mounted: fc.boolean(), epoch: fc.string({ unit: 'binary', maxLength: 24 }),
  domains: fc.record({ items: fc.nat(10000), reading: fc.nat(10000), subscriptions: fc.nat(10000), hoppers: fc.nat(10000), signals: fc.nat(10000), settings: fc.nat(10000), feed: fc.nat(10000), mentions: fc.nat(10000), responses: fc.nat(10000), interactions: fc.nat(10000), browse: fc.nat(10000), shelf: fc.nat(10000) }),
  changed: fc.constantFrom(...legacyDomains),
});
type LegacyHistory = typeof legacyHistories extends fc.Arbitrary<infer History> ? History : never;
const legacyState = (plan: LegacyHistory, changed: boolean) => ({ epoch: plan.epoch, domains: { ...plan.domains, [plan.changed]: plan.domains[plan.changed] + Number(changed) } });
const legacyBase = (plan: LegacyHistory) => `https://sdk-oracle.test${plan.mounted ? '/blyg' : ''}/api`;
const legacyError = { code: 'forbidden', message: 'Controlled legacy denial' };
const legacyValidator = 'W/"opaque-legacy-caller"';
const legacyLaw = 'retained raw changes SDK';
type LegacyOperation = (options: { client: ReturnType<typeof createBlyggerClient>; headers?: Record<string, string> }) => Promise<{ data?: unknown; error?: unknown; response?: Response }>;

oracleProperty({
  id: 'sdk-legacy-changes-window', owns: ['sdk/index.ts#createBlyggerClient', 'sdk/index.ts#unwrap', 'sdk/generated/sdk.gen.ts#getChanges'],
  law: {
    statement: 'For every ordinary or opted-in public SDK client during Studio0.65 and0.66, getChanges remains callable as the original GET /changes and preserves successive no-store ChangeState bodies and raw HTTP status/error fields without automatic validators or304 materialization.',
    authority: 'Decision by Kyle Mathews (GitHub KyleAMathews),2026-11-19: retain /changes and generated getChanges unchanged for two releases, deprecated now, remove in Studio0.67/API6. Original generated operation and ChangeState declarations at1290176^; sdk/README.md raw generated result and conditional opt-in contract.',
    limits: 'Controlled SDK transport, both mounted/unmounted API bases, fields result mode, valid12-domain states, raw304 and403 peers. The Worker receiving owner establishes server auth/no-store behavior; no claim that the legacy server emits304. Declaration/deprecation metadata is checked separately.',
  },
  histories: {
    arbitrary: legacyHistories, runs: 25, fixedSeeds: [20261119],
    states: ['legacy-ordinary', 'legacy-opt-in', 'legacy-mounted', 'legacy-root', 'legacy-fresh-state', 'legacy-raw304', 'legacy-explicit304', 'legacy-raw-error'],
    constructed: [
      { name: 'ordinary-mounted', enters: ['legacy-ordinary', 'legacy-mounted', 'legacy-fresh-state', 'legacy-raw304', 'legacy-explicit304', 'legacy-raw-error'], build: generated => ({ ...generated, conditionalReads: false, mounted: true }) },
      { name: 'opt-in-root', enters: ['legacy-opt-in', 'legacy-root', 'legacy-fresh-state', 'legacy-raw304', 'legacy-explicit304', 'legacy-raw-error'], build: generated => ({ ...generated, conditionalReads: true, mounted: false }) },
    ],
  },
  // Complete bodies come from independently generated input counters; advancing
  // one selected domain distinguishes a fresh second response from a retained
  // first body. Raw statuses are transport inputs, not a server304 promise.
  model: plan => [
    { checkpoint: 'legacy-availability', value: { callable: true } },
    ...Array.from({ length: 5 }, (_, index) => ({ checkpoint: 'legacy-read', value: {
      calls: index + 1,
      request: { url: legacyBase(plan) + '/changes', method: 'GET', emptyBody: true, validator: index === 3 ? legacyValidator : null },
      status: index < 2 ? 200 : index < 4 ? 304 : 403,
      cacheControl: 'no-store', data: index < 2 ? legacyState(plan, index === 1) : undefined,
      error: index === 4 ? legacyError : index >= 2 ? {} : undefined,
    } })),
  ],
  driver: async (plan, observe) => {
    const operation = (BlyggerApi as Record<string, unknown>).getChanges;
    observe('legacy-availability', { callable: typeof operation === 'function' });
    if (typeof operation !== 'function') return;
    const requests: { url: string; method: string; emptyBody: boolean; validator: string | null }[] = [];
    const client = createBlyggerClient({ baseUrl: legacyBase(plan), conditionalReads: plan.conditionalReads,
      fetch: async (input, init) => {
        const request = new Request(input, init), index = requests.length;
        requests.push({ url: request.url, method: request.method, emptyBody: request.body === null, validator: request.headers.get('if-none-match') });
        const headers = { 'Cache-Control': 'no-store' };
        if (index < 2) return Response.json(legacyState(plan, index === 1), { headers });
        if (index < 4) return new Response(null, { status: 304, headers });
        return Response.json(legacyError, { status: 403, headers });
      },
    });
    for (let index = 0; index < 5; index++) {
      let result;
      try { result = await (operation as LegacyOperation)({ client, ...(index === 3 ? { headers: { 'If-None-Match': legacyValidator } } : {}) }); }
      catch (error) { observe('legacy-read', { productionError: error instanceof Error ? { name: error.name, message: error.message } : error, calls: requests.length }); continue; }
      observe('legacy-read', { calls: requests.length, request: requests.at(-1), status: result?.response?.status ?? null,
        cacheControl: result?.response?.headers.get('cache-control') ?? null, data: result?.data, error: result?.error });
    }
    observe('reach', plan.conditionalReads ? 'legacy-opt-in' : 'legacy-ordinary');
    observe('reach', plan.mounted ? 'legacy-mounted' : 'legacy-root');
    for (const state of ['legacy-fresh-state', 'legacy-raw304', 'legacy-explicit304', 'legacy-raw-error']) observe('reach', state);
  },
  check: (_plan, trace, expected) => {
    const entries = trace.filter(entry => entry.checkpoint !== 'reach');
    for (const [index, entry] of entries.entries()) {
      const mismatch = differs(entry.checkpoint, legacyLaw, { checkpoint: entry.checkpoint, value: entry.value }, expected[index]); if (mismatch) return mismatch;
    }
    return differs('legacy SDK completion', legacyLaw, entries.length, expected.length) ?? pass;
  },
  calibrations: [
    { name: 'remove-retained-operation', law: legacyLaw, history: { constructed: 'ordinary-mounted' }, corrupt: trace => trace.map(entry => entry.checkpoint === 'legacy-availability' ? { ...entry, value: { callable: false } } : entry) },
    { name: 'materialize-legacy304', law: legacyLaw, history: { constructed: 'opt-in-root' }, corrupt: trace => { let reads = 0; return trace.map(entry => entry.checkpoint === 'legacy-read' && ++reads === 3 ? { ...entry, value: { ...(entry.value as object), status: 200 } } : entry); } },
  ],
});

const passthroughPaths = ['write', 'unknown-get', 'validator', 'range', 'head'] as const;
const passthroughHistories = fc.record({
  path: fc.constantFrom(...passthroughPaths),
  mode: fc.constantFrom(...modes),
  peer: fc.constantFrom('network', 'http'),
  conditionalReads: fc.boolean(),
  aborted: fc.boolean(),
  text: fc.string({ unit: 'binary', maxLength: 24 }),
  value: fc.integer({ min: 0, max: 10000 }),
});
type PassthroughHistory = typeof passthroughHistories extends fc.Arbitrary<infer History> ? History : never;

// These paths exclude the automatic-validator path by construction: writes,
// unmatched reads, HEAD, or explicit validator/range headers. The controlled
// peer is allowed to return its response despite an aborted signal; a custom
// fetch is a supported caller dependency. Its real409 cannot become an abort.
// Object network reasons avoid asserting any unsupported falsy normalization
// policy outside the approved eligible-read law.
oracleProperty({
  id: 'sdk-passthrough-result-modes',
  owns: ['sdk/index.ts#createBlyggerClient'],
  law: {
    statement: 'For every passthrough request, conditional clients preserve generated raw fields/data and explicit throw/unwrap error modes, including the actual network error or HTTP response supplied by a custom fetch when its signal is already aborted.',
    authority: 'sdk/README.md, Results and errors: generated fields and optional throwing unwrap; Conditional reads: opt-in resource GET validation and explicit If-None-Match retains raw HTTP behavior. The eligible-call cancellation exception does not extend to passthrough requests.',
    limits: 'Controlled object network errors and HTTP409 for writes, unknown GET, explicit If-None-Match, Range and HEAD. No policy about passthrough falsy normalization or whether a real peer honors cancellation is inferred.',
  },
  histories: {
    arbitrary: passthroughHistories, runs: 25, fixedSeeds: [20261118],
    states: [...passthroughPaths.map(path => `passthrough:${path}`), ...modes.map(mode => `result-mode:${mode}`), 'peer:network', 'peer:http', 'aborted-passthrough', 'active-passthrough', 'conditional-passthrough', 'ordinary-passthrough'],
    constructed: [
      ...passthroughPaths.flatMap(path => modes.map(mode => ({
        name: `aborted-${path}-${mode}`, enters: [`passthrough:${path}`, `result-mode:${mode}`, 'peer:network', 'aborted-passthrough', 'conditional-passthrough'],
        build: (generated: PassthroughHistory): PassthroughHistory => ({ ...generated, path, mode, peer: 'network', conditionalReads: true, aborted: true }),
      }))),
      ...modes.map(mode => ({
        name: `aborted-http-${mode}`, enters: [`result-mode:${mode}`, 'peer:http', 'aborted-passthrough', 'conditional-passthrough'],
        build: (generated: PassthroughHistory): PassthroughHistory => ({ ...generated, path: 'validator', mode, peer: 'http', conditionalReads: true, aborted: true }),
      })),
      { name: 'active-passthrough', enters: ['active-passthrough'], build: generated => ({ ...generated, aborted: false }) },
      { name: 'ordinary-passthrough', enters: ['ordinary-passthrough'], build: generated => ({ ...generated, conditionalReads: false }) },
    ],
    fixed: [{ name: 'aborted-explicit-validator-http-fields', history: { path: 'validator', mode: 'fields', peer: 'http', conditionalReads: true, aborted: true, text: 'controlled HTTP failure', value: 1 } }],
  },
  // Only result mode and peer outcome select the answer. Signal cancellation
  // cannot replace a passthrough peer's result; path and opt-in are witnesses
  // that the automatic read-cancellation exception does not apply.
  model: plan => {
    const body = { code: 'probe-error', message: plan.text, value: plan.value };
    if (plan.mode === 'data') return { outcome: 'resolved-data', isUndefined: true, calls: 1 };
    if (plan.mode === 'fields') return plan.peer === 'network'
      ? { outcome: 'resolved-fields', hasRequest: true, status: null, sameNetworkError: true, calls: 1 }
      : { outcome: 'resolved-fields', hasRequest: true, status: 409, body, calls: 1 };
    return plan.peer === 'network'
      ? { outcome: 'rejected-network', sameNetworkError: true, calls: 1 }
      : { outcome: 'rejected-http', wrapped: plan.mode === 'unwrap', status: plan.mode === 'unwrap' ? 409 : null, body, calls: 1 };
  },
  reached: plan => [`passthrough:${plan.path}`, `result-mode:${plan.mode}`, `peer:${plan.peer}`, plan.aborted ? 'aborted-passthrough' : 'active-passthrough', plan.conditionalReads ? 'conditional-passthrough' : 'ordinary-passthrough'],
  driver: async (plan, observe) => {
    const networkError = { network: plan.text, value: plan.value };
    const body = { code: 'probe-error', message: plan.text, value: plan.value };
    const controller = new AbortController();
    if (plan.aborted) controller.abort(networkError);
    let calls = 0;
    const client = createBlyggerClient({ baseUrl: 'https://sdk-oracle.test/api', conditionalReads: plan.conditionalReads, responseStyle: plan.mode === 'data' ? 'data' : 'fields',
      fetch: async () => {
        calls++;
        if (plan.peer === 'network') throw networkError;
        return Response.json(body, { status: 409 });
      },
    });
    const options = { client, signal: controller.signal, throwOnError: plan.mode === 'throw' };
    let pending: Promise<{ data?: unknown; error?: unknown; response?: Response; request?: Request }>;
    switch (plan.path) {
      case 'write': pending = BlyggerApi.createItem({ ...options, body: { contentMd: plan.text, kind: 'fragment' } }); break;
      case 'unknown-get': pending = client.get({ url: '/unregistered-read', signal: controller.signal, throwOnError: plan.mode === 'throw' }); break;
      case 'validator': pending = BlyggerApi.getItemSummary({ ...options, headers: { 'If-None-Match': '"passthrough"' } }); break;
      case 'range': pending = BlyggerApi.getItemSummary({ ...options, headers: { Range: 'bytes=0-9' } }); break;
      case 'head': pending = client.head({ url: '/items/summary', signal: controller.signal, throwOnError: plan.mode === 'throw' }); break;
    }
    try {
      if (plan.mode === 'unwrap') {
        observe('settled', { outcome: 'resolved-unwrapped', data: await unwrap(pending), calls });
      } else {
        const result = await pending;
        observe('settled', plan.mode === 'data'
          ? { outcome: 'resolved-data', isUndefined: result === undefined, calls }
          : plan.peer === 'network'
            ? { outcome: 'resolved-fields', hasRequest: !!result?.request, status: result?.response?.status ?? null, sameNetworkError: Object.is(result?.error, networkError), calls }
            : { outcome: 'resolved-fields', hasRequest: !!result?.request, status: result?.response?.status ?? null, body: result?.error, calls });
      }
    } catch (error) {
      observe('settled', plan.peer === 'network'
        ? { outcome: 'rejected-network', sameNetworkError: Object.is(error, networkError), calls }
        : { outcome: 'rejected-http', wrapped: error instanceof BlyggerApiError, status: error instanceof BlyggerApiError ? error.statusCode : null, body: error instanceof BlyggerApiError ? error.body : error, calls });
    }
  },
  check: (_plan, trace, expected) => {
    // Name the recorded event for a wrong result. Keep completeness unrecorded:
    // a later driver error must not turn a correct partial trace into a kill.
    for (const [index, entry] of trace.entries()) {
      const bad = differs(entry.checkpoint, 'passthrough result mode', [entry.value], index === 0 ? [expected] : []); if (bad) return bad;
    }
    return differs('passthrough settlement count', 'passthrough result mode', trace.length, 1) ?? pass;
  },
  calibrations: [{ name: 'replace-raw-http-with-abort', law: 'passthrough result mode', history: { fixed: 'aborted-explicit-validator-http-fields' },
    corrupt: (trace, plan) => trace.map(entry => ({ ...entry, value: { outcome: 'rejected-http', wrapped: false, status: null, body: { network: plan.text, value: plan.value }, calls: 1 } })) }],
});
type AbortHistory = typeof abortHistories extends fc.Arbitrary<infer History> ? History : never;

// These are caller-provided AbortSignal reasons, not production classifiers.
// Primitive boundaries expose truthiness normalization; the object is an
// identity control, and text varies the nonempty-string positive neighbor.
const abortReason = (plan: AbortHistory): unknown => {
  switch (plan.reasonKind) {
    case 'false': return false;
    case 'zero': return 0;
    case 'negative-zero': return -0;
    case 'empty': return '';
    case 'null': return null;
    case 'nan': return NaN;
    case 'string': return `reason:${plan.text}`;
    case 'object': return { message: plan.text, value: plan.value };
  }
};

// Every primitive reason and public result mode is a leaf of the grammar.
// Constructed histories cover their cross product; active/network neighbors
// distinguish exact cancellation from blanket failure. An undefined reason is
// excluded: native abort(undefined) supplies a DOMException rather than keeping
// undefined, so it is not an original caller reason with this history shape.
const abortConstructions = reasonKinds.flatMap(reasonKind => modes.map(mode => ({
  name: `${reasonKind}-${mode}`,
  enters: [`reason:${reasonKind}`, `mode:${mode}`, 'pre-aborted'],
  build: (generated: AbortHistory): AbortHistory => ({ ...generated, reasonKind, mode, condition: 'aborted' }),
})));

oracleProperty({
  id: 'sdk-public-abort-reason',
  owns: ['sdk/index.ts#createBlyggerClient', 'sdk/index.ts#unwrap'],
  law: {
    statement: 'For every eligible pre-aborted call, every public SDK result mode rejects with the original signal reason before transport; active calls preserve their ordinary data and network-error behavior.',
    authority: 'Kyle Mathews (KyleAMathews), approved pre-aborted-call law, 2026-11-18; sdk/README.md, Conditional reads and Results and errors.',
    limits: 'Controlled summary transport and native AbortController. The reason domain includes falsy primitives, strings and plain-object identity, not symbols/functions or cross-realm host values. In-flight cancellation is owned by the conditional-read oracle.',
  },
  histories: {
    arbitrary: abortHistories, runs: 25, fixedSeeds: [20261118],
    states: ['pre-aborted', 'active-success', 'network-error', 'setup-error', ...reasonKinds.map(kind => `reason:${kind}`), ...modes.map(mode => `mode:${mode}`)],
    constructed: [
      ...abortConstructions,
      { name: 'active-success', enters: ['active-success'], build: generated => ({ ...generated, condition: 'active' as const }) },
      { name: 'network-error', enters: ['network-error'], build: generated => ({ ...generated, condition: 'network' as const }) },
      { name: 'setup-error', enters: ['setup-error'], build: generated => ({ ...generated, condition: 'setup' as const }) },
    ],
    fixed: [{ name: 'false-through-unwrap', history: { reasonKind: 'false', text: '', mode: 'unwrap', condition: 'aborted', value: 1 } }],
  },
  // No cache or generated error machinery is needed to predict this promise:
  // cancellation keeps the caller's exact value; successful data is the peer's
  // supplied summary. Ordinary raw errors retain generated field/data styles.
  model: plan => plan.condition === 'active'
    ? { outcome: 'resolved', data: summary(plan.value), calls: 1 }
    : plan.condition !== 'aborted' && (plan.mode === 'fields' || plan.mode === 'data')
      ? { outcome: 'resolved-error', sameReason: plan.mode === 'fields', calls: plan.condition === 'network' ? 1 : 0 }
      : { outcome: 'rejected', sameReason: true, calls: plan.condition === 'network' ? 1 : 0 },
  reached: plan => plan.condition === 'aborted'
    ? ['pre-aborted', `reason:${plan.reasonKind}`, `mode:${plan.mode}`]
    : [`${plan.condition === 'active' ? 'active-success' : `${plan.condition}-error`}`],
  driver: async (plan, observe) => {
    const controller = new AbortController();
    const reason = plan.condition === 'network' || plan.condition === 'setup' ? { failure: plan.text } : abortReason(plan);
    if (plan.condition === 'aborted') controller.abort(reason);
    let calls = 0;
    const client = createBlyggerClient({ baseUrl: 'https://sdk-oracle.test/api', conditionalReads: true, responseStyle: plan.mode === 'data' ? 'data' : 'fields',
      ...(plan.condition === 'setup' ? { requestValidator: () => { throw reason; } } : {}),
      fetch: async () => {
        calls++;
        if (plan.condition === 'network') throw reason;
        return Response.json(summary(plan.value));
      },
    });
    // Observe identity as a public relation before the trace is copied. A
    // thrown false/null is distinct from either resolution or a replacement {}.
    try {
      const options = { client, signal: controller.signal };
      if (plan.mode === 'data') {
        const result = await BlyggerApi.getItemSummary(options);
        observe('settled', plan.condition === 'network' || plan.condition === 'setup'
          ? { outcome: 'resolved-error', sameReason: result !== undefined, calls }
          : { outcome: 'resolved', data: result, calls });
      } else if (plan.mode === 'unwrap') {
        const data = await unwrap(BlyggerApi.getItemSummary(options));
        observe('settled', { outcome: 'resolved', data, calls });
      } else {
        const result = await BlyggerApi.getItemSummary({ ...options, throwOnError: plan.mode === 'throw' });
        observe('settled', plan.condition === 'network' || plan.condition === 'setup'
          ? { outcome: 'resolved-error', sameReason: Object.is('error' in result ? result.error : undefined, reason), calls }
          : { outcome: 'resolved', data: result.data, calls });
      }
    } catch (error) {
      observe('settled', { outcome: 'rejected', sameReason: Object.is(error, reason), calls });
    }
  },
  check: (_plan, trace, expected) => {
    for (const [index, entry] of trace.entries()) {
      const bad = differs(entry.checkpoint, 'original abort reason', [entry.value], index === 0 ? [expected] : []); if (bad) return bad;
    }
    return differs('SDK settlement count', 'original abort reason', trace.length, 1) ?? pass;
  },
  calibrations: [{ name: 'normalize-false', law: 'original abort reason', history: { constructed: 'false-unwrap' },
    corrupt: trace => trace.map(entry => ({ ...entry, value: { outcome: 'rejected', sameReason: false, calls: 0 } })) }],
});

// unwrap is also owned above: keep its documented HTTP and transport distinction
// visible, rather than allowing an HTTP failure to look like successful data.
// These histories supply generated result fields directly to the maintained
// optional interface. They deliberately make no claim about HTTP parsing.
const unwrapHistories = fc.record({
  kind: fc.constantFrom('success', 'http', 'network'),
  status: fc.integer({ min: 400, max: 599 }),
  data: fc.integer(),
  body: fc.jsonValue(),
});
oracleProperty({
  id: 'sdk-unwrap-result-kind',
  owns: ['sdk/index.ts#unwrap'],
  law: {
    statement: 'For every SDK result, unwrap returns successful data, wraps HTTP failures as BlyggerApiError with the response status and original body, and preserves response-less errors.',
    authority: 'sdk/README.md, Results and errors: returns successful data, throws BlyggerApiError with statusCode and body for HTTP failures, and preserves network/abort errors.',
    limits: 'Maintained unwrap receiving boundary with controlled generated result fields. JSON values cover body identity, without claiming transport parsing or an error-message policy.',
  },
  histories: {
    arbitrary: unwrapHistories, runs: 25, fixedSeeds: [20261118],
    states: ['successful-result', 'http-result', 'network-result'],
    constructed: [
      { name: 'successful-result', enters: ['successful-result'], build: generated => ({ ...generated, kind: 'success' as const }) },
      { name: 'http-result', enters: ['http-result'], build: generated => ({ ...generated, kind: 'http' as const }) },
      { name: 'network-result', enters: ['network-result'], build: generated => ({ ...generated, kind: 'network' as const }) },
    ],
  },
  // Status and original error/body fields fully determine this interface. An
  // independent result-kind model avoids production's response-presence tests.
  model: plan => ({
    success: { outcome: 'resolved', data: plan.data },
    http: { outcome: 'http-error', status: plan.status, sameBody: true },
    network: { outcome: 'transport-error', sameBody: true },
  })[plan.kind],
  reached: plan => [`${plan.kind === 'success' ? 'successful' : plan.kind}-result`],
  driver: async (plan, observe) => {
    const result = { data: plan.data, error: plan.body,
      ...(plan.kind === 'network' ? {} : { response: new Response(null, { status: plan.kind === 'success' ? 200 : plan.status }) }),
    };
    try {
      observe('unwrapped', { outcome: 'resolved', data: await unwrap(Promise.resolve(result)) });
    } catch (error) {
      observe('unwrapped', error instanceof BlyggerApiError
        ? { outcome: 'http-error', status: error.statusCode, sameBody: Object.is(error.body, plan.body) }
        : { outcome: 'transport-error', sameBody: Object.is(error, plan.body) });
    }
  },
  check: (_plan, trace, expected) => {
    for (const [index, entry] of trace.entries()) {
      const bad = differs(entry.checkpoint, 'SDK result kind', [entry.value], index === 0 ? [expected] : []); if (bad) return bad;
    }
    return differs('unwrapped result count', 'SDK result kind', trace.length, 1) ?? pass;
  },
  calibrations: [{ name: 'return-http-error-data', law: 'SDK result kind', history: { constructed: 'http-result' },
    corrupt: (trace, plan) => trace.map(entry => ({ ...entry, value: { outcome: 'resolved', data: plan.data } })) }],
});

const fetchHistories = fc.record({
  conditionalReads: fc.boolean(),
  injected: fc.boolean(),
  replaceBeforeConstruction: fc.boolean(),
  credentials: fc.constantFrom('default', 'same-origin', 'omit', 'include'),
  replacements: fc.array(fc.boolean(), { minLength: 2, maxLength: 4 }),
  value: fc.integer({ min: 0, max: 10000 }),
});
type FetchHistory = typeof fetchHistories extends fc.Arbitrary<infer History> ? History : never;

oracleProperty({
  id: 'sdk-default-fetch-lifetime',
  owns: ['sdk/index.ts#createBlyggerClient'],
  law: {
    statement: 'For every ordinary or conditional-read client, an explicit fetch stays selected and the default fetch follows globalThis.fetch at request time, including replacements after client construction.',
    authority: 'sdk/README.md native Fetch and custom fetch support; generated Config.fetch documents globalThis.fetch as its default. The opt-in conditional-read contract preserves ordinary SDK transport selection (C4 review enforcement, 2026-11-18).',
    limits: 'Controlled successful summary GETs, sequential replacements, and configuration fixed after construction. Does not claim behavior for client.setConfig or per-call fetch overrides.',
  },
  // The axes distinguish opt-in transparency, injected isolation and both
  // replacement lifetimes. Each boolean vector can reconstruct a witness;
  // 2..4 acquisitions bound work. A zero-acquisition history is excluded by
  // minLength, since it makes no transport-selection observation.
  histories: {
    arbitrary: fetchHistories, runs: 25, fixedSeeds: [20261118],
    states: ['conditional-default', 'ordinary-default', 'conditional-injected', 'ordinary-injected', 'replaced-before', 'replaced-after', 'unchanged-global'],
    constructed: [
      ...[false, true].flatMap(conditionalReads => [false, true].map(injected => ({
        name: `${conditionalReads ? 'conditional' : 'ordinary'}-${injected ? 'injected' : 'default'}`,
        enters: [`${conditionalReads ? 'conditional' : 'ordinary'}-${injected ? 'injected' : 'default'}`],
        build: (generated: FetchHistory): FetchHistory => ({ ...generated, conditionalReads, injected, replacements: [false, true] }),
      }))),
      { name: 'before-and-after', enters: ['replaced-before', 'replaced-after', 'unchanged-global'], build: generated => ({ ...generated, replaceBeforeConstruction: true, replacements: [false, true] }) },
    ],
    fixed: [{ name: 'conditional-default-after', history: { conditionalReads: true, injected: false, replaceBeforeConstruction: false, credentials: 'default', replacements: [false, true], value: 1 } }],
  },
  // A transport is a caller-supplied function identified by its returned value.
  // The model keeps only the current global transport number. It does not use
  // client config, conditional-cache state or production's fetch selection.
  model: plan => {
    let current = plan.replaceBeforeConstruction ? 1 : 0;
    return plan.replacements.map((replace, index) => {
      if (replace) current = index + 2;
      const selected = plan.injected ? 9 : current;
      return { selected: [selected], data: summary(plan.value + selected), credentials: [plan.credentials === 'default' ? 'same-origin' : plan.credentials] };
    });
  },
  reached: plan => [
    `${plan.conditionalReads ? 'conditional' : 'ordinary'}-${plan.injected ? 'injected' : 'default'}`,
    ...(plan.replaceBeforeConstruction ? ['replaced-before'] : []),
    ...(plan.replacements.includes(true) ? ['replaced-after'] : []),
    ...(plan.replacements.includes(false) ? ['unchanged-global'] : []),
  ],
  driver: async (plan, observe) => {
    const previousFetch = globalThis.fetch;
    let selected: number[] = [], credentials: RequestCredentials[] = [];
    const transport = (id: number): typeof fetch => async (input, init) => {
      selected.push(id);
      credentials.push(new Request(input, init).credentials);
      return Response.json(summary(plan.value + id));
    };
    try {
      globalThis.fetch = transport(plan.replaceBeforeConstruction ? 1 : 0);
      const client = createBlyggerClient({ baseUrl: 'https://sdk-oracle.test/api', conditionalReads: plan.conditionalReads,
        ...(plan.credentials === 'default' ? {} : { credentials: plan.credentials }),
        ...(plan.injected ? { fetch: transport(9) } : {}),
      });
      for (const [index, replace] of plan.replacements.entries()) {
        if (replace) globalThis.fetch = transport(index + 2);
        selected = []; credentials = [];
        try {
          const data = await unwrap(BlyggerApi.getItemSummary({ client }));
          observe('acquired', { selected, data, credentials });
        } catch (error) {
          observe('acquired', { selected, credentials, error: error instanceof Error ? error.message : error });
        }
      }
    } finally {
      globalThis.fetch = previousFetch;
    }
  },
  check: (_plan, trace, expected) => {
    for (const [index, entry] of trace.entries()) {
      const bad = differs(entry.checkpoint, 'native fetch lifetime', [entry.value], index < expected.length ? [expected[index]] : []); if (bad) return bad;
    }
    return differs('resource acquisition count', 'native fetch lifetime', trace.length, expected.length) ?? pass;
  },
  calibrations: [{ name: 'freeze-construction-fetch', law: 'native fetch lifetime', history: { fixed: 'conditional-default-after' },
    corrupt: trace => trace.map((entry, index) => index === 1 ? { ...entry, value: { selected: [0], data: summary(1), credentials: ['same-origin'] } } : entry) }],
});

// Construction requires an absolute base only for conditional reads. Omission,
// empty text and a relative base are input shapes, not different error policies:
// the contract requires rejection without choosing a message or Error subclass.
const constructionHistories = fc.record({
  conditionalReads: fc.boolean(),
  base: fc.constantFrom('missing', 'empty', 'relative', 'absolute'),
  value: fc.integer({ min: 0, max: 10000 }),
});
type ConstructionHistory = typeof constructionHistories extends fc.Arbitrary<infer History> ? History : never;
oracleProperty({
  id: 'sdk-conditional-construction', owns: ['sdk/index.ts#createBlyggerClient'],
  law: {
    statement: 'For every conditional-read client, construction requires an absolute base URL; ordinary client construction accepts an omitted base URL.',
    authority: 'sdk/README.md, Conditional reads: the absolute baseUrl is required for opt-in conditional reads; documented createBlyggerClient options remain optional for ordinary clients.',
    limits: 'Native HTTP absolute URL and three invalid shapes. Rejects without prescribing an error class or message; ordinary relative URL use is not exercised beyond construction.',
  },
  histories: {
    arbitrary: constructionHistories, runs: 25, fixedSeeds: [20261118],
    states: ['ordinary-missing-base', 'conditional-missing-base', 'conditional-empty-base', 'conditional-relative-base', 'conditional-absolute-base'],
    constructed: [
      { name: 'ordinary-missing', enters: ['ordinary-missing-base'], build: generated => ({ ...generated, conditionalReads: false, base: 'missing' as const }) },
      ...(['missing', 'empty', 'relative', 'absolute'] as const).map(base => ({
        name: `conditional-${base}`, enters: [`conditional-${base}-base`],
        build: (generated: ConstructionHistory): ConstructionHistory => ({ ...generated, conditionalReads: true, base }),
      })),
    ],
  },
  // This is an input-domain predicate, independent of URL validation machinery.
  model: plan => plan.conditionalReads && plan.base !== 'absolute'
    ? { created: false }
    : { created: true, data: plan.conditionalReads ? summary(plan.value) : null },
  reached: plan => plan.conditionalReads ? [`conditional-${plan.base}-base`] : plan.base === 'missing' ? ['ordinary-missing-base'] : [],
  driver: async (plan, observe) => {
    const bases = { missing: undefined, empty: '', relative: 'api', absolute: 'https://sdk-oracle.test/api' };
    try {
      const client = createBlyggerClient({ conditionalReads: plan.conditionalReads,
        ...(plan.base === 'missing' ? {} : { baseUrl: bases[plan.base] }),
        fetch: async () => Response.json(summary(plan.value)),
      });
      observe('constructed', { created: true, data: plan.conditionalReads ? await unwrap(BlyggerApi.getItemSummary({ client })) : null });
    } catch {
      observe('constructed', { created: false });
    }
  },
  check: (_plan, trace, expected) => {
    for (const [index, entry] of trace.entries()) {
      const bad = differs(entry.checkpoint, 'conditional base URL', [entry.value], index === 0 ? [expected] : []); if (bad) return bad;
    }
    return differs('client construction count', 'conditional base URL', trace.length, 1) ?? pass;
  },
  calibrations: [{ name: 'reject-ordinary-missing', law: 'conditional base URL', history: { constructed: 'ordinary-missing' },
    corrupt: trace => trace.map(entry => ({ ...entry, value: { created: false } })) }],
});

// Opt-in is observable at the wire. Ordinary reads do not acquire validators;
// an explicit caller validator keeps raw304 semantics in either client mode.
oracleProperty({
  id: 'sdk-conditional-opt-in', owns: ['sdk/index.ts#createBlyggerClient'],
  law: {
    statement: 'For every resource read, only opted-in clients retain and send validators automatically, while an explicit caller validator preserves raw HTTP304 behavior in either mode.',
    authority: 'sdk/README.md, Conditional reads: opt-in validates and retains ETag/body pairs, ordinary clients expose raw HTTP responses, and explicit If-None-Match keeps raw HTTP behavior.',
    limits: 'Three sequential controlled summary reads; broader cache/context/race behavior belongs to the conditional-read oracle.',
  },
  histories: {
    arbitrary: fc.record({ conditionalReads: fc.boolean(), value: fc.integer({ min: 0, max: 10000 }) }),
    runs: 25, fixedSeeds: [20261118], states: ['automatic-validator', 'ordinary-read', 'explicit-raw-validator'],
    constructed: [
      { name: 'conditional-pair', enters: ['automatic-validator', 'explicit-raw-validator'], build: generated => ({ ...generated, conditionalReads: true }) },
      { name: 'ordinary-pair', enters: ['ordinary-read', 'explicit-raw-validator'], build: generated => ({ ...generated, conditionalReads: false }) },
    ],
  },
  // The caller chooses the raw third validator. Only an opted-in client owes
  // the automatic second validator; both return successful summary data first.
  model: plan => ({ validators: [null, plan.conditionalReads ? `W/"${plan.value}"` : null, `W/"${plan.value}"`], statuses: [200, 200, 304], data: [summary(plan.value), summary(plan.value), undefined] }),
  reached: plan => [plan.conditionalReads ? 'automatic-validator' : 'ordinary-read', 'explicit-raw-validator'],
  driver: async (plan, observe) => {
    const validators: (string | null)[] = [], statuses: (number | null)[] = [], data: unknown[] = [];
    const etag = `W/"${plan.value}"`;
    const client = createBlyggerClient({ baseUrl: 'https://sdk-oracle.test/api', conditionalReads: plan.conditionalReads,
      fetch: async (input, init) => {
        const validator = new Request(input, init).headers.get('if-none-match');
        validators.push(validator);
        return validator === etag ? new Response(null, { status: 304, headers: { ETag: etag } }) : Response.json(summary(plan.value), { headers: { ETag: etag } });
      },
    });
    try {
      for (const explicit of [false, false, true]) {
        const result = await BlyggerApi.getItemSummary({ client, ...(explicit ? { headers: { 'If-None-Match': etag } } : {}) });
        statuses.push(result.response?.status ?? null); data.push(result.data);
      }
      observe('reads', { validators, statuses, data });
    } catch (error) {
      observe('reads', { validators, statuses, data, error: error instanceof Error ? error.message : error });
    }
  },
  check: (_plan, trace, expected) => {
    for (const [index, entry] of trace.entries()) {
      const bad = differs(entry.checkpoint, 'conditional opt-in', [entry.value], index === 0 ? [expected] : []); if (bad) return bad;
    }
    return differs('resource read count', 'conditional opt-in', trace.length, 1) ?? pass;
  },
  calibrations: [{ name: 'wrap-ordinary-client', law: 'conditional opt-in', history: { constructed: 'ordinary-pair' },
    corrupt: (trace, plan) => trace.map(entry => ({ ...entry, value: { ...(entry.value as object), validators: [null, `W/"${plan.value}"`, `W/"${plan.value}"`] } })) }],
});
