/** Run historical mutation controls through registered oracle verdicts. Authored
 * controls keep a clean baseline; compound controls are explicit manual RED
 * experiments because the preview's authored format can patch only one file.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { stripVTControlCharacters } from 'node:util';
import { capturedOracleReplay, type CapturedOracleFailure, type OracleReplayReceipt } from './oracle-replay-receipt.ts';

export interface OracleControlChange { file: string; from: string; to: string; all?: boolean }
export interface OracleMutationControl {
  name: string; test: string; pattern: string; checkpoint: string; law: string;
  changes: readonly OracleControlChange[];
  replay?: { seed: number; property: string };
  /** An additional single-file sensitivity witness when the original
   * compound's individual file edits remain protected by another defense. */
  compoundWitness?: { name: string; changes: readonly OracleControlChange[] };
}
interface GapReport {
  provisional: boolean;
  baseline: { file: string; passed: number; failed: number; skipped?: number; failure?: string }[];
  nondeterministic: string[];
  results: { id: string; outcome: string; laws?: string[] }[];
}
const marker = 'ORACLE_CONTROL_FAILURE ';
const setup = `import { afterEach } from 'vitest';
function errorData(value) {
  if (!value || typeof value !== 'object') return { message: String(value) };
  return { message: String(value.message ?? ''), cause: value.cause === undefined ? undefined : errorData(value.cause), errors: Array.isArray(value.errors) ? value.errors.map(errorData) : undefined };
}
afterEach(context => {
  const errors = context.task.result?.errors ?? [];
  if (!errors.length) return;
  const names = []; for (let task = context.task; task; task = task.suite) names.unshift(task.name);
  process.stdout.write(${JSON.stringify(marker)} + JSON.stringify({ names, errors: errors.map(errorData) }) + '\\n');
});
`;
function errorMessages(value: unknown): string[] {
  if (!value || typeof value !== 'object') return [];
  const error = value as { message?: string; cause?: unknown; errors?: unknown[] };
  return [error.message ?? '', ...errorMessages(error.cause), ...(error.errors ?? []).flatMap(errorMessages)];
}
export function nativeOracleFailures(output: string): CapturedOracleFailure[] {
  return output.split('\n').flatMap(line => {
    const at = line.indexOf(marker);
    return at < 0 ? [] : [JSON.parse(line.slice(at + marker.length)) as CapturedOracleFailure];
  });
}
function assertVerdict(failures: CapturedOracleFailure[], control: OracleMutationControl) {
  const header = ` violated at checkpoint "${control.checkpoint}" (law: ${control.law}).`;
  assert.ok(failures.some(failure => failure.errors.flatMap(errorMessages).some(message => message.split('\n').some(line => line.endsWith(header)))), `${control.name}: no registered violation at ${control.checkpoint} under ${control.law}`);
}
/** One contiguous, unique authored patch preserves replaceAll and same-file
 * multi-edit controls. Its anchor starts on the changed source line, where the
 * owning function/file lives, rather than at an unrelated module preamble.
 */
