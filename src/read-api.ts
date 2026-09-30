import { itemResource, versionResource, mediaResource, subscriptionResource, hopperResource, importedResource, mentionResource } from "./contract/resources.ts";
import type { Context } from "hono";
import { contractApp, readJson } from "./contract/app.ts";
import { routes } from "./contract/routes.ts";
import { annotateTkPreview, scopeSummaries } from "./authoring.ts";
import { getItem, getSettings, getSettingsMap, getVersion, listAll, listVersions, publishedVersion } from "./model.ts";
import { listHoppers, listHopperItems, getHopper, getImportedItem, listSubscriptions, getSubscription } from "./importer/store.ts";
import { listVerifiedInbound, listOutbound } from "./mentions/store.ts";
import { sanitizeHtml } from "./importer/sanitize.ts";
import { renderMarkdown, plainTextFromHtml } from "./markdown.ts";
import { clampText } from "./preview.ts";
import { applyInternalLinks, previewInternalLinks, previewTransclusions } from "./transclusion.ts";
import { siteOrigin } from "./protocol.ts";
import { normalizeMount } from "./util.ts";
import type { Env, SignalRow, ImportedItemRow, ItemRow } from "./types.ts";
import { itemDetail } from "./item-data.ts";
import { readingData } from "./reading-data.ts";
import { getInbound } from "./mentions/store.ts";
import { maybeCheckForUpdate } from "./update-check.ts";
import { normalizeOrigin } from "./stub.ts";
import { mentionFetch } from "./mentions/http.ts";

export const readApi = contractApp();
function collection<T>(rows: T[], query: Record<string, string>) {
  const offset = Number(query.offset ?? 0), limit = Number(query.limit ?? 100);
  return { items: rows.slice(offset, offset + limit), total: rows.length, offset, limit };
}
const excerptOf = (s: string, n: number) => clampText(plainTextFromHtml(renderMarkdown(s)), n);

