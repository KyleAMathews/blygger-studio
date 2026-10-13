// Public hopper page — v0.2-plan.md §4.2 task 11. Curation display only
// (decision #12): local snapshots + source attribution + origin links,
// never a re-emission of anyone else's content on our own feed.

import { parseSurface, pinUrl } from "../surface.ts";
import { layout, blygPage, ownItemCard } from "../pages.ts";
import type { HopperRow, ImportedItemRow, ItemRow, Settings, SubscriptionRow } from "../types.ts";
import { escapeHtml, escapeHref } from "../util.ts";
import { sanitizeHtml } from "./sanitize.ts";
import { blygItemUrl } from "./util.ts";

/** A hopper member: something read (an imported item and its source), or one of the owner's own items. */
export type HopperItemView = { row: ImportedItemRow; sub: SubscriptionRow } | { own: ItemRow };

export async function publicHopperPage(db: D1Database, settings: Settings, hopper: HopperRow, items: HopperItemView[], mount: string, origin: string): Promise<string> {
  const blocks: string[] = [];
  for (const member of items) {
    if ("own" in member) {
      blocks.push(await ownItemCard(db, member.own, mount, settings.timezone));
      continue;
    }
    const { row, sub } = member;
    const withdrawn = row.state === "tombstone";
    const subLabel = escapeHtml(sub.title || sub.origin);
    if (withdrawn && row.pinned_version_retained === null) {
      blocks.push(`<article class="fragment withdrawn">
<p>Withdrawn by origin — no longer citable.</p>
<p class="provenance">from <a href="${escapeHref(sub.origin)}">${subLabel}</a></p>
</article>`);
      continue;
    }
    const html = await sanitizeHtml(row.content_html);
    // L0 content already embeds its own source link inline; blyg imports get a constructed permalink on the origin.
    const sourceLink = row.l0 ? "" : blygItemUrl(sub.origin, row.kind, row.remote_id, row.page);
    const pinNote = withdrawn
      ? `<p class="provenance">withdrawn by origin — retained via a pinned version: <a href="${escapeHref(pinUrl(sub.origin, parseSurface(sub.surface), row.remote_id, row.pinned_version_retained!))}">v${row.pinned_version_retained}</a></p>`
      : "";
    const attribution = `<p class="provenance">from <a href="${escapeHref(sub.origin)}">${subLabel}</a>${sourceLink ? ` — <a href="${escapeHref(sourceLink)}">source ↗</a>` : ""}</p>`;
    blocks.push(`<article class="fragment">
${html}
${pinNote}
${attribution}
</article>`);
  }
  // The site's own header and masthead, like every other public page. The old
  // bare `<a href="/">Home</a>` pointed at the host root, which on a
  // path-mounted blyg (venkateshrao.com/blyg/) is not the blyg at all.
  const read = items.filter((m): m is { row: ImportedItemRow; sub: SubscriptionRow } => !("own" in m));
  const own = items.length - read.length;
  const sources = new Set(read.map(({ sub }) => sub.id)).size;
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  const fromSources = `from ${plural(sources, "source", "sources")}`;
  // Named, not "mine": the page speaks about the blyg, in no one's voice.
  const author = settings.author_name || settings.site_title;
  const summary = !own
    ? `${plural(items.length, "item", "items")} ${fromSources}`
    : read.length
      ? `${plural(items.length, "item", "items")}: ${own} by ${author} and ${read.length} ${fromSources}`
      : `${plural(own, "item", "items")} by ${author}`;
  const description = hopper.description || `A collection on ${settings.site_title}: ${summary}.`;
  const body = await blygPage(db, settings, mount, `<header class="collection-head">
<h2>${escapeHtml(hopper.name)}</h2>
${hopper.description ? `<p class="collection-desc">${escapeHtml(hopper.description)}</p>\n` : ""}<p class="meta">A collection · ${escapeHtml(summary)} · <a href="${mount}/">${escapeHtml(settings.site_title)}</a></p>
</header>
${blocks.join("\n") || "<p>Nothing here yet.</p>"}`);
  return layout(`${hopper.name} — ${settings.site_title}`, body, mount, {
    description,
    url: `${origin}h/${hopper.slug}/`,
    siteName: settings.site_title,
    feedUrl: `${origin}feed.xml`,
    feedTitle: settings.site_title,
  });
}
