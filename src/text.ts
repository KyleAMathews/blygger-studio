// Text helpers with no runtime dependencies, so the Studio bundle can share them.

const graphemes = new Intl.Segmenter(undefined, { granularity: "grapheme" });

/**
 * The longest prefix of `s` no longer than `n` UTF-16 units that ends on a
 * grapheme boundary. `slice(0, n)` could split a surrogate pair (or a family
 * emoji), leaving a lone surrogate that UTF-8 can only encode as U+FFFD — in a
 * feed title, or frozen forever in a `cited.excerpt` (studio#15).
 */
export function graphemePrefix(s: string, n: number): string {
  if (s.length <= n) return s;
  let end = 0;
  for (const { index, segment } of graphemes.segment(s)) {
    if (index + segment.length > n) break;
    end = index + segment.length;
  }
  return s.slice(0, end);
}
