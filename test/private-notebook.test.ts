// Private items 0c–0e and the hopper fix (sealed-content-build-plan §1; laws approved by
// Venkat, session 83): owner:private, private generation sources, the owner's search, and
// private hopper members. The public routes' half of "no leak" is private-surface.test.ts.
import { SELF, env } from "cloudflare:test";
import { Hono } from "hono";
import { beforeEach, describe, expect, it } from "vitest";
import { createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import type { ProviderFetchLike } from "../src/ai/provider.ts";
import { createOwnerApi } from "../src/owner-api.ts";
import { createDraft, getItem, putSettings } from "../src/model.ts";

beforeEach(() => putSettings(env.DB, { ai_model: "claude-opus-5" }));
import { runGenerateScope } from "../src/tk-generate.ts";
import { operationDefinitions } from "../src/operations.ts";
import { runOperation } from "../src/operation-runner.ts";
import type { OperationContext } from "../src/operation-types.ts";
import { BASE, apiJson, createAndPublish, getPublic, login, testRevisionBody } from "./helpers.ts";

const MARK = "notebookmark";
const WITHOUT = ["owner:read", "owner:draft", "owner:publish", "owner:manage", "reading:state"];
const WITH = [...WITHOUT, "owner:private"];

/** The owner API as a token holding exactly `scope` sees it. */
function tokenApi(scope: string[]) {
  const app = new Hono().route("/api", createOwnerApi({ scope, clientId: "notebook-test", userId: "owner" }));
  return async (method: string, path: string, body?: unknown) => {
    body = await testRevisionBody(method, `/api${path}`, body);
    const ctx = createExecutionContext();
    const response = await app.fetch(new Request(`https://example.com/api${path}`, {
      method, ...(body === undefined ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
    }), { ...env, API_READ_LIMIT: "10000", API_WRITE_LIMIT: "10000" }, ctx);
    await waitOnExecutionContext(ctx);
    return { status: response.status, json: await response.json<any>().catch(() => null) };
  };
}

async function privateItem(cookie: string, text = `a private note ${MARK}`) {
  const created = await apiJson(cookie, "POST", "/blyg/api/items", { contentMd: text, kind: "fragment" });
  expect((await apiJson(cookie, "POST", `/blyg/api/items/${created.json.id}/publish`, { visibility: "private" })).status).toBe(200);
  return created.json.id as string;
}

async function hopper(cookie: string, name: string, isPublic: boolean) {
  const created = await apiJson(cookie, "POST", "/blyg/api/hoppers", { name });
  expect(created.status).toBe(201);
  const id = created.json.id as string;
  if (isPublic) expect((await apiJson(cookie, "PATCH", `/blyg/api/hoppers/${id}`, { public: true })).status).toBe(200);
  return id;
}

describe("owner:private: a token without it does not see the notebook", () => {
  it("answers 404 for a private item on every by-id route, as for an unknown id", async () => {
    const cookie = await login();
    const id = await privateItem(cookie);
    const without = tokenApi(WITHOUT), withScope = tokenApi(WITH);
    expect(await without("GET", `/items/${id}`)).toEqual({ status: 404, json: expect.objectContaining({}) });
    const unknown = await without("GET", "/items/zzzzzzzzzzzzzzzzzzzzzzzzzz");
    expect((await without("GET", `/items/${id}`)).json).toEqual(unknown.json);
    expect((await without("PATCH", `/items/${id}`, { contentMd: "changed" })).status).toBe(404);
    expect((await without("POST", `/items/${id}/publish`, {})).status).toBe(404);
    expect((await without("GET", `/items/${id}/private-versions`)).status).toBe(403);
    expect((await withScope("GET", `/items/${id}`)).status).toBe(200);
    expect((await withScope("GET", `/items/${id}/private-versions`)).status).toBe(200);
    // The text never changed through the refused write.
    expect((await getItem(env.DB, id))!.content_md).toContain(MARK);
  });

  it("leaves private items out of lists, counts, search and reading", async () => {
    const cookie = await login();
    const id = await privateItem(cookie);
    const without = tokenApi(WITHOUT), withScope = tokenApi(WITH);
    const ids = (r: { json: any }) => (r.json.items as { id?: string; own?: { id: string } }[]).map((row) => row.id ?? row.own?.id);
    expect(ids(await without("GET", "/items?limit=50"))).not.toContain(id);
    expect(ids(await withScope("GET", "/items?limit=50"))).toContain(id);
    const all = async (api: ReturnType<typeof tokenApi>) => (await api("GET", "/items/summary")).json.all as number;
    expect(await all(withScope)).toBe((await all(without)) + (await env.DB.prepare("SELECT COUNT(*) AS n FROM items WHERE status = 'private'").first<{ n: number }>())!.n);
    expect(ids(await without("GET", `/search?q=${MARK}&include=drafts`))).not.toContain(id);
    expect(ids(await without("GET", "/reading?sub=own&limit=50"))).not.toContain(id);
    expect((await without("GET", "/reading?sub=private")).json.items).toEqual([]);
    expect((await without("GET", "/reading/summary")).json.counts.private).toBe(0);
  });

  it("refuses a private publish, named or by default, to a token that could not then see the item", async () => {
    const cookie = await login();
    const without = tokenApi(WITHOUT);
    const named = await apiJson(cookie, "POST", "/blyg/api/items", { contentMd: "named", kind: "fragment" });
    expect((await without("POST", `/items/${named.json.id}/publish`, { visibility: "private" })).status).toBe(403);
    expect((await apiJson(cookie, "PATCH", "/blyg/api/settings", { defaultVisibility: "private" })).status).toBe(200);
    try {
      const byDefault = await apiJson(cookie, "POST", "/blyg/api/items", { contentMd: "by default", kind: "fragment" });
      const refused = await without("POST", `/items/${byDefault.json.id}/publish`, {});
      expect(refused.status).toBe(403);
      expect((await getItem(env.DB, byDefault.json.id))!.status).toBe("draft");
    } finally {
      await apiJson(cookie, "PATCH", "/blyg/api/settings", { defaultVisibility: "public" });
    }
  });
});

/** `db`, but the item turns private right after the first read that touches it: the owner publishing privately mid-request. */
function turnsPrivate(db: D1Database, id: string) {
  let fired = false;
  const flip = async (sql: string[]) => {
    if (fired || !sql.some((s) => /\bitems\b/.test(s))) return;
    fired = true;
    await db.prepare("UPDATE items SET status = 'private', revision = revision + 1 WHERE id = ?").bind(id).run();
  };
  const sqlOf = new WeakMap<D1PreparedStatement, string>();
  const wrap = (sql: string, target: D1PreparedStatement): D1PreparedStatement => {
    const wrapped = new Proxy(target, { get(value, key) {
      if (key === "bind") return (...args: unknown[]) => wrap(sql, value.bind(...args));
      const method = Reflect.get(value, key);
      if (["all", "first", "raw", "run"].includes(String(key))) return async (...args: unknown[]) => {
        const result = await Reflect.apply(method, value, args); await flip([sql]); return result;
      };
      return typeof method === "function" ? method.bind(value) : method;
    } });
    sqlOf.set(wrapped, sql);
    return wrapped;
  };
  return new Proxy(db, { get(target, key) {
    if (key === "prepare") return (sql: string) => wrap(sql, target.prepare(sql));
    if (key === "batch") return async (statements: D1PreparedStatement[]) => {
      const result = await target.batch(statements); await flip(statements.map((s) => sqlOf.get(s) ?? "")); return result;
    };
    const method = Reflect.get(target, key);
    return typeof method === "function" ? method.bind(target) : method;
  } });
}

describe("owner:private: one observation decides what a by-id read returns (R07)", () => {
  for (const shape of ["single", "batch"] as const) {
    it(`never returns a private item to a token without the scope when it turns private mid-read (${shape})`, async () => {
      const cookie = await login();
      const id = (await apiJson(cookie, "POST", "/blyg/api/items", { contentMd: `about to turn private ${MARK}`, kind: "fragment" })).json.id as string;
      const context: OperationContext = {
        env: { ...env, DB: turnsPrivate(env.DB, id), API_READ_LIMIT: "10000", API_DELEGATED_READ_LIMIT: "10000" },
        access: { scope: WITHOUT, clientId: "race-test", userId: "owner" },
        url: "https://example.com/blyg/api/items", extensions: [], defer() {},
      };
      const definitions = operationDefinitions([]);
      const result = shape === "single"
        ? await runOperation(definitions.get("getItem")!, { path: { id }, query: {}, body: undefined }, context)
        : await runOperation(definitions.get("batchRead")!, { path: {}, query: {}, body: { operation: "getItem", requests: [{ path: { id } }] } }, context);
      const body = shape === "single" ? (result.ok ? result.value : null) : result.ok ? (result.value as { status: number; body: any }[])[0]?.body : null;
      // Either answer is consistent: the draft as it was, or not found. A private item is not.
      expect(body?.status).not.toBe("private");
      // A nearby legal history: the same read with no race returns the item as it is now (private, so not found).
      const after = await runOperation(definitions.get("getItem")!, { path: { id }, query: {}, body: undefined }, { ...context, env: { ...context.env, DB: env.DB } });
      expect(after.ok).toBe(false);
    });
  }
});

/** A multipart upload as a token holding exactly `scope` sends it. */
async function tokenUpload(scope: string[], form: FormData) {
  const app = new Hono().route("/api", createOwnerApi({ scope, clientId: "notebook-test", userId: "owner" }));
  const ctx = createExecutionContext();
  const response = await app.fetch(new Request("https://example.com/api/media", { method: "POST", body: form }), { ...env, API_READ_LIMIT: "10000", API_WRITE_LIMIT: "10000" }, ctx);
  await waitOnExecutionContext(ctx);
  return { status: response.status, json: await response.json<any>().catch(() => null) };
}

describe("notebook authority on the Agentic feed, the shelf and attachments (R09, R10)", () => {
  it("leaves private items out of an edition's stored references, layout, write and conflict answers", async () => {
    const cookie = await login();
    const hidden = await privateItem(cookie), open = await createAndPublish(cookie, "an open agentic entry");
    const edition = (remoteIds: string[]) => ({ agent: { name: "notebook test" }, sections: [{ title: "Today", entries: remoteIds.map((remoteId) => ({ sub: "~own", remoteId, headline: "h" })) }] });
    const { revision } = (await apiJson(cookie, "GET", "/blyg/api/agentic/default")).json;
    expect((await apiJson(cookie, "PUT", "/blyg/api/agentic/default", { edition: edition([hidden, open]), expectedRevision: revision })).status).toBe(200);
    const without = tokenApi(WITHOUT), withScope = tokenApi(WITH);
    const read = await without("GET", "/agentic/default");
    expect(read.status).toBe(200);
    expect(JSON.stringify(read.json)).not.toContain(hidden);
    expect(JSON.stringify(read.json)).toContain(open);
    expect(JSON.stringify((await withScope("GET", "/agentic/default")).json)).toContain(hidden);
    const stale = await without("PUT", "/agentic/default", { edition: edition([open]), expectedRevision: read.json.revision - 1 });
    expect(stale.status).toBe(409);
    expect(JSON.stringify(stale.json)).not.toContain(hidden);
    // A write naming the hidden item answers as if it were unknown.
    const written = await without("PUT", "/agentic/default", { edition: edition([hidden, open]), expectedRevision: read.json.revision });
    expect(written.status).toBe(200);
    expect(JSON.stringify(written.json)).not.toContain(hidden);
  });

  it("hides private shelf entries from such a token, keeps them through its replace, and refuses to let it add one", async () => {
    const cookie = await login();
    const hidden = await privateItem(cookie), open = await createAndPublish(cookie, "an open shelf entry");
    const shelf = (await apiJson(cookie, "GET", "/blyg/api/shelf")).json;
    expect((await apiJson(cookie, "PUT", "/blyg/api/shelf", { entries: [{ sub: "~own", remoteId: hidden }, { sub: "~own", remoteId: open }], expectedRevision: shelf.revision })).status).toBe(200);
    const without = tokenApi(WITHOUT);
    const seen = await without("GET", "/shelf");
    expect(JSON.stringify(seen.json)).not.toContain(hidden);
    const stale = await without("PUT", "/shelf", { entries: seen.json.entries, expectedRevision: seen.json.revision - 1 });
    expect(stale.status).toBe(409);
    expect(JSON.stringify(stale.json)).not.toContain(hidden);
    const replaced = await without("PUT", "/shelf", { entries: [...seen.json.entries].reverse(), expectedRevision: seen.json.revision });
    expect(replaced.status).toBe(200);
    expect(JSON.stringify(replaced.json)).not.toContain(hidden);
    const kept = (await apiJson(cookie, "GET", "/blyg/api/shelf")).json.entries.map((e: any) => e.remoteId);
    expect(kept).toContain(hidden);
    // Naming a private item is naming an unknown one: it is dropped, as an unresolved entry is.
    const other = await privateItem(cookie, "another private note");
    const added = await without("PUT", "/shelf", { entries: [...replaced.json.entries, { sub: "~own", remoteId: other }], expectedRevision: replaced.json.revision });
    expect(added.status).toBe(200);
    expect((await apiJson(cookie, "GET", "/blyg/api/shelf")).json.entries.map((e: any) => e.remoteId)).not.toContain(other);
  });

  it("answers an attachment upload or removal on a private item as for an unknown one", async () => {
    const cookie = await login();
    const hidden = await privateItem(cookie);
    const form = () => {
      const f = new FormData();
      f.set("itemId", hidden); f.set("expectedRevision", "1");
      f.set("file", new File(["notebook bytes"], "n.png", { type: "image/png" }));
      return f;
    };
    const unknown = new FormData();
    unknown.set("itemId", "zzzzzzzzzzzzzzzzzzzzzzzzzz"); unknown.set("expectedRevision", "1");
    unknown.set("file", new File(["notebook bytes"], "n.png", { type: "image/png" }));
    const refused = await tokenUpload(WITHOUT, form());
    expect(refused).toEqual(await tokenUpload(WITHOUT, unknown));
    // The owner attaches one; the token cannot remove it, and hears "not found".
    const item = await getItem(env.DB, hidden);
    const ownerForm = form(); ownerForm.set("expectedRevision", String(item!.revision));
    const attached = await tokenUpload(WITH, ownerForm);
    expect(attached.status).toBeLessThan(300);
    const removed = await tokenApi(WITHOUT)("DELETE", `/media/${attached.json.id}`, { expectedRevision: (await getItem(env.DB, hidden))!.revision });
    expect(removed).toEqual(await tokenApi(WITHOUT)("DELETE", "/media/zzzzzzzzzzzzzzzzzzzzzzzzzz", { expectedRevision: 1 }));
  });
});

describe("a restricted hopper cursor follows the notebook (R11)", () => {
  const setup = async () => {
    const cookie = await login();
    const hopper = (await apiJson(cookie, "POST", "/blyg/api/hoppers", { name: `cursor ${Date.now()}` })).json.id as string;
    const ids: string[] = [];
    for (const text of ["first member", "second member", "third member"]) {
      const id = (await apiJson(cookie, "POST", "/blyg/api/items", { contentMd: text, kind: "fragment" })).json.id as string;
      expect((await apiJson(cookie, "PUT", `/blyg/api/hoppers/${hopper}/items/~own/${id}`)).status).toBe(200);
      ids.push(id);
    }
    const without = tokenApi(WITHOUT);
    const first = await without("GET", `/hoppers/${hopper}/memberships?limit=1`);
    expect(first.status).toBe(200);
    return { cookie, hopper, ids, without, first };
  };

  it("expires when a member it would list turns private between pages", async () => {
    const { cookie, hopper, ids, without, first } = await setup();
    const listed = first.json.items[0].remoteId as string;
    const later = ids.find((id) => id !== listed)!;
    expect((await apiJson(cookie, "POST", `/blyg/api/items/${later}/publish`, { visibility: "private" })).status).toBe(200);
    const next = await without("GET", `/hoppers/${hopper}/memberships?limit=1&cursor=${encodeURIComponent(first.json.page.nextCursor)}`);
    expect(next.status).toBe(409);
    expect(next.json.code).toBe("cursor-expired");
  });

  it("stays valid across an unrelated edit", async () => {
    const { cookie, hopper, without, first } = await setup();
    expect((await apiJson(cookie, "PATCH", "/blyg/api/settings", { aiStylePrompt: `unrelated ${Date.now()}` })).status).toBe(200);
    const next = await without("GET", `/hoppers/${hopper}/memberships?limit=1&cursor=${encodeURIComponent(first.json.page.nextCursor)}`);
    expect(next.status).toBe(200);
  });
});

describe("hidden answers equal unknown ones, and MCP challenges a default-private publish (R12)", () => {
  it("answers a hopper add for a private item as for an unknown one, also when the hopper is missing", async () => {
    const cookie = await login();
    const hidden = await privateItem(cookie);
    const without = tokenApi(WITHOUT);
    const unknownItem = "zzzzzzzzzzzzzzzzzzzzzzzzzz", missingHopper = "yyyyyyyyyyyyyyyyyyyyyyyyyy";
    expect(await without("PUT", `/hoppers/${missingHopper}/items/~own/${hidden}`)).toEqual(await without("PUT", `/hoppers/${missingHopper}/items/~own/${unknownItem}`));
    const hopper = (await apiJson(cookie, "POST", "/blyg/api/hoppers", { name: `equal ${Date.now()}` })).json.id as string;
    expect(await without("PUT", `/hoppers/${hopper}/items/~own/${hidden}`)).toEqual(await without("PUT", `/hoppers/${hopper}/items/~own/${unknownItem}`));
  });

  it("answers MCP getItem and listItems for a private item as REST does: unknown without the scope, present with it (R14)", async () => {
    const cookie = await login();
    const hidden = await privateItem(cookie);
    const token = async (scope: string[]) => (await apiJson(cookie, "POST", "/blyg/api/authorizations", { name: "notebook mcp read", scope, resource: "mcp" })).json.accessToken as string;
    const tool = async (bearer: string, name: string, args: Record<string, unknown>) => {
      const response = await SELF.fetch(`${BASE}/blyg/studio/mcp`, { method: "POST", headers: {
        Authorization: `Bearer ${bearer}`, "Content-Type": "application/json", Accept: "application/json, text/event-stream",
        "mcp-protocol-version": "2026-07-28", "mcp-method": "tools/call", "mcp-name": name,
      }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args,
        _meta: { "io.modelcontextprotocol/protocolVersion": "2026-07-28", "io.modelcontextprotocol/clientCapabilities": {} } } }) });
      const text = await response.text();
      return JSON.parse(text.includes("data:") ? text.slice(text.indexOf("{")) : text).result as { isError?: boolean; content: { text: string }[] };
    };
    const without = await token(["owner:read"]), withScope = await token(["owner:read", "owner:private"]);
    const unknown = "zzzzzzzzzzzzzzzzzzzzzzzzzz";
    const asHidden = await tool(without, "getItem", { path: { id: hidden } }), asUnknown = await tool(without, "getItem", { path: { id: unknown } });
    expect(asHidden.isError).toBe(true);
    expect(JSON.stringify(asHidden).replaceAll(hidden, unknown)).toBe(JSON.stringify(asUnknown));
    expect((await tool(withScope, "getItem", { path: { id: hidden } })).isError).toBeFalsy();
    const listed = async (bearer: string) => (JSON.parse((await tool(bearer, "listItems", { query: { limit: 100 } })).content[0].text).items as { id: string }[]).map((i) => i.id);
    expect(await listed(without)).not.toContain(hidden);
    expect(await listed(withScope)).toContain(hidden);
  });

  it("challenges for owner:private before an MCP publish that the default makes private", async () => {
    const cookie = await login();
    const minted = await apiJson(cookie, "POST", "/blyg/api/authorizations", { name: "notebook mcp", scope: ["owner:read", "owner:draft", "owner:publish"], resource: "mcp" });
    expect(minted.status).toBeLessThan(300);
    const draft = (await apiJson(cookie, "POST", "/blyg/api/items", { contentMd: `mcp default ${MARK}`, kind: "fragment" })).json.id as string;
    const call = async (body: Record<string, unknown>) => SELF.fetch(`${BASE}/blyg/studio/mcp`, { method: "POST", headers: {
      Authorization: `Bearer ${minted.json.accessToken}`, "Content-Type": "application/json", Accept: "application/json, text/event-stream",
      "mcp-protocol-version": "2026-07-28", "mcp-method": "tools/call", "mcp-name": "publishItem",
    }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "publishItem", arguments: { path: { id: draft }, body: await testRevisionBody("POST", `/blyg/api/items/${draft}/publish`, body) },
      _meta: { "io.modelcontextprotocol/protocolVersion": "2026-07-28", "io.modelcontextprotocol/clientCapabilities": {} } } }) });
    try {
      await putSettings(env.DB, { default_visibility: "private" });
      for (const body of [{}, { visibility: "private" }]) {
        const response = await call(body);
        await response.arrayBuffer();
        expect(response.status, JSON.stringify(body)).toBe(403);
        expect(response.headers.get("www-authenticate")).toContain('error="insufficient_scope"');
        expect(response.headers.get("www-authenticate")).toContain("owner:private");
      }
      expect((await getItem(env.DB, draft))!.status).toBe("draft");
    } finally {
      await putSettings(env.DB, { default_visibility: "public" });
    }
  });
});

