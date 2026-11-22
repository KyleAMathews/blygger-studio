# Final frozen clipboard/paste loss audit

This is one Field Lab `loss-audit` pass over only the two specified tests in frozen `old/e2e/compose-pwa.spec.ts:145–186`. Sibling old sources and prior comparison conclusions were not used. The reduction is the frozen `new/` workflow law, model, browser driver, application host, and link model. No browser, oracle, receiver mutation, or application job was run for this audit. Values and checkpoints below are reconstructed from source; they are not execution results. No recommendation about the usefulness or restoration of a recovered fact is made.

The instrument was read in full at `/Users/kyle.mathews/.codex/skills/field-lab/reference/instruments/loss-audit.md`. All source references below are relative to `/private/tmp/blygger-final-editor-loss-audit/`; line numbers refer to that snapshot. `W` means `new/test-ui/editor-workflows.oracle.test.ts`, `M` means `new/test-ui/editor-oracles/workflow-model-oracle.ts`, `D` means `new/test-ui/editor-oracles/workflow-driver-oracle.ts`, `A` means `new/test-ui/editor-oracles/application-driver-oracle.ts`, and `L` means `new/test-ui/editor-oracles/link-model-oracle.ts`.

## Frozen provenance

SHA-256 of `manifest.json`: `2ff1049a6a0264ab21aa8f82470caaa57bf4bcab9bda7cfef815aa951f6f8ade`. Each consulted source below matched its entry in that manifest. The old file was hashed in full; only the two assigned test bodies were inspected as behavioral sources.

| File | SHA-256 |
| --- | --- |
| `old/e2e/compose-pwa.spec.ts` | `fd453bc97469c2f0278bb4cc35cfb17aa2eebdb21560c7af5038cc426962e285` |
| `new/test-ui/editor-workflows.oracle.test.ts` | `f082409872ab8d78ddf3d9b1b4d099c2b3ecbbd4a293ea87e887d0549233bf8b` |
| `new/test-ui/editor-oracles/workflow-model-oracle.ts` | `528ee0818dcf63b20d9b6911da0953e7aab8934f01758e2eb92a58df0b371fb8` |
| `new/test-ui/editor-oracles/workflow-driver-oracle.ts` | `ddbd86aec59db829c9cf728350ee7906ea9b1cbfd4f049ee48281f1fc4a277af` |
| `new/test-ui/editor-oracles/application-driver-oracle.ts` | `7b30f54e51005b02057c213fa0dcdea016b5549672452960eaa317b0c561d9b7` |
| `new/test-ui/editor-oracles/link-model-oracle.ts` | `9af8f1836b794e82d60b3b6bf9e5ff4323e22acf840ac1bbfc522a7a81faa284` |
| `new/test-ui/editor-oracles/browser-engine-oracle.ts` | `c4b7c8cdb7b4c2d1e37fe2a944f6c2d4e0732babef43088f6154deacdff9b020` |
| `new/test-ui/editor-oracles/browser-driver-oracle.ts` | `46a8138471e47022522cbe29fb49e087a47f3a5ee88b58b12c9128c993e8d71d` |
| `new/test-ui/editor-oracles/document-oracle.ts` | `c1c3f482b750530ceaa83e8afee6c0021b18c241dc722dce5fc723265db81466` |

## Receiving histories and checkpoints retained

Both complete original histories are constructed, rather than left to random generation: `M:24–31` defines `originalClipboard` and `originalPaste`, and `M:48` creates their `Mobile` copies. `W:44` registers every constructed case. The original desktop/mobile Chromium project scope is supplied by the audit assignment; the old project configuration was not inspected. In the new source, `browser-engine-oracle.ts:6–17` defaults to Chromium with Desktop Chrome or iPhone 13 device profiles, and `A:12` applies the chosen profile. The engine remains environment-selectable; this audit does not claim either project ran.

Each history enters the real composer once (`D:18–22`), then loops over all its actions in the same application context (`D:23–110`). The driver does not refill source between actions. Every action emits `hostN` and `stepN` (`D:102–109`); `A:44` emits the final `errors`. `W:46–55` compares each modeled field and the exact checkpoint sequence. A full-editor transition exempts only its selection field (`W:50`), not source. The shared model cleans URL parameters through `L:73–83`, serializes Markdown through `L:94–99`, builds insertion source/caret through `L:133–139`, and derives feedback through `L:150–154`.

### Original clipboard sequence

| Original support | Retained input, action, or assertion | Exact new path/checkpoint |
| --- | --- | --- |
| `old/e2e/compose-pwa.spec.ts:146–148` | Authenticated composer `#composer-text`, filled with `Read the essay today.` | `M:22,24–25`; `A:24–27` supplies an owner session cookie; `D:18–22` navigates to `/studio` and fills the composer. The original `login(page)` helper is an observed setup call; its implementation is outside this source scope. |
| `:149–151` | Clipboard target `https://www.example.com/essay?id=7&utm_source=newsletter&fbclid=IwAR0x`, selected `the essay`, click clipboard-link control. | `originalClipboard.operations[0]`, `M:24`; initial range `[5,14]` from `M:91`; `D:24–25` focuses/selects, `D:30–50` writes/reads the OS clipboard and clicks the visible `[data-action="link-clipboard"]` control. `host0.clipboard` records the actual provider input. |
| `:152` | Exact full source `Read [the essay](https://www.example.com/essay?id=7) today.`: label and surrounding words retained, `id=7` retained, two trackers removed. | `originalClipboard → step0.value`, predicted by `M:71–88,103–107` and `L` insertion model. Under the intended provider input, this is the exact literal old value. See recovered conditionality below. |
| `:153` | Exact toast `linked selection · 2 trackers removed`. | `originalClipboard → step0.toast`; `M:82,85–88`, `L:151–154`, checked by `W:47–53`. New model also requires `step0.toastCount=1`. |
| `:155–157` | In the same already-linked composer, change clipboard to `just some words`, focus and collapse at actual document end, click clipboard-link again. | `originalClipboard.operations[1]`, `M:25`; `at:'end'` resolves to `[59,59]` after the first modeled result (`M:64–68,90–101`); `D:24–25,30–50` performs the second focus/selection/clipboard/click without refilling. |
| `:158` | Fallback sheet named `link from clipboard`; supply `https://example.org/p?gclid=1`. | `originalClipboard → host1.clipboard`, `host1.typed`, `step1.sheet.reason='notUrl'`; `D:51–63` waits for the named dialog, fills its URL field, clicks `insert link`, and waits for dismissal. The original calls `answerSheet` with the same name/text; the helper implementation is outside scope. |
| `:159` | Exact combined source `Read [the essay](https://www.example.com/essay?id=7) today.<https://example.org/p>`; first link survives, fallback appends an autolink with `gclid` removed and no added separator. | `originalClipboard → step1.value`; same text accumulates through `M:103–107`. Under intended provider/field input it is the exact old literal. Both desktop and mobile histories take this path. |

