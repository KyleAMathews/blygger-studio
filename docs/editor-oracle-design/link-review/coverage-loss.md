# Completed-link coverage and loss review

Independent review by `/root/audit_completed_link_coverage`, 2026-11-18. This is a source and input/model reconstruction review, not a claim that the new campaigns or production mutants have passed. Read the installed `oracles-review` skill, full checklist v1 and glossary; reread the checklist/glossary after handoff.

The final addendum at the end accepts the helper-test replacement, after repaired LC-001/002/004/005 implementations and complete link campaign evidence. LC-003 remains the separate retained app-receiving backlog. Earlier findings and fingerprints remain the historical review record.

Reviewed base: `28b0c8d642a87e5810ad6eabd95c2d1714c53396`; installed package pin `97a4e7a`. Production `src/ui/links.ts` was unchanged during this review. No production, oracle, or retained test source was edited by this reviewer.

## Verdict and findings

**Keep both retained test sources for now.** The new six properties reconstruct the scalar expected values of all 21 retained helper assertions (22 atomic observations when the two fields in `toMatchObject` are counted separately), but omit two old call paths. The six properties explicitly do not replace the clipboard/paste receiving scenarios. Mutation calibration/closure and a completed-link design-grammar record are still required before a completion claim.

### LC-001 [P2]: An omitted optional label has become an explicit empty label

- **Challenged claim:** “Histories include all original helper inputs” in `editor-links.oracle.test.ts:30–31`, and lossless replacement of `links.test.ts:32`.
- **Authority:** The approved preservation of the retained helper behavior; ORC-004 reconstruction and ORC-005 production path (checklist v1).
- **Smallest witness:** `linkMarkdown('https://example.com/a')`, with no second argument. Original assertion expects `<https://example.com/a>`.
- **Evidence, read from source:** The new `markdownArbitrary` always supplies a `label` string, and its driver always calls `browserLinkCall('linkMarkdown', [h.target, h.label])`. `insertLink` also always passes an explicit selection. Consequently changing production's default `selection = ''` to `selection = 'x'` leaves every new call unchanged but breaks the retained omitted-argument assertion. The `autolink` constructed history supplies `''`, so it does not repair this path loss.
- **Repair:** Add the optional-argument call shape as a grammar axis with a constructed omitted-label history, keeping the same independent Markdown model, browser driver and check. Challenge the default-value branch. Do not add an ordinary concrete unit test.

### LC-002 [P2]: Actual insertion results are not passed to feedback

- **Challenged claim:** Lossless replacement of `links.test.ts:44,47`.
- **Authority:** The same preservation decision; ORC-004/005 (checklist v1).
- **Smallest witness:** `linkToast(insertLink('Read the essay today.', 5, 14, 'https://example.com/e?utm_source=x&fbclid=y')!)`. The argument has `text`, `caret`, `removed` and `linked`; the expected feedback is `linked selection · 2 trackers removed`.
- **Evidence, read from source:** New insertion checks observe the returned fields; new feedback checks supply a different object with only `removed` and `linked`. Thus the scalar expectations compose mathematically, but the original object/call shape is never executed. A wrong branch that changes feedback when `'text' in result` would evade the new feedback grammar and break the retained selected-result assertion. The old autolink feedback call likewise receives a full insertion result.
- **Repair:** Include an insertion-result feedback route, preferably as a history arm of the existing feedback property. Run the actual insertion then pass its returned object to actual feedback; record both checkpoints, and derive both expected observations independently from the plan. Preserve direct feedback generation for the full 0–32 count range.

### LC-003 [P2]: Completed-link receiving coverage is still pending

- **Challenged claim:** Any claim that these six helper properties complete T1 or permit removal of the clipboard/paste scenarios at `e2e/compose-pwa.spec.ts:145–185`.
- **Authority:** The approved completed-link backlog plus its requirement to preserve the browser observations; ORC-005/014 (checklist v1).
- **Witnesses and evidence:** The receiving inventory below is read directly from the retained browser source. The new helpers execute production in a real browser, but call it directly. They do not click the clipboard button, receive a URL sheet, observe visible feedback, observe paste default prevention, or preserve source while opening the full editor. The existing session paste journey uses one fixed URL and records source only; it does not replace these observations.
- **Repair:** Migrate the observations into registered generated receiving oracle routes before removing those two scenarios. Keep other unrelated tests in `compose-pwa.spec.ts`.

### LC-004 [P2, process evidence]: Record the completed-link design-grammar delta

