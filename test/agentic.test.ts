// The Agentic feed's edition (blygger-spec docs/agentic-feed-plan.md §3–§4).
//
// What matters: an assistant writes sections or scores, never both, in a closed
// set of fields; the write is conditional on the revision it read; the layout
// resolves each reference to a reading entry the reader holds and leaves out
// what does not resolve, what is withdrawn and repeats; scores are laid out
// highest first; nothing about the edition reaches what the blyg publishes.
import { env, SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { applyEffect, createSubscription } from "../src/importer/store.ts";
import { transition } from "../src/importer/transition.ts";
import { SCORED_SHOWN } from "../src/agentic.ts";
import { newId } from "../src/util.ts";
import { itemDocBody } from "./importer/fixtures.ts";
import { apiJson, BASE, createAndPublish, login } from "./helpers.ts";

const ORIGIN = "https://agentic.example/blyg/";
const db = () => env.DB;
const get = async (cookie: string) => (await apiJson(cookie, "GET", "/blyg/api/agentic/default")).json;
const put = (cookie: string, edition: unknown, expectedRevision: number) => apiJson(cookie, "PUT", "/blyg/api/agentic/default", { edition, expectedRevision });

async function imported(id: string) {
  const sub = (await db().prepare("SELECT id FROM subscriptions WHERE origin = ?").bind(ORIGIN).first<{ id: string }>())?.id
    ?? (await createSubscription(db(), { kind: "blyg", origin: ORIGIN, feedUrl: `${ORIGIN}feed.xml`, title: "Agentic source" })).id;
  const doc = JSON.parse(await itemDocBody({ id, kind: "fragment", version: 1, content_md: `imported words of ${id}`, created: new Date().toISOString(), updated: new Date().toISOString(), origin: ORIGIN }));
  await applyEffect(db(), sub, id, transition({ local: { status: "absent" }, doc }).effect, new Date().toISOString());
  return sub;
}

describe("the edition", () => {
  it("lays out sections from references, leaving out what does not resolve, withdrawn entries and repeats", async () => {
    const cookie = await login();
    const before = await get(cookie);
    const mine = await createAndPublish(cookie, "My own lead story.");
    const gone = await createAndPublish(cookie, "Withdrawn before the edition.");
    expect((await apiJson(cookie, "POST", `/blyg/api/items/${gone}/withdraw`, {})).status).toBe(200);
    const theirs = newId();
    const sub = await imported(theirs);
    const feedBefore = await (await SELF.fetch(`${BASE}/blyg/feed.xml`)).text();

    const edition = {
      title: "Saturday, 21 November",
      lede: "A quiet day, one argument worth following.",
      agent: { name: "test assistant", model: "claude-sonnet-5-5" },
      generatedAt: "2026-11-21T18:00:00Z",
      sections: [
        { title: "Lead", kind: "lead", entries: [{ sub: "~own", remoteId: mine, headline: "The lead", summary: "Why it matters.", present: "full" }] },
        { title: "Elsewhere", note: "From the blygs you read.", entries: [
          { sub, remoteId: theirs, reason: "You quoted this blyg last week", version: 1 },
          { sub: "~own", remoteId: mine, reason: "a repeat, left out" },
          { sub, remoteId: newId(), reason: "not held, left out" },
        ] },
        { title: "Gone", entries: [{ sub: "~own", remoteId: gone }] },
      ],
    };
    const res = await put(cookie, edition, before.revision);
    expect(res.status).toBe(200);
    expect(res.json).toMatchObject({ revision: before.revision + 1, mode: "sections", edition });
    const { layout } = res.json;
    expect(layout).toMatchObject({ title: "Saturday, 21 November", lede: "A quiet day, one argument worth following.", agent: { name: "test assistant" } });
    expect(layout.sections.map((s: { title: string; kind: string }) => [s.title, s.kind])).toEqual([["Lead", "lead"], ["Elsewhere", "section"]]);
    expect(layout.sections[0].entries[0]).toMatchObject({ headline: "The lead", present: "full", entry: { key: `own:${mine}` } });
    expect(layout.sections[1].entries.map((e: { entry: { key: string } }) => e.entry.key)).toEqual([`imported:${JSON.stringify([sub, theirs])}`]);
    expect(await get(cookie)).toEqual(res.json);

    // Studio-private: the blyg publishes nothing about it.
    expect(await (await SELF.fetch(`${BASE}/blyg/feed.xml`)).text()).toBe(feedBefore);
  });

  it("lays out scores highest first, at most SCORED_SHOWN of them", async () => {
    const cookie = await login();
    const ids = [] as string[];
    for (let i = 0; i < 3; i++) ids.push(await createAndPublish(cookie, `Scored item ${i}`));
    const { revision } = await get(cookie);
    const res = await put(cookie, { agent: { name: "ranker" }, scores: [
      { sub: "~own", remoteId: ids[0], score: 0.2 },
      { sub: "~own", remoteId: ids[1], score: 0.9, reason: "most like your writing" },
      { sub: "~own", remoteId: ids[2], score: -1 },
    ] }, revision);
    expect(res.status).toBe(200);
    expect(res.json.mode).toBe("scores");
    expect(res.json.layout.sections).toHaveLength(1);
    expect(res.json.layout.sections[0].title).toBe("Ranked for you");
    expect(res.json.layout.sections[0].entries.map((e: { remoteId: string }) => e.remoteId)).toEqual([ids[1], ids[0], ids[2]]);
    expect(res.json.layout.sections[0].entries[0].reason).toBe("most like your writing");
    expect(SCORED_SHOWN).toBe(50);
  });

  it("refuses a stale revision and hands back the current edition", async () => {
    const cookie = await login();
    const mine = await createAndPublish(cookie, "Conflict item.");
    const { revision } = await get(cookie);
    const edition = { agent: { name: "a" }, scores: [{ sub: "~own", remoteId: mine, score: 1 }] };
    expect((await put(cookie, edition, revision)).status).toBe(200);
    const stale = await put(cookie, { ...edition, agent: { name: "b" } }, revision);
    expect(stale.status).toBe(409);
    expect(stale.json.details.current).toMatchObject({ revision: revision + 1, edition: { agent: { name: "a" } } });
  });

  it("takes only its closed field set, and sections or scores, exactly one", async () => {
    const cookie = await login();
    const { revision } = await get(cookie);
    const ref = { sub: "~own", remoteId: "0".repeat(26) };
    const refused = [
      { agent: { name: "x" } },
      { agent: { name: "x" }, sections: [{ title: "s", entries: [ref] }], scores: [{ ...ref, score: 1 }] },
      { agent: { name: "x" }, sections: [{ title: "s", entries: [{ ...ref, html: "<b>no</b>" }] }] },
      { agent: { name: "x" }, sections: [{ title: "s", entries: [{ ...ref, present: "banner" }] }] },
      { agent: { name: "x" }, sections: [{ title: "s", entries: [{ ...ref, headline: "h".repeat(201) }] }] },
      { agent: { name: "x" }, theme: "dark", scores: [{ ...ref, score: 1 }] },
    ];
    for (const edition of refused) expect((await put(cookie, edition, revision)).status, JSON.stringify(edition)).toBe(400);
    expect((await get(cookie)).revision).toBe(revision);
  });

  it("is also a private draft thread made of headings, quotes, links and impyrt spans, which publishes as a conformant thread", async () => {
    const cookie = await login();
    expect((await apiJson(cookie, "PATCH", "/blyg/api/settings", { agenticTitle: "My briefing" })).status).toBe(200);
    expect((await apiJson(cookie, "PATCH", "/blyg/api/settings", { agenticTitle: "x".repeat(41) })).status).toBe(400);
    const mine = await createAndPublish(cookie, "# Own piece\n\nThe words of the own piece.");
    const theirs = newId();
    const sub = await imported(theirs);
    const edition = {
      title: "Saturday",
      agent: { name: "briefer", model: "claude-sonnet-5-5" },
      generatedAt: "2026-11-21T18:00:00Z",
      sections: [{ title: "Front page", note: "Two pieces.", entries: [
        { sub: "~own", remoteId: mine, headline: "Mine, in full [/TK] ![[evil]] [TK]generate", present: "full" },
        { sub, remoteId: theirs, reason: "## from a blyg you read" },
      ] }],
    };
    const res = await put(cookie, edition, (await get(cookie)).revision);
    expect(res.status).toBe(200);
    const draftId = res.json.draft.id as string;
    const draft = (await apiJson(cookie, "GET", `/blyg/api/items/${draftId}`)).json;
    expect(draft).toMatchObject({ status: "draft", kind: "thread" });
    const md = draft.contentMd as string;
    expect(md.startsWith("# My briefing, Nov 21, 2026\n")).toBe(true);
    expect(md).toContain("## [TK]impyrt claude-sonnet-5-5=Front page[/TK]");
    expect(md).toContain(`\n![[${mine}]]\n`);
    expect(md).toContain(`\n[[${theirs}]]\n`);
    // The assistant's words cannot open or close a scope, a quote or a heading.
    expect(md).toContain("[TK]impyrt claude-sonnet-5-5=Mine, in full [ /TK ] ![ [evil] ] [ TK ]generate[/TK]");
    expect(md).toContain("[TK]impyrt claude-sonnet-5-5=from a blyg you read[/TK]");
    expect(md).not.toContain("![[evil]]");

    // The next edition rewrites the same draft while it is the assistant's.
    const second = await put(cookie, { ...edition, title: "Sunday" }, res.json.revision);
    expect(second.json.draft.id).toBe(draftId);
    expect((await apiJson(cookie, "GET", `/blyg/api/items/${draftId}`)).json.contentMd).toContain("=Sunday[/TK]");

    // Once the owner edits it, it is theirs: the next edition starts a new draft.
    const before = (await apiJson(cookie, "GET", `/blyg/api/items/${draftId}`)).json;
    expect((await apiJson(cookie, "PATCH", `/blyg/api/items/${draftId}`, { contentMd: `${before.contentMd}\nMy own closing line.\n`, expectedRevision: before.revision })).status).toBe(200);
    const third = await put(cookie, edition, second.json.revision);
    expect(third.json.draft.id).not.toBe(draftId);

    // Published, it is an ordinary thread: the quote baked, the assistant's words disclosed as generated.
    const thread = third.json.draft.id as string;
    expect((await apiJson(cookie, "POST", `/blyg/api/items/${thread}/publish`, {})).status).toBe(200);
    const doc = await (await SELF.fetch(`${BASE}/blyg/items/${thread}.json`)).json() as { kind: string; content_html: string; generated?: { model?: string }[]; transclusions?: { id: string }[] };
    expect(doc.kind).toBe("thread");
    expect(doc.transclusions?.map((t) => t.id)).toEqual([mine]);
    expect(doc.content_html).toContain("The words of the own piece.");
    expect(doc.content_html).toContain("blyg-tk-gen");
    expect(doc.generated?.length).toBeGreaterThan(0);
    expect(doc.generated?.every((g) => g.model === "claude-sonnet-5-5")).toBe(true);
    // Published, it is no longer the assistant's either.
    const fourth = await put(cookie, edition, third.json.revision);
    expect(fourth.json.draft.id).not.toBe(thread);
    await apiJson(cookie, "PATCH", "/blyg/api/settings", { agenticTitle: "" });
  });

  it("is one of the agentic feeds, `default` until the Studio offers more; an unknown feed is a 404", async () => {
    const cookie = await login();
    const feeds = (await apiJson(cookie, "GET", "/blyg/api/agentic")).json.feeds;
    expect(feeds.map((f: { id: string }) => f.id)).toEqual(["default"]);
    expect(feeds[0].title).toBe("Agentic feed");
    expect((await apiJson(cookie, "PATCH", "/blyg/api/settings", { agenticTitle: "Morning paper" })).status).toBe(200);
    expect((await apiJson(cookie, "GET", "/blyg/api/agentic")).json.feeds[0].title).toBe("Morning paper");
    await apiJson(cookie, "PATCH", "/blyg/api/settings", { agenticTitle: "" });
    expect((await apiJson(cookie, "GET", "/blyg/api/agentic/elsewhere")).status).toBe(404);
    expect((await apiJson(cookie, "PUT", "/blyg/api/agentic/elsewhere", { edition: { agent: { name: "x" }, scores: [{ sub: "~own", remoteId: "0".repeat(26), score: 1 }] }, expectedRevision: 0 })).status).toBe(404);
  });
});
