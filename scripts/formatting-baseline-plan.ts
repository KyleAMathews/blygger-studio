/** Complete-file baseline plans and fail-closed aggregation; never a mutation verdict. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { lstatSync, mkdirSync, readFileSync, readdirSync, readlinkSync, realpathSync, writeFileSync } from 'node:fs';
import { release } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import { requireExecutedFormattingOracles, requireFormattingCheckPurpose } from './formatting-baseline-evidence.ts';

export const baselineSources = ['src/ui/format-shortcuts.ts', 'src/ui/links.ts', 'src/ui/draft.ts'];
type Input = { path: string; sha256: string; link?: string; resolved?: { path: string; sha256: string } };
type Inventory = { file: string; sha256: string; properties: string[] }[];
export interface BaselinePlan {
  schema: 'blygger-formatting-baseline-plan-v2';
  commit: string; runId: string; attempt: string; root: string; deadline: number;
  host: ReturnType<typeof hostIdentity>;
  sources: string[]; receiver: 1; contexts: 2; seed: string; seedSource: 'fresh'; testTimeout: 60000; firstLimit: 60000;
  inventory: Inventory; inputs: Input[]; inputsSha256: string;
  parts: { id: string; files: string[] }[];
}
export interface BaselineScope { plan: string; planSha256: string; part: string; files: string[]; seed: string }
const encode = (value: unknown) => JSON.stringify(value, null, 2) + '\n';
export const digest = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex');
const json = (file: string) => JSON.parse(readFileSync(file, 'utf8'));
const same = (a: unknown, b: unknown, message: string) => assert.deepEqual(a, b, message);
const unique = (values: string[], message: string) => assert.equal(new Set(values).size, values.length, message);
function checked(condition: unknown, message: string): asserts condition { assert.ok(condition, message); }
function hostIdentity() {
  return { platform: process.platform, architecture: process.arch, kernel: release(), node: process.version,
    nodeSha256: digest(readFileSync(process.execPath)), imageOS: process.env.ImageOS ?? '', imageVersion: process.env.ImageVersion ?? '',
    environment: Object.fromEntries(['CI', 'GITHUB_ACTIONS', 'TZ', 'LANG', 'LC_ALL'].map(name => [name, process.env[name] ?? null])) };
}
function unwrap(node: ts.Expression): ts.Expression {
  while (ts.isAsExpression(node) || ts.isSatisfiesExpression(node) || ts.isParenthesizedExpression(node) || ts.isTypeAssertionExpression(node)) node = node.expression;
  return node;
}
function strings(expression: ts.Expression): string[] {
  const node = unwrap(expression);
  if (ts.isStringLiteralLike(node)) return [node.text];
  if (ts.isArrayLiteralExpression(node)) return node.elements.flatMap(value => strings(value));
  throw new Error('Formatting inventory must be literal: ' + node.getText());
}
/** Static IDs are inventory, never a substitute for the actual Vitest registration roster. */
export function baselineInventory(root: string): Inventory {
  const registryPath = 'test-ui/editor-oracles/property-registry-oracle.ts';
  const parse = (file: string) => ts.createSourceFile(file, readFileSync(resolve(root, file), 'utf8'), ts.ScriptTarget.Latest, true);
  const registry = (name: string) => {
    for (const statement of parse(registryPath).statements) if (ts.isVariableStatement(statement))
      for (const item of statement.declarationList.declarations)
        if (ts.isIdentifier(item.name) && item.name.text === name && item.initializer) return strings(item.initializer).sort();
    throw new Error('Missing formatting registry: ' + name);
  };
  const files = readdirSync(resolve(root, 'test-ui')).filter(file => /^editor-.*\.oracle\.test\.ts$/.test(file)).map(file => 'test-ui/' + file).sort();
  same(registry('formattingOracleFiles'), files, 'Formatting registry/filesystem mismatch');
  const inventory = files.map(file => {
    const properties: string[] = [];
    const visit = (node: ts.Node) => {
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'oracleProperty') {
        const options = node.arguments[0] && unwrap(node.arguments[0]);
        checked(options && ts.isObjectLiteralExpression(options), 'Formatting property options must be explicit');
        const id = options.properties.find(property => ts.isPropertyAssignment(property) && property.name.getText() === 'id');
        checked(id && ts.isPropertyAssignment(id), 'Formatting property ID is missing');
        properties.push(...strings(id.initializer));
      }
      ts.forEachChild(node, visit);
    };
    visit(parse(file));
    checked(properties.length, 'Formatting oracle has no literal properties: ' + file);
    unique(properties, 'Duplicate formatting property');
    return { file, sha256: digest(readFileSync(resolve(root, file))), properties: properties.sort() };
  });
  const properties = inventory.flatMap(row => row.properties).sort();
  unique(properties, 'Duplicate runtime property ID');
  same(registry('formattingOracleProperties'), properties, 'Formatting property registry mismatch');
  return inventory;
}
/** Conservative repository + complete installed dependency/browser trees, before execution.
 * New or changed bytes fail the final comparison, including unexpected cache writes.
 * System libraries are represented by the runner image/kernel identity, not a source claim.
 */
