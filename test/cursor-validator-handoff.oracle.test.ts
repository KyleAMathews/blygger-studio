/**
 * A cursor may share the conditional adapter's first generation read only for
 * that operation's first attempt. Completed projections return a full snapshot;
 * source-domain stability alone does not justify a full representation stamp.
 * Authority: approved stable-dependency validator and generation-bound cursor
 * laws, docs/api.md. The model below predicts values and handler work from the
 * chosen write schedule, independently of SQL, receipts and cursor encoding.
 *
 * Every finite schedule runs against real D1 with a controlled projection gate:
 * no write, one/two related writes, unrelated-domain write, epoch rotation, and
 * projection failure. Writes occur after selection but before its post-snapshot;
 * each attempt prepares the derived source from those independently stored facts.
 * This is an operation/cursor receiving seam; the companion batch oracle drives
 * the actual mentions handlers. Arbitrary denied input and deployed D1 replicas
 * remain outside this property. No new model state or product policy is added.
 */
import { env } from 'cloudflare:test';
import { differs, oracleProperty, pass, violation } from '@tanstack/oracles';
import { conditionalOperation } from '../src/conditional-operation.ts';
import { cursorPage } from '../src/cursor-page.ts';
import { readOperation } from '../src/operation-policy.ts';
import { success, type OperationContext } from '../src/operation-types.ts';
import type { ChangeSnapshot } from '../src/changes.ts';
import type { OperationDefinition } from '../src/operations.ts';
import { withOracleCleanup } from './oracle-cleanup.ts';

