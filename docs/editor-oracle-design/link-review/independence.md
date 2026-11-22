# Completed-link oracle review — independence and law suitability

Reviewed 2026-11-18 by a fresh child agent using the installed `oracles-review` skill, glossary, and checklist v1. This is an independent review, not an author self-review. No production or oracle implementation was edited by this reviewer.

Base commit: `28b0c8d642a87e5810ad6eabd95c2d1714c53396`. The worktree is uncommitted and shared with an active author. Git object hashes of the reviewed versions:

| File | Blob |
| --- | --- |
| `test-ui/editor-links.oracle.test.ts` | `954132154e540260252e4d762771c1e7212909bb` |
| `test-ui/editor-oracles/link-model-oracle.ts` | `d58661b1bd49be6b7d887c711369d33f52d3e685` |
| `test-ui/editor-oracles/browser-driver-oracle.ts` | `4042c665e52015c618505d3aa4653f0ef18404e8` |
| `test-ui/editor-oracles/browser-source-oracle.ts` | `ddc277862b9f1db452db42ce1711b6b42f1262a2` |
| `scripts/formatting-oracle-application.ts` | `0aafb3df8d3f7e5f94b86279acc53dcab3d26372` |
| `scripts/formatting-oracles.ts` | `21d8bf1c44f78348b9518c750f10917527d973f0` |

## Verdict

Request changes before treating the new oracles as reliable production-fix authority. Two concrete issues remain: a rendered-label expectation contradicts the grammar it accepts, and angle-delimiter encoding has no required distinguishing witness. No production defect closure or mutation-kill conclusion is made here. The helper/renderer split is useful and the production helpers execute in the browser, but neither fact resolves these issues.

## Findings

### R1 — Named entities are legal histories but violate the accidental literal-label expectation

**Claim challenged:** `editor-completed-link-rendering` promises a literal label for every generated plain selected label. The model returns `h.label` unchanged. The rendering alphabet includes letters, `&` and `;`, so `&amp;` and `&copy;` are legal labels; `renderArbitrary.canShrinkWithoutContext({ label: '&amp;', url: url() })` returned true.

**Authority:** The file cites Kyle Mathews / KyleAMathews, 2026-11-18, approving completed-link work and preservation of `test-ui/links.test.ts` at the base commit. Those existing tests specify bracket/backslash escaping, not escaping Markdown character references. Source serialization deliberately preserves every label character other than brackets/backslashes. Neighboring project research distinguishes plain selected text from arbitrary Markdown syntax; its literal-rendering claim does not resolve character-reference semantics.

**Smallest validated witness:** Select `&amp;` and call `insertLink('&amp;', 0, 5, 'https://example.com/a')`. In real Chromium, unchanged production returned `[&amp;](https://example.com/a)`. Actual Worker fragment preview returned `<p><a href="https://example.com/a">&amp;</a></p>\n`; the browser anchor's `textContent` was `&`, whereas the current model predicts `&amp;`. `&copy;` similarly produced `©`. Plain `plain`, bracketed `a [b]`, and space-only ` ` controls produced their expected labels.

**Evidence status:** Run against the actual bundled `src/ui/links.ts` in Chromium and the disposable actual Worker `/api/preview` endpoint. This is a review probe, not a registered oracle RED result or kill. Chromium revision 1254 was selected explicitly because this review subprocess's default requested revision 1248 was absent. The first three probe attempts failed during setup (sandbox local-listen permission, an ESM subprocess/eval issue, and missing default browser); none counted as product evidence. A later script-injection error was likewise setup, then corrected. The successful probe cleaned up its browser and application.

**Repair:** Reconcile this expectation with approved source semantics before changing production. Prefer a genuinely independent semantic label projection that recognizes Markdown character references, retaining the present generated domain and adding constructed named-entity and near-miss witnesses. If the desired contract instead escapes character references so selected source always renders literally, present that explicit law delta: it changes the existing canonical-source rule. Silently removing `&` or `;`, filtering entity-shaped labels, or changing production solely to satisfy the accidental expectation would conceal the disagreement.

**Requirements:** ORC-001, ORC-004, ORC-011, ORC-013, ORC-015 (checklist v1). This is a confirmed contradiction between model and legal history; it is not a confirmed production defect under the preserved-source contract.

