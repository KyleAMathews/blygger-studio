# Independent save-failure boundary review

2026-11-18. Reviewer: receiver-transport review child. Base `28b0c8d642a87e5810ad6eabd95c2d1714c53396` plus uncommitted fingerprints below. Pinned oracle review skill, checklist and glossary were read in full earlier in this review. Scope: source review of the proposed production repair, new navigation RED, and pure boundary diagnostics. No browser jobs or production/oracle implementation edits by this reviewer.

## AB-001 — A completed action rejection can disappear at the UI boundary

**Raw demonstrated failure:** the registered navigation property requires rejected departure saves to retain the latest working copy, remain in the editor and report failure until a successful retry. The current `navigation-save-settlement-red-registered` report, run `d8a5484336ce`, has a real baseline `OracleViolation` at checkpoint `failed` under law `formatted editor departure`:

```text
history: {body:"a",commands:["bold","bold"],schedule:"pending",departure:"spa-reject",mobile:false}
received: {inEditor:true,value:"a",stored:"**a**",errorShown:false}
expected: {inEditor:true,value:"a",stored:"**a**",errorShown:true}
```

This is the unchanged production baseline: 0 pass, 1 fail, 59 unselected. The selected authored challenge was blocked by that baseline, not killed. The controlled rejected-request comparison passed before the public failure checkpoint. Earlier timeout/zero-selected/setup attempts documented in `navigation-review.md` are not RED. This focused result is not a full grammar, replay or browser matrix pass.

**Root boundary trace:** `createPacedDraftAction` supplies request-row and actual item optimistic mutations to TanStack DB. A persisting save can fail while the later compose guard save is pending against the same keys. `TransactionScope.rollbackConflictingTransactions` rolls pending conflicts back using `{isSecondaryRollback:true}` without an error. `Transaction.rollback` rejects its settlement with `this.error?.error`; its public `when('settled')` documentation explicitly allows `undefined` for this kind of rollback. The original failing dispatch retains its normalized concrete Error; the canceled pending save can reject with `undefined`.

`Draft.save` correctly preserves that rejection, so its success-only persistence acknowledgment does not execute. Editor's guard catches it and sends the reason through `action.run`. Both `useAction` catch blocks currently call `setError(error)`. `Failure` renders only truthy errors, and editor consumers also combine errors with `action.error || upload.action.error`. Thus `undefined` means both an actual caught rejection and no visible error. A missing banner can complete without a visible failure despite route/text protection functioning correctly.

**Disposition:** confirmed production UI failure. The library's permitted absent reason and Draft's unchanged rejection are not themselves demonstrated scheduler defects.

## Repair alternatives and accepted exact proposal

The initial proposed adapter repair was:

```ts
transaction.when('settled').catch(reason => {
  throw reason ?? new Error('The editor action failed. Please try again.');
}).then(existingSuccessHandler)
```

This would repair the observed undefined receipt at that one writer, but changes the adapter's rejection contract and still cannot ensure the UI reports arbitrary falsy non-null reasons from other callbacks. Current TanStack normalizes direct dispatch exceptions to Error, so this report does not claim it currently forwards `false`, `0` or an empty string from that path. The UI's `useAction` API itself accepts arbitrary rejecting callbacks and stores `unknown`, so its public failure-reporting boundary remains the appropriate owner.

Parent accepted the following exact replacement in both catches (`run` and `background`), after the active browser source freeze ends:

```ts
setError(() => error || new Error('The editor action failed. Please try again.', { cause: error }));
```

The fallback makes every falsy rejection reason visible (`undefined`, `null`, `false`, `0`, empty string and `NaN`). A genuine Error remains the same object, with the same message, stack and subtype. Truthy existing reasons also retain identity. `cause` preserves the exact absent/falsy reason for diagnostics. The generic wording applies to this shared editor action boundary, which handles saves and commands such as publishing or upload; it does not claim the server committed a write or require the author to reload. The existing law requires a visible failure, not an exact message.

