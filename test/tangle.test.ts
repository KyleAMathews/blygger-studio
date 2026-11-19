// Tangling (blygger-spec docs/tangling-plan.md §1–2, acceptance §4.3;
// decisions #78, #100): `![[+ text]]` spans in a thread publish as new items.
//
// What matters: nothing is minted until the caller confirms the count, and
// nothing is minted when any part or the thread would fail; the parts are
// threads, published before the thread; the thread's source holds a labelled
// directive per span with a blank line after it; a tangle that stopped after
// minting is finished by publishing again, never minted twice; the grammar is
// inert where every bracket form is.
import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { parseTangles, placeholderBody, rewriteTangles, tangleLabel, TANGLE_MAX, withoutTangleMarkers } from "../src/tangle.ts";
import { getItem } from "../src/model.ts";
import { apiJson, createAndPublish, getPublic, login } from "./helpers.ts";

const db = () => env.DB;
const getJson = async (path: string) => {
  const res = await getPublic(path);
  expect(res.status).toBe(200);
  return res.json() as Promise<Record<string, unknown> & { links?: unknown; transclusions?: unknown }>;
};
const ID = "0123456789abcdefghjkmnpqrs";

describe("the span grammar", () => {
  it("a span opens a line, closes a line, and may run over paragraphs", () => {
    const md = "Before.\n\n![[+ First line\n\nsecond paragraph]]\nAfter.";
    const { spans, issues } = parseTangles(md);
    expect(issues).toEqual([]);
    expect(spans).toHaveLength(1);
    expect(spans[0].text).toBe("First line\n\nsecond paragraph");
    expect(md.slice(spans[0].start, spans[0].end)).toBe("![[+ First line\n\nsecond paragraph]]");
  });

  it("links and directives inside a span do not close it", () => {
    const md = `![[+ See [[${ID}]] and [[${ID} | a label]].\n![[${ID}]]\nmore]]`;
    const { spans, issues } = parseTangles(md);
    expect(issues).toEqual([]);
    expect(spans[0].text).toBe(`See [[${ID}]] and [[${ID} | a label]].\n![[${ID}]]\nmore`);
  });

  it("is inert in code, in TK scopes and in comments", () => {
    for (const md of ["`![[+ x]]`", "```\n![[+ x]]\n```", "    ![[+ x]]", "[TK]write ![[+ x]][=]out[/TK]", "/* ![[+ x]] */"]) {
      expect(parseTangles(md)).toEqual({ spans: [], issues: [] });
    }
  });

  it("an inline [[+ text]] is a placeholder, linked, with the line it sits in", () => {
    const md = "A sentence with [[+ some idea]] in it.";
    const { spans, issues } = parseTangles(md);
    expect(issues).toEqual([]);
    expect(spans).toEqual([{ kind: "link", start: 16, end: 31, text: "some idea", context: "A sentence with some idea in it." }]);
    const ids = ["c".repeat(26)];
    expect(rewriteTangles(md, spans, ids)).toBe(`A sentence with [[${ids[0]} | some idea]] in it.`);
    expect(withoutTangleMarkers(md)).toBe("A sentence with some idea in it.");
    expect(placeholderBody(spans[0], "t".repeat(26))).toBe(`# some idea\n\n/* placeholder from [[${"t".repeat(26)}]]: A sentence with some idea in it. */\n`);
  });

  it("placeholders and spans share source order and the cap", () => {
    const { spans } = parseTangles("Intro [[+ first]].\n\n![[+ a passage]]\n\nThen [[+ second]].");
    expect(spans.map((s) => [s.kind, s.text])).toEqual([["link", "first"], ["quote", "a passage"], ["link", "second"]]);
    const eleven = Array.from({ length: TANGLE_MAX + 1 }, (_, i) => `[[+ idea ${i}]]`).join(" ");
    expect(parseTangles(eleven).issues.map((i) => i.reason)).toEqual([`one publish can make at most ${TANGLE_MAX} new items; this has ${TANGLE_MAX + 1}`]);
  });

  it("a placeholder is inert in code and comments, refused empty or inside a span", () => {
    expect(parseTangles("`[[+ x]]` and /* [[+ y]] */")).toEqual({ spans: [], issues: [] });
    expect(parseTangles("a [[+   ]] b").issues.map((i) => i.reason)).toEqual(["this [[+ …]] placeholder is empty"]);
    expect(parseTangles("![[+ passage with [[+ idea]] inside]]").issues[0].reason).toMatch(/cannot sit inside/);
  });

  it("refuses what cannot publish, and says why", () => {
    const reasons = (md: string) => parseTangles(md).issues.map((i) => i.reason);
    expect(reasons("![[+ never closed")).toEqual(["this new-item span has no closing ]]"]);
    expect(reasons("![[+ closes ]] mid-line")).toEqual(["a new-item span's closing ]] must end its line"]);
    expect(reasons("text ![[+ inline]]")).toEqual(["a new-item span must start its own line"]);
    expect(reasons("![[+ outer\n![[+ inner]]\n]]")[0]).toMatch(/cannot contain another/);
    expect(reasons("![[+   ]]")).toEqual(["this new-item span is empty"]);
    expect(reasons("![[+ a [TK]x[=]y[/TK] b]]")[0]).toMatch(/TK scope/);
    expect(reasons("![[+ ![a](https://example.com/blyg/media/0123456789abcdefghjkmnpqrs/ab.png)]]")[0]).toMatch(/attached image/);
    const eleven = Array.from({ length: TANGLE_MAX + 1 }, (_, i) => `![[+ part ${i}]]`).join("\n\n");
    expect(reasons(eleven)).toEqual([`one publish can make at most ${TANGLE_MAX} new items; this has ${TANGLE_MAX + 1}`]);
  });

  it("labels with the first eight words, links as their labels", () => {
    expect(tangleLabel("Stigmergy is the mechanism by which a protocol becomes invisible")).toBe("Stigmergy is the mechanism by which a protocol…");
    expect(tangleLabel(`A short [[${ID} | linked]] one`)).toBe("A short linked one");
  });

  it("rewrites each span as a labelled directive with a blank line after it", () => {
    const md = "Intro.\n![[+ One two]]\n> my own quote, after\n\n![[+ Three]]";
    const { spans } = parseTangles(md);
    const ids = ["a".repeat(26), "b".repeat(26)];
    expect(rewriteTangles(md, spans, ids)).toBe(`Intro.\n![[${ids[0]} | One two]]\n\n> my own quote, after\n\n![[${ids[1]} | Three]]\n`);
    expect(withoutTangleMarkers(md)).toBe("Intro.\nOne two\n> my own quote, after\n\nThree");
  });
});

