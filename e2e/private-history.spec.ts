import { fixtureJson } from './api-fixture';
import { test, expect } from "./fixture";
import { expandRow, openCard } from "./editor.ts";

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

  // Raising a private item to public always asks, names the public hoppers it is in now, and
  // sends the choice explicitly (Venkat on studio#175; studio#178 R02, R03, R04).
  const privateItem = async (api: ReturnType<typeof apiFor>, label: string) => {
    const id = (await api("POST", "/items", { contentMd: `${label} ${Date.now()}` })).id as string;
    await api("POST", `/items/${id}/publish`, { visibility: "private" });
    return id;
  };
  const publicHopper = async (api: ReturnType<typeof apiFor>, name: string) => {
    const hopper = (await api("POST", "/hoppers", { name })).id as string;
    await api("PATCH", `/hoppers/${hopper}`, { public: true });
    return hopper;
  };

  for (const path of ["row", "quick edit"] as const) {
    test(`Compose's ${path} asks before raising, and cancel leaves the item private (R02)`, async ({ page }) => {
      const api = apiFor(page);
      const id = await privateItem(api, `Raise from ${path}`);
      await page.goto("/studio/");
      const row = await expandRow(page, id);
      if (path === "quick edit") await row.getByRole("button", { name: "quick edit", exact: true }).click();
      // Quick Edit has its own button, beside save draft.
      const scope = path === "quick edit" ? row.locator("div", { has: page.getByRole("button", { name: "save draft", exact: true }) }).last() : row;
      const raise = scope.getByRole("button", { name: "publish publicly", exact: true }).first();
      await raise.click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toContainText("Make this item public?");
      await dialog.getByRole("button", { name: "cancel" }).click();
      expect(await api("GET", `/items/${id}`)).toMatchObject({ status: "private", version: 0 });
      await raise.click();
      await page.getByRole("dialog").getByRole("button", { name: "make public" }).click();
      await expect.poll(async () => (await api("GET", `/items/${id}`)).status).toBe("public");
      expect((await api("GET", `/items/${id}`)).version).toBe(1);
    });
  }

  // Publishing a draft names the public hoppers it is in first (plan §1 0f law 7; Aneesh on
  // studio#175, studio#178 V9); a draft in no public hopper publishes as before.
  test("the editor asks before publishing a draft that is in a public hopper, and cancel leaves it a draft (V9)", async ({ page }) => {
    const api = apiFor(page);
    const id = (await api("POST", "/items", { contentMd: `Draft in a hopper ${Date.now()}` })).id as string;
    const name = `Draft's hopper ${Date.now()}`;
    await api("PUT", `/hoppers/${await publicHopper(api, name)}/items/~own/${id}`);
    await page.goto(`/studio/edit/${id}`);
    await page.locator("#publish-btn").click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText(`It will also appear in the public hopper ${name}.`);
    await dialog.getByRole("button", { name: "cancel" }).click();
    expect(await api("GET", `/items/${id}`)).toMatchObject({ status: "draft", version: 0 });
    await page.locator("#publish-btn").click();
    await page.getByRole("dialog").getByRole("button", { name: "publish", exact: true }).click();
    await expect.poll(async () => (await api("GET", `/items/${id}`)).status).toBe("public");
  });

  test("the editor's dialog names a public hopper joined after the page loaded, and a default changed mid-dialog does not make it private (R03, R04)", async ({ page }) => {
    const api = apiFor(page);
    const id = await privateItem(api, "Raise from editor");
    const name = `Joined later ${Date.now()}`;
    try {
      await page.goto(`/studio/edit/${id}`);
      await expect(page.locator("#publish-btn")).toHaveText("publish publicly");
      await api("PUT", `/hoppers/${await publicHopper(api, name)}/items/~own/${id}`);
      await page.locator("#publish-btn").click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toContainText(name);
      await api("PATCH", "/settings", { defaultVisibility: "private" });
      await dialog.getByRole("button", { name: "make public" }).click();
      await expect.poll(async () => (await api("GET", `/items/${id}`)).status).toBe("public");
      expect((await api("GET", `/items/${id}`)).version).toBe(1);
    } finally {
      await api("PATCH", "/settings", { defaultVisibility: "public" });
    }
  });
});
