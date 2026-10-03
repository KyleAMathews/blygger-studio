import { SELF, env } from "cloudflare:test";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { BlyggerApi, createBlyggerClient, unwrap } from "../sdk/dist/browser.js";
import { BASE, login } from "./helpers.ts";
import { atCheckpoint, campaign } from "./oracle-campaign.ts";

/* Authority: docs/api.md's collection envelopes and read-api.ts's established
 * order: signals newest first, then subscription and remote ID. Static dataset
 * during a walk; offset paging does not promise a snapshot across concurrent
 * writes. Independent reference sorts fixture records, never production SQL.
 * Grammar: 0..25 records, repeated timestamps, 1..10 page width, empty and
 * beyond-end offsets. Driver: real generated SDK, actual Worker/D1.
 * Checkpoint: every page, then the complete ordered walk. No set/map is used
 * to normalize observations: duplicates and order errors must remain visible.
 */
type Row = { subscription_id: string; remote_id: string; thumb: number; at: string };
const compare = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
const expectedRows = (rows: Row[]) => [...rows].sort((a, b) => compare(b.at, a.at) || compare(a.subscription_id, b.subscription_id) || compare(a.remote_id, b.remote_id));
const inputs = fc.record({ times: fc.array(fc.integer({ min: 0, max: 2 }), { maxLength: 25 }), width: fc.integer({ min: 1, max: 10 }) });
async function walk(times: number[], width: number) {
  // Each generated history owns this table. Delete only fixture state, not
  // returned rows: the provider must never supply paging progress for us.
  await env.DB.prepare("DELETE FROM signals").run();
  const rows = times.map((time, i) => ({ subscription_id: `s${i % 3}`, remote_id: `r${String(i).padStart(3, "0")}`, thumb: i % 2 ? 1 : -1, at: `2026-10-01T00:00:0${time}Z` }));
  if (rows.length) await env.DB.batch(rows.map(r => env.DB.prepare("INSERT INTO signals (subscription_id, remote_id, thumb, at) VALUES (?, ?, ?, ?)").bind(r.subscription_id, r.remote_id, r.thumb, r.at)));
  const client = createBlyggerClient({ baseUrl: BASE, headers: { cookie: await login() }, fetch: (input, init) => SELF.fetch(input instanceof Request ? input : new Request(input, init)) });
  const reference = expectedRows(rows), observed: Row[] = [];
  for (let offset = 0; offset <= rows.length + width; offset += width) {
    const page = await unwrap(BlyggerApi.listSignals({ client, query: { offset, limit: width } }));
    atCheckpoint("pagination page values and order", () => expect(page).toEqual({ items: reference.slice(offset, offset + width), offset, limit: width, total: rows.length }));
    observed.push(...page.items);
  }
  atCheckpoint("pagination complete walk", () => expect(observed).toEqual(reference));
}
describe("pagination oracle", () => {
  it("rejects duplicate, omitted, reordered, and stale rows", () => {
    const rows: Row[] = [0, 1, 2].map(i => ({ subscription_id: "s", remote_id: `r${i}`, thumb: 1, at: "same" }));
    for (const wrong of [[rows[0], rows[0], rows[2]], rows.slice(1), [...rows].reverse(), [{ ...rows[0], thumb: -1 }, ...rows.slice(1)]]) {
      expect(() => expect(wrong).toEqual(expectedRows(rows))).toThrow();
    }
  });
  it("walks ties over more than two pages and reaches exhaustion", () => walk(Array(11).fill(1), 3));
  it("handles an empty collection", () => walk([], 1));
  campaign("pagination", inputs, ({ times, width }) => walk(times, width));
});
