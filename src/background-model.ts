// Background 4b (blygger-spec docs/background-plan.md §3.3): other blygs'
// changes judged by the change classifier, opt-in. Off unless Settings →
// Background turns on `bg_model_imported` and Settings → AI names a decision
// model in `ai_model_classify`. A `typo` or `minor` label sets the `minor`
// reason, as it does for own items (4a); `major` leaves the entry where the
// measured rules put it.
//
// §14 (Fable, session 61): both texts are fetched text fed to a model, so the
// model is a decision model with a fixed label set, never a text model. An
// injected instruction can at most mislabel one version, which the owner moves
// back. The changelog note is not sent: reading it is the owner's routing
// instruction's business (#96), which this does not build.
//
// Cost: one call per imported new version that the measured rules did not
// already settle. They run on the quarter-hour tick, a few at a time, under the AI
// budget; over it, the measured rules stand for that version and its detail
// says so. Studio-private bookkeeping: a failure here never fails an import.

import { decide, AiBudgetError, ProviderError, platformProviderFetch, type ProviderFetchLike } from "./ai/provider.ts";
import { CLASSIFY_QUESTION, classifierState } from "./change-class.ts";
import { getSettings } from "./model.ts";
import type { Env } from "./types.ts";

/** How many queued versions one quarter-hour tick judges. */
export const CLASSIFY_PER_TICK = 10;

/** Reasons the measured rules settle with no model: such a version is not queued. */
const MEASURED = new Set(["maintenance", "near-same", "quotes-refreshed", "quotes-material"]);

/**
 * Queue an imported new version for the classifier, at import, while the
 * version it replaces is still held. Only a real change to the words of an
 * item already held, with the feature on and a classifier chosen.
 */
export async function queueImportedChange(
  db: D1Database,
  subscriptionId: string,
  remoteId: string,
  next: { kind: string; version?: number; content_md: string; content_hash: string | null },
  held: { hash: string | null; contentMd?: string | null; version?: number | null } | null,
  reasons: readonly string[],
  observedAt: string,
): Promise<void> {
  if (!held?.contentMd || next.kind === "withdrawn" || typeof next.version !== "number") return;
  if (held.hash && held.hash === next.content_hash) return;
  if (reasons.some((r) => MEASURED.has(r))) return;
  const settings = await getSettings(db);
  if (!settings.bg_model_imported || !settings.ai_model_classify.trim()) return;
  await db.prepare(`INSERT OR REPLACE INTO imported_change_queue (subscription_id, remote_id, version, prior_version, prior_md, next_md, queued_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .bind(subscriptionId, remoteId, next.version, held.version ?? next.version - 1, held.contentMd, next.content_md, observedAt)
    .run();
}

interface Queued { subscription_id: string; remote_id: string; version: number; prior_version: number; prior_md: string; next_md: string; queued_at: string }

/** Add or clear the classifier's word on an entry still at the judged version. */
async function record(db: D1Database, row: Queued, minor: boolean, detail: Record<string, unknown>): Promise<void> {
  await db.prepare(`UPDATE imported_items SET
      bg_reasons = CASE WHEN ?1 THEN json_insert(COALESCE((SELECT json_group_array(value) FROM json_each(COALESCE(bg_reasons, '[]')) WHERE value != 'minor'), '[]'), '$[#]', 'minor')
        ELSE bg_reasons END,
      bg_detail = json_set(COALESCE(bg_detail, '{}'), '$.classify', json(?2))
    WHERE subscription_id = ?3 AND remote_id = ?4 AND version = ?5`)
    .bind(minor ? 1 : 0, JSON.stringify(detail), row.subscription_id, row.remote_id, row.version)
    .run();
}

/**
 * Judge up to `limit` queued versions, oldest first. Each row is taken before
 * its call, so two ticks never pay for one version. With the feature off the
 * queue is emptied: a later switch-on judges what arrives after it.
 */
export async function drainImportedChanges(env: Env, limit = CLASSIFY_PER_TICK, fetchImpl: ProviderFetchLike = platformProviderFetch): Promise<number> {
  const settings = await getSettings(env.DB);
  const model = settings.ai_model_classify.trim();
  if (!settings.bg_model_imported || !model) {
    await env.DB.prepare("DELETE FROM imported_change_queue").run();
    return 0;
  }
  const rows = (await env.DB.prepare("SELECT * FROM imported_change_queue ORDER BY queued_at, rowid LIMIT ?").bind(limit).all<Queued>()).results;
  let judged = 0;
  for (const row of rows) {
    const taken = await env.DB.prepare("DELETE FROM imported_change_queue WHERE subscription_id = ? AND remote_id = ? AND version = ?")
      .bind(row.subscription_id, row.remote_id, row.version).run();
    if (!taken.meta.changes) continue;
    try {
      const result = await decide(env, model, classifierState(row.prior_md, row.next_md, row.prior_version), { change: CLASSIFY_QUESTION }, fetchImpl);
      const choice = result.answers.change?.choice;
      if (choice !== "typo" && choice !== "minor" && choice !== "major") {
        await record(env.DB, row, false, { by: model, error: "no usable answer" });
        continue;
      }
      await record(env.DB, row, choice !== "major", { by: model, category: choice });
      judged++;
    } catch (e) {
      if (e instanceof AiBudgetError) {
        // Over budget: the measured rules stand, and so does the rest of the queue until tomorrow's budget.
        await record(env.DB, row, false, { by: model, error: "over the daily AI budget" });
        break;
      }
      if (e instanceof ProviderError) {
        await record(env.DB, row, false, { by: model, error: e.message });
        continue;
      }
      throw e;
    }
  }
  return judged;
}