- **Challenged claim:** Fully reviewed completion of this new model/law boundary.
- **Authority:** `oracles-design` §1; ORC-004/012 (checklist v1).
- **Evidence, read from source:** Six properties now own the completed-link boundary; cleaning, Markdown and insertion models also contain multiple semantic branches. Both the more-than-five-laws and multiple-branches triggers apply. The existing `model.md`, `process.md` and `evidence.md` describe the earlier formatting extraction and do not yet account for the six new completed-link properties. No completed-link design-grammar result or trigger disposition was found in the reviewed snapshot.
- **Repair:** Preserve a completed-link design delta, its adopted authority and grammar controls, with the review/run results tied to source fingerprints. If this evidence exists outside the inspected files, link it and reevaluate this finding; do not invent a second approval requirement when the existing user approval already covers the design.

## Rebuilt observation and execution limits

Without using production to derive an answer, reconstruct the old all-tracker case: 15 query entries belong to the adopted tracker vocabulary; `id=7` and `page=2` do not. Keeping those entries in original order predicts `{url:'https://www.example.com/essays/maintenance?id=7&page=2', removed:15}`. The new `cleaned` model obtains exactly this result by projecting independently classified entries. The raw history `oldAllTrackers` retains the exact original host, path, keys and parameter values. The browser driver calls `cleanUrl(raw)` and `compare` checks the complete returned wrapper at checkpoint `return`.

Executed a pure input/model reconstruction command (not a registered oracle run and not a mutant kill): all **45** constructed values are admitted by their arbitraries: raw 25, Markdown 6, insertion 5, feedback 4 and rendered link 5. Reconstructed all-tracker, fragment, uppercase tracker, untouched raw spelling, escaping, selected insertion, bare insertion and invalid insertion predictions; they match the retained scalar expected answers. The selected insertion caret is 39; the bare insertion caret is 26 (the latter is additional protection).

Executed exclusion controls via `canShrinkWithoutContext`: raw length 513, label length 65, target length 97, selected length 65, counts -1/0.5/33, and a purported reversed-range insertion plan were all rejected. A reversed range is unrepresentable in the source-partition grammar. Invalid URL strings remain legal inputs because the law owes rejection of them; they are not invalid histories to filter out.

Inspected the initial `links-initial-red` artifact. Run `b86eb4f187b0` failed to load because the original `allTrackers` value alphabet did not admit `IwAR0x`; its one selected mutant was blocked. **This is setup failure, not RED and not a kill.** The alphabet has since widened, and the independent membership check above uses that repaired grammar. A new unchanged-production campaign belongs in the author's final evidence. No production fix or closure claim is established by this review.

## Exact retained helper inventory

These are source assertions, not new fixed expected answers embedded in an oracle. IDs H1–H21 correspond to the 21 top-level `expect` calls in the retained file. “Constructed” means an exact value is present in the shared grammar and confirmed admitted; execution of a campaign is separate evidence.

Define the exact long input `A` as:

```text
https://www.example.com/essays/maintenance?id=7&utm_source=newsletter&utm_medium=email&fbclid=IwAR0x&gclid=a&dclid=b&msclkid=c&mc_cid=d&mc_eid=e&igshid=f&si=g&ref_src=h&ref=i&_hsenc=j&_hsmi=k&mkt_tok=l&page=2
```

Define `S = insertLink('Read the essay today.',5,14,'https://example.com/e?utm_source=x&fbclid=y')` and `B = insertLink('See ',4,4,'https://example.com/')`. Those calls are exact original inputs. In code-form observations below, a backslash before a bracket denotes one actual Markdown backslash.

