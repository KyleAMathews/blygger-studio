import { testItemRevision } from './helpers.ts';
/**
 * Rejecting a patch must leave all its requested changes unapplied.
 * A successful patch changes only supplied mutable fields. Status alone cannot
 * show that validation prevented a partial write.
 *
 * Contract: docs/api.md defines partial-edit fields, domain checks and guarded409.
 * RFC5789 §2 requires atomic application of the entire patch:
 * https://www.rfc-editor.org/rfc/rfc5789.html#section-2
 * Exact mutable fields and status choices are Blygger policy, not an RFC schema.
 * Model: rejection preserves the complete before projection; acceptance replaces
 * only requested fields. Controlled domain races preserve the concurrent writer's
 * complete projection, not the stale projection read before that writer ran.
 * History grammar: subsets of text/kind/response/stub-clear fields, plus one invalid
 * response enum, malformed citation, immutable field or fragment-stub combination.
 * Fixed races change kind, stub, withdrawal or provenance-validation text before the write.
 * Driver: generated SDK through SELF for ordinary patches. Race probes call ownerApi
 * with a D1 proxy that runs a real competing update at the guarded SQL boundary.
 * Refinement: exact status and subsequent owner GET; the race seam must run once.
 * Accepted content/kind/clear patches may change updated time, which this model
 * normalizes. Other fields remain exact. Normalization does not prove clock behavior.
 * Limits: no general concurrent text revision control, every field combination,
 * provider-failure rollback or proof about GET visibility during an in-flight write.
 */
