// A titled thread gets a linked title on the feed page (session 28, Venkat).
//
// It worked for fragments and not for threads, and the cause was an accident
// of two renderers rather than a decision: a fragment card renders real HTML
// and runs `linkLeadingTitle` over it, while a thread card renders an escaped
// plain-text excerpt — so a leading <h1> arrived as the first words of the
// teaser, unstyled and unlinked.
//
// Presentation only, and it has to be. Decision #46: no title field at any
// version, items stay titleless (§5.3), and a *reader* MUST NOT extract a
// title from a leading heading. What a client does with its own pages is its
// own business — #46 calls the linked title "a studio task" in as many words.
import { describe, expect, it } from "vitest";
import { apiJson, createAndPublish, getPublic, login } from "./helpers.ts";

async function publishThread(cookie: string, contentMd: string): Promise<string> {
  const id = (await apiJson(cookie, "POST", "/api/items", { content_md: contentMd, kind: "thread" })).json.id as string;
  expect((await apiJson(cookie, "POST", `/api/items/${id}/publish`, {})).status).toBe(200);
  return id;
}

describe("a titled thread on the feed page", () => {
  it("shows its leading heading as a link to the thread", async () => {
    const cookie = await login();
    const id = await publishThread(cookie, "# On stigmergy\n\nTrails are left by walking.");
    const html = await (await getPublic("/blyg/")).text();
    expect(html).toContain(`<a class="item-title" href="/blyg/t/${id}/">On stigmergy</a>`);
  });

  it("drops the heading from the excerpt, so the title is not also the first sentence", async () => {
    const cookie = await login();
    await publishThread(cookie, "# On stigmergy\n\nTrails are left by walking.");
    const html = await (await getPublic("/blyg/")).text();
    const card = /<article class="fragment thread-card">([\s\S]*?)<\/article>/.exec(html);
    expect(card, "no thread card").not.toBeNull();
    const excerpt = /<span class="kind-chip">thread<\/span>([^<]*)</.exec(card![1]);
    expect(excerpt![1]).toContain("Trails are left by walking");
    expect(excerpt![1]).not.toContain("On stigmergy");
  });

  it("leaves an untitled thread exactly as it was", async () => {
    const cookie = await login();
    await publishThread(cookie, "No heading here, just a thread that runs on.");
    const html = await (await getPublic("/blyg/")).text();
    const card = /<article class="fragment thread-card">([\s\S]*?)<\/article>/.exec(html);
    expect(card![1]).not.toContain("thread-card-title");
    expect(card![1]).toContain("No heading here");
  });

  it("still keeps the read-the-thread link — the title is an addition, not a swap", async () => {
    const cookie = await login();
    const id = await publishThread(cookie, "# Titled\n\nBody.");
    const html = await (await getPublic("/blyg/")).text();
    expect(html).toContain(`href="/blyg/t/${id}/">read the thread →</a>`);
  });
});

describe("the wire is untouched — #46 and §5.3", () => {
  it("the item document keeps the bare heading and gains no title field", async () => {
    const cookie = await login();
    const id = await publishThread(cookie, "# On stigmergy\n\nTrails.");
    const doc = await (await getPublic(`/blyg/items/${id}.json`)).json<Record<string, unknown>>();
    expect(doc.title, "items are titleless (§5.3)").toBeUndefined();
    // The heading is still a heading in the stored HTML, unlinked.
    expect(String(doc.content_html)).toContain("<h1>On stigmergy</h1>");
    expect(String(doc.content_html)).not.toContain("item-title");
  });

  it("the feed keeps the bare heading too", async () => {
    const cookie = await login();
    await publishThread(cookie, "# On stigmergy\n\nTrails.");
    const xml = await (await getPublic("/blyg/feed.xml")).text();
    expect(xml).not.toContain("item-title");
  });

  it("a fragment's title behaviour is unchanged", async () => {
    const cookie = await login();
    const id = await createAndPublish(cookie, "# A fragment title\n\nAnd a body.");
    const html = await (await getPublic("/blyg/")).text();
    expect(html).toContain(`<a class="item-title" href="/blyg/f/${id}/">`);
  });
});

// The same cosmetic fix on the third surface: the studio's own reading feed.
// Until session 28 only L0 entries got a promoted title, so a titled item from
// a real blyg rendered its heading inline in the clamped body — the same
// asymmetry as the public feed page, reached by a different route.
describe("the studio reader promotes a title too", () => {
  it("lifts a blyg-native leading heading into a linked entry title", async () => {
    const cookie = await login();
    await publishThread(cookie, "# On stigmergy\n\nTrails are left by walking.");
    const html = await (await import("cloudflare:test")).SELF.fetch(
      "https://example.com/blyg/studio/reading",
      { headers: { cookie } },
    ).then((r) => r.text());
    const title = /<p class="entry-title">([\s\S]*?)<\/p>/.exec(html);
    expect(title, "no promoted title in the reader").not.toBeNull();
    expect(title![1]).toContain("On stigmergy");
    expect(title![1]).toContain("<a href=");
    expect(title![1]).toContain('target="_blank"');
  });

  it("leaves an untitled entry with no title line", async () => {
    const cookie = await login();
    await createAndPublish(cookie, "Just a fragment, no heading.");
    const { SELF } = await import("cloudflare:test");
    const html = await SELF.fetch("https://example.com/blyg/studio/reading", { headers: { cookie } }).then((r) =>
      r.text(),
    );
    const cards = [...html.matchAll(/<div class="reading-entry">([\s\S]*?)<\/div>\s*<\/div>/g)].map((m) => m[1]);
    const untitled = cards.find((c) => c.includes("Just a fragment"));
    expect(untitled, "entry not found").toBeDefined();
    expect(untitled!).not.toContain("entry-title");
  });
});
