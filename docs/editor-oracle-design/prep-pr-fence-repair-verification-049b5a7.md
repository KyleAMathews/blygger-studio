# Fence repair verification

At reviewed HEAD `049b5a7`, the extended browser oracles rejected the old formatter for Shift+Enter within a blockquoted fenced code block. The reviewed repair uses the CommonMark block parser to decide whether the caret prefix belongs to a fence, while retaining the existing edit and caret rules.

Combined formatter revision `bca622af` passes five focused Chromium checks and the complete line-break file: **238 passed, zero failed or skipped**. The complete file includes 75 fixed campaign registrations, 75 random campaign registrations, seven calibrations and 81 determinism registrations. These are registration counts, not distinct editor histories; focused and repeated runs are recorded separately.

The five earlier RED results failed at the intended `line break` / `edit` or `mixed browser editing history` / `step0` boundary on the unchanged formatter. Their independent combined review checked 40 conditions. The GREEN execution has a separate independent review of 153 conditions, including all six exact commands, two-CPU bounds, reports, browser topology, source/package identities and recorded container cleanup. Root confirmed the outer command exited zero. The [structured record](prep-pr-fence-repair-verification-049b5a7.json) preserves both source timelines and the original RED classification correction.

An initial Docker permission failure exited one without a container ID or oracle result. It remains setup failure. Exact attempted-name and job-label absence checks, restoration of the prior formatter input and a fresh retry are retained separately from product behavior.

The historical sampled mutation report still contains eleven `does-not-apply` authored definitions and a missing-break-return survivor. They are not kills. Refreshed mutation results belong in separate evidence; this record preserves the original outcomes. The primary check calls `breakEdit` in a browser, while the four selected mixed checks use the React editor's Shift+Enter path. No separately archived trusted Shift+Enter event receipt is claimed.

This record covers the historical fence repair on top of the list repair. Raw artifacts remain task-local, with that portability limit stated in the record. It does not establish final-tree mutation closure, the complete mixed corpus, all sixteen oracle files, cross-browser behavior, practical CI completion or acceptance of the old-test retirement.
