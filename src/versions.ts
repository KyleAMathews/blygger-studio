import { CLIENT } from "./client.ts";

export type SemVer = [number, number, number];

/** `1.2.3` → [1,2,3]; anything else → null. Pre-release suffixes are ignored. */
export function parseVersion(raw: string): SemVer | null {
  const m = /(\d+)\.(\d+)\.(\d+)/.exec(raw.trim());
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

/** Negative if a < b, positive if a > b, 0 if equal. */
export function compareVersions(a: SemVer, b: SemVer): number {
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] - b[i];
  return 0;
}

/**
 * The highest release version a release feed names.
 *
 * Deliberately not "the first entry". Feed order is the publisher's choice, and
 * a re-published or back-dated release would put an old version on top; taking
 * the maximum cannot be fooled that way.
 *
 * Only where the feed names a release: a tag link (`/releases/tag/v0.68.0`), an
 * entry id ending in the tag (GitHub's `tag:github.com,2008:Repository/…/v0.68.0`),
 * or an entry title that begins with the version. Never the release notes: they
 * name other versions (the API contract's 6.0.0, a dependency's 4.13.18), and
 * scanning them made every Studio from 0.67.0 on think "6.0.0" was out
 * (session 78).
 */
export function latestInFeed(feedXml: string): SemVer | null {
  let best: SemVer | null = null;
  const named = /\/releases\/tag\/v?(\d+\.\d+\.\d+)\b|<id>[^<]*\/v?(\d+\.\d+\.\d+)\s*<\/id>|<title>\s*v?(\d+\.\d+\.\d+)\b/g;
  for (const match of feedXml.matchAll(named)) {
    const raw = match[1] ?? match[2] ?? match[3];
    const v = raw ? parseVersion(raw) : null;
    if (v && (!best || compareVersions(v, best) > 0)) best = v;
  }
  return best;
}

/**
 * Is `current` behind `latest`? Ahead counts as not-behind: someone running a
 * build newer than the newest release is a developer, and telling them to
 * downgrade would be nonsense.
 */
export function isBehind(current: string, latest: SemVer): boolean {
  const mine = parseVersion(current);
  return mine ? compareVersions(mine, latest) < 0 : false;
}

export type UpdateState = {
  /** Newest release seen, as text, or "" if never successfully checked. */
  latest: string;
  /** Whether this build is behind it. */
  behind: boolean;
  /** When we last asked, ISO, or "" for never. */
  checkedAt: string;
};

export function readState(map: Record<string, string>): UpdateState {
  const latest = map.update_latest_seen ?? "";
  const parsed = latest ? parseVersion(latest) : null;
  return {
    latest,
    behind: parsed ? isBehind(CLIENT.version, parsed) : false,
    checkedAt: map.update_checked_at ?? "",
  };
}
