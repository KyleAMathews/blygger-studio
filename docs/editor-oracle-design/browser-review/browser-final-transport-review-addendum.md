# Keyboard and renderer-boundary review addendum

Independent read-only review, 2026-11-18, same worktree/HEAD as `/private/tmp/blygger-browser-final-transport-review.md`. No repository edits or competing oracle suite were made by this reviewer. This addendum supersedes the earlier unresolved dispositions listed below; it does not erase the raw findings or claim the active full mutation campaign has completed.

## KTR-01 resolved under the adopted unknown-key law

The approved law names B/I/K shortcuts and requires unknown key strings to return null. That already supplies authority to treat the six literal ASCII spellings b/B/i/I/k/K as recognized and U+212A Kelvin sign as unknown; another law-approval round is unnecessary. The latest independent chord model enumerates those six spellings instead of sharing production's Unicode lowercase operation. Kelvin sign, Greek kappa and fullwidth K are included in constructed all-modifier/all-platform histories. Production now reads event.key literally and uses the six-name table; `original-unicode-format-key.json` restores the broad lowercase fault as an authored challenge. I inspected these source repairs. Parent owns the registered RED/GREEN and final mutant-kill record; my original Chromium witness remains at `/private/tmp/blygger-keyboard-review.ET8NPJ/kelvin-key-probe.cjs/.output`.

## KTR-02 and KTR-03 resolved in inspected source

Keyboard oracle prose now identifies actual Chromium DOM execution, the forced-refusal premise, direct fallback for intra-grapheme endpoints, and the registered real-application receiving oracle for native undo and React receipt. It no longer claims a retained fake environment/Playwright complement.

Session preview synchronization now correlates POST `/api/preview` by actual post-action `contentMd` and editor itemId, retaining responses that arrive while the action runs. It waits until preview DOM innerHTML matches the selected response's browser-normalized innerHTML; the independent model still judges the structural observation. This closes the source-level stale-response/textContent weakness I reported. The latest whole-suite baseline includes 84 passing session checks; final mutation evidence remains active.

## BTR-01–07 repair acceptance

All seven original browser-transport findings have inspected repairs, as detailed in the preceding report. New missing-result calibration, extra-production-keydown authored challenge, and native-undo/always-direct-fallback authored challenge strengthen the previously source-only BTR-03/04 and receiving-path evidence. I have not reclassified an unrun synthetic spin/setup-fault experiment as a kill; the full runner must retain its actual classifications. Source inspection and passing baselines do not replace final gap evidence.

## Renderer boundary: preserve the original law, record the host finding separately

I approve the boundary mapping from the original direct `renderMarkdown` HTML-string checkpoint to real browser→Worker fragment `/api/preview` JSON. The fragment path uses the same renderer and returns its JavaScript HTML string through JSON without the thread-only sanitizer/transcoder. This restores the originally adopted checkpoint. Every malformed-UTF16 history remains legal; exact source/selection checks remain unchanged; the model retains ordinary escaping and CommonMark CR/LF/NUL preprocessing without a newly invented surrogate codec. Adding isolated-high, isolated-low and valid-pair constructed histories strengthens reach rather than narrowing the domain. No law-delta approval is needed for this faithful migration.

The actual real-app session oracle still exercises thread preview for its generated ordinary Unicode histories. Its evidence must not be described as full malformed-UTF16 thread-preview closure. Switching the component checkpoint does not resolve the separate host dependency defect, and that defect should stay explicit in the final record.

Independent real Chromium→actual Worker probe confirms this mapping:

- Fragment preview of fenced U+D800 returns U+D800 in parsed JSON HTML; fenced U+DFFF similarly remains U+DFFF.
- Thread preview of either isolated surrogate returns three U+FFFD characters.
- Both fragment and thread preserve valid 😀 U+D83D U+DE00.

Probe: `/private/tmp/blygger-preview-boundary-probe.mjs`; results: `/private/tmp/blygger-preview-boundary-probe.output`. It compares the two paths with identical inputs and includes request source code units.

Independent minimal Workerd 1.20261023.1 probe isolates the cause before repository production semantics:

- `new Response('\ud800').arrayBuffer()` contains bytes ED A0 80, and the low-surrogate case contains ED BF BF. These are WTF-8 surrogate byte sequences, invalid in UTF-8.
- `new Response(source).text()` yields three U+FFFD per isolated surrogate, even without HTMLRewriter.
- `TextEncoder().encode(source)` instead yields standard replacement bytes EF BF BD once per isolated surrogate.
- `Response.json({source})` roundtrip preserves isolated UTF16 code units through JSON escaping.
- Valid surrogate pairs remain standard four-byte UTF-8 and survive both paths. Two isolated surrogates each produce three replacements, not one combined replacement.

Probe: `/private/tmp/blygger-surrogate-host-probe.cjs`; results: `/private/tmp/blygger-surrogate-host-probe.output`. The repository path introducing this behavior is `previewTransclusions` → `sanitizeHtml(result.html)` (`src/transclusion.ts:432`), where HTMLRewriter consumes `new Response(html)`.

Three replacements are an observed Workerd behavior, not a new desired code-block law and not an @tanstack/oracles framework failure. I reject changing the model to a pinned WTF-8→strict-UTF8 codec merely to match it. Such a policy would require its own authority/law decision. Keep the host issue open, with this witness and the narrower statement that the current formatting oracle owns exact source plus renderer HTML-string semantics. No production sanitizer fix was made or requested by this review.

## Current evidence boundary

Latest inspected `/private/tmp/blygger-browser-full.log` baseline: all seven files pass (code-block315, inline297, keyboard1753, line-break111, list306, session84, valid-input18). The unsampled mutation campaign was still running when this addendum was written. A final no-gap statement requires that run's completed report, every outcome correctly classified, and any survivors resolved. The earlier sampled results remain partial evidence only.
