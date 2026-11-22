# CommonMark fence-info oracle — independent review before production

2026-11-18. Source review only; no browser/test jobs, production edits or oracle implementation edits by this reviewer. Read the pinned review skill, checklist v1 and glossary during the continuing review. Reviewed the new `infoArbitrary`/plan/model/states, `editor-line-break-opening-info`, the current mixed semantic reach and selected-code fallback constructions. Source hashes below identify this review; the parent is collecting RED evidence before changing the scanner.

## Authority and intended boundary

The parent reports that Kyle Mathews (GitHub KyleAMathews), 2026-11-18 explicitly adopted CommonMark's distinction between backtick code spans and fenced openers and authorized an oracle-first fix. The law/authority and `sequence-design-grammar.md` record that decision, CommonMark 0.31.2 §4.5, and retention of the **prefix before the caret** as the information boundary. This resolves the former MIX-R2b authority question. It does not make every proposed model answer correct.

CommonMark permits backticks in a tilde fence's info, and forbids them in a backtick fence's info. The initial contiguous delimiter run determines fence width; delimiter bytes are not info bytes merely because a history field calls them `ticks`. Installed independent MarkdownIt's `rules_block/fence.mjs:18–33` makes the same distinction: first consume the complete marker run, then inspect the remaining params for backticks. This source is corroborating evidence, not the adopted authority.

Rebuilt intended observation: three backticks, `js`, one additional backtick, caret at end, and suffix `tail` outside an empty selection. The nonempty prefix is not a fenced opener, so Shift+Enter inserts backslash+LF, retains every prefix/suffix byte and places the caret two UTF-16 units after the original caret. The corresponding tilde opener with the same `js` plus backtick info remains a code fence and inserts only LF. The proposed pure model distinguishes marker/tick count and predicts these results without using production. The browser driver calls the actual instrumented `breakEdit`, records the complete returned edit/output and checks both plus absence of error. That path/checkpoint design is appropriate once the grammar/model contradictions below are repaired.

## INFO-R1 — Adjacent ticks are modeled as invalid info but are a wider valid fence [P1]

- **Challenged claim:** every positive generated tick count is a backtick in the info string.
- **Source:** `infoPlan` concatenates `marker.repeat(width) + language + backticks(ticks)` (`break-model-oracle.ts:135–137`). `infoArbitrary` admits `language:''` (`:128`). `infoModel` requires a hard break for every backtick marker with positive tick count (`:139–141`).
- **Smallest witness:** marker backtick, width3, empty language, ticks1, opener checkpoint, empty selection/suffix. The actual prefix is **four consecutive backticks**. It is a valid width4 fence, with empty info, so the adopted rule owes an ordinary LF. The model instead owes backslash+LF. The body checkpoint has the same contradiction.
- **Evidence status:** read from source, no probe or campaign by this reviewer. A failure on this witness cannot serve as RED for the invalid-info production defect.
- **Repair:** make the generated info boundary real, for example by separating a positive info-tick run from the opening delimiter with a non-marker separator, or classify contiguous additional ticks as a wider valid delimiter and construct that nearby legal case. Retain the intended empty-info case. Do not fix production to match the present contradictory annotation, and do not treat it as valid to infer info membership solely from the field name.

## INFO-R2 — Every constructed info case uses a language excluded by its arbitrary [P1]

- **Source:** `infoArbitrary.language` is one of empty, `js`, `text ` (`break-model-oracle.ts:128`), while all16 `infoCases` use `language:'x'` (`:132–133`).
- **Consequence:** the framework's constructed-history admission check should reject these histories before the law runs. No such load/setup result is a product assertion or a mutant kill.
- **Evidence status:** read from source; no command executed by this reviewer. The active RED job must be interpreted according to its actual result category.
- **Repair:** admit the intended case language in the same arbitrary, or build the constructions with an already admitted language, preserving the generated semantic dimension and all case obligations. Retain the prior failed/load receipt if one is produced.

## INFO-R3 — Opening prose claims unrelated code containers are covered [P2]

