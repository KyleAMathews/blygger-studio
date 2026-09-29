// The studio top menu and its two collapses (session 29).
//
// The menu is the only chrome that every studio page carries, and below 640px
// it is hidden by CSS until a button shows it. That makes it the one piece of
// UI where a broken wire between markup, stylesheet and script does not
// degrade — it strands you on whatever page you are on with no way off. These
// tests pin the wire, not the appearance:
//
//   * the button names a target that exists on the same page,
//   * the script moves the class the stylesheet is looking for,
//   * and the hiding rule is gated on a marker that only a scripted browser
//     sets, so JS-off keeps a plain navigable row.
import { SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { apiJson, BASE, login, STUDIO } from "./helpers.ts";

const PAGES = ["", "/reading", "/hoppers", "/mentions", "/settings", "/syntax", "/subs"];

async function studioPage(cookie: string, path: string): Promise<string> {
  const res = await SELF.fetch(`${BASE}${STUDIO}${path}`, { headers: { cookie } });
  expect(res.status, path).toBe(200);
  return res.text();
}

describe("the menu is a menu, not a row of links", () => {
  it("renders the sections as a list inside a named nav", async () => {
    const html = await studioPage(await login(), "");
    expect(html).toContain('<nav id="studio-menu">');
    expect(html).toContain('<ul class="menu-main">');
    // Six sections, six list items in the main group.
    const main = html.slice(html.indexOf('<ul class="menu-main">'), html.indexOf("</ul>"));
    expect(main.match(/<li>/g)).toHaveLength(6);
  });

  it("separates the utilities from the sections", async () => {
    const html = await studioPage(await login(), "");
    const utility = html.slice(html.indexOf('<div class="menu-utility">'));
    expect(utility).toContain("public page");
    expect(utility).toContain("log out");
    // Neither is a section: they must not sit in the tab list, where the
    // current-tab highlight would be able to land on them.
    const main = html.slice(html.indexOf('<ul class="menu-main">'), html.indexOf("</ul>"));
    expect(main).not.toContain("log out");
    expect(main).not.toContain("public page");
  });
});

describe("the collapse is wired end to end", () => {
  it.each(PAGES)("%s: the button names a target that is on the page", async (path) => {
    const html = await studioPage(await login(), path);
    const m = /<button[^>]*class="menu-button"[^>]*aria-controls="([^"]+)"/.exec(html);
    expect(m, `${path}: no menu button`).not.toBeNull();
    const target = m![1];
    expect(html, `${path}: aria-controls="${target}" names nothing`).toContain(`id="${target}"`);
  });

  it("the script toggles the class the stylesheet reveals on", async () => {
    const html = await studioPage(await login(), "");
    // The stylesheet hides the nav and un-hides it on .open …
    expect(html).toContain("html.js header.studio nav { display: none; }");
    expect(html).toContain("html.js header.studio nav.open { display: flex; }");
    // … and the script is what puts .open there. Without this pairing the
    // button is a no-op and the menu is unreachable below the breakpoint.
    const script = html.slice(html.indexOf('.querySelector(".menu-button")'));
    expect(script).toContain('classList.toggle("open")');
    expect(script).toContain('setAttribute("aria-expanded"');
  });

  it("hides the menu only for a browser that can bring it back", async () => {
    const html = await studioPage(await login(), "");
    const head = html.slice(0, html.indexOf("</head>"));
    // The marker is set in the head, before the stylesheet that reads it:
    // later and a phone paints an expanded menu and then collapses it.
    expect(head).toContain('document.documentElement.classList.add("js")');
    expect(head.indexOf("classList.add")).toBeLessThan(head.indexOf("<style>"));
    // Every hiding rule is qualified by the marker. An unqualified one would
    // hide the nav from a browser with no way to toggle it back.
    const style = html.slice(html.indexOf("<style>"), html.indexOf("</style>"));
    const hides = style.match(/[^\n{}]*header\.studio nav[^\n{}]*\{\s*display: none;/g) ?? [];
    expect(hides.length).toBeGreaterThan(0);
    for (const rule of hides) expect(rule).toContain("html.js");
  });

  it("the button starts closed", async () => {
    const html = await studioPage(await login(), "");
    expect(html).toMatch(/<button[^>]*class="menu-button"[^>]*aria-expanded="false"/);
  });
});

describe("the reading sidebar collapses the same way", () => {
  it("offers a control that names the source you are filtered to", async () => {
    const cookie = await login();
    const html = await studioPage(cookie, "/reading");
    expect(html).toContain('class="sources-toggle"');
    expect(html).toContain('<span class="current-source">All</span>');
    const m = /<button[^>]*class="sources-toggle"[^>]*aria-controls="([^"]+)"/.exec(html);
    expect(m).not.toBeNull();
    expect(html).toContain(`id="${m![1]}"`);
  });

  it("the label follows the filter — a collapsed sidebar still says where you are", async () => {
    const cookie = await login();
    await apiJson(cookie, "POST", "/api/items", { content_md: "mine" });
    const html = await studioPage(cookie, "/reading?sub=own");
    expect(html).toContain('<span class="current-source">You</span>');
  });

  it("is gated on the same marker, and the script moves the same class", async () => {
    const html = await studioPage(await login(), "/reading");
    expect(html).toContain("html.js .reading-sidebar { display: none; }");
    expect(html).toContain("html.js .reading-sidebar.open { display: block; }");
    const script = html.slice(html.indexOf('.querySelector(".sources-toggle")'));
    expect(script).toContain('classList.toggle("open")');
  });
});
