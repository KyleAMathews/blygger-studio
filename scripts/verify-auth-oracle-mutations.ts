/**
 * Mutation and replay must preserve the same violated authorization/storage law.
 * Contract: docs/oracle-tests.md ORC-006/007/010 and docs/auth-oracles.md.
 * Model: a baseline passes; a selected broken defense fails at the named checkpoint.
 * For captured generated failures, direct seed/path replay must retain that
 * checkpoint and the same reduced counterexample, without normal campaigns first.
 * Driver: registered oracle-gaps controls in disposable copies with scope enforcement, password-session/token separation
 * or exclusive expiry changed. Repository source paths include untracked candidate
 * files; ignored credentials are not copied by that path inventory.
 * Refinement: distinguish setup/timeout failures from semantic RED, then retain
 * captured and replayed native receipts. Source mutations never change this checkout.
 * Limits: these three controls do not certify every security law or replay every
 * possible campaign; verify-auth-security-mutations.ts owns additional controls.
 */
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, rmSync, symlinkSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { verifyOracleMutation } from './oracle-mutation-control.ts';

// The candidate's new oracle/source files may still be untracked. Copy only
// repository source/test paths plus tracked files, never ignored credentials.
const root = resolve('.'), temporary = mkdtempSync(join(tmpdir(), 'blygger-auth-mutations-'));
const controls = [
  { name: 'delegated scope enforcement omitted', file: 'src/operation-runner.ts', from: "if (context.access !== null && required.some(scope => !context.access!.scope.includes(scope)))", to: 'if (false)', test: 'test/authorization.oracle.test.ts', pattern: 'distinguishes root invalidation', target: 'authorization', captureSeed: 20261016, checkpoint: "authorization API decision", law: "delegated authority" },
  { name: 'password reset revokes delegated grants', file: 'src/oauth.ts', from: "return hashCredential(JSON.stringify([env.COOKIE_SECRET, epoch]));", to: "return hashCredential(JSON.stringify([env.COOKIE_SECRET, env.OWNER_PASSWORD, epoch]));", test: 'test/owner-reset.oracle.test.ts', pattern: 'preserves API and MCP grants', checkpoint: "delegated access after password reset", law: "password sessions and delegated authority" },
  { name: 'expiry boundary remains readable', file: 'src/oauth-storage.ts', from: 'expires > ?', to: 'expires >= ?', test: 'test/oauth-storage.oracle.test.ts', pattern: 'overwrite delete exact expiry', target: 'oauth-storage-expiry', captureSeed: 20261002, checkpoint: "OAuth storage expiry", law: "exclusive expiry" },
];
try {
  const tracked = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
  const source = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z', '--', 'src', 'test', 'scripts', 'migrations'], { encoding: 'utf8' }).split('\0').filter(Boolean);
  for (const file of new Set([...tracked, ...source, 'scripts/oracles-cloudflare.ts', 'vitest.worker-oracles.config.ts'])) {
    if (!existsSync(join(root, file))) continue;
    const destination = join(temporary, file); mkdirSync(dirname(destination), { recursive: true }); cpSync(join(root, file), destination);
  }
  cpSync(join(root, 'sdk/dist'), join(temporary, 'sdk/dist'), { recursive: true });
  cpSync(join(root, 'build'), join(temporary, 'build'), { recursive: true });
  symlinkSync(join(root, 'node_modules'), join(temporary, 'node_modules'), 'dir');
  for (const control of controls) verifyOracleMutation(root, temporary, {
    ...control, changes: [{ file: control.file, from: control.from, to: control.to, all: true }],
    ...(control.target ? { replay: { seed: control.captureSeed ?? 20261001, property: control.target } } : {}),
  }, `auth-mutation-${controls.indexOf(control)}`);
} finally { rmSync(temporary, { recursive: true, force: true }); }
