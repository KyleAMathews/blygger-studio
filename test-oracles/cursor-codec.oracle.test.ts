/**
 * Cursor continuations preserve a static sequence's identity and typed boundary;
 * malformed pagination is rejected as invalid input, and projection completes
 * at one generation. This oracle calls the real cursorPage entry against native
 * SQLite and owns its codec/source/projection helpers.
 *
 * ```ts
 * cursorPage(db, { limit: 1 }, source) // → bounded page and usable continuation
 * cursorPage(db, { cursor: existingV1, limit: 2 }, source) // → following rows
 * cursorPage(db, { cursor: malformed }, source) // → invalid-input
 * cursorPage(db, { cursor }, changedSource) // → invalid-input
 * cursorPage(db, { cursor }, changedGeneration) // → cursor-expired
 * cursorPage(db, { limit: 1 }, projectingSource, snapshot) // → coherent page or cursor-expired
 * ```
 *
 * A valid8192-character continuation must work while an otherwise valid longer
 * token must fail. Invalid revisions and key shapes must be invalid input, not
 * mistaken for an expired generation or an ordinary SQL failure. docs/api.md,
 * Read and poll, defines these boundaries and source/generation binding;
 * src/contract/routes.ts bounds cursors and positive limits. The existing
 * test/cursor-range.test.ts legacyCursor establishes the accepted v1 fixture.
 *
 * The models use input rows, semantic source identity and bounded-array slices.
 * Buffer/base64url and native createHash construct the historical fixture;
 * neither production codec nor SQL keyset builder is imported by a model.
 * Actual SQLite executes all production SQL. Incoming fixture transformations
 * vary one malformed premise at a time; issued tokens are received unchanged.
 * Preparation copies a separate source into the queried derived table;
 * projection writes change that source, so retries owe freshly derived rows.
 * Projection writes distinguish retry from expiry. A supplied snapshot needs
 * a completion proof when stable; after a full-state crossing it may omit that
 * proof so the conditional operation reads afresh. Any supplied proof must name
 * the complete accepted state. Each invocation is captured narrowly at its
 * checkpoint. Setup and cleanup errors remain distinct native failures.
 * Limits: two-row fixtures, finite JSON key values, documented
 * pagination/source identity and up to two projection writes. The companion
 * mixed-key oracle covers full walks.
 */
import fc from 'fast-check';
import { createHash } from 'node:crypto';
import { differs, oracleProperty, pass } from '@tanstack/oracles';
import { cursorPage, type CursorSource, type CursorQuery } from '../src/cursor-page.ts';
import { withOracleCleanup } from '../test/oracle-cleanup.ts';
import { cursorSqlite } from './cursor-sqlite.ts';
import type { Key } from './cursor-keyset-model.ts';
import { readChanges, type ChangeSnapshot } from '../src/changes.ts';

type Row = { id: number; value: Key };
const source: CursorSource<Row> = { name: 'codec-fixture', domains: ['items'], sql: 'SELECT id,value FROM cursor_codec_fixture', order: [{ column: 'value', direction: 'asc' }, { column: 'id', direction: 'asc' }] };
// This is the established legacy input fixture, not an expected answer obtained
// from production. Node's byte/hash primitives differ from the Worker codec.
const identity = (descriptor: CursorSource<Row>) => createHash('sha256').update(JSON.stringify([descriptor.name, descriptor.filters ?? null, descriptor.order, descriptor.domains])).digest('hex');
const legacyValue = (key: Key, descriptor = source) => ({ version: 1, source: identity(descriptor), generation: { epoch: 'codec-epoch', revisions: descriptor.domains.map(() => 0) }, after: [key, 1] });
const token = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
const rawToken = (value: string) => Buffer.from(value).toString('base64url');
const key = fc.oneof(fc.constant(null), fc.double({ noNaN: true, noDefaultInfinity: true }), fc.string({ unit: 'binary', maxLength: 40 }));
const fixture = (value: Key) => cursorSqlite('cursor_codec_fixture', ['id', 'value'], [[1, value], [2, value]]);
type Captured = { ok: true; value: Awaited<ReturnType<typeof cursorPage<Row>>> } | { ok: false; error: unknown };
async function invoke(db: D1Database, query: CursorQuery, descriptor = source): Promise<Captured> {
  try { return { ok: true, value: await cursorPage<Row>(db, query, descriptor) }; }
  catch (error) { return { ok: false, error }; }
}
function failure(error: unknown) {
  if (error && typeof error === 'object' && 'kind' in error && 'code' in error) return { error: { kind: error.kind, code: error.code } };
  return { productionError: error instanceof Error ? { name: error.name, message: error.message } : String(error) };
}
function summarize(result: Captured) {
  if (!result.ok) return failure(result.error);
  const value = result.value;
  if (!value || !Array.isArray(value.items) || !value.page || typeof value.page !== 'object') return { invalidPage: value };
  const cursor = value.page.nextCursor;
  return { items: value.items, limit: value.page.limit, more: cursor !== null,
    usableShape: cursor === null || typeof cursor === 'string' && cursor.length > 0 && cursor.length <= 8192 && /^[A-Za-z0-9_-]+$/.test(cursor) };
}
const invalid = { error: { kind: 'invalid-input', code: 'invalid-input' } };
const expired = { error: { kind: 'conflict', code: 'cursor-expired' } };
const success = (value: Key, ids: number[], limit: number, more: boolean) => ({ items: ids.map(id => ({ id, value })), limit, more, usableShape: true });

