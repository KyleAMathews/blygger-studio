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
import type { Plugin } from 'vite';

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
