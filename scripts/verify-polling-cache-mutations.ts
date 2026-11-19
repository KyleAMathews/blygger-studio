/** Isolated production controls for ORC-006. Copy only project sources and
 * public test fixtures, not host credentials or contributor planning directories.
 * A nonzero exit counts only if it reaches the intended assertion checkpoint.
 * Baseline, mutation and restore use the same exact receiving test command.
 */
import assert from 'node:assert/strict';
import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { stripVTControlCharacters } from 'node:util';
import { capturedOracleReplay, type CapturedOracleFailure, type OracleReplayReceipt } from './oracle-replay-receipt.ts';
import { verifyOracleMutation } from './oracle-mutation-control.ts';

const root = resolve('.'), temp = mkdtempSync(join(tmpdir(), 'blygger-polling-controls-'));
const controls = [
  { name: 'old feed overwrite', file: 'src/feed-cache.ts', from: "onlyIf: new Headers(current ? { 'If-Match': current.httpEtag } : { 'If-None-Match': '*' }),", to: '', test: 'test/polling-cache.oracle.test.ts', pattern: 'old builders cannot overwrite', checkpoint: 'feed response', law: 'feed publication' },
  { name: 'body-only ETag ABA', file: 'src/feed-cache.ts', from: 'const body = stamp(xml, target);', to: 'const body = xml;', test: 'test/polling-cache.oracle.test.ts', pattern: 'old builders cannot overwrite', checkpoint: 'feed generation bytes', law: 'feed publication' },
  { name: 'mixed feed read', file: 'src/feed-cache.ts', from: 'if (!same(target, await readFeedRevision(env.DB))) continue;', to: 'await readFeedRevision(env.DB);', test: 'test/polling-cache.oracle.test.ts', pattern: 'discards a render interrupted', checkpoint: 'feed response', law: 'feed publication' },
  { name: '304 skips check', file: 'src/feed-cache.ts', from: 'waitUntil(revalidate(request, env, mount, key, artifact)', to: "if (!request.headers.has('If-None-Match')) waitUntil(revalidate(request, env, mount, key, artifact)", test: 'test/polling-cache.oracle.test.ts', pattern: 'serves saved legal XML', checkpoint: 'feed counted work', law: 'feed publication' },
  { name: 'HEAD skips feed check', file: 'src/feed-cache.ts', from: 'waitUntil(revalidate(request, env, mount, key, artifact)', to: "if (request.method !== 'HEAD') waitUntil(revalidate(request, env, mount, key, artifact)", test: 'test/polling-cache.oracle.test.ts', pattern: 'serves saved legal XML', checkpoint: 'feed counted work', law: 'feed publication' },
  { name: 'latest Studio cache token', file: 'src/ui/revision-query.ts', from: 'return { data, generation };', to: 'const latest = await readChanges(context); return { data, generation: { epoch: latest.epoch, revision: latest.domains[domain] } };', test: 'test-ui/polling-cache-integration.test.ts', pattern: 'stores the pre-fetch token', checkpoint: 'Studio pre-fetch revision' },
  { name: 'unchanged token skips changed feed', file: 'src/feed-cache.ts', from: '=> artifact?.generation?.epoch === target.epoch && artifact.generation.revision >= target.revision;', to: '=> !!artifact;', test: 'test/polling-cache.oracle.test.ts', pattern: 'fixed seed 20261001: generated', checkpoint: 'feed settled values', law: 'feed settled values', replay: true },
  { name: 'Studio cache ignores changed revision', file: 'src/ui/revision-query.ts', from: 'cached?.generation.epoch === generation.epoch &&\n      cached.generation.revision === generation.revision', to: 'cached?.generation.epoch === generation.epoch', test: 'test-ui/polling-cache.oracle.test.ts', pattern: 'studio-polling: fixed', checkpoint: 'poll', framework: true },
  { name: 'failed Studio cache token', file: 'src/ui/revision-query.ts', from: 'const data = await load(context, generation);', to: 'if (cached) context.client.setQueryData(context.queryKey, { data: cached.data, generation }); const data = await load(context, generation);', test: 'test-ui/polling-cache-integration.test.ts', pattern: 'failed content loads retain', checkpoint: 'Studio failed-query retry' },
] as const;
const selector = process.argv[2];
const selected = selector ? controls.filter(control => control.name.includes(selector)) : controls;
assert.ok(selected.length, 'No polling mutation matches the requested name');
let primary: unknown;
try {
  for (const path of ['src', 'test', 'test-ui', 'migrations', 'extensions', 'sdk', 'build', 'package.json', 'package-lock.json', 'models.json', 'openapi.json', 'wrangler.jsonc', 'vitest.config.ts', 'vitest.ui.config.ts', 'vitest.oracles.config.ts', 'vitest.worker-oracles.config.ts', 'tsconfig.json', 'tsconfig.ui.json']) cpSync(join(root, path), join(temp, path), { recursive: true });
  mkdirSync(join(temp, 'scripts')); cpSync(join(root, 'scripts/reset-change-epoch.sql'), join(temp, 'scripts/reset-change-epoch.sql')); cpSync(join(root, 'scripts/oracles-cloudflare.ts'), join(temp, 'scripts/oracles-cloudflare.ts'));
  // Capture only the native error data that the CLI's concise gap summary omits.
  // This setup observes failures; registered properties still decide every kill.
  writeFileSync(join(temp, 'scripts/studio-replay-capture.ts'), `import { afterEach } from 'vitest';
import { appendFileSync } from 'node:fs';
afterEach(context => {
  const errors = context.task.result?.errors ?? [];
  if (!errors.length) return;
  const names = []; for (let task = context.task; task; task = task.suite) names.unshift(task.name);
  appendFileSync(process.env.STUDIO_MUTATION_RECEIPTS, JSON.stringify({ names, errors }) + '\\n');
});
`);
  writeFileSync(join(temp, 'vitest.studio-replay.config.ts'), `import base from './vitest.oracles.config.ts';
export default { ...base, test: { ...base.test, include: ['test-ui/polling-cache.oracle.test.ts'], setupFiles: [...[base.test?.setupFiles ?? []].flat(), './scripts/studio-replay-capture.ts'] } };
`);
  symlinkSync(join(root, 'node_modules'), join(temp, 'node_modules'), 'dir');
  const run = (control: typeof controls[number], replay?: { seed: string; path: string }) => {
    const ui = control.test.startsWith('test-ui/');
    const target = ui ? 'studio-polling' : 'polling-cache';
    const result = spawnSync(process.execPath, [join(root, 'node_modules/vitest/vitest.mjs'), 'run', '--maxWorkers=2', ...(ui ? ['--config', 'vitest.ui.config.ts'] : []), control.test, '-t', replay ? 'random seed: generated$' : control.pattern], {
      cwd: temp, encoding: 'utf8', timeout: 90_000,
      env: { ...process.env, WRANGLER_LOG_PATH: join(temp, 'wrangler.log'), WORKER_ORACLE_PROPERTY: replay ? target : undefined, WORKER_ORACLE_SEED: replay?.seed, WORKER_ORACLE_PATH: replay?.path, WORKER_ORACLE_UNIT: replay ? 'random seed: generated' : undefined },
    });
    // CI enables ANSI styling between the count and "passed". Formatting must
    // not change execution witnesses, checkpoint matching, or replay parsing.
    return { ...result, stdout: stripVTControlCharacters(result.stdout ?? ''), stderr: stripVTControlCharacters(result.stderr ?? '') };
  };
  for (const control of selected) {
    if (control.test.startsWith('test/') && control.test.endsWith('.oracle.test.ts')) {
      assert.ok('law' in control && typeof control.law === 'string', 'Polling control omitted its receiving law');
      verifyOracleMutation(root, temp, { name: control.name, test: control.test, pattern: control.pattern, checkpoint: control.checkpoint, law: control.law, changes: [{ file: control.file, from: control.from, to: control.to }], ...('replay' in control ? { replay: { seed: 20261001, property: 'polling-cache' } } : {}) }, `polling-mutation-${controls.indexOf(control)}`);
      continue;
    }
    if ('framework' in control) {
      // The migrated Studio property uses oracle-gaps' authored-mutant route.
      // Keep the real code unchanged, and credit a failure only to its law.
      const mutants = mkdtempSync(join(temp, 'studio-mutants-'));
      writeFileSync(join(mutants, 'ignore-revision.json'), JSON.stringify({
        id: 'studio-ignore-revision', source: control.file, find: control.from, replace: control.to,
        intent: 'A cached response must not hide a changed source revision', author: 'Studio migration control',
      }));
      let captured: OracleReplayReceipt | undefined;
      for (const replay of [false, true]) {
        const out = mkdtempSync(join(temp, 'studio-gap-'));
        const receipts = join(out, 'native-failures.jsonl');
        const result: SpawnSyncReturns<string> = spawnSync(process.execPath, [join(root, 'node_modules/@tanstack/oracles/oracle-gaps/index.mjs'),
          '--package', temp, '--source', control.file, '--config', 'vitest.studio-replay.config.ts',
          '--env-prefix', 'STUDIO_ORACLE', '--seed', replay ? captured!.seed : '20261001', '--contexts', '2', '--mutants', mutants,
          '--only', 'authored:studio-ignore-revision', '--out', out], {
          cwd: temp, encoding: 'utf8', timeout: 90_000,
          env: { ...process.env, STUDIO_MUTATION_RECEIPTS: receipts,
            STUDIO_ORACLE_PATH: replay ? captured!.path : undefined,
            STUDIO_ORACLE_PROPERTY: replay ? captured!.property : undefined,
            STUDIO_ORACLE_UNIT: replay ? captured!.unit : undefined },
        });
        const log = stripVTControlCharacters((result.stdout ?? '') + '\n' + (result.stderr ?? ''));
        writeFileSync(join(root, 'build', `studio-framework-${replay ? 'replay' : 'mutation'}.log`), log);
        assert.equal(result.status, 0, `Studio gap runner failed\n${log}`);
        const report = JSON.parse(readFileSync(join(out, 'results.json'), 'utf8')) as {
          provisional: boolean;
          nondeterministic: string[];
          baseline: { passed: number; failed: number; failure?: string }[];
          results: { id: string; outcome: string; laws?: string[] }[];
        };
        assert.equal(report.provisional, false, 'Studio report is provisional');
        assert.equal(report.nondeterministic.length, 0, 'Studio baseline is unstable');
        assert.ok(report.baseline.length > 0 && report.baseline.every(file => file.failed === 0 && file.passed > 0 && !file.failure), 'Studio baseline failed or ran no tests');
        const mutant = report.results.find(row => row.id === 'authored:studio-ignore-revision');
        assert.equal(mutant?.outcome, 'killed', `Studio changed-revision control survived\n${log}`);
        assert.ok(mutant.laws?.includes('poll work'), 'Studio control missed its intended law');
        const observed = capturedOracleReplay(readFileSync(receipts, 'utf8').trim().split('\n').filter(Boolean).map(line => JSON.parse(line) as CapturedOracleFailure), 'poll work');
        assert.equal(observed.checkpoint, control.checkpoint, 'Studio control missed its receiving checkpoint');
        if (replay) {
          assert.deepEqual(observed, captured, 'Direct replay changed the actual receipt, violated checkpoint or reduced counterexample');
          writeFileSync(join(root, 'build', 'studio-framework-replay.json'), JSON.stringify({ ...observed, outcome: 'assertion failure reproduced' }, null, 2) + '\n');
        } else captured = observed;
        console.log(`${replay ? 'Replayed' : 'Rejected'} ${control.name} through oracle-gaps at ${observed.checkpoint}: seed=${observed.seed} path=${observed.path} unit=${observed.unit}`);
      }
      continue;
    }
    assert.ok(!control.test.endsWith('.oracle.test.ts'), 'Only ordinary integration controls use bare Vitest');
    const baseline = run(control); assert.equal(baseline.status, 0, `${control.name}: baseline failure\n${baseline.stdout}\n${baseline.stderr}`);
    assert.match(baseline.stdout + baseline.stderr, /\b[1-9]\d* passed\b/, `${control.name}: baseline ran no tests`);
    const path = join(temp, control.file), original = readFileSync(path, 'utf8');
    assert.equal(original.split(control.from).length, 2, `${control.name}: ambiguous mutation anchor`);
    let mutant = original.replace(control.from, control.to);
    writeFileSync(path, mutant);
    try {
      const result = run(control), log = result.stdout + '\n' + result.stderr;
      writeFileSync(join(root, 'build', `polling-mutation-${controls.indexOf(control)}.log`), log);
      assert.equal(result.error, undefined, `${control.name}: runner/setup failure`); assert.equal(result.signal, null, `${control.name}: terminated`);
      assert.notEqual(result.status, 0, `${control.name}: survived`);
      assert.ok(log.includes(control.checkpoint), `${control.name}: missed intended checkpoint\n${log}`);
      if ('replay' in control) {
        const receipt = /seed:\s*(-?\d+),\s*path:\s*"([^"]*)"/.exec(log);
        assert.ok(receipt, 'Generated failure omitted replay seed/path');
        const replay = run(control, { seed: receipt[1], path: receipt[2] });
        const replayLog = replay.stdout + '\n' + replay.stderr;
        writeFileSync(join(root, 'build', 'polling-mutation-replay.log'), replayLog);
        assert.notEqual(replay.status, 0, 'Generated mutant replay survived');
        assert.ok(replayLog.includes(control.checkpoint), 'Replay changed the violated law');
        console.log(`Replayed ${control.checkpoint}: seed=${receipt[1]} path=${receipt[2]}`);
      }
      console.log(`Rejected ${control.name} at ${control.checkpoint}`);
    } finally { writeFileSync(path, original); }
  }
} catch (error) { primary = error; throw error; }
finally {
  try { rmSync(temp, { recursive: true, force: true }); }
  catch (cleanup) { if (primary) throw new AggregateError([primary, cleanup], 'Oracle mutation failure and cleanup failure', { cause: primary }); throw cleanup; }
}
