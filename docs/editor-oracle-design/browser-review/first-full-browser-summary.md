# Oracle check report

Run 947e2ff60f1a. Inputs: 1 source files, 7 oracle files, 0 ordinary test files, 27 authored mutants, seed 20261118, pool threads.

379 mutants (27 authored). 368 killed by a law on a reproducible route, 3 crashed production, **11 gaps**.

## Baseline

```text
oracle-gaps: baseline pass test-ui/editor-code-block.oracle.test.ts: 315 tests
oracle-gaps: baseline pass test-ui/editor-inline.oracle.test.ts: 297 tests
oracle-gaps: baseline pass test-ui/editor-keyboard.oracle.test.ts: 1753 tests
oracle-gaps: baseline pass test-ui/editor-line-break.oracle.test.ts: 111 tests
oracle-gaps: baseline pass test-ui/editor-list.oracle.test.ts: 306 tests
oracle-gaps: baseline pass test-ui/editor-session.oracle.test.ts: 84 tests
oracle-gaps: baseline pass test-ui/editor-valid-input.oracle.test.ts: 18 tests
oracle-gaps: baseline all 7 oracle files pass
```

## How to use this report

A gap is evidence that the oracle cannot see some difference in production. It does not say which model rule to add. For each gap:

1. State the law it reveals: one that is missing, misstated, or not enforced. Several gaps often reveal one law.
2. Name the law's authority: a contract document and section, or a maintainer decision.
3. Re-plan the oracle around that law: its grammar or domain, model, observations, or comparison. Do not patch the line, except dead code, whose gap says to remove the code.
4. Run the check again.

Rerun one mutant with `--only <id>`.

## Gaps

### fn emphasis (src/ui/format-shortcuts.ts)

- **not-observed**, line 37: ` > ` → ` >= `
  - Key: ` src/ui/format-shortcuts.ts#emphasis:binary-swap:const allOn = filled . length > 0 && filled . every ( ( l ) => { const core = l . trim ( ) ; const run = Math . min ( stars ( core ) , endStars ( core ) ) ; return core . length > run * 2 && isOn ( run , kind ) ; } ) ;~2 `; rerun: `--only ui/format-shortcuts.ts:M22`
  - Observe the value this code changes in `editor-emphasis-multiline > fixed seed 20261118: allBlank`, and assert on it. Where the mutated code computes the same result as the original, add a history where it computes something different.
  - Owners: /Users/kyle.mathews/programs/blygger-studio/.worktrees/oracles-explore/test-ui/editor-inline.oracle.test.ts
- **not-infected**, line 40: ` > ` → ` >= `
  - Key: ` src/ui/format-shortcuts.ts#emphasis:binary-swap:return core . length > run * 2 && isOn ( run , kind ) ;~2 `; rerun: `--only ui/format-shortcuts.ts:M30`
  - Add a history whose operands are equal, where `>` and `>=` disagree. Operands seen: ` 4 ` and ` 0 `; ` 3 ` and ` 0 `; ` 8 ` and ` 4 `.
  - Owners: /Users/kyle.mathews/programs/blygger-studio/.worktrees/oracles-explore/test-ui/editor-inline.oracle.test.ts
- **crashed**, line 43: ` { from, to, insert, start: from, end: from + insert.length } ` → ` undefined `
  - Key: ` src/ui/format-shortcuts.ts#emphasis:return-undefined:return { from , to , insert , start : from , end : from + insert . length } ; `; rerun: `--only ui/format-shortcuts.ts:M36`
  - Production threw `TypeError: Cannot read properties of undefined (reading 'from')` in `editor-emphasis-multiline > fixed seed 20261118: plain`; record the error as an observation in the driver, and state the law that decides this input's outcome.
  - Owners: /Users/kyle.mathews/programs/blygger-studio/.worktrees/oracles-explore/test-ui/editor-inline.oracle.test.ts
  - Detail: TypeError: Cannot read properties of undefined (reading 'from')
