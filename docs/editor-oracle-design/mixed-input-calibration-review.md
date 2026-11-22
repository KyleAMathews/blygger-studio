# Mixed input calibration review

## Raw independent finding before repair

Reviewer `/root/review_formatting_coverage` on the scratch entry SHA-256 `ec17e1bfead036c08ef3d5da35c6cb1b23b834e15cf718e5182e3870681b92d8`:

> Complete source/model/check/driver review finds no semantic code blocker; independent pure controls admit all36 constructions, valid tab/mixed q choices, reject insufficient/code-band q, prove model ignores every step output, reject bad step+fully matching next input at step1, and safely reject4partial traces. One calibration specificity repair before final acceptance: 'redo loses chosen indentation source' currently substitutes insufficient4spaces, so it does not distinguish reusing a different OTHERWISE VALID allowed prefix on redo. Change corruption to another valid6/7/8/9-space choice (different from actual selected q), preserving correct caret. Then rejection proves exact chosen redo source rather than basic nesting. All5old calibrations stay. Send final manifest/hash after this small change.

Parent accepted this finding before the entry was changed. All other source/model/check/driver review directions and the independent loss source verdict remain applicable; this ledger does not assert browser execution.

## Scratch repair and controls

Only this new calibration changed. It now replaces the actual chosen raw indentation with six spaces, or seven when the original was exactly six, preserving the complete remainder and shifting the caret by the raw prefix delta. Either alternative satisfies the independently declared6..9-column nesting band for this constructed parent. The old five calibrations remain unchanged.

New scratch entry SHA-256: `1a9285cf55b7acd4eee384e856ca3724250d62112331c300d06fb56f2fc9f6aa`. The other six review-manifest identities remain unchanged. Strict scratch TypeScript checking passed again. Pure `redo-specificity-controls.json` reports three chosen-prefix modes (ordinary/nonminimal/tabs): each corrupt redo source is independently allowed at the original indentation step, while the complete mixed check rejects it at `step3`, the exact redo checkpoint. These controls do not establish browser calibration execution.
