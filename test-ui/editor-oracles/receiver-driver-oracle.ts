/** Actual picker/focus/restore delivery. No expected edits are computed here. */
import type { BrowserContext, Locator, Page, Route } from '@playwright/test';
import { receiverFixture } from './receiver-fixture-oracle.ts';
import { applicationDriver, deferred, hostEvent } from './application-driver-oracle.ts';
import { browserApplicationHost, captureBrowserCalls } from './browser-driver-oracle.ts';
import type { Observe } from './document-oracle.ts';
import { replacementControls, type bracketReceiverPlan, type escapeReceiverPlan, type replacementReceiverPlan } from './receiver-model-oracle.ts';

const snapshot = (box: Locator) => box.evaluate((el: HTMLTextAreaElement) => ({ value: el.value, selection: [el.selectionStart, el.selectionEnd], focused: document.activeElement === el }));
const frame = (page: Page) => page.evaluate(() => new Promise<void>(done => requestAnimationFrame(() => done())));

/** Actual visible control input; never a forced pointer or synthetic click. */
async function nativeEnter(page: Page, control: Locator, name: string) {
  await control.waitFor({ state: 'visible' });
  const visible = await control.isVisible(), enabled = await control.isEnabled();
  if (!visible || !enabled) throw new Error('Missing host premise: ' + name + ' is not visible and enabled');
  await control.focus();
  const focused = await control.evaluate(el => document.activeElement === el);
  if (!focused) throw new Error('Missing host premise: ' + name + ' did not receive focus');
  await control.evaluate(el => {
    const host = window as any; host.__receiverControlEnter = null;
    el.addEventListener('keydown', event => { host.__receiverControlEnter = event; }, { once: true, capture: true });
  });
  await page.keyboard.press('Enter');
  const key = await page.evaluate(() => {
    const event = (window as any).__receiverControlEnter as KeyboardEvent | null;
    return event ? { key: event.key, trusted: event.isTrusted, prevented: event.defaultPrevented } : null;
  });
  if (key?.key !== 'Enter' || !key.trusted) throw new Error('Missing host premise: ' + name + ' did not receive native Enter');
  return { activation: 'controlled-focus-native-enter', visible, enabled, focused, key };
}

async function providers(context: BrowserContext, typing: 'editor' | 'panel', drain: Promise<unknown>[]) {
  await context.route(url => url.pathname === '/api/settings', route => {
    const task = (async () => {
      if (route.request().method() !== 'GET') { await route.continue(); return; }
      const response = await route.fetch();
      await route.fulfill({ response, json: { ...(await response.json()), pickerTyping: typing } });
    })();
    drain.push(task); return task;
  });
  await context.route(url => url.pathname === '/api/contacts', route => route.fulfill({ json: { contacts: [{ id: 'oracle-alice', handle: 'alice', name: 'Alice', url: 'https://alice.example/', ids: [], created: '2026-11-18T00:00:00Z', updated: '2026-11-18T00:00:00Z' }] } }));
  await context.route(url => url.pathname === '/api/search', route => route.fulfill({ json: { items: [{ id: 'oracle-bracket-hit', excerpt: 'Found prose', label: 'Found prose', version: 1, updated: '2026-11-18T00:00:00Z', badge: '', source: 'mine', kind: 'fragment', subscriptionId: null, sourceTitle: null }], page: { limit: 20, nextCursor: null } } }));
}

