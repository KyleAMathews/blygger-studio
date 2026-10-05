import { defineConfig } from 'vitest/config';
import { WxtVitest } from 'wxt/testing/vitest-plugin';

export default defineConfig({
  root: import.meta.dirname,
  plugins: [WxtVitest()],
  test: { include: ['tests/**/*.test.ts'], environment: 'node' },
});
