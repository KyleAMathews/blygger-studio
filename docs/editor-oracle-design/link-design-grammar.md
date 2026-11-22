# Completed-link oracle design

2026-11-18. Base `28b0c8d642a87e5810ad6eabd95c2d1714c53396`;
oracles package `97a4e7a8e4b870c269bff297a16bf8435d258640`.
This records design and review repairs before any change to `src/ui/links.ts`.
It is not a completed campaign or permission to remove receiving tests.

## Preservation relation and authority

The triggers are six laws at one boundary, branches in URL/insertion models,
and review-driven changes to an existing model. The relation is reconstruction
of all 21 helper assertions in `test-ui/links.test.ts`, including omitted
arguments and feedback receiving complete insertion objects. Named laws extend
that reconstruction to generated inputs. Checkpoints are complete browser
helper returns and the actual Worker-preview/browser anchor DOM.

Kyle Mathews (GitHub KyleAMathews), 2026-11-18, adopted the completed-link
backlog and preservation of the existing helper behavior. That fixes lexical
http(s) recognition, tracker policy, source escaping, selected replacement and
feedback. WHATWG URL parsing/serialization is a declared trusted base. CommonMark
0.31.2 §6.2 defines character references in link labels. No protocol or API
contract changes are involved.

The initial renderer predicted raw label spelling even for legal `&amp;` inputs.
Independent review demonstrated that contradiction. The repaired model predicts
the selected label's existing Markdown semantics. This corrects the oracle's
overclaim; it does not impose a new entity-escaping behavior on production or
remove any generated label. `&amp;`, `&copy;`, unknown and unterminated references
are constructed states. Rereview also caught HTML's partial legacy-prefix decoding
of unknown `&copyx;`, `&ampx;` and `&notit;`. These remain literal by exact-name
membership in an independent CPython HTML5 vocabulary, with `&notin;` as a nearby
valid control. No grammar filter or run-budget reduction was added.

## Parts, rules and distinguishing inputs

| Part / rule | Job and distinguishing input |
|---|---|
| Raw token or structured URL | Raw UTF-16 admits failures such as `https://[`; structured fields efficiently vary real destinations and query order. Lexical acceptance is intentionally distinct from parse validity. |
| Explicit ASCII tracker vocabulary | Separates exact names and `utm_` plus ASCII word suffix from near misses `ref_id`, `utm_` and `utm_K`. The model projects retained entries; production deletes matched keys. |
| Query entry sequence | Duplicate `ref` entries distinguish occurrence counts from unique-key counts. `id` and `page` distinguish tracker removal from loss of page selectors. |
| Fragment | `#part?`, `#part?#next`, `#part?next` distinguish query cleanup from editing the fragment. |
| Character-walk source model | Brackets and backslashes cannot end a selected label. Separate parentheses, angle delimiters and whitespace states distinguish incomplete encoders. |
| Optional argument presence | Omitted label and explicit empty label share an autolink answer but exercise different public calls. A wrong default distinguishes them. |
| Before / selected / after partitions | Replace only the selected range, retain both sides, and place the caret after the new source. Empty selected text chooses an autolink. |
| Feedback input shape | Direct flags vary 0/1/many and selection kind. Composition passes the real complete insertion result, detecting rejection or mishandling of extra source/caret fields. Expected flags remain derived from inputs. |
| Render input parts | Exact CPython HTML5 name membership after CommonMark tokenization; a native HTML textarea decodes known tokens before any production call. This is recorded reference input, not an insertion/preview output. |
| Anchor DOM | Real insertion → real Worker preview → browser DOM independently challenges canonical-source agreement. Compare all anchors plus orphaned text, not just the first matching anchor. |

Each helper law is a pure function of inputs. The renderer's pure model may read
the independently projected `labelInput`, permitted by ORC-002 and the glossary;
it never reads production insertion or preview outputs. The native HTML entity
table is independent of production MarkdownIt's `entities` decoder. Syntax alone
does not prevent partial legacy-prefix decoding. The independent exact-name set
does; a reviewer compared all 2,125 semicolon-complete CPython names with native
Chromium decoding and found zero value mismatches. Unknown-prefix controls remain
literal. Missing reference input produces a mismatch,
not a thrown model error.

