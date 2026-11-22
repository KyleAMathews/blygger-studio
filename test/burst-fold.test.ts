// Background, reordered for tangling (session 72; blygger-spec
// docs/background-plan.md §7): `burst` (spec §13.7's fold), `wordless` and
// `maintenance`, ahead of the rest of phase 2, so that readers fold a tangle
// before the studio can publish one.
//
// What matters: the parts of a burst leave every lens but Background and the
// thread lists them; a part's later version leaves; an item outside the window,
// or from another blyg, never folds; each rule's toggle moves its items at once.
import { env } from "cloudflare:test";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { putSettings } from "../src/model.ts";
import { applyEffect, createSubscription } from "../src/importer/store.ts";
import { transition, type LocalState } from "../src/importer/transition.ts";
import { isWordless, newlyNamed, versionReasons } from "../src/background.ts";
import { withinBurst, BURST_WINDOW_MS } from "../src/burst.ts";
import { newId } from "../src/util.ts";
import { itemDocBody } from "./importer/fixtures.ts";
import { apiJson, createAndPublish, login } from "./helpers.ts";

const db = () => env.DB;
// Parts published minutes apart are also followed within the superseded
// window (phase 2); this file tests the fold, so that rule is off here.
const ONLY_FOLD = JSON.stringify({ superseded: false });
beforeEach(() => putSettings(db(), { bg_rules: ONLY_FOLD }));
afterEach(() => putSettings(db(), { bg_rules: "{}" }));

const ORIGIN = "https://burst.example/blyg/";
type Entry = { key: string; background: { reasons: string[] }; parts?: { sub: string; id: string; label: string }[] };
async function reading(cookie: string, query: string): Promise<Entry[]> {
  const res = await apiJson(cookie, "GET", `/blyg/api/reading?limit=50&${query}`);
  expect(res.status).toBe(200);
  return res.json.items;
}
const key = (sub: string, id: string) => `imported:${JSON.stringify([sub, id])}`;

async function subscription() {
  return (await createSubscription(db(), { kind: "blyg", origin: ORIGIN, feedUrl: `${ORIGIN}feed.xml`, title: "Burst source" })).id;
}
/** One version of an item, through the importer as a poll would apply it. */
async function arrive(sub: string, opts: { id: string; kind?: "fragment" | "thread"; version?: number; md?: string; created: string; updated?: string; quotes?: { id: string; version: number; origin?: string }[]; links?: { id: string; origin?: string }[] }, observedAt = new Date().toISOString()) {
  const doc = JSON.parse(await itemDocBody({ id: opts.id, kind: opts.kind ?? "fragment", version: opts.version ?? 1, content_md: opts.md ?? `words of ${opts.id}`, created: opts.created, updated: opts.updated ?? opts.created, origin: ORIGIN }));
  if (opts.quotes) doc.transclusions = opts.quotes;
  if (opts.links) doc.links = opts.links;
  const held = await db().prepare("SELECT version, state FROM imported_items WHERE subscription_id = ? AND remote_id = ?").bind(sub, opts.id).first<{ version: number; state: string }>();
  const local: LocalState = held ? { status: held.state === "tombstone" ? "tombstone" : "current", version: held.version } : { status: "absent" };
  const tr = transition({ local, doc });
  await applyEffect(db(), sub, opts.id, tr.effect, observedAt);
}
const at = (minutesAgo: number) => new Date(Date.now() - minutesAgo * 60_000).toISOString();

