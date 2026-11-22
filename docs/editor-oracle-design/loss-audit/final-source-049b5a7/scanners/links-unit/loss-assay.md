# Links unit — fresh source-only hidden-signal recovery assay

**Result:** bounded no supported omission across the 21 original assertion sites. This is a source trace, not runtime passing evidence. Candidate frozen identity: `049b5a7`; runtime/full16 readiness remains pending.

The complete original `scanners/links-unit/latest-links.test.ts` and authority original are byte-identical (SHA-256 `9e80ad513a6432b5969ccaf1b17e80596a2cd975b54754ae86ce3690b1ba93c0`). I read only this original, its authority copy, the frozen candidate paths used below, and the required skill/checklist/glossary support. No sibling scanner, sibling original, earlier audit conclusion, browser, build, test, campaign, install, or remote job was used.

## Common construction → browser → return → registered check

- **source_capture:** candidate/test-ui/editor-oracles/browser-source-oracle.ts:43-64 captures exact src/ui/links.ts source, transpiles it into an exports factory, and exposes __oracleBrowserSource.
- **installation:** candidate/test-ui/editor-oracles/browser-driver-oracle.ts:11-21,107-114,168-173 imports link source data, installs __oracleLinks in page.evaluate, and invokes the browser callback.
- **call:** candidate/test-ui/editor-oracles/browser-driver-oracle.ts:254-259 invokes links[method](...args), records complete success as {value:result}, or an error envelope with name/message.
- **recording:** candidate/test-ui/editor-links.oracle.test.ts:59,69,79,89,100-108 observes the return envelope at return; composed feedback also observes insertion.
- **comparison:** candidate/test-ui/editor-links.oracle.test.ts:51-52 compares traceValue(return) against {value:expected} via differs; helper properties name their law at their own check. traceValue is candidate/test-ui/editor-oracles/document-oracle.ts:27.
- **guarantee:** candidate/test-ui/editor-oracles/document-oracle.ts:35-39 turns EVERY named case into a constructed history using build:()=>h, with states/enters; this is not a claim that random sampling happened to hit a case.
- **registration:** candidate/vitest.oracle.config.ts:2-14 installs formattingBrowserSource and includes the literal file inventory; configure-oracles.ts:1-5 installs the property registry. candidate/test-ui/editor-oracles/property-registry-oracle.ts:13,55-57,61-62 lists this file and the five return properties.

The model’s explicit tracker vocabulary and projected query entries are at `candidate/test-ui/editor-oracles/link-model-oracle.ts:6-15,73-83`; WHATWG URL is the declared parsing/serialization base. The source-only predictions below come from those rules and original source promises, not calls to production. Each numbered row names the exact constructed witness and a registered comparison.

## Every original assertion

### L01 — original line 7

Original observation: exact object equality (`scanners/links-unit/latest-links.test.ts:7`).

Exact helper input / call: `cleanUrl` with JSON arguments:
```json
["https://www.example.com/essays/maintenance?id=7&utm_source=newsletter&utm_medium=email&fbclid=IwAR0x&gclid=a&dclid=b&msclkid=c&mc_cid=d&mc_eid=e&igshid=f&si=g&ref_src=h&ref=i&_hsenc=j&_hsmi=k&mkt_tok=l&page=2"]
```
Guaranteed witness: `rawCases.oldAllTrackers` at `candidate/test-ui/editor-oracles/link-model-oracle.ts:56`, expanded through `candidate/test-ui/editor-oracles/document-oracle.ts:35-39`.

Production path: `candidate/src/ui/links.ts:23-40` via browser transport `candidate/test-ui/editor-oracles/browser-driver-oracle.ts:107-114,168-173,254-259`. The complete return envelope predicted and compared is:
```json
{"value": {"url": "https://www.example.com/essays/maintenance?id=7&page=2", "removed": 15}}
```
Registered check: `editor-url-cleaning` / **tracker projection**, `candidate/test-ui/editor-links.oracle.test.ts:70`, using model `candidate/test-ui/editor-oracles/link-model-oracle.ts:6-15,73-83` and common full-envelope comparison `candidate/test-ui/editor-links.oracle.test.ts:51-52`; literal registry entry `candidate/test-ui/editor-oracles/property-registry-oracle.ts:61`.

The separate structured allTrackers case changes the host and several values; it is not used as the exact witness. oldAllTrackers retains every original byte.

