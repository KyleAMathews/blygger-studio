import { test, expect, type Page } from '@playwright/test';

// Reading lenses and the signals page (0.25.0). The fixture is shared by both
// projects, so the test clears the thumb it sets (the log keeps its entries:
// it is append-only by design).
const NATIVE = '00000000000000000000000001';
async function login(page: Page) {
  await page.goto('/studio/login');
  await page.locator('[name=password]').fill('test-password');
  await page.getByRole('button', { name: 'log in', exact: true }).click();
  await expect(page.locator('#composer-text')).toBeVisible();
}
const api = (page: Page, method: string, path: string, body?: unknown) =>
  page.evaluate(
    async ({ method, path, body }) => {
      const response = await fetch(`/api${path}`, { method, headers: { 'content-type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
      return { status: response.status, json: await response.json().catch(() => null) };
    },
    { method, path, body },
  );

test('lenses filter by kind, keep themselves across screens, and show the two placeholders', async ({ page }) => {
  await login(page);
  const stamp = Date.now();
  const frag = (await api(page, 'POST', '/items', { content_md: `Lens fragment ${stamp}` })).json.id;
  await api(page, 'POST', `/items/${frag}/publish`, {});
  const thread = (await api(page, 'POST', '/items', { content_md: `# Lens thread ${stamp}\n\n![[${frag}]]`, kind: 'thread' })).json.id;
  await api(page, 'POST', `/items/${thread}/publish`, {});

  await page.goto('/studio/reading');
  const bar = page.getByRole('group', { name: 'reading lens' });
  await expect(bar.getByRole('button')).toHaveText(['All', 'Threads', 'Fragments', 'Background', 'Smart Feed']);

  await bar.getByRole('button', { name: 'Threads' }).click();
  await expect(page).toHaveURL(/lens=threads/);
  // Exactly one lens is current.
  await expect(bar.locator('[aria-pressed=true]')).toHaveText(['Threads']);
  await page.getByRole('link', { name: /my blyg/ }).first().click();
  await expect(page).toHaveURL(/sub=own.*lens=threads|lens=threads.*sub=own/);
  await expect(page.locator('.reading-entry').filter({ hasText: `Lens thread ${stamp}` })).toBeVisible();
  // The thread quotes the fragment, so the fragment's own entry is the one without the thread's title.
  const fragmentEntry = page.locator('.reading-entry').filter({ hasText: `Lens fragment ${stamp}` }).filter({ hasNotText: `Lens thread ${stamp}` });
  await expect(fragmentEntry).toHaveCount(0);

  await bar.getByRole('button', { name: 'Fragments' }).click();
  await expect(fragmentEntry).toBeVisible();
  await expect(page.locator('.reading-entry').filter({ hasText: `Lens thread ${stamp}` })).toHaveCount(0);

  await bar.getByRole('button', { name: 'Background' }).click();
  await expect(page.locator('.lens-placeholder')).toContainText('with ignyr in the changelog');
  await bar.getByRole('button', { name: 'Smart Feed' }).click();
  await expect(page.locator('.lens-placeholder')).toContainText('Feed sorted and filtered by your AI agent.');
  await page.locator('.lens-placeholder').getByRole('link', { name: 'Settings' }).click();
  await expect(page).toHaveURL(/\/studio\/settings$/);
});

test('signals lists current thumbs and the activity log', async ({ page }) => {
  await login(page);
  expect((await api(page, 'PUT', `/signals/parity-native/${NATIVE}`, { thumb: 1 })).status).toBe(200);
  try {
    await page.goto('/studio/more');
    await page.getByRole('link', { name: /signals/ }).click();
    await expect(page).toHaveURL(/\/studio\/signals$/);
    await expect(page.locator('.signals-note')).toContainText('never published');
    const liked = page.locator('.signals-list li').filter({ hasText: 'Native title' });
    await expect(liked).toBeVisible();
    await page.getByRole('button', { name: /activity/ }).click();
    await expect(page.locator('.signals-list li[data-kind="thumb_up"]').filter({ hasText: 'Native title' }).first()).toBeVisible();
  } finally {
    await api(page, 'DELETE', `/signals/parity-native/${NATIVE}`);
  }
});
