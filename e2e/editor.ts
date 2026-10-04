import { expect, type Page } from '@playwright/test';

/**
 * The redesigned editor (PWA phase 2A) keeps its panels — edit note, TK
 * scopes, attachments, quoted snapshots, history — in collapsible cards, and
 * its less frequent actions in the ⋯ sheet. Tests open them as a person does.
 */
export async function openCard(page: Page, id: string) {
  const card = page.locator(`details#${id}`);
  if (!(await card.evaluate((el) => (el as HTMLDetailsElement).open))) await card.locator('> summary').click();
  await expect(card).toHaveAttribute('open', '');
}

/** Choose a row of the editor's ⋯ menu. */
export async function editorMenu(page: Page, label: string) {
  await page.getByRole('button', { name: 'more actions' }).click();
  const sheet = page.getByRole('dialog', { name: 'actions' });
  await sheet.getByRole('button', { name: new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`) }).click();
  await expect(sheet).toHaveCount(0);
}

/** Expand a compose list row (rows are collapsed to one line). */
export async function expandRow(page: Page, id: string) {
  const row = page.locator(`.item-row[data-id="${id}"]`);
  const head = row.locator('.item-head');
  if ((await head.getAttribute('aria-expanded')) !== 'true') await head.click();
  await expect(head).toHaveAttribute('aria-expanded', 'true');
  return row;
}
