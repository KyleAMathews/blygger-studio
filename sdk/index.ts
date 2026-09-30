import { CloudflareApiClient } from "./generated/Client.js";
import type { BaseClientOptions } from "./generated/BaseClient.js";

/** Same-origin cookie transport, with retries disabled for non-idempotent writes. */
export class BlyggerClient extends CloudflareApiClient {
  constructor(options: BaseClientOptions = {}) {
    const transport = options.fetch ?? globalThis.fetch;
    super({ ...options, maxRetries: options.maxRetries ?? 0, fetch: (input, init) => transport(input, { ...init, credentials: "same-origin" }) });
  }
}
export * as BlyggerApi from "./generated/api/index.js";
export { CloudflareApiError as BlyggerApiError } from "./generated/errors/CloudflareApiError.js";
export type { BaseClientOptions } from "./generated/BaseClient.js";
