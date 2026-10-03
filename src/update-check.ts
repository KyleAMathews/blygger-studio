// Is this build behind the latest release? (session 28)
//
// ── What this is not ─────────────────────────────────────────────────────────
// Not a wire surface. Venkat's session-26 ruling put the version alert
// directory-side and off the wire, and that stands: no manifest key, nothing a
// reader can see, nothing another client has to implement. Decision #18d governs
// the *protocol* version, which is a different question and is unaffected. This
// is the same public fact — what the latest release is — reaching the one person
// who can act on it, through the one surface only they look at.
//
// ── How drift is detected ────────────────────────────────────────────────────
// `CLIENT.version` is what this build *is*. The release feed says what the
// newest release *is*. Drift is a semver comparison of the two. Nothing about
// the running deployment is sent to learn this: it is an unauthenticated GET of
// a public feed, with no query string, no identifier and no blyg URL attached.
// The answer is cached and rendered locally.
//
// ── Why a feed, and why that feed ────────────────────────────────────────────
// GitHub's `releases.atom` is public, unauthenticated, unrate-limited in
// practice, and — usefully — the same Atom this client already knows how to
// read, because reading feeds is its day job. No API token, no new dependency,
// and it keeps working if we move off the GitHub API.
//
// The URL is a setting rather than a constant for one specific reason: **a
// modified client must not be told it is out of date by our releases.** A fork
// with its own `CLIENT.name` and its own version line should point at its own
// releases, or turn the check off. Comparing a fork's version against ours
// would be worse than useless — it would be confidently wrong.

import { putSettings } from "./model.ts";
import { CLIENT } from "./client.ts";
import type { Settings } from "./types.ts";

/** GitHub publishes one of these per repo, no auth required. */
export const DEFAULT_UPDATE_FEED = "https://github.com/blygger/blygger-studio/releases.atom";

/** Don't ask more than once a day. A release is not an urgent event. */
export const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;

export { parseVersion, compareVersions, latestInFeed, isBehind, readState, type SemVer, type UpdateState } from "./versions.ts";
import { latestInFeed } from "./versions.ts";

export function isDue(checkedAt: string, now: number): boolean {
  if (!checkedAt) return true;
  const at = Date.parse(checkedAt);
  return Number.isNaN(at) || now - at >= CHECK_INTERVAL_MS;
}

/**
 * Fetch the feed and return the newest version as text, or null on any failure.
 *
 * Never throws. An update check is a convenience, and a convenience that can
 * take down the studio page it decorates is a bug — a rate limit, a DNS
 * failure or GitHub being down must all read as "don't know yet", not as an
 * error the operator has to care about.
 */
export async function fetchLatest(
  settings: Pick<Settings, "update_feed_url">,
  fetchImpl: typeof fetch = fetch,
): Promise<string | null> {
  const url = settings.update_feed_url || DEFAULT_UPDATE_FEED;
  try {
    const res = await fetchImpl(url, {
      headers: {
        // Identifies the software, not the deployment: no origin, no blyg URL,
        // nothing that says which node is asking.
        "user-agent": `${CLIENT.name}/${CLIENT.version}`,
        accept: "application/atom+xml, application/xml;q=0.9, */*;q=0.8",
      },
    });
    if (!res.ok) return null;
    const found = latestInFeed(await res.text());
    return found ? found.join(".") : null;
  } catch {
    return null;
  }
}

/**
 * Run the check if it is enabled and due, and record the answer.
 *
 * Called from the studio index render and handed to `waitUntil`, so it never
 * delays the page: the banner shows what the *last* check found, and a check
 * that is running now lands on the next page view. An update notice is not
 * worth a slow studio.
 */
export async function maybeCheckForUpdate(
  db: D1Database,
  settings: Settings,
  map: Record<string, string>,
  now: number,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  if (!settings.update_check) return;
  if (!isDue(map.update_checked_at ?? "", now)) return;
  const latest = await fetchLatest(settings, fetchImpl);
  // The timestamp is written even on failure, so a node that cannot reach the
  // feed retries tomorrow rather than on every single page view.
  const patch: Record<string, string> = { update_checked_at: new Date(now).toISOString() };
  if (latest) patch.update_latest_seen = latest;
  await putSettings(db, patch);
}
