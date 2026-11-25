/** Shared validation of the unchanged runner's actual reports. */
import { createHash } from 'node:crypto';

/** A completed mutation report must include executed oracle baselines. */
export function requireExecutedFormattingOracles(report: unknown, selected?: string, requestedOptions?: { only?: ReadonlySet<string> }) {
  const baseline = (report as { baseline?: unknown } | null)?.baseline;
  if (!Array.isArray(baseline) || baseline.length === 0) throw new Error('Formatting oracle report has no baseline rows; no oracle tests ran');
  const count = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
  const oracleFiles: string[] = [];
  for (const value of baseline) {
    const row = value as { file?: unknown; ordinary?: unknown; passed?: unknown; failed?: unknown; skipped?: unknown } | null;
    if (!row || typeof row.file !== 'string' || row.file.length === 0 || typeof row.ordinary !== 'boolean' || !count(row.passed) || !count(row.failed) || !count(row.skipped)) throw new Error('Formatting oracle report has an invalid baseline row');
    if (row.ordinary) continue;
    if (row.passed + row.failed === 0) throw new Error('Formatting oracle report ran no tests for ' + row.file);
    oracleFiles.push(row.file);
  }
  if (oracleFiles.length === 0) throw new Error('Formatting oracle report has no oracle baseline rows');
  const expected = selected === 'receivers'
    ? ['test-ui/editor-bracket-receiver.oracle.test.ts', 'test-ui/editor-escape-layers.oracle.test.ts', 'test-ui/editor-receivers.oracle.test.ts']
    : selected === 'session' ? ['test-ui/editor-session.oracle.test.ts', 'test-ui/editor-newline-history.oracle.test.ts']
    : selected ? [`test-ui/editor-${selected}.oracle.test.ts`] : [];
  const group = selected === 'receivers' || selected === 'session';
  if (group && oracleFiles.some(file => !expected.includes(file))) throw new Error('Formatting oracle report contains a baseline outside the selected ' + selected + ' group');
  // --only scopes baselines to selected owners. --sample alone samples mutants
  // while retaining all baselines in the installed runner.
  const required = group && requestedOptions?.only !== undefined ? [] : expected;
  for (const file of required) if (!oracleFiles.includes(file)) throw new Error('Formatting oracle report is missing the selected baseline: ' + file);
}

