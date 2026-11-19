/** Query Collection receiving examples for design v3.
 * The generated query-cache oracle is in polling-cache.oracle.test.ts. A conditional resource GET runs inside the real Query
 * Collection queryFn. Independent source history predicts fetches and cached
 * validator/body pairs. Adapter receiving checks cover cancellation,
 * overlapping subsets, initial flights and optimistic edits without inspecting
 * DB internals. The generated oracle retains the fixed/random grammar and budget.
 * Limits: local QueryClient/Collection witnesses, not an atomic paginated SQL
 * snapshot or a claim about the time deferred collection publication completes.
 */
import { describe, expect, it, vi } from 'vitest';
import { QueryClient, type QueryFunction } from '@tanstack/query-core';
import { createCollection, createLiveQueryCollection, and, gte, lt } from '@tanstack/react-db';
import { queryCollectionOptions, parseLoadSubsetOptions } from '@tanstack/query-db-collection';
import { conditionalReadFetch } from '../sdk/conditional-reads.ts';
import { StudioQueryReference, type OracleToken } from '../test/polling-cache-oracle-model.ts';
import { atCheckpoint } from '../test/oracle-campaign.ts';
import { withOracleCleanup } from '../test/oracle-cleanup.ts';

type CachedResponse<T> = { data: T; validator: string | null };
type Context = Parameters<QueryFunction>[0];
const sourceTag = (source: OracleToken, domains: keyof OracleToken['domains'] | readonly (keyof OracleToken['domains'])[]) =>
  '"' + encodeURIComponent(JSON.stringify([source.epoch, [...new Set(typeof domains === 'string' ? [domains] : domains)].sort().map(domain => [domain, source.domains[domain]])])) + '"';
// The old source callback now belongs to a controlled resource peer. The real
// client does one conditional GET; it neither preflights nor reduces counters.
// Extra JSON fixture fields are allowed by the real summary wire schema.
const resources = new WeakMap<QueryClient, { read: typeof fetch; peers: Map<string, ((request: Request) => Promise<Response>)[]> }>();
async function resourceQuery<T>(context: Context, domains: keyof OracleToken['domains'] | readonly (keyof OracleToken['domains'])[], source: QueryFunction<OracleToken>, load: QueryFunction<T>): Promise<CachedResponse<T>> {
  let fixture = resources.get(context.client);
  if (!fixture) {
    const peers = new Map<string, ((request: Request) => Promise<Response>)[]>();
    const read = conditionalReadFetch('https://collection.test/api', async input => {
      const request = new Request(input), peer = peers.get(request.url)?.shift();
      if (!peer) throw new Error('Missing controlled conditional resource peer');
      return peer(request);
    });
    fixture = { read, peers }; resources.set(context.client, fixture);
  }
  const url = `https://collection.test/api/items/summary?subset=${encodeURIComponent(JSON.stringify(context.queryKey))}`;
  const queue = fixture.peers.get(url) ?? []; fixture.peers.set(url, queue);
  // Capture the outgoing request validator at the peer boundary rather than
  // consulting the client's private cache to predict a response.
  queue.push(async request => {
    const validator = request.headers.get('if-none-match');
    const observed = await source(context), etag = sourceTag(observed, domains);
    if (validator === etag) return new Response(null, { status: 304, headers: { ETag: etag } });
    return Response.json({ all: 0, drafts: 0, changes: 0, public: 0, withdrawn: 0, fixture: await load(context) }, { headers: { ETag: etag } });
  });
  const response = await fixture.read(url, { signal: context.signal });
  const body = await response.json() as { fixture: T };
  return { data: body.fixture, validator: response.headers.get('etag') };
}
const token = (revision = 0, epoch = 'e'): OracleToken => ({ epoch, domains: { items: revision, reading: revision, subscriptions: revision, hoppers: revision, signals: revision, settings: revision, feed: revision, mentions: revision, responses: revision, interactions: revision, browse: revision, shelf: revision } });
const makeClient = () => new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
function deferred() { let resolve!: () => void; const promise = new Promise<void>(done => { resolve = done; }); return { promise, resolve }; }
function rowsCollection(client: QueryClient, read: QueryFunction<OracleToken>, load: QueryFunction<{ id: string; revision: number }[]>) {
  return createCollection(queryCollectionOptions({
    queryKey: ['items'], queryClient: client, getKey: (row: { id: string; revision: number }) => row.id,
    queryFn: context => resourceQuery(context, 'items', read, load),
    select: (response: CachedResponse<{ id: string; revision: number }[]>) => response.data,
  }));
}

