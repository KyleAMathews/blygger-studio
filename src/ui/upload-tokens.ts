// Upload placeholders (studio#24): pure helpers, kept out of the React module
// so the Worker suite can test them.

let uploadSeq = 0;
/**
 * The placeholder an in-flight upload puts in the text. Unique per upload, so a
 * leftover from an abandoned page load can never match a live one.
 */
export const uploadToken = (name: string) =>
  `![uploading ${name}…](#upload-${Date.now().toString(36)}-${++uploadSeq})`;
const STALE_UPLOAD = /!\[uploading [^\]\n]*…\]\(#upload-[\w-]+\)\n{0,2}/g;
/**
 * Remove placeholders no upload will ever fill: navigation is blocked while an
 * upload runs, so any placeholder present when a page opens was abandoned —
 * the page closed or crashed mid-upload — and would otherwise sit in the draft
 * as "uploading…" forever, its image appended at the bottom (studio#24).
 */
export const stripStaleUploads = (text: string) => text.replace(STALE_UPLOAD, '');
