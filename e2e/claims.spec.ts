import { test, expect, type Page } from './fixture';

// The claims extension: the editor bar inserts a claim block after the paragraph and
// reopens it; the reading byline badge pins an unpinned claim and resolves a due one
// (the claim's version pinned first, then the resolution published and pinned); the
// Claims page groups and scores them.
async function login(page: Page) {
  await page.goto('/studio/login'); await page.locator('[name=password]').fill('test-password');
  await page.getByRole('button', { name: 'log in', exact: true }).click();
  await expect(page.locator('#composer-text')).toBeVisible();
}
const setExtensions = (page: Page, extensions: string[]) =>
  page.evaluate(async (names) => {
    const response = await fetch('/api/settings', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ extensions: names }) });
    if (!response.ok) throw new Error(`settings ${response.status}`);
  }, extensions);
const publishClaim = (page: Page, statement: string, resolvesBy: string, probability: number) =>
  page.evaluate(async ({ statement, resolvesBy, probability }) => {
    const contentMd = `${statement}\n\n\`\`\`claim\n${JSON.stringify({ claim: statement, resolves_by: resolvesBy, probability }, null, 2)}\n\`\`\`\n`;
    const created = await (await fetch('/api/items', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ contentMd, kind: 'fragment' }) })).json();
    await fetch(`/api/items/${created.id}/publish`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ expectedRevision: created.revision }) });
    return created.id as string;
  }, { statement, resolvesBy, probability });
const item = (page: Page, id: string) =>
  page.evaluate(async (id) => (await (await fetch(`/api/items/${id}`)).json()) as { contentMd: string; version: number; pins: { version: number }[] }, id);

test.beforeEach(async ({ page }) => {
  await login(page);
  await setExtensions(page, ['claims']);
  await page.reload();
  await expect(page.locator('#composer-text')).toBeVisible();
});
test.afterEach(async ({ page }) => {
  await setExtensions(page, []);
});

test('the bar turns selected words into a claim after their paragraph, then reopens it', async ({ page }) => {
  const run = `cl${Date.now().toString(36)}`;
  const box = page.locator('#composer-text');
  const bar = page.locator('[data-extension="claims"]');
  await box.fill(`I think it rains ${run}. Then sun.\n\nNext paragraph.`);
  await box.evaluate((el: HTMLTextAreaElement, run) => { el.focus(); const s = el.value.indexOf('it rains'); el.setSelectionRange(s, s + `it rains ${run}`.length); }, run);
  await bar.locator('[data-action=claims-open]').click();

  const sheet = page.locator('[data-extension-sheet=claims]');
  await expect(sheet.locator('.claims-statement')).toHaveValue(`it rains ${run}`);
  // Problems that stop a claim wait for an attempt to insert it.
  await expect(sheet.locator('.claims-stop')).toHaveCount(0);
  await sheet.getByRole('button', { name: 'Insert claim' }).click();
  await expect(sheet.locator('.claims-stop')).toHaveText(['Pick a date by which it will be known.']);
  await sheet.locator('input[type=range]').first().fill('65');
  await sheet.locator('input[type=date]').fill('2099-11-29');
  await sheet.getByRole('button', { name: 'I decide' }).click();
  await sheet.getByRole('button', { name: 'Insert claim' }).click();

  const text = await box.inputValue();
  expect(text.startsWith(`I think it rains ${run}. Then sun.\n\n\`\`\`claim\n`)).toBe(true);
  expect(text.endsWith('```\n\nNext paragraph.')).toBe(true);
  expect(JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1))).toMatchObject({ claim: `it rains ${run}`, resolves_by: '2099-11-29', probability: 0.65, check: { oracle: 'judgment', by: 'author' } });
  await expect(bar).toContainText('edit claim');
  await expect(bar).toContainText('65% · by');

  // Reopened, the change replaces the block where it sits.
  await bar.locator('[data-action=claims-open]').click();
  await sheet.locator('input[type=range]').first().fill('70');
  await sheet.getByRole('button', { name: 'Update claim' }).click();
  await expect(bar).toContainText('70% · by');
  expect((await box.inputValue()).match(/```claim/g)).toHaveLength(1);
});

test('the badge pins an unpinned claim, resolves a due one, and the Claims page scores it', async ({ page }) => {
  const run = `cl${Date.now().toString(36)}`;
  const future = await publishClaim(page, `Future ${run}`, '2099-12-05', 0.65);
  const due = await publishClaim(page, `Due ${run}`, '2026-01-01', 0.85);
  await page.goto('/studio/reading');
  const view = page.locator('[data-extension-sheet=claims-view]');

  // Each badge is found through its own post: the server is shared across projects and runs.
  const badgeFor = (text: string) => page.locator('article', { hasText: text }).locator('.claims-badge');
  const futureBadge = badgeFor(`Future ${run}`);
  await expect(futureBadge).toContainText('◇');
  await futureBadge.click();
  await view.getByRole('button', { name: 'Pin version 1' }).click();
  await expect(view).toContainText('Pinned (version 1)');
  await view.getByRole('button', { name: 'Close' }).click();
  await expect(futureBadge).toContainText('◆');
  expect((await item(page, future)).pins.map((p) => p.version)).toEqual([1]);

  await expect(badgeFor(`Due ${run}`)).toContainText('due now');
  await badgeFor(`Due ${run}`).click();
  await view.getByRole('button', { name: 'Resolve', exact: true }).click();
  await view.getByRole('button', { name: 'Yes' }).click();
  await view.getByPlaceholder('a link that shows the outcome').fill('https://example.com/result');
  await view.getByRole('button', { name: 'Publish resolution' }).click();
  await expect(view).toHaveCount(0);
  await expect.poll(async () => (await item(page, due)).pins.map((p) => p.version)).toEqual([1, 2]);
  const resolved = await item(page, due);
  expect(resolved.version).toBe(2);
  expect(resolved.contentMd).toContain('```resolution\n{\n  "outcome": true,');
  expect(resolved.contentMd).toContain(`"claim": "Due ${run}"`);

  await page.goto('/studio/ext/claims');
  const claimsPage = page.locator('[data-extension-page=claims]');
  await expect(claimsPage.locator('.claims-list li', { hasText: `Due ${run}` })).toContainText('Yes');
  await expect(claimsPage.locator('.claims-list li', { hasText: `Future ${run}` })).toContainText('Resolve early');
});
