/** Browser transport only. Models never import this module. */
import { type Browser, type BrowserContext, type Page } from '@playwright/test';
import { browserEngine, browserEngines, browserIsolation, browserLaunchOptions } from './browser-engine-oracle.ts';
import { afterAll, inject } from 'vitest';
import { formattingDiagnosticStart, formattingDiagnosticEnd, flushFormattingDiagnostics } from './diagnostic-oracle.ts';
import { browserOwnerTopology } from '../../scripts/formatting-oracle-topology.ts';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import type { FormattingApplicationInput, FormattingApplicationMetadata } from '../../scripts/formatting-oracle-application.ts';
import * as loaded from '../../src/ui/format-shortcuts.ts';
import type * as Formatting from '../../src/ui/format-shortcuts.ts';
import * as loadedLinks from '../../src/ui/links.ts';
import type * as Links from '../../src/ui/links.ts';
import * as loadedDraft from '../../src/ui/draft.ts';
import type * as Drafts from '../../src/ui/draft.ts';

type Instrumentation = Record<string, (...args: any[]) => any>;
type BridgeGlobal = typeof globalThis & { __oracleGaps?: Instrumentation; __vitest_worker__?: { filepath: string } };
const source = (loaded as unknown as { __oracleBrowserSource: string }).__oracleBrowserSource;
const linkSource = (loadedLinks as unknown as { __oracleBrowserSource: string }).__oracleBrowserSource;
const draftSource = (loadedDraft as unknown as { __oracleBrowserSource: string }).__oracleBrowserSource;
if (!source || !linkSource || !draftSource) throw new Error('Browser oracle source plugin was not installed');
// Verify trusted dependency bytes before this worker consumes an imported factory.
// The runner captures package/lock reads but excludes node_modules reads; these
// inputs remain a trusted installation. Watch edges support explicit invalidation.
for (const [value, module] of [[source, loaded], [linkSource, loadedLinks], [draftSource, loadedDraft]] as const) {
  const metadata = (module as unknown as { __oracleBrowserModuleMetadata?: FormattingApplicationMetadata }).__oracleBrowserModuleMetadata;
  if (metadata) verifyBrowserApplicationSource(value, metadata);
}
type Run = { mutant?: number | null; callBudget?: number | null; probeSites?: number[]; units?: Record<string, Run> };
const run = inject('oracleGaps' as never) as Run | undefined;
const state = { ...run, ...run?.units?.[(globalThis as BridgeGlobal).__vitest_worker__?.filepath ?? ''] };
const active = state.mutant ?? null;
const contextOwner = inject('oracleGapsContext' as never) as { index?: unknown } | undefined;
const applicationOwner = inject('oracleGapsApplication' as never) as { invocation?: unknown; index?: unknown; file?: unknown; lease?: unknown; origin?: unknown; script?: unknown; cookie?: unknown } | null | undefined;

