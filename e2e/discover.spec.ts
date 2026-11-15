import { test, expect, type Page } from './fixture';

// Discover (ROADMAP row 17) and the backup download (row 15). blygger.com is
// answered here, and so are the subscribe POSTs: a real subscribe would reach
// the network and change the fixture subscriptions other tests read.
async function login(page: Page) {
  await page.goto('/studio/login');
  await page.locator('[name=password]').fill('test-password');
  await page.getByRole('button', { name: 'log in', exact: true }).click();
  await expect(page.locator('#composer-text')).toBeVisible();
}
const setSeen = (page: Page, value: string) =>
  page.evaluate(async (discoverSeenAt) => {
    await fetch('/api/settings', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ discoverSeenAt }) });
  }, value);

const blyg = (host: string, title: string, listedAt: string, level: string | null, lastPost: string | null) => ({
  origin: `https://${host}/`, title, home: `https://${host}/`, feed: `https://${host}/feed.xml`, listedAt,
  protocol: '0.4', protocolLevel: 2, generator: 'x/1', activity: { level, score: 1, events: level ? 3 : 0, lastPost },
});
const day = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();
const DIRECTORY = {
  version: 1,
  blygs: [
    blyg('busy.example', 'Busy Blyg', '2026-11-10T00:00:00.000Z', 'high', day(1)),
    // Followed (the fixture's legacy feed) and listed after the mark: never in "new" (session 72's bug).
    blyg('legacy.example', 'Legacy Again', '2026-11-11T00:00:00.000Z', 'medium', day(9)),
    blyg('quiet.example', 'Quiet Blyg', '2026-11-12T00:00:00.000Z', null, null),
    blyg('older.example', 'Older Blyg', '2026-08-01T00:00:00.000Z', 'low', day(80)),
    blyg('127.0.0.1:8787', 'This Blyg', '2026-08-01T00:00:00.000Z', 'high', day(0)),
  ],
};
const subscription = (url: string) => ({
  id: `sub-${new URL(url).hostname}`, kind: 'blyg', origin: url, feedUrl: `${url}feed.xml`, title: new URL(url).hostname, status: 'active',
  lastPollAt: null, failCount: 0, lastIndexSyncAt: null, created: '2026-11-14T00:00:00Z',
  titleFollowsSource: true, inBlogroll: false, flags: [],
});

test.afterEach(async ({ page }) => {
  // A test skipped before login never left about:blank.
  if (page.url().startsWith('http')) await setSeen(page, '');
});

test('discover lists new blygs with activity, toggles to all, and subscribes one or a batch', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await login(page);
  await setSeen(page, '2026-11-01T00:00:00.000Z');
  await page.route('https://blygger.com/blygs.json', (route) => route.fulfill({ json: DIRECTORY, headers: { 'access-control-allow-origin': '*' } }));
  const posts: string[] = [];
  await page.route('**/api/subscriptions', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    const body = route.request().postDataJSON() as { url: string; backfill: unknown };
    expect(body.backfill).toBe(false);
    posts.push(body.url);
    await route.fulfill({ status: 201, json: subscription(body.url) });
  });
  await page.goto('/studio/reading');
  await page.locator('#discover-open').click();
  const sheet = page.getByRole('dialog', { name: 'discover blygs' });
  const list = sheet.getByRole('list', { name: 'blygs listed on blygger.com' });

  // New: not followed, newest listing first, the owner's own blyg never offered;
  // those listed after the mark say so.
  await expect(list.locator('.opml-title')).toHaveText(['Quiet Blygnew', 'Busy Blygnew', 'Older Blyg']);
  await expect(list.locator('.opml-row').nth(1)).toContainText('high');
  await expect(list.locator('.opml-row').nth(1)).toContainText('last post yesterday');
  await expect(list.locator('.opml-row').nth(0)).toContainText('activity not measured yet');
  await expect(sheet.locator('#discover-more')).toHaveCount(0);
  await expect(sheet.getByRole('link', { name: 'preview Busy Blyg in a new tab' })).toHaveAttribute('target', '_blank');
  await expect(sheet.getByRole('link', { name: 'preview Busy Blyg in a new tab' })).toHaveAttribute('href', 'https://busy.example/');
  // Opening it moved the mark to the newest listing shown.
  await expect.poll(() => page.evaluate(async () => (await (await fetch('/api/settings')).json()).discoverSeenAt)).toBe('2026-11-12T00:00:00.000Z');

  // All: every listing, the fixture's legacy feed marked as followed.
  await sheet.locator('[data-view=all]').click();
  await expect(sheet.locator('[data-view=new] .n')).toHaveText('3');
  await expect(list.locator('.opml-title')).toHaveText(['Busy Blygnew', 'Legacy Again', 'Quiet Blygnew', 'Older Blyg']);
  await expect(list.locator('.opml-row').nth(1)).toContainText('subscribed');
  await expect(sheet.getByRole('checkbox', { name: 'choose Legacy Again' })).toBeDisabled();

  // One at a time.
  await sheet.getByRole('button', { name: 'subscribe to Busy Blyg' }).click();
  await expect(list.locator('.opml-row').nth(0)).toContainText('added');

  // A batch.
  await sheet.getByRole('checkbox', { name: 'choose Quiet Blyg' }).check();
  await sheet.getByRole('checkbox', { name: 'choose Older Blyg' }).check();
  await sheet.getByRole('button', { name: 'subscribe to 2 chosen' }).click();
  await expect(list.locator('.opml-row').nth(3)).toContainText('added', { timeout: 15_000 });
  expect(posts).toEqual(['https://busy.example/', 'https://quiet.example/', 'https://older.example/']);
  expect(errors).toEqual([]);
});