### R2 — The destination law does not require reaching angle-delimiter encoding

**Claim challenged:** `editor-link-markdown` protects delimiter/whitespace encoding over arbitrary target strings. Production and the model encode `(`, `)`, `<`, `>`, and whitespace. All delimiter classes collapse to `encodedDestination`; no constructed Markdown history contains `<` or `>`.

**Authority:** The adopted canonical-source statement in `editor-link-markdown`, including the explicitly encoded destination alphabet in its model and the preserved public helper contract.

**Distinguishing witness:** `{ target: 'https://example.com/a<b>', label: 'x' }` is legal (`canShrinkWithoutContext` returned true) and predicts `[x](https://example.com/a%3Cb%3E)`. A plausible wrong serializer that encodes parentheses and whitespace but leaves angle brackets predicts `[x](https://example.com/a<b>)`. That wrong serializer passed all six existing constructed Markdown histories in a direct model challenge. A direct sample of 100 arbitrary histories with seed 20261118 contained zero target strings with angle brackets. That sample is supporting probability evidence, not an oracle campaign or proof of universal survival.

**Evidence status:** Read from source plus executed grammar/model challenge. No owned-production mutant was run, and no kill/survival is claimed.

**Repair:** Declare the delimiter distinctions needed by the law and construct histories for angles, parentheses and whitespace. Include both selected-link and autolink destinations where their surrounding syntax differs; add a registered wrong-angle-encoder challenge and require rejection at `return`. Keep arbitrary UTF-16 generation. A lone fixed assertion would not repair generated reach.

**Requirements:** ORC-013 and ORC-015 (checklist v1), with ORC-004 ablation evidence motivating separate delimiter classes.

### R3 — State rendered-label bounds in their actual units

**Claim challenged:** Renderer limits say labels through “32 units”; neighboring raw/source bounds mean UTF-16 units. The renderer's custom string unit can be `😀`, which occupies two UTF-16 units. A 32-emoji label is admitted and has UTF-16 length 64.

**Evidence status:** Executed grammar admission and length check. This is scope-documentation precision, not faulty production or an invalid history.

**Repair:** Describe the bound as 32 generated symbols, up to 64 UTF-16 code units, or use an explicitly intended UTF-16 bound with the required law-delta accounting. Preserve the current larger domain unless a justified contract change is intended.

**Requirements:** ORC-001 and ORC-004 (checklist v1).

## Rebuilt observation and production trace

From the preserved helper contract alone, input `Read the essay today.`, range `[5, 14)`, URL `https://example.com/e?utm_source=x&fbclid=y` must retain `Read ` and ` today.`, remove two tracker occurrences, create `[the essay](https://example.com/e)`, put the caret immediately after the inserted Markdown, report `removed: 2`, and report `linked: true`.

The independent model represents URL policy as an explicit tracker vocabulary plus ASCII word-suffix recognition. It projects retained query entries and counts the removed entries. Production instead finds regex-matching distinct keys and mutates `URLSearchParams` by deletion. Both intentionally trust WHATWG URL parsing/serialization; that trusted base is explicit. The model's source serializer walks characters rather than invoking production's regex helpers. The insertion model composes source partitions and places the caret by output length. It does not read production results.

`oldSelection` reconstructs this promised input through `insertionPlan`. `browserLinkCall('insertLink', ...)` invokes the captured production module inside `page.evaluate`, catches production throws as data, and records the wrapper at `return`. `compare` compares the entire result, including text, caret and both report fields. There is no later state that could hide this call's intermediate output. The instrumentation transport records the same browser invocation back into the pinned gap runner. The preview formulation separately starts from semantic label/URL inputs, calls actual browser insertion, requests actual Worker preview, and records every anchor plus remaining non-anchor text. That second path exposed R1 rather than merely agreeing with source serialization.

The browser source plugin captures the Vite input after oracle-gaps instrumentation and transpiles it into a browser factory. The actual application host delegates helper imports to that installed factory; it does not replace the helper's semantics with a fake. Link helpers have no production imports, so this transport does not silently drop a dependency. No source change in `src/ui/links.ts` existed at review time.

## Grammar reconstruction and controls

