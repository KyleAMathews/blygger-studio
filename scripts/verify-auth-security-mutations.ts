/**
 * A green oracle is useful only if it rejects a plausible broken control.
 * The laws and sources are beside each receiving oracle; controls here remove one
 * production defense at a time without changing the expected result.
 * Model: each isolated baseline passes, then its mutant reaches the named semantic
 * assertion. Nonzero exit alone is insufficient: setup errors and timeouts fail
 * this verifier. The controls cover claims, at-rest secrets, logs, limiter
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
  { name: 'admission MCP discovery bypasses envelope budget', changes: [{ file: 'src/mcp.ts', from: "if (!await admit(env.DB, 'mcp-request', securityLimit(env.MCP_REQUEST_LIMIT, 300), 60))", to: 'if (false)' }], kind: 'worker', test: 'test/work-admission-security.oracle.test.ts', pattern: 'MCP discovery', checkpoint: 'MCP control work requires admission too' },
  { name: 'admission counter ignores its ceiling', changes: [{ file: 'src/security-budgets.ts', from: 'WHERE security_budgets.window <> excluded.window OR security_budgets.used < ? RETURNING used', to: 'WHERE ? > 0 RETURNING used' }], kind: 'worker', test: 'test/work-admission-security.oracle.test.ts', pattern: 'atomic admission', checkpoint: 'concurrent writes share one atomic budget' },
  { name: 'admission AI bypasses daily calls', changes: [{ file: 'src/ai/provider.ts', from: "if (!await admit(env.DB, 'ai-daily', securityLimit(env.AI_DAILY_CALL_LIMIT, 20), 86400))", to: 'if (false)' }], kind: 'worker', test: 'test/work-admission-security.oracle.test.ts', pattern: 'daily AI budget counts', checkpoint: 'promise resolved' },
  { name: 'admission anonymous storage ignores cap', changes: [{ file: 'src/security-budgets.ts', from: '(SELECT COUNT(*) FROM security_registrations WHERE expires > ?) < ? RETURNING id', to: '(SELECT COUNT(*) FROM security_registrations WHERE expires > ?) >= 0 AND ? > 0 RETURNING id' }], kind: 'worker', test: 'test/work-admission-security.oracle.test.ts', pattern: 'bounds anonymous registration storage', checkpoint: 'registration cannot exceed the stored-client cap' },
  { name: 'admission REST body ignores operator cap', changes: [{ file: 'src/owner-api.ts', from: 'securityLimit(c.env.API_BODY_LIMIT, 8 * 1024 * 1024)', to: '64 * 1024 * 1024' }], kind: 'worker', test: 'test/request-body-security.oracle.test.ts', pattern: 'REST refuses', checkpoint: 'byte admission must precede write work' },
  { name: 'admission outbound private destinations accepted', changes: [{ file: 'src/outbound-policy.ts', from: 'if (allowPrivate) return;', to: 'if (true) return;' }], kind: 'worker', test: 'test/outbound-destination-security.oracle.test.ts', pattern: 'restricted destination', checkpoint: 'promise resolved' },

  { name: 'stale native cookies authorize after password reset', changes: [{ file: 'src/oauth-routes.ts', from: "const headers = new Headers(c.req.raw.headers); headers.delete('cookie');", to: 'const headers = new Headers(c.req.raw.headers);' }], kind: 'worker', test: 'test/owner-reset.oracle.test.ts', pattern: 'stale native browser cookies', checkpoint: 'stale browser sessions cannot silently authorize after reset' },
  { name: 'remembered consent survives grant revoke', changes: [{ file: 'src/oauth.ts', from: 'DELETE FROM oauthConsent WHERE userId=? AND clientId IN', to: 'DELETE FROM oauthConsent WHERE 0 AND userId=? AND clientId IN' }], kind: 'worker', test: 'test/oauth-grant-list.oracle.test.ts', pattern: 'new owner consent', checkpoint: 'revocation cannot be bypassed by silent reauthorization' },
  { name: 'unclassified writes fall back to read', changes: [{ file: 'src/owner-api.ts', from: "if (!operation && !['GET', 'HEAD'].includes(c.req.method))", to: 'if (false)' }], kind: 'worker', test: 'test/review-auth-regressions.test.ts', pattern: 'undeclared write', checkpoint: 'unclassified writes must fail closed' },
  { name: 'draft operations accept read scope', changes: [{ file: 'src/permissions.ts', from: "if (draft.has(operation)) return ['owner:draft'];", to: "if (draft.has(operation)) return ['owner:read'];" }], kind: 'worker', test: 'test/rest-permissions.oracle.test.ts', pattern: 'every REST operation', checkpoint: 'createItem:' },
  { name: 'media publication commit guard removed', changes: [{ file: 'src/model.ts', from: 'WHERE ? = 0 OR ? IS NULL OR EXISTS', to: 'WHERE ? >= 0 OR ? IS NULL OR EXISTS' }], kind: 'worker', test: 'test/review-auth-regressions.test.ts', pattern: 'publication races', checkpoint: 'publication racing upload must deny draft-only attachment' },
  { name: 'MCP media publication gate removed', changes: [{ file: 'src/model.ts', from: 'WHERE ? = 0 OR ? IS NULL OR EXISTS', to: 'WHERE ? >= 0 OR ? IS NULL OR EXISTS' }], kind: 'worker', test: 'test/mcp-media.oracle.test.ts', pattern: 'published attachments', checkpoint: 'MCP drafting cannot publish an attachment' },

  { name: 'subject guard removed', changes: [{ file: 'src/oauth.ts', from: "validated.sub !== 'owner' || ", to: '' }], kind: 'worker', test: 'test/auth-security.oracle.test.ts', pattern: 'invalid subject claims', checkpoint: 'invalid claim must deny protected reads' },
  { name: 'raw credential storage', changes: [{ file: 'src/oauth.ts', from: "const oauth: OAuthOptions<string[]> = {", to: "const oauth: OAuthOptions<string[]> = { storeTokens: { hash: token => token }," }], kind: 'worker', test: 'test/auth-security.oracle.test.ts', pattern: 'does not store recoverable', checkpoint: 'stored auth rows must not contain these plaintext credentials' },
  { name: 'dependency error logged in full', changes: [{ file: 'src/oauth-routes.ts', from: "console.error('OAuth request failed', requestError(error, c));", to: "console.error('OAuth request failed', String(error));" }], kind: 'worker', test: 'test/auth-security.oracle.test.ts', pattern: 'does not leak sentinel', checkpoint: 'dependency logging must not leak credentials' },
  { name: 'unencrypted private signing key', changes: [{ file: 'src/oauth.ts', from: "jwt({ jwks: { keyPairConfig:", to: "jwt({ jwks: { disablePrivateKeyEncryption: true, keyPairConfig:" }], kind: 'worker', test: 'test/auth-security.oracle.test.ts', pattern: 'does not store recoverable', checkpoint: 'private signing key must be encrypted' },
  { name: 'introspection owner revocation omitted', changes: [{ file: 'src/oauth-routes.ts', from: 'if (value.active) {', to: 'if (false) {' }], kind: 'worker', test: 'test/auth-security.oracle.test.ts', pattern: 'reports a revoked grant inactive', checkpoint: '"active": false' },
  { name: 'spoofable limiter identity', changes: [{ file: 'src/oauth.ts', from: "ipAddressHeaders: ['cf-connecting-ip']", to: "ipAddressHeaders: ['x-forwarded-for']" }], kind: 'worker', test: 'test/auth-deployment.oracle.test.ts', pattern: 'shares an atomic registration budget', checkpoint: 'AssertionError' },
  { name: 'frame blocking removed', changes: [{ file: 'src/spa.ts', from: "c.header('Content-Security-Policy', \"frame-ancestors 'none'\");", to: '' }, { file: 'src/spa.ts', from: "c.header('X-Frame-Options', 'DENY');", to: '' }, { file: 'src/oauth-routes.ts', from: "'Content-Security-Policy': \"frame-ancestors 'none'\", 'X-Frame-Options': 'DENY', ", to: '' }], kind: 'browser', test: 'e2e/client-access.spec.ts', pattern: 'hostile ancestor', checkpoint: 'Expected value: "net::ERR_BLOCKED_BY_RESPONSE"' },
  { name: 'cross-isolate family tombstone omitted', changes: [{ file: 'src/oauth-routes.ts', from: "if (seen && seen.client === clientId", to: "if (false && seen.client === clientId" }], kind: 'race', test: 'scripts/verify-auth-security-race.ts', pattern: '', checkpoint: 'Cross-isolate replay must revoke the existing signed access token' },
  { name: 'root and contract errors logged in full', changes: [{ file: 'src/index.ts', from: "console.error('Worker request failed', requestError(_error, c));", to: 'console.error(_error);' }, { file: 'src/contract/app.ts', from: "console.error('API request failed', requestError(error, c));", to: 'console.error(error);' }], kind: 'worker', test: 'test/auth-security.oracle.test.ts', pattern: 'does not leak sentinel', checkpoint: 'dependency logging must not leak credentials' },
  { name: 'native raw fallback logging restored', changes: [{ file: 'src/oauth.ts', from: 'onAPIError: { throw: true }', to: 'onAPIError: { throw: false }' }], kind: 'worker', test: 'test/auth-security.oracle.test.ts', pattern: 'does not leak sentinel', checkpoint: 'dependency logging must not leak credentials' },
  { name: 'cleartext transport guard removed', changes: [{ file: 'src/index.ts', from: "if (url.protocol !== 'https:' && !loopback)", to: 'if (false)' }], kind: 'worker', test: 'test/auth-security.oracle.test.ts', pattern: 'cleartext auth transport', checkpoint: 'cleartext protected transport must fail closed' },
  { name: 'uploaded media sandbox removed', changes: [{ file: 'src/index.ts', from: '"Content-Security-Policy": "sandbox; script-src \'none\'",', to: '' }], kind: 'browser', test: 'e2e/client-access.spec.ts', pattern: 'SVG uploads', checkpoint: 'data-script-ran="yes"' },
  { name: 'Basic replay client classification omitted', changes: [{ file: 'src/oauth-routes.ts', from: 'if (basic) {', to: 'if (false) {' }], kind: 'worker', test: 'test/auth-security.oracle.test.ts', pattern: 'authenticated Basic refresh replay', checkpoint: 'authenticated Basic replay revokes the compromised JWT grant' },
];
// Browser controls share Playwright's server port; worker/race controls can run
// while a separate browser verification owns it. The default still runs all controls.
const selector = process.argv[2];
const selected = selector === '--existing-worker' ? controls.filter(control => control.kind !== 'browser' && !control.name.startsWith('admission ')) : selector === '--browser' ? controls.filter(control => control.kind === 'browser') : selector === '--exclude-browser' ? controls.filter(control => control.kind !== 'browser') : selector ? controls.filter(control => control.name.includes(selector)) : controls;
assert.ok(selected.length, 'No mutation matches the requested name');
try {
  const tracked = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
  const source = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z', '--', 'src', 'test', 'e2e', 'scripts', 'migrations', 'docs'], { encoding: 'utf8' }).split('\0').filter(Boolean);
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