Additional checked facts in that exact intended-input reconstruction: `step0.selection=[52,52]`, `step0.sheet=null`, `step0.dialogs=0`; `step1.selection=[82,82]`, `step1.toast='inserted link · 1 tracker removed'`, `step1.toastCount=1`, and `step1.dialogs=0`. These were not explicit old assertions and are not substitutes for any missing old fact.

### Original paste/transition sequence

| Original support | Retained input, action, or assertion | Exact new path/checkpoint |
| --- | --- | --- |
| `old/e2e/compose-pwa.spec.ts:163–172` | Authenticated composer filled with `see this page`; select `this page`. | `M:26`; initial range `[4,13]` from `M:91`; shared host setup above, then `D:24–25`. |
| `:164–169,173` | Synthetic bubbling, cancelable `paste` with a `DataTransfer` `text/plain` URL `https://example.com/p?utm_medium=x`; `dispatchEvent` returns `false`. | `originalPaste.operations[0]`, `M:27`; `D:71–77` creates the same event/data and dispatches it. It additionally defines `clipboardData` to the same data object. `step0.defaultAllowed=false` (`M:79,86`), checked by `W:47–53`. This is the synthetic path, not native paste. |
| `:174` | Source becomes exactly `see [this page](https://example.com/p)`. | `originalPaste → step0.value`; literal input remains the direct synthetic event payload, and `host0={}`. `M:72` uses planned raw input when no host clipboard observation exists. New model also requires `[38,38]` selection and `linked selection · 1 tracker removed` toast. |
| `:176–177` | Set caret `[0,0]`; paste `https://example.com/q`; `dispatchEvent` returns `true`. | `originalPaste.operations[1]`, `M:28`, `D:24–25,71–77`; `step1.defaultAllowed=true`, `step1.selection=[0,0]`, `step1.value` remains the first linked source. A synthetic event's allowed native default does not insert its text; the old test likewise checked only return value here, then checked unchanged source at the later transition. |
| `:178–179` | Select `see`; paste `not a url`; `dispatchEvent` returns `true`. | `originalPaste.operations[2]`, `M:29`, range `[0,3]`; same dispatch path; `step2.defaultAllowed=true`, `step2.selection=[0,3]`, unchanged `step2.value`. |
| `:180–182` | Click `#composer-full`, enter `#md-input`, observe exactly `see [this page](https://example.com/p)`. This receives the accumulated state after both allowed synthetic pastes. | `originalPaste.operations[3]`, `M:30`; real transition `D:97–100`; `step3.value` checks that exact cumulative source, with `step3.selection` deliberately exempted by `W:50`. Mobile selects the editor's draft pane (`D:100`). |
| `:183–184` | In the resulting editor select `see`; synthetic paste `https://example.net/`; return `false`. | `originalPaste.operations[4]`, `M:30`, explicit range `[0,3]`; driver is still using the editor locator established by the preceding real transition, then `D:24–25,71–77`; `step4.defaultAllowed=false`. |
| `:185` | Exact final source `[see](https://example.net/) [this page](https://example.com/p)`: new link wraps the original leading word; first link remains. | `originalPaste → step4.value`; `M:103–107` carries the previous source into the final insertion. Also checks `step4.selection=[27,27]`, `step4.toast='linked selection'`, `step4.toastCount=1`. Both desktop and mobile histories retain the full five-action sequence. |

For the five paste-history actions, each modeled `sheet=null` and `dialogs=0` is checked. The model intentionally omits `toast`/`toastCount` for allowed synthetic pastes and the transition; the driver still records these fields, but `W:49` compares only model keys. `mountedDialogs` is recorded at every action (`D:106`) but is never a model key. Neither omission drops an explicit observation from these two old tests. The old tests do not assert post-transition selection, native text insertion, native permission UI, undo, rendered anchors, persistence after reload, or navigation URL; no such coverage is attributed to them here.

## Recovered or weakened facts and where they vanished