describe("a client can tell hidden from gone (A01, R16)", () => {
  it("lists the token's granted scopes in /capabilities, so a missing owner:private explains absences", async () => {
    const cookie = await login();
    expect((await tokenApi(WITHOUT)("GET", "/capabilities")).json.scopes).toEqual(WITHOUT);
    expect((await tokenApi(WITH)("GET", "/capabilities")).json.scopes).toEqual(expect.arrayContaining(["owner:private"]));
    expect((await apiJson(cookie, "GET", "/blyg/api/capabilities")).json.scopes).toEqual(expect.arrayContaining([...WITH]));
  });
});

describe("the owner's search lists private items, marked", () => {
  it("finds a private item's text in compose search for the owner, and marks it", async () => {
    const cookie = await login();
    const id = await privateItem(cookie, `searchable ${MARK}found`);
    const { json } = await apiJson(cookie, "GET", `/blyg/api/search?q=${MARK}found&include=drafts`);
    const hit = (json.items as { id: string; private?: true; draft?: boolean }[]).find((row) => row.id === id);
    expect(hit).toMatchObject({ private: true, draft: false });
  });
});

describe("hoppers: the owner sees private members; the public never does", () => {
  it("lists own members in the owner's hopper view, keeps private ones off the public page, and names public hoppers on the item", async () => {
    const cookie = await login();
    const id = await privateItem(cookie, `hopper member ${MARK}`);
    const publicHopper = await hopper(cookie, "Open shelf", true);
    const quiet = await hopper(cookie, "Quiet shelf", false);
    for (const h of [publicHopper, quiet]) expect((await apiJson(cookie, "PUT", `/blyg/api/hoppers/${h}/items/~own/${id}`)).status).toBe(200);

    const view = await apiJson(cookie, "GET", `/blyg/api/reading?hopper=${publicHopper}`);
    expect((view.json.items as { own?: { id: string } }[]).map((row) => row.own?.id)).toContain(id);

    const item = await apiJson(cookie, "GET", `/blyg/api/items/${id}`);
    expect(item.json.hoppers).toEqual(expect.arrayContaining([
      { id: publicHopper, name: "Open shelf", public: true },
      { id: quiet, name: "Quiet shelf", public: false },
    ]));

    // The public page and an enabled feed answer, list a public neighbour, and leave the private
    // member out until it is raised (R15: with feeds off a 404 passed the old check).
    const slug = (await apiJson(cookie, "GET", `/blyg/api/hoppers/${publicHopper}`)).json.hopper.slug as string;
    const neighbour = await createAndPublish(cookie, "a public neighbour in the hopper");
    expect((await apiJson(cookie, "PUT", `/blyg/api/hoppers/${publicHopper}/items/~own/${neighbour}`)).status).toBe(200);
    expect((await apiJson(cookie, "PATCH", "/blyg/api/settings", { hopperFeeds: true })).status).toBe(200);
    try {
      for (const path of [`/blyg/h/${slug}`, `/blyg/h/${slug}/feed.xml`]) {
        const res = await getPublic(path);
        expect(res.status, path).toBe(200);
        const body = await res.text();
        expect(body, path).toContain(neighbour);
        expect(body, path).not.toContain(id);
      }
    } finally {
      await apiJson(cookie, "PATCH", "/blyg/api/settings", { hopperFeeds: false });
    }

    const without = tokenApi(WITHOUT);
    expect((await without("GET", `/hoppers/${publicHopper}/memberships`)).json.items.map((m: { remoteId: string }) => m.remoteId)).not.toContain(id);
    expect((await without("GET", `/hoppers/${publicHopper}`)).json.total).toBe(1); // the public neighbour only
    expect((await without("PUT", `/hoppers/${publicHopper}/items/~own/${id}`)).status).toBe(404);
    // Removing is idempotent: the answer is a non-member's, and the membership stays.
    expect((await without("DELETE", `/hoppers/${publicHopper}/items/~own/${id}`)).status).toBe(200);
    expect((await apiJson(cookie, "GET", `/blyg/api/items/${id}`)).json.hoppers.map((h: { id: string }) => h.id)).toContain(publicHopper);

    // Raised, it joins the page and the feed.
    expect((await apiJson(cookie, "POST", `/blyg/api/items/${id}/publish`, { visibility: "public" })).status).toBe(200);
    expect((await apiJson(cookie, "PATCH", "/blyg/api/settings", { hopperFeeds: true })).status).toBe(200);
    try {
      for (const path of [`/blyg/h/${slug}`, `/blyg/h/${slug}/feed.xml`]) expect(await (await getPublic(path)).text(), path).toContain(id);
    } finally {
      await apiJson(cookie, "PATCH", "/blyg/api/settings", { hopperFeeds: false });
    }
  });
});

