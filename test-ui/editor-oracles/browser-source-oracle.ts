import ts from 'typescript';
import { readFile, realpath } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, join, resolve, sep } from 'node:path';
import { build } from 'esbuild';
import type { Plugin } from 'vite';
import { formattingApplicationBundle, type FormattingApplicationMetadata, type FormattingApplicationInput } from '../../scripts/formatting-oracle-application.ts';

/** Capture the exact module Vite receives, including oracle-gaps' current patch. */
export function formattingBrowserSource(): Plugin[] {
  return [{
    name: 'formatting-oracle-application-source', enforce: 'post',
    // this.load does not perform Vite's normal filesystem fallback. The gap
    // runner's earlier pre-load hook wins when it supplies context source.
    async load(id) {
      const [path, query = ''] = id.split('?');
      if (path!.endsWith('/src/ui/sheets.tsx') && new URLSearchParams(query).has('oracle-source')) return readFile(path!, 'utf8');
    },
    // oracle-gaps instruments at load, before this hook. Hook order must precede
    // Vite's normal TSX transform, despite our post-plugin position.
    transform: { order: 'pre', async handler(code, id) {
      const [path, query = ''] = id.split('?');
      if (path!.endsWith('/src/ui/sheets.tsx') && new URLSearchParams(query).has('oracle-source')) {
        const supplied = { path: path!, source: code };
        this.addWatchFile(path!);
        // Only literal data executes in Node; raw TSX and React imports do not.
        return { code: 'export const __oracleBrowserSuppliedSource = ' + JSON.stringify(supplied) + ';', map: null, meta: { oracleBrowserSuppliedSource: supplied } };
      }
      if (!path!.endsWith('/src/ui/authoring.tsx') || !new URLSearchParams(query).has('oracle-application')) return;
      const sheetsPath = path!.replace(/authoring\.tsx$/, 'sheets.tsx');
      const loaded = await this.load({ id: sheetsPath + '?oracle-source' });
      const sheets = loaded.meta.oracleBrowserSuppliedSource as { path?: unknown; source?: unknown } | undefined;
      if (sheets?.path !== sheetsPath || typeof sheets.source !== 'string') throw new Error('Browser oracle sheets source query returned no exact source');
      const { source, metadata } = await formattingApplicationBundle(code, sheets.source);
      this.addWatchFile(sheetsPath);
      for (const input of metadata.inputs) this.addWatchFile(input.path);
      // Node imports only this data export: React and receiver code execute in
      // the browser bundle, never while loading the oracle's model/driver.
      return { code: 'export const __oracleBrowserApplicationSource = ' + JSON.stringify(source) + ';\n'
        + 'export const __oracleBrowserApplicationMetadata = ' + JSON.stringify(metadata) + ';', map: null };
    } },
  }, {
    name: 'formatting-oracle-browser-source', enforce: 'post',
    async transform(code, id) {
      const path = id.split('?')[0]!;
      if (!['/src/ui/format-shortcuts.ts', '/src/ui/links.ts', '/src/ui/draft.ts'].some(suffix => path.endsWith(suffix))) return;
      const { source, metadata } = await formattingModuleFactory(code, path);
      for (const input of metadata?.inputs ?? []) this.addWatchFile(input.path);
      return { code: code + '\nexport const __oracleBrowserSource = ' + JSON.stringify(source) + ';'
        + (metadata ? '\nexport const __oracleBrowserModuleMetadata = ' + JSON.stringify(metadata) + ';' : ''), map: null };
    },
  }];
}


type FormattingModuleMetadata = FormattingApplicationMetadata & { supplied: FormattingApplicationInput };
/** Compile exact context source; imports may consume trusted package bytes only. */
export async function formattingModuleFactory(code: string, path: string): Promise<{ source: string; metadata?: FormattingModuleMetadata }> {
  const compiled = ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  const syntax = ts.createSourceFile(path, code, ts.ScriptTarget.Latest, true);
  const hasImports = syntax.statements.some(statement => ts.isImportDeclaration(statement) && !statement.importClause?.isTypeOnly);
  // Preserve every existing no-import factory and transform result byte-for-byte.
  if (!hasImports) return { source: `(function () { const exports = {}; ${compiled}\nreturn exports; })()` };
  const hash = (bytes: string | Uint8Array) => createHash('sha256').update(bytes).digest('hex');
  const inputs = new Map<string, string>(), nodeModules = await realpath(resolve('node_modules'));
  const remember = (file: string, bytes: Uint8Array) => {
    const sha256 = hash(bytes), previous = inputs.get(file);
    if (previous && previous !== sha256) throw new Error('Formatter input changed during build: ' + file);
    inputs.set(file, sha256); return bytes;
  };
  for (const file of ['package.json', 'package-lock.json'].map(file => resolve(file))) remember(file, await readFile(file));
  const result = await build({
    stdin: { contents: code, sourcefile: path, resolveDir: dirname(path), loader: 'ts' },
    bundle: true, write: false, format: 'cjs', platform: 'browser', target: 'es2022',
    treeShaking: false, minify: false, tsconfigRaw: {}, metafile: true,
    plugins: [{ name: 'oracle-supplied-module-dependencies', setup(builder) {
      builder.onLoad({ filter: /.*/, namespace: 'file' }, async args => {
        const file = await realpath(args.path);
        // A future local import needs its own exact context source. Failing here
        // cannot silently execute an unmutated disk copy of owned source.
        if (!file.startsWith(nodeModules + sep)) throw new Error('Formatter import needs supplied source: ' + file);
        // Capture both package exports/main resolution and nested module type.
        let directory = dirname(file);
        while (directory.startsWith(nodeModules + sep)) {
          const manifest = join(directory, 'package.json');
          try { remember(manifest, await readFile(manifest)); }
          catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
          directory = dirname(directory);
        }
        return { contents: remember(file, await readFile(file)), loader: 'default', resolveDir: dirname(file) };
      });
    } }],
  });
  for (const [file, sha256] of inputs) if (hash(await readFile(file)) !== sha256) throw new Error('Unstable formatter input: ' + file);
  for (const input of Object.keys(result.metafile!.inputs)) {
    if (resolve(input) !== path && input !== '<stdin>' && !inputs.has(resolve(input))) throw new Error('Untracked formatter input: ' + input);
  }
  // Delegates read this facade on every call. Existing transparent observers
  // replace/restore onFormatKey; copy stable exports into writable properties.
  const source = `(function () { const module = { exports: {} }; const exports = module.exports; ${result.outputFiles![0]!.text}\nreturn { ...module.exports }; })()`;
  return { source, metadata: {
    sha256: hash(source), supplied: { path, sha256: hash(code) }, delegates: [path],
    inputs: [...inputs].sort(([a], [b]) => a.localeCompare(b)).map(([path, sha256]) => ({ path, sha256 })),
  } };
}
