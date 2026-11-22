# HR-001: browser setup cleanup

2026-11-19. Evaluated at HEAD
`764cb40d15b8062dad70032f262807f4472ec962` plus the working source identified
below, using `@tanstack/oracles` pin `97a4e7a`. The local harness cleanup
defect is confirmed and repaired. Integrated Chromium smoke subsequently passed
with the repaired driver bytes below.

## Obligation and repair

ORC-010 (checklist v1) requires the harness to release its resources, preserve
the original failure, and keep cleanup diagnostics distinguishable. No product
law, model, grammar, checkpoint, run budget, or production source changed.

In the old [browser setup and teardown](../../test-ui/editor-oracles/browser-driver-oracle.ts#L25),
connection could succeed before context creation, page creation, cookie setup,
route setup, or navigation rejected. Those allocations were available to final
teardown only through the successful setup result. Final teardown instead
awaited the cached rejection, repeated it, and never reached client close.
The [outer wrapper](../../scripts/formatting-oracles.ts#L90) separately owns
browser-server teardown; this finding concerns the driver's failure boundary.

The repair retains each acquired resource independently of successful setup.
One helper closes context before client and attempts client close even when
context close rejects. Setup rethrows the exact original value when cleanup
succeeds; otherwise an `AggregateError` retains the original as `cause` and
keeps secondary cleanup diagnostics in `errors`. Final teardown settles the
cached setup rejection without reporting it again. The cached connection is
never reset, so a failed setup/history is not retried.

## Source binding and execution

The failing controls ran before editing. Both versions used the actual setup
source extracted from `let connection` through its registered `afterAll`
callback, transpiled by the installed TypeScript compiler.

| Source | Full driver SHA256 | Extracted setup SHA256 |
| --- | --- | --- |
| Before | `7ffc887f76acc4510275fd1ca72b54d7d98c82a09c180a7aa65b3458ab9ab85d` | `2c49c6750eef969e6a714ae32c3f80c90d96dcd6fae859d5e001c084452ee428` |
| Repaired | `cb333a1ec8803430e354a156af5f4f98b52eb02b810dd5b6c5bacfeb7b4dd1e3` | `e797fc7dc6aa8eb31801856d4ca0fad2ae8af0d6b613313d6bdb4f2739c1b914` |

| Control | Count and classification | Observed result |
| --- | --- | --- |
| Old extracted setup, controlled resources | 19 lifecycle controls; 15 post-connection setup failures | Every post-connection failure made zero close calls; final teardown repeated the same setup rejection. |
| Repaired extracted setup, controlled resources | Same 19 controls | All 15 post-connection failures closed every acquired handle once; no setup retry or duplicate final-hook error. Pre-acquisition failures closed nothing; successful setup retained ordinary teardown. |
| Real owned Chromium | 12 receiving controls: one old failure and 11 repaired cases | Old navigation failure left one context, an open page, and a connected client after final teardown. Every repaired case left zero contexts and a disconnected client, with real close events for acquired pages/contexts and no emergency cleanup. The owned server exited with code 0. |

The 19-case family covers missing endpoint, failed connection, failed
`newContext`, failed `newPage`, missing origin, missing cookie, failed
`addCookies`, failed `route`, failed `goto`, healthy setup, three setup-plus-
cleanup failure combinations, healthy setup with both teardown failures, and
five falsy thrown values (`undefined`, `null`, `0`, `false`, `''`). Original
values retain identity when cleanup succeeds; original and both secondary
diagnostics remain inspectable when cleanup rejects. Repeated acquisition
connects only once.

The 11 repaired real-browser cases cover the seven post-connection setup
stages, healthy setup, navigation failure with both cleanup diagnostics,
healthy final teardown with both diagnostics, and context-close rejection
before release. In the last case, client close released the real context.
Other real cleanup-diagnostic controls closed the resource before throwing
their distinct injected diagnostic. Execution used Playwright `1.64.1` and
Chromium headless revision `1254`, sequentially, with one owned server and a
one-renderer limit. Events and awaited operations supplied lifecycle evidence;
elapsed time did not decide a result.

These are harness controls, not product RED/GREEN, product calibrations, or
semantic mutant kills. The old extracted setup is the negative control; the
real-browser controls supply receiving evidence beyond fake close-call counts.

## Verification and limits

The scoped TypeScript check rooted at the changed driver under
[`tsconfig.ui.json`](../../tsconfig.ui.json) checked 568 transitive source and
declaration files with zero diagnostics. `git diff --check` passed. The package
defines no lint script. Existing review records are preserved.

This record establishes the finite setup/cleanup family above for the shared
dummy-document transport in Chromium. It does not establish every browser
engine or product oracle outcome. If the browser's own close rejects before
release, the harness preserves that diagnostic after attempting both closes;
these controls do not promise release by a failing host API. Integrated oracle
smoke passed with these repaired bytes: the complete registered code-block
file passed 322/322 checks, and the complete session file passed 138/138 checks
in each of two fresh app/browser passes, with no skipped or pending checks.
The code-block receipt is `/private/tmp/blygger-prep-pr-20261119/code-return-evaluation.md`
(SHA256 `cb2a082a2b64b81062c825c4a761df519b6b806f07630b2ccbaa3edea227e721`);
the session receipt is `/private/tmp/blygger-complete-session-20261119/summary.json`
(SHA256 `2de0295855429c83a163dae902fee00bafe648227c22b17cde2efc10f1833af0`).
These ordinary-path passes are integrated smoke, not whole-suite or CI acceptance.

ORC-010 is the repaired obligation; ORC-014 has the real-browser receiving
control, and this source-bound record supplies the scoped ORC-012 evidence.
Existing product-law, model, grammar, and reach definitions under
ORC-001/002/003/004/007/008/009/011/013/015/016 are unchanged; this repair claims
no new generated product coverage. Preservation of registered paths and reach
was checked by those complete file runs within their stated scope. No ORC-005 product-path or
ORC-006 registered-kill claim is made from these harness controls. Whole-suite
audit and readiness remain separate judgments.
