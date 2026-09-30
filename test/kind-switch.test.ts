// Switching a draft between fragment and thread (session 28).
//
// The composer's toggle has always worked by deleting the draft and recreating
// it, which is safe only because the text lives in the textarea it was typed
// into. Past the Full Editor door that stops being true — the draft has
// attachments, TK scopes and a save history — so the editor changes the row in
// place instead. Before this, choosing the wrong kind and clicking through
// meant retyping.
//
// The boundary under test is `version === 0`. A draft has no wire presence, so
// its kind is studio state; a published item's kind is a field readers already
// have and history records, and must never move.
import { SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { apiJson, BASE, createAndPublish, login, STUDIO } from "./helpers.ts";

const ORIGIN = "https://friend.example/blyg/";

async function draft(cookie: string, kind: "fragment" | "thread", contentMd = "a draft"): Promise<string> {
  const res = await apiJson(cookie, "POST", "/api/items", { content_md: contentMd, kind });
  expect(res.status).toBe(201);
  return res.json.id as string;
}

async function editor(cookie: string, id: string): Promise<string> {
  const res = await SELF.fetch(`${BASE}${STUDIO}/edit/${id}`, { headers: { cookie } });
  expect(res.status).toBe(200);
  return res.text();
}

describe("a never-published draft can change kind", () => {
  it("fragment to thread, keeping the text and landing in the thread editor", async () => {
    const cookie = await login();
    const id = await draft(cookie, "fragment", "words I want to keep");
    expect(await editor(cookie, id)).not.toContain("editing thread");

    const res = await apiJson(cookie, "PATCH", `/api/items/${id}`, { kind: "thread" });
    expect(res.status).toBe(200);
    expect(res.json.kind).toBe("thread");

    const html = await editor(cookie, id);
    expect(html).toContain("editing thread");
    // The whole point: the draft is the same row, so the text survives.
    expect(html).toContain("words I want to keep");
  });

  it("thread to fragment, the same way", async () => {
    const cookie = await login();
    const id = await draft(cookie, "thread", "words I want to keep");
    expect(await apiJson(cookie, "PATCH", `/api/items/${id}`, { kind: "fragment" })).toMatchObject({ status: 200 });
    const html = await editor(cookie, id);
    expect(html).not.toContain("editing thread");
    expect(html).toContain("words I want to keep");
  });

  it("accepts kind and content_md in one call", async () => {
    const cookie = await login();
    const id = await draft(cookie, "fragment", "before");
    const res = await apiJson(cookie, "PATCH", `/api/items/${id}`, { kind: "thread", content_md: "after" });
    expect(res.status).toBe(200);
    const html = await editor(cookie, id);
    expect(html).toContain("editing thread");
    expect(html).toContain("after");
  });

  it("offers the switch in both editors, on a draft", async () => {
    const cookie = await login();
    const frag = await draft(cookie, "fragment");
    const thread = await draft(cookie, "thread");
    expect(await editor(cookie, frag)).toContain(`data-action="switch-kind" data-id="${frag}" data-kind="thread"`);
    expect(await editor(cookie, thread)).toContain(`data-action="switch-kind" data-id="${thread}" data-kind="fragment"`);
  });
});

describe("a published item's kind is fixed", () => {
  it("refuses the change with 409 rather than rewriting the archive", async () => {
    const cookie = await login();
    const id = await createAndPublish(cookie, "published, so its kind is public");
    const res = await apiJson(cookie, "PATCH", `/api/items/${id}`, { kind: "thread" });
    expect(res.status).toBe(409);
    expect(res.json.error).toMatch(/published/);
  });

  it("stays fixed after withdrawal — the endcap and the versions are both out there", async () => {
    const cookie = await login();
    const id = await createAndPublish(cookie, "about to go");
    await apiJson(cookie, "POST", `/api/items/${id}/withdraw`, {});
    expect((await apiJson(cookie, "PATCH", `/api/items/${id}`, { kind: "thread" })).status).toBe(409);
  });

  it("offers no switch control once published", async () => {
    const cookie = await login();
    const id = await createAndPublish(cookie, "published");
    expect(await editor(cookie, id)).not.toContain('data-action="switch-kind"');
  });

  it("a rejected switch does not quietly save the content sent with it", async () => {
    const cookie = await login();
    const id = await createAndPublish(cookie, "the published text");
    await apiJson(cookie, "PATCH", `/api/items/${id}`, { kind: "thread", content_md: "sneaked in" });
    expect(await editor(cookie, id)).not.toContain("sneaked in");
  });
});

describe("a stub thread will not silently become a fragment", () => {
  it("refuses, and names clearing the stub as the way through", async () => {
    const cookie = await login();
    const created = await apiJson(cookie, "POST", "/api/items", {
      content_md: "responding",
      kind: "thread",
      stub_of: { origin: ORIGIN, id: "7c9wk2n4h6q1x8v0z3m5rjy2ke", version: 1 },
    });
    expect(created.status).toBe(201);
    const id = created.json.id as string;

    const res = await apiJson(cookie, "PATCH", `/api/items/${id}`, { kind: "fragment" });
    // A stub is a claim the author made about what they are responding to.
    // Dropping it as a side effect of a kind switch would discard that claim.
    expect(res.status).toBe(409);
    expect(res.json.error).toMatch(/clear the stub/);

    // Clear it and the switch goes through.
    expect((await apiJson(cookie, "PATCH", `/api/items/${id}`, { stub_of: null })).status).toBe(200);
    expect((await apiJson(cookie, "PATCH", `/api/items/${id}`, { kind: "fragment" })).status).toBe(200);
  });

  it("a stub thread may still be switched nowhere and stay a thread", async () => {
    const cookie = await login();
    const created = await apiJson(cookie, "POST", "/api/items", {
      content_md: "responding",
      kind: "thread",
      stub_of: { origin: ORIGIN, id: "7c9wk2n4h6q1x8v0z3m5rjy2ke", version: 1 },
    });
    const id = created.json.id as string;
    expect((await apiJson(cookie, "PATCH", `/api/items/${id}`, { kind: "thread" })).status).toBe(200);
  });
});