async function open(page: Page, id: string, mobile: boolean, observe: Observe) {
  await page.goto('/studio/edit/' + id);
  const box = page.locator('#md-input'); await box.waitFor({ state: 'visible' });
  if (mobile) observe('initialPaneInput', await nativeEnter(page, page.getByRole('group', { name: 'pane', exact: true }).getByRole('button', { name: 'draft', exact: true }), 'initial draft-pane control'));
  return box;
}
async function seed(context: BrowserContext, text: string) {
  const response = await context.request.post('/api/items', { data: { contentMd: text, kind: 'fragment' } });
  if (!response.ok()) throw new Error('Receiver item setup failed: ' + response.status());
  return await response.json() as { id: string; revision: number };
}
async function caretAtEnd(box: Locator) {
  await box.focus();
  await box.evaluate((el: HTMLTextAreaElement) => { el.setSelectionRange(el.value.length, el.value.length); el.dispatchEvent(new Event('selectionchange')); });
}
async function openedPicker(page: Page, picker: 'none' | 'bracket' | 'mention', typing: 'editor' | 'panel') {
  if (picker === 'none') return;
  const panel = page.getByRole('complementary', { name: picker === 'bracket' ? 'link picker' : 'mention picker' });
  await panel.waitFor({ state: 'visible' });
  // The sort select also owns native options; readiness needs a real hit.
  if (picker === 'bracket') await panel.getByRole('listbox', { name: 'items', exact: true }).getByRole('option').first().waitFor({ state: 'visible' });
  else await panel.getByRole('listbox', { name: 'contacts', exact: true }).getByRole('button', { name: /alice/ }).waitFor({ state: 'visible' });
  if (picker === 'bracket' && typing === 'panel') await panel.getByRole('searchbox', { name: 'search items' }).focus();
}

export async function bracketReceiverDriver(p: ReturnType<typeof bracketReceiverPlan>, observe: Observe) {
  await applicationDriver(p.h.mobile, observe, async ({ context, page, drain }) => {
    await providers(context, 'editor', drain);
    const made = await seed(context, 'Bracket receiver seed');
    const box = await open(page, made.id, p.h.mobile, observe);
    await box.fill(p.text); await caretAtEnd(box);
    await openedPicker(page, 'bracket', 'editor');
    observe('opened', { ...(await snapshot(box)), picker: await page.getByRole('complementary', { name: 'link picker' }).count() });
    await box.evaluate((el: HTMLTextAreaElement) => {
      const host = window as any, sut = host.__oracleSut;
      host.__receiverBracketOriginal = sut.onFormatKey; host.__receiverBracketEntry = null;
      sut.onFormatKey = function(event: any) {
        if (event.currentTarget === el && event.key === 'Enter' && host.__receiverBracketEntry === null) host.__receiverBracketEntry = {
          value: el.value, selection: [el.selectionStart, el.selectionEnd], prevented: event.defaultPrevented,
          nativePrevented: event.nativeEvent.defaultPrevented, trusted: event.nativeEvent.isTrusted,
        };
        return host.__receiverBracketOriginal.apply(this, arguments);
      };
    });
    try {
      await page.keyboard.press(p.h.key); await frame(page);
      const input = await page.evaluate(() => (window as any).__receiverBracketEntry);
      observe('entry', input);
      if (!input?.prevented || !input?.nativePrevented || !input?.trusted) throw new Error('Missing host premise: bracket picker did not deliver a consumed native key to formatter entry');
      observe('delivered', await snapshot(box)); await captureBrowserCalls(page);
    } finally {
      await page.evaluate(() => { const host = window as any; host.__oracleSut.onFormatKey = host.__receiverBracketOriginal; });
    }
  });
}

export async function escapeReceiverDriver(p: ReturnType<typeof escapeReceiverPlan>, observe: Observe) {
  await applicationDriver(p.h.mobile, observe, async ({ context, page, drain }) => {
    await providers(context, p.h.typing, drain);
    const made = await seed(context, p.initial), box = await open(page, made.id, p.h.mobile, observe);
    // This property owns DOM-delivered Escape only. Actual fullscreenchange and
    // browser-owned Escape remain distinct receiving evidence, never simulated.
    await page.evaluate(() => {
      Object.defineProperty(document.documentElement, 'requestFullscreen', { configurable: true, value: undefined });
      (window as any).__receiverEscapeEvents = [];
      window.addEventListener('keydown', event => { if (event.key === 'Escape') (window as any).__receiverEscapeEvents.push(event); }, true);
    });
    await page.getByRole('button', { name: 'focus view', exact: true }).click();
    await frame(page);
    await box.fill(p.text); await caretAtEnd(box);
    await openedPicker(page, p.h.picker, p.h.typing);
    observe('opened', { ...(await snapshot(box)), focusActive: await page.locator('.editor').evaluate(el => el.classList.contains('is-focus')),
      pickers: await page.locator('.editor .picker').count(), fullscreenAvailable: await page.evaluate(() => typeof document.documentElement.requestFullscreen === 'function'), browserFullscreen: await page.evaluate(() => !!document.fullscreenElement) });
    for (let index = 0; index < 2; index++) {
      await page.keyboard.press('Escape'); await frame(page);
      const key = await page.evaluate((i: number) => {
        const event = (window as any).__receiverEscapeEvents[i] as KeyboardEvent | undefined;
        return event ? { key: event.key, trusted: event.isTrusted, prevented: event.defaultPrevented } : null;
      }, index);
      observe('key' + index, key);
      if (!key?.trusted) throw new Error('Missing host premise: native DOM Escape was not delivered');
      // Sample after the delivered event and next frame, never wait for the
      // promised picker disappearance or view state: wrong states must be judged.
      observe('escape' + index, { ...(await snapshot(box)), focusActive: await page.locator('.editor').evaluate(el => el.classList.contains('is-focus')), pickers: await page.locator('.editor .picker').count() });
      await captureBrowserCalls(page);
    }
  });
}

