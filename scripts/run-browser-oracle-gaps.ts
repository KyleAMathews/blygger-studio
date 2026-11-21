/** The supported gap CLI judges a rebuilt real browser, not Node's UI imports.
 * Its authored patch is served through ?browser-source and compiled into the
 * actual SPA. Operator switches live in Node and are deliberately not selected;
 * this command reports one finite authored control, never a project-wide audit.
 */
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
const output = realpathSync(requested ?? mkdtempSync(join(tmpdir(), 'blygger-browser-gaps-')));
const seed = take('--seed') ?? process.env.BROWSER_ORACLE_SEED ?? '20261001';
const selected = take('--only') ?? 'authored:save-rejection';
if (selected !== 'authored:save-rejection') throw new Error('Browser gap integration currently supports the rebuilt authored:save-rejection control; Node operator switches do not reach Chromium.');
const authored = join(output, 'authored'); mkdirSync(authored);
writeFileSync(join(authored, 'save-rejection.json'), JSON.stringify({
  id: 'save-rejection', source: 'src/ui/draft.ts',
  find: 'return this.revision === revision;\n    });',
  replace: 'return this.revision === revision;\n    }).catch(() => true);',
  intent: 'swallow a failed required save so publication proceeds without an acknowledgment',
  author: 'existing source control from verify-save-oracle-mutations.ts',
}, null, 2));
const child = spawn(process.execPath, [resolve('node_modules/@tanstack/oracles/oracle-gaps/index.mjs'),
  '--package', '.', '--source', 'src/ui/authoring.tsx,src/ui/draft.ts,src/ui/paced-write.ts',
  '--config', 'vitest.browser-oracles.config.ts', '--env-prefix', 'BROWSER_ORACLE', '--seed', seed,
  '--mutants', authored, '--only', selected, '--contexts', '1', '--test-timeout', '90000', '--mutant-limit', '120000', '--out', output, ...args], {
  stdio: 'inherit', env: { ...process.env, WRANGLER_LOG_PATH: join(output, 'wrangler.log') },
});
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, () => child.kill(signal));
child.on('error', error => { console.error(error); process.exitCode = 1; });
child.on('exit', (code, signal) => {
  if (code !== 0 || signal) { process.exitCode = code || 1; return; }
  try {
    const report = JSON.parse(readFileSync(join(output, 'results.json'), 'utf8')) as {
      provisional: boolean; baseline: { failed: number }[]; nondeterministic: string[];
      results: { outcome: string }[];
    };
    const gaps = report.results.filter(result => result.outcome !== 'killed');
    if (report.provisional || report.baseline.some(file => file.failed) || report.nondeterministic.length || gaps.length || report.results.length !== 1) {
      console.error(`Browser oracle gate failed: report ${join(output, 'summary.md')}`); process.exitCode = 1;
    }
  } catch (error) { console.error('Browser oracle run produced no usable gap report', error); process.exitCode = 1; }
});
