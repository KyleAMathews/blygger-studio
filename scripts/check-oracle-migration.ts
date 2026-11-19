/** Account for the original oracle inventory without Git history in CI.
 * The preservation artifact contains normalized original expressions from the
 * recorded base and reviewed destinations in the semantic models/checks. Their
 * hashes still match the original manifest; current expressions may differ.
 * This checks inventory completeness and live references, not semantic
 * equivalence, runtime execution, or the truth of a model's promised law.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
export function fingerprint(source: string) {
  const file = ts.createSourceFile('oracle.ts', source, ts.ScriptTarget.Latest, true);
  const comparisons: string[] = [], cases: string[] = [];
  const print = ts.createPrinter({ removeComments: true });
  const canonical = (node: ts.Node) => {
    const result = ts.transform(node, [context => {
      const visit: ts.Visitor = child => {
        if (ts.isCallExpression(child) && ts.isIdentifier(child.expression) && ['expect', 'relation'].includes(child.expression.text)) return context.factory.updateCallExpression(child, context.factory.createIdentifier('comparison'), child.typeArguments, child.arguments.slice(0, 1).map(argument => ts.visitNode(argument, visit) as ts.Expression));
        if (ts.isIdentifier(child) && ['expect', 'relation'].includes(child.text)) return context.factory.createIdentifier('comparison');
        return ts.visitEachChild(child, visit, context);
      };
      return node => ts.visitNode(node, visit) as ts.Node;
    }]);
    try { return print.printNode(ts.EmitHint.Unspecified, result.transformed[0], file); }
    finally { result.dispose(); }
  };
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      let subject: ts.Expression = node.expression.expression;
      while (ts.isPropertyAccessExpression(subject)) subject = subject.expression;
      if (ts.isCallExpression(subject) && ts.isIdentifier(subject.expression) && ['expect', 'relation'].includes(subject.expression.text)) comparisons.push(canonical(node));
    }
    if (ts.isCallExpression(node)) {
      const target = node.expression;
      const direct = ts.isIdentifier(target) && ['it', 'test', 'witness'].includes(target.text);
      const table = ts.isCallExpression(target) && ts.isPropertyAccessExpression(target.expression) && target.expression.name.text === 'each' && ts.isIdentifier(target.expression.expression) && ['it', 'test', 'witness'].includes(target.expression.expression.text);
      if ((direct || table) && node.arguments[0]) cases.push(canonical(node.arguments[0]));
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  const digest = (values: string[]) => createHash('sha256').update(JSON.stringify([...values].sort())).digest('hex');
  return { comparisons: comparisons.length, cases: cases.length, comparisonHash: digest(comparisons), caseHash: digest(cases) };
}

interface Fingerprint { comparisons: number; cases: number; comparisonHash: string; caseHash: string }
interface Destination {
  id: string; kind: 'oracle' | 'harness'; files?: string[]; properties: string[];
  predicate: string; checkpointHints: string[]; hintScope?: string;
}
interface Row { id: string; destination: string }
interface OriginalItem extends Row {
  canonical: string;
  table?: { expression: string; rows: Row[]; rowCount: number; rowHash: string; unresolved?: string };
  loops?: { rows: Row[]; rowCount: number; rowHash: string }[];
}
interface PreservationSuite {
  file: string; implementation: string; sourceSha256: string; originalFingerprint?: Fingerprint;
  implementationFiles: string[]; comparisons: OriginalItem[]; cases: OriginalItem[];
  supplemental?: OriginalItem[]; destinations: Destination[];
  checkpoints: { id: string; file: string; value: string }[];
}
interface ManifestSuite { file: string; implementation: string; properties: string[]; baselineFingerprint?: Fingerprint }
const digest = (values: string[]) => createHash('sha256').update(JSON.stringify([...values].sort())).digest('hex');
const trees = new Map<string, ts.SourceFile>();
function tree(file: string): ts.SourceFile {
  assert.ok(existsSync(file), 'Missing current implementation: ' + file);
  let source = trees.get(file);
  if (!source) { source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true); trees.set(file, source); }
  return source;
}
function unwrap(node: ts.Expression): ts.Expression {
  while (ts.isAsExpression(node) || ts.isParenthesizedExpression(node) || ts.isTypeAssertionExpression(node) || ts.isSatisfiesExpression(node)) node = node.expression;
  return node;
}
function field(options: ts.ObjectLiteralExpression, name: string): ts.Expression {
  const property = options.properties.find(value => ts.isPropertyAssignment(value) && value.name.getText() === name);
  assert.ok(property && ts.isPropertyAssignment(property), 'Missing explicit property: ' + name);
  return property.initializer;
}
function literalIds(expression: ts.Expression): string[] {
  const node = unwrap(expression);
  if (ts.isStringLiteralLike(node)) return [node.text];
  if (ts.isArrayLiteralExpression(node)) return node.elements.flatMap(value => literalIds(value));
  // Browser profiles are one finite for-of declaration, rather than two copies
  // of the same driver. Expand only literal loop domains, never execute a test.
  if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
    return literalIds(node.left).flatMap(left => literalIds(node.right).map(right => left + right));
  }
  if (ts.isIdentifier(node)) {
    for (let parent: ts.Node | undefined = node.parent; parent; parent = parent.parent) {
      if (ts.isForOfStatement(parent) && ts.isVariableDeclarationList(parent.initializer) && parent.initializer.declarations.some(value => ts.isIdentifier(value.name) && value.name.text === node.text)) return literalIds(parent.expression);
    }
  }
  throw new Error('Property IDs and registry domains must be statically enumerable: ' + node.getText());
}
function registrations(file: string): string[] {
  const ids: string[] = [];
  function visit(node: ts.Node) {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      assert.ok(!/enumerated-oracle|browserRelation/.test(node.moduleSpecifier.text), 'Stale assertion-wrapper import: ' + file);
      if (node.importClause?.namedBindings && ts.isNamedImports(node.importClause.namedBindings)) {
        assert.ok(!node.importClause.namedBindings.elements.some(value => ['enumeratedWitnesses', 'relationCheckpoint', 'browserRelation'].includes((value.propertyName ?? value.name).text)), 'Stale assertion-wrapper import: ' + file);
      }
    }
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'oracleProperty') {
      const options = unwrap(node.arguments[0]);
      assert.ok(ts.isObjectLiteralExpression(options), 'Property options must be explicit: ' + file);
      assert.ok(options.properties.some(value => 'name' in value && value.name?.getText() === 'check'), 'Missing explicit check: ' + file);
      ids.push(...literalIds(field(options, 'id')));
    }
    ts.forEachChild(node, visit);
  }
  visit(tree(file));
  assert.equal(new Set(ids).size, ids.length, 'Duplicate property ID in ' + file);
  return ids.sort();
}
function oracleFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? oracleFiles(join(directory, entry.name)) : entry.name.endsWith('.oracle.test.ts') ? [join(directory, entry.name)] : []);
}
function registry(name: string): string[] {
  const file = tree('test/oracle-property-registry.ts');
  for (const statement of file.statements) if (ts.isVariableStatement(statement)) {
    for (const declaration of statement.declarationList.declarations) if (ts.isIdentifier(declaration.name) && declaration.name.text === name && declaration.initializer) return literalIds(declaration.initializer).sort();
  }
  throw new Error('Missing runtime registry: ' + name);
}
export function audit(): void {
  const manifest = JSON.parse(readFileSync('docs/oracle-migration.json', 'utf8')) as { baseCommit: string; suites: ManifestSuite[] };
  const preservation = JSON.parse(readFileSync('docs/oracle-preservation.json', 'utf8')) as { version: number; baseCommit: string; limits: string; suites: PreservationSuite[]; additionalSuites: PreservationSuite[] };
  assert.equal(preservation.version, 1);
  assert.equal(preservation.baseCommit, manifest.baseCommit);
  assert.ok(preservation.limits.includes('not a semantic equivalence proof'));
  assert.equal(manifest.suites.length, 38, 'Keep all 38 original product suites');
  assert.equal(new Set(manifest.suites.map(suite => suite.file)).size, 38);
  const actual = new Map<string, string[]>();
  for (const directory of ['test', 'test-ui', 'test-browser', 'test-oracles'].filter(existsSync)) for (const file of oracleFiles(directory)) {
    const ids = registrations(file); assert.ok(ids.length, 'Oracle file registers no property: ' + file); actual.set(file, ids);
  }
  for (const suite of manifest.suites) {
    const ids = actual.get(suite.implementation);
    assert.ok(ids, 'Original suite has no current oracle implementation: ' + suite.file);
    assert.deepEqual([...suite.properties].sort(), ids, 'Stale manifest properties: ' + suite.file);
  }
  for (const [directory, name] of [['test/', 'workerOracleProperties'], ['test-ui/', 'studioOracleProperties']] as const) {
    const ids = [...actual].filter(([file]) => file.startsWith(directory) || (directory === 'test-ui/' && file.startsWith('test-oracles/'))).flatMap(([, values]) => values).sort();
    assert.equal(new Set(ids).size, ids.length, 'Duplicate runtime property ID: ' + name);
    assert.deepEqual(registry(name), ids, 'Runtime registry differs from actual property registrations: ' + name);
  }
  for (const [file, ids] of actual) if (file.startsWith('test-browser/')) {
    let configured: string[] | undefined;
    function visit(node: ts.Node) {
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'configureOracles') {
        const options = unwrap(node.arguments[0]); assert.ok(ts.isObjectLiteralExpression(options));
        configured = literalIds(field(options, 'registry')).sort();
      }
      ts.forEachChild(node, visit);
    }
    visit(tree(file)); assert.deepEqual(configured, ids, 'Browser registry differs from actual registrations: ' + file);
  }
  const fixed = manifest.suites.filter(suite => suite.baselineFingerprint);
  assert.equal(fixed.length, 29);
  assert.deepEqual(preservation.suites.map(suite => suite.file).sort(), fixed.map(suite => suite.file).sort());
  let comparisons = 0, cases = 0, tableRows = 0, harness = 0;
  for (const suite of [...preservation.suites, ...preservation.additionalSuites]) {
    const expected = fixed.find(original => original.file === suite.file)?.baselineFingerprint;
    if (expected) assert.deepEqual(suite.originalFingerprint, expected, 'Original fingerprint changed: ' + suite.file);
    const computed = { comparisons: suite.comparisons.length, cases: suite.cases.length, comparisonHash: digest(suite.comparisons.map(item => item.canonical)), caseHash: digest(suite.cases.map(item => item.canonical)) };
    assert.deepEqual(computed, suite.originalFingerprint, 'Stored original inventory differs from its base fingerprint: ' + suite.file);
    assert.match(suite.sourceSha256, /^[a-f0-9]{64}$/);
    const destinations = new Map(suite.destinations.map(target => [target.id, target]));
    assert.equal(destinations.size, suite.destinations.length, 'Duplicate destination ID: ' + suite.file);
    const checkpoints = new Map(suite.checkpoints.map(checkpoint => [checkpoint.id, checkpoint]));
    assert.equal(checkpoints.size, suite.checkpoints.length);
    for (const file of suite.implementationFiles) tree(file);
    for (const checkpoint of suite.checkpoints) {
      let found = false;
      function visit(node: ts.Node) { if (ts.isStringLiteralLike(node) && node.text === checkpoint.value) found = true; ts.forEachChild(node, visit); }
      visit(tree(checkpoint.file)); assert.ok(found, 'Stale checkpoint hint: ' + checkpoint.file + ' — ' + checkpoint.value);
    }
    for (const target of destinations.values()) {
      assert.ok(target.predicate.trim(), 'Missing receiving predicate: ' + suite.file + '/' + target.id);
      for (const file of target.files ?? suite.implementationFiles) tree(file);
      if (target.kind === 'oracle') {
        assert.ok(target.properties.length, 'No registered destination property: ' + target.id);
        const ids = (target.files ?? [suite.implementation]).flatMap(file => actual.get(file) ?? []);
        for (const id of target.properties) assert.ok(ids.includes(id), 'Missing destination property: ' + suite.file + '/' + id);
      } else { assert.equal(target.kind, 'harness'); assert.ok(target.files?.every(file => file.endsWith('.test.ts') && !file.endsWith('.oracle.test.ts'))); }
      assert.ok(target.checkpointHints.length, 'No live checkpoint/model hint: ' + suite.file + '/' + target.id);
      for (const id of target.checkpointHints) assert.ok(checkpoints.has(id), 'Missing checkpoint reference: ' + id);
    }
    const seen = new Set<string>();
    function item(value: Row, prefix: string): void {
      const key = prefix + '/' + value.id; assert.ok(!seen.has(key), 'Duplicate original item: ' + key); seen.add(key);
      assert.ok(destinations.has(value.destination), 'Unmapped original item: ' + suite.file + '/' + key);
    }
    for (const [index, comparison] of suite.comparisons.entries()) {
      assert.equal(comparison.id, 'comparison-' + (index + 1)); item(comparison, 'comparisons');
      if (destinations.get(comparison.destination)?.kind === 'harness' && expected) harness++;
    }
    for (const [index, originalCase] of suite.cases.entries()) {
      assert.equal(originalCase.id, 'case-' + (index + 1)); item(originalCase, 'cases');
      if (originalCase.table) {
        assert.ok(!originalCase.table.unresolved, 'Unresolved original table: ' + originalCase.id);
        assert.ok(originalCase.table.rows.length, 'Empty original table inventory: ' + originalCase.id);
        assert.equal(originalCase.table.rows.length, originalCase.table.rowCount, 'Original table row removed: ' + originalCase.id);
        assert.equal(digest(originalCase.table.rows.map(row => JSON.stringify(row))), originalCase.table.rowHash, 'Original table row changed: ' + originalCase.id);
        for (const row of originalCase.table.rows) { item(row, originalCase.id + '/table'); if (expected) tableRows++; }
      }
      for (const [loopIndex, loop] of (originalCase.loops ?? []).entries()) {
        assert.equal(loop.rows.length, loop.rowCount, 'Original loop row removed: ' + originalCase.id);
        assert.equal(digest(loop.rows.map(row => JSON.stringify(row))), loop.rowHash, 'Original loop row changed: ' + originalCase.id);
        for (const row of loop.rows) item(row, originalCase.id + '/loop-' + loopIndex);
      }
    }
    for (const supplemental of suite.supplemental ?? []) item(supplemental, 'supplemental');
    if (expected) { comparisons += suite.comparisons.length; cases += suite.cases.length; }
  }
  assert.equal(comparisons, 890); assert.equal(harness, 2); assert.equal(cases, 193);
  assert.equal(preservation.additionalSuites.length, 1);
  assert.equal(preservation.additionalSuites[0].file, 'test/polling-cache.oracle.test.ts');
  assert.equal(preservation.additionalSuites[0].comparisons.length, 123);
  console.log(`Accounted for ${comparisons} original comparisons (${comparisons - harness} product, ${harness} harness), ${cases} case declarations and ${tableRows} table rows across 29 fixed suites; 123 additional feed comparisons. All 38 suite implementations and current runtime registries exist. Mapping is not a semantic equivalence proof.`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) audit();
