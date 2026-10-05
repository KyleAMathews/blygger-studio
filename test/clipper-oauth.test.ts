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

import { flow } from './oauth-flow-driver.ts';

describe('advertised support and CORS', () => {
  it('the api resource metadata advertises keys and the publish precondition; mcp does not', async () => {
    const f = await flow();
    const api = await (await f.request('/blyg/studio/auth/resources/api')).json() as Record<string, unknown>;
    expect(api.idempotency_key_operations).toEqual(['createItem', 'publishItem']);
    expect(api.publish_preconditions).toEqual(['expected']);
    const mcp = await (await f.request('/blyg/studio/auth/resources/mcp')).json() as Record<string, unknown>;
    expect(mcp.idempotency_key_operations).toBeUndefined();
  });

  it('a preflight allows Idempotency-Key and keyed responses expose the replay headers', async () => {
    const f = await flow();
    const preflight = await f.request('/api/items', { method: 'OPTIONS', headers: { Origin: 'chrome-extension://abc', 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'authorization, content-type, idempotency-key' } });
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get('access-control-allow-headers')?.toLowerCase(), 'a keyed request passes preflight').toContain('idempotency-key');
    const res = await f.request('/api/items', { method: 'POST', headers: { Authorization: 'Bearer not-a-token', 'Content-Type': 'application/json' }, body: '{}' });
    const exposed = res.headers.get('access-control-expose-headers')?.toLowerCase() ?? '';
    for (const header of ['idempotency-key', 'idempotent-replayed', 'retry-after', 'location', 'www-authenticate']) expect(exposed, 'exposes ' + header).toContain(header);
  });
});

async function fixture(scope = ['owner:read', 'owner:draft', 'owner:publish']) {
  const f = await flow();
  const minted = await f.request('/api/authorizations', { method: 'POST', headers: { cookie: f.owner, 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'clipper oracle', scope, resource: 'api' }) });
  expect(minted.status).toBe(200);
  const { access_token } = await minted.json() as { access_token: string };
  const call = (path: string, o: { method?: string; body?: unknown; key?: string; cookie?: boolean } = {}) => f.request(path, {
    method: o.method ?? 'POST',
    headers: { ...(o.cookie ? { cookie: f.owner } : { Authorization: 'Bearer ' + access_token }), 'Content-Type': 'application/json', ...(o.key === undefined ? {} : { 'Idempotency-Key': o.key }) },
    ...(o.body === undefined ? {} : { body: JSON.stringify(o.body) }),
  });
  const items = async () => (await env.DB.prepare('SELECT COUNT(*) AS n FROM items').first<{ n: number }>())!.n;
  return { ...f, call, items };
}

describe('retry-safe create (L2a)', () => {
  it('a retried create with the same key makes one item and replays the first response', async () => {
    const f = await fixture(), before = await f.items();
    const first = await f.call('/api/items', { key: 'clip-1:create', body: { kind: 'thread', content_md: 'Quoted' } });
    const again = await f.call('/api/items', { key: 'clip-1:create', body: { kind: 'thread', content_md: 'Quoted' } });
    // The law first, so a mutant that ignores the key fails at this checkpoint.
    expect(await f.items() - before, 'one item for one key').toBe(1);
    expect(first.status).toBe(201);
    expect(first.headers.get('idempotency-key')).toBe('clip-1:create');
    const { id } = await first.json() as { id: string };
    expect(again.status).toBe(201);
    expect(again.headers.get('idempotent-replayed')).toBe('true');
    expect(again.headers.get('location')).toBe(`/api/items/${id}`);
    expect((await again.json() as { id: string }).id).toBe(id);
  });

  it('contrast: identical text under two keys is two items', async () => {
    const f = await fixture(), before = await f.items();
    for (const key of ['clip-a:create', 'clip-b:create']) expect((await f.call('/api/items', { key, body: { kind: 'thread', content_md: 'Same words' } })).status).toBe(201);
    expect(await f.items() - before).toBe(2);
  });

  it('key order in the body does not change the request (Review Focus 2)', async () => {
    const f = await fixture();
    expect((await f.call('/api/items', { key: 'clip-2:create', body: { kind: 'thread', content_md: 'x' } })).status).toBe(201);
    const reordered = await f.call('/api/items', { key: 'clip-2:create', body: { content_md: 'x', kind: 'thread' } });
    expect(reordered.status, 'same request, different key order, replays').toBe(201);
    expect(reordered.headers.get('idempotent-replayed')).toBe('true');
  });

  it('a different body under the same key is refused and creates nothing', async () => {
    const f = await fixture();
    expect((await f.call('/api/items', { key: 'clip-3:create', body: { kind: 'thread', content_md: 'one' } })).status).toBe(201);
    const before = await f.items();
    expect((await f.call('/api/items', { key: 'clip-3:create', body: { kind: 'thread', content_md: 'two' } })).status).toBe(422);
    expect(await f.items()).toBe(before);
  });

  it('the cookie owner and a token using the same key are separate operations', async () => {
    const f = await fixture(), before = await f.items();
    expect((await f.call('/api/items', { key: 'shared:create', body: { content_md: 'a' } })).status).toBe(201);
    expect((await f.call('/api/items', { key: 'shared:create', body: { content_md: 'a' }, cookie: true })).status).toBe(201);
    expect(await f.items() - before).toBe(2);
  });

  it('malformed keys are refused before any work (Review Focus 5)', async () => {
    const f = await fixture(), before = await f.items();
    for (const key of ['', 'has space', 'x'.repeat(256), 'ü']) {
      const res = await f.call('/api/items', { key, body: { content_md: 'never' } });
      expect(res.status, JSON.stringify(key)).toBe(400);
    }
    expect(await f.items()).toBe(before);
  });

  it('a key on a fork or response create is refused', async () => {
    const f = await fixture();
    const res = await f.call('/api/items', { key: 'fork:create', body: { mode: 'fork', source: { origin: 'https://other.example/', id: '00000000000000000000000001', version: 1 } } });
    expect(res.status).toBe(400);
  });

  it('a create without a key is unchanged', async () => {
    const f = await fixture(), before = await f.items();
    const res = await f.call('/api/items', { body: { content_md: 'plain' } });
    expect(res.status).toBe(201);
    expect(res.headers.get('idempotency-key')).toBeNull();
    expect(await f.items() - before).toBe(1);
  });
});
