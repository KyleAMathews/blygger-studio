import { fixtureJson } from './api-fixture';
import { test, expect, type Page } from './fixture';

// An entry's source name opens the feed of just that source, the same view the
// Sources tab opens (Venkat, session 78). Its back link returns where it came
// from: the main feed from a source name, the Sources tab from there.
async function login(page: Page) {
  await page.goto('/studio/login');
  await page.locator('[name=password]').fill('test-password');
  await page.getByRole('button', { name: 'log in', exact: true }).click();
  await expect(page.locator('#composer-text')).toBeVisible();
}
const api = (page: Page, method: string, path: string, body?: unknown) =>
  page.evaluate(fixtureJson, { method, path: `/api${path}`, body });

test('a source name opens that source alone, and its back link returns to the main feed', async ({ page }) => {
  await login(page);
  const stamp = `Source name ${Date.now()}`;
  const { json } = await api(page, 'POST', '/items', { contentMd: stamp });
  expect((await api(page, 'POST', `/items/${json.id}/publish`)).status).toBe(200);

  // From an entry's full view (its card byline is the same component); the
  // main feed is crowded by other suites, so a card there may be off the page.
  await page.goto(`/studio/reading/~own/${json.id}`);
  await page.locator('.byline').getByRole('link', { name: 'you', exact: true }).first().click();
  await expect(page).toHaveURL(/\/studio\/reading\?.*sub=own/);
  await expect(page).toHaveURL(/from=feed/);
  await expect(page.locator('.view-h')).toContainText('my blyg');
  await page.getByRole('link', { name: '← main feed' }).click();
  await expect(page).toHaveURL(/\/studio\/reading$/);

  // An imported entry: the fixture's native blyg.
  await page.goto('/studio/reading/parity-native/00000000000000000000000001');
  await page.locator('.byline').getByRole('link', { name: 'Native source', exact: true }).first().click();
  await expect(page).toHaveURL(/sub=parity-native/);
  await expect(page.locator('.view-h')).toContainText('Native source');
  await expect(page.locator('.reading-entry[data-key^="own:"]')).toHaveCount(0);
  await expect(page.getByRole('link', { name: '← main feed' })).toBeVisible();
});

test('from the Sources tab, the same view leads back to Sources', async ({ page }) => {
  await login(page);
  await page.goto('/studio/reading?view=sources');
  await page.locator('[data-id="parity-native"]').getByRole('link').first().click();
  await expect(page).toHaveURL(/sub=parity-native/);
  await expect(page).not.toHaveURL(/from=feed/);
  await page.getByRole('link', { name: '← sources' }).click();
  await expect(page).toHaveURL(/view=sources/);
});
