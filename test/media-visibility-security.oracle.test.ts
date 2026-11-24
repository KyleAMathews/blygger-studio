/** Media becomes public when it is published publicly, and stays public after
 * withdrawal. Media used only by private versions stays private. This oracle checks real uploads, private reads, pins and avatar changes at the
 * mounted Worker. It owns retention and the owner API's media authority boundary.
 *
 * GET /blyg/media/private.png // → 404 anonymously, 200/no-store for owner reads
 * POST /blyg/api/items/id/publish // → referenced media becomes public
 * POST /blyg/api/items/id/publish({visibility: 'private'}) // → its media stays private
 * POST /blyg/api/items/id/withdraw // → previously published bytes remain public
 * PATCH /blyg/api/settings({avatarMediaId}) // → requires manage and publish
 *
 * An unused inline upload on a withdrawn item is still private. The item having
 * publication history is enough for an appended attachment, but not for inline
 * bytes that no published text showed. Protocol §5.4 keeps a published media URL
 * serving the same bytes; §9 says withdrawal does not cascade. docs/client-access
 * separates read, draft, manage and publish authority at every resource endpoint.
 *
 * For every enumerated lifecycle, anonymous reads reflect whether public
 * publication used the bytes; a private publication never does (decision by
 * Venkat Rao (GitHub vgururao), 2026-11-22), so bytes that only private
 * versions showed stay private until a public version shows them; authorized private reads are HTTPS-only and no-store; published
 * bytes survive pins, later versions and all withdrawals. Avatar selection needs
 * publish beside manage, over REST and MCP. The independent model below tracks
 * only publication use, item references and live grant scopes. Driver IDs and
 * credentials are local handles, never model inputs or trace output.
 *
 * Histories are the complete original lifecycle/credential/transport schedules.
 * The driver records response statuses and selected byte/cache observations at
 * each response. Limits: local D1/R2 and these reference syntaxes, not cache recall
 * or deployed ingress. No production visibility helper supplies expectations.
 */
import { differs, oracleProperty, pass, type Observation } from '@tanstack/oracles';
import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { makeApp } from '../src/index.ts';
import { testItemRevision, testRevisionBody } from './helpers.ts';
import { withOracleStorage } from './oracle-storage.ts';

type MediaAction =
  | { op: 'create'; item: string; text: string; refs?: string[] }
  | { op: 'upload'; media: string; item?: string; inline?: boolean; bytes?: string; grant?: string }
  | { op: 'edit'; item: string; text: string; refs?: string[] }
  | { op: 'publish' | 'keep' | 'pin' | 'withdraw'; item: string }
  | { op: 'read'; media: string; principal?: string; cleartext?: boolean; bytes?: boolean; cache?: boolean }
  | { op: 'mint'; grant: string; scope: string[]; resource?: 'api' | 'mcp' }
  | { op: 'revoke'; grant: string }
  | { op: 'avatar'; media: string; grant: string; transport?: 'mcp' }
  | { op: 'setting'; grant: string; title: string }
  | { op: 'clear-avatar' };
