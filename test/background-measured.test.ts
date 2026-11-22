// Background phase 2 (blygger-spec docs/background-plan.md §2, §7 step 2): the
// measured rules. A quote refresh, a small edit and an item its blyg followed
// within the superseded window go to Background with their own chips; a refresh
// that brought in a rewritten quote goes too unless the owner turns that off;
// each rule's toggle moves its items at once; a later version of an item clears
// what other items set on it.
import { env } from "cloudflare:test";
import { afterEach, describe, expect, it } from "vitest";
import { putSettings } from "../src/model.ts";
import { applyEffect, createSubscription } from "../src/importer/store.ts";
import { transition, type LocalState } from "../src/importer/transition.ts";
import { bakedQuoteTexts, enabledRules, parseBackgroundRules, supersedes, SUPERSEDED_WINDOW_MS, versionReasons } from "../src/background.ts";
import { newId } from "../src/util.ts";
import { itemDocBody } from "./importer/fixtures.ts";
import { apiJson, createAndPublish, login } from "./helpers.ts";

const db = () => env.DB;
afterEach(() => putSettings(db(), { bg_rules: "{}" }));

const ORIGIN = "https://measured.example/blyg/";
type Entry = { key: string; background: { reasons: string[]; detail?: Record<string, unknown> } };
async function reading(cookie: string, query: string): Promise<Entry[]> {
  const res = await apiJson(cookie, "GET", `/blyg/api/reading?limit=50&${query}`);
  expect(res.status).toBe(200);
  return res.json.items;
}
const key = (sub: string, id: string) => `imported:${JSON.stringify([sub, id])}`;
const keys = (entries: Entry[]) => entries.map((e) => e.key);
const at = (minutesAgo: number) => new Date(Date.now() - minutesAgo * 60_000).toISOString();

async function subscription() {
  return (await createSubscription(db(), { kind: "blyg", origin: ORIGIN, feedUrl: `${ORIGIN}feed.xml`, title: "Measured source" })).id;
}
/** One version of an item, through the importer as a poll would apply it. */
async function arrive(sub: string, opts: { id: string; kind?: "fragment" | "thread"; version?: number; md?: string; html?: string; created: string; updated?: string; quotes?: { id: string; version: number }[] }, observedAt = new Date().toISOString()) {
  const doc = JSON.parse(await itemDocBody({ id: opts.id, kind: opts.kind ?? "fragment", version: opts.version ?? 1, content_md: opts.md ?? `words of ${opts.id}`, content_html: opts.html, created: opts.created, updated: opts.updated ?? opts.created, origin: ORIGIN }));
  if (opts.quotes) doc.transclusions = opts.quotes;
  const held = await db().prepare("SELECT version, state FROM imported_items WHERE subscription_id = ? AND remote_id = ?").bind(sub, opts.id).first<{ version: number; state: string }>();
  const local: LocalState = held ? { status: held.state === "tombstone" ? "tombstone" : "current", version: held.version } : { status: "absent" };
  await applyEffect(db(), sub, opts.id, transition({ local, doc }).effect, observedAt);
}
const baked = (id: string, version: number, text: string) =>
  `<blockquote class="blyg-transclusion" data-blyg-id="${id}" data-blyg-version="${version}"><p>${text}</p></blockquote>`;
const SENTENCE = "Coordination through traces left in a shared medium, read by whoever passes next, is the whole of the idea here and the rest is commentary on it.";
/** Long enough (about 600 characters) that one word changed in it is a small edit, not a rewrite. */
const LONG = `${SENTENCE} ${SENTENCE.replace("Coordination", "Cooperation")} ${SENTENCE.replace("idea", "notion")} ${SENTENCE.replace("rest", "remainder")}`;

