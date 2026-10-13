import { test, expect, type Page } from './fixture.ts';

// The links section (session 47): chosen in Settings, shown on every public
// page. The form sends every field back, so it must save with the section set.
const api = (page: Page, method: string, path: string, body?: unknown) =>
  page.evaluate(async ([method, path, body]) => {
    const res = await fetch(path as string, { method: method as string, headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: res.status, json: await res.json().catch(() => null) };
  }, [method, path, body] as const);

test('threads and links chosen in Settings show on the public page', async ({ page, browser }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/studio/login');
  await page.locator('[name="password"]').fill('test-password');
  await page.getByRole('button', { name: 'log in', exact: true }).click();
  await expect(page.locator('#composer-text')).toBeVisible();
  // Both projects share one database.
  await api(page, 'PATCH', '/api/settings', { links_threads: [], links_external: [], links_position: 'bottom', front_page: '' });
  const label = `Colophon ${test.info().project.name}`;
  const created = await api(page, 'POST', '/api/items', { content_md: `# ${label}\n\nHow this blyg is made.`, kind: 'thread' });
  const id = created.json.id as string;
  expect((await api(page, 'POST', `/api/items/${id}/publish`, {})).status).toBe(200);

  await page.goto('/studio/settings');
  const card = page.locator('#links-section');
  await card.getByRole('radio', { name: 'On the right' }).check();
  await card.getByRole('combobox', { name: 'add a thread' }).selectOption(id);
  await expect(card.locator('.linked-threads')).toContainText(label);
  await card.locator('#links_external').fill('Résumé | https://example.org/resume.pdf');
  await page.getByRole('button', { name: 'save settings' }).click();
  await expect.poll(async () => (await api(page, 'GET', '/api/settings')).json.links_threads).toEqual([id]);

  const reader = await browser.newContext();
  const pub = await reader.newPage();
  await pub.goto('/');
  const links = pub.locator('aside.blyg-links');
  await expect(links.getByRole('link', { name: label })).toHaveAttribute('href', `/t/${id}/`);
  await expect(links.getByRole('link', { name: 'Résumé' })).toHaveAttribute('href', 'https://example.org/resume.pdf');
  await expect(links.getByRole('link', { name: 'Made with Blygger' })).toBeVisible();
  await reader.close();

  await api(page, 'PATCH', '/api/settings', { links_threads: [], links_external: [], links_position: 'bottom' });
  expect(errors).toEqual([]);
});
