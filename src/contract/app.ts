import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import type { MiddlewareHandler } from "hono";
import { OpenAPIHono } from "@hono/zod-openapi";
import type { Env } from "../types.ts";

export function contractApp() {
  const app = new OpenAPIHono<{ Bindings: Env }>({ strict: false, defaultHook: (result, c) => {
    if (!result.success) return c.json({ error: result.error.issues.map(({ path, message }) => `${path.join(".") || "request"}: ${message}`).join("; "), issues: result.error.issues.map(({ path, message }) => ({ path, message })) }, 400);
  } });
  app.onError((error, c) => {
    if (error instanceof HTTPException) return c.json({ error: error.message }, error.status);
    console.error(error);
    return c.json({ error: "internal server error" }, 500);
  });
  return app;
}

/** Optional JSON commands accept an empty body even with a client's default JSON header. */
export const optionalJsonBody: MiddlewareHandler = async (c, next) => {
  if (/^application\/(?:[\w.-]+\+)?json(?:;|$)/i.test(c.req.header("content-type") ?? "") && await c.req.raw.clone().text() === "") {
    const headers = new Headers(c.req.raw.headers);
    headers.delete("content-type");
    c.req.raw = new Request(c.req.raw, { headers });
  }
  return next();
}

export async function readJson<T = Record<string, unknown>>(c: Context) { return await c.req.json<T>(); }
export async function readForm(c: Context) { return await c.req.formData(); }