describe("the measured tests", () => {
  it("wordless is §15.4's test: directives, attached selections, labels and whitespace stripped", () => {
    const id = "0".repeat(26);
    expect(isWordless(`![[${id}]]\n\n![[${id} | a label]]\n`)).toBe(true);
    expect(isWordless(`![[${id}]]\n> a chosen passage\nlazily continued\n\n`)).toBe(true);
    expect(isWordless(`![[${id}]]\n\nA sentence of my own.`)).toBe(false);
    expect(isWordless(`![[${id}]]\n\n> my own quotation, detached by the blank line`)).toBe(false);
  });

  it("maintenance needs the same text and the same quotes", () => {
    const quotes = JSON.stringify([{ id: "a", version: 1 }]);
    expect(versionReasons({ hash: "h", quotes, contentMd: "x" }, { hash: "h", quotes })).toEqual(["maintenance"]);
    // Quotes refreshed: the same hash, but a quote moved. Not maintenance (phase 2's own rule).
    expect(versionReasons({ hash: "h", quotes: JSON.stringify([{ id: "a", version: 2 }]), contentMd: "x" }, { hash: "h", quotes })).toEqual(["quotes-refreshed"]);
    expect(versionReasons({ hash: "h2", quotes, contentMd: "x" }, { hash: "h", quotes })).toEqual([]);
    expect(versionReasons({ hash: "h", quotes, contentMd: "x" }, null)).toEqual([]);
  });

  it("a thread names its own blyg's items only, and only the first time", () => {
    const quotes = JSON.stringify([{ id: "a", version: 1 }, { id: "b", version: 1, origin: ORIGIN }, { id: "c", version: 1, origin: "https://other.example/" }]);
    expect(newlyNamed(quotes, null, ORIGIN)).toEqual(["a", "b"]);
    expect(newlyNamed(quotes, JSON.stringify([{ id: "a", version: 1 }]), ORIGIN)).toEqual(["b"]);
  });

  it("the window is the one the public order uses", () => {
    expect(withinBurst(0, BURST_WINDOW_MS)).toBe(true);
    expect(withinBurst(0, BURST_WINDOW_MS + 1)).toBe(false);
    expect(withinBurst(10, 0)).toBe(false);
  });
});

