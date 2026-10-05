# Clipper Plan 1: Server Idempotency-Key and Publish Precondition

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `POST /api/items` and `POST /api/items/{id}/publish` safe to retry with an `Idempotency-Key` header, let publish refuse when the working copy changed, and advertise both so cross-origin clients can use them.

**Architecture:** A new `src/idempotency.ts` owns claim rows in a new D1 table (migration 0023). A claim gets a fresh random attempt token. The work's writes and the replay record commit in one D1 batch, each guarded by `EXISTS` on the live attempt, so a stale attempt commits nothing. Publish gains an optional `expected` working copy that guards the same batch. CORS and the protected resource metadata advertise both features.

**Tech Stack:** Cloudflare Workers, D1 (SQLite), Hono + `@hono/zod-openapi`, vitest with `@cloudflare/vitest-pool-workers`.

**Spec:** `docs/superpowers/specs/2026-10-05-chrome-clipper-design.md` (§9; laws L2a, L2c, L3 in §7.1). This is Plan 1 of 3. Plan 2 refactors the Studio for reuse; Plan 3 builds the extension.

## Global Constraints

- Header name `Idempotency-Key`; value 1–255 printable ASCII characters (`0x21`–`0x7E`), checked before any work; anything else is 400.
- Keys are scoped per principal: the grant id for a bearer token (`workPrincipal(c.env)` from `src/security-budgets.ts`), `"owner"` for the cookie.
- Fingerprint: SHA-256 of method, path and canonical JSON body (keys sorted, `undefined` dropped).
- Same key + same fingerprint + done → replay with `Idempotent-Replayed: true`; + pending → 409 `{ "error": "operation in progress" }` with `Retry-After: 1`; different fingerprint → 422.
- Pending claims older than 60 seconds may be reclaimed with a fresh UUID attempt token; rows are deleted 24 hours after creation.
- Work and replay record commit in one D1 batch; every work statement carries the attempt guard; the completion statement is last in the batch.
- Publish `expected: { content_md, stub_of }` compares against the working copy, and the same values guard the batch. A mismatch is 409 `{ "error": "changed" }`. Without `expected`, publish is unchanged (the Studio path).
- Claim before precondition: a retry whose first attempt already published replays, even if the owner edited since.
- CORS on `/api`: allow `Authorization, Content-Type, Idempotency-Key`; expose `WWW-Authenticate, Location, Idempotency-Key, Idempotent-Replayed, Retry-After`.
- Resource metadata for `api` only: `"idempotency_key_operations": ["createItem", "publishItem"]`, `"publish_preconditions": ["expected"]`.
- Migration file: `migrations/0023_idempotency_keys.sql`.
- Narrowing of the spec, recorded here: keys apply to **blank** creates only. A key on a `fork` or `response` create is refused with 400, because those modes fetch and compose before inserting and are not used by the clipper.
- Node is `/usr/local/bin/node`. Run vitest as `PATH=/usr/local/bin:$PATH node node_modules/.bin/vitest run <file>` (bare `npx` fails here under asdf). The repo uses npm (`npm install --legacy-peer-deps`).
- New test file approved: `test/clipper-oauth.test.ts`. Do not create other test files.

## Review Focus

1. **Retry after success, then a Studio edit.** A publish whose first attempt committed and whose response was lost, retried after the owner edited, must replay `200`, not answer `409 changed`. Test in Task 4.
2. **Same body, different key order.** `{kind, content_md}` and `{content_md, kind}` under one key must replay, not 422. Test in Task 3.
3. **Equivalent `expected.stub_of` in a different key order** must match the stored stub, because both pass through `parseStubOf`. Test in Task 4.
4. **The Studio's own publish** (cookie, no key, no `expected`) must behave exactly as before. Test in Task 4.
5. **Malformed keys** (empty, containing a space, 256 characters, non-ASCII) must be 400 with nothing created, never 500. Test in Task 3.

---

## Before Task 1

The `chrome-clipper` worktree has no `node_modules`. Install once, then confirm the suite is green before changing anything:

```bash
cd /Users/kylemathews/programs/blygger-studio/.worktrees/chrome-clipper
PATH=/usr/local/bin:$PATH npm install --legacy-peer-deps
PATH=/usr/local/bin:$PATH npm run build
PATH=/usr/local/bin:$PATH node node_modules/.bin/vitest run --maxWorkers=2
```

Expected: every test file passes (1,252 tests at the branch point).

## File Structure

| File | Responsibility |
|---|---|
| `migrations/0023_idempotency_keys.sql` (create) | The claim and replay table |
| `src/idempotency.ts` (create) | Key parsing, fingerprint, claim/current/complete/release, guard SQL, replay responses |
| `src/model.ts` (modify) | `Guard` type; `draftInsert` (batchable create); `publish()` accepts a `PublishGuard`; working-copy helpers |
| `src/api.ts` (modify) | Create and publish handlers use keys and the precondition |
| `src/contract/routes.ts` (modify) | `Idempotency-Key` header on both routes; `expected` in the publish body |
| `src/index.ts` (modify) | CORS allow and expose lists |
| `src/oauth-routes.ts` (modify) | Resource metadata advertises both features |
| `test/clipper-oauth.test.ts` (create) | All server oracles for this plan |
| `scripts/verify-auth-security-mutations.ts` (modify) | Mutation controls for the new defenses |
| `docs/api.md`, `CHANGELOG.md` (modify) | Contract docs |
| `openapi.json`, `sdk/generated/*` (regenerated) | Contract drift |

---

### Task 1: Claim store (`src/idempotency.ts` and migration 0023)

**Files:**
- Create: `migrations/0023_idempotency_keys.sql`
- Create: `src/idempotency.ts`
- Modify: `src/model.ts` (add the `Guard` interface near the top, after the imports)
- Test: `test/clipper-oauth.test.ts` (create)

**Interfaces:**
- Consumes: `contentHash(text): Promise<string>` from `src/util.ts`.
- Produces (used by Tasks 3–5):
  - `interface Guard { sql: string; binds: unknown[] }` (exported from `src/model.ts`)
  - `type RunClaim = { kind: "run"; principal: string; key: string; attempt: string; fingerprint: string }`
  - `type SettledClaim = { kind: "replay"; status: number; body: string; location: string | null } | { kind: "busy" } | { kind: "mismatch" }`
  - `type Claim = RunClaim | SettledClaim`
  - `keyFrom(header: string | undefined): string | null | false` (`null` = absent, `false` = invalid)
  - `canonicalJson(value: unknown): string`
  - `fingerprintOf(method: string, path: string, body: unknown): Promise<string>`
  - `claim(db: D1Database, principal: string, key: string, fingerprint: string, now?: number): Promise<Claim>`
  - `current(db: D1Database, principal: string, key: string, fingerprint: string): Promise<SettledClaim>`
  - `claimGuard(c: RunClaim): Guard`
  - `completeClaim(db: D1Database, c: RunClaim, r: { status: number; body: string; location: string | null }): D1PreparedStatement`
  - `releaseClaim(db: D1Database, c: RunClaim): Promise<void>`
  - `INVALID_KEY: string`