/** Resolve the real fixture provided for this original baseline file/pass. */
export function browserApplicationHost() {
  if (process.env.FORMATTING_ORACLE_APPLICATION_BROKER) {
    const owner = applicationOwner;
    if (!owner || owner.invocation !== process.env.FORMATTING_ORACLE_INVOCATION ||
        !Number.isSafeInteger(contextOwner?.index) || owner.index !== contextOwner?.index ||
        owner.file !== (globalThis as BridgeGlobal).__vitest_worker__?.filepath ||
        typeof owner.lease !== 'string' || !owner.lease ||
        typeof owner.origin !== 'string' || !/^http:\/\/127\.0\.0\.1:\d+$/.test(owner.origin) ||
        typeof owner.script !== 'string' || !owner.script || typeof owner.cookie !== 'string' || owner.cookie.indexOf('=') <= 0) throw new Error('Browser oracle application fixture does not match this file/context');
    return owner as { index: number; lease: string; origin: string; script: string; cookie: string };
  }
  // The pristine full-audit runner has no provided fixture/context owner.
  const origin = process.env.FORMATTING_ORACLE_ORIGIN, script = process.env.FORMATTING_ORACLE_APP, cookie = process.env.FORMATTING_ORACLE_COOKIE;
  if (!origin || !script || !cookie) throw new Error('Browser oracle application host is missing');
  return { index: null, lease: null, origin, script, cookie };
}
let connection: Promise<{ browser: Browser; page: Page }> | undefined;
// Setup may reject before it returns, so retain each allocation as it succeeds.
let browserResources: { browser: Browser; context?: BrowserContext } | undefined;
async function closeBrowserDocument() {
  const resources = browserResources;
  browserResources = undefined;
  if (!resources) return;
  const errors: unknown[] = [];
  try { await resources.context?.close(); } catch (error) { errors.push(error); }
  try { await resources.browser.close(); } catch (error) { errors.push(error); }
  if (errors.length) throw new AggregateError(errors, 'Browser oracle resource cleanup failed');
}
export async function browserDocument() {
  return connection ??= (async () => {
    const engine = browserEngine(), isolation = browserIsolation(undefined, engine);
    const endpoint = process.env.FORMATTING_ORACLE_BROWSER;
    if (isolation === 'shared' && !endpoint) throw new Error('Run browser oracles with npm run test:formatting');
    const application = browserApplicationHost();
    const { origin, cookie } = application;
    const options = browserLaunchOptions();
    const topology = await browserOwnerTopology({ engine, isolation, launchOptions: options });
    const browser = isolation === 'process'
      ? await browserEngines[engine].launch(options)
      : await browserEngines[engine].connect(endpoint!);
    browserResources = { browser };
    try {
      await topology?.acquired(browser.version(), (globalThis as BridgeGlobal).__vitest_worker__?.filepath ?? null, { context: application.index, lease: application.lease, origin });
      const context = await browser.newContext({ serviceWorkers: 'block', extraHTTPHeaders: { 'CF-Connecting-IP': 'fd00:' + crypto.randomUUID().replaceAll('-', '').match(/.{4}/g)!.slice(0, 7).join(':') } });
      browserResources.context = context;
      const page = await context.newPage();
      const split = cookie.indexOf('=');
      await context.addCookies([{ name: cookie.slice(0, split), value: cookie.slice(split + 1), url: origin }]);
      await page.route(origin + '/__oracle__', route => route.fulfill({ contentType: 'text/html', body: '<main></main>' }));
      await page.goto(origin + '/__oracle__');
      return { browser, page };
    } catch (error) {
      try { await closeBrowserDocument(); } catch (cleanup) {
        throw new AggregateError([error, cleanup], 'Browser oracle setup and cleanup failed', { cause: error });
      }
      throw error;
    }
  })();
}
afterAll(async () => {
  // The caller already receives a cached setup failure. Teardown must not repeat it.
  try {
    if (connection) await connection.catch(() => undefined);
    await closeBrowserDocument();
  } finally { flushFormattingDiagnostics(); }
});

// The pinned runner has no browser transport. Mirror its switch semantics here,
// and return every helper invocation to its original Node capture. No SUT call
// runs in Node. The replay preserves reach, infection, work and branch outcomes.
// Nonprimitive operands keep their identity; relational object coercions are
// rejected as unsupported setup rather than recorded as a production failure.
export async function browserRun<A, R>(action: (sut: typeof Formatting, args: A, links: typeof Links, drafts: typeof Drafts) => R | Promise<R>, args: A): Promise<R> {
  const { page } = await browserDocument();
  await page.evaluate(installFormattingBrowser, browserSetup());
  const value = await page.evaluate(async ({ action, args }) => {
    return await Function('return (' + action + ')')()((globalThis as any).__oracleSut, args, (globalThis as any).__oracleLinks, (globalThis as any).__oracleDrafts);
  }, { action: action.toString(), args });
  await captureBrowserCalls(page);
  return value;
}

