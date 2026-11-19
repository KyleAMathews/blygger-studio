import { test, expect, type Page } from './fixture';

// Tangling as an author meets it (blygger-spec docs/tangling-plan.md §2):
// `![[+ …]]` spans in the thread editor show as new items in the preview,
// publish asks with a count, and afterwards the editor holds the rewritten
// source, so the next autosave cannot write the spans back.
const shots = process.env.TANGLE_SHOTS;
const shot = (page: Page, name: string) =>
  shots ? page.screenshot({ path: `${shots}/${name}-${test.info().project.name}.png` }) : Promise.resolve(undefined);

async function login(page: Page) {
  await page.goto('/studio/login'); await page.locator('[name=password]').fill('test-password');
  await page.getByRole('button', { name: 'log in', exact: true }).click();
  await expect(page.locator('#composer-text')).toBeVisible();
}
const api = (page: Page, method: string, path: string, body?: unknown) =>
  page.evaluate(async ({ method, path, body }) => {
    const res = await fetch(path, { method, headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: res.status, json: await res.json().catch(() => null) };
  }, { method, path, body });
const editor = (page: Page) => page.locator('textarea').first();

test('a thread with two spans asks with a count, publishes both, and keeps the rewritten source', async ({ page }) => {
  const tag = `tangle${Date.now().toString(36)}`;
  await login(page);
  const { json } = await api(page, 'POST', '/api/items', { contentMd: 'placeholder', kind: 'thread' });
  const id = json.id as string;
  await page.goto(`/studio/edit/${id}`);
  await editor(page).fill(`Opening ${tag}.\n\n![[+ First part ${tag}]]\n\n![[+ Second part ${tag}]]\n`);

  // The preview shows each span as the new item it will be. On a phone it is behind a switch.
  const phone = test.info().project.name === 'mobile';
  if (phone) await page.getByRole('button', { name: 'preview', exact: true }).click();
  const preview = page.locator('#preview-body');
  await expect(preview.locator('blockquote.blyg-tangle-new')).toHaveCount(2);
  await expect(preview.locator('blockquote.blyg-tangle-new .blyg-tangle-label').first()).toHaveText('new item');
  await expect(preview.locator('blockquote.blyg-tangle-new').first()).toContainText(`First part ${tag}`);
  await expect(preview).not.toContainText('![[+');
  await shot(page, 'editor-with-spans');
  if (phone) await page.getByRole('button', { name: 'draft', exact: true }).click();

  await page.getByRole('button', { name: /^publish/i }).first().click();
  // The note dialog first (it may not appear), then the count.
  const count = page.getByRole('dialog', { name: 'This will publish 2 new items and this thread' });
  const note = page.getByRole('dialog').filter({ hasNot: page.locator('.tangle-parts') });
  await expect(count.or(note).first()).toBeVisible();
  if (!(await count.isVisible())) await note.getByRole('button', { name: /publish/i }).last().click();
  await expect(count).toBeVisible();
  await expect(count.locator('.tangle-parts li')).toHaveText([`First part ${tag}`, `Second part ${tag}`]);
  await shot(page, 'count-dialog');
  await count.getByRole('button', { name: 'publish all' }).click();

  await expect.poll(async () => (await api(page, 'GET', `/api/items/${id}`)).json.version).toBe(1);
  const source = (await api(page, 'GET', `/api/items/${id}`)).json.contentMd as string;
  expect(source).not.toContain('![[+');
  expect(source).toMatch(new RegExp(`^Opening ${tag}\\.\\n\\n!\\[\\[\\w{26} \\| First part ${tag}\\]\\]\\n\\n!\\[\\[\\w{26} \\| Second part ${tag}\\]\\]\\n$`));
  // The editor took up the rewritten source; an autosave would not restore the spans.
  await expect(editor(page)).toHaveValue(source);
  await page.waitForTimeout(800);
  expect((await api(page, 'GET', `/api/items/${id}`)).json.contentMd).toBe(source);

  // On the wire: the thread quotes both parts, each a published thread of its own.
  // (Item documents, not feed.xml, which is served stale-while-revalidate.)
  const doc = await (await page.request.get(`/items/${id}.json`)).json();
  const parts = (doc.transclusions as { id: string }[]).map((t) => t.id);
  expect(parts).toHaveLength(2);
  for (const [i, part] of parts.entries()) {
    const partDoc = await (await page.request.get(`/items/${part}.json`)).json();
    expect([partDoc.kind, partDoc.version, partDoc.content_md]).toEqual(['thread', 1, `${i ? 'Second' : 'First'} part ${tag}`]);
  }
});

test('a [[+ text]] placeholder previews as a link, is counted as linked, and becomes [[id | text]]', async ({ page }) => {
  const tag = `idea${Date.now().toString(36)}`;
  await login(page);
  const { json } = await api(page, 'POST', '/api/items', { contentMd: 'placeholder', kind: 'thread' });
  const id = json.id as string;
  await page.goto(`/studio/edit/${id}`);
  await editor(page).fill(`We should write about [[+ ${tag} later]] someday.\n`);

  const phone = test.info().project.name === 'mobile';
  if (phone) await page.getByRole('button', { name: 'preview', exact: true }).click();
  const link = page.locator('#preview-body .blyg-tangle-link');
  await expect(link).toHaveText(`${tag} later`);
  await expect(page.locator('#preview-body')).not.toContainText('[[+');
  await shot(page, 'editor-with-placeholder');
  if (phone) await page.getByRole('button', { name: 'draft', exact: true }).click();

  await page.getByRole('button', { name: /^publish/i }).first().click();
  const count = page.getByRole('dialog', { name: 'This will publish 1 new item and this thread' });
  const note = page.getByRole('dialog').filter({ hasNot: page.locator('.tangle-parts') });
  await expect(count.or(note).first()).toBeVisible();
  if (!(await count.isVisible())) await note.getByRole('button', { name: /publish/i }).last().click();
  await expect(count.locator('.tangle-parts li')).toHaveText([`${tag} later (linked)`]);
  await count.getByRole('button', { name: 'publish all' }).click();

  await expect.poll(async () => (await api(page, 'GET', `/api/items/${id}`)).json.version).toBe(1);
  const source = (await api(page, 'GET', `/api/items/${id}`)).json.contentMd as string;
  expect(source).toMatch(new RegExp(`^We should write about \\[\\[\\w{26} \\| ${tag} later\\]\\] someday\\.\\n$`));
  await expect(editor(page)).toHaveValue(source);

  // On the wire: the thread lists the new item in links[], which carries the heading.
  const doc = await (await page.request.get(`/items/${id}.json`)).json();
  const links = doc.links as { id: string }[];
  expect(links).toHaveLength(1);
  const part = await (await page.request.get(`/items/${links[0].id}.json`)).json();
  expect([part.kind, part.content_md.trim()]).toEqual(['thread', `# ${tag} later`]);
});
