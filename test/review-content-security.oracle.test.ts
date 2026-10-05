/**
 * R01/R02: imported markup and attribution fields are data even when quoted by
 * the owner. OWASP XSS guidance requires safe HTML and attribute contexts:
 * https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html
 * Model: a safe paragraph/link survives; script/event/active URL authority never
 * crosses preview -> published thread -> owner history. Attribution bytes cannot
 * create an extra element or an active-scheme link. Expectations do not call the
 * production sanitizer or escaping helper. The driver seeds raw native imports,
 * uses real owner REST create/publish/preview/history, then public page handlers.
 * Limits: fixed stored-input histories, complemented by actual browser execution;
 * this is not a proof of all HTML grammars or deployed CSP behavior.
 */
import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { expect, it } from 'vitest';
import { makeApp } from '../src/index.ts';
const sourceId = '00000000000000000000000001';
const app = makeApp('/blyg'), base = 'https://review-content.example.test';
async function receive(path: string, init: RequestInit = {}) {
  const ctx = createExecutionContext();
  const response = await app.fetch(new Request(base + path, init), env, ctx);
  await waitOnExecutionContext(ctx); return response;
}
async function setup(html: string, page = 'post') {
  await env.DB.prepare("DELETE FROM hopper_items WHERE hopper_id = 'review-hopper'").run();
  await env.DB.prepare("DELETE FROM hoppers WHERE id = 'review-hopper'").run();
  await env.DB.prepare("DELETE FROM imported_items WHERE subscription_id = 'review-native'").run();
  await env.DB.prepare("DELETE FROM subscriptions WHERE id = 'review-native'").run();
  const login = await receive('/blyg/studio/login', { method: 'POST', headers: { 'CF-Connecting-IP': 'fd00:' + crypto.randomUUID().replaceAll('-', '').match(/.{4}/g)!.slice(0,7).join(':') }, body: new URLSearchParams({ password: env.OWNER_PASSWORD }) });
  expect(login.status).toBe(302); const cookie = login.headers.get('set-cookie')!.split(';')[0];
  await env.DB.prepare("INSERT INTO subscriptions(id,kind,origin,feed_url,title,created) VALUES ('review-native','blyg','https://publisher.example/','https://publisher.example/feed','Publisher','2026-10-01')").run();
  await env.DB.prepare("INSERT INTO imported_items(subscription_id,remote_id,kind,state,version,observed_at,content_html,l0,page) VALUES ('review-native',?,'fragment','current',1,'2026-10-01',?,0,?)").bind(sourceId, html, page).run();
  const owner = (path: string, method = 'GET', body?: unknown) => receive(path, { method, headers: { cookie, 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  return { owner, cookie };
}
async function inert(html: string, law: string, publicPage = false) {
  const violations: string[] = [];
  await new HTMLRewriter().on(publicPage ? 'article *' : '*', { element(el) {
    if (['script','svg','iframe','math'].includes(el.tagName)) violations.push(el.tagName);
    for (const [key, value] of el.attributes) {
      if (/^on/i.test(key)) violations.push(key);
      if (['href','src','xlink:href'].includes(key) && ['javascript:','data:'].includes(new URL(value, base).protocol)) violations.push(key);
    }
  } }).transform(new Response(html)).text();
  expect(violations, law).toEqual([]);
}
it.each(['preview', 'publication', 'history'])('keeps remote HTML inert in transclusion %s', async surface => {
  const f = await setup('<p>Safe quoted text <a href="https://safe.example/">safe link</a></p><img src="/missing" onerror="document.documentElement.dataset.compromised=1"><svg onload="document.documentElement.dataset.compromised=1"></svg>');
  const content_md = `![[${sourceId}]]`;
  const preview = await f.owner('/api/preview', 'POST', { kind: 'thread', content_md }); expect(preview.status).toBe(200);
  const p = await preview.json() as { html: string; errors: unknown[] };
  expect(p.errors).toEqual([]); expect(p.html).toContain('Safe quoted text');
  expect(p.html).toContain('href="https://safe.example/"');
  if (surface === 'preview') return inert(p.html, 'transclusion preview cannot execute imported HTML');
  const created = await f.owner('/api/items', 'POST', { kind: 'thread', content_md }); expect(created.status).toBe(201);
  const { id } = await created.json() as { id: string };
  expect((await f.owner(`/api/items/${id}/publish`, 'POST')).status).toBe(200);
  const publicPage = await receive(`/blyg/t/${id}/`); expect(publicPage.status).toBe(200);
  if (surface === 'publication') return inert(await publicPage.text(), 'published transclusion cannot execute imported HTML', true);
  const history = await f.owner(`/api/items/${id}/versions/1`); expect(history.status).toBe(200);
  const h = await history.json() as { content_html: string };
  await inert(h.content_html, 'history cannot execute imported HTML');
});
it('remote attribution cannot inject elements into a public hopper', async () => {
  const f = await setup('<p>Safe quoted text</p>', 'post"><img src="/missing" onerror="document.documentElement.dataset.compromised=1">');
  await env.DB.prepare("INSERT INTO hoppers(id,name,slug,public,created) VALUES ('review-hopper','Review','review',1,'2026-10-01')").run();
  await env.DB.prepare("INSERT INTO hopper_items(hopper_id,subscription_id,remote_id,added_at) VALUES ('review-hopper','review-native',?,'2026-10-01')").bind(sourceId).run();
  const response = await receive('/blyg/h/review/'); expect(response.status).toBe(200);
  await inert(await response.text(), 'remote page must stay within its href attribute', true);
  expect((await f.owner('/api/settings')).status).toBe(200);
});
it('remote attribution cannot inject elements into public transclusion provenance', async () => {
  const f = await setup('<p>Safe quoted text</p>', 'post"><img src="/missing" onerror="document.documentElement.dataset.compromised=1">');
  const created = await f.owner('/api/items', 'POST', { kind: 'thread', content_md: `![[${sourceId}]]` }); expect(created.status).toBe(201);
  const { id } = await created.json() as { id: string };
  expect((await f.owner(`/api/items/${id}/publish`, 'POST')).status).toBe(200);
  const response = await receive(`/blyg/t/${id}/`); expect(response.status).toBe(200);
  await inert(await response.text(), 'provenance href cannot create attacker markup', true);
});

// Already-published bytes are immutable protocol history. Upgrade safety requires
// inert presentation of old bakes without silently rewriting their stored/wire
// snapshot. These witnesses seed the pre-fix shape, not a fresh safe publication.
it.each(['public', 'pin', 'history', 'detail', 'reading'])('renders legacy bakes inert in %s without changing their snapshot', async surface => {
  const f = await setup('<p>Safe quoted text</p>');
  const created = await f.owner('/api/items', 'POST', { kind: 'thread', content_md: `![[${sourceId}]]` });
  expect(created.status).toBe(201); const { id } = await created.json() as { id: string };
  expect((await f.owner(`/api/items/${id}/publish`, 'POST')).status).toBe(200);
  const legacy = '<blockquote class="blyg-transclusion" data-blyg-id="' + sourceId + '"><p>Legacy safe text</p><img src="/missing" onerror="document.documentElement.dataset.compromised=1"></blockquote>';
  await env.DB.prepare('UPDATE versions SET content_html=?, pinned=1 WHERE item_id=? AND version=1').bind(legacy, id).run();
  const paths = { public: `/blyg/t/${id}/`, pin: `/blyg/t/${id}/v1/`, history: `/api/items/${id}/versions/1`, detail: `/api/items/${id}`, reading: '/api/reading?sub=own' };
  const response = await f.owner(paths[surface as keyof typeof paths]); expect(response.status).toBe(200);
  let html: string;
  if (surface === 'public' || surface === 'pin') html = await response.text();
  else {
    const value = await response.json() as any;
    html = surface === 'history' ? value.content_html : surface === 'detail' ? value.versions[0].content_html : value.items.find((entry: any) => entry.own?.id === id).contentHtml;
  }
  expect(html).toContain('Legacy safe text');
  await inert(html, 'legacy snapshot cannot regain script authority during presentation', surface === 'public' || surface === 'pin');
  const wire = await receive(`/blyg/items/${id}/v1.json`); expect(wire.status).toBe(200);
  expect((await wire.json() as {content_html:string}).content_html).toBe(legacy);
  expect((await env.DB.prepare('SELECT content_html FROM versions WHERE item_id=? AND version=1').bind(id).first<{content_html:string}>())!.content_html).toBe(legacy);
});
// A draft-only token writes the citation. Only http(s) citations are data a
// reader can follow, so an active scheme is refused before anyone publishes it.
it.each([
  ['cited.url', { url: 'https://cited.example/p', cited: { source: 'Cited', url: 'javascript:document.documentElement.dataset.compromised=1', retrieved: '2026-10-01T00:00:00Z' } }],
  ['stub_of.url', { url: 'javascript:document.documentElement.dataset.compromised=1' }],
])('a delegated %s with an active scheme is refused', async (_field, stub_of) => {
  const { flow } = await import('./oauth-flow-driver.ts');
  const f = await flow();
  const minted = await f.request('/api/authorizations', { method: 'POST', headers: { cookie: f.owner, 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'citation drafter', scope: ['owner:draft'], resource: 'api' }) });
  expect(minted.status).toBe(200);
  const { access_token } = await minted.json() as { access_token: string };
  const draft = (path: string, method: string, body: unknown) => f.request(path, { method, headers: { Authorization: 'Bearer ' + access_token, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const created = await draft('/api/items', 'POST', { kind: 'thread', content_md: 'A response' });
  expect(created.status).toBe(201);
  const { id } = await created.json() as { id: string };
  expect((await draft('/api/items/' + id, 'PATCH', { stub_of })).status, 'active-scheme citations are refused at write').toBe(400);
  expect((await draft('/api/items/' + id, 'PATCH', { stub_of: { url: 'https://cited.example/p', cited: { source: 'Cited', url: 'https://cited.example/p', retrieved: '2026-10-01T00:00:00Z' } } })).status, 'an http(s) citation stays writable').toBe(200);
});
// Rows stored before the write check, and lineage kept verbatim from imports,
// reach the same anchors. Rendering must keep them inert on its own.
it.each([
  ['stub_cite.url', { stub_of: '{"url":"https://cited.example/p"}', stub_cite: '{"source":"S","url":"javascript:document.documentElement.dataset.compromised=1","retrieved":"2026-10-01T00:00:00Z"}' }, {}],
  ['stub_of.url', { stub_of: '{"url":"javascript:document.documentElement.dataset.compromised=1"}', stub_cite: null }, {}],
  ['fork_cite.url', {}, { forked_from: '{"origin":"https://fork.example/","id":"0000000000000000000000000f","version":1}', fork_cite: '{"source":"F","url":"javascript:document.documentElement.dataset.compromised=1","retrieved":"2026-10-01T00:00:00Z"}' }],
  ['forked_from.origin', {}, { forked_from: '{"origin":"javascript:document.documentElement.dataset.compromised=1//","id":"0000000000000000000000000f","version":1}', fork_cite: null }],
] as const)('a stored %s cannot become an active link on public pages', async (_field, version, item) => {
  const f = await setup('<p>unused</p>');
  const created = await f.owner('/api/items', 'POST', { kind: 'thread', content_md: 'A response' }); expect(created.status).toBe(201);
  const { id } = await created.json() as { id: string };
  expect((await f.owner(`/api/items/${id}/publish`, 'POST')).status).toBe(200);
  for (const [column, value] of Object.entries(version)) expect((await env.DB.prepare(`UPDATE versions SET ${column}=? WHERE item_id=?`).bind(value, id).run()).meta.changes).toBe(1);
  for (const [column, value] of Object.entries(item)) expect((await env.DB.prepare(`UPDATE items SET ${column}=? WHERE id=?`).bind(value, id).run()).meta.changes).toBe(1);
  for (const path of [`/blyg/t/${id}/`, '/blyg/']) {
    const page = await receive(path); expect(page.status).toBe(200);
    const html = await page.text();
    expect(html, 'the stored citation reaches ' + path).toMatch(/stub-cite/);
    await inert(html, 'stored citation cannot create an active link on ' + path, true);
  }
});