| ID / old line | Exact call/input | Original public observation | New registered route / exact constructed membership | Loss |
|---|---|---|---|---|
| H1 / 7 | `cleanUrl(A)` | URL `https://www.example.com/essays/maintenance?id=7&page=2`, removed 15 | `editor-url-cleaning` → `rawCases.oldAllTrackers` → `rawText` → `cleaned`; constructed, admitted | None in scalar/path reconstruction |
| H2 / 11 | `cleanUrl('https://example.com/a?utm_source=x#part')` | `{url:'https://example.com/a#part',removed:1}` | Same route, `trackerFragment`; constructed, admitted | None |
| H3 / 12 | `cleanUrl('https://example.com/a?UTM_Campaign=x')` | `{url:'https://example.com/a',removed:1}` | Same route, `trackerOnly`; constructed, admitted | None |
| H4 / 17 | `cleanUrl('  https://example.com/a%20b?q=one+two&ref_id=3\n')` (newline is actual input) | Exact trimmed raw spelling, removed 0 | Same route, `untouched`; constructed, admitted | None |
| H5 / 21 | `isUrl(' https://example.com/x ')` | `true` | `editor-url-recognition` → `rawCases.https` → `recognized`; constructed, admitted | None |
| H6 / 22 | `isUrl('http://example.com')` | `true` | Same route, `http`; constructed, admitted | None |
| H7 / 23 | `isUrl('see https://example.com')` | `false` | Same route, `prose`; constructed, admitted | None |
| H8 / 24 | `isUrl('ftp://example.com')` | `false` | Same route, `ftp`; constructed, admitted | None |
| H9 / 25 | `isUrl('javascript:alert(1)')` | `false` | Same route, `javascript`; constructed, admitted | None |
| H10 / 26 | `cleanUrl('not a url')` | `null` | `editor-url-cleaning`, `invalid`; constructed, admitted | None |
| H11 / 27 | `cleanUrl('https://exa mple.com')` | `null` | Same route, `internalSpace`; constructed, admitted | None |
| H12 / 31 | `linkMarkdown('https://example.com/a','the essay')` | `[the essay](https://example.com/a)` | `editor-link-markdown` → `markdownCases.selected` → `markdown`; constructed, admitted | None |
| H13 / 32 | `linkMarkdown('https://example.com/a')` | `<https://example.com/a>` | `markdownCases.autolink` has same scalar target/empty-label answer, but driver supplies explicit second argument | **LC-001 omitted-argument loss** |
| H14 / 34 | `linkMarkdown('https://en.wikipedia.org/wiki/Foo_(bar)','a [b]')` | `[a \[b\]](https://en.wikipedia.org/wiki/Foo_%28bar%29)` | Same route, `oldEscaping`; constructed, admitted | None |
| H15 / 41 | `S.text` | `Read [the essay](https://example.com/e) today.` | `editor-link-insertion` → `insertionCases.oldSelection` → `insertionPlan` → `insertionModel`; complete returned object at `return`; constructed, admitted | None |
| H16 / 42 | `S.caret` | Length of `Read [the essay](https://example.com/e)` = 39 | Same exact route and object | None |
| H17 / 43 | `S` | `removed:2` **and** `linked:true` | Same exact route and object; two atomic fields | None |
| H18 / 44 | `linkToast(S!)` | `linked selection · 2 trackers removed` | `editor-link-feedback` → `toastCases.many` predicts same scalar string; its argument is `{removed:2,linked:true}` | **LC-002 full-result composition loss** |
| H19 / 46 | `B.text` | `See <https://example.com/>` | `editor-link-insertion`, `oldAutolink`; constructed, admitted | None |
| H20 / 47 | `linkToast(B!)` | `inserted link` | `editor-link-feedback`, `none` predicts same scalar string; its argument is `{removed:0,linked:false}` | **LC-002 full-result composition loss** |
| H21 / 48 | `insertLink('x',0,1,'nope')` | `null` | `editor-link-insertion`, `oldInvalid`; constructed, admitted | None |

All five direct helper properties compare the whole browser return wrapper with `{value:expected}`. An exception wrapper does not silently become `null` or a valid return. Thus field omission, extra returned fields, wrong source, wrong caret/count/kind and unexpected throws are distinguishable in these routes.

## Separate browser receiving inventory still unreplaced

The following are original observations, with original setup and checkpoints. They must remain visible in a future registered receiving oracle; the six helper properties do not claim them. Source intervals refer to the reviewed `compose-pwa.spec.ts` snapshot.

| ID / source | Exact controlled premise and action | Public observation at original checkpoint | Current status |
|---|---|---|---|
| C1 / 145–152 | Composer `Read the essay today.`; clipboard `https://www.example.com/essay?id=7&utm_source=newsletter&fbclid=IwAR0x`; select `the essay`; click `[data-action="link-clipboard"]` | Composer source `Read [the essay](https://www.example.com/essay?id=7) today.` | Helper semantics modeled; clipboard/button/React receipt not replaced |
| C2 / 153 | Same operation | Visible `.toast` exactly `linked selection · 2 trackers removed` | String helper covered; visible delivery not replaced |
| C3 / 155–158 | Clipboard `just some words`; collapse composer selection at end; click clipboard button | URL sheet identified as `link from clipboard`, accepts `https://example.org/p?gclid=1` | No replacement sheet/fallback route |
| C4 / 159 | Confirm that sheet | Composer source `Read [the essay](https://www.example.com/essay?id=7) today.<https://example.org/p>` | Empty-selection helper covered; this receiving history not replaced |
| P1 / 162–174 | Composer `see this page`; select `this page`; synthetic text/plain paste `https://example.com/p?utm_medium=x` | `dispatchEvent` returns **false** (default prevented), then source `see [this page](https://example.com/p)` | Existing session paste checks only its own one-URL source history; this event/default/source pair not replaced |
| P2 / 176–177 | Collapse selection at 0; paste `https://example.com/q` | `dispatchEvent` returns **true** (default left to browser) | No replacement no-selection/default-prevention observation |
| P3 / 178–179 | Select `see`; paste `not a url` | `dispatchEvent` returns **true** | No replacement non-URL/default-prevention observation |
| P4 / 180–182 | Click `#composer-full` after those paste attempts | Loaded `#md-input` retains exactly `see [this page](https://example.com/p)` | No replacement for this same-history source transfer |
| P5 / 183–185 | Full editor selects `see`; paste `https://example.net/` | `dispatchEvent` returns **false**, then source `[see](https://example.net/) [this page](https://example.com/p)` | No replacement full-editor event/receipt history |

