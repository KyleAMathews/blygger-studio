// Link mentions (spec 0.4 §10.3a, §15.4, §15.5; decision #79; ROADMAP row 77):
// a remote `links[]` entry sends a mention, the receiver files it as `link`,
// last in the relation order, and a `link` is a notice: never in a public
// responses list.
import { env } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import type { FetchLike } from "../src/importer/http.ts";
import { putSettings } from "../src/model.ts";
import { receiveMention, relationTo, verifyMention } from "../src/mentions/receive.ts";
import { listOutbound } from "../src/mentions/store.ts";
import { apiJson, createAndPublish, getPublic, login } from "./helpers.ts";

const OURS = "https://example.com/blyg/";
const THEM = "https://linker.example/blyg/";
const R1 = "00000000000000000000000k01";

beforeEach(async () => {
  await env.DB.prepare("DELETE FROM imported_items WHERE subscription_id = 'linker'").run();
  await putSettings(env.DB, { site_url: OURS, site_title: "Our Blyg" });
  await env.DB.prepare("INSERT OR IGNORE INTO subscriptions (id, kind, origin, feed_url, title, created) VALUES ('linker', 'blyg', ?, ?, 'Linker', '2026-10-01T00:00:00Z')").bind(THEM, `${THEM}feed.xml`).run();
});

describe("send: a remote links[] entry is a remote reference", () => {
  it("publishing a link to another blyg's item queues one mention, with no target version; an own link queues none", async () => {
    const cookie = await login();
    await env.DB.prepare(
      `INSERT INTO imported_items (subscription_id, remote_id, kind, state, version, observed_at, content_md, content_html, l0, page)
       VALUES ('linker', ?, 'fragment', 'current', 2, '2026-10-02T00:00:00Z', 'Theirs.', '<p>Theirs.</p>', 0, ?)`,
    ).bind(R1, `f/${R1}/`).run();
    const own = await createAndPublish(cookie, "Our own.");
    const linking = await createAndPublish(cookie, `See [[${R1}]] and [[${own}]].`);
    const doc = await (await getPublic(`/blyg/items/${linking}.json`)).json() as { links: unknown };
    expect(doc.links).toEqual([{ id: R1, origin: THEM }, { id: own }]);
    const queued = (await listOutbound(env.DB)).filter((r) => r.item_id === linking);
    expect(queued.map((r) => [r.target, r.target_version])).toEqual([[`${THEM}f/${R1}/`, null]]);
  });
});

describe("receive: `link`, the fifth relation", () => {
  const TARGET = "target-id";
  const ref = { id: TARGET, version: 1, origin: OURS };

  it("a links[] entry naming our origin and the target is `link`; others are not", () => {
    expect(relationTo({ links: [{ id: TARGET, origin: OURS }] }, OURS, TARGET)).toBe("link");
    expect(relationTo({ links: [{ id: TARGET, origin: "HTTPS://Example.com/blyg/" }] }, OURS, TARGET)).toBe("link");
    expect(relationTo({ links: [{ id: TARGET }] }, OURS, TARGET)).toBeNull();
    expect(relationTo({ links: [{ id: "other", origin: OURS }] }, OURS, TARGET)).toBeNull();
    expect(relationTo({ links: "nonsense" }, OURS, TARGET)).toBeNull();
  });

  it("ranks last: every other relation outranks it", () => {
    const links = [{ id: TARGET, origin: OURS }];
    expect(relationTo({ links, stub_of: ref }, OURS, TARGET)).toBe("stub");
    expect(relationTo({ links, transclusions: [ref] }, OURS, TARGET)).toBe("transclusion");
    expect(relationTo({ links, generated: [{ sources: [ref] }] }, OURS, TARGET)).toBe("source");
  });

  it("verifies end to end, and stays off the public responses list", async () => {
    const cookie = await login();
    const ours = await createAndPublish(cookie, "Our words, linked to.");
    expect((await apiJson(cookie, "PATCH", `/blyg/api/items/${ours}`, { responses: "show" })).status).toBe(200);
    const id = "00000000000000000000000k02";
    const page = `${THEM}f/${id}/`;
    const docUrl = `${THEM}items/${id}.json`;
    const doc = {
      blyg: "0.4", id, kind: "fragment", origin: THEM, page: `f/${id}/`, author: { name: "A Linker" }, version: 1,
      content_md: `See [[${ours}]].`, content_html: "<p>See it.</p>", content_hash: "sha256:x", media: [], links: [{ id: ours, origin: OURS }],
    };
    const bodies: Record<string, string> = {
      [page]: `<html><head><link rel="alternate" type="application/json" href="${docUrl}"></head></html>`,
      [docUrl]: JSON.stringify(doc),
    };
    const net: FetchLike = async (url) => {
      const body = bodies[url];
      return { ok: !!body, status: body ? 200 : 404, url, headers: new Headers(), text: async () => body ?? "" };
    };
    const claim = await receiveMention(env.DB, { source: page, target: `${OURS}f/${ours}/` }, OURS);
    expect(claim.status).toBe(202);
    const result = await verifyMention(env.DB, (claim as { mentionId: string }).mentionId, page, ours, OURS, net);
    expect(result).toMatchObject({ status: "verified", relation: "link" });

    const html = await (await getPublic(`/blyg/f/${ours}/`)).text();
    expect(html).not.toContain("A Linker");
    expect(html).not.toContain('class="responses"');
  });
});
