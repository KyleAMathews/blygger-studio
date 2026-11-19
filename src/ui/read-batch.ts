import { BlyggerApi, createBlyggerClient, unwrap } from '../../sdk/dist/browser.js';
import { zBatchReadResponse } from '../../sdk/dist/schemas.js';
import { READ_BATCH_MAX, READ_BATCH_PATHS, type ReadBatchOperation, type ReadBatchInput } from '../read-batch-policy.ts';

type Child = { request: Request; input: ReadBatchInput; resolve: (response: Response) => void; reject: (error: unknown) => void };

/** Batch transport only. Collection predicates, schemas, and cursors stay with
 * their existing query functions and server operations. Never cache results. */
export function createReadBatchFetch(apiBase: string, fetcher: typeof fetch = (input, init) => globalThis.fetch(input, init)): typeof fetch {
  const base = new URL(apiBase.endsWith('/') ? apiBase : apiBase + '/');
  const client = createBlyggerClient({ baseUrl: apiBase, fetch: fetcher });
  const patterns = Object.entries(READ_BATCH_PATHS).map(([operation, path]) => ({
    operation: operation as ReadBatchOperation,
    fields: [...path.matchAll(/\{(\w+)\}/g)].map(match => match[1]),
    pattern: new RegExp('^' + path.replace(/\{\w+\}/g, '([^/]+)') + '$'),
  }));
  // Keep only the current microtask's queue. Completed batches retain neither
  // request keys nor DataLoader's last-batch/cache references.
  const queues = new Map<ReadBatchOperation, Child[]>();

  async function dispatch(operation: ReadBatchOperation, children: Child[]) {
    const controller = new AbortController(), selected = children.filter(child => !child.request.signal.aborted);
    if (!selected.length) return;
    const active = new Set(selected), listeners = new Map<Child, () => void>();
    for (const child of selected) {
      const listener = () => {
        child.request.signal.removeEventListener('abort', listener);
        active.delete(child);
        if (!active.size) controller.abort();
      };
      listeners.set(child, listener);
      child.request.signal.addEventListener('abort', listener);
    }
    try {
      const first = selected[0].request;
      const results = zBatchReadResponse.parse(await unwrap(BlyggerApi.batchRead({ client,
        headers: Object.fromEntries([...first.headers].filter(([name]) => name !== 'if-none-match')), credentials: first.credentials, mode: first.mode, redirect: first.redirect,
        cache: first.cache, referrer: first.referrer, referrerPolicy: first.referrerPolicy,
        body: { operation, requests: selected.map(child => child.input) }, signal: controller.signal,
      })));
      if (results.length !== selected.length) throw new Error('Read batch response length mismatch');
      const responses = results.map(result => new Response([204, 205, 304].includes(result.status) ? null : JSON.stringify(result.body), {
        status: result.status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...result.headers },
      }));
      selected.forEach((child, index) => child.resolve(responses[index]));
    } catch (error) {
      const failure = error instanceof Error ? error : new Error(String(error));
      selected.forEach(child => child.reject(failure));
    } finally {
      for (const [child, listener] of listeners) child.request.signal.removeEventListener('abort', listener);
    }
  }

  function enqueue(operation: ReadBatchOperation, child: Child) {
    const queued = queues.get(operation);
    if (queued) { queued.push(child); return; }
    const children = [child];
    queues.set(operation, children);
    // Browser timers can be throttled in hidden tabs. Ready peers dispatch in
    // this microtask; later arrivals belong to a fresh queue.
    queueMicrotask(() => {
      queues.delete(operation);
      for (let start = 0; start < children.length; start += READ_BATCH_MAX) {
        const groups = new Map<string, Child[]>();
        for (const child of children.slice(start, start + READ_BATCH_MAX)) {
          const request = child.request;
          const key = JSON.stringify([[...request.headers].filter(([name]) => name !== 'if-none-match').sort(), request.credentials, request.mode, request.redirect,
            request.cache, request.referrer, request.referrerPolicy]);
          const group = groups.get(key) ?? [];
          group.push(child); groups.set(key, group);
        }
        for (const group of groups.values()) void dispatch(operation, group);
      }
    });
  }

  return (input, init) => {
    const request = new Request(input, init), url = new URL(request.url);
    if (request.method !== 'GET' || url.origin !== base.origin || !url.pathname.startsWith(base.pathname) ||
        request.integrity || request.keepalive || [...request.headers.keys()].some(key => key.startsWith('if-') && key !== 'if-none-match' || key === 'range') ||
        new Set(url.searchParams.keys()).size !== [...url.searchParams].length) return fetcher(request);
    const path = '/' + url.pathname.slice(base.pathname.length);
    // This literal route precedes /items/{id}; it is not a point item read.
    if (path === '/items/summary') return fetcher(request);
    const match = patterns.map(entry => ({ ...entry, match: entry.pattern.exec(path) })).find(entry => entry.match);
    if (!match) return fetcher(request);
    const params: Record<string, string> = {};
    try { match.fields.forEach((field, index) => { params[field] = decodeURIComponent(match.match![index + 1]); }); }
    catch { return fetcher(request); }
    const body: ReadBatchInput = { path: params, query: Object.fromEntries(url.searchParams), ...(request.headers.has('if-none-match') ? { ifNoneMatch: request.headers.get('if-none-match')! } : {}) };
    return new Promise<Response>((resolve, reject) => {
      if (request.signal.aborted) { reject(request.signal.reason); return; }
      const cleanup = () => request.signal.removeEventListener('abort', abort);
      const abort = () => { cleanup(); reject(request.signal.reason); };
      request.signal.addEventListener('abort', abort);
      enqueue(match.operation, { request, input: body,
        resolve: response => { cleanup(); resolve(response); },
        reject: error => { cleanup(); reject(error); },
      });
    });
  };
}
