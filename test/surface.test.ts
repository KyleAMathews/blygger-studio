// Reading templated blygs — spec §16.6e, decision #51, v0.4-plan.md §7.5
// M1–M3. Fixtures are shaped on the first live templated blyg, Robert Peake's
// Soapbox (WordPress): manifest at `{origin}blyg.json`, identity `/blyg/`,
// every other file on `/wp-json/…` routes, absolute `page`.
import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { expandTemplate, feedUrl, indexUrl, itemUrl, pinUrl, surfaceFromManifest } from "../src/surface.ts";
import { resolve } from "../src/importer/resolve.ts";
import { createSubscription, getSubscription } from "../src/importer/store.ts";
import { reconcileIndex } from "../src/importer/poll.ts";
import { alternateJsonHref } from "../src/mentions/receive.ts";
import { makeFixtureFetch } from "./importer/fixtures.ts";
import { blygItemUrl } from "../src/importer/util.ts";
import { upsertAndVerify } from "./fork-helpers.ts";
import { contentHash } from "../src/util.ts";

const ORIGIN = "https://soapbox.example/blyg/";
const API = "https://soapbox.example/wp-json/soapbox-blyg/v1/origins/posts/";
const SOAPBOX = {
  blyg: "0.3",
  level: 2,
  title: "Soapbox Example",
  site: ORIGIN,
  feed: `${API}feed`,
  items: `${API}items`,
  item: `${API}items/{id}`,
  pin: `${API}items/{id}/v/{n}`,
  webmention: "webmention",
};
const ID = "4whx180tem4n1abgvdqh8wd4q1";

function itemDoc(overrides: Record<string, unknown> = {}) {
  const content_md = "A poem.";
  return {
    blyg: "0.3",
    id: ID,
    kind: "thread",
    origin: ORIGIN,
    page: "https://soapbox.example/archives/22-a-poem.html",
    created: "2026-10-01T00:00:00Z",
    updated: "2026-10-01T00:00:00Z",
    version: 1,
    content_md,
    content_html: "<p>A poem.</p>",
    content_hash: "",
    media: [],
    transclusions: [],
    changelog: [{ version: 1, at: "2026-10-01T00:00:00Z", note: null }],
    ...overrides,
  };
}

describe("M1 — expansion and the surface model", () => {
  it("expands RFC 6570 level 1, percent-encoding outside the unreserved set", () => {
    expect(expandTemplate("items/{id}.json", { id: ID })).toBe(`items/${ID}.json`);
    expect(expandTemplate("x/{id}/v/{n}", { id: "a b/é", n: 3 })).toBe("x/a%20b%2F%C3%A9/v/3");
    expect(expandTemplate("x?id={id}&v={n}", { id: "q" })).toBe("x?id=q&v=");
  });

  it("defaults are today's paths, and a default-shaped manifest stores nothing", () => {
    expect(itemUrl(ORIGIN, null, ID)).toBe(`${ORIGIN}items/${ID}.json`);
    expect(pinUrl(ORIGIN, null, ID, 2)).toBe(`${ORIGIN}items/${ID}/v2.json`);
    expect(indexUrl(ORIGIN, null)).toBe(`${ORIGIN}items/index.json`);
    expect(feedUrl(ORIGIN, null)).toBe(`${ORIGIN}feed.xml`);
    expect(surfaceFromManifest(ORIGIN, `${ORIGIN}blyg.json`, { blyg: "0.3", feed: "feed.xml", items: "items/index.json" })).toBeNull();
  });

  it("reads a Soapbox manifest's absolute locations and templates", () => {
    const s = surfaceFromManifest(ORIGIN, `${ORIGIN}blyg.json`, SOAPBOX);
    expect(s).not.toBeNull();
    expect(s!.manifest).toBeUndefined();
    expect(itemUrl(ORIGIN, s, ID)).toBe(`${API}items/${ID}`);
    expect(pinUrl(ORIGIN, s, ID, 2)).toBe(`${API}items/${ID}/v/2`);
    expect(indexUrl(ORIGIN, s)).toBe(`${API}items`);
    expect(feedUrl(ORIGIN, s)).toBe(`${API}feed`);
  });

  it("resolves origin-relative template values against the identity origin", () => {
    const s = surfaceFromManifest(ORIGIN, `${ORIGIN}blyg.json`, { blyg: "0.4", item: "docs/{id}", pin: "docs/{id}/{n}" });
    expect(itemUrl(ORIGIN, s, ID)).toBe(`${ORIGIN}docs/${ID}`);
    expect(pinUrl(ORIGIN, s, ID, 7)).toBe(`${ORIGIN}docs/${ID}/7`);
  });
});

