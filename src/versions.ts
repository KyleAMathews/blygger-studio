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
 * The highest version named anywhere in a release feed.
 *
 * Deliberately not "the first entry". Feed order is the publisher's choice, and
 * a re-published or back-dated release would put an old version on top; taking
 * the maximum cannot be fooled that way. Scans the whole document rather than
 * parsing Atom structurally, because every shape GitHub uses — entry titles,
 * `<id>` URNs, tag hrefs — carries the version, and the one thing we need is
 * the one thing all of them agree on.
 */
export function latestInFeed(feedXml: string): SemVer | null {
  let best: SemVer | null = null;
  for (const m of feedXml.matchAll(/\bv?(\d+\.\d+\.\d+)\b/g)) {
    const v = parseVersion(m[1]);
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