const schedules = ['none', 'related-once', 'related-twice', 'unrelated', 'epoch', 'projection-failure'] as const;
const law = 'complete cursor generation handoff';
oracleProperty({
  id: 'cursor-validator-generation-handoff',
  owns: ['src/conditional-operation.ts#conditionalOperation', 'src/cursor-page.ts#cursorPage'],
  law: {
    statement: 'A conditional cursor read reuses only its own first full snapshot, retries from fresh state, completes proof only after a successful stable projection, and installs a validator stamp only across equal full snapshots.',
    authority: 'Kyle Mathews, approved stable-dependency validators and generation-bound reads, 2026-11-18; docs/api.md cursors and resource validators.',
    limits: 'Six finite real D1 schedules at a controlled operation/cursor seam, one row and no continuation. Actual batch handlers are covered by conditional-batch-bounded-work.',
  },
  histories: { enumerated: schedules, states: [...schedules] },
  label: schedule => schedule,
  model: schedule => {
    const retry = schedule === 'related-once' || schedule === 'epoch';
    const failed = schedule === 'related-twice' || schedule === 'projection-failure';
    const current = schedule === 'related-twice' ? 'current-2' : ['related-once', 'unrelated', 'epoch'].includes(schedule) ? 'current-1' : 'old';
    const conservative = {
      first: { status: schedule === 'related-twice' ? 409 : schedule === 'projection-failure' ? 500 : 200,
        value: failed ? null : retry ? current : 'old', projections: retry || schedule === 'related-twice' ? 2 : 1,
        proofValid: true },
      second: { status: failed || schedule === 'unrelated' ? 200 : 304, value: failed || schedule === 'unrelated' ? current : null,
        projections: schedule === 'none' ? 0 : 1 },
      third: { status: 304, value: null, projections: 0 },
    };
    // A successful retry may supply its own equal full bracket and install a
    // stamp immediately. Keep the complete alternative trace coherent.
    return retry ? [conservative, { ...conservative, second: { status: 304, value: null, projections: 0 } }] : [conservative];
  },
  driver: async (schedule, observe) => {
    const original = await env.DB.prepare('SELECT epoch FROM change_state WHERE id=1').first<{ epoch: string }>();
    if (!original) throw new Error('Missing change state fixture');
    await withOracleCleanup(async () => {
      await env.DB.prepare('CREATE TABLE IF NOT EXISTS handoff_fixture(id INTEGER PRIMARY KEY,value TEXT)').run();
      await env.DB.prepare("INSERT INTO handoff_fixture VALUES(1,'old')").run();
      await env.DB.prepare('CREATE TABLE IF NOT EXISTS handoff_source(id INTEGER PRIMARY KEY,value TEXT)').run();
      await env.DB.prepare("INSERT INTO handoff_source VALUES(1,'old')").run();
      // A distinct identity per history prevents cross-history isolate stamps.
      const db = new Proxy(env.DB, { get(target, key) { const value = Reflect.get(target, key); return typeof value === 'function' ? value.bind(target) : value; } });
      const context: OperationContext = { env: { ...env, DB: db }, url: 'https://example.com/blyg/api/handoff', access: null, extensions: [], defer() {} };
      let projections = 0, active = true, receipt: ChangeSnapshot | undefined;
      const definition: OperationDefinition = {
        route: { method: 'get', path: '/handoff', operationId: 'listMentions', responses: {}, policy: readOperation() },
        handler: async ctx => {
          receipt = ctx.conditionalSnapshot;
          return success(await cursorPage<{ id: number; value: string }>(ctx.env.DB, {}, {
            name: 'handoff', domains: ['mentions'], sql: 'SELECT * FROM handoff_fixture', order: [{ column: 'id', direction: 'asc' }],
            // Preparation is part of each attempt: a retry must materialize
            // the new source before projecting it, not reuse the first build.
            prepare: async () => { await env.DB.prepare('UPDATE handoff_fixture SET value=(SELECT value FROM handoff_source WHERE id=1) WHERE id=1').run(); },
            project: async rows => {
              projections++;
              if (active && schedule === 'projection-failure') throw new Error('Controlled projection failure');
              if (active && (projections === 1 && schedule !== 'none' || projections === 2 && schedule === 'related-twice')) {
                await env.DB.prepare('UPDATE handoff_source SET value=? WHERE id=1').bind(`current-${projections}`).run();
                await env.DB.prepare(schedule === 'unrelated' ? 'UPDATE change_state SET settings=settings+1 WHERE id=1'
                  : schedule === 'epoch' ? "UPDATE change_state SET epoch=epoch||'-handoff' WHERE id=1"
                  : 'UPDATE change_state SET mentions=mentions+1 WHERE id=1').run();
              }
              return rows;
            },
          }, ctx.conditionalSnapshot));
        },
      };
      const input = { path: {}, query: {} };
      let tag: string | undefined;
      for (const checkpoint of ['first', 'second', 'third'] as const) {
        const beforeProjections = projections;
        receipt = undefined;
        let result;
        try { result = await conditionalOperation(definition, input, context, tag); }
        catch (error) { observe(checkpoint, { productionError: error instanceof Error ? { name: error.name, message: error.message } : String(error) }); return; }
        const current = await env.DB.prepare('SELECT * FROM change_state WHERE id=1').first<Record<string, unknown>>();
        // The handler can replace receipt across await; TS does not track that callback write.
        const proof = receipt as ChangeSnapshot | undefined;
        const snapshotRow = proof?.after ? { epoch: proof.after.epoch, ...proof.after.domains, id: 1 } : null;
        const normalized = { status: result.status, value: result.status === 200 ? (result.body as { items?: { value: string }[] }).items?.[0]?.value : null,
          projections: projections - beforeProjections,
          ...(checkpoint === 'first' ? { proofValid: !proof?.after || result.status === 200 && Boolean(snapshotRow && current && Object.entries(snapshotRow).every(([key,value]) => current[key] === value)) } : {}),
        };
        observe(checkpoint, normalized);
        active = false;
        tag = result.headers.ETag ?? undefined;
      }
      observe('reach', schedule);
    }, [
      () => env.DB.prepare('DELETE FROM handoff_fixture').run(),
      () => env.DB.prepare('DELETE FROM handoff_source').run(),
      () => env.DB.prepare('UPDATE change_state SET epoch=? WHERE id=1').bind(original.epoch).run(),
    ]);
  },
  check: (_schedule, trace, allowed) => {
    const observed = trace.filter(entry => entry.checkpoint !== 'reach');
    let candidates = allowed;
    for (const entry of observed) {
      const next = candidates.filter(expected => !differs(entry.checkpoint, law, entry.value, expected[entry.checkpoint as keyof typeof expected]));
      if (!next.length) return violation(entry.checkpoint, 'observed prefix matches no permitted generation handoff trace', law, {
        actual: entry.value, expected: candidates.map(expected => expected[entry.checkpoint as keyof typeof expected]),
      });
      candidates = next;
    }
    return differs('completed checkpoints', law, observed.map(entry => entry.checkpoint), ['first','second','third']) ?? pass;
  },
  calibrations: [{ name: 'completed-failed-projection', law, history: { enumerated: 'projection-failure' },
    corrupt: trace => trace.map(entry => entry.checkpoint === 'first' ? { ...entry, value: { ...(entry.value as object), proofValid: false } } : entry) }],
});