readApi.openapi(routes.listItems, async (c) => {
  const offset = Number(c.req.query("offset") ?? 0), limit = Number(c.req.query("limit") ?? 100);
  const [rows, count] = await Promise.all([
    c.env.DB.prepare("SELECT * FROM items ORDER BY updated DESC, rowid DESC LIMIT ? OFFSET ?").bind(limit, offset).all<ItemRow>(),
    c.env.DB.prepare("SELECT COUNT(*) AS total FROM items").first<{ total: number }>(),
  ]);
  return c.json({ items: rows.results.map(itemResource), total: count?.total ?? 0, offset, limit });
});
readApi.openapi(routes.getItem, async (c) => {
  const detail = await itemDetail(c.env.DB, c.req.param("id"));
  return detail ? c.json({ ...itemResource(detail.item), authored_kind: detail.kind, media: detail.media.map(mediaResource), versions: detail.versions.map(versionResource), published: detail.published ? versionResource(detail.published) : null }) : c.json({ error: "not found" }, 404);
});
readApi.openapi(routes.getSettings, async (c) => c.json(await getSettings(c.env.DB)));
readApi.openapi(routes.listSubscriptions, async (c) => c.json(collection((await listSubscriptions(c.env.DB)).map(subscriptionResource), c.req.query())));
readApi.openapi(routes.getSubscription, async (c) => {
  const sub = await getSubscription(c.env.DB, c.req.param("id"));
  return sub ? c.json(subscriptionResource(sub)) : c.json({ error: "not found" }, 404);
});
readApi.openapi(routes.listHoppers, async (c) => c.json(collection((await listHoppers(c.env.DB)).map(hopperResource), c.req.query())));
readApi.openapi(routes.getHopper, async (c) => {
  const hopper = await getHopper(c.env.DB, c.req.param("id"));
  if (!hopper) return c.json({ error: "not found" }, 404);
  const memberships = await listHopperItems(c.env.DB, hopper.id);
  const rows = await c.env.DB.prepare(`SELECT ii.* FROM hopper_items hi JOIN imported_items ii
    ON ii.subscription_id = hi.subscription_id AND ii.remote_id = hi.remote_id
    WHERE hi.hopper_id = ? ORDER BY hi.added_at DESC`).bind(hopper.id).all<ImportedItemRow>();
  const items = await Promise.all(rows.results.map(async (r) => importedResource({ ...r, content_html: await sanitizeHtml(r.content_html) })));
  return c.json({ hopper: hopperResource(hopper), memberships, items });
});
readApi.openapi(routes.listSignals, async (c) => c.json(collection((await c.env.DB.prepare("SELECT * FROM signals ORDER BY at DESC, subscription_id, remote_id").all<SignalRow>()).results, c.req.query())));
readApi.openapi(routes.listMentions, async (c) => {
  const direction = c.req.query("direction") ?? "inbound";
  const rows = direction === "outbound" ? await listOutbound(c.env.DB) : (await listVerifiedInbound(c.env.DB)).map(mentionResource);
  return c.json({ ...collection<typeof rows[number]>(rows, c.req.query()), direction });
});
readApi.openapi(routes.listReading, async (c) => c.json(await readingData(c.env.DB, Number(c.req.query("offset") ?? 0), Number(c.req.query("limit") ?? 25), c.req.query("sub"))));
readApi.openapi(routes.getImportedItem, async (c) => {
  const row = await getImportedItem(c.env.DB, c.req.param("sub"), c.req.param("id"));
  return row ? c.json(importedResource({ ...row, content_html: await sanitizeHtml(row.content_html) })) : c.json({ error: "not found" }, 404);
});
readApi.openapi(routes.getUpdateState, async (c) => {
  const [settings, map] = await Promise.all([getSettings(c.env.DB), getSettingsMap(c.env.DB)]);
  c.executionCtx.waitUntil(maybeCheckForUpdate(c.env.DB, settings, map, Date.now()).catch(() => {}));
  return c.json(Object.fromEntries(Object.entries(map).filter(([key]) => key.startsWith("update_"))));
});
readApi.openapi(routes.getMentionSource, async (c) => {
  const row = await getInbound(c.env.DB, c.req.param("id"));
  if (!row) return c.json({ error: "not found" }, 404);
  const holder = await c.env.DB.prepare("SELECT s.id AS id FROM imported_items ii JOIN subscriptions s ON s.id = ii.subscription_id WHERE ii.remote_id = ? AND s.origin = ? LIMIT 1").bind(row.source_id, row.source_origin).first<{ id: string }>();
  const subscription = (await listSubscriptions(c.env.DB)).find((s) => s.origin === row.source_origin) ?? null;
  return c.json({ holder: holder?.id ?? null, subscription: subscription ? subscriptionResource(subscription) : null });
});
readApi.openapi(routes.getForkOptions, async (c) => {
  const settings = await getSettings(c.env.DB), mount = normalizeMount(c.env.MOUNT);
  const ourOrigin = siteOrigin(settings, c.req.url, mount);
  const sub = c.req.query("sub");
  const fromSub = sub ? (await listSubscriptions(c.env.DB)).find((s) => s.id === sub)?.origin : undefined;
  const origin = normalizeOrigin(fromSub ?? c.req.query("origin")) ?? ourOrigin;
  const result = await forkablePins(c.env.DB, origin, c.req.query("id") ?? "", ourOrigin);
  return c.json({ ...result, origin, ourOrigin });
});
readApi.openapi(routes.preview, async (c) => {
  const mount = normalizeMount(c.env.MOUNT);
  const body = await readJson<{ content_md?: string }>(c).catch(() => ({}) as { content_md?: string });
  if ((body as { kind?: string }).kind === "thread") return threadPreview(c);
  const tk = annotateTkPreview(body.content_md ?? "");
  // `[[id]]` resolves in the preview too, so an unresolvable link is visible
  // before publish rejects it — same contract as an unresolvable directive.
  const links = await previewInternalLinks(c.env.DB, tk.text, siteOrigin(await getSettings(c.env.DB), c.req.url, mount));
  const html = applyInternalLinks(tk.finish(renderMarkdown(links.text)), links);
  return c.json({ html, scopes: scopeSummaries(tk.scopes), link_errors: links.errors });
});

/** Studio-only provisional thread preview + validation — publish still re-resolves for real. TK scopes are highlighted (task 6). */

/**
 * Read one past version for the editor's history viewer. Studio-only: the
 * stored `content_html` of any version, pinned or not — unlike the public
 * `items/{id}/vN.json` surface, which serves pinned versions only (§2.8).
 * Reading history locally is not the same act as promising it publicly.
 */
readApi.openapi(routes.getVersion, async (c) => {
  const item = await getItem(c.env.DB, c.req.param("id"));
  if (!item) return c.json({ error: "not found" }, 404);
  const version = Number(c.req.param("v"));
  if (!Number.isInteger(version)) return c.json({ error: "bad version" }, 400);
  const row = await getVersion(c.env.DB, item.id, version);
  if (!row) return c.json({ error: "version not found" }, 404);
  return c.json(versionResource(row));
});

/**
 * The bracket palette's candidate list (§3.2). Searches everything v0.3 lets a
 * thread transclude: own published items of **either** kind (nesting is legal
 * from this version) and imported blyg items (`current`, non-L0) — which is
 * what makes quoting follow reading. The route keeps its 0.1 name; only its
 * subject widened.
 *
 * One list serves both bracket forms, and that is not a convenience: `[[id]]`
 * resolves through `resolveTarget` too — "by the same order", §16.2 — so the
 * set of ids a link can name *is* the set a directive can name. A second
 * endpoint would be a second copy of that rule, free to drift from it.
 */
const SEARCH_PAGE = 20;

