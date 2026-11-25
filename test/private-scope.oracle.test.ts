/**
 * This oracle owns what a token without `owner:private` can learn about the
 * owner's notebook: private items, private-tainted working copies, and the
 * private-taint mark itself. Its laws are blygger-spec
 * docs/sealed-content-build-plan.md §1 0f, written as "For every" sentences
 * after studio#178's independent review (session 85).
 *
 * ```ts
 * GET /api/items/P             // restricted → exactly the answer for an unknown id
 * PATCH /api/items/TD {…}      // restricted → the unknown id's answer; TD unchanged
 * GET /api/items/TP            // restricted → 200, its latest public version, no derived words
 * GET /api/search?q=…&include=drafts // restricted → no hidden item, no hidden working copy
 * PATCH /api/items/TD { provenance: [] } then publish public // → still refused
 * POST /api/items/TDn/publish { visibility: "public" } // → one refusal, whatever became of the source
 * ```
 *
 * Terms (plan §1 0f). A caller *sees private* when it is the owner's browser
 * session or a token holding `owner:private`; every other token is
 * *restricted*. A working copy is *tainted* when TK output in it drew on a
 * private snapshot. A *hidden item* is a private item, or a draft whose working
 * copy is tainted; a *hidden working copy* is the tainted working copy of a
 * public item.
 *
 * Law 1, private scope. For every restricted caller, every hidden item and
 * every operation that names an own item (by `/items/{id}`, by
 * `{sub}/{remoteId}` with sub `~own`, or in a batch), the answer equals the
 * answer for an id that does not exist, ids aside, and no write takes effect.
 *
 * Law 2, no leak. For every response to a restricted caller, no hidden item's
 * id or text appears, no hidden working copy's text appears, and no list or
 * count includes a hidden item. A public item with a hidden working copy stays
 * visible as its latest public version (Q2, Venkat Rao, 2026-11-24).
 *
 * Law 4, taint is the server's. For every working copy, no client body, hand
 * edit of the TK markers, raise or discard of the source, or regeneration from
 * public sources clears the mark; discarding the working copy removes it.
 * Client-supplied provenance never decides an answer, so a provenance naming a
 * private item and one naming an unknown id are answered alike (Q1, Venkat
 * Rao, 2026-11-24).
 *
 * Law 5, publish block. For every tainted working copy, a public publish is
 * refused with one answer whatever became of the source; a tainted draft may
 * still be published privately.
 *
 * The model reads only the plan: which fixture item each observation is about
 * and which law governs it. The driver seeds one blyg through production
 * paths: the owner cookie for items and hoppers, and TK generation with a
 * fixture provider for the taint, since only the server may write it. Every
 * restricted call goes through createOwnerApi with an explicit scope list, as
 * a delegated token is admitted. Ids are normalized to `<id>` before two
 * answers are compared; nothing else is.
 *
 * Limits: one owner, one hopper. Revisions, ETags, `dirty` and cursor expiry
 * may change when a hidden thing changes (the stated limit, Q3), so they are
 * not compared across items. A restricted write to a public item's hidden
 * working copy is not judged. Media is the media-visibility oracle's; MCP's
 * transport of the same operations is the MCP oracle's. Shelf, Agentic
 * editions and catch-up are listed in the plan's 0e and not walked here yet.
 */
import { differs, oracleProperty, pass, type Observation } from '@tanstack/oracles';
import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { Hono } from 'hono';
import type { ProviderFetchLike } from '../src/ai/provider.ts';
import { getItem, putSettings } from '../src/model.ts';
import { createOwnerApi } from '../src/owner-api.ts';
import { routes } from '../src/contract/routes.ts';
import { runGenerateScope } from '../src/tk-generate.ts';
import { BASE, apiJson, getPublic, login } from './helpers.ts';
import { SELF } from 'cloudflare:test';
import { withOracleStorage } from './oracle-storage.ts';

const RESTRICTED = ['owner:read', 'owner:draft', 'owner:publish', 'owner:manage', 'reading:state'];
const UNKNOWN = 'zzzzzzzzzzzzzzzzzzzzzzzzzz';
// Words that exist only in private text (SOURCE) or text derived from it (DERIVED).
const SOURCE = 'sourcemarkwords', DERIVED = 'derivedmarkwords';

// Every operation that names one own item, and how. This list is the
// oracle's own; the inventory history fails when the contract gains an
// item-addressed route that is not here.
type Call = { method: string; path: (id: string, hopper: string) => string; body?: (revision: number) => unknown };
const rev = (extra: object = {}) => (revision: number) => ({ ...extra, expectedRevision: revision });
const ITEM_OPERATIONS: Record<string, Call> = {
  getItem: { method: 'GET', path: id => `/items/${id}` },
  listItemVersions: { method: 'GET', path: id => `/items/${id}/versions` },
  listPrivateVersions: { method: 'GET', path: id => `/items/${id}/private-versions` },
  getVersion: { method: 'GET', path: id => `/items/${id}/versions/1` },
  getItemFreshness: { method: 'GET', path: id => `/items/${id}/freshness` },
  getSyndication: { method: 'GET', path: id => `/items/${id}/syndication` },
  updateItem: { method: 'PATCH', path: id => `/items/${id}`, body: rev({ contentMd: 'overwritten by a restricted token' }) },
  publishItem: { method: 'POST', path: id => `/items/${id}/publish`, body: rev() },
  classifyChange: { method: 'POST', path: id => `/items/${id}/classify`, body: rev() },
  draftNote: { method: 'POST', path: id => `/items/${id}/note-draft`, body: rev() },
  generateItem: { method: 'POST', path: id => `/items/${id}/generate`, body: rev({ scope: 0 }) },
  withdrawItem: { method: 'POST', path: id => `/items/${id}/withdraw`, body: rev() },
  pinItem: { method: 'PUT', path: id => `/items/${id}/versions/1/pin`, body: rev() },
  putSyndication: { method: 'PUT', path: id => `/items/${id}/syndication`, body: rev() },
  restoreItem: { method: 'POST', path: id => `/items/${id}/restore`, body: rev({ version: 1 }) },
  deleteItem: { method: 'DELETE', path: id => `/items/${id}`, body: rev() },
  refreshItem: { method: 'POST', path: id => `/items/${id}/refresh`, body: rev() },
  addHopperItem: { method: 'PUT', path: (id, hopper) => `/hoppers/${hopper}/items/~own/${id}` },
  removeHopperItem: { method: 'DELETE', path: (id, hopper) => `/hoppers/${hopper}/items/~own/${id}` },
  setSignal: { method: 'PUT', path: id => `/signals/~own/${id}`, body: () => ({ thumb: 1 }) },
  deleteSignal: { method: 'DELETE', path: id => `/signals/~own/${id}` },
  markRead: { method: 'PUT', path: id => `/reading/~own/${id}/read` },
  markUnread: { method: 'DELETE', path: id => `/reading/~own/${id}/read` },
  getImportedItem: { method: 'GET', path: id => `/imports/~own/${id}` },
  getImportedHistory: { method: 'GET', path: id => `/imports/~own/${id}/history` },
  getImportedVersion: { method: 'GET', path: id => `/imports/~own/${id}/versions/1` },
};
// Item-addressed by path: /items/{id}…, {sub}/{remoteId}, /imports/{sub}/{id}.
const addressesItem = (path: string) => path.startsWith('/items/{id}') || path.includes('{sub}/{remoteId}') || path.startsWith('/imports/{sub}/{id}');

