# Browser sequence design grammar

This extends the approved separate-model design (model.md, F2 and bounded M7).
The preservation relation is **named laws**, with exact reconstruction of retained
clipboard/paste observations. The triggers are more than one action branch per
law, shared state, and reuse/extraction of command models. It adds histories and
observations to adopted rules; it does not adopt another editor's behavior.

## Workflow parts and witnesses

| Part | Job and witness | Authority |
|---|---|---|
| Source and input range | A later `current` insertion depends on the earlier source/caret. | Existing link insertion law and original multi-action clipboard test. |
| Surface | Composer→full must preserve source; full→full is inspection. | Original paste test. |
| Clipboard/typed payload | The host can normalize raw clipboard strings and input fields before production consumes them. Record those inputs separately from source results. | Web clipboard and HTML text-control boundaries; review WF-001. |
| Provider completion | A completed native read precedes the render checkpoint. Native paste waits for input or actual cancellation. | Receiving checkpoint, WF-002. |
| Sheet occurrence and accessible presence | An invalid/denied provider asks for a URL at the captured range; after submit no accessible matching dialog remains. | Existing sheet helper; WF-004 corrected its earlier detachment overstatement. |
| Feedback cardinality/text | Exact tracker feedback through one toast. | Original strict toast assertion. |
| Native versus DOM paste | Native default inserts text; synthetic dispatch records cancellation without fabricating native input. | Original DOM-event test and approved additional OS clipboard work. |
| Profile and ordered stream | Mobile paste→full→paste and clipboard→fallback are required overlaps, not unrelated one-step states. | Original two Playwright profiles. |

The model is a pure text/range reducer using the separately reviewed link model.
Its only trace reads are the clipboard provider, native event payload and typed
field inputs captured before consumption; it never reads formatted source or
returned carets. CR/CRLF are normalized at the textarea boundary. Native clipboard
emptiness is a no-op. Nonimage synthetic files establish refusal of link handling;
image upload has its own receiver and is outside this law.

A pipeline of isolated link scenes is an adjacent form, but loses same-history
handoff and current-selection continuation. A document/range transition table
keeps those, while duplicating the existing projection unless it calls the same
independent model. The retained reducer keeps both and records host premises
explicitly. No claim of minimality or equivalence to every editor is made.

The two exact original histories, both profiles, denied/normal providers,
invalid/cancel/valid typed input, native caret/prose/selected paste, nonimage files,
Enter/Space activation, CR/CRLF/surrogates and normal neighbors are constructions.
An unsupported image upload is an exclusion control for the link-default claim,
not evidence of a tested image feature. Mutation transport currently judges the
links helper only; receiving mutations in authoring.tsx remain open WF-006.

## Mixed-action parts and reduction

A bounded input action stream replaces a journey switch for the new property;
the original session grammar is retained unchanged. Source/range state predicts
the next command. Undo/redo stacks distinguish a retained branch from an abandoned
one. `redoKnown` separates a known empty redo branch (the actual key must run) from
host history after no-op/pour-over transactions, which the shortcut law leaves
unconstrained. Native/fallback and viewport profiles remain independent axes.

The model reuses emphasis rows, link/formula projections and whole-line list
geometry. The list model extraction retained all 82 constructions and compared
2,000 seeded generated histories: **2,082 exact observations unchanged**. This is
a sampled two-way comparison, not a proof of general equivalence. The wider
explicit-parent helper admits mixed documents and wide numbered parents; old
parent histories retain their prior semantics. Row whitespace model input types
are widened to strings without changing existing generator values.

The independent Markdown parser consumes only the prefix before the caret to
classify fences. Whole-document maps wrongly predict literal code at offsets1/2
inside a partial opener; `mixed-first` failed on this model bug, not production.
Retain that exact family and nearby offsets0–4. Container and malformed-fence
semantics beyond the adopted envelope remain an authority boundary to inspect
if generation reaches a disagreement.

A full source parser for every command would repeat more production decisions.
A semantic document AST would avoid parsing but require offset-preserving edits
for every arbitrary selection. The retained reducer reuses the approved command
models and makes its limited row tokenizer explicit. It checks every intermediate
source/selection, not just a final round trip. Production does not predict any
answer.

Default code serialization is exact only for tick-free selections. A selected
collision retains its original range and admits a valid literal fence family.
The relation fixes body, surrounding source, minimal blank-line padding and body
selection, while marker kind/width and legal empty-info/trailing whitespace stay
free. An independent CommonMark parser validates the isolated literal envelope;
full source/selection reconstruction rejects extra content and changed context.
Only the next admitted public input binds a previously allowed spelling, and
undo/redo then preserves that exact chosen source. The dedicated code receiver
retains actual rendered-code observations. The selected-code continuation record
separates diagnostic receiving evidence from pending canonical owner acceptance.

No original constructions, budgets or fixed seeds are removed. Neither clipboard
helper-only kills nor the dedicated collision property establishes those open
receiving/composition boundaries. Keep them separate in the final gap report.

## Continuation strengthening before execution

WF-008: tracker removal and a terminal/before-hash fragment question must overlap
in the same receiving history. Four paths (clipboard, denied-provider sheet, DOM
paste, native paste) each construct terminal, before-hash, and ordinary question
neighbors. No model result changes; the new required state names the overlap.
All48 workflow constructions are admitted by the unchanged arbitrary.

MIX-R5: selected-code collision requires both native and forced-fallback prefixes
and minimum/maximum width3/12. Four added constructions retain the seven original
ones; all11 are admitted. The fence marker/width remains an allowed choice.

MIX-R4: scene is only an initial input and cannot establish later literal context.
Semantic reach folds the same independent source/undo model, testing current row
and remaining redo branch before the actual action. A branch-cleared flag names
a real changed-source edit that discarded redo, distinguished from a later Undo
that legitimately creates a new redo entry. Reach adds no model output and does
not narrow legal histories. Existing fixed/random budgets and seeds remain.

## Adopted CommonMark opening-info delta before production

Decision by Kyle Mathews (GitHub KyleAMathews),2026-11-18: follow CommonMark for
backticks in a backtick fence's info string; generate an oracle and fix the
scanner. The old declarative envelope excluded invalid opening info. New
histories retain all old laws and add this missing syntax dimension rather than
reclassifying a failure as passing. CommonMark4.5 prohibits backticks in a
backtick fence's info string; tilde fences permit them. The prefix before the
caret remains the information boundary, and closing-fence newlines retain the
adopted protection. The model uses marker identity and independently generated
added tick count, never the production scanner. Parts: marker, base width, indentation,
added tick count, opener/body checkpoint, source range, suffix. Each contributes
its syntax boundary or preservation obligation. Tick count0 is the nearby valid
backtick opener; tilde+ticks is the valid contrasting marker. Width3/12, tick
count1/12, both checkpoints, empty/nonempty selections, and both indentation
boundaries are constructions. The base marker run is3–12 characters. With empty
backtick info, up to12 adjacent ticks extend that run, so the effective delimiter
can be up to24 characters; these extension ticks are not info characters.
`oneInfoTick`/`manyInfoTicks` require actual info membership, while the separate
`extendedOpeningRun` state names a contiguous delimiter extension. Exact output and caret are checked after a real
browser function call; mixed history retains the actual keyboard receiver.

A parser-based alternative would derive source context independently, as mixed
already does, but the declarative envelope gives a simpler independent answer
for this syntax family. No old model, construction, seed or budget changes.
