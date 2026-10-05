import type { QueryClient, QueryMeta } from '@tanstack/query-core';
import { isCancelledError } from '@tanstack/query-core';
import { parseLoadSubsetOptions } from '@tanstack/query-db-collection';

export function readingOffset(data: unknown, meta: QueryMeta | undefined): number {
  const offset = (data as { offset?: unknown } | undefined)?.offset;
  if (typeof offset === 'number') return offset;
  const subset = parseLoadSubsetOptions(meta?.loadSubsetOptions);
  const start = subset.filters.find(filter => filter.field.join('.') === 'rank' && filter.operator === 'gte');
  return typeof start?.value === 'number' ? start.value : 0;
}

/** The adapter returns at the fetch boundary while a local write blocks sync.
 * Keep the token dirty in that case. This is the single version-sensitive seam
 * into TanStack DB; receiving tests cover its transaction/publication behavior. */
export function collectionCanAcknowledge(collection: {
  _state: { transactions: { values(): Iterable<{ state: string }> } };
  utils: { isError: boolean };
}): boolean {
  return !collection.utils.isError && ![...collection._state.transactions.values()].some(transaction => transaction.state === 'persisting');
}

/** A fulfilled refetch may have been skipped or canceled. Observe the actual
 * query installation counter before allowing Polling to acknowledge its token. */
export async function confirmedRefresh(client: QueryClient, key: string, refresh: () => Promise<unknown>, canAcknowledge: () => boolean = () => true): Promise<boolean> {
  const [kind, id, offset] = key.split(':');
  const queries = client.getQueryCache().findAll({ predicate: query => {
    if (query.queryKey[0] !== kind) return false;
    if (['item', 'hopper', 'hopper-preview', 'reading'].includes(kind) && query.queryKey[1] !== id) return false;
    if (kind === 'reading' && readingOffset(query.state.data, query.meta) !== Number(offset)) return false;
    return true;
  } });
  // An initial request may have started before the sampled token. Joining that
  // old flight would acknowledge stale data as current. Let it settle, then
  // perform a new refetch whose reads start after the target was sampled.
  await Promise.all(queries.filter(query => query.state.fetchStatus === 'fetching').map(query => query.promise?.catch(() => undefined)));
  const unblockedBefore = canAcknowledge();
  const before = queries.map(query => query.state.dataUpdateCount);
  try { await refresh(); } catch (error) { if (isCancelledError(error)) return false; throw error; }
  return unblockedBefore && canAcknowledge() && queries.length > 0 && queries.every((query, i) => query.state.status === 'success' && query.state.fetchStatus === 'idle' && query.state.dataUpdateCount > before[i]);
}
