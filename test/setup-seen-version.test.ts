// What's new after an upgrade (session 82): setupSeenVersion is the newest
// release whose setup the owner finished or dismissed. Empty on a fresh
// install; migration 0060 marks a node already past setup as having seen
// 0.71.0, so 0.72.0's additions are offered once.
import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { apiJson, login } from "./helpers.ts";
import migration0060 from "../migrations/0060_setup_seen_version.sql?raw";

const settings = (cookie: string, body: unknown) => apiJson(cookie, "PATCH", "/blyg/api/settings", body);
const seen = async () => (await env.DB.prepare("SELECT value FROM settings WHERE key = 'setup_seen_version'").first<{ value: string }>())?.value ?? null;
const run = async (sql: string) => { for (const statement of sql.split(/;\s*$/m).filter((part) => part.replace(/--.*$/gm, "").trim())) await env.DB.prepare(statement).run(); };

describe("setupSeenVersion", () => {
  it("is empty by default, takes a release version, and refuses anything else", async () => {
    const cookie = await login();
    await env.DB.prepare("DELETE FROM settings WHERE key = 'setup_seen_version'").run();
    expect((await apiJson(cookie, "GET", "/blyg/api/settings")).json.setupSeenVersion).toBe("");
    expect((await settings(cookie, { setupSeenVersion: "0.72.0" })).json.setupSeenVersion).toBe("0.72.0");
    expect((await settings(cookie, { setupSeenVersion: "latest" })).status).toBe(400);
    expect((await settings(cookie, { setupSeenVersion: "0.72" })).status).toBe(400);
    expect((await settings(cookie, { setupSeenVersion: "" })).json.setupSeenVersion).toBe("");
    // Not a setting with a default to reset to.
    expect((await apiJson(cookie, "GET", "/blyg/api/settings")).json.defaults).not.toHaveProperty("setupSeenVersion");
  });

  it("migration 0060 marks a node past setup as having seen 0.71.0, and leaves a fresh install empty", async () => {
    await env.DB.prepare("DELETE FROM settings WHERE key IN ('setup', 'setup_seen_version')").run();
    await run(migration0060);
    expect(await seen()).toBeNull();
    for (const state of ["done", "notice"]) {
      await env.DB.prepare("DELETE FROM settings WHERE key = 'setup_seen_version'").run();
      await env.DB.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('setup', ?)").bind(state).run();
      await run(migration0060);
      expect(await seen()).toBe("0.71.0");
    }
    // A version already recorded is kept.
    await env.DB.prepare("UPDATE settings SET value = '0.80.0' WHERE key = 'setup_seen_version'").run();
    await run(migration0060);
    expect(await seen()).toBe("0.80.0");
    await env.DB.prepare("DELETE FROM settings WHERE key IN ('setup', 'setup_seen_version')").run();
  });
});
