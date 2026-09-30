# Blygger SDK

JavaScript and TypeScript SDK for the private Studio API. The source in `generated/` comes from Cloudflare Forge; edit the schemas in `src/contract/`, then run `npm run sdk:generate` at the repository root. Generation needs Node 22+, Docker, and network access. The Forge revision and Fern generator version are pinned in `generation.json`.

Download `blygger-sdk-SDK_VERSION.tgz` from a [Studio release](https://github.com/blygger/blygger-studio/releases), check its digest against `SHA256SUMS`, and install it with `npm install ./blygger-sdk-SDK_VERSION.tgz`. Choose the SDK shipped with your Worker release; `release.json` records both versions. The SDK is distributed through GitHub release assets, not the npm registry.

For source builds, `npm run build` builds this package for Node, browsers, and Workers, and `npm pack ./sdk` creates a distributable package.

```ts
import { BlyggerClient, BlyggerApiError } from "@blygger/sdk";

const client = new BlyggerClient({ baseUrl: location.origin });
const draft = await client.studio.createItem({ content_md: "Hello", kind: "fragment" });
await client.studio.publishItem({ id: draft.id });
const page = await client.studio.listReading({ page: 1 });
```

Sign into `/studio` first; the SDK does not create a login session. Browsers send same-origin session cookies. Cross-origin apps are not supported yet. For Node, supply a cookie in `headers` or a custom `fetch` transport. OAuth is planned after the SPA migration. Calls do not retry by default, so a lost write response cannot silently create a second item. Applications can opt into retries explicitly.

Methods throw `BlyggerApiError` with `statusCode` and `body` for API errors. Pass `{ abortSignal }` as the second argument to cancel a request. File uploads accept browser `File`/`Blob`; the Node bundle also supports filesystem streams. Use `.withRawResponse()` when the HTTP status is needed.

Forge's current Fern transformer cannot express cookie authentication. Generation omits cookie security only from its temporary input; the checked-in OpenAPI contract documents it, and the wrapper supplies it. The generated implementation retains Cloudflare's internal class names; the public entry point exports `BlyggerClient`.
