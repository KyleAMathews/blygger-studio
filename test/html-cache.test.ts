import { SELF, env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import worker from '../src/index.ts';
import { htmlCacheResponse, publicHtmlKey, publicHtmlRequest } from '../src/html-cache.ts';
import { BASE, login, createAndPublish, apiJson } from './helpers.ts';

const EDGE = 'public, max-age=60, stale-while-revalidate=300, stale-if-error=0';

describe('public HTML caching', () => {
  it('gives the homepage a stable ETag and separate browser/edge policies', async () => {
    const first = await SELF.fetch(`${BASE}/blyg/`);
    expect(first.status).toBe(200);
    expect(first.headers.get('cache-control')).toBe('no-cache');
    expect(first.headers.get('cloudflare-cdn-cache-control')).toBe(EDGE);
    const etag = first.headers.get('etag');
    expect(etag).toMatch(/^W\/"[a-f0-9]{64}"$/);
    expect(await first.text()).toContain('<!doctype html>');
    const second = await SELF.fetch(`${BASE}/blyg/`);
    expect(second.headers.get('etag')).toBe(etag);
    await second.arrayBuffer();
  });

  it('validates weak, strong, list and wildcard ETags, including HEAD', async () => {
    const first = await SELF.fetch(`${BASE}/blyg/`);
    const etag = first.headers.get('etag')!;
    await first.arrayBuffer();
    for (const validator of [etag, etag.slice(2), `"other", ${etag}`, '*']) {
      for (const method of ['GET', 'HEAD']) {
        const response = await SELF.fetch(`${BASE}/blyg/`, { method, headers: { 'if-none-match': validator } });
        expect(response.status).toBe(304);
        expect(response.headers.get('etag')).toBe(etag);
        expect(response.headers.get('cache-control')).toBe('no-cache');
        expect(await response.text()).toBe('');
      }
    }
    const head = await SELF.fetch(`${BASE}/blyg/`, { method: 'HEAD' });
    expect(head.status).toBe(200);
    expect(head.headers.get('etag')).toBe(etag);
    expect(await head.text()).toBe('');
  });

  it('changes the validator when generated HTML changes', async () => {
    const first = await SELF.fetch(`${BASE}/blyg/`);
    const etag = first.headers.get('etag')!;
    await first.arrayBuffer();
    await env.DB.prepare("INSERT INTO settings(key,value) VALUES('site_title','Changed cache title') ON CONFLICT(key) DO UPDATE SET value=excluded.value").run();
    const next = await SELF.fetch(`${BASE}/blyg/`, { headers: { 'if-none-match': etag } });
    expect(next.status).toBe(200);
    expect(next.headers.get('etag')).not.toBe(etag);
    expect(await next.text()).toContain('Changed cache title');
  });

  it('covers archives, permalinks and pinned HTML without caching missing pages', async () => {
    const cookie = await login();
    const id = await createAndPublish(cookie, 'HTML cache item');
    expect((await apiJson(cookie, 'PUT', `/api/items/${id}/versions/1/pin`)).status).toBe(200);
    for (const path of ['/archive/', `/f/${id}/`, `/f/${id}/v1/`]) {
      const response = await SELF.fetch(`${BASE}/blyg${path}`);
      expect(response.status, path).toBe(200);
      expect(response.headers.get('etag'), path).toMatch(/^W\//);
      expect(response.headers.get('cloudflare-cdn-cache-control'), path).toBe(EDGE);
      await response.arrayBuffer();
    }
    for (const path of ['/f/missing/', '/h/missing/', `/t/${id}/`]) {
      const response = await SELF.fetch(`${BASE}/blyg${path}`, { headers: { 'if-none-match': '*' } });
      expect(response.status, path).toBe(404);
      expect(response.headers.get('cache-control'), path).toBe('no-store');
      expect(response.headers.has('cloudflare-cdn-cache-control'), path).toBe(false);
      await response.arrayBuffer();
    }
  });

  it('leaves private and wire responses outside the HTML policy', async () => {
    for (const path of ['/api/settings', '/blyg/studio/login', '/blyg/blyg.json', '/blyg/style.css', '/blyg/feed.xml']) {
      const response = await SELF.fetch(`${BASE}${path}`);
      expect(response.headers.has('cloudflare-cdn-cache-control'), path).toBe(false);
      await response.arrayBuffer();
    }
  });

  it('preserves public response headers and excludes cookie-setting responses and errors', async () => {
    const response = await htmlCacheResponse(new Request(BASE), new Response('<p>public</p>', { headers: { 'content-type': 'text/html', Link: '</webmention>; rel="webmention"' } }));
    expect(response.headers.get('link')).toBe('</webmention>; rel="webmention"');
    await response.arrayBuffer();
    const excludedResponses = [
      new Response('error', { status: 500 }),
      new Response('private', { headers: { 'content-type': 'text/html', 'cache-control': 'private' } }),
      new Response('no-store', { headers: { 'content-type': 'text/html', 'cache-control': 'no-store' } }),
      new Response('login', { headers: { 'content-type': 'text/html', 'set-cookie': 'session=test' } }),
    ];
    for (const source of excludedResponses) {
      const response = await htmlCacheResponse(new Request(BASE), source);
      expect(response.headers.get('cache-control')).toBe('no-store');
      expect(response.headers.has('cloudflare-cdn-cache-control')).toBe(false);
      expect(response.headers.has('etag')).toBe(false);
      await response.arrayBuffer();
    }
  });
});

describe('cached entrypoint dispatch', () => {
  it.each(['', '/blyg', '/notes/b'])('routes only public HTML reads under mount %s', mount => {
    for (const page of ['', '/', '/archive/', '/f/id', '/t/id/v2/', '/h/collection']) {
      expect(publicHtmlRequest(new Request(`${BASE}${mount}${page}`), mount)).toBe(true);
    }
    for (const page of ['/studio', '/studio/login', '/feed.xml', '/items/id.json', '/media/image.jpg', '/unknown']) {
      expect(publicHtmlRequest(new Request(`${BASE}${mount}${page}`), mount)).toBe(false);
    }
    expect(publicHtmlRequest(new Request(`${BASE}/api/settings`), mount)).toBe(false);
    expect(publicHtmlRequest(new Request(`${BASE}${mount}/`, { method: 'POST' }), mount)).toBe(false);
    if (mount) expect(publicHtmlRequest(new Request(`${BASE}${mount}extra/`), mount)).toBe(false);
  });

  it('shares tracking-query and slash variants but separates hosts, schemes and paths', () => {
    expect(publicHtmlKey(new Request(`${BASE}/blyg/?utm_source=test`))).toBe(`${BASE}/blyg`);
    expect(publicHtmlKey(new Request(`${BASE}/blyg`))).toBe(`${BASE}/blyg`);
    expect(publicHtmlKey(new Request('https://other.example/blyg/'))).not.toBe(`${BASE}/blyg`);
    expect(publicHtmlKey(new Request('http://example.com/blyg/'))).not.toBe(`${BASE}/blyg`);
    expect(publicHtmlKey(new Request(`${BASE}/blyg/archive/`))).not.toBe(`${BASE}/blyg`);
  });

  it('validates reloads against cached bytes and shares GET/HEAD without forcing refresh', async () => {
    const headers = { 'content-type': 'text/html', etag: 'W/"saved"', 'cache-control': 'no-cache' };
    const ctx = { exports: { PublicHtml: { fetch: (req: Request) => {
      expect(req.method).toBe('GET');
      for (const name of ['cache-control', 'pragma', 'if-none-match', 'if-modified-since']) expect(req.headers.has(name), name).toBe(false);
      return Promise.resolve(new Response('saved HTML', { headers }));
    } } } } as unknown as ExecutionContext;
    for (const method of ['GET', 'HEAD']) {
      const response = await worker.fetch(new Request(`${BASE}/blyg/`, { method, headers: { 'cache-control': 'max-age=0', pragma: 'no-cache', 'if-none-match': '"saved"', 'if-modified-since': 'Tue, 06 Oct 2026 00:00:00 GMT' } }), env, ctx);
      expect(response.status).toBe(304);
      expect(await response.text()).toBe('');
    }
    const head = await worker.fetch(new Request(`${BASE}/blyg/`, { method: 'HEAD' }), env, ctx);
    expect(head.status).toBe(200);
    expect(await head.text()).toBe('');
  });

  it('ignores HTML ranges before browser validation, including HEAD', async () => {
    const ctx = { exports: { PublicHtml: { fetch: (req: Request) => {
      const headers = { 'content-type': 'text/html', etag: 'W/"saved"' };
      // Workers Cache can produce a range response before the gateway runs.
      if (req.headers.has('range')) {
        return Promise.resolve(new Response('saved', { status: 206, headers: { ...headers, 'content-range': 'bytes 0-4/10' } }));
      }
      expect(req.headers.has('if-range')).toBe(false);
      return Promise.resolve(new Response('saved HTML', { headers }));
    } } } } as unknown as ExecutionContext;
    for (const method of ['GET', 'HEAD']) {
      const matched = await worker.fetch(new Request(`${BASE}/blyg/`, {
        method, headers: { range: 'bytes=0-4', 'if-range': '"saved"', 'if-none-match': '"saved"' },
      }), env, ctx);
      expect(matched.status).toBe(304);
      expect(await matched.text()).toBe('');
      const unmatched = await worker.fetch(new Request(`${BASE}/blyg/`, {
        method, headers: { range: 'bytes=0-4', 'if-range': '"saved"' },
      }), env, ctx);
      expect(unmatched.status).toBe(200);
      expect(await unmatched.text()).toBe(method === 'HEAD' ? '' : 'saved HTML');
    }
  });

  it('passes the origin-specific key to the cache without rendering in the gateway', async () => {
    let seen: unknown;
    const cached = new Response('saved HTML');
    const ctx = { exports: { PublicHtml: { fetch: (req: Request, init: unknown) => { seen = { url: req.url, init }; return Promise.resolve(cached); } } } } as unknown as ExecutionContext;
    const response = await worker.fetch(new Request(`${BASE}/blyg/?utm_source=test`), env, ctx);
    expect(response).toBe(cached);
    expect(seen).toEqual({ url: `${BASE}/blyg/?utm_source=test`, init: { cf: { cacheKey: `${BASE}/blyg` } } });
  });
});
