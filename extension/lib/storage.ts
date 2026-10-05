/** The storage the token store and drafts need: chrome.storage in the extension, memory in tests. */
export interface KeyValue {
  get(key: string): Promise<unknown>;
  set(items: Record<string, unknown>): Promise<void>;
  remove(keys: string[]): Promise<void>;
}

interface ChromeArea {
  get(keys: string): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
  remove(keys: string[]): Promise<void>;
}

export function storageArea(area: ChromeArea): KeyValue {
  return { get: async (key) => (await area.get(key))[key], set: (items) => area.set(items), remove: (keys) => area.remove(keys) };
}

/** In memory, but serialised like chrome.storage (JSON values only), so tests hold only states the extension can store. */
export function memoryArea(): KeyValue {
  const data = new Map<string, string>();
  return {
    get: async (key) => (data.has(key) ? JSON.parse(data.get(key)!) : undefined),
    set: async (items) => { for (const [key, value] of Object.entries(items)) if (value !== undefined) data.set(key, JSON.stringify(value)); },
    remove: async (keys) => { for (const key of keys) data.delete(key); },
  };
}