describe("M2 — resolution", () => {
  it("a manifest found through rel=blyg at a non-blyg.json path: identity is its URL minus the last segment", async () => {
    const manifestAt = "https://cms.example/wp-json/blyg/v1/manifest";
    const { fetch } = makeFixtureFetch({
      "https://cms.example/": { body: `<html><head><link rel="blyg" href="/wp-json/blyg/v1/manifest"></head></html>` },
      [manifestAt]: { body: JSON.stringify({ blyg: "0.4", item: "items/{id}", pin: "items/{id}/{n}", feed: "feed", items: "items" }) },
    });
    const r = await resolve("https://cms.example/", fetch);
    expect(r.kind).toBe("blyg");
    if (r.kind !== "blyg") return;
    expect(r.origin).toBe("https://cms.example/wp-json/blyg/v1/");
    expect(r.manifestUrl).toBe(manifestAt);
    const s = surfaceFromManifest(r.origin, r.manifestUrl, r.manifest);
    expect(s!.manifest).toBe(manifestAt);
    expect(itemUrl(r.origin, s, ID)).toBe(`https://cms.example/wp-json/blyg/v1/items/${ID}`);
  });

  it("a rel=blyg href that is an origin base still appends blyg.json", async () => {
    const { fetch } = makeFixtureFetch({
      "https://host.example/post/": { body: `<html><head><link rel="blyg" href="https://host.example/blyg/"></head></html>` },
      "https://host.example/blyg/blyg.json": { body: JSON.stringify({ blyg: "0.3" }) },
    });
    const r = await resolve("https://host.example/post/", fetch);
    expect(r.kind === "blyg" && r.origin).toBe("https://host.example/blyg/");
  });

  it("Soapbox's shape: bare origin probe, identity /blyg/, templates kept on the subscription", async () => {
    const { fetch } = makeFixtureFetch({ [`${ORIGIN}blyg.json`]: { body: JSON.stringify(SOAPBOX) } });
    const r = await resolve(ORIGIN, fetch);
    expect(r.kind === "blyg" && r.origin).toBe(ORIGIN);
    if (r.kind !== "blyg") return;
    const s = surfaceFromManifest(r.origin, r.manifestUrl, r.manifest);
    const sub = await createSubscription(env.DB, { kind: "blyg", origin: r.origin, feedUrl: feedUrl(r.origin, s), title: "S", surface: s });
    const row = (await getSubscription(env.DB, sub.id))!;
    expect(row.feed_url).toBe(`${API}feed`);
    expect(JSON.parse(row.surface!).item).toBe(`${API}items/{id}`);
  });

  it("the importer reconciles through the manifest's index and item locations", async () => {
    const s = surfaceFromManifest(ORIGIN, `${ORIGIN}blyg.json`, SOAPBOX);
    const sub = await createSubscription(env.DB, { kind: "blyg", origin: ORIGIN, feedUrl: `${API}feed`, title: "S", surface: s });
    const doc = itemDoc();
    doc.content_hash = await contentHash(doc.content_md);
    const { fetch, calls } = makeFixtureFetch({
      [`${API}items`]: { body: JSON.stringify({ updated: doc.updated, items: [{ id: ID, kind: "thread", created: doc.created, updated: doc.updated, version: 1 }] }) },
      [`${API}items/${ID}`]: { body: JSON.stringify(doc) },
    });
    const r = await reconcileIndex(env.DB, sub, fetch);
    expect(r).toEqual({ ok: true, changed: 1 });
    expect(calls).toEqual([`${API}items`, `${API}items/${ID}`]);
  });
});

