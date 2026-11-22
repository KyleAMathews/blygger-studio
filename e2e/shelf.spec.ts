import { fixtureJson } from './api-fixture';
import { test, expect, type Page } from './fixture.ts';
import { editorMenu, expandRow } from './editor.ts';

// The shelf (#135): own items (sub '~own') in the owner's order at the top of the compose
// list, added and removed from an item's actions, reordered with up and down.
const api = (page: Page, method: string, path: string, body?: unknown) =>
  page.evaluate(fixtureJson, { method, path, body });

test('items go on the shelf, reorder, and come off again', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/studio/login');
  await page.locator('[name="password"]').fill('test-password');
  await page.getByRole('button', { name: 'log in', exact: true }).click();
  await expect(page.locator('#composer-text')).toBeVisible();
  const { revision } = (await api(page, 'GET', '/api/shelf')).json as { revision: number };
  expect((await api(page, 'PUT', '/api/shelf', { entries: [], expectedRevision: revision })).status).toBe(200);
  const tag = crypto.randomUUID().slice(0, 8);
  const a = (await api(page, 'POST', '/api/items', { contentMd: `Now page ${tag}` })).json.id as string;
  const b = (await api(page, 'POST', '/api/items', { contentMd: `Reading log ${tag}` })).json.id as string;

  await page.goto('/studio/');
  const shelf = page.locator('section.shelf');
  await expect(shelf).toHaveCount(0);
  const rowA = await expandRow(page, a);
  await rowA.locator('[data-action="shelf"]').click();
  await expect(rowA.locator('[data-action="shelf"]')).toHaveText('remove from saved');
  await expect(shelf.locator('.shelf-row')).toHaveCount(1);

  // The editor's ⋯ menu offers the same action.
  await page.goto(`/studio/edit/${b}`);
  await editorMenu(page, 'save');
  await page.goto('/studio/');

  const rows = shelf.locator('.shelf-row');
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0)).toContainText(`Now page ${tag}`);
  await expect(rows.nth(1)).toContainText(`Reading log ${tag}`);
  await rows.nth(1).getByRole('button', { name: 'move up' }).click();
  await expect(rows.nth(0)).toContainText(`Reading log ${tag}`);
  await expect.poll(async () => (await api(page, 'GET', '/api/shelf')).json.entries).toEqual([{ sub: '~own', remoteId: b }, { sub: '~own', remoteId: a }]);

  await rows.nth(0).getByRole('button', { name: 'remove from saved' }).click();
  await expect(rows).toHaveCount(1);
  await expect(rows.nth(0)).toContainText(`Now page ${tag}`);
  await expect.poll(async () => (await api(page, 'GET', '/api/shelf')).json.entries).toEqual([{ sub: '~own', remoteId: a }]);

  const again = await expandRow(page, a);
  await again.locator('[data-action="shelf"]').click();
  await expect(shelf).toHaveCount(0);
  expect((await api(page, 'GET', '/api/shelf')).json.entries).toEqual([]);
  expect(errors).toEqual([]);
});

// ROADMAP row 115: "add to shelf" beside "+ add to hopper" on every reading
// entry, and the Shelf lens listing the shelf in its order.
test('reading entries go on the shelf, and the Shelf lens lists them in order', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/studio/login');
  await page.locator('[name="password"]').fill('test-password');
  await page.getByRole('button', { name: 'log in', exact: true }).click();
  await expect(page.locator('#composer-text')).toBeVisible();
  const clear = async () => {
    const { revision } = (await api(page, 'GET', '/api/shelf')).json as { revision: number };
    expect((await api(page, 'PUT', '/api/shelf', { entries: [], expectedRevision: revision })).status).toBe(200);
  };
  await clear();
  try {
    const tag = crypto.randomUUID().slice(0, 8);
    const mine = (await api(page, 'POST', '/api/items', { contentMd: `Shelved from reading ${tag}` })).json.id as string;
    await api(page, 'POST', `/api/items/${mine}/publish`, {});
    const native = '.reading-entry[data-key="imported:[\\"parity-native\\",\\"00000000000000000000000001\\"]"]';

    // Each from its own source: earlier tests can push the old fixture off All's first page.
    await page.goto('/studio/reading?sub=parity-native');
    const imported = page.locator(native);
    await imported.locator('[data-action="shelf"]').click();
    await expect(imported.locator('[data-action="shelf"]')).toHaveAccessibleName('remove from saved');
    await page.goto('/studio/reading?sub=own');
    const own = page.locator(`.reading-entry[data-key="own:${mine}"]`);
    await own.locator('[data-action="shelf"]').click();
    await expect(own.locator('[data-action="shelf"]')).toHaveAccessibleName('remove from saved');
    await expect.poll(async () => (await api(page, 'GET', '/api/shelf')).json.entries).toEqual([
      { sub: 'parity-native', remoteId: '00000000000000000000000001' },
      { sub: '~own', remoteId: mine },
    ]);

    await page.goto('/studio/reading');
    const bar = page.getByRole('group', { name: 'reading tabs' });
    await bar.getByRole('button', { name: 'Saved' }).click();
    await expect(page).toHaveURL(/lens=shelf/);
    await expect(page.locator('.reading-entry')).toHaveCount(2);
    await expect(page.locator('.reading-entry').nth(0)).toHaveAttribute('data-key', /parity-native/);
    await expect(page.locator('.reading-entry').nth(1)).toHaveAttribute('data-key', `own:${mine}`);

    // Taking one off empties it from the lens.
    await page.locator(native).locator('[data-action="shelf"]').click();
    await expect(page.locator('.reading-entry')).toHaveCount(1);
    await page.locator(`.reading-entry[data-key="own:${mine}"]`).locator('[data-action="shelf"]').click();
    await expect(page.locator('.empty')).toContainText('Nothing saved yet');
    expect(errors).toEqual([]);
  } finally {
    await clear();
  }
});
