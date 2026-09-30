import { studioItem, studioVersion, studioMedia, studioSubscription, studioHopper, studioImported, studioMention } from "./studio-resources.ts";
import type { Context } from "hono";
import { BlyggerApi, unwrap, BlyggerApiError, createBlyggerClient, type BlyggerClient } from "../sdk/dist/browser.js";
import { ownerApi } from "./owner-api.ts";
import type { Env, ItemRow } from "./types.ts";

/** Request-local SDK transport. Calls the same authenticated API without a network round trip. */
export class StudioData {
  readonly client: BlyggerClient;
  private items = new Map<string, Promise<import("../sdk/dist/browser.js").GetItemResponse>>();
  private reads = new Map<string, Promise<unknown>>();
  read<T>(key: string, load: () => Promise<T>): Promise<T> {
    let value = this.reads.get(key);
    if (!value) { value = load(); this.reads.set(key, value); }
    return value as Promise<T>;
  }
  constructor(c: Context<{ Bindings: Env }>) {
    this.client = createBlyggerClient({ baseUrl: new URL(c.req.url).origin, headers: { cookie: c.req.header("cookie") ?? "" }, fetch: async (input, init) => {
      const request = input instanceof Request ? input : new Request(input, init);
      const url = new URL(request.url);
      url.pathname = url.pathname.replace(/^\/api(?=\/|$)/, "");
      return ownerApi.fetch(new Request(url, request), c.env, c.executionCtx);
    } });
  }
  detail(id: string) {
    let value = this.items.get(id);
    if (!value) { value = unwrap(BlyggerApi.getItem({ client: this.client, path: { id } })); this.items.set(id, value); }
    return value;
  }
}

export const studioData = (c: Context<{ Bindings: Env }>) => new StudioData(c);
export async function getItem(data: StudioData, id: string) {
  try { return studioItem(await data.detail(id)); } catch (e) { if (e instanceof BlyggerApiError && e.statusCode === 404) return null; throw e; }
}
export async function listAll(data: StudioData) {
  const rows: ItemRow[] = [];
  for (let offset = 0; ; offset += 100) {
    const page = await unwrap(BlyggerApi.listItems({ client: data.client, query: { offset, limit: 100 } })); rows.push(...page.items.map(studioItem));
    if (offset + page.items.length >= page.total || !page.items.length) return rows;
  }
}
export const getSettings = (data: StudioData) => data.read("settings", () => unwrap(BlyggerApi.getSettings({ client: data.client })));
export const getSettingsMap = (data: StudioData) => data.read("update-state", () => unwrap(BlyggerApi.getUpdateState({ client: data.client })));
export const authoredKind = async (data: StudioData, item: ItemRow) => (await data.detail(item.id)).authored_kind;
export const publishedVersion = async (data: StudioData, item: ItemRow) => { const value = (await data.detail(item.id)).published; return value ? studioVersion(value) : null; };
export const listVersions = async (data: StudioData, id: string) => (await data.detail(id)).versions.map(studioVersion);
export const listMediaForItem = async (data: StudioData, id: string) => (await data.detail(id)).media.map(studioMedia);
async function allPages<T>(load: (offset: number) => Promise<{ items: T[]; total: number }>) {
  const rows: T[] = [];
  for (let offset = 0; ; offset += 100) {
    const page = await load(offset); rows.push(...page.items);
    if (offset + page.items.length >= page.total || !page.items.length) return rows;
  }
}
export const listSubscriptions = (data: StudioData) => data.read("subscriptions", async () => (await allPages((offset) => unwrap(BlyggerApi.listSubscriptions({ client: data.client, query: { offset, limit: 100 } })))).map(studioSubscription));
export const listHoppers = (data: StudioData) => data.read("hoppers", async () => (await allPages((offset) => unwrap(BlyggerApi.listHoppers({ client: data.client, query: { offset, limit: 100 } })))).map(studioHopper));
const hopperDetail = (data: StudioData, id: string) => data.read(`hopper:${id}`, () => unwrap(BlyggerApi.getHopper({ client: data.client, path: { id } })));
export const hopperSummary = (data: StudioData, id: string) => data.read(`hopper-summary:${id}`, async () => {
  const summary = await unwrap(BlyggerApi.getHopper({ client: data.client, path: { id }, query: { preview: "true" } }));
  return { ...summary, items: summary.items.map(studioImported) };
});
export async function getHopper(data: StudioData, id: string) {
  try { return studioHopper((await hopperDetail(data, id)).hopper); } catch (e) { if (e instanceof BlyggerApiError && e.statusCode === 404) return null; throw e; }
}
export const hopperItemBodies = async (data: StudioData, id: string) => new Map((await hopperDetail(data, id)).items.map(studioImported).map((row) => [JSON.stringify([row.subscription_id, row.remote_id]), row]));
export const listHopperItems = async (data: StudioData, id: string) => (await hopperDetail(data, id)).memberships;
export async function getImportedItem(data: StudioData, sub: string, id: string) {
  try { return studioImported(await unwrap(BlyggerApi.getImportedItem({ client: data.client, path: { sub, id } }))); } catch (e) { if (e instanceof BlyggerApiError && e.statusCode === 404) return null; throw e; }
}
export const getSignal = async (data: StudioData, sub: string, id: string) => (await data.read("signals", () => allPages((offset) => unwrap(BlyggerApi.listSignals({ client: data.client, query: { offset, limit: 100 } }))))).find((s) => s.subscription_id === sub && s.remote_id === id) ?? null;
const mentions = (data: StudioData, direction: "inbound" | "outbound") => data.read(`mentions:${direction}`, () => allPages((offset) => unwrap(BlyggerApi.listMentions({ client: data.client, query: { offset, limit: 100, direction } }))));
export const listVerifiedInbound = async (data: StudioData) => (await mentions(data, "inbound")).filter((row) => "hidden" in row).map(studioMention);
export const listOutbound = async (data: StudioData) => (await mentions(data, "outbound")).filter((row) => "next_attempt_at" in row);
