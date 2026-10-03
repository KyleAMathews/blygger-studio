import { contractApp, readJson } from "../contract/app.ts";
import { routes } from "../contract/routes.ts";
// Owner-only mention visibility. This edit does not publish a version.

import { getInbound, setMentionHidden } from "./store.ts";

export const mentionsApi = contractApp();

/**
 * Take one response off the page, or put it back. Deliberately reversible and
 * deliberately not a delete: the row stays in the studio, because "I don't
 * want this on my page" and "this never happened" are different claims.
 */
mentionsApi.openapi(routes.updateMention, async (c) => {
  const row = await getInbound(c.env.DB, c.req.param("id"));
  if (!row) return c.json({ error: "not found" }, 404);
  const body = await readJson<{ hidden: boolean }>(c);
  await setMentionHidden(c.env.DB, row.id, body.hidden);
  return c.json({ ok: true, hidden: body.hidden });
});
