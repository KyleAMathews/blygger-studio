# List loss-audit restoration receipt

The remaining source-level observation loss is repaired. All 34 historical list assertions now have retained routes: 24 exact source/selection/decline assertions and five exact rendering inputs with their two original checks each. This supersedes the residual loss in /private/tmp/blygger-final-loss-lists.md; its detailed per-assertion mapping remains applicable.

Read-only re-review in /Users/kyle.mathews/programs/blygger-studio/.worktrees/oracles-explore. No competing tests, browser calls, or repository edits were made.

The 24 exact original source histories remain at list-model-oracle.ts:78-101. The source property still sends exact strings/endpoints to Chromium indentEdit and compares the complete returned edit plus complete spliced output, so caret/range endpoints, blank lines, outside contexts and null declines remain observed.

The five exact original renderer histories remain at list-model-oracle.ts:197-201. The independent MarkdownIt observation still compares complete list/item/inline ancestry, ordering and multiplicity, plus literal no-<pre>, no-code, unchanged parent prefix, empty selection and EOF caret.

The added `tight` observation at editor-list.oracle.test.ts:82-84 now permits only list/item tokens, hidden paragraph wrappers, and inline tokens whose children are all plain text. list-model-oracle.ts:227 requires tight:true through the same result comparison at editor-list.oracle.test.ts:86. Visible paragraphs, thematic breaks, headings, code, inline markup and other intervening blocks therefore cannot disappear behind the filtered list topology. Combined with the exact expected list tree and plain a/b text for the five old inputs, this retains the old immediate <li>a<[uo]l><li>b requirement under the default MarkdownIt renderer. Existing a/b/c nesting is also fully compared.

The authored loss-audit-loose-parent mutant specifically changes two-line numeric-parent10 inputs into the earlier loose-paragraph/thematic-break counterexample. It preserves the formerly insufficient filtered list topology, prefix and EOF caret but produces disallowed visible paragraph/thematic-break tokens, so the new observed tight:false differs from modeled true at the rendered-list result checkpoint. This is a source-level prediction of the intended rejection; the running suite supplies the actual kill evidence.

No historical list assertion remains absent or narrower in this audit. This receipt establishes source adequacy only; it does not claim a completed suite, GREEN result, measured reach, calibration result or mutation kill.

Reviewed SHA-256:
- test-ui/editor-list.oracle.test.ts: adfa25be7102536643159c8d249af6d08be56cb2109d00b3c0c3036f8089c654
- test-ui/editor-oracles/list-model-oracle.ts: 4be8ef23bf223ebbe350b3c063d21bab09dcb3d3e15c84f414441235b3e48e44
- test-ui/editor-oracle-mutants/loss-audit-loose-parent.json: f59d98416fbb71e0f16f993ddf401c1eb5ae6c5ee27b1a53a354d1bbab9b66c2
