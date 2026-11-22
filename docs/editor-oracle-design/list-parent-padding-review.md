# Raw review: list-parent marker padding

2026-11-18, `/root/review_formatting_coverage`, HEAD
`28b0c8d642a87e5810ad6eabd95c2d1714c53396` plus frozen working source. Review
uses the pinned oracles-review skill, checklist v1 and glossary already read in
full in this continuing review. No oracle/model/driver/production/build edits
or gap jobs are authorized for this investigation.

## Raw finding before experiment or disposition

**PAD-001, proposed enforcement/domain gap.** The adopted list law says enough
indentation for every supported 1–9 digit parent and a real rendered sublist,
never code (`editor-list.oracle.test.ts:17–24,49,70`). Production
`indentEdit` chooses `max(4, marker.length + 1)` and ignores extra whitespace
between the parent marker and body. The renderer grammar's `nestingPlan`
always emits exactly one space there, so generated numeric widths cannot
expose a dependency on that whitespace.

Candidate witness: `100.  a\n2. b` with an EOF caret, indent the second line.
The parent body starts in column6, while production would add five spaces.
Hypothesis: rendered output fails to place `b` under `a`. This is a
source-derived prediction, not yet a confirmed production defect or registered
oracle RED result. The expected semantic observation is a real nested item
with preserved `a`/`b`, not a newly invented exact indentation count.