All current constructed histories were checked with their arbitrary's `canShrinkWithoutContext`: 25 raw, six canonical-source, five insertion, four toast, and five render histories were admitted. This includes the corrected uppercase `IwAR0x` value, the original www-host/all-trackers witness, exact original no-tracker spelling, original selection/caret inputs, original escaping input, and singular/plural feedback cases.

The raw-string arm admits lexical/parse failures and all bounded UTF-16 strings; the structured arm spends samples around useful URL policy states. URL query multiplicity distinguishes counting occurrences from counting keys; near-miss UTM spellings distinguish ASCII suffix policy from overbroad prefix matching; fragments distinguish query edits from accidental fragment edits. Insertion partitions vary both retained sides and caret/selection. Source grammar varies syntax characters independently of target URL validity. Rendering uses valid structured URLs and excludes inline emphasis/code/HTML rather than asking a plain-label model to interpret those languages. R1 shows that the intended plain-label decomposition still overlooked entity syntax.

Executed nearby exclusion controls: source target length 97, negative toast count, renderer `*x*`, and renderer isolated surrogate were rejected by their respective arbitraries. These controls establish those specific grammar boundaries, not a general proof that every desired distinction has sufficient reach. R2 is a concrete remaining distinction.

## Checklist outcomes

| Requirement | Outcome for this review |
| --- | --- |
| ORC-001 | Authority and limits are present and trace to the recorded approval/preserved tests; R1 requires semantic reconciliation and R3 improves bound precision. No independent evidence here authorizes a new entity-escaping contract. |
| ORC-002 | Model has no production imports. Tracker vocabulary/projection and source character walk are separate formulations from production's regex/deletion structure. WHATWG URL is an explicitly trusted shared base. Renderer expectation is independent of the source serializer. |
| ORC-003 | Opening prose identifies ownership, public calls, promised results, authority, bounds and browser/preview paths. Helpers keep grammar/model separate from registrations/driver/check. R1 creates disagreement between executable literal-label promise and the stated plain-text scope. |
| ORC-004 | Existing witnesses reconstruct; range and semantic contributions are visible; nearby exclusions were checked above. R1 requires an honest entity-syntax treatment, R2 requires angle-class reach, and R3 clarifies units. No grammar narrowing was performed by this reviewer. |
| ORC-005 | Browser helper path and complete returned result are observed at `return`; actual preview/DOM at `anchor`. Exceptions are captured as public error data for helper calls. Receiving clipboard, keyboard-placeholder and React toast claims are explicitly outside these helper properties; this review does not establish them. |
| ORC-006 | Six plausible corrupted-trace calibrations are registered, one per property. Their successful execution and production mutant outcomes were not yet available in a completed valid baseline at the review freeze. Initial registration failure is setup, not RED or a kill. Require the new run receipts before closure claims. |
| ORC-007 | Shared histories specify runs100 and seed20261118; registered framework supplies matching random campaign/replay. Rendering starts at runs25 for both modes; no earlier rendering budget is being lowered by this addition. Actual campaign results remain pending. |
| ORC-008 | Not applicable: these link properties are stateless input/result functions. Source partitions are input geometry, not a new state machine with equivalent-state claims. |
| ORC-009 | Model input holders (`before`, `picked`, `after`) map directly to source partitions/range. Raw lexical acceptance and parse-valid cleaned results are deliberately distinguished. No ambiguous new production-domain concept was found. |
| ORC-010 | Existing browser connection is released in `afterAll`; disposable application runner cleans up; framework owns shrink-failure fidelity. Probe setup errors retained separate diagnoses and successful probe resources were released. An independent failure-path stress audit of the shared transport was not performed here. |
| ORC-011 | Source escaping and semantic preview are meaningfully different formulations. The latter found the named-entity contradiction in R1. Preview expected labels need a semantic formulation rather than a shared literal-source assumption. |
| ORC-012 | This versioned review records all requirements and the reviewed uncommitted blobs. No bug-class closure is claimed. Mutation and completed campaign receipts remain a separate required evidence set. |
| ORC-013 | Original policy boundaries include tracker near misses, duplicates, lexical-but-invalid URLs, no trackers vs trackers, empty vs selected label, singular vs plural, and label escaping. R2 names a missing wrong-boundary witness; R1 identifies an unhandled legal syntax boundary. |
| ORC-014 | Helper properties are explicitly limited to helper returns. Renderer uses actual Worker preview and an actual browser DOM; its fragment-only boundary is explicit. No clipboard/OS/React-delivery handoff is claimed here. A receiving-path audit is still needed for those separate user workflows before their old tests are removed. |
| ORC-015 | Required states are built from constructed inputs, and all constructions are admissible. Semantic state predicates cover useful URL and insertion boundaries. R2's `encodedDestination` is too coarse to require angle encoding; R1 needs explicit entity/near-miss reach after law reconciliation. Runtime reach counts await the valid campaign. |
| ORC-016 | All six registrations use `oracleProperty`; companion module contains generators/models, not ordinary tests. Constructed histories provide inputs to shared models/checks rather than their own fixed expected assertions. No ordinary tests disguised as oracles were found. |

