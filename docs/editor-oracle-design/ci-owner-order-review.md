# Static CI owner ordering — independent review

Reviewer `/root/review_completed_link_oracles`, 2026-11-19, repository base
`28b0c8d642a87e5810ad6eabd95c2d1714c53396`. The installed oracle review skill,
checklist v1 and glossary were reread. This is a review of a proposed framework
option and bounded scratch controls, not acceptance of a new registered oracle.

**Current disposition: revision 2 receives bounded source/design acceptance.**
OO-001 and OO-002 are resolved by that exact revision, independently rechecked
below. Revision 1 remains unaccepted; its findings and evidence are preserved
in the original assessment that follows. Composition, runner calibration and
real-host timing are separate gates. No product test, browser, installed-runtime,
benchmark or campaign changes were made; the frozen reference process,
including session 68835, was not interrupted.

## Reviewed identities

The proposal is `ci-owner-order-proposal.md`. Its immutable candidate is under
`/private/tmp/blygger-owner-order.4FbC6XYn/`, not the installed package.

| Artifact | SHA-256 |
| --- | --- |
| Original `oracle-gaps/args.mjs` | `0ff3bfded506eb0720bb963d3d33e34806a5b658481e9c12677f96be7a115e4f` |
| Original `oracle-gaps/check.mjs` | `d2fce1610ab8bf4c61f6bd7bb1a567428cab062e48694cf44d63885256e2a247` |
| Candidate `oracle-gaps/args.mjs` | `62c8540155c148440983960c9735fc5aa0e6d1107b156109633a36aabcd4e16f` |
| Candidate `oracle-gaps/check.mjs` | `c3cc35b10a66950ccbd1eee684d780861789d2b812f78acf9b573371a81a1b25` |
| Candidate `oracle-gaps/owner-order.mjs` | `e8546a5c884a4ba1d25d1b0ad69ca073c9ba7b5f7f90bf82cb82a81bd7805933` |
| Candidate patch | `e82aee22b5e2635454660837e285fd07cee0a1c15132b2012f684653cbabbefa` |
| Author synthetic source | `7e96d1d4300dc7e3c0d2f255a9ee4797eb68c5e0f8ea8e54899d1c9f6b75a97c` |

The pinned package is `@tanstack/oracles@97a4e7a`. Independent scratch is
`/private/tmp/blygger-owner-order-review.jeku7fsl/`. Its `review-artifacts.json`
binds exact copies and evidence. `independent.mjs` has SHA-256
`dc5e1969ed8088fff6f6240d589a0760da18c83202053bbfb9217ad161c22109`;
`independent-receipts.json` has SHA-256
`a606a18ee65aa5eafc7540b3d8615cd95c641f12572ff77f71f01c1c2a22cc08`.

## Raw findings before disposition

### OO-001 (P2): the absent option introduces a new outside-owner refusal

The proposal promises that omitting `--owner-order` preserves existing target
order and baseline behavior. Nevertheless, `check.mjs` now unconditionally
passes `declarations.keys()` to `resolveOwnerOrder` before baseline. That helper
refuses every discovered owner whose lexical path is outside `pkg`, including
when `requested` is `undefined`.

The original `analyze` explicitly takes absolute config-selected `testFiles`,
reads each given path and retains its identity in `declarations`; confinement
of an `owns` entry applies to the owned source, not the oracle test file.
Existing report/identity path functions also have outside-package fallbacks.
The CLI can load a nearest-parent Vitest config. Therefore user-request path
validation and discovered-inventory policy are different boundaries; the new
option should not silently narrow the latter in its absent case.

Independent pure witness: a package contains `src/x.ts`, exporting
`x(n: number) { return n + 1 }`. A sibling `shared.oracle.ts` declares
`oracleProperty({ owns: ['src/x.ts#x'] })`. Both exact pristine and candidate
`analyze` functions accept that test-file input, preserve its declaration and
produce two source mutants with valid ownership. The candidate's following
`resolveOwnerOrder(pkg, undefined, declarations.keys())` throws
`Refusal: oracle owner …/shared.oracle.ts is outside the package`. The same
happens with one internal owner plus that shared owner.

