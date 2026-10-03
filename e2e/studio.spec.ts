import { test, expect } from "@playwright/test";

test("owner can compose, publish and change settings through the SDK", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/studio");
  await page.locator('[name="password"]').fill("test-password");
  await page.getByRole('button', { name: 'log in', exact: true }).click();
  await expect(page.locator("#composer-text")).toBeVisible();
  await page.locator("#composer-text").fill("Browser SDK **round trip**");
  await page.locator("#save-draft-btn").click();
  await expect(page.locator("#composer-state")).toHaveText("saved");
  await page.locator("#publish-btn").click();
  await expect(page.locator("#composer-text")).toHaveValue("");
  await expect(page.locator("body")).toContainText("Browser SDK round trip");
  await page.goto("/studio/reading");
  await expect(page.locator("body")).toContainText("Browser SDK round trip");
  await page.goto("/studio/settings");
  await page.locator("#site_title").fill("Browser SDK site");
  const saved = page.waitForResponse((response) => response.url().endsWith("/api/settings") && response.request().method() === "PATCH");
  await page.locator('#settings-form button[type="submit"]').focus();
  await page.locator('#settings-form button[type="submit"]').press('Enter');
  expect((await saved).status()).toBe(200);
  await expect(page.getByRole("status")).toHaveText("saved");
  await page.reload();
  await expect(page.locator("#site_title")).toHaveValue("Browser SDK site");
  expect(errors).toEqual([]);
});

test("editor autosave, preview, image upload and history use the SDK", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/studio/login");
  await page.locator('[name="password"]').fill("test-password");
  await page.getByRole("button", { name: "log in", exact: true }).click();
  await expect(page.locator("#composer-text")).toBeVisible();
  await page.locator("#composer-text").fill("Editor fixture");
  await page.locator("#composer-full").click();
  await expect(page.locator("#md-input")).toHaveValue("Editor fixture");
  await page.locator("#md-input").fill("Autosaved **preview**");
  await expect(page.locator("#preview-body strong")).toHaveText("preview");
  await expect(page.locator(".save-state")).toHaveText("saved");
  await page.reload();
  await expect(page.locator("#md-input")).toHaveValue("Autosaved **preview**");
  const chooser = page.waitForEvent("filechooser");
  await page.locator("#attach-btn").click();
  const uploaded = page.waitForResponse((response) => response.url().endsWith("/api/media"));
  await (await chooser).setFiles({ name: "fixture.svg", mimeType: "image/svg+xml", buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>') });
  expect((await uploaded).status()).toBe(201);
  await expect(page.locator("body")).toContainText("attached:");
  await page.locator("#publish-btn").click();
  await expect(page.locator('[data-action="view-version"]')).toBeVisible();
  await page.locator('[data-action="view-version"]').click();
  await expect(page.locator("#h-viewer-body")).toContainText("Autosaved preview");
  expect(errors).toEqual([]);
});


test("owner can pin and fork through resource creation", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("dialog", (dialog) => dialog.accept());
  await page.goto("/studio/login");
  await page.locator('[name="password"]').fill("test-password");
  await page.getByRole("button", { name: "log in", exact: true }).click();
  await page.locator("#composer-text").fill("Browser fork source");
  await page.locator("#composer-full").click();
  const sourceUrl = page.url();
  await page.locator("#publish-btn").click();
  await expect(page.locator('[data-action="pin"]').first()).toBeVisible();
  await page.locator('[data-action="pin"]').first().click();
  await page.locator('a[href^="/studio/fork?"]').click();
  const created = page.waitForResponse((response) => response.url().endsWith("/api/items") && response.request().method() === "POST");
  await page.locator('[data-action="fork"]').click();
  const forkResponse = await created;
  expect(forkResponse.status()).toBe(201);
  expect(forkResponse.request().postDataJSON()).toMatchObject({ mode: "fork", source: { version: 1 } });
  await expect(page.locator("#md-input")).toHaveValue("Browser fork source");
  expect(page.url()).not.toBe(sourceUrl);
  expect(errors).toEqual([]);
});

test("stale quotes are listed, explained, and refreshed as one republish", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/studio/login");
  await page.locator('[name="password"]').fill("test-password");
  await page.getByRole("button", { name: "log in", exact: true }).click();
  await expect(page.locator("#composer-text")).toBeVisible();
  // In-page fetch: the session cookie is Secure, which Playwright's request
  // context will not send over the fixture's plain http.
  const api = async (method: string, path: string, data?: unknown) => {
    const res = await page.evaluate(async ([method, path, data]) => {
      const r = await fetch(`/api${path}`, { method, headers: { "content-type": "application/json" }, body: data === undefined ? undefined : JSON.stringify(data) });
      return { ok: r.ok, json: await r.json() };
    }, [method, path, data] as const);
    expect(res.ok, `${method} ${path}`).toBe(true);
    return res.json;
  };
  const marker = `Quoted source ${Date.now()}`;
  const title = `Stale quote fixture ${Date.now()}`;
  const source = (await api("POST", "/items", { content_md: `${marker}, first version.` })).id;
  await api("POST", `/items/${source}/publish`, {});
  const thread = (await api("POST", "/items", { content_md: `# ${title}\n\n![[${source}]]\n\nMy commentary.`, kind: "thread" })).id;
  await api("POST", `/items/${thread}/publish`, {});
  await api("PATCH", `/items/${source}`, { content_md: `${marker}, second version.` });
  await api("POST", `/items/${source}/publish`, {});

  // The cross-blyg notice names the thread and links to its snapshots.
  await page.reload();
  const notice = page.locator(".stale-notice");
  await expect(notice).toContainText(title);
  await notice.getByRole("link", { name: title }).click();
  await expect(page.locator("#md-input")).toBeVisible();

  // The panel says what is stale and by how much.
  const row = page.locator('#snapshots [data-status="refreshable"]');
  await expect(row).toContainText("v1 → v2 available");

  // Unpublished edits block the refresh, and the panel says why.
  await page.locator("#md-input").fill(`# ${title}\n\n![[${source}]]\n\nHalf-written edit.`);
  await expect(page.locator("#snapshots")).toContainText("unpublished edits");
  await expect(page.locator('[data-action="refresh-quotes"]')).toHaveCount(0);
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator('[data-action="discard-changes"]').click();
  await expect(page.locator("#md-input")).toHaveValue(`# ${title}\n\n![[${source}]]\n\nMy commentary.`);

  // One click republishes with the new quote.
  const refreshed = page.waitForResponse((r) => r.url().endsWith(`/api/items/${thread}/refresh`));
  await page.locator('[data-action="refresh-quotes"]').click();
  expect((await refreshed).status()).toBe(200);
  await expect(page.locator("#snapshots h2")).toContainText("all current");
  const doc = await page.evaluate(async (id) => (await fetch(`/items/${id}.json`)).json(), thread);
  expect(doc.version).toBe(2);
  expect(doc.content_html).toContain(`${marker}, second version.`);
  expect(doc.changelog.at(-1).note).toBe("refreshed quoted snapshots");
  expect(errors).toEqual([]);
});
