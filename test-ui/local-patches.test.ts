// Local patches (docs/where-does-it-go.md, "Local patches"; scripts/patches-lib.ts).
// What these pin, on throwaway git repositories:
//   1. A commit reachable from a release tag or an upstream remote is not local;
//      one after them is, and the merges `npm run upgrade` makes are not counted.
//   2. A `local:` subject is labelled; anything else is flagged.
//   3. A patch that touches a wire path is warned about, by file.
//   4. With no tags and no upstream remote, or in a shallow clone, the count is
//      unknown rather than every commit in the history.
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterAll, describe, expect, test } from 'vitest';
import { describePatches, listLocalPatches } from '../scripts/patches-lib.ts';

const temps: string[] = [];
afterAll(() => {
  for (const dir of temps) rmSync(dir, { recursive: true, force: true });
});
const env = { ...process.env, GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@example.invalid', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@example.invalid', GIT_CONFIG_NOSYSTEM: '1', HOME: tmpdir() };
const repo = () => {
  const dir = mkdtempSync(join(tmpdir(), 'blyg-patches-'));
  temps.push(dir);
  git(dir, 'init', '-q', '-b', 'main');
  return dir;
};
const git = (cwd: string, ...args: string[]) => execFileSync('git', args, { cwd, env, encoding: 'utf8' }).trim();
const commit = (cwd: string, file: string, message: string) => {
  mkdirSync(dirname(join(cwd, file)), { recursive: true });
  writeFileSync(join(cwd, file), `${message}\n`);
  git(cwd, 'add', file);
  git(cwd, 'commit', '-q', '-m', message);
};

describe('local patches', () => {
  test('counts only commits no release or upstream remote carries', () => {
    const dir = repo();
    commit(dir, 'README.md', 'release one');
    git(dir, 'tag', 'v1.0.0');
    commit(dir, 'src/ui/extra.ts', 'local: our footer link (never general)');
    commit(dir, 'src/protocol.ts', 'tweak the manifest');
    const list = listLocalPatches(dir);
    expect(list.known).toBe(true);
    if (!list.known) return;
    expect(list.release).toBe('v1.0.0');
    expect(list.patches.map((p) => [p.subject, p.labelled, p.wire])).toEqual([
      ['local: our footer link (never general)', true, []],
      ['tweak the manifest', false, ['src/protocol.ts']],
    ]);
    const text = describePatches(list);
    expect(text).toContain('2 local patches since v1.0.0');
    expect(text).toContain('no `local:` label');
    expect(text).toContain('⚠ touches src/protocol.ts');
  });

  test('an upgrade merge brings upstream commits, which are not counted', () => {
    const up = repo();
    commit(up, 'README.md', 'release one');
    git(up, 'tag', 'v1.0.0');
    const mine = mkdtempSync(join(tmpdir(), 'blyg-patches-'));
    temps.push(mine);
    git(tmpdir(), '-c', 'advice.detachedHead=false', 'clone', '-q', '--branch', 'v1.0.0', up, mine);
    git(mine, 'switch', '-q', '-c', 'my-blyg');
    commit(mine, 'docs/ours.md', 'local: our notes');
    commit(up, 'src/new.ts', 'upstream work');
    git(up, 'tag', 'v1.1.0');
    git(mine, 'fetch', '-q', 'origin', '--tags');
    git(mine, 'merge', '-q', '--no-edit', 'v1.1.0');
    const list = listLocalPatches(mine);
    expect(list.known && list.patches.map((p) => p.subject)).toEqual(['local: our notes']);
    expect(list.known && list.release).toBe('v1.1.0');
  });

  test('no tags and no upstream remote is unknown, not the whole history', () => {
    const dir = repo();
    commit(dir, 'README.md', 'one');
    commit(dir, 'README.md', 'two');
    expect(listLocalPatches(dir)).toEqual({ known: false, reason: 'no release tags and no upstream remote' });
  });

  test('a shallow clone is unknown', () => {
    const up = repo();
    commit(up, 'README.md', 'one');
    commit(up, 'README.md', 'two');
    git(up, 'tag', 'v1.0.0');
    const shallow = mkdtempSync(join(tmpdir(), 'blyg-patches-'));
    temps.push(shallow);
    git(tmpdir(), '-c', 'advice.detachedHead=false', 'clone', '-q', '--depth', '1', `file://${up}`, shallow);
    expect(listLocalPatches(shallow)).toEqual({ known: false, reason: 'shallow clone' });
  });

  test('not a git checkout is unknown', () => {
    const dir = mkdtempSync(join(tmpdir(), 'blyg-patches-'));
    temps.push(dir);
    expect(listLocalPatches(dir)).toEqual({ known: false, reason: 'not a git checkout' });
  });
});
