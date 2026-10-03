import { SELF, env, createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { BlyggerApi, createBlyggerClient, unwrap } from "../sdk/dist/browser.js";
import { ownerApi } from "../src/owner-api.ts";
import type { Env } from "../src/types.ts";
import { BASE, login } from "./helpers.ts";
import { atCheckpoint, campaign } from "./oracle-campaign.ts";

/* Authority: docs/api.md partial edits; rejected patches cannot partly apply.
 * Model: replace requested draft fields only, keeping all other public facts.
 * Grammar: any subset of content/kind/responses/stub-clear; independently add
 * an invalid boolean enum, malformed stub, or immutable field. Plain drafts
 * only. Concurrent text edits and transaction rollback on provider failure are
 * outside this model. Driver: SDK -> real Worker; compare a subsequent read.
 */
const input = fc.record({ text: fc.boolean(), kind: fc.boolean(), responses: fc.boolean(), clear: fc.boolean(), invalid: fc.constantFrom("none", "responses", "stub", "immutable", "domain") });
const clientFor = (cookie: string) => createBlyggerClient({ baseUrl: BASE, headers: { cookie }, fetch: (request, init) => SELF.fetch(request instanceof Request ? request : new Request(request, init)) });
async function patch(input: { text: boolean; kind: boolean; responses: boolean; clear: boolean; invalid: string }) {
  const client = clientFor(await login());
  const draft = await unwrap(BlyggerApi.createItem({ client, body: { kind: input.invalid === "domain" ? "fragment" : "thread", content_md: "before" } }));
  const before = await unwrap(BlyggerApi.getItem({ client, path: { id: draft.id } }));
  const body: Record<string, unknown> = {};
  if (input.text) body.content_md = "after";
  if (input.kind) body.kind = "fragment";
  if (input.responses) body.responses = "hide";
  if (input.clear) body.stub_of = null;
  if (input.invalid === "responses") body.responses = "off";
  if (input.invalid === "stub") body.stub_of = { url: "not a URL" };
  if (input.invalid === "immutable") body.forked_from = null;
  if (input.invalid === "domain") body.stub_of = { url: "https://valid.example/" };
  const result = await BlyggerApi.updateItem({ client, path: { id: draft.id }, body: body as never });
  atCheckpoint("PATCH acceptance", () => expect(result.response!.status).toBe(input.invalid === "none" ? 200 : 400));
  const after = await unwrap(BlyggerApi.getItem({ client, path: { id: draft.id } }));
  if (input.invalid !== "none") atCheckpoint("PATCH rejection preserves all fields", () => expect(after).toEqual(before));
  else atCheckpoint("PATCH changes only requested fields", () => expect(input.text || input.kind || input.clear ? { ...after, updated: before.updated } : after).toEqual({ ...before, ...(input.text ? { content_md: "after" } : {}), ...(input.kind ? { kind: "fragment", authored_kind: "fragment" } : {}), ...(input.responses ? { responses: "hide" } : {}) }));
}
describe("PATCH atomicity oracle", () => {
  it("exercises every field and each rejection branch", async () => {
    for (const invalid of ["none", "responses", "stub", "immutable", "domain"]) await patch({ text: true, kind: true, responses: true, clear: true, invalid });
  });
  it("rejects a partly applied result in its checker", () => {
    const before = { content_md: "before", responses: "show" };
    expect(() => expect({ ...before, content_md: "after" }).toEqual(before)).toThrow();
  });
  it.each(["kind", "stub", "withdraw"])("rejects the complete patch when a concurrent %s change invalidates its premise", async boundary => {
    const cookie = await login(), client = clientFor(cookie);
    const draft = await unwrap(BlyggerApi.createItem({ client, body: { kind: "thread", content_md: "before" } }));
    if (boundary === "withdraw") await unwrap(BlyggerApi.publishItem({ client, path: { id: draft.id } }));
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
            if (boundary === "withdraw") await unwrap(BlyggerApi.withdrawItem({ client, path: { id: draft.id } }));
            else await unwrap(BlyggerApi.updateItem({ client, path: { id: draft.id }, body: boundary === "kind" ? { kind: "fragment" } : { stub_of: { url: "https://other.example/" } } }));
            concurrent = await unwrap(BlyggerApi.getItem({ client, path: { id: draft.id } }));
            return bound.first();
          } };
        } } as D1PreparedStatement;
      };
      const value = Reflect.get(target, key);
      return typeof value === "function" ? value.bind(target) : value;
    } });
    const context = createExecutionContext();
    const response = await ownerApi.fetch(new Request(`${BASE}/items/${draft.id}`, { method: "PATCH", headers: { cookie, "content-type": "application/json" }, body: JSON.stringify({ content_md: "must not persist", responses: "hide" }) }), { ...env, DB: db } as unknown as Env, context);
    await waitOnExecutionContext(context);
    expect(reached).toBe(1); expect(response.status).toBe(409);
    expect(await unwrap(BlyggerApi.getItem({ client, path: { id: draft.id } }))).toEqual(concurrent);
  });
  campaign("patch-atomicity", input, patch);
});