This inventory claims preservation of the synthetic DOM-paste premise and controlled clipboard setup that the original scenarios supplied. It does not promote them to evidence of every OS permission or native clipboard implementation.

## Authored challenges and instrumentation

Read all six new `links-*.json` challenges. They patch `src/ui/links.ts`, have a clear exact target, and describe a wrong design. These are **planned distinguishing routes**, not executed kills in this report:

| Challenge | Intended comparison/witness |
|---|---|
| `links-recognition-refusal` | `editor-url-recognition`, constructed `https`, true vs false at `return` |
| `links-drop-page-selector` | `editor-url-cleaning`, `allTrackers` or exact `oldAllTrackers`, retained `id=7` at `return` |
| `links-unescaped-label` | `editor-link-markdown`, `oldEscaping`/`backslash`, exact canonical source; rendered brackets offer a different formulation |
| `links-unencoded-destination` | `editor-link-markdown`, `oldEscaping`/`whitespace`, canonical percent escapes; rendered destination supplies semantic corroboration |
| `links-caret-before-insertion` | `editor-link-insertion`, `oldSelection`, caret 39 vs prefix length 5 |
| `links-wrong-feedback-kind` | `editor-link-feedback`, `many` or `none`, selected/autolink text at `return` |

None currently challenges the omitted-default or insertion-result feedback loss above. Add those call shapes before claiming the helper replacement is complete.

The browser-source plugin now captures exact transformed `links.ts` as well as formatting source; it does not derive expected values. Browser installation evaluates both captured modules under the same instrumentation record, and the new third `browserRun` argument supplies actual link exports. `browserLinkCall` invokes named actual exports in browser context; its try/catch records production throws as data. `captureBrowserCalls` replays the browser instrumentation packet into the pinned runner; each helper call is captured before a later preview/browser call installs another module instance. The disposable application's new link delegation points SPA imports at that same captured module. Source review found no new direct-Node SUT fallback in these extensions.

The rendered-link route inserts via the actual browser helper, calls the actual Worker fragment preview, parses the returned HTML in browser DOM and observes all anchors plus non-anchor text. It is a second formulation for label parsing and Markdown structure. `semanticHref` intentionally identifies literal/percent-escaped parentheses, so this is not a byte-exact URL spelling oracle; canonical source comparisons remain exact. Labels with inline Markdown/HTML, malformed surrogates, OS clipboard receipt and keyboard-placeholder completion are explicitly outside this rendering claim. Autolink rendering is also not established by this selected-label rendering property; its source spelling is covered separately.

## Grammar controls and checklist disposition

Grammar ablations have concrete consequences: dropping protocol case loses uppercase URL recognition; dropping raw UTF-16 loses malformed/lexical-invalid inputs; dropping structured query entries loses efficient tracker duplicates/order/page-parameter variation; dropping fragments loses the pending fragment-question witness; dropping source partitions loses outside preservation and caret geometry; dropping empty selected text loses autolinks; dropping `removed` 0/1/many loses feedback omission/singular/plural; dropping label punctuation loses the escaping distinction. The missing optional-label and result-object call shapes are LC-001/002. Bounds and tested exclusions are recorded above. Structured URL units can include a two-code-unit emoji, so `maxLength` for that custom unit counts generated units rather than uniformly counting UTF-16 units; describe those rendering bounds precisely in final prose.

