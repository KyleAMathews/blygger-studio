/** User actions against the actual React app and disposable Worker preview. */
import { expect } from 'vitest';
import { browserProfile } from './browser-engine-oracle.ts';
import { browserApplicationHost, browserDocument, browserSetup, captureBrowserCalls, installFormattingBrowser } from './browser-driver-oracle.ts';
import { usesStructuralReceiving, type sessionPlan, type Step } from './session-model-oracle.ts';
import type { Observe } from './document-oracle.ts';
import { nativeHostBoundary } from './native-host-oracle.ts';
import { openNavigationCard as openComposeCard } from './navigation-acquisition-oracle.ts';
import { hostEvent } from './application-driver-oracle.ts';
import { typeLinkTargetWithKeys } from './key-typing-delivery-oracle.ts';
import { typeStructuralTextWithKeys } from './structural-typing-delivery-oracle.ts';
import { rawFailure, withSessionRawEvidence, type RawRecord } from './session-raw-evidence-oracle.ts';

export async function sessionDriver(plan: ReturnType<typeof sessionPlan>, observe: Observe) {
  const root = process.env.FORMATTING_ORACLE_RECEIVING_EVIDENCE;
  if (!root) throw new Error('Session receiving evidence directory is missing');
  const test = expect.getState();
  await withSessionRawEvidence(root, { property: 'editor-browser-session', file: test.testPath, test: test.currentTestName,
    cwd: process.cwd(), pid: process.pid, invocation: process.env.FORMATTING_ORACLE_INVOCATION, engine: process.env.FORMATTING_ORACLE_ENGINE,
    replay: { seed: process.env.ORACLE_SEED, path: process.env.ORACLE_PATH, property: process.env.ORACLE_PROPERTY, unit: process.env.ORACLE_UNIT, calibration: process.env.ORACLE_CALIBRATION } },
  plan, observe, (forward, raw) => runSessionDriver(plan, forward, raw));
}