**Evidence status:** executed actual static-analysis and helper functions with
controlled file inventories. This proves the new boundary refusal, not a full
CLI/Vitest discovery run. A real config selecting the shared test remains a
receiving integration witness; no browser or Vitest context was launched.

**Repair:** preserve previously accepted discovered identities and per-subset
order when the flag is absent. Separate validation of requested paths from
inventory representation. Decide and document the opt-in policy for external
discovered owners; retain all unlisted actual owners or refuse the explicit
request deliberately, without silently dropping them. Add both external-only
and mixed-inventory dimensions, plus real config-discovery fixtures. The
author's absent-flag control covers in-package owners only, so it misses this
domain narrowing.

### OO-002 (P2, conditional receiving boundary): requested and discovered names use different canonicalization

`normalizeOwnerOrder` resolves requested paths through `realPathOf`, but
`resolveOwnerOrder` indexes discovered keys using lexical `relativeWithin`
alone. The helper accepts `owners` without asserting that discovery has
already made every key canonical. Three independent injected inventories show
the consequence:

1. An inward alias `test/a-alias.oracle.ts` is the sole discovered owner and
   resolves to `test/a.oracle.ts`. Requesting the *same alias* is refused as
   `test/a.oracle.ts is not a discovered oracle file`.
2. An inventory with both the real file and its inward alias accepts both as
   separate owners and resolved metadata entries. Requested duplicate aliases
   are refused, but canonical duplicates in the inventory are not detected.
3. A lexical in-package symlink to an external shared oracle is accepted in
   the default inventory, although a direct external key is refused by
   OO-001. Inventory confinement therefore depends on spelling.

**Evidence status:** executed helper witnesses. `specsOf` currently stores
Vitest's `spec.moduleId` directly; it does not explicitly normalize it here.
Whether supported real Vitest discovery/configuration can supply these alias
keys has not been established. These are concrete helper mismatches, not a
claim that the current editor campaign encounters them. Typical provider
realpath behavior cannot be assumed as receiving evidence.

**Repair or next experiment:** normalize the lookup identity on both sides
while retaining original absolute dispatch identities, and define duplicate
inventory policy explicitly. Alternatively establish and assert the provider's
canonical-key invariant at discovery, with real default and supported symlink
configuration fixtures. Do not fix this by silently coalescing or dropping
distinct discovered execution identities. Integrate this policy with OO-001;
simply realpath-confining all discovered keys would retain that regression.

## Independent reconstruction and positive observations

From the proposed contract alone, owners `a,b,c,d` with prefix `[c,a]` must
rank `[c,a,b,d]`; the subset `[d,c,b]` must dispatch `[c,b,d]`. The absent flag
must preserve `[d,c,b]`. These predictions follow from prefix-plus-remainder
ordering and subset restriction, without production classifiers. The actual
helper returns these results and preserves the original absolute identities.

The independent enumeration covers every ordered prefix of four owners,
including no flag, across forward and reverse discovery orders: **130
prefix/discovery combinations and 4,160 subset-order checks**. It covers empty
subsets, forward/reverse subset inputs, omitted and complete prefixes, and
checks that input arrays are not mutated. This is bounded helper evidence,
not arbitrary-size coverage or a registered law kill.

Requested-path neighbors pass: internal aliases, duplicate aliases, escaping
file/directory symlinks, dangling links, outside paths, spaces, Unicode and
literal POSIX backslashes. This case-insensitive host also canonicalizes case
aliases and refuses their duplication. Cross-platform receiving behavior
remains untested. The unchanged author suite was replayed in the independent
scratch copy: all **14 checks pass**. Syntax checks pass for all three candidate
modules. Exact pristine/candidate/patch hashes were independently verified.

The following are supported by the actual patch and extracted-function
checks, separately from a real campaign:

- Every unlisted owner is appended to the explicit rank; each supplied subset
  keeps its original absolute file identities. Unknown and duplicate subset
  members refuse. No-flag order is preserved for the accepted in-package
  domain, subject to OO-001.