describe("absolute page", () => {
  it("an absolute page is the item's URL; a relative one is origin-relative as before", () => {
    const page = "https://soapbox.example/archives/22-a-poem.html";
    expect(blygItemUrl(ORIGIN, "thread", ID, page)).toBe(page);
    expect(blygItemUrl(ORIGIN, "thread", ID, "t/x/")).toBe(`${ORIGIN}t/x/`);
    expect(blygItemUrl(ORIGIN, "thread", ID, "/t/x/")).toBe(`${ORIGIN}t/x/`);
    expect(blygItemUrl(ORIGIN, "thread", ID, null)).toBe(`${ORIGIN}t/${ID}/`);
  });
});

describe("M3 — receivers", () => {
  const TARGET = "7c9wk2mhq0v3xj8tn5rzfd41bg";
  const OURS = "https://ours.example/blyg/";
  const page = "https://soapbox.example/archives/22-a-poem.html";
  const pageHtml = `<html><head>
<link rel="alternate" title="oEmbed (JSON)" type="application/json+oembed" href="https://soapbox.example/wp-json/oembed/1.0/embed?url=x" />
<link rel="blyg" href="${ORIGIN}" />
<link rel="alternate" type="application/json" href="${API}items/${ID}" />
</head></html>`;
  const stub = itemDoc({ stub_of: { origin: OURS, id: TARGET, version: 1 } });

  it("picks the item document's alternate, not WordPress's oEmbed one listed first", () => {
    expect(alternateJsonHref(pageHtml, page)).toBe(`${API}items/${ID}`);
    expect(alternateJsonHref(`<link rel="alternate" type="application/json; charset=utf-8" href="/d">`, page)).toBe("https://soapbox.example/d");
  });

  it("a Soapbox-shaped stub verifies against the sender's own item template", async () => {
    const r = await upsertAndVerify(env.DB, page, `${OURS}t/${TARGET}/`, TARGET, OURS, {
      [page]: pageHtml,
      [`${API}items/${ID}`]: JSON.stringify(stub),
      [`${ORIGIN}blyg.json`]: JSON.stringify(SOAPBOX),
    });
    expect(r).toEqual({ status: "verified", relation: "stub" });
  });

  it("the same document served from a URL matching neither path fails", async () => {
    const elsewhere = "https://soapbox.example/other/route/" + ID;
    const r = await upsertAndVerify(env.DB, elsewhere, `${OURS}t/${TARGET}/`, TARGET, OURS, {
      [elsewhere]: JSON.stringify(stub),
      [`${ORIGIN}blyg.json`]: JSON.stringify(SOAPBOX),
    });
    expect(r.status).toBe("failed");
    expect(r.reason).toMatch(/origin mismatch/);
  });

  it("a missing sender manifest fails the claim", async () => {
    const r = await upsertAndVerify(env.DB, page, `${OURS}t/${TARGET}/`, TARGET, OURS, {
      [page]: pageHtml,
      [`${API}items/${ID}`]: JSON.stringify(stub),
    });
    expect(r.status).toBe("failed");
  });

  it("an impostor cannot borrow another origin's template", async () => {
    // A document claiming Soapbox's origin, served from an attacker's host whose
    // own manifest would template there — verification reads the *asserted*
    // origin's manifest, which does not.
    const evil = `https://evil.example/items/${ID}`;
    const r = await upsertAndVerify(env.DB, evil, `${OURS}t/${TARGET}/`, TARGET, OURS, {
      [evil]: JSON.stringify(stub),
      [`${ORIGIN}blyg.json`]: JSON.stringify(SOAPBOX),
      "https://evil.example/blyg.json": JSON.stringify({ blyg: "0.3", item: "items/{id}" }),
    });
    expect(r.status).toBe("failed");
  });
});
