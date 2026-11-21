/**
 * Sharing the cursor generation bracket must preserve the existing read-batch
 * work budget as well as returned bytes. The real Worker companion covers all
 * batch sizes and handlers. This controlled Node seam covers a one-child cursor
 * operation, so its owner/delegated budget subtracts one/two envelope admissions
 * from the published five/seven-call bound. No result is predicted from SQL.
 *
 * The pure model uses input values, unchanged/changed requests and the external
 * call bound. The real conditional adapter, runner and cursor helper supply
 * admission, generation checks, projection and validators. Generated values and
 * both access kinds run fixed/random campaigns; explicit neighbors keep both
 * work premises reached. Error/expiry/epoch schedules have a Worker owner.
 *
 * ```ts
 * conditionalOperation(cursorRead, input, context) // -> current200 within the child work bound
 * conditionalOperation(cursorRead, input, context, tag) // -> bodyless304 when unchanged
 * ```
 */
import fc from 'fast-check';
import { differs, oracleProperty, pass, violation } from '@tanstack/oracles';
import { conditionalOperation } from '../src/conditional-operation.ts';
import { cursorPage } from '../src/cursor-page.ts';
import { readOperation } from '../src/operation-policy.ts';
import { success, type OperationContext } from '../src/operation-types.ts';
import { CHANGE_DOMAINS } from '../src/change-state.ts';
import type { OperationDefinition } from '../src/operations.ts';
import type { Env } from '../src/types.ts';

const law = 'bounded cursor generation work';
oracleProperty({
  id: 'private-cursor-generation-work',
  owns: ['src/conditional-operation.ts#conditionalOperation'],
  law: {
    statement: 'For an admitted cursor resource, share its stable generation bracket within the existing owner/delegated work bound while returning current bytes and preserving a matching unchanged304 shortcut.',
    authority: 'Existing read-batch-db.test.ts five/seven call bound, minus one/two envelope admissions; Kyle Mathews approved stable-dependency validators and transparent batching,2026-11-18.',
    limits: 'Controlled D1 provider, one admitted cursor child, changed/unchanged requests, owner/delegated. Real SQL/packing/count boundary and interrupted projections have Worker receiving owners.',
  },
  histories: { arbitrary: fc.record({ value: fc.nat(10000), delegated: fc.boolean() }), runs: 25, fixedSeeds: [20261118],
    states: ['owner','delegated','unchanged','changed'],
    constructed: [false,true].map(delegated => ({ name: delegated ? 'delegated' : 'owner', enters: [delegated ? 'delegated' : 'owner','unchanged','changed'], build: (plan: { value: number; delegated: boolean }) => ({ ...plan, delegated }) })),
    fixed: [{ name: 'owner-stable-cursor', history: { value: 3, delegated: false } }] },
  model: plan => ({ coldBound: plan.delegated ? 5 : 4, warmBound: plan.delegated ? 3 : 2, values: [plan.value, null, plan.value+1], statuses: [200,304,200] }),
  driver: async (plan, observe) => {
    let calls = 0, revision = 0, value = plan.value;
    const db = { prepare(sql: string) { return { bind() { return this; }, first: async () => {
      calls++;
      return sql.startsWith('SELECT epoch') ? { epoch: 'cursor-work', ...Object.fromEntries(CHANGE_DOMAINS.map(domain => [domain, revision])) } : { admitted: true };
    }, all: async () => { calls++; return { results: [{ id: 1, value }] }; } }; } } as unknown as D1Database;
    const context: OperationContext = { env: { DB: db } as unknown as Env, url: 'https://oracle.test/api/cursor-work',
      access: plan.delegated ? { scope: ['owner:read'], clientId: 'cursor-work', userId: 'owner' } : null, extensions: [], defer() {} };
    const definition: OperationDefinition = {
      route: { method: 'get', path: '/cursor-work', operationId: 'listMentions', responses: {}, policy: readOperation() },
      handler: async ctx => success(await cursorPage<{ id: number; value: number }>(ctx.env.DB, {}, {
        name: 'cursor-work', domains: ['mentions'], sql: 'SELECT id,value FROM cursor_work', order: [{ column: 'id', direction: 'asc' }],
      }, ctx.conditionalSnapshot)),
    };
    let etag: string | undefined;
    for (const [index, checkpoint] of ['cold','unchanged','changed'].entries()) {
      if (index === 2) { revision++; value++; }
      calls=0;
      let result;
      try { result = await conditionalOperation(definition, { path: {}, query: {} }, context, etag); }
      catch (error) { observe(checkpoint, { productionError: error instanceof Error ? { name: error.name, message: error.message } : String(error) }); return; }
      observe(checkpoint, { status: result.status, value: result.status === 200 ? (result.body as { items?: { value: number }[] })?.items?.[0]?.value : null,
        tag: Boolean(result.headers.ETag), sameTag: result.headers.ETag === etag, calls });
      etag = result.headers.ETag;
    }
    observe('reach', plan.delegated ? 'delegated' : 'owner'); observe('reach','unchanged'); observe('reach','changed');
  },
  check: (_plan, trace, expected) => {
    for (const [index, checkpoint] of ['cold','unchanged','changed'].entries()) {
      const row = trace.find(entry => entry.checkpoint === checkpoint)?.value as { status: number; value: unknown; tag: boolean; sameTag: boolean; calls: number } | undefined;
      if (!row) continue;
      const mismatch = differs(checkpoint, law, { ...row, calls: undefined }, { status: expected.statuses[index], value: expected.values[index], tag: true, sameTag: index === 1, calls: undefined });
      if (mismatch) return mismatch;
      const bound = index === 1 ? expected.warmBound : expected.coldBound;
      if (row.calls > bound) return violation(checkpoint, 'cursor operation exceeds preserved work budget', law, { actual: row.calls, expected: bound });
    }
    return differs('completed checkpoints', law, trace.filter(entry => entry.checkpoint !== 'reach').map(entry => entry.checkpoint), ['cold','unchanged','changed']) ?? pass;
  },
  calibrations: [{ name: 'restore-duplicate-generation-rounds', law, history: { fixed: 'owner-stable-cursor' },
    corrupt: trace => trace.map(entry => entry.checkpoint === 'cold' ? { ...entry, value: { ...(entry.value as object), calls: 6 } } : entry) }],
});
