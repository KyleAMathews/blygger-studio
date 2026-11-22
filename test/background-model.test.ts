// Background 4b (blygger-spec docs/background-plan.md §3.3): other blygs'
// changes judged by the change classifier, opt-in. What matters: nothing is
// queued or called with the setting off or no classifier; a version the
// measured rules settle is never sent; the two texts go to the decision model
// and the author's note does not; a typo or minor label sends the entry to
// Background with the minor chip, and major leaves it; a newer version
// replaces a waiting one; over the AI budget the measured rules stand and the
// detail says so.
import { env } from "cloudflare:test";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { drainImportedChanges } from "../src/background-model.ts";
import { putSettings } from "../src/model.ts";
import { admitAi } from "../src/security-budgets.ts";
import { applyEffect, createSubscription } from "../src/importer/store.ts";
import { transition, type LocalState } from "../src/importer/transition.ts";
import type { Env } from "../src/types.ts";
import { newId } from "../src/util.ts";
import { itemDocBody } from "./importer/fixtures.ts";
import { apiJson, login } from "./helpers.ts";

const db = () => env.DB;
const CLEF = "@cf/cloudflare/clef-flash";
const ORIGIN = "https://judged.example/blyg/";
beforeEach(async () => {
  await db().prepare("DELETE FROM security_budgets").run();
  await db().prepare("DELETE FROM imported_change_queue").run();
});
afterEach(() => putSettings(db(), { bg_model_imported: "off", ai_model_classify: "", bg_instruction: "", bg_flag_disagreement: "on" }));

function fakeAi(choice: string, note?: string) {
  const calls: { model: string; input: any }[] = [];
  const answer = (c: string) => ({ type: "choice", choice: c, probabilities: { [c]: 0.9 }, confidence: 0.9 });
  const ai = { run: async (model: string, input: unknown) => {
    calls.push({ model, input });
    return { model: "clef-flash", answers: { change: answer(choice), ...(note ? { note: answer(note) } : {}) } };
  } } as unknown as Ai;
  return { ai, calls };
}
const withAi = (ai: Ai, extra: Partial<Env> = {}) => ({ ...env, AI: ai, ...extra }) as Env;

const subscription = async () => (await createSubscription(db(), { kind: "blyg", origin: ORIGIN, feedUrl: `${ORIGIN}feed.xml`, title: "Judged source" })).id;
async function arrive(sub: string, id: string, version: number, md: string, note?: string) {
  const at = new Date().toISOString();
  const doc = JSON.parse(await itemDocBody({ id, kind: "fragment", version, content_md: md, created: at, updated: at, origin: ORIGIN }));
  if (note) doc.changelog = [{ version, at, note }];
  const held = await db().prepare("SELECT version FROM imported_items WHERE subscription_id = ? AND remote_id = ?").bind(sub, id).first<{ version: number }>();
  const local: LocalState = held ? { status: "current", version: held.version } : { status: "absent" };
  await applyEffect(db(), sub, id, transition({ local, doc }).effect, at);
}
const queued = async () => (await db().prepare("SELECT remote_id, version, prior_version, prior_md, next_md FROM imported_change_queue").all<{ remote_id: string; version: number; prior_version: number; prior_md: string; next_md: string }>()).results;
type Entry = { key: string; background: { reasons: string[]; detail?: Record<string, any> } };
async function entry(cookie: string, sub: string, id: string, background: boolean): Promise<Entry | undefined> {
  const res = await apiJson(cookie, "GET", `/blyg/api/reading?limit=50&sub=${sub}${background ? "&background=true" : ""}`);
  return (res.json.items as Entry[]).find((e) => e.key === `imported:${JSON.stringify([sub, id])}`);
}

const V1 = "Stigmergy is coordination through traces.";
const V2 = "Stigmergy is coordination through traces left in a shared medium, as termites build.";
const LONG = "Coordination through traces left in a shared medium, read by whoever passes next, is the whole of the idea here and the rest is commentary on it. ".repeat(4).trim();

