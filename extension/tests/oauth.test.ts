import { expect, test } from 'vitest';
import { challengeFor, codeFromRedirect, expiryOfJwt, randomVerifier, scopeOfJwt } from '../lib/oauth.ts';

const REDIRECT = 'https://abcdefghijklmnopabcdefghijklmnop.chromiumapp.org/';

test('PKCE matches RFC 7636 appendix B, and verifiers are 64 URL-safe characters', async () => {
  expect(await challengeFor('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk')).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGe3IVoM');
  const verifier = randomVerifier();
  expect(verifier).toMatch(/^[A-Za-z0-9_-]{64}$/);
  expect(randomVerifier()).not.toBe(verifier);
});

test('a sign-in redirect yields its code only for this request', () => {
  expect(codeFromRedirect(`${REDIRECT}?code=abc&state=s1`, REDIRECT, 's1')).toBe('abc');
  expect(() => codeFromRedirect(`${REDIRECT}?code=abc&state=other`, REDIRECT, 's1'), 'another state is refused').toThrow('did not match');
  expect(() => codeFromRedirect(`https://evil.example/?code=abc&state=s1`, REDIRECT, 's1')).toThrow('unexpected address');
  expect(() => codeFromRedirect(`${REDIRECT}?error=access_denied&state=s1`, REDIRECT, 's1')).toThrow('Access was denied.');
  expect(() => codeFromRedirect(`${REDIRECT}?state=s1`, REDIRECT, 's1')).toThrow('no code');
});

test('a JWT payload gives its scope and expiry; anything else gives nothing', () => {
  const payload = btoa(JSON.stringify({ scope: 'owner:read owner:draft', exp: 1_900_000_000 })).replace(/=+$/, '');
  const jwt = `eyJhbGciOiJSUzI1NiJ9.${payload}.sig`;
  expect(scopeOfJwt(jwt)).toEqual(['owner:read', 'owner:draft']);
  expect(expiryOfJwt(jwt)).toBe(1_900_000_000_000);
  expect(scopeOfJwt('not-a-jwt')).toBeNull();
  expect(expiryOfJwt('a.b.c')).toBeUndefined();
});
