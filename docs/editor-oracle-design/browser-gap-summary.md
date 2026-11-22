# Oracle check report

Run 311825838445. Inputs: 1 source files, 7 oracle files, 0 ordinary test files, 30 authored mutants, seed 20261118, pool threads.

381 mutants (30 authored). 378 killed by a law on a reproducible route, 0 crashed production, **3 gaps**.

## Baseline

```text
oracle-gaps: baseline pass test-ui/editor-code-block.oracle.test.ts: 315 tests
oracle-gaps: baseline pass test-ui/editor-inline.oracle.test.ts: 312 tests
oracle-gaps: baseline pass test-ui/editor-keyboard.oracle.test.ts: 1762 tests
oracle-gaps: baseline pass test-ui/editor-line-break.oracle.test.ts: 111 tests
oracle-gaps: baseline pass test-ui/editor-list.oracle.test.ts: 306 tests
oracle-gaps: baseline pass test-ui/editor-session.oracle.test.ts: 108 tests
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
- **not-infected**, line 54: ` > ` → ` >= `
  - Key: ` src/ui/format-shortcuts.ts#emphasis:binary-swap:if ( inner && inner . length > innerRun * 2 && isOn ( innerRun , kind ) ) { const bare = inner . slice ( w , inner . length - w ) ; return { from : a , to : b , insert : bare , start : a , end : a + bare . length } ; }~3 `; rerun: `--only ui/format-shortcuts.ts:M52`
  - Add a history whose operands are equal, where `>` and `>=` disagree. Operands seen: ` 4 ` and ` 0 `; ` 8 ` and ` 4 `; ` 6 ` and ` 2 `.
  - Owners: /Users/kyle.mathews/programs/blygger-studio/.worktrees/oracles-explore/test-ui/editor-inline.oracle.test.ts, /Users/kyle.mathews/programs/blygger-studio/.worktrees/oracles-explore/test-ui/editor-keyboard.oracle.test.ts, /Users/kyle.mathews/programs/blygger-studio/.worktrees/oracles-explore/test-ui/editor-session.oracle.test.ts

## First law to reject, by law

Each count credits only the first law that rejected a history: a later law on the same history is not checked. To test a law with no count, add a history that varies the input the law judges, and run the check again.

| Law | Mutants it rejected first |
|---|---|
| key handler | 88 |
| single-line emphasis | 52 |
| list source and selection | 44 |
| key classification | 33 |
| multiline emphasis | 32 |
| line break | 26 |
| edit delivery | 23 |
| link insertion | 22 |
| literal contents | 18 |
| formula wrapping | 16 |
| browser editing history | 15 |
| surrounding text | 7 |
| rendered list nesting | 5 |
| selection | 2 |
| default source compatibility | 1 |
| valid input returns | 1 |
| valid structural edit | 1 |
| verse hard breaks | 1 |