Status: preserved by source trace. No supported vanished item or drop mechanism.

### L02 — original line 11

Original observation: exact object equality (`scanners/links-unit/latest-links.test.ts:11`).

Exact helper input / call: `cleanUrl` with JSON arguments:
```json
["https://example.com/a?utm_source=x#part"]
```
Guaranteed witness: `rawCases.trackerFragment` at `candidate/test-ui/editor-oracles/link-model-oracle.ts:50`, expanded through `candidate/test-ui/editor-oracles/document-oracle.ts:35-39`.

Production path: `candidate/src/ui/links.ts:23-40` via browser transport `candidate/test-ui/editor-oracles/browser-driver-oracle.ts:107-114,168-173,254-259`. The complete return envelope predicted and compared is:
```json
{"value": {"url": "https://example.com/a#part", "removed": 1}}
```
Registered check: `editor-url-cleaning` / **tracker projection**, `candidate/test-ui/editor-links.oracle.test.ts:70`, using model `candidate/test-ui/editor-oracles/link-model-oracle.ts:6-15,73-83` and common full-envelope comparison `candidate/test-ui/editor-links.oracle.test.ts:51-52`; literal registry entry `candidate/test-ui/editor-oracles/property-registry-oracle.ts:61`.

Status: preserved by source trace. No supported vanished item or drop mechanism.

### L03 — original line 12

Original observation: exact object equality (`scanners/links-unit/latest-links.test.ts:12`).

Exact helper input / call: `cleanUrl` with JSON arguments:
```json
["https://example.com/a?UTM_Campaign=x"]
```
Guaranteed witness: `rawCases.trackerOnly` at `candidate/test-ui/editor-oracles/link-model-oracle.ts:54`, expanded through `candidate/test-ui/editor-oracles/document-oracle.ts:35-39`.

Production path: `candidate/src/ui/links.ts:23-40` via browser transport `candidate/test-ui/editor-oracles/browser-driver-oracle.ts:107-114,168-173,254-259`. The complete return envelope predicted and compared is:
```json
{"value": {"url": "https://example.com/a", "removed": 1}}
```
Registered check: `editor-url-cleaning` / **tracker projection**, `candidate/test-ui/editor-links.oracle.test.ts:70`, using model `candidate/test-ui/editor-oracles/link-model-oracle.ts:6-15,73-83` and common full-envelope comparison `candidate/test-ui/editor-links.oracle.test.ts:51-52`; literal registry entry `candidate/test-ui/editor-oracles/property-registry-oracle.ts:61`.

Uppercase UTM_Campaign is retained in the raw input; only its tracker query disappears.

Status: preserved by source trace. No supported vanished item or drop mechanism.

### L04 — original line 17

Original observation: exact object equality (`scanners/links-unit/latest-links.test.ts:17`).

Exact helper input / call: `cleanUrl` with JSON arguments:
```json
["  https://example.com/a%20b?q=one+two&ref_id=3\n"]
```
Guaranteed witness: `rawCases.untouched` at `candidate/test-ui/editor-oracles/link-model-oracle.ts:55`, expanded through `candidate/test-ui/editor-oracles/document-oracle.ts:35-39`.

Production path: `candidate/src/ui/links.ts:23-40` via browser transport `candidate/test-ui/editor-oracles/browser-driver-oracle.ts:107-114,168-173,254-259`. The complete return envelope predicted and compared is:
```json
{"value": {"url": "https://example.com/a%20b?q=one+two&ref_id=3", "removed": 0}}
```
Registered check: `editor-url-cleaning` / **tracker projection**, `candidate/test-ui/editor-links.oracle.test.ts:70`, using model `candidate/test-ui/editor-oracles/link-model-oracle.ts:6-15,73-83` and common full-envelope comparison `candidate/test-ui/editor-links.oracle.test.ts:51-52`; literal registry entry `candidate/test-ui/editor-oracles/property-registry-oracle.ts:61`.

Two leading spaces and one trailing LF are in the input; %20, plus spelling, q order and ref_id survive exactly after trim. No reserialization is used by the zero-removal model branch.

Status: preserved by source trace. No supported vanished item or drop mechanism.

### L05 — original line 21

Original observation: exact boolean (`scanners/links-unit/latest-links.test.ts:21`).

