/** Untrusted imported markup, attribution and delegated text remain inert at
 * preview, public-page and owner-history responses. This owns the owner API and
 * public renderer while preserving immutable published snapshot bytes.
 *
 * POST /api/preview { thread transclusion } // → safe text/links without active markup
 * GET /t/id/ // → hostile stored captions and settings remain data
 * GET /items/id/v1.json // → original published source bytes
 * PATCH /api/settings { active author link } // → refused; https/mailto remain writable
 *
 * Sanitizing a bake would hide a rendering defect by rewriting protocol history.
 * For every finite source/action plan below, presentation removes script authority,
 * preserves safe neighbors and leaves published snapshots unchanged (protocol
 * §§5.2/10.2 and OWASP XSS Prevention). Citation/author-link writes reject active
 * schemes; all delegated writable text remains data across the public page crawl.
 * The model reads fixture inputs and supplies this capability policy. HTMLRewriter
 * records tags/attributes; the check uses an independent URL parser and policy,
 * never the production sanitizer. Script-count equality relates baseline and
 * hostile-setting renders without declaring either production output an answer.
 * Each old table row and every receiving checkpoint remains finite; browser
 * execution and unbounded HTML grammars are outside this structural oracle.
 */
import { differs, oracleProperty, pass, type Observation } from '@tanstack/oracles';
import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { decodeHTMLAttribute } from 'entities';
import { makeApp } from '../src/index.ts';
import { putSettings } from '../src/model.ts';
import { testRevisionBody } from './helpers.ts';
import { withOracleStorage } from './oracle-storage.ts';
const sourceId = '00000000000000000000000001';
const app = makeApp('/blyg'), base = 'https://review-content.example.test';
type Plan = { action: 'transclusion' | 'bake' | 'collection-attribution' | 'transclusion-attribution' | 'snapshot-presentation' | 'citation-write' | 'stored-citation' | 'safe-citation' | 'author-links' | 'settings-sweep' | 'delegated-sweep'; surface?: string; sourceHtml?: string; sourcePage?: string; snapshotHtml?: string; field?: string; citation?: Record<string, unknown>; versionFields?: Record<string, string | null>; itemFields?: Record<string, string | null>; authorLinks?: {label:string;url:string}[]; storedAuthorLinks?: {label:string;url:string}[]; rejectedAuthorUrls?: string[]; settings?: { keys:string[]; payloads:string[]; surfaces: string[] }; delegatedText?: { payload:string; origin:string; surfaces:string[] } };
const transclusionHtml = '<p>Safe quoted text <a href="https://safe.example/">safe link</a></p><img src="/missing" onerror="document.documentElement.dataset.compromised=1"><svg onload="document.documentElement.dataset.compromised=1"></svg>';
const safeCitation = { url: 'https://cited.example/p', cited: { source: 'Cited', url: 'https://cited.example/p', retrieved: '2026-10-01T00:00:00Z' } };
const safeAuthorLinks = [{ label: 'me', url: 'https://me.example/' }, { label: 'mail', url: 'mailto:me@example.test' }];
const histories: Plan[] = [
 ...['preview', 'publication', 'history'].map(surface => ({ action: 'transclusion' as const, surface, sourceHtml: transclusionHtml })),
 { action: 'bake', sourceHtml: '<p>Quoted <a href="https://safe.example/">link</a></p><picture><source srcset="https://publisher.example/a.webp"><img src="https://publisher.example/a.png" onerror="x()"></picture>' },
 ...['collection-attribution', 'transclusion-attribution'].map(action => ({ action: action as Plan['action'], sourceHtml: '<p>Safe quoted text</p>', sourcePage: 'post"><img src="/missing" onerror="document.documentElement.dataset.compromised=1">' })),
 ...['public', 'pin', 'history', 'history-page', 'detail', 'reading'].map(surface => ({ action: 'snapshot-presentation' as const, surface, snapshotHtml: '<blockquote class="blyg-transclusion" data-blyg-id="' + sourceId + '"><p>Legacy safe text</p><img src="/missing" onerror="document.documentElement.dataset.compromised=1"></blockquote>' })),
 { action: 'citation-write', field: 'cited.url', citation: { url: 'https://cited.example/p', cited: { source: 'Cited', url: 'javascript:document.documentElement.dataset.compromised=1', retrieved: '2026-10-01T00:00:00Z' } } },
 { action: 'citation-write', field: 'stub_of.url', citation: { url: 'javascript:document.documentElement.dataset.compromised=1' } },
 { action: 'stored-citation', field: 'stub_cite.url', versionFields: { stub_of: '{"url":"https://cited.example/p"}', stub_cite: '{"source":"S","url":"javascript:document.documentElement.dataset.compromised=1","retrieved":"2026-10-01T00:00:00Z"}' }, itemFields: {} },
 { action: 'stored-citation', field: 'stub_of.url', versionFields: { stub_of: '{"url":"javascript:document.documentElement.dataset.compromised=1"}', stub_cite: null }, itemFields: {} },
 { action: 'stored-citation', field: 'fork_cite.url', versionFields: {}, itemFields: { forked_from: '{"origin":"https://fork.example/","id":"0000000000000000000000000f","version":1}', fork_cite: '{"source":"F","url":"javascript:document.documentElement.dataset.compromised=1","retrieved":"2026-10-01T00:00:00Z"}' } },
 { action: 'safe-citation', citation: { url: 'https://cited.example/p', cited: { source: 'S', url: 'https://cited.example/p?a=1&b=2', retrieved: '2026-10-01T00:00:00Z' } } }, { action: 'author-links', authorLinks: safeAuthorLinks, storedAuthorLinks: [{ label: 'me', url: 'javascript:document.documentElement.dataset.compromised=1' }], rejectedAuthorUrls: ['javascript:document.documentElement.dataset.compromised=1', ' JaVaScRiPt:alert(1)', 'data:text/html,<script>alert(1)</script>'] }, { action: 'settings-sweep', settings: { keys: ['siteTitle', 'theme', 'authorName', 'authorBio', 'siteUrl', 'avatarMediaId', 'updateFeedUrl', 'timezone', 'aiModelTk', 'aiModelChangelog', 'aiModelFeed', 'feedPrompt', 'aiStylePrompt'], payloads: ['javascript:document.documentElement.dataset.compromised=1', '"><img src=/x onerror=document.documentElement.dataset.compromised=1>', "'><svg onload=document.documentElement.dataset.compromised=1>", '</script><script>document.documentElement.dataset.compromised=1</script>'], surfaces: ['home', 'archive', 'fragment', 'thread', 'pin', 'hopper'] } },
 { action: 'delegated-sweep', delegatedText: { payload: '"><img src=/x onerror=document.documentElement.dataset.compromised=1><a href="javascript:document.documentElement.dataset.compromised=1">x</a>', origin: 'https://sweep.example/', surfaces: ['home', 'archive', 'fragment', 'thread', 'hopper'] } },
];
// Each model part has a contract job: response roles retain receiving-path
// availability, capability sets reject active markup, fixture text/bytes retain
// positive neighbors and immutable source, and script equality catches injection.
function model(plan: Plan) {
 const completed = 'completed operation', created = 'created resource', login = 'owner login', markup = 'rendered markup';
 let checkpoints: string[];
 switch (plan.action) {
  case 'transclusion': checkpoints = [login, completed, 'preview errors', 'preview safe text', 'preview safe link']; if (plan.surface !== 'preview') checkpoints.push(created, completed, completed); if (plan.surface === 'history') checkpoints.push(completed); checkpoints.push(markup); break;
  case 'bake': checkpoints = [login, created, completed, 'verbatim transclusion bake']; break;
  case 'collection-attribution': checkpoints = [login, completed, markup, completed]; break;
  case 'transclusion-attribution': checkpoints = [login, created, completed, completed, markup]; break;
  case 'snapshot-presentation': checkpoints = [login, created, completed, completed, 'snapshot safe text', markup, completed, 'wire snapshot bytes', 'stored snapshot bytes']; break;
  case 'citation-write': checkpoints = [completed, created, 'citation write', 'citation write']; break;
  case 'stored-citation': checkpoints = [login, created, completed, ...Object.keys(plan.versionFields!).map(() => 'seeded version field'), ...Object.keys(plan.itemFields!).map(() => 'seeded item field'), ...Array.from({length: 2}, () => [completed, 'citation presentation', markup]).flat()]; break;
  case 'safe-citation': checkpoints = [login, created, completed, 'safe citation href', 'safe citation href']; break;
  case 'author-links': checkpoints = [completed, ...Array(plan.rejectedAuthorUrls!.length + 1).fill('author link write'), 'safe author href', completed, markup, completed, markup, 'manifest author links']; break;
  case 'settings-sweep': checkpoints = [completed, completed, completed, completed, ...Array(plan.settings!.surfaces.length).fill(completed), ...Array.from({length: plan.settings!.payloads.length}, () => [...Array(plan.settings!.keys.length).fill('settings admission status'), 'stored setting count', 'stored setting names', ...Array.from({length: plan.settings!.surfaces.length}, () => [markup, 'page script count']).flat()]).flat(), ...Array(plan.settings!.surfaces.length).fill(markup), completed]; break;
  case 'delegated-sweep': checkpoints = [completed, completed, completed, created, completed, created, completed, created, completed, ...Array.from({length: plan.delegatedText!.surfaces.length}, () => [completed, markup]).flat(), 'blogroll presentation']; break;
 }
 const paragraph = (html: string | undefined) => html?.match(/<p>([^<]*)/)?.[1].trim();
 return { checkpoints, statuses: { 'owner login': 302, 'created resource': 201, 'completed operation': 200 }, forbiddenTags: ['script', 'svg', 'iframe', 'math'], urlAttributes: ['href', 'src', 'xlink:href', 'action', 'formaction'], forbiddenProtocols: ['javascript:', 'data:', 'vbscript:'], citationProtocols: ['http:', 'https:'], authorProtocols: ['http:', 'https:', 'mailto:'], safeText: paragraph(plan.sourceHtml), safeLink: plan.sourceHtml?.match(/href="(https:[^"]*)"/)?.[1], snapshotText: paragraph(plan.snapshotHtml), snapshotHtml: plan.snapshotHtml, bake: plan.sourceHtml === undefined ? undefined : '>\n' + plan.sourceHtml + '\n</blockquote>', versionFields: plan.versionFields, itemFields: plan.itemFields, safeCitationHref: 'href="' + String((plan.citation?.cited as {url?:string} | undefined)?.url).replaceAll('&', '&amp;') + '"', safeAuthorHref: 'href="' + plan.authorLinks?.[0].url + '"', manifestAuthorUrls: plan.storedAuthorLinks?.filter(link => ['http:', 'https:', 'mailto:'].includes(protocol(link.url))).map(link => link.url), inventoryHost: plan.delegatedText ? new URL(plan.delegatedText.origin).host : undefined };
}
async function receive(path: string, init: RequestInit = {}) {
 const ctx = createExecutionContext();
 const response = await app.fetch(new Request(base + path, init), env, ctx);
 await waitOnExecutionContext(ctx); return response;
}
async function driver(plan: Plan, record: (checkpoint: string, value: unknown) => void) {
 // Runtime item IDs are opaque handles. Only URL identity changes here; all
 // script/event/protocol bytes remain in the observations the policy judges.
 const handles = new Map<string, string>();
 const inputStrings = new Set<string>();
 const retainInputs = (value: unknown): void => { if (typeof value === 'string') inputStrings.add(value); else if (value && typeof value === 'object') Object.values(value).forEach(retainInputs); };
 retainInputs(plan);
 const normalize = (value: unknown): unknown => {
  if (typeof value === 'string' && inputStrings.has(value)) return value;
  if (typeof value === 'string') return value.replace(/\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z/g, '<timestamp>').replace(/[0-9a-z]{26}/g, id => {
   if (id === sourceId) return id;
   if (!handles.has(id)) handles.set(id, 'item-handle-' + handles.size);
   return handles.get(id)!;
  });
  if (Array.isArray(value)) return value.map(normalize);
  if (value !== null && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, normalize(child)]));
  return value;
 };
 const observe = (checkpoint: string, value: unknown) => record(checkpoint, normalize(value));
