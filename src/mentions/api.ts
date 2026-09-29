// Owner API for mentions — the two editorial controls over the public
// responses list (§3.4). Neither touches items/versions: showing responses is
// a property of the item's *page*, and hiding one is a property of the
// mention row, so neither is a publish event and neither bumps a version.

import { Hono } from "hono";
import { getItem } from "../model.ts";
import type { Env } from "../types.ts";
import { getInbound, setMentionHidden } from "./store.ts";
import { getSettings, itemShowsResponses } from "../model.ts";

export const mentionsApi = new Hono<{ Bindings: Env }>({ strict: false });

/**
 * What one item does about showing its verified responses.
 *
 * Three states since migration 0012, because a global default makes "off" and
 * "no opinion" different things:
 *
 *   "default" → clear the override; follow the global setting from now on,
 *               including when the operator later changes it.
 *   "show" / "hide" → this item decides for itself and ignores the setting.
 *
 * `show: true|false` is still accepted and still means a hard override, so the
 * third-party tools already calling this endpoint keep working and keep
 * meaning what they meant.
 */
mentionsApi.put("/items/:id/responses", async (c) => {
  const item = await getItem(c.env.DB, c.req.param("id"));
  if (!item) return c.json({ error: "not found" }, 404);
  const body = await c.req.json<{ show?: boolean; mode?: string }>().catch(() => ({}) as { show?: boolean; mode?: string });

  let override: number | null;
  if (body.mode === "default") override = null;
  else if (body.mode === "show") override = 1;
  else if (body.mode === "hide") override = 0;
  else if (typeof body.show === "boolean") override = body.show ? 1 : 0;
  else return c.json({ error: 'mode must be "default", "show" or "hide" (or legacy show: boolean)' }, 400);

  await c.env.DB.prepare("UPDATE items SET responses_override = ? WHERE id = ?").bind(override, item.id).run();
  const settings = await getSettings(c.env.DB);
  const fresh = (await getItem(c.env.DB, item.id))!;
  // Report what is actually published, not what was asked for — with a default
  // in play those differ, and the caller cannot compute it without the setting.
  return c.json({ ok: true, override, showing: itemShowsResponses(fresh, settings) });
});

/**
 * Take one response off the page, or put it back. Deliberately reversible and
 * deliberately not a delete: the row stays in the studio, because "I don't
 * want this on my page" and "this never happened" are different claims.
 */
mentionsApi.put("/mentions/:id/hidden", async (c) => {
  const row = await getInbound(c.env.DB, c.req.param("id"));
  if (!row) return c.json({ error: "not found" }, 404);
  const body = await c.req.json<{ hidden?: boolean }>().catch(() => ({}) as { hidden?: boolean });
  if (typeof body.hidden !== "boolean") return c.json({ error: "hidden must be a boolean" }, 400);
  await setMentionHidden(c.env.DB, row.id, body.hidden);
  return c.json({ ok: true, hidden: body.hidden });
});
