# Cursor helper enforcement

The internal guard questions recorded below were subsequently approved and
enforced in [cursor guard enforcement](oracle-cursor-guards-review.md). The
historical receipts and their then-open limits remain unchanged below.

This record accompanies the cursor helper and oracle files committed with it,
based on `1ffc7069604a58a60ef9ac5621fe35190dbca626`. It records focused helper
evidence. The complete eight-source Studio gate subsequently passed 1,533
stable checks and rejected 743 mutations in run `65b4444c2c39`; its five
survivors are the trusted-producer/declaration guard gaps listed here. See the
[combined receipt](../test-oracles/review.evidence.md#latest-eight-source-integration-cut).
This record makes no complete cursor-helper or bug-class closure claim.

## Authority and independent models

`docs/api.md`, Read and poll, requires usable opaque continuations, positive
page limits, invalid-input for invalid pagination, source identity binding,
relevant-generation expiration and unrelated-generation preservation. Its
generation bracket covers selection and projection and allows one initial-page
retry. `src/contract/routes.ts` bounds incoming tokens at8192 and coerced integer
limits at1..100. Existing `test/cursor-range.test.ts#legacyCursor` establishes the
accepted v1 input fixture. The oracle receives issued tokens unchanged and does
not require any outgoing byte representation.

`cursor-codec.oracle.test.ts` derives complete two-row observations from input
keys, semantic source descriptors and write schedules. Its independent fixture
uses Node Buffer/base64url and createHash, while production uses
TextEncoder/btoa/subtle. It does not import a production codec, comparator or
keyset builder into its models. Native SQLite executes the actual SQL through
`cursor-sqlite.ts`; the adapter performs no SQL semantic emulation.

The shared `cursor-keyset-model.ts` sorts the complete input array independently
of keyset predicates. Node and Worker drivers consume the same grammar, model,
directions and rows. Mandatory null/number/text/tie fixtures and up to8 extras
vary all three order directions, widths1..4 and materialization. A six-range
case preserves the legal wider-order fallback.

The deep indexed-work model instead uses fixture-index arithmetic. Native
EXPLAIN receives the existing SEARCH/noSCAN/noMATERIALIZE law; the Worker
companion independently receives the existing D1 rows_read<250 law. Both use
5000 rows, page25, the real partial index and boundaries100/101/199. The former
OR returns the same identities but has a native ordered scan and D1 work>4000.
No exact SQL spelling or new work promise for wider orders is imposed. See
[the real D1 receiving record](oracle-generation-handoff-review.md).

## Grammar and permitted choices

The helper grammar reconstructs numeric/null/Unicode keys, valid8191/8192
tokens,22 malformed envelopes/required-field variants,11 one-axis source
changes, page bounds/default/coercion, and zero/one/two projection writes.
Removing the key axis loses typed receiving; raw-envelope defects lose precise
invalid-input classification; source changes lose identity/generation
separation; request-local width/materialization retain permitted choices;
projection schedules lose retry/continuation/second-instability distinctions.

The key grammar uses finite doubles, null and persisted Unicode scalar strings
including control characters. SQLite UTF8 text cannot retain lone JavaScript
surrogates, so those are not persisted-key premises. Malformed UTF8 is supplied
as raw token bytes inside otherwise-valid JSON, where replacement decoding
would wrongly succeed. Boolean/object/nonfinite cursor-key fields are invalid
external histories, not filtered away as legal data. Unknown extension-field
and BOM policy is not established by these fixtures.

The model predicts an allowed set for completed proofs. With a supplied
snapshot, a stable full state retains its completion proof. After a full-state
crossing, a successful page may omit the proof and let the conditional adapter
read afresh. Every supplied proof must name the completed state; page values
and projection count remain exact. Review WH16 exposed an accidental mandatory
retry-proof expectation. The repaired check permits only that omitted-proof
alternative, preserving stale-proof and wrong-page rejection.

## Design grammar and production cleanup

Three or more gaps in decode/source generation triggered the design grammar
before new histories. The preservation relation is the named existing laws at
issued-result, receiving-call and completed-projection checkpoints. Parts are
source identity, relevant generation, typed boundary, bounded envelope and
request-local width. Strict outgoing wire snapshots were rejected because
opaque output representation is a permitted choice. Real-provider walks and
malformed codec receiving serve different observations; neither replaces the
other.

Once the strengthened current implementation passed, decoder error translation
was limited to byte/JSON failures. Shape validation now runs after that catch,
so it no longer catches and recreates its own invalid-input failure. The
explicit native-default ignoreBOM option was removed. Cloudflare's constructor
type incorrectly requires that optional native option, so one narrow
`ConstructorParameters<typeof TextDecoder>[1]` assertion adapts the type. This
is type compatibility with the same WHATWG runtime default, not a BOM policy.

Retry orchestration now calls one attempt implementation at most twice. A
stable first attempt returns; an unstable continuation expires; an initial
retry obtains a fresh snapshot and a second instability expires. The previous
loop's third iteration and trailing throw could never execute: every stable
attempt returned and only the first unstable initial attempt could continue.
A temporary boolean loop expressed the bound less directly and generated a
looping hostile variant; the final structural form removes that state. The
attempt's unused null sentinel was also removed: only absence is inspected,
and null versus undefined cannot change any returned page or thrown error.

## Review and campaign receipts

All commands use the installed pinned `@tanstack/oracles@97a4e7a`, its registered
`oracleProperty` routes, the real gap checker and contexts1. No bare Vitest run
is cited as oracle product evidence.

| Focused run | Stable checks | Mutants | Killed | Open gaps | Unowned warnings |
| --- | ---: | ---: | ---: | ---: | ---: |
| First complete helper source, `fe89fab69fb4` |232|219|178|26|15|
| Strengthened before cleanup, `7b92ea5ca85c`, seed20261001 |259|219|188|16|15|
| Intermediate boolean cleanup, `b3a3d6630dc8`, seed20261118 |252|214|189|6|19|
| Bounded cleanup before absent-sentinel removal, `57f7b36308f1`, seed20261001 |266|222|197|10|15|
| Final helper, `a6940e63800e`, seed20261001 |266|221|197|9|15|

The six gaps in the intermediate row comprised five undecided guard laws and
one looping hostile retry variant. The later bounded row removed the looping
state, exposed the unused null representation, and restored the original
conditional-work owner. Its four foreign conditional-operation authored
shortcuts require their integrated receiving owner; they are not closed by
this focused selection. Warnings similarly identify foreign selected authored
controls, not missing static cursor ownership.

Independent reviewer controls on final source SHA256
`2f2091be1abd8f62562dddc1f14b86c451791e21cdeec57bbcc6c45c92dafc28`
passed34 paired old/new actual-driver/native-SQLite traces:22 malformed inputs
and12 projection schedules. Fourteen actual-driver positives cover current and
omitted raced proofs, related/unrelated writes, expiry neighbors, signed zeros
and manual mixed-key orders. Four installed-judge controls reject wrong pages
or supplied stale proofs at the original complete checkpoint while retaining
distinct cleanup causes. These are checker/allowed-form evidence, separate
from gap-campaign production kills. Receipts are under
`/tmp/blygger-etags-prep-review/ci/cursor-helper-final-cleanup-comparison-absence.*`
and `cursor-codec-independent-review-final-absence.*`.

All three TypeScript programs passed via `npm run typecheck` after the bounded
helper change. Focused ESLint on the helper, codec, keyset, native adapter and
indexed driver passed with zero warnings. Final source hashes, common semantic
mutant-key preservation and final absent-sentinel campaign are appended below.

The final focused campaign is reproducible with:

```sh
npm run test:oracles:gaps -- --runtime studio --contexts 1 \
  --files test-oracles/conditional-cursor-work.oracle.test.ts,test-oracles/cursor-codec.oracle.test.ts,test-oracles/cursor-keyset.oracle.test.ts,test-oracles/cursor-indexed-work.oracle.test.ts \
  --source src/cursor-page.ts --seed 20261001 --out /tmp/cursor-helper-final
```

The original and final same-seed reports share145 semantic mutant keys.
All121 shared keys killed before cleanup remain killed; zero kills were lost.
Of76 new keys,74 are killed and two are the still-open unsupported-row-key
guards below, moved into the single attempt helper. Disappeared keys need no
preservation credit. Comparison receipt:
`/tmp/blygger-etags-prep-review/ci/cursor-helper-common-keys.json`.
Every new non-guard decision, including the bounded attempt orchestration, is
killed on a reproducible registered law route. No production crashes, oracle
baseline failures or nondeterministic oracle tests occurred in the final run.

The existing five-range threshold control is killed by the native indexed
driver, while Worker receiving run `e9ff39569e7f` independently passed6 checks
and killed its authored `<=5`→`<5` regression through real D1 metrics/plans.
The combined Worker receiving suite is repeated against the final helper and
recorded in the linked generation-handoff evidence.

The final focused report retains exactly these cursor guard gaps. The laws
under consideration require rejection only; no exact error, status or
pre-SQL timing has been established for these trusted internal boundaries.
No dependent tests have been adopted without that decision.

| Final ID | Semantic key and current evidence |
| --- | --- |
| M12 | `src/cursor-page.ts#encode:if-false`, remove `result.length > CURSOR_MAX` rejection. Issued8191/8192 and malformed incoming oversized tokens are covered; producing an unrepresentable outgoing key is a distinct internal boundary. |
| M78 | `src/cursor-page.ts#column:if-false`, remove source-column rejection. Canonical legal declarations are covered. A native table with a legal SQL column named `bad-name` can distinguish the internal declaration rule from SQL rejection. |
| M119 | `src/cursor-page.ts#cursorPage:if-false`, remove empty-order rejection. Every legal source has a total order. Native SQL also rejects the empty ORDER BY, so this explicit guard may contribute no separately promised observation under a rejection-only rule. |
| M165 | `src/cursor-page.ts#attempt:if-false`, remove unsupported returned-key rejection. All legal persisted null/string/finite-number keys are covered; trusted returned BLOB/nonfinite/projected keys require the separate rule. |
| M170 | `src/cursor-page.ts#attempt:binary-swap` suffix`~5`, `typeof value !== 'number' || !Number.isFinite(value)`→`&&`. Same unsupported-returned-key boundary; existing finite-key histories cannot distinguish it. |

Four additional gaps in this focused selection are authored unsafe shortcuts
for getItem, listItemVersions, listReading and getReadingSummary in
`src/conditional-operation.ts`. The original focused report also retained
them. Their actual derived-writer receiving owner kills all four in the full
Studio run `65b4444c2c39`. That integrated result closes these foreign controls;
the focused helper selection supplies no such closure credit.

Final source SHA256 identities:

| File | SHA256 |
| --- | --- |
| `src/cursor-page.ts` | `2f2091be1abd8f62562dddc1f14b86c451791e21cdeec57bbcc6c45c92dafc28` |
| `test-oracles/cursor-codec.oracle.test.ts` | `d14e794c8f6499c4633747a2343bad03f1aee311e90a18c97064f695eb64758e` |
| `test-oracles/cursor-keyset-model.ts` | `608b0c7900e5b2cdd8f522166e14049a255653e50b8e7f217503e4e58c12c11e` |
| `test-oracles/cursor-keyset.oracle.test.ts` | `55ae95ebf4fe26efaca270834b8ed1c28d998ab9dc58c6e23de0223bfcfb1657` |
| `test-oracles/cursor-sqlite.ts` | `ac4a2e378f93722edbc289ab340ca8c0248059579da79fea76687e6563a5a1ab` |
| `test-oracles/cursor-indexed-work-model.ts` | `3171c0f957802bbc0a4442b0b2cc4f19dee866f261477147c13605b4286767ab` |
| `test-oracles/cursor-indexed-work.oracle.test.ts` | `f338cd82d9ac7ac13976f50fbf1712069161b9a04ad084d467a5d191f305d7f2` |

Final reach counts below sum the first baseline fixed/random route for each
constructed/generated label, omitting repeated mutation instrumentation. Each
malformed-input state entered2–9 histories; every declared state entered at
least once. Full per-state receipt:
`/tmp/blygger-etags-prep-review/ci/cursor-helper-reach.json`.

| Property | Entered states and counts |
| --- | --- |
| continuations | exact-bound=17, near-bound=20, null-key=10, numeric-key=6, unicode-key=6 |
| malformed inputs | after=2, after-boolean=2, after-infinite=2, after-length=6, after-object=3, base64=4, empty=5, epoch=7, generation=5, json=4, oversized=2, padding=9, revision-fraction=2, revision-negative=6, revision-unsafe=3, revisions=2, root-null=6, root-number=3, source=3, utf8=7, version=6, whitespace=5 |
| source bindings | absent-filter=4, collection=6, direction=6, domains=4, epoch=6, filters=8, materialize=8, order=7, relevant=8, same=8, unrelated=7 |
| limits | above-maximum=4, default=12, fraction=3, maximum=6, minimum=6, nonfinite=9, string=16, zero=4 |
| projection | continuation-expiry=17, first-page-retry=12, repeated-expiry=8, snapshot-expiry=12, snapshot-retry=9, stable=12, unrelated-projection-write=15 |
| mixed-key walk | cross-page-ties=75, materialized=41, nonmaterialized=41, null-asc=45, null-desc=37, number-text=82, six-range-fallback=4 |
| native indexed enumeration | adjacent-boundary=1, different-depth=1, original-boundary=1, scan-sensitive-fixture=3 |

## Checklist v1 dispositions

| Requirement | Disposition |
| --- | --- |
| ORC-001 | Existing docs, schema and established legacy/work fixtures are identified above. Trusted producer/declaration/key guard promises remain separate open questions. |
| ORC-002 | Input-derived array/descriptor/write arithmetic predicts observations. Models import no production semantic helpers; actual SQLite judges SQL. |
| ORC-003 | Opening law prose and inline notes separate grammar, independent model, driver and checkpoint checks; permitted receipt omission is stated with the model repair. |
| ORC-004 | Reconstruction, ablation, ranges and nearby invalid inputs are stated above. The persisted-string representation was selected before any baseline receipt; no later grammar narrowing clears a failure. |
| ORC-005 | Drivers invoke actual cursorPage, observe exact pages/errors/projection counts and real plan characteristics at named completion checkpoints. |
| ORC-006 | Calibrations reject repeated first rows, misclassified invalid input, retained changed filters, accepted zero limits, wrong retry projection count, stale supplied proof and ordered scan. Gap kills are registered assertion routes; intermediate timeout is explicitly separate. |
| ORC-007 | Generated codec/keyset properties run fixed seed20261118 and random campaigns with identical25-run budgets and direct replay. Indexed work is a bounded three-history enumeration, so generated random-budget requirements do not apply to it. |
| ORC-008 | Models are pure whole-history functions, with no stateful reference state merged or removed. Production retry state removal has the at-most-two-attempt argument above. |
| ORC-009 | Source descriptor, relevant generation, projection and completion proof map directly to the documented helper/operation boundaries. Native plan observations are distinct from D1 work metrics. |
| ORC-010 | Only awaited production calls are captured. Fixture construction, proof setup, EXPLAIN and cleanup failures stay native. Actual judge controls preserve observed mismatch precedence and cleanup diagnostics. |
| ORC-011 | Native SQL and the independent whole-array comparator challenge keyset semantics. Old equal-result OR plus provider EXPLAIN/D1 metrics separately challenge work. No further plausible shared semantic fault requiring another formulation remains named. |
| ORC-012 | This versioned record accompanies the source, names incomplete scopes and does not claim complete helper closure. |
| ORC-013 |8191/8192/oversized receiving, limits0/1/100/101, unchanged/changed descriptors, first/continued and one/two relevant crossings distinguish the boundary rules. Five-range seek versus six-range legal fallback distinguishes the platform threshold without prescribing SQL spelling. |
| ORC-014 | Native SQLite supplies actual SQL semantics. The same mixed-key grammar/model has a real Worker/D1 driver; indexed arithmetic has separate real native plan and D1 metric receivers. Controlled Node evidence alone makes no deployed consistency claim. |
| ORC-015 | Every generated state has a constructed history and emitted reach. The final campaign's state counts are recorded below; indexed cases enumerate each declared boundary and scan-sensitive neighbor. |
| ORC-016 | Product evidence is registered only through oracleProperty; fixed/constructed cases share the same model, driver and check. |
