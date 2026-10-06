/** Reuse derived views, but release inactive entries after a minute.
 * Backend source collections belong at module scope, never in this registry.
 */
export function scoped<
  T extends {
    subscriberCount: number;
    status: string;
    cleanup(): void | Promise<void>;
  },
>(factory: (key: string) => T) {
  const cache = new Map<string, { collection: T; touched: number }>();
  function sweep(protectedKey?: string) {
    const now = Date.now();
    for (const [key, entry] of cache) {
      if (key === protectedKey) continue;
      if (
        entry.collection.subscriberCount ||
        entry.collection.status === 'loading'
      )
        continue;
      if (now - entry.touched < 60_000 && cache.size <= 100) continue;
      cache.delete(key);
      void entry.collection.cleanup();
    }
  }
  const timer = setInterval(sweep, 30_000);
  // Node tests may import the pure registry without keeping the process alive.
  if (typeof timer === 'object' && 'unref' in timer) timer.unref();
  return (key: string) => {
    let entry = cache.get(key);
    if (!entry) {
      entry = { collection: factory(key), touched: Date.now() };
      cache.set(key, entry);
    }
    entry.touched = Date.now();
    // Keep the requested resource live even before its first subscriber mounts.
    cache.delete(key);
    cache.set(key, entry);
    sweep(key);
    return entry.collection;
  };
}
