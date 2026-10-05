import { test, expect, type Page } from '@playwright/test';

// Highlight generated portions (0.27.0): the blyg-wide default in settings
// and an item's own override in the editor's TK card. Public rendering is
// covered by test/generated-highlight.test.ts.
async function login(page: Page) {
  await page.goto('/studio/login'); await page.locator('[name=password]').fill('test-password');
  await page.getByRole('button', { name: 'log in', exact: true }).click();
  await expect(page.locator('#composer-text')).toBeVisible();
}
const settings = (page: Page) => page.evaluate(async () => (await fetch('/api/settings')).json());

test('the default is a settings checkbox, and an item overrides it from its TK card', async ({ page }) => {
  await login(page);
  await page.goto('/studio/settings');
  const box = page.getByRole('checkbox', { name: 'Highlight generated portions by default' });
  await expect(box).not.toBeChecked();
  await box.check();
  await page.getByRole('button', { name: 'save settings', exact: true }).click();
  await expect.poll(async () => (await settings(page)).highlight_generated_default).toBe(true);

  const id = await page.evaluate(async () => (await (await fetch('/api/items', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ content_md: 'mine [TK]impyrt=generated[/TK]' }) })).json()).id);
  await page.goto(`/studio/edit/${id}`);
  const card = page.locator('details#tk');
  if (!(await card.getAttribute('open'))) await card.locator('summary').click();
  const group = card.getByRole('group', { name: 'Highlight generated portions on the public page:' });
  await expect(group.getByRole('button')).toHaveText(['default (on)', 'on', 'off']);
  await expect(group.locator('[aria-pressed=true]')).toHaveText('default (on)');
  await group.getByRole('button', { name: 'off', exact: true }).click();
  await expect(group.locator('[aria-pressed=true]')).toHaveText('off');
  expect(await page.evaluate(async (id) => (await (await fetch(`/api/items/${id}`)).json()).highlight, id)).toBe('hide');

  // Leave the shared fixture as found.
  await page.evaluate(async () => fetch('/api/settings', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ highlight_generated_default: false }) }));
});
