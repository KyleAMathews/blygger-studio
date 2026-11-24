import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdir, readFile, readdir, realpath, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { requireColdFormattingCheck, startBrowserTopology, finishBrowserTopology } from './formatting-oracle-topology.ts';
import { type BrowserServer } from '@playwright/test';
import { prepareFormattingBaselineRunner } from './formatting-baseline-runner.ts';
import { formattingApplication } from './formatting-oracle-application.ts';
import { formattingApplicationPool } from './formatting-oracle-application-pool.ts';
import { requireExecutedFormattingOracles, requireFormattingCheckPurpose } from './formatting-baseline-evidence.ts';
import { browserEngine, browserEngines, browserIsolation, browserLaunchOptions } from '../test-ui/editor-oracles/browser-engine-oracle.ts';

// The package generates histories and judges observations in Node. Production
// formatting runs in the selected browser, including real React receiving paths.
const args = process.argv.slice(2);
const browserOption = args.indexOf('--browser');
const engine = browserEngine(browserOption === -1 ? undefined : args[browserOption + 1]);
if (browserOption !== -1) {
  if (!args[browserOption + 1]) throw new Error('--browser needs chromium, firefox, or webkit');
  args.splice(browserOption, 2);
}
const isolationOption = args.indexOf('--browser-isolation');
const isolation = browserIsolation(isolationOption === -1 ? undefined : args[isolationOption + 1], engine);
if (isolationOption !== -1) {
  if (!args[isolationOption + 1]) throw new Error('--browser-isolation needs shared or process');
  args.splice(isolationOption, 2);
}
const pick = args.indexOf('--oracle');
let selected: string | undefined;
if (pick !== -1) {
  selected = args[pick + 1];
  if (!selected || !['inline', 'keyboard', 'list', 'line-break', 'code-block', 'valid-input', 'session', 'newline-history', 'held-newline', 'links', 'navigation', 'draft', 'mixed', 'workflows', 'interactions', 'receivers'].includes(selected)) throw new Error('--oracle needs inline, keyboard, list, line-break, code-block, valid-input, session, newline-history, held-newline, links, navigation, draft, mixed, workflows, interactions, or receivers');
  args.splice(pick, 2);
}
const partitionControls = args.some(arg => /^--baseline-(plan|part)(=|$)/.test(arg)) || process.env.FORMATTING_BASELINE_SCOPE !== undefined
  ? await import('./formatting-baseline-plan.ts') : undefined;