- **Source:** `editor-line-break.oracle.test.ts:35–36` now says “Indented/quoted/list code containers, invalid opening info strings are covered by the separate opening-info property below.” The new resolver generates only an optional0–3-space prefix, marker run and info at document start, optionally followed by ordinary `body`. It generates no blockquote, list container or four-space indented block. The executable opening-info limits correctly say nested containers remain separate (`:84`).
- **Evidence status:** read from source. This is an ORC-001/003 prose/coverage mismatch, not a product defect.
- **Repair:** state separately that invalid opening info is now covered by the new property and that other code containers remain outside these envelopes. Do not expand production scope accidentally through prose.

## Mixed repair dispositions

MIX-R5 is repaired in source: the11 selected-code cases retain the original seven and add native/forced-fallback prefixes at widths3/12. `mixedCodeStates` declares `nativeCollision`, `fallbackCollision`, minimum/maximum widths, and the same semantic model/driver/check judges them. This closes the previously random-only receiving construction issue; execution/kill evidence remains the parent's responsibility.

MIX-R4's prior after-scene and populated-redo witnesses are repaired in source: reach folds the current independent state, and `branchClearedRedoAttempted` requires a known-empty actual modeled redo stack. However, one opener reach false positive remains:

- Start code scene with body `a`, then break at offset7 inside the **closing** delimiter of `` ```\na\n``` ``.
- `rowStart` is6. `literalAt(state.value,6)` parses a prefix ending in LF and compares offset6 with the token map's end at the same offset, returning false. The `openingRow` predicate then accepts the closing row as an opener; offset7 is reported as `partialFenceOpening` (`mixed-model-oracle.ts:166–174`).
- This is **read from source**, not an executed failure. The break result itself is still modeled as literal code correctly at offset7; the defect is the named reach predicate. Use independent token opening-line identity, or equivalent actual open-context information, to distinguish opening from closing delimiter rows when naming reach. No product-law change is required.

## Requirement outcomes before RED/fix

| Requirement | Outcome |
| --- | --- |
| ORC-001 | New CommonMark decision resolves prior authority question. INFO-R3 prose falsely claims container coverage. |
| ORC-002 | Declarative count/marker model is independent, but INFO-R1 makes its annotation inconsistent with its concrete source. |
| ORC-003 | New property parts are distinguishable; INFO-R3 prose needs correction to match executable limits. |
| ORC-004 | Bounds/axes and adjacent valid marker/tick states are explicit. INFO-R1/R2 currently break legal reconstruction/admission. |
| ORC-005 | Actual browser function and complete edit/output/error comparison accepted from source. No RED claim accepted yet. |
| ORC-006 | Invalid-opener calibration present. Product RED, post-fix mutant and green receipts remain pending; load/setup failures are nonkills. |
| ORC-007 |100-run fixed/random registered campaigns and replay retained; active result not read as complete. |
| ORC-008 | New info property is stateless; stateful-model minimality trigger does not apply to this property. Mixed reach changes preserve the existing independently justified state. |
| ORC-009 | Marker width versus info tick vocabulary needs the concrete boundary correction in INFO-R1. |
| ORC-010 | Actual browser-call errors become observations, and existing transport cleanup retains diagnostics. No failure path injected here. |
| ORC-011 | Mixed prefix MarkdownIt classification is a meaningfully different formulation of the intended syntax rule, after grammar coherence is restored. |
| ORC-012 | This pre-production source review records raw defects, authority and hashes; planned execution still required. |
| ORC-013 | Marker/tick0 versus tick1 and width3/12 constructions target relevant boundaries; contiguous delimiter-extension neighbor is currently misclassified (INFO-R1). |
| ORC-014 | This property claims only direct browser function receipt; actual keyboard mixed receiving remains separate. Selected-code fallback construction repair accepted in source. |
| ORC-015 | Intended states are declared but current histories are inadmissible (INFO-R2); mixed closing/opening reach distinction remains open. |
| ORC-016 | Law-only property and model files, no ordinary unit tests or standalone fixed expected answers. |

No production change was present in this source snapshot. These findings do not revoke the user's authorization; they identify oracle work needed for a valid, reviewable RED receipt before the authorized scanner fix.

Reviewed SHA-256 inputs:

