import { build } from 'esbuild';
import { copyFileSync } from 'node:fs';
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
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
});
copyFileSync('build/studio-spa.js', 'build/studio-spa.txt');
copyFileSync('build/studio-spa.css', 'build/studio-spa-style.txt');
