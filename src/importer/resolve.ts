// Resolution algorithm — v0.2-plan.md §2.1, locked decision #17. Given any
// URL found out-of-band, deterministically and boundedly (<=6 fetches)
// determine what to subscribe to: normalize -> direct manifest probe ->
// feed-upgrade -> one-hop rel="blyg" probe -> conventional-mount probes ->
// RSS fallback. Subscription identity is always the final fetch origin,
// never the manifest's self-asserted `site` — a mirror must not inherit
// another origin's identity (§11.7).

import { parseFeed } from "./feed.ts";
import type { FetchLike, FetchResult } from "./http.ts";
import { platformFetch } from "./http.ts";

export type BlygManifestLike = Record<string, unknown> & { blyg: unknown };

export type ResolveResult =
  | { kind: "blyg"; origin: string; manifestUrl: string; manifest: BlygManifestLike; siteMismatch?: { asserted: string; actual: string } }
  | { kind: "rss"; feedUrl: string }
  | { kind: "failure"; tried: string[] };

interface LinkTag {
  rel: string;
  href: string;
  type: string;
}

/** Step 1: strip query/fragment, ensure a trailing "/". */
function normalizeOrigin(raw: string): string {
  const u = new URL(raw);
  u.search = "";
  u.hash = "";
  if (!u.pathname.endsWith("/")) u.pathname += "/";
  return u.toString();
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function isManifestLike(v: unknown): v is BlygManifestLike {
  return !!v && typeof v === "object" && "blyg" in (v as Record<string, unknown>);
}

type Found = { origin: string; manifestUrl: string; manifest: BlygManifestLike };

/**
 * Identity (§12.2, as §16.6e states it without the filename): the manifest's
 * final URL minus its last path segment. A manifest at `/blyg/blyg.json` gives
 * `/blyg/`; one at `/wp-json/blyg/v1/manifest` gives `/wp-json/blyg/v1/`.
 */
function identityOf(manifestUrl: string): string {
  const u = new URL(manifestUrl);
  u.pathname = u.pathname.replace(/[^/]*$/, "");
  u.search = "";
  u.hash = "";
  return u.toString();
}

/** Fetch `url`; if the body parses as a manifest, that is the manifest (§16.6e step 4). */
async function fetchManifestAt(url: string, fetchFn: FetchLike, tried: string[]): Promise<Found | null> {
  if (tried.includes(url)) return null;
  tried.push(url);
  let res: FetchResult;
  try {
    res = await fetchFn(url);
  } catch {
    return null;
  }
  if (!res.ok) return null;
  const parsed = safeJsonParse(await res.text().catch(() => ""));
  if (!isManifestLike(parsed)) return null;
  const at = res.url || url;
  return { origin: identityOf(at), manifestUrl: at, manifest: parsed };
}

/**
 * Fetch `{originUrl}blyg.json` and test parse-success — never Content-Type
 * (§2.1 step 2: dumb static hosts misreport it). Skips (no fetch) a URL
 * already recorded in `tried`, so callers get the "skip already-probed
 * URLs" rule (step 5) for free.
 */
async function probeManifest(
  originUrl: string,
  fetchFn: FetchLike,
  tried: string[],
): Promise<Found | null> {
  return fetchManifestAt(originUrl + "blyg.json", fetchFn, tried);
}

/** Compare the manifest's self-asserted `site` to resolved identity; never adopt it, only flag disagreement. */
function finalizeBlyg({ origin, manifestUrl, manifest }: Found): ResolveResult {
  const result: ResolveResult = { kind: "blyg", origin, manifestUrl, manifest };
  const asserted = typeof manifest.site === "string" ? manifest.site : undefined;
  if (asserted) {
    let normalizedAsserted: string | null;
    try {
      normalizedAsserted = normalizeOrigin(asserted);
    } catch {
      normalizedAsserted = null;
    }
    if (normalizedAsserted !== origin) {
      result.siteMismatch = { asserted, actual: origin };
    }
  }
  return result;
}

/**
 * Does `xml` parse as a feed (RSS 2.0 or Atom 1.0 — §3.5 L0 covers both),
 * and if so, does it carry `<blyg:manifest>` (§7 feed-upgrade)? Delegates to
 * the shared parser (feed.ts) rather than re-detecting the root shape here —
 * session 16 found this function had its own RSS-only duplicate of that
 * detection, which silently rejected Atom-only feeds at the resolve step
 * even after feed.ts itself learned to parse them.
 */
function extractFeedManifestUrl(xml: string): { isFeed: boolean; manifestUrl: string | null } {
  const parsed = parseFeed(xml);
  if (!parsed.ok) return { isFeed: false, manifestUrl: null };
  return { isFeed: true, manifestUrl: parsed.manifestUrl };
}

/** `<link>` tags of an HTML document, via HTMLRewriter (no DOM dependency). */
async function extractLinkTags(html: string): Promise<LinkTag[]> {
  const found: LinkTag[] = [];
  const rewriter = new HTMLRewriter().on("link", {
    element(el) {
      found.push({
        rel: el.getAttribute("rel") ?? "",
        href: el.getAttribute("href") ?? "",
        type: el.getAttribute("type") ?? "",
      });
    },
  });
  await rewriter.transform(new Response(html)).text();
  return found;
}

function hasRelToken(rel: string, token: string): boolean {
  return rel.toLowerCase().split(/\s+/).includes(token);
}

export async function resolve(inputUrl: string, fetchFn: FetchLike = platformFetch): Promise<ResolveResult> {
  const tried: string[] = [];

  // Step 1: normalize.
  let candidate: string;
  try {
    candidate = normalizeOrigin(inputUrl);
  } catch {
    return { kind: "failure", tried };
  }

  // Step 2: direct probe.
  const direct = await probeManifest(candidate, fetchFn, tried);
  if (direct) return finalizeBlyg(direct);

  // Steps 3/4: fetch the input URL itself once; branch on what it parses as.
  let l0FeedUrl: string | null = null;
  if (!tried.includes(inputUrl)) {
    let res: FetchResult | null = null;
    try {
      res = await fetchFn(inputUrl);
    } catch {
      res = null;
    }
    tried.push(inputUrl);
    if (res && res.ok) {
      const finalUrl = res.url || inputUrl;
      const bodyText = await res.text().catch(() => "");
      const feedProbe = extractFeedManifestUrl(bodyText);
      if (feedProbe.isFeed) {
        // Step 3: feed upgrade.
        if (feedProbe.manifestUrl) {
          const abs = new URL(feedProbe.manifestUrl, finalUrl).toString();
          const upgraded = await fetchManifestAt(abs, fetchFn, tried);
          if (upgraded) return finalizeBlyg(upgraded);
        }
        // No manifest link, or the upgrade fetch failed — hold as the L0 candidate, keep going.
        l0FeedUrl = finalUrl;
      } else {
        // Step 4: HTML rel probe. One hop only — the rel target's own HTML is never scanned.
        const links = await extractLinkTags(bodyText);
        const relBlyg = links.find((l) => hasRelToken(l.rel, "blyg") && l.href);
        if (relBlyg) {
          // §16.6e: fetch the href itself; if it parses as a manifest, that is
          // the manifest (a CMS may serve it at any path). Otherwise the href is
          // an origin base and blyg.json is appended, as before.
          let href: string | null = null;
          try {
            href = new URL(relBlyg.href, finalUrl).toString();
          } catch {
            href = null;
          }
          if (href) {
            const direct = await fetchManifestAt(href, fetchFn, tried);
            if (direct) return finalizeBlyg(direct);
            let hrefOrigin: string | null = null;
            try {
              hrefOrigin = normalizeOrigin(href);
            } catch {
              hrefOrigin = null;
            }
            if (hrefOrigin) {
              const relResult = await probeManifest(hrefOrigin, fetchFn, tried);
              if (relResult) return finalizeBlyg(relResult);
            }
          }
        }
        // Step 6 prep: standard RSS/Atom autodiscovery on this HTML.
        const relRss = links.find((l) => hasRelToken(l.rel, "alternate") && /rss|atom/.test(l.type) && l.href);
        if (relRss) {
          try {
            l0FeedUrl = new URL(relRss.href, finalUrl).toString();
          } catch {
            l0FeedUrl = null;
          }
        }
      }
    }
  }

  // Step 5: conventional-mount probes — courtesy fallback only (decision #14: the mount is free).
  const hostOrigin = new URL(candidate).origin;
  for (const base of [`${hostOrigin}/blyg/`, `${hostOrigin}/`]) {
    const r = await probeManifest(base, fetchFn, tried);
    if (r) return finalizeBlyg(r);
  }

  // Step 6: RSS fallback.
  if (l0FeedUrl) return { kind: "rss", feedUrl: l0FeedUrl };
  return { kind: "failure", tried };
}