type Resource = 'P' | 'TD' | 'TP' | 'X' | 'D';
type Fixture = Record<Resource, string> & { hopper: string; cookie: string };
type Clear = 'provenance patch' | 'unwrap markers' | 'raise source' | 'discard source' | 'regenerate from public' | 'discard changes';
type History =
  | { kind: 'inventory' }
  | { kind: 'hidden'; resource: 'P' | 'TD' }
  | { kind: 'references'; resource: 'P' | 'TD' }
  | { kind: 'mcp'; resource: 'P' | 'TD' }
  | { kind: 'working copy' }
  | { kind: 'lists' }
  | { kind: 'owner lists'; caller: 'session' | 'token' }
  | { kind: 'clear'; action: Clear; target: 'TD' | 'TP' }
  | { kind: 'forge' }
  | { kind: 'refusal' }
  | { kind: 'cursor'; event: CursorEvent };
// Law 7's cursor half: what happens between a restricted caller's first and second page of hopper members.
type CursorEvent = 'unrelated draft edit' | 'unrelated public edit' | 'member made private' | 'member tainted' | 'hidden member raised';

/** The owner API as a token holding exactly `scope` sees it. */
function tokenApi(scope: string[]) {
  const app = new Hono().route('/api', createOwnerApi({ scope, clientId: 'private-scope-oracle', userId: 'owner' }));
  return async (method: string, path: string, body?: unknown) => {
    const ctx = createExecutionContext();
    const response = await app.fetch(new Request(`https://example.com/api${path}`, {
      method, ...(body === undefined ? {} : body instanceof FormData ? { body } : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    }), { ...env, API_READ_LIMIT: '10000', API_WRITE_LIMIT: '10000', API_DELEGATED_READ_LIMIT: '10000', API_DELEGATED_WRITE_LIMIT: '10000' }, ctx);
    await waitOnExecutionContext(ctx);
    const text = await response.text();
    return { status: response.status, text, json: (() => { try { return JSON.parse(text); } catch { return null; } })() };
  };
}
const restricted = tokenApi(RESTRICTED), withPrivate = tokenApi([...RESTRICTED, 'owner:private']);

function provider(text: string): ProviderFetchLike {
  return async () => ({ ok: true, status: 200, text: async () => JSON.stringify({ model: 'claude-opus-5', stop_reason: 'end_turn', content: [{ type: 'text', text }] }) });
}
async function generate(id: string, scope = 0, text = `${DERIVED} from the notebook`) {
  const result = await runGenerateScope({ ...env, AI_PROVIDER_KEY: 'k' }, (await getItem(env.DB, id))!, scope, provider(text), undefined, { privateSources: true });
  if (!result.ok) throw new Error(`private-scope fixture could not generate into ${id}: ${JSON.stringify(result.body)}`);
}

// The blyg every history starts from: P private; TD a draft tainted by P; TP
// public, its pending changes tainted by P; X public and clean; D a clean
// draft; one hopper holding all five, added by the owner.
async function seed(): Promise<Fixture> {
  await putSettings(env.DB, { ai_model: 'claude-opus-5' });
  const cookie = await login();
  const api = (method: string, path: string, body?: unknown) => apiJson(cookie, method, '/blyg/api' + path, body);
  const create = async (contentMd: string) => {
    const created = await api('POST', '/items', { contentMd, kind: 'fragment' });
    if (created.status !== 201) throw new Error('private-scope fixture could not create an item: ' + created.status);
    return created.json.id as string;
  };
  const publish = async (id: string, visibility: 'public' | 'private') => {
    const response = await api('POST', `/items/${id}/publish`, { visibility });
    if (response.status !== 200) throw new Error(`private-scope fixture could not publish ${id} ${visibility}: ${response.status} ${JSON.stringify(response.json)}`);
  };
  const P = await create(`${SOURCE} kept in the notebook`); await publish(P, 'private');
  const TD = await create(`draft words [TK]summarize ![[${P}]][/TK]`); await generate(TD);
  const TP = await create('tp public words'); await publish(TP, 'public');
  if ((await api('PATCH', `/items/${TP}`, { contentMd: `tp public words\n\n[TK]summarize ![[${P}]][/TK]` })).status !== 200) throw new Error('private-scope fixture could not edit TP');
  await generate(TP);
  const X = await create('x public words'); await publish(X, 'public');
  const D = await create('d plain words');
  const hopper = (await api('POST', '/hoppers', { name: 'Private scope oracle' })).json.id as string;
  for (const id of [P, TD, TP, X, D]) {
    const added = await api('PUT', `/hoppers/${hopper}/items/~own/${id}`);
    if (added.status !== 200) throw new Error(`private-scope fixture could not add ${id} to its hopper: ${added.status}`);
  }
  return { P, TD, TP, X, D, hopper, cookie };
}

async function bothLenses(ask: (method: string, path: string) => Promise<{ status: number; text: string; json: any }>, path: string) {
  const front = await ask('GET', path), back = await ask('GET', path + '&background=true');
  return { status: Math.max(front.status, back.status), text: front.text + back.text, json: [front.json, back.json] };
}
const normalize = (text: string, ids: string[]) => ids.reduce((out, id) => out.replaceAll(id, '<id>'), text);
const leaks = (text: string, fixture: Fixture) => [SOURCE, DERIVED, fixture.P, fixture.TD].filter(mark => text.includes(mark));
async function revision(fixture: Fixture, id: string) {
  return ((await apiJson(fixture.cookie, 'GET', `/blyg/api/items/${id}`)).json?.revision ?? 1) as number;
}
async function ownerState(fixture: Fixture, id: string) {
  const item = await getItem(env.DB, id);
  const members = await env.DB.prepare("SELECT COUNT(*) AS n FROM hopper_items WHERE hopper_id = ? AND subscription_id = '~own' AND remote_id = ?").bind(fixture.hopper, id).first<{ n: number }>();
  const media = await env.DB.prepare('SELECT COUNT(*) AS n FROM media WHERE item_id = ?').bind(id).first<{ n: number }>();
  return item && { status: item.status, version: item.version, contentMd: item.content_md, provenance: item.tk_provenance_json, member: members?.n ?? 0, media: media?.n ?? 0 };
}
const label = (resource: Resource, fixture: Fixture) => fixture[resource];
// The fixture items a list returns as results: ids in `id`, `remoteId` or a reader `key`, not ids quoted inside text.
function resultIds(value: unknown, into = new Set<string>()): Set<string> {
  if (Array.isArray(value)) value.forEach(entry => resultIds(entry, into));
  else if (value && typeof value === 'object') for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === 'string' && (key === 'id' || key === 'remoteId')) into.add(entry);
    else if (typeof entry === 'string' && key === 'key') into.add(entry.replace(/^own:/, ''));
    else resultIds(entry, into);
  }
  return into;
}
const named = (json: unknown, fixture: Fixture) => { const ids = resultIds(json); return (['P', 'TD', 'TP', 'X', 'D'] as const).filter(resource => ids.has(label(resource, fixture))).sort(); };

