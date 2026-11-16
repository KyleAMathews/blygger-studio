// Background and Foreground in the reader, phase 1 (blygger-spec
// docs/background-plan.md §7.1): the owner's placement on an entry and on a
// blyg, the precedence between them and the rules, own items' `minor` from the
// change classifier (4a), and the rule toggle in Settings.
//
// What matters: Background is a lens, so an entry leaves every other lens and
// nothing is marked read; the item's choice beats the blyg's, which beats the
// rules; counts agree with the lists; and the polling cache sees each change.
import { env } from "cloudflare:test";
import { afterEach, describe, expect, it } from "vitest";
import { putSettings } from "../src/model.ts";
import { apiJson, createAndPublish, login } from "./helpers.ts";

const db = () => env.DB;
afterEach(() => putSettings(db(), { bg_rules: "{}" }));

async function seedSub(id: string) {
  await db().prepare("INSERT INTO subscriptions (id, kind, origin, feed_url, title, created) VALUES (?, 'blyg', ?, ?, ?, '2026-01-01T00:00:00.000Z')")
    .bind(id, `https://${id}.example/`, `https://${id}.example/feed.xml`, id).run();
}
async function seedItem(sub: string, remote: string) {
  await db().prepare(`INSERT INTO imported_items (subscription_id, remote_id, kind, state, version, observed_at, content_md, content_html)
    VALUES (?, ?, 'fragment', 'current', 1, '2026-03-01T00:00:00.000Z', 'md', '<p>html</p>')`).bind(sub, remote).run();
}
async function reading(cookie: string, query: string) {
  const res = await apiJson(cookie, "GET", `/blyg/api/reading?limit=50&${query}`);
  expect(res.status).toBe(200);
  return res.json.items as { key: string; background: { reasons: string[]; placement: string | null; blyg: boolean; detail?: Record<string, unknown> } }[];
}
const keys = (rows: { key: string }[]) => rows.map((row) => row.key);
const place = (cookie: string, body: Record<string, unknown>) => apiJson(cookie, "PUT", "/blyg/api/reading/placement", body);
async function changes(cookie: string) {
  return (await apiJson(cookie, "GET", "/blyg/api/changes")).json.domains as Record<string, number>;
}

describe("the owner's placement", () => {
  it("moves an imported entry to Background, survives a new version, and clears", async () => {
    const cookie = await login();
    await seedSub("bg-a"); await seedItem("bg-a", "r1"); await seedItem("bg-a", "r2");
    const key = `imported:${JSON.stringify(["bg-a", "r1"])}`;
    const before = await changes(cookie);
    expect((await place(cookie, { source: "imported", sub: "bg-a", id: "r1", placement: "background" })).status).toBe(200);
    expect((await changes(cookie)).reading).toBeGreaterThan(before.reading);
    expect(keys(await reading(cookie, "sub=bg-a"))).not.toContain(key);
    const moved = (await reading(cookie, "sub=bg-a&background=true")).find((row) => row.key === key)!;
    expect(moved.background).toMatchObject({ placement: "background", reasons: [], blyg: false });
    // A new version keeps the choice.
    await db().prepare("UPDATE imported_items SET version = 2, content_md = 'md2' WHERE subscription_id = 'bg-a' AND remote_id = 'r1'").run();
    expect(keys(await reading(cookie, "sub=bg-a&background=true"))).toContain(key);
    // Nothing was marked read.
    expect(await db().prepare("SELECT 1 FROM read_state WHERE subscription_id = 'bg-a'").first()).toBeNull();
    expect((await place(cookie, { source: "imported", sub: "bg-a", id: "r1", placement: null })).status).toBe(200);
    expect(keys(await reading(cookie, "sub=bg-a"))).toContain(key);
  });

  it("a blyg in Background takes its entries, and one pinned to Foreground stays", async () => {
    const cookie = await login();
    await seedSub("bg-b"); await seedItem("bg-b", "r1"); await seedItem("bg-b", "r2");
    const res = await apiJson(cookie, "PATCH", "/blyg/api/subscriptions/bg-b", { background: true });
    expect(res.status).toBe(200);
    expect(res.json.background).toBe(true);
    expect((await place(cookie, { source: "imported", sub: "bg-b", id: "r2", placement: "foreground" })).status).toBe(200);
    expect(keys(await reading(cookie, "sub=bg-b"))).toEqual([`imported:${JSON.stringify(["bg-b", "r2"])}`]);
    const background = await reading(cookie, "sub=bg-b&background=true");
    expect(keys(background)).toEqual([`imported:${JSON.stringify(["bg-b", "r1"])}`]);
    expect(background[0].background.blyg).toBe(true);
    // Counts agree with the lists.
    const summary = (await apiJson(cookie, "GET", "/blyg/api/reading/summary?sub=bg-b")).json;
    expect(summary.counts.subscriptions["bg-b"]).toBe(1);
    const bgSummary = (await apiJson(cookie, "GET", "/blyg/api/reading/summary?sub=bg-b&background=true")).json;
    expect(bgSummary.counts.subscriptions["bg-b"]).toBe(1);
  });

  it("a withdrawn own item pinned to Foreground leaves Background", async () => {
    const cookie = await login();
    const id = await createAndPublish(cookie, "Withdrawn but wanted.");
    expect((await apiJson(cookie, "POST", `/blyg/api/items/${id}/withdraw`, {})).status).toBe(200);
    expect(keys(await reading(cookie, "sub=own&background=true"))).toContain(`own:${id}`);
    expect((await place(cookie, { source: "own", id, placement: "foreground" })).status).toBe(200);
    const main = (await reading(cookie, "sub=own")).find((row) => row.key === `own:${id}`)!;
    expect(main.background).toMatchObject({ placement: "foreground", reasons: ["withdrawn"] });
  });

  it("refuses an entry the reader cannot show", async () => {
    const cookie = await login();
    expect((await place(cookie, { source: "own", id: "no-such-item", placement: "background" })).status).toBe(404);
    expect((await place(cookie, { source: "imported", id: "r1", placement: "background" })).status).toBe(404);
    const draft = (await apiJson(cookie, "POST", "/blyg/api/items", { contentMd: "A draft." })).json.id;
    expect((await place(cookie, { source: "own", id: draft, placement: "background" })).status).toBe(404);
  });

  it("unsubscribing leaves no placement behind", async () => {
    const cookie = await login();
    await seedSub("bg-c"); await seedItem("bg-c", "r1");
    await place(cookie, { source: "imported", sub: "bg-c", id: "r1", placement: "background" });
    expect((await apiJson(cookie, "DELETE", "/blyg/api/subscriptions/bg-c")).status).toBe(200);
    expect(await db().prepare("SELECT 1 FROM reading_placement WHERE sub = 'bg-c'").first()).toBeNull();
  });
});

