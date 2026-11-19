/** Real receiving driver shared by Playwright and the registered browser oracle.
 * The controlled schedule supplies only transport premises. It records DOM,
 * request, and stored-item observations; save-model.ts independently predicts
 * their meanings. Setup, page transport, and cleanup failures retain their errors.
 */
import type { Page } from '@playwright/test';
import type { SavePlan, SaveObservation } from '../test-browser/save-model.ts';
import { acceptSheets } from './sheets.ts';

type RecordObservation = (phase: string, value: SaveObservation) => void;
async function item(page: Page, id: string) {
  return page.evaluate(async id => (await fetch(`/api/items/${id}`)).json() as Promise<{ contentMd: string; version: number; revision: number }>, id);
}
// A bounded wait chooses a receiving checkpoint. A missing promised DOM event is
// left visible in the snapshot, rather than turned into a setup exception.
async function waitForUi(page: Page, event: 'saved' | 'error' | 'history') {
  try {
    await page.waitForFunction(event => event === 'saved' ? document.querySelector('.save-state')?.textContent?.trim() === 'saved'
      : event === 'history' ? document.querySelectorAll('[data-action="view-version"]').length > 0
        : !!document.querySelector('#error-banner-slot')?.textContent?.trim(), event, { timeout: 5000 });
  } catch (error) { if (!(error instanceof Error && error.name === 'TimeoutError')) throw error; }
}
async function editor(page: Page, plan: SavePlan, record: RecordObservation) {
  await page.goto('/studio/login');
  await page.locator('[name="password"]').fill('test-password');
  await page.getByRole('button', { name: 'log in', exact: true }).click();
  await page.locator('#composer-text').waitFor({ state: 'visible' });
  const composerVisible = await page.locator('#composer-text').isVisible();
  const created = await page.evaluate(async kind => { const response = await fetch('/api/items', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind, contentMd: 'persisted' }) }); return { status: response.status, body: await response.json() as { id: string } }; }, plan.kind);
  // An absent resource ID prevents this fixture from reaching an editor. Keep
  // this diagnostic separate from the save-law comparison.
  if (typeof created.body.id !== 'string') throw new Error(`Save fixture creation failed: HTTP ${created.status}`);
  await page.goto(`/studio/edit/${created.body.id}`);
  await page.locator('#md-input').waitFor({ state: 'visible' });
  record('owner editor ready', { composerVisible, creationStatus: created.status, editor: await page.locator('#md-input').inputValue() });
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 10_000));
  return created.body.id;
}
export async function runSavePlan(page: Page, plan: SavePlan, record: RecordObservation) {
  const id = await editor(page, plan, record), endpoint = `**/api/items/${id}`;
  await acceptSheets(page);
  const response = (status?: number, text?: string) => page.waitForResponse(value => value.url().endsWith(`/api/items/${id}`) && value.request().method() === 'PATCH' && (status === undefined || value.status() === status) && (text === undefined || value.request().postDataJSON()?.contentMd === text));
  const input = page.locator('#md-input');
  if (plan.delivery === 'rejected') {
    let published = 0;
    if (plan.trigger === 'publish') await page.route(`**/api/items/${id}/publish`, async route => { published++; await route.continue(); });
    await page.route(endpoint, route => route.request().method() === 'PATCH' ? route.fulfill({ status: plan.status!, json: { code: plan.status === 400 ? 'invalid-input' : plan.status === 401 ? 'unauthorized' : 'internal', message: plan.trigger === 'autosave' ? 'autosave rejected' : 'save rejected' } }) : route.continue());
    await input.fill(plan.text);
    const failed = response(plan.status);
    if (plan.trigger === 'autosave') await page.clock.runFor(401);
    else await page.locator(plan.trigger === 'publish' ? '#publish-btn' : '#save-draft-btn').click();
    await failed; await page.clock.runFor(17);
    const stored = await item(page, id);
    record('rejected save settled', { editor: await input.inputValue(), content: stored.contentMd, ...(plan.trigger === 'publish' ? { publishCalls: published, version: stored.version } : {}) });
    if (plan.trigger !== 'publish') {
      await page.unroute(endpoint);
      const saved = response(200);
      await page.locator('#save-draft-btn').click(); await saved; await waitForUi(page, 'saved');
      record('recovery acknowledged', { editor: await input.inputValue(), content: (await item(page, id)).contentMd, saveState: (await page.locator('.save-state').allTextContents()).join('').trim() });
    }
    return;
  }
  if (plan.delivery === 'lost') {
    let calls = 0, capturedRevision: number | undefined;
    await page.route(endpoint, async route => {
      if (route.request().method() !== 'PATCH') return route.continue();
      calls++; capturedRevision = route.request().postDataJSON().expectedRevision;
      const committed = await route.fetch();
      record('save committed before response loss', { committedStatus: committed.status() });
      await route.abort('failed');
    });
    await input.fill(plan.text); await page.locator('#save-draft-btn').click(); await waitForUi(page, 'error');
    const committed = await item(page, id);
    record('response loss settled', { editor: await input.inputValue(), patchCalls: calls, content: committed.contentMd, revisionDelta: committed.revision - capturedRevision!, error: await page.locator('#error-banner-slot').innerText() });
    await page.unroute(endpoint);
    const conflict = response(409);
    await page.locator('#save-draft-btn').click(); const rejected = await conflict; const body = await rejected.json();
    await waitForUi(page, 'error');
    record('unacknowledged retry rejected', { status: rejected.status(), requestRevisionDelta: rejected.request().postDataJSON().expectedRevision - capturedRevision!, conflictCode: body.code, conflictRevisionDelta: body.details?.expectedRevision - capturedRevision!, saveStateCount: await page.locator('.save-state').count(), editor: await input.inputValue(), storageUnchanged: JSON.stringify(await item(page, id)) === JSON.stringify(committed), error: await page.locator('#error-banner-slot').innerText() });
    return;
  }
  if (plan.rejectPublication) {
    await page.route(`**/api/items/${id}/publish`, route => route.fulfill({ status: 503, json: { code: 'internal', message: 'publication rejected' } }));
    await input.fill(plan.text);
    const failed = page.waitForResponse(value => value.url().endsWith(`/api/items/${id}/publish`) && value.status() === 503);
    await page.locator('#publish-btn').click(); await failed; await waitForUi(page, 'error');
    const stored = await item(page, id);
    record('publication rejection settled', { editor: await input.inputValue(), content: stored.contentMd, version: stored.version, error: await page.locator('#error-banner-slot').innerText() });
    await page.unroute(`**/api/items/${id}/publish`); await page.locator('#publish-btn').click();
    const card = page.locator('details#history');
    if (!(await card.evaluate(el => (el as HTMLDetailsElement).open))) await card.locator('> summary').click();
    await page.clock.runFor(16); await waitForUi(page, 'history');
    record('publication recovery acknowledged', { historyCount: await page.locator('[data-action="view-version"]').count() });
    return;
  }
  if (plan.delivery === 'held') {
    const bodies: string[] = [];
    let release!: () => void, started!: () => void;
    const held = new Promise<void>(resolve => { release = resolve; }), first = new Promise<void>(resolve => { started = resolve; });
    await page.route(endpoint, async route => {
      if (route.request().method() !== 'PATCH') return route.continue();
      bodies.push(route.request().postDataJSON().contentMd);
      if (bodies.length === 1) { started(); await held; }
      await route.continue();
    });
    if (plan.trigger === 'autosave' && plan.newer) await page.evaluate(() => {
      const host = globalThis as unknown as { fetch: typeof fetch; patchCalls: number };
      const original = host.fetch; host.patchCalls = 0;
      host.fetch = (input, init) => { if (init?.method === 'PATCH' || (input instanceof Request && input.method === 'PATCH')) host.patchCalls++; return original(input, init); };
    });
    try {
      await input.fill(plan.text);
      if (plan.trigger === 'manual') await page.locator('#save-draft-btn').click();
      else await page.clock.runFor(plan.publishDuringHold ? 450 : 401);
      await first;
      if (plan.publishDuringHold) {
        record('autosave held', { publishEnabled: await page.locator('#publish-btn').isEnabled(), saveEnabled: await page.locator('#save-draft-btn').isEnabled() });
        const published = page.waitForResponse(value => value.url().endsWith(`/api/items/${id}/publish`) && value.status() === 200);
        await page.locator('#publish-btn').click(); release(); await published;
        const stored = await item(page, id);
        record('publication acknowledged after save', { content: stored.contentMd, version: stored.version });
      } else {
        await input.fill(plan.newer!);
        if (plan.trigger === 'autosave') {
          await page.clock.runFor(401);
          record('new edit while autosave held', { fetchCalls: await page.evaluate(() => (globalThis as unknown as { patchCalls: number }).patchCalls) });
          const saved = response(undefined, plan.newer); release(); await saved;
        } else {
          const saved = response(undefined, plan.text); release(); await saved; await page.clock.runFor(17);
          record('older acknowledgment received', { editor: await input.inputValue() });
          const next = response(undefined, plan.newer); await page.clock.runFor(401); await next;
        }
        record('newest save acknowledged', { content: (await item(page, id)).contentMd, ...(plan.trigger === 'autosave' ? { bodies } : {}) });
      }
    } finally { release(); }
    return;
  }
  throw new Error('Unsupported save driver delivery: ' + plan.delivery);
}
