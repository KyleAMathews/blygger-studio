/** Approved 2026-11-18: helper work stops at each abort boundary, independently
 * of QueryClient cache acceptance. One phase table models all three guards. */
import fc from 'fast-check';
import { QueryClient } from '@tanstack/query-core';
import { configureOracles, differs, oracleProperty, pass } from '@tanstack/oracles';
import { readIfChanged } from '../src/ui/revision-query.ts';
import { withOracleCleanup } from '../test/oracle-cleanup.ts';
import { studioOracleProperties } from '../test/oracle-property-registry.ts';
configureOracles({ envPrefix: 'STUDIO_ORACLE', registry: studioOracleProperties, retiredVariables: ['ORACLE_TARGET', 'ORACLE_SEED', 'ORACLE_PATH'] });
const phases = ['before revision', 'after revision', 'after content', 'live'] as const;
type Phase = typeof phases[number];
oracleProperty({
  id: 'studio-cancellation-work',
  owns: ['src/ui/revision-query.ts#readIfChanged'],
  law: {
    statement: 'For every helper invocation, an already-aborted signal rejects before revision work, and an abort during either awaited stage rejects before any following stage or accepted helper result.',
    authority: 'Maintainer Kyle Mathews (GitHub KyleAMathews), 2026-11-18: keep and test the cancellation work boundaries; QueryClient separately owns cache acceptance.',
    limits: 'Abort before the revision read, during that read, or during content loading; controlled stage boundaries, not interruption of synchronous work.',
  },
  histories: {
    arbitrary: fc.record({ phase: fc.constantFrom(...phases) }),
    runs: 50, fixedSeeds: [20261001], states: [...phases],
    constructed: phases.map(phase => ({ name: phase, enters: [phase], build: () => ({ phase }) })),
  },
  model: ({ phase }: { phase: Phase }) => ({
    reads: phase === 'before revision' ? 0 : 1,
    loads: phase === 'after content' || phase === 'live' ? 1 : 0,
    outcome: phase === 'live' ? 'resolved' : 'AbortError',
  }),
  reached: ({ phase }) => [phase],
  driver: async ({ phase }, observe) => {
    const client = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } });
    const controller = new AbortController(); let reads = 0, loads = 0;
    await withOracleCleanup(async () => {
      if (phase === 'before revision') controller.abort();
      const context = { client, queryKey: ['cancellation'], signal: controller.signal, meta: undefined };
      let outcome = 'resolved';
      try {
        await readIfChanged(context, 'items', async () => {
          reads++; if (phase === 'after revision') controller.abort();
          return { epoch: 'current', domains: { items: 1, reading: 1, subscriptions: 1, hoppers: 1, signals: 1, settings: 1, feed: 1, mentions: 1, responses: 1, interactions: 1, browse: 1, shelf: 1 } };
        }, async () => { loads++; if (phase === 'after content') controller.abort(); return 'payload'; });
      } catch (error) { outcome = error instanceof Error ? error.name : String(error); }
      observe('cancellation stages', { reads, loads, outcome });
    }, [async () => { client.clear(); }]);
  },
  check: (_history, trace, expected) => {
    // A received wrong stage result outranks a later cleanup failure. Missing
    // observations remain completeness failures, separate from recorded cuts.
    for (const [index, entry] of trace.entries()) {
      const mismatch = differs(entry.checkpoint, 'abort stages', [entry.value], index === 0 ? [expected] : []);
      if (mismatch) return mismatch;
    }
    return differs('cancellation work boundary', 'abort stages', trace.length, 1) ?? pass;
  },
  calibrations: [{
    name: 'content starts after revision abort', law: 'abort stages', history: { constructed: 'after revision' },
    corrupt: trace => trace.map(entry => ({ ...entry, value: { ...(entry.value as object), loads: 1 } })),
  }],
});
