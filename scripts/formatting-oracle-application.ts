/** Disposable actual-application host for browser oracle histories. */
import { build, type Plugin } from 'esbuild';
import { readD1Migrations } from '@cloudflare/vitest-plugin';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { formattingOracleExtensions } from './formatting-oracle-extensions.ts';

export type FormattingApplicationInput = { path: string; sha256: string };
export type FormattingApplicationMetadata = {
  sha256: string;
  inputs: FormattingApplicationInput[];
  receiver?: FormattingApplicationInput;
  sheets?: FormattingApplicationInput;
  delegates: string[];
};
const sha256 = (contents: string | Uint8Array) => createHash('sha256').update(contents).digest('hex');

/** Snapshot the bytes actually consumed by esbuild, apart from explicit delegates. */
export async function formattingApplicationBundle(authoringSource?: string, sheetsSource?: string) {
  const inputs = new Map<string, string>();
  const remember = (path: string, contents: Uint8Array) => {
    const hash = sha256(contents), previous = inputs.get(path);
    if (previous && previous !== hash) throw new Error('Application input changed during build: ' + path);
    inputs.set(path, hash);
    return contents;
  };
  const delegates = ['format-shortcuts.ts', 'links.ts', 'draft.ts'].map(file => resolve('src/ui', file));
  const receiver = authoringSource === undefined ? undefined : { path: resolve('src/ui/authoring.tsx'), sha256: sha256(authoringSource) };
  const sheets = sheetsSource === undefined ? undefined : { path: resolve('src/ui/sheets.tsx'), sha256: sha256(sheetsSource) };
  // These affect build configuration/resolution but are not metafile source
  // inputs. Retain their first hash and require stability across the build.
  const configuration = ['package.json', 'package-lock.json', 'tsconfig.ui.json', 'scripts/formatting-oracle-extensions.ts'].map(file => resolve(file));
  for (const path of configuration) remember(path, await readFile(path));
  const componentGallery = process.env.BLYG_COMPONENT_GALLERY === '1';
  const delegate: Plugin = {
    name: 'oracle-formatting-module', setup(builder) {
      if (authoringSource !== undefined) builder.onLoad({ filter: /\/src\/ui\/authoring\.tsx$/ }, args => ({
        contents: authoringSource, loader: 'tsx', resolveDir: dirname(args.path),
      }));
      // Exact context source is supplied by the data-only Vite query. It must
      // not fall through to a later read of the unmutated filesystem copy.
      if (sheetsSource !== undefined) builder.onLoad({ filter: /\/src\/ui\/sheets\.tsx$/ }, args => ({
        contents: sheetsSource, loader: 'tsx', resolveDir: dirname(args.path),
      }));
      builder.onLoad({ filter: /\/src\/ui\/format-shortcuts\.ts$/ }, () => ({
        contents: [
          'formatEdit', 'indentEdit', 'breakEdit', 'codeBlockEdit', 'formulaEdit', 'formatKey', 'structureKey', 'onFormatKey', 'applyEdit',
        ].map(name => `export function ${name}(...args) { return globalThis.__oracleSut.${name}(...args); }`).join('\n'), loader: 'js'
      }));
      builder.onLoad({ filter: /\/src\/ui\/links\.ts$/ }, () => ({
        contents: [
          'export const TRACKERS = globalThis.__oracleLinks.TRACKERS;',
          ...['isUrl', 'cleanUrl', 'linkMarkdown', 'insertLink', 'linkToast'].map(name => `export function ${name}(...args) { return globalThis.__oracleLinks.${name}(...args); }`),
        ].join('\n'), loader: 'js',
      }));
      builder.onLoad({ filter: /\/src\/ui\/draft\.ts$/ }, () => ({
        contents: 'export const Draft = globalThis.__oracleDrafts.Draft;', loader: 'js',
      }));
      // Match the ordinary SPA build's maintainer-gallery exclusion. The
      // resolved stub remains an input captured by the onLoad hook below.
      if (!componentGallery) builder.onResolve({ filter: /^\.\/component-library\.tsx$/ }, args => ({
        path: resolve(args.resolveDir, 'component-library.stub.tsx'),
      }));
      builder.onResolve({ filter: /\/math-render\.ts$/ }, args => ({ path: resolve(dirname(args.importer), args.path.replace(/math-render\.ts$/, 'math-render.browser.ts')) }));
      builder.onLoad({ filter: /.*/, namespace: 'file' }, async args => ({
        contents: remember(args.path, await readFile(args.path)), loader: 'default', resolveDir: dirname(args.path),
      }));
    }
  };
  const result = await build({ entryPoints: ['src/ui/app.tsx'], bundle: true, jsx: 'automatic', tsconfig: 'tsconfig.ui.json', format: 'iife', platform: 'browser', target: 'es2022', minify: true, define: { 'process.env.NODE_ENV': JSON.stringify('production'), 'process.env.BLYG_COMPONENT_GALLERY': JSON.stringify(componentGallery ? '1' : '') }, plugins: [formattingOracleExtensions(), delegate], write: false, outfile: 'app.js', metafile: true });
  for (const path of configuration) remember(path, await readFile(path));
  for (const input of Object.keys(result.metafile!.inputs)) {
    const path = resolve(input);
    if (path === receiver?.path || path === sheets?.path || delegates.includes(path)) continue;
    if (!inputs.has(path)) throw new Error('Application bundle input was not captured: ' + path);
  }
  const source = result.outputFiles!.find(file => file.path.endsWith('.js'))!.text;
  const metadata: FormattingApplicationMetadata = {
    sha256: sha256(source), inputs: [...inputs].sort(([a], [b]) => a.localeCompare(b)).map(([path, sha256]) => ({ path, sha256 })),
    ...(receiver ? { receiver } : {}), ...(sheets ? { sheets } : {}), delegates,
  };
  return { source, metadata };
}

