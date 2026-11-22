# Formatter import transport review

2026-11-19. Reviewer `/root/review_formatting_coverage`, with independent source and trusted-install-boundary judgment by `/root/review_receiver_transport`. This records the accepted transport delta against integration HEAD `764cb40d15b8062dad70032f262807f4472ec962` plus the exact uncommitted source hashes below, using installed `@tanstack/oracles@97a4e7a`. The review/design/evaluate-review skills, checklist v1 and glossary were read. Root authorized integration of the adapter after these controls; this review changed no product source, laws, models, histories, seeds or budgets.

## Disposition

The adapter is accepted for exact incoming formatter source that imports installed packages, with the existing pinned-install assumption. It preserves the three existing no-import transforms byte-for-byte. The imported branch supports the current formatter's nine stable exported functions and the receiving drivers' mutable observer facade. It does not establish arbitrary live-rebound ESM exports, arbitrary local imports or universal build-environment hermeticity.

The completed controls below establish source transport and one registered browser receiving route. They do not establish the parser proposal's product correctness, a complete fixed/random campaign or unsampled gap closure. Production remained unchanged throughout this review; oracle-first production RED/GREEN remains separate root work.

## Frozen identities

The source and driver rows are the exact integrated adapter. The browser controls used patch `32350707bc4ed6fa7bfee097e69e5056b1b2e22e3d46c4f783536a5b69650d5b`; final patch `47b569622155601371877d7b1a82840a901c4194c9eff830744228a4fa2dc204` corrects only comments in the driver. TypeScript transpilation with `removeComments: true` produces identical output for that tested driver and the final integrated driver. The helper bytes are identical.

| Input | SHA-256 |
| --- | --- |
| `test-ui/editor-oracles/browser-source-oracle.ts` | `4056c22a4282a0f2e3ca5766d516ff9a5cfb7be3f3729932f916a92cebffff5b` |
| `test-ui/editor-oracles/browser-driver-oracle.ts` | `0c36088a2e694d16c3ee10474ce599cfc0dc2fc98851f77e8d49e8c4678b5b90` |
| `test-ui/editor-receivers.oracle.test.ts` | `b443b6abbc0f682f9fe43eba5679f7f968a0466407c18232d379fccc92ad9df8` |
| `test-ui/editor-oracles/receiver-model-oracle.ts` | `1d4f563fd32c7203da0634d7b717dcf8d98984689e6fbfd0610329d6a5caaf73` |
| `test-ui/editor-oracles/receiver-driver-oracle.ts` | `a50f521926a04106045b9fbfea2682d644dd1496b57c7d4a78465ba058ffb088` |
| Unchanged production `src/ui/format-shortcuts.ts` | `87b9635e519f922490df0a31c68935641a76e6c068d4e4e50dbb7e81f070eeac` |
| Unchanged production `src/ui/links.ts` | `04671ef2fb05ac2363a1b0bd23236914bcbbe49d19b10b506cf6cbbcea14292c` |
| Unchanged production `src/ui/draft.ts` | `cc3ee87d1e7233a77ae1a8ca5c395455efe5e1a65b9b209b1166e7d990d054ae` |
| Scratch parser candidate `parser-after.ts` | `a88dd547951baf241c0cb624e101f31b85c635333e9c441ccdacdf35fd440c26` |
| `package.json` | `ff8210ddd579e18f98524e8d94e34be4d87e65a82f8e068496a586de375cf128` |
| `package-lock.json` | `22f0ea10796d0bad364ea0261e4d5d763544bd929ca552c9d6a5375e0098570a` |
| Installed `oracle-gaps/check.mjs` | `d2fce1610ab8bf4c61f6bd7bb1a567428cab062e48694cf44d63885256e2a247` |
| Installed `oracle-gaps/capture-setup.mjs` | `90edec7319bada85bdbcb7933a859bb7034623bb61f6daf375f0bc54af0d473a` |
| Installed `oracle-gaps/evidence.mjs` | `ca26db77db05edc5d419ce8332a4125c5aa8b0687de24a6b6db34cca71b01883` |

The task-local packet is `/private/tmp/blygger-supplied-formatter-adapter/`. Its frozen `packet-manifest.json` hashes 67 artifacts and has SHA-256 `9fb5036d7edf3a311514d5847b8a660e9893ca8e38bff167fa01c767a8653f25`. This versioned record preserves the decisive observations and artifact identities; the scratch paths identify the retained raw evidence, rather than replacing the observations with a pointer.