The functional setter is meaningful because React treats a function passed directly to a state setter as an updater. The wrapper stores a truthy thrown function rather than executing it. This is a boundary-shape fix, not a new promise to display every hostile object's `toString` safely. No scheduler, dispatch, dirty tracking, persistence acknowledgment or navigation policy needs to change.

## Independent pure evidence and retry semantics

Executed `/private/tmp/blygger-action-error-boundary-review.mts`, receipt `/private/tmp/blygger-action-error-boundary-review-receipt.json`. The diagnostic imports the actual current `createPacedDraftAction` and `Draft` and arranges one held dispatch, one overlapping later save, then a real later retry:

```json
{"failed":[{"fulfilled":false,"sameError":true,"type":"object"},{"fulfilled":false,"isUndefined":true,"type":"undefined"}],"dirtyAfterFailure":true,"retryResult":true,"dirtyAfterRetry":false,"text":"second","dispatched":[{"type":"save","text":"first"},{"type":"save","text":"second"}]}
```

The second submitted save is canceled before dispatch; the second entry in `dispatched` belongs to the successful retry of the latest text. The original provider Error has exact identity. Failed saves leave Draft dirty. A new save after rollback enters a fresh transaction and successfully persists the latest source, clearing dirty state. The proposed UI-only change cannot turn either failed promise into fulfillment or falsely acknowledge a revision. Existing `run` clears its prior error on the next action, and successful background saves retain their existing policy of clearing only background errors. Busy/pending behavior is unchanged.

A separate pure part extracts the actual current `useAction` function with TypeScript's parser and invokes it with minimal `useState`/`useRef` stubs that implement React's direct-value versus updater-function setter semantics. It compares unchanged code with the proposed two-line in-memory replacement. In both `run` and `background`, the six falsy reasons above are invisible under the original truthiness rule and visible with the proposal; each fallback's `cause` is the exact reason (`Object.is`, including `NaN`). Concrete Error identity is preserved. A thrown function is invoked once and replaced with its returned undefined by the old direct setter, while the proposed functional setter stores that exact function without invocation. Busy ends false in these cases.

These are pure diagnostics, not new registered oracles and not browser GREEN evidence. The state stub establishes the setter/value distinction; it does not establish React rendering, error-log delivery, toolbar states or browser retry navigation. The parent owns the subsequent registered browser run against applied production.

## New navigation RED enforcement review

The revised driver tags the first actual `Draft.save` started by the real compose click. Its transparent observer calls the original once, returns the exact original result, rethrows synchronous reasons unchanged, and attaches only side observers to record settlement. Because the actual Draft currently returns a native Promise, this does not alter the guard's result or substitute a reason. Earlier autosave settlement cannot satisfy the departure tag.

After this tagged save settles, real preview/draft pane handlers and receiving `data-pane` commits provide an explicit render opportunity before the actual banner is read. This solves the previous wait-for-banner enforcement gap: a settled silent failure reaches `errorShown:false` and the independent model rejects it. No driver-provided source/error state enters React. The model still derives route/source/stored expectations from input commands and acknowledged edit events and requires a visible alert, independent of the actual save reason. The receiving pane premise is explicitly bounded; the property does not establish an exact immediate rendering latency.

Controlled 500 responses are input delivery; their receipt is checked before error visibility. The successful retry uses the actual compose link and normal successful provider. Retained URL, current text and stored content are checked independently. The report shows an actual law comparison failure, not a startup error, missing receipt, timeout or source-mutation crash. New failed-reason normalization should be challenged with an authored original-defect mutation at the same visible-error checkpoint after GREEN; surviving setup or unrelated page-error outcomes must not be counted as kills.

## Checklist disposition for this bounded repair

