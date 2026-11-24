/** This oracle owns draft-only authority at completed REST mutations and public
 * item reads, including deletion paused across owner publication.
 *
 * ```ts
 * PATCH('/api/items/id', draftOnly) // → editable working copy, public bytes unchanged
 * POST('/api/items/id/restore', draftOnly) // → restored draft, public bytes unchanged
 * DELETE('/api/items/id', draftOnly) // → 409 once published, even after a stale read
 * ```
 * Decision #52 separates drafting from publication. For every finite action
 * history here, drafting cannot alter a published projection or delete published
 * authority. The model tracks only publication and draft action kind. The driver
 * records response statuses, unchanged-byte relations and retained media at each
 * original public checkpoint; opaque IDs/clock bytes never enter traces. A
 * controlled D1 batch seam supplies the stale-delete schedule, not a second
 * authority model. Limits: original edit/restore/delete sequence and one forced
 * race; native token validation and other schedules belong to separate oracles.
 */
import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { oracleProperty, type Observation } from '@tanstack/oracles';
import { Hono } from 'hono';
import { createOwnerApi } from '../src/owner-api.ts';
import { makeApp } from '../src/index.ts';
import { testRevisionBody, testItemRevision } from './helpers.ts';
import { withOracleStorage } from './oracle-storage.ts';
import { completed, exactTrace, type Observe } from './network-oracle-observations.ts';
type Plan = { name: string; concurrentPublication: boolean; draftActions: ('edit' | 'restore' | 'delete')[]; initialText: string; draftText: string; citation: string };
const histories: Plan[] = [
  { name: 'draft edits and restoration leave every named public projection unchanged', concurrentPublication: false, draftActions: ['edit', 'restore', 'delete'], initialText: 'Public authority fixture', draftText: 'Unpublished text', citation: 'https://citation.example/post' },
  { name: 'a draft-only deletion cannot remove an item published during its stale-state window', concurrentPublication: true, draftActions: ['delete'], initialText: 'Public authority fixture', draftText: 'Unpublished text', citation: 'https://citation.example/post' },
];
const base = 'https://draft-security.example.test';
async function receive(app: Hono<any>, path: string, init: RequestInit = {}, bindings = env) {
  const ctx = createExecutionContext();
  const response = await app.fetch(new Request(base + path, init), bindings, ctx);
  await waitOnExecutionContext(ctx); return response;
}
// Only publication changes the public side of the model. Draft mutation kind
// determines success versus refusal; the byte relation is invariant at every cut.
function model(plan: Plan): Observation[] {
  const result: Observation[] = [{ checkpoint: 'draft fixture owner login', value: 302 }, { checkpoint: 'draft fixture creation', value: 201 }];
  if (plan.concurrentPublication) result.push({ checkpoint: 'draft fixture media upload', value: 201 });
  result.push({ checkpoint: 'owner publication', value: 200 });
  if (plan.concurrentPublication) result.push({ checkpoint: 'public baseline status', value: 200 });
  for (const action of plan.draftActions) {
    result.push({ checkpoint: 'draft mutation status', value: action === 'delete' ? 409 : 200 });
    result.push({ checkpoint: 'published projection', value: { status: 200, changed: false } });
  }
  if (plan.concurrentPublication) result.push({ checkpoint: 'published media retained', value: true });
  return result;
}
async function fixture(plan: Plan, observe: Observe) {
  const app = makeApp('/blyg');
  const login = await receive(app, '/blyg/studio/login', { method: 'POST', headers: { 'CF-Connecting-IP': 'fd00:' + crypto.randomUUID().replaceAll('-', '').match(/.{4}/g)!.slice(0, 7).join(':') }, body: new URLSearchParams({ password: env.OWNER_PASSWORD }) });
  observe('draft fixture owner login', login.status);
  const cookieHeader = login.headers.get('set-cookie');
  if (!cookieHeader) throw new Error('Draft-authority fixture login supplied no owner cookie');
  const cookie = cookieHeader.split(';')[0];
  const owner = async (path: string, method = 'GET', body?: unknown) => { body = await testRevisionBody(method, path, body); return receive(app, path, { method, headers: { cookie, 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }); };
  const created = await owner('/blyg/api/items', 'POST', { kind: 'thread', contentMd: plan.initialText });
  observe('draft fixture creation', created.status); const { id } = await created.json() as { id: string };
  return { app, owner, id, cookie };
}
async function driver(plan: Plan, observe: Observe) {
  await withOracleStorage(async () => {
    const f = await fixture(plan, observe);
    const publicPath = `/blyg/items/${f.id}.json`;
    if (!plan.concurrentPublication) {
      observe('owner publication', (await f.owner(`/blyg/api/items/${f.id}/publish`, 'POST')).status);
      const before = await (await receive(f.app, publicPath)).text();
      const draft = new Hono().route('/api', createOwnerApi({ scope: ['owner:draft'], clientId: 'draft-fixture', userId: 'owner' }));
      for (const action of plan.draftActions) {
        const method = action === 'edit' ? 'PATCH' : action === 'restore' ? 'POST' : 'DELETE';
        const path = `/api/items/${f.id}` + (action === 'restore' ? '/restore' : '');
        const body = action === 'edit' ? { contentMd: plan.draftText, stubOf: { url: plan.citation } } : action === 'restore' ? { version: 1 } : undefined;
        const response = await receive(draft, path, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(await testRevisionBody(method, path, body)) });
        observe('draft mutation status', response.status);
        const after = await receive(f.app, publicPath); observe('published projection', { status: after.status, changed: await after.text() !== before });
      }
      return;
    }
    const form = new FormData(); form.set('itemId', f.id); form.set('expectedRevision', String(await testItemRevision(f.id)));
    form.set('file', new File(['disposable fixture'], 'fixture.png', { type: 'image/png' }));
    const upload = await receive(f.app, '/blyg/api/media', { method: 'POST', headers: { cookie: f.cookie }, body: form });
    observe('draft fixture media upload', upload.status); const media = await upload.json() as { id: string };
    let reached!: () => void, release!: () => void;
    const claimed = new Promise<void>(resolve => { reached = resolve; }), resume = new Promise<void>(resolve => { release = resolve; });
    const statements = new WeakMap<object, { sql: string; native: D1PreparedStatement }>();
    const wrap = (native: D1PreparedStatement, sql: string): D1PreparedStatement => {
      const proxy = new Proxy(native, { get(target, key) {
        if (key === 'bind') return (...args: unknown[]) => wrap(target.bind(...args), sql);
        const value = Reflect.get(target, key); return typeof value === 'function' ? value.bind(target) : value;
      } }); statements.set(proxy, { sql, native }); return proxy;
    };
    const database = new Proxy(env.DB, { get(target, key) {
      if (key === 'prepare') return (sql: string) => wrap(target.prepare(sql), sql);
      if (key === 'batch') return async (batch: D1PreparedStatement[]) => {
        if (batch.some(statement => /DELETE FROM items/i.test(statements.get(statement)?.sql ?? ''))) { reached(); await resume; }
        return target.batch(batch.map(statement => statements.get(statement)?.native ?? statement));
      };
      const value = Reflect.get(target, key); return typeof value === 'function' ? value.bind(target) : value;
    } });
    const draft = new Hono().route('/api', createOwnerApi({ scope: ['owner:draft'], clientId: 'draft-race', userId: 'owner' }));
    const deletion = receive(draft, `/api/items/${f.id}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ expectedRevision: await testItemRevision(f.id) }) }, { ...env, DB: database });
    try {
      await Promise.race([claimed, deletion.then(() => { throw new Error('Deletion did not reach the batch checkpoint'); })]);
      observe('owner publication', (await f.owner(`/blyg/api/items/${f.id}/publish`, 'POST')).status);
      const baseline = await receive(f.app, publicPath); observe('public baseline status', baseline.status); const bytes = await baseline.text();
      release(); observe('draft mutation status', (await deletion).status);
      const retained = await receive(f.app, publicPath); observe('published projection', { status: retained.status, changed: await retained.text() !== bytes });
      observe('published media retained', await env.DB.prepare('SELECT id FROM media WHERE id=?').bind(media.id).first() !== null);
    } finally { release(); await deletion.catch(() => undefined); }
  });
}
oracleProperty({
  id: 'draft-authority-security', owns: ['src/owner-api.ts#createOwnerApi', 'src/model.ts#discardDraft'],
  law: { statement: 'For every bounded draft-only action history, published item bytes remain unchanged and deletion refuses published authority, including when owner publication occurs after its stale read.', authority: 'Decision #52; docs/auth-security-oracles.md Permission-class follow-up; OWASP authorization at point of use', limits: 'Original edit/restore/delete sequence and one controlled upload/delete/publication schedule with injected draft authority; not every publication race.' },
  histories, label: plan => plan.name, model, driver: (plan, observe) => completed(observe, () => driver(plan, observe)),
  check: (_plan, trace, expected) => exactTrace(trace, expected, 'draft publication boundary'),
  calibrations: [{ name: 'draft deletion removes public item', law: 'draft publication boundary', history: { enumerated: 1 }, corrupt: trace => trace.map(entry => entry.checkpoint === 'draft mutation status' ? { ...entry, value: 200 } : entry) }],
});