async function thread(cookie: string, md: string): Promise<string> {
  const res = await apiJson(cookie, "POST", "/blyg/api/items", { contentMd: md, kind: "thread" });
  expect(res.status).toBe(201);
  return res.json.id as string;
}
const publish = (cookie: string, id: string, body: Record<string, unknown> = {}) => apiJson(cookie, "POST", `/blyg/api/items/${id}/publish`, body);
const itemCount = async () => (await db().prepare("SELECT COUNT(*) AS n FROM items").first<{ n: number }>())!.n;

describe("publishing a tangled thread", () => {
  it("asks for the count, then publishes three parts and the thread last", async () => {
    const cookie = await login();
    const md = "Opening words.\n\n![[+ The first part, about stigmergy and protocols in general.]]\n\n![[+ The second part]]\nMiddle words.\n![[+ The third part]]\n";
    const id = await thread(cookie, md);
    const before = await itemCount();

    const asked = await publish(cookie, id);
    expect(asked.status).toBe(409);
    expect(asked.json.code).toBe("tangle-confirmation-required");
    expect(asked.json.details.count).toBe(3);
    expect(asked.json.details.parts).toEqual(["The first part, about stigmergy and protocols in…", "The second part", "The third part"]);
    expect(await itemCount()).toBe(before);
    expect((await getItem(db(), id))!.content_md).toBe(md);

    const done = await publish(cookie, id, { tangle: true });
    expect(done.status).toBe(200);
    const parts = done.json.parts as { id: string; version: number }[];
    expect(parts).toHaveLength(3);
    expect(await itemCount()).toBe(before + 3);
    for (const part of parts) {
      const row = (await getItem(db(), part.id))!;
      expect([row.kind, row.status, row.version, row.tangled_from]).toEqual(["thread", "public", 1, id]);
    }
    const source = (await getItem(db(), id))!.content_md;
    expect(source).toBe(
      `Opening words.\n\n![[${parts[0].id} | The first part, about stigmergy and protocols in…]]\n\n![[${parts[1].id} | The second part]]\n\nMiddle words.\n![[${parts[2].id} | The third part]]\n`,
    );
    const published = await db().prepare("SELECT content_md, transclusions, published_at FROM versions WHERE item_id = ? AND version = 1").bind(id).first<{ content_md: string; transclusions: string; published_at: string }>();
    expect(published!.content_md).toBe(source);
    expect((JSON.parse(published!.transclusions) as { id: string }[]).map((t) => t.id)).toEqual(parts.map((p) => p.id));
    // The thread is published last: no part is newer than it (§7).
    const { results } = await db().prepare("SELECT published_at FROM versions WHERE item_id IN (SELECT value FROM json_each(?))").bind(JSON.stringify(parts.map((p) => p.id))).all<{ published_at: string }>();
    for (const row of results) expect(row.published_at <= published!.published_at).toBe(true);
  });

  it("mints nothing when the thread or a span would fail", async () => {
    const cookie = await login();
    const before = await itemCount();
    const elsewhere = await thread(cookie, `![[+ A fine part]]\n\n![[${ID}]]\n`);
    const a = await publish(cookie, elsewhere, { tangle: true });
    expect(a.status).toBe(400);
    expect(a.json.message).toBe("one or more references do not resolve");
    const inside = await thread(cookie, `![[+ A part that quotes\n![[${ID}]]\n]]\n`);
    const b = await publish(cookie, inside, { tangle: true });
    expect(b.status).toBe(400);
    expect(b.json.message).toBe("new item 1 (A part that quotes): one or more references do not resolve");
    expect(await itemCount()).toBe(before + 2);
  });

  it("a part may quote, and may be long", async () => {
    const cookie = await login();
    const quoted = await createAndPublish(cookie, "A fragment to quote.");
    const long = "word ".repeat(600).trim();
    const id = await thread(cookie, `![[+ My commentary.\n![[${quoted}]]\n]]\n\n![[+ ${long}]]\n`);
    const done = await publish(cookie, id, { tangle: true });
    expect(done.status).toBe(200);
    const [first, second] = done.json.parts as { id: string }[];
    const quotes = await db().prepare("SELECT transclusions FROM versions WHERE item_id = ? AND version = 1").bind(first.id).first<{ transclusions: string }>();
    expect((JSON.parse(quotes!.transclusions) as { id: string }[]).map((t) => t.id)).toEqual([quoted]);
    expect((await getItem(db(), second.id))!.content_md).toHaveLength(long.length);
    const html = await db().prepare("SELECT content_html FROM versions WHERE item_id = ? AND version = 1").bind(id).first<{ content_html: string }>();
    expect(html!.content_html).toContain(`data-blyg-id="${quoted}"`);
  });

  it("a tangle that stopped after minting finishes on the next publish, minting nothing twice", async () => {
    const cookie = await login();
    const id = await thread(cookie, "placeholder");
    const part = "p".repeat(25) + "q";
    const row = (await getItem(db(), id))!;
    // The state the batch leaves (§2.3 step 1), with no part published yet.
    await db().batch([
      db().prepare("INSERT INTO items (id, kind, status, created, updated, version, content_md, dirty, tangled_from) VALUES (?, 'thread', 'draft', ?, ?, 0, 'The minted part.', 1, ?)").bind(part, row.created, row.created, id),
      db().prepare("UPDATE items SET content_md = ?, revision = revision + 1 WHERE id = ?").bind(`Intro.\n\n![[${part} | The minted part.]]\n`, id),
    ]);
    const before = await itemCount();
    const done = await publish(cookie, id);
    expect(done.status).toBe(200);
    expect(done.json.parts).toEqual([{ id: part, version: 1 }]);
    expect(await itemCount()).toBe(before);
    expect((await getItem(db(), part))!.status).toBe("public");
  });

  it("a fragment draft is told to become a thread", async () => {
    const cookie = await login();
    const created = await apiJson(cookie, "POST", "/blyg/api/items", { contentMd: "![[+ a span]]" });
    const res = await publish(cookie, created.json.id, { tangle: true });
    expect(res.status).toBe(400);
    expect(res.json.message).toBe("tangling makes a thread; switch this draft to a thread");
  });

  it("a placeholder publishes a linked thread with its text as a heading, and the wire lists the link", async () => {
    const cookie = await login();
    const id = await thread(cookie, "Before. We need [[+ a theory of hoppers]] someday.\n");
    const asked = await publish(cookie, id);
    expect(asked.json.details.parts).toEqual(["a theory of hoppers (linked)"]);
    const done = await publish(cookie, id, { tangle: true });
    expect(done.status).toBe(200);
    const [part] = done.json.parts as { id: string }[];
    const row = (await getItem(db(), part.id))!;
    expect(row.kind).toBe("thread");
    expect(row.content_md).toBe(`# a theory of hoppers\n\n/* placeholder from [[${id}]]: Before. We need a theory of hoppers someday. */\n`);
    // The comment is the author's note: the published text is the heading alone.
    const partVersion = await db().prepare("SELECT content_md FROM versions WHERE item_id = ? AND version = 1").bind(part.id).first<{ content_md: string }>();
    expect(partVersion!.content_md).toBe("# a theory of hoppers\n");
    expect((await getItem(db(), id))!.content_md).toBe(`Before. We need [[${part.id} | a theory of hoppers]] someday.\n`);
    const doc = await getJson(`/blyg/items/${id}.json`);
    expect(doc.links).toEqual([{ id: part.id }]);
    expect(doc.transclusions).toEqual([]);
  });

  it("in our own Reading, a placeholder folds under its thread and a chapter a contents thread links does not", async () => {
    const cookie = await login();
    const chapter = await createAndPublish(cookie, `Chapter ${Date.now()}: words.`);
    const id = await thread(cookie, `- [[${chapter} | The chapter]]\n- [[+ a chapter to write]]\n`);
    const done = await publish(cookie, id, { tangle: true });
    const [placeholder] = done.json.parts as { id: string }[];
    const reasons = async (item: string) => JSON.parse((await db().prepare("SELECT bg_reasons FROM items WHERE id = ?").bind(item).first<{ bg_reasons: string | null }>())!.bg_reasons ?? "[]");
    expect(await reasons(placeholder.id)).toContain("burst");
    expect(await reasons(chapter)).not.toContain("burst");
  });

  it("links[] lists resolved links in order, skips code, and is absent without links", async () => {
    const cookie = await login();
    const a = await createAndPublish(cookie, "Target A.");
    const b = await createAndPublish(cookie, "Target B.");
    const linking = await createAndPublish(cookie, `See [[${b}]], then [[${a} | the first]], and \`[[${a}]]\` in code, and [[${b}]] again.`);
    expect((await getJson(`/blyg/items/${linking}.json`)).links).toEqual([{ id: b }, { id: a }, { id: b }]);
    expect((await getJson(`/blyg/items/${a}.json`)).links).toBeUndefined();
  });

  it("eleven spans are refused, and spans in code publish as text", async () => {
    const cookie = await login();
    const eleven = await thread(cookie, Array.from({ length: 11 }, (_, i) => `![[+ part ${i}]]`).join("\n\n"));
    expect((await publish(cookie, eleven, { tangle: true })).status).toBe(400);
    const coded = await thread(cookie, "```\n![[+ an example]]\n```\n");
    const res = await publish(cookie, coded);
    expect(res.status).toBe(200);
    expect(res.json.parts).toBeUndefined();
  });

  it("a later version that drops a part's directive publishes and names the part, which stays published (plan §2.4)", async () => {
    const cookie = await login();
    const id = await thread(cookie, `Intro.\n\n![[+ The part that goes away.]]\n\n![[+ The part that stays.]]\n`);
    const first = await publish(cookie, id, { tangle: true });
    expect(first.status).toBe(200);
    expect(first.json.warning).toBeUndefined();
    const [gone, kept] = first.json.parts as { id: string }[];
    await db().prepare("UPDATE items SET content_md = ?, revision = revision + 1, dirty = 1 WHERE id = ?").bind(`Intro.\n\n![[${kept.id} | The part that stays.]]\n`, id).run();
    const second = await publish(cookie, id);
    expect(second.status).toBe(200);
    expect(second.json.warning).toBe('This version no longer quotes or links a part it made: "The part that goes away.". It stays published on its own; withdraw from its page if it should go.');
    expect((await getItem(db(), gone.id))!.status).toBe("public");
    // The next publish says nothing: the part was named once, when it was dropped.
    await db().prepare("UPDATE items SET content_md = ?, revision = revision + 1, dirty = 1 WHERE id = ?").bind(`Intro, edited.\n\n![[${kept.id} | The part that stays.]]\n`, id).run();
    expect((await publish(cookie, id)).json.warning).toBeUndefined();
  });
});
