import { SELF } from "cloudflare:test";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { BlyggerApi, createBlyggerClient, unwrap } from "../sdk/dist/browser.js";
import { BASE, login } from "./helpers.ts";
import { atCheckpoint, campaign } from "./oracle-campaign.ts";

/* Authority: model.ts's documented forward-only restore and permanent pins,
 * docs/api.md, and crud/restore-version acceptance tests. Plain nonempty text
 * only; no TK, transclusions, forks, deletion, or concurrent writers are claimed.
 * Model: working text + status + immutable snapshots + pinned version numbers.
 * Grammar: choose an action legal in the current model, retaining repeated pins
 * and restore-after-withdraw. Driver: named SDK methods against the real Worker.
 * Checkpoint: after each awaited action, compare owner and public observations.
 * The expected side imports no production model, schema, or projector.
 */
type Snapshot = { content: string; pinned: boolean; kind: "fragment" | "thread" | "withdrawn" };
type Model = { content: string; status: "draft" | "public" | "withdrawn"; dirty: boolean; kind: "fragment" | "thread"; versions: Snapshot[] };
type Action = { op: "edit" | "publish" | "withdraw" | "restore" | "pin"; value?: string; version?: number };
function step(model: Model, action: Action) {
  if (action.op === "edit") { model.content = action.value!; model.dirty = true; }
  if (action.op === "publish") { model.versions.push({ content: model.content, pinned: false, kind: model.kind }); model.status = "public"; model.dirty = false; }
  if (action.op === "withdraw") { model.versions.push({ content: "", pinned: false, kind: "withdrawn" }); model.status = "withdrawn"; model.dirty = true; }
  if (action.op === "restore") { model.content = model.versions[action.version! - 1].content; model.dirty = true; }
  if (action.op === "pin") model.versions[action.version! - 1].pinned = true;
}
const instruction = fc.record({ choice: fc.nat(30), version: fc.nat(30), text: fc.integer({ min: 0, max: 999 }) });
const histories = fc.record({ kind: fc.constantFrom("fragment" as const, "thread" as const), instructions: fc.array(instruction, { minLength: 1, maxLength: 10 }) });

async function run(kind: Model["kind"], actions?: Action[], instructions?: { choice: number; version: number; text: number }[]) {
  const client = createBlyggerClient({ baseUrl: BASE, headers: { cookie: await login() }, fetch: (input, init) => SELF.fetch(input instanceof Request ? input : new Request(input, init)) });
  const created = await unwrap(BlyggerApi.createItem({ client, body: { kind, content_md: "initial" } }));
  const id = created.id, model: Model = { content: "initial", status: "draft", dirty: true, kind, versions: [] };
  const pinnedSnapshots = new Map<number, string>();
  async function compare() {
    const owner = await unwrap(BlyggerApi.getItem({ client, path: { id } }));
    atCheckpoint("lifecycle owner working copy", () => expect({ content: owner.content_md, status: owner.status, dirty: owner.dirty, version: owner.version, kind: owner.authored_kind }).toEqual({ content: model.content, status: model.status, dirty: model.dirty, version: model.versions.length, kind }));
    atCheckpoint("lifecycle immutable history", () => expect(owner.versions.map(v => ({ content: v.content_md, pinned: v.pinned, kind: v.kind }))).toEqual(model.versions));
    const current = await SELF.fetch(`${BASE}/blyg/items/${id}.json`);
    atCheckpoint("lifecycle public visibility", () => expect(current.status).toBe(model.versions.length ? 200 : 404));
    if (model.versions.length) {
      const latest = model.versions.at(-1)!;
      const body = await current.json();
      atCheckpoint("lifecycle public current version", () => expect(body).toMatchObject({ version: model.versions.length, kind: latest.kind, content_md: latest.content }));
    }
    for (const [i, snapshot] of model.versions.entries()) {
      const pinned = await SELF.fetch(`${BASE}/blyg/items/${id}/v${i + 1}.json`);
      atCheckpoint("lifecycle pin visibility", () => expect(pinned.status, `pin ${i + 1}`).toBe(snapshot.pinned ? 200 : 404));
      if (snapshot.pinned) {
        const bytes = await pinned.text(), body = JSON.parse(bytes);
        atCheckpoint("lifecycle pinned content", () => expect(body).toMatchObject({ version: i + 1, content_md: snapshot.content, kind: snapshot.kind }));
        if (!pinnedSnapshots.has(i + 1)) pinnedSnapshots.set(i + 1, bytes);
        // Keep the first response, never overwrite it with a later observation.
        // This relation protects the entire wire snapshot as well as modeled text.
        atCheckpoint("lifecycle immutable pinned bytes", () => expect(bytes).toBe(pinnedSnapshots.get(i + 1)));
      }
    }
  }
  await compare();
  const queue = actions ?? instructions!.map(() => null);
  for (const [index, supplied] of queue.entries()) {
    const restorable = model.versions.flatMap((v, i) => v.content ? [i + 1] : []);
    const legal: Action["op"][] = ["edit", "publish", ...(model.status === "public" ? ["withdraw" as const] : []), ...(restorable.length ? ["restore" as const, "pin" as const] : [])];
    const token = instructions?.[index];
    const action = supplied ?? { op: legal[token!.choice % legal.length], value: `text ${token!.text}`, version: restorable[token!.version % restorable.length] };
    if (!legal.includes(action.op)) throw new Error("Illegal lifecycle history");
    if (action.op === "edit") await unwrap(BlyggerApi.updateItem({ client, path: { id }, body: { content_md: action.value } }));
    if (action.op === "publish") await unwrap(BlyggerApi.publishItem({ client, path: { id } }));
    if (action.op === "withdraw") await unwrap(BlyggerApi.withdrawItem({ client, path: { id } }));
    if (action.op === "restore") await unwrap(BlyggerApi.restoreItem({ client, path: { id }, body: { version: action.version! } }));
    if (action.op === "pin") {
      const result = await unwrap(BlyggerApi.pinItem({ client, path: { id, version: action.version! } }));
      expect(result.already).toBe(model.versions[action.version! - 1].pinned);
    }
    step(model, action);
    await compare();
  }
}
describe("item lifecycle oracle", () => {
  it.each(["fragment", "thread"] as const)("preserves a pinned history through restore and withdrawal: %s", async kind => {
    await run(kind, [{ op: "publish" }, { op: "pin", version: 1 }, { op: "pin", version: 1 }, { op: "edit", value: "second" }, { op: "publish" }, { op: "withdraw" }, { op: "restore", version: 1 }, { op: "publish" }]);
  });
  it("rejects a rewound version and a changed pinned snapshot in its checker", () => {
    const model: Model = { content: "one", status: "draft", dirty: true, kind: "thread", versions: [] };
    step(model, { op: "publish" }); step(model, { op: "pin", version: 1 }); step(model, { op: "withdraw" }); step(model, { op: "restore", version: 1 }); step(model, { op: "publish" });
    expect(() => expect(model.versions).toEqual([{ content: "one", pinned: true, kind: "thread" }])).toThrow();
    expect(() => expect([{ ...model.versions[0], content: "changed" }, ...model.versions.slice(1)]).toEqual(model.versions)).toThrow();
  });
  campaign("item-lifecycle", histories, ({ kind, instructions }) => run(kind, undefined, instructions));
});