describe("a burst from a blyg you read", () => {
  it("folds the parts into Background and lists them on the thread", async () => {
    const cookie = await login();
    const sub = await subscription();
    const [p1, p2, late, thread] = [newId(), newId(), newId(), newId()];
    await arrive(sub, { id: p1, created: at(3) });
    await arrive(sub, { id: p2, created: at(2) });
    await arrive(sub, { id: late, created: at(90) }); // named too, but published long before
    await arrive(sub, { id: thread, kind: "thread", created: at(60), updated: at(1), md: `# The whole\n\n![[${p1}]]\n\n![[${p2}]]\n\n![[${late}]]\n`, quotes: [{ id: p1, version: 1 }, { id: p2, version: 1 }, { id: late, version: 1 }] });

    const main = await reading(cookie, `sub=${sub}`);
    expect(main.map((e) => e.key).sort()).toEqual([key(sub, late), key(sub, thread)].sort());
    const entry = main.find((e) => e.key === key(sub, thread))!;
    expect(entry.parts?.map((p) => p.id)).toEqual([p1, p2]);
    expect(entry.parts?.[0]).toMatchObject({ sub, label: expect.stringContaining(`words of ${p1}`) });
    const background = await reading(cookie, `sub=${sub}&background=true`);
    expect(background.map((e) => e.key).sort()).toEqual([key(sub, p1), key(sub, p2)].sort());
    expect(background[0].background.reasons).toEqual(["burst"]);

    // Turning the rule off brings them back at once, and the thread stops listing them.
    expect((await apiJson(cookie, "PATCH", "/blyg/api/settings", { backgroundRules: { burst: false, wordless: true, maintenance: true, minor: true } })).status).toBe(200);
    const off = await reading(cookie, `sub=${sub}`);
    expect(off.map((e) => e.key)).toEqual(expect.arrayContaining([key(sub, p1), key(sub, p2)]));
    expect(off.find((e) => e.key === key(sub, thread))!.parts).toBeUndefined();
    await putSettings(db(), { bg_rules: ONLY_FOLD });

    // A part's later version is a normal update: it leaves Background.
    await arrive(sub, { id: p1, version: 2, created: at(3), updated: at(0), md: "rewritten with more words" });
    expect((await reading(cookie, `sub=${sub}`)).map((e) => e.key)).toContain(key(sub, p1));
    expect((await reading(cookie, `sub=${sub}`)).find((e) => e.key === key(sub, thread))!.parts?.map((p) => p.id)).toEqual([p2]);
  });

  it("folds the placeholders a thread links, as it folds the parts it quotes", async () => {
    const cookie = await login();
    const sub = await subscription();
    const [idea, quoted, thread] = [newId(), newId(), newId()];
    await arrive(sub, { id: idea, kind: "thread", created: at(2), md: "# an idea for later" });
    await arrive(sub, { id: quoted, created: at(2) });
    await arrive(sub, { id: thread, kind: "thread", created: at(30), updated: at(1), md: `We need [[${idea} | an idea for later]].\n\n![[${quoted}]]\n`, quotes: [{ id: quoted, version: 1 }], links: [{ id: idea }] });
    const main = await reading(cookie, `sub=${sub}`);
    expect(main.map((e) => e.key)).toEqual([key(sub, thread)]);
    expect(main[0].parts?.map((p) => p.id).sort()).toEqual([idea, quoted].sort());
    const background = await reading(cookie, `sub=${sub}&background=true`);
    expect(background.map((e) => e.key).sort()).toEqual([key(sub, idea), key(sub, quoted)].sort());
  });

  it("does not fold an item a thread links that was published minutes before (a chapter, not a placeholder)", async () => {
    const cookie = await login();
    const sub = await subscription();
    const [chapter, contents] = [newId(), newId()];
    await arrive(sub, { id: chapter, kind: "thread", created: at(10), md: "# Chapter one\n\nWords." });
    await arrive(sub, { id: contents, kind: "thread", created: at(30), updated: at(1), md: `- [[${chapter} | Chapter one]]\n`, links: [{ id: chapter }] });
    expect((await reading(cookie, `sub=${sub}`)).map((e) => e.key).sort()).toEqual([key(sub, chapter), key(sub, contents)].sort());
  });

  it("does not fold a chapter published seconds before its contents page: time is not the test (#112)", async () => {
    const cookie = await login();
    const sub = await subscription();
    const [chapter, contents, late, placeholder] = [newId(), newId(), newId(), newId()];
    await arrive(sub, { id: chapter, kind: "thread", created: at(1.5), md: "# Chapter one\n\nWords." });
    await arrive(sub, { id: contents, kind: "thread", created: at(30), updated: at(1), md: `- [[${chapter} | Chapter one]]\n- [[${late} | Chapter two]]\n- [[${placeholder} | Chapter three]]\n`, links: [{ id: chapter }, { id: late }, { id: placeholder }] });
    // Out of order, after the thread: the same test applies.
    await arrive(sub, { id: late, kind: "thread", created: at(1.5), md: "# Chapter two\n\nMore words." });
    await arrive(sub, { id: placeholder, kind: "thread", created: at(1.5), md: "# Chapter three\n" });
    expect((await reading(cookie, `sub=${sub}`)).map((e) => e.key).sort()).toEqual([key(sub, chapter), key(sub, contents), key(sub, late)].sort());
  });

  it("folds a part that arrives after its thread", async () => {
    const cookie = await login();
    const sub = await subscription();
    const [part, thread] = [newId(), newId()];
    await arrive(sub, { id: thread, kind: "thread", created: at(5), updated: at(1), md: `intro\n\n![[${part}]]\n`, quotes: [{ id: part, version: 1 }] });
    await arrive(sub, { id: part, created: at(2) });
    expect((await reading(cookie, `sub=${sub}&background=true`)).map((e) => e.key)).toEqual([key(sub, part)]);
  });

  it("puts wordless and unchanged versions in Background", async () => {
    const cookie = await login();
    const sub = await subscription();
    const [target, repost, same] = [newId(), newId(), newId()];
    await arrive(sub, { id: target, created: at(600) });
    await arrive(sub, { id: repost, kind: "thread", created: at(5), md: `![[${target}]]\n`, quotes: [{ id: target, version: 1 }] });
    await arrive(sub, { id: same, created: at(300), md: "a steady post" });
    await arrive(sub, { id: same, version: 2, created: at(300), updated: at(1), md: "a steady post" });
    const background = await reading(cookie, `sub=${sub}&background=true`);
    expect(background.find((e) => e.key === key(sub, repost))?.background.reasons).toEqual(["wordless"]);
    expect(background.find((e) => e.key === key(sub, same))?.background.reasons).toEqual(["maintenance"]);
    // The repost is a wordless thread published hours after its target: no burst.
    expect(background.find((e) => e.key === key(sub, target))).toBeUndefined();
  });
});

describe("your own burst", () => {
  it("folds own parts in your own reading feed", async () => {
    const cookie = await login();
    const a = await createAndPublish(cookie, "First own part.");
    const b = await createAndPublish(cookie, "Second own part.");
    const thread = (await apiJson(cookie, "POST", "/blyg/api/items", { kind: "thread", contentMd: `# Own whole\n\n![[${a}]]\n\n![[${b}]]\n` })).json.id as string;
    expect((await apiJson(cookie, "POST", `/blyg/api/items/${thread}/publish`, {})).status).toBe(200);
    const own = await reading(cookie, "sub=own");
    expect(own.map((e) => e.key)).not.toContain(`own:${a}`);
    expect(own.find((e) => e.key === `own:${thread}`)!.parts?.map((p) => p.id)).toEqual([a, b]);
    expect((await reading(cookie, "sub=own&background=true")).map((e) => e.key)).toEqual(expect.arrayContaining([`own:${a}`, `own:${b}`]));
  });
});
