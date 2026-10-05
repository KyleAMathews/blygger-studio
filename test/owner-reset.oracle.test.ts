/**
 * Resetting the owner's password must remove the old browser's power to delegate.
 * Rejecting old bearer tokens alone would leave a stale cookie able to mint new ones.
 *
 * Contract: decision #31 requires an old owner session to lose access after a
 * password reset. The user confirmed this rule during review. Delegated token
 * survival is a separate rule; this oracle makes no claim about existing tokens.
 * OWASP recommends session invalidation around credential changes:
 * https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html#renew-the-session-id-after-any-privilege-level-change
 * Model: an old cookie under a changed password cannot issue a grant; a fresh login
 * with the new password can read protected settings. No cookie decoder predicts it.
 * History grammar: login, change only OWNER_PASSWORD, old-cookie mint and fresh login.
 * Driver: real makeApp routes with replaced environment bindings and unchanged
 * signing configuration. Refinement: mint401/no token and fresh login302/read200.
 * Limits: a fixed configuration cutover witness, not evidence that all deployed
 * isolates receive a secret update simultaneously.
 */
import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { expect, it } from 'vitest';
import { makeApp } from '../src/index.ts';
it('cannot use an old owner cookie to mint fresh grants after resetting the root password', async () => {
  const app = makeApp('/blyg'), base = 'https://owner-reset.example.test';
  const request = async (path: string, bindings: typeof env, init: RequestInit = {}) => {
    const ctx = createExecutionContext(), headers = new Headers(init.headers); headers.set('CF-Connecting-IP', '198.51.100.234');
    const response = await app.fetch(new Request(base + path, { ...init, headers }), bindings, ctx); await waitOnExecutionContext(ctx); return response;
  };
  const loggedIn = await request('/blyg/studio/login', env, { method: 'POST', body: new URLSearchParams({ password: env.OWNER_PASSWORD }) });
  expect(loggedIn.status).toBe(302); const cookie = loggedIn.headers.get('set-cookie')!.split(';')[0];
  const changed = { ...env, OWNER_PASSWORD: env.OWNER_PASSWORD + '-reset' };
  const mint = await request('/api/authorizations', changed, { method: 'POST', headers: { cookie, 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'old browser', scope: ['owner:read'], resource: 'api' }) });
  expect(mint.status).toBe(401); expect(await mint.json()).not.toHaveProperty('access_token');
  const fresh = await request('/blyg/studio/login', changed, { method: 'POST', body: new URLSearchParams({ password: changed.OWNER_PASSWORD }) });
  expect(fresh.status).toBe(302);
  expect((await request('/api/settings', changed, { headers: { cookie: fresh.headers.get('set-cookie')!.split(';')[0] } })).status).toBe(200);
});
