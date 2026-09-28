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
    expect(await readingHtml(cookie)).toContain(`data-action="copy-link" data-id="${remoteId}"`);
  });

  it("on our own published item", async () => {
    const cookie = await login();
    const id = await createAndPublish(cookie, "something of mine");
    expect(await readingHtml(cookie)).toContain(`data-action="copy-link" data-id="${id}"`);
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
    expect(html).not.toContain(`data-action="copy-link" data-id="${l0Id}"`);
    // It still gets `open ↗` — reading it is fine, linking it is not.
    expect(html).toContain('href="https://rss.example/"');
  });

  it("never on a withdrawn own item", async () => {
    const cookie = await login();
    const id = await createAndPublish(cookie, "about to go");
    await apiJson(cookie, "POST", `/api/items/${id}/withdraw`, {});
    expect(await readingHtml(cookie)).not.toContain(`data-action="copy-link" data-id="${id}"`);
  });

  it("copies the construct, not the bare id", async () => {
    const cookie = await login();
    await createAndPublish(cookie, "something of mine");
    const html = await readingHtml(cookie);
    // An id alone would make the author remember a grammar they came to the
    // reader to look up.
    expect(html).toContain('const text = "[[" + btn.dataset.id + "]]";');
  });
});

describe("decision #50's conditions hold structurally", () => {
  it("is not named respond, reply or answer", async () => {
    const cookie = await login();
    await createAndPublish(cookie, "something of mine");
    const html = await readingHtml(cookie);
    const control = /<button[^>]*data-action="copy-link"[^>]*>([\s\S]*?)<\/button>/.exec(html);
    expect(control, "no copy-link control rendered").not.toBeNull();
    expect(control![1].toLowerCase()).not.toMatch(/respond|reply|answer/);
    expect(control![1]).toContain("copy");
  });

  it("sits in the byline beside open ↗, not in the actions row with stub ↗", async () => {
    const cookie = await login();
    const remoteId = newId();
    await importItem(ORIGIN, { id: remoteId, content_md: "their words", content_html: "<p>their words</p>" });
    const html = await readingHtml(cookie);

    const byline = /<p class="byline">([\s\S]*?)<\/p>/.exec(html);
    expect(byline, "no byline").not.toBeNull();
    expect(byline![1]).toContain('data-action="copy-link"');

    // `stub ↗` stays the one affordance meaning "I am responding"; a peer in
    // that row would say otherwise by position alone.
    const actions = /<div class="entry-actions">([\s\S]*?)<\/div>/.exec(html);
    expect(actions, "no actions row").not.toBeNull();
    expect(actions![1]).toContain('data-action="stub"');
    expect(actions![1]).not.toContain('data-action="copy-link"');
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
