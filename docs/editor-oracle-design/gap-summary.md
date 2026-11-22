# Oracle check report

Run 26036d9bd01b. Inputs: 1 source files, 6 oracle files, 0 ordinary test files, 21 authored mutants, seed 20261118, pool threads.

361 mutants (21 authored). 359 killed by a law on a reproducible route, 0 crashed production, **2 gaps**.

## Baseline

```text
oracle-gaps: baseline pass test-ui/editor-code-block.oracle.test.ts: 279 tests
oracle-gaps: baseline pass test-ui/editor-inline.oracle.test.ts: 297 tests
oracle-gaps: baseline pass test-ui/editor-keyboard.oracle.test.ts: 1443 tests
oracle-gaps: baseline pass test-ui/editor-line-break.oracle.test.ts: 111 tests
oracle-gaps: baseline pass test-ui/editor-list.oracle.test.ts: 306 tests
oracle-gaps: baseline pass test-ui/editor-valid-input.oracle.test.ts: 18 tests
oracle-gaps: baseline all 6 oracle files pass
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

- **not-infected**, line 40: ` > ` → ` >= `
  - Key: ` src/ui/format-shortcuts.ts#emphasis:binary-swap:return core . length > run * 2 && isOn ( run , kind ) ;~2 `; rerun: `--only ui/format-shortcuts.ts:M30`
  - Add a history whose operands are equal, where `>` and `>=` disagree. Operands seen: ` 4 ` and ` 0 `; ` 3 ` and ` 0 `; ` 8 ` and ` 4 `.
  - Owners: /Users/kyle.mathews/programs/blygger-studio/.worktrees/oracles-explore/test-ui/editor-inline.oracle.test.ts
- **not-infected**, line 54: ` > ` → ` >= `
  - Key: ` src/ui/format-shortcuts.ts#emphasis:binary-swap:if ( inner && inner . length > innerRun * 2 && isOn ( innerRun , kind ) ) { const bare = inner . slice ( w , inner . length - w ) ; return { from : a , to : b , insert : bare , start : a , end : a + bare . length } ; }~3 `; rerun: `--only ui/format-shortcuts.ts:M52`
  - Add a history whose operands are equal, where `>` and `>=` disagree. Operands seen: ` 4 ` and ` 0 `; ` 8 ` and ` 4 `; ` 6 ` and ` 2 `.
  - Owners: /Users/kyle.mathews/programs/blygger-studio/.worktrees/oracles-explore/test-ui/editor-inline.oracle.test.ts, /Users/kyle.mathews/programs/blygger-studio/.worktrees/oracles-explore/test-ui/editor-keyboard.oracle.test.ts

## First law to reject, by law

Each count credits only the first law that rejected a history: a later law on the same history is not checked. To test a law with no count, add a history that varies the input the law judges, and run the check again.

| Law | Mutants it rejected first |
|---|---|
| key handler | 88 |
| single-line emphasis | 52 |
| list source and selection | 44 |
| multiline emphasis | 32 |
| key classification | 30 |
| line break | 26 |
| link insertion | 22 |
| work bound | 20 |
| literal contents | 16 |
| edit delivery | 16 |
| formula wrapping | 14 |
| surrounding text | 7 |
| rendered list nesting | 4 |
| selection | 4 |
| default source compatibility | 1 |
| valid input returns | 1 |
| valid structural edit | 1 |
| verse hard breaks | 1 |