# Independent T5 raw-source construction review

2026-11-18, `/root/review_formatting_coverage`. Source review against HEAD
`28b0c8d642a87e5810ad6eabd95c2d1714c53396` plus the fingerprinted uncommitted
files below. Read pinned `@tanstack/oracles@97a4e7a` oracles-review, checklist
v1 and glossary in full before judging. This review changed documentation
only; it ran no browser, production, oracle, or mutation campaign.

**Verdict:** no additional source blocker identified in the six T5 raw-source
constructions. They strengthen guaranteed inputs for an existing law, without
adopting syntax-aware formatting. Completed browser/calibration/mutation
evidence remains a separate obligation; this report makes no zero-gap or
bug-class closure claim.

## Authority and independently rebuilt observation

Read the original `test-ui/format-shortcuts.test.ts` at HEAD, the neighboring
emphasis/link/whitespace comments in `src/ui/format-shortcuts.ts`, current
law registration and model, and `remaining-receivers-t5-audit.md` T5-RAW-001.
The law identifies Kyle Mathews (GitHub KyleAMathews), 2026-11-18, and the
approved source-formatting rules. Original unit examples establish star
addition/removal, preserving the other style, whitespace, caret and
selection. None asserts the six newly constructed surrounding contexts.
These additions exercise the adopted general raw-source rule; they do not
claim recovery of an omitted old assertion.

Rebuilt without using production output: for source `` `word` ``, selected
UTF-16 interval `[1,5]`, Bold adds two stars on each side of the selected
literal source. Therefore the result is `` `**word**` `` and selection
`[3,7]`. It need not render bold; the selected source is inside a code span.

Trace through the oracle:

1. `selectedCodeSpanBody` supplies a literal backtick before and after ordinary
   row body `word`, no selected/external star annotations, and kind Bold.
2. `emphasisPlan` arranges exactly that source and selection. The existing
   arbitrary admits these context edges and ordinary body. No source parse
   supplies the expected answer.
3. `emphasisEdit` uses annotated zero star counts to choose addition, then
   `emphasisModel` projects the promised full source/range/usability through
   the shared geometry helper.
4. `editor-emphasis-single` calls real browser `formatEdit` with those source
   offsets and kind. `browserCall` captures a production exception as error
   data; infrastructure failures remain thrown setup failures.
5. The driver records the normalized public edit as `result` (or `error`).
   The shared check compares the entire result at `result`, including source,
   both selection endpoints and usability, and checks error absence. There
   is one command, so a later command cannot hide an intermediate result.

A rival that silently skips Bold inside code spans would owe the unchanged
source/range and would differ at `result`. This is a source-traced
distinguishing prediction, not an executed mutant receipt.

## Grammar and reach challenges

The six additions cover a backslash before an external star pair, underscore
surroundings, code-span surroundings, link-label surroundings, link-destination
surroundings, and punctuation selected between letters. Each uses existing
primitive fields; none adds a filter, changes a bound, or removes a legal
history. Their semantic contribution is guaranteed visits to these raw input
geometries, rather than reliance on random UTF-16 accidentally assembling them.

Reach predicates inspect supplied source geometry. They do not inspect a case
ID or compare an answer. For example `linkDestinationContext` checks surrounding
`](` and `)` input; it does not certify an anchor node. Similarly a trailing
backslash predicate does not classify Markdown escape parity. This is consistent
with the explicit raw-source prose. Requiring actual parsed code/link/escape
nodes would expand the promised law. The parent reports pure membership checks
admitting all six and rejecting the nearby `outsideLeft:7` control; this reviewer
read the unchanged grammar and did not rerun those controls.

The unchanged ranges include star counts 0–6, row whitespace alternatives,
body UTF-16 and literal interiors, both emphasis kinds, and arbitrary surrounding
source. `anyText` has maximum length32; a nonempty composed context can contain
that field plus its required non-star edge. These are bounded source inputs,
not a complete Markdown grammar. The six deterministic cases do not prove a
syntax-aware or rendered-emphasis contract, nested-container behavior, browser
dispatch, or undo. Those remain the separately documented boundaries.

## Preservation check and source identity

Direct full-file diff against
`/private/tmp/blygger-final-editor-loss-audit/new/` showed:

- `inline-model-oracle.ts`: only the six entries, six input predicates and
  their comments differ. Every old construction, arbitrary, model and resolver
  body is unchanged.
