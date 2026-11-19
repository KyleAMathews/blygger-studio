import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';

// Node instrumentation for the migrated Studio oracle; Worker tests retain their config.
export default defineConfig({
  resolve: { alias: [
    { find: /^(?:\.\.\/)+sdk\/dist\/browser\.js$/, replacement: fileURLToPath(new URL('./sdk/index.ts', import.meta.url)) },
    { find: fileURLToPath(new URL('./sdk/dist/browser.js', import.meta.url)), replacement: fileURLToPath(new URL('./sdk/index.ts', import.meta.url)) },
  ] },
  test: {
    include: process.env.BLYG_ORACLE_FILES?.split(',') ?? ['test-ui/polling-cache.oracle.test.ts', 'test-ui/cancellation-work.oracle.test.ts', 'test-oracles/**/*.test.ts'],
    environment: 'node',
    setupFiles: ['./test-oracles/configure-oracles.ts', './test-oracles/controlled-transport.ts'],
    maxWorkers: 2,
  },
});
