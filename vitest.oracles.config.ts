import { defineConfig } from 'vitest/config';

// Node instrumentation for the migrated Studio oracle; Worker tests retain their config.
export default defineConfig({
  test: {
    include: process.env.BLYG_ORACLE_FILES?.split(',') ?? ['test-ui/polling-cache.oracle.test.ts', 'test-ui/cancellation-work.oracle.test.ts', 'test-oracles/**/*.test.ts'],
    environment: 'node',
    setupFiles: ['./test-oracles/configure-oracles.ts', './test-oracles/controlled-transport.ts'],
    maxWorkers: 2,
  },
});
