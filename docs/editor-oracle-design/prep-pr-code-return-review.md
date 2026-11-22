# CM-H4: code-block return failure fidelity

2026-11-19. Evaluated at HEAD `764cb40d15b8062dad70032f262807f4472ec962`
plus the exact uncommitted source bytes below, using `@tanstack/oracles`
`97a4e7a`, Playwright `1.64.1`, Node `24.19.0`, and matched Chromium
headless-shell revision `1248`. CM-H4 is **fixed-now**. This record covers
this recorder repair and its finite checks; whole-suite readiness is separate.

## Obligation and repair

The adopted law remains: “For every string and valid selection offsets, the
command returns a usable edit without throwing.” Its authority is the
`codeBlockEdit(...): FormatEdit` interface consumed directly by the toolbar.
The named comparison remains `valid input returns` at `returned`.

Previously, `{value: null}` made the returns driver read `null.from` and throw
`TypeError` before recording any observation. A source-extracted control
confirmed that failure. This is runtime failure outside the intended
comparison, not product RED or a registered kill. The earlier semantic
property separately rejected missing HTML; that did not establish the returns
comparison's fidelity.

The repaired [recorder](../../test-ui/editor-code-block.oracle.test.ts#L89)
records `{missingEdit: true}` for absent or undefined edits and
`{malformedEdit: value}` for unusable edits, including null. It validates
integer geometry before applying a candidate edit, so a BigInt offset cannot
throw during slicing. A usable edit still records `true`. Production errors
retain the existing `error` observation. Only the check reports a violation.
Seven new bound mutant-driver calibrations call this same recorder; the
original wrong-result calibration remains.

## Source binding

These hashes identify the consumed bytes, including the browser transport
and production source. Subsequent integration edits require a fresh affected
run; this record does not silently transfer evidence to other source bytes.

| Input | SHA-256 |
| --- | --- |
| Code-block oracle before repair | `8762cd0e0bb8908d949c780ed757e636f243d803e4285929d39555dbf92853c3` |
| `test-ui/editor-code-block.oracle.test.ts` | `4af0756ef155d3e0aa2da387a01cc65f623a114bd9d84d9d886b1296ad6ec45a` |
| `test-ui/editor-oracles/document-oracle.ts` | `c1c3f482b750530ceaa83e8afee6c0021b18c241dc722dce5fc723265db81466` |
| `test-ui/editor-oracles/block-model-oracle.ts` | `500a572b079e7304d5cd8af497617e8298b8d1fa23da261dfe4bb6204b1a88bb` |
| `test-ui/editor-oracles/browser-driver-oracle.ts` | `cb333a1ec8803430e354a156af5f4f98b52eb02b810dd5b6c5bacfeb7b4dd1e3` |
| `test-ui/editor-oracles/browser-source-oracle.ts` | `17eae12af402f69e9aced2d10ac6b87db853070df0a97104fa1f970d17ff01bc` |
| `scripts/formatting-oracle-application.ts` | `8de139484533e2adb15b011282fbf6c620c4eee9f4c76fb5141505087811971b` |
| `src/ui/format-shortcuts.ts` | `87b9635e519f922490df0a31c68935641a76e6c068d4e4e50dbb7e81f070eeac` |
| `vitest.oracle.config.ts` | `62264d25f35bc03e4b19ace9d26843d74c525296d71541f99909d96357ab353a` |

Both completed browser invocations reported no source drift across these
inputs and no cleanup errors. Before setup succeeded, one attempt hit sandbox
loopback `EPERM`; another found no default browser cache. Neither ran tests or
counts as law evidence. The successful runs used the matched installed shell.

## Complete-budget registered checks

The normal invocation ran the actual formatter in Chromium. The four semantic
neighbors also consumed renderer HTML from the disposable Worker's real
fragment-preview JSON response. Models and checks ran in Node.

| Normal property | Passed | Failed | Skipped |
| --- | ---: | ---: | ---: |
| `editor-code-block.literal` | 75 | 0 | 0 |
| `editor-code-block.context` | 75 | 0 | 0 |
| `editor-code-block.selection` | 75 | 0 | 0 |
| `editor-code-block.default-source` | 75 | 0 | 0 |
| `editor-code-block.returns` | 22 | 0 | 0 |
| **Total** | **322** | **0** | **0** |

Normal run duration was 12.609 seconds, not a CI runtime estimate. Every
property retained its fixed-seed and unseeded-random campaigns. The returns
property kept 100 generated runs per campaign, fixed seed `20261118`, and its
three constructions (`plain`, `empty`, `control context`).

| Returns state | Fixed campaign reach | Unseeded random campaign reach |
| --- | ---: | ---: |
| `caret` | 31 | 26 |
| `selected` | 72 | 77 |
| `documentStart` | 21 | 19 |
| `controlContext` | 19 | 22 |

These counts aggregate each campaign's constructed and generated units.
The following eight registered calibrations all passed by rejecting the
corrupted result under exactly `valid input returns`; they add seven checks
to the previous 315-test file.

| Calibration | Bound history | Result |
| --- | --- | --- |
| `invalid edit` | Constructed `plain` | Rejected at `returned` |
| `missing edit` | Constructed `plain` | Rejected at `returned` |
| `null edit` | Constructed `plain` | Rejected at `returned` |
| `non-object edit` | Constructed `plain` | Rejected at `returned` |
| `missing edit fields` | Constructed `plain` | Rejected at `returned` |
| `malformed edit offset` | Constructed `plain` | Rejected at `returned` |
| `out-of-range selection` | Constructed `plain` | Rejected at `returned` |
| `formatter error` | Constructed `plain` | Rejected at `returned` |

## Authored production controls and scoped replay

The complete-budget focused gap invocation ran the 322-test baseline twice:
322 passed, 0 failed, 0 skipped each time, in 18.2 and 18.5 seconds.
Nondeterministic registrations: 0. Three exact authored IDs were selected;
all three were killed, with 0 gaps in that selected set. The invocation took
42.597 seconds. This was a partial mutation run, not a full operator audit.

| Authored ID | Injected production result | First credited registered law |
| --- | --- | --- |
| `cm-h4-null-return` | `null` | `literal contents` |
| `cm-h4-missing-return` | `undefined` | `literal contents` |
| `cm-h4-malformed-offset` | Edit object with `from: 0n` | `valid input returns` |

Each mutant inserted one early return in `codeBlockEdit`, preserving the
original remaining source. Null and missing were first credited to the
literal-content property because it ran earlier. A separate diagnostic replay
then selected the existing returns route directly:

```sh
ORACLE_SEED=20261118 ORACLE_PATH=0 \
ORACLE_PROPERTY=editor-code-block.returns \
ORACLE_UNIT='random seed: plain'
```

That replay's baseline passed 1 registration and skipped 321 through explicit
replay selection. The baseline ran twice, in 0.5 and 0.3 seconds, with 0
nondeterministic results. Exactly the null and missing authored IDs were
selected: both were killed by
`editor-code-block.returns > random seed: plain`, law `valid input returns`,
whose unchanged comparison is at `returned`. The complete replay invocation
took 2.443 seconds. This focused replay supplements the complete-budget
baseline; it does not replace its history coverage or count skips as coverage.

## Diagnostic controls and preservation

Twenty source-extracted before/after response controls covered a usable
structural edit; absent/undefined/null/false/string/number/array results;
partial objects; wrong insert types; BigInt, NaN, fractional, negative,
reversed and out-of-range replacement offsets; negative, reversed and
out-of-range selections; and a formatter error. The repaired recorder accepted
the valid neighbor and rejected the other 19 at `returned` without throwing.
The eight calibration implementations were checked with the installed
framework comparison too. These source controls are not registered browser
or mutation credit.

An AST loss audit preserved all 5 properties and 48 existing option fields
byte-for-byte, excluding only the intended returns driver and calibration
fields. Every law statement, authority, limit, ownership entry, check,
resolver/model/reach expression, history, construction, seed, budget and
neighboring calibration is retained. No production source changed for CM-H4.

The scoped TypeScript check rooted at the code-block oracle under
`tsconfig.ui.json` checked 600 transitive files with 0 diagnostics. Both tracked
and before/after untracked whitespace checks passed. This repository exposes
no lint command/configuration or local ESLint installation; no lint run is
claimed.

## Receipt identities

The finite counts above are copied from the completed receipts below. Names
are portable artifact labels; the hashes retain their identity without
embedding host paths. Raw browser receipts contain local transport metadata
and are kept outside the repository.

| Receipt label | SHA-256 |
| --- | --- |
| Original null-return receipt | `75b8cd5c9f5a22a9730678f117ed06bc97c148ef04340bfe47f870c6c4a8da97` |
| Source response controls | `21cfbfdc9a84144ea40dce92611c6fbf5ff93db748ddeda36b82155fcdcbf580` |
| Normal registered test receipt | `87fd6b834a210147d4e7b274958c3a6cf53dd1a890ea71bc3a174c3a44d296f2` |
| Normal browser reach output | `0c7b858b340aad52b1939eab66a90b699805bb815e4f5085dc1961ea79aaaac7` |
| Complete-budget focused gap receipt | `a4bb76c19cbce7aa494e4dabff58d208feb2629b0cc195df03c92d476799d075` |
| Returns-only replay gap receipt | `ad6b65019a8c1b6fd7b9653f6687b364591162ba0b287279a74fdac11f4b54af` |
| Full browser invocation/source receipt | `7d647b093f0c95e8bd7106642ca1d7235a8f1f502b0156f3a8f42015d9a43894` |
| Scoped replay invocation/source receipt | `9e7f77f109998880f84f7300436e7ac4c12c6dda23665513ed77fbe934a8ae16` |
| Source loss audit | `1f1a9158f5a7b5dd116044a208abe8cd6f912f27aab3356eb339824026d3ea9c` |
| Scoped TypeScript output | `6f5c5d6c397b4e89bcc278ce249949cdc9c98efdc2e912ccb2a5abffa662a192` |
| Authored control `cm-h4-malformed-offset` | `e947d8e8d8627f5bba84c0fbbaf6927ecd7c0568ec29b1f40f419e61e50bd40d` |
| Authored control `cm-h4-missing-return` | `49f34fe64d7ab00457edc223f922c9c14455497f7d4d0553cb332a0b5fd264d0` |
| Authored control `cm-h4-null-return` | `fc17bdc3ea4d3a59ba1638d53caa1d47a1d351d3a6362ab75abb7197d10d4b57` |

## Checklist and limits

- ORC-001/002/003: the adopted law, independent expectations and five
  responsibilities remain; new recorder prose explains the failure boundary.
- ORC-004/007/015: grammar, budgets, constructions, fixed/random routes and
  replay interface remain; the complete normal run measured the reach above.
- ORC-005/006/013: actual browser paths, eight registered calibrations, the
  malformed-offset mutant and explicit null/missing returns replay establish
  sensitivity at the intended comparison, with a valid passing neighbor.
- ORC-008 does not apply: no reference-model state changed. ORC-009 terms
  remain aligned; missing/malformed edit fields are local diagnostics.
- ORC-010 preserves the original failure receipt and separates setup failures
  from law rejections; successful host cleanup reported no secondary failures.
- ORC-011 has no new shared semantic-model fault: this repair concerns a
  recorder crash before comparison. Existing semantic models are unchanged.
- ORC-012 is served by this source-bound record. ORC-014 credit is limited to
  the actual browser formatter/Worker and controlled bad-result recording;
  no native keyboard or physical mobile claim follows. ORC-016 remains law
  only: all permanent checks register through `oracleProperty`.

One scoped finding is fixed-now; no finding was dropped. This evidence is
bounded to the existing UTF-16 grammar in Chromium and the listed return
shapes. It does not establish all JavaScript proxies/transport objects,
Firefox/WebKit outcomes, a full mutation campaign, or whole-PR readiness.
The complete code-block baseline is separate from the diagnostic replay.