const continuationHistories = fc.record({ key, bound: fc.constantFrom('ordinary', 'near', 'exact') });
type ContinuationHistory = typeof continuationHistories extends fc.Arbitrary<infer H> ? H : never;
function continuationKey(plan: ContinuationHistory): Key {
  if (plan.bound === 'ordinary') return plan.key;
  // A valid base64url size is0,2,or3 mod4.8191 and8192 bracket the exact cap.
  const bytes = plan.bound === 'exact' ? 6144 : 6143;
  return 'x'.repeat(bytes - Buffer.byteLength(JSON.stringify(legacyValue(''))));
}
oracleProperty({
  id: 'cursor-codec-continuations', owns: ['src/cursor-page.ts#cursorPage'],
  law: { statement: 'For every static page with a bounded string, finite numeric or null boundary, an issued continuation and the existing v1 continuation both return the following rows, including at the8192-character cursor bound.',
    authority: 'docs/api.md Read and poll: pass nextCursor to receive the next page; src/contract/routes.ts max8192; test/cursor-range.test.ts legacyCursor accepted v1 input and test/cursor-page.test.ts typed/null/Unicode fixture.',
    limits: 'Two equal-key rows with unique numeric ids, native SQLite, one continuation, persisted Unicode scalar strings, finite numbers/null; output token bytes remain opaque.' },
  histories: { arbitrary: continuationHistories, runs: 25, fixedSeeds: [20261118], states: ['numeric-key', 'null-key', 'unicode-key', 'near-bound', 'exact-bound'], constructed: [
    { name: 'zero-key', enters: ['numeric-key'], build: (h): ContinuationHistory => ({ ...h, key: 0, bound: 'ordinary' }) },
    { name: 'null-key', enters: ['null-key'], build: (h): ContinuationHistory => ({ ...h, key: null, bound: 'ordinary' }) },
    { name: 'unicode-key', enters: ['unicode-key'], build: (h): ContinuationHistory => ({ ...h, key: 'é😀\0\ufeff', bound: 'ordinary' }) },
    { name: 'near-bound', enters: ['near-bound'], build: (h): ContinuationHistory => ({ ...h, bound: 'near' }) },
    { name: 'exact-bound', enters: ['exact-bound'], build: (h): ContinuationHistory => ({ ...h, bound: 'exact' }) },
  ] },
  // Full fixture order is id1,id2 because their first keys are equal. The
  // continuation owes id2 regardless of the chosen internal encoding.
  model: plan => { const value = continuationKey(plan); return [success(value, [1], 1, true), success(value, [2], 2, false), success(value, [2], 2, false)]; },
  driver: async (plan, observe) => {
    const value = continuationKey(plan), peer = fixture(value);
    await withOracleCleanup(async () => {
      const first = await invoke(peer.db, { limit: 1 });
      observe('page', summarize(first));
      if (!first.ok || !first.value?.page || typeof first.value.page.nextCursor !== 'string') return;
      observe('page', summarize(await invoke(peer.db, { cursor: first.value.page.nextCursor, limit: 2 })));
      observe('page', summarize(await invoke(peer.db, { cursor: token(legacyValue(value)), limit: 2 })));
      if (typeof value === 'number') observe('reach', 'numeric-key');
      if (value === null) observe('reach', 'null-key');
      if (typeof value === 'string' && value.includes('😀')) observe('reach', 'unicode-key');
      if (first.value.page.nextCursor.length === 8191) observe('reach', 'near-bound');
      if (first.value.page.nextCursor.length === 8192) observe('reach', 'exact-bound');
    }, [async () => { peer.close(); }]);
  },
  check: (_plan, trace, expected) => {
    const pages = trace.filter(entry => entry.checkpoint === 'page');
    for (const [index, entry] of pages.entries()) { const mismatch = differs('page', 'usable typed continuations', entry.value, expected[index]); if (mismatch) return mismatch; }
    return differs('completed pages', 'usable typed continuations', pages.length, expected.length) ?? pass;
  },
  calibrations: [{ name: 'continuation-repeats-first-row', law: 'usable typed continuations', history: { constructed: 'zero-key' }, corrupt: trace => trace.map((entry, index) => entry.checkpoint === 'page' && index === 1 ? { ...entry, value: success(0, [1], 2, false) } : entry) }],
});

