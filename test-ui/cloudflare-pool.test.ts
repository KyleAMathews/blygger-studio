import { cloudflarePool, structuredSerializableStringify } from '@cloudflare/vitest-plugin';
import { WebSocketPair } from 'miniflare';
import { expect, test } from 'vitest';
import { distDir, type PoolOptions, type PoolWorker } from 'vitest/node';
import { detachCloudflareListenerOnStop } from '../scripts/oracles-cloudflare.ts';

test('a late Cloudflare module request is dropped after the pool stops', async () => {
  const worker = cloudflarePool({}).createPoolWorker({
    project: { vitest: { distPath: distDir } },
  } as PoolOptions) as PoolWorker & {
    socket: InstanceType<typeof WebSocketPair>[0];
    parsedPoolOptions: object;
  };
  const pair = new WebSocketPair();
  const host = pair[0], peer = pair[1];
  host.accept();
  peer.accept();
  worker.socket = host;
  worker.parsedPoolOptions = {};

  const poolWorker = detachCloudflareListenerOnStop(worker);
  const request = structuredSerializableStringify({
    t: 'q', m: 'fetch', a: ['node:path'], i: 'module-request',
  });
  let replies = 0;
  peer.addEventListener('message', () => { replies++; });
  try {
    poolWorker.on('message', () => {});
    peer.send(request);
    expect(replies).toBe(1);

    await poolWorker.stop();
    // Miniflare can receive a queued peer message before the peer closes.
    peer.send(request);
    await new Promise(resolve => setImmediate(resolve));
    expect(replies).toBe(1);
  } finally {
    peer.close();
  }
});
