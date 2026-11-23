// The Studio's own theme (session 78): studioTheme is empty by default, which
// wears the public theme; it takes auto, a preset or custom (only with a custom
// palette), and public pages keep using theme whatever it says.
import { describe, expect, it } from "vitest";
import { apiJson, getPublic, login } from "./helpers.ts";
import { THEMES } from "../src/themes.ts";

const settings = (cookie: string, body: unknown) => apiJson(cookie, "PATCH", "/blyg/api/settings", body);

describe("studioTheme", () => {
  it("defaults to empty, takes presets and auto, and refuses unknown names", async () => {
    const cookie = await login();
    expect((await apiJson(cookie, "GET", "/blyg/api/settings")).json.studioTheme).toBe("");
    expect((await settings(cookie, { studioTheme: "nord" })).json.studioTheme).toBe("nord");
    expect((await settings(cookie, { studioTheme: "auto" })).json.studioTheme).toBe("auto");
    expect((await settings(cookie, { studioTheme: "plaid" })).status).toBe(400);
    expect((await settings(cookie, { studioTheme: "" })).json.studioTheme).toBe("");
  });

  it("takes custom only with a custom palette, and keeps that palette while it is in use", async () => {
    const cookie = await login();
    await settings(cookie, { theme: "paper", customTheme: null, studioTheme: "" });
    expect((await settings(cookie, { studioTheme: "custom" })).status).toBe(400);
    const { label: _label, ...colours } = THEMES.cream!;
    expect((await settings(cookie, { customTheme: colours, studioTheme: "custom" })).status).toBe(200);
    expect((await settings(cookie, { customTheme: null })).status).toBe(400);
    await settings(cookie, { studioTheme: "", customTheme: null });
  });

  it("never reaches the public pages", async () => {
    const cookie = await login();
    await settings(cookie, { theme: "paper", studioTheme: "nord" });
    const css = await (await getPublic("/blyg/style.css")).text();
    expect(css).toContain(THEMES.paper!.paper);
    expect(css).not.toContain(THEMES.nord!.paper);
    await settings(cookie, { theme: "auto", studioTheme: "" });
  });
});
