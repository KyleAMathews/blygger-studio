import type { OperationDefinition } from './operations.ts';
import type { OperationContext, OperationInput } from './operation-types.ts';
import { success } from './operation-types.ts';
import { runOperation } from './operation-runner.ts';
import { operationHttp } from './operation-http.ts';
import { readChanges, type ChangeSnapshot } from './changes.ts';
import { representationEtag, conditionalResponse } from './http-response.ts';

// Only reads whose dependencies have change_state triggers may skip their
// handlers. Other GETs still receive exact representation validators.
// Item detail/history include post-publication change_class records. Reading
// and its summary can depend on imported_mentions backfills. Those tables do
// not advance change_state, so these projections always render before hashing.
const revisionReads = new Set([
  'listItems', 'getItemSummary', 'getVersion',
  'getSettings', 'getShelf', 'listSubscriptions', 'getSubscription',
  'listHoppers', 'getHopper', 'listHopperMemberships', 'listSignals',
  'listInteractions', 'listThumbs', 'getSignalSummary', 'listMentions',
  'listMentionGroups', 'getMentionSummary',
  'listImportedReading', 'getImportedItem', 'listBrowse', 'getMentionSource',
]);
type Stamp = { revision: string; etag: string };
const validators = new WeakMap<D1Database, Map<string, Stamp>>();

/** Shared direct/batch HTTP adapter. The wrapped handler runs only after the
 * runner's scopes, quotas, feature checks, and input parsing. Metadata retains
 * hashes only, never private bodies, and is discarded with the isolate. */
export async function conditionalOperation(definition: OperationDefinition, input: OperationInput, context: OperationContext, ifNoneMatch?: string, identityDb = context.env.DB) {
  if (definition.route.method !== 'get') return operationHttp(await runOperation(definition, input, context), context.url, context.env);
  let cache = validators.get(identityDb);
  if (!cache) { cache = new Map(); validators.set(identityDb, cache); }
  const key = JSON.stringify([context.url, context.access]);
  const revisioned = revisionReads.has(definition.route.operationId!);
  let stable: string | undefined, matched: string | undefined;
  const request = new Request(context.url, { headers: ifNoneMatch ? { 'If-None-Match': ifNoneMatch } : {} });
  const matches = (etag: string) => conditionalResponse(request, new Response(null, { headers: { ETag: etag } })).status === 304;
  const wrapped: OperationDefinition = { ...definition, handler: async (ctx, parsed) => {
    // All counters deliberately participate: a wider dependency invalidates
    // more often but can never hide a related domain's change.
    const snapshot: ChangeSnapshot | undefined = revisioned ? { before: await readChanges(ctx.env.DB) } : undefined;
    const before = snapshot ? JSON.stringify(snapshot.before) : undefined;
    const previous = cache.get(key);
    if (before && previous?.revision === before && ifNoneMatch && matches(previous.etag)) {
      matched = previous.etag;
      return success(null);
    }
    const result = await definition.handler({ ...ctx, conditionalSnapshot: snapshot }, parsed);
    // Cursor handlers return directly after their projection. Their completed
    // full snapshot brackets that same work without two duplicate D1 rounds.
    if (result.ok && snapshot && before === JSON.stringify(snapshot.after ?? await readChanges(ctx.env.DB))) stable = before;
    return result;
  } };
  const encoded = operationHttp(await runOperation(wrapped, input, context), context.url, context.env);
  if (encoded.status !== 200) return encoded;
  const etag = matched ?? await representationEtag(new TextEncoder().encode(JSON.stringify(encoded.body)).buffer as ArrayBuffer);
  if (stable) {
    cache.delete(key); cache.set(key, { revision: stable, etag });
    if (cache.size > 1000) cache.delete(cache.keys().next().value!);
  }
  const headers = { ...encoded.headers, ETag: etag, 'Cache-Control': 'private, no-cache' };
  return matched || matches(etag) ? { status: 304 as const, body: null, headers } : { ...encoded, headers };
}
