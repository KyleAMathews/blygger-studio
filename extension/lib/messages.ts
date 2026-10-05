import { browser } from 'wxt/browser';
import type { Status } from './tokens.ts';

export type Request =
  | { type: 'status' }
  | { type: 'connect'; url: string }
  | { type: 'connect-manual'; url: string; token: string }
  | { type: 'access-token' }
  | { type: 'disconnect' };

export interface Replies {
  status: Status;
  connect: Status;
  'connect-manual': Status;
  'access-token': string;
  disconnect: Status;
}

type Reply = { ok: true; value: unknown } | { ok: false; error: string; reconnect: boolean };

const TYPES = new Set<string>(['status', 'connect', 'connect-manual', 'access-token', 'disconnect']);
const isRequest = (message: unknown): message is Request =>
  typeof message === 'object' && message !== null && TYPES.has(String((message as { type?: unknown }).type));

export class WorkerError extends Error {
  constructor(message: string, readonly reconnect: boolean) {
    super(message);
    this.name = 'WorkerError';
  }
}

/** The worker side: answer clipper requests; ignore everything else. */
export function serve(handle: (request: Request) => Promise<unknown>) {
  browser.runtime.onMessage.addListener((message: unknown, _sender: unknown, sendResponse: (reply: Reply) => void) => {
    if (!isRequest(message)) return false;
    handle(message).then(
      (value) => sendResponse({ ok: true, value }),
      (error: unknown) => sendResponse({ ok: false, error: error instanceof Error ? error.message : String(error), reconnect: error instanceof Error && error.name === 'ReconnectError' }),
    );
    return true;
  });
}

/** The panel side. */
export async function ask<T extends Request['type']>(request: Extract<Request, { type: T }>): Promise<Replies[T]> {
  const reply = (await browser.runtime.sendMessage(request)) as Reply | undefined;
  if (!reply) throw new WorkerError("The clipper's background worker did not answer.", false);
  if (!reply.ok) throw new WorkerError(reply.error, reply.reconnect);
  return reply.value as Replies[T];
}
