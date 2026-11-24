import { expect, test } from 'vitest';
import { requireRawUnits } from '../scripts/formatting-baseline-plan.ts';

const file = 'test-ui/editor-mixed.oracle.test.ts';
const absolute = '/repo/' + file;
const selected = 'mixed > fixed seed 42: indent';
const other = 'mixed > fixed seed 42: outdent';
const key = (name: string) => absolute + ' > ' + name;
const roster = { [file]: [selected, other] };

function evidence() {
  const units = [1, 2].map(pass => ({
    file: absolute, pass,
    result: {
      tests: [
        { key: key(selected), state: 'passed', message: '' },
        { key: key(other), state: 'skipped', message: '' },
      ],
      rows: [[key(selected), { value: 'intact' }]],
    },
  }));
  const report = {
    oracleFiles: [file],
    baselinePasses: units.map(() => ({
      baseline: [{ file, passed: 1, skipped: 1 }],
      capture: [{ key: file + ' > ' + selected, value: 'intact' }],
    })),
  };
  return { units, report };
}

test('a shard retains the full roster and captures its assigned test in both passes', () => {
  const { report, units } = evidence();
  expect(() => requireRawUnits(report, units, units, [selected], roster)).not.toThrow();
});

test('a shard cannot omit unassigned tasks from the raw roster', () => {
  const { report, units } = evidence();
  units[1]!.result.tests.pop();
  expect(() => requireRawUnits(report, units, units, [selected], roster)).toThrow(/raw test roster differs/i);
});

test('a shard cannot substitute an unassigned test for an assigned test', () => {
  const { report, units } = evidence();
  units[1]!.result.tests.reverse();
  units[1]!.result.tests[0]!.state = 'passed';
  units[1]!.result.tests[1]!.state = 'skipped';
  expect(() => requireRawUnits(report, units, units, [selected], roster)).toThrow(/verdict differs from its shard assignment/i);
});
