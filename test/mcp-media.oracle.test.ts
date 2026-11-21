/** MCP media keeps the multipart upload's bytes, MIME and attachment authority.
 * The receiving boundary is mounted tools/call plus REST, D1 and R2 reads.
 *
 * tools/call(uploadMedia, fiveMiBFile) // → accepted, unchanged bytes
 * tools/call(uploadMedia, malformedBase64) // → tool error, no storage writes
 * tools/call(uploadMedia, publishedItem) // → needs draft and publish
 * tools/list() // → uploadMedia only when drafting is granted
 *
 * Base64 expands the file: a five-MiB decoded file must still fit the eight-MiB
 * MCP envelope. docs/client-access separates draft uploads from publication.
 * For every enumerated upload history, decoded file size/type and live scopes
 * determine admission; refusals preserve storage; accepted bytes and metadata
 * agree with multipart REST. Repeating an attached file returns the existing row
 * without another write, even when the caller has only drafting permission.
 *
 * Histories below contain file descriptors, scopes and actual actions. The pure
 * model uses the independently stated five/eight-MiB policy, MIME table and
 * publication state. The driver records responses and explicit transport/byte/
 * snapshot relations, never expected operands. IDs and credentials stay behind
 * stable history handles. Checks compare at each completed HTTP/tool response.
 * Limits: all original fixed media histories; no exhaustive decoder, decompression
 * bomb or production R2 audit. MCP envelope policy is local, not an MCP standard.
 */
import { differs, oracleProperty, pass, type Observation } from '@tanstack/oracles';
import { equals, iterableEquality } from '@vitest/expect';
import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { makeApp } from '../src/index.ts';
import { testItemRevision, testRevisionBody } from './helpers.ts';
import { withOracleStorage } from './oracle-storage.ts';

type FileInput = { mime: string; bytes?: number[]; size?: number; first?: number; last?: number; encoded?: string; encodedLength?: number };
type MediaAction =
  | { op: 'mint'; grant: string; scope: string[] }
  | { op: 'create'; item: string; text: string; transport?: 'mcp'; grant?: string }
  | { op: 'publish'; item: string }
  | { op: 'list'; grant: string }
  | { op: 'upload'; key: string; transport: 'rest' | 'mcp'; file: FileInput; filename?: string; item?: string; grant?: string; alt?: string; inline?: boolean; inspect?: 'metadata' | 'error' | 'status' }
  | { op: 'read'; upload: string; private?: boolean; inspect?: 'full' | 'digest' }
  | { op: 'metadata'; upload: string; item: string }
  | { op: 'storage' }
  | { op: 'snapshot'; item: string; key: string }
  | { op: 'same-snapshot'; item: string; key: string }
  | { op: 'same-result'; left: string; right: string; duplicate?: boolean };