describe("a private item as a generation source", () => {
  const fixture = (text: string): { fetchImpl: ProviderFetchLike; calls: any[] } => {
    const calls: any[] = [];
    return { calls, fetchImpl: async (_url, init) => {
      calls.push(JSON.parse(init.body));
      return { ok: true, status: 200, text: async () => JSON.stringify({ model: "claude-opus-5", content: [{ type: "text", text }] }) };
    } };
  };

  it("feeds a private source only to a caller that may see it, and then publishes only privately", async () => {
    const cookie = await login();
    const source = await privateItem(cookie, `the private source text ${MARK}`);
    const draft = await createDraft(env.DB, `[TK]summarize ![[${source}]][/TK]`);
    const refused = await runGenerateScope({ ...env, AI_PROVIDER_KEY: "k" }, draft, 0, fixture("x").fetchImpl);
    expect(refused).toMatchObject({ ok: false, status: 400 });

    const { fetchImpl, calls } = fixture("a summary");
    const result = await runGenerateScope({ ...env, AI_PROVIDER_KEY: "k" }, draft, 0, fetchImpl, undefined, { privateSources: true });
    expect(result).toMatchObject({ ok: true, text: "a summary" });
    expect(JSON.stringify(calls[0])).toContain("the private source text");

    const publicPublish = await apiJson(cookie, "POST", `/blyg/api/items/${draft.id}/publish`, { visibility: "public" });
    expect(publicPublish.status).toBe(400);
    expect(JSON.stringify(publicPublish.json)).toContain("private item");
    expect((await getItem(env.DB, draft.id))!.version).toBe(0);
    expect((await apiJson(cookie, "POST", `/blyg/api/items/${draft.id}/publish`, { visibility: "private" })).status).toBe(200);
  });

  // Private taint (Venkat, session 84; studio#178 R06, R08): a working copy whose TK output drew
  // on a private snapshot reads like a private item and publishes only privately, whatever
  // later happens to the source, and regenerating from it keeps the mark.
  it("hides a tainted working copy from a token without owner:private, in reads, lists and search (R08)", async () => {
    const cookie = await login();
    const source = await privateItem(cookie, `taint source ${MARK}`);
    const draft = await createDraft(env.DB, `taintdraft [TK]summarize ![[${source}]][/TK]`);
    expect(await runGenerateScope({ ...env, AI_PROVIDER_KEY: "k" }, draft, 0, fixture("derived words").fetchImpl, undefined, { privateSources: true })).toMatchObject({ ok: true });
    const without = tokenApi(WITHOUT), withScope = tokenApi(WITH);
    expect((await without("GET", `/items/${draft.id}`)).status).toBe(404);
    expect((await withScope("GET", `/items/${draft.id}`)).json.contentMd).toContain("derived words");
    const listed = (await without("GET", "/items?status=draft&limit=100")).json.items.map((i: any) => i.id);
    expect(listed).not.toContain(draft.id);
    const found = (await without("GET", "/search?q=taintdraft&include=drafts")).json;
    expect(JSON.stringify(found)).not.toContain(draft.id);
    expect(JSON.stringify((await withScope("GET", "/search?q=taintdraft&include=drafts")).json)).toContain(draft.id);
  });

  for (const fate of ["raised", "discarded"] as const) {
    it(`keeps the output private after its source is ${fate} (R06)`, async () => {
      const cookie = await login();
      const source = await privateItem(cookie, `fated source ${MARK}`);
      const draft = await createDraft(env.DB, `[TK]summarize ![[${source}]][/TK]`);
      expect(await runGenerateScope({ ...env, AI_PROVIDER_KEY: "k" }, draft, 0, fixture("from p1").fetchImpl, undefined, { privateSources: true })).toMatchObject({ ok: true });
      if (fate === "raised") expect((await apiJson(cookie, "POST", `/blyg/api/items/${source}/publish`, { visibility: "public" })).status).toBe(200);
      else expect((await apiJson(cookie, "DELETE", `/blyg/api/items/${source}`)).status).toBeLessThan(300);
      expect((await apiJson(cookie, "POST", `/blyg/api/items/${draft.id}/publish`, { visibility: "public" })).status).toBe(400);
      expect((await tokenApi(WITHOUT)("GET", `/items/${draft.id}`)).status).toBe(404);
    });
  }

  it("keeps the mark when a tainted scope is regenerated from public sources only (R06)", async () => {
    const cookie = await login();
    const secret = await privateItem(cookie, `regen secret ${MARK}`);
    const open = await createAndPublish(cookie, "an open source");
    const draft = await createDraft(env.DB, `[TK]summarize ![[${secret}]][/TK]`);
    expect(await runGenerateScope({ ...env, AI_PROVIDER_KEY: "k" }, draft, 0, fixture("first pass").fetchImpl, undefined, { privateSources: true })).toMatchObject({ ok: true });
    // The author swaps the source; the old output is still fed back as the scope's current text.
    const tainted = (await getItem(env.DB, draft.id))!;
    const swapped = (await apiJson(cookie, "PATCH", `/blyg/api/items/${draft.id}`, { contentMd: tainted.content_md.replace(secret, open) }));
    expect(swapped.status).toBe(200);
    expect(await runGenerateScope({ ...env, AI_PROVIDER_KEY: "k" }, (await getItem(env.DB, draft.id))!, 0, fixture("second pass").fetchImpl, undefined, { privateSources: true })).toMatchObject({ ok: true });
    expect((await apiJson(cookie, "POST", `/blyg/api/items/${draft.id}/publish`, { visibility: "public" })).status).toBe(400);
  });

  // R13: the preview resolves sources as generation does; a restricted caller's diagnostics
  // name a private source exactly as an unknown one; the provider reads what the reader shows.
  it("previews a private source for a caller that may see it, and as unknown for one that may not (R13)", async () => {
    const cookie = await login();
    const source = await privateItem(cookie, `preview source ${MARK}`);
    const unknown = "zzzzzzzzzzzzzzzzzzzzzzzzzz";
    const preview = (api: ReturnType<typeof tokenApi>, id: string) => api("POST", "/preview", { contentMd: `[TK]summarize ![[${id}]][/TK]` });
    const mine = (await apiJson(cookie, "POST", "/blyg/api/preview", { contentMd: `[TK]summarize ![[${source}]][/TK]` })).json;
    expect(mine.scopes[0].sources[0]).toMatchObject({ id: source, ok: true, from: "you" });
    expect((await preview(tokenApi(WITH), source)).json.scopes[0].sources[0]).toMatchObject({ ok: true });
    const hidden = (await preview(tokenApi(WITHOUT), source)).json, absent = (await preview(tokenApi(WITHOUT), unknown)).json;
    expect(JSON.stringify(hidden).replaceAll(source, unknown)).toBe(JSON.stringify(absent));
    // Content that happens to say so is content, and stays as written.
    const said = (await apiJson(cookie, "POST", "/blyg/api/items", { contentMd: "Status: item is private", kind: "fragment" })).json.id as string;
    expect((await tokenApi(WITHOUT)("GET", `/items/${said}`)).json.contentMd).toBe("Status: item is private");
  });

  it("feeds a private source as its reader shows it, without comments to self (R13)", async () => {
    const cookie = await login();
    const source = await privateItem(cookie, `kept words /* note to self ${MARK} */ more kept words`);
    const draft = await createDraft(env.DB, `[TK]summarize ![[${source}]][/TK]`);
    const { fetchImpl, calls } = fixture("ok");
    expect(await runGenerateScope({ ...env, AI_PROVIDER_KEY: "k" }, draft, 0, fetchImpl, undefined, { privateSources: true })).toMatchObject({ ok: true });
    const sent = JSON.stringify(calls[0]);
    expect(sent).toContain("more kept words");
    expect(sent).not.toContain("note to self");
  });

  it("still publishes publicly when the sources are public", async () => {
    const cookie = await login();
    const source = await createAndPublish(cookie, "a public source");
    const draft = await createDraft(env.DB, `[TK]summarize ![[${source}]][/TK]`);
    expect(await runGenerateScope({ ...env, AI_PROVIDER_KEY: "k" }, draft, 0, fixture("fine").fetchImpl, undefined, { privateSources: true })).toMatchObject({ ok: true });
    expect((await apiJson(cookie, "POST", `/blyg/api/items/${draft.id}/publish`, { visibility: "public" })).status).toBe(200);
  });
});
