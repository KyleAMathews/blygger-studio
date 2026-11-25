/** File-owned disposable React receiving host; no expected product values. */
import type { BrowserContext, Page } from '@playwright/test';
import { browserApplicationHost, browserApplicationSource, browserDocument, browserSetup, installFormattingBrowser } from './browser-driver-oracle.ts';
import { browserProfile } from './browser-engine-oracle.ts';
import type { Observe } from './document-oracle.ts';
import { formattingDiagnosticStart, formattingDiagnosticEnd } from './diagnostic-oracle.ts';

export async function applicationDriver(mobile: boolean, observe: Observe,
  run: (host: { context: BrowserContext; page: Page; drain: Promise<unknown>[] }) => Promise<void>) {
  const browserDocumentSpan = formattingDiagnosticStart('application.browser-document');
  const { browser } = await browserDocument();
  formattingDiagnosticEnd(browserDocumentSpan);
  const { origin, script, cookie } = browserApplicationHost();
  const contextSpan = formattingDiagnosticStart('application.new-context');
  const context = await browser.newContext({ ...browserProfile(mobile), baseURL: origin, serviceWorkers: 'block',
    extraHTTPHeaders: { 'CF-Connecting-IP': 'fd00:' + crypto.randomUUID().replaceAll('-', '').match(/.{4}/g)!.slice(0, 7).join(':') } });
  formattingDiagnosticEnd(contextSpan);
  const drain: Promise<unknown>[] = [];
  const errors: { name: string; message: string }[] = [];
  let failure: unknown;
  try {
    const sourceSpan = formattingDiagnosticStart('application.source');
    const applicationSource = await browserApplicationSource();
    formattingDiagnosticEnd(sourceSpan);
    const setupSpan = formattingDiagnosticStart('application.setup');
    await context.addInitScript(installFormattingBrowser, browserSetup());
    await context.route('**/studio/app.js', route => route.fulfill({
      ...(applicationSource === undefined ? { path: script } : { body: applicationSource }),
      contentType: 'application/javascript',
    }));
    const at = cookie.indexOf('=');
    await context.addCookies([{ name: cookie.slice(0, at), value: cookie.slice(at + 1), url: origin }]);
    const page = await context.newPage(); page.setDefaultTimeout(7000);
    page.on('pageerror', error => errors.push({ name: error.name, message: error.message }));
    formattingDiagnosticEnd(setupSpan);
    const historySpan = formattingDiagnosticStart('application.history');
    await run({ context, page, drain });
    formattingDiagnosticEnd(historySpan);
  } catch (error) {
    failure = error;
    if (errors.length) throw new AggregateError([error, ...errors.map(e => new Error(e.name + ': ' + e.message))], 'Application host failure with production page errors', { cause: error });
    throw error;
  }
  finally {
    // Context routes can still be fetching a response after the last check.
    // Drain them before close disposes the request context used by route.fetch.
    const unrouted = await Promise.allSettled([
      hostEvent(context.unrouteAll({ behavior: 'wait' }), 'application context routes settled'),
    ]);
    // A dismissed WebKit beforeunload leaves goto waiting for a load that was
    // canceled. Closing its context ends that protocol operation; its promise
    // is explicitly drained, rather than timed out and counted as a law kill.
    const closeSpan = formattingDiagnosticStart('application.close-context');
    const closed = await Promise.allSettled([hostEvent(context.close(), 'application context close')]);
    formattingDiagnosticEnd(closeSpan);
    const drainSpan = formattingDiagnosticStart('application.drain', () => ({ drainOperations: drain.length }));
    const drained = await Promise.allSettled([hostEvent(Promise.allSettled(drain), 'application pending operation cleanup')]);
    formattingDiagnosticEnd(drainSpan);
    const settled = drained[0]!.status === 'fulfilled' ? drained[0]!.value : [];
    const cleanupErrors = [...unrouted, ...closed, ...drained, ...settled].filter((r): r is PromiseRejectedResult => r.status === 'rejected').map(r => r.reason);
    observe('errors', errors);
    if (cleanupErrors.length) throw new AggregateError([...(failure ? [failure] : []), ...cleanupErrors], 'Application receiving cleanup failed', { cause: failure });
  }
}

export function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}

/** Bound a missing host event as setup failure, preserving its event name. */
export async function hostEvent<T>(promise: Promise<T>, event: string, timeout = 7000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([promise, new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('Missing host event: ' + event)), timeout);
    })]);
  } finally { clearTimeout(timer); }
}
