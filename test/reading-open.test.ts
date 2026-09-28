// "open ↗" on a reading entry (session 28). The reading feed rendered every
// entry's body but linked to nothing, so the most ordinary next move — go read
// the whole thing where it lives — had no affordance at all and meant copying
// an origin out of the byline by hand.
//
// The link is derived from `sourceTitleAndUrl`, the same rule the stub gesture
// already used, rather than a second URL-shaped guess: the origin's declared
// `page` wins (§2.3.2, decision #29), the f/·t/ convention is only a fallback,
// and an L0 entry points at the anchor its feed supplied.
import { env, SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { applyEffect, createSubscription } from "../src/importer/store.ts";
import { transition } from "../src/importer/transition.ts";
import { itemDocBody } from "./importer/fixtures.ts";
import { apiJson, BASE, createAndPublish, login, STUDIO } from "./helpers.ts";
import { newId } from "../src/util.ts";

const ORIGIN = "https://friend.example/blyg/";

async function importItem(
  origin: string,
  doc: { id: string; kind?: "fragment" | "thread"; content_md?: string; content_html?: string; page?: string },
  opts: { l0?: boolean; title?: string } = {},
): Promise<string> {
  const sub = await createSubscription(env.DB, {
    kind: "blyg",
    origin,
    feedUrl: `${origin}feed.xml`,
    title: opts.title ?? "Friend",
  });
  const body = await itemDocBody({ kind: "fragment", version: 1, ...doc });
  const tr = transition({ local: { status: "absent" }, doc: JSON.parse(body) });
  await applyEffect(env.DB, sub.id, doc.id, tr.effect, new Date().toISOString(), { l0: opts.l0 });
  return sub.id;
}

async function readingHtml(cookie: string): Promise<string> {
  const res = await SELF.fetch(`${BASE}${STUDIO}/reading`, { headers: { cookie } });
  expect(res.status).toBe(200);
  return res.text();
}

describe("reading entries link out", () => {
  it("points a blyg-native entry at the origin's own permalink", async () => {
    const cookie = await login();
    const remoteId = newId();
    await importItem(ORIGIN, { id: remoteId, content_md: "their words", content_html: "<p>their words</p>" });
    const html = await readingHtml(cookie);
    expect(html).toContain(`href="${ORIGIN}f/${remoteId}/"`);
  });

  it("prefers the origin's declared `page` over our f/·t/ convention", async () => {
    const cookie = await login();
    const remoteId = newId();
    await importItem(ORIGIN, {
      id: remoteId,
      content_md: "their words",
      content_html: "<p>their words</p>",
      page: "notes/a-custom-permalink/",
    });
    const html = await readingHtml(cookie);
    // Decision #29: the f/·t/ shape is this client's presentation, never an
    // assumption about how someone else's blyg addresses its own items.
    expect(html).toContain(`href="${ORIGIN}notes/a-custom-permalink/"`);
    expect(html).not.toContain(`href="${ORIGIN}f/${remoteId}/"`);
  });

  it("points an L0 entry at the anchor its feed supplied", async () => {
    const cookie = await login();
    const remoteId = newId();
    await importItem(
      "https://rss.example/",
      {
        id: remoteId,
        content_md: "[A legacy post](https://rss.example/posts/legacy/)",
        content_html: '<p><a href="https://rss.example/posts/legacy/">A legacy post</a></p>',
      },
      { l0: true, title: "Legacy" },
    );
    const html = await readingHtml(cookie);
    expect(html).toContain('href="https://rss.example/posts/legacy/"');
  });

  it("points an own entry at our own public page", async () => {
    const cookie = await login();
    const id = await createAndPublish(cookie, "something of mine");
    const html = await readingHtml(cookie);
    expect(html).toContain(`href="/blyg/f/${id}/"`);
  });

  it("offers no link for an own item that has been withdrawn", async () => {
    const cookie = await login();
    const id = await createAndPublish(cookie, "about to go");
    await apiJson(cookie, "POST", `/api/items/${id}/withdraw`, {});
    const html = await readingHtml(cookie);
    // The endcap is public, but sending a reader to it as "open ↗" would
    // promise the text and deliver its absence.
    expect(html).not.toContain(`href="/blyg/f/${id}/"`);
  });

  it("always opens in a new tab", async () => {
    const cookie = await login();
    await createAndPublish(cookie, "something of mine");
    const html = await readingHtml(cookie);
    // The studio holds unsaved composer text; a half-written draft should not
    // depend on the back button.
    const open = /<a class="entry-open"[^>]*>/.exec(html);
    expect(open, "no open link rendered").not.toBeNull();
    expect(open![0]).toContain('target="_blank"');
    expect(open![0]).toContain('rel="noopener"');
  });
});

describe("the link shows the address, not just an affordance", () => {
  it("prints host and path, with the item id elided", async () => {
    const cookie = await login();
    const remoteId = newId();
    await importItem(ORIGIN, { id: remoteId, content_md: "their words", content_html: "<p>their words</p>" });
    const html = await readingHtml(cookie);
    // The identifying parts are the host and the shape of the path. The id is
    // the one segment nobody reads, so it is the one that gets cut.
    expect(html).toContain(`friend.example/blyg/f/${remoteId.slice(0, 8)}…/`);
    expect(html).not.toContain(`>friend.example/blyg/f/${remoteId}/`);
    // The href stays whole — only the label is shortened.
    expect(html).toContain(`href="${ORIGIN}f/${remoteId}/"`);
  });

  it("drops the scheme, which is identical on every row", async () => {
    const cookie = await login();
    await importItem(ORIGIN, { id: newId(), content_md: "x", content_html: "<p>x</p>" });
    const html = await readingHtml(cookie);
    const label = /<a class="entry-open"[^>]*>([^<]*)</.exec(html);
    expect(label, "no link rendered").not.toBeNull();
    expect(label![1]).not.toContain("https://");
  });

  it("distinguishes two origins that stub the same thing", async () => {
    const cookie = await login();
    // The exact case that made the feed confusing: same body, different origin.
    const a = newId();
    const b = newId();
    await importItem("https://alpha.example/blyg/", { id: a, content_md: "same", content_html: "<p>same</p>" }, { title: "Alpha" });
    await importItem("https://beta.example/blyg/", { id: b, content_md: "same", content_html: "<p>same</p>" }, { title: "Beta" });
    const html = await readingHtml(cookie);
    expect(html).toContain("alpha.example/blyg/f/");
    expect(html).toContain("beta.example/blyg/f/");
  });

  it("keeps a full title attribute so the whole URL is still available", async () => {
    const cookie = await login();
    const remoteId = newId();
    await importItem(ORIGIN, { id: remoteId, content_md: "x", content_html: "<p>x</p>" });
    expect(await readingHtml(cookie)).toContain(`title="${ORIGIN}f/${remoteId}/"`);
  });
});

describe("displayUrl handles a relative href too", () => {
  it("elides the id on our own items, which link relatively", async () => {
    const cookie = await login();
    const id = await createAndPublish(cookie, "something of mine");
    const html = await readingHtml(cookie);
    // Caught by looking at the page, not by the suite: the first version
    // parsed with `new URL()` and returned the input unchanged when that threw,
    // so own entries printed the whole 26-character id. The href assertion
    // above passed throughout — it was never about the label.
    expect(html).toContain(`>/blyg/f/${id.slice(0, 8)}…/ ↗<`);
    expect(html).not.toContain(`>/blyg/f/${id}/ ↗<`);
  });
});