- **not-infected**, line 54: ` > ` → ` >= `
  - Key: ` src/ui/format-shortcuts.ts#emphasis:binary-swap:if ( inner && inner . length > innerRun * 2 && isOn ( innerRun , kind ) ) { const bare = inner . slice ( w , inner . length - w ) ; return { from : a , to : b , insert : bare , start : a , end : a + bare . length } ; }~3 `; rerun: `--only ui/format-shortcuts.ts:M52`
  - Add a history whose operands are equal, where `>` and `>=` disagree. Operands seen: ` 4 ` and ` 0 `; ` 8 ` and ` 4 `; ` 6 ` and ` 2 `.
  - Owners: /Users/kyle.mathews/programs/blygger-studio/.worktrees/oracles-explore/test-ui/editor-inline.oracle.test.ts, /Users/kyle.mathews/programs/blygger-studio/.worktrees/oracles-explore/test-ui/editor-keyboard.oracle.test.ts, /Users/kyle.mathews/programs/blygger-studio/.worktrees/oracles-explore/test-ui/editor-session.oracle.test.ts
- **crashed**, line 56: ` { from: a, to: b, insert: bare, start: a, end: a + bare.l... ` → ` undefined `
  - Key: ` src/ui/format-shortcuts.ts#emphasis:return-undefined:return { from : a , to : b , insert : bare , start : a , end : a + bare . length } ; `; rerun: `--only ui/format-shortcuts.ts:M55`
  - Production threw `TypeError: Cannot read properties of undefined (reading 'from')` in `editor-emphasis-single > fixed seed 20261118: selectedBold`; record the error as an observation in the driver, and state the law that decides this input's outcome.
  - Owners: /Users/kyle.mathews/programs/blygger-studio/.worktrees/oracles-explore/test-ui/editor-inline.oracle.test.ts
  - Detail: TypeError: Cannot read properties of undefined (reading 'from')

### fn link (src/ui/format-shortcuts.ts)

