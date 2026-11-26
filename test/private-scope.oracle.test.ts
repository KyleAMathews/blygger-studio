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
 * answers are compared; nothing else is. The raw comparison, with no id in any
 * answer, across every scope subset is rest-permissions-notebook's (REST paths)
 * and mcp-notebook's (MCP tools).
 *
 * Limits: one owner, one hopper, one restricted scope set. Revisions, ETags,
 * `dirty` and cursor expiry may change when a hidden thing changes (the stated
 * limit, Q3), so they are not compared across items. Media bytes beyond a
 * restricted bearer are the media-visibility oracle's; catch-up is not walked.
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
const SOURCE = 'sourcemarkwords', DERIVED = 'derivedmarkwords', LIFECYCLE = 'lifecyclemarkwords';

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
type MaskedOp = 'empty edit' | 'flag edit' | 'text edit' | 'generate' | 'note draft' | 'classify' | 'publish' | 'refresh' | 'withdraw' | 'pin';
const MASKED_OPS: MaskedOp[] = ['empty edit', 'flag edit', 'text edit', 'generate', 'note draft', 'classify', 'publish', 'refresh', 'withdraw', 'pin'];
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
  | { kind: 'default private' }
  | { kind: 'cursor'; event: CursorEvent; reader: 'restricted memberships' | 'owner hopper lens' }
  | { kind: 'agentic'; writer: 'owner' | 'restricted'; turnsPrivate?: true }
  | { kind: 'shelf'; full?: true; turnsPrivate?: true }
  | { kind: 'search lifecycle'; caller: 'session' | 'restricted' }
  | { kind: 'masked write'; op: MaskedOp }
  | { kind: 'tk'; source: 'private' | 'public'; position: 'first' | 'second'; fate: 'kept' | 'raised' | 'discarded'; then: 'nothing' | 'regenerate from public' | 'edit the other scope' };
// Law 7's cursor half: what happens between a restricted caller's first and second page of hopper members.
type CursorEvent = 'unrelated draft edit' | 'unrelated public edit' | 'member made private' | 'member tainted' | 'hidden member raised' | 'private member keeps p2';
// Relevant to a restricted reader: a member's visibility to it. To the owner's hopper lens: a member's entry.
const cursorExpires = (event: CursorEvent) => !event.startsWith('unrelated') && event !== 'private member keeps p2';

