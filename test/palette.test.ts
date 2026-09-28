// The bracket palette (session 28). Two things are under test here and they
// are deliberately different kinds of test:
//
//  1. `paletteTrigger` / `paletteInsert` — the pure half, compiled out of the
//     emitted script with `new Function` and called directly. This is the
//     behaviour half the house rule asks for: a markup assertion would pass
//     whether or not the palette ever fires on the right bracket form.
//  2. The panel's presence on all three composers, which is what the
//     carry-over was actually about — the picker existed and only one page
//     could reach it.
//
// The `![[` / `[[` pairing these functions implement is the client-side twin
// of DIRECTIVE_LINE and LINK_INLINE in transclusion.ts, so the cases below
// mirror that file's: own-line vs inline, and the `!` that separates them.
import { describe, expect, it } from "vitest";
import { SELF } from "cloudflare:test";
import { apiJson, createAndPublish, login, STUDIO } from "./helpers.ts";
import { paletteScript } from "../src/studio.ts";

type Trigger = { form: "transclude" | "link"; query: string; start: number } | null;

/**
 * Compile the emitted script and hand back its two pure functions. This works
 * only because `paletteScript` touches no DOM at load — the page calls
 * `installPalette` itself — and it doubles as a parse check on every edit to
 * that script, in the same spirit as inline-scripts.test.ts.
 */
const { trigger, insert } = (() => {
  const fn = new Function(paletteScript("/blyg") + "\nreturn { paletteTrigger, paletteInsert };");
  const api = fn() as {
    paletteTrigger: (text: string, caret: number, allowTransclude: boolean) => Trigger;
    paletteInsert: (
      text: string,
      caret: number,
      t: NonNullable<Trigger>,
      id: string,
    ) => { text: string; caret: number };
  };
  return { trigger: api.paletteTrigger, insert: api.paletteInsert };
})();

/** `|` marks the caret, which is how these cases are easiest to read. */
function at(withCaret: string, allowTransclude = true): Trigger {
  const caret = withCaret.indexOf("|");
  expect(caret, "the case must mark a caret").toBeGreaterThanOrEqual(0);
  return trigger(withCaret.replace("|", ""), caret, allowTransclude);
}

describe("paletteTrigger — which bracket form the caret is in", () => {
  it("offers the directive for `![[` alone on its line", () => {
    expect(at("![[|")).toMatchObject({ form: "transclude", query: "", start: 0 });
    expect(at("  ![[frag|")).toMatchObject({ form: "transclude", query: "frag" });
    // The insertion replaces from the line start, not from the `!`, so the
    // leading whitespace goes with it — a directive owns its whole line.
    expect(at("  ![[|")).toMatchObject({ start: 0 });
    expect(at("first line\n![[x|")).toMatchObject({ form: "transclude", start: 11 });
  });

  it("offers the link for `[[` anywhere, mid-sentence included", () => {
    expect(at("as I said in [[|")).toMatchObject({ form: "link", query: "", start: 13 });
    expect(at("[[abc|")).toMatchObject({ form: "link", query: "abc", start: 0 });
    expect(at("line one\nand [[q|")).toMatchObject({ form: "link", start: 13 });
  });

  it("never offers a link for the directive's own brackets", () => {
    // The client-side spelling of LINK_INLINE's `(?<!!)`. Without it, an
    // own-line `![[` on a page that does not allow transclusion would fall
    // through to the link form and insert `[[id]]` inside the `!`.
    expect(at("![[|", false)).toBeNull();
    expect(at("  ![[frag|", false)).toBeNull();
  });

  it("never offers anything for an inline `![[`, which is a TK source ref", () => {
    // Inside a [TK] scope an inline `![[id]]` is a source reference, not a
    // quote. Neither insertion is right for it, so the palette stays shut —
    // which is what the thread editor did before this refactor too.
    expect(at("see ![[|")).toBeNull();
    expect(at("[TK]summarise ![[x|")).toBeNull();
  });

  it("closes once the brackets are closed", () => {
    expect(at("[[abcdef]]|")).toBeNull();
    expect(at("![[abcdef]]|")).toBeNull();
    // A stray `]` means the author is typing something else.
    expect(at("[[ab]|")).toBeNull();
  });

  it("takes the innermost open `[[` when there are two on a line", () => {
    expect(at("[[aaa]] and [[bb|")).toMatchObject({ form: "link", query: "bb", start: 12 });
  });

  it("finds nothing when there are no brackets", () => {
    expect(at("ordinary prose|")).toBeNull();
    expect(at("one bracket [|")).toBeNull();
  });
});

describe("paletteInsert — the insertion matches the trigger", () => {
  const id = "7c9wk2n4h6q1x8v0z3m5rjy2ke";

  it("writes a directive over the whole line", () => {
    const text = "  ![[fr";
    const t = trigger(text, text.length, true)!;
    expect(insert(text, text.length, t, id)).toEqual({
      text: `![[${id}]]`,
      caret: `![[${id}]]`.length,
    });
  });

  it("writes a link in place, leaving the rest of the line alone", () => {
    const text = "as I said in [[fr and then some";
    const caret = "as I said in [[fr".length;
    const t = trigger(text, caret, false)!;
    expect(insert(text, caret, t, id)).toEqual({
      text: `as I said in [[${id}]] and then some`,
      caret: `as I said in [[${id}]]`.length,
    });
  });

  it("keeps everything before and after a multi-line insertion", () => {
    const text = "para one\n\nsee [[q\n\npara three";
    const caret = "para one\n\nsee [[q".length;
    const t = trigger(text, caret, true)!;
    expect(insert(text, caret, t, id).text).toBe(`para one\n\nsee [[${id}]]\n\npara three`);
  });
});