- [ ] **Step 1: Write the migration**

`migrations/0023_idempotency_keys.sql`:

```sql
-- Idempotency-Key claims and replay records for POST /api/items and
-- POST /api/items/{id}/publish (clipper, spec §9). This is the client's own
-- /api contract (decision #31), not the protocol. Times are integer
-- milliseconds since the epoch; `attempt` is a fresh UUID per claim.
CREATE TABLE idempotency_keys (
  principal TEXT NOT NULL,
  key TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  attempt TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('pending', 'done')),
  claimed_at INTEGER NOT NULL,
  created INTEGER NOT NULL,
  status INTEGER,
  body TEXT,
  location TEXT,
  PRIMARY KEY (principal, key)
);
CREATE INDEX idempotency_keys_created ON idempotency_keys(created);
```

- [ ] **Step 2: Add the `Guard` type to `src/model.ts`**

Directly after the import block in `src/model.ts`:

```ts
/** An SQL condition ANDed into a write's WHERE clause, with its bind values. */
export interface Guard { sql: string; binds: unknown[] }
```

- [ ] **Step 3: Write the failing module tests**

Create `test/clipper-oauth.test.ts`:

```ts
/**
 * Clipper server oracles (spec docs/superpowers/specs/2026-10-05-chrome-clipper-design.md).
 *
 * Laws:
 * - L2a At most once: under any fault schedule, a save operation yields at
 *   most one item and a publish operation at most one new version. Source:
 *   spec §9; IETF draft-ietf-httpapi-idempotency-key-header.
 * - L2c Frozen publish: a publish makes public exactly the frozen working
 *   copy, or nothing. Source: spec §5.2, §9.
 * Model: one claim row per (principal, key); a fresh attempt token per
 * claim; only the live attempt's guarded writes commit. Expectations are
 * stated here, not computed by production helpers.
 * Driver: production modules against the real D1 binding, and the real Worker
 * through test/oauth-flow-driver.ts for HTTP laws.
 * Limits: one Worker instance; a crash between statements is modelled by a
 * stale attempt, since D1 commits a batch atomically.
 */
import { env } from 'cloudflare:test';
import { beforeEach, describe, expect, it } from 'vitest';
import { claim, claimGuard, completeClaim, releaseClaim, keyFrom, canonicalJson } from '../src/idempotency.ts';

beforeEach(async () => {
  await env.DB.prepare('DELETE FROM idempotency_keys').run();
  await env.DB.prepare('DELETE FROM security_budgets').run();
});

const T = 1_800_000_000_000;
const live = async (sql: string, binds: unknown[]) => (await env.DB.prepare(`SELECT 1 AS ok WHERE ${sql}`).bind(...binds).first()) !== null;

describe('claim store', () => {
  it('a fresh key runs once; the same request is busy while pending', async () => {
    const a = await claim(env.DB, 'grant-a', 'k1', 'fp', T);
    expect(a.kind).toBe('run');
    expect((await claim(env.DB, 'grant-a', 'k1', 'fp', T + 1000)).kind, 'a pending claim is not run twice').toBe('busy');
  });

  it('a completed claim replays its stored response', async () => {
    const a = await claim(env.DB, 'grant-a', 'k1', 'fp', T);
    if (a.kind !== 'run') throw new Error('fixture');
    await env.DB.batch([completeClaim(env.DB, a, { status: 201, body: '{"id":"x"}', location: '/api/items/x' })]);
    expect(await claim(env.DB, 'grant-a', 'k1', 'fp', T + 1000)).toEqual({ kind: 'replay', status: 201, body: '{"id":"x"}', location: '/api/items/x' });
  });

  it('a different request under the same key is a mismatch', async () => {
    await claim(env.DB, 'grant-a', 'k1', 'fp-1', T);
    expect((await claim(env.DB, 'grant-a', 'k1', 'fp-2', T + 1000)).kind).toBe('mismatch');
  });

  it('keys are per principal', async () => {
    expect((await claim(env.DB, 'grant-a', 'k1', 'fp', T)).kind).toBe('run');
    expect((await claim(env.DB, 'owner', 'k1', 'fp', T)).kind, 'another principal gets its own key space').toBe('run');
  });

  it('a stale pending claim is reclaimed with a new token, and the old token commits nothing', async () => {
    const a = await claim(env.DB, 'grant-a', 'k1', 'fp', T);
    const b = await claim(env.DB, 'grant-a', 'k1', 'fp', T + 61_000);
    if (a.kind !== 'run' || b.kind !== 'run') throw new Error('both must run: a first, b after the 60 s stale bound');
    expect(b.attempt).not.toBe(a.attempt);
    const [stale] = await env.DB.batch([completeClaim(env.DB, a, { status: 201, body: '{}', location: null })]);
    expect(stale.meta.changes, 'a dead attempt commits nothing').toBe(0);
    expect(await live(claimGuard(a).sql, claimGuard(a).binds), 'the work guard refuses the dead attempt').toBe(false);
    expect(await live(claimGuard(b).sql, claimGuard(b).binds), 'the work guard admits the live attempt').toBe(true);
  });

  it('reclaim, fail and reinsert never revives the first token', async () => {
    const a = await claim(env.DB, 'grant-a', 'k1', 'fp', T);
    const b = await claim(env.DB, 'grant-a', 'k1', 'fp', T + 61_000);
    if (a.kind !== 'run' || b.kind !== 'run') throw new Error('fixture');
    await releaseClaim(env.DB, b);
    const c = await claim(env.DB, 'grant-a', 'k1', 'fp', T + 62_000);
    if (c.kind !== 'run') throw new Error('a released key is claimable again');
    const [stale] = await env.DB.batch([completeClaim(env.DB, a, { status: 201, body: '{}', location: null })]);
    expect(stale.meta.changes, 'a dead attempt commits nothing').toBe(0);
    const [winner] = await env.DB.batch([completeClaim(env.DB, c, { status: 201, body: '{}', location: null })]);
    expect(winner.meta.changes).toBe(1);
  });

  it('release removes only a pending claim held by the same attempt', async () => {
    const a = await claim(env.DB, 'grant-a', 'k1', 'fp', T);
    if (a.kind !== 'run') throw new Error('fixture');
    await env.DB.batch([completeClaim(env.DB, a, { status: 200, body: '{}', location: null })]);
    await releaseClaim(env.DB, a);
    expect((await claim(env.DB, 'grant-a', 'k1', 'fp', T + 1000)).kind, 'a finished claim survives release').toBe('replay');
  });

  it('keys expire 24 hours after creation', async () => {
    const a = await claim(env.DB, 'grant-a', 'k1', 'fp', T);
    if (a.kind !== 'run') throw new Error('fixture');
    await env.DB.batch([completeClaim(env.DB, a, { status: 201, body: '{}', location: null })]);
    expect((await claim(env.DB, 'grant-a', 'k1', 'fp', T + 24 * 3600_000 + 1)).kind, 'an expired key runs as new').toBe('run');
  });

  it('accepts printable ASCII keys of 1 to 255 characters only', () => {
    expect(keyFrom(undefined)).toBeNull();
    for (const ok of ['a', 'clip-1:create', '!'.repeat(255)]) expect(keyFrom(ok)).toBe(ok);
    for (const bad of ['', 'has space', 'x'.repeat(256), 'ü', 'tab\tkey']) expect(keyFrom(bad), JSON.stringify(bad)).toBe(false);
  });

  it('canonical JSON sorts keys and drops undefined', () => {
    expect(canonicalJson({ b: 1, a: { d: [2, { z: 1, y: undefined }], c: null } })).toBe('{"a":{"c":null,"d":[2,{"z":1}]},"b":1}');
  });
});
```

