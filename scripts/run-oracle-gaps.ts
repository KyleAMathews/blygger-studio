/** Run real oracle baselines and mutations, and make open gaps fail CI. */
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
function take(name: string) {
  const index = args.indexOf(name);
  if (index < 0) return undefined;
  const value = args[index + 1];
  if (!value || value.startsWith('--')) throw new Error(`${name} requires a value`);
  args.splice(index, 2); return value;
}
const runtime = take('--runtime') ?? 'worker';
const runtimes = {
  worker: { config: 'vitest.worker-oracles.config.ts', prefix: 'WORKER_ORACLE', source: 'src/oauth-storage.ts,src/mention-groups.ts' },
  studio: { config: 'vitest.oracles.config.ts', prefix: 'STUDIO_ORACLE', source: 'sdk/conditional-reads.ts,src/ui/cursor-query.ts,src/ui/read-batch.ts,src/conditional-operation.ts,sdk/index.ts,src/ui/data.ts,src/ui/read-recovery.ts,src/cursor-page.ts' },
};
if (!(runtime in runtimes)) throw new Error(`Unknown oracle runtime: ${runtime}`);
const selected = runtimes[runtime as keyof typeof runtimes];
const requestedSource = take('--source');
const studioShard = take('--studio-shard');
let source = requestedSource ?? selected.source;
let studioMutants = 'test-oracles/mutants';
const config = take('--config') ?? selected.config;
const files = take('--files');
const contexts = take('--contexts') ?? '2';
const seed = take('--seed') ?? process.env[`${selected.prefix}_SEED`] ?? '20261001';
const requestedOutput = take('--out');
if (requestedOutput) mkdirSync(requestedOutput, { recursive: true });
const output = realpathSync(requestedOutput ?? mkdtempSync(join(tmpdir(), `blygger-${runtime}-gaps-`)));
if (studioShard !== undefined) {
  if (runtime !== 'studio' || requestedSource !== undefined || args.includes('--mutants') || !['1', '2'].includes(studioShard)) {
    throw new Error('--studio-shard requires the complete Studio source roster and a shard of 1 or 2');
  }
  const allSources = selected.source.split(',');
  // The pagination sources and their controls ran on a separate CPU allocation
  // in the matched Studio run. The second shard takes the rest of the roster.
  const pagination = new Set(['sdk/index.ts', 'src/ui/cursor-query.ts', 'src/ui/read-recovery.ts', 'src/cursor-page.ts']);
  if ([...pagination].some(file => !allSources.includes(file))) throw new Error('Studio pagination source roster changed');
  const assigned = new Set(allSources.filter(file => pagination.has(file) === (studioShard === '1')));
  source = [...assigned].join(',');
  const loader = pathToFileURL(resolve('node_modules/@tanstack/oracles/oracle-gaps/authored.mjs'));
  const { loadAuthored } = await import(loader.href) as { loadAuthored(directory: string): Array<{ id: string; source: string }> };
  const controls = loadAuthored(resolve(studioMutants));
  // Studio can judge authored controls whose sources have no operator campaign.
  const selectedControls = controls.filter(control => pagination.has(control.source) === (studioShard === '1'));
  studioMutants = join(output, 'authored-controls');
  mkdirSync(studioMutants);
  writeFileSync(join(studioMutants, 'shard.json'), JSON.stringify(selectedControls));
}
const child = spawn(process.execPath, [resolve('node_modules/@tanstack/oracles/oracle-gaps/index.mjs'),
  '--package', '.', '--source', source, '--config', config,
  '--env-prefix', selected.prefix, '--seed', seed, '--contexts', contexts, '--out', output,
  ...(runtime === 'studio' ? ['--pool', 'forks', '--mutants', studioMutants] : []), ...args], {
  stdio: 'inherit', env: { ...process.env, ...(files ? { BLYG_ORACLE_FILES: files } : {}),
    WRANGLER_LOG_PATH: join(output, 'wrangler.log') },
});
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, () => child.kill(signal));
child.on('error', error => { console.error(error); process.exitCode = 1; });
child.on('exit', (code, signal) => {
  if (code !== 0 || signal) { process.exitCode = code || 1; return; }
  try {
    const report = JSON.parse(readFileSync(join(output, 'results.json'), 'utf8')) as {
      provisional: boolean; baseline: { file: string; ordinary: boolean; failed: number }[]; nondeterministic: string[];
      results: { outcome: string }[];
    };
    const gaps = report.results.filter(result => result.outcome !== 'killed' && result.outcome !== 'unowned');
    const oracleFiles = report.baseline.filter(file => !file.ordinary).map(file => resolve(file.file));
    const unstable = report.nondeterministic.filter(test => oracleFiles.some(file => test.startsWith(file + ' > ')));
    const failed = report.baseline.filter(file => file.failed).length;
    if (report.provisional || failed || unstable.length || gaps.length) {
      console.error(`Oracle gate failed: ${failed} failing baseline files, ${unstable.length} unstable oracle tests, ${gaps.length} open gaps; report ${join(output, 'summary.md')}`);
      for (const test of unstable) console.error('Unstable oracle test: ' + test);
      process.exitCode = 1;
    }
  } catch (error) { console.error('Oracle run produced no usable report', error); process.exitCode = 1; }
});