- `editor-inline.oracle.test.ts`: only opening raw-source coverage prose
  differs. All registrations, drivers, checks, calibrations and limits are
  unchanged.
- `document-oracle.ts`: byte-identical, preserving 100 runs, fixed seed
  20261118 and construction/state derivation.
- `browser-driver-oracle.ts`: has the separate application-fingerprint/input
  tracking changes relative to that snapshot. It is **not** claimed
  byte-identical. `browserCall`, the direct formatting-helper path used here,
  is unchanged; broader transport review belongs to its existing review record.

Reviewed SHA-256:

| File | Hash |
| --- | --- |
| `test-ui/editor-inline.oracle.test.ts` | `c6994c41de8641db8d937794ac1d1e799404f6901ab68eafa3728b2307a5f13e` |
| `test-ui/editor-oracles/inline-model-oracle.ts` | `c8e00da445fbc8419f2798f882bea35d0760172d67d074f4c5aeed4aecbab21c` |
| `test-ui/editor-oracles/document-oracle.ts` | `c1c3f482b750530ceaa83e8afee6c0021b18c241dc722dce5fc723265db81466` |
| `test-ui/editor-oracles/browser-driver-oracle.ts` | `b0ca432cf84f1dcfb60ac5e0e9052d2f3eb524e0594be9a5e158a3e7d620562f` |
| `docs/editor-oracle-design/t5-raw-construction-patch.md` | `14a279b67a4ae9b766c9f2200980e1d411d504ea1fb6a9f08541d8c852dc3118` |

The comparison snapshot model hash was
`7d30e4f34c54d058e521f18487e1d6924e8e6ddd4e183e80e94cfba9094ee85f`.
The current inline/model/document hashes were reread and stable after the diff;
this review does not bind an earlier manifest's different model hash.

## Checklist outcomes

| Requirement | Outcome for this change |
| --- | --- |
| ORC-001 | Existing adopted raw-source authority/limits retained; no parser or rendered-law expansion. |
| ORC-002 | Annotated input model unchanged; no production semantic helper imported for judgment. |
| ORC-003 | Opening and local prose explain raw source, independent annotations, legal histories and observations; existing responsibility separation retained. |
| ORC-004 | Six known witnesses reconstructed with existing grammar; their contributions and nearby invalid marker bound identified; no narrowing. Parent's membership receipt is not treated as browser evidence. |
| ORC-005 | Direct browser `formatEdit` path and complete source/range/usability/error check traced. Execution receipt pending. |
| ORC-006 | Existing registered corrupt-result calibration retained; its execution and production mutation outcomes pending. Rival skip-in-code-span prediction above is source evidence only. |
| ORC-007 | Same property, arbitrary, driver, check, 100-run budget and fixed/random registration retained. Completed campaigns pending. |
| ORC-008 | Not triggered by additions: no stateful-model state is introduced, removed, combined or split. These are one-command input contexts. |
| ORC-009 | Raw input-context names are explicitly distinguished from parsed Markdown nodes; no mapping ambiguity found. |
| ORC-010 | Shared error-data path and browser lifecycle reused; no new resources or shrinking/capture/cleanup mechanisms. No new cleanup execution claim. |
| ORC-011 | No new plausible shared semantic fault requiring a second formulation identified in this delta. Syntax-aware refusal is a different, unadopted promise, not corroboration of this source law. |
| ORC-012 | This versioned source/hash record covers all applicable requirements and pending evidence. No completed closure claim. |
| ORC-013 | Existing selected/external marker boundary laws and their constructions remain. The added source-context witness distinguishes skipping a legal raw edit; executed challenge evidence remains owed. |
| ORC-014 | Not triggered for the added claim: direct browser helper execution makes no transfer from a controlled provider to actual editor dispatch, rendering or undo. |
| ORC-015 | Each added input state derives required `states` and constructed `enters` through the existing helper; predicates test input geometry. Completed reach counts pending. |
| ORC-016 | No unit test or fixed expected answer added to oracle files; constructions use the same model/driver/check. |

At the last inspected status the parent campaign directory
`build/formatting-oracles/inline-research-contexts` contained active runner files
and no completed summary. Progress output is not a completed pass, calibration
or law kill. Bind any later receipt to the hashes above or document source drift.

## Completed bounded execution addendum

