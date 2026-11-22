import { fixtureJson } from './api-fixture';
import { test, expect, type Page } from './fixture';

// The Studio may wear its own palette (session 78): Settings → Appearance →
// Studio theme. Public pages keep the public theme.
async function login(page: Page) {
  await page.goto('/studio/login');
  await page.locator('[name=password]').fill('test-password');
  await page.getByRole('button', { name: 'log in', exact: true }).click();
  await expect(page.locator('#composer-text')).toBeVisible();
}
const api = (page: Page, method: string, path: string, body?: unknown) =>
  page.evaluate(fixtureJson, { method, path: `/api${path}`, body });
const cardColour = (page: Page) => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--card').trim());

test('the studio wears its own theme when one is chosen, and the public theme otherwise', async ({ page }) => {
  await login(page);
  const before = (await api(page, 'GET', '/settings')).json;
  try {
    await api(page, 'PATCH', '/settings', { theme: 'cream', studioTheme: '' });
    await page.goto('/studio/settings#appearance');
    await expect.poll(() => cardColour(page)).toBe('#f7f2e7');
    await page.getByRole('radiogroup', { name: 'Studio theme' }).getByText('Nord', { exact: true }).click();
    await page.getByRole('button', { name: 'save settings' }).click();
    await expect.poll(() => cardColour(page)).toBe('#2e3440');
    expect((await api(page, 'GET', '/settings')).json).toMatchObject({ theme: 'cream', studioTheme: 'nord' });
    const css = await (await page.request.get('/style.css')).text();
    expect(css).toContain('#f7f2e7');
    expect(css).not.toContain('#2e3440');
  } finally {
    await api(page, 'PATCH', '/settings', { theme: before.theme, studioTheme: '' });
  }
});
