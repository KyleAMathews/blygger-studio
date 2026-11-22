# Browser transport and keyboard oracle follow-up review

Reviewed 2026-11-18 in /Users/kyle.mathews/programs/blygger-studio/.worktrees/oracles-explore, at repository HEAD 28b0c8d642a87e5810ad6eabd95c2d1714c53396 plus in-progress uncommitted work. Read pinned oracles-review/SKILL.md, checklist and glossary. Scope: browser-source-oracle.ts, browser-driver-oracle.ts, textarea-driver-oracle.ts, textarea-model-oracle.ts, keyboard oracle/model, formatting-oracles.ts wrapper, and pinned capture-setup.mjs. No production/repository changes were made by this reviewer. No competing oracle suite was run.

This report preserves findings as they arose; parent may already have addressed some while the review was running. Evidence below is tied to the observed revisions and probe paths, and is not a claim that the latest worktree still has every defect.

## BTR-01 — P1: Collapsed empty native deletion changes source

Claim/authority: applyEdit must apply the exact valid replacement, with native undo or fallback. Empty [from,to) plus empty insert is a no-op.

Witness: textarea value `a`; edit {from:1,to:1,insert:'',start:1,end:1}. Native `execCommand('delete')` removes the preceding `a`, leaving empty value and caret0. Forced fallback correctly preserves `a`, caret1. Nearby initial `ab`, carets1/2 also lose one preceding character natively; offset0 does not.

Evidence: RUN in real Chromium, actual production applyEdit. /private/tmp/blygger-keyboard-review.ET8NPJ/native-empty-edit.cjs and native-empty-edit.output. Parent reproduced RED in registered oracle using added `collapsedDelete`, report /private/var/folders/zy/zxh2j5n97vq2tt8d8q7_1t5r0000gp/T/oracle-gaps-ba55c11f5c80/out/2026-11-18T15-24-30-584Z-eb6d5734/summary.md.

Repair evaluated independently: choose insertText for nonempty insert OR collapsed replacement; delete only for a nonempty replacement range with empty insert. Temporary-source probe of this change passes all36 combinations of all ranges in `a`/`ab`, native/fallback and empty/X insert. Native insertText('') returns true without changing source/caret at beginning/middle/end. A preceding native insertion still undoes correctly after the no-op. Evidence: native-empty-insert-proposal.cjs/.output in that directory.

Missing family/history: distinguish insertion/deletion AND empty/nonempty range, construct collapsed no-op at a positive offset, keep forced-fallback and beginning-of-text neighbors. Do not rely on random independent empty strings to reach the combination.

## BTR-02 — P1: Native editing snaps UTF-16 selection endpoints inside grapheme clusters

Claim/authority: the exact-valid-UTF16 replacement law admits positions inside surrogate pairs, combining sequences and ZWJ sequences. The textarea selection API accepts those offsets; native editing may act at different visual boundaries.

Original witness from the strengthened oracle: prefix=' ', selected='', suffix='ꫫ', insert=NUL, native=true. Source ` ꫫ` with caret1 produces ` ꫫ\0` natively instead of ` \0ꫫ`. This is not NUL-specific. ꫫ is a combining mark attached to the preceding space. Ordinary emoji, lone surrogate, CR, CRLF and other inserts all move to the visual boundary in that same context.

Smaller familiar witness: initial `a\u0301b`, caret1, insert `x`: expected `ax\u0301b`, actual `a\u0301xb`. Partial-cluster deletion initial `a\u0301b`, range[0,1), insert'' expects `\u0301b`, but native delete produces `b` and loses the unselected mark.

Evidence: RUN actual production in real Chromium. native-control-probe.cjs/.output samples140 cases and isolates the context rather than the inserted character. native-grapheme-probe.cjs/.output then samples15 source strings, all ordered endpoints and five inserts (empty, x, NUL, emoji, CR):990 cases per strategy. Strings include combining marks, surrogate emoji, ZWJ, variation selector, flag, skin-tone modifier, Indic conjunct, LF/tab, word joiner and zero-width space. Native-only differs in430/990 cases. No failing native case had both endpoints at Intl.Segmenter grapheme boundaries.

