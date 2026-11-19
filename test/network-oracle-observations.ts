/** Data-only receiving helpers for the network oracles. Production failures are
 * captured only around the named call; fixture and cleanup failures escape.
 */
import { differs, pass, type Observation } from '@tanstack/oracles';
export type Observe = (checkpoint: string, value: unknown) => void;
export type Outcome<T> = { kind: 'returned'; value: T } | { kind: 'threw'; name: string; message: string };
export async function outcome<T>(operation: () => Promise<T>): Promise<Outcome<T>> {
  try { return { kind: 'returned', value: await operation() }; }
  catch (error) { return { kind: 'threw', name: error instanceof Error ? error.name : typeof error, message: error instanceof Error ? error.message : String(error) }; }
}
export const completionCheckpoint = 'network oracle complete';
export async function completed(observe: Observe, operation: () => Promise<void> | void) {
  await operation();
  observe(completionCheckpoint, true);
}
export function receivingTrace(trace: readonly Observation[]) {
  return { observations: trace.filter(entry => entry.checkpoint !== completionCheckpoint), complete: trace.some(entry => entry.checkpoint === completionCheckpoint && entry.value === true) };
}
export function exactTrace(trace: readonly Observation[], expected: readonly Observation[], law: string) {
  const { observations, complete } = receivingTrace(trace);
  // A partial trace from setup/cleanup failure cannot manufacture an omitted
  // tail. Attribute a wrong value or order to its recorded receiving checkpoint,
  // so the framework preserves that violation if cleanup subsequently throws.
  for (let index = 0; index < observations.length; index++) {
    const entry = observations[index];
    const mismatch = differs(entry.checkpoint, law, entry, expected[index]);
    if (mismatch) return mismatch;
  }
  return complete ? differs(completionCheckpoint, law, observations, expected) ?? pass : pass;
}
