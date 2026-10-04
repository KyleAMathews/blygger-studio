import { plainTextFromHtml, renderMarkdown } from "./markdown.ts";
import { clampText } from "./preview.ts";
import { annotateGenerated, applyGeneratedWrappers, parseScopes, previewStrip, type TkScope } from "./tk.ts";
export function scopeSummaries(scopes: TkScope[]): { index: number; instruction: string; output: string | null; hasOutput: boolean; block: boolean; imported: boolean }[] {
  return scopes.map((s, index) => ({
    index,
    instruction: s.instruction,
    output: s.output === null ? null : clampText(plainTextFromHtml(renderMarkdown(s.output)), 60),
    hasOutput: s.output !== null,
    block: s.block,
    imported: !!s.imported,
  }));
}

/**
 * Studio preview rendering for fragment and thread requests: strips TK
 * scopes (tolerantly — previewStrip never throws), highlights every resolved
 * scope regardless of real provenance (an authoring aid, not the wire's
 * disclosure rule — see model.ts publish() for the provenance-gated version),
 * and lets the caller render the remaining markdown (plain, or via
 * previewTransclusions for threads).
 */
export function annotateTkPreview(contentMd: string): { scopes: TkScope[]; text: string; blocks: Map<string, string>; finish: (renderedHtml: string) => string } {
  const { scopes } = parseScopes(contentMd);
  const { text, spans } = previewStrip(contentMd, scopes);
  const annotated = annotateGenerated(text, spans, spans.map(() => true));
  return { scopes, text: annotated.text, blocks: annotated.blockReplacements, finish: (renderedHtml) => applyGeneratedWrappers(renderedHtml, annotated) };
}