export function baselineInputs(root: string): Input[] {
  root = realpathSync(root);
  const contained = (target: string) => target.startsWith(root + '/');
  const names = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean);
  const addTree = (at: string) => {
    const full = resolve(root, at), stat = lstatSync(full);
    checked(stat.isDirectory() && !stat.isSymbolicLink() && realpathSync(full) === full, 'Input tree is not an ordinary repository directory: ' + at);
    for (const name of readdirSync(resolve(root, at)).sort()) {
      const path = at + '/' + name, stat = lstatSync(resolve(root, path));
      if (stat.isDirectory()) addTree(path); else names.push(path);
    }
  };
  addTree('node_modules');
  checked(process.env.PLAYWRIGHT_BROWSERS_PATH === resolve(root, 'build/formatting-browsers'), 'Baseline partitions need the explicit browser installation directory');
  addTree('build/formatting-browsers');
  return [...new Set(names)].sort().map(path => {
    const full = resolve(root, path), stat = lstatSync(full);
    checked(relative(root, full) === path && !path.startsWith('../'), 'Input escapes the repository');
    if (stat.isSymbolicLink()) {
      const target = realpathSync(full);
      checked(contained(target), 'Input symlink escapes the repository: ' + path);
      checked(lstatSync(target).isFile(), 'Input symlink target is not a regular file: ' + path);
      const link = readlinkSync(full);
      return { path, sha256: digest(link), link, resolved: { path: relative(root, target), sha256: digest(readFileSync(target)) } };
    }
    checked(stat.isFile() && contained(realpathSync(full)), 'Input is not a regular repository file: ' + path);
    return { path, sha256: digest(readFileSync(full)) };
  });
}
export function validatePlan(plan: BaselinePlan, inventory: Inventory) {
  checked(plan?.schema === 'blygger-formatting-baseline-plan-v2' && /^[a-f0-9]{40}$/.test(plan.commit) && /^\d+$/.test(plan.runId) && /^\d+$/.test(plan.attempt), 'Invalid baseline plan identity');
  checked(typeof plan.root === 'string' && plan.root.startsWith('/') && Number.isSafeInteger(plan.deadline) && plan.deadline >= 0, 'Invalid baseline plan root/deadline');
  same(plan.sources, baselineSources, 'Changed source order');
  checked(typeof plan.seed === 'string' && /^-?(0|[1-9]\d*)$/.test(plan.seed) && String(Number(plan.seed)) === plan.seed && Number.isInteger(Number(plan.seed)) && Number(plan.seed) >= -2147483648 && Number(plan.seed) <= 2147483647 && plan.seedSource === 'fresh', 'Invalid baseline campaign seed');
  same([plan.receiver, plan.contexts, plan.testTimeout, plan.firstLimit], [1, 2, 60000, 60000], 'Changed baseline execution contract');
  same(plan.inventory, inventory, 'Stale baseline inventory');
  checked(plan.inputs?.length > 0 && digest(JSON.stringify(plan.inputs)) === plan.inputsSha256, 'Invalid baseline input manifest');
  unique(plan.inputs.map(row => row.path), 'Duplicate input path');
  const inputPath = (path: unknown) => typeof path === 'string' && path.length > 0 && relative(plan.root, resolve(plan.root, path)) === path && !path.startsWith('../');
  for (const input of plan.inputs) {
    checked(inputPath(input.path) && /^[a-f0-9]{64}$/.test(input.sha256), 'Invalid baseline input row');
    checked(input.link === undefined ? input.resolved === undefined : typeof input.link === 'string' && input.link.length > 0 && digest(input.link) === input.sha256 && input.resolved && inputPath(input.resolved.path) && /^[a-f0-9]{64}$/.test(input.resolved.sha256), 'Invalid resolved input binding');
  }
  checked(Array.isArray(plan.parts) && plan.parts.length > 0, 'Empty baseline plan');
  unique(plan.parts.map(part => part.id), 'Duplicate baseline partition');
  for (const part of plan.parts) checked(/^[a-z][a-z0-9-]*$/.test(part.id) && Array.isArray(part.files) && part.files.length > 0, 'Invalid baseline partition');
  const files = plan.parts.flatMap(part => part.files);
  unique(files, 'A complete file is assigned more than once');
  same([...files].sort(), inventory.map(row => row.file).sort(), 'Baseline plan is not an exact complete-file cover');
}
export function requireDeadline(plan: BaselinePlan) {
  checked(plan.deadline === 0 || Date.now() < plan.deadline, 'Formatting baseline deadline expired');
}
function requirePlan(root: string, scope: BaselineScope, fullInputs = false): BaselinePlan {
  const bytes = readFileSync(scope.plan);
  checked(digest(bytes) === scope.planSha256, 'Baseline plan content changed');
  const plan = JSON.parse(bytes.toString()) as BaselinePlan;
  validatePlan(plan, baselineInventory(root));
  same([plan.root, plan.commit, plan.runId, plan.attempt], [realpathSync(root), process.env.GITHUB_SHA, process.env.GITHUB_RUN_ID, process.env.GITHUB_RUN_ATTEMPT], 'Baseline plan belongs to another workspace/commit/run attempt');
  same(plan.host, hostIdentity(), 'Baseline host image/Node identity differs');
  const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  checked(plan.commit === commit, 'Baseline checkout differs from the plan commit');
  const part = plan.parts.find(row => row.id === scope.part);
  checked(part, 'Unknown baseline partition');
  same(scope.files, part.files, 'Changed partition file list');
  same(scope.seed, plan.seed, 'Changed partition seed');
  requireDeadline(plan);
  if (fullInputs) same(baselineInputs(root), plan.inputs, 'Baseline repository/dependency/browser bytes changed');
  return plan;
}
/** Wrapper flags are distinct from --oracle; config accepts only the wrapper's exact scope. */
export function readBaselineScope(root: string, args?: string[]): BaselineScope | undefined {
  if (args === undefined) {
    if (process.env.FORMATTING_BASELINE_SCOPE === undefined) return;
    const scope = JSON.parse(process.env.FORMATTING_BASELINE_SCOPE) as BaselineScope;
    requirePlan(root, scope);
    return scope;
  }
  checked(process.env.FORMATTING_BASELINE_SCOPE === undefined, 'A baseline partition cannot inherit a scope');
  const take = (flag: string) => {
    const at = args.indexOf(flag);
    if (at < 0) return undefined;
    const value = args[at + 1];
    checked(value && !value.startsWith('--'), flag + ' needs a value');
    args.splice(at, 2);
    checked(!args.some(arg => arg === flag || arg.startsWith(flag + '=')), 'Repeated baseline flag');
    return value;
  };
  const path = take('--baseline-plan'), part = take('--baseline-part');
  checked(!args.some(arg => /^--baseline-(plan|part)=/.test(arg)), 'Use separate baseline flag values');
  if (path === undefined && part === undefined) return;
  checked(path && part, 'Baseline plan and partition are required together');
  const bytes = readFileSync(resolve(path));
  const plan = JSON.parse(bytes.toString()) as BaselinePlan;
  const assigned = plan.parts?.find(row => row.id === part);
  checked(assigned, 'Unknown baseline partition');
  const scope: BaselineScope = { plan: resolve(path), planSha256: digest(bytes), part, files: assigned.files, seed: plan.seed };
  requireBaselineResources(process.env.FORMATTING_BASELINE_UNIT ?? '');
  requirePlan(root, scope, true);
  return scope;
}
export function parseCpus(effective: string) {
  return effective.split(',').flatMap(range => {
    const parts = range.split('-').map(Number);
    checked(parts.length <= 2 && parts.every(Number.isSafeInteger) && parts[0] >= 0 && (parts.length === 1 || parts[1] >= parts[0]), 'Invalid effective CPU set');
    return parts.length === 1 ? parts : Array.from({ length: parts[1] - parts[0] + 1 }, (_, index) => parts[0] + index);
  });
}
export function requireBaselineResources(unit: string) {
  checked(process.platform === 'linux' && /^formatting-baseline-[a-z0-9-]+$/.test(unit), 'Baseline partitions require their Linux cgroup supervisor');
  const entry = readFileSync('/proc/self/cgroup', 'utf8').trim().split('\n').find(line => line.startsWith('0::'));
  checked(entry, 'Baseline partitions require cgroup v2');
  const group = entry.slice(3);
  checked(group.endsWith('/' + unit + '.service') && !group.split('/').includes('..'), 'Baseline process is outside its owned cgroup');
  const effective = readFileSync('/sys/fs/cgroup' + group + '/cpuset.cpus.effective', 'utf8').trim();
  const cpus = parseCpus(effective);
  checked(cpus.length === 2, 'Baseline cgroup must have exactly two allowed CPUs');
  return { unit, group, effective, cpus, node: process.execPath };
}
/** Compare the independent raw Vitest task roster retained before fixture cleanup.
 * Counts/hashes edited together in results.json must not hide a dropped registration.
 */