describe('Studio query-cache oracle', () => {
  it('returns cached rows on unchanged revisions and loads new data only when the source changes', async () => {
    const client = makeClient(); let source = token();
    const read = vi.fn(async () => source), load = vi.fn(async () => [{ id: 'a', revision: source.domains.items }]);
    const collection = rowsCollection(client, read, load);
    await withOracleCleanup(async () => {
      await collection.preload(); const cached = client.getQueryData(['items']);
      await collection.utils.refetch({ throwOnError: true }); await collection.utils.refetch({ throwOnError: true });
      atCheckpoint('Studio unchanged query work', () => { expect(read).toHaveBeenCalledTimes(3); expect(load).toHaveBeenCalledTimes(1); expect(client.getQueryData(['items'])).toBe(cached); });
      source = token(1); await collection.utils.refetch({ throwOnError: true });
      expect(collection.get('a')!.revision).toBe(1); expect(load).toHaveBeenCalledTimes(2);
    }, [() => collection.cleanup(), async () => { client.clear(); }]);
  });
  it('stores the validator paired with a response held while the source changes', async () => {
    const client = makeClient(), entered = deferred(), release = deferred(); let source = token(), first = true;
    const load = vi.fn(async () => { const revision = source.domains.items; if (first) { first = false; entered.resolve(); await release.promise; } return [{ id: 'a', revision }]; });
    const collection = rowsCollection(client, async () => structuredClone(source), load);
    const initial = collection.preload();
    await withOracleCleanup(async () => {
      await entered.promise; source = token(1); release.resolve(); await initial;
      const cached = client.getQueryData<CachedResponse<{ id: string; revision: number }[]>>(['items'])!;
      atCheckpoint('Studio pre-fetch revision', () => expect(cached.validator).toBe(sourceTag(token(0), 'items')));
      await collection.utils.refetch({ throwOnError: true });
      expect(collection.get('a')!.revision).toBe(1); expect(load).toHaveBeenCalledTimes(2);
    }, [async () => { release.resolve(); await initial.catch(() => {}); await collection.cleanup(); }, async () => { client.clear(); }]);
  });
  it('failed content loads retain the cached validator and retry at the same target', async () => {
    const client = makeClient(); let source = token(), fail = false;
    const load = vi.fn(async () => { if (fail) throw new Error('controlled content failure'); return [{ id: 'a', revision: source.domains.items }]; });
    const collection = rowsCollection(client, async () => source, load);
    await withOracleCleanup(async () => {
      await collection.preload(); const old = client.getQueryData(['items']); source = token(1); fail = true;
      await expect(collection.utils.refetch({ throwOnError: true })).rejects.toThrow('controlled content failure');
      atCheckpoint('Studio failed-query retry', () => expect(client.getQueryData(['items'])).toBe(old)); expect(collection.get('a')!.revision).toBe(0);
      fail = false; await collection.utils.refetch({ throwOnError: true });
      atCheckpoint('Studio failed-query retry', () => { expect(collection.get('a')!.revision).toBe(1); expect(load).toHaveBeenCalledTimes(3); });
    }, [() => collection.cleanup(), async () => { client.clear(); }]);
  });
  it('a response joining two domains reloads when either moves and not when another does', async () => {
    const client = makeClient(); let source = token();
    const load = vi.fn(async () => [{ id: 'a', revision: source.domains.mentions + source.domains.reading }]);
    const collection = createCollection(queryCollectionOptions({
      queryKey: ['mention-sources'], queryClient: client, getKey: (row: { id: string; revision: number }) => row.id,
      queryFn: context => resourceQuery(context, ['mentions', 'reading'], async () => source, load),
      select: (response: CachedResponse<{ id: string; revision: number }[]>) => response.data,
    }));
    const bump = (domain: keyof OracleToken['domains']) => { source = { ...source, domains: { ...source.domains, [domain]: source.domains[domain] + 1 } }; };
    await withOracleCleanup(async () => {
      await collection.preload();
      for (const [domain, loads] of [['responses', 1], ['items', 1], ['mentions', 2], ['reading', 3], ['subscriptions', 3]] as const) {
        bump(domain); await collection.utils.refetch({ throwOnError: true });
        atCheckpoint('Studio unchanged query work', () => expect(load, domain).toHaveBeenCalledTimes(loads));
      }
      expect(collection.get('a')!.revision).toBe(2);
    }, [() => collection.cleanup(), async () => { client.clear(); }]);
  });
  it('failed conditional GETs retain rows and retry without a separate preflight cache', async () => {
    const client = makeClient(); let source = token(), fail = false;
    const load = vi.fn(async () => [{ id: 'a', revision: source.domains.items }]);
    const collection = rowsCollection(client, async () => { if (fail) throw new Error('controlled revision failure'); return source; }, load);
    await withOracleCleanup(async () => {
      await collection.preload(); const old = client.getQueryData(['items']); source = token(1); fail = true;
      await expect(collection.utils.refetch({ throwOnError: true })).rejects.toThrow('controlled revision failure');
      expect(client.getQueryData(['items'])).toBe(old); expect(load).toHaveBeenCalledTimes(1);
      fail = false; await collection.utils.refetch({ throwOnError: true }); expect(collection.get('a')!.revision).toBe(1);
    }, [() => collection.cleanup(), async () => { client.clear(); }]);
  });
  it('canceled content reads cannot accept a validator without its response', async () => {
    const client = makeClient(), entered = deferred(), release = deferred(); let source = token(), hold = false;
    const queryFn = (context: Parameters<QueryFunction>[0]) => resourceQuery(context, 'items', async () => source, async () => {
      const revision = source.domains.items; if (hold) { entered.resolve(); await release.promise; } return revision;
    });
    await client.fetchQuery({ queryKey: ['items'], queryFn }); const old = client.getQueryData(['items']); source = token(1); hold = true;
    const pending = client.fetchQuery({ queryKey: ['items'], queryFn, staleTime: 0 });
    // Register the rejection before cancelQueries rejects the fetching promise.
    const canceled = pending.catch(() => undefined);
    await withOracleCleanup(async () => {
      await entered.promise; await client.cancelQueries({ queryKey: ['items'] }); release.resolve(); await canceled;
      expect(client.getQueryData(['items'])).toBe(old); hold = false;
      const next = await client.fetchQuery({ queryKey: ['items'], queryFn, staleTime: 0 });
      atCheckpoint('Studio canceled-query retry', () => expect(next).toEqual({ data: 1, validator: sourceTag(token(1), 'items') }));
    }, [async () => { release.resolve(); await canceled; client.clear(); }]);
  });
  it('opaque validators travel with their response; restored identities invalidate reused values', async () => {
    const client = makeClient(); let source = token(1), newer = true;
    const load = vi.fn(async () => { if (newer) { newer = false; source = token(2); } return [{ id: 'a', revision: source.domains.items }]; });
    const collection = rowsCollection(client, async () => structuredClone(source), load);
    await withOracleCleanup(async () => {
      await collection.preload(); expect(collection.get('a')!.revision).toBe(2);
      expect(client.getQueryData<CachedResponse<unknown>>(['items'])!.validator).toBe(sourceTag(token(1), 'items'));
      await collection.utils.refetch({ throwOnError: true }); expect(load).toHaveBeenCalledTimes(2);
      source = token(2, 'restore'); await collection.utils.refetch({ throwOnError: true }); expect(load).toHaveBeenCalledTimes(3);
      client.removeQueries({ queryKey: ['items'], exact: true }); await collection.utils.refetch({ throwOnError: true }); expect(load).toHaveBeenCalledTimes(3);
    }, [() => collection.cleanup(), async () => { client.clear(); }]);
  });
  it('each queryFn makes a conditional resource GET without another query cache', async () => {
    const client = makeClient(), release = deferred(), entered = deferred();
    const read = vi.fn(async () => { entered.resolve(); await release.promise; return token(); });
    const queryFn = (context: Parameters<QueryFunction>[0]) => resourceQuery(context, 'items', read, async () => ['row']);
    const a = client.fetchQuery({ queryKey: ['items', 'a'], queryFn }), b = client.fetchQuery({ queryKey: ['items', 'b'], queryFn });
    await withOracleCleanup(async () => {
      await entered.promise; expect(read).toHaveBeenCalledTimes(2); release.resolve(); await Promise.all([a, b]);
      expect(client.getQueriesData({ queryKey: ['items'] })).toHaveLength(2);
      expect(client.getQueryCache().findAll()).toHaveLength(2);
    }, [async () => { release.resolve(); await Promise.allSettled([a, b]); client.clear(); }]);
  });
  it('Query Collection preserves a local edit while its cached remote response is refreshed', async () => {
    const client = makeClient(), release = deferred(); let source = token(), text = 'initial';
    const load = vi.fn(async () => [{ id: 'a', text }]);
    const collection = createCollection(queryCollectionOptions({
      queryKey: ['items'], queryClient: client, getKey: (row: { id: string; text: string }) => row.id,
      queryFn: context => resourceQuery(context, 'items', async () => source, load),
      select: (response: CachedResponse<{ id: string; text: string }[]>) => response.data,
      onUpdate: async ({ collection }) => { await release.promise; text = 'local edit'; source = token(2); await collection.utils.refetch({ throwOnError: true }); },
    }));
    await withOracleCleanup(async () => {
      await collection.preload(); const mutation = collection.update('a', draft => { draft.text = 'local edit'; });
      source = token(1); text = 'remote change'; await collection.utils.refetch({ throwOnError: true });
      expect(client.getQueryData<CachedResponse<{ text: string }[]>>(['items'])!.data[0].text).toBe('remote change');
      expect(collection.get('a')!.text).toBe('local edit'); const before = load.mock.calls.length;
      await collection.utils.refetch({ throwOnError: true }); expect(load).toHaveBeenCalledTimes(before);
      release.resolve(); await mutation.when('settled'); expect(collection.get('a')!.text).toBe('local edit');
      expect(client.getQueryData<CachedResponse<unknown>>(['items'])!.validator).toBe(sourceTag(token(2), 'items'));
    }, [async () => { release.resolve(); await collection.cleanup(); }, async () => { client.clear(); }]);
  });
  it('on-demand Reading pages cache their exact subsets', async () => {
    const client = makeClient(); let source = token(); const calls: number[] = [];
    const collection = createCollection(queryCollectionOptions({
      queryKey: ['reading', 'all'], queryClient: client, syncMode: 'on-demand', getKey: (row: { id: string; rank: number; revision: number }) => row.id,
      queryFn: context => resourceQuery(context, 'reading', async () => source, async ({ meta }) => {
        const { filters } = parseLoadSubsetOptions(meta?.loadSubsetOptions);
        const start = filters.find(filter => filter.field[0] === 'rank' && filter.operator === 'gte');
        const offset = Number(start?.value ?? 0); calls.push(offset);
        return { offset, items: [{ id: `r${offset}`, rank: offset, revision: source.domains.reading }] };
      }),
      select: (response: CachedResponse<{ offset: number; items: { id: string; rank: number; revision: number }[] }>) => response.data.items,
    }));
    const views = [0, 25].map(offset => createLiveQueryCollection({ query: q => q.from({ row: collection }).where(({ row }) => and(gte(row.rank, offset), lt(row.rank, offset + 25))).orderBy(({ row }) => row.rank) }));
    await withOracleCleanup(async () => {
      await Promise.all(views.map(view => view.preload())); expect(calls.sort()).toEqual([0, 25]);
      await collection.utils.refetch({ throwOnError: true }); expect(calls).toHaveLength(2);
      source = token(1); await collection.utils.refetch({ throwOnError: true }); expect(calls).toHaveLength(4);
      expect([...collection.values()].map(row => row.revision)).toEqual([1, 1]);
    }, [...views.map(view => () => view.cleanup()), () => collection.cleanup(), async () => { client.clear(); }]);
  });
  it('overlapping subsets retain a shared row until its last fetched owner releases it', async () => {
    const client = makeClient(); let revision = 0;
    const collection = createCollection(queryCollectionOptions({
      queryKey: ['reading', 'overlap'], queryClient: client, syncMode: 'on-demand',
      getKey: (row: { id: string; rank: number }) => row.id,
      queryFn: context => resourceQuery(context, 'reading', async () => token(revision), async ({ meta }) => {
        const { filters } = parseLoadSubsetOptions(meta?.loadSubsetOptions);
        const end = filters.find(filter => filter.field[0] === 'rank' && filter.operator === 'lt');
        return revision === 0 || (revision === 1 && end?.value === 50) ? [{ id: 'shared', rank: 0 }] : [];
      }),
      select: (response: CachedResponse<{ id: string; rank: number }[]>) => response.data,
    }));
    const views = [25, 50].map(end => createLiveQueryCollection({ query: q => q.from({ row: collection }).where(({ row }) => and(gte(row.rank, 0), lt(row.rank, end))).orderBy(({ row }) => row.rank) }));
    await withOracleCleanup(async () => {
      await Promise.all(views.map(view => view.preload())); expect(collection.has('shared')).toBe(true);
      revision = 1; await collection.utils.refetch({ throwOnError: true });
      atCheckpoint('Studio subset ownership', () => expect(collection.has('shared')).toBe(true));
      revision = 2; await collection.utils.refetch({ throwOnError: true });
      atCheckpoint('Studio subset ownership', () => expect(collection.has('shared')).toBe(false));
    }, [...views.map(view => () => view.cleanup()), () => collection.cleanup(), async () => { client.clear(); }]);
  });
  it('mutation refetch starts a fresh resource GET even while an older GET is pending', async () => {
    const client = makeClient(), entered = deferred(), release = deferred(); let revision = 0, hold = false, reads = 0;
    const read: QueryFunction<OracleToken> = async () => {
      reads++; const observed = token(revision);
      if (hold) { hold = false; entered.resolve(); await release.promise; }
      return observed;
    };
    const collection = createCollection(queryCollectionOptions({
      queryKey: ['items'], queryClient: client, getKey: (row: { id: string; revision: number }) => row.id,
      queryFn: context => resourceQuery(context, 'items', read, async () => [{ id: 'a', revision }]),
      select: (response: CachedResponse<{ id: string; revision: number }[]>) => response.data,
      onUpdate: async ({ collection }) => { revision = 1; await collection.utils.refetch({ throwOnError: true }); },
    }));
    await collection.preload(); hold = true;
    const earlier = collection.utils.refetch({ throwOnError: true }).catch(() => undefined);
    await withOracleCleanup(async () => {
      await entered.promise; const mutation = collection.update('a', draft => { draft.revision = 1; });
      await mutation.when('settled');
      atCheckpoint('Studio post-write fresh check', () => {
        expect(reads).toBe(3); expect(collection.get('a')!.revision).toBe(1);
        expect(client.getQueryData<CachedResponse<unknown>>(['items'])!.validator).toBe(sourceTag(token(1), 'items'));
      });
      release.resolve(); await earlier;
      expect(collection.get('a')!.revision).toBe(1);
    }, [async () => { release.resolve(); await earlier; await collection.cleanup(); }, async () => { client.clear(); }]);
  });
  it('subscription diagnostics do not fetch Reading when its revision is unchanged', async () => {
    const client = makeClient(); let source = token();
    const load = vi.fn(async () => 0);
    const queryFn = (context: Parameters<QueryFunction>[0]) => resourceQuery(context, 'reading', async () => source, load);
    try {
      await client.fetchQuery({ queryKey: ['reading', 'all', 0], queryFn, staleTime: 0 });
      source = { ...source, domains: { ...source.domains, subscriptions: 1 } };
      await client.fetchQuery({ queryKey: ['reading', 'all', 0], queryFn, staleTime: 0 });
      expect(load).toHaveBeenCalledTimes(1);
    } finally { client.clear(); }
  });
  it('the independent checker rejects different bodies under one validator', () => {
    const reference = new StudioQueryReference();
    reference.receive('items', { etag: 'opaque', value: 1 });
    expect(() => reference.receive('items', { etag: 'opaque', value: 2 })).toThrow('one validator names different representations');
  });

});