| Receipt within that packet | SHA-256 |
| --- | --- |
| `ACCEPTANCE.md` | `fcab83eb40020027f481eb416a2b7cc982720f32c6642b299fe798348a7324eb` |
| `integration-verification.json` | `2588ee941a582a9ede9f1acfb3aa37b15916089ef6048452c2f14abfcf3b916f` |
| `candidate-proof.json` | `6038393d06a535db0092939222d8675432695587dd14e07989267cb83b5f788c` |
| `observer-red.json` | `58078244cab2bb910969d50e0c6189b23219198d0575f9c72ecd022e75580531` |
| `observer-green.json` | `2ab1825f172d3e8eae58d3dfa9907f1338a105edc9a040c8f4cd7d07c71bed4b` |
| `browser-receipt-5/summary.json` | `67dc00506383884768c5eef2c84fbdf0eb273d2691a05a817b73efad772c83e7` |
| `browser-receipt-5/test-output.log` | `3ee524afc6d6eb5ed28af3981c062a4cf1409519fb91e3a44e9048ec87b5dcd4` |
| `browser-authored-mutant-receipt/summary.json` | `4e3462d4a388593a6b95893bdcae80b4841ef9649d4561325ab927d038004a2b` |
| `browser-authored-mutant-receipt/test-output.log` | `1f3f0900dc838cc7e355b1db51e9771146e8de5a5ca2aca6f0ecb3638b25d808` |
| `vite-browser-receipt.json` | `20ed2fa15b303a657ba041cbd8614f56cf4dc50daa2bd35884f52c9bfbb3b706` |
| `pinned-cache-control/receipt.json` | `a0abc626749c4a35302dccc865489099f4d21a08dadfbdf192ec69d51541796b` |
| `pinned-cache-control/pristine/results.json` | `f229b1a0ce4e851ee2a4076bdfafdc472348c85d42e99b2e5da1cd625bf799f8` |
| `pinned-cache-control/dependency-edit-warm-cache/results.json` | `2e0d9384f14c515630aca676619b4b17bff4979f8d5524f1373a34607c15144a` |
| `pinned-cache-control/dependency-edit-without-evidence-reuse/results.json` | `5dc8d79b63ea50dca7a7781c0228d2fba88ebdeab12197c951ef229bb4d3d022` |
| `pinned-cache-control/restored-warm-cache/results.json` | `838782a400bf4df12b232979784c5ecf87362d5322712e22ec65a441e9bf3029` |
| `pinned-cache-control/store/evidence.json` | `c5ac9a303cc08f4b0753c3220936328d56a1630189c527bb7d431efc373dafce` |

## Exact incoming source and dependency transport

The plugin passes the exact `code` argument Vite supplies to `formattingModuleFactory`; it never rereads owned formatter source as a dependency fallback. The no-runtime-import branch retains the original TypeScript CommonJS factory and whole transformed output. The imported branch bundles the incoming bytes through esbuild stdin, resolves imports from the original formatter directory, and permits only real installed package paths. A future local owned-source import fails as a setup error until its own supplied-source transport exists.

The factory records its emitted SHA-256, the exact supplied-source path/hash, all actual dependency JS/MJS bytes and ancestor package manifests, plus root package/lock bytes. The exact current parser closure has 76 dependency code files, seven package manifests and two root configuration files: 85 checked disk inputs. Metafile accounting distinguishes the supplied source from those inputs. The unchanged real application delegates still forward each call to `globalThis.__oracleSut.<name>`.

The actual worker verifies the bundle and current dependency hashes before consuming an imported factory. These checks detect stale loaded factories when execution occurs. Installed dependency reads are deliberately excluded from the pinned runner's reusable fs evidence; only the root manifest/lock and ordinary project inputs participate through that mechanism. This is the existing trusted-install boundary discussed under ADAPTER-002 below.

### Source changes and active schema through one real Vite/browser instance

The control uses installed `instrument`, an actual Vite server and its public invalidation API, the exact adapter helper, and the actual unchanged browser installer in Chromium. The incoming instrumented TypeScript and Vite-lowered input are different identities and are retained separately. The installed instrumentation output hash is `7797d3ecd13172a32ae71bef5e8e5fc3f8e0eb361d86eeaa690829bea35e7b0e`; the adapter's exact post-transform input hash is `8ade5c455e0f4a10528b3e17a7b735a6685c20e1612b8510679030d3c5328288`.