async function runSessionDriver(plan: ReturnType<typeof sessionPlan>, observe: Observe, raw: RawRecord) {
  const { browser } = await browserDocument();
  const { origin, script, cookie } = browserApplicationHost();
  const context = await browser.newContext({ ...browserProfile(plan.h.mobile), baseURL: origin, serviceWorkers: 'block', extraHTTPHeaders: { 'CF-Connecting-IP': 'fd00:' + crypto.randomUUID().replaceAll('-', '').match(/.{4}/g)!.slice(0, 7).join(':') } });
  const drain: Promise<unknown>[] = [];
  let nativeHost: Awaited<ReturnType<typeof nativeHostBoundary>> | undefined;
  let failure: unknown;
  try {
    // Only histories observing Undo/Redo need the host's native grouping premise.
    // Enable it from setup for the whole history, never just at the Undo key.
    const needsNativeHistory = plan.actions.some(action => action.kind === 'key' && (action.intent === 'undo' || action.intent === 'redo'));
    nativeHost = await nativeHostBoundary(browser, needsNativeHistory);
    await context.addInitScript(installFormattingBrowser, browserSetup());
    // A navigator.platform override tests the app classifier; it does not
    // emulate a physical iPad or its on-screen keyboard.
    if ('newlinePlatform' in plan.h && plan.h.newlinePlatform === 'IPAD') await context.addInitScript(() => {
      Object.defineProperty(navigator, 'platform', { configurable: true, get: () => 'IPAD' });
    });
    if (!plan.h.native) await context.addInitScript(() => { document.execCommand = () => false; });
    await context.route('**/studio/app.js', route => route.fulfill({ path: script, contentType: 'application/javascript' }));
    const structuralReceiving = usesStructuralReceiving(plan.h);
    if (!structuralReceiving) {
      const split = cookie.indexOf('=');
      await context.addCookies([{ name: cookie.slice(0, split), value: cookie.slice(split + 1), url: origin }]);
    }
    const page = await context.newPage();
    page.setDefaultTimeout(7000);
    const errors: { name: string; message: string }[] = [];
    page.on('pageerror', error => { errors.push({ name: error.name, message: error.message }); });
    if (structuralReceiving) {
      const cookiesBeforeLogin = (await context.cookies()).length;
      await page.goto('/studio/login');
      await page.locator('[name=password]').fill('test-password');
      await page.getByRole('button', { name: 'log in', exact: true }).click();
      await page.locator('#composer-text').waitFor({ state: 'visible' });
      // This retained arrival is a setup premise, not an authentication law.
      observe('receivingSetup', { method: 'browserPasswordForm', cookiesBeforeLogin, cookieInjected: false, composerVisible: await page.locator('#composer-text').isVisible() });
    }
    let id: string | undefined;
    if (plan.surface !== 'composer') {
      const input = { contentMd: plan.initialSource, kind: plan.h.journey === 'inline' || plan.surface === 'quick' ? 'fragment' : 'thread' };
      raw('api-create-request', { method: 'POST', path: '/api/items', body: input });
      const created = await context.request.post('/api/items', { data: input });
      raw('api-create-response', { url: created.url(), status: created.status() });
      try { raw('api-create-body', await created.body()); }
      catch (error) { raw('api-create-body-failure', rawFailure(error)); }
      if (!created.ok()) throw new Error('Disposable browser item setup failed: ' + created.status());
      const body = await created.json();
      raw('api-create-json', { body, id: body.id });
      id = body.id;
    }
    await page.goto(plan.surface === 'editor' ? `/studio/edit/${id}` : '/studio');
    if (plan.surface === 'quick') {
      const card = await openComposeCard({ page, context, drain, id: id!, history: plan.h, activation: { kind: 'body', text: plan.h.body } });
      await card.locator('[data-action="quick-edit"]').click();
    }
    let box = plan.surface === 'composer' ? page.locator('#composer-text') : plan.surface === 'quick' ? page.getByRole('textbox', { name: 'quick edit' }) : page.locator('#md-input');
    await box.waitFor({ state: 'visible' });
    raw('loaded-document', { itemId: id, url: page.url(), surface: plan.surface,
      document: await box.evaluate((el: HTMLTextAreaElement) => ({ value: el.value, selection: [el.selectionStart, el.selectionEnd], focused: document.activeElement === el })) });
    if (plan.surface === 'editor' && plan.h.mobile) await page.getByRole('group', { name: 'pane', exact: true }).getByRole('button', { name: 'draft', exact: true }).click();
    if (plan.surface !== 'composer') { await box.focus(); await box.evaluate((el: HTMLTextAreaElement) => el.setSelectionRange(0, el.value.length)); }
    await nativeHost.commit(page);
    for (const action of plan.actions) {

      if (action.kind === 'fill') {
        await box.fill(action.text); await box.focus();
        await box.evaluate((el: HTMLTextAreaElement, range) => el.setSelectionRange(range[0]!, range[1]!), [action.from, action.to]);
        await nativeHost.commit(page);
        continue;
      }
      if (action.kind === 'select') { await box.evaluate((el: HTMLTextAreaElement, range) => el.setSelectionRange(range[0]!, range[1]!), [action.from, action.to]); continue; }
      let currentSource: string | undefined;
      const needsPreview = action.fields.includes('nested') || action.fields.includes('paragraphs');
      const candidates: import('@playwright/test').Response[] = [];
      const collect = (response: import('@playwright/test').Response) => { if (response.url().endsWith('/api/preview') && response.request().method() === 'POST') candidates.push(response); };
      if (needsPreview) page.on('response', collect);
      if (action.kind === 'key') {
        if (action.intent === 'newline') await box.evaluate((el: HTMLTextAreaElement) => {
          const scope = window as typeof window & { __sessionOracleNewlineKey?: KeyboardEvent };
          scope.__sessionOracleNewlineKey = undefined;
          // Shift keydown precedes Enter for Shift+Enter. Retain only Enter,
          // then inspect the same event after React's ancestor listener runs.
          const onEnter = (event: KeyboardEvent) => {
            if (event.key !== 'Enter') return;
            el.removeEventListener('keydown', onEnter); scope.__sessionOracleNewlineKey = event;
          };
          el.addEventListener('keydown', onEnter);
        });
        await page.keyboard.press(action.key);
      }
      else if (action.kind === 'type') {
        if (action.delivery === 'structuralKeys') observe(action.checkpoint + 'Delivery', await typeStructuralTextWithKeys(page, box, action.text));
        else if (action.delivery === 'perCharacter') await typeLinkTargetWithKeys(page, action.text);
        else await page.keyboard.insertText(action.text);
      }
      else if (action.kind === 'toolbar') {
        const button = page.locator(`.ed-tools [data-action="md-${action.tool}"]`);
        if (!action.activation || action.activation === 'click') await button.click();
        else { await button.focus(); await page.keyboard.press(action.activation); }
      }
      else if (action.kind === 'state') { await page.getByRole('button', { name: 'thread', exact: true }).click(); await box.focus(); }
      else if (action.kind === 'quick') {
        // In-app navigation owns save-on-leave. A hard document load bypasses
        // that boundary; its separate persistence obligation remains open in
        // webkit-navigation-premise-review.md, not silently treated as covered.
        await page.getByRole('link', { name: '← compose', exact: true }).click();
        await page.waitForURL(url => url.pathname === '/studio' || url.pathname === '/studio/');
        const card = await openComposeCard({ page, context, drain, id: id!, history: plan.h });
        await card.locator('[data-action="quick-edit"]').click();
        box = page.getByRole('textbox', { name: 'quick edit' });
        await box.waitFor({ state: 'visible' }); await box.focus();
        await box.evaluate((el: HTMLTextAreaElement) => el.setSelectionRange(0, el.value.length));
      }
      else if (action.kind === 'paste') await box.evaluate((el: HTMLTextAreaElement, text) => {
        const clipboard = new DataTransfer(); clipboard.setData('text/plain', text);
        const event = new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: clipboard });
        // Firefox discards clipboardData supplied to a synthetic constructor.
        // Supply the same controlled DOM-event premise in every engine. This
        // still claims no OS clipboard handoff or permission behavior.
        Object.defineProperty(event, 'clipboardData', { value: clipboard });
        el.dispatchEvent(event);
      }, action.text);
      currentSource = await box.inputValue();
      await captureBrowserCalls(page);
      if (needsPreview) {
        const matches = (response: import('@playwright/test').Response) => response.url().endsWith('/api/preview') && response.request().method() === 'POST' && response.request().postDataJSON()?.itemId === id && response.request().postDataJSON()?.contentMd === currentSource;
        const response = candidates.find(matches) ?? await page.waitForResponse(matches);
        page.off('response', collect);
        await response.finished();
        const rendered = await response.json();
        // This only locates the checkpoint: the independent model below judges
        // the DOM after React commits this response. It never supplies an answer.
        await page.waitForFunction(html => { const probe = document.createElement('div'); probe.innerHTML = html; return document.querySelector('#preview-body')?.innerHTML === probe.innerHTML; }, rendered.html);
      }
      const snapshot = await box.evaluate((el: HTMLTextAreaElement, fields) => {
        const preview = document.querySelector('#preview-body');
        const event = (window as typeof window & { __sessionOracleNewlineKey?: KeyboardEvent }).__sessionOracleNewlineKey;
        const keyInput = event && { key: event.key, shiftKey: event.shiftKey, ctrlKey: event.ctrlKey, altKey: event.altKey, metaKey: event.metaKey, trusted: event.isTrusted, target: event.target === el, defaultPrevented: event.defaultPrevented };
        const all: Record<string, unknown> = { keyInput, platform: navigator.platform, value: el.value, selection: [el.selectionStart, el.selectionEnd], focused: document.activeElement === el, nested: [...(preview?.querySelectorAll('ul ul li') ?? [])].map(li => li.textContent), paragraphs: preview?.querySelectorAll('p').length, breaks: preview?.querySelectorAll('p br').length, toast: [...document.querySelectorAll('[role="status"],.toast')].some(el => el.textContent?.includes('Put the cursor on a list item that has another above it.') && el.getBoundingClientRect().width > 0 && el.getBoundingClientRect().height > 0 && getComputedStyle(el).visibility === 'visible') };
        return Object.fromEntries(fields.map(field => [field, all[field]]));
      }, action.fields);
      // Record before the next user action: a later edit must not hide an owed
      // intermediate observation or change the checkpoint retained by shrinking.
      observe(action.checkpoint, { checkpoint: action.checkpoint, ...snapshot } as Step);
      await nativeHost.commit(page);
    }
    observe('errors', errors);
  } catch (error) { failure = error; raw('primary-failure', rawFailure(error)); throw error; }
  finally {
    const cleaned = await Promise.allSettled([context.close(), nativeHost?.close()]);
    const drained = await Promise.allSettled([hostEvent(Promise.allSettled(drain), 'Session Compose acquisition cleanup')]);
    const settled = drained[0]!.status === 'fulfilled' ? drained[0]!.value : [];
    raw('cleanup-settlements', { closed: cleaned, drained, settled });
    const errors = [...cleaned, ...drained, ...settled].filter((result): result is PromiseRejectedResult => result.status === 'rejected').map(result => result.reason);
    if (errors.length) raw('cleanup-failures', errors.map(rawFailure));
    if (errors.length) throw new AggregateError([...(failure ? [failure] : []), ...errors], 'Browser session cleanup failed', { cause: failure });
  }
}
