/**
 * A green oracle is useful only if it rejects a plausible broken control.
 * The laws and sources are beside each receiving oracle; controls here remove one
 * production defense at a time without changing the expected result.
 * Model: each isolated baseline passes, then its mutant reaches the named semantic
 * assertion. Nonzero exit alone is insufficient: setup errors and timeouts fail
 * this verifier. The eleven controls cover claims, at-rest secrets, logs, limiter
 * identity, browser framing, cross-isolate revocation and protected transport.
 * Driver: a disposable source copy runs the same Worker, browser or race test.
 * Refinement: exact mutation anchor, baseline exit, failure checkpoint and no runner
 * error. Restore each source file before the next control.
 * Limits: mutation detection is sensitivity evidence, not absence of all defects.
 * No control changes the working checkout or audits deployed services.
 */
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const root = resolve('.'), temporary = mkdtempSync(join(tmpdir(), 'blygger-security-controls-'));
const controls = [
  { name: 'subject guard removed', changes: [{ file: 'src/oauth.ts', from: "validated.sub !== 'owner' || ", to: '' }], kind: 'worker', test: 'test/auth-security.oracle.test.ts', pattern: 'invalid subject claims', checkpoint: 'invalid claim must deny protected reads' },
  { name: 'raw credential storage', changes: [{ file: 'src/oauth.ts', from: "const oauth: OAuthOptions<string[]> = {", to: "const oauth: OAuthOptions<string[]> = { storeTokens: { hash: token => token }," }], kind: 'worker', test: 'test/auth-security.oracle.test.ts', pattern: 'does not store recoverable', checkpoint: 'stored auth rows must not contain these plaintext credentials' },
  { name: 'dependency error logged in full', changes: [{ file: 'src/oauth-routes.ts', from: "error instanceof Error ? error.name : 'unknown'", to: 'String(error)' }], kind: 'worker', test: 'test/auth-security.oracle.test.ts', pattern: 'does not leak sentinel', checkpoint: 'dependency logging must not leak credentials' },
  { name: 'unencrypted private signing key', changes: [{ file: 'src/oauth.ts', from: "jwt({ jwks: { keyPairConfig:", to: "jwt({ jwks: { disablePrivateKeyEncryption: true, keyPairConfig:" }], kind: 'worker', test: 'test/auth-security.oracle.test.ts', pattern: 'does not store recoverable', checkpoint: 'private signing key must be encrypted' },
  { name: 'introspection owner revocation omitted', changes: [{ file: 'src/oauth-routes.ts', from: 'if (value.active) {', to: 'if (false) {' }], kind: 'worker', test: 'test/auth-security.oracle.test.ts', pattern: 'reports a revoked grant inactive', checkpoint: '"active": false' },
  { name: 'spoofable limiter identity', changes: [{ file: 'src/oauth.ts', from: "ipAddressHeaders: ['cf-connecting-ip']", to: "ipAddressHeaders: ['x-forwarded-for']" }], kind: 'worker', test: 'test/auth-deployment.oracle.test.ts', pattern: 'shares an atomic registration budget', checkpoint: 'AssertionError' },
  { name: 'frame blocking removed', changes: [{ file: 'src/spa.ts', from: "c.header('Content-Security-Policy', \"frame-ancestors 'none'\");", to: '' }, { file: 'src/spa.ts', from: "c.header('X-Frame-Options', 'DENY');", to: '' }, { file: 'src/oauth-routes.ts', from: "'Content-Security-Policy': \"frame-ancestors 'none'\", 'X-Frame-Options': 'DENY', ", to: '' }], kind: 'browser', test: 'e2e/client-access.spec.ts', pattern: 'hostile ancestor', checkpoint: 'Expected value: "net::ERR_BLOCKED_BY_RESPONSE"' },
  { name: 'cross-isolate family tombstone omitted', changes: [{ file: 'src/oauth-routes.ts', from: "if (seen && seen.client === form.get('client_id')", to: "if (false && seen.client === form.get('client_id')" }], kind: 'race', test: 'scripts/verify-auth-security-race.ts', pattern: '', checkpoint: 'Cross-isolate replay must revoke the existing signed access token' },
  { name: 'root and contract errors logged in full', changes: [{ file: 'src/index.ts', from: "console.error('Worker request failed');", to: 'console.error(_error);' }, { file: 'src/contract/app.ts', from: "console.error('API request failed');", to: 'console.error(error);' }], kind: 'worker', test: 'test/auth-security.oracle.test.ts', pattern: 'does not leak sentinel', checkpoint: 'dependency logging must not leak credentials' },
  { name: 'native raw fallback logging restored', changes: [{ file: 'src/oauth.ts', from: 'onAPIError: { throw: true }', to: 'onAPIError: { throw: false }' }], kind: 'worker', test: 'test/auth-security.oracle.test.ts', pattern: 'does not leak sentinel', checkpoint: 'dependency logging must not leak credentials' },
  { name: 'cleartext transport guard removed', changes: [{ file: 'src/index.ts', from: "if (url.protocol !== 'https:' && !loopback)", to: 'if (false)' }], kind: 'worker', test: 'test/auth-security.oracle.test.ts', pattern: 'cleartext auth transport', checkpoint: 'cleartext protected transport must fail closed' },
];
const selected = process.argv[2] ? controls.filter(control => control.name.includes(process.argv[2])) : controls;
assert.ok(selected.length, 'No mutation matches the requested name');
try {
  const tracked = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
  const source = execFileSync('rg', ['--files', 'src', 'test', 'e2e', 'scripts', 'migrations', 'docs'], { encoding: 'utf8' }).trim().split('\n');
  for (const file of new Set([...tracked, ...source])) { const destination = join(temporary, file); mkdirSync(dirname(destination), { recursive: true }); cpSync(join(root, file), destination); }
  cpSync(join(root, 'sdk/dist'), join(temporary, 'sdk/dist'), { recursive: true });
  cpSync(join(root, 'build'), join(temporary, 'build'), { recursive: true });
  symlinkSync(join(root, 'node_modules'), join(temporary, 'node_modules'), 'dir');
  const execute = (control: typeof controls[number]) => spawnSync(process.execPath, control.kind === 'race' ? ['--import', 'tsx', control.test] : control.kind === 'browser' ? [join(root, 'node_modules/@playwright/test/cli.js'), 'test', control.test, '--project=desktop', '-g', control.pattern] : [join(root, 'node_modules/vitest/vitest.mjs'), 'run', '--maxWorkers=1', control.test, '-t', control.pattern], { cwd: temporary, encoding: 'utf8', timeout: 90000, env: { ...process.env, WRANGLER_LOG_PATH: join(temporary, 'wrangler.log'), NO_COLOR: '1' } });
  for (const control of selected) {
    const baseline = execute(control);
    assert.equal(baseline.error, undefined); assert.equal(baseline.signal, null); assert.equal(baseline.status, 0, 'Baseline failed: ' + control.name + '\n' + baseline.stdout + baseline.stderr);
    const originals = new Map<string, string>();
    try {
      for (const change of control.changes) {
        const file = join(temporary, change.file), original = readFileSync(file, 'utf8');
        if (!originals.has(file)) originals.set(file, original);
        assert.ok(original.includes(change.from), 'Missing exact mutation anchor: ' + control.name);
        writeFileSync(file, original.replaceAll(change.from, change.to));
      }
      const result = execute(control), output = result.stdout + '\n' + result.stderr;
      writeFileSync(join(root, 'build', 'security-mutant-' + controls.indexOf(control) + '.log'), output);
      assert.equal(result.error, undefined, 'Runner error: ' + control.name);
      assert.equal(result.signal, null, 'Timeout: ' + control.name);
      assert.notEqual(result.status, 0, 'Survived: ' + control.name);
      assert.ok(!/Test timeout|Failed to load|Cannot find module|webServer was not able/.test(output), 'Setup or timeout is not security RED: ' + control.name);
      assert.ok(output.includes(control.checkpoint), 'Missing semantic checkpoint: ' + control.name);
      console.log('Caught: ' + control.name);
    } finally { for (const [file, original] of originals) writeFileSync(file, original); }
  }
} finally { rmSync(temporary, { recursive: true, force: true }); }
