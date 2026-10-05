# Clipper Plan 3a: Extension Skeleton, Connection and Tokens

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Chrome extension whose side panel connects to any blyg, over OAuth or a manually minted token, and keeps that connection safely in its service worker, ready for clipping (Plan 3b).

**Architecture:** WXT builds a Manifest V3 extension from `extension/`, using the repo's root dependencies. Logic that talks to the blyg lives in plain TypeScript modules under `extension/lib/` with an injected `fetch`, so the Worker test pool can drive them against the real server. Those modules are URL normalisation, discovery, OAuth with PKCE, the token store and the connect flows. The background worker owns all tokens and answers the panel over `runtime` messages. The React side panel reuses Plan 2's `createStudioData`, `host.ts` and `primitives.tsx`.

**Tech Stack:** WXT 0.21.4 with `@wxt-dev/module-react` 1.2.2, React 19, TanStack DB, the generated SDK, vitest (with `WxtVitest` and `fakeBrowser` for extension units, and the existing Workers pool for server laws), and Playwright with a persistent Chromium context for the e2e.

**Spec:** `docs/superpowers/specs/2026-10-05-chrome-clipper-design.md`, §2, §3, §6 and the laws L4, L5 and L9 in §7.1. This is Plan 3a of 3a–3c. 3b covers capture, compose, the draft and the inbox. 3c covers saving, the queue, recent clips, the full oracle campaign, the clipper mutation runner and packaging.

## Global Constraints

- **Manifest:**
  - `permissions` are exactly `contextMenus`, `sidePanel`, `activeTab`, `scripting`, `identity`, `storage`, `alarms`. No `host_permissions`.
  - `minimum_chrome_version: "116"`. `name: "Blygger Clipper"`. Its own `version: "0.1.0"`, independent of `CLIENT.version`.
  - `key` is a pinned public key, and the derived ID is recorded in `extension/lib/identity.ts`.
- **Requested scope:** `owner:read owner:draft owner:publish owner:manage offline_access`. `resource` is `{origin}/api`. PKCE S256 with a 64-character verifier.
- **Registration body:** `client_name: "Blygger Clipper"`, `redirect_uris: [chrome.identity.getRedirectURL()]`, `token_endpoint_auth_method: "none"`, `grant_types: ["authorization_code","refresh_token"]`, `response_types: ["code"]`.
- **Discovery** is only RFC 9728 then RFC 8414 under the mount:
  - `GET {origin}/api/settings` with `Authorization: Bearer discovery`.
  - Then `resource_metadata` from `WWW-Authenticate`.
  - Then `{issuer}/.well-known/oauth-authorization-server`.
  - Every discovered URL must sit on the blyg's origin, and the metadata and issuer must sit under its mount. Never request a host-root `/.well-known`.
- **Only the service worker reads or writes tokens:**
  - The access token lives in `storage.session` under `access`. The connection, including the refresh token, lives in `storage.local` under `connection`.
  - It refreshes when the access token is within 60 s of expiry, with one refresh in flight shared by all callers.
  - It stores the new refresh token before any caller is released.
  - `invalid_grant`, `invalid_client` or `unauthorized_client` on refresh ends access (Reconnect). A network failure leaves the stored token for the next attempt.
- **Ruling, recorded:** the spec's "refresh in-flight mark" is not persisted. In the final spec its only effect is "on wake, refresh from the stored token", and a restarted worker does exactly that with no mark. A mark with no behaviour would be dead state. The lost-rotation case is still tested (Task 4).
- **Manual token** (spec §3.5):
  - Read the scope from the JWT payload.
  - Probe with `GET /api/settings` when the token has `owner:read`, else with `POST /api/preview {kind:"thread",content_md:""}` when it has `owner:draft`, else refuse with "This token cannot clip. Mint one with the draft permission."
  - A 401 on the probe means "This token is not valid here, or it has expired." There is no refresh; at expiry the panel asks for a new token.
- **Blyg URL normalisation:**
  - Add `https://` when no scheme is given. Upgrade `http` to `https` except on loopback (`localhost`, `127.0.0.1`, `[::1]`).
  - Drop the query and hash. Strip trailing slashes and a trailing `/studio`.
  - `mount` has no trailing slash; `url` is `origin + mount + "/"`.
- **Ruling, recorded:** the extension uses the **root** `package.json` dependencies (WXT runs with `extension/` as its root). A separate `extension/package.json` would install a second React that the shared `src/ui` modules could not see.
- **Plan 2 rules for the panel:**
  - Key the connected tree on the data instance (by origin) and `dispose()` it on change.
  - Keep the client stable (one per instance).
  - Call `configureHost` before rendering consumers.
  - Never import `src/ui/app.tsx`.
  - Mount `<SheetHost/>`.
- **Approved test files:** `extension/tests/*.test.ts`, `test/clipper-oauth.test.ts` (extend it), and `e2e/clipper.spec.ts`. No others.
- Node is `/usr/local/bin/node`; prefix commands with `PATH=/usr/local/bin:$PATH`. npm installs need `--legacy-peer-deps`. Work in `/Users/kylemathews/programs/blygger-studio/.worktrees/chrome-clipper`.

## Review Focus

1. **Typed addresses.** `example.com`, `example.com/blyg`, `https://example.com/blyg/studio/`, `http://example.com` (upgraded) and an address with surrounding spaces must all normalise correctly, and an empty or garbage value must give a plain message. Test in Task 2.
2. **The owner cancels the sign-in window.** That must end with "Sign-in was cancelled.", not re-register and reopen the window. Test in Task 4.
3. **The address is a website, not a Blygger Studio.** Discovery must fail with a message naming what went wrong, and not hang or throw a raw TypeError. Test in Task 2.
4. **Consent with drafting unticked.** The connection must record the narrower scope so the panel can say it cannot clip. Test in Task 4 (status scope), with the message rendered in Task 6.
5. **Reopening the panel.** A reloaded panel must still show the connection, because it lives in the worker's storage, not the page. Test in Task 6.

---

## File Structure

| File | Responsibility |
|---|---|
| `extension/wxt.config.ts` | WXT config and manifest |
| `extension/tsconfig.json` | Extension type-check, extending `.wxt/tsconfig.json` |
| `extension/vitest.config.ts` | Extension unit tests (`WxtVitest`) |
| `extension/lib/identity.ts` | Pinned public key and extension ID |
| `extension/lib/types.ts` | `FetchLike` |
| `extension/lib/url.ts` | `normalizeBlygUrl` |
| `extension/lib/discovery.ts` | `discover`, `DiscoveryError` |
| `extension/lib/oauth.ts` | PKCE, register, authorize URL, redirect parsing, token requests, revoke, JWT scope and expiry |
| `extension/lib/storage.ts` | `KeyValue`, `storageArea`, `memoryArea` |
| `extension/lib/tokens.ts` | `TokenStore`, `Connection`, `Status`, `ReconnectError` |
| `extension/lib/connect.ts` | `connectOAuth`, `connectManual`, `ManualTokenError` |
| `extension/lib/messages.ts` | Panel↔worker protocol: `serve`, `ask`, `WorkerError` |
| `extension/entrypoints/background.ts` | Wires the store, the connect flows and messages |
| `extension/entrypoints/sidepanel/index.html`, `main.tsx` | Panel entry |
| `extension/panel/App.tsx`, `Connect.tsx`, `panel.css` | Panel UI |
| `extension/tests/manifest.test.ts`, `url.test.ts`, `oauth.test.ts`, `connect.test.ts`, `messages.test.ts` | Extension unit tests |
| `test/clipper-oauth.test.ts` (extend) | Discovery, OAuth, token and manual-connect laws against the real Worker |
| `e2e/clipper.spec.ts` (create) | The built extension in Chromium against the e2e server |
| `package.json`, `.gitignore`, `.github/workflows/check.yml` | Scripts, ignores, CI |
| `scripts/verify-auth-security-mutations.ts` (modify) | Controls for this plan's worker-pool laws |
| `extension/README.md`, `docs/client-access.md` | Docs |

---