Planned bounded actual-source browser probe: numeric parents1/100/999999999,
one through four spaces or a tab after each marker, with dot/parenthesis
delimiters and numbered/bullet children as neighboring controls. Render the
browser-returned output with the same MarkdownIt boundary used by the
existing renderer property, then inspect actual anchor list ancestry in the
browser DOM. Preserve all returned edits, source, HTML, observations and
source hashes in [`list-parent-padding-probes.json`](https://github.com/blygger/blygger-studio/blob/fb0b79dc0450e5f3d31a5a8f59c0b697b5cc5f6e/docs/editor-oracle-design/list-parent-padding-probes.json) before disposition.

## Experiment receipt and disposition

**PAD-001 is confirmed as an enforcement gap with a reachable production
counterexample under the adopted rendered-sublist law.** This is actual-source
probe evidence; the registered renderer oracle has not yet been extended or run
RED for this finding. No production, oracle, model, driver, or build source was
changed for this investigation. The raw hypothesis above is preserved; two
wording corrections are that `100.  a` starts its body at zero-based column 6
(after six columns), and the DOM inspection concerns list ancestry, not anchor
ancestry.

Authority is Kyle Mathews (GitHub `KyleAMathews`), 2026-11-18: use enough
indentation for every supported 1–9 digit numbered parent. The opening prose,
`authority`, and `editor-list-rendering` law in
`test-ui/editor-list.oracle.test.ts` carry that decision. The executable law
promises a real nested list with unchanged item content. Neither its prose nor
its limits restrict the parent marker-to-body gap to one space. The expected
observation follows from that semantic promise: the first parent item contains
`a` and a nested child item containing `b`; the parent source is preserved, no
code block appears, and the caret follows the output. This prediction does not
choose an exact indentation serialization.

### Matched-host evidence

The primary JSON report is
[`docs/editor-oracle-design/list-parent-padding-probes.json`](https://github.com/blygger/blygger-studio/blob/fb0b79dc0450e5f3d31a5a8f59c0b697b5cc5f6e/docs/editor-oracle-design/list-parent-padding-probes.json), timestamp
`2026-11-19T07:22:21.322Z`, against HEAD
`28b0c8d642a87e5810ad6eabd95c2d1714c53396` plus the frozen working source.
Its SHA-256 is
`a3d72ef8cc78fe4a8883c524f20a0f64facc59fe82dd8831bf4cf8f6a3462a64`.
The JSON records every input, selection, returned edit, resulting source,
MarkdownIt token stream, rendered HTML, and browser DOM observation.

The uninstrumented `src/ui/format-shortcuts.ts` source was transpiled in memory;
its actual exported `indentEdit` ran only inside Chromium `page.evaluate`.
The source hash was verified unchanged across the probe. The driver rendered
the returned source using MarkdownIt 14.3.3, matching the semantic renderer
boundary of the existing list oracle, then inspected nested list ancestry and
literal text in the browser DOM. It released the browser after capture.

| Component | Version or hash |
| --- | --- |
| Node | v24.19.0 |
| Playwright | 1.64.1 |
| Chromium | 156.0.8078.4, expected revision 1248 from the task cache |
| Source SHA-256 | `c4a34e5d1faa4c94df876f45577e3f173fc83267a4851c078f523406d5ccc967` |
| In-memory compiled SHA-256 | `0cecf5b8a970277400bff61ccf26a59171c98a2decb2c8b33efb0a77010295d5` |
| Reviewed list oracle SHA-256 | `5813bb32423a806cf1db2566bf40aeae43e5e237aecaf3f4fdf22edc95018fe9` |
| Reviewed list model SHA-256 | `0c1684ebb0f07080b7733c3faa3c6e96f8d181e5bf827519b81325af5eb0ee01` |

The 60-case probe crossed parents 1/100/999999999, dot/parenthesis
delimiters, numbered/bullet children, and one through four spaces or one tab
after the parent marker. Twenty cases nested correctly; forty failed nesting.
Each cell below contains four cases: two delimiters times two child kinds.

| Parent | One space | Two spaces | Three spaces | Four spaces | Tab |
| --- | --- | --- | --- | --- | --- |
| 1 | 4/4 nested | 4/4 nested | 0/4 nested | 0/4 nested | 4/4 nested |
| 100 | 4/4 nested | 0/4 nested | 0/4 nested | 0/4 nested | 0/4 nested |
| 999999999 | 4/4 nested | 0/4 nested | 0/4 nested | 0/4 nested | 0/4 nested |

For `100.  a\n2. b`, with selection `[12,12]`, the actual edit was:

```json
{"from":8,"to":12,"insert":"     1. b","start":17,"end":17}
```

The resulting source was `100.  a\n     1. b`, rendered as:

```html
<ol start="100">
<li>a
1. b</li>
</ol>
```

The parent own text was `a\n1. b`; its direct nested list count was zero,
its nested item list was empty, and no `<pre>` appeared. Thus a no-code check
alone would miss this violation. The existing oracle's full token structure
observation would reject it if the input were generated.

A narrower distinguishing pair is `1.  a\n2. b`, which nests correctly, and
`1.   a\n2. b`, which produces `1.   a\n    1. b` and the same missing-sublist
shape. The width-sensitive pair is `100. a\n2. b`, which nests correctly,
and `100.  a\n2. b`, which fails. Tab behavior also depends on marker width;
the tab must not be modeled as one literal space.

Earlier setup attempts and an explicit revision-1254 mixed-host research run
remain separately preserved under `priorRuns[0]` in the JSON. The initial
missing executable and sandbox MachPort failures made no product calls and
are setup failures. The revision-1254 run is not the primary verdict. The
primary run uses the matching revision-1248 task cache and no executable
override. None of these runs is a registered oracle RED or a mutant kill.

### Why the current oracle misses this

`Nest` has no parent-gap field. `flatNestingArbitrary` varies numeric width,
delimiter and child kind, but `nestingPlan` always builds the parent with
`+ ' a\n'`. All generated widths therefore enter the same one-space geometry.
The existing constructed width boundary at 99/100 cannot distinguish the
wrong rule "parent marker width plus one is always sufficient" from the
adopted semantic rule. Production's width calculation currently makes that
wrong choice when the parent has extra marker padding.

The rendered tree model and token observation are already sufficient for
this witness. This is a missing primitive history dimension, rather than a
need to weaken the structural check or add a standalone expected-answer
test. The source-geometry model also derives indentation from marker width
plus one, so copying a larger formula there would not provide an independent
semantic judgment.

### Smallest general strengthening

Extend the flat renderer grammar with a primitive `parentGap` axis for one
through four spaces and a tab, retaining the existing one-space histories,
constructed inputs, fixed seeds, and budgets. Generate marker widths and
delimiters independently of that gap. Reuse the existing semantic tree model
and driver/check; the expected parent/child relation remains unchanged.
Construct the narrow two/three-space boundary, the wide one/two-space
boundary, and width-dependent tab witnesses. Reach predicates should inspect
the actual input geometry or content column, rather than case identifiers.
All known valid probe witnesses must be reconstructible.

Document each axis's semantic contribution and the nearby invalid parent
`100.a`, which lacks required marker whitespace. More than four spaces and
mixed whitespace can have different CommonMark parsing behavior; investigate
their actual parent-list premise separately before extending a general
closure claim. Do not filter the confirmed padded parents away or present a
finite gap limit as closure.

Run this extended registered `editor-list-rendering` oracle against the frozen
production source to obtain RED before fixing production. After the smallest
production change satisfying the adopted semantic law, use the same oracle
for GREEN and restore the original width-only calculation as the defect
mutant. Include nearby gap/width/delimiter/child-kind witnesses in those
campaigns. A pinned witness alone does not repair the grammar gap. An exact
source-edit model needs a separately justified serialization rule if its
domain is extended; the current adopted nesting law alone does not dictate
an exact number of spaces.

### Scoped checklist outcome

This table records this finding's review scope, rather than claiming a new
complete audit of every list property.

| Requirement (checklist v1) | Outcome for PAD-001 |
| --- | --- |
| ORC-001 | Authority and semantic promise found; one-space-only generation is not a stated law restriction. |
| ORC-002 | Tree model gives an independent nesting prediction. Preserve that model instead of deriving expected padding from production's calculation. |
| ORC-003 | Current responsibilities can be traced. Any grammar expansion must update nearby prose in the same change. |
| ORC-004 | Finding: the claimed parent domain cannot reconstruct valid padded-parent witnesses. Add the primitive gap axis and its controls. |
| ORC-005 | Probe exercises actual browser `indentEdit` and records full returned source/rendered ancestry. Registered trace/check RED remains outstanding. |
| ORC-006 | No mutant was run for PAD-001. A registered defect-mutant rejection remains required before closure. |
| ORC-007 | No generated campaign was changed or executed in this investigation; retain existing fixed/random budgets in the extension. |
| ORC-008 | No stateful model state was introduced, merged, or removed; this trigger does not apply to the probe. |
| ORC-009 | `parentGap` denotes source marker-to-body whitespace; content column is its rendered geometry, not a new production concept. |
| ORC-010 | Probe preserves raw outcomes/setup status and closes its browser. No shrinking was performed. |
| ORC-011 | Existing independent rendering formulation detects the padding hypothesis once the grammar admits it; no duplicate semantic model is needed for this finding. |
| ORC-012 | Finding, authority, raw witness, exact source hashes and remaining obligations are versionable in this record and JSON. No bug-class closure is claimed. |
| ORC-013 | Adjacent narrow/wide gap witnesses distinguish the wrong width-only rule; they still need registered constructed histories and law rejection. |
| ORC-014 | Actual browser source path is observed; MarkdownIt is the controlled renderer premise. Native Tab/React dispatch and other renderers are not established by this probe. |
| ORC-015 | New gap/content-column states and constructed reach are outstanding. Existing width-only states do not establish padded-parent reach. |
| ORC-016 | No oracle test was added. The repair belongs in the same generated law/model/driver/check, without standalone fixed expected answers. |

PAD-001 remains open pending registered RED, oracle strengthening, production
GREEN, and defect-mutant rejection. This record does not alter the earlier
reported framework gaps or claim exhaustive formatting coverage.

## Independent review of the proposed grammar strengthening

Raw review notes, recorded before accepting an executable draft. The parent
requested an independent review of the author's temporary draft; runtime
sources remain frozen during the separate Firefox receiver campaigns. This
review makes no runtime edits or additional product calls.

- **PDR-001, input construction to verify:** the proposal replaces a single
  parent-gap spelling with all raw ASCII space/tab spellings whose visual
  advance from the generated marker end is one through four columns. A tab
  advance depends on the marker-end phase. Verify construction is exhaustive
  over that finite domain, contains no zero-width gap or discarded histories,
  and admits all 60 existing probe inputs. Optional omission must still mean
  the original literal one-space spelling.
- **PDR-002, semantic judgment to preserve:** parent spacing belongs to input
  construction and reach. The expected tree must remain the same independent
  parent/child ancestry, unchanged content, tightness and caret observation.
  Neither production's new indentation calculation nor a newly invented exact
  source serialization belongs in that model.
- **PDR-003, scope/control distinction to verify:** a gap exceeding four
  visual columns can make the parent's first block code. That is valid
  Markdown, but a different parent subtree from this tight paragraph tree.
  The new prose and controls must expose this boundary and the remaining
  contract question rather than silently excluding it or claiming all-parent
  closure. A missing gap before a nonempty body and a ten-digit marker are
  separate non-parent controls. Existing no-parent/totality histories must
  remain present.
- **PDR-004, reach and preservation to verify:** old numeric widths, original
  inputs, optional-field shrinking, fixed seeds, budgets, calibration and
  existing-sublist branch must survive. Required padding/width/tab-phase
  witnesses need predicates derived from actual generated geometry, including
  cases where the old width-only move is insufficient. Names alone are not
  reach evidence. Registered RED on unchanged production remains mandatory
  after review and before a production repair.
- **PDR-005, reconstruction coupling reported by the author:** all 60 probe
  inputs include both parent delimiters but the numbered child is always
  `2. b`. Current `Nest` shares one delimiter for parent and child, so the
  parenthesis-parent/dot-child probes cannot be represented. An optional
  `childDelimiter`, defaulting to the existing shared delimiter, is a second
  primitive input distinction to verify. It changes source spelling without
  changing the semantic child-list kind or expected ancestry. The draft must
  preserve all prior shared-delimiter inputs and admit the cross-delimiter
  probes, rather than changing the raw evidence to fit the old grammar.

### PDR-006: malformed inverse input can enter unbounded recipe recursion

Raw source finding before draft acceptance. Reviewed temporary patch SHA-256
`fe59e584f16078e6768b74cf2abb61d5b0331b979e9b7348d65b565c446a5722`.
The padded arbitrary's inverse checks only that the candidate is an object
with a string `parentGap`, then calls
`parentGapRecipes(parentMarker(h).length)` before validating the remaining
base record. For `{parentGap:' '}`, `parentMarker(h)` evaluates undefined plus
undefined as numeric `NaN`; its `.length` is undefined. In
`parentGapRecipes(undefined)`, a tab transition computes `NaN`. The
`next > 4` guard is then false and recursive extension follows `NaN` without
reaching a finite column bound. Framework membership may catch the eventual
stack overflow as a rejected inverse, but that does not make the recursive
construction safe or diagnostic.

This is an oracle grammar/inverse robustness finding read from source, not a
production defect or registered law violation. Validate the stripped base
record with `originalFlatNestingArbitrary.canShrinkWithoutContext(h)` before
dependent marker/recipe lookup, or establish the valid marker type and width
explicitly there. Preserve all legal recipe inputs and optional omissions.
No malformed recursive call was executed for this finding.

The same draft's independent, test-free grammar inspection found: all 60
saved probe texts reconstruct exactly; all 16 original constructed histories
remain admitted with identical plans and expected trees; the finite raw-gap
sets match an independent enumeration at marker widths 1–10 (92 spellings
total), and all 92 are admitted through the arbitrary's inverse. Zero gap,
five spaces, newline and non-whitespace controls reject. Those passing checks
do not dispose of PDR-006; a revised inverse still needs review before
application.

### PDR-007: supported digit spellings exceed positive canonical numbers

Raw source finding before final draft acceptance. Production's supported
ordered marker is `\d{1,9}[.)]` (`format-shortcuts.ts:83,106,117–118`), which
includes `0` and leading-zero spellings. The current renderer grammar uses
canonical integer values from 1 through 999999999. It therefore cannot
reconstruct `0. a\n2. b` or `000000001.  a\n2. b`. A numeric value alone also
loses the raw marker width that controls paragraph content geometry. The
adopted 1–9 digit marker law does not say “positive canonical decimal only.”

This is a source-confirmed grammar-domain finding, with no new product probe
or registered RED claimed here. Strengthen only the primitive input spelling:
admit canonical numeric zero and all raw strings of one through nine ASCII
digits, preserving the full existing numeric domain. Compute marker width and
its reach distinctions from the raw spelling. The ancestry model remains
unchanged; no zero-specific expected tree or exact indentation policy is
justified. Require zero, leading-zero, maximal-width raw spelling, and both
delimiter witnesses while retaining all 16 original plans/models and the
PDR-006 malformed-input controls. The earlier acceptance of patch
`55f56b825bb53d975207efe3f1e9e666696a4cee2988266160811ff54ed822a6`
is superseded pending independent review of this additional input axis.

### PDR-008: middle numeric widths lack required constructed reach

Raw reach finding before final acceptance of PDR-007 patch
`65d0177c3558ba8da9e8891419d4f4ff7d4ae6c7463d7eaf4c5c1ea146c30e0d`.
Independent enumeration of that draft's constructed nonbullet parents finds
raw digit widths 1, 2, 3, 4, 8 and 9. Widths 5, 6 and 7 are admitted by the
arbitrary but have no required construction; broad uniform numeric sampling
provides weak practical reach for the smaller middle values. The law/prose
claims all nine supported widths, and this work already adds spelling-based
geometry. Add the missing canonical widths and semantic raw-digit-width
predicates, rather than relying on chance. The child-marker spelling domain
should likewise have required width witnesses if cited as all-width coverage.
This is an input/reach strengthening request under ORC-015; expected ancestry
and the source policy remain unchanged. The omission predates PAD-001, which
does not dispose of the reachable domain gap.

### PDR-009: flat bullet-parent spelling was fixed to hyphen

The author preserved this raw finding before edits in the temporary draft's
`review-ledger.md`. The law names supported bullet parents, while the old
flat scene always emitted `-`. Add an optional `parentBullet` spelling from
`-`, `*`, `+`, defaulting to the original hyphen; change no ordered/bullet
ancestry expectation. Keep the existing third-level hyphen scene unchanged.
This is a primitive input/reach extension, not a new list serialization law.

### Final grammar review receipt

Independent review accepted final patch SHA-256
`4d246a11b1cc0a236dea0f187a8746c9657164d29c49ee7a957b26e130ccc44c`
for exactly these two files:

| File | Accepted SHA-256 |
| --- | --- |
| `test-ui/editor-oracles/list-model-oracle.ts` | `f89cde530ceef4134cdfd3e0b8603bad9f55ec3826db251b10555e6ea39c1ad8` |
| `test-ui/editor-list.oracle.test.ts` | `8caca1a1c3c843e3e1c03be9af20c8fb6656dc4d56fc80f8e5ea7e917f34fe47` |

The author applied only those files after acceptance. The production source
remained `c4a34e5d1faa4c94df876f45577e3f173fc83267a4851c078f523406d5ccc967`.
The independent tree model, renderer driver/check, exact-source model and mixed
model were not changed by the accepted patch. Receiver import paths contain
receiver/application/browser/document modules and do not import either edited
list test file; this supports the parent's separately recorded bounded
concurrency receipt.

Independent test-free checks established all 60 exact saved probe inputs are
reconstructible; all 16 original constructed inputs remain admitted with
unchanged plans, expected trees and old reach; all 92 finite space/tab recipes
at marker widths 1–10 match independent exhaustive raw-string enumeration and
are admitted through the inverse. Lexical zero/leading-zero/max-width inputs
are admitted, malformed/invalid marker/gap inputs reject, and the inverse
validates the base record before dependent column lookup. Final checks find
45 admitted constructions, required counts for all 18 parent/child raw digit
width states, all three bullet symbols and all four tab phases. All 30
bullet-symbol/gap combinations preserve their literal prefixes; five invalid
bullet spellings reject. Old optional omissions, existing-sublist branch,
fixed seeds, 100-run budgets and calibration remain.

PDR-001 through PDR-009 are disposed as grammar/design concerns by this
receipt, except that wider existing-code parent subtrees and arbitrary leading
indentation remain separate claims requiring evidence. This is acceptance of
the scoped grammar strengthening; it is not production bug-class closure.

## Registered RED and production source review

Independent inspection of
`build/formatting-oracles/list-parent-padding-red/results.json` confirms run
`2429c814421d`: the extended registered list oracle reports 363 passing and
30 failing baseline tests, with `editor-list-rendering` rejecting at `result`
under `rendered list nesting`. The report is provisional because its baseline
is RED; its authored mutant is blocked, not killed. It is therefore evidence
of registered RED, not a mutation closure receipt. The parent reports the
shrunk witness `0.   a\n0. a`; the baseline failure and named checkpoint are
independently verified from the results file.

The RED input/postrun manifests contain identical maps for all 399 files,
including production hash `c4a34e5d...`, accepted list-model hash
`f89cde53...`, and accepted list-oracle hash `8caca1a1...`. This confirms the
extended oracle ran on the unchanged pre-repair source. Production was changed
only after that RED, to SHA-256
`e899594086b3828684ef950a348803125108f79d59e69c915fdd8ad10cba8382`.

Source inspection finds one replacement indentation calculation inside owned
`indentEdit`: recognize the full supported raw marker and gap, calculate the
parent's actual marker/content columns with four-column tab stops, retain
ordinary minimum four prefix spaces, and measure the resulting child prefix
until it reaches the content column. Raw leading indentation must match as
before. The column helper remains local to the owned function. Continuation,
number restart, blank-line movement, outdent and caret/range code are
unchanged. No source-model expectation was rewritten.

Measuring the whole prefixed indentation is necessary: in the source-derived
example `- root\n\t100.  a\n\t2. b`, simply prepending six spaces before the
existing tab reaches column 8, short of the parent body at column 10. The new
calculation instead measures that tab phase. The first sufficient column
overshoots the target by at most three columns, keeping a nested marker within
the normal list-item indentation band. The larger-than-four padding fallback
to one matches CommonMark's effective marker padding; pre-existing code
subtree semantics are not established by the current paragraph tree.

This source review finds no additional implementation defect in the proposed
column calculation. Selected GREEN/mutation and full owned-code/mixed evidence
remain the parent's campaigns; source reasoning alone does not close them.

## Mixed continuation design concern

The unchanged mixed model can construct `type(all, '100.  a\n2. b')` followed
by `indent(end)`. Its reused exact `moveRows` rule still predicts the old
five-space indentation. That would reject a correct six-space output even
though the adopted rendered law leaves sufficient indentation spelling free.
Changing the exact model to production's new minimum formula would invent a
canonical policy. Removing the indent intent or normalizing its source would
hide the problem. No such change is authorized by this review.

A sound existing-law design is to model each command over its recorded
receiving input and keep explicit continuity between checkpoints. The driver
can resolve the original action intent against the actual public current
textarea state, record its pre-command source/selection/concrete range as
input, execute the command, and record its complete output state. The model
may read those inputs, as the package contract permits; the check must require
the first input to equal the initial document, each later pre-input to equal
the prior observed state, and the resolved range to match its intent. It then
checks every output against the independent command law at that checkpoint.

For free indentation spelling, a finite allowed-state relation can retain
candidate source/selection/history states satisfying the adopted semantic
law. Prune candidates only using the next recorded receiving input, require
that input to belong to the prior allowed outputs, and preserve the complete
chosen source on undo/redo. Expected source is never obtained by trusting an
unchecked output. A calibration must corrupt the free indent output and the
next input to the same wrong state and still fail the original indent law.
This needs a deliberate design/refactor receipt and cannot be replaced by a
late rendered-only checkpoint. No mixed runtime edits were made here.

## Empty-parent and ordinary-boundary review and final list receipt

The later full owned-list campaign `73ad966d8c3d` passed 393 baseline checks
twice and reported 104 law kills, four survivors and 335 unowned warnings.
The survivors were the content-padding `&&` mutant M152, the redundant lower
comparison mutant M153, the loop-equality mutant M156, and authored
`review-list-valid-nul-context`. Their raw results remain in
`build/formatting-oracles/list-parent-padding-full/results.json`.

The list author strengthened two existing-law boundaries before changing
production again. An optional parent body defaults to the original `a` but
can be empty; zero raw gap is legal only for an empty supported marker.
The independent tree omits an empty parent's own inline node while retaining
all ancestry, child content, tightness, prefix preservation and caret checks.
The exact-source grammar adds `99. a` as the upper ordinary four-space
boundary, with caret and range constructions, using unchanged `moveRows`.
This protects the adopted ordinary level without prescribing a minimum source
width for wide or padded parents.

Independent review found and required correction of a reach error before
acceptance: empty parent's raw trailing gap does not determine its effective
content padding. Raw gap states remain, while semantic thresholds now use
the empty-marker default of one column. Otherwise an empty `100.` parent
would incorrectly count as both beyond and within ordinary indentation.
The author preserved the raw finding before correction in the temporary
review ledger. Final test-only patch SHA-256
`2420c3725bdaabde63e8fde750fda9b3a87132d742e02fb6e0c07d806a96181e`
was independently accepted, with list-model SHA-256
`feef211a45ece64da5009c4b5d83e3c4af6bbc1c3bb828443ae32887027846ac`
and list-oracle SHA-256
`82f3cc0a931c20989b0a878ad70d666b798f141b50dc7ff12d8a3fae782f1dbf`.
All 82 old source and 45 old nesting constructions retain identical plans,
expected models and prior reach. Independent pure checks admit empty parent
gaps zero/one/four, reject zero gap before nonempty text, and confirm exact
four-space source edits for both ordinary-99 selection shapes.

Run `5395f9c12a92` in
`build/formatting-oracles/list-empty-boundaries-before` then passed 411
baseline checks twice on unchanged production `e8995940...`, without
provisional results or nondeterminism. Independently inspected registered
kills are:

| Wrong design | Required history and rejected law |
| --- | --- |
| M152, `gap >= 1 && gap <= 4` changed to `||` | `emptyParent100GapZero`, `rendered list nesting` |
| M156, prefix loop `< content` changed to `<= content` | `ordinaryParent99Caret`, `list source and selection` |

The source then changed by exactly one line from its saved
`before-refactor.ts`: `gap >= 1 && gap <= 4 ? gap : 1` became
`gap && gap <= 4 ? gap : 1`. The scanned gap is a nonnegative integer, so
this removes the unneeded lower comparison while retaining zero and
larger-than-four fallback behavior. It adds no spacing policy, changes no
model expectation, and does not remove a history. Final production SHA-256 is
`87b9635e519f922490df0a31c68935641a76e6c068d4e4e50dbb7e81f070eeac`.

The independently inspected full owned-list run `231c67f088e2` in
`build/formatting-oracles/list-padding-refactored-full` passes 411 baseline
checks twice and reports 106 registered law kills, one survivor, 335 unowned
warnings, no provisional result and no nondeterminism. All 401 input/postrun
manifest entries match within each before/after campaign. A stable-key
comparison with `73ad966d8c3d` finds 434 shared keys; all 97 shared former
kills remain killed. The loop-equality key improves from survival to a
registered source-law kill. All eight new keys from the changed conditional
and enclosing block are killed. Nine former keys disappear with that changed
source anchor, including the removed lower comparison; the replacement
conditional's `&&` and `<=` mutations are both judged and killed, at the
empty-parent and padded-star histories respectively.

The actual defect mutant `original-parent-padding-indent`, restoring the
width-plus-one rule and original numeric-only parent behavior, is rejected by
`rendered list nesting` at `starParent` in selected GREEN
`a4b8c5f60768` and in full run `231c67f088e2`. The older four-spaces-for-wide
mutant remains rejected at `number100`. Together with registered RED on
`c4a34e5d...`, unchanged tree/check, GREEN on repaired source and nearby
padding/width/tab/lexical/empty-parent boundaries, this supports the PAD-001
repair for the flat declared parent/child grammar. It does not establish an
arbitrary list subtree contract or resolve mixed continuation freedoms.

**One named survivor remains open:**
`src/ui/format-shortcuts.ts#authored:review-list-valid-nul-context`, classified
`not-observed` by this selected list-file campaign. Its valid UTF-16 totality
owner is not selected here. This review does not close it by scope: the final
default campaign must run that owner and record its registered law rejection.
The 335 unowned warnings are not reviewed product claims. No global zero-gap
or complete-formatting-coverage claim follows from this list-only receipt.

Follow-up: the mixed continuation concern above now has an independently
accepted and applied source refactor, recorded in
`mixed-input-semantic-review.md`. It preserves symbolic raw whitespace
choices through checked receiving inputs and exact chosen undo/redo source.
Browser receiving and mutation verification of that refactor remains a
separate campaign; this link does not upgrade the list-only receipt.
