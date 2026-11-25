// The pace-layered order in the reader (ROADMAP row 69; src/feeds/reader-order.ts).
//
// What matters: the order is the home page's algorithm over everything read, so
// a new item from any blyg arrives on top and a new version climbs one place, a
// maintenance version none; an imported item's inputs are its stored changelog
// and the versions judged maintenance on arrival; pages are cut from stored
// positions with the ordinary cursor; hoppers keep their own order;
// pace-layered is the default (session 77) and a request may name its order;
// Raw is the imported entries as they came, with nothing moved or folded.
import { env } from "cloudflare:test";
import { afterEach, describe, expect, it } from "vitest";
import { createDraft, putSettings, saveWorkingCopy } from "../src/model.ts";
import { applyEffect, createSubscription } from "../src/importer/store.ts";
import { transition, type LocalState } from "../src/importer/transition.ts";
import { importedVersions, readerPositions, READER_ORDER_WINDOW } from "../src/feeds/reader-order.ts";
import { ensureReaderOrder } from '../src/feeds/reader-order-cache.ts';
import type { FeedHistoryItem } from "../src/feeds/types.ts";
import { newId } from "../src/util.ts";
import { itemDocBody } from "./importer/fixtures.ts";
import { apiJson, login } from "./helpers.ts";

const db = () => env.DB;
afterEach(async () => {
  await db().prepare("DELETE FROM settings WHERE key = 'reader_order'").run();
  await putSettings(db(), { bg_rules: "{}" });
});

const ORIGIN = "https://paced.example/blyg/";
const key = (sub: string, id: string) => `imported:${JSON.stringify([sub, id])}`;
const at = (minutesAgo: number) => new Date(Date.now() - minutesAgo * 60_000).toISOString();

async function subscription(origin = ORIGIN) {
  return (await createSubscription(db(), { kind: "blyg", origin, feedUrl: `${origin}feed.xml`, title: "Paced source" })).id;
}
type Log = { version: number; at: string; pinned?: boolean; note?: string };
async function arrive(sub: string, opts: { id: string; version?: number; md?: string; created: string; updated?: string; changelog?: Log[] }, origin = ORIGIN) {
  const version = opts.version ?? 1;
  const doc = JSON.parse(await itemDocBody({ id: opts.id, kind: "fragment", version, content_md: opts.md ?? `words of ${opts.id}`, created: opts.created, updated: opts.updated ?? opts.created, origin }));
  doc.changelog = opts.changelog ?? [{ version, at: opts.updated ?? opts.created }];
  const held = await db().prepare("SELECT version, state FROM imported_items WHERE subscription_id = ? AND remote_id = ?").bind(sub, opts.id).first<{ version: number; state: string }>();
  const local: LocalState = held ? { status: held.state === "tombstone" ? "tombstone" : "current", version: held.version } : { status: "absent" };
  await applyEffect(db(), sub, opts.id, transition({ local, doc }).effect, new Date().toISOString());
}
async function page(cookie: string, query: string) {
  const res = await apiJson(cookie, "GET", `/blyg/api/reading?${query}`);
  expect(res.status).toBe(200);
  return res.json as { items: { key: string }[]; page: { nextCursor: string | null } };
}

const row = (over: Partial<Parameters<typeof importedVersions>[0]>): Parameters<typeof importedVersions>[0] => ({
  subscription_id: "s", remote_id: "r", kind: "fragment", state: "current", version: 1, created: "2026-11-01T00:00:00Z", updated: "2026-11-01T00:00:00Z",
  observed_at: "2026-11-02T00:00:00Z", l0: 0, changelog_json: null, maintenance_json: null, transclusions_json: null, origin: ORIGIN, ...over,
});
const history = (id: string, versions: { at: string; pinned?: boolean; maintenance?: boolean }[], withdrawn = false): FeedHistoryItem => ({
  id, kind: "fragment", withdrawn, versions: versions.map((v, i) => ({ version: i + 1, at: v.at, note: null, pinned: !!v.pinned, quotes: [], ...(v.maintenance ? { maintenance: true } : {}) })),
});