- Operator and authored planners both call the same `orderedOwners` function.
  The operator passes its original `oracleTargets`; the authored planner
  retains the original `fileSpecs` filter before ordering. These seams do not
  remove members by source inspection.
- Both complete baseline phases, within-file tests/selections, selected-tail
  validation, seeds, budgets, ordinary-test tier and classifiers are unchanged
  by this patch. This is source preservation, not executed baseline evidence.
- The actual run identity and global unit-cache key bind both requested and
  complete resolved plans. Equivalent relative/absolute request spellings
  agree. Different explicit requests remain separated even if their final
  rank agrees. Existing key inputs and served/imported input validation remain.
  The new helper joins `ownFiles`, binding its implementation to these hashes.
- `run.ownerOrder` and top-level results retain the plan. In default mode,
  `resolved` is an inventory, not an assertion of canonical dispatch order.

Two claims need precise wording. `orderedOwners` cannot detect an omitted
valid member: arbitrary subsets are intentional inputs. Its checks alone do
not prove that a future integration never drops an owner. Also the operator
report's per-mutant `oracleFiles` retains the original target order while
dispatch uses the requested rank. The global `ownerOrder` supplies that rank;
the array must not be described as an execution trace.

## Composition and real integration gates

This layer alone does not stop authored owner jobs early; the present authored
planner still dispatches every owner. No synthetic result establishes a CI
speedup. Before applying a composed candidate:

1. Resolve OO-001 and establish OO-002's discovery invariant or repair. Preserve
   these original findings and candidate identities in the disposition.
2. Repair and independently recheck ASR-1 from
   `ci-authored-scheduler-review.md`: owner ranking does not fix patch cleanup
   when initial/cleanup invalidation throws.
3. Apply this same resolved rank before operator lazy-selection positions and
   authored minimum-killing-position indexes. Preserve every required owner
   until a verified behavioral kill; timeout, setup, crash, calibration,
   unregistered, random-only and no-kill outcomes must not authorize omission.
   Missing required prefix units must fail, and baseline blockers must remain
   blockers absent a real kill. Keep ordinary-test tier order unchanged.
4. Add explicit owner-set accounting around both composed planners; do not
   rely on a subset-order helper to detect missing tasks. A lazy operator
   integration must also prove it does not eagerly validate later owners
   after a decisive earlier kill.
5. Wait for all already-running jobs and clean every slot before returning.
   Record actual work, including later in-flight jobs. Diagnostic credits
   must be canonical for the **recorded requested rank**, independent of
   completion timing. Different requested ranks can legitimately choose
   different witnesses. Later-owner credits deliberately omitted by the
   prefix contract must not be synthesized or reported as exhaustive.
6. Preserve plan/implementation cache separation, input validation, full
   baselines, file/test identities, seeds and budgets in the actual merged
   source. Rerun each layer's synthetic checks on that source, then perform
   original/candidate real-host calibration and classification/report
   comparisons under the frozen-reference protocol.
7. Measure an actual cold Linux CI run only after those gates pass. Synthetic
   avoided jobs and helper rankings are not elapsed-time measurements. No
   package-pin upgrade is proposed by this review.

## Checklist accounting (v1)