- [ ] **Step 4: Run it to see it fail**

Run: `PATH=/usr/local/bin:$PATH node node_modules/.bin/vitest run test/clipper-oauth.test.ts`
Expected: FAIL, `Failed to load url ../src/idempotency.ts` (module missing).

- [ ] **Step 5: Implement `src/idempotency.ts`**

```ts
// Idempotency-Key for POST /api/items and publish (clipper spec §9). One claim
// row per (principal, key). Every claim writes a fresh attempt token, so a
// stale attempt can never pass a guard again, even after a delete and
// re-claim. Work commits only through `claimGuard`, and `completeClaim` is the
// last statement in the same batch.
import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { Guard } from "./model.ts";
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

export function completeClaim(db: D1Database, c: RunClaim, r: { status: number; body: string; location: string | null }): D1PreparedStatement {
  return db.prepare("UPDATE idempotency_keys SET state = 'done', status = ?, body = ?, location = ? WHERE principal = ? AND key = ? AND attempt = ? AND state = 'pending'")
    .bind(r.status, r.body, r.location, c.principal, c.key, c.attempt);
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
```

- [ ] **Step 6: Run the tests**

Run: `PATH=/usr/local/bin:$PATH node node_modules/.bin/vitest run test/clipper-oauth.test.ts`
Expected: PASS, 10 tests.

- [ ] **Step 7: Type-check and commit**

```bash
PATH=/usr/local/bin:$PATH node node_modules/.bin/tsc --noEmit -p .
git add migrations/0023_idempotency_keys.sql src/idempotency.ts src/model.ts test/clipper-oauth.test.ts
git commit -m "Add Idempotency-Key claim store (migration 0023)"
```

---

### Task 2: Contract, CORS and advertised support

**Files:**
- Modify: `src/contract/routes.ts` (the `publishItem` route at line 59, and after the `routes` object)
- Modify: `src/index.ts:60-68` (CORS middleware)
- Modify: `src/oauth-routes.ts:28-33` (resource metadata)
- Test: `test/clipper-oauth.test.ts`
- Regenerate: `openapi.json`, `sdk/generated/`

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces: publish body type `{ note?: string; note_generated?: boolean; expected?: { content_md: string; stub_of: StubOf | null } }`; both routes accept header `idempotency-key`.

- [ ] **Step 1: Write the failing tests**

Append to `test/clipper-oauth.test.ts`:

```ts
import { flow } from './oauth-flow-driver.ts';

describe('advertised support and CORS', () => {
  it('the api resource metadata advertises keys and the publish precondition; mcp does not', async () => {
    const f = await flow();
    const api = await (await f.request('/blyg/studio/auth/resources/api')).json() as Record<string, unknown>;
    expect(api.idempotency_key_operations).toEqual(['createItem', 'publishItem']);
    expect(api.publish_preconditions).toEqual(['expected']);
    const mcp = await (await f.request('/blyg/studio/auth/resources/mcp')).json() as Record<string, unknown>;
    expect(mcp.idempotency_key_operations).toBeUndefined();
  });

  it('a preflight allows Idempotency-Key and keyed responses expose the replay headers', async () => {
    const f = await flow();
    const preflight = await f.request('/api/items', { method: 'OPTIONS', headers: { Origin: 'chrome-extension://abc', 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'authorization, content-type, idempotency-key' } });
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get('access-control-allow-headers')?.toLowerCase(), 'a keyed request passes preflight').toContain('idempotency-key');
    const res = await f.request('/api/items', { method: 'POST', headers: { Authorization: 'Bearer not-a-token', 'Content-Type': 'application/json' }, body: '{}' });
    const exposed = res.headers.get('access-control-expose-headers')?.toLowerCase() ?? '';
    for (const header of ['idempotency-key', 'idempotent-replayed', 'retry-after', 'location', 'www-authenticate']) expect(exposed, 'exposes ' + header).toContain(header);
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `PATH=/usr/local/bin:$PATH node node_modules/.bin/vitest run test/clipper-oauth.test.ts -t "advertised"`
Expected: FAIL, `expected undefined to deeply equal [ 'createItem', 'publishItem' ]`.

- [ ] **Step 3: Advertise support in `src/oauth-routes.ts`**

Replace the `/resources/:resource` handler body's return line:

```ts
    return c.json({
      resource: locations[resource], authorization_servers: [locations.issuer], scopes_supported: OWNER_SCOPES, bearer_methods_supported: ['header'],
      // Extension members (RFC 9728 §2): clients send the Idempotency-Key header
      // and the publish `expected` field only to nodes that list them.
      ...(resource === 'api' ? { idempotency_key_operations: ['createItem', 'publishItem'], publish_preconditions: ['expected'] } : {}),
    });