export function authoredControlPatch(original: string, changes: readonly OracleControlChange[]) {
  let replacement = original;
  for (const change of changes) {
    assert.ok(replacement.includes(change.from), `Missing mutation anchor in ${change.file}`);
    if (!change.all) assert.equal(replacement.split(change.from).length, 2, `Ambiguous mutation anchor in ${change.file}`);
    replacement = change.all ? replacement.replaceAll(change.from, change.to) : replacement.replace(change.from, change.to);
  }
  assert.notEqual(replacement, original, 'Mutation control made no source change');
  let start = 0;
  while (original[start] === replacement[start]) start++;
  start = original.lastIndexOf('\n', start - 1) + 1;
  let tail = 0;
  while (tail < original.length - start && tail < replacement.length - start && original[original.length - 1 - tail] === replacement[replacement.length - 1 - tail]) tail++;
  let end = original.length - tail;
  const lineEnd = original.indexOf('\n', end);
  if (lineEnd >= 0) end = lineEnd + 1;
  else end = original.length;
  while (original.indexOf(original.slice(start, end)) !== original.lastIndexOf(original.slice(start, end))) {
    if (start) start = original.lastIndexOf('\n', start - 2) + 1;
    else { const next = original.indexOf('\n', end); end = next < 0 ? original.length : next + 1; }
  }
  return { find: original.slice(start, end), replace: replacement.slice(start, replacement.length - (original.length - end)) };
}
export function oracleControlTestPattern(control: Pick<OracleMutationControl, 'pattern' | 'replay'>, receipt?: OracleReplayReceipt) {
  const literal = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (receipt) return literal(receipt.property) + '(?: | > )' + literal(receipt.unit) + '$';
  // A source edit can break several owning properties. The gap runner stops
  // after its first rejecting law, so capture must select the requested replay
  // property as well as the historical test pattern. Other controls keep their
  // complete original baseline selection.
  return control.replay ? '^(?=[\\s\\S]*(?:' + control.pattern + '))' + literal(control.replay.property) + '(?: | > )' : control.pattern;
}
export function verifyOracleMutation(root: string, sandbox: string, control: OracleMutationControl, artifact: string) {
  const runtime = control.test.startsWith('test-ui/') ? 'studio' : 'worker';
  const prefix = runtime === 'studio' ? 'STUDIO_ORACLE' : 'WORKER_ORACLE';
  const base = runtime === 'studio' ? 'vitest.oracles.config.ts' : 'vitest.worker-oracles.config.ts';
  const workspace = realpathSync(mkdtempSync(join(sandbox, 'oracle-control-')));
  const archive = join(root, 'build', 'oracle-control-evidence', basename(workspace));
  mkdirSync(archive, { recursive: true });
  const config = join(workspace, 'vitest.config.ts');
  const capture = join(workspace, 'capture.mjs');
  writeFileSync(capture, setup);
  const sources = [...new Set(control.changes.map(change => change.file))];
  const originals = new Map(sources.map(file => [file, readFileSync(join(sandbox, file), 'utf8')]));
  const mutants = join(workspace, 'mutants'); mkdirSync(mutants);
  const id = 'historical-' + artifact.replace(/[^a-z0-9-]/gi, '-');
  const witness = control.compoundWitness?.changes ?? control.changes.filter(change => change.file === sources[0]);
  const witnessSource = witness[0].file;
  assert.ok(witness.every(change => change.file === witnessSource), 'An authored sensitivity witness must change exactly one source');
  writeFileSync(join(mutants, 'control.json'), JSON.stringify({
    id, source: witnessSource, ...authoredControlPatch(readFileSync(join(sandbox, witnessSource), 'utf8'), witness),
    intent: control.compoundWitness?.name ?? control.name, author: 'Historical Blygger mutation control',
  }));
  const run = (mode: 'authored' | 'manual-red', receipt?: OracleReplayReceipt) => {
    const pattern = oracleControlTestPattern(control, receipt);
    writeFileSync(config, `import base from ${JSON.stringify(join(sandbox, base))};\nexport default { ...base, test: { ...base.test, include: [${JSON.stringify(control.test)}], exclude: [], maxWorkers: 2, testNamePattern: ${JSON.stringify(pattern)}, setupFiles: [...[base.test?.setupFiles ?? []].flat(), ${JSON.stringify(capture)}] } };\n`);
    const out = realpathSync(mkdtempSync(join(workspace, mode + '-')));
    const args = [join(root, 'node_modules/@tanstack/oracles/oracle-gaps/index.mjs'), '--package', sandbox, '--source', sources.join(','), '--config', config,
      '--env-prefix', prefix, '--seed', receipt?.seed ?? String(control.replay?.seed ?? 20261001), '--contexts', '2', '--out', out,
      ...(mode === 'authored' ? ['--mutants', mutants, '--only', 'authored:' + id] : [])];
    const child = spawnSync(process.execPath, args, { cwd: sandbox, encoding: 'utf8', timeout: 180_000,
      env: { ...process.env, BLYG_ORACLE_FILES: control.test, WRANGLER_LOG_PATH: join(out, 'wrangler.log'),
        [prefix + '_PROPERTY']: receipt?.property, [prefix + '_PATH']: receipt?.path, [prefix + '_UNIT']: receipt?.unit } });
    const log = stripVTControlCharacters((child.stdout ?? '') + '\n' + (child.stderr ?? ''));
    const evidence = join(archive, artifact + (receipt ? '-replay' : '') + '-' + mode);
    writeFileSync(evidence + '.log', log);
    for (const file of ['error.log', 'summary.md', 'stream.log']) if (existsSync(join(out, file))) copyFileSync(join(out, file), evidence + '-' + file);
    assert.equal(child.error, undefined, `${control.name}: gap runner error\n${log}`);
    assert.equal(child.signal, null, `${control.name}: gap runner terminated\n${log}`);
    assert.ok(existsSync(join(out, 'results.json')), `${control.name}: gap run omitted its report\n${log}`);
    const report = JSON.parse(readFileSync(join(out, 'results.json'), 'utf8')) as GapReport;
    copyFileSync(join(out, 'results.json'), evidence + '.json');
    const output = existsSync(join(out, 'test-output.log')) ? readFileSync(join(out, 'test-output.log'), 'utf8') : '';
    writeFileSync(evidence + '-native.log', output);
    if (mode === 'manual-red') {
      assert.ok(report.baseline.some(file => file.file.endsWith(control.test) && file.failed > 0), `${control.name}: compound control did not make its receiving baseline RED\n${log}`);
    } else {
      assert.equal(child.status, 0, `${control.name}: gap runner failed\n${log}`);
      assert.equal(report.provisional, false, `${control.name}: provisional report cannot establish a clean baseline`);
      assert.ok(report.baseline.every(file => file.failed === 0 && !file.failure), `${control.name}: clean baseline failed`);
      assert.ok(report.baseline.some(file => file.file.endsWith(control.test) && file.passed > 0), `${control.name}: target baseline ran no tests`);
      assert.equal(report.nondeterministic.length, 0, `${control.name}: unstable clean baseline`);
      const selected = report.results.filter(row => row.outcome !== 'unowned');
      assert.ok(selected.length > 0 && selected.every(row => row.outcome === 'killed'), `${control.name}: ${mode} left an open gap; see ${evidence}.json`);
      if (mode === 'authored') {
        const mutant = report.results.find(row => row.id === 'authored:' + id);
        assert.equal(mutant?.outcome, 'killed', `${control.name}: authored control was not killed`);
        assert.ok(mutant.laws?.includes(control.law), `${control.name}: authored kill missed ${control.law}`);
      }
    }
    const failures = nativeOracleFailures(output);
    assertVerdict(failures, control);
    return failures;
  };
  if (sources.length === 1) {
    const failures = run('authored');
    if (control.replay) {
      const captured = capturedOracleReplay(failures, control.law);
      assert.equal(captured.property, control.replay.property, `${control.name}: another property supplied its replay`);
      assert.equal(captured.checkpoint, control.checkpoint, `${control.name}: capture changed the intended checkpoint`);
      const repeated = capturedOracleReplay(run('authored', captured), control.law);
      assert.deepEqual(repeated, captured, `${control.name}: direct replay changed its native receipt`);
      writeFileSync(join(root, 'build', artifact + '-replay.json'), JSON.stringify({ ...repeated, outcome: 'registered assertion failure reproduced' }, null, 2) + '\n');
    }
    console.log(`Rejected ${control.name} through an authored oracle-gaps control at ${control.checkpoint} (${control.law})`);
    return;
  }
  // The preview authored schema has only one source. Keep the historical
  // compound experiment intact and label its failure as a manual baseline RED.
  // A single-file sensitivity witness is additional to the intact compound
  // experiment. When its original file edits mask one another, the explicit
  // supplemental witness must still reject the same checkpoint and law.
  run('authored');
  try {
    for (const source of sources) {
      let text = originals.get(source)!;
      for (const change of control.changes.filter(change => change.file === source)) {
        assert.ok(text.includes(change.from), `Missing compound anchor in ${source}`);
        if (!change.all) assert.equal(text.split(change.from).length, 2, `Ambiguous compound anchor in ${source}`);
        text = change.all ? text.replaceAll(change.from, change.to) : text.replace(change.from, change.to);
      }
      writeFileSync(join(sandbox, source), text);
    }
    run('manual-red');
    console.log(`Confirmed ${control.name} as manual compound RED at ${control.checkpoint} (${control.law}); no framework mutant kill claimed`);
  } finally { for (const [source, original] of originals) writeFileSync(join(sandbox, source), original); }
}