| ID | Supported original fact | Frozen reduction and loss trace | Classification / dropping rule |
| --- | --- | --- | --- |
| C1 | The intended ASCII clipboard URL from `:149` must yield the fixed literal source at `:152` and the fixed two-tracker toast at `:153`. A result for some different provider URL would fail those literal assertions. | The constructed raw URL remains in `M:24`, and `D:30` writes it. However, `D:33–50` records the actual successful provider read as `host0.clipboard`; `M:103–107` passes that host observation into `workflowStep`, whose `M:72` replaces intended raw input with `input.clipboard`. `M:75` can also switch to fallback based on actual provider input. `W:47–55` checks receipt against that substituted expected value and never checks host text equality to the intended ASCII literal. Therefore exact original source/toast outcomes are retained conditional on actual provider text equaling the constructed text, rather than remaining unconditional literal outcomes for that arranged case. | **Weakened.** Category boundary: provider read is treated as a trusted host premise and is fed to the expected model. The fixed arranged-input-to-output relation is compressed into a host-conditioned relation. |
| C2 | After the first link in the same composer, clipboard prose `just some words` (`:155`) leads to the named fallback sheet (`:158`), and the intended typed ASCII `https://example.org/p?gclid=1` yields the exact combined source at `:159`. | `M:25` retains all literals and the action order. `D:50–51` chooses whether to enter the sheet from the actual observed clipboard result; `M:75,87,103–107` makes the expected sheet conditional on that same result. `D:59–60` fills the intended typed URL but stores the URL field's actual `inputValue` as `host1.typed`; `M:77` then uses it as expected target. There is no comparison of either host field to its intended stable ASCII literal. For example, a different valid URL returned at the clipboard premise would permit the read branch instead of requiring the original prose-to-sheet branch; different field text can change expected final source. The exact old fallback fact is thus conditional on both provider and field receipts matching the intended inputs. | **Weakened.** Same trusted-host/expected-model boundary as C1, plus treating observed sheet input normalization as model premise. No judgment is made here about whether that conditioning should remain. |
| C3 | The two old clipboard clicks use `page.locator('[data-action="link-clipboard"]').click()` directly (`:151,157`). Playwright's strict single-element action therefore also rejects multiple matches, including an additional hidden match. | `D:46` adds `.filter({ visible: true })` before the click (`D:47`). The successful visible control path remains; an additional hidden control with the same data-action no longer makes that locator ambiguous. | **Weakened incidental selector observation.** Explicit filtering narrows the receiving element category before Playwright strictness applies. This is distinct from the product source/toast assertions. |

The authenticated entry setup changes from the visible `login(page)` calls at `:146,163` to cookie injection at `A:24–27`. Since the old login helper's authority and behavior are outside this two-test source scope, this is a recorded harness distinction, not an asserted loss of authentication feature coverage. The same limit applies to the uninspected `setClipboard`, `select`, and `answerSheet` helper internals: only their visible calls and arguments are original support here.

No original paste payload, cancellation return value, exact resulting source, composer/full-editor receiving step, action ordering, or desktop/mobile constructed history was found absent from the frozen workflow source. The clipboard literals, source and toast projections, and fallback order are all present; C1–C2 identify the precise assertion conditionality that prevents calling those fixed ASCII outcomes unconditionally equivalent. C3 records the narrower locator strictness. This completes the source-only recovered/dropped trace for the assigned two tests; receiver mutation outcomes belong to the parent's separate execution evidence.

## Independent restoration review, 2026-11-18

The preceding audit remains the record of the frozen reduction. This addendum reviews the subsequent current-worktree restoration of C1/C2/C3, rather than rewriting that snapshot. It is independent of the restoration author, but continues the same reviewer's original-source mapping. No implementation edits, browser jobs, production probes, oracle campaigns or mutation jobs were run by this reviewer. Shared receiver transport and execution evidence remain with the parent.

Read the installed, pinned `@tanstack/oracles@97a4e7a` `skills/oracles-review/SKILL.md`, checklist v1 and glossary in full. The pin is present in `package.json:81` and `package-lock.json:40,1606`. Rebuilt the source-to-model-to-driver-to-check observations from the original two-test authority, then inspected the actual `src/ui/authoring.tsx:208–237,267–331` receiver and `src/ui/links.ts`. The original behavioral source boundary remains only the two assigned frozen test bodies; no additional old tests or old helpers were inspected.

### Source disposition of the three recovered items

**C1 and C2 are restored in source for the exact original desktop/mobile histories.** Current `workflow-model-oracle.ts:75–85` defines `workflowHostPremises` from arranged action inputs alone. The stable category is nonempty printable ASCII (`U+0020–U+007E`) with no edge whitespace. It does not special-case original literal values or narrow the generator. Current `editor-workflows.oracle.test.ts:52–56` checks those independent premises before comparing the corresponding receiving step.

In `originalClipboard`, action 0 therefore separately owes `host0.clipboard='https://www.example.com/essay?id=7&utm_source=newsletter&fbclid=IwAR0x'`. Action 1 separately owes `host1.clipboard='just some words'` and `host1.typed='https://example.org/p?gclid=1'`. A provider/field substitution can still alter the model's predicted result, but it cannot make the overall check pass: the independently arranged host equality fails first at the relevant action. With those equalities satisfied, the model's conditional inputs coincide with the original intended inputs, so the exact source, toast, fallback path and same-history composition recorded above are owed again. `originalClipboardMobile` uses the identical premise and receipt checks through the same registration.

One independently rebuilt distinguishing observation: if a wrong delivered target is `https://different.example/`, its own insertion projection could yield `Read [the essay](https://different.example/) today.`. Even a fully consistent source/caret/toast receipt for that substituted target must be rejected at `host0`, with difference `stable arranged clipboard input must arrive unchanged at host0`. The expected original source remains `Read [the essay](https://www.example.com/essay?id=7) today.`. This is a source reconstruction, not an executed corrupted trace.

**C3 is restored in source.** Current `workflow-driver-oracle.ts:46` records the full, unfiltered `[data-action="link-clipboard"]` match count before activating the visible control at `:47–49`. The result reaches `stepN.clipboardControls` at `:110`; current model `:104` requires exactly 1 for every clipboard-like action, and the generic receipt loop checks it. A second hidden match therefore changes the observed count to 2 and is rejected, rather than disappearing through the visibility filter. The trigger remains an actual UI click/focus/keyboard activation; the count does not manufacture source or feedback.

The original paste construction, all five receiving actions, mobile copy, action count, random budget, fixed seed and original resulting values remain unchanged. The restoration adds exact-delivery checks to qualifying native-paste inputs too; it does not convert the old synthetic paste history into an OS-paste history.

