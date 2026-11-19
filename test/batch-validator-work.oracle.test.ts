/**
 * Conditional batch reads preserve their result and admission costs within the
 * existing five-call owner / seven-call delegated D1 binding budget. Native
 * batches count once; every envelope and child still spends its logical quota.
 * Authority: preserved test/read-batch-db.test.ts maximum-size work contract,
 * and Kyle Mathews' approved transparent conditional batching contract.
 *
 * This receiving driver runs real operation definitions, D1 SQL and read packing.
 * The independent model uses fixture identities and the published work bound.
 * It never predicts the adapter's query plan. Every operation/access/count cell
 * runs initial, unchanged conditional and changed conditional checkpoints.
 * Counts1/49/50 preserve the maximum regression and its adjacent legal count.
 * Limits: local Worker/D1, admitted valid children. Error/admission and unstable
 * generation laws remain with the conditional server and cursor owners.
 */
import { env } from 'cloudflare:test';
import { vi } from 'vitest';
import { differs, oracleProperty, pass, violation } from '@tanstack/oracles';
import { operationDefinitions } from '../src/operations.ts';
import { runOperation } from '../src/operation-runner.ts';
import type { OperationContext } from '../src/operation-types.ts';
import { withOracleCleanup } from './oracle-cleanup.ts';

/** Count binding calls, not SQL statements. A native D1 batch spends one call. */
function counted(db: D1Database, limit = Infinity) {
  const calls: string[][] = [], originals = new WeakMap<D1PreparedStatement, { statement: D1PreparedStatement; sql: string }>();
  function admit(sql: string[]) {
    calls.push(sql);
    if (calls.length > limit) throw new Error('Test D1 invocation limit exceeded');
  }
  function statement(sql: string, target: D1PreparedStatement): D1PreparedStatement {
    const wrapped = new Proxy(target, { get(value, key) {
      if (key === 'bind') return (...args: unknown[]) => statement(sql, value.bind(...args));
      const method = Reflect.get(value, key);
      if (['all', 'first', 'raw', 'run'].includes(String(key))) return (...args: unknown[]) => {
        admit([sql]); return Reflect.apply(method, value, args);
      };
      return typeof method === 'function' ? method.bind(value) : method;
    } });
    originals.set(wrapped, { statement: target, sql });
    return wrapped;
  }
  const binding = new Proxy(db, { get(target, key) {
    if (key === 'prepare') return (sql: string) => statement(sql, target.prepare(sql));
    if (key === 'batch') return (statements: D1PreparedStatement[]) => {
      admit(statements.map(value => originals.get(value)?.sql ?? '(native statement)'));
      return target.batch(statements.map(value => originals.get(value)?.statement ?? value));
    };
    const method = Reflect.get(target, key);
    return typeof method === 'function' ? method.bind(target) : method;
  } });
  return { db: binding, calls };
}

const operations = ['getItem', 'listMentions', 'listMentionGroups', 'getMentionSummary'] as const;
type Operation = typeof operations[number];
const histories = operations.flatMap(operation => [false, true].flatMap(delegated => [1, 49, 50].flatMap(count =>
  (operation === 'listMentions' ? ['inbound', 'outbound'] as const : ['inbound'] as const).map(direction => ({ operation, delegated, count, direction })))));