/** Bind CI's complete two-pass receipt to its requested check purpose. */
export function requireFormattingCheckPurpose(report: any, baselineOnly: boolean, expectedFiles?: string[], selected?: string, requestedOptions?: any, shardTests?: string[]) {
  // The unmodified pinned runner remains the full-audit default.
  if (!baselineOnly && report?.schemaVersion === undefined && report?.purpose === undefined && report?.status === undefined) return;
  if (report?.schemaVersion !== 1 || report.purpose !== (baselineOnly ? 'baseline-only' : 'mutation-audit') || report.status !== (baselineOnly ? 'baseline-completed' : 'completed') || report.options?.baselineOnly !== baselineOnly) throw new Error('Formatting oracle report purpose/schema/options do not match this invocation');
  if (!baselineOnly) return;
  if (requestedOptions && JSON.stringify(report.options) !== JSON.stringify({ ...requestedOptions, only: requestedOptions.only && [...requestedOptions.only] })) throw new Error('Formatting baseline report options differ from the requested invocation');
  if (typeof report.provisional !== 'boolean' || !Array.isArray(report.nondeterministic) || report.mutationAudit?.status !== 'not-run' || report.results !== null || !Array.isArray(report.oracleFiles) || report.oracleFiles.length === 0 || report.oracleFiles.some((file: unknown) => typeof file !== 'string' || !file) || new Set(report.oracleFiles).size !== report.oracleFiles.length || !Array.isArray(report.baselinePasses) || report.baselinePasses.length !== 2 || !expectedFiles?.length || JSON.stringify([...report.oracleFiles].sort()) !== JSON.stringify([...expectedFiles].sort())) throw new Error('Formatting baseline report has an invalid discovered scope or mutation status');
  let firstKeys: string[] | undefined;
  let firstCapture: Map<string, any> | undefined;
  const differences: string[] = [];
  let failed = false;
  for (const [index, pass] of report.baselinePasses.entries()) {
    if (pass?.name !== ['first', 'repeat'][index] || !Array.isArray(pass.capture) || createHash('sha256').update(JSON.stringify(pass.capture)).digest('hex') !== pass.captureSha256) throw new Error('Formatting baseline capture fingerprint is invalid');
    requireExecutedFormattingOracles({ baseline: pass.baseline }, selected, requestedOptions);
    const files = pass.baseline.filter((row: any) => !row.ordinary).map((row: any) => row.file).sort();
    if (new Set(files).size !== files.length || JSON.stringify(files) !== JSON.stringify([...report.oracleFiles].sort())) throw new Error('Formatting baseline pass is missing a discovered oracle file');
    const keys = pass.capture.map((row: any) => row?.key);
    if (keys.some((key: unknown) => typeof key !== 'string') || new Set(keys).size !== keys.length) throw new Error('Formatting baseline capture keys are invalid');
    for (const item of pass.capture) {
      const count = (value: unknown) => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
      if (!/^[a-f0-9]{40}$/.test(item.hash ?? '') || (item.observed !== undefined && !/^[a-f0-9]{40}$/.test(item.observed)) || !count(item.count) || !count(item.calls) || !count(item.ms) || !Array.isArray(item.hits) || !Array.isArray(item.infected) || !Array.isArray(item.operands) || !Array.isArray(item.outcomes) || !Array.isArray(item.verdicts) || typeof item.message !== 'string') throw new Error('Formatting baseline capture instrumentation is incomplete');
      const before = firstCapture?.get(item.key);
      if (before && (before.hash !== item.hash || before.observed !== item.observed)) differences.push(item.key);
    }
    if (!firstCapture) firstCapture = new Map(pass.capture.map((item: any) => [item.key, item]));
    const oracleCapture = pass.capture.filter((item: any) => report.oracleFiles.some((file: string) => item.key.startsWith(file + ' > ')));
    if (oracleCapture.length !== pass.capture.length) throw new Error('Formatting baseline capture contains an unexpected file');
    const sortedKeys = [...keys].sort();
    if (shardTests && (files.length !== 1 || JSON.stringify(sortedKeys) !== JSON.stringify(shardTests.map(name => files[0] + ' > ' + name).sort()))) throw new Error('Formatting baseline does not match the selected test shard');
    if (firstKeys && JSON.stringify(sortedKeys) !== JSON.stringify(firstKeys)) throw new Error('Formatting baseline passes captured different registrations');
    firstKeys = sortedKeys;
    for (const row of pass.baseline.filter((row: any) => !row.ordinary)) {
      const captured = oracleCapture.filter((item: any) => item.key.startsWith(row.file + ' > '));
      if ((!shardTests && row.skipped !== 0) || captured.length !== row.passed + row.failed || captured.filter((item: any) => item.state === 'pass').length !== row.passed || captured.filter((item: any) => item.state === 'fail').length !== row.failed || captured.some((item: any) => !['fixed seed', 'fixed history', 'case', 'random seed', 'calibration'].includes(item.route))) throw new Error('Formatting baseline capture does not account for its executed oracle tests: ' + row.file);
      failed ||= !!row.failure || row.failed > 0;
    }
  }
  const prefix = typeof report.options.pkg === 'string' ? report.options.pkg.replace(/\/$/, '') + '/' : '';
  const reportedDifferences = report.nondeterministic.map((key: unknown) => {
    if (typeof key !== 'string') throw new Error('Formatting baseline nondeterminism keys are invalid');
    return prefix && key.startsWith(prefix) ? key.slice(prefix.length) : key;
  }).sort();
  if (new Set(reportedDifferences).size !== reportedDifferences.length || JSON.stringify(reportedDifferences) !== JSON.stringify(differences.sort())) throw new Error('Formatting baseline nondeterminism status differs from captured observations');
  if (failed !== report.provisional) throw new Error('Formatting baseline provisional status does not match both passes');
  if (JSON.stringify(report.baseline) !== JSON.stringify(report.baselinePasses[0].baseline)) throw new Error('Formatting baseline status differs from its first-pass receipt');
}
