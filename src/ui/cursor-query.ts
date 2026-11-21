import { createCursorPager } from '@tanstack/query-db-collection';
import type { QueryClient, QueryKey } from '@tanstack/query-core';
import { createReadFlight } from './read-flight.ts';
import { BlyggerApiError } from '../../sdk/dist/browser.js';

export interface ApiPage<T> {
  items: T[];
  page: { limit: number; nextCursor: string | null };
}

type FirstPageRead = {
  read: (cursor: string | undefined, signal: AbortSignal) => Promise<ApiPage<unknown>>;
  validate?: (page: ApiPage<unknown>) => void;
  flight?: ReturnType<typeof createReadFlight<ApiPage<unknown>>>;
};

// Query supplies identity and lifetime; reader metadata does not retain it.
const acquisitions = new WeakMap<object, { consumers: number }>();

interface CursorWindowOptions<T> {
  queryClient: QueryClient;
  queryKey: QueryKey;
  window: { offset?: number; limit?: number };
  signal: AbortSignal;
  read: (cursor: string | undefined, signal: AbortSignal) => Promise<ApiPage<T>>;
  revalidate?: boolean;
  validate?: (page: ApiPage<T>) => void;
}

/** Query owns page acquisition. The key identifies a sequence, not a window. */
export async function readCursorWindow<T>(options: CursorWindowOptions<T>): Promise<T[]> {
  return (await readCursorWindowResult(options)).rows;
}

/** Continuation metadata comes from acquired pages, without reading ahead.
 * A zero window acquires nothing, so its continuation availability is unknown. */
export async function readCursorWindowResult<T>(options: CursorWindowOptions<T>): Promise<{ rows: T[]; hasMore: boolean | undefined }> {
  options.signal.throwIfAborted();
  const { offset = 0, limit } = options.window;
  if (!Number.isSafeInteger(offset) || offset < 0 || limit !== undefined &&
      (!Number.isSafeInteger(limit) || limit < 0 || !Number.isSafeInteger(offset + limit)))
    throw new RangeError('Expected a nonnegative finite integer window');
  if (limit === 0) return { rows: [], hasMore: undefined };
  async function acquire() {
    let first: ApiPage<T> | undefined;
    let queryKey = options.queryKey;
    let read = options.read;
    if (options.revalidate) {
      const sourceKey = [...options.queryKey, 'first-source'];
      let source = options.queryClient.getQueryData<FirstPageRead>(sourceKey);
      if (!source) {
        // The key names a sequence, so keep its original page size when a
        // boundary lookup or a larger window supplies a different read closure.
        // Query owns this source's lifetime along with its acquired pages.
        source = { read: options.read, validate: options.validate as FirstPageRead['validate'] };
        options.queryClient.setQueryData(sourceKey, source);
      }
      const selected = source;
      read = selected.read as typeof options.read;
      if (!selected.flight) {
        selected.flight = createReadFlight(async signal => {
          try {
            const page = await selected.read(undefined, signal);
            selected.validate?.(page);
            return page;
          } finally { selected.flight = undefined; }
        });
      }
      first = await selected.flight.read(options.signal) as ApiPage<T>;
      // Continuation cursors name the server generation. The whole first page
      // also distinguishes changed terminal pages. Stable first pages reuse
      // their native pager and previously acquired windows.
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(first)));
      queryKey = [...queryKey, [...new Uint8Array(digest)].map(n => n.toString(16).padStart(2, '0')).join('')];
    }
    const pager = createCursorPager({
      queryClient: options.queryClient,
      queryKey,
      staleTime: Infinity,
      fetchPage: async (cursor, signal) => {
        const result = cursor === undefined && first ? first : await read(cursor, signal);
        options.validate?.(result);
        return { rows: result.items, nextCursor: result.page.nextCursor };
      },
    });
    const query = options.queryClient.getQueryCache().build(options.queryClient,
      options.queryClient.defaultQueryOptions({ queryKey }));
    const key = query;
    type Pages = { pages: { rows: readonly T[]; nextCursor: string | null }[] };
    let accepted = options.queryClient.getQueryData<Pages>(queryKey);
    // Query can remove a successful reusable entry before its waiter resumes.
    // Keep the native representation for this reader, including replacement
    // Query objects for the same key, without rebuilding its page sequence.
    const unsubscribe = options.queryClient.getQueryCache().subscribe(event => {
      if (event.type === 'updated' && event.action.type === 'success' && event.query.queryHash === query.queryHash)
        accepted = event.query.state.data as Pages;
    });
    let acquisition = acquisitions.get(key);
    if (!acquisition) { acquisition = { consumers: 0 }; acquisitions.set(key, acquisition); }
    const selected = acquisition;
    selected.consumers++;
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      options.signal.removeEventListener('abort', abort);
      return --selected.consumers === 0;
    };
    const abort = () => { if (finish()) void query.cancel(); };
    options.signal.addEventListener('abort', abort);
    try {
      const rows = await pager.read(options.window, options.signal);
      // A positive successful native read has accepted a nonempty sequence.
      const pages = accepted!.pages;
      const acquired = pages.reduce((count, page) => count + page.rows.length, 0);
      return { rows, hasMore: acquired > offset + rows.length || pages.at(-1)!.nextCursor !== null };
    }
    finally { unsubscribe(); finish(); }
  }
  try {
    return await acquire();
  } catch (error) {
    if (!(error instanceof BlyggerApiError) || error.statusCode !== 409 ||
        !error.body || typeof error.body !== 'object' || !('code' in error.body) || error.body.code !== 'cursor-expired') throw error;
    // Native Query error state rebuilds the failed sequence from its first
    // page. Revalidated reads also obtain a fresh generation. Retry once.
    return acquire();
  }
}
