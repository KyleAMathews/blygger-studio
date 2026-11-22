# Final loss audit: original inline formatting and format keys

## Readout and scope

All **29 original assertions** in `test-ui/format-shortcuts.test.ts:19–67` retain exact deterministic constructed witnesses, legal generator inputs, independently calculated expected behavior, real Chromium formatter calls, and checked output/selection or command results. No original assertion is now random-only. No uncovered original case or concrete new shared-model fault was found by this source review.

This is one final bounded source review using the previously read Field Lab `loss-audit` card. It does not decide whether to delete the old test, run competing tests, execute registered oracles, claim an execution pass, or prove universal model correctness. No repository edit was made. The separately owned app-receiving oracle is outside this 29-assertion source unit.

Worktree: `/Users/kyle.mathews/programs/blygger-studio/.worktrees/oracles-explore`.

Files read in full for this unit: the original test, `test-ui/editor-inline.oracle.test.ts`, `test-ui/editor-keyboard.oracle.test.ts`, `test-ui/editor-oracles/inline-model-oracle.ts`, and `test-ui/editor-oracles/keyboard-model-oracle.ts`. To trace observations rather than stop at an import, also read `document-oracle.ts` and `browser-driver-oracle.ts`.

Abbreviations below: **IM** = `test-ui/editor-oracles/inline-model-oracle.ts`; **KM** = `test-ui/editor-oracles/keyboard-model-oracle.ts`; **I** = `test-ui/editor-inline.oracle.test.ts`; **K** = `test-ui/editor-keyboard.oracle.test.ts`; **D** = `test-ui/editor-oracles/document-oracle.ts`; **B** = `test-ui/editor-oracles/browser-driver-oracle.ts`. All positions are absolute UTF-16 half-open offsets in the unmarked input or resulting source.

## Exact route retained after extraction

- Single-line emphasis: IM 93–107 contains the fifteen source witnesses, with original ordinary contexts supplied by IM 66. IM 120–122 constructs input source and exact selection. IM 125–145 computes the expected edit from annotated content, selected marker counts and external marker counts; IM 149 projects it to expected source, absolute selection and usability. I 50–57 registers these histories and the emphasis law. Its driver at I 55 sends `[p.text, p.from, p.to, p.h.kind]` to the browser entry point `formatEdit`; I 56 checks the result/error.
- Multiline emphasis: IM 174–181 retains the exact three whole-document selections, including removing style across an interior blank line. IM 191–193 constructs those exact selections. IM 196–207 independently computes line changes and full resulting selection. I 60–67 registers the histories/law, calls browser `formatEdit` with exact text/offsets/style, and checks the same source/selection observations.
- Links: IM 231–235 retains selected words, a whole-document URL and the original empty caret context. IM 213 constructs the exact source partition; IM 242–251 computes label-versus-target insertion and empty-field caret. I 70–77 registers the histories, calls browser `formatEdit(..., 'link')`, and checks the result/error.
- Keys: KM 12–27 includes the source keys and constructs every mask on both platform flags. KM 18–24 is the expected chord table. K 44–57 constructs exact event fields with KM 10, calls browser `formatKey(event, mac)` and `structureKey(event)`, records returns/error, and compares the exact expected result. All eight original `formatKey` witnesses are exact members of the deterministic Cartesian product.
- Constructed histories are not pruned by coarse state names: D 32–35 maps **every** example entry to its own build function. Coarse state sets remain additional coverage metadata. Thus the old external-marker and blank/removal combinations no longer disappear through representative state compression.

The old `run` helper at original lines 5–14 reconstructed source with `text.slice(0, edit.from) + edit.insert + text.slice(edit.to)` and rendered its absolute final selection. D 14 and 23 retain that same source observation and directly record both selection endpoints, with additional range/usability validation at D 15–19. D 28–29 compares the full observed result and absence of error. The migration does not require a particular replacement span when source and final selection are identical, which preserves rather than weakens the original assertion's observation boundary.

The browser route is concrete: B 125–129 invokes `sut[method](...args)` inside `browserRun`; B 39–46 sends the action and arguments through `page.evaluate`; B 100–103 installs the instrumented formatter source as the browser SUT. No semantic model is passed to that function. The driver records the returned production edit rather than substituting a model edit. Browser setup/transport failures throw and production throws are returned as error data; neither is silently turned into a successful expected observation.

## Every original assertion

Every row below has disposition **retained exactly**. The expected marked source in the original assertion is reproduced by the current model's output source plus the numeric result selection shown. Literal `\n` in tables denotes one LF.