describe("Background 4b: the classifier on imported changes", () => {
  it("queues nothing with the setting off, or with no classifier chosen", async () => {
    const sub = await subscription();
    const id = newId();
    await arrive(sub, id, 1, V1);
    await arrive(sub, id, 2, V2);
    await putSettings(db(), { bg_model_imported: "on" });
    await arrive(sub, id, 3, `${V2} And more.`);
    expect(await queued()).toEqual([]);
  });

  it("sends the two texts and never the note; minor goes to Background with its chip, major stays", async () => {
    const cookie = await login();
    await putSettings(db(), { bg_model_imported: "on", ai_model_classify: CLEF });
    const sub = await subscription();
    const [small, big] = [newId(), newId()];
    await arrive(sub, small, 1, V1);
    await arrive(sub, small, 2, V2, "The author says this is only a typo.");
    await arrive(sub, big, 1, V1);
    await arrive(sub, big, 2, `${V2} A new argument.`);
    expect((await queued()).map((q) => [q.remote_id, q.version, q.prior_version, q.prior_md])).toEqual(expect.arrayContaining([[small, 2, 1, V1], [big, 2, 1, V1]]));

    const minor = fakeAi("minor");
    expect(await drainImportedChanges(withAi(minor.ai), 1)).toBe(1);
    const sent = JSON.stringify(minor.calls[0]!.input);
    expect(sent).toContain("Stigmergy is coordination through traces.");
    expect(sent).toContain("as termites build");
    expect(sent).not.toContain("only a typo");
    expect(Object.keys(minor.calls[0]!.input.questions)).toEqual(["change"]);
    const major = fakeAi("major");
    expect(await drainImportedChanges(withAi(major.ai))).toBe(1);
    expect(await queued()).toEqual([]);

    // Which item each fake judged follows the queue's order; read the outcome from the entries.
    const judged = [await entry(cookie, sub, small, true), await entry(cookie, sub, big, true)];
    const inBackground = judged.filter(Boolean) as Entry[];
    expect(inBackground).toHaveLength(1);
    expect(inBackground[0]!.background.reasons).toContain("minor");
    expect(inBackground[0]!.background.detail?.classify).toMatchObject({ by: CLEF, category: "minor" });
  });

  it("does not queue what the measured rules settle, and a newer version replaces a waiting one", async () => {
    await putSettings(db(), { bg_model_imported: "on", ai_model_classify: CLEF });
    const sub = await subscription();
    const id = newId();
    await arrive(sub, id, 1, LONG);
    await arrive(sub, id, 2, LONG.replace("whole", "heart"));
    expect(await queued()).toEqual([]);
    await arrive(sub, id, 3, `${LONG}\n\nA new paragraph.`);
    await arrive(sub, id, 4, `${LONG}\n\nA newer paragraph, rewritten.`);
    expect((await queued()).map((q) => [q.version, q.prior_version])).toEqual([[4, 3]]);
  });

  it("over the AI budget, the measured rules stand and the detail says so", async () => {
    const cookie = await login();
    await putSettings(db(), { bg_model_imported: "on", ai_model_classify: CLEF });
    const sub = await subscription();
    const id = newId();
    await arrive(sub, id, 1, V1);
    await arrive(sub, id, 2, V2);
    const { ai, calls } = fakeAi("minor");
    const spent = withAi(ai, { AI_DAILY_CALL_LIMIT: "1" } as Partial<Env>);
    expect(await admitAi(spent)).toBe(true);
    expect(await drainImportedChanges(spent)).toBe(0);
    expect(calls).toHaveLength(0);
    expect(await entry(cookie, sub, id, true)).toBeUndefined();
    expect((await entry(cookie, sub, id, false))!.background.detail?.classify).toMatchObject({ error: "over the daily AI budget" });
  });

  it("under a routing instruction, reads the note: a small claim against a large change stays in view, marked", async () => {
    const cookie = await login();
    await putSettings(db(), { bg_model_imported: "on", ai_model_classify: CLEF, bg_instruction: "Trust notes that say typo." });
    const sub = await subscription();
    const id = newId();
    await arrive(sub, id, 1, V1);
    await arrive(sub, id, 2, `${V2} A whole new argument follows here.`, "Just a typo.");
    const { ai, calls } = fakeAi("minor", "typo");
    expect(await drainImportedChanges(withAi(ai))).toBe(1);
    const sent = JSON.stringify(calls[0]!.input);
    expect(sent).toContain("Just a typo.");
    expect(sent).toContain("Trust notes that say typo.");
    expect(Object.keys(calls[0]!.input.questions)).toEqual(["change", "note"]);
    // The owner's instruction comes first, delimited, before any fetched text (Fable's review, §14).
    const state = calls[0]!.input.state as string;
    expect(state.indexOf("Trust notes that say typo.")).toBeLessThan(state.indexOf("Stigmergy"));
    expect(state.indexOf("END READER INSTRUCTION")).toBeLessThan(state.indexOf("Just a typo."));
    expect(await entry(cookie, sub, id, true)).toBeUndefined();
    const shown = (await entry(cookie, sub, id, false))!;
    expect(shown.background.reasons).not.toContain("minor");
    expect(shown.background.detail?.classify).toMatchObject({ category: "minor", instructed: true, disagree: { note: "typo" } });
    expect(shown.background.detail?.classify.disagree.changed).toBeGreaterThan(10);
  });

  it("with the disagreement default turned off, the label decides even when the note understates the change", async () => {
    const cookie = await login();
    await putSettings(db(), { bg_model_imported: "on", ai_model_classify: CLEF, bg_instruction: "Trust notes that say typo.", bg_flag_disagreement: "off" });
    const sub = await subscription();
    const id = newId();
    await arrive(sub, id, 1, V1);
    await arrive(sub, id, 2, `${V2} A whole new argument follows here.`, "Just a typo.");
    const { ai } = fakeAi("minor", "typo");
    expect(await drainImportedChanges(withAi(ai))).toBe(1);
    const back = (await entry(cookie, sub, id, true))!;
    expect(back.background.reasons).toContain("minor");
    expect(back.background.detail?.classify.disagree).toBeUndefined();
  });

  it("under a routing instruction, an agreeing small change goes to Background, marked as yours", async () => {
    const cookie = await login();
    await putSettings(db(), { bg_model_imported: "on", ai_model_classify: CLEF, bg_instruction: "Trust notes that say typo." });
    const sub = await subscription();
    const id = newId();
    await arrive(sub, id, 1, LONG);
    // About 5 %: past near-same's 2 %, inside the 10 % a note's claim is allowed.
    await arrive(sub, id, 2, LONG.replace("the whole of the idea here", "all there is to this idea, really, truly"), "Typo fix.");
    expect(await queued()).toHaveLength(1);
    const { ai } = fakeAi("typo", "typo");
    expect(await drainImportedChanges(withAi(ai))).toBe(1);
    const back = (await entry(cookie, sub, id, true))!;
    expect(back.background.reasons).toContain("minor");
    expect(back.background.detail?.classify).toMatchObject({ category: "typo", instructed: true });
    expect(back.background.detail?.classify.disagree).toBeUndefined();
  });

  it("keeps the instruction through Settings, at most 500 characters", async () => {
    const cookie = await login();
    expect((await apiJson(cookie, "PATCH", "/blyg/api/settings", { bgInstruction: "x".repeat(501) })).status).toBe(400);
    expect((await apiJson(cookie, "PATCH", "/blyg/api/settings", { bgInstruction: "Trust typo notes.", bgModelImported: true })).status).toBe(200);
    expect((await apiJson(cookie, "GET", "/blyg/api/settings")).json).toMatchObject({ bgInstruction: "Trust typo notes.", bgModelImported: true });
  });

  it("turned off, the queue is emptied without a call", async () => {
    await putSettings(db(), { bg_model_imported: "on", ai_model_classify: CLEF });
    const sub = await subscription();
    const id = newId();
    await arrive(sub, id, 1, V1);
    await arrive(sub, id, 2, V2);
    expect(await queued()).toHaveLength(1);
    await putSettings(db(), { bg_model_imported: "off" });
    const { ai, calls } = fakeAi("minor");
    expect(await drainImportedChanges(withAi(ai))).toBe(0);
    expect(calls).toHaveLength(0);
    expect(await queued()).toEqual([]);
  });
});