async function setup(html: string, page = 'post') {
  await env.DB.prepare("DELETE FROM hopper_items WHERE hopper_id = 'review-hopper'").run();
  await env.DB.prepare("DELETE FROM hoppers WHERE id = 'review-hopper'").run();
  await env.DB.prepare("DELETE FROM imported_items WHERE subscription_id = 'review-native'").run();
  await env.DB.prepare("DELETE FROM subscriptions WHERE id = 'review-native'").run();
  const login = await receive('/blyg/studio/login', { method: 'POST', headers: { 'CF-Connecting-IP': 'fd00:' + crypto.randomUUID().replaceAll('-', '').match(/.{4}/g)!.slice(0,7).join(':') }, body: new URLSearchParams({ password: env.OWNER_PASSWORD }) });
  observe('owner login', login.status); const cookie = login.headers.get('set-cookie')!.split(';')[0];
  await env.DB.prepare("INSERT INTO subscriptions(id,kind,origin,feed_url,title,created) VALUES ('review-native','blyg','https://publisher.example/','https://publisher.example/feed','Publisher','2026-10-01')").run();
  await env.DB.prepare("INSERT INTO imported_items(subscription_id,remote_id,kind,state,version,observed_at,content_html,l0,page) VALUES ('review-native',?,'fragment','current',1,'2026-10-01',?,0,?)").bind(sourceId, html, page).run();
  const owner = async (path: string, method = 'GET', body?: unknown) => { body = await testRevisionBody(method, path, body); return receive(path, { method, headers: { cookie, 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }); };
  return { owner, cookie };
}
// Public pages carry their own trusted inline scripts, so script elements are
// judged only inside the article. Attributes are judged on the whole page: the
// masthead and navigation render delegated settings too. Values are decoded as
// a browser decodes them before the scheme is read.
async function inert(html: string, context: string, publicPage = false) {
  const tags: { name: string; article: boolean }[] = [], attributes: { name: string; value: string }[] = [];
  let depth = 0;
  await new HTMLRewriter().on('article', { element(el) { depth++; el.onEndTag(() => { depth--; }); } }).on('*', { element(el) {
    tags.push({ name: el.tagName, article: depth > 0 });
    for (const [name, value] of el.attributes) attributes.push({ name, value });
  } }).transform(new Response(html)).text();
  observe('rendered markup', { context, publicPage, tags, attributes });
}
switch (plan.action) {
case 'transclusion': { const surface = plan.surface!;
  const f = await setup(plan.sourceHtml!);
  const contentMd = `![[${sourceId}]]`;
  const preview = await f.owner('/blyg/api/preview', 'POST', { kind: 'thread', contentMd }); observe('completed operation', preview.status);
  const p = await preview.json() as { html: string; errors: unknown[] };
  observe('preview errors', p.errors); observe('preview safe text', p.html);
  observe('preview safe link', p.html);
  if (surface === 'preview') return inert(p.html, 'transclusion preview cannot execute imported HTML');
  const created = await f.owner('/blyg/api/items', 'POST', { kind: 'thread', contentMd }); observe('created resource', created.status);
  const { id } = await created.json() as { id: string };
  observe('completed operation', (await f.owner(`/blyg/api/items/${id}/publish`, 'POST')).status);
  const publicPage = await receive(`/blyg/t/${id}/`); observe('completed operation', publicPage.status);
  if (surface === 'publication') return inert(await publicPage.text(), 'published transclusion cannot execute imported HTML', true);
  const history = await f.owner(`/blyg/api/items/${id}/versions/1`); observe('completed operation', history.status);
  const h = await history.json() as { contentHtml: string };
  await inert(h.contentHtml, 'history cannot execute imported HTML');

return;
}
case 'bake': {
  const source = plan.sourceHtml!;
  const f = await setup(source);
  const created = await f.owner('/blyg/api/items', 'POST', { kind: 'thread', contentMd: `![[${sourceId}]]` }); observe('created resource', created.status);
  const { id } = await created.json() as { id: string };
  observe('completed operation', (await f.owner(`/blyg/api/items/${id}/publish`, 'POST')).status);
  const document = await (await receive(`/blyg/items/${id}.json`)).json() as { content_html: string };
  observe('verbatim transclusion bake', document.content_html);

return;
}
case 'collection-attribution': {
  const f = await setup(plan.sourceHtml!, plan.sourcePage);
  await env.DB.prepare("INSERT INTO hoppers(id,name,slug,public,created) VALUES ('review-hopper','Review','review',1,'2026-10-01')").run();
  await env.DB.prepare("INSERT INTO hopper_items(hopper_id,subscription_id,remote_id,added_at) VALUES ('review-hopper','review-native',?,'2026-10-01')").bind(sourceId).run();
  const response = await receive('/blyg/h/review/'); observe('completed operation', response.status);
  await inert(await response.text(), 'remote page must stay within its href attribute', true);
  observe('completed operation', (await f.owner('/blyg/api/settings')).status);

return;
}
case 'transclusion-attribution': {
  const f = await setup(plan.sourceHtml!, plan.sourcePage);
  const created = await f.owner('/blyg/api/items', 'POST', { kind: 'thread', contentMd: `![[${sourceId}]]` }); observe('created resource', created.status);
  const { id } = await created.json() as { id: string };
  observe('completed operation', (await f.owner(`/blyg/api/items/${id}/publish`, 'POST')).status);
  const response = await receive(`/blyg/t/${id}/`); observe('completed operation', response.status);
  await inert(await response.text(), 'provenance href cannot create attacker markup', true);

return;
}
case 'snapshot-presentation': { const surface = plan.surface!;
  // A fragment quoted by a thread published just after it is a burst, and a quote-only thread is wordless (session 72): both would sit in Background. This test is about something else.
  await putSettings(env.DB, { bg_rules: JSON.stringify({ burst: false, wordless: false }) });
  const f = await setup('<p>Safe quoted text</p>');
  const created = await f.owner('/blyg/api/items', 'POST', { kind: 'thread', contentMd: `![[${sourceId}]]` });
  observe('created resource', created.status); const { id } = await created.json() as { id: string };
  observe('completed operation', (await f.owner(`/blyg/api/items/${id}/publish`, 'POST')).status);
  const legacy = plan.snapshotHtml!;
  await env.DB.prepare('UPDATE versions SET content_html=?, pinned=1 WHERE item_id=? AND version=1').bind(legacy, id).run();
  const paths = { public: `/blyg/t/${id}/`, pin: `/blyg/t/${id}/v1/`, history: `/blyg/api/items/${id}/versions/1`, 'history-page': `/blyg/api/items/${id}/versions?limit=1`, detail: `/blyg/api/items/${id}`, reading: '/blyg/api/reading?sub=own' };
  const response = await f.owner(paths[surface as keyof typeof paths]); observe('completed operation', response.status);
  let html: string;
  if (surface === 'public' || surface === 'pin') html = await response.text();
  else {
    const value = await response.json() as any;
    html = surface === 'history' ? value.contentHtml : surface === 'detail' ? value.published.contentHtml : surface === 'history-page' ? value.items[0].contentHtml : value.items.find((entry: any) => entry.own?.id === id).contentHtml;
  }
  observe('snapshot safe text', html);
  await inert(html, 'legacy snapshot cannot regain script authority during presentation', surface === 'public' || surface === 'pin');
  const wire = await receive(`/blyg/items/${id}/v1.json`); observe('completed operation', wire.status);
  observe('wire snapshot bytes', (await wire.json() as {content_html:string}).content_html);
  observe('stored snapshot bytes', (await env.DB.prepare('SELECT content_html FROM versions WHERE item_id=? AND version=1').bind(id).first<{content_html:string}>())!.content_html);

return;
}
case 'citation-write': { const stubOf = plan.citation!;
  const { flow } = await import('./oauth-flow-driver.ts');
  const f = await flow();
  const minted = await f.request('/blyg/api/authorizations', { method: 'POST', headers: { cookie: f.owner, 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'citation drafter', scope: ['owner:draft'], resource: 'api' }) });
  observe('completed operation', minted.status);
  const { accessToken } = await minted.json() as { accessToken: string };
  const draft = async (path: string, method: string, body: unknown) => f.request(path, { method, headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json' }, body: JSON.stringify(await testRevisionBody(method, path, body)) });
  const created = await draft('/blyg/api/items', 'POST', { kind: 'thread', contentMd: 'A response' });
  observe('created resource', created.status);
  const { id } = await created.json() as { id: string };
  observe('citation write', { input: stubOf, status: (await draft('/blyg/api/items/' + id, 'PATCH', { stubOf })).status });
  observe('citation write', { input: safeCitation, status: (await draft('/blyg/api/items/' + id, 'PATCH', { stubOf: safeCitation })).status });

return;
}
case 'stored-citation': { const version = plan.versionFields!, item = plan.itemFields!;
  const f = await setup('<p>unused</p>');
  const created = await f.owner('/blyg/api/items', 'POST', { kind: 'thread', contentMd: 'A response' }); observe('created resource', created.status);
  const { id } = await created.json() as { id: string };
  observe('completed operation', (await f.owner(`/blyg/api/items/${id}/publish`, 'POST')).status);
  // Observe the seeded field itself: native D1 change counts also include
  // tracking writes, and null/no-op assignments deliberately do not track.
  for (const [column, value] of Object.entries(version)) observe('seeded version field', { column, row: await env.DB.prepare(`UPDATE versions SET ${column}=? WHERE item_id=? AND version=1 RETURNING ${column} AS value`).bind(value, id).first() });
  for (const [column, value] of Object.entries(item)) observe('seeded item field', { column, row: await env.DB.prepare(`UPDATE items SET ${column}=? WHERE id=? RETURNING ${column} AS value`).bind(value, id).first() });
  for (const path of [`/blyg/t/${id}/`, '/blyg/']) {
    const page = await receive(path); observe('completed operation', page.status);
    const html = await page.text();
    observe('citation presentation', html);
    await inert(html, 'stored citation cannot create an active link', true);
  }

return;
}
case 'safe-citation': {
  const f = await setup('<p>unused</p>');
  const created = await f.owner('/blyg/api/items', 'POST', { kind: 'thread', contentMd: 'A response' }); observe('created resource', created.status);
  const { id } = await created.json() as { id: string };
  observe('completed operation', (await f.owner(`/blyg/api/items/${id}/publish`, 'POST')).status);
  await env.DB.prepare('UPDATE versions SET stub_of=?, stub_cite=? WHERE item_id=?').bind(JSON.stringify({ url: plan.citation!.url }), JSON.stringify(plan.citation!.cited), id).run();
  for (const path of [`/blyg/t/${id}/`, '/blyg/']) observe('safe citation href', await (await receive(path)).text());

return;
}
case 'author-links': {
  // Sweeps write many times a minute; each starts with fresh work budgets.
  await env.DB.prepare('DELETE FROM security_budgets').run();
  const { flow } = await import('./oauth-flow-driver.ts');
  const f = await flow();
  const minted = await f.request('/blyg/api/authorizations', { method: 'POST', headers: { cookie: f.owner, 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'settings manager', scope: ['owner:manage'], resource: 'api' }) });
  observe('completed operation', minted.status);
  const { accessToken } = await minted.json() as { accessToken: string };
  const manage = (authorLinks: unknown) => f.request('/blyg/api/settings', { method: 'PATCH', headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json' }, body: JSON.stringify({ authorLinks }) });
  for (const url of plan.rejectedAuthorUrls!)
    observe('author link write', { input: [{ label: 'me', url }], status: (await manage([{ label: 'me', url }])).status });
  observe('author link write', { input: plan.authorLinks, status: (await manage(plan.authorLinks)).status });
  const kept = await (await f.request('/blyg/')).text();
  observe('safe author href', kept);
  await env.DB.prepare("UPDATE settings SET value=? WHERE key='author_links'").bind(JSON.stringify(plan.storedAuthorLinks)).run();
  for (const path of ['/blyg/', '/blyg/archive/']) {
    const page = await f.request(path); observe('completed operation', page.status);
    await inert(await page.text(), 'stored author links cannot create an active link', true);
  }
  const manifest = await (await f.request('/blyg/blyg.json')).json() as { author: { links: { url: string }[] } };
  observe('manifest author links', manifest.author.links.map(link => link.url));

return;
}
case 'settings-sweep': {
  // Sweeps write many times a minute; each starts with fresh work budgets.
  await env.DB.prepare('DELETE FROM security_budgets').run();
  const { flow } = await import('./oauth-flow-driver.ts');
  const f = await flow();
  const minted = await f.request('/blyg/api/authorizations', { method: 'POST', headers: { cookie: f.owner, 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'settings sweep', scope: ['owner:manage'], resource: 'api' }) });
  observe('completed operation', minted.status);
  const { accessToken } = await minted.json() as { accessToken: string };
  const owner = async (path: string, method: string, body?: unknown) => { body = await testRevisionBody(method, path, body); return f.request(path, { method, headers: { cookie: f.owner, 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }); };
  const fragment = await (await owner('/blyg/api/items', 'POST', { contentMd: 'Sweep fragment' })).json() as { id: string };
  const thread = await (await owner('/blyg/api/items', 'POST', { kind: 'thread', contentMd: 'Sweep thread' })).json() as { id: string };
  for (const id of [fragment.id, thread.id]) observe('completed operation', (await owner(`/blyg/api/items/${id}/publish`, 'POST')).status);
  observe('completed operation', (await owner(`/blyg/api/items/${fragment.id}/versions/1/pin`, 'PUT')).status);
  await env.DB.prepare("INSERT OR REPLACE INTO hoppers(id,name,slug,public,created) VALUES ('sweep-hopper','Sweep','sweep',1,'2026-10-01')").run();
  const paths: Record<string, string> = { home: '/blyg/', archive: '/blyg/archive/', fragment: `/blyg/f/${fragment.id}/`, thread: `/blyg/t/${thread.id}/`, pin: `/blyg/f/${fragment.id}/v1/`, hopper: '/blyg/h/sweep/' };
  const pages = plan.settings!.surfaces.map(surface => paths[surface]);
  const scripts = async (html: string) => { let n = 0; await new HTMLRewriter().on('script', { element() { n++; } }).transform(new Response(html)).text(); return n; };
  const baseline = new Map<string, number>();
  for (const path of pages) { const page = await f.request(path); observe('completed operation', page.status); baseline.set(path, await scripts(await page.text())); }
  const payloads = plan.settings!.payloads;
  const keys = plan.settings!.keys;
  for (const payload of payloads) {
    const stored: string[] = [];
    for (const key of keys) {
      const response = await f.request('/blyg/api/settings', { method: 'PATCH', headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json' }, body: JSON.stringify({ [key]: payload }) });
      observe('settings admission status', response.status);
      if (response.ok) stored.push(key);
    }
    observe('stored setting count', stored.length);
    observe('stored setting names', { payload, names: stored });
    for (const path of pages) {
      const html = await (await f.request(path)).text();
      await inert(html, 'stored settings cannot activate markup', true);
      observe('page script count', { path: pages.indexOf(path), before: baseline.get(path), after: await scripts(html) });
    }
  }
  // A pre-0.27 row holds any string; reading it must not mint active links.
  await env.DB.prepare("INSERT INTO settings(key,value) VALUES ('site_url',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(payloads[0]).run();
  for (const path of pages) await inert(await (await f.request(path)).text(), 'a stored legacy site_url cannot activate markup', true);
  observe('completed operation', (await owner('/blyg/api/settings', 'PATCH', { siteTitle: 'Restored', theme: 'auto', timezone: 'UTC', siteUrl: '', avatarMediaId: '', authorName: '', authorBio: '' })).status);

return;
}
case 'delegated-sweep': {
  // Sweeps write many times a minute; each starts with fresh work budgets.
  await env.DB.prepare('DELETE FROM security_budgets').run();
  const { flow } = await import('./oauth-flow-driver.ts');
  const f = await flow();
  const token = async (scope: string) => {
    const minted = await f.request('/blyg/api/authorizations', { method: 'POST', headers: { cookie: f.owner, 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'sweep ' + scope, scope: [scope], resource: 'api' }) });
    observe('completed operation', minted.status); return (await minted.json() as { accessToken: string }).accessToken;
  };
  const draft = await token('owner:draft'), manage = await token('owner:manage');
  const as = (bearer: string, path: string, method: string, body: unknown) => f.request(path, { method, headers: { Authorization: 'Bearer ' + bearer, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const payload = plan.delegatedText!.payload;
  await env.DB.prepare("INSERT OR REPLACE INTO subscriptions(id,kind,origin,feed_url,title,created) VALUES ('sweep-sub','blyg',?,?,'Sweep','2026-10-01')").bind(plan.delegatedText!.origin, plan.delegatedText!.origin + 'feed.xml').run();
  observe('completed operation', (await as(manage, '/blyg/api/subscriptions/sweep-sub', 'PATCH', { title: payload, inBlogroll: true })).status);
  const hopper = await as(manage, '/blyg/api/hoppers', 'POST', { name: payload }); observe('created resource', hopper.status);
  const { id: hopperId } = await hopper.json() as { id: string };
  const updated = await as(manage, '/blyg/api/hoppers/' + hopperId, 'PATCH', { public: true, description: payload.slice(0, 280) }); observe('completed operation', updated.status);
  const { slug } = await updated.json() as { slug: string };
  const ids: string[] = [];
  for (const body of [{ contentMd: payload }, { kind: 'thread', contentMd: payload, stubOf: { url: 'https://cited.example/p', cited: { source: payload, author: payload, excerpt: payload, url: 'https://cited.example/p', retrieved: '2026-10-01T00:00:00Z' } } }]) {
    const created = await as(draft, '/blyg/api/items', 'POST', body); observe('created resource', created.status);
    const { id } = await created.json() as { id: string }; ids.push(id);
    observe('completed operation', (await f.request(`/blyg/api/items/${id}/publish`, { method: 'POST', headers: { cookie: f.owner, 'Content-Type': 'application/json' }, body: JSON.stringify(await testRevisionBody('POST', `/blyg/api/items/${id}/publish`)) })).status);
  }
  const paths: Record<string, string> = { home: '/blyg/', archive: '/blyg/archive/', fragment: `/blyg/f/${ids[0]}/`, thread: `/blyg/t/${ids[1]}/`, hopper: `/blyg/h/${slug}/` };
  for (const path of plan.delegatedText!.surfaces.map(surface => paths[surface])) {
    const page = await f.request(path); observe('completed operation', page.status);
    const html = await page.text();
    await inert(html, 'delegated text cannot activate markup', true);
  }
  const home = await (await f.request('/blyg/')).text();
  observe('blogroll presentation', home);

return;
}
}

}
const protocol = (value: string) => { try { return new URL(decodeHTMLAttribute(value), base).protocol; } catch { return 'invalid:'; } };
function check(plan: Plan, trace: readonly Observation[], expected: ReturnType<typeof model>) {
 for (const entry of trace) {
  if (entry.checkpoint === 'rendering history complete') continue;
  let actual: unknown = entry.value, wanted: unknown;
  const checkpoint = entry.checkpoint;
  let difference = 'the observed value differs from the owed value';
  if (checkpoint in expected.statuses) wanted = expected.statuses[checkpoint as keyof typeof expected.statuses];
  else switch (checkpoint) {
   case 'rendered markup': {
    const markup = entry.value as { context: string; publicPage: boolean; tags: {name:string;article:boolean}[]; attributes:{name:string;value:string}[] };
    actual = [...markup.tags.filter(tag => (!markup.publicPage || tag.article) && expected.forbiddenTags.includes(tag.name)).map(tag => tag.name), ...markup.attributes.filter(attribute => /^on/i.test(attribute.name) || expected.urlAttributes.includes(attribute.name) && expected.forbiddenProtocols.includes(protocol(attribute.value))).map(attribute => attribute.name + '=' + attribute.value)]; wanted = []; difference = markup.context; break;
   }
   case 'preview errors': wanted = []; break;
   case 'manifest author links': wanted = expected.manifestAuthorUrls; difference = 'the manifest does not publish an active-scheme author link'; break;
   case 'preview safe text': actual = typeof actual === 'string' && actual.includes(expected.safeText!); wanted = true; break;
   case 'preview safe link': actual = typeof actual === 'string' && actual.includes('href="' + expected.safeLink + '"'); wanted = true; break;
   case 'verbatim transclusion bake': actual = typeof actual === 'string' && actual.includes(expected.bake!); wanted = true; break;
   case 'snapshot safe text': actual = typeof actual === 'string' && actual.includes(expected.snapshotText!); wanted = true; break;
   case 'wire snapshot bytes': case 'stored snapshot bytes': wanted = expected.snapshotHtml; break;
   case 'seeded version field': { const input = entry.value as {column:string;row:unknown}; actual = input.row; wanted = { value: expected.versionFields?.[input.column] }; break; }
   case 'seeded item field': { const input = entry.value as {column:string;row:unknown}; actual = input.row; wanted = { value: expected.itemFields?.[input.column] }; break; }
   case 'citation presentation': actual = typeof actual === 'string' && /stub-cite/.test(actual); wanted = true; break;
   case 'safe citation href': actual = typeof actual === 'string' && actual.includes(expected.safeCitationHref); wanted = true; break;
   case 'safe author href': actual = typeof actual === 'string' && actual.includes(expected.safeAuthorHref); wanted = true; break;
   case 'citation write': { const result = entry.value as { input: {url:string;cited?:{url?:string}};status:number }; actual = result.status; wanted = [result.input.url, result.input.cited?.url].filter((url): url is string => url !== undefined).every(url => expected.citationProtocols.includes(protocol(url))) ? 200 : 400; difference = wanted === 400 ? 'active-scheme citations are refused at write' : 'an http(s) citation stays writable'; break; }
   case 'author link write': { const result = entry.value as { input: {url:string}[];status:number }; actual = result.status; wanted = result.input.every(link => expected.authorProtocols.includes(protocol(link.url))) ? 200 : 400; difference = wanted === 400 ? 'active-scheme author links are refused at write' : 'followable author links stay writable'; break; }
   case 'settings admission status': actual = typeof actual === 'number' && actual < 500; wanted = true; break;
   case 'stored setting count': actual = typeof actual === 'number' && actual > 0; wanted = true; break;
   case 'stored setting names': { const result = entry.value as {payload:string;names:string[]}; actual = result.names.includes('siteUrl'); wanted = URL.canParse(result.payload) && expected.citationProtocols.includes(new URL(result.payload).protocol); difference = 'siteUrl accepts only an absolute http(s) URL'; break; }
   case 'page script count': { const result = entry.value as {before:number;after:number}; actual = result.after; wanted = result.before; break; }
   case 'blogroll presentation': actual = typeof actual === 'string' && actual.includes(expected.inventoryHost!); wanted = true; break;
   default: return differs(checkpoint, 'inert content and preserved source', checkpoint, 'known receiving checkpoint')!;
  }
  // Keep the received boundary as the checkpoint: cleanup can fail after this
  // observation, and the framework must retain its semantic violation.
  const mismatch = differs(checkpoint, 'inert content and preserved source', actual, wanted, difference);
  if (mismatch) return mismatch;
 }
 return trace.some(entry => entry.checkpoint === 'rendering history complete') ? differs('complete rendering history', 'inert content and preserved source', trace.map(entry => entry.checkpoint), [...expected.checkpoints, 'rendering history complete']) ?? pass : pass;
}
const labels = {
 "transclusion": "keeps remote HTML inert in transclusion %s",
 "bake": "bakes remote HTML verbatim into the published thread document",
 "collection-attribution": "remote attribution cannot inject elements into a public hopper",
 "transclusion-attribution": "remote attribution cannot inject elements into public transclusion provenance",
 "snapshot-presentation": "renders legacy bakes inert in %s without changing their snapshot",
 "citation-write": "a delegated %s with an active scheme is refused",
 "stored-citation": "a stored %s cannot become an active link on public pages",
 "safe-citation": "a stored https citation stays a working link",
 "author-links": "author links refuse active schemes on write and render inert from stored rows",
 "settings-sweep": "no manage-writable setting can activate markup on any public page",
 "delegated-sweep": "no delegated item, collection or blogroll text can activate markup on public pages"
};
oracleProperty({
 id: 'review-content-security',
 owns: ['src/owner-api.ts#createOwnerApi', 'src/pages.ts', 'src/importer/pages.ts#publicHopperPage'],
 law: { statement: 'For every stored-input and delegated-text history, preview and public/history presentation keep markup inert while preserving safe links/text and immutable protocol snapshots; active citation/author URLs are refused at write.', authority: 'Existing R01/R02 receiving contract; protocol §§5.2/10.2; OWASP XSS Prevention https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html', limits: 'Original finite source, settings and page-inventory histories; structural parsing complements the separate real-browser witnesses and does not prove unbounded HTML grammar or deployed CSP behavior.' },
 histories,
 label: plan => labels[plan.action].replace('%s', plan.surface ?? plan.field ?? ''),
 model,
 driver: async (plan, observe) => { await withOracleStorage(() => driver(plan, observe)); observe('rendering history complete', true); },
 check,
 calibrations: [{ name: 'rendered event attribute', law: 'inert content and preserved source', history: { enumerated: 0 }, corrupt: trace => trace.map(entry => entry.checkpoint === 'rendered markup' ? { ...entry, value: { ...(entry.value as object), attributes: [{ name: 'onerror', value: 'attack()' }] } } : entry) }],
});
