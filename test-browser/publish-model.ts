/** The owner's publish confirmations, predicted from the rulings alone: going
 * public asks first and names the public hoppers the item is in when the dialog
 * opens (Venkat on studio#175; plan §1 0f law 7); a membership read that fails
 * refuses with an error; each accepted confirmation makes exactly one
 * publication, cancel makes none, and a repeated accept never makes two
 * (Venkat, session 86, Kyle's row 5 on studio#178). Names are read when the
 * dialog opens; a hopper change while it is open is a stated limit.
 */
import { isDeepStrictEqual } from 'node:util';
import type { Observation, Verdict } from '@tanstack/oracles';

export type Surface = 'row' | 'quick edit' | 'editor';
export type PublishPlan = {
  status: 'draft' | 'private';
  surface: Surface;
  mode: 'notebook' | 'publish';
  /** The full editor's kind-of-version radio, shown in Notebook mode before the first public version. */
  choice?: 'public' | 'private';
  /** Public hopper L holds the item at load; J joins after load; `left` takes the item out of L after load. A non-public hopper P always holds it too. */
  hoppers: 'none' | 'at load' | 'joined' | 'left';
  /** The item read made when the button is pressed: answered, held while the button is pressed again, or refused. */
  preflight: 'ok' | 'slow' | 'failed';
  answer: 'accept' | 'cancel';
  /** The blyg's default visibility flips while the dialog is open. */
  flip?: true;
};
export type Asked = { dialogs: string[]; error: boolean };
export type Settled = { publications: number; status: string; version: number };

/** Which kind of version the pressed button promises: Notebook mode keeps
 * versions private except where the button says public (a private item's
 * collapsed-row "publish publicly", the editor's public radio). */
export function outcome(plan: PublishPlan): 'public' | 'private' {
  if (plan.mode === 'publish') return 'public';
  if (plan.surface === 'editor') return plan.choice!;
  return plan.surface === 'row' && plan.status === 'private' ? 'public' : 'private';
}
export function label(plan: PublishPlan) {
  if (plan.mode === 'notebook' && outcome(plan) === 'private') return 'add version';
  if (plan.mode === 'notebook' && plan.surface === 'editor') return 'add version';
  return plan.status === 'private' ? 'publish publicly' : 'publish';
}
export const hopperNames = (tag: string) => ({ loaded: `Loaded ${tag}`, joined: `Joined ${tag}`, closed: `Closed ${tag}` });
export function named(plan: PublishPlan): Array<'loaded' | 'joined'> {
  return plan.hoppers === 'at load' ? ['loaded'] : plan.hoppers === 'joined' ? ['loaded', 'joined'] : [];
}
/** Going public from private, or from a Notebook-mode blyg, can't be undone and always asks; a Publish-mode draft asks only when it would appear in a public hopper. */
function asks(plan: PublishPlan) {
  if (outcome(plan) !== 'public') return false;
  return plan.status === 'private' || plan.mode === 'notebook' || named(plan).length > 0;
}
export type PublishExpected = { label: string; dialog?: { raise: boolean; names: Array<'loaded' | 'joined'> }; error: boolean; publications: number; status: string; version: number };
export function publishModel(plan: PublishPlan): PublishExpected {
  const going = outcome(plan);
  const refused = going === 'public' && plan.preflight === 'failed';
  const dialog = !refused && asks(plan) ? { raise: plan.status === 'private' || plan.mode === 'notebook', names: named(plan) } : undefined;
  const published = !refused && !(dialog && plan.answer === 'cancel');
  return {
    label: label(plan),
    ...(dialog ? { dialog } : {}),
    error: refused,
    publications: published ? 1 : 0,
    status: published ? going : plan.status,
    version: published && going === 'public' ? 1 : 0,
  };
}