describe("the measures", () => {
  it("reads each top-level baked quote's text by id, nested quotes inside their parent", () => {
    const html = `<p>Mine.</p>${baked("a", 1, "first")}<blockquote class="blyg-transclusion blyg-partial" data-blyg-id="b"><p>outer</p>${baked("c", 1, "inner")}</blockquote><blockquote><p>my own quotation</p></blockquote>`;
    const texts = bakedQuoteTexts(html);
    expect([...texts.keys()]).toEqual(["a", "b"]);
    expect(texts.get("a")).toBe("first");
    expect(texts.get("b")).toBe("outer inner");
  });

  it("tells a refresh, a rewritten quote, a small edit and a real edit apart", () => {
    const q1 = JSON.stringify([{ id: "a", version: 1 }]);
    const q2 = JSON.stringify([{ id: "a", version: 2 }]);
    const held = { hash: "h", quotes: q1, contentMd: LONG, contentHtml: baked("a", 1, LONG) };
    expect(versionReasons({ hash: "h", quotes: q2, contentMd: LONG, contentHtml: baked("a", 2, LONG.replace("whole", "heart")) }, held)).toEqual(["quotes-refreshed"]);
    expect(versionReasons({ hash: "h", quotes: q2, contentMd: LONG, contentHtml: baked("a", 2, "Something else entirely now.") }, held)).toEqual(["quotes-material"]);
    // A quote swapped for another is not a refresh, whatever the hash says.
    expect(versionReasons({ hash: "h", quotes: JSON.stringify([{ id: "b", version: 1 }]), contentMd: LONG }, held)).toEqual([]);
    expect(versionReasons({ hash: "h2", quotes: q1, contentMd: LONG.replace("whole", "heart") }, held)).toEqual(["near-same"]);
    expect(versionReasons({ hash: "h2", quotes: q1, contentMd: `${LONG}\n\nAnd a new paragraph of my own.` }, held)).toEqual([]);
    // Short texts: one word is more than 2 %.
    expect(versionReasons({ hash: "h2", quotes: null, contentMd: "Yes, ship it." }, { hash: "h", quotes: null, contentMd: "No, ship it." })).toEqual([]);
  });

  it("supersedes within the window, newer only", () => {
    const t = Date.parse("2026-11-21T12:00:00Z");
    expect(supersedes(t, t - 10 * 60_000)).toBe(true);
    expect(supersedes(t, t - SUPERSEDED_WINDOW_MS)).toBe(true);
    expect(supersedes(t, t - SUPERSEDED_WINDOW_MS - 1)).toBe(false);
    expect(supersedes(t, t)).toBe(false);
    expect(supersedes(t - 60_000, t)).toBe(false);
  });

  it("counts rewritten-quote refreshes only while refreshes count", () => {
    expect(enabledRules(parseBackgroundRules(JSON.stringify({ "quotes-refreshed": false })))).not.toContain("quotes-material");
    expect(enabledRules(parseBackgroundRules("{}"))).toContain("quotes-material");
  });
});