const baselineScope = partitionControls?.readBaselineScope(process.cwd(), args);
const defaultOut = resolve(`build/formatting-oracles/${new Date().toISOString().replaceAll(':', '-')}`);
const receiver = !selected || selected === 'workflows' || selected === 'navigation' || selected === 'receivers' || selected === 'session' || selected === 'newline-history' || selected === 'held-newline';
// Default operator scope stays at the three editor helper modules. The authored
// directory still supplies raw receiver challenges; explicit receiver selections
// additionally request operator exploration throughout authoring.tsx.
const baselineRequested = args.some(arg => arg.replace(/^--/, '').split('=')[0] === 'baseline-only');
const sources = baselineRequested ? (await import('./formatting-baseline-plan.ts')).baselineSources.join(',') : selected === 'links' ? 'src/ui/links.ts' : selected === 'workflows' ? 'src/ui/links.ts,src/ui/authoring.tsx' : selected === 'draft' ? 'src/ui/draft.ts' : selected === 'navigation' ? 'src/ui/draft.ts,src/ui/format-shortcuts.ts,src/ui/authoring.tsx' : selected === 'receivers' || selected === 'session' || selected === 'newline-history' || selected === 'held-newline' ? 'src/ui/format-shortcuts.ts,src/ui/authoring.tsx' : selected ? 'src/ui/format-shortcuts.ts' : 'src/ui/format-shortcuts.ts,src/ui/links.ts,src/ui/draft.ts';
// Parse the exact final invocation with the installed pin. Its parser accepts
// inline and bare flag spellings too; a substring scan cannot enforce cold mode.
const cliArgs = [
  '--out', defaultOut, '--package', '.', '--source', sources,
  '--config', 'vitest.oracle.config.ts', '--mutants', 'test-ui/editor-oracle-mutants',
  '--contexts', !selected || selected === 'workflows' ? '1' : '2', '--test-timeout', '60000', '--first-limit', '60000', ...args,
];
const runner = baselineRequested ? await prepareFormattingBaselineRunner() : resolve('node_modules/@tanstack/oracles');
const { parseArgs } = await import(pathToFileURL(resolve(runner, 'oracle-gaps/args.mjs')).href);
// Choose entropy in this parent, before oracle-gaps installs deterministic randomness.
// A partition reuses its plan's seed; explicit replay flags retain the pin's parser semantics.
const requestedOptions = parseArgs(cliArgs);
if (baselineScope && requestedOptions.seed !== undefined && requestedOptions.seed !== baselineScope.seed) throw new Error('Formatting partition seed differs from its plan');
const seed = baselineScope?.seed ?? requestedOptions.seed ?? randomBytes(4).readInt32LE().toString();
const seedSource = baselineScope ? 'plan' : requestedOptions.seed === undefined ? 'fresh' : 'explicit';
const seedSelection: { value: string; source: 'fresh' | 'explicit' | 'plan' } = { value: seed, source: seedSource };
cliArgs.push('--seed', seed);
const options = parseArgs(cliArgs);
console.info('FORMATTING_ORACLE_SEED ' + JSON.stringify(seedSelection));
requireColdFormattingCheck(options);
if (baselineRequested !== (options.baselineOnly === true)) throw new Error('Formatting baseline dispatch does not match the parsed mode');
if (options.baselineOnly && (options.pkg !== await realpath(process.cwd()) || selected || process.env.FORMATTING_ORACLE_FILE !== undefined || options.config !== 'vitest.oracle.config.ts' || options.envPrefix !== 'ORACLE' || options.seed !== seedSelection.value || JSON.stringify(options.sources) !== JSON.stringify(sources.split(',')) || options.testTimeout !== 60000 || options.firstLimit !== 60000 || ['PATH', 'PROPERTY', 'UNIT', 'CALIBRATION', 'RUNS_MULTIPLIER', 'REPLAY_WITNESS', 'REPLAY_WITNESS_MODE'].some(name => process.env['ORACLE_' + name] !== undefined) || process.env.ORACLE_MANIFEST !== undefined)) throw new Error('Formatting baseline-only checks require the complete formatting config, recorded seed and original budgets, and no file or replay selections');
if (options.baselineOnly && (!Number.isSafeInteger(options.contexts) || options.contexts < 1 || options.contexts > 4)) throw new Error('Formatting baseline-only checks require one to four independent application contexts');
const expectedFiles = options.baselineOnly ? baselineScope?.files ?? (await readdir(resolve('test-ui'))).filter(file => /^editor-.*\.oracle\.test\.ts$/.test(file)).map(file => 'test-ui/' + file).sort() : undefined;

if (baselineScope && (!options.baselineOnly || options.contexts !== 2 || engine !== 'chromium' || isolation !== 'process')) throw new Error('Formatting partitions require baseline-only, two contexts and isolated Chromium');
const out = options.out;
const topology = await startBrowserTopology({ root: process.cwd(), out, runnerRoot: runner, options, cliArgs, seedSelection, engine, isolation,
  launchOptions: browserLaunchOptions(), reportedExecutable: browserEngines[engine].executablePath() });