const malformed = ['empty', 'padding', 'whitespace', 'base64', 'utf8', 'json', 'root-null', 'root-number', 'version', 'source', 'generation', 'epoch', 'revisions', 'revision-negative', 'revision-fraction', 'revision-unsafe', 'after', 'after-boolean', 'after-object', 'after-infinite', 'after-length', 'oversized'] as const;
const inputHistories = fc.record({ key, defect: fc.constantFrom(...malformed) });
type InputHistory = typeof inputHistories extends fc.Arbitrary<infer H> ? H : never;
function malformedToken(plan: InputHistory, issued: string): string {
  const base = legacyValue(plan.key);
  switch (plan.defect) {
    case 'empty': return '';
    case 'padding': return issued + '=';
    case 'whitespace': return issued + ' \t';
    case 'base64': return 'a';
    case 'utf8': {
      // Keep valid JSON around the bad byte, so replacement decoding would
      // accept a different key instead of failing at an unrelated JSON cut.
      const json = JSON.stringify({ ...base, after: ['utf8-marker', 1] });
      const index = json.indexOf('utf8-marker');
      return Buffer.concat([Buffer.from(json.slice(0, index)), Buffer.from([255]), Buffer.from(json.slice(index + 'utf8-marker'.length))]).toString('base64url');
    }
    case 'json': return rawToken('{');
    case 'root-null': return token(null);
    case 'root-number': return token(1);
    case 'version': return token({ ...base, version: 0 });
    case 'source': return token({ ...base, source: 1 });
    case 'generation': return token({ ...base, generation: null });
    case 'epoch': return token({ ...base, generation: { ...base.generation, epoch: 1 } });
    case 'revisions': return token({ ...base, generation: { ...base.generation, revisions: 1 } });
    case 'revision-negative': return token({ ...base, generation: { ...base.generation, revisions: [-1] } });
    case 'revision-fraction': return token({ ...base, generation: { ...base.generation, revisions: [0.5] } });
    case 'revision-unsafe': return token({ ...base, generation: { ...base.generation, revisions: [Number.MAX_SAFE_INTEGER + 1] } });
    case 'after': return token({ ...base, after: null });
    case 'after-boolean': return token({ ...base, after: [false, 1] });
    case 'after-object': return token({ ...base, after: [{}, 1] });
    case 'after-infinite': return rawToken(JSON.stringify({ ...base, after: ['replace-nonfinite', 1] }).replace('"replace-nonfinite"', '1e999'));
    case 'after-length': return token({ ...base, after: [plan.key] });
    case 'oversized': return token({ ...base, after: ['x'.repeat(8192), 1] });
  }
}
oracleProperty({
  id: 'cursor-codec-inputs', owns: ['src/cursor-page.ts#cursorPage'],
  law: { statement: 'For every malformed raw envelope or invalid required v1 field, reject the continuation as invalid input while preserving the valid issued neighbor.',
    authority: 'docs/api.md Read and poll invalid cursors return invalid-input; src/contract/routes.ts cursor bounds; test/cursor-page.test.ts malformed fixtures and test/cursor-range.test.ts established v1 fixture.',
    limits: 'One malformed premise per input, native SQLite, documented raw/typed v1 fixture boundaries; compatibility of unspecified BOM prefixes and unknown extension fields is not claimed.' },
  histories: { arbitrary: inputHistories, runs: 25, fixedSeeds: [20261118], states: [...malformed], constructed: malformed.map(defect => ({ name: defect, enters: [defect], build: (h: InputHistory): InputHistory => ({ ...h, defect }) })) },
  model: plan => [success(plan.key, [1], 1, true), invalid],
  driver: async (plan, observe) => {
    const peer = fixture(plan.key);
    await withOracleCleanup(async () => {
      const first = await invoke(peer.db, { limit: 1 }); observe('input', summarize(first));
      if (!first.ok || !first.value?.page || typeof first.value.page.nextCursor !== 'string') return;
      const cursor = malformedToken(plan, first.value.page.nextCursor);
      observe('input', summarize(await invoke(peer.db, { cursor, limit: 1 })));
      observe('reach', plan.defect);
    }, [async () => { peer.close(); }]);
  },
  check: (_plan, trace, expected) => {
    const inputs = trace.filter(entry => entry.checkpoint === 'input');
    for (const [index, entry] of inputs.entries()) { const mismatch = differs('input', 'invalid cursor inputs', entry.value, expected[index]); if (mismatch) return mismatch; }
    return differs('completed inputs', 'invalid cursor inputs', inputs.length, expected.length) ?? pass;
  },
  calibrations: [{ name: 'malformed-is-expired', law: 'invalid cursor inputs', history: { constructed: 'revision-negative' }, corrupt: trace => trace.map((entry, index) => entry.checkpoint === 'input' && index === 1 ? { ...entry, value: expired } : entry) }],
});

