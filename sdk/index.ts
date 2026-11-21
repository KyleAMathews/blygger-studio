import { createClient, type Config } from "./generated/client/index.js";
export * as BlyggerApi from "./generated/sdk.gen.js";
export type * from "./generated/types.gen.js";
export type BlyggerClient = ReturnType<typeof createClient>;
export type BlyggerClientOptions = Config & { conditionalReads?: boolean };
import { conditionalReadFetch } from "./conditional-reads.js";
export { ReadSupersededError } from "./conditional-reads.js";

/** Each server request should create its own client to keep credentials isolated. */
export const createBlyggerClient = (options: BlyggerClientOptions = {}) => {
  const { conditionalReads, ...config } = options;
  const client = createClient(config);
  if (conditionalReads) {
    const eligibleRequests = new WeakSet<Request>();
    client.setConfig({ fetch: conditionalReadFetch(config.baseUrl ?? '', config.fetch ?? ((input, init) => globalThis.fetch(input, init)), request => eligibleRequests.add(request)) });
    // Generated error fields normalize falsy values. Only eligible cancellation
    // bypasses result modes; passthrough requests keep their ordinary results.
    client.interceptors.error.use((error, _response, request) => {
      if (request?.signal.aborted && eligibleRequests.has(request)) throw request.signal.reason;
      return error;
    });
  }
  return client;
};

export class BlyggerApiError extends Error {
  constructor(readonly statusCode: number, readonly body: unknown) {
    super(typeof body === "object" && body !== null && "message" in body ? String(body.message) : `API request failed (${statusCode})`);
    this.name = "BlyggerApiError";
  }
}

/** Optional throwing interface; generated methods also expose typed data/error/response fields. */
export async function unwrap<T>(pending: Promise<{ data?: T; error?: unknown; response?: Response }>): Promise<T> {
  const result = await pending;
  if (!result.response) throw result.error;
  if (!result.response.ok) throw new BlyggerApiError(result.response.status, result.error);
  return result.data as T;
}

/**
 * The subscription id that names one of the owner's own items wherever the API
 * names an item by subscription and remote id (hopper membership, shelf entries):
 * the remote id is then the item id.
 */
export const OWN_SUBSCRIPTION = "~own";