describe("own items' minor change (4a)", () => {
  it("a typo fix goes to Background, a major change comes back, and the rule toggles", async () => {
    const cookie = await login();
    const id = await createAndPublish(cookie, "Coordination through traces.");
    const key = `own:${id}`;
    await apiJson(cookie, "PATCH", `/blyg/api/items/${id}`, { contentMd: "Coordination through trace." });
    expect((await apiJson(cookie, "POST", `/blyg/api/items/${id}/publish`, { note: "Typo.", changeCategory: "typo" })).status).toBe(200);
    const row = (await reading(cookie, "sub=own&background=true")).find((r) => r.key === key)!;
    expect(row.background).toMatchObject({ reasons: ["minor"], placement: null, detail: { category: "typo" } });
    expect(keys(await reading(cookie, "sub=own"))).not.toContain(key);

    expect((await apiJson(cookie, "PATCH", "/blyg/api/settings", { backgroundRules: { minor: false } })).status).toBe(200);
    expect(keys(await reading(cookie, "sub=own"))).toContain(key);
    expect((await apiJson(cookie, "GET", "/blyg/api/settings")).json.backgroundRules).toEqual({ burst: true, wordless: true, maintenance: true, minor: false });
    await apiJson(cookie, "PATCH", "/blyg/api/settings", { backgroundRules: { minor: true } });
    expect(keys(await reading(cookie, "sub=own&background=true"))).toContain(key);

    await apiJson(cookie, "PATCH", `/blyg/api/items/${id}`, { contentMd: "Coordination through traces left in a shared medium, rewritten." });
    expect((await apiJson(cookie, "POST", `/blyg/api/items/${id}/publish`, { note: "Rewrote it.", changeCategory: "major" })).status).toBe(200);
    expect(keys(await reading(cookie, "sub=own"))).toContain(key);
  });

  it("a publish with no category leaves the item in the main lenses", async () => {
    const cookie = await login();
    const id = await createAndPublish(cookie, "No classifier here.");
    expect((await reading(cookie, "sub=own")).find((r) => r.key === `own:${id}`)?.background.reasons).toEqual([]);
  });
});

describe("settings", () => {
  it("refuses an unknown rule or a non-boolean", async () => {
    const cookie = await login();
    expect((await apiJson(cookie, "PATCH", "/blyg/api/settings", { backgroundRules: { nope: false } })).status).toBe(400);
    expect((await apiJson(cookie, "PATCH", "/blyg/api/settings", { backgroundRules: { minor: "off" } })).status).toBe(400);
  });
});
