import { SELF } from "cloudflare:test";
import { routes } from "../src/contract/routes.ts";

export const BASE = "https://example.com";
/** Matches vitest.config.ts's default-worker MOUNT binding ("/blyg") — studio is nested under it since session 16. */
export const STUDIO = "/blyg/studio";

/** Log in as owner, return the Cookie header value. */
export async function login(password = "test-password"): Promise<string> {
  const res = await SELF.fetch(`${BASE}${STUDIO}/login`, {
    method: "POST",
    body: new URLSearchParams({ password }),
    redirect: "manual",
  });
  const setCookie = res.headers.get("set-cookie");
  if (!setCookie) throw new Error(`login failed: ${res.status}`);
  return setCookie.split(";")[0];
}

export async function apiJson(
  cookie: string,
  method: string,
  path: string,
  body?: unknown,
): Promise<{ status: number; json: any }> {
  const res = await SELF.fetch(`${BASE}${path}`, {
    method,
    headers: { cookie, ...(body !== undefined ? { "content-type": "application/json" } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => null);
  const pathname = new URL(path, BASE).pathname.replace(/^\/api/, "");
  const contract = Object.values(routes).find((route) => route.method === method.toLowerCase() && new RegExp(`^${route.path.replace(/\{\w+\}/g, "[^/]+")}$`).test(pathname));
  if (contract) {
    const definition = contract.responses[res.status];
    const media = definition && "content" in definition ? definition.content?.["application/json"] : undefined;
    const schema = media && "schema" in media ? media.schema : undefined;
    if (!schema || !("safeParse" in schema)) throw new Error(`Missing response contract: ${method} ${path} ${res.status}`);
    const parsed = schema.safeParse(json);
    if (!parsed.success) throw new Error(`Response contract failed: ${method} ${path} ${res.status}: ${parsed.error.message}`);
  }
  return { status: res.status, json };
}

/** Create a draft with content and publish it; returns the item id. */
export async function createAndPublish(cookie: string, contentMd: string, note?: string): Promise<string> {
  const created = await apiJson(cookie, "POST", "/api/items", { content_md: contentMd });
  if (created.status !== 201) throw new Error(`create failed: ${created.status}`);
  const id = created.json.id as string;
  const pub = await apiJson(cookie, "POST", `/api/items/${id}/publish`, note ? { note } : {});
  if (pub.status !== 200) throw new Error(`publish failed: ${pub.status} ${JSON.stringify(pub.json)}`);
  return id;
}

export async function getPublic(path: string): Promise<Response> {
  return SELF.fetch(`${BASE}${path}`);
}