| ID | Original line and input → original expected result | Exact constructed history / definition | Input selection → result selection; checked model route |
|---|---|---|---|
| S01 | 19: `a «word» b` bold → `a **«word»** b` | `sourceBold`, IM 93 | `[2,6)` → `[4,8)`; IM 144 adds bold; I 55–56 |
| S02 | 20: `a «word» b` italic → `a *«word»* b` | `sourceItalic`, IM 94 | `[2,6)` → `[3,7)`; IM 144 adds italic; I 55–56 |
| S03 | 21: `a **«word»** b` bold → `a «word» b` | `sourceOutsideBold`, IM 95 | `[4,8)` → `[2,6)`; IM 139–142 removes external bold; I 55–56 |
| S04 | 22: `a *«word»* b` italic → `a «word» b` | `sourceOutsideItalic`, IM 96 | `[3,7)` → `[2,6)`; IM 139–142 removes external italic; I 55–56 |
| S05 | 23: `a «**word**» b` bold → `a «word» b` | `sourceSelectedBold`, IM 97 | `[2,10)` → `[2,6)`; IM 136–138 removes selected bold; I 55–56 |
| S06 | 24: `a «*word*» b` italic → `a «word» b` | `sourceSelectedItalic`, IM 98 | `[2,8)` → `[2,6)`; IM 136–138 removes selected italic; I 55–56 |
| S07 | 25: `a **«word»** b` italic → `a ***«word»*** b` | `sourceAddItalicInsideBold`, IM 99 | `[4,8)` → `[5,9)`; IM 139 fails italic test for two outside stars, IM 144 adds italic; I 55–56 |
| S08 | 26: `a *«word»* b` bold → `a ***«word»*** b` | `sourceAddBoldInsideItalic`, IM 100 | `[3,7)` → `[5,9)`; IM 139 fails bold test for one outside star, IM 144 adds bold; I 55–56 |
| S09 | 27: `a ***«word»*** b` bold → `a *«word»* b` | `sourceRemoveBoldKeepOutsideItalic`, IM 101 | `[5,9)` → `[3,7)`; IM 139–142 removes two outside stars per side; I 55–56 |
| S10 | 28: `a ***«word»*** b` italic → `a **«word»** b` | `sourceRemoveItalicKeepOutsideBold`, IM 102 | `[5,9)` → `[4,8)`; IM 139–142 removes one outside star per side; I 55–56 |
| S11 | 29: `a| b` bold → `a**|** b` | `sourceEmptyBold`, IM 103 | `[1,1)` → `[3,3)`; IM 144 adds empty bold; I 55–56 |
| S12 | 30: `a| b` italic → `a*|* b` | `sourceEmptyItalic`, IM 104 | `[1,1)` → `[2,2)`; IM 144 adds empty italic; I 55–56 |
| S13 | 31: `a**|** b` bold → `a| b` | `sourceEmptyOutsideBold`, IM 105 | `[3,3)` → `[1,1)`; IM 139–142 removes empty external bold; I 55–56 |
| S14 | 32: `a*|* b` italic → `a| b` | `sourceEmptyOutsideItalic`, IM 106 | `[2,2)` → `[1,1)`; IM 139–142 removes empty external italic; I 55–56 |
| S15 | 33: `«word »b` bold → `**«word»** b` | `sourceTrailingWhitespace`, IM 107 | `[0,5)` → `[2,6)`; IM 133 excludes tail space from markup and selection; IM 144 adds bold; I 55–56 |
| S16 | 39: `«one\n\ntwo»` bold → `«**one**\n\n**two**»` | `sourceBlank`, IM 174 | `[0,8)` → `[0,16)`; IM 196–203 adds per nonblank line and retains blank; I 65–66 |
| S17 | 40: `«**one**\n\n**two**»` bold → `«one\n\ntwo»` | `sourceRemoveAcrossBlank`, IM 176–179 | `[0,16)` → `[0,8)`; IM 197–202 removes style from all filled lines and retains blank; I 65–66 |
| S18 | 41: `«one\n*two*»` italic → `«*one*\n**two**»` | `sourceMixed`, IM 181 | `[0,9)` → `[0,13)`; IM 198 false so IM 202 adds star to both filled lines; I 65–66 |
| S19 | 47: `a «word» b` link → `a [word](|) b` | `sourceLabel`, IM 231 | `[2,6)` → `[9,9)`; IM 244–248 label route; I 75–76 |
| S20 | 48: `«https://x.example/a»` link → `[|](https://x.example/a)` | `sourceWholeDocumentTarget`, IM 233 | `[0,19)` → `[1,1)`; IM 244–248 target route; I 75–76 |
| S21 | 49: `a | b` link → `a [|]() b` | `sourceCaret`, IM 235 | `[2,2)` → `[3,3)`; IM 246–248 empty label route; I 75–76 |
| S22 | 56: Mac Meta+b → `bold` | `chord3`; KM 27: key b, mask 1, mac true | No source range in this old assertion. KM 19–22 expects bold; exact expanded event includes all other modifiers false; K 50–56 checks browser return |
| S23 | 57: Mac Ctrl+k → `null` | `chord133`; KM 27: key k, mask 2, mac true | KM 19–22 rejects Ctrl on Mac; exact event/mac preserved; K 50–56 |
| S24 | 60: other platform Ctrl+i → `italic` | `chord68`; KM 27: key i, mask 2, mac false | KM 19–22 expects italic; exact event/mac preserved; K 50–56 |
| S25 | 61: other platform Meta+i → `null` | `chord66`; KM 27: key i, mask 1, mac false | KM 19–22 rejects Meta elsewhere; exact event/mac preserved; K 50–56 |
| S26 | 64: unmodified b → `null` | `chord0`; KM 27: key b, mask 0, mac false | KM 19–22 rejects missing command modifier; K 50–56 |
| S27 | 65: Ctrl+x → `null` | `chord196`; KM 27: key x, mask 2, mac false | KM 20 has no x mapping; K 50–56 |
| S28 | 66: Ctrl+Shift+b → `null` | `chord20`; KM 27: key b, mask 10, mac false | KM 22 rejects extra Shift because required mask is exactly 2; K 50–56 |
| S29 | 67: Ctrl+uppercase B → `bold` | `chord36`; KM 27: key B, mask 2, mac false | KM 20 lowercases B and KM 22 accepts mask; K 50–56 |

