/** Host selection only; every engine receives the same laws and histories. */
import { chromium, firefox, webkit, devices } from '@playwright/test';

export const browserEngines = { chromium, firefox, webkit };
export type BrowserEngine = keyof typeof browserEngines;
export function browserEngine(name = process.env.FORMATTING_ORACLE_ENGINE ?? 'chromium'): BrowserEngine {
  if (!(Object.hasOwn(browserEngines, name))) throw new Error('Browser oracle needs chromium, firefox, or webkit');
  return name as BrowserEngine;
}
export function browserProfile(mobile: boolean) {
  const engine = browserEngine();
  if (!mobile) return devices[engine === 'firefox' ? 'Desktop Firefox' : engine === 'webkit' ? 'Desktop Safari' : 'Desktop Chrome'];
  // Firefox has no isMobile context option. Its small viewport is receiving
  // evidence for responsive layout, not an emulation of iOS or Android input.
  return engine === 'firefox'
    ? { viewport: devices['iPhone 13']!.viewport, hasTouch: true }
    : devices['iPhone 13'];
}

export type BrowserIsolation = 'shared' | 'process';
export function browserIsolation(name = process.env.FORMATTING_ORACLE_BROWSER_ISOLATION ?? 'shared', engine = browserEngine()): BrowserIsolation {
  if (name !== 'shared' && name !== 'process') throw new Error('Browser isolation needs shared or process');
  if (name === 'process' && (process.platform !== 'linux' || engine !== 'chromium')) throw new Error('Process-isolated browser oracles currently require Linux Chromium');
  return name;
}
// The parent BrowserServer and an owned per-unit Browser use the same binary/options.
export function browserLaunchOptions() {
  return { headless: true, ...(process.env.FORMATTING_ORACLE_BROWSER_EXECUTABLE ? { executablePath: process.env.FORMATTING_ORACLE_BROWSER_EXECUTABLE } : {}) };
}