### Task 1: Skeleton, manifest and the pinned key

**Files:**
- Create: `extension/wxt.config.ts`, `extension/tsconfig.json`, `extension/vitest.config.ts`, `extension/lib/identity.ts`, `extension/entrypoints/background.ts` (stub), `extension/entrypoints/sidepanel/index.html`, `extension/entrypoints/sidepanel/main.tsx` (stub), `extension/tests/manifest.test.ts`
- Modify: `package.json`, `.gitignore`

**Interfaces:**
- Produces: `PUBLIC_KEY: string` and `EXTENSION_ID: string` (`extension/lib/identity.ts`).
- Scripts: `ext:prepare`, `ext:dev`, `ext:build`, `ext:zip`, `test:ext`.
- `typecheck` also checks the extension, and `test:e2e` builds the extension first.

- [ ] **Step 1: Install WXT at the root**

```bash
cd /Users/kylemathews/programs/blygger-studio/.worktrees/chrome-clipper
PATH=/usr/local/bin:$PATH npm install --save-dev --legacy-peer-deps wxt@0.21.4 @wxt-dev/module-react@1.2.2
```

Expected: `package.json` devDependencies gain both packages. `package-lock.json` changes.

- [ ] **Step 2: Generate the development key (outside the repo)**

```bash
openssl genrsa 2048 > ~/.blygger-clipper-dev-key.pem
/usr/local/bin/node -e "const c=require('crypto');const pub=c.createPublicKey(require('fs').readFileSync(process.argv[1])).export({type:'spki',format:'der'});const h=c.createHash('sha256').update(pub).digest('hex').slice(0,32);console.log(pub.toString('base64'));console.log([...h].map(x=>String.fromCharCode(97+parseInt(x,16))).join(''))" ~/.blygger-clipper-dev-key.pem
```

Expected: two lines, the base64 public key and a 32-letter ID (letters `a`–`p`). The private key stays in your home directory. Never commit it.

- [ ] **Step 3: Write the failing manifest test**

`extension/tests/manifest.test.ts`:

```ts
// The manifest is a security boundary: these permissions and no host access
// (spec §8). The pinned key fixes the extension ID, and so the OAuth redirect.
import { createHash } from 'node:crypto';
import { expect, test } from 'vitest';
import config from '../wxt.config.ts';
import { EXTENSION_ID, PUBLIC_KEY } from '../lib/identity.ts';

test('the manifest asks for exactly the spec permissions and no host access', () => {
  const manifest = config.manifest as Record<string, unknown>;
  expect(manifest.permissions).toEqual(['contextMenus', 'sidePanel', 'activeTab', 'scripting', 'identity', 'storage', 'alarms']);
  expect(manifest.host_permissions, 'no host permissions').toBeUndefined();
  expect(manifest.minimum_chrome_version).toBe('116');
  expect(manifest.key).toBe(PUBLIC_KEY);
});

test('the pinned key yields the recorded extension ID', () => {
  const hex = createHash('sha256').update(Buffer.from(PUBLIC_KEY, 'base64')).digest('hex').slice(0, 32);
  expect([...hex].map((d) => String.fromCharCode(97 + parseInt(d, 16))).join('')).toBe(EXTENSION_ID);
});
```

- [ ] **Step 4: Create the config files**

`extension/lib/identity.ts`, with the two values printed in Step 2:

```ts
// The pinned public key (manifest `key`) and the extension ID it yields, so
// development builds keep one OAuth redirect URI. This is a development key;
// the Chrome Web Store listing supplies its own public key at publish time.
export const PUBLIC_KEY = '<base64 public key from Step 2>';
export const EXTENSION_ID = '<32-letter ID from Step 2>';
```

`extension/wxt.config.ts`:

```ts
import { defineConfig } from 'wxt';
import { PUBLIC_KEY } from './lib/identity.ts';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Blygger Clipper',
    description: 'Quote what you read into a draft on your own blyg.',
    version: '0.1.0',
    key: PUBLIC_KEY,
    minimum_chrome_version: '116',
    permissions: ['contextMenus', 'sidePanel', 'activeTab', 'scripting', 'identity', 'storage', 'alarms'],
  },
  // The panel reuses ../src/ui and ../sdk; the dev server must be allowed to read them.
  vite: () => ({ server: { fs: { allow: ['..'] } } }),
});
```

`extension/tsconfig.json`:

```json
{
  "extends": "./.wxt/tsconfig.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "strict": true,
    "noEmit": true,
    "noUnusedLocals": true,
    "allowImportingTsExtensions": true
  },
  "include": [".wxt/wxt.d.ts", "entrypoints", "lib", "panel", "tests", "wxt.config.ts", "vitest.config.ts"]
}
```

`extension/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import { WxtVitest } from 'wxt/testing/vitest-plugin';

export default defineConfig({
  root: import.meta.dirname,
  plugins: [WxtVitest()],
  test: { include: ['tests/**/*.test.ts'], environment: 'node' },
});
```

`extension/entrypoints/background.ts`, a stub that Task 5 replaces:

```ts
export default defineBackground(() => {});
```

`extension/entrypoints/sidepanel/index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Blygger Clipper</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./main.tsx"></script>
  </body>
</html>
```

`extension/entrypoints/sidepanel/main.tsx`, a stub that Task 6 replaces:

```tsx
import { createRoot } from 'react-dom/client';
createRoot(document.getElementById('root')!).render(<p>Blygger Clipper</p>);
```

- [ ] **Step 5: Scripts and ignores**

In `package.json` `scripts`, add:

```json
"ext:prepare": "wxt prepare extension",
"ext:dev": "wxt extension",
"ext:build": "wxt build extension",
"ext:zip": "wxt zip extension",
"test:ext": "vitest run --config extension/vitest.config.ts",
```

Then change two existing scripts:
- `typecheck` becomes `tsc --noEmit && tsc -p tsconfig.ui.json && wxt prepare extension && tsc -p extension/tsconfig.json`
- `test:e2e` becomes `npm run ext:build && playwright test`

Append to `.gitignore`:

```
extension/.output
extension/.wxt
```

- [ ] **Step 6: Run the tests and the build**

```bash
PATH=/usr/local/bin:$PATH npm run ext:prepare
PATH=/usr/local/bin:$PATH npm run test:ext
PATH=/usr/local/bin:$PATH npm run ext:build
PATH=/usr/local/bin:$PATH node -e "const m=require('./extension/.output/chrome-mv3/manifest.json');console.log(m.permissions,m.host_permissions,m.key===require('fs').readFileSync('extension/lib/identity.ts','utf8').match(/PUBLIC_KEY = '([^']+)'/)[1])"
PATH=/usr/local/bin:$PATH npm run typecheck
```

Expected:
- `test:ext`: 2 passed.
- `ext:build` writes `extension/.output/chrome-mv3/manifest.json`, with `background.js` and `sidepanel.html` beside it.
- The node line prints the seven permissions, `undefined` for host permissions, and `true`. WXT may also add `sidePanel` to `side_panel` entries; the permissions list must still be exactly the seven.
- `typecheck` is clean.

If WXT adds a permission of its own in production builds, record it in the report and leave the test as written.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json .gitignore extension/
git commit -m "Scaffold the Blygger Clipper extension with WXT"
```

---

### Task 2: Address normalisation and discovery

**Files:**
- Create: `extension/lib/types.ts`, `extension/lib/url.ts`, `extension/lib/discovery.ts`, `extension/tests/url.test.ts`
- Modify: `test/clipper-oauth.test.ts`

**Interfaces:**
- Produces:
  - `type FetchLike = (input: string, init?: RequestInit) => Promise<Response>`
  - `interface BlygLocation { origin: string; mount: string; url: string }` and `normalizeBlygUrl(input: string): BlygLocation`, which throws `Error` with a plain message
  - `interface Discovery { origin; mount; resource; issuer; authorize; token; register; revoke?: string; idempotency: string[]; preconditions: string[] }`
  - `class DiscoveryError extends Error { step: 'api' | 'resource' | 'issuer' }`
  - `discover(location: BlygLocation, fetchFn: FetchLike): Promise<Discovery>`

- [ ] **Step 1: Write the failing unit tests**

`extension/tests/url.test.ts`:

```ts
import { expect, test } from 'vitest';
import { normalizeBlygUrl } from '../lib/url.ts';
import { discover, DiscoveryError } from '../lib/discovery.ts';