### Calibration discrimination challenge and repair

During this review, the first restoration version corrupted only `host0.clipboard` or `host1.typed` and required any failure of the workflow law. That did not isolate the new premise checks. The pinned framework's `oracle-property.ts:1997` calls `judge` again on the corrupted trace, and `:1703` recomputes the model from that trace. Consequently, changing a host input while leaving the original result step intact can fail the old source receipt comparison even if the new host-premise comparison is removed.

This was reported to the parent as an enforcement-calibration weakness under ORC-006/012 (checklist v1), rather than a remaining C1/C2 implementation defect. The author then bound the three calibrations to distinguishing difference text. The final inspected source has:

| Calibration | Binding and corrupted checkpoint | Required distinguishing difference |
| --- | --- | --- |
| `stable ASCII clipboard delivery changed` | `originalClipboard`, corrupt `host0.clipboard` | `stable arranged clipboard input must arrive unchanged at host0` |
| `stable ASCII typed delivery changed` | `originalClipboard`, corrupt `host1.typed` | `stable arranged typed input must arrive unchanged at host1` |
| `hidden duplicate clipboard control` | `originalClipboard`, corrupt `step0.clipboardControls` to 2 | `step0.clipboardControls` |

Current registration `:54` reports the exact host/field-specific difference; receipt comparisons at `:60` report `stepN.field must match the workflow receipt`; calibrations at `:67–69` require the corresponding text. Pinned `calibrationRejection` at `oracle-property.ts:1887–1912` requires both the named law and the bound difference substring. Removing the exact-delivery check would now leave a source/selection/feedback mismatch with a different difference string, so the clipboard/typed calibration would fail instead of incorrectly passing. Removing control-count enforcement likewise cannot satisfy its bound difference via an unrelated field mismatch. **This calibration repair is accepted from source; its successful execution is still pending.** These calibrations establish checker sensitivity when run; they do not themselves demonstrate a receiver mutant's delivery to the browser.

### Normalization and host-conditioning limits retained

- **The exact original inputs are within the new stable category.** Their URL punctuation, query separators, and the internal spaces in `just some words` are printable ASCII without edge whitespace. The generic predicate consequently covers every intended provider and typed field value from the original clipboard sequence.
- **Other text remains host-conditioned.** Empty text, edge whitespace, control characters, Unicode and malformed UTF-16 do not get an independent exact-delivery obligation from this predicate. `workflowModel` still reads actual recorded provider/event/field input at `workflow-model-oracle.ts:119–123`. A changed nonstable provider or field value can therefore alter the expected link, sheet branch and feedback. This is an unresolved arranged-input-to-delivered-input relation for that broader domain; it is not evidence that every such change is valid normalization. The opening law prose `:29–30` now says that normalization remains a host premise for other text. A broader byte-preservation or specified-normalization claim needs its own independent relation and distinguishing witnesses.
- **Inputs are sampled before receiver consumption.** The native clipboard wrapper records the text it returns to the receiver (`workflow-driver-oracle.ts:33–51`); the URL field is sampled before submit (`:59–62`); native paste records the paste event's text (`:85–96`). The model does not use resulting editor source, caret or toast as expected inputs. The delivered-field boundary includes any field-level normalization already performed before submit; this review does not establish all of that field's behavior independently.
- **Selection plans stay independent of received caret values.** `workflowPlan` uses the independent modeled prior selection/source; it does not feed received caret/source back into the next range. For nonstable host inputs whose delivery changes length, later ranges may no longer mean the textual end/current word the original arranged payload would have produced. The oracle still checks the concrete planned ranges it actually selects. The original stable ASCII histories do not have this divergence.
- **Reach labels describe eligible arranged inputs.** `stableClipboardDelivery` and `stableTypedDelivery` at model `:131–133` are predicates over `workflowHostPremises(action)`, not separate observations that native transport succeeded. They guarantee construction of the exact-delivery obligation; successful delivery comes from the host-field check. A reach count alone must not be reported as transport success. The original desktop/mobile constructions enter both predicates by source reconstruction; measured campaign counts remain pending.
- **The restoration does not supply transport evidence.** A trace corruption is not a production receiver mutant or proof that the intended instrumented application bundle ran. The parent's receiver transport campaign, source identity, baseline, random/fixed campaigns, repeats and classified receiver challenges remain separate obligations. No setup failure or timeout is counted as a kill here.

### Checklist disposition for this restoration delta

This is a bounded source acceptance of C1/C2/C3, not a new claim that the entire workflow suite has been fully audited or run. Requirements are cited against checklist v1.

