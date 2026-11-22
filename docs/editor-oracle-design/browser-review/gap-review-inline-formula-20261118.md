# Independent inline/formula gap review

## Scope and receipts

Read the current browser run's records without changing its inputs:
`/Users/kyle.mathews/programs/blygger-studio/.worktrees/oracles-explore/build/formatting-oracles/2026-11-18T16-55-18.364Z/results.jsonl`.

Compared the frozen pre-browser records at `/private/var/folders/zy/zxh2j5n97vq2tt8d8q7_1t5r0000gp/T/oracle-gaps-ba55c11f5c80/out/2026-11-18T14-24-27-265Z-1009c4b5/results.json`, the earlier measured extra-work result, current production source/laws/model, and the installed framework's capture/classification source. No repository edit, registered-oracle execution, or competing Vitest test was made.

Pure variation probes used **copied temporary production fixtures**. Original plus M22/M266/M267 source variants and complete JSON observations are retained in `/private/var/folders/zy/zxh2j5n97vq2tt8d8q7_1t5r0000gp/T/blygger-emphasis-formula-gap-0KUiqF/`. The formula variants preserve the framework's AST grouping, not unparenthesized token-replacement precedence. The probe uses independent counters for calls to the empty `every`, and records returned source/selection; it is evidence about the copied functions, not a passing registered oracle or proof about the current browser run.

## M22: deterministic extra work whose work contract is inactive across browser I/O

Mutation: emphasis `filled.length > 0` → `filled.length >= 0` at production line 37. Current browser record: **survived / not-observed**, infected by constructed `allBlank`. Frozen 14:24 record: **killed**, law `work bound`, fixed `allBlank` and its random-seed counterpart. The earlier instrumented measurement was 22 baseline site evaluations versus 23 mutated evaluations, ratio `23/22 ≈ 1.04545`, above the declared bound `1.04`.

The source/selection law at `editor-inline.oracle.test.ts:62` preserves blank lines and the full transformed selection. With `filled=[]`, original `allOn` is false; the mutant evaluates `[].every(...)`, yielding true. Every source line is blank, so `lines.map` preserves each line without using `allOn`. There is therefore no missing source, selection, validity or no-throw observation in this case. The added operation is a real deterministic empty-`every` invocation; its callback does not run.

Copied-fixture observations:

| Selected source | Original/mutant output and selection | Original every calls | Mutant every calls | Callback calls |
|---|---|---:|---:|---:|
| space + LF + tab | unchanged, `[0,3)` | 0 | 1 | 0 in both |
| LF | unchanged, `[0,1)` | 0 | 1 | 0 in both |
| NBSP + LF + BOM | unchanged, `[0,3)` | 0 | 1 | 0 in both |

This is **deterministic extra work under the existing work contract**, rather than lost public formatting behavior. The guard is redundant for the returned source/selection but is an actual fast path under the declared operation-count contract; treating it as dead and removing it would discard that contract.

Why the browser report changed: `@tanstack/oracles/oracle-gaps/classify.mjs:253–266` adds a test to `baseline.work` only if its two baseline site counts agree **and neither row is clocked**. `capture-setup.mjs:923–929` explicitly regards held I/O as potentially clock-following. Browser transport awaits Playwright operations, and raw rows from the current browser run report `io:true, clocked:true`. Thus replayed production site hits can still establish infection while the framework refuses to enforce the work bound. The declaration `work: { ratio: 1.04 }` is still present on the multiline property; the absence of a work verdict is a framework/transport capability limitation, not evidence that the shortcut stopped costing an operation.

**Appropriate bound:** retain `1.04` for the established 22→23 witness. It tolerates the baseline and rejects the measured single extra site. Do not lower/raise a bound to manufacture a public-source distinction. Restoring enforcement needs a framework-supported way to judge synchronous instrumented production work separately from the browser transport's I/O, or an explicit framework limitation report. This review does not modify that mechanism or close the current warning.

M30 and M52 remain the previously reported **not-infected** cases. For nonempty strings, equality between length and twice the minimum leading/trailing star run is impossible: a non-star body requires at least `2r+1` units; an all-star string of length n has r=n and cannot satisfy n=2n for n>0. Empty is filtered/guarded. They should retain their framework-warning evidence and keys rather than acquire invented output observations.

## Formula M266/M267: a real semantic grammar gap

Current records report both logical mutations as **survived / not-distinguished**. In the frozen 14:24 pre-browser run both were killed only by the `work bound` on short/empty selections; those kills did not demonstrate semantic discrimination. Browser I/O makes the work-bound path unavailable as above, exposing the missing semantic inputs.

