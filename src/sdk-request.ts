import { BlyggerClient, BlyggerApiError } from "../sdk/dist/browser.js";
import sdkMap from "../sdk/generated/sdk-map.json";

type Operation = { method: string; httpMethod: string; path: string };
type Call = (request: Record<string, unknown>, options: { abortSignal?: AbortSignal }) => { withRawResponse(): Promise<{ data: unknown; rawResponse: { status: number } }> };
const operations = Object.values(sdkMap) as Operation[];

/** Adapts the legacy UI's Response-based handlers to generated, named SDK methods. */
export async function sdkRequest(client: BlyggerClient, input: string, init: RequestInit = {}) {
  const url = new URL(input, "https://studio.invalid");
  let path = url.pathname;
  const request: Record<string, unknown> = init.body instanceof FormData ? Object.fromEntries(init.body.entries()) : typeof init.body === "string" ? JSON.parse(init.body) : {};
  const legacy = path.match(/\/studio\/(preview-thread|preview|fragments\/search|versions\/([^/]+)\/([^/]+))$/);
  if (legacy) {
    if (legacy[1] === "preview-thread") { path = "/api/preview"; request.kind = "thread"; }
    else if (legacy[1] === "preview") path = "/api/preview";
    else if (legacy[1] === "fragments/search") {
      path = "/api/search";
      url.searchParams.set("offset", String(Math.max(0, Math.floor(Number(url.searchParams.get("offset")) || 0))));
    }
    else path = `/api/items/${legacy[2]}/versions/${legacy[3]}`;
  }
  const method = (init.method ?? "GET").toUpperCase();
  for (const operation of operations) {
    if (operation.httpMethod !== method) continue;
    const names: string[] = [];
    const pattern = operation.path.replace(/\{(\w+)\}/g, (_, name: string) => { names.push(name); return "([^/]+)"; });
    const match = path.match(new RegExp(`^${pattern}$`));
    if (!match) continue;
    for (const [name, value] of url.searchParams) request[name] = value;
    names.forEach((name, i) => { request[name] = decodeURIComponent(match[i + 1]); });
    const call = (client.studio as unknown as Record<string, Call>)[operation.method];
    try {
      const response = await call.call(client.studio, request, { abortSignal: init.signal ?? undefined }).withRawResponse();
      return Response.json(response.data, { status: response.rawResponse.status });
    } catch (e) {
      if (e instanceof BlyggerApiError && e.statusCode) return Response.json(e.body ?? { error: e.message }, { status: e.statusCode });
      throw e;
    }
  }
  throw new Error(`No SDK operation for ${method} ${path}`);
}
