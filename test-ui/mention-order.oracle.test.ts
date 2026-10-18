/**
 * Contract: the mentions API orders verified_at DESC, last_seen DESC, id ASC
 * (src/read-api.ts). Studio must preserve that recency when grouping receipts,
 * even though an unordered live query enumerates rows by their random keys.
 * A target's newest receipt determines its group's position.
 * Model: repeatedly choose the highest independent numeric rank, then group.
 * Grammar: two mandatory receipts with IDs opposite their recency (the live
 * defect), plus 0–12 unique IDs, five targets, null or 0–9 verification ranks,
 * 0–9 last-seen ranks, hidden/gone rows, and reversed transport order.
 * Removing crossed IDs loses the reported defect; removing repeated targets
 * loses within-group order; ties/nulls/flags distinguish API tie and retention
 * rules. Duplicate receipt IDs are invalid and excluded. Empty input also runs.
 * Driver: real QueryClient, Query Collection and createLiveQueryCollection,
 * followed by mentionGroups, which MentionsPage calls. No simulated DB sort.
 * Checkpoint: the complete group-key and receipt-ID sequences, including gone
 * and hidden rows, plus unchanged input. No browser rendering/poll timing claim.
 * Shared campaign runs eight inputs with fixed/random seeds and direct replay.
 * Calibration: verify-oracle-mutations.ts removes the presentation sort and
 * requires the same display checkpoint during failure capture and replay.
 * ORC-001–005/009: authority, independent ranks, grammar, driver and complete
 * observations are above. ORC-006/007: production mutation and direct replay.
 * ORC-008: stateless recomputation; no reference lifecycle state. ORC-010:
 * shared cleanup releases both collections and the client, preserving failure.
 * ORC-011: no named shared semantic fault needs a second formulation.
 * ORC-012/013: this executable record covers the stated boundary; crossed
 * IDs, equal ranks and null verification distinguish weaker ordering rules.
 * ORC-014: the real collection receives transport arrays, matching the local
 * reproduction with 16 live receipts. No claim about production HTTP or D1.
 */
import fc from 'fast-check';
import { expect } from 'vitest';
import { QueryClient } from '@tanstack/query-core';
import { createCollection, createLiveQueryCollection } from '@tanstack/react-db';
import { queryCollectionOptions } from '@tanstack/query-db-collection';
import { mentionGroups } from '../src/ui/mention-order.ts';
import { atCheckpoint, campaign } from '../test/oracle-campaign.ts';
import { withOracleCleanup } from '../test/oracle-cleanup.ts';

const receipt = fc.record({
  key: fc.integer({ min: 1, max: 98 }), target: fc.integer({ min: 0, max: 4 }),
  verified: fc.option(fc.integer({ min: 0, max: 9 }), { nil: null }),
  seen: fc.integer({ min: 0, max: 9 }), hidden: fc.boolean(),
  status: fc.constantFrom('verified' as const, 'gone' as const),
});
type Fact = { key: number; target: number; verified: number | null; seen: number; hidden: boolean; status: 'verified' | 'gone' };
const input = fc.record({ rows: fc.uniqueArray(receipt, { selector: row => row.key, maxLength: 12 }), reverse: fc.boolean() });
const id = (key: number) => `r${String(key).padStart(2, '0')}`;
const date = (rank: number) => new Date(Date.UTC(2026, 9, 1 + rank)).toISOString();

// Numeric ranks precede wire timestamps. Choose the next maximum rather than
// importing or repeating the UI's timestamp comparator.
function reference(facts: Fact[]) {
  const pending = [...facts];
  const groups = new Map<string, string[]>();
  while (pending.length) {
    const highest = Math.max(...pending.map(row => row.verified ?? -1));
    const sameVerification = pending.filter(row => (row.verified ?? -1) === highest);
    const latest = Math.max(...sameVerification.map(row => row.seen));
    const key = Math.min(...sameVerification.filter(row => row.seen === latest).map(row => row.key));
    const index = pending.findIndex(row => row.key === key);
    const [next] = pending.splice(index, 1), target = String(next.target);
    groups.set(target, [...(groups.get(target) ?? []), id(next.key)]);
  }
  return [...groups];
}

campaign('mention-order', input, async ({ rows, reverse }) => {
  const facts: Fact[] = [
    { key: 0, target: 0, verified: 0, seen: 0, hidden: false, status: 'verified' },
    ...rows,
    { key: 99, target: 1, verified: 10, seen: 10, hidden: false, status: 'verified' },
  ];
  for (const snapshot of [[], reverse ? [...facts].reverse() : facts]) {
    const wire = snapshot.map(row => ({ id: id(row.key), target_item_id: String(row.target),
      verified_at: row.verified === null ? null : date(row.verified), last_seen: date(row.seen), hidden: row.hidden, status: row.status }));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const source = createCollection(queryCollectionOptions({ queryKey: ['mention-order'], queryClient: client,
      getKey: row => row.id, queryFn: async () => wire }));
    const view = createLiveQueryCollection(q => q.from({ mention: source }));
    await withOracleCleanup(async () => {
      await view.preload();
      const incoming = view.toArray, before = [...incoming];
      const actual = [...mentionGroups(incoming)].map(([target, receipts]) => [target, receipts.map(row => row.id)]);
      atCheckpoint('mention display order', () => expect(actual).toEqual(reference(snapshot)));
      atCheckpoint('mention input preservation', () => expect(incoming).toEqual(before));
    }, [() => view.cleanup(), () => source.cleanup(), async () => { client.clear(); }]);
  }
});
