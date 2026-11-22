/** Shared observation comparison only; importing this module registers no tests. */
import { differs, type Observation } from '@tanstack/oracles';
import { traceValue } from './document-oracle.ts';

export function fields(trace: readonly Observation[], checkpoint: string, expected: object, law: string) {
  const actual = traceValue(trace, checkpoint) as Record<string, unknown> | undefined;
  for (const [key, value] of Object.entries(expected)) {
    const failure = differs(checkpoint, law, actual?.[key], value, `${checkpoint}.${key}`);
    if (failure) return failure;
  }
}
