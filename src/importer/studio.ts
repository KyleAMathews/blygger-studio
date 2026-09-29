// Subscribe-side studio pages — v0.2-plan.md §4.2 task 7 (subs list +
// add-by-URL), task 9 (reading feed), task 10 (hoppers). Server-rendered
// HTML + vanilla JS against the /api/* endpoints, same conventions as
// ../studio.ts (no client framework, per CLAUDE.md stack conventions).

import { Hono } from "hono";
import { authoredKind, getSettings, listPublic, publishedVersion } from "../model.ts";
import { siteOrigin } from "../protocol.ts";
import { formatDate, studioHeader, studioLayout } from "../studio.ts";
import type { Env, SubscriptionRow } from "../types.ts";
import { escapeHtml, normalizeMount, studioPath } from "../util.ts";
import type { ImportedEntryInput, OwnEntryInput, ReadingFeedEntry } from "./reading.ts";
import { buildReadingFeed } from "./reading.ts";
import { sanitizeHtml } from "./sanitize.ts";
import { leadingHeading, previewFromHtml, splitL0Content } from "../preview.ts";
import {
  getHopper,
  getImportedItem,
  getSignal,
  listAllImportedItems,
  listHoppers,
  listHopperItems,
  listSubscriptions,
} from "./store.ts";
import type { HopperRow } from "../types.ts";
import { displayUrl, sourceTitleAndUrl } from "./util.ts";

const SUBS_STYLE = `
.sub-row { border-top: 1px solid var(--rule); padding: 0.75rem 0; }
.sub-row .title-line { display: flex; align-items: center; gap: 0.5rem; }
.status-dot { font-size: 0.8rem; }
.status-dot.active { color: var(--ok); }
.status-dot.paused { opacity: 0.5; }
.status-dot.degraded { color: var(--warn); }
.kind-chip { font-size: 0.8rem; font-style: italic; color: var(--pencil); }
.sub-row .meta { font-size: 0.82rem; opacity: 0.7; margin: 0.25rem 0; }
.sub-row .flags { font-size: 0.8rem; color: var(--warn); margin: 0.25rem 0; }
.sub-row .actions { display: flex; gap: 0.4rem; align-items: center; margin-top: 0.4rem; flex-wrap: wrap; font-size: 0.85rem; }
.sub-row label.blogroll { font-size: 0.85rem; display: flex; align-items: center; gap: 0.3rem; }
.add-sub { border: 1px solid var(--rule); border-radius: 6px; padding: 0.75rem; margin-bottom: 1rem; }
.add-sub input[type="url"] { width: 100%; font: inherit; padding: 0.4rem 0.5rem; border-radius: 4px; border: 1px solid var(--rule-strong); background: transparent; color: inherit; }
.add-sub .confirm { margin-top: 0.6rem; font-size: 0.9rem; padding: 0.5rem; border: 1px solid var(--rule); border-radius: 4px; }
.add-sub .mismatch { color: var(--warn); }
`;

