/**
 * Imported history exposes complete FeedVersion records to feed algorithms.
 * Missing change notes are null; supplied note text survives conversion.
 * This property owns the note projection of importedVersions at its return.
 *
 * importedVersions({ version: 3, changelog_json: null, ...row })
 *   // → first and current versions, each with note: null
 * importedVersions({ changelog_json: '[{"version":1,"note":"revised"}]', ...row })
 *   // → a version with note: 'revised'
 *
 * Why does a history without a changelog still need a note field? FeedVersion
 * in src/feeds/types.ts requires string | null, so a consumer can distinguish
 * absent notes without receiving undefined. For every imported history, absent
 * notes are explicit nulls and supplied strings are preserved. This is the
 * existing feed-algorithm contract, also exercised by reader-order.test.ts.
 *
 * The model reads semantic note inputs, never converted versions. Histories
 * vary the current version, present/absent changelog and each version's note.
 * Distinct strings and mixed missing/present notes prevent one version's note
 * from being substituted for every version. The driver
 * converts those inputs into stored rows and calls the real exported loader;
 * the check observes every returned note at the immediate return checkpoint.
 * Counts distinguish the first/current fallback from a supplied changelog.
 * Limits: notes in valid changelogs or absent changelogs, not rank ordering,
 * timestamp normalization, pin/quote projection or malformed stored JSON.
 */
import fc from 'fast-check';
import { differs, oracleProperty, pass } from '@tanstack/oracles';
import { importedVersions } from '../src/feeds/reader-order.ts';

// changelog is a model abstraction of consecutive source versions' notes;
// their ordinal supplies version, while timestamps/pins/quotes are outside
// this projection's law. null means no stored changelog, distinct from a
// present changelog whose individual entries have absent notes.
type Plan = { version: number; changelog: (string | null)[] | null };
const fallback: Plan = { version: 3, changelog: null };
const logged: Plan = { version: 3, changelog: ['revised', 'revised', 'revised'] };
const law = 'imported version notes preserve the feed contract';

// The note list is determined by the semantic history: no log means the first
// and current versions have no notes. A supplied log gives each version its
// supplied note. No production parsing or fallback helper enters this model.
function notes(plan: Plan) {
  return plan.changelog ? [...plan.changelog]
    : Array.from({ length: plan.version === 1 ? 1 : 2 }, () => null);
}

oracleProperty({
  id: 'reader-history-note-shape', owns: ['src/feeds/reader-order.ts#importedVersions'],
  law: {
    statement: 'For every imported history, absent notes are explicit nulls and supplied note strings are preserved in returned feed versions.',
    authority: 'src/feeds/types.ts FeedVersion.note: string | null; existing feed-algorithm contract and test/reader-order.test.ts imported history expectations.',
    limits: 'Valid or absent changelogs, current versions 1–8; observes notes only, not ordering, timestamp, pins, quotes or malformed JSON.',
  },
  histories: {
    arbitrary: fc.record({ version: fc.integer({ min: 1, max: 8 }), changelog: fc.option(fc.array(fc.option(fc.string({ maxLength: 40 }), { nil: null }), { minLength: 1, maxLength: 8 }), { nil: null }) }),
    runs: 100, fixedSeeds: [1702026], states: ['fallback-first', 'fallback-current', 'logged-note', 'logged-absent-note', 'distinct-note-text', 'mixed-note-presence'],
    constructed: [
      { name: 'first fallback', build: () => ({ ...fallback, version: 1 }), enters: ['fallback-first'] },
      { name: 'current fallback', build: () => fallback, enters: ['fallback-current'] },
      { name: 'supplied note', build: () => logged, enters: ['logged-note'] },
      { name: 'absent logged note', build: () => ({ ...logged, changelog: [null, null, null] }), enters: ['logged-absent-note'] },
      { name: 'distinct version notes', build: () => ({ version: 2, changelog: ['first', 'second'] }), enters: ['distinct-note-text'] },
      { name: 'mixed missing and present notes', build: () => ({ version: 2, changelog: [null, 'present'] }), enters: ['mixed-note-presence'] },
    ],
    fixed: [{ name: 'unreached current fallback field', history: fallback }],
  },
  // The resolver keeps every supplied source version at or below current.
  // Arrays can reconstruct every old repeated-note history, while also
  // admitting heterogeneous notes. No prior concrete history is removed.
  resolve: history => ({ ...history, version: Math.max(history.version, history.changelog?.length ?? 0) }),
  model: notes,
  reached: plan => plan.changelog === null ? [plan.version === 1 ? 'fallback-first' : 'fallback-current'] : [
    ...(plan.changelog.some(note => note !== null) ? ['logged-note'] : []),
    ...(plan.changelog.includes(null) ? ['logged-absent-note'] : []),
    ...(new Set(plan.changelog.filter(note => note !== null)).size > 1 ? ['distinct-note-text'] : []),
    ...(plan.changelog.includes(null) && plan.changelog.some(note => note !== null) ? ['mixed-note-presence'] : []),
  ],
  driver: (plan, observe) => {
    const versions = importedVersions({
      subscription_id: 'history-source', remote_id: 'history-item', origin: 'https://history.example/',
      kind: 'fragment', state: 'current', version: plan.version, created: '2026-01-01', updated: '2026-01-02', observed_at: '2026-01-03',
      l0: 0, maintenance_json: null, transclusions_json: null,
      changelog_json: plan.changelog === null ? null : JSON.stringify(plan.changelog.map((note, index) => ({ version: index + 1, ...(note === null ? {} : { note }) }))),
    });
    observe('returned notes', versions.map(version => version.note));
  },
  check: (_plan, trace, expected) => differs('returned notes', law, trace.find(entry => entry.checkpoint === 'returned notes')?.value, expected) ?? pass,
  calibrations: [
    { name: 'missing current fallback field', law, history: { constructed: 'current fallback' }, corrupt: trace => trace.map(entry => ({ ...entry, value: [null, undefined] })) },
    { name: 'one note replaces different notes', law, history: { constructed: 'distinct version notes' }, corrupt: trace => trace.map(entry => ({ ...entry, value: (entry.value as unknown[]).map(() => (entry.value as unknown[])[0]) })) },
  ],
});
