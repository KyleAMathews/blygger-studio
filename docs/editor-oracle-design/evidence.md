# Frozen v1: Editor oracle design grammar — evidence v1

This is the frozen pre-browser evidence. The current implementation and execution record are in [browser-execution.md](browser-execution.md).

The source fingerprints are in [source-manifest.json](https://github.com/blygger/blygger-studio/blob/fb0b79dc0450e5f3d31a5a8f59c0b697b5cc5f6e/docs/editor-oracle-design/source-manifest.json). The old test remains at `test-ui/format-shortcuts.test.ts`, unchanged. Base commit: `28b0c8d642a87e5810ad6eabd95c2d1714c53396`. Installed oracle preview: `97a4e7a`.

## E1 — Source reconstruction

Six oracle files currently register 18 properties. This is a source reconstruction of the current arrangement, not an implemented replacement architecture.

| Source group | Current route | Historical assertions |
| --- | --- | --- |
| Single/multiline emphasis, links and format keys | Inline semantic rows/source partitions; exact old `source*` histories; keyboard chord Cartesian product. | 29; [isolated raw audit](loss-audit/inline-keys.md), [restoration receipt](loss-audit/inline-restoration.md). |
| List source, caret/ranges, declines and rendering | Structured rows, variable contexts/EOF, exact old source histories; complete list-tree token observation and no-`pre` check. | 34; [isolated raw audit](loss-audit/lists.md), [restoration receipt](loss-audit/list-restoration.md). |
| Breaks, verse, blocks, structure keys and formulas | Nine `old*` break histories; repeated verse; six old code inputs plus source/caret observations; complete structure-key matrix; four exact formula histories. | 28; [isolated raw audit](loss-audit/break-block-formula.md). |

All 91 source assertions have a recorded route. The audits deliberately describe the earlier frozen candidate, including its losses; restoration is a subsequent action. The main recovered omissions were exact outside-marker and document-edge cases, bullet-child/existing-nesting renderer regimes, immediate ancestry, default code-wrapper serialization and empty-block caret membership.

Static reconstruction verified 25 exact inline/formula input histories, 24 list source input/output predictions and five original list-renderer inputs. The registered gap run below executed the restored suite against production. There has not yet been a second loss audit of an implemented F2 architecture.

## E2 — Current executed baseline

Command: `npm run test:formatting`, which runs `oracle-gaps`, fixed seed `20261118`, plus its random campaign and the authored mutant directory.

Run: `2026-11-18T14-24-27-265Z-1009c4b5`; [saved gap report](gap-summary.md).

| Oracle file | Passing checks |
| --- | ---: |
| Code block | 279 |
| Inline | 297 |
| Keyboard/application | 1,443 |
| Line break | 111 |
| Lists | 306 |
| Structure valid-input | 18 |
| Total | 2,454 |

361 mutants judged: 359 killed, two open warnings, zero unowned units. All 21 authored mutants were killed. Counts include framework registrations/calibrations; they are not counts of independent laws or exhaustive source strings. Ordinary old tests were not used to kill these mutants.

An immediately preceding run failed to load the newly restored break histories because the arbitrary did not admit them. That was a test setup failure, not a product RED or mutant kill. The repaired grammar admits the nine coherent original records and retains their annotations. It passed in E2. This directly motivates keeping arbitrary-membership/shrinking controls during extraction.

## E3 — Open framework warnings

The warnings are M30 and M52 in `emphasis`, strict `>` changed to `>=` on `string.length` versus twice the minimum leading/trailing star-run count. Their exact keys are preserved in the gap report and inline restoration receipt. They remain open; they are not counted as kills.

For a nonempty all-star string, run length equals string length, so length cannot equal twice the run. If the string contains a non-star, the two boundary runs are disjoint and length is at least `2 * minRun + 1`. Empty strings do not reach these comparisons: multiline rows are filtered; the single-line branch guards `inner`. The framework's requested equality history therefore has no identified legal witness.

Nearest controls include empty/blank rows, single/all-star strings, asymmetric markers, controls and unpaired surrogates. A bounded enumeration of all 335,923 strings of length 0–7 over `*`, `x`, space, LF, NUL and an unpaired high surrogate found no predicate difference under the guards. This finite result supports the argument; it is not a proof of whole-program correctness. Report these keys and reasoning as framework issues. Do not modify product behavior or weaken a law to clear their warnings.

## E4 — Limits

The proposed F2 architecture has not been implemented or compared executably with the current one. Existing Playwright receiving tests remain necessary; this design pass did not rerun them or establish new cross-browser guarantees. The editor catalog was already read and is used for planning, so it is not held-out range evidence. No independent range test or formal model checker ran. The design establishes a traceable candidate decomposition and plan; it does not establish zero gaps, universal Markdown semantics or full browser equivalence.
