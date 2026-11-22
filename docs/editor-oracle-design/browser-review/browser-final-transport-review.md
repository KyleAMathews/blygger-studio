# Final keyboard and browser-transport review update

Reviewed 2026-11-18 at `/Users/kyle.mathews/programs/blygger-studio/.worktrees/oracles-explore`, HEAD `28b0c8d642a87e5810ad6eabd95c2d1714c53396` plus in-progress uncommitted work. This is a focused independent child review, not the whole project's final audit. I read the pinned `@tanstack/oracles` SHA `97a4e7a` review skill, checklist v1, and glossary in full after the review handoff. No repository or production edits and no competing oracle suite were made by this reviewer. Temporary probes executed the actual production module in Chromium.

Original reports remain lossless at:

- `/private/tmp/blygger-keyboard-review.ET8NPJ/review.md`
- `/private/tmp/blygger-browser-transport-review.md`

## Current verdict

The inspected source repairs BTR-01 through BTR-07, with the evidence qualifications below. The new real-application receiving oracle supplies real React/input/native-undo evidence absent from the old simulated host. A full no-gap claim remains unestablished: the observed whole-file run is a partial sample and has a code-block HTML baseline failure being repaired separately. I also found a Unicode keyboard authority/model-independence challenge and stale keyboard prose. Preview synchronization needs a stronger checkpoint correlation before treating its structural results as deterministic.

## Original finding dispositions

| ID | Latest disposition and evidence |
| --- | --- |
| BTR-01 collapsed empty deletion | Repaired in source: collapsed empty replacements choose native `insertText('')`, not `delete`. Registered RED was captured before repair. My temporary proposed-fix probe passed all 36 range/native/insertion combinations and retained prior native undo. Actual Chromium native no-op returns success without source/caret loss. |
| BTR-02 grapheme snapping | Repaired in source: native editing is allowed only when both UTF-16 replacement endpoints are grapheme boundaries; exact `setRangeText` fallback otherwise. This matches my independent 990-case/strategy probe: native-only had 430 mismatches; boundary guard had zero. Added constructed cases cover combining interior/boundary, surrogate interior, ZWJ and partial-cluster deletion. The model does not copy `Intl.Segmenter`; it accepts successful native, refused native then fallback, and direct fallback, always requiring exact source/selection. App receiving oracle protects native undo for normal boundary-safe edits, rejecting an always-fallback design. Finite Chromium probe evidence is not a proof for every Unicode version/engine. |
| BTR-03 missing-result acceptance | Repaired in `allowedTransaction`: absent result or absent allowed match explicitly rejects. Source inspection confirms the undefined/undefined pass hole is closed. A bound missing-observation calibration would give direct registered evidence; I did not run one while the parent suite was active. |
| BTR-04 broad keydown filtering | Repaired: setup dispatch calls saved native `dispatch(event)` and production dispatch effects are retained without event-type filtering. Source inspection confirms additional production keydowns are now representable. I did not claim a registered added-keydown mutant kill. |
| BTR-05 in-browser helper budget | Repaired at source level: active call budget/probeSites forwarded; browser records helper hits, with both conditional sites counted and probe-only sites ignored, then interrupts before unbounded capture growth. Node replay should reach pinned spin classification; optional-chain replay suppresses only TypeError, not runner spin Error. I inspected alignment with capture-setup.mjs `hit`, `cond`, and `chain`; no adversarial spinning suite was run. Budget-classification receiving experiment remains unperformed, so do not cite it as tested. |
| BTR-06 transport errors mistaken for product errors | Repaired at source level: `setupFault` records distinct transport errors, and capture rethrows these outside product-error observations after replay. Unsupported object relational operands and unknown comparators cannot silently become expected product-law failures. No legal formatting history using unsupported object relational coercion was found; no synthetic transport-error run claimed. |
| BTR-07 document-isolation wording | Repaired in wrapper: direct histories get fresh modules/textarea fixtures and real app histories get isolated browser contexts. This accurately describes retained-page direct drivers and fresh-context session drivers. |

## New KTR-01 — Unicode key folding is shared by production and model

