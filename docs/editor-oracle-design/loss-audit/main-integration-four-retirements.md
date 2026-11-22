# Four formatting retirements — merged-source loss audit

Reviewer `/root/loss_format_unit_final`, 2026-11-19. Field Lab's
`SKILL.md` and `reference/instruments/loss-audit.md` were read. The selected
instrument rescans each source and preserves supported material that a
replacement could hide; it does not decide usefulness or authorize deletion.
The four sources were reread separately against a frozen source packet.
This is source evidence only. No browser, build, test, mutation or benchmark
job ran, no installed runtime or product/test source changed, and no active
campaign was polled or modified by this review.

## Exact comparison

Integration checkout: `/Users/kyle.mathews/programs/blygger-studio/.worktrees/oracles-main-integration`.
Both its `HEAD` and `origin/main` resolved to
`2d153071e83261e62be5a1ec926c3f1f3e2fe26a`. The four staged deletions were
reviewed from those exact Git blobs; their absence in the working tree was
not mistaken for missing upstream evidence. Initial and final source copies,
full hashes and source diffs are preserved in
`/private/tmp/blygger-main-loss-q1gqsd2v/`.

The initial manifest SHA-256 is
`c102cd70a8dd9a2a2d89ff9c03726ab30df56130df4a6da21c7efb91a4111a75`.
The final manifest contains 53 files and has SHA-256
`7b5bca546222eb832941b4a11677c109b158ea365af8352ddbd18638a0bcbd5d`.
The initial source packet was retained when transport changes arrived during
review. The final packet includes those changes; their disposition appears
below. No result from a different source receipt is relabeled as a merged
execution result.

| Original file at exact main | SHA-256 | Upstream change since `28b0c8d` |
| --- | --- | --- |
| `test-ui/format-shortcuts.test.ts` | `4187c4b45f9296f33aed8683416353907ecda5cc4e3c5581891f7106c89143cf` | Byte-identical. |
| `test-ui/links.test.ts` | `9e80ad513a6432b5969ccaf1b17e80596a2cd975b54754ae86ce3690b1ba93c0` | Byte-identical. |
| `e2e/format-shortcuts.spec.ts` | `002362f86b4a855feb93c8ed02014db9945a453b618c5fe4df001ba41cd3a89a` | Only the thread-kind click changes from role `radio` to `button`. |
| `e2e/markdown-structure.spec.ts` | `04089a07d25329fa4abb9baf253faa5df21a38586cbe564c4c62af4a1055c50f` | Byte-identical. |

Thus main adds no assertion, source example, formatting action or output
obligation to these files. It changes the actual receiving control for an
existing action. That action is checked explicitly below.

## Source 1: all 91 formatting-unit observations

The full per-assertion trace remains [final-format-unit.md](final-format-unit.md).
Its original-file hash exactly matches this main blob. I compared its frozen
replacement source with the merged source, rather than accepting the older
verdict from prose alone. `format-source-deltas.json` retains that comparison.

| Original family | Observations | Registered merged property, input and checked boundary |
| --- | ---: | --- |
| Single/multiline emphasis, placeholder links and format-key classification | 29 | `editor-emphasis-single`, `editor-emphasis-multiline`, `editor-link`, `editor-key-classification`. Every `source*` construction and the exact key/modifier/platform product remain. Checks retain full resulting source and final selection, or exact command/null. |
| List source/caret/range/declines plus five renderer inputs | 34 | `editor-list-source` and `editor-list-rendering`. The `original*` source/renderer histories retain each original input, EOF/following-line context and omitted optional fields. Checks retain exact edit/null, complete output and selection; renderer checks retain ancestry/content, no code and no `<pre>`. |
| Break/verse, code-block, formula and structural-key classification | 28 | `editor-line-break`, `editor-line-break-verse`, `editor-code-block.default-source`, `editor-code-block.selection`, `editor-formula`, `editor-key-classification`. Original `old*`, empty/source formula and `two breaks` constructions retain all original source/caret inputs and exact HTML/default wrapper boundaries. |

The unchanged files include keyboard registration/model, code-block
registration/model, break model and shared document/check helper. The inline
entry adds prose; its model only adds six surrounding-context constructions
and reach predicates. None replaces an old construction or expected-result
rule. The line-break entry changes a companion reference from Playwright to
the registered browser session oracle.