- **crashed**, line 71: `` { from, to, insert: `[](${picked})`, start: from + 1, end... `` → ` undefined `
  - Key: `` src/ui/format-shortcuts.ts#link:return-undefined:return { from , to , insert : `[](${ picked } ) `, start: from + 1, end: from + 1 }; ``; rerun: `--only ui/format-shortcuts.ts:M86`
  - Production threw `TypeError: Cannot read properties of undefined (reading 'from')` in `editor-link > fixed seed 20261118: link2`; record the error as an observation in the driver, and state the law that decides this input's outcome.
  - Owners: /Users/kyle.mathews/programs/blygger-studio/.worktrees/oracles-explore/test-ui/editor-inline.oracle.test.ts
  - Detail: TypeError: Cannot read properties of undefined (reading 'from')

### fn formulaEdit (src/ui/format-shortcuts.ts)

- **not-distinguished**, line 182: ` && ` → ` || `
  - Key: ` src/ui/format-shortcuts.ts#formulaEdit:binary-swap:const displayed = inner . length >= 4 && inner . startsWith ( '$$' ) && inner . endsWith ( '$$' ) ; `; rerun: `--only ui/format-shortcuts.ts:M266`
  - Add an owner history where one operand of `&&` on line 182 is falsy and the other is truthy, so `&&` and `||` give different results, and assert on the result.
  - Owners: /Users/kyle.mathews/programs/blygger-studio/.worktrees/oracles-explore/test-ui/editor-inline.oracle.test.ts, /Users/kyle.mathews/programs/blygger-studio/.worktrees/oracles-explore/test-ui/editor-session.oracle.test.ts
- **not-distinguished**, line 182: ` && ` → ` || `
  - Key: ` src/ui/format-shortcuts.ts#formulaEdit:binary-swap:const displayed = inner . length >= 4 && inner . startsWith ( '$$' ) && inner . endsWith ( '$$' ) ;~2 `; rerun: `--only ui/format-shortcuts.ts:M267`
  - Add an owner history where one operand of `&&` on line 182 is falsy and the other is truthy, so `&&` and `||` give different results, and assert on the result.
  - Owners: /Users/kyle.mathews/programs/blygger-studio/.worktrees/oracles-explore/test-ui/editor-inline.oracle.test.ts, /Users/kyle.mathews/programs/blygger-studio/.worktrees/oracles-explore/test-ui/editor-session.oracle.test.ts

### fn applyEdit (src/ui/format-shortcuts.ts)

- **not-distinguished**, line 239: ` granularity: 'grapheme' ` → `  `
  - Key: ` src/ui/format-shortcuts.ts#applyEdit:field-drop:const boundaries = new Set ( Array . from ( new Intl . Segmenter ( undefined , { granularity : 'grapheme' } ) . segment ( el . value ) , part => part . index ) ) ; `; rerun: `--only ui/format-shortcuts.ts:M333`
  - Add an owner history that reads the property dropped on line 239, so that its absence changes an asserted result, and assert on the result.
  - Owners: /Users/kyle.mathews/programs/blygger-studio/.worktrees/oracles-explore/test-ui/editor-keyboard.oracle.test.ts, /Users/kyle.mathews/programs/blygger-studio/.worktrees/oracles-explore/test-ui/editor-session.oracle.test.ts
- **not-judged**, line 241: ` && ` → ` || `
  - Key: ` src/ui/format-shortcuts.ts#applyEdit:binary-swap:const exactNativeRange = boundaries . has ( edit . from ) && boundaries . has ( edit . to ) ; `; rerun: `--only ui/format-shortcuts.ts:M335`
  - Make a law in `editor-apply-edit > fixed seed 20261118: partialClusterDelete` reject the changed value.
  - Owners: /Users/kyle.mathews/programs/blygger-studio/.worktrees/oracles-explore/test-ui/editor-keyboard.oracle.test.ts, /Users/kyle.mathews/programs/blygger-studio/.worktrees/oracles-explore/test-ui/editor-session.oracle.test.ts
  - Changed observations in: editor-apply-edit > fixed seed 20261118: partialClusterDelete; editor-apply-edit > fixed seed 20261118: generated; editor-apply-edit > random seed: partialClusterDelete
- **not-judged**, line 244: ` document.execCommand('delete') ` → ` undefined `
  - Key: ` src/ui/format-shortcuts.ts#applyEdit:value-undefined:const done = exactNativeRange && ( edit . insert || edit . from === edit . to ? document . execCommand ( 'insertText' , false , edit . insert ) : document . execCommand ( 'delete' ) ) ;~2 `; rerun: `--only ui/format-shortcuts.ts:M343`
  - Make a law in `editor-apply-edit > fixed seed 20261118: nativeDelete` reject the changed value.
  - Owners: /Users/kyle.mathews/programs/blygger-studio/.worktrees/oracles-explore/test-ui/editor-keyboard.oracle.test.ts
  - Changed observations in: editor-apply-edit > fixed seed 20261118: nativeDelete; editor-apply-edit > fixed seed 20261118: fallbackDelete; editor-apply-edit > fixed seed 20261118: generated

## First law to reject, by law

Each count credits only the first law that rejected a history: a later law on the same history is not checked. To test a law with no count, add a history that varies the input the law judges, and run the check again.

| Law | Mutants it rejected first |
|---|---|
| key handler | 93 |
| single-line emphasis | 47 |
| list source and selection | 44 |
| key classification | 33 |
| multiline emphasis | 31 |
| line break | 26 |
| edit delivery | 21 |
| link insertion | 19 |
| browser editing history | 15 |
| literal contents | 15 |
| formula wrapping | 13 |
| surrounding text | 7 |
| rendered list nesting | 5 |
| selection | 4 |
| default source compatibility | 1 |
| valid input returns | 1 |
| valid structural edit | 1 |
| verse hard breaks | 1 |