```text
ef9713f93772f19b05ec53ee1341cfc97924e939d5b1bbdd50a90e0d857a8b7c  test-ui/editor-line-break.oracle.test.ts
fafb17b31fb0447180aacb6af4c6c3176f63351c66def803c330223809152fdf  test-ui/editor-oracles/break-model-oracle.ts
979f0233fa0a45c9262d5e996c8b2c2f1b229ca291798687b91f8b81ae255d96  test-ui/editor-oracles/mixed-model-oracle.ts
964bd9d07f467cf7dd256eace50a136197f4cbd004df0c98d896b1ed552de1c5  test-ui/editor-oracles/mixed-code-model-oracle.ts
3da803515b024126d880c6d25db23f77145df1a41fccdbe4db650aa11427cb54  src/ui/format-shortcuts.ts
bbc69df5b1d8d8ee967f85a722996557b17e7944fe7f393b566c862b89f58ab2  docs/editor-oracle-design/sequence-design-grammar.md
```

## Re-review after oracle repair, registered RED and minimal scanner change

2026-11-18. Read the repaired oracle/model/reach and the subsequent scanner change. Executed only the pure semantic controls below, with no browser or registered-law jobs. The parent collected the browser RED and is collecting GREEN/mutant evidence. The pre-production findings above describe source read before the immediate repairs; the first hash collection raced those repairs and already captured repaired oracle/model contents for some files. It must **not** be treated as an exact snapshot of the unrepaired source. The hashes below bind this current re-review and its pure-control receipt.

### Oracle finding dispositions

INFO-R1 is repaired. `infoModel` now calls info invalid only for a backtick marker, a nonempty intervening language and a positive tick count. Empty-language adjacent ticks extend the delimiter, and `extendedRun-opener`/`extendedRun-body` construct that case. INFO-R2 is repaired: `x` is explicitly admitted. INFO-R3 is repaired: quoted/list containers are stated as unestablished and invalid opening info is separately assigned to the new property.

The CommonMark decision and prefix information boundary remain explicit. No old constructor, fixed seed or campaign budget was removed. The new source-output/caret law and separate keyboard receiving path remain coherent.

### Pure semantic controls actually executed

Loaded only the pure model modules and independent MarkdownIt `commonmark` parser in Node/tsx. Enumerated **384 contexts**: marker backtick/tilde × base width3/4/12 × indentation0/3 × added ticks0/1/3/12 × language empty/`x`/`js`/`text ` × opener/body checkpoint. For each independently constructed prefix, parser fence presence predicted ordinary LF versus prose backslash+LF. Compared that prediction with `infoModel`'s insertion: **zero mismatches**. This is a bounded second-formulation control, not browser product evidence or a mutant kill.

Checked `infoArbitrary.canShrinkWithoutContext` for all **18 current constructions**: all admitted. The current repaired grammar therefore resolves the prior specific admission defect. A later browser run remains responsible for its own admission/driver results.

Six independent expected reach controls were executed against `mixedStates(mixedPlan(history))`:

| History/control | Expected state observation | Result |
| --- | --- | --- |
| Code scene `a`, break offset1 | partial opening true | Pass |
| Same scene, break offset3 | completed opening end true | Pass |
| Same scene, break offset7 in closing delimiter | partial opening false | Pass |
| Code scene overwritten with `abc`, break offset1 | partial opening false | Pass |
| B/I/undo/type/undo/redo | cleared-empty-branch redo false | Pass |
| B/I/undo/type/redo | cleared-empty-branch redo true | Pass |

The current row-context probe includes the first marker at `rowStart+1`. That distinguishes an already open fence's closing row from a new opening row when the earlier prefix ended exactly at LF. It repairs the residual MIX-R4 witness. The independent model fold/known-empty redo test also retains the earlier repaired controls. MIX-R4 and MIX-R5 are accepted as repaired in source for the challenged combinations; these pure controls are not a claim of exhaustive semantic reach.

### Registered RED and production-order evidence

Read `build/formatting-oracles/commonmark-info-red/summary.md`, run `5918f119867d`. The unchanged-production baseline reports **15 failures of171 checks**, with an actual `OracleViolation` at checkpoint `edit`, law `CommonMark fence info`, through registered property `editor-line-break-opening-info`. Its shrunk witness is backtick marker, width3, indentation0, one info tick, opener checkpoint, language `x`, empty selected/suffix text. That is the independently rebuilt invalid-info context above, not the corrected adjacent-delimiter case.

