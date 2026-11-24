import { fixtureJson } from './api-fixture';
import { test, expect } from "./fixture";
import { openCard } from "./editor.ts";

// The history card's private versions (decision #94, Venkat 2026-11-23): p1,
// p2, … with their notes, viewable, and still listed once the item is public.
test.describe("private history", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/studio/login");
    await page.locator('[name="password"]').fill("test-password");
    await page.getByRole("button", { name: "log in", exact: true }).click();
    await expect(page.locator("#composer-text")).toBeVisible();
  });

  const apiFor = (page: import("@playwright/test").Page) => (m: string, p: string, d?: unknown) =>
    page.evaluate(fixtureJson, { method: m, path: '/api' + p, body: d }).then(result => result.json);

  test("a private item lists p2 and p1, shows each, and keeps them after going public", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const api = apiFor(page);
    const id = (await api("POST", "/items", { contentMd: `Private history first ${Date.now()}` })).id;
    await api("POST", `/items/${id}/publish`, { visibility: "private", note: "first private note" });
    await api("PATCH", `/items/${id}`, { contentMd: "Private history second text" });
    await api("POST", `/items/${id}/publish`, { visibility: "private", note: "second private note" });

    await page.goto(`/studio/edit/${id}`);
    await openCard(page, 'history');
    const rows = page.locator('[data-private-history] .h-row');
    await expect(rows).toHaveCount(2);
    await expect(rows.nth(0)).toContainText("p2");
    await expect(rows.nth(0)).toContainText("second private note");
    await expect(rows.nth(1)).toContainText("p1");
    await expect(page.locator('[data-action="view-version"]')).toHaveCount(0);
    await rows.nth(0).locator('[data-action="view-private-version"]').click();
    await expect(page.getByRole("dialog")).toContainText("version p2");
    await expect(page.locator("#h-viewer-body")).toContainText("Private history second text");
    await page.keyboard.press("Escape");

    await api("POST", `/items/${id}/publish`, { visibility: "public", note: "public now" });
    await page.reload();
    await openCard(page, 'history');
    await expect(page.locator('[data-action="view-version"]')).toHaveCount(1);
    await expect(page.locator('[data-private-history] .h-row')).toHaveCount(2);
    expect(errors).toEqual([]);
  });

  test("in Notebook mode, private sits above compose and lists private items; the editor links a private item to its reader view", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const api = apiFor(page);
    const id = (await api("POST", "/items", { contentMd: `Notebook reader text ${Date.now()}` })).id;
    await api("POST", `/items/${id}/publish`, { visibility: "private", note: "kept" });
    try {
      // Publish mode: no private tab.
      await api("PATCH", "/settings", { defaultVisibility: "public" });
      await page.goto("/studio/");
      await expect(page.locator('nav[aria-label="studio"] [data-tab="private"]')).toHaveCount(0);
      await api("PATCH", "/settings", { defaultVisibility: "private" });
      await page.reload();
      await expect(page.locator('[data-tab="private"]')).toBeVisible();
      const tabs = page.locator('nav[aria-label="studio"] > a');
      const labels = await tabs.locator('.tl').allInnerTexts();
      expect(labels.indexOf('private')).toBe(labels.indexOf('compose') - 1);
      await page.locator('[data-tab="private"]').click();
      await expect(page.locator('[data-tab="private"]')).toHaveAttribute('aria-current', 'page');
      await expect(page.locator('.views')).toContainText("Notebook reader text");
      // No public page to link or stub: a private card offers neither.
      await expect(page.locator(`.views [data-action="stub"][data-remote="${id}"]`)).toHaveCount(0);
      await expect(page.locator('.views')).not.toContainText(`/f/${id.slice(0, 8)}`);

      await page.goto(`/studio/edit/${id}`);
      await page.locator('[data-action="reader-view"]').click();
      await expect(page).toHaveURL(new RegExp(`/reading/~own/${id}`));
      await expect(page.locator('.views')).toContainText("Notebook reader text");
    } finally {
      await api("PATCH", "/settings", { defaultVisibility: "public" });
    }
    expect(errors).toEqual([]);
  });
});