// Every surface and mode the owner can press, with both item states and every
// hopper change; preflight, cancel and the mid-dialog flip are crossed with a
// changed membership. Plans hold premises only, never expected observations.
const presses: Array<Pick<PublishPlan, 'surface' | 'mode' | 'choice'>> = [
  { surface: 'row', mode: 'publish' }, { surface: 'row', mode: 'notebook' },
  { surface: 'quick edit', mode: 'publish' }, { surface: 'quick edit', mode: 'notebook' },
  { surface: 'editor', mode: 'publish' }, { surface: 'editor', mode: 'notebook', choice: 'public' }, { surface: 'editor', mode: 'notebook', choice: 'private' },
];
export const publishPlans: readonly PublishPlan[] = (['draft', 'private'] as const).flatMap(status => presses.flatMap((press): PublishPlan[] => [
  ...(['none', 'at load', 'joined', 'left'] as const).map(hoppers => ({ status, ...press, hoppers, preflight: 'ok' as const, answer: 'accept' as const })),
  { status, ...press, hoppers: 'joined', preflight: 'ok', answer: 'cancel' },
  { status, ...press, hoppers: 'joined', preflight: 'slow', answer: 'accept' },
  // A private version needs no membership read, so a failed read only means something where the press goes public.
  ...(outcome({ status, ...press } as PublishPlan) === 'public' ? [{ status, ...press, hoppers: 'joined' as const, preflight: 'failed' as const, answer: 'accept' as const }] : []),
  ...(press.mode === 'publish' ? [{ status, ...press, hoppers: 'joined' as const, preflight: 'ok' as const, answer: 'accept' as const, flip: true as const }] : []),
]));
export function publishPlanName(plan: PublishPlan) {
  return `${plan.status} from ${plan.surface}${plan.choice ? ` (${plan.choice})` : ''} in ${plan.mode} mode, hoppers ${plan.hoppers}, preflight ${plan.preflight}, ${plan.answer}${plan.flip ? ', default flipped mid-dialog' : ''}`;
}

export const publishLaw = 'one publication per accepted, truthful confirmation';
const violation = (checkpoint: string, actual: unknown, expected: unknown): Verdict => ({ kind: 'violation', checkpoint, law: publishLaw, difference: 'the receiving observation differs from the publish model', values: { actual, expected } });
/** Names are compared as a set over the plan's own hoppers: each expected name appears, each other one does not. */
export function checkPublish(plan: PublishPlan, trace: readonly Observation[], expected = publishModel(plan)): Verdict {
  const at = (checkpoint: string) => trace.find(entry => entry.checkpoint === checkpoint)?.value as Record<string, unknown> | undefined;
  const ready = at('editor ready'), asked = at('confirmation settled') as Asked | undefined, settled = at('publication settled') as Settled | undefined;
  if (!ready || !asked || !settled) return violation('complete browser receiving history', trace.map(entry => entry.checkpoint), ['editor ready', 'confirmation settled', 'publication settled']);
  if (ready.label !== expected.label) return violation('editor ready', ready.label, expected.label);
  const names = hopperNames('·');
  const dialogs = asked.dialogs.map(text => ({
    raise: text.includes('Make this item public?'),
    names: (['loaded', 'joined', 'closed'] as const).filter(key => text.includes(names[key])),
  }));
  const wanted = expected.dialog ? [expected.dialog] : [];
  if (!isDeepStrictEqual(dialogs, wanted)) return violation('confirmation settled', asked.dialogs, wanted);
  if (asked.error !== expected.error) return violation('confirmation settled', { error: asked.error }, { error: expected.error });
  const stored = { publications: settled.publications, status: settled.status, version: settled.version };
  const want = { publications: expected.publications, status: expected.status, version: expected.version };
  return isDeepStrictEqual(stored, want) ? { kind: 'pass' } : violation('publication settled', stored, want);
}

/** Owner search marks (plan §1 0f law 6; Kyle's row 5): Compose's search shows an
 * item by its working copy, marks a private hit "private" and a working-copy hit
 * "draft" or "unpublished changes", and drops the private mark once raised. */
export type SearchState = 'draft' | 'private' | 'private edited' | 'public' | 'public changed';
export const searchStates: readonly SearchState[] = ['draft', 'private', 'private edited', 'public', 'public changed'];
export type SearchSeen = { hits: number; private: boolean; draft: string | null; excerpt: string };
export function searchModel(state: SearchState): SearchSeen {
  const last = state === 'private edited' || state === 'public' ? 'second' : state === 'public changed' ? 'third' : 'first';
  return {
    hits: 1,
    private: state.startsWith('private'),
    draft: state === 'draft' ? 'draft' : state === 'public changed' ? 'unpublished changes' : null,
    excerpt: `${last} words`,
  };
}
export const searchLaw = 'owner search shows and marks the working copy';
export function checkSearch(state: SearchState, trace: readonly Observation[]): Verdict {
  const seen = trace.find(entry => entry.checkpoint === 'search settled')?.value as SearchSeen | undefined;
  const want = searchModel(state);
  if (!seen) return { kind: 'violation', checkpoint: 'complete browser receiving history', law: searchLaw, difference: 'no search observation', values: { actual: trace.map(entry => entry.checkpoint), expected: ['search settled'] } };
  const got = { hits: seen.hits, private: seen.private, draft: seen.draft, excerpt: seen.excerpt.includes(want.excerpt) ? want.excerpt : seen.excerpt };
  return isDeepStrictEqual(got, want) ? { kind: 'pass' } : { kind: 'violation', checkpoint: 'search settled', law: searchLaw, difference: 'the rendered hit differs from the search model', values: { actual: seen, expected: want } };
}