async function drive(history: History, observe: (checkpoint: string, value: unknown) => void) {
  if (history.kind === 'inventory') {
    observe('item operation inventory', Object.entries(routes).filter(([, route]) => addressesItem(route.path)).map(([name]) => name).filter(name => !(name in ITEM_OPERATIONS)).sort());
    return;
  }
  const fixture = await seed();
  const api = (method: string, path: string, body?: unknown) => apiJson(fixture.cookie, method, '/blyg/api' + path, body);
  switch (history.kind) {
    case 'hidden': {
      const id = fixture[history.resource];
      // A medium the owner attached to the hidden item, before anything is asked.
      const upload = (itemId: string, expectedRevision: number, auth: Record<string, string>) => {
        const form = new FormData(); form.set('file', new File(['hidden item bytes'], 'kept.png', { type: 'image/png' }));
        form.set('itemId', itemId); form.set('expectedRevision', String(expectedRevision));
        return { form, send: () => SELF.fetch(`${BASE}/blyg/api/media`, { method: 'POST', headers: auth, body: form }) };
      };
      const attached = await (await upload(id, await revision(fixture, id), { cookie: fixture.cookie }).send()).json() as { id: string; url: string };
      const before = await ownerState(fixture, id), number = await revision(fixture, id);
      for (const [operation, call] of Object.entries(ITEM_OPERATIONS)) {
        const ask = (target: string) => restricted(call.method, call.path(target, fixture.hopper), call.body?.(number));
        const hidden = await ask(id), unknown = await ask(UNKNOWN);
        observe('private scope', { operation, same: hidden.status === unknown.status && hidden.status < 500 && normalize(hidden.text, [id]) === normalize(unknown.text, [UNKNOWN]), hidden: hidden.status, unknown: unknown.status, body: normalize(hidden.text, [id]).slice(0, 160), unknownBody: normalize(unknown.text, [UNKNOWN]).slice(0, 160) });
      }
      // Operations that name the item in a body: an upload attached to it, the removal of its medium.
      const askUpload = (target: string) => restricted('POST', '/media', upload(target, number, {}).form);
      for (const [operation, ask] of [
        ['uploadMedia itemId', askUpload],
        ['deleteMedia', (target: string) => restricted('DELETE', `/media/${target === id ? attached.id : 'zzzzzzzz'}`, { expectedRevision: number })],
      ] as const) {
        const hidden = await ask(id), unknown = await ask(UNKNOWN);
        observe('private scope', { operation, same: hidden.status === unknown.status && hidden.status < 500 && normalize(hidden.text, [id, attached.id]) === normalize(unknown.text, [UNKNOWN, 'zzzzzzzz']), hidden: hidden.status, unknown: unknown.status, body: normalize(hidden.text, [id, attached.id]).slice(0, 160), unknownBody: normalize(unknown.text, [UNKNOWN, 'zzzzzzzz']).slice(0, 160) });
      }
      // Its bytes, fetched with a restricted bearer token, answer as a medium that does not exist.
      const minted = (await apiJson(fixture.cookie, 'POST', '/blyg/api/authorizations', { name: 'private scope oracle', scope: RESTRICTED, resource: 'api' })).json as { accessToken: string };
      const fetchMedia = (path: string) => SELF.fetch(`${BASE}${path}`, { headers: { Authorization: 'Bearer ' + minted.accessToken } });
      const path = new URL(attached.url).pathname;
      const bytes = await fetchMedia(path), missing = await fetchMedia(path.replace(/[^/]+$/, 'zzzzzzzz.png'));
      observe('private scope', { operation: 'media bytes', same: bytes.status === missing.status && bytes.status < 500, hidden: bytes.status, unknown: missing.status });
      // Batched reads go through the same law.
      const batch = await restricted('POST', '/read-batch', { operation: 'getItem', requests: [{ path: { id } }, { path: { id: UNKNOWN } }] });
      const children = (batch.json ?? []) as { status: number; body: unknown }[];
      observe('private scope', { operation: 'batchRead getItem', same: batch.status === 200 && children.length === 2 && children[0].status === children[1].status && normalize(JSON.stringify(children[0].body), [id]) === normalize(JSON.stringify(children[1].body), [UNKNOWN]), hidden: children[0]?.status, unknown: children[1]?.status, body: JSON.stringify(children[0]?.body ?? batch.text).slice(0, 160) });
      const after = await ownerState(fixture, id);
      observe('no write took effect', JSON.stringify(after) === JSON.stringify(before));
      return;
    }
    case 'mcp': {
      // The same law over MCP, in Notebook mode: a publish that names no visibility then
      // follows the private default, the case mcp.ts challenges before dispatch.
      const id = fixture[history.resource];
      await api('PATCH', '/settings', { defaultVisibility: 'private' });
      const minted = (await apiJson(fixture.cookie, 'POST', '/blyg/api/authorizations', { name: 'private scope MCP', scope: RESTRICTED, resource: 'mcp' })).json as { accessToken: string };
      const call = async (name: string, args: Record<string, unknown>) => {
        const response = await SELF.fetch(`${BASE}/blyg/studio/mcp`, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', Authorization: 'Bearer ' + minted.accessToken, 'mcp-protocol-version': '2026-07-28', 'mcp-method': 'tools/call', 'mcp-name': name },
          body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args, _meta: { 'io.modelcontextprotocol/protocolVersion': '2026-07-28', 'io.modelcontextprotocol/clientCapabilities': {} } } }) });
        return { status: response.status, text: await response.text(), challenge: response.headers.get('www-authenticate') ?? '' };
      };
      const number = await revision(fixture, id);
      for (const [operation, route] of Object.entries(routes).filter(([, route]) => route.path.startsWith('/items/{id}'))) {
        const args = (target: string) => ({ path: { id: target, v: 1, version: 1 }, ...(route.method === 'get' ? {} : { body: { expectedRevision: number, ...(operation === 'generateItem' ? { scope: 0 } : {}), ...(operation === 'restoreItem' ? { version: 1 } : {}) } }) });
        const hidden = await call(operation, args(id)), unknown = await call(operation, args(UNKNOWN));
        const same = hidden.status === unknown.status && hidden.status < 500 && hidden.challenge === unknown.challenge && normalize(hidden.text, [id]) === normalize(unknown.text, [UNKNOWN]);
        observe('private scope', { operation: `MCP ${operation}`, same, hidden: hidden.status, unknown: unknown.status, body: normalize(hidden.text, [id]).slice(0, 160), unknownBody: normalize(unknown.text, [UNKNOWN]).slice(0, 160) });
      }
      return;
    }
    case 'references': {
      const id = fixture[history.resource];
      const forms: Record<string, (target: string) => Promise<{ status: number; text: string }>> = {
        'preview link': target => restricted('POST', '/preview', { contentMd: `See [[${target}]].` }),
        'preview quote': target => restricted('POST', '/preview', { contentMd: `![[${target}]]`, kind: 'thread' }),
        'preview TK source': target => restricted('POST', '/preview', { contentMd: `[TK]summarize ![[${target}]][/TK]` }),
        'publish link': async target => {
          const created = await restricted('POST', '/items', { contentMd: `See [[${target}]].`, kind: 'thread' });
          const made = created.json?.id as string;
          const published = await restricted('POST', `/items/${made}/publish`, { visibility: 'public', expectedRevision: created.json?.revision });
          return { status: published.status, text: normalize(published.text, [made]) };
        },
        'publish quote': async target => {
          const created = await restricted('POST', '/items', { contentMd: `![[${target}]]`, kind: 'thread' });
          const made = created.json?.id as string;
          const published = await restricted('POST', `/items/${made}/publish`, { visibility: 'public', expectedRevision: created.json?.revision });
          return { status: published.status, text: normalize(published.text, [made]) };
        },
        // The generate route's own scope wiring (V6): a hidden source is unknown before any provider call.
        'generate TK source': async target => {
          const created = await restricted('POST', '/items', { contentMd: `[TK]summarize ![[${target}]][/TK]`, kind: 'fragment' });
          const made = created.json?.id as string;
          const generated = await restricted('POST', `/items/${made}/generate`, { scope: 0, expectedRevision: created.json?.revision });
          return { status: generated.status, text: normalize(generated.text, [made]) };
        },
      };
      for (const [form, send] of Object.entries(forms)) {
        const hidden = await send(id), unknown = await send(UNKNOWN);
        observe('private scope', { operation: form, same: hidden.status === unknown.status && hidden.status < 500 && normalize(hidden.text, [id]) === normalize(unknown.text, [UNKNOWN]), hidden: hidden.status, unknown: unknown.status, body: normalize(hidden.text, [id]).slice(0, 200), unknownBody: normalize(unknown.text, [UNKNOWN]).slice(0, 200) });
      }
      return;
    }
    case 'working copy': {
      const published = (await apiJson(fixture.cookie, 'GET', `/blyg/api/items/${fixture.TP}/versions/1`)).json?.contentMd as string;
      const item = await restricted('GET', `/items/${fixture.TP}`);
      observe('hidden working copy', { operation: 'getItem', status: item.status, contentMd: item.json?.contentMd === published, leaks: leaks(item.text, fixture) });
      // Q2: the item itself is visible, so a reference to it resolves for a restricted caller.
      const linked = await restricted('POST', '/preview', { contentMd: `See [[${fixture.TP}]].` });
      observe('hidden working copy', { operation: 'preview link', status: linked.status, resolved: Array.isArray(linked.json?.linkErrors) && linked.json.linkErrors.length === 0, leaks: leaks(linked.text, fixture) });
      for (const operation of ['listItemVersions', 'getVersion', 'getItemFreshness', 'getSyndication', 'getImportedItem', 'getImportedHistory'] as const) {
        const response = await restricted(ITEM_OPERATIONS[operation].method, ITEM_OPERATIONS[operation].path(fixture.TP, fixture.hopper));
        observe('hidden working copy', { operation, status: response.status < 500 ? 'answered' : response.status, leaks: leaks(response.text, fixture) });
      }
      return;
    }
    case 'lists':
    case 'owner lists': {
      // A caller who sees private is the owner's session or a token holding owner:private.
      const ask = history.kind === 'lists' ? restricted : history.caller === 'token' ? withPrivate
        : async (method: string, path: string, body?: unknown) => { const r = await api(method, path, body); return { status: r.status, text: JSON.stringify(r.json), json: r.json }; };
      const lists: Record<string, string> = {
        'items': '/items?limit=100', 'items status=draft': '/items?status=draft&limit=100', 'items status=private': '/items?status=private&limit=100',
        'search words with drafts': '/search?q=words&include=drafts&limit=50', 'search derived with drafts': `/search?q=${DERIVED}&include=drafts&limit=50`,
        'search source with drafts': `/search?q=${SOURCE}&include=drafts&limit=50`, 'search words': '/search?q=words&limit=50',
        'reading own': '/reading?sub=own&limit=50', 'hopper members': `/hoppers/${fixture.hopper}/memberships?limit=50`,
        'hopper lens': `/reading?hopper=${fixture.hopper}&limit=50`,
      };
      for (const [list, path] of Object.entries(lists).filter(([list]) => list in (history.kind === 'lists' ? VISIBLE_TO_RESTRICTED : VISIBLE_TO_OWNER))) {
        // The reader's own items, both lenses: Background placement settles after publish (settleOwnBackground).
        const response = list === 'reading own' || list === 'hopper lens' ? await bothLenses(ask, path) : await ask('GET', path);
        observe('list', { list, status: response.status, named: named(response.json, fixture), leaks: history.kind === 'lists' ? leaks(response.text, fixture) : [] });
      }
      // Law 7 (V9): the hopper lens marks its draft members.
      const lenses = (await bothLenses(ask, `/reading?hopper=${fixture.hopper}&limit=50`)).json as ({ items?: { own?: { id: string; draft?: boolean } }[] } | null)[];
      const entries = lenses.flatMap(lens => lens?.items ?? []);
      observe('list', { list: 'hopper lens drafts', marked: (['P', 'TD', 'TP', 'X', 'D'] as const).filter(resource => entries.some(entry => entry.own?.id === fixture[resource] && entry.own.draft === true)).sort() });
      // Counts are law 2's: a restricted caller counts no hidden item. The owner's counts are not a law here.
      if (history.kind === 'lists') {
        const summary = (await ask('GET', '/items/summary')).json as { all: number; drafts: number; public: number } | null;
        observe('list', { list: 'summary', counts: summary && { all: summary.all, drafts: summary.drafts, public: summary.public } });
      }
      return;
    }
    case 'clear': {
      const target = fixture[history.target];
      const item = (await getItem(env.DB, target))!;
      let done: number;
      switch (history.action) {
        case 'provenance patch': done = (await api('PATCH', `/items/${target}`, { provenance: [{ sources: [], model: 'claude-opus-5', at: '2026-11-24T00:00:00Z' }] })).status; break;
        case 'unwrap markers': done = (await api('PATCH', `/items/${target}`, { contentMd: item.content_md.replace(/\[TK\][\s\S]*?\[=\]([\s\S]*?)\[\/TK\]/, '$1') })).status; break;
        case 'raise source': done = (await api('POST', `/items/${fixture.P}/publish`, { visibility: 'public' })).status; break;
        case 'discard source': done = (await api('DELETE', `/items/${fixture.P}`)).status; break;
        case 'regenerate from public':
          done = (await api('PATCH', `/items/${target}`, { contentMd: item.content_md.replace(fixture.P, fixture.X) })).status;
          await generate(target, 0, 'words from the public source');
          break;
        case 'discard changes': done = (await api('POST', `/items/${target}/restore`, { version: 1 })).status; break;
      }
      observe('clear action', done < 300);
      if (history.action === 'discard changes') {
        // The working copy is gone with its mark: an edit publishes publicly and nothing is hidden.
        await api('PATCH', `/items/${target}`, { contentMd: 'tp public words, edited after the discard' });
        const seen = await restricted('GET', `/items/${target}`);
        observe('taint', { publish: (await api('POST', `/items/${target}/publish`, { visibility: 'public' })).status, workingCopyShown: seen.json?.contentMd === 'tp public words, edited after the discard' });
        return;
      }
      const publish = await api('POST', `/items/${target}/publish`, { visibility: 'public' });
      const afterVersion = (await getItem(env.DB, target))!.version;
      const seen = await restricted('GET', `/items/${target}`), unknown = await restricted('GET', `/items/${UNKNOWN}`);
      observe('taint', {
        publishRefused: publish.status >= 400 && afterVersion === item.version,
        hidden: history.target === 'TD' ? seen.status === unknown.status && normalize(seen.text, [target]) === normalize(unknown.text, [UNKNOWN]) : seen.status === 200 && leaks(seen.text, fixture).filter(mark => mark !== fixture.P).length === 0,
      });
      return;
    }
    case 'forge': {
      // A restricted client offers provenance naming the private item, then the unknown id.
      const at = '2026-11-24T00:00:00Z';
      const attempt = async (source: string) => {
        const made: string[] = [];
        const created = await restricted('POST', '/items', { contentMd: '[TK]x[=]forged words[/TK]', kind: 'fragment', provenance: [{ sources: [{ id: source, version: 1 }], model: 'm', at }] });
        if (created.json?.id) made.push(created.json.id);
        const plain = await restricted('POST', '/items', { contentMd: '[TK]y[=]patched words[/TK]', kind: 'fragment' });
        made.push(plain.json.id);
        const patched = await restricted('PATCH', `/items/${plain.json.id}`, { provenance: [{ sources: [{ id: source, version: 1 }], model: 'm', at }], expectedRevision: plain.json.revision });
        const revisionNow = patched.json?.revision ?? plain.json.revision;
        const published = await restricted('POST', `/items/${plain.json.id}/publish`, { visibility: 'public', expectedRevision: revisionNow });
        const wire = published.status === 200 ? await (await getPublic(`/blyg/items/${plain.json.id}.json`)).text() : '';
        const ids = [...made, source];
        return { created: [created.status, normalize(created.text, ids)], patched: [patched.status, normalize(patched.text, ids)], published: [published.status, normalize(published.text, ids)], wireNamesSource: wire.includes(source) };
      };
      const hidden = await attempt(fixture.P), unknown = await attempt(UNKNOWN);
      for (const step of ['created', 'patched', 'published'] as const) observe('forge', { step, same: JSON.stringify(hidden[step]) === JSON.stringify(unknown[step]), hidden: hidden[step], unknown: unknown[step] });
      observe('forge', { step: 'wire', namesPrivate: hidden.wireNamesSource });
      return;
    }
    case 'cursor': {
      // Items outside the hopper exist before the first page, so only the event moves between pages.
      const outsider = (await api('POST', '/items', { contentMd: 'outside the hopper', kind: 'fragment' })).json.id as string;
      const published = (await api('POST', '/items', { contentMd: 'published outside the hopper', kind: 'fragment' })).json.id as string;
      await api('POST', `/items/${published}/publish`, { visibility: 'public' });
      const first = await restricted('GET', `/hoppers/${fixture.hopper}/memberships?limit=1`);
      const cursor = first.json?.page?.nextCursor as string;
      const second = async () => restricted('GET', `/hoppers/${fixture.hopper}/memberships?limit=1&cursor=${encodeURIComponent(cursor)}`);
      switch (history.event) {
        case 'unrelated draft edit': await api('PATCH', `/items/${outsider}`, { contentMd: 'edited outside the hopper' }); break;
        case 'unrelated public edit': await api('PATCH', `/items/${published}`, { contentMd: 'pending changes outside the hopper' }); break;
        case 'member made private': await api('POST', `/items/${fixture.D}/publish`, { visibility: 'private' }); break;
        case 'member tainted':
          await api('PATCH', `/items/${fixture.D}`, { contentMd: `d plain words [TK]summarize ![[${fixture.P}]][/TK]` });
          await generate(fixture.D);
          break;
        case 'hidden member raised': await api('POST', `/items/${fixture.P}/publish`, { visibility: 'public' }); break;
      }
      const page = await second();
      observe('membership cursor', { expired: page.status === 409 && page.json?.code === 'cursor-expired', status: page.status });
      return;
    }
    case 'refusal': {
      // Three drafts tainted by three private sources; one source stays private, one is raised, one discarded.
      const sources: string[] = [], drafts: string[] = [];
      for (const fate of ['kept', 'raised', 'discarded']) {
        const source = (await api('POST', '/items', { contentMd: `${SOURCE} ${fate}`, kind: 'fragment' })).json.id as string;
        await api('POST', `/items/${source}/publish`, { visibility: 'private' });
        const draft = (await api('POST', '/items', { contentMd: `[TK]summarize ![[${source}]][/TK]`, kind: 'fragment' })).json.id as string;
        await generate(draft);
        sources.push(source); drafts.push(draft);
      }
      await api('POST', `/items/${sources[1]}/publish`, { visibility: 'public' });
      await api('DELETE', `/items/${sources[2]}`);
      const answers = await Promise.all(drafts.map(async (draft, i) => { const r = await api('POST', `/items/${draft}/publish`, { visibility: 'public' }); return { status: r.status, body: normalize(JSON.stringify(r.json), [draft, sources[i]]) }; }));
      observe('refusal', { refused: answers.every(answer => answer.status >= 400), oneAnswer: answers.every(answer => JSON.stringify(answer) === JSON.stringify(answers[0])), answers });
      observe('refusal private', (await api('POST', `/items/${drafts[0]}/publish`, { visibility: 'private' })).status);
      return;
    }
  }
}
const driver = (history: History, observe: (checkpoint: string, value: unknown) => void) => withOracleStorage(() => drive(history, observe));

