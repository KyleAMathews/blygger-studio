import { afterEach, expect, test, vi } from 'vitest';
import { scoped } from '../src/ui/scoped.ts';
import { Draft } from '../src/ui/draft.ts';
import { Polling } from '../src/ui/polling.ts';
import { createBlyggerClient } from '../sdk/dist/browser.js';
import { createStudioData } from '../src/ui/data-core.ts';
function deferred() { let resolve!: () => void; const promise = new Promise<void>(done => { resolve = done; }); return { promise, resolve }; }
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

test('draft saves remain ordered and old acknowledgements cannot mark newer text saved', async () => {
  const gate = deferred(), stored: string[] = [];
  const draft = new Draft('first', async text => { if (text === 'first') await gate.promise; stored.push(text); });
  const first = draft.save(); draft.edit('second'); const second = draft.save();
  await Promise.resolve(); expect(stored).toEqual([]);
  gate.resolve(); expect(await first).toBe(false); expect(await second).toBe(true);
  expect(stored).toEqual(['first', 'second']); expect(draft.text).toBe('second');
});

test('failed saves do not poison the queue and never clear local text', async () => {
  let fail = true, stored = '';
  const draft = new Draft('unsaved', async text => { if (fail) throw new Error('offline'); stored = text; });
  await expect(draft.save()).rejects.toThrow('offline'); expect(draft.text).toBe('unsaved');
  fail = false; expect(await draft.save()).toBe(true); expect(stored).toBe('unsaved');
});

test('polling pauses while hidden, refreshes on focus, and releases unmounted views', async () => {
  vi.useFakeTimers(); let visible = true;
  const refresh = vi.fn(async () => {}), report = vi.fn();
  const poll = new Polling(() => visible, report), window = new EventTarget(), document = new EventTarget();
  const unwatch = poll.watch('items', refresh); poll.start(window, document);
  await vi.advanceTimersByTimeAsync(0); expect(refresh).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(15_000); expect(refresh).toHaveBeenCalledTimes(2);
  visible = false; document.dispatchEvent(new Event('visibilitychange'));
  await vi.advanceTimersByTimeAsync(60_000); window.dispatchEvent(new Event('focus'));
  await vi.advanceTimersByTimeAsync(0); expect(refresh).toHaveBeenCalledTimes(2);
  visible = true; document.dispatchEvent(new Event('visibilitychange'));
  await vi.advanceTimersByTimeAsync(0); expect(refresh).toHaveBeenCalledTimes(3);
  window.dispatchEvent(new Event('focus')); await vi.advanceTimersByTimeAsync(0); expect(refresh).toHaveBeenCalledTimes(4);
  unwatch(); await vi.advanceTimersByTimeAsync(15_000); expect(refresh).toHaveBeenCalledTimes(4);
  poll.stop(); expect(report).not.toHaveBeenCalled();
});

test('overlapping focus refreshes share work, report a failure once, and allow retry', async () => {
  const gate = deferred(), report = vi.fn(); let fail = true;
  const refresh = vi.fn(async () => { await gate.promise; if (fail) throw new Error('offline'); });
  const poll = new Polling(() => true, report);
  const firstWatcher = poll.watch('items', refresh), secondWatcher = poll.watch('items', refresh);
  const first = poll.refresh(), second = poll.refresh(); await Promise.resolve();
  expect(refresh).toHaveBeenCalledTimes(1); gate.resolve(); await Promise.all([first, second]);
  expect(report).toHaveBeenCalledTimes(1); firstWatcher(); fail = false; await poll.refresh();
  expect(refresh).toHaveBeenCalledTimes(2); secondWatcher(); await poll.refresh(); expect(refresh).toHaveBeenCalledTimes(2);
});


test('generation and text saves share one queue without replacing later local text', async () => {
  const gate = deferred(), writes: string[] = [];
  const draft = new Draft('first', async text => { writes.push(text); });
  draft.edit('before generation'); await draft.save();
  const revision = draft.revision;
  const generated = draft.mutate(async () => { await gate.promise; writes.push('generated'); return 'generated'; });
  draft.edit('typed during generation'); const saved = draft.save();
  gate.resolve(); const result = await generated;
  if (draft.revision === revision) draft.edit(result);
  expect(await saved).toBe(true);
  expect(writes).toEqual(['before generation', 'generated', 'typed during generation']);
  expect(draft.text).toBe('typed during generation'); expect(draft.dirty).toBe(false);
});


test('resource cache evicts an old idle view without disposing the requested view', () => {
  vi.useFakeTimers();
  const created: { subscriberCount: number; status: string; cleanup: ReturnType<typeof vi.fn> }[] = [];
  const get = scoped(() => { const value = { subscriberCount: 0, status: 'ready', cleanup: vi.fn() }; created.push(value); return value; });
  for (let i = 0; i < 101; i++) get(String(i));
  expect(created[0].cleanup).toHaveBeenCalledOnce();
  expect(created[100].cleanup).not.toHaveBeenCalled();
  expect(created.filter(value => value.cleanup.mock.calls.length)).toHaveLength(1);
});

test('collections read through the client their host supplies, with their own cache', async () => {
  const seen: Request[] = [];
  const client = createBlyggerClient({
    baseUrl: 'https://blyg.example',
    headers: { Authorization: 'Bearer host-token' },
    fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(input, init);
      seen.push(request);
      return Response.json({ site_title: 'From the host' });
    },
  });
  const data = createStudioData(client);
  await data.settings.preload();
  expect(seen.map((r) => r.url), 'reads go to the host the client names').toEqual(['https://blyg.example/api/settings']);
  expect(seen[0].headers.get('authorization')).toBe('Bearer host-token');
  expect([...data.settings.values()][0]?.site_title).toBe('From the host');
  const other = createStudioData(client);
  expect(other.queryClient, 'each host gets its own cache').not.toBe(data.queryClient);
  await other.dispose();
  await data.dispose();
});

test('a disposed instance leaves no timers and makes no further requests', async () => {
  vi.useFakeTimers();
  vi.stubGlobal('document', { visibilityState: 'visible' });
  vi.stubGlobal('window', { dispatchEvent() { return true; } });
  let requests = 0;
  const client = createBlyggerClient({
    baseUrl: 'https://blyg.example',
    fetch: async () => { requests++; return Response.json({ site_title: 'x' }); },
  });
  const data = createStudioData(client);
  const target = { addEventListener() {}, removeEventListener() {} };
  data.polling.start(target, target);
  data.itemDetail('one');
  await data.settings.preload();
  const stopWatch = data.polling.watch('settings', () => data.settings.utils.refetch());
  expect(requests, 'the instance makes requests while alive').toBeGreaterThan(0);
  expect(vi.getTimerCount(), 'the instance runs timers while alive').toBeGreaterThan(0);
  const alive = requests;
  await vi.advanceTimersByTimeAsync(16_000);
  expect(requests, 'polling makes requests while alive').toBeGreaterThan(alive);
  void stopWatch;
  await data.dispose();
  const before = requests;
  expect(vi.getTimerCount(), 'a disposed instance leaves no timers').toBe(0);
  await data.changed('settings', 'items');
  await vi.advanceTimersByTimeAsync(120_000);
  expect(requests - before, 'a disposed instance makes no further requests').toBe(0);
});