| Stage | Vite loads/transforms | Browser observation |
| --- | --- | --- |
| Initial and warm | 1/1 for both; same transform-result object | Tab → `indent`; list witness inserts nine leading spaces; 247 helper calls. |
| Same cached factory, schema 365 active | 1/1 | Tab → `null`; 249 helper calls. |
| Same cached factory, schema inactive again | 1/1 | Tab → `indent`; 247 helper calls. |
| Authored incoming source removes `sameListContainer` alternative; public module invalidation | 2/2 | List witness inserts seven leading spaces; 110 helper calls. |
| Restore original incoming source; public module invalidation | 3/3 | Original factory/hash and nine-space insertion restored. |

The original factory SHA-256 is `2ba47a265b1dde81b95f4956eb55bfe34ef88ff3cbee5cc4dc0a603c1244f56e`; the authored source factory is `66a3c18a38db3ab8ffca62d55f3af3e072a1b39243d0c6e0503a114300fc5bd2`. Authored instrumented-source hash is `2d2a77f9fe103487a479c8d7d27d76d45c7506d4c5ef9f334077e3b91d123c04`; authored exact adapter-input hash is `0d518583d0733e0f58282bd037db08ecb8aa74b0ff1fc74ee9e795040ba13635`. The witness is `"-\n\t100. a\n   - b"`. These controls demonstrate transport distinctions; they are not list-law judgments or registered mutant kills.

## ADAPTER-001: mutable receiving observer facade

The first proposed imported branch returned esbuild's getter-only export namespace. Existing picker, traversal and bracket receiver drivers temporarily replace `sut.onFormatKey`, forward the original function and restore it. The real application delegate reads that property on each call. Returning a namespace broke this existing driver contract even though each export remained callable.

The rejected factory, exact parser instrumentation, actual browser installer and actual extracted bracket observer callback produced `TypeError: Cannot set property onFormatKey of #<Object> which has only a getter` in both strict assignment/restore and the actual observer callback. This is a source-control setup failure, not a product-law RED or mutant kill. The initial proof missed it because it never varied export mutation.

The repair returns `{ ...module.exports }`: one writable facade retaining the same nine stable function references and closures, shared by `__oracleSut` and the capture facade. Those exports have no internal rebinding. Replacing a facade property leaves module-local function bindings intact, matching the prior TypeScript CommonJS behavior. The Node/source GREEN executes observer → original delegate → exact restoration; subsequent delegation bypasses the removed wrapper and instrumentation continues, 9→12 helper calls. It does not infer native delivery from controlled event flags.

### Real native receiving witness and registered law rejection

The independent model is the source/range supplied to formatter entry. The existing law, `actual bracket formatter receipt`, preserves that source/range and textarea focus after an actual bracket-picker Enter arrives already consumed. Its authority is Kyle Mathews' adopted T4 picker/focus/readonly decision dated 2026-11-18 and the receiver sources named in the unchanged oracle. The checkpoint is `delivered`; the observer records inputs at `entry` before calling the original formatter.

A disposable actual Worker/React application with the exact parser candidate and corrected adapter passes this unchanged registration:

```text
editor-browser-bracket-receiver > fixed seed 20261118: Shift+Enter-false
baseline: passed=1 failed=0 skipped=231
reach: Enter=0 Shift+Enter=1 actualBracketEntry=1 desktop=1 mobile=0
```

The native event is trusted and prevented in both React and its native event before formatter entry. The same unmodified model, driver and check reject the existing authored mutant `authored:receiver-bracket-consumed-gate`, which removes only `event.defaultPrevented` from the early return. The actual picker completes its input first; the mutant then appends an extra break. The failure is:

```text
OracleViolation: editor-browser-bracket-receiver
checkpoint: delivered
law: actual bracket formatter receipt
difference: delivered.value
history after shrinking: {"mobile":false,"key":"Shift+Enter","body":"a"}
```

The raw authored-source challenge has SHA-256 `d17041b4f91421b015582cf989ee92cfcbc6468332db5e96bcbc97e62a8f69cb`; the copied source is restored to candidate `a88dd547…`. The authored spec hash is `09600a3e7f0fa0c19383fbfc16496555d420e052f88e2770a91a771b21fe1ab1`.