const VISIBLE_TO_RESTRICTED: Record<string, Resource[]> = {
  'items': ['D', 'TP', 'X'], 'items status=draft': ['D'], 'items status=private': [],
  'search words with drafts': ['D', 'TP', 'X'], 'search derived with drafts': [], 'search source with drafts': [], 'search words': ['TP', 'X'],
  'reading own': ['TP', 'X'], 'hopper members': ['D', 'TP', 'X'], 'hopper lens': ['D', 'TP', 'X'],
};
// Law 6 and 7 for a caller who sees private: drafts, private and public, all of them.
const VISIBLE_TO_OWNER: Record<string, Resource[]> = {
  'items': ['D', 'P', 'TD', 'TP', 'X'], 'items status=private': ['P'],
  'search words with drafts': ['D', 'P', 'TD', 'TP', 'X'], 'search derived with drafts': ['TD', 'TP'], 'search source with drafts': ['P'], 'search words': ['TP', 'X'],
  'reading own': ['P', 'TP', 'X'], 'hopper members': ['D', 'P', 'TD', 'TP', 'X'], 'hopper lens': ['D', 'P', 'TD', 'TP', 'X'],
};

type Expected = Observation[];
function model(history: History): Expected {
  const out: Expected = [];
  const at = (checkpoint: string, value: unknown) => out.push({ checkpoint, value });
  switch (history.kind) {
    case 'inventory': at('item operation inventory', []); break;
    case 'hidden': for (const operation of [...Object.keys(ITEM_OPERATIONS), 'uploadMedia itemId', 'deleteMedia', 'media bytes', 'batchRead getItem']) at('private scope', { operation, same: true }); at('no write took effect', true); break;
    case 'mcp': for (const [operation, route] of Object.entries(routes)) if (route.path.startsWith('/items/{id}')) at('private scope', { operation: `MCP ${operation}`, same: true }); break;
    case 'references': for (const operation of ['preview link', 'preview quote', 'preview TK source', 'publish link', 'publish quote', 'generate TK source']) at('private scope', { operation, same: true }); break;
    case 'working copy':
      at('hidden working copy', { operation: 'getItem', status: 200, contentMd: true, leaks: [] });
      at('hidden working copy', { operation: 'preview link', status: 200, resolved: true, leaks: [] });
      for (const operation of ['listItemVersions', 'getVersion', 'getItemFreshness', 'getSyndication', 'getImportedItem', 'getImportedHistory']) at('hidden working copy', { operation, status: 'answered', leaks: [] });
      break;
    case 'lists': for (const [list, visible] of Object.entries(VISIBLE_TO_RESTRICTED)) at('list', { list, status: 200, named: visible, leaks: [] }); at('list', { list: 'hopper lens drafts', marked: ['D'] }); at('list', { list: 'summary', counts: { all: 3, drafts: 1, public: 2 } }); break;
    case 'owner lists': for (const [list, visible] of Object.entries(VISIBLE_TO_OWNER)) at('list', { list, status: 200, named: visible, leaks: [] }); at('list', { list: 'hopper lens drafts', marked: ['D', 'TD'] }); break;
    case 'clear':
      at('clear action', history.action !== 'provenance patch' ? true : undefined);
      at('taint', history.action === 'discard changes' ? { publish: 200, workingCopyShown: true } : { publishRefused: true, hidden: true });
      break;
    case 'forge': for (const step of ['created', 'patched', 'published']) at('forge', { step, same: true }); at('forge', { step: 'wire', namesPrivate: false }); break;
    case 'refusal': at('refusal', { refused: true, oneAnswer: true }); at('refusal private', 200); break;
    case 'cursor': at('membership cursor', { expired: !history.event.startsWith('unrelated') }); break;
  }
  return out;
}
// Each observation is compared on the fields the model states; the rest are evidence for the reader of a failure.
function check(_history: History, trace: readonly Observation[], expected: Expected) {
  const received = trace.filter(entry => !entry.checkpoint.startsWith('oracle'));
  for (let i = 0; i < Math.min(received.length, expected.length); i++) {
    const want = expected[i], got = received[i];
    // Fields the model does not state are copied into the owed value, so a failure shows them as evidence.
    const owed = want.value && typeof want.value === 'object' && !Array.isArray(want.value) && got.value && typeof got.value === 'object'
      ? { ...(got.value as object), ...(want.value as object) }
      : want.value === undefined ? got.value : want.value;
    const mismatch = differs(got.checkpoint, 'private scope laws', got, { checkpoint: want.checkpoint, value: owed });
    if (mismatch) return mismatch;
  }
  return differs('walk completion', 'private scope laws', received.length, expected.length) ?? pass;
}