| Requirement | Restoration outcome |
| --- | --- |
| ORC-001 | Original exact clipboard values, outputs and selector path supply authority for C1/C2/C3. Opening prose states the stable-input extension and host-conditioned complement. Broader normalization correctness is not established. |
| ORC-002 | Exact host premises derive from plan input and an independent character-category rule; product receipts still derive from independent link projection. Actual delivered inputs remain explicit trusted premises outside the stable category. No production output predicts an expected value. |
| ORC-003 | Prose at registration `:29–32` and model `:71–74` explains the new rule, limits and global-count observation. Law, premises, model, driver and comparison remain distinguishable. |
| ORC-004 | No arbitrary, construction, bound, seed or history filter was removed. New predicate adds assertions for a category without removing its complement from histories. Original desktop/mobile reconstructions remain. Internal ASCII spaces versus edge whitespace/control/Unicode are the assertion boundary, not a grammar exclusion. |
| ORC-005 | Native read/typed field/full selector count are recorded at named `hostN`/`stepN` checkpoints and checked. Actual production receiving source/bundle identity and execution remain pending with the parent's transport campaign. |
| ORC-006 | Three named corruptions and field/checkpoint-bound distinguishing differences are present after the calibration repair. Source supports rejection for the intended reason; executed calibration and receiver-mutant evidence is pending. |
| ORC-007 | Existing `runs:25`, seed `20261118`, arbitrary and framework random campaign route remain unchanged. No new completed run is claimed. |
| ORC-008 | No state is introduced, removed, merged or split by the restoration; this delta's state-minimality trigger does not apply. Existing source/range/surface continuation states remain unchanged. |
| ORC-009 | `clipboardControls` maps to all selector matches, including hidden nodes; stable-delivery reach labels are model-side obligation categories as clarified above. Existing production action vocabulary is retained. |
| ORC-010 | No cleanup or shrinking changes in this delta; no new fidelity mechanism is claimed. Shared application-host cleanup remains unchanged and was read. Pending runs must preserve original law/checkpoint versus setup/cleanup diagnostics. |
| ORC-011 | No newly identified shared production/model semantic fault calls for a second formulation of the stable character predicate. An additional semantic-link formulation is outside this restoration delta; the original independent link projection is unchanged. |
| ORC-012 | This addendum records the source acceptance, in-review calibration challenge/repair, fingerprints and remaining execution/normalization uncertainty. It makes no bug-class or zero-gap closure claim. |
| ORC-013 | Original ASCII URL/prose/typed fallback plus hidden duplicate control are distinguishing witnesses; stable eligibility is generic, not literal-specific. Nearby nonstable native-transport histories remain. No general normalization boundary is declared closed. |
| ORC-014 | Real native inputs are observed; controlled denial remains controlled. No new claim about physical permission UI or arbitrary provider normalization is made. Real receiver/transport execution still needs the parent's receipt. |
| ORC-015 | Both stable-obligation states are declared and the unchanged original clipboard constructions for both profiles enter them. Execution counts are pending, and predicate presence is not described as successful delivery. |
| ORC-016 | Restored premises, counts and calibrations remain inside the registered law's generic model/driver/check route. No fixed expected output or ordinary unit test was added. |

Final reviewed worktree SHA-256 fingerprints (these are distinct from the frozen manifest above):

```text
28670d806e5c214fc533677ec7024994f36a8419be9c300bdbfe8917b4fe123b  test-ui/editor-workflows.oracle.test.ts
ad252e25919b9915deb98392fe5291f57f8e97853a441f07b94f826ebf8212e8  test-ui/editor-oracles/workflow-model-oracle.ts
2cb9e0c5d8893e876374a683b4caeca895ccc00b758c289dfe3fc7d11160a181  test-ui/editor-oracles/workflow-driver-oracle.ts
7b30f54e51005b02057c213fa0dcdea016b5549672452960eaa317b0c561d9b7  test-ui/editor-oracles/application-driver-oracle.ts
9af8f1836b794e82d60b3b6bf9e5ff4323e22acf840ac1bbfc522a7a81faa284  test-ui/editor-oracles/link-model-oracle.ts
9d48b6eb15fb9cfc9309f7b3fcccc97ca16b1aa867df1b212b86acb383252cf7  node_modules/@tanstack/oracles/skills/oracles-review/SKILL.md
cf46fd8f1d9a7e69d5251297fa793345ea184fb73c27f116a6d5caf8c8ecbea4  node_modules/@tanstack/oracles/docs/oracle-checklist.md
dadec892f63c53457125c3e951c4c8c1b9df938d035aca02d286c7878b92243a  node_modules/@tanstack/oracles/docs/glossary.md
```

## Execution addendum: bounded cold receiver campaign

Read the completed parent's artifacts under `build/formatting-oracles/workflows-loss-receiver-final/`, run `6fe6a762881b`, after the source review above. This reviewer launched no browser or oracle jobs and changed no implementation or retained tests. This addendum distinguishes the parent's recorded execution from the preceding independent source reconstruction.

`results.json` has `provisional:false`, one unmutated oracle file with **161 passed, 0 failed, 0 skipped**, and `nondeterministic:[]`. `stream.log:9,17` records the baseline passing twice, in 199.3 s and 203.3 s, with zero nondeterministic tests. The report records `reused:0`, `computed:11` (two baselines plus nine mutant executions), and zero cut/idle/spin/budget outcomes. This supports a fresh computed campaign rather than reused verdicts. The parent's invocation/sequence identifies it as the cold run after the receiver-transport repair; this addendum does not infer cold cache state merely from the run label.

### Restored checks and declared reach

The registration/model/workflow-driver hashes still match the source-accepted restoration above. The successful complete oracle-file baseline includes the six registered calibrations, including the three difference-bound restoration calibrations. The compact test log prints reach, not individual calibration rejection diagnostics: this is an aggregate passing-baseline receipt for those registered calibrations, rather than an archived dump of each corrupted trace/difference. With the inspected pin's calibration semantics, passing those registered tests requires the designated law and difference substring. Thus the parent run supplies the previously pending execution support for C1/C2/C3 checker calibration; it does not turn those trace corruptions into production receiver mutants.

`test-output.log` records each original history on fixed and random campaign routes in each baseline:

| Constructed history | Required observed reach in the logs | First-baseline fixed/random lines | Repeated-baseline fixed/random lines |
| --- | --- | --- | --- |
| `originalClipboard` | `desktop=1`, `stableClipboardDelivery=1`, `stableTypedDelivery=1`, `sheet-notUrl=1` | 1 / 52 | 103 / 154 |
| `originalPaste` | `desktop=1`, `full=1`, `pasteIntercepted=1`, `nativeDefaultAllowed=1` | 2 / 53 | 104 / 155 |
| `originalClipboardMobile` | `mobile=1`, `mobileClipboardFallback=1`, both stable-delivery obligation states = 1 | 31 / 82 | 133 / 184 |
| `originalPasteMobile` | `mobile=1`, `mobilePasteTransition=1`, intercepted/default paste states = 1 | 32 / 83 | 134 / 185 |

