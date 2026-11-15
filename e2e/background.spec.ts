import { test, expect, type Page } from './fixture';

// Background and Foreground in the reader (src/background.ts): an entry's ⋯
// menu moves it between the main lenses and the Background lens, which says
// why it is there. Both projects share one server, so each run's item carries
// its own marker and its placement is cleared afterwards.
async function login(page: Page) {
  await page.goto('/studio/login'); await page.locator('[name=password]').fill('test-password');
  await page.getByRole('button', { name: 'log in', exact: true }).click();
  await expect(page.locator('#composer-text')).toBeVisible();
}
const publish = (page: Page, contentMd: string) =>
  page.evaluate(async (contentMd) => {
    const created = await fetch('/api/items', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ contentMd }) });
    const { id, revision } = await created.json();
    const published = await fetch(`/api/items/${id}/publish`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ expectedRevision: revision }) });
    if (!published.ok) throw new Error(`publish ${published.status}`);
    return id as string;
  }, contentMd);
const clearPlacement = (page: Page, id: string) =>
  page.evaluate(async (id) => {
    await fetch('/api/reading/placement', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ source: 'own', sub: '', id, placement: null }) });
  }, id);
async function choose(page: Page, entry: ReturnType<Page['locator']>, label: string) {
  await entry.getByRole('button', { name: 'more actions', exact: true }).click();
  const sheet = page.getByRole('dialog', { name: 'actions' });
  await sheet.getByRole('button', { name: new RegExp(`^${label}`) }).click();
  await expect(sheet).toHaveCount(0);
}

test('an entry moves to Background and back from its ⋯ menu, and Background says why', async ({ page }) => {
  await login(page);
  const marker = `Bg${Date.now().toString(36)}`;
  const id = await publish(page, `${marker} wants to be out of the way.`);
  try {
    await page.goto('/studio/reading?sub=own');
    const entry = page.locator('.reading-entry').filter({ hasText: marker });
    await expect(entry).toHaveCount(1);
    await choose(page, entry, 'move to Background');
    await expect(entry).toHaveCount(0);

    await page.getByRole('group', { name: 'reading lens' }).getByRole('button', { name: 'Background' }).click();
    await expect(page).toHaveURL(/lens=background/);
    await expect(entry).toHaveCount(1);
    await expect(entry.locator('.badge-why')).toHaveText('you moved this');

    await choose(page, entry, 'move to Foreground');
    await expect(entry).toHaveCount(0);
    await page.getByRole('group', { name: 'reading lens' }).getByRole('button', { name: 'All' }).click();
    await expect(entry).toHaveCount(1);
    // A choice of Foreground can be cleared, and the rules decide again.
    await choose(page, entry, 'clear my choice');
    await expect(entry).toHaveCount(1);
  } finally {
    await clearPlacement(page, id);
  }
});

test('Settings has a Background card whose rule toggles', async ({ page }) => {
  await login(page);
  await page.goto('/studio/settings#background');
  const card = page.locator('#background');
  await expect(card.getByRole('heading', { name: 'Background' })).toBeVisible();
  await expect(card.getByRole('checkbox', { name: /Withdrawn items/ })).toBeDisabled();
  await expect(card.getByRole('checkbox', { name: /Your own minor changes/ })).toBeChecked();
});
