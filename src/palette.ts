import { labelText } from "./grammar.ts";

export type Trigger = { form: "transclude" | "link" | "source"; query: string; start: number } | null;

/**
 * Whether the caret sits in an open `[TK]` scope's instruction: after its
 * `[TK]`, before any `[=]` or `[/TK]`. Sources come from the instruction only
 * (decision #60), and an impyrt scope declares none.
 */
function inTkInstruction(text: string, caret: number): boolean {
  var before = text.slice(0, caret);
  var open = before.lastIndexOf("[TK]");
  if (open < 0) return false;
  var tail = before.slice(open + 4);
  return tail.indexOf("[=]") < 0 && tail.indexOf("[/TK]") < 0 && !/^\s*impyrt\b/.test(tail);
}
export function paletteTrigger(text: string, caret: number, allowTransclude: boolean): Trigger {
  var lineStart = text.lastIndexOf("\n", caret - 1) + 1;
  var prefix = text.slice(lineStart, caret);
  var i = 0;
  while (i < prefix.length && (prefix.charAt(i) === " " || prefix.charAt(i) === "\t")) i++;
  // Own-line `![[` — the directive. Checked first: it is the narrower form,
  // and its own `[[` would otherwise be rejected by the `!` guard below. Not
  // inside a scope's instruction, where even an own-line `![[` is a source.
  if (allowTransclude && prefix.slice(i, i + 3) === "![[" && prefix.indexOf("]", i + 3) < 0 && !inTkInstruction(text, caret)) {
    return { form: "transclude", query: prefix.slice(i + 3), start: lineStart };
  }
  var open = prefix.lastIndexOf("[[");
  if (open < 0) return null;
  // A closed `[[id]]` is finished, not being typed.
  if (prefix.indexOf("]", open + 2) >= 0) return null;
  // The `(?<!!)` lookbehind of LINK_INLINE: this is the directive's brackets,
  // or an inline `![[` TK source ref, neither of which takes a link insertion.
  // Inside a scope's instruction it is a source ref (any item a directive may
  // name, since #44), inserted in place; anywhere else, nothing.
  if (open > 0 && prefix.charAt(open - 1) === "!") {
    if (!inTkInstruction(text, caret)) return null;
    return { form: "source", query: prefix.slice(open + 2), start: lineStart + open - 1 };
  }
  return { form: "link", query: prefix.slice(open + 2), start: lineStart + open };
}

/**
 * The picked id spliced in, with the caret left after the closing brackets.
 * With a label (decision #70) every form is written long, `[[id | label]]`:
 * on a link it is the anchor text readers get, on a quote or a source a note
 * that keeps the source readable for the author. The picker passes the text
 * the link would have shown anyway, so nothing changes until it is edited.
 */
export function paletteInsert(text: string, caret: number, trigger: NonNullable<Trigger>, id: string, label?: string) {
  var before = text.slice(0, trigger.start);
  var after = text.slice(caret);
  var l = label === undefined ? "" : labelText(label);
  var insertion = (trigger.form === "link" ? "[[" : "![[") + id + (l ? " | " + l : "") + "]]";
  return { text: before + insertion + after, caret: (before + insertion).length };
}
