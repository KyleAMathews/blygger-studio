import { readValidators } from './generated/read-validators.gen.js';

type Entry = { etag: string | null; text: string; headers: [string, string][] };
type Ticket = { superseded?: Entry };
type Pending = { readers: Set<Ticket>; accepted?: Entry };

/** A stale SDK attempt can be reacquired by a still-active UI consumer. */
export class ReadSupersededError extends DOMException {
  constructor() { super('Read superseded', 'AbortError'); }
}

/** One client's private, bounded cache. Bodies enter only after wire validation.
 * Requests still go to the origin; the cache supplies the body of a 304. */
export function conditionalReadFetch(baseUrl: string, fetcher: typeof fetch, onEligible?: (request: Request) => void): typeof fetch {
  const base = new URL(baseUrl.endsWith('/') ? baseUrl : baseUrl + '/');
  const entries = new Map<string, Entry>();
  const pending = new Map<string, Pending>();
  let boundary = 0;
  const restored = (entry: Entry) => new Response(entry.text, { headers: entry.headers });
  const accept = (key: string, flight: Pending, ticket: Ticket, entry: Entry) => {
    // Set iteration follows request order. Only older active readers can be
    // superseded; identity avoids a global sequence counter and its overflow.
    for (const reader of flight.readers) {
      if (reader === ticket) break;
      reader.superseded = entry;
    }
    flight.accepted = entry;
    entries.delete(key);
    entries.set(key, entry);
    if (entries.size > 500) entries.delete(entries.keys().next().value!);
  };
  return async (input, init) => {
    const request = new Request(input, init);
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
      boundary++;
      try { return await fetcher(request); } finally { boundary++; }
    }
    const url = new URL(request.url);
    const path = '/' + url.pathname.slice(base.pathname.length);
    const schema = request.method === 'GET' && url.origin === base.origin && url.pathname.startsWith(base.pathname)
      ? readValidators.find(entry => entry.pattern.test(path))?.schema : undefined;
    // Explicit caller validators retain raw HTTP semantics.
    if (!schema || request.headers.has('if-none-match') || request.headers.has('range')) return fetcher(request);
    onEligible?.(input instanceof Request ? input : request);
    request.signal.throwIfAborted();
    const key = JSON.stringify([request.url, [...request.headers].sort(), request.credentials, request.mode,
      request.redirect, request.cache, request.referrer, request.referrerPolicy, request.integrity]);
    let flight = pending.get(key);
    if (!flight) { flight = { readers: new Set(), accepted: entries.get(key) }; pending.set(key, flight); }
    const ticket: Ticket = {};
    flight.readers.add(ticket);
    // Evicting a reusable cache entry must not forget which answer won while
    // older readers are still pending. Release that extra reference with them.
    const cached = flight.accepted, started = boundary;
    const headers = new Headers(request.headers);
    if (cached?.etag) headers.set('If-None-Match', cached.etag);
    try {
      let response = await fetcher(new Request(request, { headers }));
      request.signal.throwIfAborted();
      if (started !== boundary) throw new ReadSupersededError();
      if (response.status === 304) {
        if (!cached?.etag) {
          response = await fetcher(request);
          if (response.status === 304) throw new Error('Unconditional read returned 304 without a cached representation');
        } else {
          const etag = response.headers.get('etag');
          if (etag && etag !== cached.etag) throw new Error('304 validator does not match cached representation');
          const latest = flight.accepted ?? cached;
          if (!latest.etag) throw new ReadSupersededError();
          // Confirmation is an accepted read too: an older 200 must not
          // replace the representation a later request just revalidated.
          if (!ticket.superseded) accept(key, flight, ticket, latest);
          return restored(latest);
        }
      }
      if (response.status !== 200) return response;
      const text = await response.clone().text();
      schema.parse(JSON.parse(text));
      request.signal.throwIfAborted();
      if (started !== boundary) throw new ReadSupersededError();
      const etag = response.headers.get('etag');
      const newer = ticket.superseded;
      if (newer) {
        if (!newer.etag) throw new ReadSupersededError();
        return restored(newer);
      }
      // Untagged valid bodies still supersede older readers.
      accept(key, flight, ticket, { etag, text, headers: [...response.headers] });
      return response;
    } finally {
      flight.readers.delete(ticket);
      if (!flight.readers.size) pending.delete(key);
    }
  };
}
