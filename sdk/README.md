# Blygger SDK

JavaScript and TypeScript SDK for the private Studio API. The source in `generated/` comes from Cloudflare Forge; edit the schemas in `src/contract/`, then run `npm run sdk:generate` at the repository root. Generation needs Node 22+, Docker, and network access. The Forge revision and Fern generator version are pinned in `generation.json`.

`npm run build` builds this package for Node, browsers, and Workers. `npm pack ./sdk` creates a distributable package; this repository does not publish it automatically.

```ts
import { BlyggerClient, BlyggerApiError } from "@blygger/sdk";

const client = new BlyggerClient({ baseUrl: location.origin });
const draft = await client.studio.createItem({ content_md: "Hello", kind: "fragment" });
await client.studio.publishItem({ id: draft.id });
const page = await client.studio.listReading({ page: 1 });
```

Browsers send same-origin session cookies. For Node, supply a cookie in `headers` or a custom `fetch` transport. OAuth is planned after the SPA migration. Calls do not retry by default, so a lost write response cannot silently create a second item. Applications can opt into retries explicitly.

Methods throw `BlyggerApiError` with `statusCode` and `body` for API errors. Pass `{ abortSignal }` as the second argument to cancel a request. File uploads accept browser `File`/`Blob`; the Node bundle also supports filesystem streams. Use `.withRawResponse()` when the HTTP status is needed.

Forge's current Fern transformer cannot express cookie authentication. Generation omits cookie security only from its temporary input; the checked-in OpenAPI contract documents it, and the wrapper supplies it. The generated implementation retains Cloudflare's internal class names; the public entry point exports `BlyggerClient`.
