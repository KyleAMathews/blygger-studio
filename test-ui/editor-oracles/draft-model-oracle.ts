/** Save snapshots discharge input edits; no production counters or imports. */
import fc from 'fast-check';
import { unit, type Sample } from './document-oracle.ts';
export const draftArbitrary = fc.record({ initial: fc.string({ unit, maxLength: 32 }), events: fc.array(fc.record({
  kind: fc.constantFrom('edit' as const, 'save' as const, 'resolve' as const, 'reject' as const, 'inspect' as const),
  text: fc.string({ unit, maxLength: 32 }), slot: fc.nat(12),
}), { maxLength: 16 }) });
export type DraftHistory = Sample<typeof draftArbitrary>;
export function draftPlan(h: DraftHistory) {
  const pending: number[] = []; let next = 0;
  const actions = h.events.map(event => {
    if (event.kind === 'save') { const slot = next++; pending.push(slot); return { ...event, slot }; }
    if (event.kind === 'resolve' || event.kind === 'reject') {
      if (!pending.length) return { ...event, kind: 'inspect' as const };
      return { ...event, slot: pending.splice(event.slot % pending.length, 1)[0]! };
    }
    return event;
  });
  return { initial: h.initial, actions };
}
export function draftModel(p: ReturnType<typeof draftPlan>) {
  const unacknowledged = new Set<number>();
  let text = p.initial, stamp = -1;
  const submissions = new Map<number, { stamp: number; edits: number[] }>();
  const writes: { slot: number; text: string }[] = [], settled: { slot: number; result: boolean | 'rejected' }[] = [];
  return [{ text, dirty: false, writes: [], settled: [] }, ...p.actions.map((action, index) => {
    if (action.kind === 'edit') { text = action.text; stamp = index; unacknowledged.add(index); }
    else if (action.kind === 'save') {
      writes.push({ slot: action.slot, text }); submissions.set(action.slot, { stamp, edits: [...unacknowledged] });
    } else if (action.kind === 'resolve' || action.kind === 'reject') {
      const submitted = submissions.get(action.slot)!;
      if (action.kind === 'resolve') for (const edit of submitted.edits) unacknowledged.delete(edit);
      settled.push({ slot: action.slot, result: action.kind === 'reject' ? 'rejected' : stamp === submitted.stamp });
      submissions.delete(action.slot);
    }
    return { text, dirty: unacknowledged.size > 0, writes: writes.map(w => ({ ...w })), settled: settled.map(s => ({ ...s })) };
  })];
}
const event = (kind: DraftHistory['events'][number]['kind'], text = '', slot = 0) => ({ kind, text, slot });
export const draftCases: Record<string, DraftHistory> = {
  clean: { initial: 'x', events: [] },
  inspected: { initial: 'x', events: [event('inspect'), event('resolve'), event('reject')] },
  initialSave: { initial: 'x', events: [event('save'), event('resolve')] },
  sameTextDirty: { initial: 'x', events: [event('edit', 'x')] },
  saved: { initial: 'x', events: [event('edit', 'y'), event('save'), event('resolve')] },
  pendingEdit: { initial: 'x', events: [event('save'), event('edit', 'y'), event('resolve')] },
  rejected: { initial: 'x', events: [event('edit', 'y'), event('save'), event('reject')] },
  retried: { initial: 'x', events: [event('edit', 'y'), event('save'), event('reject'), event('save'), event('resolve')] },
  newerFirst: { initial: 'x', events: [event('edit', 'y'), event('save'), event('edit', 'z'), event('save'), event('resolve', '', 1), event('resolve')] },
  olderFirst: { initial: 'x', events: [event('edit', 'y'), event('save'), event('edit', 'z'), event('save'), event('resolve'), event('resolve')] },
  repeatedSave: { initial: '', events: [event('edit', ''), event('save'), event('save'), event('resolve', '', 1), event('resolve')] },
};
export function draftStates(p: ReturnType<typeof draftPlan>) {
  let text = p.initial, stamp = -1, latestAck = -1, rejected = false;
  const pending = new Map<number, number>();
  const reached = new Set(['initial']);
  for (const [index, action] of p.actions.entries()) {
    reached.add(action.kind);
    if (action.kind === 'edit') {
      if (action.text === text) reached.add('sameTextEdit');
      if (pending.size) reached.add('editWhileSavePending');
      text = action.text; stamp = index;
    } else if (action.kind === 'save') {
      if (stamp === -1) reached.add('cleanSave');
      if (pending.size) reached.add('overlappingSaves');
      if ([...pending.values()].includes(stamp)) reached.add('sameSnapshotSaves');
      if (rejected) reached.add('retryAfterRejection');
      pending.set(action.slot, stamp);
    } else if (action.kind === 'resolve' || action.kind === 'reject') {
      const submitted = pending.get(action.slot)!;
      if (action.kind === 'resolve') {
        reached.add(submitted === stamp ? 'currentAcknowledgement' : 'staleAcknowledgement');
        if ([...pending.values()].some(other => other < submitted)) reached.add('newerAcknowledgementFirst');
        if ([...pending.values()].some(other => other > submitted)) reached.add('olderAcknowledgementFirst');
        if (submitted < latestAck) reached.add('olderAcknowledgementAfterNewer');
        latestAck = Math.max(latestAck, submitted);
      } else rejected = true;
      pending.delete(action.slot);
    }
  }
  return [...reached];
}