```

- [ ] **Step 4: Widen CORS in `src/index.ts`**

Replace the two header lines in the `/api/*` middleware:

```ts
      c.header('Access-Control-Allow-Headers', 'Authorization, Content-Type, Idempotency-Key');
      c.header('Access-Control-Expose-Headers', 'WWW-Authenticate, Location, Idempotency-Key, Idempotent-Replayed, Retry-After');
```

- [ ] **Step 5: Extend the contract in `src/contract/routes.ts`**

Change the `publishItem` route's body argument to:

```ts
note.extend({ note_generated: z.boolean().optional(), expected: z.object({ content_md: z.string(), stub_of: z.union([stub, z.null()]) }).strict().optional() })
```

After the `routes` object (beside the existing `routes.createSubscription.responses[201] = …` line), add:

```ts
// Clipper spec §9: retry-safe creates and publishes. Format checks live in
// src/idempotency.ts so a malformed key gets one clear 400.
const idempotencyHeader = z.object({ "idempotency-key": z.string().optional().openapi({ description: "Retry key: 1-255 printable ASCII characters, scoped to the caller, kept 24 hours. A repeat with the same body replays the first response." }) });
routes.createItem.request.headers = idempotencyHeader;
routes.publishItem.request.headers = idempotencyHeader;
```

- [ ] **Step 6: Run the tests, regenerate the contract and type-check**

```bash
PATH=/usr/local/bin:$PATH node node_modules/.bin/vitest run test/clipper-oauth.test.ts
PATH=/usr/local/bin:$PATH npm run sdk:generate
PATH=/usr/local/bin:$PATH node node_modules/.bin/tsc --noEmit -p .
```

Expected: all tests pass; `openapi.json` and `sdk/generated/types.gen.ts` change to include the header and `expected`; tsc prints nothing.

- [ ] **Step 7: Commit**

```bash
git add src/contract/routes.ts src/index.ts src/oauth-routes.ts test/clipper-oauth.test.ts openapi.json sdk/generated
git commit -m "Advertise Idempotency-Key and publish preconditions; allow them through CORS"
```

---

### Task 3: Retry-safe create

**Files:**
- Modify: `src/model.ts:133-147` (`createDraft` → `draftInsert`)
- Modify: `src/api.ts:58-83` (`createItem` handler) and its imports
- Test: `test/clipper-oauth.test.ts`

**Interfaces:**
- Consumes: Task 1's `keyFrom`, `fingerprintOf`, `claim`, `current`, `claimGuard`, `completeClaim`, `releaseClaim`, `settledResponse`, `INVALID_KEY`, `Guard`; `workPrincipal(env): string | undefined` from `src/security-budgets.ts`.
- Produces: `draftInsert(db, d: { id: string; now: string; contentMd: string; kind: "fragment" | "thread"; stub: StubOf | null; provenance?: (ScopeProvenance | null)[] }, where?: Guard[]): D1PreparedStatement`. The create handler stores the replay body `{"id": "<id>"}` with `Location: /api/items/<id>`; a replayed 201 returns the item's current resource.

- [ ] **Step 1: Write the failing tests**

Append to `test/clipper-oauth.test.ts`:

```ts
async function fixture(scope = ['owner:read', 'owner:draft', 'owner:publish']) {
  const f = await flow();
  const minted = await f.request('/api/authorizations', { method: 'POST', headers: { cookie: f.owner, 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'clipper oracle', scope, resource: 'api' }) });
  expect(minted.status).toBe(200);
  const { access_token } = await minted.json() as { access_token: string };
  const call = (path: string, o: { method?: string; body?: unknown; key?: string; cookie?: boolean } = {}) => f.request(path, {
    method: o.method ?? 'POST',
    headers: { ...(o.cookie ? { cookie: f.owner } : { Authorization: 'Bearer ' + access_token }), 'Content-Type': 'application/json', ...(o.key === undefined ? {} : { 'Idempotency-Key': o.key }) },
    ...(o.body === undefined ? {} : { body: JSON.stringify(o.body) }),
  });
  const items = async () => (await env.DB.prepare('SELECT COUNT(*) AS n FROM items').first<{ n: number }>())!.n;
  return { ...f, call, items };
}

describe('retry-safe create (L2a)', () => {
  it('a retried create with the same key makes one item and replays the first response', async () => {
    const f = await fixture(), before = await f.items();
    const first = await f.call('/api/items', { key: 'clip-1:create', body: { kind: 'thread', content_md: 'Quoted' } });
    const again = await f.call('/api/items', { key: 'clip-1:create', body: { kind: 'thread', content_md: 'Quoted' } });
    // The law first, so a mutant that ignores the key fails at this checkpoint.
    expect(await f.items() - before, 'one item for one key').toBe(1);
    expect(first.status).toBe(201);
    expect(first.headers.get('idempotency-key')).toBe('clip-1:create');
    const { id } = await first.json() as { id: string };
    expect(again.status).toBe(201);
    expect(again.headers.get('idempotent-replayed')).toBe('true');
    expect(again.headers.get('location')).toBe(`/api/items/${id}`);
    expect((await again.json() as { id: string }).id).toBe(id);
  });

  it('contrast: identical text under two keys is two items', async () => {
    const f = await fixture(), before = await f.items();
    for (const key of ['clip-a:create', 'clip-b:create']) expect((await f.call('/api/items', { key, body: { kind: 'thread', content_md: 'Same words' } })).status).toBe(201);
    expect(await f.items() - before).toBe(2);
  });

  it('key order in the body does not change the request (Review Focus 2)', async () => {
    const f = await fixture();
    expect((await f.call('/api/items', { key: 'clip-2:create', body: { kind: 'thread', content_md: 'x' } })).status).toBe(201);
    const reordered = await f.call('/api/items', { key: 'clip-2:create', body: { content_md: 'x', kind: 'thread' } });
    expect(reordered.status, 'same request, different key order, replays').toBe(201);
    expect(reordered.headers.get('idempotent-replayed')).toBe('true');
  });

  it('a different body under the same key is refused and creates nothing', async () => {
    const f = await fixture();
    expect((await f.call('/api/items', { key: 'clip-3:create', body: { kind: 'thread', content_md: 'one' } })).status).toBe(201);
    const before = await f.items();
    expect((await f.call('/api/items', { key: 'clip-3:create', body: { kind: 'thread', content_md: 'two' } })).status).toBe(422);
    expect(await f.items()).toBe(before);
  });

  it('the cookie owner and a token using the same key are separate operations', async () => {
    const f = await fixture(), before = await f.items();
    expect((await f.call('/api/items', { key: 'shared:create', body: { content_md: 'a' } })).status).toBe(201);
    expect((await f.call('/api/items', { key: 'shared:create', body: { content_md: 'a' }, cookie: true })).status).toBe(201);
    expect(await f.items() - before).toBe(2);
  });

  it('malformed keys are refused before any work (Review Focus 5)', async () => {
    const f = await fixture(), before = await f.items();
    for (const key of ['', 'has space', 'x'.repeat(256), 'ü']) {
      const res = await f.call('/api/items', { key, body: { content_md: 'never' } });
      expect(res.status, JSON.stringify(key)).toBe(400);
    }
    expect(await f.items()).toBe(before);
  });

  it('a key on a fork or response create is refused', async () => {
    const f = await fixture();
    const res = await f.call('/api/items', { key: 'fork:create', body: { mode: 'fork', source: { origin: 'https://other.example/', id: '00000000000000000000000001', version: 1 } } });
    expect(res.status).toBe(400);
  });

  it('a create without a key is unchanged', async () => {
    const f = await fixture(), before = await f.items();
    const res = await f.call('/api/items', { body: { content_md: 'plain' } });
    expect(res.status).toBe(201);
    expect(res.headers.get('idempotency-key')).toBeNull();
    expect(await f.items() - before).toBe(1);
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `PATH=/usr/local/bin:$PATH node node_modules/.bin/vitest run test/clipper-oauth.test.ts -t "retry-safe create"`
Expected: FAIL. The first test fails at `one item for one key: expected 2 to be 1`, because the key is ignored.

- [ ] **Step 3: Make create batchable in `src/model.ts`**

Replace `createDraft` with:

```ts
/** The draft INSERT as a statement, so callers can batch it with guards (clipper spec §9). */
export function draftInsert(
  db: D1Database,
  d: { id: string; now: string; contentMd: string; kind: "fragment" | "thread"; stub: StubOf | null; provenance?: (ScopeProvenance | null)[] },
  where: Guard[] = [],
): D1PreparedStatement {
  return db
    .prepare(`INSERT INTO items (id, kind, status, created, updated, version, content_md, dirty, stub_of, tk_provenance_json) SELECT ?, ?, 'draft', ?, ?, 0, ?, 1, ?, ? WHERE 1${where.map((w) => ` AND ${w.sql}`).join("")}`)
    .bind(d.id, d.kind, d.now, d.now, d.contentMd, d.stub ? JSON.stringify(d.stub) : null, d.provenance === undefined ? null : JSON.stringify(d.provenance), ...where.flatMap((w) => w.binds));
}

