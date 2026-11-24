/** This oracle owns a private publish that races another write of the same item.
 *
 * ```ts
 * POST('/api/items/A/publish', { visibility: 'private' }) // held at its batch
 * PATCH('/api/items/A', { contentMd }) // → 200 while the private publish waits
 * // released → 409; A keeps one private version, p1, and the edited text
 * POST('/api/items/A/publish', {}) // → 200 v1 while a private publish waits; released → 409, A stays public
 * ```
 * A private publish reads the item, renders the working copy, and only then
 * writes, so another write can land in between. For every such schedule here,
 * the private publish is refused (409) and adds no private version: the item
 * keeps the other write's state, and a public item is never lowered (Venkat
 * Rao, 2026-11-23; decision #94, decision #8). The model counts private
 * versions and tracks status and the public counter. The driver holds the
 * private publish's D1 batch, performs the other write as the owner, releases
 * the batch, then reads the private list, the owner's item and the public
 * document. Limits: one item, one held private publish per history, an edit or
 * a public publish as the other write; MCP reaches the same operation.
 */
import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { oracleProperty, type Observation } from '@tanstack/oracles';
import { makeApp } from '../src/index.ts';
import { testRevisionBody } from './helpers.ts';
import { withOracleStorage } from './oracle-storage.ts';
import { completed, exactTrace, type Observe } from './network-oracle-observations.ts';

type Plan = { name: string; other: 'edit' | 'publish' };
const histories: Plan[] = [
  { name: 'an edit lands while a private publish waits', other: 'edit' },
  { name: 'a public publish lands while a private publish waits', other: 'publish' },
];
const base = 'https://private-conflict.example.test';
const receive = async (path: string, init: RequestInit = {}, bindings = env) => {
  const ctx = createExecutionContext();
  const response = await makeApp('/blyg').fetch(new Request(base + path, init), bindings, ctx);
  await waitOnExecutionContext(ctx); return response;
};

// One private version before the race; the other write decides what the item is after it.
function model(plan: Plan): Observation[] {
  return [
    { checkpoint: 'first private publish', value: 200 },
    { checkpoint: 'other write', value: 200 },
    { checkpoint: 'raced private publish', value: 409 },
    { checkpoint: 'private versions', value: [1] },
    { checkpoint: 'owner item', value: plan.other === 'edit' ? { status: 'private', version: 0, text: 'edited words' } : { status: 'public', version: 1, text: 'kept words' } },
    { checkpoint: 'public document', value: plan.other === 'edit' ? 404 : 200 },
  ];
}

async function driver(plan: Plan, observe: Observe) {
  await withOracleStorage(async () => {
    const login = await receive('/blyg/studio/login', { method: 'POST', headers: { 'CF-Connecting-IP': 'fd00:' + crypto.randomUUID().replaceAll('-', '').match(/.{4}/g)!.slice(0, 7).join(':') }, body: new URLSearchParams({ password: env.OWNER_PASSWORD }) });
    const cookie = login.headers.get('set-cookie')?.split(';')[0];
    if (!cookie) throw new Error('Private-conflict fixture login supplied no owner cookie');
    const owner = async (path: string, method = 'GET', body?: unknown, bindings = env) => {
      body = await testRevisionBody(method, path, body);
      return receive(path, { method, headers: { cookie, 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }, bindings);
    };
    const created = await owner('/blyg/api/items', 'POST', { kind: 'fragment', contentMd: 'kept words' });
    if (created.status !== 201) throw new Error('Private-conflict fixture could not create its item: ' + created.status);
    const { id } = await created.json() as { id: string };
    const item = `/blyg/api/items/${id}`;
    observe('first private publish', (await owner(`${item}/publish`, 'POST', { visibility: 'private' })).status);

    // Hold the batch that writes a private version until the other write is done.
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
        if (batch.some(statement => /INSERT INTO private_versions/i.test(statements.get(statement)?.sql ?? ''))) { reached(); await resume; }
        return target.batch(batch.map(statement => statements.get(statement)?.native ?? statement));
      };
      const value = Reflect.get(target, key); return typeof value === 'function' ? value.bind(target) : value;
    } });
    const raced = owner(`${item}/publish`, 'POST', { visibility: 'private' }, { ...env, DB: database });
    try {
      await Promise.race([claimed, raced.then(() => { throw new Error('The private publish did not reach its batch'); })]);
      const other = plan.other === 'edit' ? await owner(item, 'PATCH', { contentMd: 'edited words' }) : await owner(`${item}/publish`, 'POST', { visibility: 'public' });
      observe('other write', other.status);
      release(); observe('raced private publish', (await raced).status);
    } finally { release(); await raced.catch(() => undefined); }
    const list = await (await owner(`${item}/private-versions?limit=50`)).json() as { items: { version: number }[] };
    observe('private versions', list.items.map(entry => entry.version));
    const detail = await (await owner(item)).json() as { status: string; version: number; contentMd: string };
    observe('owner item', { status: detail.status, version: detail.version, text: detail.contentMd });
    observe('public document', (await receive(`/blyg/items/${id}.json`)).status);
  });
}

oracleProperty({
  id: 'private-items-private-conflict', owns: ['src/model.ts#publishPrivately'],
  law: { statement: 'For every private publish that races an edit or a public publish of the same item, the private publish is refused (409) and adds no private version; the item keeps the other write\'s state and a public item is never lowered.', authority: 'Decision by Venkat Rao (GitHub vgururao), 2026-11-23: a private publish that races an edit of the working copy is refused and adds no private version. Decision #94; decision #8 (a public item is never made private).', limits: 'One item, one held private publish, an edit or a public publish as the other write; owner cookie over REST.' },
  histories, label: plan => plan.name, model, driver: (plan, observe) => completed(observe, () => driver(plan, observe)),
  check: (_plan, trace, expected) => exactTrace(trace, expected, 'private conflict'),
  calibrations: [{ name: 'the raced private publish adds a version', law: 'private conflict', history: { enumerated: 0 }, corrupt: trace => trace.map(entry => entry.checkpoint === 'private versions' ? { ...entry, value: [2, 1] } : entry) }],
});