This is valid RED evidence for the adopted new syntax rule. The report's selected closing-fence mutant is blocked by the red baseline and is **not** a kill. The parent reports the production edit occurred only after this receipt; the GREEN/mutant job is still active at this review.

### Scanner change review

Current `inFence` adds exactly one validation inside the existing `!open` branch: a backtick marker opens only when the suffix after its greedy marker match contains no backtick. Tilde openers bypass that restriction. Greedy matching already consumes adjacent delimiter ticks, so the newly constructed wider-delimiter case stays valid. The check does not apply while a fence is already open, preserving literal code and the existing matching-width/marker/ASCII-tail closing rule. The separate final-closing-line newline protection remains unchanged.

This is a source-accepted minimal implementation of the approved policy. It changes the owned original path rather than adding a parallel mode or exception flag. It does not by itself establish CommonMark container parsing or arbitrary Markdown conformance. Actual GREEN and the original-invalid-info/closing-fence mutant classifications remain required before production bug closure is claimed.

### INFO-R4 — Base width and effective marker width need distinct bounds [P2, documentation]

The executable law's limit still says `width3–12`, while an empty language plus base width12 and twelve adjacent ticks produces a valid effective opening run of **24**. The corrected model deliberately supports that input. Clarify that3–12 is the generated base run, with up to12 adjacent extension ticks and effective width up to24. Similarly, `oneInfoTick`/`manyInfoTicks` currently name added-tick counts even for extended delimiter runs; qualify those labels as added ticks or require actual info membership. This is a range/vocabulary precision issue (ORC-004/009/015), not a reason to narrow the corrected grammar or change production. The distinct invalid-info and extended-run states already preserve the main semantic distinction.

### Updated requirement outcomes

| Requirement | Outcome after repair |
| --- | --- |
| ORC-001 | Adopted CommonMark rule, prefix boundary and limits explicit. No unresolved authority blocker remains for this defect. |
| ORC-002 | Independent annotation model accepted;384 parser controls agree. |
| ORC-003 | Prose coverage mismatch repaired; parts remain distinguishable. |
| ORC-004 | All18 constructions admitted; adjacent-run reconstruction repaired. INFO-R4 bounds clarification remains. |
| ORC-005 | Registered RED reaches complete actual browser edit comparison; GREEN pending. |
| ORC-006 | Named calibration and real RED witnessed. Original-defect/closing mutant kill receipt pending; red report's blocked mutant is nonkill. |
| ORC-007 | Same100-run fixed/random registered campaign and replay preserved. |
| ORC-008 | Stateless info property remains not applicable to model-state minimality. Mixed state distinctions are justified and the challenged reach controls pass. |
| ORC-009 | Marker/info separation repaired semantically. INFO-R4 added-tick vocabulary precision remains. |
| ORC-010 | Browser error/capture/cleanup design unchanged; no new source suppression. |
| ORC-011 | Executed independent parser control corroborates both invalid info and contiguous extension semantics. |
| ORC-012 | RED and pure-control receipts, temporal order and current hashes recorded; no final bug closure before GREEN/mutants. |
| ORC-013 | Actual invalid-info distinguishing witness plus valid marker/zero-tick/extension neighbors retained. |
| ORC-014 | Direct browser production-function RED established; mixed keyboard receiving remains separate execution. |
| ORC-015 | Current constructions require the main semantic distinctions; challenged mixed false-positive controls pass. INFO-R4 label precision remains. |
| ORC-016 | No ordinary unit tests introduced; pure review controls are evidence, not production/oracle registrations. |

Current SHA-256 inputs, confirmed with the pure-control run:

