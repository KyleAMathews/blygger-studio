import { test, expect, type Page } from './fixture';

// The spellcheck extension: its editor bar button, the dictionary check with a suggestion applied
// in place, ignore, and the AI proofread's place in the full editor.
async function login(page: Page) {
  await page.goto('/studio/login'); await page.locator('[name=password]').fill('test-password');
  await page.getByRole('button', { name: 'log in', exact: true }).click();
  await expect(page.locator('#composer-text')).toBeVisible();
}
const setExtensions = (page: Page, extensions: string[]) =>
  page.evaluate(async (names) => {
    const response = await fetch('/api/settings', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ extensions: names }) });
    if (!response.ok) throw new Error(`settings ${response.status}`);
  }, extensions);

test.beforeEach(async ({ page }) => {
  await login(page);
  await page.evaluate(async () => {
    localStorage.removeItem('blyg.editorBars.hidden');
    const { revision } = await (await fetch('/api/dictionary')).json();
    await fetch('/api/dictionary/owner', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ words: [], expectedRevision: revision }) });
  });
  await setExtensions(page, ['spellcheck']);
});
test.afterEach(async ({ page }) => {
  await setExtensions(page, []);
});

test('the composer: a misspelling is listed, a suggestion fixes it, ignore leaves it alone', async ({ page }) => {
  await page.goto('/studio/');
  const box = page.locator('#composer-text');
  await box.fill('Teh cat sat on [[0000000000000000000000000a | the mta]] and blorpt.');
  await page.locator('[data-action=spellcheck]').click();
  const sheet = page.locator('.spellcheck-sheet');
  await expect(sheet.locator('li[data-word]')).toHaveCount(3);
  await expect(sheet.locator('li[data-word="Teh"] [data-suggestion]').first()).toHaveText('The');
  await sheet.locator('li[data-word="Teh"] [data-suggestion="The"]').click();
  await expect(box).toHaveValue('The cat sat on [[0000000000000000000000000a | the mta]] and blorpt.');
  await sheet.locator('li[data-word="blorpt"]').getByRole('button', { name: 'ignore' }).click();
  await expect(sheet.locator('li[data-word]')).toHaveCount(1);
  await expect(sheet.locator('li[data-word="mta"]')).toBeVisible();
  // The AI proofread is the full editor's: it reads the saved draft.
  await expect(sheet).toContainText('In the full editor');
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-action=spellcheck]')).toHaveText('spelling · 1');
});

test('the full editor offers the AI proofread; add to dictionary goes to the blyg’s dictionary', async ({ page }) => {
  const id = await page.evaluate(async () => (await (await fetch('/api/items', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ contentMd: 'A blyg is clean.', kind: 'thread' }) })).json()).id as string);
  await page.goto(`/studio/edit/${id}`);
  await page.locator('[data-action=spellcheck]').click();
  const sheet = page.locator('.spellcheck-sheet');
  await expect(sheet.locator('[data-action=spellcheck-proofread]')).toBeVisible();
  await sheet.locator('li[data-word="blyg"]').getByRole('button', { name: 'add to dictionary' }).click();
  await expect(sheet.locator('[data-spellcheck-clean]')).toBeVisible();
  expect(await page.evaluate(async () => (await (await fetch('/api/dictionary')).json()).sources.find((s: { source: string }) => s.source === 'owner')?.words)).toEqual(['blyg']);
  await page.reload();
  await page.locator('[data-action=spellcheck]').click();
  await expect(page.locator('.spellcheck-sheet [data-spellcheck-clean]')).toBeVisible();
});