describe('Reading subset ownership', () => {
  it('released Reading pages are not fetched on a revision bump', async () => {
    const client = makeClient(); let source = token(); const calls: number[] = [];
    const collection = createCollection(queryCollectionOptions({
      queryKey: ['reading', 'review'], queryClient: client, syncMode: 'on-demand', getKey: (row: { id: string; rank: number; revision: number }) => row.id,
      queryFn: context => resourceQuery(context, 'reading', async () => source, async ({ meta }) => {
        const { filters } = parseLoadSubsetOptions(meta?.loadSubsetOptions);
        const start = filters.find(filter => filter.field[0] === 'rank' && filter.operator === 'gte');
        const offset = Number(start?.value ?? 0); calls.push(offset);
        return [{ id: `r${offset}`, rank: offset, revision: source.domains.reading }];
      }),
      select: (response: CachedResponse<{ id: string; rank: number; revision: number }[]>) => response.data,
    }));
    const views = [0, 25, 50].map(offset => createLiveQueryCollection({ query: q => q.from({ row: collection }).where(({ row }) => and(gte(row.rank, offset), lt(row.rank, offset + 25))).orderBy(({ row }) => row.rank) }));
    await withOracleCleanup(async () => {
      await Promise.all(views.map(view => view.preload())); expect(calls.sort()).toEqual([0,25,50]);
      await views[0].cleanup(); await views[1].cleanup(); calls.length = 0; source = token(1);
      await collection.utils.refetch({ throwOnError: true });
      expect(calls).toEqual([50]); expect([...collection.values()].map(row => row.rank)).toEqual([50]);
    }, [...views.map(view => () => view.cleanup()), () => collection.cleanup(), async () => { client.clear(); }]);
  });
});
