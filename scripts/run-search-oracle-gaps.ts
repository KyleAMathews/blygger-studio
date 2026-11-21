/** Judge search in real Chromium with the original eager-lookahead defect as
 * a rebuilt authored control. Node operator switches do not reach Chromium;
 * this command reports that explicit finite control, not a full source audit. */
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
const args = process.argv.slice(2);
function take(name: string) {
  const index = args.indexOf(name);
  if (index < 0) return undefined;
  const value = args[index + 1];
  if (!value || value.startsWith('--')) throw new Error(`${name} requires a value`);
  args.splice(index, 2); return value;
}
const requested = take('--out');
if (requested) mkdirSync(requested, { recursive: true });
const output = realpathSync(requested ?? mkdtempSync(join(tmpdir(), 'blygger-search-gaps-')));
const seed = take('--seed') ?? process.env.BROWSER_ORACLE_SEED ?? '20261118';
const authored = join(output, 'authored'); mkdirSync(authored);
writeFileSync(join(authored, 'search-lookahead.json'), JSON.stringify({
  id: 'search-lookahead', source: 'src/ui/search.tsx',
  find: 'window: { limit: offset + PAGE }',
  replace: 'window: { limit: offset + PAGE + 1 }',
  intent: 'eagerly acquire a later search page just to infer hasMore, allowing its failure to hide accepted results',
  author: 'original ETag search regression, e2e/parity.spec.ts receiving witness',
}, null, 2));
const child = spawn(process.execPath, [resolve('node_modules/@tanstack/oracles/oracle-gaps/index.mjs'),
  '--package', '.', '--source', 'src/ui/search.tsx', '--config', 'vitest.browser-search-oracles.config.ts',
  '--env-prefix', 'BROWSER_ORACLE', '--seed', seed, '--mutants', authored,
  '--only', 'authored:search-lookahead', '--contexts', '1', '--test-timeout', '90000', '--mutant-limit', '120000', '--out', output, ...args], {
  stdio: 'inherit', env: process.env,
});
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, () => child.kill(signal));
child.on('error', error => { console.error(error); process.exitCode = 1; });
child.on('exit', (code, signal) => {
  if (code !== 0 || signal) { process.exitCode = code || 1; return; }
  try {
    const report = JSON.parse(readFileSync(join(output, 'results.json'), 'utf8')) as {
      provisional: boolean; baseline: { failed: number }[]; nondeterministic: string[];
      results: { id: string; outcome: string; laws?: string[] }[];
    };
    if (report.provisional || report.baseline.some(file => file.failed) || report.nondeterministic.length ||
        report.results.length !== 1 || report.results[0].id !== 'authored:search-lookahead' || report.results[0].outcome !== 'killed' || !report.results[0].laws?.includes('demanded search pages')) {
      console.error(`Search browser oracle gate failed: report ${join(output, 'summary.md')}`); process.exitCode = 1;
    }
  } catch (error) { console.error('Search browser oracle run produced no usable gap report', error); process.exitCode = 1; }
});