let application: Awaited<ReturnType<typeof formattingApplication>> | undefined;
let applications: Awaited<ReturnType<typeof formattingApplicationPool>> | undefined;
let browser: BrowserServer | undefined;
let child: ReturnType<typeof spawn> | undefined;
let failure: unknown;
let reportSource: string | undefined;
let stopSignal: string | undefined;
const stop = (signal: string) => { stopSignal = signal; child?.kill('SIGTERM'); };
const interrupt = () => stop('SIGINT'), terminate = () => stop('SIGTERM');
const requireRunning = () => { if (stopSignal) throw new Error('Formatting oracle startup interrupted by ' + stopSignal); };
process.on('SIGINT', interrupt);
process.on('SIGTERM', terminate);
try {
  // The complete CI baseline gives every file/pass a fresh DB. A parent-owned
  // bounded pool survives worker cancellation and retains every acquired host.
  if (options.baselineOnly) applications = await formattingApplicationPool(options.contexts, topology.invocation, expectedFiles!.map(file => resolve(file)));
  else {
    application = await formattingApplication();
    await writeFile(resolve(out, 'application-inputs.json'), JSON.stringify(application.metadata, null, 2) + '\n', { flag: 'wx' });
  }
  requireRunning();
  // Optional explicit native-host experiment; default uses the bundled engine.
  // Keep mixed-version evidence distinguishable from a matched package install.
  // Opt-in Linux Chromium isolation gives each oracle file/unit its own process.
  if (isolation === 'shared') browser = await browserEngines[engine].launchServer(browserLaunchOptions());
  requireRunning();
  const receivingEvidence = resolve(out, 'receiving-traces');
  await mkdir(receivingEvidence);
  child = spawn(process.execPath, [resolve(runner, 'oracle-gaps/index.mjs'), ...cliArgs], {
    stdio: 'inherit', env: {
      ...process.env,
      FORMATTING_ORACLE_ENGINE: engine, FORMATTING_ORACLE_BROWSER_ISOLATION: isolation,
      FORMATTING_ORACLE_TOPOLOGY: topology.path, FORMATTING_ORACLE_INVOCATION: topology.invocation,
      FORMATTING_ORACLE_RECEIVER: receiver ? '1' : '0',
      FORMATTING_ORACLE_RECEIVING_EVIDENCE: receivingEvidence,
      FORMATTING_ORACLE_BROWSER: browser?.wsEndpoint() ?? '',
      FORMATTING_ORACLE_APPLICATION_BROKER: applications?.endpoint ?? '',
      FORMATTING_ORACLE_APPLICATION_TOKEN: applications?.token ?? '',
      // The pristine full-audit runner retains its existing singleton fixture.
      // Baseline workers must consume their explicit per-unit provided host.
      FORMATTING_ORACLE_ORIGIN: application?.origin ?? '',
      FORMATTING_ORACLE_APP: application?.script ?? '', FORMATTING_ORACLE_COOKIE: application?.cookie ?? '',
      ...(selected ? { FORMATTING_ORACLE_FILE: selected } : {}),
      ...(baselineScope ? { FORMATTING_BASELINE_SCOPE: JSON.stringify(baselineScope) } : {}),
    }
  });
  process.exitCode = await new Promise<number>((resolve, reject) => {
    child!.once('error', reject);
    child!.once('exit', code => resolve(code ?? 1));
  });
  // oracle-gaps intentionally exits zero after a completed report, including a
  // failing baseline. CI must still reject actual failing oracle registrations.
  if (process.exitCode === 0) {
    // Only a successful child in this wrapper's fresh directory can supply a
    // report. Keep these exact bytes; finalization must not reread another run.
    reportSource = await readFile(resolve(out, 'results.json'), 'utf8');
    const report = JSON.parse(reportSource);
    if (report.options?.seed !== seedSelection.value) throw new Error('Formatting report seed differs from its invocation');
    requireFormattingCheckPurpose(report, options.baselineOnly === true, expectedFiles, selected ?? process.env.FORMATTING_ORACLE_FILE, options, baselineScope?.tests);
    requireExecutedFormattingOracles(report, selected ?? process.env.FORMATTING_ORACLE_FILE, options);
    applications?.requireComplete();
    if (report.provisional || report.baseline.some((row: { failed: number }) => row.failed > 0) || report.nondeterministic.length) process.exitCode = 1;
  }
} catch (error) { failure = error; }
finally {
  process.off('SIGINT', interrupt); process.off('SIGTERM', terminate);
  const cleaned = await Promise.allSettled([browser?.close(), application?.close(), applications?.close()]);
  const errors = cleaned.filter((result): result is PromiseRejectedResult => result.status === 'rejected').map(result => result.reason);
  if (errors.length) failure = new AggregateError([...(failure ? [failure] : []), ...errors], 'Formatting oracle cleanup failed', { cause: failure });
  if (applications) try {
    await writeFile(resolve(out, 'application-topology.json'), JSON.stringify(applications.snapshot(), null, 2) + '\n', { flag: 'wx' });
  } catch (error) { failure = new AggregateError([...(failure ? [failure] : []), error], 'Formatting application topology recording failed', { cause: failure }); }
}
try { await finishBrowserTopology(topology, { exitCode: process.exitCode ?? null, failure, reportSource }); }
catch (error) { failure = new AggregateError([...(failure ? [failure] : []), error], 'Formatting topology finalization failed', { cause: failure }); }
if (failure) throw failure;
if (baselineScope && process.exitCode === 0) partitionControls!.finishBaselinePartition(baselineScope, out, options);
