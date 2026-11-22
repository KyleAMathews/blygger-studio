# WebKit native undo investigation

Current recommendation: use the acknowledged reference-Undo boundary described
in the final addendum below. The initial single-window pulse was later rejected
by repeated receiving evidence. Navigation page errors were a separate upstream
WebKit defect fixed in r2393. The final registered run uses official r2395 with
an explicit native-executable override; its provenance and limits are recorded
separately. Earlier probe sections remain as historical evidence, not the final
driver recommendation.

Final registered receiving result: **138 session checks pass twice**, zero
nondeterminism, and all **three selected authored challenges** are rejected on
the explicit macOS r2395 host. See [execution and limits](webkit-session-execution.md).
This is a partial mutation campaign, not ordinary Safari or default r2370
coverage. The exact model and formatter remained unchanged.

2026-11-18. Exploratory browser research; these probes are **not** registered
oracle campaigns and establish no mutation kills. No production code changed.

> **Superseded initial recommendation:** the complete registered campaign and
> subsequent stress probes showed that a single window pulse is unreliable.
> Read the receiving addendum below before using the proposed helper.

## Initial finding

The exact preceding-edit undo law can run in this WebKit host. The observed
grouping is sensitive to the macOS Playwright embedder's native event loop.
Advancing that loop between user actions restores one-command undo without
changing the formatter, independent model, expected sources, or action history.

Use a separate, sterile BrowserContext to create and close an `about:blank`
page after setup and each input action. Limit this workaround to Playwright
WebKit on macOS. The real React editor and composer then restore the immediately
preceding formatting edit, on desktop and the iPhone viewport. The blank page
does not receive application scripts, cookies, API calls, or editor state.

This resolves the investigated reproduction. A complete registered session
campaign and its authored mutation challenges must still validate the receiving
claim before it is reported as green.

## What the probes distinguish

Environment: Playwright 1.64.1; WebKit revision 2370 / version 27.2; macOS;
`PLAYWRIGHT_BROWSERS_PATH=/private/tmp/blygger-playwright.3EVERv`.

All scenarios use fresh pages or fresh application contexts. The minimal host
does not import Studio unless explicitly marked production.

| Probe | Result |
| --- | --- |
| HTML/default document source or direct `.value` setup; one native `insertText`; Undo | Returns the initial source, one `historyUndo` event. |
| `.fill`, `keyboard.insertText`, or sequential typing as setup; one native `insertText`; Undo | Returns empty source, two `historyUndo` events. Setup introduced its own native edit. |
| HTML or `.value` setup; B/I/B/I through the real `applyEdit`; Undo | Undoes all four native edits together, four `historyUndo` events. Fixing setup alone is insufficient. |
| Same four edits in Chromium and Firefox | Undoes the last edit only. |
| WebKit blur/focus, toolbar-like button click, arrow movement, DOM reselection, 1.5-second delay | Does not split the observed group. |
| WebKit screenshot, viewport resize, bring-to-front | Does not split the observed group. |
| WebKit blank page creation, or creation plus closure, between commands | Splits the group: Undo restores the exact preceding edit. Reproduces headed and headless. |
| WebKit JavaScript alert between commands | Splits the group in headed mode, not headless. Not recommended as a test transport. |

The setup/boundary matrix has 35 scenarios. The three-engine formatting matrix
has 72 scenarios: three engines × three setup methods × four boundaries × two
command transports. The headed/headless host-boundary matrix has 14 scenarios.
These counts describe probes, not oracle checks.

The actual React application matrix has eight fresh contexts:
editor/composer × desktop/iPhone viewport × unmodified/pulsed host. The editor
loads `one two three` from an item created through the disposable Worker API;
the composer uses the current `.fill` setup. All four formatting key actions
produce the same intermediate sources in both host variants:

```text
one **two** three
one ***two*** three
one *two* three
one two three
```

| Surface | Host | Source after one Undo | Source after Redo |
| --- | --- | --- | --- |
| API-loaded editor, either viewport | No native boundary | `one two three` | `one two three` |
| Filled composer, either viewport | No native boundary | empty | `one two three` |
| Either surface, either viewport | Sterile-context boundary | `one *two* three` | `one two three` |