test('typed addresses normalise to an origin, a mount and a canonical URL (Review Focus 1)', () => {
  expect(normalizeBlygUrl('example.com')).toEqual({ origin: 'https://example.com', mount: '', url: 'https://example.com/' });
  expect(normalizeBlygUrl('  example.com/blyg ')).toEqual({ origin: 'https://example.com', mount: '/blyg', url: 'https://example.com/blyg/' });
  expect(normalizeBlygUrl('https://example.com/blyg/studio/')).toEqual({ origin: 'https://example.com', mount: '/blyg', url: 'https://example.com/blyg/' });
  expect(normalizeBlygUrl('http://example.com/blyg/?x=1#y').origin, 'plain http is upgraded').toBe('https://example.com');
  expect(normalizeBlygUrl('http://127.0.0.1:8787').origin, 'loopback keeps http').toBe('http://127.0.0.1:8787');
  expect(normalizeBlygUrl('http://localhost:8787/').url).toBe('http://localhost:8787/');
});

test('empty and unusable addresses give a plain message', () => {
  expect(() => normalizeBlygUrl('   ')).toThrow('Enter your blyg’s address.');
  expect(() => normalizeBlygUrl('https://')).toThrow('That is not a web address.');
  expect(() => normalizeBlygUrl('ftp://example.com')).toThrow('A blyg address starts with https://');
});

test('a website that is not a Blygger Studio fails discovery with a reason (Review Focus 3)', async () => {
  const notStudio = async () => new Response('<html>hello</html>', { status: 200 });
  await expect(discover(normalizeBlygUrl('example.com'), notStudio)).rejects.toMatchObject({ name: 'DiscoveryError', step: 'api', message: 'https://example.com did not answer like a Blygger Studio.' });
  const offline = async () => { throw new TypeError('Failed to fetch'); };
  await expect(discover(normalizeBlygUrl('example.com'), offline)).rejects.toBeInstanceOf(DiscoveryError);
});
```

Append to `test/clipper-oauth.test.ts`. Put the imports with the existing imports at the top of the file:

```ts
import { normalizeBlygUrl } from '../extension/lib/url.ts';
import { discover } from '../extension/lib/discovery.ts';
import type { FetchLike } from '../extension/lib/types.ts';

type Flow = Awaited<ReturnType<typeof flow>>;
/** The extension's fetch, served by the real Worker. `hook` can drop a request before it is sent, or its response after the server answered. */
function workerFetch(f: Flow, hook?: (url: string, init?: RequestInit) => 'pass' | 'drop-before' | 'drop-after'): FetchLike {
  return async (input, init) => {
    const action = hook?.(input, init) ?? 'pass';
    if (action === 'drop-before') throw new TypeError('network down before the request was sent');
    const response = await f.request(input, init);
    if (action === 'drop-after') throw new TypeError('network down after the server answered');
    return response;
  };
}

describe('clipper discovery (L9)', () => {
  it('discovers a mounted blyg through its 401 challenge and metadata under the mount', async () => {
    const f = await flow(), seen: string[] = [];
    const d = await discover(normalizeBlygUrl(f.base + '/blyg/'), workerFetch(f, (url) => { seen.push(url); return 'pass'; }));
    expect(d.issuer).toBe(f.issuer);
    expect(d.resource).toBe(f.base + '/api');
    for (const endpoint of [d.authorize, d.token, d.register]) expect(endpoint.startsWith(f.issuer + '/')).toBe(true);
    expect(d.idempotency).toEqual(['createItem', 'publishItem']);
    expect(d.preconditions).toEqual(['expected']);
    expect(seen.filter((url) => new URL(url).pathname.startsWith('/.well-known')), 'discovery never asks the host root').toEqual([]);
  });

  it('refuses an authorization server off the blyg', async () => {
    const f = await flow(), real = workerFetch(f);
    const hostile: FetchLike = async (url, init) => {
      const response = await real(url, init);
      if (!url.endsWith('/auth/resources/api')) return response;
      return Response.json({ ...(await response.json() as object), authorization_servers: ['https://elsewhere.example/auth'] });
    };
    await expect(discover(normalizeBlygUrl(f.base + '/blyg/'), hostile), 'an issuer off the blyg is refused').rejects.toMatchObject({ name: 'DiscoveryError', step: 'resource' });
  });
});
```

`test/clipper-oauth.test.ts` already imports `describe` and `it` from vitest, and `flow` from `./oauth-flow-driver.ts`. Reuse those imports; do not add them twice.

- [ ] **Step 2: Run them to see them fail**

```bash
PATH=/usr/local/bin:$PATH npm run test:ext
PATH=/usr/local/bin:$PATH node node_modules/.bin/vitest run test/clipper-oauth.test.ts -t "clipper discovery"
```

Expected: both fail with a missing module, `../lib/url.ts` or `../extension/lib/url.ts`.

- [ ] **Step 3: Implement the modules**

`extension/lib/types.ts`:

```ts
/** The one network seam: the extension passes `fetch`, the Worker tests pass the real Worker. */
export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;
```

`extension/lib/url.ts`:

```ts
export interface BlygLocation { origin: string; mount: string; url: string }

const LOOPBACK = new Set(['localhost', '127.0.0.1', '[::1]']);

/** The address the owner typed, as an origin and a mount (spec §3.1). */
export function normalizeBlygUrl(input: string): BlygLocation {
  const trimmed = input.trim();
  if (!trimmed) throw new Error('Enter your blyg’s address.');
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    throw new Error('That is not a web address.');
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error('A blyg address starts with https://');
  if (url.protocol === 'http:' && !LOOPBACK.has(url.hostname)) url.protocol = 'https:';
  const mount = url.pathname.replace(/\/+$/, '').replace(/\/studio$/, '');
  return { origin: url.origin, mount, url: `${url.origin}${mount}/` };
}
```

`extension/lib/discovery.ts`:

```ts
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
```

- [ ] **Step 4: Run the tests**

```bash
PATH=/usr/local/bin:$PATH npm run test:ext
PATH=/usr/local/bin:$PATH node node_modules/.bin/vitest run test/clipper-oauth.test.ts
PATH=/usr/local/bin:$PATH npm run typecheck
```

Expected: all pass, and the earlier Plan 1 tests in `clipper-oauth.test.ts` still pass.

- [ ] **Step 5: Commit**

```bash
git add extension/lib/types.ts extension/lib/url.ts extension/lib/discovery.ts extension/tests/url.test.ts test/clipper-oauth.test.ts
git commit -m "Normalise blyg addresses and discover OAuth under the mount"
```

---

### Task 3: OAuth client module

**Files:**
- Create: `extension/lib/oauth.ts`, `extension/tests/oauth.test.ts`
- Modify: `test/clipper-oauth.test.ts`

**Interfaces:**
- Consumes: `Discovery`, `FetchLike`.
- Produces:
  - `REQUESTED_SCOPE` and `class OAuthError extends Error { code: string }`.
  - `randomVerifier(): string` and `challengeFor(verifier): Promise<string>`.
  - `register(d, redirectUri, fetchFn): Promise<string>`, which returns the client_id.
  - `authorizeUrl(d, { clientId, redirectUri, state, challenge, scope? }): string`.
  - `codeFromRedirect(redirected, redirectUri, state): string`.
  - `interface TokenSet { accessToken: string; refreshToken?: string; expiresAt: number; scope: string[] }`.
  - `exchangeCode(d, { clientId, code, redirectUri, verifier }, fetchFn, now?)` and `refreshTokens(d, { clientId, refreshToken }, fetchFn, now?)`, each `Promise<TokenSet>`.
  - `revokeToken(d, { clientId, token }, fetchFn): Promise<void>`.
  - `scopeOfJwt(token): string[] | null` and `expiryOfJwt(token): number | undefined`.

- [ ] **Step 1: Write the failing tests**

`extension/tests/oauth.test.ts`:

```ts
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
```

Append to `test/clipper-oauth.test.ts`, with the imports at the top:

```ts
import { authorizeUrl, challengeFor, codeFromRedirect, exchangeCode, randomVerifier, register, REQUESTED_SCOPE } from '../extension/lib/oauth.ts';

