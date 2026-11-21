import { test, expect, type Page } from './fixture';

// A phone or iPad waking refetches every collection at once, often before the
// network is back (Safari: "Load failed"). Such a blip retries on its own and
// never reaches the banner or the error log; a failure that lasts still shows,
// with "retry reads" (src/ui/components.tsx, useSettledReadProblem).
async function login(page: Page) {
  await page.goto('/studio/login');
  await page.locator('[name=password]').fill('test-password');
  await page.getByRole('button', { name: 'log in', exact: true }).click();
  await expect(page.locator('#composer-text')).toBeVisible();
}
/** Hide the page, then show it again: Query's focus manager listens on window. */
async function wake(page: Page, during: () => Promise<unknown>) {
  const visibility = (state: string) => page.evaluate((state) => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state });
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => state === 'hidden' });
    window.dispatchEvent(new Event('visibilitychange'));
  }, state);
  await visibility('hidden');
  await during();
  await visibility('visible');
}
const readsFail = (page: Page) => page.route('**/api/**', (route) =>
  route.request().method() === 'GET' || route.request().url().includes('read-batch') ? route.abort('failed') : route.fallback());

test('a wake-time read failure that heals in a moment shows nothing and logs nothing', async ({ page }) => {
  await login(page);
  let failed = 0;
  page.on('requestfailed', () => failed++);
  await wake(page, () => readsFail(page));
  await expect.poll(() => failed).toBeGreaterThan(0);
  await page.waitForTimeout(500);
  await page.unroute('**/api/**');
  // Past the automatic retry and the banner's delay.
  await page.waitForTimeout(7_000);
  await expect(page.locator('.read-error')).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('blyg-error-log'))).toBeNull();
});

test('a read failure that lasts shows the banner, and retry reads clears it', async ({ page }) => {
  await login(page);
  await wake(page, () => readsFail(page));
  await page.waitForTimeout(2_000);
  await expect(page.locator('.read-error')).toHaveCount(0);
  await expect(page.locator('.read-error')).toHaveCount(1, { timeout: 10_000 });
  await page.unroute('**/api/**');
  await page.getByRole('button', { name: 'retry reads', exact: true }).click();
  await expect(page.locator('.read-error')).toHaveCount(0, { timeout: 10_000 });
});
