/** Judge the owner's publish confirmations in real Chromium against authored
 * controls, one per defect class the oracle was written to catch. Node operator
 * switches do not reach Chromium, so each control is rebuilt into the served
 * SPA; this command reports that finite set, not a full source audit. */
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
const output = realpathSync(requested ?? mkdtempSync(join(tmpdir(), 'blygger-publish-gaps-')));
const seed = take('--seed') ?? process.env.BROWSER_ORACLE_SEED ?? '20261125';
const source = 'src/ui/authoring.tsx';
const controls = [
  { id: 'default-visibility', find: 'const visibility = item.version === 0 ? { visibility: going } : {};', replace: 'const visibility = {};', intent: 'let the blyg default decide a draft publish, so a default changed mid-dialog turns the answer private' },
  { id: 'notebook-draft-asks', find: "if (item.status === 'draft' && going === 'public' && !(await confirmDraftHoppers(item.id))) return;", replace: "if (item.status === 'draft' && !(await confirmDraftHoppers(item.id))) return;", intent: 'name public hoppers before a private version, which no hopper shows' },
  { id: 'private-hoppers-named', find: "const names = hoppers.filter((h) => h.public).map((h) => h.name);\n  return confirm({", replace: "const names = hoppers.map((h) => h.name);\n  return confirm({", intent: 'name a non-public hopper as one the raised item will appear in' },
  { id: 'draft-hoppers-unasked', find: "return names.length ? confirm({ title: `Publish this item? ${joinsHoppers(names)}`, ok: 'publish' }) : true;", replace: 'return true;', intent: 'publish a draft into a public hopper without naming it' },
  { id: 'failed-read-publishes', find: 'if (ask && !(await ask())) return;', replace: 'if (ask && !(await ask().catch(() => true))) return;', intent: 'treat a failed membership read as consent' },
  { id: 'ask-outside-operation', find: 'const addVersion = async () => {\n    if (visibility === \'private\') return keepPrivately();\n    publish(\'public\', () => confirmRaise(item.id));', replace: 'const addVersion = async () => {\n    if (visibility === \'private\') return keepPrivately();\n    if (await confirmRaise(item.id).catch(() => false)) publish(\'public\');', intent: 'ask before the operation starts, so a second press opens a second dialog and a failed read is silent' },
];
const authored = join(output, 'authored'); mkdirSync(authored);
for (const control of controls) writeFileSync(join(authored, `${control.id}.json`), JSON.stringify({ ...control, source, author: 'studio#178 row 5 defects, session 86' }, null, 2));
const only = take('--only') ?? controls.map(control => `authored:${control.id}`).join(',');
const child = spawn(process.execPath, [resolve('node_modules/@tanstack/oracles/oracle-gaps/index.mjs'),
  '--package', '.', '--source', source, '--config', 'vitest.browser-publish-oracles.config.ts',
  '--env-prefix', 'BROWSER_ORACLE', '--seed', seed, '--mutants', authored,
  '--only', only, '--contexts', '1', '--test-timeout', '1800000', '--mutant-limit', '1800000', '--out', output, ...args], {
  stdio: 'inherit', env: { ORACLE_GAPS_BAIL: '1', ...process.env, WRANGLER_LOG_PATH: join(output, 'wrangler.log') },
});
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, () => child.kill(signal));
child.on('error', error => { console.error(error); process.exitCode = 1; });
child.on('exit', (code, signal) => {
  if (code !== 0 || signal) { process.exitCode = code || 1; return; }
  try {
    const report = JSON.parse(readFileSync(join(output, 'results.json'), 'utf8')) as {
      provisional: boolean; baseline: { failed: number }[]; nondeterministic: string[];
      results: { id: string; outcome: string }[];
    };
    const wanted = only.split(',');
    if (report.provisional || report.baseline.some(file => file.failed) || report.nondeterministic.length ||
        report.results.length !== wanted.length || report.results.some(result => result.outcome !== 'killed')) {
      console.error(`Publish browser oracle gate failed: report ${join(output, 'summary.md')}`); process.exitCode = 1;
    }
  } catch (error) { console.error('Publish browser oracle run produced no usable gap report', error); process.exitCode = 1; }
});