type Action = MediaAction & { checkpoint?: string };
type History = { name: string; ownerFixture?: 'oauth'; actions: Action[] };
const bytes = 'private fixture bytes';
const histories: History[] = [
  { name: 'unattached uploads stay private while owner previews remain usable', actions: [{ op: 'upload', media: 'a' }, { op: 'read', media: 'a', checkpoint: 'draft bytes are not anonymous publications' }, { op: 'read', media: 'a', principal: 'owner', bytes: true, cache: true }] },
  ...[false, true].map(inline => ({ name: `publication releases its actually visible media (inline=${inline})`, actions: [
    { op: 'create', item: 'a', text: 'Media lifecycle' }, { op: 'upload', media: 'a', item: 'a', inline }, { op: 'read', media: 'a' },
    ...(inline ? [{ op: 'edit', item: 'a', text: '', refs: ['a'] }] : []),
    { op: 'publish', item: 'a' }, { op: 'read', media: 'a' }, { op: 'pin', item: 'a' }, { op: 'edit', item: 'a', text: 'New version without inline image' },
    { op: 'publish', item: 'a' }, { op: 'read', media: 'a' }, { op: 'withdraw', item: 'a' }, { op: 'read', media: 'a' },
  ] as Action[] })),
  ...[false, true].map(inline => ({ name: `withdrawal keeps published media and leaves later uploads private (inline=${inline})`, actions: [
    { op: 'create', item: 'a', text: 'Withdrawn media' }, { op: 'upload', media: 'a', item: 'a', inline },
    ...(inline ? [{ op: 'edit', item: 'a', text: '', refs: ['a'] }] : []),
    { op: 'publish', item: 'a' }, { op: 'read', media: 'a' }, { op: 'withdraw', item: 'a' }, { op: 'read', media: 'a', bytes: true, checkpoint: 'a published media URL keeps serving after withdrawal' },
    ...(inline ? [{ op: 'upload', media: 'later', item: 'a', inline: true, bytes: 'later fixture bytes' }, { op: 'read', media: 'later' }] : []),
  ] as Action[] })),
  { name: 'an inline upload not placed in published text remains private', actions: [{ op: 'create', item: 'a', text: 'No image' }, { op: 'upload', media: 'a', item: 'a', inline: true }, { op: 'publish', item: 'a' }, { op: 'read', media: 'a' }] },
  ...[false, true].map(inline => ({ name: `bytes shown only by private versions stay private until raised (inline=${inline})`, actions: [
    { op: 'create', item: 'a', text: 'Kept media' }, { op: 'upload', media: 'a', item: 'a', inline },
    ...(inline ? [{ op: 'edit', item: 'a', text: '', refs: ['a'] }] : []),
    { op: 'keep', item: 'a' }, { op: 'read', media: 'a', checkpoint: 'a private publication publishes no bytes' },
    { op: 'upload', media: 'later', item: 'a', bytes: 'later kept fixture bytes' }, { op: 'read', media: 'later' }, { op: 'keep', item: 'a' }, { op: 'read', media: 'a' },
    { op: 'publish', item: 'a' }, { op: 'read', media: 'a' }, { op: 'read', media: 'later' },
  ] as Action[] })),
  { name: 'an inline image dropped before raising stays private', actions: [
    { op: 'create', item: 'a', text: 'Kept inline' }, { op: 'upload', media: 'a', item: 'a', inline: true },
    { op: 'edit', item: 'a', text: '', refs: ['a'] }, { op: 'keep', item: 'a' }, { op: 'edit', item: 'a', text: 'Raised without it' },
    { op: 'publish', item: 'a' }, { op: 'read', media: 'a', checkpoint: 'bytes only a private version showed stay private' },
  ] },
  { name: 'private bytes require live read authority, not merely a draft token', actions: [
    { op: 'upload', media: 'a' }, { op: 'mint', grant: 'read', scope: ['owner:read'] }, { op: 'mint', grant: 'draft', scope: ['owner:draft'] },
    { op: 'read', media: 'a', principal: 'read', cache: true }, { op: 'read', media: 'a', principal: 'draft' },
    { op: 'read', media: 'a', principal: 'read', cleartext: true, checkpoint: 'private bytes cannot be read over non-loopback cleartext transport' }, { op: 'read', media: 'a', principal: 'owner', cleartext: true, checkpoint: 'private bytes cannot be read over non-loopback cleartext transport' },
    { op: 'revoke', grant: 'read' }, { op: 'read', media: 'a', principal: 'read' },
  ] },
  { name: 'media shown by two items survives both withdrawals', actions: [
    { op: 'create', item: 'owner', text: 'Owner of the bytes' }, { op: 'upload', media: 'a', item: 'owner', inline: true },
    { op: 'edit', item: 'owner', text: '', refs: ['a'] }, { op: 'publish', item: 'owner' },
    { op: 'create', item: 'borrower', text: 'Borrowed', refs: ['a'] }, { op: 'publish', item: 'borrower' },
    { op: 'withdraw', item: 'owner' }, { op: 'read', media: 'a' }, { op: 'withdraw', item: 'borrower' }, { op: 'read', media: 'a' },
  ] },
  { name: 'choosing the avatar requires publish scope over REST and MCP', ownerFixture: 'oauth', actions: [
    { op: 'mint', grant: 'without', scope: ['owner:draft', 'owner:manage'] }, { op: 'mint', grant: 'with', scope: ['owner:draft', 'owner:manage', 'owner:publish'] },
    { op: 'upload', media: 'a', bytes: 'avatar fixture bytes', grant: 'without' }, { op: 'avatar', media: 'a', grant: 'without', checkpoint: 'draft+manage cannot publish bytes as the avatar' }, { op: 'read', media: 'a' },
    { op: 'setting', grant: 'without', title: 'Still manageable' }, { op: 'mint', grant: 'mcp', scope: ['owner:draft', 'owner:manage'], resource: 'mcp' },
    { op: 'avatar', media: 'a', grant: 'mcp', transport: 'mcp' }, { op: 'read', media: 'a' },
    { op: 'avatar', media: 'a', grant: 'with' }, { op: 'read', media: 'a' }, { op: 'clear-avatar' },
  ] },
];
// This model-only state combines publication use from any item's historical
// snapshots into one monotone media flag: §5.4 makes later withdrawal irrelevant.
function model(history: History) {
  const items = new Map<string, { ever: boolean; refs: string[] }>();
  const media = new Map<string, { public: boolean; bytes: string; item?: string; inline: boolean }>();
  const grants = new Map<string, { scope: string[]; revoked: boolean }>();
  const expected: Observation[] = [];
  if (!history.ownerFixture) expected.push({ checkpoint: 'media owner login', value: 302 });
  history.actions.forEach((action, index) => {
    let value: unknown;
    switch (action.op) {
      case 'create': items.set(action.item, { ever: false, refs: action.refs ?? [] }); value = 201; break;
      case 'upload': media.set(action.media, { public: !!action.item && !action.inline && !!items.get(action.item)?.ever, bytes: action.bytes ?? bytes, item: action.item, inline: !!action.inline }); value = 201; break;
      case 'edit': items.get(action.item)!.refs = action.refs ?? []; value = 200; break;
      case 'publish': {
        const item = items.get(action.item)!; item.ever = true;
        for (const [key, file] of media) if ((file.item === action.item && !file.inline) || item.refs.includes(key)) file.public = true;
        value = 200; break;
      }
      // A private publication is not a publication of bytes (owner ruling, 2026-11-22).
      case 'keep': case 'pin': case 'withdraw': case 'clear-avatar': value = 200; break;
      case 'mint': grants.set(action.grant, { scope: action.scope, revoked: false }); value = 200; break;
      case 'revoke': grants.get(action.grant)!.revoked = true; value = 200; break;
      case 'avatar': {
        const grant = grants.get(action.grant)!;
        const allowed = !grant.revoked && grant.scope.includes('owner:manage') && grant.scope.includes('owner:publish');
        if (allowed) media.get(action.media)!.public = true;
        if (action.transport === 'mcp') return; // Original receiving witness checks the following public read.
        value = allowed ? 200 : 403; break;
      }
      case 'setting': value = grants.get(action.grant)!.scope.includes('owner:manage') ? 200 : 403; break;
      case 'read': {
        const file = media.get(action.media)!, grant = action.principal ? grants.get(action.principal) : undefined;
        const privateAccess = !action.cleartext && (action.principal === 'owner' || !!grant && !grant.revoked && grant.scope.includes('owner:read'));
        const status = file.public || privateAccess ? 200 : 404;
        value = { status, ...(action.bytes ? { bytes: status === 200 ? file.bytes : undefined } : {}), ...(action.cache ? { cache: file.public ? undefined : 'no-store' } : {}) }; break;
      }
    }
    expected.push({ checkpoint: action.checkpoint ?? `media action ${index}: ${action.op}`, value });
  });
  return expected;
}
async function driver(history: History, observe: (checkpoint: string, value: unknown) => void) {
  await withOracleStorage(async () => {
    const app = makeApp('/blyg'), origin = 'https://media-review.example.test';
    const receive = async (path: string, init: RequestInit = {}, cleartext = false) => {
      const ctx = createExecutionContext();
      const response = await app.fetch(new Request((cleartext ? origin.replace('https:', 'http:') : origin) + path, init), env, ctx);
      await waitOnExecutionContext(ctx); return response;
    };
    const oauth = history.ownerFixture ? await (await import('./oauth-flow-driver.ts')).flow() : undefined;
    let cookie = oauth?.owner;
    if (!cookie) {
      const login = await receive('/blyg/studio/login', { method: 'POST', headers: { 'CF-Connecting-IP': 'fd00:' + crypto.randomUUID().replaceAll('-', '').match(/.{4}/g)!.slice(0, 7).join(':') }, body: new URLSearchParams({ password: env.OWNER_PASSWORD }) });
      observe('media owner login', login.status);
      const header = login.headers.get('set-cookie'); if (!header) throw new Error('Media fixture login supplied no owner cookie'); cookie = header.split(';')[0];
    }
    const request = oauth ? oauth.request : receive;
    const itemIds = new Map<string, string>(), files = new Map<string, { id: string; url: string }>(), grants = new Map<string, { id: string; token: string }>();
    const auth = (grant?: string): Record<string, string> => grant ? { Authorization: 'Bearer ' + grants.get(grant)!.token } : { cookie: cookie! };
    const owner = async (path: string, method = 'GET', body?: unknown, grant?: string) => {
      body = await testRevisionBody(method, path, body);
      return request(path, { method, headers: { ...auth(grant), 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    };
    const content = (text: string, refs?: string[]) => [text, ...(refs ?? []).map(key => `![image](${files.get(key)!.url})`)].filter(Boolean).join(' ');
    for (let index = 0; index < history.actions.length; index++) {
      const action = history.actions[index]; let value: unknown;
      switch (action.op) {
        case 'create': { const response = await owner('/blyg/api/items', 'POST', { contentMd: content(action.text, action.refs) }); value = response.status; itemIds.set(action.item, (await response.json() as { id: string }).id); break; }
        case 'upload': {
          const form = new FormData(); form.set('file', new File([action.bytes ?? bytes], action.grant ? 'avatar.png' : 'private.png', { type: 'image/png' }));
          if (action.item) { const id = itemIds.get(action.item)!; form.set('itemId', id); form.set('expectedRevision', String(await testItemRevision(id))); }
          if (action.inline) form.set('inline', 'true');
          const response = await request('/blyg/api/media', { method: 'POST', headers: auth(action.grant), body: form }); value = response.status; files.set(action.media, await response.json() as { id: string; url: string }); break;
        }
        case 'edit': value = (await owner('/blyg/api/items/' + itemIds.get(action.item), 'PATCH', { contentMd: content(action.text, action.refs) })).status; break;
        case 'publish': case 'withdraw': value = (await owner('/blyg/api/items/' + itemIds.get(action.item) + '/' + action.op, 'POST', action.op === 'withdraw' ? {} : undefined)).status; break;
        case 'keep': value = (await owner('/blyg/api/items/' + itemIds.get(action.item) + '/publish', 'POST', { visibility: 'private' })).status; break;
        case 'pin': value = (await owner('/blyg/api/items/' + itemIds.get(action.item) + '/versions/1/pin', 'PUT')).status; break;
        case 'mint': { const response = await owner('/blyg/api/authorizations', 'POST', { name: 'Media ' + action.grant, scope: action.scope, resource: action.resource ?? 'api' }); value = response.status; const body = await response.json() as { authorization: { id: string }; accessToken: string }; grants.set(action.grant, { id: body.authorization.id, token: body.accessToken }); break; }
        case 'revoke': value = (await owner('/blyg/api/authorizations/' + grants.get(action.grant)!.id, 'DELETE')).status; break;
        case 'avatar': {
          if (action.transport === 'mcp') {
            const response = await request('/blyg/studio/mcp', { method: 'POST', headers: { ...auth(action.grant), 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', 'mcp-protocol-version': '2026-07-28', 'mcp-method': 'tools/call', 'mcp-name': 'updateSettings' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'updateSettings', arguments: { body: { avatarMediaId: files.get(action.media)!.id } }, _meta: { 'io.modelcontextprotocol/protocolVersion': '2026-07-28', 'io.modelcontextprotocol/clientCapabilities': {} } } }) });
            await response.json(); continue;
          }
          value = (await owner('/blyg/api/settings', 'PATCH', { avatarMediaId: files.get(action.media)!.id }, action.grant)).status; break;
        }
        case 'setting': value = (await owner('/blyg/api/settings', 'PATCH', { siteTitle: action.title }, action.grant)).status; break;
        case 'clear-avatar': value = (await owner('/blyg/api/settings', 'PATCH', { avatarMediaId: '' })).status; break;
        case 'read': {
          const response = await receive(new URL(files.get(action.media)!.url).pathname, { headers: action.principal ? auth(action.principal === 'owner' ? undefined : action.principal) : {} }, !!action.cleartext);
          value = { status: response.status, ...(action.bytes ? { bytes: await response.text() } : {}), ...(action.cache ? { cache: response.headers.get('cache-control') } : {}) }; break;
        }
      }
      observe(action.checkpoint ?? `media action ${index}: ${action.op}`, value);
    }
  });
  observe('media lifecycle completed', true);
}
oracleProperty({
  id: 'media-visibility-security', owns: ['src/media-retention.ts', 'src/owner-api.ts#createOwnerApi', 'src/index.ts#serveMedia', 'src/operation-policy.ts#resolve'],
  law: { statement: 'For every enumerated media lifecycle, public publication makes used bytes public permanently and private publication never does; private reads require live HTTPS read authority and no-store; avatar selection requires manage plus publish across REST and MCP.', authority: 'Owner media-privacy ruling; decision by Venkat Rao (GitHub vgururao), 2026-11-22: media used only by private versions stays private; protocol §§5.4 and 9; docs/client-access.md scope contract; docs/auth-security-oracles.md media receiving witnesses.', limits: 'All original named lifecycle, private publication, attachment/inline, private credential, transport and avatar histories in local D1/R2. No public-cache recall or production ingress claim.' },
  histories, label: history => history.name, model, driver,
  check: (_history, trace, expected) => {
    const actual = trace.filter(entry => entry.checkpoint !== 'media lifecycle completed');
    for (let index = 0; index < actual.length; index++) { const mismatch = differs(actual[index].checkpoint, 'media publication authority', actual[index], expected[index]); if (mismatch) return mismatch; }
    return trace.some(entry => entry.checkpoint === 'media lifecycle completed') ? differs('media lifecycle completion', 'media publication authority', actual.length, expected.length) ?? pass : pass;
  },
  calibrations: [{ name: 'unattached bytes become public', law: 'media publication authority', history: { enumerated: 0 }, corrupt: trace => trace.map(entry => entry.checkpoint === 'draft bytes are not anonymous publications' ? { ...entry, value: { status: 200 } } : entry) }],
});