Claim challenged: the adopted keyboard law says only Cmd/Ctrl+B/I/K formats, unknown key strings return null, and the chord model independently judges production classification.

Authority: `editor-keyboard.oracle.test.ts` opening law and `editor-key-classification.law`; user approved unknown keys returning null on 2026-11-18. Production comments name B/I/K.

Smallest witness: Ctrl+U+212A KELVIN SIGN, `mac:false`, other modifiers false. `formatKey` returns `link` because Unicode lowercase maps `K` to ASCII `k`. The independent `chord` model uses the same `h.key.toLowerCase()` normalization and agrees. Neighbor keys Greek κ and fullwidth Ｋ return null. ASCII k/K return link.

Evidence status: RUN on actual production module in real Chromium. `/private/tmp/blygger-keyboard-review.ET8NPJ/kelvin-key-probe.cjs` and `.output`. Production source is `format-shortcuts.ts` lines196–200; model source is `keyboard-model-oracle.ts` `chord`.

Interpretation: this confirms observed behavior and shared model semantic machinery. If the approved law means ASCII key names, it is a defect currently missed by the oracle and should first be made RED with a model based on explicit literal ASCII membership. If the law intentionally permits all Unicode case equivalents, document that authority rather than silently accepting it. This review does not invent a new keyboard policy.

General repair: independently derive documented membership from the six literal spellings b/B/i/I/k/K and add a generated unknown-neighbor family containing Unicode casefold-to-ASCII symbols. Retain arbitrary unknown key strings. Capture registered RED before any production classifier fix, then keep a mutant that reinstates broad lowercase behavior.

## New KTR-02 — Keyboard prose still describes removed simulated boundary

Claim challenged: literate oracle prose must describe current law, driver, and limits (ORC-003).

Evidence status: READ FROM SOURCE, `editor-keyboard.oracle.test.ts` lines4,16–18,27–32 and line63. It still says native undo remains in Playwright, native commands are supplied by a fake environment, and every valid edit attempts native. Current implementation executes the actual module in Chromium, direct fallback is allowed for unsafe native ranges, and registered session oracles run native undo. `textarea-model-oracle.ts` also has a comment referring to the fake host.

Repair: update prose and law limits together to name the real DOM driver, forced-native-refusal premise, native-safe/direct-fallback allowed set, and actual application receiving oracle. This is a documentation conformance finding, not evidence that the executable checks are wrong.

## New KTR-03 — Preview checkpoint may select an unrelated pending response

Claim challenged: session-driver's structural snapshot runs after React commits this action's preview response.

Evidence status: READ FROM SOURCE; no observed survivor or baseline flake claimed. `session-driver-oracle.ts` lines45–62 waits for any POST URL containing `/preview`, then waits only until current `#preview-body.textContent` equals that response HTML's textContent. A pending preview caused by prior fill/indent can satisfy the response predicate. Different nesting or paragraph/break structures can have identical textContent, so this does not establish that the post-action structural preview has committed. A malformed/dropped preview can also become a Playwright timeout before the law sees a snapshot; a timeout must not be reported as a law kill.

Repair/next experiment: bind the response request's `contentMd` to the actual post-action textarea source, then synchronize on that response's relevant DOM structural commitment (not just textContent). Keep production response data only as a checkpoint locator; judge source/nested-list/paragraph/break observations against the independent model. Optionally delay/reorder two preview responses in an isolated driver test to demonstrate deterministic checkpoint choice. Do not run it as a competing mutation suite.

## Boundary projection under discussion

The latest observed whole-file baseline fails `editor-code-block.literal` on HTML literal contents for `{before:'a', picked:'\ud800', after:'a'}`. The real Worker preview crosses UTF-8/Response representation, unlike the former Node direct string render. The parent proposes standard USVString projection (unpaired surrogate to U+FFFD) only for the expected rendered HTML. This is supported as a host-boundary projection if exact UTF-16 source/selection comparisons remain unchanged, the full history grammar remains intact, and high-surrogate/low-surrogate/valid-pair witnesses remain present. It must not become a grammar filter or production change. I have not inspected the final projection implementation or rerun evidence yet.

## Independent rebuilt observation