All single/multiline rows use zero-to-three annotated stars per side, supported literal bodies, admitted whitespace, and at most three lines. They are legal members of IM 32–38, 54–58 and 151. Link source partitions are legal at IM 209–226. Every key witness is admitted by KM 12–14 and constructed by KM 27. The old helper's imports, marker parser, grouping and later `apply` harness do not add further production assertions to this 29-assertion unit.

## Shared-model-fault review

1. **No SUT-derived expectation.** IM imports fast-check plus D's source geometry/types; KM imports model modules and D's UTF-16/type definitions. Neither imports production formatting, the Chromium driver or a production return. Expected source/selection and chord classifications are computed before the real browser call from declarative history inputs. The extraction did not introduce a model that calls `formatEdit`, `formulaEdit`, `formatKey` or `onFormatKey` to obtain its expectation.
2. **Common projection inspected.** Expected and observed inline results both use D 14–23. That is a shared trust boundary, but its implementation directly splices source with the supplied edit and records absolute `start/end` without normalization or clipping. Those are the same source/selection observations the old helper made, plus validity. No concrete projection defect or information loss was found. In particular, output equality cannot hide changed selection endpoints because endpoints are separate compared fields.
3. **Constructed geometry independently traced.** The source examples preserve selected versus external stars, caret contexts with `before='a'`, selected trailing whitespace at document start, whole-document blank/mixed selections, and the whole-document URL. Every numeric input and result range is stated above. Thus a shared mistake in a generic plan is not being assumed away merely because both model and driver consume that plan.
4. **Chord independence preserved.** KM's expected `chord` examines key/mask/mac. The driver expands mask to event booleans and calls actual browser functions; it does not return the chord-model output. `formatKey` is checked even though an additional structural classification is observed. A thrown formatter/structure call records an error and cannot satisfy the old expected command/null result.
5. **Reuse is visible, not extra independence.** KM 4 and 85–88 reuse `emphasisEdit`/`linkEdit` for handler expectations. This is model reuse between the inline and handler oracles, so agreement of those two expected paths is not independent corroboration. It does not remove any of the 29 direct formatter/key checks above and shares no formatting implementation with production. No new concrete shared fault was identified in the old witnesses. The same caveat applies to shared D projection helpers: source review can inspect them, not prove that no future correlated defect is possible.

## Recovered/dropped trace and limits

Recovered source items absent/narrower in the final result: **none found among these 29 assertions**. The previously recovered arbitrary-only external-marker, trailing-whitespace, blank/removal and document-edge combinations are now explicit named constructed histories; they are no longer dropped by category compression or common-context replacement. The original command/null examples remain exact constructed cases.

No source outcome was explicitly rejected, replaced by a different formatting result, or hidden by a weaker driver/check in this unit. No usefulness/restoration judgment is made. This finding concerns source witness survival and source-level model independence; it does not assert a green Chromium/oracle-gaps run, complete mutation closure, arbitrary-input renderer correctness, real browser undo coverage, app control receiving, or the absence of all conceivable correlated model faults. Those are separate verification claims.

## Reviewed revisions

SHA-256 at final source review:

| File | SHA-256 |
|---|---|
| `test-ui/editor-inline.oracle.test.ts` | `71b2f631b5d04ed3b8d0caaeb89ae04e9ab5f3ef9b01d42806e74404aa7f70a3` |
| `test-ui/editor-keyboard.oracle.test.ts` | `6dfe482a5f753c37e20bcffc89686673691585589b21aa3d18b0a01bcd7f17fd` |
| IM | `64b19bb69e2664575c0b50e2d345f4e9af2fd108f57940f6f6e8237e5009eb9c` |
| KM | `ff83766a48b88cc73cd1e0ff174280eecaee9127f729cdd78154d20d6ecdf32a` |
| original test | `4187c4b45f9296f33aed8683416353907ecda5cc4e3c5581891f7106c89143cf` |
| D | `791cfed5cc2989f7925c0d6589f533634d11a5f69d677270eb00ea325c3703d7` |
| B | `0133ab64a4353008b23d72b587d20a29031ee4c22af37e0ae5770cc62cd0b019` |