```text
ef9713f93772f19b05ec53ee1341cfc97924e939d5b1bbdd50a90e0d857a8b7c  test-ui/editor-line-break.oracle.test.ts
fafb17b31fb0447180aacb6af4c6c3176f63351c66def803c330223809152fdf  test-ui/editor-oracles/break-model-oracle.ts
16856cbc075ac0efbbe1e4130df8f1e45481c2dfd191a9a7fefbf619c6d30185  test-ui/editor-oracles/mixed-model-oracle.ts
964bd9d07f467cf7dd256eace50a136197f4cbd004df0c98d896b1ed552de1c5  test-ui/editor-oracles/mixed-code-model-oracle.ts
c4a34e5d1faa4c94df876f45577e3f173fc83267a4851c078f523406d5ccc967  src/ui/format-shortcuts.ts
bbc69df5b1d8d8ee967f85a722996557b17e7944fe7f393b566c862b89f58ab2  docs/editor-oracle-design/sequence-design-grammar.md
```

## Completed execution addendum

2026-11-18. Independently read the completed `summary.md`, `results.json`, `stream.log` and relevant receiving reach output in the two directories below. No browser or source edit by this reviewer. Only documentation was changed to clarify base/effective delimiter bounds. Parent supplied the execution jobs; this review verifies their stored classifications rather than claiming to have rerun them.

| Receipt | Baselines | Mutant result | Scope |
| --- | --- | --- | --- |
| `build/formatting-oracles/commonmark-info-full`, run `f57f2a0ee9e2` |171 pass twice, no skipped/nondeterministic cases |54 owned reproducible law kills, zero crashes, zero owned gaps;359 unowned warnings | Complete generated mutation report for the break ownership selected by this file; not a whole-formatting ownership report. |
| `build/formatting-oracles/mixed-info-receiving`, run `4728aaef036c` |129 pass twice, no skipped/nondeterministic cases |3 selected authored law kills, zero crashes, zero gaps among those three | Explicit `--only` campaign for original invalid info, fixed triple fence and native undo. It is not a complete mixed-property mutation sweep. |

Both results are nonprovisional and list no exclusions. The stream logs confirm repeated unmutated passes (171 checks in8.0s/7.5s;129 in129.2s/118.9s). The CommonMark report's first-reject totals are49 `line break`,4 `CommonMark fence info`,1 `verse hard breaks`. Unowned warnings are not judged results and are not evidence of closure for their functions.

### Registered rejection routes and checkpoint attribution

The result files record actual reproducible killed routes and law names. They do **not** retain a raw per-mutant `OracleViolation` checkpoint field. The checkpoint column below is therefore traced from that exact route, mutant effect and the checked source, rather than represented as a field present in `results.json`. The earlier unchanged-production RED independently retained the explicit `edit` violation.

