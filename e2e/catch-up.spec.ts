import { fixtureJson } from './api-fixture';
import { test, expect, type Page } from './fixture';

// Catch up (src/ui/catch-up.tsx, the catch-up helper): an entry's ⋯ menu lays
// the conversation it carries out oldest first, each card its own words.
async function login(page: Page) {
  await page.goto('/studio/login');
  await page.locator('[name=password]').fill('test-password');
  await page.getByRole('button', { name: 'log in', exact: true }).click();
  await expect(page.locator('#composer-text')).toBeVisible();
}
const api = (page: Page, method: string, path: string, body?: unknown) =>
  page.evaluate(fixtureJson, { method, path: `/api${path}`, body });
async function publish(page: Page, contentMd: string, kind: 'fragment' | 'thread' = 'fragment') {
  const id = (await api(page, 'POST', '/items', { contentMd, kind })).json.id as string;
  expect((await api(page, 'POST', `/items/${id}/publish`, {})).status).toBe(200);
  return id;
}

test('catch up lays a quote chain out oldest first, each card its own words', async ({ page }) => {
  await login(page);
  const stamp = Date.now();
  const a = await publish(page, `First word ${stamp}.`);
  const b = await publish(page, `Second word ${stamp}.\n\n![[${a}]]`, 'thread');
  const c = await publish(page, `Third word ${stamp}.\n\n![[${b}]]`, 'thread');
  await page.goto('/studio/reading?sub=own');
  const entry = page.locator(`.reading-entry[data-key="own:${c}"]`);
  await expect(entry).toBeVisible();
  await entry.getByRole('button', { name: 'more actions', exact: true }).click();
  await page.getByRole('dialog', { name: 'actions' }).getByRole('button', { name: /^catch up/ }).click();
  const sheet = page.getByRole('dialog', { name: 'Catch up' });
  const cards = sheet.locator('.catch-up-card');
  await expect(cards).toHaveCount(3);
  await expect(cards.nth(0)).toContainText(`First word ${stamp}.`);
  await expect(cards.nth(1)).toContainText(`Second word ${stamp}.`);
  await expect(cards.nth(1)).not.toContainText(`First word ${stamp}.`);
  await expect(cards.nth(2)).toContainText(`Third word ${stamp}.`);
  await expect(cards.nth(2)).not.toContainText(`Second word ${stamp}.`);
  await expect(cards.nth(0).locator('.catch-up-meta')).toContainText('you · v1');
  // summarize asks the catch-up-summary helper; with no model chosen it says so in the sheet.
  await sheet.getByRole('button', { name: 'summarize' }).click();
  await expect(sheet.getByRole('alert')).toContainText(/no AI model is configured for text helpers/);
  // A card's source is a router link (the sheet host has the router's context).
  await cards.nth(0).getByRole('link', { name: 'you' }).click();
  await expect(sheet).toBeHidden();
  await expect(page).toHaveURL(new RegExp(`/studio/reading/~own/${a}$`));
});