const sourceChanges = ['same', 'collection', 'filters', 'order', 'direction', 'domains', 'epoch', 'relevant', 'unrelated', 'materialize', 'absent-filter'] as const;
const sourceHistories = fc.record({ key, change: fc.constantFrom(...sourceChanges) });
type SourceHistory = typeof sourceHistories extends fc.Arbitrary<infer H> ? H : never;
const changedSource = (plan: SourceHistory): CursorSource<Row> => ({ ...source,
  ...(plan.change === 'collection' ? { name: 'different-collection' } : {}),
  ...(plan.change === 'filters' ? { filters: ['changed'] } : plan.change === 'absent-filter' ? { filters: null } : {}),
  ...(plan.change === 'order' ? { order: [...source.order].reverse() } : plan.change === 'direction' ? { order: source.order.map(entry => ({ ...entry, direction: 'desc' as const })) } : {}),
  ...(plan.change === 'domains' ? { domains: ['reading'] } : {}), materialize: plan.change === 'materialize' });
oracleProperty({
  id: 'cursor-source-bindings', owns: ['src/cursor-page.ts#cursorPage'],
  law: { statement: 'For every continuation, a changed collection/filter/order/domain identity is invalid input, an epoch or relevant revision change expires it, and unrelated changes or materialization/page-size changes preserve it.',
    authority: 'docs/api.md Read and poll collection/filter/order/epoch/relevant-change binding; test/cursor-page.test.ts binding/expiration and test/cursor-range.test.ts materialized identity witness.',
    limits: 'Canonical descriptors, one changed dimension at a time, one relevant domain, native SQLite; no claim about noncanonical filter object permutations.' },
  histories: { arbitrary: sourceHistories, runs: 25, fixedSeeds: [20261118], states: [...sourceChanges], constructed: sourceChanges.map(change => ({ name: change, enters: [change], build: (h: SourceHistory): SourceHistory => ({ ...h, change }) })) },
  // Compare semantic descriptors, never their production hash or serialized
  // token. Generation changes are separate from source identity failures.
  model: plan => {
    const target = changedSource(plan);
    const sameIdentity = source.name === target.name && JSON.stringify(source.filters ?? null) === JSON.stringify(target.filters ?? null) && JSON.stringify(source.order) === JSON.stringify(target.order) && JSON.stringify(source.domains) === JSON.stringify(target.domains);
    return [success(plan.key, [1], 1, true), !sameIdentity ? invalid : ['epoch', 'relevant'].includes(plan.change) ? expired : success(plan.key, [2], 2, false)];
  },
  driver: async (plan, observe) => {
    const peer = fixture(plan.key);
    await withOracleCleanup(async () => {
      const first = await invoke(peer.db, { limit: 1 }); observe('binding', summarize(first));
      if (!first.ok || !first.value?.page || typeof first.value.page.nextCursor !== 'string') return;
      if (plan.change === 'epoch') peer.epoch('changed-epoch');
      if (plan.change === 'relevant') peer.change('items');
      if (plan.change === 'unrelated') peer.change('settings');
      observe('binding', summarize(await invoke(peer.db, { cursor: first.value.page.nextCursor, limit: 2 }, changedSource(plan))));
      observe('reach', plan.change);
    }, [async () => { peer.close(); }]);
  },
  check: (_plan, trace, expected) => {
    const rows = trace.filter(entry => entry.checkpoint === 'binding');
    for (const [index, entry] of rows.entries()) { const mismatch = differs('binding', 'cursor identity and generation', entry.value, expected[index]); if (mismatch) return mismatch; }
    return differs('completed bindings', 'cursor identity and generation', rows.length, expected.length) ?? pass;
  },
  calibrations: [{ name: 'changed-filter-keeps-cursor', law: 'cursor identity and generation', history: { constructed: 'filters' }, corrupt: trace => trace.map((entry, index) => entry.checkpoint === 'binding' && index === 1 ? { ...entry, value: success(null, [2], 2, false) } : entry) }],
});

