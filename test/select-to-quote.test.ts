// Select-to-quote and the long-target prefill — plan §7.3 P7, spec §16.4.
//
// These are the two studio affordances for partial transclusion. The house
// rule applies: assert what the handler *produces*, not that a button rendered
// — a control that renders and makes an unpublishable draft is worse than no
// control, because the author finds out after writing the response around it.
//
// So the central test here is a round trip: highlight a passage, take the
// prefill the server hands back, publish it, and check the document. That is
// the only assertion that proves the select-to-quote path and the publish-time
// check agree, which is the one way this feature can quietly be broken.
import { env, SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { applyEffect, createSubscription } from "../src/importer/store.ts";
import { transition } from "../src/importer/transition.ts";
import { itemDocBody } from "./importer/fixtures.ts";
import { apiJson, BASE, getPublic, login } from "./helpers.ts";
import { newId } from "../src/util.ts";

const ORIGIN = "https://elsewhere.example/blyg/";

const LONG_BODY = [
  "Stigmergy is what a protocol looks like from inside, and the reason it looks like nothing at all is the point.",
  "The trail is left by walking, and the walking is changed by the trail, which is the whole mechanism and also the whole difficulty.",
  "Everything else in the literature is an elaboration of that loop, usually one that forgets the loop is what it is elaborating.",
].join(" ");

/** Import one item from a fixture origin, returning what the studio needs to act on it. */
async function importItem(opts: { md: string; html?: string; l0?: boolean; title?: string }) {
  const sub = await createSubscription(env.DB, {
    kind: opts.l0 ? "rss" : "blyg",
    origin: ORIGIN,
    feedUrl: `${ORIGIN}feed.xml`,
    title: opts.title ?? "Elsewhere",
  });
  const id = newId();
  const doc = await itemDocBody({
    id,
    kind: "fragment",
    version: 1,
    content_md: opts.md,
    content_html: opts.html ?? `<p>${opts.md}</p>`,
    origin: ORIGIN,
  });
  const tr = transition({ local: { status: "absent" }, doc: JSON.parse(doc) });
  // The l0 flag lives on the imported row, not on the subscription kind.
  await applyEffect(env.DB, sub.id, id, tr.effect, new Date().toISOString(), { l0: opts.l0 });
  return { sub: sub.id, id };
}

async function stub(cookie: string, body: Record<string, unknown>) {
  const res = await SELF.fetch(`${BASE}/api/items`, {
    method: "POST",
    headers: { cookie, "content-type": "application/json" },
    body: JSON.stringify({ mode: "response", source: { subscription_id: body.subscription_id, remote_id: body.remote_id }, selection: body.selection }),
  });
  return { status: res.status, json: (await res.json()) as any };
}

/** Read the working copy created by the response recipe. */
async function draftMd(cookie: string, id: string): Promise<string> {
  const res = await apiJson(cookie, "GET", `/api/items/${id}`);
  expect(res.status).toBe(200);
  return res.json.content_md;
}

describe("select-to-quote produces a draft that publishes", () => {
  it("round trip: a highlighted passage becomes a partial transclusion on the wire", async () => {
    const cookie = await login();
    await apiJson(cookie, "PATCH", "/api/settings", { site_url: "https://ours.example/blyg/" });
    const { sub, id } = await importItem({ md: LONG_BODY });

    // What a browser hands back from Selection.toString() for a highlight
    // inside one paragraph.
    const created = await stub(cookie, {
      subscription_id: sub,
      remote_id: id,
      selection: "The trail is left by walking, and the walking is changed by the trail",
    });
    expect(created.status).toBe(201);

    const md = await draftMd(cookie, created.json.id);
    // The partial grammar: directive, then the quote on the very next line.
    expect(md).toBe(
      `![[${id}]]\n> The trail is left by walking, and the walking is changed by the trail\n\n`,
    );

    // And it publishes — the point of the whole test.
    await apiJson(cookie, "PATCH", `/api/items/${created.json.id}`, { content_md: `${md}I want to disagree.` });
    expect((await apiJson(cookie, "POST", `/api/items/${created.json.id}/publish`, {})).status).toBe(200);

    const doc = await (await getPublic(`/blyg/items/${created.json.id}.json`)).json<any>();
    expect(doc.content_html).toContain("blyg-partial");
    expect(doc.transclusions[0]).toMatchObject({
      id,
      version: 1,
      origin: ORIGIN,
      selector: { exact: "The trail is left by walking, and the walking is changed by the trail" },
    });
    // The rest of their item is not in our document.
    expect(doc.content_html).not.toContain("Everything else in the literature");
  });

  it("normalizes the browser's line breaks so a multi-block highlight still matches", async () => {
    const cookie = await login();
    const { sub, id } = await importItem({
      md: "ignored",
      html: "<p>First paragraph here.</p><p>Second paragraph here.</p><p>Third.</p>",
    });
    // Selection.toString() puts a newline at each block boundary; a highlight
    // dragged across two paragraphs arrives with ragged whitespace.
    const created = await stub(cookie, {
      subscription_id: sub,
      remote_id: id,
      selection: "  First paragraph here.\n\n   Second paragraph here.  ",
    });
    expect(created.status).toBe(201);
    const md = await draftMd(cookie, created.json.id);
    expect(md).toBe(`![[${id}]]\n> First paragraph here.\n>\n> Second paragraph here.\n\n`);

    await apiJson(cookie, "POST", `/api/items/${created.json.id}/publish`, {});
    const doc = await (await getPublic(`/blyg/items/${created.json.id}.json`)).json<any>();
    expect(doc.transclusions[0].selector.exact).toBe("First paragraph here.\nSecond paragraph here.");
  });

  it("refuses a passage the held snapshot does not contain, at selection time", async () => {
    const cookie = await login();
    const { sub, id } = await importItem({ md: LONG_BODY });
    const res = await stub(cookie, {
      subscription_id: sub,
      remote_id: id,
      selection: "a sentence they never wrote",
    });
    // Refused now, rather than prefilled and rejected at publish after the
    // author has written a response around it.
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.json)).toContain("not in the version we hold");
  });

  it("refuses a selection that welds two of their blocks together", async () => {
    const cookie = await login();
    const { sub, id } = await importItem({
      md: "ignored",
      html: "<p>Alpha line.</p><p>Beta line.</p>",
    });
    const res = await stub(cookie, {
      subscription_id: sub,
      remote_id: id,
      selection: "Alpha line. Beta line.",
    });
    expect(res.status).toBe(400);
  });
});

