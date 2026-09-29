// `copy [[id]]` on a reading entry — decision #50 (session 28).
//
// This affordance was raised by an Opus session as a possible collision with
// #27, which retired `respond ↗` with "one affordance, no lighter sibling".
// Fable ruled it is not one: #27's forbidden sibling was a *response* gesture
// that did not declare itself, and #32 ruled `[[id]]` declares nothing — no
// relation, no mention — so this is a different act, citing without
// responding. Refusing it would leave the construct unreachable from where
// authors meet items.
//
// The ruling came with conditions, and they are what this file pins, because
// they are the part a later refactor could quietly undo: the control is named
// for what it does, it sits beside `open ↗` where copy-permalink would, and it
// is never a peer of `stub ↗` in the actions row. Position is semantics here.
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
  doc: { id: string; kind?: "fragment" | "thread"; content_md?: string; content_html?: string },
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

describe("copy [[id]] is offered where the link would resolve", () => {
  it("on an imported blyg item", async () => {
    const cookie = await login();
    const remoteId = newId();
    await importItem(ORIGIN, { id: remoteId, content_md: "their words", content_html: "<p>their words</p>" });
    expect(await readingHtml(cookie)).toContain(`data-action="copy" data-copy="[[${remoteId}]]"`);
  });

  it("on our own published item", async () => {
    const cookie = await login();
    const id = await createAndPublish(cookie, "something of mine");
    expect(await readingHtml(cookie)).toContain(`data-action="copy" data-copy="[[${id}]]"`);
  });

  it("never on an L0 entry — a legacy feed has no item document to resolve", async () => {
    const cookie = await login();
    const l0Id = newId();
    await importItem(
      "https://rss.example/",
      { id: l0Id, content_md: "rss summary", content_html: "<p>rss summary</p>" },
      { l0: true, title: "Legacy" },
    );
    const html = await readingHtml(cookie);
    // `resolveTarget` excludes L0, so offering this would hand the author a
    // construct that fails their whole publish later.
    expect(html).not.toContain(`data-action="copy" data-copy="[[${l0Id}]]"`);
    // It still gets `open ↗` — reading it is fine, linking it is not.
    expect(html).toContain('href="https://rss.example/"');
  });

  it("never on a withdrawn own item", async () => {
    const cookie = await login();
    const id = await createAndPublish(cookie, "about to go");
    await apiJson(cookie, "POST", `/api/items/${id}/withdraw`, {});
    expect(await readingHtml(cookie)).not.toContain(`data-action="copy" data-copy="[[${id}]]"`);
  });

  it("copies the construct, not the bare id", async () => {
    const cookie = await login();
    await createAndPublish(cookie, "something of mine");
    const html = await readingHtml(cookie);
    // An id alone would make the author remember a grammar they came to the
    // reader to look up.
    expect(html).toContain('data-copy="[[');
  });
});

describe("decision #50's conditions hold structurally", () => {
  it("is not named respond, reply or answer", async () => {
    const cookie = await login();
    await createAndPublish(cookie, "something of mine");
    const html = await readingHtml(cookie);
    const control = /<button[^>]*data-action="copy"[^>]*>([\s\S]*?)<\/button>/.exec(html);
    expect(control, "no copy-link control rendered").not.toBeNull();
    expect(control![1].toLowerCase()).not.toMatch(/respond|reply|answer/);
    expect(control![1]).toContain("copy");
  });

  // Resolved, session 28. The control briefly sat in the actions row beside
  // `stub ↗`, which was the one placement #50 conditioned against. Venkat's
  // fix was better than either previous arrangement: split the two sets by what
  // they *do*. The byline carries what writes nothing — copy the construct,
  // copy the URL, open the URL — which is literally "beside copy-permalink",
  // the home #50 named. Composition moved to a separate control, `link post`.
  it("sits beside copy-permalink in the byline, not with stub ↗ (#50's condition)", async () => {
    const cookie = await login();
    const remoteId = newId();
    await importItem(ORIGIN, { id: remoteId, content_md: "their words", content_html: "<p>their words</p>" });
    const html = await readingHtml(cookie);

    const byline = [...html.matchAll(/<p class="byline">([\s\S]*?)<\/p>/g)].map((m) => m[1]);
    expect(byline.some((b) => b.includes('data-action="copy"')), "copy not in any byline").toBe(true);
    // Beside copy-permalink, which now literally exists.
    expect(byline.some((b) => b.includes("copy url")), "no copy url").toBe(true);

    // `stub ↗` stays the one affordance meaning "I am responding"; a copy
    // button in that row would say otherwise by position alone.
    const rows = [...html.matchAll(/<div class="entry-actions">([\s\S]*?)<\/div>/g)].map((m) => m[1]);
    const imported = rows.find((r) => r.includes('data-action="stub"'));
    expect(imported, "no imported entry's actions row").toBeDefined();
    expect(imported!).not.toContain('data-action="copy"');
  });

  it("still never reads as respond, reply or answer — #50's other condition holds", async () => {
    const cookie = await login();
    await createAndPublish(cookie, "something of mine");
    const html = await readingHtml(cookie);
    const control = /<button[^>]*data-action="copy"[^>]*>([\s\S]*?)<\/button>/.exec(html);
    expect(control, "no copy-link control").not.toBeNull();
    expect(control![1].toLowerCase()).not.toMatch(/respond|reply|answer/);
  });

  it("leaves stub ↗ and fork ↗ exactly as they were", async () => {
    const cookie = await login();
    const remoteId = newId();
    await importItem(ORIGIN, { id: remoteId, content_md: "their words", content_html: "<p>their words</p>" });
    const html = await readingHtml(cookie);
    expect(html).toContain("stub ↗");
    expect(html).toContain("fork ↗");
  });
});

