import { expect, type Page } from '@playwright/test';

/**
 * The studio's confirm/prompt sheets (src/ui/sheets.tsx) replaced
 * window.confirm/prompt, so `page.on('dialog')` no longer sees them: a test
 * answers the sheet by clicking it, which is also what a person does.
 */
export async function answerSheet(
  page: Page,
  { name, accept = true, text }: { name?: string | RegExp; accept?: boolean; text?: string } = {},
) {
  const sheet = page.getByRole('dialog', name ? { name } : {});
  await expect(sheet).toBeVisible();
  if (text !== undefined) await sheet.getByRole('textbox').fill(text);
  await sheet.locator(accept ? '[data-sheet=ok]' : '[data-sheet=cancel]').click();
  await expect(sheet).toHaveCount(0);
}

/** Accept every confirm sheet that appears: the sheet-era `page.on('dialog', d => d.accept())`. */
export async function acceptSheets(page: Page) {
  await page.addLocatorHandler(page.locator('.sheet-confirm'), (sheet) => sheet.locator('[data-sheet=ok]').click());
}
