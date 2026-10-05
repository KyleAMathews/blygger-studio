/**
 * Imported content must remain data in the owner's browser. OWASP XSS guidance:
 * https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html
 * Model: no payload may set data-import-script on the owner document. The driver
 * logs in normally, loads raw stored imports through the real SDK/REST/React
 * reading path, then clicks attacker links with a trusted browser input event.
 * The corpus is fixed and shared with the Worker oracle, which uses URL parsing
 * as a different formulation. These Chromium profiles do not cover all engines,
 * HTML grammars, parser versions or deployed response headers.
 */
import { test, expect } from './fixture';
import { importedHtmlAttacks } from '../test/fixtures/imported-html-attacks';
test.use({ baseURL: 'http://127.0.0.1:8791' });

for (const attack of importedHtmlAttacks) test('stored imported HTML cannot execute: ' + attack.id, async ({ page }) => {
  await page.goto('/studio/login');
  await page.locator('[name="password"]').fill('test-password');
  await page.getByRole('button', { name: 'log in', exact: true }).click();
  await expect(page.locator('#composer-text')).toBeVisible();
  expect(await page.evaluate(async () => (await fetch('/api/settings')).status)).toBe(200);
  await page.goto('/studio/reading?sub=security-html');
  const article = page.locator('article').filter({ hasText: 'Security ' + attack.id });
  await expect(article).toHaveCount(1);
  if ('click' in attack) {
    const link = article.locator('a').filter({ hasText: attack.click });
    // Removing active markup is allowed; preserving active authority is not.
    if (await link.count()) await link.click({ force: true });
  }
  // Two rendering turns let insertion/load callbacks settle without a sleep.
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await expect(page.locator('html'), 'imported script must not execute in the owner document').not.toHaveAttribute('data-import-script', 'yes');
  expect(new URL(page.url()).pathname).toBe('/studio/reading');
});

// A public page is still on the owner's origin. Legacy feed imports do not gain
// trust merely because the public collection is visited without an API request.
test('public legacy collection content cannot execute in an owner browser', async ({ page }) => {
  await page.goto('/studio/login');
  await page.locator('[name="password"]').fill('test-password');
  await page.getByRole('button', { name: 'log in', exact: true }).click();
  await expect(page.locator('#composer-text')).toBeVisible();
  await page.goto('/h/security-imports/');
  await expect(page.getByRole('heading', { name: 'Security imports', exact: true })).toBeVisible();
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await expect(page.locator('html')).not.toHaveAttribute('data-import-script', 'yes');
});