Exact helper input / call: `isUrl` with JSON arguments:
```json
[" https://example.com/x "]
```
Guaranteed witness: `rawCases.https` at `candidate/test-ui/editor-oracles/link-model-oracle.ts:41-43`, expanded through `candidate/test-ui/editor-oracles/document-oracle.ts:35-39`.

Production path: `candidate/src/ui/links.ts:14-16` via browser transport `candidate/test-ui/editor-oracles/browser-driver-oracle.ts:107-114,168-173,254-259`. The complete return envelope predicted and compared is:
```json
{"value": true}
```
Registered check: `editor-url-recognition` / **lone URL recognition**, `candidate/test-ui/editor-links.oracle.test.ts:60`, using model `candidate/test-ui/editor-oracles/link-model-oracle.ts:67-72` and common full-envelope comparison `candidate/test-ui/editor-links.oracle.test.ts:51-52`; literal registry entry `candidate/test-ui/editor-oracles/property-registry-oracle.ts:62`.

Status: preserved by source trace. No supported vanished item or drop mechanism.

### L06 — original line 22

Original observation: exact boolean (`scanners/links-unit/latest-links.test.ts:22`).

Exact helper input / call: `isUrl` with JSON arguments:
```json
["http://example.com"]
```
Guaranteed witness: `rawCases.http` at `candidate/test-ui/editor-oracles/link-model-oracle.ts:41-43`, expanded through `candidate/test-ui/editor-oracles/document-oracle.ts:35-39`.

Production path: `candidate/src/ui/links.ts:14-16` via browser transport `candidate/test-ui/editor-oracles/browser-driver-oracle.ts:107-114,168-173,254-259`. The complete return envelope predicted and compared is:
```json
{"value": true}
```
Registered check: `editor-url-recognition` / **lone URL recognition**, `candidate/test-ui/editor-links.oracle.test.ts:60`, using model `candidate/test-ui/editor-oracles/link-model-oracle.ts:67-72` and common full-envelope comparison `candidate/test-ui/editor-links.oracle.test.ts:51-52`; literal registry entry `candidate/test-ui/editor-oracles/property-registry-oracle.ts:62`.

Status: preserved by source trace. No supported vanished item or drop mechanism.

### L07 — original line 23

Original observation: exact boolean (`scanners/links-unit/latest-links.test.ts:23`).

Exact helper input / call: `isUrl` with JSON arguments:
```json
["see https://example.com"]
```
Guaranteed witness: `rawCases.prose` at `candidate/test-ui/editor-oracles/link-model-oracle.ts:41-43`, expanded through `candidate/test-ui/editor-oracles/document-oracle.ts:35-39`.

Production path: `candidate/src/ui/links.ts:14-16` via browser transport `candidate/test-ui/editor-oracles/browser-driver-oracle.ts:107-114,168-173,254-259`. The complete return envelope predicted and compared is:
```json
{"value": false}
```
Registered check: `editor-url-recognition` / **lone URL recognition**, `candidate/test-ui/editor-links.oracle.test.ts:60`, using model `candidate/test-ui/editor-oracles/link-model-oracle.ts:67-72` and common full-envelope comparison `candidate/test-ui/editor-links.oracle.test.ts:51-52`; literal registry entry `candidate/test-ui/editor-oracles/property-registry-oracle.ts:62`.

Status: preserved by source trace. No supported vanished item or drop mechanism.

### L08 — original line 24

Original observation: exact boolean (`scanners/links-unit/latest-links.test.ts:24`).

Exact helper input / call: `isUrl` with JSON arguments:
```json
["ftp://example.com"]
```
Guaranteed witness: `rawCases.ftp` at `candidate/test-ui/editor-oracles/link-model-oracle.ts:41-43`, expanded through `candidate/test-ui/editor-oracles/document-oracle.ts:35-39`.

Production path: `candidate/src/ui/links.ts:14-16` via browser transport `candidate/test-ui/editor-oracles/browser-driver-oracle.ts:107-114,168-173,254-259`. The complete return envelope predicted and compared is:
```json
{"value": false}
```
Registered check: `editor-url-recognition` / **lone URL recognition**, `candidate/test-ui/editor-links.oracle.test.ts:60`, using model `candidate/test-ui/editor-oracles/link-model-oracle.ts:67-72` and common full-envelope comparison `candidate/test-ui/editor-links.oracle.test.ts:51-52`; literal registry entry `candidate/test-ui/editor-oracles/property-registry-oracle.ts:62`.

