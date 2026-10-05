/** Independent cursor/work reference: test/polling-cache-oracle-model.ts.
 * Driver is the production Polling class. Controlled refreshes record installed
 * generations; failures/cancellation never install data. Assertions compare
 * installed values, executed work and retries, not only internal cursors.
 * The real QueryClient receiving tests in this file distinguish a fulfilled
 * cancellation/skipped refetch from installed data. Fixed and random histories
 * use the same bounded grammar; explicit replay bypasses normal campaigns.
 * Limits: no browser clock scheduling or optimistic-editor algorithm replaced.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import fc from 'fast-check';
import { Polling } from '../src/ui/polling.ts';
import { collectionCanAcknowledge, confirmedRefresh } from '../src/ui/poll-refresh.ts';
import { QueryClient } from '@tanstack/query-core';
import { createCollection } from '@tanstack/react-db';
import { queryCollectionOptions } from '@tanstack/query-db-collection';
import { StudioReference, type OracleToken } from '../test/polling-cache-oracle-model.ts';
import { campaign, atCheckpoint } from '../test/oracle-campaign.ts';
import { withOracleCleanup } from '../test/oracle-cleanup.ts';

const token = (revision = 0, epoch = 'e'): OracleToken => ({ epoch, domains: { items: revision, reading: revision, subscriptions: revision, hoppers: revision, signals: revision, settings: revision, feed: revision } });
function deferred() { let resolve!: () => void; const promise = new Promise<void>(done => { resolve = done; }); return { promise, resolve }; }
afterEach(() => vi.useRealTimers());

describe('Studio applied-cursor oracle', () => {
  it('unchanged checks skip data loads but retain timed and unknown reads', async () => {
    let source = token(); const read = vi.fn(async () => source), data = vi.fn(async () => true), timed = vi.fn(async () => true);
    const poll = new Polling(() => true, error => { throw error; }, 15_000, read);
    poll.watch('items', data); poll.watch('updates', timed);
    await poll.refresh(); await poll.refresh(); await poll.refresh();
    expect(read).toHaveBeenCalledTimes(3); expect(data).toHaveBeenCalledTimes(1); expect(timed).toHaveBeenCalledTimes(3);
    source = token(1); await poll.refresh(); expect(data).toHaveBeenCalledTimes(2);
  });
  it('acknowledges the sampled target rather than a newer source after the load', async () => {
    let source = token(1), installed = 0, loads = 0;
    const reference = new StudioReference(), gate = deferred(), entered = deferred();
    const poll = new Polling(() => true, error => { throw error; }, 15_000, async () => structuredClone(source));
    poll.watch('items', async () => { loads++; const captured = source.domains.items; entered.resolve(); await gate.promise; installed = captured; return true; });
    const pending = poll.refresh(); await entered.promise; source = token(2); gate.resolve(); await pending;
    reference.acknowledge('items', { epoch: 'e', revision: 1 }, installed);
    expect(reference.dirty('items', { epoch: 'e', revision: 2 })).toBe(true);
    await poll.refresh(); atCheckpoint('Studio sampled target', () => { expect(installed).toBe(2); expect(loads).toBe(2); });
  });
  it('failed and canceled views retry independently of successful neighbors', async () => {
    const report = vi.fn(); let cancel = true, fail = true, source = token(1);
    const item = vi.fn(async () => !cancel), reading = vi.fn(async () => { if (fail) throw new Error('offline'); return true; }), subscriptions = vi.fn(async () => true);
    const poll = new Polling(() => true, report, 15_000, async () => source);
    poll.watch('items', item); poll.watch('reading:all:0', reading); poll.watch('subscriptions', subscriptions);
    await poll.refresh(); expect(report).toHaveBeenCalledTimes(1);
    cancel = false; fail = false; await poll.refresh();
    atCheckpoint('Studio failed-view retry', () => { expect(item).toHaveBeenCalledTimes(2); expect(reading).toHaveBeenCalledTimes(2); expect(subscriptions).toHaveBeenCalledTimes(1); });
    source = token(2); await poll.refresh(); expect(subscriptions).toHaveBeenCalledTimes(2);
  });
  it('diagnostics refresh subscriptions without loading Reading or hopper detail', async () => {
    let source = token(), reading = 0, hopper = 0, subscriptions = 0;
    const poll = new Polling(() => true, error => { throw error; }, 15_000, async () => source);
    poll.watch('reading:all:0', async () => { reading++; return true; });
    poll.watch('hopper:h', async () => { hopper++; return true; });
    poll.watch('subscriptions', async () => { subscriptions++; return true; });
    await poll.refresh(); source = { ...source, domains: { ...source.domains, subscriptions: 1 } }; await poll.refresh();
    expect([reading, hopper, subscriptions]).toEqual([1, 1, 2]);
  });
  it('coalesces overlapping checks, reloads remounts and reused counters after epoch change', async () => {
    let source = token(1); const gate = deferred(), entered = deferred(), read = vi.fn(async () => { entered.resolve(); await gate.promise; return source; }), refresh = vi.fn(async () => true);
    const poll = new Polling(() => true, error => { throw error; }, 15_000, read);
    const unmount = poll.watch('items', refresh); const a = poll.refresh(), b = poll.refresh(); await entered.promise;
    expect(read).toHaveBeenCalledTimes(1); gate.resolve(); await Promise.all([a, b]); expect(refresh).toHaveBeenCalledTimes(1);
    unmount(); source = token(1, 'restored'); poll.watch('items', refresh); await poll.refresh(); expect(refresh).toHaveBeenCalledTimes(2);
    source = token(1, 'another-restore'); await poll.refresh(); expect(refresh).toHaveBeenCalledTimes(3);
  });
  it('hidden tabs issue no revision reads and recover after a failed revision read', async () => {
    let visible = false, fail = true; const report = vi.fn(), read = vi.fn(async () => { if (fail) throw new Error('check failed'); return token(); }), refresh = vi.fn(async () => true);
    const poll = new Polling(() => visible, report, 15_000, read); poll.watch('items', refresh);
    await poll.refresh(); expect(read).not.toHaveBeenCalled(); visible = true; await poll.refresh(); expect(refresh).not.toHaveBeenCalled();
    fail = false; await poll.refresh(); expect(refresh).toHaveBeenCalledTimes(1); expect(report).toHaveBeenCalledTimes(1);
  });
  it('real QueryClient cancellation and empty refetch do not acknowledge installation', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } }), entered = deferred(), release = deferred();
    client.setQueryData(['items'], [{ id: 'a', text: 'old' }]);
    const loading = confirmedRefresh(client, 'items', () => client.fetchQuery({ queryKey: ['items'], queryFn: async () => { entered.resolve(); await release.promise; return [{ id: 'a', text: 'new' }]; } }));
    await entered.promise; await client.cancelQueries({ queryKey: ['items'] }); release.resolve();
    expect(await loading.catch(() => false)).toBe(false);
    expect(client.getQueryData(['items'])).toEqual([{ id: 'a', text: 'old' }]);
    expect(await confirmedRefresh(client, 'items', async () => {})).toBe(false);
    expect(await confirmedRefresh(client, 'items', () => client.fetchQuery({ queryKey: ['items'], queryFn: async () => [{ id: 'a', text: 'new' }] }))).toBe(true);
    expect(client.getQueryData(['items'])).toEqual([{ id: 'a', text: 'new' }]); client.clear();
  });
  it('real query collection installs refreshed data while preserving a pending local edit', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } }), gate = deferred();
    let text = 'initial', revision = 0;
    const collection = createCollection(queryCollectionOptions<{ id: string; text: string }>({
      id: 'polling-oracle-items', queryKey: ['items'], queryClient: client, getKey: row => row.id,
      queryFn: async () => [{ id: 'a', text }],
      onUpdate: async () => { await gate.promise; text = 'local edit'; },
    }));
    await withOracleCleanup(async () => {
      await collection.preload(); expect(collection.get('a')!.text).toBe('initial');
      const poll = new Polling(() => true, error => { throw error; }, 15_000, async () => token(revision));
      let loads = 0;
      poll.watch('items', () => { loads++; return confirmedRefresh(client, 'items', () => collection.utils.refetch({ throwOnError: true }), () => collectionCanAcknowledge(collection)); });
      await poll.refresh(); const mutation = collection.update('a', draft => { draft.text = 'local edit'; });
      text = 'remote change'; revision++; await poll.refresh();
      expect(client.getQueryData(['items'])).toEqual([{ id: 'a', text: 'remote change' }]);
      expect(collection.get('a')!.text).toBe('local edit');
      gate.resolve(); await mutation.isPersisted.promise; expect(collection.get('a')!.text).toBe('local edit');
      const before = loads; await poll.refresh();
      atCheckpoint('Studio deferred application retry', () => expect(loads).toBe(before + 1));
      await poll.refresh(); expect(loads).toBe(before + 1);
    }, [async () => { gate.resolve(); await collection.cleanup(); }, async () => { client.clear(); }]);
  });
  it('rejects a cursor outrunning installed data', () => {
    const reference = new StudioReference(); expect(() => reference.acknowledge('items', { epoch: 'e', revision: 2 }, 1)).toThrow('acknowledged data older than target');
    reference.acknowledge('items', { epoch: 'e', revision: 1 }, null); expect(reference.dirty('items', { epoch: 'e', revision: 1 })).toBe(true);
    expect(() => reference.acknowledge('items', { epoch: 'e', revision: 1 }, 2, 1)).toThrow('installed data absent from source');
  });
  it('newer load results still acknowledge only the pre-load target', async () => {
    let source = token(1), installed = 0, loads = 0; const entered = deferred(), release = deferred();
    const poll = new Polling(() => true, error => { throw error; }, 15_000, async () => structuredClone(source));
    poll.watch('items', async () => { loads++; entered.resolve(); await release.promise; installed = source.domains.items; return true; });
    const pending = poll.refresh(); await entered.promise; source = token(2); release.resolve(); await pending;
    expect(installed).toBe(2); await poll.refresh(); expect(loads).toBe(2);
  });
  it('an initial request started before the sampled target cannot satisfy its refresh', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } }), entered = deferred(), release = deferred(), refreshStarted = deferred();
    let source = 0, first = true;
    const queryFn = async () => { const revision = source; if (first) { first = false; entered.resolve(); await release.promise; } return [{ id: 'a', revision }]; };
    const initial = client.fetchQuery({ queryKey: ['items'], queryFn }); await entered.promise; source = 1;
    const poll = new Polling(() => true, error => { throw error; }, 15_000, async () => token(source));
    poll.watch('items', () => { refreshStarted.resolve(); return confirmedRefresh(client, 'items', () => client.fetchQuery({ queryKey: ['items'], queryFn })); });
    const pending = poll.refresh(); await refreshStarted.promise; release.resolve(); await Promise.all([initial, pending]);
    atCheckpoint('Studio pre-target flight', () => expect(client.getQueryData(['items'])).toEqual([{ id: 'a', revision: 1 }])); client.clear();
  });
  it('a real collection refetch after an older initial flight installs current data', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } }), entered = deferred(), release = deferred(), refreshing = deferred();
    let source = 0, first = true;
    const collection = createCollection(queryCollectionOptions<{ id: string; revision: number }>({ id: 'initial-flight-oracle', queryKey: ['items'], queryClient: client, getKey: row => row.id,
      queryFn: async () => { const revision = source; if (first) { first = false; entered.resolve(); await release.promise; } return [{ id: 'a', revision }]; },
    }));
    const initial = collection.preload(); await entered.promise; source = 1;
    const poll = new Polling(() => true, error => { throw error; }, 15_000, async () => token(source));
    poll.watch('items', () => { refreshing.resolve(); return confirmedRefresh(client, 'items', () => collection.utils.refetch({ throwOnError: true })); });
    const pending = poll.refresh();
    await withOracleCleanup(async () => {
      await refreshing.promise; release.resolve(); await Promise.all([initial, pending]);
      atCheckpoint('Studio pre-target flight', () => expect(collection.get('a')!.revision).toBe(1));
    }, [async () => { release.resolve(); await collection.cleanup(); }, async () => { client.clear(); }]);
  });
  it('a stalled data view does not stop a healthy view or timed read from polling', async () => {
    const gate = deferred(); let source = token(), healthy = 0, timed = 0;
    const poll = new Polling(() => true, error => { throw error; }, 15_000, async () => source);
    poll.watch('items', async () => { await gate.promise; return true; });
    poll.watch('settings', async () => { healthy++; return true; });
    poll.watch('updates', async () => { timed++; return true; });
    const first = poll.refresh(); await new Promise(resolve => setTimeout(resolve, 0)); source = token(1);
    const second = poll.refresh();
    try {
      await new Promise(resolve => setTimeout(resolve, 0));
      atCheckpoint('Studio independent views', () => { expect(healthy).toBe(2); expect(timed).toBe(2); });
    } finally { gate.resolve(); await Promise.all([first, second]); }
  });
  campaign('studio-polling', fc.array(fc.constantFrom('write', 'poll', 'fail', 'restore'), { minLength: 1, maxLength: 20 }), async actions => {
      let revision = 0, epoch = 'e', fail = false, installed = 0, loads = 0;
      const reference = new StudioReference();
      const poll = new Polling(() => true, () => {}, 15_000, async () => token(revision, epoch));
      poll.watch('items', async () => { loads++; if (fail) throw new Error('controlled'); installed = revision; return true; });
      for (const action of [...actions, 'poll'] as const) {
        if (action === 'write') revision++;
        if (action === 'restore') { epoch += 'r'; revision = 0; }
        if (action === 'fail') fail = !fail;
        if (action === 'poll') {
          const dirty = reference.dirty('items', { epoch, revision }), before = loads;
          await poll.refresh(); atCheckpoint('Studio unchanged work and retry', () => expect(loads - before).toBe(dirty ? 1 : 0));
          if (dirty && !fail) reference.acknowledge('items', { epoch, revision }, revision, revision);
          atCheckpoint('Studio installed values', () => expect(installed).toBe(reference.installed.get('items') ?? 0));
        }
      }
  }, 50);
});