describe("every composer can reach the palette", () => {
  async function pages(): Promise<{ cookie: string; fragment: string; thread: string }> {
    const cookie = await login();
    const fragment = await createAndPublish(cookie, "a published fragment");
    const thread = (await apiJson(cookie, "POST", "/api/items", { content_md: "a thread", kind: "thread" })).json
      .id as string;
    return { cookie, fragment, thread };
  }
  const read = async (cookie: string, path: string) =>
    (await SELF.fetch(`https://example.com${path}`, { headers: { cookie } })).text();

  it("renders the panel on the index composer, the fragment editor and the thread editor", async () => {
    const { cookie, fragment, thread } = await pages();
    for (const path of [STUDIO, `${STUDIO}/edit/${fragment}`, `${STUDIO}/edit/${thread}`]) {
      const html = await read(cookie, path);
      expect(html, `${path}: no palette panel`).toContain('id="palette"');
      expect(html, `${path}: no palette results list`).toContain('id="palette-results"');
      expect(html, `${path}: palette not installed`).toContain("installPalette({");
      // The panel is absolutely positioned at its static position, so the box
      // it sits in has to establish one.
      expect(html, `${path}: palette container is not positioned`).toContain("position:relative;");
    }
  });

  it("offers the directive form on the thread editor only", async () => {
    const { cookie, fragment, thread } = await pages();
    expect(await read(cookie, `${STUDIO}/edit/${thread}`)).toContain("transclude: true");
    // A fragment never resolves `![[id]]` at publish — publishItem runs
    // resolveTransclusions for threads alone — so offering that insertion here
    // would write a line that publishes as literal text.
    expect(await read(cookie, `${STUDIO}/edit/${fragment}`)).toContain("transclude: false");
    expect(await read(cookie, STUDIO)).toContain("transclude: false");
  });

  it("no longer ships the dead search input", async () => {
    const { cookie, thread } = await pages();
    const html = await read(cookie, `${STUDIO}/edit/${thread}`);
    // It was focusable, looked like the query box, and was wired to nothing:
    // the query has always been the text in the textarea.
    expect(html).not.toContain('id="palette-search"');
    expect(html).toContain('id="palette-hint"');
  });
});

describe("the candidate list pages, and says so", () => {
  // Storage is shared across this file, so every case searches for its own
  // token rather than the whole blyg — otherwise the totals drift with
  // whatever the describes above happened to publish.
  const search = (cookie: string, q: string, offset?: number) =>
    apiJson(cookie, "GET", `${STUDIO}/fragments/search?q=${q}${offset === undefined ? "" : `&offset=${offset}`}`);

  it("caps a page at 20 but reports the true total", async () => {
    const cookie = await login();
    // 23 > one page, so the old silent slice would have looked identical to
    // "that is everything".
    for (let i = 0; i < 23; i++) await createAndPublish(cookie, `pagingtoken fragment number ${i}`);

    const first = await search(cookie, "pagingtoken");
    expect(first.json.results).toHaveLength(20);
    expect(first.json.total).toBe(23);
    expect(first.json.offset).toBe(0);
    expect(first.json.limit).toBe(20);

    const second = await search(cookie, "pagingtoken", 20);
    expect(second.json.results).toHaveLength(3);
    expect(second.json.total).toBe(23);
    expect(second.json.offset).toBe(20);

    // The two pages partition the list — no overlap, nothing dropped.
    const ids = [...first.json.results, ...second.json.results].map((r: { id: string }) => r.id);
    expect(new Set(ids).size).toBe(23);
  });

  it("an offset past the end is empty, not an error", async () => {
    const cookie = await login();
    await createAndPublish(cookie, "pastendtoken the only one");
    const res = await search(cookie, "pastendtoken", 500);
    expect(res.status).toBe(200);
    expect(res.json.results).toEqual([]);
    expect(res.json.total).toBe(1);
  });

  it("a junk offset reads as 0 rather than producing a hole", async () => {
    const cookie = await login();
    await createAndPublish(cookie, "junkoffsettoken the only one");
    for (const bad of ["abc", "-5", ""]) {
      const res = await apiJson(cookie, "GET", `${STUDIO}/fragments/search?q=junkoffsettoken&offset=${bad}`);
      expect(res.json.offset, bad).toBe(0);
      expect(res.json.results, bad).toHaveLength(1);
    }
  });

  it("the total counts matches, not the whole blyg", async () => {
    const cookie = await login();
    await createAndPublish(cookie, "alphatoken one");
    await createAndPublish(cookie, "alphatoken two");
    await createAndPublish(cookie, "betatoken three");
    const res = await search(cookie, "alphatoken");
    expect(res.json.total).toBe(2);
    expect(res.json.results).toHaveLength(2);
  });

  it("every composer ships the count line", async () => {
    const cookie = await login();
    const thread = (await apiJson(cookie, "POST", "/api/items", { content_md: "a thread", kind: "thread" })).json
      .id as string;
    for (const path of [STUDIO, `${STUDIO}/edit/${thread}`]) {
      const html = await (await SELF.fetch(`https://example.com${path}`, { headers: { cookie } })).text();
      expect(html, path).toContain('id="palette-foot"');
      expect(html, path).toContain('foot: document.getElementById("palette-foot")');
    }
  });
});
