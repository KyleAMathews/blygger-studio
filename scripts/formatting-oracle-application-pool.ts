/** Parent-owned real application fixtures, one fresh DB for each baseline file/pass. */
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { randomUUID, createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { formattingApplication } from './formatting-oracle-application.ts';

type Application = Awaited<ReturnType<typeof formattingApplication>>;
type Request = { action: 'acquire' | 'release'; index: number; file: string; pass: number; lease?: string };
type Owner = {
  index: number; file: string; pass: number; lease: string;
  acquiredAt?: string; origin?: string; script?: string; scriptSha256?: string;
  metadata?: Application['metadata'];
  setup: 'pending' | 'fulfilled' | 'rejected'; cleanup: 'pending' | 'closing' | 'fulfilled' | 'rejected' | 'factory-owned';
  application?: Application;
};
const diagnostic = (error: unknown) => ({ name: (error as Error)?.name ?? typeof error, message: String((error as Error)?.message ?? error) });

export async function formattingApplicationPool(count: number, invocation: string, files: readonly string[]) {
  if (!Number.isSafeInteger(count) || count < 1 || count > 4) throw new Error('Formatting application pool requires one to four slots');
  const expected = new Set(files), acquired = new Set<string>();
  if (!files.length || expected.size !== files.length || files.some(file => typeof file !== 'string' || !file)) throw new Error('Formatting application pool requires an exact nonempty file keyset');
  const token = randomUUID(), owners: Owner[] = [], slots = new Map<number, Owner>();
  const pending = new Set<Promise<void>>(), errors: unknown[] = [];
  let stopped = false;
  const remember = (error: unknown) => { errors.push(error); stopped = true; };
  const snapshot = () => ({
    schema: 'blygger-formatting-application-topology-v1', invocation, isolation: 'file-pass', maximumSlots: count, expectedFiles: [...expected].sort(),
    owners: owners.map(({ application: _application, ...owner }) => owner), failures: errors.map(diagnostic),
    evidence: 'Allocation and dispose/rm promise results only; not OS process release or product law evidence.',
  });
  const closeOwner = async (owner: Owner) => {
    if (!owner.application || owner.cleanup !== 'pending') return;
    // Keep the reservation through asynchronous disposal. Factory.close is
    // idempotent before disposal settles, so a duplicate must not enter it.
    owner.cleanup = 'closing';
    try { await owner.application.close(); owner.cleanup = 'fulfilled'; slots.delete(owner.index); }
    catch (error) { owner.cleanup = 'rejected'; throw error; }
  };
  const dispatch = async (request: Request) => {
    if (!Number.isSafeInteger(request.index) || request.index < 0 || request.index >= count || typeof request.file !== 'string' || !expected.has(request.file) || ![1, 2].includes(request.pass)) throw new Error('Invalid formatting application owner request');
    if (request.action === 'acquire') {
      if (stopped) throw new Error('Formatting application pool is stopping');
      if (slots.has(request.index)) throw new Error('Formatting application slot is already owned');
      const key = JSON.stringify([request.pass, request.file]);
      if (acquired.has(key)) throw new Error('Formatting application file/pass was already acquired');
      if (request.pass === 1 && owners.some(owner => owner.pass === 2) ||
          request.pass === 2 && (owners.filter(owner => owner.pass === 1 && owner.cleanup === 'fulfilled').length !== expected.size)) throw new Error('Formatting application passes overlap or are out of order');
      acquired.add(key);
      const owner: Owner = { index: request.index, file: request.file, pass: request.pass, lease: randomUUID(), setup: 'pending', cleanup: 'pending' };
      // Reserve synchronously before awaiting setup: at most count live/starting
      // hosts exist even when all workers request a new fixture together.
      slots.set(request.index, owner); owners.push(owner);
      try {
        owner.application = await formattingApplication();
        owner.setup = 'fulfilled'; owner.acquiredAt = new Date().toISOString();
        owner.origin = owner.application.origin; owner.script = owner.application.script;
        owner.metadata = owner.application.metadata;
        owner.scriptSha256 = createHash('sha256').update(await readFile(owner.script)).digest('hex');
        if (stopped) throw new Error('Formatting application acquisition completed during shutdown');
        return { invocation, index: owner.index, file: owner.file, pass: owner.pass, lease: owner.lease,
          origin: owner.origin, script: owner.script, cookie: owner.application.cookie };
      } catch (error) {
        // A factory that rejects owns its partial setup cleanup. An application
        // returned before a later error is retained for the pool's final close.
        if (!owner.application) { owner.setup = 'rejected'; owner.cleanup = 'factory-owned'; slots.delete(owner.index); }
        throw error;
      }
    }
    if (request.action !== 'release') throw new Error('Unknown formatting application action');
    const owner = slots.get(request.index);
    if (!owner || owner.lease !== request.lease || owner.file !== request.file || owner.pass !== request.pass || owner.setup !== 'fulfilled' || owner.cleanup !== 'pending') throw new Error('Formatting application release does not match its owner');
    await closeOwner(owner);
    return null;
  };
  const serve = async (request: IncomingMessage, response: ServerResponse) => {
    if (request.method !== 'POST' || request.url !== '/fixture' || request.headers.authorization !== 'Bearer ' + token) {
      response.writeHead(403).end(); return;
    }
    try {
      let body = '';
      for await (const chunk of request) {
        body += chunk;
        if (Buffer.byteLength(body) > 65536) throw new Error('Formatting fixture request is too large');
      }
      const result = await dispatch(JSON.parse(body));
      response.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ ok: true, result }));
    } catch (error) {
      remember(error);
      response.writeHead(500, { 'Content-Type': 'application/json' }).end(JSON.stringify({ ok: false, error: diagnostic(error) }));
    }
  };
  const server = createServer((request, response) => {
    const work = serve(request, response);
    pending.add(work);
    work.then(() => pending.delete(work), error => { pending.delete(work); remember(error); response.destroy(); });
  });
  // Runtime listen failures are setup failures; no real fixture exists yet.
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => { server.off('error', reject); resolve(); });
  });
  const address = server.address();
  if (!address || typeof address === 'string') { server.close(); throw new Error('Formatting application pool has no loopback address'); }
  return {
    endpoint: 'http://127.0.0.1:' + address.port + '/fixture', token, snapshot,
    requireComplete() {
      if (owners.length !== 2 * expected.size || owners.some(owner => owner.setup !== 'fulfilled' || owner.cleanup !== 'fulfilled') || slots.size) throw new Error('Formatting application fixtures do not account for both complete file passes');
    },
    async close() {
      stopped = true;
      const closed = new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
      // Accepted requests own their in-flight factory calls. Join them before
      // disposing every acquired host, including one returned after cancellation.
      const ended = await Promise.allSettled([...pending, closed]);
      for (const end of ended) if (end.status === 'rejected') errors.push(end.reason);
      const disposed = await Promise.allSettled(owners.map(closeOwner));
      for (const result of disposed) if (result.status === 'rejected') errors.push(result.reason);
      if (errors.length) throw new AggregateError(errors, 'Formatting application pool failed', { cause: errors[0] });
    },
  };
}
