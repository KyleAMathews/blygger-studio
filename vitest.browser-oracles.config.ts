import { defineConfig } from 'vitest/config';
export default defineConfig({
  plugins: [{
    name: 'oracle-browser-source-text',
    enforce: 'pre',
    transform(code, id) {
      if (id.endsWith('?browser-source')) return { code: `export default ${JSON.stringify(code)};`, map: null };
    },
  }],
  test: { include: ['test-browser/*.oracle.test.ts'], environment: 'node', maxWorkers: 1, fileParallelism: false, hookTimeout: 60000, testTimeout: 60000 },
});
