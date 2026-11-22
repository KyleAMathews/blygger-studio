# Browser-native history scope decision — 2026-11-22

Source before the decision: `c0ea19c222b709c0cb9674b4ada1e552d46bc385` on PR #168. The accompanying commit applies this decision. The independent static comparison is preserved in [`native-history-scope-review-20261122.json`](https://github.com/blygger/blygger-studio/blob/fb0b79dc0450e5f3d31a5a8f59c0b697b5cc5f6e/docs/editor-oracle-design/native-history-scope-review-20261122.json).

Kyle Mathews (GitHub KyleAMathews) directed: “ok let's not worry about fixing bugs in chromium”. This supersedes the approved bounded Undo-adapter prototype. No custom Undo adapter enters production.

## Law delta

Previously, terminal-LF replacements also promised exact browser-native Undo/Redo, repeated cycles, branch invalidation after typing, and recovery when compatibility commands refused or reported false/throw after input. Chromium can lose text in its default Undo/Redo engine. Native-command repairs broke ordinary word grouping, and the isolated adapter designs failed review. The historical investigations retain those findings.

The current application promise judges exact immediate text and accepted selections, caret/focus, trusted unprevented native Enter/Shift+Enter, continued typing, protected-region preservation and completed Save. Browser-owned typing/newline Undo, grouping and command recovery are outside that promise. Undo/Redo for app-applied formatting remains required.

This is an explicit weakening with user authority. It does not claim a lossless refactor or a Chromium repair. Native history defects remain reproducible browser limitations.

## Design grammar and preservation relation

Changing existing models triggers design grammar. The relation is preservation of the remaining named laws, at the same receiving, formatting and Save checkpoints. The old native-history checkpoints are intentionally removed. Immediate source and selection remain exact. Permitted list/fence serialization and unconstrained Undo caret remain unchanged.

The reduced native model contains source/range segments, editor surface, viewport, input delivery and optional continued typing. Each predicts a receiving observation or chooses a real entry path. Save observations retain action completion, exact stored source and saved-item identity relationships. Literal IDs remain in raw evidence. Command stage, cycle count and browser-history branch state have no role after the compatibility code is removed.

The mixed model retains its app-formatting Undo/Redo stacks. Default typing/newline and DOM paste reset its known history boundary. A later app formatting command begins a new modeled stack. Unpromised Undo/Redo intents resolve to selection, as already happens across other unsupported boundaries. This removes actual native replay from those histories, rather than silently accepting corrupted output. A dedicated formatting-only branch still delivers `bold → italic → Undo → formula → Redo` and must preserve the new branch.

The alternative of preserving default-native history by owning all editor history would add the custom history system the user declined. Keeping the compatibility command would retain the Chromium-specific production path being removed. Ordinary browser receiving plus existing app-formatting history satisfies the adopted scope without either dependency.

## Loss inventory

- Mixed: all 390 original construction recipes remain byte-identical. `formatting-branch` adds one, for 391. No unioned preview reach state disappears. Which Undo/Redo intents execute after native typing/newline changes as described above.
- Session: all 68 construction recipes remain byte-identical. Exactly two typed-branch `branchRedo` checkpoints and eight pairs of `newlineUndo`/`newlineRedo` checkpoints disappear. Their two corrupted-trace calibrations and native typed-branch reach label retire. No app-formatting checkpoint disappears.
- Native receiving: 45 constructions retain all three surfaces, both keys/viewports, terminal and interior selection, Unicode/context, real ASCII word delivery, continuation, quick-edit remount and immediate Save. The grammar retains its source alphabet/bounds and rejects empty selected bodies. Browser-history finishes and compatibility-provider branches retire.
- Held regions: 21 constructions retain natural newline, Unicode and typed input at hidden cuts, shown overlap and exact edges, followed by exact complete-draft Save. Synthetic compatibility-command signal stages retire. Refusal caret remains unconstrained.
- App formatting: emphasis/empty-pair history, React rerender after Undo, loaded editor/quick-edit transitions, outdent Undo after sibling typing, hard-break toolbar Undo/Redo and the new formatting-only branch remain.
- Save: exact stored source, trusted action completion/error checks, requested/returned identity relationships, one successful composer create and zero existing-item creates remain. Their corrupt identity/error/delayed-response controls remain.
- Production: remove `bindFormatInput` and `useFormatInput`, restore direct Compose/Editor refs, remove the quick-edit callback ref, and remove the now-unused fixture hook. No custom history state replaces them.
- Mutation controls: eight tracked binder-only mutants and the binder provider retire. Six uncommitted typed-workaround mutants also retire. Copies remain with the local investigation. App `native-delete-undo`, `browser-native-undo-required`, protected-overlap, exact-edge and consumed-picker challenges remain.