| Requirement (checklist v1) | Outcome at reviewed snapshot |
|---|---|
| ORC-001 authority/limits | Adopted preservation authority with name/login/date/base is present. Helper vs rendered vs receiving limits are explicit. Completion must not overstate receiving evidence. |
| ORC-002 independence | No production imports in semantic link model. ASCII tracker vocabulary/classifier and kept-entry projection are separate from production regex/delete loop; WHATWG URL is an explicit trusted base. Serializer uses syntax-level loops rather than production replacements. Model reuse is not independent corroboration; renderer is the second formulation. |
| ORC-003 literate separation | Law prose, grammar, model, browser path, observations and checks distinguishable. Update “all original helper inputs” after resolving LC-001/002; current phrase is too broad. |
| ORC-004 grammar controls | Exact scalar reconstruction and membership/exclusions executed as above. LC-001/002 are gaps. Record completed-link design delta (LC-004). |
| ORC-005 production/observation | Browser helper return and rendered anchor checkpoints inspect actual paths. Missing optional/composed/receiving paths are LC-001–003. |
| ORC-006 calibration | Each property has a named plausible corruption. Six authored challenges inspected. Their execution/kills remain pending; initial blocked run is setup failure. |
| ORC-007 campaigns/replay | Registered `oracleProperty` and shared `histories` request fixed seed 20261118 plus framework random campaign. Budget 100 for five helper properties; rendering explicitly 25. No earlier completed-link budget was lowered. Actual campaign evidence pending. |
| ORC-008 state minimality | N/A: these six models are single-call/stateless, with no modeled state equivalence or continuation to merge/split. Source partitions and flags are inputs/observations. |
| ORC-009 vocabulary | `raw`/structured URL and insertion partitions are unambiguous holders. Selected-label vs autolink and source vs rendered observations map explicitly to production. No new model-only production concept found. |
| ORC-010 fidelity/cleanup | Source review: exceptions are wrapper data at helper checkpoints; browser/application cleanup exists and aggregate setup/cleanup failures retain diagnostics. No resource/failure injection run claimed. |
| ORC-011 second formulation | Actual preview/browser anchor law usefully challenges shared serializer/parser mistakes. URL host parsing remains the declared trusted base; source exactness is separate from normalized parenthesis target equality. |
| ORC-012 review evidence | This versioned report is tied to base plus the fingerprints below. Closure is pending findings, actual campaign/mutation results, and final accepted source fingerprints. |
| ORC-013 boundaries | Constructed witnesses cover accepted/rejected schemes, lexical-but-invalid URLs, tracker/nontracker and near-miss keys, duplicate counts, empty/nonempty labels and feedback counts 0/1/2. Execution pending. Omitted-argument boundary missing (LC-001). |
| ORC-014 handoff | Helpers explicitly disclaim app/clipboard receipt. Fragment preview uses the actual Worker then browser DOM. The broader approved receiving migration remains unresolved (LC-003); no limit closes that backlog. |
| ORC-015 reach | Declared states come from semantic predicates and all 45 constructed histories are admitted. Registered execution must report actual per-campaign state counts. Current input predicates do not establish React/clipboard receiving states. |
| ORC-016 law-only files | New oracle/model files contain registered properties plus shared model/driver/check machinery and constructed input values, without ordinary unit assertions. Retained old tests remain outside these oracle files until migration is proven. |

## Reviewed source fingerprints

SHA-256 at the audited snapshot; subsequent author edits require an addendum or rereview rather than silently treating this as the new source.

```text
7f7fcacda64fb3b040e81d0d2c135064f4e9749d9f83631b0fead4b6ebd8df21 src/ui/links.ts
9e80ad513a6432b5969ccaf1b17e80596a2cd975b54754ae86ce3690b1ba93c0 test-ui/links.test.ts
fd453bc97469c2f0278bb4cc35cfb17aa2eebdb21560c7af5038cc426962e285 e2e/compose-pwa.spec.ts
34a4af13a15920f7dfc4d432a14c72f07bce8dda9458229c93795fc01a1a3718 test-ui/editor-links.oracle.test.ts
dd7e95d9210db25913a69b9a8ede43b4d80e314c7ab768bbe9861873eaedd65b test-ui/editor-oracles/link-model-oracle.ts
321a0309e2b32aa4ffa3d7701e55adbaf5e0fd19919c628f68dc01eec4a59c77 test-ui/editor-oracles/browser-source-oracle.ts
fee7cca7f2efdf67fa0b2a9d465b22d6418be1d58c6a3a9723ae975084af145b test-ui/editor-oracles/browser-driver-oracle.ts
a696ba48840ef2cdc9321963c2055910cc4d3b358d95d664ee7fefad4db7d8ab scripts/formatting-oracle-application.ts
0feaf68f3b9f25ad3f662ea5d86e7dbcec8dd29d0daccdd55ee10f910797ba65 scripts/formatting-oracles.ts
```

## Follow-up: call-shape repairs accepted; entity premise still faulty

Read the revised link registration/model, all three new authored challenges, `link-design-grammar.md`, and the valid unchanged-production RED report `links-reviewed-red` (run `005ccf99822c`). Retained helper and browser tests remain present. Production link source retains the original hash.

