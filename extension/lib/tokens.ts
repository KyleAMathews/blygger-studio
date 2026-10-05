import type { Discovery } from './discovery.ts';
import { OAuthError, refreshTokens, revokeToken, type TokenSet } from './oauth.ts';
import type { KeyValue } from './storage.ts';
import type { FetchLike } from './types.ts';

export interface Connection {
  discovery: Discovery;
  mode: 'oauth' | 'manual';
  scope: string[];
  clientId?: string;
  refreshToken?: string;
  manualToken?: string;
  manualExpiresAt?: number;
  /** Why access ended; set means the panel shows Reconnect. */
  reconnect?: string;
}

export type Status =
  | { state: 'disconnected' }
  | { state: 'connected'; origin: string; mount: string; mode: 'oauth' | 'manual'; scope: string[]; idempotency: string[]; preconditions: string[] }
  | { state: 'reconnect'; origin: string; mount: string; reason: string };

export class ReconnectError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReconnectError';
  }
}

const CONNECTION = 'connection', ACCESS = 'access';
/** Refresh this long before expiry (spec §3.4). */
const SKEW_MS = 60_000;
const ENDED = 'Access ended. Reconnect to keep clipping.';

/**
 * The only owner of tokens (spec §3.4), living in the service worker.
 * Refresh tokens rotate and this server revokes the whole grant on reuse, so
 * one refresh is in flight at a time and the new refresh token is stored
 * before any caller is released. Everything lives in storage: a restarted
 * worker refreshes again from what is stored.
 */
export class TokenStore {
  private inflight?: Promise<string>;

  constructor(
    private readonly local: KeyValue,
    private readonly session: KeyValue,
    private readonly fetchFn: FetchLike,
    private readonly now: () => number = Date.now,
  ) {}

  async connection(): Promise<Connection | undefined> {
    return (await this.local.get(CONNECTION)) as Connection | undefined;
  }

  async status(): Promise<Status> {
    const conn = await this.connection();
    if (!conn) return { state: 'disconnected' };
    const { origin, mount } = conn.discovery;
    if (conn.reconnect) return { state: 'reconnect', origin, mount, reason: conn.reconnect };
    return { state: 'connected', origin, mount, mode: conn.mode, scope: conn.scope, idempotency: conn.discovery.idempotency, preconditions: conn.discovery.preconditions };
  }

  async saveOAuth(discovery: Discovery, clientId: string, tokens: TokenSet) {
    await this.inflight?.catch(() => {});
    const conn: Connection = { discovery, mode: 'oauth', clientId, refreshToken: tokens.refreshToken, scope: tokens.scope };
    await this.local.set({ [CONNECTION]: conn });
    await this.session.set({ [ACCESS]: { token: tokens.accessToken, expiresAt: tokens.expiresAt } });
  }

  async saveManual(discovery: Discovery, token: string, scope: string[], expiresAt?: number) {
    await this.inflight?.catch(() => {});
    const conn: Connection = { discovery, mode: 'manual', manualToken: token, scope, ...(expiresAt === undefined ? {} : { manualExpiresAt: expiresAt }) };
    await this.session.remove([ACCESS]);
    await this.local.set({ [CONNECTION]: conn });
  }

  async accessToken(): Promise<string> {
    const conn = await this.connection();
    if (!conn) throw new ReconnectError('Not connected.');
    if (conn.reconnect) throw new ReconnectError(conn.reconnect);
    if (conn.mode === 'manual') {
      if (conn.manualExpiresAt !== undefined && conn.manualExpiresAt - SKEW_MS <= this.now()) throw await this.endAccess(conn, 'The token expired. Mint a new one in Studio → Client access.');
      return conn.manualToken!;
    }
    const cached = (await this.session.get(ACCESS)) as { token: string; expiresAt: number } | undefined;
    if (cached && cached.expiresAt - SKEW_MS > this.now()) return cached.token;
    this.inflight ??= this.refresh(conn).finally(() => { this.inflight = undefined; });
    return this.inflight;
  }

  /** Manual tokens are not revoked on purpose: the owner minted them and manages them in Studio → Client access. */
  async disconnect() {
    await this.inflight?.catch(() => {});
    const conn = await this.connection();
    if (conn?.mode === 'oauth' && conn.clientId && conn.refreshToken)
      await revokeToken(conn.discovery, { clientId: conn.clientId, token: conn.refreshToken }, this.fetchFn).catch(() => {});
    await this.session.remove([ACCESS]);
    await this.local.remove([CONNECTION]);
  }

  private async stillHolds(conn: Connection): Promise<boolean> {
    const stored = await this.connection();
    return !!stored && stored.refreshToken === conn.refreshToken && stored.clientId === conn.clientId && stored.manualToken === conn.manualToken && stored.mode === conn.mode;
  }

  private async endAccess(conn: Connection, reason: string) {
    if (!(await this.stillHolds(conn))) return new ReconnectError(reason);
    await this.session.remove([ACCESS]);
    const ended: Connection = { ...conn, refreshToken: undefined, manualToken: undefined, reconnect: reason };
    await this.local.set({ [CONNECTION]: ended });
    return new ReconnectError(reason);
  }

  private async refresh(conn: Connection): Promise<string> {
    const fresh = (await this.session.get(ACCESS)) as { token: string; expiresAt: number } | undefined;
    if (fresh && fresh.expiresAt - SKEW_MS > this.now()) return fresh.token;
    if (!conn.refreshToken || !conn.clientId) throw await this.endAccess(conn, ENDED);
    let tokens: TokenSet;
    try {
      tokens = await refreshTokens(conn.discovery, { clientId: conn.clientId, refreshToken: conn.refreshToken }, this.fetchFn, this.now());
    } catch (error) {
      if (error instanceof OAuthError && ['invalid_grant', 'invalid_client', 'unauthorized_client'].includes(error.code)) throw await this.endAccess(conn, ENDED);
      throw error;
    }
    if (!(await this.stillHolds(conn))) throw new ReconnectError('The connection changed while refreshing.');
    // The rotated refresh token is stored before any caller is released (spec §3.4).
    const next: Connection = { ...conn, refreshToken: tokens.refreshToken ?? conn.refreshToken, scope: tokens.scope.length ? tokens.scope : conn.scope };
    await this.local.set({ [CONNECTION]: next });
    await this.session.set({ [ACCESS]: { token: tokens.accessToken, expiresAt: tokens.expiresAt } });
    return tokens.accessToken;
  }
}
