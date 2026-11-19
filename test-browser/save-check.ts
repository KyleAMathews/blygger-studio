/** Compare the ordered receiving cuts with the independent save model. The
 * network error's browser spelling is intentionally not contractual; conflict
 * and publication messages retain their established text. Nothing in this check
 * derives an expected stored value from the driver.
 */
import { isDeepStrictEqual } from 'node:util';
import type { Observation, Verdict } from '@tanstack/oracles';
import { saveModel, type SavePlan } from './save-model.ts';
export const saveLaw = 'acknowledged ordered saves';
const pass: Verdict = { kind: 'pass' };
function differs(checkpoint: string, law: string, actual: unknown, expected: unknown): Verdict | undefined {
  return isDeepStrictEqual(actual, expected) ? undefined : { kind: 'violation', checkpoint, law, difference: 'the receiving observation differs from the save model', values: { actual, expected } };
}
export function checkSave(plan: SavePlan, trace: readonly Observation[], expected = saveModel(plan)) {
  const completed = trace.filter(entry => entry.checkpoint === 'browser context released');
  const observations = trace.filter(entry => entry.checkpoint !== 'browser context released');
  for (let index = 0; index < observations.length; index++) {
    const wanted = expected[index], entry = observations[index];
    if (!wanted) return differs('complete browser receiving history', saveLaw, observations.length, expected.length)!;
    const phase = differs(wanted.phase, saveLaw, entry?.checkpoint, wanted.phase);
    if (phase) return phase;
    const actual = entry.value as Record<string, unknown>;
    for (const [field, value] of Object.entries(wanted.fields)) {
      const mismatch = differs(wanted.phase, saveLaw, actual?.[field], value);
      if (mismatch) return mismatch;
    }
    if (wanted.error) {
      const pattern = wanted.error === 'network' ? /failed|fetch|network/i : wanted.error === 'conflict' ? /item revision conflict; reload and try again/ : /publication rejected/;
      const mismatch = differs(wanted.phase, saveLaw, typeof actual.error === 'string' && pattern.test(actual.error), true);
      if (mismatch) return mismatch;
    }
  }
  if (!completed.length) return pass;
  return differs('complete browser receiving history', saveLaw, observations.length, expected.length)
    ?? differs('browser cleanup completion', saveLaw, completed.map(entry => entry.value), [true]) ?? pass;
}
