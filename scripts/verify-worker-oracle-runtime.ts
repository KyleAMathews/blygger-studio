/** Verify the actual Worker/D1 framework adapter with a captured shrink replay.
 * The authored pagination fault runs in a disposable source copy. Only its
 * registered complete-walk law can credit a kill; replay preserves the native
 * property, seed, path, unit, checkpoint and reduced counterexample.
 */
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, rmSync, symlinkSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { verifyOracleMutation } from './oracle-mutation-control.ts';

const root = resolve('.');
const temporary = mkdtempSync(join(tmpdir(), 'blygger-worker-oracle-runtime-'));
try {
  const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
  for (const file of files) {
    if (!existsSync(join(root, file))) continue;
    const destination = join(temporary, file);
    mkdirSync(dirname(destination), { recursive: true }); cpSync(join(root, file), destination);
  }
  for (const directory of ['build', 'sdk/dist']) cpSync(join(root, directory), join(temporary, directory), { recursive: true });
  symlinkSync(join(root, 'node_modules'), join(temporary, 'node_modules'), 'dir');
  verifyOracleMutation(root, temporary, {
    name: 'Worker/D1 pagination captured replay',
    test: 'test/pagination.oracle.test.ts', pattern: 'random seed: generated$',
    checkpoint: 'page', law: 'complete walk',
    changes: [{ file: 'src/cursor-page.ts', from: 'const ranges = cursor ? afterRanges(source.order, cursor.after) : null;', to: 'const ranges = null;' }],
    replay: { property: 'pagination', seed: 20261001 },
  }, 'worker-runtime');
} finally { rmSync(temporary, { recursive: true, force: true }); }