test('new pages five at a time until the unfollowed run out', async ({ page }) => {
  await login(page);
  const many = Array.from({ length: 7 }, (_, i) => blyg(`b${i}.example`, `Blyg ${i}`, `2026-10-0${i + 1}T00:00:00.000Z`, 'low', day(3)));
  await page.route('https://blygger.com/blygs.json', (route) => route.fulfill({ json: { version: 1, blygs: [...many, DIRECTORY.blygs[1]] }, headers: { 'access-control-allow-origin': '*' } }));
  await page.goto('/studio/reading');
  await page.locator('#discover-open').click();
  const sheet = page.getByRole('dialog', { name: 'discover blygs' });
  const titles = sheet.getByRole('list', { name: 'blygs listed on blygger.com' }).locator('.opml-title');
  await expect(titles).toHaveText(['Blyg 6', 'Blyg 5', 'Blyg 4', 'Blyg 3', 'Blyg 2']);
  await expect(sheet.locator('[data-view=new] .n')).toHaveText('7');
  await sheet.locator('#discover-more').click();
  await expect(titles).toHaveCount(7);
  // Never looked before: nothing is badged new, since everything would be.
  await expect(sheet.locator('.discover-new')).toHaveCount(0);
  await expect(sheet.locator('#discover-more')).toHaveCount(0);
});

test('the header icons have tooltips on hover and on keyboard focus', async ({ page, isMobile }) => {
  test.skip(isMobile, 'touch screens have no hover');
  await login(page);
  await page.goto('/studio/reading');
  const tip = page.locator('.tooltip-content');
  await page.locator('#discover-open').hover();
  await expect(tip).toHaveText('discover blygs on blygger.com');
  await page.mouse.move(0, 0);
  await expect(tip).toHaveCount(0);
  await page.getByRole('button', { name: 'subscribe', exact: true }).focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  // The tooltip the Shift+Tab opened may still be fading out beside it.
  await expect(tip.filter({ hasText: /^subscribe$/ })).toBeVisible();
});

test('following everything, discover opens on all; an unreachable directory says so', async ({ page }) => {
  await login(page);
  let fail = false;
  // Only the fixture's followed legacy feed and the owner's own blyg.
  const followedOnly = { version: 1, blygs: [DIRECTORY.blygs[1], DIRECTORY.blygs[4]] };
  await page.route('https://blygger.com/blygs.json', (route) => fail ? route.abort() : route.fulfill({ json: followedOnly, headers: { 'access-control-allow-origin': '*' } }));
  await page.goto('/studio/reading');
  await page.locator('#discover-open').click();
  const sheet = page.getByRole('dialog', { name: 'discover blygs' });
  await expect(sheet.locator('[data-view=all]')).toHaveAttribute('aria-pressed', 'true');
  await expect(sheet.locator('[data-view=new] .n')).toHaveText('0');
  await sheet.locator('[data-view=new]').click();
  await expect(sheet).toContainText('You follow every blyg listed on blygger.com.');

  await page.keyboard.press('Escape');
  fail = true;
  await page.locator('#discover-open').click();
  await expect(page.getByRole('dialog', { name: 'discover blygs' }).getByRole('alert')).toContainText('Could not reach blygger.com.');
});

test('more offers a backup download that streams a finished archive', async ({ page }) => {
  await login(page);
  await page.goto('/studio/more');
  const link = page.locator('#download-backup');
  await expect(link).toHaveAttribute('href', '/studio/backup');
  await expect(link).toHaveAttribute('download', '');
  const download = page.waitForEvent('download');
  await link.click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/^blyg-backup-127\.0\.0\.1-8787-\d{4}-\d{2}-\d{2}\.tar$/);
  const tar = await page.evaluate(async () => {
    const bytes = new Uint8Array(await (await fetch('/studio/backup')).arrayBuffer());
    return new TextDecoder().decode(bytes);
  });
  expect(tar).toContain('blyg-backup/tables/items/0001.jsonl');
  expect(tar).toContain('"complete": true');
});
