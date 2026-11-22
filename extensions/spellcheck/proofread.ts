// The AI proofread's prompt and the reading of its answer. Pure, so test/spellcheck.test.ts holds it.

/** One call reads at most this much of a draft. */
export const MAX_PROOFREAD_CHARS = 24_000;
export const MAX_ISSUES = 60;

export const PROOFREAD_SYSTEM = `You proofread a draft written in markdown. Find spelling mistakes, typos, wrong or doubled words, and plain grammar errors. Leave alone: style and word choice, markdown and HTML syntax, links and URLs, anything inside [[ ]] or ![[ ]], code, [TK]…[/TK] scopes, lines of the form [label]: #, and names you do not know unless they are clearly misspelled.

Answer with a JSON array and nothing else. Each element is {"find": …, "replace": …, "why": …}:
- "find" is copied exactly from the draft, including punctuation and case: the error with a few words around it, so it occurs once in the draft.
- "replace" is that same text, corrected, changing nothing else.
- "why" is a few words, such as "spelling", "doubled word", "agreement".
At most ${MAX_ISSUES} elements. If there is nothing to fix, answer [].`;

/**
 * Whether a suggestion is a correction rather than a rewrite (spec §5.7 rule 10,
 * decision #115): an accepted correction goes into the text undisclosed, so the
 * proofread may only offer corrections. Between the words the two share at
 * either end, at most two may differ on each side: "the the" → "the" and
 * "they is" → "they are" pass; a reworded clause does not. A rewrite would be
 * model-composed text, which goes through [TK]impyrt instead.
 */
export const MAX_CHANGED_WORDS = 2;
export function isCorrection(find: string, replace: string): boolean {
  const a = find.split(/\s+/).filter(Boolean);
  const b = replace.split(/\s+/).filter(Boolean);
  let prefix = 0;
  while (prefix < a.length && prefix < b.length && a[prefix] === b[prefix]) prefix++;
  let suffix = 0;
  while (suffix < a.length - prefix && suffix < b.length - prefix && a[a.length - 1 - suffix] === b[b.length - 1 - suffix]) suffix++;
  return a.length - prefix - suffix <= MAX_CHANGED_WORDS && b.length - prefix - suffix <= MAX_CHANGED_WORDS;
}

export interface Issue {
  find: string;
  replace: string;
  why: string;
}

/** The issues in a model's answer that can be applied: found in the text, and changing something. */
export function readIssues(answer: string, text: string): Issue[] {
  const start = answer.indexOf("[");
  const end = answer.lastIndexOf("]");
  if (start < 0 || end <= start) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(answer.slice(start, end + 1));
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const seen = new Set<string>();
  const out: Issue[] = [];
  for (const raw of parsed) {
    if (!raw || typeof raw !== "object") continue;
    const { find, replace, why } = raw as Record<string, unknown>;
    if (typeof find !== "string" || typeof replace !== "string" || !find || find === replace || !text.includes(find) || seen.has(find)) continue;
    // A rewrite is not a correction (#115): dropped, never offered.
    if (!isCorrection(find, replace)) continue;
    seen.add(find);
    out.push({ find, replace, why: typeof why === "string" ? why.slice(0, 80) : "" });
    if (out.length >= MAX_ISSUES) break;
  }
  return out;
}
