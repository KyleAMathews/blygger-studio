// The catch-up helper (blygger-spec docs/helpers-plan.md §7; after Burrow
// 0.23.0). What matters: a conversation stored inside out comes back oldest
// first, each card holding only its own post's words (never its quotes'),
// with whose it is; by time when every card's time is known, else deeper
// first; and it is listed in the helper catalogue.
import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { applyEffect, createSubscription } from "../src/importer/store.ts";
import { transition } from "../src/importer/transition.ts";
import { quoteLayers } from "../src/helpers/catch-up.ts";
import { newId } from "../src/util.ts";
import { itemDocBody } from "./importer/fixtures.ts";
import { apiJson, createAndPublish, login } from "./helpers.ts";

const db = () => env.DB;
const layer = (id: string, inner: string, extra = "") => `<blockquote class="blyg-transclusion${extra}" data-blyg-id="${id}" data-blyg-version="1"${id === "far" ? ' data-blyg-origin="https://far.example/"' : ""}>${inner}</blockquote>`;
type Card = { id: string; sub: string | null; source: string; depth: number; html: string; at: string | null; partial: boolean };

describe("catch-up", () => {
  it("reads the layer tree, inheriting origins down it, and leaves plain blockquotes alone", () => {
    const html = `<p>outer</p>${layer("b", `<p>b's words</p><blockquote><p>b quoting by hand</p></blockquote>${layer("far", `<p>far words</p>${layer("deep", "<p>deep</p>")}`)}`)}`;
    const tree = quoteLayers(html, "https://here.example/blyg/");
    const b = tree.children[0]!;
    expect([b.id, b.depth, b.origin]).toEqual(["b", 1, "https://here.example/blyg/"]);
    const far = b.children.find((c) => c.id === "far")!;
    expect([far.depth, far.origin]).toEqual([2, "https://far.example/"]);
    // Absent origin: the origin of the layer that baked it (§10.2).
    expect(far.children[0]).toMatchObject({ id: "deep", depth: 3, origin: "https://far.example/" });
    expect(b.children.some((c) => !c.transclusion)).toBe(true);
  });

  it("lays your own chain out oldest first, each card its own words", async () => {
    const cookie = await login();
    const a = await createAndPublish(cookie, "The first word on it.");
    await db().prepare("UPDATE versions SET published_at = ? WHERE item_id = ?").bind("2026-11-01T10:00:00Z", a).run();
    const bRes = await apiJson(cookie, "POST", "/blyg/api/items", { contentMd: `A reply to the first.\n\n![[${a}]]`, kind: "thread" });
    expect((await apiJson(cookie, "POST", `/blyg/api/items/${bRes.json.id}/publish`, {})).status).toBe(200);
    const b = bRes.json.id as string;
    await db().prepare("UPDATE versions SET published_at = ? WHERE item_id = ?").bind("2026-11-02T10:00:00Z", b).run();
    const cRes = await apiJson(cookie, "POST", "/blyg/api/items", { contentMd: `And a reply to that.\n\n![[${b}]]`, kind: "thread" });
    expect((await apiJson(cookie, "POST", `/blyg/api/items/${cRes.json.id}/publish`, {})).status).toBe(200);
    const c = cRes.json.id as string;

    const res = await apiJson(cookie, "POST", "/blyg/api/helpers/catch-up", { sub: "~own", remoteId: c });
    expect(res.status).toBe(200);
    expect(res.json.ordered).toBe("time");
    const cards = res.json.cards as Card[];
    expect(cards.map((x) => x.id)).toEqual([a, b, c]);
    expect(cards.map((x) => x.depth)).toEqual([2, 1, 0]);
    expect(cards.every((x) => x.source === "you" && x.sub === "~own")).toBe(true);
    expect(cards[0]!.html).toContain("The first word on it.");
    expect(cards[1]!.html).toContain("A reply to the first.");
    expect(cards[1]!.html).not.toContain("The first word on it.");
    expect(cards[2]!.html).toContain("And a reply to that.");
    expect(cards[2]!.html).not.toContain("A reply to the first.");
  });

  it("orders deeper first when a layer's time is unknown, and names blygs it does not hold by host", async () => {
    const cookie = await login();
    const origin = "https://catchup-source.example/blyg/";
    const sub = (await createSubscription(db(), { kind: "blyg", origin, feedUrl: `${origin}feed.xml`, title: "Catch-up source" })).id;
    const id = newId();
    const html = `<p>Their thread's own words.</p>${layer("b", `<p>b's words</p>${layer("far", "<p>far words</p>", " blyg-partial")}`)}`;
    const doc = JSON.parse(await itemDocBody({ id, kind: "thread", version: 1, content_md: "x", content_html: html, created: new Date().toISOString(), updated: new Date().toISOString(), origin }));
    await applyEffect(db(), sub, id, transition({ local: { status: "absent" }, doc }).effect, new Date().toISOString());

    const res = await apiJson(cookie, "POST", "/blyg/api/helpers/catch-up", { sub, remoteId: id });
    expect(res.status).toBe(200);
    expect(res.json.ordered).toBe("depth");
    const cards = res.json.cards as Card[];
    expect(cards.map((x) => [x.id, x.source, x.sub])).toEqual([["far", "far.example", null], ["b", "Catch-up source", null], [id, "Catch-up source", sub]]);
    expect(cards[0]!.partial).toBe(true);
    expect(cards[1]!.html).not.toContain("far words");
    expect(cards[2]!.html).toContain("Their thread's own words.");
    expect(cards[2]!.html).not.toContain("b's words");
  });

  it("is in the helper catalogue, and refuses an entry it does not hold", async () => {
    const cookie = await login();
    const helpers = (await apiJson(cookie, "GET", "/blyg/api/helpers")).json.helpers;
    expect(helpers).toContainEqual(expect.objectContaining({ name: "catch-up", kind: "mechanical", operation: "catchUp" }));
    expect((await apiJson(cookie, "POST", "/blyg/api/helpers/catch-up", { sub: "~own", remoteId: newId() })).status).toBe(404);
  });
});
