// The two-pane reader (session 28): sources on the left, stream on the right.
//
// Modelled on Aneesh Sathe's desktop client, with one deliberate omission — no
// preview pane. That client is a native app where a third pane is the only way
// to read something without leaving; a browser already has tabs, and the entry
// link opens one.
import { env, SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { applyEffect, createSubscription } from "../src/importer/store.ts";
import { transition } from "../src/importer/transition.ts";
import { itemDocBody } from "./importer/fixtures.ts";
import { BASE, createAndPublish, login, STUDIO } from "./helpers.ts";
import { newId } from "../src/util.ts";

async function importFrom(origin: string, title: string, body: string): Promise<{ sub: string; id: string }> {
  const sub = await createSubscription(env.DB, { kind: "blyg", origin, feedUrl: `${origin}feed.xml`, title });
  const id = newId();
  const doc = await itemDocBody({ id, kind: "fragment", version: 1, content_md: body, content_html: `<p>${body}</p>` });
  const tr = transition({ local: { status: "absent" }, doc: JSON.parse(doc) });
  await applyEffect(env.DB, sub.id, id, tr.effect, new Date().toISOString(), {});
  return { sub: sub.id, id };
}

const read = async (cookie: string, qs = "") => {
  const res = await SELF.fetch(`${BASE}${STUDIO}/reading${qs}`, { headers: { cookie } });
  expect(res.status).toBe(200);
  return res.text();
};

describe("the source sidebar", () => {
  it("lists every subscription, with Add feed above them", async () => {
    const cookie = await login();
    await importFrom("https://alpha.example/blyg/", "Alpha", "from alpha");
    await importFrom("https://beta.example/blyg/", "Beta", "from beta");
    const html = await read(cookie);
    expect(html).toContain('class="reading-sidebar"');
    expect(html).toContain('id="add-sub-form"');
    expect(html).toContain("Alpha");
    expect(html).toContain("Beta");
    // The add form comes before the list it adds to.
    expect(html.indexOf('id="add-sub-form"')).toBeLessThan(html.indexOf("Alpha"));
  });

  it("keeps a route to the management page the nav no longer shows", async () => {
    const cookie = await login();
    const html = await read(cookie);
    // /subs owns pause, resume, resync, delete and blogroll membership. Losing
    // the tab must not lose those.
    expect(html).toContain(`href="${STUDIO}/subs"`);
    expect(html).toContain("manage feeds");
  });

  it("defaults to All, with All marked current", async () => {
    const cookie = await login();
    await importFrom("https://alpha.example/blyg/", "Alpha", "from alpha");
    const html = await read(cookie);
    expect(html).toMatch(/<a href="[^"]*\/reading"[^>]*class="current"[^>]*>[\s\S]*?All/);
  });
});

describe("filtering by source", () => {
  it("shows only that subscription's entries", async () => {
    const cookie = await login();
    const alpha = await importFrom("https://alpha.example/blyg/", "Alpha", "words from alpha");
    await importFrom("https://beta.example/blyg/", "Beta", "words from beta");

    const all = await read(cookie);
    expect(all).toContain("words from alpha");
    expect(all).toContain("words from beta");

    const just = await read(cookie, `?sub=${alpha.sub}`);
    expect(just).toContain("words from alpha");
    expect(just).not.toContain("words from beta");
  });

  it("separates your own items from what you subscribe to", async () => {
    const cookie = await login();
    await createAndPublish(cookie, "a thing I wrote");
    await importFrom("https://alpha.example/blyg/", "Alpha", "words from alpha");
    const mine = await read(cookie, "?sub=own");
    expect(mine).toContain("a thing I wrote");
    expect(mine).not.toContain("words from alpha");
  });

  it("carries the filter through paging, so page 2 is still one source", async () => {
    const cookie = await login();
    const alpha = await importFrom("https://alpha.example/blyg/", "Alpha", "from alpha");
    const html = await read(cookie, `?sub=${alpha.sub}`);
    // Whether or not a pager renders here, any pager link must keep `sub`.
    for (const m of html.matchAll(/href="([^"]*\/reading\?page=[^"]*)"/g)) {
      expect(m[1]).toContain(`sub=${alpha.sub}`);
    }
  });

  it("falls back to All for a deleted or unknown source", async () => {
    const cookie = await login();
    await importFrom("https://alpha.example/blyg/", "Alpha", "words from alpha");
    // An empty page would read as a broken feed rather than a stale bookmark.
    const html = await read(cookie, "?sub=nosuchsubscription");
    expect(html).toContain("words from alpha");
  });

  it("says something useful when one source is genuinely empty", async () => {
    const cookie = await login();
    const sub = await createSubscription(env.DB, {
      kind: "blyg",
      origin: "https://quiet.example/blyg/",
      feedUrl: "https://quiet.example/blyg/feed.xml",
      title: "Quiet",
    });
    const html = await read(cookie, `?sub=${sub.id}`);
    expect(html).toContain("Nothing from this source yet");
  });
});

describe("the subscriptions page still works without its tab", () => {
  it("serves and keeps its management controls", async () => {
    const cookie = await login();
    const { sub } = await importFrom("https://alpha.example/blyg/", "Alpha", "x");
    const res = await SELF.fetch(`${BASE}${STUDIO}/subs`, { headers: { cookie } });
    expect(res.status).toBe(200);
    const html = await res.text();
    for (const action of ["pause", "delete-sub", "toggle-blogroll"]) {
      expect(html, action).toContain(`data-action="${action}"`);
    }
    expect(html).toContain(sub);
  });
});