The overlap is deliberate: cleaning is checked alone and through insertion,
insertion through feedback, source serialization through actual rendering.
Composition adds receiving observations without treating model reuse as an
independent formulation. The anchor path provides the different formulation.

## Reconstruction, bounds and exclusions

The independent loss audit inventories all 21 helper assertions and nine app
receiving observations. The original selected/autolink/invalid inputs remain.
The two helper losses found by review have new constructions and authored
challenges: `links-omitted-label` and `links-full-result-feedback`.
`links-unencoded-angles` distinguishes the delimiter gap separately from the
broader unencoded-destination challenge.

Preflight after these repairs admitted every construction through its arbitrary:
25 raw, nine source, 30 insertion, six feedback and ten rendered-link histories;
four further entity-prefix constructions were then added for the rereview finding.
The insertion grammar reconstructs every raw URL boundary, including lexical
acceptance followed by parse rejection. Rendering constructs surrounding
padding and duplicate trackers as well as its character-reference boundaries.

Bounds remain raw strings 512 UTF-16 units; source target 96 and label 64;
insertion sides 32 each; structured URL paths 64 symbols, at most 18 query
entries, values 16 symbols and fragments 16 symbols. Rendering labels contain
up to 32 generated symbols, potentially 64 UTF-16 units. The initial description
of that last bound as 32 units was inaccurate; the larger domain is preserved.
Feedback counts are 0–32. All helper campaigns retain runs100 and seed 20261118;
preview retains runs25, with the same fixed and random campaigns.

Nearby exclusions are target length97, negative feedback counts, renderer
`*x*` and isolated-surrogate labels. They were rejected in the independent
review's membership checks. These are generation boundaries, not filters added
to clear a product failure. Numeric character references are outside the preview
alphabet because `#` was never admitted; source helpers still accept arbitrary
bounded UTF-16 strings.

## Reduction and adjacent forms

No existing stateful model is merged here. Expected URL spelling, insertion
source/caret/flags and feedback are derived rather than cached. Removing the
raw/structured distinction loses malformed inputs or efficient tracker reach;
removing argument presence or the full-result shape loses an audited public
call. No field has been kept solely for a case name.

The review repairs strengthen required reach/call shapes and correct the entity
expectation without narrowing histories. All original helper constructions
remain. No observational-equivalence claim is made for the formerly incorrect
renderer: for `&amp;` the old model expected five literal source characters and
the repaired model expects one displayed ampersand. That is an explicit model
correction under the preserved Markdown contract, not a behavior-preserving
refactor.

| Adjacent form | Keeps | Changes / cost |
|---|---|---|
| Six input/result properties, selected here | Independent law failures and full helper observations | Shared URL and geometry inputs; additional app paths need their own receiving histories. |
| One complete link-action transition model | Can compose clipboard, fallback sheet, paste and navigation | More host state and permission premises than these stateless contracts need. Appropriate only for the receiving extension. |
| Independent full CommonMark reference parser | Could predict arbitrary label markup | Large trusted grammar with little value for this writing-tool scope. Current source law plus narrow semantic DOM formulation is smaller. |

No formal state model is needed for these stateless helper laws.

## Limits and execution gate

The old helper tests remain until repaired-oracle campaigns and review closure.
The clipboard/sheet/paste assertions in `e2e/compose-pwa.spec.ts` remain until
registered app oracles reconstruct their event/default-prevention, visible toast,
fallback sheet and same-history source-transfer observations. Passing a helper
or synthetic clipboard event does not establish OS clipboard delivery.

The initial run was a registration failure, not RED. The next run uses unchanged
production and the repaired oracle; it must establish a valid RED before any
fragment repair. Review acceptance and campaign receipts will be recorded
separately. The three previously reported formatter-framework findings remain
open and are not closed by adding this boundary.
