# Completed-link browser-oracle evidence

2026-11-18, base `28b0c8d642a87e5810ad6eabd95c2d1714c53396`.
Exact source fingerprints, mutation keys/laws and reports are preserved in
[link-review-execution.json](https://github.com/blygger/blygger-studio/blob/fb0b79dc0450e5f3d31a5a8f59c0b697b5cc5f6e/docs/editor-oracle-design/link-review-execution.json).

Six registered properties exercise the actual instrumented `src/ui/links.ts`
inside Chromium. The rendering property additionally inserts through the real
helper, calls the disposable Worker's actual preview, and observes browser DOM.
They use the already adopted completed-link contract; no product law changed.

## Result and repair order

1. The initial attempt failed registration. It is setup evidence, not RED.
2. Two independent reviewers found missing optional/composed call shapes,
   angle-delimiter reach, inaccurate symbol units, and an incorrect literal-label
   expectation. Rereview caught HTML's partial decoding of unknown legacy-prefix
   entity names. Repairs preserved all generated inputs; all 84 final constructed
   histories are admitted by their arbitraries.
3. The final reviewed oracle ran on unchanged production: **347 pass, 16 fail**.
   `tracker projection` failed at `return` for
   `https://example.com/a?ref=x#part?` and nearby fragment forms. The rendered
   anchor and insertion properties also observe the lost question mark. The
   minimized replay is `http://&?ref#?`.
4. Only then, production dropped the redundant regex following URL serialization.
   `URLSearchParams` already removes an empty query; the regex could instead
   remove `?` from the fragment. The new production has fewer operations and
   preserves the fragment under the existing query-cleaning law.
5. The same final oracle passes **363 checks twice**, zero nondeterminism.
   The complete link gap run rejects **61/61 link mutants**, including all ten
   authored link challenges and the original `links-fragment-question` defect.
   No link gaps remain in this run. Thirty unrelated formatter-authored mutants
   appear as unowned warnings in this single-source run; they are not kills.

The reusable boundary is tracker removal × arbitrary/structured URL fragments ×
browser `cleanUrl`/`insertLink` × complete return and rendered anchor. Constructed
neighbors `#part?`, `#part?#next`, `#part?next`, ordinary fragments, duplicate
trackers, and no-tracker exact spelling retain both failure and passing regimes.
This is bounded generated evidence, not a universal all-editor closure claim.

## Independent review and loss audit

[Independence review](link-review/independence.md) and
[coverage/loss review](link-review/coverage-loss.md) include rereview addenda and
fingerprints. Both accepted the final source repairs. The latter's final audit
maps all **21 original helper assertions** to exact call shapes, constructed
inputs, complete observations and mutation routes, and accepts deleting only
`test-ui/links.test.ts`. That file was removed after this final audit and GREEN.

The original clipboard-button, fallback-sheet and paste cases in
`e2e/compose-pwa.spec.ts` remain unchanged. Their event/default-prevention, visible
toast, sheet and same-history source-transfer observations need app receiving
oracles before replacement. Helper success does not establish these paths.

The first renderer expectation accidentally treated Markdown character-reference
source as literal display text. CommonMark §6.2, preserved source semantics and
independent probes resolved that contradiction. Exact CPython HTML5 complete-name
membership now gates the browser's native entity decoder. Independent review
checked all 2,125 names against native values with zero mismatches, plus required
unknown-prefix controls. No production `entities` decoder feeds the model.

## Checklist v1 outcomes

| Requirement | Final outcome |
|---|---|
| ORC-001 | Reuses Kyle Mathews/KyleAMathews' adopted completed-link contract and preserved helper tests; WHATWG URL and CommonMark references/trusted bases explicit. Entity expectation corrected under that contract. |
| ORC-002 | Explicit ASCII tracker vocabulary/retained-entry projection, character-walk source model, input partitions and independent entity vocabulary; no production semantic imports. Renderer reads only independently recorded input projection, never SUT outputs. |
| ORC-003 | Law, grammar, pure models, browser driver and checks separate; corrected prose agrees with executable character-reference semantics and symbol bounds. |
| ORC-004 | 84 constructions admitted, all old helper inputs/call shapes reconstructed. Design record explains ablations, ranges and nearby rejected histories. No filter/budget narrowing. |
| ORC-005 | Actual browser helpers and complete return wrappers, plus real preview/browser anchors. Full insertion object passed to feedback. Clipboard/app receiving boundary remains open separately. |
| ORC-006 | All six bound corrupted-trace calibrations pass. All61 link mutants rejected by registered laws, including omitted-default, full-result, angle-only and original-fragment authored challenges; no timeout/setup/runtime failure counted as a kill. |
| ORC-007 | Fixed seed 20261118 plus same-budget random campaigns; helpers 100 runs, preview 25. Framework provides direct replay. |
| ORC-008 | Not applicable: no stateful model introduced or merged; these are input/result models. |
| ORC-009 | Raw/structured URL, selected source partitions and reference input each have one explicit meaning; optional argument presence is a public call distinction. |
| ORC-010 | Helper exceptions are observed data; malformed insertion returns remain comparison data. Framework preserves failure-law shrinking; application/browser cleanup remains. No new failure-injection claim. |
| ORC-011 | Actual preview/anchor semantics independently challenges source serializer agreement; independent entity projection fixed the review's shared-semantics risk. WHATWG parsing remains a declared trusted base. |
| ORC-012 | This versioned record, complete raw review/addenda and JSON execution/source receipt preserve final acceptance, RED/GREEN order and limits. |
| ORC-013 | Constructed exact/near-miss tracker names, lexical/parse distinction, duplicate occurrences, fragment punctuation, selected/autolink/omitted argument, delimiter classes and0/1/many feedback. Targeted authored challenges rejected. |
| ORC-014 | Actual browser SUT and real Worker preview establish those receiving paths. Synthetic/OS clipboard, sheet, React toast and keyboard-placeholder paths remain unclaimed here. |
| ORC-015 | 84 constructions declare all needed states; fixed and random campaigns retain reach tests. Entity-prefix and angle distinctions no longer rely on random chance. |
| ORC-016 | All new properties register through oracleProperty, with no ordinary unit tests or raw campaigns. Retired helper tests were removed only after independent loss audit. |

Design-grammar triggers and alternatives are recorded in
[link-design-grammar.md](link-design-grammar.md). Existing formatter-framework
findings and the Workerd malformed-surrogate issue remain open; this result does
not replace the earlier full formatter mutation report.
