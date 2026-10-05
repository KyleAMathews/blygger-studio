/**
 * Clipper server oracles (spec docs/superpowers/specs/2026-10-05-chrome-clipper-design.md).
 *
 * Laws:
 * - L2a At most once: under any fault schedule, a save operation yields at
 *   most one item and a publish operation at most one new version. Source:
 *   spec §9; IETF draft-ietf-httpapi-idempotency-key-header.
 * - L2c Frozen publish: a publish makes public exactly the frozen working
 *   copy, or nothing. Source: spec §5.2, §9.
 * Model: one claim row per (principal, key); a fresh attempt token per
 * claim; only the live attempt's guarded writes commit. Expectations are
 * stated here, not computed by production helpers.
 * Driver: production modules against the real D1 binding, and the real Worker
 * through test/oauth-flow-driver.ts for HTTP laws.
 * Limits: one Worker instance; a crash between statements is modelled by a
 * stale attempt, since D1 commits a batch atomically.
 */
import { env } from 'cloudflare:test';
import { beforeEach, describe, expect, it } from 'vitest';
import { claim, claimGuard, completeClaim, releaseClaim, keyFrom, canonicalJson } from '../src/idempotency.ts';

beforeEach(async () => {
  await env.DB.prepare('DELETE FROM idempotency_keys').run();
  await env.DB.prepare('DELETE FROM security_budgets').run();
});

const T = 1_800_000_000_000;
const live = async (sql: string, binds: unknown[]) => (await env.DB.prepare(`SELECT 1 AS ok WHERE ${sql}`).bind(...binds).first()) !== null;

describe('claim store', () => {
  it('a fresh key runs once; the same request is busy while pending', async () => {
    const a = await claim(env.DB, 'grant-a', 'k1', 'fp', T);
    expect(a.kind).toBe('run');
    expect((await claim(env.DB, 'grant-a', 'k1', 'fp', T + 1000)).kind, 'a pending claim is not run twice').toBe('busy');
  });

  it('a completed claim replays its stored response', async () => {
    const a = await claim(env.DB, 'grant-a', 'k1', 'fp', T);
    if (a.kind !== 'run') throw new Error('fixture');
    await env.DB.batch([completeClaim(env.DB, a, { status: 201, body: '{"id":"x"}', location: '/api/items/x' })]);
    expect(await claim(env.DB, 'grant-a', 'k1', 'fp', T + 1000)).toEqual({ kind: 'replay', status: 201, body: '{"id":"x"}', location: '/api/items/x' });
  });

  it('a different request under the same key is a mismatch', async () => {
    await claim(env.DB, 'grant-a', 'k1', 'fp-1', T);
    expect((await claim(env.DB, 'grant-a', 'k1', 'fp-2', T + 1000)).kind).toBe('mismatch');
  });

  it('keys are per principal', async () => {
    expect((await claim(env.DB, 'grant-a', 'k1', 'fp', T)).kind).toBe('run');
    expect((await claim(env.DB, 'owner', 'k1', 'fp', T)).kind, 'another principal gets its own key space').toBe('run');
  });

  it('a stale pending claim is reclaimed with a new token, and the old token commits nothing', async () => {
    const a = await claim(env.DB, 'grant-a', 'k1', 'fp', T);
    const b = await claim(env.DB, 'grant-a', 'k1', 'fp', T + 61_000);
    if (a.kind !== 'run' || b.kind !== 'run') throw new Error('both must run: a first, b after the 60 s stale bound');
    expect(b.attempt).not.toBe(a.attempt);
    const [stale] = await env.DB.batch([completeClaim(env.DB, a, { status: 201, body: '{}', location: null })]);
    expect(stale.meta.changes, 'a dead attempt commits nothing').toBe(0);
    expect(await live(claimGuard(a).sql, claimGuard(a).binds), 'the work guard refuses the dead attempt').toBe(false);
    expect(await live(claimGuard(b).sql, claimGuard(b).binds), 'the work guard admits the live attempt').toBe(true);
  });

  it('reclaim, fail and reinsert never revives the first token', async () => {
    const a = await claim(env.DB, 'grant-a', 'k1', 'fp', T);
    const b = await claim(env.DB, 'grant-a', 'k1', 'fp', T + 61_000);
    if (a.kind !== 'run' || b.kind !== 'run') throw new Error('fixture');
    await releaseClaim(env.DB, b);
    const c = await claim(env.DB, 'grant-a', 'k1', 'fp', T + 62_000);
    if (c.kind !== 'run') throw new Error('a released key is claimable again');
    const [stale] = await env.DB.batch([completeClaim(env.DB, a, { status: 201, body: '{}', location: null })]);
    expect(stale.meta.changes, 'a dead attempt commits nothing').toBe(0);
    const [winner] = await env.DB.batch([completeClaim(env.DB, c, { status: 201, body: '{}', location: null })]);
    expect(winner.meta.changes).toBe(1);
  });

  it('release removes only a pending claim held by the same attempt', async () => {
    const a = await claim(env.DB, 'grant-a', 'k1', 'fp', T);
    if (a.kind !== 'run') throw new Error('fixture');
    await env.DB.batch([completeClaim(env.DB, a, { status: 200, body: '{}', location: null })]);
    await releaseClaim(env.DB, a);
    expect((await claim(env.DB, 'grant-a', 'k1', 'fp', T + 1000)).kind, 'a finished claim survives release').toBe('replay');
  });

  it('keys expire 24 hours after creation', async () => {
    const a = await claim(env.DB, 'grant-a', 'k1', 'fp', T);
    if (a.kind !== 'run') throw new Error('fixture');
    await env.DB.batch([completeClaim(env.DB, a, { status: 201, body: '{}', location: null })]);
    expect((await claim(env.DB, 'grant-a', 'k1', 'fp', T + 24 * 3600_000 + 1)).kind, 'an expired key runs as new').toBe('run');
  });

  it('accepts printable ASCII keys of 1 to 255 characters only', () => {
    expect(keyFrom(undefined)).toBeNull();
    for (const ok of ['a', 'clip-1:create', '!'.repeat(255)]) expect(keyFrom(ok)).toBe(ok);
    for (const bad of ['', 'has space', 'x'.repeat(256), 'ü', 'tab\tkey']) expect(keyFrom(bad), JSON.stringify(bad)).toBe(false);
  });

  it('canonical JSON sorts keys and drops undefined', () => {
    expect(canonicalJson({ b: 1, a: { d: [2, { z: 1, y: undefined }], c: null } })).toBe('{"a":{"c":null,"d":[2,{"z":1}]},"b":1}');
  });
});
