// Decision #114 (spec §16.15): a partial quote of list items bakes them as
// list items, the structure read from the target and never from the quoter;
// the bake's text content is its selector's exact, whatever its shape (§10.2).
import { describe, expect, it } from "vitest";
import { renderMarkdown, selectionLines, selectionText } from "../src/markdown.ts";
import { locateSelection, partialBakeBody, selectionFromQuote } from "../src/transclusion.ts";

// This file's one HTTP test imports ./helpers.ts lazily, so it pays the Worker
// entrypoint's cold load (deferred in CI since #177) inside its own budget: about
// 4.5 s on CI runners, against vitest's 5 s default (0.72.2's Check, session 87).
const ENTRYPOINT_TIMEOUT_MS = 30_000;

const SOURCES: Record<string, string> = {
  tight: "Intro line.\n\n- first bullet\n- second bullet\n  - nested bullet\n- third bullet\n\nAfter.",
  loose: "- first, loose\n\n  with a second paragraph\n\n- second, loose\n\n  - nested, loose\n\n- third",
  ordered: "Steps:\n\n1. one\n2. two\n3. three\n4. four",
  started: "7. seventh\n8. eighth\n9. ninth",
  mixed: "A paragraph.\n\n- a bullet\n- another\n\nA closing paragraph with <b>tags</b> & an ampersand.\n\n> a plain quote\n\n```\ncode line\n```",
};

describe("selectionLines", () => {
  it("reads exactly the lines selectionText reads, for every source", () => {
    for (const md of Object.values(SOURCES)) {
      const html = renderMarkdown(md);
      expect(selectionLines(html).map((l) => l.text).join("\n")).toBe(selectionText(html));
    }
  });

  it("places each line in its list and item, an ol's start counted in", () => {
    const lines = selectionLines(renderMarkdown(SOURCES.started!));
    expect(lines.map((l) => [l.text, l.lists.map((x) => [x.tag, x.ordinal])])).toEqual([
      ["seventh", [["ol", 7]]], ["eighth", [["ol", 8]]], ["ninth", [["ol", 9]]],
    ]);
  });
});

/** Every contiguous run of whole lines, and some partial ones: the invariant must hold for all. */
function selections(hay: string): string[] {
  const lines = hay.split("\n");
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++)
    for (let j = i; j < lines.length; j++) {
      out.push(lines.slice(i, j + 1).join("\n"));
      const run = lines.slice(i, j + 1).join("\n");
      if (run.length > 4) out.push(run.slice(2, -2));
    }
  return out;
}

describe("partialBakeBody", () => {
  it("keeps the invariant: its text is exact, for every selection of every source", () => {
    let checked = 0;
    for (const md of Object.values(SOURCES)) {
      const html = renderMarkdown(md);
      for (const exact of selections(selectionText(html))) {
        expect(selectionText(partialBakeBody(html, exact)), `${md} / ${exact}`).toBe(exact);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(100);
  });

  it("bakes quoted bullets as a list, and paragraphs around them as paragraphs", () => {
    const html = renderMarkdown(SOURCES.tight!);
    // A tight nested item is its own line (§2, decision #118), so the nesting is kept.
    expect(partialBakeBody(html, "Intro line.\nfirst bullet\nsecond bullet\nnested bullet")).toBe(
      "<p>Intro line.</p>\n<ul>\n<li>first bullet</li>\n<li><p>second bullet</p>\n<ul>\n<li>nested bullet</li>\n</ul></li>\n</ul>",
    );
  });

  it("numbers a quoted ordered run as the source does", () => {
    const html = renderMarkdown(SOURCES.ordered!);
    expect(partialBakeBody(html, "three\nfour")).toBe('<ol start="3">\n<li>three</li>\n<li>four</li>\n</ol>');
    expect(partialBakeBody(html, "one\ntwo")).toBe("<ol>\n<li>one</li>\n<li>two</li>\n</ol>");
  });

  it("keeps nesting when both lines are quoted, and invents no outer item", () => {
    const html = renderMarkdown(SOURCES.loose!);
    expect(partialBakeBody(html, "second, loose\nnested, loose")).toBe(
      "<ul>\n<li><p>second, loose</p>\n<ul>\n<li>nested, loose</li>\n</ul></li>\n</ul>",
    );
    // The nested line alone: its own list, no empty parent bullet.
    expect(partialBakeBody(html, "nested, loose")).toBe("<ul>\n<li>nested, loose</li>\n</ul>");
    // A loose item's two paragraphs stay in one item.
    expect(partialBakeBody(html, "first, loose\nwith a second paragraph")).toBe(
      "<ul>\n<li><p>first, loose</p>\n<p>with a second paragraph</p></li>\n</ul>",
    );
  });

  it("takes the structure from the target, not the quoter's markers", () => {
    const html = renderMarkdown(SOURCES.tight!);
    // Quoted as plain lines over a list: still a list.
    const plain = locateSelection(html, selectionFromQuote("first bullet\n\nsecond bullet\n\nnested bullet"))!;
    expect(partialBakeBody(html, plain.exact)).toContain("<ul>");
    // Quoted with markers over prose: still paragraphs.
    const prose = renderMarkdown(SOURCES.mixed!);
    const marked = locateSelection(prose, selectionFromQuote("- A paragraph."))!;
    expect(partialBakeBody(prose, marked.exact)).toBe("<p>A paragraph.</p>");
  });

  it("escapes text in list items as in paragraphs", () => {
    const html = renderMarkdown("- a <b> & c");
    expect(partialBakeBody(html, "a <b> & c")).toBe("<ul>\n<li>a &lt;b&gt; &amp; c</li>\n</ul>");
  });
});

describe("publishing a partial quote of a list", () => {
  it("publishes the quoted items as a list, with the selector unchanged", async () => {
    const { apiJson, createAndPublish, login } = await import("./helpers.ts");
    const cookie = await login();
    const source = await createAndPublish(cookie, "Steps:\n\n1. one\n2. two\n3. three\n4. four");
    const res = await apiJson(cookie, "POST", "/blyg/api/items", { contentMd: `The last two.\n\n![[${source}]]\n> 3. three\n> 4. four`, kind: "thread" });
    const published = await apiJson(cookie, "POST", `/blyg/api/items/${res.json.id}/publish`, {});
    expect(published.status, JSON.stringify(published.json)).toBe(200);
    const doc = await (await (await import("./helpers.ts")).getPublic(`/blyg/items/${res.json.id}.json`)).json() as { content_html: string; transclusions: { selector?: { exact: string } }[] };
    expect(doc.content_html).toContain('<blockquote class="blyg-transclusion blyg-partial"');
    expect(doc.content_html).toContain('<ol start="3">\n<li>three</li>\n<li>four</li>\n</ol>');
    expect(doc.transclusions[0]!.selector!.exact).toBe("three\nfour");
  }, ENTRYPOINT_TIMEOUT_MS);
});