async function controls(page: Page) {
  return await Promise.all(replacementControls.map(async name => {
    const matches = page.locator(`.ed-tools [data-action="md-${name}"]`);
    const count = await matches.count();
    return { name, count, disabled: count ? await matches.first().evaluate((el: HTMLButtonElement) => el.disabled) : null };
  }));
}

async function paneReceipt(page: Page) {
  const receipts: { requested: string; activation: string; committed: string | null; visible: boolean; enabled: boolean; focused: boolean | null; key: { key: string; trusted: boolean; prevented: boolean } | null }[] = [];
  for (const pane of ['preview', 'draft']) {
    const button = page.locator(`.pane-toggle [data-pane="${pane}"]`);
    const visible = await button.isVisible();
    let input: { activation: string; visible: boolean; enabled: boolean; focused: boolean | null; key: { key: string; trusted: boolean; prevented: boolean } | null };
    if (visible) {
      // A retained picker must remain observable even when it covers the
      // button's pointer target. Deliver native keyboard to the actual control.
      input = await nativeEnter(page, button, 'pane render-input control');
    }
    else {
      const enabled = await button.isEnabled();
      if (!enabled) throw new Error('Missing host premise: pane render-input button is disabled');
      await button.evaluate((el: HTMLButtonElement) => el.click());
      input = { activation: 'controlled-dom-click', visible, enabled, focused: null, key: null };
    }
    await hostEvent(page.waitForFunction(expected => document.querySelector('.editor-grid')?.getAttribute('data-pane') === expected, pane), 'real pane handler commit');
    receipts.push({ requested: pane, ...input, committed: await page.locator('.editor-grid').getAttribute('data-pane') });
  }
  return receipts;
}

