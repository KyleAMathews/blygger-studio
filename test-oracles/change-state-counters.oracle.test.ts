/**
 * readChanges refuses malformed domain counters from a database provider. It
 * owns src/changes.ts#readChanges at the returned promise, before a caller can
 * use an invalid source identity to validate a representation.
 *
 * ```ts
 * readChanges(db) // → complete source identity when all counters are nonnegative safe integers
 *                 // → rejection when a counter is missing, nonnumeric or outside that range
 * ```
 * SQLite normally prevents these rows. A custom provider or changed schema can
 * still supply them, so schema checks alone cannot establish the reader's rule.
 * Decision by Kyle Mathews (GitHub KyleAMathews), 2026-11-19: for every domain,
 * missing, nonnumeric, negative, fractional, nonfinite and unsafe counters must
 * reject. Error text and timing are unconstrained. Valid neighbors retain the
 * complete epoch/domain identity described by docs/api.md's legacy change read.
 *
 * The model classifies input numbers by the mathematical range of nonnegative
 * integers through 2^53-1. Each domain receives each boundary or malformed input;
 * all other counters remain unequal valid integers. The driver invokes the real
 * reader with a fresh provider, records return versus rejection and exact valid
 * values, and retains no resources. Calibrations reject accepting an invalid
 * row and rejecting every row.
 *
 * Limits: this enumerates representative JavaScript counter classes and both
 * safe-integer boundaries through the provider interface. It does not corrupt a
 * deployed D1 database or add promises about readFeedRevision or epoch errors.
 */
import { differs, oracleProperty, pass } from '@tanstack/oracles';
import { readChanges } from '../src/changes.ts';
import { oracleDomains } from '../test/polling-cache-oracle-model.ts';

const counterCases = [
  { name: 'zero', kind: 'lower-bound', value: 0 },
  { name: 'maximum', kind: 'upper-bound', value: Number.MAX_SAFE_INTEGER },
  { name: 'missing', kind: 'missing' },
  { name: 'undefined', kind: 'nonnumeric', value: undefined },
  { name: 'text', kind: 'nonnumeric', value: '12' },
  { name: 'null', kind: 'nonnumeric', value: null },
  { name: 'boolean', kind: 'nonnumeric', value: false },
  { name: 'object', kind: 'nonnumeric', value: {} },
  { name: 'array', kind: 'nonnumeric', value: [] },
  { name: 'negative', kind: 'negative', value: -1 },
  { name: 'fraction', kind: 'fractional', value: 0.5 },
  { name: 'NaN', kind: 'nonfinite', value: NaN },
  { name: 'negative infinity', kind: 'nonfinite', value: -Infinity },
  { name: 'positive infinity', kind: 'nonfinite', value: Infinity },
  { name: 'unsafe', kind: 'unsafe', value: Number.MAX_SAFE_INTEGER + 1 },
];
const histories = oracleDomains.flatMap(domain => counterCases.map(input => {
  const row: Record<string, unknown> = { epoch: 'counter-provider', ...Object.fromEntries(oracleDomains.map((name, index) => [name, index + 1])) };
  if ('value' in input) row[domain] = input.value;
  else delete row[domain];
  return { name: `${domain}: ${input.name}`, kind: input.kind, row };
}));
const law = 'valid source counters';
oracleProperty({
  id: 'change-state-counters', owns: ['src/changes.ts#readChanges'],
  law: {
    statement: 'For every provider-supplied change-state row, readChanges rejects missing, nonnumeric, negative, fractional, nonfinite or unsafe domain counters; valid nonnegative safe-integer counters retain the complete epoch/domain identity.',
    authority: 'Decision by Kyle Mathews (GitHub KyleAMathews), 2026-11-19: preserve rejection of invalid counters without specifying error text or timing; docs/api.md legacy ChangeState contract.',
    limits: '180 bounded provider inputs across all twelve domains, with valid epochs, representative nonnumeric values and numeric boundary classes. No claim about live corruption, all object prototypes, readFeedRevision or epoch error behavior.',
  },
  histories: { enumerated: histories, states: ['lower-bound', 'upper-bound', 'missing', 'nonnumeric', 'negative', 'fractional', 'nonfinite', 'unsafe'] },
  label: plan => plan.name,
  model: plan => oracleDomains.every(domain => {
    const value = plan.row[domain];
    return typeof value === 'number' && value >= 0 && value <= 2 ** 53 - 1 && Math.floor(value) === value;
  }) ? { returned: true, value: { epoch: plan.row.epoch, domains: Object.fromEntries(oracleDomains.map(domain => [domain, plan.row[domain]])) } } : { returned: false },
  driver: async (plan, observe) => {
    const provider = { prepare: () => ({ first: async () => ({ ...plan.row }) }) } as unknown as D1Database;
    let result: { returned: boolean; value?: unknown };
    try { result = { returned: true, value: await readChanges(provider) }; }
    catch { result = { returned: false }; }
    observe('source counters', result);
    observe('reach', plan.kind);
  },
  check: (_plan, trace, expected) => differs('source counters', law, trace.filter(entry => entry.checkpoint === 'source counters').map(entry => entry.value), [expected]) ?? pass,
  calibrations: [
    { name: 'accept a missing counter', law, history: { enumerated: 2 }, corrupt: trace => trace.map(entry => entry.checkpoint === 'source counters' ? { ...entry, value: { returned: true } } : entry) },
    { name: 'reject every row', law, history: { enumerated: 0 }, corrupt: trace => trace.map(entry => entry.checkpoint === 'source counters' ? { ...entry, value: { returned: false } } : entry) },
  ],
});
