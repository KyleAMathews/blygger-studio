/**
 * Owner revocation of one grant leaves another same-client access token usable.
 * Recording the latest grant must not hide an older live grant.
 *
 * Contract: decision #52 and docs/client-access.md select approval-level revocation.
 * OIDC UserInfo is a protected bearer endpoint, not an exception to that policy:
 * https://openid.net/specs/openid-connect-core-1_0.html#UserInfo
 * Model: two approvals are distinct; revoking the broad approval leaves the narrow
 * access token usable. A separate witness requires UserInfo denial after grant deletion.
 * History grammar: broad approval, forced narrower consent, list, delete and reads.
 * Driver: flow HTTP routes, native tokens and the public owner authorization list.
 * Refinement: two visible grants, old API401/new API200, and UserInfo200 then401.
 * Limits: this fixed witness covers neither every list page nor all introspection
 * paths; authenticated introspection has its own security oracle. It observes access
 * after owner revocation, not refresh after replay. Native refresh-family cleanup
 * groups by client/owner and can affect multiple application grants.
 */
import { expect, it } from 'vitest';
import { flow } from './oauth-flow-driver.ts';

it('lists both grants and preserves neighboring access after owner grant revocation', async () => {
  const f = await flow();
  const first = await f.decide('browser-a', true);
  const original = await (await f.token(new URL(first.headers.get('location')!).searchParams.get('code')!)).json() as { access_token: string };
  const url = new URL(f.authorize); url.searchParams.set('scope', 'owner:read offline_access'); url.searchParams.set('prompt', 'consent');
  const consent = await f.request(url.href, { headers: { cookie: f.owner } });
  expect(consent.status).toBe(200);
  const html = await consent.text(), handle = html.match(/name="handle" value="([^"]+)"/)![1];
  const binding = consent.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
  const decision = await f.request(f.issuer + '/consent', { method: 'POST', headers: { cookie: f.owner + '; ' + binding, Origin: f.base }, body: new URLSearchParams({ handle, decision: 'allow', scope: 'owner:read' }) });
  expect(decision.status).toBe(302);
  const narrowed = await (await f.token(new URL(decision.headers.get('location')!).searchParams.get('code')!)).json() as { access_token: string };
  expect((await f.request('/api/settings', { headers: { Authorization: 'Bearer ' + original.access_token } })).status).toBe(200);
  const listing = await (await f.request('/api/authorizations', { headers: { cookie: f.owner } })).json() as { items: { id: string; clientId: string; scope: string[] }[] };
  const grants = listing.items.filter(item => item.clientId === f.client.client_id);
  expect(grants).toHaveLength(2);
  const old = grants.find(item => item.scope.includes('owner:draft'))!;
  expect(old).toBeDefined();
  expect((await f.request('/api/authorizations/' + encodeURIComponent(old.id), { method: 'DELETE', headers: { cookie: f.owner } })).status).toBe(200);
  expect((await f.request('/api/settings', { headers: { Authorization: 'Bearer ' + original.access_token } })).status).toBe(401);
  expect((await f.request('/api/settings', { headers: { Authorization: 'Bearer ' + narrowed.access_token } })).status).toBe(200);
});

it('applies owner grant revocation to the forwarded native UserInfo endpoint', async () => {
  const f = await flow({ scope: 'openid owner:read owner:draft' });
  const approved = await f.decide('browser-a', true);
  const response = await f.token(new URL(approved.headers.get('location')!).searchParams.get('code')!);
  expect(response.status).toBe(200);
  const token = await response.json() as { access_token: string };
  const read = () => f.request(f.issuer + '/oauth2/userinfo', { headers: { Authorization: 'Bearer ' + token.access_token } });
  expect((await read()).status).toBe(200);
  const listing = await (await f.request('/api/authorizations', { headers: { cookie: f.owner } })).json() as { items: { id: string; clientId: string }[] };
  const grant = listing.items.find(item => item.clientId === f.client.client_id)!;
  expect((await f.request('/api/authorizations/' + encodeURIComponent(grant.id), { method: 'DELETE', headers: { cookie: f.owner } })).status).toBe(200);
  expect((await read()).status).toBe(401);
});
