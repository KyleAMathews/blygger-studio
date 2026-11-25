/** Real receiving driver for the publish-confirmation oracle. The plan supplies
 * premises (item state, surface, mode, hopper changes, the item read's fate,
 * the answer); this records the button's label, every confirmation shown, any
 * error, the publish requests the server accepted, and the stored item.
 * publish-model.ts predicts their meanings independently.
 */
import type { Page, Request, Route } from '@playwright/test';
import { hopperNames, type PublishPlan, type SearchState } from '../test-browser/publish-model.ts';

type RecordObservation = (phase: string, value: Record<string, unknown>) => void;
async function api(page: Page, method: string, path: string, body?: unknown) {
  return page.evaluate(async ({ method, path, body }) => {
    const response = await fetch('/api' + path, { method, headers: { 'content-type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    if (!response.ok) throw new Error(`${method} ${path}: HTTP ${response.status} ${await response.text()}`);
    return response.status === 204 ? undefined : response.json();
  }, { method, path, body }) as Promise<any>;
}
async function hopper(page: Page, name: string, open: boolean) {
  const id = (await api(page, 'POST', '/hoppers', { name })).id as string;
  if (open) await api(page, 'PATCH', `/hoppers/${id}`, { public: true });
  return id;
}

export async function login(page: Page) {
  await page.goto('/studio/login');
  await page.locator('[name="password"]').fill('test-password');
  await page.getByRole('button', { name: 'log in', exact: true }).click();
  await page.locator('#composer-text').waitFor({ state: 'visible' });
}

export async function runPublishPlan(page: Page, plan: PublishPlan, record: RecordObservation) {
  const tag = crypto.randomUUID().slice(0, 8), names = hopperNames(tag);
  await api(page, 'PATCH', '/settings', { defaultVisibility: plan.mode === 'notebook' ? 'private' : 'public' });
  const created = await api(page, 'POST', '/items', { contentMd: `Publish oracle ${tag}` }) as { id: string; revision: number };
  const id = created.id;
  if (plan.status === 'private') await api(page, 'POST', `/items/${id}/publish`, { visibility: 'private', expectedRevision: created.revision });
  const loaded = await hopper(page, names.loaded, true), closed = await hopper(page, names.closed, false);
  if (plan.hoppers !== 'none') for (const h of [loaded, closed]) await api(page, 'PUT', `/hoppers/${h}/items/~own/${id}`);

  let button;
  if (plan.surface === 'editor') {
    await page.goto(`/studio/edit/${id}`);
    button = page.locator('#publish-btn');
  } else {
    await page.goto('/studio/');
    const row = page.locator(`.item-row[data-id="${id}"]`), head = row.locator('.item-head');
    await head.click();
    await page.waitForFunction(id => document.querySelector(`.item-row[data-id="${id}"] .item-head`)?.getAttribute('aria-expanded') === 'true', id);
    if (plan.surface === 'quick edit') {
      await row.getByRole('button', { name: 'quick edit', exact: true }).click();
      button = row.locator('.qe-bar .btn-primary');
    } else button = row.locator('.btn-primary.btn-mini').last();
  }
  await button.waitFor({ state: 'visible' });
  record('editor ready', { label: (await button.textContent())?.trim() });

  if (plan.hoppers === 'joined') await api(page, 'PUT', `/hoppers/${await hopper(page, names.joined, true)}/items/~own/${id}`);
  if (plan.hoppers === 'left') await api(page, 'DELETE', `/hoppers/${loaded}/items/~own/${id}`);
  if (plan.choice) await page.locator(`input[name="visibility"][value="${plan.choice}"]`).check();

  let publications = 0;
  page.on('response', response => { if (response.request().method() === 'POST' && response.url().endsWith(`/api/items/${id}/publish`) && response.ok()) publications++; });
  // The item read the press makes: the first read of this item after it, sent
  // alone or inside a read batch.
  const itemRead = (request: Request) => {
    const path = new URL(request.url()).pathname;
    return request.method() === 'GET' ? path.endsWith(`/api/items/${id}`)
      : request.method() === 'POST' && path.endsWith('/api/read-batch') && (request.postData() ?? '').includes(id);
  };
  let release: () => void = () => {}, held: Promise<void> | undefined;
  if (plan.preflight !== 'ok') {
    let first = true;
    held = new Promise<void>(resolve => {
      const handle = async (route: Route) => {
        if (!first || !itemRead(route.request())) return route.continue();
        first = false; resolve();
        if (plan.preflight === 'failed') return route.fulfill({ status: 500, json: { code: 'internal', message: 'The item read failed.' } });
        await new Promise<void>(go => { release = go; });
        await route.continue();
      };
      void page.route(`**/api/items/${id}`, handle);
      void page.route('**/api/read-batch', handle);
    });
  }
  await button.click();
  if (plan.preflight === 'slow') {
    // Press again while the read is outstanding, as an impatient author would.
    // A press after the first has finished is a new press, so only a read still outstanding counts.
    const reached = await Promise.race([held!.then(() => true), new Promise<boolean>(r => setTimeout(() => r(false), 2000))]);
    if (reached) {
      await button.click({ force: true, timeout: 2000 }).catch(() => {});
      release();
    }
  }

  const dialogs: string[] = [];
  for (;;) {
    const sheet = page.locator('.sheet-confirm');
    try { await sheet.first().waitFor({ state: 'visible', timeout: 1500 }); } catch { break; }
    // Names are recorded relative to this plan's hoppers, never its random tag.
    dialogs.push(((await sheet.first().textContent()) ?? '').trim().replaceAll(tag, '·'));
    if (plan.flip && dialogs.length === 1) await api(page, 'PATCH', '/settings', { defaultVisibility: plan.mode === 'notebook' ? 'public' : 'private' });
    await sheet.first().locator(plan.answer === 'cancel' ? '[data-sheet=cancel]' : '[data-sheet=ok]').click();
    await sheet.first().waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {});
    if (dialogs.length > 3) break;
  }
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.unrouteAll({ behavior: 'ignoreErrors' });
  const error = await page.locator('.error-banner').filter({ hasText: /\S/ }).count() > 0;
  record('confirmation settled', { dialogs, error });
  const stored = await api(page, 'GET', `/items/${id}`) as { status: string; version: number };
  record('publication settled', { publications, status: stored.status, version: stored.version });
}

/** One own item brought to a search state through the API, then found through
 * Compose's search box; records the rendered hit's excerpt and marks. */
export async function runSearchPlan(page: Page, state: SearchState, record: RecordObservation) {
  const word = `marks${crypto.randomUUID().replaceAll('-', '').slice(0, 10)}`;
  await page.goto('/studio/');
  await api(page, 'PATCH', '/settings', { defaultVisibility: 'public' });
  let item = await api(page, 'POST', '/items', { contentMd: `${word} first words` }) as { id: string; revision: number };
  const id = item.id;
  const publish = async (visibility: 'public' | 'private') => { item = { ...item, ...(await api(page, 'POST', `/items/${id}/publish`, { visibility, expectedRevision: item.revision })) }; };
  const edit = async (text: string) => { item = { ...item, ...(await api(page, 'PATCH', `/items/${id}`, { contentMd: `${word} ${text}`, expectedRevision: item.revision })) }; };
  if (state !== 'draft' && state !== 'public' && state !== 'public changed') await publish('private');
  if (state === 'private edited') await edit('second words');
  if (state === 'public' || state === 'public changed') { await publish('private'); await edit('second words'); await publish('public'); }
  if (state === 'public changed') await edit('third words');
  await page.goto('/studio/');
  await page.getByRole('searchbox', { name: 'search your items' }).or(page.getByLabel('search your items')).first().fill(word);
  const hit = page.locator(`.search-list li:has(a[href$="/edit/${id}"])`);
  await hit.first().waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
  const count = await hit.count();
  record('search settled', count ? {
    hits: count,
    private: await hit.first().locator('.search-private').count() > 0,
    draft: await hit.first().locator('.search-draft').count() ? ((await hit.first().locator('.search-draft').textContent()) ?? '').trim() : null,
    excerpt: ((await hit.first().locator('.search-excerpt').textContent()) ?? '').trim().replaceAll(word, '·'),
  } : { hits: 0, private: false, draft: null, excerpt: '' });
}