The same selected baseline/mutant also runs through the exact installed pinned runner, not a recreated classifier: `openSession.check`, actual `diskStore`, one context, seed `20261118`, source `src/ui/format-shortcuts.ts`, `--only authored:receiver-bracket-consumed-gate`, and the selected registration above. Run identity is `d29ac07aa66a`. It reports `provisional=false`, zero nondeterministic keys, baseline `passed=1 failed=0 skipped=231`, and the authored key `outcome=killed`, by that registration, law `actual bracket formatter receipt`. The cold check computes three units: the two unmutated passes and authored mutant result. This is a registered assertion kill for that key. It does not establish the random campaign, other 231 registrations or a full mutation campaign.

## ADAPTER-002: installed dependency bytes and warm evidence reuse

The initial new comment and README incorrectly claimed all dependency reads entered the pinned runner's capture inputs. Installed `capture-setup.mjs` lines 280–340 explicitly excludes `/node_modules/`; `check.mjs`'s global identity uses framework files, root package/lock/configuration, Node and settings. The wording was corrected. Current code says that worker execution verifies installed bytes, while root manifest/lock reads enter ordinary evidence.

This revealed an actual cache boundary, rather than a hypothetical risk. The copied `markdown-it/lib/parser_core.mjs` is changed by injecting a throwing control at `Core.prototype.process`, while root package/lock, owned source and configuration stay fixed. The exact installed runner's session and actual evidence store remain open. A second actual `memoryStore` check deliberately prevents evidence reuse without replacing the warm context:

| Check | reused | computed | Actual result |
| --- | ---: | ---: | --- |
| Pristine, actual diskStore | 0 | 3 | Selected baseline passes twice; nondeterministic=0; registered authored gate kill. |
| Dependency edited, same warm session/diskStore | 3 | 0 | Prior green baseline and prior mutant result reused; no verifier executes. |
| Same edited dependency and session, actual memoryStore | 0 | 1 | Setup failure: `Stale browser oracle application input: …/node_modules/markdown-it/lib/parser_core.mjs`; provisional baseline. |
| Dependency restored, original diskStore | 3 | 0 | Prior green evidence reused again. |

The dependency's original SHA-256 is `d6789a1f7ef8ad05a64114b873ca18b4b5c8245fee02d2d7559a20bba93858ec`. Root package/lock and preserved sources match before/after. The copied dependency is restored. The control process exits 1 because the intentional nonreusing stale-input stage sets the runner failure exit code; its outer receipt records no thrown control error and no cleanup error. That stage is a setup failure, never a law RED or a kill.

The separate Vite/browser control confirms an `addWatchFile` edge exists for the dependency. Default watching reports no node_modules event, so the old transform remains cached and its metadata verifier rejects it when execution is attempted. Public `moduleGraph.onFileChange(dependency)` rebuilds the importer; its new factory and dependency hashes reach the browser, which sees the injected error. Restoring bytes restores the original factory. Graph invalidation evidence does not establish evidence-cache invalidation.

### Prior authority and disposition

This is the already declared pinned-install boundary, independently checked by `/root/review_receiver_transport`:

- [receiver-transport-design.md](receiver-transport-design.md), the invalidation inspection paragraph and RT-001 implementation receipts, explicitly assume pinned node_modules installation/root lockfile while still verifying installed values during execution.
- [receiver-transport-review.md](receiver-transport-review.md), limits paragraph, states: “A change entirely inside `node_modules` with an unchanged lockfile is outside the demonstrated warm-cache invalidation boundary.” It also stated that no actual pinned daemon cache replay had yet run. The new actual session/store control supplies that observation and preserves its unfavorable result.

The runtime disposition is `accepted-design` under this prior assumption, not a claim that stale evidence is impossible. The misleading new capture prose is corrected. Root accepted the adapter on that existing boundary; no derived dependency digest, package mutation, private cache access or new framework mechanism was introduced.

The [operator instructions](../editor-oracles.md) now require installed dependency bytes to remain fixed for a warm session. After manual installed-package edits, end the retained session and run cold without reused evidence, or reinstall the pinned dependencies. The default wrapper launches a cold runner; `--daemon` retains a session and evidence. Restarting only Vite while keeping that store does not invalidate cached verdicts. This documents the declared operational prerequisite and the new observed witness; it does not close the framework limitation.

## Preservation, failures and cleanup