export function requireRawUnits(report: any, units: any[], owners: any[]) {
  checked(units.length === report.oracleFiles.length * 2 && owners.length === units.length, 'Missing/extra application unit receipt');
  for (const [index, pass] of report.baselinePasses.entries()) for (const file of report.oracleFiles) {
    const matching = units.filter(unit => unit.file.endsWith('/' + file) && unit.pass === index + 1);
    checked(matching.length === 1, 'Duplicate/missing file-pass raw unit');
    const unit = matching[0].result;
    checked(!unit.timedOut && !unit.setupErrors?.length && !unit.unhandled?.length, 'Raw file pass failed outside the comparison');
    const tests = unit.tests;
    checked(Array.isArray(tests) && tests.length > 0, 'Missing raw task roster');
    unique(tests.map((test: any) => test.key), 'Duplicate raw task key');
    const normalize = (key: string) => key.slice(key.indexOf('/' + file + ' > ') + 1);
    for (const test of tests) checked(typeof test.key === 'string' && test.key.includes('/' + file + ' > ') && test.state === 'passed' && test.message === '', 'Raw task is skipped, failed or foreign');
    const captured = pass.capture.filter((row: any) => row.key.startsWith(file + ' > '));
    same(tests.map((test: any) => normalize(test.key)).sort(), captured.map((row: any) => row.key).sort(), 'Capture lost a raw registration');
    const rows = unit.rows.filter((entry: any) => !entry[1].background).map(([key, row]: any) => ({ ...row, key: normalize(key) }));
    same(rows, captured, 'Captured instrumentation differs from retained raw unit');
  }
}
function artifacts(out: string) {
  const topology = json(resolve(out, 'browser-topology.json'));
  const applications = json(resolve(out, 'application-topology.json'));
  const results = readFileSync(resolve(out, 'results.json'));
  const report = JSON.parse(results.toString());
  checked(topology.schema === 'blygger-formatting-browser-topology-v3' && topology.state === 'completed' && topology.exitCode === 0 && topology.failure === null && topology.report?.sha256 === digest(results), 'Wrapper did not complete with the exact report bytes');
  checked(topology.engine === 'chromium' && topology.isolation === 'process' && topology.runner?.contexts === 2 && topology.runner.execution === 'cold' && topology.runner.persistedEvidenceReuse === false && topology.runner.derivation?.sha256, 'Wrong baseline browser/runner topology');
  const root = process.cwd(), specification = json(resolve(root, 'scripts/formatting-baseline-runner-manifest.json'));
  const target = resolve(root, 'build/formatting-oracle-runner', specification.patchSha256);
  const derivation = { schema: specification.schema, source: 'pristine npm installation bound by package-lock integrity and every copied file', pin: specification.pin, integrity: specification.integrity, patchSha256: specification.patchSha256,
    installed: resolve(root, 'node_modules/@tanstack/oracles'), package: resolve(target, 'package'), before: specification.packageFiles,
    after: specification.packageFiles.map((item: any) => ({ ...item, sha256: specification.files.find((file: any) => file.path === item.path)?.afterSha256 ?? item.sha256 })) };
  same([topology.runner.path, topology.runner.derivation.path, topology.runner.derivation.sha256], [resolve(target, 'package'), resolve(target, 'derivation.json'), digest(encode(derivation))], 'Wrong derived runner identity');
  checked(applications.schema === 'blygger-formatting-application-topology-v1' && applications.invocation === topology.invocation && applications.maximumSlots === 2 && !applications.failures.length, 'Application topology failed');
  checked(Array.isArray(applications.owners), 'Missing application owners');
  const expectedOwners = report.oracleFiles.flatMap((file: string) => [1, 2].map(pass => JSON.stringify([resolve(root, file), pass]))).sort();
  for (const owner of applications.owners) {
    checked(typeof owner.file === 'string' && owner.file === resolve(owner.file) && Number.isSafeInteger(owner.pass) && [1, 2].includes(owner.pass) && Number.isSafeInteger(owner.index) && owner.index >= 0 && owner.index < applications.maximumSlots && typeof owner.lease === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(owner.lease), 'Invalid application owner identity');
    checked(typeof owner.origin === 'string' && new URL(owner.origin).origin === owner.origin && /^https?:/.test(owner.origin), 'Invalid application owner origin');
    checked(owner.setup === 'fulfilled' && owner.cleanup === 'fulfilled' && /^[a-f0-9]{64}$/.test(owner.scriptSha256), 'Application setup/cleanup incomplete');
  }
  same(applications.owners.map((owner: any) => JSON.stringify([owner.file, owner.pass])).sort(), expectedOwners, 'Duplicate/missing file-pass application owner');
  unique(applications.owners.map((owner: any) => owner.lease), 'Duplicate application lease');
  const directory = resolve(out, 'application-units');
  const expected = applications.owners.map((owner: any) => `${owner.pass}-${owner.index}-${owner.lease}.json`).sort();
  unique(expected, 'Duplicate raw file-pass receipt identity');
  same(readdirSync(directory).sort(), expected, 'Missing/extra raw file-pass result');
  const units = applications.owners.map((owner: any) => ({ file: owner.file, pass: owner.pass, result: json(join(directory, `${owner.pass}-${owner.index}-${owner.lease}.json`)) }));
  for (const unit of units) checked(unit.result.file === unit.file, 'Raw result owner differs');
  requireRawUnits(report, units, applications.owners);
  const launches = readdirSync(resolve(out, 'browser-topology-launches')).sort().map(name => json(resolve(out, 'browser-topology-launches', name)));
  checked(launches.length > 0 && launches.every(row => row.schema === topology.schema && row.invocation === topology.invocation && row.engine === 'chromium' && row.isolation === 'process' && typeof row.browserVersion === 'string' && row.browserVersion && typeof row.owner === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(row.owner)), 'Missing/foreign browser acquisition');
  unique(launches.map(row => row.owner), 'Duplicate browser owner');
  for (const launch of launches) checked(applications.owners.filter((owner: any) => launch.unit === owner.file && launch.application?.lease === owner.lease && launch.application?.context === owner.index && launch.application?.origin === owner.origin).length === 1, 'Browser acquisition does not belong to exactly one file-pass fixture');
  for (const owner of applications.owners) checked(launches.some(row => row.application?.lease === owner.lease), 'A file-pass fixture has no browser acquisition');
  readFileSync(resolve(out, 'test-output.log'));
  return { report, topology, applications, launches, resultsSha256: digest(results) };
}
export function validatePartitionArtifacts(plan: BaselinePlan, scope: BaselineScope, values: ReturnType<typeof artifacts>, options?: any) {
  requireFormattingCheckPurpose(values.report, true, scope.files, undefined, options ?? values.report.options);
  requireExecutedFormattingOracles(values.report);
  const reported = values.report.options;
  same(values.topology.runner.seedSelection, { value: plan.seed, source: 'plan' }, 'Partition topology seed differs');
  same([reported.sources, reported.seed, reported.contexts, reported.testTimeout, reported.firstLimit, reported.config, reported.pkg], [plan.sources, plan.seed, 2, 60000, 60000, 'vitest.oracle.config.ts', plan.root], 'Partition execution options differ');
  checked(reported.envPrefix === 'ORACLE' && reported.daemon === false && reported.ordinary === false && reported.only === undefined && reported.sample === undefined && reported.diffBase === undefined && reported.ownerOrder === undefined, 'Partition inherited narrowing/daemon/ordinary controls');
  checked(/^[a-f0-9]{12}$/.test(values.report.run?.id) && typeof values.report.run?.inputs === 'string', 'Missing core run identity');
  same(values.report.evidence, { reused: 0, computed: scope.files.length * 2, cut: 0, idle: 0, spin: 0, rerun: 0, unchanged: 0, budget: 0 }, 'Incomplete/reused/cut baseline execution');
  checked(!values.report.provisional && !values.report.nondeterministic.length && values.report.excluded.length === 0, 'Partial/provisional/nondeterministic baseline');
  same(values.applications.expectedFiles, scope.files.map(file => resolve(plan.root, file)).sort(), 'Wrong fixture file set');
}
export function finishBaselinePartition(scope: BaselineScope, out: string, options: unknown) {
  const plan = requirePlan(process.cwd(), scope, true);
  const resources = requireBaselineResources(process.env.FORMATTING_BASELINE_UNIT ?? '');
  const values = artifacts(out);
  validatePartitionArtifacts(plan, scope, values, options);
  writeFileSync(resolve(out, 'partition.json'), encode({ schema: 'blygger-formatting-baseline-partition-v2', purpose: 'partial-baseline-partition', scope, commit: plan.commit, runId: plan.runId, attempt: plan.attempt, inputsSha256: plan.inputsSha256, resources, resultsSha256: values.resultsSha256 }), { flag: 'wx' });
}
function outputManifest(directory: string, at = ''): Input[] {
  return readdirSync(resolve(directory, at)).sort().flatMap(name => {
    const path = at ? at + '/' + name : name, full = resolve(directory, path), stat = lstatSync(full);
    checked(!stat.isSymbolicLink(), 'Partition artifact contains a symlink');
    if (stat.isDirectory()) return outputManifest(directory, path);
    checked(stat.isFile(), 'Partition artifact is not a regular file');
    return [{ path, sha256: digest(readFileSync(full)) }];
  });
}
export function makePlan(root: string, deadline = 0): BaselinePlan {
  const inventory = baselineInventory(root), inputs = baselineInputs(root);
  const plan: BaselinePlan = { schema: 'blygger-formatting-baseline-plan-v2', commit: process.env.GITHUB_SHA ?? '', runId: process.env.GITHUB_RUN_ID ?? '', attempt: process.env.GITHUB_RUN_ATTEMPT ?? '', root: realpathSync(root), deadline,
    host: hostIdentity(), sources: [...baselineSources], receiver: 1, contexts: 2, seed: randomBytes(4).readInt32LE().toString(), seedSource: 'fresh', testTimeout: 60000, firstLimit: 60000, inventory, inputs, inputsSha256: digest(JSON.stringify(inputs)),
    parts: inventory.map(row => ({ id: row.file.replace(/^test-ui\/editor-/, '').replace(/\.oracle\.test\.ts$/, ''), files: [row.file] })) };
  validatePlan(plan, inventory);
  requireDeadline(plan);
  return plan;
}
export function aggregateBaseline(planPath: string, directory: string, output: string) {
  const planBytes = readFileSync(planPath), planSha256 = digest(planBytes);
  const plan = JSON.parse(planBytes.toString()) as BaselinePlan;
  validatePlan(plan, baselineInventory(process.cwd()));
  requireDeadline(plan);
  const firstPart = plan.parts[0];
  const firstScope: BaselineScope = { plan: resolve(planPath), planSha256, part: firstPart.id, files: firstPart.files, seed: plan.seed };
  requirePlan(process.cwd(), firstScope, true);
  const prefix = `formatting-part-${plan.commit}-${plan.runId}-${plan.attempt}-`;
  same(readdirSync(directory).sort(), plan.parts.map(part => prefix + part.id).sort(), 'Missing/extra partition artifact');
  const allKeys = [new Set<string>(), new Set<string>()];
  const versions = new Set<string>();
  const parts = plan.parts.map(part => {
    const scope: BaselineScope = { plan: resolve(planPath), planSha256, part: part.id, files: part.files, seed: plan.seed };
    const out = resolve(directory, prefix + part.id), receipt = json(resolve(out, 'partition.json')), host = json(resolve(out, 'host-completion.json'));
    same([receipt.schema, receipt.purpose, receipt.scope, receipt.commit, receipt.runId, receipt.attempt, receipt.inputsSha256], ['blygger-formatting-baseline-partition-v2', 'partial-baseline-partition', scope, plan.commit, plan.runId, plan.attempt, plan.inputsSha256], 'Stale or foreign partition receipt');
    same([host.schema, host.commit, host.runId, host.attempt, host.part, host.exitCode, host.cleanup, host.group, host.unit], ['blygger-formatting-baseline-host-v2', plan.commit, plan.runId, plan.attempt, part.id, 0, 'empty-or-removed', receipt.resources.group, receipt.resources.unit], 'Partition host failed or did not release its cgroup');
    same([host.allowedCPUs, host.primary, host.remainingPids, host.deadline, host.seed, host.planSha256], [receipt.resources.cpus, null, [], plan.deadline, plan.seed, scope.planSha256], 'Host resource/cleanup receipt differs');
    checked(Number.isFinite(host.elapsedSeconds) && host.elapsedSeconds >= 0 && Number.isSafeInteger(host.startedAtUnixMs) && Number.isSafeInteger(host.finishedAtUnixMs) && host.finishedAtUnixMs >= host.startedAtUnixMs, 'Missing host completion timing');
    checked(receipt.resources.cpus.length === 2 && new Set(receipt.resources.cpus).size === 2 && receipt.resources.cpus.every((cpu: unknown) => typeof cpu === 'number' && Number.isSafeInteger(cpu) && cpu >= 0), 'Invalid resource receipt');
    same([receipt.resources.unit, receipt.resources.group, parseCpus(receipt.resources.effective)], [`formatting-baseline-${plan.runId}-${plan.attempt}-${part.id}`, `/system.slice/formatting-baseline-${plan.runId}-${plan.attempt}-${part.id}.service`, receipt.resources.cpus], 'Foreign resource group');
    const values = artifacts(out);
    validatePartitionArtifacts(plan, scope, values);
    checked(receipt.resultsSha256 === values.resultsSha256, 'Partition result bytes changed');
    values.launches.forEach(row => versions.add(row.browserVersion));
    for (const [passIndex, pass] of values.report.baselinePasses.entries()) for (const row of pass.capture) {
      checked(!allKeys[passIndex].has(row.key), 'Duplicate global baseline registration');
      allKeys[passIndex].add(row.key);
    }
    return { id: part.id, files: part.files, resultsSha256: values.resultsSha256, registrations: values.report.baselinePasses.map((pass: any) => pass.capture.length),
      evidence: outputManifest(out) };
  });
  checked(versions.size === 1, 'Partition browser versions differ');
  same([...allKeys[0]].sort(), [...allKeys[1]].sort(), 'Complete baseline passes differ');
  requirePlan(process.cwd(), firstScope, true);
  requireDeadline(plan);
  const receipt = { schema: 'blygger-formatting-baseline-complete-v2', purpose: 'complete-partitioned-baseline', status: 'completed', mutationAudit: 'not-run', planSha256, commit: plan.commit, runId: plan.runId, attempt: plan.attempt, inputsSha256: plan.inputsSha256, seed: plan.seed, seedSource: plan.seedSource, browserVersion: [...versions][0], registrationCounts: allKeys.map(keys => keys.size), parts,
    schedule: 'Whole-file partitions, two passes inside each partition. No global all-first-before-repeat barrier. Raw partition artifacts remain required.' };
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, encode(receipt), { flag: 'wx' });
  return receipt;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [mode, ...args] = process.argv.slice(2);
  if (mode === 'plan' && args.length === 2) {
    const deadline = Number(args[1]);
    const plan = makePlan(process.cwd(), deadline);
    mkdirSync(dirname(resolve(args[0])), { recursive: true });
    writeFileSync(args[0], encode(plan), { flag: 'wx' });
    checked(process.env.GITHUB_OUTPUT, 'Plan command requires GitHub output ownership');
    writeFileSync(process.env.GITHUB_OUTPUT, 'matrix=' + JSON.stringify({ include: plan.parts.map(part => ({ id: part.id })) }) + '\n', { flag: 'a' });
  } else if (mode === 'aggregate' && args.length === 3) aggregateBaseline(resolve(args[0]), resolve(args[1]), resolve(args[2]));
  else throw new Error('Use formatting-baseline-plan.ts plan <out> <deadline-ms-or-0>, or aggregate <plan> <artifact-directory> <out>');
}
