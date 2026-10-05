import { test, expect, type Page } from './fixture';

// The [[ / ![[ picker panel (0.29): a non-modal panel at the right (bottom on
// a phone) with source and sort, and a per-device choice of where you type.
async function login(page: Page) {
  await page.goto('/studio/login');
  await page.locator('[name=password]').fill('test-password');
  await page.getByRole('button', { name: 'log in', exact: true }).click();
  await expect(page.locator('#composer-text')).toBeVisible();
}
async function publish(page: Page, texts: string[]) {
  return page.evaluate(async (texts) => {
    const ids: string[] = [];
    for (const content_md of texts) {
      const item = await (await fetch('/api/items', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ content_md }) })).json();
      await fetch(`/api/items/${item.id}/publish`, { method: 'POST' });
      ids.push(item.id);
      // Distinct publish times, so newest/oldest has an order to show.
      await new Promise((r) => setTimeout(r, 1100));
    }
    return ids;
  }, texts);
}
const options = (page: Page) => page.getByRole('listbox', { name: 'items' }).getByRole('option');

test('typing [[ opens the panel; source, sort, Escape and Enter work from the editor', async ({ page }, info) => {
  await login(page);
  await page.evaluate(() => localStorage.clear());
  const token = `${info.project.name}pickertoken`;
  // The word sits past the old 70-character excerpt: the old search could not find it.
  const [first, second] = await publish(page, [
    `First of two, with an opening long enough to push the token well past any excerpt the old picker searched. ${token}`,
    `Second of two, equally long, so that only the full-text search finds the token that follows here. ${token}`,
  ]);
  await page.reload();
  const editor = page.locator('#composer-text');
  await editor.fill(`see [[${token}`);
  const panel = page.getByRole('complementary', { name: 'link picker' });
  await expect(panel).toBeVisible();
  await expect(options(page)).toHaveCount(2);
  await expect(options(page).first()).toContainText('mine');
  // Newest first by default; oldest first reverses.
  await expect(options(page).first()).toContainText('Second of two');
  await panel.getByRole('combobox', { name: 'sort' }).selectOption('oldest');
  await expect(options(page).first()).toContainText('First of two');
  // Imported only: these are both ours, so nothing.
  await panel.getByRole('radio', { name: 'imported' }).check();
  await expect(panel.getByText('0 items')).toBeVisible();
  await panel.getByRole('radio', { name: 'both' }).check();
  await expect(options(page)).toHaveCount(2);
  await page.screenshot({ path: info.outputPath(`picker-${info.project.name}.png`) });
  // The keyboard never left the editor: arrows and Enter pick.
  await editor.focus();
  await editor.press('End');
  await editor.press('ArrowDown');
  await editor.press('Enter');
  await expect(editor).toHaveValue(`see [[${second}]]`);
  await expect(panel).toHaveCount(0);
  // Escape closes without touching the text.
  await editor.fill(`again [[${token}`);
  await expect(page.getByRole('complementary', { name: 'link picker' })).toBeVisible();
  await editor.press('Escape');
  await expect(page.getByRole('complementary', { name: 'link picker' })).toHaveCount(0);
  await expect(editor).toHaveValue(`again [[${token}`);
  expect(first).toBeTruthy();
});

test('"type in this panel" moves the keyboard to the panel search, remembered per device', async ({ page }, info) => {
  await login(page);
  await page.evaluate(() => localStorage.clear());
  const token = `${info.project.name}panelmode`;
  const [id] = await publish(page, [`Panel mode target ${token}`]);
  await page.reload();
  const editor = page.locator('#composer-text');
  await editor.fill('x [[');
  const panel = page.getByRole('complementary', { name: 'link picker' });
  await panel.getByRole('combobox', { name: 'type in' }).selectOption('panel');
  const search = panel.getByRole('searchbox', { name: 'search items' });
  await expect(search).toBeFocused();
  await search.fill(token);
  await expect(options(page)).toHaveCount(1);
  await search.press('Enter');
  await expect(editor).toHaveValue(`x [[${id}]]`);
  await expect(editor).toBeFocused();
  // Remembered: the next bracket opens straight into the panel's search box.
  await page.reload();
  await page.locator('#composer-text').fill('y [[');
  await expect(page.getByRole('searchbox', { name: 'search items' })).toBeFocused();
  await page.evaluate(() => localStorage.clear());
});

test('on a phone the panel docks at the bottom', async ({ page }, info) => {
  test.skip(info.project.name !== 'mobile', 'phone layout only');
  await login(page);
  await page.locator('#composer-text').fill('[[');
  const panel = page.getByRole('complementary', { name: 'link picker' });
  const viewport = page.viewportSize()!;
  // Measured once the slide-in animation has finished.
  await expect.poll(async () => { const b = await panel.boundingBox(); return b && Math.round(b.y + b.height); }).toBe(viewport.height);
  expect(Math.round((await panel.boundingBox())!.width)).toBe(viewport.width);
});
