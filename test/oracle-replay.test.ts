import fc from "fast-check";
import { expect, it } from "vitest";

it("direct seed/path replay preserves a captured reduced counterexample", () => {
  const wrongRule = fc.property(fc.array(fc.integer({ min: 0, max: 10 }), { minLength: 1 }), values => values.every(value => value === 0));
  const captured = fc.check(wrongRule, { seed: 20261001, numRuns: 8 });
  expect(captured.failed).toBe(true);
  if (!captured.failed || captured.counterexamplePath === null) throw new Error("Calibration must capture a failure and replay path");
  const replay = fc.check(wrongRule, { seed: captured.seed, path: captured.counterexamplePath, numRuns: 8, endOnFailure: true });
  expect(replay.failed).toBe(true);
  expect(replay.counterexample).toEqual(captured.counterexample);
  expect(replay.errorInstance).toEqual(captured.errorInstance);
});