const limitHistories = fc.record({ limit: fc.oneof(fc.constant(undefined), fc.double(), fc.string({ maxLength: 12 }), fc.constantFrom(0, 1, 100, 101, 1.5, Infinity, -Infinity, NaN, '1', '100')), key });
type LimitHistory = typeof limitHistories extends fc.Arbitrary<infer H> ? H : never;
oracleProperty({
  id: 'cursor-page-limits', owns: ['src/cursor-page.ts#cursorPage'],
  law: { statement: 'For every cursor query limit, accept exactly a positive integer from1 through100 (default100) and reject other values as invalid input.',
    authority: 'docs/api.md Read and poll positive page limits and invalid pagination; src/contract/routes.ts coerce integer min1 max100; test/cursor-page.test.ts invalid size witnesses.',
    limits: 'Public helper string/number/undefined domain, two static rows, native SQLite; collection-specific lower maximums remain route-owned.' },
  histories: { arbitrary: limitHistories, runs: 25, fixedSeeds: [20261118], states: ['minimum', 'maximum', 'default', 'zero', 'above-maximum', 'fraction', 'nonfinite', 'string'], constructed: [
    ...([{ name: 'minimum', limit: 1 }, { name: 'maximum', limit: 100 }, { name: 'default', limit: undefined }, { name: 'zero', limit: 0 }, { name: 'above-maximum', limit: 101 }, { name: 'fraction', limit: 1.5 }, { name: 'nonfinite', limit: Infinity }, { name: 'string', limit: '1' }] as const).map(value => ({ name: value.name, enters: [value.name], build: (h: LimitHistory): LimitHistory => ({ ...h, limit: value.limit }) })),
  ] },
  // Membership in the documented100 accepted integer values is independent of
  // the implementation's safe-integer guard and handles strings after coercion.
  model: plan => { const limit = plan.limit === undefined ? 100 : Number(plan.limit); return Array.from({ length: 100 }, (_, n) => n + 1).includes(limit) ? success(plan.key, limit === 1 ? [1] : [1, 2], limit, limit === 1) : invalid; },
  driver: async (plan, observe) => {
    const peer = fixture(plan.key);
    await withOracleCleanup(async () => {
      observe('limit', summarize(await invoke(peer.db, { limit: plan.limit })));
      for (const [state, matches] of Object.entries({ minimum: plan.limit === 1, maximum: plan.limit === 100, default: plan.limit === undefined, zero: plan.limit === 0, 'above-maximum': plan.limit === 101, fraction: plan.limit === 1.5, nonfinite: typeof plan.limit === 'number' && !Number.isFinite(plan.limit), string: typeof plan.limit === 'string' })) if (matches) observe('reach', state);
    }, [async () => { peer.close(); }]);
  },
  check: (_plan, trace, expected) => differs('limit', 'bounded positive page limits', trace.find(entry => entry.checkpoint === 'limit')?.value, expected) ?? pass,
  calibrations: [{ name: 'accepts-zero', law: 'bounded positive page limits', history: { constructed: 'zero' }, corrupt: trace => trace.map(entry => entry.checkpoint === 'limit' ? { ...entry, value: success(null, [], 0, false) } : entry) }],
});

