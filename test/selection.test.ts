// The selection normalizer (spec §16.4, decision #49, plan §7.3 P2).
//
// This function is the whole faithfulness guarantee of partial transclusion:
// publish checks `selectionText(selection)` against `selectionText(target)`,
// and any read-side re-check must call this and nothing else. Two normalizers
// that differ by one space would be a construct that verifies on the node that
// published it and fails on the node that received it, which is worse than not
// having the construct.
//
// So these tests are about the *rule*, not about any one call site: whitespace
// within a block collapses, block boundaries survive as line breaks, and
// nothing else makes it into the string.
import { describe, expect, it } from "vitest";
import { renderMarkdown, selectionText } from "../src/markdown.ts";

describe("blocks become line breaks, everything inside them collapses", () => {
  it("keeps one line per block", () => {
    expect(selectionText("<p>first</p>\n<p>second</p>")).toBe("first\nsecond");
  });

  it("collapses the newlines a renderer leaves inside a paragraph", () => {
    // markdown-it preserves the author's soft wraps inside <p>. If those became
    // line breaks, a match would depend on where the author pressed return —
    // which is not a property of the text, and would differ between the quoting
    // node and the quoted one.
    expect(selectionText("<p>one\ntwo\nthree</p>")).toBe("one two three");
  });

  it("collapses runs of spaces and tabs the same way", () => {
    expect(selectionText("<p>a   b\t\tc</p>")).toBe("a b c");
  });

  it("drops empty blocks rather than emitting blank lines", () => {
    expect(selectionText("<p>a</p><p></p><p>  </p><p>b</p>")).toBe("a\nb");
  });

  it("treats <br> as a block boundary", () => {
    expect(selectionText("<p>a<br>b</p>")).toBe("a\nb");
  });

  it("breaks list items apart", () => {
    expect(selectionText("<ul><li>one</li><li>two</li></ul>")).toBe("one\ntwo");
  });

  it("does not weld the end of one block to the start of the next", () => {
    // The defect this whole design avoids: "evil.Next" as a matchable string.
    expect(selectionText("<p>evil.</p><p>Next</p>")).not.toContain("evil.Next");
  });
});

describe("markup and entities", () => {
  it("strips inline formatting but keeps its text, unbroken", () => {
    // Emphasis inside a sentence must not introduce a boundary — <em> is not a
    // block, so the sentence stays one line and stays matchable.
    expect(selectionText("<p>the <em>thin</em> layer</p>")).toBe("the thin layer");
  });

  it("decodes the entities our renderer emits", () => {
    expect(selectionText("<p>a &amp; b &lt;c&gt; &quot;d&quot;</p>")).toBe('a & b <c> "d"');
  });

  it("keeps nested blocks as separate lines", () => {
    expect(selectionText("<blockquote><p>inner</p></blockquote><p>after</p>")).toBe("inner\nafter");
  });

  it("drops script and style content entirely", () => {
    expect(selectionText("<p>a</p><script>var x = 1;</script><p>b</p>")).toBe("a\nb");
  });

  it("is empty for markup with no text", () => {
    expect(selectionText("<p></p>")).toBe("");
    expect(selectionText("")).toBe("");
  });
});

describe("the two sides normalize to the same string", () => {
  // The property the publish check relies on: a quote typed by hand as markdown
  // and the target's stored HTML converge, so `includes` is a fair test.
  it("a quote of one paragraph matches that paragraph in the target", () => {
    const target = renderMarkdown("Stigmergy is what a protocol looks like from inside.\n\nAnd the rest.");
    const quote = renderMarkdown("Stigmergy is what a protocol looks like from inside.");
    expect(selectionText(target)).toContain(selectionText(quote));
  });

  it("matches although the author soft-wrapped the quote differently", () => {
    const target = renderMarkdown("Stigmergy is what a protocol looks like from inside.");
    const quote = renderMarkdown("Stigmergy is what a protocol\nlooks like from inside.");
    expect(selectionText(target)).toContain(selectionText(quote));
  });

  it("matches a quote spanning two paragraphs, because both sides break there", () => {
    const target = renderMarkdown("First paragraph here.\n\nSecond paragraph here.\n\nThird.");
    const quote = renderMarkdown("First paragraph here.\n\nSecond paragraph here.");
    expect(selectionText(target)).toContain(selectionText(quote));
  });

  it("does not match a quote that welds two paragraphs into one line", () => {
    const target = renderMarkdown("First paragraph here.\n\nSecond paragraph here.");
    // One block on the quote side, two on the target's — no line break where
    // the target has one, so this is correctly not a substring.
    const quote = renderMarkdown("First paragraph here. Second paragraph here.");
    expect(selectionText(target)).not.toContain(selectionText(quote));
  });

  it("matches although the quote uses different inline emphasis", () => {
    const target = renderMarkdown("the *thin* layer where coordination happens");
    const quote = renderMarkdown("the thin layer where coordination happens");
    expect(selectionText(target)).toContain(selectionText(quote));
  });
});