export async function replacementReceiverDriver(p: ReturnType<typeof replacementReceiverPlan>, observe: Observe) {
  const application = browserApplicationHost();
  await receiverFixture(application, own => applicationDriver(p.h.mobile, observe, async ({ context, page, drain }) => {
    const closed = new Promise<void>(done => { context.once('close', () => done()); });
    await providers(context, 'editor', drain);
    const made = await seed(context, p.published), endpoint = '/api/items/' + made.id;
    own(made.id, async () => {
      // A timed-out hostEvent does not settle its operation. Require the real
      // close event and every pending request before changing the fixture.
      await hostEvent(closed, 'receiver fixture context close');
      await hostEvent(Promise.allSettled(drain), 'receiver fixture pending operation settlement');
    });
    const published = await context.request.post(endpoint + '/publish', { data: { expectedRevision: made.revision } });
    if (!published.ok()) throw new Error('Receiver historical version setup failed: ' + published.status());
    const current = await context.request.get(endpoint);
    if (!current.ok()) throw new Error('Receiver published item setup read failed: ' + current.status());
    const changed = await context.request.patch(endpoint, { data: { expectedRevision: (await current.json()).revision, contentMd: p.working } });
    if (!changed.ok()) throw new Error('Receiver working-copy setup failed: ' + changed.status());
    const release = deferred<void>(), started = deferred<void>();
    let released = false;
    const requests: { method: string; body: unknown; status?: number }[] = [];
    await page.route('**' + endpoint + '/restore', route => {
      const task = (async () => {
        const receipt = { method: route.request().method(), body: route.request().postDataJSON() } as typeof requests[number];
        requests.push(receipt); started.resolve(); await release.promise;
        if (p.h.outcome === 'reject') {
          receipt.status = 500;
          await route.fulfill({ status: 500, json: { code: 'internal', message: 'Controlled replacement rejection' } });
        } else {
          const response = await route.fetch(); receipt.status = response.status(); await route.fulfill({ response });
        }
      })();
      drain.push(task); return task.catch(() => undefined);
    });
    try {
      const box = await open(page, made.id, p.h.mobile, observe); await caretAtEnd(box);
      await openedPicker(page, p.h.picker, 'editor');
      observe('before', { ...(await snapshot(box)), pickers: await page.locator('.editor .picker').count() });
      const history = page.locator('details#history');
      if (!(await history.evaluate((el: HTMLDetailsElement) => el.open))) {
        const input = await nativeEnter(page, history.locator('> summary'), 'history disclosure');
        await hostEvent(page.waitForFunction(() => !!document.querySelector<HTMLDetailsElement>('details#history')?.open), 'actual history disclosure open');
        observe('historyInput', { ...input, opened: await history.evaluate((el: HTMLDetailsElement) => el.open) });
      }
      const restore = history.getByRole('button', { name: 'restore → v2', exact: true });
      // An open picker can cover this button's pointer target. Controlled focus
      // plus native Enter activates its actual handler without piercing it.
      observe('restoreInput', await nativeEnter(page, restore, 'restore entrance control'));
      const confirmation = page.getByRole('dialog', { name: /^Restore v1 into/ });
      await confirmation.waitFor({ state: 'visible' });
      // Pickers do not dismiss on blur. This entrance receipt proves the
      // unfinished trigger/caret survived history and the actual confirm sheet.
      observe('confirmation', { ...(await snapshot(box)), pickers: await page.locator('.editor .picker').count() });
      await confirmation.locator('[data-sheet=ok]').click();
      await hostEvent(started.promise, 'held restore request');
      // Phone pane controls use controlled focus and native Enter. Desktop hides those
      // controls, so its real DOM handler is an explicit controlled input.
      observe('pendingPaneInput', await paneReceipt(page));
      observe('pending', { ...(await snapshot(box)), readonly: await box.evaluate((el: HTMLTextAreaElement) => el.readOnly), disabled: await controls(page), pickers: await page.locator('.editor .picker').count(), operationBusy: await restore.isDisabled() });
      await box.focus(); await box.evaluate((el: HTMLTextAreaElement, range) => el.setSelectionRange(range[0]!, range[1]!), [p.from, p.to]);
      await box.evaluate((el: HTMLTextAreaElement) => {
        const host = window as any; host.__receiverAttemptKeys = []; host.__receiverAttemptPointer = null;
        el.addEventListener('keydown', event => host.__receiverAttemptKeys.push(event), true);
        window.addEventListener('pointerdown', event => { host.__receiverAttemptPointer = event; }, true);
      });
      let attemptInput: { kind: string; name: string; nativeDelivered: boolean; hitTarget?: string | null; keys?: object[]; pointer?: object | null };
      if (p.h.attempt.kind === 'key') {
        await page.keyboard.press(p.h.attempt.name);
        const keys = await page.evaluate(() => ((window as any).__receiverAttemptKeys as KeyboardEvent[]).map(event => ({ key: event.key, trusted: event.isTrusted, prevented: event.defaultPrevented })));
        const finalKey = p.h.attempt.name.split('+').at(-1)!;
        attemptInput = { kind: 'key', name: p.h.attempt.name, nativeDelivered: keys.some(key => key.key === finalKey && key.trusted), keys };
      }
      else {
        const button = page.locator(`.ed-tools [data-action="md-${p.h.attempt.name}"]`);
        await button.scrollIntoViewIfNeeded(); const rect = await button.boundingBox();
        if (!rect) throw new Error('Missing host premise: readonly formatting control has no pointer target');
        const point = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
        const hitTarget = await page.evaluate(point => document.elementFromPoint(point.x, point.y)?.closest('button')?.getAttribute('data-action') ?? null, point);
        await page.mouse.click(point.x, point.y);
        const pointer = await page.evaluate(() => {
          const event = (window as any).__receiverAttemptPointer as PointerEvent | null;
          return event ? { trusted: event.isTrusted, target: (event.target as Element)?.closest('button')?.getAttribute('data-action') ?? null } : null;
        });
        // Disabled controls may suppress DOM pointer events. The native pointer
        // command and actual hit-tested recipient establish this delivery path;
        // any emitted native pointer receipt is retained diagnostically.
        attemptInput = { kind: 'control', name: p.h.attempt.name, nativeDelivered: hitTarget === 'md-' + p.h.attempt.name, hitTarget, pointer };
      }
      observe('attemptInput', attemptInput);
      if (!attemptInput.nativeDelivered) throw new Error('Missing host premise: readonly attempt did not reach its actual native target');
      await frame(page); observe('attempted', await snapshot(box)); await captureBrowserCalls(page);
      const response = page.waitForResponse(r => new URL(r.url()).pathname === endpoint + '/restore' && r.request().method() === 'POST');
      release.resolve(); released = true;
      const delivered = await hostEvent(response, 'restore HTTP completion'); await delivered.finished();
      // action.busy belongs to the history action, independently of replacing.
      // Waiting for this receipt lets a stuck readonly/disabled gate be judged.
      await hostEvent(page.waitForFunction(() => {
        const row = Array.from(document.querySelectorAll<HTMLButtonElement>('#history button')).find(el => el.textContent?.trim() === 'restore → v2');
        return !!row && !row.disabled;
      }), 'restore action settlement');
      observe('settledPaneInput', await paneReceipt(page));
      observe('request', requests);
      observe('settled', { ...(await snapshot(box)), readonly: await box.evaluate((el: HTMLTextAreaElement) => el.readOnly), disabled: await controls(page), operationBusy: await restore.isDisabled(), errorShown: await page.locator('#error-banner-slot').innerText().then(text => text.includes('Controlled replacement rejection')) });
      if (p.saveBeforeEdit) {
        // Hold the actual save request so its submission is observed before it
        // can commit. No input edit runs between accepting restore and Save.
        const saveRelease = deferred<void>(), saveStarted = deferred<void>();
        const saveSettled = deferred<{ status: string; result?: unknown; dirtyBefore: boolean; dirtyAfter: boolean }>();
        const saveRequests: { method: string; body: { contentMd?: unknown }; status?: number }[] = [];
        const saveMatch = (url: URL) => url.pathname === endpoint;
        const saveRoute = (route: Route) => {
          if (route.request().method() !== 'PATCH') return route.continue();
          const task = (async () => {
            const receipt = { method: route.request().method(), body: route.request().postDataJSON() } as typeof saveRequests[number];
            saveRequests.push(receipt); saveStarted.resolve(); await saveRelease.promise;
            const response = await route.fetch(); receipt.status = response.status(); await route.fulfill({ response });
          })();
          drain.push(task); return task.catch(() => undefined);
        };
        await page.exposeFunction('oracleAcceptedSaveReceipt', (receipt: { status: string; result?: unknown; dirtyBefore: boolean; dirtyAfter: boolean }) => saveSettled.resolve(receipt));
        await page.evaluate(() => {
          const host = window as any, prototype = host.__oracleDrafts.Draft.prototype, original = prototype.save;
          host.__receiverAcceptedSaveOriginal = original;
          prototype.save = function (...args: unknown[]) {
            // One-shot transparent observation: return the exact original
            // promise/result and leave its error to the actual caller.
            prototype.save = original;
            const dirtyBefore = this.dirty;
            host.__receiverAcceptedSaveDirty = dirtyBefore;
            const report = (receipt: object) => {
              try { void host.oracleAcceptedSaveReceipt(receipt).catch(() => undefined); }
              catch { /* Missing receipt is a host error, never recovery. */ }
            };
            let result: unknown;
            try { result = original.apply(this, args); }
            catch (error) { report({ status: 'thrown', dirtyBefore, dirtyAfter: this.dirty }); throw error; }
            void Promise.resolve(result).then(
              value => report({ status: 'fulfilled', result: value, dirtyBefore, dirtyAfter: this.dirty }),
              () => report({ status: 'rejected', dirtyBefore, dirtyAfter: this.dirty }),
            );
            return result;
          };
        });
        await page.route(saveMatch, saveRoute);
        let saveFailure: unknown;
        try {
          const saveControl = page.locator('#save-draft-btn');
          const response = page.waitForResponse(r => new URL(r.url()).pathname === endpoint && r.request().method() === 'PATCH');
          // Register rejection before native delivery or another premise can
          // fail. Cleanup drains the original promise; the side catch changes
          // neither its value nor the later awaited failure.
          drain.push(response); void response.catch(() => undefined);
          observe('acceptedSaveInput', await nativeEnter(page, saveControl, 'accepted working-copy Save draft'));
          await hostEvent(saveStarted.promise, 'accepted working-copy save request');
          observe('acceptedSavePendingPaneInput', await paneReceipt(page));
          observe('acceptedSaveSubmitted', { ...(await snapshot(box)), readonly: await box.evaluate((el: HTMLTextAreaElement) => el.readOnly), operationBusy: await saveControl.isDisabled(),
            dirtyBeforeDiagnostic: await page.evaluate(() => (window as any).__receiverAcceptedSaveDirty),
            submitted: saveRequests.map(request => ({ method: request.method, source: request.body?.contentMd })), rawRequests: saveRequests.map(request => ({ ...request })) });
          saveRelease.resolve();
          const delivered = await hostEvent(response, 'accepted working-copy save response');
          const completion = await delivered.finished();
          const save = await hostEvent(saveSettled.promise, 'actual Draft.save settlement');
          // A real pane-handler commit receives the settled operation. Do not
          // await correct source, saved feedback, dirty or operation-busy state.
          observe('acceptedSaveSettledPaneInput', await paneReceipt(page));
          const inspected = await context.request.get(endpoint);
          const stored = await inspected.json();
          const errorText = await page.locator('#error-banner-slot').innerText();
          observe('acceptedSave', { ...(await snapshot(box)), readonly: await box.evaluate((el: HTMLTextAreaElement) => el.readOnly), operationBusy: await saveControl.isDisabled(),
            savedShown: await page.locator('.editor .save-state').isVisible(), errorShown: !!errorText.trim(), errorText,
            submitted: saveRequests.map(request => ({ method: request.method, source: request.body?.contentMd })), statuses: saveRequests.map(request => request.status),
            rawRequests: saveRequests.map(request => ({ ...request })), stored: stored.contentMd, inspectionStatus: inspected.status(), inspected: true, responseCompleted: completion === null, save: { status: save.status, result: save.result }, saveDiagnostics: save });
          await captureBrowserCalls(page);
        } catch (error) { saveFailure = error; throw error; }
        finally {
          saveRelease.resolve();
          const cleaned = await Promise.allSettled([
            page.unroute(saveMatch, saveRoute),
            page.evaluate(() => { const host = window as any; host.__oracleDrafts.Draft.prototype.save = host.__receiverAcceptedSaveOriginal; }),
          ]);
          const errors = cleaned.filter((result): result is PromiseRejectedResult => result.status === 'rejected').map(result => result.reason);
          if (errors.length) throw new AggregateError([...(saveFailure ? [saveFailure] : []), ...errors], 'Accepted-save receiving cleanup failed', { cause: saveFailure });
        }
      }
      // The next real edit proves release. Use input-derived body coordinates;
      // whole-document replacement itself has no adopted caret promise.
      const start = p.h.outcome === 'success' ? 'published '.length : p.from;
      await box.focus(); await box.evaluate((el: HTMLTextAreaElement, range) => el.setSelectionRange(range[0]!, range[1]!), [start, start + p.h.body.length]);
      await page.keyboard.press('ControlOrMeta+b'); await frame(page);
      observe('followup', await snapshot(box)); await captureBrowserCalls(page);
    } finally {
      if (!released) release.resolve();
    }
  }));
}
