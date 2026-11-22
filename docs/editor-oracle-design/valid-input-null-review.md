# Mandatory break return: independent repair review

Independent reviewer `/root/audit_completed_link_coverage`, 2026-11-18. Reviewed pinned `@tanstack/oracles@97a4e7a` review/design instructions and reread checklist v1/glossary. Base commit `28b0c8d642a87e5810ad6eabd95c2d1714c53396`; unchanged formatter SHA-256 `c4a34e5d1faa4c94df876f45577e3f173fc83267a4851c078f523406d5ccc967`.

## Raw findings before disposition

**NBR-1 — mandatory return was collapsed into the list-decline allowance.** The adopted valid-input law requires `breakEdit` to return a usable edit for every valid source/range. Only `indentEdit` permits null. Public types independently confirm `FormatEdit` versus `FormatEdit | null`. The old driver skips null for every call and reduces the three responses to one boolean. A wrong conditional-NUL null return from `breakEdit` therefore passes despite breaking the law. The existing `context` history has prefix `\0\n    - `, selected `x`, empty suffix, and valid range `[8,9]`; it already reaches this distinction. No new history dimension is needed to expose this witness.

**NBR-2 — contract example had invalid geometry.** The opening `indentEdit('\0\n    - x',10,10,true)` example uses a nine-unit source and out-of-range offsets. Change it to `[9,9]` (or `[8,9]`). The executable `context` construction correctly uses `[8,9]`. This documentation defect was recorded in the scratch ledger before application; it does not invalidate the generated history.

The temp repair preserves the three raw `browserCall` envelopes in break/indent/outdent order. The check requires three responses, permits null only at list positions, checks every returned edit's range bounds, and retains captured errors. Both calibrations now corrupt only the break return while retaining the list observations. The conditional-NUL authored mutant has exactly one declaration match in current source and reaches its injected return through `context`.

## Disposition and evidence boundary

**Accepted as a source repair, with NBR-2 corrected in the applied prose.** This strengthens the existing law; it does not alter a law, model expectation, history grammar, valid-input domain, construction, reach predicate, seed or budget. Production remains unchanged. The source-ready verdict is not a registered browser pass or kill, and does not close the gap before execution.

The author's supplied original/draft disposable observations show the old check accepting the conditional null and the new check rejecting it under `result` / `valid structural edit`. This reviewer independently reconstructed eleven check-boundary cases: valid break plus list declines and usable list returns pass; mandatory null/undefined, list undefined, invalid replacement/final bounds, captured errors, missing observation and missing response entry reject. Each of the two bound calibrations passes its clean trace and rejects its corruption under the intended law.

Those reconstructions use controlled return envelopes and a simple deep comparison outside the framework. They are source/check evidence, **not registered oracle kills, product browser probes, RED/GREEN, or gap-check results**. An initial independent stub supplied only two replies to the three-call driver and produced an invalid undefined envelope; its setup exception is preserved separately. Actual `browserCall` always supplies a wrapper object, including `{value:undefined}` for an invalid undefined production return, which the repair rejects. No browser was launched for this review.

Before claiming closure, run the applied valid-input oracle in its browser pipeline, retain repeated fixed/random baseline and calibration results, and reject `authored:review-valid-input-missing-break-return` through its registered law. Bind that receipt to the applied source. No production repair is needed to correct this checker.

## Checklist v1 accounting

| Requirement | Outcome for this bounded repair |
|---|---|
| ORC-001 | Existing typed valid-input authority and explicit list-null allowance preserved. |
| ORC-002 | Constant usable/no-error expectation remains independent; no production semantics entered the model. |
| ORC-003 | Prose identifies raw returns/check responsibilities; correct NBR-2's example on application. |
| ORC-004 | All UTF-16 partitions, range/exclusion controls, constructions and bounds unchanged. |
| ORC-005 | Raw public return/error envelopes reach the check; mandatory and optional results remain distinguishable. |
| ORC-006 | Two bound calibration corruptions reconstructed; authored declaration matches once. Registered runtime verdict remains owed. |
| ORC-007 | Runs `100`, seed `20261118`, fixed/random registration preserved; fresh execution remains owed. |
| ORC-008 | Trigger absent: no stateful model change. |
| ORC-009 | Actual break/indent/outdent return concepts retained; no new model abstraction. |
| ORC-010 | Production errors remain explicit observations; transport and cleanup unchanged. |
| ORC-011 | Trigger absent: no new shared semantic classifier or plausible semantic fault requiring a second formulation in this constant usability model. |
| ORC-012 | This versioned source review records its scope; final execution evidence must identify the applied file/campaign before closure. |
| ORC-013 | Existing NUL context distinguishes the illegal conditional null; empty/surrogate and legal list-null neighbors remain accepted. |
| ORC-014 | Controlled checker reconstruction makes no real-host claim; the unchanged browser pipeline requires its execution receipt. |
| ORC-015 | Five declared states and four constructed histories retained; fresh runtime reach remains owed. |
| ORC-016 | No ordinary tests added to the maintained oracle. Disposable reconstruction stays outside the repository. |

Design grammar accounting: this repair adds no law, model state/rule, grammar dimension or three-gap trigger. It preserves the existing approved editor design and changes only the observation/check distinction necessary for the adopted return contract.

