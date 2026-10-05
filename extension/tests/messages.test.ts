import { beforeEach, expect, test } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { ask, serve, WorkerError } from '../lib/messages.ts';
import { ReconnectError } from '../lib/tokens.ts';

beforeEach(() => fakeBrowser.reset());

test('the panel asks and the worker answers, with errors carried across', async () => {
  serve(async (request) => {
    if (request.type === 'status') return { state: 'disconnected' };
    if (request.type === 'access-token') throw new ReconnectError('Access ended. Reconnect to keep clipping.');
    throw new Error('unexpected');
  });
  expect(await ask({ type: 'status' })).toEqual({ state: 'disconnected' });
  const refused = ask({ type: 'access-token' });
  await expect(refused).rejects.toBeInstanceOf(WorkerError);
  await expect(refused).rejects.toMatchObject({ message: 'Access ended. Reconnect to keep clipping.', reconnect: true });
});

test('messages that are not clipper requests are ignored', async () => {
  serve(async () => 'answered');
  await expect(fakeBrowser.runtime.sendMessage({ type: 'something-else' })).resolves.toBeUndefined();
});
