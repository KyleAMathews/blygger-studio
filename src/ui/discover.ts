/*
 * Discover (ROADMAP row 17, session 71): the pure half. The blygs listed on
 * blygger.com come from its /blygs.json, read from the owner's browser (it is
 * CORS-open), so there is no server route of its own. Subscribing goes through
 * the OPML import's paced createSubscription walk.
 *
 * The "new" view is the blygs the owner does not follow yet, newest listing
 * first, a page at a time (session 72: it had offered followed blygs too).
 * Which of them are new since the last visit is one timestamp, not a list of
 * everything seen: the listing date of the newest listing Discover has shown
 * (the discoverSeenAt setting), and a row listed after it gets a badge.
 * Listing dates come from the directory, so a clock on this device that is
 * wrong does not hide or repeat anything.
 */
import { feedKey } from './opml.ts';

export const DIRECTORY_URL = 'https://blygger.com/blygs.json';
/** Rows the "new" view shows at first, and adds on each "show more". */
export const PAGE_SIZE = 5;

export type ActivityLevel = 'high' | 'medium' | 'low';
export interface DirectoryBlyg {
  origin: string;
  title: string;
  home: string;
  feed: string | null;
  listedAt: string;
  activity: { level: ActivityLevel | null; events: number; lastPost: string | null };
  /** Who writes it and what publishes it: the directory's about line, the site's own say-so (blygger.com, session 82). */
  author: { name: string; url: string | null } | null;
  generator: { name: string; url: string | null } | null;
}

const httpUrl = (value: unknown): value is string => {
  if (typeof value !== 'string') return false;
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
};
const isoDate = (value: unknown): value is string => typeof value === 'string' && !Number.isNaN(Date.parse(value));

/**
 * The directory's `blygs`, in its order (most active first). A row missing
 * what a subscribe or a preview link needs is dropped, not guessed at: the
 * file is remote input like any other.
 */
export function parseDirectory(json: unknown): DirectoryBlyg[] {
  const rows = json && typeof json === 'object' && Array.isArray((json as { blygs?: unknown }).blygs)
    ? (json as { blygs: unknown[] }).blygs : null;
  if (!rows) throw new Error('blygger.com answered with something that is not its directory.');
  const out: DirectoryBlyg[] = [];
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const r = row as Record<string, unknown>;
    if (!httpUrl(r.origin) || !isoDate(r.listedAt)) continue;
    const a = (r.activity && typeof r.activity === 'object' ? r.activity : {}) as Record<string, unknown>;
    const level = a.level === 'high' || a.level === 'medium' || a.level === 'low' ? a.level : null;
    const author = (r.author && typeof r.author === 'object' ? r.author : {}) as Record<string, unknown>;
    const named = (value: unknown) => typeof value === 'string' && value.trim() ? value.trim().slice(0, 120) : null;
    out.push({
      origin: r.origin,
      title: typeof r.title === 'string' && r.title.trim() ? r.title.trim() : new URL(r.origin).host,
      home: httpUrl(r.home) ? r.home : r.origin,
      feed: httpUrl(r.feed) ? r.feed : null,
      listedAt: r.listedAt,
      activity: {
        level,
        events: typeof a.events === 'number' ? a.events : 0,
        lastPost: isoDate(a.lastPost) ? a.lastPost : null,
      },
      // A directory older than these fields, or a blyg that names no author, gives null.
      author: named(author.name) ? { name: named(author.name)!, url: httpUrl(author.url) ? author.url : null } : null,
      generator: named(r.generator) ? { name: named(r.generator)!, url: httpUrl(r.generatorUrl) ? r.generatorUrl : null } : null,
    });
  }
  return out;
}

/** Newest listing first; the directory's own order (most active first) breaks ties. */
export function byListing(blygs: readonly DirectoryBlyg[]): DirectoryBlyg[] {
  return blygs.map((b, i) => ({ b, i, at: Date.parse(b.listedAt) })).sort((x, y) => y.at - x.at || x.i - y.i).map(({ b }) => b);
}

/** Listed after the newest listing already shown; with nothing shown yet, every listing is new. */
export function isNew(blyg: DirectoryBlyg, seenAt: string): boolean {
  return !seenAt || Date.parse(blyg.listedAt) > Date.parse(seenAt);
}

/** What discoverSeenAt becomes once these have been shown: the newest listing date, never moving backwards. */
export function nextSeenAt(blygs: readonly DirectoryBlyg[], seenAt: string): string {
  let newest = seenAt && !Number.isNaN(Date.parse(seenAt)) ? Date.parse(seenAt) : -Infinity;
  for (const b of blygs) newest = Math.max(newest, Date.parse(b.listedAt));
  return Number.isFinite(newest) ? new Date(newest).toISOString() : seenAt;
}

/** Followed already, by origin or by feed, under the same spelling rules as the OPML import. */
export function isSubscribed(blyg: DirectoryBlyg, keys: ReadonlySet<string>): boolean {
  return keys.has(feedKey(blyg.origin)) || (blyg.feed !== null && keys.has(feedKey(blyg.feed)));
}

/** The owner's own blyg is listed too; it is never offered to them. */
export function isSelf(blyg: DirectoryBlyg, ownOrigin: string): boolean {
  return feedKey(blyg.origin) === feedKey(ownOrigin);
}

export function ago(iso: string, now: number): string {
  const days = Math.floor((now - Date.parse(iso)) / 86_400_000);
  if (days < 1) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return months === 1 ? 'a month ago' : `${months} months ago`;
  const years = Math.floor(days / 365);
  return years <= 1 ? 'a year ago' : `${years} years ago`;
}

/** The words beside a row's activity badge: when it last posted, or that nobody has measured it. */
export function activityLine(blyg: DirectoryBlyg, now: number): string {
  const { level, lastPost } = blyg.activity;
  if (!level) return 'activity not measured yet';
  return lastPost ? `last post ${ago(lastPost, now)}` : `${level} activity`;
}