| Requirement | Outcome and trigger-specific reason |
| --- | --- |
| ORC-001 | Proposed option authority is the explicit ordering/compatibility proposal. OO-001 contradicts its absent-flag promise. This review does not adopt a new product law. |
| ORC-002 | Prefix/remainder and subset predictions are independent of the helper; actual extracted identity/cache expressions are exercised as the implementation under review. No classifier-correctness claim is made. |
| ORC-003 | Proposal separates option semantics, planner seams, identity and limits. This is not a registered oracle-file literacy acceptance. Report order and subset-omission claims need the precision noted above. |
| ORC-004 | No product-history grammar changes. Accepted discovered-input scope is narrowed by OO-001; injected alias inventories expose OO-002. Bounded pure enumeration is explicitly described. |
| ORC-005 | Actual args/helper, extracted identity/cache expressions and static analysis ran in scratch. Real Vitest discovery, baseline and browser execution remain unclaimed. |
| ORC-006 | Invalid/duplicate/unknown requests and rank/subset distinctions are challenged. Pure assertion/refusal witnesses are not registered law kills; no oracle repair or bug-class closure is claimed. |
| ORC-007 | Not triggered by an important generated property: these are bounded scratch controls. Existing fixed/random product campaigns, seeds and budgets are unchanged. |
| ORC-008 | No stateful product model changes. Requested mode, prefix, inventory and identity rank each distinguish promised ordering/identity behavior. No-flag inventory is explicitly distinguished from dispatch order. |
| ORC-009 | Owner means discovered oracle file; requested prefix, global rank and per-mutant subset are separate concepts. Unit outcomes and law kills retain the package meanings. |
| ORC-010 | This helper creates no runtime resources or cleanup boundary. Existing scheduling cleanup is not certified; composed authored ASR-1 remains blocking. Path validation failures are identified as refusals. |
| ORC-011 | Independent declarative sequence/subset expectations and actual-analysis input witnesses challenge the candidate. Provider canonicalization is an unresolved premise rather than copied into expectations. |
| ORC-012 | This versioned record binds exact artifacts and dispositions. No full framework-oracle audit, product bug-class closure or timing claim is accepted. |
| ORC-013 | Pure controls distinguish prefix from discovery/subset order, empty from nonempty requests, aliases from distinct files, and external-only/mixed inventories. These are bounded boundary witnesses, not a claimed reusable registered law. |
| ORC-014 | Controlled discovered inventories are named. Real config/symlink discovery and composed host behavior remain explicit receiving gates. |
| ORC-015 | Not triggered by a new or changed important generated property; no reach count or new constructed-history claim exists here. Existing product reach obligations remain unchanged. |
| ORC-016 | No ordinary tests were added to product oracle files. Standalone scratch assertions are labeled bounded proof controls and do not count as registered oracle or mutation evidence. |

The installed `args.mjs` and `check.mjs` still match the original hashes after
the independent runs. Only this review document and unique scratch evidence
were written. The exact original candidate remains unaccepted pending OO-001;
OO-002 and all real integration/measurement gates stay visible.

## Revision 2 rereview and current disposition

The sections above record the original candidate. They are not erased or
retroactively credited with repair evidence. The revised proposal now defines
canonical alias groups separately from dispatch identities, preserves every
discovered dispatch identity, and documents external remainders and default
passthrough explicitly.

### Exact revision 2 identities

Candidate scratch is `/private/tmp/blygger-owner-order-v2.zqMZVezC/`.
Independent rereview scratch is
`/private/tmp/blygger-owner-order-v2-review.emdi4t1m/`.

| Artifact | SHA-256 |
| --- | --- |
| Revision 2 patch | `07ee8712ba93ee3f3a88e9f190845018ccc8e5abcac691c63ceac5d0f3d88a31` |
| Candidate `args.mjs` | `4bf520c313be96d6e55061d55712a597c81a77f10b48bcbca9090d13109b6f70` |
| Candidate `check.mjs` | `c3cc35b10a66950ccbd1eee684d780861789d2b812f78acf9b573371a81a1b25` |
| Candidate `owner-order.mjs` | `45226beb934cfed8aad87cae75fec37568a9d3c8931d7650be77542b3e14c1c7` |
| Author synthetic source | `0fa36aee3611a8f35d42aeebfcc3e8693b8f192096252de4c1b44e3a71cd0399` |
| Author/independent receiving source | `5efdada6b5cb417108ba391982de0b3393be0e3e43822055ccebd244fbc9c59d` |
| Author/independent receiving receipts | `f743f60684ae2d1617e1eb63816e7683b0117d7f556eed0af8bd863acd53e184` |
| Independent control source | `4bd8ff27b92c6da4d1e6961f37954a930f97adab5aa4ce0eb895270c30b2822a` |
| Independent control receipts | `75ebc1f20c07ce8f714e4e50ef5a5558a4f1c17451fc966b7a3d412d367112e3` |

Original base hashes remain the same. `review-artifacts.json` in independent
scratch records replay logs and all reviewed/copied evidence identities.
Candidate syntax and `git apply --check` against its exact pristine package
copy pass. Source and evidence hashes were independently verified.

