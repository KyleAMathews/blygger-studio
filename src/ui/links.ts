/*
 * Links for the composers: tracker stripping and `[selection](url)` /
 * `<url>` insertion. Pure — no DOM, no network — so test-ui covers it.
 *
 * No page-title fetching: a link with nothing selected goes in as an
 * autolink. Fetching `<title>` needs a Worker route, which is held off.
 */

/** Query parameters that only track the click, never select the page. */
export const TRACKERS =
  /^(utm_\w+|fbclid|gclid|dclid|msclkid|mc_cid|mc_eid|igshid|si|ref_src|ref|_hsenc|_hsmi|mkt_tok)$/i;

/** A lone http(s) URL and nothing else (surrounding whitespace allowed). */
export function isUrl(text: string): boolean {
  return /^https?:\/\/\S+$/i.test(text.trim());
}

/**
 * `raw` with its tracking parameters removed, and how many went. Null when
 * it is not an http(s) URL. A URL with no trackers comes back exactly as
 * given (trimmed) — nothing re-serialised, nothing re-encoded.
 */
export function cleanUrl(raw: string): { url: string; removed: number } | null {
  const text = raw.trim();
  if (!isUrl(text)) return null;
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return null;
  }
  const trackers = [...new Set(url.searchParams.keys())].filter((key) => TRACKERS.test(key));
  if (!trackers.length) return { url: text, removed: 0 };
  let removed = 0;
  for (const key of trackers) {
    removed += url.searchParams.getAll(key).length;
    url.searchParams.delete(key);
  }
  return { url: url.toString().replace(/\?(?=#|$)/, ''), removed };
}

/** A URL made safe as a markdown link destination. */
function destination(url: string) {
  return url.replace(/[()<>\s]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0')}`);
}
/** Link text with its brackets escaped, so a `]` cannot end the link early. */
function label(text: string) {
  return text.replace(/[[\]\\]/g, (c) => `\\${c}`);
}

/** Markdown for a link: `[selection](url)`, or the autolink `<url>` when nothing is selected. */
export function linkMarkdown(url: string, selection = ''): string {
  return selection
    ? `[${label(selection)}](${destination(url)})`
    : `<${destination(url)}>`;
}

/**
 * Put a link for `raw` over [start, end) of `text`: the selected words become
 * the link text, or with no selection an autolink goes in at the caret.
 * Null when `raw` is not an http(s) URL.
 */
export function insertLink(text: string, start: number, end: number, raw: string) {
  const clean = cleanUrl(raw);
  if (!clean) return null;
  const selection = text.slice(start, end);
  const link = linkMarkdown(clean.url, selection);
  const before = text.slice(0, start);
  return {
    text: before + link + text.slice(end),
    caret: before.length + link.length,
    removed: clean.removed,
    linked: !!selection,
  };
}

/** The toast after a link goes in. */
export function linkToast(result: { removed: number; linked: boolean }) {
  const what = result.linked ? 'linked selection' : 'inserted link';
  return result.removed
    ? `${what} · ${result.removed} tracker${result.removed === 1 ? '' : 's'} removed`
    : what;
}