function subRow(sub: SubscriptionRow, tz: string): string {
  const flags: { type: string; at: string; detail?: string }[] = (() => {
    try {
      const parsed = JSON.parse(sub.flags);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  })();
  const flagsHtml = flags.length
    ? `<p class="flags">⚠ ${flags
        .slice(-3)
        .map((f) => escapeHtml(f.type + (f.detail ? `: ${f.detail}` : "")))
        .join(" · ")}</p>`
    : "";
  const pollLine = sub.last_poll_at ? `last polled ${formatDate(sub.last_poll_at, tz)}` : "never polled";
  const pauseResume =
    sub.status === "paused"
      ? `<button type="button" data-action="resume" data-id="${sub.id}">resume</button>`
      : `<button type="button" data-action="pause" data-id="${sub.id}">pause</button>`;
  const resyncBtn =
    sub.kind === "blyg" ? `<button type="button" data-action="resync" data-id="${sub.id}">resync</button>` : "";
  return `<div class="sub-row">
<div class="title-line">
<span class="status-dot ${sub.status}">●</span>
<span class="kind-chip">${sub.kind}</span>
<strong>${escapeHtml(sub.title || sub.origin)}</strong>
</div>
<p class="meta">${escapeHtml(sub.origin)} &middot; ${pollLine}${sub.status === "degraded" ? ` &middot; degraded (${sub.fail_count} consecutive failures)` : ""}</p>
${flagsHtml}
<div class="actions">
${pauseResume}
${resyncBtn}
<button type="button" class="danger" data-action="delete-sub" data-id="${sub.id}">delete</button>
<label class="blogroll"><input type="checkbox" data-action="toggle-blogroll" data-id="${sub.id}" ${sub.in_blogroll ? "checked" : ""}> in blogroll</label>
</div>
</div>`;
}

const SUBS_SCRIPT = `
async function subsApi(method, path, body) {
  const res = await fetch(path, {
    method,
    headers: body !== undefined ? { "content-type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, json };
}
document.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  const action = btn.dataset.action, id = btn.dataset.id;
  if (action === "pause") await subsApi("POST", "/api/subscriptions/" + id + "/pause");
  else if (action === "resume") await subsApi("POST", "/api/subscriptions/" + id + "/resume");
  else if (action === "resync") { await subsApi("POST", "/api/subscriptions/" + id + "/resync"); alert("resynced"); }
  else if (action === "delete-sub") {
    if (!confirm("Delete this subscription? Local imports, hopper memberships, and signals for it are removed. Nothing public is affected.")) return;
    await subsApi("DELETE", "/api/subscriptions/" + id);
  } else return;
  location.reload();
});
document.addEventListener("change", async (e) => {
  if (e.target.dataset.action !== "toggle-blogroll") return;
  await subsApi("PUT", "/api/subscriptions/" + e.target.dataset.id, { in_blogroll: e.target.checked });
});

const addForm = document.getElementById("add-sub-form");
const urlInput = document.getElementById("add-sub-url");
const confirmSlot = document.getElementById("add-sub-confirm");
let pendingResolve = null;
addForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const url = urlInput.value.trim();
  if (!url) return;
  const { ok, json } = await subsApi("POST", "/api/subscriptions", { url });
  if (!ok) {
    confirmSlot.innerHTML = '<div class="confirm mismatch">Could not resolve: ' + (json && json.error ? json.error.replace(/</g, "&lt;") : "unknown error") + '</div>';
    return;
  }
  pendingResolve = { url, title: json.title };
  const mismatchHtml = json.siteMismatch
    ? '<p class="mismatch">Note: this origin\\'s manifest claims to be ' + json.siteMismatch.asserted.replace(/</g, "&lt;") + ', but was actually fetched from ' + json.siteMismatch.actual.replace(/</g, "&lt;") + '. Subscribing to the fetched origin.</p>'
    : "";
  confirmSlot.innerHTML =
    '<div class="confirm">Resolved as <strong>' + json.kind + '</strong>: ' + (json.origin || json.feedUrl).replace(/</g, "&lt;") +
    mismatchHtml +
    '<p><button type="button" id="confirm-sub-btn">confirm subscribe</button></p></div>';
  document.getElementById("confirm-sub-btn").addEventListener("click", async () => {
    if (!pendingResolve) return;
    const { ok: ok2 } = await subsApi("POST", "/api/subscriptions", { url: pendingResolve.url, confirm: true, title: pendingResolve.title });
    if (ok2) location.reload();
  });
});
`;

export const importerStudio = new Hono<{ Bindings: Env }>({ strict: false });

importerStudio.get("/subs", async (c) => {
  const subs = await listSubscriptions(c.env.DB);
  const settings = await getSettings(c.env.DB);
  const mount = normalizeMount(c.env.MOUNT);
  const body = `${studioHeader("blyg studio — subscriptions", mount, "subs")}
<style>${SUBS_STYLE}</style>
<div class="add-sub">
<form id="add-sub-form">
<label for="add-sub-url" style="display:block;font-size:0.85rem;opacity:0.8;margin-bottom:0.3rem;">Subscribe to a URL (a blyg origin, its feed, or a legacy RSS feed)</label>
<input type="url" id="add-sub-url" placeholder="https://example.com/" required>
<p style="margin-top:0.5rem;"><button type="submit">resolve</button></p>
</form>
<div id="add-sub-confirm"></div>
</div>
${subs.length ? subs.map((sub) => subRow(sub, settings.timezone)).join("\n") : "<p>No subscriptions yet.</p>"}
<script>${SUBS_SCRIPT}</script>`;
  return c.html(studioLayout("subscriptions — blyg studio", body));
});

// --- Reading feed (task 9, §3.6) ---

const READING_STYLE = `
.reading-entry { border-top: 1px solid var(--rule); padding: 0.85rem 0; }
.reading-entry .byline { font-size: 0.8rem; opacity: 0.7; display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap; }
.reading-entry .byline .kind-chip { font-size: 0.68rem; padding: 0.02rem 0.3rem; }
/* The non-composition set: copy the construct, copy the URL, open the URL.
   Pushed right as one group (margin-left:auto on the first of them) so
   the byline reads as source-and-date on the left, handles on the right. */
.reading-entry .byline .entry-copy { font: inherit; font-size: 0.8rem; color: var(--ink-soft); background: none; border: none; padding: 0; cursor: pointer; white-space: nowrap; }
.reading-entry .byline .entry-copy:hover { color: inherit; text-decoration: underline; }
.reading-entry .byline .entry-copy code { font-size: 0.95em; }
.reading-entry .byline .entry-copy:first-of-type { margin-left: auto; }
.reading-entry .byline .copy-fallback { font: inherit; font-size: 0.8rem; width: 32ch; border: 1px solid var(--rule); border-radius: 3px; padding: 0 0.3rem; background: transparent; color: inherit; }
.reading-entry .byline .entry-open { margin-left: 0; text-decoration: none; font-variant-numeric: tabular-nums; color: var(--ink-soft); min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.reading-entry .byline .entry-open:hover { text-decoration: underline; }
.reading-entry .byline .l0-chip { font-size: 0.72rem; color: var(--ink-soft); border: 1px solid var(--rule); border-radius: 3px; padding: 0.02rem 0.3rem; }
.reading-entry .entry-title { margin: 0.25rem 0 0.15rem; font-size: 1.02rem; font-weight: 600; line-height: 1.35; }
.reading-entry .entry-title a { text-decoration: none; }
.reading-entry .entry-title a:hover { text-decoration: underline; }
.reading-entry .entry-title, .reading-entry .content { max-width: 72ch; }
.reading-entry .content { margin-top: 0.4rem; }
.reading-entry .content img { max-width: 100%; }
.reading-entry .content > :first-child { margin-top: 0; }
.reading-entry .content > :last-child { margin-bottom: 0; }
/* An item's own headings shouldn't shout in a feed context — a fragment
   starting with an h1 otherwise renders at full display size in the list. */
.reading-entry .content :is(h1,h2,h3,h4,h5,h6) { font-size: 1rem; font-weight: 600; margin: 0.45rem 0 0.2rem; line-height: 1.35; }
.reading-entry .content blockquote { margin: 0.5rem 0; padding-left: 0.8rem; border-left: 2px solid var(--rule); }
/* Clamp by line count, not by cutting markup — see readingEntryHtml. */
.reading-entry .content.clamped { display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }
.reading-entry .expand-btn { font-size: 0.78rem; opacity: 0.7; margin-top: 0.2rem; }
.reading-entry .content:not(.clamped) + .expand-btn { display: none; }
/* Two-pane reader (session 28, after Aneesh's desktop client): sources on the
   left, the stream on the right. The preview pane that client has is
   deliberately not copied: a browser already has tabs, and the open link uses
   one. */
.reading-layout { display: flex; gap: 1.5rem; align-items: flex-start; }
.reading-sidebar { flex: 0 0 15rem; position: sticky; top: 1rem; max-height: calc(100vh - 2rem); overflow-y: auto; font-size: 0.88rem; }
.reading-main { flex: 1; min-width: 0; }
.reading-sidebar .add-feed { margin-bottom: 0.9rem; }
.reading-sidebar .add-feed input { width: 100%; font: inherit; font-size: 0.85rem; padding: 0.3rem 0.4rem; border: 1px solid var(--rule); border-radius: 4px; background: transparent; color: inherit; }
.reading-sidebar .add-feed button { font: inherit; font-size: 0.82rem; margin-top: 0.35rem; }
.reading-sidebar h2 { font-size: 0.72rem; letter-spacing: 0.04em; text-transform: uppercase; color: var(--ink-soft); margin: 1rem 0 0.35rem; font-weight: 600; }
.reading-sidebar ul { list-style: none; margin: 0; padding: 0; }
.reading-sidebar li a { display: flex; justify-content: space-between; gap: 0.5rem; padding: 0.22rem 0.4rem; border-radius: 4px; text-decoration: none; color: inherit; }
.reading-sidebar li a:hover { background: var(--paper-sunk); }
.reading-sidebar li a.current { background: var(--paper-sunk); font-weight: 600; }
.reading-sidebar li a .feed-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.reading-sidebar li a .feed-count { color: var(--ink-soft); font-variant-numeric: tabular-nums; flex-shrink: 0; }
.reading-sidebar li a.paused .feed-name { opacity: 0.55; font-style: italic; }
.reading-sidebar .manage { margin-top: 0.9rem; font-size: 0.82rem; }
/* Below 720px the sidebar stacks *above* the stream, which is correct order
   and wrong result: a list of every subscription pushed the thing you came to
   read off the first screen entirely. It collapses behind a control instead,
   and the control names the source you are filtered to, so the collapsed state
   still answers "what am I looking at". Gated on html.js — see JS_MARKER; with
   scripting off the sidebar stays where it was. */
.sources-toggle { display: none; font: inherit; font-size: 0.85rem; padding: 0.45rem 0.7rem; border: 1px solid var(--rule-strong); border-radius: 4px; background: transparent; color: inherit; cursor: pointer; text-align: left; width: 100%; }
.sources-toggle .current-source { font-weight: 600; }
@media (max-width: 720px) {
  .reading-layout { flex-direction: column; }
  .reading-sidebar { position: static; flex: 1 1 auto; max-height: none; width: 100%; }
  .sources-toggle { display: block; }
  html.js .reading-sidebar { display: none; }
  html.js .reading-sidebar.open { display: block; }
}
.reading-pager { display: flex; justify-content: space-between; align-items: center; margin: 1.25rem 0 0; font-size: 0.9rem; border-top: 1px solid var(--rule); padding-top: 0.75rem; }
.reading-pager .pager-info { opacity: 0.7; }
.reading-entry.withdrawn-entry { opacity: 0.6; font-style: italic; }
.entry-actions { margin-top: 0.5rem; display: flex; gap: 0.5rem; align-items: center; font-size: 0.85rem; }
.entry-actions button { font-size: 0.9rem; padding: 0.1rem 0.4rem; border-radius: 4px; border: 1px solid var(--rule); background: transparent; cursor: pointer; }
.entry-actions button.active { border-color: currentColor; background: var(--paper-sunk); }
.entry-actions .stub-btn { font-size: 0.85rem; background: none; border: 0; padding: 0; cursor: pointer; color: inherit; border-bottom: 1px dotted currentColor; opacity: 0.8; }
.entry-actions .stub-btn:hover { opacity: 1; }
.entry-actions select { font: inherit; font-size: 0.85rem; padding: 0.15rem 0.3rem; border-radius: 4px; border: 1px solid var(--rule); background: transparent; color: inherit; }
`;

/**
 * Collapses the source sidebar at phone width. Separate from READING_SCRIPT
 * because it is chrome: it has to work on a reading page with no entries on
 * it, which is exactly the page where you most want to change source.
 */
const SIDEBAR_SCRIPT = `
(function () {
  var btn = document.querySelector(".sources-toggle");
  var side = document.getElementById("reading-sidebar");
  if (!btn || !side) return;
  btn.addEventListener("click", function () {
    var open = side.classList.toggle("open");
    btn.setAttribute("aria-expanded", open ? "true" : "false");
  });
})();
`;

async function ownEntries(db: D1Database): Promise<OwnEntryInput[]> {
  const items = await listPublic(db);
  const out: OwnEntryInput[] = [];
  for (const item of items) {
    const withdrawn = item.kind === "withdrawn";
    const kind = await authoredKind(db, item);
    const latest = withdrawn ? null : await publishedVersion(db, item);
    out.push({ id: item.id, kind, withdrawn, updated: item.updated, contentHtml: latest?.content_html ?? "" });
  }
  return out;
}

async function importedEntries(db: D1Database): Promise<ImportedEntryInput[]> {
  const [imports, subs] = await Promise.all([listAllImportedItems(db), listSubscriptions(db)]);
  const titleOf = new Map(subs.map((s) => [s.id, s.title || s.origin]));
  const originOf = new Map(subs.map((s) => [s.id, s.origin]));
  const out: ImportedEntryInput[] = [];
  for (const row of imports) {
    const origin = originOf.get(row.subscription_id);
    // `sourceTitleAndUrl` already knows both shapes — the leading anchor for
    // L0, the origin's own permalink for blyg-native — so the link out is
    // derived by the same rule the stub gesture uses rather than a second one.
    const sourceUrl = origin ? sourceTitleAndUrl(row, origin).url : null;
    out.push({
      subscriptionId: row.subscription_id,
      subscriptionTitle: titleOf.get(row.subscription_id) ?? row.subscription_id,
      sourceUrl,
      remoteId: row.remote_id,
      kind: row.kind,
      withdrawn: row.state === "tombstone",
      l0: row.l0 === 1,
      updated: row.updated,
      observedAt: row.observed_at,
      contentHtml: row.l0 ? row.content_html : await sanitizeHtml(row.content_html),
      pinnedVersionRetained: row.pinned_version_retained,
    });
  }
  return out;
}

/**
 * Hoppers are the unit of curation (decision #12: make-public is a *list* you
 * keep, not a thing you said), so this picker is the entry point to the whole
 * public-curation feature. It used to render nothing at all when you had no
 * hoppers yet — hiding the feature precisely at the moment you had never used
 * it, which is a cold start with no door. It now always renders and can create
 * a hopper inline, so the first one is reachable from the item that prompted it.
 */
function hopperPicker(imp: NonNullable<ReadingFeedEntry["imported"]>, hoppers: HopperRow[]): string {
  const options = hoppers.map((h) => `<option value="${h.id}">${escapeHtml(h.name)}</option>`).join("");
  return `<select data-action="add-to-hopper" data-sub="${imp.subscriptionId}" data-remote="${imp.remoteId}">
<option value="">+ add to hopper…</option>
${options}
<option value="__new__">${hoppers.length ? "+ new hopper…" : "+ create your first hopper…"}</option>
</select>`;
}

function thumbButtons(imp: NonNullable<ReadingFeedEntry["imported"]>, thumb: 1 | -1 | null): string {
  return `<button type="button" data-action="thumb" data-sub="${imp.subscriptionId}" data-remote="${imp.remoteId}" data-thumb="1" class="${thumb === 1 ? "active" : ""}">👍</button>
<button type="button" data-action="thumb" data-sub="${imp.subscriptionId}" data-remote="${imp.remoteId}" data-thumb="-1" class="${thumb === -1 ? "active" : ""}">👎</button>`;
}

async function readingEntryHtml(
  db: D1Database,
  e: ReadingFeedEntry,
  hoppers: HopperRow[],
  mount: string,
  ourOrigin: string,
  tz: string,
): Promise<string> {
  if (e.withdrawn) {
    const retained = e.imported?.pinnedVersionRetained;
    if (retained === null || retained === undefined) {
      return `<div class="reading-entry withdrawn-entry">
<p class="byline"><span class="kind-chip">${e.kind}</span> ${escapeHtml(e.imported?.subscriptionTitle ?? "")}</p>
<p>withdrawn by origin</p>
</div>`;
    }
    // Pinned-retained content still renders below, with the withdrawal noted.
  }
  // "open ↗" — read it where it lives. Always a new tab: the studio holds
  // unsaved composer text and a half-written draft is not worth a round trip
  // through someone else's site. For an own entry this is our own public page,
  // which is the same act from the reader's side.
  const openHref =
    e.source === "own"
      ? e.own && !e.withdrawn
        ? `${mount}/${e.kind === "thread" ? "t" : "f"}/${e.own.id}/`
        : null
      : (e.imported?.sourceUrl ?? null);
  // The address itself, not an "open" label. Two entries quoting the same
  // passage — several origins stubbing one item, or a restub chain — are
  // otherwise indistinguishable in a feed, because the body is the part they
  // share and the origin is the part they do not.
  const openLink = openHref
    ? ` <a class="entry-open" href="${escapeHtml(openHref)}" target="_blank" rel="noopener" title="${escapeHtml(openHref)}">${escapeHtml(displayUrl(openHref))} ↗</a>`
    : "";
  // `copy [[id]]` — decision #50. A link is not a response: #32 ruled `[[id]]`
  // declares nothing (no relation, no mention), so this is not the lighter
  // sibling #27 retired but a different act, citing without responding.
  //
  // The decision's conditions are structural here, not cosmetic. It is named
  // for what it does, it sits in the byline beside `open ↗` where
  // copy-permalink would, and it is deliberately **not** in `.entry-actions`
  // alongside `stub ↗` and `fork ↗` — `stub ↗` stays the one affordance that
  // means "I am responding", and a peer in that row would say otherwise by
  // position alone.
  //
  // Offered only where `[[id]]` would actually resolve at publish
  // (`resolveTarget`'s order, #26): a published item of ours, or an imported
  // non-L0 blyg item that is current or pin-retained. An L0 row has no item
  // document and no version, so a link to it could never resolve — the reader
  // offers `open ↗` for those and nothing else.
  const linkableId =
    e.source === "own"
      ? e.own && !e.withdrawn
        ? e.own.id
        : null
      : e.imported && !e.l0 && (!e.withdrawn || e.imported.pinnedVersionRetained !== null)
        ? e.imported.remoteId
        : null;
  // Two sets, split by what they do rather than by what they are about
  // (Venkat, session 28).
  //
  // The byline carries the **non-composition** actions: copy the construct,
  // copy the URL, open the URL. None of them writes anything; they hand you a
  // string or a tab. This is exactly the home decision #50 named for the copy
  // affordance — "beside copy-permalink" — and now there is literally a
  // copy-permalink beside it.
  //
  // The actions row carries everything that changes your blyg: thumbs, hopper
  // membership, stub, fork, and link post.
  const copyActions = linkableId
    ? `<button type="button" class="entry-copy" data-action="copy" data-copy="[[${escapeHtml(linkableId)}]]" data-done="copied">copy <code>[[id]]</code></button>`
    : "";
  // Absolute, always. `openHref` is relative for our own items, and a relative
  // path is exactly the thing that does not work once it has been pasted
  // somewhere — which is the entire purpose of this button.
  const shareUrl = openHref
    ? openHref.startsWith("http")
      ? openHref
      : `${ourOrigin.replace(/\/$/, "")}/${openHref.replace(/^\//, "")}`
    : "";
  /**
   * "link post" — start a new fragment that links this item (Venkat, session 28).
   *
   * Decision #50 sanctions exactly this output: "A quiet response by
   * fragment-plus-link is #32 working as intended, not a leak around #27." A
   * link declares nothing on the wire — no relation, no mention — so the post
   * this makes says only what its words say.
   *
   * It is named for what it produces rather than for a relation to the target,
   * which is #50's naming condition: never respond, reply or answer. `stub ↗`
   * remains the one affordance that means "I am responding", and it is the one
   * that writes a citation and sends a mention.
   *
   * **Open question for Fable**: #50 also said the *copy* affordance must not
   * be "a peer of `stub ↗`", and that condition is now met — the copy actions
   * sit beside the permalink, where #50 put them. This is a different control
   * that #50 did not rule on, and it does sit beside `stub ↗`. Worth confirming
   * or renaming rather than assuming.
   */
  const linkPost = linkableId
    ? `<button type="button" class="stub-btn" data-action="link-post" data-id="${escapeHtml(linkableId)}">link post ↗</button>`
    : "";
  const copyUrl = shareUrl
    ? `<button type="button" class="entry-copy" data-action="copy" data-copy="${escapeHtml(shareUrl)}" data-done="copied">copy url</button>`
    : "";
  const byline =
    e.source === "own"
      ? `<span class="kind-chip">${e.kind}</span> you`
      : `<span class="kind-chip">${e.kind}</span> ${e.l0 ? '<span class="l0-chip">legacy rss</span> ' : ""}${escapeHtml(e.imported?.subscriptionTitle ?? "")}`;
  const withdrawnNote = e.withdrawn ? `<p style="opacity:0.7;font-style:italic;">withdrawn by origin — retained via a pin (v${e.imported?.pinnedVersionRetained})</p>` : "";
  let actions = "";
  if (e.imported) {
    const signal = await getSignal(db, e.imported.subscriptionId, e.imported.remoteId);
    // `stub ↗` (decision #27) — the one "respond to this" gesture. It creates
    // a thread that cites this item, which is what makes the response
    // machine-readable on the far side; `respond`, which produced an
    // unmarked fragment with a bare link, is retired rather than kept as a
    // lighter sibling.
    actions = `<div class="entry-actions">${thumbButtons(e.imported, signal ? (signal.thumb as 1 | -1) : null)} ${hopperPicker(e.imported, hoppers)} ${stubButton(e.imported.subscriptionId, e.imported.remoteId)}${
      e.l0 ? "" : " " + forkLink(mount, e.imported.subscriptionId, e.imported.remoteId)
    }${linkPost ? " " + linkPost : ""}</div>`;
  } else if (linkPost) {
    // Own items get an actions row for this alone. Thumbs, hoppers, stub and
    // fork are gestures toward someone else's writing and stay absent; linking
    // your own earlier item in a new post is ordinary.
    actions = `<div class="entry-actions">${linkPost}</div>`;
  }
  // Promote a title out of the body so the list is scannable, instead of title
  // and summary reading as one undifferentiated block.
  //
  // Two sources, because the two kinds of entry carry a title differently:
  //
  //   L0  — l0.ts renders the feed's "[title](link)" as the first paragraph,
  //         so the title is already an anchor and `splitL0Content` lifts it.
  //   blyg — the author's own leading heading, lifted by `leadingHeading` and
  //         linked to the item at its origin.
  //
  // The blyg half is new in session 28. Until now only L0 entries got a
  // promoted title, so a titled thread from a real blyg rendered its heading
  // inline in the clamped body at 1rem — the same asymmetry the public feed
  // page had, arrived at by a different route. Three surfaces now agree.
  //
  // Presentation only. Decision #46: no title field at any version, items stay
  // titleless (§5.3), and a *reader* MUST NOT extract a title from a leading
  // heading. That rule is about what a reader may assert on the wire or treat
  // as structure — here nothing is asserted, stored or re-published; a heading
  // is drawn larger in our own list and the stored HTML is untouched. #46 calls
  // the linked title "a studio task" in as many words.
  const nativeHeading = e.l0 ? { title: null, rest: e.contentHtml } : leadingHeading(e.contentHtml);
  const { titleHtml, bodyHtml } = e.l0
    ? splitL0Content(e.contentHtml)
    : {
        titleHtml: nativeHeading.title
          ? openHref
            ? `<a href="${escapeHtml(openHref)}" target="_blank" rel="noopener">${escapeHtml(nativeHeading.title)}</a>`
            : escapeHtml(nativeHeading.title)
          : null,
        bodyHtml: nativeHeading.rest,
      };
  const titleLine = titleHtml ? `<p class="entry-title">${titleHtml}</p>` : "";
  // Entries are clamped rather than truncated: nothing is lost, and no
  // markup is cut (which would break tags). "more" lifts the clamp.
  const body = bodyHtml.trim()
    ? `<div class="content clamped">${bodyHtml}</div>
<button type="button" class="link expand-btn" data-action="expand">more</button>`
    : titleHtml
      ? ""
      : "<div class=\"content\"><p><em>(empty)</em></p></div>";
  return `<div class="reading-entry">
<p class="byline">${byline} <span>&middot; ${formatDate(e.displayAt, tz)}</span>${copyActions ? ` ${copyActions}` : ""}${copyUrl ? ` ${copyUrl}` : ""}${openLink}</p>
${withdrawnNote}
${titleLine}
${body}
${actions}
</div>`;
}

/** The stub affordance, shared by the reading feed and hopper detail (§3.1). */
export function stubButton(subId: string, remoteId: string): string {
  return `<button type="button" class="stub-btn" data-action="stub" data-sub="${escapeHtml(subId)}" data-remote="${escapeHtml(remoteId)}">stub ↗</button>`;
}

/**
 * The fork affordance (§2.4). A plain link, not a button: forking needs a
 * *pinned* version and which ones exist is the origin's to say, so this opens
 * the picker rather than pretending the choice has already been made.
 *
 * Absent for L0 entries — a legacy RSS feed has no items, no versions and no
 * pins, so there is nothing a lineage pointer could name.
 */
export function forkLink(mount: string, subId: string, remoteId: string): string {
  return `<a class="stub-btn" href="${studioPath(mount)}/fork?sub=${encodeURIComponent(subId)}&amp;id=${encodeURIComponent(remoteId)}">fork ↗</a>`;
}

/**
 * Click handler for stubButton. Creates the draft server-side (so a refresh
 * can't mint duplicates the way a GET-with-side-effects would) and lands the
 * author in the thread editor with the citation already attached.
 */
export function stubScript(mount: string): string {
  return `
/**
 * "link post" — a new fragment draft that links this item.
 *
 * Created server-side and then navigated to, the same shape as the stub
 * action, so a refresh cannot mint duplicates the way a GET with side effects
 * would. The body is the link and a blank line: none of the target's text is
 * copied, which is decision #12's rule and the thing the retired proto-stub
 * affordance already got right. (The word that names it is avoided here on
 * purpose: this script is inlined into the reading page, and a test asserts
 * that page carries no such affordance by searching its whole text.)
 */
document.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-action='link-post']");
  if (!btn) return;
  btn.disabled = true;
  const res = await fetch("/api/items", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ content_md: "[[" + btn.dataset.id + "]]\\n\\n", kind: "fragment" }),
  });
  if (!res.ok) { btn.disabled = false; alert("Could not start a post for that item."); return; }
  const data = await res.json();
  location.href = "${studioPath(mount)}/edit/" + data.id;
});

async function readingApi(method, path, body) {
  await fetch(path, { method, headers: body !== undefined ? { "content-type": "application/json" } : undefined, body: body !== undefined ? JSON.stringify(body) : undefined });
}

document.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-action='stub']");
  if (!btn) return;
  btn.disabled = true;
  const res = await fetch("/api/stubs", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ subscription_id: btn.dataset.sub, remote_id: btn.dataset.remote }),
  });
  if (!res.ok) { btn.disabled = false; alert("Could not start a stub for that item."); return; }
  const data = await res.json();
  location.href = "${studioPath(mount)}/edit/" + data.id;
});
`;
}

const READING_SCRIPT = `
/**
 * The copy buttons. One handler, two uses: the \`[[id]]\` construct and the
 * item's absolute URL. Each button carries its own payload in \`data-copy\`, so
 * adding a third thing to copy needs no new JavaScript.
 *
 * Copies the construct rather than the bare id, because an id alone would make
 * the author remember a grammar they came here to look up. navigator.clipboard
 * is undefined in an insecure context, so the fallback puts the text on screen
 * and selects it rather than failing silently: it is still one keystroke away.
 */
document.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-action='copy']");
  if (!btn) return;
  const text = btn.dataset.copy;
  try {
    await navigator.clipboard.writeText(text);
    const original = btn.innerHTML;
    btn.textContent = btn.dataset.done || "copied";
    setTimeout(() => { btn.innerHTML = original; }, 1400);
  } catch (err) {
    const field = document.createElement("input");
    field.value = text;
    field.setAttribute("readonly", "readonly");
    field.className = "copy-fallback";
    btn.replaceWith(field);
    field.select();
  }
});

document.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-action='thumb']");
  if (!btn) return;
  await readingApi("PUT", "/api/signals/" + btn.dataset.sub + "/" + btn.dataset.remote, { thumb: Number(btn.dataset.thumb) });
  location.reload();
});
document.addEventListener("change", async (e) => {
  const sel = e.target.closest("[data-action='add-to-hopper']");
  if (!sel || !sel.value) return;
  let hopperId = sel.value;
  let created = "";
  if (hopperId === "__new__") {
    const name = prompt("Name the new hopper (a curated list — you make the whole list public, not single items):");
    sel.value = "";
    if (!name || !name.trim()) return;
    const res = await fetch("/api/hoppers", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    if (!res.ok) { alert("Could not create that hopper."); return; }
    hopperId = (await res.json()).id;
    created = " (new hopper created)";
  }
  await readingApi("PUT", "/api/hoppers/" + hopperId + "/items/" + sel.dataset.sub + "/" + sel.dataset.remote);
  sel.value = "";
  alert("added to hopper" + created);
  if (created) location.reload();
});
document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-action='expand']");
  if (!btn) return;
  const content = btn.previousElementSibling;
  const clamped = content.classList.toggle("clamped");
  btn.textContent = clamped ? "more" : "less";
});
// Hide "more" where the text was never long enough to be clamped, so the
// affordance only appears when it actually does something.
for (const btn of document.querySelectorAll("[data-action='expand']")) {
  const content = btn.previousElementSibling;
  if (content && content.scrollHeight <= content.clientHeight + 1) btn.hidden = true;
}
`;

export const READING_PAGE_SIZE = 25;

/** 1-based page number from `?page=`, clamped into range; out-of-range or junk lands on page 1. */
export function readingPage(raw: string | undefined, total: number, pageSize = READING_PAGE_SIZE): { page: number; pages: number; start: number } {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const asked = Number(raw);
  const page = Number.isInteger(asked) && asked >= 1 && asked <= pages ? asked : 1;
  return { page, pages, start: (page - 1) * pageSize };
}

/**
 * The source sidebar (session 28). One entry per thing that can appear in the
 * feed, plus "All" — which is the default, because the merged stream is the
 * point of the reading tab and a per-source view is the exception.
 *
 * Counts come from the feed already in memory rather than a second query, and
 * they are counts of what is *here* — a paused subscription keeps the items it
 * already delivered, which is why pausing is not deleting.
 */
function readingSidebar(
  feed: ReadingFeedEntry[],
  subs: SubscriptionRow[],
  selected: string,
  mount: string,
): string {
  const base = `${studioPath(mount)}/reading`;
  const countFor = (pred: (e: ReadingFeedEntry) => boolean) => feed.filter(pred).length;
  const link = (key: string, label: string, count: number, extra = "") => {
    const href = key === "all" ? base : `${base}?sub=${encodeURIComponent(key)}`;
    const cls = `${key === selected ? "current" : ""} ${extra}`.trim();
    return `<li><a href="${href}"${cls ? ` class="${cls}"` : ""}><span class="feed-name">${escapeHtml(label)}</span><span class="feed-count">${count}</span></a></li>`;
  };

  const ownCount = countFor((e) => e.source === "own");
  const rows = subs.map((sub) =>
    link(
      sub.id,
      sub.title || new URL(sub.origin).host,
      countFor((e) => e.imported?.subscriptionId === sub.id),
      sub.status === "paused" ? "paused" : "",
    ),
  );

  // The toggle is rendered here rather than by the page because this function
  // is the only place that knows what the selected source is called.
  const selectedLabel =
    selected === "all"
      ? "All"
      : selected === "own"
        ? "You"
        : (() => {
            const sub = subs.find((s) => s.id === selected);
            return sub ? sub.title || new URL(sub.origin).host : "All";
          })();

  return `<button type="button" class="sources-toggle" aria-expanded="false" aria-controls="reading-sidebar">Sources &middot; <span class="current-source">${escapeHtml(selectedLabel)}</span></button>
<aside class="reading-sidebar" id="reading-sidebar">
<form class="add-feed" id="add-sub-form">
<input type="url" id="add-sub-url" placeholder="Add feed — any URL" required>
<button type="submit">resolve</button>
</form>
<div id="add-sub-confirm"></div>
<h2>Reading</h2>
<ul>
${link("all", "All", feed.length)}
${ownCount ? link("own", "You", ownCount) : ""}
</ul>
${rows.length ? `<h2>Subscriptions</h2>\n<ul>\n${rows.join("\n")}\n</ul>` : ""}
<p class="manage"><a href="${studioPath(mount)}/subs">manage feeds &rarr;</a></p>
</aside>`;
}

/** Which source is being shown: a subscription id, "own", or "all". */
function selectedSource(raw: string | undefined, subs: SubscriptionRow[]): string {
  if (raw === "own") return "own";
  if (raw && subs.some((s) => s.id === raw)) return raw;
  // An unknown or deleted subscription id falls back to All rather than to an
  // empty page that looks like a broken feed.
  return "all";
}

importerStudio.get("/reading", async (c) => {
  const mount = normalizeMount(c.env.MOUNT);
  const [own, imported, hoppers, subs, settings] = await Promise.all([
    ownEntries(c.env.DB),
    importedEntries(c.env.DB),
    listHoppers(c.env.DB),
    listSubscriptions(c.env.DB),
    getSettings(c.env.DB),
  ]);
  const ourOrigin = siteOrigin(settings, c.req.url, mount);
  const all = buildReadingFeed(own, imported);
  const selected = selectedSource(c.req.query("sub"), subs);
  const feed =
    selected === "all"
      ? all
      : selected === "own"
        ? all.filter((e) => e.source === "own")
        : all.filter((e) => e.imported?.subscriptionId === selected);
  // Paged: the merged feed grows without bound as subscriptions accumulate,
  // and every entry renders its full (clamped) content.
  const { page, pages, start } = readingPage(c.req.query("page"), feed.length);
  const rows = await Promise.all(feed.slice(start, start + READING_PAGE_SIZE).map((e) => readingEntryHtml(c.env.DB, e, hoppers, mount, ourOrigin, settings.timezone)));
  // The filter has to survive paging, or page 2 of one feed silently becomes
  // page 2 of everything.
  const suffix = selected === "all" ? "" : `&sub=${encodeURIComponent(selected)}`;
  const href = (p: number) => `${studioPath(mount)}/reading?page=${p}${suffix}`;
  const pager =
    pages > 1
      ? `<nav class="reading-pager">
<span>${page > 1 ? `<a href="${href(page - 1)}">&larr; newer</a>` : ""}</span>
<span class="pager-info">page ${page} of ${pages} &middot; ${feed.length} entries</span>
<span>${page < pages ? `<a href="${href(page + 1)}">older &rarr;</a>` : ""}</span>
</nav>`
      : "";
  const empty =
    selected === "all"
      ? "<p>Nothing to read yet — publish something, or add a feed on the left.</p>"
      : "<p>Nothing from this source yet. It may not have published since you subscribed.</p>";
  const body = `${studioHeader("blyg studio — reading", mount, "reading")}
<style>${READING_STYLE}</style>
<style>${SUBS_STYLE}</style>
<div class="reading-layout">
${readingSidebar(all, subs, selected, mount)}
<div class="reading-main">
${rows.length ? rows.join("\n") : empty}
${pager}
</div>
</div>
<script>${SIDEBAR_SCRIPT}</script>
<script>${READING_SCRIPT}</script>
<script>${stubScript(mount)}</script>
<script>${SUBS_SCRIPT}</script>`;
  return c.html(studioLayout("reading — blyg studio", body, true));
});

// --- Hoppers (task 10, §3.4) ---

const HOPPERS_STYLE = `
.hopper-row { border-top: 1px solid var(--rule); padding: 0.85rem 0; display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; }
.hopper-row .hopper-main { min-width: 0; flex: 1; }
.hopper-row .hopper-meta { font-size: 0.85rem; opacity: 0.7; margin: 0.15rem 0 0; }
.hopper-row .hopper-url { font-size: 0.85rem; margin: 0.15rem 0 0; }
.hopper-row .actions { display: flex; gap: 0.5rem; align-items: center; font-size: 0.85rem; flex-shrink: 0; }
.hopper-row .peek { margin: 0.45rem 0 0; padding: 0; list-style: none; font-size: 0.85rem; }
.hopper-row .peek li { opacity: 0.8; padding: 0.1rem 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.hopper-row .peek li .peek-title { font-weight: 600; }
.hopper-row .peek li .peek-src { opacity: 0.65; }
.hopper-row .peek .peek-more { opacity: 0.55; font-style: italic; }
.hopper-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap; margin-bottom: 0.75rem; }
.hopper-head .hopper-url, .hopper-head .hopper-meta { font-size: 0.85rem; opacity: 0.75; margin: 0.2rem 0 0; }
.hopper-head .actions { display: flex; gap: 0.5rem; align-items: center; font-size: 0.85rem; }
.rename-form { display: flex; gap: 0.4rem; align-items: center; }
.rename-form input { font: inherit; font-size: 0.9rem; padding: 0.2rem 0.4rem; border-radius: 4px; border: 1px solid var(--rule); background: transparent; color: inherit; }
.slug-note { font-size: 0.8rem; opacity: 0.6; }
`;

/**
 * One-line peek at what is in a hopper, for the list page — the same
 * rendered-HTML-derived preview the index rows use (`previewFromHtml`), never
 * an excerpt of markdown source. Shows source attribution too, since a
 * hopper's whole point is that its items come from elsewhere.
 */
const HOPPER_PEEK_ROWS = 3;

async function hopperPeek(db: D1Database, hopperId: string, titleOf: Map<string, string>): Promise<string> {
  const memberships = await listHopperItems(db, hopperId);
  if (!memberships.length) return "";
  const lines: string[] = [];
  for (const m of memberships.slice(0, HOPPER_PEEK_ROWS)) {
    const row = await getImportedItem(db, m.subscription_id, m.remote_id);
    if (!row) continue;
    const src = escapeHtml(titleOf.get(m.subscription_id) ?? m.subscription_id);
    if (row.state === "tombstone") {
      lines.push(`<li><span class="peek-src">${src}</span> &middot; <em>withdrawn by origin</em></li>`);
      continue;
    }
    const { title, body } = previewFromHtml(row.content_html, 80);
    const label = title ? `<span class="peek-title">${escapeHtml(title)}</span>` : escapeHtml(body);
    lines.push(`<li><span class="peek-src">${src}</span> &middot; ${label}</li>`);
  }
  const extra = memberships.length - lines.length;
  if (extra > 0) lines.push(`<li class="peek-more">+${extra} more</li>`);
  return `<ul class="peek">${lines.join("")}</ul>`;
}

/** Public-URL line: the address a public hopper actually lives at, or why it has none yet. */
function hopperUrlLine(hopper: HopperRow, mount: string): string {
  if (!hopper.public) {
    return `<p class="hopper-meta">Not public${hopper.slug_frozen ? ` &middot; was public at <code>${mount}/h/${escapeHtml(hopper.slug ?? "")}/</code>` : ""}</p>`;
  }
  return `<p class="hopper-url">Public at <a href="${mount}/h/${escapeHtml(hopper.slug ?? "")}/">${mount}/h/${escapeHtml(hopper.slug ?? "")}/</a></p>`;
}

function hoppersScript(mount: string): string {
  return `
document.addEventListener("submit", async (e) => {
  if (e.target.id !== "new-hopper-form") return;
  e.preventDefault();
  const name = document.getElementById("new-hopper-name").value.trim();
  if (!name) return;
  const res = await fetch("/api/hoppers", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name }) });
  if (res.ok) location.reload();
});
document.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  if (btn.dataset.action === "delete-hopper") {
    if (!confirm("Delete this hopper? Membership is removed locally; nothing public is affected.")) return;
    await fetch("/api/hoppers/" + btn.dataset.id, { method: "DELETE" });
    location.href = "${studioPath(mount)}/hoppers";
  } else if (btn.dataset.action === "remove-hopper-item") {
    await fetch("/api/hoppers/" + btn.dataset.hopper + "/items/" + btn.dataset.sub + "/" + btn.dataset.remote, { method: "DELETE" });
    location.reload();
  }
});
document.addEventListener("change", async (e) => {
  if (e.target.dataset.action !== "toggle-public") return;
  await fetch("/api/hoppers/" + e.target.dataset.id, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ public: e.target.checked }),
  });
  // Reload: publishing freezes the slug and gives the hopper a public URL,
  // both of which the page states in prose above.
  location.reload();
});
document.addEventListener("submit", async (e) => {
  if (e.target.dataset.action !== "rename-hopper") return;
  e.preventDefault();
  const name = e.target.elements.name.value.trim();
  if (!name) return;
  const res = await fetch("/api/hoppers/" + e.target.dataset.id, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: name }),
  });
  if (!res.ok) { alert("Rename failed."); return; }
  location.reload();
});
`;
}

importerStudio.get("/hoppers", async (c) => {
  const mount = normalizeMount(c.env.MOUNT);
  const [hoppers, subs] = await Promise.all([listHoppers(c.env.DB), listSubscriptions(c.env.DB)]);
  const titleOf = new Map(subs.map((sub) => [sub.id, sub.title || sub.origin]));
  const rows = await Promise.all(
    hoppers.map(async (h) => {
      const items = await listHopperItems(c.env.DB, h.id);
      const sources = new Set(items.map((m) => m.subscription_id)).size;
      const counts = `${items.length} item${items.length === 1 ? "" : "s"}${sources ? ` &middot; ${sources} source${sources === 1 ? "" : "s"}` : ""}`;
      return `<div class="hopper-row">
<div class="hopper-main">
<a href="${studioPath(mount)}/hoppers/${h.id}"><strong>${escapeHtml(h.name)}</strong></a>
<p class="hopper-meta">${counts} &middot; slug: <code>${escapeHtml(h.slug ?? "")}</code></p>
${hopperUrlLine(h, mount)}
${await hopperPeek(c.env.DB, h.id, titleOf)}
</div>
<div class="actions">
<label><input type="checkbox" data-action="toggle-public" data-id="${h.id}" ${h.public ? "checked" : ""}> public</label>
<button type="button" data-action="delete-hopper" data-id="${h.id}">delete</button>
</div>
</div>`;
    }),
  );
  const body = `${studioHeader("blyg studio — hoppers", mount, "hoppers")}
<style>${HOPPERS_STYLE}</style>
<form id="new-hopper-form" style="margin-bottom:1rem;">
<input type="text" id="new-hopper-name" placeholder="new hopper name" required>
<button type="submit">create</button>
</form>
${rows.length ? rows.join("\n") : "<p>No hoppers yet — add items to a hopper from the reading feed.</p>"}
<script>${hoppersScript(mount)}</script>`;
  return c.html(studioLayout("hoppers — blyg studio", body));
});

importerStudio.get("/hoppers/:id", async (c) => {
  const hopper = await getHopper(c.env.DB, c.req.param("id"));
  if (!hopper) return c.notFound();
  const mount = normalizeMount(c.env.MOUNT);
  const [memberships, subs, settings] = await Promise.all([
    listHopperItems(c.env.DB, hopper.id),
    listSubscriptions(c.env.DB),
    getSettings(c.env.DB),
  ]);
  const titleOf = new Map(subs.map((sub) => [sub.id, sub.title || sub.origin]));
  const originOf = new Map(subs.map((sub) => [sub.id, sub.origin]));
  const rows: string[] = [];
  for (const m of memberships) {
    const row = await getImportedItem(c.env.DB, m.subscription_id, m.remote_id);
    if (!row) continue;
    const withdrawn = row.state === "tombstone";
    const content = withdrawn
      ? row.pinned_version_retained !== null
        ? `<p style="opacity:0.7;font-style:italic;">withdrawn by origin — retained via a pin (v${row.pinned_version_retained})</p>${row.l0 ? row.content_html : await sanitizeHtml(row.content_html)}`
        : `<p>withdrawn by origin</p>`
      : row.l0
        ? row.content_html
        : await sanitizeHtml(row.content_html);
    // A hopper item is always someone else's — name the source and link its
    // origin, the same attribution the public hopper page carries (§4.2).
    const srcName = escapeHtml(titleOf.get(m.subscription_id) ?? m.subscription_id);
    const srcOrigin = originOf.get(m.subscription_id);
    const srcLabel = srcOrigin ? `<a href="${escapeHtml(srcOrigin)}">${srcName}</a>` : srcName;
    rows.push(`<div class="reading-entry">
<p class="byline"><span class="kind-chip">${row.kind}</span>${row.l0 ? ' <span class="l0-chip">legacy rss</span>' : ""} ${srcLabel} &middot; added ${formatDate(m.added_at, settings.timezone)}</p>
<div class="content">${content}</div>
<div class="entry-actions"><button type="button" data-action="remove-hopper-item" data-hopper="${hopper.id}" data-sub="${m.subscription_id}" data-remote="${m.remote_id}">remove from hopper</button> ${stubButton(m.subscription_id, m.remote_id)}</div>
</div>`);
  }
  const sources = new Set(memberships.map((m) => m.subscription_id)).size;
  const body = `${studioHeader(`blyg studio — ${hopper.name}`, mount, "hoppers")}
<style>${READING_STYLE}${HOPPERS_STYLE}</style>
<nav style="margin:-0.5rem 0 1rem;font-size:0.9rem;"><a href="${studioPath(mount)}/hoppers">← hoppers</a></nav>
<div class="hopper-head">
<div>
<form class="rename-form" data-action="rename-hopper" data-id="${hopper.id}">
<input type="text" name="name" value="${escapeHtml(hopper.name)}" required>
<button type="submit">rename</button>
</form>
<p class="hopper-meta">${rows.length} item${rows.length === 1 ? "" : "s"}${sources ? ` &middot; ${sources} source${sources === 1 ? "" : "s"}` : ""} &middot; slug: <code>${escapeHtml(hopper.slug ?? "")}</code>${hopper.slug_frozen ? ` <span class="slug-note">(frozen — renaming keeps this URL)</span>` : ""}</p>
${hopperUrlLine(hopper, mount)}
</div>
<div class="actions">
<label><input type="checkbox" data-action="toggle-public" data-id="${hopper.id}" ${hopper.public ? "checked" : ""}> public</label>
</div>
</div>
${rows.length ? rows.join("\n") : "<p>Nothing in this hopper yet.</p>"}
<script>${hoppersScript(mount)}</script>
<script>${stubScript(mount)}</script>`;
  return c.html(studioLayout(`${hopper.name} — blyg studio`, body, true));
});
