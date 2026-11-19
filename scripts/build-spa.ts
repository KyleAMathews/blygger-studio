import { build, type Plugin } from 'esbuild';
import { copyFileSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

// The formula renderer (temml) is the Worker's alone: the page holding the
// owner's session ships no more third-party code than it must, and the Studio's
// previews come from the server. src/math-render.ts becomes its stub here.
const serverOnly: Plugin = {
  name: 'server-only',
  setup(b) {
    b.onResolve({ filter: /\/math-render\.ts$/ }, (args) => ({
      path: resolve(dirname(args.importer), args.path.replace(/math-render\.ts$/, 'math-render.browser.ts')),
    }));
  },
};

const componentGallery = process.env.BLYG_COMPONENT_GALLERY === '1';
const excludeComponentGallery: Plugin = {
  name: 'exclude-component-gallery',
  setup(build) {
    build.onResolve({ filter: /^\.\/component-library\.tsx$/ }, (args) => ({
      path: resolve(args.resolveDir, 'component-library.stub.tsx'),
    }));
  },
};
await build({
  entryPoints: ['src/ui/app.tsx'],
  outfile: 'build/studio-spa.js',
  bundle: true,
  jsx: 'automatic',
  tsconfig: 'tsconfig.ui.json',
  format: 'iife',
  platform: 'browser',
  target: 'es2022',
  minify: true,
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
    'process.env.BLYG_COMPONENT_GALLERY': JSON.stringify(componentGallery ? '1' : ''),
  },
  // The gallery is a maintainer reference, never an operator-facing route.
  // Replace its module before bundling so neither its page nor its CSS can
  // enter an ordinary production build.
  plugins: [
    serverOnly,
    ...(componentGallery ? [] : [excludeComponentGallery]),
  ],
});
if (/temml/i.test(readFileSync('build/studio-spa.js', 'utf8'))) throw new Error('build-spa: the formula renderer reached the browser bundle');
copyFileSync('build/studio-spa.js', 'build/studio-spa.txt');
copyFileSync('build/studio-spa.css', 'build/studio-spa-style.txt');
