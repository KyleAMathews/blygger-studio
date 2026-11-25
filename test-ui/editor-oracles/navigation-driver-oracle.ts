/** Real formatted editor, controlled save delivery, and explicit unload choice. */
import { mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { applicationDriver, deferred, hostEvent } from './application-driver-oracle.ts';
import { openNavigationCard } from './navigation-acquisition-oracle.ts';
import { captureBrowserCalls, captureBrowserPacket, type BrowserPacket } from './browser-driver-oracle.ts';
import type { navigationPlan } from './navigation-model-oracle.ts';
import type { Observe } from './document-oracle.ts';

export async function navigationDriver(p: ReturnType<typeof navigationPlan>, observe: Observe) {
  await applicationDriver(p.h.mobile, observe, async ({ context, page, drain }) => {
    const created = await context.request.post('/api/items', { data: { contentMd: p.h.body, kind: 'fragment' } });
    if (!created.ok()) throw new Error('Navigation item setup failed: ' + created.status());
    const id: string = (await created.json()).id;
    const endpoint = '/api/items/' + id;
    const editPath = '/studio/edit/' + id;
    const release = deferred<void>(), intercepted = deferred<void>();
    let holding = p.acknowledgeAfter === null;
    let abortHeld = false;
    const rejectedDeparture = p.h.departure === 'spa-reject';
    const observesStay = p.h.departure === 'stay';
    const inApp = p.h.departure === 'spa' || rejectedDeparture;
    let rejectWrites = rejectedDeparture;
    const rejectedRequests: { method: string; body: unknown; status: number }[] = [];
    type SaveReceipt = { id: number; attempt: string | null; phase: string; resultType?: string; reasonType?: string; reason?: string; current?: boolean };
    const saveReceipts: SaveReceipt[] = [], departureSettled = deferred<SaveReceipt>();
    const staySaved = deferred<void>();
    let waitingForStaySave = false;
    await page.route('**' + endpoint, route => {
      const task = (async () => {
        if (holding && route.request().method() === 'PATCH') {
          intercepted.resolve(); await release.promise;
          // Discarded outgoing writes are explicitly canceled in teardown.
          // No route.continue error is inferred harmless from a destination URL.
          if (abortHeld) { await route.abort('aborted'); return; }
          if (rejectWrites) {
            // A rejected write never reaches the server. Keep rejecting any
            // queued autosave/guard save until the failed departure is observed.
            rejectedRequests.push({ method: route.request().method(), body: route.request().postDataJSON(), status: 500 });
            await route.fulfill({ status: 500, contentType: 'application/json',
              body: JSON.stringify({ message: 'Controlled save rejection', code: 'internal' }) });
            return;
          }
        }
        await route.continue();
      })();
      drain.push(task);
      return task.catch(() => undefined); // cleanup reports the original rejection
    });
    const stored = async () => {
      const response = await context.request.get(endpoint);
      if (!response.ok()) throw new Error('Navigation read failed: ' + response.status());
      return (await response.json()).contentMd as string;
    };
    const snapshot = async () => page.locator('#md-input').evaluate((el: HTMLTextAreaElement) => ({ value: el.value, selection: [el.selectionStart, el.selectionEnd], focused: document.activeElement === el }));
    // Route and source form one public observation. A departure between a
    // route precheck and a locator read must reach the law, not locator timeout.
    const editorSnapshot = async () => page.evaluate(path => {
      const el = document.querySelector<HTMLTextAreaElement>('#md-input');
      const inEditor = location.pathname === path && el !== null;
      return { inEditor, value: inEditor ? el.value : null };
    }, editPath);
    try {
      await page.goto('/studio/edit/' + id);
      const box = page.locator('#md-input'); await box.waitFor({ state: 'visible' });
      if (p.h.mobile) await page.getByRole('group', { name: 'pane', exact: true }).getByRole('button', { name: 'draft', exact: true }).click();
      if (rejectedDeparture || observesStay) {
        await page.exposeFunction('oracleNavigationSaveReceipt', (receipt: SaveReceipt) => {
          if (rejectedDeparture) {
            saveReceipts.push(receipt);
            if (receipt.attempt === 'departure' && receipt.phase !== 'started') departureSettled.resolve(receipt);
          }
          if (waitingForStaySave && receipt.current === true) staySaved.resolve();
        });
        // Observe the actual Draft save without replacing its promise or result.
        await page.evaluate(observesStay => {
          const host = globalThis as any;
          const state = host.__oracleNavigationSave = { sequence: 0, nextAttempt: null as string | null };
          const prototype = host.__oracleDrafts.Draft.prototype, original = prototype.save;
          const report = (receipt: object) => {
            try { void host.oracleNavigationSaveReceipt(receipt).catch(() => undefined); }
            catch { /* A missing receipt is a host failure, never product flow. */ }
          };
          prototype.save = function (...args: unknown[]) {
            const id = ++state.sequence, attempt = state.nextAttempt;
            state.nextAttempt = null;
            report({ id, attempt, phase: 'started' });
            let result;
            try { result = Reflect.apply(original, this, args); }
            catch (reason) {
              report({ id, attempt, phase: 'threw', reasonType: typeof reason });
              throw reason;
            }
            // Promise.resolve is only a side observer: return result itself,
            // never its observer or a replacement/recovered promise.
            void Promise.resolve(result).then(
              value => report({ id, attempt, phase: 'fulfilled', resultType: typeof value,
                ...(observesStay && { current: value === true }) }),
              reason => report({ id, attempt, phase: 'rejected', reasonType: typeof reason }),
            );
            return result;
          };
        }, observesStay);
      }
      await box.focus(); await box.evaluate((el: HTMLTextAreaElement) => el.setSelectionRange(0, el.value.length));
      for (const [index, command] of p.commands.entries()) {
        const acknowledged = index === p.acknowledgeAfter
          ? page.waitForResponse(response => response.url().endsWith(endpoint) && response.request().method() === 'PATCH') : undefined;
        await page.keyboard.press('ControlOrMeta+' + (command === 'bold' ? 'b' : 'i'));
        observe('format' + index, await snapshot()); await captureBrowserCalls(page);
        if (index === p.acknowledgeAfter) {
          const response = await acknowledged!;
          await response.finished();
          if (!response.ok()) throw new Error('Acknowledged setup save failed: ' + response.status());
          observe('persisted', { value: await stored() });
          holding = true;
        }
      }
      if (p.h.schedule === 'pending') await hostEvent(intercepted.promise, 'latest PATCH held before forwarding');
      observe('pending', { value: await box.inputValue(), stored: await stored() });
      const dialogs: { type: string; decision: string }[] = [];
      const warned = deferred<void>();
      const leavingPacket = deferred<void>();
      let packetFailure: unknown;
      await page.exposeFunction('oracleLeavingPacket', (packet: BrowserPacket) => {
        try { captureBrowserPacket(packet); } catch (error) { packetFailure = error; }
        finally { leavingPacket.resolve(); }
      });
      // Registered after the product guard so its synchronous dirty checks are
      // included. The Node binding preserves the packet across document reload;
      // receiving it is required independently of whether a warning is shown.
      await page.evaluate(() => window.addEventListener('beforeunload', () => {
        const state = (window as any).__formattingOracle;
        void (window as any).oracleLeavingPacket({ calls: state.calls.splice(0), transportErrors: state.transportErrors.splice(0) });
      }));
      page.on('dialog', dialog => {
        const decision = p.h.departure === 'stay' ? 'stay' : 'leave';
        dialogs.push({ type: dialog.type(), decision });
        const task = (async () => {
          try { if (decision === 'stay') await dialog.dismiss(); else await dialog.accept(); }
          finally { warned.resolve(); }
        })();
        drain.push(task); void task.catch(() => undefined);
      });
      let released = false, departedBeforeRelease = false, departedBeforeRetry = false, retryStarted = false;
      if (inApp) page.on('framenavigated', frame => {
        if (frame === page.mainFrame() && new URL(frame.url()).pathname !== '/studio/edit/' + id) {
          if (!released) departedBeforeRelease = true;
          if (rejectedDeparture && !retryStarted) departedBeforeRetry = true;
        }
      });
      if (inApp) {
        const clicked = deferred<void>();
        await page.exposeFunction('oracleComposeClick', () => clicked.resolve());
        await page.getByRole('link', { name: '← compose', exact: true }).evaluate(el => el.addEventListener('click', () => {
          const state = (window as any).__oracleNavigationSave;
          if (state) state.nextAttempt = 'departure';
          void (window as any).oracleComposeClick();
        }, { once: true }));
        const leaving = page.getByRole('link', { name: '← compose', exact: true }).click();
        drain.push(leaving.catch(() => undefined));
        await hostEvent(clicked.promise, 'real compose click');
        await page.evaluate(() => Promise.resolve());
        const savedSource = await stored();
        observe('blocked', { ...await editorSnapshot(), stored: savedSource });
        released = true; release.resolve(); await leaving;
        if (rejectedDeparture) {
          // Completion is the actual departure save's settlement, not its
          // expected banner: a settled silent rejection must reach the check.
          const departureSave = await hostEvent(departureSettled.promise, 'compose Draft.save settlement');
          observe('departureSave', { phase: departureSave.phase });
          const paneCommits: string[] = [];
          for (const pane of ['preview', 'draft']) {
            // Desktop hides this real control. Check the actual editor and
            // invoke its handler atomically, so a wrong departure cannot turn
            // into an auto-wait for a control that the departed page lacks.
            const action = await page.evaluate(({ path, pane }) => {
              if (location.pathname !== path || !document.querySelector('#md-input')) return 'departed';
              const control = document.querySelector<HTMLButtonElement>(`[role="group"][aria-label="pane"] [data-pane="${pane}"]`);
              if (!control) return 'missing-control';
              control.click();
              return 'clicked';
            }, { path: editPath, pane });
            if (action === 'departed') break;
            if (action === 'missing-control') throw new Error('Missing host control in retained editor: pane ' + pane);
            // A committed pane OR actual editor departure completes this
            // observation. Read the returned receipt, not a second locator
            // that could disappear after the wait resolved.
            const handle = await hostEvent(page.waitForFunction(({ path, pane }) => {
              if (location.pathname !== path || !document.querySelector('#md-input')) return { kind: 'departed' as const, pane: null };
              const actual = document.querySelector('.editor-grid')?.getAttribute('data-pane');
              return actual === pane ? { kind: 'committed' as const, pane: actual } : false as const;
            }, { path: editPath, pane }), 'settled save pane commit or editor departure: ' + pane);
            let receipt;
            try { receipt = await handle.jsonValue(); }
            finally { await handle.dispose(); }
            if (!receipt) throw new Error('Missing host receipt: settled save pane commit or editor departure: ' + pane);
            if (receipt.kind === 'departed') break;
            paneCommits.push(receipt.pane);
          }
          observe('failurePaneCommits', paneCommits);
          const errorShown = await page.locator('#error-banner-slot [role=alert]').isVisible();
          const failedStored = await stored();
          const failed = await editorSnapshot();
          observe('failed', { ...failed, stored: failedStored, errorShown });
          observe('failedRequests', {
            received: rejectedRequests.length > 0,
            methods: [...new Set(rejectedRequests.map(request => request.method))].sort(),
            statuses: [...new Set(rejectedRequests.map(request => request.status))].sort((a, b) => a - b),
          });
          // An earlier autosave can reach the same rejection gate. Retain the
          // complete receipts without treating their timing as a product result.
          const evidence = process.env.FORMATTING_ORACLE_RECEIVING_EVIDENCE;
          if (evidence) {
            const directory = mkdtempSync(join(evidence, 'navigation-'));
            writeFileSync(join(directory, 'save.json'), JSON.stringify({ history: p.h, departureSave, saveReceipts, rejectedRequests }) + '\n', { flag: 'wx' });
          }
          if (failed.inEditor) {
            // The actual retry click ends the failed-attempt observation window.
            // No test-only save or replacement response supplies success.
            rejectWrites = false;
            await page.exposeFunction('oracleRetryComposeClick', () => { retryStarted = true; });
            const retry = await page.evaluate(path => {
              if (location.pathname !== path || !document.querySelector('#md-input')) return 'departed';
              const link = [...document.querySelectorAll<HTMLAnchorElement>('.ed-head a')].find(el => el.textContent === '← compose');
              if (!link) return 'missing-control';
              link.addEventListener('click', () => { void (window as any).oracleRetryComposeClick(); }, { once: true });
              link.click();
              return 'clicked';
            }, editPath);
            if (retry === 'missing-control') throw new Error('Missing host control in retained editor: retry compose');
          }
        }
        await page.waitForURL(url => url.pathname === '/studio' || url.pathname === '/studio/');
      } else {
        // Retain original hard goto; unlike the old test its unload decision is
        // an explicit input. Missing warnings race completed navigation and are
        // observed, not converted into waitForEvent timeouts.
        const leaving = page.goto('/studio').then(() => 'departed' as const, error => {
          if (error.name === 'TimeoutError' && !(p.h.departure === 'stay' && dialogs.some(d => d.type === 'beforeunload'))) throw error;
          return 'canceled' as const;
        });
        drain.push(leaving.catch(() => undefined));
        const first = await hostEvent(Promise.race([warned.promise.then(() => 'warned' as const), leaving]), 'warning or navigation result');
        if (p.h.departure === 'leave' || first !== 'warned') await leaving;
        await hostEvent(leavingPacket.promise, 'departing-document instrumentation receipt');
        if (packetFailure) throw packetFailure;
      }
      const departureStored = await stored(), departure = await editorSnapshot();
      observe('departure', { dialogs, ...departure, stored: departureStored, departedBeforeRelease,
        ...(rejectedDeparture ? { departedBeforeRetry } : {}) });
      if (departure.inEditor) {
        if (observesStay) {
          // An earlier autosave may still be in flight after the final edit.
          // Use the current save as the boundary, then judge the server's text.
          waitingForStaySave = true;
          release.resolve();
          await hostEvent(staySaved.promise, 'current draft autosave settled');
        } else {
          const saved = page.waitForResponse(response => response.url().endsWith(endpoint) && response.request().method() === 'PATCH');
          release.resolve();
          await (await saved).finished();
        }
        observe('saved', { value: await stored() });
        await captureBrowserCalls(page);
      } else {
        const card = await openNavigationCard({ page, context, drain, id, history: p.h });
        await card.locator('[data-action="quick-edit"]').click();
        const quick = page.getByRole('textbox', { name: 'quick edit' }); await quick.waitFor({ state: 'visible' });
        observe('quickLoaded', { value: await quick.inputValue() });
        await quick.focus(); await quick.evaluate((el: HTMLTextAreaElement) => el.setSelectionRange(0, el.value.length));
        await page.keyboard.press('ControlOrMeta+b');
        observe('quickBold', await quick.evaluate((el: HTMLTextAreaElement) => ({ value: el.value, selection: [el.selectionStart, el.selectionEnd], focused: document.activeElement === el })));
        await captureBrowserCalls(page);
      }
    } finally { abortHeld = p.h.departure === 'leave'; release.resolve(); }
  });
}
