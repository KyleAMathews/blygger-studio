import type { Discovery } from './discovery.ts';
import type { FetchLike } from './types.ts';

export const REQUESTED_SCOPE = 'owner:read owner:draft owner:publish owner:manage offline_access';

export class OAuthError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
    this.name = 'OAuthError';
  }
}

const base64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

/** A PKCE code verifier: 64 URL-safe characters (RFC 7636 §4.1 allows 43–128). */
export function randomVerifier(): string {
  return base64url(crypto.getRandomValues(new Uint8Array(48)));
}

export async function challengeFor(verifier: string): Promise<string> {
  return base64url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))));
}

/** Dynamic registration as a public client (spec §3.2). Returns the client_id. */
export async function register(d: Discovery, redirectUri: string, fetchFn: FetchLike): Promise<string> {
  const response = await fetchFn(d.register, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_name: 'Blygger Clipper',
      redirect_uris: [redirectUri],
      token_endpoint_auth_method: 'none',
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
    }),
  });
  const body = (await response.json().catch(() => ({}))) as { client_id?: unknown; error?: string; error_description?: string };
  if (response.status !== 201 || typeof body.client_id !== 'string') throw new OAuthError(body.error ?? 'registration_failed', body.error_description ?? `Registration failed (${response.status}).`);
  return body.client_id;
}

export function authorizeUrl(d: Discovery, p: { clientId: string; redirectUri: string; state: string; challenge: string; scope?: string }): string {
  const url = new URL(d.authorize);
  url.search = new URLSearchParams({
    response_type: 'code',
    client_id: p.clientId,
    redirect_uri: p.redirectUri,
    state: p.state,
    scope: p.scope ?? REQUESTED_SCOPE,
    resource: d.resource,
    code_challenge: p.challenge,
    code_challenge_method: 'S256',
  }).toString();
  return url.href;
}

/** The code from the sign-in window's final URL, only if it answers this request. */
export function codeFromRedirect(redirected: string, redirectUri: string, state: string): string {
  const url = new URL(redirected), expected = new URL(redirectUri);
  if (url.origin !== expected.origin || url.pathname !== expected.pathname) throw new OAuthError('invalid_redirect', 'The sign-in returned to an unexpected address.');
  if (url.searchParams.get('state') !== state) throw new OAuthError('invalid_state', 'The sign-in response did not match this request.');
  const error = url.searchParams.get('error');
  if (error) throw new OAuthError(error, error === 'access_denied' ? 'Access was denied.' : url.searchParams.get('error_description') ?? `Sign-in failed: ${error}.`);
  const code = url.searchParams.get('code');
  if (!code) throw new OAuthError('invalid_response', 'The sign-in response had no code.');
  return code;
}

export interface TokenSet { accessToken: string; refreshToken?: string; expiresAt: number; scope: string[] }

async function tokenRequest(d: Discovery, params: Record<string, string>, fetchFn: FetchLike, now: number): Promise<TokenSet> {
  const response = await fetchFn(d.token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ ...params, resource: d.resource }).toString(),
  });
  const body = (await response.json().catch(() => ({}))) as { access_token?: unknown; refresh_token?: unknown; expires_in?: unknown; scope?: unknown; error?: string; error_description?: string };
  if (!response.ok || typeof body.access_token !== 'string') throw new OAuthError(body.error ?? 'token_failed', body.error_description ?? `Token request failed (${response.status}).`);
  return {
    accessToken: body.access_token,
    ...(typeof body.refresh_token === 'string' ? { refreshToken: body.refresh_token } : {}),
    expiresAt: now + (typeof body.expires_in === 'number' ? body.expires_in : 3600) * 1000,
    scope: typeof body.scope === 'string' ? body.scope.split(' ').filter(Boolean) : [],
  };
}

export const exchangeCode = (d: Discovery, p: { clientId: string; code: string; redirectUri: string; verifier: string }, fetchFn: FetchLike, now = Date.now()) =>
  tokenRequest(d, { grant_type: 'authorization_code', code: p.code, client_id: p.clientId, redirect_uri: p.redirectUri, code_verifier: p.verifier }, fetchFn, now);

export const refreshTokens = (d: Discovery, p: { clientId: string; refreshToken: string }, fetchFn: FetchLike, now = Date.now()) =>
  tokenRequest(d, { grant_type: 'refresh_token', refresh_token: p.refreshToken, client_id: p.clientId }, fetchFn, now);

/** Best effort: the grant also stays revocable in Studio → Client access. */
export async function revokeToken(d: Discovery, p: { clientId: string; token: string }, fetchFn: FetchLike): Promise<void> {
  if (!d.revoke) return;
  await fetchFn(d.revoke, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ token: p.token, client_id: p.clientId, token_type_hint: 'refresh_token' }).toString(),
  });
}

function jwtPayload(token: string): Record<string, unknown> | null {
  const part = token.split('.')[1];
  if (!part) return null;
  try {
    return JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/'))) as Record<string, unknown>;
  } catch {
    return null;
  }
}
/** The scope a token claims, for choosing a probe and for display; the server enforces. */
export function scopeOfJwt(token: string): string[] | null {
  const scope = jwtPayload(token)?.scope;
  return typeof scope === 'string' ? scope.split(' ').filter(Boolean) : null;
}
export function expiryOfJwt(token: string): number | undefined {
  const exp = jwtPayload(token)?.exp;
  return typeof exp === 'number' ? exp * 1000 : undefined;
}