Status: preserved by source trace. No supported vanished item or drop mechanism.

### L09 — original line 25

Original observation: exact boolean (`scanners/links-unit/latest-links.test.ts:25`).

Exact helper input / call: `isUrl` with JSON arguments:
```json
["javascript:alert(1)"]
```
Guaranteed witness: `rawCases.javascript` at `candidate/test-ui/editor-oracles/link-model-oracle.ts:41-43`, expanded through `candidate/test-ui/editor-oracles/document-oracle.ts:35-39`.

Production path: `candidate/src/ui/links.ts:14-16` via browser transport `candidate/test-ui/editor-oracles/browser-driver-oracle.ts:107-114,168-173,254-259`. The complete return envelope predicted and compared is:
```json
{"value": false}
```
Registered check: `editor-url-recognition` / **lone URL recognition**, `candidate/test-ui/editor-links.oracle.test.ts:60`, using model `candidate/test-ui/editor-oracles/link-model-oracle.ts:67-72` and common full-envelope comparison `candidate/test-ui/editor-links.oracle.test.ts:51-52`; literal registry entry `candidate/test-ui/editor-oracles/property-registry-oracle.ts:62`.

Status: preserved by source trace. No supported vanished item or drop mechanism.

### L10 — original line 26

Original observation: null return (`scanners/links-unit/latest-links.test.ts:26`).

Exact helper input / call: `cleanUrl` with JSON arguments:
```json
["not a url"]
```
Guaranteed witness: `rawCases.invalid` at `candidate/test-ui/editor-oracles/link-model-oracle.ts:44`, expanded through `candidate/test-ui/editor-oracles/document-oracle.ts:35-39`.

Production path: `candidate/src/ui/links.ts:23-40` via browser transport `candidate/test-ui/editor-oracles/browser-driver-oracle.ts:107-114,168-173,254-259`. The complete return envelope predicted and compared is:
```json
{"value": null}
```
Registered check: `editor-url-cleaning` / **tracker projection**, `candidate/test-ui/editor-links.oracle.test.ts:70`, using model `candidate/test-ui/editor-oracles/link-model-oracle.ts:6-15,73-83` and common full-envelope comparison `candidate/test-ui/editor-links.oracle.test.ts:51-52`; literal registry entry `candidate/test-ui/editor-oracles/property-registry-oracle.ts:61`.

Status: preserved by source trace. No supported vanished item or drop mechanism.

### L11 — original line 27

Original observation: null return (`scanners/links-unit/latest-links.test.ts:27`).

Exact helper input / call: `cleanUrl` with JSON arguments:
```json
["https://exa mple.com"]
```
Guaranteed witness: `rawCases.internalSpace` at `candidate/test-ui/editor-oracles/link-model-oracle.ts:44`, expanded through `candidate/test-ui/editor-oracles/document-oracle.ts:35-39`.

Production path: `candidate/src/ui/links.ts:23-40` via browser transport `candidate/test-ui/editor-oracles/browser-driver-oracle.ts:107-114,168-173,254-259`. The complete return envelope predicted and compared is:
```json
{"value": null}
```
Registered check: `editor-url-cleaning` / **tracker projection**, `candidate/test-ui/editor-links.oracle.test.ts:70`, using model `candidate/test-ui/editor-oracles/link-model-oracle.ts:6-15,73-83` and common full-envelope comparison `candidate/test-ui/editor-links.oracle.test.ts:51-52`; literal registry entry `candidate/test-ui/editor-oracles/property-registry-oracle.ts:61`.

Status: preserved by source trace. No supported vanished item or drop mechanism.

### L12 — original line 31

Original observation: exact string (`scanners/links-unit/latest-links.test.ts:31`).

Exact helper input / call: `linkMarkdown` with JSON arguments:
```json
["https://example.com/a", "the essay"]
```
Guaranteed witness: `markdownCases.selected` at `candidate/test-ui/editor-oracles/link-model-oracle.ts:103`, expanded through `candidate/test-ui/editor-oracles/document-oracle.ts:35-39`.

