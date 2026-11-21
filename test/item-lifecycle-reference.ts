export type Snapshot = { content: string; pinned: boolean; kind: "fragment" | "thread" | "withdrawn" };
export type Model = { revision: number; content: string; status: "draft" | "public" | "withdrawn"; dirty: boolean; kind: "fragment" | "thread"; versions: Snapshot[] };
export type Action = { op: "edit" | "publish" | "withdraw" | "restore" | "pin"; value?: string; version?: number };
// History is append-only. Publication and withdrawal add snapshots; restore never
// rewinds the counter. Working copy content and public status remain separate because an
// edit or restore can leave the latest published snapshot unchanged.
// Pinned flags affect visibility, not snapshot content. Retaining both facts lets
// later public reads distinguish a restored draft from rewritten history.
export function step(model: Model, action: Action) {
  if (action.op !== "pin" || !model.versions[action.version! - 1].pinned) model.revision++;
  if (action.op === "edit") { model.content = action.value!; model.dirty = true; }
  if (action.op === "publish") { model.versions.push({ content: model.content, pinned: false, kind: model.kind }); model.status = "public"; model.dirty = false; }
  if (action.op === "withdraw") { model.versions.push({ content: "", pinned: false, kind: "withdrawn" }); model.status = "withdrawn"; model.dirty = true; }
  if (action.op === "restore") { model.content = model.versions[action.version! - 1].content; model.dirty = action.version !== model.versions.length; }
  if (action.op === "pin") model.versions[action.version! - 1].pinned = true;
}

export type Plan = { kind: Model['kind']; actions: Action[] };
export const initial = (kind: Model['kind']): Model => ({ revision: 1, content: 'initial', status: 'draft', dirty: true, kind, versions: [] });
export function resolveInstructions({ kind, instructions }: { kind: Model['kind']; instructions: { choice: number; version: number; text: number }[] }): Plan {
  const state = initial(kind), actions: Action[] = [];
  for (const token of instructions) {
    const restorable = state.versions.flatMap((v, i) => v.kind !== 'withdrawn' ? [i + 1] : []);
    const legal: Action['op'][] = ['edit', 'publish', ...(state.status === 'public' ? ['withdraw' as const] : []), ...(restorable.length ? ['restore' as const, 'pin' as const] : [])];
    const action: Action = { op: legal[token.choice % legal.length], value: token.text % 4 === 0 ? '' : `text ${token.text}`, version: restorable[token.version % restorable.length] };
    actions.push(action); step(state, action);
  }
  return { kind, actions };
}
export function reference({ kind, actions }: Plan) {
  const state = initial(kind), trace: { checkpoint: string; value: unknown }[] = [];
  const snapshot = () => {
    trace.push({ checkpoint: 'lifecycle private revision', value: state.revision },
      { checkpoint: 'lifecycle owner working copy', value: { content: state.content, status: state.status, dirty: state.dirty, version: state.versions.length, kind } },
      { checkpoint: 'lifecycle immutable history', value: state.versions.map(v => ({ ...v })) },
      { checkpoint: 'lifecycle public visibility', value: state.versions.length ? 200 : 404 });
    const latest = state.versions.at(-1);
    if (latest) trace.push({ checkpoint: 'lifecycle public current version', value: { version: state.versions.length, kind: latest.kind, content: latest.content } });
    state.versions.forEach((v, i) => {
      trace.push({ checkpoint: 'lifecycle pin visibility', value: { version: i + 1, status: v.pinned ? 200 : 404 } });
      if (v.pinned) trace.push({ checkpoint: 'lifecycle pinned content', value: { version: i + 1, content: v.content, kind: v.kind } }, { checkpoint: 'lifecycle immutable pinned bytes', value: true });
    });
  };
  snapshot();
  for (const action of actions) {
    if (action.op === 'pin') trace.push({ checkpoint: 'lifecycle pin idempotence', value: state.versions[action.version! - 1].pinned });
    step(state, action); snapshot();
  }
  return trace;
}
