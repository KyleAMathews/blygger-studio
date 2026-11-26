export type Provenance = { sources: unknown[]; model: string } | null;
export type Snapshot = { content: string; source: string; provenance: Provenance[]; pinned: boolean; kind: "fragment" | "thread" | "withdrawn" };
export type Model = { revision: number; content: string; provenance: Provenance[]; status: "draft" | "public" | "withdrawn"; dirty: boolean; kind: "fragment" | "thread"; versions: Snapshot[] };
export type Action = { op: "edit" | "publish" | "withdraw" | "restore" | "pin"; value?: string; version?: number; generate?: string };
// History is append-only. Publication and withdrawal add snapshots; restore never
// rewinds the counter. Working copy content and public status remain separate because an
// edit or restore can leave the latest published snapshot unchanged.
// Pinned flags affect visibility, not snapshot content. Retaining both facts lets
// later public reads distinguish a restored draft from rewritten history.
// A snapshot keeps two texts: what was published, where an `impyrt` scope stands
// as its bare output (tk-core-plan.md: marker-free content_md on the wire), and the working copy as published, its
// source. Discarding changes (restoring the current version) gives the source back
// and leaves the copy clean; restoring an older version gives its published text,
// unpublished (Decision by Venkat Rao (GitHub vgururao), 2026-11-25: studio#184).
// A generated scope's provenance cache travels with the source: an edit that
// names none keeps the cache it had, generation records the scope's model, and
// restoring an older version, whose text has no scopes, clears it.
const SCOPE = /\[TK\](?:impyrt=([\s\S]*?)|[\s\S]*?\[=\]([\s\S]*?))\[\/TK\]/g;
export const published = (text: string) => text.replace(SCOPE, (_m, imported: string | undefined, output: string | undefined) => imported ?? output ?? "");
export const FIXTURE_MODEL = "lifecycle-fixture-model";
export function step(model: Model, action: Action) {
  if (action.op !== "pin" || !model.versions[action.version! - 1].pinned) model.revision++;
  if (action.op === "edit") {
    model.content = action.value!; model.dirty = true;
    // Generation is a second write: the scope's output and its provenance.
    if (action.generate !== undefined) { model.revision++; model.content = model.content.replace("[/TK]", `[=]${action.generate}[/TK]`); model.provenance = [{ sources: [], model: FIXTURE_MODEL }]; }
  }
  if (action.op === "publish") { model.versions.push({ content: published(model.content), source: model.content, provenance: [...model.provenance], pinned: false, kind: model.kind }); model.status = "public"; model.dirty = false; }
  if (action.op === "withdraw") { model.versions.push({ content: "", source: "", provenance: [], pinned: false, kind: "withdrawn" }); model.status = "withdrawn"; model.dirty = true; }
  if (action.op === "restore") {
    const discard = action.version === model.versions.length, target = model.versions[action.version! - 1];
    model.content = discard ? target.source : target.content;
    model.provenance = discard ? [...target.provenance] : [];
    model.dirty = !discard;
  }
  if (action.op === "pin") model.versions[action.version! - 1].pinned = true;
}

export type Plan = { kind: Model['kind']; actions: Action[] };
export const initial = (kind: Model['kind']): Model => ({ revision: 1, content: 'initial', provenance: [], status: 'draft', dirty: true, kind, versions: [] });
export type Instruction = { choice: number; version: number; text: number; scope?: 'impyrt' | 'generated' };
/** An edit's text: empty, plain, the same words disclosed as pasted model text, or a scope a model writes them into. */
const editText = (token: Instruction) => token.text % 4 === 0 ? '' : token.scope === 'impyrt' ? `[TK]impyrt=text ${token.text}[/TK]` : token.scope === 'generated' ? `[TK]write text ${token.text}[/TK]` : `text ${token.text}`;
export function resolveInstructions({ kind, instructions }: { kind: Model['kind']; instructions: Instruction[] }): Plan {
  const state = initial(kind), actions: Action[] = [];
  for (const token of instructions) {
    const restorable = state.versions.flatMap((v, i) => v.kind !== 'withdrawn' ? [i + 1] : []);
    const legal: Action['op'][] = ['edit', 'publish', ...(state.status === 'public' ? ['withdraw' as const] : []), ...(restorable.length ? ['restore' as const, 'pin' as const] : [])];
    const value = editText(token);
    const action: Action = { op: legal[token.choice % legal.length], value, version: restorable[token.version % restorable.length], ...(value.startsWith('[TK]write') ? { generate: `text ${token.text}` } : {}) };
    actions.push(action); step(state, action);
  }
  return { kind, actions };
}
export function reference({ kind, actions }: Plan) {
  const state = initial(kind), trace: { checkpoint: string; value: unknown }[] = [];
  const snapshot = () => {
    trace.push({ checkpoint: 'lifecycle private revision', value: state.revision },
      { checkpoint: 'lifecycle owner working copy', value: { content: state.content, provenance: state.provenance, status: state.status, dirty: state.dirty, version: state.versions.length, kind } },
      { checkpoint: 'lifecycle immutable history', value: state.versions.map(v => ({ content: v.content, pinned: v.pinned, kind: v.kind })) },
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