describe("imported versions", () => {
  it("puts a quote refresh and a small edit in Background with their chips, and a real edit back", async () => {
    const cookie = await login();
    const sub = await subscription();
    const [thread, stub] = [newId(), newId()];
    const md = `${LONG}\n\n![[q]]\n`;
    await arrive(sub, { id: thread, kind: "thread", created: at(300), md, html: `<p>${LONG}</p>${baked("q", 1, LONG)}`, quotes: [{ id: "q", version: 1 }] });
    await arrive(sub, { id: stub, created: at(200), md: LONG });
    await putSettings(db(), { bg_rules: JSON.stringify({ superseded: false }) });

    await arrive(sub, { id: thread, kind: "thread", version: 2, created: at(300), updated: at(1), md, html: `<p>${LONG}</p>${baked("q", 2, LONG.replace("whole", "heart"))}`, quotes: [{ id: "q", version: 2 }] });
    await arrive(sub, { id: stub, version: 2, created: at(200), updated: at(1), md: LONG.replace("whole", "heart") });
    const background = await reading(cookie, `sub=${sub}&background=true`);
    expect(Object.fromEntries(background.map((e) => [e.key, e.background.reasons]))).toEqual({ [key(sub, thread)]: ["quotes-refreshed"], [key(sub, stub)]: ["near-same"] });

    // Each toggle moves its items at once.
    expect((await apiJson(cookie, "PATCH", "/blyg/api/settings", { backgroundRules: { "near-same": false } })).status).toBe(200);
    expect(keys(await reading(cookie, `sub=${sub}`))).toEqual([key(sub, stub)]);
    expect((await apiJson(cookie, "PATCH", "/blyg/api/settings", { backgroundRules: { "near-same": true, "quotes-refreshed": false } })).status).toBe(200);
    expect(keys(await reading(cookie, `sub=${sub}`))).toEqual([key(sub, thread)]);
    await putSettings(db(), { bg_rules: JSON.stringify({ superseded: false }) });

    // A stub that gains a paragraph comes back.
    await arrive(sub, { id: stub, version: 3, created: at(200), updated: at(0), md: `${LONG}\n\nA new paragraph with a thought of my own in it.` });
    expect(keys(await reading(cookie, `sub=${sub}`))).toEqual([key(sub, stub)]);
  });

  it("keeps a refresh that brought in a rewritten quote in Background unless the owner says otherwise", async () => {
    const cookie = await login();
    const sub = await subscription();
    const thread = newId();
    const md = `${LONG}\n\n![[q]]\n`;
    await arrive(sub, { id: thread, kind: "thread", created: at(300), md, html: `<p>${LONG}</p>${baked("q", 1, "the quoted post as it was")}`, quotes: [{ id: "q", version: 1 }] });
    await arrive(sub, { id: thread, kind: "thread", version: 2, created: at(300), updated: at(1), md, html: `<p>${LONG}</p>${baked("q", 2, "an entirely different argument now")}`, quotes: [{ id: "q", version: 2 }] });
    const [entry] = await reading(cookie, `sub=${sub}&background=true`);
    expect(entry!.background.reasons).toEqual(["quotes-material"]);
    expect((await apiJson(cookie, "PATCH", "/blyg/api/settings", { backgroundRules: { "quotes-material": false } })).status).toBe(200);
    expect(keys(await reading(cookie, `sub=${sub}`))).toEqual([key(sub, thread)]);
  });

  it("puts an item its blyg followed within 15 minutes in Background, in either arrival order, until it changes", async () => {
    const cookie = await login();
    const sub = await subscription();
    const [first, second, later, early, gap] = [newId(), newId(), newId(), newId(), newId()];
    await arrive(sub, { id: gap, created: at(60) });
    await arrive(sub, { id: first, created: at(30) });
    await arrive(sub, { id: second, created: at(20) });
    // Out of order: the newer arrives before the older.
    await arrive(sub, { id: later, created: at(5) });
    await arrive(sub, { id: early, created: at(12) });

    const background = await reading(cookie, `sub=${sub}&background=true`);
    expect(Object.fromEntries(background.map((e) => [e.key, e.background]))).toEqual({
      [key(sub, first)]: expect.objectContaining({ reasons: ["superseded"], detail: { by: second } }),
      [key(sub, second)]: expect.objectContaining({ reasons: ["superseded"], detail: { by: early } }),
      [key(sub, early)]: expect.objectContaining({ reasons: ["superseded"], detail: { by: later } }),
    });
    expect(keys(await reading(cookie, `sub=${sub}`)).sort()).toEqual([key(sub, gap), key(sub, later)].sort());

    // A later version of a superseded item is its own news again.
    await arrive(sub, { id: first, version: 2, created: at(30), updated: at(0), md: "first, rewritten at length with new words" });
    expect(keys(await reading(cookie, `sub=${sub}`))).toContain(key(sub, first));

    expect((await apiJson(cookie, "PATCH", "/blyg/api/settings", { backgroundRules: { superseded: false } })).status).toBe(200);
    expect(await reading(cookie, `sub=${sub}&background=true`)).toEqual([]);
  });

  it("places a future-dated item at the time it was first seen", async () => {
    const cookie = await login();
    const sub = await subscription();
    const [old, future] = [newId(), newId()];
    await arrive(sub, { id: old, created: at(40) });
    await arrive(sub, { id: future, created: new Date(Date.now() + 2 * 86_400_000).toISOString() });
    // Seen now: forty minutes after the other, so it supersedes nothing.
    expect(keys(await reading(cookie, `sub=${sub}`)).sort()).toEqual([key(sub, old), key(sub, future)].sort());
  });

  it("never supersedes across blygs", async () => {
    const cookie = await login();
    const [a, b] = [await subscription(), (await createSubscription(db(), { kind: "blyg", origin: "https://other.example/", feedUrl: "https://other.example/feed.xml", title: "Other" })).id];
    const [x, y] = [newId(), newId()];
    await arrive(a, { id: x, created: at(10) });
    await arrive(b, { id: y, created: at(5) });
    expect(await reading(cookie, `background=true&sub=${a}`)).toEqual([]);
  });
});

describe("own items", () => {
  it("a new item supersedes the own item published just before it, and a small edit is near-same", async () => {
    const cookie = await login();
    const first = await createAndPublish(cookie, LONG);
    // published_at has second precision: put the first five minutes back.
    await db().prepare("UPDATE versions SET published_at = ? WHERE item_id = ?").bind(at(5).replace(/\.\d+Z$/, "Z"), first).run();
    const second = await createAndPublish(cookie, "A second thought, minutes later.");
    const background = await reading(cookie, "sub=own&background=true");
    expect(background.find((e) => e.key === `own:${first}`)?.background).toMatchObject({ reasons: ["superseded"], detail: { by: second } });
    expect(keys(await reading(cookie, "sub=own"))).toContain(`own:${second}`);

    await putSettings(db(), { bg_rules: JSON.stringify({ superseded: false }) });
    await apiJson(cookie, "PATCH", `/blyg/api/items/${second}`, { contentMd: "A second thought, minutes later!" });
    expect((await apiJson(cookie, "POST", `/blyg/api/items/${second}/publish`, {})).status).toBe(200);
    // 1 character of 32 is more than 2 %: not near-same on a short text.
    expect(keys(await reading(cookie, "sub=own"))).toContain(`own:${second}`);
    await apiJson(cookie, "PATCH", `/blyg/api/items/${first}`, { contentMd: LONG.replace("whole", "heart") });
    expect((await apiJson(cookie, "POST", `/blyg/api/items/${first}/publish`, {})).status).toBe(200);
    expect((await reading(cookie, "sub=own&background=true")).find((e) => e.key === `own:${first}`)?.background.reasons).toEqual(["near-same"]);
  });
});
