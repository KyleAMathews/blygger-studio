// Idempotency-Key for POST /api/items and publish (clipper spec §9). One claim
// row per (principal, key). Every claim writes a fresh attempt token, so a
// stale attempt can never pass a guard again, even after a delete and
// re-claim. Work commits only through `claimGuard`, and `completeClaim` is the
// last statement in the same batch.
import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { workingCopyGuard, type Guard, type PublishGuard, type WorkingCopy } from "./model.ts";
import { contentHash } from "./util.ts";

export type RunClaim = { kind: "run"; principal: string; key: string; attempt: string; fingerprint: string };
export type SettledClaim =
  | { kind: "replay"; status: number; body: string; location: string | null }
  | { kind: "busy" }
  | { kind: "mismatch" };
export type Claim = RunClaim | SettledClaim;

const RETENTION_MS = 24 * 3600 * 1000;
const STALE_MS = 60 * 1000;
export const INVALID_KEY = "Idempotency-Key must be 1-255 printable ASCII characters";

/** `null` when absent, `false` when present but malformed. */
export function keyFrom(header: string | undefined): string | null | false {
  if (header === undefined) return null;
  return /^[\x21-\x7e]{1,255}$/.test(header) ? header : false;
}

export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().filter((k) => record[k] !== undefined).map((k) => `${JSON.stringify(k)}:${canonicalJson(record[k])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function fingerprintOf(method: string, path: string, body: unknown): Promise<string> {
  return contentHash(`${method} ${path} ${canonicalJson(body ?? {})}`);
}

export async function claim(db: D1Database, principal: string, key: string, fingerprint: string, now = Date.now()): Promise<Claim> {
  await db.prepare("DELETE FROM idempotency_keys WHERE created <= ?").bind(now - RETENTION_MS).run();
  const attempt = crypto.randomUUID();
  // A fresh insert, or a reclaim of a stale pending claim for the same
  // request. Anything else leaves the row alone and returns no row.
  const won = await db.prepare(
    `INSERT INTO idempotency_keys (principal, key, fingerprint, attempt, state, claimed_at, created)
     VALUES (?, ?, ?, ?, 'pending', ?, ?)
     ON CONFLICT (principal, key) DO UPDATE SET attempt = excluded.attempt, claimed_at = excluded.claimed_at
     WHERE idempotency_keys.state = 'pending' AND idempotency_keys.claimed_at <= ? AND idempotency_keys.fingerprint = excluded.fingerprint
     RETURNING attempt`,
  ).bind(principal, key, fingerprint, attempt, now, now, now - STALE_MS).first<{ attempt: string }>();
  if (won?.attempt === attempt) return { kind: "run", principal, key, attempt, fingerprint };
  return current(db, principal, key, fingerprint);
}

export async function current(db: D1Database, principal: string, key: string, fingerprint: string): Promise<SettledClaim> {
  const row = await db.prepare("SELECT fingerprint, state, status, body, location FROM idempotency_keys WHERE principal = ? AND key = ?")
    .bind(principal, key).first<{ fingerprint: string; state: string; status: number | null; body: string | null; location: string | null }>();
  if (!row) return { kind: "busy" };
  if (row.fingerprint !== fingerprint) return { kind: "mismatch" };
  if (row.state === "done") return { kind: "replay", status: row.status!, body: row.body!, location: row.location };
  return { kind: "busy" };
}

export function claimGuard(c: RunClaim): Guard {
  return { sql: "EXISTS (SELECT 1 FROM idempotency_keys WHERE principal = ? AND key = ? AND attempt = ? AND state = 'pending')", binds: [c.principal, c.key, c.attempt] };
}

export function completeClaim(db: D1Database, c: RunClaim, r: { status: number; body: string; location: string | null }, where: Guard[] = []): D1PreparedStatement {
  return db.prepare("UPDATE idempotency_keys SET state = 'done', status = ?, body = ?, location = ? WHERE principal = ? AND key = ? AND attempt = ? AND state = 'pending'" + where.map((w) => ` AND ${w.sql}`).join(""))
    .bind(r.status, r.body, r.location, c.principal, c.key, c.attempt, ...where.flatMap((w) => w.binds));
}

/** A publish's replay record, which commits only if the version insert in the same batch did. */
export function publishCompletion(db: D1Database, c: RunClaim, itemId: string, version: number, extra: Guard[] = []): D1PreparedStatement {
  return completeClaim(db, c, { status: 200, body: JSON.stringify({ ok: true, version }), location: null }, [{ sql: "EXISTS (SELECT 1 FROM versions WHERE item_id = ? AND version = ?)", binds: [itemId, version] }, ...extra]);
}

/** The guards for a keyed publish: the work and its replay record both require the frozen working copy, so a concurrent edit commits neither. */
export function keyedPublishGuard(db: D1Database, state: RunClaim, item: { id: string; version: number }, expected: WorkingCopy | null): PublishGuard {
  const working = expected ? [workingCopyGuard(item.id, expected)] : [];
  return { where: [...working, claimGuard(state)], also: [publishCompletion(db, state, item.id, item.version + 1, working)] };
}

/** Frees a claim this attempt still holds. A completed claim is never touched. */
export async function releaseClaim(db: D1Database, c: RunClaim): Promise<void> {
  await db.prepare("DELETE FROM idempotency_keys WHERE principal = ? AND key = ? AND attempt = ? AND state = 'pending'")
    .bind(c.principal, c.key, c.attempt).run();
}

/** The response for a claim that did not run. `body` overrides a replay's stored body. */
export function settledResponse(c: Context, key: string, state: SettledClaim, body?: string): Response {
  c.header("Idempotency-Key", key);
  if (state.kind === "replay") {
    c.header("Idempotent-Replayed", "true");
    if (state.location) c.header("Location", state.location);
    return c.body(body ?? state.body, state.status as ContentfulStatusCode, { "Content-Type": "application/json" });
  }
  if (state.kind === "busy") {
    c.header("Retry-After", "1");
    return c.json({ error: "operation in progress" }, 409);
  }
  return c.json({ error: "Idempotency-Key was used with a different request" }, 422);
}