Production path: `candidate/src/ui/links.ts:43-56` via browser transport `candidate/test-ui/editor-oracles/browser-driver-oracle.ts:107-114,168-173,254-259`. The complete return envelope predicted and compared is:
```json
{"value": "[the essay](https://example.com/a)"}
```
Registered check: `editor-link-markdown` / **canonical link source**, `candidate/test-ui/editor-links.oracle.test.ts:80`, using model `candidate/test-ui/editor-oracles/link-model-oracle.ts:94-99` and common full-envelope comparison `candidate/test-ui/editor-links.oracle.test.ts:51-52`; literal registry entry `candidate/test-ui/editor-oracles/property-registry-oracle.ts:57`.

Status: preserved by source trace. No supported vanished item or drop mechanism.

### L13 — original line 32

Original observation: exact string (`scanners/links-unit/latest-links.test.ts:32`).

Exact helper input / call: `linkMarkdown` with JSON arguments:
```json
["https://example.com/a"]
```
Guaranteed witness: `markdownCases.omittedLabel` at `candidate/test-ui/editor-oracles/link-model-oracle.ts:105`, expanded through `candidate/test-ui/editor-oracles/document-oracle.ts:35-39`.

Production path: `candidate/src/ui/links.ts:43-56` via browser transport `candidate/test-ui/editor-oracles/browser-driver-oracle.ts:107-114,168-173,254-259`. The complete return envelope predicted and compared is:
```json
{"value": "<https://example.com/a>"}
```
Registered check: `editor-link-markdown` / **canonical link source**, `candidate/test-ui/editor-links.oracle.test.ts:80`, using model `candidate/test-ui/editor-oracles/link-model-oracle.ts:94-99` and common full-envelope comparison `candidate/test-ui/editor-links.oracle.test.ts:51-52`; literal registry entry `candidate/test-ui/editor-oracles/property-registry-oracle.ts:57`.

omitted:true makes the driver pass [h.target], with no second argument. The additional autolink case at line 104 passes an explicit empty string and does not stand in for this call shape.

Status: preserved by source trace. No supported vanished item or drop mechanism.

### L14 — original line 34

Original observation: exact string (`scanners/links-unit/latest-links.test.ts:34`).

Exact helper input / call: `linkMarkdown` with JSON arguments:
```json
["https://en.wikipedia.org/wiki/Foo_(bar)", "a [b]"]
```
Guaranteed witness: `markdownCases.oldEscaping` at `candidate/test-ui/editor-oracles/link-model-oracle.ts:108`, expanded through `candidate/test-ui/editor-oracles/document-oracle.ts:35-39`.

Production path: `candidate/src/ui/links.ts:43-56` via browser transport `candidate/test-ui/editor-oracles/browser-driver-oracle.ts:107-114,168-173,254-259`. The complete return envelope predicted and compared is:
```json
{"value": "[a \\[b\\]](https://en.wikipedia.org/wiki/Foo_%28bar%29)"}
```
Registered check: `editor-link-markdown` / **canonical link source**, `candidate/test-ui/editor-links.oracle.test.ts:80`, using model `candidate/test-ui/editor-oracles/link-model-oracle.ts:94-99` and common full-envelope comparison `candidate/test-ui/editor-links.oracle.test.ts:51-52`; literal registry entry `candidate/test-ui/editor-oracles/property-registry-oracle.ts:57`.

The output contains one literal backslash before each label bracket; both destination parentheses become uppercase %28/%29.

Status: preserved by source trace. No supported vanished item or drop mechanism.

### L15 — original line 41

Original observation: result.text equals exact selected-link source (`scanners/links-unit/latest-links.test.ts:41`).

Exact helper input / call: `insertLink` with JSON arguments:
```json
["Read the essay today.", 5, 14, "https://example.com/e?utm_source=x&fbclid=y"]
```
Guaranteed witness: `insertionCases.oldSelection` at `candidate/test-ui/editor-oracles/link-model-oracle.ts:126,133-139`, expanded through `candidate/test-ui/editor-oracles/document-oracle.ts:35-39`.

Production path: `candidate/src/ui/links.ts:63-75 -> cleanUrl:23-40 -> linkMarkdown:52-56` via browser transport `candidate/test-ui/editor-oracles/browser-driver-oracle.ts:107-114,168-173,254-259`. The complete return envelope predicted and compared is:
```json
{"value": {"text": "Read [the essay](https://example.com/e) today.", "caret": 39, "removed": 2, "linked": true}}
```
Registered check: `editor-link-insertion` / **completed link replacement**, `candidate/test-ui/editor-links.oracle.test.ts:90`, using model `candidate/test-ui/editor-oracles/link-model-oracle.ts:133-139` and common full-envelope comparison `candidate/test-ui/editor-links.oracle.test.ts:51-52`; literal registry entry `candidate/test-ui/editor-oracles/property-registry-oracle.ts:56`.

