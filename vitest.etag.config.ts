import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { include: ['test-oracles/**/*.test.ts'], environment: 'node', maxWorkers: 2, setupFiles: ['test-oracles/controlled-transport.ts'] } });