### OO-001 disposition: resolved for revision 2

The no-flag branch now returns a copy of the caller's subset without new
realpath, readability, confinement, duplicate or membership preconditions.
Its sorted relative `resolved` list is inventory metadata only. External
owners remain represented as paths such as `../shared.oracle.ts`.

I independently replayed the unchanged author's receiving script in my own
scratch copy. It invokes the candidate's extracted actual `discoveredConfig`
helper and installed Vitest 4.1.12's real
`createVitest` → `standalone` → `globTestSpecifications` boundary. The two
nearest-parent config fixtures select external-only and mixed internal/external
owners. Both pristine and candidate actual `analyze` functions accept identical
declarations, and the candidate resolver preserves exact no-flag dispatch
identities/order. The explicit mixed case retains its external remainder;
the outside request itself still refuses.

This supplies the real receiving premise missing from revision 1's review.
It is discovery/static-analysis evidence only: fixture modules contain a
top-level throwing sentinel, no test-execution API is called, and each context
closes in `finally`. No product test or browser ran. Independent direct
controls also retain missing and dangling previously discovered files in
default mode, so no new filesystem-readability precondition is hidden there.

### OO-002 disposition: resolved for revision 2

The same independent receiving replay confirms that actual Vitest discovery
retains lexical alias module IDs. Alias-only, real-plus-alias and outward-alias
fixtures run with both `resolve.preserveSymlinks: false` and `true`: six alias
fixtures, in addition to the two external fixtures. Real-plus-alias discovery
returns distinct identities, proving that deduplicating by realpath would lose
actual jobs. The eight replay receipts exactly equal the author's receipts,
including their SHA-256 above. Six additional direct neighbor controls pass.

Explicit mode now matches requests and inventory through canonical real paths
while retaining each original dispatch key. Requesting an inward alias works
when only that alias was discovered; requesting its real file or another alias
gives the same canonical request and rank. All discovered aliases in the
requested group lead in dispatch-name order. Every unlisted identity follows,
including external files and outward aliases, ordered by canonical real name
then dispatch name. Exact duplicate dispatch keys refuse explicitly; distinct
keys sharing a real file remain distinct jobs. Outside requests and duplicate
canonical requests still refuse. This is the revised explicit contract, not
an assertion that alias jobs execute only once.

### Additional independent challenges

`independent-v2.mjs` defines an eight-identity inventory: three internal real
files, two inward aliases of one file, an external file, and two outward aliases
of that external file. Across every ordered prefix of the three requestable
real files and two discovery orders, all **32 prefix/discovery cases** pass.
They check **15,360 explicit subset-order comparisons** and **1,024 no-flag
comparisons**, including all 256 subsets and reversed subset inputs. Expected
order is derived from requested canonical-group priority and lexical real/dispatch
names using filesystem `realpathSync`, without importing the candidate planner.
Input arrays stay unchanged; every dispatch identity and multiplicity remains.
Canonical request spelling and reversed discovery produce identical metadata.

The same independent controls exercise external-only, mixed, outward-alias,
alias-only, combined and missing/dangling default inventories; duplicate/outside
requests; exact duplicate/missing/dangling explicit inventories; and
duplicate/unknown explicit subsets. Empty explicit subsets remain legal.

An independent real symlink retarget keeps the request and resolved dispatch
rank identical while changing only the canonical mapping for one alias. The
actual extracted candidate `identityOf` function and `globalKey` expression
both change their hashes, and the returned run metadata exposes the full new
mapping. This verifies data-derived inventory binding, beyond a hand-edited
metadata object. All **15 author synthetic checks** also pass independently.

`check.mjs` is byte-identical to the revision-1 candidate already reviewed.
The patch still contains only the same imports, helper implementation-hash
entry, one pre-baseline resolver call, identity/cache/report binding, and two
owner-target ordering seams. Thus baseline/test identities/order, within-file
selection, selected-tail code, seeds, budgets, ordinary tier and classification
source preservation remain established. The replayed controls exercise the
actual identity/cache expressions and source report seam; a real campaign
report and real candidate baselines remain unexecuted.