type Action = MediaAction & { checkpoint?: string };
type History = { name: string; restBodyLimit?: number; actions: Action[] };
const fiveMiB = 5 * 1024 * 1024, eightMiB = 8 * 1024 * 1024;
const png: FileInput = { mime: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47, 1, 2, 3] };
const attached: FileInput = { mime: 'image/png', encoded: 'aW1hZ2U=' };
const histories: History[] = [
  { name: 'cannot use the draft upload tool to change published attachments', actions: [
    { op: 'mint', grant: 'draft', scope: ['owner:draft'] }, { op: 'create', item: 'a', text: 'Published MCP boundary' }, { op: 'publish', item: 'a' }, { op: 'snapshot', item: 'a', key: 'before' },
    { op: 'upload', key: 'denied', checkpoint: 'MCP drafting cannot publish an attachment', transport: 'mcp', grant: 'draft', item: 'a', file: attached, filename: 'boundary.png', inspect: 'error' }, { op: 'same-snapshot', item: 'a', key: 'before' }, { op: 'storage' },
    { op: 'mint', grant: 'publish', scope: ['owner:draft', 'owner:publish'] }, { op: 'upload', key: 'attached', transport: 'mcp', grant: 'publish', item: 'a', file: attached, filename: 'boundary.png', inspect: 'error' },
    { op: 'storage' }, { op: 'snapshot', item: 'a', key: 'after' }, { op: 'upload', key: 'again', transport: 'mcp', grant: 'draft', item: 'a', file: attached, filename: 'boundary.png', inspect: 'error' },
    { op: 'same-result', left: 'again', right: 'attached', duplicate: true }, { op: 'storage' }, { op: 'same-snapshot', item: 'a', key: 'after' },
  ] },
  { name: 'discovers uploadMedia for draft scopes', actions: [{ op: 'mint', grant: 'draft', scope: ['owner:draft'] }, { op: 'list', grant: 'draft' }] },
  { name: 'uses the same bytes, MIME types and attachment metadata as multipart REST', actions: [
    { op: 'mint', grant: 'draft', scope: ['owner:draft'] }, { op: 'create', item: 'rest', text: 'media parity (REST)' }, { op: 'create', item: 'mcp', text: 'media parity (MCP)' },
    ...['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml'].flatMap((mime, index): Action[] => [
      { op: 'upload', key: 'rest' + index, transport: 'rest', item: 'rest', file: { ...png, mime }, alt: 'a diagram', inline: true, inspect: 'metadata' },
      { op: 'upload', key: 'mcp' + index, transport: 'mcp', grant: 'draft', item: 'mcp', file: { ...png, mime }, alt: 'a diagram', inline: true, inspect: 'metadata' },
      { op: 'same-result', left: 'mcp' + index, right: 'rest' + index },
      ...(['rest', 'mcp'] as const).flatMap((transport): Action[] => [{ op: 'read', upload: transport + index }, { op: 'read', upload: transport + index, private: true, inspect: 'full' }, { op: 'metadata', upload: transport + index, item: transport }]),
    ]),
  ] },
  { name: 'preserves the inclusive 5 MiB REST limit despite Base64 expansion', actions: [
    { op: 'mint', grant: 'draft', scope: ['owner:draft'] },
    { op: 'upload', key: 'rest', transport: 'rest', file: { mime: 'image/png', size: fiveMiB, first: 17, last: 23 } },
    { op: 'upload', key: 'mcp', transport: 'mcp', grant: 'draft', file: { mime: 'image/png', size: fiveMiB, first: 17, last: 23 }, filename: 'big.png', inspect: 'error' },
    { op: 'read', upload: 'mcp', private: true, inspect: 'digest' },
  ] },
  { name: 'rejects malformed encoding, unsupported types and over-limit files without R2 or row writes', actions: [
    { op: 'mint', grant: 'draft', scope: ['owner:draft'] },
    ...['%%%', 'A===', 'a', ' YQ==', 'YR=='].flatMap((encoded, index): Action[] => [{ op: 'upload', key: 'bad' + index, transport: 'mcp', grant: 'draft', file: { mime: 'image/png', encoded }, filename: 'bad.png', inspect: 'error' }, { op: 'storage' }]),
    { op: 'upload', key: 'rest-type', transport: 'rest', file: { mime: 'text/plain', bytes: [1] } },
    { op: 'upload', key: 'mcp-type', transport: 'mcp', grant: 'draft', file: { mime: 'text/plain', encoded: 'AQ==' }, filename: 'bad.txt', inspect: 'error' }, { op: 'same-result', left: 'mcp-type', right: 'rest-type' },
    { op: 'upload', key: 'rest-big', transport: 'rest', file: { mime: 'image/png', size: fiveMiB + 1 } },
    { op: 'upload', key: 'mcp-big', transport: 'mcp', grant: 'draft', file: { mime: 'image/png', size: fiveMiB + 1 }, filename: 'big.png', inspect: 'error' }, { op: 'same-result', left: 'mcp-big', right: 'rest-big' }, { op: 'storage' },
  ] },
  { name: 'bounds the expanded JSON envelope at 8 MiB before any media write', actions: [{ op: 'mint', grant: 'draft', scope: ['owner:draft'] }, { op: 'upload', key: 'big', transport: 'mcp', grant: 'draft', file: { mime: 'image/png', encodedLength: eightMiB }, filename: 'envelope.png', inspect: 'status' }, { op: 'storage' }] },
  { name: 'keeps read grants out of discovery and challenges direct upload calls with owner:draft', actions: [{ op: 'mint', grant: 'read', scope: ['owner:read'] }, { op: 'list', grant: 'read' }, { op: 'upload', key: 'denied', transport: 'mcp', grant: 'read', file: { mime: 'image/png', encoded: 'AQ==' }, filename: 'pic.png', inspect: 'status' }, { op: 'storage' }] },
  ...['image/PNG', 'IMAGE/PNG', 'image/pNg'].map((mime): History => ({ name: `normalizes upload MIME like multipart File: ${mime}`, actions: [{ op: 'mint', grant: 'draft', scope: ['owner:draft'] }, { op: 'upload', key: 'rest', transport: 'rest', file: { mime, bytes: [1, 2, 3] }, inspect: 'metadata' }, { op: 'upload', key: 'mcp', transport: 'mcp', grant: 'draft', file: { mime, encoded: 'AQID' }, filename: 'case.png', inspect: 'metadata' }, { op: 'same-result', left: 'mcp', right: 'rest' }] })),
  { name: 'keeps the documented MCP envelope limit separate from the REST body cap', restBodyLimit: 128, actions: [{ op: 'mint', grant: 'draft', scope: ['owner:draft'] }, { op: 'create', item: 'rest', text: 'x'.repeat(200) }, { op: 'create', item: 'mcp', text: 'x'.repeat(200), transport: 'mcp', grant: 'draft' }] },
];
const mimeExtensions: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/webp': 'webp', 'image/svg+xml': 'svg' };
function fileBytes(file: FileInput) {
  if (file.bytes) return new Uint8Array(file.bytes);
  if (file.encoded !== undefined) { try { return Uint8Array.from(atob(file.encoded), character => character.charCodeAt(0)); } catch { return new Uint8Array(); } }
  const result = new Uint8Array(file.size ?? 0); if (result.length) { result[0] = file.first ?? 0; result[result.length - 1] = file.last ?? 0; } return result;
}
// Canonical Base64's final sextet has no nonzero unused bits. This independent
// syntax rule deliberately does not call the production decoder or use atob.
function encodingValid(encoded: string) {
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded)) return false;
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  return encoded.endsWith('==') ? alphabet.indexOf(encoded.at(-3)!) % 16 === 0 : encoded.endsWith('=') ? alphabet.indexOf(encoded.at(-2)!) % 4 === 0 : true;
}
function decodedSize(file: FileInput) { if (file.encoded === undefined) return file.bytes?.length ?? file.size ?? 0; return file.encoded.length / 4 * 3 - (file.encoded.endsWith('==') ? 2 : file.encoded.endsWith('=') ? 1 : 0); }
function model(history: History) {
  const expected: Observation[] = [{ checkpoint: 'MCP media owner login', value: 302 }];
  const grants = new Map<string, string[]>(), published = new Set<string>();
  const uploads = new Map<string, { action: Extract<Action, { op: 'upload' }>; admitted: boolean; duplicate: boolean }>();
  let stored = 0;
  history.actions.forEach((action, index) => {
    let value: unknown;
    switch (action.op) {
      case 'mint': grants.set(action.grant, action.scope); value = 200; break;
      case 'create': value = action.transport === 'mcp' ? { status: 200, error: false, contentMd: action.text } : history.restBodyLimit && JSON.stringify({ contentMd: action.text }).length > history.restBodyLimit ? 413 : 201; break;
      case 'publish': published.add(action.item); value = 200; break;
      case 'list': value = { status: 200, uploadMedia: grants.get(action.grant)!.includes('owner:draft') }; break;
      case 'upload': {
        const scope = action.grant ? grants.get(action.grant)! : ['owner:draft', 'owner:publish'];
        const duplicate = !!action.item && [...uploads.values()].some(prior => prior.admitted && prior.action.item === action.item && JSON.stringify(prior.action.file) === JSON.stringify(action.file));
        const envelopeTooBig = (action.file.encodedLength ?? 0) >= eightMiB;
        const typeAllowed = Object.hasOwn(mimeExtensions, action.file.mime.toLowerCase());
        const sizeAllowed = decodedSize(action.file) <= fiveMiB;
        const allowed = scope.includes('owner:draft') && (!action.item || !published.has(action.item) || scope.includes('owner:publish') || duplicate) && typeAllowed && sizeAllowed && (action.file.encoded === undefined || encodingValid(action.file.encoded)) && !envelopeTooBig;
        uploads.set(action.key, { action, admitted: allowed, duplicate });
        if (allowed && !duplicate) stored++;
        const status = action.transport === 'mcp' ? envelopeTooBig ? 413 : !scope.includes('owner:draft') ? 403 : 200 : !typeAllowed ? 415 : !sizeAllowed ? 413 : 201;
        value = action.transport === 'rest' ? { status, ...(action.inspect === 'metadata' ? { mime: action.file.mime.toLowerCase(), duplicate: undefined } : {}) }
          : { status, ...(action.inspect === 'status' ? status === 403 ? { requiredDraft: true, insufficientScope: true } : {} : { error: !allowed, ...(action.inspect === 'metadata' && allowed ? { mime: action.file.mime.toLowerCase(), duplicate: duplicate || undefined } : {}) }) };
        break;
      }
      case 'read': { const file = uploads.get(action.upload)!.action.file; value = { status: action.private ? 200 : 404, ...(action.inspect === 'full' ? { mime: file.mime.toLowerCase(), bytes: file.bytes } : {}), ...(action.inspect === 'digest' ? { length: decodedSize(file), matchesInputDigest: true } : {}) }; break; }
      case 'metadata': { const upload = uploads.get(action.upload)!.action; value = { item: action.item, mime: upload.file.mime.toLowerCase(), alt: upload.alt, inline: upload.inline ? 1 : 0 }; break; }
      case 'storage': value = { rows: stored, r2: stored }; break;
      case 'snapshot': return;
      case 'same-snapshot': case 'same-result': value = true; break;
    }
    expected.push({ checkpoint: action.checkpoint ?? `MCP media action ${index}: ${action.op}`, value });
  });
  return expected;
}
function base64(bytes: Uint8Array) { let text = ''; for (let index = 0; index < bytes.length; index += 8192) text += String.fromCharCode(...bytes.subarray(index, index + 8192)); return btoa(text); }
async function driver(history: History, observe: (checkpoint: string, value: unknown) => void) {
  await withOracleStorage(async () => {
    const bindings = history.restBodyLimit ? { ...env, API_BODY_LIMIT: String(history.restBodyLimit) } : env;
    const base = 'https://mcp-media.example.test', app = makeApp('/blyg');
    const edgeIP = '2001:db8:' + crypto.randomUUID().replaceAll('-', '').match(/.{4}/g)!.slice(0, 6).join(':');
    const fetch = async (path: string, init?: RequestInit) => { const request = new Request(base + path, init), ctx = createExecutionContext(); request.headers.set('CF-Connecting-IP', edgeIP); const response = await app.fetch(request, bindings, ctx); await waitOnExecutionContext(ctx); return response; };
    const login = await fetch('/blyg/studio/login', { method: 'POST', body: new URLSearchParams({ password: env.OWNER_PASSWORD }) });
    observe('MCP media owner login', login.status);
    const header = login.headers.get('set-cookie'); if (!header) throw new Error('MCP media fixture login supplied no cookie'); const cookie = header.split(';')[0];
    const owner = async (path: string, body: unknown) => fetch(path, { method: 'POST', headers: { cookie, 'Content-Type': 'application/json' }, body: JSON.stringify(await testRevisionBody('POST', path, body)) });
    const mcp = (token: string, method: string, params: Record<string, unknown>) => fetch('/blyg/studio/mcp', { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', 'mcp-protocol-version': '2026-07-28', 'mcp-method': method, ...(typeof params.name === 'string' ? { 'mcp-name': params.name } : {}) }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params: { ...params, _meta: { 'io.modelcontextprotocol/protocolVersion': '2026-07-28', 'io.modelcontextprotocol/clientCapabilities': {} } } }) });
    const decode = async (response: Response) => { const rpc = await response.json() as any; const text = rpc.result.content[0].text; let value; try { value = JSON.parse(text); } catch { value = text; } return { error: rpc.result.isError === true, value }; };
    const count = async () => ({ r2: (await env.MEDIA.list()).objects.length, rows: (await env.DB.prepare('SELECT count(*) AS n FROM media').first<{ n: number }>())!.n });
    const initial = await count();
    const items = new Map<string, string>(), grants = new Map<string, string>(), uploads = new Map<string, { value: any; action: Extract<Action, { op: 'upload' }> }>(), snapshots = new Map<string, unknown>();
    for (let index = 0; index < history.actions.length; index++) {
      const action = history.actions[index]; let value: unknown;
      switch (action.op) {
        case 'mint': { const response = await owner('/blyg/api/authorizations', { name: 'MCP media oracle', scope: action.scope, resource: 'mcp' }); value = response.status; grants.set(action.grant, (await response.json() as any).accessToken); break; }
        case 'create': { const response = action.transport === 'mcp' ? await mcp(grants.get(action.grant!)!, 'tools/call', { name: 'createItem', arguments: { body: { contentMd: action.text } } }) : await owner('/blyg/api/items', { contentMd: action.text }); if (action.transport === 'mcp') { const result = await decode(response); value = { status: response.status, error: result.error, contentMd: result.value.contentMd }; items.set(action.item, result.value.id); } else { value = response.status; if (response.status === 201) items.set(action.item, (await response.json() as any).id); } break; }
        case 'publish': value = (await owner('/blyg/api/items/' + items.get(action.item) + '/publish', {})).status; break;
        case 'list': { const response = await mcp(grants.get(action.grant)!, 'tools/list', {}); const body = await response.json() as any; value = { status: response.status, uploadMedia: body.result.tools.some((tool: any) => tool.name === 'uploadMedia') }; break; }
        case 'upload': {
          let response: Response;
          if (action.transport === 'rest') {
            const form = new FormData(); form.set('file', new File([fileBytes(action.file)], action.filename ?? 'same-file.dat', { type: action.file.mime }));
            if (action.item) { const id = items.get(action.item)!; form.set('itemId', id); form.set('expectedRevision', String(await testItemRevision(id))); }
            if (action.alt !== undefined) form.set('alt', action.alt); if (action.inline) form.set('inline', 'true');
            response = await fetch('/blyg/api/media', { method: 'POST', headers: { cookie }, body: form });
          } else {
            response = await mcp(grants.get(action.grant!)!, 'tools/call', { name: 'uploadMedia', arguments: { body: { file: { filename: action.filename ?? 'same-file.dat', contentType: action.file.mime, dataBase64: action.file.encoded ?? (action.file.encodedLength ? 'A'.repeat(action.file.encodedLength) : base64(fileBytes(action.file))) }, ...(action.item ? { itemId: items.get(action.item), expectedRevision: await testItemRevision(items.get(action.item)!) } : {}), ...(action.alt !== undefined ? { alt: action.alt } : {}), ...(action.inline ? { inline: 'true' } : {}) } } });
          }
          if (action.transport === 'mcp' && action.inspect === 'status') { value = { status: response.status, ...(response.status === 403 ? { requiredDraft: response.headers.get('www-authenticate')?.includes('scope="owner:draft"'), insufficientScope: response.headers.get('www-authenticate')?.includes('error="insufficient_scope"') } : {}) }; break; }
          const result = action.transport === 'mcp' ? await decode(response) : { value: await response.json() as any, error: false };
          uploads.set(action.key, { value: result.value, action });
          value = { status: response.status, ...(action.transport === 'mcp' ? { error: result.error } : {}), ...(action.inspect === 'metadata' ? { mime: result.value.mime, duplicate: result.value.duplicate } : {}) }; break;
        }
        case 'read': {
          const upload = uploads.get(action.upload)!, response = await fetch(new URL(upload.value.url).pathname, { headers: action.private ? { cookie } : {} });
          value = { status: response.status };
          if (action.inspect === 'full') value = { ...value as object, mime: response.headers.get('content-type'), bytes: [...new Uint8Array(await response.arrayBuffer())] };
          if (action.inspect === 'digest') { const observed = await response.arrayBuffer(); value = { ...value as object, length: observed.byteLength, matchesInputDigest: equals(new Uint8Array(await crypto.subtle.digest('SHA-256', observed)), new Uint8Array(await crypto.subtle.digest('SHA-256', fileBytes(upload.action.file))), [iterableEquality]) }; }
          break;
        }
        case 'metadata': { const upload = uploads.get(action.upload)!; const row = await env.DB.prepare('SELECT item_id, mime, alt, inline FROM media WHERE id = ?').bind(upload.value.id).first<{ item_id: string; mime: string; alt: string; inline: number }>(); value = row ? { ...row, item: row.item_id === items.get(action.item) ? action.item : 'different item' } : null; if (value) delete (value as Record<string, unknown>).item_id; break; }
        case 'storage': { const current = await count(); value = { r2: current.r2 - initial.r2, rows: current.rows - initial.rows }; break; }
        case 'snapshot': snapshots.set(action.key, await (await fetch('/blyg/items/' + items.get(action.item) + '.json')).json()); continue;
        case 'same-snapshot': value = equals(await (await fetch('/blyg/items/' + items.get(action.item) + '.json')).json(), snapshots.get(action.key), [iterableEquality]); break;
        case 'same-result': { const left = uploads.get(action.left)!, right = uploads.get(action.right)!; if (action.duplicate) value = equals(left.value, { ...right.value, duplicate: true }, [iterableEquality]); else if (left.value.url && right.value.url) value = left.value.mime === right.value.mime && left.value.url.split('.').pop() === right.value.url.split('.').pop(); else value = equals(left.value, right.value, [iterableEquality]); break; }
      }
      observe(action.checkpoint ?? `MCP media action ${index}: ${action.op}`, value);
    }
  });
  observe('MCP media completed', true);
}
oracleProperty({
  id: 'mcp-media', owns: ['src/mcp.ts', 'src/model.ts#insertMedia'],
  law: { statement: 'For every enumerated MCP media history, file and envelope admission preserves the inclusive REST byte/type policy and scope boundary; rejected uploads write nothing, accepted transport bytes/metadata agree, and duplicates preserve existing storage/publication.', authority: 'Decision #52; docs/client-access.md upload/publication scopes; existing REST five-MiB file and MCP eight-MiB envelope contracts; docs/auth-oracles.md binary upload receiving parity.', limits: 'All original fixed malformed encoding, MIME variants, size/envelope, permission, duplicate and REST parity schedules in local Worker/D1/R2; no exhaustive image decoder or production storage claim.' },
  histories, label: history => history.name, model, driver,
  check: (_history, trace, expected) => {
    const actual = trace.filter(entry => entry.checkpoint !== 'MCP media completed');
    for (let index = 0; index < actual.length; index++) { const mismatch = differs(actual[index].checkpoint, 'MCP media parity and admission', actual[index], expected[index]); if (mismatch) return mismatch; }
    return trace.some(entry => entry.checkpoint === 'MCP media completed') ? differs('MCP media completion', 'MCP media parity and admission', actual.length, expected.length) ?? pass : pass;
  },
  calibrations: [{ name: 'draft tool publishes attachment', law: 'MCP media parity and admission', history: { enumerated: 0 }, corrupt: trace => trace.map(entry => entry.checkpoint === 'MCP drafting cannot publish an attachment' ? { ...entry, value: { status: 200, error: false } } : entry) }],
});
