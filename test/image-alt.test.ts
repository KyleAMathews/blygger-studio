// studio#6: alt text holds what the visible text would.
import { describe, expect, it } from "vitest";
import { renderMarkdown } from "../src/markdown.ts";

describe("image alt text", () => {
  it("keeps backslash escapes and entities", () => {
    expect(renderMarkdown("![a \\* b](https://example.com/x.png)")).toContain('alt="a * b"');
    expect(renderMarkdown("![fish &amp; chips](https://example.com/x.png)")).toContain('alt="fish &amp; chips"');
    expect(renderMarkdown("![\\[draft\\]](https://example.com/x.png)")).toContain('alt="[draft]"');
  });

  it("keeps emphasis text and code, and nested images' alt", () => {
    expect(renderMarkdown("![an *emphatic* `code` alt](https://example.com/x.png)")).toContain('alt="an emphatic code alt"');
  });

  it("matches what the same words read as outside an image", () => {
    expect(renderMarkdown("a \\* b")).toContain("<p>a * b</p>");
  });
});
