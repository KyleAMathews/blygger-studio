import { expect, test, vi } from 'vitest';
import { connectOAuth } from '../lib/connect.ts';
import { memoryArea } from '../lib/storage.ts';
import { TokenStore } from '../lib/tokens.ts';

const REDIRECT = 'https://abcdefghijklmnopabcdefghijklmnop.chromiumapp.org/';
/** A minimal Studio: discovery answers, registration counts calls. */
function studio() {
  let registrations = 0;
  const fetchFn = async (url: string) => {
    if (url.endsWith('/api/settings')) return new Response(null, { status: 401, headers: { 'WWW-Authenticate': 'Bearer resource_metadata="https://b.example/studio/auth/resources/api"' } });
    if (url.endsWith('/resources/api')) return Response.json({ resource: 'https://b.example/api', authorization_servers: ['https://b.example/studio/auth'] });
    if (url.endsWith('/oauth-authorization-server')) return Response.json({ authorization_endpoint: 'https://b.example/studio/auth/oauth2/authorize', token_endpoint: 'https://b.example/studio/auth/oauth2/token', registration_endpoint: 'https://b.example/studio/auth/oauth2/register' });
    if (url.endsWith('/oauth2/register')) { registrations++; return Response.json({ client_id: `client-${registrations}` }, { status: 201 }); }
    return new Response(null, { status: 404 });
  };
  return { fetchFn, registrations: () => registrations };
}

test('cancelling the sign-in window ends the attempt without registering again (Review Focus 2)', async () => {
  const s = studio(), local = memoryArea();
  const launch = vi.fn(async () => { throw new Error('The user did not approve access.'); });
  const store = new TokenStore(local, memoryArea(), s.fetchFn);
  await expect(connectOAuth('b.example', { fetchFn: s.fetchFn, store, local, redirectUri: REDIRECT, launch })).rejects.toThrow('Sign-in was cancelled.');
  expect(s.registrations(), 'one registration only').toBe(1);
  expect(launch).toHaveBeenCalledTimes(1);
  await expect(connectOAuth('b.example', { fetchFn: s.fetchFn, store, local, redirectUri: REDIRECT, launch })).rejects.toThrow('Sign-in was cancelled.');
  expect(s.registrations(), 'a known client is reused, and a cancel does not trigger re-registration').toBe(1);
});

const FAKE_DISCOVERY = {
  origin: 'https://b.example', mount: '/', resource: 'https://b.example/api', issuer: 'https://b.example/studio/auth',
  authorize: 'https://b.example/studio/auth/oauth2/authorize', token: 'https://b.example/studio/auth/oauth2/token',
  register: 'https://b.example/studio/auth/oauth2/register', revoke: 'https://b.example/studio/auth/oauth2/revoke',
  idempotency: ['createItem'], preconditions: [],
};

test('a refresh that finishes after disconnect cannot reconnect', async () => {
  const local = memoryArea(), session = memoryArea();
  let release!: () => void, started!: () => void;
  const gate = new Promise<void>((r) => { release = r; }), tokenCalled = new Promise<void>((r) => { started = r; });
  const revokes: string[] = [];
  const fetchFn = async (url: string, init?: RequestInit) => {
    if (url.endsWith('/oauth2/token')) {
      started();
      await gate;
      return Response.json({ access_token: 'a2', refresh_token: 'r2', expires_in: 3600, scope: 'owner:draft' });
    }
    if (url.endsWith('/oauth2/revoke')) { revokes.push(String(init?.body)); return new Response(null, { status: 200 }); }
    return new Response(null, { status: 404 });
  };
  const store = new TokenStore(local, session, fetchFn, () => 1_000_000);
  await store.saveOAuth(FAKE_DISCOVERY, 'client-1', { accessToken: 'a1', refreshToken: 'r1', expiresAt: 0, scope: ['owner:draft'] });
  const pending = store.accessToken();
  await tokenCalled;
  const leaving = store.disconnect();
  release();
  await leaving;
  await pending.catch(() => {});
  expect(await store.status(), 'a refresh that finishes after disconnect cannot reconnect').toEqual({ state: 'disconnected' });
  expect(revokes.join('\n'), 'the revoke carried the rotated refresh token').toContain('token=r2');
});

const DAY = 24 * 3600_000;
async function withStoredClient(entry: { clientId: string; registeredAt: number; approved: boolean }, now: number) {
  const s = studio(), local = memoryArea();
  await local.set({ clients: { ['https://b.example/studio/auth ' + REDIRECT]: entry } });
  const store = new TokenStore(local, memoryArea(), s.fetchFn);
  const launch = vi.fn(async () => { throw new Error('The user did not approve access.'); });
  await expect(connectOAuth('b.example', { fetchFn: s.fetchFn, store, local, redirectUri: REDIRECT, launch, now: () => now })).rejects.toThrow('Sign-in was cancelled.');
  return s.registrations();
}

test('an unapproved client older than 23 hours is registered again', async () => {
  const now = 100 * DAY;
  expect(await withStoredClient({ clientId: 'old', registeredAt: now - DAY, approved: false }, now)).toBe(1);
});

test('an approved client is reused however old', async () => {
  const now = 100 * DAY;
  expect(await withStoredClient({ clientId: 'old', registeredAt: now - 30 * DAY, approved: true }, now)).toBe(0);
});
