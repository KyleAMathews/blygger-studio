import { test, expect, type Page } from "@playwright/test";

/* Contract: a failed save keeps the current editor/text; publishing requires a
 * successful save. Saves from one editor apply in input order. This oracle
 * controls HTTP delivery, not D1 concurrency across clients. Its independent
 * model is the submitted text sequence, observed through actual UI + API.
 */
async function editor(page: Page, kind: "fragment" | "thread") {
  await page.goto("/studio/login");
  await page.locator('[name="password"]').fill("test-password");
  await page.getByRole("button", { name: "log in", exact: true }).click();
  await expect(page.locator("#composer-text")).toBeVisible();
  const created = await page.evaluate(async kind => { const response = await fetch("/api/items", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind, content_md: "persisted" }) }); return { status: response.status, body: await response.json() as { id: string } }; }, kind);
  expect(created.status).toBe(201);
  const { id } = created.body;
  await page.goto(`/studio/edit/${id}`);
  await expect(page.locator("#md-input")).toHaveValue("persisted");
  await page.clock.install();
  await page.clock.pauseAt(new Date());
  return id as string;
}
for (const kind of ["fragment", "thread"] as const) {
  for (const status of [401, 503]) test(`${kind} keeps text after save ${status} and can recover`, async ({ page }) => {
    const id = await editor(page, kind);
    page.on("dialog", dialog => dialog.accept());
    await page.route(`**/api/items/${id}`, route => route.request().method() === "PATCH" ? route.fulfill({ status, json: { error: "save rejected" } }) : route.continue());
    await page.locator("#md-input").fill("unsaved text");
    const failed = page.waitForResponse(response => response.url().endsWith(`/api/items/${id}`) && response.status() === status);
    await page.locator("#save-draft-btn").click();
    await failed;
    // Flush browser event handlers without advancing the autosave debounce.
    await page.clock.runFor(17);
    await expect(page.locator("#md-input")).toHaveValue("unsaved text");
    expect((await page.evaluate(async id => (await fetch(`/api/items/${id}`)).json() as Promise<{ content_md: string; version: number }>, id)).content_md).toBe("persisted");
    await page.unroute(`**/api/items/${id}`);
    const saved = page.waitForResponse(response => response.url().endsWith(`/api/items/${id}`) && response.request().method() === "PATCH" && response.status() === 200);
    const reloaded = page.waitForEvent("framenavigated", frame => frame === page.mainFrame());
    await page.locator("#save-draft-btn").click();
    await saved; await reloaded; await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("#md-input")).toHaveValue("unsaved text");
    expect((await page.evaluate(async id => (await fetch(`/api/items/${id}`)).json() as Promise<{ content_md: string; version: number }>, id)).content_md).toBe("unsaved text");
  });
  test(`${kind} never publishes after a failed save`, async ({ page }) => {
    const id = await editor(page, kind);
    page.on("dialog", dialog => dialog.accept());
    let published = 0;
    await page.route(`**/api/items/${id}/publish`, async route => { published++; await route.continue(); });
    await page.route(`**/api/items/${id}`, route => route.request().method() === "PATCH" ? route.fulfill({ status: 503, json: { error: "save rejected" } }) : route.continue());
    await page.locator("#md-input").fill("must not lose this");
    const failed = page.waitForResponse(response => response.url().endsWith(`/api/items/${id}`) && response.status() === 503);
    await page.locator("#publish-btn").click(); await failed;
    await page.clock.runFor(17);
    expect(published).toBe(0);
    await expect(page.locator("#md-input")).toHaveValue("must not lose this");
    expect((await page.evaluate(async id => (await fetch(`/api/items/${id}`)).json() as Promise<{ content_md: string; version: number }>, id)).version).toBe(0);
  });
  test(`${kind} retains a failed autosave and recovers on the next save`, async ({ page }) => {
    const id = await editor(page, kind);
    page.on("dialog", dialog => dialog.accept());
    await page.route(`**/api/items/${id}`, route => route.request().method() === "PATCH" ? route.fulfill({ status: 503, json: { error: "autosave rejected" } }) : route.continue());
    await page.locator("#md-input").fill("failed autosave");
    const failed = page.waitForResponse(response => response.url().endsWith(`/api/items/${id}`) && response.status() === 503);
    await page.clock.runFor(401); await failed;
    await expect(page.locator("#md-input")).toHaveValue("failed autosave");
    expect((await page.evaluate(async id => (await fetch(`/api/items/${id}`)).json() as Promise<{ content_md: string }>, id)).content_md).toBe("persisted");
    await page.unroute(`**/api/items/${id}`);
    const saved = page.waitForResponse(response => response.url().endsWith(`/api/items/${id}`) && response.status() === 200);
    const reloaded = page.waitForEvent("framenavigated", frame => frame === page.mainFrame());
    await page.locator("#save-draft-btn").click(); await saved; await reloaded; await page.waitForLoadState("domcontentloaded");
    expect((await page.evaluate(async id => (await fetch(`/api/items/${id}`)).json() as Promise<{ content_md: string }>, id)).content_md).toBe("failed autosave");
  });
  test(`${kind} keeps the editor after publication fails following a successful save`, async ({ page }) => {
    const id = await editor(page, kind);
    await page.route(`**/api/items/${id}/publish`, route => route.fulfill({ status: 503, json: { error: "publication rejected" } }));
    await page.locator("#md-input").fill("saved but unpublished");
    const failed = page.waitForResponse(response => response.url().endsWith(`/api/items/${id}/publish`) && response.status() === 503);
    await page.locator("#publish-btn").click(); await failed;
    await expect(page.locator("#error-banner-slot")).toContainText("publication rejected");
    await expect(page.locator("#md-input")).toHaveValue("saved but unpublished");
    const item = await page.evaluate(async id => (await fetch(`/api/items/${id}`)).json() as Promise<{ content_md: string; version: number }>, id);
    expect(item).toMatchObject({ content_md: "saved but unpublished", version: 0 });
    await page.unroute(`**/api/items/${id}/publish`);
    await page.locator("#publish-btn").click();
    await expect(page.locator('[data-action="view-version"]')).toBeVisible();
  });
  test(`${kind} does not reload over edits entered while manual save is pending`, async ({ page }) => {
    const id = await editor(page, kind);
    let release!: () => void, started!: () => void;
    const held = new Promise<void>(resolve => { release = resolve; });
    const first = new Promise<void>(resolve => { started = resolve; });
    await page.route(`**/api/items/${id}`, async route => {
      if (route.request().method() !== "PATCH") return route.continue();
      if (route.request().postDataJSON().content_md === "older") { started(); await held; }
      await route.continue();
    });
    try {
      await page.locator("#md-input").fill("older");
      await page.locator("#save-draft-btn").click(); await first;
      await page.locator("#md-input").fill("newer");
      const saved = page.waitForResponse(response => response.url().endsWith(`/api/items/${id}`) && response.request().postDataJSON()?.content_md === "older");
      release(); await saved; await page.clock.runFor(17);
      await expect(page.locator("#md-input")).toHaveValue("newer");
      const next = page.waitForResponse(response => response.url().endsWith(`/api/items/${id}`) && response.request().postDataJSON()?.content_md === "newer");
      await page.clock.runFor(401); await next;
      expect((await page.evaluate(async id => (await fetch(`/api/items/${id}`)).json() as Promise<{ content_md: string }>, id)).content_md).toBe("newer");
    } finally { release(); }
  });
  test(`${kind} serializes an older pending autosave before the next edit`, async ({ page }) => {
    const id = await editor(page, kind);
    const bodies: string[] = [];
    let release!: () => void, started!: () => void;
    const held = new Promise<void>(resolve => { release = resolve; });
    const first = new Promise<void>(resolve => { started = resolve; });
    await page.route(`**/api/items/${id}`, async route => {
      if (route.request().method() !== "PATCH") return route.continue();
      bodies.push(route.request().postDataJSON().content_md);
      if (bodies.length === 1) { started(); await held; }
      await route.continue();
    });
    // Record calls before network delivery so the negative assertion cannot
    // pass merely because a second request has not reached Playwright yet.
    await page.evaluate(() => {
      const host = globalThis as unknown as { studioRequest: (path: string, init?: RequestInit) => Promise<Response>; patchCalls: number };
      const original = host.studioRequest; host.patchCalls = 0;
      host.studioRequest = (path, init) => { if (init?.method === "PATCH") host.patchCalls++; return original(path, init); };
    });
    try {
      await page.locator("#md-input").fill("older"); await page.clock.runFor(401); await first;
      await page.locator("#md-input").fill("newer"); await page.clock.runFor(401);
      expect(await page.evaluate(() => (globalThis as unknown as { patchCalls: number }).patchCalls)).toBe(1);
      const saved = page.waitForResponse(response => response.url().endsWith(`/api/items/${id}`) && response.request().postDataJSON()?.content_md === "newer");
      release(); await saved;
      expect(bodies).toEqual(["older", "newer"]);
      expect((await page.evaluate(async id => (await fetch(`/api/items/${id}`)).json() as Promise<{ content_md: string; version: number }>, id)).content_md).toBe("newer");
    } finally { release(); }
  });
}
