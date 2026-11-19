import { defineConfig } from 'vitest/config';
import browser from './vitest.browser-oracles.config.ts';
export default defineConfig({ ...browser, test: { ...browser.test, include: ['test-browser/search.oracle.test.ts'] } });