The generated-history reach rows at lines 51/102/153/204 each report `stableClipboardDelivery=12` and `stableTypedDelivery=7` among 25 generated histories. These remain eligibility-for-check counts as defined in the source review; successful exact delivery is established by the corresponding passing host-field comparisons, not by renaming a reach predicate as an OS transport probe. The aggregate passing baseline also covers each constructed history's exact source/caret/toast/default/selector-count comparisons. The artifacts do not retain every successful `hostN`/`stepN` value as a separate trace file, so the literal values above continue to be source-reconstructed expected checkpoints plus a passing registered campaign receipt.

### Nine executed production challenges

The partial-run report contains exactly nine result objects, all `outcome:'killed'`, each naming `completed-link workflow receipt` and a reproducible fixed-seed route. There are zero reported production crashes and zero gaps **among those nine selected, existing challenges**.

| Authored challenge | Receiving behavior distinguished | Reported first rejecting fixed-seed construction |
| --- | --- | --- |
| `links-fragment-question` | Tracker cleanup preserves the fragment's terminal question mark | `fragment-cleanup-clipboard-part?` |
| `workflow-caret-intercept` | URL paste at a collapsed caret stays native | `originalPaste` |
| `workflow-denial-reason` | Denied clipboard read has the denied explanation | `denied-desktop` |
| `workflow-dom-only` | Completed insertion reaches React state before full-editor handoff | `originalPaste` |
| `workflow-files-intercept` | Nonimage file paste is not claimed by link pour-over | `files-desktop` |
| `workflow-ignored-typed` | Fallback insertion uses the typed target | `originalClipboard` |
| `workflow-lost-captured-range` | Clipboard insertion uses the captured selection | `originalClipboard` |
| `workflow-missing-caret` | Completed insertion positions the caret at its end | `originalClipboard` |
| `workflow-native-default` | Selected URL handling prevents native insertion | `originalPaste` |

The report's `options.only` lists ten strings. Its tenth selector is `authored:workflow-sheet-cancel`, which has no matching result. The actual authored challenge is `workflow-cancel-inserts`; it was not selected and is not credited here. Baseline `cancel-desktop`/`cancel-mobile` constructions passing is distinct from an executed cancellation production-mutant kill. The parent has retained that challenge for the subsequent default campaign. This report is therefore **9/9 valid selected challenges**, not 10/10 and not all-authoring/full-suite zero-gap evidence.

### Source binding and the later production repair

The run report does not contain a complete cryptographic prelaunch source manifest. The parent supplied the sequence attestation that workflow process 21869 exited successfully before the next command changed the two `useAction` catches. The interleaved `build/formatting-oracles/navigation-save-settlement-red-registered/invocation.txt` records `src/ui/authoring.tsx` as `d325e5b77249ae1367aae1818978964a0cc81d3f1e4eaed94c9e24826ab423dd` before that later repair. That hash also matches the source reviewed before this campaign. Independently, this reviewer inspected the current two-catch production diff and reversed only those two replacements plus their added explanatory comment in memory; its hash returns to `d325e5b…`, equal to `HEAD`'s production source. No file was edited in that reconstruction.

These facts support **parent sequence attestation plus an interleaved hash**, not a newly invented complete prelaunch proof. The later current production hash is `863d35404d85e06f3c093f46cc1a6c73b369ea49c22fd00ac4fc954af47d8bc6`; this nine-challenge run must not be cited as GREEN for that later UI-error repair. The fresh default campaign will carry its own pre/post source manifest and current-production execution receipt. Until that full current campaign is accepted, both original clipboard tests remain retained. No test removal is authorized by this bounded addendum.

Postrun fingerprints read by this reviewer:

```text
28670d806e5c214fc533677ec7024994f36a8419be9c300bdbfe8917b4fe123b  test-ui/editor-workflows.oracle.test.ts
ad252e25919b9915deb98392fe5291f57f8e97853a441f07b94f826ebf8212e8  test-ui/editor-oracles/workflow-model-oracle.ts
2cb9e0c5d8893e876374a683b4caeca895ccc00b758c289dfe3fc7d11160a181  test-ui/editor-oracles/workflow-driver-oracle.ts
7b30f54e51005b02057c213fa0dcdea016b5549672452960eaa317b0c561d9b7  test-ui/editor-oracles/application-driver-oracle.ts
b0ca432cf84f1dcfb60ac5e0e9052d2f3eb524e0594be9a5e158a3e7d620562f  test-ui/editor-oracles/browser-driver-oracle.ts
f429151f9bfa87b1de9ff19614c6ed063acc0d90cd33cf34be2c62c5d458a3e8  test-ui/editor-oracles/browser-source-oracle.ts
99b5a301aebc22699eed02c0c11781b0268bd2227fc59394dc5fcbe77f46e03c  scripts/formatting-oracle-application.ts
863d35404d85e06f3c093f46cc1a6c73b369ea49c22fd00ac4fc954af47d8bc6  src/ui/authoring.tsx (later repair; not the production snapshot credited to this run)
0c7e9c75c970a73bd090e3ee8cb245ccffb727d1d9782397bdbd3098c9ecefa9  build/formatting-oracles/workflows-loss-receiver-final/results.json
163bc5256e97caef4e8a03bb5720ba3f97be4ff2e61abe0aa8ecde557684b95a  build/formatting-oracles/workflows-loss-receiver-final/summary.md
9d099d2c84a5178b2aa7acde333f835a2913d44fe3130a78345b17e8ef0775ee  build/formatting-oracles/workflows-loss-receiver-final/stream.log
d1b0e90e3e464c0e1256818692804b039ccdcc0c8999930f885a58c5157f3972  build/formatting-oracles/workflows-loss-receiver-final/test-output.log
c211ace89603569faebc2f2ad3ee0994cedc4179da86e07b77326b1c7204b948  build/formatting-oracles/workflows-loss-receiver-final/state.json
```

