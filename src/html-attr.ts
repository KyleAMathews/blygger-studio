/**
 * One attribute's value from a single start tag, in any of HTML's three forms:
 * double-quoted, single-quoted, or unquoted (Hugo's minifier writes
 * `href=https://…`, studio#181); an unquoted value ends at whitespace or `>`,
 * as a browser reads it. The name must stand on its own, so `href`
 * never matches inside `data-href`. `&amp;` is decoded, as a browser would.
 * Null when the tag does not carry it.
 */
export function tagAttribute(tag: string, name: string): string | null {
  const m = new RegExp(`[\\s"'/]${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i").exec(tag);
  return m ? (m[1] ?? m[2] ?? m[3]).replace(/&amp;/gi, "&") : null;
}

/** The attribute's space-separated tokens, lowercased (`rel`). */
export function tagTokens(tag: string, name: string): string[] {
  return (tagAttribute(tag, name) ?? "").toLowerCase().split(/\s+/).filter(Boolean);
}
