# Independent review of feature-law proposals

Reviewed 2026-11-19 against base `28b0c8d642a87e5810ad6eabd95c2d1714c53396`
and proposal SHA-256
`e6d9dcab0500cda93606a928f373b4d38355a0cc6bddfc775f663ebd88341c9e`.
Read pinned `@tanstack/oracles@97a4e7a` design/review skills, checklist v1,
glossary, design-grammar card, editor catalog and native-host audit. This was
an independent, docs-only review: no probe, browser, test, oracle, production,
package or runtime change was performed.

**Accepted as a bounded proposal for human review. Every feature and numbered
law remains UNADOPTED.** This accepts the document's precision and separation
of evidence from policy. It adopts no behavior, authorizes no implementation
or test deletion, and supplies no runtime or gap-closure evidence.

## Findings and disposition

- **FPR-1, F4 mixed eligibility:** the original proposal did not decide whether
  a selection combining eligible paragraphs with refusal contexts was atomic
  or partially transformed. Witness: Heading 1 over `text\n---`, which is a
  setext heading. The revision preflights every affected context and refuses
  the whole edit for an ineligible line. It contrasts `text\nword`, preserves
  ordinary blank lines, and distinguishes literal `#word`/escaped punctuation
  from actual block syntax. This is an explicit proposed product policy,
  rather than a claimed requirement of Markdown.
- **FPR-2, U2 observable decision:** the original pre-mutation/no-op wording
  lacked a decision checkpoint and input-receipt definition. The revision
  defines normalized requested source `R`, initial source `S`, synchronous
  return/throw receipts, and unchanged requests by `R === S`, including
  identical replacement. It distinguishes unchanged-at-return recovery from
  proof of no transient mutation. Delayed effects, changed source without
  input, and partial/wrong-input recovery remain unresolved. Exactly one
  explicit synthetic selection event allows additional native queued events,
  consistent with the recorded Chromium/Firefox observations. No inference
  of actual browser dishonesty or fallback-native-Undo support is made.
- **FPR-3, F5 overlapping guards:** selecting all `x` in `> x` originally met
  both original-line nonblank continuation and post-deletion empty exit.
  Continuation now requires a nonblank remaining body after deletion; the
  full-selection empty-exit rule therefore has a distinct premise.
- **F3 stale cancellation, additional author clarification:** Cancel leaves
  current source untouched and restores captured range only while source is
  unchanged. It no longer proposes restoring stale captured text. The link
  sheet and the alternative explicit completion action both remain proposals;
  neither supersedes the adopted keyboard-placeholder law without adoption.

All dispositions above are source/document review, not experiments or kills.

## Independence, compatibility and remaining evidence

F2/F4/F5 can predict source/range and intended ancestry from annotated input
containers; a separately rendered observation can judge syntax without
copying production's parser or indentation scanner. F2 intentionally preserves
existing numbers while F4 explicitly proposes normalizing selected numbers.
F5 preserves the adopted Shift+Enter rule and states list-first precedence.
The current emphasis, formula, source-preservation and dispatch gates stay in
force. Editor research supports the feature families; successor/overflow,
parent-style exit, atomic refusal, toggle and recovery choices are labeled
recommendations requiring human adoption.

After adoption, constructed neighbors should include empty markers with no
padding; zero/leading-zero and width-changing numbers; overflow; tab phases;
whole-body deletion; ASCII spaces/tabs versus NBSP/BOM; compact/nested quotes;
list-in-quote precedence and refused quote-in-list scenes; final-line-start
exclusion; all-blank and mixed-ineligible selections; identical replacement,
CR/CRLF normalization and intra-grapheme bypass; and source-revision changes
while a link draft is open, including change-and-restore histories. These are
future grammar obligations, not claims of existing generated reach.

The conceptual authority/independence/responsibility and vocabulary checks
(ORC-001/002/003/009) are satisfactory for a proposal. ORC-014's host premise is
explicit, with receiving evidence still owed after adoption. No executable
history, state-model change, driver, calibration, campaign, cleanup path,
second implementation or oracle file was added, so implementation judgments
under ORC-004/005/006/007/008/010/011/013/015/016 do not apply to this docs-only
change. ORC-012's full-oracle-audit trigger is not claimed: this record binds
only the proposal review and its unresolved implementation evidence.