export async function createDraft(
  db: D1Database,
  contentMd: string,
  kind: "fragment" | "thread" = "fragment",
  stub: StubOf | null = null,
  provenance: (ScopeProvenance | null)[] | undefined = undefined,
): Promise<ItemRow> {
  const id = newId();
  await draftInsert(db, { id, now: nowIso(), contentMd, kind, stub, provenance }).run();
  return (await getItem(db, id))!;
}
```

- [ ] **Step 4: Use keys in the create handler (`src/api.ts`)**

Add imports:

```ts
import { claim, claimGuard, completeClaim, current, fingerprintOf, INVALID_KEY, keyFrom, releaseClaim, settledResponse, type SettledClaim } from "./idempotency.ts";
import { workPrincipal } from "./security-budgets.ts";
```

Add `draftInsert` to the existing `./model.ts` import list, and `newId` to the `./util.ts` import list.

Replace the `createItem` handler with:

```ts
api.openapi(routes.createItem, async (c) => {
  const body = await readJson<z.infer<typeof ItemCreateSchema>>(c);
  const key = keyFrom(c.req.header("idempotency-key"));
  if (key === false) return c.json({ error: INVALID_KEY }, 400);
  if (key && body.mode && body.mode !== "blank") return c.json({ error: "Idempotency-Key is supported for blank creates only" }, 400);
  if (body.mode === "fork") return createForkResponse(c, body.source);
  if (body.mode === "response") {
    const item = await createResponseDraft(c, { ...body.source, selection: body.selection });
    c.header("Location", `/api/items/${item.id}`);
    return c.json(itemResource(item), 201);
  }
  const kind = body.kind === "thread" ? "thread" : "fragment";
  // A stub is a thread declaring one target (§2.2) — the stub action creates
  // the draft and its citation in one call.
  let stub = null;
  if (body.stub_of != null) {
    if (kind !== "thread") return c.json({ error: "only threads can be stubs" }, 400);
    const parsed = parseStubOf(body.stub_of);
    if (!parsed.ok) return c.json({ error: parsed.reason }, 400);
    stub = parsed.stub;
  }
  if (body.provenance !== undefined) {
    const parsed = parseScopes(body.content_md ?? '');
    if (parsed.errors.length || parsed.scopes.length !== body.provenance.length) return c.json({ error: 'provenance must have one entry per TK scope' }, 400);
  }
  if (!key) {
    const item = await createDraft(c.env.DB, body.content_md ?? "", kind, stub, body.provenance);
    c.header("Location", `/api/items/${item.id}`);
    return c.json(itemResource(item), 201);
  }
  // Clipper spec §9: the insert and its replay record commit together, and
  // only while this attempt still holds the claim.
  const principal = workPrincipal(c.env) ?? "owner";
  const fingerprint = await fingerprintOf("POST", "/api/items", body);
  const state = await claim(c.env.DB, principal, key, fingerprint);
  if (state.kind !== "run") return settledResponse(c, key, state, await createdReplayBody(c.env.DB, state));
  try {
    const id = newId(), location = `/api/items/${id}`;
    const [inserted] = await c.env.DB.batch([
      draftInsert(c.env.DB, { id, now: nowIso(), contentMd: body.content_md ?? "", kind, stub, provenance: body.provenance }, [claimGuard(state)]),
      completeClaim(c.env.DB, state, { status: 201, body: JSON.stringify({ id }), location }),
    ]);
    if (inserted.meta.changes === 0) {
      const after = await current(c.env.DB, principal, key, fingerprint);
      return settledResponse(c, key, after, await createdReplayBody(c.env.DB, after));
    }
    c.header("Idempotency-Key", key);
    c.header("Location", location);
    return c.json(itemResource((await getItem(c.env.DB, id))!), 201);
  } finally {
    await releaseClaim(c.env.DB, state);
  }
});

