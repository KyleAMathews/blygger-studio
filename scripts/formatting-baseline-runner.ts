/** Derive the explicit CI mode without modifying the pinned npm installation. */
import { createHash } from 'node:crypto';
import { cp, lstat, mkdir, mkdtemp, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { join, relative, resolve } from 'node:path';
const exec = promisify(execFile);
const hash = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex');

/** Every regular package file, sorted and bound by content. Symlinks refuse. */
async function content(root: string, at = ''): Promise<Array<{ path: string; sha256: string }>> {
  const files: Array<{ path: string; sha256: string }> = [];
  for (const name of (await readdir(join(root, at))).sort()) {
    const relative = at ? at + '/' + name : name, file = join(root, relative), stat = await lstat(file);
    if (stat.isSymbolicLink()) throw new Error('Derived formatting runner refuses package symlinks: ' + relative);
    if (stat.isDirectory()) files.push(...await content(root, relative));
    else if (stat.isFile()) files.push({ path: relative, sha256: hash(await readFile(file)) });
    else throw new Error('Derived formatting runner requires ordinary package files: ' + relative);
  }
  return files;
}

export async function prepareFormattingBaselineRunner(root = process.cwd()): Promise<string> {
  const installed = resolve(root, 'node_modules/@tanstack/oracles');
  const installedStat = await lstat(installed);
  if (installedStat.isSymbolicLink() || !installedStat.isDirectory()) throw new Error('Derived formatting runner requires a real installed package directory');
  const spec = JSON.parse(await readFile(resolve(root, 'scripts/formatting-baseline-runner-manifest.json'), 'utf8'));
  const patch = await readFile(resolve(root, 'scripts/formatting-baseline-runner.patch'));
  const manifest = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
  const lock = JSON.parse(await readFile(resolve(root, 'package-lock.json'), 'utf8')).packages?.['node_modules/@tanstack/oracles'];
  if (spec.schema !== 'blygger-formatting-baseline-runner-v1' || manifest.devDependencies?.['@tanstack/oracles'] !== spec.pin || lock?.resolved !== spec.pin || lock?.integrity !== spec.integrity || hash(patch) !== spec.patchSha256) throw new Error('Derived formatting runner pin, integrity, or patch fingerprint differs');
  const before = await content(installed);
  if (JSON.stringify(before) !== JSON.stringify(spec.packageFiles)) throw new Error('Installed oracle package differs from the complete pristine pinned content manifest');
  for (const file of spec.files) if (before.find(item => item.path === file.path)?.sha256 !== file.beforeSha256) throw new Error('Installed oracle runner is not the pristine pinned source: ' + file.path);
  const expectedAfter = before.map(item => ({ ...item, sha256: spec.files.find((file: any) => file.path === item.path)?.afterSha256 ?? item.sha256 }));
  const parent = resolve(root, 'build/formatting-oracle-runner');
  const target = join(parent, spec.patchSha256), receiptPath = join(target, 'derivation.json');
  const receipt = { schema: spec.schema, source: 'pristine npm installation bound by package-lock integrity and every copied file', pin: spec.pin, integrity: spec.integrity, patchSha256: spec.patchSha256, installed, package: join(target, 'package'), before, after: expectedAfter };
  try {
    const prior = JSON.parse(await readFile(receiptPath, 'utf8'));
    if (JSON.stringify(prior) !== JSON.stringify(receipt) || JSON.stringify(await content(join(target, 'package'))) !== JSON.stringify(expectedAfter)) throw new Error('Existing derived formatting runner differs from its exact content manifest');
    return join(target, 'package');
  } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  await mkdir(parent, { recursive: true });
  const staging = await mkdtemp(join(parent, '.baseline-staging-'));
  try {
    await cp(installed, join(staging, 'package'), { recursive: true, dereference: false });
    const copied = await content(join(staging, 'package'));
    if (JSON.stringify(copied) !== JSON.stringify(before)) throw new Error('Pinned package changed during derived-runner copy');
    await exec('git', ['apply', '--directory=' + relative(root, join(staging, 'package')), '--check', resolve(root, 'scripts/formatting-baseline-runner.patch')], { cwd: root });
    await exec('git', ['apply', '--directory=' + relative(root, join(staging, 'package')), resolve(root, 'scripts/formatting-baseline-runner.patch')], { cwd: root });
    if (JSON.stringify(await content(join(staging, 'package'))) !== JSON.stringify(expectedAfter) || JSON.stringify(await content(installed)) !== JSON.stringify(before)) throw new Error('Derived or installed runner differs after patch application');
    await writeFile(join(staging, 'derivation.json'), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
    await rename(staging, target);
  } catch (error) { await rm(staging, { recursive: true, force: true }); throw error; }
  return join(target, 'package');
}
