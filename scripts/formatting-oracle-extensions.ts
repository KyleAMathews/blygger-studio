/** Compile the real regions example in disposable oracle hosts, disabled by default. */
import type { Plugin } from 'esbuild';
import { resolve } from 'node:path';

export function formattingOracleExtensions(): Plugin {
  const fixtures = resolve('test-ui/editor-oracles/fixtures');
  const generated = new Map(['names', 'ui', 'server'].map(kind => [
    resolve(`build/extensions.${kind}.ts`), resolve(fixtures, `extensions.${kind}-oracle.ts`),
  ]));
  return { name: 'oracle-compiled-extensions', setup(builder) {
    builder.onResolve({ filter: /extensions\.(names|ui|server)\.ts$/ }, args => {
      const path = resolve(args.resolveDir, args.path);
      const fixture = generated.get(path);
      if (fixture) return { path: fixture };
    });
  } };
}