describe("an imported item's inputs", () => {
  it("reads its stored changelog, clamped to when it was seen, with pins, notes and maintenance", () => {
    const versions = importedVersions(row({
      version: 3,
      changelog_json: JSON.stringify([{ version: 1, at: "2026-11-01T00:00:00Z", pinned: true }, { version: 2, at: "2026-11-01T01:00:00Z", note: "typo" }, { version: 3, at: "2099-01-01T00:00:00Z" }]),
      maintenance_json: JSON.stringify([2]),
      transclusions_json: JSON.stringify([{ id: "mine", version: 1 }, { id: "theirs", version: 1, origin: "https://elsewhere.example/" }]),
    }));
    expect(versions).toEqual([
      { version: 1, at: "2026-11-01T00:00:00.000Z", note: null, pinned: true, quotes: ["mine"] },
      { version: 2, at: "2026-11-01T01:00:00.000Z", note: "typo", pinned: false, quotes: [], maintenance: true },
      // Future-dated: placed when this reader first saw it.
      { version: 3, at: "2026-11-02T00:00:00.000Z", note: null, pinned: false, quotes: ["mine"] },
    ]);
  });

  it("stands in its first and latest versions when no changelog is stored yet", () => {
    expect(importedVersions(row({ version: 4, created: "2026-10-01T00:00:00Z", updated: "2026-11-01T00:00:00Z" })).map((v) => [v.version, v.at])).toEqual([
      [1, "2026-10-01T00:00:00.000Z"], [4, "2026-11-01T00:00:00.000Z"],
    ]);
  });
});

describe("positions", () => {
  it("puts new items on top, climbs a revised one a place, and not for maintenance", () => {
    const items = [
      history("a", [{ at: "2026-11-01T00:00:00Z" }, { at: "2026-11-01T03:00:00Z" }]),
      history("b", [{ at: "2026-11-01T01:00:00Z" }]),
      history("c", [{ at: "2026-11-01T02:00:00Z" }]),
      history("d", [{ at: "2026-11-01T00:30:00Z" }, { at: "2026-11-01T04:00:00Z", maintenance: true }]),
    ];
    // Arrivals: a, d, b, c (newest on top: c b d a); then a climbs past d; d's maintenance climbs nothing.
    expect(readerPositions(items)).toEqual(["c", "b", "a", "d"]);
  });

  it("ranks the newest entries by the replay, then the rest newest first, withdrawn last", () => {
    const base = Date.parse("2026-01-01T00:00:00Z");
    const items = Array.from({ length: READER_ORDER_WINDOW + 2 }, (_, i) => history(`i${i}`, [{ at: new Date(base + i * 60_000).toISOString() }]));
    items.push(history("gone", [{ at: new Date(base + 10 ** 9).toISOString() }], true));
    const order = readerPositions(items);
    expect(order).toHaveLength(items.length);
    expect(order[0]).toBe(`i${READER_ORDER_WINDOW + 1}`);
    expect(order.slice(-3)).toEqual(["i1", "i0", "gone"]);
  });
});