- **LC-001 implementation accepted.** `markdownArbitrary` now includes optional `omitted`; `markdownCases.omittedLabel` reconstructs the exact one-argument call. The driver supplies `[h.target]` for that arm, and the independent model supplies the default empty-label answer. `markdownStates` declares `omittedLabel`. `links-omitted-label` changes the production default to `link`, the intended distinguishing wrong design. Its registered mutant result is still blocked by RED, so this accepts the implementation repair rather than claiming a kill.
- **LC-002 implementation accepted.** Feedback now has a composition history arm that calls actual `insertLink`, records its complete result, and passes its complete serialized object to actual browser `linkToast`. Both exact original insertion calls and expected feedback strings were reconstructed independently: selected call `(text='Read the essay today.',from=5,to=14,raw='https://example.com/e?utm_source=x&fbclid=y')`, and bare call `(text='See ',from=4,to=4,raw='https://example.com/')`. Expected feedback is still derived from input/model flags. `insertedResult` is a declared state. `links-full-result-feedback` rejects objects containing `text`, the distinguishing wrong design. Its execution result remains pending. The diagnostic `insertion` observation is not itself compared by this feedback check; complete insertion correctness continues to belong to the insertion property, while this property checks feedback at `return`.
- **LC-004 design-evidence gap accepted as repaired.** `link-design-grammar.md` explicitly names triggers, authority, parts, ablations, bounds, adjacent designs, exclusions, the call-shape repairs, the rendering-model correction and the no-deletion execution gate. It preserves every prior history and budget. This is a design record, not a campaign receipt. Its claim that candidate tokenization prevents permissive HTML decoding is contradicted by LC-005 below and needs correction alongside that repair.
- **LC-003 remains open and correctly retained.** The design record and new oracle limits explicitly retain the clipboard/sheet/paste receiving scenarios until registered app histories preserve them. Their retained source should remain untouched.

Executed the revised membership/model preflight independently: **80** constructions are admitted (25 raw, 9 source, 30 insertion, 6 feedback, 10 rendered). All original raw URL states are now constructed through insertion. The separate angle-encoding histories and `links-unencoded-angles` challenge usefully distinguish an encoder that handles parentheses/whitespace but omits angles. No new ordinary test was added to an oracle file.

The unchanged-production RED is valid evidence of fragment-preservation failure: baseline 335 passed, 16 failed, 0 skipped, no nondeterministic tests. It reports an `OracleViolation` at `return` under `tracker projection`, including shrunk input `http://&?ref#?`, whose fragment loses `?`. The nine authored mutants are blocked by failing baseline, so they are neither kills nor survivors. This corrects the earlier setup-only artifact without conflating the two.

### LC-005 [P2]: HTML's legacy partial named-reference decoding is still a wrong model premise

- **Challenged claim:** `renderPlan` plus the browser textarea decoder independently predicts CommonMark named-character-reference semantics, and the strict complete-token regex prevents HTML's no-semicolon behavior (`link-design-grammar.md`, “Parts, rules and distinguishing inputs”; rendering law in `editor-links.oracle.test.ts`).
- **Authority:** CommonMark 0.31.2 §6.2 requires an exact named reference ending with a semicolon; unknown names remain literal. ORC-002/004/011/013 (checklist v1).
- **Small legal witnesses:** `&notit;`, `&copyx;` and `&ampx;` are all labels admitted by the existing render alphabet and bounds. Each has a legacy valid HTML name as a prefix but is not itself a named character reference. For example, CommonMark's label for `&ampx;` is literal `&ampx;`, while the new input projection produces `&x;`.
- **Executed probe:** Using a local Chromium headless browser, ran exactly the new `renderPlan` parts and textarea `innerHTML` projection. Separately fed the same labels through actual `insertLink` and actual `renderMarkdown`, then parsed that HTML in the same browser to read its anchor text. Results:

| Selected source label | Current model input projection | Actual rendered anchor label |
|---|---|---|
| `&notit;` | `¬it;` | `&notit;` |
| `&copyx;` | `©x;` | `&copyx;` |
| `&ampx;` | `&x;` | `&ampx;` |
| `&unknown;` (current construction) | `&unknown;` | `&unknown;` |
| `&amp;` (current construction) | `&` | `&` |

This was a focused probe, not a registered oracle run or a mutant kill. Browser setup first failed because the default revision was absent, then sandboxed Chromium startup was denied by the OS; the successful probe used an installed Chromium executable outside that sandbox. No source was changed to obtain the observation.

- **Why existing cases miss it:** `unknownEntity` uses `&unknown;`, whose prefix is not a permissively decoded legacy name. A complete syntactic candidate ending in `;` does not force a textarea's HTML parser to consume that entire candidate: it may consume a shorter valid prefix such as `&amp` and leave `x;` literal.
- **Repair:** Keep these labels in the grammar. Make the trusted projection require exact entity-name membership. An independent browser attribute-context decode is a plausible small formulation because HTML suppresses legacy no-semicolon consumption before following alphanumeric characters there; verify that premise with known, unknown-prefix and unterminated controls before adopting it. Alternatively use an independently justified exact named-entity table. Construct this semantic boundary and rerun the same rendering law. Do not align production to the mistaken projection.

The follow-up verdict is **call-shape and design-record repairs accepted; rendering model still requires LC-005 repair and full campaign/mutation receipts**. ORC-001/003/004/005/009/015 are improved by the call-shape changes; ORC-002/011/013 remain challenged specifically by LC-005. ORC-006/007/010/012 need the previously identified final run evidence; ORC-008 remains N/A because these are stateless helper models; ORC-014/016 have no new source finding. No old-test deletion is approved by this source review.

Follow-up SHA-256 snapshot:

```text
7f7fcacda64fb3b040e81d0d2c135064f4e9749d9f83631b0fead4b6ebd8df21 src/ui/links.ts
e34a506606e978d93bb16eb1b230aa3b211e9fc636b4ca03b292ecab31110bd0 test-ui/editor-links.oracle.test.ts
32f9c0a0f563742d9a801988dfd3193748b898914070c7c7a262b02ae988bec4 test-ui/editor-oracles/link-model-oracle.ts
9acc3fc4ac7eb4a904c04396cfb5f83a8f4e7ba4290e131d6e0883ccbd1ab5e5 docs/editor-oracle-design/link-design-grammar.md
```

## Final loss audit: helper-test removal accepted

Final independent review, 2026-11-18, at the fingerprints below. **Removal of only `test-ui/links.test.ts` is supported: all 21 original assertions (22 atomic observations) are preserved through registered generated browser oracle routes, with the same original input-call shapes and promised checkpoints.** This verdict does not cover removing either clipboard/paste scenario in `e2e/compose-pwa.spec.ts`; its hash is unchanged and those observations remain LC-003.

Re-read final registration, model, independent entity-reference data/provenance, design record, production diff, RED/GREEN summaries and raw result records. No implementation files were edited by this reviewer.

### Final call-shape and observation receipt

The original H1–H21 input/output inventory above remains authoritative for the exact preserved observations. The final route check is:

| Original assertions | Exact constructed route | Checkpoint and preservation result |
|---|---|---|
| H1 | `editor-url-cleaning / oldAllTrackers` | Full `{url,removed}` browser return; exact original long `www.example.com` raw input retained |
| H2–H4 | `editor-url-cleaning / trackerFragment`, `trackerOnly`, `untouched` | Full return preserves fragment, uppercase tracker removal and exact trimmed nontracker spelling |
| H5–H9 | `editor-url-recognition / https`, `http`, `prose`, `ftp`, `javascript` | Exact original raw input and boolean at `return` |
| H10–H11 | `editor-url-cleaning / invalid`, `internalSpace` | Exact input and `null` at `return` |
| H12 | `editor-link-markdown / selected` | Same two-argument call; exact selected-label source at `return` |
| H13 | `editor-link-markdown / omittedLabel` | **Same one-argument call**, driver passes `[target]`; exact autolink at `return` |
| H14 | `editor-link-markdown / oldEscaping` | Same two-argument call; exact bracket escaping and parenthesis encoding at `return` |
| H15–H17 | `editor-link-insertion / oldSelection` | Full return checks original text, caret 39, removed 2 and linked true together |
| H18 | `editor-link-feedback / originalSelectedResult` | Same exact insertion call, then actual full returned object supplies browser `linkToast`; expected original string checked at `return` |
| H19 | `editor-link-insertion / oldAutolink` | Same insertion call; exact original autolink text in full return |
| H20 | `editor-link-feedback / originalAutolinkResult` | Same bare insertion call, then actual full returned object supplies browser `linkToast`; `inserted link` checked at `return` |
| H21 | `editor-link-insertion / oldInvalid` | Same invalid-URL insertion call; `null` at `return` |

The browser transport serializes the plain complete insertion result before the feedback call; no object identity was an observation in the original helper tests. Its source/caret/removed/linked fields are preserved, and the complete-result authored challenge below proves the formerly missing call shape now matters. No scalar expectation or original input vanished during the entity-model repair.

Executed final input/model preflight: **84** constructions admitted (25 raw, 9 Markdown source, 30 insertion, 6 feedback, 14 rendered). The exact reference-name set has 2,125 entries, all semicolon-complete; legacy aliases are absent. The three LC-005 unknown-prefix inputs produce `entity:false` parts and therefore remain literal, while nearby valid `&notin;` produces `entity:true`. This repairs LC-005 without narrowing the label alphabet, removing histories, or changing budgets. The independent renderer review additionally records exhaustive reference-table/native-decoder agreement; this reviewer directly verified the gate and controls rather than claiming to have repeated that exhaustive browser probe.

### Before/after and mutation receipt

- Valid final RED: `links-entity-reviewed-red`, run `187fc0939831`, final entity-gated oracle on unchanged production: **347 passed, 16 failed, 0 skipped**. Intended failure is `tracker projection` at `return`, including `fragmentQuestionAtEnd`; no setup/load failure is counted as RED.
- Production diff is exactly the removal of `.replace(/\?(?=#|$)/, '')` after `url.toString()` in `cleanUrl`. Existing query/tracker logic and all other link helpers are unchanged.
- Complete GREEN: `links-reviewed-green`, run `28780c9661d5`: **363 passed, 0 failed, 0 skipped**, repeated unmutated runs in 6.2s and 6.5s, no nondeterministic tests, `provisional:false`.
- **All 61 link-source mutants are `killed`**, each through registered law evidence; no link gaps, runtime-crash substitutes, setup failures, timeouts or survivors. The result record contains 91 rows because the same authored-mutant directory also contributes **30 unrelated formatter-source unowned warnings**. Those 30 are not link kills and this campaign supplies no new formatter closure claim.

