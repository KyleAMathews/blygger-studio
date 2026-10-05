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
import { claim, claimGuard, completeClaim, current, keyedPublishGuard, publishCompletion, releaseClaim, keyFrom, canonicalJson } from '../src/idempotency.ts';
import { createDraft, getItem, publish, PublishGuardLost, workingCopyGuard } from '../src/model.ts';

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

import { normalizeBlygUrl } from '../extension/lib/url.ts';
import { discover } from '../extension/lib/discovery.ts';
import type { FetchLike } from '../extension/lib/types.ts';
import { flow } from './oauth-flow-driver.ts';
import { authorizeUrl, challengeFor, codeFromRedirect, exchangeCode, randomVerifier, register, REQUESTED_SCOPE } from '../extension/lib/oauth.ts';
import { connectManual, connectOAuth } from '../extension/lib/connect.ts';
import { memoryArea } from '../extension/lib/storage.ts';
import { ReconnectError, TokenStore } from '../extension/lib/tokens.ts';

describe('advertised support and CORS', () => {
  it('the api resource metadata advertises keys and the publish precondition; mcp does not', async () => {
    const f = await flow();
    const api = await (await f.request('/blyg/studio/auth/resources/api')).json() as Record<string, unknown>;
    expect(api.idempotency_key_operations).toEqual(['createItem', 'publishItem']);
    expect(api.publish_preconditions).toEqual(['expected']);
    const mcp = await (await f.request('/blyg/studio/auth/resources/mcp')).json() as Record<string, unknown>;
    expect(mcp.idempotency_key_operations).toBeUndefined();
    expect(mcp.publish_preconditions).toBeUndefined();
  });

  it('discovery documents are CORS-readable, as a browser client needs them', async () => {
    const f = await flow();
    for (const path of ['/blyg/studio/auth/resources/api', '/blyg/studio/auth/.well-known/oauth-authorization-server']) {
      const response = await f.request(path, { headers: { Origin: 'chrome-extension://abc' } });
      expect(response.status, path).toBe(200);
      expect(response.headers.get('access-control-allow-origin'), path).toBe('*');
    }
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

describe('retry-safe publish and the frozen working copy (L2a, L2c)', () => {
  const versions = async (id: string) => (await env.DB.prepare('SELECT COUNT(*) AS n FROM versions WHERE item_id = ?').bind(id).first<{ n: number }>())!.n;
  const stubOf = { url: 'https://source.example/post', cited: { source: 'Source', url: 'https://source.example/post#:~:text=quoted', retrieved: '2026-10-05T00:00:00Z', excerpt: 'quoted' } };
  async function created(f: Awaited<ReturnType<typeof fixture>>, content_md = '> quoted\n\nmine') {
    const res = await f.call('/api/items', { body: { kind: 'thread', content_md, stub_of: stubOf } });
    expect(res.status).toBe(201);
    return (await res.json() as { id: string }).id;
  }
  const expected = (content_md = '> quoted\n\nmine') => ({ content_md, stub_of: stubOf });

  it('a retried publish with the same key makes one version and replays', async () => {
    const f = await fixture(), id = await created(f);
    const first = await f.call(`/api/items/${id}/publish`, { key: 'clip-1:publish', body: { expected: expected() } });
    expect(first.status).toBe(200);
    expect(await first.json()).toMatchObject({ ok: true, version: 1 });
    const again = await f.call(`/api/items/${id}/publish`, { key: 'clip-1:publish', body: { expected: expected() } });
    expect(again.status).toBe(200);
    expect(again.headers.get('idempotent-replayed')).toBe('true');
    expect(await versions(id), 'one version for one publish operation').toBe(1);
  });

  it('a Studio edit before the queued publish stops it; nothing is published (L2c)', async () => {
    const f = await fixture(), id = await created(f);
    expect((await f.call(`/api/items/${id}`, { method: 'PATCH', cookie: true, body: { content_md: 'edited in Studio' } })).status).toBe(200);
    const res = await f.call(`/api/items/${id}/publish`, { key: 'clip-2:publish', body: { expected: expected() } });
    expect(res.status, 'a Studio edit stops a frozen publish').toBe(409);
    expect(await res.json()).toEqual({ error: 'changed' });
    expect(await versions(id)).toBe(0);
  });

  it('contrast: an unchanged working copy publishes', async () => {
    const f = await fixture(), id = await created(f);
    expect((await f.call(`/api/items/${id}/publish`, { body: { expected: expected() } })).status).toBe(200);
    expect(await versions(id)).toBe(1);
  });

  it('a retry after success replays even if the owner edited since (Review Focus 1)', async () => {
    const f = await fixture(), id = await created(f);
    expect((await f.call(`/api/items/${id}/publish`, { key: 'clip-3:publish', body: { expected: expected() } })).status).toBe(200);
    expect((await f.call(`/api/items/${id}`, { method: 'PATCH', cookie: true, body: { content_md: 'edited after publish' } })).status).toBe(200);
    const retry = await f.call(`/api/items/${id}/publish`, { key: 'clip-3:publish', body: { expected: expected() } });
    expect(retry.status, 'the first attempt published; the retry must replay, not refuse').toBe(200);
    expect(retry.headers.get('idempotent-replayed')).toBe('true');
    expect(await versions(id)).toBe(1);
  });

  it('an equivalent stub_of with a different key order matches (Review Focus 3)', async () => {
    const f = await fixture(), id = await created(f);
    const reordered = { stub_of: { cited: { excerpt: 'quoted', retrieved: '2026-10-05T00:00:00Z', url: 'https://source.example/post#:~:text=quoted', source: 'Source' }, url: 'https://source.example/post' }, content_md: '> quoted\n\nmine' };
    expect((await f.call(`/api/items/${id}/publish`, { body: { expected: reordered } })).status).toBe(200);
  });

  it('the Studio publish without key or expected is unchanged (Review Focus 4)', async () => {
    const f = await fixture(), id = await created(f);
    const res = await f.call(`/api/items/${id}/publish`, { cookie: true, body: {} });
    expect(res.status).toBe(200);
    expect(res.headers.get('idempotency-key')).toBeNull();
    expect(await versions(id)).toBe(1);
  });

  it('a refused publish releases its key, so the same key works once the draft is fixed', async () => {
    const f = await fixture();
    const res = await f.call('/api/items', { body: { kind: 'thread', content_md: '![[zzzzzzzzzzzzzzzzzzzzzzzzzz]]' } });
    const { id } = await res.json() as { id: string };
    expect((await f.call(`/api/items/${id}/publish`, { key: 'clip-4:publish', body: {} })).status).toBe(400);
    expect((await f.call(`/api/items/${id}`, { method: 'PATCH', body: { content_md: 'fixed' } })).status).toBe(200);
    expect((await f.call(`/api/items/${id}/publish`, { key: 'clip-4:publish', body: {} })).status, 'a released key runs again').toBe(200);
  });
});

describe('publish replay record is tied to the version insert', () => {
  it('a lost working-copy guard records nothing, not a success', async () => {
    const item = await createDraft(env.DB, 'frozen text', 'thread');
    const run = await claim(env.DB, 'grant-x', 'k-race', 'fp');
    expect(run.kind).toBe('run');
    if (run.kind !== 'run') return;
    await expect(publish(env.DB, item, null, 'https://example.test/', false, {
      where: [workingCopyGuard(item.id, { contentMd: 'different text', stubJson: null }), claimGuard(run)],
      also: [publishCompletion(env.DB, run, item.id, 1)],
    })).rejects.toBeInstanceOf(PublishGuardLost);
    expect((await env.DB.prepare('SELECT COUNT(*) AS n FROM versions WHERE item_id = ?').bind(item.id).first<{ n: number }>())!.n).toBe(0);
    expect((await current(env.DB, 'grant-x', 'k-race', 'fp')).kind, 'a lost guard leaves the claim pending, not a false success').toBe('busy');
  });
});

describe('a keyed publish is tied to the frozen working copy under concurrency', () => {
  const versionCount = async (id: string) => (await env.DB.prepare('SELECT COUNT(*) AS n FROM versions WHERE item_id = ?').bind(id).first<{ n: number }>())!.n;
  const edit = (id: string, md: string) => env.DB.prepare('UPDATE items SET content_md = ?, dirty = 1 WHERE id = ?').bind(md, id).run();

  it('a concurrent edit publishes nothing', async () => {
    const stale = await createDraft(env.DB, 'frozen', 'thread');
    const run = await claim(env.DB, 'grant-c', 'k-edit', 'fp');
    if (run.kind !== 'run') throw new Error('fixture');
    await edit(stale.id, 'edited');
    await expect(publish(env.DB, stale, null, 'https://example.test/', false, keyedPublishGuard(env.DB, run, stale, { contentMd: 'frozen', stubJson: null }))).rejects.toBeInstanceOf(PublishGuardLost);
    expect(await versionCount(stale.id), 'a concurrent edit publishes nothing').toBe(0);
    expect((await current(env.DB, 'grant-c', 'k-edit', 'fp')).kind).toBe('busy');
  });

  it('a concurrent Studio publish is not recorded as ours', async () => {
    const stale = await createDraft(env.DB, 'frozen', 'thread');
    const run = await claim(env.DB, 'grant-c', 'k-pub', 'fp');
    if (run.kind !== 'run') throw new Error('fixture');
    await edit(stale.id, 'edited');
    await publish(env.DB, (await getItem(env.DB, stale.id))!, null, 'https://example.test/');
    await expect(publish(env.DB, stale, null, 'https://example.test/', false, keyedPublishGuard(env.DB, run, stale, { contentMd: 'frozen', stubJson: null }))).rejects.toBeInstanceOf(PublishGuardLost);
    expect((await current(env.DB, 'grant-c', 'k-pub', 'fp')).kind, 'a concurrent Studio publish is not recorded as ours').toBe('busy');
    expect(await versionCount(stale.id)).toBe(1);
  });
});

type Flow = Awaited<ReturnType<typeof flow>>;
/** The extension's fetch, served by the real Worker. `hook` can drop a request before it is sent, or its response after the server answered. */
function workerFetch(f: Flow, hook?: (url: string, init?: RequestInit) => 'pass' | 'drop-before' | 'drop-after'): FetchLike {
  return async (input, init) => {
    const action = hook?.(input, init) ?? 'pass';
    if (action === 'drop-before') throw new TypeError('network down before the request was sent');
    const response = await f.request(input, init);
    if (action === 'drop-after') throw new TypeError('network down after the server answered');
    return response;
  };
}

describe('clipper discovery (L9)', () => {
  it('discovers a mounted blyg through its 401 challenge and metadata under the mount', async () => {
    const f = await flow(), seen: string[] = [];
    const d = await discover(normalizeBlygUrl(f.base + '/blyg/'), workerFetch(f, (url) => { seen.push(url); return 'pass'; }));
    expect(d.issuer).toBe(f.issuer);
    expect(d.resource).toBe(f.base + '/api');
    for (const endpoint of [d.authorize, d.token, d.register]) expect(endpoint.startsWith(f.issuer + '/')).toBe(true);
    expect(d.idempotency).toEqual(['createItem', 'publishItem']);
    expect(d.preconditions).toEqual(['expected']);
    expect(seen.filter((url) => new URL(url).pathname.startsWith('/.well-known')), 'discovery never asks the host root').toEqual([]);
  });

  it('refuses an authorization server off the blyg', async () => {
    const f = await flow(), real = workerFetch(f);
    const hostile: FetchLike = async (url, init) => {
      const response = await real(url, init);
      if (!url.endsWith('/auth/resources/api')) return response;
      return Response.json({ ...(await response.json() as object), authorization_servers: ['https://elsewhere.example/auth'] });
    };
    await expect(discover(normalizeBlygUrl(f.base + '/blyg/'), hostile), 'an issuer off the blyg is refused').rejects.toMatchObject({ name: 'DiscoveryError', step: 'resource' });
  });
});

const REDIRECT = 'https://abcdefghijklmnopabcdefghijklmnop.chromiumapp.org/';
/** The owner approving in the sign-in window: the consent page, the boxes left ticked, then the redirect. */
async function approve(f: Flow, url: string, scopes: string[]) {
  const page = await f.request(url, { headers: { cookie: f.owner } });
  expect(page.status).toBe(200);
  const html = await page.text();
  const handle = html.match(/name="handle" value="([^"]+)"/)![1];
  const binding = page.headers.getSetCookie().map((cookie) => cookie.split(';')[0]).join('; ');
  const decided = await f.request(f.issuer + '/consent', {
    method: 'POST',
    headers: { cookie: `${f.owner}; ${binding}`, Origin: f.base },
    body: new URLSearchParams([['handle', handle], ['decision', 'allow'], ...scopes.map((s) => ['scope', s])]),
  });
  expect(decided.status).toBe(302);
  return decided.headers.get('location')!;
}

describe('clipper OAuth client against the real server', () => {
  it('registers a chromiumapp.org redirect, completes PKCE, and gets the scope the owner left ticked', async () => {
    const f = await flow(), fetchFn = workerFetch(f);
    const d = await discover(normalizeBlygUrl(f.base + '/blyg/'), fetchFn);
    const clientId = await register(d, REDIRECT, fetchFn);
    const verifier = randomVerifier(), state = randomVerifier();
    const url = authorizeUrl(d, { clientId, redirectUri: REDIRECT, state, challenge: await challengeFor(verifier) });
    expect(new URL(url).searchParams.get('scope')).toBe(REQUESTED_SCOPE);
    const code = codeFromRedirect(await approve(f, url, ['owner:read', 'owner:draft']), REDIRECT, state);
    const tokens = await exchangeCode(d, { clientId, code, redirectUri: REDIRECT, verifier }, fetchFn);
    expect(tokens.refreshToken, 'offline_access yields a refresh token').toBeTruthy();
    expect(tokens.scope).toContain('owner:draft');
    expect(tokens.scope, 'unticked scopes are not granted').not.toContain('owner:publish');
    expect((await f.request('/api/settings', { headers: { Authorization: 'Bearer ' + tokens.accessToken } })).status).toBe(200);
  });
});

const isRefresh = (url: string, init?: RequestInit) => url.endsWith('/oauth2/token') && String(init?.body).includes('grant_type=refresh_token');

/** A connected clipper on fake time: local/session survive a "restart" by building a new store over them. */
async function connected(f: Flow, scopes = ['owner:read', 'owner:draft', 'owner:publish'], hook?: Parameters<typeof workerFetch>[1]) {
  let clock = Date.now();
  const local = memoryArea(), session = memoryArea(), fetchFn = workerFetch(f, hook);
  const store = new TokenStore(local, session, fetchFn, () => clock);
  const status = await connectOAuth(f.base + '/blyg/', { fetchFn, store, local, redirectUri: REDIRECT, launch: (url) => approve(f, url, scopes) });
  return { status, store, local, session, fetchFn, advance: (ms: number) => { clock += ms; }, restart: () => new TokenStore(local, session, fetchFn, () => clock) };
}

describe('clipper token store (L4) and connection (L5)', () => {
  it('records the scope consent left, so the panel can adapt (Review Focus 4)', async () => {
    const c = await connected(await flow(), ['owner:read', 'owner:draft']);
    expect(c.status).toMatchObject({ state: 'connected', mode: 'oauth', idempotency: ['createItem', 'publishItem'] });
    if (c.status.state !== 'connected') throw new Error('fixture');
    expect(c.status.scope).toEqual(expect.arrayContaining(['owner:read', 'owner:draft']));
    expect(c.status.scope).not.toContain('owner:publish');
  });

  it('concurrent callers share one refresh, and the refreshed token works', async () => {
    const f = await flow();
    let refreshes = 0;
    const c = await connected(f, undefined, (url, init) => { if (isRefresh(url, init)) refreshes++; return 'pass'; });
    c.advance(2 * 3600_000);
    const [a, b] = await Promise.all([c.store.accessToken(), c.store.accessToken()]);
    expect(refreshes, 'concurrent callers share one refresh').toBe(1);
    expect(a).toBe(b);
    expect((await f.request('/api/settings', { headers: { Authorization: 'Bearer ' + a } })).status).toBe(200);
  });

  it('a refresh lost after the server rotated ends access, and the grant, cleanly', async () => {
    const f = await flow();
    let drop = false;
    const c = await connected(f, undefined, (url, init) => (drop && isRefresh(url, init) ? 'drop-after' : 'pass'));
    const clientId = (await c.restart().connection())?.clientId;
    expect(clientId).toBeTruthy();
    const listed = async () => ((await (await f.request('/api/authorizations', { headers: { cookie: f.owner } })).json()) as { items: { clientId: string }[] }).items.filter((g) => g.clientId === clientId);
    expect(await listed(), 'the grant exists before the lost rotation').toHaveLength(1);
    c.advance(2 * 3600_000);
    drop = true;
    await expect(c.store.accessToken()).rejects.toThrow(TypeError);
    drop = false;
    const restarted = c.restart();
    await expect(restarted.accessToken(), 'the spent token is refused and access ends').rejects.toBeInstanceOf(ReconnectError);
    expect(await restarted.status()).toMatchObject({ state: 'reconnect' });
    let sent = 0;
    const counting = new TokenStore(c.local, c.session, async (url, init) => { sent++; return c.fetchFn(url, init); });
    await expect(counting.accessToken()).rejects.toBeInstanceOf(ReconnectError);
    expect(sent, 'reconnect state asks the owner, not the server').toBe(0);
    expect(await listed(), 'the reused refresh token revoked the grant').toEqual([]);
  });

  it('a refresh that never reached the server is retried from the stored token', async () => {
    const f = await flow();
    let drop = false;
    const c = await connected(f, undefined, (url, init) => (drop && isRefresh(url, init) ? 'drop-before' : 'pass'));
    c.advance(2 * 3600_000);
    drop = true;
    await expect(c.store.accessToken()).rejects.toThrow(TypeError);
    drop = false;
    const token = await c.restart().accessToken();
    expect((await f.request('/api/settings', { headers: { Authorization: 'Bearer ' + token } })).status, 'the stored token still works').toBe(200);
  });

  describe('manual token', () => {
    const mint = async (f: Flow, scope: string[]) => {
      const res = await f.request('/api/authorizations', { method: 'POST', headers: { cookie: f.owner, 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'manual ' + scope.join('+'), scope, resource: 'api' }) });
      expect(res.status).toBe(200);
      return await res.json() as { access_token: string; authorization: { id: string } };
    };
    const store = (f: Flow) => new TokenStore(memoryArea(), memoryArea(), workerFetch(f));

    it('connects a read+draft token and serves it', async () => {
      const f = await flow(), { access_token } = await mint(f, ['owner:read', 'owner:draft']), s = store(f);
      expect(await connectManual(f.base + '/blyg/', access_token, { fetchFn: workerFetch(f), store: s })).toMatchObject({ state: 'connected', mode: 'manual' });
      expect(await s.accessToken()).toBe(access_token);
    });

    it('contrast: a draft-only token connects (L5)', async () => {
      const f = await flow(), { access_token } = await mint(f, ['owner:draft']);
      expect(await connectManual(f.base + '/blyg/', access_token, { fetchFn: workerFetch(f), store: store(f) }), 'a valid draft-only token connects').toMatchObject({ state: 'connected', scope: ['owner:draft'] });
    });

    it('refuses a token that cannot clip, and a revoked one', async () => {
      const f = await flow();
      const readOnly = await mint(f, ['owner:read']);
      await expect(connectManual(f.base + '/blyg/', readOnly.access_token, { fetchFn: workerFetch(f), store: store(f) })).rejects.toThrow('This token cannot clip.');
      const revoked = await mint(f, ['owner:read', 'owner:draft']);
      expect((await f.request('/api/authorizations/' + revoked.authorization.id, { method: 'DELETE', headers: { cookie: f.owner } })).status).toBe(200);
      await expect(connectManual(f.base + '/blyg/', revoked.access_token, { fetchFn: workerFetch(f), store: store(f) }), 'a revoked token is refused').rejects.toThrow('This token is not valid here, or it has expired.');
    });

    it('an expired manual token asks for a new one', async () => {
      const f = await flow(), { access_token } = await mint(f, ['owner:draft']);
      let clock = Date.now();
      const s = new TokenStore(memoryArea(), memoryArea(), workerFetch(f), () => clock);
      await connectManual(f.base + '/blyg/', access_token, { fetchFn: workerFetch(f), store: s });
      clock += 31 * 24 * 3600_000;
      await expect(s.accessToken(), 'an expired manual token is not served').rejects.toThrow('The token expired.');
      expect(await s.status()).toMatchObject({ state: 'reconnect' });
    });
  });
});