describe("link post — the composition half (decision #50)", () => {
  it("is offered beside stub and fork, where composition lives", async () => {
    const cookie = await login();
    const remoteId = newId();
    await importItem(ORIGIN, { id: remoteId, content_md: "their words", content_html: "<p>their words</p>" });
    const html = await readingHtml(cookie);
    const rows = [...html.matchAll(/<div class="entry-actions">([\s\S]*?)<\/div>/g)].map((m) => m[1]);
    const imported = rows.find((r) => r.includes('data-action="stub"'));
    expect(imported!).toContain('data-action="link-post"');
  });

  it("is named for what it makes, never for a relation to the target", async () => {
    const cookie = await login();
    await createAndPublish(cookie, "something of mine");
    const html = await readingHtml(cookie);
    const btn = /<button[^>]*data-action="link-post"[^>]*>([\s\S]*?)<\/button>/.exec(html);
    expect(btn, "no link-post control").not.toBeNull();
    // #50's naming condition, and the one that keeps `stub ↗` unambiguous.
    expect(btn![1].toLowerCase()).not.toMatch(/respond|reply|answer/);
  });

  it("creates a fragment whose body is the link and nothing of theirs", async () => {
    const cookie = await login();
    const html = await readingHtml(cookie);
    // Decision #12: none of the target's text is copied. The body is the
    // construct and a blank line to write into.
    expect(html).toContain('content_md: "[[" + btn.dataset.id + "]]');
    expect(html).toContain('kind: "fragment"');
  });

  it("creates server-side then navigates, so a refresh mints no duplicates", async () => {
    const cookie = await login();
    const html = await readingHtml(cookie);
    const handler = html.slice(html.indexOf("data-action='link-post'"));
    expect(handler.slice(0, 900)).toContain('method: "POST"');
    expect(handler.slice(0, 900)).toContain("location.href");
  });

  it("is absent where a link could not resolve — L0 has no item document", async () => {
    const cookie = await login();
    const l0Id = newId();
    await importItem(
      "https://rss.example/",
      { id: l0Id, content_md: "rss summary", content_html: "<p>rss summary</p>" },
      { l0: true, title: "Legacy" },
    );
    const html = await readingHtml(cookie);
    expect(html).not.toContain(`data-action="link-post" data-id="${l0Id}"`);
  });
});

describe("copy url", () => {
  it("is absolute for our own items, which link relatively on the page", async () => {
    const cookie = await login();
    const id = await createAndPublish(cookie, "something of mine");
    const html = await readingHtml(cookie);
    // A relative path is exactly what fails once pasted somewhere, which is
    // the entire purpose of this button.
    // Both copy buttons carry this id — one as [[id]], one as a URL — so the
    // match has to name which.
    const m = new RegExp(`data-copy="(https?://[^"]*${id}[^"]*)"`).exec(html);
    expect(m, "no absolute copy-url payload for the own item").not.toBeNull();
    expect(m![1]).toContain(`/f/${id}/`);
  });

  it("uses the origin's own URL for an imported item", async () => {
    const cookie = await login();
    const remoteId = newId();
    await importItem(ORIGIN, { id: remoteId, content_md: "x", content_html: "<p>x</p>" });
    expect(await readingHtml(cookie)).toContain(`data-copy="${ORIGIN}f/${remoteId}/"`);
  });
});
