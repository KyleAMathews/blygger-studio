import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { include: ['test-ui/**/*.test.ts'], environment: 'node' } });
