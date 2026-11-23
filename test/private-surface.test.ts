// The gate for private items (sealed-content-build-plan §1, 0a): an item the public surface
// does not serve stays off every public route, whatever its versions, pins, hoppers, media or
// front-page setting. The route table is read from the app, so a public route added later
// fails here until it is listed with a probe.
import { SELF, env } from "cloudflare:test";
import { afterEach, describe, expect, it } from "vitest";
import { makeApp } from "../src/index.ts";
import { resolveTarget } from "../src/transclusion.ts";
import { normalizeMount } from "../src/util.ts";
import { BASE, apiJson, getPublic, login } from "./helpers.ts";

const MARK = "privatesurfacemark";
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4, 5]);

/** Every public GET route, and what this test checks on it. */
const COVERED: Record<string, "item" | "listing" | "media" | "itemless"> = {
  "GET /blyg": "listing",
  "GET /blyg/style.css": "itemless",
  "GET /blyg/feed.xml": "listing",
  "GET /blyg/blyg.json": "itemless",
  "GET /blyg/items/index.json": "listing",
  "GET /blyg/blogroll.opml": "itemless",
  "GET /blyg/h/:slug": "listing",
  "GET /blyg/h/:slug/feed.xml": "listing",
  "GET /blyg/items/:file": "item",
  "GET /blyg/items/:id/:vfile": "item",
  "GET /blyg/f/:id": "item",
  "GET /blyg/f/:id/:vseg": "item",
  "GET /blyg/t/:id": "item",
  "GET /blyg/t/:id/:vseg": "item",
  "GET /blyg/archive": "listing",
  "GET /blyg/:posts": "listing",
  "GET /blyg/media/:file": "media",
  "GET /blyg/media/:id/:file": "media",
};

async function publish(cookie: string, contentMd: string, kind: "fragment" | "thread", media = false) {
  const created = await apiJson(cookie, "POST", "/blyg/api/items", { contentMd, kind });
  expect(created.status).toBe(201);
  const id = created.json.id as string;
  let url: string | undefined;
  if (media) {
    const form = new FormData();
    form.set("file", new File([PNG], "dot.png", { type: "image/png" }));
    form.set("itemId", id);
    form.set("expectedRevision", String(created.json.revision));
    const uploaded = await SELF.fetch(`${BASE}/blyg/api/media`, { method: "POST", headers: { cookie }, body: form });
    expect(uploaded.status).toBe(201);
    url = (await uploaded.json<{ url: string }>()).url;
  }
  expect((await apiJson(cookie, "POST", `/blyg/api/items/${id}/publish`, {})).status).toBe(200);
  expect((await apiJson(cookie, "PUT", `/blyg/api/items/${id}/versions/1/pin`, {})).status).toBe(200);
  return { id, url };
}

const text = async (path: string) => {
  const res = await getPublic(path);
  return { status: res.status, body: await res.text() };
};

afterEach(async () => {
  await apiJson(await login(), "PATCH", "/blyg/api/settings", { frontPage: "", hopperFeeds: false });
});

describe("an item the public surface does not serve", () => {
  it("is on no public route: pages, documents, pins, listings, hoppers, front page, media, quotes", async () => {
    const cookie = await login();
    const fragment = await publish(cookie, `Fragment words ${MARK}.`, "fragment", true);
    const thread = await publish(cookie, `Thread words ${MARK}.`, "thread");
    const hopper = (await apiJson(cookie, "POST", "/blyg/api/hoppers", { name: "Private surface" })).json as { id: string };
    await apiJson(cookie, "PATCH", `/blyg/api/hoppers/${hopper.id}`, { public: true });
    const slug = (await apiJson(cookie, "GET", `/blyg/api/hoppers/${hopper.id}`)).json.hopper.slug as string;
    for (const { id } of [fragment, thread]) expect((await apiJson(cookie, "PUT", `/blyg/api/hoppers/${hopper.id}/items/~own/${id}`)).status).toBe(200);
    expect((await apiJson(cookie, "PATCH", "/blyg/api/settings", { frontPage: thread.id, postsPath: "posts", hopperFeeds: true })).status).toBe(200);

    const items = [
      `/blyg/items/${fragment.id}.json`, `/blyg/items/${fragment.id}/v1.json`, `/blyg/f/${fragment.id}/`, `/blyg/f/${fragment.id}/v1/`,
      `/blyg/items/${thread.id}.json`, `/blyg/items/${thread.id}/v1.json`, `/blyg/t/${thread.id}/`, `/blyg/t/${thread.id}/v1/`,
    ];
    const listings = ["/blyg/", "/blyg/feed.xml", "/blyg/items/index.json", `/blyg/h/${slug}`, `/blyg/h/${slug}/feed.xml`, "/blyg/archive", "/blyg/posts"];
    const itemless = ["/blyg/style.css", "/blyg/blyg.json", "/blyg/blogroll.opml"];
    const media = new URL(fragment.url!).pathname;

    // While public, every probe sees the items: the probes are aimed at the right things.
    for (const path of items) expect((await text(path)).status, path).toBe(200);
    for (const path of listings) {
      const { body } = await text(path);
      expect([MARK, fragment.id, thread.id].some((needle) => body.includes(needle)), path).toBe(true);
    }
    expect((await SELF.fetch(`${BASE}${media}`)).status).toBe(200);

    await env.DB.prepare("UPDATE items SET status = 'private' WHERE id IN (?, ?)").bind(fragment.id, thread.id).run();

    for (const path of items) expect((await text(path)).status, path).toBe(404);
    for (const path of [...listings, ...itemless]) {
      const { body } = await text(path);
      expect(body, path).not.toContain(MARK);
      for (const { id } of [fragment, thread]) expect(body, path).not.toContain(id);
    }
    expect((await SELF.fetch(`${BASE}${media}`)).status, "media to a stranger").toBe(404);
    const quoted = await resolveTarget(env.DB, fragment.id);
    expect(quoted.ok ? "resolved" : quoted.reason).toBe("item is private");
    const mention = await SELF.fetch(`${BASE}/blyg/webmention`, {
      method: "POST",
      body: new URLSearchParams({ source: "https://elsewhere.example/blyg/t/x/", target: `${BASE}/blyg/t/${thread.id}/` }),
    });
    expect(mention.status, "a mention naming it").toBe(400);
  });

  it("covers every public GET route the app serves", () => {
    const app = makeApp(normalizeMount(env.MOUNT));
    const routes = new Set(app.routes.filter((r) => r.method === "GET" && /^\/blyg(\/|$)/.test(r.path) && !/^\/blyg\/(api|studio|oauth|mcp)(\/|$)/.test(r.path)).map((r) => `GET ${r.path}`));
    expect([...routes].sort()).toEqual(Object.keys(COVERED).sort());
  });
});