const CLEARS: { action: Clear; target: 'TD' | 'TP' }[] = [
  ...(['provenance patch', 'unwrap markers', 'raise source', 'discard source', 'regenerate from public'] as const).flatMap(action => (['TD', 'TP'] as const).map(target => ({ action, target }))),
  { action: 'discard changes', target: 'TP' },
];
const describe = (history: History) => {
  switch (history.kind) {
    case 'inventory': return 'every item-addressed contract operation is walked';
    case 'hidden': return `a restricted token learns nothing about ${history.resource === 'P' ? 'a private item' : 'a tainted draft'} on any item operation`;
    case 'mcp': return `a restricted MCP token learns nothing about ${history.resource === 'P' ? 'a private item' : 'a tainted draft'} on any item tool, in Notebook mode`;
    case 'references': return `a restricted token's previews and publishes name ${history.resource === 'P' ? 'a private item' : 'a tainted draft'} as an unknown one`;
    case 'working copy': return 'a public item with a tainted working copy shows its public version to a restricted token';
    case 'lists': return 'no list, search, reader, hopper or count shows a restricted token a hidden item or working copy';
    case 'owner lists': return `${history.caller === 'session' ? 'the owner\'s session' : 'a token holding owner:private'} sees drafts, private and tainted items in every list and search`;
    case 'clear': return `${history.action} on ${history.target === 'TD' ? 'a tainted draft' : 'a public item\'s tainted changes'} ${history.action === 'discard changes' ? 'removes the mark' : 'keeps the mark'}`;
    case 'forge': return 'client provenance naming a private item is answered as one naming an unknown id';
    case 'refusal': return 'a tainted public publish is refused with one answer whatever became of the source';
    case 'cursor': return `a restricted hopper cursor ${history.event.startsWith('unrelated') ? 'survives' : 'expires on'} ${history.event}`;
  }
};
const scopeHistories: History[] = [{ kind: 'inventory' }, { kind: 'hidden', resource: 'P' }, { kind: 'hidden', resource: 'TD' }, { kind: 'references', resource: 'P' }, { kind: 'references', resource: 'TD' }, { kind: 'mcp', resource: 'P' }, { kind: 'mcp', resource: 'TD' }];
const leakHistories: History[] = [{ kind: 'working copy' }, { kind: 'lists' }, { kind: 'owner lists', caller: 'session' }, { kind: 'owner lists', caller: 'token' }];
const taintHistories: History[] = [...CLEARS.map(clear => ({ kind: 'clear' as const, ...clear })), { kind: 'forge' }];
const blockHistories: History[] = [{ kind: 'refusal' }];
const cursorHistories: History[] = (['unrelated draft edit', 'unrelated public edit', 'member made private', 'member tainted', 'hidden member raised'] as const).map(event => ({ kind: 'cursor', event }));
const AUTHORITY = 'blygger-spec docs/sealed-content-build-plan.md §1 0f; decisions by Venkat Rao (GitHub vgururao): private scope and no leak (2026-11-23), private taint and "hidden is not gone" (2026-11-24, session 84), Q1 server-only taint, Q2 hide the working copy, Q3 change signals a stated limit (2026-11-24, session 85).';
const LIMITS = 'One owner, one hopper, fragments. Revisions, ETags, dirty flags and cursor expiry are not compared (Q3). A restricted write to a hidden working copy, media, MCP transport, shelf, Agentic editions and catch-up are not judged here.';