The same complete return object is compared for this row and rows L16/L17. The original separate projections are retained by a stronger full-object check. Selection [5,14) provides the label; the caret follows the inserted link, before the preserved suffix.

Status: preserved by source trace. No supported vanished item or drop mechanism.

### L16 — original line 42

Original observation: result.caret equals length of Read [the essay](https://example.com/e), i.e. 39 (`scanners/links-unit/latest-links.test.ts:42`).

Exact helper input / call: `insertLink` with JSON arguments:
```json
["Read the essay today.", 5, 14, "https://example.com/e?utm_source=x&fbclid=y"]
```
Guaranteed witness: `insertionCases.oldSelection` at `candidate/test-ui/editor-oracles/link-model-oracle.ts:126,133-139`, expanded through `candidate/test-ui/editor-oracles/document-oracle.ts:35-39`.

Production path: `candidate/src/ui/links.ts:63-75 -> cleanUrl:23-40 -> linkMarkdown:52-56` via browser transport `candidate/test-ui/editor-oracles/browser-driver-oracle.ts:107-114,168-173,254-259`. The complete return envelope predicted and compared is:
```json
{"value": {"text": "Read [the essay](https://example.com/e) today.", "caret": 39, "removed": 2, "linked": true}}
```
Registered check: `editor-link-insertion` / **completed link replacement**, `candidate/test-ui/editor-links.oracle.test.ts:90`, using model `candidate/test-ui/editor-oracles/link-model-oracle.ts:133-139` and common full-envelope comparison `candidate/test-ui/editor-links.oracle.test.ts:51-52`; literal registry entry `candidate/test-ui/editor-oracles/property-registry-oracle.ts:56`.

Status: preserved by source trace. No supported vanished item or drop mechanism.

### L17 — original line 43

Original observation: result matches {removed:2,linked:true} (`scanners/links-unit/latest-links.test.ts:43`).

Exact helper input / call: `insertLink` with JSON arguments:
```json
["Read the essay today.", 5, 14, "https://example.com/e?utm_source=x&fbclid=y"]
```
Guaranteed witness: `insertionCases.oldSelection` at `candidate/test-ui/editor-oracles/link-model-oracle.ts:126,133-139`, expanded through `candidate/test-ui/editor-oracles/document-oracle.ts:35-39`.

Production path: `candidate/src/ui/links.ts:63-75 -> cleanUrl:23-40 -> linkMarkdown:52-56` via browser transport `candidate/test-ui/editor-oracles/browser-driver-oracle.ts:107-114,168-173,254-259`. The complete return envelope predicted and compared is:
```json
{"value": {"text": "Read [the essay](https://example.com/e) today.", "caret": 39, "removed": 2, "linked": true}}
```
Registered check: `editor-link-insertion` / **completed link replacement**, `candidate/test-ui/editor-links.oracle.test.ts:90`, using model `candidate/test-ui/editor-oracles/link-model-oracle.ts:133-139` and common full-envelope comparison `candidate/test-ui/editor-links.oracle.test.ts:51-52`; literal registry entry `candidate/test-ui/editor-oracles/property-registry-oracle.ts:56`.

Both flags and text/caret are checked together; the original used partial-object matching for the flags.

Status: preserved by source trace. No supported vanished item or drop mechanism.

### L18 — original line 44

Original observation: linkToast(result) exact string (`scanners/links-unit/latest-links.test.ts:44`).

Exact helper input / call: `insertLink -> linkToast` with JSON arguments:
```json
["Read the essay today.", 5, 14, "https://example.com/e?utm_source=x&fbclid=y"]
```
Guaranteed witness: `toastCases.originalSelectedResult` at `candidate/test-ui/editor-oracles/link-model-oracle.ts:147,150-154`, expanded through `candidate/test-ui/editor-oracles/document-oracle.ts:35-39`.

Production path: `candidate/src/ui/links.ts:78-83, after insertLink:63-75` via browser transport `candidate/test-ui/editor-oracles/browser-driver-oracle.ts:107-114,168-173,254-259`. The complete return envelope predicted and compared is:
```json
{"value": "linked selection · 2 trackers removed"}
```
Registered check: `editor-link-feedback` / **link feedback**, `candidate/test-ui/editor-links.oracle.test.ts:110`, using model `candidate/test-ui/editor-oracles/link-model-oracle.ts:150-154` and common full-envelope comparison `candidate/test-ui/editor-links.oracle.test.ts:51-52`; literal registry entry `candidate/test-ui/editor-oracles/property-registry-oracle.ts:55`.

The actual composition first records this complete intermediate helper return at `insertion`, then calls `linkToast` with the full inner object:
```json
{"value": {"text": "Read [the essay](https://example.com/e) today.", "caret": 39, "removed": 2, "linked": true}}
```

The constructed structured URL serializes to the exact original raw URL. Driver first records {value: full insertion result} at insertion, then passes inserted.value (all text/caret/removed/linked fields) to the real browser linkToast call. The feedback check compares return only; the full insertion object is independently enforced by editor-link-insertion, not by the feedback check.

Status: preserved by source trace. No supported vanished item or drop mechanism.

### L19 — original line 46

Original observation: bare.text equals See <https://example.com/> (`scanners/links-unit/latest-links.test.ts:46`).

Exact helper input / call: `insertLink` with JSON arguments:
```json
["See ", 4, 4, "https://example.com/"]
```
Guaranteed witness: `insertionCases.oldAutolink` at `candidate/test-ui/editor-oracles/link-model-oracle.ts:127,133-139`, expanded through `candidate/test-ui/editor-oracles/document-oracle.ts:35-39`.

Production path: `candidate/src/ui/links.ts:63-75 -> cleanUrl:23-40 -> linkMarkdown:52-56` via browser transport `candidate/test-ui/editor-oracles/browser-driver-oracle.ts:107-114,168-173,254-259`. The complete return envelope predicted and compared is:
```json
{"value": {"text": "See <https://example.com/>", "caret": 26, "removed": 0, "linked": false}}
```
Registered check: `editor-link-insertion` / **completed link replacement**, `candidate/test-ui/editor-links.oracle.test.ts:90`, using model `candidate/test-ui/editor-oracles/link-model-oracle.ts:133-139` and common full-envelope comparison `candidate/test-ui/editor-links.oracle.test.ts:51-52`; literal registry entry `candidate/test-ui/editor-oracles/property-registry-oracle.ts:56`.

The collapsed selection has no label and inserts an autolink at UTF-16 offset 4; the entire return including caret 26, removed 0, linked false is checked.

Status: preserved by source trace. No supported vanished item or drop mechanism.

### L20 — original line 47

Original observation: linkToast(bare) exact string (`scanners/links-unit/latest-links.test.ts:47`).

Exact helper input / call: `insertLink -> linkToast` with JSON arguments:
```json
["See ", 4, 4, "https://example.com/"]
```
Guaranteed witness: `toastCases.originalAutolinkResult` at `candidate/test-ui/editor-oracles/link-model-oracle.ts:148,150-154`, expanded through `candidate/test-ui/editor-oracles/document-oracle.ts:35-39`.

Production path: `candidate/src/ui/links.ts:78-83, after insertLink:63-75` via browser transport `candidate/test-ui/editor-oracles/browser-driver-oracle.ts:107-114,168-173,254-259`. The complete return envelope predicted and compared is:
```json
{"value": "inserted link"}
```
Registered check: `editor-link-feedback` / **link feedback**, `candidate/test-ui/editor-links.oracle.test.ts:110`, using model `candidate/test-ui/editor-oracles/link-model-oracle.ts:150-154` and common full-envelope comparison `candidate/test-ui/editor-links.oracle.test.ts:51-52`; literal registry entry `candidate/test-ui/editor-oracles/property-registry-oracle.ts:55`.

The actual composition first records this complete intermediate helper return at `insertion`, then calls `linkToast` with the full inner object:
```json
{"value": {"text": "See <https://example.com/>", "caret": 26, "removed": 0, "linked": false}}
```

The structured path:[] URL projects to https://example.com/ exactly. This uses the actual insertion result data, rather than a synthetic {removed,linked} substitute.

Status: preserved by source trace. No supported vanished item or drop mechanism.

### L21 — original line 48

Original observation: null return (`scanners/links-unit/latest-links.test.ts:48`).

Exact helper input / call: `insertLink` with JSON arguments:
```json
["x", 0, 1, "nope"]
```
Guaranteed witness: `insertionCases.oldInvalid` at `candidate/test-ui/editor-oracles/link-model-oracle.ts:128,133-139`, expanded through `candidate/test-ui/editor-oracles/document-oracle.ts:35-39`.

Production path: `candidate/src/ui/links.ts:63-75 -> cleanUrl:23-40 -> linkMarkdown:52-56` via browser transport `candidate/test-ui/editor-oracles/browser-driver-oracle.ts:107-114,168-173,254-259`. The complete return envelope predicted and compared is:
```json
{"value": null}
```
Registered check: `editor-link-insertion` / **completed link replacement**, `candidate/test-ui/editor-links.oracle.test.ts:90`, using model `candidate/test-ui/editor-oracles/link-model-oracle.ts:133-139` and common full-envelope comparison `candidate/test-ui/editor-links.oracle.test.ts:51-52`; literal registry entry `candidate/test-ui/editor-oracles/property-registry-oracle.ts:56`.

The driver records {value:null}; it does not drop the declined insertion or map it to an empty successful edit.

Status: preserved by source trace. No supported vanished item or drop mechanism.

## Limits and possible distortion

The two supplied original files are byte-identical. Candidate authority is cited at candidate/test-ui/editor-links.oracle.test.ts:24-27,48 and identifies the 2026-11-18 Kyle Mathews decision and original commit 28b0c8d642a87e5810ad6eabd95c2d1714c53396. This assay preserves that source claim without independently adopting a law.

- A painted React/Base UI toast: linkToast returns a helper string.
- Real OS clipboard read/write, permission, or delivery: these original assertions do not use a clipboard.
- Actual browser input/paste/key event delivery, native caret movement or undo: insertLink returns text and a numeric caret; its direct browser invocation dispatches no such event.
- Network absence or absence of fetched titles as an independently observed side effect: the original asserts the autolink string; it does not instrument fetch.
- Runtime success, full16 readiness, actual constructed-history execution, measured reach or mutation sensitivity.
- General oracle readiness or full ORC-001–016 conformance; the checklist is used for grammar/path/observation vocabulary, not a separate verdict.

Tracing only the supplied original assertion sites may hide behavior outside their helper-level boundary. A source reconstruction of model predictions and URL host semantics can also miss runtime transport or setup failures. Exact constructed witnesses, full envelopes and explicit limits keep that source inference distinct from execution.

No supported dropped/weakened item, so compression/majority/category-mismatch/low-salience/explicit-rejection is not assigned. No usefulness judgment, restoration/deletion decision, or new law is made.

## Source hashes

- `scanners/links-unit/latest-links.test.ts`: `9e80ad513a6432b5969ccaf1b17e80596a2cd975b54754ae86ce3690b1ba93c0`
- `scanners/links-unit/authority-links.test.ts`: `9e80ad513a6432b5969ccaf1b17e80596a2cd975b54754ae86ce3690b1ba93c0`
- `candidate/test-ui/editor-links.oracle.test.ts`: `f56d4a94bf28c7c92b81ff592aae512a0866973a9fe4c684b6d2d4e49fa9052c`
- `candidate/test-ui/editor-oracles/link-model-oracle.ts`: `9af8f1836b794e82d60b3b6bf9e5ff4323e22acf840ac1bbfc522a7a81faa284`
- `candidate/src/ui/links.ts`: `04671ef2fb05ac2363a1b0bd23236914bcbbe49d19b10b506cf6cbbcea14292c`
- `candidate/test-ui/editor-oracles/browser-driver-oracle.ts`: `d4ccc78bb85f5e7321562bbfb26830171df817d361d491684cbdf15b3ae5a151`
- `candidate/test-ui/editor-oracles/browser-source-oracle.ts`: `4056c22a4282a0f2e3ca5766d516ff9a5cfb7be3f3729932f916a92cebffff5b`
- `candidate/test-ui/editor-oracles/document-oracle.ts`: `c1c3f482b750530ceaa83e8afee6c0021b18c241dc722dce5fc723265db81466`
- `candidate/test-ui/editor-oracles/property-registry-oracle.ts`: `ad8aa60de918e0dd7a6854b3a1321f9a86f23645c783ea82927cfca590e99b79`
- `support/project-glossary.md`: `ba7d8a950180a26bf3e84e069fa9bd2c9450772e337d5a481c538556c10e5179`