The revision-2 proposal also corrects the two overbroad presentation claims:
a subset helper cannot detect omitted valid owners, and a per-mutant
`oracleFiles` array is not the dispatch trace. Planner owner-set accounting
and global rank metadata remain necessary in composition.

### Revision 2 checklist dispositions

| Requirement | Current outcome and reason |
| --- | --- |
| ORC-001 | The revised explicit policy separates request confinement, dispatch identity and external remainders. OO-001's absent-flag compatibility promise is independently satisfied at real discovery/static-analysis boundaries. |
| ORC-002 | Independent group-priority/subset predictions use input paths and filesystem canonicalization; candidate ranking/classification helpers do not supply expected order. |
| ORC-003 | Revised prose distinguishes mode, canonical group, dispatch identity, subset, report metadata and limits. No new registered oracle-file literacy claim. |
| ORC-004 | No product-history grammar changed. Prior discovered-input narrowing is removed; alias/external/missing-file default neighbors and explicit validation dimensions are accounted for. |
| ORC-005 | Actual pure functions, identity/cache expressions and real Vitest discovery/static analysis ran. No product test, browser, mutant campaign or baseline execution is claimed. |
| ORC-006 | Original refusing/mismatched boundary designs are distinguished by repaired witnesses. Invalid/duplicate/outside inputs remain challenged. These are controls, not registered law kills. |
| ORC-007 | Not triggered by a new important generated property; bounded scratch controls do not replace fixed/random product campaigns or change their budgets. |
| ORC-008 | No stateful product model change. Canonical grouping and dispatch identity are both necessary: real discovery returns distinct alias keys, while equivalent requests must match their real group. |
| ORC-009 | Canonical file/group and dispatch identity are explicitly distinct; owner-job multiplicity is retained. Rank, inventory and per-mutant subset are not conflated. |
| ORC-010 | New helper has no created runtime resources. Receiving contexts close in `finally`; no fault-cleanup claim is inferred from successful discovery. Composed scheduling cleanup remains separately reviewed. |
| ORC-011 | Independent mixed-inventory sequence/subset formulation and actual retarget challenge the ranking and metadata separately from author checks. |
| ORC-012 | Exact revision identities, original findings, repairs, independent executions and current limits are preserved here. No global bug-class or timing closure claimed. |
| ORC-013 | Original failing domains and nearby invalid/duplicate/default/explicit cases distinguish the repaired boundaries; finite inventory bounds and lack of registered law-kill evidence remain explicit. |
| ORC-014 | Real receiving fixtures now establish external/alias discovery premises for installed Vitest 4.1.12 and both tested symlink settings. Test execution and composed-host premises remain unestablished. |
| ORC-015 | Not triggered by a changed important generated property: no new reach or construction claim. The enumeration counts comparisons, not declared-state reach. |
| ORC-016 | No product oracle files changed. Scratch assertions and discovery controls remain separate from registered oracle evidence. |

### Current acceptance and limits

**OO-001 and OO-002 are resolved for exact revision 2. Bounded source/design
acceptance is granted to that owner-order layer.** No further source blocker
was found in this rereview. This does not accept revision 1, apply the patch,
or prove complete framework-oracle correctness or CI speed.

The separate authored scheduler review now records its own revision-2 ASR-1
repair and bounded source acceptance. A composed candidate must use those
reviewed identities, rather than inheriting acceptance for an arbitrary merge.
The other composition gates above remain: shared rank before position indexes,
complete owner-set accounting, no early stop on nonkills, required-prefix
records, preserved blockers/ordinary order, all-settled cleanup, canonical
rank-relative diagnostics, honest omitted credits and executed work, conservative
cache separation, complete baselines and unchanged input/test/seed budgets.

Rerun all layer controls against the exact merged source, then perform actual
runner calibration, original/candidate real-host classification/report
comparisons and cold Linux CI measurement. Discovery witnesses alone do not
establish those results. The installed base hashes still match after this
rereview; the frozen reference and pending product execution/deletion gates
remain unchanged.