describe("the stub prefill adapts to the target's length", () => {
  it("a long target gets the directive plus an empty quote line", async () => {
    const cookie = await login();
    const { sub, id } = await importItem({ md: LONG_BODY.repeat(3) });
    const created = await stub(cookie, { subscription_id: sub, remote_id: id });
    expect(created.status).toBe(201);
    expect(await draftMd(cookie, created.json.id)).toBe(`![[${id}]]\n> \n\n`);
  });

  it("a short target is unchanged — the whole item, as before", async () => {
    const cookie = await login();
    const { sub, id } = await importItem({ md: "A short thought." });
    const created = await stub(cookie, { subscription_id: sub, remote_id: id });
    expect(await draftMd(cookie, created.json.id)).toBe(`![[${id}]]\n\n`);
  });

  it("the empty quote line is a suggestion: deleting it publishes the whole form", async () => {
    const cookie = await login();
    const { sub, id } = await importItem({ md: LONG_BODY.repeat(3) });
    const created = await stub(cookie, { subscription_id: sub, remote_id: id });
    await apiJson(cookie, "PATCH", `/api/items/${created.json.id}`, { content_md: `![[${id}]]\n\nAll of it, then.` });
    expect((await apiJson(cookie, "POST", `/api/items/${created.json.id}/publish`, {})).status).toBe(200);
    const doc = await (await getPublic(`/blyg/items/${created.json.id}.json`)).json<any>();
    expect(doc.content_html).not.toContain("blyg-partial");
    expect(doc.transclusions[0].selector).toBeUndefined();
  });

  it("an empty quote line left in place is refused rather than published as nothing", async () => {
    const cookie = await login();
    const { sub, id } = await importItem({ md: LONG_BODY.repeat(3) });
    const created = await stub(cookie, { subscription_id: sub, remote_id: id });
    // Publishing the prefill untouched: the author was invited to type a
    // passage and did not. That must not quietly become a whole transclusion,
    // or an empty quote, or a blockquote of nothing.
    const res = await apiJson(cookie, "POST", `/api/items/${created.json.id}/publish`, {});
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.json)).toContain("empty");
  });
});
