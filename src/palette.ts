export type Trigger = { form: "transclude" | "link"; query: string; start: number } | null;
export function paletteTrigger(text: string, caret: number, allowTransclude: boolean): Trigger {
  var lineStart = text.lastIndexOf("\n", caret - 1) + 1;
  var prefix = text.slice(lineStart, caret);
  var i = 0;
  while (i < prefix.length && (prefix.charAt(i) === " " || prefix.charAt(i) === "\t")) i++;
  // Own-line `![[` — the directive. Checked first: it is the narrower form,
  // and its own `[[` would otherwise be rejected by the `!` guard below.
  if (allowTransclude && prefix.slice(i, i + 3) === "![[" && prefix.indexOf("]", i + 3) < 0) {
    return { form: "transclude", query: prefix.slice(i + 3), start: lineStart };
  }
  var open = prefix.lastIndexOf("[[");
  if (open < 0) return null;
  // A closed `[[id]]` is finished, not being typed.
  if (prefix.indexOf("]", open + 2) >= 0) return null;
  // The `(?<!!)` lookbehind of LINK_INLINE: this is the directive's brackets,
  // or an inline `![[` TK source ref, neither of which takes a link insertion.
  if (open > 0 && prefix.charAt(open - 1) === "!") return null;
  return { form: "link", query: prefix.slice(open + 2), start: lineStart + open };
}

/** The picked id spliced in, with the caret left after the closing brackets. */
export function paletteInsert(text: string, caret: number, trigger: NonNullable<Trigger>, id: string) {
  var before = text.slice(0, trigger.start);
  var after = text.slice(caret);
  var insertion = (trigger.form === "transclude" ? "![[" : "[[") + id + "]]";
  return { text: before + insertion + after, caret: (before + insertion).length };
}