Independently inspected the completed `results.json`, `summary.md`, `stream.log`
and relevant first two unmutated reach blocks in `test-output.log` under
`build/formatting-oracles/inline-research-contexts`. Run ID
`eaaee2dfcef7`, one source file, one oracle file, no ordinary test files, 73
authored mutants, seed 20261118, threads pool; `provisional:false`.
The four reviewed executable-file hashes above are unchanged at this receipt.
No source or browser jobs were run for this verification.

Baseline: 330 checks passed, zero failed/skipped. Stream reports both unmutated
passes at 10.5s and 9.5s and zero nondeterministic results. The same registered
properties include their existing named corrupt-result calibrations. The
aggregate baseline passes those registrations; the output does not give a
separate named calibration transcript, so this receipt does not invent one.

Every new deterministic construction entered its corresponding required input
state with count 1 in both the fixed-seed and random-seed campaigns, on each of
the first two unmutated passes:

| Construction | Required state | First-pass fixed/random output lines | Second-pass fixed/random output lines |
| --- | --- | --- | --- |
| `escapedOuterMarker` | `escapedExternalMarkerContext` | 39 /84 | 249 /294 |
| `underscoreWrapper` | `underscoreWrapperContext` | 40 /85 | 250 /295 |
| `selectedCodeSpanBody` | `codeSpanBodyContext` | 41 /86 | 251 /296 |
| `selectedLinkLabel` | `linkLabelContext` | 42 /87 | 252 /297 |
| `selectedLinkDestination` | `linkDestinationContext` | 43 /88 | 253 /298 |
| `intrawordPunctuation` | `intrawordPunctuationContext` | 44 /89 | 254 /299 |

These are counts of raw input geometry under the source law, not evidence of
parsed Markdown nodes or rendered emphasis. The generated-history summaries
at lines 45/90 and 255/300 have counts `[0,0,1,0,0,1]` in the table's state order.
The required deterministic constructions supply the visits that random source
alone did not supply. Do not sum later mutant-run copies into baseline reach.

Mutation accounting, directly recomputed from the 430 result entries:

| Recorded outcome | Count | Interpretation |
| --- | --- | --- |
| `killed` | 122 | Registered reproducible law rejection: 52 single-line emphasis, 32 multiline emphasis, 22 link insertion, 16 formula wrapping. |
| `survived` | 3 | The same open M22/M30/M52 findings below. |
| `unowned` | 305 | Warnings for functions outside this selected inline property's ownership; this receipt does not judge them. |

There were zero production crashes in the report. The 122 kills are not 430
kills. For example M1/M2 record `single-line emphasis` and fixed `bold`; M3/M4
record that law and fixed `selectedBold`. The JSON records law and witness,
not an explicit checkpoint field. Attribution to `result` is traced through
the reviewed check, rather than claimed as a checkpoint field in the report.

The three findings remain open, with their full keys and replay commands in
the linked campaign report and the earlier framework evidence records:

- M22, `filled.length > 0` changed to `>= 0`, line 37: survives,
  `not-observed`, infected by multiline fixed `allBlank`. The separate
  browser work-accounting limitation remains unresolved; this run supplies
  no new kill.
- M30, `core.length > run * 2` changed to `>=`, line 40: survives,
  `not-infected`. The previously reported unreachable-equality framework
  question remains unresolved; no equality witness or invalid-mutant ruling
  is inferred from this pass.
- M52, the analogous `inner.length > innerRun * 2` changed to `>=`, line 54:
  survives, `not-infected`, with the same unresolved framework question.

This updates ORC-005/007/015 from source-only/pending to completed execution
for these bounded inline histories. ORC-006 now has aggregate registered
calibration success and 122 reproducible law kills, while preserving the three
survivor classifications. ORC-012's broader closure obligation remains open;
the campaign neither closes the known framework findings nor supplies
syntax-aware, full-editor receiving, undo, or whole-repository coverage.
All other checklist source judgments above remain unchanged.

Receipt SHA-256:

| Artifact | Hash |
| --- | --- |
| `results.json` | `5d3f84affc468d572b1f5bb114626696bea99e5e6d2a4dac1ab1f3a8072c078a` |
| `summary.md` | `7b67866da405bbbbd0d44002879452f8b8068bd8e711d15d1e10612c0a6ffa50` |
| `test-output.log` | `b5e084b50d29417e73c40ece8101df384dd33cb555d6b247659fea687993b796` |
