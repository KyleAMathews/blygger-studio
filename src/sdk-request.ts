import { BlyggerApi, type BlyggerClient } from "../sdk/dist/browser.js";
import operationJson from "../build/studio-operations.txt";

type Operation = { name: string; method: string; path: string; body: boolean; parameters: { name: string; in: string; type?: string }[] };
type Call = (options: { client: BlyggerClient; body?: unknown; path: Record<string, string>; query: Record<string, unknown>; signal?: AbortSignal }) => Promise<{ data?: unknown; error?: unknown; response?: Response }>;
const operations = JSON.parse(operationJson) as Operation[];

/** Adapts the Studio's Response-based handlers to generated, named SDK methods. */
export async function sdkRequest(client: BlyggerClient, input: string, init: RequestInit = {}) {
  const url = new URL(input, "https://studio.invalid");
  const path = url.pathname;
  const body: Record<string, unknown> = init.body instanceof FormData ? Object.fromEntries(init.body.entries()) : typeof init.body === "string" ? JSON.parse(init.body) : {};
  const method = (init.method ?? "GET").toUpperCase();
  for (const operation of operations) {
    if (operation.method !== method) continue;
    const names: string[] = [];
    const pattern = operation.path.replace(/\{(\w+)\}/g, (_, name: string) => { names.push(name); return "([^/]+)"; });
    const match = path.match(new RegExp(`^${pattern}$`));
    if (!match) continue;
    const params: Record<string, string> = {}, query: Record<string, unknown> = Object.fromEntries(url.searchParams);
    names.forEach((name, i) => { params[name] = decodeURIComponent(match[i + 1]); });
    for (const parameter of operation.parameters) {
      const value = url.searchParams.get(parameter.name);
      if (parameter.in === "query" && value !== null) query[parameter.name] = ["number", "integer"].includes(parameter.type ?? "") ? Number(value) : value;
    }
    const call = (BlyggerApi as unknown as Record<string, Call>)[operation.name];
    const result = await call({ client, path: params, query, ...(operation.body ? { body } : {}), signal: init.signal ?? undefined });
    if (!result.response) throw result.error;
    const headers = new Headers(result.response.headers);
    // The SDK consumed the body. Re-encode it without stale wire-size headers.
    for (const name of ["content-length", "content-encoding", "transfer-encoding"]) headers.delete(name);
    return Response.json(result.response.ok ? result.data : result.error, { status: result.response.status, headers });
  }
  throw new Error(`No SDK operation for ${method} ${path}`);
}
