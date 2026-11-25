/** Test-only adapter for @tanstack/oracles preview 97a4e7a.
 * Workerd has a virtual filesystem and immutable builtin module namespaces.
 * Keep the framework's instrumentation, assertions, verdicts and routes intact;
 * send its capture writes to the host through a local Miniflare service binding.
 * All Worker tests are conservatively I/O-bound: Node resource enumeration and
 * idle detection cannot describe D1/R2 RPC. Consequently work-ratio and Node
 * idleness classifications are unavailable for this runtime.
 */
import { createHash } from 'node:crypto';
import { appendFileSync, realpathSync } from 'node:fs';
import { dirname, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { cloudflareTest } from '@cloudflare/vitest-plugin';
import type { Plugin } from 'vite';
import type { PoolWorker } from 'vitest/node';

export function detachCloudflareListenerOnStop(worker: PoolWorker): PoolWorker {
  const on = worker.on.bind(worker);
  const off = worker.off.bind(worker);
  const stop = worker.stop.bind(worker);
  let messageListener: Parameters<PoolWorker['on']>[1] | undefined;

  worker.on = (event, listener) => {
    on(event, listener);
    if (event === 'message') messageListener = listener;
  };
  worker.off = (event, listener) => {
    off(event, listener);
    if (event === 'message' && messageListener === listener) messageListener = undefined;
  };
  worker.stop = () => {
    if (messageListener) worker.off('message', messageListener);
    return stop();
  };
  return worker;
}

export function cloudflareOracleTest(options: Parameters<typeof cloudflareTest>[0], lazyEntrypoint = false): Plugin {
  const plugin = cloudflareTest(options);
  if (lazyEntrypoint) {
    // In Cloudflare's pinned plugin, setMain only adds a side-effect import
    // to cloudflare:test. The pool still resolves SELF and named entrypoints
    // against the real Worker when a test calls them.
    if (typeof plugin.api?.setMain !== 'function') throw new Error('Revalidate the lazy Cloudflare test entrypoint with this plugin version.');
    plugin.api.setMain = () => {};
  }
  const configure = plugin.configureVitest;
  if (!process.env.ORACLE_GAPS_STATE || typeof configure !== 'function') return plugin;

  plugin.configureVitest = function (context) {
    configure.call(this, context);
    const pool = context.project.config.poolRunner;
    if (pool?.name !== 'cloudflare-pool') return;
    // Cloudflare's pool (1.4.11) clears its socket while an incoming module
    // RPC may still reach its listener. Detach it before closing the socket.
    const createWorker = pool.createPoolWorker.bind(pool);
    pool.createPoolWorker = options => detachCloudflareListenerOnStop(createWorker(options));
  };
  return plugin;
}

const captureDigest = '90edec7319bada85bdbcb7933a859bb7034623bb61f6daf375f0bc54af0d473a';
export function cloudflareOracleCapture(): Plugin {
  return {
    name: 'blygger-cloudflare-oracle-capture', enforce: 'pre',
    transform(code, id) {
      if (!id.endsWith('/capture-setup.mjs')) return;
      if (createHash('sha256').update(code).digest('hex') !== captureDigest) throw new Error('The oracle capture harness changed. Revalidate the Cloudflare adapter before using this framework version.');
      return code
        // Workerd builtin namespaces cannot be updated as Node CommonJS modules.
        .replaceAll('syncBuiltinESMExports()', 'void 0')
        .replaceAll('process.getActiveResourcesInfo()', '["CloudflareWorkerIO"]')
        .replace("import fs, { appendFileSync, readFileSync } from 'node:fs'", `import captureFs, { readFileSync } from 'node:fs'
const fs = { ...captureFs, promises: { ...captureFs.promises } }
let captureWrites = Promise.resolve()
const appendFileSync = (file, data) => { captureWrites = captureWrites.then(async () => {
  const { env: captureEnv } = await import('cloudflare:test')
  const response = await captureEnv.ORACLE_GAPS_CAPTURE.fetch(new Request('https://capture.test/', { method: 'POST', body: JSON.stringify({ file, data }) }))
  if (!response.ok) throw new Error('Oracle capture bridge rejected a write: ' + response.status)
}) }
`)
        + '\nafterAll(async () => { await captureWrites })\n';
    },
  };
}

// This binding exists only in local tests. Accept capture files in the current
// runner's temporary output directory, never arbitrary paths supplied by a test.
export async function writeOracleCapture(request: Request): Promise<Response> {
  const state = process.env.ORACLE_GAPS_STATE;
  if (!state) return new Response('No gap run is active', { status: 403 });
  const { file, data } = await request.json() as { file: string; data: string };
  const directory = dirname(resolve(state));
  if (!directory.startsWith(realpathSync(tmpdir()) + sep) || typeof file !== 'string' || typeof data !== 'string' || dirname(resolve(file)) !== directory || !/\/(run-\d+-\d+\.jsonl|test-output\.log)$/.test(file)) return new Response('Invalid capture destination', { status: 403 });
  appendFileSync(file, data);
  return new Response(null, { status: 204 });
}

// Only replay settings cross into the Worker. Never copy the host environment.
export function workerOracleEnvironment(): Record<string, string> {
  return Object.fromEntries(['SEED', 'PATH', 'PROPERTY', 'UNIT', 'RUNS_MULTIPLIER', 'CALIBRATION'].flatMap(suffix => {
    const key = 'WORKER_ORACLE_' + suffix, value = process.env[key];
    return value === undefined ? [] : [[key, value]];
  }));
}
