/** Bounded acquisition of the same item through Compose's real pagination UI. */
import type { BrowserContext, Locator, Page } from '@playwright/test';
import { hostEvent } from './application-driver-oracle.ts';

// Retain the old target click's complete 7s budget, shared by every page action.
const acquisitionMs = 7000;
const maxPageClicks = 32;
const rowsSelector = 'ol.list.items > .item-row[data-id]';
const errorText = (error: unknown) => error instanceof Error ? error.name + ': ' + error.message : String(error);

type Host = { page: Page; context: BrowserContext; drain: Promise<unknown>[]; id: string; history: unknown; activation?: { kind: 'body'; text: string } };
async function mounted(page: Page, id: string) {
  return page.evaluate(({ rowsSelector, id }) => {
    const lists = [...document.querySelectorAll('ol.list.items')];
    const rows = [...document.querySelectorAll<HTMLElement>(rowsSelector)];
    const ids = rows.map(row => row.dataset.id!);
    return { url: location.href, lists: lists.length, ids,
      visibleIds: rows.filter(row => row.getClientRects().length > 0).map(row => row.dataset.id!),
      targetCount: ids.filter(value => value === id).length,
      alerts: [...document.querySelectorAll<HTMLElement>('#error-banner-slot [role=alert]')]
        .filter(el => el.getClientRects().length > 0).slice(0, 3).map(el => el.textContent?.slice(0, 500)),
      loaders: [...document.querySelectorAll<HTMLButtonElement>('button')]
        .filter(button => button.textContent?.trim() === 'load more items')
        .map(button => ({ visible: button.getClientRects().length > 0, disabled: button.disabled })) };
  }, { rowsSelector, id });
}

async function pageMetadata(context: BrowserContext, endpoint: string) {
  const response = await context.request.get(endpoint, { timeout: 1000 });
  if (!response.ok()) return { status: response.status() };
  const body = await response.json();
  return { status: response.status(), page: body.page,
    items: Array.isArray(body.items) ? body.items.slice(0, 25).map((item: any) => ({ id: item.id, updated: item.updated })) : null };
}

/** Failure-only evidence must not replace the first acquisition error or cause. */
async function acquisitionFailure(host: Host, original: unknown, attempts: unknown[]): Promise<never> {
  const probes = Promise.allSettled([
    mounted(host.page, host.id),
    (async () => {
      const response = await host.context.request.get('/api/items/' + host.id, { timeout: 1000 });
      if (!response.ok()) return { status: response.status() };
      const item = await response.json();
      return { status: response.status(), id: item.id, updated: item.updated };
    })(),
    pageMetadata(host.context, '/api/items?limit=25'),
  ]);
  // Even if the bounded evidence wait expires, context cleanup owns every probe.
  host.drain.push(probes);
  const result = await Promise.allSettled([hostEvent(probes, 'navigation acquisition diagnostics', 1000)]);
  const entry = result[0]!;
  const diagnostics = entry.status === 'fulfilled'
    ? entry.value.map((probe, index) => probe.status === 'fulfilled'
      ? { probe: ['mounted', 'stored-target', 'first-api-page'][index], value: index === 0
        ? { ...probe.value, rowCount: (probe.value as Awaited<ReturnType<typeof mounted>>).ids.length, ids: (probe.value as Awaited<ReturnType<typeof mounted>>).ids.slice(0, 100),
          visibleIds: (probe.value as Awaited<ReturnType<typeof mounted>>).visibleIds.slice(0, 100) } : probe.value }
      : { probe: ['mounted', 'stored-target', 'first-api-page'][index], error: errorText(probe.reason) })
    : [{ error: errorText(entry.reason) }];
  const detail = JSON.stringify({
    original: errorText(original), classification: 'host acquisition failure; never a law kill',
    target: host.id, history: host.history, acquisitionMs, maxPageClicks,
    attempts: attempts.map((entry: any, index) => ({ ...entry, rowCount: entry.ids.length,
      ids: entry.ids.slice(0, 25), visibleIds: entry.visibleIds.slice(0, 25),
      newIds: entry.ids.filter((id: string) => index === 0 || !(attempts[index - 1] as any).ids.includes(id)).slice(0, 50) })), diagnostics,
  });
  const evidence = new Error('Navigation acquisition evidence: ' + detail);
  const emissionErrors: unknown[] = [];
  // The pinned capture uses cause.message, so preserve evidence independently in
  // the wrapper's retained test-output.log as one failure-only structured line.
  try { process.stderr.write('NAVIGATION_ACQUISITION_FAILURE ' + detail + '\n'); }
  catch (error) { emissionErrors.push(error); }
  throw new AggregateError([original, evidence, ...emissionErrors], 'Navigation target acquisition failed: ' + errorText(original), { cause: original });
}