From only the replacement contract: source `a`, replacement `[1,1)`, insert `''`, requested final selection `[1,1]` owes source `a` and selection `[1,1]`. History `collapsedDelete` constructs this premise. Driver executes actual `applyEdit` on a real focused textarea and records focus options, command/fallback calls, explicit events, final source/selection and errors. Model walks newline normalization independently and returns the allowed native/native-refusal/direct-fallback transaction set. `allowedTransaction` chooses by actual nativeResult and compares all recorded fields. The original `delete` implementation violates source; the inspected `insertText('')` implementation preserves it. Nearby beginning/middle/end positions and forced fallback distinguish source geometry from the native command behavior.

## Checklist scope outcomes

| Requirement | Outcome for this focused review |
| --- | --- |
| ORC-001 authority/limits | Conditional: keyboard Unicode interpretation requires resolution; real-host prose must match executable boundary. Adopted exact replacement law has authority. |
| ORC-002 independent judgment | Transaction model avoids Segmenter and independently normalizes host newlines; chord lowercase sharing requires KTR-01 resolution. |
| ORC-003 literate responsibilities | Mechanics distinguishable; KTR-02 stale prose remains. |
| ORC-004 grammar controls | Empty ranges/inserts now independent axes; cluster families constructed. No quiet narrowing found in reviewed repair. Full domain audit belongs to parent record. |
| ORC-005 path/observation | Real Chromium SUT plus actual React receiving path; KTR-03 preview checkpoint concern remains. |
| ORC-006 calibration | Existing named corruptions and reported registered authored kills inspected; no new synthetic transport calibration claimed. |
| ORC-007 campaigns/replay | Uses registered oracleProperty fixed/random campaigns; direct replay printed by observed runner. |
| ORC-008 model minimality | Host allowed set distinguishes native success/refusal/no command; session undo/redo state distinguishes continuations. No extra dead state found in focused review. |
| ORC-009 vocabulary | Real production terms source/selection/command/effects align; stale fake-host wording needs update. |
| ORC-010 failure/cleanup | Per-history real app context closes in finally; transport errors separated; source-level budget fix inspected. Adversarial budget run not performed. |
| ORC-011 second formulation | Real browser app receiving oracle independently checks React persistence, native undo and preview structure; Unicode key canonicalization challenge still open. |
| ORC-012 review evidence | This raw report is temporary and not versioned; parent must incorporate dispositions and final run IDs into versioned evidence. No full-audit claim here. |
| ORC-013 boundaries | Original and nearby empty range/grapheme witnesses probed; exact replacement plus native-undo witnesses distinguish always-native/always-fallback. |
| ORC-014 receiving handoff | Native success/failure and fallback checked in Chromium; session oracle supplies actual React/native-undo receiving premise. Other engines remain outside established evidence. |
| ORC-015 declared reach | Constructed families present and run by registered campaigns. Cluster cases currently enter generic native/insert/delete states; explicit semantic reach labels would strengthen reviewability. |
| ORC-016 law-only files | Reviewed files register oracleProperty, with fixed cases routed through shared models/checks; no standalone unit test found. |

No requirement is marked globally inapplicable: this focused change has triggers for all sixteen. Some acceptance evidence is explicitly pending, rather than guessed from source inspection.

## Run evidence and limits

Earlier finite proof `/private/tmp/blygger-browser-native.log`: 2454 baseline checks passed; automatic M206 plus21 authored mutants killed, 0 gaps in that partial sample. Original marker-only authored mutant also killed in separate proof; four-character dispatcher mutant killed by added caret history. These are useful transport/calibration evidence, not complete no-gap evidence.

Latest observed `/private/tmp/blygger-browser-all.log`, run directory `2026-11-18T16-04-10-325Z-d7dd325b`: code-block baseline fails 4/279 at the lone-surrogate rendered HTML checkpoint; inline297, keyboard1464, break111, list306, session72, valid-input18 pass. The run is `--sample 1`, so even after all authored mutants pass it cannot establish whole-source no gaps. Required next evidence is green baseline after the justified boundary projection, resolved review findings, and the full unsampled gap campaign with every outcome classified. Setup/runtime errors and timeouts do not count as law kills.