The independent reviewer found no additional app-law loss in this bounded static audit. Its raw comparison records every removed session checkpoint. Historical execution records remain tied to their original source, including prior native-history claims.

## Execution evidence

The [execution receipt](https://github.com/blygger/blygger-studio/blob/fb0b79dc0450e5f3d31a5a8f59c0b697b5cc5f6e/docs/editor-oracle-design/native-history-scope-execution-20261122.json) binds production/model/driver source hashes and the three final reports. Session and native-input files passed 385 checks twice; the held-region file passed 73 checks twice. Both selected session controls and both held-region controls were rejected. The focused formatting-branch replay passed one registration twice, with 1,264 other registrations explicitly skipped, and rejected the app native-Undo challenge. Its `branchClearedRedoAttempted` reach count is one. All three reports recorded zero nondeterminism. Removing unused test-global initialization/type fields afterwards changed no production/model/check bytes; final static checks and CI cover that cleanup. Every report uses the gap wrapper. Selected mutation runs provide sensitivity only for their named keys, not complete portfolio acceptance. CI supplies the full current-source partitioned baseline. Physical IME/device behavior, matched Safari/iOS and full mutation acceptance remain outside these results.

## Checklist v1 outcome for this delta

| Requirement | Outcome and boundary |
| --- | --- |
| ORC-001 | The user decision above authorizes the narrower promise. Opening law blocks and `law` options describe the current receiving/history boundary. |
| ORC-002 | The native and held models still derive exact source from input segments. Formatting models remain independent of production. |
| ORC-003 | Law prose, executable history limits and the mixed known-history boundary change together. Historical evidence remains explicitly historical. |
| ORC-004 | Retired axes/checkpoints are listed above. Source alphabet/range, editor/viewports and nearby invalid empty-body controls remain. No new rejection filter conceals a failure. |
| ORC-005 | Actual browser keyboard/input, React receipt and clicked Save remain the receiving boundaries. App history still uses real formatting commands and Undo/Redo. |
| ORC-006 | Remaining calibrations run through registered properties. Selected authored source mutations challenge native-key interception, app-format history and protected-region acceptance/refusal. Results belong to the execution receipt. |
| ORC-007 | Fixed and random-named campaigns retain budgets/seeds. The pinned gap runner supplies deterministic randomness, so literal execution without a seed remains the documented framework limitation. |
| ORC-008 | Compatibility stage/cycle/branch state no longer predicts a promised observation. Mixed history stacks remain necessary for app-format continuations. Native-input resets deliberately discard the browser-history obligation. |
| ORC-009 | Source, selection, held region, Save acknowledgment and item identity retain their existing meanings. The model-only known-history boundary denotes what replay the application promises. |
| ORC-010 | Application-driver cleanup and raw receiving evidence remain. Removing the unused native-host context eliminates its extra cleanup obligation from native-only receiving. |
| ORC-011 | No new shared semantic-fault hypothesis arose in the scope review. Existing independent source and complete-draft formulations remain. This delta adds no second parser or history implementation. |
| ORC-012 | This versioned record and the execution receipt bind the reviewed source hashes and scope. They do not claim full mutation acceptance or universal browser-history closure. |
| ORC-013 | Hidden-cut, shown-overlap and accepted-edge neighbors remain distinct. App-format Undo/new-command/Redo is constructed separately from unpromised native typing history. |
| ORC-014 | Deleted synthetic compatibility-provider premises make no receiving claim. Trusted native browser input receipts remain, as do the separate app-format host witnesses. Physical IME/device behavior remains unestablished. |
| ORC-015 | Native/held constructions retain required receiving states. The actual `formatting-branch` reaches `branchClearedRedoAttempted`. Final gap reports retain per-state counts. |
| ORC-016 | No ordinary unit assertions enter oracle files. The existing revision-session fixture loses only its obsolete hook stub. |