describe("the reading API", () => {
  it("is pace-layered by default and refuses an unknown order", async () => {
    const cookie = await login();
    expect((await apiJson(cookie, "GET", "/blyg/api/settings")).json.readerOrder).toBe("pace-layered");
    expect((await apiJson(cookie, "PATCH", "/blyg/api/settings", { readerOrder: "random" })).status).toBe(400);
  });

  it("stores each import's changelog and the versions judged maintenance", async () => {
    const sub = await subscription();
    const id = newId();
    const text = "A text long enough that a single changed letter is near-same rather than a rewrite of what it says, with room to spare for the measure.";
    await arrive(sub, { id, created: at(60), md: text });
    await arrive(sub, { id, version: 2, created: at(60), updated: at(30), md: text.replace("letter", "lettre"), changelog: [{ version: 1, at: at(60) }, { version: 2, at: at(30), note: "spelling" }] });
    const stored = await db().prepare("SELECT changelog_json, maintenance_json FROM imported_items WHERE subscription_id = ? AND remote_id = ?").bind(sub, id).first<{ changelog_json: string; maintenance_json: string }>();
    expect(JSON.parse(stored!.changelog_json)).toEqual([{ version: 1, at: expect.any(String), note: null, pinned: false }, { version: 2, at: expect.any(String), note: "spelling", pinned: false }]);
    expect(JSON.parse(stored!.maintenance_json)).toEqual([2]);
  });

  it("orders by the replay across blygs, pages from stored positions, and restarts when the collection moves", async () => {
    const cookie = await login();
    await putSettings(db(), { bg_rules: JSON.stringify({ superseded: false, "near-same": false }) });
    const [a, b] = [await subscription(), await subscription("https://other-paced.example/")];
    const [old, mid, fresh] = [newId(), newId(), newId()];
    await arrive(a, { id: old, created: at(300) });
    await arrive(b, { id: mid, created: at(200) }, "https://other-paced.example/");
    await arrive(a, { id: fresh, created: at(100) });
    await putSettings(db(), { reader_order: "newest" });
    const scope = `limit=50&sub=all`;
    const ours = (items: { key: string }[]) => items.map((e) => e.key).filter((k) => [key(a, old), key(b, mid), key(a, fresh)].includes(k));
    expect(ours((await page(cookie, scope)).items)).toEqual([key(a, fresh), key(b, mid), key(a, old)]);

    // A new version of the oldest: newest first puts it on top; pace-layered climbs it one place.
    await arrive(a, { id: old, version: 2, created: at(300), updated: at(10), md: "rewritten from the ground up with new words", changelog: [{ version: 1, at: at(300) }, { version: 2, at: at(10) }] });
    expect(ours((await page(cookie, scope)).items)[0]).toBe(key(a, old));
    expect((await apiJson(cookie, "PATCH", "/blyg/api/settings", { readerOrder: "pace-layered" })).status).toBe(200);
    expect(ours((await page(cookie, scope)).items)).toEqual([key(a, fresh), key(a, old), key(b, mid)]);

    // A request may name its order whatever the setting says.
    expect(ours((await page(cookie, `${scope}&order=newest`)).items)[0]).toBe(key(a, old));

    // Pages are cut from the stored positions; the cursor expires when the collection moves.
    const first = await page(cookie, "limit=1&sub=all");
    expect(first.page.nextCursor).toBeTruthy();
    const second = await page(cookie, `limit=1&sub=all&cursor=${first.page.nextCursor}`);
    expect(second.items[0]!.key).not.toBe(first.items[0]!.key);
    await arrive(b, { id: newId(), created: at(1) }, "https://other-paced.example/");
    expect((await apiJson(cookie, "GET", `/blyg/api/reading?limit=1&sub=all&cursor=${second.page.nextCursor}`)).status).toBe(409);
  });

  it("is rebuilt when an input changes, not on a poll, an autosave or a read mark (session 79)", async () => {
    const cookie = await login();
    const sub = await subscription("https://inputs.example/");
    const first = newId();
    await arrive(sub, { id: first, created: at(50) }, "https://inputs.example/");
    await ensureReaderOrder(db());
    const built = async () => (await db().prepare("SELECT generation FROM reading_order_state WHERE id = 1").first<{ generation: string }>())!.generation;
    const stamp = await built();
    // A sentinel row a rebuild would delete: it survives exactly when nothing was rebuilt.
    const sentinel = () => db().prepare("SELECT 1 AS ok FROM reading_order WHERE id = 'sentinel'").first();
    await db().prepare("INSERT INTO reading_order (source, sub, id, position) VALUES ('own', '', 'sentinel', 999999)").run();

    // A poll that found nothing, a draft autosave and a read mark.
    await db().prepare("UPDATE subscriptions SET last_poll_at = ?, etag = 'W/\"x\"', fail_count = 0 WHERE id = ?").bind(new Date().toISOString(), sub).run();
    const draft = await createDraft(db(), "typing");
    await saveWorkingCopy(db(), draft.id, "typing more");
    expect((await apiJson(cookie, "PUT", `/blyg/api/reading/${sub}/${first}/read`, { version: 1 })).status).toBeLessThan(300);
    await ensureReaderOrder(db());
    expect(await built()).toBe(stamp);
    expect(await sentinel()).toBeTruthy();

    // A new import is an input.
    await arrive(sub, { id: newId(), created: at(1) }, "https://inputs.example/");
    await ensureReaderOrder(db());
    expect(await built()).not.toBe(stamp);
    expect(await sentinel()).toBeNull();
  });

  // Venkat, session 85: private items stayed on top of the pace-layered reader and new items
  // arrived below them. The ranking read only public history, so a private item had no
  // position, and an unpositioned entry sorts first. It is ranked by its private versions now.
  it("ranks a private item by its private versions, so newer items arrive above it (0.72.1)", async () => {
    const cookie = await login();
    const created = await apiJson(cookie, "POST", "/blyg/api/items", { contentMd: `a private note ${newId()}`, kind: "fragment" });
    const kept = created.json.id as string;
    expect((await apiJson(cookie, "POST", `/blyg/api/items/${kept}/publish`, { visibility: "private" })).status).toBe(200);
    const sub = await subscription("https://after-private.example/");
    const later = newId();
    await arrive(sub, { id: later, created: new Date(Date.now() + 60_000).toISOString() }, "https://after-private.example/");
    const order = async () => (await page(cookie, "limit=50&sub=all&order=pace-layered")).items.map((e) => e.key).filter((k) => k === `own:${kept}` || k === key(sub, later));
    expect(await order()).toEqual([key(sub, later), `own:${kept}`]);

    // A new private version is an input: the order is rebuilt and the item climbs.
    const built = async () => (await db().prepare("SELECT generation FROM reading_order_state WHERE id = 1").first<{ generation: string }>())!.generation;
    const stamp = await built();
    expect((await apiJson(cookie, "PATCH", `/blyg/api/items/${kept}`, { contentMd: "a second private version, rewritten from the ground up" })).status).toBe(200);
    expect((await apiJson(cookie, "POST", `/blyg/api/items/${kept}/publish`, { visibility: "private" })).status).toBe(200);
    await ensureReaderOrder(db());
    expect(await built()).not.toBe(stamp);
    expect(await db().prepare("SELECT 1 AS ok FROM reading_order WHERE source = 'own' AND id = ?").bind(kept).first()).toBeTruthy();
  });

  it("leaves out imports whose subscription is gone: no empty pages, no count (session 79)", async () => {
    const cookie = await login();
    const sub = await subscription("https://held.example/");
    const kept = newId();
    await arrive(sub, { id: kept, created: at(30) }, "https://held.example/");
    // Rows an old unsubscribe left behind: no subscription, so no position and no projection.
    const orphans = Array.from({ length: 3 }, () => newId());
    for (const id of orphans) await db().prepare("INSERT INTO imported_items (subscription_id, remote_id, kind, state, version, observed_at, content_md, content_html, l0) VALUES ('gone-sub', ?, 'fragment', 'current', 1, ?, 'x', '<p>x</p>', 0)").bind(id, at(1)).run();
    for (const order of ["pace-layered", "newest"]) {
      const first = await page(cookie, `limit=1&sub=all&order=${order}`);
      expect(first.items).toHaveLength(1);
      expect(first.items[0]!.key).not.toContain("gone-sub");
    }
    const summary = (await apiJson(cookie, "GET", "/blyg/api/reading/summary?sub=all")).json as { counts: { subscriptions: Record<string, number> } };
    expect(summary.counts.subscriptions["gone-sub"]).toBeUndefined();
    const raw = await page(cookie, "limit=50&sub=all&raw=true");
    expect(raw.items.some((e) => e.key.includes("gone-sub"))).toBe(false);
    await db().prepare("DELETE FROM imported_items WHERE subscription_id = 'gone-sub'").run();
  });

  it("a read mark between two pages leaves the cursor valid (session 79)", async () => {
    const cookie = await login();
    await putSettings(db(), { bg_rules: JSON.stringify({ superseded: false, "near-same": false }) });
    const sub = await subscription("https://marks.example/");
    const [a, b] = [newId(), newId()];
    await arrive(sub, { id: a, created: at(20) }, "https://marks.example/");
    await arrive(sub, { id: b, created: at(10) }, "https://marks.example/");
    for (const order of ["newest", "pace-layered"]) {
      const first = await page(cookie, `limit=1&sub=${sub}&order=${order}`);
      expect(first.page.nextCursor).toBeTruthy();
      // Scanning marks what was seen while the next page is still to come.
      expect((await apiJson(cookie, "PUT", `/blyg/api/reading/${sub}/${order === "newest" ? b : a}/read`, { version: 1 })).status).toBeLessThan(300);
      const res = await apiJson(cookie, "GET", `/blyg/api/reading?limit=1&sub=${sub}&order=${order}&cursor=${first.page.nextCursor}`);
      expect(res.status).toBe(200);
      await apiJson(cookie, "DELETE", `/blyg/api/reading/${sub}/${order === "newest" ? b : a}/read`);
    }
  });

  it("Raw lists what came in, newest first, with nothing moved to Background or folded", async () => {
    const cookie = await login();
    const sub = await subscription("https://raw.example/");
    const [first, second, gone] = [newId(), newId(), newId()];
    await arrive(sub, { id: first, created: at(20) }, "https://raw.example/");
    await arrive(sub, { id: second, created: at(10) }, "https://raw.example/");
    await arrive(sub, { id: gone, created: at(5) }, "https://raw.example/");
    // `superseded` sends the first to Background; moving one there by hand and withdrawing one change nothing in Raw.
    expect((await apiJson(cookie, "PUT", `/blyg/api/reading/placement`, { source: "imported", sub, id: second, placement: "background" })).status).toBe(200);
    const doc = JSON.parse(await itemDocBody({ id: gone, kind: "withdrawn", version: 2, created: at(5), updated: at(1), origin: "https://raw.example/" }));
    await applyEffect(db(), sub, gone, transition({ local: { status: "current", version: 1 }, doc }).effect, new Date().toISOString());
    expect((await page(cookie, `limit=50&sub=${sub}`)).items).toEqual([]);
    expect((await page(cookie, `limit=50&sub=${sub}&raw=true`)).items.map((e) => e.key)).toEqual([key(sub, gone), key(sub, second), key(sub, first)]);
    // Own items are not incoming.
    expect((await page(cookie, "limit=50&sub=all&raw=true")).items.every((e) => e.key.startsWith("imported:"))).toBe(true);
  });
});