// The documented generation bracket covers projection, not just the SELECT.
// A first page may retry once; a continued page must expire instead of mixing
// an old prefix with current rows. The supplied operation snapshot receives a
// completion receipt only after that same bracket has stabilized. A full-state
// crossing may omit the proof and preserve the adapter's fresh-read fallback.
const projectionHistories = fc.record({ value: fc.nat(1000), continuation: fc.boolean(), crossings: fc.integer({ min: 0, max: 2 }), related: fc.boolean(), snapshot: fc.boolean() });
type ProjectionHistory = typeof projectionHistories extends fc.Arbitrary<infer H> ? H : never;
oracleProperty({
  id: 'cursor-projection-generation', owns: ['src/cursor-page.ts#cursorPage'],
  work: { ratio: 1.01 },
  law: { statement: 'For every cursor page, selection and projection share one stable relevant generation; an unstable first page retries once, a continued or repeatedly unstable page expires, and an operation snapshot receives only the accepted completed generation.',
    authority: 'docs/api.md Read and poll stable selected-page/projection generation guard and single first-page retry; test/cursor-page.test.ts projection mutation/retry witnesses; approved shared cursor/validator completion handoff.',
    limits: 'Native SQLite with zero to two controlled writes during projection, relevant items or unrelated settings, optional real operation snapshot; distributed primary/replica behavior is outside this boundary.' },
  histories: { arbitrary: projectionHistories, runs: 25, fixedSeeds: [20261118], states: ['stable', 'first-page-retry', 'repeated-expiry', 'continuation-expiry', 'unrelated-projection-write', 'snapshot-retry', 'snapshot-expiry'], constructed: [
    { name: 'stable', enters: ['stable'], build: (h): ProjectionHistory => ({ ...h, crossings: 0 }) },
    { name: 'first-page-retry', enters: ['first-page-retry'], build: (h): ProjectionHistory => ({ ...h, continuation: false, crossings: 1, related: true }) },
    { name: 'repeated-expiry', enters: ['repeated-expiry'], build: (h): ProjectionHistory => ({ ...h, continuation: false, crossings: 2, related: true }) },
    { name: 'continuation-expiry', enters: ['continuation-expiry'], build: (h): ProjectionHistory => ({ ...h, continuation: true, crossings: 1, related: true }) },
    { name: 'unrelated-projection-write', enters: ['unrelated-projection-write'], build: (h): ProjectionHistory => ({ ...h, crossings: 1, related: false }) },
    { name: 'snapshot-retry', enters: ['snapshot-retry', 'first-page-retry'], build: (h): ProjectionHistory => ({ ...h, continuation: false, crossings: 1, related: true, snapshot: true }) },
    { name: 'snapshot-expiry', enters: ['snapshot-expiry', 'continuation-expiry'], build: (h): ProjectionHistory => ({ ...h, continuation: true, crossings: 1, related: true, snapshot: true }) },
  ] },
  // At most one relevant crossing can be recovered, and only before an initial
  // page. Unrelated writes leave both the selected rows and that premise intact.
  model: plan => {
    const expires = plan.related && plan.crossings > Number(!plan.continuation);
    const projections = 1 + Number(plan.related && plan.crossings > 0 && !plan.continuation);
    const writes = Math.min(plan.crossings, projections), revision = plan.related ? writes : 0;
    const page = expires ? expired : { ...success(plan.value + revision, plan.continuation ? [2] : [1], 1, !plan.continuation), items: (plan.continuation ? [2] : [1]).map(id => ({ id, value: plan.value + revision, projected: true })) };
    return { prime: plan.continuation ? success(plan.value, [1], 1, true) : null,
      // A proof is optional after any full-state crossing: the conditional
      // operation can perform a fresh read instead. Every supplied proof must
      // still name the completed state, including unrelated-domain writes.
      mayOmitReceipt: plan.snapshot && !expires && writes > 0,
      complete: { page, projections, receipt: plan.snapshot && !expires ? { epoch: 'codec-epoch', items: revision, settings: plan.related ? 0 : writes } : null } };
  },
  driver: async (plan, observe) => {
    const peer = fixture(plan.value);
    await withOracleCleanup(async () => {
      peer.execute('CREATE TABLE cursor_codec_source AS SELECT * FROM cursor_codec_fixture');
      // Start behind the source so even a stable first page needs preparation.
      // Only the source changes during projection; a retry must derive again.
      peer.execute('UPDATE cursor_codec_fixture SET value=value-1');
      let cursor: string | undefined, projections = 0;
      const descriptor = { ...source, order: [{ column: 'id', direction: 'asc' as const }],
        prepare: async () => { peer.execute('UPDATE cursor_codec_fixture SET value=(SELECT value FROM cursor_codec_source WHERE cursor_codec_source.id=cursor_codec_fixture.id)'); } };
      if (plan.continuation) {
        const prime = await invoke(peer.db, { limit: 1 }, descriptor); observe('prime', summarize(prime));
        if (!prime.ok || !prime.value?.page || typeof prime.value.page.nextCursor !== 'string') return;
        cursor = prime.value.page.nextCursor;
      }
      const snapshot: ChangeSnapshot | undefined = plan.snapshot ? { before: await readChanges(peer.db) } : undefined;
      let result: Captured;
      try { result = { ok: true, value: await cursorPage<Row>(peer.db, { limit: 1, cursor }, { ...descriptor, project: rows => {
        projections++;
        if (projections <= plan.crossings) {
          peer.change(plan.related ? 'items' : 'settings');
          if (plan.related) peer.execute('UPDATE cursor_codec_source SET value=value+1');
        }
        return rows.map(row => ({ ...row, projected: true }));
      } }, snapshot) }; }
      catch (error) { result = { ok: false, error }; }
      const receipt = snapshot?.after;
      observe('complete', { page: summarize(result), projections, receipt: receipt ? { epoch: receipt.epoch, items: receipt.domains.items, settings: receipt.domains.settings } : null });
      if (!plan.crossings) observe('reach', 'stable');
      if (plan.related && plan.crossings === 1 && !plan.continuation) observe('reach', 'first-page-retry');
      if (plan.related && plan.crossings === 2 && !plan.continuation) observe('reach', 'repeated-expiry');
      if (plan.related && plan.crossings > 0 && plan.continuation) observe('reach', 'continuation-expiry');
      if (!plan.related && plan.crossings > 0) observe('reach', 'unrelated-projection-write');
      if (plan.snapshot && plan.related && plan.crossings === 1 && !plan.continuation) observe('reach', 'snapshot-retry');
      if (plan.snapshot && plan.related && plan.crossings > 0 && plan.continuation) observe('reach', 'snapshot-expiry');
    }, [async () => { peer.close(); }]);
  },
  check: (_plan, trace, expected) => {
    for (const entry of trace.filter(entry => entry.checkpoint === 'prime' || entry.checkpoint === 'complete')) {
      const omitted = expected.mayOmitReceipt && entry.value && typeof entry.value === 'object' && 'receipt' in entry.value && entry.value.receipt === null;
      const owed = entry.checkpoint === 'prime' ? expected.prime : omitted ? { ...expected.complete, receipt: null } : expected.complete;
      const mismatch = differs(entry.checkpoint, 'stable projected cursor generation', entry.value, owed); if (mismatch) return mismatch;
    }
    return differs('completed projection', 'stable projected cursor generation', trace.filter(entry => entry.checkpoint === 'prime' || entry.checkpoint === 'complete').map(entry => entry.checkpoint), expected.prime ? ['prime', 'complete'] : ['complete']) ?? pass;
  },
  calibrations: [
    { name: 'projection-publishes-old-generation', law: 'stable projected cursor generation', history: { constructed: 'snapshot-retry' }, corrupt: trace => trace.map(entry => entry.checkpoint === 'complete' ? { ...entry, value: { ...(entry.value as object), projections: 1 } } : entry) },
    { name: 'projection-supplies-stale-receipt', law: 'stable projected cursor generation', history: { constructed: 'snapshot-retry' }, corrupt: trace => trace.map(entry => entry.checkpoint === 'complete' ? { ...entry, value: { ...(entry.value as object), receipt: { epoch: 'codec-epoch', items: 0, settings: 0 } } } : entry) },
  ],
});
