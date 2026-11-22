# Bracket consumed-key sensitivity after native-newline adoption

Kyle Mathews (GitHub KyleAMathews) approved following main on 2026-11-21: native Enter/Shift+Enter inserts ordinary LF; the Markdown hard-break toolbar retains breakEdit. The adopted bracket law is unchanged: after the actual picker delivers a consumed native Enter/ShiftEnter to onFormatKey, preserve the source/range supplied at formatter entry and textarea focus. Completion spelling remains outside that law.

## Preserved challenge and historical receipt

Keep `receiver-bracket-consumed-gate.json` byte-for-byte, including its ID, original intent and transformation. It removes only event.defaultPrevented from the shared early return. Keep the identical transformation under the separate `interaction-picker-consumed-gate` ID too. Their original intent and historical captures are evidence of the earlier command mapping.

Before the 2026-11-21 native-newline revision, consumed ShiftEnter could reach breakEdit after the guard was removed. The Firefox receiver campaign `3f2bcef7d392` rejected the original bracket challenge at `delivered.value` under `actual bracket formatter receipt`, construction `Shift+Enter-false`; see [receiver execution](receiver-expansion-review.md). The later selected formatter-import transport receipt `d29ac07aa66a` reports the same registered rejection on its exact parser/adapter source; see [transport review](prep-pr-formatter-import-transport-review.md). Those historical outcomes remain true for their captured sources and are not current-main sensitivity receipts.

Current structureKey returns null for Enter with or without Shift, and onFormatKey has no remaining Enter edit dispatch. Removing only event.defaultPrevented therefore supplies no current bracket Enter command for the old challenge to expose. This is a boundary-specific loss of the old distinguishing route, not permission to discard the mutant, call it globally equivalent, narrow the consumed-key identity law, or close a survivor. A bracket-only run that selects that original challenge must retain its actual result and keep sensitivity open until the shared owner rejects it.

The actual mention picker still consumes Tab, and current structureKey recognizes Tab as indent. Its histories deliberately use a second hyphen list item; the entry model preserves the actual post-picker source/range. Removing the shared guard can still indent that item. The current receiving witness belongs to `editor-browser-picker-gate`, fixedseed20261118 construction `Tab-false` (with `Tab-true` retained), law `actual picker formatter gate`. The earlier [interaction receipt](interactions-review.md) records that route, but current exact-source rerun remains required. Run this owner for both retained guard-removal IDs when establishing current sensitivity.

## Current hostile bracket receiver challenge

`receiver-bracket-consumed-native-newline` preserves readonly/composing and command-modified suppression, but after an already-consumed native Enter/ShiftEnter it wrongly applies one ordinary LF over the input range. This models replaying the native default after the picker has already completed the action. A stock native newline is correct for an unconsumed Enter; replaying it after consumption violates the existing identity law. The mutation calls actual applyEdit in onFormatKey, so the unchanged real bracket driver records the resulting public source/range at delivered.

The original bracket grammar, models, four constructed histories, fixed/random budgets and existing calibration remain. A second calibration appends one literal LF to delivered.value and must fail the same law/difference. No new completion spelling or product decision is adopted.

## Gates and limits

Offline source/model/extracted-check controls can establish that both retained guard transformations are unchanged, current key classification has the stated split, the proposed mutation has one exact source preimage, its syntax/types are valid, and the actual check rejects replayed LF for a consumed-entry trace. They are not production runs or registered kills.

Required exact-current browser evidence is: bracket baseline/calibrations and actual entry reach; new authored consumed-native-newline challenge rejected by actual bracket law at delivered.value; actual mention Tab receiving rejecting both retained guard-removal IDs; preserved native newline and toolbar hard-break behavior. Any setup failure, timeout, unreached path or survivor keeps the corresponding gate open. The two old formatting suites stay until parent receiving/loss acceptance; historical bracket guard kills cannot supply that current evidence. Physical keyboard/IME/mobile and command-modified precedence remain separate premises.

`original-closing-fence-newline` also retains its exact source transformation; only its intent now names the hard-break command/toolbar rather than native ShiftEnter.