## Process and remaining evidence

The installed design skill triggers its design grammar card when a boundary has more than five laws or a model has more than one branch per law. The existing approved F2 artifacts justify the source/model/renderer separation and explicitly distinguish incomplete placeholders from completed links. They do not yet record this new six-property completed-link decomposition. I asked the author whether a link-specific card exists; at this review freeze that answer is pending. Record the applicable trigger/card/approval receipt rather than inferring that an earlier generic refactor card automatically satisfies a later boundary expansion.

The first `links-initial-red` report failed registration because `allTrackers` contained a value the old arbitrary could not reconstruct. The author corrected its alphabet without modifying production. That old report is not product RED and its blocked mutant is not a kill. This reviewer verified the repaired constructions, but did not receive a completed replacement registered-run report before writing this record. Production should remain unchanged until the intended defect has a real registered RED and R1's expectation is reconciled.

No finding in this report retires a law, silently excludes a legal history, accepts a survivor, or certifies the whole completed-link/paste/keyboard workflow. In particular, helper-level coverage does not replace the separate requested loss audit against the clipboard/paste receiving tests.

## Rereview addendum — repaired model and exact entity vocabulary

2026-11-18. Requested read-only rereview of the repaired implementation and `link-design-grammar.md`; no full campaign was run by this reviewer. Final reviewed blobs:

| File | Blob |
| --- | --- |
| `test-ui/editor-links.oracle.test.ts` | `78a1e7685a991ebd7c3d2ca7c0ce05e226192ddb` |
| `test-ui/editor-oracles/link-model-oracle.ts` | `e83fd6720934f89c6ffc2e533986e2af9bd50644` |
| `test-ui/editor-oracles/html-entities-oracle.ts` | `d488022ce94d960f58c73f5a3b06e427c5a73568` |
| `docs/editor-oracle-design/link-design-grammar.md` | `b8196b76117c7f787195c8d69089578b891e5cce` |

### Verdict after repairs

Accept the reviewed model/design repairs. No remaining independence, grammar-narrowing, or model-suitability blocker was found in these changes. This accepts the implementations addressing R1–R3 and the additional R4 below; it is not a claim that blocked authored mutants have been killed. The author will rerun the final oracle on unchanged production before fixing it, then gather GREEN and mutation receipts. Receiving-path losses remain a separate work item.

R1's semantic correction is appropriate under the preserved Markdown source contract. Keeping `[&amp;](url)` as the canonical source and predicting `&` as its displayed label follows CommonMark 0.31.2 §6.2. It avoids introducing a new product rule that escapes ampersands. The rendered-label alphabet is unchanged: entity-looking labels remain legal rather than being filtered. The source helper still judges arbitrary bounded UTF-16, and the rendering restriction on numeric references is unchanged because `#` was already outside that alphabet.

The reference projection is independent. `renderPlan` identifies complete named-reference syntax and exact membership using CPython reference data; native HTML decoding supplies values before `insertLink` or preview is called. `labelInput` records that reference input. The pure model reads this independently projected input and the original plan, never an insertion or preview output. This conforms to the glossary and ORC-002; it does not become production-output matching merely because a host API supplies a trusted reference value. The production MarkdownIt/entities decoder is not imported by the oracle model.

R2 is repaired in the source grammar: `targetAngles`, `targetParentheses`, and `targetWhitespace` are distinct declared states, with selected and autolink angle constructions. `links-unencoded-angles` removes only angle encoding, separately from the broad destination challenge. The omitted-label call shape and complete-insertion-result feedback path also now have constructed histories and targeted authored mutants. These are meaningful public-call distinctions. Their authored mutants are still execution-pending, not certified kills.