Repair proposal independently evaluated, not applied by reviewer: attempt native edit only when both endpoints are grapheme boundaries; otherwise use exact setRangeText fallback before exposing any wrong input event. This passes990/990 probe cases. Whole-value native replacement also passes990/990 result checks, but rewrites the complete source and changes undo-selection geometry; the boundary guard is the narrower repair. Always-fallback is simpler but abandons native undo for ordinary user edits. Avoid native-then-repair: React could observe the wrong input before repair.

Required constructed families: interior combining-mark insertion; interior surrogate insertion; interior ZWJ insertion; partial-cluster deletion; corresponding complete-cluster/native-safe boundaries. Vary inserted content independently so the oracle cannot encode a NUL-only workaround. This finite probe supports the strategy; it does not prove all Unicode segmentation behavior in every engine.

## BTR-03 — P2: Missing result can be accepted by allowedTransaction

Reviewed source: test-ui/editor-keyboard.oracle.test.ts, allowedTransaction at the end of the file, before parent repair.

Claim challenged: every transaction result is checked against one allowed host outcome.

Witness: a trace with no `result` observation. `observed` becomes undefined; no allowed object matches nativeResult undefined; `expected` also becomes undefined. `differs(undefined,undefined) ?? pass` returns pass. A trace carrying only a separate `error` observation has the same issue because allowedTransaction does not check that checkpoint.

Evidence status: READ FROM SOURCE plus the pinned differs contract (same data returns undefined). This is a concrete checker-hole prediction, not a claimed registered mutant kill/survival. Add a bound corrupted-trace calibration removing the result or recording only an error to verify the repair through oracle-gaps.

Repair: explicitly reject missing observation and missing allowed match; retain separate error rejection. Parent was informed and stated this would be repaired.

## BTR-04 — P2: Filtering every keydown hides production-generated keydown effects

Reviewed source: textarea-driver-oracle.ts line48 before parent repair filters all ['event','keydown',...] rows, intending to remove the one harness-dispatched setup event.

Witness/design consequence: a production mutation that preserves selectionchange but additionally calls `el.dispatchEvent(new Event('keydown'))` produces an externally visible event. The adapter's keydown listener treats this unmodified empty-key event as unrecognized; the broad filter then removes its effect row, so this part of the check cannot distinguish it from the original. The intended setup exclusion should apply to one driver operation, not all later production events.

Evidence status: READ FROM SOURCE; a proposed authored experiment is the additional-dispatch mutation above. No competing suite was run to claim survival. Parent was informed and stated this would be repaired.

Repair: call the saved native `dispatch(event)` for the initial harness event and remove the broad filter; production's wrapped dispatches then remain observable. If needing an explicit native-event observation, tag the one setup operation by identity rather than by event type.

## BTR-05 — P2/transport limitation: Browser helper call budget is not enforced while browser code runs

Claim challenged: browser-driver-oracle.ts lines26–28 claim the replay preserves work semantics. Finite completed runs replay helper hits correctly, but pinned capture-setup.mjs hit()/spin() enforce callBudget during execution, while browser helpers only append unbounded calls. A synchronously spinning browser mutant cannot return its packet for Node replay, so the pinned call-budget/spin classification cannot run at the expected point.

Evidence status: READ FROM SOURCE, not an observed current formatting mutant. No adversarial infinite browser was launched while the parent suite was active. This is a transport limitation/testing idea rather than a claim that an existing reported kill is false.

Next experiment/repair: use a deliberately bounded synthetic helper loop, then an isolated infinite-loop mutant if safe, to compare the browser and capture budget classifications. Mirror the unit/run callBudget in the browser and preserve timeout/setup status when returning capture, rather than letting the browser grow memory until an external timeout. Do not convert this safety failure into a product-law rejection. Current formatting loops use finite source inputs, so this finding does not by itself invalidate the completed finite sample.