/** Preserve the string API used by the original fixed application host. */
export async function formattingApplicationSource(authoringSource?: string, sheetsSource?: string) {
  return (await formattingApplicationBundle(authoringSource, sheetsSource)).source;
}

/** Hash the bytes returned to the Worker builder, not later reads of its inputs. */
export async function formattingWorkerBundle() {
  const inputs = new Map<string, string>();
  const remember = (path: string, contents: Uint8Array) => {
    const hash = sha256(contents), previous = inputs.get(path);
    if (previous && previous !== hash) throw new Error('Worker input changed during build: ' + path);
    inputs.set(path, hash); return contents;
  };
  const configuration = ['package.json', 'package-lock.json', 'tsconfig.json', 'scripts/formatting-oracle-extensions.ts'].map(file => resolve(file));
  for (const path of configuration) remember(path, await readFile(path));
  const capture: Plugin = { name: 'oracle-worker-inputs', setup(builder) {
    builder.onLoad({ filter: /.*/, namespace: 'file' }, async args => ({
      contents: remember(args.path, await readFile(args.path)), loader: 'default', resolveDir: dirname(args.path),
    }));
  } };
  const options = { entryPoints: ['src/index.ts'], bundle: true, platform: 'neutral' as const,
    tsconfig: 'tsconfig.json', conditions: ['workerd'], external: ['cloudflare:*', 'node:*'],
    mainFields: ['module', 'main'], format: 'esm' as const, target: 'es2022', loader: { '.txt': 'text' as const } };
  const result = await build({ ...options, plugins: [formattingOracleExtensions(), capture], write: false, metafile: true });
  for (const path of configuration) remember(path, await readFile(path));
  for (const input of Object.keys(result.metafile!.inputs))
    if (!inputs.has(resolve(input))) throw new Error('Worker bundle input was not captured: ' + input);
  const source = result.outputFiles![0]!.text;
  return { source, metadata: { sha256: sha256(source), options,
    inputs: [...inputs].sort(([a], [b]) => a.localeCompare(b)).map(([path, sha256]) => ({ path, sha256 })),
    evidence: 'Exact bundled source/configuration bytes; package resolver manifests and external runtime libraries are not a complete resolver trace.',
  } };
}

export async function formattingApplication() {
  const directory = await mkdtemp(join(tmpdir(), 'blygger-browser-oracles-'));
  let host: Miniflare | undefined;
  let closed = false;
  const cleanup = async () => {
    if (closed) return;
    closed = true;
    const errors: unknown[] = [];
    try { await host?.dispose(); } catch (error) { errors.push(error); }
    try { await rm(directory, { recursive: true, force: true }); } catch (error) { errors.push(error); }
    if (errors.length) throw new AggregateError(errors, 'Disposable formatting application cleanup failed');
  };
  try {
    const [spa, worker] = await Promise.allSettled([
      formattingApplicationBundle(),
      formattingWorkerBundle(),
    ]);
    if (spa.status === 'rejected') throw spa.reason;
    if (worker.status === 'rejected') throw worker.reason;
    const script = join(directory, 'app.js');
    const shared = new Map(spa.value.metadata.inputs.map(input => [input.path, input.sha256]));
    for (const input of worker.value.metadata.inputs)
      if (shared.has(input.path) && shared.get(input.path) !== input.sha256) throw new Error('Worker/SPA consumed different shared input: ' + input.path);
    const metadata = { profile: 'inspect,reading-time,regions-example; disabled by default', spa: spa.value.metadata, worker: worker.value.metadata };
    await writeFile(script, spa.value.source);
    host = new Miniflare(convertV4MiniflareOptions({
      modules: [{ type: 'ESModule', path: 'formatting-oracle-worker.mjs', contents: worker.value.source }],
      compatibilityDate: '2026-07-01', compatibilityFlags: ['nodejs_compat'], host: '127.0.0.1', port: 0,
      bindings: { OWNER_PASSWORD: 'test-password', COOKIE_SECRET: 'formatting-oracle-cookie', MOUNT: '', API_READ_LIMIT: '10000', API_WRITE_LIMIT: '10000' },
      d1Databases: ['DB'], r2Buckets: ['MEDIA'], outboundService: () => new Response(null, { status: 503 }),
    }));
    const db = await host.getD1Database('DB');
    for (const migration of await readD1Migrations('./migrations')) await db.batch(migration.queries.map(sql => db.prepare(sql)));
    const origin = (await host.ready).origin;
    const login = await host.dispatchFetch(origin + '/studio/login', { method: 'POST', redirect: 'manual', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'password=test-password' });
    const cookie = login.headers.get('set-cookie')?.split(';')[0];
    if (login.status !== 302 || !cookie) throw new Error('Disposable owner login failed: ' + login.status);
    return { origin, script, cookie, metadata, close: cleanup };
  } catch (error) { try { await cleanup(); } catch (cleanupError) { throw new AggregateError([error, cleanupError], 'Formatting application setup and cleanup failed', { cause: error }); } throw error; }
}
