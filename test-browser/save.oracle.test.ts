/** The editors keep the newest text through rejected, lost and delayed save
 * responses. Publication waits for acknowledged saves and queued writes keep
 * their submission order, checked in real Chromium against the compiled Worker.
 * This oracle owns authoring.tsx, draft.ts and paced-write.ts.
 *
 * ```ts
 * save('newest') // → text remains editable after an HTTP rejection
 * save('older'); edit('newer') // → old acknowledgment preserves 'newer'
 * publish() // → no publication after the required save fails
 * ```
 *
 * A commit is not an acknowledgment: losing its response leaves the editor's
 * revision unchanged, so retry must conflict while preserving the committed row.
 * For every controlled save delivery, the newest editor input remains visible
 * and only acknowledged saves permit publication (docs/testing.md). The pure
 * model reads kind, trigger, text and controlled delivery conditions. The driver
 * records DOM text/buttons, request order and counts, and stored content/version
 * at every original receiving cut. Finite plans retain both item kinds and every
 * original schedule; desktop/mobile are Chromium profiles, not browser diversity.
 * Limits: controlled HTTP schedules and local D1, not concurrent writers or
 * deployed Cloudflare/proxy scheduling. Authored browser gaps rebuild served
 * source text; Node-only operator switching is not claimed as browser evidence.
 */
import { afterAll, beforeAll } from 'vitest';
import { oracleProperty, configureOracles } from '@tanstack/oracles';
import { chromium, devices, type Browser } from '@playwright/test';
import { spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { withOracleCleanup } from '../test/oracle-cleanup.ts';
import { runSavePlan } from '../e2e/save-oracle-scenarios.ts';
import { savePlans, savePlanName, saveModel } from './save-model.ts';
import { checkSave, saveLaw } from './save-check.ts';
import { buildBrowserOracleSpa } from './browser-build.ts';
configureOracles({ envPrefix: 'BROWSER_ORACLE', registry: ['browser-save-desktop', 'browser-save-mobile'] });
let browser: Browser, server: ChildProcess | undefined;
const baseURL = 'http://127.0.0.1:8787';
beforeAll(async () => {
  if (!process.env.BROWSER_ORACLE_EXTERNAL_SERVER) {
    await buildBrowserOracleSpa();
    server = spawn(process.execPath, ['--import', 'tsx', 'scripts/e2e-server.ts'], { stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    server.stdout?.on('data', chunk => { output = (output + chunk).slice(-8000); });
    server.stderr?.on('data', chunk => { output = (output + chunk).slice(-8000); });
    let ready = false;
    for (let attempt = 0; attempt < 200; attempt++) {
      if (server.exitCode !== null) throw new Error('Browser oracle server exited: ' + output);
      try { ready = (await fetch('http://127.0.0.1:8789/notes/b/studio/login')).ok; } catch { /* not listening yet */ }
      if (ready) break;
      await delay(100);
    }
    if (!ready) throw new Error('Browser oracle server did not become ready: ' + output);
  }
  browser = await chromium.launch({ executablePath: process.env.BROWSER_ORACLE_EXECUTABLE });
}, 60000);
afterAll(async () => {
  await browser?.close();
  if (server && server.exitCode === null) { server.kill('SIGTERM'); await once(server, 'exit'); }
});
for (const profile of ['desktop', 'mobile'] as const) {
  if (process.env.BROWSER_ORACLE_PROFILE && process.env.BROWSER_ORACLE_PROFILE !== profile) continue;
  oracleProperty({
    id: 'browser-save-' + profile,
    owns: ['src/ui/authoring.tsx', 'src/ui/draft.ts', 'src/ui/paced-write.ts'],
    law: { statement: 'For every controlled rejected, lost or held save response, the editors preserve newest input, publish only after acknowledgment and serialize consecutive saves.', authority: 'docs/testing.md established Studio save laws and original e2e/save-oracle.spec.ts receiving schedules', limits: 'Complete original finite fragment/thread schedules on desktop/mobile Chromium; controlled HTTP schedules and local D1, not arbitrary writers or other browser engines.' },
    histories: savePlans,
    label: savePlanName,
    model: saveModel,
    driver: async (plan, observe) => {
      const context = await browser.newContext({ ...devices[profile === 'desktop' ? 'Desktop Chrome' : 'iPhone 13'], baseURL, serviceWorkers: 'block', extraHTTPHeaders: { 'CF-Connecting-IP': 'fd00:' + crypto.randomUUID().replaceAll('-', '').match(/.{4}/g)!.slice(0, 7).join(':') } });
      await withOracleCleanup(async () => {
        await runSavePlan(await context.newPage(), plan, observe);
      }, [() => context.close()]);
      observe('browser context released', true);
    },
    check: checkSave,
    calibrations: [{ name: 'publication proceeds after required save rejection', law: saveLaw, history: { enumerated: 5 }, corrupt: trace => trace.map(entry => entry.checkpoint === 'rejected save settled' ? { ...entry, value: { ...(entry.value as object), publishCalls: 1 } } : entry) }],
  });
}