oracleProperty({
  id: 'private-scope-hidden-items', owns: ['src/operation-runner.ts#executeOperation', 'src/private-access.ts', 'src/transclusion.ts#resolveTarget', 'src/read-api.ts#getItemOperation', 'src/read-api.ts#listItemsOperation', 'src/read-api.ts#searchOperation', 'src/read-api.ts#listHopperMembershipsOperation', 'src/model.ts#publishScoped', 'src/api.ts#updateItemOperation', 'src/api.ts#createItemOperation', 'src/tk-generate.ts#runGenerateScope'],
  law: { statement: 'For every restricted caller, every hidden item and every operation that names an own item, the answer equals the answer for an id that does not exist, ids aside, is not a server error, and no write takes effect.', authority: AUTHORITY, limits: LIMITS },
  histories: scopeHistories, label: describe, model, driver, check,
  calibrations: [{ name: 'a private item answers 200 to getItem', law: 'private scope laws', history: { enumerated: 1 }, corrupt: trace => trace.map((entry, index) => index === 0 ? { ...entry, value: { ...(entry.value as object), same: false } } : entry) }],
});
oracleProperty({
  id: 'private-scope-no-leak', owns: ['src/operation-runner.ts#executeOperation', 'src/private-access.ts', 'src/transclusion.ts#resolveTarget', 'src/read-api.ts#getItemOperation', 'src/read-api.ts#listItemsOperation', 'src/read-api.ts#searchOperation', 'src/read-api.ts#listHopperMembershipsOperation', 'src/model.ts#publishScoped', 'src/api.ts#updateItemOperation', 'src/api.ts#createItemOperation', 'src/tk-generate.ts#runGenerateScope'],
  law: { statement: 'For every response to a restricted caller, no hidden item\'s id or text and no hidden working copy\'s text appears, and no list or count includes a hidden item; a public item with a hidden working copy stays visible as its latest public version. A caller who sees private sees drafts, private and tainted items in every list.', authority: AUTHORITY, limits: LIMITS },
  histories: leakHistories, label: describe, model, driver, check,
  calibrations: [{ name: 'a tainted draft listed for a restricted token', law: 'private scope laws', history: { enumerated: 1 }, corrupt: trace => trace.map((entry, index) => index === 0 ? { ...entry, value: { ...(entry.value as object), named: ['D', 'TD', 'TP', 'X'] } } : entry) }],
});
oracleProperty({
  id: 'private-scope-taint', owns: ['src/operation-runner.ts#executeOperation', 'src/private-access.ts', 'src/transclusion.ts#resolveTarget', 'src/read-api.ts#getItemOperation', 'src/read-api.ts#listItemsOperation', 'src/read-api.ts#searchOperation', 'src/read-api.ts#listHopperMembershipsOperation', 'src/model.ts#publishScoped', 'src/api.ts#updateItemOperation', 'src/api.ts#createItemOperation', 'src/tk-generate.ts#runGenerateScope'],
  law: { statement: 'For every working copy, no client body, hand edit of the TK markers, raise or discard of the source, or regeneration from public sources clears the private-taint mark; discarding the working copy removes it; client-supplied provenance naming a private item is answered as one naming an unknown id.', authority: AUTHORITY, limits: LIMITS },
  histories: taintHistories, label: describe, model, driver, check,
  calibrations: [{ name: 'unwrapping the markers publishes publicly', law: 'private scope laws', history: { enumerated: 2 }, corrupt: trace => trace.map(entry => entry.checkpoint === 'taint' ? { ...entry, value: { ...(entry.value as object), publishRefused: false } } : entry) }],
});
oracleProperty({
  id: 'private-scope-publish-block', owns: ['src/operation-runner.ts#executeOperation', 'src/private-access.ts', 'src/transclusion.ts#resolveTarget', 'src/read-api.ts#getItemOperation', 'src/read-api.ts#listItemsOperation', 'src/read-api.ts#searchOperation', 'src/read-api.ts#listHopperMembershipsOperation', 'src/model.ts#publishScoped', 'src/api.ts#updateItemOperation', 'src/api.ts#createItemOperation', 'src/tk-generate.ts#runGenerateScope'],
  law: { statement: 'For every tainted working copy, a public publish is refused with one answer whatever became of the source, and a tainted draft may still be published privately.', authority: AUTHORITY, limits: LIMITS },
  histories: blockHistories, label: describe, model, driver, check,
  calibrations: [{ name: 'a raised source lets the output go public', law: 'private scope laws', history: { enumerated: 0 }, corrupt: trace => trace.map(entry => entry.checkpoint === 'refusal' ? { ...entry, value: { ...(entry.value as object), refused: false } } : entry) }],
});
oracleProperty({
  id: 'private-scope-hopper-cursor', owns: ['src/operation-runner.ts#executeOperation', 'src/private-access.ts', 'src/transclusion.ts#resolveTarget', 'src/read-api.ts#getItemOperation', 'src/read-api.ts#listItemsOperation', 'src/read-api.ts#searchOperation', 'src/read-api.ts#listHopperMembershipsOperation', 'src/model.ts#publishScoped', 'src/api.ts#updateItemOperation', 'src/api.ts#createItemOperation', 'src/tk-generate.ts#runGenerateScope'],
  law: { statement: 'For every restricted caller paging a hopper\'s members, the cursor expires when a member\'s visibility to that caller changes and survives an unrelated item edit.', authority: AUTHORITY + ' docs/api.md: unrelated changes do not expire a cursor.', limits: LIMITS },
  histories: cursorHistories, label: describe, model, driver, check,
  calibrations: [{ name: 'an unrelated edit expires the cursor', law: 'private scope laws', history: { enumerated: 0 }, corrupt: trace => trace.map(entry => entry.checkpoint === 'membership cursor' ? { ...entry, value: { ...(entry.value as object), expired: true } } : entry) }],
});
