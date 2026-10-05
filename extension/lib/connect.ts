import { discover } from './discovery.ts';
import { authorizeUrl, challengeFor, codeFromRedirect, exchangeCode, expiryOfJwt, OAuthError, randomVerifier, register, scopeOfJwt } from './oauth.ts';
import type { KeyValue } from './storage.ts';
import type { Status, TokenStore } from './tokens.ts';
import type { FetchLike } from './types.ts';
import { normalizeBlygUrl } from './url.ts';

export class ManualTokenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ManualTokenError';
  }
}

const CLIENTS = 'clients';
/** The server drops never-approved clients after 24 h; reuse one only inside this margin. */
const UNAPPROVED_REUSE_MS = 23 * 3600_000;
interface StoredClient { clientId: string; registeredAt: number; approved: boolean }
const cancelled = (error: unknown) => error instanceof Error && /did not approve|cancel/i.test(error.message);

/**
 * Discover, register (or reuse this blyg's client), sign in through `launch`,
 * and store the grant (spec §3.1–3.3). A reused client the server has since
 * reclaimed fails in the window or at the token exchange; that gets one fresh
 * registration. A cancel is never retried.
 */
export async function connectOAuth(
  input: string,
  deps: { fetchFn: FetchLike; store: TokenStore; local: KeyValue; redirectUri: string; launch: (url: string) => Promise<string | undefined>; now?: () => number },
): Promise<Status> {
  const discovery = await discover(normalizeBlygUrl(input), deps.fetchFn);
  const now = deps.now ?? Date.now, key = `${discovery.issuer} ${deps.redirectUri}`;
  const remember = async (entry: StoredClient) => {
    const all = ((await deps.local.get(CLIENTS)) ?? {}) as Record<string, StoredClient>;
    await deps.local.set({ [CLIENTS]: { ...all, [key]: entry } });
  };
  const stored = (((await deps.local.get(CLIENTS)) ?? {}) as Record<string, StoredClient>)[key];
  const known = stored && (stored.approved || now() - stored.registeredAt < UNAPPROVED_REUSE_MS) ? stored.clientId : undefined;
  for (const reuse of known ? [true, false] : [false]) {
    const clientId = reuse ? known! : await register(discovery, deps.redirectUri, deps.fetchFn);
    if (!reuse) await remember({ clientId, registeredAt: now(), approved: false });
    const verifier = randomVerifier(), state = randomVerifier();
    let redirected: string | undefined;
    try {
      redirected = await deps.launch(authorizeUrl(discovery, { clientId, redirectUri: deps.redirectUri, state, challenge: await challengeFor(verifier) }));
    } catch (error) {
      if (cancelled(error)) throw new OAuthError('cancelled', 'Sign-in was cancelled.');
      if (reuse) continue;
      throw error;
    }
    if (!redirected) throw new OAuthError('cancelled', 'Sign-in was cancelled.');
    const code = codeFromRedirect(redirected, deps.redirectUri, state);
    try {
      await deps.store.saveOAuth(discovery, clientId, await exchangeCode(discovery, { clientId, code, redirectUri: deps.redirectUri, verifier }, deps.fetchFn));
      await remember({ clientId, registeredAt: reuse ? stored!.registeredAt : now(), approved: true });
      return deps.store.status();
    } catch (error) {
      if (reuse && error instanceof OAuthError && error.code === 'invalid_client') continue;
      throw error;
    }
  }
  throw new OAuthError('invalid_client', 'This blyg did not accept the clipper. Try again.');
}

/** A token minted in Studio → Client access, checked with a request that changes nothing (spec §3.5). */
export async function connectManual(input: string, token: string, deps: { fetchFn: FetchLike; store: TokenStore }): Promise<Status> {
  const location = normalizeBlygUrl(input);
  const discovery = await discover(location, deps.fetchFn);
  const bearer = token.trim(), scope = scopeOfJwt(bearer) ?? [];
  const headers = { Authorization: `Bearer ${bearer}` };
  if (!scope.includes('owner:draft')) throw new ManualTokenError('This token cannot clip. Mint one with the draft permission.');
  const probe = scope.includes('owner:read')
    ? await deps.fetchFn(`${location.origin}/api/settings`, { headers })
    : await deps.fetchFn(`${location.origin}/api/preview`, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'thread', content_md: '' }) });
  if (probe.status === 401) throw new ManualTokenError('This token is not valid here, or it has expired.');
  if (!probe.ok) throw new ManualTokenError(`This token was refused (${probe.status}).`);
  await deps.store.saveManual(discovery, bearer, scope, expiryOfJwt(bearer));
  return deps.store.status();
}