Let A = trimmed length at least four, B = leading double dollars, C = trailing double dollars. Current expression is `(A && B) && C`. The framework wraps each mutated AST expression, so:

- M266, outer operator at position 9301: `(A && B) || C`.
- M267, inner operator at position 9275: `(A || B) && C`.

Ordinary source of length >=4 is **already constructed** (`pi r^2`, `sourceArea`) and does not distinguish either mutant. When B=C=false, all three expressions are false. Adding just another ordinary long inline example will not close these survivors.

What is missing is intentional sampling of **independently incomplete double-dollar boundaries**, including their overlap on very short marker-only selections. The current special route generates only complete double-dollar pairs (`displaySelection = '$$' + body + '$$'`); the general arbitrary can generate asymmetry but makes the relevant literal prefixes/suffixes rare, and the current constructed cases have no `$$ab`, `ab$$` or `$$` shape.

Copied-fixture observations at whole-document selection, from 0 to the source length:

| Source | Original result / selection | M266 | M267 |
|---|---|---|---|
| `abcd` | `$abcd$`, `[1,5)` | same | same |
| `pi r^2` | `$pi r^2$`, `[1,7)` | same | same |
| `$$ab` | `$$$ab$`, `[1,5)` | `$$ab`, `[2,2)` | original result |
| `ab$$` | `$ab$$$`, `[1,5)` | `ab$$`, `[2,2)` | `ab$$`, `[2,2)` |
| `$$x` | `$$$x$`, `[1,4)` | same | same |
| `x$$` | `$x$$$`, `[1,4)` | `x$$`, `[2,1)`, invalid | original result |
| `$$` | `$$$$`, `[1,3)` | `$$`, `[2,0)`, invalid | `$$`, `[2,0)`, invalid |
| `$$$$` | unchanged, `[2,2)` | same | same |
| `$$x$$` | unchanged, `[2,3)` | same | same |
| `$$a` + LF + `b` | `$$$$a` + LF + `b$$`, `[2,7)` | unwrapped source, `[2,3)` | original result |

The formula law already authorizes these distinctions: source that is not an existing complete display formula is trimmed and wrapped according to line structure; existing display source remains unchanged; the selected inner source is retained. Both source and selection observations already exist in the browser oracle, so no new production output or renderer-specific behavior is needed.

## General grammar strengthening proposal, without matching production branches

Keep existing unrestricted UTF-16 and complete-display routes, source witnesses, and semantic laws. Add an explicit **source-shape grammar** with independent dollar-boundary and content axes so a whole class of malformed-but-legal source is tested rather than adding only mutant-killing literals.

Candidate parts and overlaps, from the existing approved law and generated source:

- source partitions: unselected prefix, selected source, unselected suffix;
- selected edge whitespace, trimmed only for the command's inserted body;
- a literal body with nondollar, nonwhitespace edges (or a separately labeled empty marker-only form), preserving arbitrary interior UTF-16;
- independent left/right marker forms: none, one dollar, two dollars;
- body lengths at short boundaries (one and two units) and ordinary longer content, plus an explicit LF axis;
- a separate marker-only run axis, including two and four dollars, where the same dollars can be both a prefix and a suffix. Preserve this overlap rather than assigning it only to one boundary category.

These annotations let the expected model classify **constructed shape**, rather than repeat production's `length >= 4 && startsWith && endsWith` expression. For the unambiguous nonempty body forms, a complete display shape is explicitly a double opener plus double closer; all other boundary combinations preserve their raw selected text and receive the single/multiline outer wrapper. The marker-only form explicitly distinguishes a two-dollar overlap from a complete four-dollar display. Edge whitespace and document contexts remain separate construction fields. The driver continues to call production using only raw text/offsets, and the current check continues to compare source, absolute selection and valid ranges.

Suggested constructed representatives of distinct boundaries (preserve current cases too):

1. opening double dollars without a closer at the threshold: `$$ab`;
2. closing double dollars without an opener at the threshold: `ab$$`;
3. the short boundary-overlap form: `$$`;
4. incomplete opening dollars across LF: `$$a\nb`.

Vary whitespace and surrounding context through the generator; keep a body-length axis so one-character `$$x` and threshold-crossing `$$ab` cannot collapse into the same untested representative category. Existing `$$$$` and `$$x$$` cover complete empty/nonempty display counterparts. An ordinary >=4 class remains useful grammar coverage but is not the missing distinction in M266/M267.

No grammar change was applied during the active run. The proposed histories must subsequently run through oracle-gaps and distinguish these mutations by the existing formula source/selection law; this copied-fixture probe alone does not close a framework survivor.