const REDIRECT = 'https://abcdefghijklmnopabcdefghijklmnop.chromiumapp.org/';
/** The owner approving in the sign-in window: the consent page, the boxes left ticked, then the redirect. */
async function approve(f: Flow, url: string, scopes: string[]) {
  const page = await f.request(url, { headers: { cookie: f.owner } });
  expect(page.status).toBe(200);
  const html = await page.text();
  const handle = html.match(/name="handle" value="([^"]+)"/)![1];
  const binding = page.headers.getSetCookie().map((cookie) => cookie.split(';')[0]).join('; ');
  const decided = await f.request(f.issuer + '/consent', {
    method: 'POST',
    headers: { cookie: `${f.owner}; ${binding}`, Origin: f.base },
    body: new URLSearchParams([['handle', handle], ['decision', 'allow'], ...scopes.map((s) => ['scope', s])]),
  });
  expect(decided.status).toBe(302);
  return decided.headers.get('location')!;
}

describe('clipper OAuth client against the real server', () => {
  it('registers a chromiumapp.org redirect, completes PKCE, and gets the scope the owner left ticked', async () => {
    const f = await flow(), fetchFn = workerFetch(f);
    const d = await discover(normalizeBlygUrl(f.base + '/blyg/'), fetchFn);
    const clientId = await register(d, REDIRECT, fetchFn);
    const verifier = randomVerifier(), state = randomVerifier();
    const url = authorizeUrl(d, { clientId, redirectUri: REDIRECT, state, challenge: await challengeFor(verifier) });
    expect(new URL(url).searchParams.get('scope')).toBe(REQUESTED_SCOPE);
    const code = codeFromRedirect(await approve(f, url, ['owner:read', 'owner:draft']), REDIRECT, state);
    const tokens = await exchangeCode(d, { clientId, code, redirectUri: REDIRECT, verifier }, fetchFn);
    expect(tokens.refreshToken, 'offline_access yields a refresh token').toBeTruthy();
    expect(tokens.scope).toContain('owner:draft');
    expect(tokens.scope, 'unticked scopes are not granted').not.toContain('owner:publish');
    expect((await f.request('/api/settings', { headers: { Authorization: 'Bearer ' + tokens.accessToken } })).status).toBe(200);
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run both commands from Task 2 Step 2. Expected: a missing module, `oauth.ts`.

- [ ] **Step 3: Implement `extension/lib/oauth.ts`**

```ts
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
```

- [ ] **Step 4: Run the tests**

Run both commands from Task 2 Step 4, plus `npm run typecheck`. Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add extension/lib/oauth.ts extension/tests/oauth.test.ts test/clipper-oauth.test.ts
git commit -m "OAuth client for the clipper: PKCE, registration, tokens"
```

---

### Task 4: Token store and the connect flows

**Files:**
- Create: `extension/lib/storage.ts`, `extension/lib/tokens.ts`, `extension/lib/connect.ts`, `extension/tests/connect.test.ts`
- Modify: `test/clipper-oauth.test.ts`

**Interfaces:**
- Consumes: Tasks 2 and 3.
- Produces:
  - Storage: `interface KeyValue { get(key: string): Promise<unknown>; set(items: Record<string, unknown>): Promise<void>; remove(keys: string[]): Promise<void> }`, `storageArea(area)` and `memoryArea()`.
  - Tokens: `interface Connection`, `type Status`, `class ReconnectError`, and `class TokenStore` with `connection()`, `status()`, `saveOAuth(d, clientId, tokens)`, `saveManual(d, token, scope, expiresAt?)`, `accessToken()` and `disconnect()`.
  - Connect: `connectOAuth(input, deps: { fetchFn; store; local; redirectUri; launch }): Promise<Status>`, `connectManual(input, token, deps: { fetchFn; store }): Promise<Status>` and `class ManualTokenError`.

- [ ] **Step 1: Write the failing tests**

`extension/tests/connect.test.ts`:

```ts
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
```

Append to `test/clipper-oauth.test.ts`, with the imports at the top:

```ts
import { connectManual, connectOAuth } from '../extension/lib/connect.ts';
import { memoryArea } from '../extension/lib/storage.ts';
import { ReconnectError, TokenStore } from '../extension/lib/tokens.ts';

const isRefresh = (url: string, init?: RequestInit) => url.endsWith('/oauth2/token') && String(init?.body).includes('grant_type=refresh_token');

/** A connected clipper on fake time: local/session survive a "restart" by building a new store over them. */
async function connected(f: Flow, scopes = ['owner:read', 'owner:draft', 'owner:publish'], hook?: Parameters<typeof workerFetch>[1]) {
  let clock = Date.now();
  const local = memoryArea(), session = memoryArea(), fetchFn = workerFetch(f, hook);
  const store = new TokenStore(local, session, fetchFn, () => clock);
  const status = await connectOAuth(f.base + '/blyg/', { fetchFn, store, local, redirectUri: REDIRECT, launch: (url) => approve(f, url, scopes) });
  return { status, store, local, session, fetchFn, advance: (ms: number) => { clock += ms; }, restart: () => new TokenStore(local, session, fetchFn, () => clock) };
}

describe('clipper token store (L4) and connection (L5)', () => {
  it('records the scope consent left, so the panel can adapt (Review Focus 4)', async () => {
    const c = await connected(await flow(), ['owner:read', 'owner:draft']);
    expect(c.status).toMatchObject({ state: 'connected', mode: 'oauth', idempotency: ['createItem', 'publishItem'] });
    if (c.status.state !== 'connected') throw new Error('fixture');
    expect(c.status.scope).toEqual(expect.arrayContaining(['owner:read', 'owner:draft']));
    expect(c.status.scope).not.toContain('owner:publish');
  });

  it('concurrent callers share one refresh, and the refreshed token works', async () => {
    const f = await flow();
    let refreshes = 0;
    const c = await connected(f, undefined, (url, init) => { if (isRefresh(url, init)) refreshes++; return 'pass'; });
    c.advance(2 * 3600_000);
    const [a, b] = await Promise.all([c.store.accessToken(), c.store.accessToken()]);
    expect(refreshes, 'concurrent callers share one refresh').toBe(1);
    expect(a).toBe(b);
    expect((await f.request('/api/settings', { headers: { Authorization: 'Bearer ' + a } })).status).toBe(200);
  });

  it('a refresh lost after the server rotated ends access, and the grant, cleanly', async () => {
    const f = await flow();
    let drop = false;
    const c = await connected(f, undefined, (url, init) => (drop && isRefresh(url, init) ? 'drop-after' : 'pass'));
    c.advance(2 * 3600_000);
    drop = true;
    await expect(c.store.accessToken()).rejects.toThrow(TypeError);
    drop = false;
    const restarted = c.restart();
    await expect(restarted.accessToken(), 'the spent token is refused and access ends').rejects.toBeInstanceOf(ReconnectError);
    expect(await restarted.status()).toMatchObject({ state: 'reconnect' });
    let sent = 0;
    const counting = new TokenStore(c.local, c.session, async (url, init) => { sent++; return c.fetchFn(url, init); });
    await expect(counting.accessToken()).rejects.toBeInstanceOf(ReconnectError);
    expect(sent, 'reconnect state asks the owner, not the server').toBe(0);
    const grants = await (await f.request('/api/authorizations', { headers: { cookie: f.owner } })).json() as { items: { name: string }[] };
    expect(grants.items.filter((g) => g.name === 'Blygger Clipper'), 'the reused refresh token revoked the grant').toEqual([]);
  });

  it('a refresh that never reached the server is retried from the stored token', async () => {
    const f = await flow();
    let drop = false;
    const c = await connected(f, undefined, (url, init) => (drop && isRefresh(url, init) ? 'drop-before' : 'pass'));
    c.advance(2 * 3600_000);
    drop = true;
    await expect(c.store.accessToken()).rejects.toThrow(TypeError);
    drop = false;
    const token = await c.restart().accessToken();
    expect((await f.request('/api/settings', { headers: { Authorization: 'Bearer ' + token } })).status, 'the stored token still works').toBe(200);
  });

  describe('manual token', () => {
    const mint = async (f: Flow, scope: string[]) => {
      const res = await f.request('/api/authorizations', { method: 'POST', headers: { cookie: f.owner, 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'manual ' + scope.join('+'), scope, resource: 'api' }) });
      expect(res.status).toBe(200);
      return await res.json() as { access_token: string; authorization: { id: string } };
    };
    const store = (f: Flow) => new TokenStore(memoryArea(), memoryArea(), workerFetch(f));

    it('connects a read+draft token and serves it', async () => {
      const f = await flow(), { access_token } = await mint(f, ['owner:read', 'owner:draft']), s = store(f);
      expect(await connectManual(f.base + '/blyg/', access_token, { fetchFn: workerFetch(f), store: s })).toMatchObject({ state: 'connected', mode: 'manual' });
      expect(await s.accessToken()).toBe(access_token);
    });

    it('contrast: a draft-only token connects (L5)', async () => {
      const f = await flow(), { access_token } = await mint(f, ['owner:draft']);
      expect(await connectManual(f.base + '/blyg/', access_token, { fetchFn: workerFetch(f), store: store(f) }), 'a valid draft-only token connects').toMatchObject({ state: 'connected', scope: ['owner:draft'] });
    });

    it('refuses a token that cannot clip, and a revoked one', async () => {
      const f = await flow();
      const readOnly = await mint(f, ['owner:read']);
      await expect(connectManual(f.base + '/blyg/', readOnly.access_token, { fetchFn: workerFetch(f), store: store(f) })).rejects.toThrow('This token cannot clip.');
      const revoked = await mint(f, ['owner:read', 'owner:draft']);
      expect((await f.request('/api/authorizations/' + revoked.authorization.id, { method: 'DELETE', headers: { cookie: f.owner } })).status).toBe(200);
      await expect(connectManual(f.base + '/blyg/', revoked.access_token, { fetchFn: workerFetch(f), store: store(f) }), 'a revoked token is refused').rejects.toThrow('This token is not valid here, or it has expired.');
    });
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run both commands from Task 2 Step 2. Expected: a missing module, `connect.ts`.

- [ ] **Step 3: Implement `extension/lib/storage.ts`**

```ts
/** The storage the token store and drafts need: chrome.storage in the extension, memory in tests. */
export interface KeyValue {
  get(key: string): Promise<unknown>;
  set(items: Record<string, unknown>): Promise<void>;
  remove(keys: string[]): Promise<void>;
}

interface ChromeArea {
  get(keys: string): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
  remove(keys: string[]): Promise<void>;
}

export function storageArea(area: ChromeArea): KeyValue {
  return { get: async (key) => (await area.get(key))[key], set: (items) => area.set(items), remove: (keys) => area.remove(keys) };
}

/** In memory, but serialised like chrome.storage (JSON values only), so tests hold only states the extension can store. */
export function memoryArea(): KeyValue {
  const data = new Map<string, string>();
  return {
    get: async (key) => (data.has(key) ? JSON.parse(data.get(key)!) : undefined),
    set: async (items) => { for (const [key, value] of Object.entries(items)) if (value !== undefined) data.set(key, JSON.stringify(value)); },
    remove: async (keys) => { for (const key of keys) data.delete(key); },
  };
}
```

- [ ] **Step 4: Implement `extension/lib/tokens.ts`**

```ts
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
    const conn: Connection = { discovery, mode: 'oauth', clientId, refreshToken: tokens.refreshToken, scope: tokens.scope };
    await this.local.set({ [CONNECTION]: conn });
    await this.session.set({ [ACCESS]: { token: tokens.accessToken, expiresAt: tokens.expiresAt } });
  }

  async saveManual(discovery: Discovery, token: string, scope: string[], expiresAt?: number) {
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

  async disconnect() {
    const conn = await this.connection();
    if (conn?.mode === 'oauth' && conn.clientId && conn.refreshToken)
      await revokeToken(conn.discovery, { clientId: conn.clientId, token: conn.refreshToken }, this.fetchFn).catch(() => {});
    await this.session.remove([ACCESS]);
    await this.local.remove([CONNECTION]);
  }

  private async endAccess(conn: Connection, reason: string) {
    await this.session.remove([ACCESS]);
    const ended: Connection = { ...conn, refreshToken: undefined, manualToken: undefined, reconnect: reason };
    await this.local.set({ [CONNECTION]: ended });
    return new ReconnectError(reason);
  }

  private async refresh(conn: Connection): Promise<string> {
    if (!conn.refreshToken || !conn.clientId) throw await this.endAccess(conn, ENDED);
    let tokens: TokenSet;
    try {
      tokens = await refreshTokens(conn.discovery, { clientId: conn.clientId, refreshToken: conn.refreshToken }, this.fetchFn, this.now());
    } catch (error) {
      if (error instanceof OAuthError && ['invalid_grant', 'invalid_client', 'unauthorized_client'].includes(error.code)) throw await this.endAccess(conn, ENDED);
      throw error;
    }
    // The rotated refresh token is stored before any caller is released (spec §3.4).
    const next: Connection = { ...conn, refreshToken: tokens.refreshToken ?? conn.refreshToken, scope: tokens.scope.length ? tokens.scope : conn.scope };
    await this.local.set({ [CONNECTION]: next });
    await this.session.set({ [ACCESS]: { token: tokens.accessToken, expiresAt: tokens.expiresAt } });
    return tokens.accessToken;
  }
}
```

- [ ] **Step 5: Implement `extension/lib/connect.ts`**

```ts
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
const cancelled = (error: unknown) => error instanceof Error && /did not approve|cancel/i.test(error.message);

/**
 * Discover, register (or reuse this blyg's client), sign in through `launch`,
 * and store the grant (spec §3.1–3.3). A reused client the server has since
 * reclaimed fails in the window or at the token exchange; that gets one fresh
 * registration. A cancel is never retried.
 */
export async function connectOAuth(
  input: string,
  deps: { fetchFn: FetchLike; store: TokenStore; local: KeyValue; redirectUri: string; launch: (url: string) => Promise<string | undefined> },
): Promise<Status> {
  const discovery = await discover(normalizeBlygUrl(input), deps.fetchFn);
  const clients = ((await deps.local.get(CLIENTS)) ?? {}) as Record<string, string>;
  const known = clients[discovery.issuer];
  for (const reuse of known ? [true, false] : [false]) {
    const clientId = reuse ? known! : await register(discovery, deps.redirectUri, deps.fetchFn);
    if (!reuse) await deps.local.set({ [CLIENTS]: { ...clients, [discovery.issuer]: clientId } });
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
  let probe: Response;
  if (scope.includes('owner:read')) probe = await deps.fetchFn(`${location.origin}/api/settings`, { headers });
  else if (scope.includes('owner:draft'))
    probe = await deps.fetchFn(`${location.origin}/api/preview`, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'thread', content_md: '' }) });
  else throw new ManualTokenError('This token cannot clip. Mint one with the draft permission.');
  if (probe.status === 401) throw new ManualTokenError('This token is not valid here, or it has expired.');
  if (!probe.ok) throw new ManualTokenError(`This token was refused (${probe.status}).`);
  await deps.store.saveManual(discovery, bearer, scope, expiryOfJwt(bearer));
  return deps.store.status();
}
```

- [ ] **Step 6: Run the tests**

```bash
PATH=/usr/local/bin:$PATH npm run test:ext
PATH=/usr/local/bin:$PATH node node_modules/.bin/vitest run test/clipper-oauth.test.ts
PATH=/usr/local/bin:$PATH npm run typecheck
```

Expected: all pass. If the server's grant list does not name grants `Blygger Clipper` (Step 1's revocation check filters on `name`), read `GET /api/authorizations`' item shape once and filter on the field that holds the client name. Record that in the report.

- [ ] **Step 7: Commit**

```bash
git add extension/lib/storage.ts extension/lib/tokens.ts extension/lib/connect.ts extension/tests/connect.test.ts test/clipper-oauth.test.ts
git commit -m "Token store with single-flight refresh, and OAuth and manual connect"
```

---

### Task 5: Worker messaging and the background entry

**Files:**
- Create: `extension/lib/messages.ts`, `extension/tests/messages.test.ts`
- Rewrite: `extension/entrypoints/background.ts`

**Interfaces:**
- Consumes: Task 4.
- Produces:
  - `type Request` is one of `{type:'status'}`, `{type:'connect';url}`, `{type:'connect-manual';url;token}`, `{type:'access-token'}`, `{type:'disconnect'}`.
  - `interface Replies` maps each type to its reply: `Status` for the status, connect and disconnect requests, `string` for the access token.
  - `serve(handle)` and `ask(request): Promise<Replies[type]>`.
  - `class WorkerError extends Error { reconnect: boolean }`.

- [ ] **Step 1: Write the failing test**

`extension/tests/messages.test.ts`:

```ts
import { beforeEach, expect, test } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { ask, serve, WorkerError } from '../lib/messages.ts';
import { ReconnectError } from '../lib/tokens.ts';

beforeEach(() => fakeBrowser.reset());

test('the panel asks and the worker answers, with errors carried across', async () => {
  serve(async (request) => {
    if (request.type === 'status') return { state: 'disconnected' };
    if (request.type === 'access-token') throw new ReconnectError('Access ended. Reconnect to keep clipping.');
    throw new Error('unexpected');
  });
  expect(await ask({ type: 'status' })).toEqual({ state: 'disconnected' });
  const refused = ask({ type: 'access-token' });
  await expect(refused).rejects.toBeInstanceOf(WorkerError);
  await expect(refused).rejects.toMatchObject({ message: 'Access ended. Reconnect to keep clipping.', reconnect: true });
});

test('messages that are not clipper requests are ignored', async () => {
  serve(async () => 'answered');
  await expect(fakeBrowser.runtime.sendMessage({ type: 'something-else' })).resolves.toBeUndefined();
});
```

- [ ] **Step 2: Run it to see it fail**

Run `PATH=/usr/local/bin:$PATH npm run test:ext`. Expected: a missing module, `messages.ts`.

If the second test fails because `fakeBrowser.runtime.sendMessage` throws "No listeners available" when the listener returns `false`, change its expectation to `rejects.toThrow()`, record that in the report, and keep the first test as written.

- [ ] **Step 3: Implement `extension/lib/messages.ts`**

```ts
import { browser } from 'wxt/browser';
import type { Status } from './tokens.ts';

export type Request =
  | { type: 'status' }
  | { type: 'connect'; url: string }
  | { type: 'connect-manual'; url: string; token: string }
  | { type: 'access-token' }
  | { type: 'disconnect' };

export interface Replies {
  status: Status;
  connect: Status;
  'connect-manual': Status;
  'access-token': string;
  disconnect: Status;
}

type Reply = { ok: true; value: unknown } | { ok: false; error: string; reconnect: boolean };

const TYPES = new Set<string>(['status', 'connect', 'connect-manual', 'access-token', 'disconnect']);
const isRequest = (message: unknown): message is Request =>
  typeof message === 'object' && message !== null && TYPES.has(String((message as { type?: unknown }).type));

export class WorkerError extends Error {
  constructor(message: string, readonly reconnect: boolean) {
    super(message);
    this.name = 'WorkerError';
  }
}

/** The worker side: answer clipper requests; ignore everything else. */
export function serve(handle: (request: Request) => Promise<unknown>) {
  browser.runtime.onMessage.addListener((message: unknown, _sender: unknown, sendResponse: (reply: Reply) => void) => {
    if (!isRequest(message)) return false;
    handle(message).then(
      (value) => sendResponse({ ok: true, value }),
      (error: unknown) => sendResponse({ ok: false, error: error instanceof Error ? error.message : String(error), reconnect: error instanceof Error && error.name === 'ReconnectError' }),
    );
    return true;
  });
}

/** The panel side. */
export async function ask<T extends Request['type']>(request: Extract<Request, { type: T }>): Promise<Replies[T]> {
  const reply = (await browser.runtime.sendMessage(request)) as Reply | undefined;
  if (!reply) throw new WorkerError('The clipper’s background worker did not answer.', false);
  if (!reply.ok) throw new WorkerError(reply.error, reply.reconnect);
  return reply.value as Replies[T];
}
```

- [ ] **Step 4: Rewrite `extension/entrypoints/background.ts`**

```ts
import { browser } from 'wxt/browser';
import { connectManual, connectOAuth } from '../lib/connect.ts';
import { serve } from '../lib/messages.ts';
import { storageArea } from '../lib/storage.ts';
import { TokenStore } from '../lib/tokens.ts';

// The only place tokens live (spec §3.4). Everything here is registered
// synchronously, so a worker woken by a message finds its listener.
export default defineBackground(() => {
  const local = storageArea(browser.storage.local), session = storageArea(browser.storage.session);
  const fetchFn = (input: string, init?: RequestInit) => fetch(input, init);
  const store = new TokenStore(local, session, fetchFn);
  serve(async (request) => {
    switch (request.type) {
      case 'status':
        return store.status();
      case 'connect':
        return connectOAuth(request.url, {
          fetchFn,
          store,
          local,
          redirectUri: browser.identity.getRedirectURL(),
          launch: (url) => browser.identity.launchWebAuthFlow({ url, interactive: true }),
        });
      case 'connect-manual':
        return connectManual(request.url, request.token, { fetchFn, store });
      case 'access-token':
        return store.accessToken();
      case 'disconnect':
        await store.disconnect();
        return store.status();
    }
  });
});
```

- [ ] **Step 5: Run the tests and the build**

```bash
PATH=/usr/local/bin:$PATH npm run test:ext
PATH=/usr/local/bin:$PATH npm run ext:build
PATH=/usr/local/bin:$PATH npm run typecheck
```

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add extension/lib/messages.ts extension/tests/messages.test.ts extension/entrypoints/background.ts
git commit -m "Background worker answers connect, status, token and disconnect"
```

---

### Task 6: The side panel's connect screen, and the e2e

**Files:**
- Create: `extension/panel/App.tsx`, `extension/panel/Connect.tsx`, `extension/panel/panel.css`, `e2e/clipper.spec.ts`
- Rewrite: `extension/entrypoints/sidepanel/main.tsx`

**Interfaces:**
- Consumes:
  - From Task 5: `ask`.
  - From Plan 2: `createStudioData` and `StudioData` (`src/ui/data-core.ts`), `configureHost` (`src/ui/host.ts`), `Button` and `Failure` (`src/ui/primitives.tsx`), and `SheetHost` (`src/ui/sheets.tsx`).
  - From the SDK: `createBlyggerClient` (`sdk/dist/browser.js`).
- Produces: `App`, the panel root. 3b adds the compose view inside `Connected`.

- [ ] **Step 1: Write the failing e2e**

`e2e/clipper.spec.ts`:

```ts
/**
 * The built extension in Chromium against the e2e Studio (127.0.0.1:8787).
 * Playwright cannot drive Chrome's OAuth window, so these connect with a
 * manually minted token (spec §3.5); the OAuth path is covered against the
 * real server in test/clipper-oauth.test.ts.
 */
import { test as base, expect, chromium, type BrowserContext, type Page } from '@playwright/test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const EXTENSION = resolve('extension/.output/chrome-mv3');
const BLYG = 'http://127.0.0.1:8787';

const test = base.extend<{ context: BrowserContext; panel: Page; mint: (scope: string[]) => Promise<string> }>({
  context: async ({}, use) => {
    const context = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(), 'clipper-')), {
      channel: 'chromium',
      args: [`--disable-extensions-except=${EXTENSION}`, `--load-extension=${EXTENSION}`],
    });
    await use(context);
    await context.close();
  },
  panel: async ({ context }, use) => {
    let [worker] = context.serviceWorkers();
    worker ??= await context.waitForEvent('serviceworker');
    const page = await context.newPage();
    await page.goto(`chrome-extension://${new URL(worker.url()).host}/sidepanel.html`);
    await use(page);
  },
  mint: async ({ context }, use) => {
    const login = await context.request.post(`${BLYG}/studio/login`, { form: { password: 'test-password' }, maxRedirects: 0 });
    expect([302, 303]).toContain(login.status());
    await use(async (scope) => {
      const res = await context.request.post(`${BLYG}/api/authorizations`, { data: { name: 'Clipper e2e ' + scope.join('+'), scope, resource: 'api' } });
      expect(res.status()).toBe(200);
      return ((await res.json()) as { access_token: string }).access_token;
    });
  },
});
test.skip(({}, info) => info.project.name !== 'desktop', 'one extension context covers the panel');

async function connectWithToken(panel: Page, token: string) {
  await panel.getByLabel('Your blyg’s address').fill(BLYG);
  await panel.getByText('Advanced: use a token').click();
  await panel.getByLabel('Token from Studio → Client access').fill(token);
  await panel.getByRole('button', { name: 'Connect with token' }).click();
}

test('a manual token connects, survives reopening the panel, and disconnects (Review Focus 5)', async ({ panel, mint, context }) => {
  const token = await mint(['owner:read', 'owner:draft', 'owner:publish']);
  const title = ((await (await context.request.get(`${BLYG}/api/settings`)).json()) as { site_title: string }).site_title;
  await connectWithToken(panel, token);
  await expect(panel.getByText(`Connected to ${title}`)).toBeVisible();
  await expect(panel.getByText('Quote in Blygger')).toBeVisible();
  await panel.reload();
  await expect(panel.getByText(`Connected to ${title}`), 'the connection lives in the worker, not the page').toBeVisible();
  await panel.getByRole('button', { name: 'Disconnect' }).click();
  await expect(panel.getByLabel('Your blyg’s address')).toBeVisible();
});

test('contrast: a draft-only token connects and names the blyg by host', async ({ panel, mint }) => {
  await connectWithToken(panel, await mint(['owner:draft']));
  await expect(panel.getByText('Connected to 127.0.0.1:8787'), 'without read access the panel names the host').toBeVisible();
});

test('a token that cannot clip is refused with the reason', async ({ panel, mint }) => {
  await connectWithToken(panel, await mint(['owner:read']));
  await expect(panel.getByRole('alert')).toContainText('This token cannot clip.');
});
```

- [ ] **Step 2: Run it to see it fail**

```bash
PATH=/usr/local/bin:$PATH npm run ext:build
PATH=/usr/local/bin:$PATH node node_modules/@playwright/test/cli.js test e2e/clipper.spec.ts --project=desktop
```

Expected: FAIL. The stub panel has no "Your blyg’s address" field.

- [ ] **Step 3: Implement the panel**

`extension/entrypoints/sidepanel/main.tsx`:

```tsx
import { createRoot } from 'react-dom/client';
import { SheetHost } from '../../../src/ui/sheets.tsx';
import { App } from '../../panel/App.tsx';
import '../../panel/panel.css';

createRoot(document.getElementById('root')!).render(
  <>
    <App />
    <SheetHost />
  </>,
);
```

`extension/panel/App.tsx`:

```tsx
import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from '@tanstack/react-db';
import { createBlyggerClient } from '../../sdk/dist/browser.js';
import { createStudioData, type StudioData } from '../../src/ui/data-core.ts';
import { configureHost } from '../../src/ui/host.ts';
import { Button, Failure } from '../../src/ui/primitives.tsx';
import { ask } from '../lib/messages.ts';
import type { Status } from '../lib/tokens.ts';
import { Connect } from './Connect.tsx';

export function App() {
  const [status, setStatus] = useState<Status>();
  const [error, setError] = useState<unknown>();
  useEffect(() => {
    ask({ type: 'status' }).then(setStatus, setError);
  }, []);
  if (error) return <main className="panel"><Failure error={error} /></main>;
  if (!status) return <main className="panel"><p className="hint">Loading…</p></main>;
  if (status.state !== 'connected') return <Connect status={status} onStatus={setStatus} />;
  // Keyed by blyg: a change unmounts every consumer before the old data is disposed (Plan 2).
  return <Connected key={`${status.origin}${status.mount}`} status={status} onStatus={setStatus} />;
}

type Connected = Extract<Status, { state: 'connected' }>;

function Connected({ status, onStatus }: { status: Connected; onStatus: (status: Status) => void }) {
  // One client and one data instance per connected blyg; the worker supplies tokens.
  const data = useMemo(() => {
    configureHost({ origin: status.origin, mount: status.mount });
    return createStudioData(
      createBlyggerClient({ baseUrl: status.origin, auth: (auth) => (auth.scheme === 'bearer' ? ask({ type: 'access-token' }) : undefined) }),
    );
  }, [status.origin, status.mount]);
  useEffect(() => () => void data.dispose(), [data]);
  const host = new URL(status.origin).host;
  return (
    <main className="panel">
      <header className="panel-head"><h1>Blygger Clipper</h1></header>
      {status.scope.includes('owner:read') ? <SiteTitle data={data} fallback={host} /> : <p className="connected">Connected to <strong>{host}</strong></p>}
      {status.scope.includes('owner:draft') ? (
        <p className="hint">Select text on any page, right-click and choose <strong>Quote in Blygger</strong>.</p>
      ) : (
        <Failure error="This connection cannot clip: it lacks the draft permission. Disconnect and connect again, leaving drafting ticked." />
      )}
      <Button className="btn btn-ghost" onClick={async () => onStatus(await ask({ type: 'disconnect' }))}>Disconnect</Button>
    </main>
  );
}

function SiteTitle({ data, fallback }: { data: StudioData; fallback: string }) {
  const { data: rows } = useLiveQuery((q) => q.from({ settings: data.settings }));
  return <p className="connected">Connected to <strong>{rows?.[0]?.site_title || fallback}</strong></p>;
}
```

`extension/panel/Connect.tsx`:

```tsx
import { useState } from 'react';
import { Button, Failure } from '../../src/ui/primitives.tsx';
import { ask, type Request } from '../lib/messages.ts';
import type { Status } from '../lib/tokens.ts';

export function Connect({ status, onStatus }: { status: Exclude<Status, { state: 'connected' }>; onStatus: (status: Status) => void }) {
  const [url, setUrl] = useState(status.state === 'reconnect' ? `${status.origin}${status.mount}/` : '');
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const run = async (request: Extract<Request, { type: 'connect' | 'connect-manual' }>) => {
    setBusy(true);
    setError(undefined);
    try {
      onStatus(await ask(request));
    } catch (failure) {
      setError(failure);
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="panel">
      <header className="panel-head"><h1>Blygger Clipper</h1></header>
      {status.state === 'reconnect' ? <p className="notice" role="status">{status.reason}</p> : null}
      <form onSubmit={(event) => { event.preventDefault(); void run({ type: 'connect', url }); }}>
        <label htmlFor="blyg-url">Your blyg’s address</label>
        <input id="blyg-url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="example.com/blyg/" autoComplete="url" required />
        <Button className="btn btn-primary" type="submit" disabled={busy}>Connect</Button>
        <p className="hint">You approve the clipper on your blyg, and can revoke it any time in Studio → Client access. If you are not signed in to Studio, you sign in first.</p>
      </form>
      <details className="advanced">
        <summary>Advanced: use a token</summary>
        <form onSubmit={(event) => { event.preventDefault(); void run({ type: 'connect-manual', url, token }); }}>
          <label htmlFor="manual-token">Token from Studio → Client access</label>
          <textarea id="manual-token" value={token} onChange={(event) => setToken(event.target.value)} rows={3} required />
          <Button className="btn" type="submit" disabled={busy}>Connect with token</Button>
        </form>
      </details>
      <Failure error={error} />
    </main>
  );
}
```

`extension/panel/panel.css`:

```css
/* Panel-only styles. 3b extracts the Studio's tokens for shared components. */
:root { color-scheme: light dark; font: 15px/1.5 system-ui, sans-serif; }
body { margin: 0; }
.panel { padding: 16px; display: grid; gap: 12px; }
.panel-head h1 { font-size: 1.1rem; margin: 0; }
.panel form { display: grid; gap: 8px; }
.panel input, .panel textarea { font: inherit; padding: 6px 8px; border: 1px solid #8888; border-radius: 6px; background: transparent; color: inherit; }
.btn { font: inherit; padding: 6px 12px; border-radius: 6px; border: 1px solid #8888; background: transparent; color: inherit; cursor: pointer; }
.btn-primary { background: #2f5fd0; border-color: #2f5fd0; color: white; }
.btn-ghost { border-color: transparent; justify-self: start; }
.hint { color: #8a8a8a; margin: 0; font-size: 0.9rem; }
.notice { margin: 0; padding: 8px; border-radius: 6px; background: #f3c14b33; }
.error-banner { margin: 0; padding: 8px; border-radius: 6px; background: #e0484833; }
.advanced summary { cursor: pointer; color: #8a8a8a; }
```

- [ ] **Step 4: Build and run the e2e**

```bash
PATH=/usr/local/bin:$PATH npm run ext:build
PATH=/usr/local/bin:$PATH node node_modules/@playwright/test/cli.js test e2e/clipper.spec.ts --project=desktop
PATH=/usr/local/bin:$PATH npm run typecheck
```

Expected: 3 passed; typecheck clean.

If the `serviceworker` event never fires (the extension did not load), check that `extension/.output/chrome-mv3/manifest.json` exists. Record the Chromium version in the report.

- [ ] **Step 5: Commit**

```bash
git add extension/panel extension/entrypoints/sidepanel/main.tsx e2e/clipper.spec.ts
git commit -m "Side panel connect screen, with the extension e2e"
```

---

### Task 7: Mutation controls, docs and CI

**Files:**
- Modify: `scripts/verify-auth-security-mutations.ts`, `.github/workflows/check.yml`, `docs/client-access.md`
- Create: `extension/README.md`

**Interfaces:**
- Consumes: exact source strings from Tasks 2–4 as anchors.

- [ ] **Step 1: Add mutation controls**

Append these to the `controls` array in `scripts/verify-auth-security-mutations.ts`. Each anchor must match the source exactly.

```ts
  { name: 'clipper refresh without single-flight', changes: [{ file: 'extension/lib/tokens.ts', from: 'this.inflight ??= this.refresh(conn).finally(() => { this.inflight = undefined; });\n    return this.inflight;', to: 'return this.refresh(conn);' }], kind: 'worker', test: 'test/clipper-oauth.test.ts', pattern: 'concurrent callers share one refresh', checkpoint: 'concurrent callers share one refresh' },
  { name: 'clipper discovery trusts an issuer off the blyg', changes: [{ file: 'extension/lib/discovery.ts', from: "if (typeof issuer !== 'string' || !underMount(location, issuer))", to: "if (typeof issuer !== 'string')" }], kind: 'worker', test: 'test/clipper-oauth.test.ts', pattern: 'refuses an authorization server off the blyg', checkpoint: 'an issuer off the blyg is refused' },
  { name: 'clipper manual connect skips the probe', changes: [{ file: 'extension/lib/connect.ts', from: "if (probe.status === 401) throw new ManualTokenError('This token is not valid here, or it has expired.');", to: '' }, { file: 'extension/lib/connect.ts', from: "if (!probe.ok) throw new ManualTokenError(`This token was refused (${probe.status}).`);", to: '' }], kind: 'worker', test: 'test/clipper-oauth.test.ts', pattern: 'refuses a token that cannot clip', checkpoint: 'a revoked token is refused' },
  { name: 'clipper ignores the reconnect state', changes: [{ file: 'extension/lib/tokens.ts', from: '    if (conn.reconnect) throw new ReconnectError(conn.reconnect);\n', to: '' }], kind: 'worker', test: 'test/clipper-oauth.test.ts', pattern: 'a refresh lost after the server rotated', checkpoint: 'reconnect state asks the owner, not the server' },
```

The runner copies `src`, `test`, `e2e`, `scripts`, `migrations` and `docs` into its sandbox. Extend that `git ls-files … -- src test e2e scripts migrations docs` list with `extension`, or the sandbox will lack `extension/lib`. Make that change in the runner, and record it in the report.

Run each control:

```bash
for n in "clipper refresh without single-flight" "clipper discovery trusts" "clipper manual connect skips" "clipper ignores the reconnect"; do
  PATH=/usr/local/bin:$PATH node --import tsx scripts/verify-auth-security-mutations.ts "$n" 2>&1 | grep -E "Caught|Survived|Assertion"
done
```

Expected: four `Caught:` lines.

- [ ] **Step 2: CI**

In `.github/workflows/check.yml`, after the `npm run test:ui -- --maxWorkers=2` step, add:

```yaml
      - run: npm run test:ext
```

`npm run test:e2e` already builds the extension (Task 1). `npm run typecheck` already checks it.

- [ ] **Step 3: Docs**

`extension/README.md`:

```markdown
# Blygger Clipper

A Chrome extension that quotes what you read into a draft on your own blyg.

## Develop

    npm run ext:dev        # Chromium with the extension, reloading on change
    npm run ext:build      # extension/.output/chrome-mv3
    npm run ext:zip        # a Web Store zip
    npm run test:ext       # unit tests

Load `extension/.output/chrome-mv3` in `chrome://extensions` with Developer
mode on. The development key in `lib/identity.ts` pins the extension ID, so
the OAuth redirect stays the same between builds. The Web Store listing
supplies its own key at publish time.

## Connecting

Type your blyg's address. The clipper finds its OAuth server under the blyg
(no host-root `.well-known`), registers itself, and opens your blyg's consent
page. Untick anything you do not want it to do; it adapts. Revoke it any time
in Studio → Client access. **Advanced: use a token** accepts a token minted
there instead, for tools and tests that cannot open a sign-in window.

## Permissions

`contextMenus`, `sidePanel`, `activeTab`, `scripting`, `identity`, `storage`,
`alarms`. No host permissions: the clipper reaches your blyg over CORS with
its token, and reads a page only when you clip it.

## Privacy

Clipped text and the page's title, address and author go only to the blyg
you connect. Nothing else is collected or sent anywhere.
```

Append to `docs/client-access.md`:

```markdown
## Blygger Clipper

The Chrome extension in `extension/` is a public OAuth client. It discovers
the authorization server from `/api`'s 401 challenge and the metadata under
the mount, registers a `https://<extension-id>.chromiumapp.org/` redirect, and
requests every owner scope with `offline_access`. The owner can untick any
scope at consent; the clipper adapts. It keeps tokens only in its service
worker, refreshes one at a time, and asks the owner to reconnect when a grant
ends. Owners can instead paste a manual token (the clipper needs
`owner:draft`; with `owner:read` it also shows the blyg's title).
```

- [ ] **Step 4: Full verification**

```bash
PATH=/usr/local/bin:$PATH npm run typecheck
PATH=/usr/local/bin:$PATH npm run test:ui
PATH=/usr/local/bin:$PATH npm run test:ext
PATH=/usr/local/bin:$PATH node node_modules/.bin/vitest run --maxWorkers=2
PATH=/usr/local/bin:$PATH npm run test:e2e
```

Expected: all pass, and e2e includes the 3 clipper tests.

- [ ] **Step 5: Commit**

```bash
git add scripts/verify-auth-security-mutations.ts .github/workflows/check.yml docs/client-access.md extension/README.md
git commit -m "Mutation controls, docs and CI for the clipper connection"
```
