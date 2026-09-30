import { BlyggerApi, type BlyggerClient } from "../sdk/dist/browser.js";
import operationJson from "../build/studio-operations.txt";

type Operation = { name: string; method: string; path: string; body: boolean; parameters: { name: string; in: string; type?: string }[] };
type Call = (options: { client: BlyggerClient; body?: unknown; path: Record<string, string>; query: Record<string, unknown>; signal?: AbortSignal }) => Promise<{ data?: unknown; error?: unknown; response?: Response }>;
const operations = JSON.parse(operationJson) as Operation[];

/** Adapts the legacy UI's Response-based handlers to generated, named SDK methods. */
export async function sdkRequest(client: BlyggerClient, input: string, init: RequestInit = {}) {
  const url = new URL(input, "https://studio.invalid");
  let path = url.pathname;
  const body: Record<string, unknown> = init.body instanceof FormData ? Object.fromEntries(init.body.entries()) : typeof init.body === "string" ? JSON.parse(init.body) : {};
  const legacy = path.match(/\/studio\/(preview-thread|preview|fragments\/search|versions\/([^/]+)\/([^/]+))$/);
  if (legacy) {
    if (legacy[1] === "preview-thread") { path = "/api/preview"; body.kind = "thread"; }
    else if (legacy[1] === "preview") path = "/api/preview";
    else if (legacy[1] === "fragments/search") {
      path = "/api/search";
      url.searchParams.set("offset", String(Math.max(0, Math.floor(Number(url.searchParams.get("offset")) || 0))));
    }
    else path = `/api/items/${legacy[2]}/versions/${legacy[3]}`;
  }
  const method = (init.method ?? "GET").toUpperCase();
  for (const operation of operations) {
    if (operation.method !== method) continue;
    const names: string[] = [];
    const pattern = operation.path.replace(/\{(\w+)\}/g, (_, name: string) => { names.push(name); return "([^/]+)"; });
    const match = path.match(new RegExp(`^${pattern}$`));
    if (!match) continue;
    const params: Record<string, string> = {}, query: Record<string, unknown> = {};
    names.forEach((name, i) => { params[name] = decodeURIComponent(match[i + 1]); });
    for (const parameter of operation.parameters) {
      const value = url.searchParams.get(parameter.name);
      if (parameter.in === "query" && value !== null) query[parameter.name] = ["number", "integer"].includes(parameter.type ?? "") ? Number(value) : value;
    }
    const call = (BlyggerApi as unknown as Record<string, Call>)[operation.name];
    const result = await call({ client, path: params, query, ...(operation.body ? { body } : {}), signal: init.signal ?? undefined });
    if (!result.response) throw result.error;
    return Response.json(result.response.ok ? result.data : result.error, { status: result.response.status });
  }
  throw new Error(`No SDK operation for ${method} ${path}`);
}