export async function openNavigationCard(host: Host): Promise<Locator> {
  const deadline = performance.now() + acquisitionMs;
  const attempts: unknown[] = [];
  const seenIds = new Set<string>();
  const remaining = () => {
    const ms = Math.floor(deadline - performance.now());
    if (ms <= 0) throw new Error('Navigation target acquisition exceeded its 7000ms total budget');
    return ms;
  };
  const within = <T>(operation: Promise<T>, label: string) => {
    host.drain.push(operation);
    return hostEvent(operation, label, remaining());
  };
  try {
    // Product IDs are generated alphanumerics; reject malformed fixture identities.
    if (!/^[a-zA-Z0-9]+$/.test(host.id)) throw new Error('Invalid navigation target identity');
    await host.page.locator('ol.list.items').waitFor({ state: 'visible', timeout: remaining() });
    // Compose mounts its empty <ol> while loading. Wait for a real first-page
    // receipt before absence/no-more can be interpreted as terminal.
    const firstPage = await host.page.waitForFunction(rowsSelector => {
      const visible = (el: Element) => el.getClientRects().length > 0;
      return document.querySelectorAll(rowsSelector).length > 0
        || [...document.querySelectorAll('p.empty')].some(el => visible(el)
          && el.textContent?.replace(/\s+/g, ' ').trim().endsWith('Nothing yet — compose your first fragment above.'))
        || [...document.querySelectorAll('#error-banner-slot [role=alert]')].some(visible);
    }, rowsSelector, { timeout: remaining() });
    await within(firstPage.dispose(), 'navigation first mounted page receipt disposal');
    for (let clicks = 0; ; clicks++) {
      const state = await within(mounted(host.page, host.id), 'navigation mounted page receipt');
      attempts.push({ clicks, ...state });
      if (state.alerts.length && state.ids.length === 0) throw new Error('Compose first page reports a visible load error');
      if (state.lists !== 1 || new Set(state.ids).size !== state.ids.length)
        throw new Error('Compose acquisition needs one item list and distinct row identities');
      if (state.targetCount > 1) throw new Error('Compose mounted duplicate navigation target');
      if (state.targetCount === 1) {
        const card = host.page.locator(rowsSelector + `[data-id="${host.id}"]`);
        const opener = host.activation?.kind === 'body'
          ? card.getByText(host.activation.text, { exact: true }).first() : card.locator('.item-head');
        await opener.click({ timeout: remaining() });
        return card;
      }
      if (clicks === maxPageClicks) throw new Error('Navigation target absent after 32 real Load more actions');
      const more = host.page.getByRole('button', { name: 'load more items', exact: true });
      if (await within(more.count(), 'navigation Load more control count') !== 1) throw new Error('Navigation target absent and Compose has no unique Load more control');
      for (const id of state.ids) seenIds.add(id);
      await more.click({ timeout: remaining() });
      // This is receipt of a changed mounted page, not an expected source value.
      // No target filtering, direct navigation, repeated history or click retry.
      const receipt = await host.page.waitForFunction(({ rowsSelector, before }) => {
        const ids = [...document.querySelectorAll<HTMLElement>(rowsSelector)].map(row => row.dataset.id!);
        const loaders = [...document.querySelectorAll<HTMLButtonElement>('button')]
          .filter(button => button.textContent?.trim() === 'load more items');
        return ids.some(id => !before.includes(id)) || loaders.length !== 1;
      }, { rowsSelector, before: [...seenIds] }, { timeout: remaining() });
      await within(receipt.dispose(), 'navigation mounted commit receipt disposal');
    }
  } catch (error) { return acquisitionFailure(host, error, attempts); }
}
