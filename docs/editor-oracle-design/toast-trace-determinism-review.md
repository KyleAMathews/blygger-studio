# Toast trace diagnostics — focused source review

Reviewer `/root/review_block_break_oracles`, 2026-11-19. **Source-accepted:**
replace the workflow snapshot's unasserted toast geometry, computed styles
and lifecycle flags with `toastDetails: toasts.map(node => ({ text:
node.textContent }))`, while retaining the existing unfiltered `.toast`
collection, first toast text and exact raw count. No runtime/source edit or
test job was performed by this reviewer; this document is the only write.

## Why the change preserves judgment

Reviewed `workflow-driver-oracle.ts` SHA-256
`1b9eb08bae4963855c697e7a57da4c8566d5b88501b98667b789cf3ae44011ab`,
the workflow model SHA-256
`ad252e25919b9915deb98392fe5291f57f8e97853a441f07b94f826ebf8212e8`,
and property/check SHA-256
`28670d806e5c214fc533677ec7024994f36a8419be9c300bdbfe8917b4fe123b`.

The driver currently records every toast's text, limited/ending flags,
rectangle, display, visibility and opacity at `stepN`. `workflowStep`
predicts source, selection, feedback text/count, sheet state, sheet count,
clipboard-control uniqueness and paste-default receipts. It does not
predict `toastDetails`. The registered check iterates the expected step's
keys; it never compares those diagnostic style/geometry/lifecycle fields.
`workflowStates` derives reach from plans, not those fields. Existing
calibrations do not judge them either.

Computed animation opacity depends on when the browser samples the
transition. Recording that value makes the entire observation trace vary
even when every compared product field agrees. The pinned runner treats a
changed observation hash between its two baselines as nondeterminism and
ignores that test's failures for mutant judgment. Animation diagnostics in
the hashed product trace can therefore prevent an otherwise deterministic
law from judging the original defect.

The accepted cleanup preserves the array of **all** `.toast` nodes, in the
same DOM order, with no selector filter or wait for old nodes to disappear.
It preserves the exact raw count and current first text at the same
checkpoint. A duplicate node, stale first message, missing feedback or
wrong text still changes an asserted field and must be rejected. Keeping
each node's text also retains deterministic duplicate-content diagnostics.
No law, model, legal history, grammar, seed, run count, declared state,
checkpoint, calibration or compared field changes.

## Read receipt and limits

Inspected partial replay `910ed1b7e0ee` in
`/private/tmp/blygger-main-linux-j74l_hd2/repository/build/formatting-oracles/toast-singleton-green-replay-v2/`.
Its `results.json` SHA-256 is
`517364cc9d71c17aeada0c1c7fdc9d9f9f87ac562131a6818f73adca2f3edbcf`.
The selected baseline passes eight checks with 153 unselected checks; its
eight nondeterministic entries are the two selected fixed-history checks
and six calibrations. Preserved `run-181-1.jsonl` and `run-181-2.jsonl`
have equal checked hashes and unequal observation hashes for all eight.
This supports unasserted observation drift. Hashes alone do not prove
opacity is its sole source, and source review does not prove the cleanup
will yield zero nondeterministic tests. The next completed pair of
baselines must establish that result.

No executable visibility assertion is removed by this cleanup. The prior
[singleton toast review](./toast-singleton-design-review.md) already
distinguishes raw singleton/text receipt from physical visibility and
repeated assistive-technology announcements. Those receiving claims remain
unproved; removing unused style diagnostics does not establish them. Keep
the already captured RED physical/layout details as historical evidence,
outside the future determinism-sensitive product trace. Do not reinterpret
them as an asserted visibility law or count hidden/ending nodes differently.

The replay's sole selected authored mutant,
`original-stacked-toast-feedback`, is classified **timeout**, with run-time
limit detail, zero registered kills and one gap. A partial failing capture
does not override that completed classification. Increasing execution
`first-limit`/test-timeout to let the same selected oracle and its shrinking
finish is compatible with this cleanup; no semantic campaign budget may be
reduced, and timeout remains distinct from a law kill.

Acceptance is limited to this diagnostic projection under ORC-002/003/005/
006/010/012/014: expected judgment is unchanged, timing noise is removed
from unused observations, raw failure evidence is retained, and real-host
determinism plus the original-defect registered rejection remain required.
It does not supply a new oracle, narrow the history grammar, resolve the
full gap campaign, or authorize a production-behavior change.
