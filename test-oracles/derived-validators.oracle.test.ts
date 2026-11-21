/**
 * This oracle owns private conditional GET freshness when a derived field
 * changes without changing a resource counter. It checks the real REST adapter
 * and runner at HTTP settlement and owns conditionalOperation's shortcut choice.
 *
 * ```ts
 * GET /items/id, If-None-Match: old // → 200 with current classification when classification changed
 * GET /reading?mentions=true, If-None-Match: old // → 200 with current entries when the mention index changed
 * GET /reading/summary?mentions=true, If-None-Match: current // → bodyless 304 when bytes are unchanged
 * ```
 * Why can a counter stay still while the resource changes? Published versions
 * receive classifications after publication; imported h-card targets can be
 * indexed after import. Both are part of the current resource representation.
 * The validator names that representation, not the counter used to find it.
 *
 * For every successful private GET, a changed representation returns 200 with
 * current bytes and a new validator; unchanged bytes permit bodyless 304.
 * Authority: Kyle Mathews (KyleAMathews), ETag contract, 2026-11-18, and
 * docs/api.md's resource-validator promise. Counters are a work optimization.
 *
 * The model compares input values only. Histories cross all four projections,
 * equal and changed values, and repeated conditional reads. The controlled
 * driver holds change counters still and records status, body and tag changes.
 * Real Worker/D1 receiving histories live in test/derived-validators.oracle.test.ts.
 * Limits: this driver supplies DTO fields and counters; it does not establish
 * SQL writer reachability, authentication or deployed Cloudflare behavior.
 */
import fc from 'fast-check';
import { oracleProperty, differs, pass } from '@tanstack/oracles';
import { executeRest } from '../src/operation-rest.ts';
import { readOperation } from '../src/operation-policy.ts';
import { success } from '../src/operation-types.ts';
import { CHANGE_DOMAINS } from '../src/change-state.ts';
import type { OperationDefinition } from '../src/operations.ts';
import type { Context } from 'hono';
import type { Env } from '../src/types.ts';
import { derivedRepresentation } from './derived-validators.model.ts';

const operations = ['getItem', 'listItemVersions', 'listReading', 'getReadingSummary'] as const;
const arbitrary = fc.record({ operation: fc.constantFrom(...operations), before: fc.integer(), after: fc.integer() });
oracleProperty({
  id: 'derived-resource-validators',
  owns: ['src/conditional-operation.ts#conditionalOperation'],
  law: {
    statement: 'For every private resource GET, a changed representation returns 200 with current bytes and a new validator, even when change counters stay unchanged; equal bytes permit bodyless 304.',
    authority: 'Kyle Mathews (KyleAMathews), approved correct validators law, 2026-11-18; docs/api.md resource validators.',
    limits: 'Controlled database and DTO handler. The receiving companion establishes real derived-writer paths.',
  },
  histories: { arbitrary, runs: 24, fixedSeeds: [20261118], states: [...operations, 'changed-derived-field', 'unchanged-derived-field'],
    constructed: [
      ...operations.map(operation => ({ name: `${operation}-derived-change`, enters: [operation, 'changed-derived-field'], build: (h: typeof arbitrary extends fc.Arbitrary<infer History> ? History : never) => ({ ...h, operation, before: 1, after: 2 }) })),
      { name: 'unchanged-derived-value', enters: ['unchanged-derived-field'], build: h => ({ ...h, after: h.before }) },
    ],
  },
  model: plan => derivedRepresentation(plan.before, plan.after),
  driver: async (plan, observe) => {
    let value = plan.before;
    const db = { prepare: (sql: string) => ({ bind() { return this; }, first: async () => sql.startsWith('SELECT epoch')
      ? { epoch: 'derived', ...Object.fromEntries(CHANGE_DOMAINS.map(domain => [domain, 0])) } : { admitted: true } }) };
    const definition = { route: { method: 'get', operationId: plan.operation, path: '/derived', responses: {}, policy: readOperation() }, handler: async () => success({ value }) } as unknown as OperationDefinition;
    const call = async (etag?: string) => {
      const request = new Request('https://oracle.test/api/derived', { headers: etag ? { 'If-None-Match': etag } : {} });
      const headers = new Headers();
      return executeRest(definition, { env: { DB: db }, req: { raw: request, url: request.url, param: () => ({}), query: () => ({}), header: (name: string) => request.headers.get(name) ?? undefined }, get: (name: string) => name === 'apiAccess' ? null : [], header: (name: string, val: string) => headers.set(name, val), json: (body: unknown, status: number) => Response.json(body, { status, headers }), body: (body: BodyInit | null, status: number) => new Response(body, { status, headers }) } as unknown as Context<{ Bindings: Env }>);
    };
    const first = await call(), etag = first.headers.get('etag');
    observe('initial', { status: first.status, body: await first.text(), tag: Boolean(etag) });
    value = plan.after;
    const current = await call(etag ?? undefined), currentTag = current.headers.get('etag');
    observe('current', { status: current.status, body: await current.text(), changed: currentTag !== etag });
    const repeated = await call(currentTag ?? undefined);
    observe('repeat', { status: repeated.status, body: await repeated.text(), sameTag: currentTag === repeated.headers.get('etag') });
    observe('reach', plan.operation);
    observe('reach', plan.before === plan.after ? 'unchanged-derived-field' : 'changed-derived-field');
  },
  check: (plan, trace, expected) => differs('initial', 'correct derived validators', trace.find(o => o.checkpoint === 'initial')?.value, { status: 200, body: JSON.stringify({ value: plan.before }), tag: true })
    ?? differs('current', 'correct derived validators', trace.find(o => o.checkpoint === 'current')?.value, expected)
    ?? differs('repeat', 'correct derived validators', trace.find(o => o.checkpoint === 'repeat')?.value, { status: 304, body: '', sameTag: true }) ?? pass,
  calibrations: [{ name: 'stale-derived-304', law: 'correct derived validators', history: { constructed: 'getItem-derived-change' }, corrupt: trace => trace.map(o => o.checkpoint === 'current' ? { ...o, value: { status: 304, body: '', changed: false } } : o) }],
});
