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
