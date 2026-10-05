import type { Env } from './types.ts';

/** Positive operator limits; invalid/zero configuration never disables a guard. */
export function securityLimit(value: string | undefined, fallback: number) {
  return value && /^\d+$/.test(value) && Number.isSafeInteger(Number(value)) && Number(value) > 0 ? Number(value) : fallback;
}
/** One SQL statement owns admission across isolates; live authority is never cached. */
export async function admit(db: D1Database, key: string, limit: number, windowSeconds: number) {
  const window = Math.floor(Date.now() / 1000 / windowSeconds) * windowSeconds;
  const row = await db.prepare(`INSERT INTO security_budgets(key, window, used) VALUES (?, ?, 1)
    ON CONFLICT(key) DO UPDATE SET window=excluded.window,
      used=CASE WHEN security_budgets.window <> excluded.window THEN 1 ELSE security_budgets.used + 1 END
    WHERE security_budgets.window <> excluded.window OR security_budgets.used < ? RETURNING used`)
    .bind(key, window, limit).first();
  return row !== null;
}
export async function admitApi(env: Env, read: boolean) {
  return admit(env.DB, read ? 'api-read' : 'api-write', securityLimit(read ? env.API_READ_LIMIT : env.API_WRITE_LIMIT, read ? 1200 : 120), 60);
}
export async function reserveClient(env: Env) {
  const id = crypto.randomUUID(), now = Math.floor(Date.now() / 1000);
  await env.DB.prepare('DELETE FROM security_registrations WHERE expires <= ?').bind(now).run();
  // Count persisted clients and live reservations in the same atomic statement.
  // Failed registration releases its slot; crash reservations expire in five minutes.
  const row = await env.DB.prepare(`INSERT INTO security_registrations(id, expires)
    SELECT ?, ? WHERE (SELECT COUNT(*) FROM oauthClient) +
      (SELECT COUNT(*) FROM security_registrations WHERE expires > ?) < ? RETURNING id`)
    .bind(id, now + 300, now, securityLimit(env.OAUTH_CLIENT_LIMIT, 100)).first();
  return row ? id : null;
}
export async function releaseClient(env: Env, id: string) {
  await env.DB.prepare('DELETE FROM security_registrations WHERE id=?').bind(id).run();
}
