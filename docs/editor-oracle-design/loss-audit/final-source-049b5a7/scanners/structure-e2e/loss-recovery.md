# Fresh source-only recovery: markdown structure browser test

Frozen candidate: `049b5a7bf9661a22ff4cee31b156b7dd2cbee194`. Original: `scanners/structure-e2e/latest-markdown-structure.spec.ts`; authority copy is byte-identical (SHA-256 `04089a07d25329fa4abb9baf253faa5df21a38586cbe564c4c62af4a1055c50f`).

**Bounded result:** all 17 original formatting assertion sites have guaranteed constructed histories, actual browser receivers, recorded public facts, and a registered comparison in the candidate. No supported formatting-observation omission was found. The browser login/composer-arrival setup assertion is absent from this replacement, and two receiving premises change as documented below. These are source findings, not runtime passes or a decision about deleting/restoring tests. Runtime/full16 readiness remains pending.

The supplied Field Lab Hidden-signal recovery assay, complete oracle review skill, checklist v1, oracle glossary, candidate AGENTS.md, and complete project glossary were read. Only this original and its authority copy were read; sibling originals/scanners and prior audit documents were excluded. No browser/build/test/install/remote job was run.

## Registered receiving route

`editor-browser-session` / law `browser editing history` is registered at `candidate/test-ui/editor-session.oracle.test.ts:81-88` and `candidate/test-ui/editor-oracles/property-registry-oracle.ts:18,36`; `vitest.oracle.config.ts:3-13` includes the inventory. Literal `list`, `verse`, `toolbar`, and `tab` desktop/mobile cases in `candidate/test-ui/editor-oracles/session-model-oracle.ts:18,24-25` are all constructed by `candidate/test-ui/editor-session.oracle.test.ts:85`, rather than relying on generation chance. The real SPA routes its formatter import to the exact browser SUT in `scripts/formatting-oracle-application.ts:47-50`; the full-editor textarea uses `onFormatKey` through `textareaProps` (`src/ui/authoring.tsx:765,2560`). Actual toolbar Buttons call the command and `applyEdit`, or show the explanation (`src/ui/authoring.tsx:2519-2547`).

Driver `candidate/test-ui/editor-oracles/session-driver-oracle.ts:22-26,37-64` opens that application, focuses the actual textarea, sends actual Tab/Shift+Tab/Shift+Enter/undo keys and clicks actual toolbar controls. `:88-96` locates the preview checkpoint for the current item and exact current source, then waits for its React DOM commit. `:98-105` records actual textarea/preview/visible-toast facts before the next action. `checkSession` (`candidate/test-ui/editor-session.oracle.test.ts:58-75`) compares exact field keys, each field and the entire ordered checkpoint list. No pure helper is credited as a receiving witness.

## Per-original-assertion trace

Pointers below are relative to the packet root. Every preserved formatting row uses the registered route above. `M` = `candidate/test-ui/editor-oracles/session-model-oracle.ts`; `D` = `candidate/test-ui/editor-oracles/session-driver-oracle.ts`; `P` = `candidate/test-ui/editor-session.oracle.test.ts`.

