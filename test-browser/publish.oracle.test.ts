/** Every publish button the owner can press asks the right question before an
 * item goes public, and each accepted question makes exactly one publication.
 * Checked in real Chromium against the compiled Worker. This oracle owns the
 * publish paths of authoring.tsx (confirmRaise, confirmDraftHoppers, the row's
 * publishRow, the editor's publish and add-version buttons).
 *
 * ```ts
 * press('publish publicly') // → "Make this item public?" naming its public hoppers now
 * press(); press()          // while the item read is slow → one dialog, one publication
 * press()                   // when the item read fails → an error, no publication
 * ```
 *
 * For every press of a publish button (Compose's row, Quick Edit, the full
 * editor; Notebook or Publish mode; a draft or a private item), going public
 * asks first and names exactly the public hoppers the item is in when the
 * dialog opens, a failed read refuses with an error, accept makes one
 * publication, cancel none, and pressing twice never makes two. The pure model
 * reads only the plan. The driver records the button label, each confirmation's
 * text, the error banner, accepted publish requests and the stored item.
 * Limits: names are read when the dialog opens, so a hopper change while it is
 * open is not reflected (Venkat, session 86); desktop Chromium and local D1.
 */
import { afterAll, beforeAll } from 'vitest';
import { oracleProperty, configureOracles } from '@tanstack/oracles';
import { chromium, devices, type Browser, type BrowserContextOptions } from '@playwright/test';
import { spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { withOracleCleanup } from '../test/oracle-cleanup.ts';
import { login, runPublishPlan } from '../e2e/publish-oracle-scenarios.ts';
import { publishPlans, publishPlanName, publishModel, checkPublish, publishLaw } from './publish-model.ts';
import { buildBrowserOracleSpa } from './browser-build.ts';
configureOracles({ envPrefix: 'BROWSER_ORACLE', registry: ['browser-publish-confirm'] });
let browser: Browser, server: ChildProcess | undefined, signedIn: BrowserContextOptions['storageState'];
// A parallel session's suite may hold 8787: these move this oracle's own server elsewhere.
const baseURL = process.env.BROWSER_ORACLE_BASE_URL ?? 'http://127.0.0.1:8787';
const serverScript = process.env.BROWSER_ORACLE_SERVER_SCRIPT ?? 'scripts/e2e-server.ts';
const readyURL = process.env.BROWSER_ORACLE_READY_URL ?? 'http://127.0.0.1:8789/notes/b/studio/login';
const options = (): BrowserContextOptions => ({ ...devices['Desktop Chrome'], baseURL, serviceWorkers: 'block', extraHTTPHeaders: { 'CF-Connecting-IP': 'fd00:' + crypto.randomUUID().replaceAll('-', '').match(/.{4}/g)!.slice(0, 7).join(':') } });
beforeAll(async () => {
  if (!process.env.BROWSER_ORACLE_EXTERNAL_SERVER) {
    await buildBrowserOracleSpa();
    server = spawn(process.execPath, ['--import', 'tsx', serverScript], { stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    server.stdout?.on('data', chunk => { output = (output + chunk).slice(-8000); });
    server.stderr?.on('data', chunk => { output = (output + chunk).slice(-8000); });
    let ready = false;
    for (let attempt = 0; attempt < 200; attempt++) {
      if (server.exitCode !== null) throw new Error('Browser oracle server exited: ' + output);
      try { ready = (await fetch(readyURL)).ok; } catch { /* not listening yet */ }
      if (ready) break;
      await delay(100);
    }
    if (!ready) throw new Error('Browser oracle server did not become ready: ' + output);
  }
  browser = await chromium.launch({ executablePath: process.env.BROWSER_ORACLE_EXECUTABLE });
  // One sign-in for every plan: the owner-login budget is five a minute.
  const context = await browser.newContext(options());
  await withOracleCleanup(async () => {
    await login(await context.newPage());
    signedIn = await context.storageState();
  }, [() => context.close()]);
}, 60000);
afterAll(async () => {
  await browser?.close();
  if (server && server.exitCode === null) { server.kill('SIGTERM'); await once(server, 'exit'); }
});
oracleProperty({
  id: 'browser-publish-confirm',
  owns: ['src/ui/authoring.tsx#confirmRaise', 'src/ui/authoring.tsx#confirmDraftHoppers', 'src/ui/authoring.tsx#ItemRow', 'src/ui/authoring.tsx#Editor'],
  law: { statement: 'For every press of an owner publish button, going public asks first and names exactly the public hoppers the item is in when the dialog opens; a failed item read refuses with an error; each accepted confirmation makes exactly one publication, cancel makes none, and a repeated press never makes two.', authority: 'confirm-before-public (Venkat on studio#175), sealed-content-build-plan §1 0f law 7, and rulings by Venkat Rao (GitHub vgururao) on Kyle Mathews\' row 5, studio#178, 2026-11-25 (session 86)', limits: 'Desktop Chromium against local D1; hopper names as of the dialog opening, not changes while it is open; no tangled threads or later versions (their own dialogs).' },
  histories: publishPlans,
  label: publishPlanName,
  model: publishModel,
  driver: async (plan, observe) => {
    const context = await browser.newContext({ ...options(), storageState: signedIn });
    await withOracleCleanup(async () => {
      const page = await context.newPage();
      await page.goto('/studio/');
      await runPublishPlan(page, plan, observe);
    }, [async () => {
      // The suite shares one node: put the default back even when the plan failed.
      const page = await context.newPage();
      await page.goto('/studio/');
      await page.evaluate(() => fetch('/api/settings', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ defaultVisibility: 'public' }) }));
    }, () => context.close()]);
  },
  check: checkPublish,
  calibrations: [
    { name: 'a second publication after a repeated press', law: publishLaw, history: { enumerated: 0 }, corrupt: trace => trace.map(entry => entry.checkpoint === 'publication settled' ? { ...entry, value: { ...(entry.value as object), publications: 2 } } : entry) },
    { name: 'a dialog that omits a hopper joined after load', law: publishLaw, history: { enumerated: 2 }, corrupt: trace => trace.map(entry => entry.checkpoint === 'confirmation settled' ? { ...entry, value: { ...(entry.value as { dialogs: string[] }), dialogs: (entry.value as { dialogs: string[] }).dialogs.map(text => text.replace('Joined ·', '')) } } : entry) },
  ],
});