All ten authored link challenges are confirmed killed:

| Authored challenge | Registered distinguishing route | Law |
|---|---|---|
| `links-caret-before-insertion` | `editor-link-insertion / oldSelection` | completed link replacement |
| `links-drop-page-selector` | `editor-url-cleaning / allTrackers` | tracker projection |
| `links-fragment-question` (restores original defect exactly) | `editor-url-cleaning / fragmentQuestionAtEnd` | tracker projection |
| `links-full-result-feedback` | `editor-link-feedback / originalSelectedResult` | link feedback |
| `links-omitted-label` | `editor-link-markdown / omittedLabel` | canonical link source |
| `links-recognition-refusal` | `editor-url-recognition / https` | lone URL recognition |
| `links-unencoded-angles` | `editor-link-markdown / selectedAngles` | canonical link source |
| `links-unencoded-destination` | `editor-link-markdown / selectedAngles` | canonical link source |
| `links-unescaped-label` | `editor-link-markdown / oldEscaping` | canonical link source |
| `links-wrong-feedback-kind` | `editor-link-feedback / none` | link feedback |

The fragment repair's evidenced boundary is: adopted fragment preservation × generated raw/structured URLs containing tracker entries and fragment question marks × actual browser `cleanUrl`/insertion calls × exact complete returned URL/source checkpoint. Original `#part?` and nearby `#part?#next`/`#part?next` inputs are constructed. The original destructive implementation is an authored mutant rejected by the intended law. This is a supported repair claim for that boundary, not a claim that every possible completed-link workflow is covered.

### Final checklist disposition

ORC-001/002/003: authority, limits, independent models, corrected exact entity-name trusted base and literate responsibilities accepted. ORC-004: all original helper input-call shapes reconstructed, 84 constructions admitted, bounds/exclusions and design triggers recorded. ORC-005: complete return checkpoints and actual browser source paths verified; independent app receiving remains outside the helper replacement. ORC-006/007: calibrations, fixed/random campaign registration, two clean baselines and 61 reproducible law kills supply execution evidence. ORC-008 remains N/A because these helper models are stateless. ORC-009: no unresolved vocabulary mapping. ORC-010: transport/cleanup source review plus completed nonprovisional campaigns show no new failure-fidelity issue; no destructive cleanup fault injection is claimed. ORC-011: actual Worker preview/browser anchor route and the corrected reference gate preserve the different formulation. ORC-012: final evidence and fingerprints recorded here. ORC-013/015: original and nearby boundary witnesses are constructed and executed successfully, with the former default/full-result gaps distinguished by killed challenges. ORC-014: helper/rendering claims stay at their supplied boundaries and retain LC-003 receiving work. ORC-016: generated/fixed constructions share registered model/driver/check routes; no ordinary unit assertion was introduced into oracle files.

Final status: **LC-001, LC-002, LC-004 and LC-005 closed for this helper replacement. LC-003 remains open with the original browser cases retained. No remaining loss finding prevents removal of `test-ui/links.test.ts` alone.**

### Final reviewed fingerprints

```text
04671ef2fb05ac2363a1b0bd23236914bcbbe49d19b10b506cf6cbbcea14292c src/ui/links.ts
9e80ad513a6432b5969ccaf1b17e80596a2cd975b54754ae86ce3690b1ba93c0 test-ui/links.test.ts (before permitted removal)
fd453bc97469c2f0278bb4cc35cfb17aa2eebdb21560c7af5038cc426962e285 e2e/compose-pwa.spec.ts (retained)
f56d4a94bf28c7c92b81ff592aae512a0866973a9fe4c684b6d2d4e49fa9052c test-ui/editor-links.oracle.test.ts
9af8f1836b794e82d60b3b6bf9e5ff4323e22acf840ac1bbfc522a7a81faa284 test-ui/editor-oracles/link-model-oracle.ts
6de18d08c1f3cb512dd20ba6c76a1791f899932b84efbcc3ea1269cd924e458d test-ui/editor-oracles/html-entities-oracle.ts
b153bc1278e8b0f234982a8a1f7382a58bc7c74d26005d3d619f16866aa00806 docs/editor-oracle-design/link-design-grammar.md
fe21cb81cb4b19f67627306cfe3ab16446f532f9028443f4af064e6b87116b11 build/formatting-oracles/links-reviewed-green/results.json
6c08e1ee200f1b12a80fe4fa9624824efc731eddf9bb2b3c04f0310029172db0 build/formatting-oracles/links-entity-reviewed-red/results.json
```