| ID / original lines | Original observation and guaranteed construction | Actual recorded fact → check | Status |
|---|---|---|---|
| S01 / 7-11 | After browser password-form login, #composer-text is visible (login helper called by all four tests). Original login(page) navigates /studio/login, fills password, clicks real login button. Candidate host POSTs login outside the browser, obtains cookie, then session driver injects cookie. | `none for browser login/composer visibility`: No such observation is recorded by the session driver for structural journeys. Model M:110-129 → P:58-75. | setup-observation-not-transferred |
| S02 / 13-17 | The full editor textarea becomes visible after opening the created item (all four tests). Candidate sessionDriver creates an item, navigates its edit route, and waits for #md-input visible. | `setup wait before actions`: Actual locator waitFor({state:"visible"}) at session-driver-oracle.ts:42-43; absence becomes setup failure, not a registered law comparison. Model M:135 → P:58-75. | preserved-as-setup |
| O01 / 27-30 | Real Tab at list end gives exactly - fruit\n    - apples. Constructed list-desktop at model:24-25, registered as constructed at property:85; fill list/end caret at model:111; native Tab at :112 / driver:61. | `indent`: textarea value, selection, focused Model M:111-112,177-188,199-200 → P:58-75. | preserved |
| O02 / 31 | Accepted Tab keeps textarea focus. Same list-desktop Tab. | `indent`: document.activeElement === textarea Model M:111-112,153,199-200 → P:58-75. | preserved |
| O03 / 32-33 | Actual preview has ordered nested li texts [apples, pears], exactly two matches. list-desktop inserts newline + four spaces + - pears after Tab; :113. Driver inserts text at :62, waits for exact source preview response and committed DOM at :88-96. | `sibling`: Array.from(actual #preview-body ul ul li).map(textContent), preserving order and multiplicity; full array compared. Model M:113,199-200 → P:58-75. | preserved |
| O04 / 34-35 | Real Shift+Tab moves only pears back to top level with exact full source. list-desktop :114 sends Shift+Tab through page.keyboard.press. | `outdent`: textarea full value (plus selection/focus) Model M:114,177-188,199-200 → P:58-75. | preserved |
| O05 / 36-37 | Native undo after outdent restores pears nested with exact full source. baseSession.native=true :18; constructed list-desktop retains it; :115 sends ControlOrMeta+z. Driver does not force execCommand refusal for this history (:23), and sends the key (:61). | `undo`: textarea full value Model M:115,144-149,160-163,199-200 → P:58-75. | preserved |
| O06 / 42-45 | Off-list real Tab leaves Plain prose. unchanged. Constructed tab-desktop :24-25 uses before Plain/body prose.; :120 fills exact original and sends Tab. | `navigate`: textarea full value Model M:119-120,176,199-200 → P:58-75. | preserved |
| O07 / 46 | Off-list real Tab moves focus off textarea. Same exact tab-desktop history. Additional editor-browser-focus-traversal property checks native default prevention/recipient/direction on constructed ordinary-prose histories. | `navigate`: document.activeElement !== textarea; additional delivered receipt compares prevented=false and native recipient/direction. Model M:119-120,176,199-200 → P:58-75. | preserved |
| O08 / 51-55 | Real Shift+Enter then verse continuation yields exact Tyger Tyger, burning bright, + backslash-newline + In the forests of the night;. Constructed verse-desktop :24-25 retains both exact original verse strings; :116-118 creates real Shift+Enter then insertion. | `verse`: textarea full value Model M:116-118,154-156,189-191,199-200 → P:58-75. | preserved |
| O09 / 56 | Actual preview contains exactly one paragraph. Same verse construction; driver waits for response whose contentMd equals actual textarea value and React DOM equals that rendered HTML (:88-96). | `verse`: actual #preview-body querySelectorAll(p).length Model M:116-118,199-200 → P:58-75. | preserved |
| O10 / 57 | Actual preview contains exactly one p br. Same verse history and actual preview checkpoint. | `verse`: actual #preview-body querySelectorAll(p br).length Model M:116-118,199-200 → P:58-75. | preserved |
| O11 / 61-66 | Clicking real indent toolbar control gives exact nested apples source. Constructed toolbar-desktop and toolbar-mobile :24-25; :122-123. Driver clicks actual .ed-tools [data-action=md-indent] at :63. | `indent`: textarea full value (and selection/focus) Model M:121-123,177-188,199-200 → P:58-75. | preserved |
| O12 / 67 | Toolbar indent restores textarea focus. Same toolbar constructions and real DOM click. | `indent`: document.activeElement === textarea Model M:121-123,153,199-200 → P:58-75. | preserved |
| O13 / 68-69 | Clicking real outdent toolbar control returns exact initial list. Same sequential toolbar journey, second real button click. | `outdent`: textarea full value (and selection/focus) Model M:123,177-188,199-200 → P:58-75. | preserved |
| O14 / 70-71 | Clicking real line-break toolbar control appends backslash-newline at list end. Same sequential toolbar journey, third real button click. | `break`: textarea full value (and selection/focus) Model M:123,189-191,199-200 → P:58-75. | preserved |
| O15 / 72-75 | After continuation, real code toolbar click and code typing, exact source is - fruit\n- apples\\\nand pears\n\n```\nlet a = 1;\n```. toolbar-desktop/mobile retain sibling=pears and code=let a = 1; from base :18; :124-126 insert continuation, click code, insert code. | `continuation; code; codeTyped`: textarea full value, selection and focus at each individual action; final full value equals original expectation. Model M:124-126,154-156,192-194,199-200 → P:58-75. | preserved |
| O16 / 76-79 | Impossible indent on first item shows visible exact explanation. Same toolbar journey :127 sets caret 3 and clicks actual indent control; original caret 3 retained. | `decline`: A matching [role=status] or .toast has exact explanation text as substring, nonzero width/height and visibility=visible. Model M:127,180-181,199-200 → P:58-75. | preserved |
| O17 / 80 | Declined first-item indent preserves beginning - fruit newline. Same decline action. | `decline`: Candidate compares entire unchanged source, which implies original prefix regex. Model M:127,180-181,199-200 → P:58-75. | preserved |

For O03, the driver records **the full ordered array** from actual `#preview-body ul ul li`, and the model expects `[apples, pears]`; omission, extra multiplicity or swapped order cannot disappear into a set/count (`M:113,199-200`; `D:98-105`). O05 restores the full pre-outdent source through the native undo key. O08 guarantees the exact two verse lines, then O09/O10 compare actual DOM `p` and `p br` counts, not a helper render. O11–O15 also record full source, selection and focus after each toolbar/typing action; the original only explicitly checked indent focus. O17 compares the full unchanged source, stronger than the original prefix regex.

Off-list native traversal is additionally registered as `editor-browser-focus-traversal` / `off-list native focus navigation` (`test-ui/editor-interactions.oracle.test.ts:90-107`, inventory property at `property-registry-oracle.ts:29`). Constructed forward desktop/mobile cases are guaranteed at `interaction-model-oracle.ts:61-66` / property `:97`. The real driver `interaction-driver-oracle.ts:76-122` runs a formatter-bypassed native reference then the actual formatter, records unprevented recipient/direction and compares them alongside unchanged source/range. A missing host premise throws at `:111`; it is not silently counted as success. This is additional receiving evidence; the session’s exact `Plain prose.`/not-focused receipt already preserves the original assertions.

## Recovered setup signal and receiving transformations

### F01 — Browser password-form submission reaches a visible composer before each structural scenario.

Original `scanners/structure-e2e/latest-markdown-structure.spec.ts:7-11` navigates the browser login form, fills the password, clicks the button, and requires a visible composer. The helper runs before all four scenarios. Candidate `scripts/formatting-oracle-application.ts:122-125` performs login through `dispatchFetch`, validates 302/cookie, and `D:25-26` injects that cookie before navigating directly to the editor (`D:32-44`). No equivalent browser-form/composer-visibility observation reaches the registered structural check.

Where it vanished: **category mismatch**, at the move from browser login observation to out-of-browser authenticated setup. This names the source delta; no historical author intent, majority decision, low-salience rule or explicit rejection was read. The observation may be covered elsewhere; that is outside this one-source assay. No usefulness or restoration judgment follows.

### T01 — receiving-premise-change
Original API creation contains the whole initial structural document, which is fetched by editor before first key. Candidate API creation contains h.body only, then locator.fill establishes the whole list/verse/prose before keys.

Pointers: `scanners/structure-e2e/latest-markdown-structure.spec.ts:13-17,27-28,42-43,51-52,61-62`, `candidate/test-ui/editor-oracles/session-driver-oracle.ts:32-45,49-53`, `candidate/test-ui/editor-oracles/session-model-oracle.ts:110-122`. Where it changes: **compression** (descriptive source-delta classification). All 17 formatting results are still predicted and checked on the real editor. This does not establish the identical loaded-document premise for structural journeys; no claim that loading the structural document is untested elsewhere.

### T02 — receiving-path-change
Original keyboard.type emits character key events; candidate keyboard.insertText supplies the same continuation text through native text insertion without per-character keydown/keyup. Real structural keys, native undo and toolbar clicks remain actual keyboard/button calls.

Pointers: `scanners/structure-e2e/latest-markdown-structure.spec.ts:32,54,72,74`, `candidate/test-ui/editor-oracles/session-driver-oracle.ts:61-63`. Where it changes: **category mismatch** (descriptive source-delta classification). The original asserted completed source/preview observations are retained. Character-key event coupling is not the same receiving witness; this static difference alone does not show a wrong product result.

## Mobile, browser and OS scope

- **original:** Original first three tests skip every non-desktop project. Toolbar runs desktop Chromium and iPhone 13 Chromium mobile. mobile-webkit project matches cosmetics.spec.ts only (candidate/playwright.config.ts:10-20).
- **candidate:** sessionCases guarantees desktop and mobile variants for list/verse/tab/toolbar. browser-engine-oracle.ts:6-17 defaults to Chromium and permits Firefox/WebKit; mobile means iPhone13 profile for Chromium/WebKit, small iPhone viewport + touch for Firefox. Configurability is not evidence of a completed engine run.
- **mobile_pane_change:** Original toolbar manually changes .editor-grid data-pane=draft (O:63), not React pane state. Candidate session-driver:44 clicks actual pane group/draft button, backed by authoring.tsx:2464-2476 setPane; a real setup action replaces DOM attribute mutation.
- **os:** Original undo Meta+z on darwin, Control+z otherwise; candidate ControlOrMeta+z. Native boundary helper is active only for required darwin WebKit histories (native-host-oracle.ts:10-18,55-59). This assay does not infer OS-wide keyboard coverage or WebKit success.

## Controls and limits

The original authority bytes match exactly. The candidate has a source calibration that corrupts the nested sibling array (`P:95`), and separate native traversal calibrations for trapped focus, prevented blur and wrong recipient (`editor-interactions.oracle.test.ts:104-106`). They were read, not executed.

- No runtime outcome is inferred; pending campaigns can reveal setup or timing failures.
- The one-source reduction selects assertion sites as units. This can flatten causal dependencies between login, loaded working copy and later keys; explicit setup/path deltas retain those distinctions.
- Vanishing classifications describe observed code reductions, not unknown author intent. No sibling scanner conclusions, prior audit documents or sibling original tests were consulted.
- No usefulness ranking, deletion/restoration authorization, new law, product defect verdict or readiness verdict is supplied.

Structured per-assertion records and input hashes: `scanners/structure-e2e/loss-recovery.json`.
