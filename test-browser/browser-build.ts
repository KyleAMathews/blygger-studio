/** Rebuild the browser bundle from exactly the sources served to this oracle
 * copy. Authored patches therefore cross the esbuild/Chromium boundary. Only
 * original-value operator schemata are supported here; the browser gap command
 * selects authored mutants explicitly and reports that finite evidence.
 */
import { build, type Plugin } from 'esbuild';
import { copyFileSync, readFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { browserSources } from './production-sources.ts';
const originalSchemata = `globalThis.__oracleGaps={m:()=>false,v:v=>v,not:(id,v)=>!v,b:(id,v)=>v,cond:(a,b,v)=>v,chain:(id,v)=>v,open:()=>{},ran:()=>[],cmp:(id,a,b,op)=>({"===":()=>a===b,"!==":()=>a!==b,"==":()=>a==b,"!=":()=>a!=b,"<":()=>a<b,">":()=>a>b,"<=":()=>a<=b,">=":()=>a>=b})[op]()};`;
export async function buildBrowserOracleBundle(entryPoint: string, outfile: string) {
  const receivingSources: Plugin = {
    name: 'oracle-browser-receiving-sources',
    setup(builder) {
      builder.onLoad({ filter: /\.[cm]?[jt]sx?$/ }, args => {
        const source = browserSources[relative(process.cwd(), args.path).replaceAll('\\', '/')];
        return source === undefined ? undefined : { contents: source, loader: args.path.endsWith('tsx') ? 'tsx' : 'ts', resolveDir: dirname(args.path) };
      });
      builder.onResolve({ filter: /\/math-render\.ts$/ }, args => ({ path: resolve(dirname(args.importer), args.path.replace(/math-render\.ts$/, 'math-render.browser.ts')) }));
      // Match the production build: the maintainer gallery and its CSS are not
      // part of the application whose save behavior this oracle receives.
      builder.onResolve({ filter: /^\.\/component-library\.tsx$/ }, args => ({ path: resolve(args.resolveDir, 'component-library.stub.tsx') }));
    },
  };
  await build({ entryPoints: [entryPoint], outfile, bundle: true, jsx: 'automatic', tsconfig: 'tsconfig.ui.json', format: 'iife', platform: 'browser', target: 'es2022', minify: true, define: { 'process.env.NODE_ENV': JSON.stringify('production'), 'process.env.BLYG_COMPONENT_GALLERY': JSON.stringify('') }, banner: { js: originalSchemata }, plugins: [receivingSources] });
  if (/temml/i.test(readFileSync(outfile, 'utf8'))) throw new Error('Browser oracle build included the Worker formula renderer');
}
export async function buildBrowserOracleSpa() {
  await buildBrowserOracleBundle('src/ui/app.tsx', 'build/studio-spa.js');
  copyFileSync('build/studio-spa.js', 'build/studio-spa.txt');
  copyFileSync('build/studio-spa.css', 'build/studio-spa-style.txt');
}
