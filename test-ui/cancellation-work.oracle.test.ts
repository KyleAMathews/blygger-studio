/** Approved cancellation stages now enter the conditional resource receiver.
 * Before invocation, after headers and after body consumption correspond to
 * the former before-check/after-check/after-content work boundaries. The helper
 * result is observed directly, independently of native Query cache acceptance.
 *
 * ```ts
 * read('/api/items/summary', { signal }) // → pre-abort rejects before transport
 * read('/api/items/summary', { signal }) // → body-stage abort rejects acceptance
 * readCursorWindow({ ...options, signal }) // → abort stops later cursor work
 * ```
 */
import fc from 'fast-check';
import { QueryClient } from '@tanstack/query-core';
import { differs, oracleProperty, pass } from '@tanstack/oracles';
import { conditionalReadFetch } from '../sdk/conditional-reads.ts';
import { readCursorWindow } from '../src/ui/cursor-query.ts';
import { withOracleCleanup } from '../test/oracle-cleanup.ts';

const phases = ['before request', 'after headers', 'after body', 'live'] as const;
type Phase = typeof phases[number];
oracleProperty({
  id: 'studio-cancellation-work', owns: ['sdk/conditional-reads.ts#conditionalReadFetch', 'src/ui/cursor-query.ts#readCursorWindow'],
  law: {
    statement: 'An already-aborted acquisition performs no transport; cancellation at each awaited receiving stage rejects before subsequent work or an accepted helper result.',
    authority: 'Maintainer Kyle Mathews (GitHub KyleAMathews),2026-11-18: keep cancellation work boundaries independently of Query acceptance; approve original-reason pre-aborted reads. Approved ETag replacement transfers those boundaries to conditional resource reads and cursor acquisition.',
    limits: 'Conditional headers/body boundaries and first/continuation cursor boundaries with controlled legal peers. No interruption of synchronous work or network cancellation delivery claim.',
  },
  histories: {
    arbitrary: fc.record({ phase: fc.constantFrom(...phases), receiver: fc.constantFrom('conditional' as const, 'cursor' as const) }),
    runs: 50, fixedSeeds: [20261001], states: phases.flatMap(phase => ['conditional', 'cursor'].map(receiver => `${receiver}: ${phase}`)),
    constructed: phases.flatMap(phase => (['conditional', 'cursor'] as const).map(receiver => ({ name: `${receiver}: ${phase}`, enters: [`${receiver}: ${phase}`], build: () => ({ phase, receiver }) }))),
  },
  model: ({ phase, receiver }: { phase: Phase; receiver: 'conditional' | 'cursor' }) => ({
    reads: phase === 'before request' ? 0 : receiver === 'cursor' && (phase === 'after body' || phase === 'live') ? 2 : 1,
    loads: phase === 'after body' || phase === 'live' ? 1 : 0,
    outcome: phase === 'live' ? 'resolved' : 'AbortError',
  }),
  reached: ({ phase, receiver }) => [`${receiver}: ${phase}`],
  driver: async ({ phase, receiver }, observe) => {
    const controller = new AbortController(), client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
    let reads = 0, loads = 0, outcome = 'resolved';
    if (phase === 'before request') controller.abort();
    await withOracleCleanup(async () => {
      try {
        if (receiver === 'conditional') {
          const read = conditionalReadFetch('https://cancel.test/api', async () => {
            reads++;
            if (phase === 'after headers') controller.abort();
            const response = Response.json({ all: 1, drafts: 0, changes: 0, public: 1, withdrawn: 0 });
            const clone = response.clone.bind(response);
            response.clone = () => {
              const copy = clone(), text = copy.text.bind(copy);
              copy.text = async () => { const body = await text(); loads++; if (phase === 'after body') controller.abort(); return body; };
              return copy;
            };
            return response;
          });
          await read('https://cancel.test/api/items/summary', { signal: controller.signal });
        } else {
          await readCursorWindow({ queryClient: client, queryKey: ['cancel', phase], window: { offset: 0, limit: 2 }, signal: controller.signal, revalidate: true,
            read: async cursor => {
              reads++;
              if (!cursor) {
                if (phase === 'after headers') controller.abort();
                return { items: ['first'], page: { limit: 1, nextCursor: 'next' } };
              }
              loads++; if (phase === 'after body') controller.abort();
              return { items: ['second'], page: { limit: 1, nextCursor: null } };
            },
          });
        }
      } catch (error) { outcome = error instanceof Error ? error.name : String(error); }
      observe('cancellation stages', { reads, loads, outcome });
    }, [async () => { client.clear(); }]);
  },
  check: (_history, trace, expected) => {
    for (const [index, entry] of trace.entries()) { const bad = differs(entry.checkpoint, 'abort stages', [entry.value], index === 0 ? [expected] : []); if (bad) return bad; }
    return differs('cancellation stages', 'abort stages', trace.length, 1) ?? pass;
  },
  calibrations: [{ name: 'body starts after header abort', law: 'abort stages', history: { constructed: 'conditional: after headers' }, corrupt: trace => trace.map(entry => ({ ...entry, value: { ...(entry.value as object), loads: 1 } })) }],
});