## Reviewed artifacts

- Temp oracle: `/private/tmp/blygger-inline-key-review.9TraiX/editor-valid-input.oracle.test.ts`, SHA-256 `1fa5d2c03532b74c84917941f41b5bb78687e9fbc884b096a3d627da31de731d`.
- Temp authored mutant: `/private/tmp/blygger-inline-key-review.9TraiX/review-valid-input-missing-break-return.json`, SHA-256 `8bfd073886ad94543dc34060a63a2e8c85f5f515983184b94d7cdc9287a6ad43`.
- Prior oracle: SHA-256 `208833483e8d5f6e5953499446cbc45c76d97879decc0459afc55e50a4cb5905`.
- Independent scratch script/output: `/private/tmp/blygger-null-break-independent.lhKqnn/review.cjs`, `review.output`; initial invalid-stub output: `review-initial-invalid-stub.output`.
- Raw findings and disposition were appended before repository application to `/private/tmp/blygger-browser-review-ledger.md`.

## Bounded registered execution accepted

Independent execution review, 2026-11-19 UTC: accepted run **`671acfc700ff`**, output `build/formatting-oracles/valid-input-return-reviewed`. This completes the earlier outstanding execution obligation for this checker repair. The applied oracle is exactly the reviewed temp draft with the opening example corrected to `[9,9]`; its SHA-256 is `663eb408ab12ec70ea77143aa1b97a418f10ea0bd154b555e15b96abd29d7361`. The authored mutant remains `8bfd073886ad94543dc34060a63a2e8c85f5f515983184b94d7cdc9287a6ad43`, and production remains `c4a34e5d1faa4c94df876f45577e3f173fc83267a4851c078f523406d5ccc967`.

The nonprovisional report records **19 checks twice**, zero baseline failures/skips/nondeterminism, and **1/1 selected authored mutant killed**. Both preserved baseline captures independently contain 19 passing records, including the `invalid range` and `missing mandatory break return` calibrations. Each baseline includes fixed/random constructed and generated histories, reach checks and determinism checks; 19 is a registration count, not a count of generated source/range pairs. The generated campaigns retain `runs:100` and fixed seed `20261118`. Their logged constructed and generated reach covers all five declared states; each named construction executes in each campaign.

The third preserved capture is decisive. It contains a passing empty history followed by a failing `fixed seed 20261118: context` registration. Its explicit verdict is:

```text
property: editor-structure-valid-input
law: valid structural edit
checkpoint: result
route: fixed seed
history: {"prefix":"\u0000","picked":"","suffix":""}
```

The recorded error is `OracleViolation`, with the adopted law, authority, limits and replay selector. The run's selected authored replacement is the preceding-NUL conditional null return at `breakEdit`'s declaration, and the state snapshot identifies the generated oracle's authored-mutant sentinel. This is rejection by the registered comparison, rather than a setup exception, timeout, runtime crash or unregistered assertion. The minimized history is the smallest preceding-NUL case predicted during source review. The empty neighbor still passes. All three raw captures have closed receipts.

Prelaunch (`2026-11-19T07:45:01.345042+00:00`) and postrun (`07:45:18.607228+00:00`) manifests contain **400 files each with identical hashes**, including the applied oracle, unchanged formatter, authored mutant and browser transport. Browser execution is supplied through the previously reviewed `browserCall` pipeline. Chromium attribution follows the parent's launch; this result schema does not independently record engine/version, and this review makes no Firefox/WebKit or React application receiving claim.

The evidence-preservation helper logged `fs.watch` `EMFILE` and explicitly switched to 25 ms polling. It subsequently preserved all three raw captures plus their state snapshots. That observer diagnostic is neither a product failure nor a kill. No browser was launched for this independent execution review.

Checklist updates: ORC-006 now has the registered intended-law mutant verdict and both calibration passes; ORC-007 has repeated fixed/random registrations; ORC-012 has this versioned source-bound result; ORC-015 has logged execution of all declared states. Other source-review dispositions remain unchanged. The mandatory-break-return observation gap is closed for the declared valid-input domain and selected authored challenge. This is **not** a complete automatic mutation campaign, whole-editor gap closure, a production defect fix, or evidence for unrelated native-host recovery behavior.

Evidence hashes (SHA-256):

| Artifact under the output directory | Hash |
|---|---|
| `input-manifest.json` | `eb5321ae85aad8588065dd8e48591619a971cab39b2bb32e1808f66f9b8439ad` |
| `postrun-manifest.json` | `130f757f53965a889da55e31e038ed77e31de2a7409298398e0aa67e23bbb12d` |
| `results.json` | `75fca852c95da85294d0f650841da88ed5ba39258aa403f4f2dd9fd8caf4de77` |
| `preserved-live-captures/run-39837-1.jsonl` | `dbf28cc3aa9e0debb0cde535699bcece55b2e455bc87de217cc7c796cb2d68b0` |
| `preserved-live-captures/run-39837-2.jsonl` | `a3bc66075c670e7b54c05976dad1209a79e8cb40af5a4c4bc072bfec744ac3c8` |
| `preserved-live-captures/run-39837-3.jsonl` | `2bb9f88bda106f8032f32a5c11d2827805cbe34a6cf49521998c218fb1897bb7` |