/** Installed before the real SPA loads, so its imports call the instrumented module. */
export function installFormattingBrowser({ source, linkSource, draftSource, active, callBudget, probeSites }: { source: string; linkSource: string; draftSource: string; active: number | null; callBudget: number | null; probeSites: number[] }) {
  const calls: { method: string; args: unknown[] }[] = [];
  const ids = new Map<object, number>();
  const transportErrors: string[] = [];
  let hits = 0;
  const probes = new Set(probeSites);
  const setupFault = (message: string): never => { transportErrors.push(message); throw new Error(message); };
  const encode = (value: any): any => {
    if ((typeof value === 'object' && value !== null) || typeof value === 'function') {
      if (!ids.has(value)) ids.set(value, ids.size);
      return { reference: ids.get(value) };
    }
    return { primitive: value };
  };
  const record = (method: string, args: any[]) => {
    calls.push({ method, args: args.map(encode) });
    if (!['open', 'ran'].includes(method)) hits += Number(!probes.has(args[0])) + Number(method === 'cond' && !probes.has(args[1]));
    if (hits > (callBudget ?? 1_000_000)) {
      // Replay reaches the pinned capture's own spin guard, retaining its timeout
      // classification. The baseline safety cap is a transport/setup failure.
      if (!callBudget) setupFault('Browser instrumentation safety budget exceeded');
      throw new Error('Browser instrumentation call budget exceeded');
    }
  };
  const swapped: Record<string, string> = { '===': '!==', '!==': '===', '<': '<=', '<=': '<', '>': '>=', '>=': '>' };
  const compare = (op: string, a: any, b: any) => {
    if (!['===', '!=='].includes(op) && [a, b].some(v => v !== null && (typeof v === 'object' || typeof v === 'function'))) setupFault('Unsupported browser instrumentation operand');
    switch (op) { case '===': return a === b; case '!==': return a !== b; case '<': return a < b; case '<=': return a <= b; case '>': return a > b; case '>=': return a >= b; default: return setupFault('Unknown comparison ' + op); }
  };
  let shortCircuited: unknown;
  const callRuns = new Map<string, boolean[]>();
  const instrumentation = {
    m(id: number) { record('m', [id]); return id === active; },
    v(value: any) { return value; },
    cmp(id: number, a: any, b: any, op: string) { record('cmp', [id, a, b, op]); return compare(id === active ? swapped[op]! : op, a, b); },
    not(id: number, value: any) { record('not', [id, value]); return id === active ? value : !value; },
    b(id: number, value: any) { record('b', [id, value]); return id === active ? !value : value; },
    chain(id: number, value: any, inner: number | string | undefined) {
      record('chain', [id, value, inner]);
      const skipped = typeof inner === 'string' ? callRuns.get(inner)?.pop() === false : inner !== undefined && shortCircuited === inner;
      shortCircuited = undefined;
      if (value !== undefined && value !== null) return value;
      shortCircuited = id;
      if (!skipped && id === active) throw new TypeError(`Cannot read properties of ${value}`);
      return value;
    },
    open(key: string) { record('open', [key]); const runs = callRuns.get(key); if (runs) runs.push(false); else callRuns.set(key, [false]); },
    ran(key: string) { record('ran', [key]); const runs = callRuns.get(key); if (runs?.length) runs[runs.length - 1] = true; return []; },
    cond(yes: number, no: number, value: any) { record('cond', [yes, no, value]); return active === yes ? true : active === no ? false : value; },
  };
  (globalThis as any).__oracleGaps = instrumentation;
  const sut = Function('return ' + source)();
  (globalThis as any).__formattingOracle = { sut, calls, transportErrors };
  (globalThis as any).__oracleSut = sut;
  (globalThis as any).__oracleLinks = Function('return ' + linkSource)();
  (globalThis as any).__oracleDrafts = Function('return ' + draftSource)();
}

export const browserSetup = () => ({ source, linkSource, draftSource, active, callBudget: state.callBudget ?? null, probeSites: state.probeSites ?? [] });

/** The gap loader serves this query from its current authoring patch/schemata. */
export async function browserApplicationSource(): Promise<string | undefined> {
  if (process.env.FORMATTING_ORACLE_RECEIVER !== '1') return;
  // Variable import keeps the test-only query out of production declarations;
  // Vitest resolves and tracks its module without executing authoring imports.
  const applicationId = '../../src/ui/authoring.tsx?oracle-application';
  const applicationImportSpan = formattingDiagnosticStart('source.application-import');
  const application = await import(applicationId) as { __oracleBrowserApplicationSource?: string; __oracleBrowserApplicationMetadata?: FormattingApplicationMetadata };
  formattingDiagnosticEnd(applicationImportSpan);
  if (!application.__oracleBrowserApplicationSource || !application.__oracleBrowserApplicationMetadata) throw new Error('Browser oracle application source plugin was not installed');
  const verifySpan = formattingDiagnosticStart('source.verify');
  verifyBrowserApplicationSource(application.__oracleBrowserApplicationSource, application.__oracleBrowserApplicationMetadata);
  formattingDiagnosticEnd(verifySpan, () => ({ sourceUtf16Units: application.__oracleBrowserApplicationSource!.length, inputs: application.__oracleBrowserApplicationMetadata!.inputs.length }));
  const sheetsInput = application.__oracleBrowserApplicationMetadata.sheets;
  if (!sheetsInput) throw new Error('Browser oracle sheets source descriptor is missing');
  // Evaluate only literal source data. The real module ID tracks context-served
  // sheets bytes for the runner; ?raw would bypass its schemata/patch loader.
  const sheetsId = '../../src/ui/sheets.tsx?oracle-source';
  const sheetsImportSpan = formattingDiagnosticStart('source.sheets-import');
  const sheets = await import(sheetsId) as { __oracleBrowserSuppliedSource?: unknown };
  formattingDiagnosticEnd(sheetsImportSpan);
  const sheetsVerifySpan = formattingDiagnosticStart('source.sheets-verify');
  verifyBrowserSuppliedSource(sheets.__oracleBrowserSuppliedSource, sheetsInput);
  formattingDiagnosticEnd(sheetsVerifySpan);
  // Vitest disables file watching. Raw-data modules additionally put real file
  // paths in the pinned runner's evaluated-module inputs, whose public Vite
  // invalidation follows addWatchFile edges back to the application query.
  // These imports evaluate only string exports, never app dependency code.
  const rawImportSpan = formattingDiagnosticStart('source.raw-imports');
  let diagnosticRawImports = 0;
  await Promise.all(application.__oracleBrowserApplicationMetadata.inputs
    .filter(input => !input.path.includes('/node_modules/'))
    .map(input => {
      if (rawImportSpan) diagnosticRawImports++;
      const inputId = input.path + '?raw';
      return import(inputId);
    }));
  formattingDiagnosticEnd(rawImportSpan, { rawImports: diagnosticRawImports });
  return application.__oracleBrowserApplicationSource;
}