| Wrong production design | Verified killed route/law | Source-traced comparison checkpoint |
| --- | --- | --- |
| Restore invalid-info opening unconditionally | ``editor-line-break-opening-info > fixed seed 20261118: `1opener``, `CommonMark fence info` | `edit`: ordinary LF disagrees with owed backslash+LF and its caret. |
| Break protection removed on final closing delimiter | `editor-line-break > fixed seed 20261118: closingEnd`, `line break` | `edit`: closing-line insertion disagrees before the output check. |
| Restore invalid-info opening in the real React receiver | `editor-browser-mixed > fixed seed 20261118: inlineFenceInfo-false-false`, `mixed browser editing history` | `step1`, source field, after real typing merges opener/body/closer and Shift+Enter acts on that input. |
| Fixed triple-backtick wrapper | `editor-browser-mixed-code > fixed seed 20261118: click-false`, `mixed literal-code receipt` | `collisionRendered`: selected source/envelope can still be recorded, but embedded delimiters prevent one complete literal code block. |
| Force all formatting off the native undo path | `editor-browser-mixed > fixed seed 20261118: structure-false-true`, `mixed browser editing history` | `step7`, source after actual Undo following the structure/formula prefix; native history is the distinguishing effect. |

These are registered law kills, not timeouts or setup crashes. The CommonMark RED → minimal source change → repeated GREEN → original-defect kill chain is now present for the reviewed single-prefix opening-info bug class. The receiving original-defect kill additionally demonstrates the actual React typing/keyboard path using the independent mixed parser model. The closing-fence mutant confirms that the retained closing-line policy remains independently enforced.

### Final source dispositions and limits

INFO-R1/INFO-R2/INFO-R3 are closed by the repaired coherent grammar/model/prose and their admitted, passing campaign. INFO-R4 is now repaired in source: law limits distinguish the base3–12 run and up to12 extension ticks, and `oneInfoTick`/`manyInfoTicks` require actual info membership. This reviewer added the matching effective-width explanation (up to24) to `sequence-design-grammar.md`. MIX-R1/MIX-R3/MIX-R4/MIX-R5 source repairs retain their prior independent review and pure controls, with actual receiving kills for the cited native/collision/info designs.

The closure boundary remains **adopted CommonMark opening-info rule × generated single prefix or real mixed type→break history × actual instrumented browser `breakEdit`/React keyboard path × exact source/edit/caret observation**, with the neighboring valid backtick, tilde-info, extended marker and closing-line policies. It does not establish arbitrary Markdown containers, blockquote/list fence parsing, OS clipboard behavior, physical browser closing, arbitrary native grouping, every later edit after a freely chosen collision wrapper, or every engine/physical device. These receipts alone do not establish a new browser-engine matrix. Existing component/renderer/session/workflow evidence remains separate. The mixed selected-tick property ends at the semantic rendering checkpoint; later free-width composition remains an explicitly unresolved wider claim.

ORC-005/006/007/012/013/014 execution obligations identified above are satisfied for these cited routes and this bounded CommonMark closure. ORC-001–004/009/015 source issues are repaired as described. ORC-008 remains inapplicable to the stateless info property; the independently justified mixed state and pure controls remain. ORC-010/011/016 retain their prior accepted outcomes. No checklist requirement is waived, and these receipts are not a claim of complete repository or complete mixed mutation coverage.

Current reviewed SHA-256 source inputs:

```text
44a9dc848cb1bcb0483b825839c21b1efef6fc2f9ee16c7b9894a6f807c04e86  test-ui/editor-line-break.oracle.test.ts
fe57377f1fb28f774873dc98ab69086e6b037244e526d6f526e82061fa11734f  test-ui/editor-oracles/break-model-oracle.ts
7e2b4ee20b45c3307c70b102b8ea840df33f1598e8b843aaa6571b2bf313e153  test-ui/editor-mixed.oracle.test.ts
27804036eb5a13cc50c7ac6f43caeab4de026810c33adddcdfe91b518d574f30  test-ui/editor-oracles/mixed-model-oracle.ts
7a231faf98d3a0b1f8adddf0c14fdf7bf031f2c1b6ee6e6b82936c80c13675b7  test-ui/editor-oracles/mixed-driver-oracle.ts
964bd9d07f467cf7dd256eace50a136197f4cbd004df0c98d896b1ed552de1c5  test-ui/editor-oracles/mixed-code-model-oracle.ts
8ad4ecba856c6505657c9c03a5b0125ca91dc98e4689299679d317948e89007e  test-ui/editor-oracles/mixed-code-driver-oracle.ts
c4a34e5d1faa4c94df876f45577e3f173fc83267a4851c078f523406d5ccc967  src/ui/format-shortcuts.ts
```

Documentation and execution-record SHA-256 identifiers:

```text
d52d6637f7ec61ac4bde45899a2444fcee36b714d60259f73afd3891bb889f8a  docs/editor-oracle-design/sequence-design-grammar.md
f0f2ec8407cb232f40133c12f78a7edad46a55aa80058cfc388077fea722a021  build/formatting-oracles/commonmark-info-full/results.json
2b34d1620216c0679555f12aabc7ce6bb35e28e7096e9efe527045fac656d39d  build/formatting-oracles/mixed-info-receiving/results.json
```

## Final information-boundary clarification

A later read-only scope review checked the caret-before-tail neighbor while the full current campaign remained frozen. The adopted decision in `sequence-design-grammar.md` retains **the source prefix before the caret** as the information boundary. The info grammar admits a backtick tail in the suffix independently: ` ```x|``` ` and ` ```x```| ` therefore have different prefix states and predict ordinary LF and backslash+LF respectively. These are source-reconstructed model observations, not additional executed probes or a newly demonstrated defect.

CommonMark determines whether a complete line can open a fence; it does not choose the editing command's information boundary or require preservation of the pre-edit parsed node kind. A policy using the complete current line, the line after selected deletion, or semantic preservation of code spans would require a separate law decision under T5. This clarification changes no law, grammar, model, driver or production source and supplies no new execution result.