readApi.openapi(routes.search, async (c) => {
  const q = (c.req.query("q") ?? "").toLowerCase();
  const items = await listAll(c.env.DB);
  const results: { id: string; excerpt: string; version: number; updated: string; badge: string }[] = [];
  const matches = (excerpt: string, id: string) => !q || excerpt.toLowerCase().includes(q) || id.includes(q);
  for (const item of items) {
    if (item.status !== "public" || (item.kind !== "fragment" && item.kind !== "thread")) continue;
    const latest = await publishedVersion(c.env.DB, item);
    if (!latest) continue;
    // From rendered HTML, not markdown source — the picker showed literal
    // "#"/"*" markers otherwise, same bug class as the index rows.
    const excerpt = clampText(plainTextFromHtml(latest.content_html ?? ""), 70) || excerptOf(latest.content_md, 70);
    if (!matches(excerpt, item.id)) continue;
    results.push({ id: item.id, excerpt, version: item.version, updated: item.updated, badge: item.kind });
  }
  const imported = await c.env.DB.prepare(
    `SELECT ii.remote_id AS id, ii.content_html AS html, ii.version AS version, ii.observed_at AS updated,
            ii.state AS state, ii.pinned_version_retained AS retained, s.title AS title, s.origin AS origin
     FROM imported_items ii JOIN subscriptions s ON s.id = ii.subscription_id
     WHERE ii.l0 = 0`,
  ).all<{ id: string; html: string; version: number; updated: string; state: string; retained: number | null; title: string; origin: string }>();
  for (const row of imported.results) {
    // Exactly what resolveTarget will accept at publish, so the picker never
    // offers something the author then can't publish.
    if (row.state !== "current" && row.retained === null) continue;
    const excerpt = clampText(plainTextFromHtml(row.html ?? ""), 70);
    if (!matches(excerpt, row.id)) continue;
    results.push({
      id: row.id,
      excerpt,
      version: row.state === "current" ? row.version : (row.retained as number),
      updated: row.updated,
      badge: row.title || new URL(row.origin).host,
    });
  }
  results.sort((a, b) => (a.updated < b.updated ? 1 : -1));
  // Paged, and the page reports the total. The 20-cap used to be applied
  // silently, so a blyg with more than 20 quotable items had a picker that
  // simply stopped — indistinguishable from having nothing more to offer, and
  // the reason the ceiling was reported as a bug rather than noticed as a
  // limit. `total` is what lets the palette say "20 of 63" instead of lying by
  // omission.
  const offset = Math.max(0, Number(c.req.query("offset") ?? 0) || 0);
  const limit = Number(c.req.query("limit") ?? SEARCH_PAGE);
  return c.json({ items: results.slice(offset, offset + limit), total: results.length, offset, limit });
});


async function threadPreview(c: Context<{ Bindings: Env }>) {
  const body = await readJson<{ content_md?: string; item_id?: string }>(c).catch(() => ({}) as { content_md?: string; item_id?: string });
  const tk = annotateTkPreview(body.content_md ?? "");
  // item_id is the thread being edited — the DAG check needs it, so the
  // preview rejects a circular quote at exactly the point publish would.
  const mount = normalizeMount(c.env.MOUNT);
  const links = await previewInternalLinks(c.env.DB, tk.text, siteOrigin(await getSettings(c.env.DB), c.req.url, mount));
  const resolved = await previewTransclusions(c.env.DB, links.text, body.item_id);
  return c.json({
    html: applyInternalLinks(tk.finish(resolved.html), links),
    errors: [...resolved.errors, ...links.errors],
    transclusions: resolved.transclusions,
    scopes: scopeSummaries(tk.scopes),
  });
}
async function forkablePins(
  db: D1Database,
  origin: string,
  id: string,
  ourOrigin: string,
): Promise<{ versions: { version: number; at: string; note: string | null }[]; error?: string }> {
  if (!id) return { versions: [], error: "no item named" };
  if (origin === ourOrigin) {
    const rows = await listVersions(db, id);
    return {
      versions: rows
        .filter((v) => v.pinned === 1 && v.content_md)
        .map((v) => ({ version: v.version, at: v.published_at, note: v.note })),
    };
  }
  let res;
  try {
    res = await mentionFetch(`${origin}items/${id}.json`);
  } catch (e) {
    return { versions: [], error: `could not reach ${origin}: ${(e as Error).message}` };
  }
  if (!res.ok) return { versions: [], error: `${origin}items/${id}.json returned ${res.status}` };
  try {
    const doc = JSON.parse(await res.text()) as { changelog?: { version: number; at: string; note: string | null; pinned?: boolean }[] };
    const log = Array.isArray(doc.changelog) ? doc.changelog : [];
    return { versions: log.filter((v) => v.pinned === true).map((v) => ({ version: v.version, at: v.at, note: v.note ?? null })) };
  } catch {
    return { versions: [], error: "that origin's item document could not be parsed" };
  }
}
