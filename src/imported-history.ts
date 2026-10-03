// History of an imported item, read from its origin on demand — the reader side
// of decision #40. The changelog is metadata the origin already publishes; the
// only content fetched is what the origin serves publicly: a pinned version's
// file (§8) or the current version's document. Unpinned history is withheld at
// the source, so nothing here could reach it, and nothing here tries.
//
// Read live rather than from the import: the importer stores the latest state,
// not the changelog, and a history view is opened rarely enough that one fetch
// on demand beats a column every poll would have to keep current.

import type { FetchLike } from "./importer/http.ts";
import type { SubscriptionRow } from "./types.ts";

export interface HistoryEntry {
  version: number;
  at: string;
  note: string | null;
  pinned: boolean;
  /** §16.6c: the publisher's studio wrote this note. */
  generated: boolean;
}

export interface ImportedHistory {
  current: number;
  withdrawn: boolean;
  changelog: HistoryEntry[];
}

export type FetchOutcome<T> = { ok: true; value: T } | { ok: false; status: 404 | 502; error: string };

async function fetchDoc(fetchFn: FetchLike, url: string): Promise<FetchOutcome<Record<string, unknown>>> {
  let res;
  try {
    res = await fetchFn(url, { headers: { Accept: "application/json" } });
  } catch (e) {
    return { ok: false, status: 502, error: `could not reach the origin: ${e instanceof Error ? e.message : String(e)}` };
  }
  if (res.status === 404) return { ok: false, status: 404, error: "the origin does not serve that document" };
  if (!res.ok) return { ok: false, status: 502, error: `the origin answered ${res.status}` };
  try {
    const doc = JSON.parse(await res.text());
    return doc && typeof doc === "object" ? { ok: true, value: doc } : { ok: false, status: 502, error: "the origin returned something other than an item document" };
  } catch {
    return { ok: false, status: 502, error: "the origin returned invalid JSON" };
  }
}

const int = (v: unknown) => (typeof v === "number" && Number.isInteger(v) && v > 0 ? v : null);

export async function fetchImportedHistory(fetchFn: FetchLike, sub: SubscriptionRow, id: string): Promise<FetchOutcome<ImportedHistory>> {
  const got = await fetchDoc(fetchFn, `${sub.origin}items/${id}.json`);
  if (!got.ok) return got;
  const doc = got.value;
  const current = int(doc.version);
  if (doc.id !== id || current === null) return { ok: false, status: 502, error: "the origin's document does not describe this item" };
  const raw = Array.isArray(doc.changelog) ? doc.changelog : [];
  const changelog: HistoryEntry[] = [];
  for (const e of raw as Record<string, unknown>[]) {
    const version = int(e?.version);
    if (version === null) continue;
    changelog.push({
      version,
      at: typeof e.at === "string" ? e.at : "",
      note: typeof e.note === "string" ? e.note : null,
      pinned: e.pinned === true,
      generated: e.generated === true,
    });
  }
  changelog.sort((a, b) => a.version - b.version);
  return { ok: true, value: { current, withdrawn: doc.kind === "withdrawn", changelog } };
}

export interface PublicVersion {
  version: number;
  content_md: string;
  note: string | null;
  /** True when served from `v{n}.json`; false when it is the current version's document. */
  pinned: boolean;
}

/**
 * One version's text, if the origin serves it publicly: the pinned file first,
 * then — when `version` is the current one — the item document. A 404 from both
 * is the origin keeping its history private, which is its right (§5.2).
 */
export async function fetchPublicVersion(fetchFn: FetchLike, sub: SubscriptionRow, id: string, version: number): Promise<FetchOutcome<PublicVersion>> {
  const pinned = await fetchDoc(fetchFn, `${sub.origin}items/${id}/v${version}.json`);
  if (pinned.ok && pinned.value.id === id && pinned.value.version === version && typeof pinned.value.content_md === "string") {
    return { ok: true, value: { version, content_md: pinned.value.content_md, note: typeof pinned.value.note === "string" ? pinned.value.note : null, pinned: true } };
  }
  const live = await fetchDoc(fetchFn, `${sub.origin}items/${id}.json`);
  if (!live.ok) return live;
  if (live.value.id === id && live.value.version === version && typeof live.value.content_md === "string" && live.value.kind !== "withdrawn") {
    return { ok: true, value: { version, content_md: live.value.content_md, note: null, pinned: false } };
  }
  return { ok: false, status: 404, error: `v${version} is neither pinned nor current, so its text is not public` };
}
