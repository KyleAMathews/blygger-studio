// The home page orders (src/feeds, docs/pace-layered-feed.md, session 46).
//   1. The fixtures in test/fixtures/feeds are the reference: fixed histories
//      with orders worked by hand. They are JSON so another client can run them.
//   2. Invariants the fixtures only sample: determinism, the pinned-and-revised
//      limit, weight flowing from quoter to quoted and never back.
//   3. The setting and the real home page.

import { env, SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { DEFAULT_FEED_ORDER, FEED_ALGORITHMS } from "../src/feeds/index.ts";
import { layerFor, paceLayeredOrder, pinWeights } from "../src/feeds/pace-layered.ts";
import { reverseChronological } from "../src/feeds/reverse-chronological.ts";
import type { FeedHistory, FeedHistoryItem } from "../src/feeds/types.ts";
import migration0029 from "../migrations/0029_feed_order.sql?raw";
import { apiJson, BASE, createAndPublish, login } from "./helpers.ts";

type Fixture = { description: string; history: FeedHistory; expected: string[] };
const fixtures: Record<string, Fixture> = Object.fromEntries(
  Object.entries(import.meta.glob("./fixtures/feeds/*.json", { query: "?raw", import: "default", eager: true }))
    .map(([path, raw]) => [path, JSON.parse(raw) as Fixture]),
);

describe("pace-layered: the reference fixtures", () => {
  it("has fixtures to run", () => expect(Object.keys(fixtures).length).toBeGreaterThanOrEqual(6));
  for (const [path, fixture] of Object.entries(fixtures)) {
    it(`${path.split("/").pop()}: ${fixture.description}`, () => {
      expect(paceLayeredOrder(fixture.history)).toEqual(fixture.expected);
    });
  }
});

const at = (minute: number) => new Date(Date.UTC(2026, 9, 1, 0, minute)).toISOString();
const plain = (id: string, ...minutes: number[]): FeedHistoryItem => ({
  id, kind: "fragment", withdrawn: false,
  versions: minutes.map((minute, i) => ({ version: i + 1, at: at(minute), note: null, pinned: false, quotes: [] })),
});

describe("pace-layered: invariants", () => {
  it("does not depend on the order items are listed in, when their times differ", () => {
    for (const fixture of Object.values(fixtures)) {
      const reversed = { items: [...fixture.history.items].reverse() };
      expect(paceLayeredOrder(reversed)).toEqual(paceLayeredOrder(fixture.history));
    }
  });

  it("an item pinned and revised as often as anything is published holds the top", () => {
    // The familiar pinned post, arrived at rather than declared.
    const items: FeedHistoryItem[] = [{ id: "keeper", kind: "thread", withdrawn: false, versions: [] }];
    for (let n = 0; n < 40; n++) {
      items.push(plain(`new${n}`, 2 * n + 1));
      items[0].versions.push({ version: n + 1, at: at(2 * n + 2), note: null, pinned: n < 5, quotes: [] });
    }
    expect(paceLayeredOrder({ items })[0]).toBe("keeper");
  });

  it("an unpinned item revised as often climbs only one place each time", () => {
    const items: FeedHistoryItem[] = [{ id: "busy", kind: "fragment", withdrawn: false, versions: [] }];
    for (let n = 0; n < 10; n++) {
      items.push(plain(`new${n}`, 2 * n + 1));
      items[0].versions.push({ version: n + 1, at: at(2 * n + 2), note: null, pinned: false, quotes: [] });
    }
    // Each revision regains the one place the last newcomer took, and no more.
    items.push(plain("last", 21));
    expect(paceLayeredOrder({ items }).slice(0, 2)).toEqual(["last", "busy"]);
  });

  it("weight flows from the quoting item to the quoted one, halving per hop, and not back", () => {
    const pins = new Map([["thread", 2]]);
    const weights = pinWeights(pins, new Map([["quoted", new Set(["thread"])], ["deeper", new Set(["quoted"])]]));
    expect(weights.get("thread")).toBe(2);
    expect(weights.get("quoted")).toBe(1);
    expect(weights.get("deeper")).toBe(0.5);
  });

  it("a cycle of quotes stays finite", () => {
    const weights = pinWeights(new Map([["a", 1]]), new Map([["a", new Set(["b"])], ["b", new Set(["a"])]]));
    expect(weights.get("a")).toBeLessThan(2);
    expect(weights.get("b")).toBeLessThan(1);
  });

  it("items published in the same second keep the listing order, oldest first", () => {
    expect(paceLayeredOrder({ items: [plain("first", 1), plain("second", 1), plain("third", 1)] })).toEqual(["third", "second", "first"]);
  });

  it("layers stop at the sixth", () => expect(layerFor(100)).toBe(5));

  it("never shows a withdrawn item", () => {
    const history = { items: [plain("a", 1), { ...plain("b", 2), withdrawn: true }] };
    for (const algorithm of FEED_ALGORITHMS) expect(algorithm.order(history)).toEqual(["a"]);
  });
});

describe("reverse-chronological", () => {
  it("orders by the latest version's time", () => {
    expect(reverseChronological.order({ items: [plain("a", 1, 9), plain("b", 2), plain("c", 3)] })).toEqual(["a", "c", "b"]);
  });
});

/** Card ids in the order the home page shows them. */
async function homeOrder(ids: string[]): Promise<string[]> {
  const html = await (await SELF.fetch(`${BASE}/blyg/`)).text();
  return ids.filter((id) => html.includes(id)).sort((a, b) => html.indexOf(a) - html.indexOf(b));
}

/** Publication times are second-precision; give each version its own minute. */
async function retime(id: string, version: number, minute: number) {
  await env.DB.prepare("UPDATE versions SET published_at = ? WHERE item_id = ? AND version = ?").bind(at(minute), id, version).run();
  await env.DB.prepare("UPDATE items SET updated = ? WHERE id = ? AND version = ?").bind(at(minute), id, version).run();
}

describe("the setting and the home page", () => {
  it("a fresh install defaults to pace-layered, and only known orders are accepted", async () => {
    const cookie = await login();
    expect(DEFAULT_FEED_ORDER).toBe("pace-layered");
    expect((await apiJson(cookie, "GET", "/api/settings")).json.feed_order).toBe("pace-layered");
    expect((await apiJson(cookie, "PATCH", "/api/settings", { feed_order: "made-up" })).status).toBe(400);
    expect((await apiJson(cookie, "PATCH", "/api/settings", { feed_order: "reverse-chronological" })).status).toBe(200);
    expect((await apiJson(cookie, "GET", "/api/settings")).json.feed_order).toBe("reverse-chronological");
  });

  it("the home page follows the chosen order", async () => {
    const cookie = await login();
    const [a, b, c] = [await createAndPublish(cookie, "first"), await createAndPublish(cookie, "second"), await createAndPublish(cookie, "third")];
    await retime(a, 1, 1);
    await retime(b, 1, 2);
    await retime(c, 1, 3);
    await apiJson(cookie, "PATCH", `/api/items/${a}`, { content_md: "first, revised" });
    expect((await apiJson(cookie, "POST", `/api/items/${a}/publish`, {})).status).toBe(200);
    await retime(a, 2, 4);

    await apiJson(cookie, "PATCH", "/api/settings", { feed_order: "reverse-chronological" });
    expect(await homeOrder([a, b, c])).toEqual([a, c, b]);
    await apiJson(cookie, "PATCH", "/api/settings", { feed_order: "pace-layered" });
    expect(await homeOrder([a, b, c])).toEqual([c, a, b]);
  });
});

describe("migration 0029", () => {
  it("keeps a node that has published on newest-first and leaves a fresh one on the default", async () => {
    // Storage carries over between tests in a file, so a fresh node is one
    // whose published items are hidden for the first run.
    await env.DB.prepare("UPDATE items SET status = 'draft-hidden' WHERE status IN ('public', 'withdrawn')").run();
    await env.DB.prepare("DELETE FROM settings WHERE key = 'feed_order'").run();
    await env.DB.prepare(migration0029).run();
    const fresh = await env.DB.prepare("SELECT value FROM settings WHERE key = 'feed_order'").first();
    await env.DB.prepare("UPDATE items SET status = 'public' WHERE status = 'draft-hidden'").run();
    const cookie = await login();
    await createAndPublish(cookie, "already published");
    await env.DB.prepare(migration0029).run();
    const published = await env.DB.prepare("SELECT value FROM settings WHERE key = 'feed_order'").first<{ value: string }>();
    expect({ fresh, published: published?.value }).toEqual({ fresh: null, published: "reverse-chronological" });
  });
});