const law = 'bounded transparent conditional batch work';
const itemId = (n: number) => `work-oracle-${String(n).padStart(2, '0')}`;
const indices = (count: number) => Array.from({ length: count }, (_, n) => count - n - 1);
const values = (operation: Operation, count: number, changed: boolean, direction: 'inbound' | 'outbound') => indices(count).map(n => {
  const id = itemId(n);
  if (operation === 'getItem') return { id, contentMd: changed ? 'Changed item' : 'Published item' };
  if (operation === 'listMentions' && direction === 'outbound') return [{ id: `old-${id}`, created: changed ? 'changed' : 'created' }];
  if (operation === 'listMentions') return changed ? [`new-${id}`, `old-${id}`] : [`old-${id}`];
  if (operation === 'listMentionGroups') return [{ targetItemId: id, total: changed ? 2 : 1, visible: changed ? 2 : 1 }];
  return { inbound: count * (changed ? 2 : 1), outbound: 0, groups: count };
});
oracleProperty({
  id: 'conditional-batch-bounded-work',
  owns: ['src/conditional-operation.ts#conditionalOperation', 'src/cursor-page.ts#cursorPage', 'src/mention-groups.ts#mentionGroups'],
  law: {
    statement: 'For every valid owner or delegated batch of the four supported reads, keep child data/order/validators and exact quota charges within five/seven physical D1 calls, including unchanged and changed conditional reads.',
    authority: 'Existing test/read-batch-db.test.ts maximum-size budget and Kyle Mathews, approved transparent conditional batching, 2026-11-18.',
    limits: 'Finite real Worker/D1 receiving matrix: four operations, owner/delegated,1/49/50 children and initial/repeated/changed reads. No arbitrary writers or denied children.',
  },
  histories: { enumerated: histories, states: [...operations, 'owner', 'delegated', 'maximum', 'adjacent', 'unchanged', 'changed'] },
  label: h => `${h.operation}${h.direction === 'outbound' ? '-outbound' : ''}-${h.delegated ? 'delegated' : 'owner'}-${h.count}`,
  // The model knows fixture contents and the external bound, without knowing
  // whether SQL rounds are shared or which generation reads production uses.
  model: plan => ({ bound: plan.delegated ? 7 : 5, charges: Array(plan.delegated ? 2 : 1).fill(plan.count + 1),
    values: values(plan.operation, plan.count, false, plan.direction), changed: values(plan.operation, plan.count, true, plan.direction) }),
  driver: async (plan, observe) => {
    const ids = indices(plan.count).map(itemId);
    // Exact accumulated charges describe one quota window. Keep host load from
    // advancing that window between the envelope and its child admissions.
    const clock = vi.spyOn(Date, 'now').mockReturnValue(Date.UTC(2026, 10, 19, 12, 0, 1));
    await withOracleCleanup(async () => {
      await env.DB.batch([
        ...ids.map(id => env.DB.prepare("INSERT INTO items(id,kind,status,created,updated,version,content_md,dirty) VALUES(?,'fragment','public','created','updated',1,'Published item',0)").bind(id)),
        ...ids.map(id => env.DB.prepare("INSERT INTO versions(item_id,version,kind,content_md,content_html,content_hash,published_at,pinned) VALUES(?,1,'fragment','Published item','<p>Published item</p>','hash','published',1)").bind(id)),
        ...ids.map(id => env.DB.prepare("INSERT INTO mentions_in(id,source,target,target_item_id,status,first_seen,last_seen,verified_at,hidden) VALUES(?,?,'target',?,'verified','first','last','2026-01-01',0)").bind(`old-${id}`, `https://source.test/${id}`, id)),
      ]);
      if (plan.direction === 'outbound') await env.DB.batch(ids.map(id => env.DB.prepare("INSERT INTO mentions_out(id,item_id,version,target,status,created) VALUES(?,?,1,'target','pending','created')").bind(`old-${id}`, id)));
      const meter = counted(env.DB), context: OperationContext = {
        env: { ...env, DB: meter.db, API_READ_LIMIT: '100000', API_DELEGATED_READ_LIMIT: '100000' },
        access: plan.delegated ? { scope: ['owner:read'], clientId: 'bounded-work', userId: 'owner' } : null,
        url: 'https://example.com/blyg/api/read-batch', extensions: [], defer() {},
      };
      const definition = operationDefinitions([]).get('batchRead')!;
      let tags: string[] = [];
      for (const checkpoint of ['initial', 'unchanged', 'changed'] as const) {
        if (checkpoint === 'changed') await env.DB.batch([
          ...ids.map(id => env.DB.prepare("UPDATE items SET content_md='Changed item',updated='updated-again' WHERE id=?").bind(id)),
          ...ids.map(id => env.DB.prepare("INSERT INTO mentions_in(id,source,target,target_item_id,status,first_seen,last_seen,verified_at,hidden) VALUES(?,?,'target',?,'verified','first','last','2026-02-01',0)").bind(`new-${id}`, `https://source.test/new/${id}`, id)),
        ]);
        if (checkpoint === 'changed' && plan.direction === 'outbound') await env.DB.prepare("UPDATE mentions_out SET created='changed' WHERE item_id LIKE 'work-oracle-%'").run();
        await env.DB.prepare('DELETE FROM security_budgets').run();
        meter.calls.length = 0;
        const requests = ids.map((id, n) => ({ ...(plan.operation === 'getItem' ? { path: { id } } : plan.operation === 'getMentionSummary' ? {} : { query: plan.direction === 'outbound' ? { direction: 'outbound', id: `old-${id}`, limit: '10' } : { targetItemId: id, limit: '10' } }),
          ...(checkpoint === 'initial' ? {} : { ifNoneMatch: tags[n] }) }));
        let result;
        try { result = await runOperation(definition, { path: {}, query: {}, body: { operation: plan.operation, requests } }, context); }
        catch (error) { observe(checkpoint, { productionError: error instanceof Error ? { name: error.name, message: error.message } : String(error) }); return; }
        if (!result.ok) { observe(checkpoint, { envelopeFailure: result }); return; }
        const rows = result.value as { status: number; body: any; headers: Record<string, string> }[];
        const actualTags = rows.map(row => row.headers.ETag);
        const data = rows.map(row => row.status !== 200 ? row.status === 304 ? null : { unexpectedBody: row.body } : plan.operation === 'getItem' ? { id: row.body?.id, contentMd: row.body?.contentMd }
          : plan.operation === 'listMentions' ? Array.isArray(row.body?.items) ? row.body.items.map((item: any) => plan.direction === 'outbound' ? { id: item?.id, created: item?.created } : item?.id) : { unexpectedBody: row.body }
          : plan.operation === 'listMentionGroups' ? Array.isArray(row.body?.items) ? row.body.items.map((group: any) => ({ targetItemId: group?.targetItemId, total: group?.total, visible: group?.visible })) : { unexpectedBody: row.body } : row.body);
        observe(checkpoint, { statuses: rows.map(row => row.status), data, validators: actualTags.every(Boolean),
          sameTags: actualTags.every((tag, n) => tag === tags[n]), calls: meter.calls.length,
          charges: (await env.DB.prepare('SELECT used FROM security_budgets').all<{ used: number }>()).results.map(row => row.used),
          admissionWrites: meter.calls.flat().filter(sql => sql.startsWith('INSERT INTO security_budgets')).length });
        tags = actualTags;
      }
      observe('reach', plan.operation); observe('reach', plan.delegated ? 'delegated' : 'owner');
      if (plan.count === 50) observe('reach', 'maximum');
      if (plan.count === 49) observe('reach', 'adjacent');
      observe('reach', 'unchanged'); observe('reach', 'changed');
    }, [
      async () => { clock.mockRestore(); },
      () => env.DB.prepare("DELETE FROM mentions_out WHERE item_id LIKE 'work-oracle-%'").run(),
      () => env.DB.prepare("DELETE FROM mentions_in WHERE target_item_id LIKE 'work-oracle-%'").run(),
      () => env.DB.prepare("DELETE FROM versions WHERE item_id LIKE 'work-oracle-%'").run(),
      () => env.DB.prepare("DELETE FROM items WHERE id LIKE 'work-oracle-%'").run(),
    ]);
  },
  check: (plan, trace, expected) => {
    for (const checkpoint of ['initial', 'unchanged', 'changed'] as const) {
      const actual = trace.find(entry => entry.checkpoint === checkpoint)?.value as any;
      if (!actual) continue;
      const unchanged = checkpoint === 'unchanged';
      const mismatch = differs(checkpoint, law, { ...actual, calls: undefined }, {
        statuses: Array(plan.count).fill(unchanged ? 304 : 200), data: unchanged ? Array(plan.count).fill(null) : checkpoint === 'changed' ? expected.changed : expected.values,
        validators: true, sameTags: unchanged, calls: undefined, charges: expected.charges,
        admissionWrites: (plan.count + 1) * (plan.delegated ? 2 : 1),
      });
      if (mismatch) return mismatch;
      if (actual.calls > expected.bound) return violation(checkpoint, 'batch exceeds preserved physical D1 budget', law, { actual: actual.calls, expected: expected.bound });
    }
    return differs('completed checkpoints', law, trace.filter(entry => ['initial', 'unchanged', 'changed'].includes(entry.checkpoint)).map(entry => entry.checkpoint), ['initial', 'unchanged', 'changed']) ?? pass;
  },
  calibrations: [{ name: 'one-call-over-bound', law, history: { enumerated: 'getItem-owner-50' },
    corrupt: trace => trace.map(entry => entry.checkpoint === 'initial' ? { ...entry, value: { ...(entry.value as object), calls: 6 } } : entry) }],
});
