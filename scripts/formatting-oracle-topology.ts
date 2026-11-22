/** External browser-host provenance. This is separate from oracle-gaps identity. */
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile, rename, lstat } from 'node:fs/promises';
import { release } from 'node:os';
import { dirname, resolve } from 'node:path';
import type { BrowserEngine, BrowserIsolation } from '../test-ui/editor-oracles/browser-engine-oracle.ts';

type CheckOptions = { out?: string; daemon?: boolean; stop?: boolean; help?: boolean; contexts?: number; pool?: string; seed?: string };
type LaunchOptions = { headless: boolean; executablePath?: string };
type Selection = { engine: BrowserEngine; isolation: BrowserIsolation; launchOptions: LaunchOptions };
type Topology = { path: string; invocation: string };
const schema = 'blygger-formatting-browser-topology-v3';
const hash = (bytes: string | Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const encode = (value: unknown) => JSON.stringify(value, null, 2) + '\n';

/** The pin routes only options.daemon to its disk-backed reusable session. */
export function requireColdFormattingCheck(options: CheckOptions) {
  if (options.daemon || options.stop) throw new Error('Formatting browser hosts require a cold check; daemon use and daemon-control routes are refused');
  if (options.help || !options.out) throw new Error('Formatting browser hosts require a check; run the oracle-gaps CLI directly for help');
}

export async function startBrowserTopology(input: Selection & {
  root: string; out: string; runnerRoot?: string; options: CheckOptions; cliArgs: string[]; reportedExecutable: string;
  seedSelection: { value: string; source: 'fresh' | 'explicit' | 'plan' };
}): Promise<Topology> {
  requireColdFormattingCheck(input.options);
  if (!input.seedSelection || input.seedSelection.value !== input.options.seed || !['fresh', 'explicit', 'plan'].includes(input.seedSelection.source)) throw new Error('Browser topology seed differs from its invocation');
  const out = resolve(input.out), path = resolve(out, 'browser-topology.json'), invocation = randomUUID();
  // Never take over an existing CLI run.pid, stale claim, empty directory or
  // symlink. Our own exclusive mkdir below closes competing-wrapper races.
  try { await lstat(out); throw new Error('Browser topology requires a fresh output directory; existing outputs and run.pid claims are refused without takeover'); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  const files = [
    'scripts/formatting-oracles.ts', 'scripts/formatting-oracle-topology.ts',
    'scripts/formatting-oracle-application.ts', 'scripts/formatting-oracle-application-pool.ts',
    'scripts/formatting-oracle-extensions.ts',
    'test-ui/editor-oracles/application-driver-oracle.ts', 'test-ui/editor-oracles/session-driver-oracle.ts',
    'test-ui/editor-oracles/browser-driver-oracle.ts', 'test-ui/editor-oracles/browser-engine-oracle.ts',
    'package.json', 'package-lock.json', 'vitest.oracle.config.ts',
    ...['args', 'index', 'check', 'capture-setup', 'evidence', 'daemon'].map(name => 'node_modules/@tanstack/oracles/oracle-gaps/' + name + '.mjs'),
  ];
  if (input.runnerRoot && resolve(input.runnerRoot) !== resolve(input.root, 'node_modules/@tanstack/oracles')) files.push('scripts/formatting-baseline-runner.ts', 'scripts/formatting-baseline-runner.patch', 'scripts/formatting-baseline-runner-manifest.json');
  const derivation = input.runnerRoot && resolve(input.runnerRoot) !== resolve(input.root, 'node_modules/@tanstack/oracles') ? { path: resolve(input.runnerRoot, '../derivation.json'), sha256: hash(await readFile(resolve(input.runnerRoot, '../derivation.json'))) } : null;
  const inputs = await Promise.all(files.map(async file => ({ path: file, sha256: hash(await readFile(resolve(input.root, file))) })));
  const manifest = JSON.parse(await readFile(resolve(input.root, 'package.json'), 'utf8'));
  const receipt = {
    schema, invocation, recordedAt: new Date().toISOString(), state: 'configured',
    host: { platform: process.platform, architecture: process.arch, release: release(), node: process.version },
    engine: input.engine, isolation: input.isolation,
    launch: { api: input.isolation === 'process' ? 'launch' : 'launchServer', owner: input.isolation === 'process' ? 'evaluated-file-or-unit' : 'parent-server', options: input.launchOptions },
    executable: { override: input.launchOptions.executablePath ?? null, playwrightReportedDefault: input.reportedExecutable,
      actualBinary: 'Not inferred from the default path; headless resolution can select another bundled executable. Verify in runtime process inventory.' },
    runner: { pin: manifest.devDependencies?.['@tanstack/oracles'] ?? null, path: input.runnerRoot ?? resolve(input.root, 'node_modules/@tanstack/oracles'), derivation, args: input.cliArgs, seedSelection: input.seedSelection, contexts: input.options.contexts, pool: input.options.pool,
      execution: 'cold', persistedEvidenceReuse: false, topologyEncodedInRunnerId: false,
      withinInvocation: 'Warm Vitest contexts use isolate:false; non-skipped batched units depend on capture-setup vi.resetModules and sequential unit completion.' },
    inputs, report: null,
  };
  await mkdir(dirname(out), { recursive: true });
  await mkdir(out); // exclusive directory ownership; the CLI still claims run.pid
  await writeFile(path, encode(receipt), { flag: 'wx' });
  return { path, invocation };
}

export async function finishBrowserTopology(topology: Topology, outcome: { exitCode: string | number | null; failure?: unknown; reportSource?: string }) {
  const receipt = JSON.parse(await readFile(topology.path, 'utf8'));
  if (receipt.schema !== schema || receipt.invocation !== topology.invocation) throw new Error('Browser topology owner changed before finalization');
  // The wrapper supplies bytes only after child exit zero. A failed/refused
  // child cannot bind a competing report that appeared during cleanup.
  const report = outcome.reportSource === undefined ? null : { path: 'results.json', sha256: hash(outcome.reportSource),
    capture: 'Exact bytes read after successful child exit in this wrapper-created directory; not reread during finalization.' };
  const failure = outcome.failure === undefined ? null : { name: (outcome.failure as Error)?.name ?? typeof outcome.failure, message: String((outcome.failure as Error)?.message ?? outcome.failure) };
  const next = { ...receipt, state: failure ? 'failed' : outcome.exitCode === 0 ? 'completed' : 'unsuccessful', finishedAt: new Date().toISOString(), exitCode: outcome.exitCode, failure, report };
  const temporary = topology.path + '.' + randomUUID() + '.tmp';
  await writeFile(temporary, encode(next), { flag: 'wx' });
  await rename(temporary, topology.path);
}

/** Validate the explicit parent receipt before acquiring a private Browser. */
export async function browserOwnerTopology(selection: Selection) {
  const path = process.env.FORMATTING_ORACLE_TOPOLOGY, invocation = process.env.FORMATTING_ORACLE_INVOCATION;
  if (!path && !invocation && selection.isolation === 'shared') return;
  if (!path || !invocation) throw new Error('Browser topology receipt and invocation are required for process isolation');
  const parent = JSON.parse(await readFile(path, 'utf8'));
  if (parent.schema !== schema || parent.invocation !== invocation || parent.state !== 'configured' || parent.runner?.execution !== 'cold' || parent.runner?.persistedEvidenceReuse !== false || parent.host?.platform !== process.platform || parent.host?.architecture !== process.arch || parent.engine !== selection.engine || parent.isolation !== selection.isolation || JSON.stringify(parent.launch?.options) !== JSON.stringify(selection.launchOptions)) throw new Error('Browser topology receipt does not match this cold host');
  const owner = randomUUID();
  return { async acquired(version: string, unit: string | null, application?: { context: number | null; lease: string | null; origin: string }) {
    const directory = resolve(dirname(path), 'browser-topology-launches');
    await mkdir(directory, { recursive: true });
    // One immutable file per module owner avoids interleaving concurrent appends.
    await writeFile(resolve(directory, owner + '.json'), encode({ schema, invocation, owner, acquiredAt: new Date().toISOString(), unit,
      application: application ?? null, workerPid: process.pid, engine: selection.engine, isolation: selection.isolation, launchOptions: selection.launchOptions, browserVersion: version,
      evidence: 'Successful Browser acquisition/version only; this is not a browser PID, executable-path or cleanup receipt.' }), { flag: 'wx' });
  } };
}