R3 is repaired by describing 32 generated symbols and up to 64 UTF-16 units. The larger admitted domain was preserved. The design grammar now records the actual triggers, decomposition, independent reference, alternatives, bounds and preservation relation. It supplies the design rationale missing from the first review freeze rather than claiming that the earlier generic F2 card proved every later completed-link decision.

### R4 discovered and repaired during this rereview

The first R1 repair tokenized `&[A-Za-z][A-Za-z0-9]{1,31};` and sent every syntactically complete candidate to a native textarea. That was insufficient: HTML can partially decode an unknown name using a legacy prefix. Both `&copyx;` and `&notit;` are legal renderer inputs. Actual Chromium reference decoding produced `©x;` and `¬it;`, while actual unchanged Worker preview preserved anchor labels `&copyx;` and `&notit;`. The valid nearby name `&notin;` decoded to `∉` on both paths. These were read-only production/host probes, not registered oracle RED or mutation-kill receipts.

An attribute-context alternative was investigated rather than assumed. On the installed Chromium revision1254 (`HeadlessChrome/158.0.8127.18`), a standalone blank-page probe of exact source `<i data-input="&copyx;"></i>` also yielded `©x;` through both native `innerHTML` and `DOMParser(..., 'text/html')`; `&notit;` similarly yielded `¬it;`. No app or helper script was loaded, and `document.createElement` reported native code. This host observation is surprising relative to the expected HTML ambiguous-ampersand rule, so attribute context was not accepted as a reference strategy.

The final repair gates native decoding on an exact independent name set. I generated a separate reference map from this machine's CPython3.14.7 stdlib `html.entities.html5`, retaining its 2,125 semicolon-complete names. A read-only host probe decoded every complete name through native Chromium and compared it with the CPython value: zero mismatches. Exact membership plus native decoding preserved `&copyx;`, `&notit;`, and `&unknown;`, while decoding `&amp;` to `&` and `&notin;` to `∉`.

I then compared the committed-candidate names-only fixture with that independently generated CPython map: count2,125, no missing names, and no extra names. `renderPlan` now sets `entity: true` only for exact members. Unknown names get `entity: false` and pass through literally. Unknown-prefix constructions `&copyx;`, `&ampx;`, and `&notit;` plus valid `&notin;` exercise the nearby distinction; `unknownCharacterReference` is a separately required state. This repairs R4 without narrowing the label grammar or sharing production decoder machinery.

### Updated evidence and checklist disposition

All final constructions were admitted by their corresponding arbitrary: 25 raw, nine source, 30 insertion, six feedback, and 14 rendering histories. This includes every original construction and all new review controls. No filter, skip, budget reduction, or retained survivor was introduced by these repairs.

The earlier registered unchanged-production report `build/formatting-oracles/links-reviewed-red`, run `005ccf99822c`, contains 335 passes and 16 failures, with no skips or nondeterministic rows. Its first failure is a real `editor-url-cleaning` violation at `return`, under `tracker projection`, beginning with `fragmentQuestionAtEnd` and shrinking to `{"raw":"http://&?ref#?"}`. Observed cleaning lost the fragment's `?`; expected cleaning preserved it. This is product RED, unlike the initial registration failure. The report's nine authored mutants were blocked by that baseline, so none is a kill. It also predates the final R4 vocabulary repair; a rerun of the final candidate is still required before citing that candidate's execution receipts.

ORC-001/003 now describe the intended CommonMark semantic projection and actual bounds. ORC-002/011 retain independent judgment through the exact CPython vocabulary and native reference values. ORC-004/013/015 gain the angle, omitted-argument, full-result and entity-prefix distinctions with no domain reduction. ORC-005 still observes full helper results and the actual anchor DOM at the promised checkpoints. ORC-006 mutation receipts remain pending beyond the prior report's demonstrated real baseline violation; no blocked mutant is treated as rejected. ORC-007/009/010/014/016 retain the first review's disposition; ORC-008 remains inapplicable because these are stateless input/result models. This versioned addendum provides the updated ORC-012 review record and preserves the original findings and evidence history.