## BTR-06 — P2/transport limitation: Instrumentation setup errors can be caught as production errors

Claim challenged: browser-driver-oracle.ts comments say unsupported relational object coercions are rejected as setup, rather than as product failures. Its compare() throws ordinary Error('Unsupported browser instrumentation operand') inside the SUT call. browserCall's catch, and textareaDriver's catch/window-error capture, catch that same Error and return it as production-error data. A checker can therefore reject a law for an unsupported bridge operand rather than actual mutated product behavior.

Evidence status: READ FROM SOURCE. No legal current formatting history was found that uses relational object operands: current comparisons are primitive. This is a genuine error-classification inconsistency in the bridge, not an established production defect or a reason to modify production.

Next experiment/repair: an isolated temporary instrumented expression cmp(id, {}, 0, '<') inside the callback demonstrates the catch path. Brand transport faults and rethrow them outside product-error capture (or collect a separate transport-error packet and reject setup before observations). Preserve the original production throw independently. Do not count unsupported bridge behavior as a mutant kill.

## BTR-07 — P3/docs: The wrapper's fresh-document promise overstates actual isolation

Reviewed source: scripts/formatting-oracles.ts says every history gets a fresh document/module. browserDocument actually retains one page per imported driver module, and each browserRun evaluates a fresh module in the existing document. textareaDriver replaces body content; navigator.platform overrides survive on that page, and the document/undo manager is not replaced per history.

Evidence status: READ FROM SOURCE. Current handler histories explicitly set navigator.platform each time and use fresh textarea elements, so this is not an asserted current behavioral failure. The module itself is freshly evaluated as claimed.

Repair: describe fresh module plus fresh DOM fixture accurately, or create/reset a document/context if full isolation is required by later histories. Include controlled two-history checks if global DOM/undo state is intentionally shared.

## Controls and successful evidence

- Compared every mirrored helper (m,v,cmp,not,b,chain,open,ran,cond) against capture-setup.mjs. Primitive operator/conditional/optional-chain return semantics agree on source inspection. Nonprimitive strict-equality identity is preserved within each packet by reference IDs; truthiness/nullishness also survives Node placeholders.
- The browser source plugin transpiles the exact Vite-received module after instrumentation and keeps the source as an export. It avoids rereading unpatched source directly.
- Read-only result inspection confirms the prior automatic sample completed (not stuck): /private/tmp/blygger-browser-native.log. Baseline2454 checks pass; automatic M206 plus21 authored mutants were killed;0 gaps in that partial sample. M206 is an inFence conditional mutant killed by unicodeCloser; the original marker-only authored mutant is also killed in the separate proof run. These are finite registered oracle-path kills, not setup crashes.
- The four-character dispatcher authored mutant is now killed by the constructed caret history, addressing the initial keyboard review's selection-shape hole.
- KR1 model error, KR4 resolver expectation issue and KR5 ignored-chord calibration binding were repaired in the inspected follow-up: break context comes from prefix/fence; expectations are in handlerEdit/model; Ctrl+B calibration preserves result shape.
- Real browser transport addresses the original fake-host normalization premise: CR/CRLF results are supplied by Chromium. Model newline normalization is independent of the production functions.
- Parent is adding native input-delivery observations and an application receiving oracle. Existing keyboard prose still mentions the old fake-host/Playwright complement. This is in-progress work; final evidence/prose must describe only retained oracle drivers, real receiving state and native undo observations. No claim is made here that the receiving oracle already exists or passes.

## Required next evidence

Finish BTR-01/02 family coverage and oracle-first repairs; add checker/driver calibrations for BTR-03/04; finish the real application/input/undo receiving oracle; then run the full, unsampled gap check and close every reported gap. The22-mutant sample is useful transport proof but is not complete no-gap evidence. No final full-coverage verdict is warranted from this review alone.
