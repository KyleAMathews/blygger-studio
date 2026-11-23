import { test, expect, type Page } from './fixture';

// The pickerSource slot, through extensions/picker-example: a "drafts" tab in the [[ picker beside
// the Studio's own search, results from the extension, picked with the picker's own keyboard and
// inserted in the form being typed; the tab remembered; no tab row with no source enabled.
async function login(page: Page) {
  await page.goto('/studio/login');
  await page.locator('[name=password]').fill('test-password');
  await page.getByRole('button', { name: 'log in', exact: true }).click();
  await expect(page.locator('#composer-text')).toBeVisible();
}
const setExtensions = (page: Page, extensions: string[]) =>
  page.evaluate(async (names) => {
    const response = await fetch('/api/settings', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ extensions: names }) });
    if (!response.ok) throw new Error(`settings ${response.status}`);
  }, extensions);
const createDraft = (page: Page, contentMd: string) =>
  page.evaluate(async (contentMd) => (await (await fetch('/api/items', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ contentMd, kind: 'thread' }) })).json()).id as string, contentMd);
const typing = (page: Page, pickerTyping: 'auto' | 'editor' | 'panel') =>
  page.evaluate(async (v) => (await fetch('/api/settings', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ pickerTyping: v }) })).status, pickerTyping);

test.beforeEach(async ({ page }) => {
  await login(page);
  await page.evaluate(() => localStorage.removeItem('blyg.picker.tab'));
  await typing(page, 'editor');
});
test.afterEach(async ({ page }) => {
  await page.evaluate(() => localStorage.removeItem('blyg.picker.tab'));
  await setExtensions(page, []);
  await typing(page, 'auto');
});

test('with no source enabled the picker has no tab row', async ({ page }) => {
  await setExtensions(page, []);
  await page.reload();
  await page.locator('#composer-text').fill('see [[anything');
  const panel = page.getByRole('complementary', { name: 'link picker' });
  await expect(panel).toBeVisible();
  await expect(panel.locator('[data-picker-tab]')).toHaveCount(0);
});

test("a source's tab lists its results; the picker's keyboard picks one and inserts it as a link", async ({ page }, info) => {
  const run = `ps${Date.now().toString(36)}${info.project.name}`;
  const draft = await createDraft(page, `Draft heading ${run}\n\nBody of a draft.`);
  await setExtensions(page, ['picker-example']);
  await page.reload();
  const editor = page.locator('#composer-text');
  await editor.fill(`see [[${run}`);
  const panel = page.getByRole('complementary', { name: 'link picker' });
  await expect(panel.locator('[data-picker-tab]')).toHaveCount(2);
  // The Studio's own search is first and open by default; a draft isn't in it.
  await expect(panel.locator('[data-picker-tab=items]')).toHaveAttribute('aria-pressed', 'true');
  await panel.locator('[data-picker-tab=picker-example]').click();
  const results = panel.locator('[data-picker-source=picker-example] [role=option]');
  await expect(results).toHaveCount(1);
  await expect(results.first()).toContainText(`Draft heading ${run}`);
  await expect(results.first()).toContainText('thread · draft');
  await page.screenshot({ path: info.outputPath(`picker-sources-${info.project.name}.png`) });
  // The keyboard stayed in the editor: Enter picks the selected result.
  await editor.focus();
  await editor.press('End');
  await editor.press('Enter');
  await expect(editor).toHaveValue(`see [[${draft} | Draft heading ${run}]]`);
  await expect(panel).toHaveCount(0);
  // The tab is remembered on this device.
  await editor.fill(`again [[${run}`);
  await expect(panel.locator('[data-picker-tab=picker-example]')).toHaveAttribute('aria-pressed', 'true');
  await expect(results).toHaveCount(1);
  // A newer query never lists, or lets Enter pick, the older query's results.
  await editor.press('End');
  await editor.pressSequentially('zz');
  await editor.press('Enter');
  await expect(editor).not.toHaveValue(new RegExp(draft));
  await expect(editor).toHaveValue(new RegExp(`${run}zz`));
});