/** The owner API as a token holding exactly `scope` sees it. */
function tokenApi(scope: string[], extraEnv: Record<string, string> = {}) {
  const app = new Hono().route('/api', createOwnerApi({ scope, clientId: 'private-scope-oracle', userId: 'owner' }));
  return async (method: string, path: string, body?: unknown) => {
    const ctx = createExecutionContext();
    const response = await app.fetch(new Request(`https://example.com/api${path}`, {
      method, ...(body === undefined ? {} : body instanceof FormData ? { body } : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    }), { ...env, API_READ_LIMIT: '10000', API_WRITE_LIMIT: '10000', API_DELEGATED_READ_LIMIT: '10000', API_DELEGATED_WRITE_LIMIT: '10000', ...extraEnv }, ctx);
    await waitOnExecutionContext(ctx);
    const text = await response.text();
    return { status: response.status, text, json: (() => { try { return JSON.parse(text); } catch { return null; } })() };
  };
}
const restricted = tokenApi(RESTRICTED), withPrivate = tokenApi([...RESTRICTED, 'owner:private']);
// The generate route as a caller who sees private, with a provider key: the real route, its scope wiring and its write.
const generator = tokenApi([...RESTRICTED, 'owner:private'], { AI_PROVIDER_KEY: 'k' });
// A restricted token with a provider key: what a proofread or generation would send is observable.
const proofreader = tokenApi(RESTRICTED, { AI_PROVIDER_KEY: 'k' });
/** Run `work` with provider requests answered by `text`; returns what each request sent. */
async function withProvider<T>(text: string, work: () => Promise<T>): Promise<{ result: T; sent: string[] }> {
  const original = globalThis.fetch, sent: string[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (!url.startsWith('https://api.anthropic.com/')) return original(input, init);
    sent.push(String(init?.body ?? ''));
    return new Response(JSON.stringify({ model: 'claude-opus-5', stop_reason: 'end_turn', content: [{ type: 'text', text }] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }) as typeof fetch;
  try { return { result: await work(), sent }; } finally { globalThis.fetch = original; }
}

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
// Labels, not ids, so a trace stays the same from run to run.
const leaks = (text: string, fixture: Fixture) => ([[SOURCE, 'source words'], [DERIVED, 'derived words'], [fixture.P, 'P'], [fixture.TD, 'TD'], ['drawn from a private item', 'private-source refusal']] as const).filter(([mark]) => text.includes(mark)).map(([, label]) => label);
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
      // The avatar (law 8): a hidden item's medium is an unknown medium to a restricted caller, the
      // avatar does not move, and every choice must name a medium that exists. The owner may choose it.
      const avatar = async () => (await env.DB.prepare("SELECT value FROM settings WHERE key = 'avatar_media_id'").first<{ value: string }>())?.value ?? '';
      const avatarBefore = await avatar();
      const chosenHidden = await restricted('PATCH', '/settings', { avatarMediaId: attached.id }), chosenMissing = await restricted('PATCH', '/settings', { avatarMediaId: 'zzzzzzzz' });
      observe('private scope', { operation: 'avatar', same: chosenHidden.status === chosenMissing.status && chosenHidden.status >= 400 && chosenHidden.status < 500 && normalize(chosenHidden.text, [attached.id]) === normalize(chosenMissing.text, ['zzzzzzzz']) && (await avatar()) === avatarBefore, hidden: chosenHidden.status, unknown: chosenMissing.status, body: chosenHidden.text.slice(0, 160), unknownBody: chosenMissing.text.slice(0, 160) });
      const ownerChoice = await apiJson(fixture.cookie, 'PATCH', '/blyg/api/settings', { avatarMediaId: attached.id });
      observe('owner avatar', ownerChoice.status === 200 && (await avatar()) === attached.id);
      // Batched reads go through the same law.
      const batch = await restricted('POST', '/read-batch', { operation: 'getItem', requests: [{ path: { id } }, { path: { id: UNKNOWN } }] });
      const children = (batch.json ?? []) as { status: number; body: unknown }[];
      observe('private scope', { operation: 'batchRead getItem', same: batch.status === 200 && children.length === 2 && children[0].status === children[1].status && normalize(JSON.stringify(children[0].body), [id]) === normalize(JSON.stringify(children[1].body), [UNKNOWN]), hidden: children[0]?.status, unknown: children[1]?.status, body: JSON.stringify(children[0]?.body ?? batch.text).slice(0, 160) });
      const after = await ownerState(fixture, id);
      observe('no write took effect', JSON.stringify(after) === JSON.stringify(before));
      return;
    }
    case 'default private': {
      // Over REST, in Notebook mode: a publish naming no visibility follows the private default,
      // which would make an item the token cannot see, so a restricted token is refused (403)
      // and nothing changes; naming public is an ordinary publish (gap run, session 88).
      await api('PATCH', '/settings', { defaultVisibility: 'private' });
      const state = async (id: string) => { const item = (await api('GET', `/items/${id}`)).json; return { status: item?.status, version: item?.version }; };
      const draft = async (by: typeof restricted) => (await by('POST', '/items', { contentMd: 'a draft in Notebook mode', kind: 'fragment' })).json.id as string;
      const plain = await draft(restricted);
      const refused = await restricted('POST', `/items/${plain}/publish`, { expectedRevision: await revision(fixture, plain) });
      observe('default private', { caller: 'restricted, no visibility', status: refused.status, code: refused.json?.code ?? null, message: refused.json?.message ?? null, item: await state(plain) });
      const named = await restricted('POST', `/items/${plain}/publish`, { visibility: 'public', expectedRevision: await revision(fixture, plain) });
      observe('default private', { caller: 'restricted, public named', status: named.status, item: await state(plain) });
      const kept = await draft(withPrivate);
      const allowed = await withPrivate('POST', `/items/${kept}/publish`, { expectedRevision: await revision(fixture, kept) });
      observe('default private', { caller: 'owner:private, no visibility', status: allowed.status, item: await state(kept) });
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
        // A thread's `![[+ text]]` spans dry-run as their own items, then the thread without them
        // (api.ts publishTangled): a target named in a span or outside it answers as an unknown one.
        'publish tangle part': async target => {
          const created = await restricted('POST', '/items', { contentMd: `Before.\n\n![[+ a passage that links [[${target}]] ]]\n\nAfter.`, kind: 'thread' });
          const made = created.json?.id as string;
          const published = await restricted('POST', `/items/${made}/publish`, { visibility: 'public', tangle: true, expectedRevision: created.json?.revision });
          return { status: published.status, text: normalize(published.text, [made]) };
        },
        'publish tangle thread': async target => {
          const created = await restricted('POST', '/items', { contentMd: `See [[${target}]].\n\n![[+ a plain passage ]]`, kind: 'thread' });
          const made = created.json?.id as string;
          const published = await restricted('POST', `/items/${made}/publish`, { visibility: 'public', tangle: true, expectedRevision: created.json?.revision });
          return { status: published.status, text: normalize(published.text, [made]) };
        },
        // A quote on its own line inside generated text is walked again (transclusion.ts walk).
        'preview quote in generated text': target => restricted('POST', '/preview', { contentMd: `[TK]quote it[=]\n\n![[${target}]]\n\n[/TK]`, kind: 'thread' }),
        // The word-count extension counts own items named by key.
        'word counts': async target => {
          await env.DB.prepare("INSERT INTO settings (key, value) VALUES ('extensions', '[\"word-count\"]') ON CONFLICT (key) DO UPDATE SET value = excluded.value").run();
          return restricted('GET', `/ext/word-count/counts?keys=${encodeURIComponent(JSON.stringify([`own:${target}`]))}`);
        },
        // The spellcheck extension proofreads an item named by id, with a model the fixture answers.
        'proofread': async target => {
          await env.DB.prepare("INSERT INTO settings (key, value) VALUES ('extensions', '[\"spellcheck\",\"word-count\"]') ON CONFLICT (key) DO UPDATE SET value = excluded.value").run();
          const { result } = await withProvider('[]', () => proofreader('GET', `/ext/spellcheck/proofread?id=${target}`));
          return result;
        },
        'preview tangle': target => restricted('POST', '/preview', { contentMd: `![[+ a passage that links [[${target}]] ]]`, kind: 'thread' }),
        // Generation reads the links in a draft (hydration); a hidden one is an unknown one.
        'generate reading a link': async target => {
          const created = await restricted('POST', '/items', { contentMd: `see [[${target}]]\n\n[TK]summarize the linked note[/TK]`, kind: 'fragment' });
          const made = created.json?.id as string;
          const generated = await restricted('POST', `/items/${made}/generate`, { scope: 0, expectedRevision: created.json?.revision });
          return { status: generated.status, text: normalize(generated.text, [made]) };
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
      // The tangle pre-flight (api.ts publishTangled §2.1): a refused thread publishes none of its
      // parts, whoever asks. A caller that sees private is told the item is private, not unknown.
      const ownCount = async () => (await env.DB.prepare("SELECT COUNT(*) AS n FROM items WHERE status <> 'draft'").first<{ n: number }>())!.n;
      for (const [caller, by] of [['restricted', restricted], ['owner:private', withPrivate]] as const) {
        for (const placement of ['part', 'second part', 'thread'] as const) {
          const before = await ownCount();
          const body = placement === 'part' ? `Before.\n\n![[+ a passage that links [[${id}]] ]]\n\nAfter.` : placement === 'second part' ? `![[+ a plain first passage ]]\n\n![[+ a passage that links [[${id}]] ]]` : `See [[${id}]].\n\n![[+ a plain passage ]]`;
          const created = await by('POST', '/items', { contentMd: body, kind: 'thread' });
          const published = await by('POST', `/items/${created.json?.id}/publish`, { visibility: 'public', tangle: true, expectedRevision: created.json?.revision });
          // The reason sits in the per-reference details; the message is generic.
          const message = JSON.stringify(published.json?.details ?? published.json ?? '');
          observe('tangle pre-flight', { caller, placement, refused: published.status >= 400 && published.status < 500, minted: (await ownCount()) - before, says: /unknown/i.test(message) ? 'unknown' : /private|draft/i.test(message) ? 'private' : message.slice(0, 80) });
        }
      }
      // A clean tangle: its part, then the thread once, at v1 (the pre-flight publishes nothing).
      const clean = await restricted('POST', '/items', { contentMd: 'Before.\n\n![[+ a plain passage ]]\n\nAfter.', kind: 'thread' });
      const before = await ownCount();
      const done = await restricted('POST', `/items/${clean.json?.id}/publish`, { visibility: 'public', tangle: true, expectedRevision: clean.json?.revision });
      observe('tangle pre-flight', { caller: 'restricted', placement: 'clean', status: done.status, version: done.json?.version ?? null, minted: (await ownCount()) - before });
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
      // Law 7: the hopper lens is draft-free, like the reader's other lenses (drafts in the
      // hopper lens are the follow-up to #178; Venkat, session 87).
      const lenses = (await bothLenses(ask, `/reading?hopper=${fixture.hopper}&limit=50`)).json as ({ items?: { own?: { id: string; draft?: boolean } }[] } | null)[];
      const entries = lenses.flatMap(lens => lens?.items ?? []);
      observe('list', { list: 'hopper lens drafts', marked: (['P', 'TD', 'TP', 'X', 'D'] as const).filter(resource => entries.some(entry => entry.own?.id === fixture[resource] && entry.own.draft === true)).sort() });
      // Laws 2 and 6: search marks a private hit and a working-copy hit; a restricted caller's
      // public item with tainted changes matches by its public version, so it is not a working-copy hit.
      const hits = ((await ask('GET', '/search?q=words&include=drafts&limit=50')).json?.items ?? []) as { id: string; private?: boolean; draft?: boolean }[];
      const marked = (flag: 'private' | 'draft') => (['P', 'TD', 'TP', 'X', 'D'] as const).filter(resource => hits.some(hit => hit.id === fixture[resource] && hit[flag] === true)).sort();
      observe('list', { list: 'search marks', private: marked('private'), draft: marked('draft'), once: new Set(hits.map(hit => hit.id)).size === hits.length });
      // Law 2: a hopper's counts leave hidden members out.
      observe('list', { list: 'hopper counts', total: (await ask('GET', `/hoppers/${fixture.hopper}`)).json?.total });
      if (history.kind === 'owner lists') {
        // The owner is told why a reference will not publish: private, or a draft (session 83 diagnostics).
        const reasons = async (resource: Resource) => ((await ask('POST', '/preview', { contentMd: `See [[${fixture[resource]}]].` })).json?.linkErrors ?? []).map((error: { reason: string }) => error.reason);
        observe('list', { list: 'owner reference reasons', P: await reasons('P'), TD: await reasons('TD'), D: await reasons('D'), TP: await reasons('TP') });
        // The owner's preview reads a private TK source and a link inside generated text as theirs.
        for (const kind of ['fragment', 'thread'] as const) {
          const source = (await ask('POST', '/preview', { contentMd: `[TK]summarize ![[${fixture.P}]][/TK]`, kind })).json?.scopes?.[0]?.sources?.[0];
          // A fragment's preview reports link errors as linkErrors, a thread's as errors.
          const preview = (await ask('POST', '/preview', { contentMd: `[TK]say it[=]see [[${fixture.P}]][/TK]`, kind })).json;
          const block = preview?.linkErrors ?? preview?.errors ?? [];
          observe('list', { list: `owner ${kind} preview of the notebook`, source: source && { ok: source.ok, from: source.from }, blockReasons: block.map((error: { reason: string }) => error.reason) });
        }
        // The hopper's public flag, which the make-public confirmation names, on the item.
        const reading = (await ask('GET', '/reading/summary?sub=all')).json as { counts?: { private: number } } | null;
        const back = (await ask('GET', '/reading/summary?sub=all&background=true')).json as { counts?: { private: number } } | null;
        observe('list', { list: 'owner reading counts', private: (reading?.counts?.private ?? 0) + (back?.counts?.private ?? 0) });
        // Hidden is not gone: a caller who sees private is told so by its granted scopes.
        observe('list', { list: 'owner capabilities', private: ((await ask('GET', '/capabilities')).json?.scopes ?? []).includes('owner:private') });
        // A caller who sees private sees the steps that name a private item (the browse log's owner half).
        await api('POST', '/browse', { trail: 'private-scope-owner-trail', origin: 'https://owner.example.test/blyg/', remoteId: fixture.P, via: 'start', title: 'an owner step' });
        observe('list', { list: 'owner browse', namesPrivate: (await ask('GET', '/browse?trail=private-scope-owner-trail')).text.includes(fixture.P) });
        const thread = async (contentMd: string) => ((await ask('POST', '/preview', { contentMd, kind: 'thread' })).json?.errors ?? []).map((error: { reason: string }) => error.reason);
        observe('list', { list: 'owner thread reasons', link: await thread(`See [[${fixture.P}]].`), quote: await thread(`![[${fixture.P}]]`), tangle: await thread(`![[+ a passage that links [[${fixture.P}]] ]]`) });
        observe('list', { list: 'item hoppers', hoppers: ((await ask('GET', `/items/${fixture.TP}`)).json?.hoppers ?? []).map((h: { public: boolean }) => h.public) });
      }
      // A cursor belongs to the access that minted it: the owner's continuation is refused to a restricted token.
      if (history.kind === 'lists') {
        const owner = async (path: string) => (await api('GET', path)).json?.page?.nextCursor as string;
        const replays: Record<string, boolean> = {};
        for (const [list, path] of [['items', '/items?limit=1'], ['hopper members', `/hoppers/${fixture.hopper}/memberships?limit=1`], ['search', '/search?q=words&include=drafts&limit=1']] as const) {
          const cursor = await owner(path);
          const replay = await restricted('GET', `${path}&cursor=${encodeURIComponent(cursor)}`);
          replays[list] = replay.status === 400 || (replay.status === 409 && replay.json?.code === 'cursor-expired');
        }
        observe('list', { list: 'cross-access cursors refused', replays });
      }
      // Counts are law 2's: a restricted caller counts no hidden item. The owner's counts are not a law here.
      if (history.kind === 'lists') {
        const summary = (await ask('GET', '/items/summary')).json as { all: number; drafts: number; public: number } | null;
        observe('list', { list: 'summary', counts: summary && { all: summary.all, drafts: summary.drafts, public: summary.public } });
        // Hidden is not gone: the client can tell it lacks the scope.
        observe('list', { list: 'capabilities', private: ((await ask('GET', '/capabilities')).json?.scopes ?? []).includes('owner:private') });
        // The owner's reader logs each entry it opens, a private one included, with its title (F4).
        await api('POST', '/browse', { trail: 'private-scope-trail', origin: 'https://owner.example.test/blyg/', remoteId: fixture.P, via: 'start', title: `${SOURCE} as a title` });
        observe('list', { list: 'browse', leaks: leaks((await ask('GET', '/browse')).text, fixture) });
        const reading = (await ask('GET', '/reading/summary?sub=all')).json as { counts?: { own: number; private: number } } | null;
        const background = (await ask('GET', '/reading/summary?sub=all&background=true')).json as { counts?: { own: number; private: number } } | null;
        observe('list', { list: 'reading counts', own: (reading?.counts?.own ?? 0) + (background?.counts?.own ?? 0), private: (reading?.counts?.private ?? 0) + (background?.counts?.private ?? 0) });
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
        hidden: history.target === 'TD' ? seen.status === unknown.status && normalize(seen.text, [target]) === normalize(unknown.text, [UNKNOWN]) : seen.status === 200 && leaks(seen.text, fixture).filter(mark => mark !== 'P').length === 0,
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
      const owner = async (method: string, path: string) => { const r = await api(method, path); return { status: r.status, text: JSON.stringify(r.json), json: r.json }; };
      const [read, base] = history.reader === 'owner hopper lens' ? [owner, `/reading?hopper=${fixture.hopper}&limit=1`] : [restricted, `/hoppers/${fixture.hopper}/memberships?limit=1`];
      const keys = (json: any) => ((json?.items ?? []) as { key?: string; remoteId?: string }[]).map(entry => entry.key ?? entry.remoteId);
      // Background classification is asynchronous and would move members out of the lens between
      // runs (session 88: page 1 sometimes held one member and no cursor), so the owner pins them
      // in the foreground first. Placement is orthogonal to the cursor law.
      if (history.reader === 'owner hopper lens') for (const id of [fixture.D, fixture.P, fixture.TD, fixture.TP, fixture.X]) await api('PUT', '/reading/placement', { source: 'own', sub: '', id, placement: 'foreground' });
      const first = await read('GET', base);
      const cursor = first.json?.page?.nextCursor as string;
      // Without a first-page cursor the history tests nothing.
      observe('membership first page', { cursor: typeof cursor === 'string' });
      const second = async () => read('GET', `${base}&cursor=${encodeURIComponent(cursor)}`);
      switch (history.event) {
        case 'unrelated draft edit': await api('PATCH', `/items/${outsider}`, { contentMd: 'edited outside the hopper' }); break;
        case 'unrelated public edit': await api('PATCH', `/items/${published}`, { contentMd: 'pending changes outside the hopper' }); break;
        case 'member made private': await api('POST', `/items/${fixture.D}/publish`, { visibility: 'private' }); break;
        case 'member tainted':
          await api('PATCH', `/items/${fixture.D}`, { contentMd: `d plain words [TK]summarize ![[${fixture.P}]][/TK]` });
          await generate(fixture.D);
          break;
        case 'hidden member raised': await api('POST', `/items/${fixture.P}/publish`, { visibility: 'public' }); break;
        case 'private member keeps p2':
          await api('PATCH', `/items/${fixture.P}`, { contentMd: `${SOURCE} kept again, p2` });
          await api('POST', `/items/${fixture.P}/publish`, { visibility: 'private' });
          break;
      }
      const page = await second();
      const expired = page.status === 409 && page.json?.code === 'cursor-expired';
      // A cursor that survives continues exactly where a fresh walk's second page does.
      const fresh = expired ? null : await read('GET', `${base}&cursor=${encodeURIComponent((await read('GET', base)).json?.page?.nextCursor as string)}`);
      observe('membership cursor', { expired, exact: expired || JSON.stringify(keys(page.json)) === JSON.stringify(keys(fresh?.json)), status: page.status });
      return;
    }
    case 'agentic': {
      // An edition naming hidden items (Kyle on #178: observe the saved draft, not only the answer).
      const edition = (ids: string[]) => ({ agent: { name: 'private scope' }, sections: [{ title: 'Today', entries: ids.map(remoteId => ({ sub: '~own', remoteId, headline: 'h' })) }] });
      const put = async (as: typeof restricted, ids: string[]) => as('PUT', '/agentic/default', { edition: edition(ids), expectedRevision: (await api('GET', '/agentic/default')).json.revision });
      const writer = history.writer === 'owner' ? withPrivate : restricted;
      if (history.turnsPrivate) {
        // Kyle's row 3: visibility changes after the draft was composed. The edition names D and X
        // while both are visible; then D is kept privately. Neither the edition nor its draft may
        // name D to a restricted token from then on.
        await put(writer, [fixture.D, fixture.X]);
        await api('POST', `/items/${fixture.D}/publish`, { visibility: 'private' });
        const feed = await env.DB.prepare("SELECT draft_id FROM agentic_feeds WHERE id = 'default'").first<{ draft_id: string | null }>();
        const read = await restricted('GET', '/agentic/default');
        const draft = feed?.draft_id ? await restricted('GET', `/items/${feed.draft_id}`) : null;
        observe('agentic turned private', { readNamesD: read.text.includes(fixture.D), draftNamesD: !!draft && draft.text.includes(fixture.D), draftStatus: draft?.status ?? null });
        return;
      }
      const written = await put(writer, [fixture.P, fixture.TD, fixture.X]);
      const row = await env.DB.prepare("SELECT edition_json, draft_id, draft_md FROM agentic_feeds WHERE id = 'default'").first<{ edition_json: string | null; draft_id: string | null; draft_md: string | null }>();
      const read = await restricted('GET', '/agentic/default');
      const list = await restricted('GET', '/agentic');
      const draft = row?.draft_id ? await restricted('GET', `/items/${row.draft_id}`) : null;
      observe('agentic', {
        status: written.status,
        responseLeaks: history.writer === 'restricted' ? leaks(written.text, fixture) : [],
        storedNamesHidden: [fixture.P, fixture.TD].some(id => (row?.edition_json ?? '').includes(id)),
        // The Agentic feed is notebook access (Venkat, session 88): refused whole without owner:private.
        restrictedRead: [read.status, list.status],
        restrictedReadLeaks: leaks(read.text, fixture),
        // The composed draft thread, as a restricted token can read it.
        restrictedDraftLeaks: draft ? leaks(draft.text, fixture) : [],
      });
      return;
    }
    case 'masked write': {
      // Q2 for writes (Venkat, session 86): a restricted token acts on TP as it sees it, its latest
      // public version. No answer carries the hidden working copy and no model call reads it. The
      // owner's hidden copy survives every write that leaves the text alone; a text edit replaces it,
      // and a publish or refresh first discards it, so the mark goes with the text (F1-F3, F5).
      const tp = fixture.TP, at = () => revision(fixture, tp);
      const viaModel = async (path: string, answer: string) => { const { result, sent } = await withProvider(answer, async () => proofreader('POST', path, { expectedRevision: await at() })); return { ...result, sent }; };
      const sends: Record<MaskedOp, () => Promise<{ status: number; text: string; sent?: string[] }>> = {
        'empty edit': async () => restricted('PATCH', `/items/${tp}`, { expectedRevision: await at() }),
        'flag edit': async () => restricted('PATCH', `/items/${tp}`, { responses: 'show', expectedRevision: await at() }),
        'text edit': async () => restricted('PATCH', `/items/${tp}`, { contentMd: 'restricted words', expectedRevision: await at() }),
        'generate': async () => restricted('POST', `/items/${tp}/generate`, { scope: 0, expectedRevision: await at() }),
        'note draft': () => viaModel(`/items/${tp}/note-draft`, 'a note'),
        'classify': () => viaModel(`/items/${tp}/classify`, '{"category":"minor","probability":0.9,"reason":"r"}'),
        'publish': async () => restricted('POST', `/items/${tp}/publish`, { visibility: 'public', expectedRevision: await at() }),
        'refresh': async () => restricted('POST', `/items/${tp}/refresh`, { expectedRevision: await at() }),
        'withdraw': async () => restricted('POST', `/items/${tp}/withdraw`, { expectedRevision: await at() }),
        'pin': async () => restricted('PUT', `/items/${tp}/versions/1/pin`, { expectedRevision: await at() }),
      };
      const answer = await sends[history.op]();
      const owner = (await getItem(env.DB, tp))!;
      observe('masked write', {
        op: history.op, status: answer.status < 500 ? 'answered' : answer.status, leaks: leaks(answer.text, fixture),
        providerSaw: (answer.sent ?? []).some(body => body.includes(DERIVED) || body.includes(SOURCE)),
        ownerCopy: owner.content_md.includes(DERIVED) ? 'kept' : owner.content_md.includes('restricted words') ? 'replaced' : 'discarded', taint: owner.private_taint,
      });
      return;
    }
    case 'search lifecycle': {
      // Law 6 across one item's life: a draft, a private p1, its working copy edited, raised,
      // then changed again. Each step is searched by the caller with drafts included.
      const ask = history.caller === 'session' ? api : restricted;
      const created = await api('POST', '/items', { contentMd: `${LIFECYCLE} first words`, kind: 'fragment' });
      const id = created.json.id as string;
      const step = async (name: string) => {
        const hits = (((await ask('GET', `/search?q=${LIFECYCLE}&include=drafts&limit=50`)).json?.items ?? []) as { id: string; private?: boolean; draft?: boolean; excerpt: string }[]).filter(hit => hit.id === id);
        observe('search lifecycle', { step: name, hits: hits.length, ...(hits[0] ? { private: hits[0].private === true, draft: hits[0].draft === true, excerpt: hits[0].excerpt } : {}) });
      };
      const edit = (text: string) => api('PATCH', `/items/${id}`, { contentMd: `${LIFECYCLE} ${text}` });
      await step('draft');
      await api('POST', `/items/${id}/publish`, { visibility: 'private' }); await step('private');
      await edit('second words'); await step('private edited');
      await api('POST', `/items/${id}/publish`, { visibility: 'public' }); await step('raised');
      await edit('third words'); await step('changed');
      return;
    }
    case 'shelf': {
      if (history.turnsPrivate) {
        // Kyle's row 3: visibility changes during a replacement. A restricted token reads a shelf of
        // D and X; D is then kept privately; the token saves back the list it read, reordered. D
        // keeps its place, the token's mention of it counts for nothing, and its answer omits D.
        const entry = (id: string) => ({ sub: '~own', remoteId: id });
        const label = (e: { remoteId: string }) => e.remoteId === fixture.D ? 'D' : e.remoteId === fixture.X ? 'X' : '?';
        await api('PUT', '/shelf', { entries: [entry(fixture.D), entry(fixture.X)], expectedRevision: (await api('GET', '/shelf')).json.revision });
        const seen = await restricted('GET', '/shelf');
        await api('POST', `/items/${fixture.D}/publish`, { visibility: 'private' });
        const saved = await restricted('PUT', '/shelf', { entries: [entry(fixture.X), entry(fixture.D)], expectedRevision: seen.json.revision });
        observe('shelf turned private', { seen: seen.json.entries.map(label), saved: saved.status, answer: (saved.json?.entries ?? []).map(label), owner: (await api('GET', '/shelf')).json.entries.map(label) });
        return;
      }
      // The owner shelves visible and hidden items; a restricted token replaces the list it can see.
      // The full shelf adds visible drafts until the owner's list sits at the ceiling, so the
      // restricted list plus the hidden entries runs past it.
      const filler = history.full ? Array.from({ length: SHELF_CEILING - 2 }, (_, i) => `shelf-filler-${i}`) : [];
      if (filler.length) await env.DB.batch(filler.map(id => env.DB.prepare("INSERT INTO items(id,kind,status,created,updated,version,content_md) VALUES(?,'fragment','draft','2026-01-01','2026-01-01',0,'filler')").bind(id)));
      const plan = shelfPlan(history);
      const ids = new Map<string, string>([...(['P', 'TD', 'TP', 'X', 'D'] as const).map(r => [r, fixture[r]] as [string, string]), ...filler.map((id, i) => [`F${i}`, id] as [string, string])]);
      const labels = new Map([...ids].map(([label, id]) => [id, label]));
      const entry = (label: string) => ({ sub: '~own', remoteId: ids.get(label)! });
      const order = (entries: { remoteId: string }[]) => entries.map(e => labels.get(e.remoteId) ?? '?');
      const shelf = (await api('GET', '/shelf')).json;
      const stored = await api('PUT', '/shelf', { entries: plan.stored.map(entry), expectedRevision: shelf.revision });
      const seen = await restricted('GET', '/shelf');
      const replaced = await restricted('PUT', '/shelf', { entries: plan.given.map(entry), expectedRevision: seen.json.revision });
      const stale = await restricted('PUT', '/shelf', { entries: [], expectedRevision: seen.json.revision });
      const owned = (await api('GET', '/shelf')).json;
      // The owner can always save back exactly what it reads, and the ceiling is the list's own.
      const back = await api('PUT', '/shelf', { entries: owned.entries, expectedRevision: owned.revision });
      const over = await api('PUT', '/shelf', { entries: [...owned.entries, ...Array.from({ length: SHELF_CEILING + 1 - owned.entries.length }, (_, i) => entry(i % 2 ? 'X' : 'D'))], expectedRevision: back.json?.revision ?? owned.revision });
      observe('shelf', { stored: stored.status, seen: order(seen.json.entries), replaced: replaced.status, answer: order(replaced.json?.entries ?? []), stale: { status: stale.status, code: stale.json?.code ?? null, message: stale.json?.message ?? null, current: order(stale.json?.details?.current?.entries ?? []) }, owner: order(owned.entries), savedBack: back.status === 200 && JSON.stringify(order(back.json.entries)) === JSON.stringify(order(owned.entries)), overCeiling: over.status });
      return;
    }
    case 'tk': {
      // TK through the real route (Kyle on #178): a two-scope draft, the source in one position and a
      // public item in the other; the source's fate and a later edit vary. Every generation is observed.
      const source = (await api('POST', '/items', { contentMd: `${SOURCE} tk source`, kind: 'fragment' })).json.id as string;
      await api('POST', `/items/${source}/publish`, { visibility: history.source });
      const scopes = [`[TK]summarize ![[${fixture.X}]][/TK]`, `[TK]summarize ![[${source}]][/TK]`];
      if (history.position === 'first') scopes.reverse();
      const draft = (await api('POST', '/items', { contentMd: scopes.join('\n\n'), kind: 'fragment' })).json.id as string;
      const at = history.position === 'first' ? 0 : 1;
      const generate = async (scope: number, text: string) => {
        const { result, sent } = await withProvider(text, async () => generator('POST', `/items/${draft}/generate`, { scope, expectedRevision: await revision(fixture, draft) }));
        return { status: result.status, sent: sent.join('') };
      };
      // Generated text may link what its instruction names: [[X]] resolves and stays a link; the
      // source stays a link only while it is served publicly.
      const first = await generate(at, `${DERIVED} from the source, see [[${fixture.X}]] and [[${source}]]`);
      observe('tk generation', { status: first.status, providerSawSource: first.sent.includes(SOURCE) });
      // Its provenance names the snapshot it drew on, private or public, as the owner reads it (0c).
      const named = ((await api('GET', `/items/${draft}`)).json?.provenance?.[at]?.sources ?? []) as { id?: string; version?: number }[];
      observe('tk provenance', { namesSource: named.some(ref => ref.id === source), version: named.find(ref => ref.id === source)?.version ?? null });
      const other = await generate(1 - at, 'public words from x');
      observe('tk generation', { status: other.status, providerSawSource: other.sent.includes(SOURCE) });
      if (history.fate === 'raised') await api('POST', `/items/${source}/publish`, { visibility: 'public' });
      if (history.fate === 'discarded' && history.source === 'private') await api('DELETE', `/items/${source}`);
      if (history.then === 'regenerate from public') {
        const md = (await getItem(env.DB, draft))!.content_md;
        await api('PATCH', `/items/${draft}`, { contentMd: md.replace(source, fixture.X) });
        observe('tk generation', { status: (await generate(at, 'regenerated words')).status, providerSawSource: false });
      }
      if (history.then === 'edit the other scope') {
        const md = (await getItem(env.DB, draft))!.content_md;
        await api('PATCH', `/items/${draft}`, { contentMd: md.replace('public words from x', 'public words edited by hand') });
      }
      const saved = (await getItem(env.DB, draft))!;
      const seen = await restricted('GET', `/items/${draft}`), unknown = await restricted('GET', `/items/${UNKNOWN}`);
      const published = await api('POST', `/items/${draft}/publish`, { visibility: 'public' });
      const document = await getPublic(`/blyg/items/${draft}.json`);
      const wire = document.status === 200 ? await document.text() : '';
      observe('tk outcome', {
        saved: saved.content_md.includes(DERIVED),
        // A bare [[id]] link in the output, not the instruction's ![[id]] source reference.
        keptLinks: { x: new RegExp(`(?<!!)\\[\\[${fixture.X}\\]\\]`).test(saved.content_md), source: new RegExp(`(?<!!)\\[\\[${source}\\]\\]`).test(saved.content_md) },
        wireAt: /"at":"\d{4}-/.test(wire),
        hiddenFromRestricted: seen.status === unknown.status && seen.text === unknown.text.replaceAll(UNKNOWN, draft),
        published: published.status === 200,
        wireHasDerived: wire.includes(DERIVED), wireNamesSource: wire.includes(source), wireModel: wire.includes('"model":"claude-opus-5"'),
        ownerSeesMark: Boolean((await api('GET', `/items/${draft}`)).json?.provenance?.[at]?.private),
      });
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
      observe('refusal', { refused: answers.every(answer => answer.status >= 400), oneAnswer: answers.every(answer => JSON.stringify(answer) === JSON.stringify(answers[0])), saysWhy: answers[0].body.includes('drawn from a private item'), answers });
      observe('refusal private', (await api('POST', `/items/${drafts[0]}/publish`, { visibility: 'private' })).status);
      // A private version may link a private item: its reader is one who sees private (law 6).
      const linking = (await api('POST', '/items', { contentMd: `See [[${sources[0]}]].`, kind: 'fragment' })).json.id as string;
      observe('refusal private link', (await api('POST', `/items/${linking}/publish`, { visibility: 'private' })).status);
      return;
    }
  }
}
// A production error is an observation, so a mutant that crashes a history is judged, not lost.
const driver = (history: History, observe: (checkpoint: string, value: unknown) => void) =>
  withOracleStorage(() => drive(history, observe).catch((error: unknown) => observe('production error', error instanceof Error ? error.message : String(error))));

const VISIBLE_TO_RESTRICTED: Record<string, Resource[]> = {
  'items': ['D', 'TP', 'X'], 'items status=draft': ['D'], 'items status=private': [],
  'search words with drafts': ['D', 'TP', 'X'], 'search derived with drafts': [], 'search source with drafts': [], 'search words': ['TP', 'X'],
  'reading own': ['TP', 'X'], 'hopper members': ['D', 'TP', 'X'], 'hopper lens': ['TP', 'X'],
};
// Law 6 and 7 for a caller who sees private: drafts, private and public, all of them.
const VISIBLE_TO_OWNER: Record<string, Resource[]> = {
  'items': ['D', 'P', 'TD', 'TP', 'X'], 'items status=private': ['P'],
  'search words with drafts': ['D', 'P', 'TD', 'TP', 'X'], 'search derived with drafts': ['TD', 'TP'], 'search source with drafts': ['P'], 'search words': ['TP', 'X'],
  'reading own': ['P', 'TP', 'X'], 'hopper members': ['D', 'P', 'TD', 'TP', 'X'], 'hopper lens': ['P', 'TP', 'X'],
};

type Expected = Observation[];
// Law 8's shelf half. The ceiling belongs to the stored list (Venkat Rao, 2026-11-24, session 85),
// so the owner's own list may be that long and no longer. A restricted replace leaves every
// hidden entry where it was: walking the stored list, a hidden entry keeps its index and every
// other index takes the caller's next entry; once the caller's list runs out the hidden entries
// close up in order, and whatever the caller sent beyond the stored length follows. Past the
// ceiling, the caller's own tail comes off. A repeated entry keeps its first position (the
// contract's words), so a repeat takes no place from a hidden entry.
const SHELF_CEILING = 1000;
const SHELF_HIDDEN = new Set(['P', 'TD']);
function shelfPlan(history: History & { kind: 'shelf' }) {
  // The token names hidden TD first: naming a hidden entry counts for nothing (law 8), so it keeps its place.
  if (!history.full) return { stored: ['P', 'D', 'X', 'TD'], given: ['TD', 'X', 'X', 'D', 'TP'] };
  const filler = Array.from({ length: SHELF_CEILING - 2 }, (_, i) => `F${i}`);
  return { stored: ['P', 'TD', ...filler], given: ['X', 'D', ...[...filler].reverse()] };
}
function shelfReplace(stored: string[], given: string[]): string[] {
  const rest = [...new Set(given)].filter(label => !SHELF_HIDDEN.has(label)), out: string[] = [];
  for (const label of stored) {
    if (SHELF_HIDDEN.has(label)) out.push(label);
    else if (rest.length) out.push(rest.shift()!);
  }
  return [...out, ...rest].slice(0, SHELF_CEILING);
}

function model(history: History): Expected {
  const out: Expected = [];
  const at = (checkpoint: string, value: unknown) => out.push({ checkpoint, value });
  switch (history.kind) {
    case 'inventory': at('item operation inventory', []); break;
    case 'hidden': for (const operation of [...Object.keys(ITEM_OPERATIONS), 'uploadMedia itemId', 'deleteMedia', 'media bytes', 'avatar']) at('private scope', { operation, same: true }); at('owner avatar', true); at('private scope', { operation: 'batchRead getItem', same: true }); at('no write took effect', true); break;
    case 'default private':
      at('default private', { caller: 'restricted, no visibility', status: 403, code: 'forbidden', message: 'insufficient scope', item: { status: 'draft', version: 0 } });
      at('default private', { caller: 'restricted, public named', status: 200, item: { status: 'public', version: 1 } });
      at('default private', { caller: 'owner:private, no visibility', status: 200, item: { status: 'private', version: 0 } });
      break;
    case 'mcp': for (const [operation, route] of Object.entries(routes)) if (route.path.startsWith('/items/{id}')) at('private scope', { operation: `MCP ${operation}`, same: true }); break;
    case 'references': for (const operation of ['preview link', 'preview quote', 'preview TK source', 'publish link', 'publish tangle part', 'publish tangle thread', 'preview quote in generated text', 'word counts', 'proofread', 'preview tangle', 'generate reading a link', 'publish quote', 'generate TK source']) at('private scope', { operation, same: true });
      for (const caller of ['restricted', 'owner:private']) for (const placement of ['part', 'second part', 'thread']) at('tangle pre-flight', { caller, placement, refused: true, minted: 0, says: caller === 'restricted' ? 'unknown' : 'private' });
      at('tangle pre-flight', { caller: 'restricted', placement: 'clean', status: 200, version: 1, minted: 2 });
      break;
    case 'working copy':
      at('hidden working copy', { operation: 'getItem', status: 200, contentMd: true, leaks: [] });
      at('hidden working copy', { operation: 'preview link', status: 200, resolved: true, leaks: [] });
      for (const operation of ['listItemVersions', 'getVersion', 'getItemFreshness', 'getSyndication', 'getImportedItem', 'getImportedHistory']) at('hidden working copy', { operation, status: 'answered', leaks: [] });
      break;
    case 'lists': for (const [list, visible] of Object.entries(VISIBLE_TO_RESTRICTED)) at('list', { list, status: 200, named: visible, leaks: [] }); at('list', { list: 'hopper lens drafts', marked: [] });
      at('list', { list: 'search marks', private: [], draft: ['D'], once: true }); at('list', { list: 'hopper counts', total: 3 });
      at('list', { list: 'cross-access cursors refused', replays: { items: true, 'hopper members': true, search: true } });
      at('list', { list: 'summary', counts: { all: 3, drafts: 1, public: 2 } }); at('list', { list: 'capabilities', private: false }); at('list', { list: 'browse', leaks: [] }); at('list', { list: 'reading counts', own: 2, private: 0 }); break;
    case 'owner lists': for (const [list, visible] of Object.entries(VISIBLE_TO_OWNER)) at('list', { list, status: 200, named: visible, leaks: [] }); at('list', { list: 'hopper lens drafts', marked: [] });
      at('list', { list: 'search marks', private: ['P'], draft: ['D', 'TD', 'TP'], once: true }); at('list', { list: 'hopper counts', total: 5 });
      at('list', { list: 'owner reference reasons', P: ['item is private'], TD: ['item is a draft, not published'], D: ['item is a draft, not published'], TP: [] });
      for (const kind of ['fragment', 'thread']) at('list', { list: `owner ${kind} preview of the notebook`, source: { ok: true, from: 'you' }, blockReasons: ['item is private'] });
      at('list', { list: 'owner reading counts', private: 1 }); at('list', { list: 'owner capabilities', private: true }); at('list', { list: 'owner browse', namesPrivate: true });
      at('list', { list: 'owner thread reasons', link: ['item is private'], quote: ['item is private'], tangle: ['item is private'] });
      at('list', { list: 'item hoppers', hoppers: [false] }); break;
    case 'clear':
      at('clear action', history.action !== 'provenance patch' ? true : undefined);
      at('taint', history.action === 'discard changes' ? { publish: 200, workingCopyShown: true } : { publishRefused: true, hidden: true });
      break;
    case 'forge': for (const step of ['created', 'patched', 'published']) at('forge', { step, same: true }); at('forge', { step: 'wire', namesPrivate: false }); break;
    case 'refusal': at('refusal', { refused: true, oneAnswer: true, saysWhy: true }); at('refusal private', 200); at('refusal private link', 200); break;
    case 'agentic':
      if (history.turnsPrivate) at('agentic turned private', { readNamesD: false, draftNamesD: false });
      else at('agentic', { status: history.writer === 'owner' ? 200 : 403, responseLeaks: [], storedNamesHidden: history.writer === 'owner', restrictedRead: [403, 403], restrictedReadLeaks: [], restrictedDraftLeaks: [] });
      break;
    case 'masked write': {
      // Refresh is a thread's, so on this fragment it refuses whatever the view; the copy stays.
      const replaced = history.op === 'text edit', discarded = history.op === 'publish';
      at('masked write', { op: history.op, status: 'answered', leaks: [], providerSaw: false, ownerCopy: replaced ? 'replaced' : discarded ? 'discarded' : 'kept', taint: replaced || discarded ? 0 : 1 });
      break;
    }
    case 'search lifecycle': {
      // Law 6: a caller who sees private finds the item at every step by its working copy, marked
      // private while it is private and draft while its working copy is unpublished (a private
      // item's working copy is the notebook, not a draft); a restricted caller never sees it while
      // it is private, and once raised sees what the owner sees.
      const sees = history.caller === 'session';
      for (const [step, status, words, unpublished] of [['draft', 'draft', 'first', true], ['private', 'private', 'first', false], ['private edited', 'private', 'second', false], ['raised', 'public', 'second', false], ['changed', 'public', 'third', true]] as const)
        at('search lifecycle', status === 'private' && !sees ? { step, hits: 0 } : { step, hits: 1, private: status === 'private', draft: unpublished, excerpt: `${LIFECYCLE} ${words} words` });
      break;
    }
    case 'shelf': {
      if (history.turnsPrivate) { at('shelf turned private', { seen: ['D', 'X'], saved: 200, answer: ['X'], owner: ['D', 'X'] }); break; }
      const plan = shelfPlan(history), owner = shelfReplace(plan.stored, plan.given);
      const visible = (list: string[]) => list.filter(label => !SHELF_HIDDEN.has(label));
      at('shelf', { stored: 200, seen: visible(plan.stored), replaced: 200, answer: visible(owner), stale: { status: 409, code: 'revision-conflict', message: 'shelf revision conflict; reload and try again', current: visible(owner) }, owner, savedBack: true, overCeiling: 400 });
      break;
    }
    case 'tk': {
      // The model: the output drew on a private snapshot exactly when the source was private at its
      // first generation; that mark is the server's and nothing in these histories clears it.
      const tainted = history.source === 'private';
      at('tk generation', { status: 200, providerSawSource: true });
      // A private source is named by its latest private version (p1), a public one by v1.
      at('tk provenance', { namesSource: true, version: 1 });
      // The other scope's generation hydrates the draft's links: the first output's [[source]] link
      // survives only for a public source, so only then is the source read again.
      at('tk generation', { status: 200, providerSawSource: history.source === 'public' });
      if (history.then === 'regenerate from public') at('tk generation', { status: 200, providerSawSource: false });
      const firstText = history.then !== 'regenerate from public';
      at('tk outcome', { keptLinks: { x: firstText, source: firstText && history.source === 'public' }, wireAt: !tainted, saved: history.then !== 'regenerate from public', hiddenFromRestricted: tainted, published: !tainted, wireHasDerived: !tainted && history.then !== 'regenerate from public', wireNamesSource: !tainted && history.then !== 'regenerate from public', wireModel: !tainted, ownerSeesMark: tainted });
      break;
    }
    case 'cursor': at('membership first page', { cursor: true }); at('membership cursor', { expired: cursorExpires(history.event), exact: true }); break;
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
    case 'default private': return 'in Notebook mode, a restricted token publishing with no visibility is refused and the draft stays a draft; naming public publishes; a token with owner:private keeps it privately';
    case 'mcp': return `a restricted MCP token learns nothing about ${history.resource === 'P' ? 'a private item' : 'a tainted draft'} on any item tool, in Notebook mode`;
    case 'references': return `a restricted token's previews and publishes name ${history.resource === 'P' ? 'a private item' : 'a tainted draft'} as an unknown one`;
    case 'working copy': return 'a public item with a tainted working copy shows its public version to a restricted token';
    case 'lists': return 'no list, search, reader, hopper or count shows a restricted token a hidden item or working copy';
    case 'owner lists': return `${history.caller === 'session' ? 'the owner\'s session' : 'a token holding owner:private'} sees drafts, private and tainted items in every list and search`;
    case 'clear': return `${history.action} on ${history.target === 'TD' ? 'a tainted draft' : 'a public item\'s tainted changes'} ${history.action === 'discard changes' ? 'removes the mark' : 'keeps the mark'}`;
    case 'forge': return 'client provenance naming a private item is answered as one naming an unknown id';
    case 'refusal': return 'a tainted public publish is refused with one answer whatever became of the source';
    case 'agentic': if (history.turnsPrivate) return 'an Agentic edition naming an item that is then kept privately stops naming it to a restricted token, edition and draft';
      return history.writer === 'owner' ? 'an Agentic edition naming hidden items, written by a caller who sees private, is refused whole to a restricted token, and its composed draft stays hidden' : 'a restricted token is refused the Agentic feed whole: it reads and writes no edition';
    case 'masked write': return `a restricted ${history.op} of a public item with a hidden working copy acts on its public version and leaks nothing`;
    case 'search lifecycle': return `${history.caller === 'session' ? 'the owner' : 'a restricted token'} finds one item through its life, marked as private or draft exactly when it is`;
    case 'shelf': if (history.turnsPrivate) return 'a restricted token saving back a shelf it read before an entry turned private keeps that entry in place, unnamed';
      return history.full ? 'a restricted replace of a full shelf keeps the hidden entries and loses its own tail past the ceiling' : 'a restricted shelf replace keeps hidden entries in place, and the owner can save back what it reads';
    case 'tk': return `TK from a ${history.source} source in the ${history.position} scope, source ${history.fate}, then ${history.then}`;
    case 'cursor': return `${history.reader === 'owner hopper lens' ? 'the owner\'s hopper lens cursor' : 'a restricted hopper cursor'} ${cursorExpires(history.event) ? 'expires on' : 'survives, exactly,'} ${history.event}`;
  }
};
const scopeHistories: History[] = [{ kind: 'inventory' }, { kind: 'hidden', resource: 'P' }, { kind: 'hidden', resource: 'TD' }, { kind: 'references', resource: 'P' }, { kind: 'references', resource: 'TD' }, { kind: 'mcp', resource: 'P' }, { kind: 'mcp', resource: 'TD' }, { kind: 'default private' }];
const leakHistories: History[] = [{ kind: 'agentic', writer: 'owner' }, { kind: 'agentic', writer: 'restricted' }, { kind: 'shelf' }, { kind: 'working copy' }, { kind: 'lists' }, { kind: 'owner lists', caller: 'session' }, { kind: 'owner lists', caller: 'token' }, { kind: 'search lifecycle', caller: 'session' }, { kind: 'search lifecycle', caller: 'restricted' }, ...MASKED_OPS.map(op => ({ kind: 'masked write' as const, op })), { kind: 'agentic', writer: 'owner', turnsPrivate: true }];
const taintHistories: History[] = [...CLEARS.map(clear => ({ kind: 'clear' as const, ...clear })), { kind: 'forge' }];
const blockHistories: History[] = [{ kind: 'refusal' }];
const shelfHistories: History[] = [{ kind: 'shelf' }, { kind: 'shelf', full: true }, { kind: 'shelf', turnsPrivate: true }];
const tkHistories: History[] = [
  ...(['first', 'second'] as const).flatMap(position => (['kept', 'raised', 'discarded'] as const).map(fate => ({ kind: 'tk' as const, source: 'private' as const, position, fate, then: 'nothing' as const }))),
  ...(['regenerate from public', 'edit the other scope'] as const).map(then => ({ kind: 'tk' as const, source: 'private' as const, position: 'second' as const, fate: 'kept' as const, then })),
  ...(['first', 'second'] as const).map(position => ({ kind: 'tk' as const, source: 'public' as const, position, fate: 'kept' as const, then: 'nothing' as const })),
];
const cursorHistories: History[] = [
  ...(['unrelated draft edit', 'unrelated public edit', 'member made private', 'member tainted', 'hidden member raised', 'private member keeps p2'] as const).map(event => ({ kind: 'cursor' as const, event, reader: 'restricted memberships' as const })),
  ...(['unrelated draft edit', 'member made private'] as const).map(event => ({ kind: 'cursor' as const, event, reader: 'owner hopper lens' as const })),
];
const AUTHORITY = 'blygger-spec docs/sealed-content-build-plan.md §1 0f; decisions by Venkat Rao (GitHub vgururao): private scope and no leak (2026-11-23), private taint and "hidden is not gone" (2026-11-24, session 84), Q1 server-only taint, Q2 hide the working copy, Q3 change signals a stated limit (2026-11-24, session 85).';
const LIMITS = 'One owner, one hopper, fragments, one restricted scope set (rest-permissions-notebook and mcp-notebook cross every subset). Revisions, ETags, dirty flags and cursor expiry are not compared (Q3). Catch-up is not judged here.';

oracleProperty({
  id: 'private-scope-hidden-items', owns: ['src/operation-runner.ts#executeOperation', 'src/private-access.ts', 'src/transclusion.ts#resolveTarget', 'src/read-api.ts#getItemOperation', 'src/read-api.ts#listItemsOperation', 'src/read-api.ts#searchOperation', 'src/read-api.ts#project', 'src/read-api.ts#listHopperMembershipsOperation', 'src/model.ts#publishScoped', 'src/model.ts#publish', 'src/model.ts#publishPrivately', 'src/transclusion.ts#linkEntries', 'src/read-api.ts#getCapabilitiesOperation', 'src/api.ts#updateItemOperation', 'src/api.ts#createItemOperation', 'src/tk-generate.ts#runGenerateScope', 'src/read-api.ts#previewOperation', 'src/read-api.ts#threadPreview', 'src/read-api.ts#previewTangles', 'src/read-api.ts#getHopperOperation', 'src/read-api.ts#getItemSummaryOperation', 'src/read-api.ts#listReadingOperation', 'src/read-api.ts#getReadingSummaryOperation', 'src/authoring.ts#scopeSummariesWithSources', 'src/tk-generate.ts#privateSource', 'src/transclusion.ts#resolveInternalLinks', 'src/transclusion.ts#previewInternalLinks', 'src/transclusion.ts#previewTransclusions', 'src/mcp.ts', 'src/agentic.ts#writeThread', 'src/api.ts#getAgenticOperation', 'src/api.ts#putAgenticOperation', 'src/api.ts#uploadMediaOperation', 'src/api.ts#deleteMediaOperation', 'src/api.ts#updateSettingsOperation', 'src/api.ts#publishItemOperation', 'src/api.ts#publishAndNotify', 'src/api.ts#publishTangled', 'src/api.ts#generateItemOperation', 'src/read-api.ts#listBrowseOperation'],
  law: { statement: 'For every restricted caller, every hidden item and every operation that names an own item, the answer equals the answer for an id that does not exist, ids aside, is not a server error, and no write takes effect.', authority: AUTHORITY, limits: LIMITS },
  histories: scopeHistories, label: describe, model, driver, check,
  calibrations: [{ name: 'a private item answers 200 to getItem', law: 'private scope laws', history: { enumerated: 1 }, corrupt: trace => trace.map((entry, index) => index === 0 ? { ...entry, value: { ...(entry.value as object), same: false } } : entry) }],
});
oracleProperty({
  id: 'private-scope-no-leak', owns: ['src/operation-runner.ts#executeOperation', 'src/private-access.ts', 'src/transclusion.ts#resolveTarget', 'src/read-api.ts#getItemOperation', 'src/read-api.ts#listItemsOperation', 'src/read-api.ts#searchOperation', 'src/read-api.ts#project', 'src/read-api.ts#listHopperMembershipsOperation', 'src/model.ts#publishScoped', 'src/model.ts#publish', 'src/model.ts#publishPrivately', 'src/transclusion.ts#linkEntries', 'src/read-api.ts#getCapabilitiesOperation', 'src/api.ts#updateItemOperation', 'src/api.ts#createItemOperation', 'src/tk-generate.ts#runGenerateScope', 'src/read-api.ts#previewOperation', 'src/read-api.ts#threadPreview', 'src/read-api.ts#previewTangles', 'src/read-api.ts#getHopperOperation', 'src/read-api.ts#getItemSummaryOperation', 'src/read-api.ts#listReadingOperation', 'src/read-api.ts#getReadingSummaryOperation', 'src/authoring.ts#scopeSummariesWithSources', 'src/tk-generate.ts#privateSource', 'src/transclusion.ts#resolveInternalLinks', 'src/transclusion.ts#previewInternalLinks', 'src/transclusion.ts#previewTransclusions', 'src/mcp.ts', 'src/agentic.ts#writeThread', 'src/api.ts#getAgenticOperation', 'src/api.ts#putAgenticOperation', 'src/api.ts#uploadMediaOperation', 'src/api.ts#deleteMediaOperation', 'src/api.ts#updateSettingsOperation', 'src/api.ts#publishItemOperation', 'src/api.ts#publishAndNotify', 'src/api.ts#publishTangled', 'src/api.ts#generateItemOperation', 'src/read-api.ts#listBrowseOperation'],
  law: { statement: 'For every response to a restricted caller, no hidden item\'s id or text and no hidden working copy\'s text appears, and no list or count includes a hidden item; a public item with a hidden working copy stays visible as its latest public version. A caller who sees private sees drafts, private and tainted items in every list.', authority: AUTHORITY, limits: LIMITS },
  histories: leakHistories, label: describe, model, driver, check,
  calibrations: [{ name: 'a tainted draft listed for a restricted token', law: 'private scope laws', history: { enumerated: 4 }, corrupt: trace => trace.map((entry, index) => index === 0 ? { ...entry, value: { ...(entry.value as object), named: ['D', 'TD', 'TP', 'X'] } } : entry) }],
});
oracleProperty({
  id: 'private-scope-taint', owns: ['src/operation-runner.ts#executeOperation', 'src/private-access.ts', 'src/transclusion.ts#resolveTarget', 'src/read-api.ts#getItemOperation', 'src/read-api.ts#listItemsOperation', 'src/read-api.ts#searchOperation', 'src/read-api.ts#project', 'src/read-api.ts#listHopperMembershipsOperation', 'src/model.ts#publishScoped', 'src/model.ts#publish', 'src/model.ts#publishPrivately', 'src/transclusion.ts#linkEntries', 'src/read-api.ts#getCapabilitiesOperation', 'src/api.ts#updateItemOperation', 'src/api.ts#createItemOperation', 'src/tk-generate.ts#runGenerateScope', 'src/read-api.ts#previewOperation', 'src/read-api.ts#threadPreview', 'src/read-api.ts#previewTangles', 'src/read-api.ts#getHopperOperation', 'src/read-api.ts#getItemSummaryOperation', 'src/read-api.ts#listReadingOperation', 'src/read-api.ts#getReadingSummaryOperation', 'src/authoring.ts#scopeSummariesWithSources', 'src/tk-generate.ts#privateSource', 'src/transclusion.ts#resolveInternalLinks', 'src/transclusion.ts#previewInternalLinks', 'src/transclusion.ts#previewTransclusions', 'src/mcp.ts', 'src/agentic.ts#writeThread', 'src/api.ts#getAgenticOperation', 'src/api.ts#putAgenticOperation', 'src/api.ts#uploadMediaOperation', 'src/api.ts#deleteMediaOperation', 'src/api.ts#updateSettingsOperation', 'src/api.ts#publishItemOperation', 'src/api.ts#publishAndNotify', 'src/api.ts#publishTangled', 'src/api.ts#generateItemOperation', 'src/read-api.ts#listBrowseOperation'],
  law: { statement: 'For every working copy, no client body, hand edit of the TK markers, raise or discard of the source, or regeneration from public sources clears the private-taint mark; discarding the working copy removes it; client-supplied provenance naming a private item is answered as one naming an unknown id.', authority: AUTHORITY, limits: LIMITS },
  histories: taintHistories, label: describe, model, driver, check,
  calibrations: [{ name: 'unwrapping the markers publishes publicly', law: 'private scope laws', history: { enumerated: 2 }, corrupt: trace => trace.map(entry => entry.checkpoint === 'taint' ? { ...entry, value: { ...(entry.value as object), publishRefused: false } } : entry) }],
});
oracleProperty({
  id: 'private-scope-publish-block', owns: ['src/operation-runner.ts#executeOperation', 'src/private-access.ts', 'src/transclusion.ts#resolveTarget', 'src/read-api.ts#getItemOperation', 'src/read-api.ts#listItemsOperation', 'src/read-api.ts#searchOperation', 'src/read-api.ts#project', 'src/read-api.ts#listHopperMembershipsOperation', 'src/model.ts#publishScoped', 'src/model.ts#publish', 'src/model.ts#publishPrivately', 'src/transclusion.ts#linkEntries', 'src/read-api.ts#getCapabilitiesOperation', 'src/api.ts#updateItemOperation', 'src/api.ts#createItemOperation', 'src/tk-generate.ts#runGenerateScope', 'src/read-api.ts#previewOperation', 'src/read-api.ts#threadPreview', 'src/read-api.ts#previewTangles', 'src/read-api.ts#getHopperOperation', 'src/read-api.ts#getItemSummaryOperation', 'src/read-api.ts#listReadingOperation', 'src/read-api.ts#getReadingSummaryOperation', 'src/authoring.ts#scopeSummariesWithSources', 'src/tk-generate.ts#privateSource', 'src/transclusion.ts#resolveInternalLinks', 'src/transclusion.ts#previewInternalLinks', 'src/transclusion.ts#previewTransclusions', 'src/mcp.ts', 'src/agentic.ts#writeThread', 'src/api.ts#getAgenticOperation', 'src/api.ts#putAgenticOperation', 'src/api.ts#uploadMediaOperation', 'src/api.ts#deleteMediaOperation', 'src/api.ts#updateSettingsOperation', 'src/api.ts#publishItemOperation', 'src/api.ts#publishAndNotify', 'src/api.ts#publishTangled', 'src/api.ts#generateItemOperation', 'src/read-api.ts#listBrowseOperation'],
  law: { statement: 'For every tainted working copy, a public publish is refused with one answer whatever became of the source, and a tainted draft may still be published privately.', authority: AUTHORITY, limits: LIMITS },
  histories: blockHistories, label: describe, model, driver, check,
  calibrations: [{ name: 'a raised source lets the output go public', law: 'private scope laws', history: { enumerated: 0 }, corrupt: trace => trace.map(entry => entry.checkpoint === 'refusal' ? { ...entry, value: { ...(entry.value as object), refused: false } } : entry) }],
});
oracleProperty({
  id: 'private-scope-shelf', owns: ['src/shelf.ts', 'src/api.ts#putShelfOperation', 'src/api.ts#getShelfOperation'],
  law: { statement: 'For every replace of the shelf by a restricted caller, the hidden entries it cannot see keep their places and any overflow past the 1,000-entry ceiling comes off the end of its own list; the owner can always save back the list it reads, and no stored list is longer than the ceiling.', authority: 'blygger-spec docs/sealed-content-build-plan.md §1 0f law 8; decision by Venkat Rao (GitHub vgururao), 2026-11-24 (session 85): the shelf has no product cap, only a technical ceiling of 1,000 entries on the stored list.', limits: 'One restricted scope, own entries only (imported entries are never hidden).' },
  histories: shelfHistories, label: describe, model, driver, check,
  calibrations: [{ name: 'the full shelf keeps the restricted tail past the ceiling', law: 'private scope laws', history: { enumerated: 1 }, corrupt: trace => trace.map(entry => entry.checkpoint === 'shelf' ? { ...entry, value: { ...(entry.value as { owner: string[] }), owner: [...(entry.value as { owner: string[] }).owner, 'F0'] } } : entry) }],
});
oracleProperty({
  id: 'private-scope-hopper-cursor', owns: ['src/operation-runner.ts#executeOperation', 'src/private-access.ts', 'src/transclusion.ts#resolveTarget', 'src/read-api.ts#getItemOperation', 'src/read-api.ts#listItemsOperation', 'src/read-api.ts#searchOperation', 'src/read-api.ts#project', 'src/read-api.ts#listHopperMembershipsOperation', 'src/model.ts#publishScoped', 'src/model.ts#publish', 'src/model.ts#publishPrivately', 'src/transclusion.ts#linkEntries', 'src/read-api.ts#getCapabilitiesOperation', 'src/api.ts#updateItemOperation', 'src/api.ts#createItemOperation', 'src/tk-generate.ts#runGenerateScope', 'src/read-api.ts#previewOperation', 'src/read-api.ts#threadPreview', 'src/read-api.ts#previewTangles', 'src/read-api.ts#getHopperOperation', 'src/read-api.ts#getItemSummaryOperation', 'src/read-api.ts#listReadingOperation', 'src/read-api.ts#getReadingSummaryOperation', 'src/authoring.ts#scopeSummariesWithSources', 'src/tk-generate.ts#privateSource', 'src/transclusion.ts#resolveInternalLinks', 'src/transclusion.ts#previewInternalLinks', 'src/transclusion.ts#previewTransclusions', 'src/mcp.ts', 'src/agentic.ts#writeThread', 'src/api.ts#getAgenticOperation', 'src/api.ts#putAgenticOperation', 'src/api.ts#uploadMediaOperation', 'src/api.ts#deleteMediaOperation', 'src/api.ts#updateSettingsOperation', 'src/api.ts#publishItemOperation', 'src/api.ts#publishAndNotify', 'src/api.ts#publishTangled', 'src/api.ts#generateItemOperation', 'src/read-api.ts#listBrowseOperation'],
  law: { statement: 'For every restricted caller paging a hopper\'s members, the cursor expires when a member\'s visibility to that caller changes and survives an unrelated item edit.', authority: AUTHORITY + ' docs/api.md: unrelated changes do not expire a cursor.', limits: LIMITS },
  histories: cursorHistories, label: describe, model, driver, check,
  calibrations: [{ name: 'an unrelated edit expires the cursor', law: 'private scope laws', history: { enumerated: 0 }, corrupt: trace => trace.map(entry => entry.checkpoint === 'membership cursor' ? { ...entry, value: { ...(entry.value as object), expired: true } } : entry) }],
});
oracleProperty({
  id: 'private-scope-tk-lifecycle', owns: ['src/tk-generate.ts#runGenerateScope', 'src/tk-generate.ts#privateSource', 'src/api.ts#generateItemOperation', 'src/model.ts#publishScoped', 'src/item-revision.ts#installWorkingCopy', 'src/model.ts#restoreVersion'],
  law: { statement: 'For every TK generation through the route by a caller who sees private, output drawn from a private snapshot, in either scope position, keeps its draft hidden from restricted callers and refuses public publication whatever becomes of the source or the other scope; output drawn only from public sources publishes, with its words and sources on the wire.', authority: AUTHORITY, limits: 'Two-scope fragments, one private or public source, the Anthropic adapter answered by a fixture. Regeneration replaces the instruction\'s source; editing by hand touches only the other scope.' },
  histories: tkHistories, label: describe, model, driver, check,
  calibrations: [{ name: 'a raised source unseals the output', law: 'private scope laws', history: { enumerated: 1 }, corrupt: trace => trace.map(entry => entry.checkpoint === 'tk outcome' ? { ...entry, value: { ...(entry.value as object), published: true } } : entry) }],
});
