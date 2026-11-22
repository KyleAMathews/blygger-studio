# T5 raw-source construction patch

2026-11-18. Parent handoff only: no existing oracle/model file was edited by
this audit. Apply after active campaigns finish and fingerprint the new source.
These are six deterministic witnesses already admitted by the existing
single-line arbitrary. Their expectations still come from `emphasisModel`;
there is no new syntax-aware or rendered-emphasis law.

Add these entries to `emphasisCases` in
`test-ui/editor-oracles/inline-model-oracle.ts`:

```ts
  escapedOuterMarker: { ...emphasisBase, kind: 'italic', before: '\\', after: '', outsideLeft: 1, outsideRight: 1 },
  underscoreWrapper: { ...emphasisBase, kind: 'italic', before: '_', after: '_' },
  selectedCodeSpanBody: { ...emphasisBase, before: '`', after: '`' },
  selectedLinkLabel: { ...emphasisBase, before: '[', after: '](https://example.com)' },
  selectedLinkDestination: { ...emphasisBase, before: '[label](https://', after: '.example)' },
  intrawordPunctuation: { ...emphasisBase, before: 'alpha', after: 'omega', row: row({ body: '-word-' }) },
```

`emphasisStates` can append these input predicates. They name distinguishable
input geometry, not a construction name or a model-answer branch:

```ts
  ...(h.before.endsWith('\\') && h.outsideLeft > 0 && h.outsideRight > 0 ? ['escapedExternalMarkerContext'] : []),
  ...(h.before.endsWith('_') && h.after.startsWith('_') ? ['underscoreWrapperContext'] : []),
  ...(h.before.endsWith('`') && h.after.startsWith('`') ? ['codeSpanBodyContext'] : []),
  ...(h.before.endsWith('[') && h.after.startsWith('](') ? ['linkLabelContext'] : []),
  ...(h.before.includes('](') && h.after.includes(')') ? ['linkDestinationContext'] : []),
  ...(/\p{L}$/u.test(h.before) && /^\p{L}/u.test(h.after) && /^\p{P}/u.test(r.body) && /\p{P}$/u.test(r.body) ? ['intrawordPunctuationContext'] : []),
```

These are reach classifiers over arranged input records; they do not claim a
full Markdown parser. They may also classify generated neighbors. For example,
`linkDestinationContext` deliberately records the supplied surrounding source,
not proof that arbitrary Markdown parses as an anchor. No expected rendering
should be inferred from the state names.

Preserve every existing construction, `fixedSeeds`, `runs`, grammar leaf bound,
resolver and model rule. Registration already derives required states and
construction `enters` from `emphasisStates`, so no case-ID list or extra raw
campaign is needed. Do not add `fc.pre` or filter the body/context to make a
rendered-emphasis expectation work.

Membership verification, run from this worktree:

```sh
node --import tsx --input-type=module <<'JS'
import * as m from './test-ui/editor-oracles/inline-model-oracle.ts';
const names = ['escapedOuterMarker', 'underscoreWrapper', 'selectedCodeSpanBody',
  'selectedLinkLabel', 'selectedLinkDestination', 'intrawordPunctuation'];
for (const name of names) {
  const h = m.emphasisCases[name];
  if (!m.emphasisArbitrary.canShrinkWithoutContext(h)) throw Error(name);
  console.log(name, m.emphasisStates(h), m.emphasisModel(m.emphasisPlan(h)));
}
const invalid = { ...m.emphasisCases.escapedOuterMarker, outsideLeft: 7 };
if (m.emphasisArbitrary.canShrinkWithoutContext(invalid)) throw Error('accepted outsideLeft=7');
console.log('all six admitted; nearby invalid marker bound rejected');
JS
```

The original versions of all six exact input records were already admitted
and source-calculation matched the independent model during the audit; full
probe data is `/private/tmp/editor-remaining-t5-source-probes.json`. Those Node
results are not browser campaign evidence. Once applied, the parent should run
the existing browser inline property, its calibrations and relevant gap work
using the unchanged model, budgets and seed. No production change is implied.

The old unit file contains no observation of these six contexts. The patch
adds guaranteed range; it does not recover an omitted old assertion and does
not replace unrelated fixed editor tests. `remaining-receivers-t5-audit.md`
records nested-container and syntax-aware behavior separately.

## Applied input expansion

Parent applied the six constructions and generic input predicates after both
active browser jobs had stopped. No model, resolver, driver, comparison, existing
construction, seed or budget changed. Opening prose now makes the source-only
meaning explicit. Pure membership admitted all six and rejected outsideLeft=7.
These are grammar controls, not browser execution evidence. Final inline and
combined browser campaigns remain owed.
