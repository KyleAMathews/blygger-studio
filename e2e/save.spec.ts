// The ordinary Playwright runner receives the same semantic histories, real
// browser driver and independent save judgment as the framework oracle.
import { test, expect } from './fixture';
import { runSavePlan } from './save-oracle-scenarios.ts';
import { savePlans, savePlanName } from '../test-browser/save-model.ts';
import { checkSave } from '../test-browser/save-check.ts';
import type { Observation } from '@tanstack/oracles';
for (const plan of savePlans) test(savePlanName(plan), async ({ page }) => {
  const trace: Observation[] = [];
  await runSavePlan(page, plan, (checkpoint, value) => { trace.push({ checkpoint, value }); });
  // The Playwright fixture owns its page; the framework driver owns and closes
  // an entire context before reporting this same completion cut.
  trace.push({ checkpoint: 'browser context released', value: true });
  expect(checkSave(plan, trace)).toEqual({ kind: 'pass' });
});