/** Check the compiled bundle and current installed disk inputs before use. */
export function verifyBrowserApplicationSource(source: string, metadata: FormattingApplicationMetadata) {
  const hash = (contents: string | Uint8Array) => createHash('sha256').update(contents).digest('hex');
  if (hash(source) !== metadata.sha256) throw new Error('Browser oracle application bundle fingerprint mismatch');
  for (const input of metadata.inputs) {
    // Do not compare the instrumented receiver or delegated factories to disk:
    // their gap-context source is intentionally different and tracked by Vite.
    if (input.path === metadata.receiver?.path || input.path === metadata.sheets?.path || metadata.delegates.includes(input.path)) throw new Error('Browser oracle application metadata mixes a supplied source with disk: ' + input.path);
    if (hash(readFileSync(input.path)) !== input.sha256) throw new Error('Stale browser oracle application input: ' + input.path);
  }
}

/** Bind separately supplied raw bytes to the app's exact context descriptor. */
export function verifyBrowserSuppliedSource(value: unknown, input: FormattingApplicationInput) {
  const supplied = value as { path?: unknown; source?: unknown } | undefined;
  if (supplied?.path !== input.path || typeof supplied.source !== 'string' || createHash('sha256').update(supplied.source).digest('hex') !== input.sha256) throw new Error('Browser oracle supplied source fingerprint mismatch: ' + input.path);
}

export async function captureBrowserCalls(page: Page) {
  const packet = await page.evaluate(() => ({ calls: (globalThis as any).__formattingOracle.calls.splice(0), transportErrors: (globalThis as any).__formattingOracle.transportErrors.splice(0) })) as BrowserPacket;
  captureBrowserPacket(packet);
}
export type BrowserPacket = { calls: { method: string; args: unknown[] }[]; transportErrors: string[] };
/** Same capture for a departing document's packet, sent before its destruction. */
export function captureBrowserPacket(packet: BrowserPacket) {
  const references = new Map<number, object>();
  const capture = (globalThis as BridgeGlobal).__oracleGaps;
  for (const call of packet.calls) {
    if (!capture?.[call.method]) throw new Error('Missing oracle-gaps instrumentation: ' + call.method);
    const decoded = call.args.map((arg: any) => {
      if ('primitive' in arg) return arg.primitive;
      if (!references.has(arg.reference)) references.set(arg.reference, {});
      return references.get(arg.reference);
    });
    try { capture[call.method]!(...decoded); }
    catch (error) { if (call.method !== 'chain' || !(error instanceof TypeError)) throw error; /* the browser already delivered this production throw */ }
  }
  if (packet.transportErrors.length) throw new Error('Browser oracle transport: ' + packet.transportErrors.join('; '));
}

export async function browserCall<K extends keyof typeof Formatting>(method: K, args: Parameters<(typeof Formatting)[K]>): Promise<{ value?: ReturnType<(typeof Formatting)[K]>; error?: { name: string; message: string } }> {
  return browserRun((sut, { method, args }) => {
    try { return { value: (sut[method] as Function)(...args) }; }
    catch (error) { return { error: { name: (error as Error).name, message: (error as Error).message } }; }
  }, { method, args }) as any;
}

export async function browserLinkCall<K extends Exclude<keyof typeof Links, 'TRACKERS'>>(method: K, args: Parameters<(typeof Links)[K]>): Promise<{ value?: ReturnType<(typeof Links)[K]>; error?: { name: string; message: string } }> {
  return browserRun((_formatting, { method, args }, links) => {
    try { return { value: (links[method] as Function)(...args) }; }
    catch (error) { return { error: { name: (error as Error).name, message: (error as Error).message } }; }
  }, { method, args }) as any;
}

// Fragment preview preserves the original renderMarkdown HTML-string checkpoint
// through JSON. Thread preview adds an unrelated HTML sanitizer/transcoder; the
// actual app receiver separately observes that path on its generated domain.
export async function browserPreview(contentMd: string): Promise<string> {
  return browserRun(async (_sut, contentMd) => {
    const response = await fetch('/api/preview', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contentMd, kind: 'fragment' }) });
    if (!response.ok) throw new Error('Preview request failed: ' + response.status);
    return (await response.json()).html;
  }, contentMd);
}