`integration-verification.json` executes the integrated helper against current formatter, links and draft inputs. For all three, `factoryByteIdentical=true`, `transformedByteIdentical=true`, and `metadataAbsent=true`: both the original factory string and the entire appended transformed module are unchanged in the no-import branch. Root package/lock and all three product helper hashes remain unchanged.

The completed real browser controls use the matching installed Chromium 1248 runtime at `/private/tmp/blygger-playwright.3EVERv`. Prior attempts are retained as diagnostics: esbuild's service started before a changed working directory; sandbox loopback was denied; the default browser path was absent; an unescaped `+` in the selector executed zero tests. None is credited as law evidence. The completed baseline and authored challenge record actual execution, rather than relying on process exit zero.

All completed browser, Vite and pinned-session controls await close and restore their copied formatter/dependency; `cleanupErrors=[]`. This establishes those close receipts, not independent per-browser PID reaping. `./node_modules/.bin/tsc -p tsconfig.ui.json` passes after integration. Diff whitespace checks pass for the touched paths. The repository defines no lint script; no lint rule was disabled. No new tests were run merely to version this record.

## Checklist v1 outcomes for this harness delta

The applicable scope is transport preservation and the selected receiving evidence. This is not a complete audit of every law in the receiver file.

| Requirement | Applicability and outcome |
| --- | --- |
| ORC-001 | Applicable to the reused comparison: exact existing law/authority/checkpoint retained; trusted-install assumption traced to prior design/review. No new product promise. |
| ORC-002 | Applicable: model and expected results unchanged; adapter transports production bytes and does not compute expected output. |
| ORC-003 | Applicable to changed driver mechanics: source/factory/dependency distinctions and observer facade are explained; existing law/model/history/check remain distinguishable and unchanged. |
| ORC-004 | N/A to a grammar change: no arbitrary, resolver, validity predicate, filter, bound or construction changed. The selected diagnostic explicitly skips 231 registrations and is not a domain narrowing or full-campaign claim. |
| ORC-005 | Applicable: actual application/picker/native key reaches formatter entry and delivered comparison; manual transport output controls remain separate from law results. |
| ORC-006 | Applicable to transport acceptance: existing authored consumed-key mutant is rejected by the named registered law at delivered.value. Stale metadata and rejected namespace failures are classified setup failures. Existing checker calibrations were unchanged and not rerun in this selected control. |
| ORC-007 | N/A to changing an important generated property: no property/generator/budget/seed/check changed. The selected control is not evidence that full fixed/random campaigns passed. |
| ORC-008 | N/A: no model state was introduced, removed, combined or split. Writable facade allocation is transport machinery, tested via existing observer assignment/call/restoration. |
| ORC-009 | N/A to a changed model vocabulary: no production concept was combined/split in a model and no model-only term added. Supplied source, installed input and application delegate are named separately in transport metadata. |
| ORC-010 | Applicable: exact source identities preserved, original/setup/cleanup classifications distinct, allocated controls closed and copied files restored. Actual dependency-cache limit retained explicitly. |
| ORC-011 | N/A: this transport delta adds no semantic model/classifier shared with production and proposes no new semantic expected result requiring another formulation. Arbitrary live export binding remains unestablished, rather than silently assumed. |
| ORC-012 | Applicable to acceptance claim: this versioned record binds the reviewed HEAD+delta to exact source/receipt hashes and records all 16 outcomes. It makes no full-oracle or product bug-class closure claim. |
| ORC-013 | N/A to a reusable product boundary-law claim: no conditional/range law was added or changed. Active schema and nine/seven-space results distinguish source transport modes only. |
| ORC-014 | Applicable: the real application supplies trusted consumed native bracket input to the same unchanged model/check. Other keys, viewports, hosts and surfaces remain outside this single receiving witness. |
| ORC-015 | Applicable to changed driver transport: the selected unchanged construction reports actualBracketEntry=1, Shift+Enter=1, desktop=1. Other declared state counts are not claimed; no reach predicate was weakened. |
| ORC-016 | Applicable preservation check: no ordinary tests, concrete expected answers, histories or campaigns were added to an oracle file. Diagnostic programs remain task-local; maintained tests still register only through oracleProperty. |

The design-grammar triggers were checked: this delta adds no laws, changes no model and follows no gap campaign leaving three new gaps in a function. None fires for this harness-only delta. Earlier broad design responsibilities and final production/campaign acceptance remain root work.
