import { excerptFromHtml } from "./markdown.ts";

/**
 * The text a `[[id]]` link shows when its author wrote no label (§10.1).
 * Items are titleless by design (§5.3), so an id would be the one label
 * guaranteed to mean nothing to a reader. When the target opens with a heading
 * (a thread's markdown H1 is its title by convention) that heading is the
 * text, as plain text; otherwise a short excerpt of the target in quotes,
 * which reads as a citation inside running prose. Presentation, and this
 * client's to choose; it is frozen into `content_html` at publish.
 *
 * Shared by the bake and the studio, so the label the picker and *copy [[id]]*
 * write (decision #70) is exactly the text the link would otherwise get.
 */
export function linkLabel(contentHtml: string, kind: string): string {
  const heading = /^\s*<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/i.exec(contentHtml);
  const title = heading ? excerptFromHtml(heading[1], 80) : "";
  if (title) return title;
  const excerpt = excerptFromHtml(contentHtml, 60);
  return excerpt ? `“${excerpt}”` : `${kind === "thread" ? "a thread" : "a fragment"}`;
}
