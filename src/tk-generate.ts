import { installWorkingCopy } from './item-revision.ts';
// /api/items/{id}/generate business logic (tk-core-plan.md §5 task 4) —
// factored out of the Hono route so tests can inject a fixture provider
// fetch, the same DI pattern importer/schedule.ts uses for runScheduledPoll.

import { generate, markDocument, platformProviderFetch, ProviderError, AiBudgetError, type ProviderFetchLike } from "./ai/provider.ts";
import { ID, LINK_INLINE, stripGeneratedGrammar } from "./grammar.ts";
import { selectionText } from "./markdown.ts";
import { getSettings, getTkProvenance } from "./model.ts";
import { composeStubCite } from "./stub.ts";
import { parseScopes, setScopeOutput } from "./tk.ts";
import { outsideOtherComments } from "./comments.ts";
import { resolveTarget, type ResolvedTarget } from "./transclusion.ts";
import { hydrate, pageSource, type HydrationFailure } from "./tk-hydrate.ts";
import type { FetchLike } from "./importer/http.ts";
import type { Env, GenerationSource, ItemGenerationSource, ItemRow } from "./types.ts";
import { nowIso } from "./util.ts";

/**
 * What a generator is fed for one item source: the local snapshot (§5.7),
 * never a live fetch. A fragment's markdown is its text. A thread's markdown
 * holds bare `![[id]]` directives, so it is fed as its reader sees it — the
 * baked snapshot, quotes included, as text with its block breaks kept. An
 * imported item whose origin sent no markdown is fed the same way.
 */
function sourceText(target: ResolvedTarget): string {
  if (target.kind === "fragment" && target.contentMd.trim()) return target.contentMd;
  return selectionText(target.contentHtml);
}

/** Links that could not be read, returned instead of generating until the author says to proceed. */
export interface HydrationCheckpoint {
  read: number;
  total: number;
  failed: HydrationFailure[];
}

export type GenerateScopeResult =
  /** `text` is the scope's new output alone; `content_md` is the whole working copy with it spliced in, as saved. */
  | { ok: true; text: string; model: string; content_md: string; revision: number }
  /** With `checkpoint`, nothing was generated: links could not be read and the author has not said to proceed. */
  | { ok: false; status: number; body: Record<string, unknown>; checkpoint?: HydrationCheckpoint };

export async function runGenerateScope(
  env: Env,
  item: ItemRow,
  scopeIndex: number,
  fetchImpl: ProviderFetchLike = platformProviderFetch,
  /** This blyg's origin, for the cite of a source that turns out to be our own under another subscription. */
  ourOrigin?: string,
  opts: {
    /** Generate even though some links could not be read (the author said so at the checkpoint). */
    proceed?: boolean;
    /** The fetch for web pages; the importer's, under its outbound policy, by default. */
    pageFetch?: FetchLike;
  } = {},
): Promise<GenerateScopeResult> {
  const { scopes, errors: parseErrors } = parseScopes(item.content_md);
  if (parseErrors.length) {
    return { ok: false, status: 400, body: { error: "working copy has malformed TK scopes", errors: parseErrors } };
  }
  const scope = scopes[scopeIndex];
  if (!scope) return { ok: false, status: 400, body: { error: "unknown scope index" } };
  if (scope.imported) return { ok: false, status: 400, body: { error: "an impyrt scope holds text generated elsewhere; it is not regenerated here" } };

  // Every source resolves by the rule a directive uses (§10.2's order, 0.3
  // §5.7, decision #44): one of our published items, then an imported item
  // with a current or pin-retained snapshot. No selfId: a source bakes
  // nothing, so there is no cycle to refuse, the same reasoning as `[[id]]`.
  const settings = await getSettings(env.DB);
  const at = nowIso();
  const sources: (GenerationSource & { text: string })[] = [];
  const addItem = async (id: string, target: ResolvedTarget) => {
    const ref: ItemGenerationSource = { id, version: target.version };
    // A remote source carries its origin and its frozen human half, composed
    // now, when the words were read, so publish emits the stored object and a
    // later rename of the subscription cannot rewrite it (as for a remote
    // transclusion's cite, decision #30).
    if (target.origin) {
      ref.origin = target.origin;
      ref.cited = await composeStubCite(env.DB, { origin: target.origin, id, version: target.version }, ourOrigin ?? "", settings.site_title, at);
    }
    sources.push({ ...ref, text: sourceText(target) });
  };
  for (const id of scope.sourceIds) {
    const resolved = await resolveTarget(env.DB, id);
    if (!resolved.ok) return { ok: false, status: 400, body: { error: `unresolvable source: ${resolved.reason}`, id, reason: resolved.reason } };
    await addItem(id, resolved.target);
  }

  const context = outsideOtherComments(item.content_md, scope.start);
  // The links the author placed, in the instruction or the draft, are read
  // before writing (decision #117). What is read is fed and disclosed; what
  // could not be read stops here until the author says to go on without it.
  const hydration = await hydrate(env, [scope.instruction, context.text], {
    exclude: new Set([item.id, ...scope.sourceIds]),
    ourOrigin: ourOrigin ?? "",
    at,
    fetchImpl: opts.pageFetch,
  });
  if (hydration.failed.length && !opts.proceed) {
    const checkpoint = { read: hydration.total - hydration.failed.length, total: hydration.total, failed: hydration.failed };
    return { ok: false, status: 409, body: { error: `${hydration.failed.length} of ${hydration.total} links could not be read` }, checkpoint };
  }
  for (const { id, target } of hydration.items) await addItem(id, target);
  for (const page of hydration.pages) sources.push({ ...pageSource(page), text: `${page.title ? `${page.title}\n\n` : ""}${page.text}` });
  let result;
  try {
    result = await generate(
      env,
      {
        instruction: scope.instruction,
        currentText: scope.output,
        sources: sources.map((s) => ("url" in s ? { url: s.url, content_md: s.text } : { id: s.id, content_md: s.text })),
        documentContext: markDocument(context.text, context.offset(scope.start), context.offset(scope.end)),
        stylePrompt: settings.ai_style_prompt || null,
      },
      fetchImpl,
    );
  } catch (e) {
    if (e instanceof AiBudgetError) return { ok: false, status: 429, body: { error: e.message } };
    if (e instanceof ProviderError) return { ok: false, status: 502, body: { error: e.message } };
    throw e;
  }

  // Generated text keeps no bracket form the author did not supply (row 67):
  // a link to an item named in the instruction, a source or the draft, that
  // resolves, stays a link (Venkat, session 78); any other is stripped to its label.
  const supplied = new Set([scope.instruction, context.text].flatMap((t) => [...t.matchAll(new RegExp(ID, "g"))].map((m) => m[0])).concat(sources.flatMap((s) => ("id" in s ? [s.id] : []))));
  const kept = new Set<string>();
  for (const [, id] of result.text.matchAll(LINK_INLINE)) {
    if (id && supplied.has(id) && !kept.has(id) && (await resolveTarget(env.DB, id)).ok) kept.add(id);
  }
  result = { ...result, text: stripGeneratedGrammar(result.text, (id) => kept.has(id)) };
  const updatedMd = setScopeOutput(item.content_md, scope, result.text);
  const provenance = getTkProvenance(item);
  while (provenance.length < scopes.length) provenance.push(null);
  provenance.length = scopes.length;
  provenance[scopeIndex] = { sources: sources.map(({ text: _text, ...ref }) => ref), model: result.model, at };
  const revision = await installWorkingCopy(env.DB, item, updatedMd, JSON.stringify(provenance));
  return { ok: true, text: result.text, model: result.model, content_md: updatedMd, revision };
}