| Requirement | Review outcome |
| --- | --- |
| ORC-001 | Existing adopted failure-reporting/retry law; no new exact-message contract. |
| ORC-002 | Expected source/route/stored/error-presence model does not read Draft, TanStack or `useAction`. |
| ORC-003 | Failure policy belongs to shared action→UI boundary; source trace and alternatives above state ownership. |
| ORC-004 | No generated domain or run budget changes proposed. |
| ORC-005 | RED reaches actual compose guard, Draft and banner after tagged settlement. Applied-fix GREEN remains pending. |
| ORC-006 | RED is a registered baseline law failure. Original-defect authored rejection after GREEN remains pending. |
| ORC-007 | Focused fixed-seed RED is bounded; full matrix/repeat/replay evidence is not claimed. |
| ORC-008 | No new model state added by proposed production repair; existing save-token model remains separate. |
| ORC-009 | Input schedule, actual settlement receipts, public observations and predicted state remain distinct. |
| ORC-010 | Absent/falsy reasons retain raw cause in the proposed UI error; scheduler and Draft keep their original receipts. |
| ORC-011 | Direct real-adapter/Draft pure reproduction and separate state-setter diagnostic support the boundary explanation; neither substitutes for browser GREEN. |
| ORC-012 | Raw RED, failed alternatives, source hashes and exact diagnostic paths are preserved. |
| ORC-013 | Registered counterexample gives concrete route/text/stored/visibility values before the fix. |
| ORC-014 | Pane render premise and controlled request delivery are named, with exact latency and browser limitations above. |
| ORC-015 | No histories/states excluded to repair the failure; full campaign remains parent work. |
| ORC-016 | Pure scratch diagnostics are review evidence, not ordinary regression tests inserted alongside oracles. |

## Pre-repair fingerprints

```text
d325e5b77249ae1367aae1818978964a0cc81d3f1e4eaed94c9e24826ab423dd src/ui/authoring.tsx
a225500e58dc17a301700d07c14e3178317855ad5737214c45199015b42361c3 src/ui/paced-write.ts
cc3ee87d1e7233a77ae1a8ca5c395455efe5e1a65b9b209b1166e7d990d054ae src/ui/draft.ts
d133ae56f4bd62fee20e74f2051772cd09c1ed206bb745c8ec4865cce65f7abc src/ui/components.tsx
07f72235c9a1a3c42ad70d11a0c05031815f1cd437b978bf46c7d7bf2575cdf8 src/ui/data.ts
e5b233c52e918b4ab2a3a2cbfb2cd8178ec7906eed25bc47b0116df7605b7603 test-ui/editor-navigation.oracle.test.ts
589945f96f6fc32e1fbe36fdcf5cac0ae1aa6e5073e742cdd0e32661a870c921 test-ui/editor-oracles/navigation-driver-oracle.ts
568b1ecd150459fc7aa384f50edfeb19489f2ee402130f9ef05bcfdc85d0d2c4 test-ui/editor-oracles/navigation-model-oracle.ts
3f459a59cbd73f5601b013e7bc3e15c16ba124c08603bbe139bc1554c915e723 node_modules/@tanstack/db/src/transactions.ts
064eccfb1101c6860d9b93d22c18d1538f2595728f215a24be3abf2cb8e205bc node_modules/@tanstack/db/src/paced-mutations.ts
```

## Applied-source and registered execution acceptance

The parent applied exactly the accepted two-catch repair in `useAction`, with a background-catch comment explaining absent reasons and functional updater handling. Independent source rereview found no additional production change: paced writer, Draft, Failure and dispatch logic are unchanged. Navigation now explicitly owns `src/ui/authoring.tsx#useAction` alongside its existing receiver/Draft ownership. The genuine-Error identity, raw fallback `cause`, existing background-error clearing policy, warning handling and `pending`/`busy` cleanup remain intact.

The new `original-undefined-action-error.json` restores only the original foreground `run` catch. An executed diagnostic using the pinned `applyAuthored` found exactly one match at line 121; the production hook contains two normalizers, the mutant retains one, the original run setter is restored, and every byte outside `useAction` remains identical. The background repair remains present. Thus this is a faithful challenge for the observed missing foreground failure, rather than a generalized synthetic failure that changes scheduling or the model.

Final registered report `build/formatting-oracles/navigation-save-failure-green/`, run **`df61bd637dee`**, is complete and nonprovisional. Its baseline passes all 60 navigation checks, with no failed or skipped checks. The stream records the two unmutated runs at 149.5 s and 153.2 s, with **0 nondeterministic checks**. The report credits all four selected authored mutants to the registered behavioral law `formatted editor departure` on fixed-seed routes:

| Selected challenge | Registered rejecting route | Outcome |
| --- | --- | --- |
| `navigation-dirty-false` | fixed seed 20261118: `original-stay-desktop` | killed by law |
| `navigation-premature-spa` | fixed seed 20261118: `original-spa-desktop` | killed by law |
| `navigation-rejected-save-leaves` | fixed seed 20261118: `pending-spa-reject-desktop` | killed by law |
| `original-undefined-action-error` | fixed seed 20261118: `pending-spa-reject-desktop` | killed by law |

No selected result is classified as a production crash, setup failure, timeout, blocked result, random-only rejection or unregistered rejection. `results.json` gives nonempty behavioral law and registered rejecting route fields for each kill. This is semantic registered evidence; the summary's four kills do not come from treating a startup exception as a law. The earlier RED report remains the retained exact public `errorShown:false` counterexample. Source/receiver transport had already been independently reviewed; the current source hashes below match the applied-source rereview taken before this run.

**Retention limit:** the run's retained `test-output.log` contains reach diagnostics but not each mutant's exact violation payload or rejected checkpoint values. `state.json` still names a per-run JSONL capture path, but no `run-*.jsonl` files remain in this output directory. The pinned runner removes these capture files in `check.mjs` cleanup after classifying their route/verdict rows. Therefore this review can independently verify the retained registered semantic classifications, law names and rejecting histories, but cannot reconstruct the final mutant's exact failure payload or independently audit every transient setup/unhandled row. Do not invent those missing details or claim the final original-defect kill itself retained `errorShown:false`; that precise payload is from the preserved pre-fix RED. No reviewer browser rerun was requested or performed to manufacture additional evidence.

The command selected **four authored mutants** using `--only`; 63 authored mutants were loaded, and automatic authoring-source operators were not exhaustively judged by this selection. Its “0 gaps” is scoped to these four selected challenges. This is acceptance of the applied save-error repair and the navigation baseline/reproducible semantic challenges, **not full authoring or `useAction` gap closure**, a universal arbitrary-rejection claim, or a complete browser/physical-close matrix. The pure falsy-reason/thrown-function diagnostics remain separate evidence for the general shape of the UI repair.

This closes AB-001 for the demonstrated navigation failure and repair. It also supplies the formerly pending GREEN and original-defect challenge evidence in the checklist above, bounded by the selected challenge set and capture-retention limits. Parent reports the prior frozen-source workflow run `6fe6a762881b` passed 161 checks twice and 9/9 selected challenges before production changed; that is separate workflow evidence and is not relabeled as having executed against this subsequent applied patch.

### Applied-source and retained-report fingerprints

```text
863d35404d85e06f3c093f46cc1a6c73b369ea49c22fd00ac4fc954af47d8bc6 src/ui/authoring.tsx
1f84b4f36ef00f56f3b782736442fa04e0900905c03d6aeba9c190b99111ba43 test-ui/editor-navigation.oracle.test.ts
9131dd1a2bf9eecaec0db26133ed4ac35fe5db7f9c4dfe33f8965c57e46d333f test-ui/editor-oracle-mutants/original-undefined-action-error.json
589945f96f6fc32e1fbe36fdcf5cac0ae1aa6e5073e742cdd0e32661a870c921 test-ui/editor-oracles/navigation-driver-oracle.ts
568b1ecd150459fc7aa384f50edfeb19489f2ee402130f9ef05bcfdc85d0d2c4 test-ui/editor-oracles/navigation-model-oracle.ts
dbd515c4f8e1c75a305eaf00acfff37678294ad65121239926ccc5b9cde78b21 navigation-save-failure-green/results.json
43710f73215a698894b6675ec820ea8e3d47a8ab1896fb8de972f6b27cbeeb5c navigation-save-failure-green/summary.md
9fea6218a82f359e5295c1824294c0e2901a98c54448aa9e98f84760cc89d27b navigation-save-failure-green/stream.log
cc9faa6a7f176a33f9b5acd47da580bfe9b386304193ae321ecf7ffecbe77002 navigation-save-failure-green/test-output.log
```