The list changes extend ordinary parent 99 and parent-padding grammar. All
original source/nesting histories remain. `moveRows` adds an optional override,
but its ordinary model still uses the omitted override, preserving the old
four-space/number-width rule. New nesting inputs are optional and retain the
old `a` parent body, one-space gap, hyphen bullet and shared delimiter defaults.
The existing three-line sublist still takes its old source path. The new
empty-parent branch of `listStructure` does not alter an original nonempty
parent's tree. No earlier renderer input is replaced by merely checking
source indentation.

The registered drivers still call the actual production helper in the browser
through `browserCall`; they record returned values/errors as data and compare
at `result` (or verse's named result). The older marked-string helpers observed
full source and final caret/selection, not a unique replacement span. The
replacement `result` retains those facts and adds edit usability. Break,
code and formula drivers still supply exactly three arguments where the old
helper omitted optional trailing arguments. Inline kinds, list outdent flags
and format-key platform booleans remain explicit. No generated-only chance
stands in for a previously guaranteed original witness.

**Recovered/dropped trace for this source:** no missing or weakened asserted
observation was identified. The earlier representative-history losses in the
historical inline/list audit are resolved by the retained exact `source*` and
`original*` constructions; their historical findings are not deleted here.
This statement is a source-path result, not a current pass or mutant-kill claim.

## Source 2: all 21 links-helper observations

The exact main source was independently rescanned. The registered entry is
`test-ui/editor-links.oracle.test.ts`; legal inputs and independent rules are
in `test-ui/editor-oracles/link-model-oracle.ts`. Each property uses the shared
`histories` registration (100 runs, fixed seed 20261118 and every named
construction), the same model/check as generated histories, and browser
`browserLinkCall`. `compare` checks the complete `return` envelope against
`{ value: expected }`, retaining thrown errors as distinguishable data.

| Original source support | Original observations | Registered input → model/check trace |
| --- | --- | --- |
| Lines 4–8 | Exact cleaned URL with `id=7&page=2`; all 15 tracker occurrences removed. | `editor-url-cleaning`, `rawCases.oldAllTrackers` reconstructs the complete raw URL including www host and original distinct values; `cleaned` projects kept query entries and removal count; `tracker projection` compares both fields. |
| Lines 11–13 | Removing the only tracker removes `?` and preserves `#part`; uppercase `UTM_Campaign` removed. | Same property, exact `trackerFragment` and `trackerOnly` constructions; full URL/count comparison. |
| Lines 16–18 | Tracker-free `%20`, plus query spelling and `ref_id` retained exactly after surrounding whitespace trimming. | Same property, exact `untouched`; no-removal model returns trimmed original spelling rather than canonicalizing it. |
| Lines 21–28 | HTTPS with surrounding whitespace and bare HTTP recognized; prose, FTP and javascript rejected; non-URL and internal-space URL clean to null. | `editor-url-recognition` uses `https`, `http`, `prose`, `ftp`, `javascript` and `lone URL recognition`; `editor-url-cleaning` uses `invalid`, `internalSpace` and exact null. All seven original observations remain constructed. |
| Lines 31–35 | Selected label link; omitted-label autolink; literal label brackets and URL parentheses escaped. | `editor-link-markdown`, `selected`, `omittedLabel`, `oldEscaping`; `markdown` predicts literal serialization; `canonical link source` compares the whole string. The omitted-label construction actually calls with one argument. |
| Lines 38–44 | Selection-only replacement in full surrounding prose; caret after inserted link; removed=2, linked=true; exact linked-selection feedback. | `editor-link-insertion` / `oldSelection` / `insertionPlan` / `insertionModel` checks all returned text/caret/flags. `editor-link-feedback` / `originalSelectedResult` calls actual insertLink then passes its complete actual result to linkToast; `link feedback` checks the exact original message. |
| Lines 45–48 | Bare insertion into `See `; exact insertion feedback; invalid URL returns null. | `editor-link-insertion` / `oldAutolink`, `oldInvalid` checks full result/null. `editor-link-feedback` / `originalAutolinkResult` retains the actual composed helper call and exact message. |

The raw 512-unit arm admits every original URL. Label/target and surrounding
partition bounds admit all original strings and selections; exact original
histories are constructed. The escaping model is independent of production
helpers. WHATWG URL parsing is an explicitly shared host base. The additional
rendered-anchor property is not used to replace an original source assertion.
The toast implementation's new dialog role does not change this original
helper's string-return boundary; this source never asserted physical toast
multiplicity or clipboard delivery.

**Recovered/dropped trace for this source:** no absent asserted helper output,
flag, caret, null result or original composition call was identified. This is
not a browser execution or visible-feedback verdict.

## Source 3: composer, full editor and quick edit

The exact changed main source retains H1's eight and H2's three product
observations. `editor-browser-session` at `editor-session.oracle.test.ts:82`
registers `sessionCases` through the same generated law/model/check. Its
`browser editing history` law compares every named `Step`, exact field set
and field value before the next user action; it also requires the complete
checkpoint sequence and no page errors. This keeps intermediate state from
being hidden by a correct final document.

| Original actions and observations | Legal construction and production driver | Checked preservation |
| --- | --- | --- |
| H1: fill `one two three`, select `two`, B/I/B/I; observe four successive sources. | `composer-desktop` and `composer-mobile`, `sessionPlan` produces all four commands; `sessionDriver` uses real key presses on `#composer-text`. | `format0`–`format3` compare full sources and retained selection/focus to independent emphasis transitions. |
| H1: undo, click thread kind, observe undone source after rerender. | Same native constructions; undo precedes `state` and redo. `session-driver-oracle.ts:65` now clicks actual named **button** `thread`, matching main's sole test delta and current `ToggleGroup`/`Toggle` onClick. | `undo` and `undoneState` each compare the exact italic source. This is not a check performed only after redo, or a DOM-attribute substitute for the kind switch. |
| H1: replace with `see this`, select `this`, K, type `https://x.example/`. | Same constructions; link action then native text input at actual returned caret. | `link` and `target` preserve full placeholder/completed source, selection and focus. |
| H2: create marker item, load full source, select all, I/I; same item's quick edit receives B. | Session `editorToQuick-{desktop,mobile}` keeps full-source I/I and same-item quick selection. `editor-browser-navigation` additionally constructs `original-leave-{desktop,mobile}` and performs actual hard `page.goto('/studio')` with explicit Leave choice before opening that created item's quick control. | Session `loaded`, `format0`, `format1`, `quickLoaded`, `quickBold`; navigation `format0/1`, `quickLoaded`, `quickBold` retain all original values. Generated alphanumeric bodies admit the old `Keys` plus eight-hex marker; `Keys1234` is a guaranteed representative, not a claim of literal UUID equality. |

Navigation's original schedule keeps I/I even when generated neighboring
schedules vary commands. Its model folds source and acknowledged save events;
its driver arranges the item through the disposable API, selects the whole
actual loaded source, and uses the same item's ID after departure. A Router
Link continuation alone is not credited for the original hard-goto action.
The extra explicit unload choice makes the former host premise visible rather
than silently discarding it. Both old viewport classes remain constructed.

**Recovered/dropped trace for this source:** no missing H1/H2 product
observation or changed receiving-control action was identified. Exact login
setup and literal typing-event limitations are retained separately below.

## Source 4: structural keys, preview and toolbar

The main blob is unchanged. H3–H6 remain named native session constructions
through `sessionPlan`, independent `sessionModel`, real `sessionDriver` and
`checkSession`. H3/H4/H5 retain desktop; mobile constructions are additional.
H6 retains both original viewport classes.

| Original actions and observations | Named construction/checkpoints | Checked boundary |
| --- | --- | --- |
| H3: fruit/apples, Tab, focus, type nested pears, inspect nested children, Shift+Tab, undo. | `list-desktop`/`mobile`: `indent`, `sibling`, `outdent`, `undo`. | Full original source after each edit; actual textarea focus; exact ordered/multiplicity-preserving `['apples','pears']` from actual preview `ul ul li`; undo restores pears' indentation after the intervening text input. |
| H4: `Plain prose.`, end caret, real Tab. | `tab-desktop`/`mobile`: `navigate`. | Both unchanged complete source and actual focus departure. Returning null from a helper alone is not credited for focus navigation. |
| H5: exact Tyger line, Shift+Enter, exact second line. | `verse-desktop`/`mobile`: `break`, `verse`. | Exact hard-break source; one paragraph and one br in the actual `#preview-body` DOM. The driver binds preview receipt to item ID and current submitted source, then inspects the committed response. |
| H6: fruit/apples, toolbar indent/outdent/break, type `and pears`, code button, type `let a = 1;`, select first item, impossible indent. | `toolbar-desktop`/`mobile`: `indent`, `outdent`, `break`, `continuation`, `code`, `codeTyped`, `decline`. | All seven old observations retained: exact sources, focus after indent, final code inside the block, existing explanation visibly present, and unchanged first-item prefix. `decline` now also compares the entire unchanged source. |

Toolbar controls are actual `.ed-tools [data-action=md-*]` buttons. Native
Tab/Shift+Tab/Shift+Enter and undo use `keyboard.press`, preserving browser
default focus/history paths. Preview reads real DOM, not independent MarkdownIt
alone. The visible explanation check still locates `[role=status],.toast`,
checks matching text and geometry/visibility, so changing the toast to a
nonmodal dialog role does not remove that original existence observation.
No filtering by `data-limited` or ending state is used for it.

**Recovered/dropped trace for this source:** no missing H3–H6 product
observation was identified. The mobile pane setup now activates the real draft
button rather than reproducing the old test's direct `data-pane` mutation;
that is an additional receiving path, not a missing old output assertion.

## Setup substitutions and observation limits

These are explicit action-level differences; they must not be compressed into
a claim that every historical browser API call is identical:

- Original shared `login` navigates to login, fills the known password, clicks
  log in and asserts the composer is visible. Oracle contexts receive the
  disposable session cookie, then navigate to a real Studio route and wait for
  the relevant textarea to be visible. This retains authenticated editing and
  receiver readiness as setup premises; it does **not** preserve the password
  form interaction as a registered formatting law or establish login UI
  coverage. Similarly, original full-editor visibility is a receiver-ready
  wait, not an added semantic formatting verdict.
- The old literal `keyboard.type` continuations use `keyboard.insertText` in
  the session driver. Both deliver literal text through the browser into the
  real textarea, and every original resulting source/caret consumer remains
  checked. Per-character keydown/keyup traces during those literal strings
  were not asserted originally and are not newly established. All shortcut,
  structural, undo and native focus actions remain actual key presses.
- Old random marker generation and API setup are represented by semantic
  generated alphanumeric bodies and actual disposable API item creation.
  Setup status/visible-box failures stay host/setup failures; they cannot be
  credited as registered law rejection.

These setup substitutions were already part of the adopted receiving design.
This audit does not create a login law, ordinary-test complement, new fixture
policy, or a decision that an unmapped action is useful or expendable.

## Merged transport and upstream UI limits

I built on [the upstream receiving review](../integration-upstream-receiving-review.md),
but did not treat it as fresh execution evidence. Main's gallery build flag
and stub resolver, Toggle-based kind/pane controls, toast role/lifecycle and
new publish helper are real receiving changes. The only changed obligation
in the four original source blobs is the thread button action mapped above.

During this audit the parent applied the reviewed sheets-source transport.
I retained the initial packet, inspected the exact source diff, and refreshed
the final hashes below. `browser-source-oracle.ts` now captures sheets through
a data-only context-served query; `formattingApplicationBundle` embeds those
exact supplied bytes and records a separate sheets descriptor. The browser
driver imports that descriptor's raw source and verifies path/hash, alongside
the normal input/bundle hash checks. This changes no formatting plan, source
model, selection observation or per-step comparison. It is source-binding
plumbing whose runtime and active-mutant fidelity still require the parent's
separate receiving evidence. It is not accepted here merely because metadata
hashes match.

The concurrent workflow changes add a toast ID, sheet-specific dialog count
and diagnostics/ownership. They do not remove an observation from these four
sources: links' original toast boundary is a helper string, and H6 requires
visible existence of the impossible-indent explanation. Existing additional
workflow uniqueness laws still need their own upstream-toast disposition.
No conclusion about duplicate painted messages follows from this audit.

The new publish rewrite/race identified by the upstream review is outside all
four original formatting sources; none contains a publish action. This audit
does not label its coverage gap as closed by held restore, same-item
navigation, broad ownership, or an app bundle's presence. CSS artifact/source
correspondence, gallery/environment cache identity, native engine premises,
OS clipboard and physical-device behavior also remain separate.

## Bounded result and next evidence boundary

No supported source-level loss was found among the **91 formatting-unit,
21 links-helper and 28 H1–H6 product observations**. Their original input
families, source/selection/renderer/null observations and actual app command
paths retain registered law → legal construction/grammar → driver → named
check mappings. The single changed upstream control action is retained.
The setup/action-shape substitutions above are not represented as identical
interaction histories.

This pass reused earlier per-assertion maps, which could favor broad categories
and hide unusual geometry. The controls were rereading each complete original,
checking exact reconstructed literals/argument shapes, comparing the frozen
and merged executable sources, and retaining every delta. The same reviewer
scanned all four sources in sequence with earlier context available, so these
are not four fully isolated fresh-context opinions. No unsupported attribution
to majority agreement or intentional rejection is inferred.

The old-main full campaign is bound to `28b0c8d...` and its own input receipt.
It is not merged-runtime proof. This audit neither deletes a file nor supplies
execution/deletion acceptance. That requires completed appropriately scoped
registered merged receiving/campaign evidence with the exact current inputs,
original constructions/profiles, calibrated comparisons and actual registered
behavioral mutant verdicts; setup/timeouts, reach-only failures, provisional
reports and old-source passes do not substitute for those receipts. The
original full campaign's NUL and completion gates remain attached to that
original campaign.

## Final source identities

| Final packet file | SHA-256 |
| --- | --- |
| `test-ui/editor-session.oracle.test.ts` | `05e19052c5d1bbaa63cf30439d55e971fd468e93d4c793e0ba1be7a746d01d90` |
| `test-ui/editor-oracles/session-model-oracle.ts` | `d6bb8085476ca484670d2abd501bb7322374eb6186bf5561523412aec556d296` |
| `test-ui/editor-oracles/session-driver-oracle.ts` | `4bb5d9f83095cb41641ff59bf53c6903b5a032433c69c81943a40a7c1eab46cb` |
| `test-ui/editor-navigation.oracle.test.ts` | `1f84b4f36ef00f56f3b782736442fa04e0900905c03d6aeba9c190b99111ba43` |
| `test-ui/editor-oracles/navigation-driver-oracle.ts` | `82bf6662cb2ecd74805c7a70683af80cd091e816ecc068cf118910a28ccb45e4` |
| `test-ui/editor-links.oracle.test.ts` | `f56d4a94bf28c7c92b81ff592aae512a0866973a9fe4c684b6d2d4e49fa9052c` |
| `test-ui/editor-oracles/link-model-oracle.ts` | `9af8f1836b794e82d60b3b6bf9e5ff4323e22acf840ac1bbfc522a7a81faa284` |
| `test-ui/editor-oracles/browser-driver-oracle.ts` | `7ffc887f76acc4510275fd1ca72b54d7d98c82a09c180a7aa65b3458ab9ab85d` |
| `test-ui/editor-oracles/browser-source-oracle.ts` | `17eae12af402f69e9aced2d10ac6b87db853070df0a97104fa1f970d17ff01bc` |
| `scripts/formatting-oracle-application.ts` | `8de139484533e2adb15b011282fbf6c620c4eee9f4c76fb5141505087811971b` |
| `src/ui/authoring.tsx` | `4f9f069d43264ebab1ad7329be1b918c8cd7ea89a3f956435970ee976a032025` |
| `src/ui/format-shortcuts.ts` | `87b9635e519f922490df0a31c68935641a76e6c068d4e4e50dbb7e81f070eeac` |
| `src/ui/links.ts` | `04671ef2fb05ac2363a1b0bd23236914bcbbe49d19b10b506cf6cbbcea14292c` |


### Final identity check: launcher-only follow-up

After the final packet, the only changed file among its 53 inputs was
`scripts/formatting-oracles.ts` (now SHA-256 `69c99fa329c2c516cfa06ad239c55b1fe855fadcb7eb31c7f67f883fdf7b3e32`). Its source diff adds
`requireExecutedFormattingOracles` and invokes it after reading a completed
report. It rejects absent/invalid/empty oracle baseline rows and a missing
explicitly selected entry; it does not change oracle discovery, histories,
models, production delivery or checkpoints. The prior wrapper bytes remain in
the final packet and the updated bytes in `launcher-guard/`. None of the
retirement mappings or final source identities in the table changed. This
static follow-up is not execution evidence for the guard or the merged runner.


## Delta addendum: main `764cb40` (2026-11-19)

This is a bounded read-only continuation of the selected loss audit. The
`2d153071` comparison, raw source packet and verdict above are preserved.
Current `HEAD` and `origin/main` both resolve to
`764cb40d15b8062dad70032f262807f4472ec962`. No product/oracle/runtime source
was edited, and no browser/build/test/campaign job was started or polled for
this addendum. The original reference remains untouched.

### New source receipt

Packet: `/private/tmp/blygger-main-764-loss-l29yr_3q/`. Its `receipt.json`
SHA-256 is `ed18ab66e585b6f7e82b8ef1a4dd3bcc2040063008ea03141aa912bcc5f0dc43`.
It binds the new full commit, previous final manifest digest, four new-main
Git blobs and current hashes for the prior packet's 53 files, with current
upstream/configuration files captured separately. `lock-delta.json` retains
the parsed lock-entry changes.

The complete upstream diff from exact `2d153071` to exact `764cb40` names only
`AGENTS.md`, `CHANGELOG.md`, `package-lock.json`, `package.json` and
`src/client.ts`. The changed AGENTS line is release status; it introduces no
new procedure or formatting obligation. The changelog records dependency
updates. Package/client version advances from 0.64.0 to 0.64.1. No oracle,
retirement target, formatter, link helper, Draft module, authoring caller,
control, preview source, model, driver or registration is changed by that Git
delta.

All four retired source blobs are byte-identical between the two commits,
with the same SHA-256 values in the original-file table above. Thus no
original assertion, action or observation was added, removed or altered at
this new base; the button-kind action remains the exact latest-main action.

All prior packet files except `scripts/formatting-oracles.ts` still match
the prior final hash. That wrapper also matches the separately preserved
launcher-guard follow-up **byte for byte**, SHA-256
`69c99fa329c2c516cfa06ad239c55b1fe855fadcb7eb31c7f67f883fdf7b3e32`.
There is therefore no newly observed source drift in a caller, oracle
registration, legal construction, model, production driver or checkpoint
that maps any of the 140 original product observations. This includes all
14 maintained oracle entry files, even where only a subset supplies these
four retirements' preservation routes.

### Dependency delta and its boundary

The lock changes the following dependency versions:

| Dependency | Prior lock | New lock |
| --- | --- | --- |
| `fast-xml-builder` | `1.3.1` | `1.3.2` |
| `fast-xml-parser` | `5.11.2` | `5.12.1` |
| `hono` | `4.13.14` | `4.13.18` |
| `is-unsafe` | `2.0.2` | `2.0.3` |

Other changed package-lock entries retain their versions and differ in
`dev`/`devOptional` installation metadata; the root entry changes version and
dependency declarations. No changed dependency entry other than those listed
above changes version. This inventories the lock, not installed package bytes
or runtime behavior. No install, advisory reproduction or security assessment
was performed by this loss audit.

Hono is on the actual Worker routing/preview/setup path, so unchanged local
source cannot establish that its new runtime behaves identically. The XML
parser and its updated transitive packages likewise change the dependency
input even though none of these four sources directly asserts feed parsing.
No original expectation is weakened to accommodate those updates, and no
new formatting promise is inferred from the changelog's behavior statement.
`package.json` and its lock are captured application-build inputs; a current
run needs its own correctly rebuilt/bound bundle and complete input receipt.

### Delta result and execution limit

The prior **91 formatting-unit + 21 links-helper + 28 H1–H6 product
observation** mapping still applies unchanged at `764cb40`. No supported
additional dropped product observation or narrowed legal history was found
in this delta. Exact-login, literal-text-entry and mobile-pane setup
substitutions remain explicitly limited as in the original audit; they are
not silently promoted to identical UI histories.

This operation could hide a dependency-induced receiving change if source
identity were mistaken for behavior. Its controls are the full Git-path
inventory, per-file hashes and explicit dependency/version inventory; they
establish source continuity only. The separate current-source 14-file CI
candidate at `/private/tmp/blygger-ci-764cb40-e0vnxfbb/repository` was named by
the parent and was not inspected here. Its full baselines, calibrations,
mutant verdicts and unchanged pre/post source/runtime inputs remain pending
execution evidence. Neither the old-main full run, earlier merged receipts,
this source addendum nor a launched candidate grants runtime/deletion
acceptance for `764cb40`.

Current changed-input hashes (working integration source):

| File | SHA-256 |
| --- | --- |
| `AGENTS.md` | `73210e4e30ba7797be91fb087be195d55858c23457427cabad6909a5ce2ccb2e` |
| `CHANGELOG.md` | `9389ec36f40a67c0d3df5640b83459f889b60d5d20d6e33b04fda9ba9f6b31cc` |
| `package.json` | `ff8210ddd579e18f98524e8d94e34be4d87e65a82f8e068496a586de375cf128` |
| `package-lock.json` | `22f0ea10796d0bad364ea0261e4d5d763544bd929ca552c9d6a5375e0098570a` |
| `src/client.ts` | `4960f1d760efd59a61bb90c938078efdb560b23240ae94dc915c677dc5523b8f` |

## Delta addendum: navigation acquisition (2026-11-19)

This source-only continuation compares the applied pagination repair with the
140-observation map above. It preserves the earlier receipts and uses the same
correlated reviewer context; it is not a fresh isolated audit. No browser,
build, test, benchmark or mutation job was run or polled for this addendum.

The frozen packet is `/private/tmp/blygger-acquisition-loss-n37hpy7u/`;
`receipt.json` SHA-256 is
`4a546a0a75e41761eff614a4bbb910142f73052452da8f61ab7f0ba36d4bf65e`.
Against the preceding `764cb40` receipt, the only changed existing input is
`navigation-driver-oracle.ts`; `navigation-acquisition-oracle.ts` is new.
All prior registrations, laws, models, legal histories, checkpoints, seeds,
run budgets and remaining captured inputs retain their bytes. There are still
14 maintained **editor** oracle entry files; the separate receiver split/CI
proposal is not applied.

H2 still performs the actual hard `page.goto('/studio')`, retains the same
created item ID and explicit unload choice, expands that item's actual row,
clicks its quick-edit control, records `quickLoaded`, selects the whole loaded
source, presses real B and records `quickBold`. The driver diff replaces only
the first-page row lookup/expansion with `openNavigationCard`. That helper
waits for real Compose readiness and, when necessary, presses the actual
`load more items` button until the same row is mounted. It neither substitutes
an API result for quick-edit text nor navigates directly to the target editor,
changes its timestamp, reruns a history or retries the target click.

The helper shares the former click's 7-second acquisition budget, caps paging
at 32 clicks and rejects malformed identity, ambiguous lists/rows, absent
controls and missing progress as host acquisition failures. Generated item
IDs satisfy its alphanumeric guard. These bounds and guards do not change a
model expectation or turn a host failure into a law kill. Failure-only API
metadata remains diagnostic; the original error is retained separately as
the aggregate's cause/first member, and outstanding probes join the existing
drain. The applied helper differs from the proposal only by the type-only
`Promise<never>` annotation on its always-throwing diagnostic function.

**Recovered/dropped trace:** no original product observation, receiving
control or legal history was found displaced by this repair. The existing
91 formatting-unit + 21 links-helper + 28 H1–H6 mapping and its explicit
login, literal-entry and mobile-pane limitations remain unchanged. The new
path removes the unsupported first-page acquisition assumption; it does not
establish a new pagination product law.

The separate [navigation receiving record](../navigation-pagination-receiving.md)
reports all 60 navigation registrations twice with no failures/skips, matching
fingerprints, and three registered departure-law kills. It also distinguishes
the forced old-click timeout from a law rejection and records byte-identical
emitted JavaScript for the annotation. Those are received execution claims,
not reruns by this audit. They do not establish full formatting-suite runtime,
full mutation closure or retirement/deletion acceptance. This source comparison
could hide runtime acquisition behavior by treating unchanged checkpoints as
successful delivery; the separate receiving evidence addresses that boundary
only to its recorded extent, and not every diagnostic guard was browser-run.

End-check identities remained unchanged from the frozen packet:

| Input | SHA-256 |
| --- | --- |
| Applied navigation driver | `b93e3dfabb7d28a8724181609af0ff248e17c4f05b9fb305a7afa8d58ddc717a` |
| Applied acquisition helper | `d2e1acce8cff78a9a7b4bbf26c808a1dc2040c5cc6c46163013df0a87fe30693` |
| Proposal repair patch | `d08f9612c0490a14b61da51ba2912b69dfd0cfc662c9ab5bde08fd2e3a0e83c1` |