import { SELF, env, createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import fc from "fast-check";
import { differs, oracleProperty, pass, type Observation } from "@tanstack/oracles";
import { BlyggerApi, createBlyggerClient, unwrap } from "../sdk/dist/browser.js";
import { ownerApi } from "../src/owner-api.ts";
import type { Env } from "../src/types.ts";
import { BASE, login } from "./helpers.ts";


// Four booleans select supplied fields independently. The invalid axis overrides
// one selected field, so a rejected patch can still contain valid sibling changes.
// A fragment-stub case exercises domain rejection beyond JSON shape validation.
// Sampling does not exhaust all eighty boolean/rejection cells.
const input = fc.record({ text: fc.boolean(), kind: fc.boolean(), responses: fc.boolean(), clear: fc.boolean(), invalid: fc.constantFrom("none", "responses", "stub", "immutable", "domain") });
const clientFor = (cookie: string) => createBlyggerClient({ baseUrl: BASE + '/blyg/api', headers: { cookie }, fetch: (request, init) => SELF.fetch(request instanceof Request ? request : new Request(request, init)) });
type Input = { text: boolean; kind: boolean; responses: boolean; clear: boolean; invalid: string };
async function patch(input: Input, observe: (checkpoint: string, value: unknown) => void) {
  const client = clientFor(await login());
  const draft = await unwrap(BlyggerApi.createItem({ client, body: { kind: input.invalid === "domain" ? "fragment" : "thread", contentMd: "before" } }));
  const before = await unwrap(BlyggerApi.getItem({ client, path: { id: draft.id } }));
  const body: Record<string, unknown> = { expectedRevision: before.revision };
  if (input.text) body.contentMd = "after";
  if (input.kind) body.kind = "fragment";
  if (input.responses) body.responses = "hide";
  if (input.clear) body.stubOf = null;
  if (input.invalid === "responses") body.responses = "off";
  if (input.invalid === "stub") body.stubOf = { url: "not a URL" };
  if (input.invalid === "immutable") body.forkedFrom = null;
  if (input.invalid === "domain") body.stubOf = { url: "https://valid.example/" };
  const result = await BlyggerApi.updateItem({ client, path: { id: draft.id }, body: { ...(body as Record<string, unknown>), expectedRevision: await testItemRevision(draft.id) } });
  observe("PATCH acceptance", result.response!.status);
  const after = await unwrap(BlyggerApi.getItem({ client, path: { id: draft.id } }));
  // On rejection compare the entire owner projection, including timestamps.
  // On acceptance normalize only updated when this patch may change it. The expected
  // object then replaces explicit requested fields; omitted fields stay unchanged.
  const expected = { ...before, revision: before.revision + Number(input.text || input.kind || input.responses || input.clear), ...(input.text ? { contentMd: "after" } : {}), ...(input.kind ? { kind: "fragment" } : {}), ...(input.responses ? { responses: "hide" } : {}) };
  const projection = input.invalid === 'none' && (input.text || input.kind || input.clear) ? { ...after, updated: before.updated } : after;
  const reference = input.invalid === 'none' ? expected : before;
  // Before/after is a relation: preserve exact values for every field, while
  // avoiding random fixture IDs and wall-clock timestamps in the recorded trace.
  observe(input.invalid === 'none' ? 'PATCH changes only requested fields' : 'PATCH rejection preserves all fields', {
    keys: Object.keys(projection).sort(), expectedKeys: Object.keys(reference).sort(),
    fields: Object.fromEntries(Object.keys(reference).map(key => [key, JSON.stringify(projection[key as keyof typeof projection]) === JSON.stringify(reference[key as keyof typeof reference])])),
  });
}
async function provenanceRace(replacement: boolean, observe: (checkpoint: string, value: unknown) => void) {
    const cookie = await login();
    const draft = await unwrap(BlyggerApi.createItem({ client: clientFor(cookie), body: { contentMd: "[TK]instruction[=]output[/TK]" } }));
    let reached = 0;
    let concurrent: unknown;
    const db = new Proxy(env.DB, { get(target, key) {
      if (key === "prepare") return (sql: string) => {
        const statement = target.prepare(sql);
        if (!sql.startsWith("UPDATE items SET")) return statement;
        return { bind: (...values: Parameters<D1PreparedStatement["bind"]>) => {
          const bound = statement.bind(...values);
          return { first: async () => {
            reached++;
            await unwrap(BlyggerApi.updateItem({ client: clientFor(cookie), path: { id: draft.id }, body: { ...({ contentMd: "no scopes remain" }), expectedRevision: await testItemRevision(draft.id) } }));
            concurrent = await unwrap(BlyggerApi.getItem({ client: clientFor(cookie), path: { id: draft.id } }));
            return bound.first();
          } };
        } } as D1PreparedStatement;
      };
      const value = Reflect.get(target, key);
      return typeof value === "function" ? value.bind(target) : value;
    } });
    const context = createExecutionContext();
    const body = { expectedRevision: draft.revision, provenance: [{ sources: [], model: "client-model" }], ...(replacement ? { contentMd: "[TK]replacement[=]new output[/TK]" } : {}) };
    const response = await ownerApi.fetch(new Request(`${BASE}/items/${draft.id}`, {
      method: "PATCH", headers: { cookie, "content-type": "application/json" }, body: JSON.stringify(body),
    }), { ...env, DB: db } as Env, context);
    await waitOnExecutionContext(context);

    observe("stale patch admission", { reached, status: response.status });
    const after = await unwrap(BlyggerApi.getItem({ client: clientFor(cookie), path: { id: draft.id } }));
    observe("concurrent projection", JSON.stringify(after) === JSON.stringify(concurrent));
}
  // The race starts after request validation and before the guarded write executes.
  // A real competing request changes a premise. The stale patch must return409 and
  // leave exactly that concurrent result. Counting the seam rules out a vacuous race.
  // This direct ownerApi witness does not exercise top-level forwarding middleware.
async function premiseRace(boundary: "kind" | "stub" | "withdraw", observe: (checkpoint: string, value: unknown) => void) {
    const cookie = await login(), client = clientFor(cookie);
    const draft = await unwrap(BlyggerApi.createItem({ client, body: { kind: "thread", contentMd: "before" } }));
    if (boundary === "withdraw") await unwrap(BlyggerApi.publishItem({ client, path: { id: draft.id } , body: { expectedRevision: await testItemRevision(draft.id) } }));
    let reached = 0;
    let concurrent: unknown;
    const db = new Proxy(env.DB, { get(target, key) {
      if (key === "prepare") return (sql: string) => {
        const statement = target.prepare(sql);
        if (!sql.startsWith("UPDATE items SET")) return statement;
        return { bind: (...values: Parameters<D1PreparedStatement["bind"]>) => {
          const bound = statement.bind(...values);
          return { first: async () => {
            reached++;
            if (boundary === "withdraw") await unwrap(BlyggerApi.withdrawItem({ client, path: { id: draft.id } , body: { expectedRevision: await testItemRevision(draft.id) } }));
            else await unwrap(BlyggerApi.updateItem({ client, path: { id: draft.id }, body: { ...(boundary === "kind" ? { kind: "fragment" } : { stubOf: { url: "https://other.example/" } }), expectedRevision: await testItemRevision(draft.id) } }));
            concurrent = await unwrap(BlyggerApi.getItem({ client, path: { id: draft.id } }));
            return bound.first();
          } };
        } } as D1PreparedStatement;
      };
      const value = Reflect.get(target, key);
      return typeof value === "function" ? value.bind(target) : value;
    } });
    const context = createExecutionContext();
    const response = await ownerApi.fetch(new Request(`${BASE}/items/${draft.id}`, { method: "PATCH", headers: { cookie, "content-type": "application/json" }, body: JSON.stringify({ contentMd: "must not persist", responses: "hide", expectedRevision: await testItemRevision(draft.id) }) }), { ...env, DB: db } as unknown as Env, context);
    await waitOnExecutionContext(context);
    observe("stale patch admission", { reached, status: response.status });
    observe("concurrent projection", JSON.stringify(await unwrap(BlyggerApi.getItem({ client, path: { id: draft.id } }))) === JSON.stringify(concurrent));
}

const matchingProjection = (trace: readonly Observation[]) => {
  const entry = trace.find(value => value.checkpoint.startsWith('PATCH ') && value.checkpoint !== 'PATCH acceptance');
  if (!entry) return false;
  const projection = entry.value as { keys: string[]; expectedKeys: string[]; fields: Record<string, boolean> };
  return JSON.stringify(projection.keys) === JSON.stringify(projection.expectedKeys) && Object.values(projection.fields).every(Boolean);
};
// A reach state records that a complete receiving projection exists for the
// selected validation premise, not that its status or fields passed the law.
const patchStates = ['valid supplied fields', 'omitted fields', 'invalid responses', 'invalid stub', 'invalid immutable', 'invalid domain'];
function patchReach(history: Input, trace: readonly Observation[]) {
  if (!trace.some(entry => entry.checkpoint === 'PATCH acceptance') || !trace.some(entry => entry.checkpoint.startsWith('PATCH ') && entry.checkpoint !== 'PATCH acceptance')) return [];
  return history.invalid === 'none' ? [history.text || history.kind || history.responses || history.clear ? 'valid supplied fields' : 'omitted fields'] : ['invalid ' + history.invalid];
}
oracleProperty({
  id: 'patch-atomicity', owns: ['src/api.ts#updateItemOperation'],
  law: { statement: 'Each patch either rejects with every field unchanged or replaces exactly the supplied mutable fields.', authority: 'RFC5789 §2; docs/api.md; original PATCH atomicity oracle', limits: 'Original bounded field grammar; accepted text/kind/clear patches normalize updated only.' },
  histories: { arbitrary: input, runs: 8, fixedSeeds: [20261001], states: patchStates, constructed: [...['none', 'responses', 'stub', 'immutable', 'domain'].map(invalid => ({ name: 'all fields with ' + invalid, enters: [invalid === 'none' ? 'valid supplied fields' : 'invalid ' + invalid], build: (): Input => ({ text: true, kind: true, responses: true, clear: true, invalid }) })), { name: 'omitted fields remain unchanged', enters: ['omitted fields'], build: (): Input => ({ text: false, kind: false, responses: false, clear: false, invalid: 'none' }) }] },
  model: (history: Input) => history.invalid === 'none' ? 200 : 400,
  driver: patch, reached: patchReach,
  // Missing projections keep their completion checkpoint; a received wrong
  // projection keeps the exact boundary that cleanup must not replace.
  check: (_history, trace, status) => differs('PATCH acceptance', 'PATCH acceptance', trace.filter(value => value.checkpoint === 'PATCH acceptance').map(value => value.value), [status]) ?? differs(trace.find(entry => entry.checkpoint.startsWith('PATCH ') && entry.checkpoint !== 'PATCH acceptance')?.checkpoint ?? 'complete owner projection', 'PATCH atomicity', matchingProjection(trace), true) ?? pass,
  calibrations: [{ name: 'partly applied rejected patch', law: 'PATCH atomicity', history: { constructed: 'all fields with responses' }, corrupt: trace => trace.map(entry => entry.checkpoint === 'PATCH rejection preserves all fields' ? { ...entry, value: { ...(entry.value as object), fields: { contentMd: false } } } : entry) }],
});
type Race = { boundary: 'provenance-text'; replacement: boolean } | { boundary: 'kind' | 'stub' | 'withdraw' };
oracleProperty({
  id: 'patch-atomicity-races', owns: ['src/api.ts#updateItemOperation'],
  law: { statement: 'A stale patch rejects once at its guarded write and leaves the complete concurrent owner projection unchanged.', authority: 'docs/api.md guarded409; original controlled race witnesses', limits: 'Five original guarded UPDATE schedules; direct ownerApi boundary.' },
  histories: { enumerated: [{ boundary: 'provenance-text', replacement: false }, { boundary: 'provenance-text', replacement: true }, { boundary: 'kind' }, { boundary: 'stub' }, { boundary: 'withdraw' }] as Race[], states: ['provenance premise', 'replacement provenance premise', 'kind premise', 'stub premise', 'withdraw premise'] },
  label: history => history.boundary + ('replacement' in history ? ': replacement ' + history.replacement : ''),
  model: () => ({ admission: { reached: 1, status: 409 }, unchanged: true }),
  driver: (history, observe) => history.boundary === 'provenance-text' ? provenanceRace(history.replacement, observe) : premiseRace(history.boundary, observe),
  reached: (history, trace) => trace.some(entry => entry.checkpoint === 'stale patch admission' && (entry.value as { reached: number }).reached === 1) ? [history.boundary === 'provenance-text' ? history.replacement ? 'replacement provenance premise' : 'provenance premise' : history.boundary + ' premise'] : [],
  check: (_history, trace, expected) => differs(trace.find(entry => entry.checkpoint === 'stale patch admission')?.checkpoint ?? 'guarded write', 'stale patch admission', trace.filter(entry => entry.checkpoint === 'stale patch admission').map(entry => entry.value), [expected.admission]) ?? differs(trace.find(entry => entry.checkpoint === 'concurrent projection')?.checkpoint ?? 'concurrent writer preserved', 'concurrent projection', trace.filter(entry => entry.checkpoint === 'concurrent projection').map(entry => entry.value), [expected.unchanged]) ?? pass,
  calibrations: [{ name: 'stale patch overwrites concurrent writer', law: 'concurrent projection', history: { enumerated: 0 }, corrupt: trace => trace.map(entry => entry.checkpoint === 'concurrent projection' ? { ...entry, value: false } : entry) }],
});
