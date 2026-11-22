# WebKit formatting-session execution

2026-11-18, base `28b0c8d642a87e5810ad6eabd95c2d1714c53396`, uncommitted
`oracles-explore` worktree. Oracles package pinned to
`97a4e7a8e4b870c269bff297a16bf8435d258640`.

The native-history problem has a working, independently reviewed driver repair.
The registered session oracle passed **138 checks twice**, with **zero
nondeterministic histories**, and rejected **all three selected authored
mutants**. This evidence covers the explicit macOS Playwright WebKit receiving
host below. It does not establish ordinary Safari behavior, a green default
WebKit install, complete mutation coverage, or lossless raw-navigation migration.

The exact [frozen inputs](https://github.com/blygger/blygger-studio/blob/fb0b79dc0450e5f3d31a5a8f59c0b697b5cc5f6e/docs/editor-oracle-design/webkit-ui-transition-run-inputs.json),
[machine-readable execution receipts](https://github.com/blygger/blygger-studio/blob/fb0b79dc0450e5f3d31a5a8f59c0b697b5cc5f6e/docs/editor-oracle-design/webkit-session-execution.json),
[research](webkit-undo-research.md), and
[independent review](webkit-native-host-review.md) identify the source and host.

## What changed

Playwright's macOS keyboard injection bypasses the ordinary NSApplication event
dispatch. AppKit can then group distinct formatting edits and setup input into
one undo group. A blind blank-window pulse initially appeared to split that
group but failed repeatability. The replacement uses a sterile reference editor
to acknowledge a real native boundary: after separate A/B insertions, native
Undo must restore only A. A grouped result retries, up to twelve attempts;
contradictory receipts or exhaustion are explicit host setup failures. The
reference context contains no application scripts, cookies, model or expected
product answers.

Plans with any Undo/Redo retain the boundary from setup through every action;
plans without those commands do not consume that host premise. Every product
observation remains before its following boundary. All 42 constructions,
25 runs per campaign, seed `20261118`, action checkpoints and exact expected
source/selection/focus/preview observations remain. The independent model and
production formatter retain their previous SHA-256 fingerprints in the manifest.

The receiving investigation also corrected the full-editor→quick-editor driver:
its in-app transition now clicks the real **← compose** Router Link, which awaits
the editor's save-on-leave path. It does not call a test-only save or add a delay.
The expected latest source is unchanged. The old hard-goto receiving dimension
remains a separate obligation under the [navigation review](webkit-navigation-premise-review.md).

## Execution and challenges

| Run directory under `build/formatting-oracles/` | Outcome | Interpretation |
| --- | --- | --- |
| `session-mixed-webkit-native-boundary` | 131 passed / 7 failed | Superseded blind pulse; not green, no mutation kills. |
| `session-webkit-witness-r2395` | 75 passing records when stopped | Incomplete; no repeat or mutation claim. |
| `session-webkit-witness-r2395-final` | 136 passed / 2 failed | Hard-goto quick-transition nondeterminism; all three challenges blocked. |
| `session-webkit-ui-transition-r2395` | 138 passed twice; 3/3 selected mutants killed | Final bounded native-history and in-app receiving evidence. |

The final unmutated runs took 386.4s and 388.3s; the report is nonprovisional.
It used 180s per-test/first-execution ceilings because native boundary receipts
add browser IPC. The history budgets and laws were unchanged. Mutation evidence
was computed afresh (`reused: 0`), not taken from the earlier failed run.

| Selected authored challenge | Distinguishing registered history | Intended observation |
| --- | --- | --- |
| `browser-native-undo-required` | `composer-desktop` | Undo must restore the preceding source despite an implementation that always uses direct fallback. |
| `document-start-formatting` | `editor-desktop` | Formatting the whole loaded source must preserve its content. |
| `native-delete-undo` | `empty-bold-desktop` | Undo must restore the removed empty emphasis pair. |

All three were rejected through `browser editing history`, rather than setup
errors, transport failures or timeout substitutes. These three selected kills
are a partial campaign; the earlier complete 381-mutant campaign was not rerun.

Historical full session campaigns in Chromium and Firefox each passed 138
checks twice and rejected these three challenges. After the compose-link repair,
the twelve affected registered construction checks passed again in each engine
(native/fallback × desktop/small viewport × fixed/random/determinism routes).
Those targeted checks skipped the other 126 registrations and are not a new
complete baseline or mutation campaign. Their exact names and reports are in
the machine receipt. No new ordinary tests were introduced.

## Explicit unload decisions

The editor already installs a dirty-draft before-unload guard. Playwright 1.64.1
automatically accepts an unhandled `beforeunload` dialog, so the earlier hard-goto
probe could silently choose Leave. The independent review traces that default
to installed and pinned upstream sources.

A subsequent controlled research probe held the final save of `two` pending
after the preceding `*two*` save was acknowledged. Both viewport profiles had
active/sticky user activation and received a real `beforeunload` warning.

| Explicit choice, on both viewports | Navigation | Latest visible source | Stored/quick source |
| --- | --- | --- | --- |
| Dismiss / Stay | Remained at the same editor URL | `two` | Releasing the save returned 200 and stored `two`. |
| Accept / Leave | Completed departure to compose | Editor left | Quick editor and server held last-saved `*two*`. |

The Stay branch's `page.goto` waited twenty seconds for the canceled departure
before timing out. This is an exploratory navigation receipt, not an oracle
failure, RED result or mutant kill. All four probe receipts, their correlated
save/input events, and script/output hashes are preserved in the machine record.
They demonstrate a functioning warning for these histories; they establish no
promise to save after an explicit discard.

The original hard-navigation witness and explicit Stay/Leave schedules still
need registered oracle coverage. The exploratory probe does not close that
migration gap. Earlier blanket claims that all 28 browser observations retained
their original receiving paths are qualified in `browser-execution.md`.

## Host and reproducibility

Installed Playwright JavaScript is **1.64.1**; the native WebKit executable is
official **r2395 / 27.2**, on macOS Darwin 25.6 arm64. This is an explicit
mixed-version experiment. The matched canary package download was unavailable;
no Playwright dependency upgrade was installed. Default r2370 also has a separate
outgoing-navigation error defect fixed upstream in r2393. The manifest records
the official archive URL, archive/executable hashes and smoke observations.

```sh
PLAYWRIGHT_BROWSERS_PATH=/private/tmp/blygger-playwright.3EVERv \
FORMATTING_ORACLE_BROWSER_EXECUTABLE=/private/tmp/blygger-webkit-r2395/pw_run.sh \
npm run test:formatting -- --browser webkit --oracle session \
  --only authored:browser-native-undo-required,authored:native-delete-undo,authored:document-start-formatting \
  --test-timeout 180000 --first-limit 180000 \
  --out build/formatting-oracles/session-webkit-ui-transition-r2395
```

The failed 136/2 and successful 138/0 reports share framework run ID
`ad7c4be40270` despite the imported driver change. Earlier engine variants also
shared IDs. Cite the exact directory, report SHA-256 and source manifest;
the framework ID alone does not identify this evidence.

## Checklist disposition and limits

| Requirement | Disposition for this bounded repair |
| --- | --- |
| ORC-001–003 | Existing law and exact independent model retained; host and observation responsibilities documented. No production answer supplies an expectation. |
| ORC-004 | All generated inputs/constructions and budgets retained. In-app delivery repaired; original raw delivery remains an explicit open migration obligation. |
| ORC-005 | Actual React listeners, formatter, Worker preview and Router Link execute. Every owed source/selection/focus checkpoint remains; no later save supplies an earlier answer. |
| ORC-006–007 | Calibrations, fixed/random registrations and determinism checks pass in both complete WebKit runs; three authored wrong designs fail their intended law comparisons. |
| ORC-008 | No semantic model state changed in this repair, so its state-minimization trigger does not fire. The separate whole-plan native-boundary enablement argument is retained in the host review. |
| ORC-009 | Existing semantic intents/checkpoints retained; native reference receipt is a transport premise, not a product model action. |
| ORC-010 | Host review records exhaustion, contradictory receipt, disabled-boundary and cleanup-error controls; errors preserve their cause. Probe navigation cancellation is classified separately. |
| ORC-011 | Independent plain-textarea/native-reference and actual React receiving formulations distinguish host grouping from formatting behavior. Ordinary Safari remains outside the evidence. |
| ORC-012 | Exact commit, source/host fingerprints, historical failures, final report hashes and independent review addenda are versionable records in this worktree. |
| ORC-013–015 | Native versus grouped receipts and command mutants supply nearby distinguishing controls. Existing declared states/constructions execute. Raw navigation and actual Safari claims remain unresolved at their receiving boundaries. |
| ORC-016 | Product judgments use registered properties; targeted follow-ups select existing registrations. Temporary research probes define no additional repository tests or claimed kills. |

`npm run typecheck` and `git diff --check` passed after the driver repair. No
formatter production change was needed for this WebKit finding. No additional
legacy tests were removed during this follow-up. No commit, push or deployment
was made. Previously recorded framework, clipboard, physical mobile, malformed
surrogate and broader mixed-action coverage limits remain separate.