The 20 before/after boundary observations were identical for source, both
selection endpoints, textarea active-element status, `document.hasFocus()`, and
document visibility. No window/document/textarea focus, blur, or visibility
event was observed. The workaround therefore does not use an application blur,
autosave, rerender, or source rewrite as its mechanism in these probes.

## Why this explanation fits the host

The installed Playwright release pins WebKit base commit
`56453fdfe0b0ca6258c23e6453b34f70b885d13f` in its
[upstream configuration](https://github.com/microsoft/playwright/blob/v1.64.1/browser_patches/webkit/UPSTREAM_CONFIG.sh).
That WebKit's macOS
[`WebViewImpl::registerEditCommand`](https://github.com/WebKit/WebKit/blob/56453fdfe0b0ca6258c23e6453b34f70b885d13f/Source/WebKit/UIProcess/mac/WebViewImpl.mm#L3010)
registers commands with the view's AppKit undo manager. Apple's
[`groupsByEvent` documentation](https://developer.apple.com/documentation/foundation/undomanager/groupsbyevent)
describes automatic run-loop grouping and states that it is enabled by default.

Playwright's macOS key injector constructs a `NativeWebKeyboardEvent` and calls
`WebPageProxy::handleKeyboardEvent` directly; it does not post that key through
the NSApplication event queue. See `WebPageInspectorInputAgentMac.mm` within the
[pinned WebKit patch](https://github.com/microsoft/playwright/blob/v1.64.1/browser_patches/webkit/patches/bootstrap.diff#L16873).
The macOS embedder's
[`windowWillClose:` implementation](https://github.com/microsoft/playwright/blob/v1.64.1/browser_patches/webkit/embedder/Playwright/mac/BrowserWindowController.m#L461)
explicitly posts application-defined native events to advance its event loop.
The fact that blank native window creation/closure changes undo grouping while
DOM focus, pointer, selection, and timing changes do not is strong experimental
evidence for this embedding mechanism. The detailed AppKit grouping mechanism
is an inference from those sources and probes, not a claim based on private
undo-manager introspection.

Linux/WPE has a different receiving implementation:
[`PageClientImpl`](https://github.com/WebKit/WebKit/blob/56453fdfe0b0ca6258c23e6453b34f70b885d13f/Source/WebKit/UIProcess/API/wpe/PageClientImpl.cpp)
delegates to
[`DefaultUndoController`](https://github.com/WebKit/WebKit/blob/56453fdfe0b0ca6258c23e6453b34f70b885d13f/Source/WebKit/UIProcess/DefaultUndoController.cpp),
which stores commands on stacks and removes the last command for Undo. This
supports a macOS-only guard. No Linux browser was run for this investigation.

Actual installed Safari is 27.0 (`21625.1.29.18.28`). Its WebDriver refused
session creation because Allow Remote Automation is disabled. That setting was
left unchanged. Consequently these results establish behavior of Playwright's
WebKit embedder, **not** a reproduction in ordinary Safari. In particular, the
unflushed group-all outcome must not become Studio product policy on this
evidence.

## Recommended oracle transport repair

Keep the current exact model and all existing histories, constructed witnesses,
budgets, source/caret/focus observations, and Chrome/Firefox assertions. Add a
transport helper whose only responsibility is advancing the affected native
host between modeled user events:

```ts
const nativeHost = process.platform === 'darwin' && engine === 'webkit'
  ? await browser.newContext({ serviceWorkers: 'block' })
  : undefined;

async function commitNativeHostEvent() {
  if (!nativeHost) return;
  const blank = await nativeHost.newPage();
  await blank.close();
}

// After a setup fill, before continuing into commands:
await commitNativeHostEvent();

// After each action's immediate observation, before the next user action:
observe(checkpoint, actual);
await commitNativeHostEvent();

// In the surrounding finally block:
await nativeHost?.close();
```

Give the helper an `oracle` filename if it is extracted. Keep it independent of
the SUT and its expected model. Do not focus or navigate the blank page, call
`bringToFront`, install application scripts there, or write the primary
textarea. Use `finally` to close both a partially created blank page and the
sterile context on failure. A boundary creation/closure failure is setup or
transport failure, never a formatting-law failure or a passing observation.

Commit after setup `.fill` as well as native edits; otherwise the first native
formatting edit can still share the setup's undo group. Commit after Undo/Redo
too, because redo registers its inverse commands with the same native manager.
Capture the owed action snapshot before committing, so the transport cannot
replace an immediate source/caret/focus observation with a later one.

This does not erase setup's undo entry. The model's existing bounded histories
must continue to avoid claiming that a synthetic fill clears the host's whole
undo stack. Loading content through the API remains the strongest no-history
premise for whole-source editor witnesses.

Before calling the fix complete, run all session baselines in WebKit with
unchanged law/model inputs, including single-command emphasis/deletion,
interleaved typing, rerender-after-undo, redo-branch discard, loaded source, and
both responsive profiles. Then run the existing authored challenges for
always-direct fallback, native deletion, and document-start formatting. These
challenges must remain distinguishable and retain their existing obligations.
Revalidate this workaround when upgrading Playwright or WebKit.

The repair makes the already modeled event boundary real in the browser host;
it changes no editing law and needs no additional product-law decision under
the approved T2 cross-engine work. An alternative law allowing any prior source
would be weaker: cyclic formatting histories can return to an identical source,
and a nonnative fallback could then pass without undoing anything. A legal-group
model would require explicit native-receipt evidence, complete semantic cuts,
redo restoration, rerender retention and branch-discard laws, plus independent
single-command witnesses. That extra trusted machinery is unnecessary for this
reproduction now that a precise host boundary is available.

Native `execCommand('insertText')` remains a documented editor approach; for
example, GitLab's
[Markdown editor repair](https://gitlab.com/gitlab-org/gitlab/-/merge_requests/84900)
uses it to participate in browser history. This investigation gives no reason
to replace Studio's production editor with a custom history implementation.

## Reproduction artifacts

Temporary scripts and complete raw observations, retained outside the suite:

- `/private/tmp/blygger-webkit-history-probe.mts` and `.json`
- `/private/tmp/blygger-webkit-sequence-probe.mts` and `.json`
- `/private/tmp/blygger-webkit-boundary-probe.mts` and `.json`
- `/private/tmp/blygger-webkit-react-undo-probe.mts` and `.json`
- `/private/tmp/blygger-safari-undo-probe.mts` and `.json` (disabled automation receipt)

Run from this worktree, for example:

```sh
PLAYWRIGHT_BROWSERS_PATH=/private/tmp/blygger-playwright.3EVERv \
node /private/tmp/blygger-webkit-react-undo-probe.mts
```

The React probe uses the existing disposable `formattingApplication` helper,
real compiled production formatting/link modules, real React listeners and
native keyboard undo. It does not substitute model answers into the browser.
Its first setup attempts exposed a temporary-probe global-install mistake;
the completed matrix explicitly assigns both bundled modules on `globalThis`,
matching the existing oracle transport. Failed setup attempts supply no product
findings.


## Receiving addendum: single-pulse rejection and separate navigation defect

The complete registered WebKit campaign subsequently finished **131 passed,
7 failed** (`build/formatting-oracles/session-mixed-webkit-native-boundary/`).
The baseline was not green, so its mutation challenges did not run. In
particular, repeated empty-bold and intra-word-bold histories sometimes undid
both the formatting edit and synthetic setup fill, restoring API-loaded `two`.
This invalidates the initial claim that one blank-window pulse supplies a
reliable event boundary. The unchanged exact history law detected the race.

An isolated 240-case stress probe then compared 60 fresh contexts per variant:

| Native boundary | Grouped-undo failures |
| --- | --- |
| One blank page create/close | 3 / 60 |
| Synchronous `queryCommandEnabled('undo')`, then one pulse | 3 / 60 |
| Two blank page create/close pulses | 0 / 60 |
| Synchronous undo query, then two pulses | 0 / 60 |

Zero failures in the double-pulse sample does not prove completion. Adding a
second blind pulse is not yet a receiving repair. Raw script/observations:
`/private/tmp/blygger-webkit-boundary-stress-probe.mts` and `.json`.

There is also a source correction to the original mechanism explanation:
Playwright's explicit native `postEvent` calls are in the **headed**
`BrowserWindowController::windowWillClose:` path. The headless
[`AppDelegate::webViewDidClose:`](https://github.com/microsoft/playwright/blob/v1.64.1/browser_patches/webkit/embedder/Playwright/mac/AppDelegate.m)
closes/removes the window without those explicit posts. Single-pulse success
in headless mode therefore depends on incidental native events. A completed
Playwright page-close command does not itself acknowledge an AppKit undo-group
boundary.

A targeted registered replay, with the baseline laws unchanged, isolated a
second failure class at `editorToQuick-mobile`:

```json
[{"name":"Fetch API cannot load http","message":"/127.0.0.1:52061/api/preview due to access control checks."}]
```

Replay receipt: `build/formatting-oracles/webkit-transition-diagnostic/`, seed
20261118, path `0:19:4`, property `editor-browser-session`, unit
`random seed: editorToQuick-mobile`, authored challenge
`authored:document-start-formatting`. The baseline failed `errors=[]`; the
challenge was blocked and supplies no mutation kill.

This matches upstream [Playwright issue #44015](https://github.com/microsoft/playwright/issues/44015):
WebKit r2370 reports caught outgoing-document fetch cancellations as page
errors during navigation. The matching upstream regression coverage is
[PR #44090](https://github.com/microsoft/playwright/pull/44090), and the browser
fix is [playwright-browsers PR #2698](https://github.com/microsoft/playwright-browsers/pull/2698),
rolled in WebKit r2393 by [PR #44072](https://github.com/microsoft/playwright/pull/44072).
The registered diagnostic is evidence of that browser defect, not evidence
that Studio's preview endpoint has broken CORS. Keep the exact `errors=[]`
law; filtering this error would hide the receiving defect rather than repair
it.

### Concrete official browser upgrade candidate

Official npm versions pages list
[`@playwright/test@1.66.0-alpha-2026-11-18`](https://www.npmjs.com/package/%40playwright/test?activeTab=versions)
and the matching
[`playwright-core` canary](https://www.npmjs.com/package/playwright-core?activeTab=versions).
The published
[test package manifest](https://unpkg.com/@playwright/test@1.66.0-alpha-2026-11-18/package.json)
depends exactly on `playwright@1.66.0-alpha-2026-11-18`. The published
[core browser manifest](https://unpkg.com/playwright-core@1.66.0-alpha-2026-11-18/browsers.json)
pins **WebKit r2395 / 27.2**, which includes the r2393 navigation fix. It also
pins Chromium r1255 / 159.0.8154.6 and Firefox r1578 / 159.0. Stable Playwright
1.65.1 still pins r2388 and cannot supply that fix.

This research did not install the canary. Both published manifests were read
with TLS verification enabled and saved as
`/private/tmp/blygger-playwright-canary-package.json` and
`/private/tmp/blygger-playwright-canary-browsers.json`. The configured corporate
npm proxy does not yet expose the current public versions; direct registry
reads failed, while the public unpkg artifact reads succeeded. Installing an
official pinned canary remains a dependency decision for the parent task; the
navigation fix must not be claimed until the registered receiving run passes
on its actual r2395 binary.

### Observed native boundary, replacing the blind pulse

A separate native textarea supplies an observable completion witness. Proposed
API: `nativeHostBoundary(browser).commit(primaryPage)`; all other hosts return
immediately. The helper owns its sterile BrowserContext, reference page, blank
pulse page, retry receipts and cleanup. It owns no application semantics.

For an affected commit, first execute
`primaryPage.evaluate(() => document.queryCommandEnabled('undo'))`. The pinned
[`WebEditorClient`](https://github.com/WebKit/WebKit/blob/56453fdfe0b0ca6258c23e6453b34f70b885d13f/Source/WebKit/WebProcess/WebCoreSupport/WebEditorClient.cpp#L330)
sends native edit registration asynchronously, and `canUndo()` sends the
synchronous `CanUndoRedo` query on the same page connection. The query is an
ordering barrier for registration; the Boolean answer is not an expected
product value and must not decide the product oracle result. This source-based
ordering argument and the observed reference receipt jointly support the
proposed host boundary.

Then attempt the following at most five times, with a fresh reference page per
attempt:

1. Set only the sterile page's HTML to `<textarea>0x0</textarea>`.
2. Focus its textarea, select `[1,2]`, execute native `insertText` with `A`, then
   synchronously query undo availability. Reference source is now `0A0`.
3. Create and close another sterile blank page to provoke a native event.
4. Select reference `[1,2]`, execute native `insertText` with `B`, synchronously
   query undo availability, then execute native Undo in that reference document.
5. Read its real source. **Only `0A0` acknowledges the boundary.** `0x0` means
   both commands still grouped: close the reference and retry. An unexpected
   value is an explicit transport failure. Close every reference/blank page in
   `finally`, preserving any original error alongside cleanup failures.

A successful reference Undo establishes that the native loop advanced after
its first command registered, which follows the primary registration barrier.
The reference and primary view have separate native undo managers on the same
AppKit event loop. The helper therefore observes host progress without reading
or changing the application's expected source, caret, undo stack, or history
model. It does not use elapsed time as completion evidence.

On exhaustion, throw a native-host transport error with engine, JS package
version, actual browser version/revision override if present, bound and all
reference receipts. Never continue as though the boundary happened; never
count this failure as a formatting-law failure or mutation kill. The helper
should retain machine-readable per-attempt receipts for replay diagnostics.
The five-attempt cap is a transport retry budget, not an editing law; report
any future exhaustion so it can be investigated rather than silently raising
it. Static review and the complete receiving campaign must still evaluate the
implemented helper.

Exploratory receiving evidence on the existing JS 1.64.1 / WebKit r2370 host:

| Probe | Result |
| --- | --- |
| Reference negative control, no window pulse | 30/30 Undos returned `0x0`; every false boundary was rejected. |
| Reference with one window pulse | 27/30 returned `0A0`; 3/30 returned `0x0`, detecting the pulse race directly. |
| Guarded primary fill + bold + Undo, fresh contexts | **150/150** restored `one xtwoy three`, one real edit. |
| Required guarded boundaries | 450 acknowledged; 103 rejected attempt receipts, across 85 retried boundaries; maximum 4 attempts. |
| Real React editor/composer × desktop/iPhone viewport | All 4 scenarios restored `one *two* three` after B/I/B/I + Undo; Redo restored `one two three`. |
| Primary before/after boundary snapshots | All 450 stress boundaries and 20 React snapshots preserved source, both selection endpoints, active element, document focus and visibility; no observed focus/blur/visibility events. |

The actual React probe uses the disposable real Worker application, API-loaded
editor content, filled composer content and real native format keys. These
remain exploratory probes, not registered oracle campaigns or mutation kills.
Their exact scripts and raw receipts are:

- `/private/tmp/blygger-webkit-witness-probe.mts` and `.json`
- `/private/tmp/blygger-webkit-witness-calibration-probe.mts` and `.json`
- `/private/tmp/blygger-webkit-react-witness-probe.mts` and `.json`

No production or registered campaign input was changed in this follow-up.
The sole registered replay remains the explicitly failed navigation diagnostic
above. This evidence recommends implementing and reviewing the witnessed
boundary, then rerunning every existing WebKit baseline and authored challenge
unchanged. It does not claim the complete session campaign is already green.

### Native-only r2395 experiment when package registry access fails

`executablePath` is an official launch option, but the
[Playwright API documentation](https://playwright.dev/docs/api/class-browsertype#browser-type-launch-option-executable-path)
guarantees its bundled browser versions. Launching the exact official r2395
native archive through existing JS 1.64.1 is therefore a reasonable **explicit
compatibility experiment**, not a matched-version upgrade or a compatibility
guarantee. The Playwright Node client and its server remain the same package;
there is no remote `connect()` major/minor handshake here. Native protocol
compatibility still needs actual validation.

On this macOS 26 arm64 host, the existing registry map uses
`builds/webkit/2395/webkit-mac-26-arm64.zip` on Playwright's official CDN mirrors.
Keep the archive/extracted browser in a separate temporary location. Record the
full archive URL, SHA-256, actual executable, JS version, native revision and
complete campaign command. Do not replace the installed r2370 directory or
mislabel the run as Playwright 1.66. First validate launch, new context, routing,
real keyboard input, navigation and disposal; then run the unchanged registered
session baselines and authored challenges. Keep `errors=[]` exact. Prefer the
matched official 1.66 canary dependency when registry access recovers.
