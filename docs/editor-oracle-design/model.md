# Editor oracle design grammar — model v1

Extraction target: reorganize the current formatting oracles so existing behavior can be reconstructed, reviewed and extended without duplicating command semantics. This is a design for a refactor, not an implemented refactor or a proof of behavioral equivalence. The source is the Studio oracle suite in [source-manifest.json](https://github.com/blygger/blygger-studio/blob/fb0b79dc0450e5f3d31a5a8f59c0b697b5cc5f6e/docs/editor-oracle-design/source-manifest.json). The other editors in [the behavior audit](../editor-behavior-audit.md) supply extension proposals; they are not additional extraction sources.

## Preservation contract

The user has already approved the formatting laws and separate text/list/textarea models, requested complete retention of the old tests, and asked for this refactor plan. The following normalizes those instructions. Architectural choices remain proposals.

| ID | Property to retain | Basis |
| --- | --- | --- |
| P1 | Reconstruct all 91 old assertions, including exact source, both selection endpoints, rendered ancestry and absence of code blocks where asserted. | User-required; historical test source. |
| P2 | Preserve the adopted repairs: collision-safe fences, slash parity, literal marker-only emphasis, GitHub whitespace placement, display-formula preservation, unknown-key rejection, wide-parent nesting and closing-fence preservation. | User-approved laws. |
| P3 | Keep each law's authority, scope and limits visible beside its registration. | Installed oracle design/review skills. |
| P4 | Predict from semantic input annotations; production output cannot supply the expected result. Resolvers prepare inputs and models judge them. | Existing oracle architecture and review repairs. |
| P5 | Observe complete resulting source, absolute selection and usable edits; distinguish an intentional decline. Record each intermediate step in a sequence. | Historical tests, adopted laws and review findings. |
| P6 | Preserve intersections among source edits, actual rendering, dispatch acceptance and browser delivery. | Existing renderer/handler/host properties. |
| P7 | Retain UTF-16, CR/LF, blank-line, document-edge and whole-line-selection dimensions; every constructed history belongs to its arbitrary and can shrink. | Existing histories and loss-audit repairs. |
| P8 | Keep platform/modifier rules, picker precedence, IME/read-only suppression, native/fallback input effects and off-list Tab navigation. | Adopted keyboard/application laws. |
| P9 | Retain seeds, constructed witnesses, semantic reach, calibrations and authored challenges. Compare mutation evidence before and after each extraction. | Installed oracle skill; user-required no-loss migration. |
| P10 | Keep proposed editor behavior separate from approved behavior. New commands or changed editing policies require their own law decisions. | Behavior-audit scope and oracle skill. |

P1 preserves the historical default triple-backtick output for nonconflicting code selections. Collision handling retains the approved literal-content guarantee. It does not require every legal fence choice to have the same width.

## Candidate parts and their jobs

| ID | Candidate part | Job and concrete witness | Source |
| --- | --- | --- | --- |
| M1 | Document and selected range | Represent UTF-16 source, empty carets, document boundaries and whole-line expansion without losing position. Empty code-block caret and next-line-start exclusion require it. | `editor-code-block`, `editor-list`, `editor-inline`. |
| M2 | Annotated semantic scene | Carry selected/external stars, list marker/indent/parent relations, or fence marker/closer/body context. Distinguish literal stars from style and a wide parent from an ordinary one. | Inline rows, list rows/trees, break envelope. |
| M3 | Requested action and dispatch conditions | Distinguish command meaning from platform chords, suppression and whether an edit is accepted. Off-list Tab must leave focus navigation available. | Key-classification and handler models. |
| M4 | Edit outcome | Keep decline versus edit, complete resulting source, absolute selection and validity. Allow different replacement spans when they yield the same promised result. | Inline result projection; direct edit properties. |
| M5 | Rendering observation | Retain literal code content, list ancestry, item multiplicity, first-child order and no-code conditions. A duplicate child must not disappear in a last-value summary. | Code-block, list-rendering and verse drivers. |
| M6 | Host transaction | Represent focus, replacement attempt, native/fallback effects, CR normalization, selection clamping and event order. A fake native success does not establish browser undo. | `environment`, `transaction`, `applyEdit` property; Playwright receiving tests. |
| M7 | Ordered action history | Feed each returned document/selection into the next action and observe each step. Currently grounded by repeated verse; broader command histories are an extension. | `editor-line-break-verse`. |

Witness identifiers, authority citations, seed declarations and mutation receipts are evidence attached to these parts, not another semantic model. UTF-16 constructors, trace lookup and calibration helpers are infrastructure. Giving them names does not make them new primitives.

## Active overlaps and dependencies

| Overlap | Function that must survive extraction | Boundary to retain |
| --- | --- | --- |
| M1 × M2 × M4 | Whole-line lists preserve blank rows, EOF and next-line-start exclusion; emphasis distinguishes selected and external markers. | Source geometry cannot be replaced by selected text alone. |
| M2 × M5 | Written indentation must actually create the intended list tree; fenced content must render literally. | A source-only oracle cannot stand in for the renderer. |
| M2 × M3 × M4 | Shift+Enter on a closing fence preserves that fence; Tab prevents default only when a move is accepted. | Dispatch and command semantics meet at acceptance. |
| M4 × M6 | Raw edit ranges pass through browser newline normalization and clamping. | Host policy stays in the textarea model, not in the pure command model. |
| M1 × M4 × M7 | The returned caret determines the next action, so a wrong intermediate endpoint remains observable. | Final document equality alone is insufficient. |
| M2 × M4 × M5 | A link placeholder is incomplete source; a completed link has a rendered label and destination. | Do not apply a completed-anchor law to `[]()` placeholders. |

Dependency direction for the proposed architecture: semantic histories → concrete input resolver → production driver; the same semantic histories → independent command model → expected outcome. Rendering and host drivers add their own observations. The check compares them. Models never call the production formatter.

## Rules, transformations and conflicts

R1: Share document construction, outcome projection and observational plumbing when they have the same contract. Keep semantic decisions in small command models. **Architectural inference**, supported by repeated infrastructure and the approved separate-model choice.

R2: Extract a command model once and reuse it for direct-command and handler expectations. The production handler remains independently executed. This replaces the current handler's smaller formatting implementation, not its forwarding checks. **Proposed substitution** with P4/P6 controls.

R3: Keep source, renderer and host checkpoints distinct even if they share histories. Registration count may stay the same; reducing count is not an objective. **Source-supported constraint** from the loss audit.

R4: Preserve every old witness ID and source partition. A duplicated fixture may become a reference to the same data; deleting its coverage or making it random-only is a weakening. **User-required constraint**.

R5: Compose action histories only where the prior result supplies a legal next state. Do not assert a universal “toggle twice restores the source”: formulas, empty pairs and selections have different rules. **Inferred legality rule**, grounded by existing command differences.

R6: No production scanner, `isUrl` helper or formatting function may become its own expected-answer model. Model reuse means reuse within the test side. **Existing independence constraint**.

U1: The list source oracle currently compares full edit objects; inline already allows different replacement spans. The refactor must retain whole-line expansion where it is explicitly promised, and separately document any incidental fields before changing that comparison. No silent global projection change.

U2: Browser native-command success, exceptions/absence and real undo are host questions. Current fake-host coverage establishes true/false paths. Any promise for absent or throwing APIs needs a receiving probe and a sourced law; it cannot be added as a fallback refactor.

U3: “Stock standard” does not resolve every convention. Word-at-caret, underscore removal, whole-selection versus per-line emphasis and formula cycling differ among references. Existing adopted choices remain the contract.

## Adjacent architectures

| ID | Route and structure | What stays fixed | Coordination cost and loss |
| --- | --- | --- | --- |
| F1 | Extract shared UTF-16/range/trace utilities; retain all current semantic implementations. | Current feature files, laws and checks. | Small extraction; handler semantics and totality plumbing remain duplicated. |
| F2 | Extract reusable independent command models, semantic histories and document/outcome helpers; retain feature-focused law registrations and a separate textarea host model. | P1–P10, renderer/host overlap checks and production independence. | Requires stable test-side interfaces and careful provenance links. Sharing a faulty model could correlate direct and dispatch checks, so independent renderers and authored challenges remain necessary. |
| F3 | A full editor action-state model drives command, toolbar, paste and undo histories. | Could retain P1–P10 if all adapters and legal transitions are reconstructed. | Larger legality/shrinking burden and more host coupling. Single-command failures become harder to isolate. This is an extension, not a prerequisite for test replacement. |

F2 is the proposed first refactor. A bounded M7 sequence layer can follow it without committing to F3. This preference belongs to the requested plan; it is not an instrument finding that F2 is universally best.
