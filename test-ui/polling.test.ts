import { expect, it, vi } from 'vitest';
import { QueryClient } from '@tanstack/query-core';
import { Polling } from '../src/ui/polling.ts';

it('keeps canceled polls quiet, allows the next read, and reports real failures', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const report = vi.fn();
  const poll = new Polling(() => true, report);
  let entered!: () => void;
  const started = new Promise<void>(resolve => { entered = resolve; });
  let release!: (value: string) => void;
  const held = new Promise<string>(resolve => { release = resolve; });
  const failure = new Error('read failed');
  let mode: 'hold' | 'success' | 'fail' = 'hold';
  poll.watch('items', () => client.fetchQuery({
    queryKey: ['items'],
    staleTime: 0,
    queryFn: () => {
      if (mode === 'hold') { entered(); return held; }
      if (mode === 'fail') throw failure;
      return 'fresh';
    },
  }));

  const pending = poll.refresh();
  try {
    await started;
    await client.cancelQueries({ queryKey: ['items'] });
    release('stale');
    await pending;
    expect(report).not.toHaveBeenCalled();
    expect(client.getQueryData(['items'])).toBeUndefined();

    mode = 'success';
    await poll.refresh();
    expect(client.getQueryData(['items'])).toBe('fresh');
    expect(report).not.toHaveBeenCalled();

    mode = 'fail';
    await poll.refresh();
    expect(report).toHaveBeenCalledExactlyOnceWith(failure);
    expect(client.getQueryData(['items'])).toBe('fresh');
  } finally {
    release('stale');
    await pending;
    client.clear();
  }
});
