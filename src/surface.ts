// Where another blyg's surface lives — spec §16.6e, decision #51 (the reader
// half; v0.4-plan.md §7.5 M1). A manifest MAY say where its feed, archive
// index, item documents and pins are, as origin-relative or absolute URLs and,
// for `item` and `pin`, RFC 6570 level-1 templates. Absent keys mean the
// default paths, which is every blyg built before 0.4 and this client's own.
//
// Every place that builds a URL for someone else's item or pin goes through
// `itemUrl` / `pinUrl` here, so a templated blyg works the same in the
// importer, the staleness check, imported history, forks and verification.
// Our own surface is never templated (we emit no template keys).

import type { FetchLike } from "./importer/http.ts";

/** The non-default locations a manifest declared; every key optional. */
export interface Surface {
  /** The manifest's own URL, when it is not `{origin}blyg.json`. */
  manifest?: string;
  feed?: string;
  items?: string;
  /** Template with `{id}`. */
  item?: string;
  /** Template with `{id}` and `{n}`. */
  pin?: string;
}

export const DEFAULTS = {
  feed: "feed.xml",
  items: "items/index.json",
  item: "items/{id}.json",
  pin: "items/{id}/v{n}.json",
} as const;

/**
 * RFC 6570 level 1 (simple string expansion): each `{name}` becomes the value
 * with every character outside the unreserved set percent-encoded. Unknown
 * names expand to the empty string, as the RFC says for undefined variables.
 */
export function expandTemplate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{([A-Za-z0-9_]+)\}/g, (_, name: string) => {
    const v = vars[name];
    return v === undefined ? "" : encodeUnreserved(String(v));
  });
}

function encodeUnreserved(value: string): string {
  return Array.from(new TextEncoder().encode(value), (b) => {
    const c = String.fromCharCode(b);
    return /[A-Za-z0-9\-._~]/.test(c) ? c : `%${b.toString(16).toUpperCase().padStart(2, "0")}`;
  }).join("");
}

/** Resolve an origin-relative or absolute value against the identity origin. */
function resolveAgainst(origin: string, value: string): string {
  return new URL(value, origin.endsWith("/") ? origin : `${origin}/`).toString();
}

export function itemUrl(origin: string, surface: Surface | null | undefined, id: string): string {
  return resolveAgainst(origin, expandTemplate(surface?.item ?? DEFAULTS.item, { id }));
}

export function pinUrl(origin: string, surface: Surface | null | undefined, id: string, n: number): string {
  return resolveAgainst(origin, expandTemplate(surface?.pin ?? DEFAULTS.pin, { id, n }));
}

export function indexUrl(origin: string, surface: Surface | null | undefined): string {
  return resolveAgainst(origin, surface?.items ?? DEFAULTS.items);
}

export function feedUrl(origin: string, surface: Surface | null | undefined): string {
  return resolveAgainst(origin, surface?.feed ?? DEFAULTS.feed);
}

export function manifestUrl(origin: string, surface: Surface | null | undefined): string {
  return surface?.manifest ?? resolveAgainst(origin, "blyg.json");
}

/**
 * The non-default locations in a fetched manifest, or null when it declares
 * none (so the subscription row stores NULL, meaning defaults). `manifestAt`
 * is the URL the manifest was actually fetched from.
 */
export function surfaceFromManifest(origin: string, manifestAt: string, manifest: Record<string, unknown>): Surface | null {
  const s: Surface = {};
  if (manifestAt !== resolveAgainst(origin, "blyg.json")) s.manifest = manifestAt;
  for (const key of ["feed", "items", "item", "pin"] as const) {
    const v = manifest[key];
    if (typeof v === "string" && v.trim() && v !== DEFAULTS[key]) s[key] = v.trim();
  }
  return Object.keys(s).length ? s : null;
}

export function parseSurface(raw: string | null | undefined): Surface | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as unknown;
    return v && typeof v === "object" ? (v as Surface) : null;
  } catch {
    return null;
  }
}

/** A subscription's stored surface for `origin`, with no network: null means defaults. */
export async function storedSurface(db: D1Database, origin: string): Promise<Surface | null> {
  const row = await db
    .prepare("SELECT surface FROM subscriptions WHERE kind = 'blyg' AND origin = ? LIMIT 1")
    .bind(origin)
    .first<{ surface: string | null }>();
  return parseSurface(row?.surface);
}

/**
 * Fetch a document on another blyg — an item or a pin — at the place its
 * surface says. A subscribed origin's stored surface is used directly (one
 * fetch). For an origin we do not subscribe to, the default path is tried
 * first, so an ordinary blyg costs nothing extra; only when that fails is the
 * manifest read and the templated URL tried (§16.6e: "one cached fetch per
 * unknown origin"). Returns the last response and the URL it came from;
 * throws what `fetchFn` throws.
 */
export async function fetchOnSurface(
  db: D1Database,
  origin: string,
  fetchFn: FetchLike,
  locate: (surface: Surface | null) => string,
  init?: Parameters<FetchLike>[1],
): Promise<{ res: Awaited<ReturnType<FetchLike>>; url: string }> {
  const row = await db
    .prepare("SELECT surface FROM subscriptions WHERE kind = 'blyg' AND origin = ? LIMIT 1")
    .bind(origin)
    .first<{ surface: string | null }>();
  const first = locate(row ? parseSurface(row.surface) : null);
  const res = await fetchFn(first, init);
  if (res.ok || row) return { res, url: first };
  const surface = await fetchSurface(origin, fetchFn);
  const second = surface ? locate(surface) : first;
  if (second === first) return { res, url: first };
  return { res: await fetchFn(second, init), url: second };
}

/** Fetch `{origin}blyg.json` and read its surface; null (defaults) on any failure. */
export async function fetchSurface(origin: string, fetchFn: FetchLike): Promise<Surface | null> {
  const url = resolveAgainst(origin, "blyg.json");
  try {
    const res = await fetchFn(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const manifest = JSON.parse(await res.text()) as unknown;
    if (!manifest || typeof manifest !== "object") return null;
    return surfaceFromManifest(origin, res.url || url, manifest as Record<string, unknown>);
  } catch {
    return null;
  }
}