## Removal-preview scope review while the full campaign runs

Reviewed `build/formatting-oracles/clipboard-removal-preview/compose-pwa.patch` and `provenance.json` without applying the patch or writing a candidate source file. An in-memory application verified every hunk's old/context lines, the frozen base SHA-256 `fd453bc97469c2f0278bb4cc35cfb17aa2eebdb21560c7af5038cc426962e285`, and candidate SHA-256 `176019d66790b75969f028521c957797f9cc468fd7dde1716ef23228d1605be2`.

The preview removes exactly the two audited named tests. All ten retained test bodies, including the two nested scan-text tests, remain byte-identical; total test declarations change from twelve to ten. The only other changes are the now-unused `setClipboard` helper definition and the file header's reference to where formatting clipboard/paste coverage lives. The candidate contains no remaining `setClipboard` reference. This scope review does not expand the old behavioral audit to those unrelated tests or authorize removal before the current full campaign's acceptance.

Preview artifact SHA-256 values: patch `6419642cc93fb63f9c48cad442ac8ea7288f9428d681855dd0d4c2920cdda5f7`; provenance `062bd05c34e9e61e8cc4f61c1e246618b17f6b3acda20f570f76d8a522b9aa2c`. The original test source was not changed by this reviewer.

## Restart preparation: default authored inventory and cancellation gate

The first `final-current-chromium` run is **not accepted as a complete migration gate**. Its `stream.log` records a first baseline passing all fourteen oracle files (4,204 checks), then a partial repeat and `done stopped (SIGTERM)`. Its `stopped-reason.txt` records the intentional stop for the independently found PAD-001 parent-padding grammar gap. No completed repeat, mutation campaign, or final-current deletion acceptance is attributed to that run. Both original clipboard blocks and the reviewed removal preview remain unchanged/unapplied.

While waiting for the repaired restarted campaign, performed this read-only default-inventory check. No browser/job, runtime-source edit or retained-test edit was made. The upcoming run must freeze and verify its own inputs after the PAD-001 repair; this preparation is not a substitute for its execution or its postrun manifest.

Current `scripts/formatting-oracles.ts:27–31,46–54` enables receiver bundling when no `--oracle` is selected, passes the entire `test-ui/editor-oracle-mutants` directory, and defaults automatic operator sources to `format-shortcuts.ts`, `links.ts`, and `draft.ts`. Pinned `oracle-gaps/check.mjs:1534` loads the authored directory independently; `:2536–2540` iterates every loaded authored mutant, applying an ID restriction only if `options.only` exists. It does not filter authored entries by the automatic three-source list. Therefore a default invocation without `--only` includes the authored `authoring.tsx` receiver challenges too. This is source-level admission evidence, not a claim that every challenge has already run or been killed.

Directory inspection found **73 JSON files, 73 authored objects, 73 unique IDs**: 39 name `src/ui/format-shortcuts.ts`, 10 name `src/ui/links.ts`, 4 name `src/ui/draft.ts`, and 20 name `src/ui/authoring.tsx`. Every current `find` string occurs exactly once in its named current source. The loader sorts `.json` filenames, validates six nonempty string fields and unique IDs, and the authored patcher requires a unique occurrence (`oracle-gaps/authored.mjs:32–83`). The count and admission conditions must be checked again if the forthcoming repair changes this inventory.

The exact missing cancellation challenge is present as:

```text
filename: workflow-cancel-inserts.json
ID: workflow-cancel-inserts
selector: authored:workflow-cancel-inserts
source: src/ui/authoring.tsx
find:         if (typed === null) return;
replacement:         if (typed === null) { linkInto(el, 'https://cancel.example/', at, change); return; }
SHA-256: f32429d786ef59dccdb2af65677649a45a5e0c912517afeb971311f698201
```

Its `find` matches once, inside the receiving `useTextTools` scope named in workflow ownership. The wrong design inserts despite sheet cancellation. Existing constructed `cancel-desktop` and `cancel-mobile` histories receive an invalid clipboard, cancel the actual named sheet, and require original source/selection with no accessible dialog remaining. A completed result for **this exact authored ID** must be inspected in the restarted campaign; neither baseline cancellation reach nor the earlier typo selector `authored:workflow-sheet-cancel` can supply that result. No object with ID `workflow-sheet-cancel` exists.

Eight other filenames differ from their IDs, so filenames must not be mechanically used as selectors:

| Filename stem | Actual ID (prefix `authored:` when selecting) |
| --- | --- |
| `dispatcher` | `review-four-character-dispatch` |
| `document-start` | `document-start-formatting` |
| `fragment-link` | `fragment-url-link` |
| `multiline-display` | `multiline-display-only` |
| `original-fence` | `original-three-backtick-wrapper` |
| `original-line-break` | `original-any-backslash-is-break` |
| `review-context` | `review-unseen-context` |
| `review-verse` | `review-verse-invalid-end` |

The full sorted filename inventory at this preparation checkpoint is:

