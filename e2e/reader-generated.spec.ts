import { fixtureJson } from './api-fixture';
import { test, expect, type Page } from './fixture';

// Generated spans in the reader are drawn as on the public pages, under the
// same setting (src/ui/generated-highlight.ts, src/generated-style.ts), for
// any item the reader shows; quoted generated text included.
async function login(page: Page) {
  await page.goto('/studio/login');
  await page.locator('[name=password]').fill('test-password');
  await page.getByRole('button', { name: 'log in', exact: true }).click();
  await expect(page.locator('#composer-text')).toBeVisible();
}
const api = (page: Page, method: string, path: string, body?: unknown) =>
  page.evaluate(fixtureJson, { method, path: `/api${path}`, body });
async function publish(page: Page, contentMd: string) {
  const { json } = await api(page, 'POST', '/items', { contentMd, kind: 'thread' });
  expect((await api(page, 'POST', `/items/${json.id}/publish`, {})).status).toBe(200);
  return json.id as string;
}
const washed = (page: Page, selector: string) =>
  page.locator(selector).first().evaluate((el) => getComputedStyle(el).backgroundColor !== 'rgba(0, 0, 0, 0)');

test('the reader highlights generated spans when the setting is on, and not when it is off', async ({ page }) => {
  await login(page);
  const before = (await api(page, 'GET', '/settings')).json.highlightGeneratedDefault;
  try {
    const gen = await publish(page, `A [TK]impyrt claude-opus-5-5=generated phrase ${Date.now()}[/TK] here.\n\n[TK]impyrt claude-opus-5-5=\nA generated block.\n[/TK]`);
    const quoting = await publish(page, `Quoting it.\n\n![[${gen}]]`);
    await api(page, 'PATCH', '/settings', { highlightGeneratedDefault: true });
    await page.goto(`/studio/reading/~own/${gen}`);
    await expect(page.locator('.entry-body span.blyg-tk-gen').first()).toBeVisible();
    expect(await washed(page, '.entry-body span.blyg-tk-gen')).toBe(true);
    expect(await washed(page, '.entry-body div.blyg-tk-gen')).toBe(true);
    await page.goto(`/studio/reading/~own/${quoting}`);
    await expect(page.locator('.entry-body blockquote .blyg-tk-gen').first()).toBeVisible();
    expect(await washed(page, '.entry-body blockquote div.blyg-tk-gen')).toBe(true);

    await api(page, 'PATCH', '/settings', { highlightGeneratedDefault: false });
    await page.goto(`/studio/reading/~own/${gen}`);
    await expect(page.locator('.entry-body span.blyg-tk-gen').first()).toBeVisible();
    expect(await washed(page, '.entry-body span.blyg-tk-gen')).toBe(false);
  } finally {
    await api(page, 'PATCH', '/settings', { highlightGeneratedDefault: before });
  }
});
