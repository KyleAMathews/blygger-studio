# Editor oracle design grammar — process v1

Selected operations: the user's loss audit, followed by the user's design grammar extraction and refactor-plan request. Instruments: Field Lab's `loss-audit` and `design-grammar` cards, plus the installed TanStack oracle design grammar. No Field Log was requested or created. These files are project design/evidence artifacts.

## Source and preservation freeze

PR1: Loss-audit candidate frozen at `/private/tmp/blygger-loss-audit.uj1TVJ`. Three fresh agents received disjoint excerpts of the old source and the proposed reduction with sibling excerpts hidden. They returned 29, 34 and 28 assertion mappings. Raw readouts are retained in `loss-audit/`; they do not decide restoration.

PR2: Restoration was a separate action under the requested complete test migration. Original source witnesses and omitted observations were restored. Old tests remain. E1 records the routes and receipts.

PR3: The new extraction source is frozen in [source-manifest.json](https://github.com/blygger/blygger-studio/blob/fb0b79dc0450e5f3d31a5a8f59c0b697b5cc5f6e/docs/editor-oracle-design/source-manifest.json), with SHA-256 fingerprints and a local snapshot. The extraction target is the oracle suite, not a new editor implementation. P1–P10 normalize the user's already explicit preservation requirements and adopted laws. Proposed architecture and feature adoption remain distinct; no claim of exact F2 equivalence is made before implementation.

## Admission and ablation controls

These are static reconstruction/ablation controls against the current source and known counterexamples, not executable ablations of a refactored implementation.

| Control | Remove or merge | Reconstruction result |
| --- | --- | --- |
| A1 | Remove positional document/range data (M1). | Empty selected text cannot distinguish the caret inside a new block from a caret between preceding blank lines; P1/P5 fail. |
| A2 | Remove semantic annotations (M2), leaving arbitrary source only. | Required marker, parent-width and fence-closer states are no longer guaranteed by construction. Parsing them with the production scans would violate P4. |
| A3 | Merge action meaning and event routing (M3). | Cannot separately preserve format/structure classification, suppressed events and accepted-edit default prevention; P8 loses its boundary. |
| A4 | Observe only selected text in M4. | Absolute caret/range and outside-source preservation disappear; old marked-string assertions fail reconstruction. |
| A5 | Replace M5 by source equality or a last-child summary. | Real rendered nesting/code behavior or sibling multiplicity disappears; the list loss audit and duplicate-child challenge distinguish it. |
| A6 | Remove M6 and treat a pure edit as delivery. | Focus, event order, normalization, selection clamping and native/fallback behavior disappear. A fake success still cannot demonstrate real undo. |
| A7 | Collapse M7 to its final output. | Repeated verse can conceal a wrong intermediate `edit.end`; the authored invalid-end challenge distinguishes it. |
| A8 | Promote UTF-16 constructors, trace lookup or witness metadata into semantic models. | No new semantic rule or distinction is reconstructed. Demote to infrastructure/evidence. |

RC1: Every current property maps to M1–M7 and the overlap table: code block to M1/M2/M4/M5; inline to M1/M2/M4; keys to M3; host to M4/M6; handler to M1/M3/M4/M6; break to M1/M2/M4; verse adds M7/M5; list adds M2/M5; broad valid-input properties check M1/M4. This accounts for all 18 registrations without requiring a universal Markdown model.

RC2: Current direct-command models and the handler's smaller models reconstruct the same limited dispatch templates, but with different breadth. F2 substitutes shared independent semantic command models while preserving separately executed production drivers. Executable comparison is an implementation acceptance step, not a completed control.

## Range, exclusion and decomposition loss

RG1: Independent range is **untested**. The editor catalog is supplied extension material already visible during extraction. Its examples are not independent validation of this grammar. No new external survey was run.

NG1: An arbitrary literal source prefix paired with contradictory fence annotations is excluded. The restored break grammar uses either its coherent envelope generator or complete known source records. Independently varying those fields would produce invalid expected answers.

NG2: A generic production-backed formatter model is excluded by P4/R6, even if every test turns green. A final-output-only sequence model is excluded by P5/A7. These are nearby wrong refactor forms.

MC1: No concurrency, ownership race, fairness or liveness claim is made. A formal model checker was not used. Proposed richer action histories remain linear test models; they do not acquire browser undo semantics by construction.

DL1: Sharing command models can correlate errors across direct-command and handler tests. Keep independent renderer observations, current authored mistakes, real browser receiving tests and fresh review. Do not describe duplicated execution using one expectation model as two independent semantic proofs.

DL2: Moving models away from law registrations can hide authority and limits. Keep those declarations local; link the narrow model and history helpers. Module count and shorter oracle files are not evidence of simpler semantics.

## Generation and decision record

G1/F1 applies a helper extraction; G2/F2 substitutes shared test-side command models while retaining feature registrations and host/render seams; G3/F3 augments with a full action-state driver. Model v1 records preserved properties, cost and loss for each. The user asked for a plan, so the plan proposes F2 first and a bounded sequence layer afterwards. It does not select every candidate editor feature for implementation.

## Brief support map and freeze

| Brief claim | Support |
| --- | --- |
| Share plumbing and command models; keep rendering/host boundaries | M1–M6, overlap table, R1–R3, RC1–RC2, DL1–DL2. |
| Preserve every old witness before deletion | P1/P7/P9, E1, PR1–PR3. |
| Extend histories through returned selections and actual receiving paths | M7, R5, A7; catalog candidate-oracle table. |
| Separate refactor from new editor policy | P10, U2–U3; catalog behavior and candidate-port tables. |
| Current baseline passes but is not zero-gap proof | E2–E4. |
| Plan is reviewable; architecture not yet implemented | PR3, RC2, G1–G3. |

Model/Evidence/Process v1 were written before the primary plan. The plan is their human-facing projection and requested recommendation. A change to preservation, an unresolved priority or the extraction source requires a new version and comparison; it cannot be edited into the frozen reading silently.
