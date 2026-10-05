import type { FetchLike } from './types.ts';
import type { BlygLocation } from './url.ts';

export interface Discovery {
  origin: string;
  mount: string;
  resource: string;
  issuer: string;
  authorize: string;
  token: string;
  register: string;
  revoke?: string;
  /** Operations that accept Idempotency-Key (Plan 1). */
  idempotency: string[];
  /** Publish preconditions the node accepts (Plan 1). */
  preconditions: string[];
}

export class DiscoveryError extends Error {
  constructor(readonly step: 'api' | 'resource' | 'issuer', message: string) {
    super(message);
    this.name = 'DiscoveryError';
  }
}

const onBlyg = (location: BlygLocation, url: string) => URL.canParse(url) && new URL(url).origin === location.origin;
const underMount = (location: BlygLocation, url: string) => {
  if (!onBlyg(location, url)) return false;
  const path = new URL(url).pathname;
  return path === location.mount || path.startsWith(`${location.mount}/`);
};

async function getJson(fetchFn: FetchLike, url: string, step: DiscoveryError['step']) {
  let response: Response;
  try {
    response = await fetchFn(url);
  } catch {
    throw new DiscoveryError(step, `Could not reach ${url}.`);
  }
  if (!response.ok) throw new DiscoveryError(step, `${url} answered ${response.status}.`);
  try {
    return (await response.json()) as Record<string, unknown>;
  } catch {
    throw new DiscoveryError(step, `${url} did not return JSON.`);
  }
}

const strings = (value: unknown) => (Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []);

/**
 * RFC 9728 then RFC 8414, everything under the blyg's mount (spec §3.1,
 * invariant 2). A placeholder bearer makes /api answer a CORS-readable 401
 * whose challenge names the resource metadata.
 */
export async function discover(location: BlygLocation, fetchFn: FetchLike): Promise<Discovery> {
  let challenge: string | null = null;
  try {
    const response = await fetchFn(`${location.origin}/api/settings`, { headers: { Authorization: 'Bearer discovery' } });
    if (response.status === 401) challenge = response.headers.get('www-authenticate');
  } catch {
    throw new DiscoveryError('api', `Could not reach ${location.origin}.`);
  }
  const metadataUrl = challenge?.match(/resource_metadata="([^"]+)"/)?.[1];
  if (!metadataUrl) throw new DiscoveryError('api', `${location.origin} did not answer like a Blygger Studio.`);
  if (!underMount(location, metadataUrl)) throw new DiscoveryError('api', 'The resource metadata is not under this blyg.');
  const resource = await getJson(fetchFn, metadataUrl, 'resource');
  const issuer = Array.isArray(resource.authorization_servers) ? resource.authorization_servers[0] : undefined;
  if (typeof issuer !== 'string' || !underMount(location, issuer)) throw new DiscoveryError('resource', 'The authorization server is not under this blyg.');
  if (typeof resource.resource !== 'string' || !onBlyg(location, resource.resource)) throw new DiscoveryError('resource', 'The API resource is not on this blyg.');
  const meta = await getJson(fetchFn, `${issuer}/.well-known/oauth-authorization-server`, 'issuer');
  const endpoint = (key: string) => {
    const value = meta[key];
    return typeof value === 'string' && onBlyg(location, value) ? value : undefined;
  };
  const required = (key: string) => {
    const value = endpoint(key);
    if (!value) throw new DiscoveryError('issuer', `The authorization server lists no ${key}.`);
    return value;
  };
  return {
    origin: location.origin,
    mount: location.mount,
    resource: resource.resource,
    issuer,
    authorize: required('authorization_endpoint'),
    token: required('token_endpoint'),
    register: required('registration_endpoint'),
    revoke: endpoint('revocation_endpoint'),
    idempotency: strings(resource.idempotency_key_operations),
    preconditions: strings(resource.publish_preconditions),
  };
}
