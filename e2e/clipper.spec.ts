/**
 * The built extension in Chromium against the e2e Studio (127.0.0.1:8787).
 * Playwright cannot drive Chrome's OAuth window, so these connect with a
 * manually minted token (spec §3.5); the OAuth path is covered against the
 * real server in test/clipper-oauth.test.ts.
 */
import { test as base, expect, chromium, request, type APIRequestContext, type BrowserContext, type Page } from '@playwright/test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const EXTENSION = resolve('extension/.output/chrome-mv3');
const BLYG = 'http://127.0.0.1:8787';

const test = base.extend<{ context: BrowserContext; panel: Page; owner: APIRequestContext; mint: (scope: string[]) => Promise<string> }>({
  context: async ({}, use) => {
    const context = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(), 'clipper-')), {
      channel: 'chromium',
      args: [`--disable-extensions-except=${EXTENSION}`, `--load-extension=${EXTENSION}`],
    });
    await use(context);
    await context.close();
  },
  panel: async ({ context }, use) => {
    let [worker] = context.serviceWorkers();
    worker ??= await context.waitForEvent('serviceworker');
    const page = await context.newPage();
    await page.goto(`chrome-extension://${new URL(worker.url()).host}/sidepanel.html`);
    await use(page);
  },
  // The owner cookie lives in this separate request context, never in the
  // extension's browser context.
  owner: async ({}, use) => {
    const api = await request.newContext();
    // Its own edge identity, as e2e/fixture.ts gives each test: login is rate limited per client.
    const ip = 'fd00:' + crypto.randomUUID().replaceAll('-', '').match(/.{4}/g)!.slice(0, 7).join(':');
    const login = await api.post(`${BLYG}/studio/login`, { form: { password: 'test-password' }, headers: { 'CF-Connecting-IP': ip }, maxRedirects: 0 });
    expect([302, 303]).toContain(login.status());
    // The owner cookie is Secure, and Playwright's request client neither stores
    // nor sends a Secure cookie over http. Re-add it unsecured to a second context.
    const [pair] = login.headers()['set-cookie'].split(';');
    const [name, value] = pair.split(/=(.*)/s);
    await api.dispose();
    const owner = await request.newContext({ storageState: { cookies: [{ name, value, domain: '127.0.0.1', path: '/', expires: -1, httpOnly: true, secure: false, sameSite: 'Lax' }], origins: [] } });
    await use(owner);
    await owner.dispose();
  },
  mint: async ({ owner }, use) => {
    await use(async (scope) => {
      const res = await owner.post(`${BLYG}/api/authorizations`, { data: { name: 'Clipper e2e ' + scope.join('+'), scope, resource: 'api' } });
      expect(res.status()).toBe(200);
      return ((await res.json()) as { access_token: string }).access_token;
    });
  },
});
test.beforeEach(() => test.skip(test.info().project.name !== 'desktop', 'one extension context covers the panel'));

async function connectWithToken(panel: Page, token: string) {
  await panel.getByLabel('Your blyg’s address').fill(BLYG);
  await panel.getByText('Advanced: use a token').click();
  await panel.getByLabel('Token from Studio → Client access').fill(token);
  await panel.getByRole('button', { name: 'Connect with token' }).click();
}

test('a manual token connects, survives reopening the panel, and disconnects (Review Focus 5)', async ({ panel, mint, owner }) => {
  const token = await mint(['owner:read', 'owner:draft', 'owner:publish']);
  const title = ((await (await owner.get(`${BLYG}/api/settings`)).json()) as { site_title: string }).site_title;
  await connectWithToken(panel, token);
  await expect(panel.getByText(`Connected to ${title}`)).toBeVisible();
  await expect(panel.getByText('Quote in Blygger')).toBeVisible();
  await panel.reload();
  await expect(panel.getByText(`Connected to ${title}`), 'the connection lives in the worker, not the page').toBeVisible();
  await panel.getByRole('button', { name: 'Disconnect' }).click();
  await expect(panel.getByLabel('Your blyg’s address')).toBeVisible();
});

test('contrast: a draft-only token connects and names the blyg by host', async ({ panel, mint }) => {
  await connectWithToken(panel, await mint(['owner:draft']));
  await expect(panel.getByText('Connected to 127.0.0.1:8787'), 'without read access the panel names the host').toBeVisible();
});

test('a token that cannot clip is refused with the reason', async ({ panel, mint }) => {
  await connectWithToken(panel, await mint(['owner:read']));
  await expect(panel.getByRole('alert')).toContainText('This token cannot clip.');
});
