/** The save model has only three durable facts: the newest editor text, the
 * acknowledged revision, and stored text/version. A failed delivery does not
 * acknowledge a revision, even when the controlled transport committed it.
 * These are the established save laws in docs/testing.md, not SDK algorithms.
 */
export type Kind = 'fragment' | 'thread';
export type SavePlan = {
  kind: Kind;
  trigger: 'manual' | 'autosave' | 'publish';
  delivery: 'rejected' | 'lost' | 'held' | 'acknowledged';
  status?: number;
  text: string;
  newer?: string;
  publishDuringHold?: boolean;
  rejectPublication?: boolean;
};
export type SaveObservation = Record<string, string | number | boolean | string[]>;
export type SaveExpected = { phase: string; fields: SaveObservation; error?: 'network' | 'conflict' | 'publication' };

// The finite grammar retains every original fragment/thread schedule. It holds
// controlled inputs and delivery conditions, never expected observations.
export const savePlans: readonly SavePlan[] = (['fragment', 'thread'] as const).flatMap((kind): SavePlan[] => [
  ...[400, 401, 500, 503].map(status => ({ kind, trigger: 'manual' as const, delivery: 'rejected' as const, status, text: 'unsaved text' })),
  { kind, trigger: 'manual', delivery: 'lost', text: 'committed but unacknowledged' },
  { kind, trigger: 'publish', delivery: 'rejected', status: 503, text: 'must not lose this' },
  { kind, trigger: 'autosave', delivery: 'rejected', status: 503, text: 'failed autosave' },
  { kind, trigger: 'publish', delivery: 'acknowledged', text: 'saved but unpublished', rejectPublication: true },
  { kind, trigger: 'manual', delivery: 'held', text: 'older', newer: 'newer' },
  { kind, trigger: 'autosave', delivery: 'held', text: 'older', newer: 'newer' },
  { kind, trigger: 'autosave', delivery: 'held', text: 'typed while saving', publishDuringHold: true },
]);
export function savePlanName(plan: SavePlan) {
  if (plan.delivery === 'rejected') return plan.trigger === 'manual'
    ? `${plan.kind} keeps text after save ${plan.status} and can recover`
    : plan.trigger === 'publish' ? `${plan.kind} never publishes after a failed save`
      : `${plan.kind} retains a failed autosave and recovers on the next save`;
  if (plan.delivery === 'lost') return `${plan.kind} retains text when a committed save loses its response`;
  if (plan.rejectPublication) return `${plan.kind} keeps the editor after publication fails following a successful save`;
  if (plan.publishDuringHold) return `${plan.kind} autosave in flight leaves publish usable, and publish waits for it`;
  return plan.trigger === 'manual' ? `${plan.kind} does not reload over edits entered while manual save is pending`
    : `${plan.kind} serializes an older pending autosave before the next edit`;
}

// Each branch is a controlled delivery condition, not a case-name lookup.
// Acknowledgment advances accepted revision; commit alone advances stored
// revision. Publication requires acknowledgment of the newest editor text.
export function saveModel(plan: SavePlan): SaveExpected[] {
  const trace: SaveExpected[] = [
    { phase: 'owner editor ready', fields: { composerVisible: true, creationStatus: 201, editor: 'persisted' } },
  ];
  if (plan.delivery === 'rejected') {
    trace.push({ phase: 'rejected save settled', fields: { editor: plan.text, content: 'persisted', ...(plan.trigger === 'publish' ? { publishCalls: 0, version: 0 } : {}) } });
    if (plan.trigger !== 'publish') trace.push({ phase: 'recovery acknowledged', fields: { editor: plan.text, content: plan.text, saveState: 'saved' } });
  } else if (plan.delivery === 'lost') {
    trace.push({ phase: 'save committed before response loss', fields: { committedStatus: 200 } });
    trace.push({ phase: 'response loss settled', fields: { editor: plan.text, patchCalls: 1, content: plan.text, revisionDelta: 1 }, error: 'network' });
    trace.push({ phase: 'unacknowledged retry rejected', fields: { status: 409, requestRevisionDelta: 0, conflictCode: 'revision-conflict', conflictRevisionDelta: 0, saveStateCount: 0, editor: plan.text, storageUnchanged: true }, error: 'conflict' });
  } else if (plan.rejectPublication) {
    trace.push({ phase: 'publication rejection settled', fields: { editor: plan.text, content: plan.text, version: 0 }, error: 'publication' });
    trace.push({ phase: 'publication recovery acknowledged', fields: { historyCount: 1 } });
  } else if (plan.delivery === 'held') {
    if (plan.publishDuringHold) {
      trace.push({ phase: 'autosave held', fields: { publishEnabled: true, saveEnabled: true } });
      trace.push({ phase: 'publication acknowledged after save', fields: { content: plan.text, version: 1 } });
    } else {
      if (plan.trigger === 'autosave') trace.push({ phase: 'new edit while autosave held', fields: { fetchCalls: 1 } });
      if (plan.trigger === 'manual') trace.push({ phase: 'older acknowledgment received', fields: { editor: plan.newer! } });
      trace.push({ phase: 'newest save acknowledged', fields: { content: plan.newer!, ...(plan.trigger === 'autosave' ? { bodies: [plan.text, plan.newer!] } : {}) } });
    }
  }
  return trace;
}
