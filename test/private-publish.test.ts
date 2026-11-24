// Publishing privately (sealed-content-build-plan §1 0b): the private counter,
// the refusal to lower a public item, and discarding a private item. What the
// public surface shows is the private-items oracle's.
import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { apiJson, login } from "./helpers.ts";

const rows = async (id: string) =>
  (await env.DB.prepare("SELECT version, content_md, note FROM private_versions WHERE item_id = ? ORDER BY version").bind(id).all()).results;

describe("publishing privately", () => {
  it("counts private versions apart from the public counter, which starts at 1", async () => {
    const cookie = await login();
    const id = (await apiJson(cookie, "POST", "/blyg/api/items", { contentMd: "first words" })).json.id as string;
    const first = await apiJson(cookie, "POST", `/blyg/api/items/${id}/publish`, { visibility: "private", note: "one" });
    expect(first.status).toBe(200);
    expect(first.json).toMatchObject({ version: 0, privateVersion: 1 });
    await apiJson(cookie, "PATCH", `/blyg/api/items/${id}`, { contentMd: "second words" });
    expect((await apiJson(cookie, "GET", `/blyg/api/items/${id}`)).json).toMatchObject({ status: "private", version: 0, dirty: true });
    expect((await apiJson(cookie, "POST", `/blyg/api/items/${id}/publish`, { visibility: "private", note: "two" })).json.privateVersion).toBe(2);
    expect((await apiJson(cookie, "GET", `/blyg/api/items/${id}`)).json).toMatchObject({ status: "private", version: 0, dirty: false });
    expect(await rows(id)).toEqual([
      { version: 1, content_md: "first words", note: "one" },
      { version: 2, content_md: "second words", note: "two" },
    ]);
    const raised = await apiJson(cookie, "POST", `/blyg/api/items/${id}/publish`, { note: "public" });
    expect(raised.json).toMatchObject({ version: 1 });
    expect(raised.json.privateVersion).toBeUndefined();
  });

  it("refuses to make a published item private", async () => {
    const cookie = await login();
    const id = (await apiJson(cookie, "POST", "/blyg/api/items", { contentMd: "public words" })).json.id as string;
    await apiJson(cookie, "POST", `/blyg/api/items/${id}/publish`, {});
    const lowered = await apiJson(cookie, "POST", `/blyg/api/items/${id}/publish`, { visibility: "private" });
    expect(lowered.status).toBe(409);
    expect((await apiJson(cookie, "GET", `/blyg/api/items/${id}`)).json).toMatchObject({ status: "public", version: 1 });
    expect(await rows(id)).toEqual([]);
  });

  it("discards a private item with its private versions", async () => {
    const cookie = await login();
    const id = (await apiJson(cookie, "POST", "/blyg/api/items", { contentMd: "kept words" })).json.id as string;
    await apiJson(cookie, "POST", `/blyg/api/items/${id}/publish`, { visibility: "private" });
    expect((await apiJson(cookie, "DELETE", `/blyg/api/items/${id}`)).status).toBe(200);
    expect((await apiJson(cookie, "GET", `/blyg/api/items/${id}`)).status).toBe(404);
    expect(await rows(id)).toEqual([]);
  });

  it("the private reading source lists only private items, and counts them", async () => {
    const cookie = await login();
    const make = async (text: string) => (await apiJson(cookie, "POST", "/blyg/api/items", { contentMd: text })).json.id as string;
    const kept = await make("Kept for the private source"), shown = await make("Shown on the public surface"), draft = await make("A plain draft");
    expect((await apiJson(cookie, "POST", `/blyg/api/items/${kept}/publish`, { visibility: "private" })).status).toBe(200);
    expect((await apiJson(cookie, "POST", `/blyg/api/items/${shown}/publish`, {})).status).toBe(200);
    const ids = (await apiJson(cookie, "GET", "/blyg/api/reading?sub=private&limit=50")).json.items.map((entry: { own?: { id: string } }) => entry.own?.id);
    expect(ids).toContain(kept);
    expect(ids).not.toContain(shown);
    expect(ids).not.toContain(draft);
    const summary = (await apiJson(cookie, "GET", "/blyg/api/reading/summary?sub=private")).json;
    expect(summary.selected).toBe("private");
    expect(summary.counts.private).toBeGreaterThanOrEqual(1);
    expect(summary.counts.private).toBeLessThanOrEqual(summary.counts.own);
  });
});