/** A replayed create answers with the item as it is now; the stored body holds only its id. */
async function createdReplayBody(db: D1Database, state: SettledClaim): Promise<string | undefined> {
  if (state.kind !== "replay") return undefined;
  const item = await getItem(db, (JSON.parse(state.body) as { id: string }).id);
  return item ? JSON.stringify(itemResource(item)) : undefined;
}
```

- [ ] **Step 5: Run the tests and the existing item tests**

```bash
PATH=/usr/local/bin:$PATH node node_modules/.bin/vitest run test/clipper-oauth.test.ts
PATH=/usr/local/bin:$PATH node node_modules/.bin/vitest run test/item-lifecycle.oracle.test.ts test/sdk-operations.test.ts test/cited.test.ts
PATH=/usr/local/bin:$PATH node node_modules/.bin/tsc --noEmit -p .
```

Expected: all pass; tsc prints nothing.

- [ ] **Step 6: Commit**

```bash
git add src/model.ts src/api.ts test/clipper-oauth.test.ts
git commit -m "Make blank creates retry-safe with Idempotency-Key"
```

---

### Task 4: Retry-safe publish with a working-copy precondition

**Files:**
- Modify: `src/model.ts` (`publish()` near line 297 and its batch near line 406; add the precondition helpers)
- Modify: `src/api.ts:194-241` (`publishAndNotify` and the `publishItem` handler)
- Test: `test/clipper-oauth.test.ts`

**Interfaces:**
- Consumes: Task 1 helpers; Task 3's imports in `src/api.ts`.
- Produces:
  - `interface PublishGuard { where: Guard[]; also: D1PreparedStatement[] }`
  - `class PublishGuardLost extends Error`
  - `publish(db, item, note, ourOrigin?, noteGenerated = false, guard?: PublishGuard): Promise<number>`, which throws `PublishGuardLost` when the guarded version insert changes no row
  - `interface WorkingCopy { contentMd: string; stubJson: string | null }`
  - `matchesWorkingCopy(item: ItemRow, w: WorkingCopy): boolean`
  - `workingCopyGuard(id: string, w: WorkingCopy): Guard`
  - The publish replay body is `{"ok":true,"version":N}` with status 200 and no `Location`.

- [ ] **Step 1: Write the failing tests**

Append to `test/clipper-oauth.test.ts`:

```ts
describe('retry-safe publish and the frozen working copy (L2a, L2c)', () => {
  const versions = async (id: string) => (await env.DB.prepare('SELECT COUNT(*) AS n FROM versions WHERE item_id = ?').bind(id).first<{ n: number }>())!.n;
  const stubOf = { url: 'https://source.example/post', cited: { source: 'Source', url: 'https://source.example/post#:~:text=quoted', retrieved: '2026-10-05T00:00:00Z', excerpt: 'quoted' } };
  async function created(f: Awaited<ReturnType<typeof fixture>>, content_md = '> quoted\n\nmine') {
    const res = await f.call('/api/items', { body: { kind: 'thread', content_md, stub_of: stubOf } });
    expect(res.status).toBe(201);
    return (await res.json() as { id: string }).id;
  }
  const expected = (content_md = '> quoted\n\nmine') => ({ content_md, stub_of: stubOf });

  it('a retried publish with the same key makes one version and replays', async () => {
    const f = await fixture(), id = await created(f);
    const first = await f.call(`/api/items/${id}/publish`, { key: 'clip-1:publish', body: { expected: expected() } });
    expect(first.status).toBe(200);
    expect(await first.json()).toMatchObject({ ok: true, version: 1 });
    const again = await f.call(`/api/items/${id}/publish`, { key: 'clip-1:publish', body: { expected: expected() } });
    expect(again.status).toBe(200);
    expect(again.headers.get('idempotent-replayed')).toBe('true');
    expect(await versions(id), 'one version for one publish operation').toBe(1);
  });

  it('a Studio edit before the queued publish stops it; nothing is published (L2c)', async () => {
    const f = await fixture(), id = await created(f);
    expect((await f.call(`/api/items/${id}`, { method: 'PATCH', cookie: true, body: { content_md: 'edited in Studio' } })).status).toBe(200);
    const res = await f.call(`/api/items/${id}/publish`, { key: 'clip-2:publish', body: { expected: expected() } });
    expect(res.status, 'a Studio edit stops a frozen publish').toBe(409);
    expect(await res.json()).toEqual({ error: 'changed' });
    expect(await versions(id)).toBe(0);
  });

  it('contrast: an unchanged working copy publishes', async () => {
    const f = await fixture(), id = await created(f);
    expect((await f.call(`/api/items/${id}/publish`, { body: { expected: expected() } })).status).toBe(200);
    expect(await versions(id)).toBe(1);
  });

  it('a retry after success replays even if the owner edited since (Review Focus 1)', async () => {
    const f = await fixture(), id = await created(f);
    expect((await f.call(`/api/items/${id}/publish`, { key: 'clip-3:publish', body: { expected: expected() } })).status).toBe(200);
    expect((await f.call(`/api/items/${id}`, { method: 'PATCH', cookie: true, body: { content_md: 'edited after publish' } })).status).toBe(200);
    const retry = await f.call(`/api/items/${id}/publish`, { key: 'clip-3:publish', body: { expected: expected() } });
    expect(retry.status, 'the first attempt published; the retry must replay, not refuse').toBe(200);
    expect(retry.headers.get('idempotent-replayed')).toBe('true');
    expect(await versions(id)).toBe(1);
  });

  it('an equivalent stub_of with a different key order matches (Review Focus 3)', async () => {
    const f = await fixture(), id = await created(f);
    const reordered = { stub_of: { cited: { excerpt: 'quoted', retrieved: '2026-10-05T00:00:00Z', url: 'https://source.example/post#:~:text=quoted', source: 'Source' }, url: 'https://source.example/post' }, content_md: '> quoted\n\nmine' };
    expect((await f.call(`/api/items/${id}/publish`, { body: { expected: reordered } })).status).toBe(200);
  });

  it('the Studio publish without key or expected is unchanged (Review Focus 4)', async () => {
    const f = await fixture(), id = await created(f);
    const res = await f.call(`/api/items/${id}/publish`, { cookie: true, body: {} });
    expect(res.status).toBe(200);
    expect(res.headers.get('idempotency-key')).toBeNull();
    expect(await versions(id)).toBe(1);
  });

  it('a refused publish releases its key, so the same key works once the draft is fixed', async () => {
    const f = await fixture();
    const res = await f.call('/api/items', { body: { kind: 'thread', content_md: '![[zzzzzzzzzzzzzzzzzzzzzzzzzz]]' } });
    const { id } = await res.json() as { id: string };
    expect((await f.call(`/api/items/${id}/publish`, { key: 'clip-4:publish', body: {} })).status).toBe(400);
    expect((await f.call(`/api/items/${id}`, { method: 'PATCH', body: { content_md: 'fixed' } })).status).toBe(200);
    expect((await f.call(`/api/items/${id}/publish`, { key: 'clip-4:publish', body: {} })).status, 'a released key runs again').toBe(200);
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `PATH=/usr/local/bin:$PATH node node_modules/.bin/vitest run test/clipper-oauth.test.ts -t "retry-safe publish"`
Expected: FAIL. The first test fails at `one version for one publish operation: expected 2 to be 1`.

- [ ] **Step 3: Add guards to `publish()` in `src/model.ts`**

Above `publish()`:

```ts
export interface PublishGuard { where: Guard[]; also: D1PreparedStatement[] }
/** The guarded publish committed nothing: the claim or the working copy moved. */
export class PublishGuardLost extends Error {}

export interface WorkingCopy { contentMd: string; stubJson: string | null }
export function matchesWorkingCopy(item: ItemRow, w: WorkingCopy): boolean {
  return item.content_md === w.contentMd && (item.stub_of ?? null) === w.stubJson;
}
export function workingCopyGuard(id: string, w: WorkingCopy): Guard {
  return { sql: "EXISTS (SELECT 1 FROM items WHERE id = ? AND content_md = ? AND stub_of IS ?)", binds: [id, w.contentMd, w.stubJson] };
}
```

Change the signature to:

```ts
export async function publish(db: D1Database, item: ItemRow, note: string | null, ourOrigin?: string, noteGenerated = false, guard?: PublishGuard): Promise<number> {
```

Replace the existing `await db.batch([...])` (the `INSERT INTO versions` and `UPDATE items` pair) with:

```ts
  const where = guard?.where ?? [];
  const guardSql = where.map((w) => ` AND ${w.sql}`).join("");
  const guardBinds = where.flatMap((w) => w.binds);
  const [inserted] = await db.batch([
    db.prepare(
      `INSERT INTO versions (item_id, version, content_md, content_html, content_hash, published_at, note, transclusions, generated_json, stub_of, stub_cite, note_generated) SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? WHERE 1${guardSql}`,
    ).bind(item.id, version, strippedMd, contentHtml, hash, now, note, transclusionsJson, generatedJson, stubJson, citeJson, note && noteGenerated ? 1 : 0, ...guardBinds),
    db.prepare(`UPDATE items SET status = 'public', kind = ?, version = ?, dirty = 0, updated = ? WHERE id = ?${guardSql}`)
      .bind(kind, version, now, item.id, ...guardBinds),
    // The replay record goes last: it flips the claim to done, which would
    // fail the guard for any statement after it.
    ...(guard?.also ?? []),
  ]);
  if (inserted.meta.changes === 0) throw new PublishGuardLost();
```

- [ ] **Step 4: Use the guard in `src/api.ts`**

Add `matchesWorkingCopy`, `workingCopyGuard`, `PublishGuardLost` and `type PublishGuard` to the `./model.ts` import list.

Change `publishAndNotify`'s signature to pass a guard through:

```ts
async function publishAndNotify(c: Context<{ Bindings: Env }>, item: ItemRow, note: string | null, extra: Record<string, unknown> = {}, noteGenerated = false, guard?: PublishGuard) {
```

and its publish call to:

```ts
    const version = await publish(c.env.DB, item, note, origin, noteGenerated, guard);
```

`PublishGuardLost` is not caught inside `publishAndNotify`; it propagates to the handler.

Replace the `publishItem` handler with:

```ts
api.openapi(routes.publishItem, async (c) => {
  // Also the republish path for withdrawn items: vN+1 restores 'public'/authored kind.
  // Studio-side fragment cap (§2.7) is enforced inside publish() against the
  // TK-stripped (published) length, not the raw working copy — see FragmentTooLongError.
  const item = await getItem(c.env.DB, c.req.param("id"));
  if (!item) return c.json({ error: "not found" }, 404);
  const body = await readJson<{ note?: string; note_generated?: boolean; expected?: { content_md: string; stub_of: unknown } }>(c);
  const key = keyFrom(c.req.header("idempotency-key"));
  if (key === false) return c.json({ error: INVALID_KEY }, 400);
  let expected: WorkingCopy | null = null;
  if (body.expected) {
    const parsed = body.expected.stub_of === null ? null : parseStubOf(body.expected.stub_of);
    if (parsed && !parsed.ok) return c.json({ error: parsed.reason }, 400);
    expected = { contentMd: body.expected.content_md, stubJson: parsed ? JSON.stringify(parsed.stub) : null };
  }
  const note = body.note?.trim() || null;
  // note_generated is the studio's own assertion that the note is the drafted
  // text, unedited (#40) — self-asserted, like every provenance member.
  const noteGenerated = body.note_generated === true;
  if (!key) {
    if (expected && !matchesWorkingCopy(item, expected)) return c.json({ error: "changed" }, 409);
    try {
      return await publishAndNotify(c, item, note, {}, noteGenerated, expected ? { where: [workingCopyGuard(item.id, expected)], also: [] } : undefined);
    } catch (e) {
      if (e instanceof PublishGuardLost) return c.json({ error: "changed" }, 409);
      throw e;
    }
  }
  // Claim before the precondition (clipper spec §9): a retry whose first
  // attempt already published must replay, even if the owner edited since.
  const principal = workPrincipal(c.env) ?? "owner";
  const fingerprint = await fingerprintOf("POST", `/api/items/${item.id}/publish`, body);
  const state = await claim(c.env.DB, principal, key, fingerprint);
  if (state.kind !== "run") return settledResponse(c, key, state);
  try {
    if (expected && !matchesWorkingCopy(item, expected)) return c.json({ error: "changed" }, 409);
    c.header("Idempotency-Key", key);
    const guard: PublishGuard = {
      where: [...(expected ? [workingCopyGuard(item.id, expected)] : []), claimGuard(state)],
      also: [completeClaim(c.env.DB, state, { status: 200, body: JSON.stringify({ ok: true, version: item.version + 1 }), location: null })],
    };
    return await publishAndNotify(c, item, note, {}, noteGenerated, guard);
  } catch (e) {
    if (e instanceof PublishGuardLost) {
      const after = await current(c.env.DB, principal, key, fingerprint);
      if (after.kind === "replay") return settledResponse(c, key, after);
      const now = await getItem(c.env.DB, item.id);
      return now && expected && !matchesWorkingCopy(now, expected) ? c.json({ error: "changed" }, 409) : settledResponse(c, key, after);
    }
    throw e;
  } finally {
    await releaseClaim(c.env.DB, state);
  }
});
```

Add `type WorkingCopy` to the `./model.ts` import list.

- [ ] **Step 5: Run the tests and the existing publish tests**

```bash
PATH=/usr/local/bin:$PATH node node_modules/.bin/vitest run test/clipper-oauth.test.ts
PATH=/usr/local/bin:$PATH node node_modules/.bin/vitest run test/item-lifecycle.oracle.test.ts test/change-note.test.ts test/cited.test.ts test/freshness.test.ts
PATH=/usr/local/bin:$PATH node node_modules/.bin/tsc --noEmit -p .
```

Expected: all pass; tsc prints nothing.

- [ ] **Step 6: Commit**

```bash
git add src/model.ts src/api.ts test/clipper-oauth.test.ts
git commit -m "Make publish retry-safe and add the working-copy precondition"
```

---

### Task 5: Mutation controls, docs and full verification

**Files:**
- Modify: `scripts/verify-auth-security-mutations.ts` (append controls to the `controls` array)
- Modify: `docs/api.md:7` and add a section
- Modify: `CHANGELOG.md` (add an `## Unreleased` section above `## 0.28.0`)

**Interfaces:**
- Consumes: the exact source strings from Tasks 1–4 as mutation anchors.
- Produces: no code interfaces.

- [ ] **Step 1: Add mutation controls**

Append these entries to the `controls` array in `scripts/verify-auth-security-mutations.ts`, just before the closing `];`. Each anchor must match the source exactly, because the runner asserts it exists.

```ts
  { name: 'clipper key ignored', changes: [{ file: 'src/idempotency.ts', from: 'if (header === undefined) return null;', to: 'return null;' }], kind: 'worker', test: 'test/clipper-oauth.test.ts', pattern: 'a retried create with the same key', checkpoint: 'one item for one key' },
  { name: 'clipper attempt token is a counter', changes: [{ file: 'src/idempotency.ts', from: 'const attempt = crypto.randomUUID();', to: 'const attempt = "1";' }], kind: 'worker', test: 'test/clipper-oauth.test.ts', pattern: 'reclaim, fail and reinsert', checkpoint: 'a dead attempt commits nothing' },
  { name: 'clipper work guard ignores the attempt', changes: [{ file: 'src/idempotency.ts', from: "key = ? AND attempt = ? AND state = 'pending')\", binds", to: "key = ? AND ? IS NOT NULL AND state = 'pending')\", binds" }], kind: 'worker', test: 'test/clipper-oauth.test.ts', pattern: 'a stale pending claim is reclaimed', checkpoint: 'the work guard refuses the dead attempt' },
  { name: 'clipper failed publish keeps its claim', changes: [{ file: 'src/idempotency.ts', from: 'await db.prepare("DELETE FROM idempotency_keys WHERE principal = ? AND key = ? AND attempt = ? AND state = \'pending\'")', to: 'await db.prepare("SELECT 1 WHERE ? IS NOT NULL AND ? IS NOT NULL AND ? IS NOT NULL")' }], kind: 'worker', test: 'test/clipper-oauth.test.ts', pattern: 'a refused publish releases its key', checkpoint: 'a released key runs again' },
  { name: 'clipper publish ignores the working copy', changes: [{ file: 'src/api.ts', from: 'if (expected && !matchesWorkingCopy(item, expected)) return c.json({ error: "changed" }, 409);', to: '' }, { file: 'src/api.ts', from: '...(expected ? [workingCopyGuard(item.id, expected)] : []), claimGuard(state)', to: 'claimGuard(state)' }], kind: 'worker', test: 'test/clipper-oauth.test.ts', pattern: 'a Studio edit before the queued publish', checkpoint: 'a Studio edit stops a frozen publish' },
  { name: 'clipper precondition before claim', changes: [{ file: 'src/api.ts', from: '  const state = await claim(c.env.DB, principal, key, fingerprint);\n  if (state.kind !== "run") return settledResponse(c, key, state);\n  try {\n    if (expected && !matchesWorkingCopy(item, expected)) return c.json({ error: "changed" }, 409);', to: '  if (expected && !matchesWorkingCopy(item, expected)) return c.json({ error: "changed" }, 409);\n  const state = await claim(c.env.DB, principal, key, fingerprint);\n  if (state.kind !== "run") return settledResponse(c, key, state);\n  try {' }], kind: 'worker', test: 'test/clipper-oauth.test.ts', pattern: 'a retry after success replays', checkpoint: 'the first attempt published; the retry must replay' },
  { name: 'clipper CORS lacks the key header', changes: [{ file: 'src/index.ts', from: "'Authorization, Content-Type, Idempotency-Key'", to: "'Authorization, Content-Type'" }], kind: 'worker', test: 'test/clipper-oauth.test.ts', pattern: 'a preflight allows Idempotency-Key', checkpoint: 'a keyed request passes preflight' },
```

Note: `replaceAll` applies to every occurrence. The `'clipper precondition before claim'` anchor occurs once, inside the keyed branch of the publish handler. The `'if (expected && !matchesWorkingCopy…'` line occurs twice, which is intended: that control must disable the precondition on both branches.

- [ ] **Step 2: Run the new controls**

```bash
for n in "clipper key ignored" "clipper attempt token" "clipper work guard" "clipper failed publish" "clipper publish ignores" "clipper precondition before" "clipper CORS"; do
  PATH=/usr/local/bin:$PATH node --import tsx scripts/verify-auth-security-mutations.ts "$n" 2>&1 | grep -E "Caught|Survived|Assertion"
done
```

Expected: seven `Caught:` lines. A `Survived` or `Missing semantic checkpoint` means a test or an anchor is wrong; fix it before going on.

- [ ] **Step 3: Document the contract**

In `docs/api.md`, replace line 7 (`OAuth and cross-origin clients belong to the next compatibility phase.`) with:

```markdown
OAuth clients and cross-origin bearer requests are supported; see [client access](client-access.md).
```

Add this section to the end of `docs/api.md`:

```markdown
## Retry-safe writes

`POST /api/items` (blank creates) and `POST /api/items/{id}/publish` accept an
`Idempotency-Key` header: 1–255 printable ASCII characters, scoped to the
caller (the grant for a token, the owner for the cookie) and kept 24 hours.

- Repeating a request with the same key and the same body replays the first
  response with `Idempotent-Replayed: true`, and does no new work.
- The same key with a different body answers 422.
- A repeat while the first is still running answers 409 with `Retry-After: 1`.
- Keyed responses echo `Idempotency-Key`. The work and its replay record
  commit together, so a lost response never means the work happened twice.

Publish also accepts `expected: { content_md, stub_of }`. When present, it
publishes only if the item's working copy still equals it, and otherwise
answers 409 `{ "error": "changed" }` without publishing.

Support is advertised in the protected resource metadata at
`{mount}/studio/auth/resources/api`: `idempotency_key_operations` and
`publish_preconditions`. Send the header and the field only to nodes that
list them; older nodes reject both.
```

In `CHANGELOG.md`, insert above `## 0.28.0 — 2026-10-05`:

```markdown
## Unreleased

**Migrations: 0023_idempotency_keys.sql.** Apply after 0.28.0's 0021 and 0022.

- `POST /api/items` (blank creates) and `POST /api/items/{id}/publish` accept
  an `Idempotency-Key` header. A repeat with the same body replays the first
  response, so clients can retry after a lost response without duplicating
  an item or a version.
- Publish accepts `expected: { content_md, stub_of }` and refuses with 409
  `changed` if the working copy moved. Studio publishes are unchanged.
- The `api` resource metadata advertises both, and `/api` CORS allows the
  header and exposes `Idempotency-Key`, `Idempotent-Replayed` and
  `Retry-After`.

---

```

- [ ] **Step 4: Full verification**

```bash
PATH=/usr/local/bin:$PATH node node_modules/.bin/tsc --noEmit -p .
PATH=/usr/local/bin:$PATH node node_modules/.bin/vitest run --maxWorkers=2
PATH=/usr/local/bin:$PATH npm run openapi && git diff --exit-code -- openapi.json
PATH=/usr/local/bin:$PATH node --import tsx scripts/verify-auth-security-mutations.ts --exclude-browser
```

Expected: tsc silent; every test file passes; no `openapi.json` drift; every control `Caught:` and exit 0.

- [ ] **Step 5: Commit**

```bash
git add scripts/verify-auth-security-mutations.ts docs/api.md CHANGELOG.md
git commit -m "Mutation controls and docs for Idempotency-Key and publish preconditions"
```