```text
browser-extra-keydown.json
browser-native-undo-required.json
dispatcher.json
document-start.json
draft-acknowledges-newer.json
draft-old-ack-regresses.json
draft-premature-save.json
fragment-link.json
interaction-focus-scroll.json
interaction-picker-consumed-gate.json
interaction-prevent-blur-traversal.json
interaction-prototype-focus-scroll.json
interaction-readonly-gate.json
interaction-wrong-recipient-traversal.json
links-caret-before-insertion.json
links-drop-page-selector.json
links-fragment-question.json
links-full-result-feedback.json
links-omitted-label.json
links-recognition-refusal.json
links-unencoded-angles.json
links-unencoded-destination.json
links-unescaped-label.json
links-wrong-feedback-kind.json
loss-audit-caret-outside-block.json
loss-audit-default-wrapper.json
loss-audit-loose-parent.json
multiline-display.json
native-delete-undo.json
navigation-dirty-false.json
navigation-premature-spa.json
navigation-rejected-save-leaves.json
one-grapheme-endpoint.json
original-closing-fence-newline.json
original-collapsed-delete.json
original-existing-display-formula.json
original-fence.json
original-inherited-format-key.json
original-initial-newline-span.json
original-invalid-fence-info.json
original-line-break.json
original-marker-only-multiline.json
original-native-grapheme-range.json
original-undefined-action-error.json
original-unicode-fence-tail.json
original-unicode-format-key.json
original-whitespace-overlap.json
original-wide-parent-indent.json
receiver-bracket-consumed-gate.json
receiver-escape-ignore-prevention.json
receiver-escape-never-exits.json
receiver-replacement-bracket-mounted.json
receiver-replacement-controls.json
receiver-replacement-key-gate.json
receiver-replacement-mention-mounted.json
receiver-replacement-premature-release.json
receiver-replacement-readonly.json
receiver-replacement-stuck.json
review-context.json
review-list-duplicate-child.json
review-list-eof-outdent.json
review-list-valid-nul-context.json
review-verse.json
word-segmentation-range.json
workflow-cancel-inserts.json
workflow-caret-intercept.json
workflow-denial-reason.json
workflow-dom-only.json
workflow-files-intercept.json
workflow-ignored-typed.json
workflow-lost-captured-range.json
workflow-missing-caret.json
workflow-native-default.json
```

The inventory fingerprint is `702e72ed51aa47190fe05dc841573113d83469bc0c0aaf03f45fe6b218ea2455`: SHA-256 of Python `json.dumps(records, sort_keys=True, separators=(',', ':'))`, where records are sorted by filename and contain `filename`, `id`, `source`, file-content `sha256`, and `findCount` (1 for each current entry). This fingerprint records the checked directory and current applicability; the restarted campaign's own manifest remains the authoritative input set for its result.

C1/C2/C3 source mapping is preserved: registration SHA-256 `28670d806e5c214fc533677ec7024994f36a8419be9c300bdbfe8917b4fe123b`, model `ad252e25919b9915deb98392fe5291f57f8e97853a441f07b94f826ebf8212e8`, and workflow driver `2cb9e0c5d8893e876374a683b4caeca895ccc00b758c289dfe3fc7d11160a181` remain unchanged. The preview patch/provenance hashes remain `6419642cc93fb63f9c48cad442ac8ea7288f9428d681855dd0d4c2920cdda5f7` / `062bd05c34e9e61e8cc4f61c1e246618b17f6b3acda20f570f76d8a522b9aa2c`. Final acceptance still requires the completed restarted current-source campaign, unchanged pre/post inputs, all four original receiving constructions, the three discriminating restoration calibrations, and the actual cancellation challenge outcome. Nothing in this preparation authorizes applying the removal preview.

## Integrated current-run checkpoint, 2026-11-19 — acceptance pending

The active restarted run is `build/formatting-oracles/final-current-chromium-integrated`, launched without `--only`, `--sample` or replay selection. Independently read `pre-inputs.json`, SHA-256 `7775e8e70909566c1178ea914e08d215d830e69ef4498c7c868f2eefab5f45ab`: all 402 listed inputs existed and matched disk at this review checkpoint. It binds current authoring `863d354…`, the unchanged C1/C2/C3 workflow sources above, and the exact cancellation mutant `f32429…`. The parent reports that this later inventory contains 75 authored challenges; the earlier 73-file preparation remains its own dated inventory rather than a claim that the new run has only 73.

Both main baselines have passed all fourteen oracle files, 4,367 checks each. This reviewer directly inspected preserved workflow raw files:

| Preserved raw capture | Test records | SHA-256 |
| --- | --- | --- |
| `preserved-live-captures/run-94017-14.jsonl` | 161 pass, no fail/skip | `a7f36eee32b1d6cfecedc0015c285b94ec47c47fe5f636f93b63600960bacf48` |
| `preserved-live-captures/run-94017-28.jsonl` | 161 pass, no fail/skip | `06dfd5aad1ae5c613ab2ce16990d0cf9ded6164036380cfc9c9e3adc1fbed9d1` |

Each raw file additionally has two non-test metadata records; those are not extra passing tests. Each explicitly records all four original constructions passing on both fixed/random named campaign routes, all three difference-bound restoration calibrations passing, and all four original constructed-history determinism tests passing. Paired `state-at-link` and `state-after-link` records for both captures have `mutant:null`, `select:null`, with no per-unit overrides. Unlike the earlier compact nine-challenge report, this run therefore retains direct per-test passing records for the C1/C2/C3 calibrations.

**This is not final deletion acceptance.** After the two main baselines, the current runner is validating 84 additional **unmutated selected-tail copies**. A raw filename number above 28 does not identify a mutant, and those copies must not be credited as cancellation mutations. The parent corrected that phase description before any such credit was given. Actual `authored:workflow-cancel-inserts` metadata, its registered law-rejection receipt, the completed full report and unchanged postrun manifest are still pending. No acceptance is inferred from elapsed runtime or partial passing records. The original two tests and removal preview remain untouched.

The parent requested a reusable after-removal validator; the earlier inline check was preserved as scratch-only `/private/tmp/blygger-validate-clipboard-removal.py`, SHA-256 `9f482663b9b38f22550f7e214f4b92283bcae15e53631d6a41ca48b0c4a3b256`. It performs no writes. `python3 /private/tmp/blygger-validate-clipboard-removal.py --preview` passed against the still-original source. Only after the parent applies the reviewed preview following gate acceptance, running the same command without `--preview` will require the actual file to equal the exact reviewed candidate, two named tests removed, ten retained bodies byte-identical, and no `setClipboard` reference. Creating this scratch validator did not edit any runtime or test source or run a browser job.
